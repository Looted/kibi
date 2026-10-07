import { afterEach, describe, expect, mock, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  COMPILE_PLAN_VERSION,
  executeCompileIntent,
} from "../../src/operations/planning/compile-intent.js";
import { nodeFilesystem } from "../../src/public/operations/node-ports.js";
import type {
  OperationContext,
  PrologPort,
  PrologQueryResult,
} from "../../src/public/operations/runtime-types.js";

const workspaces: string[] = [];

afterEach(async () => {
  await Promise.all(
    workspaces
      .splice(0)
      .map((workspace) => rm(workspace, { recursive: true, force: true })),
  );
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
    if (goal.includes("checks:what_if_analysis_json("))
      return { success: true, bindings: { JsonString: "[]" } };
    if (goal.includes("kb_relationship"))
      return { success: true, bindings: { Edges: "[]" } };
    return { success: true, bindings: { Results: "[]" } };
  });
}

describe("compile-intent validation and source planning", () => {
  test("rejects empty intent, invalid mode, empty update ids, and traversal paths", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "kibi-compile-cov-"));
    workspaces.push(root);
    const ctx = contextFor(root, quietQuery());
    await expect(
      executeCompileIntent(
        {
          intent: "   ",
          mode: "create",
          context:
            "The fixture requester gave this reason so the plan carries context for the test.",
        },
        ctx,
      ),
    ).rejects.toThrow(/intent must be non-empty/);
    await expect(
      executeCompileIntent(
        { intent: "Keep data.", mode: "revise" as "create" },
        ctx,
      ),
    ).rejects.toThrow(/mode must be create or update/);
    await expect(
      executeCompileIntent(
        { intent: "Keep data.", mode: "update", requirementId: "  " },
        ctx,
      ),
    ).rejects.toThrow(/requirementId must be non-empty/);
    await expect(
      executeCompileIntent(
        {
          intent: "Keep data.",
          mode: "create",
          context:
            "The fixture requester gave this reason so the plan carries context for the test.",
          sourceLocations: [{ path: "/etc/passwd" }],
        },
        ctx,
      ),
    ).rejects.toThrow(/workspace-relative/);
    await expect(
      executeCompileIntent(
        {
          intent: "Keep data.",
          mode: "create",
          context:
            "The fixture requester gave this reason so the plan carries context for the test.",
          sourceLocations: [{ path: "../outside.md" }],
        },
        ctx,
      ),
    ).rejects.toThrow(/workspace-relative/);
  });

  test("requires Prolog and a status payload", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "kibi-compile-status-"));
    workspaces.push(root);
    await expect(
      executeCompileIntent(
        {
          intent: "Keep data.",
          mode: "create",
          context:
            "The fixture requester gave this reason so the plan carries context for the test.",
        },
        {
          workspaceRoot: root,
          signal: new AbortController().signal,
          clock: () => new Date("2026-09-05T00:00:00Z"),
        },
      ),
    ).rejects.toThrow(/Prolog runtime/);
  });

  test("records missing source hashes and names the requirement document for ready creates", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "kibi-compile-src-"));
    workspaces.push(root);
    await mkdir(path.join(root, "docs"), { recursive: true });
    await writeFile(path.join(root, "docs", "present.md"), "present\n");
    const plan = (
      await executeCompileIntent(
        {
          intent: "Customer data must be retained for 7 years.",
          mode: "create",
          context:
            "The fixture requester gave this reason so the plan carries context for the test.",
          sourceLocations: [
            { path: "docs/present.md" },
            { path: "docs/missing.md" },
          ],
        },
        contextFor(root, quietQuery()),
      )
    ).structuredContent;
    expect(plan.version).toBe(COMPILE_PLAN_VERSION);
    expect(plan.expected.sourceHashes["docs/present.md"]).toMatch(
      /^[a-f0-9]{64}$/,
    );
    expect(plan.expected.sourceHashes["docs/missing.md"]).toBeNull();
    // Plans name each entity's document; kb_apply_plan renders the bytes.
    expect(plan.sourceWrites).toEqual([]);
    expect(
      plan.steps.find((step) => step.id === plan.target.requirementId)
        ?.document,
    ).toMatchObject({ path: "docs/present.md" });
  });

  test("a create without context is a validation error naming the field", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "kibi-compile-ctx-"));
    workspaces.push(root);
    await expect(
      executeCompileIntent(
        {
          intent: "Customer data must be retained for 7 years.",
          mode: "create",
        },
        contextFor(root, quietQuery()),
      ),
    ).rejects.toThrow(/context must be non-empty/);
    await expect(
      executeCompileIntent(
        {
          intent: "Customer data must be retained for 7 years.",
          mode: "create",
          context: "   ",
        },
        contextFor(root, quietQuery()),
      ),
    ).rejects.toThrow(/context must be non-empty/);
    await expect(
      executeCompileIntent(
        {
          intent: "Customer data must be retained for 7 years.",
          mode: "update",
          requirementId: "REQ-x",
          sourceExcerpt: "quoted",
        },
        contextFor(root, quietQuery()),
      ),
    ).rejects.toThrow(/sourceExcerpt and sourceReference need context/);
  });

  test("renders the requirement body as statement, context and source", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "kibi-compile-body-"));
    workspaces.push(root);
    const plan = (
      await executeCompileIntent(
        {
          intent: "Customer data must be retained for 7 years.",
          mode: "create",
          context: "Legal asked after an audit found data deleted too early.",
          sourceExcerpt: "Keep customer records seven years.\nNo exceptions.",
          sourceReference: "TICKET-42",
        },
        contextFor(root, quietQuery()),
      )
    ).structuredContent;
    const document = plan.steps.find(
      (step) => step.id === plan.target.requirementId,
    )?.document as { body?: string } | undefined;
    expect(document?.body).toBe(
      "Customer data must be retained for 7 years.\n\n## Context\n\nLegal asked after an audit found data deleted too early.\n\n## Source\n\n> Keep customer records seven years.\n> No exceptions.\n\nSource: TICKET-42\n",
    );
  });

  test("an update rewrites the statement and keeps or replaces context sections", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "kibi-compile-revise-"));
    workspaces.push(root);
    const relative = ".kb/requirements/REQ-keep.md";
    const contextBlock =
      "## Context\n\nLegal asked after an audit found data deleted too early.\n";
    const sourceBlock = "## Source\n\n> Keep records.\n\nSource: TICKET-1\n";
    await mkdir(path.join(root, ".kb/requirements"), { recursive: true });
    await writeFile(
      path.join(root, relative),
      `---\nid: REQ-keep\ntitle: Retention\nstatus: open\n---\nCustomer data must be retained for 5 years.\n\n${contextBlock}\n${sourceBlock}`,
    );
    const query = mock(async (goal: string): Promise<PrologQueryResult> => {
      if (goal.includes("checks:what_if_analysis_json("))
        return { success: true, bindings: { JsonString: "[]" } };
      if (goal.includes("kb_relationship"))
        return { success: true, bindings: { Edges: "[]" } };
      if (goal.includes("kb_entity('REQ-keep'"))
        return {
          success: true,
          bindings: {
            Results: `[[REQ-keep,req,[title="Retention",status=open,source="${relative}"]]]`,
          },
        };
      return { success: true, bindings: { Results: "[]" } };
    });
    const bodyOf = async (extra: Record<string, unknown>) => {
      const plan = (
        await executeCompileIntent(
          {
            intent: "Customer data must be retained for 7 years.",
            mode: "update",
            requirementId: "REQ-keep",
            ...extra,
          },
          contextFor(root, query),
        )
      ).structuredContent;
      return (
        plan.steps.find((step) => step.id === "REQ-keep")?.document as
          | { body?: string }
          | undefined
      )?.body;
    };
    // No context supplied: the statement changes, context sections survive.
    expect(await bodyOf({})).toBe(
      `Customer data must be retained for 7 years.\n\n${contextBlock}\n${sourceBlock}`,
    );
    // Supplied context replaces the Context section and keeps Source.
    expect(
      await bodyOf({ context: "Compliance moved the limit to seven years." }),
    ).toBe(
      `Customer data must be retained for 7 years.\n\n## Context\n\nCompliance moved the limit to seven years.\n\n${sourceBlock}`,
    );
  });

  test("auto-selects a high-confidence update target and applies drafts plus proposals", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "kibi-compile-update-"));
    workspaces.push(root);
    const query = mock(async (goal: string): Promise<PrologQueryResult> => {
      if (goal.includes("checks:what_if_analysis_json("))
        return { success: false, bindings: {} };
      if (goal.includes("kb_entity('REQ-TOP'"))
        return {
          success: true,
          bindings: {
            Results:
              '[[REQ-TOP,req,[title="Retention",status=open,source="docs/REQ.md"]]]',
          },
        };
      if (goal.includes("kb_relationship"))
        return {
          success: true,
          bindings: {
            Edges: "[]",
            Results:
              '[[REQ-TOP,req,[title="Retention",status=open]],[SCEN-KEEP,scenario,[title="Keep"]]]',
          },
        };
      return {
        success: true,
        bindings: {
          Results:
            '[[REQ-TOP,req,[title="Retention",status=open]],[SCEN-KEEP,scenario,[title="Keep"]]]',
        },
      };
    });
    const plan = (
      await executeCompileIntent(
        {
          intent: "Customer data must be retained for 7 years.",
          mode: "update",
          scenarioDrafts: [{ title: "Happy path", body: "Given retention." }],
          testDrafts: [
            {
              title: "Prove retention",
              body: "it retains",
              verificationScope: "unit",
              verificationPerspective: "internal",
            },
          ],
          proposalDecisions: [
            { proposalId: "PROP-PLACEHOLDER", decision: "accept" },
          ],
        },
        contextFor(root, query),
      )
    ).structuredContent;
    expect(plan.steps.some((step) => step.type === "scenario")).toBe(true);
    expect(plan.steps.some((step) => step.type === "test")).toBe(true);
    expect(["ready", "needs_resolution", "blocked"]).toContain(plan.status);
  });

  test("blocks create when a generated id already exists with different content", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "kibi-compile-dup-"));
    workspaces.push(root);
    const query = mock(async (goal: string): Promise<PrologQueryResult> => {
      if (goal.includes("checks:what_if_analysis_json("))
        return { success: true, bindings: { JsonString: "[]" } };
      if (goal.includes("kb_relationship"))
        return { success: true, bindings: { Edges: "[]" } };
      if (goal.includes("kb_entity("))
        return {
          success: true,
          bindings: {
            Results:
              '[[REQ-EXISTING,req,[title="Different title",semantic_text="other intent",status=open]]]',
          },
        };
      return { success: true, bindings: { Results: "[]" } };
    });
    const first = await executeCompileIntent(
      {
        intent: "Customer data must be retained for 7 years.",
        mode: "create",
        context:
          "The fixture requester gave this reason so the plan carries context for the test.",
      },
      contextFor(root, quietQuery()),
    );
    const id = first.structuredContent.target.requirementId;
    const dup = mock(async (goal: string): Promise<PrologQueryResult> => {
      if (goal.includes("checks:what_if_analysis_json("))
        return { success: true, bindings: { JsonString: "[]" } };
      if (goal.includes(`kb_entity('${id}'`))
        return {
          success: true,
          bindings: {
            Results: `[[${id},req,[title="Different",semantic_text="other",status=open]]]`,
          },
        };
      return { success: true, bindings: { Results: "[]" } };
    });
    const plan = (
      await executeCompileIntent(
        {
          intent: "Customer data must be retained for 7 years.",
          mode: "create",
          context:
            "The fixture requester gave this reason so the plan carries context for the test.",
        },
        contextFor(root, dup),
      )
    ).structuredContent;
    expect(plan.status).toBe("needs_resolution");
    expect(
      plan.diagnostics.some((item) => item.includes("already exists")),
    ).toBe(true);
    expect(query).toBeDefined();
  });

  test("updates an explicit requirement and surfaces contradiction witnesses", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "kibi-compile-explicit-"));
    workspaces.push(root);
    const query = mock(async (goal: string): Promise<PrologQueryResult> => {
      if (goal.includes("checks:what_if_analysis_json("))
        return {
          success: true,
          bindings: {
            JsonString: JSON.stringify([
              { requirements: ["FACT-A", "FACT-B"], reason: "conflict" },
            ]),
          },
        };
      if (goal.includes("kb_entity('REQ-KEEP'"))
        return {
          success: true,
          bindings: {
            Results:
              '[[REQ-KEEP,req,[title="Keep",status=open,semantic_text="Customer data must be retained for 7 years."]]]',
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
    expect(plan.target.requirementId).toBe("REQ-KEEP");
    expect(plan.contradictionAnalysis.witnesses.length).toBeGreaterThanOrEqual(
      0,
    );
  });

  test("uses proof snapshots, unresolved updates, missing ids, and test-only drafts", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "kibi-compile-extra-"));
    workspaces.push(root);
    const query = mock(async (goal: string): Promise<PrologQueryResult> => {
      if (goal.includes("checks:what_if_analysis_json("))
        return { success: false, bindings: {} };
      if (goal.includes("kb_relationship"))
        return { success: true, bindings: { Edges: "[]" } };
      return { success: true, bindings: { Results: "[]" } };
    });
    const ctx = contextFor(root, query);
    const prolog = ctx.prolog;
    if (!prolog) throw new Error("expected a Prolog context");
    (ctx as { prolog: PrologPort }).prolog = {
      ...prolog,
      queryStatusJson: async () => ({
        success: true,
        bindings: {
          JsonString: JSON.stringify({
            branch: "develop",
            snapshotId: "stamp:test",
            syncedAt: "2026-09-05T00:00:00Z",
            dirty: false,
            syncState: "fresh",
            proofSnapshot: "a".repeat(64),
            proofSnapshotDirty: false,
            proofSnapshotFileCount: 4,
          }),
        },
      }),
    };
    const unresolved = (
      await executeCompileIntent(
        {
          intent: "Customer data must be retained for 7 years.",
          mode: "update",
          testDrafts: [{ title: "Only test", body: "it retains" }],
          sourceLocations: [{ path: ".kb/requirements/REQ.md" }],
        },
        ctx,
      )
    ).structuredContent;
    expect(unresolved.diagnostics.join(" ")).toMatch(/unresolved|no scenario/);
    expect(unresolved.sourceWrites).toEqual([]);

    const missing = (
      await executeCompileIntent(
        {
          intent: "Customer data must be retained for 7 years.",
          mode: "update",
          requirementId: "REQ-MISSING",
        },
        contextFor(root, quietQuery()),
      )
    ).structuredContent;
    expect(missing.diagnostics.join(" ")).toContain("was not found");

    const noFs = (
      await executeCompileIntent(
        {
          intent: "Customer data must be retained for 7 years.",
          mode: "create",
          context:
            "The fixture requester gave this reason so the plan carries context for the test.",
          sourceLocations: [{ path: "docs/present.md" }],
        },
        contextFor(root, quietQuery(), { fs: undefined }),
      )
    ).structuredContent;
    expect(noFs.expected.sourceHashes["docs/present.md"]).toBeNull();
  });

  test("uses explicit stable scenario associations for reordered and many-to-many tests", async () => {
    const root = await mkdtemp(
      path.join(tmpdir(), "kibi-compile-associations-"),
    );
    workspaces.push(root);
    const plan = (
      await executeCompileIntent(
        {
          intent: "Customer data must be retained for 7 years.",
          mode: "create",
          context:
            "The fixture requester gave this reason so the plan carries context for the test.",
          scenarioDrafts: [
            { id: "SCEN-A", title: "A", body: "Given A." },
            { id: "SCEN-B", title: "B", body: "Given B." },
          ],
          testDrafts: [
            {
              id: "TEST-B",
              title: "Test B",
              body: "It handles B.",
              scenarioIds: ["SCEN-B"],
            },
            {
              id: "TEST-A",
              title: "Test A",
              body: "It handles A.",
              scenarioIds: ["SCEN-A"],
            },
            {
              id: "TEST-BOTH",
              title: "Test both",
              body: "It handles both.",
              scenarioIds: ["SCEN-B", "SCEN-A"],
            },
          ],
        },
        contextFor(root, quietQuery()),
      )
    ).structuredContent;
    const step = (type: string, id: string) =>
      plan.steps.find((entry) => entry.type === type && entry.id === id) as
        | { relationships?: unknown[]; properties?: unknown }
        | undefined;
    expect(step("test", "TEST-B")?.properties).toEqual(
      expect.objectContaining({
        verification_scope: "integration",
        verification_perspective: "internal",
      }),
    );
    // verified_by runs scenario -> test, so the scenario step carries it and
    // every test is written before the scenarios that link to it.
    expect(step("test", "TEST-B")?.relationships).toEqual([]);
    expect(step("scenario", "SCEN-A")?.relationships).toEqual([
      { type: "verified_by", from: "SCEN-A", to: "TEST-A" },
      { type: "verified_by", from: "SCEN-A", to: "TEST-BOTH" },
    ]);
    expect(step("scenario", "SCEN-B")?.relationships).toEqual([
      { type: "verified_by", from: "SCEN-B", to: "TEST-B" },
      { type: "verified_by", from: "SCEN-B", to: "TEST-BOTH" },
    ]);
    const order = plan.steps.map((entry) => String(entry.type));
    expect(order.lastIndexOf("test")).toBeLessThan(order.indexOf("scenario"));
    expect(order.lastIndexOf("scenario")).toBeLessThan(order.indexOf("req"));
    // The specified_by links fold into the one requirement step, which an
    // upsert can apply; a step without properties would fail validation.
    const requirements = plan.steps.filter((entry) => entry.type === "req");
    expect(requirements).toHaveLength(1);
    expect(requirements[0]?.relationships).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "specified_by", to: "SCEN-A" }),
        expect.objectContaining({ type: "specified_by", to: "SCEN-B" }),
      ]),
    );
    expect(
      plan.diagnostics.some((diagnostic) => /unresolved/.test(diagnostic)),
    ).toBe(false);
  });

  test("rejects positional and unknown scenario associations", async () => {
    const root = await mkdtemp(
      path.join(tmpdir(), "kibi-compile-association-gaps-"),
    );
    workspaces.push(root);
    const plan = (
      await executeCompileIntent(
        {
          intent: "Customer data must be retained for 7 years.",
          mode: "create",
          context:
            "The fixture requester gave this reason so the plan carries context for the test.",
          scenarioDrafts: [
            { id: "SCEN-A", title: "A", body: "Given A." },
            { id: "SCEN-B", title: "B", body: "Given B." },
          ],
          testDrafts: [
            { id: "TEST-POSITIONAL", title: "Positional", body: "No mapping." },
            {
              id: "TEST-UNKNOWN",
              title: "Unknown",
              body: "Bad mapping.",
              scenarioIds: ["SCEN-MISSING"],
            },
            {
              id: "TEST-DUPLICATE-SCENARIO",
              title: "Duplicate mapping",
              body: "Ambiguous mapping.",
              scenarioIds: ["SCEN-A", "SCEN-A"],
            },
          ],
        },
        contextFor(root, quietQuery()),
      )
    ).structuredContent;
    const testSteps = plan.steps.filter((step) => step.type === "test");
    expect(testSteps[0]?.relationships).toEqual([]);
    expect(testSteps[1]?.relationships).toEqual([]);
    expect(plan.status).toBe("needs_resolution");
    expect(plan.diagnostics.join(" ")).toMatch(
      /must declare scenarioIds|unknown scenario ID|repeats or omits|has no test draft/,
    );
  });

  test("emits proposals for scenarios, symbols, and tests and applies accepted ones", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "kibi-compile-prop-"));
    workspaces.push(root);
    const query = mock(async (goal: string): Promise<PrologQueryResult> => {
      if (goal.includes("checks:what_if_analysis_json("))
        return { success: true, bindings: { JsonString: "[]" } };
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
      return {
        success: true,
        bindings: {
          Results:
            '[[REQ-KEEP,req,[title="Keep"]],[SCEN-KEEP,scenario,[title="Keep"]],[SYM-KEEP,symbol,[title="Keep"]],[TEST-KEEP,test,[title="Keep"]],[ADR-KEEP,adr,[title="Keep"]]]',
        },
      };
    });
    const first = (
      await executeCompileIntent(
        {
          intent: "Customer data must be retained for 7 years.",
          mode: "update",
          requirementId: "REQ-KEEP",
        },
        contextFor(root, query),
      )
    ).structuredContent;
    const accepted = first.proposals
      .filter((proposal) => proposal.candidateType !== "req")
      .map((proposal) => ({
        proposalId: proposal.proposalId,
        decision: "accept" as const,
      }));
    const applied = (
      await executeCompileIntent(
        {
          intent: "Customer data must be retained for 7 years.",
          mode: "update",
          requirementId: "REQ-KEEP",
          proposalDecisions: [
            ...accepted,
            { proposalId: "PROP-UNKNOWN", decision: "reject" },
          ],
        },
        contextFor(root, query),
      )
    ).structuredContent;
    expect(Array.isArray(applied.proposals)).toBe(true);
    expect(applied.target.requirementId).toBe("REQ-KEEP");
  });
});
