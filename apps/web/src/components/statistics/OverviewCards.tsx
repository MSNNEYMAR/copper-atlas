'use client';

import type { Aggregations } from '@/hooks/useStatisticsData';
import { useTranslations } from '@/lib/i18n';

interface Props {
  agg: Aggregations;
}

export function OverviewCards({ agg }: Props) {
  const t = useTranslations('statistics');

  const cards = [
    {
      label: t('totalDeposits'),
      value: agg.total.toLocaleString(),
      icon: '⛏',
      color: 'text-gray-900',
    },
    {
      label: t('totalTonnage'),
      value: agg.totalTonnage > 0 ? `${(agg.totalTonnage / 1000).toFixed(1)} Bt` : '—',
      icon: '📦',
      color: 'text-gray-900',
    },
    {
      label: t('averageGrade'),
      value: agg.avgGrade > 0 ? `${agg.avgGrade.toFixed(2)}%` : '—',
      icon: '📊',
      color: 'text-gray-900',
    },
    {
      label: t('countriesCount'),
      value: agg.countryCount.toLocaleString(),
      icon: '🌍',
      color: 'text-gray-900',
    },
    {
      label: t('producingCount'),
      value: agg.producing.toLocaleString(),
      icon: '🏭',
      color: 'text-green-600',
    },
    {
      label: 'Exploration',
      value: agg.exploration.toLocaleString(),
      icon: '🔍',
      color: 'text-purple-600',
    },
    {
      label: 'Development',
      value: agg.development.toLocaleString(),
      icon: '🏗',
      color: 'text-blue-600',
    },
    { label: 'Closed', value: agg.closed.toLocaleString(), icon: '🚫', color: 'text-gray-400' },
    { label: 'Suspended', value: agg.suspended.toLocaleString(), icon: '⏸', color: 'text-red-500' },
    {
      label: 'Deposit Types',
      value: agg.typeCount.toLocaleString(),
      icon: '🏷',
      color: 'text-gray-900',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {cards.map((c) => (
        <div key={c.label} className="rounded-lg border border-gray-200 bg-white p-3 text-center">
          <div className="text-lg">{c.icon}</div>
          <div className={`mt-1 text-base font-bold truncate ${c.color}`}>{c.value}</div>
          <div className="text-[10px] text-gray-500 leading-tight">{c.label}</div>
        </div>
      ))}
    </div>
  );
}
