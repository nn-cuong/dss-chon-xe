'use client';

/** PHẦN 2 — MỨC ĐỘ ƯU TIÊN: 7 tiêu chí, thang 1–5. */
import { Button } from '@heroui/button';
import { Slider } from '@heroui/slider';
import { zodResolver } from '@hookform/resolvers/zod';
import clsx from 'clsx';
import { Controller, useForm } from 'react-hook-form';

import {
  PRIORITY_QUESTIONS,
  type PriorityKey,
  type UsagePurpose,
} from '@/config/survey';
import { WeightPreview } from '@/components/wizard/WeightPreview';
import { prioritiesSchema, type PrioritiesFormValues } from '@/lib/dss/schema';

interface StepPrioritiesProps {
  defaultValues: PrioritiesFormValues;
  purpose: UsagePurpose[];
  isSubmitting?: boolean;
  onBack: () => void;
  onSubmit: (values: PrioritiesFormValues) => void;
}

export function StepPriorities({
  defaultValues,
  purpose,
  isSubmitting = false,
  onBack,
  onSubmit,
}: StepPrioritiesProps) {
  const { control, handleSubmit, watch, reset } = useForm<PrioritiesFormValues>({
    resolver: zodResolver(prioritiesSchema),
    defaultValues,
  });

  const priorities = watch('priorities') as Record<PriorityKey, number>;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <section className="rounded-lg border border-divider bg-content1 px-5 py-7 sm:px-8 sm:py-9">
        <p className="label-eyebrow text-primary">Phần 2 / 2</p>
        <h1 className="mt-3 text-balance font-display text-2xl font-bold tracking-tight sm:text-[1.75rem]">
          Điều gì quan trọng với bạn?
        </h1>
        <p className="mt-2 max-w-[58ch] text-sm leading-relaxed text-default-600">
          Kéo từ 1 (không quan trọng) đến 5 (rất quan trọng). Mặc định là 3 — chỉ cần chỉnh những
          tiêu chí bạn thực sự quan tâm.
        </p>

        <div className="mt-8 flex flex-col">
          {PRIORITY_QUESTIONS.map((q, i) => {
            const score = priorities?.[q.key] ?? 3;
            return (
              <div key={q.key} className="rule-t py-5 first:border-t-0 first:pt-0">
                <div className="mb-2.5 flex items-baseline justify-between gap-4">
                  <label
                    htmlFor={`priority-${q.key}`}
                    className="flex items-baseline gap-2.5 text-[15px] font-medium"
                  >
                    <span className="font-mono text-[11px] tabular-nums text-default-400">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span>{q.question}</span>
                  </label>
                  <span
                    className={clsx(
                      'shrink-0 whitespace-nowrap font-mono text-[11px] tracking-wide',
                      score >= 4 ? 'text-primary' : 'text-default-500',
                    )}
                  >
                    {score}/5 · {q.scaleLabels[score]}
                  </span>
                </div>

                <Controller
                  name={`priorities.${q.key}` as const}
                  control={control}
                  render={({ field }) => (
                    <Slider
                      id={`priority-${q.key}`}
                      aria-label={q.label}
                      size="sm"
                      step={1}
                      minValue={1}
                      maxValue={5}
                      showSteps
                      value={field.value}
                      onChange={(v) => field.onChange(Array.isArray(v) ? v[0] : v)}
                      color="primary"
                      classNames={{
                        base: 'max-w-full ps-8',
                        track: 'bg-default-200',
                      }}
                    />
                  )}
                />

                <div className="mt-1.5 flex justify-between ps-8 text-[11px] text-default-400">
                  <span>{q.lowLabel}</span>
                  <span className="text-right">{q.highLabel}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="rule-t mt-2 flex flex-wrap items-center justify-between gap-2 pt-5">
          <p className="text-xs text-default-500">
            Không chắc? Để nguyên mặc định vẫn cho kết quả hợp lý.
          </p>
          <Button size="sm" variant="light" radius="sm" type="button" onPress={() => reset(defaultValues)}>
            Đặt lại
          </Button>
        </div>
      </section>

      <WeightPreview priorities={priorities} purpose={purpose} />

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button
          type="button"
          variant="bordered"
          radius="sm"
          size="lg"
          onPress={onBack}
          isDisabled={isSubmitting}
        >
          Quay lại
        </Button>
        <Button
          type="submit"
          color="primary"
          size="lg"
          radius="sm"
          isLoading={isSubmitting}
          className="px-7 font-medium"
        >
          {isSubmitting ? 'Đang tìm xe…' : 'Tìm xe phù hợp'}
        </Button>
      </div>
    </form>
  );
}
