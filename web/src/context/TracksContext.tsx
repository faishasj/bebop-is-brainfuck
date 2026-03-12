import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useMemo,
} from "react";
import { type MidiData } from "../lib/transpiler.js";
import { type BeatNote, DEFAULT_INSTRUMENT } from "../lib/player.js";
import {
  parsedMidiToRollNotes,
  trackToBeatNotes,
  getTrackInstrument,
  exportAllTracks,
} from "../lib/midiExport.js";
import { useComposition } from "./CompositionContext.js";

export interface TrackMeta {
  id: number;
  name: string;
  instrument: string;
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
  clipboard: Array<Omit<BeatNote, "id">> | null;
  setClipboard: (notes: Array<Omit<BeatNote, "id">> | null) => void;
  // Derived
  rollNotes: BeatNote[];
  editingNotes: BeatNote[];
  isEditingProgram: boolean;
  otherTracksNotes: BeatNote[];
  trackHasNotes: Record<number, boolean>;
  // Actions
  loadMidi: (parsed: MidiData, name: string) => void;
  addTrack: () => void;
  deleteTrack: (id: number) => void;
  renameTrack: (id: number, name: string) => void;
  setInstrument: (id: number, instrument: string) => void;
  updateNotes: (trackId: number, notes: BeatNote[]) => void;
  exportMidi: () => void;
}

const TracksContext = createContext<TracksContextValue | null>(null);

export function TracksProvider({ children }: { children: React.ReactNode }) {
  const {
    rollRootNote,
    setRollRootNote,
    setTotalBeats,
    setBpm,
    setTimeSig,
    setScale,
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
  const [clipboard, setClipboard] = useState<Array<
    Omit<BeatNote, "id">
  > | null>(null);

  const rollNotes = allTracksNotes[trackIndex] ?? [];
  const editingNotes = allTracksNotes[editingTrackIndex] ?? [];
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
    const rootNote = progResult?.rootNote ?? rollRootNote;
    const maxBeat = progNotes.reduce(
      (m, n) => Math.max(m, n.beatStart + n.durationBeats),
      1,
    );

    setRollRootNote(rootNote);
    setTotalBeats(Math.ceil(maxBeat / 4) * 4 + 4);
    setEditingTrackIndex(trackIndex);

    if (isFreshLoad) {
      const startIdx = parsedMidi.tracks.length > 1 ? 1 : 0;
      const newNotes: Record<number, BeatNote[]> = {};
      for (let i = startIdx; i < parsedMidi.tracks.length; i++) {
        newNotes[i] =
          i === trackIndex ? progNotes : trackToBeatNotes(parsedMidi, i);
      }
      setAllTracksNotes(newNotes);
    } else {
      setAllTracksNotes((prev) => ({ ...prev, [trackIndex]: progNotes }));
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

    let foundTempo = false,
      foundTimeSig = false,
      foundKeySig = false;
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
    setTracks((prev) => [...prev, newTrack]);
    setAllTracksNotes((prev) => ({ ...prev, [nextId]: [] }));
    setEditingTrackIndex(nextId);
  }

  function deleteTrack(id: number) {
    if (tracks.length <= 1) return;
    setTracks((prev) => prev.filter((t) => t.id !== id));
    setAllTracksNotes((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (trackIndex === id) {
      const fallback = tracks.find((t) => t.id !== id)!.id;
      setTrackIndex(fallback);
      setEditingTrackIndex(fallback);
    } else if (editingTrackIndex === id) {
      setEditingTrackIndex(trackIndex);
    }
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
    );
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
    clipboard,
    setClipboard,
    rollNotes,
    editingNotes,
    isEditingProgram,
    otherTracksNotes,
    trackHasNotes,
    loadMidi,
    addTrack,
    deleteTrack,
    renameTrack,
    setInstrument,
    updateNotes,
    exportMidi,
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
