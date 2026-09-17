/**
 * Copper Atlas — Application Header
 * 全球铜矿床图谱 — 应用页眉
 */

'use client';

import { useTranslations } from '@/lib/i18n';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LanguageSwitcher } from './LanguageSwitcher';

export function Header() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const locale = pathname.split('/')[1];

  return (
    <header className="z-40 border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <nav className="mx-auto flex h-14 max-w-full items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-x-8">
          {/* Logo */}
          <Link
            href={`/${locale}`}
            className="flex items-center gap-x-2 font-semibold text-gray-900"
          >
            <span className="text-brand-500 text-xl">⬡</span>
            <span className="hidden sm:inline">Copper Atlas</span>
          </Link>

          {/* Navigation */}
          <div className="hidden md:flex md:gap-x-6">
            <NavLink href={`/${locale}/map`} label={t('map')} />
            <NavLink href={`/${locale}/statistics`} label={t('statistics')} />
            <NavLink href={`/${locale}/about`} label={t('about')} />
          </div>
        </div>

        <div className="flex items-center gap-x-4">
          <LanguageSwitcher />
        </div>
      </nav>
    </header>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const isActive = pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`text-sm font-medium transition-colors ${
        isActive ? 'text-brand-600' : 'text-gray-600 hover:text-gray-900'
      }`}
    >
      {label}
    </Link>
  );
}
