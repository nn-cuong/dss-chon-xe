'use client';

import { Button } from '@heroui/button';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { ThemeSwitch } from '@/components/layout/ThemeSwitch';
import { BackendStatus } from '@/components/ui/BackendStatus';

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="no-print sticky top-0 z-40 border-b border-divider bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="group flex items-center gap-2.5 rounded-sm"
          aria-label="Chọn Xe — về trang chủ"
        >
          <Wordmark />
        </Link>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:block">
            <BackendStatus />
          </div>
          {pathname !== '/tim-xe' && (
            <Button
              as={Link}
              href="/tim-xe"
              color="primary"
              size="sm"
              radius="sm"
              className="font-medium"
            >
              Bắt đầu
            </Button>
          )}
          <ThemeSwitch />
        </div>
      </div>
    </header>
  );
}

/**
 * Dấu hiệu nhận diện: khối chữ đặt trong khung bo góc, lấy ý từ biển số xe máy
 * Việt Nam (nền xanh, chữ trắng, viền trắng mảnh).
 */
function Wordmark() {
  return (
    <>
      <span className="flex h-8 items-center rounded-[5px] bg-primary px-2 ring-1 ring-inset ring-white/25">
        <span className="font-mono text-[13px] font-semibold leading-none tracking-[0.08em] text-primary-foreground">
          59·X1
        </span>
      </span>
      <span className="flex flex-col leading-none">
        <span className="font-display text-[15px] font-bold tracking-tight">Chọn Xe</span>
        <span className="label-eyebrow mt-1 text-default-500">Xếp hạng TOPSIS</span>
      </span>
    </>
  );
}
