import { SCALE, computeSemitone } from "../lib/scales.js";
import { useComposition } from "../context/CompositionContext.js";
import { useTracks } from "../context/TracksContext.js";
import {
  ROW_HEIGHT,
  MIN_NOTE,
  MAX_NOTE,
  KEYS_WIDTH,
  COMMAND_COLORS,
  noteLabel,
  isBlackKey,
} from "../lib/piano.js";

interface PianoKeysSidebarProps {
  scrollRef: React.RefObject<HTMLDivElement | null>;
}

export function PianoKeysSidebar({ scrollRef }: PianoKeysSidebarProps) {
  const { rollRootNote: rootNote, scale } = useComposition();
  const { isEditingProgram } = useTracks();

  const rows = [];
  for (let n = MAX_NOTE; n >= MIN_NOTE; n--) {
    const semitone = computeSemitone(n, rootNote);
    const command = semitone !== null ? SCALE[scale][semitone] : "";
    const isRoot = n === rootNote;
    const black = isBlackKey(n);
    const isC = n % 12 === 0;

    let bg = black ? "var(--bg)" : "var(--surface2)";
    if (isEditingProgram) {
      if (isRoot) bg = "rgba(129,140,248,0.35)";
      else if (command) bg = `${COMMAND_COLORS[command]}22`;
    }

    rows.push(
      <div
        key={n}
        style={{
          height: ROW_HEIGHT,
          background: bg,
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingLeft: 6,
          paddingRight: 4,
          fontSize: 11,
          color: "var(--text-muted)",
          userSelect: "none",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            color:
              isEditingProgram && isRoot
                ? "var(--accent2)"
                : isEditingProgram && command
                  ? COMMAND_COLORS[command]
                  : undefined,
            fontWeight: isEditingProgram && (isRoot || command) ? 700 : 400,
          }}
        >
          {isC ? noteLabel(n) : ""}
        </span>
        {isEditingProgram && command && (
          <span
            style={{
              color: COMMAND_COLORS[command],
              fontFamily: "monospace",
              fontSize: 11,
            }}
          >
            {command}
          </span>
        )}
      </div>,
    );
  }

  return (
    <div
      ref={(el) => {
        if (scrollRef.current === null && el)
          (scrollRef as React.MutableRefObject<HTMLDivElement | null>).current =
            el;
      }}
      style={{
        width: KEYS_WIDTH,
        flexShrink: 0,
        overflowY: "hidden",
        borderRight: "1px solid var(--border)",
      }}
    >
      {rows}
    </div>
  );
}
