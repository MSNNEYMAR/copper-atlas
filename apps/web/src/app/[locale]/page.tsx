import Link from 'next/link';

type Props = { params: { locale: string } };

export default async function HomePage({ params: { locale } }: Props) {
  const safeLocale = ['en', 'zh'].includes(locale) ? locale : 'en';
  let t: any = {};
  try {
    t = (await import(`@/messages/${safeLocale}.json`)).default.app || {};
  } catch {}

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] px-4">
      <div className="max-w-4xl text-center">
        <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          {t.title || 'Global Copper Deposits Atlas'}
        </h1>
        <p className="mt-4 text-xl text-gray-600">{t.subtitle}</p>
        <p className="mt-6 text-lg leading-8 text-gray-500 max-w-2xl mx-auto">{t.description}</p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Link
            href={`/${safeLocale}/map`}
            className="rounded-md bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-600"
          >
            Explore Map →
          </Link>
          <Link
            href={`/${safeLocale}/statistics`}
            className="text-sm font-semibold leading-6 text-gray-900 hover:text-brand-500"
          >
            View Statistics →
          </Link>
        </div>
      </div>
    </div>
  );
}
