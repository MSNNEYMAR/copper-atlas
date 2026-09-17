'use client';

import { useLocale } from '@/lib/i18n';
import { usePathname, useRouter } from 'next/navigation';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchTo = locale === 'en' ? 'zh' : 'en';

  const handleSwitch = () => {
    const newPath = pathname.replace(`/${locale}`, `/${switchTo}`);
    router.push(newPath);
  };

  return (
    <button
      onClick={handleSwitch}
      className="rounded-md px-3 py-1 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
      type="button"
      aria-label={switchTo === 'zh' ? '切换到中文' : 'Switch to English'}
    >
      {locale === 'en' ? '中文' : 'EN'}
    </button>
  );
}
