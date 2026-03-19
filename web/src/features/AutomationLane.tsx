import { useRef, useEffect, useState } from "react";
import { type CCEvent, type LaneMeta } from "../lib/automationTypes.js";
import { type BeatNote } from "../lib/player.js";
import {
  BEAT_WIDTH,
  LANE_HEIGHT,
  VELOCITY_LANE_BAR_WIDTH,
  KEYS_WIDTH,
} from "../lib/piano.js";
import { useComposition } from "../context/CompositionContext.js";

interface AutomationLaneProps {
  meta: LaneMeta;
  notes: (BeatNote & { id: string })[]; // all editing notes — used by velocity lane
  ccEvents: CCEvent[]; // used by CC lanes
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onVelocityChange: (noteId: string, velocity: number, commit: boolean) => void;
  onCCChange: (events: CCEvent[], label: string, commit: boolean) => void;
}

const BAR_WIDTH = VELOCITY_LANE_BAR_WIDTH;
const BAR_INNER_HEIGHT = LANE_HEIGHT - 8; // 4px padding top and bottom

export function AutomationLane({
  meta,
  notes,
  ccEvents,
  scrollRef,
  onVelocityChange,
  onCCChange,
}: AutomationLaneProps) {
  const { totalBeats, gridSnap } = useComposition();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // ── Drag state ─────────────────────────────────────────────────────────────
  // Use refs to avoid re-creating window listeners on every draft value change.
  const dragRef = useRef<{
    type: "velocity" | "cc";
    id: string;
    startY: number;
    startValue: number;
  } | null>(null);
  const draftRef = useRef<{ id: string; value: number } | null>(null);
  const tooltipPosRef = useRef({ x: 0, y: 0 });
  // Tracks a newly created CC event being dragged before its first commit.
  const pendingNewEventRef = useRef<CCEvent | null>(null);
  const ccEventsRef = useRef(ccEvents);
  ccEventsRef.current = ccEvents;
  const notesRef = useRef(notes);
  notesRef.current = notes;
  const [, forceUpdate] = useState(0);
  const [hoverTooltip, setHoverTooltip] = useState<{
    value: number;
    x: number;
    y: number;
  } | null>(null);

  // ── Scroll sync ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const grid = scrollRef.current;
    const container = containerRef.current;
    if (!grid || !container) return;
    function onScroll() {
      container!.scrollLeft = grid!.scrollLeft;
    }
    // Sync immediately on mount
    container.scrollLeft = grid.scrollLeft;
    grid.addEventListener("scroll", onScroll, { passive: true });
    return () => grid.removeEventListener("scroll", onScroll);
  }, [scrollRef]);

  // ── Global mouse handlers for drag ─────────────────────────────────────────
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragRef.current) return;
      const { startY, startValue } = dragRef.current;
      const delta = startY - e.clientY; // up = positive = higher value
      const range = meta.max - meta.min;
      const newValue = Math.min(
        meta.max,
        Math.max(
          meta.min,
          Math.round(startValue + (delta * range) / BAR_INNER_HEIGHT),
        ),
      );
      draftRef.current = { id: dragRef.current.id, value: newValue };
      tooltipPosRef.current = { x: e.clientX, y: e.clientY };
      forceUpdate((v) => v + 1);
    }

    function onMouseUp() {
      if (!dragRef.current) return;
      const id = dragRef.current.id;
      const finalValue =
        draftRef.current?.id === id
          ? draftRef.current.value
          : dragRef.current.startValue;

      if (dragRef.current.type === "velocity") {
        onVelocityChange(id, finalValue, true);
      } else {
        const pending = pendingNewEventRef.current;
        if (pending !== null && pending.id === id) {
          // Commit the newly created event
          const newEvt: CCEvent = { ...pending, value: finalValue };
          const updated = [...ccEventsRef.current, newEvt].sort(
            (a, b) => a.beat - b.beat,
          );
          onCCChange(updated, `add ${meta.label}`, true);
          pendingNewEventRef.current = null;
        } else {
          // Update an existing event
          const updated = ccEventsRef.current.map((e) =>
            e.id === id ? { ...e, value: finalValue } : e,
          );
          onCCChange(updated, meta.label, true);
        }
      }

      draftRef.current = null;
      dragRef.current = null;
      forceUpdate((v) => v + 1);
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [meta, onVelocityChange, onCCChange]);

  // ── Coordinate helpers ─────────────────────────────────────────────────────
  function computeValueFromY(y: number): number {
    const relY = Math.max(0, Math.min(1, y / LANE_HEIGHT));
    return Math.round((1 - relY) * (meta.max - meta.min) + meta.min);
  }

  function getBarGeometry(value: number): { top: number; height: number } {
    if (meta.type === "pitchbend") {
      const center = LANE_HEIGHT / 2;
      const half = center - 4;
      const barH = Math.max(1, (Math.abs(value) / 8191) * half);
      return value >= 0
        ? { top: center - barH, height: barH }
        : { top: center, height: barH };
    }
    const barH = Math.max(2, (value / meta.max) * BAR_INNER_HEIGHT);
    return { top: LANE_HEIGHT - barH - 4, height: barH };
  }

  // ── Mouse down on a bar (velocity or CC) ───────────────────────────────────
  function handleBarMouseDown(
    e: React.MouseEvent,
    id: string,
    currentValue: number,
    type: "velocity" | "cc",
  ) {
    e.preventDefault();
    e.stopPropagation();
    setHoverTooltip(null);
    tooltipPosRef.current = { x: e.clientX, y: e.clientY };
    dragRef.current = { type, id, startY: e.clientY, startValue: currentValue };
    draftRef.current = { id, value: currentValue };
    forceUpdate((v) => v + 1);
  }

  // ── Hover tooltip handlers ──────────────────────────────────────────────────
  function handleBarHover(e: React.MouseEvent, val: number) {
    if (dragRef.current) return;
    setHoverTooltip({ value: val, x: e.clientX, y: e.clientY });
  }

  function handleBarHoverEnd() {
    if (dragRef.current) return;
    setHoverTooltip(null);
  }

  // ── Mouse down on canvas background (CC lanes only: create new event) ──────
  function handleCanvasMouseDown(e: React.MouseEvent) {
    if (meta.type === "velocity") return;
    if (e.button !== 0) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // Use the container's rect (stable viewport position) + scrollLeft to map
    // clientX into canvas-space. canvas.getBoundingClientRect().left already
    // reflects the scroll shift, so adding scrollLeft again would double-count.
    const containerRect = container.getBoundingClientRect();
    const x = e.clientX - containerRect.left + container.scrollLeft;
    const y = e.clientY - containerRect.top;
    const rawBeat = x / BEAT_WIDTH;
    const snappedBeat = Math.max(0, Math.round(rawBeat / gridSnap) * gridSnap);
    const value = computeValueFromY(y);

    const newEvt: CCEvent = {
      id: crypto.randomUUID(),
      beat: snappedBeat,
      value,
    };
    pendingNewEventRef.current = newEvt;
    tooltipPosRef.current = { x: e.clientX, y: e.clientY };
    dragRef.current = {
      type: "cc",
      id: newEvt.id,
      startY: e.clientY,
      startValue: value,
    };
    draftRef.current = { id: newEvt.id, value };
    forceUpdate((v) => v + 1);
  }

  // ── Right-click on a CC bar: delete ────────────────────────────────────────
  function handleBarContextMenu(e: React.MouseEvent, id: string) {
    e.preventDefault();
    const updated = ccEventsRef.current.filter((ev) => ev.id !== id);
    onCCChange(updated, `delete ${meta.label}`, true);
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const canvasWidth = totalBeats * BEAT_WIDTH;
  const draft = draftRef.current;
  const pendingNew = pendingNewEventRef.current;
  const velocityBars =
    meta.type === "velocity"
      ? notes.map((note) => {
          const velocity = draft?.id === note.id ? draft.value : note.velocity;
          const { top, height } = getBarGeometry(velocity);
          const x = note.beatStart * BEAT_WIDTH - BAR_WIDTH / 2;
          const isActive = draft?.id === note.id;
          return (
            <div
              key={note.id}
              className={`auto-lane__bar${isActive ? " auto-lane__bar--active" : ""}`}
              style={{
                left: x,
                width: BAR_WIDTH,
                top,
                height,
                background: meta.color,
              }}
              onMouseDown={(e) =>
                handleBarMouseDown(e, note.id, velocity, "velocity")
              }
              onMouseEnter={(e) => handleBarHover(e, velocity)}
              onMouseMove={(e) => handleBarHover(e, velocity)}
              onMouseLeave={handleBarHoverEnd}
            />
          );
        })
      : null;

  // CC bars (existing events + pending new event)
  const allDisplayEvents: CCEvent[] =
    meta.type !== "velocity"
      ? [...ccEvents, ...(pendingNew !== null ? [pendingNew] : [])]
      : [];

  const ccBars =
    meta.type !== "velocity"
      ? allDisplayEvents.map((ev) => {
          const value = draft?.id === ev.id ? draft.value : ev.value;
          const { top, height } = getBarGeometry(value);
          const x = ev.beat * BEAT_WIDTH - BAR_WIDTH / 2;
          const isActive = draft?.id === ev.id;
          const isPending = pendingNew?.id === ev.id;
          return (
            <div
              key={ev.id}
              className={`auto-lane__bar${isActive ? " auto-lane__bar--active" : ""}${isPending ? " auto-lane__bar--ghost" : ""}`}
              style={{
                left: x,
                width: BAR_WIDTH,
                top,
                height,
                background: meta.color,
              }}
              onMouseDown={(e) => handleBarMouseDown(e, ev.id, value, "cc")}
              onMouseEnter={(e) => handleBarHover(e, value)}
              onMouseMove={(e) => handleBarHover(e, value)}
              onMouseLeave={handleBarHoverEnd}
              onContextMenu={(e) =>
                !isPending && handleBarContextMenu(e, ev.id)
              }
            />
          );
        })
      : null;

  return (
    <>
      <div className="auto-lane">
        <div className="auto-lane__header" style={{ width: KEYS_WIDTH }}>
          <span className="auto-lane__label">{meta.label}</span>
        </div>
        <div className="auto-lane__canvas-wrapper" ref={containerRef}>
          <div
            className="auto-lane__canvas"
            ref={canvasRef}
            style={{ width: canvasWidth }}
            onMouseDown={handleCanvasMouseDown}
          >
            {meta.type === "pitchbend" && (
              <div className="auto-lane__center-line" />
            )}
            {velocityBars}
            {ccBars}
          </div>
        </div>
      </div>
      {(draft !== null || hoverTooltip !== null) &&
        (() => {
          const tip =
            draft !== null
              ? {
                  value: draft.value,
                  x: tooltipPosRef.current.x,
                  y: tooltipPosRef.current.y,
                }
              : hoverTooltip!;
          return (
            <div
              className="ide-tooltip"
              style={{ left: tip.x + 14, top: tip.y - 32 }}
            >
              {meta.label}: {tip.value}
            </div>
          );
        })()}
    </>
  );
}
