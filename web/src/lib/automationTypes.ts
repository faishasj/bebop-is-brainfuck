// ── Automation lane types ───────────────────────────────────────────────────
// Pure types — no React, no UI imports.

export type CCLaneType = "attack" | "release" | "mod" | "pitchbend";
export type LaneType = "velocity" | CCLaneType;

// A single CC automation event at a beat position.
export interface CCEvent {
  id: string;
  beat: number;   // position in beats
  value: number;  // CC: 0–127, pitchbend: −8191..+8191
}

// All CC event lanes for a single track.
export interface TrackCCEvents {
  attack: CCEvent[];    // CC73 — mapped to soundfont attack (0–2 s)
  release: CCEvent[];   // CC72 — mapped to soundfont release (0–4 s)
  mod: CCEvent[];       // CC1  — MIDI export only
  pitchbend: CCEvent[]; // pitchBend — MIDI export only
}

// Metadata describing a single automation lane (used by both piano.ts and UI).
export interface LaneMeta {
  type: LaneType;
  label: string;
  min: number;
  max: number;
  defaultValue: number;
  color: string;
}

export function emptyTrackCCEvents(): TrackCCEvents {
  return { attack: [], release: [], mod: [], pitchbend: [] };
}

// Return the value of the last event at or before `beat`, or null if none.
export function getLastCCBefore(events: CCEvent[], beat: number): number | null {
  let result: number | null = null;
  for (const e of events) {
    if (e.beat <= beat) result = e.value;
    else break;
  }
  return result;
}
