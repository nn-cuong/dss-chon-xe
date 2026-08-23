'use client';

import { Button } from '@heroui/button';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-start gap-4 px-4 py-28 sm:px-6">
      <p className="label-eyebrow text-danger">Sự cố</p>
      <h1 className="font-display text-3xl font-bold tracking-tight">Đã có lỗi xảy ra</h1>
      <p className="text-sm leading-relaxed text-default-600">
        Hệ thống gặp sự cố khi hiển thị trang này. Vui lòng thử lại.
      </p>
      <Button className="mt-2" color="primary" radius="sm" onPress={reset}>
        Thử lại
      </Button>
    </div>
  );
}
