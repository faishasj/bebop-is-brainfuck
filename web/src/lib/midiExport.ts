import { writeMidi, type MidiData } from "midi-file";
import { type BeatNote, DEFAULT_INSTRUMENT } from "./player.js";
import { type Scale } from "./scales.js";
import {
  type CCEvent,
  type TrackCCEvents,
  emptyTrackCCEvents,
} from "./automationTypes.js";

export const DEFAULT_FILENAME = "composition.mid";

// Instrument list with display labels and GM program numbers (0-indexed).
export const INSTRUMENTS: { value: string; label: string; gm: number }[] = [
  { value: "acoustic_grand_piano", label: "Grand Piano", gm: 0 },
  { value: "bright_acoustic_piano", label: "Bright Piano", gm: 1 },
  { value: "electric_piano_1", label: "Electric Piano", gm: 4 },
  { value: "harpsichord", label: "Harpsichord", gm: 6 },
  { value: "celesta", label: "Celesta", gm: 8 },
  { value: "music_box", label: "Music Box", gm: 10 },
  { value: "vibraphone", label: "Vibraphone", gm: 11 },
  { value: "marimba", label: "Marimba", gm: 12 },
  { value: "xylophone", label: "Xylophone", gm: 13 },
  { value: "tubular_bells", label: "Tubular Bells", gm: 14 },
  { value: "acoustic_guitar_nylon", label: "Nylon Guitar", gm: 24 },
  { value: "acoustic_guitar_steel", label: "Steel Guitar", gm: 25 },
  { value: "electric_guitar_clean", label: "Electric Guitar", gm: 27 },
  { value: "acoustic_bass", label: "Acoustic Bass", gm: 32 },
  { value: "electric_bass_finger", label: "Electric Bass", gm: 33 },
  { value: "pizzicato_strings", label: "Pizzicato Strings", gm: 45 },
  { value: "string_ensemble_1", label: "Strings", gm: 48 },
  { value: "choir_aahs", label: "Choir Aahs", gm: 52 },
  { value: "voice_oohs", label: "Voice Oohs", gm: 53 },
  { value: "trumpet", label: "Trumpet", gm: 56 },
  { value: "trombone", label: "Trombone", gm: 57 },
  { value: "french_horn", label: "French Horn", gm: 60 },
  { value: "brass_section", label: "Brass Section", gm: 61 },
  { value: "alto_sax", label: "Alto Sax", gm: 65 },
  { value: "tenor_sax", label: "Tenor Sax", gm: 66 },
  { value: "flute", label: "Flute", gm: 73 },
  { value: "recorder", label: "Recorder", gm: 74 },
  { value: "pan_flute", label: "Pan Flute", gm: 75 },
  { value: "ocarina", label: "Ocarina", gm: 79 },
  { value: "lead_1_square", label: "Synth Lead (square)", gm: 80 },
  { value: "lead_2_sawtooth", label: "Synth Lead (saw)", gm: 81 },
  { value: "kalimba", label: "Kalimba", gm: 108 },
  { value: "steel_drums", label: "Steel Drums", gm: 114 },
];

const INSTRUMENT_TO_GM: Record<string, number> = Object.fromEntries(
  INSTRUMENTS.map(({ value, gm }) => [value, gm]),
);

const GM_TO_INSTRUMENT: Record<number, string> = Object.fromEntries(
  INSTRUMENTS.map(({ value, gm }) => [gm, value]),
);

// Maps semitone of root note (0=C … 11=B) to MIDI key signature sharps/flats value.
const ROOT_TO_KEY = [0, -5, 2, -3, 4, -1, 6, 1, -4, 3, -2, 5];

// Returns the soundfont instrument name for the first programChange event in a track,
// or DEFAULT_INSTRUMENT if none is found.
// Suggest the most appropriate grid snap value for a loaded MIDI file.
// Computes the GCD of all noteOn tick positions and note durations across
// all tracks, then maps the resulting beat unit to the coarsest standard
// snap option (1, 1/2, 1/4, 1/8, 1/16) that fits that granularity.
export function suggestSnapFromMidi(parsed: MidiData): number {
  const SNAP_OPTIONS = [1, 0.5, 0.25, 0.125, 0.0625];
  const ticksPerBeat = parsed.header.ticksPerBeat ?? 480;

  function gcd(a: number, b: number): number {
    while (b > 0) [a, b] = [b, a % b];
    return a;
  }

  let g = ticksPerBeat;
  for (const track of parsed.tracks) {
    let absoluteTick = 0;
    const openStart = new Map<number, number>();
    for (const event of track) {
      absoluteTick += event.deltaTime;
      if (
        event.type === "noteOn" &&
        (event as { velocity: number }).velocity > 0
      ) {
        if (absoluteTick > 0) g = gcd(g, absoluteTick);
        openStart.set(
          (event as { noteNumber: number }).noteNumber,
          absoluteTick,
        );
      } else if (
        event.type === "noteOff" ||
        (event.type === "noteOn" &&
          (event as { velocity: number }).velocity === 0)
      ) {
        const start = openStart.get(
          (event as { noteNumber: number }).noteNumber,
        );
        if (start !== undefined) {
          const dur = absoluteTick - start;
          if (dur > 0) g = gcd(g, dur);
          openStart.delete((event as { noteNumber: number }).noteNumber);
        }
      }
    }
  }

  const beatUnit = g / ticksPerBeat;
  for (const snap of SNAP_OPTIONS) {
    if (snap <= beatUnit) return snap;
  }
  return 0.0625;
}

export function getTrackInstrument(
  parsedMidi: MidiData,
  trackIndex: number,
): string {
  const track = parsedMidi.tracks[trackIndex];
  if (!track) return DEFAULT_INSTRUMENT;
  for (const event of track) {
    if (
      (event as { type: string; programNumber?: number }).type ===
      "programChange"
    ) {
      const num = (event as { programNumber: number }).programNumber;
      return GM_TO_INSTRUMENT[num] ?? DEFAULT_INSTRUMENT;
    }
  }
  return DEFAULT_INSTRUMENT;
}

// Convert a parsed MIDI track back into piano-roll BeatNote[] format.
// Mirrors the note-pairing logic of playParsedMidiTrack.
// Root note = lowest noteOn at absoluteTick === 0; returned separately (not in notes[]).
// Also collects CC7/CC73/CC72/CC1/pitchBend events into ccEvents.
// Returns null if the track is missing or has no root note.
export function parsedMidiToRollNotes(
  parsedMidi: MidiData,
  trackIndex: number,
): { notes: (BeatNote & { id: string })[]; rootNote: number; rootNoteDuration: number; ccEvents: TrackCCEvents } | null {
  const track = parsedMidi.tracks[trackIndex];
  if (!track) return null;

  const ticksPerBeat = parsedMidi.header.ticksPerBeat ?? 480;
  const openNotes = new Map<number, { startTick: number; velocity: number }>();
  const notes: (BeatNote & { id: string })[] = [];
  const ccEvents = emptyTrackCCEvents();
  let rootNote = -1;
  let rootNoteDuration = 1;
  let absoluteTick = 0;

  for (const event of track) {
    absoluteTick += event.deltaTime;
    const beat = absoluteTick / ticksPerBeat;
    if (event.type === "noteOn" && event.velocity > 0) {
      // Track root: lowest noteOn at tick 0 (matches transpiler Phase 1 logic)
      if (
        absoluteTick === 0 &&
        (rootNote === -1 || event.noteNumber < rootNote)
      ) {
        rootNote = event.noteNumber;
      }
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
        // Skip notes that started at tick 0 (root/setup notes, not program notes)
        if (open.startTick > 0) {
          const beatStart = open.startTick / ticksPerBeat;
          const durationBeats = Math.max(
            (absoluteTick - open.startTick) / ticksPerBeat,
            0.125,
          );
          notes.push({
            noteNumber: event.noteNumber,
            beatStart,
            durationBeats,
            velocity: open.velocity,
            id: crypto.randomUUID(),
          });
        } else if (event.noteNumber === rootNote) {
          // Capture the root note's actual duration from the MIDI file
          rootNoteDuration = Math.max(absoluteTick / ticksPerBeat, 0.125);
        }
        openNotes.delete(event.noteNumber);
      }
    } else if (event.type === "controller") {
      const ct = (event as { controllerType: number; value: number }).controllerType;
      const val = (event as { controllerType: number; value: number }).value;
      const ccEvt: CCEvent = { id: crypto.randomUUID(), beat, value: val };
      if (ct === 7) ccEvents.volume.push(ccEvt);
      else if (ct === 73) ccEvents.attack.push(ccEvt);
      else if (ct === 72) ccEvents.release.push(ccEvt);
      else if (ct === 1) ccEvents.mod.push(ccEvt);
    } else if (event.type === "pitchBend") {
      const val = (event as { value: number }).value;
      ccEvents.pitchbend.push({ id: crypto.randomUUID(), beat, value: val });
    }
  }

  if (rootNote === -1) return null;
  return { notes, rootNote, rootNoteDuration, ccEvents };
}

// Extract all notes from a track as beat-based BeatNotes (no root-note filtering).
// Also collects CC7/CC73/CC72/CC1/pitchBend events into ccEvents.
// Used for displaying and playing back non-program tracks.
export function trackToBeatNotes(
  parsedMidi: MidiData,
  trackIndex: number,
): { notes: (BeatNote & { id: string })[]; ccEvents: TrackCCEvents } {
  const track = parsedMidi.tracks[trackIndex];
  if (!track) return { notes: [], ccEvents: emptyTrackCCEvents() };
  const ticksPerBeat = parsedMidi.header.ticksPerBeat ?? 480;
  const openNotes = new Map<number, { startTick: number; velocity: number }>();
  const notes: (BeatNote & { id: string })[] = [];
  const ccEvents = emptyTrackCCEvents();
  let absoluteTick = 0;
  for (const event of track) {
    absoluteTick += event.deltaTime;
    const beat = absoluteTick / ticksPerBeat;
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
        notes.push({
          noteNumber: event.noteNumber,
          beatStart: open.startTick / ticksPerBeat,
          durationBeats: Math.max(
            (absoluteTick - open.startTick) / ticksPerBeat,
            0.125,
          ),
          velocity: open.velocity,
          id: crypto.randomUUID(),
        });
        openNotes.delete(event.noteNumber);
      }
    } else if (event.type === "controller") {
      const ct = (event as { controllerType: number; value: number }).controllerType;
      const val = (event as { controllerType: number; value: number }).value;
      const ccEvt: CCEvent = { id: crypto.randomUUID(), beat, value: val };
      if (ct === 7) ccEvents.volume.push(ccEvt);
      else if (ct === 73) ccEvents.attack.push(ccEvt);
      else if (ct === 72) ccEvents.release.push(ccEvt);
      else if (ct === 1) ccEvents.mod.push(ccEvt);
    } else if (event.type === "pitchBend") {
      const val = (event as { value: number }).value;
      ccEvents.pitchbend.push({ id: crypto.randomUUID(), beat, value: val });
    }
  }
  return { notes, ccEvents };
}

const TICKS_PER_BEAT = 480;

// Convert a beat-based note sequence + root note into a parsedMidi-shaped object
// that can be passed directly to transpile(). This ensures the piano roll editor
// produces output that exactly matches what the interpreter would see if the user
// exported and re-loaded the MIDI file.
//
// Structure:
//   Track 0: tempo track
//   Track 1: rootNote at deltaTime=0, then sorted program notes
export function notesToParsedMidi(
  notes: BeatNote[],
  rootNote: number,
  bpm: number,
  timeSig = { num: 4, den: 4 },
  scale: Scale = "MAJOR",
  rootNoteDuration = 1,
): MidiData {
  const microsecondsPerBeat = Math.round(60_000_000 / bpm);

  // Build track 1 events.
  // Root note first (deltaTime = 0, so the B2 interpreter picks it as root).
  const noteOnEvents: Array<{
    absoluteTick: number;
    noteNumber: number;
    velocity: number;
    isNoteOff: boolean;
  }> = [];

  // Root note: noteOn at tick 0, noteOff at rootNoteDuration beats
  noteOnEvents.push({
    absoluteTick: 0,
    noteNumber: rootNote,
    velocity: 100,
    isNoteOff: false,
  });
  noteOnEvents.push({
    absoluteTick: Math.round(rootNoteDuration * TICKS_PER_BEAT),
    noteNumber: rootNote,
    velocity: 0,
    isNoteOff: true,
  });

  // Program notes: start after beat 0 (beatStart > 0 enforced by the piano roll UI)
  for (const note of notes) {
    const startTick = Math.round(note.beatStart * TICKS_PER_BEAT);
    const endTick = Math.round(
      (note.beatStart + note.durationBeats) * TICKS_PER_BEAT,
    );
    noteOnEvents.push({
      absoluteTick: startTick,
      noteNumber: note.noteNumber,
      velocity: note.velocity,
      isNoteOff: false,
    });
    noteOnEvents.push({
      absoluteTick: endTick,
      noteNumber: note.noteNumber,
      velocity: 0,
      isNoteOff: true,
    });
  }

  // Sort by absoluteTick, then noteOff before noteOn at the same tick.
  noteOnEvents.sort(
    (a, b) => a.absoluteTick - b.absoluteTick || (a.isNoteOff ? -1 : 1),
  );

  // Convert absolute ticks to delta ticks.
  type TrackEvent = {
    deltaTime: number;
    type: string;
    [key: string]: unknown;
  };
  const track1Events: TrackEvent[] = [];
  let prevTick = 0;
  for (const evt of noteOnEvents) {
    track1Events.push({
      deltaTime: evt.absoluteTick - prevTick,
      type: "noteOn",
      channel: 0,
      noteNumber: evt.noteNumber,
      velocity: evt.velocity,
    });
    prevTick = evt.absoluteTick;
  }
  track1Events.push({ deltaTime: 0, type: "endOfTrack" });

  return {
    header: {
      format: 1,
      numTracks: 2,
      ticksPerBeat: TICKS_PER_BEAT,
    },
    tracks: [
      // Track 0: tempo track
      [
        { deltaTime: 0, type: "setTempo", microsecondsPerBeat },
        {
          deltaTime: 0,
          type: "timeSignature",
          numerator: timeSig.num,
          denominator: timeSig.den,
          metronome: 24,
          thirtyseconds: 8,
        },
        {
          deltaTime: 0,
          type: "keySignature",
          key: ROOT_TO_KEY[rootNote % 12],
          scale: scale === "MINOR" ? 1 : 0,
        },
        { deltaTime: 0, type: "marker", text: `bebop:${scale}` },
        { deltaTime: 0, type: "endOfTrack" },
      ],
      // Track 1: note track
      track1Events,
    ],
  } as MidiData;
}

// Generate a .mid file from a piano roll sequence and trigger a browser download.
// writeMidi() returns a plain Array of byte values — must wrap as Uint8Array for Blob.
export function exportMidi(
  notes: BeatNote[],
  rootNote: number,
  bpm: number,
  timeSig = { num: 4, den: 4 },
  scale: Scale = "MAJOR",
  filename = "composition.mid",
) {
  const midiData = notesToParsedMidi(notes, rootNote, bpm, timeSig, scale);
  const byteArray = writeMidi(midiData as Parameters<typeof writeMidi>[0]);
  const uint8 = new Uint8Array(byteArray);
  const blob = new Blob([uint8], { type: "audio/midi" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Build the sorted delta-tick note events for a single track.
// If isProgram, prepends the root note at tick 0 (required for BF transpile on re-import).
// Always prepends a programChange event so the instrument survives export/import roundtrips.
// If ccEvents is provided, controller (CC7/73/72/1) and pitchBend events are interleaved.
// Sort order at equal ticks: CC/pitchBend (priority 0) < noteOff (1) < noteOn (2).
type RawEvent = { deltaTime: number; type: string; [key: string]: unknown };

// Tagged union for unified sorting before delta-tick conversion.
type AbsoluteEvent =
  | { absoluteTick: number; priority: 0; raw: RawEvent }           // CC / pitchBend
  | { absoluteTick: number; priority: 1; raw: RawEvent }           // noteOff (velocity=0)
  | { absoluteTick: number; priority: 2; raw: RawEvent };          // noteOn  (velocity>0)

function buildNoteEvents(
  notes: BeatNote[],
  isProgram: boolean,
  rootNote: number,
  instrument: string,
  rootNoteDuration = 1,
  ccEvents?: TrackCCEvents,
): RawEvent[] {
  const absEvents: AbsoluteEvent[] = [];

  // ── Note events ────────────────────────────────────────────────────────────
  if (isProgram) {
    absEvents.push({
      absoluteTick: 0,
      priority: 2,
      raw: { deltaTime: 0, type: "noteOn", channel: 0, noteNumber: rootNote, velocity: 100 },
    });
    absEvents.push({
      absoluteTick: Math.round(rootNoteDuration * TICKS_PER_BEAT),
      priority: 1,
      raw: { deltaTime: 0, type: "noteOn", channel: 0, noteNumber: rootNote, velocity: 0 },
    });
  }

  for (const note of notes) {
    const startTick = Math.round(note.beatStart * TICKS_PER_BEAT);
    const endTick = Math.round((note.beatStart + note.durationBeats) * TICKS_PER_BEAT);
    absEvents.push({
      absoluteTick: startTick,
      priority: 2,
      raw: { deltaTime: 0, type: "noteOn", channel: 0, noteNumber: note.noteNumber, velocity: note.velocity },
    });
    absEvents.push({
      absoluteTick: endTick,
      priority: 1,
      raw: { deltaTime: 0, type: "noteOn", channel: 0, noteNumber: note.noteNumber, velocity: 0 },
    });
  }

  // ── CC / pitchBend events ──────────────────────────────────────────────────
  if (ccEvents) {
    for (const e of ccEvents.volume) {
      absEvents.push({
        absoluteTick: Math.round(e.beat * TICKS_PER_BEAT),
        priority: 0,
        raw: { deltaTime: 0, type: "controller", channel: 0, controllerType: 7, value: e.value },
      });
    }
    for (const e of ccEvents.attack) {
      absEvents.push({
        absoluteTick: Math.round(e.beat * TICKS_PER_BEAT),
        priority: 0,
        raw: { deltaTime: 0, type: "controller", channel: 0, controllerType: 73, value: e.value },
      });
    }
    for (const e of ccEvents.release) {
      absEvents.push({
        absoluteTick: Math.round(e.beat * TICKS_PER_BEAT),
        priority: 0,
        raw: { deltaTime: 0, type: "controller", channel: 0, controllerType: 72, value: e.value },
      });
    }
    for (const e of ccEvents.mod) {
      absEvents.push({
        absoluteTick: Math.round(e.beat * TICKS_PER_BEAT),
        priority: 0,
        raw: { deltaTime: 0, type: "controller", channel: 0, controllerType: 1, value: e.value },
      });
    }
    for (const e of ccEvents.pitchbend) {
      absEvents.push({
        absoluteTick: Math.round(e.beat * TICKS_PER_BEAT),
        priority: 0,
        raw: { deltaTime: 0, type: "pitchBend", channel: 0, value: e.value },
      });
    }
  }

  absEvents.sort((a, b) => a.absoluteTick - b.absoluteTick || a.priority - b.priority);

  // Prepend program change so the instrument is preserved on re-import
  const events: RawEvent[] = [
    {
      deltaTime: 0,
      type: "programChange",
      channel: 0,
      programNumber: INSTRUMENT_TO_GM[instrument] ?? 0,
    },
  ];
  let prevTick = 0;
  for (const evt of absEvents) {
    events.push({
      ...evt.raw,
      deltaTime: evt.absoluteTick - prevTick,
    });
    prevTick = evt.absoluteTick;
  }
  return events;
}

// Export all tracks to a MIDI file and trigger a browser download.
// Each track gets a trackName meta event. The program track also includes
// the root note at tick 0 so the file is valid for re-import and BF transpile.
// allTracksCCEvents: optional map of trackId → CC event lanes; written as
// standard MIDI CC/pitchBend events interleaved with the note events.
export function exportAllTracks(
  tracks: { id: number; name: string; instrument: string }[],
  allTracksNotes: Record<number, BeatNote[]>,
  programTrackId: number,
  rootNote: number,
  bpm: number,
  timeSig = { num: 4, den: 4 },
  scale: Scale = "MAJOR",
  filename = "composition.mid",
  rootNoteDuration = 1,
  allTracksCCEvents?: Record<number, TrackCCEvents>,
) {
  const microsecondsPerBeat = Math.round(60_000_000 / bpm);

  const midiTracks: RawEvent[][] = [
    // Track 0: tempo
    [
      { deltaTime: 0, type: "setTempo", microsecondsPerBeat },
      {
        deltaTime: 0,
        type: "timeSignature",
        numerator: timeSig.num,
        denominator: timeSig.den,
        metronome: 24,
        thirtyseconds: 8,
      },
      {
        deltaTime: 0,
        type: "keySignature",
        key: ROOT_TO_KEY[rootNote % 12],
        scale: scale === "MINOR" ? 1 : 0,
      },
      { deltaTime: 0, type: "marker", text: `bebop:${scale}` },
      { deltaTime: 0, type: "endOfTrack" },
    ],
  ];

  // Program track must be at MIDI index 1 so re-import picks it up correctly
  // (onMidiLoaded defaults progIdx = tracks.length > 1 ? 1 : 0).
  const sortedTracks = [
    ...tracks.filter((t) => t.id === programTrackId),
    ...tracks.filter((t) => t.id !== programTrackId),
  ];

  for (const t of sortedTracks) {
    const notes = allTracksNotes[t.id] ?? [];
    const isProgram = t.id === programTrackId;
    const events: RawEvent[] = [
      { deltaTime: 0, type: "trackName", text: t.name },
      ...buildNoteEvents(notes, isProgram, rootNote, t.instrument, rootNoteDuration, allTracksCCEvents?.[t.id]),
      { deltaTime: 0, type: "endOfTrack" },
    ];
    midiTracks.push(events);
  }

  const midiData = {
    header: {
      format: 1,
      numTracks: midiTracks.length,
      ticksPerBeat: TICKS_PER_BEAT,
    },
    tracks: midiTracks,
  };

  const byteArray = writeMidi(midiData as Parameters<typeof writeMidi>[0]);
  const uint8 = new Uint8Array(byteArray);
  const blob = new Blob([uint8], { type: "audio/midi" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
