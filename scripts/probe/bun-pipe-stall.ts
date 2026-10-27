// Probe: does Bun stop reading a child's stdout? Modes: node (node:child_process), bun (Bun.spawn).
import { spawn } from "node:child_process";
const mode = process.argv[2] ?? "node";
const iterations = Number(process.argv[3] ?? 3000);
const MARK = "__KIBI_QUERY_FRAME_END__";
let buffer = "";
let bytes = 0;
let write: (s: string) => void;
let pid = 0;
if (mode === "node") {
  const child = spawn("swipl", ["-g", "set_prolog_flag(answer_write_options, [max_depth(0), quoted(true)])", "--quiet"], {
    detached: true,
    stdio: ["pipe", "pipe", "pipe"],
  });
  pid = child.pid ?? 0;
  child.stdout.on("data", (c: Buffer) => { bytes += c.length; buffer += c.toString(); });
  child.stderr.on("data", () => undefined);
  write = (s) => void child.stdin.write(s);
} else {
  const child = Bun.spawn(["swipl", "-g", "set_prolog_flag(answer_write_options, [max_depth(0), quoted(true)])", "--quiet"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  pid = child.pid;
  (async () => {
    const reader = child.stdout.getReader();
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.length;
      buffer += new TextDecoder().decode(value);
    }
  })();
  write = (s) => { child.stdin.write(s); child.stdin.flush(); };
}
const wait = async (ms: number) => new Promise((r) => setTimeout(r, ms));
let stalls = 0;
let slow = 0;
const started = Date.now();
for (let i = 0; i < iterations; i++) {
  buffer = "";
  const t0 = Date.now();
  write(`X = ${i}.\nwriteln('${MARK}').\n`);
  while (!buffer.includes(MARK) && Date.now() - t0 < 2000) {
    await new Promise((r) => setImmediate(r));
    if (Date.now() - t0 > 5) await wait(1);
  }
  const dt = Date.now() - t0;
  if (!buffer.includes(MARK)) {
    stalls++;
    console.log(`STALL mode=${mode} i=${i} bytes=${bytes} pid=${pid}`);
    break;
  }
  if (dt > 100) slow++;
}
console.log(`RESULT mode=${mode} iterations=${iterations} stalls=${stalls} slow>100ms=${slow} ms=${Date.now() - started}`);
process.exit(0);
