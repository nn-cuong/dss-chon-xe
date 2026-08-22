"""Data cleaning & normalization utilities for the motorbike DSS pipeline.

Implements the conversion rules from the AGENT DIRECTIVE:
- price_million_vnd: strip separators/units, convert to million VND
- max_power_hp: kW -> HP (*1.341), PS/HP kept 1:1
- energy_cost_per_100km_k_vnd: ICE = F*24.0, EV = (E*100/R)*3.0
- trunk_capacity_liters: default 5.0 for bikes without published trunk
- seat_height_mm: integer mm
- brake_safety_score / smartkey_score: categorical encoding
"""
import re

# Assumptions from the directive
GASOLINE_PRICE_VND_PER_L = 24.0   # thousand VND per liter
ELECTRICITY_PRICE_VND_PER_KWH = 3.0  # thousand VND per kWh
KW_TO_HP = 1.341

# Default trunk for bikes without published trunk (xe số / sport)
DEFAULT_TRUNK_LITERS = 5.0


def to_float(value, default=None):
    """Parse a numeric string, handling thousands and decimal separators."""
    if value is None:
        return default
    if isinstance(value, (int, float)):
        return float(value)
    s = str(value).strip()
    if not s:
        return default
    # Remove currency symbols and units
    s = re.sub(r"[^\d.,\-]", "", s)
    if not s:
        return default
    # Determine separators
    has_dot = "." in s
    has_comma = "," in s
    if has_dot and has_comma:
        # Whichever appears last is the decimal separator
        if s.rfind(".") > s.rfind(","):
            # dot is decimal, comma is thousands
            s = s.replace(",", "")
        else:
            # comma is decimal, dot is thousands
            s = s.replace(".", "")
            s = s.replace(",", ".")
    elif has_comma:
        # Only comma: if multiple commas, it's thousands; if single, could be decimal
        if s.count(",") > 1:
            s = s.replace(",", "")
        else:
            s = s.replace(",", ".")
    elif has_dot:
        # Only dot: if multiple dots, they're thousands separators
        if s.count(".") > 1:
            s = s.replace(".", "")
    # Now s should be a plain number with optional single dot
    try:
        return float(s)
    except ValueError:
        return default


def parse_price_million_vnd(text):
    """Convert a price string to million VND.

    Examples:
        "45.990.000 VNĐ" -> 45.99
        "18,5 triệu" -> 18.5
        "26.000.000" -> 26.0
    """
    if text is None:
        return None
    s = str(text).strip()
    # Handle "X triệu" / "X triệu đồng"
    m = re.search(r"([\d.,]+)\s*tr[ií]ệu", s, re.I)
    if m:
        return to_float(m.group(1))
    # Handle full VND amounts
    m = re.search(r"([\d.,]+)", s.replace(" ", ""))
    if not m:
        return None
    num = to_float(m.group(1))
    if num is None:
        return None
    # If the number is large (>= 1000), it's in full VND -> convert to million
    if num >= 1000:
        return round(num / 1_000_000, 2)
    # Otherwise it's already in million VND
    return round(num, 2)


def parse_power_hp(value):
    """Parse max power to HP.

    - If value contains 'kW', convert kW * 1.341
    - If value contains 'PS' or 'HP', keep numeric value
    - If value contains 'W' (EV nominal/max), convert W -> kW -> HP
    """
    if value is None:
        return None
    s = str(value).strip()
    # kW
    m = re.search(r"([\d.,]+)\s*kw", s, re.I)
    if m:
        return round(to_float(m.group(1)) * KW_TO_HP, 2)
    # PS or HP
    m = re.search(r"([\d.,]+)\s*(ps|hp)", s, re.I)
    if m:
        return round(to_float(m.group(1)), 2)
    # Watts (EV) - e.g. "2800 W" or "1800 W"
    m = re.search(r"([\d.,]+)\s*w\b", s, re.I)
    if m:
        watts = to_float(m.group(1))
        return round((watts / 1000) * KW_TO_HP, 2)
    # bare number - assume kW
    m = re.search(r"([\d.,]+)", s)
    if m:
        return round(to_float(m.group(1)) * KW_TO_HP, 2)
    return None


def parse_fuel_consumption_l100km(text):
    """Extract fuel consumption in L/100km from a spec string."""
    if text is None:
        return None
    s = str(text).strip()
    # e.g. "1.87 L/100km", "2.41L/ 100KM", "1,72 l/100km"
    m = re.search(r"([\d.,]+)\s*(?:l|lit|litre|liter)?\s*/\s*100\s*km", s, re.I)
    if m:
        return to_float(m.group(1))
    # e.g. "1.73" (bare value, assume L/100km)
    m = re.search(r"([\d.,]+)", s)
    if m:
        return to_float(m.group(1))
    return None


def parse_battery_kwh(text):
    """Extract battery capacity in kWh from an EV spec value."""
    if text is None:
        return None
    s = str(text).strip()
    # e.g. "2.4 kWh", "3.5 kWh"
    m = re.search(r"([\d.,]+)\s*kwh", s, re.I)
    if m:
        return to_float(m.group(1))
    # e.g. "72V50Ah" -> 72*50/1000 = 3.6 kWh
    m = re.search(r"(\d+)\s*[vV]\s*(\d+)\s*[aA]h", s)
    if m:
        volts = to_float(m.group(1))
        amp_hours = to_float(m.group(2))
        return round(volts * amp_hours / 1000, 2)
    return None


def parse_range_km(text):
    """Extract range in km per full charge/tank."""
    if text is None:
        return None
    s = str(text).strip()
    m = re.search(r"([\d.,]+)\s*km", s, re.I)
    if m:
        return to_float(m.group(1))
    m = re.search(r"([\d.,]+)", s)
    if m:
        return to_float(m.group(1))
    return None


def parse_trunk_liters(text, is_scooter=True):
    """Extract trunk capacity in liters. Default 5.0 for xe số without trunk."""
    if text is None:
        return DEFAULT_TRUNK_LITERS if not is_scooter else None
    s = str(text).strip()
    m = re.search(r"([\d.,]+)\s*(?:l|lit|litre|liter)", s, re.I)
    if m:
        return to_float(m.group(1))
    m = re.search(r"([\d.,]+)", s)
    if m:
        return to_float(m.group(1))
    return DEFAULT_TRUNK_LITERS if not is_scooter else None


def parse_seat_height_mm(text):
    """Extract seat height in mm (first plausible seat height value)."""
    if text is None:
        return None
    s = str(text).strip()
    # Collect all numbers, take the one that looks like a seat height (200-1200mm)
    nums = [to_float(m.group(1)) for m in re.finditer(r"(\d[\d.,]*)", s)]
    for n in nums:
        if n is not None and 200 <= n <= 1200:
            return n
    return None


def parse_curb_weight_kg(text):
    """Extract curb weight in kg."""
    if text is None:
        return None
    s = str(text).strip()
    m = re.search(r"([\d.,]+)\s*kg", s, re.I)
    if m:
        return to_float(m.group(1))
    m = re.search(r"([\d.,]+)", s)
    if m:
        return to_float(m.group(1))
    return None


def brake_safety_score(brake_text):
    """Encode brake system to a 1-4 safety score."""
    if brake_text is None:
        return 1
    s = str(brake_text).lower()
    if "abs" in s:
        return 4
    if "cbs" in s or ("đĩa" in s and "đĩa" in s):
        return 3
    if "đĩa" in s:
        return 2
    return 1


def is_abs(text):
    """Return True if ABS is present in text."""
    if text is None:
        return None
    return "abs" in str(text).lower()


def abs_channel(text):
    """Return ABS channel count (None if unknown)."""
    if text is None:
        return None
    s = str(text).lower()
    if "2" in s or "two" in s or "kênh" in s:
        return 2
    if "1" in s:
        return 1
    return None


def is_cbs(text):
    """Return True if CBS present."""
    if text is None:
        return None
    return "cbs" in str(text).lower()


def brake_type(text):
    """Classify brake as 'Disc' or 'Drum'."""
    if text is None:
        return None
    s = str(text).lower()
    if "đĩa" in s or "disc" in s:
        return "Disc"
    if "tang" in s or "trống" in s or "drum" in s:
        return "Drum"
    return None


def smartkey_score(key_text):
    """Encode smart key system to 1-2 score."""
    if key_text is None:
        return 1
    s = str(key_text).lower()
    if any(k in s for k in ["smart", "app", "nfc", "bluetooth", "thông minh", "remote", "khóa thông"]):
        return 2
    return 1


def energy_cost_per_100km(engine_type, fuel_l100km=None, battery_kwh=None, range_km=None):
    """Compute energy cost per 100km in thousand VND.

    ICE: cost = fuel_l100km * 24.0
    EV:  E100 = (battery_kwh * 100) / range_km; cost = E100 * 3.0
    """
    if engine_type == "EV":
        if battery_kwh is None or range_km is None or range_km <= 0:
            return None
        e100 = (battery_kwh * 100) / range_km
        return round(e100 * ELECTRICITY_PRICE_VND_PER_KWH, 2)
    else:
        if fuel_l100km is None:
            return None
        return round(fuel_l100km * GASOLINE_PRICE_VND_PER_L, 2)


def parse_displacement_cc(text):
    """Extract engine displacement in cc."""
    if text is None:
        return None
    s = str(text).strip()
    m = re.search(r"([\d.,]+)\s*cc", s, re.I)
    if m:
        return to_float(m.group(1))
    m = re.search(r"([\d.,]+)\s*(cm3|cm³)", s, re.I)
    if m:
        return to_float(m.group(1))
    return None


def parse_power_kw(value):
    """Parse max power in kW. Prefer kW; if HP/PS given, convert HP/PS -> kW."""
    if value is None:
        return None
    s = str(value).strip()
    # kW (possibly with PS/HP alongside)
    m = re.search(r"([\d.,]+)\s*kw", s, re.I)
    if m:
        return to_float(m.group(1))
    # HP
    m = re.search(r"([\d.,]+)\s*hp", s, re.I)
    if m:
        return round(to_float(m.group(1)) * 0.7457, 2)
    # PS
    m = re.search(r"([\d.,]+)\s*ps", s, re.I)
    if m:
        return round(to_float(m.group(1)) * 0.7355, 2)
    # Watts
    m = re.search(r"([\d.,]+)\s*w\b", s, re.I)
    if m:
        return round(to_float(m.group(1)) / 1000, 2)
    # Bare number - assume kW
    m = re.search(r"([\d.,]+)", s)
    if m:
        return to_float(m.group(1))
    return None


def parse_torque_nm(text):
    """Extract max torque in N·m."""
    if text is None:
        return None
    s = str(text).strip()
    m = re.search(r"([\d.,]+)\s*(?:n\s*[·.]?\s*m|nm)", s, re.I)
    if m:
        return to_float(m.group(1))
    # bare number with rpm following
    m = re.search(r"([\d.,]+)\s*/\s*\d", s)
    if m:
        return to_float(m.group(1))
    return None


def parse_dimension_mm(text):
    """Extract numeric part (assumed mm)."""
    if text is None:
        return None
    s = str(text).strip()
    m = re.search(r"([\d.,]+)\s*mm", s, re.I)
    if m:
        return to_float(m.group(1))
    m = re.search(r"([\d.,]+)", s)
    if m:
        return to_float(m.group(1))
    return None


def parse_lxhxh(text):
    """Parse 'L x W x H' dimensions -> (length_mm, width_mm, height_mm)."""
    if text is None:
        return (None, None, None)
    s = str(text).strip()
    vals = re.findall(r"([\d.,]+)", s)
    nums = [to_float(v) for v in vals]
    nums = [n for n in nums if n is not None]
    if len(nums) >= 3:
        return (nums[0], nums[1], nums[2])
    return (None, None, None)


def parse_price_vnd(text):
    """Parse price to full VND (integer). Returns None if not parseable."""
    if text is None:
        return None
    s = str(text).strip()
    m = re.search(r"([\d.,]+)\s*tr[ií]ệu", s, re.I)
    if m:
        return int(to_float(m.group(1)) * 1_000_000)
    nums = re.findall(r"([\d.,]+)", s.replace(" ", ""))
    if not nums:
        return None
    # Use the largest number as the full VND price
    vals = [to_float(n) for n in nums]
    vals = [v for v in vals if v is not None]
    if not vals:
        return None
    best = max(vals)
    if best >= 1_000_000:
        return int(best)
    if best >= 1000:
        return int(best * 1000)  # interpret as thousand VND? unlikely
    return None


def parse_warranty_month_km(text):
    """Extract (months, km) from warranty text like '3 năm hoặc 30.000km'."""
    if text is None:
        return (None, None)
    s = str(text).strip()
    months = None
    km = None
    m = re.search(r"(\d+)\s*(?:tháng|months)", s, re.I)
    if m:
        months = int(m.group(1))
    else:
        m = re.search(r"(\d+)\s*(?:năm|year)", s, re.I)
        if m:
            months = int(m.group(1)) * 12
    m = re.search(r"([\d.,]+)\s*km", s, re.I)
    if m:
        km = int(to_float(m.group(1)))
    return (months, km)


def parse_battery_type(text):
    """Extract battery chemistry (LFP/Lithium/NMC etc)."""
    if text is None:
        return None
    s = str(text).strip()
    for t in ["LFP", "NMC", "Li-ion", "Lithium", "Graphene"]:
        if t.lower() in s.lower():
            return t
    if "pin" in s.lower():
        return s.strip()
    return None


def parse_charging_time_h(text):
    """Extract charging time in hours (handles 6h30, 6 giờ 30 phút, 7-8h)."""
    if text is None:
        return None
    s = str(text).strip().lower()
    # "6h30" / "6h30 phút"
    m = re.search(r"(\d[\d.,]*)[h]\s*(\d{1,2})?", s)
    if m:
        hours = to_float(m.group(1))
        if m.group(2):
            return round(hours + int(m.group(2)) / 60, 2)
        return hours
    # "6 giờ 30 phút"
    m = re.search(r"(\d[\d.,]*)\s*giờ\s*(\d{1,2})?\s*phút", s)
    if m:
        hours = to_float(m.group(1))
        if m.group(2):
            return round(hours + int(m.group(2)) / 60, 2)
        return hours
    # "6 giờ" / "6h" / "7-8h"
    m = re.search(r"(\d[\d.,]*)\s*(?:giờ|h|hr|hour)", s)
    if m:
        return to_float(m.group(1))
    return None