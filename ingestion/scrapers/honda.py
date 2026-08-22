"""Honda Vietnam scraper (official site).

Source: https://www.honda.com.vn/xe-may/san-pham
Specs are in <div class="spec-item"> with label/value pairs.
Many models have multiple variants selected via ?version=N.
Official URL and collection date are captured per record.
"""
import re
from bs4 import BeautifulSoup
from http_client import get
import clean
import schema

BASE = "https://www.honda.com.vn/xe-may/san-pham"
LISTING = "https://www.honda.com.vn/xe-may/san-pham"

# Skip big bikes / high-cc bikes (focus on xe số, xe tay ga, xe côn tay phổ thông)
SKIP_SLUGS = {
    "adv350", "africa-twin-2026-ban-adventure-sports", "africa-twin-2026-ban-tieu-chuan",
    "cb1000-hornet", "cb350-hness", "cb500-hornet", "cb650r-2024", "cbr1000rr-r-fireblade-sp-2024",
    "cbr500r-2024", "cbr650r-2024", "cl500", "ct125", "gold-wing-2025", "nx500",
    "rebel-1100-2025", "rebel-500-2025", "sh350i", "super-cub-c125", "transalp-2025",
}


def discover_products():
    """Discover all product slugs from the official listing page."""
    soup = fetch_page(LISTING)
    slugs = set()
    for a in soup.find_all("a", href=True):
        href = a["href"]
        m = re.search(r"/xe-may/san-pham/([a-z0-9\-]+)", href)
        if m:
            slugs.add(m.group(1))
    # exclude listing page itself
    slugs.discard("san-pham")
    return sorted(slugs - SKIP_SLUGS)


def fetch_page(url):
    r = get(url)
    return BeautifulSoup(r.text, "html.parser")


def get_versions(soup):
    """Return list of (version_id, variant_name) from the version selector."""
    sel = soup.find("select", {"name": "version"})
    if not sel:
        return []
    versions = []
    for o in sel.find_all("option"):
        vid = o.get("value")
        name = o.get_text(" ", strip=True)
        if vid and name:
            versions.append((vid, name))
    return versions


def extract_specs(soup):
    specs = {}
    for item in soup.find_all("div", class_="spec-item"):
        label = item.find(class_="spec-item-label")
        value = item.find(class_="spec-item-value")
        if label and value:
            specs[label.get_text(" ", strip=True)] = value.get_text(" ", strip=True)
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


def build_row(model, variant, version, vehicle_type, year, source_url, specs, price_raw):
    row = schema.empty_row("Honda", model, variant, vehicle_type, "ICE", source_url, version=version)
    row["model_year"] = year
    row["price_vnd"] = clean.parse_price_vnd(price_raw)
    row["engine_displacement_cc"] = clean.parse_displacement_cc(find_spec(specs, "Dung tích xy-lanh"))
    row["max_power_kw"] = clean.parse_power_kw(find_spec(specs, "Công suất tối đa", "Công suất"))
    row["max_torque_nm"] = clean.parse_torque_nm(find_spec(specs, "Moment cực đại", "Mô men xoắn"))
    row["fuel_consumption_l_per_100km"] = clean.parse_fuel_consumption_l100km(
        find_spec(specs, "Mức tiêu thụ nhiên liệu", "Tiêu hao"))
    row["fuel_tank_capacity_l"] = clean.parse_battery_kwh(find_spec(specs, "Dung tích bình xăng"))
    fr = find_spec(specs, "Phanh trước", "Phanh") or ""
    rr = find_spec(specs, "Phanh sau", "Phanh")
    row["front_brake_type"] = clean.brake_type(fr)
    row["rear_brake_type"] = clean.brake_type(rr)
    row["abs"] = clean.is_abs(fr + " " + (rr or ""))
    row["abs_channel"] = clean.abs_channel(fr + " " + (rr or ""))
    row["cbs"] = clean.is_cbs(fr + " " + (rr or ""))
    row["curb_weight_kg"] = clean.parse_curb_weight_kg(find_spec(specs, "Khối lượng bản thân", "Trọng"))
    row["seat_height_mm"] = clean.parse_seat_height_mm(find_spec(specs, "Độ cao yên", "Chiều cao yên"))
    row["ground_clearance_mm"] = clean.parse_dimension_mm(find_spec(specs, "Khoảng sáng gầm"))
    l, w, h = clean.parse_lxhxh(find_spec(specs, "Dài x Rộng x Cao"))
    row["length_mm"], row["width_mm"], row["height_mm"] = l, w, h
    row["wheelbase_mm"] = clean.parse_dimension_mm(find_spec(specs, "Khoảng cách trục", "trục bánh"))
    return row


# Explicit model-name overrides for special slugs
SLUG_MODEL_NAME = {
    "wave-alpha-phien-ban-co-dien": "Wave Alpha",
    "sh160i125i": "SH",
    "lead-abs": "LEAD",
    "winner-r": "WINNER",
    "cbr150r": "CBR",
    "vario-125": "Vario",
    "vario-160": "Vario",
    "wave-alpha-110": "Wave Alpha",
    "wave-rsx": "Wave RSX",
    "air-blade-160125": "Air Blade",
    "sh-mode-125": "SH Mode",
}

# Slug-based vehicle type overrides for models whose specs don't expose it
SLUG_VEHICLE_TYPE = {
    "winner-r": "xe côn tay",
    "cbr150r": "xe côn tay",
    "wave-alpha-110": "xe số",
    "wave-alpha-phien-ban-co-dien": "xe số",
    "wave-rsx": "xe số",
    "future-125-fi": "xe số",
    "blade": "xe số",
    "vision": "xe tay ga",
    "air-blade-160125": "xe tay ga",
    "vario-125": "xe tay ga",
    "vario-160": "xe tay ga",
    "sh160i125i": "xe tay ga",
    "sh-mode-125": "xe tay ga",
    "lead-abs": "xe tay ga",
}


def infer_vehicle_type(slug, specs):
    """Determine vehicle type from slug override or spec data."""
    if slug in SLUG_VEHICLE_TYPE:
        return SLUG_VEHICLE_TYPE[slug]
    transmission = ""
    for k, v in specs.items():
        kl = k.lower()
        if "truyền động" in kl or "hộp số" in kl:
            transmission += " " + v.lower()
        if "ly hợp" in kl or "côn" in k.lower():
            transmission += " " + v.lower()
    if "tự động" in transmission or "vô cấp" in transmission or "cvt" in transmission:
        return "xe tay ga"
    if "côn" in transmission or "ly hợp" in transmission:
        return "xe côn tay"
    if "số" in transmission:
        return "xe số"
    return "xe tay ga"


def model_name_from_slug(slug):
    """Derive a display model name from the slug, with explicit overrides."""
    if slug in SLUG_MODEL_NAME:
        return SLUG_MODEL_NAME[slug]
    parts = slug.split("-")
    name_parts = []
    for p in parts:
        if p.isdigit() and name_parts:
            break
        name_parts.append(p)
    raw = " ".join(name_parts)
    # Title-case but preserve known acronyms
    known = {"sh": "SH", "cbr": "CBR", "lead": "LEAD", "wave": "Wave",
             "blade": "Blade", "future": "Future", "vision": "Vision",
             "vario": "Vario", "air": "Air", "winner": "WINNER",
             "rsx": "RSX"}
    words = []
    for w in raw.split():
        words.append(known.get(w.lower(), w.title()))
    return " ".join(words) or slug


def split_honda_version(model, vname):
    """Split a Honda version name into (variant, version).

    e.g. "Air Blade 160 phiên bản Thể Thao" -> ("Air Blade 160", "phiên bản Thể Thao")
         "SH160i Phiên bản Thể Thao"        -> ("SH160i", "Phiên bản Thể Thao")
         "Phiên bản Thể Thao" (Blade)        -> (model, "Phiên bản Thể Thao")
         "Street" (Vario)                     -> (model, "Street")
    """
    low = vname.lower()
    if "phiên bản" in low:
        idx = low.find("phiên bản")
        variant_part = vname[:idx].strip()
        version_part = vname[idx:].strip()
        if variant_part:
            return variant_part, version_part
        return model, version_part
    return model, vname


def scrape_all():
    results = []
    year = "2025"
    for slug in discover_products():
        try:
            base_url = f"{BASE}/{slug}?category=2"
            soup = fetch_page(base_url)
            versions = get_versions(soup)
            model = model_name_from_slug(slug)
            if not versions:
                # Single-variant model
                specs = extract_specs(soup)
                price = extract_price(soup)
                vtype = infer_vehicle_type(slug, specs)
                results.append(build_row(model, model, None, vtype, year, base_url, specs, price))
                continue
            for vid, vname in versions:
                url = f"{base_url}&version={vid}"
                vsoup = fetch_page(url)
                specs = extract_specs(vsoup)
                price = extract_price(vsoup)
                vtype = infer_vehicle_type(slug, specs)
                variant, version = split_honda_version(model, vname)
                results.append(build_row(model, variant, version, vtype, year, url, specs, price))
        except Exception as e:
            print(f"  [Honda] {slug} ERROR: {e}")
    return results