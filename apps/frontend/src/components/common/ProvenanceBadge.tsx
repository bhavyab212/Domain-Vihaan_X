import { FlaskConical, Radar, Waypoints } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { ProvenanceType } from '@/types';

/**
 * Evidence provenance.
 *  - SIMULATED  : synthetic demo data, never scanner output
 *  - OBSERVED   : reported by a scanner run
 *  - INFERRED   : derived by the correlation engine, not directly observed
 *
 * The enum matches contracts/openapi/openapi.yaml (Finding.provenance).
 */
export function ProvenanceBadge({ provenance }: { provenance: ProvenanceType }) {
  switch (provenance) {
    case 'SIMULATED':
      return (
        <Badge tone="sim" icon={<FlaskConical className="h-3 w-3" aria-hidden />} title="Synthetic demo data. Not a real scan result.">
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
