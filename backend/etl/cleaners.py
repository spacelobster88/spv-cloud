"""
Data cleaning and normalization for vehicle records.

Handles:
- Brand name normalization (map variations to canonical names)
- Emission standard normalization
- Fuel type normalization
- Whitespace cleanup and default values for optional fields
"""

from __future__ import annotations

import logging
import re
from copy import deepcopy
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Brand name mapping — variations → canonical
# ---------------------------------------------------------------------------
BRAND_MAP: dict[str, str] = {
    # Canonical names map to themselves
    "东风": "东风",
    "解放": "解放",
    "重汽": "重汽",
    "福田": "福田",
    "江淮": "江淮",
    "陕汽": "陕汽",
    "大运": "大运",
    "华菱": "华菱",
    "北奔": "北奔",
    "三一": "三一",
    "徐工": "徐工",
    "柳工": "柳工",
    # Common variations
    "东风汽车": "东风",
    "东风商用车": "东风",
    "东风柳汽": "东风",
    "一汽解放": "解放",
    "一汽": "解放",
    "中国重汽": "重汽",
    "中国重汽集团": "重汽",
    "济南重汽": "重汽",
    "福田汽车": "福田",
    "北汽福田": "福田",
    "欧曼": "福田",
    "江淮汽车": "江淮",
    "安徽江淮": "江淮",
    "陕汽集团": "陕汽",
    "陕西汽车": "陕汽",
    "大运汽车": "大运",
    "大运重卡": "大运",
    "华菱汽车": "华菱",
    "华菱星马": "华菱",
    "北奔重汽": "北奔",
    "北奔重卡": "北奔",
    "三一重工": "三一",
    "三一汽车": "三一",
    "徐工汽车": "徐工",
    "徐工集团": "徐工",
    "柳工集团": "柳工",
}

# ---------------------------------------------------------------------------
# Emission standard mapping — variations → canonical
# ---------------------------------------------------------------------------
EMISSION_MAP: dict[str, str] = {
    "国六": "国六",
    "国六b": "国六b",
    "国五": "国五",
    "国四": "国四",
    "国三": "国三",
    # Common variations
    "国VI": "国六",
    "国Ⅵ": "国六",
    "国6": "国六",
    "Euro VI": "国六",
    "Euro 6": "国六",
    "国VI(b)": "国六b",
    "国VIb": "国六b",
    "国六B": "国六b",
    "国V": "国五",
    "国Ⅴ": "国五",
    "国5": "国五",
    "Euro V": "国五",
    "Euro 5": "国五",
    "国IV": "国四",
    "国Ⅳ": "国四",
    "国4": "国四",
    "国III": "国三",
    "国Ⅲ": "国三",
    "国3": "国三",
}

# ---------------------------------------------------------------------------
# Fuel type mapping — variations → canonical
# ---------------------------------------------------------------------------
FUEL_MAP: dict[str, str] = {
    "柴油": "柴油",
    "汽油": "汽油",
    "天然气": "天然气",
    "电动": "电动",
    "混合动力": "混合动力",
    # Common variations
    "LNG": "天然气",
    "CNG": "天然气",
    "液化天然气": "天然气",
    "压缩天然气": "天然气",
    "纯电": "电动",
    "纯电动": "电动",
    "电": "电动",
    "EV": "电动",
    "插电混动": "混合动力",
    "油电混合": "混合动力",
    "插电式混合动力": "混合动力",
    "HEV": "混合动力",
    "PHEV": "混合动力",
    "diesel": "柴油",
    "gasoline": "汽油",
}

# ---------------------------------------------------------------------------
# Fields expected in the ES mapping and their default values
# ---------------------------------------------------------------------------
OPTIONAL_FIELD_DEFAULTS: dict[str, Any] = {
    "images": [],
    "max_towing_weight": None,
    "cargo_volume": None,
    "fuel_consumption": None,
}

REQUIRED_FIELDS = {"id", "name", "brand"}

# ---------------------------------------------------------------------------
# Province mapping — manufacturer keywords → province
# ---------------------------------------------------------------------------
PROVINCE_MAPPING: dict[str, str] = {
    "东风": "湖北",
    "一汽": "吉林",
    "解放": "吉林",
    "中国重汽": "山东",
    "重汽": "山东",
    "济南重汽": "山东",
    "福田": "北京",
    "北汽福田": "北京",
    "欧曼": "北京",
    "陕汽": "陕西",
    "陕西汽车": "陕西",
    "江淮": "安徽",
    "安徽江淮": "安徽",
    "华菱": "安徽",
    "华菱星马": "安徽",
    "大运": "山西",
    "大运汽车": "山西",
    "北奔": "内蒙古",
    "北奔重汽": "内蒙古",
    "三一": "湖南",
    "三一重工": "湖南",
    "徐工": "江苏",
    "徐工汽车": "江苏",
    "柳工": "广西",
    "柳工集团": "广西",
    "上汽": "上海",
    "红岩": "重庆",
    "上汽红岩": "重庆",
    "江铃": "江西",
    "庆铃": "重庆",
    "比亚迪": "广东",
    "宇通": "河南",
}

# ---------------------------------------------------------------------------
# Usage category mapping — vehicle_type keywords → usage category
# ---------------------------------------------------------------------------
USAGE_CATEGORY_MAPPING: dict[str, str] = {
    # 运输类
    "冷藏车": "运输类",
    "厢式运输车": "运输类",
    "仓栅式运输车": "运输类",
    # 工程类
    "自卸车": "工程类",
    "搅拌车": "工程类",
    "泵车": "工程类",
    "随车吊": "工程类",
    # 市政环卫类
    "洒水车": "市政环卫类",
    "垃圾车": "市政环卫类",
    "压缩垃圾车": "市政环卫类",
    "扫路车": "市政环卫类",
    # 消防类
    "消防车": "消防类",
    # 医疗类
    "救护车": "医疗类",
    # 特种作业类
    "高空作业车": "特种作业类",
    "清障车": "特种作业类",
}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def enrich_location(rec: dict) -> None:
    """Set province (and optionally city) based on manufacturer name."""
    manufacturer = rec.get("manufacturer", "")
    if not manufacturer or rec.get("province"):
        return
    for keyword, province in PROVINCE_MAPPING.items():
        if keyword in manufacturer:
            rec["province"] = province
            break


def enrich_usage_category(rec: dict) -> None:
    """Set usage_category based on vehicle_type keywords."""
    vehicle_type = rec.get("vehicle_type", "")
    if not vehicle_type or rec.get("usage_category"):
        return
    for keyword, category in USAGE_CATEGORY_MAPPING.items():
        if keyword in vehicle_type:
            rec["usage_category"] = category
            return
    rec["usage_category"] = "其他"


def clean_record(record: dict) -> dict:
    """
    Clean and normalize a single vehicle record.

    Returns a new dict — does not mutate the original.
    """
    rec = deepcopy(record)

    # Strip whitespace from all string values
    for key, value in rec.items():
        if isinstance(value, str):
            rec[key] = value.strip()

    # Normalize brand
    raw_brand = rec.get("brand", "")
    rec["brand"] = BRAND_MAP.get(raw_brand, raw_brand)

    # Also normalize chassis_brand if present
    raw_chassis = rec.get("chassis_brand", "")
    if raw_chassis:
        rec["chassis_brand"] = BRAND_MAP.get(raw_chassis, raw_chassis)

    # Normalize emission standard
    raw_emission = rec.get("emission_standard", "")
    rec["emission_standard"] = EMISSION_MAP.get(raw_emission, raw_emission)

    # Normalize fuel type
    raw_fuel = rec.get("fuel_type", "")
    rec["fuel_type"] = FUEL_MAP.get(raw_fuel, raw_fuel)

    # Fill defaults for optional fields
    for field, default in OPTIONAL_FIELD_DEFAULTS.items():
        if field not in rec:
            rec[field] = default

    # Strip 'Z' suffix from ISO timestamps (ES mapping expects no timezone)
    for date_field in ("created_at", "updated_at"):
        val = rec.get(date_field, "")
        if isinstance(val, str) and val.endswith("Z"):
            rec[date_field] = val[:-1]

    # Enrich with derived fields
    enrich_location(rec)
    enrich_usage_category(rec)

    return rec


def validate_record(record: dict) -> list[str]:
    """
    Validate a record and return a list of error messages.

    Returns an empty list if the record is valid.
    """
    errors: list[str] = []
    for field in REQUIRED_FIELDS:
        if not record.get(field):
            errors.append(f"Missing required field: {field}")
    return errors


def clean_all(records: list[dict]) -> tuple[list[dict], list[dict]]:
    """
    Clean and validate a batch of records.

    Returns:
        (cleaned_records, skipped_records_with_errors)
    """
    cleaned: list[dict] = []
    skipped: list[dict] = []

    for i, rec in enumerate(records):
        errors = validate_record(rec)
        if errors:
            logger.warning("Record #%d (id=%s) skipped: %s", i, rec.get("id", "?"), "; ".join(errors))
            skipped.append({"record": rec, "errors": errors})
            continue
        cleaned.append(clean_record(rec))

    logger.info("Cleaned %d records, skipped %d.", len(cleaned), len(skipped))
    return cleaned, skipped
