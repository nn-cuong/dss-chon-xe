"""DSS endpoints under /api/v1/dss."""
import os
from typing import List

import numpy as np
from fastapi import APIRouter, HTTPException

from schemas.dss_schema import (
    AHPResult,
    DSSRequest,
    WSSResult,
)
from services.dss_service import MotorbikeDSSService

router = APIRouter(prefix="/dss", tags=["DSS"])

# Instantiate the service once. Defaults resolve data files under backend/data/
# relative to services/dss_service.py.
service = MotorbikeDSSService()


@router.get("/default-criteria", summary="Default criteria (weights + benefit/cost)")
def default_criteria():
    """Return the 7 default criteria synced from criteria_weights.csv.

    Each entry exposes the column key, Vietnamese name, the default normalized
    weight (from criteria_weights.csv) and whether it is Benefit (maximize)
    or Cost (minimize).
    """
    return {
        "criteria": service.default_criteria(),
        "n_criteria": len(service.criteria_cols),
        "weights": service.default_weights,
        "benefit_mask": service.benefit_mask,
        "source": os.path.basename(service.criteria_path),
    }


@router.get("/criteria", summary="List evaluation criteria")
def list_criteria():
    return {"criteria": service.criteria, "n": len(service.criteria)}


@router.get("/brands", summary="List brands")
def list_brands():
    return {"brands": sorted(service.df_raw["brand"].dropna().unique().tolist())}


@router.post("/ahp", response_model=AHPResult, summary="Run AHP")
def run_ahp(weights_matrix: List[List[float]]):
    try:
        matrix = np.array(weights_matrix, dtype=float)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Invalid matrix values.")
    try:
        return service.weights_from_ahp(matrix)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/run", response_model=WSSResult, summary="Run DSS (AHP+TOPSIS)")
def run_dss(req: DSSRequest):
    pairwise = None
    if req.pairwise_matrix:
        pairwise = np.array(req.pairwise_matrix, dtype=float)

    if req.weights is None and pairwise is None:
        # Fall back to default criteria weights.
        pass

    try:
        result = service.run_dss(
            user_weights=req.weights,
            criteria_pairwise=pairwise,
            max_price=req.max_price_vnd,
            powertrain=req.powertrain,
            brand_list=req.brand_list,
            vehicle_type=req.vehicle_type,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if result["status"] == "empty":
        return {"status": "empty", "message": result["message"]}

    result["top_choice"] = _trim(top_choice=result["top_choice"])
    return WSSResult(**{k: result[k] for k in WSSResult.model_fields})


def _trim(*, top_choice: dict) -> dict:
    """Keep only useful identification + score fields for the top choice."""
    keys = [
        "rank", "topsis_score", "s_plus", "s_minus",
        "brand", "model", "variant", "version", "vehicle_type", "powertrain",
        "bike_name", "price_vnd", "curb_weight_kg",
    ]
    return {k: top_choice.get(k) for k in keys if k in top_choice}