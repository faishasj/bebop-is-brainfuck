import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface AccessibilityPrefs {
  highContrast: boolean;
  reduceMotion: boolean;
  dyslexiaFont: boolean;
  hintLabels: boolean;
}

interface AccessibilityContextValue {
  prefs: AccessibilityPrefs;
  toggle: (key: keyof AccessibilityPrefs) => void;
}

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

const STORAGE_KEY = "b2-a11y-prefs";

const DATA_ATTRS: Record<keyof AccessibilityPrefs, string> = {
  highContrast: "data-high-contrast",
  reduceMotion: "data-reduce-motion",
  dyslexiaFont: "data-dyslexia-font",
  hintLabels: "data-hint-labels",
};

function loadPrefs(): AccessibilityPrefs {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const defaults: AccessibilityPrefs = {
    highContrast: false,
    reduceMotion: prefersReducedMotion,
    dyslexiaFont: false,
    hintLabels: false,
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...defaults, ...parsed };
    }
  } catch { /* ignore */ }

  return defaults;
}

function applyDataAttrs(prefs: AccessibilityPrefs) {
  const root = document.documentElement;
  for (const [key, attr] of Object.entries(DATA_ATTRS)) {
    if (prefs[key as keyof AccessibilityPrefs]) {
      root.setAttribute(attr, "true");
    } else {
      root.removeAttribute(attr);
    }
  }
}

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<AccessibilityPrefs>(loadPrefs);

  useEffect(() => {
    applyDataAttrs(prefs);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  }, [prefs]);

  function toggle(key: keyof AccessibilityPrefs) {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <AccessibilityContext.Provider value={{ prefs, toggle }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility(): AccessibilityContextValue {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error("useAccessibility must be used within AccessibilityProvider");
  return ctx;
}
