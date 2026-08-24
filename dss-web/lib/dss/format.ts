/** Hàm định dạng hiển thị cho giao diện tiếng Việt. */

/** 58790000 -> "58.790.000 ₫" */
export function formatVnd(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

/** 58790000 -> "58,8 triệu" — dạng gọn cho thẻ và bảng. */
export function formatVndShort(value: number | null | undefined): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} tỷ`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} triệu`;
  return new Intl.NumberFormat('vi-VN').format(n);
}

export function formatNumber(value: unknown, digits = 1): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('vi-VN', { maximumFractionDigits: digits });
}

/** 0.7231 -> "72,3%" */
export function formatPercent(value: number | null | undefined, digits = 1): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `${(n * 100).toLocaleString('vi-VN', { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;
}

/** Điểm TOPSIS Ci: hiển thị 4 chữ số thập phân như trong tài liệu backend. */
export function formatScore(value: number | null | undefined): string {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(4) : '—';
}

export function formatPowertrain(value: unknown): string {
  const v = String(value ?? '').toUpperCase();
  if (v === 'EV') return 'Xe điện';
  if (v === 'ICE') return 'Xe xăng';
  return '—';
}

export function formatAbs(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n > 0 ? 'Có ABS' : 'Không có';
}

/** Chuẩn hoá tên xe để hiển thị. */
export function bikeLabel(bike: Record<string, unknown>): string {
  for (const key of ['bike_name', 'model_name', 'variant', 'model'] as const) {
    const v = bike[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return 'Xe không rõ tên';
}

/** Suy ra hãng xe từ tên nếu backend không trả về cột `brand`. */
export function bikeBrand(bike: Record<string, unknown>): string {
  const brand = bike.brand;
  if (typeof brand === 'string' && brand.trim()) return brand.trim();
  const name = bikeLabel(bike);
  return name.split(/\s+/)[0] ?? '—';
}
