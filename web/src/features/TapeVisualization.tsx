import { useState } from "react";
import { type TapeSnapshot } from "../context/ExecutionContext.js";

const VISIBLE_CELLS = 30;
const EMPTY_CELLS = new Uint8Array(VISIBLE_CELLS);

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

  const dp = snapshot?.dp ?? 0;
  const windowStart = snapshot?.windowStart ?? 0;
  const cells = snapshot?.cells ?? EMPTY_CELLS;
  const dpOffset = dp - windowStart;

  const half = Math.floor(VISIBLE_CELLS / 2);
  let visStart = Math.max(0, dpOffset - half);
  if (visStart + VISIBLE_CELLS > cells.length) {
    visStart = Math.max(0, cells.length - VISIBLE_CELLS);
  }
  const visEnd = Math.min(cells.length, visStart + VISIBLE_CELLS);

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
      <div className="tape-strip">
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
