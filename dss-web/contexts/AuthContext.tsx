'use client';

/**
 * Auth phía client: JWT lưu trong localStorage, bảo vệ route bằng
 * <RequireAuth> chứ không dùng middleware.
 *
 * Backend DSS hiện tại chưa có endpoint đăng nhập nên context này chỉ giữ
 * token và trạng thái; khi backend bổ sung /auth, chỉ cần nối hàm login vào.
 */
import { useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

import { AUTH_TOKEN_KEY } from '@/lib/api/client';
import { useMounted } from '@/lib/dss/useMounted';

/** Store nhỏ bọc quanh localStorage để đọc token an toàn với SSR. */
const tokenStore = {
  subscribe(onChange: () => void) {
    // 'storage' bắt thay đổi từ tab khác; 'dss:auth' là sự kiện nội bộ cùng tab.
    window.addEventListener('storage', onChange);
    window.addEventListener('dss:auth', onChange);
    return () => {
      window.removeEventListener('storage', onChange);
      window.removeEventListener('dss:auth', onChange);
    };
  },
  getSnapshot(): string | null {
    try {
      return window.localStorage.getItem(AUTH_TOKEN_KEY);
    } catch {
      return null;
    }
  },
  /** Trên server chưa có localStorage — luôn coi như chưa đăng nhập. */
  getServerSnapshot(): string | null {
    return null;
  },
};

interface AuthContextValue {
  token: string | null;
  isAuthenticated: boolean;
  /** false sau khi đã đọc xong localStorage — tránh nháy giao diện khi hydrate. */
  isLoading: boolean;
  setToken: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const token = useSyncExternalStore(
    tokenStore.subscribe,
    tokenStore.getSnapshot,
    tokenStore.getServerSnapshot,
  );

  // Lần render đầu phía client vẫn dùng server snapshot, nên chỉ coi là đã đọc
  // xong sau khi hydrate — tránh nháy giao diện trong <RequireAuth>.
  const isHydrated = useMounted();

  const logout = useCallback(() => {
    try {
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
    } catch {
      /* localStorage có thể bị chặn ở chế độ ẩn danh */
    }
    window.dispatchEvent(new Event('dss:auth'));
  }, []);

  const setToken = useCallback((next: string) => {
    try {
      window.localStorage.setItem(AUTH_TOKEN_KEY, next);
    } catch {
      /* bỏ qua */
    }
    window.dispatchEvent(new Event('dss:auth'));
  }, []);

  // Interceptor trong lib/api/client.ts phát sự kiện này khi gặp HTTP 401.
  useEffect(() => {
    const onUnauthorized = () => logout();
    window.addEventListener('dss:unauthorized', onUnauthorized);
    return () => window.removeEventListener('dss:unauthorized', onUnauthorized);
  }, [logout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      isAuthenticated: token !== null,
      isLoading: !isHydrated,
      setToken,
      logout,
    }),
    [token, isHydrated, setToken, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải được dùng bên trong <AuthProvider>.');
  return ctx;
}

/** Bọc quanh nội dung cần đăng nhập. Chuyển hướng về `redirectTo` nếu chưa có token. */
export function RequireAuth({
  children,
  redirectTo = '/',
}: {
  children: ReactNode;
  redirectTo?: string;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace(redirectTo);
  }, [isLoading, isAuthenticated, router, redirectTo]);

  if (isLoading || !isAuthenticated) return null;
  return <>{children}</>;
}
