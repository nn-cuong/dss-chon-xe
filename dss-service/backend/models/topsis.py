"""TOPSIS (Technique for Order Preference by Similarity to Ideal Solution) engine.

Ranks alternatives based on the relative closeness to the positive ideal
solution A+ and the negative ideal solution A-.
"""
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd


class TOPSISSEngine:
    """TOPSIS scoring engine.

    The criteria are described by a list of ``(column, is_benefit)`` pairs.
    ``benefit_mask`` is a boolean array where ``True`` means Benefit (J+)
    and ``False`` means Cost (J-).
    """

    @staticmethod
    def evaluate(
        df_alternatives: pd.DataFrame,
        criteria_cols: List[str],
        weights: List[float],
        benefit_mask: List[bool],
        label_col: Optional[str] = None,
    ) -> pd.DataFrame:
        """Run TOPSIS on the given alternatives.

        Args:
            df_alternatives: rows = alternatives, contains the criteria columns.
            criteria_cols: list of numeric criteria column names.
            weights: importance weights per criterion (will be normalized).
            benefit_mask: True = Benefit, False = Cost, one per criterion.
            label_col: optional column to expose as an identifier in output.

        Returns:
            A copy of the input DataFrame augmented with ``topsis_score`` and
            ``rank``, sorted by rank ascending.
        """
        df = df_alternatives.copy()
        if not criteria_cols:
            raise ValueError("criteria_cols must not be empty.")

        X = df[criteria_cols].to_numpy(dtype=float)
        m, n = X.shape
        w = np.array(weights, dtype=float)

        # Normalize weights so they sum to 1.
        w_sum = w.sum()
        if w_sum > 0:
            w = w / w_sum
        else:
            w = np.ones(n) / n

        # 1. Vector normalization: r_ij = x_ij / sqrt(sum(x_kj^2)).
        denom = np.sqrt(np.sum(X**2, axis=0))
        denom[denom == 0] = 1e-9
        R = X / denom

        # 2. Weighted normalized matrix.
        V = R * w

        # 3. Ideal solutions.
        a_pos = np.zeros(n)
        a_neg = np.zeros(n)
        for j in range(n):
            if benefit_mask[j]:
                a_pos[j] = np.max(V[:, j])
                a_neg[j] = np.min(V[:, j])
            else:
                a_pos[j] = np.min(V[:, j])
                a_neg[j] = np.max(V[:, j])

        # 4. Euclidean distances.
        s_pos = np.sqrt(np.sum((V - a_pos) ** 2, axis=1))
        s_neg = np.sqrt(np.sum((V - a_neg) ** 2, axis=1))

        # 5. Relative closeness to ideal solution.
        denom_c = s_pos + s_neg
        denom_c[denom_c == 0] = 1e-9
        c_score = s_neg / denom_c

        result_df = df.reset_index(drop=True).copy()
        result_df["s_plus"] = np.round(s_pos, 6)
        result_df["s_minus"] = np.round(s_neg, 6)
        result_df["topsis_score"] = c_score
        result_df["rank"] = result_df["topsis_score"].rank(
            ascending=False, method="min"
        ).astype(int)

        return result_df.sort_values(by="rank", ascending=True).reset_index(drop=True)


def build_criteria_config() -> List[Dict[str, object]]:
    """Default criteria configuration matching the canonical CSV schema.

    The 7 criteria mirror the ``criteria_weights.csv`` baseline produced by the
    cleaning notebook. ``benefit`` is True for Benefit (J+) and False for Cost
    (J-). Weight defaults are populated by the DSS service from
    ``criteria_weights.csv``.
    """
    return [
        {"col": "price_vnd", "name": "Giá bán", "benefit": False},
        {"col": "fuel_consumption_l_per_100km", "name": "Mức tiêu hao nhiên liệu (L/100km)", "benefit": False},
        {"col": "max_power_kw", "name": "Công suất tối đa (kW)", "benefit": True},
        {"col": "underseat_storage_l", "name": "Dung tích cốp (L)", "benefit": True},
        {"col": "abs", "name": "Hệ thống phanh ABS", "benefit": True},
        {"col": "curb_weight_kg", "name": "Trọng lượng (kg)", "benefit": False},
        {"col": "vehicle_warranty_months", "name": "Thời gian bảo hành (tháng)", "benefit": True},
    ]