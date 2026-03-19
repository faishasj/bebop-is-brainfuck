import { useState, useEffect } from "react";
import { AccessibilityProvider } from "../context/AccessibilityContext.js";
import { CompositionProvider } from "../context/CompositionContext.js";
import { TracksProvider, useTracks } from "../context/TracksContext.js";
import {
  ExecutionProvider,
  useExecution,
} from "../context/ExecutionContext.js";
import { fetchMidi } from "../lib/transpiler.js";
import { IdeToolbar } from "./IdeToolbar.js";
import { BrainfuckDisplay } from "./BrainfuckDisplay.js";
import { OutputDisplay } from "./OutputDisplay.js";
import { TapeVisualization } from "./TapeVisualization.js";
import { PianoRoll } from "./PianoRoll.js";
import { AccessibilityPanel } from "./AccessibilityPanel.js";

function AppLayout() {
  const {
    liveInputPending,
    stdinInputRef,
    stdin,
    setStdin,
    submitLiveInput,
    brainfuck,
    activeBfCharIndex,
    output,
    error,
    hasRun,
    liveDisplayedOutput,
    liveTapeState,
    runMode,
  } = useExecution();

  const [bottomHeight, setBottomHeight] = useState(220);
  const [a11yOpen, setA11yOpen] = useState(false);
  const showTape = runMode === "live";

  function handleDividerMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    const startY = e.clientY;
    const startH = bottomHeight;
    function onMove(ev: MouseEvent) {
      setBottomHeight(
        Math.max(
          120,
          Math.min(window.innerHeight * 0.65, startH + (startY - ev.clientY)),
        ),
      );
    }
    function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  return (
    <div className="app">
      <IdeToolbar onOpenA11y={() => setA11yOpen(true)} />
      <div className="ide-body">
        <div className="ide-piano-section">
          <PianoRoll />
        </div>
        <div
          className="ide-resize-handle"
          onMouseDown={handleDividerMouseDown}
        />
        <div
          className={`ide-bottom${showTape ? " ide-bottom--with-tape" : ""}`}
          style={{ height: bottomHeight }}
        >
          <div className="ide-stdin-row">
            <label className="ide-stdin-label">
              {liveInputPending ? "Input:" : "Stdin"}
            </label>
            <input
              ref={stdinInputRef}
              className={`ide-stdin-input${liveInputPending ? " ide-stdin-input--live" : ""}`}
              type="text"
              value={stdin}
              onChange={(e) => {
                if (!liveInputPending) setStdin(e.target.value);
              }}
              onKeyDown={(e) => {
                if (!liveInputPending) return;
                if (e.key.length === 1) {
                  e.preventDefault();
                  submitLiveInput(e.key);
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  submitLiveInput("");
                }
              }}
              placeholder={liveInputPending ? "type a character…" : "(empty)"}
              readOnly={liveInputPending}
            />
          </div>
          {showTape && <TapeVisualization snapshot={liveTapeState} />}
          <BrainfuckDisplay
            code={brainfuck}
            activeCharIndex={activeBfCharIndex}
          />
          <OutputDisplay
            output={output}
            error={error}
            hasRun={hasRun}
            liveMode={runMode === "live"}
            liveDisplayedOutput={liveDisplayedOutput}
          />
        </div>
      </div>
      {a11yOpen && <AccessibilityPanel onClose={() => setA11yOpen(false)} />}
    </div>
  );
}

const EXAMPLES = [
  { label: "Hello, World! (Bebop)", file: "hello_world_bebop.mid" },
  { label: "Hello, World! (in E)", file: "hello_world_in_E.mid" },
];

function SampleLoader() {
  const { loadMidi } = useTracks();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sampleParam = params.get("sample");
    if (!sampleParam) return;

    const match = EXAMPLES.find(
      (e) =>
        e.file === sampleParam || e.file.replace(/\.mid$/, "") === sampleParam,
    );
    if (!match) return;

    history.replaceState(null, "", window.location.pathname);
    fetchMidi(`examples/${match.file}`)
      .then((parsed) => loadMidi(parsed, match.label))
      .catch(console.error);
  }, []);

  return null;
}

export function App() {
  return (
    <AccessibilityProvider>
      <CompositionProvider>
        <TracksProvider>
          <ExecutionProvider>
            <SampleLoader />
            <AppLayout />
          </ExecutionProvider>
        </TracksProvider>
      </CompositionProvider>
    </AccessibilityProvider>
  );
}
