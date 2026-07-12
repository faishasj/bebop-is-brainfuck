interface OutputDisplayProps {
  output: string;
  error: string | null;
  liveMode?: boolean;
  liveDisplayedOutput?: string;
}

export function OutputDisplay({
  output,
  error,
  liveMode,
  liveDisplayedOutput,
}: OutputDisplayProps) {
  if (liveMode) {
    return (
      <section className="panel output-panel">
        <h2>Output</h2>
        {error ? (
          <div className="error-box" role="alert">
            {error}
          </div>
        ) : (
          <pre
            className="code-block output-block"
            aria-live="polite"
            aria-atomic="false"
          >
            {liveDisplayedOutput}
          </pre>
        )}
      </section>
    );
  }

  return (
    <section className="panel output-panel">
      <h2>Output</h2>
      {error ? (
        <div className="error-box" role="alert">
          {error}
        </div>
      ) : (
        <pre
          className="code-block output-block"
          aria-live="polite"
          aria-atomic="false"
        >
          {output}
        </pre>
      )}
    </section>
  );
}
