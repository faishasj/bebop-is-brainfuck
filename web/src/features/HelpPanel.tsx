import { TableOfContents } from "../ui-kit/TableOfContents";

const TOC_SECTIONS = [
  {
    id: "help-language-syntax",
    label: "Language syntax",
    items: [
      { id: "help-bf-basics", label: "Brainfuck basics" },
      { id: "help-encoding", label: "Encoding programs as MIDI" },
      { id: "help-scales", label: "Bebop scales and command mapping" },
    ],
  },
  {
    id: "help-ide-controls",
    label: "IDE controls",
    items: [
      { id: "help-piano-roll", label: "Piano roll" },
      { id: "help-tracks", label: "Tracks" },
      { id: "help-execution-modes", label: "Execution modes" },
      { id: "help-play-scope", label: "Play scope" },
      { id: "help-shortcuts", label: "Keyboard shortcuts" },
      { id: "help-stdin", label: "Stdin" },
      { id: "help-limitations", label: "Known limitations" },
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
              <strong>memory tape</strong> with cells being indexed from 0 to
              unbounded on the right. Each cell contains an 8-bit unsigned
              integer which is initialised to zero. A{" "}
              <strong>data pointer</strong> starts at cell 0 and can move left
              or right. There are exactly eight commands:
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
          </section>

          {/* ── IDE Controls ─────────────────────────────────────────────────── */}
          <section className="ide-overlay-section" id="help-ide-controls">
            <h2>IDE controls</h2>

            <h3 id="help-piano-roll">Piano roll</h3>
            <ul>
              <li>
                <strong>Click</strong> an empty cell to place a note; click an
                existing note to remove it.
              </li>
              <li>
                <strong>Drag the right edge</strong> of a note to resize its
                duration.
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
            <ul>
              <li>
                <strong>Note velocity</strong> (attack/volume) is fixed and
                cannot be edited per-note in the piano roll.
              </li>
              <li>
                <strong>Time signature</strong> affects only the visual bar grid
                in the piano roll. It does not influence transpilation or
                Brainfuck output.
              </li>
              <li>
                Only <strong>one program track</strong> can be designated at a
                time. The ★ icon marks which track that is; changing it reloads
                that track into the editor.
              </li>
              <li>
                <strong>Scrubbing</strong> is disabled in Live mode once the
                interpreter is running, as execution state cannot be rewound.
              </li>
              <li>
                Exported MIDI files include a{" "}
                <strong>synthetic root-note beat</strong> at tick 0 so the file
                can be loaded back in and re-transpiled correctly.
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
