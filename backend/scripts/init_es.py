"""
Initialize Elasticsearch indices for the SPV Platform.

Creates the vehicle announcement index with proper mappings and
Chinese text analysis (IK analyzer with CJK fallback).

Usage:
    python init_es.py [--host HOST] [--port PORT] [--force]

Options:
    --host   Elasticsearch host (default: localhost)
    --port   Elasticsearch port (default: 9200)
    --force  Delete and recreate index if it already exists
"""

import argparse
import json
import logging
import sys
from copy import deepcopy
from pathlib import Path

from elasticsearch import Elasticsearch, NotFoundError

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

INDEX_NAME = "vehicles"
MAPPINGS_DIR = Path(__file__).resolve().parent.parent / "es_mappings"
MAPPING_FILE = MAPPINGS_DIR / "vehicle_index.json"


def load_mapping() -> dict:
    """Load the vehicle index mapping from the JSON file."""
    with open(MAPPING_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def check_ik_plugin(es: Elasticsearch) -> bool:
    """Check whether the IK Analysis plugin is installed."""
    try:
        plugins = es.cat.plugins(format="json")
        for plugin in plugins:
            if "ik" in plugin.get("component", "").lower():
                logger.info("IK Analysis plugin detected.")
                return True
    except Exception:
        pass
    logger.warning("IK Analysis plugin not found. Falling back to CJK analyzer.")
    return False


def build_index_body(raw: dict, use_ik: bool) -> dict:
    """
    Build the final index body.

    If the IK plugin is not available, swap the settings block to the
    CJK-based fallback and rewrite analyzer references in mappings.
    """
    body: dict = {}

    if use_ik:
        body["settings"] = raw["settings"]
        body["mappings"] = raw["mappings"]
    else:
        # Use fallback settings with CJK analyzer
        body["settings"] = raw.get("settings_fallback", raw["settings"])
        body["mappings"] = deepcopy(raw["mappings"])
        _replace_analyzers(body["mappings"])

    return body


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


def create_index(es: Elasticsearch, index_name: str, body: dict, force: bool = False) -> None:
    """Create the Elasticsearch index. Optionally delete it first."""
    if es.indices.exists(index=index_name):
        if force:
            logger.info("Deleting existing index '%s' (--force).", index_name)
            es.indices.delete(index=index_name)
        else:
            logger.info("Index '%s' already exists. Use --force to recreate.", index_name)
            return

    es.indices.create(index=index_name, body=body)
    logger.info("Index '%s' created successfully.", index_name)

    # Verify field count
    mapping_resp = es.indices.get_mapping(index=index_name)
    props = mapping_resp[index_name]["mappings"].get("properties", {})
    logger.info("Index '%s' has %d mapped fields.", index_name, len(props))


def main() -> None:
    parser = argparse.ArgumentParser(description="Initialize Elasticsearch indices for SPV Platform")
    parser.add_argument("--host", default="localhost", help="Elasticsearch host (default: localhost)")
    parser.add_argument("--port", type=int, default=9200, help="Elasticsearch port (default: 9200)")
    parser.add_argument("--force", action="store_true", help="Delete and recreate index if exists")
    args = parser.parse_args()

    es_url = f"http://{args.host}:{args.port}"
    logger.info("Connecting to Elasticsearch at %s", es_url)

    es = Elasticsearch(es_url)

    # Verify connectivity
    if not es.ping():
        logger.error("Cannot connect to Elasticsearch at %s", es_url)
        sys.exit(1)

    info = es.info()
    logger.info(
        "Connected to Elasticsearch %s (cluster: %s)",
        info["version"]["number"],
        info["cluster_name"],
    )

    raw_mapping = load_mapping()
    use_ik = check_ik_plugin(es)
    body = build_index_body(raw_mapping, use_ik)

    create_index(es, INDEX_NAME, body, force=args.force)

    logger.info("Initialization complete.")


if __name__ == "__main__":
    main()
