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
