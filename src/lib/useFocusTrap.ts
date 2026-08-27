"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Traps keyboard focus inside the given container element.
 * When Tab/Shift+Tab reaches the boundary, it wraps to the other end.
 * On mount, the first focusable element receives focus.
 * Returns a ref to attach to the outermost focusable container.
 */
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(
  active: boolean,
) {
  const containerRef = useRef<T>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;

    // Remember what was focused before the modal opened
    previousFocus.current = document.activeElement as HTMLElement | null;

    // Focus the first focusable element inside the modal
    const container = containerRef.current;
    const focusableEls = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));

    // Small delay to allow DOM to settle (autoFocus, etc.)
    const timer = setTimeout(() => {
      const els = focusableEls();
      if (els.length > 0) {
        // Prefer an element that doesn't already have focus (e.g. autoFocus input)
        const autoFocused = container.querySelector<HTMLElement>(
          ":focus",
        );
        if (!autoFocused) {
          els[0].focus();
        }
      }
    }, 30);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      const els = focusableEls();
      if (els.length === 0) return;

      const first = els[0];
      const last = els[els.length - 1];

      if (e.shiftKey) {
        // Shift+Tab: if on first element, wrap to last
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab: if on last element, wrap to first
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    container.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(timer);
      container.removeEventListener("keydown", handleKeyDown);
      // Restore focus to the element that triggered the modal
      if (previousFocus.current?.isConnected) {
        previousFocus.current.focus();
      }
    };
  }, [active]);

  return containerRef;
}
