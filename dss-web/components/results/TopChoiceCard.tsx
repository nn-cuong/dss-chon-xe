'use client';

/** Xe hạng 1 — điểm nhấn duy nhất của trang, dùng màu cam lacquer. */
import { useMemo } from 'react';

import { SpecGrid } from '@/components/results/SpecGrid';
import { computeStrengths, StrengthChips } from '@/components/results/WhyThisBike';
import { bikeBrand, bikeLabel, formatPercent, formatScore, formatVnd } from '@/lib/dss/format';
import { assessRangeFit } from '@/lib/dss/mapping';
import type { RankedBike } from '@/types/dss';

interface TopChoiceCardProps {
  bike: RankedBike;
  allBikes: RankedBike[];
  weights: number[];
  explanation?: string;
  dailyKm: number;
}

export function TopChoiceCard({
  bike,
  allBikes,
  weights,
  explanation,
  dailyKm,
}: TopChoiceCardProps) {
  const strengths = useMemo(
    () => computeStrengths(bike, allBikes, weights),
    [bike, allBikes, weights],
  );
  const rangeFit = useMemo(() => assessRangeFit(bike, dailyKm), [bike, dailyKm]);
  const runnerUp = allBikes.find((b) => b.rank === 2);

  return (
    <article className="overflow-hidden rounded-lg border border-divider bg-content1">
      {/* Dải màu mỏng — dấu hiệu duy nhất dùng màu nhấn trên toàn trang. */}
      <div className="h-1 bg-secondary" aria-hidden />

      <div className="px-5 py-6 sm:px-8 sm:py-7">
        <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
          <div className="min-w-0">
            <p className="label-eyebrow text-secondary">Phù hợp nhất với bạn</p>
            <h2 className="mt-2.5 text-balance font-display text-2xl font-bold leading-tight tracking-tight sm:text-[1.875rem]">
              {bikeLabel(bike)}
            </h2>
            <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2.5 text-sm text-default-500">
              <span>{bikeBrand(bike)}</span>
              {bike.vehicle_type ? (
                <>
                  <span aria-hidden>·</span>
                  <span>{String(bike.vehicle_type)}</span>
                </>
              ) : null}
            </p>
          </div>

          <div className="flex shrink-0 items-end gap-8">
            <Stat label="Giá bán" value={formatVnd(bike.price_vnd)} />
            <Stat
              label="Độ phù hợp"
              value={formatPercent(bike.topsis_score, 1)}
              note={`Ci ${formatScore(bike.topsis_score)}`}
              emphasis
            />
          </div>
        </div>

        <div className="rule-t mt-7 pt-6">
          <SpecGrid bike={bike} />
        </div>

        <div className="rule-t mt-7 grid gap-7 pt-6 lg:grid-cols-2 lg:gap-10">
          <section>
            <h3 className="label-eyebrow text-default-500">Vì sao xe này đứng đầu</h3>
            <div className="mt-3.5">
              <StrengthChips strengths={strengths} />
            </div>
            {runnerUp && (
              <p className="mt-3.5 text-xs leading-relaxed text-default-500">
                Cao hơn á quân{' '}
                <strong className="font-medium text-default-700">{bikeLabel(runnerUp)}</strong>{' '}
                {formatPercent(Number(bike.topsis_score) - Number(runnerUp.topsis_score), 1)}.
              </p>
            )}
          </section>

          <section>
            <h3 className="label-eyebrow text-default-500">Quãng đường di chuyển</h3>
            <p
              className={`mt-3.5 border-l-2 pl-3.5 text-sm leading-relaxed ${
                rangeFit.level === 'warning'
                  ? 'border-warning text-default-700'
                  : 'border-primary text-default-600'
              }`}
            >
              {rangeFit.message}
            </p>

            {explanation && (
              <details className="group mt-4">
                <summary className="cursor-pointer list-none font-mono text-[11px] tracking-wide text-default-500 hover:text-foreground">
                  <span className="group-open:hidden">+ Phân tích chi tiết</span>
                  <span className="hidden group-open:inline">− Thu gọn</span>
                </summary>
                <p className="mt-2.5 whitespace-pre-line text-xs leading-relaxed text-default-500">
                  {explanation.replace(/\*\*/g, '')}
                </p>
              </details>
            )}
          </section>
        </div>
      </div>
    </article>
  );
}

function Stat({
  label,
  value,
  note,
  emphasis,
}: {
  label: string;
  value: string;
  note?: string;
  emphasis?: boolean;
}) {
  return (
    <div className="text-right">
      <p className="label-eyebrow text-default-400">{label}</p>
      <p
        className={`mt-1.5 font-mono font-semibold tabular-nums ${
          emphasis ? 'text-2xl text-secondary' : 'text-lg'
        }`}
      >
        {value}
      </p>
      {note && <p className="mt-0.5 font-mono text-[10px] text-default-400">{note}</p>}
    </div>
  );
}
