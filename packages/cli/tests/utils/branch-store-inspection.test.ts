// implements REQ-cli-status-pre-first-sync
import { afterAll, describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  branchStorePath,
  ensureBranchStoreManifest,
} from "../../src/utils/branch-store-locator.js";
import {
  BRANCH_STORE_NOT_COMPILED,
  BRANCH_STORE_NOT_COMPILED_RULE,
  type BranchStoreInspection,
  branchStoreCompilation,
  branchStoreReason,
  countAuthoredKbSources,
  inspectBranchStore,
  storeLockJournalReason,
  storeLockTakeoverReason,
  uncompiledBranchStoreReason,
} from "../../src/utils/branch-store.js";

const base = mkdtempSync(path.join(os.tmpdir(), "kibi-branch-store-insp-"));
afterAll(() => rmSync(base, { recursive: true, force: true }));
let counter = 0;
const fresh = () => {
  const dir = path.join(base, `w${counter++}`);
  mkdirSync(dir, { recursive: true });
  return dir;
};
const write = (file: string, contents = "") => {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, contents);
};

/** A workspace whose `main` store has a valid manifest. */
function store(): { root: string; store: string } {
  const root = fresh();
  return { root, store: ensureBranchStoreManifest(root, "main") };
}
const healthy = (storePath: string) => ({
  state: "healthy",
  path: storePath,
  recoveryRequired: false,
});

describe("inspectBranchStore", () => {
  test("names the rule and reason code", () => {
    expect(BRANCH_STORE_NOT_COMPILED).toBe("branch_store_not_compiled");
    expect(BRANCH_STORE_NOT_COMPILED_RULE).toBe("branch-store-not-compiled");
  });

  test("a missing store, or a literal legacy one", () => {
    const root = fresh();
    expect(inspectBranchStore(root, "main")).toStrictEqual({
      state: "missing",
      path: branchStorePath(root, "main"),
      errorCode: "branch_store_missing",
      detail: "The branch-local KB directory does not exist.",
      recoveryRequired: false,
    });
    mkdirSync(path.join(root, ".kb", "branches", "main"), { recursive: true });
    expect(inspectBranchStore(root, "main")).toStrictEqual({
      state: "incomplete",
      path: path.join(root, ".kb", "branches", "main"),
      errorCode: "legacy_branch_store",
      detail:
        "A literal branch-named store exists; preview and apply the explicit migration before writes.",
      recoveryRequired: true,
    });
  });

  test("a store path that is a file, or lacks a matching manifest", () => {
    const root = fresh();
    const storePath = branchStorePath(root, "main");
    write(storePath, "x");
    expect(inspectBranchStore(root, "main")).toStrictEqual({
      state: "unreadable",
      path: storePath,
      errorCode: "branch_store_not_directory",
      detail: "The branch-local KB path is not a directory.",
      recoveryRequired: true,
    });
    const other = fresh();
    mkdirSync(branchStorePath(other, "main"), { recursive: true });
    expect(inspectBranchStore(other, "main")).toStrictEqual({
      state: "unreadable",
      path: branchStorePath(other, "main"),
      errorCode: "branch_store_manifest_mismatch",
      detail:
        "The hashed branch store is missing a valid manifest for the exact Git branch.",
      recoveryRequired: true,
    });
  });

  test("a journaled store needs an rdf directory and a well-formed CURRENT", () => {
    const { root, store: s } = store();
    write(path.join(s, "storage.json"), "{}");
    const incomplete = (errorCode: string, detail: string) => ({
      state: "incomplete",
      path: s,
      errorCode,
      detail,
      recoveryRequired: true,
    });
    const noRdf = incomplete(
      "branch_store_missing_rdf",
      "The journaled store has no rdf generation directory.",
    );
    expect(inspectBranchStore(root, "main")).toStrictEqual(noRdf);
    write(path.join(s, "rdf"), "file");
    expect(inspectBranchStore(root, "main")).toStrictEqual(noRdf);
    rmSync(path.join(s, "rdf"));
    mkdirSync(path.join(s, "rdf"));
    expect(inspectBranchStore(root, "main")).toStrictEqual(
      incomplete(
        "sync_metadata_missing",
        "The journaled store has no CURRENT generation pointer.",
      ),
    );
    const malformed = {
      state: "unreadable",
      path: s,
      errorCode: "branch_store_invalid_current",
      detail: "The journaled store CURRENT pointer is malformed.",
      recoveryRequired: true,
    };
    for (const current of [
      "xgeneration-a:1",
      "generation-a:1x",
      "generation-a:",
      "generation-:1",
      "generation-a b:1",
    ]) {
      write(path.join(s, "CURRENT"), current);
      expect(inspectBranchStore(root, "main")).toStrictEqual(malformed);
    }
    write(path.join(s, "CURRENT"), " generation-a1:12 \n");
    expect(inspectBranchStore(root, "main")).toStrictEqual(healthy(s));
  });

  test("an unreadable CURRENT is reported with the filesystem error", () => {
    const { root, store: s } = store();
    write(path.join(s, "storage.json"), "{}");
    mkdirSync(path.join(s, "rdf"));
    mkdirSync(path.join(s, "CURRENT"));
    const result = inspectBranchStore(root, "main");
    expect(result).toStrictEqual({
      state: "unreadable",
      path: s,
      errorCode: "branch_store_unreadable",
      detail: result.detail as string,
      recoveryRequired: true,
    });
    expect(result.detail).toContain("EISDIR");
  });

  test("a legacy kb.rdf store must hold RDF/XML", () => {
    const { root, store: s } = store();
    expect(inspectBranchStore(root, "main")).toStrictEqual({
      state: "missing",
      path: s,
      errorCode: "sync_metadata_missing",
      detail: "The branch KB has neither journal metadata nor legacy RDF.",
      recoveryRequired: false,
    });
    for (const text of ["<rdf:RDFx>", "<xml/>"]) {
      write(path.join(s, "kb.rdf"), text);
      expect(inspectBranchStore(root, "main")).toStrictEqual({
        state: "unreadable",
        path: s,
        errorCode: "branch_store_invalid_legacy_rdf",
        detail: "The legacy kb.rdf file is not RDF/XML.",
        recoveryRequired: true,
      });
    }
    for (const text of ["<rdf:RDF>", "<?xml?>\n<rdf:RDF\n xmlns:rdf='x'>"]) {
      write(path.join(s, "kb.rdf"), text);
      expect(inspectBranchStore(root, "main")).toStrictEqual(healthy(s));
    }
  });
});

describe("branchStoreReason", () => {
  test("a healthy store has no reason", () => {
    expect(
      branchStoreReason(healthy("/s") as BranchStoreInspection),
    ).toBeNull();
  });

  test("names recover when recovery is required, else ensure", () => {
    expect(
      branchStoreReason({
        state: "unreadable",
        path: "/s",
        errorCode: "code",
        detail: "detail",
        recoveryRequired: true,
      }),
    ).toStrictEqual({
      code: "code",
      path: "/s",
      entityIds: [],
      detail: "detail",
      remediation: {
        command_argv: ["kibi", "branch", "recover"],
        applyRequired: true,
      },
    });
    expect(
      branchStoreReason({
        state: "missing",
        path: "/s",
        recoveryRequired: false,
      }),
    ).toStrictEqual({
      code: "branch_store_missing",
      path: "/s",
      entityIds: [],
      detail: "Branch store requires attention.",
      remediation: {
        command_argv: ["kibi", "branch", "ensure"],
        applyRequired: false,
      },
    });
  });
});

describe("store lock reasons", () => {
  test("a dead journal holder is reported with the janitor remedy", () => {
    const s = fresh();
    expect(storeLockJournalReason(s)).toBeNull();
    write(
      path.join(s, ".kibi-lock-owner.json"),
      JSON.stringify({ pid: 2147483646, workspaceRoot: "/ws" }),
    );
    expect(storeLockJournalReason(s)).toStrictEqual({
      code: "store_lock_stale",
      path: path.join(s, ".kibi-lock-owner.json"),
      entityIds: [],
      detail:
        "Branch store lock journal records holder pid 2147483646 for /ws, which is no longer running.",
      remediation: {
        command_argv: ["kibi", "engine", "janitor", "--apply"],
        applyRequired: false,
      },
    });
    write(
      path.join(s, ".kibi-lock-owner.json"),
      JSON.stringify({ pid: 2147483646 }),
    );
    expect(storeLockJournalReason(s)?.detail).toBe(
      "Branch store lock journal records holder pid 2147483646 for unknown, which is no longer running.",
    );
    write(
      path.join(s, ".kibi-lock-owner.json"),
      JSON.stringify({ pid: process.pid }),
    );
    expect(storeLockJournalReason(s)).toBeNull();
  });

  test("a takeover is visible for a day after it happened", () => {
    const s = fresh();
    const at = new Date("2026-01-02T00:00:00.000Z");
    const day = 24 * 60 * 60 * 1000;
    expect(storeLockTakeoverReason(s, at)).toBeNull();
    write(
      path.join(s, ".kibi-lock-takeover.json"),
      JSON.stringify({ brokenPid: 42, reason: "", at: at.toISOString() }),
    );
    const record = path.join(s, ".kibi-lock-takeover.json");
    expect(storeLockTakeoverReason(s, at)).toStrictEqual({
      code: "store_lock_taken_over",
      path: record,
      entityIds: [],
      blocking: false,
      brokenPid: 42,
      reason: "",
      at: at.toISOString(),
      detail:
        "Kibi broke a stale branch-store lock at 2026-01-02T00:00:00.000Z (holder no longer running) and reattached. Nothing needs repair; a holder that died while it held the store usually means an engine or kibi prove run crashed or was killed.",
    });
    expect(
      storeLockTakeoverReason(s, new Date(at.getTime() + day)),
    ).not.toBeNull();
    expect(
      storeLockTakeoverReason(s, new Date(at.getTime() + day + 1)),
    ).toBeNull();
    expect(storeLockTakeoverReason(s, new Date(at.getTime() - 1))).toBeNull();
    expect(storeLockTakeoverReason(s)).toBeNull();
    write(
      record,
      JSON.stringify({
        brokenPid: 42,
        reason: "journal belongs to another workspace: /other",
        at: at.toISOString(),
      }),
    );
    expect(storeLockTakeoverReason(s, at)?.detail).toBe(
      "Kibi broke a stale branch-store lock at 2026-01-02T00:00:00.000Z (journal belongs to another workspace: /other) and reattached. Nothing needs repair; the lock files were copied with the .kb directory (for example by cp -a) while another workspace's engine held its own store.",
    );
    write(
      record,
      JSON.stringify({
        brokenPid: 42,
        reason: "dead: journal belongs to another workspace",
        at: at.toISOString(),
      }),
    );
    expect(storeLockTakeoverReason(s, at)?.detail).toContain(
      "a holder that died",
    );
  });
});

describe("authored sources and compilation", () => {
  test("counts entity Markdown, ADR Markdown and relationship YAML, nested too", () => {
    const root = fresh();
    expect(countAuthoredKbSources(root)).toBe(0);
    write(path.join(root, ".kb", "requirements", "a.md"));
    write(path.join(root, ".kb", "requirements", "deep", "b.md"));
    write(path.join(root, ".kb", "requirements", "c.yaml"));
    write(path.join(root, ".kb", "adrs", "d.md"));
    write(path.join(root, ".kb", "adrs", "d.txt"));
    write(path.join(root, ".kb", "relationships", "e.yaml"));
    write(path.join(root, ".kb", "relationships", "f.md"));
    write(path.join(root, ".kb", "other", "g.md"));
    symlinkSync(
      path.join(root, ".kb", "requirements", "a.md"),
      path.join(root, ".kb", "requirements", "link.md"),
    );
    expect(countAuthoredKbSources(root)).toBe(4);
  });

  const inspection = (
    state: BranchStoreInspection["state"],
    storePath: string,
  ): BranchStoreInspection => ({
    state,
    path: storePath,
    recoveryRequired: false,
  });

  test("a missing store holds no compilation", () => {
    const s = fresh();
    write(path.join(s, "CURRENT"), "generation-a:5");
    expect(branchStoreCompilation(inspection("missing", s))).toStrictEqual({
      compiled: false,
      generation: null,
    });
  });

  test("without CURRENT only a healthy (legacy) store is compiled", () => {
    const s = fresh();
    expect(branchStoreCompilation(inspection("healthy", s))).toStrictEqual({
      compiled: true,
      generation: null,
    });
    expect(branchStoreCompilation(inspection("unreadable", s))).toStrictEqual({
      compiled: false,
      generation: null,
    });
    mkdirSync(path.join(s, "CURRENT"));
    expect(branchStoreCompilation(inspection("incomplete", s))).toStrictEqual({
      compiled: false,
      generation: null,
    });
  });

  test("a positive sequence, or graph data in the journal, means compiled", () => {
    const s = fresh();
    const compiled = (current: string) => {
      write(path.join(s, "CURRENT"), current);
      return branchStoreCompilation(inspection("healthy", s));
    };
    expect(compiled("generation-a:10\n")).toStrictEqual({
      compiled: true,
      generation: "generation-a:10",
    });
    expect(compiled("x:0:7").compiled).toBe(true);
    expect(compiled("generation-a:0").compiled).toBe(false);
    expect(compiled("generation-a:Infinity").compiled).toBe(false);
    write(path.join(s, "rdf", "lock"));
    write(path.join(s, "rdf", ".kibi-lock-owner.json"));
    expect(compiled("generation-a:0").compiled).toBe(false);
    write(path.join(s, "rdf", "snapshot.trp"));
    expect(compiled("generation-a:0")).toStrictEqual({
      compiled: true,
      generation: "generation-a:0",
    });
  });
});

describe("uncompiledBranchStoreReason", () => {
  test("blocks a missing or empty store while .kb/ holds sources", () => {
    const root = fresh();
    write(path.join(root, ".kb", "requirements", "a.md"));
    const missing: BranchStoreInspection = {
      state: "missing",
      path: "/s",
      recoveryRequired: false,
    };
    const detail = (state: string) =>
      `The KB store for branch main ${state}, while .kb/ holds 1 authored source file(s). Kibi compiles one store per branch and never copies another branch's, so every query and check reads an empty KB until this branch is compiled.`;
    expect(uncompiledBranchStoreReason(root, missing, "main")).toStrictEqual({
      code: "branch_store_not_compiled",
      path: "/s",
      entityIds: [],
      detail: detail("does not exist yet"),
      remediation: { command_argv: ["kibi", "sync"], applyRequired: false },
      blocking: true,
      authoredSources: 1,
    });
    const s = fresh();
    write(path.join(s, "CURRENT"), "generation-a:0");
    expect(
      uncompiledBranchStoreReason(
        root,
        { state: "healthy", path: s, recoveryRequired: false },
        "main",
      ),
    ).toStrictEqual({
      code: "branch_store_not_compiled",
      path: s,
      entityIds: [],
      detail: detail("is empty (generation-a:0: nothing compiled)"),
      remediation: { command_argv: ["kibi", "sync"], applyRequired: false },
      blocking: true,
      authoredSources: 1,
      generation: "generation-a:0",
    });
  });

  test("an unreadable or incomplete store is never reported as uncompiled", () => {
    const root = fresh();
    write(path.join(root, ".kb", "requirements", "a.md"));
    const s = fresh();
    mkdirSync(path.join(s, "CURRENT"));
    expect(
      uncompiledBranchStoreReason(
        root,
        { state: "unreadable", path: s, recoveryRequired: true },
        "main",
      ),
    ).toBeNull();
    expect(
      uncompiledBranchStoreReason(
        root,
        { state: "incomplete", path: s, recoveryRequired: true },
        "main",
      ),
    ).toBeNull();
  });

  test("nothing to report for a compiled store or an empty .kb/", () => {
    const root = fresh();
    const s = fresh();
    write(path.join(s, "CURRENT"), "generation-a:0");
    const empty: BranchStoreInspection = {
      state: "healthy",
      path: s,
      recoveryRequired: false,
    };
    expect(uncompiledBranchStoreReason(root, empty, "main")).toBeNull();
    write(path.join(root, ".kb", "requirements", "a.md"));
    write(path.join(s, "CURRENT"), "generation-a:3");
    expect(uncompiledBranchStoreReason(root, empty, "main")).toBeNull();
  });
});
