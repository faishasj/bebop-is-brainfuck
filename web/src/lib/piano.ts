import { SCALE, computeSemitone, type Scale } from "./scales.js";
import { type LaneMeta } from "./automationTypes.js";

export const BEAT_WIDTH = 80; // px per beat
export const ROW_HEIGHT = 18; // px per semitone
export const MIN_NOTE = 24; // C1
export const MAX_NOTE = 96; // C7  (72 rows total)
export const KEYS_WIDTH = 64; // px for piano key sidebar
export const DRAG_THRESHOLD = 4; // px movement before drag activates
export const IGNORED_NOTE_COLOR = "rgba(148,163,184,0.8)";
export const LANE_HEIGHT = 72; // px per automation lane
export const VELOCITY_LANE_BAR_WIDTH = 6; // px width per velocity/CC bar

export const LANE_DEFS: LaneMeta[] = [
  { type: "velocity",  label: "velocity",   min: 1,     max: 127,  defaultValue: 100, color: "#fbbf24" },
  { type: "attack",    label: "attack",     min: 0,     max: 127,  defaultValue: 0,   color: "#34d399" },
  { type: "release",   label: "release",    min: 0,     max: 127,  defaultValue: 0,   color: "#818cf8" },
  { type: "mod",       label: "mod",        min: 0,     max: 127,  defaultValue: 0,   color: "#c084fc" },
  { type: "pitchbend", label: "pitch bend", min: -8191, max: 8191, defaultValue: 0,   color: "#e879f9" },
];

// MIDI note name conversion: MIDI 60 → 'C4', 69 → 'A4'.
// Uses flat names (Db, Eb, Gb, Ab, Bb) as expected by soundfont-player.
export const NOTE_NAMES = [
  "C",
  "Db",
  "D",
  "Eb",
  "E",
  "F",
  "Gb",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
];

export const BLACK_KEYS = new Set([1, 3, 6, 8, 10]);

export const COMMAND_COLORS: Record<string, string> = {
  ">": "#818cf8",
  "<": "#6366f1",
  "+": "#34d399",
  "-": "#f87171",
  ".": "#fbbf24",
  ",": "#f59e0b",
  "[": "#c084fc",
  "]": "#a855f7",
};

export const COMMAND_TOOLTIPS: Record<string, string> = {
  ">": "Move data pointer one cell to the right",
  "<": "Move data pointer one cell to the left",
  "+": "Increment the byte at the data pointer (wraps 255 → 0)",
  "-": "Decrement the byte at the data pointer (wraps 0 → 255)",
  ".": "Output the byte at the data pointer as an ASCII character",
  ",": "Read one byte of input into the data pointer cell",
  "[": "If the current byte is zero, jump forward to the matching ]",
  "]": "If the current byte is non-zero, jump back to the matching [",
};

export const GRID_SNAP_OPTIONS = [
  { value: 0.0625, label: "1/16" },
  { value: 0.125, label: "1/8" },
  { value: 0.25, label: "1/4" },
  { value: 0.5, label: "1/2" },
  { value: 1, label: "1 beat" },
];

export function noteLabel(noteNumber: number): string {
  const name = NOTE_NAMES[noteNumber % 12];
  const octave = Math.floor(noteNumber / 12) - 1;
  return `${name}${octave}`;
}

export function isBlackKey(noteNumber: number): boolean {
  return BLACK_KEYS.has(noteNumber % 12);
}

export function getNoteCommand(
  noteNumber: number,
  rootNote: number,
  scale: Scale,
): string {
  const semitone = computeSemitone(noteNumber, rootNote);
  return semitone !== null ? SCALE[scale][semitone] : "";
}
