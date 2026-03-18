import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useMemo,
} from "react";
import { type MidiData, readScaleHint } from "../lib/transpiler.js";
import { type BeatNote, DEFAULT_INSTRUMENT } from "../lib/player.js";
import {
  parsedMidiToRollNotes,
  trackToBeatNotes,
  getTrackInstrument,
  exportAllTracks,
  suggestSnapFromMidi,
} from "../lib/midiExport.js";
import {
  type CCEvent,
  type CCLaneType,
  type TrackCCEvents,
  emptyTrackCCEvents,
} from "../lib/automationTypes.js";
import { useComposition } from "./CompositionContext.js";

export interface TrackMeta {
  id: number;
  name: string;
  instrument: string;
}

interface HistoryEntry {
  label: string;
  snapshot: Record<number, BeatNote[]>;
  ccSnapshot: Record<number, TrackCCEvents>;
  tracks: TrackMeta[];
  editingTrackIndex: number;
}

interface TracksContextValue {
  parsedMidi: MidiData | null;
  fileName: string;
  setFileName: (name: string) => void;
  tracks: TrackMeta[];
  trackIndex: number;
  setTrackIndex: (i: number) => void;
  editingTrackIndex: number;
  setEditingTrackIndex: (i: number) => void;
  allTracksNotes: Record<number, BeatNote[]>;
  allTracksCCEvents: Record<number, TrackCCEvents>;
  clipboard: Array<Omit<BeatNote, "id">> | null;
  setClipboard: (notes: Array<Omit<BeatNote, "id">> | null) => void;
  // Derived
  rollNotes: BeatNote[];
  editingNotes: BeatNote[];
  editingTrackCCEvents: TrackCCEvents;
  isEditingProgram: boolean;
  otherTracksNotes: BeatNote[];
  trackHasNotes: Record<number, boolean>;
  // History
  canUndo: boolean;
  canRedo: boolean;
  undoLabel: string | null;
  redoLabel: string | null;
  undo: () => void;
  redo: () => void;
  updateNotesWithHistory: (
    trackId: number,
    notes: BeatNote[],
    label: string,
  ) => void;
  updateCCEventsWithHistory: (
    trackId: number,
    lane: CCLaneType,
    events: CCEvent[],
    label: string,
  ) => void;
  updateCCEvents: (trackId: number, lane: CCLaneType, events: CCEvent[]) => void;
  // Actions
  loadMidi: (parsed: MidiData, name: string) => void;
  addTrack: () => void;
  deleteTrack: (id: number) => void;
  renameTrack: (id: number, name: string) => void;
  setInstrument: (id: number, instrument: string) => void;
  updateNotes: (trackId: number, notes: BeatNote[]) => void;
  exportMidi: () => void;
  resetComposition: () => void;
}

const TracksContext = createContext<TracksContextValue | null>(null);

export function TracksProvider({ children }: { children: React.ReactNode }) {
  const {
    rollRootNote,
    setRollRootNote,
    rootNoteDuration,
    setRootNoteDuration,
    setTotalBeats,
    setBpm,
    setTimeSig,
    setScale,
    setGridSnap,
    bpm,
    timeSig,
    scale,
  } = useComposition();

  const [parsedMidi, setParsedMidi] = useState<MidiData | null>(null);
  const [fileName, setFileName] = useState("");
  const [tracks, setTracks] = useState<TrackMeta[]>([
    { id: 0, name: "Program track", instrument: DEFAULT_INSTRUMENT },
  ]);
  const [trackIndex, setTrackIndex] = useState(0);
  const [editingTrackIndex, setEditingTrackIndex] = useState(0);
  const [allTracksNotes, setAllTracksNotes] = useState<
    Record<number, BeatNote[]>
  >({ 0: [] });
  const [allTracksCCEvents, setAllTracksCCEvents] = useState<
    Record<number, TrackCCEvents>
  >({ 0: emptyTrackCCEvents() });
  const [clipboard, setClipboard] = useState<Array<
    Omit<BeatNote, "id">
  > | null>(null);

  // History stacks stored in refs so mutations are synchronous — no nested setState races
  const pastRef = useRef<HistoryEntry[]>([]);
  const futureRef = useRef<HistoryEntry[]>([]);
  const [, forceHistoryUpdate] = useState(0);

  // Always-current refs so undo/redo read the latest state even from stale closures
  const allTracksNotesRef = useRef(allTracksNotes);
  allTracksNotesRef.current = allTracksNotes;
  const allTracksCCEventsRef = useRef(allTracksCCEvents);
  allTracksCCEventsRef.current = allTracksCCEvents;
  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;
  const editingTrackIndexRef = useRef(editingTrackIndex);
  editingTrackIndexRef.current = editingTrackIndex;

  const canUndo = pastRef.current.length > 0;
  const canRedo = futureRef.current.length > 0;
  const undoLabel =
    pastRef.current.length > 0
      ? pastRef.current[pastRef.current.length - 1].label
      : null;
  const redoLabel =
    futureRef.current.length > 0
      ? futureRef.current[futureRef.current.length - 1].label
      : null;

  const rollNotes = allTracksNotes[trackIndex] ?? [];
  const editingNotes = allTracksNotes[editingTrackIndex] ?? [];
  const editingTrackCCEvents: TrackCCEvents =
    allTracksCCEvents[editingTrackIndex] ?? emptyTrackCCEvents();
  const isEditingProgram = editingTrackIndex === trackIndex;

  const otherTracksNotes = useMemo((): BeatNote[] => {
    const result: BeatNote[] = [];
    for (const [key, notes] of Object.entries(allTracksNotes)) {
      const i = Number(key);
      if (i === editingTrackIndex) continue;
      result.push(...notes);
    }
    return result;
  }, [allTracksNotes, editingTrackIndex]);

  const trackHasNotes = Object.fromEntries(
    tracks.map((t) => [t.id, (allTracksNotes[t.id] ?? []).length > 0]),
  );

  // ── Populate tracks when MIDI or program track index changes ──────────────
  const prevParsedMidiRef = useRef<MidiData | null>(null);

  useEffect(() => {
    if (!parsedMidi) return;

    const isFreshLoad = parsedMidi !== prevParsedMidiRef.current;
    prevParsedMidiRef.current = parsedMidi;

    const progResult = parsedMidiToRollNotes(parsedMidi, trackIndex);
    const progNotes = progResult?.notes ?? [];
    const progCC = progResult?.ccEvents ?? emptyTrackCCEvents();
    const rootNote = progResult?.rootNote ?? rollRootNote;
    const importedRootNoteDuration = progResult?.rootNoteDuration ?? 1;
    const maxBeat = progNotes.reduce(
      (m, n) => Math.max(m, n.beatStart + n.durationBeats),
      1,
    );

    setRollRootNote(rootNote);
    setRootNoteDuration(importedRootNoteDuration);
    setTotalBeats(Math.ceil(maxBeat / 4) * 4 + 4);
    setEditingTrackIndex(trackIndex);

    if (isFreshLoad) {
      pastRef.current = [];
      futureRef.current = [];
      const startIdx = parsedMidi.tracks.length > 1 ? 1 : 0;
      const newNotes: Record<number, BeatNote[]> = {};
      const newCC: Record<number, TrackCCEvents> = {};
      for (let i = startIdx; i < parsedMidi.tracks.length; i++) {
        if (i === trackIndex) {
          newNotes[i] = progNotes;
          newCC[i] = progCC;
        } else {
          const { notes: tn, ccEvents: tc } = trackToBeatNotes(parsedMidi, i);
          newNotes[i] = tn;
          newCC[i] = tc;
        }
      }
      setAllTracksNotes(newNotes);
      setAllTracksCCEvents(newCC);
    } else {
      setAllTracksNotes((prev) => ({ ...prev, [trackIndex]: progNotes }));
      setAllTracksCCEvents((prev) => ({ ...prev, [trackIndex]: progCC }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedMidi, trackIndex]);

  // ── Actions ───────────────────────────────────────────────────────────────

  function loadMidi(parsed: MidiData, name: string) {
    setParsedMidi(parsed);
    setFileName(name);

    const progIdx = parsed.tracks.length > 1 ? 1 : 0;
    const startIdx = parsed.tracks.length > 1 ? 1 : 0;
    setTrackIndex(progIdx);
    setEditingTrackIndex(progIdx);
    setTracks(
      Array.from({ length: parsed.tracks.length - startIdx }, (_, i) => ({
        id: i + startIdx,
        name:
          i + startIdx === progIdx ? "Program track" : `Track ${i + startIdx}`,
        instrument: getTrackInstrument(parsed, i + startIdx),
      })),
    );

    // Auto-detect grid snap from note granularity.
    setGridSnap(suggestSnapFromMidi(parsed));

    // Marker takes priority over key signature for scale detection.
    const scaleHint = readScaleHint(parsed);
    if (scaleHint) setScale(scaleHint);

    let foundTempo = false,
      foundTimeSig = false,
      foundKeySig = scaleHint !== null;
    for (const track of parsed.tracks) {
      for (const event of track) {
        if (
          event.type === "setTempo" &&
          typeof event.microsecondsPerBeat === "number" &&
          !foundTempo
        ) {
          setBpm(
            Math.max(
              20,
              Math.min(300, Math.round(60_000_000 / event.microsecondsPerBeat)),
            ),
          );
          foundTempo = true;
        }
        if (event.type === "timeSignature" && !foundTimeSig) {
          setTimeSig({
            num: (event as { numerator: number }).numerator,
            den: (event as { denominator: number }).denominator,
          });
          foundTimeSig = true;
        }
        if (event.type === "keySignature" && !foundKeySig) {
          setScale(
            (event as { scale: number }).scale === 1 ? "MINOR" : "MAJOR",
          );
          foundKeySig = true;
        }
        if (foundTempo && foundTimeSig && foundKeySig) break;
      }
      if (foundTempo && foundTimeSig && foundKeySig) break;
    }
  }

  function addTrack() {
    const nextId = tracks.reduce((max, t) => Math.max(max, t.id), -1) + 1;
    const newTrack: TrackMeta = {
      id: nextId,
      name: `Track ${nextId}`,
      instrument: DEFAULT_INSTRUMENT,
    };
    const nextPast = [
      ...pastRef.current,
      {
        label: "add track",
        snapshot: allTracksNotesRef.current,
        ccSnapshot: allTracksCCEventsRef.current,
        tracks: tracksRef.current,
        editingTrackIndex: editingTrackIndexRef.current,
      },
    ];
    pastRef.current =
      nextPast.length > HISTORY_LIMIT
        ? nextPast.slice(-HISTORY_LIMIT)
        : nextPast;
    futureRef.current = [];
    setTracks((prev) => [...prev, newTrack]);
    setAllTracksNotes((prev) => ({ ...prev, [nextId]: [] }));
    setAllTracksCCEvents((prev) => ({ ...prev, [nextId]: emptyTrackCCEvents() }));
    setEditingTrackIndex(nextId);
    forceHistoryUpdate((v) => v + 1);
  }

  function deleteTrack(id: number) {
    if (tracks.length <= 1) return;
    const fallback =
      trackIndex === id
        ? tracks.find((t) => t.id !== id)!.id
        : editingTrackIndex === id
          ? trackIndex
          : editingTrackIndex;
    const nextPast = [
      ...pastRef.current,
      {
        label: "delete track",
        snapshot: allTracksNotesRef.current,
        ccSnapshot: allTracksCCEventsRef.current,
        tracks: tracksRef.current,
        editingTrackIndex: editingTrackIndexRef.current,
      },
    ];
    pastRef.current =
      nextPast.length > HISTORY_LIMIT
        ? nextPast.slice(-HISTORY_LIMIT)
        : nextPast;
    futureRef.current = [];
    setTracks((prev) => prev.filter((t) => t.id !== id));
    setAllTracksNotes((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setAllTracksCCEvents((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (trackIndex === id) {
      setTrackIndex(fallback);
      setEditingTrackIndex(fallback);
    } else if (editingTrackIndex === id) {
      setEditingTrackIndex(trackIndex);
    }
    forceHistoryUpdate((v) => v + 1);
  }

  function renameTrack(id: number, name: string) {
    setTracks((prev) => prev.map((t) => (t.id === id ? { ...t, name } : t)));
  }

  function setInstrument(id: number, instrument: string) {
    setTracks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, instrument } : t)),
    );
  }

  function updateNotes(trackId: number, notes: BeatNote[]) {
    setAllTracksNotes((prev) => ({ ...prev, [trackId]: notes }));
  }

  const HISTORY_LIMIT = 50;

  function updateNotesWithHistory(
    trackId: number,
    notes: BeatNote[],
    label: string,
  ) {
    const next = [
      ...pastRef.current,
      {
        label,
        snapshot: allTracksNotesRef.current,
        ccSnapshot: allTracksCCEventsRef.current,
        tracks: tracksRef.current,
        editingTrackIndex: editingTrackIndexRef.current,
      },
    ];
    pastRef.current =
      next.length > HISTORY_LIMIT ? next.slice(-HISTORY_LIMIT) : next;
    futureRef.current = [];
    setAllTracksNotes((prev) => ({ ...prev, [trackId]: notes }));
    forceHistoryUpdate((v) => v + 1);
  }

  function updateCCEventsWithHistory(
    trackId: number,
    lane: CCLaneType,
    events: CCEvent[],
    label: string,
  ) {
    const next = [
      ...pastRef.current,
      {
        label,
        snapshot: allTracksNotesRef.current,
        ccSnapshot: allTracksCCEventsRef.current,
        tracks: tracksRef.current,
        editingTrackIndex: editingTrackIndexRef.current,
      },
    ];
    pastRef.current =
      next.length > HISTORY_LIMIT ? next.slice(-HISTORY_LIMIT) : next;
    futureRef.current = [];
    setAllTracksCCEvents((prev) => ({
      ...prev,
      [trackId]: { ...(prev[trackId] ?? emptyTrackCCEvents()), [lane]: events },
    }));
    forceHistoryUpdate((v) => v + 1);
  }

  function updateCCEvents(trackId: number, lane: CCLaneType, events: CCEvent[]) {
    setAllTracksCCEvents((prev) => ({
      ...prev,
      [trackId]: { ...(prev[trackId] ?? emptyTrackCCEvents()), [lane]: events },
    }));
  }

  function undo() {
    if (pastRef.current.length === 0) return;
    const entry = pastRef.current[pastRef.current.length - 1];
    const next = [
      ...futureRef.current,
      {
        label: entry.label,
        snapshot: allTracksNotesRef.current,
        ccSnapshot: allTracksCCEventsRef.current,
        tracks: tracksRef.current,
        editingTrackIndex: editingTrackIndexRef.current,
      },
    ];
    futureRef.current =
      next.length > HISTORY_LIMIT ? next.slice(-HISTORY_LIMIT) : next;
    pastRef.current = pastRef.current.slice(0, -1);
    setAllTracksNotes(entry.snapshot);
    setAllTracksCCEvents(entry.ccSnapshot);
    setTracks(entry.tracks);
    setEditingTrackIndex(entry.editingTrackIndex);
    forceHistoryUpdate((v) => v + 1);
  }

  function redo() {
    if (futureRef.current.length === 0) return;
    const entry = futureRef.current[futureRef.current.length - 1];
    const next = [
      ...pastRef.current,
      {
        label: entry.label,
        snapshot: allTracksNotesRef.current,
        ccSnapshot: allTracksCCEventsRef.current,
        tracks: tracksRef.current,
        editingTrackIndex: editingTrackIndexRef.current,
      },
    ];
    pastRef.current =
      next.length > HISTORY_LIMIT ? next.slice(-HISTORY_LIMIT) : next;
    futureRef.current = futureRef.current.slice(0, -1);
    setAllTracksNotes(entry.snapshot);
    setAllTracksCCEvents(entry.ccSnapshot);
    setTracks(entry.tracks);
    setEditingTrackIndex(entry.editingTrackIndex);
    forceHistoryUpdate((v) => v + 1);
  }

  function exportMidi() {
    exportAllTracks(
      tracks,
      allTracksNotes,
      trackIndex,
      rollRootNote,
      bpm,
      timeSig,
      scale,
      fileName || undefined,
      rootNoteDuration,
      allTracksCCEvents,
    );
  }

  function resetComposition() {
    setParsedMidi(null);
    setFileName("");
    setTracks([
      { id: 0, name: "Program track", instrument: DEFAULT_INSTRUMENT },
    ]);
    setTrackIndex(0);
    setEditingTrackIndex(0);
    setAllTracksNotes({ 0: [] });
    setAllTracksCCEvents({ 0: emptyTrackCCEvents() });
    setClipboard(null);
    pastRef.current = [];
    futureRef.current = [];
    setScale("MAJOR");
    setBpm(120);
    setTimeSig({ num: 4, den: 4 });
    setRollRootNote(60);
    setTotalBeats(16);
    setGridSnap(0.5);
  }

  const value: TracksContextValue = {
    parsedMidi,
    fileName,
    setFileName,
    tracks,
    trackIndex,
    setTrackIndex,
    editingTrackIndex,
    setEditingTrackIndex,
    allTracksNotes,
    allTracksCCEvents,
    clipboard,
    setClipboard,
    rollNotes,
    editingNotes,
    editingTrackCCEvents,
    isEditingProgram,
    otherTracksNotes,
    trackHasNotes,
    canUndo,
    canRedo,
    undoLabel,
    redoLabel,
    undo,
    redo,
    updateNotesWithHistory,
    updateCCEventsWithHistory,
    updateCCEvents,
    loadMidi,
    addTrack,
    deleteTrack,
    renameTrack,
    setInstrument,
    updateNotes,
    exportMidi,
    resetComposition,
  };

  return (
    <TracksContext.Provider value={value}>{children}</TracksContext.Provider>
  );
}

export function useTracks() {
  const ctx = useContext(TracksContext);
  if (!ctx) throw new Error("useTracks must be used within TracksProvider");
  return ctx;
}
