"""Pydantic / dataclass schemas for the DSS backend inputs and outputs."""
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class DSSRequest(BaseModel):
    """Input request for a DSS evaluation."""

    weights: Optional[List[float]] = Field(
        default=None, description="Criteria weights (unnormalized)."
    )
    pairwise_matrix: Optional[List[List[float]]] = Field(
        default=None, description="AHP pairwise comparison matrix."
    )
    max_price_vnd: Optional[float] = Field(
        default=None, ge=0, description="Maximum price in VND."
    )
    powertrain: Optional[str] = Field(
        default="ALL", description="ICE | EV | ALL"
    )
    brand_list: Optional[List[str]] = Field(default=None)
    vehicle_type: Optional[str] = Field(default=None)


class AHPResult(BaseModel):
    weights: List[float]
    lambda_max: float
    ci: float
    cr: float
    is_consistent: bool


class Candidate(BaseModel):
    """A single ranked motorbike alternative."""

    rank: int
    topsis_score: float
    s_plus: float
    s_minus: float
    model: Optional[str] = None
    variant: Optional[str] = None
    version: Optional[str] = None
    brand: Optional[str] = None
    price_vnd: Optional[float] = None


class WSSResult(BaseModel):
    status: str
    total_candidates: int
    criteria: List[Dict[str, Any]]
    weights: List[float]
    rankings: List[Dict[str, Any]]
    top_choice: Dict[str, Any]
    explanation: str


class EmptyResult(BaseModel):
    status: str
    message: str


class HealthResponse(BaseModel):
    status: str
    rows: int