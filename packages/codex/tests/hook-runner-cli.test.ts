import { afterEach, describe, expect, test } from "bun:test";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";

const hookRunnerPath = fileURLToPath(
  new URL("../src/hook-runner.ts", import.meta.url),
);
const originalArgvOne = process.argv[1];
const originalStdin = process.stdin;
const originalStdoutWrite = process.stdout.write;

function installCliIo(stdinChunks: readonly string[]): {
  readonly output: () => string;
} {
  let stdout = "";
  Object.defineProperty(process, "stdin", {
    value: Readable.from(stdinChunks),
    configurable: true,
  });
  process.stdout.write = (chunk: string | Uint8Array): boolean => {
    stdout += chunk.toString();
    return true;
  };
  process.argv[1] = hookRunnerPath;

  return { output: () => stdout };
}

afterEach(() => {
  process.argv[1] = originalArgvOne ?? "";
  Object.defineProperty(process, "stdin", {
    value: originalStdin,
    configurable: true,
  });
  process.stdout.write = originalStdoutWrite;
});

describe("Codex hook runner CLI", () => {
  test("Given invalid JSON on stdin When invoked as script Then hook errors are reported", async () => {
    const io = installCliIo(["not json"]);

    await import("../src/hook-runner");
    await Bun.sleep(10);

    expect(io.output()).toContain("Kibi hook runner error");
  });
});
