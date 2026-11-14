import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { isSimulatedProvenance, type ProvenanceType } from '@/types';
import { ProvenanceBadge } from './ProvenanceBadge';

describe('ProvenanceBadge', () => {
  it.each<[ProvenanceType, string]>([
    ['SIMULATED_DEMO', 'Simulated demo'],
    ['SIMULATED', 'Simulated'],
    ['OBSERVED', 'Observed'],
    ['INFERRED', 'Inferred'],
  ])('renders %s with a visible, distinct label', (provenance, label) => {
    render(<ProvenanceBadge provenance={provenance} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('never labels simulated demo evidence as Observed', () => {
    render(<ProvenanceBadge provenance="SIMULATED_DEMO" />);
    expect(screen.queryByText('Observed')).not.toBeInTheDocument();
  });

  it('treats both SIMULATED_DEMO (canonical) and SIMULATED (legacy) as simulated, and nothing else', () => {
    expect(isSimulatedProvenance('SIMULATED_DEMO')).toBe(true);
    expect(isSimulatedProvenance('SIMULATED')).toBe(true);
    expect(isSimulatedProvenance('OBSERVED')).toBe(false);
    expect(isSimulatedProvenance('INFERRED')).toBe(false);
  });
});
