"""FastAPI application entrypoint for the DSS motorbike recommender.

Run (from backend/):
    .venv/bin/uvicorn app.main:app --reload
or
    .venv/bin/python -m uvicorn app.main:app --reload
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from schemas.dss_schema import HealthResponse
from services.dss_service import MotorbikeDSSService

app = FastAPI(
    title="DSS Motorbike Recommender",
    description="AHP + TOPSIS decision support for motorbike selection.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instantiate the service. Defaults resolve data files under backend/data/
# relative to the service module, so no explicit paths are needed.
service = MotorbikeDSSService()

app.include_router(api_router, prefix="/api/v1")


@app.get("/", response_model=HealthResponse, summary="Health check")
def health():
    return {"status": "ok", "rows": len(service.df_raw)}