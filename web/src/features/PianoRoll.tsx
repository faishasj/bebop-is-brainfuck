import { useState, useRef, useEffect } from "react";
import { CustomSelect } from "../ui-kit/CustomSelect.js";
import { useComposition } from "../context/CompositionContext.js";
import { useTracks } from "../context/TracksContext.js";
import { TimelineRuler } from "./TimelineRuler.js";
import { PianoKeysSidebar } from "./PianoKeysSidebar.js";
import { NoteGrid } from "./NoteGrid.js";
import { AutomationLanes } from "./AutomationLanes.js";
import {
  ROW_HEIGHT,
  MAX_NOTE,
  COMMAND_COLORS,
  COMMAND_TOOLTIPS,
  IGNORED_NOTE_COLOR,
  GRID_SNAP_OPTIONS,
} from "../lib/piano.js";
import { Icon } from "../ui-kit/Icon.js";

export function PianoRoll() {
  const {
    rollRootNote: rootNote,
    gridSnap,
    setGridSnap: onGridSnapChange,
  } = useComposition();

  const {
    editingNotes: notes,
    isEditingProgram,
    editingTrackIndex,
    canUndo,
    canRedo,
    undoLabel,
    redoLabel,
    undo,
    redo,
  } = useTracks();

  const keySidebarScrollRef = useRef<HTMLDivElement | null>(null);
  const gridScrollRef = useRef<HTMLDivElement | null>(null);
  const rulerScrollRef = useRef<HTMLDivElement | null>(null);

  const [editorMode, setEditorMode] = useState<"add" | "delete">("add");
  const [showLanes, setShowLanes] = useState(false);

  // Hotkeys: A = add mode, D = delete mode
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tgt = e.target as HTMLElement | null;
      if (
        tgt &&
        (tgt.tagName === "INPUT" ||
          tgt.tagName === "TEXTAREA" ||
          tgt.isContentEditable)
      ) {
        return;
      }
      if (e.key === "a" || e.key === "A") setEditorMode("add");
      if (e.key === "d" || e.key === "D") setEditorMode("delete");
      const mod = e.metaKey || e.ctrlKey;
      if (mod && !e.shiftKey && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        undo();
      }
      if (mod && e.shiftKey && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        redo();
      }
      if (e.ctrlKey && !e.shiftKey && (e.key === "y" || e.key === "Y")) {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Auto-scroll to center root note on mount and rootNote changes
  useEffect(() => {
    const el = gridScrollRef.current;
    if (!el) return;
    const targetScrollTop =
      (MAX_NOTE - rootNote) * ROW_HEIGHT - el.clientHeight / 2 + ROW_HEIGHT / 2;
    el.scrollTop = Math.max(0, targetScrollTop);
    if (keySidebarScrollRef.current) {
      keySidebarScrollRef.current.scrollTop = el.scrollTop;
    }
  }, [rootNote]);

  return (
    <div className="panel piano-roll-panel">
      {/* Command legend */}
      <div
        className="command-legend"
        style={{ opacity: isEditingProgram ? 1 : 0.35 }}
      >
        {Object.entries(COMMAND_COLORS).map(([cmd, color]) => (
          <span
            key={cmd}
            className="legend-item"
            style={{ color }}
            title={COMMAND_TOOLTIPS[cmd]}
          >
            <span className="legend-dot" style={{ background: color }} />
            <code>{cmd}</code>
          </span>
        ))}
        <span className="legend-item" style={{ color: "var(--accent2)" }}>
          <span
            className="legend-dot"
            style={{ background: "var(--accent2)" }}
          />
          root
        </span>
        <span className="legend-item" style={{ color: IGNORED_NOTE_COLOR }}>
          <span
            className="legend-dot"
            style={{ background: IGNORED_NOTE_COLOR }}
          />
          ignored
        </span>
        <span
          className="legend-item"
          style={{ color: "var(--text-muted)", opacity: 0.5 }}
        >
          <span
            className="legend-dot"
            style={{ background: "var(--text-muted)" }}
          />
          other tracks
        </span>
      </div>

      {/* Non-program track banner */}
      {!isEditingProgram && (
        <div
          style={{
            padding: "4px 8px",
            marginBottom: 4,
            fontSize: 11,
            color: "var(--text-muted)",
            borderLeft: "2px solid #f59e0b",
            background: "rgba(245,158,11,0.06)",
            borderRadius: "0 3px 3px 0",
            flexShrink: 0,
          }}
        >
          Editing track {editingTrackIndex} — notes do not affect Brainfuck
          output
        </div>
      )}

      {/* Timeline ruler with playhead scrubbing */}
      <TimelineRuler scrollRef={rulerScrollRef} />

      {/* Grid + automation lanes + floating toolbar wrapper */}
      <div
        style={{
          position: "relative",
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          border: "1px solid var(--border)",
          borderRadius: "0 0 6px 6px",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
          <PianoKeysSidebar scrollRef={keySidebarScrollRef} />
          <NoteGrid
            editorMode={editorMode}
            gridScrollRef={gridScrollRef}
            rulerScrollRef={rulerScrollRef}
            keySidebarScrollRef={keySidebarScrollRef}
          />
        </div>
        {showLanes && <AutomationLanes scrollRef={gridScrollRef} />}

        {/* Floating editor toolbar */}
        <div className="pr-toolbar">
          <button
            className="pr-toolbar-btn"
            onClick={undo}
            disabled={!canUndo}
            title={canUndo ? `Undo ${undoLabel}` : "Nothing to undo"}
          >
            <div className="pr-toolbar-btn-label">
              <Icon name="undo" />
              Undo
            </div>
            <kbd className="pr-toolbar-kbd">⌘Z</kbd>
          </button>
          <button
            className="pr-toolbar-btn"
            onClick={redo}
            disabled={!canRedo}
            title={canRedo ? `Redo ${redoLabel}` : "Nothing to redo"}
          >
            <div className="pr-toolbar-btn-label">
              <Icon name="redo" />
              Redo
            </div>
            <kbd className="pr-toolbar-kbd">⌘⇧Z</kbd>
          </button>
          <div className="pr-toolbar-divider" />
          <button
            className={`pr-toolbar-btn${editorMode === "add" ? " pr-toolbar-btn--active" : ""}`}
            onClick={() => setEditorMode("add")}
            title="Add mode: click to place or preview notes"
          >
            <div className="pr-toolbar-btn-label">
              <Icon name="pencil" />
              Add
            </div>
            <kbd className="pr-toolbar-kbd">A</kbd>
          </button>
          <button
            className={`pr-toolbar-btn${editorMode === "delete" ? " pr-toolbar-btn--active" : ""}`}
            onClick={() => setEditorMode("delete")}
            title="Delete mode: click to remove notes"
          >
            <div className="pr-toolbar-btn-label">
              <Icon name="trash" />
              Delete
            </div>
            <kbd className="pr-toolbar-kbd">D</kbd>
          </button>
          <div className="pr-toolbar-divider" />
          <button
            className={`pr-toolbar-btn${showLanes ? " pr-toolbar-btn--active" : ""}`}
            onClick={() => setShowLanes((v) => !v)}
            title={showLanes ? "Hide automation lanes" : "Show automation lanes"}
          >
            <div className="pr-toolbar-btn-label">
              <Icon name="bars" />
              Lanes
            </div>
          </button>
          <div className="pr-toolbar-divider" />
          <label className="pr-toolbar-snap-label">Snap</label>
          <CustomSelect
            value={gridSnap}
            options={GRID_SNAP_OPTIONS}
            onChange={onGridSnapChange}
            size="sm"
            menuStyle={{ right: 0, left: "auto" }}
          />
        </div>
      </div>

      {notes.length === 0 && (
        <p className="placeholder" style={{ marginTop: 8 }}>
          {isEditingProgram
            ? "Click on the grid to add notes. Beat 0 is reserved for the root note."
            : "Click on the grid to add notes."}
        </p>
      )}
    </div>
  );
}
