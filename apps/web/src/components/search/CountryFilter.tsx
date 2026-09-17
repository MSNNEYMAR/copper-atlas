/**
 * Copper Atlas — Country Filter
 * 全局铜矿床图谱 — 国家筛选器
 *
 * Multi-select combobox with search for country selection.
 * Data fetched from /api/v1/countries reference endpoint.
 */

'use client';

import { useCountries } from '@/hooks/useReference';
import { useLocale, useTranslations } from '@/lib/i18n';
import { useFilterStore } from '@/stores/filterStore';
import { useMemo, useState } from 'react';

export function CountryFilter() {
  const t = useTranslations('filters');
  const locale = useLocale();
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const { data: countries } = useCountries();
  const countryIsos = useFilterStore((s) => s.countryIsos);

  const filtered = useMemo(() => {
    if (!countries) return [];
    const q = search.toLowerCase();
    return countries.filter(
      (c) =>
        c.name_en.toLowerCase().includes(q) ||
        c.name_zh.includes(q) ||
        c.iso_code.toLowerCase().includes(q),
    );
  }, [countries, search]);

  const toggle = (iso: string) => {
    const next = countryIsos.includes(iso)
      ? countryIsos.filter((c) => c !== iso)
      : [...countryIsos, iso];
    useFilterStore.setState({ countryIsos: next });
  };

  const selectedLabels = useMemo(() => {
    if (!countries) return locale === 'zh' ? '所有国家' : 'All countries';
    return countryIsos
      .map((iso) => {
        const c = countries.find((x) => x.iso_code === iso);
        return locale === 'zh' && c?.name_zh ? c.name_zh : c?.name_en || iso;
      })
      .join(', ');
  }, [countries, countryIsos, locale]);

  return (
    <div className="relative">
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {t('country')} {countryIsos.length > 0 && `(${countryIsos.length})`}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-left text-sm hover:border-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      >
        {selectedLabels || 'All countries'}
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
          <div className="p-2">
            <input
              type="text"
              placeholder="Search country..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:border-brand-500"
            />
          </div>
          <div className="max-h-48 overflow-y-auto custom-scrollbar">
            {filtered.map((country) => (
              <button
                key={country.iso_code}
                type="button"
                onClick={() => toggle(country.iso_code)}
                className="flex w-full items-center gap-x-2 px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={countryIsos.includes(country.iso_code)}
                  readOnly
                  className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                />
                <span className="font-mono text-gray-400 text-xs">{country.iso_code}</span>
                <span>
                  {locale === 'zh' && country.name_zh ? country.name_zh : country.name_en}
                </span>
                <span className="ml-auto text-xs text-gray-400">{country.deposit_count}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-2 text-sm text-gray-400">
                {locale === 'zh' ? '未找到国家' : 'No countries found'}
              </p>
            )}
          </div>
          {countryIsos.length > 0 && (
            <div className="border-t border-gray-100 px-3 py-1.5">
              <button
                type="button"
                onClick={() => useFilterStore.setState({ countryIsos: [] })}
                className="text-xs text-brand-500 hover:text-brand-600"
              >
                {locale === 'zh' ? '清除选择' : 'Clear selection'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
