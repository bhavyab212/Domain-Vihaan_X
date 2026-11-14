import { AppWindow, Cloud, Database, GitBranch, Globe, Plug, type LucideIcon } from 'lucide-react';
import type { AssetType } from '@/types';

const ICONS: Record<AssetType, LucideIcon> = {
  REPOSITORY: GitBranch,
  CLOUD_ACCOUNT: Cloud,
  DOMAIN: Globe,
  WEB_APPLICATION: AppWindow,
  API_ENDPOINT: Plug,
  DATABASE: Database,
};

export function AssetIcon({ type, className }: { type: AssetType | undefined; className?: string }) {
  const Icon = (type && ICONS[type]) || Database;
  return <Icon className={className} aria-hidden />;
}

/** MVP security domain an asset type belongs to (ADR-001). Presentation grouping only. */
export type SecurityDomain = 'APPLICATION' | 'INFRASTRUCTURE' | 'EXTERNAL';

export function domainOfAssetType(type: AssetType): SecurityDomain {
  switch (type) {
    case 'REPOSITORY':
      return 'APPLICATION';
    case 'DOMAIN':
    case 'WEB_APPLICATION':
    case 'API_ENDPOINT':
      return 'EXTERNAL';
    default:
      return 'INFRASTRUCTURE';
  }
}
