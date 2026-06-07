import { useEffect, useLayoutEffect, useRef, useState } from "react";

// SSR-safe layout effect
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Single shared observer keeps timing consistent across many elements,
// even when the user scrolls quickly.
type Cb = (visible: boolean) => void;
let sharedObserver: IntersectionObserver | null = null;
const callbacks = new WeakMap<Element, Cb>();

function getObserver() {
  if (sharedObserver || typeof IntersectionObserver === "undefined") {
    return sharedObserver;
  }
  sharedObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const cb = callbacks.get(entry.target);
        if (!cb) continue;
        if (entry.isIntersecting || entry.intersectionRatio > 0) {
          cb(true);
          sharedObserver?.unobserve(entry.target);
          callbacks.delete(entry.target);
        }
      }
    },
    { threshold: 0.08, rootMargin: "0px 0px -10% 0px" },
  );
  return sharedObserver;
}

export function useReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);
  const [shown, setShown] = useState(false);

  // Synchronously decide initial visibility before paint — kills the flicker.
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof window === "undefined") {
      setShown(true);
      return;
    }

    const reduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const alreadyVisible = rect.top < vh * 0.92 && rect.bottom > 0;

    if (reduced || alreadyVisible) {
      setShown(true);
      return;
    }

    const io = getObserver();
    if (!io) {
      setShown(true);
      return;
    }
    callbacks.set(el, setShown);
    io.observe(el);

    return () => {
      io.unobserve(el);
      callbacks.delete(el);
    };
  }, []);

  return { ref, shown };
}
