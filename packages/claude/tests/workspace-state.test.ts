// Workspace opt-in resolution and the per-session journal, unit by unit.
import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  type SessionEvent,
  appendSessionEvents,
  applyEvent,
  emptySessionState,
  loadSessionState,
  sessionDir,
  workspaceDataDir,
} from "../src/session-state";
import {
  KIBI_WORKSPACE_ENV_KEYS,
  resolveKibiWorkspace,
} from "../src/workspace-optin";
import { cleanupTempDirs, tempDir, write } from "./fixture";

afterEach(cleanupTempDirs);

function sha(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 32);
}

describe("workspace opt-in resolution", () => {
  test("the environment overrides are checked in order", () => {
    expect(KIBI_WORKSPACE_ENV_KEYS).toStrictEqual([
      "KIBI_WORKSPACE",
      "KIBI_PROJECT_ROOT",
      "KIBI_ROOT",
    ]);
  });

  test("each environment override wins, trimmed and resolved", () => {
    const adopted = tempDir("kibi-claude-optin-env-");
    write(adopted, ".kb/manifest.json", "{}");
    const plain = tempDir("kibi-claude-optin-plain-");
    for (const key of KIBI_WORKSPACE_ENV_KEYS) {
      expect(
        resolveKibiWorkspace(plain, { [key]: `  ${adopted}/sub/..  ` }),
      ).toStrictEqual({ root: adopted, optedIn: true });
      expect(resolveKibiWorkspace(adopted, { [key]: plain })).toStrictEqual({
        root: plain,
        optedIn: false,
      });
    }
    // The first key set wins over later ones.
    expect(
      resolveKibiWorkspace(plain, {
        KIBI_WORKSPACE: adopted,
        KIBI_PROJECT_ROOT: plain,
        KIBI_ROOT: plain,
      }),
    ).toStrictEqual({ root: adopted, optedIn: true });
    expect(
      resolveKibiWorkspace(plain, {
        KIBI_PROJECT_ROOT: adopted,
        KIBI_ROOT: plain,
      }),
    ).toStrictEqual({ root: adopted, optedIn: true });
  });

  test("a blank environment override is ignored", () => {
    const adopted = tempDir("kibi-claude-optin-blank-");
    write(adopted, ".kb/manifest.json", "{}");
    fs.mkdirSync(path.join(adopted, ".git"));
    expect(
      resolveKibiWorkspace(adopted, { KIBI_WORKSPACE: "   ", KIBI_ROOT: "" }),
    ).toStrictEqual({ root: adopted, optedIn: true });
  });

  test("the walk stops at the first manifest or git boundary", () => {
    const repo = tempDir("kibi-claude-optin-walk-");
    fs.mkdirSync(path.join(repo, ".git"));
    const nested = path.join(repo, "a", "b");
    fs.mkdirSync(nested, { recursive: true });
    expect(resolveKibiWorkspace(nested, {})).toStrictEqual({
      root: repo,
      optedIn: false,
    });
    write(repo, "a/.kb/manifest.json", "{}");
    expect(resolveKibiWorkspace(nested, {})).toStrictEqual({
      root: path.join(repo, "a"),
      optedIn: true,
    });
    write(repo, ".kb/manifest.json", "{}");
    expect(resolveKibiWorkspace(repo, {})).toStrictEqual({
      root: repo,
      optedIn: true,
    });
  });

  test("a manifest directory without the manifest file does not opt in", () => {
    const repo = tempDir("kibi-claude-optin-nomanifest-");
    fs.mkdirSync(path.join(repo, ".git"));
    fs.mkdirSync(path.join(repo, ".kb"));
    write(repo, ".kb/manifest.yaml", "x");
    expect(resolveKibiWorkspace(repo, {})).toStrictEqual({
      root: repo,
      optedIn: false,
    });
  });

  test("without any boundary up to the filesystem root, the start directory is the root", () => {
    const loose = tempDir("kibi-claude-optin-loose-");
    const nested = path.join(loose, "x");
    fs.mkdirSync(nested);
    expect(resolveKibiWorkspace(`${nested}/`, {})).toStrictEqual({
      root: nested,
      optedIn: false,
    });
  });

  test("a missing or blank start directory walks from the process cwd", () => {
    const loose = tempDir("kibi-claude-optin-cwd-");
    write(loose, ".kb/manifest.json", "{}");
    // A blank start is not a directory name: a directory called "  " with
    // its own boundary is not used.
    fs.mkdirSync(path.join(loose, "  ", ".git"), { recursive: true });
    const original = process.cwd();
    process.chdir(loose);
    try {
      const root = fs.realpathSync(loose);
      for (const start of [undefined, "", "  "]) {
        const resolved = resolveKibiWorkspace(start, {});
        expect(fs.realpathSync(resolved.root)).toBe(root);
        expect(resolved.optedIn).toBe(true);
      }
    } finally {
      process.chdir(original);
    }
  });

  test("the process environment is the default", () => {
    const adopted = tempDir("kibi-claude-optin-default-");
    write(adopted, ".kb/manifest.json", "{}");
    const original = process.env.KIBI_WORKSPACE;
    process.env.KIBI_WORKSPACE = adopted;
    try {
      expect(resolveKibiWorkspace(tempDir("kibi-claude-x-"))).toStrictEqual({
        root: adopted,
        optedIn: true,
      });
    } finally {
      if (original === undefined)
        Reflect.deleteProperty(process.env, "KIBI_WORKSPACE");
      else process.env.KIBI_WORKSPACE = original;
    }
  });
});

describe("session directories", () => {
  test("the workspace directory is keyed by the hashed resolved root", () => {
    expect(workspaceDataDir(undefined, "/w")).toBeUndefined();
    expect(workspaceDataDir("", "/w")).toBeUndefined();
    expect(workspaceDataDir("/data", "/w/x/..")).toBe(
      path.join("/data", "workspaces", sha("/w")),
    );
  });

  test("the session directory is keyed by the hashed trimmed session id", () => {
    expect(sessionDir(undefined, "s")).toBeUndefined();
    expect(sessionDir("", "s")).toBeUndefined();
    expect(sessionDir("/ws", " s1 ")).toBe(
      path.join("/ws", "sessions", sha("s1")),
    );
    for (const id of [undefined, "", "   "]) {
      expect(sessionDir("/ws", id)).toBe(
        path.join("/ws", "sessions", "unattributed"),
      );
    }
  });
});

function replay(...events: SessionEvent[]) {
  const state = emptySessionState();
  for (const event of events) applyEvent(state, event);
  return state;
}

describe("session journal replay", () => {
  test("the empty state", () => {
    expect(emptySessionState()).toStrictEqual({
      shownRead: new Set(),
      shownEdit: new Set(),
      notices: new Set(),
      kbUsed: false,
      exploredPaths: new Set(),
      exploredIds: new Set(),
      pendingSource: [],
      reminded: new Set(),
      commandStartedAt: undefined,
      requestWords: [],
      rulePrompt: false,
      firmAsked: new Map(),
      firmConfirmed: new Set(),
      sourceEdited: false,
      kbRecorded: false,
    });
  });

  test("shown snippets and notices", () => {
    const state = replay(
      { kind: "shown", surface: "read", path: "a" },
      { kind: "shown", surface: "edit", path: "b" },
      { kind: "notice", name: "n" },
    );
    expect(state.shownRead).toStrictEqual(new Set(["a"]));
    expect(state.shownEdit).toStrictEqual(new Set(["b"]));
    expect(state.notices).toStrictEqual(new Set(["n"]));
  });

  test("Kibi usage marks lookups, and only an upsert records", () => {
    const lookup = replay({
      kind: "kb",
      operation: "kb_query",
      paths: ["p1", "p2"],
      ids: ["i1", "i2"],
    });
    expect(lookup.kbUsed).toBe(true);
    expect(lookup.kbRecorded).toBe(false);
    expect(lookup.exploredPaths).toStrictEqual(new Set(["p1", "p2"]));
    expect(lookup.exploredIds).toStrictEqual(new Set(["i1", "i2"]));
    expect(
      replay({ kind: "kb", operation: "kb_upsert", paths: [], ids: [] })
        .kbRecorded,
    ).toBe(true);
  });

  test("edits track pending source files and confirm asked firm requirements", () => {
    const state = replay(
      { kind: "firm_asked", path: "src/a.ts", ids: ["R1", "R2"] },
      { kind: "firm_asked", path: "src/a.ts", ids: ["R2", "R3"] },
      { kind: "firm_asked", path: "src/b.ts", ids: ["R9"] },
    );
    expect(state.firmAsked).toStrictEqual(
      new Map([
        ["src/a.ts", ["R1", "R2", "R3"]],
        ["src/b.ts", ["R9"]],
      ]),
    );
    applyEvent(state, { kind: "edited", path: "docs/x.md", pathKind: "other" });
    expect(state.sourceEdited).toBe(false);
    expect(state.pendingSource).toStrictEqual([]);
    applyEvent(state, { kind: "edited", path: "src/a.ts", pathKind: "test" });
    expect(state.firmConfirmed).toStrictEqual(new Set(["R1", "R2", "R3"]));
    expect(state.firmAsked).toStrictEqual(new Map([["src/b.ts", ["R9"]]]));
    expect(state.sourceEdited).toBe(false);

    applyEvent(state, { kind: "edited", path: "s1", pathKind: "source" });
    applyEvent(state, { kind: "edited", path: "s2", pathKind: "source" });
    applyEvent(state, { kind: "reminded", paths: ["s1", "s2"] });
    applyEvent(state, { kind: "edited", path: "s1", pathKind: "source" });
    expect(state.sourceEdited).toBe(true);
    expect(state.pendingSource).toStrictEqual(["s2", "s1"]);
    expect(state.reminded).toStrictEqual(new Set(["s2"]));
  });

  test("checks clear the named pending files, or all of them", () => {
    const state = replay(
      { kind: "edited", path: "s1", pathKind: "source" },
      { kind: "edited", path: "s2", pathKind: "source" },
      { kind: "edited", path: "s3", pathKind: "source" },
      { kind: "checked", paths: ["s2"], all: false },
    );
    expect(state.pendingSource).toStrictEqual(["s1", "s3"]);
    applyEvent(state, { kind: "checked", paths: [], all: true });
    expect(state.pendingSource).toStrictEqual([]);
  });

  test("the latest command start wins", () => {
    expect(
      replay(
        { kind: "command_started", at: 5 },
        { kind: "command_started", at: 3 },
      ).commandStartedAt,
    ).toBe(5);
    expect(replay({ kind: "command_started", at: -2 }).commandStartedAt).toBe(
      0,
    );
  });

  test("prompts keep the latest words and remember any rule", () => {
    const state = replay(
      { kind: "prompt", words: ["a"], rule: true },
      { kind: "prompt", words: ["b"], rule: false },
    );
    expect(state.requestWords).toStrictEqual(["b"]);
    expect(state.rulePrompt).toBe(true);
    expect(replay({ kind: "prompt", words: [], rule: false }).rulePrompt).toBe(
      false,
    );
  });

  test("a context reset forgets what was shown but keeps pending work", () => {
    const state = replay(
      { kind: "shown", surface: "read", path: "a" },
      { kind: "shown", surface: "edit", path: "b" },
      { kind: "notice", name: "n" },
      { kind: "kb", operation: "kb_upsert", paths: ["p"], ids: ["i"] },
      { kind: "edited", path: "s", pathKind: "source" },
      { kind: "reminded", paths: ["s"] },
      { kind: "context_reset" },
    );
    expect(state.shownRead.size).toBe(0);
    expect(state.shownEdit.size).toBe(0);
    expect(state.notices.size).toBe(0);
    expect(state.exploredPaths.size).toBe(0);
    expect(state.exploredIds.size).toBe(0);
    expect(state.kbUsed).toBe(true);
    expect(state.kbRecorded).toBe(true);
    expect(state.pendingSource).toStrictEqual(["s"]);
    expect(state.reminded).toStrictEqual(new Set(["s"]));
  });
});

describe("session journal storage", () => {
  test("events are appended as JSON lines and replayed", () => {
    const dir = path.join(tempDir("kibi-claude-journal-"), "deep", "s");
    appendSessionEvents(dir, [
      { kind: "notice", name: "a" },
      { kind: "notice", name: "b" },
    ]);
    appendSessionEvents(dir, [{ kind: "shown", surface: "read", path: "p" }]);
    expect(fs.readFileSync(path.join(dir, "session.jsonl"), "utf8")).toBe(
      '{"kind":"notice","name":"a"}\n{"kind":"notice","name":"b"}\n{"kind":"shown","surface":"read","path":"p"}\n',
    );
    const state = loadSessionState(dir);
    expect(state.notices).toStrictEqual(new Set(["a", "b"]));
    expect(state.shownRead).toStrictEqual(new Set(["p"]));
  });

  test("nothing is written without a directory or events", () => {
    const base = tempDir("kibi-claude-journal-none-");
    const dir = path.join(base, "s");
    appendSessionEvents(dir, []);
    appendSessionEvents(undefined, [{ kind: "notice", name: "a" }]);
    expect(fs.existsSync(dir)).toBe(false);
    expect(loadSessionState(undefined)).toStrictEqual(emptySessionState());
    expect(loadSessionState(dir)).toStrictEqual(emptySessionState());
  });

  test("an empty directory name reads no journal", () => {
    const cwd = tempDir("kibi-claude-journal-cwd-");
    fs.writeFileSync(
      path.join(cwd, "session.jsonl"),
      '{"kind":"notice","name":"a"}\n',
    );
    const original = process.cwd();
    process.chdir(cwd);
    try {
      expect(loadSessionState("")).toStrictEqual(emptySessionState());
      expect(loadSessionState(".").notices).toStrictEqual(new Set(["a"]));
    } finally {
      process.chdir(original);
    }
  });

  test("torn and foreign lines are skipped", () => {
    const dir = tempDir("kibi-claude-journal-torn-");
    fs.writeFileSync(
      path.join(dir, "session.jsonl"),
      '{"kind":"notice","name":"a"}\n{"kind":"noti\nnull\n\n{"kind":"notice","name":"b"}',
    );
    expect(loadSessionState(dir).notices).toStrictEqual(new Set(["a", "b"]));
  });

  test("a journal that cannot be written is ignored", () => {
    const base = tempDir("kibi-claude-journal-blocked-");
    const blocker = path.join(base, "file");
    fs.writeFileSync(blocker, "x");
    expect(() =>
      appendSessionEvents(path.join(blocker, "s"), [
        { kind: "notice", name: "a" },
      ]),
    ).not.toThrow();
    expect(fs.readFileSync(blocker, "utf8")).toBe("x");
  });
});
