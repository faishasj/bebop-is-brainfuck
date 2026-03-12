import { SCALE, computeSemitone, type Scale } from "./scales.js";

export const BEAT_WIDTH = 80; // px per beat
export const ROW_HEIGHT = 18; // px per semitone
export const MIN_NOTE = 24; // C1
export const MAX_NOTE = 96; // C7  (72 rows total)
export const KEYS_WIDTH = 64; // px for piano key sidebar
export const DRAG_THRESHOLD = 4; // px movement before drag activates
export const IGNORED_NOTE_COLOR = "rgba(148,163,184,0.8)";

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
