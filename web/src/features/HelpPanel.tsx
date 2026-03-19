import { TableOfContents } from "../ui-kit/TableOfContents";

const TOC_SECTIONS = [
  {
    id: "help-language-syntax",
    label: "Language syntax",
    items: [
      { id: "help-bf-basics", label: "Brainfuck basics" },
      { id: "help-encoding", label: "Encoding programs as MIDI" },
      { id: "help-scales", label: "Bebop scales and command mapping" },
      { id: "help-scale-metadata", label: "Scale metadata" },
    ],
  },
  {
    id: "help-ide-controls",
    label: "IDE controls",
    items: [
      { id: "help-piano-roll", label: "Piano roll" },
      { id: "help-automation-lanes", label: "Automation lanes" },
      { id: "help-tracks", label: "Tracks" },
      { id: "help-execution-modes", label: "Execution modes" },
      { id: "help-play-scope", label: "Play scope" },
      { id: "help-shortcuts", label: "Keyboard shortcuts" },
      { id: "help-stdin", label: "Stdin" },
      { id: "help-limitations", label: "Known limitations" },
    ],
  },
  {
    id: "help-debugger",
    label: "Debugger",
    items: [
      { id: "help-breakpoints", label: "Breakpoints" },
      { id: "help-stepping", label: "Stepping" },
      { id: "help-debug-tab", label: "Debug tab" },
    ],
  },
];

export function HelpPanel() {
  return (
    <div className="ide-overlay-content">
      <h1 className="ide-overlay-title">Help</h1>

      <div className="ide-overlay-body">
        <aside className="ide-overlay-toc-sidebar">
          <TableOfContents sections={TOC_SECTIONS} />
        </aside>
        <div className="ide-overlay-main">
          {/* ── Language Syntax ────────────────────────────────────────────────── */}
          <section className="ide-overlay-section" id="help-language-syntax">
            <h2>Language syntax</h2>

            <h3 id="help-bf-basics">Brainfuck basics</h3>
            <p>
              Bebop is Brainfuck (B2) programs are, essentially, Brainfuck
              programs encoded in music intervals. Brainfuck is a minimalist,
              Turing-complete language that operates on a{" "}
              <strong>memory tape</strong> of cells indexed from 0. The language
              specification leaves the tape size unbounded to the right, but
              this implementation (like most) uses a fixed tape of 30,000 cells.
              Each cell contains an 8-bit unsigned integer which is initialised
              to zero. A <strong>data pointer</strong> starts at cell 0 and can
              move left or right. There are exactly eight commands:
            </p>
            <table className="ide-overlay-table">
              <thead>
                <tr>
                  <th>Command</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <code>&gt;</code>
                  </td>
                  <td>Move data pointer one cell to the right</td>
                </tr>
                <tr>
                  <td>
                    <code>&lt;</code>
                  </td>
                  <td>Move data pointer one cell to the left</td>
                </tr>
                <tr>
                  <td>
                    <code>+</code>
                  </td>
                  <td>
                    Increment the byte at the data pointer (wraps 255 → 0)
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>-</code>
                  </td>
                  <td>
                    Decrement the byte at the data pointer (wraps 0 → 255)
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>.</code>
                  </td>
                  <td>
                    Output the byte at the data pointer as an ASCII character
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>,</code>
                  </td>
                  <td>Read one byte of input into the data pointer cell</td>
                </tr>
                <tr>
                  <td>
                    <code>[</code>
                  </td>
                  <td>
                    If the current byte is zero, jump forward to the matching{" "}
                    <code>]</code>
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>]</code>
                  </td>
                  <td>
                    If the current byte is non-zero, jump back to the matching{" "}
                    <code>[</code>
                  </td>
                </tr>
              </tbody>
            </table>
            <p className="ide-overlay-muted">
              Programs are guarded by a 1,000,000 step limit and a 10,000
              character output cap.
            </p>

            <h3 id="help-encoding">Encoding programs as MIDI</h3>
            <p>
              In B2, a program is a <strong>MIDI file</strong>. Notes in the
              file represent Brainfuck commands — the command each note encodes
              depends on its interval above a designated{" "}
              <strong>root note</strong>.
            </p>
            <p>
              The root note is the lowest-pitched note that starts at{" "}
              <strong>beat 0</strong> (the very beginning of the track). It sets
              the key for the entire program. Every subsequent note in the
              program track is interpreted as a semitone interval above (or
              below) the root note, modulo 12 — only the pitch class matters,
              not the octave.
            </p>
            <p className="ide-overlay-muted">
              Consequence: transposing all notes by the same amount produces
              identical Brainfuck output.
            </p>

            <h3 id="help-scales">Bebop scales and command mapping</h3>
            <p>
              B2 uses <strong>Bebop scales</strong> — chromatic elaborations of
              standard jazz modes that each contain exactly eight distinct pitch
              classes, one per Brainfuck command. Three scale variants are
              supported:
            </p>
            <table className="ide-overlay-table">
              <thead>
                <tr>
                  <th>Scale</th>
                  <th>0</th>
                  <th>1</th>
                  <th>2</th>
                  <th>3</th>
                  <th>4</th>
                  <th>5</th>
                  <th>6</th>
                  <th>7</th>
                  <th>8</th>
                  <th>9</th>
                  <th>10</th>
                  <th>11</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Major</td>
                  <td>
                    <code>&gt;</code>
                  </td>
                  <td></td>
                  <td>
                    <code>&lt;</code>
                  </td>
                  <td></td>
                  <td>
                    <code>+</code>
                  </td>
                  <td>
                    <code>-</code>
                  </td>
                  <td></td>
                  <td>
                    <code>.</code>
                  </td>
                  <td>
                    <code>,</code>
                  </td>
                  <td>
                    <code>[</code>
                  </td>
                  <td></td>
                  <td>
                    <code>]</code>
                  </td>
                </tr>
                <tr>
                  <td>Minor</td>
                  <td>
                    <code>&gt;</code>
                  </td>
                  <td></td>
                  <td>
                    <code>&lt;</code>
                  </td>
                  <td>
                    <code>+</code>
                  </td>
                  <td></td>
                  <td>
                    <code>-</code>
                  </td>
                  <td></td>
                  <td>
                    <code>.</code>
                  </td>
                  <td></td>
                  <td>
                    <code>,</code>
                  </td>
                  <td>
                    <code>[</code>
                  </td>
                  <td>
                    <code>]</code>
                  </td>
                </tr>
                <tr>
                  <td>Dominant</td>
                  <td>
                    <code>&gt;</code>
                  </td>
                  <td></td>
                  <td>
                    <code>&lt;</code>
                  </td>
                  <td></td>
                  <td>
                    <code>+</code>
                  </td>
                  <td>
                    <code>-</code>
                  </td>
                  <td></td>
                  <td>
                    <code>.</code>
                  </td>
                  <td></td>
                  <td>
                    <code>,</code>
                  </td>
                  <td>
                    <code>[</code>
                  </td>
                  <td>
                    <code>]</code>
                  </td>
                </tr>
              </tbody>
            </table>

            <h3 id="help-scale-metadata">Scale metadata</h3>
            <p>
              The scale is stored in the MIDI file as a{" "}
              <strong>marker meta event</strong> with one of three text values:{" "}
              <code>bebop:MAJOR</code>, <code>bebop:MINOR</code>, or{" "}
              <code>bebop:DOMINANT</code>. This helps the IDE auto-detect which
              scale to default to when opening the file. Since major and
              dominant scales have identical key signatures, this metadata
              disambiguates them.
            </p>
            <p className="ide-overlay-muted">
              This metadata is added when you create or save a file through the
              IDE. If you open a MIDI file without this marker, the IDE will
              default to major, but you can still choose to compile it with a
              different scale.
            </p>
          </section>

          {/* ── IDE Controls ─────────────────────────────────────────────────── */}
          <section className="ide-overlay-section" id="help-ide-controls">
            <h2>IDE controls</h2>

            <h3 id="help-piano-roll">Piano roll</h3>
            <ul>
              <li>
                Use the right-side floating toolbar to toggle between{" "}
                <strong>add</strong> (place notes) and <strong>delete</strong>{" "}
                (remove notes) modes.
              </li>
              <li>
                <strong>Drag either edge</strong> of a note to resize its
                duration.
              </li>
              <li>
                <strong>Hold Shift and drag</strong> to select multiple notes at
                once.
              </li>
              <li>
                <strong>Beat 0</strong> (the leftmost column) is reserved for
                the root note. Program notes must start at beat 1 or later.
              </li>
              <li>
                Notes are <strong>colour-coded</strong> by the Brainfuck command
                they produce in the active scale. Grey notes are outside the
                scale and will be ignored during transpilation.
              </li>
              <li>
                <strong>Drag the playhead</strong> (the vertical line) to scrub
                through the composition.
              </li>
            </ul>

            <h3 id="help-automation-lanes">Automation lanes</h3>
            <p>
              Click the <strong>Lanes</strong> button in the piano roll toolbar
              to show or hide the automation lanes panel below the note grid.
              Six lanes are available, each controlling a different parameter:
            </p>
            <table className="ide-overlay-table">
              <thead>
                <tr>
                  <th>Lane</th>
                  <th>What it controls</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>Velocity</strong>
                  </td>
                  <td>
                    Per-note volume (0–127). Affects Web Audio playback gain.
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Volume</strong> (CC7)
                  </td>
                  <td>
                    Track-level volume (0–127). Scales the gain of all notes on
                    the track. Affects Web Audio playback and is exported to
                    MIDI.
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Attack</strong> (CC73)
                  </td>
                  <td>
                    Note fade-in time (0–2 s). Affects Web Audio playback and is
                    exported to MIDI.
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Release</strong> (CC72)
                  </td>
                  <td>
                    Note fade-out time (0–4 s). Affects Web Audio playback and
                    is exported to MIDI.
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Modulation</strong> (CC1)
                  </td>
                  <td>
                    Vibrato depth (0–127). Applied as a 5.5 Hz pitch wobble
                    during Web Audio playback and exported to MIDI.
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Pitch Bend</strong>
                  </td>
                  <td>
                    Pitch bend range (−8191–+8191). Bars above the centre line
                    bend up, below bend down (±2 semitones). Affects Web Audio
                    playback and is exported to MIDI.
                  </td>
                </tr>
              </tbody>
            </table>
            <p>Interacting with lanes:</p>
            <ul>
              <li>
                <strong>Velocity</strong> — bars appear automatically at each
                note's beat position. <strong>Drag a bar up or down</strong> to
                change that note's velocity.
              </li>
              <li>
                <strong>Volume / Attack / Release / Modulation / Pitch Bend</strong> —
                events are placed freely in time.{" "}
                <strong>Click empty space</strong> to create a new event and
                drag immediately to set its value.{" "}
                <strong>Drag an existing bar</strong> to adjust its value.{" "}
                <strong>Right-click a bar</strong> to delete it.
              </li>
            </ul>
            <p className="ide-overlay-muted">
              Volume, attack, release, modulation, and pitch bend values apply from the
              last event at or before each note's beat position — later events
              override earlier ones. Changes during a note are smoothly
              interpolated. CC and pitch bend events survive note edits;
              deleting a note does not remove automation at that position.
            </p>

            <h3 id="help-tracks">Tracks</h3>
            <ul>
              <li>
                The <strong>★ starred track</strong> is the program track — it
                is the one transpiled to Brainfuck and executed.
              </li>
              <li>
                Additional tracks are accompaniment only and do not affect
                program output.
              </li>
            </ul>

            <h3 id="help-execution-modes">Execution modes</h3>
            <p>
              Select a mode from the <strong>MODE</strong> dropdown in the
              toolbar:
            </p>
            <ul>
              <li>
                <strong>Notes only</strong> — plays the audio without running
                the interpreter. Useful for composing or listening.
              </li>
              <li>
                <strong>Live</strong> — the interpreter runs step-by-step.
                Output characters are revealed beat-by-beat in sync with the
                audio as each <code>.</code> note is played. Pauses and waits
                for a keypress when a <code>,</code> (input) note is reached.
                When a <code>]</code> note is active, the matching loop range
                is highlighted in the Brainfuck display, loop notes are tinted
                in the note grid, and tape cells modified within that loop
                iteration are highlighted in the memory tape.
              </li>
              <li>
                <strong>Batch</strong> — runs the interpreter fully before
                playback, showing all output immediately, then plays the audio.
              </li>
            </ul>

            <h3 id="help-play-scope">Play scope</h3>
            <p>
              Use the <strong>▾ chevron</strong> next to the Run button to
              choose which tracks are included in playback:
            </p>
            <ul>
              <li>
                <strong>All</strong> — program track plus all other tracks.
              </li>
              <li>
                <strong>Program track</strong> — program track only.
              </li>
              <li>
                <strong>Current track</strong> — whichever track is selected for
                editing.
              </li>
            </ul>

            <h3 id="help-shortcuts">Keyboard shortcuts</h3>
            <table className="ide-overlay-table">
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <kbd>SPACE</kbd>
                  </td>
                  <td>Play / pause</td>
                </tr>
                <tr>
                  <td>
                    <kbd>A</kbd>
                  </td>
                  <td>"Add note" mode</td>
                </tr>
                <tr>
                  <td>
                    <kbd>D</kbd>
                  </td>
                  <td>"Delete note" mode</td>
                </tr>
              </tbody>
            </table>

            <h3 id="help-stdin">Stdin</h3>
            <p>
              The <strong>Stdin</strong> field provides pre-loaded input for{" "}
              <code>,</code> commands in Batch mode. In Live mode, execution
              pauses at each <code>,</code> note and waits for you to type a
              single character directly.
            </p>

            <h3 id="help-limitations">Known limitations</h3>
            <p className="ide-overlay-muted">
              These are limitations of the IDE and transpilation process, not of
              the underlying B2 language itself. They may be lifted in future
              updates.
            </p>
            <ul>
              <li>
                One <strong>instrument</strong> per track.
              </li>
              <li>
                <strong>Zero-velocity notes</strong> (which the MIDI standard
                treats as note-offs) are skipped during transpilation.
              </li>
            </ul>
          </section>

          {/* ── Debugger ─────────────────────────────────────────────────────── */}
          <section className="ide-overlay-section" id="help-debugger">
            <h2>Debugger</h2>

            <h3 id="help-breakpoints">Breakpoints</h3>
            <p>
              <strong>Right-click</strong> on the timeline ruler to toggle a
              breakpoint at that position. Breakpoints appear as red markers on
              the ruler.
            </p>
            <ul>
              <li>
                When running in <strong>Live</strong> mode, playback will
                automatically pause when the playhead reaches a breakpoint.
              </li>
              <li>
                The corresponding Brainfuck command is highlighted in the code
                display, and the tape visualization shows the current state of
                memory.
              </li>
              <li>Right-click an existing breakpoint to remove it.</li>
            </ul>

            <h3 id="help-stepping">Stepping</h3>
            <p>
              When paused at a breakpoint, you can advance execution one program
              note at a time:
            </p>
            <ul>
              <li>
                <kbd>F10</kbd> — <strong>Step</strong> to the next program note.
                The interpreter executes the current command, plays the note,
                and advances the playhead.
              </li>
              <li>
                <kbd>SPACE</kbd> — <strong>Continue</strong> resumes normal
                playback from the current position until the next breakpoint or
                the end of the composition.
              </li>
            </ul>

            <h3 id="help-debug-tab">Debug tab</h3>
            <p>
              The <strong>Debug</strong> tab in the toolbar ribbon provides
              dedicated controls for debugging:
            </p>
            <ul>
              <li>
                <strong>Continue</strong> and <strong>Step</strong> buttons
                (active only when paused at a breakpoint).
              </li>
              <li>
                <strong>Clear all</strong> removes every breakpoint at once. The
                current breakpoint count is shown in the group label.
              </li>
            </ul>
            <p className="ide-overlay-muted">
              The Debug tab opens automatically whenever a breakpoint is hit.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
