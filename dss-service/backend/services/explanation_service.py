"""Decision explanation service.

Produces human-readable Vietnamese explanations for the top-ranked motorbike,
highlighting the criteria where it beats the runner-up. Also provides a
per-candidate What-If analysis of how ranking would change.
"""
from typing import Any, Dict, List, Optional


class DecisionExplainer:
    """Generates explainable reasoning for TOPSIS ranking results."""

    CRITERIA_NAMES: Dict[str, str] = {
        "price_vnd": "Giá bán",
        "fuel_consumption_l_per_100km": "Mức tiêu hao nhiên liệu",
        "max_power_kw": "Công suất động cơ",
        "underseat_storage_l": "Độ rộng cốp xe",
        "abs": "Hệ thống phanh ABS",
        "curb_weight_kg": "Trọng lượng dắt xe",
        "vehicle_warranty_months": "Thời gian bảo hành",
        "battery_capacity_kwh": "Dung lượng pin",
        "range_km": "Quãng đường di chuyển",
    }

    @staticmethod
    def explain_choice(
        top_1: Dict[str, Any],
        top_2: Optional[Dict[str, Any]],
        criteria_cols: List[str],
        weights: List[float],
        benefit_mask: List[bool],
    ) -> str:
        """Build a natural-language explanation of the top choice."""
        name1 = DecisionExplainer._bike_label(top_1)
        if not top_2:
            return (
                f"Xe {name1} là lựa chọn duy nhất phù hợp với điều kiện lọc "
                "nên được xếp hạng đầu tiên."
            )

        # Order criteria by importance (descending weight).
        order = sorted(range(len(weights)), key=lambda i: weights[i], reverse=True)

        # Pick the most important criteria where Top 1 beats Top 2.
        advantages = []
        for idx in order:
            crit = criteria_cols[idx]
            val1 = top_1.get(crit)
            val2 = top_2.get(crit)
            try:
                v1 = float(val1)
                v2 = float(val2)
            except (TypeError, ValueError):
                continue
            is_benefit = benefit_mask[idx]
            better = (v1 > v2) if is_benefit else (v1 < v2)
            if better:
                advantages.append(
                    f"{DecisionExplainer.CRITERIA_NAMES.get(crit, crit)} "
                    f"({name1}: {DecisionExplainer._fmt(v1, crit)} vs "
                    f"{DecisionExplainer._name_bike(top_2)}: {DecisionExplainer._fmt(v2, crit)})"
                )
            if len(advantages) >= 3:
                break

        score1 = float(top_1.get("topsis_score", 0))
        name2 = DecisionExplainer._name(top_2)
        if advantages:
            detail = "; ".join(advantages) + "."
        else:
            detail = "sự kết hợp tổng thể của các tiêu chí (với trọng số ưu tiên của bạn)."

        text = (
            f"Lựa chọn tối ưu là **{name1}** với điểm tương đồng TOPSIS Ci = {score1:.4f}. "
            f"Mẫu xe này vượt trội so với **{name2}** ở các tiêu chí quan trọng bạn "
            f"ưu tiên cao: {detail}"
        )
        return text

    @staticmethod
    def what_if(
        top_1: Dict[str, Any],
        delta: Dict[str, float],
        criteria_cols: List[str],
    ) -> List[Dict[str, Any]]:
        """Simulate a change in top-1 criteria values (sensitivity analysis).

        Returns a list of per-criterion messages describing the impact.
        """
        messages: List[Dict[str, Any]] = []
        name = DecisionExplainer._name(top_1)
        for crit in criteria_cols:
            if crit in delta:
                try:
                    old = float(top_1.get(crit))
                    new = float(delta[crit])
                except (TypeError, ValueError):
                    continue
                messages.append({
                    "criterion": crit,
                    "label": DecisionExplainer.CRITERIA_NAMES.get(crit, crit),
                    "old_value": old,
                    "new_value": new,
                    "impact": f"{name}: {crit} thay đổi từ {old:.2f} → {new:.2f}.",
                })
        return messages

    # -- helpers ------------------------------------------------------------
    @staticmethod
    def _name(row: Dict[str, Any]) -> str:
        return DecisionExplainer._bike_label(row)

    @staticmethod
    def _bike_label(row: Dict[str, Any]) -> str:
        for key in ("model_name", "bike_name", "variant", "model"):
            if row.get(key):
                return str(row[key])
        return "Xe"

    @staticmethod
    def _name_bike(row: Dict[str, Any]) -> str:
        return DecisionExplainer._bike_label(row)

    @staticmethod
    def _fmt(value: Any, crit: str = "") -> str:
        try:
            val = float(value)
            if crit == "price_vnd":
                return f"{int(val):,}".replace(",", ".") + " VNĐ"
            # Format numbers like 3.00 to just 3 if they are whole, else 3.50
            if val.is_integer():
                return f"{int(val)}"
            return f"{val:.2f}"
        except (TypeError, ValueError):
            return str(value)