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

function descendantAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
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
  test("keeps Codex descendants in the bridge-owned parent group", async () => {
    // Given
    const processPromise = runBoundedProcess({
      argv: [
        "bash",
        "-c",
        'printf \'%s %s\\n\' "$(ps -o pgid= -p $PPID)" "$(ps -o pgid= -p $$)"',
      ],
      cwd: process.cwd(),
      env: process.env,
      timeoutMs: 1_000,
      groupMode: "inherited",
    });

    // When
    const result = await processPromise;

    // Then
    const [parentGroup, childGroup] = result.stdout.trim().split(/\s+/);
    expect(childGroup).toBe(parentGroup);
  });

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
    const runtimeUrl = new URL("../runtime/process.ts", import.meta.url).href;
    const harness = `
      import { runBoundedProcess, ProcessControlError } from ${JSON.stringify(runtimeUrl)};
      const running = runBoundedProcess({
        argv: ["bash", "-c", "trap '' TERM; sleep 30 & wait"],
        cwd: process.cwd(),
        env: process.env,
        timeoutMs: 5000,
        killGraceMs: 25,
      });
      queueMicrotask(() => {
        process.emit("SIGINT", "SIGINT");
        process.emit("SIGINT", "SIGINT");
      });
      const error = await running.catch((caught) => caught);
      if (!(error instanceof ProcessControlError) || error.kind !== "interrupted") {
        process.exitCode = 3;
      }
    `;

    // When
    const child = Bun.spawn([process.execPath, "-e", harness], {
      cwd: process.cwd(),
      stdout: "pipe",
      stderr: "pipe",
    });
    const exitCode = await child.exited;

    // Then
    expect(exitCode).toBe(0);
  });

  test("reaps descendants after a real OS interrupt lets the leader exit", async () => {
    // Given
    const processPromise = runBoundedProcess({
      argv: [
        "bash",
        "-c",
        "(trap '' TERM; sleep 30) & grandchild=$!; echo $$ $grandchild; wait",
      ],
      cwd: process.cwd(),
      env: process.env,
      timeoutMs: 5_000,
      killGraceMs: 25,
    });

    // When
    setTimeout(() => process.kill(process.pid, "SIGINT"), 50);
    const error = await processPromise.catch((caught: unknown) => caught);

    // Then
    expect(error).toBeInstanceOf(ProcessControlError);
    if (!(error instanceof ProcessControlError)) throw error;
    expect(error.kind).toBe("interrupted");
    const [groupText] = error.result.stdout.trim().split(" ");
    const groupId = Number.parseInt(groupText ?? "", 10);
    let reaped = false;
    try {
      await waitForProcessGroupReaping(groupId);
      reaped = true;
    } finally {
      if (processGroupExists(groupId)) process.kill(-groupId, "SIGKILL");
    }
    expect(reaped).toBe(true);
  });

  test("keeps the real OS signal handler installed during cleanup", async () => {
    // Given
    const runtimeUrl = new URL("../runtime/process.ts", import.meta.url).href;
    const harness = `
      import { runBoundedProcess, ProcessControlError } from ${JSON.stringify(runtimeUrl)};
      const running = runBoundedProcess({
        argv: ["bash", "-c", "trap '' TERM; sleep 30"],
        cwd: process.cwd(),
        env: process.env,
        timeoutMs: 5000,
        killGraceMs: 25,
      });
      setTimeout(() => {
        process.kill(process.pid, "SIGINT");
        setTimeout(() => process.kill(process.pid, "SIGINT"), 5);
      }, 50);
      const error = await running.catch((caught) => caught);
      if (!(error instanceof ProcessControlError) || error.kind !== "interrupted") {
        process.exitCode = 3;
      }
    `;

    // When
    const child = Bun.spawn([process.execPath, "-e", harness], {
      cwd: process.cwd(),
      stdout: "pipe",
      stderr: "pipe",
    });
    const exitCode = await child.exited;

    // Then
    expect(exitCode).toBe(0);
  });

  test.skipIf(process.platform !== "linux")(
    "kills a descendant that ignores SIGTERM after its inherited leader exits",
    async () => {
      // Given
      const processPromise = runBoundedProcess({
        argv: [
          "bash",
          "-c",
          [
            'trap "exit 0" TERM',
            '(trap "" TERM; sleep 5) >/dev/null 2>&1 & grandchild=$!',
            "printf '%s\\n' \"$grandchild\"",
            "wait",
          ].join("; "),
        ],
        cwd: process.cwd(),
        env: process.env,
        timeoutMs: 500,
        killGraceMs: 100,
        groupMode: "inherited",
      });

      // When
      const error = await processPromise.catch((caught: unknown) => caught);

      // Then
      expect(error).toBeInstanceOf(ProcessControlError);
      if (!(error instanceof ProcessControlError)) throw error;
      expect(error.kind).toBe("timeout");
      const descendantId = Number.parseInt(error.result.stdout.trim(), 10);
      expect(Number.isSafeInteger(descendantId)).toBe(true);
      expect(descendantAlive(descendantId)).toBe(false);
    },
  );

  test.skipIf(process.platform !== "linux")(
    "kills an owned descendant forked while the original child handles SIGTERM",
    async () => {
      // Given
      const processPromise = runBoundedProcess({
        argv: [
          "bash",
          "-c",
          [
            'trap "exit 0" TERM',
            '(trap \'env -i PATH="$PATH" bash -c "trap \\"\\" TERM; sleep 5" >/dev/null 2>&1 & echo forked:$!; exit 0\' TERM; while true; do sleep 1; done) &',
            "wait",
          ].join("\n"),
        ],
        cwd: process.cwd(),
        env: process.env,
        timeoutMs: 500,
        killGraceMs: 100,
      });

      // When
      const error = await processPromise.catch((caught: unknown) => caught);

      // Then
      expect(error).toBeInstanceOf(ProcessControlError);
      if (!(error instanceof ProcessControlError)) throw error;
      expect(error.kind).toBe("timeout");
      const match = /forked:(\d+)/.exec(error.result.stdout);
      expect(match).not.toBeNull();
      const descendantId = Number.parseInt(match?.[1] ?? "", 10);
      expect(Number.isSafeInteger(descendantId)).toBe(true);
      expect(descendantAlive(descendantId)).toBe(false);
    },
  );

  test.skipIf(process.platform !== "linux")(
    "kills an environment-scrubbed fork in a bridge-owned inherited group",
    async () => {
      // Given
      const runtimeUrl = new URL("../runtime/process.ts", import.meta.url).href;
      const command = [
        'trap "exit 0" TERM',
        '(trap \'env -i PATH="$PATH" bash -c "trap \\"\\" TERM; sleep 5" >/dev/null 2>&1 & echo forked:$!; exit 0\' TERM; while true; do sleep 1; done) &',
        "wait",
      ].join("\n");
      const harness = `
        import { runBoundedProcess, ProcessControlError } from ${JSON.stringify(runtimeUrl)};
        const error = await runBoundedProcess({
          argv: ["bash", "-c", ${JSON.stringify(command)}],
          cwd: process.cwd(),
          env: process.env,
          timeoutMs: 500,
          killGraceMs: 100,
          groupMode: "inherited",
        }).catch((caught) => caught);
        if (!(error instanceof ProcessControlError) || error.kind !== "timeout") {
          process.exitCode = 3;
        } else {
          process.stdout.write(JSON.stringify({ stdout: error.result.stdout }));
        }
      `;
      const child = Bun.spawn(["setsid", process.execPath, "-e", harness], {
        cwd: process.cwd(),
        stdout: "pipe",
        stderr: "pipe",
      });
      const stdout = new Response(child.stdout).text();

      // When
      const exitCode = await child.exited;

      // Then
      expect(exitCode).toBe(0);
      const result = JSON.parse(await stdout) as { stdout: string };
      const match = /forked:(\d+)/.exec(result.stdout);
      expect(match).not.toBeNull();
      const descendantId = Number.parseInt(match?.[1] ?? "", 10);
      expect(Number.isSafeInteger(descendantId)).toBe(true);
      expect(descendantAlive(descendantId)).toBe(false);
      expect(processGroupExists(child.pid)).toBe(false);
    },
  );

  test.skipIf(process.platform !== "linux")(
    "kills a group member that ignores SIGTERM after the owned leader exits",
    async () => {
      // Given
      const processPromise = runBoundedProcess({
        argv: [
          "bash",
          "-c",
          [
            'trap "exit 0" TERM',
            '(trap "" TERM; sleep 5) >/dev/null 2>&1 & grandchild=$!',
            "printf '%s\\n' \"$$ $grandchild\"",
            "wait",
          ].join("; "),
        ],
        cwd: process.cwd(),
        env: process.env,
        timeoutMs: 500,
        killGraceMs: 100,
      });

      // When
      const error = await processPromise.catch((caught: unknown) => caught);

      // Then
      expect(error).toBeInstanceOf(ProcessControlError);
      if (!(error instanceof ProcessControlError)) throw error;
      expect(error.kind).toBe("timeout");
      const [leaderText, descendantText] = error.result.stdout
        .trim()
        .split(/\s+/);
      const leaderId = Number.parseInt(leaderText ?? "", 10);
      const descendantId = Number.parseInt(descendantText ?? "", 10);
      expect(Number.isSafeInteger(leaderId)).toBe(true);
      expect(Number.isSafeInteger(descendantId)).toBe(true);
      expect(descendantAlive(descendantId)).toBe(false);
      expect(processGroupExists(leaderId)).toBe(false);
    },
  );

  test("resolves an inherited leader exit immediately without waiting on descendants", async () => {
    // Given
    const startedAt = performance.now();

    // When
    const result = await runBoundedProcess({
      argv: ["bash", "-c", '(trap "" TERM; sleep 2) >/dev/null 2>&1 & exit 0'],
      cwd: process.cwd(),
      env: process.env,
      timeoutMs: 5_000,
      groupMode: "inherited",
    });

    // Then
    expect(result.exitCode).toBe(0);
    expect(result.signal).toBeNull();
    expect(performance.now() - startedAt).toBeLessThan(1_500);
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
