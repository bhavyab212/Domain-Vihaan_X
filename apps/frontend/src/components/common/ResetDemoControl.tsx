import { useState } from 'react';
import { Loader2, RotateCcw } from 'lucide-react';
import { useDataSource } from '@/app/providers/DataSourceProvider';
import { useDemoReset } from '@/app/providers/DemoResetProvider';
import { Button, type ButtonProps } from '@/components/ui/Button';
import { ConfirmDialog } from './ConfirmDialog';

/**
 * The ONE demo-reset control (command bar and Command Center both render this).
 *
 * Flow: click -> read what will happen -> confirm -> pending -> backend-validated result.
 *  - API mode: confirming sends the real POST /demo/reset. Success is shown only for a validated DemoResetResponse.
 *  - Preview mode: the dialog says plainly that NOTHING will be sent, and confirming sends no request.
 */
export function ResetDemoControl({ size = 'sm', variant = 'secondary', label = 'Reset demo' }: { size?: ButtonProps['size']; variant?: ButtonProps['variant']; label?: string }) {
  const { phase, reset } = useDemoReset();
  const { source } = useDataSource();
  const [asking, setAsking] = useState(false);
  const preview = source.origin === 'SIMULATED_DEMO';
  const pending = phase === 'pending';

  const confirm = async () => {
    await reset();
    setAsking(false);
  };

  return (
    <>
      <Button size={size} variant={variant} onClick={() => setAsking(true)} disabled={pending} aria-label="Reset demo scenario">
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <RotateCcw className="h-3.5 w-3.5" aria-hidden />}
        {pending ? 'Resetting...' : label}
      </Button>

      <ConfirmDialog
        open={asking}
        title={preview ? 'Reset the local preview?' : 'Reset the demo scenario?'}
        confirmLabel={preview ? 'Got it' : 'Reset demo state'}
        cancelLabel="Cancel"
        tone={preview ? 'primary' : 'danger'}
        pending={pending}
        pendingLabel="Resetting..."
        onConfirm={() => void confirm()}
        onCancel={() => setAsking(false)}
      >
        {preview ? (
          <>
            <p>
              You are viewing <strong className="text-fg">local preview data</strong>. It is already the deterministic baseline, so there is
              nothing to reset, and <strong className="text-fg">no request will be sent to the backend</strong>.
            </p>
            <p>Switch to “Backend API” in the top bar to reset the real demo state.</p>
          </>
        ) : (
          <>
            <p>
              This restores the <strong className="text-fg">synthetic demo scenario</strong> on the backend to its canonical baseline and
              re-seeds its assets, findings, relationships and attack path. Any demo changes made since will be discarded.
            </p>
            <p>It only affects demo data. The result shown afterwards is whatever the backend confirms, nothing more.</p>
          </>
        )}
      </ConfirmDialog>
    </>
  );
}
