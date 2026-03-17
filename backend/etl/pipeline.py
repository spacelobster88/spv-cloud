"""
SPV-Cloud ETL Pipeline v2
Supports multiple data sources:
- MIIT DOC attachments (primary source)
- MIIT query system (supplementary, for complete params)
- Mock data (fallback/development)

Usage:
    python -m etl.pipeline                                # Default: auto source
    python -m etl.pipeline --source mock                  # Use mock data (original behavior)
    python -m etl.pipeline --source miit_doc --batch 399  # Parse specific batch DOC
    python -m etl.pipeline --monthly --batch 399          # Full monthly update workflow
    python -m etl.pipeline --dry-run                      # Validate without loading

Options:
    --dry-run       Clean data but do not index into Elasticsearch
    --es-url URL    Elasticsearch URL (default: http://localhost:9200 or ES_URL env)
    --source SRC    Data source: auto, mock, miit_doc, miit_crawl, combined
    --batch N       MIIT announcement batch number
    --monthly       Run full monthly incremental update workflow
    --data-dir DIR  Data directory (default: backend/data)
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

# ---------------------------------------------------------------------------
# Optional imports — gracefully degrade when modules are not available
# ---------------------------------------------------------------------------

_HAS_MIIT_DOWNLOADER = False
_HAS_MIIT_CRAWLER = False
_HAS_DIFF_TRACKER = False

try:
    from scraper.miit_downloader import MIITDownloader, MIITDocParser
    _HAS_MIIT_DOWNLOADER = True
except ImportError:
    logger.debug("miit_downloader not available — MIIT DOC source disabled")

try:
    from scraper.miit_crawler import MIITCrawler  # type: ignore[import-not-found]
    _HAS_MIIT_CRAWLER = True
except ImportError:
    logger.debug("miit_crawler not available — MIIT crawl source disabled")

try:
    from etl.diff_tracker import DiffTracker
    _HAS_DIFF_TRACKER = True
except ImportError:
    logger.debug("diff_tracker not available — diff tracking disabled")


# ---------------------------------------------------------------------------
# ETLPipeline
# ---------------------------------------------------------------------------

class ETLPipeline:
    """Multi-source ETL pipeline for vehicle data."""

    def __init__(
        self,
        es_url: str = ES_URL,
        data_dir: str = "backend/data",
    ) -> None:
        self.es_url = es_url
        self.data_dir = Path(data_dir)

    # ------------------------------------------------------------------
    # Public entry points
    # ------------------------------------------------------------------

    def run_full(
        self,
        batch_number: int | None = None,
        source: str = "auto",
        dry_run: bool = False,
    ) -> dict:
        """
        Full ETL run.

        source options:
        - "auto": Try MIIT DOC first, supplement with crawler, fall back to mock
        - "miit_doc": Only use MIIT DOC parser
        - "miit_crawl": Only use MIIT crawler
        - "mock": Use mock data (existing behavior)
        - "combined": Use DOC + crawler combined
        """
        logger.info(
            "Starting ETL pipeline — source=%s, batch=%s, dry_run=%s",
            source, batch_number, dry_run,
        )

        # --- Extract ---
        records = self._extract(source, batch_number)
        if not records:
            logger.warning("No records extracted — aborting pipeline.")
            return {"mode": "aborted", "reason": "no records extracted"}

        logger.info("Extracted %d raw records.", len(records))

        # --- Transform ---
        cleaned, skipped = self._transform(records)

        if dry_run:
            logger.info("Dry-run mode — skipping Elasticsearch indexing.")
            summary = {
                "mode": "dry-run",
                "source": source,
                "total_raw": len(records),
                "cleaned": len(cleaned),
                "skipped": len(skipped),
            }
            if cleaned:
                logger.info(
                    "Sample cleaned record: %s",
                    json.dumps(cleaned[0], ensure_ascii=False, indent=2),
                )
            return summary

        # --- Load ---
        load_summary = self._load(cleaned, incremental=False)

        return {
            "mode": "full",
            "source": source,
            "total_raw": len(records),
            "cleaned": len(cleaned),
            "skipped": len(skipped),
            **load_summary,
        }

    def run_monthly_update(
        self,
        batch_number: int,
        dry_run: bool = False,
    ) -> dict:
        """
        Monthly incremental update workflow:
        1. Download latest MIIT DOC attachment
        2. Parse DOC to get new/changed model numbers and basic data
        3. Use MIIT crawler to supplement with complete params (optional)
        4. Clean all records
        5. Compare with existing data (diff tracking)
        6. Index new/updated records into ES
        7. Save diff report
        """
        logger.info("Starting monthly update for batch %d", batch_number)

        # Step 1-2: Extract from MIIT DOC
        doc_records = self._extract_from_miit_doc(batch_number)
        if not doc_records:
            logger.warning("No records from MIIT DOC for batch %d.", batch_number)
            return {"mode": "monthly-update", "batch": batch_number, "reason": "no DOC records"}

        logger.info("Extracted %d records from MIIT DOC.", len(doc_records))

        # Step 3: Optionally supplement with crawler data
        merged = doc_records
        if _HAS_MIIT_CRAWLER:
            model_numbers = [
                r["model_number"]
                for r in doc_records
                if r.get("model_number")
            ]
            if model_numbers:
                crawl_records = self._extract_from_miit_crawler(model_numbers, batch_number)
                if crawl_records:
                    merged = self._merge_sources(doc_records, crawl_records)
                    logger.info(
                        "Merged %d DOC + %d crawl = %d records.",
                        len(doc_records), len(crawl_records), len(merged),
                    )
        else:
            logger.info("MIIT crawler not available — skipping supplementary crawl.")

        # Step 4: Clean all records
        cleaned, skipped = self._transform(merged)
        logger.info("Cleaned %d records, skipped %d.", len(cleaned), len(skipped))

        if dry_run:
            logger.info("Dry-run mode — skipping ES indexing and diff tracking.")
            return {
                "mode": "monthly-update-dry-run",
                "batch": batch_number,
                "total_raw": len(merged),
                "cleaned": len(cleaned),
                "skipped": len(skipped),
            }

        # Step 5: Diff tracking (optional)
        diff_result = None
        if _HAS_DIFF_TRACKER:
            try:
                tracker = DiffTracker(es_url=self.es_url)
                diff_result = tracker.compare_batch(cleaned, batch_number=batch_number)
                logger.info("Diff result: %s", diff_result.summary)
            except Exception as exc:
                logger.warning("Diff tracking failed (non-fatal): %s", exc)

        # Step 6: Incremental index
        from etl.loader import get_es_client, ensure_index, incremental_index

        es = get_es_client(self.es_url)
        if not es.ping():
            raise ConnectionError(f"Cannot connect to Elasticsearch at {self.es_url}")

        ensure_index(es)
        index_summary = incremental_index(es, cleaned)

        # Step 7: Save diff report
        report_path = None
        if _HAS_DIFF_TRACKER and diff_result is not None:
            try:
                report_path = tracker.save_diff_report(diff_result)
                tracker.index_change_history(diff_result.change_records)
                logger.info("Diff report saved to %s", report_path)
            except Exception as exc:
                logger.warning("Failed to save diff report (non-fatal): %s", exc)

        return {
            "mode": "monthly-update",
            "batch": batch_number,
            "total_raw": len(merged),
            "cleaned": len(cleaned),
            "skipped": len(skipped),
            "diff": diff_result.summary if diff_result else "N/A",
            "diff_report": str(report_path) if report_path else None,
            **index_summary,
        }

    # ------------------------------------------------------------------
    # Extract methods
    # ------------------------------------------------------------------

    def _extract(self, source: str, batch_number: int | None) -> list[dict]:
        """Route extraction to the appropriate source handler."""
        if source == "mock":
            return self._extract_from_mock()

        if source == "miit_doc":
            return self._extract_from_miit_doc(batch_number)

        if source == "miit_crawl":
            if not batch_number:
                logger.error("--batch is required for miit_crawl source.")
                return []
            return self._extract_from_miit_crawler([], batch_number)

        if source == "combined":
            doc_records = self._extract_from_miit_doc(batch_number)
            if not doc_records:
                logger.warning("No DOC records — falling back to mock data.")
                return self._extract_from_mock()
            model_numbers = [
                r["model_number"] for r in doc_records if r.get("model_number")
            ]
            crawl_records = self._extract_from_miit_crawler(model_numbers, batch_number) if model_numbers else []
            return self._merge_sources(doc_records, crawl_records) if crawl_records else doc_records

        if source == "auto":
            return self._extract_auto(batch_number)

        logger.error("Unknown source: %s", source)
        return []

    def _extract_auto(self, batch_number: int | None) -> list[dict]:
        """Auto mode: try MIIT DOC, supplement with crawler, fall back to mock."""
        # Try MIIT DOC first
        if _HAS_MIIT_DOWNLOADER:
            try:
                doc_records = self._extract_from_miit_doc(batch_number)
                if doc_records:
                    logger.info("Auto: got %d records from MIIT DOC.", len(doc_records))
                    # Try to supplement with crawler
                    if _HAS_MIIT_CRAWLER and batch_number:
                        model_numbers = [
                            r["model_number"] for r in doc_records if r.get("model_number")
                        ]
                        if model_numbers:
                            try:
                                crawl_records = self._extract_from_miit_crawler(
                                    model_numbers, batch_number,
                                )
                                if crawl_records:
                                    return self._merge_sources(doc_records, crawl_records)
                            except Exception as exc:
                                logger.warning(
                                    "Auto: crawler supplement failed (non-fatal): %s", exc,
                                )
                    return doc_records
            except Exception as exc:
                logger.warning("Auto: MIIT DOC extraction failed: %s", exc)

        # Fall back to mock data
        logger.info("Auto: falling back to mock data.")
        return self._extract_from_mock()

    def _extract_from_miit_doc(self, batch_number: int | None = None) -> list[dict]:
        """Extract vehicles from MIIT DOC attachment."""
        if not _HAS_MIIT_DOWNLOADER:
            logger.error(
                "miit_downloader module not available. "
                "Install dependencies: pip install python-docx requests beautifulsoup4"
            )
            return []

        data_dir = self.data_dir / "miit_docs"
        downloader = MIITDownloader(data_dir=str(data_dir))

        try:
            if batch_number:
                doc_path = downloader.download_batch(batch_number)
            else:
                doc_path = downloader.download_latest_batch()
        except Exception as exc:
            logger.error("Failed to download MIIT DOC: %s", exc)
            return []

        parser = MIITDocParser(doc_path, batch_number=batch_number)
        records = parser.parse()
        logger.info("Parsed %d records from MIIT DOC: %s", len(records), doc_path)
        return records

    def _extract_from_miit_crawler(
        self,
        model_numbers: list[str],
        batch_number: int,
    ) -> list[dict]:
        """Extract complete params from MIIT query system."""
        if not _HAS_MIIT_CRAWLER:
            logger.error("miit_crawler module not available.")
            return []

        try:
            crawler = MIITCrawler()
            records = crawler.crawl_batch(
                model_numbers=model_numbers,
                batch_number=batch_number,
            )
            logger.info(
                "Crawled %d records from MIIT query system.", len(records),
            )
            return records
        except Exception as exc:
            logger.error("MIIT crawler failed: %s", exc)
            return []

    def _extract_from_mock(self) -> list[dict]:
        """Extract from mock data file (existing behavior)."""
        data_file = self.data_dir / "vehicles.json"
        if not data_file.exists():
            # Try the module-level DATA_FILE constant as fallback
            data_file = DATA_FILE

        logger.info("Reading mock data from %s", data_file)
        with open(data_file, "r", encoding="utf-8") as f:
            records = json.load(f)
        logger.info("Loaded %d mock records.", len(records))
        return records

    # ------------------------------------------------------------------
    # Merge
    # ------------------------------------------------------------------

    def _merge_sources(
        self,
        doc_records: list[dict],
        crawl_records: list[dict],
    ) -> list[dict]:
        """
        Merge DOC-parsed records with crawler-supplemented data.
        Crawler data takes priority for overlapping fields (more complete).
        DOC data is used as base.
        Matching is done by model_number.
        """
        # Index crawler records by model_number for fast lookup
        crawl_by_model: dict[str, dict] = {}
        for rec in crawl_records:
            mn = rec.get("model_number")
            if mn:
                crawl_by_model[mn] = rec

        merged: list[dict] = []
        seen_models: set[str] = set()

        for doc_rec in doc_records:
            mn = doc_rec.get("model_number")
            if mn and mn in crawl_by_model:
                # Start with DOC record as base, overlay crawler data
                combined = dict(doc_rec)
                crawl_rec = crawl_by_model[mn]
                for key, value in crawl_rec.items():
                    # Crawler data takes priority for non-None values
                    if value is not None and value != "" and value != []:
                        combined[key] = value
                merged.append(combined)
                seen_models.add(mn)
            else:
                merged.append(doc_rec)
                if mn:
                    seen_models.add(mn)

        # Add any crawler-only records not present in DOC
        for mn, rec in crawl_by_model.items():
            if mn not in seen_models:
                merged.append(rec)

        logger.info(
            "Merged sources: %d DOC + %d crawl -> %d merged",
            len(doc_records), len(crawl_records), len(merged),
        )
        return merged

    # ------------------------------------------------------------------
    # Transform & Load
    # ------------------------------------------------------------------

    def _transform(self, records: list[dict]) -> tuple[list[dict], list[dict]]:
        """Clean and enrich records using cleaners."""
        return clean_all(records)

    def _load(self, records: list[dict], incremental: bool = False) -> dict:
        """Load into Elasticsearch.
        If incremental=True, update existing records instead of recreating index.
        """
        if incremental:
            from etl.loader import get_es_client, ensure_index, incremental_index

            es = get_es_client(self.es_url)
            if not es.ping():
                raise ConnectionError(
                    f"Cannot connect to Elasticsearch at {self.es_url}"
                )
            ensure_index(es)
            return incremental_index(es, records)
        else:
            return load_into_es(records, self.es_url)


# ---------------------------------------------------------------------------
# Legacy wrapper for backward compatibility
# ---------------------------------------------------------------------------

def run_pipeline(
    data_file: Path = DATA_FILE,
    es_url: str = ES_URL,
    dry_run: bool = False,
) -> dict:
    """
    Execute the full ETL pipeline (legacy interface).

    1. Read vehicles.json
    2. Clean and normalize all records
    3. Bulk-index into Elasticsearch (unless --dry-run)

    Returns a summary dict.
    """
    pipeline = ETLPipeline(es_url=es_url, data_dir=str(data_file.parent))
    return pipeline.run_full(source="mock", dry_run=dry_run)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="SPV Platform ETL Pipeline v2")
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
    parser.add_argument(
        "--source",
        choices=["auto", "mock", "miit_doc", "miit_crawl", "combined"],
        default="auto",
        help="Data source (default: auto)",
    )
    parser.add_argument(
        "--batch",
        type=int,
        default=None,
        help="MIIT announcement batch number (e.g. 399)",
    )
    parser.add_argument(
        "--monthly",
        action="store_true",
        help="Run full monthly incremental update workflow",
    )
    parser.add_argument(
        "--data-dir",
        default="backend/data",
        help="Data directory (default: backend/data)",
    )

    args = parser.parse_args()

    pipeline = ETLPipeline(es_url=args.es_url, data_dir=args.data_dir)

    logger.info("Starting ETL pipeline...")
    try:
        if args.monthly:
            if not args.batch:
                logger.error("--batch is required for --monthly mode.")
                sys.exit(1)
            summary = pipeline.run_monthly_update(
                batch_number=args.batch,
                dry_run=args.dry_run,
            )
        else:
            summary = pipeline.run_full(
                batch_number=args.batch,
                source=args.source,
                dry_run=args.dry_run,
            )

        logger.info("Pipeline complete. Summary:")
        for k, v in summary.items():
            logger.info("  %s: %s", k, v)

    except Exception as exc:
        logger.error("Pipeline failed: %s", exc, exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
