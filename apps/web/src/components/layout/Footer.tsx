'use client';

import { useTranslations } from '@/lib/i18n';

export function Footer() {
  const t = useTranslations('footer');

  return (
    <footer className="border-t border-gray-200 bg-white py-3 text-center text-xs text-gray-500">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6">
        <span>{t('license')}</span>
        <div className="flex gap-x-4">
          <a href="/about#sources" className="hover:text-gray-700">
            {t('dataSources')}
          </a>
          <a href="/about#methodology" className="hover:text-gray-700">
            {t('methodology')}
          </a>
          <a href="mailto:contact@copper-atlas.org" className="hover:text-gray-700">
            {t('contact')}
          </a>
        </div>
      </div>
    </footer>
  );
}
