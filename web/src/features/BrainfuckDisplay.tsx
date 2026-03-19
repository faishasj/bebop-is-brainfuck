import { useState } from "react";

interface BrainfuckDisplayProps {
  code: string;
  activeCharIndex?: number; // index to highlight during playback; -1 or undefined = none
}

export function BrainfuckDisplay({
  code,
  activeCharIndex = -1,
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
          {code.split("").map((ch, i) => (
            <span
              key={i}
              style={
                i === activeCharIndex
                  ? {
                      background: "var(--accent2)",
                      color: "var(--bg)",
                      borderRadius: 2,
                    }
                  : undefined
              }
            >
              {ch}
            </span>
          ))}
        </pre>
      ) : (
        <p className="placeholder">
          Transpiled Brainfuck code will appear here.
        </p>
      )}
    </section>
  );
}
