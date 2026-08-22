"""VinFast electric scooter scraper (official site).

Source: https://shop.vinfastauto.com/vn_vi/xe-may-dien-vinfast.html
All EV products discovered from the listing page.
Specs are <li> with two <span>, or <li> with <h3>+<span>, or <div class="item">.
"""
import re
from bs4 import BeautifulSoup
from http_client import get
import clean
import schema

BASE = "https://shop.vinfastauto.com/vn_vi"
LISTING = "https://shop.vinfastauto.com/vn_vi/xe-may-dien-vinfast.html"

# default display model name per slug (only slugs with valid spec pages)
SLUG_MODEL = {
    "xe-may-dien-feliz": "Feliz",
    "xe-may-dien-evo-grand": "Evo Grand",
    "xe-may-dien-evo-grand-lite": "Evo Grand Lite",
    "xe-may-dien-evo-lite-neo": "Evo Lite Neo",
    "xe-may-dien-flazz": "Flazz",
    "xe-may-dien-zgoo": "ZGoo",
    "xe-may-dien-verox": "Vero X",
}


def discover_products():
    r = get(LISTING)
    soup = BeautifulSoup(r.text, "html.parser")
    slugs = set()
    for a in soup.find_all("a", href=True):
        m = re.search(r"/(xe-may-dien-[a-z0-9\-]+)\.html", a["href"])
        if m:
            slugs.add(m.group(1))
    # Keep only slugs with a known spec page (skip listing/redirect pages)
    return sorted(slugs & set(SLUG_MODEL.keys()))


def fetch_model(path):
    url = BASE + "/" + path + ".html"
    r = get(url)
    return url, BeautifulSoup(r.text, "html.parser")


def parse_specs(soup):
    specs = {}
    container = soup.find(id="tabInfoProduct") or soup.find(class_="specs-table") or soup
    items = container.find_all("li") + container.find_all("div", class_="item")
    for item in items:
        spans = item.find_all("span")
        if len(spans) >= 2:
            label = spans[0].get_text(" ", strip=True)
            value = spans[1].get_text(" ", strip=True)
            if label and value and label not in specs:
                specs[label] = value
            continue
        if len(spans) == 1 and item.find("h3"):
            label = item.find("h3").get_text(" ", strip=True)
            value = spans[0].get_text(" ", strip=True)
            if label and value and label not in specs:
                specs[label] = value
    return specs


def extract_price(soup):
    text = soup.get_text(" ", strip=True)
    m = re.search(r"Giá\s+niêm\s+yết:\s*([\d.,]+)\s*VNĐ", text, re.I)
    if m:
        return m.group(1)
    m = re.search(r"([\d.,]+)\s*VNĐ", text)
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
    row = schema.empty_row("VinFast", model, variant, vtype, "EV", source_url, version=version)
    row["price_vnd"] = clean.parse_price_vnd(price_raw)
    row["battery_capacity_kwh"] = clean.parse_battery_kwh(
        find_spec(specs, "Dung lượng pin", "Dung lượng ắc quy", "Công suất/Dung lượng"))
    row["battery_type"] = clean.parse_battery_type(find_spec(specs, "Loại Pin", "Loại pin"))
    max_power_text = find_spec(specs, "Công suất tối đa", "Công suất lớn nhất")
    if max_power_text is None:
        max_power_text = find_spec(specs, "Công suất danh định", "Công suất")
    row["motor_power_kw"] = clean.parse_power_kw(max_power_text)
    row["max_torque_nm"] = clean.parse_torque_nm(find_spec(specs, "Mô men xoắn", "Momen"))
    range_text = find_spec(specs, "Quãng đường đi được", "Quãng đường di chuyển")
    row["range_km"] = clean.parse_range_km(range_text)
    row["charging_time_h"] = clean.parse_charging_time_h(find_spec(specs, "Thời gian sạc"))
    row["charging_method"] = find_spec(specs, "Loại sạc", "Phương thức sạc")
    pin_pos = find_spec(specs, "Vị trí lắp pin")
    row["removable_battery"] = "Có" if ("tháo" in (pin_pos or "").lower()) else None
    fr = find_spec(specs, "Phanh trước", "Phanh") or ""
    rr = find_spec(specs, "Phanh sau", "Phanh")
    row["front_brake_type"] = clean.brake_type(fr)
    row["rear_brake_type"] = clean.brake_type(rr)
    row["abs"] = clean.is_abs(fr + " " + (rr or ""))
    row["abs_channel"] = clean.abs_channel(fr + " " + (rr or ""))
    row["cbs"] = clean.is_cbs(fr + " " + (rr or ""))
    row["underseat_storage_l"] = clean.parse_battery_kwh(find_spec(specs, "Thể tích cốp", "Dung tích cốp", "Cốp"))
    weight_text = find_spec(specs, "Trọng lượng xe")
    if weight_text is None:
        for k, v in specs.items():
            if "trọng lượng" in k.lower() and "pin" not in k.lower():
                weight_text = v
                break
    row["curb_weight_kg"] = clean.parse_curb_weight_kg(weight_text)
    row["seat_height_mm"] = clean.parse_seat_height_mm(find_spec(specs, "Chiều cao yên"))
    row["ground_clearance_mm"] = clean.parse_dimension_mm(find_spec(specs, "Khoảng sáng gầm"))
    l, w, h = clean.parse_lxhxh(find_spec(specs, "Dài x Rộng x Cao"))
    row["length_mm"], row["width_mm"], row["height_mm"] = l, w, h
    row["wheelbase_mm"] = clean.parse_dimension_mm(find_spec(specs, "Khoảng cách trục"))
    return row


def scrape_all():
    results = []
    for slug in discover_products():
        if slug == "xe-may-dien-vinfast" or slug not in SLUG_MODEL:
            continue
        try:
            url, soup = fetch_model(slug)
            specs = parse_specs(soup)
            price = extract_price(soup)
            name = SLUG_MODEL[slug]
            results.append(build_row(name, name, None, "xe tay ga", url, specs, price))
        except Exception as e:
            print(f"  [VinFast] {slug} ERROR: {e}")
    return results