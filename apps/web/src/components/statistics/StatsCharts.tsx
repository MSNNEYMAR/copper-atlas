/**
 * Copper Atlas — Pure CSS Statistics Charts
 * i18n-aware title and continent names.
 * Every chart takes {agg, onClick} and renders independently.
 */
'use client';

import type { Aggregations } from '@/hooks/useStatisticsData';
import { useLocale, useTranslations } from '@/lib/i18n';
import { useFilterStore } from '@/stores/filterStore';
import { useMapStore } from '@/stores/mapStore';
import { useUIStore } from '@/stores/uiStore';
import { useCallback } from 'react';

// ============================================================================
export function useChartClick() {
  const { openDetailPanel } = useUIStore();
  const { selectDeposit } = useMapStore();
  return useCallback(
    (type: string, value: string, depositId?: string) => {
      if (depositId) {
        selectDeposit(depositId);
        openDetailPanel();
        const win = window as any;
        if (win.__mapInstance) {
          fetch(`/api/v1/deposits/${depositId}`)
            .then((r) => r.json())
            .then((d) => {
              const c = d?.geometry?.coordinates;
              if (c && win.__mapInstance)
                win.__mapInstance.flyTo({ center: c, zoom: 8, duration: 1200 });
            })
            .catch(() => {});
        }
        return;
      }
      if (type === 'country') useFilterStore.setState({ countryIsos: [value] });
      else if (type === 'deposit_type') useFilterStore.setState({ depositTypePaths: [value] });
      else if (type === 'status') useFilterStore.setState({ statuses: [value as any] });
    },
    [selectDeposit, openDetailPanel],
  );
}

// ============================================================================
export interface StatChartProps {
  agg: Aggregations;
  onClick: (type: string, value: string, depositId?: string) => void;
}

// ============================================================================
// Translations
// ============================================================================
const I18N_CONTINENTS: Record<string, { en: string; zh: string }> = {
  'South America': { en: 'South America', zh: '南美洲' },
  'North America': { en: 'North America', zh: '北美洲' },
  Asia: { en: 'Asia', zh: '亚洲' },
  Africa: { en: 'Africa', zh: '非洲' },
  Europe: { en: 'Europe', zh: '欧洲' },
  Oceania: { en: 'Oceania', zh: '大洋洲' },
  Other: { en: 'Other', zh: '其他' },
};

function trContinent(name: string, locale: string): string {
  return I18N_CONTINENTS[name]?.[locale as 'en' | 'zh'] || name;
}

// ============================================================================
// Components
// ============================================================================
const CHART_COLORS = [
  '#E74C3C',
  '#3498DB',
  '#9B59B6',
  '#E67E22',
  '#2ECC71',
  '#F39C12',
  '#1ABC9C',
  '#E91E63',
  '#00BCD4',
  '#8BC34A',
  '#795548',
  '#607D8B',
];

function ChartSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">{title}</h2>
      {children}
    </div>
  );
}
function Empty() {
  return <div className="text-sm text-gray-400 py-6 text-center">No data</div>;
}

// ============================================================================
function HorizontalBarChart({
  data,
  color,
  onClick,
  col1,
  col2,
}: {
  data: { label: string; value: number; extra?: string }[];
  color: string;
  onClick?: (label: string) => void;
  col1?: string;
  col2?: string;
}) {
  const list = Array.isArray(data) ? data : [];
  if (!list.length) return <Empty />;
  const max = Math.max(...list.map((d) => d.value || 0), 1);
  const hasExtra = list.some((d) => d.extra);
  return (
    <div style={{ maxHeight: 400, overflowY: 'auto' }}>
      <div className="flex items-center gap-x-2 mb-1.5 pb-1.5 border-b border-gray-100">
        <span className="text-[10px] text-gray-400 font-medium w-16 text-right flex-shrink-0">
          {col1 || 'Name'}
        </span>
        <div className="flex-1" />
        <span className="text-[10px] text-gray-400 font-medium w-12 text-right flex-shrink-0">
          {col2 || 'Count'}
        </span>
        {hasExtra && (
          <span className="text-[10px] text-gray-400 font-medium w-24 text-right flex-shrink-0">
            Metal
          </span>
        )}
      </div>
      <div className="space-y-1">
        {list.map((d, i) => {
          const pct = Math.max(((d.value || 0) / max) * 100, 1);
          return (
            <div
              key={i}
              className="flex items-center gap-x-2 group cursor-pointer"
              onClick={() => onClick?.(d.label)}
              title={`${d.label}: ${d.value}`}
            >
              <span className="text-[10px] text-gray-500 w-16 text-right truncate flex-shrink-0">
                {d.label}
              </span>
              <div className="flex-1 relative h-5">
                <div
                  className="absolute inset-y-0 left-0 rounded-r transition-all duration-200 group-hover:opacity-80"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              </div>
              <span className="text-[10px] text-gray-700 w-12 text-right flex-shrink-0 font-mono">
                {d.value}
              </span>
              {hasExtra && (
                <span className="text-[9px] text-gray-400 truncate w-24 text-right flex-shrink-0 font-mono">
                  {d.extra || ''}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DonutChart({
  data,
  onClick,
}: { data: { label: string; value: number }[]; onClick?: (label: string) => void }) {
  const list = Array.isArray(data) ? data : [];
  if (!list.length) return <Empty />;
  const total = list.reduce((s, d) => s + (d.value || 0), 0) || 1;
  let cum = 0;
  const segs = list.map((d, i) => {
    const s = cum;
    cum += d.value || 0;
    return `${CHART_COLORS[i % CHART_COLORS.length]} ${(s / total) * 100}% ${(cum / total) * 100}%`;
  });
  return (
    <div className="flex items-center gap-x-4" style={{ height: 240 }}>
      <div
        className="w-40 h-40 rounded-full flex-shrink-0"
        style={{ background: `conic-gradient(${segs.join(',')})` }}
      />
      <div className="flex-1 overflow-y-auto max-h-full space-y-1">
        {list.map((d, i) => (
          <div
            key={i}
            className="flex items-center gap-x-1.5 text-xs cursor-pointer hover:opacity-80"
            onClick={() => onClick?.(d.label)}
          >
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
            />
            <span className="text-gray-600 truncate flex-1">{d.label}</span>
            <span className="text-gray-400">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LeaderboardTable({
  data,
  cols,
  onClick,
}: {
  data: any[];
  cols: { key: string; label: string; format?: (v: any) => string }[];
  onClick?: (row: any) => void;
}) {
  const list = Array.isArray(data) ? data : [];
  if (!list.length) return <Empty />;
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-gray-400 border-b">
          {cols.map((c) => (
            <th key={c.key} className="text-left py-1.5 px-1 font-medium">
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {list.map((row, i) => (
          <tr
            key={i}
            className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
            onClick={() => onClick?.(row)}
          >
            {cols.map((c) => (
              <td key={c.key} className="py-1.5 px-1 text-gray-700 truncate max-w-[200px]">
                {c.format ? c.format(row[c.key]) : (row[c.key] ?? '—')}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ============================================================================
// Chart Components — ALL i18n-aware
// ============================================================================
export function CountryTopChart({ agg, onClick }: StatChartProps) {
  const t = useTranslations('statistics');
  const data = agg.byCountry.slice(0, 20).map((c) => ({
    label: c.name,
    value: c.count,
    extra: `${c.tonnage > 0 ? `${(c.tonnage / 1000).toFixed(1)} Bt` : ''}`,
  }));
  return (
    <ChartSection title={t('byCountry')}>
      <HorizontalBarChart
        data={data}
        color="#E74C3C"
        onClick={(l) => onClick('country', agg.byCountry.find((c) => c.name === l)?.iso || l)}
        col1={t('country') || 'Country'}
        col2={t('totalDeposits') || 'Deposits'}
      />
    </ChartSection>
  );
}

export function ContinentChart({ agg }: StatChartProps) {
  const t = useTranslations('statistics');
  const locale = useLocale();
  return (
    <ChartSection title={t('byContinent') || 'By Continent'}>
      <DonutChart
        data={agg.byContinent.map((c) => ({ label: trContinent(c.name, locale), value: c.count }))}
      />
    </ChartSection>
  );
}

export function DepositTypeChart({ agg, onClick }: StatChartProps) {
  const t = useTranslations('statistics');
  const locale = useLocale();
  const data = agg.byType.map((tp) => ({
    label: locale === 'zh' && tp.nameZh ? tp.nameZh : tp.name || tp.code,
    value: tp.count,
  }));
  return (
    <ChartSection title={t('byType') || 'By Deposit Type'}>
      <DonutChart
        data={data}
        onClick={(l) => {
          const tp = agg.byType.find(
            (x) => (locale === 'zh' && x.nameZh ? x.nameZh : x.name) === l,
          );
          if (tp) onClick('deposit_type', tp.code);
        }}
      />
    </ChartSection>
  );
}

export function TonnageBucketChart({ agg }: StatChartProps) {
  const t = useTranslations('statistics');
  return (
    <ChartSection title={t('tonnageDistribution') || 'Tonnage Distribution'}>
      <HorizontalBarChart
        data={agg.byTonnageBucket.map((b) => ({ label: b.bucket, value: b.count }))}
        color="#E67E22"
      />
    </ChartSection>
  );
}

export function DiscoveryTimelineChart({ agg }: StatChartProps) {
  const t = useTranslations('statistics');
  const data = agg.byDiscoveryDecade.filter((d) => d.count > 0);
  return (
    <ChartSection title={t('discoveryTimeline') || 'Discovery Timeline'}>
      <HorizontalBarChart
        data={data.map((d) => ({ label: d.decade, value: d.count }))}
        color="#9B59B6"
      />
    </ChartSection>
  );
}

export function OperatorLeaderboard({ agg, onClick }: StatChartProps) {
  const t = useTranslations('statistics');
  const locale = useLocale();
  const data = agg.byOperator
    .slice(0, 10)
    .map((o) => ({ name: o.name, count: o.count, tonnage: `${(o.tonnage / 1000).toFixed(1)} Bt` }));
  return (
    <ChartSection title={t('topOperators') || 'Top 10 Operators'}>
      <LeaderboardTable
        data={data}
        cols={[
          { key: 'name', label: locale === 'zh' ? '公司' : 'Company' },
          { key: 'count', label: locale === 'zh' ? '矿床数' : 'Deposits' },
          { key: 'tonnage', label: locale === 'zh' ? '总金属量' : 'Total Metal' },
        ]}
        onClick={(row) => onClick('operator', row.name)}
      />
    </ChartSection>
  );
}

export function TopByTonnageLeaderboard({ agg, onClick }: StatChartProps) {
  const t = useTranslations('statistics');
  const locale = useLocale();
  const data = agg.topByTonnage.slice(0, 10).map((d) => ({
    id: d.id,
    name: d.name,
    tonnage: `${d.tonnage.toFixed(1)} Mt`,
    country: d.country,
  }));
  return (
    <ChartSection title={t('topByTonnage') || 'Top 10 Largest Deposits'}>
      <LeaderboardTable
        data={data}
        cols={[
          { key: 'name', label: locale === 'zh' ? '矿床' : 'Deposit' },
          { key: 'tonnage', label: locale === 'zh' ? '铜金属量' : 'Contained Cu' },
          { key: 'country', label: locale === 'zh' ? '国家' : 'Country' },
        ]}
        onClick={(row) => onClick('deposit', '', row.id)}
      />
    </ChartSection>
  );
}

export function TopByGradeLeaderboard({ agg, onClick }: StatChartProps) {
  const t = useTranslations('statistics');
  const locale = useLocale();
  const data = agg.topByGrade
    .slice(0, 10)
    .map((d) => ({ id: d.id, name: d.name, grade: `${d.grade.toFixed(2)}%`, country: d.country }));
  return (
    <ChartSection title={t('topByGrade') || 'Top 10 by Grade'}>
      <LeaderboardTable
        data={data}
        cols={[
          { key: 'name', label: locale === 'zh' ? '矿床' : 'Deposit' },
          { key: 'grade', label: locale === 'zh' ? '品位' : 'Grade' },
          { key: 'country', label: locale === 'zh' ? '国家' : 'Country' },
        ]}
        onClick={(row) => onClick('deposit', '', row.id)}
      />
    </ChartSection>
  );
}

export function TectonicChart({ agg }: StatChartProps) {
  const t = useTranslations('statistics');
  return (
    <ChartSection title={t('tectonicSettings') || 'Tectonic Settings'}>
      <HorizontalBarChart
        data={agg.byTectonic.map((tk) => ({ label: tk.setting, value: tk.count }))}
        color="#1ABC9C"
      />
    </ChartSection>
  );
}

export function HostRockChart({ agg }: StatChartProps) {
  const t = useTranslations('statistics');
  return (
    <ChartSection title={t('hostRocks') || 'Host Rocks'}>
      <HorizontalBarChart
        data={agg.byHostRock.map((r) => ({ label: r.rock, value: r.count }))}
        color="#8BC34A"
      />
    </ChartSection>
  );
}

export function DataSourceChart({ agg }: StatChartProps) {
  const t = useTranslations('statistics');
  return (
    <ChartSection title={t('dataSources') || 'Data Sources'}>
      <HorizontalBarChart
        data={agg.byDataSource.map((s) => ({ label: s.source, value: s.count }))}
        color="#00BCD4"
      />
    </ChartSection>
  );
}
