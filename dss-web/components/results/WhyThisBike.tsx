'use client';

/**
 * Giải thích ngắn gọn tại sao xe đứng cao trong bảng xếp hạng.
 *
 * Kết hợp hai nguồn:
 *  - `explanation` do backend sinh (so sánh top-1 với top-2).
 *  - Các điểm mạnh tự tính ở FE: tiêu chí có trọng số cao mà xe này vượt trội
 *    so với mặt bằng chung của các xe còn lại.
 */

import { CRITERION_ORDER, PRIORITY_QUESTIONS } from '@/config/survey';
import { formatNumber, formatVndShort } from '@/lib/dss/format';
import type { CriterionKey, RankedBike } from '@/types/dss';

export interface Strength {
  criterion: CriterionKey;
  label: string;
  text: string;
  /** Phần trăm xe khác mà mẫu này vượt qua ở tiêu chí này (0–1). */
  percentile: number;
  weight: number;
}

const CRITERION_LABEL: Record<CriterionKey, string> = {
  price_vnd: 'Giá bán',
  fuel_consumption_l_per_100km: 'Quãng đường / tiết kiệm nhiên liệu',
  max_power_kw: 'Hiệu năng',
  underseat_storage_l: 'Khả năng chứa đồ',
  abs: 'An toàn (ABS)',
  curb_weight_kg: 'Trọng lượng',
  vehicle_warranty_months: 'Bảo hành',
};

const BENEFIT_MASK: Record<CriterionKey, boolean> = {
  price_vnd: false,
  fuel_consumption_l_per_100km: false,
  max_power_kw: true,
  underseat_storage_l: true,
  abs: true,
  curb_weight_kg: false,
  vehicle_warranty_months: true,
};

/**
 * Tính các điểm mạnh nổi bật của một xe so với toàn bộ danh sách còn lại.
 * Chỉ giữ những tiêu chí mà xe nằm trong nhóm dẫn đầu (percentile ≥ 0.6).
 */
export function computeStrengths(
  bike: RankedBike,
  allBikes: RankedBike[],
  weights: number[],
  limit = 3,
): Strength[] {
  const strengths: Strength[] = [];

  CRITERION_ORDER.forEach((criterion, idx) => {
    const value = Number(bike[criterion]);
    if (!Number.isFinite(value)) return;

    const others = allBikes
      .map((b) => Number(b[criterion]))
      .filter((v) => Number.isFinite(v));
    if (others.length < 2) return;

    const isBenefit = BENEFIT_MASK[criterion];
    const beaten = others.filter((v) => (isBenefit ? value > v : value < v)).length;
    const percentile = beaten / (others.length - 1);

    if (percentile < 0.6) return;

    strengths.push({
      criterion,
      label: CRITERION_LABEL[criterion],
      text: describeValue(criterion, value, percentile),
      percentile,
      weight: weights[idx] ?? 0,
    });
  });

  // Ưu tiên tiêu chí mà người dùng coi trọng, sau đó tới mức độ vượt trội.
  return strengths
    .sort((a, b) => b.weight * b.percentile - a.weight * a.percentile)
    .slice(0, limit);
}

function describeValue(criterion: CriterionKey, value: number, percentile: number): string {
  const better = `tốt hơn ${Math.round(percentile * 100)}% xe còn lại`;
  switch (criterion) {
    case 'price_vnd':
      return `Giá ${formatVndShort(value)} — rẻ hơn ${Math.round(percentile * 100)}% xe còn lại`;
    case 'fuel_consumption_l_per_100km':
      return `Chỉ tốn ${formatNumber(value, 2)} L/100km — tiết kiệm hơn ${Math.round(percentile * 100)}% xe còn lại`;
    case 'max_power_kw':
      return `Công suất ${formatNumber(value, 2)} kW — khoẻ hơn ${Math.round(percentile * 100)}% xe còn lại`;
    case 'underseat_storage_l':
      return `Cốp ${formatNumber(value, 1)} L — rộng hơn ${Math.round(percentile * 100)}% xe còn lại`;
    case 'abs':
      return value > 0 ? 'Có phanh ABS — an toàn hơn khi phanh gấp' : `An toàn ${better}`;
    case 'curb_weight_kg':
      return `Nặng ${formatNumber(value, 0)} kg — nhẹ hơn ${Math.round(percentile * 100)}% xe còn lại`;
    case 'vehicle_warranty_months':
      return `Bảo hành ${formatNumber(value, 0)} tháng — dài hơn ${Math.round(percentile * 100)}% xe còn lại`;
    default:
      return better;
  }
}

/** Danh sách lý do "vì sao xe này đứng cao". */
export function StrengthChips({ strengths }: { strengths: Strength[] }) {
  if (strengths.length === 0) {
    return (
      <p className="text-sm leading-relaxed text-default-600">
        Xe này cân bằng tốt trên nhiều tiêu chí bạn ưu tiên, thay vì nổi trội ở một điểm riêng lẻ.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {strengths.map((s) => (
        <li key={s.criterion} className="flex items-start gap-2.5 text-sm leading-snug">
          <svg
            className="mt-[3px] h-3.5 w-3.5 shrink-0 text-primary"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden
          >
            <path
              d="m3 8.5 3.2 3.2L13 5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-default-700">{s.text}</span>
        </li>
      ))}
    </ul>
  );
}

/** Ánh xạ nhanh từ khoá tiêu chí sang câu hỏi ưu tiên tương ứng (dùng cho tooltip). */
export const CRITERION_TO_QUESTION = Object.fromEntries(
  PRIORITY_QUESTIONS.map((q) => [q.criterion, q]),
) as Record<CriterionKey, (typeof PRIORITY_QUESTIONS)[number]>;
