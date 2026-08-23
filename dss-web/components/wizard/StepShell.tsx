'use client';

import type { ReactNode } from 'react';

/**
 * Khung chung cho một bước khảo sát: nhãn nhỏ, tiêu đề, câu dẫn, rồi các câu
 * hỏi ngăn nhau bằng đường kẻ mảnh thay vì lồng thẻ trong thẻ.
 */
export function StepShell({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow: string;
  title: string;
  lede: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-divider bg-content1 px-5 py-7 sm:px-8 sm:py-9">
      <p className="label-eyebrow text-primary">{eyebrow}</p>
      <h1 className="mt-3 text-balance font-display text-2xl font-bold tracking-tight sm:text-[1.75rem]">
        {title}
      </h1>
      <p className="mt-2 max-w-[58ch] text-sm leading-relaxed text-default-600">{lede}</p>

      <div className="mt-8 flex flex-col">{children}</div>
    </section>
  );
}

/** Một câu hỏi, đánh số bằng chữ mono. */
export function Field({
  index,
  label,
  children,
}: {
  index: number;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="rule-t py-6 first:border-t-0 first:pt-0 last:pb-0">
      <div className="mb-3.5 flex items-baseline gap-2.5">
        <span className="font-mono text-[11px] tabular-nums text-default-400">
          {String(index).padStart(2, '0')}
        </span>
        <h2 className="text-[15px] font-semibold tracking-tight">{label}</h2>
      </div>
      {children}
    </div>
  );
}
