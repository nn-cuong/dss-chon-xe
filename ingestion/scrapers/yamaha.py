"""Yamaha Motor Vietnam scraper (official site).

Source: https://yamaha-motor.com.vn/xe/
Specs are in <li> with <p class="lttl"> (label) and <p class="text"> (value).
Models have multiple variants linked in <ul class="ver-list">.
"""
import re
from bs4 import BeautifulSoup
from http_client import get
import clean
import schema

BASE = "https://yamaha-motor.com.vn/xe/"

# (slug, model, vehicle_type)
MODELS = [
    ("grande-phien-ban-tieu-chuan-mau-moi-nhat-2025-bjjd", "Grande", "xe tay ga"),
    ("exciter-155-vva-tcs-phien-ban-sp-d191", "Exciter", "xe côn tay"),
    ("gear-125-hybrid-phien-ban-cao-cap-df92", "GEAR", "xe tay ga"),
    ("lexi-155-vva-abs-phien-ban-cao-cap-moi-bvy4", "Lexi", "xe tay ga"),
    ("freego-s-abs-phien-ban-dac-biet-mau-moi-b4uc", "Freego", "xe tay ga"),
    ("jupiter-finn-phien-ban-cao-cap-mau-moi-bpc6", "Jupiter", "xe số"),
    ("janus-phien-ban-dac-biet-mau-moi-2025-bj7x-2", "Janus", "xe tay ga"),
    ("latte-phien-ban-tieu-chuan-mau-moi-2025-b0r7", "Latte", "xe tay ga"),
]


def fetch_page(url):
    r = get(url)
    return BeautifulSoup(r.text, "html.parser")


def get_variant_links(soup):
    """Return list of (url, variant_name) from ver-list."""
    links = []
    for ul in soup.find_all("ul", class_="ver-list"):
        for a in ul.find_all("a", href=True):
            href = a["href"]
            name = a.get_text(" ", strip=True)
            if href and name:
                links.append((href, name))
    return links


def parse_specs(soup):
    specs = {}
    for li in soup.find_all("li"):
        lttl = li.find("p", class_="lttl")
        text = li.find("p", class_="text")
        if lttl and text:
            specs[lttl.get_text(" ", strip=True)] = text.get_text(" ", strip=True)
    return specs


def extract_price(soup):
    text = soup.get_text(" ", strip=True)
    m = re.search(r"Giá\s+bán\s+lẻ\s+đề\s+xuất\s+([\d.,]+)\s*VNĐ", text, re.I)
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


def build_row(model, variant, version, vehicle_type, source_url, specs, price_raw):
    row = schema.empty_row("Yamaha", model, variant, vehicle_type, "ICE", source_url, version=version)
    row["price_vnd"] = clean.parse_price_vnd(price_raw)
    row["engine_displacement_cc"] = clean.parse_displacement_cc(find_spec(specs, "Dung tích xy lanh", "Dung tích xy lnh"))
    row["max_power_kw"] = clean.parse_power_kw(find_spec(specs, "Công suất tối đa", "Công suất"))
    row["max_torque_nm"] = clean.parse_torque_nm(find_spec(specs, "Mô men xoắn cực đại", "Momen"))
    row["fuel_consumption_l_per_100km"] = clean.parse_fuel_consumption_l100km(
        find_spec(specs, "Mức tiêu thụ nhiên liệu"))
    row["fuel_tank_capacity_l"] = clean.parse_battery_kwh(find_spec(specs, "Dung tích bình xăng"))
    fr = find_spec(specs, "Phanh trước") or ""
    rr = find_spec(specs, "Phanh sau")
    row["front_brake_type"] = clean.brake_type(fr)
    row["rear_brake_type"] = clean.brake_type(rr)
    row["abs"] = clean.is_abs(fr + " " + (rr or ""))
    row["abs_channel"] = clean.abs_channel(fr + " " + (rr or ""))
    row["cbs"] = clean.is_cbs(fr + " " + (rr or ""))
    row["curb_weight_kg"] = clean.parse_curb_weight_kg(find_spec(specs, "Trọng lượng ướt", "Trọng"))
    row["seat_height_mm"] = clean.parse_seat_height_mm(find_spec(specs, "Độ cao yên"))
    l, w, h = clean.parse_lxhxh(find_spec(specs, "Kích thước", "Dài x Rộng"))
    row["length_mm"], row["width_mm"], row["height_mm"] = l, w, h
    row["wheelbase_mm"] = clean.parse_dimension_mm(find_spec(specs, "Khoảng cách giữa 2 trục"))
    return row


def split_yamaha_version(model, vname):
    """Split a Yamaha version name into (variant, version).

    Split at the keyword "phiên bản" (case-insensitive), keeping the full
    product name (incl. engine descriptor) as variant.

    e.g. "Exciter 155 VVA TCS Phiên bản SP"     -> ("Exciter 155 VVA TCS", "Phiên bản SP")
         "Grande phiên bản giới hạn màu mới 2025" -> ("Grande", "phiên bản giới hạn màu mới 2025")
         "GEAR 125 Hybrid phiên bản cao cấp"     -> ("GEAR 125 Hybrid", "phiên bản cao cấp")
    """
    low = vname.lower()
    if "phiên bản" in low:
        idx = low.find("phiên bản")
        variant_part = vname[:idx].strip()
        version_part = vname[idx:].strip()
        if variant_part:
            return variant_part, version_part
    return model, vname


def scrape_model(slug, model, vtype):
    """Scrape all variants of a model."""
    results = []
    base_url = BASE + slug
    soup = fetch_page(base_url)
    variants = get_variant_links(soup)
    if not variants:
        # Single-variant model
        specs = parse_specs(soup)
        price = extract_price(soup)
        results.append(build_row(model, model, None, vtype, base_url, specs, price))
        return results
    for url, vname in variants:
        vsoup = fetch_page(url)
        specs = parse_specs(vsoup)
        price = extract_price(vsoup)
        variant, version = split_yamaha_version(model, vname)
        results.append(build_row(model, variant, version, vtype, url, specs, price))
    return results


def scrape_all():
    results = []
    for slug, model, vtype in MODELS:
        try:
            results.extend(scrape_model(slug, model, vtype))
        except Exception as e:
            print(f"  [Yamaha] {model} ERROR: {e}")
    return results