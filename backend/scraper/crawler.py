#!/usr/bin/env python3
"""
Vehicle data crawler for cn-truck.com with comprehensive mock data fallback.

Usage:
    python crawler.py              # Try scraping, fallback to mock
    python crawler.py --mock-only  # Generate mock data directly
    python crawler.py --scrape     # Try scraping only
"""

import json
import uuid
import random
import math
import os
import sys
import time
import logging
from datetime import datetime, timedelta
from typing import Optional

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants / reference tables
# ---------------------------------------------------------------------------

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")
OUTPUT_FILE = os.path.join(DATA_DIR, "vehicles.json")

BRANDS = {
    "东风": {"manufacturer": "东风汽车集团有限公司", "chassis_prefix": "DFH", "engines": ["东风康明斯", "玉柴"]},
    "解放": {"manufacturer": "一汽解放汽车有限公司", "chassis_prefix": "CA", "engines": ["锡柴", "大柴"]},
    "中国重汽": {"manufacturer": "中国重型汽车集团有限公司", "chassis_prefix": "ZZ", "engines": ["重汽MC", "重汽MT"]},
    "福田": {"manufacturer": "北汽福田汽车股份有限公司", "chassis_prefix": "BJ", "engines": ["福田康明斯", "玉柴"]},
    "陕汽": {"manufacturer": "陕西汽车控股集团有限公司", "chassis_prefix": "SX", "engines": ["潍柴", "康明斯"]},
    "江淮": {"manufacturer": "安徽江淮汽车集团股份有限公司", "chassis_prefix": "HFC", "engines": ["江淮纳威司达", "玉柴"]},
    "北奔": {"manufacturer": "包头北奔重型汽车有限公司", "chassis_prefix": "ND", "engines": ["潍柴", "玉柴"]},
    "大运": {"manufacturer": "大运汽车股份有限公司", "chassis_prefix": "CGC", "engines": ["潍柴", "玉柴"]},
    "徐工": {"manufacturer": "徐工集团工程机械有限公司", "chassis_prefix": "XZJ", "engines": ["潍柴", "玉柴"]},
    "三一": {"manufacturer": "三一重工股份有限公司", "chassis_prefix": "SYM", "engines": ["潍柴", "康明斯"]},
    "柳工": {"manufacturer": "广西柳工机械股份有限公司", "chassis_prefix": "CLG", "engines": ["玉柴", "潍柴"]},
    "华菱": {"manufacturer": "华菱星马汽车(集团)股份有限公司", "chassis_prefix": "HN", "engines": ["汉马动力", "玉柴"]},
}

# Vehicle type definitions with realistic parameter ranges
VEHICLE_TYPES = {
    "自卸车": {
        "category": "专用车",
        "purpose": "自卸运输",
        "tonnage_class": "重型",
        "drive_types": ["6×4", "8×4"],
        "gvw_range": (25000, 31000),
        "payload_ratio": (0.55, 0.65),
        "dims": {"length": (7500, 10500), "width": (2490, 2550), "height": (3200, 3600)},
        "cargo_dims": {"length": (5200, 7000), "width": (2300, 2400), "height": (1200, 1600)},
        "wheelbase": (3600, 5200),
        "power_range": (260, 460),
        "displacement_range": (7.7, 12.9),
        "cylinders": [6],
        "tire_specs": ["12.00R20", "12R22.5", "315/80R22.5"],
        "fuel_consumption": (28, 42),
        "weight_count": 40,
    },
    "搅拌车": {
        "category": "专用车",
        "purpose": "混凝土搅拌运输",
        "tonnage_class": "重型",
        "drive_types": ["6×4", "8×4"],
        "gvw_range": (25000, 31000),
        "payload_ratio": (0.50, 0.60),
        "dims": {"length": (8500, 11500), "width": (2490, 2550), "height": (3700, 3990)},
        "cargo_dims": {"length": (4000, 5500), "width": (2300, 2400), "height": (2400, 2800)},
        "wheelbase": (3600, 5500),
        "power_range": (290, 460),
        "displacement_range": (9.7, 12.9),
        "cylinders": [6],
        "tire_specs": ["12.00R20", "12R22.5"],
        "fuel_consumption": (32, 48),
        "weight_count": 35,
    },
    "泵车": {
        "category": "专用车",
        "purpose": "混凝土泵送",
        "tonnage_class": "重型",
        "drive_types": ["6×4", "8×4"],
        "gvw_range": (25000, 40000),
        "payload_ratio": (0.35, 0.45),
        "dims": {"length": (11000, 14000), "width": (2490, 2550), "height": (3800, 3990)},
        "cargo_dims": {"length": (6000, 8000), "width": (2300, 2400), "height": (2500, 3000)},
        "wheelbase": (4500, 6500),
        "power_range": (350, 480),
        "displacement_range": (11.0, 12.9),
        "cylinders": [6],
        "tire_specs": ["12.00R20", "315/80R22.5"],
        "fuel_consumption": (35, 55),
        "weight_count": 20,
    },
    "随车吊": {
        "category": "专用车",
        "purpose": "随车起重运输",
        "tonnage_class": "重型",
        "drive_types": ["6×2", "6×4", "8×4"],
        "gvw_range": (18000, 31000),
        "payload_ratio": (0.40, 0.55),
        "dims": {"length": (8000, 12000), "width": (2490, 2550), "height": (3200, 3600)},
        "cargo_dims": {"length": (5000, 7500), "width": (2300, 2400), "height": (600, 1000)},
        "wheelbase": (4200, 6000),
        "power_range": (220, 380),
        "displacement_range": (6.7, 11.0),
        "cylinders": [6],
        "tire_specs": ["10.00R20", "12.00R20", "295/80R22.5"],
        "fuel_consumption": (22, 38),
        "weight_count": 30,
    },
    "冷藏车": {
        "category": "专用车",
        "purpose": "冷藏保温运输",
        "tonnage_class": "中型",
        "drive_types": ["4×2", "6×2"],
        "gvw_range": (8000, 18000),
        "payload_ratio": (0.45, 0.60),
        "dims": {"length": (6800, 9600), "width": (2400, 2550), "height": (3200, 3800)},
        "cargo_dims": {"length": (4200, 6800), "width": (2200, 2400), "height": (2000, 2500)},
        "wheelbase": (3800, 5600),
        "power_range": (150, 270),
        "displacement_range": (4.2, 7.7),
        "cylinders": [4, 6],
        "tire_specs": ["8.25R20", "10.00R20", "275/70R22.5"],
        "fuel_consumption": (16, 28),
        "weight_count": 35,
    },
    "油罐车": {
        "category": "专用车",
        "purpose": "液态危险品运输",
        "tonnage_class": "重型",
        "drive_types": ["6×2", "6×4"],
        "gvw_range": (16000, 25000),
        "payload_ratio": (0.50, 0.65),
        "dims": {"length": (8000, 11000), "width": (2490, 2550), "height": (3200, 3600)},
        "cargo_dims": {"length": (5000, 7500), "width": (2200, 2400), "height": (1500, 2000)},
        "wheelbase": (4200, 5800),
        "power_range": (200, 350),
        "displacement_range": (6.2, 9.7),
        "cylinders": [6],
        "tire_specs": ["10.00R20", "12.00R20", "295/80R22.5"],
        "fuel_consumption": (20, 35),
        "weight_count": 30,
    },
    "洒水车": {
        "category": "专用车",
        "purpose": "道路洒水作业",
        "tonnage_class": "中型",
        "drive_types": ["4×2", "6×2"],
        "gvw_range": (8000, 16000),
        "payload_ratio": (0.50, 0.65),
        "dims": {"length": (6500, 8500), "width": (2300, 2500), "height": (2800, 3200)},
        "cargo_dims": {"length": (3800, 5500), "width": (2000, 2300), "height": (1400, 1800)},
        "wheelbase": (3300, 4800),
        "power_range": (130, 220),
        "displacement_range": (3.8, 6.7),
        "cylinders": [4, 6],
        "tire_specs": ["8.25R20", "10.00R20", "275/70R22.5"],
        "fuel_consumption": (15, 25),
        "weight_count": 30,
    },
    "垃圾车": {
        "category": "专用车",
        "purpose": "垃圾收集转运",
        "tonnage_class": "中型",
        "drive_types": ["4×2", "6×2"],
        "gvw_range": (8000, 18000),
        "payload_ratio": (0.45, 0.60),
        "dims": {"length": (6500, 9500), "width": (2300, 2500), "height": (2800, 3400)},
        "cargo_dims": {"length": (3800, 6000), "width": (2000, 2300), "height": (1400, 2000)},
        "wheelbase": (3300, 5200),
        "power_range": (130, 240),
        "displacement_range": (3.8, 7.7),
        "cylinders": [4, 6],
        "tire_specs": ["8.25R20", "10.00R20", "275/70R22.5"],
        "fuel_consumption": (16, 28),
        "weight_count": 25,
    },
    "消防车": {
        "category": "专用车",
        "purpose": "消防灭火救援",
        "tonnage_class": "重型",
        "drive_types": ["4×2", "6×4"],
        "gvw_range": (16000, 30000),
        "payload_ratio": (0.40, 0.55),
        "dims": {"length": (7500, 11000), "width": (2490, 2550), "height": (3200, 3600)},
        "cargo_dims": {"length": (4500, 7000), "width": (2200, 2400), "height": (1800, 2400)},
        "wheelbase": (4000, 5800),
        "power_range": (220, 400),
        "displacement_range": (6.7, 11.0),
        "cylinders": [6],
        "tire_specs": ["10.00R20", "12.00R20", "295/80R22.5"],
        "fuel_consumption": (22, 38),
        "weight_count": 15,
    },
    "清障车": {
        "category": "专用车",
        "purpose": "道路清障救援",
        "tonnage_class": "重型",
        "drive_types": ["6×4", "8×4"],
        "gvw_range": (20000, 35000),
        "payload_ratio": (0.35, 0.50),
        "dims": {"length": (9000, 13000), "width": (2490, 2550), "height": (3200, 3600)},
        "cargo_dims": {"length": (6000, 8500), "width": (2300, 2400), "height": (800, 1200)},
        "wheelbase": (4500, 6500),
        "power_range": (280, 440),
        "displacement_range": (8.6, 12.9),
        "cylinders": [6],
        "tire_specs": ["12.00R20", "315/80R22.5"],
        "fuel_consumption": (28, 45),
        "weight_count": 15,
    },
    "压缩垃圾车": {
        "category": "专用车",
        "purpose": "垃圾压缩转运",
        "tonnage_class": "中型",
        "drive_types": ["4×2", "6×2"],
        "gvw_range": (10000, 18000),
        "payload_ratio": (0.45, 0.58),
        "dims": {"length": (7000, 9500), "width": (2300, 2500), "height": (2800, 3400)},
        "cargo_dims": {"length": (4000, 6000), "width": (2000, 2300), "height": (1500, 2200)},
        "wheelbase": (3600, 5200),
        "power_range": (150, 240),
        "displacement_range": (4.2, 7.7),
        "cylinders": [4, 6],
        "tire_specs": ["8.25R20", "10.00R20", "275/70R22.5"],
        "fuel_consumption": (16, 28),
        "weight_count": 20,
    },
    "高空作业车": {
        "category": "专用车",
        "purpose": "高空维修作业",
        "tonnage_class": "中型",
        "drive_types": ["4×2", "6×2"],
        "gvw_range": (8000, 18000),
        "payload_ratio": (0.30, 0.45),
        "dims": {"length": (7000, 10000), "width": (2300, 2500), "height": (3200, 3600)},
        "cargo_dims": {"length": (4000, 6000), "width": (2000, 2300), "height": (1000, 1600)},
        "wheelbase": (3600, 5200),
        "power_range": (130, 220),
        "displacement_range": (3.8, 6.7),
        "cylinders": [4, 6],
        "tire_specs": ["8.25R20", "10.00R20", "275/70R22.5"],
        "fuel_consumption": (14, 26),
        "weight_count": 15,
    },
}

EMISSION_STANDARDS = ["国五", "国六", "国六b"]
EMISSION_WEIGHTS = [0.15, 0.50, 0.35]

FUEL_TYPES = ["柴油", "天然气", "电动", "混合动力"]
FUEL_WEIGHTS = [0.75, 0.12, 0.08, 0.05]

SUSPENSION_TYPES = ["钢板弹簧", "空气悬架", "橡胶悬架", "少片簧"]
SUSPENSION_WEIGHTS = [0.55, 0.25, 0.10, 0.10]

ENGINE_MODELS = {
    "东风康明斯": [
        ("ISB6.7E6", 6.7, 180, 243, 850, 6),
        ("ISB6.7E6", 6.7, 210, 284, 950, 6),
        ("ISL9.5E6", 9.5, 290, 392, 1350, 6),
        ("ISL9.5E6", 9.5, 330, 447, 1500, 6),
        ("ISZ13E6", 13.0, 400, 541, 2000, 6),
        ("ISZ13E6", 13.0, 460, 623, 2300, 6),
    ],
    "玉柴": [
        ("YC4S150-68", 3.8, 110, 150, 550, 4),
        ("YC4EG200-60", 4.7, 147, 200, 680, 4),
        ("YC6J220-62", 6.5, 162, 220, 850, 6),
        ("YC6J260-62", 6.5, 191, 260, 1000, 6),
        ("YC6K340-60", 8.4, 250, 340, 1400, 6),
        ("YC6K380-60", 8.4, 280, 380, 1600, 6),
        ("YC6MK420-60", 10.3, 309, 420, 1900, 6),
        ("YC6MK460-60", 10.3, 338, 460, 2100, 6),
    ],
    "锡柴": [
        ("CA4DL1-18E6", 6.6, 132, 180, 780, 6),
        ("CA6DL2-26E6", 7.7, 191, 260, 1050, 6),
        ("CA6DL2-30E6", 7.7, 221, 300, 1200, 6),
        ("CA6DM3-35E6", 11.0, 257, 350, 1600, 6),
        ("CA6DM3-42E6", 11.0, 309, 420, 1900, 6),
        ("CA6DM3-46E6", 11.0, 338, 460, 2100, 6),
    ],
    "大柴": [
        ("CA4DC2-14E6", 3.8, 103, 140, 520, 4),
        ("CA4DLD-18E6", 6.6, 132, 180, 780, 6),
        ("CA6DL2-22E6", 7.7, 162, 220, 950, 6),
    ],
    "潍柴": [
        ("WP4.1N", 4.1, 120, 163, 600, 4),
        ("WP6.245E61", 6.9, 180, 245, 1000, 6),
        ("WP7.270E61", 7.5, 199, 270, 1100, 6),
        ("WP10.336E63", 9.7, 247, 336, 1460, 6),
        ("WP10.375E62", 9.7, 276, 375, 1600, 6),
        ("WP12.430E62", 11.6, 316, 430, 2000, 6),
        ("WP12.460E61", 11.6, 338, 460, 2100, 6),
        ("WP13.480E61", 12.9, 353, 480, 2300, 6),
    ],
    "康明斯": [
        ("ISB4.5E6", 4.5, 130, 177, 650, 4),
        ("ISB6.7E6", 6.7, 195, 265, 900, 6),
        ("ISL8.9E6", 8.9, 265, 360, 1350, 6),
        ("ISL8.9E6", 8.9, 310, 420, 1600, 6),
    ],
    "福田康明斯": [
        ("ISF3.8E6", 3.8, 115, 156, 570, 4),
        ("ISF3.8E6", 3.8, 130, 177, 620, 4),
        ("ISG12E6", 11.8, 316, 430, 2000, 6),
        ("ISG12E6", 11.8, 338, 460, 2100, 6),
    ],
    "江淮纳威司达": [
        ("HFC4DE1-1D", 4.8, 120, 163, 600, 4),
        ("HFC4DE1-2D", 4.8, 140, 190, 700, 4),
        ("HFC7DE1-1D", 6.5, 175, 238, 900, 6),
    ],
    "重汽MC": [
        ("MC07.33-60", 7.8, 243, 330, 1350, 6),
        ("MC11.39-60", 10.5, 287, 390, 1750, 6),
        ("MC11.44-60", 10.5, 324, 440, 2000, 6),
        ("MC13.48-60", 12.4, 353, 480, 2300, 6),
    ],
    "重汽MT": [
        ("MT07.24-60", 7.0, 177, 240, 1000, 6),
        ("MT13.46-60", 12.4, 338, 460, 2100, 6),
    ],
    "汉马动力": [
        ("CM6D18.340-60", 7.8, 250, 340, 1400, 6),
        ("CM6D28.400-60", 11.8, 294, 400, 1900, 6),
        ("CM6D28.460-60", 11.8, 338, 460, 2100, 6),
    ],
}


# ---------------------------------------------------------------------------
# Scraper (best-effort)
# ---------------------------------------------------------------------------


class VehicleScraper:
    """Attempt to scrape vehicle data from cn-truck.com."""

    BASE_URL = "https://www.cn-truck.com"
    LIST_URL = f"{BASE_URL}/pinpai/"

    def __init__(self):
        self.session = None

    def _init_session(self):
        try:
            import requests
            from fake_useragent import UserAgent

            self.session = requests.Session()
            try:
                ua = UserAgent(fallback="Mozilla/5.0")
                self.session.headers["User-Agent"] = ua.random
            except Exception:
                self.session.headers["User-Agent"] = (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/120.0.0.0 Safari/537.36"
                )
        except ImportError:
            logger.warning("requests / fake-useragent not installed — scraping unavailable")
            return False
        return True

    def scrape(self, max_pages: int = 10) -> list[dict]:
        """Try to scrape vehicle listings. Returns list of dicts or empty list on failure."""
        if not self._init_session():
            return []

        import requests
        from bs4 import BeautifulSoup

        vehicles = []
        try:
            for page in range(1, max_pages + 1):
                url = f"{self.LIST_URL}?page={page}" if page > 1 else self.LIST_URL
                logger.info(f"Fetching listing page {page}: {url}")
                resp = self.session.get(url, timeout=15)
                if resp.status_code != 200:
                    logger.warning(f"HTTP {resp.status_code} on page {page}, stopping")
                    break

                soup = BeautifulSoup(resp.text, "lxml")
                items = soup.select("div.car-item, div.truck-item, li.car-list-item")
                if not items:
                    items = soup.select("a[href*='/truck/']")
                if not items:
                    logger.warning("No listing items found on page — site structure may have changed")
                    break

                for item in items:
                    try:
                        link = item.get("href") or item.select_one("a")["href"]
                        if not link.startswith("http"):
                            link = self.BASE_URL + link
                        detail = self._scrape_detail(link)
                        if detail:
                            vehicles.append(detail)
                    except Exception as e:
                        logger.debug(f"Skipping item: {e}")

                time.sleep(random.uniform(1.5, 3.0))

        except requests.exceptions.RequestException as e:
            logger.warning(f"Network error during scraping: {e}")
        except Exception as e:
            logger.warning(f"Scraping failed: {e}")

        logger.info(f"Scraped {len(vehicles)} vehicles")
        return vehicles

    def _scrape_detail(self, url: str) -> Optional[dict]:
        """Scrape a single vehicle detail page."""
        from bs4 import BeautifulSoup

        resp = self.session.get(url, timeout=15)
        if resp.status_code != 200:
            return None

        soup = BeautifulSoup(resp.text, "lxml")
        data = {}

        # Try to extract key fields from common page structures
        title = soup.select_one("h1, .car-title, .truck-name")
        if title:
            data["name"] = title.get_text(strip=True)

        # Extract table-based specs (common pattern on Chinese vehicle sites)
        for row in soup.select("tr, .param-item, .spec-row"):
            cells = row.select("td, th, .label, .value")
            if len(cells) >= 2:
                key = cells[0].get_text(strip=True)
                val = cells[1].get_text(strip=True)
                data[key] = val

        # Extract images
        images = []
        for img in soup.select("img[src*='truck'], img[src*='car'], img.main-img"):
            src = img.get("src") or img.get("data-src")
            if src:
                images.append(src)
        data["images"] = images[:5]

        time.sleep(random.uniform(1.0, 2.0))
        return data if data.get("name") else None


# ---------------------------------------------------------------------------
# Mock data generator
# ---------------------------------------------------------------------------


class MockDataGenerator:
    """Generate realistic Chinese special-purpose vehicle data."""

    def __init__(self, seed: int = 42):
        random.seed(seed)
        self._used_models = set()
        self._batch_counter = 370

    def _rand_int(self, lo: int, hi: int, step: int = 1) -> int:
        return random.randrange(lo, hi + 1, step)

    def _rand_float(self, lo: float, hi: float, decimals: int = 1) -> float:
        return round(random.uniform(lo, hi), decimals)

    def _pick_engine(self, brand_name: str, min_power: int, max_power: int) -> dict:
        """Select a realistic engine matching the brand and power range."""
        engine_brands = BRANDS[brand_name]["engines"]

        candidates = []
        for eb in engine_brands:
            models = ENGINE_MODELS.get(eb, [])
            for model_name, disp, kw, hp, torque, cyl in models:
                if min_power <= hp <= max_power:
                    candidates.append({
                        "engine_brand": eb,
                        "engine_model": model_name,
                        "displacement": disp,
                        "power_kw": kw,
                        "power_hp": hp,
                        "torque": torque,
                        "cylinders": cyl,
                    })

        # If no exact match, widen the search to all engines
        if not candidates:
            for eb in engine_brands:
                models = ENGINE_MODELS.get(eb, [])
                for model_name, disp, kw, hp, torque, cyl in models:
                    candidates.append({
                        "engine_brand": eb,
                        "engine_model": model_name,
                        "displacement": disp,
                        "power_kw": kw,
                        "power_hp": hp,
                        "torque": torque,
                        "cylinders": cyl,
                    })

        if not candidates:
            # ultimate fallback
            eb = engine_brands[0]
            hp = self._rand_int(min_power, max_power)
            kw = int(hp * 0.7355)
            return {
                "engine_brand": eb,
                "engine_model": f"{eb[:2]}E6-{hp}",
                "displacement": self._rand_float(6.0, 12.0),
                "power_kw": kw,
                "power_hp": hp,
                "torque": int(hp * 4.5),
                "cylinders": 6,
            }

        return random.choice(candidates)

    def _gen_model_number(self, chassis_prefix: str, vtype_key: str) -> str:
        """Generate a realistic model number."""
        type_codes = {
            "自卸车": "3", "搅拌车": "5", "泵车": "5", "随车吊": "5",
            "冷藏车": "4", "油罐车": "5", "洒水车": "5", "垃圾车": "5",
            "消防车": "5", "清障车": "5", "压缩垃圾车": "5", "高空作业车": "5",
        }
        code = type_codes.get(vtype_key, "5")
        num = self._rand_int(100, 999)
        suffix = random.choice(["A", "B", "C", "D", "E", "N", ""])
        model = f"{chassis_prefix}{code}{num}{suffix}"
        while model in self._used_models:
            num = self._rand_int(100, 999)
            suffix = random.choice(["A", "B", "C", "D", "E", "N", ""])
            model = f"{chassis_prefix}{code}{num}{suffix}"
        self._used_models.add(model)
        return model

    def _gen_announcement(self) -> tuple[str, str]:
        batch = self._rand_int(370, 390)
        batch_str = f"第{batch}批"
        base = datetime(2024, 1, 1) + timedelta(days=(batch - 370) * 30)
        date_str = base.strftime("%Y-%m-%d")
        return batch_str, date_str

    def _gen_certificate(self) -> str:
        prov = random.choice(["鄂", "京", "沪", "鲁", "豫", "湘", "粤", "苏", "皖", "渝", "陕", "桂"])
        return f"{prov}GK{self._rand_int(10000, 99999)}"

    def _gen_description(self, brand: str, vtype: str, name: str, engine: dict) -> str:
        templates = [
            f"{name}，采用{engine['engine_brand']}{engine['engine_model']}发动机，"
            f"最大功率{engine['power_hp']}马力，排放达{random.choice(EMISSION_STANDARDS)}标准，"
            f"适用于{VEHICLE_TYPES[vtype]['purpose']}作业。整车性能可靠，经济性好。",

            f"全新{brand}{vtype}，搭载{engine['engine_brand']}{engine['engine_model']}动力，"
            f"{engine['power_hp']}马力输出，{engine['torque']}Nm扭矩，动力充沛。"
            f"驾驶室宽敞舒适，底盘承载力强，是{VEHICLE_TYPES[vtype]['purpose']}的理想选择。",

            f"{brand}{vtype}采用成熟可靠的{engine['engine_brand']}动力总成，"
            f"排量{engine['displacement']}L，功率{engine['power_kw']}kW，"
            f"具有油耗低、动力强、可靠性高等特点。广泛适用于城市及公路作业。",
        ]
        return random.choice(templates)

    def generate_vehicle(self, brand_name: str, vtype_key: str) -> dict:
        """Generate a single realistic vehicle record."""
        brand_info = BRANDS[brand_name]
        vtype_info = VEHICLE_TYPES[vtype_key]

        drive_type = random.choice(vtype_info["drive_types"])
        axle_count = int(drive_type[0])

        # Dimensions
        length = self._rand_int(*vtype_info["dims"]["length"], step=10)
        width = self._rand_int(*vtype_info["dims"]["width"], step=10)
        height = self._rand_int(*vtype_info["dims"]["height"], step=10)
        cargo_l = self._rand_int(*vtype_info["cargo_dims"]["length"], step=10)
        cargo_w = self._rand_int(*vtype_info["cargo_dims"]["width"], step=10)
        cargo_h = self._rand_int(*vtype_info["cargo_dims"]["height"], step=10)
        cargo_volume = round(cargo_l * cargo_w * cargo_h / 1e9, 1)
        wheelbase = self._rand_int(*vtype_info["wheelbase"], step=50)

        # Weight
        gvw = self._rand_int(*vtype_info["gvw_range"], step=100)
        payload_ratio = self._rand_float(*vtype_info["payload_ratio"])
        rated_payload = int(gvw * payload_ratio / 100) * 100
        curb_weight = gvw - rated_payload
        payload = rated_payload  # simplified

        # Tires
        tire_spec = random.choice(vtype_info["tire_specs"])
        tire_count = {2: 6, 3: 10, 4: 12}.get(axle_count, 10)

        # Engine
        engine = self._pick_engine(brand_name, vtype_info["power_range"][0], vtype_info["power_range"][1])

        # Meta
        model_number = self._gen_model_number(brand_info["chassis_prefix"], vtype_key)
        chassis_model = f"{brand_info['chassis_prefix']}{self._rand_int(1000, 9999)}"
        announcement_batch, announcement_date = self._gen_announcement()
        certificate = self._gen_certificate()

        emission = random.choices(EMISSION_STANDARDS, weights=EMISSION_WEIGHTS, k=1)[0]
        fuel = random.choices(FUEL_TYPES, weights=FUEL_WEIGHTS, k=1)[0]
        suspension = random.choices(SUSPENSION_TYPES, weights=SUSPENSION_WEIGHTS, k=1)[0]
        fuel_consumption = self._rand_float(*vtype_info["fuel_consumption"])

        name = f"{brand_name}{model_number}{vtype_key}"

        now = datetime.now(tz=__import__("datetime").timezone.utc)
        now_str = now.strftime("%Y-%m-%dT%H:%M:%SZ")
        created = (now - timedelta(days=self._rand_int(1, 365))).strftime("%Y-%m-%dT%H:%M:%SZ")

        desc = self._gen_description(brand_name, vtype_key, name, engine)

        return {
            "id": str(uuid.uuid4()),
            "name": name,
            "brand": brand_name,
            "manufacturer": brand_info["manufacturer"],
            "model_number": model_number,
            "announcement_batch": announcement_batch,
            "announcement_date": announcement_date,
            "vehicle_type": vtype_key,
            "vehicle_category": vtype_info["category"],
            "purpose": vtype_info["purpose"],
            "tonnage_class": vtype_info["tonnage_class"],
            "length": length,
            "width": width,
            "height": height,
            "wheelbase": wheelbase,
            "cargo_length": cargo_l,
            "cargo_width": cargo_w,
            "cargo_height": cargo_h,
            "cargo_volume": cargo_volume,
            "curb_weight": curb_weight,
            "gvw": gvw,
            "payload": payload,
            "rated_payload": rated_payload,
            "chassis_brand": brand_name,
            "chassis_model": chassis_model,
            "drive_type": drive_type,
            "axle_count": axle_count,
            "tire_count": tire_count,
            "tire_spec": tire_spec,
            "suspension_type": suspension,
            "engine_brand": engine["engine_brand"],
            "engine_model": engine["engine_model"],
            "displacement": engine["displacement"],
            "power_kw": engine["power_kw"],
            "power_hp": engine["power_hp"],
            "torque": engine["torque"],
            "cylinders": engine["cylinders"],
            "emission_standard": emission,
            "fuel_type": fuel,
            "fuel_consumption": fuel_consumption,
            "certificate_number": certificate,
            "is_tax_exempt": random.random() < 0.3,
            "is_fuel_exempt": random.random() < 0.15,
            "is_environmental": random.random() < 0.6,
            "description": desc,
            "created_at": created,
            "updated_at": now_str,
        }

    def generate_all(self, target_count: int = 320) -> list[dict]:
        """Generate a diverse set of vehicle records."""
        vehicles = []

        # Calculate weighted distribution
        total_weight = sum(v["weight_count"] for v in VEHICLE_TYPES.values())
        brand_list = list(BRANDS.keys())

        for vtype_key, vtype_info in VEHICLE_TYPES.items():
            count = max(8, int(target_count * vtype_info["weight_count"] / total_weight))
            for i in range(count):
                brand = brand_list[i % len(brand_list)]
                vehicles.append(self.generate_vehicle(brand, vtype_key))

        # Fill remaining to reach target
        while len(vehicles) < target_count:
            brand = random.choice(brand_list)
            vtype = random.choice(list(VEHICLE_TYPES.keys()))
            vehicles.append(self.generate_vehicle(brand, vtype))

        random.shuffle(vehicles)
        logger.info(f"Generated {len(vehicles)} mock vehicle records")
        return vehicles


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def save_vehicles(vehicles: list[dict], path: str):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(vehicles, f, ensure_ascii=False, indent=2)
    logger.info(f"Saved {len(vehicles)} vehicles to {path}")


def main():
    mock_only = "--mock-only" in sys.argv
    scrape_only = "--scrape" in sys.argv

    vehicles = []

    # Attempt scraping unless mock-only
    if not mock_only:
        logger.info("Attempting to scrape cn-truck.com ...")
        try:
            scraper = VehicleScraper()
            vehicles = scraper.scrape(max_pages=5)
        except Exception as e:
            logger.warning(f"Scraper failed: {e}")

    if scrape_only:
        if vehicles:
            save_vehicles(vehicles, OUTPUT_FILE)
        else:
            logger.error("Scraping produced no results")
            sys.exit(1)
        return

    # If scraping didn't yield enough data, generate mock
    if len(vehicles) < 300:
        if vehicles:
            logger.info(f"Only scraped {len(vehicles)} vehicles — supplementing with mock data")
        else:
            logger.info("Scraping unavailable or blocked — generating mock data")

        gen = MockDataGenerator()
        mock_vehicles = gen.generate_all(target_count=320)

        # Merge: scraped first, then mock to fill gap
        vehicles = vehicles + mock_vehicles

    save_vehicles(vehicles, OUTPUT_FILE)

    # Print summary stats
    brands_found = set(v["brand"] for v in vehicles)
    types_found = set(v["vehicle_type"] for v in vehicles)
    emissions_found = set(v["emission_standard"] for v in vehicles)
    logger.info(f"Total: {len(vehicles)} vehicles, {len(brands_found)} brands, "
                f"{len(types_found)} types, {len(emissions_found)} emission standards")


if __name__ == "__main__":
    main()
