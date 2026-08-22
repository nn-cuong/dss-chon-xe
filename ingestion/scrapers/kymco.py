"""Kymco Vietnam scraper (official site).

Source: https://kymco.com.vn
All products discovered from the official listing page.
Specs are label/value pairs in the spec section.
"""
import re
from bs4 import BeautifulSoup
from http_client import get
import clean
import schema

BASE = "https://kymco.com.vn"
LISTING = "https://kymco.com.vn/san-pham"


def discover_products():
    r = get(LISTING)
    soup = BeautifulSoup(r.text, "html.parser")
    slugs = set()
    for a in soup.find_all("a", href=True):
        m = re.search(r"/san-pham/([a-z0-9\-]+)\.html", a["href"])
        if m:
            slugs.add(m.group(1))
    return sorted(slugs)


def model_name_from_slug(slug):
    overrides = {
        "hermosa-50": "Candy Hermosa", "hermosa-50fi": "Candy Hermosa",
        "like-50": "Like", "like-50fi": "Like", "kpipe-50": "K-Pipe",
        "people-r-125": "People", "sky-town-150": "Sky Town",
        "visar-s-50": "Visar", "xciting-s350": "Xciting S350",
    }
    if slug in overrides:
        return overrides[slug]
    return slug.replace("-", " ").title()


def fetch_model(path):
    url = BASE + "/san-pham/" + path + ".html"
    r = get(url)
    return url, BeautifulSoup(r.text, "html.parser")


def parse_specs(soup):
    specs = {}
    text = soup.get_text("\n", strip=True)
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    try:
        idx = next(i for i, l in enumerate(lines) if "THÔNG SỐ" in l.upper())
    except StopIteration:
        return specs
    i = idx + 1
    while i < len(lines) - 1:
        label = lines[i]
        if re.match(r"^[A-ZÀ-Ỹ\s]{3,}$", label):
            i += 1
            continue
        value_parts = []
        j = i + 1
        while j < len(lines):
            nxt = lines[j]
            if re.match(r"^[A-ZÀ-Ỹ\s]{3,}$", nxt):
                break
            if j > i + 1 and re.match(r"^[A-ZÀ-Ỹa-zà-ỹ][^:]{2,40}$", nxt) and not re.search(r"\d", nxt):
                break
            value_parts.append(nxt)
            j += 1
        if value_parts:
            specs[label] = " ".join(value_parts)
        i = j
    return specs


def extract_price(soup):
    text = soup.get_text(" ", strip=True)
    m = re.search(r"([\d.,]+)\s*vnd", text, re.I)
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
    row = schema.empty_row("Kymco", model, variant, vtype, "ICE", source_url, version=version)
    row["model_year"] = "2025"
    row["price_vnd"] = clean.parse_price_vnd(price_raw)
    row["engine_displacement_cc"] = clean.parse_displacement_cc(find_spec(specs, "Thể tích làm việc", "Phân khối", "Dung tích"))
    row["max_power_kw"] = clean.parse_power_kw(find_spec(specs, "Công suất lớn nhất", "Công suất cực đại", "Công suất"))
    row["max_torque_nm"] = clean.parse_torque_nm(find_spec(specs, "Mô men xoắn lớn nhất", "Mô men"))
    row["fuel_consumption_l_per_100km"] = clean.parse_fuel_consumption_l100km(
        find_spec(specs, "Mức tiêu thụ nhiên liệu", "Mức nhiên liệu"))
    row["fuel_tank_capacity_l"] = clean.parse_battery_kwh(find_spec(specs, "Dung tích bình xăng"))
    ph = find_spec(specs, "Hệ thống phanh", "Phanh") or ""
    row["front_brake_type"] = clean.brake_type(ph)
    row["rear_brake_type"] = clean.brake_type(ph)
    row["abs"] = clean.is_abs(ph)
    row["abs_channel"] = clean.abs_channel(ph)
    row["cbs"] = clean.is_cbs(ph)
    row["curb_weight_kg"] = clean.parse_curb_weight_kg(find_spec(specs, "Trọng Lượng", "Trọng lượng"))
    row["seat_height_mm"] = clean.parse_seat_height_mm(find_spec(specs, "Chiều cao yên"))
    row["ground_clearance_mm"] = clean.parse_dimension_mm(find_spec(specs, "gầm", "Khoảng cách gầm"))
    l, w, h = clean.parse_lxhxh(find_spec(specs, "Dài x rộng", "Dài x"))
    row["length_mm"], row["width_mm"], row["height_mm"] = l, w, h
    row["wheelbase_mm"] = clean.parse_dimension_mm(find_spec(specs, "Khoảng cách trục"))
    return row


def infer_vtype(slug):
    if "kpipe" in slug:
        return "xe số"
    return "xe tay ga"


def scrape_all():
    results = []
    for slug in discover_products():
        try:
            url, soup = fetch_model(slug)
            specs = parse_specs(soup)
            price = extract_price(soup)
            name = model_name_from_slug(slug)
            # version = the Fi suffix if present (e.g. Hermosa 50Fi)
            version = None
            if slug.endswith("fi"):
                version = "50Fi" if "50" in slug else "Fi"
            results.append(build_row(name, name, version, infer_vtype(slug), url, specs, price))
        except Exception as e:
            print(f"  [Kymco] {slug} ERROR: {e}")
    return results