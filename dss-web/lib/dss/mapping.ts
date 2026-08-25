/**
 * Chuyển câu trả lời khảo sát thành request cho backend DSS.
 *
 * Luồng:
 *   1. Ngân sách + loại xe  -> hard-filter (max_price_vnd, powertrain).
 *   2. Mục đích sử dụng     -> boost nhẹ điểm ưu tiên của vài tiêu chí.
 *   3. Điểm 1–5             -> trọng số w_i = score_i / Σ score_i.
 *   4. Km/ngày              -> đánh giá mức độ phù hợp (không dùng để lọc cứng).
 */
import {
  CRITERION_ORDER,
  DAILY_KM_THRESHOLDS,
  PRIORITY_QUESTIONS,
  PURPOSE_OPTIONS,
  type PriorityKey,
  type UsagePurpose,
  type VehiclePreference,
} from '@/config/survey';
import type { CriterionKey, DSSRunRequest, Powertrain, RankedBike } from '@/types/dss';

/** Toàn bộ câu trả lời của người dùng. */
export interface SurveyAnswers {
  /* Phần 1 — Nhu cầu */
  budgetVnd: number;
  vehiclePreference: VehiclePreference;
  dailyKm: number;
  purpose: UsagePurpose[];
  /* Phần 2 — Ưu tiên (1–5) */
  priorities: Record<PriorityKey, number>;
}

/** Trọng số đã chuẩn hoá, kèm dữ liệu để hiển thị lại cho người dùng. */
export interface WeightBreakdown {
  key: PriorityKey;
  criterion: CriterionKey;
  label: string;
  /** Điểm người dùng chấm (1–5). */
  rawScore: number;
  /** Điểm sau khi nhân hệ số theo mục đích sử dụng. */
  adjustedScore: number;
  /** w_i = adjustedScore / Σ adjustedScore. */
  weight: number;
}

/**
 * Áp hệ số theo mục đích sử dụng lên điểm thô.
 * Kết quả được kẹp trong [1, 5] để giữ đúng ý nghĩa thang điểm.
 */
export function applyPurposeBoost(
  priorities: Record<PriorityKey, number>,
  purposes: UsagePurpose[],
): Record<PriorityKey, number> {
  const boosts = purposes
    .map((p) => PURPOSE_OPTIONS.find((opt) => opt.value === p)?.weightBoost ?? {})
    .filter(Boolean);

  const out = {} as Record<PriorityKey, number>;
  for (const q of PRIORITY_QUESTIONS) {
    const raw = priorities[q.key] ?? 3;
    let maxFactor = 1;
    for (const b of boosts) {
      if (b[q.key] && b[q.key]! > maxFactor) {
        maxFactor = b[q.key]!;
      }
    }
    out[q.key] = Math.min(5, Math.max(1, raw * maxFactor));
  }
  return out;
}

/**
 * Chuẩn hoá điểm 1–5 thành trọng số: w_i = score_i / Σ score_i.
 * Trả về mảng theo đúng CRITERION_ORDER mà backend mong đợi.
 */
export function computeWeights(answers: SurveyAnswers): {
  weights: number[];
  breakdown: WeightBreakdown[];
} {
  const adjusted = applyPurposeBoost(answers.priorities, answers.purpose);

  const total = PRIORITY_QUESTIONS.reduce((sum, q) => sum + (adjusted[q.key] ?? 3), 0);
  const safeTotal = total > 0 ? total : PRIORITY_QUESTIONS.length;

  const breakdown: WeightBreakdown[] = PRIORITY_QUESTIONS.map((q) => {
    const rawScore = answers.priorities[q.key] ?? 3;
    const adjustedScore = adjusted[q.key] ?? 3;
    return {
      key: q.key,
      criterion: q.criterion,
      label: q.label,
      rawScore,
      adjustedScore,
      weight: adjustedScore / safeTotal,
    };
  });

  // Sắp xếp lại theo thứ tự cột mà backend yêu cầu.
  const byCriterion = new Map(breakdown.map((b) => [b.criterion, b.weight]));
  const weights = CRITERION_ORDER.map((col) => byCriterion.get(col) ?? 0);

  return { weights, breakdown };
}

/** Dựng body cho POST /api/v1/dss/run từ câu trả lời khảo sát. */
export function buildRunRequest(answers: SurveyAnswers): DSSRunRequest {
  const { weights } = computeWeights(answers);

  let powertrain: Powertrain | null = null;
  let vehicle_type: string | null = null;

  if (answers.vehiclePreference === 'EV') {
    powertrain = 'EV';
  } else if (answers.vehiclePreference === 'ALL') {
    powertrain = 'ALL';
  } else {
    powertrain = 'ICE';
    vehicle_type = answers.vehiclePreference;
  }

  return {
    weights,
    max_price_vnd: answers.budgetVnd > 0 ? answers.budgetVnd : null,
    powertrain,
    vehicle_type,
    brand_list: null,
    pairwise_matrix: null,
  };
}

/* -------------------------------------------------------------------------- */
/* Đánh giá mức độ phù hợp về quãng đường                                      */
/* -------------------------------------------------------------------------- */

export type RangeFitLevel = 'good' | 'warning' | 'unknown';

export interface RangeFit {
  level: RangeFitLevel;
  message: string;
}

/**
 * Kiểm tra mức độ phù hợp giữa nhu cầu km/ngày và khả năng của xe.
 *
 * Dataset không có cột `range_km`, nên với xe xăng ta ước lượng quãng đường
 * mỗi lần đổ đầy từ mức tiêu hao nhiên liệu và dung tích bình xăng giả định.
 * Với xe điện, dataset chưa có dung lượng pin nên chỉ đưa cảnh báo định tính.
 */
export function assessRangeFit(bike: RankedBike, dailyKm: number): RangeFit {
  const powertrain = String(bike.powertrain ?? '').toUpperCase();

  if (powertrain === 'EV') {
    if (dailyKm > DAILY_KM_THRESHOLDS.long) {
      return {
        level: 'warning',
        message: `Bạn đi khoảng ${dailyKm} km/ngày. Xe điện phổ thông thường cần sạc lại trong ngày ở mức này — hãy kiểm tra quãng đường thực tế và điểm sạc trước khi mua.`,
      };
    }
    if (dailyKm <= DAILY_KM_THRESHOLDS.short) {
      return {
        level: 'good',
        message: `Với ${dailyKm} km/ngày, xe điện đáp ứng thoải mái và chỉ cần sạc qua đêm.`,
      };
    }
    return {
      level: 'good',
      message: `Với ${dailyKm} km/ngày, xe điện vẫn phù hợp nếu bạn sạc hằng ngày.`,
    };
  }

  const consumption = toNumber(bike.fuel_consumption_l_per_100km);
  if (consumption === null || consumption <= 0) {
    return { level: 'unknown', message: 'Chưa có đủ dữ liệu để ước lượng quãng đường di chuyển.' };
  }

  // Bình xăng phổ thông ở VN khoảng 4.5 L cho xe tay ga / xe số.
  const ASSUMED_TANK_LITERS = 4.5;
  const rangePerTank = (ASSUMED_TANK_LITERS / consumption) * 100;
  const daysPerTank = dailyKm > 0 ? rangePerTank / dailyKm : Infinity;

  if (daysPerTank >= 3) {
    return {
      level: 'good',
      message: `Ước tính đi được ~${Math.round(rangePerTank)} km mỗi lần đổ đầy — khoảng ${Math.floor(daysPerTank)} ngày với nhu cầu ${dailyKm} km/ngày.`,
    };
  }
  if (daysPerTank >= 1) {
    return {
      level: 'good',
      message: `Ước tính đi được ~${Math.round(rangePerTank)} km mỗi lần đổ đầy — bạn cần đổ xăng vài ngày một lần.`,
    };
  }
  return {
    level: 'warning',
    message: `Ước tính chỉ đi được ~${Math.round(rangePerTank)} km mỗi lần đổ đầy, trong khi bạn đi ${dailyKm} km/ngày — sẽ phải đổ xăng mỗi ngày.`,
  };
}

function toNumber(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}
