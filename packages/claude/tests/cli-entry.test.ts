// The command-line entry points the bundled hooks run: stdin parsing, the
// JSON line they print, and how failures are reported.
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pathToFileURL } from "node:url";

import { parseHookInput, parseStdinJson, readStdin } from "../src/hook-input";
import {
  isInvokedAsCli,
  main,
  runHookCli,
  runHookCliIfMain,
} from "../src/hook-runner";
import {
  isInvokedAsCli as isDisplayInvokedAsCli,
  runDisplayCli,
  runDisplayCliIfMain,
} from "../src/signoff-display";
import { cleanupTempDirs, createKibiWorkspace } from "./fixture";

afterEach(cleanupTempDirs);

async function withStdin<T>(
  stdin: AsyncIterable<unknown>,
  run: () => Promise<T>,
): Promise<T> {
  const original = Object.getOwnPropertyDescriptor(process, "stdin");
  Object.defineProperty(process, "stdin", {
    configurable: true,
    value: stdin,
  });
  try {
    return await run();
  } finally {
    if (original) Object.defineProperty(process, "stdin", original);
  }
}

type Captured = { stdout: string[]; stderr: string[] };

async function capture(run: () => Promise<void> | void): Promise<Captured> {
  const captured: Captured = { stdout: [], stderr: [] };
  const out = spyOn(process.stdout, "write").mockImplementation(((
    chunk: string,
  ) => {
    captured.stdout.push(chunk);
    return true;
  }) as typeof process.stdout.write);
  const err = spyOn(process.stderr, "write").mockImplementation(((
    chunk: string,
  ) => {
    captured.stderr.push(chunk);
    return true;
  }) as typeof process.stderr.write);
  try {
    await run();
  } finally {
    out.mockRestore();
    err.mockRestore();
  }
  return captured;
}

describe("hook input", () => {
  test("a non-object payload has no event", () => {
    expect(parseHookInput(null)).toStrictEqual({ event: "" });
    expect(parseHookInput("Stop")).toStrictEqual({ event: "" });
    expect(parseHookInput(["Stop"])).toStrictEqual({ event: "" });
  });

  test("every known field is mapped and others are ignored", () => {
    expect(
      parseHookInput({
        hook_event_name: "PreToolUse",
        session_id: "s1",
        cwd: "/w",
        tool_name: "Read",
        source: "startup",
        prompt: "hi",
        tool_input: { file_path: "a.ts" },
        stop_hook_active: true,
        extra: 1,
      }),
    ).toStrictEqual({
      event: "PreToolUse",
      sessionId: "s1",
      cwd: "/w",
      toolName: "Read",
      source: "startup",
      prompt: "hi",
      toolInput: { file_path: "a.ts" },
      stopHookActive: true,
    });
  });

  test("non-string fields and a non-true stop flag are dropped", () => {
    expect(
      parseHookInput({
        hook_event_name: 1,
        session_id: 2,
        cwd: 3,
        tool_name: 4,
        source: 5,
        prompt: 6,
        stop_hook_active: "true",
      }),
    ).toStrictEqual({ event: "" });
  });

  test("a falsy tool input is kept", () => {
    expect(parseHookInput({ tool_input: null })).toStrictEqual({
      event: "",
      toolInput: null,
    });
  });

  test("stdin chunks are joined whether strings or buffers", async () => {
    const text = await withStdin(
      Readable.from(["héllo ", Buffer.from("wörld")]),
      () => readStdin(),
    );
    expect(text).toBe("héllo wörld");
  });

  test("blank stdin is an empty payload and JSON is parsed after trimming", () => {
    expect(parseStdinJson("")).toStrictEqual({});
    expect(parseStdinJson(" \n\t")).toStrictEqual({});
    expect(parseStdinJson('  {"a":1}\n')).toStrictEqual({ a: 1 });
    expect(() => parseStdinJson("{")).toThrow();
  });
});

describe("hook runner command line", () => {
  test("main prints the hook output for the stdin payload as one JSON line", async () => {
    const fixture = createKibiWorkspace();
    const original = process.env.CLAUDE_PLUGIN_DATA;
    process.env.CLAUDE_PLUGIN_DATA = fixture.pluginData;
    try {
      const payload = JSON.stringify({
        hook_event_name: "UserPromptSubmit",
        session_id: "cli",
        cwd: fixture.root,
        prompt: "From now on totals must never be negative.",
      });
      const { stdout, stderr } = await capture(() =>
        withStdin(Readable.from([payload]), () => main()),
      );
      expect(stderr).toStrictEqual([]);
      expect(stdout).toHaveLength(1);
      expect(stdout[0]).toEndWith("}\n");
      const output = JSON.parse(stdout[0] ?? "") as {
        hookSpecificOutput: { hookEventName: string };
      };
      expect(output.hookSpecificOutput.hookEventName).toBe("UserPromptSubmit");
    } finally {
      if (original === undefined)
        Reflect.deleteProperty(process.env, "CLAUDE_PLUGIN_DATA");
      else process.env.CLAUDE_PLUGIN_DATA = original;
    }
  });

  test("a payload that is not JSON reports the error and prints an empty object", async () => {
    const { stdout, stderr } = await capture(() =>
      withStdin(Readable.from(["not json"]), () => runHookCli()),
    );
    expect(stdout).toStrictEqual(["{}\n"]);
    expect(stderr).toHaveLength(1);
    expect(stderr[0]).toStartWith("kibi-claude hook error: ");
    expect(stderr[0]).toEndWith("\n");
    expect(stderr[0]).not.toBe("kibi-claude hook error: \n");
  });

  test("a non-Error failure is reported by its string form", async () => {
    const failing: AsyncIterable<string> = {
      [Symbol.asyncIterator]: () => ({
        next: () => Promise.reject("stdin closed"),
      }),
    };
    const { stdout, stderr } = await capture(() =>
      withStdin(failing, () => runHookCli()),
    );
    expect(stdout).toStrictEqual(["{}\n"]);
    expect(stderr).toStrictEqual(["kibi-claude hook error: stdin closed\n"]);
  });

  test("the runner starts only when invoked as the entry point", async () => {
    const calls: string[] = [];
    await runHookCliIfMain(false, async () => {
      calls.push("not main");
    });
    await runHookCliIfMain(true, async () => {
      calls.push("main");
    });
    expect(calls).toStrictEqual(["main"]);
  });

  test("the default start runs the command line", async () => {
    const { stdout } = await capture(() =>
      withStdin(Readable.from(["{"]), () => runHookCliIfMain(true)),
    );
    expect(stdout).toStrictEqual(["{}\n"]);
  });

  test("the entry point is the module named by argv[1], resolved", () => {
    const file = path.join(os.tmpdir(), "hook.mjs");
    const url = pathToFileURL(file).href;
    for (const check of [isInvokedAsCli, isDisplayInvokedAsCli]) {
      expect(check(undefined, url)).toBe(false);
      expect(check("", "")).toBe(true);
      expect(check(file, url)).toBe(true);
      expect(check(path.relative(process.cwd(), file) || file, url)).toBe(true);
      expect(check(`${file}x`, url)).toBe(false);
    }
  });
});

describe("signoff display command line", () => {
  function withStdinFile(content: string | Error, run: () => void): void {
    const read = spyOn(fs, "readFileSync").mockImplementation(((
      file: unknown,
    ) => {
      expect(file).toBe(0);
      if (content instanceof Error) throw content;
      return content;
    }) as unknown as typeof fs.readFileSync);
    try {
      run();
    } finally {
      read.mockRestore();
    }
  }

  test("a fenced batch prints the unwrapped display content as one line", async () => {
    const { stdout } = await capture(() =>
      withStdinFile(
        JSON.stringify({
          delta: "```kibi-signoff\n## Done\n```\n",
          final: true,
        }),
        () => runDisplayCliIfMain(true),
      ),
    );
    expect(stdout).toStrictEqual([
      `${JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "MessageDisplay",
          displayContent: "## Done\n",
        },
      })}\n`,
    ]);
  });

  test("a batch with nothing to change prints nothing", async () => {
    const { stdout } = await capture(() =>
      withStdinFile(JSON.stringify({ delta: "plain text" }), () =>
        runDisplayCli(),
      ),
    );
    expect(stdout).toStrictEqual([]);
  });

  test("a failed stdin read prints nothing and does not throw", async () => {
    const { stdout } = await capture(() =>
      withStdinFile(new Error("EAGAIN"), () => runDisplayCli()),
    );
    expect(stdout).toStrictEqual([]);
  });

  test("the display hook runs only when invoked as the entry point", () => {
    const calls: string[] = [];
    runDisplayCliIfMain(false, () => calls.push("not main"));
    runDisplayCliIfMain(true, () => calls.push("main"));
    expect(calls).toStrictEqual(["main"]);
  });
});
