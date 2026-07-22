import { describe, expect, test } from "bun:test";
import {
  ProcessControlError,
  parseJsonLines,
  runBoundedProcess,
} from "../runtime/process";

function processGroupExists(groupId: number): boolean {
  try {
    process.kill(-groupId, 0);
    return true;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ESRCH") {
      return false;
    }
    throw error;
  }
}

async function waitForProcessGroupReaping(groupId: number): Promise<number> {
  const deadline = performance.now() + 2_000;
  while (processGroupExists(groupId)) {
    if (performance.now() >= deadline) {
      throw new Error(`process group ${groupId} was not reaped within 2000ms`);
    }
    await Bun.sleep(10);
  }
  return groupId;
}

describe("bounded process groups", () => {
  test.each([1, 2, 3])(
    "terminates and reaps a hung process group on repeated run %d",
    async () => {
      // Given
      const processPromise = runBoundedProcess({
        argv: [
          "bash",
          "-c",
          "trap '' TERM; (trap '' TERM; sleep 30) & grandchild=$!; echo $$ $grandchild; wait",
        ],
        cwd: process.cwd(),
        env: process.env,
        timeoutMs: 250,
        killGraceMs: 50,
      });

      // When
      const error = await processPromise.catch((caught: unknown) => caught);

      // Then
      expect(error).toBeInstanceOf(ProcessControlError);
      if (!(error instanceof ProcessControlError)) throw error;
      expect(error.kind).toBe("timeout");
      const [groupText, grandchildText] = error.result.stdout.trim().split(" ");
      const groupId = Number.parseInt(groupText ?? "", 10);
      const grandchildId = Number.parseInt(grandchildText ?? "", 10);
      expect(Number.isSafeInteger(groupId)).toBe(true);
      expect(Number.isSafeInteger(grandchildId)).toBe(true);
      expect(grandchildId).not.toBe(groupId);

      // When
      const reapedGroup = await waitForProcessGroupReaping(groupId);

      // Then
      expect(reapedGroup).toBe(groupId);
    },
  );

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
    queueMicrotask(() => {
      process.emit("SIGINT", "SIGINT");
      process.emit("SIGINT", "SIGINT");
    });
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
