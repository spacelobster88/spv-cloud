#!/usr/bin/env python3
"""
Scrape MIIT batch 405 vehicle detail pages and listing pages.

Step 1: Enrich existing 20 records with detail page data
Step 2: Scrape ALL listing pages to find all vehicles
Step 3: Save enriched data to batch_405_vehicles_full.json
"""

import json
import os
import re
import sys
import time
import random
import uuid
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

BASE_URL = "https://ggzx.miit.gov.cn"
LISTING_URL = f"{BASE_URL}/datainfo/dljdclscqyjcpgg/xcpgs405dwe2rw.html"
DATA_DIR = Path("/Users/spacelobster/Projects/spv-cloud/backend/data")
INPUT_FILE = DATA_DIR / "batch_405_vehicles.json"
OUTPUT_FILE = DATA_DIR / "batch_405_vehicles_full.json"
PROGRESS_FILE = DATA_DIR / "scrape_progress.json"

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Referer': 'https://ggzx.miit.gov.cn/datainfo/dljdclscqyjcpgg/xcpgs405dwe2rw.html',
    'Connection': 'keep-alive',
}

# Chinese field name -> English field mapping
FIELD_MAP = {
    '产品商标': 'brand',
    '产品型号': 'model_number',
    '产品名称': 'name',
    '企业名称': 'manufacturer',
    '外形尺寸(mm)': 'dimensions_raw',
    '外形尺寸（mm）': 'dimensions_raw',
    '总质量(kg)': 'gvw',
    '总质量（kg）': 'gvw',
    '整备质量(kg)': 'curb_weight',
    '整备质量（kg）': 'curb_weight',
    '额定载质量(kg)': 'rated_payload',
    '额定载质量（kg）': 'rated_payload',
    '燃料种类': 'fuel_type',
    '排放标准': 'emission_standard',
    '发动机型号': 'engine_model',
    '发动机排量(ml)': 'displacement_ml',
    '发动机排量（ml）': 'displacement_ml',
    '功率(kW)': 'power_kw',
    '功率（kW）': 'power_kw',
    '轴距(mm)': 'wheelbase',
    '轴距（mm）': 'wheelbase',
    '轴数': 'axle_count',
    '轮胎数': 'tire_count',
    '轮胎规格': 'tire_spec',
    '弹簧片数': 'spring_count',
    '前悬/后悬(mm)': 'overhang_raw',
    '前悬/后悬（mm）': 'overhang_raw',
    '前悬（mm）': 'front_overhang',
    '后悬（mm）': 'rear_overhang',
    '接近角/离去角(°)': 'angles_raw',
    '接近角/离去角（°）': 'angles_raw',
    '驱动形式': 'drive_type',
    '货厢内部尺寸(mm)': 'cargo_dimensions_raw',
    '货厢内部尺寸（mm）': 'cargo_dimensions_raw',
    '最高车速(km/h)': 'max_speed_kmh',
    '最高车速（km/h）': 'max_speed_kmh',
    '额定载客(人)': 'seating_capacity',
    '额定载客（人）': 'seating_capacity',
    '驾驶室准乘人数(人)': 'cab_seating',
    '驾驶室准乘人数（人）': 'cab_seating',
    '转向形式': 'steering_type',
    '制动方式': 'brake_type',
    '底盘型号': 'chassis_model',
    '底盘名称': 'chassis_brand',
    '底盘企业': 'chassis_brand',
    '产品号': 'product_code',
    '公告型号': 'announcement_model',
    '反光标识': 'reflective_marking',
    '侧后防护装置': 'side_rear_protection',
    '备注': 'notes',
    '发动机生产企业': 'engine_brand',
    '标记功率': 'rated_power',
    '油耗': 'fuel_consumption',
    '准拖挂车总质量(kg)': 'max_towing_weight',
    '准拖挂车总质量（kg）': 'max_towing_weight',
}


def create_session():
    """Create a requests session with keep-alive."""
    session = requests.Session()
    session.headers.update(HEADERS)
    session.verify = True
    return session


def fetch_page(session, url, max_retries=3):
    """Fetch a page with retry logic and exponential backoff."""
    for attempt in range(max_retries):
        try:
            print(f"  Fetching: {url} (attempt {attempt + 1})")
            resp = session.get(url, timeout=30)
            resp.raise_for_status()
            resp.encoding = resp.apparent_encoding or 'utf-8'
            return resp.text
        except requests.exceptions.RequestException as e:
            wait = (2 ** attempt) * 3 + random.uniform(0, 2)
            print(f"  Error: {e}. Retrying in {wait:.1f}s...")
            if attempt < max_retries - 1:
                time.sleep(wait)
            else:
                print(f"  FAILED after {max_retries} attempts: {url}")
                return None


def parse_int(val):
    """Parse an integer from a string, handling common formats."""
    if not val:
        return None
    val = str(val).strip().replace(',', '').replace(' ', '')
    # Handle ranges like "1500,1800" -> take first
    if ',' in val:
        val = val.split(',')[0]
    match = re.search(r'(\d+)', val)
    return int(match.group(1)) if match else None


def parse_float(val):
    """Parse a float from a string."""
    if not val:
        return None
    val = str(val).strip().replace(',', '').replace(' ', '')
    match = re.search(r'([\d.]+)', val)
    return float(match.group(1)) if match else None


def parse_dimensions(raw):
    """Parse 'L×W×H' format into separate dimensions."""
    if not raw:
        return {}
    # Common separators: ×, x, X, *, /, ,
    parts = re.split(r'[×xX*/,]', str(raw).strip())
    parts = [parse_int(p) for p in parts if p.strip()]
    result = {}
    if len(parts) >= 1:
        result['length'] = parts[0]
    if len(parts) >= 2:
        result['width'] = parts[1]
    if len(parts) >= 3:
        result['height'] = parts[2]
    return result


def parse_overhang(raw):
    """Parse 'front/rear' overhang values."""
    if not raw:
        return {}
    parts = re.split(r'[/,]', str(raw).strip())
    parts = [parse_int(p) for p in parts if p.strip()]
    result = {}
    if len(parts) >= 1:
        result['front_overhang'] = parts[0]
    if len(parts) >= 2:
        result['rear_overhang'] = parts[1]
    return result


def parse_angles(raw):
    """Parse 'approach/departure' angles."""
    if not raw:
        return {}
    parts = re.split(r'[/,]', str(raw).strip())
    parts = [parse_float(p) for p in parts if p.strip()]
    result = {}
    if len(parts) >= 1:
        result['approach_angle'] = parts[0]
    if len(parts) >= 2:
        result['departure_angle'] = parts[1]
    return result


def parse_detail_page(html):
    """Parse a vehicle detail page and extract all fields."""
    soup = BeautifulSoup(html, 'lxml')
    data = {}
    images = []

    # Extract images
    for img in soup.find_all('img'):
        src = img.get('src', '')
        if src and ('/images/' in src or '/upload/' in src or src.endswith(('.jpg', '.png', '.jpeg', '.gif'))):
            if src.startswith('/'):
                src = BASE_URL + src
            elif not src.startswith('http'):
                src = BASE_URL + '/' + src
            if src not in images:
                images.append(src)

    # Try to find data in table rows
    for table in soup.find_all('table'):
        rows = table.find_all('tr')
        for row in rows:
            cells = row.find_all(['td', 'th'])
            # Process pairs of cells (label, value)
            i = 0
            while i < len(cells) - 1:
                label_text = cells[i].get_text(strip=True)
                value_text = cells[i + 1].get_text(strip=True)

                # Check for images in the value cell
                for img in cells[i + 1].find_all('img'):
                    src = img.get('src', '')
                    if src:
                        if src.startswith('/'):
                            src = BASE_URL + src
                        elif not src.startswith('http'):
                            src = BASE_URL + '/' + src
                        if src not in images:
                            images.append(src)

                if label_text:
                    # Normalize the label
                    label_clean = label_text.replace('：', '').replace(':', '').strip()
                    eng_field = FIELD_MAP.get(label_clean)
                    if eng_field and value_text:
                        data[eng_field] = value_text
                    elif value_text and label_clean:
                        # Store unmapped fields too
                        data[f'_raw_{label_clean}'] = value_text
                i += 2

    # Also try definition lists (dl/dt/dd)
    for dl in soup.find_all('dl'):
        dts = dl.find_all('dt')
        dds = dl.find_all('dd')
        for dt, dd in zip(dts, dds):
            label_clean = dt.get_text(strip=True).replace('：', '').replace(':', '').strip()
            value_text = dd.get_text(strip=True)
            eng_field = FIELD_MAP.get(label_clean)
            if eng_field and value_text:
                data[eng_field] = value_text

    # Try div-based key-value pairs
    for div in soup.find_all('div', class_=re.compile(r'(item|field|row|param|info)', re.I)):
        text = div.get_text(strip=True)
        # Look for "label：value" or "label:value" patterns
        for sep in ['：', ':']:
            if sep in text:
                parts = text.split(sep, 1)
                if len(parts) == 2:
                    label_clean = parts[0].strip()
                    value_text = parts[1].strip()
                    eng_field = FIELD_MAP.get(label_clean)
                    if eng_field and value_text:
                        data[eng_field] = value_text

    data['_images'] = images
    return data


def enrich_record(record, detail_data):
    """Merge detail page data into an existing record."""
    enriched = dict(record)

    # Direct string fields
    for field in ['brand', 'manufacturer', 'model_number', 'name', 'fuel_type',
                  'emission_standard', 'engine_model', 'engine_brand',
                  'drive_type', 'tire_spec', 'chassis_model', 'chassis_brand',
                  'steering_type', 'brake_type']:
        if field in detail_data and detail_data[field]:
            enriched[field] = detail_data[field]

    # Integer fields
    for field in ['gvw', 'curb_weight', 'rated_payload', 'wheelbase',
                  'axle_count', 'tire_count', 'max_towing_weight']:
        if field in detail_data:
            val = parse_int(detail_data[field])
            if val is not None:
                enriched[field] = val

    # Parse dimensions
    if 'dimensions_raw' in detail_data:
        dims = parse_dimensions(detail_data['dimensions_raw'])
        enriched.update(dims)

    # Parse cargo dimensions
    if 'cargo_dimensions_raw' in detail_data:
        cargo = parse_dimensions(detail_data['cargo_dimensions_raw'])
        if 'length' in cargo:
            enriched['cargo_length'] = cargo['length']
        if 'width' in cargo:
            enriched['cargo_width'] = cargo['width']
        if 'height' in cargo:
            enriched['cargo_height'] = cargo['height']

    # Parse overhang
    if 'overhang_raw' in detail_data:
        overhang = parse_overhang(detail_data['overhang_raw'])
        enriched.update(overhang)
    if 'front_overhang' in detail_data:
        enriched['front_overhang'] = parse_int(detail_data['front_overhang'])
    if 'rear_overhang' in detail_data:
        enriched['rear_overhang'] = parse_int(detail_data['rear_overhang'])

    # Parse angles
    if 'angles_raw' in detail_data:
        angles = parse_angles(detail_data['angles_raw'])
        enriched.update(angles)

    # Displacement
    if 'displacement_ml' in detail_data:
        ml = parse_float(detail_data['displacement_ml'])
        if ml is not None:
            enriched['displacement'] = round(ml / 1000, 2)  # Store as liters

    # Power
    if 'power_kw' in detail_data:
        kw = parse_float(detail_data['power_kw'])
        if kw is not None:
            enriched['power_kw'] = kw
            enriched['power_hp'] = round(kw * 1.341, 1)

    # Max speed
    if 'max_speed_kmh' in detail_data:
        enriched['max_speed_kmh'] = parse_int(detail_data['max_speed_kmh'])

    # Seating
    if 'seating_capacity' in detail_data:
        enriched['seating_capacity'] = parse_int(detail_data['seating_capacity'])
    if 'cab_seating' in detail_data:
        enriched['cab_seating'] = parse_int(detail_data['cab_seating'])

    # Fuel consumption
    if 'fuel_consumption' in detail_data:
        enriched['fuel_consumption'] = parse_float(detail_data['fuel_consumption'])

    # Images
    if detail_data.get('_images'):
        existing = set(enriched.get('images', []))
        enriched['images'] = list(existing | set(detail_data['_images']))

    # Store raw fields for debugging
    raw_fields = {k: v for k, v in detail_data.items() if k.startswith('_raw_')}
    if raw_fields:
        enriched['backup_params'] = enriched.get('backup_params') or {}
        enriched['backup_params'].update(raw_fields)

    enriched['updated_at'] = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S')

    return enriched


def clean_detail_url(url_str):
    """Remove escaped quotes from detail_url field."""
    if not url_str:
        return None
    # Remove leading/trailing escaped quotes and whitespace
    cleaned = url_str.strip().strip('"').strip("'").strip('\\"').strip()
    if not cleaned or cleaned == '""':
        return None
    return cleaned


def scrape_listing_page(session, url):
    """Scrape a listing page to get vehicle links and basic info."""
    html = fetch_page(session, url)
    if not html:
        return [], None

    soup = BeautifulSoup(html, 'lxml')
    vehicles = []

    # Find vehicle links in the listing
    for link in soup.find_all('a', href=True):
        href = link['href']
        if '/art/' in href and href.endswith('.html'):
            text = link.get_text(strip=True)
            if text and len(text) > 5:  # Filter out navigation links
                detail_url = href if href.startswith('/') else '/' + href
                vehicles.append({
                    'name': text,
                    'detail_url': detail_url,
                })

    # Find next page link
    next_page = None
    # Look for pagination
    for link in soup.find_all('a', href=True):
        text = link.get_text(strip=True)
        if text in ['下一页', '>', '>>'] or 'next' in link.get('class', []):
            next_href = link['href']
            if next_href.startswith('/'):
                next_page = BASE_URL + next_href
            elif next_href.startswith('http'):
                next_page = next_href
            else:
                # Relative URL
                base_path = url.rsplit('/', 1)[0]
                next_page = base_path + '/' + next_href
            break

    # Also look for page number links
    page_links = []
    for link in soup.find_all('a', href=True):
        text = link.get_text(strip=True)
        if text.isdigit():
            page_links.append((int(text), link['href']))

    return vehicles, next_page


def save_progress(data, filepath):
    """Save data incrementally."""
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"  Saved {len(data)} records to {filepath}")


def main():
    session = create_session()

    # =========================================================
    # STEP 1: Enrich existing 20 records with detail page data
    # =========================================================
    print("=" * 60)
    print("STEP 1: Enriching existing 20 records with detail pages")
    print("=" * 60)

    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        existing_records = json.load(f)

    print(f"Loaded {len(existing_records)} existing records")

    # Load progress if exists
    enriched_records = []
    if PROGRESS_FILE.exists():
        with open(PROGRESS_FILE, 'r', encoding='utf-8') as f:
            enriched_records = json.load(f)
        print(f"Resuming from progress file: {len(enriched_records)} already done")

    already_done = {r['model_number'] for r in enriched_records if r.get('model_number')}

    for i, record in enumerate(existing_records):
        model = record.get('model_number', '')
        if model in already_done:
            print(f"[{i+1}/{len(existing_records)}] {model} - already enriched, skipping")
            continue

        detail_url = clean_detail_url(record.get('detail_url', ''))
        if not detail_url:
            print(f"[{i+1}/{len(existing_records)}] {model} - no detail URL, keeping as-is")
            enriched_records.append(record)
            save_progress(enriched_records, PROGRESS_FILE)
            continue

        full_url = BASE_URL + detail_url
        print(f"[{i+1}/{len(existing_records)}] Scraping {model}...")

        html = fetch_page(session, full_url)
        if html:
            detail_data = parse_detail_page(html)
            enriched = enrich_record(record, detail_data)
            enriched_records.append(enriched)
            field_count = sum(1 for k, v in enriched.items()
                           if v and v != '' and v != [] and v != {} and not k.startswith('_'))
            print(f"  Extracted {len(detail_data)} raw fields, record now has {field_count} populated fields")

            # Show what we got
            for key in ['fuel_type', 'emission_standard', 'power_kw', 'gvw', 'length']:
                if enriched.get(key):
                    print(f"    {key}: {enriched[key]}")
        else:
            print(f"  FAILED to fetch detail page, keeping original data")
            enriched_records.append(record)

        save_progress(enriched_records, PROGRESS_FILE)

        # Delay between requests
        delay = random.uniform(3, 5)
        print(f"  Waiting {delay:.1f}s...")
        time.sleep(delay)

    print(f"\nStep 1 complete: {len(enriched_records)} records enriched")

    # =========================================================
    # STEP 2: Scrape ALL listing pages for batch 405
    # =========================================================
    print("\n" + "=" * 60)
    print("STEP 2: Scraping ALL listing pages for batch 405")
    print("=" * 60)

    all_vehicle_urls = []
    known_urls = {clean_detail_url(r.get('detail_url', '')) for r in enriched_records}
    known_urls.discard(None)

    page_url = LISTING_URL
    page_num = 1

    while page_url:
        print(f"\nScraping listing page {page_num}: {page_url}")
        vehicles, next_page = scrape_listing_page(session, page_url)
        print(f"  Found {len(vehicles)} vehicle links on this page")

        for v in vehicles:
            if v['detail_url'] not in known_urls:
                all_vehicle_urls.append(v)
                known_urls.add(v['detail_url'])
                print(f"    NEW: {v['name'][:50]}...")

        if not next_page or page_num > 50:  # Safety limit
            break

        page_url = next_page
        page_num += 1
        time.sleep(random.uniform(3, 5))

    print(f"\nFound {len(all_vehicle_urls)} NEW vehicles from listing pages")

    # Scrape detail pages for new vehicles
    if all_vehicle_urls:
        print(f"\nScraping {len(all_vehicle_urls)} new vehicle detail pages...")

        for i, v_info in enumerate(all_vehicle_urls):
            detail_url = v_info['detail_url']
            full_url = BASE_URL + detail_url
            print(f"\n[NEW {i+1}/{len(all_vehicle_urls)}] {v_info['name'][:50]}...")

            html = fetch_page(session, full_url)
            if html:
                detail_data = parse_detail_page(html)
                # Create new record
                new_record = {
                    'id': str(uuid.uuid4()),
                    'data_source': 'miit_web',
                    'announcement_batch': '第405批',
                    'announcement_date': None,
                    'created_at': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S'),
                    'updated_at': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S'),
                    'images': [],
                    'description': '',
                    'name': v_info.get('name', ''),
                    'brand': '',
                    'manufacturer': '',
                    'model_number': '',
                    'vehicle_type': '',
                    'vehicle_category': '',
                    'purpose': '',
                    'tonnage_class': '',
                    'chassis_brand': '',
                    'chassis_model': '',
                    'drive_type': '',
                    'tire_spec': '',
                    'suspension_type': '',
                    'engine_brand': '',
                    'engine_model': '',
                    'emission_standard': '',
                    'fuel_type': '',
                    'certificate_number': '',
                    'is_tax_exempt': False,
                    'is_fuel_exempt': False,
                    'is_environmental': False,
                    'detail_url': detail_url,
                }
                enriched = enrich_record(new_record, detail_data)

                # Try to extract model_number from name if not found
                if not enriched.get('model_number') and enriched.get('name'):
                    # Model numbers are usually alphanumeric codes
                    match = re.search(r'[A-Z]{2,}[\dA-Z]{4,}', enriched['name'])
                    if match:
                        enriched['model_number'] = match.group(0)

                # Extract vehicle_type from name
                if not enriched.get('vehicle_type') and enriched.get('name'):
                    name = enriched['name']
                    # The type usually comes after the model number
                    for pattern in [r'牌\S+?(\S+[车机])', r'([^\s]+[车机])$']:
                        m = re.search(pattern, name)
                        if m:
                            enriched['vehicle_type'] = m.group(1)
                            break

                enriched_records.append(enriched)
                print(f"  Created new record: model={enriched.get('model_number', 'N/A')}")
            else:
                print(f"  FAILED to fetch detail page")

            save_progress(enriched_records, PROGRESS_FILE)

            delay = random.uniform(3, 5)
            print(f"  Waiting {delay:.1f}s...")
            time.sleep(delay)

    # =========================================================
    # FINAL: Save all enriched records
    # =========================================================
    print("\n" + "=" * 60)
    print("FINAL: Saving results")
    print("=" * 60)

    # Fix dates
    for r in enriched_records:
        for field in ['created_at', 'updated_at', 'announcement_date']:
            if r.get(field) and isinstance(r[field], str) and r[field].endswith('Z'):
                r[field] = r[field][:-1]

    save_progress(enriched_records, OUTPUT_FILE)

    # Print summary
    print(f"\nTotal records: {len(enriched_records)}")
    populated_fields = {}
    for r in enriched_records:
        for k, v in r.items():
            if v and v != '' and v != [] and v != {} and not k.startswith('_'):
                populated_fields[k] = populated_fields.get(k, 0) + 1

    print("\nField population summary:")
    for field, count in sorted(populated_fields.items(), key=lambda x: -x[1]):
        pct = count / len(enriched_records) * 100
        print(f"  {field}: {count}/{len(enriched_records)} ({pct:.0f}%)")


if __name__ == '__main__':
    main()
