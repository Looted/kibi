// implements REQ-kibi-hooks-flow-manifest
import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  type ConsumerWorkspace,
  createConsumerWorkspace,
  doc,
} from "./workspace.js";

/**
 * Consumer view of a project whose `.kb/symbols.yaml` was written by
 * kibi-cli before 2.18.0: every symbol sits on the one flow-sequence line
 * that `kibi init`'s `symbols: []` grew into. The shipped Claude Code hook
 * bundle must still know which requirement an edit touches, and a plain
 * `kibi sync` must leave the manifest in the block layout later tools read.
 */

const REPO_ROOT = path.resolve(import.meta.dir, "../../../..");
const CLAUDE_PLUGIN_ROOT = path.join(REPO_ROOT, "packages/claude");
const HOOK_RUNNER = path.join(CLAUDE_PLUGIN_ROOT, "bin/hook-runner.mjs");

const FLOW_MANIFEST =
  "# symbols.yaml\n" +
  "symbols: [ { id: SYM-auth-toggle, title: toggleViewMode, sourceFile: src/app/services/auth.service.ts, relationships: [ { type: implements, target: REQ-auth-view-mode } ] }, { id: SYM-auth-signout, title: signOut, sourceFile: src/app/services/auth.service.ts, links: [REQ-auth-sign-out] } ]\n";

const AUTH_SERVICE = [
  "export class AuthService {",
  "  viewMode = 'compact';",
  "  toggleViewMode(): void {",
  "    this.viewMode = this.viewMode === 'compact' ? 'full' : 'compact';",
  "  }",
  "  signOut(): void {}",
  "}",
  "",
].join("\n");

let workspace: ConsumerWorkspace | undefined;
let pluginData: string | undefined;

afterEach(() => {
  workspace?.cleanup();
  workspace = undefined;
  if (pluginData) rmSync(pluginData, { recursive: true, force: true });
  pluginData = undefined;
});

function preToolUse(
  ws: ConsumerWorkspace,
  toolInput: Record<string, unknown>,
): string | undefined {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    CLAUDE_PLUGIN_ROOT,
    CLAUDE_PLUGIN_DATA: pluginData,
  };
  for (const key of ["KIBI_DIAGNOSTIC_MODE", "KIBI_CLI_DIAGNOSTIC_MODE"]) {
    Reflect.deleteProperty(env, key);
  }
  const result = spawnSync("node", [HOOK_RUNNER], {
    cwd: ws.root,
    env,
    encoding: "utf8",
    input: JSON.stringify({
      session_id: "consumer-flow-manifest",
      cwd: ws.root,
      hook_event_name: "PreToolUse",
      tool_name: "Edit",
      tool_input: toolInput,
    }),
    timeout: 60_000,
  });
  expect(result.status).toBe(0);
  if (result.stdout.trim().length === 0) return undefined;
  const output = JSON.parse(result.stdout) as {
    hookSpecificOutput?: { additionalContext?: string };
  };
  return output.hookSpecificOutput?.additionalContext;
}

describe("a flow-style symbol manifest from an older Kibi", () => {
  test("hooks still name the requirement and sync rewrites the manifest in block layout", () => {
    const ws = createConsumerWorkspace("kibi-flow-manifest-");
    workspace = ws;
    pluginData = mkdtempSync(path.join(os.tmpdir(), "kibi-flow-plugin-data-"));

    ws.write(
      ".kb/requirements/REQ-auth-view-mode.md",
      doc(
        "id: REQ-auth-view-mode\ntitle: Users can toggle between compact and full view\nstatus: open\npriority: must",
        "Users toggle the view mode from the auth service.\n\n## Context\n\nAsked by the test project owner.\n",
      ),
    );
    ws.write(
      ".kb/requirements/REQ-auth-sign-out.md",
      doc(
        "id: REQ-auth-sign-out\ntitle: Users can sign out\nstatus: open\npriority: must",
        "Signing out clears the session.\n\n## Context\n\nAsked by the test project owner.\n",
      ),
    );
    ws.write("src/app/services/auth.service.ts", AUTH_SERVICE);
    ws.write(".kb/symbols.yaml", FLOW_MANIFEST);
    ws.git("add", ".kb", "src");
    ws.git("commit", "-qm", "flow-style manifest");

    // The shipped hook bundle reads the one-line manifest as it is.
    const context = preToolUse(ws, {
      file_path: "src/app/services/auth.service.ts",
      old_string: "  toggleViewMode(): void {",
      new_string: "  toggleViewMode(): void { // changed",
    });
    expect(context).toBeDefined();
    expect(context).toContain("REQ-auth-view-mode");
    expect(context).not.toContain("is linked to a requirement yet");

    // A plain sync normalises the layout once, keeping comments and order.
    const sync = ws.text(["sync"]);
    expect(sync).toContain(
      "Rewrote .kb/symbols.yaml in block layout (2 symbols)",
    );
    const rewritten = ws.read(".kb/symbols.yaml");
    expect(rewritten.startsWith("# symbols.yaml\n")).toBe(true);
    expect(rewritten).toContain(
      "symbols:\n  - id: SYM-auth-toggle\n    title: toggleViewMode\n    sourceFile: src/app/services/auth.service.ts\n    relationships:\n      - type: implements\n        target: REQ-auth-view-mode\n",
    );
    expect(rewritten.indexOf("SYM-auth-toggle")).toBeLessThan(
      rewritten.indexOf("SYM-auth-signout"),
    );
    expect(ws.text(["sync"])).not.toContain("Rewrote .kb/symbols.yaml");

    // The compiled KB sees both symbols and their requirement links.
    const query = ws.json(["query"], {
      sourceFile: "src/app/services/auth.service.ts",
    }) as { data?: { entities?: { id: string }[] } };
    const ids = (query.data?.entities ?? []).map((entity) => entity.id).sort();
    expect(ids).toEqual(["SYM-auth-signout", "SYM-auth-toggle"]);
  }, 180_000);
});
