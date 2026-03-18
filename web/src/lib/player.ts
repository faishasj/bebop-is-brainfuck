import Soundfont, { type Player } from "soundfont-player";
import { type MidiData } from "./transpiler.js";
import { NOTE_NAMES } from "./piano.js";
import { type TrackCCEvents, getLastCCBefore } from "./automationTypes.js";

export type RUN_MODE = "notes" | "live" | "batch";

export type PLAY_MODE = "all" | "program" | "current";

export const DEFAULT_INSTRUMENT = "acoustic_grand_piano";

export function getMidiNoteName(midiNumber: number): string {
  const octave = Math.floor(midiNumber / 12) - 1;
  const name = NOTE_NAMES[midiNumber % 12];
  return `${name}${octave}`;
}

// Singleton state — shared across both app tabs.
let audioCtx: AudioContext | null = null;
const instrumentCache: Map<string, Promise<Player>> = new Map();
let playbackTimeoutId: ReturnType<typeof setTimeout> | null = null;
let playbackStartAudioTime = 0;
let playbackSecPerBeat = 0;

// Returns the current playback position in beats.
// Called from an rAF loop in App.tsx while isPlaying.
export function getPlaybackBeat(): number {
  if (!audioCtx) return 0;
  return (audioCtx.currentTime - playbackStartAudioTime) / playbackSecPerBeat;
}

// Must be called from a user-gesture handler (click) to satisfy browser autoplay policy.
function getAudioContext(): AudioContext {
  if (!audioCtx || audioCtx.state === "closed") {
    audioCtx = new AudioContext();
    instrumentCache.clear(); // stale players belong to the old context
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

// Load a soundfont instrument by name. Idempotent — returns the cached promise.
export async function loadInstrument(
  name = DEFAULT_INSTRUMENT,
): Promise<Player> {
  const ac = getAudioContext();
  let promise = instrumentCache.get(name);
  if (!promise) {
    promise = Soundfont.instrument(ac, name as Soundfont.InstrumentName, {
      format: "ogg",
    });
    instrumentCache.set(name, promise);
  }
  return promise;
}

export interface BeatNote {
  noteNumber: number;
  beatStart: number;
  durationBeats: number;
  velocity: number;
  instrument?: string;
}

// Play a sequence of beat-based notes at the given BPM.
// startBeat allows playback to begin at an arbitrary position.
// ccEvents: optional per-track automation — attack (CC73) and release (CC72) are
// applied to each note's soundfont envelope. Values are scaled to seconds.
// Returns the remaining duration in seconds from startBeat so the caller can set a completion timer.
export async function playBeatNotes(
  notes: BeatNote[],
  bpm: number,
  startBeat = 0,
  ccEvents?: TrackCCEvents,
): Promise<{ totalDurationSec: number }> {
  const ac = getAudioContext();
  const secPerBeat = 60 / bpm;
  const now = ac.currentTime + 0.05; // small offset to avoid scheduling in the past
  // Offset start time so getPlaybackBeat() returns startBeat immediately
  playbackStartAudioTime = now - startBeat * secPerBeat;
  playbackSecPerBeat = secPerBeat;

  // Group notes by instrument and load all needed instruments in parallel
  const byInstrument = new Map<string, BeatNote[]>();
  for (const note of notes) {
    const inst = note.instrument ?? DEFAULT_INSTRUMENT;
    if (!byInstrument.has(inst)) byInstrument.set(inst, []);
    byInstrument.get(inst)!.push(note);
  }

  let maxAbsoluteEndSec = 0;
  await Promise.all(
    Array.from(byInstrument.entries()).map(async ([instName, instNotes]) => {
      const player = await loadInstrument(instName);
      for (const note of instNotes) {
        const noteEndBeat = note.beatStart + note.durationBeats;
        if (noteEndBeat <= startBeat) continue; // already finished before startBeat

        // Notes that started before startBeat are clipped to start now
        const clippedStartSec =
          Math.max(0, note.beatStart - startBeat) * secPerBeat;
        const skippedSec = Math.max(0, startBeat - note.beatStart) * secPerBeat;
        const clippedDurationSec = note.durationBeats * secPerBeat - skippedSec;
        if (clippedDurationSec <= 0) continue;

        const gain = note.velocity / 127;
        // Apply attack/release from CC events (CC73/CC72) scaled to seconds.
        const attackRaw = ccEvents ? getLastCCBefore(ccEvents.attack, note.beatStart) : null;
        const releaseRaw = ccEvents ? getLastCCBefore(ccEvents.release, note.beatStart) : null;
        const attackSec = attackRaw !== null ? (attackRaw / 127) * 2 : undefined;
        const releaseSec = releaseRaw !== null ? (releaseRaw / 127) * 4 : undefined;
        player.play(getMidiNoteName(note.noteNumber), now + clippedStartSec, {
          duration: clippedDurationSec,
          gain,
          ...(attackSec !== undefined ? { attack: attackSec } : {}),
          ...(releaseSec !== undefined ? { release: releaseSec } : {}),
        });

        const absEndSec =
          note.beatStart * secPerBeat + note.durationBeats * secPerBeat;
        if (absEndSec > maxAbsoluteEndSec) maxAbsoluteEndSec = absEndSec;
      }
    }),
  );

  // Return remaining duration from startBeat
  const remainingDurationSec = Math.max(
    0,
    maxAbsoluteEndSec - startBeat * secPerBeat,
  );
  return { totalDurationSec: remainingDurationSec };
}

// Play the selected track of a parsed MIDI file at the given BPM.
export async function playParsedMidiTrack(
  parsedMidi: MidiData,
  trackIndex: number,
  bpm: number,
): Promise<{ totalDurationSec: number }> {
  const track = parsedMidi.tracks[trackIndex];
  if (!track) return { totalDurationSec: 0 };

  const ticksPerBeat = parsedMidi.header.ticksPerBeat ?? 480;
  const secPerTick = 60 / (bpm * ticksPerBeat);

  // Walk events, build open note map, emit note events when noteOff found.
  const openNotes: Map<number, { startTick: number; velocity: number }> =
    new Map();
  const noteEvents: Array<{
    noteNumber: number;
    startSec: number;
    durationSec: number;
    velocity: number;
  }> = [];
  let absoluteTick = 0;

  for (const event of track) {
    absoluteTick += event.deltaTime;
    if (event.type === "noteOn" && event.velocity > 0) {
      openNotes.set(event.noteNumber, {
        startTick: absoluteTick,
        velocity: event.velocity,
      });
    } else if (
      event.type === "noteOff" ||
      (event.type === "noteOn" && event.velocity === 0)
    ) {
      const open = openNotes.get(event.noteNumber);
      if (open) {
        noteEvents.push({
          noteNumber: event.noteNumber,
          startSec: open.startTick * secPerTick,
          durationSec: (absoluteTick - open.startTick) * secPerTick,
          velocity: open.velocity,
        });
        openNotes.delete(event.noteNumber);
      }
    }
  }
  // Close any notes that have no matching noteOff with a short default duration.
  const defaultDurationSec = ticksPerBeat * 0.5 * secPerTick;
  for (const [noteNumber, open] of openNotes) {
    noteEvents.push({
      noteNumber,
      startSec: open.startTick * secPerTick,
      durationSec: defaultDurationSec,
      velocity: open.velocity,
    });
  }

  if (noteEvents.length === 0) return { totalDurationSec: 0 };

  const player = await loadInstrument();
  const ac = getAudioContext();
  const now = ac.currentTime + 0.05;

  let maxEndSec = 0;
  for (const evt of noteEvents) {
    const gain = evt.velocity / 127;
    player.play(getMidiNoteName(evt.noteNumber), now + evt.startSec, {
      duration: evt.durationSec,
      gain,
    });
    const endSec = evt.startSec + evt.durationSec;
    if (endSec > maxEndSec) maxEndSec = endSec;
  }

  return { totalDurationSec: maxEndSec };
}

// Play all tracks of a parsed MIDI file at the given BPM.
export async function playAllMidiTracks(
  parsedMidi: MidiData,
  bpm: number,
): Promise<{ totalDurationSec: number }> {
  const ticksPerBeat = parsedMidi.header.ticksPerBeat ?? 480;
  const secPerTick = 60 / (bpm * ticksPerBeat);

  const noteEvents: Array<{
    noteNumber: number;
    startSec: number;
    durationSec: number;
    velocity: number;
  }> = [];

  for (const track of parsedMidi.tracks) {
    const openNotes: Map<number, { startTick: number; velocity: number }> =
      new Map();
    let absoluteTick = 0;

    for (const event of track) {
      absoluteTick += event.deltaTime;
      if (event.type === "noteOn" && event.velocity > 0) {
        openNotes.set(event.noteNumber, {
          startTick: absoluteTick,
          velocity: event.velocity,
        });
      } else if (
        event.type === "noteOff" ||
        (event.type === "noteOn" && event.velocity === 0)
      ) {
        const open = openNotes.get(event.noteNumber);
        if (open) {
          noteEvents.push({
            noteNumber: event.noteNumber,
            startSec: open.startTick * secPerTick,
            durationSec: (absoluteTick - open.startTick) * secPerTick,
            velocity: open.velocity,
          });
          openNotes.delete(event.noteNumber);
        }
      }
    }
    const defaultDurationSec = ticksPerBeat * 0.5 * secPerTick;
    for (const [noteNumber, open] of openNotes) {
      noteEvents.push({
        noteNumber,
        startSec: open.startTick * secPerTick,
        durationSec: defaultDurationSec,
        velocity: open.velocity,
      });
    }
  }

  if (noteEvents.length === 0) return { totalDurationSec: 0 };

  const player = await loadInstrument();
  const ac = getAudioContext();
  const now = ac.currentTime + 0.05;

  let maxEndSec = 0;
  for (const evt of noteEvents) {
    const gain = evt.velocity / 127;
    player.play(getMidiNoteName(evt.noteNumber), now + evt.startSec, {
      duration: evt.durationSec,
      gain,
    });
    const endSec = evt.startSec + evt.durationSec;
    if (endSec > maxEndSec) maxEndSec = endSec;
  }

  return { totalDurationSec: maxEndSec };
}

// Play a single note immediately (e.g. for audition on note placement).
export async function playNote(
  noteNumber: number,
  durationBeats: number,
  bpm: number,
  instrument = DEFAULT_INSTRUMENT,
): Promise<void> {
  const player = await loadInstrument(instrument);
  const ac = getAudioContext();
  const durationSec = (durationBeats / bpm) * 60;
  player.play(getMidiNoteName(noteNumber), ac.currentTime, {
    duration: durationSec,
    gain: 0.8,
  });
}

// Stop all currently playing notes.
export function stopPlayback() {
  for (const promise of instrumentCache.values()) {
    promise.then((player) => player.stop());
  }
  if (playbackTimeoutId !== null) {
    clearTimeout(playbackTimeoutId);
    playbackTimeoutId = null;
  }
}
