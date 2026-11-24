import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Button } from './Button';

interface DialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  // Element to focus after closing, when the browser's default (the opener) may no longer exist.
  finalFocus?: () => HTMLElement | null;
}

// Native modal <dialog>: focus trapping, Esc to close, and the backdrop come from the browser.
export function Dialog({ open, title, onClose, children, finalFocus }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // Native dialogs focus the first control (the close button); prefer a marked element instead.
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    }
    if (!open && dialog.open) {
      dialog.close();
      finalFocus?.()?.focus();
    }
  }, [open, finalFocus]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-line bg-surface p-0 text-ink shadow-overlay backdrop:bg-ink/35"
    >
      {open && (
        <div className="p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <h2 id={titleId} className="pt-1 text-lg font-semibold tracking-tight">
              {title}
            </h2>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close" className="-mt-1 -mr-2">
              <X className="size-4" aria-hidden="true" />
            </Button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
