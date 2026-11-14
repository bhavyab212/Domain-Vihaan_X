import { Crosshair, LayoutDashboard, Network, ShieldAlert, Wrench, type LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  /** Short label for the compact (narrow-screen) nav. */
  short: string;
  icon: LucideIcon;
  /** `end` matching so "/" is not active on every route. */
  end?: boolean;
}

/** The five primary interfaces. Order is the intended walkthrough order. */
export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Security Command Center', short: 'Command', icon: LayoutDashboard, end: true },
  { to: '/graph', label: 'Business Security Graph', short: 'Graph', icon: Network },
  { to: '/threats', label: 'Threats & Findings', short: 'Findings', icon: ShieldAlert },
  { to: '/paths', label: 'Attack Paths', short: 'Paths', icon: Crosshair },
  { to: '/remediation', label: 'Remediation Studio', short: 'Remediate', icon: Wrench },
];
