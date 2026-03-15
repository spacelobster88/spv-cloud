"""
ETL Pipeline CLI — read, clean, and index vehicle data into Elasticsearch.

Usage:
    python -m etl.pipeline [--dry-run] [--es-url URL]

Options:
    --dry-run   Clean data but do not index into Elasticsearch
    --es-url    Elasticsearch URL (default: http://localhost:9200 or ES_URL env)
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path

from etl.cleaners import clean_all
from etl.loader import DATA_FILE, ES_URL, load_into_es

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)


def run_pipeline(data_file: Path = DATA_FILE, es_url: str = ES_URL, dry_run: bool = False) -> dict:
    """
    Execute the full ETL pipeline.

    1. Read vehicles.json
    2. Clean and normalize all records
    3. Bulk-index into Elasticsearch (unless --dry-run)

    Returns a summary dict.
    """
    # --- Extract ---
    logger.info("Reading data from %s", data_file)
    with open(data_file, "r", encoding="utf-8") as f:
        raw_records = json.load(f)
    logger.info("Loaded %d raw records.", len(raw_records))

    # --- Transform ---
    cleaned, skipped = clean_all(raw_records)

    if dry_run:
        logger.info("Dry-run mode — skipping Elasticsearch indexing.")
        summary = {
            "mode": "dry-run",
            "total_raw": len(raw_records),
            "cleaned": len(cleaned),
            "skipped": len(skipped),
        }
        # Print a sample cleaned record
        if cleaned:
            logger.info("Sample cleaned record: %s", json.dumps(cleaned[0], ensure_ascii=False, indent=2))
        return summary

    # --- Load ---
    load_summary = load_into_es(cleaned, es_url)

    summary = {
        "mode": "full",
        "total_raw": len(raw_records),
        "cleaned": len(cleaned),
        "skipped": len(skipped),
        **load_summary,
    }
    return summary


def main() -> None:
    parser = argparse.ArgumentParser(description="SPV Platform ETL Pipeline")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Clean data but do not index into Elasticsearch",
    )
    parser.add_argument(
        "--es-url",
        default=ES_URL,
        help=f"Elasticsearch URL (default: {ES_URL})",
    )
    args = parser.parse_args()

    logger.info("Starting ETL pipeline...")
    try:
        summary = run_pipeline(es_url=args.es_url, dry_run=args.dry_run)
        logger.info("Pipeline complete. Summary:")
        for k, v in summary.items():
            logger.info("  %s: %s", k, v)
    except Exception as exc:
        logger.error("Pipeline failed: %s", exc, exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
