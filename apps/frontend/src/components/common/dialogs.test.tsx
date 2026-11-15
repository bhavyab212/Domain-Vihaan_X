import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';
import { Drawer } from './Drawer';

function DrawerHarness({ onCloseSpy }: { onCloseSpy?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>open drawer</button>
      <Drawer
        open={open}
        onClose={() => {
          onCloseSpy?.();
          setOpen(false);
        }}
        title="Details"
      >
        <button>first inner</button>
        <button>last inner</button>
      </Drawer>
    </>
  );
}

describe('Drawer (shared dialog behaviour)', () => {
  it('moves focus in, traps Tab both ways, and restores focus to the opener on close', async () => {
    const user = userEvent.setup();
    render(<DrawerHarness />);
    const opener = screen.getByRole('button', { name: 'open drawer' });
    await user.click(opener);
    const dialog = await screen.findByRole('dialog', { name: 'Details' });

    expect(dialog).toContainElement(document.activeElement as HTMLElement); // focus moved inside

    // cycle forward past the last control: must wrap to the first, never leave the dialog
    for (let i = 0; i < 6; i++) {
      await user.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
    // and backwards
    for (let i = 0; i < 6; i++) {
      await user.tab({ shift: true });
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(opener).toHaveFocus();
  });

  it('does not re-capture or restore focus when the parent re-renders with a new onClose', async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    const { rerender } = render(<DrawerHarness onCloseSpy={spy} />);
    await user.click(screen.getByRole('button', { name: 'open drawer' }));
    await screen.findByRole('dialog');
    const inner = screen.getByRole('button', { name: 'first inner' });
    inner.focus();
    rerender(<DrawerHarness onCloseSpy={spy} />);
    rerender(<DrawerHarness onCloseSpy={spy} />);
    expect(inner).toHaveFocus(); // not yanked away by effect re-runs
  });

  it('fills the viewport width on small screens (max-w only applies from sm up)', async () => {
    const user = userEvent.setup();
    render(<DrawerHarness />);
    await user.click(screen.getByRole('button', { name: 'open drawer' }));
    expect((await screen.findByRole('dialog')).className).toMatch(/\bw-full\b/);
  });
});

function ConfirmHarness({ pending = false, canConfirm = true, onConfirm = () => {}, onCancel = () => {} }: { pending?: boolean; canConfirm?: boolean; onConfirm?: () => void; onCancel?: () => void }) {
  return (
    <ConfirmDialog open title="Reset demo?" confirmLabel="Reset" pending={pending} canConfirm={canConfirm} onConfirm={onConfirm} onCancel={onCancel}>
      <p>This restores the synthetic baseline.</p>
    </ConfirmDialog>
  );
}

describe('ConfirmDialog', () => {
  it('is an alertdialog named by its title, with Cancel focused first (Enter cannot confirm by accident)', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<ConfirmHarness onConfirm={onConfirm} />);
    expect(await screen.findByRole('alertdialog', { name: 'Reset demo?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    await user.keyboard('{Enter}'); // activates the focused Cancel, not Confirm
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('Escape cancels, confirm confirms', async () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<ConfirmHarness onCancel={onCancel} onConfirm={onConfirm} />);
    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('while pending it blocks double submit and cannot be dismissed', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(<ConfirmHarness pending onConfirm={onConfirm} onCancel={onCancel} />);
    const confirm = screen.getByRole('button', { name: /Working/ });
    expect(confirm).toBeDisabled();
    await user.click(confirm);
    await user.keyboard('{Escape}');
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('keeps Confirm disabled until its extra condition holds', () => {
    render(<ConfirmHarness canConfirm={false} />);
    expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled();
  });

  it('a ConfirmDialog opened over a Drawer: Escape closes only the dialog, not the drawer', async () => {
    const user = userEvent.setup();
    const drawerClose = vi.fn();
    function Both() {
      const [confirming, setConfirming] = useState(false);
      return (
        <Drawer open onClose={drawerClose} title="Drawer">
          <button onClick={() => setConfirming(true)}>ask</button>
          <ConfirmDialog open={confirming} title="Sure?" confirmLabel="Yes" onConfirm={() => {}} onCancel={() => setConfirming(false)}>
            x
          </ConfirmDialog>
        </Drawer>
      );
    }
    render(<Both />);
    await user.click(screen.getByRole('button', { name: 'ask' }));
    await screen.findByRole('alertdialog');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(drawerClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Drawer' })).toBeInTheDocument();
  });
});
