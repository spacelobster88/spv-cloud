"""Vehicle search router with Elasticsearch + mock-data fallback."""

import json
import os
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(prefix="/vehicles", tags=["vehicles-search"])

# ---------------------------------------------------------------------------
# Request / response models
# ---------------------------------------------------------------------------


class NumericRange(BaseModel):
    gte: Optional[float] = None
    lte: Optional[float] = None


class BooleanFilters(BaseModel):
    is_tax_exempt: Optional[bool] = None
    is_fuel_exempt: Optional[bool] = None
    is_environmental: Optional[bool] = None


class VehicleSearchRequest(BaseModel):
    query: Optional[str] = None
    filters: Optional[dict[str, str | list[str]]] = None
    ranges: Optional[dict[str, NumericRange]] = None
    booleans: Optional[BooleanFilters] = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
    sort_by: Optional[str] = None
    sort_order: Optional[str] = "desc"


# ---------------------------------------------------------------------------
# Mock-data fallback
# ---------------------------------------------------------------------------

_DATA_DIR = Path(__file__).resolve().parent.parent / "data"
_vehicles_cache: list[dict[str, Any]] | None = None


def _load_vehicles() -> list[dict[str, Any]]:
    global _vehicles_cache
    if _vehicles_cache is None:
        with open(_DATA_DIR / "vehicles.json", encoding="utf-8") as f:
            _vehicles_cache = json.load(f)
    return _vehicles_cache


def _in_memory_search(req: VehicleSearchRequest) -> dict[str, Any]:
    """Pure-Python search over vehicles.json — used when ES is unavailable."""
    vehicles = list(_load_vehicles())

    # Full-text query
    if req.query and req.query.strip():
        q = req.query.strip().lower()
        text_fields = ["name", "brand", "vehicle_type", "manufacturer",
                       "model_number", "description", "purpose"]
        vehicles = [
            v for v in vehicles
            if any(q in str(v.get(f, "")).lower() for f in text_fields)
        ]

    # Keyword filters
    if req.filters:
        for field, value in req.filters.items():
            if value is None or value == "":
                continue
            vals = value if isinstance(value, list) else [value]
            if not vals:
                continue
            vehicles = [v for v in vehicles if str(v.get(field, "")) in vals]

    # Numeric range filters
    if req.ranges:
        for field, rng in req.ranges.items():
            if rng is None:
                continue
            if rng.gte is not None:
                vehicles = [
                    v for v in vehicles
                    if v.get(field) is not None and v[field] >= rng.gte
                ]
            if rng.lte is not None:
                vehicles = [
                    v for v in vehicles
                    if v.get(field) is not None and v[field] <= rng.lte
                ]

    # Boolean filters
    if req.booleans:
        if req.booleans.is_tax_exempt is True:
            vehicles = [v for v in vehicles if v.get("is_tax_exempt")]
        if req.booleans.is_fuel_exempt is True:
            vehicles = [v for v in vehicles if v.get("is_fuel_exempt")]
        if req.booleans.is_environmental is True:
            vehicles = [v for v in vehicles if v.get("is_environmental")]

    # Aggregations
    facet_fields = [
        "brand", "vehicle_type", "emission_standard", "fuel_type",
        "drive_type", "tonnage_class", "chassis_brand", "engine_brand",
        "announcement_batch", "manufacturer",
    ]
    aggregations: dict[str, list[dict[str, Any]]] = {}
    for field in facet_fields:
        counts: dict[str, int] = {}
        for v in vehicles:
            val = str(v.get(field, ""))
            if val:
                counts[val] = counts.get(val, 0) + 1
        aggregations[field] = sorted(
            [{"key": k, "doc_count": c} for k, c in counts.items()],
            key=lambda x: x["doc_count"],
            reverse=True,
        )

    # Sorting
    if req.sort_by:
        reverse = req.sort_order == "desc"
        vehicles.sort(
            key=lambda v: v.get(req.sort_by, 0) or 0,  # type: ignore[arg-type]
            reverse=reverse,
        )

    # Pagination
    total = len(vehicles)
    start = (req.page - 1) * req.page_size
    paged = vehicles[start: start + req.page_size]

    return {
        "total": total,
        "page": req.page,
        "page_size": req.page_size,
        "results": paged,
        "aggregations": aggregations,
    }


# ---------------------------------------------------------------------------
# Elasticsearch helpers (optional)
# ---------------------------------------------------------------------------

def _try_es_search(req: VehicleSearchRequest) -> dict[str, Any] | None:
    """Attempt to search via Elasticsearch. Returns None if ES unavailable."""
    es_url = os.getenv("ELASTICSEARCH_URL")
    if not es_url:
        return None
    try:
        from elasticsearch import Elasticsearch  # type: ignore[import-untyped]

        es = Elasticsearch(es_url)
        if not es.ping():
            return None

        # Build ES query
        must: list[dict[str, Any]] = []
        if req.query and req.query.strip():
            must.append({
                "multi_match": {
                    "query": req.query.strip(),
                    "fields": ["name^3", "brand^2", "vehicle_type^2",
                               "manufacturer", "model_number", "description",
                               "purpose"],
                    "type": "best_fields",
                }
            })

        filter_clauses: list[dict[str, Any]] = []
        if req.filters:
            for field, value in req.filters.items():
                vals = value if isinstance(value, list) else [value]
                if vals:
                    filter_clauses.append({"terms": {f"{field}.keyword": vals}})

        if req.ranges:
            for field, rng in req.ranges.items():
                if rng:
                    range_q: dict[str, Any] = {}
                    if rng.gte is not None:
                        range_q["gte"] = rng.gte
                    if rng.lte is not None:
                        range_q["lte"] = rng.lte
                    if range_q:
                        filter_clauses.append({"range": {field: range_q}})

        if req.booleans:
            for bf in ["is_tax_exempt", "is_fuel_exempt", "is_environmental"]:
                val = getattr(req.booleans, bf, None)
                if val is True:
                    filter_clauses.append({"term": {bf: True}})

        body: dict[str, Any] = {
            "query": {
                "bool": {
                    "must": must or [{"match_all": {}}],
                    "filter": filter_clauses,
                }
            },
            "from": (req.page - 1) * req.page_size,
            "size": req.page_size,
            "aggs": {},
        }

        # Add aggregations
        facet_fields = [
            "brand", "vehicle_type", "emission_standard", "fuel_type",
            "drive_type", "tonnage_class", "chassis_brand", "engine_brand",
            "announcement_batch", "manufacturer",
        ]
        for field in facet_fields:
            body["aggs"][field] = {"terms": {"field": f"{field}.keyword", "size": 50}}

        if req.sort_by:
            body["sort"] = [{req.sort_by: {"order": req.sort_order or "desc"}}]

        resp = es.search(index="vehicles", body=body)
        hits = resp["hits"]
        results = [hit["_source"] for hit in hits["hits"]]

        aggregations: dict[str, list[dict[str, Any]]] = {}
        for field in facet_fields:
            if field in resp.get("aggregations", {}):
                aggregations[field] = [
                    {"key": b["key"], "doc_count": b["doc_count"]}
                    for b in resp["aggregations"][field]["buckets"]
                ]

        return {
            "total": hits["total"]["value"],
            "page": req.page,
            "page_size": req.page_size,
            "results": results,
            "aggregations": aggregations,
        }
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post("/search")
async def search_vehicles(req: VehicleSearchRequest) -> dict[str, Any]:
    """
    Search vehicles. Tries Elasticsearch first; falls back to in-memory
    search over vehicles.json when ES is unavailable.
    """
    # 1. Try Elasticsearch
    es_result = _try_es_search(req)
    if es_result is not None:
        return es_result

    # 2. Fallback to in-memory search
    return _in_memory_search(req)
