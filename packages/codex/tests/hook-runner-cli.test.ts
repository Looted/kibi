// implements REQ-codex-kibi-plugin-v1
import { describe, expect, test } from "bun:test";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";

import {
  isInvokedAsCli,
  main,
  runHookCli,
} from "../src/hook-runner";

const hookRunnerPath = fileURLToPath(
  new URL("../src/hook-runner.ts", import.meta.url),
);

async function withStdin<T>(chunks: Array<string | Buffer>, fn: () => Promise<T>): Promise<T> {
  const previous = Object.getOwnPropertyDescriptor(process, "stdin");
  Object.defineProperty(process, "stdin", {
    configurable: true,
    value: Readable.from(chunks),
  });
  try {
    return await fn();
  } finally {
    if (previous) {
      Object.defineProperty(process, "stdin", previous);
    }
  }
}

describe("Codex hook runner CLI", () => {
  test("Given invalid JSON on stdin When invoked as script Then hook errors are reported", async () => {
    const hookRunner = Bun.spawn(["bun", hookRunnerPath], {
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
    });

    hookRunner.stdin.write("not json");
    hookRunner.stdin.end();

    const output = await new Response(hookRunner.stdout).text();
    const exitCode = await hookRunner.exited;

    expect(exitCode).toBe(0);
    expect(output).toContain("Kibi hook runner error");
  });

  test("classifies CLI invocation and reports in-process hook errors", async () => {
    expect(isInvokedAsCli(undefined, "file:///tmp/hook.ts")).toBe(false);
    expect(isInvokedAsCli(hookRunnerPath, `file://${hookRunnerPath}`)).toBe(true);

    const writes: string[] = [];
    const write = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: string | Uint8Array) => {
      writes.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString());
      return true;
    }) as typeof process.stdout.write;
    try {
      await withStdin(["not json"], async () => {
        await runHookCli();
      });
      await withStdin(['{"event":"Stop"}'], async () => {
        await main();
      });
    } finally {
      process.stdout.write = write;
    }
    expect(writes.some((chunk) => chunk.includes("Kibi hook runner error"))).toBe(
      true,
    );
    expect(writes.some((chunk) => chunk.includes('"continue":true'))).toBe(true);
  });

  test("loads the module as a CLI entrypoint", async () => {
    const previousArgv = process.argv[1];
    const previousStdin = Object.getOwnPropertyDescriptor(process, "stdin");
    Object.defineProperty(process, "stdin", {
      configurable: true,
      value: Readable.from(['{"event":"Stop"}']),
    });
    process.argv[1] = hookRunnerPath;
    try {
      await import(`${new URL("../src/hook-runner.ts", import.meta.url).href}?cli=${Date.now()}`);
    } finally {
      process.argv[1] = previousArgv;
      if (previousStdin) {
        Object.defineProperty(process, "stdin", previousStdin);
      }
    }
  });
});
