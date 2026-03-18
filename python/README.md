# Bebop is Brainfuck — Python Interpreter

The canonical interpreter for [Bebop is Brainfuck](https://github.com/faishasj/bebop-is-brainfuck). This is the ground truth for language semantics.

## Requirements

- Python 3.7 or later
- [`mido`](https://mido.readthedocs.io/) — MIDI file parsing

## Setup

Install the dependency with pip:

```bash
pip install mido
```

Or inside a virtual environment:

```bash
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install mido
```

## Usage

```bash
python interpreter.py <midi_file> [--track N] [--scale MAJOR|MINOR|DOMINANT]
```

### Arguments

| Argument            | Description                                                              | Default                                        |
|---------------------|--------------------------------------------------------------------------|------------------------------------------------|
| `midi_file`         | Path to the `.mid` file to run                                           | required                                       |
| `--track N` / `-T N` | Track index containing the program notes                                | `1`                                            |
| `--scale` / `-S`    | Bebop scale to use: `MAJOR`, `MINOR`, or `DOMINANT`                     | Auto-detected from MIDI metadata, else `MAJOR` |

### Examples

```bash
# Run with defaults (track 1, auto-detected scale)
python interpreter.py ../examples/hello_world.mid

# Specify track and scale explicitly
python interpreter.py program.mid --track 1 --scale MINOR

# Pipe input for programs that use the , command
echo "A" | python interpreter.py input_program.mid
```

The interpreter reads from stdin for `,` (input) commands.
