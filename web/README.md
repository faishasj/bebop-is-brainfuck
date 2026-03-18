# Bebop is Brainfuck — Web IDE

A browser-based IDE for [Bebop is Brainfuck](https://github.com/faishasj/bebop-is-brainfuck), an esoteric programming language where MIDI files are programs. Compose B2 programs on a piano roll, play them back with audio, run or step-debug the interpreter, and export to MIDI.

## Requirements

- [Node.js](https://nodejs.org/) v18 or later
- npm (comes with Node.js)

## Setup

```bash
cd web
npm install
```

## Running locally

```bash
npm run dev
```

Opens a dev server at `http://localhost:5173` with hot module replacement.

## Building for production

```bash
npm run build
```

Output is written to `dist/`. Serve it with any static file host.

To preview the production build locally:

```bash
npm run preview
```

### Netlify

Configured via `netlify.toml`. Build command and publish directory are set automatically — no extra configuration needed.

## Other commands

```bash
npm run lint        # ESLint
npx tsc --noEmit    # Type check without emitting files
```

## Project structure

```
web/src/
├── context/    Shared React state (composition settings, execution, tracks)
├── features/   App-specific UI components (piano roll, toolbar, output panels)
├── lib/        Pure logic — MIDI parsing, transpiler, interpreter, audio engine, export
├── ui-kit/     Generic reusable components (inputs, dropdowns, dialogs)
└── hooks/      Utility React hooks
```

## Stack

- [Vite](https://vitejs.dev/) + [React 19](https://react.dev/) + TypeScript 5
- [`midi-file`](https://www.npmjs.com/package/midi-file) — MIDI parsing and serialisation
- [`soundfont-player`](https://www.npmjs.com/package/soundfont-player) — Web Audio instrument playback
