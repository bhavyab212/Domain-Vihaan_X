import { Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { AttackPathsView } from '@/features/attack-paths/AttackPathsView';
import { SecurityGraphView } from '@/features/graph/SecurityGraphView';
import { FindingsView } from '@/features/findings/FindingsView';
import { OverviewView } from '@/features/overview/OverviewView';
import { RemediationView } from '@/features/remediation/RemediationView';
import { NotFoundView } from '@/components/common/NotFoundView';

/** The five primary interfaces. Paths are fixed by TSK-004. */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<OverviewView />} />
        <Route path="graph" element={<SecurityGraphView />} />
        <Route path="threats" element={<FindingsView />} />
        <Route path="paths" element={<AttackPathsView />} />
        <Route path="remediation" element={<RemediationView />} />
        <Route path="*" element={<NotFoundView />} />
      </Route>
    </Routes>
  );
}
