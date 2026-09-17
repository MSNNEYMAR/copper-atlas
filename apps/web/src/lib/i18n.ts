/**
 * Copper Atlas — i18n
 *
 * Requires 'force-dynamic' on root layout (usePathname needs router context).
 */
'use client';

import enMessages from '@/messages/en.json';
import zhMessages from '@/messages/zh.json';
import { usePathname } from 'next/navigation';

const MESSAGES: Record<string, any> = { en: enMessages, zh: zhMessages };
export const locales = ['en', 'zh'] as const;
export type Locale = (typeof locales)[number];

function extractLocale(pathname: string | null): Locale {
  if (!pathname) return 'en';
  return pathname.split('/')[1] === 'zh' ? 'zh' : 'en';
}

export function useLocale(): Locale {
  const pathname = usePathname();
  return extractLocale(pathname);
}

export function useTranslations(namespace: string) {
  const pathname = usePathname();
  const locale = extractLocale(pathname);
  const ns = MESSAGES[locale]?.[namespace] || MESSAGES.en[namespace] || {};
  return (key: string, vars?: Record<string, any>) => {
    let val = ns[key];
    if (val === undefined) val = MESSAGES.en[namespace]?.[key] || String(key);
    if (vars && typeof val === 'string') {
      for (const [k, v] of Object.entries(vars)) val = val.replace(`{${k}}`, String(v));
    }
    return typeof val === 'string' ? val : String(key);
  };
}

export async function getMessages(locale?: string) {
  const l = locale && locales.includes(locale as Locale) ? locale : 'en';
  return MESSAGES[l] || MESSAGES.en;
}
export function setRequestLocale(_locale: string) {}
