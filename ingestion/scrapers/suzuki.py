"""Suzuki Vietnam scraper (official site).

Source: https://suzuki.com.vn/bike/satria, /vnm-strom
Specs are in <p> tags with col-span classes.
Prices come from the official price page.
"""
import re
from bs4 import BeautifulSoup
from http_client import get
import clean
import schema

PRICE_URL = "https://suzuki.com.vn/pages/bang-gia-xe-may"

# (url, model, variant, version, vehicle_type, price_key)
MODELS = [
    ("https://suzuki.com.vn/bike/satria", "Satria", "Satria", "Pro", "xe côn tay", "SATRIA PRO"),
    ("https://suzuki.com.vn/vnm-strom", "V-Strom", "V-Strom", "250SX", "xe côn tay", "V-STROM 250SX"),
]


def fetch_prices():
    r = get(PRICE_URL)
    soup = BeautifulSoup(r.text, "html.parser")
    text = soup.get_text("\n", strip=True)
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    prices = {}
    for i, ln in enumerate(lines):
        if ln in ("SATRIA PRO", "V-STROM 250SX"):
            for j in range(i + 1, min(i + 5, len(lines))):
                if re.match(r"^[\d.,]+$", lines[j]):
                    prices[ln] = lines[j]
                    break
    return prices


def fetch_model(url):
    r = get(url)
    return url, BeautifulSoup(r.text, "html.parser")


def parse_specs(soup):
    specs = {}
    ps = soup.find_all("p")
    i = 0
    while i < len(ps):
        cls = ps[i].get("class", [])
        txt = ps[i].get_text(" ", strip=True)
        if "col-span-4" in cls and txt:
            j = i + 1
            while j < len(ps):
                c2 = ps[j].get("class", [])
                t2 = ps[j].get_text(" ", strip=True)
                if "col-span-2" in c2 and t2:
                    specs[txt] = t2
                    break
                j += 1
            i = j
        else:
            i += 1
    return specs


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


def build_row(model, variant, version, vehicle_type, source_url, specs, price_raw):
    row = schema.empty_row("Suzuki", model, variant, vehicle_type, "ICE", source_url, version=version)
    row["price_vnd"] = clean.parse_price_vnd(price_raw)
    row["engine_displacement_cc"] = clean.parse_displacement_cc(find_spec(specs, "Dung tích xi-lanh"))
    row["max_power_kw"] = clean.parse_power_kw(find_spec(specs, "Công suất cực đại", "Công suất"))
    row["max_torque_nm"] = clean.parse_torque_nm(find_spec(specs, "Mô men xoắn", "Momen"))
    row["fuel_consumption_l_per_100km"] = clean.parse_fuel_consumption_l100km(
        find_spec(specs, "Mức tiêu thụ nhiên liệu"))
    row["fuel_tank_capacity_l"] = clean.parse_battery_kwh(find_spec(specs, "Dung tích bình xăng"))
    fr = find_spec(specs, "Phanh", "Hệ thống phanh") or ""
    row["front_brake_type"] = clean.brake_type(fr)
    row["rear_brake_type"] = clean.brake_type(fr)
    absv = find_spec(specs, "ABS", "chống bó cứng")
    row["abs"] = bool(absv) or clean.is_abs(fr)
    row["abs_channel"] = clean.abs_channel(fr + " " + (absv or ""))
    row["cbs"] = clean.is_cbs(fr)
    row["curb_weight_kg"] = clean.parse_curb_weight_kg(find_spec(specs, "Khối lượng bản thân", "Trọng lượng"))
    row["seat_height_mm"] = clean.parse_seat_height_mm(find_spec(specs, "Chiều cao yên"))
    row["ground_clearance_mm"] = clean.parse_dimension_mm(find_spec(specs, "Khoảng sáng gầm"))
    l, w, h = clean.parse_lxhxh(find_spec(specs, "Kích thước tổng thể", "Dài x"))
    row["length_mm"], row["width_mm"], row["height_mm"] = l, w, h
    row["wheelbase_mm"] = clean.parse_dimension_mm(find_spec(specs, "Chiều dài cơ sở"))
    return row


def scrape_all():
    results = []
    for url, model, variant, version, vtype, price_key in MODELS:
        try:
            src_url, soup = fetch_model(url)
            specs = parse_specs(soup)
            prices = fetch_prices()
            results.append(build_row(model, variant, version, vtype, src_url, specs, prices.get(price_key)))
        except Exception as e:
            print(f"  [Suzuki] {variant} ERROR: {e}")
    return results