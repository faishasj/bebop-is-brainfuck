import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAccessibility } from "../context/AccessibilityContext.js";
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
  } = useExecution();

  const beatsPerMeasure = timeSig.num;

  const { prefs } = useAccessibility();
  const isScrubbing = useRef(false);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  function getTooltipText(clientX: number, clientY: number): { text: string; x: number; y: number } | null {
    const el = scrollRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    // Don't show tooltip over the keys gutter
    if (clientX - rect.left < 0) return null;
    const raw = getRawBeatFromClient(clientX);
    const tolerance = 10 / BEAT_WIDTH;
    let nearestDist = Infinity;
    for (const bp of breakpoints) {
      const dist = Math.abs(bp - raw);
      if (dist < tolerance && dist < nearestDist) nearestDist = dist;
    }
    const onBreakpoint = nearestDist < tolerance && nearestDist !== Infinity;
    return {
      text: `Left-click to move playhead\n${onBreakpoint ? "Right-click to delete breakpoint" : "Right-click to add breakpoint"}`,
      x: clientX,
      y: clientY,
    };
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.clientX - rect.left < KEYS_WIDTH) {
      setTooltip(null);
      return;
    }
    const t = getTooltipText(e.clientX, e.clientY);
    setTooltip(t);
  }

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
    const clickedBeat = getRawBeatFromClient(e.clientX);
    // Snap to a nearby breakpoint if within tolerance (10px worth of beats)
    const tolerance = 10 / BEAT_WIDTH;
    let nearest: number | null = null;
    let nearestDist = Infinity;
    for (const bp of breakpoints) {
      const dist = Math.abs(bp - clickedBeat);
      if (dist < tolerance && dist < nearestDist) {
        nearest = bp;
        nearestDist = dist;
      }
    }
    toggleBreakpoint(nearest !== null ? nearest : clickedBeat);
  }

  function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
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
    <>
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
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setTooltip(null)}
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
                top: 0,
                bottom: 0,
                left: b * BEAT_WIDTH,
                width: 2,
                background: "#ef4444",
                pointerEvents: "none",
                zIndex: 5,
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
                  borderTop: "8px solid #ef4444",
                }}
              />
            </div>
          ))}
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: currentBeat * BEAT_WIDTH,
              width: 2,
              background: "rgba(255,255,255,0.9)",
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
                borderTop: "8px solid rgba(255,255,255,0.9)",
              }}
            />
          </div>
        </div>
      </div>
    </div>
    {prefs.hintLabels && tooltip !== null &&
      createPortal(
        <div
          className="ide-tooltip"
          style={{ position: "fixed", left: tooltip.x + 14, top: tooltip.y + 14, pointerEvents: "none", whiteSpace: "pre" }}
        >
          {tooltip.text}
        </div>,
        document.body,
      )}
    </>
  );
}
