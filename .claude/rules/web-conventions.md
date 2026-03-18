# Web App Conventions (`web/`)

Applies when working in `web/src/`.

---

## TypeScript

- Use `interface` for component props and context value shapes. Declare them above the component or function that uses them in the same file.
- Use `type` for union aliases: `type Scale = 'MAJOR' | 'MINOR' | 'DOMINANT'`.
- Constants are `UPPER_SNAKE_CASE`. Everything else is `camelCase`.
- Prefer `const` everywhere; use `let` only when reassignment is required.
- Use `Record<K, V>` for map types rather than index signatures.
- No `any`. Narrow types explicitly or use a discriminated union.

## React

- Functional components only, named exports only — no default exports.
- All context access goes through a custom hook (e.g. `useComposition()`), never raw `useContext`. The hook must throw if used outside its provider:
  ```ts
  if (!ctx) throw new Error("useX must be used within XProvider");
  ```
- Context value objects are constructed inline inside the provider component.
- Providers nest in `App.tsx` in the order: `CompositionProvider` → `TracksProvider` → `ExecutionProvider`.
- Use `useRef` (not `useState`) for values that must stay in sync across render closures without triggering re-renders. Mirror the pattern: `const xRef = useRef(x); xRef.current = x;`
- `useReducer` is not used in this codebase — reach for `useState` + `useRef` instead.
- All `useEffect` dependency arrays must be explicit. Never omit or suppress them.
- Always return cleanup functions from effects that add event listeners.
- Use `useMemo` for derived context values that are expensive or used as effect dependencies.
- Use `useRef` stacks (not `useState`) for undo/redo to avoid race conditions with nested state updates.

## Naming

- Files: PascalCase for components (`NoteGrid.tsx`), camelCase for utilities and hooks (`transpiler.ts`, `useClickOutside.ts`).
- Event handler props passed to children: `onX` (e.g. `onScaleChange`).
- Internal event handlers: `handleX` (e.g. `handleKeyDown`, `handleFile`).
- Loop indices and short-lived locals: single-letter (`i`, `n`, `b`) is acceptable.

## Styling

- Plain CSS with BEM-style class names: `ide-[component]-[element]--[modifier]`.
  - Example: `ide-ribbon-btn`, `ide-ribbon-btn--danger`, `ide-dropdown-item--active`.
- No CSS Modules, Tailwind, or CSS-in-JS.
- Inline styles only for values that are computed at runtime (absolute positioning, dynamic dimensions, CSS variable references like `var(--accent2)`). Never inline static styles.

## Design System

### Aesthetic direction

Neon jazz club: dark surfaces, magenta/cyan neon glow on interactive states, angular geometry. Think late-night bebop venue with neon signage — not generic dark-mode SaaS.

### Typography

Three font roles, never mixed up:

| Font               | Weights loaded     | Used for                                                                       |
| ------------------ | ------------------ | ------------------------------------------------------------------------------ |
| **Josefin Sans**   | 300, 400, 600, 700 | All body/interactive text: buttons, tabs, dropdowns, inputs, body copy, modals |
| **Syne**           | 600, 700, 800      | Structural all-caps labels & headings only (see list below)                    |
| **JetBrains Mono** | 400, 600           | All code: BF display, output, tape cell values, stdin input                    |

Syne is applied via a single grouped selector in `index.css`. Add new all-caps structural elements to that group; do not sprinkle `font-family: "Syne"` elsewhere. Elements currently in the Syne group: `.ide-titlebar strong`, `.ide-tab-btn.active`, `.ide-ribbon-group__title`, `.ide-stdin-label`, `.tape-heading`, `.panel h2`, `.run-mode-label`, `.ide-overlay-section h2`, `.ide-overlay-table th`, `.toc-heading`.

**`text-transform: uppercase` rule:** only on structural micro-labels (ribbon group titles, panel `h2`, stdin/tape headings, table headers, overlay section headers). Never on buttons, tabs, or anything the user reads as content.

### Color tokens (`--` CSS variables)

| Variable       | Value      | Role                                                                 |
| -------------- | ---------- | -------------------------------------------------------------------- |
| `--bg`         | `#0a0915`  | App background                                                       |
| `--surface`    | `#131122`  | Panel / card surfaces                                                |
| `--surface2`   | `#1a1830`  | Inputs, ribbon, secondary surfaces                                   |
| `--border`     | `#26224a`  | All borders and dividers                                             |
| `--accent`     | `#e879f9`  | Primary neon — magenta. Hover glows, active tabs, track-group labels |
| `--accent2`    | `#16bcd5`  | Secondary neon — cyan. Panel headings, data pointer, focus rings     |
| `--accent3`    | `#f5a623`  | Tertiary warm amber — reserved for future use                        |
| `--text`       | `#ede9fe`  | Primary text                                                         |
| `--text-muted` | `#9188bc`  | Secondary / placeholder text                                         |
| `--error-*`    | red family | Error states only                                                    |

### Neon glow utilities

Defined as CSS variables, use them on `box-shadow` / `filter`:

| Variable      | Use                                                   |
| ------------- | ----------------------------------------------------- |
| `--glow-m`    | Full magenta glow — primary hover/active states       |
| `--glow-c`    | Full cyan glow — focus rings, active data pointer     |
| `--glow-m-sm` | Tight magenta glow — small buttons, copy button hover |
| `--glow-c-sm` | Tight cyan glow — input focus, small accents          |

### Component patterns

**Buttons (`.ide-ribbon-btn`, `.play-btn`, `.modal-btn`):**

- `border-radius: var(--radius)` (3px) — angular, not pill-shaped
- Default state: muted text on `--surface2` background
- Hover: border + text shift to `--accent`, add `box-shadow: var(--glow-m)` and `text-shadow`. The glow is the signal — not just a color change.
- Disabled: `opacity: 0.35`, no pointer events

**Ribbon groups (`.ide-ribbon-group`):**

- No background tint. Instead: `border-left: 2px solid rgba(22, 188, 213, 0.45)` (cyan for data groups, magenta for track groups via `--track` modifier)
- Group title has a `◆` pseudo-element via `::before` at `font-size: 1em`

**Panel headings (`.panel h2`):**

- Same left-border treatment as ribbon groups: `border-left: 2px solid var(--accent2); padding-left: 7px`
- Color: `var(--accent2)`, Syne font, uppercase

**Code blocks (`.code-block`):**

- Subtle CRT scanlines via `repeating-linear-gradient` at 4px intervals, `rgba(0,0,0,0.22)` — visible but not distracting

**Modals (`.modal-dialog`):**

- `border-top: 2px solid var(--accent)` + `border-radius: 0 0 var(--radius-lg) var(--radius-lg)` — top accent bar like a club notice pinned to a board

**Dropdowns (`.ide-dropdown`, `.play-split-dropdown`):**

- Hover item: cyan tint background + `color: var(--accent2)` — not just a background flash

**Live stdin (`.ide-stdin-input--live`):**

- `animation: live-neon-flicker` — a multi-keyframe glow that briefly dims and spikes, simulating a neon tube buzzing, not a simple pulse

## Code Style

- Double quotes for all string literals.
- Semicolons always.
- Arrow functions for all callbacks and event handlers. Named `function` declarations are acceptable for top-level utilities within a file.
- Trailing commas in multiline object and array literals.
- Use object spread for immutable state updates: `{ ...prev, [key]: value }`.

## Imports

- Order: React → external libraries → `lib/` → `context/` → `ui-kit/` and `hooks/` → sibling components.
- Always use `.js` extensions in relative imports (ESM): `from "../lib/scales.js"`.
- No barrel/index files. Import directly from the source module.

## File & Directory Responsibilities

- `lib/` — pure TypeScript only. No React, no context, no UI imports. Functions here must be testable in isolation.
- `context/` — state management only. No rendering beyond the provider wrapper.
- `features/` — app-specific UI. May import from `lib/`, `context/`, and `ui-kit/`.
- `ui-kit/` — reusable, domain-agnostic components. Must not import from `context/` or `features/`.
- `hooks/` — reusable React hooks. Must not import from `context/` or `features/`.

## Comments

- Use ASCII section dividers for logical groupings inside large files:
  ```ts
  // ── Section name ───────────────────────────────────────────
  ```
- Comment edge cases and non-obvious decisions inline. Do not add comments explaining what obvious code does.
