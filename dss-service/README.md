# DSS — Hệ thống Hỗ trợ Quyết định Chọn Xe Máy

Hệ thống thu thập, làm sạch và chuẩn hóa dữ liệu thông số kỹ thuật xe máy (xe xăng, xe hybrid tự động & xe máy điện) đang kinh doanh tại thị trường Việt Nam, sau đó áp dụng **AHP** (Analytic Hierarchy Process) + **TOPSIS** để xếp hạng và giải thích lựa chọn xe tối ưu theo trọng số ưu tiên của người dùng.

## 1. Tính năng

- **Dữ liệu chuẩn hóa**: 119 mẫu xe (10 cột) từ các hãng Honda, Yamaha, Suzuki, SYM, Kymco, VinFast, Dat, Yadea.
- **7 tiêu chí đánh giá** (đồng bộ từ `criteria_weights.csv`):
  - Cost (tối thiểu): `price_vnd`, `fuel_consumption_l_per_100km`, `curb_weight_kg`
  - Benefit (tối đa): `max_power_kw`, `underseat_storage_l`, `abs`, `vehicle_warranty_months`
- **AHP**: tính trọng số từ bảng so sánh cặp (phương pháp eigenvector), kèm kiểm tra nhất quán (`CR < 0.1`).
- **TOPSIS**: chuẩn hóa vector, khoảng cách Euclidean có trọng số, chỉ số tương đồng `Ci`, xếp hạng.
- **Giải thích (Explainable AI)**: sinh lời giải thích tiếng Việt lý do xe đứng đầu.
- **What-If**: phân tích độ nhạy khi thay đổi thông số một mẫu xe.
- **REST API** (FastAPI + OpenAPI/Swagger).

## 2. Cấu trúc thư mục

```
dss-service/
├── docker-compose.yml
├── notebooks/
│   └── motorbikes_analysis.ipynb      # Pipeline thu thập & làm sạch dữ liệu
└── backend/
    ├── Dockerfile
    ├── requirements.txt
    ├── data/
    │   ├── motorbikes_dataset.csv     # Dataset chuẩn hóa (119 dòng)
    │   └── criteria_weights.csv       # Trọng số mặc định 7 tiêu chí
    ├── app/
    │   ├── main.py                    # Entrypoint FastAPI
    │   └── api/v1/
    │       ├── router.py
    │       └── endpoints/dss.py       # Các endpoint /api/v1/dss/*
    ├── models/
    │   ├── ahp.py                     # Mô hình AHP
    │   └── topsis.py                  # Mô hình TOPSIS
    ├── schemas/
    │   └── dss_schema.py              # Pydantic schemas
    ├── services/
    │   ├── dss_service.py             # Service chính
    │   └── explanation_service.py     # Giải thích + What-If
    └── tests/
        ├── conftest.py
        └── test_models.py             # 6 unit tests
```

## 3. API Endpoints

Cơ sở URL: `http://localhost:8000`

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/` | Kiểm tra sức khỏe (số row dataset) |
| `GET` | `/openapi.json` | Đặc tả OpenAPI (JSON) |
| `GET` | `/docs` | Swagger UI |
| `GET` | `/redoc` | ReDoc |
| `GET` | `/api/v1/dss/default-criteria` | 7 tiêu chí mặc định + trọng số + type |
| `GET` | `/api/v1/dss/criteria` | Danh sách tiêu chí |
| `GET` | `/api/v1/dss/brands` | Danh sách hãng xe |
| `POST` | `/api/v1/dss/ahp` | Chạy AHP từ ma trận so sánh cặp |
| `POST` | `/api/v1/dss/run` | Chạy DSS (AHP + TOPSIS) |

### Ví dụ `POST /api/v1/dss/run`

```bash
curl -X POST http://localhost:8000/api/v1/dss/run \
  -H "Content-Type: application/json" \
  -d '{
    "max_price_vnd": 50000000,
    "powertrain": "ICE",
    "brand_list": ["Honda", "Yamaha"],
    "weights": [0.15, 0.15, 0.2, 0.1, 0.15, 0.1, 0.15]
  }'
```

Nếu **không truyền** `weights` hoặc `pairwise_matrix`, hệ thống sẽ dùng trọng số mặc định từ `criteria_weights.csv`.

## 4. Chạy local (không Docker)

Yêu cầu: Python 3.10+.

```bash
cd dss-service
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt

cd backend
uvicorn app.main:app --reload
```

Mở Swagger: http://localhost:8000/docs

### Chạy tests

```bash
cd backend
../.venv/bin/python -m pytest tests -q
```

## 5. Chạy bằng Docker Compose

```bash
cd dss-service
docker compose up --build
```

- API: http://localhost:8000
- Swagger: http://localhost:8000/docs

Dữ liệu `backend/data/` được mount vào container, nên bạn có thể cập nhật dataset / trọng số mà không cần rebuild.

## 6. Dữ liệu `criteria_weights.csv`

| Tiêu chí | Weight | Type |
|----------|--------|------|
| price_vnd | 0.1385 | Cost |
| fuel_consumption_l_per_100km | 0.1385 | Cost |
| max_power_kw | 0.1449 | Benefit |
| underseat_storage_l | 0.1365 | Benefit |
| abs | 0.1538 | Benefit |
| curb_weight_kg | 0.1380 | Cost |
| vehicle_warranty_months | 0.1499 | Benefit |