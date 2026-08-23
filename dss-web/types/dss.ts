/**
 * Kiểu dữ liệu domain của DSS, khớp với response thực tế của backend
 * (dss-service/backend/schemas/dss_schema.py + services/dss_service.py).
 *
 * Orval sinh type từ OpenAPI vào lib/api/generated/model, nhưng FastAPI khai
 * báo `rankings: List[Dict[str, Any]]` nên type sinh ra là `object`. Các kiểu
 * dưới đây bổ sung phần chi tiết mà OpenAPI không mô tả được.
 */

/** 4 loại xe có trong dataset (cột `vehicle_type`). */
export type VehicleType = 'xe tay ga' | 'xe số' | 'xe côn tay' | 'xe máy';

/** Hệ truyền động: ICE = xe xăng, EV = xe điện. */
export type Powertrain = 'ICE' | 'EV' | 'ALL';

/** Khoá của 7 tiêu chí TOPSIS, đúng thứ tự backend mong đợi. */
export type CriterionKey =
  | 'price_vnd'
  | 'fuel_consumption_l_per_100km'
  | 'max_power_kw'
  | 'underseat_storage_l'
  | 'abs'
  | 'curb_weight_kg'
  | 'vehicle_warranty_months';

/** Một tiêu chí trong cấu hình TOPSIS (từ GET /dss/default-criteria). */
export interface CriterionMeta {
  key: CriterionKey;
  name: string;
  type: 'Benefit' | 'Cost';
  benefit: boolean;
  default_weight: number;
  description: string;
}

/** Phần tử của mảng `criteria` trong WSSResult. */
export interface CriterionConfig {
  col: CriterionKey;
  name: string;
  benefit: boolean;
}

/** Body của POST /api/v1/dss/run. */
export interface DSSRunRequest {
  weights?: number[] | null;
  pairwise_matrix?: number[][] | null;
  max_price_vnd?: number | null;
  powertrain?: Powertrain | null;
  brand_list?: string[] | null;
  vehicle_type?: string | null;
}

/**
 * Một dòng trong `rankings`. Backend trả về toàn bộ cột gốc của dataset kèm
 * điểm số, nên mọi trường đều optional trừ rank/score.
 */
export interface RankedBike {
  rank: number;
  topsis_score: number;
  s_plus: number;
  s_minus: number;
  bike_name?: string;
  brand?: string;
  model?: string;
  variant?: string;
  version?: string;
  vehicle_type?: string;
  powertrain?: string;
  price_vnd?: number;
  fuel_consumption_l_per_100km?: number;
  max_power_kw?: number;
  underseat_storage_l?: number;
  abs?: number;
  curb_weight_kg?: number;
  vehicle_warranty_months?: number;
  [key: string]: unknown;
}

/** Thông tin AHP (chỉ có khi gửi pairwise_matrix). */
export interface AHPInfo {
  weights: number[];
  lambda_max: number;
  ci: number;
  cr: number;
  is_consistent: boolean;
}

/** Response thành công của POST /api/v1/dss/run. */
export interface DSSRunSuccess {
  status: 'success';
  total_candidates: number;
  criteria: CriterionConfig[];
  weights: number[];
  rankings: RankedBike[];
  top_choice: Partial<RankedBike>;
  explanation: string;
  ahp?: AHPInfo | null;
  n_criteria?: number;
}

/** Response khi bộ lọc không còn xe nào. */
export interface DSSRunEmpty {
  status: 'empty';
  message: string;
}

export type DSSRunResponse = DSSRunSuccess | DSSRunEmpty;

export function isEmptyResult(res: DSSRunResponse): res is DSSRunEmpty {
  return res.status === 'empty';
}

/** GET /api/v1/dss/default-criteria */
export interface DefaultCriteriaResponse {
  criteria: CriterionMeta[];
  n_criteria: number;
  weights: number[];
  benefit_mask: boolean[];
  source: string;
}

/** GET /api/v1/dss/brands */
export interface BrandsResponse {
  brands: string[];
}

/** GET / */
export interface HealthResponse {
  status: string;
  rows: number;
}
