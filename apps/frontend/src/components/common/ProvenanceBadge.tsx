import { FlaskConical, Radar, Waypoints } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { ProvenanceType } from '@/types';

/**
 * Evidence provenance, always visible and always distinguishable:
 *  - SIMULATED_DEMO : canonical value for synthetic demo evidence (never scanner output)
 *  - SIMULATED      : legacy synonym still accepted from older payloads/examples
 *  - OBSERVED       : reported by an actual scanner run
 *  - INFERRED       : derived by the correlation engine, not directly observed
 *
 * The enum matches contracts/openapi/openapi.yaml (Finding.provenance).
 */
export function ProvenanceBadge({ provenance }: { provenance: ProvenanceType }) {
  switch (provenance) {
    case 'SIMULATED_DEMO':
      return (
        <Badge tone="sim" icon={<FlaskConical className="h-3 w-3" aria-hidden />} title="Synthetic demo evidence (SIMULATED_DEMO). Not a real scan result.">
          Simulated demo
        </Badge>
      );
    case 'SIMULATED':
      return (
        <Badge tone="sim" icon={<FlaskConical className="h-3 w-3" aria-hidden />} title="Synthetic data (legacy SIMULATED value). Not a real scan result.">
          Simulated
        </Badge>
      );
    case 'OBSERVED':
      return (
        <Badge tone="signal" icon={<Radar className="h-3 w-3" aria-hidden />} title="Reported by a scanner run.">
          Observed
        </Badge>
      );
    case 'INFERRED':
      return (
        <Badge tone="neutral" icon={<Waypoints className="h-3 w-3" aria-hidden />} title="Derived by correlation, not directly observed.">
          Inferred
        </Badge>
      );
  }
}
