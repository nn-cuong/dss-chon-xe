"""DSS service: integrates data pipeline + AHP + TOPSIS + What-If.

This service reads the canonical motorbike CSV, loads the default criteria
weights defined in ``criteria_weights.csv`` (produced by the cleaning /
weight-derivation notebook), filters the dataset, optionally derives AHP
weights from a pairwise matrix, runs TOPSIS, and produces an explanation for
the top-ranked motorbike.
"""
import os
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd

from models.ahp import AHPEngine
from models.topsis import TOPSISSEngine, build_criteria_config
from services.explanation_service import DecisionExplainer


class MotorbikeDSSService:
    """Application service for the motorbike recommender."""

    def __init__(
        self,
        data_path: Optional[str] = None,
        criteria_path: Optional[str] = None,
    ):
        base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        if data_path is None:
            data_path = os.path.join(base, "data", "motorbikes_dataset.csv")
        if criteria_path is None:
            criteria_path = os.path.join(base, "data", "criteria_weights.csv")
        self.data_path = data_path
        self.criteria_path = criteria_path

        # Canonical criteria configuration (col, name, benefit) — order and
        # types come from the 7 criteria in criteria_weights.csv.
        self.criteria = build_criteria_config()
        self.criteria_cols = [c["col"] for c in self.criteria]
        self.criteria_names = {c["col"]: c["name"] for c in self.criteria}
        self.benefit_mask = [c["benefit"] for c in self.criteria]

        # Default weights loaded from criteria_weights.csv (normalized to sum 1).
        self.default_weights, self.criteria_weight_src = self._load_criteria_weights()

        # Raw dataset.
        self.df_raw = self._load_data(data_path)

    # -- criteria weights ---------------------------------------------------
    def _load_criteria_weights(self) -> tuple[List[float], pd.DataFrame]:
        """Load the default criteria weights from criteria_weights.csv.

        Returns ``(weights, source_df)`` where ``weights`` is normalized to sum
        to 1.0 in the order of ``criteria_cols``. If a criterion has no weight
        row, or the file is missing, it falls back to equal weights for the 7
        criteria so the service still starts cleanly.
        """
        n = len(self.criteria_cols)
        try:
            src = pd.read_csv(self.criteria_path)
        except (FileNotFoundError, pd.errors.EmptyDataError):
            src = pd.DataFrame(columns=["Criterion", "Weight", "Type"])
        weights = np.full(n, 1.0 / n, dtype=float)
        if not src.empty and "Criterion" in src.columns and "Weight" in src.columns:
            wmap = dict()
            for _, row in src.iterrows():
                col = str(row.get("Criterion", "")).strip()
                if col in self.criteria_names:
                    wmap[col] = float(row.get("Weight", 0.0))
            if wmap:
                w = np.array([wmap.get(c, 0.0) for c in self.criteria_cols], dtype=float)
                if w.sum() > 0:
                    weights = w / w.sum()
        return weights.tolist(), src

    # -- data loading / cleaning --------------------------------------------
    @staticmethod
    def _load_data(path: str) -> pd.DataFrame:
        df = pd.read_csv(path)
        if "abs" in df.columns:
            df["abs"] = df["abs"].astype(str).str.strip().str.lower()
            df["abs"] = df["abs"].map(
                {"true": 1, "1": 1, "false": 0, "0": 0, "null": 0, "nan": 0, "": 0}
            ).fillna(0).astype(int)
        if "brand" not in df.columns and "bike_name" in df.columns:
            # Derive brand as the leading token of the bike name.
            df["brand"] = df["bike_name"].astype(str).str.strip().str.split().str[0]
        return df

    # ------------------------------------------------------------------ filters
    def filter_dataset(
        self,
        max_price: Optional[float] = None,
        powertrain: Optional[str] = None,
        brand_list: Optional[List[str]] = None,
        vehicle_type: Optional[str] = None,
    ) -> pd.DataFrame:
        """Apply user filters to the raw dataset. max_price is in VND."""
        df = self.df_raw.copy()
        if powertrain and powertrain.upper() != "ALL":
            df = df[df["powertrain"].astype(str).str.upper().str.strip() == powertrain.upper()]
        if max_price is not None:
            p = pd.to_numeric(df["price_vnd"], errors="coerce")
            df = df[p <= max_price]
        if brand_list:
            df = df[df["brand"].isin(brand_list)]
        if vehicle_type:
            vt = df["vehicle_type"].astype(str).str.contains(vehicle_type, case=False, na=False)
            df = df[vt]
        return df.reset_index(drop=True)

    # ------------------------------------------------------------------ weights
    def weights_from_ahp(self, pairwise: np.ndarray) -> Dict[str, Any]:
        """Return AHP weight vector + consistency info."""
        return AHPEngine.calculate_weights(pairwise)

    def weights_from_criteria(self, weights: List[float]) -> np.ndarray:
        w = np.array(weights, dtype=float)
        if w.sum() <= 0:
            raise ValueError("Sum of weights must be positive.")
        return w / w.sum()

    def default_criteria(self) -> List[Dict[str, Any]]:
        """Expose default criteria metadata for GET /api/v1/dss/default-criteria.

        Each item carries the machine column, a Vietnamese display name, the
        default normalized weight (from criteria_weights.csv) and its
        benefit/cost type (Benefit => maximize, Cost => minimize).
        """
        out = []
        default_w = {col: w for col, w in zip(self.criteria_cols, self.default_weights)}
        for crit in self.criteria:
            col = crit["col"]
            out.append(
                {
                    "key": col,
                    "name": crit["name"],
                    "type": "Benefit" if crit["benefit"] else "Cost",
                    "benefit": crit["benefit"],
                    "default_weight": round(float(default_w.get(col, 0.0)), 6),
                    "description": "Tiêu chí đánh giá xe máy dùng trong mô hình TOPSIS",
                }
            )
        return out

    # ------------------------------------------------------------------ TOPSIS
    def run_dss(
        self,
        user_weights: Optional[List[float]] = None,
        criteria_pairwise: Optional[List[List[float]]] = None,
        max_price: Optional[float] = None,
        powertrain: Optional[str] = None,
        brand_list: Optional[List[str]] = None,
        vehicle_type: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Run the full decision-support pipeline.

        If no explicit weights and no AHP pairwise matrix are supplied, the
        default weights from criteria_weights.csv are used.
        """
        # 1. Determine weights.
        ahp_info = None
        if criteria_pairwise is not None:
            pw = np.asarray(criteria_pairwise, dtype=float)
            ahp_info = self.weights_from_ahp(pw)
            weights = np.asarray(ahp_info["weights"], dtype=float)
        elif user_weights is not None and len(user_weights) == len(self.criteria_cols):
            weights = self.weights_from_criteria(user_weights)
        else:
            # Fall back to the default criteria weights.
            weights = np.asarray(self.default_weights, dtype=float)

        # 2. Filter alternatives.
        filtered = self.filter_dataset(max_price, powertrain, brand_list, vehicle_type)
        if filtered.empty:
            return {"status": "empty", "message": "Không tìm thấy xe phù hợp với bộ lọc."}

        # 3. Impute missing values, then evaluate TOPSIS.
        eval_df = self.build_for_full_topsis(filtered)
        ranked = TOPSISSEngine.evaluate(
            df_alternatives=eval_df,
            criteria_cols=self.criteria_cols,
            weights=weights.tolist(),
            benefit_mask=self.benefit_mask,
        )

        # 4. Explanation comparing top-1 vs top-2.
        top_1 = ranked.iloc[0].to_dict()
        top_2 = ranked.iloc[1].to_dict() if len(ranked) > 1 else None
        explanation = DecisionExplainer.explain_choice(
            top_1, top_2, self.criteria_cols, weights.tolist(), self.benefit_mask
        )

        # 5. Keep original raw columns in output, add scores.
        result_records = self._records_with_original(ranked)

        return {
            "status": "success",
            "n_criteria": len(self.criteria_cols),
            "criteria": self.criteria,
            "weights": weights.tolist(),
            "ahp": ahp_info,
            "total_candidates": len(ranked),
            "rankings": result_records,
            "top_choice": top_1,
            "explanation": explanation,
        }

    # ------------------------------------------------------------------ dss helper
    def build_for_full_topsis(self, filtered: pd.DataFrame) -> pd.DataFrame:
        """Prepare a DataFrame whose rows are usable by the TOPSIS engine."""
        df = filtered.copy()
        for col in self.criteria_cols:
            if col not in df.columns:
                df[col] = np.nan
            df[col] = pd.to_numeric(df[col], errors="coerce")

        # Impute with overall column medians.
        for col in self.criteria_cols:
            med = df[col].median()
            if pd.isna(med):
                med = 0.0
            df[col] = df[col].fillna(med)
        return df

    @staticmethod
    def _records_with_original(ranked: pd.DataFrame) -> List[Dict[str, Any]]:
        """Convert ranked rows to dicts, converting numpy types to python."""
        out = []
        for _, row in ranked.iterrows():
            rec = {}
            for col, val in row.items():
                if hasattr(val, "item"):
                    val = val.item()
                rec[col] = val
            out.append(rec)
        return out

    # ------------------------------------------------------------------ What-If
    def what_if(self, bike: Dict[str, Any], delta: Dict[str, float]) -> Dict[str, Any]:
        """Run a What-If sensitivity analysis on a candidate."""
        impact = DecisionExplainer.what_if(bike, delta, self.criteria_cols)
        return {"candidate": bike.get("bike_name") or bike.get("variant") or bike.get("model"), "impacts": impact}


# Convenience re-export for a clean service facade.
DecisionEngine = DecisionExplainer