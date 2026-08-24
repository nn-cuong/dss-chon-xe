/**
 * Định nghĩa bộ câu hỏi khảo sát.
 *
 * Nguyên tắc thiết kế:
 *  - Tổng thời gian trả lời 1–2 phút (4 câu nhu cầu + 7 thanh trượt ưu tiên).
 *  - Không hỏi thông tin kỹ thuật (không hỏi kW, không hỏi L/100km).
 *  - Không hỏi giá xăng/điện, không hỏi chi phí vận hành.
 *  - Người dùng không cần biết TOPSIS hay AHP là gì.
 */
import type { CriterionKey, Powertrain, VehicleType } from '@/types/dss';

/* -------------------------------------------------------------------------- */
/* PHẦN 1 — NHU CẦU                                                            */
/* -------------------------------------------------------------------------- */

export interface PowertrainOption {
  value: Powertrain;
  label: string;
  hint: string;
  emoji: string;
}

export const POWERTRAIN_OPTIONS: PowertrainOption[] = [
  { value: 'ICE', label: 'Xe xăng', hint: 'Đổ xăng, đi được xa, trạm xăng ở khắp nơi', emoji: '⛽' },
  { value: 'EV', label: 'Xe điện', hint: 'Sạc điện, chạy êm, chi phí mỗi km thấp hơn', emoji: '🔌' },
  { value: 'ALL', label: 'Không giới hạn', hint: 'Xem cả hai loại và so sánh', emoji: '🔀' },
];

/** Mục đích sử dụng chính — dùng để gợi ý loại xe và điều chỉnh nhẹ trọng số. */
export type UsagePurpose =
  | 'di_hoc'
  | 'di_lam'
  | 'ca_nhan'
  | 'dua_don'
  | 'mua_sam'
  | 'duong_dai';

export interface PurposeOption {
  value: UsagePurpose;
  label: string;
  hint: string;
  emoji: string;
  /**
   * Loại xe gợi ý cho mục đích này. Chỉ dùng để hiển thị gợi ý — KHÔNG tự động
   * hard-filter, vì người dùng có thể muốn xem tất cả.
   */
  suggestedVehicleTypes: VehicleType[];
  /**
   * Hệ số nhân áp lên điểm ưu tiên của một số tiêu chí. Ví dụ "Đưa đón" thì
   * an toàn và cốp xe quan trọng hơn mặc định. Hệ số nằm trong khoảng
   * 1.0–1.3 để không lấn át lựa chọn của người dùng.
   */
  weightBoost: Partial<Record<PriorityKey, number>>;
}

export const PURPOSE_OPTIONS: PurposeOption[] = [
  {
    value: 'di_hoc',
    label: 'Đi học',
    hint: 'Quãng đường ngắn, ưu tiên giá và dễ đi',
    emoji: '🎒',
    suggestedVehicleTypes: ['xe số', 'xe tay ga'],
    weightBoost: { price: 1.2, weight: 1.15 },
  },
  {
    value: 'di_lam',
    label: 'Đi làm',
    hint: 'Đi lại hằng ngày, ưu tiên ổn định và tiết kiệm',
    emoji: '💼',
    suggestedVehicleTypes: ['xe tay ga', 'xe số'],
    weightBoost: { range: 1.15, durability: 1.1 },
  },
  {
    value: 'ca_nhan',
    label: 'Đi lại cá nhân',
    hint: 'Nhu cầu linh hoạt, không cố định',
    emoji: '🛵',
    suggestedVehicleTypes: [],
    weightBoost: {},
  },
  {
    value: 'dua_don',
    label: 'Đưa đón',
    hint: 'Chở thêm người, ưu tiên an toàn và chỗ để đồ',
    emoji: '👨‍👩‍👧',
    suggestedVehicleTypes: ['xe tay ga'],
    weightBoost: { safety: 1.25, storage: 1.2 },
  },
  {
    value: 'mua_sam',
    label: 'Mua sắm',
    hint: 'Cần cốp rộng, xe nhẹ, dễ luồn lách',
    emoji: '🛍️',
    suggestedVehicleTypes: ['xe tay ga'],
    weightBoost: { storage: 1.3, weight: 1.2 },
  },
  {
    value: 'duong_dai',
    label: 'Đi đường dài',
    hint: 'Chạy xa, ưu tiên quãng đường và độ bền',
    emoji: '🛣️',
    suggestedVehicleTypes: ['xe côn tay', 'xe tay ga'],
    weightBoost: { range: 1.3, performance: 1.2, durability: 1.15 },
  },
];

/* -------------------------------------------------------------------------- */
/* PHẦN 2 — MỨC ĐỘ ƯU TIÊN (7 tiêu chí, thang 1–5)                             */
/* -------------------------------------------------------------------------- */

export type PriorityKey =
  | 'price'
  | 'performance'
  | 'safety'
  | 'range'
  | 'storage'
  | 'weight'
  | 'durability';

export interface PriorityQuestion {
  key: PriorityKey;
  /** Nhãn ngắn hiển thị trên thanh trượt. */
  label: string;
  /** Câu hỏi đầy đủ, viết theo ngôn ngữ người dùng phổ thông. */
  question: string;
  emoji: string;
  /** Cột tương ứng trong dataset mà tiêu chí này điều khiển trọng số. */
  criterion: CriterionKey;
  /** Benefit = càng cao càng tốt, Cost = càng thấp càng tốt. */
  direction: 'Benefit' | 'Cost';
  /** Mô tả ý nghĩa của mức 1 và mức 5, giúp người dùng chấm điểm nhất quán. */
  lowLabel: string;
  highLabel: string;
}

/**
 * 7 câu hỏi ưu tiên, xếp theo đúng thứ tự đề bài.
 *
 * Lưu ý về ánh xạ "Quãng đường di chuyển": dataset hiện tại KHÔNG có cột
 * `range_km`. Tiêu chí gần nhất về mặt ý nghĩa là mức tiêu hao nhiên liệu
 * (`fuel_consumption_l_per_100km`, kiểu Cost) — càng tốn ít thì đi được càng
 * xa trên một bình xăng / một lần sạc. Khi backend bổ sung cột `range_km`,
 * chỉ cần đổi `criterion` ở đây và cập nhật CRITERION_ORDER bên dưới.
 */
export const PRIORITY_QUESTIONS: PriorityQuestion[] = [
  {
    key: 'price',
    label: 'Giá mua',
    question: 'Giá mua xe quan trọng với bạn đến mức nào?',
    emoji: '💰',
    criterion: 'price_vnd',
    direction: 'Cost',
    lowLabel: 'Không quá quan trọng',
    highLabel: 'Rất quan trọng, muốn rẻ nhất',
  },
  {
    key: 'performance',
    label: 'Hiệu năng',
    question: 'Bạn cần xe khoẻ, bốc, leo dốc tốt đến mức nào?',
    emoji: '⚡',
    criterion: 'max_power_kw',
    direction: 'Benefit',
    lowLabel: 'Đi phố nhẹ nhàng là đủ',
    highLabel: 'Cần xe thật khoẻ',
  },
  {
    key: 'safety',
    label: 'An toàn',
    question: 'Bạn coi trọng trang bị an toàn (phanh ABS) đến mức nào?',
    emoji: '🛡️',
    criterion: 'abs',
    direction: 'Benefit',
    lowLabel: 'Bình thường',
    highLabel: 'Bắt buộc phải có',
  },
  {
    key: 'range',
    label: 'Quãng đường di chuyển',
    question: 'Bạn cần xe đi được xa trên mỗi lần đổ xăng / sạc đến mức nào?',
    emoji: '🛣️',
    criterion: 'fuel_consumption_l_per_100km',
    direction: 'Cost',
    lowLabel: 'Chỉ đi loanh quanh gần',
    highLabel: 'Cần đi được thật xa',
  },
  {
    key: 'storage',
    label: 'Khả năng chứa đồ',
    question: 'Bạn cần cốp xe rộng để đựng đồ đến mức nào?',
    emoji: '🎒',
    criterion: 'underseat_storage_l',
    direction: 'Benefit',
    lowLabel: 'Hầu như không để đồ',
    highLabel: 'Cần cốp thật rộng',
  },
  {
    key: 'weight',
    label: 'Trọng lượng',
    question: 'Xe nhẹ, dễ dắt và xoay trở quan trọng với bạn đến mức nào?',
    emoji: '🪶',
    criterion: 'curb_weight_kg',
    direction: 'Cost',
    lowLabel: 'Không thành vấn đề',
    highLabel: 'Rất cần xe nhẹ',
  },
  {
    key: 'durability',
    label: 'Độ bền / Bảo hành',
    question: 'Bạn coi trọng chính sách bảo hành dài và độ bền đến mức nào?',
    emoji: '🔧',
    criterion: 'vehicle_warranty_months',
    direction: 'Benefit',
    lowLabel: 'Bình thường',
    highLabel: 'Rất quan trọng',
  },
];

/**
 * Thứ tự 7 tiêu chí mà backend mong đợi trong mảng `weights`.
 * Phải khớp chính xác với `build_criteria_config()` ở
 * dss-service/backend/models/topsis.py.
 */
export const CRITERION_ORDER: CriterionKey[] = [
  'price_vnd',
  'fuel_consumption_l_per_100km',
  'max_power_kw',
  'underseat_storage_l',
  'abs',
  'curb_weight_kg',
  'vehicle_warranty_months',
];

/** Điểm ưu tiên mặc định: 3/5 cho tất cả (trung lập). */
export const DEFAULT_PRIORITY_SCORE = 3;

export const PRIORITY_SCALE = [1, 2, 3, 4, 5] as const;

export const PRIORITY_SCALE_LABELS: Record<number, string> = {
  1: 'Không quan trọng',
  2: 'Ít quan trọng',
  3: 'Bình thường',
  4: 'Quan trọng',
  5: 'Rất quan trọng',
};

/* -------------------------------------------------------------------------- */
/* Ngân sách & quãng đường                                                     */
/* -------------------------------------------------------------------------- */

/** Các mốc ngân sách gợi ý (VNĐ) để bấm nhanh thay vì gõ số. */
export const BUDGET_PRESETS = [
  { label: 'Dưới 25 triệu', value: 25_000_000 },
  { label: 'Dưới 40 triệu', value: 40_000_000 },
  { label: 'Dưới 60 triệu', value: 60_000_000 },
  { label: 'Dưới 100 triệu', value: 100_000_000 },
] as const;

export const BUDGET_MIN = 5_000_000;
export const BUDGET_MAX = 2_000_000_000;

/** Ngưỡng km/ngày để đánh giá mức độ phù hợp về quãng đường. */
export const DAILY_KM_THRESHOLDS = {
  /** Dưới mức này coi là đi gần — xe điện thoải mái. */
  short: 20,
  /** Trên mức này coi là đi nhiều — cảnh báo với xe điện tầm ngắn. */
  long: 60,
} as const;

export const DAILY_KM_MAX = 500;
