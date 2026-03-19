import { useState } from "react";

interface BrainfuckDisplayProps {
  code: string;
  activeCharIndex?: number; // index to highlight during playback; -1 or undefined = none
  loopHighlightRange?: [number, number] | null; // [open, close] charIndex range to highlight
}

export function BrainfuckDisplay({
  code,
  activeCharIndex = -1,
  loopHighlightRange = null,
}: BrainfuckDisplayProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <section className="panel bf-panel">
      <div className="panel-header">
        <h2>Brainfuck</h2>
        {code && (
          <div className="panel-meta">
            <span className="char-count">{code.length} chars</span>
            <button
              className="copy-btn"
              onClick={handleCopy}
              aria-label={copied ? "Copied!" : "Copy Brainfuck to clipboard"}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        )}
      </div>
      {code ? (
        <pre className="code-block">
          {code.split("").map((ch, i) => {
            const isActive = i === activeCharIndex;
            const isLoop =
              !isActive &&
              loopHighlightRange !== null &&
              i >= loopHighlightRange[0] &&
              i <= loopHighlightRange[1];
            return (
              <span
                key={i}
                style={
                  isActive
                    ? {
                        background: "var(--accent2)",
                        color: "var(--bg)",
                        borderRadius: 2,
                      }
                    : isLoop
                      ? {
                          background: "rgba(22, 188, 213, 0.18)",
                          borderRadius: 2,
                        }
                      : undefined
                }
              >
                {ch}
              </span>
            );
          })}
        </pre>
      ) : (
        <p className="placeholder">
          Transpiled Brainfuck code will appear here.
        </p>
      )}
    </section>
  );
}
