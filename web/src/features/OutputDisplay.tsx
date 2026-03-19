interface OutputDisplayProps {
  output: string;
  error: string | null;
  hasRun: boolean;
  liveMode?: boolean;
  liveDisplayedOutput?: string;
}

export function OutputDisplay({
  output,
  error,
  hasRun,
  liveMode,
  liveDisplayedOutput,
}: OutputDisplayProps) {
  if (liveMode) {
    return (
      <section className="panel output-panel">
        <h2>Output</h2>
        {error && <div className="error-box" role="alert">{error}</div>}
        {!error && hasRun && !liveDisplayedOutput && (
          <p className="placeholder">Waiting for playback...</p>
        )}
        {!hasRun && !error && (
          <p className="placeholder">Program output will appear here.</p>
        )}
        {liveDisplayedOutput && (
          <pre className="code-block output-block" aria-live="polite" aria-atomic="false">
            {liveDisplayedOutput}
          </pre>
        )}
      </section>
    );
  }

  return (
    <section className="panel output-panel">
      <h2>Output</h2>
      {error && <div className="error-box" role="alert">{error}</div>}
      {!error && hasRun && output === "" && (
        <p className="placeholder">Program produced no output.</p>
      )}
      {!error && !hasRun && (
        <p className="placeholder">Program output will appear here.</p>
      )}
      {output && (
        <pre className="code-block output-block" aria-live="polite" aria-atomic="false">
          {output}
        </pre>
      )}
    </section>
  );
}
