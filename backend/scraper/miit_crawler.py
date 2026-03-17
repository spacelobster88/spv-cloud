#!/usr/bin/env python3
"""
MIIT Vehicle Announcement Query System Crawler
工信部公告查询系统爬虫

Compliant data collection from the public MIIT vehicle announcement query system.
Used to supplement DOC-parsed data with complete 27-parameter vehicle details and images.

Compliance measures:
- Monthly incremental crawl only (new/changed models)
- Polite request intervals (3-5 seconds)
- Respects robots.txt
- Standard browser User-Agent
- No authentication bypass
"""

import logging
import json
import time
import random
import re
import uuid
from pathlib import Path
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Optional
from urllib.robotparser import RobotFileParser

import requests
from bs4 import BeautifulSoup, Tag
from fake_useragent import UserAgent

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

# MIIT query system base URL
MIIT_QUERY_BASE = "https://ggzx.miit.gov.cn"

# Endpoints (public query pages)
SEARCH_PATH = "/Datainfo/gzlqchz"
DETAIL_PATH = "/Datainfo/gzlqchzdetail"

# Fields to extract (the complete 27 parameters)
MIIT_PARAM_FIELDS = [
    "企业名称", "产品商标", "产品型号", "产品名称",
    "外形尺寸(mm)", "货厢尺寸(mm)", "总质量(kg)", "整备质量(kg)",
    "额定载质量(kg)", "准拖挂车总质量(kg)", "载质量利用系数",
    "半挂车鞍座最大允许总质量(kg)", "驾驶室准乘人数",
    "接近角/离去角(°)", "前悬/后悬(mm)",
    "轴数", "轴距(mm)", "轴荷",
    "弹簧片数", "轮胎数", "轮胎规格",
    "钢板弹簧片数", "前轮距", "后轮距",
    "底盘型号", "底盘企业",
    "发动机型号", "发动机生产企业",
    "排量(ml)", "功率(kW)",
    "排放标准", "燃料种类",
    "转向形式", "最高车速(km/h)",
    "其它",
]

# Mapping from Chinese MIIT field names to our vehicle schema keys
FIELD_MAPPING = {
    "企业名称": "manufacturer",
    "产品商标": "brand",
    "产品型号": "model_number",
    "产品名称": "name",
    "总质量(kg)": "gvw",
    "整备质量(kg)": "curb_weight",
    "额定载质量(kg)": "rated_payload",
    "准拖挂车总质量(kg)": "towing_mass",
    "载质量利用系数": "payload_coefficient",
    "半挂车鞍座最大允许总质量(kg)": "saddle_max_mass",
    "驾驶室准乘人数": "cab_capacity",
    "接近角/离去角(°)": "approach_departure_angle",
    "前悬/后悬(mm)": "front_rear_overhang",
    "底盘型号": "chassis_model",
    "底盘企业": "chassis_brand",
    "发动机型号": "engine_model",
    "发动机生产企业": "engine_brand",
    "排量(ml)": "displacement",
    "功率(kW)": "power_kw",
    "排放标准": "emission_standard",
    "燃料种类": "fuel_type",
    "轴数": "axle_count",
    "轴距(mm)": "wheelbase",
    "轴荷": "axle_load",
    "弹簧片数": "spring_leaf_count",
    "轮胎数": "tire_count",
    "轮胎规格": "tire_spec",
    "钢板弹簧片数": "steel_spring_count",
    "前轮距": "front_track",
    "后轮距": "rear_track",
    "转向形式": "steering_type",
    "最高车速(km/h)": "max_speed",
    "其它": "notes",
}

# Integer fields that should be parsed to int
INT_FIELDS = {
    "gvw", "curb_weight", "rated_payload", "towing_mass",
    "saddle_max_mass", "axle_count", "tire_count", "max_speed",
    "cab_capacity",
}

# Float fields
FLOAT_FIELDS = {
    "displacement", "power_kw", "payload_coefficient",
}


@dataclass
class CrawlProgress:
    """Track crawl progress for resume capability."""
    total_models: int = 0
    completed: int = 0
    failed: int = 0
    skipped: int = 0
    failed_models: list = field(default_factory=list)
    last_model: str = ""

    def save(self, path: Path):
        """Save progress to file for resume."""
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(asdict(self), f, ensure_ascii=False, indent=2)
        logger.debug("Progress saved to %s", path)

    @classmethod
    def load(cls, path: Path) -> "CrawlProgress":
        """Load progress from file."""
        if not path.exists():
            return cls()
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            return cls(**data)
        except (json.JSONDecodeError, TypeError, KeyError) as exc:
            logger.warning("Could not load progress file %s: %s — starting fresh", path, exc)
            return cls()


class MIITCrawler:
    """
    Crawler for MIIT vehicle announcement query system.
    Designed for monthly incremental updates only.
    """

    def __init__(
        self,
        data_dir: str = "backend/data/miit_crawled",
        delay_range: tuple = (3.0, 5.0),
        max_retries: int = 3,
    ):
        """
        Args:
            data_dir: Directory to store crawled data
            delay_range: Min/max seconds between requests
            max_retries: Max retry attempts per request
        """
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.delay_range = delay_range
        self.max_retries = max_retries
        self.session: Optional[requests.Session] = None
        self.progress = CrawlProgress()
        self._robots_parser: Optional[RobotFileParser] = None
        self._setup_session()

    # ------------------------------------------------------------------
    # Session / network helpers
    # ------------------------------------------------------------------

    def _setup_session(self):
        """Set up requests session with proper headers."""
        self.session = requests.Session()

        try:
            ua = UserAgent(fallback="Mozilla/5.0")
            user_agent = ua.random
        except Exception:
            user_agent = (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            )

        self.session.headers.update({
            "User-Agent": user_agent,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.5",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
        })

    def _check_robots(self, url: str) -> bool:
        """Check robots.txt compliance for the given URL."""
        if self._robots_parser is None:
            self._robots_parser = RobotFileParser()
            robots_url = f"{MIIT_QUERY_BASE}/robots.txt"
            self._robots_parser.set_url(robots_url)
            try:
                self._robots_parser.read()
            except Exception as exc:
                logger.warning("Could not fetch robots.txt (%s) — assuming allowed", exc)
                # If we cannot read robots.txt, we conservatively proceed
                # but still respect polite delays.
                self._robots_parser = RobotFileParser()  # empty = allow all

        user_agent = self.session.headers.get("User-Agent", "*")
        return self._robots_parser.can_fetch(user_agent, url)

    def _polite_delay(self):
        """Wait a random interval between requests."""
        delay = random.uniform(*self.delay_range)
        logger.debug("Polite delay: %.1fs", delay)
        time.sleep(delay)

    def _request_with_retry(
        self, url: str, method: str = "GET", **kwargs
    ) -> Optional[requests.Response]:
        """Make HTTP request with retry logic and polite delays.

        Uses exponential backoff on failure. Returns the Response object
        or ``None`` after exhausting retries.
        """
        if not self._check_robots(url):
            logger.warning("URL disallowed by robots.txt, skipping: %s", url)
            return None

        kwargs.setdefault("timeout", 30)
        last_exc: Optional[Exception] = None

        for attempt in range(1, self.max_retries + 1):
            try:
                if attempt > 1:
                    backoff = min(2 ** attempt + random.uniform(0, 1), 30)
                    logger.info("Retry %d/%d after %.1fs backoff for %s",
                                attempt, self.max_retries, backoff, url)
                    time.sleep(backoff)

                resp = self.session.request(method, url, **kwargs)

                if resp.status_code == 200:
                    return resp

                if resp.status_code in (429, 503):
                    logger.warning("Rate-limited (HTTP %d) on %s", resp.status_code, url)
                    continue

                if resp.status_code >= 400:
                    logger.warning("HTTP %d on %s", resp.status_code, url)
                    return None

                return resp

            except requests.exceptions.Timeout:
                logger.warning("Timeout on attempt %d for %s", attempt, url)
                last_exc = requests.exceptions.Timeout(url)
            except requests.exceptions.ConnectionError as exc:
                logger.warning("Connection error on attempt %d for %s: %s", attempt, url, exc)
                last_exc = exc
            except requests.exceptions.RequestException as exc:
                logger.warning("Request error on attempt %d for %s: %s", attempt, url, exc)
                last_exc = exc

        logger.error("All %d attempts failed for %s (last error: %s)",
                      self.max_retries, url, last_exc)
        return None

    # ------------------------------------------------------------------
    # Parsing helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _parse_dimensions(dim_str: str) -> tuple[int, int, int]:
        """Parse 'L×W×H' or 'L*W*H' string into (length, width, height).

        Handles separators: ×, x, X, *, /, comma, spaces.
        Returns (0, 0, 0) on parse failure.
        """
        if not dim_str or not dim_str.strip():
            return (0, 0, 0)

        # Normalize common separators to a single delimiter
        normalized = re.sub(r'[×xX*/,，\s]+', '|', dim_str.strip())
        parts = [p.strip() for p in normalized.split('|') if p.strip()]

        if len(parts) < 3:
            return (0, 0, 0)

        try:
            values = []
            for p in parts[:3]:
                # Extract leading digits (ignore trailing text)
                m = re.match(r'(\d+)', p)
                if m:
                    values.append(int(m.group(1)))
                else:
                    values.append(0)
            return (values[0], values[1], values[2])
        except (ValueError, IndexError):
            return (0, 0, 0)

    @staticmethod
    def _safe_int(value: str) -> Optional[int]:
        """Parse an integer from a string, stripping non-numeric cruft."""
        if not value:
            return None
        m = re.search(r'-?\d+', value.replace(',', '').replace(' ', ''))
        return int(m.group()) if m else None

    @staticmethod
    def _safe_float(value: str) -> Optional[float]:
        """Parse a float from a string."""
        if not value:
            return None
        m = re.search(r'-?\d+\.?\d*', value.replace(',', '').replace(' ', ''))
        return float(m.group()) if m else None

    def _parse_detail_page(self, html: str) -> dict:
        """Parse a vehicle detail page from the MIIT query system.

        Extracts all 27 parameters from the detail table.
        Returns a dict keyed by the Chinese field names (raw extraction).
        """
        soup = BeautifulSoup(html, "lxml")
        raw: dict[str, str] = {}

        # Strategy 1: look for labelled table rows (most common layout)
        for table in soup.find_all("table"):
            rows = table.find_all("tr")
            for row in rows:
                cells = row.find_all(["td", "th"])
                # Walk cells in pairs: label, value, label, value, ...
                i = 0
                while i < len(cells) - 1:
                    label_text = cells[i].get_text(strip=True)
                    value_text = cells[i + 1].get_text(strip=True)
                    if label_text:
                        # Normalize label by removing trailing colons / spaces
                        label_clean = re.sub(r'[:\s：]+$', '', label_text)
                        raw[label_clean] = value_text
                    i += 2

        # Strategy 2: definition-list style (dl > dt + dd)
        for dl in soup.find_all("dl"):
            dts = dl.find_all("dt")
            dds = dl.find_all("dd")
            for dt, dd in zip(dts, dds):
                label = re.sub(r'[:\s：]+$', '', dt.get_text(strip=True))
                if label:
                    raw[label] = dd.get_text(strip=True)

        # Strategy 3: div-based label/value pairs
        for div in soup.find_all("div", class_=re.compile(r'param|spec|detail|info', re.I)):
            label_el = div.find(class_=re.compile(r'label|name|key|title', re.I))
            value_el = div.find(class_=re.compile(r'value|val|content|text', re.I))
            if label_el and value_el:
                label = re.sub(r'[:\s：]+$', '', label_el.get_text(strip=True))
                if label:
                    raw[label] = value_el.get_text(strip=True)

        return raw

    def _parse_images(self, html: str) -> list[str]:
        """Extract vehicle image URLs from detail page."""
        soup = BeautifulSoup(html, "lxml")
        images: list[str] = []
        seen: set[str] = set()

        # Look for images in the detail area
        for img in soup.find_all("img"):
            src = img.get("src") or img.get("data-src") or img.get("data-original") or ""
            src = src.strip()
            if not src:
                continue

            # Skip tiny icons, spacers, logos
            alt = (img.get("alt") or "").lower()
            width = img.get("width", "")
            if width and width.isdigit() and int(width) < 50:
                continue

            # Resolve relative URLs
            if src.startswith("//"):
                src = "https:" + src
            elif src.startswith("/"):
                src = MIIT_QUERY_BASE + src
            elif not src.startswith("http"):
                src = MIIT_QUERY_BASE + "/" + src

            # Deduplicate
            if src not in seen:
                seen.add(src)
                images.append(src)

        return images

    def _parse_search_results(self, html: str) -> list[dict]:
        """Parse search result page and return list of result entries.

        Each entry has at minimum a ``detail_url`` key (and optionally
        ``model_number``, ``name``).
        """
        soup = BeautifulSoup(html, "lxml")
        results: list[dict] = []

        # Look for links to detail pages
        for a_tag in soup.find_all("a", href=True):
            href = a_tag["href"]
            # MIIT detail links typically contain the detail path or an id param
            if DETAIL_PATH in href or "detail" in href.lower():
                full_url = href if href.startswith("http") else MIIT_QUERY_BASE + href
                text = a_tag.get_text(strip=True)
                results.append({
                    "detail_url": full_url,
                    "link_text": text,
                })

        # Also check table rows that may contain clickable model entries
        for table in soup.find_all("table"):
            for row in table.find_all("tr"):
                link = row.find("a", href=True)
                if link:
                    href = link["href"]
                    if href.startswith("http") or href.startswith("/"):
                        full_url = href if href.startswith("http") else MIIT_QUERY_BASE + href
                        cells = row.find_all("td")
                        cell_texts = [c.get_text(strip=True) for c in cells]
                        entry = {
                            "detail_url": full_url,
                            "cells": cell_texts,
                        }
                        # Avoid duplicates
                        if not any(r["detail_url"] == full_url for r in results):
                            results.append(entry)

        return results

    # ------------------------------------------------------------------
    # Schema mapping
    # ------------------------------------------------------------------

    def _map_to_schema(self, raw_data: dict, images: list[str], batch_number: int) -> dict:
        """Map raw MIIT data to our vehicle schema.

        Handles:
        - Dimension parsing: "L×W×H" -> length, width, height
        - Weight unit conversion if needed
        - Displacement ml -> liters
        - Generate UUID for id
        - Set data_source = "miit_query"
        - Set batch metadata
        """
        vehicle: dict = {
            "id": str(uuid.uuid4()),
            "data_source": "miit_query",
            "crawled_at": datetime.now(tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "announcement_batch": f"第{batch_number}批",
            "images": images,
        }

        # Map straightforward fields
        for cn_key, schema_key in FIELD_MAPPING.items():
            value = raw_data.get(cn_key, "")
            if not value:
                continue

            if schema_key in INT_FIELDS:
                parsed = self._safe_int(value)
                if parsed is not None:
                    vehicle[schema_key] = parsed
            elif schema_key in FLOAT_FIELDS:
                parsed = self._safe_float(value)
                if parsed is not None:
                    # Convert displacement from ml to liters
                    if schema_key == "displacement" and parsed > 100:
                        parsed = round(parsed / 1000.0, 1)
                    vehicle[schema_key] = parsed
            else:
                vehicle[schema_key] = value.strip()

        # Parse overall dimensions: "外形尺寸(mm)" -> length, width, height
        outer_dims = raw_data.get("外形尺寸(mm)", "")
        if outer_dims:
            length, width, height = self._parse_dimensions(outer_dims)
            if length:
                vehicle["length"] = length
            if width:
                vehicle["width"] = width
            if height:
                vehicle["height"] = height

        # Parse cargo dimensions: "货厢尺寸(mm)" -> cargo_length, cargo_width, cargo_height
        cargo_dims = raw_data.get("货厢尺寸(mm)", "")
        if cargo_dims:
            cl, cw, ch = self._parse_dimensions(cargo_dims)
            if cl:
                vehicle["cargo_length"] = cl
            if cw:
                vehicle["cargo_width"] = cw
            if ch:
                vehicle["cargo_height"] = ch
            if cl and cw and ch:
                vehicle["cargo_volume"] = round(cl * cw * ch / 1e9, 1)

        # Parse wheelbase (may be multi-value like "3300+1300")
        wb_raw = raw_data.get("轴距(mm)", "")
        if wb_raw:
            # Take first number for the primary wheelbase
            wb_int = self._safe_int(wb_raw)
            if wb_int:
                vehicle["wheelbase"] = wb_int
            # Store full string if multi-value
            if "+" in wb_raw or "," in wb_raw:
                vehicle["wheelbase_full"] = wb_raw.strip()

        # Parse front/rear overhang
        overhang = raw_data.get("前悬/后悬(mm)", "")
        if overhang:
            parts = re.split(r'[/,，\s]+', overhang)
            if len(parts) >= 2:
                fv = self._safe_int(parts[0])
                rv = self._safe_int(parts[1])
                if fv:
                    vehicle["front_overhang"] = fv
                if rv:
                    vehicle["rear_overhang"] = rv

        # Parse approach/departure angle
        angle = raw_data.get("接近角/离去角(°)", "")
        if angle:
            parts = re.split(r'[/,，\s]+', angle)
            if len(parts) >= 2:
                vehicle["approach_angle"] = parts[0].strip()
                vehicle["departure_angle"] = parts[1].strip()

        # Derive drive type from axle_count if not already set
        axle_count = vehicle.get("axle_count")
        if axle_count and "drive_type" not in vehicle:
            # We can't determine drive type from MIIT data alone;
            # leave it unset rather than guess.
            pass

        # Compute payload if we have gvw and curb_weight but no rated_payload
        gvw = vehicle.get("gvw")
        curb = vehicle.get("curb_weight")
        if gvw and curb and "rated_payload" not in vehicle:
            vehicle["rated_payload"] = gvw - curb

        # Set timestamps
        now_str = datetime.now(tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        vehicle["created_at"] = now_str
        vehicle["updated_at"] = now_str

        # Preserve any raw fields not in our mapping for reference
        mapped_cn_keys = set(FIELD_MAPPING.keys()) | {"外形尺寸(mm)", "货厢尺寸(mm)"}
        extra = {k: v for k, v in raw_data.items() if k not in mapped_cn_keys and v}
        if extra:
            vehicle["raw_extra_fields"] = extra

        return vehicle

    # ------------------------------------------------------------------
    # Core crawl methods
    # ------------------------------------------------------------------

    def crawl_model_detail(self, model_number: str) -> Optional[dict]:
        """Fetch complete details for a single vehicle model from query system.

        Args:
            model_number: Vehicle model number (e.g., "DFH3310A20")

        Returns:
            Raw data dict (Chinese keys) plus ``_images`` key, or None if failed.
        """
        self._polite_delay()

        # Step 1: search for model_number
        search_url = f"{MIIT_QUERY_BASE}{SEARCH_PATH}"
        logger.info("Searching MIIT for model: %s", model_number)
        resp = self._request_with_retry(
            search_url,
            method="POST",
            data={"cpxh": model_number},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        if resp is None:
            logger.error("Search request failed for model %s", model_number)
            return None

        # Step 2: find detail link in search results
        results = self._parse_search_results(resp.text)
        if not results:
            # Try GET-based search as fallback
            search_get_url = f"{search_url}?cpxh={model_number}"
            resp = self._request_with_retry(search_get_url)
            if resp is not None:
                results = self._parse_search_results(resp.text)

        if not results:
            logger.warning("No search results for model %s", model_number)
            return None

        # Pick the best matching result (prefer exact model match in link text)
        best = results[0]
        for r in results:
            link_text = r.get("link_text", "")
            cells = r.get("cells", [])
            all_text = link_text + " ".join(cells)
            if model_number in all_text:
                best = r
                break

        detail_url = best["detail_url"]
        logger.info("Fetching detail page: %s", detail_url)

        # Step 3: fetch detail page
        self._polite_delay()
        detail_resp = self._request_with_retry(detail_url)
        if detail_resp is None:
            logger.error("Detail page request failed for model %s", model_number)
            return None

        # Step 4: parse parameters
        raw_data = self._parse_detail_page(detail_resp.text)
        if not raw_data:
            logger.warning("Could not parse detail page for model %s", model_number)
            return None

        # Step 5: extract images
        images = self._parse_images(detail_resp.text)

        raw_data["_images"] = images
        raw_data["_detail_url"] = detail_url
        logger.info("Extracted %d fields and %d images for model %s",
                     len(raw_data) - 2, len(images), model_number)

        return raw_data

    def crawl_batch_models(
        self, model_numbers: list[str], batch_number: int
    ) -> list[dict]:
        """Crawl details for a list of model numbers (typically from one batch).

        Supports resume from last progress point.

        Args:
            model_numbers: List of model numbers to crawl
            batch_number: Batch number for metadata

        Returns:
            List of complete vehicle records mapped to our schema.
        """
        progress_path = self.data_dir / f"batch_{batch_number}_progress.json"
        results_path = self.data_dir / f"batch_{batch_number}_crawled.json"

        # Load progress for resume
        self.progress = CrawlProgress.load(progress_path)
        self.progress.total_models = len(model_numbers)

        # Load already-saved results for incremental append
        existing_results: list[dict] = []
        if results_path.exists():
            try:
                with open(results_path, "r", encoding="utf-8") as f:
                    existing_results = json.load(f)
            except (json.JSONDecodeError, IOError):
                existing_results = []

        completed_models = {v.get("model_number") for v in existing_results}

        vehicles: list[dict] = list(existing_results)

        for i, model_num in enumerate(model_numbers):
            # Skip already completed
            if model_num in completed_models:
                logger.debug("Skipping already-crawled model: %s", model_num)
                self.progress.skipped += 1
                continue

            logger.info(
                "[%d/%d] Crawling model: %s",
                i + 1, len(model_numbers), model_num,
            )

            raw_data = self.crawl_model_detail(model_num)

            if raw_data is None:
                self.progress.failed += 1
                self.progress.failed_models.append(model_num)
                self.progress.last_model = model_num
                self.progress.save(progress_path)
                continue

            images = raw_data.pop("_images", [])
            raw_data.pop("_detail_url", None)
            vehicle = self._map_to_schema(raw_data, images, batch_number)
            vehicles.append(vehicle)

            self.progress.completed += 1
            self.progress.last_model = model_num
            completed_models.add(model_num)

            # Save progress and results incrementally
            self.progress.save(progress_path)
            self._save_json(vehicles, results_path)

        logger.info(
            "Batch %d complete: %d succeeded, %d failed, %d skipped out of %d total",
            batch_number,
            self.progress.completed,
            self.progress.failed,
            self.progress.skipped,
            self.progress.total_models,
        )

        return vehicles

    def crawl_incremental(
        self, new_model_numbers: list[str], batch_number: int
    ) -> list[dict]:
        """Incremental crawl — only fetch models not already in our data.

        Checks existing crawled data across all batches to avoid re-crawling.

        Args:
            new_model_numbers: Candidate model numbers (e.g., parsed from new DOC).
            batch_number: Batch number for the new data.

        Returns:
            List of newly crawled vehicle records.
        """
        existing = self.load_existing_data()
        already_have = set(existing.keys())

        to_crawl = [m for m in new_model_numbers if m not in already_have]
        skipped = len(new_model_numbers) - len(to_crawl)

        logger.info(
            "Incremental crawl: %d new models to crawl, %d already in data",
            len(to_crawl), skipped,
        )

        if not to_crawl:
            logger.info("Nothing new to crawl")
            return []

        return self.crawl_batch_models(to_crawl, batch_number)

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------

    @staticmethod
    def _save_json(data: list | dict, path: Path):
        """Write data to JSON file atomically."""
        tmp_path = path.with_suffix(".tmp")
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        tmp_path.replace(path)

    def save_results(self, vehicles: list[dict], batch_number: int):
        """Save crawled results to JSON file."""
        output_path = self.data_dir / f"batch_{batch_number}_crawled.json"
        self._save_json(vehicles, output_path)
        logger.info("Saved %d vehicles to %s", len(vehicles), output_path)

    def load_existing_data(self) -> dict[str, dict]:
        """Load all previously crawled data, indexed by model_number."""
        index: dict[str, dict] = {}
        for json_file in sorted(self.data_dir.glob("batch_*_crawled.json")):
            try:
                with open(json_file, "r", encoding="utf-8") as f:
                    records = json.load(f)
                for rec in records:
                    mn = rec.get("model_number")
                    if mn:
                        index[mn] = rec
            except (json.JSONDecodeError, IOError) as exc:
                logger.warning("Could not read %s: %s", json_file, exc)
        logger.info("Loaded %d existing crawled records from %s", len(index), self.data_dir)
        return index


# ======================================================================
# CLI
# ======================================================================


def main():
    """CLI entry point."""
    import argparse

    parser = argparse.ArgumentParser(
        description="MIIT Vehicle Announcement Query System Crawler (工信部公告查询系统爬虫)",
    )
    parser.add_argument(
        "--models", nargs="+",
        help="Model numbers to crawl (space-separated)",
    )
    parser.add_argument(
        "--models-file",
        help="Path to a JSON file containing a list of model number strings",
    )
    parser.add_argument(
        "--batch", type=int, required=True,
        help="Batch number (e.g. 390)",
    )
    parser.add_argument(
        "--data-dir", default="backend/data/miit_crawled",
        help="Directory to store crawled data (default: backend/data/miit_crawled)",
    )
    parser.add_argument(
        "--delay", type=float, nargs=2, default=[3.0, 5.0],
        metavar=("MIN", "MAX"),
        help="Min and max delay in seconds between requests (default: 3.0 5.0)",
    )
    parser.add_argument(
        "--incremental", action="store_true",
        help="Only crawl models not already in existing data",
    )
    parser.add_argument(
        "--max-retries", type=int, default=3,
        help="Max retry attempts per request (default: 3)",
    )
    parser.add_argument(
        "--verbose", "-v", action="store_true",
        help="Enable debug logging",
    )
    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    # Collect model numbers
    model_numbers: list[str] = []
    if args.models:
        model_numbers.extend(args.models)
    if args.models_file:
        models_path = Path(args.models_file)
        if not models_path.exists():
            logger.error("Models file not found: %s", models_path)
            raise SystemExit(1)
        with open(models_path, "r", encoding="utf-8") as f:
            loaded = json.load(f)
            if isinstance(loaded, list):
                model_numbers.extend(str(m) for m in loaded)
            else:
                logger.error("Models file must contain a JSON array of strings")
                raise SystemExit(1)

    if not model_numbers:
        logger.error("No model numbers provided. Use --models or --models-file.")
        parser.print_help()
        raise SystemExit(1)

    # De-duplicate while preserving order
    seen: set[str] = set()
    unique_models: list[str] = []
    for m in model_numbers:
        if m not in seen:
            seen.add(m)
            unique_models.append(m)

    logger.info(
        "Starting MIIT crawl: %d unique models, batch %d, delay %.1f–%.1fs",
        len(unique_models), args.batch, args.delay[0], args.delay[1],
    )

    crawler = MIITCrawler(
        data_dir=args.data_dir,
        delay_range=tuple(args.delay),
        max_retries=args.max_retries,
    )

    if args.incremental:
        vehicles = crawler.crawl_incremental(unique_models, args.batch)
    else:
        vehicles = crawler.crawl_batch_models(unique_models, args.batch)

    logger.info("Done. %d vehicle records saved.", len(vehicles))

    # Print summary
    if vehicles:
        brands = {v.get("brand", "?") for v in vehicles}
        logger.info("Brands found: %s", ", ".join(sorted(brands)))


if __name__ == "__main__":
    main()
