export type Scale = 'MAJOR' | 'MINOR' | 'DOMINANT';

export const SCALES: { value: Scale; label: string }[] = [
  { value: 'MAJOR',    label: 'Bebop Major'    },
  { value: 'MINOR',    label: 'Bebop Minor'    },
  { value: 'DOMINANT', label: 'Bebop Dominant' },
];

// Interval-to-Brainfuck command mapping for each Bebop scale.
// Array is indexed by semitonal distance (0–11) from root note.
// Empty string means the interval maps to no command (note is ignored).
export const SCALE: Record<Scale, string[]> = {
  MAJOR:    ['>', '', '<', '',  '+', '-', '', '.', ',', '[', '',  ']'],
  MINOR:    ['>', '', '<', '+', '',  '-', '', '.', '', ',', '[', ']'],
  DOMINANT: ['>', '', '<', '',  '+', '-', '', '.', '', ',', '[', ']'],
};

// Compute the semitonal interval between a note and the root.
// Returns 0–11, or null for the edge case where the note is exactly
// N octaves below the root (would yield semitone = 12, out of bounds).
export function computeSemitone(noteNumber: number, rootNote: number): number | null {
  let semitone = Math.abs(rootNote - noteNumber) % 12;
  if (noteNumber < rootNote) {
    semitone = 12 - semitone;
    if (semitone === 12) return null;
  }
  return semitone;
}
