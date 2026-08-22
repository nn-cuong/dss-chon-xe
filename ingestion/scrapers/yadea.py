"""Yadea Vietnam electric scooter scraper (official site).

Source: https://www.yadea.com.vn/thong-tin-san-pham/
"""
from bs4 import BeautifulSoup
from http_client import get
import clean
import schema

BASE = "https://www.yadea.com.vn"

# (path, model, variant, version, vehicle_type)
MODELS = [
    ("/thong-tin-san-pham/yadea-voltguard-u80-2pin/", "Voltguard", "Voltguard", "U80", "xe máy điện"),
    ("/thong-tin-san-pham/yadea-voltguard-u50/", "Voltguard", "Voltguard", "U50", "xe máy điện"),
    ("/thong-tin-san-pham/yadea-voltguard-p-l/", "Voltguard", "Voltguard", "P-L", "xe máy điện"),
]


def fetch_model(path):
    url = BASE + path
    r = get(url)
    return url, BeautifulSoup(r.text, "html.parser")


def parse_specs(soup):
    specs = {}
    text = soup.get_text("\n", strip=True)
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    for i, ln in enumerate(lines):
        for key in ["Dung lượng Pin", "Quãng đường đi được", "Tốc độ tối đa", "Công suất", "Trọng lượng", "Cốp", "Vị trí lắp pin"]:
            if key in ln and i + 1 < len(lines) and key not in specs:
                specs[key] = lines[i + 1]
        if "72V" in ln:
            specs["Dung lượng Pin (điện)"] = ln
    return specs


def extract_price(soup):
    import re
    text = soup.get_text(" ", strip=True)
    m = re.search(r"Giá\s+bán\s+lẻ\s+đề\s+xuất:\s*([\d.,]+)\s*VND", text, re.I)
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


def build_row(model, variant, version, vtype, source_url, specs, price_raw):
    row = schema.empty_row("Yadea", model, variant, vtype, "EV", source_url, version=version)
    row["price_vnd"] = clean.parse_price_vnd(price_raw)
    batt = find_spec(specs, "Dung lượng Pin")
    row["battery_capacity_kwh"] = clean.parse_battery_kwh(batt)
    row["battery_type"] = clean.parse_battery_type(batt)
    row["motor_power_kw"] = clean.parse_power_kw(find_spec(specs, "Công suất"))
    row["max_torque_nm"] = clean.parse_torque_nm(find_spec(specs, "Mô men xoắn", "Momen"))
    row["range_km"] = clean.parse_range_km(find_spec(specs, "Quãng đường đi được"))
    row["charging_time_h"] = clean.parse_charging_time_h(find_spec(specs, "Sạc"))
    row["underseat_storage_l"] = clean.parse_battery_kwh(find_spec(specs, "Cốp"))
    row["curb_weight_kg"] = clean.parse_curb_weight_kg(find_spec(specs, "Trọng lượng"))
    return row


def parse_million_vnd(text):  # alias for clean
    return clean.parse_price_vnd(text)


def scrape_all():
    results = []
    for path, model, variant, version, vtype in MODELS:
        try:
            url, soup = fetch_model(path)
            specs = parse_specs(soup)
            price = extract_price(soup)
            results.append(build_row(model, variant, version, vtype, url, specs, price))
        except Exception as e:
            print(f"  [Yadea] {variant} ERROR: {e}")
    return results