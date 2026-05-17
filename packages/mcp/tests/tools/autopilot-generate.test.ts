import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PrologProcess } from "kibi-cli/prolog";
import { buildGenericMarkdownCandidates } from "../../src/tools/autopilot-candidates.js";
import { handleKbAutopilotGenerate } from "../../src/tools/autopilot-generate.js";
import {
  createColdStartRepo,
  createNoisyRepo,
  createPartialRepo,
  createSeededRepo,
  createThinRepo,
  createVendoredTree,
} from "./autopilot-workspace-fixture";

type PrologQueryResult = Awaited<ReturnType<PrologProcess["query"]>>;

interface CandidateWithPlan {
  entityType?: string;
  title?: string;
  applyPlan?: Array<{
    properties?: {
      status?: string;
    };
  }>;
}

interface DiscoverySummaryRecord extends Record<string, unknown> {
  providersRun?: string[];
  providerCounts?: Record<string, number>;
  detectedLanguages?: string[];
  detectedTestFrameworks?: string[];
  excludedRoots?: string[];
  truncated?: boolean;
  scanWarnings?: string[];
}

interface ConfidenceRecord extends Record<string, unknown> {
  score?: number;
  level?: string;
  reasons?: string[];
  policy?: string;
}

interface RecommendedActionRecord extends Record<string, unknown> {
  order?: number;
  kind?: string;
  description?: string;
  candidateIds?: string[];
}

interface DeclaredContextRecord extends Record<string, unknown> {
  projectSummary?: string;
  sourceOfTruthPaths?: string[];
  sourceOfTruthNotes?: string[];
  priorityRoots?: string[];
  verificationAnchors?: string[];
}

function getCandidateStatus(candidate: CandidateWithPlan | undefined): string | undefined {
  return candidate?.applyPlan?.[0]?.properties?.status;
}

describe("autopilot generate", () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "kibi-autopilot-"));
    process.env.KIBI_WORKSPACE = tmp;
  });

  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
    process.env.KIBI_WORKSPACE = undefined;
  });

  function createPrologStub(
    queryImpl: (goal: string | string[]) => Promise<PrologQueryResult>,
  ): PrologProcess {
    const prolog = new PrologProcess();
    prolog.query = queryImpl;
    return prolog;
  }

  function emptyQueryResult(): PrologQueryResult {
    return { success: true, bindings: {} };
  }

  test("source-only repo docs avoid speculative req/scenario/test candidates and emit authoring guidance", async () => {
    createColdStartRepo(tmp);
    const readme = "# ADR: Use service mesh\n\n# Requirements\n\n# Observations\n";
    await fs.writeFile(path.join(tmp, "README.md"), readme);

    const prolog = createPrologStub(async () => emptyQueryResult());

    const res = await handleKbAutopilotGenerate(prolog, {
      includeGenericMarkdown: true,
      minConfidence: 0.8,
    });
    const candidates = res.structuredContent.candidates as Array<Record<string, unknown>>;
    expect(candidates.some((candidate) => candidate.entityType === "adr")).toBe(true);
    expect(candidates.some((candidate) => candidate.entityType === "fact")).toBe(true);
    expect(
      candidates.some((candidate) =>
        ["req", "scenario", "test"].includes(String(candidate.entityType)),
      ),
    ).toBe(false);

    const actions = res.structuredContent
      .recommendedActions as Array<RecommendedActionRecord>;
    const authoringAction = actions.find((action) =>
      /req|requirement|scenario|test/i.test(String(action.description ?? "")),
    );

    expect(authoringAction).toBeDefined();
    expect(authoringAction?.candidateIds).toBeUndefined();
  });

  test("generic ADR markdown candidates use proposed status", async () => {
    await fs.mkdir(path.join(tmp, "docs"), { recursive: true });
    const sourcePath = path.join(tmp, "docs", "bootstrap.md");
    await fs.writeFile(sourcePath, "# ADR: Adopt Kibi\n");

    const candidates = buildGenericMarkdownCandidates(
      { markdownFiles: [sourcePath] },
      { ids: new Set<string>() },
      0.8,
    );

    const adrCandidate = candidates.find(
      (candidate) => candidate.entityType === "adr",
    ) as CandidateWithPlan | undefined;
    expect(adrCandidate).toBeDefined();
    expect(getCandidateStatus(adrCandidate)).toBe("proposed");
  });

  test("day-0 root_uninitialized generates candidates and generic ADRs use proposed status", async () => {
    createColdStartRepo(tmp);
    await fs.mkdir(path.join(tmp, "docs"), { recursive: true });
    await fs.writeFile(
      path.join(tmp, "docs", "bootstrap.md"),
      "# ADR: Adopt Kibi\n\n# Requirements\n\n# Observations\n",
    );

    const prolog = createPrologStub(async () => ({
      success: false,
      bindings: {},
      error: "no entities",
    }));

    const res = await handleKbAutopilotGenerate(prolog, {
      includeGenericMarkdown: true,
      minConfidence: 0.8,
    });

    expect(res.structuredContent.activationState).toBe("root_uninitialized");
    expect(res.structuredContent.activationMode).toBe("cold_start_bootstrap");
    expect(res.structuredContent.applyBlocked).toBe(false);

    const candidates = res.structuredContent
      .candidates as Array<CandidateWithPlan>;
    expect(candidates.length).toBeGreaterThan(0);

    const adrCandidate = candidates.find(
      (candidate) => candidate.entityType === "adr",
    );
    expect(adrCandidate).toBeDefined();
    expect(getCandidateStatus(adrCandidate)).toBe("proposed");
  });

  test("cold-start bootstrap returns agent-centric guidance with declared context and additive top-level keys", async () => {
    createColdStartRepo(tmp);

    const prolog = createPrologStub(async () => ({
      success: false,
      bindings: {},
      error: "no entities",
    }));

    const res = await handleKbAutopilotGenerate(prolog, {
      includeGenericMarkdown: true,
      minConfidence: 0.8,
      bootstrapContext: {
        projectSummary: "Bootstrap Kibi for a Bun TypeScript service.",
        sourceOfTruthPaths: ["README.md", "docs/spec.md"],
        sourceOfTruthNotes: ["README reflects current behavior."],
        priorityRoots: ["src", "tests"],
        verificationAnchors: ["bun test"],
      },
    });

    expect(res.structuredContent.activationState).toBe("root_uninitialized");
    expect(res.structuredContent.bootstrapMode).toBe("cold_start_bootstrap");
    expect(typeof res.structuredContent.tldr).toBe("string");
    expect(res.structuredContent.tldr.length).toBeGreaterThan(0);

    const promptBlock = String(res.structuredContent.promptBlock ?? "");
    expect(promptBlock.length).toBeGreaterThan(0);
    expect(promptBlock.trim().split(/\s+/).length).toBeLessThanOrEqual(120);
    expect(
      promptBlock
        .split("\n")
        .filter((line) => line.trim().startsWith("- "))
        .length,
    ).toBeLessThanOrEqual(5);

    const declaredContext = res.structuredContent
      .declaredContext as DeclaredContextRecord;
    expect(declaredContext).toEqual({
      projectSummary: "Bootstrap Kibi for a Bun TypeScript service.",
      sourceOfTruthPaths: ["README.md", "docs/spec.md"],
      sourceOfTruthNotes: ["README reflects current behavior."],
      priorityRoots: ["src", "tests"],
      verificationAnchors: ["bun test"],
    });

    const confidence = res.structuredContent.confidence as ConfidenceRecord;
    expect(typeof confidence.score).toBe("number");
    expect(["high", "medium", "low"]).toContain(confidence.level ?? "");
    expect(Array.isArray(confidence.reasons)).toBe(true);
    expect((confidence.reasons ?? []).length).toBeGreaterThan(0);

    const actions = res.structuredContent
      .recommendedActions as Array<RecommendedActionRecord>;
    expect(actions.length).toBeGreaterThan(0);
    expect(actions.map((action) => action.order)).toEqual(
      actions
        .map((action) => action.order)
        .sort((left, right) => Number(left ?? 0) - Number(right ?? 0)),
    );
    expect(actions.some((action) => action.kind === "query")).toBe(true);
    expect(actions.some((action) => action.kind === "upsert")).toBe(true);
    expect(actions.some((action) => action.kind === "check")).toBe(true);

    const topLevel = res as unknown as Record<string, unknown>;
    expect(topLevel.candidates).toEqual(res.structuredContent.candidates);
    expect(topLevel.suppressedCandidates).toEqual(
      res.structuredContent.suppressedCandidates,
    );
    expect(topLevel.payoffSummary).toEqual(res.structuredContent.payoffSummary);
  });

  test("cold-start repos without Kibi docs still report provider evidence in discoverySummary", async () => {
    createColdStartRepo(tmp);

    const prolog = createPrologStub(async () => ({
      success: false,
      bindings: {},
      error: "no entities",
    }));

    const res = await handleKbAutopilotGenerate(prolog, {
      includeGenericMarkdown: true,
      minConfidence: 0.8,
    });

    const summary = res.structuredContent
      .discoverySummary as unknown as DiscoverySummaryRecord;
    const candidates = res.structuredContent
      .candidates as Array<Record<string, unknown>>;

    expect(summary.providersRun).toEqual([
      "typed_kibi_docs",
      "generic_repo_docs",
      "repo_metadata",
      "repo_layout",
      "test_topology",
      "source_symbols",
    ]);
    expect(summary.providerCounts?.typed_kibi_docs).toBe(0);
    expect(summary.providerCounts?.repo_metadata).toBeGreaterThan(0);
    expect(summary.providerCounts?.repo_layout).toBeGreaterThan(0);
    expect(summary.providerCounts?.test_topology).toBeGreaterThan(0);
    expect(summary.providerCounts?.source_symbols).toBeGreaterThan(0);
    expect(summary.detectedLanguages).toContain("typescript");
    expect(summary.detectedTestFrameworks).toContain("bun:test");
    expect(summary.excludedRoots).toEqual(
      expect.arrayContaining([
        ".git",
        ".kb",
        "node_modules",
        "vendor",
        "vendors",
        "third_party",
        "dist",
        "coverage",
        "build",
        "target",
        ".venv",
        "venv",
      ]),
    );
    expect(summary.truncated).toBe(false);
    expect(summary.scanWarnings).toEqual([]);
    expect(candidates.length).toBeGreaterThan(0);
    expect(
      candidates.some((candidate) => candidate.entityType === "fact"),
    ).toBe(true);
  });

  test("generic repo docs include non-doc markdown and ignore excluded trees", async () => {
    createColdStartRepo(tmp);
    createNoisyRepo(tmp);
    await fs.mkdir(path.join(tmp, "notes"), { recursive: true });
    await fs.mkdir(path.join(tmp, "vendor"), { recursive: true });
    await fs.writeFile(
      path.join(tmp, "notes", "decision.md"),
      "# ADR: Project Runtime\n",
    );
    await fs.writeFile(
      path.join(tmp, "vendor", "decision.md"),
      "# ADR: Ignored Vendor Decision\n",
    );

    const prolog = createPrologStub(async () => emptyQueryResult());

    const res = await handleKbAutopilotGenerate(prolog, {
      includeGenericMarkdown: true,
      minConfidence: 0.8,
    });

    const candidates = res.structuredContent
      .candidates as Array<Record<string, unknown>>;
    expect(
      candidates.some((candidate) => candidate.title === "ADR: Project Runtime"),
    ).toBe(true);
    expect(
      candidates.some(
        (candidate) => candidate.title === "ADR: Ignored Vendor Decision",
      ),
    ).toBe(false);

    const summary = res.structuredContent
      .discoverySummary as unknown as DiscoverySummaryRecord;
    expect(summary.providerCounts?.generic_repo_docs).toBeGreaterThanOrEqual(1);
  });

  test("ignored paths (like .sisyphus drafts) yield zero generic candidates", async () => {
    createColdStartRepo(tmp);
    // create an ignored draft under .sisyphus/drafts
    await fs.mkdir(path.join(tmp, ".sisyphus", "drafts"), { recursive: true });
    const draftPath = path.join(tmp, ".sisyphus", "drafts", "kibi-kb-quality-audit.md");
    await fs.writeFile(draftPath, "# ADR: Draft Decision\n");

    const candidates = buildGenericMarkdownCandidates(
      { markdownFiles: [draftPath] },
      { ids: new Set<string>(), workspaceRoot: tmp },
      0.8,
    );

    expect(candidates.length).toBe(0);
  });

  test(".gitignore-ignored markdown files yield zero generic candidates", async () => {
    createColdStartRepo(tmp);
    // create a markdown file and ignore it via .gitignore
    await fs.mkdir(path.join(tmp, "secret"), { recursive: true });
    const secretPath = path.join(tmp, "secret", "secret-doc.md");
    await fs.writeFile(secretPath, "# ADR: Secret Decision\n");
    await fs.writeFile(path.join(tmp, ".gitignore"), "secret/\n");

    const candidates = buildGenericMarkdownCandidates(
      { markdownFiles: [secretPath] },
      { ids: new Set<string>(), workspaceRoot: tmp },
      0.8,
    );

    expect(candidates.length).toBe(0);
  });

  test("non-ignored markdown still yields candidates", async () => {
    // sanity check: a regular markdown under docs/ yields candidates (conservative path)
    await fs.mkdir(path.join(tmp, "docs"), { recursive: true });
    const notePath = path.join(tmp, "docs", "decision.md");
    await fs.writeFile(notePath, "# ADR: Public Decision\n");

    const candidates = buildGenericMarkdownCandidates(
      { markdownFiles: [notePath] },
      { ids: new Set<string>(), workspaceRoot: tmp },
      0.8,
    );

    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.some((c) => c.entityType === "adr")).toBe(true);
  });

  test("root_partial workspaces may scan but block apply", async () => {
    createPartialRepo(tmp);

    const prolog = createPrologStub(async () => emptyQueryResult());

    const res = await handleKbAutopilotGenerate(prolog, {
      includeGenericMarkdown: false,
    });

    expect(res.structuredContent.activationState).toBe("root_partial");
    expect(res.structuredContent.activationMode).toBe("repair_bootstrap");
    expect(res.structuredContent.applyBlocked).toBe(true);
    const summary = res.structuredContent
      .discoverySummary as unknown as DiscoverySummaryRecord;
    expect(summary.providersRun).toEqual([
      "typed_kibi_docs",
      "generic_repo_docs",
      "repo_metadata",
      "repo_layout",
      "test_topology",
      "source_symbols",
    ]);
    expect(summary.providerCounts?.typed_kibi_docs).toBeGreaterThanOrEqual(1);
    expect(res.structuredContent.candidates.length).toBeGreaterThanOrEqual(1);
  });

  test("cold-start repos add source symbol evidence from parser-backed JS/TS analysis", async () => {
    createColdStartRepo(tmp);

    const prolog = createPrologStub(async () => emptyQueryResult());

    const res = await handleKbAutopilotGenerate(prolog, {
      includeGenericMarkdown: true,
      minConfidence: 0.8,
    });

    const summary = res.structuredContent
      .discoverySummary as unknown as DiscoverySummaryRecord;
    const candidates = res.structuredContent
      .candidates as Array<Record<string, unknown>>;

    expect(summary.providerCounts?.source_symbols).toBeGreaterThan(0);
    expect(
      candidates.some(
        (candidate) =>
          candidate.entityType === "fact" &&
          candidate.sourceKind === "source_symbols" &&
          String(candidate.title).includes("Source symbols:"),
      ),
    ).toBe(true);
  });

  test("cold-start repos emit strict requirement candidates for high-confidence normative markdown", async () => {
    await fs.writeFile(
      path.join(tmp, "README.md"),
      "# Requirements\n\nCustomer data must be retained for 7 years.\n",
    );

    const prolog = createPrologStub(async () => emptyQueryResult());
    const res = await handleKbAutopilotGenerate(prolog, {
      includeGenericMarkdown: true,
      minConfidence: 0.8,
    });

    const candidates = res.structuredContent
      .candidates as Array<Record<string, unknown>>;
    const requirementCandidate = candidates.find(
      (candidate) =>
        candidate.entityType === "req" &&
        String(candidate.title).includes("retained for 7 years"),
    );
    const applyPlan = requirementCandidate?.applyPlan as
      | Array<Record<string, unknown>>
      | undefined;
    const reqStep = applyPlan?.[2] as Record<string, unknown> | undefined;

    expect(requirementCandidate).toBeDefined();
    expect(requirementCandidate?.sourceKind).toBe("generic_markdown");
    expect(applyPlan).toHaveLength(3);
    expect(applyPlan?.[0]).toMatchObject({ type: "fact", relationships: [] });
    expect(applyPlan?.[1]).toMatchObject({ type: "fact", relationships: [] });
    expect(reqStep).toMatchObject({ type: "req" });
    expect(reqStep?.relationships).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "constrains" }),
        expect.objectContaining({ type: "requires_property" }),
      ]),
    );
  });

  test("unsupported-language repos keep source symbol provider graceful with fallback module evidence", async () => {
    await fs.mkdir(path.join(tmp, "src"), { recursive: true });
    await fs.writeFile(
      path.join(tmp, "README.md"),
      "# Requirements\n\nBootstrap the Python project.\n",
    );
    await fs.writeFile(
      path.join(tmp, "src", "main.py"),
      ["def bootstrap_main():", "    return True", ""].join("\n"),
    );
    await fs.writeFile(
      path.join(tmp, "pyproject.toml"),
      ["[project]", 'name = "python-bootstrap"', 'version = "0.1.0"', ""].join(
        "\n",
      ),
    );

    const prolog = createPrologStub(async () => emptyQueryResult());

    const res = await handleKbAutopilotGenerate(prolog, {
      includeGenericMarkdown: true,
      minConfidence: 0.8,
    });

    const summary = res.structuredContent
      .discoverySummary as unknown as DiscoverySummaryRecord;
    const candidates = res.structuredContent
      .candidates as Array<Record<string, unknown>>;

    expect(summary.providerCounts?.source_symbols).toBeGreaterThan(0);
    expect(summary.detectedLanguages).toContain("python");
    expect(
      candidates.some(
        (candidate) =>
          candidate.entityType === "fact" &&
          candidate.sourceKind === "source_symbols" &&
          String(candidate.title).includes("Source module:") &&
          String(candidate.sourcePath).endsWith("src/main.py"),
      ),
    ).toBe(true);
  });

  test("duplicate title suppression emits flat records", async () => {
    await fs.writeFile(path.join(tmp, "README.md"), "# ADR: Shared Decision\n");
    await fs.mkdir(path.join(tmp, "docs"), { recursive: true });
    await fs.writeFile(path.join(tmp, "docs", "duplicate.md"), "# ADR: Shared Decision\n");

    const prolog = createPrologStub(async () => emptyQueryResult());

    const res = await handleKbAutopilotGenerate(prolog, {
      includeGenericMarkdown: true,
      minConfidence: 0.8,
    });

    const suppressed = res.structuredContent.suppressedCandidates as Array<Record<string, unknown>>;
    const duplicate = suppressed.find(
      (candidate) => candidate.reason === "duplicate_title",
    );

    expect(duplicate).toBeDefined();
    expect(duplicate?.candidateId).toEqual(expect.any(String));
    expect(duplicate?.sourcePath).toEqual(expect.any(String));
    expect(duplicate?.entityType).toBe("adr");
    expect(duplicate && Object.hasOwn(duplicate, "candidate")).toBe(false);
  });

  test("generic candidates shadowed by typed sources use shadowed_by_typed_source", async () => {
    await fs.mkdir(path.join(tmp, "documentation", "adr"), { recursive: true });
    await fs.writeFile(
      path.join(tmp, "documentation", "adr", "ADR-001.md"),
      "---\nid: ADR-001\ntitle: \"ADR: Adopt Kibi\"\nstatus: proposed\n---\n# ADR Content\n",
    );
    await fs.mkdir(path.join(tmp, "docs"), { recursive: true });
    await fs.writeFile(path.join(tmp, "docs", "decision.md"), "# ADR: Adopt Kibi\n");

    const prolog = createPrologStub(async () => emptyQueryResult());

    const res = await handleKbAutopilotGenerate(prolog, {
      includeGenericMarkdown: true,
      minConfidence: 0.8,
    });

    const candidates = res.structuredContent.candidates as Array<Record<string, unknown>>;
    expect(
      candidates.filter((candidate) => candidate.title === "ADR: Adopt Kibi"),
    ).toHaveLength(1);

    const suppressed = res.structuredContent.suppressedCandidates as Array<Record<string, unknown>>;
    const shadowed = suppressed.find(
      (candidate) => candidate.reason === "shadowed_by_typed_source",
    );

    expect(shadowed).toBeDefined();
    expect(shadowed?.candidateId).toEqual(expect.any(String));
    expect(shadowed?.sourcePath).toEqual(expect.any(String));
    expect(shadowed?.entityType).toBe("adr");
    expect(shadowed && Object.hasOwn(shadowed, "candidate")).toBe(false);
  });

  test("vendored_only workspaces are blocked with zero candidates", async () => {
    createVendoredTree(tmp);

    const prolog = createPrologStub(async () => emptyQueryResult());

    const res = await handleKbAutopilotGenerate(prolog, {
      includeGenericMarkdown: true,
    });

    expect(res.structuredContent.activationState).toBe("vendored_only");
    expect(res.structuredContent.activationMode).toBe("vendored_blocked");
    expect(res.structuredContent.applyBlocked).toBe(true);
    expect(res.structuredContent.candidates).toEqual([]);
    expect(res.structuredContent.activationReason.toLowerCase()).toContain("vendored");
  });

  test("root_active_thin returns explicit handoff mode instead of silent zero-output", async () => {
    createThinRepo(tmp, { multiRoot: true, noisy: true });

    const fakeCounts = JSON.stringify({
      rows: [
        { id: "req", type: "req", count: 1 },
        { id: "scenario", type: "scenario", count: 0 },
        { id: "test", type: "test", count: 0 },
      ],
    });

    const prolog = createPrologStub(async (goal) => {
      const queryText = Array.isArray(goal) ? goal.join(" ") : goal;
      if (queryText.includes("coverage_report_json")) {
        return { success: true, bindings: { JsonString: fakeCounts } };
      }
      return emptyQueryResult();
    });

    const res = await handleKbAutopilotGenerate(prolog, {
      includeGenericMarkdown: true,
    });

    expect(res.structuredContent.activationState).toBe("root_active_thin");
    expect(res.structuredContent.activationMode).toBe("attached_thin_handoff");
    expect(res.structuredContent.applyBlocked).toBe(true);
    expect(res.structuredContent.candidates).toEqual([]);
    expect(res.structuredContent.activationReason.toLowerCase()).toContain("thin");
    expect(res.content[0]?.text).not.toBe("Autopilot generated 0 candidate(s).");
  });

  test("root_active_seeded returns explicit seeded handoff instead of silent zero-output", async () => {
    createSeededRepo(tmp);

    const fakeCounts = JSON.stringify({
      rows: [
        { id: "req", type: "req", count: 2 },
        { id: "scenario", type: "scenario", count: 1 },
        { id: "test", type: "test", count: 1 },
        { id: "adr", type: "adr", count: 1 },
        { id: "fact", type: "fact", count: 1 },
      ],
    });

    const prolog = createPrologStub(async (goal) => {
      const queryText = Array.isArray(goal) ? goal.join(" ") : goal;
      if (queryText.includes("coverage_report_json")) {
        return { success: true, bindings: { JsonString: fakeCounts } };
      }
      return emptyQueryResult();
    });

    const res = await handleKbAutopilotGenerate(prolog, {
      includeGenericMarkdown: true,
    });

    expect(res.structuredContent.activationState).toBe("root_active_seeded");
    expect(res.structuredContent.activationMode).toBe("attached_seeded_handoff");
    expect(res.structuredContent.applyBlocked).toBe(true);
    expect(res.structuredContent.candidates).toEqual([]);
    expect(res.structuredContent.activationReason.toLowerCase()).toContain("seeded");
    expect(res.content[0]?.text).not.toBe("Autopilot generated 0 candidate(s).");
  });

  test("root_active_thin handoff includes explicit KB tool recommended actions", async () => {
    createThinRepo(tmp, { multiRoot: true, noisy: true });

    const fakeCounts = JSON.stringify({
      rows: [
        { id: "req", type: "req", count: 1 },
        { id: "scenario", type: "scenario", count: 0 },
        { id: "test", type: "test", count: 0 },
      ],
    });

    const prolog = createPrologStub(async (goal) => {
      const queryText = Array.isArray(goal) ? goal.join(" ") : goal;
      if (queryText.includes("coverage_report_json")) {
        return { success: true, bindings: { JsonString: fakeCounts } };
      }
      return emptyQueryResult();
    });

    const res = await handleKbAutopilotGenerate(prolog, {
      includeGenericMarkdown: true,
    });

    const actions = res.structuredContent
      .recommendedActions as Array<RecommendedActionRecord>;
    const descriptions = actions.map((a) => String(a.description ?? ""));

    // Explicit handoff actions referencing KB tools
    expect(descriptions.some((d) => d.includes("kb_search"))).toBe(true);
    expect(descriptions.some((d) => d.includes("kb_briefing_generate"))).toBe(true);
    expect(descriptions.some((d) => d.includes("kb_find_gaps"))).toBe(true);

    // Confidence is low for thin attached KB
    const confidence = res.structuredContent.confidence as ConfidenceRecord;
    expect(confidence.level).toBe("low");
    expect(confidence.policy).toBe("handoff_only");
    expect(confidence.score).toBeLessThan(0.4);

    // PromptBlock includes handoff guidance
    const promptBlock = String(res.structuredContent.promptBlock ?? "");
    expect(promptBlock.length).toBeGreaterThan(0);
    expect(promptBlock.toLowerCase()).toContain("handoff");
  });

  test("root_active_seeded handoff includes explicit KB tool recommended actions", async () => {
    createSeededRepo(tmp);

    const fakeCounts = JSON.stringify({
      rows: [
        { id: "req", type: "req", count: 2 },
        { id: "scenario", type: "scenario", count: 1 },
        { id: "test", type: "test", count: 1 },
        { id: "adr", type: "adr", count: 1 },
        { id: "fact", type: "fact", count: 1 },
      ],
    });

    const prolog = createPrologStub(async (goal) => {
      const queryText = Array.isArray(goal) ? goal.join(" ") : goal;
      if (queryText.includes("coverage_report_json")) {
        return { success: true, bindings: { JsonString: fakeCounts } };
      }
      return emptyQueryResult();
    });

    const res = await handleKbAutopilotGenerate(prolog, {
      includeGenericMarkdown: true,
    });

    const actions = res.structuredContent
      .recommendedActions as Array<RecommendedActionRecord>;
    const descriptions = actions.map((a) => String(a.description ?? ""));

    // Explicit handoff actions referencing KB tools
    expect(descriptions.some((d) => d.includes("kb_search"))).toBe(true);
    expect(descriptions.some((d) => d.includes("kb_briefing_generate"))).toBe(true);
    expect(descriptions.some((d) => d.includes("kb_coverage"))).toBe(true);

    // Confidence is low for seeded attached KB
    const confidence = res.structuredContent.confidence as ConfidenceRecord;
    expect(confidence.level).toBe("low");
    expect(confidence.policy).toBe("handoff_only");

    // PromptBlock includes handoff guidance
    const promptBlock = String(res.structuredContent.promptBlock ?? "");
    expect(promptBlock.length).toBeGreaterThan(0);
    expect(promptBlock.toLowerCase()).toContain("handoff");
  });

  test("noisy cold-start repo surfaces scan warnings and diagnostic guidance", async () => {
    createColdStartRepo(tmp);
    createNoisyRepo(tmp);

    const prolog = createPrologStub(async () => emptyQueryResult());

    const res = await handleKbAutopilotGenerate(prolog, {
      includeGenericMarkdown: true,
      minConfidence: 0.8,
    });

    // Candidates should still be generated from real evidence
    const candidates = res.structuredContent.candidates as Array<Record<string, unknown>>;
    expect(candidates.length).toBeGreaterThan(0);

    // Discovery summary should have provider results
    const summary = res.structuredContent.discoverySummary as unknown as DiscoverySummaryRecord;
    expect((summary.providersRun ?? []).length).toBeGreaterThan(0);

    // PromptBlock should be non-empty with guidance
    const promptBlock = String(res.structuredContent.promptBlock ?? "");
    expect(promptBlock.length).toBeGreaterThan(0);

    // Confidence should be present and valid
    const confidence = res.structuredContent.confidence as ConfidenceRecord;
    expect(["high", "medium", "low"]).toContain(confidence.level ?? "");
    expect(["full_actions", "review_required", "handoff_only"]).toContain(confidence.policy ?? "");
  });

  test("confidence level transitions at correct thresholds", async () => {
    createColdStartRepo(tmp);

    const prolog = createPrologStub(async () => ({
      success: false,
      bindings: {},
      error: "no entities",
    }));

    // Cold start with full context → high confidence
    const highRes = await handleKbAutopilotGenerate(prolog, {
      includeGenericMarkdown: true,
      minConfidence: 0.8,
      bootstrapContext: {
        projectSummary: "Full context cold start.",
        sourceOfTruthPaths: ["README.md"],
        sourceOfTruthNotes: ["Test note."],
        priorityRoots: ["src"],
        verificationAnchors: ["bun test"],
      },
    });
    const highConf = highRes.structuredContent.confidence as ConfidenceRecord;
    expect(highConf.level).toBe("high");
    expect(highConf.policy).toBe("full_actions");
    expect(highConf.score).toBeGreaterThan(0.7);
    expect(highRes.structuredContent.applyBlocked).toBe(false);

    // Cold start without context but with candidates → medium or high confidence
    const medRes = await handleKbAutopilotGenerate(prolog, {
      includeGenericMarkdown: true,
      minConfidence: 0.8,
    });
    const medConf = medRes.structuredContent.confidence as ConfidenceRecord;
    // With candidates but no context, should be medium or high
    expect(["high", "medium"]).toContain(medConf.level ?? "");
    expect(["full_actions", "review_required"]).toContain(medConf.policy ?? "");

    // Vendored repo → low confidence
    const vendoredRoot = path.join(tmp, "vendored-check");
    await fs.mkdir(vendoredRoot, { recursive: true });
    createVendoredTree(vendoredRoot);
    process.env.KIBI_WORKSPACE = vendoredRoot;

    const lowRes = await handleKbAutopilotGenerate(prolog, {
      includeGenericMarkdown: true,
    });
    const lowConf = lowRes.structuredContent.confidence as ConfidenceRecord;
    expect(lowConf.level).toBe("low");
    expect(lowConf.policy).toBe("handoff_only");
    expect(lowConf.score).toBeLessThan(0.4);
    expect(lowRes.structuredContent.applyBlocked).toBe(true);
  });
});
