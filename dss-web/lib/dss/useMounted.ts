'use client';

import { useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};

/**
 * `false` khi render trên server và ở lần render đầu phía client, `true` sau
 * khi hydrate xong.
 *
 * Dùng `useSyncExternalStore` thay cho cặp `useState` + `useEffect` để không
 * gây thêm một vòng render (và không vi phạm quy tắc set-state-in-effect).
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
