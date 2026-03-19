const TAPE_SIZE = 30000;
const STEP_LIMIT = 1_000_000;

export type StepResult =
  | { type: "output"; char: string }
  | { type: "input" }
  | { type: "done"; error: string | null };

export class StepInterpreter {
  private tape = new Uint8Array(TAPE_SIZE);
  private dp = 0;
  private ip = 0;
  private steps = 0;
  private pendingInput: number | null = null;
  private jumpTable: Record<number, number> = {};
  readonly initError: string | null;

  constructor(private code: string) {
    const stack: number[] = [];
    this.initError = null;
    for (let i = 0; i < code.length; i++) {
      if (code[i] === "[") {
        stack.push(i);
      } else if (code[i] === "]") {
        if (stack.length === 0) {
          this.initError = `Unmatched ']' at position ${i}.`;
          return;
        }
        const open = stack.pop()!;
        this.jumpTable[open] = i;
        this.jumpTable[i] = open;
      }
    }
    if (stack.length > 0) {
      this.initError = `Unmatched '[' at position ${stack[stack.length - 1]}.`;
    }
  }

  provideInput(charCode: number) {
    this.pendingInput = charCode;
  }

  getTape(): Uint8Array {
    return this.tape;
  }

  getDP(): number {
    return this.dp;
  }

  getIP(): number {
    return this.ip;
  }

  /** Execute exactly one BF instruction. Returns null for non-IO commands. */
  stepSingle(): StepResult | null {
    if (this.ip >= this.code.length) return { type: "done", error: null };
    if (++this.steps > STEP_LIMIT) {
      return {
        type: "done",
        error: `Step limit of ${STEP_LIMIT.toLocaleString()} exceeded — possible infinite loop.`,
      };
    }
    const cmd = this.code[this.ip];
    switch (cmd) {
      case ">":
        this.dp = (this.dp + 1) % TAPE_SIZE;
        this.ip++;
        return null;
      case "<":
        this.dp = (this.dp - 1 + TAPE_SIZE) % TAPE_SIZE;
        this.ip++;
        return null;
      case "+":
        this.tape[this.dp] = (this.tape[this.dp] + 1) & 0xff;
        this.ip++;
        return null;
      case "-":
        this.tape[this.dp] = (this.tape[this.dp] - 1 + 256) & 0xff;
        this.ip++;
        return null;
      case ".": {
        const char = String.fromCharCode(this.tape[this.dp]);
        this.ip++;
        return { type: "output", char };
      }
      case ",":
        if (this.pendingInput === null) return { type: "input" };
        this.tape[this.dp] = this.pendingInput & 0xff;
        this.pendingInput = null;
        this.ip++;
        return null;
      case "[":
        if (this.tape[this.dp] === 0) this.ip = this.jumpTable[this.ip];
        this.ip++;
        return null;
      case "]":
        if (this.tape[this.dp] !== 0) this.ip = this.jumpTable[this.ip];
        this.ip++;
        return null;
      default:
        this.ip++;
        return null;
    }
  }

  next(): StepResult {
    while (this.ip < this.code.length) {
      if (++this.steps > STEP_LIMIT) {
        return {
          type: "done",
          error: `Step limit of ${STEP_LIMIT.toLocaleString()} exceeded — possible infinite loop.`,
        };
      }
      const cmd = this.code[this.ip];
      if (cmd === ".") {
        const char = String.fromCharCode(this.tape[this.dp]);
        this.ip++;
        return { type: "output", char };
      }
      if (cmd === ",") {
        // ip is NOT advanced — on retry (after provideInput) will fall through to consume
        if (this.pendingInput === null) return { type: "input" };
        this.tape[this.dp] = this.pendingInput & 0xff;
        this.pendingInput = null;
        this.ip++;
        continue;
      }
      switch (cmd) {
        case ">":
          this.dp = (this.dp + 1) % TAPE_SIZE;
          break;
        case "<":
          this.dp = (this.dp - 1 + TAPE_SIZE) % TAPE_SIZE;
          break;
        case "+":
          this.tape[this.dp] = (this.tape[this.dp] + 1) & 0xff;
          break;
        case "-":
          this.tape[this.dp] = (this.tape[this.dp] - 1 + 256) & 0xff;
          break;
        case "[":
          if (this.tape[this.dp] === 0) this.ip = this.jumpTable[this.ip];
          break;
        case "]":
          if (this.tape[this.dp] !== 0) this.ip = this.jumpTable[this.ip];
          break;
      }
      this.ip++;
    }
    return { type: "done", error: null };
  }
}
