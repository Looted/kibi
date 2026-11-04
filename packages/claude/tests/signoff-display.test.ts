import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  SIGNOFF_DISPLAY_ENV,
  handleDisplayBatch,
  unwrapSignoffFences,
} from "../src/signoff-display.js";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function batch(messageId: string, delta: string, final = false): string {
  return JSON.stringify({
    hook_event_name: "MessageDisplay",
    message_id: messageId,
    delta,
    final,
  });
}

function displayed(output: string): string | undefined {
  return output === ""
    ? undefined
    : JSON.parse(output).hookSpecificOutput.displayContent;
}

describe("signoff display hook", () => {
  // implements REQ-kibi-signoff-views
  test("drops kibi-signoff and kibi-questions fence lines so the Markdown renders", () => {
    expect(
      unwrapSignoffFences(
        "Here it is:\n```kibi-signoff\n## Requirements signoff: 1 new\n```\nDone.\n",
        false,
      ),
    ).toEqual({
      displayContent: "Here it is:\n## Requirements signoff: 1 new\nDone.\n",
      open: false,
    });
    expect(
      unwrapSignoffFences("```kibi-questions\n## Decisions\n", false),
    ).toEqual({ displayContent: "## Decisions\n", open: true });
  });

  test("leaves other text and other code fences alone", () => {
    expect(unwrapSignoffFences("plain text\n", false)).toEqual({ open: false });
    expect(unwrapSignoffFences("```ts\nconst a = 1;\n```\n", false)).toEqual({
      open: false,
    });
  });

  test("closes a fence opened in an earlier batch of the same message", () => {
    const id = `msg-${process.pid}-${Date.now()}`;
    expect(
      displayed(handleDisplayBatch(batch(id, "```kibi-signoff\n## Title\n"))),
    ).toBe("## Title\n");
    expect(displayed(handleDisplayBatch(batch(id, "> statement\n")))).toBe(
      undefined,
    );
    expect(displayed(handleDisplayBatch(batch(id, "```\nAfter\n", true)))).toBe(
      "After\n",
    );
    // The message ended, so a later lone fence is not swallowed.
    expect(handleDisplayBatch(batch(id, "```\n"))).toBe("");
  });

  test("can be turned off and ignores malformed input", () => {
    expect(
      handleDisplayBatch(batch("m", "```kibi-signoff\n"), {
        [SIGNOFF_DISPLAY_ENV]: "0",
      }),
    ).toBe("");
    expect(handleDisplayBatch("not json")).toBe("");
    expect(handleDisplayBatch(JSON.stringify({ delta: 3 }))).toBe("");
  });

  test("the bundled hook is registered for MessageDisplay and runs standalone", () => {
    const hooks = JSON.parse(
      readFileSync(path.join(packageRoot, "hooks", "hooks.json"), "utf8"),
    ) as { hooks: Record<string, { hooks: { command: string }[] }[]> };
    expect(hooks.hooks.MessageDisplay?.[0]?.hooks[0]?.command).toBe(
      'node "${CLAUDE_PLUGIN_ROOT}/bin/signoff-display.mjs"',
    );
    const result = spawnSync(
      "node",
      [path.join(packageRoot, "bin", "signoff-display.mjs")],
      {
        input: batch("standalone", "```kibi-questions\n## Q\n```\n", true),
        encoding: "utf8",
      },
    );
    expect(result.status).toBe(0);
    expect(displayed(result.stdout.trim())).toBe("## Q\n");
  });
});

describe("signoff display fences and state", () => {
  let stateDir = "";
  let originalTmp: string | undefined;
  beforeEach(() => {
    originalTmp = process.env.TMPDIR;
    stateDir = mkdtempSync(path.join(os.tmpdir(), "kibi-signoff-state-"));
    process.env.TMPDIR = stateDir;
  });
  afterEach(() => {
    if (originalTmp === undefined)
      Reflect.deleteProperty(process.env, "TMPDIR");
    else process.env.TMPDIR = originalTmp;
    rmSync(stateDir, { recursive: true, force: true });
  });
  const stateFiles = () => readdirSync(stateDir).sort();
  const state = (name: string) =>
    path.join(stateDir, `kibi-signoff-display-${name}`);

  test("the switch is KIBI_SIGNOFF_DISPLAY", () => {
    expect(SIGNOFF_DISPLAY_ENV).toBe("KIBI_SIGNOFF_DISPLAY");
    const open = batch("off", "```kibi-signoff\nx\n```\n");
    expect(handleDisplayBatch(open, { KIBI_SIGNOFF_DISPLAY: "0" })).toBe("");
    expect(
      displayed(handleDisplayBatch(open, { KIBI_SIGNOFF_DISPLAY: "1" })),
    ).toBe("x\n");
    expect(displayed(handleDisplayBatch(open, {}))).toBe("x\n");
  });

  test("fence lines may be indented and padded but hold nothing else", () => {
    expect(
      unwrapSignoffFences("  ```kibi-signoff  \r\nA\n \t```\t\r\nB\n", false),
    ).toStrictEqual({ displayContent: "A\nB\n", open: false });
    expect(unwrapSignoffFences("x```kibi-signoff\n", false)).toStrictEqual({
      open: false,
    });
    expect(unwrapSignoffFences("```kibi-signoffx\n", false)).toStrictEqual({
      open: false,
    });
    expect(unwrapSignoffFences("```kibi-other\n", false)).toStrictEqual({
      open: false,
    });
    expect(unwrapSignoffFences("x```\n```ts\nA\n", true)).toStrictEqual({
      open: true,
    });
    expect(unwrapSignoffFences("A\n```", true)).toStrictEqual({
      displayContent: "A\n",
      open: false,
    });
  });

  test("an open fence is remembered per message until it closes", () => {
    const id = "m-1";
    expect(
      displayed(handleDisplayBatch(batch(id, "```kibi-signoff\nA\n"))),
    ).toBe("A\n");
    expect(stateFiles()).toStrictEqual(["kibi-signoff-display-m-1"]);
    expect(readFileSync(state("m-1"), "utf8")).toBe("1");
    // A batch inside the open fence leaves the state alone.
    writeFileSync(state("m-1"), "kept");
    expect(handleDisplayBatch(batch(id, "B\n"))).toBe("");
    expect(readFileSync(state("m-1"), "utf8")).toBe("kept");
    expect(displayed(handleDisplayBatch(batch(id, "```\nC\n")))).toBe("C\n");
    expect(stateFiles()).toStrictEqual([]);
  });

  test("no state is kept for a closed fence, a final batch or a message without an id", () => {
    expect(
      displayed(handleDisplayBatch(batch("m-2", "```kibi-signoff\nA\n```\n"))),
    ).toBe("A\n");
    expect(
      displayed(handleDisplayBatch(batch("m-3", "```kibi-signoff\nA\n", true))),
    ).toBe("A\n");
    expect(
      displayed(
        handleDisplayBatch(JSON.stringify({ delta: "```kibi-signoff\nA\n" })),
      ),
    ).toBe("A\n");
    expect(stateFiles()).toStrictEqual([]);
  });

  test("a message without an id never reads or removes state", () => {
    writeFileSync(state("message"), "1");
    expect(handleDisplayBatch(JSON.stringify({ delta: "```\nafter\n" }))).toBe(
      "",
    );
    expect(stateFiles()).toStrictEqual(["kibi-signoff-display-message"]);
  });

  test("state file names keep only safe characters, at most 80", () => {
    const long = `a/b.c${"x".repeat(100)}`;
    handleDisplayBatch(batch(long, "```kibi-signoff\n"));
    handleDisplayBatch(batch("/.:", "```kibi-signoff\n"));
    expect(stateFiles()).toStrictEqual([
      `kibi-signoff-display-${`abc${"x".repeat(100)}`.slice(0, 80)}`,
      "kibi-signoff-display-message",
    ]);
  });

  test("state that cannot be removed is ignored", () => {
    mkdirSync(state("dir"));
    expect(displayed(handleDisplayBatch(batch("dir", "```\nafter\n")))).toBe(
      "after\n",
    );
  });

  test("a final flag must be true", () => {
    handleDisplayBatch(
      JSON.stringify({ message_id: "f", delta: "```kibi-signoff\n", final: 1 }),
    );
    expect(stateFiles()).toStrictEqual(["kibi-signoff-display-f"]);
  });

  test("JSON null and a non-string delta are ignored", () => {
    expect(handleDisplayBatch("null")).toBe("");
    expect(
      handleDisplayBatch(JSON.stringify({ delta: ["```kibi-signoff\n"] })),
    ).toBe("");
  });

  test("the source module runs as the display hook when it is the entry point", () => {
    const result = spawnSync(
      process.execPath,
      [path.join(packageRoot, "src", "signoff-display.ts")],
      {
        input: batch("src-entry", "```kibi-questions\n## Q\n```\n", true),
        encoding: "utf8",
        env: { ...process.env, TMPDIR: stateDir },
      },
    );
    expect(result.status).toBe(0);
    expect(result.stdout).toBe(
      `${JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "MessageDisplay",
          displayContent: "## Q\n",
        },
      })}\n`,
    );
  });
});
