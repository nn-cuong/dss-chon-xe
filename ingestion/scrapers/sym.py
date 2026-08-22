"""SYM Vietnam scraper (official site).

Source: http://sym.com.vn/san-pham/
All product variants are discovered from the official listing pages.
Specs are in "Thông số kỹ thuật" section with label/value pairs.
"""
import re
from bs4 import BeautifulSoup
from http_client import get
import clean
import schema

BASE = "https://www.sym.com.vn"
LISTINGS = ["/san-pham/xe-tay-ga", "/san-pham/xe-so", "/san-pham/xe-50cc"]

# Near-duplicate 50cc wheel/color variants to skip (base model kept)
SKIP_URL_FRAGMENTS = [
    "-banh-cam", "-banh-mam", "banh-mam--", "banh-cam--",
    "angela-50-son-mo", "elite-50-phien-ban-dac-biet", "shark-50-32",
]
# Keep the main representative model URL for each base name
# (the base .html path without -banh-cam/mam)

# (url, model, version, vehicle_type, cc)
MODELS = [
    ("/san-pham/elegant-50-13.html", "Elegant", None, "xe tay ga", "50"),
    ("/san-pham/angel-110-38.html", "Angel", None, "xe tay ga", "110"),
    ("/san-pham/tpbw-125-phien-ban-smartkey--42.html", "TPBW", "Smartkey", "xe tay ga", "125"),
    ("/san-pham/tpbw-125-phien-ban-key-set--43.html", "TPBW", "Key Set", "xe tay ga", "125"),
    ("/san-pham/naga-150-40.html", "NAGA", None, "xe tay ga", "150"),
    ("/san-pham/priti-125-39.html", "PRITI", None, "xe tay ga", "125"),
    ("/san-pham/tuscany-150-34.html", "TUSCANY", None, "xe tay ga", "150"),
    ("/san-pham/priti-50-35.html", "PRITI", None, "xe tay ga", "50"),
    ("/san-pham/shark-efi-50-41.html", "SHARK", None, "xe tay ga", "50"),
    ("/san-pham/attila-50-5.html", "Attila", None, "xe tay ga", "50"),
    ("/san-pham/angela-50-14.html", "Angela", None, "xe tay ga", "50"),
    ("/san-pham/elite-50-17.html", "Elite", None, "xe tay ga", "50"),
    ("/san-pham/galaxy-50-12.html", "Galaxy", None, "xe tay ga", "50"),
    ("/san-pham/elegant-sport-50-banh-mam--37.html", "Elegant Sport", None, "xe tay ga", "50"),
]


def fetch_model(path):
    url = BASE + path
    r = get(url)
    return url, BeautifulSoup(r.text, "html.parser")


def parse_specs(soup):
    specs = {}
    text = soup.get_text("\n", strip=True)
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    try:
        idx = next(i for i, l in enumerate(lines) if "Thông số kỹ thuật" in l)
    except StopIteration:
        return specs
    i = idx + 1
    while i < len(lines) - 1:
        label = lines[i]
        value = lines[i + 1]
        if label in ("Thư viện ảnh", "KHUYẾN MÃI", "ĐẠI LÝ SYM", "ĐĂNG KÝ NHẬN THÔNG TIN"):
            break
        if label == "Model":
            i += 2
            continue
        if value and not value.startswith("Thư viện"):
            specs[label] = value
            i += 2
        else:
            i += 1
    return specs


def extract_price(soup):
    text = soup.get_text(" ", strip=True)
    m = re.search(r"([\d.,]+)\s*VND", text, re.I)
    if m:
        return m.group(1)
    return None


def find_spec(specs, *keys):
    best, best_score = None, -1
    for k, v in specs.items():
        kl = k.lower()
        for key in keys:
            if key.lower() in kl:
                score = len(key)
                if score > best_score:
                    best_score, best = score, v
    return best


def build_row(model, variant, version, vehicle_type, cc, source_url, specs, price_raw):
    row = schema.empty_row("SYM", model, variant, vehicle_type, "ICE", source_url, version=version)
    row["model_year"] = "2025"
    row["price_vnd"] = clean.parse_price_vnd(price_raw)
    row["engine_displacement_cc"] = clean.parse_displacement_cc(find_spec(specs, "Phân khối", "Dung tích xy")) or (
        float(cc) if cc else None)
    row["max_power_kw"] = clean.parse_power_kw(find_spec(specs, "Công suất tối đa", "Công suất lớn nhất"))
    row["max_torque_nm"] = clean.parse_torque_nm(find_spec(specs, "Momen cực đại", "Momen"))
    row["fuel_consumption_l_per_100km"] = clean.parse_fuel_consumption_l100km(
        find_spec(specs, "Mức hao xăng", "Mức tiêu thụ nhiên liệu"))
    row["fuel_tank_capacity_l"] = clean.parse_battery_kwh(find_spec(specs, "Dung tích bình xăng", "thùng nhiên liệu"))
    fr = find_spec(specs, "thắng trước", "phanh trước") or find_spec(specs, "Phanh đĩa") or ""
    rr = find_spec(specs, "thắng sau", "phanh sau") or ""
    row["front_brake_type"] = clean.brake_type(fr)
    row["rear_brake_type"] = clean.brake_type(rr)
    row["abs"] = clean.is_abs(fr + " " + (rr or ""))
    row["abs_channel"] = clean.abs_channel(fr + " " + (rr or ""))
    row["cbs"] = clean.is_cbs(fr + " " + (rr or ""))
    row["curb_weight_kg"] = clean.parse_curb_weight_kg(find_spec(specs, "Trọng lượng khô", "Tổng trọng lượng"))
    row["seat_height_mm"] = clean.parse_seat_height_mm(find_spec(specs, "Chiều cao yên xe", "Chiều cao yên"))
    row["ground_clearance_mm"] = clean.parse_dimension_mm(find_spec(specs, "Khoảng sáng gầm"))
    l, w, h = clean.parse_lxhxh(find_spec(specs, "Dài - Rộng - Cao", "Dài - Rộng"))
    row["length_mm"], row["width_mm"], row["height_mm"] = l, w, h
    row["wheelbase_mm"] = clean.parse_dimension_mm(find_spec(specs, "Khoảng cách 2 trục", "trục"))
    return row


def scrape_all():
    results = []
    for path, model, version, vtype, cc in MODELS:
        try:
            url, soup = fetch_model(path)
            specs = parse_specs(soup)
            price = extract_price(soup)
            results.append(build_row(model, model, version, vtype, cc, url, specs, price))
        except Exception as e:
            print(f"  [SYM] {model} ERROR: {e}")
    return results