# DSS Web — Hệ hỗ trợ lựa chọn xe máy (Frontend)

Frontend cho `dss-service`. Người dùng trả lời một bộ câu hỏi ngắn (1–2 phút) về
nhu cầu và mức độ ưu tiên; hệ thống lọc dataset, chuẩn hoá điểm ưu tiên thành
trọng số, chạy **TOPSIS** ở backend và hiển thị bảng xếp hạng kèm giải thích.

> Đây là **pure frontend** — không có `app/api/`, không database, không Prisma.
> Mọi dữ liệu đến từ backend FastAPI qua `NEXT_PUBLIC_API_URL`.

## 1. Chạy dự án

> **Yêu cầu Node >= 22.18.0** (Orval 7.17+ bắt buộc). Repo có sẵn `.nvmrc`:
> `nvm use`

```bash
# 1. Bật backend trước (từ thư mục gốc repo)
cd ../dss-service && docker compose up -d
#   hoặc: cd ../dss-service/backend && uvicorn app.main:app --reload

# 2. Chạy frontend
cd dss-web
cp .env.example .env.local     # chỉnh NEXT_PUBLIC_API_URL nếu cần
yarn install
yarn dev                       # http://localhost:3000
```

| Lệnh | Tác dụng |
|------|----------|
| `yarn dev` | Dev server (Turbopack) |
| `yarn build` / `yarn start` | Build & chạy production |
| `yarn typecheck` | Kiểm tra TypeScript (strict) |
| `yarn lint` / `yarn lint:fix` | ESLint 9 flat config |
| `yarn format` | Prettier |
| `yarn generate:api` | Sinh lại type + hook từ OpenAPI |

## 2. Bộ câu hỏi

### Phần 1 — Nhu cầu (4 câu)

| # | Câu hỏi | Kiểu nhập | Dùng để làm gì |
|---|---------|-----------|----------------|
| 1 | Ngân sách tối đa? | Number (VNĐ) + nút chọn nhanh | **Hard-filter** → `max_price_vnd` |
| 2 | Loại xe? | Xe xăng / Xe điện / Không giới hạn | **Hard-filter** → `powertrain` (`ICE`/`EV`/`ALL`) |
| 3 | Trung bình bao nhiêu km/ngày? | Number | Đánh giá mức độ phù hợp về quãng đường (không lọc cứng) |
| 4 | Mục đích sử dụng chính? | 6 lựa chọn | Boost nhẹ trọng số (hệ số 1.0–1.3) |

### Phần 2 — Mức độ ưu tiên (7 tiêu chí, thang 1–5)

Giá mua · Hiệu năng · An toàn · Quãng đường di chuyển · Khả năng chứa đồ ·
Trọng lượng · Độ bền/Bảo hành.

Không hỏi AHP, không hỏi giá xăng/điện, không hỏi chi phí vận hành, không hỏi
thông số kỹ thuật. Mặc định mọi tiêu chí là 3/5 nên người dùng chỉ cần chỉnh
những gì mình thực sự quan tâm.

## 3. Luồng xử lý

```
Nhu cầu  →  Ưu tiên  →  Tìm xe  →  Kết quả
```

1. **Hard-filter**: ngân sách + loại xe → `max_price_vnd`, `powertrain`.
2. **Boost theo mục đích**: `score' = clamp(score × factor, 1, 5)`.
3. **Chuẩn hoá trọng số**: `w_i = score'_i / Σ score'_i` → mảng 7 số theo đúng
   thứ tự backend yêu cầu (`config/survey.ts` → `CRITERION_ORDER`).
4. **TOPSIS**: `POST /api/v1/dss/run` với `{ weights, max_price_vnd, powertrain }`.
5. **Kết quả**: bảng xếp hạng theo `topsis_score`.
6. **Giải thích**: kết hợp `explanation` từ backend với điểm mạnh tính ở FE
   (percentile của xe trên từng tiêu chí so với các xe còn lại).
7. **Quãng đường**: `assessRangeFit()` ước lượng km mỗi lần đổ đầy từ mức tiêu
   hao nhiên liệu, đối chiếu với km/ngày người dùng nhập.

## 4. Ánh xạ 7 câu hỏi → 7 cột dataset

Backend nhận **mảng 7 trọng số theo thứ tự cố định** (xem
`dss-service/backend/models/topsis.py` → `build_criteria_config()`):

| Câu hỏi UI | Cột dataset | Type |
|------------|-------------|------|
| Giá mua | `price_vnd` | Cost |
| Quãng đường di chuyển | `fuel_consumption_l_per_100km` | Cost |
| Hiệu năng | `max_power_kw` | Benefit |
| Khả năng chứa đồ | `underseat_storage_l` | Benefit |
| An toàn | `abs` | Benefit |
| Trọng lượng | `curb_weight_kg` | Cost |
| Độ bền / Bảo hành | `vehicle_warranty_months` | Benefit |

### ⚠️ Hai điểm lệch so với đặc tả 8 tiêu chí ban đầu

Dataset hiện tại chỉ có **7 tiêu chí**, không phải 8:

- **"Quãng đường di chuyển"** — không có cột `range_km`. Ánh xạ tạm sang
  `fuel_consumption_l_per_100km` (Cost) vì tốn ít nhiên liệu ⇒ đi được xa hơn
  trên một bình xăng / lần sạc. Với xe điện thì đây là proxy yếu.
- **"Tiện ích"** — không có cột nào tương ứng, nên không được hỏi.

Khi backend bổ sung cột (ví dụ `range_km`, `battery_capacity_kwh`), cần sửa
đồng thời ở 4 chỗ:

1. `config/survey.ts` → `CRITERION_ORDER` và `PRIORITY_QUESTIONS[].criterion`
2. `types/dss.ts` → `CriterionKey`
3. `components/results/WhyThisBike.tsx` → `CRITERION_LABEL`, `BENEFIT_MASK`
4. `components/results/CriteriaRadar.tsx` → `AXIS_LABEL`, `IS_BENEFIT`

## 5. Kiến trúc

```
app/
  layout.tsx        providers + header/footer
  page.tsx          landing
  tim-xe/page.tsx   wizard (Nhu cầu → Ưu tiên → Tìm xe)
  ket-qua/page.tsx  kết quả
components/
  layout/  header, footer, theme switch
  wizard/  StepIndicator, StepNeeds, StepPriorities, StepSearching, WeightPreview
  results/ TopChoiceCard, RankingTable, ScoreChart, CriteriaRadar, …
  ui/      BackendStatus, ErrorState
lib/
  api/     client.ts (mutator Axios) · hooks.ts (React Query) · generated/ (Orval)
  dss/     mapping.ts (câu trả lời → request) · schema.ts (Zod) · format.ts · export.ts
contexts/  AuthContext (JWT localStorage) · SurveyContext (sessionStorage)
config/    survey.ts — TOÀN BỘ định nghĩa bộ câu hỏi nằm ở đây
types/     dss.ts — kiểu domain chi tiết hơn OpenAPI
```

**Orval** đọc OpenAPI spec rồi sinh type + React Query hooks vào
`lib/api/generated/` (mode `tags-split`). Không viết tay call API — chỉ viết
`lib/api/client.ts` làm mutator (Bearer token, xử lý 401).

```bash
yarn generate:api                                        # dùng ../ingestion/dss-openapi.json
OPENAPI_URL=http://localhost:8000/openapi.json yarn generate:api   # lấy spec live
```

> FastAPI khai báo `rankings: List[Dict[str, Any]]` nên Orval chỉ sinh ra
> `object`. Vì vậy `types/dss.ts` + `lib/api/hooks.ts` bổ sung type chi tiết cho
> các endpoint DSS. Hook do Orval sinh vẫn dùng chung mutator.

**Auth**: JWT trong `localStorage`, bảo vệ route bằng `<RequireAuth>` phía
client, không dùng middleware. Backend DSS hiện chưa có endpoint đăng nhập nên
`AuthContext` mới chỉ giữ token — khi backend có `/auth` thì nối vào `setToken`.

## 6. Endpoint sử dụng

| Method | Path | Hook |
|--------|------|------|
| `GET` | `/` | `useHealth()` |
| `GET` | `/api/v1/dss/default-criteria` | `useDefaultCriteria()` |
| `GET` | `/api/v1/dss/brands` | `useBrands()` |
| `POST` | `/api/v1/dss/run` | `useRunDss()` |

`POST /dss/ahp` không dùng — theo yêu cầu, người dùng không phải làm so sánh cặp AHP.

## 7. ⚠️ Lỗi backend đã phát hiện (cần sửa ở dss-service)

`POST /api/v1/dss/run` khai báo `response_model=WSSResult` với **cả 7 field bắt
buộc**, nhưng khi bộ lọc không còn xe nào thì endpoint lại trả về:

```python
if result["status"] == "empty":
    return {"status": "empty", "message": result["message"]}
```

FastAPI chặn ở tầng validate response và ném `ResponseValidationError` → **HTTP
500**. Tệ hơn: exception xảy ra **trước** khi `CORSMiddleware` kịp gắn header,
nên trình duyệt chặn hẳn response và frontend chỉ thấy `Network Error`.

Đã kiểm chứng:

```bash
curl -i -X POST http://localhost:8000/api/v1/dss/run \
  -H 'Content-Type: application/json' \
  -d '{"weights":[1,1,1,1,1,1,1],"max_price_vnd":1000000,"powertrain":"ALL"}'
# HTTP/1.1 500 Internal Server Error  (không có Access-Control-Allow-Origin)
```

**Frontend đã xử lý tạm** trong `lib/api/hooks.ts`: khi `/dss/run` lỗi, nó ping
lại `GET /` — nếu backend vẫn sống thì coi đây là kết quả rỗng và hiện màn hình
"Chưa tìm thấy xe nào phù hợp" kèm nút nới điều kiện, thay vì báo lỗi hệ thống.

**Cách sửa ở backend** (chọn một):

```python
# Cách 1 — khai báo union
from typing import Union
@router.post("/run", response_model=Union[WSSResult, EmptyResult])

# Cách 2 — bỏ response_model, tự trả JSON
@router.post("/run")
```

Sau khi sửa, nhánh xử lý tạm ở frontend tự nhiên không còn được kích hoạt.

## 8. Đã kiểm thử

Chạy thực tế với backend (119 mẫu xe) trên Chromium:

| Kịch bản | Kết quả |
|----------|---------|
| Landing → wizard → kết quả | ✅ |
| Hard-filter ngân sách + loại xe (ICE/EV) | ✅ 52 xe với ≤40 triệu + xe xăng |
| Boost theo mục đích (Mua sắm → cốp 17%, Đưa đón → ABS lên đầu) | ✅ |
| Kết quả rỗng + nút nới ngân sách | ✅ |
| Modal chi tiết xe | ✅ |
| Lọc bảng theo tên / hãng | ✅ |
| Xuất CSV (BOM UTF-8) và PDF | ✅ |
| Dark mode | ✅ |
