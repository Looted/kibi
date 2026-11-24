#!/usr/bin/env node
// hooks.test.mjs — the shipped hook scripts (bin/hooks/*.mjs, with the built
// bin/hooks/kibi-guard.mjs bundle) run as Vibe runs them: a child process
// whose cwd is the plugin root, a JSON payload on stdin, the session folder
// in the payload's `cwd`. The kibi CLI behind them is a stub installed in the
// throwaway workspace's node_modules, so these tests need no SWI-Prolog.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { isEditTool } from "../src/guard.ts";

const PLUGIN_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const HOOKS = join(PLUGIN_ROOT, "bin", "hooks");
const RULE_PROMPT =
  "Invoices must never be deleted, because auditors need the full history.";

// A stand-in for the project-local kibi CLI: it answers `query` with one
// entity naming the sourceFile it was asked about, answers `search` and
// `status`, always writes noise to stderr, and fails when FAKE_KIBI_FAIL=1.
const FAKE_KIBI = `
import { readFileSync, appendFileSync } from "node:fs";
const route = process.argv[2];
let input = {};
try { input = JSON.parse(readFileSync(0, "utf8") || "{}"); } catch {}
if (process.env.FAKE_KIBI_LOG) appendFileSync(process.env.FAKE_KIBI_LOG, route + "\\n");
process.stderr.write("FAKE-KIBI-STDERR-NOISE\\n");
if (process.env.FAKE_KIBI_FAIL === "1") process.exit(1);
const data = {
  query: { entities: [{ id: "REQ-fake", type: "req", status: "open", title: "governs " + input.sourceFile }] },
  search: { results: [{ entity: { id: "REQ-hit", type: "req", status: "open", title: "hit for " + input.query } }] },
  status: { branch: "main", dirty: false, staleReasonCount: 0 },
}[route];
process.stdout.write(JSON.stringify({ data }) + "\\n");
`;

function workspace() {
  const root = mkdtempSync(join(tmpdir(), "kibi-vibe-hooks-"));
  const state = mkdtempSync(join(tmpdir(), "kibi-vibe-hooks-state-"));
  mkdirSync(join(root, ".kb", "requirements"), { recursive: true });
  mkdirSync(join(root, "src"), { recursive: true });
  const cli = join(root, "node_modules", "kibi-cli");
  mkdirSync(join(cli, "bin"), { recursive: true });
  writeFileSync(
    join(cli, "package.json"),
    JSON.stringify({ name: "kibi-cli", bin: { kibi: "bin/kibi.mjs" } }),
  );
  writeFileSync(join(cli, "bin", "kibi.mjs"), FAKE_KIBI);
  writeFileSync(join(root, ".kb", "manifest.json"), "{}");
  writeFileSync(
    join(root, ".kb", "requirements", "REQ-keep-invoices.md"),
    "---\nid: REQ-keep-invoices\ntitle: Invoices are never deleted\nstatus: open\nfirmness: firm\n---\n",
  );
  writeFileSync(
    join(root, ".kb", "symbols.yaml"),
    [
      "symbols:",
      "  - id: SYM-delete-invoice",
      "    title: deleteInvoice",
      "    sourceFile: src/invoices.ts",
      "    status: active",
      "    relationships:",
      "      - type: implements",
      "        target: REQ-keep-invoices",
      "",
    ].join("\n"),
  );
  writeFileSync(
    join(root, "src", "invoices.ts"),
    "export function deleteInvoice() {\n  throw new Error('kept');\n}\n",
  );
  return {
    root,
    env: { KIBI_VIBE_STATE_DIR: state },
    cleanup() {
      rmSync(root, { recursive: true, force: true });
      rmSync(state, { recursive: true, force: true });
    },
  };
}

/** Run a shipped hook like Vibe: plugin root as cwd, payload on stdin. */
function runHook(name, payload, env = {}) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(process.execPath, [join(HOOKS, name)], {
      cwd: PLUGIN_ROOT,
      env: { ...process.env, KIBI_AUTO_SYNC: "0", ...env },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      rejectPromise(new Error(`${name} timed out`));
    }, 60_000);
    child.stdout.on("data", (d) => {
      stdout += d;
    });
    child.stderr.on("data", (d) => {
      stderr += d;
    });
    child.on("error", rejectPromise);
    child.on("close", (code) => {
      clearTimeout(timer);
      const text = stdout.trim();
      resolvePromise({
        code,
        stdout,
        stderr,
        context: text
          ? (JSON.parse(text).hook_specific_output?.additional_context ?? "")
          : "",
      });
    });
    child.stdin.end(`${JSON.stringify(payload)}\n`);
  });
}

function postTool(root, toolName, toolInput, cwd = root) {
  return {
    hook_event_name: "post_tool",
    session_id: "hooks-test",
    cwd,
    tool_name: toolName,
    tool_input: toolInput,
    tool_status: "success",
  };
}

test("kibi-file-context resolves a relative tool path against the payload cwd, not the hook's cwd", async () => {
  const ws = workspace();
  try {
    // The session runs in src/, the hook process runs in the plugin root.
    const result = await runHook(
      "kibi-file-context.mjs",
      postTool(
        ws.root,
        "file_system.read_file",
        { path: "invoices.ts" },
        join(ws.root, "src"),
      ),
      ws.env,
    );
    assert.equal(result.code, 0);
    assert.match(result.context, /Kibi entities linked to src\/invoices\.ts:/);
    assert.match(
      result.context,
      /REQ-fake \(req, open\): governs src\/invoices\.ts/,
    );
  } finally {
    ws.cleanup();
  }
});

test("a post_tool search_replace edit through the shipped hook gets the firm-edit notice", async () => {
  const ws = workspace();
  try {
    const result = await runHook(
      "kibi-file-context.mjs",
      postTool(ws.root, "search_replace", {
        file_path: "src/invoices.ts",
        content:
          "<<<<<<< SEARCH\nx\n=======\nthrow new Error('kept');\n>>>>>>> REPLACE",
      }),
      ws.env,
    );
    assert.equal(result.code, 0);
    assert.match(result.context, /which implements a firm requirement/);
    assert.match(
      result.context,
      /REQ-keep-invoices: Invoices are never deleted/,
    );
    assert.match(result.context, /kb_review_firm_edit/);
    assert.match(result.context, /Kibi entities linked to src\/invoices\.ts/);
  } finally {
    ws.cleanup();
  }
});

test("the firm-edit notice does not depend on the hook finding a path in the tool input", async () => {
  const ws = workspace();
  try {
    // The guard reads every path the edit names; the file lookup reads only
    // file_path/path/new_path/newFilePath, so this edit gives it none.
    const result = await runHook(
      "kibi-file-context.mjs",
      postTool(ws.root, "edit", {
        edits: [
          {
            file_path: "src/invoices.ts",
            new_string: "throw new Error('kept');",
          },
        ],
      }),
      ws.env,
    );
    assert.equal(result.code, 0);
    assert.match(result.context, /firm requirement/);
    assert.match(result.context, /REQ-keep-invoices/);
    assert.doesNotMatch(result.context, /Kibi entities linked to/);
  } finally {
    ws.cleanup();
  }
});

test("the post-tool matcher in hooks.toml matches every edit tool the guard treats as an edit", () => {
  const toml = readFileSync(
    join(PLUGIN_ROOT, "ai.mistral.vibe", "hooks.toml"),
    "utf8",
  );
  const section = toml
    .split("[[hooks]]")
    .find((block) => block.includes('name = "kibi-file-context"'));
  const pattern = /^match = "re:(.*)"$/m.exec(section ?? "")?.[1];
  assert.ok(pattern, "kibi-file-context declares a match");
  // The TOML string escapes backslashes; a matcher must hold on a full match
  // as well as on a search.
  const matcher = new RegExp(`^(?:${pattern.replace(/\\\\/g, "\\")})$`);
  // Every Vibe file tool the guard treats as an edit, plus the read tool.
  const fileTools = ["read_file", "write_file", "edit", "search_replace"];
  const editTools = fileTools.filter((tool) => isEditTool(tool));
  assert.deepEqual(editTools, ["write_file", "edit", "search_replace"]);
  for (const tool of fileTools) {
    assert.ok(matcher.test(tool), `matcher misses ${tool}`);
    assert.ok(
      matcher.test(`file_system.${tool}`),
      `matcher misses file_system.${tool}`,
    );
  }
  assert.ok(!matcher.test("bash"));
});

test("hooks print nothing to stderr when kibi fails, unless debugging is on", async () => {
  const ws = workspace();
  try {
    const env = { ...ws.env, FAKE_KIBI_FAIL: "1" };
    /** @type {[string, Record<string, unknown>][]} */
    const payloads = [
      [
        "kibi-session-context.mjs",
        {
          hook_event_name: "session_start",
          session_id: "s",
          cwd: ws.root,
          source: "startup",
        },
      ],
      [
        "kibi-prompt-context.mjs",
        {
          hook_event_name: "pre_agent",
          session_id: "s",
          cwd: ws.root,
          prompt: "how does invoice deletion work",
        },
      ],
      [
        "kibi-file-context.mjs",
        postTool(ws.root, "read_file", { path: "src/invoices.ts" }),
      ],
    ];
    for (const [name, payload] of payloads) {
      const quiet = await runHook(name, payload, env);
      assert.equal(quiet.code, 0, name);
      assert.equal(quiet.stderr, "", `${name} leaked stderr`);
      assert.equal(quiet.stdout, "", `${name} printed on failure`);
      const loud = await runHook(name, payload, {
        ...env,
        KIBI_VIBE_LAUNCHER_DEBUG: "1",
      });
      assert.equal(loud.code, 0, name);
      assert.match(
        loud.stderr,
        /FAKE-KIBI-STDERR-NOISE/,
        `${name} hides debug stderr`,
      );
    }
  } finally {
    ws.cleanup();
  }
});

test("a prompt over 2000 characters keeps the rule note and skips the KB search", async () => {
  const ws = workspace();
  const log = join(ws.root, "kibi-calls.log");
  try {
    const long = `${RULE_PROMPT} ${"Background detail. ".repeat(130)}`;
    assert.ok(long.length > 2000);
    const payload = {
      hook_event_name: "pre_agent",
      session_id: "long",
      cwd: ws.root,
      prompt: long,
    };
    const env = { ...ws.env, FAKE_KIBI_LOG: log };
    const result = await runHook("kibi-prompt-context.mjs", payload, env);
    assert.equal(result.code, 0);
    assert.match(result.context, /reads as a rule or decision/);
    assert.doesNotMatch(result.context, /Kibi KB hits/);
    assert.throws(() => readFileSync(log), /ENOENT/, "no kibi search ran");
    // A short prompt still searches.
    const short = await runHook(
      "kibi-prompt-context.mjs",
      {
        ...payload,
        session_id: "short",
        prompt: "how does invoice deletion work",
      },
      env,
    );
    assert.match(
      short.context,
      /REQ-hit \(req, open\): hit for how does invoice deletion work/,
    );
    assert.equal(readFileSync(log, "utf8"), "search\n");
  } finally {
    ws.cleanup();
  }
});
