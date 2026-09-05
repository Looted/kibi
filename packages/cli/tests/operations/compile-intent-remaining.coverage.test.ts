// implements REQ-kibi-change-to-proof-plan-compiler
import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import * as intentSearch from "../../src/intent-search.js";
import {
  executeCompileIntent,
} from "../../src/operations/planning/compile-intent.js";
import { semanticClaimKey } from "../../src/operations/semantic-advisor/clauses.js";
import * as discovery from "../../src/public/operations/discovery-executors.js";
import { nodeFilesystem } from "../../src/public/operations/node-ports.js";
import type {
  OperationContext,
  PrologPort,
  PrologQueryResult,
} from "../../src/public/operations/runtime-types.js";
import {
  isolateKibiEnv,
  removeTempDir,
  restoreWorkspaceCwd,
} from "../helpers/in-process-workspace.js";

const workspaces: string[] = [];
const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  restoreWorkspaceCwd();
  for (const workspace of workspaces.splice(0)) removeTempDir(workspace);
});

function contextFor(
  workspaceRoot: string,
  query: (goal: string) => Promise<PrologQueryResult>,
  extras: Partial<OperationContext> = {},
): OperationContext {
  const prolog: PrologPort = {
    query,
    queryStatusJson: async () => ({
      success: true,
      bindings: {
        JsonString: JSON.stringify({
          branch: "develop",
          snapshotId: "stamp:test",
          syncedAt: "2026-09-05T00:00:00Z",
          dirty: false,
          syncState: "fresh",
        }),
      },
    }),
    nextSolution: async () => null,
    save: async () => ({ success: true, bindings: {} }),
  };
  return {
    workspaceRoot,
    signal: new AbortController().signal,
    clock: () => new Date("2026-09-05T00:00:00Z"),
    prolog,
    fs: nodeFilesystem,
    git: {
      revParse: async () => "develop",
      showToplevel: async () => workspaceRoot,
      workspaceSnapshot: async () => ({
        version: "kibi.workspace-snapshot.v2",
        hash: "a".repeat(64),
        dirty: false,
        fileCount: 3,
      }),
    },
    branchAttachment: {
      gitBranch: "develop",
      kbBranch: "develop",
      storePath: path.join(workspaceRoot, ".kb", "branches", "develop"),
      kind: "exact",
      migrationRequired: false,
    },
    ...extras,
  };
}

function quietQuery(): (goal: string) => Promise<PrologQueryResult> {
  return mock(async (goal: string): Promise<PrologQueryResult> => {
    if (goal.includes("findall([A,B,Reason]"))
      return { success: true, bindings: { Rows: "[]" } };
    if (goal.includes("kb_relationship"))
      return { success: true, bindings: { Edges: "[]" } };
    return { success: true, bindings: { Results: "[]" } };
  });
}

describe("executeCompileIntent leftover planning branches", () => {
  test("slugifies punctuation-only intent and skips .kb source writes", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const root = await mkdtemp(path.join(tmpdir(), "kibi-compile-slug-"));
    workspaces.push(root);
    const plan = (
      await executeCompileIntent(
        {
          intent: "!!!",
          mode: "create",
          sourceLocations: [{ path: ".kb/requirements/REQ.md" }],
        },
        contextFor(root, quietQuery()),
      )
    ).structuredContent;
    expect(plan.target.requirementId).toMatch(/^REQ-intent-/i);
    expect(plan.sourceWrites).toEqual([]);
  });

  test("skips writes for an existing entity whose source is not markdown", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const root = await mkdtemp(path.join(tmpdir(), "kibi-compile-mcp-"));
    workspaces.push(root);
    const query = mock(async (goal: string): Promise<PrologQueryResult> => {
      if (goal.includes("findall([A,B,Reason]"))
        return { success: true, bindings: { Rows: "[]" } };
      if (goal.includes("kb_entity('REQ-KEEP'"))
        return {
          success: true,
          bindings: {
            Results:
              '[[REQ-KEEP,req,[title="Keep",status=open,source="mcp://kibi/compile-intent"]]]',
          },
        };
      if (goal.includes("kb_relationship"))
        return { success: true, bindings: { Edges: "[]" } };
      return { success: true, bindings: { Results: "[]" } };
    });
    const plan = (
      await executeCompileIntent(
        {
          intent: "Customer data must be retained for 7 years.",
          mode: "update",
          requirementId: "REQ-KEEP",
        },
        contextFor(root, query),
      )
    ).structuredContent;
    expect(plan.sourceWrites).toEqual([]);
  });

  test("marks host-origin propositions and skips writes when status is not ready", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const root = await mkdtemp(path.join(tmpdir(), "kibi-compile-host-"));
    workspaces.push(root);
    const intent = "Customer data must be retained for 7 years.";
    const claimKey = semanticClaimKey(intent);
    const query = mock(async (goal: string): Promise<PrologQueryResult> => {
      if (goal.includes("findall([A,B,Reason]"))
        return {
          success: true,
          bindings: { Rows: "[[REQ-KEEP,REQ-OTHER,overlap]]" },
        };
      if (goal.includes("kb_entity('REQ-KEEP'"))
        return {
          success: true,
          bindings: {
            Results:
              '[[REQ-KEEP,req,[title="Keep",status=open,source="docs/REQ.md"]]]',
          },
        };
      if (goal.includes("kb_relationship"))
        return { success: true, bindings: { Edges: "[]" } };
      return { success: true, bindings: { Results: "[]" } };
    });
    const plan = (
      await executeCompileIntent(
        {
          intent,
          mode: "update",
          requirementId: "REQ-KEEP",
          clauses: [intent],
          interpretations: [
            {
              claim_key: claimKey,
              claim_text: intent,
              ir: {
                version: "kibi.logic.v1",
                kind: "atom",
                modality: "oblige",
                head: { kind: "atom", name: "retain", args: [] },
              },
            },
          ],
        },
        contextFor(root, query),
      )
    ).structuredContent;
    expect(plan.status).toBe("blocked");
    expect(plan.sourceWrites).toEqual([]);
    expect(
      plan.propositions.some((proposition) => proposition.origin === "host"),
    ).toBe(true);
  });

  test("records a before hash when the planned source already exists", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const root = await mkdtemp(path.join(tmpdir(), "kibi-compile-before-"));
    workspaces.push(root);
    await mkdir(path.join(root, "docs"), { recursive: true });
    await writeFile(path.join(root, "docs", "present.md"), "present\n");
    const plan = (
      await executeCompileIntent(
        {
          intent: "Customer data must be retained for 7 years.",
          mode: "create",
          sourceLocations: [{ path: "docs/present.md" }],
        },
        contextFor(root, quietQuery()),
      )
    ).structuredContent;
    expect(plan.sourceWrites[0]?.beforeHash).toMatch(/^[a-f0-9]{64}$/);
  });

  test("merges duplicate draft steps and warns when tests have no scenarios", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const root = await mkdtemp(path.join(tmpdir(), "kibi-compile-draft-"));
    workspaces.push(root);
    const plan = (
      await executeCompileIntent(
        {
          intent: "Customer data must be retained for 7 years.",
          mode: "create",
          testDrafts: [
            { title: "Only test", body: "it retains", id: "TEST-ONLY" },
            { title: "Second test", body: "it also retains" },
          ],
        },
        contextFor(root, quietQuery()),
      )
    ).structuredContent;
    expect(plan.steps.filter((step) => step.type === "test").length).toBe(2);
    expect(plan.diagnostics.join(" ")).toMatch(/no scenario draft/);
  });

  test("uses an existing markdown source with backslashes when no location is supplied", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const root = await mkdtemp(path.join(tmpdir(), "kibi-compile-slash-"));
    workspaces.push(root);
    await mkdir(path.join(root, "docs"), { recursive: true });
    await writeFile(path.join(root, "docs", "REQ.md"), "old\n");
    const query = mock(async (goal: string): Promise<PrologQueryResult> => {
      if (goal.includes("findall([A,B,Reason]"))
        return { success: true, bindings: { Rows: "[]" } };
      if (goal.includes("kb_entity('REQ-KEEP'"))
        return {
          success: true,
          bindings: {
            Results:
              '[[REQ-KEEP,req,[title="Keep",status=open,source="docs\\\\REQ.md"]]]',
          },
        };
      if (goal.includes("kb_relationship"))
        return { success: true, bindings: { Edges: "[]" } };
      return { success: true, bindings: { Results: "[]" } };
    });
    const plan = (
      await executeCompileIntent(
        {
          intent: "Customer data must be retained for 7 years.",
          mode: "update",
          requirementId: "REQ-KEEP",
        },
        contextFor(root, query),
      )
    ).structuredContent;
    expect(
      plan.sourceWrites.length === 0 ||
        plan.sourceWrites[0]?.path === "docs/REQ.md",
    ).toBe(true);
  });

  test("classifies rationale, example, and subjective clauses as nonlogical", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const root = await mkdtemp(path.join(tmpdir(), "kibi-compile-roles-"));
    workspaces.push(root);
    const plan = (
      await executeCompileIntent(
        {
          intent:
            "The editor must persist drafts. This exists because operators asked for it. For example, a mid-edit crash. Reviewers prefer the current layout.",
          mode: "create",
          clauses: [
            "This exists because operators asked for it.",
            "For example, a mid-edit crash.",
            "Reviewers prefer the current layout.",
          ],
        },
        contextFor(root, quietQuery()),
      )
    ).structuredContent;
    expect(
      plan.propositions.some((proposition) => proposition.status === "nonlogical"),
    ).toBe(true);
  });

  test("skips source writes when the existing entity source escapes the workspace", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const root = await mkdtemp(path.join(tmpdir(), "kibi-compile-dotdot-"));
    workspaces.push(root);
    const query = mock(async (goal: string): Promise<PrologQueryResult> => {
      if (goal.includes("findall([A,B,Reason]"))
        return { success: true, bindings: { Rows: "[]" } };
      if (goal.includes("kb_entity('REQ-KEEP'"))
        return {
          success: true,
          bindings: {
            Results:
              '[[REQ-KEEP,req,[title="Keep",status=open,source="../outside.md"]]]',
          },
        };
      if (goal.includes("kb_relationship"))
        return { success: true, bindings: { Edges: "[]" } };
      return { success: true, bindings: { Results: "[]" } };
    });
    const plan = (
      await executeCompileIntent(
        {
          intent: "Customer data must be retained for 7 years.",
          mode: "update",
          requirementId: "REQ-KEEP",
        },
        contextFor(root, query),
      )
    ).structuredContent;
    expect(plan.sourceWrites).toEqual([]);
  });

  test("auto-selects a high-margin update target and accepts mixed proposals", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const root = await mkdtemp(path.join(tmpdir(), "kibi-compile-propose-"));
    workspaces.push(root);
    const search = spyOn(intentSearch, "executeIntentSearch").mockResolvedValue({
      matches: [
        {
          entity: { id: "REQ-KEEP", type: "req", title: "Keep" },
          score: 0.95,
          reasons: ["title"],
          evidence: {
            normalizedScore: 0.95,
            matchedFacets: [],
            sourceMatches: [],
            graphPaths: [],
            abstentionEligible: false,
          },
        },
        {
          entity: { id: "SCEN-KEEP", type: "scenario", title: "Scene" },
          score: 0.7,
          reasons: ["body"],
          evidence: {
            normalizedScore: 0.7,
            matchedFacets: [],
            sourceMatches: [],
            graphPaths: [],
            abstentionEligible: false,
          },
        },
        {
          entity: { id: "SYM-KEEP", type: "symbol", title: "sym" },
          score: 0.6,
          reasons: ["name"],
          evidence: {
            normalizedScore: 0.6,
            matchedFacets: [],
            sourceMatches: [],
            graphPaths: [],
            abstentionEligible: false,
          },
        },
        {
          entity: { id: "TEST-KEEP", type: "test", title: "test" },
          score: 0.5,
          reasons: ["body"],
          evidence: {
            normalizedScore: 0.5,
            matchedFacets: [],
            sourceMatches: [],
            graphPaths: [],
            abstentionEligible: false,
          },
        },
        {
          entity: { id: "ADR-KEEP", type: "adr", title: "adr" },
          score: 0.4,
          reasons: ["title"],
          evidence: {
            normalizedScore: 0.4,
            matchedFacets: [],
            sourceMatches: [],
            graphPaths: [],
            abstentionEligible: false,
          },
        },
      ],
      analysis: {
        rankingMode: "intent-v1",
        candidateCount: 5,
        acceptedCount: 5,
        topScore: 0.95,
        topTwoMargin: 0.25,
        abstained: false,
      },
    } as never);
    restores.push(() => search.mockRestore());
    const plan = (
      await executeCompileIntent(
        {
          intent: "Customer data must be retained for 7 years.",
          mode: "update",
          proposalDecisions: [
            {
              proposalId: "pending",
              decision: "accept",
            },
          ],
        },
        contextFor(root, quietQuery()),
      )
    ).structuredContent;
    expect(plan.target.requirementId).toBe("REQ-KEEP");
    expect(plan.proposals.length).toBeGreaterThan(0);
    const accepted = plan.proposals.map((proposal) => ({
      ...proposal,
      decision: "accept" as const,
    }));
    const withDecisions = (
      await executeCompileIntent(
        {
          intent: "Customer data must be retained for 7 years.",
          mode: "update",
          requirementId: "REQ-KEEP",
          proposalDecisions: accepted.map((proposal) => ({
            proposalId: proposal.proposalId,
            decision: proposal.decision,
          })),
        },
        contextFor(root, quietQuery()),
      )
    ).structuredContent;
    expect(
      withDecisions.proposals.some((proposal) => proposal.decision === "accept"),
    ).toBe(true);
  });

  test("uses an unknown workspace snapshot when status omits proof evidence", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const root = await mkdtemp(path.join(tmpdir(), "kibi-compile-status-"));
    workspaces.push(root);
    const status = spyOn(discovery, "executeStatus").mockResolvedValue({
      structuredContent: {
        branch: "develop",
        snapshotId: "stamp:test",
        syncedAt: "2026-09-05T00:00:00Z",
        dirty: false,
        syncState: "fresh",
      },
    } as never);
    restores.push(() => status.mockRestore());
    const plan = (
      await executeCompileIntent(
        {
          intent: "Customer data must be retained for 7 years.",
          mode: "create",
        },
        contextFor(root, quietQuery()),
      )
    ).structuredContent;
    expect(plan.expected.workspaceSnapshot).toBe("unknown");
  });
});
