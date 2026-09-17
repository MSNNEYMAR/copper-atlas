/**
 * Copper Atlas — Deposit Type Filter (Hierarchical)
 * 全局铜矿床图谱 — 矿床类型层级筛选器
 */

'use client';

import { useDepositTypes } from '@/hooks/useReference';
import { useTranslations } from '@/lib/i18n';
import { useFilterStore } from '@/stores/filterStore';
import { useMemo, useState } from 'react';

export function DepositTypeFilter() {
  const t = useTranslations('filters');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const { data: types } = useDepositTypes();
  const paths = useFilterStore((s) => s.depositTypePaths);

  // Organize into tree structure by depth
  const tree = useMemo(() => {
    if (!types) return [];
    const topLevel = types.filter((t) => t.depth === 1);
    const children = types.filter((t) => t.depth >= 2);

    return topLevel.map((top) => ({
      ...top,
      children: children.filter((c) => c.path.startsWith(`${top.path}.`)),
    }));
  }, [types]);

  const togglePath = (path: string) => {
    const next = paths.includes(path) ? paths.filter((p) => p !== path) : [...paths, path];
    useFilterStore.setState({ depositTypePaths: next });
  };

  const toggleExpand = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {t('depositType')} {paths.length > 0 && `(${paths.length})`}
      </label>
      <div className="max-h-56 overflow-y-auto custom-scrollbar space-y-0.5">
        {tree.map((node) => (
          <div key={node.code}>
            <div className="flex items-center gap-x-1.5 py-1">
              {node.children.length > 0 && (
                <button
                  type="button"
                  onClick={() => toggleExpand(node.path)}
                  className="text-gray-400 text-xs w-4"
                >
                  {expanded.has(node.path) ? '▾' : '▸'}
                </button>
              )}
              {node.children.length === 0 && <span className="w-4" />}
              <input
                type="checkbox"
                checked={paths.includes(node.path)}
                onChange={() => togglePath(node.path)}
                className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
              />
              <span className="text-sm text-gray-700">{node.name_en}</span>
              <span className="text-xs text-gray-400 ml-auto">{node.name_zh}</span>
            </div>
            {expanded.has(node.path) &&
              node.children.map((child) => (
                <div key={child.code} className="flex items-center gap-x-1.5 py-0.5 pl-7">
                  <input
                    type="checkbox"
                    checked={paths.includes(child.path)}
                    onChange={() => togglePath(child.path)}
                    className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                  />
                  <span className="text-xs text-gray-600">{child.name_en}</span>
                  <span className="text-xs text-gray-400 ml-auto">{child.name_zh}</span>
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}
