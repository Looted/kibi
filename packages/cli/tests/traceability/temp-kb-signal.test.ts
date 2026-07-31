import { describe, expect, it } from "bun:test";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const READY_PREFIX = "KIBI_TEMP_KB_READY:";
const SIGNAL_TIMEOUT_MS = 5_000;
const TEMP_KB_MODULE_URL = new URL(
  "../../src/traceability/temp-kb.ts",
  import.meta.url,
).href;
const CHILD_RUNNER = [
  "const [baseKbPath, tempKbModuleUrl] = process.argv.slice(2);",
  "if (baseKbPath === undefined || tempKbModuleUrl === undefined) {",
  '  throw new Error("Expected base KB path and temp KB module URL");',
  "}",
  "const { createTempKb } = await import(tempKbModuleUrl);",
  "const context = await createTempKb(baseKbPath);",
  `process.stdout.write(${JSON.stringify(READY_PREFIX)} + context.tempDir + "\\n");`,
].join("\n");

type ChildHarness = Readonly<{
  sandboxPath: string;
  child: ReturnType<typeof Bun.spawn>;
}>;

async function awaitWithin<T>(
  promise: Promise<T>,
  operation: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`${operation} exceeded ${SIGNAL_TIMEOUT_MS}ms`));
        }, SIGNAL_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

async function startChildHarness(): Promise<ChildHarness> {
  const sandboxPath = await mkdtemp(
    path.join(tmpdir(), "kibi-temp-kb-signal-"),
  );
  const baseKbPath = path.join(sandboxPath, "base-kb");
  const runnerPath = path.join(sandboxPath, "temp-kb-signal-child.ts");
  await mkdir(baseKbPath);
  await writeFile(path.join(baseKbPath, "test.facts"), "test_fact(x).\n");
  await writeFile(runnerPath, CHILD_RUNNER);

  return {
    sandboxPath,
    child: Bun.spawn(["bun", runnerPath, baseKbPath, TEMP_KB_MODULE_URL], {
      stdout: "pipe",
      stderr: "pipe",
    }),
  };
}

async function waitForTempKbPath(
  child: ChildHarness["child"],
): Promise<string> {
  if (!(child.stdout instanceof ReadableStream)) {
    throw new Error("Expected child stdout to be piped");
  }

  const reader = child.stdout.getReader();
  const decoder = new TextDecoder();
  let remainder = "";
  try {
    for (;;) {
      const result = await reader.read();
      if (result.done) {
        throw new Error("Child exited before publishing its temporary KB path");
      }

      remainder += decoder.decode(result.value, { stream: true });
      const lines = remainder.split("\n");
      remainder = lines.pop() ?? "";
      for (const line of lines) {
        if (line.startsWith(READY_PREFIX)) {
          return line.slice(READY_PREFIX.length);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

async function stopChild(child: ChildHarness["child"]): Promise<void> {
  if (child.exitCode !== null) return;
  child.kill("SIGKILL");
  await awaitWithin(child.exited, "forced child exit");
}

async function assertSignalCleanup(signal: NodeJS.Signals): Promise<void> {
  const harness = await startChildHarness();
  let tempKbPath: string | undefined;
  try {
    tempKbPath = await awaitWithin(
      waitForTempKbPath(harness.child),
      "temporary KB readiness",
    );
    expect(existsSync(tempKbPath)).toBe(true);

    harness.child.kill(signal);
    await awaitWithin(harness.child.exited, "child exit after signal");

    expect(existsSync(tempKbPath)).toBe(false);
  } finally {
    await stopChild(harness.child);
    if (tempKbPath !== undefined) {
      await rm(tempKbPath, { recursive: true, force: true });
    }
    await rm(harness.sandboxPath, { recursive: true, force: true });
  }
}

describe("temporary KB signal cleanup", () => {
  it("removes a real temporary KB before exiting on SIGINT", async () => {
    // Given
    const signal: NodeJS.Signals = "SIGINT";

    // When
    const cleanup = assertSignalCleanup(signal);

    // Then
    await cleanup;
  });

  it("removes a real temporary KB before exiting on SIGTERM", async () => {
    // Given
    const signal: NodeJS.Signals = "SIGTERM";

    // When
    const cleanup = assertSignalCleanup(signal);

    // Then
    await cleanup;
  });
});
