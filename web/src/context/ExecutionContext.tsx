import {
  createContext,
  useContext,
  useState,
  useRef,
  useMemo,
  useCallback,
  useEffect,
} from "react";
import { transpile, type NoteCommand } from "../lib/transpiler.js";
import { runBrainfuck } from "../lib/interpreter.js";
import { StepInterpreter } from "../lib/stepInterpreter.js";
import {
  type BeatNote,
  DEFAULT_INSTRUMENT,
  loadInstrument,
  playBeatNotes,
  stopPlayback,
  getPlaybackBeat,
  PLAY_MODE,
  RUN_MODE,
} from "../lib/player.js";
import { notesToParsedMidi } from "../lib/midiExport.js";
import { useComposition } from "./CompositionContext.js";
import { useTracks } from "./TracksContext.js";

const SNAPSHOT_WINDOW = 512;

export interface TapeSnapshot {
  dp: number;
  windowStart: number;
  cells: Uint8Array;
}

interface ExecutionContextValue {
  isPlaying: boolean;
  currentBeat: number;
  playMode: PLAY_MODE;
  setPlayMode: (mode: PLAY_MODE) => void;
  runMode: RUN_MODE;
  setRunMode: (mode: RUN_MODE) => void;
  stdin: string;
  setStdin: (s: string) => void;
  output: string;
  error: string | null;
  hasRun: boolean;
  liveDisplayedOutput: string;
  liveInputPending: boolean;
  liveTapeState: TapeSnapshot | null;
  // Derived
  brainfuck: string;
  noteCommands: NoteCommand[];
  transpileError: string | null;
  activeBfCharIndex: number;
  canResume: boolean;
  loopHighlightBeats: Set<number>;
  loopHighlightCharRange: [number, number] | null;
  loopHighlightCells: Set<number>;
  // Breakpoints
  breakpoints: Set<number>;
  isPausedAtBreakpoint: boolean;
  toggleBreakpoint: (beat: number) => void;
  clearBreakpoints: () => void;
  stepBeat: () => void;
  continueFromBreakpoint: () => void;
  // Ref for the live stdin input field
  stdinInputRef: React.RefObject<HTMLInputElement | null>;
  // Actions
  run: (mode?: PLAY_MODE) => void;
  stop: () => void;
  resetPlayhead: () => void;
  scrub: (beat: number) => void;
  submitLiveInput: (char: string) => void;
}

const ExecutionContext = createContext<ExecutionContextValue | null>(null);

export function ExecutionProvider({ children }: { children: React.ReactNode }) {
  const { scale, bpm, timeSig, rollRootNote, rootNoteDuration } =
    useComposition();
  const {
    rollNotes,
    editingNotes,
    allTracksNotes,
    allTracksCCEvents,
    tracks,
    trackIndex,
    editingTrackIndex,
    parsedMidi,
  } = useTracks();

  const [isPlaying, setIsPlaying] = useState(false);
  const [playMode, setPlayMode] = useState<PLAY_MODE>("all");
  const [currentBeat, setCurrentBeat] = useState(0);
  const [runMode, setRunMode] = useState<RUN_MODE>("live");
  const [stdin, setStdin] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hasRun, setHasRun] = useState(false);
  const [liveInputPending, setLiveInputPending] = useState(false);
  const [liveDisplayedOutput, setLiveDisplayedOutput] = useState("");
  const [breakpoints, setBreakpoints] = useState<Set<number>>(new Set());
  const [isPausedAtBreakpoint, setIsPausedAtBreakpoint] = useState(false);

  const playbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);
  const liveInterpreterRef = useRef<StepInterpreter | null>(null);
  const liveOutputQueueRef = useRef<string[]>([]);
  const liveOutputConsumedRef = useRef(0);
  const liveDotCommandsRef = useRef<NoteCommand[]>([]);
  const liveOutputPerDotRef = useRef<number[]>([]);
  const liveCommaCommandsRef = useRef<NoteCommand[]>([]);
  const liveDotIdxRef = useRef(0);
  const liveCommaIdxRef = useRef(0);
  const liveInputPendingRef = useRef(false);
  const breakpointsRef = useRef<Set<number>>(breakpoints);
  breakpointsRef.current = breakpoints;
  const playbackStartBeatRef = useRef<number>(0);
  const isPausedAtBreakpointRef = useRef(false);
  const noteCommandsRef = useRef<NoteCommand[]>([]);
  const liveTapeSnapshotsRef = useRef<TapeSnapshot[]>([]);
  const visitedCharIndicesRef = useRef<Set<number>>(new Set());
  const snapMapRef = useRef<Map<number, TapeSnapshot>>(new Map());
  const [liveTapeState, setLiveTapeState] = useState<TapeSnapshot | null>(null);
  const stdinInputRef = useRef<HTMLInputElement>(null);

  // Sync refs for use in closures
  const currentBeatRef = useRef(0);
  currentBeatRef.current = currentBeat;
  const hasRunRef = useRef(false);
  hasRunRef.current = hasRun;
  const isPlayingRef = useRef(false);
  isPlayingRef.current = isPlaying;
  const playModeRef = useRef(playMode);
  playModeRef.current = playMode;
  const rollNotesRef = useRef(rollNotes);
  rollNotesRef.current = rollNotes;
  const editingNotesRef = useRef(editingNotes);
  editingNotesRef.current = editingNotes;
  const allTracksNotesRef = useRef(allTracksNotes);
  allTracksNotesRef.current = allTracksNotes;
  const allTracksCCEventsRef = useRef(allTracksCCEvents);
  allTracksCCEventsRef.current = allTracksCCEvents;
  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;
  const trackIndexRef = useRef(trackIndex);
  trackIndexRef.current = trackIndex;
  const editingTrackIndexRef = useRef(editingTrackIndex);
  editingTrackIndexRef.current = editingTrackIndex;
  const rollRootNoteRef = useRef(rollRootNote);
  rollRootNoteRef.current = rollRootNote;
  const bpmRef = useRef(bpm);
  bpmRef.current = bpm;

  const liveMode = runMode === "live";

  // ── Live BF transpilation ─────────────────────────────────────────────────
  const { brainfuck, noteCommands, transpileError } = useMemo(() => {
    if (rollNotes.length === 0)
      return { brainfuck: "", noteCommands: [], transpileError: null };
    const fakeMidi = notesToParsedMidi(
      rollNotes,
      rollRootNote,
      bpm,
      timeSig,
      scale,
      rootNoteDuration,
    );
    const {
      brainfuck: bf,
      error: tErr,
      noteCommands: nc,
    } = transpile(fakeMidi, 1, scale);
    return {
      brainfuck: bf ?? "",
      noteCommands: nc ?? [],
      transpileError: tErr ?? null,
    };
  }, [rollNotes, rollRootNote, bpm, timeSig, scale, rootNoteDuration]);
  // Keep noteCommandsRef in sync
  noteCommandsRef.current = noteCommands;
  // ── Active BF char index ──────────────────────────────────────────────────
  const activeBfCharIndex = useMemo(() => {
    if ((!isPlaying && !isPausedAtBreakpoint) || noteCommands.length === 0)
      return -1;
    let idx = -1;
    for (const nc of noteCommands) {
      if (nc.beatStart <= currentBeat) idx = nc.charIndex;
      else break;
    }
    return idx;
  }, [isPlaying, isPausedAtBreakpoint, currentBeat, noteCommands]);

  // ── Bracket pair map (for loop highlight) ─────────────────────────────────
  const bracketMap = useMemo(() => {
    const map = new Map<number, number>();
    const stack: number[] = [];
    for (let i = 0; i < brainfuck.length; i++) {
      if (brainfuck[i] === "[") stack.push(i);
      else if (brainfuck[i] === "]") {
        const open = stack.pop()!;
        map.set(i, open);
        map.set(open, i);
      }
    }
    return map;
  }, [brainfuck]);

  // ── Loop body highlight: active when playhead is on a `]` note ────────────
  const loopHighlightBeats = useMemo(() => {
    if (activeBfCharIndex < 0 || brainfuck[activeBfCharIndex] !== "]")
      return new Set<number>();
    const openIdx = bracketMap.get(activeBfCharIndex);
    if (openIdx === undefined) return new Set<number>();
    const beats = new Set<number>();
    for (const nc of noteCommands) {
      if (nc.charIndex >= openIdx && nc.charIndex < activeBfCharIndex) {
        beats.add(nc.beatStart);
      }
    }
    return beats;
  }, [activeBfCharIndex, brainfuck, bracketMap, noteCommands]);

  // ── Loop highlight: BF char range [open, close] ───────────────────────────
  const loopHighlightCharRange = useMemo((): [number, number] | null => {
    if (activeBfCharIndex < 0 || brainfuck[activeBfCharIndex] !== "]")
      return null;
    const openIdx = bracketMap.get(activeBfCharIndex);
    if (openIdx === undefined) return null;
    return [openIdx, activeBfCharIndex];
  }, [activeBfCharIndex, brainfuck, bracketMap]);

  // ── Loop highlight: tape cells that changed between [ and ] snapshots ─────
  const loopHighlightCells = useMemo(() => {
    if (activeBfCharIndex < 0 || brainfuck[activeBfCharIndex] !== "]")
      return new Set<number>();
    const openCharIdx = bracketMap.get(activeBfCharIndex);
    if (openCharIdx === undefined) return new Set<number>();

    const snaps = liveTapeSnapshotsRef.current;
    const cmds = noteCommandsRef.current;
    const openCmdIdx = cmds.findIndex((c) => c.charIndex === openCharIdx);
    const closeCmdIdx = cmds.findIndex((c) => c.charIndex === activeBfCharIndex);
    if (openCmdIdx < 0 || closeCmdIdx < 0 || !snaps.length)
      return new Set<number>();

    const before = snaps[openCmdIdx];
    const after = snaps[closeCmdIdx];
    if (!before || !after) return new Set<number>();

    const changed = new Set<number>();
    const lo = Math.min(before.windowStart, after.windowStart);
    const hi = Math.max(
      before.windowStart + before.cells.length,
      after.windowStart + after.cells.length,
    );
    for (let i = lo; i < hi; i++) {
      const bOff = i - before.windowStart;
      const aOff = i - after.windowStart;
      const bVal = bOff >= 0 && bOff < before.cells.length ? before.cells[bOff] : 0;
      const aVal = aOff >= 0 && aOff < after.cells.length ? after.cells[aOff] : 0;
      if (bVal !== aVal) changed.add(i);
    }
    return changed;
  }, [activeBfCharIndex, brainfuck, bracketMap]);

  const canResume =
    currentBeat > 0 &&
    !isPlaying &&
    !liveInputPending &&
    !isPausedAtBreakpoint &&
    (runMode === "notes" || hasRun);

  // ── Reset run state when program notes are edited ─────────────────────────
  useEffect(() => {
    if (!hasRunRef.current && !isPlayingRef.current) return;
    stopPlayback();
    stopRaf();
    setIsPlaying(false);
    setCurrentBeat(0);
    setOutput("");
    setLiveDisplayedOutput("");
    setError(null);
    setHasRun(false);
    setLiveInputPending(false);
    liveInputPendingRef.current = false;
    liveInterpreterRef.current = null;
    liveTapeSnapshotsRef.current = [];
    visitedCharIndicesRef.current = new Set();
    snapMapRef.current = new Map();
    setLiveTapeState(null);
    setIsPausedAtBreakpoint(false);
    isPausedAtBreakpointRef.current = false;
    playbackStartBeatRef.current = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rollNotes]);

  // ── Reset execution state when a new MIDI file is loaded ──────────────────
  useEffect(() => {
    if (!parsedMidi) return;
    stop();
    setCurrentBeat(0);
    setOutput("");
    setError(null);
    setHasRun(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedMidi]);

  // ── Auto-focus stdin when live input is needed ────────────────────────────
  useEffect(() => {
    if (liveInputPending) stdinInputRef.current?.focus();
  }, [liveInputPending]);

  // ── rAF loop ──────────────────────────────────────────────────────────────
  function startRaf() {
    function tick() {
      const beat = getPlaybackBeat();
      setCurrentBeat(beat);

      if (
        liveMode &&
        liveInterpreterRef.current &&
        !liveInputPendingRef.current
      ) {
        const dots = liveDotCommandsRef.current;
        const perDot = liveOutputPerDotRef.current;
        while (
          liveDotIdxRef.current < dots.length &&
          dots[liveDotIdxRef.current].beatStart <= beat &&
          liveOutputConsumedRef.current < liveOutputQueueRef.current.length
        ) {
          const count = perDot[liveDotIdxRef.current] ?? 1;
          liveOutputConsumedRef.current += count;
          liveDotIdxRef.current++;
        }
        setLiveDisplayedOutput(
          liveOutputQueueRef.current
            .slice(0, liveOutputConsumedRef.current)
            .join(""),
        );

        const snaps = liveTapeSnapshotsRef.current;
        const nc = noteCommandsRef.current;
        let tapeIdx = -1;
        for (let i = 0; i < nc.length; i++) {
          if (nc[i].beatStart <= beat) tapeIdx = i;
          else break;
        }
        if (tapeIdx >= 0 && tapeIdx < snaps.length) {
          setLiveTapeState(snaps[tapeIdx]);
        }

        const commas = liveCommaCommandsRef.current;
        if (
          liveCommaIdxRef.current < commas.length &&
          commas[liveCommaIdxRef.current].beatStart <= beat
        ) {
          stopPlayback();
          stopRaf();
          setIsPlaying(false);
          setLiveInputPending(true);
          liveInputPendingRef.current = true;
          return;
        }
      }

      // ── Breakpoint check ──────────────────────────────────────────
      if (breakpointsRef.current.size > 0) {
        for (const bp of breakpointsRef.current) {
          if (beat >= bp && bp > playbackStartBeatRef.current) {
            stopPlayback();
            stopRaf();
            if (playbackTimeoutRef.current !== null) {
              clearTimeout(playbackTimeoutRef.current);
              playbackTimeoutRef.current = null;
            }
            setIsPlaying(false);
            setIsPausedAtBreakpoint(true);
            isPausedAtBreakpointRef.current = true;
            console.log("[breakpoint] paused at beat=%f, bp=%f, playbackStart=%f", beat, bp, playbackStartBeatRef.current);
            return;
          }
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
  }

  function stopRaf() {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }

  // ── Playback ──────────────────────────────────────────────────────────────
  function stop() {
    stopPlayback();
    stopRaf();
    if (playbackTimeoutRef.current !== null) {
      clearTimeout(playbackTimeoutRef.current);
      playbackTimeoutRef.current = null;
    }
    setIsPlaying(false);
  }

  function schedulePlaybackEnd(remainingDurationSec: number) {
    playbackTimeoutRef.current = setTimeout(
      () => {
        stopRaf();
        setIsPlaying(false);
        setCurrentBeat(0);
        if (liveMode) {
          if (
            liveOutputQueueRef.current.length > liveOutputConsumedRef.current
          ) {
            setLiveDisplayedOutput(liveOutputQueueRef.current.join(""));
          }
          // Show true final tape state when playback ends
          const interp = liveInterpreterRef.current;
          if (interp) {
            const dp = interp.getDP();
            const tape = interp.getTape();
            const half = SNAPSHOT_WINDOW >> 1;
            const start = Math.max(0, dp - half);
            const end = Math.min(tape.length, start + SNAPSHOT_WINDOW);
            setLiveTapeState({
              dp,
              windowStart: start,
              cells: tape.slice(start, end),
            });
          }
        }
      },
      remainingDurationSec * 1000 + 300,
    );
  }

  async function handlePlay(
    mode: PLAY_MODE = playModeRef.current,
    fromBeat = currentBeatRef.current,
  ) {
    const currentTracks = tracksRef.current;
    const currentTrackIndex = trackIndexRef.current;
    const currentEditingTrackIndex = editingTrackIndexRef.current;
    const getInstrument = (id: number) =>
      currentTracks.find((t) => t.id === id)?.instrument ?? DEFAULT_INSTRUMENT;

    let notesToPlay: BeatNote[];
    if (mode === "program") {
      notesToPlay = rollNotesRef.current.map((n) => ({
        ...n,
        instrument: getInstrument(currentTrackIndex),
        trackId: currentTrackIndex,
      }));
    } else if (mode === "current") {
      notesToPlay = editingNotesRef.current.map((n) => ({
        ...n,
        instrument: getInstrument(currentEditingTrackIndex),
        trackId: currentEditingTrackIndex,
      }));
    } else {
      notesToPlay = [];
      for (const [key, notes] of Object.entries(allTracksNotesRef.current)) {
        const id = Number(key);
        notesToPlay.push(
          ...notes.map((n) => ({
            ...n,
            instrument: getInstrument(id),
            trackId: id,
          })),
        );
      }
    }

    if (notesToPlay.length === 0) return;
    stop();

    const rootNoteEvent: BeatNote = {
      noteNumber: rollRootNoteRef.current,
      beatStart: 0,
      durationBeats: 1,
      velocity: 100,
      instrument: getInstrument(currentTrackIndex),
      trackId: currentTrackIndex,
    };
    const includesProgram =
      mode !== "current" || currentEditingTrackIndex === currentTrackIndex;
    const playNotes = includesProgram
      ? [rootNoteEvent, ...notesToPlay]
      : notesToPlay;

    const instrumentNames = [
      ...new Set(playNotes.map((n) => n.instrument ?? DEFAULT_INSTRUMENT)),
    ];
    await Promise.all(instrumentNames.map((name) => loadInstrument(name)));

    playbackStartBeatRef.current = fromBeat;
    const { totalDurationSec } = await playBeatNotes(
      playNotes,
      bpmRef.current,
      fromBeat,
      allTracksCCEventsRef.current,
    );
    setIsPlaying(true);
    startRaf();
    schedulePlaybackEnd(totalDurationSec);
  }

  function scrub(beat: number) {
    setCurrentBeat(beat);
    if (isPlayingRef.current) {
      handlePlay(playModeRef.current, beat);
    }
  }

  // ── Breakpoint helpers ────────────────────────────────────────────────────
  function toggleBreakpoint(beat: number) {
    setBreakpoints((prev) => {
      const next = new Set(prev);
      if (next.has(beat)) next.delete(beat);
      else next.add(beat);
      return next;
    });
  }

  function clearBreakpoints() {
    setBreakpoints(new Set());
  }

  async function continueFromBreakpoint() {
    setIsPausedAtBreakpoint(false);
    isPausedAtBreakpointRef.current = false;
    handlePlay(playModeRef.current, currentBeatRef.current);
  }

  async function stepBeat() {
    const cur = currentBeatRef.current;
    const cmds = noteCommandsRef.current;
    const next = cmds.find((nc) => nc.beatStart > cur);
    const isLastStep = !next;
    const targetBeat = next ? next.beatStart : cur;

    console.log("[stepBeat] cur=%f, targetBeat=%f, isLastStep=%s, totalCmds=%d",
      cur, targetBeat, isLastStep, cmds.length);
    console.log("[stepBeat] cmd beats:", cmds.map((c) => c.beatStart));

    // Move playhead to next program note beat
    setCurrentBeat(targetBeat);

    // Play notes in the stepped range [cur, targetBeat)
    // On the last step, include the note at cur: [cur, cur]
    const mode = playModeRef.current;
    const currentTracks = tracksRef.current;
    const currentTrackIndex = trackIndexRef.current;
    const currentEditingTrackIndex = editingTrackIndexRef.current;
    const getInstrument = (id: number) =>
      currentTracks.find((t) => t.id === id)?.instrument ?? DEFAULT_INSTRUMENT;

    let notesToPlay: BeatNote[];
    if (mode === "program") {
      notesToPlay = rollNotesRef.current.map((n) => ({
        ...n,
        instrument: getInstrument(currentTrackIndex),
        trackId: currentTrackIndex,
      }));
    } else if (mode === "current") {
      notesToPlay = editingNotesRef.current.map((n) => ({
        ...n,
        instrument: getInstrument(currentEditingTrackIndex),
        trackId: currentEditingTrackIndex,
      }));
    } else {
      notesToPlay = [];
      for (const [key, notes] of Object.entries(allTracksNotesRef.current)) {
        const id = Number(key);
        notesToPlay.push(
          ...notes.map((n) => ({
            ...n,
            instrument: getInstrument(id),
            trackId: id,
          })),
        );
      }
    }

    const stepNotes = isLastStep
      ? notesToPlay.filter((n) => n.beatStart >= cur && n.beatStart <= cur)
      : notesToPlay.filter(
          (n) => n.beatStart >= cur && n.beatStart < targetBeat,
        );

    console.log("[stepBeat] notesToPlay=%d, stepNotes=%d, stepNoteBeats:",
      notesToPlay.length, stepNotes.length, stepNotes.map((n) => n.beatStart));

    if (stepNotes.length > 0) {
      const instrumentNames = [
        ...new Set(stepNotes.map((n) => n.instrument ?? DEFAULT_INSTRUMENT)),
      ];
      await Promise.all(instrumentNames.map((name) => loadInstrument(name)));
      await playBeatNotes(
        stepNotes,
        bpmRef.current,
        cur,
        allTracksCCEventsRef.current,
      );
    }

    // Update live output/tape up to the new beat
    if (liveMode && liveInterpreterRef.current) {
      const dots = liveDotCommandsRef.current;
      const perDot = liveOutputPerDotRef.current;
      const dotIdxBefore = liveDotIdxRef.current;
      const consumedBefore = liveOutputConsumedRef.current;
      while (
        liveDotIdxRef.current < dots.length &&
        dots[liveDotIdxRef.current].beatStart <= targetBeat &&
        liveOutputConsumedRef.current < liveOutputQueueRef.current.length
      ) {
        const count = perDot[liveDotIdxRef.current] ?? 1;
        liveOutputConsumedRef.current += count;
        liveDotIdxRef.current++;
      }
      const displayed = liveOutputQueueRef.current
        .slice(0, liveOutputConsumedRef.current)
        .join("");
      setLiveDisplayedOutput(displayed);
      console.log("[stepBeat] output: dotIdx %d→%d, consumed %d→%d, displayed=%s, totalDots=%d, totalQueue=%d, perDot=%s",
        dotIdxBefore, liveDotIdxRef.current,
        consumedBefore, liveOutputConsumedRef.current,
        JSON.stringify(displayed),
        dots.length, liveOutputQueueRef.current.length,
        JSON.stringify(perDot));
      if (liveDotIdxRef.current < dots.length) {
        console.log("[stepBeat] next dot beat:", dots[liveDotIdxRef.current].beatStart);
      }
      const snaps = liveTapeSnapshotsRef.current;
      const nc = noteCommandsRef.current;
      let tapeIdx = -1;
      for (let i = 0; i < nc.length; i++) {
        if (nc[i].beatStart <= targetBeat) tapeIdx = i;
        else break;
      }
      if (tapeIdx >= 0 && tapeIdx < snaps.length) {
        setLiveTapeState(snaps[tapeIdx]);
      }
      console.log("[stepBeat] tapeIdx=%d, snapsLen=%d", tapeIdx, snaps.length);
    }

    // After playing the last note, finish
    if (isLastStep) {
      console.log("[stepBeat] isLastStep — resetting session");
      setIsPausedAtBreakpoint(false);
      isPausedAtBreakpointRef.current = false;
      setCurrentBeat(0);
      setIsPlaying(false);
    }
  }

  // ── Live interpretation helpers ───────────────────────────────────────────
  function captureSnapshot(interp: StepInterpreter): TapeSnapshot {
    const dp = interp.getDP();
    const tape = interp.getTape();
    const half = SNAPSHOT_WINDOW >> 1;
    const start = Math.max(0, dp - half);
    const end = Math.min(tape.length, start + SNAPSHOT_WINDOW);
    return { dp, windowStart: start, cells: tape.slice(start, end) };
  }

  function drainAndSnapshot(): "input" | "done" {
    const interp = liveInterpreterRef.current;
    if (!interp) return "done";
    const visited = visitedCharIndicesRef.current;
    const snapMap = snapMapRef.current;
    const outputCountPerCharIndex = new Map<number, number>();

    while (true) {
      const ip = interp.getIP();
      const isFirstVisit = !visited.has(ip);
      const r = interp.stepSingle();

      // Snapshot after execution on first visit to each charIndex
      if (isFirstVisit && (r === null || r?.type === "output")) {
        visited.add(ip);
        snapMap.set(ip, captureSnapshot(interp));
      }

      if (r === null) continue;

      if (r.type === "output") {
        liveOutputQueueRef.current.push(r.char);
        outputCountPerCharIndex.set(
          ip,
          (outputCountPerCharIndex.get(ip) ?? 0) + 1,
        );
        continue;
      }

      if (r.type === "done" && r.error) setError(r.error);

      // Build per-noteCommand snapshot array
      const cmds = noteCommandsRef.current;
      const fallback = captureSnapshot(interp);
      liveTapeSnapshotsRef.current = cmds.map(
        (c) => snapMap.get(c.charIndex) ?? fallback,
      );

      // Build per-dot output count (how many chars each `.` note produces)
      liveOutputPerDotRef.current = liveDotCommandsRef.current.map(
        (d) => outputCountPerCharIndex.get(d.charIndex) ?? 1,
      );

      return r.type as "input" | "done";
    }
  }

  function submitLiveInput(char: string) {
    const ch = char.length > 0 ? char.charCodeAt(0) : 0;
    setLiveInputPending(false);
    liveInputPendingRef.current = false;
    liveCommaIdxRef.current++;
    liveInterpreterRef.current?.provideInput(ch);
    drainAndSnapshot();
    handlePlay(playModeRef.current, currentBeatRef.current);
  }

  // ── Run ───────────────────────────────────────────────────────────────────
  const run = useCallback(
    (mode: PLAY_MODE = playModeRef.current) => {
      if (rollNotes.length === 0) return;

      const resumeBeat = currentBeatRef.current;
      if (resumeBeat > 0 && (runMode === "notes" || hasRun)) {
        handlePlay(mode, resumeBeat);
        return;
      }

      setError(null);
      setOutput("");
      setHasRun(true);

      if (transpileError) {
        setError(transpileError);
        return;
      }

      if (runMode === "notes") {
        handlePlay(mode, 0);
        return;
      }

      if (!liveMode) {
        const { output: out, error: iErr } = runBrainfuck(brainfuck, stdin);
        setOutput(out);
        if (iErr) setError(iErr);
        handlePlay(mode, 0);
        return;
      }

      setLiveDisplayedOutput("");
      setLiveInputPending(false);
      liveInputPendingRef.current = false;
      liveOutputQueueRef.current = [];
      liveOutputConsumedRef.current = 0;
      liveDotIdxRef.current = 0;
      liveOutputPerDotRef.current = [];
      liveCommaIdxRef.current = 0;
      liveTapeSnapshotsRef.current = [];
      visitedCharIndicesRef.current = new Set();
      snapMapRef.current = new Map();
      setLiveTapeState({
        dp: 0,
        windowStart: 0,
        cells: new Uint8Array(SNAPSHOT_WINDOW),
      });

      liveDotCommandsRef.current = noteCommands.filter(
        (c) => brainfuck[c.charIndex] === ".",
      );
      liveCommaCommandsRef.current = noteCommands.filter(
        (c) => brainfuck[c.charIndex] === ",",
      );

      const stepInterpreter = new StepInterpreter(brainfuck);
      if (stepInterpreter.initError) {
        setError(stepInterpreter.initError);
        return;
      }
      liveInterpreterRef.current = stepInterpreter;
      drainAndSnapshot();
      handlePlay(mode, 0);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      rollNotes,
      stdin,
      allTracksNotes,
      allTracksCCEvents,
      tracks,
      runMode,
      hasRun,
      brainfuck,
      noteCommands,
      transpileError,
    ],
  );

  function resetPlayhead() {
    setCurrentBeat(0);
    setOutput("");
    setLiveDisplayedOutput("");
    setError(null);
    setHasRun(false);
    liveInterpreterRef.current = null;
    liveTapeSnapshotsRef.current = [];
    visitedCharIndicesRef.current = new Set();
    snapMapRef.current = new Map();
    setLiveTapeState(null);
    setIsPausedAtBreakpoint(false);
    isPausedAtBreakpointRef.current = false;
    playbackStartBeatRef.current = 0;
  }

  // ── Global keyboard shortcut: space = play/pause ──────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tgt = e.target as HTMLElement | null;
      if (
        tgt &&
        (tgt.tagName === "INPUT" ||
          tgt.tagName === "TEXTAREA" ||
          tgt.isContentEditable)
      ) {
        return;
      }
      if (e.code === "Space" && !e.altKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        if (isPausedAtBreakpointRef.current) {
          continueFromBreakpoint();
        } else if (isPlayingRef.current) {
          stop();
        } else {
          run();
        }
        return;
      }
      if (
        e.code === "F10" &&
        !e.altKey &&
        !e.ctrlKey &&
        !e.metaKey &&
        isPausedAtBreakpointRef.current
      ) {
        e.preventDefault();
        stepBeat();
        return;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [run]);

  const value: ExecutionContextValue = {
    isPlaying,
    currentBeat,
    playMode,
    setPlayMode,
    runMode,
    setRunMode,
    stdin,
    setStdin,
    output,
    error,
    hasRun,
    liveDisplayedOutput,
    liveInputPending,
    liveTapeState,
    brainfuck,
    noteCommands,
    transpileError,
    activeBfCharIndex,
    canResume,
    loopHighlightBeats,
    loopHighlightCharRange,
    loopHighlightCells,
    breakpoints,
    isPausedAtBreakpoint,
    toggleBreakpoint,
    clearBreakpoints,
    stepBeat,
    continueFromBreakpoint,
    stdinInputRef,
    run,
    stop,
    resetPlayhead,
    scrub,
    submitLiveInput,
  };

  return (
    <ExecutionContext.Provider value={value}>
      {children}
    </ExecutionContext.Provider>
  );
}

export function useExecution() {
  const ctx = useContext(ExecutionContext);
  if (!ctx)
    throw new Error("useExecution must be used within ExecutionProvider");
  return ctx;
}
