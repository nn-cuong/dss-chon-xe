'use client';

/** Tóm tắt điều kiện đã chọn + hành động xuất / sửa. */
import { Button } from '@heroui/button';

import { POWERTRAIN_OPTIONS, PURPOSE_OPTIONS } from '@/config/survey';
import { exportRankingsCsv, exportRankingsPdf } from '@/lib/dss/export';
import { formatVndShort } from '@/lib/dss/format';
import type { SurveyAnswers } from '@/lib/dss/mapping';
import type { RankedBike } from '@/types/dss';

interface ResultSummaryBarProps {
  answers: SurveyAnswers;
  rankings: RankedBike[];
  totalCandidates: number;
  explanation?: string;
  onEdit: () => void;
  onRestart: () => void;
}

export function ResultSummaryBar({
  answers,
  rankings,
  totalCandidates,
  explanation,
  onEdit,
  onRestart,
}: ResultSummaryBarProps) {
  const powertrain = POWERTRAIN_OPTIONS.find((o) => o.value === answers.powertrain);
  const purposeLabels = answers.purpose
    .map((p) => PURPOSE_OPTIONS.find((o) => o.value === p)?.label)
    .filter(Boolean)
    .join(', ');

  const facts = [
    `≤ ${formatVndShort(answers.budgetVnd)}`,
    powertrain?.label ?? '',
    `${answers.dailyKm} km/ngày`,
    purposeLabels || '',
  ].filter(Boolean);

  return (
    <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-xl font-bold tracking-tight">
          <span className="font-mono tabular-nums text-primary">{totalCandidates}</span> mẫu xe
          phù hợp với bạn
        </h1>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] tracking-wide text-default-500">
          {facts.map((f, i) => (
            <span key={f} className="flex items-center gap-2">
              {i > 0 && <span aria-hidden className="text-default-300">·</span>}
              {f}
            </span>
          ))}
        </p>
      </div>

      <div className="no-print flex shrink-0 flex-wrap items-center gap-1">
        <Button size="sm" variant="light" radius="sm" onPress={onEdit}>
          Sửa câu trả lời
        </Button>
        <span className="h-4 w-px bg-divider" aria-hidden />
        <Button size="sm" variant="light" radius="sm" onPress={() => exportRankingsCsv(rankings)}>
          CSV
        </Button>
        <Button
          size="sm"
          variant="light"
          radius="sm"
          onPress={() => exportRankingsPdf(rankings, explanation)}
        >
          PDF
        </Button>
        <span className="h-4 w-px bg-divider" aria-hidden />
        <Button size="sm" variant="light" radius="sm" onPress={onRestart}>
          Làm lại
        </Button>
      </div>
    </section>
  );
}
