import { DatasetJsonLd } from '@/components/shared/JsonLd';
import enMessages from '@/messages/en.json';

type Props = { params: { locale: string } };

export default async function AboutPage({ params: { locale } }: Props) {
  let t: any = {};
  try {
    if (locale === 'zh') {
      t = (await import('@/messages/zh.json')).default.app || {};
    } else {
      t = enMessages.app || {};
    }
  } catch {}

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <DatasetJsonLd />
      <h1 className="text-3xl font-bold text-gray-900">{t.title || ''}</h1>
      <p className="mt-4 text-lg text-gray-600">{t.description || ''}</p>
      <div className="mt-10 prose prose-gray max-w-none">
        <h2>Data Sources</h2>
        <p>
          Copper Atlas aggregates data from publicly available geological surveys, academic
          literature, and company technical reports.
        </p>
        <ul>
          <li>
            <strong>USGS MRDS</strong> — Global mineral deposit database
          </li>
        </ul>
        <h2>Open Science</h2>
        <p>Data: CC-BY 4.0 | Code: MIT</p>
        <h2>Technology</h2>
        <p>PostgreSQL + PostGIS | FastAPI | MapLibre GL JS | Next.js 14</p>
      </div>
    </div>
  );
}
