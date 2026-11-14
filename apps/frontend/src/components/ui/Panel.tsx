import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

/** Flat, hairline-bordered surface. Intentionally modest radius and shadow. */
export function Panel({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn('rounded-lg border border-line bg-ink-850 shadow-panel', className)}
      {...props}
    />
  );
}

interface PanelHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  id?: string;
}

export function PanelHeader({ title, description, action, className, id }: PanelHeaderProps) {
  return (
    <header className={cn('flex items-start justify-between gap-4 border-b border-line px-4 py-3', className)}>
      <div className="min-w-0">
        <h2 id={id} className="text-sm font-semibold text-fg">
          {title}
        </h2>
        {description && <p className="mt-0.5 text-xs text-fg-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
