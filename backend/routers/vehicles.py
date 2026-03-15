"""Vehicle endpoints — single vehicle detail & similar vehicles."""

import json
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/vehicles", tags=["vehicles"])

# ---------------------------------------------------------------------------
# Load vehicle data from the JSON file (cached in-process)
# ---------------------------------------------------------------------------

_vehicles_cache: list[dict[str, Any]] | None = None


def _load_vehicles() -> list[dict[str, Any]]:
    global _vehicles_cache
    if _vehicles_cache is not None:
        return _vehicles_cache

    data_path = Path(__file__).resolve().parent.parent / "data" / "vehicles.json"
    with open(data_path, encoding="utf-8") as f:
        _vehicles_cache = json.load(f)
    return _vehicles_cache


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/")
async def list_vehicles(page: int = 1, page_size: int = 20):
    """Paginated vehicle listing."""
    vehicles = _load_vehicles()
    total = len(vehicles)
    start = (page - 1) * page_size
    items = vehicles[start : start + page_size]
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.get("/{vehicle_id}")
async def get_vehicle(vehicle_id: str):
    """Return a single vehicle by ID."""
    vehicles = _load_vehicles()
    for v in vehicles:
        if v["id"] == vehicle_id:
            return v
    raise HTTPException(status_code=404, detail="Vehicle not found")


@router.get("/{vehicle_id}/similar")
async def get_similar_vehicles(vehicle_id: str, limit: int = 6):
    """Return similar vehicles (same vehicle_type or brand), up to `limit`."""
    vehicles = _load_vehicles()

    source = None
    for v in vehicles:
        if v["id"] == vehicle_id:
            source = v
            break

    if source is None:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    similar = [
        v
        for v in vehicles
        if v["id"] != vehicle_id
        and (
            v.get("vehicle_type") == source.get("vehicle_type")
            or v.get("brand") == source.get("brand")
        )
    ][:limit]

    return similar
