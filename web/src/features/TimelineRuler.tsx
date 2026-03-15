import { useRef } from "react";
import { useComposition } from "../context/CompositionContext.js";
import { useExecution } from "../context/ExecutionContext.js";
import { BEAT_WIDTH, KEYS_WIDTH } from "../lib/piano.js";

interface TimelineRulerProps {
  scrollRef: React.RefObject<HTMLDivElement | null>;
}

export function TimelineRuler({ scrollRef }: TimelineRulerProps) {
  const { totalBeats, gridSnap, timeSig } = useComposition();
  const {
    currentBeat,
    scrub: onScrub,
    breakpoints,
    toggleBreakpoint,
    isPausedAtBreakpoint,
  } = useExecution();

  const beatsPerMeasure = timeSig.num;

  const isScrubbing = useRef(false);

  function getBeatFromClient(clientX: number): number {
    const el = scrollRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left + el.scrollLeft;
    const raw = x / BEAT_WIDTH;
    return Math.max(0, Math.round(raw / gridSnap) * gridSnap);
  }

  function getRawBeatFromClient(clientX: number): number {
    const el = scrollRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left + el.scrollLeft;
    return Math.max(0, x / BEAT_WIDTH);
  }

  function handleContextMenu(e: React.MouseEvent<HTMLDivElement>) {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.clientX - rect.left < KEYS_WIDTH) return;
    toggleBreakpoint(getRawBeatFromClient(e.clientX));
  }

  function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.clientX - rect.left < KEYS_WIDTH) return;

    isScrubbing.current = true;
    onScrub(getBeatFromClient(e.clientX));

    function handleMove(ev: MouseEvent) {
      if (isScrubbing.current) onScrub(getBeatFromClient(ev.clientX));
    }
    function handleUp() {
      isScrubbing.current = false;
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    }
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
  }

  const totalWidth = totalBeats * BEAT_WIDTH;
  const marks: React.ReactNode[] = [];
  for (let b = 0; b <= totalBeats; b += beatsPerMeasure) {
    marks.push(
      <div
        key={`tick-${b}`}
        style={{
          position: "absolute",
          left: b * BEAT_WIDTH,
          top: 0,
          width: 1,
          height: "100%",
          background: "rgba(255,255,255,0.1)",
          pointerEvents: "none",
        }}
      />,
      <div
        key={`label-${b}`}
        style={{
          position: "absolute",
          left: b * BEAT_WIDTH + 3,
          bottom: 2,
          fontSize: 11,
          color: "var(--text-muted)",
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        {b}
      </div>,
    );
  }

  return (
    <div
      style={{
        display: "flex",
        height: 20,
        flexShrink: 0,
        background: "var(--bg)",
        borderBottom: "1px solid var(--border)",
        cursor: "col-resize",
        userSelect: "none",
      }}
      onMouseDown={handleMouseDown}
      onContextMenu={handleContextMenu}
    >
      <div
        style={{
          width: KEYS_WIDTH,
          flexShrink: 0,
          borderRight: "1px solid var(--border)",
        }}
      />
      <div
        ref={scrollRef}
        style={{ flex: 1, overflow: "hidden", position: "relative" }}
      >
        <div
          style={{ width: totalWidth, height: "100%", position: "relative" }}
        >
          {marks}
          {/* Breakpoint markers */}
          {[...breakpoints].map((b) => (
            <div
              key={`bp-${b}`}
              style={{
                position: "absolute",
                left: b * BEAT_WIDTH - 4,
                top: 2,
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#ef4444",
                pointerEvents: "none",
                zIndex: 5,
              }}
            />
          ))}
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: currentBeat * BEAT_WIDTH,
              width: 2,
              background: isPausedAtBreakpoint
                ? "#ef4444"
                : "rgba(255,255,255,0.9)",
              pointerEvents: "none",
              zIndex: 10,
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: -4,
                width: 0,
                height: 0,
                borderLeft: "5px solid transparent",
                borderRight: "5px solid transparent",
                borderTop: isPausedAtBreakpoint
                  ? "8px solid #ef4444"
                  : "8px solid rgba(255,255,255,0.9)",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
