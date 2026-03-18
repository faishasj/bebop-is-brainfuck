import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { type BeatNote, DEFAULT_INSTRUMENT, playNote } from "../lib/player.js";
import { useComposition } from "../context/CompositionContext.js";
import { useTracks } from "../context/TracksContext.js";
import { useExecution } from "../context/ExecutionContext.js";
import { useClickOutside } from "../hooks/useClickOutside.js";
import {
  BEAT_WIDTH,
  ROW_HEIGHT,
  MIN_NOTE,
  MAX_NOTE,
  DRAG_THRESHOLD,
  IGNORED_NOTE_COLOR,
  COMMAND_COLORS,
  getNoteCommand,
} from "../lib/piano.js";

type NoteWithId = BeatNote & { id: string };

interface GhostNote {
  noteNumber: number;
  beatStart: number;
  durationBeats: number;
}

interface DragMoveState {
  noteIds: Set<string>;
  originalNotes: NoteWithId[];
  previewOffsetBeats: number;
  previewOffsetRows: number;
}

interface DragResizeState {
  noteId: string;
  originalNote: NoteWithId;
  edge: "left" | "right";
  previewBeatStart: number;
  previewDuration: number;
}

interface NoteGridProps {
  editorMode: "add" | "delete";
  gridScrollRef: React.RefObject<HTMLDivElement | null>;
  rulerScrollRef: React.RefObject<HTMLDivElement | null>;
  keySidebarScrollRef: React.RefObject<HTMLDivElement | null>;
}

export function NoteGrid({
  editorMode,
  gridScrollRef,
  rulerScrollRef,
  keySidebarScrollRef,
}: NoteGridProps) {
  const {
    rollRootNote: rootNote,
    rootNoteDuration,
    setRootNoteDuration,
    scale,
    totalBeats,
    timeSig,
    gridSnap,
    bpm,
  } = useComposition();
  const beatsPerMeasure = timeSig.num;
  const {
    editingNotes: notes,
    otherTracksNotes: otherNotes,
    isEditingProgram,
    editingTrackIndex,
    clipboard,
    setClipboard: onCopyNotes,
    updateNotesWithHistory,
    tracks,
  } = useTracks();

  const { isPlaying, currentBeat } = useExecution();

  const instrument =
    tracks.find((t) => t.id === editingTrackIndex)?.instrument ??
    DEFAULT_INSTRUMENT;

  function onPlayNote(noteNumber: number, durationBeats: number) {
    playNote(noteNumber, durationBeats, bpm, instrument);
  }

  function onNotesChange(updated: BeatNote[], label: string) {
    updateNotesWithHistory(editingTrackIndex, updated, label);
  }

  // ── Note manipulation ──────────────────────────────────────────────────────

  function addNote(partial: Omit<BeatNote, "id">) {
    const overlaps = notes.some(
      (n) =>
        n.noteNumber === partial.noteNumber &&
        n.beatStart < partial.beatStart + partial.durationBeats &&
        n.beatStart + n.durationBeats > partial.beatStart,
    );
    if (overlaps) return;
    const id = crypto.randomUUID();
    onNotesChange([...notes, { ...partial, id } as NoteWithId], "add note");
    onPlayNote(partial.noteNumber, partial.durationBeats);
  }

  function removeNote(id: string) {
    onNotesChange(
      (notes as NoteWithId[]).filter((n) => n.id !== id),
      "delete note",
    );
  }

  function removeNotes(ids: string[]) {
    const idSet = new Set(ids);
    onNotesChange(
      (notes as NoteWithId[]).filter((n) => !idSet.has(n.id)),
      "delete notes",
    );
  }

  function resizeNote(id: string, beatStart: number, durationBeats: number) {
    const orig = (notes as NoteWithId[]).find((n) => n.id === id);
    if (!orig) return;
    const others = (notes as NoteWithId[]).filter((n) => n.id !== id);
    const overlaps = others.some(
      (n) =>
        n.noteNumber === orig.noteNumber &&
        n.beatStart < beatStart + durationBeats &&
        n.beatStart + n.durationBeats > beatStart,
    );
    if (overlaps) return;
    onNotesChange(
      (notes as NoteWithId[]).map((n) =>
        n.id === id ? { ...n, beatStart, durationBeats } : n,
      ),
      "resize note",
    );
  }

  function updateNotes(
    updates: Array<{ id: string; beatStart: number; noteNumber: number }>,
  ) {
    const updateIds = new Set(updates.map((u) => u.id));
    const nonMoving = (notes as NoteWithId[]).filter(
      (n) => !updateIds.has(n.id),
    );
    for (const upd of updates) {
      const orig = (notes as NoteWithId[]).find((n) => n.id === upd.id);
      if (!orig) continue;
      const updated = { ...orig, ...upd };
      const overlaps = nonMoving.some(
        (n) =>
          n.noteNumber === updated.noteNumber &&
          n.beatStart < updated.beatStart + updated.durationBeats &&
          n.beatStart + n.durationBeats > updated.beatStart,
      );
      if (overlaps) return;
    }
    const updateMap = new Map(updates.map((u) => [u.id, u]));
    onNotesChange(
      (notes as NoteWithId[]).map((n) => {
        const upd = updateMap.get(n.id);
        return upd ? { ...n, ...upd } : n;
      }),
      "move notes",
    );
  }

  function pasteNotes(
    clipboardNotes: Array<Omit<BeatNote, "id">>,
    anchor?: { beat: number; noteNumber: number },
  ) {
    let newNotes: NoteWithId[];
    if (anchor) {
      const maxNote = Math.max(...clipboardNotes.map((n) => n.noteNumber));
      const noteShift = anchor.noteNumber - maxNote;
      newNotes = clipboardNotes.map((n) => ({
        ...n,
        beatStart: n.beatStart + anchor.beat,
        noteNumber: n.noteNumber + noteShift,
        id: crypto.randomUUID(),
      }));
    } else {
      const maxOccupied = (notes as NoteWithId[]).reduce(
        (m, n) => Math.max(m, n.beatStart + n.durationBeats),
        0,
      );
      const baseInsert = isEditingProgram
        ? Math.max(gridSnap, maxOccupied)
        : Math.max(0, maxOccupied);
      newNotes = clipboardNotes.map((n) => ({
        ...n,
        beatStart: n.beatStart + baseInsert,
        id: crypto.randomUUID(),
      }));
    }
    const toAdd = newNotes.filter(
      (nn) =>
        !(notes as NoteWithId[]).some(
          (n) =>
            n.noteNumber === nn.noteNumber &&
            n.beatStart < nn.beatStart + nn.durationBeats &&
            n.beatStart + n.durationBeats > nn.beatStart,
        ),
    );
    if (toAdd.length === 0) return;
    onNotesChange([...notes, ...toAdd] as BeatNote[], "paste notes");
  }

  // ── Component state ────────────────────────────────────────────────────────

  const [ghostNote, setGhostNote] = useState<GhostNote | null>(null);
  const [dragMoveState, setDragMoveState] = useState<DragMoveState | null>(
    null,
  );
  const [dragResizeState, setDragResizeState] =
    useState<DragResizeState | null>(null);
  const [rootResizePreview, setRootResizePreview] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionRect, setSelectionRect] = useState<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    pasteAnchor?: { beat: number; noteNumber: number };
  } | null>(null);

  const isDragging = useRef(false);
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);
  const isSelecting = useRef(false);
  const selectionRectRef = useRef<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);

  // Clear selection and context menu on track switch
  useEffect(() => {
    setSelectedIds(new Set());
    setContextMenu(null);
  }, [editingTrackIndex]);

  useClickOutside(
    contextMenuRef,
    () => setContextMenu(null),
    contextMenu !== null,
  );

  // Close context menu and clear selection on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setContextMenu(null);
        setSelectedIds(new Set());
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Auto-scroll to follow playhead
  useEffect(() => {
    if (isPlaying && gridScrollRef.current) {
      const target =
        currentBeat * BEAT_WIDTH - gridScrollRef.current.clientWidth / 2;
      gridScrollRef.current.scrollLeft = Math.max(0, target);
    }
  }, [currentBeat, isPlaying, gridScrollRef]);

  const gridWidth = totalBeats * BEAT_WIDTH;
  const gridHeight = (MAX_NOTE - MIN_NOTE + 1) * ROW_HEIGHT;

  function onGridScroll() {
    const scrollLeft = gridScrollRef.current?.scrollLeft ?? 0;
    const scrollTop = gridScrollRef.current?.scrollTop ?? 0;
    if (keySidebarScrollRef.current)
      keySidebarScrollRef.current.scrollTop = scrollTop;
    if (rulerScrollRef.current) rulerScrollRef.current.scrollLeft = scrollLeft;
  }

  function snapBeat(raw: number): number {
    return Math.floor(raw / gridSnap) * gridSnap;
  }

  function getBeatAndNote(
    clientX: number,
    clientY: number,
  ): { beat: number; noteNumber: number } | null {
    const el = gridScrollRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left + el.scrollLeft;
    const y = clientY - rect.top + el.scrollTop;
    const beat = snapBeat(x / BEAT_WIDTH);
    const noteNumber = MAX_NOTE - Math.floor(y / ROW_HEIGHT);
    return { beat, noteNumber };
  }

  function getGridCoords(
    clientX: number,
    clientY: number,
  ): { x: number; y: number } | null {
    const el = gridScrollRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return {
      x: clientX - rect.left + el.scrollLeft,
      y: clientY - rect.top + el.scrollTop,
    };
  }

  function clampMenuPos(x: number, y: number): { x: number; y: number } {
    return {
      x: Math.min(x, window.innerWidth - 150),
      y: Math.min(y, window.innerHeight - 130),
    };
  }

  // ── Context menu actions ──────────────────────────────────────────────────

  function handleDeleteSelected() {
    removeNotes([...selectedIds]);
    setSelectedIds(new Set());
    setContextMenu(null);
  }

  function handleCopySelected() {
    const selected = (notes as NoteWithId[]).filter((n) =>
      selectedIds.has(n.id),
    );
    if (selected.length === 0) return;
    const minBeat = Math.min(...selected.map((n) => n.beatStart));
    const relative = selected.map(
      ({ noteNumber, beatStart, durationBeats, velocity }) => ({
        noteNumber,
        beatStart: beatStart - minBeat,
        durationBeats,
        velocity,
      }),
    );
    onCopyNotes(relative);
    setContextMenu(null);
  }

  function handlePasteFromMenu() {
    if (!clipboard) return;
    pasteNotes(clipboard, contextMenu?.pasteAnchor);
    setContextMenu(null);
  }

  function handleGridContextMenu(e: React.MouseEvent<HTMLDivElement>) {
    e.preventDefault();
    if (clipboard !== null) {
      const menuPos = clampMenuPos(e.clientX, e.clientY);
      const gridPos = getBeatAndNote(e.clientX, e.clientY);
      setContextMenu({
        ...menuPos,
        pasteAnchor: gridPos
          ? { beat: gridPos.beat, noteNumber: gridPos.noteNumber }
          : undefined,
      });
    }
  }

  // ── Resize drag ───────────────────────────────────────────────────────────

  function handleNoteResizeMouseDown(
    e: React.MouseEvent,
    note: NoteWithId,
    edge: "left" | "right",
  ) {
    e.stopPropagation();
    if (e.button !== 0) return;

    isDragging.current = false;
    pointerDownPos.current = { x: e.clientX, y: e.clientY };

    const fixedEnd = note.beatStart + note.durationBeats;
    const fixedStart = note.beatStart;
    let lastBeatStart = note.beatStart;
    let lastDuration = note.durationBeats;

    function handleMouseMove(ev: MouseEvent) {
      if (!pointerDownPos.current) return;
      const dx = ev.clientX - pointerDownPos.current.x;
      const dy = ev.clientY - pointerDownPos.current.y;
      if (
        !isDragging.current &&
        Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD
      ) {
        isDragging.current = true;
      }
      if (isDragging.current) {
        const el = gridScrollRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const rawBeat = (ev.clientX - rect.left + el.scrollLeft) / BEAT_WIDTH;

        if (edge === "right") {
          const snappedEnd = snapBeat(rawBeat) + gridSnap;
          const newDuration = Math.max(gridSnap, snappedEnd - fixedStart);
          lastBeatStart = fixedStart;
          lastDuration = newDuration;
        } else {
          const minStart = isEditingProgram ? gridSnap : 0;
          const newStart = Math.max(
            minStart,
            Math.min(fixedEnd - gridSnap, snapBeat(rawBeat)),
          );
          lastBeatStart = newStart;
          lastDuration = Math.max(gridSnap, fixedEnd - newStart);
        }

        setDragResizeState({
          noteId: note.id,
          originalNote: note,
          edge,
          previewBeatStart: lastBeatStart,
          previewDuration: lastDuration,
        });
      }
    }

    function handleMouseUp() {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);

      if (isDragging.current) {
        resizeNote(note.id, lastBeatStart, lastDuration);
      }

      isDragging.current = false;
      pointerDownPos.current = null;
      setDragResizeState(null);
    }

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }

  // ── Root note resize ───────────────────────────────────────────────────────

  function handleRootResizeMouseDown(e: React.MouseEvent) {
    e.stopPropagation();
    if (e.button !== 0) return;

    isDragging.current = false;
    pointerDownPos.current = { x: e.clientX, y: e.clientY };
    let lastDuration = rootNoteDuration;

    function handleMouseMove(ev: MouseEvent) {
      if (!pointerDownPos.current) return;
      const dx = ev.clientX - pointerDownPos.current.x;
      const dy = ev.clientY - pointerDownPos.current.y;
      if (!isDragging.current && Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
        isDragging.current = true;
      }
      if (isDragging.current) {
        const el = gridScrollRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const rawBeat = (ev.clientX - rect.left + el.scrollLeft) / BEAT_WIDTH;
        const snappedEnd = snapBeat(rawBeat) + gridSnap;
        lastDuration = Math.max(gridSnap, snappedEnd);
        setRootResizePreview(lastDuration);
      }
    }

    function handleMouseUp() {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);

      if (isDragging.current) {
        setRootNoteDuration(lastDuration);
      }

      isDragging.current = false;
      pointerDownPos.current = null;
      setRootResizePreview(null);
    }

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }

  // ── Creation drag ──────────────────────────────────────────────────────────

  function handleGridMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    if (contextMenu !== null) return;

    if (e.shiftKey) {
      const gridCoords = getGridCoords(e.clientX, e.clientY);
      if (!gridCoords) return;
      isSelecting.current = false;
      pointerDownPos.current = { x: e.clientX, y: e.clientY };
      const anchor = { x: gridCoords.x, y: gridCoords.y };

      function handleMouseMove(ev: MouseEvent) {
        if (!pointerDownPos.current) return;
        const dx = ev.clientX - pointerDownPos.current.x;
        const dy = ev.clientY - pointerDownPos.current.y;
        if (
          !isSelecting.current &&
          Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD
        ) {
          isSelecting.current = true;
        }
        if (isSelecting.current) {
          const cur = getGridCoords(ev.clientX, ev.clientY);
          if (!cur) return;
          const rect = { x1: anchor.x, y1: anchor.y, x2: cur.x, y2: cur.y };
          selectionRectRef.current = rect;
          setSelectionRect(rect);
        }
      }

      function handleMouseUp() {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);

        if (isSelecting.current) {
          const finalRect = selectionRectRef.current;
          if (finalRect) {
            const minX = Math.min(finalRect.x1, finalRect.x2);
            const maxX = Math.max(finalRect.x1, finalRect.x2);
            const minY = Math.min(finalRect.y1, finalRect.y2);
            const maxY = Math.max(finalRect.y1, finalRect.y2);
            const matched = (notes as NoteWithId[]).filter((n) => {
              const noteLeft = n.beatStart * BEAT_WIDTH;
              const noteRight = (n.beatStart + n.durationBeats) * BEAT_WIDTH;
              const noteTop = (MAX_NOTE - n.noteNumber) * ROW_HEIGHT;
              const noteBottom = (MAX_NOTE - n.noteNumber + 1) * ROW_HEIGHT;
              return (
                noteLeft < maxX &&
                noteRight > minX &&
                noteTop < maxY &&
                noteBottom > minY
              );
            });
            setSelectedIds(new Set(matched.map((n) => n.id)));
          }
        } else {
          setSelectedIds(new Set());
        }

        isSelecting.current = false;
        selectionRectRef.current = null;
        pointerDownPos.current = null;
        setSelectionRect(null);
      }

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return;
    }

    const hadSelection = selectedIds.size > 0;
    setSelectedIds(new Set());
    if (hadSelection) return;

    const pos = getBeatAndNote(e.clientX, e.clientY);
    if (!pos) return;
    if (pos.noteNumber < MIN_NOTE || pos.noteNumber > MAX_NOTE) return;
    if (isEditingProgram && pos.beat <= 0) return;

    isDragging.current = false;
    pointerDownPos.current = { x: e.clientX, y: e.clientY };

    const anchorBeat = pos.beat;
    const anchorNote = pos.noteNumber;
    const lastGhost = { beatStart: anchorBeat, durationBeats: gridSnap };

    function handleMouseMove(ev: MouseEvent) {
      if (!pointerDownPos.current) return;
      const dx = ev.clientX - pointerDownPos.current.x;
      const dy = ev.clientY - pointerDownPos.current.y;
      if (
        !isDragging.current &&
        Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD
      ) {
        isDragging.current = true;
      }
      if (isDragging.current) {
        const cur = getBeatAndNote(ev.clientX, ev.clientY);
        if (!cur) return;
        const rawStart = Math.min(anchorBeat, cur.beat);
        const rawEnd = Math.max(anchorBeat, cur.beat) + gridSnap;
        const durationBeats = Math.max(gridSnap, rawEnd - rawStart);
        const beatStart = isEditingProgram
          ? Math.max(gridSnap, rawStart)
          : Math.max(0, rawStart);
        lastGhost.beatStart = beatStart;
        lastGhost.durationBeats = durationBeats;
        setGhostNote({ noteNumber: anchorNote, beatStart, durationBeats });
      }
    }

    function handleMouseUp() {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);

      if (!isDragging.current) {
        addNote({
          noteNumber: anchorNote,
          beatStart: anchorBeat,
          durationBeats: gridSnap,
          velocity: 100,
        });
      } else {
        addNote({
          noteNumber: anchorNote,
          beatStart: lastGhost.beatStart,
          durationBeats: lastGhost.durationBeats,
          velocity: 100,
        });
      }

      isDragging.current = false;
      pointerDownPos.current = null;
      setGhostNote(null);
    }

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }

  // ── Move drag ──────────────────────────────────────────────────────────────

  function handleNoteMouseDown(e: React.MouseEvent, note: NoteWithId) {
    e.stopPropagation();

    if (e.button === 2) {
      e.preventDefault();
      if (!selectedIds.has(note.id)) {
        setSelectedIds(new Set([note.id]));
      }
      const pos = clampMenuPos(e.clientX, e.clientY);
      setContextMenu(pos);
      return;
    }

    if (e.shiftKey && e.button === 0) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(note.id)) next.delete(note.id);
        else next.add(note.id);
        return next;
      });
      return;
    }

    if (e.button !== 0) return;

    const isSelected = selectedIds.has(note.id);

    if (!isSelected) {
      setSelectedIds(new Set());
    }

    const movingIds: Set<string> = isSelected
      ? new Set(selectedIds)
      : new Set([note.id]);
    const movingNotes: NoteWithId[] = (notes as NoteWithId[]).filter((n) =>
      movingIds.has(n.id),
    );

    const pos = getBeatAndNote(e.clientX, e.clientY);
    if (!pos) return;

    const offsetBeats = pos.beat - note.beatStart;
    const offsetNoteRows = pos.noteNumber - note.noteNumber;

    if (editorMode === "add") {
      onPlayNote(note.noteNumber, note.durationBeats);
    }

    isDragging.current = false;
    pointerDownPos.current = { x: e.clientX, y: e.clientY };

    let lastOffsetBeats = 0;
    let lastOffsetRows = 0;
    let lastPlayedRow = note.noteNumber;

    function computeOffsets(
      ev: MouseEvent,
    ): { deltaBeats: number; deltaRows: number } | null {
      const cur = getBeatAndNote(ev.clientX, ev.clientY);
      if (!cur) return null;

      const newAnchorBeat = snapBeat(cur.beat - offsetBeats);
      let deltaBeats = newAnchorBeat - note.beatStart;

      for (const n of movingNotes) {
        const minBeat = isEditingProgram ? gridSnap : 0;
        if (n.beatStart + deltaBeats < minBeat) {
          deltaBeats = minBeat - n.beatStart;
        }
      }

      let deltaRows = cur.noteNumber - offsetNoteRows - note.noteNumber;

      for (const n of movingNotes) {
        if (n.noteNumber + deltaRows < MIN_NOTE)
          deltaRows = Math.max(deltaRows, MIN_NOTE - n.noteNumber);
        if (n.noteNumber + deltaRows > MAX_NOTE)
          deltaRows = Math.min(deltaRows, MAX_NOTE - n.noteNumber);
      }

      return { deltaBeats, deltaRows };
    }

    function handleMouseMove(ev: MouseEvent) {
      if (!pointerDownPos.current) return;
      const dx = ev.clientX - pointerDownPos.current.x;
      const dy = ev.clientY - pointerDownPos.current.y;
      if (
        !isDragging.current &&
        Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD
      ) {
        isDragging.current = true;
      }
      if (isDragging.current) {
        const offsets = computeOffsets(ev);
        if (offsets) {
          const anchorNewRow = note.noteNumber + offsets.deltaRows;
          if (anchorNewRow !== lastPlayedRow) {
            onPlayNote(anchorNewRow, note.durationBeats);
            lastPlayedRow = anchorNewRow;
          }
          lastOffsetBeats = offsets.deltaBeats;
          lastOffsetRows = offsets.deltaRows;
          setDragMoveState({
            noteIds: movingIds,
            originalNotes: movingNotes,
            previewOffsetBeats: offsets.deltaBeats,
            previewOffsetRows: offsets.deltaRows,
          });
        }
      }
    }

    function handleMouseUp() {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);

      if (!isDragging.current) {
        if (editorMode === "delete" && !isSelected) {
          removeNote(note.id);
        }
      } else {
        updateNotes(
          movingNotes.map((n) => ({
            id: n.id,
            beatStart: n.beatStart + lastOffsetBeats,
            noteNumber: n.noteNumber + lastOffsetRows,
          })),
        );
      }

      isDragging.current = false;
      pointerDownPos.current = null;
      setDragMoveState(null);
    }

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const rootTop = (MAX_NOTE - rootNote) * ROW_HEIGHT;

  const beatLines: React.ReactNode[] = [];
  for (let b = 0; b <= totalBeats; b++) {
    beatLines.push(
      <div
        key={b}
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: b * BEAT_WIDTH,
          width: 1,
          background:
            b % beatsPerMeasure === 0
              ? "rgba(255,255,255,0.12)"
              : "rgba(255,255,255,0.04)",
          pointerEvents: "none",
        }}
      />,
    );
  }

  const rowBgs: React.ReactNode[] = [];
  for (let n = MAX_NOTE; n >= MIN_NOTE; n--) {
    const top = (MAX_NOTE - n) * ROW_HEIGHT;
    const command = getNoteCommand(n, rootNote, scale);
    const isRoot = n === rootNote;
    const black =
      n % 12 === 1 ||
      n % 12 === 3 ||
      n % 12 === 6 ||
      n % 12 === 8 ||
      n % 12 === 10;
    let bg = black ? "rgba(0,0,0,0.18)" : "transparent";
    if (isEditingProgram) {
      if (isRoot) bg = "rgba(129,140,248,0.10)";
      else if (command) bg = `${COMMAND_COLORS[command]}0d`;
    }
    rowBgs.push(
      <div
        key={n}
        style={{
          position: "absolute",
          top,
          left: 0,
          right: 0,
          height: ROW_HEIGHT,
          background: bg,
          borderBottom: "1px solid rgba(46,46,64,0.4)",
          pointerEvents: "none",
        }}
      />,
    );
  }

  const draggingNoteIds = dragMoveState?.noteIds ?? new Set<string>();

  return (
    <div
      ref={gridScrollRef}
      onScroll={onGridScroll}
      style={{
        flex: 1,
        overflowX: "auto",
        overflowY: "auto",
        position: "relative",
        cursor: dragMoveState
          ? "grabbing"
          : dragResizeState
            ? dragResizeState.edge === "left"
              ? "w-resize"
              : "e-resize"
            : rootResizePreview !== null
              ? "e-resize"
              : "crosshair",
      }}
    >
      <div
        style={{ width: gridWidth, height: gridHeight, position: "relative" }}
        onMouseDown={handleGridMouseDown}
        onContextMenu={handleGridContextMenu}
      >
        {rowBgs}
        {beatLines}

        {isEditingProgram && (
          <div
            style={{
              position: "absolute",
              top: rootTop,
              left: 0,
              width: (rootResizePreview ?? rootNoteDuration) * BEAT_WIDTH - 2,
              height: ROW_HEIGHT - 1,
              background: "var(--accent2)",
              borderRadius: 3,
              display: "flex",
              alignItems: "center",
              paddingLeft: 4,
              fontSize: 11,
              color: "white",
              fontWeight: 700,
              fontFamily: "monospace",
              zIndex: 2,
              userSelect: "none",
            }}
          >
            ROOT
            <div
              onMouseDown={handleRootResizeMouseDown}
              style={{
                position: "absolute",
                right: 0,
                top: 0,
                bottom: 0,
                width: Math.min(8, ((rootResizePreview ?? rootNoteDuration) * BEAT_WIDTH - 2) / 3),
                cursor: "e-resize",
              }}
            />
          </div>
        )}

        {otherNotes.map((note, idx) => (
          <div
            key={idx}
            style={{
              position: "absolute",
              top: (MAX_NOTE - note.noteNumber) * ROW_HEIGHT,
              left: note.beatStart * BEAT_WIDTH,
              width: note.durationBeats * BEAT_WIDTH - 2,
              height: ROW_HEIGHT - 1,
              background: "rgba(148,163,184,0.25)",
              borderRadius: 3,
              pointerEvents: "none",
              zIndex: 1,
            }}
          />
        ))}

        {selectionRect &&
          (() => {
            const left = Math.min(selectionRect.x1, selectionRect.x2);
            const top = Math.min(selectionRect.y1, selectionRect.y2);
            const width = Math.abs(selectionRect.x2 - selectionRect.x1);
            const height = Math.abs(selectionRect.y2 - selectionRect.y1);
            return (
              <div
                style={{
                  position: "absolute",
                  left,
                  top,
                  width,
                  height,
                  background: "rgba(129, 140, 248, 0.08)",
                  border: "1px dashed rgba(129, 140, 248, 0.6)",
                  pointerEvents: "none",
                  zIndex: 6,
                }}
              />
            );
          })()}

        {ghostNote &&
          (() => {
            const cmd = getNoteCommand(ghostNote.noteNumber, rootNote, scale);
            const color = isEditingProgram
              ? cmd
                ? COMMAND_COLORS[cmd]
                : "var(--text-muted)"
              : IGNORED_NOTE_COLOR;
            return (
              <div
                style={{
                  position: "absolute",
                  top: (MAX_NOTE - ghostNote.noteNumber) * ROW_HEIGHT,
                  left: ghostNote.beatStart * BEAT_WIDTH,
                  width: Math.max(2, ghostNote.durationBeats * BEAT_WIDTH - 2),
                  height: ROW_HEIGHT - 1,
                  background: color,
                  opacity: 0.5,
                  borderRadius: 3,
                  border: "1px dashed rgba(255,255,255,0.6)",
                  pointerEvents: "none",
                  zIndex: 4,
                }}
              />
            );
          })()}

        {dragResizeState &&
          (() => {
            const { originalNote, previewBeatStart, previewDuration } =
              dragResizeState;
            const cmd = getNoteCommand(
              originalNote.noteNumber,
              rootNote,
              scale,
            );
            const color = isEditingProgram
              ? cmd
                ? COMMAND_COLORS[cmd]
                : "var(--text-muted)"
              : IGNORED_NOTE_COLOR;
            return (
              <div
                key={`resize-preview-${originalNote.id}`}
                style={{
                  position: "absolute",
                  top: (MAX_NOTE - originalNote.noteNumber) * ROW_HEIGHT,
                  left: previewBeatStart * BEAT_WIDTH,
                  width: Math.max(2, previewDuration * BEAT_WIDTH - 2),
                  height: ROW_HEIGHT - 1,
                  background: color,
                  borderRadius: 3,
                  display: "flex",
                  alignItems: "center",
                  paddingLeft: 4,
                  fontSize: 11,
                  color: "white",
                  fontWeight: 700,
                  fontFamily: "monospace",
                  pointerEvents: "none",
                  zIndex: 5,
                  opacity: 0.85,
                  border: "1px dashed rgba(255,255,255,0.5)",
                }}
              >
                {cmd}
              </div>
            );
          })()}

        {dragMoveState &&
          dragMoveState.originalNotes.map((origNote) => {
            const previewBeat =
              origNote.beatStart + dragMoveState.previewOffsetBeats;
            const previewNoteNum =
              origNote.noteNumber + dragMoveState.previewOffsetRows;
            const cmd = getNoteCommand(previewNoteNum, rootNote, scale);
            const color = isEditingProgram
              ? cmd
                ? COMMAND_COLORS[cmd]
                : "var(--text-muted)"
              : IGNORED_NOTE_COLOR;
            return (
              <div
                key={`preview-${origNote.id}`}
                style={{
                  position: "absolute",
                  top: (MAX_NOTE - previewNoteNum) * ROW_HEIGHT,
                  left: previewBeat * BEAT_WIDTH,
                  width: origNote.durationBeats * BEAT_WIDTH - 2,
                  height: ROW_HEIGHT - 1,
                  background: color,
                  borderRadius: 3,
                  display: "flex",
                  alignItems: "center",
                  paddingLeft: 4,
                  fontSize: 11,
                  color: "white",
                  fontWeight: 700,
                  fontFamily: "monospace",
                  pointerEvents: "none",
                  zIndex: 5,
                }}
              >
                {cmd}
              </div>
            );
          })}

        {(notes as NoteWithId[]).map((note) => {
          const isBeingMoved = draggingNoteIds.has(note.id);
          const isBeingResized = dragResizeState?.noteId === note.id;
          const isSelected = selectedIds.has(note.id);
          const command = isEditingProgram
            ? getNoteCommand(note.noteNumber, rootNote, scale)
            : "";
          const color = isEditingProgram
            ? command
              ? COMMAND_COLORS[command]
              : IGNORED_NOTE_COLOR
            : IGNORED_NOTE_COLOR;
          let opacity = 1;
          if (isBeingMoved || isBeingResized) opacity = 0.2;
          const isActive =
            isPlaying &&
            currentBeat >= note.beatStart &&
            currentBeat < note.beatStart + note.durationBeats;

          return (
            <div
              key={note.id}
              onMouseDown={(e) => handleNoteMouseDown(e, note)}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              style={{
                position: "absolute",
                top: (MAX_NOTE - note.noteNumber) * ROW_HEIGHT,
                left: note.beatStart * BEAT_WIDTH,
                width: note.durationBeats * BEAT_WIDTH - 2,
                height: ROW_HEIGHT - 1,
                background: color,
                opacity,
                borderRadius: 3,
                display: "flex",
                alignItems: "center",
                paddingLeft: 4,
                fontSize: 11,
                color: "white",
                fontWeight: 700,
                fontFamily: "monospace",
                cursor: editorMode === "delete" ? "grab" : "move",
                zIndex: 3,
                boxShadow: isActive
                  ? "0 0 0 2px white"
                  : isSelected
                    ? "0 0 0 2px var(--accent)"
                    : undefined,
              }}
            >
              {/* Left resize handle */}
              <div
                onMouseDown={(e) => handleNoteResizeMouseDown(e, note, "left")}
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: Math.min(8, (note.durationBeats * BEAT_WIDTH - 2) / 3),
                  cursor: "w-resize",
                  zIndex: 1,
                }}
              />
              {command}
              {/* Right resize handle */}
              <div
                onMouseDown={(e) => handleNoteResizeMouseDown(e, note, "right")}
                style={{
                  position: "absolute",
                  right: 0,
                  top: 0,
                  bottom: 0,
                  width: Math.min(8, (note.durationBeats * BEAT_WIDTH - 2) / 3),
                  cursor: "e-resize",
                  zIndex: 1,
                }}
              />
            </div>
          );
        })}

        {(isPlaying || currentBeat > 0) && (
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: currentBeat * BEAT_WIDTH,
              width: 2,
              background: "rgba(255,255,255,0.7)",
              pointerEvents: "none",
              zIndex: 10,
            }}
          />
        )}
      </div>

      {contextMenu &&
        createPortal(
          <div
            className="pr-context-menu"
            ref={contextMenuRef}
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            {selectedIds.size > 0 && (
              <>
                <button
                  className="pr-context-menu-item"
                  onClick={handleDeleteSelected}
                >
                  Delete
                </button>
                <button
                  className="pr-context-menu-item"
                  onClick={handleCopySelected}
                >
                  Copy
                </button>
              </>
            )}
            {clipboard !== null && (
              <button
                className="pr-context-menu-item"
                onClick={handlePasteFromMenu}
              >
                Paste
              </button>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
