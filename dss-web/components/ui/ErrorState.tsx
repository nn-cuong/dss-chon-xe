'use client';

import { Button } from '@heroui/button';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({
  title = 'Đã có lỗi xảy ra',
  message,
  onRetry,
  retryLabel = 'Thử lại',
}: ErrorStateProps) {
  return (
    <section className="rounded-lg border border-danger/35 bg-danger/[0.04] px-5 py-6 sm:px-7">
      <p className="label-eyebrow text-danger">Lỗi</p>
      <h2 className="mt-2.5 font-display text-lg font-bold tracking-tight">{title}</h2>
      <p className="mt-1.5 max-w-[56ch] text-sm leading-relaxed text-default-600">{message}</p>
      {onRetry && (
        <Button className="mt-5" color="danger" variant="flat" radius="sm" size="sm" onPress={onRetry}>
          {retryLabel}
        </Button>
      )}
    </section>
  );
}
