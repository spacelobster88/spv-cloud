"""
Vehicle data change tracking module.

Compares new data against existing Elasticsearch records and tracks changes.
Produces diff reports and indexes change history for auditing.

Usage (CLI):
    python -m etl.diff_tracker --new-data path/to/new_vehicles.json --batch 399
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from elasticsearch import Elasticsearch

logger = logging.getLogger(__name__)

ES_URL = os.getenv("ES_URL", "http://localhost:9200")
VEHICLES_INDEX = "vehicles"
CHANGES_INDEX = "vehicle_changes"

_BACKEND_DIR = Path(__file__).resolve().parent.parent
CHANGES_MAPPING_FILE = _BACKEND_DIR / "es_mappings" / "vehicle_changes_index.json"
DEFAULT_REPORT_DIR = _BACKEND_DIR / "data" / "diff_reports"

# Fields to ignore when comparing records — metadata and non-comparable blobs
IGNORED_FIELDS = frozenset({
    "id",
    "created_at",
    "updated_at",
    "images",
    "change_history",
    "backup_params",
})


# ---------------------------------------------------------------------------
# DiffResult dataclass
# ---------------------------------------------------------------------------

@dataclass
class DiffResult:
    """Container for the results of a batch comparison."""

    new_vehicles: list[dict] = field(default_factory=list)
    updated_vehicles: list[tuple[dict, dict]] = field(default_factory=list)  # (new_record, diff)
    unchanged_vehicles: list[dict] = field(default_factory=list)
    change_records: list[dict] = field(default_factory=list)

    @property
    def summary(self) -> str:
        """Human-readable summary of changes."""
        parts = [
            f"New: {len(self.new_vehicles)}",
            f"Updated: {len(self.updated_vehicles)}",
            f"Unchanged: {len(self.unchanged_vehicles)}",
            f"Total change records: {len(self.change_records)}",
        ]
        return " | ".join(parts)

    @property
    def has_changes(self) -> bool:
        return bool(self.new_vehicles or self.updated_vehicles)


# ---------------------------------------------------------------------------
# DiffTracker
# ---------------------------------------------------------------------------

class DiffTracker:
    """Compares incoming vehicle data against existing ES records."""

    def __init__(
        self,
        es_client: Elasticsearch | None = None,
        es_url: str = "http://localhost:9200",
    ) -> None:
        """Initialize with an ES connection.

        Parameters
        ----------
        es_client:
            An existing Elasticsearch client instance. If *None*, a new client
            is created using *es_url*.
        es_url:
            Elasticsearch URL used when *es_client* is not provided.
        """
        if es_client is not None:
            self.es = es_client
        else:
            self.es = Elasticsearch(es_url)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def compare_batch(
        self,
        new_records: list[dict],
        batch_number: int,
    ) -> DiffResult:
        """Compare a batch of new records against existing data in ES.

        Returns a :class:`DiffResult` with categorized records and change
        history entries ready for indexing.
        """
        result = DiffResult()

        for record in new_records:
            model_number = record.get("model_number")
            if not model_number:
                logger.warning("Record missing model_number — skipping: %s", record.get("id", "?"))
                continue

            try:
                existing = self._get_existing_record(model_number)
            except Exception as exc:
                logger.error(
                    "ES lookup failed for model_number=%s: %s", model_number, exc,
                )
                # Treat as new to be safe — data won't be lost
                existing = None

            if existing is None:
                # Brand-new vehicle
                result.new_vehicles.append(record)
                change = self._create_change_record(
                    model_number=model_number,
                    diff={},
                    batch_number=batch_number,
                    change_type="new",
                    vehicle_name=record.get("name"),
                )
                result.change_records.append(change)
            else:
                diff = self._compute_diff(existing, record)
                if diff:
                    result.updated_vehicles.append((record, diff))
                    change = self._create_change_record(
                        model_number=model_number,
                        diff=diff,
                        batch_number=batch_number,
                        change_type="update",
                        vehicle_name=record.get("name"),
                    )
                    result.change_records.append(change)
                else:
                    result.unchanged_vehicles.append(record)

        logger.info("Batch %d diff complete — %s", batch_number, result.summary)
        return result

    def save_diff_report(
        self,
        diff_result: DiffResult,
        output_path: str | None = None,
    ) -> Path:
        """Save a diff report as a JSON file for manual review.

        Returns the :class:`Path` to the written report file.
        """
        if output_path is not None:
            path = Path(output_path)
        else:
            DEFAULT_REPORT_DIR.mkdir(parents=True, exist_ok=True)
            ts = datetime.now(tz=timezone.utc).strftime("%Y%m%dT%H%M%SZ")
            path = DEFAULT_REPORT_DIR / f"diff_report_{ts}.json"

        report: dict[str, Any] = {
            "generated_at": _utcnow_iso(),
            "summary": diff_result.summary,
            "new_count": len(diff_result.new_vehicles),
            "updated_count": len(diff_result.updated_vehicles),
            "unchanged_count": len(diff_result.unchanged_vehicles),
            "new_vehicles": [
                {"model_number": r.get("model_number"), "name": r.get("name")}
                for r in diff_result.new_vehicles
            ],
            "updated_vehicles": [
                {
                    "model_number": rec.get("model_number"),
                    "name": rec.get("name"),
                    "changed_fields": diff,
                }
                for rec, diff in diff_result.updated_vehicles
            ],
            "change_records": diff_result.change_records,
        }

        with open(path, "w", encoding="utf-8") as fh:
            json.dump(report, fh, ensure_ascii=False, indent=2)

        logger.info("Diff report saved to %s", path)
        return path

    def index_change_history(self, changes: list[dict]) -> None:
        """Index change records into the ``vehicle_changes`` ES index.

        Creates the index with proper mappings if it does not already exist.
        """
        if not changes:
            logger.info("No change records to index.")
            return

        self._ensure_changes_index()

        from elasticsearch.helpers import bulk

        actions = [
            {
                "_index": CHANGES_INDEX,
                "_source": change,
            }
            for change in changes
        ]

        try:
            success, errors = bulk(self.es, actions, raise_on_error=False, stats_only=False)
            error_count = len(errors) if isinstance(errors, list) else 0
            if error_count:
                logger.error("Indexed change history with %d errors.", error_count)
                for err in errors[:5]:
                    logger.error("  %s", err)
            else:
                logger.info("Indexed %d change history records.", success)
        except Exception as exc:
            logger.error("Failed to index change history: %s", exc)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _get_existing_record(self, model_number: str) -> dict | None:
        """Fetch an existing vehicle from ES by *model_number*.

        Returns the ``_source`` dict, or *None* if not found or the index
        does not exist.
        """
        try:
            if not self.es.indices.exists(index=VEHICLES_INDEX):
                return None

            resp = self.es.search(
                index=VEHICLES_INDEX,
                body={
                    "query": {"term": {"model_number": model_number}},
                    "size": 1,
                },
            )
            hits = resp.get("hits", {}).get("hits", [])
            if hits:
                return hits[0]["_source"]
        except Exception as exc:
            logger.debug("ES search error for model_number=%s: %s", model_number, exc)
        return None

    def _compute_diff(self, old: dict, new: dict) -> dict:
        """Compare two vehicle records field by field.

        Returns a dict of ``{field_name: {"old": old_val, "new": new_val}}``
        containing only the fields that actually changed. Metadata fields
        listed in :data:`IGNORED_FIELDS` are excluded from comparison.
        """
        diff: dict[str, dict[str, Any]] = {}
        all_keys = set(old.keys()) | set(new.keys())

        for key in sorted(all_keys):
            if key in IGNORED_FIELDS:
                continue
            old_val = old.get(key)
            new_val = new.get(key)
            if old_val != new_val:
                diff[key] = {"old": old_val, "new": new_val}

        return diff

    def _create_change_record(
        self,
        model_number: str,
        diff: dict,
        batch_number: int,
        change_type: str = "update",
        vehicle_name: str | None = None,
    ) -> dict:
        """Build a change history document suitable for ES indexing."""
        return {
            "model_number": model_number,
            "vehicle_name": vehicle_name or "",
            "batch": f"\u7b2c{batch_number}\u6279",  # 第XXX批
            "batch_number": batch_number,
            "date": datetime.now(tz=timezone.utc).strftime("%Y-%m-%d"),
            "change_type": change_type,
            "changed_fields": diff,
            "changed_field_names": list(diff.keys()),
            "timestamp": _utcnow_iso(),
        }

    def _ensure_changes_index(self) -> None:
        """Create the ``vehicle_changes`` index if it does not exist."""
        try:
            if self.es.indices.exists(index=CHANGES_INDEX):
                return

            if CHANGES_MAPPING_FILE.exists():
                with open(CHANGES_MAPPING_FILE, "r", encoding="utf-8") as fh:
                    body = json.load(fh)
            else:
                logger.warning(
                    "Mapping file %s not found — creating index with default mappings.",
                    CHANGES_MAPPING_FILE,
                )
                body = {
                    "settings": {"number_of_shards": 1, "number_of_replicas": 0},
                }

            self.es.indices.create(index=CHANGES_INDEX, body=body)
            logger.info("Created index '%s'.", CHANGES_INDEX)
        except Exception as exc:
            logger.error("Could not ensure changes index: %s", exc)


# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------

def _utcnow_iso() -> str:
    """Return the current UTC time as an ISO-8601 string."""
    return datetime.now(tz=timezone.utc).isoformat(timespec="seconds")


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def main() -> None:
    """CLI for running a diff comparison against ES."""
    parser = argparse.ArgumentParser(
        description="Compare new vehicle data against existing ES records and produce a diff report.",
    )
    parser.add_argument(
        "--new-data",
        required=True,
        help="Path to JSON file containing new vehicle records.",
    )
    parser.add_argument(
        "--batch",
        type=int,
        required=True,
        help="Batch number for change tracking (e.g. 399).",
    )
    parser.add_argument(
        "--es-url",
        default=ES_URL,
        help=f"Elasticsearch URL (default: {ES_URL}).",
    )
    parser.add_argument(
        "--output",
        default=None,
        help="Path to save the diff report JSON. Defaults to data/diff_reports/.",
    )
    parser.add_argument(
        "--index-changes",
        action="store_true",
        help="Also index change records into the vehicle_changes ES index.",
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
    )

    # Load new data
    data_path = Path(args.new_data)
    if not data_path.exists():
        logger.error("File not found: %s", data_path)
        sys.exit(1)

    with open(data_path, "r", encoding="utf-8") as fh:
        new_records = json.load(fh)

    if not isinstance(new_records, list):
        logger.error("Expected a JSON array of vehicle records.")
        sys.exit(1)

    logger.info("Loaded %d new records from %s", len(new_records), data_path)

    # Connect and compare
    tracker = DiffTracker(es_url=args.es_url)

    try:
        if not tracker.es.ping():
            logger.error("Cannot reach Elasticsearch at %s", args.es_url)
            sys.exit(1)
    except Exception as exc:
        logger.error("Cannot connect to Elasticsearch: %s", exc)
        sys.exit(1)

    result = tracker.compare_batch(new_records, batch_number=args.batch)
    logger.info("Result: %s", result.summary)

    # Save report
    report_path = tracker.save_diff_report(result, output_path=args.output)
    logger.info("Report written to %s", report_path)

    # Optionally index changes
    if args.index_changes and result.change_records:
        tracker.index_change_history(result.change_records)
        logger.info("Change records indexed into '%s'.", CHANGES_INDEX)


if __name__ == "__main__":
    main()
