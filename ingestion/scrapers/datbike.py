"""Dat Bike electric scooter scraper (official site).

Source: https://dat.bike/
Note: Dat Bike publishes some specs in text (range, top speed) and the detailed
spec table as an image (not machine-readable). Only text-extractable official
data is captured; unreadable fields stay NULL.
"""
import re
from bs4 import BeautifulSoup
from http_client import get
import clean
import schema

BASE = "https://dat.bike"

MODELS = [
    ("/xe-may-dien-weaver-plus-plus/", "Weaver++", "Weaver++", "xe máy điện"),
    ("/xe-may-dien-weaver-200/", "Weaver 200", "Weaver 200", "xe máy điện"),
    ("/xe-may-dien-quantum-s3/", "Quantum S3", "Quantum S3", "xe máy điện"),
]


def fetch_model(path):
    url = BASE + path
    r = get(url)
    return url, BeautifulSoup(r.text, "html.parser")


def parse_text_specs(soup):
    """Extract text-based specs (range, speed) visible on page."""
    specs = {}
    text = soup.get_text("\n", strip=True)
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    for i, ln in enumerate(lines):
        kl = ln.lower()
        # Prefer the spec row "Quãng đường đi được" -> "NNN km (...)"
        if "quãng đường đi được" in kl and i + 1 < len(lines):
            m = re.search(r"(\d[\d.,]*)\s*km", lines[i + 1])
            if m:
                specs["Quãng đường"] = m.group(1) + " km"
        # Generic "Quãng đường" value (only if not already set from spec row)
        elif "quãng đường" in kl and "quãng đường đi được" not in kl and i + 1 < len(lines):
            m = re.match(r"^(\d[\d.,]*)\s*km$", lines[i + 1])
            if m and "quãng đường" not in specs:
                specs["Quãng đường"] = m.group(1) + " km"
        # Value "200km" then label "Quãng đường" (Weaver++ layout)
        if re.match(r"^(\d[\d.,]*)\s*km$", ln) and i + 1 < len(lines) and "quãng đường" in lines[i + 1].lower():
            if "quãng đường" not in specs:
                specs["Quãng đường"] = ln
        # Top speed
        if "tốc độ" in kl and i + 1 < len(lines) and re.match(r"^\d[\d.,]*\s*km/h$", lines[i + 1]):
            specs["Tốc độ tối đa"] = lines[i + 1]
        if re.match(r"^\d[\d.,]*\s*km/h$", ln) and i + 1 < len(lines) and "tốc" in lines[i + 1].lower():
            specs["Tốc độ tối đa"] = ln
        # Trunk
        if "cốp" in kl and i + 1 < len(lines) and re.match(r"^\d+\s*L$", lines[i + 1]):
            specs["Cốp"] = lines[i + 1]
    return specs


def extract_price_text(soup):
    # Price may be in JSON-LD or page text; Dat Bike official site does not show
    # per-model retail price on the model page.
    return None


def build_row(model, variant, version, vtype, source_url, specs):
    row = schema.empty_row("Dat Bike", model, variant, vtype, "EV", source_url, version=version)
    row["range_km"] = clean.parse_range_km(specs.get("Quãng đường"))
    row["underseat_storage_l"] = clean.parse_battery_kwh(specs.get("Cốp"))
    return row


def scrape_all():
    results = []
    for path, model, variant, vtype in MODELS:
        try:
            url, soup = fetch_model(path)
            specs = parse_text_specs(soup)
            results.append(build_row(model, variant, None, vtype, url, specs))
        except Exception as e:
            print(f"  [Dat Bike] {variant} ERROR: {e}")
    return results