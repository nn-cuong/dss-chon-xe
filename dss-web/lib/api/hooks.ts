/**
 * React Query hooks cho DSS API.
 *
 * Đây là lớp mỏng bọc quanh `apiClient` với type domain chi tiết hơn những gì
 * OpenAPI mô tả (FastAPI khai báo `rankings: List[Dict[str, Any]]` nên Orval
 * chỉ sinh ra `object`). Các hook do Orval sinh vẫn nằm ở
 * lib/api/generated/ và dùng chung mutator.
 */
import { useMutation, useQuery, type UseMutationOptions } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { apiClient } from '@/lib/api/client';
import type {
  BrandsResponse,
  DefaultCriteriaResponse,
  DSSRunEmpty,
  DSSRunRequest,
  DSSRunResponse,
  HealthResponse,
} from '@/types/dss';

export const dssKeys = {
  all: ['dss'] as const,
  health: () => [...dssKeys.all, 'health'] as const,
  defaultCriteria: () => [...dssKeys.all, 'default-criteria'] as const,
  brands: () => [...dssKeys.all, 'brands'] as const,
};

/** GET / — kiểm tra backend sống và số dòng dataset. */
export function useHealth() {
  return useQuery({
    queryKey: dssKeys.health(),
    queryFn: () => apiClient<HealthResponse>({ url: '/', method: 'GET' }),
    staleTime: 60_000,
    retry: 1,
  });
}

/** GET /api/v1/dss/default-criteria — 7 tiêu chí + trọng số mặc định. */
export function useDefaultCriteria() {
  return useQuery({
    queryKey: dssKeys.defaultCriteria(),
    queryFn: () =>
      apiClient<DefaultCriteriaResponse>({ url: '/api/v1/dss/default-criteria', method: 'GET' }),
    staleTime: Infinity,
  });
}

/** GET /api/v1/dss/brands — danh sách hãng xe. */
export function useBrands() {
  return useQuery({
    queryKey: dssKeys.brands(),
    queryFn: () => apiClient<BrandsResponse>({ url: '/api/v1/dss/brands', method: 'GET' }),
    staleTime: Infinity,
  });
}

/**
 * POST /api/v1/dss/run — chạy TOPSIS và trả về bảng xếp hạng.
 *
 * Xử lý riêng trường hợp bộ lọc không còn xe nào: backend hiện khai báo
 * `response_model=WSSResult` với đủ 7 field bắt buộc, nhưng lại trả về
 * `{status: "empty", message: ...}` khi rỗng — FastAPI chặn ở tầng validate
 * response và ném HTTP 500 (`ResponseValidationError`) thay vì kết quả rỗng.
 *
 * Vì vậy ở đây ta chuyển 500 thành `DSSRunEmpty` để giao diện hiện màn hình
 * "chưa tìm thấy xe" kèm gợi ý nới lỏng điều kiện, thay vì báo lỗi hệ thống.
 * Khi backend sửa (dùng `response_model=Union[WSSResult, EmptyResult]` hoặc bỏ
 * `response_model`), nhánh này tự nhiên không còn được kích hoạt.
 */
export function useRunDss(
  options?: Omit<
    UseMutationOptions<DSSRunResponse, AxiosError, DSSRunRequest>,
    'mutationFn'
  >,
) {
  return useMutation<DSSRunResponse, AxiosError, DSSRunRequest>({
    mutationFn: async (body) => {
      try {
        return await apiClient<DSSRunResponse>({
          url: '/api/v1/dss/run',
          method: 'POST',
          data: body,
        });
      } catch (error) {
        // Hỏi lại health-check để phân biệt "backend sập" với "kết quả rỗng".
        const serverWasReachable = await pingServer();
        if (isEmptyResultBug(error, serverWasReachable)) {
          return {
            status: 'empty',
            message: 'Không tìm thấy xe phù hợp với bộ lọc.',
          } satisfies DSSRunEmpty;
        }
        throw error;
      }
    },
    ...options,
  });
}

/** Kiểm tra nhanh backend còn sống không (dùng để phân loại lỗi). */
async function pingServer(): Promise<boolean> {
  try {
    await apiClient<HealthResponse>({ url: '/', method: 'GET', timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Nhận diện lỗi do backend không trả nổi kết quả rỗng.
 *
 * Có hai dạng, tuỳ backend chạy sau proxy hay không:
 *  - Nhận được HTTP 500 (khi CORS header vẫn còn).
 *  - Không nhận được response nào: `ResponseValidationError` được ném TRƯỚC khi
 *    CORSMiddleware kịp gắn `Access-Control-Allow-Origin`, nên trình duyệt chặn
 *    hẳn và Axios chỉ thấy "Network Error".
 *
 * Trường hợp thứ hai không phân biệt được với việc backend thật sự sập, nên
 * chỉ coi là "rỗng" khi ta biết chắc backend vừa còn sống — do đó hàm này nhận
 * thêm cờ `serverWasReachable`.
 */
function isEmptyResultBug(error: unknown, serverWasReachable: boolean): boolean {
  const err = error as AxiosError;
  if (err?.response?.status === 500) return true;
  return serverWasReachable && !err?.response && err?.message === 'Network Error';
}
