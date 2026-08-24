'use client';

/** Bước "Tìm xe": trạng thái chờ trong lúc backend chạy TOPSIS. */
import { useEffect, useState } from 'react';

const STAGES = [
  'Lọc xe theo ngân sách và loại xe',
  'Đối chiếu quãng đường di chuyển',
  'Tính trọng số từ mức ưu tiên của bạn',
  'Chấm điểm và xếp hạng bằng TOPSIS',
];

export function StepSearching() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(
      () => setStage((s) => Math.min(s + 1, STAGES.length - 1)),
      650,
    );
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="rounded-lg border border-divider bg-content1 px-6 py-14 sm:px-10">
      <p className="label-eyebrow text-primary">Đang xử lý</p>
      <h1 className="mt-3 font-display text-2xl font-bold tracking-tight">
        Đang tìm xe phù hợp với bạn
      </h1>

      <ol className="mt-8 flex max-w-md flex-col gap-3" aria-live="polite">
        {STAGES.map((text, i) => {
          const done = i < stage;
          const active = i === stage;
          return (
            <li key={text} className="flex items-center gap-3 text-sm">
              <span
                className={
                  done
                    ? 'flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary text-[9px] text-primary-foreground'
                    : active
                      ? 'h-4 w-4 shrink-0 animate-pulse rounded-full border-2 border-primary'
                      : 'h-4 w-4 shrink-0 rounded-full border border-default-300'
                }
                aria-hidden
              >
                {done ? '✓' : null}
              </span>
              <span className={active ? 'font-medium text-foreground' : 'text-default-500'}>
                {text}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
