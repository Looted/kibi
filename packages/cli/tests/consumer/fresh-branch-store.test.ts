import { afterEach, describe, expect, test } from "bun:test";
import {
  type ConsumerWorkspace,
  type Json,
  createConsumerWorkspace,
  doc,
} from "./workspace.js";

/**
 * Kibi compiles one store per branch and never copies another branch's. A
 * branch created without the post-checkout hook therefore starts with no
 * store, and the first engine attach creates an empty one. Before the fix
 * kb_status only said `branch_store_missing` (fixed by `kibi branch ensure`,
 * which creates an empty manifest), kb_check reported one
 * source-relationship-parity violation per authored relationship, and the
 * migration plan had no step that compiles the store.
 *
 * Store-backed operations now compile such a store on first use; the
 * reporting below is what an opted-out checkout (KIBI_AUTO_SYNC=0) sees.
 */

const NO_AUTO_SYNC = { ...process.env, KIBI_AUTO_SYNC: "0" };

let workspace: ConsumerWorkspace | undefined;

afterEach(() => {
  workspace?.cleanup();
  workspace = undefined;
});

type StaleReason = {
  code: string;
  detail: string;
  remediation: { command_argv: string[] };
};
type PlanAction = {
  id: string;
  code: string;
  dependsOn: string[];
  invocation: { kind: string; command_argv?: string[] };
};
type MigrationPlan = Json & { planHash: string; actions: PlanAction[] };
type StatusData = {
  syncState: string;
  staleReasons: StaleReason[];
  migrationPlan: MigrationPlan;
};

function status(ws: ConsumerWorkspace): StatusData {
  return (ws.json(["status"], {}) as { data: StatusData }).data;
}

function checkResult(ws: ConsumerWorkspace): Array<{
  rule: string;
  description: string;
  suggestion: string;
}> {
  const result = ws.json(
    ["check", "--format", "json"],
    undefined,
    NO_AUTO_SYNC,
  );
  return (result.structuredContent as Json).violations as Array<{
    rule: string;
    description: string;
    suggestion: string;
  }>;
}

function authorLinkedRequirement(ws: ConsumerWorkspace): void {
  ws.write(
    ".kb/scenarios/SCEN-demo-login.md",
    doc(
      "id: SCEN-demo-login\ntitle: User logs in\nstatus: active",
      "## Context\n\nA user signs in with a password.\n",
    ),
  );
  ws.write(
    ".kb/requirements/REQ-demo-login.md",
    doc(
      "id: REQ-demo-login\ntitle: Users can log in\nstatus: open\nlinks:\n  - type: specified_by\n    target: SCEN-demo-login",
      "## Context\n\nUsers must be able to log in.\n",
    ),
  );
}

describe("a new branch whose store was never compiled", () => {
  test("status, check and the migration plan name kibi sync, and applying the plan compiles the store", () => {
    const ws = createConsumerWorkspace("kibi-fresh-branch-store-");
    workspace = ws;
    authorLinkedRequirement(ws);
    ws.sync();
    ws.git("commit", "-qm", "kb");
    // No hooks run (core.hooksPath=/dev/null): nothing compiles the branch.
    ws.git("checkout", "-q", "-b", "feature/login");

    const before = status(ws);
    const reason = before.staleReasons.find(
      (row) => row.code === "branch_store_not_compiled",
    );
    expect(reason?.detail).toContain(
      "The KB store for branch feature/login does not exist yet, while .kb/ holds 2 authored source file(s).",
    );
    expect(reason?.remediation.command_argv).toEqual(["kibi", "sync"]);
    // A missing store beside authored sources is stale, not unknown.
    expect(before.syncState).toBe("stale");
    expect(before.staleReasons.map((row) => row.code)).not.toContain(
      "branch_store_missing",
    );
    const compile = before.migrationPlan.actions.find(
      (action) => action.id === "branch-store-compile",
    );
    expect(compile).toMatchObject({
      code: "branch_store_not_compiled",
      dependsOn: ["branch-store-ensure"],
      invocation: { kind: "cli", command_argv: ["kibi", "sync"] },
    });

    // kb_check attaches an engine (which creates an empty store) and reports
    // one blocking finding instead of a parity violation per relationship.
    const violations = checkResult(ws);
    expect(violations.map((violation) => violation.rule)).toEqual([
      "branch-store-not-compiled",
    ]);
    expect(violations[0]?.description).toContain(
      "is empty (generation-1:0: nothing compiled)",
    );
    expect(violations[0]?.suggestion).toContain("Run kibi sync");

    const empty = status(ws);
    expect(empty.syncState).toBe("stale");
    const plan = empty.migrationPlan;
    const actionIds = plan.actions
      .filter((action) => action.id.startsWith("branch-store-"))
      .map((action) => action.id);
    expect(actionIds).toEqual(["branch-store-compile"]);

    const applied = ws.json(["apply-plan"], {
      plan,
      approvedPlanHash: plan.planHash,
      approvedActionIds: actionIds,
    }) as { status: string; data: { outcome: string } };
    expect(applied.data.outcome).toBe("applied");

    expect(checkResult(ws).map((violation) => violation.rule)).not.toContain(
      "branch-store-not-compiled",
    );
    expect(status(ws).staleReasons.map((row) => row.code)).not.toContain(
      "branch_store_not_compiled",
    );
  }, 240_000);

  test("search and query say the store is not compiled instead of answering empty", () => {
    const ws = createConsumerWorkspace("kibi-fresh-branch-search-");
    workspace = ws;
    authorLinkedRequirement(ws);
    ws.sync();
    ws.git("commit", "-qm", "kb");
    ws.git("checkout", "-q", "-b", "feature/login");

    type Envelope = {
      status: string;
      data: { count: number; branchStore?: { code: string } };
      diagnostics: Array<{ code?: string; severity?: string; message: string }>;
    };
    for (const [route, input] of [
      ["search", { query: "users log in" }],
      ["query", { id: "REQ-demo-login" }],
    ] as const) {
      const result = ws.json([route], input, NO_AUTO_SYNC) as Envelope;
      expect(result.data.count).toBe(0);
      expect(result.data.branchStore?.code).toBe("branch_store_not_compiled");
      expect(result.diagnostics).toContainEqual(
        expect.objectContaining({
          code: "branch_store_not_compiled",
          severity: "warning",
        }),
      );
      expect(result.diagnostics[0]?.message).toContain("run `kibi sync`");
    }

    ws.sync();
    const query = ws.json(["query"], { id: "REQ-demo-login" }) as Envelope;
    expect(query.data.count).toBe(1);
    expect(query.diagnostics).toEqual([]);
  }, 240_000);

  test("a store-backed operation compiles the store on first use without touching tracked files", () => {
    const ws = createConsumerWorkspace("kibi-fresh-branch-auto-");
    workspace = ws;
    authorLinkedRequirement(ws);
    ws.sync();
    ws.git("add", "-A");
    ws.git("commit", "-qm", "kb");
    ws.git("checkout", "-q", "-b", "feature/login");
    const symbolsBefore = ws.read(".kb/symbols.yaml");

    type Envelope = {
      data: { count: number; branchStore?: { code: string } };
      diagnostics: Array<{ code?: string }>;
    };
    const query = ws.json(["query"], { id: "REQ-demo-login" }) as Envelope;
    expect(query.data.count).toBe(1);
    expect(query.data.branchStore).toBeUndefined();
    expect(ws.read(".kb/symbols.yaml")).toBe(symbolsBefore);
    expect(ws.git("status", "--porcelain", "--untracked-files=no")).toBe("");
    expect(checkResult(ws).map((violation) => violation.rule)).not.toContain(
      "branch-store-not-compiled",
    );
  }, 240_000);

  test("a checkout that recorded autoSync false keeps the not-compiled answer", () => {
    const ws = createConsumerWorkspace("kibi-fresh-branch-optout-");
    workspace = ws;
    authorLinkedRequirement(ws);
    ws.write(".kb/setup.json", `${JSON.stringify({ autoSync: false })}\n`);
    ws.sync();
    ws.git("add", "-A");
    ws.git("commit", "-qm", "kb");
    ws.git("checkout", "-q", "-b", "feature/login");

    const search = ws.json(["search"], { query: "users log in" }) as {
      data: { count: number; branchStore?: { code: string } };
    };
    expect(search.data.count).toBe(0);
    expect(search.data.branchStore?.code).toBe("branch_store_not_compiled");
  }, 240_000);
});

describe("stale branch store auto-sync and staleness surfacing", () => {
  test("auto-syncs stale tracked Markdown, relationship shards, and symbols manifest without touching tracked files", () => {
    const ws = createConsumerWorkspace("kibi-stale-autosync-");
    workspace = ws;
    authorLinkedRequirement(ws);
    ws.write("src/login.ts", "export function loginUser() { return true; }\n");
    ws.write(
      ".kb/symbols.yaml",
      [
        "symbols:",
        "  - id: SYM-demo-login",
        "    title: loginUser",
        "    sourceFile: src/login.ts",
        "    implements:",
        "      - REQ-demo-login",
        "",
      ].join("\n"),
    );
    ws.write(
      ".kb/relationships/extra.yaml",
      [
        "relationships:",
        "  - id: REL-demo-1",
        "    type: validates",
        "    from: SCEN-demo-login",
        "    to: REQ-demo-login",
        "    created_at: 2026-01-01T00:00:00Z",
        "    created_by: test",
        "    source: manual",
        "",
      ].join("\n"),
    );
    ws.git("add", "-A");
    ws.sync();
    ws.git("add", "-A");
    ws.git("commit", "-qm", "initial synced kb");

    // Edit tracked .kb Markdown, relationship shard, and symbols manifest directly.
    ws.write(
      ".kb/requirements/REQ-demo-mfa.md",
      doc(
        "id: REQ-demo-mfa\ntitle: Users verify MFA token\nstatus: open",
        "## Context\n\nUsers must verify an MFA token.\n",
      ),
    );
    ws.write(
      ".kb/relationships/extra.yaml",
      [
        "relationships:",
        "  - id: REL-demo-1",
        "    type: validates",
        "    from: SCEN-demo-login",
        "    to: REQ-demo-login",
        "    created_at: 2026-01-01T00:00:00Z",
        "    created_by: test",
        "    source: manual",
        "  - id: REL-demo-2",
        "    type: depends_on",
        "    from: REQ-demo-mfa",
        "    to: REQ-demo-login",
        "    created_at: 2026-01-01T00:00:00Z",
        "    created_by: test",
        "    source: manual",
        "",
      ].join("\n"),
    );
    ws.write("src/mfa.ts", "export function verifyMfa() { return true; }\n");
    ws.write(
      ".kb/symbols.yaml",
      [
        "symbols:",
        "  - id: SYM-demo-login",
        "    title: loginUser",
        "    sourceFile: src/login.ts",
        "    implements:",
        "      - REQ-demo-login",
        "  - id: SYM-demo-mfa",
        "    title: verifyMfa",
        "    sourceFile: src/mfa.ts",
        "    implements:",
        "      - REQ-demo-mfa",
        "",
      ].join("\n"),
    );
    ws.git(
      "add",
      ".kb/requirements/REQ-demo-mfa.md",
      ".kb/relationships/extra.yaml",
      ".kb/symbols.yaml",
      "src/mfa.ts",
    );
    const symbolsEdited = ws.read(".kb/symbols.yaml");

    const query = ws.json(["query"], { id: "REQ-demo-mfa" }) as {
      data: { count: number; meta?: Json };
      diagnostics: Array<{ code?: string }>;
    };
    expect(query.data.count).toBe(1);
    expect(query.data.meta).toBeUndefined();
    expect(query.diagnostics).toEqual([]);
    expect(ws.read(".kb/symbols.yaml")).toBe(symbolsEdited);
    expect(status(ws).syncState).toBe("fresh");
  }, 240_000);

  test("with KIBI_AUTO_SYNC=0, kb_query and kb_search surface staleness on non-empty and empty results and respect code-overlap filtering", () => {
    const ws = createConsumerWorkspace("kibi-stale-surface-");
    workspace = ws;
    authorLinkedRequirement(ws);
    ws.write("src/login.ts", "export function loginUser() { return true; }\n");
    ws.write(
      ".kb/symbols.yaml",
      [
        "symbols:",
        "  - id: SYM-demo-login",
        "    title: loginUser",
        "    sourceFile: src/login.ts",
        "    implements:",
        "      - REQ-demo-login",
        "",
      ].join("\n"),
    );
    ws.git("add", "-A");
    ws.sync();
    ws.git("add", "-A");
    ws.git("commit", "-qm", "synced");

    // 1. Bare production code edit alone: never auto-syncs, suppressed on unrelated query, surfaced on matching sourceFile/sourceLocations.
    ws.write("src/login.ts", "export function loginUser() { return false; }\n");
    const unrelatedQuery = ws.json(["query"], { id: "REQ-demo-login" }) as {
      data: { count: number; meta?: Json; branchStore?: Json };
      diagnostics: Array<{ code?: string }>;
    };
    expect(unrelatedQuery.data.count).toBe(1);
    expect(unrelatedQuery.data.meta).toBeUndefined();
    expect(unrelatedQuery.data.branchStore).toBeUndefined();
    expect(unrelatedQuery.diagnostics).toEqual([]);

    const overlappingQuery = ws.json(["query"], {
      sourceFile: "src/login.ts",
    }) as {
      data: {
        count: number;
        meta?: { syncState: string; staleReasonCount: number };
      };
      diagnostics: Array<{ code?: string; severity?: string }>;
    };
    expect(overlappingQuery.data.count).toBe(1);
    expect(overlappingQuery.data.meta?.syncState).toBe("stale");
    expect(overlappingQuery.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "branch_store_stale",
        severity: "warning",
      }),
    );

    const overlappingSearch = ws.json(["search"], {
      query: "login",
      sourceLocations: [{ path: "src/login.ts" }],
    }) as {
      data: {
        meta?: { syncState: string };
        answer?: {
          scope?: { syncState?: string; staleReasonCount?: number };
          note?: string;
        };
      };
      diagnostics: Array<{ code?: string }>;
    };
    expect(overlappingSearch.data.meta?.syncState).toBe("stale");
    expect(overlappingSearch.data.answer?.scope?.syncState).toBe("stale");
    expect(overlappingSearch.data.answer?.note).toContain("KB store is stale");
    expect(overlappingSearch.diagnostics).toContainEqual(
      expect.objectContaining({ code: "branch_store_stale" }),
    );

    // 2. Stale tracked .kb/ Markdown file with KIBI_AUTO_SYNC=0 surfaces on both count > 0 and count === 0.
    ws.write(
      ".kb/requirements/REQ-demo-new.md",
      doc(
        "id: REQ-demo-new\ntitle: New unsynced requirement\nstatus: open",
        "## Context\n\nPending sync.\n",
      ),
    );
    ws.git("add", ".kb/requirements/REQ-demo-new.md");

    for (const input of [
      { id: "REQ-demo-login" },
      { id: "REQ-demo-new" },
    ] as const) {
      const q = ws.json(["query"], input, NO_AUTO_SYNC) as {
        data: {
          count: number;
          branchStore?: Json;
          meta?: { syncState: string; staleReasonCount: number };
        };
        diagnostics: Array<{ code?: string; severity?: string }>;
      };
      expect(q.data.count).toBe(input.id === "REQ-demo-login" ? 1 : 0);
      expect(q.data.branchStore).toBeUndefined();
      expect(q.data.meta?.syncState).toBe("stale");
      expect(q.data.meta?.staleReasonCount).toBeGreaterThanOrEqual(1);
      expect(q.diagnostics).toContainEqual(
        expect.objectContaining({
          code: "branch_store_stale",
          severity: "warning",
        }),
      );
    }

    const s = ws.json(["search"], { query: "login" }, NO_AUTO_SYNC) as {
      data: {
        meta?: { syncState: string };
        branchStore?: Json;
        answer?: {
          scope?: { syncState?: string; staleReasonCount?: number };
          note?: string;
        };
      };
      diagnostics: Array<{ code?: string }>;
    };
    expect(s.data.branchStore).toBeUndefined();
    expect(s.data.meta?.syncState).toBe("stale");
    expect(s.data.answer?.scope?.syncState).toBe("stale");
    expect(s.data.answer?.note).toContain("KB store is stale");
    expect(s.diagnostics).toContainEqual(
      expect.objectContaining({ code: "branch_store_stale" }),
    );
  }, 240_000);
});
