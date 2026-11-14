import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export type BadgeTone = 'neutral' | 'signal' | 'ok' | 'warn' | 'critical' | 'sim';

const TONES: Record<BadgeTone, string> = {
  neutral: 'border-line-strong bg-ink-800 text-fg-soft',
  signal: 'border-signal/40 bg-signal/10 text-signal',
  ok: 'border-ok/40 bg-ok/10 text-ok',
  warn: 'border-sev-high/40 bg-sev-high/10 text-sev-high',
  critical: 'border-sev-critical/40 bg-sev-critical/10 text-sev-critical',
  sim: 'border-sim/45 bg-sim/10 text-sim',
};

interface BadgeProps {
  tone?: BadgeTone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  title?: string;
}

export function Badge({ tone = 'neutral', icon, children, className, title }: BadgeProps) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded border px-1.5 py-0.5 text-2xs font-medium uppercase',
        TONES[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
