import Axios, { type AxiosError, type AxiosRequestConfig } from 'axios';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ?? 'http://localhost:8000';

export const AUTH_TOKEN_KEY = 'dss.token';

export const axiosInstance = Axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
});

/** Gắn Bearer token (nếu có) vào mọi request. */
axiosInstance.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      config.headers.set?.('Authorization', `Bearer ${token}`);
    }
  }
  return config;
});

/** Xử lý 401: xoá token và đẩy về trang chủ. */
axiosInstance.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
      window.dispatchEvent(new Event('dss:unauthorized'));
    }
    return Promise.reject(error);
  },
);

/**
 * Mutator dùng cho Orval. Mọi hook sinh ra trong lib/api/generated/ đều gọi
 * hàm này, nên đây là nơi duy nhất cấu hình HTTP cho toàn bộ frontend.
 */
export const apiClient = <T>(config: AxiosRequestConfig, options?: AxiosRequestConfig): Promise<T> => {
  const source = Axios.CancelToken.source();

  const promise = axiosInstance({
    ...config,
    ...options,
    cancelToken: source.token,
  }).then(({ data }) => data as T);

  // Cho phép React Query huỷ request khi component unmount.
  (promise as Promise<T> & { cancel?: () => void }).cancel = () => {
    source.cancel('Query was cancelled');
  };

  return promise;
};

export default apiClient;

export type ErrorType<Error> = AxiosError<Error>;
export type BodyType<BodyData> = BodyData;

/** Trích thông điệp lỗi dễ đọc từ lỗi Axios/FastAPI. */
export function getApiErrorMessage(error: unknown): string {
  const err = error as AxiosError<{ detail?: unknown }>;
  const detail = err?.response?.data?.detail;

  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    const first = detail[0] as { msg?: string } | undefined;
    if (first?.msg) return first.msg;
  }
  if (err?.code === 'ECONNABORTED') return 'Yêu cầu quá thời gian chờ. Vui lòng thử lại.';
  if (err?.message === 'Network Error') {
    return `Không kết nối được tới máy chủ (${API_BASE_URL}). Kiểm tra backend đã chạy chưa.`;
  }
  return err?.message ?? 'Đã có lỗi xảy ra. Vui lòng thử lại.';
}
