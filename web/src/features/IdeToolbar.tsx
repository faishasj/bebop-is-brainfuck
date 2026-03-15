import { useRef, useState } from "react";
import { parseMidiBuffer, fetchMidi } from "../lib/transpiler.js";
import { SCALES } from "../lib/scales.js";
import { DEFAULT_INSTRUMENT, PLAY_MODE, RUN_MODE } from "../lib/player.js";
import { INSTRUMENTS } from "../lib/midiExport.js";
import { NumericInput } from "../ui-kit/NumericInput.js";
import { HelpPanel } from "./HelpPanel.js";
import { AboutPanel } from "./AboutPanel.js";
import { CustomSelect } from "../ui-kit/CustomSelect.js";
import { useComposition } from "../context/CompositionContext.js";
import { useTracks, type TrackMeta } from "../context/TracksContext.js";
import { useExecution } from "../context/ExecutionContext.js";
import { useClickOutside } from "../hooks/useClickOutside.js";
import { Icon } from "../ui-kit/Icon.js";
import { ConfirmDialog } from "../ui-kit/ConfirmDialog.js";
import { InlineEdit } from "../ui-kit/InlineEdit.js";
import { NOTE_NAMES } from "../lib/piano.js";
import { TrackSelect } from "../ui-kit/TrackSelect.js";

interface Example {
  label: string;
  file: string;
}

const EXAMPLES: Example[] = [
  { label: "Hello, World! (Bebop)", file: "hello_world_bebop.mid" },
  { label: "Hello, World! (in E)", file: "hello_world_in_E.mid" },
];

function noteLabel(n: number) {
  return `${NOTE_NAMES[n % 12]}${Math.floor(n / 12) - 1}`;
}
const ROOT_NOTE_OPTIONS: { value: number; label: string }[] = [];
for (let n = 84; n >= 24; n--)
  ROOT_NOTE_OPTIONS.push({ value: n, label: noteLabel(n) });

const TIME_SIG_NUM_OPTIONS = [2, 3, 4, 5, 6, 7, 9, 12].map((n) => ({
  value: n,
  label: String(n),
}));
const TIME_SIG_DEN_OPTIONS = [2, 4, 8, 16].map((d) => ({
  value: d,
  label: String(d),
}));

export function IdeToolbar() {
  const {
    scale,
    setScale: onScaleChange,
    bpm,
    setBpm: onBpmChange,
    timeSig,
    setTimeSig: onTimeSigChange,
    rollRootNote: rootNote,
    setRollRootNote: onRootNoteChange,
    totalBeats,
    setTotalBeats: onTotalBeatsChange,
  } = useComposition();

  const {
    fileName,
    setFileName: onFileNameChange,
    loadMidi: onMidiLoaded,
    tracks,
    trackIndex,
    addTrack: onAddTrack,
    deleteTrack: onDeleteTrack,
    renameTrack: onRenameTrack,
    editingTrackIndex,
    setEditingTrackIndex: onEditingTrackChange,
    trackHasNotes,
    rollNotes,
    setInstrument,
    updateNotes,
    exportMidi: onExport,
    resetComposition: onResetComposition,
  } = useTracks();

  const {
    isPlaying,
    currentBeat,
    run: onRun,
    setPlayMode: onPlayModeChange,
    playMode,
    runMode,
    setRunMode: onRunModeChange,
    canResume,
    liveInputPending,
    isPausedAtBreakpoint,
    stepBeat: onStepBeat,
    continueFromBreakpoint: onContinue,
    stop: onStop,
    resetPlayhead: onResetPlayhead,
  } = useExecution();

  const [renamingTrack, setRenamingTrack] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");

  function startRename() {
    setRenameDraft(tracks.find((t) => t.id === editingTrackIndex)?.name ?? "");
    setRenamingTrack(true);
  }

  function commitRename() {
    const trimmed = renameDraft.trim();
    if (trimmed) onRenameTrack(editingTrackIndex, trimmed);
    setRenamingTrack(false);
  }

  const inputRef = useRef<HTMLInputElement>(null);
  const sampleMenuRef = useRef<HTMLDivElement>(null);
  const playModeMenuRef = useRef<HTMLDivElement>(null);
  const runModeMenuRef = useRef<HTMLDivElement>(null);

  const displayFileName = fileName || "composition.mid";
  const trackInstrument =
    tracks.find((t) => t.id === editingTrackIndex)?.instrument ??
    DEFAULT_INSTRUMENT;
  const onTrackInstrumentChange = (instrument: string) =>
    setInstrument(editingTrackIndex, instrument);
  const onClear = () => updateNotes(editingTrackIndex, []);
  const hasNotes = rollNotes.length > 0;

  const [activeTab, setActiveTab] = useState<"file" | "compose">("file");
  const [overlayTab, setOverlayTab] = useState<"help" | "about" | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [sampleOpen, setSampleOpen] = useState(false);
  const [playModeOpen, setPlayModeOpen] = useState(false);
  const [runModeOpen, setRunModeOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<TrackMeta | null>(null);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  const MODE_LABELS: Record<PLAY_MODE, string> = {
    all: "All",
    program: "Program",
    current: "Track",
  };

  const MODE_HINTS: Record<PLAY_MODE, string> = {
    all: "All",
    program: "Program track",
    current: "Current track",
  };

  const RUN_MODE_LABELS: Record<RUN_MODE, string> = {
    notes: "Notes only",
    live: "Live",
    batch: "Batch",
  };

  const RUN_MODE_HINTS: Record<RUN_MODE, string> = {
    notes: "Just hear the music",
    live: "Output revealed beat by beat",
    batch: "Run first, then play audio",
  };

  useClickOutside(sampleMenuRef, () => setSampleOpen(false), sampleOpen);
  useClickOutside(playModeMenuRef, () => setPlayModeOpen(false), playModeOpen);
  useClickOutside(runModeMenuRef, () => setRunModeOpen(false), runModeOpen);

  async function handleFile(file: File) {
    const buffer = await file.arrayBuffer();
    const parsed = parseMidiBuffer(buffer);
    onMidiLoaded(parsed, file.name);
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.[0]) handleFile(e.target.files[0]);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith(".mid")) handleFile(file);
  }

  async function loadExample(example: Example) {
    setLoading(example.file);
    try {
      const parsed = await fetchMidi(`examples/${example.file}`);
      onMidiLoaded(parsed, example.label);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(null);
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".mid"
        style={{ display: "none" }}
        onChange={onInputChange}
      />

      {/* Title bar */}
      <div className="ide-titlebar">
        <strong>🎷 Bebop is Brainfuck</strong>
        <a
          href="https://github.com/faishasj/bebop-is-brainfuck"
          target="_blank"
          rel="noreferrer"
        >
          GitHub ↗
        </a>
      </div>

      {/* Tab row */}
      <div className="ide-tabrow">
        <button
          className={`ide-tab-btn ${activeTab === "file" ? "active" : ""}`}
          onClick={() => setActiveTab("file")}
        >
          File
        </button>
        <button
          className={`ide-tab-btn ${activeTab === "compose" ? "active" : ""}`}
          onClick={() => setActiveTab("compose")}
        >
          Compose
        </button>
        <button
          className={`ide-tab-btn ${overlayTab === "help" ? "active" : ""}`}
          onClick={() => setOverlayTab((v) => (v === "help" ? null : "help"))}
        >
          Help
        </button>
        <button
          className={`ide-tab-btn ${overlayTab === "about" ? "active" : ""}`}
          onClick={() => setOverlayTab((v) => (v === "about" ? null : "about"))}
        >
          About
        </button>
        <InlineEdit
          value={displayFileName}
          onCommit={(trimmed) => {
            if (trimmed) {
              const name = trimmed.endsWith(".mid")
                ? trimmed
                : `${trimmed}.mid`;
              onFileNameChange(name);
            }
          }}
          inputClassName="ide-filename-input"
          selectOnOpen="stem"
        >
          {({ onActivate }) => (
            <span
              className="ide-filename"
              onClick={onActivate}
              title="Click to rename"
            >
              {displayFileName}
            </span>
          )}
        </InlineEdit>

        <div className="ide-tabrow-actions">
          {/* Run mode picker */}
          <span className="run-mode-label">Mode</span>
          <div className="run-mode-dropdown" ref={runModeMenuRef}>
            <button
              className="run-mode-trigger"
              onClick={() => setRunModeOpen((o) => !o)}
              disabled={isPlaying || currentBeat > 0}
              title="Execution mode"
              style={{ width: "7rem" }}
            >
              <span>{RUN_MODE_LABELS[runMode]}</span>
              <Icon name="chevron-down" />
            </button>
            {runModeOpen && (
              <div className="run-mode-menu ide-dropdown">
                {(["notes", "live", "batch"] as const).map((mode) => (
                  <div
                    key={mode}
                    className={`run-mode-item ide-dropdown-item${runMode === mode ? " ide-dropdown-item--active" : ""}`}
                    onClick={() => {
                      onRunModeChange(mode);
                      setRunModeOpen(false);
                    }}
                  >
                    <span className="run-mode-item__name">
                      {RUN_MODE_LABELS[mode]}
                    </span>
                    <span className="run-mode-item__hint">
                      {RUN_MODE_HINTS[mode]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Run / Pause / Breakpoint controls */}
          {isPausedAtBreakpoint ? (
            <>
              <button
                className="play-btn"
                onClick={onContinue}
                style={{ width: "13rem" }}
              >
                <div>▶ Continue</div>
                <kbd>SPACE</kbd>
              </button>
              <button
                className="play-btn"
                onClick={onStepBeat}
                title="Step to next program note"
              >
                <div>⏭ Step</div>
                <kbd>F10</kbd>
              </button>
            </>
          ) : isPlaying ? (
            <button
              className="play-btn"
              onClick={onStop}
              style={{ width: "13rem" }}
            >
              <div>⏸ Pause</div>
              <kbd>SPACE</kbd>
            </button>
          ) : (
            <div className="play-split-btn" ref={playModeMenuRef}>
              <button
                className="play-btn play-split-btn__main"
                onClick={() => onRun()}
                disabled={!hasNotes || liveInputPending}
                style={{ width: "13rem" }}
              >
                <div>
                  {canResume
                    ? `▶ Resume ${MODE_LABELS[playMode]}`
                    : `▶ Run ${MODE_LABELS[playMode]}`}
                </div>
                <kbd className="ide-toolbar-kbd">SPACE</kbd>
              </button>
              <button
                className="play-btn play-split-btn__chevron"
                onClick={() => setPlayModeOpen((o) => !o)}
                disabled={!hasNotes || liveInputPending}
                title="Select tracks"
              >
                <Icon name="chevron-down" />
              </button>
              {playModeOpen && (
                <div className="play-split-dropdown">
                  {(["all", "program", "current"] as const).map((mode) => (
                    <div
                      key={mode}
                      className={`ide-dropdown-item${playMode === mode ? " ide-dropdown-item--active" : ""}`}
                      onClick={() => {
                        onPlayModeChange(mode);
                        setPlayModeOpen(false);
                      }}
                    >
                      {playMode === mode ? "▶ " : "\u00a0\u00a0\u00a0"}
                      {MODE_HINTS[mode]}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {currentBeat > 0 && (
            <button
              className="play-btn"
              onClick={() => {
                onStop();
                onResetPlayhead();
              }}
              title="Reset playhead to beat 0"
            >
              ⏮ Reset
            </button>
          )}
        </div>
      </div>

      {/* Ribbon row */}
      <div
        className={`ide-ribbon ${activeTab === "file" && dragging ? "ide-ribbon-dragging" : ""}`}
        onDragOver={
          activeTab === "file"
            ? (e) => {
                e.preventDefault();
                setDragging(true);
              }
            : undefined
        }
        onDragLeave={
          activeTab === "file" ? () => setDragging(false) : undefined
        }
        onDrop={activeTab === "file" ? onDrop : undefined}
      >
        {activeTab === "file" && (
          <>
            <button
              className="ide-ribbon-btn"
              onClick={() => inputRef.current?.click()}
            >
              ↑ Load .mid
            </button>
            <div className="ide-sample-menu" ref={sampleMenuRef}>
              <button
                className="ide-ribbon-btn"
                onClick={() => setSampleOpen((o) => !o)}
              >
                ↑ Load sample
              </button>
              {sampleOpen && (
                <div className="ide-dropdown">
                  {EXAMPLES.map((ex) => (
                    <div
                      key={ex.file}
                      className={`ide-dropdown-item ${loading === ex.file ? "ide-dropdown-item--disabled" : ""}`}
                      onClick={() => {
                        loadExample(ex);
                        setSampleOpen(false);
                      }}
                    >
                      {loading === ex.file ? "…" : ex.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="ide-ribbon-sep" />
            <button
              className="ide-ribbon-btn"
              onClick={onExport}
              disabled={!hasNotes}
            >
              ↓ Export .mid
            </button>
            <div className="ide-ribbon-sep" />
            <button
              className="ide-ribbon-btn ide-ribbon-btn--danger"
              onClick={() => setResetDialogOpen(true)}
            >
              ↺ Reset composition
            </button>
          </>
        )}

        {activeTab === "compose" && (
          <>
            <div className="ide-ribbon-group">
              <div className="ide-ribbon-group__controls">
                <div style={{ display: "flex", alignItems: "stretch", gap: 2 }}>
                  {renamingTrack ? (
                    <input
                      value={renameDraft}
                      onChange={(e) => setRenameDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename();
                        if (e.key === "Escape") setRenamingTrack(false);
                      }}
                      style={{ width: 150 }}
                      autoFocus
                    />
                  ) : (
                    <TrackSelect
                      tracks={tracks}
                      programTrackId={trackIndex}
                      value={editingTrackIndex}
                      onChange={onEditingTrackChange}
                      onAdd={onAddTrack}
                      onDelete={(t) => {
                        if (trackHasNotes[t.id]) {
                          setDeleteDialog(t);
                        } else {
                          onDeleteTrack(t.id);
                        }
                      }}
                    />
                  )}
                  <button
                    className="ide-ribbon-btn"
                    onClick={renamingTrack ? commitRename : startRename}
                    title={renamingTrack ? "Confirm rename" : "Rename track"}
                    style={{ padding: "0.28rem 6px", minWidth: 0 }}
                  >
                    <Icon name={renamingTrack ? "check" : "pencil"} />
                  </button>
                </div>
              </div>
              <div className="ide-ribbon-group__title">Tracks</div>
            </div>
            <div className="ide-ribbon-group">
              <div className="ide-ribbon-group__controls">
                <label>Root</label>
                <CustomSelect
                  value={rootNote}
                  options={ROOT_NOTE_OPTIONS}
                  onChange={onRootNoteChange}
                  style={{ width: 68 }}
                />
                <label>Scale</label>
                <CustomSelect
                  value={scale}
                  options={SCALES}
                  onChange={onScaleChange}
                  style={{ width: 142 }}
                />
              </div>
              <div className="ide-ribbon-group__title">Interpretation</div>
            </div>
            <div className="ide-ribbon-group">
              <div className="ide-ribbon-group__controls">
                <label>Beats</label>
                <NumericInput
                  value={totalBeats}
                  min={4}
                  max={128}
                  onChange={onTotalBeatsChange}
                  style={{ width: 52 }}
                />
                <label>BPM</label>
                <NumericInput
                  value={bpm}
                  min={20}
                  max={300}
                  onChange={onBpmChange}
                  style={{ width: 52 }}
                />
                <label>Time sig</label>
                <CustomSelect
                  value={timeSig.num}
                  options={TIME_SIG_NUM_OPTIONS}
                  onChange={(n) => onTimeSigChange({ ...timeSig, num: n })}
                  style={{ width: 52 }}
                />
                <span>/</span>
                <CustomSelect
                  value={timeSig.den}
                  options={TIME_SIG_DEN_OPTIONS}
                  onChange={(d) => onTimeSigChange({ ...timeSig, den: d })}
                  style={{ width: 52 }}
                />
              </div>
              <div className="ide-ribbon-group__title">Playback</div>
            </div>
            <div className="ide-ribbon-group ide-ribbon-group--track">
              <div className="ide-ribbon-group__controls">
                <label>Instrument</label>
                <CustomSelect
                  value={trackInstrument}
                  options={INSTRUMENTS}
                  onChange={onTrackInstrumentChange}
                  columns={2}
                  style={{ width: 148 }}
                />
                <button
                  className="ide-ribbon-btn ide-ribbon-btn--danger"
                  onClick={() => setClearDialogOpen(true)}
                  disabled={!(trackHasNotes[editingTrackIndex] ?? false)}
                  title="Clear current track"
                >
                  <Icon name="trash" />
                  <div>Clear notes</div>
                </button>
              </div>
              <div className="ide-ribbon-group__title">Track controls</div>
            </div>
          </>
        )}
      </div>

      {/* Delete confirmation dialog */}
      {deleteDialog && (
        <ConfirmDialog
          title="Delete Track"
          message={`Are you sure you want to delete "${deleteDialog.name}"? This track contains notes and cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={() => {
            onDeleteTrack(deleteDialog.id);
            setDeleteDialog(null);
          }}
          onCancel={() => setDeleteDialog(null)}
        />
      )}
      {clearDialogOpen && (
        <ConfirmDialog
          title="Clear Track"
          message="This will remove all notes from the current track. This cannot be undone. Continue?"
          confirmLabel="Clear"
          onConfirm={() => {
            onClear();
            setClearDialogOpen(false);
          }}
          onCancel={() => setClearDialogOpen(false)}
        />
      )}
      {resetDialogOpen && (
        <ConfirmDialog
          title="Reset Composition"
          message="This will clear all tracks, notes, and reset all settings to their defaults. This cannot be undone. Continue?"
          confirmLabel="Reset"
          onConfirm={() => {
            onStop();
            onResetPlayhead();
            onResetComposition();
            setResetDialogOpen(false);
          }}
          onCancel={() => setResetDialogOpen(false)}
        />
      )}

      {/* Help / About overlay */}
      {overlayTab && (
        <div className="ide-overlay">
          <div className="ide-overlay-inner">
            <button
              className="ide-overlay-close"
              onClick={() => setOverlayTab(null)}
              title="Close"
            >
              ×
            </button>
            {overlayTab === "help" ? <HelpPanel /> : <AboutPanel />}
          </div>
        </div>
      )}
    </>
  );
}
