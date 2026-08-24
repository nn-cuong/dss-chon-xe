'use client';

/**
 * Giữ câu trả lời khảo sát và kết quả DSS xuyên suốt các bước
 * Nhu cầu → Ưu tiên → Tìm xe → Kết quả.
 *
 * Câu trả lời được lưu vào sessionStorage để người dùng F5 ở trang kết quả
 * không mất dữ liệu, nhưng không lưu lâu dài giữa các phiên.
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { DEFAULT_PRIORITY_SCORE, PRIORITY_QUESTIONS, type PriorityKey } from '@/config/survey';
import { useMounted } from '@/lib/dss/useMounted';
import type { SurveyAnswers } from '@/lib/dss/mapping';
import type { DSSRunResponse } from '@/types/dss';

const STORAGE_KEY = 'dss.survey';

export const DEFAULT_PRIORITIES = Object.fromEntries(
  PRIORITY_QUESTIONS.map((q) => [q.key, DEFAULT_PRIORITY_SCORE]),
) as Record<PriorityKey, number>;

export const DEFAULT_ANSWERS: SurveyAnswers = {
  budgetVnd: 40_000_000,
  powertrain: 'ALL',
  dailyKm: 20,
  purpose: ['di_lam'],
  priorities: DEFAULT_PRIORITIES,
};

interface SurveyContextValue {
  answers: SurveyAnswers;
  /** Đã đọc xong sessionStorage chưa. */
  isHydrated: boolean;
  /** true khi người dùng đã hoàn tất phần Nhu cầu ít nhất một lần. */
  hasAnswers: boolean;
  updateAnswers: (patch: Partial<SurveyAnswers>) => void;
  setAnswers: (next: SurveyAnswers) => void;
  reset: () => void;
  result: DSSRunResponse | null;
  setResult: (result: DSSRunResponse | null) => void;
}

const SurveyContext = createContext<SurveyContextValue | null>(null);

/** Đọc câu trả lời đã lưu. Trả về `null` trên server hoặc khi chưa có gì. */
function readStoredAnswers(): SurveyAnswers | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SurveyAnswers>;
    return {
      ...DEFAULT_ANSWERS,
      ...parsed,
      priorities: { ...DEFAULT_PRIORITIES, ...(parsed.priorities ?? {}) },
    };
  } catch {
    // Dữ liệu hỏng hoặc sessionStorage bị chặn — dùng mặc định.
    return null;
  }
}

export function SurveyProvider({ children }: { children: ReactNode }) {
  // Lazy initializer đọc sessionStorage ngay ở lần render đầu phía client,
  // nên không cần useEffect + setState (tránh một vòng render thừa).
  const [stored] = useState(readStoredAnswers);
  const [answers, setAnswersState] = useState<SurveyAnswers>(stored ?? DEFAULT_ANSWERS);
  const [hasAnswers, setHasAnswers] = useState(stored !== null);
  const [result, setResult] = useState<DSSRunResponse | null>(null);

  // Trên server không có sessionStorage, nên chỉ báo "đã đọc xong" sau hydrate.
  const isHydrated = useMounted();

  const persist = useCallback((next: SurveyAnswers) => {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* bỏ qua */
    }
  }, []);

  const setAnswers = useCallback(
    (next: SurveyAnswers) => {
      setAnswersState(next);
      setHasAnswers(true);
      persist(next);
    },
    [persist],
  );

  const updateAnswers = useCallback(
    (patch: Partial<SurveyAnswers>) => {
      setAnswersState((prev) => {
        const next = { ...prev, ...patch };
        persist(next);
        return next;
      });
      setHasAnswers(true);
    },
    [persist],
  );

  const reset = useCallback(() => {
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* bỏ qua */
    }
    setAnswersState(DEFAULT_ANSWERS);
    setHasAnswers(false);
    setResult(null);
  }, []);

  const value = useMemo<SurveyContextValue>(
    () => ({ answers, isHydrated, hasAnswers, updateAnswers, setAnswers, reset, result, setResult }),
    [answers, isHydrated, hasAnswers, updateAnswers, setAnswers, reset, result],
  );

  return <SurveyContext.Provider value={value}>{children}</SurveyContext.Provider>;
}

export function useSurvey(): SurveyContextValue {
  const ctx = useContext(SurveyContext);
  if (!ctx) throw new Error('useSurvey phải được dùng bên trong <SurveyProvider>.');
  return ctx;
}
