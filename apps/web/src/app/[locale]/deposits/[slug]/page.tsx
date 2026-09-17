import { DepositJsonLd } from '@/components/shared/JsonLd';
import { translateServer } from '@/lib/dictionary-server';
import type { DepositDetailProperties } from '@/types/deposit';
/**
 * Copper Atlas — Deposit Detail Page (SSR for SEO)
 * 全球铜矿床图谱 — 矿床详情页
 *
 * Locale-aware: DB codes translated via dictionary-server, _en/_zh fields selected by locale.
 * Zero mixed-language content. English page = 100% English. Chinese page = 100% Chinese.
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

type Props = { params: { slug: string; locale: string } };

const API_BASE = '/api/v1';

async function fetchDeposit(slug: string): Promise<DepositDetailProperties | null> {
  try {
    const res = await fetch(`${API_BASE}/deposits/slug/${slug}`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return (await res.json()).properties;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const deposit = await fetchDeposit(params.slug);
  if (!deposit) return { title: 'Not Found' };
  const isZh = params.locale === 'zh';
  const title =
    isZh && deposit.name_zh
      ? `${deposit.name_zh} — ${deposit.tonnage_mt ? `${deposit.tonnage_mt} Mt` : ''} 铜矿床`
      : `${deposit.name} — ${deposit.tonnage_mt ? `${deposit.tonnage_mt} Mt` : ''} Copper Deposit`;
  const desc = deposit.summary_en || `${deposit.name} in ${deposit.country_name_en}`;
  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      type: 'article',
      locale: isZh ? 'zh_CN' : 'en_US',
      siteName: 'Copper Atlas',
    },
    alternates: {
      canonical: `/${params.locale}/deposits/${params.slug}`,
      languages: { en: `/en/deposits/${params.slug}`, zh: `/zh/deposits/${params.slug}` },
    },
  };
}

export default async function DepositDetailPage({ params }: Props) {
  const d = await fetchDeposit(params.slug);
  if (!d) notFound();

  const isZh = params.locale === 'zh';
  const locName = isZh && d.name_zh ? d.name_zh : d.name;
  const locCountry =
    isZh && d.country_name_zh ? d.country_name_zh : d.country_name_en || d.country_iso;
  const locType = isZh && d.deposit_type_name_zh ? d.deposit_type_name_zh : d.deposit_type_name_en;
  const locSummary = isZh && d.summary_zh ? d.summary_zh : d.summary_en;
  const locMining = translateServer('mining_method', d.mining_method, isZh ? 'zh' : 'en');
  const locStatus = translateServer('status', d.status, isZh ? 'zh' : 'en');

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <DepositJsonLd deposit={d} />

      <h1 className="text-3xl font-bold text-gray-900">
        {locName}
        {isZh && d.name !== d.name_zh && d.name_zh && (
          <span className="text-lg text-gray-500 ml-2">{d.name}</span>
        )}
      </h1>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 text-sm text-gray-500">
        <span>{locCountry}</span>
        {d.state_province && <span>· {d.state_province}</span>}
        <span className="inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
          {locStatus}
        </span>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MC
          label={isZh ? '铜金属总量' : 'Contained Copper'}
          value={d.tonnage_mt ? `${d.tonnage_mt.toFixed(1)} Mt` : '—'}
        />
        <MC
          label={isZh ? '平均品位' : 'Average Grade'}
          value={d.tonnage_grade_pct ? `${d.tonnage_grade_pct.toFixed(2)}%` : '—'}
        />
        <MC label={isZh ? '矿床类型' : 'Deposit Type'} value={locType || '—'} />
        <MC
          label={isZh ? '发现年份' : 'Discovery Year'}
          value={d.discovery_year ? String(d.discovery_year) : '—'}
        />
      </div>

      <div className="mt-8 prose prose-gray max-w-none">
        <h2>{isZh ? '概述' : 'Overview'}</h2>
        <p className="text-gray-600 leading-relaxed">
          {locSummary || (isZh ? '暂无描述' : 'No description available.')}
        </p>

        <h2>{isZh ? '地质背景' : 'Geological Context'}</h2>
        {d.host_rock_type && (
          <p>
            <strong>{isZh ? '容矿岩石' : 'Host Rock'}:</strong> {d.host_rock_type} (
            {d.host_rock_age_text})
          </p>
        )}
        {d.tectonic_setting && (
          <p>
            <strong>{isZh ? '构造环境' : 'Tectonic Setting'}:</strong> {d.tectonic_setting}
          </p>
        )}
        {d.geological_province && (
          <p>
            <strong>{isZh ? '地质省' : 'Geological Province'}:</strong> {d.geological_province}
          </p>
        )}
        {d.metallogenic_belt && (
          <p>
            <strong>{isZh ? '成矿带' : 'Metallogenic Belt'}:</strong> {d.metallogenic_belt}
          </p>
        )}
        {d.mineralization_age_ma && (
          <p>
            <strong>{isZh ? '成矿时代' : 'Mineralization Age'}:</strong> {d.mineralization_age_ma} ±{' '}
            {d.mineralization_age_error_ma} Ma ({d.mineralization_age_method || ''})
          </p>
        )}

        <h2>{isZh ? '资源与开采' : 'Resources & Operations'}</h2>
        {d.operator_company && (
          <p>
            <strong>{isZh ? '运营方' : 'Operator'}:</strong> {d.operator_company}
          </p>
        )}
        {d.mining_method && (
          <p>
            <strong>{isZh ? '开采方式' : 'Mining Method'}:</strong> {locMining}
          </p>
        )}
        {d.production_start_year && (
          <p>
            <strong>{isZh ? '投产年份' : 'Production Start'}:</strong> {d.production_start_year}
          </p>
        )}

        <h2>{isZh ? '数据溯源' : 'Data Provenance'}</h2>
        {d.data_source && (
          <p>
            <strong>{isZh ? '数据来源' : 'Source'}:</strong> {d.data_source}
          </p>
        )}
        {d.last_verified_date && (
          <p>
            <strong>{isZh ? '最后验证' : 'Last Verified'}:</strong> {d.last_verified_date}
          </p>
        )}
        {Array.isArray(d.reference_dois) && d.reference_dois.length > 0 && (
          <div>
            <strong>{isZh ? '参考文献' : 'References'}:</strong>
            <ul>
              {d.reference_dois.map((doi: string) => (
                <li key={doi}>
                  <a
                    href={`https://doi.org/${doi}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-brand-600"
                  >
                    {doi}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 p-4 bg-gray-50 rounded-lg text-center">
          <a
            href={`/${params.locale}/map?search=${d.slug}`}
            className="text-brand-600 hover:text-brand-800 font-medium"
          >
            {isZh ? '在地图上查看 →' : 'View on Interactive Map →'}
          </a>
        </div>
      </div>
    </div>
  );
}

function MC({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 text-center">
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="mt-1 text-lg font-semibold text-gray-900">{value || '—'}</dd>
    </div>
  );
}
