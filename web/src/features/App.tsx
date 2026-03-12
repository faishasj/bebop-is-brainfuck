import { useState, useEffect } from "react";
import { CompositionProvider } from "../context/CompositionContext.js";
import { TracksProvider } from "../context/TracksContext.js";
import {
  ExecutionProvider,
  useExecution,
} from "../context/ExecutionContext.js";
import { IdeToolbar } from "./IdeToolbar.js";
import { BrainfuckDisplay } from "./BrainfuckDisplay.js";
import { OutputDisplay } from "./OutputDisplay.js";
import { PianoRoll } from "./PianoRoll.js";

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
    runMode,
  } = useExecution();

  const [bottomHeight, setBottomHeight] = useState(220);
  const [editorMode, setEditorMode] = useState<"add" | "delete">("add");

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "a" || e.key === "A") setEditorMode("add");
      else if (e.key === "d" || e.key === "D") setEditorMode("delete");
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
      <IdeToolbar />
      <div className="ide-body">
        <div className="ide-piano-section">
          <PianoRoll editorMode={editorMode} setEditorMode={setEditorMode} />
        </div>
        <div
          className="ide-resize-handle"
          onMouseDown={handleDividerMouseDown}
        />
        <div className="ide-bottom" style={{ height: bottomHeight }}>
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
    </div>
  );
}

export function App() {
  return (
    <CompositionProvider>
      <TracksProvider>
        <ExecutionProvider>
          <AppLayout />
        </ExecutionProvider>
      </TracksProvider>
    </CompositionProvider>
  );
}
