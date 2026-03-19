import { useEffect, useRef, useState } from "react";
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
import { Tooltip } from "../ui-kit/Tooltip.js";
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

interface IdeToolbarProps {
  onOpenA11y?: () => void;
}

export function IdeToolbar({ onOpenA11y }: IdeToolbarProps) {
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
    breakpoints,
    stepBeat: onStepBeat,
    continueFromBreakpoint: onContinue,
    clearBreakpoints: onClearBreakpoints,
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

  const [activeTab, setActiveTab] = useState<"file" | "compose" | "debug">(
    "file",
  );
  const [overlayTab, setOverlayTab] = useState<"help" | "about" | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [sampleOpen, setSampleOpen] = useState(false);
  const [playModeOpen, setPlayModeOpen] = useState(false);
  const [runModeOpen, setRunModeOpen] = useState(false);
  const [runModeFocused, setRunModeFocused] = useState(0);
  const [playModeFocused, setPlayModeFocused] = useState(0);
  const runModeTriggerRef = useRef<HTMLButtonElement>(null);
  const playModeChevronRef = useRef<HTMLButtonElement>(null);
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

  const RUN_MODE_ICONS = {
    notes: "music",
    live: "activity",
    batch: "zap",
  } as const;

  const RUN_MODE_HINTS: Record<RUN_MODE, string> = {
    notes: "Just hear the music",
    live: "Output revealed beat by beat",
    batch: "Run first, then play audio",
  };

  const RUN_MODES: RUN_MODE[] = ["notes", "live", "batch"];
  const PLAY_MODES: PLAY_MODE[] = ["all", "program", "current"];

  useClickOutside(sampleMenuRef, () => setSampleOpen(false), sampleOpen);
  useClickOutside(playModeMenuRef, () => setPlayModeOpen(false), playModeOpen);
  useClickOutside(runModeMenuRef, () => setRunModeOpen(false), runModeOpen);

  useEffect(() => {
    if (isPausedAtBreakpoint) setActiveTab("debug");
  }, [isPausedAtBreakpoint]);

  function handleRunModeKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!runModeOpen) {
          setRunModeFocused(RUN_MODES.indexOf(runMode));
          setRunModeOpen(true);
        } else {
          setRunModeFocused((i) => Math.min(i + 1, RUN_MODES.length - 1));
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        if (runModeOpen) {
          setRunModeFocused((i) => Math.max(i - 1, 0));
        }
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (runModeOpen) {
          onRunModeChange(RUN_MODES[runModeFocused]);
          setRunModeOpen(false);
          runModeTriggerRef.current?.focus();
        } else {
          setRunModeFocused(RUN_MODES.indexOf(runMode));
          setRunModeOpen(true);
        }
        break;
      case "Escape":
        if (runModeOpen) {
          e.preventDefault();
          setRunModeOpen(false);
          runModeTriggerRef.current?.focus();
        }
        break;
      case "Tab":
        if (runModeOpen) setRunModeOpen(false);
        break;
    }
  }

  function handlePlayModeKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!playModeOpen) {
          setPlayModeFocused(PLAY_MODES.indexOf(playMode));
          setPlayModeOpen(true);
        } else {
          setPlayModeFocused((i) => Math.min(i + 1, PLAY_MODES.length - 1));
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        if (playModeOpen) {
          setPlayModeFocused((i) => Math.max(i - 1, 0));
        }
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (playModeOpen) {
          onPlayModeChange(PLAY_MODES[playModeFocused]);
          setPlayModeOpen(false);
          playModeChevronRef.current?.focus();
        } else {
          setPlayModeFocused(PLAY_MODES.indexOf(playMode));
          setPlayModeOpen(true);
        }
        break;
      case "Escape":
        if (playModeOpen) {
          e.preventDefault();
          setPlayModeOpen(false);
          playModeChevronRef.current?.focus();
        }
        break;
      case "Tab":
        if (playModeOpen) setPlayModeOpen(false);
        break;
    }
  }

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
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          {onOpenA11y && (
            <Tooltip content="Accessibility settings" placement="below-left">
              <button
                className="a11y-trigger-btn"
                onClick={onOpenA11y}
                aria-label="Accessibility settings"
              >
                A11y
              </button>
            </Tooltip>
          )}
          <a
            href="https://github.com/faishasj/bebop-is-brainfuck"
            target="_blank"
            rel="noreferrer"
          >
            GitHub ↗
          </a>
        </div>
      </div>

      {/* Tab row */}
      <div className="ide-tabrow">
        <button
          className={`ide-tab-btn ${activeTab === "file" ? "active" : ""}`}
          onClick={() => setActiveTab("file")}
        >
          <span className="ide-tab-icon">
            <Icon name="file" />
          </span>
          <span className="ide-tab-label">File</span>
        </button>
        <button
          className={`ide-tab-btn ${activeTab === "compose" ? "active" : ""}`}
          onClick={() => setActiveTab("compose")}
        >
          <span className="ide-tab-icon">
            <Icon name="music" />
          </span>
          <span className="ide-tab-label">Compose</span>
        </button>
        <button
          className={`ide-tab-btn ${activeTab === "debug" ? "active" : ""}`}
          onClick={() => setActiveTab("debug")}
        >
          <span className="ide-tab-icon">
            <Icon name="bug" />
          </span>
          <span className="ide-tab-label">Debug</span>
        </button>
        <button
          className={`ide-tab-btn ${overlayTab === "help" ? "active" : ""}`}
          onClick={() => setOverlayTab((v) => (v === "help" ? null : "help"))}
        >
          <span className="ide-tab-icon">
            <Icon name="help-circle" />
          </span>
          <span className="ide-tab-label">Help</span>
        </button>
        <button
          className={`ide-tab-btn ${overlayTab === "about" ? "active" : ""}`}
          onClick={() => setOverlayTab((v) => (v === "about" ? null : "about"))}
        >
          <span className="ide-tab-icon">
            <Icon name="info-circle" />
          </span>
          <span className="ide-tab-label">About</span>
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
            <Tooltip content="Click to rename">
              <span className="ide-filename" onClick={onActivate}>
                {displayFileName}
              </span>
            </Tooltip>
          )}
        </InlineEdit>

        <div className="ide-tabrow-actions">
          {/* Run mode picker */}
          <span className="run-mode-label">Mode</span>
          <div
            className={`run-mode-dropdown${currentBeat > 0 ? " run-mode-dropdown--hidden-mobile" : ""}`}
            ref={runModeMenuRef}
          >
            <Tooltip content="Execution mode" placement="below-left">
              <button
                ref={runModeTriggerRef}
                className="run-mode-trigger"
                onClick={() => {
                  setRunModeFocused(RUN_MODES.indexOf(runMode));
                  setRunModeOpen((o) => !o);
                }}
                onKeyDown={handleRunModeKeyDown}
                disabled={isPlaying || currentBeat > 0}
                aria-label="Execution mode"
                aria-haspopup="listbox"
                aria-expanded={runModeOpen}
                style={{ width: "7rem" }}
              >
                <span className="run-mode-trigger__icon">
                  <Icon name={RUN_MODE_ICONS[runMode]} />
                </span>
                <span className="run-mode-trigger__text">
                  {RUN_MODE_LABELS[runMode]}
                </span>
                <Icon name="chevron-down" />
              </button>
            </Tooltip>
            {runModeOpen && (
              <ul
                className="run-mode-menu ide-dropdown"
                role="listbox"
                aria-label="Execution mode"
              >
                {RUN_MODES.map((mode, i) => (
                  <li
                    key={mode}
                    role="option"
                    aria-selected={runMode === mode}
                    className={`run-mode-item ide-dropdown-item${runMode === mode ? " ide-dropdown-item--active" : ""}${i === runModeFocused ? " ide-dropdown-item--focused" : ""}`}
                    onClick={() => {
                      onRunModeChange(mode);
                      setRunModeOpen(false);
                    }}
                    onMouseEnter={() => setRunModeFocused(i)}
                  >
                    <span className="run-mode-item__name">
                      {RUN_MODE_LABELS[mode]}
                    </span>
                    <span className="run-mode-item__hint">
                      {RUN_MODE_HINTS[mode]}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {/* Run / Pause controls */}
          {isPausedAtBreakpoint ? (
            <button
              className="play-btn"
              onClick={onContinue}
              style={{ width: "13rem" }}
            >
              <span className="play-btn-icon">
                <Icon name="play" />
              </span>
              <span className="play-btn-label">▶ Continue</span>
              <kbd>SPACE</kbd>
            </button>
          ) : isPlaying ? (
            <button
              className="play-btn"
              onClick={onStop}
              style={{ width: "13rem" }}
            >
              <span className="play-btn-icon">
                <Icon name="pause" />
              </span>
              <span className="play-btn-label">⏸ Pause</span>
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
                <span className="play-btn-icon">
                  <Icon name="play" />
                </span>
                <span className="play-btn-label">
                  {canResume
                    ? `▶ Resume ${MODE_LABELS[playMode]}`
                    : `▶ Run ${MODE_LABELS[playMode]}`}
                </span>
                <kbd className="ide-toolbar-kbd">SPACE</kbd>
              </button>
              <Tooltip content="Select tracks" placement="below-left">
                <button
                  ref={playModeChevronRef}
                  className="play-btn play-split-btn__chevron"
                  onClick={() => {
                    setPlayModeFocused(PLAY_MODES.indexOf(playMode));
                    setPlayModeOpen((o) => !o);
                  }}
                  onKeyDown={handlePlayModeKeyDown}
                  disabled={!hasNotes || liveInputPending}
                  aria-label="Select tracks to play"
                  aria-haspopup="listbox"
                  aria-expanded={playModeOpen}
                >
                  <Icon name="chevron-down" />
                </button>
              </Tooltip>
              {playModeOpen && (
                <ul
                  className="play-split-dropdown"
                  role="listbox"
                  aria-label="Play mode"
                >
                  {PLAY_MODES.map((mode, i) => (
                    <li
                      key={mode}
                      role="option"
                      aria-selected={playMode === mode}
                      className={`ide-dropdown-item${playMode === mode ? " ide-dropdown-item--active" : ""}${i === playModeFocused ? " ide-dropdown-item--focused" : ""}`}
                      onClick={() => {
                        onPlayModeChange(mode);
                        setPlayModeOpen(false);
                      }}
                      onMouseEnter={() => setPlayModeFocused(i)}
                    >
                      {playMode === mode ? "▶ " : "\u00a0\u00a0\u00a0"}
                      {MODE_HINTS[mode]}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {currentBeat > 0 && (
            <Tooltip content="Reset playhead to beat 0" placement="below-left">
              <button
                className="play-btn"
                onClick={() => {
                  onStop();
                  onResetPlayhead();
                }}
              >
                <span className="play-btn-icon">
                  <Icon name="skip-back" />
                </span>
                <span className="play-btn-label">⏮ Reset</span>
              </button>
            </Tooltip>
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
            <div className="ide-ribbon-group ide-ribbon-group--tracks">
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
                      label="Track"
                      onDelete={(t) => {
                        if (trackHasNotes[t.id]) {
                          setDeleteDialog(t);
                        } else {
                          onDeleteTrack(t.id);
                        }
                      }}
                    />
                  )}
                  <Tooltip
                    content={renamingTrack ? "Confirm rename" : "Rename track"}
                  >
                    <button
                      className="ide-ribbon-btn"
                      onClick={renamingTrack ? commitRename : startRename}
                      style={{ padding: "0.28rem 6px", minWidth: 0 }}
                    >
                      <Icon name={renamingTrack ? "check" : "pencil"} />
                    </button>
                  </Tooltip>
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
                  label="Root note"
                />
                <label>Scale</label>
                <CustomSelect
                  value={scale}
                  options={SCALES}
                  onChange={onScaleChange}
                  style={{ width: 142 }}
                  label="Scale"
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
                  label="Time signature numerator"
                />
                <span>/</span>
                <CustomSelect
                  value={timeSig.den}
                  options={TIME_SIG_DEN_OPTIONS}
                  onChange={(d) => onTimeSigChange({ ...timeSig, den: d })}
                  style={{ width: 52 }}
                  label="Time signature denominator"
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
                  label="Instrument"
                />
                <Tooltip content="Clear current track">
                  <button
                    className="ide-ribbon-btn ide-ribbon-btn--danger"
                    onClick={() => setClearDialogOpen(true)}
                    disabled={!(trackHasNotes[editingTrackIndex] ?? false)}
                  >
                    <Icon name="trash" />
                    <div>Clear notes</div>
                  </button>
                </Tooltip>
              </div>
              <div className="ide-ribbon-group__title">Track controls</div>
            </div>
          </>
        )}

        {activeTab === "debug" && (
          <>
            <div className="ide-ribbon-group">
              <div className="ide-ribbon-group__controls">
                <Tooltip content="Continue execution (SPACE)">
                  <button
                    className="ide-ribbon-btn"
                    onClick={onContinue}
                    disabled={!isPausedAtBreakpoint}
                  >
                    ▶ Continue
                  </button>
                </Tooltip>
                <Tooltip content="Step to next program note (F10)">
                  <button
                    className="ide-ribbon-btn"
                    onClick={onStepBeat}
                    disabled={!isPausedAtBreakpoint}
                  >
                    ⏭ Step
                  </button>
                </Tooltip>
              </div>
              <div className="ide-ribbon-group__title">Controls</div>
            </div>
            <div className="ide-ribbon-group">
              <div className="ide-ribbon-group__controls">
                <Tooltip content="Clear all breakpoints">
                  <button
                    className="ide-ribbon-btn ide-ribbon-btn--danger"
                    onClick={onClearBreakpoints}
                    disabled={breakpoints.size === 0}
                  >
                    ✕ Clear all
                  </button>
                </Tooltip>
              </div>
              <div className="ide-ribbon-group__title">
                Breakpoints ({breakpoints.size})
              </div>
            </div>
            <div className="ide-ribbon-hint">
              Right-click the timeline ruler to add or remove breakpoints
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
            onClearBreakpoints();
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
            <Tooltip content="Close">
              <button
                className="ide-overlay-close"
                onClick={() => setOverlayTab(null)}
              >
                ×
              </button>
            </Tooltip>
            {overlayTab === "help" ? <HelpPanel /> : <AboutPanel />}
          </div>
        </div>
      )}
    </>
  );
}
