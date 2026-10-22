import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
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
