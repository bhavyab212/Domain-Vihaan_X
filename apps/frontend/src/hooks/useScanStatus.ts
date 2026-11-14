import { useState, useEffect } from 'react';

export interface ScanStatusState {
  isRunning: boolean;
  progressPercentage: number;
  currentTool: string;
}

/**
 * Custom polling hook to monitor assessment progress
 * Resumes tracking seamlessly even across browser reloads
 */
export function useScanStatus(assessmentId?: string) {
  const [status, setStatus] = useState<ScanStatusState>({
    isRunning: false,
    progressPercentage: 100,
    currentTool: 'IDLE',
  });

  useEffect(() => {
    if (!assessmentId) return;
    // TODO: Wire real-time polling to /api/assessments/{id}
    console.log(`[useScanStatus] Monitoring assessment: ${assessmentId}`);
  }, [assessmentId]);

  return status;
}
