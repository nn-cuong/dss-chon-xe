import { Button } from '@heroui/button';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-start gap-4 px-4 py-28 sm:px-6">
      <p className="label-eyebrow text-default-400">Lỗi 404</p>
      <h1 className="font-display text-3xl font-bold tracking-tight">Không tìm thấy trang</h1>
      <p className="text-sm leading-relaxed text-default-600">
        Trang bạn tìm không tồn tại hoặc đã được chuyển đi nơi khác.
      </p>
      <Link href="/" className="mt-2">
        <Button color="primary" radius="sm">
          Về trang chủ
        </Button>
      </Link>
    </div>
  );
}
