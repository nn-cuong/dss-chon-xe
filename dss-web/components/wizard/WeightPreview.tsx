'use client';

/**
 * Cho thấy trọng số w_i = score_i / Σ score_i mà hệ thống sẽ dùng.
 * Người dùng không cần hiểu TOPSIS — phần này chỉ trả lời "hệ thống đang
 * ưu tiên gì" bằng một biểu đồ thanh nhỏ.
 */
import { useMemo } from 'react';

import { PURPOSE_OPTIONS, type PriorityKey, type UsagePurpose } from '@/config/survey';
import { formatPercent } from '@/lib/dss/format';
import { computeWeights } from '@/lib/dss/mapping';

interface WeightPreviewProps {
  priorities: Record<PriorityKey, number>;
  purpose: UsagePurpose[];
}

export function WeightPreview({ priorities, purpose }: WeightPreviewProps) {
  const { breakdown } = useMemo(
    () =>
      computeWeights({
        budgetVnd: 0,
        powertrain: 'ALL',
        dailyKm: 0,
        purpose,
        priorities,
      }),
    [priorities, purpose],
  );

  const sorted = useMemo(() => [...breakdown].sort((a, b) => b.weight - a.weight), [breakdown]);
  const max = sorted[0]?.weight ?? 1;
  const purposeLabel = purpose
    .map((p) => PURPOSE_OPTIONS.find((opt) => opt.value === p)?.label)
    .filter(Boolean)
    .join(', ');
  const boosted = sorted.filter((b) => b.adjustedScore > b.rawScore + 1e-6);

  return (
    <section className="rounded-lg border border-divider bg-content1 px-5 py-6 sm:px-8">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="label-eyebrow text-default-500">Trọng số hệ thống sẽ dùng</h2>
        <span className="font-mono text-[11px] tabular-nums text-default-400">
          tổng = 100%
        </span>
      </div>

      <ul className="mt-5 flex flex-col gap-2.5">
        {sorted.map((item) => (
          <li key={item.key} className="grid grid-cols-[10.5rem_1fr_2.75rem] items-center gap-3">
            <span className="truncate text-[13px] text-default-700">{item.label}</span>
            <span className="h-[7px] overflow-hidden rounded-full bg-default-200">
              <span
                className="block h-full rounded-full bg-primary transition-[width] duration-300"
                style={{ width: `${max > 0 ? (item.weight / max) * 100 : 0}%` }}
              />
            </span>
            <span className="text-right font-mono text-[11px] tabular-nums text-default-600">
              {formatPercent(item.weight, 0)}
            </span>
          </li>
        ))}
      </ul>

      {boosted.length > 0 && (
        <p className="rule-t mt-5 pt-4 text-xs leading-relaxed text-default-500">
          Vì bạn chọn mục đích <strong className="font-semibold text-foreground">{purposeLabel}</strong>,
          hệ thống tăng nhẹ ưu tiên cho {boosted.map((b) => b.label.toLowerCase()).join(', ')}.
        </p>
      )}
    </section>
  );
}
