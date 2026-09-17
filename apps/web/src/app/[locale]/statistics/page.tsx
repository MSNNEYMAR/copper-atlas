/**
 * Copper Atlas — Statistics Dashboard (Professional)
 *
 * Architecture:  useStatisticsData() → Aggregations → Chart Components
 * Each chart is an independent island. One failure = one "No data" block.
 * Click-to-filter links back to map via filterStore + mapStore.
 */
'use client';

import { OverviewCards } from '@/components/statistics/OverviewCards';
import {
  ContinentChart,
  CountryTopChart,
  DataSourceChart,
  DepositTypeChart,
  DiscoveryTimelineChart,
  HostRockChart,
  OperatorLeaderboard,
  type StatChartProps,
  TectonicChart,
  TonnageBucketChart,
  TopByGradeLeaderboard,
  TopByTonnageLeaderboard,
  useChartClick,
} from '@/components/statistics/StatsCharts';
import { useStatisticsData } from '@/hooks/useStatisticsData';
import { useTranslations } from '@/lib/i18n';

export default function StatisticsPage() {
  const t = useTranslations('statistics');
  const { deposits, agg, loading, error } = useStatisticsData();
  const onClick = useChartClick();

  // Loading
  if (loading)
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );

  // Error
  if (error)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-gray-500 mb-2">Failed to load statistics</p>
          <p className="text-xs text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-brand-500 hover:underline"
          >
            Retry
          </button>
        </div>
      </div>
    );

  // Empty
  if (!agg || !agg.total)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-4xl mb-4">📭</div>
          <p className="text-gray-500">No deposit data available.</p>
        </div>
      </div>
    );

  const chartProps: StatChartProps = { agg, onClick };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 pb-20">
      <h1 className="text-2xl font-bold text-gray-900">
        {t('title')}{' '}
        <span className="text-sm text-gray-400 font-normal ml-2">
          (v20260705 · {agg.total.toLocaleString()} deposits · {agg.countryCount} countries)
        </span>
      </h1>

      {/* Overview KPI Cards */}
      <div className="mt-6">
        <OverviewCards agg={agg} />
      </div>

      {/* Row 1: Country Top + Tonnage Distribution */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CountryTopChart {...chartProps} />
        <TonnageBucketChart {...chartProps} />
      </div>

      {/* Row 2: Continent pie + Deposit Type donut */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ContinentChart {...chartProps} />
        <DepositTypeChart {...chartProps} />
      </div>

      {/* Row 3: Headlines */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TopByTonnageLeaderboard {...chartProps} />
        <TopByGradeLeaderboard {...chartProps} />
      </div>

      {/* Row 4: Discovery Timeline + Operators */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DiscoveryTimelineChart {...chartProps} />
        <OperatorLeaderboard {...chartProps} />
      </div>

      {/* Row 5: Geology context */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TectonicChart {...chartProps} />
        <HostRockChart {...chartProps} />
      </div>

      {/* Row 6: Data provenance */}
      <div className="mt-6">
        <DataSourceChart {...chartProps} />
      </div>
    </div>
  );
}
