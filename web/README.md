# Bebop is Brainfuck — Web IDE

A browser-based IDE for [Bebop is Brainfuck](https://github.com/faishasj/bebop-brainfuck), an esoteric programming language where MIDI files are programs. Brainfuck commands are encoded as musical intervals within Bebop scales.

## Running locally

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

## Project structure

```
web/src/
├── features/   UI components (piano roll, toolbar, output panels)
├── context/    Shared React state (composition settings, execution, tracks)
├── lib/        Core logic — MIDI parsing, Brainfuck transpiler/interpreter, audio engine, export
├── ui-kit/     Generic reusable components (inputs, dropdowns, dialogs)
└── hooks/      Utility React hooks
```

## Stack

- [Vite](https://vitejs.dev/) + [React](https://react.dev/) + TypeScript
- [`midi-file`](https://www.npmjs.com/package/midi-file) — MIDI parsing and serialisation
- [`soundfont-player`](https://www.npmjs.com/package/soundfont-player) — Web Audio instrument playback
