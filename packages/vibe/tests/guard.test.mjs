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
