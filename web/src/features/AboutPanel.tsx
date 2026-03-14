import { TableOfContents } from "../ui-kit/TableOfContents";

const TOC_SECTIONS = [
  {
    id: "about-the-language",
    label: "The language",
    items: [
      { id: "about-why-bebop", label: "Why Bebop?" },
      { id: "about-scale-variants", label: "The three scale variants" },
      { id: "about-pitch-class", label: "Pitch-class relative encoding" },
      { id: "about-brainfuck", label: "Brainfuck" },
    ],
  },
  {
    id: "about-how-ide-works",
    label: "How the IDE works",
    items: [
      { id: "about-midi-files", label: "MIDI files" },
      { id: "about-parsing", label: "Parsing" },
      { id: "about-transpilation", label: "Transpilation" },
      { id: "about-interpretation", label: "Interpretation" },
      { id: "about-live-mode", label: "Live mode" },
      { id: "about-audio-playback", label: "Audio playback" },
      { id: "about-midi-export", label: "MIDI export" },
    ],
  },
];

export function AboutPanel() {
  return (
    <div className="ide-overlay-content">
      <h1 className="ide-overlay-title">About</h1>

      <div className="ide-overlay-body">
        <aside className="ide-overlay-toc-sidebar">
          <TableOfContents sections={TOC_SECTIONS} />
        </aside>
        <div className="ide-overlay-main">
          {/* ── The Language ─────────────────────────────────────────────────── */}
          <section className="ide-overlay-section" id="about-the-language">
            <h2>The language</h2>

            <h3 id="about-why-bebop">Why Bebop?</h3>
            <p>
              Brainfuck has exactly <strong>eight commands</strong>. Bebop
              scales are a family of jazz scales with exactly{" "}
              <strong>eight distinct pitch classes</strong>. This numerical
              coincidence is the entire premise of the language.
            </p>
            <p>
              Standard diatonic modes (Major, Dorian, etc.) have seven notes per
              octave. Bebop scales are constructed by adding one chromatic{" "}
              <em>passing tone</em> to a standard mode, bringing the total to
              eight. Each of the eight pitch classes maps one-to-one onto one of
              Brainfuck's eight commands.
            </p>

            <h3 id="about-scale-variants">The three scale variants</h3>
            <p>
              B2 supports three Bebop scale types, each derived from a different
              underlying mode:
            </p>
            <ul>
              <li>
                <strong>Bebop Major</strong> — built on the Ionian (major) mode,
                with a chromatic passing tone between the 5th and 6th scale
                degrees. Also known as the major sixth diminished scale.
              </li>
              <li>
                <strong>Bebop Minor</strong> — built on the Dorian mode, with
                the major 7th added as a passing tone.
              </li>
              <li>
                <strong>Bebop Dominant</strong> — built on the Mixolydian mode
                (a major scale with a ♭7), with the natural 7th added as a
                passing tone.
              </li>
            </ul>
            <p>
              The scale choice determines which interval maps to which command
              (see the Help tab for the full mapping table). The three scales
              differ only in where the passing tone falls — so <code>+</code>{" "}
              and <code>,</code> land on different semitones depending on which
              scale is active.
            </p>

            <h3 id="about-pitch-class">Pitch-class relative encoding</h3>
            <p>
              The root note establishes the key, but its absolute pitch is
              irrelevant. What matters is the <strong>interval</strong> between
              each program note and the root, computed modulo 12 (i.e., only the
              pitch class, not the octave). This means:
            </p>
            <ul>
              <li>
                Transposing the entire composition up or down by any number of
                semitones produces <strong>identical Brainfuck output</strong>.
              </li>
              <li>
                A note played two octaves above the root encodes the same
                command as the same note played one octave above it.
              </li>
              <li>
                Notes that are an exact multiple of 12 semitones below the root
                (i.e., in a lower octave but the same pitch class as the root)
                are treated as the root interval (0) and map to{" "}
                <code>&gt;</code>.
              </li>
            </ul>

            <h3 id="about-brainfuck">Brainfuck</h3>
            <p>
              Brainfuck was created by Urban Müller in 1993, inspired by the
              False programming language. Its goal was to create the smallest
              possible Turing-complete compiler. The language has no practical
              use as it provides little abstraction. Writing even
              straightforward programs (like "Hello, World!") can be a bit of a
              mindfuck, which makes composing in B2 both challenging and
              amusing.
            </p>
          </section>

          {/* ── How the IDE Works ────────────────────────────────────────────── */}
          <section className="ide-overlay-section" id="about-how-ide-works">
            <h2>How the IDE works</h2>

            <h3 id="about-midi-files">MIDI files</h3>
            <p>
              MIDI (Musical Instrument Digital Interface) is not audio — it is a
              sequence of discrete <strong>events</strong> that describe musical
              actions: note on, note off, tempo change, time signature, and so
              on. Each event has a <em>delta time</em> expressed in{" "}
              <strong>ticks</strong> relative to the previous event.
            </p>
            <p>
              A MIDI file's header specifies the <strong>ticks per beat</strong>{" "}
              (also called PPQ — pulses per quarter note). Combined with the
              tempo (microseconds per beat from a <code>setTempo</code> event),
              this lets the player calculate the real-time position of every
              note. B2 uses MIDI Format 1, which stores a tempo/meta track in
              track 0 and all note data in subsequent tracks.
            </p>

            <h3 id="about-parsing">Parsing</h3>
            <p>
              When a <code>.mid</code> file is loaded, the browser reads it as a{" "}
              <code>Uint8Array</code> and passes it to the{" "}
              <code>midi-file</code> library, which deserialises the binary
              structure into a JavaScript object tree: an array of tracks, each
              containing an array of typed event objects (<code>noteOn</code>,{" "}
              <code>noteOff</code>, <code>setTempo</code>, etc.). This parsed
              representation is what the IDE stores and manipulates.
            </p>
            <p>
              Note: the MIDI standard allows a <code>noteOn</code> event with{" "}
              <strong>velocity 0</strong> to function as a note-off. The{" "}
              <code>midi-file</code> library does not normalise these
              automatically, so the transpiler explicitly skips zero-velocity
              noteOn events.
            </p>

            <h3 id="about-transpilation">Transpilation</h3>
            <p>
              Transpilation converts the MIDI note data into a Brainfuck string.
              The process has three steps:
            </p>
            <ol>
              <li>
                <strong>Root note detection</strong> — Scan the program track
                for all <code>noteOn</code> events at tick 0 (delta time 0 from
                the start). The lowest-pitched note among them becomes the root
                note. If no such note is found, transpilation fails with an
                error.
              </li>
              <li>
                <strong>Interval computation</strong> — For each subsequent{" "}
                <code>noteOn</code> event (velocity &gt; 0), compute the
                semitone interval: <code>(noteNumber − rootNote) mod 12</code>.
                This produces a value between 0 and 11.
              </li>
              <li>
                <strong>Command lookup</strong> — Look up the interval in the
                selected scale's mapping table. If the interval corresponds to a
                command, append it to the Brainfuck string. If the interval has
                no mapping in that scale, the note is silently ignored.
              </li>
            </ol>
            <p>
              The transpiler also produces a <code>NoteCommand[]</code> array
              that records the beat position of each Brainfuck character in the
              output string. This is used by Live mode to synchronise output
              reveal with audio playback.
            </p>

            <h3 id="about-interpretation">Interpretation</h3>
            <p>
              The Brainfuck interpreter operates on a 30,000-cell byte tape,
              initialised to all zeros. It pre-computes a{" "}
              <strong>jump table</strong> that matches every <code>[</code> to
              its corresponding <code>]</code> (and vice versa) before execution
              begins. Unmatched brackets are reported as errors immediately.
            </p>
            <p>
              Both the data pointer and cell byte values wrap; moving past the
              end of the tape wraps to the beginning (and vice versa), and
              incrementing past 255 wraps to 0. Execution is guarded by a
              1,000,000 step limit to catch infinite loops, and output is capped
              at 10,000 characters.
            </p>

            <h3 id="about-live-mode">Live mode</h3>
            <p>
              In Live mode, a <strong>step-by-step interpreter</strong> runs
              alongside audio playback. Rather than executing the entire program
              at once, it advances one instruction at a time and yields back to
              the caller on every <code>.</code> (output) or <code>,</code>{" "}
              (input) command.
            </p>
            <p>
              A <code>requestAnimationFrame</code> loop checks the current
              playback beat on every frame. When the playhead passes the beat
              position of a <code>.</code> command, the corresponding character
              is revealed in the output. When a <code>,</code> command's beat is
              reached, audio is paused and the user is prompted to type a
              character, after which playback resumes from the paused position.
            </p>

            <h3 id="about-audio-playback">Audio playback</h3>
            <p>
              Audio is handled by <code>soundfont-player</code>, which loads
              instrument samples and schedules them via the Web Audio API's{" "}
              <code>AudioContext</code>. Notes are scheduled ahead of time using
              the Web Audio clock (which runs independently of the JavaScript
              event loop) for accurate timing. A single shared{" "}
              <code>AudioContext</code> is reused across all playback sessions
              to avoid hitting browser limits on the number of simultaneous
              contexts.
            </p>

            <h3 id="about-midi-export">MIDI export</h3>
            <p>
              When exporting, the IDE converts its internal{" "}
              <code>BeatNote[]</code> representation back into a{" "}
              <code>midi-file</code>-compatible event list, then serialises it
              with <code>writeMidi()</code>. The resulting byte array is wrapped
              in a <code>Blob</code> and offered to the browser as a{" "}
              <code>.mid</code> download. A synthetic root-note event is
              prepended at tick 0 of the program track so the exported file
              remains self-contained and can be correctly re-transpiled when
              loaded back in.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
