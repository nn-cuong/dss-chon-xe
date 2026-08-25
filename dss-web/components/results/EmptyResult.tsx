'use client';

/** Khi hard-filter loại hết xe: giải thích và gợi ý cách nới lỏng điều kiện. */
import { Button } from '@heroui/button';

import { BUDGET_PRESETS, VEHICLE_TYPE_OPTIONS } from '@/config/survey';
import { formatVndShort } from '@/lib/dss/format';
import type { SurveyAnswers } from '@/lib/dss/mapping';

interface EmptyResultProps {
  message: string;
  answers: SurveyAnswers;
  onRelaxBudget: (nextBudget: number) => void;
  onRelaxVehiclePreference: () => void;
  onEdit: () => void;
}

export function EmptyResult({
  message,
  answers,
  onRelaxBudget,
  onRelaxVehiclePreference,
  onEdit,
}: EmptyResultProps) {
  // Nhân 1.5 lần thường vẫn chưa đủ mua chiếc rẻ nhất khi ngân sách quá thấp,
  // nên chọn mốc gợi ý đầu tiên thực sự cao hơn ngân sách hiện tại.
  const suggestedBudget =
    BUDGET_PRESETS.find((p) => p.value > answers.budgetVnd)?.value ??
    Math.round((answers.budgetVnd * 1.5) / 1_000_000) * 1_000_000;

  const vehiclePreferenceLabel =
    VEHICLE_TYPE_OPTIONS.find((o) => o.value === answers.vehiclePreference)?.label ?? '';

  return (
    <section className="rounded-lg border border-divider bg-content1 px-6 py-12 sm:px-10">
      <p className="label-eyebrow text-warning">Không có kết quả</p>
      <h1 className="mt-3 font-display text-2xl font-bold tracking-tight">
        Chưa có mẫu xe nào khớp
      </h1>
      <p className="mt-2 max-w-[52ch] text-sm leading-relaxed text-default-600">{message}</p>

      <dl className="rule-t mt-6 flex flex-wrap gap-x-10 gap-y-3 pt-5">
        <div>
          <dt className="label-eyebrow text-default-400">Ngân sách</dt>
          <dd className="mt-1 font-mono text-sm tabular-nums">
            ≤ {formatVndShort(answers.budgetVnd)}
          </dd>
        </div>
        {answers.vehiclePreference !== 'ALL' && (
          <div>
            <dt className="text-xs text-default-500">Loại xe</dt>
            <dd className="mt-1 text-sm font-medium">{vehiclePreferenceLabel}</dd>
          </div>
        )}
      </dl>

      <div className="mt-8 flex flex-wrap gap-2">
        <Button color="primary" radius="sm" onPress={() => onRelaxBudget(suggestedBudget)}>
          Nâng lên {formatVndShort(suggestedBudget)}
        </Button>
        {answers.vehiclePreference !== 'ALL' && (
          <Button variant="bordered" radius="sm" onPress={onRelaxVehiclePreference}>
            Xem tất cả loại xe
          </Button>
        )}
        <Button variant="light" radius="sm" onPress={onEdit}>
          Sửa câu trả lời
        </Button>
      </div>
    </section>
  );
}
