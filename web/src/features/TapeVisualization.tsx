import { useEffect, useRef, useState } from "react";
import { type TapeSnapshot } from "../context/ExecutionContext.js";

const CELL_WIDTH = 30; // px, matches .tape-cell width
const CELL_GAP = 2; // px, matches .tape-strip gap
const CELL_BORDER = 2; // 1px border each side
const CELL_SLOT = CELL_WIDTH + CELL_BORDER + CELL_GAP;
const MIN_CELLS = 4;
const FALLBACK_CELLS = 32;

type DisplayFormat = "dec" | "hex" | "ascii";
const FORMATS: DisplayFormat[] = ["dec", "hex", "ascii"];

function formatValue(value: number, fmt: DisplayFormat): string {
  switch (fmt) {
    case "hex":
      return value.toString(16).toUpperCase().padStart(2, "0");
    case "ascii":
      return value >= 32 && value <= 126 ? String.fromCharCode(value) : "·";
    default:
      return String(value);
  }
}

export function TapeVisualization({
  snapshot,
}: {
  snapshot: TapeSnapshot | null;
}) {
  const [fmt, setFmt] = useState<DisplayFormat>("dec");
  const stripRef = useRef<HTMLDivElement>(null);
  const [visibleCells, setVisibleCells] = useState(FALLBACK_CELLS);

  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      setVisibleCells(
        Math.max(MIN_CELLS, Math.floor((w + CELL_GAP) / CELL_SLOT)),
      );
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const emptyCells = new Uint8Array(visibleCells);

  const dp = snapshot?.dp ?? 0;
  const windowStart = snapshot?.windowStart ?? 0;
  const cells = snapshot?.cells ?? emptyCells;
  const dpOffset = dp - windowStart;

  const half = Math.floor(visibleCells / 2);
  let visStart = Math.max(0, dpOffset - half);
  if (visStart + visibleCells > cells.length) {
    visStart = Math.max(0, cells.length - visibleCells);
  }
  const visEnd = Math.min(cells.length, visStart + visibleCells);

  return (
    <div className="tape">
      <div className="tape-header">
        <h2 className="tape-heading">Memory</h2>
        <span className="tape-pointer">ptr: {dp}</span>
        <div className="tape-fmt">
          {FORMATS.map((f) => (
            <button
              key={f}
              className={`tape-fmt-btn${f === fmt ? " tape-fmt-btn--active" : ""}`}
              onClick={() => setFmt(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="tape-strip" ref={stripRef}>
        {Array.from({ length: visEnd - visStart }, (_, i) => {
          const cellIdx = visStart + i;
          const tapeIdx = windowStart + cellIdx;
          const value = cells[cellIdx];
          const isActive = tapeIdx === dp;
          return (
            <div
              key={tapeIdx}
              className={`tape-cell${isActive ? " tape-cell--active" : ""}${value === 0 ? " tape-cell--zero" : ""}`}
            >
              <span className="tape-cell-value">{formatValue(value, fmt)}</span>
              <span className="tape-cell-index">{tapeIdx}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
