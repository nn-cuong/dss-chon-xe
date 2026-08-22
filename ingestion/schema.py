"""Rich dataset schema for motorbike extraction.

Rule: only official-brand data; missing data stays NULL (never 0);
1 record = 1 variant; store source URL and collection date.
"""
import datetime

# Full column schema
COLUMNS = [
    # --- Info ---
    "brand",
    "model",
    "variant",
    "version",
    "vehicle_type",       # xe số / xe tay ga / xe côn tay / xe máy điện
    "powertrain",         # ICE / EV
    "model_year",
    "official_url",
    "source_date",
    # --- Price ---
    "price_vnd",
    # --- ICE fields ---
    "engine_displacement_cc",
    "max_power_kw",
    "max_torque_nm",
    "fuel_consumption_l_per_100km",
    "fuel_tank_capacity_l",
    # --- EV fields ---
    "battery_capacity_kwh",
    "battery_type",
    "motor_power_kw",
    "range_km",
    "charging_time_h",
    "charging_method",
    "removable_battery",
    "battery_warranty_months",
    "battery_warranty_km",
    # --- Safety ---
    "front_brake_type",
    "rear_brake_type",
    "abs",
    "abs_channel",
    "cbs",
    "traction_control",
    # --- Convenience ---
    "underseat_storage_l",
    # --- Dimensions ---
    "curb_weight_kg",
    "seat_height_mm",
    "ground_clearance_mm",
    "length_mm",
    "width_mm",
    "height_mm",
    "wheelbase_mm",
    # --- Warranty ---
    "vehicle_warranty_months",
    "vehicle_warranty_km",
]


def source_date():
    return datetime.date.today().isoformat()


def empty_row(brand, model, variant, vehicle_type, powertrain, official_url, version=None):
    """Create a row with all fields NULL except core identifiers."""
    row = {col: None for col in COLUMNS}
    row["brand"] = brand
    row["model"] = model
    row["variant"] = variant
    row["version"] = version
    row["vehicle_type"] = vehicle_type
    row["powertrain"] = powertrain
    row["official_url"] = official_url
    row["source_date"] = source_date()
    return row