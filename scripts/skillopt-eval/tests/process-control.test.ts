import { describe, expect, test } from "bun:test";
import {
  ProcessControlError,
  parseJsonLines,
  runBoundedProcess,
} from "../runtime/process";

describe("bounded process groups", () => {
  test("terminates a hung child and grandchild with SIGKILL", async () => {
    // Given
    const processPromise = runBoundedProcess({
      argv: [
        "bash",
        "-c",
        "trap '' TERM; (trap '' TERM; sleep 30) & echo $!; wait",
      ],
      cwd: process.cwd(),
      env: process.env,
      timeoutMs: 100,
      killGraceMs: 50,
    });

    // When
    const error = await processPromise.catch((caught: unknown) => caught);

    // Then
    expect(error).toBeInstanceOf(ProcessControlError);
    if (!(error instanceof ProcessControlError)) throw error;
    expect(error.kind).toBe("timeout");
    const grandchildPid = Number.parseInt(error.result.stdout.trim(), 10);
    expect(() => process.kill(grandchildPid, 0)).toThrow();
  });

  test("handles repeated parent interruption once and kills the group", async () => {
    // Given
    const processPromise = runBoundedProcess({
      argv: ["bash", "-c", "trap '' TERM; sleep 30 & wait"],
      cwd: process.cwd(),
      env: process.env,
      timeoutMs: 5_000,
      killGraceMs: 25,
    });

    // When
    setTimeout(() => {
      process.emit("SIGINT", "SIGINT");
      process.emit("SIGINT", "SIGINT");
    }, 50);
    const error = await processPromise.catch((caught: unknown) => caught);

    // Then
    expect(error).toBeInstanceOf(ProcessControlError);
    if (!(error instanceof ProcessControlError)) throw error;
    expect(error.kind).toBe("interrupted");
  });
});

describe("Codex JSONL preservation", () => {
  test("preserves unknown event fields", () => {
    // Given
    const text = '{"type":"future.event","nested":{"new":true}}\n';

    // When
    const lines = parseJsonLines(text);

    // Then
    expect(lines[0]?.event).toEqual({
      type: "future.event",
      nested: { new: true },
    });
    expect(lines[0]?.line).toBe(text.trim());
  });

  test("rejects malformed or truncated JSONL", () => {
    // Given
    const malformed = '{"type":"turn.started"}\n{"type":';

    // When
    const parse = () => parseJsonLines(malformed);

    // Then
    expect(parse).toThrow("malformed_jsonl:2");
  });
});
