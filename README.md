# Bebop is Brainfuck

A [Brainfuck](https://esolangs.org/wiki/Brainfuck)-equivalent esoteric programming language where **MIDI files are programs**. (Abbreviation: B2)

## Table of Contents

- [The Language](#the-language)
  - [Bebop Scales](#bebop-scales)
  - [Command Mapping](#command-mapping)
- [`python/` — Interpreter](#python--interpreter)
- [`web/` — IDE](#web--ide)

---

## The Language

B2 programs are MIDI files. Notes on the program track are interpreted as Brainfuck commands based on their **semitone interval from the root note** — the lowest note at the start of the track.

Because only intervals matter, transposing a B2 program to a new key produces identical output.

### Bebop Scales

Bebop scales are jazz scales derived from common 7-note modes by adding a chromatic passing tone, bringing the total to 8 notes. This makes them a natural fit for mapping to the 8 Brainfuck commands.

B2 supports three:

**Bebop Major** — Ionian mode (the standard major scale) with a chromatic passing tone between the 5th and 6th degrees. Also known as the major sixth diminished scale.

**Bebop Minor** — Dorian mode (natural minor with a raised 6th) with an added major 7th between the dominant 7th and the octave.

**Bebop Dominant** — Mixolydian mode (major scale with a flattened 7th) with a chromatic passing tone between the ♭7 and the root.

### Command Mapping

Each note is mapped to a Brainfuck command by its semitone distance from the root. Notes at unmapped intervals are silently ignored.

| Semitones | Major | Minor | Dominant |
|-----------|-------|-------|----------|
| 0         | `>`   | `>`   | `>`      |
| 2         | `<`   | `<`   | `<`      |
| 3         | —     | `+`   | —        |
| 4         | `+`   | `-`   | `+`      |
| 5         | `-`   | `-`   | `-`      |
| 7         | `.`   | `.`   | `.`      |
| 8         | `,`   | `,`   | `,`      |
| 9         | `[`   | `[`   | `[`      |
| 10        | `-`   | `[`   | `[`      |
| 11        | `]`   | `]`   | `]`      |

The tape is 30,000 cells with wrapping at both boundaries.

---

## `python/` — Interpreter

The canonical interpreter and ground truth for language semantics.

```bash
python interpreter.py <midi_file> [--track N] [--scale MAJOR|MINOR|DOMINANT]
```

- Default track: `1`
- Default scale: auto-detected from MIDI metadata, otherwise `MAJOR`
- Reads from stdin for `,` commands

---

## `web/` — IDE

A full-featured browser IDE for composing, playing, and running B2 programs. Built with Vite + React + TypeScript.

```bash
cd web
npm install
npm run dev   # Dev server on localhost:5173
```

Features a piano roll editor, audio playback via Web Audio API, a step debugger with breakpoints, and MIDI import/export.
