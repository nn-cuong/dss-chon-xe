'use client';

/** PHẦN 1 — NHU CẦU: 4 câu hỏi ngắn. */
import { Button } from '@heroui/button';
import { NumberInput } from '@heroui/number-input';
import { Radio, RadioGroup } from '@heroui/radio';
import { zodResolver } from '@hookform/resolvers/zod';
import clsx from 'clsx';
import { Controller, useForm } from 'react-hook-form';

import {
  BUDGET_PRESETS,
  DAILY_KM_MAX,
  DAILY_KM_THRESHOLDS,
  POWERTRAIN_OPTIONS,
  PURPOSE_OPTIONS,
} from '@/config/survey';
import { Field, StepShell } from '@/components/wizard/StepShell';
import { formatVndShort } from '@/lib/dss/format';
import { needsSchema, type NeedsFormValues } from '@/lib/dss/schema';

interface StepNeedsProps {
  defaultValues: NeedsFormValues;
  onSubmit: (values: NeedsFormValues) => void;
}

/** Ô chọn dùng chung cho radio — viền mảnh, nền đổi khi được chọn. */
const optionBase =
  'm-0 max-w-full items-start gap-3 rounded-md border p-3 transition-colors cursor-pointer';
const optionOn = 'border-primary bg-primary/[0.06]';
const optionOff = 'border-divider hover:border-default-300 hover:bg-default-50';

export function StepNeeds({ defaultValues, onSubmit }: StepNeedsProps) {
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<NeedsFormValues>({
    resolver: zodResolver(needsSchema),
    defaultValues,
    mode: 'onBlur',
  });

  const budget = watch('budgetVnd');
  const dailyKm = watch('dailyKm');
  const powertrain = watch('powertrain');
  const purpose = watch('purpose');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <StepShell
        eyebrow="Phần 1 / 2"
        title="Bạn cần một chiếc xe như thế nào?"
        lede="Bốn câu hỏi để hệ thống loại bớt những mẫu xe không phù hợp trước khi chấm điểm."
      >
        {/* 1 — Ngân sách */}
        <Field index={1} label="Ngân sách tối đa của bạn?">
          <Controller
            name="budgetVnd"
            control={control}
            render={({ field }) => (
              <NumberInput
                aria-label="Ngân sách tối đa (VNĐ)"
                value={field.value}
                onValueChange={field.onChange}
                onBlur={field.onBlur}
                minValue={0}
                step={1_000_000}
                formatOptions={{ style: 'decimal', maximumFractionDigits: 0 }}
                size="lg"
                radius="sm"
                variant="bordered"
                placeholder="40000000"
                classNames={{ input: 'font-mono tabular-nums text-base' }}
                endContent={
                  <span className="font-mono text-xs text-default-400">VNĐ</span>
                }
                isInvalid={Boolean(errors.budgetVnd)}
                errorMessage={errors.budgetVnd?.message}
                description={budget > 0 ? `≈ ${formatVndShort(budget)}` : undefined}
              />
            )}
          />

          <div className="mt-3 flex flex-wrap gap-2">
            {BUDGET_PRESETS.map((preset) => {
              const on = budget === preset.value;
              return (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() =>
                    setValue('budgetVnd', preset.value, {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                  className={clsx(
                    'rounded-full border px-3 py-1 font-mono text-[11px] tracking-wide transition-colors',
                    on
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-divider text-default-600 hover:border-default-300 hover:bg-default-100',
                  )}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </Field>

        {/* 2 — Loại xe */}
        <Field index={2} label="Bạn muốn loại xe nào?">
          <Controller
            name="powertrain"
            control={control}
            render={({ field }) => (
              <RadioGroup
                aria-label="Loại xe"
                value={field.value}
                onValueChange={field.onChange}
                classNames={{ wrapper: 'grid grid-cols-1 gap-2.5 sm:grid-cols-3' }}
                isInvalid={Boolean(errors.powertrain)}
                errorMessage={errors.powertrain?.message}
              >
                {POWERTRAIN_OPTIONS.map((opt) => (
                  <Radio
                    key={opt.value}
                    value={opt.value}
                    description={opt.hint}
                    classNames={{
                      base: clsx(optionBase, powertrain === opt.value ? optionOn : optionOff),
                      label: 'text-sm font-semibold',
                      description: 'text-xs leading-snug',
                    }}
                  >
                    {opt.label}
                  </Radio>
                ))}
              </RadioGroup>
            )}
          />
        </Field>

        {/* 3 — Km mỗi ngày */}
        <Field index={3} label="Mỗi ngày bạn đi khoảng bao nhiêu km?">
          <Controller
            name="dailyKm"
            control={control}
            render={({ field }) => (
              <NumberInput
                aria-label="Số km mỗi ngày"
                value={field.value}
                onValueChange={field.onChange}
                onBlur={field.onBlur}
                minValue={0}
                maxValue={DAILY_KM_MAX}
                step={5}
                size="lg"
                radius="sm"
                variant="bordered"
                placeholder="20"
                classNames={{ input: 'font-mono tabular-nums text-base' }}
                endContent={
                  <span className="font-mono text-xs text-default-400">km/ngày</span>
                }
                isInvalid={Boolean(errors.dailyKm)}
                errorMessage={errors.dailyKm?.message}
                description={describeDailyKm(dailyKm)}
              />
            )}
          />
        </Field>

        {/* 4 — Mục đích */}
        <Field index={4} label="Bạn dùng xe chủ yếu để làm gì?">
          <Controller
            name="purpose"
            control={control}
            render={({ field }) => (
              <RadioGroup
                aria-label="Mục đích sử dụng"
                value={field.value}
                onValueChange={field.onChange}
                classNames={{
                  wrapper: 'grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3',
                }}
                isInvalid={Boolean(errors.purpose)}
                errorMessage={errors.purpose?.message}
              >
                {PURPOSE_OPTIONS.map((opt) => (
                  <Radio
                    key={opt.value}
                    value={opt.value}
                    description={opt.hint}
                    classNames={{
                      base: clsx(optionBase, purpose === opt.value ? optionOn : optionOff),
                      label: 'text-sm font-semibold',
                      description: 'text-xs leading-snug',
                    }}
                  >
                    {opt.label}
                  </Radio>
                ))}
              </RadioGroup>
            )}
          />
        </Field>
      </StepShell>

      <div className="flex justify-end">
        <Button type="submit" color="primary" size="lg" radius="sm" className="px-7 font-medium">
          Tiếp tục
        </Button>
      </div>
    </form>
  );
}

function describeDailyKm(km: number): string {
  if (!Number.isFinite(km) || km <= 0) return 'Số km bạn thường đi trong một ngày.';
  if (km <= DAILY_KM_THRESHOLDS.short) return 'Đi gần — hầu hết các mẫu xe đều đáp ứng tốt.';
  if (km <= DAILY_KM_THRESHOLDS.long) return 'Đi vừa — nên để ý mức tiêu hao nhiên liệu.';
  return 'Đi nhiều — quãng đường mỗi lần đổ xăng hoặc sạc sẽ rất quan trọng.';
}
