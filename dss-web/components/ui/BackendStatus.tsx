'use client';

import { Tooltip } from '@heroui/tooltip';

import { API_BASE_URL } from '@/lib/api/client';
import { useHealth } from '@/lib/api/hooks';

/** Chỉ báo nhỏ: máy chủ còn sống và dataset có bao nhiêu mẫu xe. */
export function BackendStatus() {
  const { data, isPending, isError } = useHealth();

  if (isPending) return <Indicator tone="idle" text="Đang kết nối" />;

  if (isError || data?.status !== 'ok') {
    return (
      <Tooltip content={`Không kết nối được tới ${API_BASE_URL}`} size="sm">
        <span>
          <Indicator tone="down" text="Mất kết nối" />
        </span>
      </Tooltip>
    );
  }

  return (
    <Tooltip content={`Dữ liệu từ ${API_BASE_URL}`} size="sm">
      <span>
        <Indicator tone="up" text={`${data.rows} mẫu xe`} />
      </span>
    </Tooltip>
  );
}

function Indicator({ tone, text }: { tone: 'up' | 'down' | 'idle'; text: string }) {
  const dot =
    tone === 'up' ? 'bg-success' : tone === 'down' ? 'bg-danger' : 'bg-default-400';

  return (
    <span className="flex items-center gap-1.5 font-mono text-[11px] tracking-wide text-default-500">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden />
      {text}
    </span>
  );
}
