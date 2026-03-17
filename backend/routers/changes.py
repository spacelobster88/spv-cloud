"""Vehicle change tracking API endpoints."""

from __future__ import annotations

import logging
import os
from typing import Any

from fastapi import APIRouter, HTTPException, Query

from elasticsearch import Elasticsearch

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/changes", tags=["changes"])

ES_URL = os.getenv("ES_URL", "http://localhost:9200")
CHANGES_INDEX = "vehicle_changes"


def _get_es() -> Elasticsearch:
    """Return an Elasticsearch client."""
    return Elasticsearch(ES_URL)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/")
async def list_changes(
    batch: str | None = Query(default=None, description="Filter by batch label, e.g. '第399批'"),
    model_number: str | None = Query(default=None, description="Filter by model_number"),
    change_type: str | None = Query(default=None, description="Filter by change_type: 'new' or 'update'"),
    page: int = Query(default=1, ge=1, description="Page number (1-based)"),
    page_size: int = Query(default=20, ge=1, le=100, description="Results per page"),
) -> dict[str, Any]:
    """List tracked changes with optional filters."""
    es = _get_es()

    try:
        if not es.indices.exists(index=CHANGES_INDEX):
            return {"items": [], "total": 0, "page": page, "page_size": page_size}
    except Exception as exc:
        logger.error("ES connection error: %s", exc)
        raise HTTPException(status_code=503, detail="Elasticsearch unavailable") from exc

    # Build query
    must_clauses: list[dict] = []
    if batch:
        must_clauses.append({"term": {"batch": batch}})
    if model_number:
        must_clauses.append({"term": {"model_number": model_number}})
    if change_type:
        must_clauses.append({"term": {"change_type": change_type}})

    if must_clauses:
        query: dict = {"bool": {"must": must_clauses}}
    else:
        query = {"match_all": {}}

    from_offset = (page - 1) * page_size

    try:
        resp = es.search(
            index=CHANGES_INDEX,
            body={
                "query": query,
                "sort": [{"timestamp": {"order": "desc"}}],
                "from": from_offset,
                "size": page_size,
            },
        )
    except Exception as exc:
        logger.error("ES search error: %s", exc)
        raise HTTPException(status_code=503, detail="Search failed") from exc

    total = resp["hits"]["total"]
    total_count = total["value"] if isinstance(total, dict) else total
    items = [hit["_source"] for hit in resp["hits"]["hits"]]

    return {
        "items": items,
        "total": total_count,
        "page": page,
        "page_size": page_size,
    }


@router.get("/summary")
async def changes_summary(
    batch: str | None = Query(default=None, description="Filter by batch label"),
) -> dict[str, Any]:
    """Get summary statistics of changes for a batch or all batches."""
    es = _get_es()

    try:
        if not es.indices.exists(index=CHANGES_INDEX):
            return {
                "total_changes": 0,
                "new_vehicles": 0,
                "updated_vehicles": 0,
                "batches": [],
            }
    except Exception as exc:
        logger.error("ES connection error: %s", exc)
        raise HTTPException(status_code=503, detail="Elasticsearch unavailable") from exc

    # Base query
    if batch:
        query: dict = {"term": {"batch": batch}}
    else:
        query = {"match_all": {}}

    try:
        resp = es.search(
            index=CHANGES_INDEX,
            body={
                "query": query,
                "size": 0,
                "aggs": {
                    "by_change_type": {
                        "terms": {"field": "change_type", "size": 10},
                    },
                    "by_batch": {
                        "terms": {"field": "batch", "size": 100, "order": {"_key": "desc"}},
                        "aggs": {
                            "by_type": {
                                "terms": {"field": "change_type", "size": 10},
                            },
                        },
                    },
                    "top_changed_fields": {
                        "terms": {"field": "changed_field_names", "size": 20},
                    },
                },
            },
        )
    except Exception as exc:
        logger.error("ES aggregation error: %s", exc)
        raise HTTPException(status_code=503, detail="Aggregation failed") from exc

    total_hits = resp["hits"]["total"]
    total_count = total_hits["value"] if isinstance(total_hits, dict) else total_hits

    # Parse change type counts
    type_buckets = resp["aggregations"]["by_change_type"]["buckets"]
    type_counts = {b["key"]: b["doc_count"] for b in type_buckets}

    # Parse batch breakdown
    batch_buckets = resp["aggregations"]["by_batch"]["buckets"]
    batches = []
    for bb in batch_buckets:
        sub_types = {sb["key"]: sb["doc_count"] for sb in bb["by_type"]["buckets"]}
        batches.append({
            "batch": bb["key"],
            "total": bb["doc_count"],
            "new": sub_types.get("new", 0),
            "updated": sub_types.get("update", 0),
        })

    # Parse top changed fields
    field_buckets = resp["aggregations"]["top_changed_fields"]["buckets"]
    top_fields = [{"field": fb["key"], "count": fb["doc_count"]} for fb in field_buckets]

    return {
        "total_changes": total_count,
        "new_vehicles": type_counts.get("new", 0),
        "updated_vehicles": type_counts.get("update", 0),
        "batches": batches,
        "top_changed_fields": top_fields,
    }
