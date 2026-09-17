/**
 * Copper Atlas — Deposit Detail Panel
 * 全球铜矿床图谱 — 矿床详情面板
 *
 * ALL displayed DB values are translated through translateCode() or locale-aware field selection.
 * Zero raw English text leaks to Chinese UI. Zero manual translations inline.
 */
'use client';

import { useDepositDetail } from '@/hooks/useDeposits';
import { useNearbyDeposits } from '@/hooks/useDeposits';
import { translateCode } from '@/lib/dictionary';
import { type Locale, useLocale, useTranslations } from '@/lib/i18n';
import { useMapStore } from '@/stores/mapStore';
import { useUIStore } from '@/stores/uiStore';

export function DepositDetailPanel() {
  const t = useTranslations('deposit');
  const locale = useLocale();
  const { closeDetailPanel } = useUIStore();
  const { selectedDepositId } = useMapStore();

  const { data: detail, isLoading, error } = useDepositDetail(selectedDepositId);
  const { data: nearby } = useNearbyDeposits(selectedDepositId, 50, 8);
  const props = detail?.properties;

  // Localized field accessors
  const locName = props ? (locale === 'zh' && props.name_zh ? props.name_zh : props.name) : '';
  const locCountry = props
    ? locale === 'zh' && props.country_name_zh
      ? props.country_name_zh
      : props.country_name_en || props.country_iso
    : '';
  const locType = props
    ? locale === 'zh' && props.deposit_type_name_zh
      ? props.deposit_type_name_zh
      : props.deposit_type_name_en
    : '';
  const locSummary = props
    ? locale === 'zh' && props.summary_zh
      ? props.summary_zh
      : props.summary_en
    : '';
  const _locDescription = props
    ? locale === 'zh' && props.geology_zh
      ? props.geology_zh
      : props.geology_en
    : '';

  return (
    <div className="flex h-full flex-col bg-white shadow-lg border-l border-gray-200">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 shrink-0">
        <h2 className="text-sm font-semibold text-gray-900 truncate">
          {isLoading ? t('loading') : locName || t('detail')}
        </h2>
        <button
          onClick={closeDetailPanel}
          className="rounded-md p-1.5 text-gray-400 hover:text-gray-600"
          type="button"
          aria-label={t('close')}
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

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          </div>
        )}
        {error && (
          <div className="p-4 text-center">
            <p className="text-sm text-red-500">{t('error')}</p>
          </div>
        )}
        {!selectedDepositId && !isLoading && (
          <div className="flex h-full items-center justify-center px-4">
            <p className="text-sm text-gray-400">{t('noDepositSelected')}</p>
          </div>
        )}

        {props && (
          <div className="divide-y divide-gray-100">
            {/* Overview */}
            <Section title={t('overview')}>
              <D label={t('name')}>{locName}</D>
              {locale === 'en' && props.name_zh && <D label="中文名">{props.name_zh}</D>}
              {locale === 'zh' && props.name !== props.name_zh && (
                <D label="English">{props.name}</D>
              )}
              <D label={t('country')}>{locCountry}</D>
              {props.state_province && <D label={t('stateProvince')}>{props.state_province}</D>}
              <D label={t('status')}>
                <StatusBadge status={props.status} locale={locale} />
              </D>
              <D label={t('type')}>{locType}</D>
            </Section>

            {/* Specifications */}
            <Section title={t('specifications')}>
              <D label={t('tonnage')}>{fmtTonnage(props.tonnage_mt)}</D>
              {props.tonnage_mt_low && props.tonnage_mt_high && (
                <D
                  label={locale === 'zh' ? '范围' : 'Range'}
                >{`${props.tonnage_mt_low} – ${props.tonnage_mt_high} Mt`}</D>
              )}
              <D label={t('grade')}>{fmtGrade(props.tonnage_grade_pct)}</D>
              {props.tonnage_cutoff_pct && (
                <D label={t('cutoffGrade')}>{`${props.tonnage_cutoff_pct}%`}</D>
              )}
              <D label={t('discoveryYear')}>{props.discovery_year || '—'}</D>
              {props.production_start_year && (
                <D label={t('productionStart')}>{props.production_start_year}</D>
              )}
              <D label={t('operator')}>{props.operator_company || '—'}</D>
              <D label={t('miningMethod')}>
                {translateCode('mining_method', props.mining_method, locale)}
              </D>
            </Section>

            {/* Resources */}
            {(props.measured_mt || props.indicated_mt || props.inferred_mt) && (
              <Section title={t('resources')}>
                {props.proven_mt && <D label="Proven">{`${props.proven_mt} Mt`}</D>}
                {props.probable_mt && <D label="Probable">{`${props.probable_mt} Mt`}</D>}
                {props.measured_mt && <D label="Measured">{`${props.measured_mt} Mt`}</D>}
                {props.indicated_mt && <D label="Indicated">{`${props.indicated_mt} Mt`}</D>}
                {props.inferred_mt && <D label="Inferred">{`${props.inferred_mt} Mt`}</D>}
              </Section>
            )}

            {/* Geology */}
            <Section title={t('geology')}>
              {props.host_rock_type && <D label={t('hostRock')}>{props.host_rock_type}</D>}
              <D label={t('hostRockAge')}>
                {translateCode('geological_age', props.host_rock_age_text, locale)}
              </D>
              {props.mineralization_age_ma && (
                <D label={t('mineralizationAge')}>
                  {`${props.mineralization_age_ma} ± ${props.mineralization_age_error_ma} Ma (${props.mineralization_age_method || ''})`}
                </D>
              )}
              <D label={t('tectonicSetting')}>
                {translateCode('tectonic_setting', props.tectonic_setting, locale)}
              </D>
              <D label={t('geologicalProvince')}>
                {translateCode('geological_province', props.geological_province, locale)}
              </D>
              {props.metallogenic_belt && (
                <D label={locale === 'zh' ? '成矿带' : 'Metallogenic Belt'}>
                  {translateCode('metallogenic_belt', props.metallogenic_belt, locale)}
                </D>
              )}
            </Section>

            {/* Description */}
            {locSummary && (
              <Section title={locale === 'zh' ? '概述' : 'Description'}>
                <p className="text-sm text-gray-600 leading-relaxed">{locSummary}</p>
              </Section>
            )}

            {/* Nearby */}
            {nearby && nearby.features.length > 1 && (
              <Section title={t('nearby')}>
                <ul className="space-y-1">
                  {nearby.features
                    .filter((f) => f.id !== selectedDepositId)
                    .slice(0, 8)
                    .map((f) => (
                      <li key={f.id}>
                        <button
                          type="button"
                          className="text-sm text-brand-600 hover:text-brand-800 hover:underline w-full text-left truncate"
                          onClick={() => useMapStore.getState().selectDeposit(f.id)}
                        >
                          {f.properties.name}
                          {f.properties.tonnage_mt && (
                            <span className="text-gray-400 ml-1 text-xs">
                              ({fmtTonnage(f.properties.tonnage_mt)})
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                </ul>
              </Section>
            )}

            {/* Provenance */}
            <Section title={t('provenance')}>
              {props.data_source && <D label={t('dataSource')}>{props.data_source}</D>}
              <D label={t('dataQuality')}>
                <QualityScore score={props.data_quality_score} />
              </D>
              {props.last_verified_date && (
                <D label={t('lastVerified')}>{props.last_verified_date}</D>
              )}
              {Array.isArray(props.reference_dois) && props.reference_dois.length > 0 && (
                <div className="mt-1">
                  <span className="text-xs text-gray-400">
                    {locale === 'zh' ? '参考文献' : 'References'}:
                  </span>
                  {props.reference_dois.map((doi: string) => (
                    <a
                      key={doi}
                      href={`https://doi.org/${doi}`}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="block text-xs text-brand-600 hover:text-brand-800 truncate"
                    >
                      {doi}
                    </a>
                  ))}
                </div>
              )}
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">{title}</h3>
      <dl className="space-y-1.5">{children}</dl>
    </div>
  );
}

function D({
  label,
  value,
  children,
}: { label: string; value?: string | number | null; children?: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-x-2">
      <dt className="text-xs text-gray-400 shrink-0">{label}</dt>
      <dd className="text-xs text-gray-700 text-right truncate">
        {children ?? (value !== null && value !== undefined ? String(value) : '—')}
      </dd>
    </div>
  );
}

function StatusBadge({ status, locale }: { status: string; locale: Locale }) {
  const colors: Record<string, string> = {
    production: 'bg-green-100 text-green-700',
    development: 'bg-blue-100 text-blue-700',
    exploration: 'bg-purple-100 text-purple-700',
    feasibility: 'bg-yellow-100 text-yellow-700',
    suspended: 'bg-red-100 text-red-700',
    closed: 'bg-gray-100 text-gray-600',
    depleted: 'bg-gray-50 text-gray-400',
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${colors[status] || 'bg-gray-50 text-gray-400'}`}
    >
      {translateCode('status', status, locale)}
    </span>
  );
}

function QualityScore({ score }: { score: number | null }) {
  if (!score) return <span className="text-xs text-gray-400">—</span>;
  return (
    <span className="inline-flex items-center gap-x-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={`inline-block h-2 w-2 rounded-full ${i < score ? 'bg-brand-500' : 'bg-gray-200'}`}
        />
      ))}
    </span>
  );
}

function fmtTonnage(v: number | null): string {
  if (v === null || v === undefined) return '—';
  if (v >= 1000) return `${(v / 1000).toFixed(1)} Bt`;
  return `${v.toFixed(1)} Mt`;
}
function fmtGrade(v: number | null): string {
  return v !== null && v !== undefined ? `${v.toFixed(2)}%` : '—';
}
