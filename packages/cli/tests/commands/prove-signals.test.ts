import { afterEach, describe, expect, test } from "bun:test";
import { spawn } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function waitFor(check: () => boolean, ms = 10_000): Promise<void> {
  const deadline = Date.now() + ms;
  while (!check()) {
    if (Date.now() > deadline) throw new Error("timed out");
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

describe.skipIf(process.platform === "win32")(
  "kibi prove producer signals",
  () => {
    test("stopping kibi prove stops the producer's whole process group", async () => {
      const root = mkdtempSync(path.join(tmpdir(), "kibi-prove-signals-"));
      roots.push(root);
      // The producer starts a worker (as a test runner would) and waits.
      writeFileSync(
        path.join(root, "producer.mjs"),
        [
          'import { spawn } from "node:child_process";',
          'import { writeFileSync } from "node:fs";',
          'const worker = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { stdio: "ignore" });',
          'writeFileSync("worker.pid", String(worker.pid));',
          "setInterval(() => {}, 1000);",
        ].join("\n"),
      );
      const prove = path.resolve(
        import.meta.dir,
        "../../src/commands/prove.ts",
      );
      writeFileSync(
        path.join(root, "run.ts"),
        `import { runChild } from ${JSON.stringify(prove)};\nawait runChild([process.execPath, "producer.mjs"], ${JSON.stringify(root)}, process.env);\n`,
      );
      const runner = spawn("bun", ["run.ts"], { cwd: root, stdio: "ignore" });
      const pidFile = path.join(root, "worker.pid");
      await waitFor(
        () => existsSync(pidFile) && readFileSync(pidFile, "utf8") !== "",
      );
      const worker = Number(readFileSync(pidFile, "utf8"));
      expect(alive(worker)).toBe(true);
      runner.kill("SIGTERM");
      await waitFor(() => !alive(worker));
      expect(alive(worker)).toBe(false);
    }, 30_000);
  },
);
