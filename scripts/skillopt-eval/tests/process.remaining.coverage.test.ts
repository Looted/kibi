import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ProcessControlError, runBoundedProcess } from "../runtime/process";

afterEach(() => {
  if (process.exitCode === 1) process.exitCode = 0;
});

async function waitForReady(path: string): Promise<void> {
  const deadline = performance.now() + 2_000;
  while (performance.now() < deadline) {
    try {
      if ((await readFile(path, "utf8")) === "ready") return;
    } catch {
      // The child has not completed its setup handshake yet.
    }
    await Bun.sleep(25);
  }
  throw new Error(`child did not become ready: ${path}`);
}

describe("bounded process remaining inherited termination", () => {
  test("kills an inherited-group child on timeout", async () => {
    const error = await runBoundedProcess({
      argv: ["bash", "-c", "trap '' TERM; sleep 30"],
      cwd: process.cwd(),
      env: process.env,
      timeoutMs: 200,
      killGraceMs: 50,
      groupMode: "inherited",
    }).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ProcessControlError);
    if (!(error instanceof ProcessControlError)) throw error;
    expect(error.kind).toBe("timeout");
  });

  test("escalates retained descendants after an inherited leader exits", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-process-"));
    const readyPath = join(root, "ready");
    const processPromise = runBoundedProcess({
      argv: [
        "bash",
        "-c",
        [
          '(trap "" TERM; sleep 30) & grandchild=$!',
          'trap "exit 0" TERM',
          'printf ready > "$1"',
          'wait "$grandchild"',
        ].join("; "),
        "skillopt-ready",
        readyPath,
      ],
      cwd: process.cwd(),
      env: process.env,
      timeoutMs: 500,
      killGraceMs: 50,
      groupMode: "inherited",
    });

    try {
      await waitForReady(readyPath);
      const error = await processPromise.catch((caught: unknown) => caught);
      expect(error).toBeInstanceOf(ProcessControlError);
      if (!(error instanceof ProcessControlError)) throw error;
      expect(error.kind).toBe("timeout");
      expect(error.result.exitCode).toBe(0);
      expect(error.result.signal).toBeNull();
    } finally {
      await processPromise.catch(() => undefined);
      await rm(root, { recursive: true, force: true });
    }
  });
});
