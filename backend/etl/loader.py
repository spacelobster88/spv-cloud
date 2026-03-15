"""
Elasticsearch loader for SPV Platform vehicle data.

Handles:
- Connecting to Elasticsearch
- Deleting and recreating the vehicles index (idempotent)
- Bulk indexing cleaned records
- Startup hook for FastAPI auto-seeding
"""

from __future__ import annotations

import json
import logging
import os
import time
from copy import deepcopy
from pathlib import Path
from typing import Any

from elasticsearch import Elasticsearch
from elasticsearch.helpers import bulk

logger = logging.getLogger(__name__)

INDEX_NAME = "vehicles"
ES_URL = os.getenv("ES_URL", "http://localhost:9200")

# Paths relative to this file's location
_BACKEND_DIR = Path(__file__).resolve().parent.parent
MAPPING_FILE = _BACKEND_DIR / "es_mappings" / "vehicle_index.json"
DATA_FILE = _BACKEND_DIR / "data" / "vehicles.json"


def get_es_client(es_url: str | None = None) -> Elasticsearch:
    """Create an Elasticsearch client."""
    url = es_url or ES_URL
    return Elasticsearch(url)


def _load_mapping() -> dict:
    """Load the vehicle index mapping JSON."""
    with open(MAPPING_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def _check_ik_plugin(es: Elasticsearch) -> bool:
    """Check whether the IK Analysis plugin is installed."""
    try:
        plugins = es.cat.plugins(format="json")
        for plugin in plugins:
            if "ik" in plugin.get("component", "").lower():
                logger.info("IK Analysis plugin detected.")
                return True
    except Exception:
        pass
    logger.info("IK Analysis plugin not found — using CJK fallback analyzer.")
    return False


def _replace_analyzers(mappings: dict) -> None:
    """Recursively replace IK analyzer references with the CJK fallback."""
    ik_analyzers = {"ik_smart_analyzer", "ik_max_word_analyzer"}
    fallback = "chinese_analyzer"

    def _walk(node: dict) -> None:
        for key, value in list(node.items()):
            if isinstance(value, dict):
                _walk(value)
            elif isinstance(value, str) and value in ik_analyzers:
                node[key] = fallback

    _walk(mappings)


def _build_index_body(raw: dict, use_ik: bool) -> dict:
    """Build the index body, falling back to CJK analyzers if IK is absent."""
    if use_ik:
        return {"settings": raw["settings"], "mappings": raw["mappings"]}

    body: dict = {}
    body["settings"] = raw.get("settings_fallback", raw["settings"])
    body["mappings"] = deepcopy(raw["mappings"])
    _replace_analyzers(body["mappings"])
    return body


def recreate_index(es: Elasticsearch, index_name: str = INDEX_NAME) -> None:
    """
    Delete the index if it exists and recreate it with proper mappings.

    This makes the load idempotent — safe to re-run without duplicates.
    """
    if es.indices.exists(index=index_name):
        logger.info("Deleting existing index '%s'.", index_name)
        es.indices.delete(index=index_name)

    raw_mapping = _load_mapping()
    use_ik = _check_ik_plugin(es)
    body = _build_index_body(raw_mapping, use_ik)

    es.indices.create(index=index_name, body=body)
    logger.info("Index '%s' created.", index_name)


def bulk_index(
    es: Elasticsearch,
    records: list[dict],
    index_name: str = INDEX_NAME,
) -> dict[str, Any]:
    """
    Bulk-index a list of cleaned vehicle records into Elasticsearch.

    Returns a summary dict with counts and timing.
    """
    t0 = time.time()

    actions = [
        {
            "_index": index_name,
            "_id": rec["id"],
            "_source": rec,
        }
        for rec in records
    ]

    success, errors = bulk(es, actions, raise_on_error=False, stats_only=False)
    elapsed = time.time() - t0

    error_count = len(errors) if isinstance(errors, list) else 0

    summary = {
        "index": index_name,
        "total_submitted": len(records),
        "success": success,
        "errors": error_count,
        "elapsed_seconds": round(elapsed, 2),
    }

    if error_count:
        logger.error("Bulk index completed with %d errors.", error_count)
        for err in errors[:5]:
            logger.error("  %s", err)
    else:
        logger.info(
            "Bulk indexed %d records into '%s' in %.2fs.",
            success,
            index_name,
            elapsed,
        )

    return summary


def load_into_es(
    records: list[dict],
    es_url: str | None = None,
    index_name: str = INDEX_NAME,
) -> dict[str, Any]:
    """
    Full load: recreate index and bulk-index records.

    This is the main entry point used by the pipeline and startup hook.
    """
    es = get_es_client(es_url)

    if not es.ping():
        raise ConnectionError(f"Cannot connect to Elasticsearch at {es_url or ES_URL}")

    recreate_index(es, index_name)
    return bulk_index(es, records, index_name)


# ---------------------------------------------------------------------------
# FastAPI startup hook helper
# ---------------------------------------------------------------------------

def index_is_empty(es: Elasticsearch, index_name: str = INDEX_NAME) -> bool:
    """Check if the vehicles index is missing or has zero documents."""
    try:
        if not es.indices.exists(index=index_name):
            return True
        count = es.count(index=index_name)["count"]
        return count == 0
    except Exception as exc:
        logger.warning("Could not check index status: %s", exc)
        return True


async def auto_seed_es(es_url: str | None = None) -> None:
    """
    Auto-seed Elasticsearch if the vehicles index is empty or missing.

    Designed to be called from a FastAPI lifespan context manager::

        from contextlib import asynccontextmanager
        from etl.loader import auto_seed_es

        @asynccontextmanager
        async def lifespan(app: FastAPI):
            await auto_seed_es()
            yield

        app = FastAPI(lifespan=lifespan)

    This function is async-compatible but performs synchronous ES I/O
    (elasticsearch-py is sync). For production, consider running in a
    thread pool via asyncio.to_thread().
    """
    from etl.cleaners import clean_all

    url = es_url or ES_URL

    try:
        es = get_es_client(url)
        if not es.ping():
            logger.warning("Elasticsearch not reachable at %s — skipping auto-seed.", url)
            return

        if not index_is_empty(es, INDEX_NAME):
            logger.info("Index '%s' already has data — skipping auto-seed.", INDEX_NAME)
            return

        logger.info("Index '%s' is empty/missing — running ETL auto-seed...", INDEX_NAME)

        with open(DATA_FILE, "r", encoding="utf-8") as f:
            raw_records = json.load(f)

        cleaned, skipped = clean_all(raw_records)
        summary = load_into_es(cleaned, url)
        logger.info("Auto-seed complete: %s", summary)

    except Exception as exc:
        logger.error("Auto-seed failed (non-fatal): %s", exc)
