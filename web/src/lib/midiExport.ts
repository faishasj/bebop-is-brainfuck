import { writeMidi, type MidiData } from "midi-file";
import { type BeatNote, DEFAULT_INSTRUMENT } from "./player.js";
import { type Scale } from "./scales.js";

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
// Returns null if the track is missing or has no root note.
export function parsedMidiToRollNotes(
  parsedMidi: MidiData,
  trackIndex: number,
): { notes: (BeatNote & { id: string })[]; rootNote: number } | null {
  const track = parsedMidi.tracks[trackIndex];
  if (!track) return null;

  const ticksPerBeat = parsedMidi.header.ticksPerBeat ?? 480;
  const openNotes = new Map<number, { startTick: number; velocity: number }>();
  const notes: (BeatNote & { id: string })[] = [];
  let rootNote = -1;
  let absoluteTick = 0;

  for (const event of track) {
    absoluteTick += event.deltaTime;
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
        }
        openNotes.delete(event.noteNumber);
      }
    }
  }

  if (rootNote === -1) return null;
  return { notes, rootNote };
}

// Extract all notes from a track as beat-based BeatNotes (no root-note filtering).
// Used for displaying and playing back non-program tracks.
export function trackToBeatNotes(
  parsedMidi: MidiData,
  trackIndex: number,
): (BeatNote & { id: string })[] {
  const track = parsedMidi.tracks[trackIndex];
  if (!track) return [];
  const ticksPerBeat = parsedMidi.header.ticksPerBeat ?? 480;
  const openNotes = new Map<number, { startTick: number; velocity: number }>();
  const notes: (BeatNote & { id: string })[] = [];
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
    }
  }
  return notes;
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

  // Root note: noteOn at tick 0, noteOff at tick TICKS_PER_BEAT
  noteOnEvents.push({
    absoluteTick: 0,
    noteNumber: rootNote,
    velocity: 100,
    isNoteOff: false,
  });
  noteOnEvents.push({
    absoluteTick: TICKS_PER_BEAT,
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
type RawEvent = { deltaTime: number; type: string; [key: string]: unknown };

function buildNoteEvents(
  notes: BeatNote[],
  isProgram: boolean,
  rootNote: number,
  instrument: string,
): RawEvent[] {
  type AbsEvent = {
    absoluteTick: number;
    noteNumber: number;
    velocity: number;
    isNoteOff: boolean;
  };
  const absEvents: AbsEvent[] = [];

  if (isProgram) {
    absEvents.push({
      absoluteTick: 0,
      noteNumber: rootNote,
      velocity: 100,
      isNoteOff: false,
    });
    absEvents.push({
      absoluteTick: TICKS_PER_BEAT,
      noteNumber: rootNote,
      velocity: 0,
      isNoteOff: true,
    });
  }

  for (const note of notes) {
    const startTick = Math.round(note.beatStart * TICKS_PER_BEAT);
    const endTick = Math.round(
      (note.beatStart + note.durationBeats) * TICKS_PER_BEAT,
    );
    absEvents.push({
      absoluteTick: startTick,
      noteNumber: note.noteNumber,
      velocity: note.velocity,
      isNoteOff: false,
    });
    absEvents.push({
      absoluteTick: endTick,
      noteNumber: note.noteNumber,
      velocity: 0,
      isNoteOff: true,
    });
  }

  absEvents.sort(
    (a, b) => a.absoluteTick - b.absoluteTick || (a.isNoteOff ? -1 : 1),
  );

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
      deltaTime: evt.absoluteTick - prevTick,
      type: "noteOn",
      channel: 0,
      noteNumber: evt.noteNumber,
      velocity: evt.velocity,
    });
    prevTick = evt.absoluteTick;
  }
  return events;
}

// Export all tracks to a MIDI file and trigger a browser download.
// Each track gets a trackName meta event. The program track also includes
// the root note at tick 0 so the file is valid for re-import and BF transpile.
export function exportAllTracks(
  tracks: { id: number; name: string; instrument: string }[],
  allTracksNotes: Record<number, BeatNote[]>,
  programTrackId: number,
  rootNote: number,
  bpm: number,
  timeSig = { num: 4, den: 4 },
  scale: Scale = "MAJOR",
  filename = "composition.mid",
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
      ...buildNoteEvents(notes, isProgram, rootNote, t.instrument),
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
