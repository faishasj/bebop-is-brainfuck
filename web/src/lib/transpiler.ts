import { parseMidi, type MidiData } from 'midi-file';
import { SCALE, computeSemitone, type Scale } from './scales.js';

// Scan all tracks for a `bebop:SCALE` marker meta event at any position.
// Returns the encoded Scale, or null if no hint is present.
export function readScaleHint(parsed: MidiData): Scale | null {
  for (const track of parsed.tracks) {
    for (const event of track) {
      if (event.type === 'marker') {
        const text = (event as { text: string }).text;
        if (text === 'bebop:MAJOR')    return 'MAJOR';
        if (text === 'bebop:MINOR')    return 'MINOR';
        if (text === 'bebop:DOMINANT') return 'DOMINANT';
      }
    }
  }
  return null;
}

export type { MidiData };

export interface NoteCommand {
  beatStart: number; // beat position of the note that produced this command
  charIndex: number; // index into the brainfuck string
}

export interface TranspileResult {
  brainfuck: string;
  error: string | null;
  noteCommands: NoteCommand[];
}

// Load a MIDI file from an ArrayBuffer and return the parseMidi result.
export function parseMidiBuffer(arrayBuffer: ArrayBuffer): MidiData {
  const bytes = new Uint8Array(arrayBuffer);
  return parseMidi(bytes);
}

// Fetch a MIDI file by URL and return the parseMidi result.
export async function fetchMidi(url: string): Promise<MidiData> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch ${url}: ${resp.statusText}`);
  const buffer = await resp.arrayBuffer();
  return parseMidiBuffer(buffer);
}

// Transpile a parsed MIDI file to Brainfuck.
// Exact port of B2Interpreter.bebop_to_brainfuck() from interpreter.py.
//
// Field name differences between mido (Python) and midi-file (JS):
//   msg.time  → event.deltaTime
//   msg.note  → event.noteNumber
//   msg.type == 'note_on' → event.type === 'noteOn'
//
// Velocity-0 normalization: mido converts noteOn(velocity=0) to note_off.
// midi-file does not — we skip velocity-0 noteOn events to match Python behavior.
export function transpile(parsedMidi: MidiData, trackIndex: number, scale: Scale): TranspileResult {
  const track = parsedMidi.tracks[trackIndex];
  if (!track) {
    return {
      brainfuck: '',
      error: `Track ${trackIndex} not found. This MIDI has ${parsedMidi.tracks.length} track(s) (indices 0–${parsedMidi.tracks.length - 1}).`,
      noteCommands: [],
    };
  }

  let rootNote = -1;
  let trackPtr = 0;

  // Phase 1: find root note.
  // Iterate events while deltaTime === 0; among noteOn (velocity > 0) events,
  // take the lowest noteNumber. Stop at the first event with deltaTime !== 0.
  while (trackPtr < track.length) {
    const event = track[trackPtr];
    if (event.deltaTime !== 0) break;
    if (event.type === 'noteOn' && event.velocity > 0) {
      if (rootNote === -1 || event.noteNumber < rootNote) {
        rootNote = event.noteNumber;
      }
    }
    trackPtr++;
  }

  if (rootNote === -1) {
    return {
      brainfuck: '',
      error: 'No root note found. The program track must start with at least one note at time 0.',
      noteCommands: [],
    };
  }

  // Phase 2: transpile remaining noteOn events to Brainfuck.
  const scaleMap = SCALE[scale];
  const ticksPerBeat = parsedMidi.header.ticksPerBeat ?? 480;
  let brainfuck = '';
  let absoluteTick = 0;
  const noteCommands: NoteCommand[] = [];

  while (trackPtr < track.length) {
    const event = track[trackPtr];
    absoluteTick += event.deltaTime;
    if (event.type === 'noteOn' && event.velocity > 0) {
      const semitone = computeSemitone(event.noteNumber, rootNote);
      if (semitone !== null) {
        const command = scaleMap[semitone];
        if (command) {
          noteCommands.push({ beatStart: absoluteTick / ticksPerBeat, charIndex: brainfuck.length });
          brainfuck += command;
        }
      }
    }
    trackPtr++;
  }

  return { brainfuck, error: null, noteCommands };
}
