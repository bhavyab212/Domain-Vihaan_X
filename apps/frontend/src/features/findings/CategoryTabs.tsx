import { cn } from '@/lib/utils/cn';
import { CATEGORY_DESCRIPTION, CATEGORY_LABEL, CATEGORY_ORDER, type FindingCategory } from './categories';

interface CategoryTabsProps {
  value: FindingCategory | 'ALL';
  onChange: (value: FindingCategory | 'ALL') => void;
  counts: Record<FindingCategory, number>;
  total: number;
}

/**
 * Category tabs. They FILTER (the active tab changes which rows are visible) and each count already reflects every
 * other active filter, so the number on a tab always equals the rows that tab would show. Categories with no
 * findings are hidden unless active, so the bar never shows a wall of zeros.
 */
export function CategoryTabs({ value, onChange, counts, total }: CategoryTabsProps) {
  const visible = CATEGORY_ORDER.filter((c) => counts[c] > 0 || value === c);
  const tabs: { id: FindingCategory | 'ALL'; label: string; count: number; title: string }[] = [
    { id: 'ALL', label: 'All', count: total, title: 'All categories' },
    ...visible.map((c) => ({ id: c, label: CATEGORY_LABEL[c], count: counts[c], title: CATEGORY_DESCRIPTION[c] })),
  ];

  return (
    <div role="tablist" aria-label="Finding category" className="flex flex-wrap gap-1 border-b border-line px-3 pt-2">
      {tabs.map((tab) => {
        const active = value === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={active}
            title={tab.title}
            onClick={() => onChange(tab.id)}
            className={cn(
              '-mb-px flex items-center gap-2 rounded-t-md border-b-2 px-3 py-2 text-xs font-medium transition-colors',
              active ? 'border-signal text-fg' : 'border-transparent text-fg-muted hover:text-fg',
            )}
          >
            {tab.label}
            <span className={cn('tabular rounded px-1.5 py-px text-2xs', active ? 'bg-signal/15 text-signal' : 'bg-ink-800 text-fg-muted')}>
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
