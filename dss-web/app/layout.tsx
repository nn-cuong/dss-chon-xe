import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google';

import { Providers } from '@/app/providers';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import '@/styles/globals.css';

/** Chữ tiêu đề: hiện đại, bo tròn, dễ nhìn. */
const displayFont = Plus_Jakarta_Sans({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-display-custom',
  display: 'swap',
  weight: ['500', '600', '700', '800'],
});

/** Chữ nội dung: sắc nét, hiện đại, dễ đọc. */
const sansFont = Inter({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-sans-custom',
  display: 'swap',
  weight: ['400', '500', '600'],
});

/** Chữ số liệu: mono hiện đại. */
const monoFont = JetBrains_Mono({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-mono-custom',
  display: 'swap',
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  title: {
    default: 'Chọn Xe Việt — Hệ hỗ trợ lựa chọn xe máy',
    template: '%s · Chọn Xe Việt',
  },
  description:
    'Trả lời vài câu hỏi ngắn về nhu cầu và mức độ ưu tiên, hệ thống sẽ xếp hạng các mẫu xe máy phù hợp nhất bằng thuật toán TOPSIS.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf9f7' },
    { media: '(prefers-color-scheme: dark)', color: '#12110f' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
      <html
      lang="vi"
      suppressHydrationWarning
      className={`${displayFont.variable} ${sansFont.variable} ${monoFont.variable}`}
    >
      <body className="dss-page-bg min-h-dvh font-sans">
        <Providers>
          <div className="flex min-h-dvh flex-col">
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </div>
        </Providers>
      </body>
    </html>
  );
}
