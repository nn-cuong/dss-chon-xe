'use client';

import clsx from 'clsx';

export const WIZARD_STEPS = [
  { id: 'needs', label: 'Nhu cầu' },
  { id: 'priorities', label: 'Ưu tiên' },
  { id: 'searching', label: 'Tìm xe' },
  { id: 'results', label: 'Kết quả' },
] as const;

export type WizardStepId = (typeof WIZARD_STEPS)[number]['id'];

/**
 * Thanh tiến độ: 4 đoạn kẻ ngang kèm số thứ tự, thay cho hàng bi tròn.
 * Gọn hơn và cho thấy rõ đang ở đâu trong trình tự.
 */
export function StepIndicator({ current }: { current: WizardStepId }) {
  const index = WIZARD_STEPS.findIndex((s) => s.id === current);
  const activeIndex = index < 0 ? 0 : index;

  return (
    <nav className="no-print" aria-label="Tiến độ">
      <ol className="grid grid-cols-4 gap-2">
        {WIZARD_STEPS.map((step, i) => {
          const isDone = i < activeIndex;
          const isActive = i === activeIndex;
          return (
            <li key={step.id} className="flex flex-col gap-2">
              <span
                className={clsx(
                  'h-[3px] w-full rounded-full transition-colors duration-300',
                  isDone && 'bg-primary/45',
                  isActive && 'bg-primary',
                  !isDone && !isActive && 'bg-default-200',
                )}
              />
              <span className="flex items-baseline gap-1.5">
                <span
                  className={clsx(
                    'font-mono text-[11px] tabular-nums',
                    isActive || isDone ? 'text-primary' : 'text-default-400',
                  )}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span
                  className={clsx(
                    'truncate text-[13px]',
                    isActive ? 'font-semibold text-foreground' : 'text-default-500',
                  )}
                  aria-current={isActive ? 'step' : undefined}
                >
                  {step.label}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
