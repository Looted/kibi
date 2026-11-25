#!/usr/bin/env node
// guard.test.mjs — unit tests for the Vibe decision guard (src/guard.ts):
// the rule note, the firm-requirement notice after an edit, the rule-capture
// template and the missing-git-hooks note, over throwaway workspaces.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  afterEditInput,
  firmEditAfterNotice,
  isEditTool,
  isReadTool,
  postEditNote,
  promptNote,
  readRowsNote,
  searchReplaceEdits,
  sessionStartNote,
  sessionStateDir,
  toolReads,
} from "../src/guard.ts";

const RULE_PROMPT =
  "Invoices must never be deleted, because auditors need the full history.";

function workspace() {
  const root = mkdtempSync(join(tmpdir(), "kibi-vibe-guard-"));
  const state = mkdtempSync(join(tmpdir(), "kibi-vibe-guard-state-"));
  mkdirSync(join(root, ".kb", "requirements"), { recursive: true });
  mkdirSync(join(root, "src"), { recursive: true });
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
  const env = { KIBI_VIBE_STATE_DIR: state };
  return {
    root,
    env,
    cleanup() {
      rmSync(root, { recursive: true, force: true });
      rmSync(state, { recursive: true, force: true });
    },
  };
}

function edit(root, file, extra = {}) {
  return {
    hook_event_name: "post_tool",
    session_id: "s1",
    cwd: root,
    tool_name: "edit",
    tool_input: { file_path: file, ...extra },
    tool_status: "success",
  };
}

test("isEditTool accepts Vibe's file-writing tools with or without a prefix", () => {
  assert.equal(isEditTool("edit"), true);
  assert.equal(isEditTool("file_system.write_file"), true);
  assert.equal(isEditTool("search_replace"), true);
  assert.equal(isEditTool("read_file"), false);
  assert.equal(isEditTool(undefined), false);
});

test("sessionStateDir keys state by workspace and hashed session", () => {
  const a = sessionStateDir("/w/a", "s1", { KIBI_VIBE_STATE_DIR: "/state" });
  const b = sessionStateDir("/w/b", "s1", { KIBI_VIBE_STATE_DIR: "/state" });
  assert.notEqual(a, b);
  assert.ok(a.startsWith("/state/"));
  assert.ok(!a.includes("s1"));
  assert.ok(sessionStateDir("/w/a", "  ", {}).endsWith("unattributed"));
  assert.ok(sessionStateDir("/w/a", undefined, {}).includes("kibi-vibe-"));
});

test("firmEditAfterNotice names one or several rules and asks to undo a break", () => {
  const one = firmEditAfterNotice("deleteInvoice in src/invoices.ts", [
    { id: "REQ-a", title: "Keep invoices" },
  ]);
  assert.match(
    one,
    /implements a firm requirement, a rule the person set: REQ-a: Keep invoices\./,
  );
  assert.match(one, /If the edit does not keep that rule, tell the person/);
  const many = firmEditAfterNotice("src/x.ts", [
    { id: "REQ-a" },
    { id: "REQ-b", title: "B" },
    { id: "REQ-c" },
  ]);
  assert.match(
    many,
    /firm requirements, a rule the person set: REQ-a; REQ-b: B \(\+1 more\)\./,
  );
  assert.match(many, /does not keep those rules/);
});

test("afterEditInput reads each replacement as the text to locate", () => {
  assert.deepEqual(
    afterEditInput({
      old_string: "a",
      new_string: "b",
      replace_all: true,
      edits: [{ newString: "c", replaceAll: true }, null],
    }),
    {
      old_string: "b",
      replace_all: true,
      edits: [
        { old_string: "c", replace_all: true },
        { old_string: undefined, replace_all: undefined },
      ],
    },
  );
  assert.deepEqual(afterEditInput("x"), {
    old_string: undefined,
    replace_all: undefined,
    edits: [],
  });
});

test("promptNote gives the rule note with the stated reason, and nothing otherwise", () => {
  const ws = workspace();
  try {
    const payload = { session_id: "s1", cwd: ws.root };
    assert.equal(promptNote(ws.root, payload, ws.env), undefined);
    assert.equal(
      promptNote(
        ws.root,
        { ...payload, prompt: "What does this file do?" },
        ws.env,
      ),
      undefined,
    );
    const note = promptNote(
      ws.root,
      { ...payload, prompt: RULE_PROMPT },
      ws.env,
    );
    assert.match(String(note), /reads as a rule or decision/);
    assert.match(String(note), /why field/);
  } finally {
    ws.cleanup();
  }
});

test("postEditNote warns once about a firm requirement, then gives the capture template", () => {
  const ws = workspace();
  try {
    promptNote(
      ws.root,
      { session_id: "s1", cwd: ws.root, prompt: RULE_PROMPT },
      ws.env,
    );
    const first = postEditNote(
      ws.root,
      edit(ws.root, "src/invoices.ts", {
        new_string: "throw new Error('kept');",
      }),
      ws.env,
    );
    assert.match(
      String(first),
      /this edit changed deleteInvoice in src\/invoices\.ts/,
    );
    assert.match(
      String(first),
      /REQ-keep-invoices: Invoices are never deleted/,
    );
    assert.match(String(first), /kb_record/);
    // The requirement is settled and the template claimed for this session.
    assert.equal(
      postEditNote(
        ws.root,
        edit(ws.root, join(ws.root, "src/invoices.ts")),
        ws.env,
      ),
      undefined,
    );
  } finally {
    ws.cleanup();
  }
});

test("postEditNote stays quiet for reads, outside paths, .kb files and when turned off", () => {
  const ws = workspace();
  try {
    assert.equal(
      postEditNote(
        ws.root,
        { ...edit(ws.root, "src/invoices.ts"), tool_name: "read_file" },
        ws.env,
      ),
      undefined,
    );
    assert.equal(
      postEditNote(ws.root, edit(ws.root, "/elsewhere/a.ts"), ws.env),
      undefined,
    );
    assert.equal(
      postEditNote(ws.root, edit(ws.root, ws.root), ws.env),
      undefined,
    );
    assert.equal(
      postEditNote(ws.root, edit(ws.root, ".kb/symbols.yaml"), ws.env),
      undefined,
    );
    assert.equal(
      postEditNote(
        ws.root,
        { ...edit(ws.root, "src/invoices.ts"), cwd: undefined },
        {
          ...ws.env,
          KIBI_CONFIRM_FIRM_EDITS: "0",
        },
      ),
      undefined,
    );
    // A file no requirement governs gets no notice.
    writeFileSync(join(ws.root, "src", "free.ts"), "export const x = 1;\n");
    assert.equal(
      postEditNote(ws.root, edit(ws.root, "src/free.ts"), ws.env),
      undefined,
    );
  } finally {
    ws.cleanup();
  }
});

test("searchReplaceEdits reads SEARCH/REPLACE blocks as replacements", () => {
  assert.deepEqual(
    searchReplaceEdits({
      file_path: "a",
      content:
        "<<<<<<< SEARCH\none\n=======\nuno\n>>>>>>> REPLACE\n<<<<<<< SEARCH\ntwo\n=======\ndos\n>>>>>>> REPLACE",
    }),
    {
      edits: [
        { old_string: "one", new_string: "uno" },
        { old_string: "two", new_string: "dos" },
      ],
    },
  );
  assert.deepEqual(searchReplaceEdits({ content: "plain" }), {
    content: "plain",
  });
  assert.equal(searchReplaceEdits("x"), "x");
});

test("postEditNote tells the agent once to ask the person about a level change", () => {
  const ws = workspace();
  try {
    const pkg = (level) =>
      `${JSON.stringify({ name: "app", kibi: { level } }, null, 2)}\n`;
    writeFileSync(join(ws.root, "package.json"), pkg("remember"));
    const change = edit(ws.root, "package.json", {
      old_string: '"level": "test"',
      new_string: '"level": "remember"',
    });
    const note = postEditNote(ws.root, change, ws.env);
    assert.equal(
      note,
      "Kibi: the change you just made changes the Kibi level from test to remember (package.json). That is the person's decision, not yours: ask the person now whether to keep it, and undo it unless they agree.",
    );
    assert.equal(postEditNote(ws.root, change, ws.env), undefined);
    // A whole-file write has no earlier text and outside Git no commit, so
    // nothing tells what the level was.
    assert.equal(
      postEditNote(
        ws.root,
        {
          ...edit(ws.root, "package.json", { content: pkg("remember") }),
          session_id: "s2",
          tool_name: "write_file",
        },
        ws.env,
      ),
      undefined,
    );
  } finally {
    ws.cleanup();
  }
});

test("postEditNote notices a settings file the last commit did not have", () => {
  const ws = workspace();
  try {
    const git = (...args) =>
      execFileSync("git", args, { cwd: ws.root, stdio: "ignore" });
    git("init", "-q");
    git("add", ".");
    git(
      "-c",
      "user.name=t",
      "-c",
      "user.email=t@example.invalid",
      "commit",
      "-qm",
      "init",
    );
    const content = JSON.stringify({ level: "remember" });
    writeFileSync(join(ws.root, ".kb", "setup.json"), content);
    const note = postEditNote(
      ws.root,
      {
        ...edit(ws.root, ".kb/setup.json", { content }),
        tool_name: "write_file",
      },
      ws.env,
    );
    assert.match(
      String(note),
      /changes the Kibi level from test to remember \(\.kb\/setup\.json\)/,
    );
  } finally {
    ws.cleanup();
  }
});

test("postEditNote compares a whole-file write with the last commit", () => {
  const ws = workspace();
  try {
    const file = join(ws.root, ".kb", "requirements", "REQ-floor.md");
    const doc = (evidence) =>
      `---\nid: REQ-floor\ntitle: Floor\nstatus: open\nrequired_evidence: ${evidence}\n---\n`;
    writeFileSync(file, doc("tested"));
    const git = (...args) =>
      execFileSync("git", args, { cwd: ws.root, stdio: "ignore" });
    git("init", "-q");
    git("add", ".");
    git(
      "-c",
      "user.name=t",
      "-c",
      "user.email=t@example.invalid",
      "commit",
      "-qm",
      "init",
    );
    writeFileSync(file, doc("asserted"));
    const note = postEditNote(
      ws.root,
      {
        ...edit(ws.root, ".kb/requirements/REQ-floor.md", {
          content: doc("asserted"),
        }),
        tool_name: "write_file",
      },
      ws.env,
    );
    assert.match(
      note ?? "",
      /lowers the evidence REQ-floor must reach from tested to asserted/,
    );
    // A kb_upsert that lowered the floor is compared with the commit too.
    const upsert = (input) => ({
      ...edit(ws.root, "x"),
      session_id: "s3",
      tool_name: "kibi_kb_upsert",
      tool_input: input,
    });
    assert.match(
      postEditNote(
        ws.root,
        upsert({ id: "REQ-floor", properties: {} }),
        ws.env,
      ) ?? "",
      /ask the person now whether to keep it/,
    );
    assert.equal(
      postEditNote(
        ws.root,
        { ...upsert({ id: "REQ-floor", dryRun: true }), session_id: "s4" },
        ws.env,
      ),
      undefined,
    );
    assert.equal(
      postEditNote(ws.root, { ...upsert({}), session_id: "s5" }, ws.env),
      undefined,
    );
    // A search_replace is turned back through its blocks, not the commit.
    writeFileSync(file, doc("asserted"));
    assert.match(
      postEditNote(
        ws.root,
        {
          ...edit(ws.root, ".kb/requirements/REQ-floor.md", {
            content:
              "<<<<<<< SEARCH\nrequired_evidence: proved\n=======\nrequired_evidence: asserted\n>>>>>>> REPLACE",
          }),
          session_id: "s6",
          tool_name: "search_replace",
        },
        ws.env,
      ) ?? "",
      /from proved to asserted/,
    );
  } finally {
    ws.cleanup();
  }
});

test("sessionStartNote advises Git outside a repository and names missing git hooks inside one", () => {
  const ws = workspace();
  try {
    const payload = { session_id: "s1", cwd: ws.root };
    assert.match(
      String(sessionStartNote(ws.root, payload, ws.env)),
      /^No Git repository: Kibi is working without version control/,
    );
    execFileSync("git", ["init", "-q"], { cwd: ws.root });
    assert.match(String(sessionStartNote(ws.root, payload, ws.env)), /hook/i);
  } finally {
    ws.cleanup();
  }
});

test("guardNote runs a note only in a Kibi workspace and fails open", async () => {
  const { guardNote, joinParts } = await import("../bin/hooks/kibi-common.mjs");
  const ws = workspace();
  try {
    assert.equal(
      guardNote(() => "note", ws.root, {}),
      "note",
    );
    assert.equal(
      guardNote(() => "", ws.root, {}),
      undefined,
    );
    assert.equal(
      guardNote(
        () => {
          throw new Error("boom");
        },
        ws.root,
        {},
      ),
      undefined,
    );
    assert.equal(
      guardNote(() => "note", join(ws.root, "src"), {}),
      undefined,
    );
    assert.equal(joinParts(["a", undefined, "", "b"]), "a\n\nb");
    assert.equal(joinParts([undefined]), "");
  } finally {
    ws.cleanup();
  }
});

function read(root, toolName, toolInput, sessionId = "r1") {
  return {
    hook_event_name: "post_tool",
    session_id: sessionId,
    cwd: root,
    tool_name: toolName,
    tool_input: toolInput,
    tool_status: "success",
  };
}

test("isReadTool accepts read_file, grep and bash, with or without a prefix", () => {
  assert.equal(isReadTool("read_file"), true);
  assert.equal(isReadTool("file_system.grep"), true);
  assert.equal(isReadTool("bash"), true);
  assert.equal(isReadTool("edit"), false);
  assert.equal(isReadTool(undefined), false);
});

test("toolReads reads each tool's file, window, pattern or command", () => {
  const root = "/w";
  assert.deepEqual(toolReads("read_file", { path: "src/a.ts" }, root), [
    { absolute: "/w/src/a.ts", directory: false },
  ]);
  assert.deepEqual(
    toolReads("read_file", { path: "a.ts", offset: 9, limit: 5 }, root),
    [
      {
        absolute: "/w/a.ts",
        directory: false,
        focus: [{ start: 10, end: 14 }],
      },
    ],
  );
  assert.deepEqual(toolReads("read_file", { path: "a.ts", offset: 4 }, root), [
    {
      absolute: "/w/a.ts",
      directory: false,
      focus: [{ start: 5, end: Number.MAX_SAFE_INTEGER }],
    },
  ]);
  assert.deepEqual(toolReads("read_file", {}, root), []);
  assert.deepEqual(
    toolReads("grep", { pattern: "x", path: "/nowhere" }, root),
    [],
  );
  assert.deepEqual(toolReads(undefined, { command: "ls" }, root), []);
});

test("readRowsNote names the requirements of the code in view once per session", () => {
  const ws = workspace();
  try {
    const first =
      readRowsNote(
        ws.root,
        read(ws.root, "read_file", { path: "src/invoices.ts" }),
        ws.env,
      ) ?? "";
    assert.match(first, /^Kibi requirements for the code in view:/);
    assert.match(first, /REQ-keep-invoices \[firm: ask before changing\]/);
    assert.equal(
      readRowsNote(
        ws.root,
        read(ws.root, "bash", { command: "cat src/invoices.ts" }),
        ws.env,
      ),
      undefined,
    );
    assert.equal(
      readRowsNote(
        ws.root,
        read(ws.root, "edit", { path: "src/invoices.ts" }),
        ws.env,
      ),
      undefined,
    );
    assert.equal(
      readRowsNote(ws.root, read(ws.root, "grep", { pattern: "" }), ws.env),
      undefined,
    );
    const {
      session_id: _id,
      cwd: _cwd,
      ...unattributed
    } = read(ws.root, "file_system.grep", { pattern: "deleteInvoice" });
    // Without coordinates a match cannot be placed in a symbol: no row.
    assert.equal(readRowsNote(ws.root, unattributed), undefined);
  } finally {
    ws.cleanup();
  }
});
