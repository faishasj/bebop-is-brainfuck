const TAPE_SIZE = 30000;
const STEP_LIMIT = 1_000_000;
const OUTPUT_LIMIT = 10_000;

export interface RunResult {
  output: string;
  error: string | null;
}

// Execute a Brainfuck program string.
// stdinString: pre-supplied input for ',' commands (EOF returns 0).
export function runBrainfuck(code: string, stdinString = ''): RunResult {
  // Build jump table for matching brackets.
  const jumpTable: Record<number, number> = {};
  const stack: number[] = [];
  for (let i = 0; i < code.length; i++) {
    if (code[i] === '[') {
      stack.push(i);
    } else if (code[i] === ']') {
      if (stack.length === 0) {
        return { output: '', error: `Unmatched ']' at position ${i}.` };
      }
      const open = stack.pop()!;
      jumpTable[open] = i;
      jumpTable[i] = open;
    }
  }
  if (stack.length > 0) {
    return { output: '', error: `Unmatched '[' at position ${stack[stack.length - 1]}.` };
  }

  const tape = new Uint8Array(TAPE_SIZE);
  let dp = 0;       // data pointer
  let ip = 0;       // instruction pointer
  let stdinIdx = 0; // stdin buffer index
  let steps = 0;
  let output = '';

  while (ip < code.length) {
    if (++steps > STEP_LIMIT) {
      return { output, error: `Step limit of ${STEP_LIMIT.toLocaleString()} exceeded — possible infinite loop.` };
    }

    switch (code[ip]) {
      case '>':
        dp = (dp + 1) % TAPE_SIZE;
        break;
      case '<':
        dp = (dp - 1 + TAPE_SIZE) % TAPE_SIZE;
        break;
      case '+':
        tape[dp] = (tape[dp] + 1) & 0xFF;
        break;
      case '-':
        tape[dp] = (tape[dp] - 1 + 256) & 0xFF;
        break;
      case '.':
        if (output.length < OUTPUT_LIMIT) {
          output += String.fromCharCode(tape[dp]);
        }
        break;
      case ',': {
        const ch = stdinIdx < stdinString.length ? stdinString.charCodeAt(stdinIdx++) : 0;
        tape[dp] = ch & 0xFF;
        break;
      }
      case '[':
        if (tape[dp] === 0) ip = jumpTable[ip];
        break;
      case ']':
        if (tape[dp] !== 0) ip = jumpTable[ip];
        break;
    }
    ip++;
  }

  return { output, error: null };
}
