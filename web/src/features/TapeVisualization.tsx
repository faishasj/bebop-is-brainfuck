import { useCallback, useEffect, useRef, useState } from "react";
import { type TapeSnapshot } from "../context/ExecutionContext.js";

const CELL_WIDTH = 30; // px, matches .tape-cell width
const CELL_GAP = 2; // px, matches .tape-strip gap
const CELL_BORDER = 2; // 1px border each side
const CELL_SLOT = CELL_WIDTH + CELL_BORDER + CELL_GAP;
const TAPE_SIZE = 30_000;
const MIN_CELLS = 4;
const FALLBACK_CELLS = 32;
const DRAG_THRESHOLD = 4;

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
  const [isFollowing, setIsFollowing] = useState(true);
  const [userViewStart, setUserViewStart] = useState(0);
  const [gotoValue, setGotoValue] = useState("");
  const [isDraggingCursor, setIsDraggingCursor] = useState(false);

  // ── Stable refs for use in passive/document event closures ─────────────────
  const viewStartRef = useRef(0);
  const navigateRef = useRef((_n: number) => {});

  // ── Resize observer for visible cell count ──────────────────────────────────
  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      setVisibleCells(Math.max(MIN_CELLS, Math.floor((w + CELL_GAP) / CELL_SLOT)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Reset to following when execution resets ────────────────────────────────
  useEffect(() => {
    if (snapshot === null) setIsFollowing(true);
  }, [snapshot]);

  const dp = snapshot?.dp ?? 0;

  // Derive viewStart: auto-follow dp or use user's manual position (wraps around)
  const viewStart = isFollowing
    ? ((dp - Math.floor(visibleCells / 2)) % TAPE_SIZE + TAPE_SIZE) % TAPE_SIZE
    : userViewStart;

  // ── Navigation ──────────────────────────────────────────────────────────────
  const navigate = useCallback(
    (newStart: number) => {
      setUserViewStart(((newStart % TAPE_SIZE) + TAPE_SIZE) % TAPE_SIZE);
      setIsFollowing(false);
    },
    [],
  );

  // Keep refs in sync so passive/document closures always have current values
  viewStartRef.current = viewStart;
  navigateRef.current = navigate;

  // ── Wheel: passive:false listener so preventDefault works ───────────────────
  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const raw = e.deltaX !== 0 ? e.deltaX : e.deltaY;
      const cellDelta = Math.round(raw / CELL_SLOT) || Math.sign(raw);
      navigateRef.current(viewStartRef.current + cellDelta);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // ── Drag-to-pan ─────────────────────────────────────────────────────────────
  function handleStripMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return;
    const startX = e.clientX;
    const startViewStart = viewStartRef.current;
    let dragging = false;

    function handleMouseMove(ev: MouseEvent) {
      const dx = ev.clientX - startX;
      if (!dragging && Math.abs(dx) > DRAG_THRESHOLD) {
        dragging = true;
        setIsDraggingCursor(true);
      }
      if (dragging) {
        const cellDelta = -Math.round(dx / CELL_SLOT);
        navigateRef.current(startViewStart + cellDelta);
      }
    }

    function handleMouseUp() {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      setIsDraggingCursor(false);
    }

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }

  // ── Jump to cell ─────────────────────────────────────────────────────────────
  function handleGotoSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = parseInt(gotoValue, 10);
    if (!isNaN(n) && n >= 0 && n < TAPE_SIZE) {
      navigate(Math.max(0, n - Math.floor(visibleCells / 2)));
    }
  }

  // ── Cell value lookup (null = outside captured snapshot window) ─────────────
  function getCellValue(absIdx: number): number | null {
    if (!snapshot) return null;
    const { windowStart, cells } = snapshot;
    const offset = absIdx - windowStart;
    if (offset >= 0 && offset < cells.length) return cells[offset];
    return null;
  }

  return (
    <div className="tape">
      <div className="tape-header">
        <h2 className="tape-heading">Memory</h2>
        <span className="tape-pointer">ptr: {dp}</span>
        <form className="tape-goto" onSubmit={handleGotoSubmit}>
          <label className="sr-only" htmlFor="tape-goto-input">Jump to cell</label>
          <input
            id="tape-goto-input"
            className="tape-goto-input"
            type="text"
            inputMode="numeric"
            placeholder="cell #"
            value={gotoValue}
            onChange={(e) => setGotoValue(e.target.value)}
          />
          <button type="submit" className="tape-goto-btn">go</button>
        </form>
        {!isFollowing && (
          <button
            className="tape-follow-btn"
            onClick={() => setIsFollowing(true)}
            aria-label="Follow data pointer"
          >
            follow ptr
          </button>
        )}
        <div className="tape-fmt" role="group" aria-label="Display format">
          {FORMATS.map((f) => (
            <button
              key={f}
              className={`tape-fmt-btn${f === fmt ? " tape-fmt-btn--active" : ""}`}
              onClick={() => setFmt(f)}
              aria-pressed={f === fmt}
              aria-label={`Display as ${f === "dec" ? "decimal" : f === "hex" ? "hexadecimal" : "ASCII"}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      <div
        className="tape-strip"
        ref={stripRef}
        onMouseDown={handleStripMouseDown}
        style={{ cursor: isDraggingCursor ? "grabbing" : "grab" }}
      >
        {Array.from({ length: visibleCells }, (_, i) => {
          const absIdx = (viewStart + i) % TAPE_SIZE;
          const value = getCellValue(absIdx);
          const isActive = absIdx === dp;
          const isKnown = value !== null;
          return (
            <div
              key={absIdx}
              className={`tape-cell${isActive ? " tape-cell--active" : ""}${isKnown && value === 0 ? " tape-cell--zero" : ""}${!isKnown ? " tape-cell--unknown" : ""}`}
            >
              <span className="tape-cell-value">
                {isKnown ? formatValue(value, fmt) : "—"}
              </span>
              <span className="tape-cell-index">{absIdx}</span>
            </div>
          );
        })}
      </div>
      {/* Screen reader announcement for data pointer movement */}
      <div className="sr-only" aria-live="polite">
        {snapshot ? `Cell ${dp}: value ${snapshot.cells[dp - snapshot.windowStart] ?? 0}` : ""}
      </div>
    </div>
  );
}
