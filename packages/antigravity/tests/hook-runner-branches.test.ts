import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { Readable } from "node:stream";
import {
  type AntigravityHookOutput,
  isInvokedAsCli,
  main,
  normalizeEditArgs,
  readFocus,
  runHook,
  runHookCli,
  runHookCliIfMain,
} from "../src/hook-runner.js";
import { createKibiWorkspace } from "./workspace-fixture.js";

const env = { KIBI_TELEMETRY: "0" };
const extraDirs: string[] = [];

afterEach(() => {
  while (extraDirs.length > 0) {
    const dir = extraDirs.pop();
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
  }
});

function injected(output: AntigravityHookOutput): string {
  return output.injectSteps?.[0]?.systemMessage.systemMessage ?? "";
}

function hookRunner(root: string, pluginData: string, conversationId: string) {
  const call = (
    event: string,
    extra: Record<string, unknown> = {},
    callEnv: Record<string, string> = env,
  ) =>
    runHook(
      {
        hookEventName: event,
        conversationId,
        cwd: root,
        workspacePaths: [root],
        ...extra,
      },
      { pluginData, env: callEnv },
    );
  return {
    call,
    pre: (name: string, args: Record<string, unknown>, extra = {}) =>
      call("PreToolUse", { toolCall: { id: "t", name, args }, ...extra }),
    post: (name: string, args: Record<string, unknown>, extra = {}) =>
      call("PostToolUse", { toolCall: { id: "t", name, args }, ...extra }),
    drain: (prompt = "") =>
      call("PreInvocation", prompt ? { lastUserInput: prompt } : {}),
  };
}

describe("kibi-antigravity permission decisions", () => {
  test("never grants edits, commands or MCP calls inside a Kibi workspace", async () => {
    const { root, pluginData } = createKibiWorkspace();
    const hook = hookRunner(root, pluginData, "conv-perm");
    const file = path.join(root, "src", "unowned.ts");

    expect(
      await hook.pre("edit_file", {
        Path: file,
        Target: "1",
        Replacement: "2",
      }),
    ).toEqual({ decision: "ask" });
    expect(
      await hook.pre("write_to_file", { TargetFile: file, CodeContent: "x" }),
    ).toEqual({ decision: "ask" });
    expect(await hook.pre("run_command", { CommandLine: "ls" })).toEqual({
      decision: "ask",
    });
    expect(
      await hook.pre("run_command", {
        CommandLine: "ls",
        BypassSandbox: true,
      }),
    ).toEqual({ decision: "ask" });
    expect(
      await hook.pre("call_mcp_tool", {
        ServerName: "other",
        ToolName: "anything",
      }),
    ).toEqual({ decision: "ask" });
    // A Kibi MCP call gets workspaceRoot stamped and still defers to the user.
    expect(await hook.pre("kibi_kb_search", { query: "rounding" })).toEqual({
      decision: "ask",
      overwrite: { workspaceRoot: root },
    });
  });

  test("allows reads and searches only inside the opened workspace", async () => {
    const { root, pluginData } = createKibiWorkspace();
    const hook = hookRunner(root, pluginData, "conv-read");
    const outside = path.join(os.tmpdir(), "kibi-agy-outside.txt");

    expect(
      await hook.pre("view_file", { AbsolutePath: path.join(root, "README") }),
    ).toEqual({ decision: "allow" });
    expect(await hook.pre("read_file", { Path: outside })).toEqual({
      decision: "ask",
    });
    expect(await hook.pre("read_file", {})).toEqual({ decision: "ask" });
    expect(
      await hook.pre("grep_search", {
        Query: "x",
        SearchPath: path.join(root, "src"),
      }),
    ).toEqual({ decision: "allow" });
    expect(
      await hook.pre("find_by_name", {
        Pattern: "*",
        SearchDirectory: os.tmpdir(),
      }),
    ).toEqual({ decision: "ask" });
    expect(await hook.pre("grep_search", { Query: "x" })).toEqual({
      decision: "allow",
    });
    // Without a cwd a path-less search cannot be placed inside the workspace.
    expect(
      await runHook(
        {
          hookEventName: "PreToolUse",
          conversationId: "conv-read",
          workspacePaths: [root],
          toolCall: { id: "t", name: "grep_search", args: { Query: "x" } },
        },
        { pluginData, env },
      ),
    ).toEqual({ decision: "ask" });
  });

  test("outside Kibi, reads inside the opened folder are allowed and the rest asks", async () => {
    const folder = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-agy-plain-"));
    extraDirs.push(folder);
    fs.mkdirSync(path.join(folder, ".git"));
    const call = (name: string, args: Record<string, unknown>) =>
      runHook(
        {
          hookEventName: "PreToolUse",
          conversationId: "conv-plain",
          cwd: folder,
          workspacePaths: [folder, ""],
          toolCall: { id: "t", name, args },
        },
        { env },
      );
    expect(
      await call("read_file", { Path: path.join(folder, "a.md") }),
    ).toEqual({ decision: "allow" });
    expect(await call("read_file", { Path: "/etc/hosts" })).toEqual({
      decision: "ask",
    });
    expect(await call("run_command", { CommandLine: "rm -rf x" })).toEqual({
      decision: "ask",
    });
    // Other events stay silent outside Kibi.
    expect(
      await runHook(
        { hookEventName: "Stop", cwd: folder, workspacePaths: [folder] },
        { env },
      ),
    ).toEqual({});
  });

  test("finds the Kibi workspace among several opened folders", async () => {
    const { root, pluginData } = createKibiWorkspace();
    const plain = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-agy-first-"));
    extraDirs.push(plain);
    fs.mkdirSync(path.join(plain, ".git"));
    const out = await runHook(
      {
        hookEventName: "SessionStart",
        conversationId: "conv-multi",
        cwd: plain,
        workspacePaths: [plain, root],
      },
      { pluginData, env },
    );
    expect(injected(out)).toContain("Kibi");
  });
});

describe("kibi-antigravity shell and edit context", () => {
  test("queues a read snippet for a shell read and a kb note for .kb paths", async () => {
    const { root, pluginData } = createKibiWorkspace();
    const hook = hookRunner(root, pluginData, "conv-shell-read");

    expect(
      await hook.pre("run_command", { CommandLine: "cat src/checkout.ts" }),
    ).toEqual({ decision: "ask" });
    expect(injected(await hook.drain())).toContain("REQ-checkout-rounding");

    await hook.pre("run_command", {
      CommandLine: "cat .kb/requirements/REQ-checkout-rounding.md",
    });
    expect(injected(await hook.drain())).toContain("kb_query");

    // A shell search before any KB use gets the search tip once.
    await hook.pre("run_command", { CommandLine: "grep -rn rounding src" });
    const tip = injected(await hook.drain());
    expect(tip.length).toBeGreaterThan(0);
    await hook.pre("run_command", { CommandLine: "grep -rn rounding src" });
    expect(await hook.drain()).toEqual({});
  });

  test("asks before a shell command rewrites firm-requirement code", async () => {
    const { root, pluginData } = createKibiWorkspace({ firmRequirement: true });
    const hook = hookRunner(root, pluginData, "conv-shell-firm");
    const out = await hook.pre("run_command", {
      CommandLine: "sed -i 's/round/floor/' src/checkout.ts",
    });
    expect(out.decision).toBe("force_ask");
    expect(out.reason).toContain("REQ-checkout-rounding");
    expect(injected(await hook.drain())).toContain("REQ-checkout-rounding");
  });

  test("reports files a shell command changed and records CLI KB use", async () => {
    const { root, pluginData } = createKibiWorkspace();
    fs.rmSync(path.join(root, ".git"), { recursive: true, force: true });
    spawnSync("git", ["init", "-q"], { cwd: root });
    fs.writeFileSync(
      path.join(root, ".git", "hooks", "pre-commit"),
      "#!/bin/sh\n# kibi-managed\nnpx --no-install kibi check --staged\n",
    );
    const hook = hookRunner(root, pluginData, "conv-shell-post");

    await hook.pre("run_command", { CommandLine: "node gen.js" });
    await new Promise((resolve) => setTimeout(resolve, 20));
    fs.writeFileSync(
      path.join(root, "src", "checkout.ts"),
      "export function roundTotal(a: number) { return a; }\n",
    );
    fs.writeFileSync(
      path.join(root, "src", "fresh.ts"),
      "export const a = 1;\n",
    );
    expect(
      await hook.post("run_command", { CommandLine: "node gen.js" }),
    ).toEqual({});
    const note = injected(await hook.drain());
    expect(note.length).toBeGreaterThan(0);

    await hook.post("run_command", {
      CommandLine:
        'printf \'%s\\n\' \'{"sourceFiles":["src/checkout.ts"],"changed":true}\' | npx --no-install kibi check --input -',
    });
    await hook.post("run_command", { CommandLine: 'git commit -m "feat: x"' });
    await hook.post("run_command", {
      CommandLine:
        'printf \'%s\\n\' \'{"type":"req","id":"REQ-x","properties":{"title":"x","status":"open"}}\' | npx --no-install kibi upsert --input -',
    });
    expect(
      await hook.call("Stop", { terminationReason: "NO_TOOL_CALL" }),
    ).toBeDefined();
  });

  test("a failed tool call changes nothing", async () => {
    const { root, pluginData } = createKibiWorkspace();
    const hook = hookRunner(root, pluginData, "conv-failed");
    expect(
      await hook.post(
        "edit_file",
        { Path: path.join(root, "src", "checkout.ts") },
        { error: "denied" },
      ),
    ).toEqual({});
  });

  test("notes unowned source on edit and the template after a stated rule", async () => {
    const { root, pluginData } = createKibiWorkspace();
    const hook = hookRunner(root, pluginData, "conv-unowned");

    const prompt = await hook.drain(
      "Always keep versions as integers because the API rejects strings",
    );
    expect(injected(prompt).length).toBeGreaterThan(0);

    const file = path.join(root, "src", "unowned.ts");
    await hook.pre("edit_file", {
      Path: file,
      Target: "1",
      Replacement: "2",
    });
    expect(injected(await hook.drain())).toContain("src/unowned.ts");

    await hook.post("edit_file", { Path: file, Target: "1", Replacement: "2" });
    const template = injected(await hook.drain());
    expect(template.length).toBeGreaterThan(0);

    const stopped = await hook.call("Stop", {});
    expect(stopped.decision).toBe("continue");
    // Continuation and other termination reasons stay silent.
    expect(await hook.call("Stop", { continuationActive: true })).toEqual({});
    expect(await hook.call("Stop", { terminationReason: "ERROR" })).toEqual({});
  });

  test("edits of a known file get the focused update, kb edits the kb note", async () => {
    const { root, pluginData } = createKibiWorkspace();
    const hook = hookRunner(root, pluginData, "conv-known");
    const file = path.join(root, "src", "checkout.ts");

    await hook.pre("read_file", { Path: file, StartLine: 1, EndLine: 3 });
    await hook.drain();
    await hook.pre("replace_file_content", {
      TargetFile: file,
      TargetContent: "Math.round(amount * 100) / 100;",
      ReplacementContent: "Math.round(amount * 100) / 100 + 0;",
    });
    await hook.drain();
    await hook.pre("multi_replace_file_content", {
      TargetFile: file,
      ReplacementChunks: [
        {
          TargetContent: "Math.round(amount * 100) / 100;",
          ReplacementContent: "Math.round(amount * 100) / 100;",
        },
      ],
    });
    await hook.pre("write_file", { Path: file, Content: "x", Append: true });

    await hook.pre("edit_file", {
      Path: path.join(root, ".kb", "requirements", "REQ-checkout-rounding.md"),
      Target: "a",
      Replacement: "b",
    });
    expect(injected(await hook.drain())).toContain("kb_");
    await hook.post("edit_file", {
      Path: path.join(root, ".kb", "requirements", "REQ-checkout-rounding.md"),
    });
    await hook.post("edit_file", { Path: path.join(root, "README.md") });
    await hook.post("edit_file", {});
  });

  test("an unreadable symbols manifest is reported once on edit", async () => {
    const { root, pluginData } = createKibiWorkspace();
    fs.writeFileSync(path.join(root, ".kb", "symbols.yaml"), ": : not yaml [");
    const hook = hookRunner(root, pluginData, "conv-unreadable");
    const file = path.join(root, "src", "unowned.ts");
    await hook.pre("edit_file", { Path: file, Target: "1", Replacement: "2" });
    const first = injected(await hook.drain());
    await hook.pre("edit_file", { Path: file, Target: "1", Replacement: "2" });
    expect(first.length).toBeGreaterThan(0);
    expect(await hook.drain()).toEqual({});
  });

  test("records Kibi MCP use through call_mcp_tool", async () => {
    const { root, pluginData } = createKibiWorkspace();
    const hook = hookRunner(root, pluginData, "conv-mcp");
    await hook.post("call_mcp_tool", {
      ServerName: "kibi",
      ToolName: "kb_upsert",
      Arguments: JSON.stringify({
        type: "req",
        id: "REQ-y",
        properties: { title: "y", status: "open" },
      }),
    });
    await hook.post("kibi_kb_check", { sourceFiles: ["src/checkout.ts"] });
    await hook.post("unrelated_tool", {});
    expect(await hook.call("UnknownEvent")).toEqual({});
  });
});

describe("kibi-antigravity argument helpers", () => {
  test("normalizes every edit tool and read window", () => {
    expect(
      normalizeEditArgs("replace_file_content", {
        TargetContent: "a",
        ReplacementContent: "b",
        AllowMultiple: true,
      }),
    ).toEqual({ old_string: "a", new_string: "b", replace_all: true });
    expect(
      normalizeEditArgs("multi_replace_file_content", {
        ReplacementChunks: [{ TargetContent: "a", ReplacementContent: "b" }],
      }),
    ).toEqual({
      edits: [{ old_string: "a", new_string: "b", replace_all: false }],
    });
    expect(normalizeEditArgs("multi_replace_file_content", {})).toEqual({
      edits: [],
    });
    expect(normalizeEditArgs("write_file", { Content: "c" })).toEqual({
      content: "c",
    });
    expect(normalizeEditArgs("write_to_file", { CodeContent: "c" })).toEqual({
      content: "c",
    });
    expect(normalizeEditArgs("other", { a: 1 })).toEqual({ a: 1 });
    expect(normalizeEditArgs("other", undefined)).toEqual({});
    expect(readFocus({ StartLine: 5 })).toEqual([{ start: 5, end: 5 }]);
    expect(readFocus({ EndLine: 0 })).toEqual([{ start: 1, end: 1 }]);
  });
});

describe("kibi-antigravity reminders, telemetry and limits", () => {
  test("reminds once to show the signoff view after recording a requirement", async () => {
    const { root, pluginData } = createKibiWorkspace();
    const hook = hookRunner(root, pluginData, "conv-signoff");
    await hook.post("kibi_kb_upsert", {
      type: "req",
      id: "REQ-z",
      properties: { title: "z", status: "open" },
    });
    const first = await hook.call("Stop", {});
    expect(first.decision).toBe("continue");
    expect(first.reason).toContain("kibi signoff");
    expect(await hook.call("Stop", {})).toEqual({});
  });

  test("records edited requirement ids when diagnostic telemetry is on", async () => {
    const { root, pluginData } = createKibiWorkspace();
    const hook = hookRunner(root, pluginData, "conv-telemetry");
    const diagnostic = { KIBI_TELEMETRY: "0", KIBI_DIAGNOSTIC_MODE: "1" };
    await hook.call(
      "PostToolUse",
      {
        toolCall: {
          id: "t",
          name: "edit_file",
          args: { Path: path.join(root, "src", "checkout.ts") },
        },
      },
      diagnostic,
    );
    await hook.call(
      "PostToolUse",
      { toolCall: { id: "t", name: "kibi_kb_query", args: { id: "REQ-1" } } },
      diagnostic,
    );
    const log = fs.readFileSync(path.join(root, ".kb", "usage.log"), "utf8");
    expect(log).toContain("REQ-checkout-rounding");
  });

  test("caps the injected context", async () => {
    const { root, pluginData } = createKibiWorkspace();
    const hook = hookRunner(root, pluginData, "conv-cap");
    for (let index = 0; index < 40; index += 1) {
      const file = path.join(root, "src", `generated-${index}.ts`);
      fs.writeFileSync(file, `export const value${index} = ${index};\n`);
      await hook.pre("edit_file", {
        Path: file,
        Target: "1",
        Replacement: "2",
      });
    }
    const out = injected(await hook.drain());
    expect(out.length).toBeLessThanOrEqual(3600);
    expect(out.endsWith("…")).toBe(true);
  });

  test("falls back to ANTIGRAVITY_WORKSPACE when the event names no folder", async () => {
    const { root, pluginData } = createKibiWorkspace();
    const out = await runHook(
      { hookEventName: "SessionStart", conversationId: "conv-env" },
      { pluginData, env: { ...env, ANTIGRAVITY_WORKSPACE: root } },
    );
    expect(injected(out)).toContain("Kibi");
  });

  test("shell edits of a file the agent already read get the short update", async () => {
    const { root, pluginData } = createKibiWorkspace();
    const hook = hookRunner(root, pluginData, "conv-shell-known");
    await hook.pre("read_file", {
      Path: path.join(root, "src", "checkout.ts"),
    });
    await hook.drain();
    await hook.pre("run_command", {
      CommandLine: "sed -i 's/a/b/' src/checkout.ts README.md",
    });
    await hook.drain();
    // The same edit again shows nothing new.
    await hook.pre("run_command", {
      CommandLine: "sed -i 's/a/b/' src/checkout.ts",
    });
    expect(await hook.drain()).toEqual({});
  });
});

describe("kibi-antigravity CLI entry", () => {
  async function withStdin(text: string, run: () => Promise<void>) {
    const original = Object.getOwnPropertyDescriptor(process, "stdin");
    const writes: string[] = [];
    const write = process.stdout.write;
    const errWrite = process.stderr.write;
    Object.defineProperty(process, "stdin", {
      value: Readable.from([Buffer.from(text)]),
      configurable: true,
    });
    process.stdout.write = ((chunk: string) => {
      writes.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;
    process.stderr.write = (() => true) as typeof process.stderr.write;
    try {
      await run();
    } finally {
      process.stdout.write = write;
      process.stderr.write = errWrite;
      if (original) Object.defineProperty(process, "stdin", original);
    }
    return writes.join("");
  }

  test("prints the hook result, and a safe decision when the hook throws", async () => {
    const folder = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-agy-cli-"));
    extraDirs.push(folder);
    fs.mkdirSync(path.join(folder, ".git"));
    const ok = await withStdin(
      JSON.stringify({
        hookEventName: "PreToolUse",
        cwd: folder,
        workspacePaths: [folder],
        toolCall: { id: "t", name: "run_command", args: { CommandLine: "ls" } },
      }),
      main,
    );
    expect(JSON.parse(ok)).toEqual({ decision: "ask" });

    const fallback = await withStdin(
      JSON.stringify({
        hookEventName: "PreToolUse",
        toolCall: { id: "t", name: "edit_file", args: {} },
      }),
      () =>
        main(async () => {
          throw new Error("boom");
        }),
    );
    expect(JSON.parse(fallback)).toEqual({ decision: "ask" });
    const other = await withStdin("{}", () =>
      main(async () => {
        throw "plain";
      }),
    );
    expect(JSON.parse(other)).toEqual({});
    const cli = await withStdin("{not json", runHookCli);
    expect(cli.trim().length).toBeGreaterThan(0);
  });

  test("runs only when invoked as the CLI", async () => {
    expect(isInvokedAsCli(undefined, "file:///x.mjs")).toBe(false);
    expect(isInvokedAsCli("/x.mjs", "file:///x.mjs")).toBe(true);
    let started = 0;
    await runHookCliIfMain(false, async () => {
      started += 1;
    });
    await runHookCliIfMain(true, async () => {
      started += 1;
    });
    expect(started).toBe(1);
  });
});

describe("kibi-antigravity repeat and focus context", () => {
  test("a pending edit with KB use but no check gets the plain stop reminder", async () => {
    const { root, pluginData } = createKibiWorkspace();
    const hook = hookRunner(root, pluginData, "conv-stop-plain");
    await hook.post("kibi_kb_upsert", {
      type: "fact",
      id: "FACT-x",
      properties: { title: "x", status: "active" },
    });
    await hook.post("edit_file", {
      Path: path.join(root, "src", "checkout.ts"),
    });
    const out = await hook.call("Stop", {});
    expect(out.decision).toBe("continue");
    expect(out.reason).toContain("src/checkout.ts");
  });

  test("focus moves to a linked symbol after an edit elsewhere in the file", async () => {
    const { root, pluginData } = createKibiWorkspace();
    const hook = hookRunner(root, pluginData, "conv-focus");
    const file = path.join(root, "src", "checkout.ts");
    await hook.pre("edit_file", {
      Path: file,
      Target: 'return "ok";',
      Replacement: 'return "fine";',
    });
    await hook.drain();
    await hook.pre("edit_file", {
      Path: file,
      Target: "return Math.round(amount * 100) / 100;",
      Replacement: "return Math.round(amount * 100) / 100 + 0;",
    });
    await hook.drain();
    // Reading a file already shown on edit adds nothing.
    await hook.pre("read_file", { Path: file });
    expect(await hook.drain()).toEqual({});
  });

  test("explored files and requirements are not repeated", async () => {
    const { root, pluginData } = createKibiWorkspace();
    const hook = hookRunner(root, pluginData, "conv-explored");
    await hook.post("kibi_kb_check", {
      sourceFiles: ["src/unowned.ts"],
      changed: true,
    });
    await hook.post("kibi_kb_query", { id: "REQ-checkout-rounding" });
    await hook.pre("edit_file", {
      Path: path.join(root, "src", "unowned.ts"),
      Target: "1",
      Replacement: "2",
    });
    await hook.pre("read_file", {
      Path: path.join(root, "src", "checkout.ts"),
    });
    expect(await hook.drain()).toEqual({});
    fs.mkdirSync(path.join(root, "tests"), { recursive: true });
    fs.writeFileSync(path.join(root, "tests", "a.test.ts"), "test();\n");
    await hook.pre("edit_file", {
      Path: path.join(root, "tests", "a.test.ts"),
      Target: "test",
      Replacement: "it",
    });
    await hook.pre("run_command", {
      CommandLine: `sed -i 's/a/b/' ${path.join(os.tmpdir(), "outside.ts")}`,
    });
  });

  test("files a shell command changed after a read get the short update", async () => {
    const { root, pluginData } = createKibiWorkspace();
    fs.rmSync(path.join(root, ".git"), { recursive: true, force: true });
    spawnSync("git", ["init", "-q"], { cwd: root });
    const hook = hookRunner(root, pluginData, "conv-shell-known-post");
    await hook.pre("read_file", {
      Path: path.join(root, "src", "checkout.ts"),
    });
    await hook.drain();
    await hook.pre("run_command", { CommandLine: "node gen.js" });
    await new Promise((resolve) => setTimeout(resolve, 20));
    fs.appendFileSync(path.join(root, "src", "checkout.ts"), "\n");
    await hook.post("run_command", { CommandLine: "node gen.js" });
    await hook.drain();
  });
});

describe("kibi-antigravity edge edits", () => {
  test("removing a dead implements comment is not a firm edit", async () => {
    const { root, pluginData } = createKibiWorkspace({ firmRequirement: true });
    const file = path.join(root, "src", "checkout.ts");
    fs.writeFileSync(
      file,
      `// implements REQ-checkout-rounding\n${fs.readFileSync(file, "utf8")}`,
    );
    const hook = hookRunner(root, pluginData, "conv-dead-comment");
    const out = await hook.pre("edit_file", {
      Path: file,
      Target: "// implements REQ-checkout-rounding\n",
      Replacement: "",
    });
    expect(out.decision).toBe("ask");
  });

  test("a shell write to a non-source file needs no confirmation", async () => {
    const { root, pluginData } = createKibiWorkspace({ firmRequirement: true });
    const hook = hookRunner(root, pluginData, "conv-shell-doc");
    expect(
      await hook.pre("run_command", { CommandLine: "echo hi > notes.md" }),
    ).toEqual({ decision: "ask" });
  });

  test("a source file with coordinates but no symbols reads as an unreadable manifest", async () => {
    const { root, pluginData } = createKibiWorkspace();
    fs.appendFileSync(
      path.join(root, ".kb", "symbol-coordinates.yaml"),
      "\n  SYM-unowned-version:\n    sourceFile: src/unowned.ts\n    sourceLine: 1\n",
    );
    const hook = hookRunner(root, pluginData, "conv-coords");
    await hook.pre("edit_file", {
      Path: path.join(root, "src", "unowned.ts"),
      Target: "1",
      Replacement: "2",
    });
    await hook.drain();
  });
});
