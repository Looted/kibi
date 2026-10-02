import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import type { BootstrapContext } from "../../src/operations/bootstrap/types.js";
import { bootstrapPlanHash } from "../../src/operations/bootstrap/types.js";
import {
  nodeFilesystem,
  nodeGit,
} from "../../src/public/operations/node-ports.js";
import type { OperationContext } from "../../src/public/operations/runtime-types.js";
import { planBootstrapSpec } from "../../src/public/operations/specs/bootstrap.js";
import { writeRootManifest } from "./bootstrap-workspace-fixture";

// executable_for TEST-kibi-bootstrap-knowledge-sources

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

/** An attached repository whose own evidence is too thin to plan from. */
function thinRepository(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), "kibi-bootstrap-claims-"));
  roots.push(root);
  writeRootManifest(root);
  for (const lane of [
    "requirements",
    "scenarios",
    "tests",
    "adr",
    "flags",
    "events",
    "facts",
  ])
    mkdirSync(path.join(root, ".kb", lane), { recursive: true });
  writeFileSync(path.join(root, ".kb", "symbols.yaml"), "symbols: []\n");
  return root;
}

function context(root: string): OperationContext {
  return {
    workspaceRoot: root,
    signal: new AbortController().signal,
    clock: () => new Date("2026-10-02T00:00:00Z"),
    fs: nodeFilesystem,
    git: {
      ...nodeGit,
      workspaceSnapshot: async () => ({
        version: "kibi.workspace-snapshot.v2",
        hash: "b".repeat(64),
        dirty: false,
        fileCount: 1,
      }),
    },
    branchAttachment: {
      gitBranch: "main",
      kbBranch: "main",
      storePath: path.join(root, ".kb", "branches", "main"),
      kind: "exact",
      migrationRequired: false,
    },
  };
}

const interview: BootstrapContext = {
  projectSummary: "Billing service for a subscription product.",
  verificationAnchors: ["bun test"],
  knowledgeSources: [
    {
      id: "jira-billing",
      kind: "issue_tracker",
      title: "Jira BILL project",
      locator: "https://jira.example/projects/BILL",
      authority: "authoritative",
      connector: "atlassian",
    },
    {
      id: "old-wiki",
      kind: "wiki",
      title: "2019 billing wiki",
      locator: "https://wiki.example/billing",
      authority: "stale",
    },
  ],
  intentClaims: [
    {
      statement: "Refunds must not exceed the original charge.",
      sourceId: "jira-billing",
      reference: "BILL-142",
      excerpt: "Never refund more than was charged.",
    },
    {
      statement: "Customers like getting invoices on time.",
      sourceId: "jira-billing",
      reference: "BILL-7",
    },
    {
      statement: "Invoices must be emailed weekly.",
      sourceId: "old-wiki",
      reference: "https://wiki.example/billing#invoices",
    },
    {
      statement: "Dunning must retry three times.",
      sourceId: "confluence",
      reference: "PAY/Dunning",
    },
  ],
};

describe("bootstrap from declared knowledge sources", () => {
  test("turns a cited normative claim into a req candidate that keeps its citation", async () => {
    const result = await planBootstrapSpec.execute(
      { bootstrapContext: interview },
      context(thinRepository()),
    );
    const plan = result.structuredContent.plan;

    const cited = plan.candidates.find(
      (candidate) => candidate.title === interview.intentClaims?.[0]?.statement,
    );
    expect(cited).toMatchObject({
      entityType: "req",
      sourceKind: "intent_claim",
      sourcePath: "BILL-142",
    });
    expect(cited?.evidence).toEqual(
      expect.arrayContaining([
        "intent_claim:jira-billing:BILL-142",
        "knowledge_source:issue_tracker:https://jira.example/projects/BILL",
        "source_authority:authoritative",
        "connector:atlassian",
      ]),
    );
    const requirement = plan.actions.find(
      (action) => action.payload.type === "req",
    );
    expect(requirement?.payload.properties).toMatchObject({
      title: "Refunds must not exceed the original charge.",
      text_ref: "jira-billing:BILL-142",
    });
  });

  test("keeps unmodelable, stale, and uncited claims out of the write set and says why", async () => {
    const result = await planBootstrapSpec.execute(
      { bootstrapContext: interview },
      context(thinRepository()),
    );
    const plan = result.structuredContent.plan;
    const titles = plan.candidates.map((candidate) => candidate.title);

    // Prose the strict modeler cannot ground stays an authoring follow-up.
    expect(titles).not.toContain("Customers like getting invoices on time.");
    expect(result.structuredContent.promptBlock).toContain("BILL-7");
    // A stale source is cited in the plan but never produces knowledge.
    expect(titles).not.toContain("Invoices must be emailed weekly.");
    expect(plan.suppressedCandidates).toContainEqual(
      expect.objectContaining({
        reason: "stale_knowledge_source",
        sourceId: "old-wiki",
      }),
    );
    // A claim citing an undeclared source is reported, not trusted.
    expect(titles).not.toContain("Dunning must retry three times.");
    expect(plan.diagnostics).toContainEqual(
      expect.stringContaining('undeclared knowledge source "confluence"'),
    );
    expect(plan.activation.applyBlocked).toBe(false);
  });

  test("binds the declared sources and claims into the plan hash", async () => {
    const root = thinRepository();
    const first = await planBootstrapSpec.execute(
      { bootstrapContext: interview },
      context(root),
    );
    const edited = await planBootstrapSpec.execute(
      {
        bootstrapContext: {
          ...interview,
          intentClaims: interview.intentClaims?.map((claim, index) =>
            index === 0 ? { ...claim, reference: "BILL-143" } : claim,
          ),
        },
      },
      context(root),
    );
    const plan = first.structuredContent.plan;
    expect(plan.declaredContext.knowledgeSources?.map(({ id }) => id)).toEqual([
      "jira-billing",
      "old-wiki",
    ]);
    expect(plan.declaredContext.intentClaims).toHaveLength(4);
    expect(bootstrapPlanHash(plan)).toBe(plan.planHash);
    expect(edited.structuredContent.plan.planHash).not.toBe(plan.planHash);
  });

  test("asks where product intent lives when no knowledge sources were declared", async () => {
    const result = await planBootstrapSpec.execute(
      {},
      context(thinRepository()),
    );
    const plan = result.structuredContent.plan;
    expect(plan.status).toBe("needs_context");
    expect(plan.contextQuestions).toContainEqual(
      expect.stringContaining("knowledge sources outside the code"),
    );
    expect(plan.declaredContext).not.toHaveProperty("knowledgeSources");
  });
});
