#!/usr/bin/env python3
"""
MIIT Batch 405 Web Scraper
工信部第405批新产品公示 网页爬虫

Scrapes vehicle listings from the MIIT website's batch 405 announcement pages,
fetches detail pages for each vehicle, and saves structured data matching our
vehicle schema.
"""

import json
import logging
import re
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import requests
from bs4 import BeautifulSoup

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

BASE_URL = "https://www.miit.gov.cn"

# Listing API URL (batch 405 new products)
LISTING_API = (
    "https://www.miit.gov.cn/api-gateway/jpaas-publish-server/front/page/build/unit"
    "?parseType=buildstatic"
    "&webId=b3eba6883f9240e2b51025f690afbae8"
    "&tplSetId=9a9a7b87a4444169bdef99ff1f84e1aa"
    "&pageType=column"
    "&tagId=%E4%BF%A1%E6%81%AF%E5%88%97%E8%A1%A8"
    "&pageId=e4ab78c1e9c6454e8969ee6e7960b749"
)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.5",
    "Referer": "https://www.miit.gov.cn/datainfo/dljdclscqyjcpgg/xcpgs405dwe2rw/index.html",
}

OUTPUT_DIR = Path("/Users/spacelobster/Projects/spv-cloud/backend/data")
OUTPUT_FILE = OUTPUT_DIR / "batch_405_vehicles.json"

REQUEST_DELAY = 1.5  # seconds between requests

# ---------------------------------------------------------------------------
# MIIT field name -> our schema key mapping
# ---------------------------------------------------------------------------
FIELD_MAPPING = {
    "企业名称": "manufacturer",
    "产品商标": "brand",
    "产品型号": "model_number",
    "产品名称": "name",
    "总质量(kg)": "gvw",
    "总质量（kg）": "gvw",
    "整备质量(kg)": "curb_weight",
    "整备质量（kg）": "curb_weight",
    "额定载质量(kg)": "rated_payload",
    "额定载质量（kg）": "rated_payload",
    "准拖挂车总质量(kg)": "max_towing_weight",
    "准拖挂车总质量（kg）": "max_towing_weight",
    "底盘型号": "chassis_model",
    "底盘企业": "chassis_brand",
    "底盘ID": "chassis_id",
    "发动机型号": "engine_model",
    "发动机生产企业": "engine_brand",
    "排量(ml)": "displacement",
    "排量（ml）": "displacement",
    "功率(kW)": "power_kw",
    "功率（kW）": "power_kw",
    "排放标准": "emission_standard",
    "燃料种类": "fuel_type",
    "轴数": "axle_count",
    "轴距(mm)": "wheelbase",
    "轴距（mm）": "wheelbase",
    "轮胎数": "tire_count",
    "轮胎规格": "tire_spec",
    "转向形式": "steering_type",
    "最高车速(km/h)": "max_speed",
    "最高车速（km/h）": "max_speed",
    "驾驶室准乘人数": "cab_capacity",
    "弹簧片数": "spring_leaf_count",
    "钢板弹簧片数": "suspension_type",
    "前轮距": "front_track",
    "后轮距": "rear_track",
    "接近角/离去角(°)": "approach_departure_angle",
    "接近角/离去角（°）": "approach_departure_angle",
    "前悬/后悬(mm)": "front_rear_overhang",
    "前悬/后悬（mm）": "front_rear_overhang",
    "载质量利用系数": "payload_coefficient",
    "其它": "notes",
    "其他": "notes",
    "备注": "notes",
}

INT_FIELDS = {"gvw", "curb_weight", "rated_payload", "max_towing_weight",
              "axle_count", "tire_count", "max_speed", "cab_capacity"}
FLOAT_FIELDS = {"displacement", "power_kw", "payload_coefficient"}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def safe_int(value: str) -> Optional[int]:
    if not value:
        return None
    m = re.search(r'-?\d+', value.replace(',', '').replace(' ', ''))
    return int(m.group()) if m else None


def safe_float(value: str) -> Optional[float]:
    if not value:
        return None
    m = re.search(r'-?\d+\.?\d*', value.replace(',', '').replace(' ', ''))
    return float(m.group()) if m else None


def parse_dimensions(dim_str: str) -> tuple:
    """Parse 'L×W×H' dimension string."""
    if not dim_str or not dim_str.strip():
        return (None, None, None)
    normalized = re.sub(r'[×xX*/,，\s]+', '|', dim_str.strip())
    parts = [p.strip() for p in normalized.split('|') if p.strip()]
    if len(parts) < 3:
        return (None, None, None)
    try:
        values = []
        for p in parts[:3]:
            m = re.match(r'(\d+)', p)
            values.append(int(m.group(1)) if m else None)
        return tuple(values)
    except (ValueError, IndexError):
        return (None, None, None)


class MIITWebScraper:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update(HEADERS)
        self.vehicles = []

    def _get(self, url: str, **kwargs) -> Optional[requests.Response]:
        """Make GET request with retries."""
        for attempt in range(3):
            try:
                resp = self.session.get(url, timeout=30, **kwargs)
                if resp.status_code == 200:
                    return resp
                logger.warning("HTTP %d for %s (attempt %d)", resp.status_code, url, attempt + 1)
                if resp.status_code >= 400 and resp.status_code != 429:
                    return None
            except requests.RequestException as e:
                logger.warning("Request error for %s (attempt %d): %s", url, attempt + 1, e)
            time.sleep(2 ** attempt)
        return None

    def fetch_listing_page(self, page_no: int = 1) -> Optional[dict]:
        """Fetch one page of the listing API."""
        url = f"{LISTING_API}&pageNo={page_no}"
        logger.info("Fetching listing page %d ...", page_no)
        resp = self._get(url)
        if resp is None:
            return None
        try:
            return resp.json()
        except Exception as e:
            logger.error("Failed to parse JSON from listing page %d: %s", page_no, e)
            return None

    def parse_listing_html(self, html: str) -> list[dict]:
        """Parse the HTML from the listing API response to extract vehicle entries."""
        soup = BeautifulSoup(html, "html.parser")
        entries = []

        # Find all links to detail pages
        # Pattern: /datainfo/dljdclscqyjcpgg/xcpgs405dwe2rw/art/2026/art_XXXXX.html
        links = soup.find_all("a", href=re.compile(r'/art/\d{4}/art_\w+\.html'))

        # Links come in groups of 5 per vehicle:
        # vehicle_type, manufacturer, brand, vehicle_type_again, model_number
        # But let's be more robust: group by unique detail URL
        seen_urls = {}
        for link in links:
            href = link.get("href", "")
            text = link.get_text(strip=True)
            if href not in seen_urls:
                seen_urls[href] = []
            seen_urls[href].append(text)

        for href, texts in seen_urls.items():
            detail_url = BASE_URL + href if href.startswith("/") else href
            entry = {
                "detail_url": detail_url,
                "link_texts": texts,
            }
            # Try to extract info from the link texts
            if len(texts) >= 5:
                entry["vehicle_type"] = texts[0]
                entry["manufacturer"] = texts[1]
                entry["brand"] = texts[2]
                entry["model_number"] = texts[4]
            elif len(texts) >= 1:
                entry["model_number"] = texts[-1]
            entries.append(entry)

        return entries

    def get_total_count(self, html: str) -> int:
        """Extract total record count from the pagination div."""
        soup = BeautifulSoup(html, "html.parser")
        # Look for count attribute in pagination div
        for div in soup.find_all(attrs={"count": True}):
            try:
                return int(div["count"])
            except (ValueError, TypeError):
                pass
        # Fallback: regex search
        m = re.search(r'count="(\d+)"', html)
        if m:
            return int(m.group(1))
        return 0

    def fetch_detail_page(self, url: str) -> Optional[str]:
        """Fetch a vehicle detail page."""
        resp = self._get(url)
        if resp is None:
            return None
        return resp.text

    def parse_detail_page(self, html: str) -> dict:
        """Extract vehicle parameters from a detail page.

        The detail page may contain data in:
        - HTML tables with label/value pairs
        - Embedded JSON data in script tags
        - Data attributes on elements
        """
        soup = BeautifulSoup(html, "html.parser")
        raw = {}

        # Strategy 1: Table rows with label/value pairs
        for table in soup.find_all("table"):
            rows = table.find_all("tr")
            for row in rows:
                cells = row.find_all(["td", "th"])
                i = 0
                while i < len(cells) - 1:
                    label = cells[i].get_text(strip=True)
                    value = cells[i + 1].get_text(strip=True)
                    if label:
                        label_clean = re.sub(r'[:\s：]+$', '', label)
                        if label_clean and value:
                            raw[label_clean] = value
                    i += 2

        # Strategy 2: DL/DT/DD pairs
        for dl in soup.find_all("dl"):
            dts = dl.find_all("dt")
            dds = dl.find_all("dd")
            for dt, dd in zip(dts, dds):
                label = re.sub(r'[:\s：]+$', '', dt.get_text(strip=True))
                value = dd.get_text(strip=True)
                if label and value:
                    raw[label] = value

        # Strategy 3: div.info or similar structures
        for div in soup.find_all("div", class_=re.compile(r'info|param|spec|detail', re.I)):
            for child in div.find_all(["span", "label", "p", "div"]):
                text = child.get_text(strip=True)
                if "：" in text:
                    parts = text.split("：", 1)
                    if len(parts) == 2 and parts[0].strip() and parts[1].strip():
                        raw[parts[0].strip()] = parts[1].strip()
                elif ":" in text:
                    parts = text.split(":", 1)
                    if len(parts) == 2 and parts[0].strip() and parts[1].strip():
                        raw[parts[0].strip()] = parts[1].strip()

        # Strategy 4: Look for embedded JSON in script tags
        for script in soup.find_all("script"):
            script_text = script.string or ""
            # Look for JSON objects with vehicle data
            json_matches = re.findall(r'\{[^{}]*"企业名称"[^{}]*\}', script_text)
            for jm in json_matches:
                try:
                    data = json.loads(jm)
                    raw.update(data)
                except json.JSONDecodeError:
                    pass
            # Look for variable assignments with data
            var_matches = re.findall(r'(?:var|let|const)\s+\w+\s*=\s*(\{[^;]+\})', script_text)
            for vm in var_matches:
                try:
                    data = json.loads(vm)
                    if isinstance(data, dict):
                        raw.update(data)
                except json.JSONDecodeError:
                    pass

        # Strategy 5: Extract all text content and parse structured lines
        content_div = soup.find("div", class_=re.compile(r'content|article|detail|main', re.I))
        if content_div:
            for line in content_div.stripped_strings:
                for sep in ["：", ":"]:
                    if sep in line:
                        parts = line.split(sep, 1)
                        key = parts[0].strip()
                        val = parts[1].strip()
                        if key and val and len(key) < 30:
                            raw.setdefault(key, val)
                        break

        # Extract images
        images = []
        for img in soup.find_all("img"):
            src = img.get("src") or img.get("data-src") or ""
            if src and not any(x in src.lower() for x in ["logo", "icon", "pixel", "spacer"]):
                if src.startswith("/"):
                    src = BASE_URL + src
                elif not src.startswith("http"):
                    src = BASE_URL + "/" + src
                images.append(src)

        raw["_images"] = images
        return raw

    def map_to_schema(self, raw: dict, listing_entry: dict) -> dict:
        """Map raw data to our vehicle schema."""
        now_str = datetime.now(tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

        vehicle = {
            "id": str(uuid.uuid4()),
            "data_source": "miit_web",
            "announcement_batch": "第405批",
            "announcement_date": None,
            "created_at": now_str,
            "updated_at": now_str,
            "images": raw.pop("_images", []),
            "description": "",
            # Default values for required fields
            "name": "",
            "brand": "",
            "manufacturer": "",
            "model_number": "",
            "vehicle_type": "",
            "vehicle_category": "",
            "purpose": "",
            "tonnage_class": "",
            "chassis_brand": "",
            "chassis_model": "",
            "drive_type": "",
            "tire_spec": "",
            "suspension_type": "",
            "engine_brand": "",
            "engine_model": "",
            "emission_standard": "",
            "fuel_type": "",
            "certificate_number": "",
            "is_tax_exempt": False,
            "is_fuel_exempt": False,
            "is_environmental": False,
        }

        # Apply listing data first (fallback)
        if listing_entry.get("vehicle_type"):
            vehicle["vehicle_type"] = listing_entry["vehicle_type"]
        if listing_entry.get("manufacturer"):
            vehicle["manufacturer"] = listing_entry["manufacturer"]
        if listing_entry.get("brand"):
            vehicle["brand"] = listing_entry["brand"]
        if listing_entry.get("model_number"):
            vehicle["model_number"] = listing_entry["model_number"]

        # Map MIIT fields
        for cn_key, schema_key in FIELD_MAPPING.items():
            value = raw.get(cn_key, "")
            if not value:
                continue
            if schema_key in INT_FIELDS:
                parsed = safe_int(value)
                if parsed is not None:
                    vehicle[schema_key] = parsed
            elif schema_key in FLOAT_FIELDS:
                parsed = safe_float(value)
                if parsed is not None:
                    if schema_key == "displacement" and parsed > 100:
                        parsed = round(parsed / 1000.0, 1)
                    vehicle[schema_key] = parsed
            else:
                vehicle[schema_key] = value.strip()

        # Parse overall dimensions
        for dim_key in ["外形尺寸(mm)", "外形尺寸（mm）", "外形尺寸"]:
            dim_str = raw.get(dim_key, "")
            if dim_str:
                l, w, h = parse_dimensions(dim_str)
                if l:
                    vehicle["length"] = l
                if w:
                    vehicle["width"] = w
                if h:
                    vehicle["height"] = h
                break

        # Parse cargo dimensions
        for dim_key in ["货厢尺寸(mm)", "货厢尺寸（mm）", "货厢尺寸"]:
            dim_str = raw.get(dim_key, "")
            if dim_str:
                cl, cw, ch = parse_dimensions(dim_str)
                if cl:
                    vehicle["cargo_length"] = cl
                if cw:
                    vehicle["cargo_width"] = cw
                if ch:
                    vehicle["cargo_height"] = ch
                if cl and cw and ch:
                    vehicle["cargo_volume"] = round(cl * cw * ch / 1e9, 1)
                break

        # Compute payload
        gvw = vehicle.get("gvw")
        curb = vehicle.get("curb_weight")
        if gvw and curb and not vehicle.get("payload"):
            vehicle["payload"] = gvw - curb

        # Generate name if missing
        if not vehicle["name"] and vehicle["brand"] and vehicle["model_number"]:
            vtype = vehicle.get("vehicle_type", "")
            vehicle["name"] = f"{vehicle['brand']}{vehicle['model_number']}{vtype}"

        # Store extra raw fields for reference
        mapped_keys = set(FIELD_MAPPING.keys()) | {
            "外形尺寸(mm)", "外形尺寸（mm）", "外形尺寸",
            "货厢尺寸(mm)", "货厢尺寸（mm）", "货厢尺寸",
        }
        extra = {k: v for k, v in raw.items() if k not in mapped_keys and k != "_images" and v}
        if extra:
            vehicle["backup_params"] = extra

        return vehicle

    def scrape_all(self) -> list[dict]:
        """Main scrape loop: get all listings, then fetch each detail page."""
        # Step 1: Get first page to determine total count
        data = self.fetch_listing_page(1)
        if not data:
            logger.error("Failed to fetch first listing page")
            return []

        html = data.get("html", "")
        if not html:
            # Try other possible response structures
            for key in ["data", "content", "result"]:
                if key in data and isinstance(data[key], str):
                    html = data[key]
                    break
            if not html:
                # Maybe the whole response is a string
                logger.warning("No 'html' field in response. Keys: %s", list(data.keys()))
                # Try to use the raw response
                html = json.dumps(data) if isinstance(data, dict) else str(data)

        total_count = self.get_total_count(html)
        entries_page1 = self.parse_listing_html(html)

        logger.info("Total records: %d, entries on page 1: %d", total_count, len(entries_page1))

        all_entries = list(entries_page1)

        # Step 2: Calculate total pages and fetch remaining
        if entries_page1:
            per_page = len(entries_page1)
            if total_count > 0 and per_page > 0:
                total_pages = (total_count + per_page - 1) // per_page
            else:
                total_pages = 1
        else:
            # If no entries on page 1, try different page sizes or give up
            per_page = 15  # common default
            total_pages = (total_count + per_page - 1) // per_page if total_count else 1

        logger.info("Estimated %d pages (per_page=%d, total=%d)", total_pages, per_page, total_count)

        for page_no in range(2, total_pages + 1):
            time.sleep(REQUEST_DELAY)
            data = self.fetch_listing_page(page_no)
            if not data:
                logger.warning("Failed to fetch page %d, continuing...", page_no)
                continue

            html = data.get("html", "")
            if not html:
                for key in ["data", "content", "result"]:
                    if key in data and isinstance(data[key], str):
                        html = data[key]
                        break

            entries = self.parse_listing_html(html)
            logger.info("Page %d/%d: %d entries", page_no, total_pages, len(entries))
            all_entries.extend(entries)

            if not entries:
                logger.info("Empty page %d — stopping pagination", page_no)
                break

        logger.info("Total listing entries collected: %d", len(all_entries))

        # Deduplicate by detail URL
        seen = set()
        unique_entries = []
        for entry in all_entries:
            url = entry.get("detail_url", "")
            if url and url not in seen:
                seen.add(url)
                unique_entries.append(entry)
        logger.info("Unique entries after dedup: %d", len(unique_entries))

        # Step 3: Fetch each detail page
        vehicles = []
        failed = 0
        for i, entry in enumerate(unique_entries):
            detail_url = entry.get("detail_url", "")
            if not detail_url:
                continue

            logger.info("[%d/%d] Fetching detail: %s", i + 1, len(unique_entries),
                        detail_url.split("/")[-1])
            time.sleep(REQUEST_DELAY)

            detail_html = self.fetch_detail_page(detail_url)
            if not detail_html:
                logger.warning("Failed to fetch detail page: %s", detail_url)
                failed += 1
                # Still create a record from listing data
                vehicle = self.map_to_schema({}, entry)
                vehicle["detail_url"] = detail_url
                vehicles.append(vehicle)
                continue

            raw = self.parse_detail_page(detail_html)
            vehicle = self.map_to_schema(raw, entry)
            vehicle["detail_url"] = detail_url
            vehicles.append(vehicle)

            # Save progress every 50 records
            if (i + 1) % 50 == 0:
                self._save_progress(vehicles)
                logger.info("Progress saved: %d/%d records", len(vehicles), len(unique_entries))

        logger.info("Scraping complete: %d vehicles scraped, %d detail page failures",
                     len(vehicles), failed)

        return vehicles

    def _save_progress(self, vehicles: list[dict]):
        """Save intermediate progress."""
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        progress_file = OUTPUT_DIR / "batch_405_vehicles_progress.json"
        with open(progress_file, "w", encoding="utf-8") as f:
            json.dump(vehicles, f, ensure_ascii=False, indent=2)

    def save(self, vehicles: list[dict]):
        """Save final results."""
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(vehicles, f, ensure_ascii=False, indent=2)
        logger.info("Saved %d vehicles to %s", len(vehicles), OUTPUT_FILE)


def main():
    scraper = MIITWebScraper()
    vehicles = scraper.scrape_all()
    if vehicles:
        scraper.save(vehicles)
        # Print summary
        brands = {}
        for v in vehicles:
            b = v.get("brand", "未知")
            brands[b] = brands.get(b, 0) + 1
        logger.info("=== SUMMARY ===")
        logger.info("Total vehicles: %d", len(vehicles))
        logger.info("Top brands:")
        for brand, count in sorted(brands.items(), key=lambda x: -x[1])[:15]:
            logger.info("  %s: %d", brand, count)
        # Count records with detail data
        with_details = sum(1 for v in vehicles if v.get("gvw") or v.get("length"))
        logger.info("Records with parsed detail data: %d", with_details)
    else:
        logger.error("No vehicles scraped!")


if __name__ == "__main__":
    main()
