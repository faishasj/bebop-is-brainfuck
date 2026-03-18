# Bebop is Brainfuck — CLAUDE.md

## Project Overview

**Bebop is Brainfuck** is an esoteric programming language where MIDI files are programs. Brainfuck commands are encoded as musical intervals within Bebop scales. The repository contains:

- `python/` — The canonical Python interpreter. This is the **ground truth** for language semantics.
- `web/` — A full-featured IDE web app (Vite + React + TypeScript) for composing, playing, and running B2 programs.
- `examples/` — Example MIDI files (served from `web/public/examples/` in the web app).

When Python and web behavior differ, Python wins.

---

## Language Specification

### Core Concept

1. The **root note** is the lowest `noteOn` event at `deltaTime=0` on the program track (default track 1).
2. Every subsequent `noteOn` (velocity > 0) is mapped to a Brainfuck command by computing its **semitone interval** from the root.
3. Notes at unmapped intervals are silently ignored.
4. The mapping is **transposition-invariant** — only intervals matter, not absolute pitch.

### Scale → Interval Mapping (semitones from root)

| Semitone | Major | Minor | Dominant |
| -------- | ----- | ----- | -------- |
| 0        | `>`   | `>`   | `>`      |
| 2        | `<`   | `<`   | `<`      |
| 3        | `-`   | `+`   | `-`      |
| 4        | `+`   | `-`   | `+`      |
| 5        | `-`   | `-`   | `-`      |
| 7        | `.`   | `.`   | `.`      |
| 8        | `,`   | `,`   | `,`      |
| 9        | `[`   | `[`   | `[`      |
| 10       | `-`   | `[`   | `[`      |
| 11       | `]`   | `]`   | `]`      |

Semitones 1, 6, and 12+ map to no command (ignored).

### Brainfuck Semantics

Standard Brainfuck with:

- **Tape**: 30,000 cells
- **Cell values**: 0–255, wrapping in both directions
- **Data pointer**: wraps at tape boundaries (circular)

---

## Python Interpreter (`python/`)

**Entry point:** `python/interpreter.py`

```bash
python interpreter.py <midi_file> [--track N] [--scale MAJOR|MINOR|DOMINANT]
```

- Default track: `1`
- Default scale: auto-detected from MIDI metadata if present, else `MAJOR`
- Reads from stdin for `,` commands

**Key class:** `B2Interpreter(filename, track_no=1, scale=None)`

- `.bebop_to_brainfuck()` — MIDI → Brainfuck string
- `.evaluate()` — Execute transpiled Brainfuck

**`computeSemitone` edge case:** If a note is exactly N octaves _below_ the root (so `(root - note) % 12 == 0`), the computed semitone wraps to 12 and the note is **skipped**.

---

## Web App (`web/`)

### Stack

- **Vite** + **React 19** + **TypeScript 5** (strict mode)
- **`midi-file`** (v1.2.4) for MIDI parsing and writing
- **`soundfont-player`** (v0.12.0) for Web Audio playback

### Commands

```bash
cd web
npm install
npm run dev        # Dev server on localhost:5173
npm run build      # Production build → dist/
npx tsc --noEmit   # Type check only
npm run lint       # ESLint
```

### Architecture

```
web/src/
├── context/       Global state (React Context)
│   ├── CompositionContext.tsx    scale, bpm, timeSig, rootNote, gridSnap, totalBeats
│   ├── ExecutionContext.tsx      playback, runMode, breakpoints, live interpreter, output
│   └── TracksContext.tsx         tracks, notes, undo/redo, MIDI import/export
├── lib/           Pure logic — no React, no UI imports
│   ├── scales.ts          SCALE constant + computeSemitone()
│   ├── transpiler.ts      MIDI → Brainfuck (parseMidi, transpile, fetchMidi)
│   ├── interpreter.ts     Batch Brainfuck executor
│   ├── stepInterpreter.ts Step-by-step executor (for live/debug mode)
│   ├── player.ts          Audio engine (singleton AudioContext + instrument cache)
│   ├── midiExport.ts      notesToParsedMidi(), exportMidi(), instrument → GM number
│   └── piano.ts           Piano roll constants (BEAT_WIDTH, ROW_HEIGHT, note names, command colors)
├── features/      App-specific UI components
└── ui-kit/        Reusable, domain-agnostic UI components
```

### State Architecture

State is split across three contexts. Keep concerns separated:

| Context              | Owns                                                                 |
| -------------------- | -------------------------------------------------------------------- |
| `CompositionContext` | Musical composition settings (scale, BPM, root note, snap, time sig) |
| `ExecutionContext`   | Playback, interpreter, output, breakpoints                           |
| `TracksContext`      | Track list, per-track notes, undo/redo stacks, MIDI I/O              |

### Run Modes (`ExecutionContext`)

- **`batch`**: Full transpile + execute synchronously. Output shown all at once.
- **`live`**: Step interpreter runs in sync with audio playback. Outputs appear as `.` notes are reached. Pauses for `,` input. Breakpoints work here.
- **`notes`**: No interpretation — audio playback only.

### Critical Implementation Details

#### `midi-file` Behavior

- Events use `event.deltaTime`, `event.noteNumber`, `event.type === 'noteOn'`
- **Does NOT** normalize `noteOn(velocity=0)` → `noteOff` (unlike Python's `mido`). The transpiler must skip velocity=0 events explicitly.
- `writeMidi()` returns a plain `Array`, **not** `Uint8Array`. Always wrap: `new Uint8Array(writeMidi(...))` before creating a `Blob`.

#### `soundfont-player` Behavior

- `Soundfont.instrument(ac, name, opts)` returns a `Promise<Player>`.
- `player.play(noteName, time, opts)` schedules audio — returns a Player, not a node.
- `player.stop()` stops all notes immediately.
- Must be triggered from a user gesture (browser autoplay policy).
- Instrument cache lives on the singleton AudioContext. Invalidated when context is closed/recreated.

#### MIDI Export Format

- Track 0: Tempo track (setTempo, timeSignature, keySignature, scale hint as marker meta event)
- Track 1: Always the program track (root note at tick 0, program notes following)
- Additional tracks: background/accompaniment tracks
- Each track has a `trackName` meta event; program tracks get `programChange` for instrument

#### Piano Roll Conventions

- Beat 0 is reserved for the root note. Program notes start at beat > 0.
- `notesToParsedMidi()` converts piano roll notes + root into a synthetic `parsedMidi` for live preview without disk I/O.
- `parsedMidiToRollNotes()` extracts notes from MIDI, filtering out the root note (lowest at tick 0).

#### Undo/Redo

- Implemented with ref-based stacks (`pastRef`, `futureRef`) in `TracksContext` — not useState — to avoid race conditions.
- Capped at 50 entries per stack.
- Always call `updateNotesWithHistory()` (not direct state setters) when making editable changes to notes.

#### Tape Size

- Web app: 30,000 cells (matches Brainfuck spec)
- Python: 30,000 cells (`shift_right` wraps at 30,000 — verify before increasing)

---

## Keyboard Shortcuts

| Key                | Action                                                |
| ------------------ | ----------------------------------------------------- |
| `A`                | Piano roll: add mode                                  |
| `D`                | Piano roll: delete mode                               |
| `Cmd/Ctrl+Z`       | Undo                                                  |
| `Cmd/Ctrl+Shift+Z` | Redo                                                  |
| `Space`            | Play / Pause / Resume from breakpoint                 |
| `F10`              | Step to next program note (when paused at breakpoint) |

---

## Deployment

- **Netlify**: `netlify.toml` at `web/` root. Builds with `npm run build`, publishes `dist/`. No env changes needed.

---

## Common Pitfalls

1. **Forgetting velocity-0 check**: Always skip `noteOn` events with `velocity === 0` in transpilation — they are `noteOff` equivalents in `midi-file`.
2. **Root note edge case**: `computeSemitone` returns `null` when a note is an exact number of octaves below the root. Null = skip, don't map to command index 0.
3. **`writeMidi` needs wrapping**: `new Uint8Array(writeMidi(...))` — plain Array won't work as Blob content.
4. **Tick vs Beat**: Internal MIDI state uses ticks (TICKS_PER_BEAT = 480). UI uses beats. Convert with `tick / ticksPerBeat`.
5. **Context separation**: Don't reach from `ExecutionContext` into `TracksContext` state directly and vice versa — use context consumer hooks.
6. **lib/ purity**: Files in `src/lib/` must remain free of React imports. They are pure TypeScript utilities.
