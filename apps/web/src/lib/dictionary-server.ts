/**
 * Server-side translation dictionary (no React hooks).
 * Used by SSR pages (deposit detail, about) that can't use client hooks.
 *
 * Same dictionaries as dictionary.ts — keep them in sync.
 */
import type { Locale } from '@/lib/i18n';

const STATUS: Record<string, Record<Locale, string>> = {
  exploration: { en: 'Exploration', zh: '勘探' },
  feasibility: { en: 'Feasibility', zh: '可行性研究' },
  development: { en: 'Development', zh: '开发建设' },
  production: { en: 'Production', zh: '生产中' },
  suspended: { en: 'Suspended', zh: '暂停' },
  closed: { en: 'Closed', zh: '已关闭' },
  depleted: { en: 'Depleted', zh: '已采尽' },
  unknown: { en: 'Unknown', zh: '未知' },
};

const METHOD: Record<string, Record<Locale, string>> = {
  open_pit: { en: 'Open Pit', zh: '露天开采' },
  underground: { en: 'Underground', zh: '地下开采' },
  block_caving: { en: 'Block Caving', zh: '块体崩落法' },
};

export function translateServer(
  category: string,
  code: string | null | undefined,
  locale: Locale,
): string {
  if (!code) return '—';
  const dict = category === 'status' ? STATUS : category === 'mining_method' ? METHOD : null;
  if (!dict) return code;
  if (dict[code]) return dict[code][locale];

  // Normalized match
  const key = code.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  for (const dk of Object.keys(dict)) {
    if (key.includes(dk) || dk.includes(key)) return dict[dk][locale];
  }
  return code;
}
