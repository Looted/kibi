import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildBootstrapCandidates } from "../../src/operations/bootstrap/candidates.js";
import type { BootstrapEvidence } from "../../src/operations/bootstrap/types.js";

type CandidateOptions = { ids: ReadonlySet<string>; workspaceRoot: string };
type CandidateInput = {
  markdownFiles?: readonly string[];
  manifestFiles?: readonly string[];
  evidence?: readonly BootstrapEvidence[];
};

function evidenceFor(
  filePath: string,
  kind: BootstrapEvidence["kind"],
  options: CandidateOptions,
): BootstrapEvidence {
  const relativePath = path
    .relative(options.workspaceRoot, filePath)
    .replaceAll("\\", "/");
  const provider =
    kind === "generic_markdown"
      ? "generic_repo_docs"
      : kind === "typed_markdown" || kind === "symbol_manifest"
        ? "typed_kibi_docs"
        : kind;
  return {
    provider,
    kind,
    label: relativePath,
    relativePath,
    absolutePath: filePath,
    content: fsSync.readFileSync(filePath, "utf8"),
    data: {},
  };
}

function allEvidence(
  input: CandidateInput,
  options: CandidateOptions,
): BootstrapEvidence[] {
  return [
    ...(input.evidence ?? []).map((item) => {
      const absolutePath =
        item.absolutePath ??
        (item.relativePath
          ? path.join(options.workspaceRoot, item.relativePath)
          : undefined);
      return item.content === undefined &&
        absolutePath &&
        fsSync.existsSync(absolutePath)
        ? {
            ...item,
            absolutePath,
            content: fsSync.readFileSync(absolutePath, "utf8"),
          }
        : absolutePath
          ? { ...item, absolutePath }
          : item;
    }),
    ...(input.manifestFiles ?? []).map((filePath) =>
      evidenceFor(filePath, "symbol_manifest", options),
    ),
    ...(input.markdownFiles ?? []).map((filePath) =>
      evidenceFor(filePath, "typed_markdown", options),
    ),
  ];
}

function buildTyped(
  input: CandidateInput,
  options: CandidateOptions,
  kind: "symbol_manifest" | "typed_markdown",
) {
  return buildBootstrapCandidates(
    allEvidence(input, options).filter((item) => item.kind === kind),
    options.ids,
    0.8,
    true,
  ).candidates;
}
function buildGeneric(
  input: CandidateInput,
  options: CandidateOptions,
  minConfidence: number,
) {
  return buildBootstrapCandidates(
    allEvidence(input, options).map((item) =>
      item.kind === "typed_markdown"
        ? {
            ...item,
            kind: "generic_markdown" as const,
            provider: "generic_repo_docs" as const,
          }
        : item,
    ),
    options.ids,
    minConfidence,
    true,
  ).candidates;
}
function buildProviders(
  input: CandidateInput,
  options: CandidateOptions,
  minConfidence: number,
) {
  return buildBootstrapCandidates(
    allEvidence(input, options),
    options.ids,
    minConfidence,
    true,
  ).candidates.filter(
    (candidate) =>
      !["generic_markdown", "typed_markdown", "symbol_manifest"].includes(
        candidate.sourceKind,
      ),
  );
}
function buildSignals(
  input: CandidateInput,
  options: CandidateOptions,
  minConfidence: number,
) {
  return buildBootstrapCandidates(
    allEvidence(input, options).map((item) =>
      item.kind === "typed_markdown"
        ? {
            ...item,
            kind: "generic_markdown" as const,
            provider: "generic_repo_docs" as const,
          }
        : item,
    ),
    options.ids,
    minConfidence,
    true,
  ).sourceOnlySignals;
}
const buildSymbolManifestCandidates = (
  input: CandidateInput,
  options: CandidateOptions,
) => buildTyped(input, options, "symbol_manifest");
const buildTypedMarkdownCandidates = (
  input: CandidateInput,
  options: CandidateOptions,
) => buildTyped(input, options, "typed_markdown");
const buildGenericMarkdownCandidates = (
  input: CandidateInput,
  options: CandidateOptions,
  minConfidence: number,
) => buildGeneric(input, options, minConfidence);
const buildNormativeRequirementCandidates = (
  input: CandidateInput,
  options: CandidateOptions,
  minConfidence: number,
) =>
  buildGeneric(input, options, minConfidence).filter(
    (candidate) => candidate.entityType === "req",
  );
const buildProviderEvidenceCandidates = (
  input: CandidateInput,
  options: CandidateOptions,
  minConfidence: number,
) => buildProviders(input, options, minConfidence);
const collectSourceOnlyAuthoringSignals = (
  input: CandidateInput,
  options: CandidateOptions,
  minConfidence: number,
) => buildSignals(input, options, minConfidence);

describe("bootstrap candidates", () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(
      path.join(os.tmpdir(), "kibi-bootstrap-candidates-"),
    );
  });

  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  test("symbol manifest candidates include extracted entities, relationships, and apply plans", async () => {
    const manifestPath = path.join(tmp, ".kb", "symbols.yaml");
    await fs.mkdir(path.dirname(manifestPath), { recursive: true });
    await fs.writeFile(
      manifestPath,
      [
        "symbols:",
        "  - id: symbol-auth-service",
        "    title: Auth service",
        "    sourceFile: src/auth-service.ts",
        "    status: active",
        "    relationships:",
        "      - type: implements",
        "        target: REQ-001",
        "",
      ].join("\n"),
    );

    const candidates = buildSymbolManifestCandidates(
      { manifestFiles: [manifestPath] },
      { ids: new Set<string>(), workspaceRoot: tmp },
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      candidateId: "mf:.kb/symbols.yaml:symbol-auth-service",
      entityType: "symbol",
      title: "Auth service",
      sourceKind: "symbol_manifest",
      sourcePath: manifestPath,
      confidence: 0.98,
      confidenceBand: "high",
      evidence: [
        "extracted_from_symbol_manifest:.kb/symbols.yaml",
        "entity_id:symbol-auth-service",
      ],
      relationships: [
        { type: "implements", from: "symbol-auth-service", to: "REQ-001" },
      ],
      applyPlan: [
        {
          type: "symbol",
          id: "symbol-auth-service",
          relationships: [
            { type: "implements", from: "symbol-auth-service", to: "REQ-001" },
          ],
        },
      ],
    });
  });

  test("typed markdown candidates prefer evidence-scoped files and skip existing entities", async () => {
    const requirementPath = path.join(tmp, ".kb", "requirements", "REQ-NEW.md");
    const skippedPath = path.join(tmp, ".kb", "requirements", "REQ-OLD.md");
    await fs.mkdir(path.dirname(requirementPath), { recursive: true });
    await fs.writeFile(
      requirementPath,
      [
        "---",
        "id: REQ-NEW",
        'title: "New requirement"',
        "status: open",
        "---",
        "# New requirement",
        "",
      ].join("\n"),
    );
    await fs.writeFile(
      skippedPath,
      [
        "---",
        "id: REQ-OLD",
        'title: "Old requirement"',
        "status: open",
        "---",
        "# Old requirement",
        "",
      ].join("\n"),
    );

    const candidates = buildTypedMarkdownCandidates(
      {
        markdownFiles: [skippedPath],
        evidence: [
          {
            provider: "typed_kibi_docs",
            kind: "typed_markdown",
            label: "REQ-NEW.md",
            relativePath: ".kb/requirements/REQ-NEW.md",
            absolutePath: requirementPath,
            data: {},
          },
        ],
      },
      { ids: new Set<string>(["REQ-OLD"]), workspaceRoot: tmp },
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      candidateId: "md:.kb/requirements/REQ-NEW.md:REQ-NEW",
      entityType: "req",
      title: "New requirement",
      sourceKind: "typed_markdown",
      sourcePath: requirementPath,
      confidence: 1,
      confidenceBand: "high",
      evidence: [
        "extracted_from_typed_markdown:.kb/requirements/REQ-NEW.md",
        "entity_id:REQ-NEW",
      ],
      relationships: [],
      applyPlan: [
        {
          type: "req",
          id: "REQ-NEW",
          relationships: [],
        },
      ],
    });
  });

  test("typed markdown candidates fall back to markdownFiles without provider evidence", async () => {
    const requirementPath = path.join(
      tmp,
      ".kb",
      "requirements",
      "REQ-FALLBACK.md",
    );
    await fs.mkdir(path.dirname(requirementPath), { recursive: true });
    await fs.writeFile(
      requirementPath,
      [
        "---",
        "id: REQ-FALLBACK",
        'title: "Fallback requirement"',
        "status: open",
        "---",
        "# Fallback requirement",
        "",
      ].join("\n"),
    );

    const candidates = buildTypedMarkdownCandidates(
      { markdownFiles: [requirementPath] },
      { ids: new Set<string>(), workspaceRoot: tmp },
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.candidateId).toBe(
      "md:.kb/requirements/REQ-FALLBACK.md:REQ-FALLBACK",
    );
  });

  test("generic markdown candidates cover ADR and fact headings with threshold filtering", async () => {
    const notesPath = path.join(tmp, "docs", "notes.md");
    await fs.mkdir(path.dirname(notesPath), { recursive: true });
    await fs.writeFile(
      notesPath,
      [
        "# ADR: Runtime Choice",
        "",
        "# Observations",
        "",
        "# Plain Heading",
        "",
      ].join("\n"),
    );

    const candidates = buildGenericMarkdownCandidates(
      { markdownFiles: [notesPath] },
      { ids: new Set<string>(), workspaceRoot: tmp },
      0.8,
    );

    expect(candidates.map((candidate) => candidate.entityType)).toEqual([
      "adr",
      "fact",
    ]);
    expect(candidates[0]).toMatchObject({
      candidateId: "gen:docs/notes.md:adr:adr-runtime-choice",
      title: "ADR: Runtime Choice",
      confidence: 0.9,
      confidenceBand: "medium",
      evidence: ["generic_heading:docs/notes.md#L1"],
      applyPlan: [
        {
          type: "adr",
          id: "ADR-GEN-ADR-RUNTIME-CHOICE",
          properties: {
            title: "ADR: Runtime Choice",
            status: "proposed",
            source: "bootstrap:generic:docs/notes.md",
            text_ref: "docs/notes.md#L1",
          },
          relationships: [],
        },
      ],
    });
    expect(candidates[1]).toMatchObject({
      candidateId: "gen:docs/notes.md:fact:observations",
      title: "Observations",
      applyPlan: [
        {
          type: "fact",
          id: "FACT-GEN-OBSERVATIONS",
          properties: {
            status: "active",
            fact_kind: "observation",
            text_ref: "docs/notes.md#L3",
          },
        },
      ],
    });
  });

  test("source-only authoring signals include scenarios and tests with deterministic tie sorting", async () => {
    const docsPath = path.join(tmp, "docs", "planning.md");
    const evidencePath = path.join(tmp, "topology.test.ts");
    await fs.mkdir(path.dirname(docsPath), { recursive: true });
    await fs.writeFile(
      docsPath,
      ["# Test Plan", "", "# Scenarios", "", "# Verification", ""].join("\n"),
    );

    const requirementsPath = path.join(tmp, "docs", "requirements.md");
    await fs.writeFile(requirementsPath, "# Requirements\n");

    const signals = collectSourceOnlyAuthoringSignals(
      {
        markdownFiles: [docsPath, requirementsPath],
        evidence: [
          {
            provider: "test_topology",
            kind: "test_topology",
            label: "topology.test.ts",
            relativePath: "topology.test.ts",
            absolutePath: evidencePath,
            data: { confidence: 0.83, evidence: ["real-evidence", 42] },
          },
        ],
      },
      { ids: new Set<string>(), workspaceRoot: tmp },
      0.8,
    );

    expect(signals.map((signal) => signal.kind)).toEqual([
      "req",
      "scenario",
      "test",
      "test",
      "test",
    ]);
    expect(signals[0]).toMatchObject({
      kind: "req",
      title: "Author requirements from Requirements",
      confidence: 0.84,
      evidence: ["generic_heading:docs/requirements.md#L1"],
    });
    expect(signals[1]).toMatchObject({
      kind: "scenario",
      title: "Author scenarios from Scenarios",
      confidence: 0.83,
      evidence: ["generic_heading:docs/planning.md#L3"],
    });
    expect(signals[2]).toMatchObject({
      kind: "test",
      title: "Author TEST coverage for topology.test.ts",
      sourcePath: evidencePath,
      confidence: 0.83,
      evidence: ["real-evidence"],
    });
    expect(signals[3]).toMatchObject({
      kind: "test",
      title: "Author tests from Test Plan",
      confidence: 0.82,
      evidence: ["generic_heading:docs/planning.md#L1"],
    });
    expect(signals[4]).toMatchObject({
      kind: "test",
      title: "Author tests from Verification",
      confidence: 0.82,
      evidence: ["generic_heading:docs/planning.md#L5"],
    });
  });

  test("source-only authoring signals author scenario and test headings from provider-scoped markdown", async () => {
    const planningPath = path.join(tmp, "planning", "backlog.md");
    await fs.mkdir(path.dirname(planningPath), { recursive: true });
    await fs.writeFile(
      planningPath,
      ["# Scenarios", "", "# Verification", "", "# Tests", ""].join("\n"),
    );

    const signals = collectSourceOnlyAuthoringSignals(
      {
        evidence: [
          {
            provider: "generic_repo_docs",
            kind: "generic_markdown",
            label: "backlog.md",
            relativePath: "planning/backlog.md",
            absolutePath: planningPath,
            data: {},
          },
        ],
      },
      { ids: new Set<string>(), workspaceRoot: tmp },
      0.82,
    );

    expect(signals).toHaveLength(3);
    expect(signals[0]).toMatchObject({
      kind: "scenario",
      title: "Author scenarios from Scenarios",
      sourcePath: planningPath,
      confidence: 0.83,
      evidence: ["generic_heading:planning/backlog.md#L1"],
    });
    expect(signals[1]).toMatchObject({
      kind: "test",
      title: "Author tests from Verification",
      sourcePath: planningPath,
      confidence: 0.82,
      evidence: ["generic_heading:planning/backlog.md#L3"],
    });
    expect(signals[2]).toMatchObject({
      kind: "test",
      title: "Author tests from Tests",
      sourcePath: planningPath,
      confidence: 0.82,
      evidence: ["generic_heading:planning/backlog.md#L5"],
    });
  });

  test("source-only authoring signals include provider-scoped markdown headings and sort equal test signals by source", async () => {
    const planningPath = path.join(tmp, "notes", "planning.md");
    await fs.mkdir(path.dirname(planningPath), { recursive: true });
    await fs.writeFile(
      planningPath,
      ["# Scenarios", "", "# Verification", "", "# Tests", ""].join("\n"),
    );

    const alphaPath = path.join(tmp, "alpha.test.ts");
    const betaPath = path.join(tmp, "beta.test.ts");
    const signals = collectSourceOnlyAuthoringSignals(
      {
        markdownFiles: [],
        evidence: [
          {
            provider: "generic_repo_docs",
            kind: "generic_markdown",
            label: "planning.md",
            relativePath: "notes/planning.md",
            absolutePath: planningPath,
            data: {},
          },
          {
            provider: "test_topology",
            kind: "test_topology",
            label: "beta.test.ts",
            relativePath: "beta.test.ts",
            absolutePath: betaPath,
            data: { confidence: 0.82 },
          },
          {
            provider: "test_topology",
            kind: "test_topology",
            label: "alpha.test.ts",
            relativePath: "alpha.test.ts",
            absolutePath: alphaPath,
            data: { confidence: 0.82 },
          },
        ],
      },
      { ids: new Set<string>(), workspaceRoot: tmp },
      0.82,
    );

    expect(signals.map((signal) => signal.title)).toEqual([
      "Author scenarios from Scenarios",
      "Author TEST coverage for alpha.test.ts",
      "Author TEST coverage for beta.test.ts",
      "Author tests from Verification",
      "Author tests from Tests",
    ]);
    expect(signals[0]).toMatchObject({
      kind: "scenario",
      confidence: 0.83,
      evidence: ["generic_heading:notes/planning.md#L1"],
    });
    expect(signals.slice(1).map((signal) => signal.sourcePath)).toEqual([
      alphaPath,
      betaPath,
      planningPath,
      planningPath,
    ]);
    expect(signals[1]).toMatchObject({
      kind: "test",
      confidence: 0.82,
      evidence: ["test_topology:alpha.test.ts"],
    });
  });

  test("source-only authoring signals include provider-scoped scenario and test headings sorted by kind and path", async () => {
    const scenarioPath = path.join(tmp, "docs", "planning", "beta.md");
    const testPath = path.join(tmp, "docs", "planning", "alpha.md");
    await fs.mkdir(path.dirname(scenarioPath), { recursive: true });
    await fs.writeFile(
      scenarioPath,
      ["# Scenarios", "", "# Tests", ""].join("\n"),
    );
    await fs.writeFile(testPath, ["# Tests", ""].join("\n"));

    const signals = collectSourceOnlyAuthoringSignals(
      { markdownFiles: [scenarioPath, testPath] },
      { ids: new Set<string>(), workspaceRoot: tmp },
      0.82,
    );

    expect(signals).toEqual([
      {
        kind: "scenario",
        title: "Author scenarios from Scenarios",
        sourcePath: scenarioPath,
        confidence: 0.83,
        evidence: ["generic_heading:docs/planning/beta.md#L1"],
      },
      {
        kind: "test",
        title: "Author tests from Tests",
        sourcePath: testPath,
        confidence: 0.82,
        evidence: ["generic_heading:docs/planning/alpha.md#L1"],
      },
      {
        kind: "test",
        title: "Author tests from Tests",
        sourcePath: scenarioPath,
        confidence: 0.82,
        evidence: ["generic_heading:docs/planning/beta.md#L3"],
      },
    ]);
  });

  test("normative requirement scanning ignores fenced code before modeling candidates", async () => {
    const readmePath = path.join(tmp, "README.md");
    await fs.writeFile(
      readmePath,
      [
        "# Requirements",
        "```",
        "Customer data must be retained for 7 years.",
        "```",
        "Customer data should be retained for 7 years.",
        "",
      ].join("\n"),
    );

    const candidates = buildNormativeRequirementCandidates(
      { markdownFiles: [readmePath] },
      { ids: new Set<string>(), workspaceRoot: tmp },
      0.5,
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      entityType: "req",
      title: "Customer data should be retained for 7 years.",
      confidenceBand: "medium",
      evidence: [
        "normative_statement:README.md#L5",
        "generic_heading:README.md#L1",
      ],
    });
    expect(candidates[0]?.title).not.toContain("must be retained");
  });

  test("normative requirement candidates report low confidence for weak statements outside tilde fences", async () => {
    const readmePath = path.join(tmp, "README.md");
    await fs.writeFile(
      readmePath,
      [
        "# Notes",
        "~~~",
        "System logs should be stored for 30 days.",
        "~~~",
        "System logs should be stored for 90 days.",
        "",
      ].join("\n"),
    );

    const candidates = buildNormativeRequirementCandidates(
      { markdownFiles: [readmePath] },
      { ids: new Set<string>(), workspaceRoot: tmp },
      0.5,
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      entityType: "req",
      title: "System logs should be stored for 90 days.",
      confidenceBand: "low",
      evidence: [
        "normative_statement:README.md#L5",
        "generic_heading:README.md#L1",
      ],
    });
  });

  test("normative requirement scanning ignores tilde fenced code blocks", async () => {
    const readmePath = path.join(tmp, "README.md");
    await fs.writeFile(
      readmePath,
      [
        "# Requirements",
        "~~~text",
        "Invoices must be archived for 7 years.",
        "~~~",
        "Invoices should be archived for 7 years.",
        "",
      ].join("\n"),
    );

    const candidates = buildNormativeRequirementCandidates(
      { markdownFiles: [readmePath] },
      { ids: new Set<string>(), workspaceRoot: tmp },
      0.5,
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      entityType: "req",
      title: "Invoices should be archived for 7 years.",
      evidence: [
        "normative_statement:README.md#L5",
        "generic_heading:README.md#L1",
      ],
    });
    expect(candidates[0]?.title).not.toContain("must be archived");
  });

  test("normative requirement scanning handles tilde fences and low-confidence candidates", async () => {
    const readmePath = path.join(tmp, "README.md");
    await fs.writeFile(
      readmePath,
      [
        "# Notes",
        "~~~ts",
        "Draft exports must include internal diagnostics.",
        "~~~",
        "The system should support exports.",
        "",
      ].join("\n"),
    );

    const candidates = buildNormativeRequirementCandidates(
      { markdownFiles: [readmePath] },
      { ids: new Set<string>(), workspaceRoot: tmp },
      0.1,
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      entityType: "req",
      title: "The system should support exports.",
      confidenceBand: "low",
      evidence: [
        "normative_statement:README.md#L5",
        "generic_heading:README.md#L1",
      ],
    });
    expect(candidates[0]?.title).not.toContain("internal diagnostics");
  });

  test("provider evidence defaults repo metadata facts to meta and lower confidence to low", () => {
    const candidates = buildProviderEvidenceCandidates(
      {
        evidence: [
          {
            provider: "repo_metadata",
            kind: "repo_metadata",
            label: "package.json",
            relativePath: "package.json",
            data: { confidence: 0.75 },
          },
        ],
      },
      { ids: new Set<string>(), workspaceRoot: tmp },
      0.7,
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      candidateId: "prov:repo_metadata:package-json",
      entityType: "fact",
      title: "Bootstrap evidence from package.json",
      sourceKind: "repo_metadata",
      sourcePath: path.join(tmp, "package.json"),
      confidence: 0.75,
      confidenceBand: "low",
      evidence: ["provider:repo_metadata", "repo_metadata:package.json"],
      applyPlan: [
        {
          type: "fact",
          id: "FACT-GEN-REPO-METADATA-PACKAGE-JSON",
          properties: {
            title: "Bootstrap evidence from package.json",
            status: "active",
            fact_kind: "meta",
            source: "bootstrap:repo_metadata:package.json",
            text_ref: "package.json",
          },
          relationships: [],
        },
      ],
    });
  });

  test("provider evidence defaults source module facts to observations", () => {
    const candidates = buildProviderEvidenceCandidates(
      {
        evidence: [
          {
            provider: "source_symbols",
            kind: "source_symbols",
            label: "src/service.ts",
            relativePath: "src/service.ts",
            data: { confidence: 0.8, title: "Discovered source symbols" },
          },
        ],
      },
      { ids: new Set<string>(), workspaceRoot: tmp },
      0.8,
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      candidateId: "prov:source_symbols:src-service-ts",
      title: "Discovered source symbols",
      confidenceBand: "medium",
      evidence: ["provider:source_symbols", "source_symbols:src/service.ts"],
      applyPlan: [
        {
          type: "fact",
          id: "FACT-GEN-SOURCE-SYMBOLS-SRC-SERVICE-TS",
          properties: {
            fact_kind: "observation",
            source: "bootstrap:source_symbols:src/service.ts",
            text_ref: "src/service.ts",
          },
          relationships: [],
        },
      ],
    });
  });

  test("provider evidence defaults source symbol facts to observations", () => {
    const candidates = buildProviderEvidenceCandidates(
      {
        evidence: [
          {
            provider: "source_symbols",
            kind: "source_symbols",
            label: "src/service.ts#Service",
            relativePath: "src/service.ts#Service",
            data: { confidence: 0.91, title: "Service symbol inventory" },
          },
        ],
      },
      { ids: new Set<string>(), workspaceRoot: tmp },
      0.8,
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      candidateId: "prov:source_symbols:src-service-ts-service",
      entityType: "fact",
      title: "Service symbol inventory",
      sourceKind: "source_symbols",
      sourcePath: path.join(tmp, "src/service.ts#Service"),
      confidence: 0.91,
      confidenceBand: "high",
      evidence: [
        "provider:source_symbols",
        "source_symbols:src/service.ts#Service",
      ],
      applyPlan: [
        {
          type: "fact",
          id: "FACT-GEN-SOURCE-SYMBOLS-SRC-SERVICE-TS-SERVICE",
          properties: {
            title: "Service symbol inventory",
            status: "active",
            fact_kind: "observation",
            source: "bootstrap:source_symbols:src/service.ts#Service",
            text_ref: "src/service.ts#Service",
          },
          relationships: [],
        },
      ],
    });
  });

  test("provider evidence defaults non-metadata facts to observations with low confidence", () => {
    const candidates = buildProviderEvidenceCandidates(
      {
        evidence: [
          {
            provider: "source_symbols",
            kind: "source_symbols",
            label: "src/index.ts",
            relativePath: "src/index.ts#exports",
            data: { confidence: 0.79, title: "Source symbol inventory" },
          },
        ],
      },
      { ids: new Set<string>(), workspaceRoot: tmp },
      0.7,
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      candidateId: "prov:source_symbols:src-index-ts-exports",
      entityType: "fact",
      title: "Source symbol inventory",
      sourceKind: "source_symbols",
      sourcePath: path.join(tmp, "src/index.ts#exports"),
      confidence: 0.79,
      confidenceBand: "low",
      evidence: [
        "provider:source_symbols",
        "source_symbols:src/index.ts#exports",
      ],
      applyPlan: [
        {
          type: "fact",
          id: "FACT-GEN-SOURCE-SYMBOLS-SRC-INDEX-TS-EXPORTS",
          properties: {
            title: "Source symbol inventory",
            status: "active",
            fact_kind: "observation",
            source: "bootstrap:source_symbols:src/index.ts#exports",
            text_ref: "src/index.ts#exports",
          },
          relationships: [],
        },
      ],
    });
  });
});
