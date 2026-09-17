import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { NextIntlClientProvider } from '@/lib/i18n-provider';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import '@/styles/globals.css';

export const dynamic = 'force-dynamic';

const locales = ['en', 'zh'] as const;

type Props = { children: React.ReactNode; params: { locale: string } };

export const metadata: Metadata = {
  title: {
    default: 'Global Copper Deposits Atlas | 全球铜矿床图谱',
    template: '%s | Copper Atlas',
  },
  description: 'A professional geological platform for exploring global copper deposits.',
  keywords: [
    'copper deposits',
    'geology',
    'porphyry copper',
    'mining',
    '铜矿床',
    '地质',
    '斑岩铜矿',
  ],
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    alternateLocale: 'zh_CN',
    siteName: 'Copper Atlas',
    title: 'Global Copper Deposits Atlas',
    description: 'Explore world copper resources on an interactive geological map.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Global Copper Deposits Atlas',
    description: 'Explore world copper resources on an interactive geological map.',
  },
};

export default async function LocaleLayout({ children, params: { locale } }: Props) {
  const safeLocale = locales.includes(locale as any) ? locale : 'en';
  if (!locales.includes(locale as any)) notFound();

  let messages;
  try {
    messages = (await import(`@/messages/${safeLocale}.json`)).default;
  } catch {
    messages = {};
  }

  return (
    <html lang={safeLocale} className="h-full">
      <head>
        <link rel="alternate" hrefLang="en" href="/en" />
        <link rel="alternate" hrefLang="zh" href="/zh" />
        <link rel="alternate" hrefLang="x-default" href="/en" />
      </head>
      <body className="h-full bg-white text-gray-900 antialiased">
        <NextIntlClientProvider messages={messages}>
          <QueryProvider>
            <div className="flex h-full flex-col">
              <Header />
              <main className="flex-1 overflow-y-auto overflow-x-hidden">{children}</main>
              <Footer />
            </div>
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
