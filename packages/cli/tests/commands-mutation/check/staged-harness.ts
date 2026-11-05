import { spyOn } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { checkCommand } from "../../../src/commands/check.js";
import * as markdown from "../../../src/extractors/markdown.js";
import * as generated from "../../../src/plugins/generated-sources.js";
import * as maintenance from "../../../src/plugins/maintenance-source-analysis.js";
import * as sourceChanges from "../../../src/plugins/source-change-analysis.js";
import * as impactDiagnostics from "../../../src/public/impact-diagnostics.js";
import * as commitAmend from "../../../src/traceability/commit-amend.js";
import * as snapshotModule from "../../../src/traceability/git-change-snapshot.js";
import * as impactEvaluator from "../../../src/traceability/impact-evaluator.js";
import * as markdownValidate from "../../../src/traceability/markdown-validate.js";
import * as snapshotKnowledge from "../../../src/traceability/snapshot-knowledge.js";
import * as consistency from "../../../src/traceability/staged-consistency.js";
import * as stagedDiagnostics from "../../../src/traceability/staged-diagnostics.js";
import * as entityContext from "../../../src/traceability/staged-entity-context.js";
import * as entityIdStyle from "../../../src/traceability/staged-entity-id-style.js";
import * as fileCoverage from "../../../src/traceability/staged-file-coverage.js";
import * as impactContract from "../../../src/traceability/staged-impact-contract.js";
import * as inventoryDrift from "../../../src/traceability/staged-inventory-drift.js";
import * as migration from "../../../src/traceability/staged-migration.js";
import * as symbolsManifest from "../../../src/traceability/staged-symbols-manifest.js";
import * as symbolExtract from "../../../src/traceability/symbol-extract.js";
import * as tempKb from "../../../src/traceability/temp-kb.js";
import * as validate from "../../../src/traceability/validate.js";

// biome-ignore lint/suspicious/noExplicitAny: the stand-ins answer any shape.
type Impl = (...args: any[]) => any;

/** One staged path as the snapshot inventory lists it. */
export function entry(
  filePath: string,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    path: filePath,
    status: "M",
    analysisDepth: "file",
    disposition: "checked",
    hunkRanges: [{ start: 1, end: 3 }],
    content: `content of ${filePath}`,
    ...extra,
  };
}

/** A source analysis side with `status`. */
export function side(
  status: string,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    status,
    language: "typescript",
    symbols: [{}, {}],
    providerId: "ts",
    inputFingerprint: "in",
    providerFingerprint: "pf",
    ...extra,
  };
}

/** A staged-check world whose collaborators are all stand-ins. */
export function stagedHarness() {
  const calls: Record<string, unknown[][]> = {};
  const record = (name: string, args: unknown[]) => {
    const list = calls[name] ?? [];
    list.push(args);
    calls[name] = list;
  };
  const logs: string[] = [];
  const errors: string[] = [];
  const restores: Array<() => void> = [];
  const tempDirs: string[] = [];
  const world = {
    inventory: [] as Array<Record<string, unknown>>,
    analysis: new Map<string, Record<string, unknown>>(),
    entities: [] as unknown[],
    git: (args: readonly string[]): string => {
      throw new Error(`no git answer for ${args.join(" ")}`);
    },
    snapshot: {} as Record<string, unknown>,
  };
  world.snapshot = {
    baseTree: "BASE",
    headTree: "HEAD",
    headCommit: "C1",
    readBlobs: () => new Map(),
    assertUnchanged: () => {
      record("assertUnchanged", []);
    },
    readGit: (args: readonly string[]) => Buffer.from(world.git(args)),
  };
  const service = {
    analyzeTextV2: async (name: string, text: string) => ({
      analyzed: name,
      text,
    }),
  };

  const impls: Record<string, Impl> = {
    captureStagedSnapshot: () => ({
      ...world.snapshot,
      inventory: world.inventory,
    }),
    readSnapshotSourceConfig: () => ({ generatedPaths: ["gen/**"] }),
    createMaintenanceSourceAnalysisService: () => service,
    fingerprintMaintenanceSourceSet: () => "PSET",
    analyzeSourceChanges: async () => world.analysis,
    assertSourceAnalysisGate: () => {},
    partialAnalysisReviews: () => [],
    hasValidBaseImpactPolicy: () => false,
    evaluateImpactReview: () => ({ passed: true, diagnostics: [] }),
    fingerprintImpactEvaluator: () => "EVAL",
    partialAnalysisSymbolsUsable: () => false,
    extractSymbolsFromStagedFileAsync: async () => [],
    stagedGeneratedPaths: () => new Set<string>(),
    analyzeStagedFileCoverage: () => ({
      version: 1,
      files: [],
      diagnostics: [],
    }),
    validateStagedMarkdown: () => ({ errors: [] }),
    readSnapshotKnowledge: () => world.entities,
    stagesKnowledge: () => false,
    collectIntroducedConsistencyViolations: async () => [],
    formatConsistencyViolations: (violations: unknown[], label?: string) => [
      `consistency ${label ?? "-"} ${violations.length}`,
    ],
    collectIntroducedEntityContextViolations: () => [],
    amendsRootCommit: () => false,
    stagedInventoryDriftViolations: () => [],
    stagedStatementDriftViolations: () => [],
    extractFromMarkdownString: (_content: string, filePath: string) => ({
      entity: { id: `ID:${filePath}`, type: "req", title: filePath },
      relationships: [],
    }),
    stagedCommitCarriesMigration: () => false,
    assessStagedSymbolsManifest: () => ({
      path: ".kb/symbols.yaml",
      state: "unchanged",
      sourcePaths: [],
    }),
    collectStagedAuthoredSymbolsManifestEvidence: () => ({
      path: ".kb/symbols.yaml",
      changedEntityIds: [],
      entries: [],
    }),
    isBehaviorSourceEdit: () => false,
    collectStagedKibiDiagnostics: () => [],
    createSymbolGranularityDiagnostics: () => [],
    createSymbolQualityDiagnostics: () => [],
    createSemanticReviewDiagnostics: () => [],
    createStagedEntityIdStyleDiagnostics: () => [],
    hasBlockingImpactDiagnostics: (
      diagnostics: Array<{ blocking?: boolean }>,
    ) => diagnostics.some((diagnostic) => diagnostic.blocking === true),
    createTempKb: async () => {
      const tempDir = mkdtempSync(path.join(os.tmpdir(), "kibi-staged-kb-"));
      tempDirs.push(tempDir);
      return {
        tempDir,
        kbPath: tempDir,
        overlayPath: path.join(tempDir, "overlay.pl"),
        prolog: { name: "temp-prolog" },
      };
    },
    projectStagedEntities: async () => {},
    createOverlayFacts: () => "overlay_facts.\n",
    consultOverlay: async () => {},
    cleanupTempKb: async () => {},
    validateStagedSymbols: async () => [],
    validateStagedSymbolCoverage: async () => [],
    formatCoverageViolations: (violations: unknown[]) =>
      `coverage ${violations.length}`,
    formatViolations: (violations: unknown[]) =>
      `violations ${violations.length}`,
  };

  const targets: Array<[object, string]> = [
    [snapshotModule, "captureStagedSnapshot"],
    [maintenance, "readSnapshotSourceConfig"],
    [maintenance, "createMaintenanceSourceAnalysisService"],
    [maintenance, "fingerprintMaintenanceSourceSet"],
    [sourceChanges, "analyzeSourceChanges"],
    [sourceChanges, "assertSourceAnalysisGate"],
    [sourceChanges, "partialAnalysisReviews"],
    [impactEvaluator, "hasValidBaseImpactPolicy"],
    [impactEvaluator, "evaluateImpactReview"],
    [impactEvaluator, "fingerprintImpactEvaluator"],
    [symbolExtract, "partialAnalysisSymbolsUsable"],
    [symbolExtract, "extractSymbolsFromStagedFileAsync"],
    [generated, "stagedGeneratedPaths"],
    [fileCoverage, "analyzeStagedFileCoverage"],
    [markdownValidate, "validateStagedMarkdown"],
    [snapshotKnowledge, "readSnapshotKnowledge"],
    [consistency, "stagesKnowledge"],
    [consistency, "collectIntroducedConsistencyViolations"],
    [consistency, "formatConsistencyViolations"],
    [entityContext, "collectIntroducedEntityContextViolations"],
    [commitAmend, "amendsRootCommit"],
    [inventoryDrift, "stagedInventoryDriftViolations"],
    [inventoryDrift, "stagedStatementDriftViolations"],
    [markdown, "extractFromMarkdownString"],
    [migration, "stagedCommitCarriesMigration"],
    [symbolsManifest, "assessStagedSymbolsManifest"],
    [symbolsManifest, "collectStagedAuthoredSymbolsManifestEvidence"],
    [impactContract, "isBehaviorSourceEdit"],
    [stagedDiagnostics, "collectStagedKibiDiagnostics"],
    [impactDiagnostics, "createSymbolGranularityDiagnostics"],
    [impactDiagnostics, "createSymbolQualityDiagnostics"],
    [impactDiagnostics, "createSemanticReviewDiagnostics"],
    [impactDiagnostics, "hasBlockingImpactDiagnostics"],
    [entityIdStyle, "createStagedEntityIdStyleDiagnostics"],
    [tempKb, "createTempKb"],
    [tempKb, "projectStagedEntities"],
    [tempKb, "createOverlayFacts"],
    [tempKb, "consultOverlay"],
    [tempKb, "cleanupTempKb"],
    [validate, "validateStagedSymbols"],
    [validate, "validateStagedSymbolCoverage"],
    [validate, "formatCoverageViolations"],
    [validate, "formatViolations"],
  ];
  for (const [module, name] of targets) {
    const spy = spyOn(module as Record<string, Impl>, name).mockImplementation(
      (...args: unknown[]) => {
        record(name, args);
        return (impls[name] as Impl)(...args);
      },
    );
    restores.push(() => spy.mockRestore());
  }
  const log = spyOn(console, "log").mockImplementation((...args: unknown[]) => {
    logs.push(args.map(String).join(" "));
  });
  const error = spyOn(console, "error").mockImplementation(
    (message: unknown) => {
      errors.push(String(message));
    },
  );
  restores.push(
    () => log.mockRestore(),
    () => error.mockRestore(),
  );

  return {
    world,
    calls,
    logs,
    errors,
    service,
    /** Replace one collaborator's answer. */
    set(name: string, impl: Impl) {
      if (!(name in impls)) throw new Error(`unknown collaborator ${name}`);
      impls[name] = impl;
    },
    /** Run a staged check, answering in json unless `format` says otherwise. */
    async run(options: Record<string, unknown> = {}) {
      const result = await checkCommand({
        staged: true,
        kbPath: "/explicit/kb",
        format: "json",
        ...options,
      });
      return result.exitCode;
    },
    /** The structured result the last json run printed. */
    output(): Record<string, unknown> {
      const last = logs.at(-1);
      if (last === undefined) throw new Error("nothing printed");
      return (
        JSON.parse(last) as { structuredContent: Record<string, unknown> }
      ).structuredContent;
    },
    restore() {
      for (const restore of restores.splice(0)) restore();
      for (const dir of tempDirs.splice(0))
        rmSync(dir, { recursive: true, force: true });
    },
  };
}

export type StagedHarness = ReturnType<typeof stagedHarness>;
