import type { SeverityLevel } from '@/types';

export const SEVERITY_ORDER: SeverityLevel[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL'];

export function severityRank(severity: SeverityLevel): number {
  return SEVERITY_ORDER.indexOf(severity);
}

interface SeverityStyle {
  label: string;
  text: string;
  chip: string;
  bar: string;
  dot: string;
  hex: string;
}

/** Full class strings (not composed) so Tailwind can see them. Severity is always paired with a text label. */
export const SEVERITY_STYLE: Record<SeverityLevel, SeverityStyle> = {
  CRITICAL: {
    label: 'Critical',
    text: 'text-sev-critical',
    chip: 'border-sev-critical/40 bg-sev-critical/10 text-sev-critical',
    bar: 'bg-sev-critical',
    dot: 'bg-sev-critical',
    hex: '#F0455A',
  },
  HIGH: {
    label: 'High',
    text: 'text-sev-high',
    chip: 'border-sev-high/40 bg-sev-high/10 text-sev-high',
    bar: 'bg-sev-high',
    dot: 'bg-sev-high',
    hex: '#F2813A',
  },
  MEDIUM: {
    label: 'Medium',
    text: 'text-sev-medium',
    chip: 'border-sev-medium/40 bg-sev-medium/10 text-sev-medium',
    bar: 'bg-sev-medium',
    dot: 'bg-sev-medium',
    hex: '#E5B93C',
  },
  LOW: {
    label: 'Low',
    text: 'text-sev-low',
    chip: 'border-sev-low/40 bg-sev-low/10 text-sev-low',
    bar: 'bg-sev-low',
    dot: 'bg-sev-low',
    hex: '#5B8DEF',
  },
  INFORMATIONAL: {
    label: 'Info',
    text: 'text-sev-info',
    chip: 'border-sev-info/40 bg-sev-info/10 text-sev-info',
    bar: 'bg-sev-info',
    dot: 'bg-sev-info',
    hex: '#97A5C2',
  },
};
