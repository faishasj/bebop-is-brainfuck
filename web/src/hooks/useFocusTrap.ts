import { useEffect, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

interface UseFocusTrapOptions {
  containerRef: RefObject<HTMLElement | null>;
  isActive: boolean;
}

export function useFocusTrap({ containerRef, isActive }: UseFocusTrapOptions) {
  useEffect(() => {
    const el = containerRef.current;
    if (!isActive || !el) return;

    // Focus first focusable element on activation
    const first = el.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const focusable = Array.from(
        el!.querySelectorAll<HTMLElement>(FOCUSABLE),
      );
      if (focusable.length === 0) return;

      const firstEl = focusable[0];
      const lastEl = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        if (document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    }

    el.addEventListener("keydown", handleKeyDown);
    return () => el.removeEventListener("keydown", handleKeyDown);
  }, [isActive, containerRef]);
}
