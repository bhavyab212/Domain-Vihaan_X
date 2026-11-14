import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusables(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) => !el.hasAttribute('hidden') && el.getAttribute('aria-hidden') !== 'true',
  );
}

/**
 * Stack of currently open dialogs (most recent last). Every open dialog listens on `window`, and listeners on one
 * target all fire regardless of stopPropagation, with the OLDEST registered first. So a dialog opened over a drawer
 * would otherwise have its Escape handled by the drawer too. Only the top of this stack may react to the keyboard.
 */
const openDialogs: symbol[] = [];

/**
 * Shared modal-dialog behaviour for Drawer and ConfirmDialog:
 *  - moves focus into the dialog when it opens and RESTORES it to the opener when it closes;
 *  - traps Tab / Shift+Tab inside the dialog;
 *  - closes on Escape, but only for the TOPMOST open dialog (see `openDialogs`).
 *
 * `onClose` is read through a ref, so a parent that re-creates it every render (the URL-driven findings drawer
 * does) does not re-run the effect, re-capture focus, or restore focus mid-session.
 */
export function useDialogBehavior(open: boolean, panelRef: RefObject<HTMLElement | null>, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const id = Symbol('dialog');
    openDialogs.push(id);
    const isTop = () => openDialogs[openDialogs.length - 1] === id;
    const opener = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;

    // Prefer an explicit initial-focus target, else the first control, else the panel itself.
    const initial = panel?.querySelector<HTMLElement>('[data-autofocus]') ?? (panel ? focusables(panel)[0] : null) ?? panel;
    initial?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (!isTop()) return; // a dialog above this one owns the keyboard
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const items = focusables(panelRef.current);
      if (items.length === 0) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      const outside = !active || !panelRef.current.contains(active);
      if (event.shiftKey && (active === first || outside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || outside)) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      const at = openDialogs.indexOf(id);
      if (at !== -1) openDialogs.splice(at, 1);
      // Restore focus to whatever opened this dialog, if it is still in the document.
      if (opener && document.contains(opener)) opener.focus();
    };
  }, [open, panelRef]);
}
