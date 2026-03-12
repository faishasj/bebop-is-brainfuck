import { createContext, useContext, useState } from "react";
import { type Scale } from "../lib/scales.js";

interface CompositionContextValue {
  scale: Scale;
  setScale: (s: Scale) => void;
  bpm: number;
  setBpm: (n: number) => void;
  timeSig: { num: number; den: number };
  setTimeSig: (ts: { num: number; den: number }) => void;
  rollRootNote: number;
  setRollRootNote: (n: number) => void;
  totalBeats: number;
  setTotalBeats: (n: number) => void;
  gridSnap: number;
  setGridSnap: (n: number) => void;
}

const CompositionContext = createContext<CompositionContextValue | null>(null);

export function CompositionProvider({ children }: { children: React.ReactNode }) {
  const [scale, setScale] = useState<Scale>("MAJOR");
  const [bpm, setBpm] = useState(120);
  const [timeSig, setTimeSig] = useState({ num: 4, den: 4 });
  const [rollRootNote, setRollRootNote] = useState(60); // C4
  const [totalBeats, setTotalBeats] = useState(16);
  const [gridSnap, setGridSnap] = useState(0.5);

  const value: CompositionContextValue = {
    scale, setScale,
    bpm, setBpm,
    timeSig, setTimeSig,
    rollRootNote, setRollRootNote,
    totalBeats, setTotalBeats,
    gridSnap, setGridSnap,
  };

  return (
    <CompositionContext.Provider value={value}>
      {children}
    </CompositionContext.Provider>
  );
}

export function useComposition() {
  const ctx = useContext(CompositionContext);
  if (!ctx) throw new Error("useComposition must be used within CompositionProvider");
  return ctx;
}
