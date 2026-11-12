import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { cleanupTempDirs, createKibiWorkspace } from "./fixture";

afterEach(cleanupTempDirs);

/**
 * Runs the shipped hook bundle under node, as Claude Code does, for an
 * edit in a file a firm requirement governs. KIBI_E2E_HOOK_BUNDLE points
 * the same checks at another build.
 */
const bundle =
  process.env.KIBI_E2E_HOOK_BUNDLE ??
  path.resolve(import.meta.dir, "../bin/hook-runner.mjs");

function preToolUse(
  fixture: { root: string; pluginData: string },
  sessionId: string,
  toolInput: Record<string, unknown>,
): { permissionDecision?: string } {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    CLAUDE_PLUGIN_DATA: fixture.pluginData,
    KIBI_TELEMETRY: "0",
  };
  // The confirmation is on unless the environment turns it off.
  Reflect.deleteProperty(env, "KIBI_CONFIRM_FIRM_EDITS");
  const result = spawnSync("node", [bundle], {
    encoding: "utf8",
    env,
    input: JSON.stringify({
      hook_event_name: "PreToolUse",
      session_id: sessionId,
      cwd: fixture.root,
      tool_name: "Edit",
      tool_input: toolInput,
    }),
  });
  expect(result.status).toBe(0);
  const output = result.stdout.trim() === "" ? {} : JSON.parse(result.stdout);
  return output.hookSpecificOutput ?? {};
}

describe("the shipped Claude hook and dead implements comments", () => {
  test("a comment-only deletion is not put to the person; a code change is", () => {
    const fixture = createKibiWorkspace();
    const file = path.join(fixture.root, "src/checkout.ts");
    fs.writeFileSync(
      file,
      fs
        .readFileSync(file, "utf8")
        .replace(
          "let total = 0;",
          "// implements REQ-checkout-rounding\n  let total = 0;",
        ),
    );
    const removal = {
      file_path: "src/checkout.ts",
      old_string: "  // implements REQ-checkout-rounding\n  let total = 0;",
      new_string: "  let total = 0;",
    };
    expect(
      preToolUse(fixture, "comment", removal).permissionDecision,
    ).toBeUndefined();
    expect(
      preToolUse(fixture, "code", {
        ...removal,
        new_string: "  let total = 1;",
      }).permissionDecision,
    ).toBe("ask");
  });
});
