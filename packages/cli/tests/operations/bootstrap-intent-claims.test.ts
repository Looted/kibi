import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { prepareOperationInput } from "../../src/cli-validate.js";
import { buildIntentClaimCandidates } from "../../src/operations/bootstrap/intent-claims.js";
import { normalizeBootstrapContext } from "../../src/operations/bootstrap/presentation.js";
import type {
  BootstrapContext,
  Candidate,
} from "../../src/operations/bootstrap/types.js";
import { bootstrapPlanHash } from "../../src/operations/bootstrap/types.js";
import type { UpsertInput } from "../../src/operations/mutation/types.js";
import { validateUpsertInput } from "../../src/operations/mutation/validation.js";
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
      excerpt:
        "The source states this verbatim so the entity can keep the passage.",
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

    for (const action of plan.actions)
      expect(() =>
        validateUpsertInput(action.payload as UpsertInput, new Date()),
      ).not.toThrow();

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

  test("persists the statement, excerpt, source title and reference in the entity body", async () => {
    const result = await planBootstrapSpec.execute(
      { bootstrapContext: interview },
      context(thinRepository()),
    );
    const requirement = result.structuredContent.plan.actions.find(
      (action) => action.payload.type === "req",
    );
    const document = requirement?.payload.document as
      | { body?: string }
      | undefined;
    expect(document?.body).toBe(
      "Refunds must not exceed the original charge.\n\n## Source\n\n> Never refund more than was charged.\n\nSource: Jira BILL project - BILL-142\n",
    );
  });

  test("a claim whose source text states no reason is not tagged as acknowledged legacy", () => {
    const source = interview.knowledgeSources?.[0];
    if (!source) throw new Error("fixture source missing");
    const result = buildIntentClaimCandidates(
      normalizeBootstrapContext({
        knowledgeSources: [source],
        intentClaims: [
          {
            statement: "Refunds must not exceed the original charge.",
            sourceId: "jira-billing",
            reference: "BILL-1",
            excerpt: "Cap refunds.",
          },
        ],
      }),
      new Set(),
      0.8,
    );
    const requirement = result.candidates[0]?.applyPlan.find(
      (step) => step.type === "req",
    );
    expect(
      (requirement?.properties as { tags?: string[] }).tags ?? [],
    ).not.toContain("review:context-missing");
  });

  test("a source passage with real context leaves the entity untagged", () => {
    const source = interview.knowledgeSources?.[0];
    if (!source) throw new Error("fixture source missing");
    const result = buildIntentClaimCandidates(
      normalizeBootstrapContext({
        knowledgeSources: [source],
        intentClaims: [
          {
            statement: "Refunds must not exceed the original charge.",
            sourceId: "jira-billing",
            reference: "BILL-142",
            excerpt:
              "Finance found refunds above the charge during the March audit, so the payment service must never refund more than the customer was originally charged.",
          },
        ],
      }),
      new Set(),
      0.8,
    );
    const requirement = result.candidates[0]?.applyPlan.find(
      (step) => step.type === "req",
    );
    expect((requirement?.properties as { tags?: string[] }).tags).not.toContain(
      "review:context-missing",
    );
  });

  test("an intent or observation claim without an excerpt is suppressed and explained; an open question may omit it", () => {
    const source = interview.knowledgeSources?.[0];
    if (!source) throw new Error("fixture source missing");
    const result = buildIntentClaimCandidates(
      normalizeBootstrapContext({
        knowledgeSources: [source],
        intentClaims: [
          {
            statement: "Refunds must not exceed the original charge.",
            sourceId: "jira-billing",
            reference: "BILL-1",
          },
          {
            statement: "Exports are signed today.",
            sourceId: "jira-billing",
            reference: "BILL-2",
            kind: "observation",
          },
          {
            statement: "Should refunds include tax?",
            sourceId: "jira-billing",
            reference: "BILL-3",
            kind: "open_question",
          },
        ],
      }),
      new Set(),
      0.8,
    );
    expect(result.suppressed.map((row) => row.reason)).toEqual([
      "missing_excerpt",
      "missing_excerpt",
    ]);
    expect(result.diagnostics.join("\n")).toContain("BILL-1");
    expect(result.diagnostics.join("\n")).toContain("without an excerpt");
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.title).toBe("Should refunds include tax?");
  });

  test("the plan schema requires an excerpt unless the claim is an open question", () => {
    const valid = (items: unknown[]) =>
      prepareOperationInput(
        { bootstrapContext: { intentClaims: items } },
        planBootstrapSpec.businessInputSchema,
      ).valid;
    const base = { statement: "S must hold.", sourceId: "a", reference: "r" };
    expect(valid([base])).toBe(false);
    expect(valid([{ ...base, kind: "observation" }])).toBe(false);
    expect(valid([{ ...base, excerpt: "quoted" }])).toBe(true);
    expect(valid([{ ...base, kind: "open_question" }])).toBe(true);
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

describe("claim kinds and declared conflicts", () => {
  const source = interview.knowledgeSources?.[0];
  const kinds: BootstrapContext = {
    ...interview,
    knowledgeSources: source ? [source] : [],
    intentClaims: [
      {
        statement: "Refunds must not exceed the original charge.",
        excerpt:
          "The source states this verbatim so the entity can keep the passage.",
        sourceId: "jira-billing",
        reference: "BILL-142",
      },
      {
        statement: "Exports must be signed.",
        sourceId: "jira-billing",
        reference: "BILL-9",
        kind: "observation",
        excerpt: "Today every export is signed by the batch job.",
      },
      {
        statement: "Refunds must include tax.",
        sourceId: "jira-billing",
        reference: "BILL-10",
        kind: "open_question",
      },
    ],
    conflicts: [
      {
        claimReferences: [
          { sourceId: "jira-billing", reference: "BILL-142" },
          { sourceId: "jira-billing", reference: "BILL-10" },
        ],
        note: "BILL-10 asks for tax on refunds that BILL-142 caps at the charge.",
      },
      {
        claimReferences: [
          { sourceId: "jira-billing", reference: "BILL-142" },
          { sourceId: "jira-billing", reference: "BILL-999" },
        ],
        note: "Cites a claim that was never declared.",
      },
    ],
  };

  test("observations and open questions become cited observation facts, never requirements", async () => {
    const plan = (
      await planBootstrapSpec.execute(
        { bootstrapContext: kinds },
        context(thinRepository()),
      )
    ).structuredContent.plan;
    for (const action of plan.actions)
      expect(() =>
        validateUpsertInput(action.payload as UpsertInput, new Date()),
      ).not.toThrow();
    const reqTitles = plan.actions
      .filter((action) => action.payload.type === "req")
      .map((action) => (action.payload.properties as { title: string }).title);
    expect(reqTitles).toEqual(["Refunds must not exceed the original charge."]);

    const fact = (title: string) =>
      plan.actions.find(
        (action) =>
          action.payload.type === "fact" &&
          (action.payload.properties as { title: string }).title === title,
      )?.payload.properties as Record<string, unknown> | undefined;
    expect(fact("Exports must be signed.")).toMatchObject({
      fact_kind: "observation",
      text_ref: "jira-billing:BILL-9",
      tags: expect.arrayContaining(["claim:observation"]),
    });
    expect(fact("Refunds must include tax.")).toMatchObject({
      fact_kind: "observation",
      text_ref: "jira-billing:BILL-10",
      tags: expect.arrayContaining(["review:open-question"]),
    });
    const observation = plan.candidates.find(
      (candidate) => candidate.title === "Exports must be signed.",
    );
    expect(observation?.evidence).toEqual(
      expect.arrayContaining([
        "intent_claim:jira-billing:BILL-9",
        "source_authority:authoritative",
        "claim_kind:observation",
        "excerpt:Today every export is signed by the batch job.",
      ]),
    );
    // Every kind counts as planned for its source.
    expect(plan.diagnostics).toContainEqual(
      expect.stringContaining(
        "Knowledge source jira-billing (authoritative): 3 declared claim(s), 3 planned",
      ),
    );
  });

  test("a declared conflict becomes a review:conflict fact citing every claim, and is hash-bound", async () => {
    const root = thinRepository();
    const plan = (
      await planBootstrapSpec.execute(
        { bootstrapContext: kinds },
        context(root),
      )
    ).structuredContent.plan;
    // Checked first: Bun's toMatchObject can rewrite matched values in place.
    expect(bootstrapPlanHash(plan)).toBe(plan.planHash);
    const conflicts = (plan.candidates as readonly Candidate[]).filter(
      (candidate) => candidate.candidateId.startsWith("conflict:"),
    );
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]?.evidence).toEqual(
      expect.arrayContaining([
        "intent_claim:jira-billing:BILL-142",
        "intent_claim:jira-billing:BILL-10",
      ]),
    );
    expect(conflicts[0]?.applyPlan[0]?.properties).toMatchObject({
      fact_kind: "observation",
      text_ref: "jira-billing:BILL-142; jira-billing:BILL-10",
      tags: expect.arrayContaining(["review:conflict"]),
      title:
        "Conflict between jira-billing:BILL-142 and jira-billing:BILL-10: BILL-10 asks for tax on refunds that BILL-142 caps at the charge.",
    });
    // A conflict citing an undeclared claim is reported, not written.
    expect(plan.diagnostics).toContainEqual(
      expect.stringContaining(
        "cites claim(s) not declared in intentClaims: jira-billing:BILL-999",
      ),
    );
    expect(plan.declaredContext.conflicts).toHaveLength(2);
    // The default kind stays implicit, so plans without kinds keep their hash.
    expect(plan.declaredContext.intentClaims?.[0]).not.toHaveProperty("kind");
    expect(plan.declaredContext.intentClaims?.[2]?.kind).toBe("open_question");

    const withoutConflicts = await planBootstrapSpec.execute(
      { bootstrapContext: { ...kinds, conflicts: [] } },
      context(root),
    );
    const asIntent = await planBootstrapSpec.execute(
      {
        bootstrapContext: {
          ...kinds,
          intentClaims: kinds.intentClaims?.map(
            ({ kind: _kind, ...claim }) => claim,
          ),
        },
      },
      context(root),
    );
    expect(withoutConflicts.structuredContent.planHash).not.toBe(plan.planHash);
    expect(asIntent.structuredContent.planHash).not.toBe(plan.planHash);
    // As intent, the observed "must" statement is a requirement candidate again.
    expect(
      asIntent.structuredContent.plan.candidates.some(
        (candidate) =>
          candidate.entityType === "req" &&
          candidate.title === "Exports must be signed.",
      ),
    ).toBe(true);
  });
});
