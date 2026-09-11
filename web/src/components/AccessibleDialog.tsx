"use client";
import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';

/** Native modal dialogs supply focus containment and make the background inert. */
export default function AccessibleDialog({ title, onClose, children, style, className, busy = false }: {
  title: string; onClose: () => void; children: ReactNode; style?: CSSProperties; className?: string; busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog?.showModal();
    return () => { dialog?.close(); previous?.focus(); };
  }, []);
  return <dialog ref={ref} aria-label={title} aria-modal="true" className={className}
    onKeyDown={event => {
      if (event.key !== 'Tab') return;
      const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])',
      )).filter(element => element.tabIndex >= 0 && element.getClientRects().length > 0);
      const first = controls[0], last = controls[controls.length - 1];
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }}
    onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}
    style={{ border: 0, margin: 0, width: '100vw', height: '100dvh', maxWidth: '100vw', maxHeight: '100dvh', boxSizing: 'border-box', ...style }}>
    {children}
  </dialog>;
}
