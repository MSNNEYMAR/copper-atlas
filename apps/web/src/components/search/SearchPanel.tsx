/**
 * Copper Atlas — Search Panel with Autocomplete
 * 全球铜矿床图谱 — 搜索面板
 *
 * Client-side search engine:
 *   - Fetches ALL deposits + countries + classifications once
 *   - Builds in-memory search index
 *   - Searches: deposit names (EN+ZH), country names (EN+ZH), types (EN+ZH),
 *              operator, tectonic setting, province, tags
 *   - Autocomplete dropdown with type badges
 *   - Click result → FlyTo map + open detail panel
 */
'use client';

import { useDebouncedValue } from '@/hooks/useDebounce';
import { useLocale, useTranslations } from '@/lib/i18n';
import { useFilterStore } from '@/stores/filterStore';
import { useMapStore } from '@/stores/mapStore';
import { useUIStore } from '@/stores/uiStore';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActiveFilterChips } from './ActiveFilterChips';
import { CountryFilter } from './CountryFilter';
import { DepositTypeFilter } from './DepositTypeFilter';
import { GeologicalAgeFilter } from './GeologicalAgeFilter';
import { GradeRangeFilter, TonnageRangeFilter } from './RangeFilter';
import { StatusFilter } from './StatusFilter';

interface IndexEntry {
  id: string;
  name: string;
  name_zh: string | null;
  slug: string;
  country_iso: string | null;
  country_name_en: string;
  country_name_zh: string;
  classification_code: string | null;
  classification_name_en: string;
  classification_name_zh: string;
  tonnage_mt: number | null;
  tonnage_grade_pct: number | null;
  status: string;
  searchText: string;
}

export function SearchPanel() {
  const t = useTranslations('filters');
  const locale = useLocale();
  const { toggleSearchPanel } = useUIStore();
  const { selectDeposit } = useMapStore();
  const { openDetailPanel } = useUIStore();
  const searchQuery = useFilterStore((s) => s.searchQuery);

  const [input, setInput] = useState(searchQuery || '');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [index, setIndex] = useState<IndexEntry[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedInput = useDebouncedValue(input, 200);

  // ===================================================================
  // BUILD SEARCH INDEX (once on mount)
  // ===================================================================
  useEffect(() => {
    let cancelled = false;
    async function build() {
      try {
        const [depRes, cRes, clRes] = await Promise.all([
          fetch('/api/v1/deposits?mineral=copper&size=5000'),
          fetch('/api/v1/countries'),
          fetch('/api/v1/reference?type=deposit-types'),
        ]);
        const depData = await depRes.json();
        const countries: any[] = await cRes.json();
        const classes: any[] = await clRes.json();

        const cMap = new Map<string, any>(countries.map((c: any) => [c.id || c.iso_code, c]));
        const clMap = new Map<string, any>(classes.map((c: any) => [c.id || c.code, c]));

        const entries: IndexEntry[] = (depData.features || []).map((f: any) => {
          const p = f.properties;
          const ctry = cMap.get(p.country_iso) || {};
          const cls = clMap.get(p.deposit_type_code) || {};
          const searchText = [
            p.name,
            p.name_zh,
            p.slug,
            p.country_iso,
            ctry.name_en,
            ctry.name_zh,
            p.deposit_type_code,
            cls.name_en,
            cls.name_zh,
            p.operator_company,
            p.host_rock_type,
            p.tectonic_setting,
            p.geological_province,
            p.metallogenic_belt,
            p.state_province,
            (p.tags || []).join(' '),
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

          return {
            id: f.id,
            name: p.name,
            name_zh: p.name_zh,
            slug: p.slug,
            country_iso: p.country_iso,
            country_name_en: ctry.name_en || '',
            country_name_zh: ctry.name_zh || '',
            classification_code: p.deposit_type_code,
            classification_name_en: cls.name_en || '',
            classification_name_zh: cls.name_zh || '',
            tonnage_mt: p.tonnage_mt,
            tonnage_grade_pct: p.tonnage_grade_pct,
            status: p.status,
            searchText,
          };
        });

        if (!cancelled) setIndex(entries);
      } catch {
        /* silent */
      }
    }
    build();
    return () => {
      cancelled = true;
    };
  }, []);

  // ===================================================================
  // SEARCH (debounced, in-memory, instant)
  // ===================================================================
  const results = useMemo(() => {
    if (!debouncedInput || debouncedInput.length < 1) return [];
    const q = debouncedInput.toLowerCase();
    // Score each entry
    const scored = index.map((entry) => {
      let score = 0;
      const n = (entry.name || '').toLowerCase();
      const nz = (entry.name_zh || '').toLowerCase();
      const st = entry.searchText;

      // Exact name match
      if (n === q || nz === q) score = 100;
      // Starts with
      else if (n.startsWith(q) || nz.startsWith(q)) score = 90;
      // Word boundary match
      else if (st.includes(` ${q}`) || st.includes(`${q} `) || st.includes(` ${q} `)) score = 70;
      // Substring match
      else if (st.includes(q)) score = 50;
      // Fuzzy
      else if (q.length >= 3) {
        let hits = 0;
        for (let i = 0; i < q.length; i++) {
          if (st.includes(q[i])) hits++;
        }
        if (hits > q.length * 0.6) score = 20;
      }

      return { ...entry, _score: score };
    });

    return scored
      .filter((e) => e._score > 0)
      .sort((a, b) => b._score - a._score)
      .slice(0, 12);
  }, [debouncedInput, index]);

  // Open dropdown when results exist
  useEffect(() => {
    setIsOpen(debouncedInput.length >= 1);
    setSelectedIdx(-1);
  }, [debouncedInput]);

  // ===================================================================
  // HANDLERS
  // ===================================================================
  const handleSelect = useCallback(
    (entry: IndexEntry) => {
      selectDeposit(entry.id);
      openDetailPanel();
      setIsOpen(false);
      setInput('');
      // FlyTo — read coordinates from already-loaded map source
      const win = window as any;
      const map = win.__mapInstance;
      if (map) {
        // Try to get coords from the GeoJSON source directly (fastest)
        const src = map.getSource('copper-deposits-geojson');
        if (src) {
          const data = (src as any)._data;
          if (data?.features) {
            const feature = data.features.find(
              (f: any) => f.id === entry.id || f.properties?.id === entry.id,
            );
            if (feature?.geometry?.coordinates) {
              map.flyTo({ center: feature.geometry.coordinates, zoom: 8, duration: 1200 });
              return;
            }
          }
        }
      }
      // Fallback: fetch coords from API
      fetch(`/api/v1/deposits/${entry.id}`)
        .then((r) => r.json())
        .then((d) => {
          const coords = d?.geometry?.coordinates;
          if (coords && win.__mapInstance) {
            win.__mapInstance.flyTo({ center: coords, zoom: 8, duration: 1200 });
          }
        })
        .catch(() => {});
    },
    [selectDeposit, openDetailPanel],
  );

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Keyboard
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      selectedIdx >= 0 && results[selectedIdx]
        ? handleSelect(results[selectedIdx])
        : useFilterStore.setState({ searchQuery: input });
      setIsOpen(false);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const localeName = (e: IndexEntry) => (locale === 'zh' && e.name_zh ? e.name_zh : e.name);
  const localeCountry = (e: IndexEntry) =>
    locale === 'zh' && e.country_name_zh ? e.country_name_zh : e.country_name_en;
  const localeType = (e: IndexEntry) =>
    locale === 'zh' && e.classification_name_zh
      ? e.classification_name_zh
      : e.classification_name_en;

  return (
    <div className="flex h-full flex-col bg-white/98 backdrop-blur shadow-lg border-r border-gray-200">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900">{t('title')}</h2>
        <button
          onClick={toggleSearchPanel}
          className="rounded-md p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          type="button"
          aria-label="Close"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Search Input + Autocomplete */}
      <div ref={containerRef} className="px-4 pt-3 pb-2 relative">
        <input
          ref={inputRef}
          type="search"
          placeholder={t('search')}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />

        {isOpen && results.length > 0 && (
          <div className="absolute left-4 right-4 top-[calc(100%-4px)] z-50 mt-1 rounded-lg border border-gray-200 bg-white shadow-xl max-h-80 overflow-y-auto">
            {results.map((e, i) => (
              <button
                key={e.id}
                type="button"
                onClick={() => handleSelect(e)}
                className={`w-full text-left px-3 py-2.5 hover:bg-gray-50 flex items-center gap-x-3 ${i === selectedIdx ? 'bg-brand-50' : ''}`}
              >
                <span className="shrink-0 text-base">📍</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{localeName(e)}</div>
                  <div className="flex items-center gap-x-2 text-xs text-gray-500 mt-0.5">
                    {localeCountry(e) && <span className="truncate">{localeCountry(e)}</span>}
                    {localeType(e) && (
                      <>
                        <span className="text-gray-300">|</span>
                        <span className="truncate">{localeType(e)}</span>
                      </>
                    )}
                    {e.tonnage_mt && (
                      <>
                        <span className="text-gray-300">|</span>
                        <span>{e.tonnage_mt.toFixed(1)} Mt</span>
                      </>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
        {isOpen && debouncedInput.length >= 1 && results.length === 0 && (
          <div className="absolute left-4 right-4 top-[calc(100%-4px)] z-50 mt-1 rounded-lg border border-gray-200 bg-white shadow-xl">
            <div className="px-3 py-3 text-sm text-gray-400">
              {locale === 'zh' ? '未找到结果' : 'No results found'}
            </div>
          </div>
        )}
      </div>

      <div className="px-4 pb-2">
        <ActiveFilterChips />
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="space-y-5 px-4 py-3">
          <CountryFilter />
          <DepositTypeFilter />
          <StatusFilter />
          <TonnageRangeFilter />
          <GradeRangeFilter />
          <GeologicalAgeFilter />
        </div>
      </div>

      <div className="border-t border-gray-200 px-4 py-2">
        <p className="text-[10px] text-gray-400">
          {locale === 'zh'
            ? '筛选器实时更新地图。点击矿床查看详情'
            : 'Filters update the map. Click a deposit for details.'}
        </p>
      </div>
    </div>
  );
}
