/**
 * Copper Atlas — Map Legend
 * 全球铜矿床图谱 — 图例
 *
 * Deposit type colors + localized names from translateCode().
 * All names auto-translate when locale switches.
 */
'use client';

import { translateCode } from '@/lib/dictionary';
import { useLocale } from '@/lib/i18n';
import { useMapStore } from '@/stores/mapStore';

const TYPE_COLORS: Record<string, string> = {
  POR_CUMO: '#E74C3C',
  POR_CUAU: '#C0392B',
  POR: '#E74C3C',
  SED_SSC: '#2980B9',
  SED: '#3498DB',
  VMS_BF: '#9B59B6',
  VMS_BM: '#8E44AD',
  VMS: '#9B59B6',
  IOCG_HEM: '#D35400',
  IOCG_MAG: '#E67E22',
  IOCG: '#E67E22',
  SKN_CALC: '#27AE60',
  SKN: '#2ECC71',
  EPI_HS: '#E67E22',
  EPI_LS: '#F1C40F',
  EPI: '#F39C12',
  MAG: '#1ABC9C',
};

const DISPLAY_TYPES = [
  'POR',
  'POR_CUMO',
  'POR_CUAU',
  'SED',
  'SED_SSC',
  'VMS',
  'IOCG',
  'SKN',
  'EPI',
  'MAG',
];

export function MapLegend() {
  const locale = useLocale();
  const clusterMetric = useMapStore((state) => state.clusterMetric);
  const setClusterMetric = useMapStore((state) => state.setClusterMetric);

  return (
    <div className="absolute bottom-8 left-4 z-10 rounded-lg bg-white/95 backdrop-blur shadow-lg border border-gray-200 p-3 text-xs w-48">
      <h3 className="font-semibold text-gray-900 mb-2">{locale === 'zh' ? '图例' : 'Legend'}</h3>
      <div className="space-y-1">
        {DISPLAY_TYPES.map((code) => {
          const color = TYPE_COLORS[code] || '#95A5A6';
          const label = translateCode('classification', code, locale);
          return (
            <div key={code} className="flex items-center gap-x-2">
              <span
                className="inline-block h-3 w-3 rounded-full border border-white shadow-sm"
                style={{ backgroundColor: color }}
              />
              <span className="text-gray-600">{label}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 border-t border-gray-200 pt-3">
        <div className="mb-1.5 font-medium text-gray-700">
          {locale === 'zh' ? '聚合圆显示' : 'Cluster labels'}
        </div>
        <div className="grid grid-cols-2 gap-1 rounded-md bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => setClusterMetric('count')}
            className={`rounded px-2 py-1 text-[11px] transition-colors ${
              clusterMetric === 'count'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {locale === 'zh' ? '矿床数' : 'Deposits'}
          </button>
          <button
            type="button"
            onClick={() => setClusterMetric('tonnage')}
            className={`rounded px-2 py-1 text-[11px] transition-colors ${
              clusterMetric === 'tonnage'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {locale === 'zh' ? '铜金属量' : 'Cu metal'}
          </button>
        </div>
        <p className="mt-1.5 text-[10px] leading-4 text-gray-400">
          {clusterMetric === 'count'
            ? locale === 'zh'
              ? '数字表示当前圆点内的矿床数量。'
              : 'Number = deposits inside this cluster.'
            : locale === 'zh'
              ? '数字表示当前圆点内的总铜金属量。'
              : 'Number = total contained Cu in this cluster.'}
        </p>
      </div>
    </div>
  );
}
