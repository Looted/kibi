/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { existsSync, readFileSync } from "node:fs";
import * as path from "node:path";
import { getBranchOverride, isCliTraceOrDebugEnabled } from "../env.js";
import {
  extractFromManifest,
  extractFromManifestString,
} from "../extractors/manifest.js";
import {
  type ExtractionResult,
  extractFromMarkdownString,
} from "../extractors/markdown.js";
import { PrologProcess } from "../prolog.js";
import {
  escapeAtom,
  parseTriples,
  parseViolationRows,
} from "../prolog/codec.js";
import {
  getBehavioralSymbolNames,
  getNonBehavioralSymbolNames,
  isAllowedGranularityReason,
  isTraceabilityRelationshipType,
} from "../public/symbol-granularity.js";
import {
  KIBI_NO_IMPACT_DECLARATION,
  KIBI_SYMBOLS_MANIFEST_PATH,
  KIBI_SYMBOL_COORDINATES_PATH,
  type KibiEntityType,
  type KibiImpactEvidence,
} from "../traceability/evidence-model.js";
import { type StagedFile, getStagedFiles } from "../traceability/git-staged.js";
import { validateStagedMarkdown } from "../traceability/markdown-validate.js";
import {
  type KibiImpactDiagnostic,
  collectStagedKibiDiagnostics,
} from "../traceability/staged-diagnostics.js";
import {
  classifyKibiImpactEvidence,
  isBehaviorSourceEdit,
  parseKibiImpactOverride,
} from "../traceability/staged-impact-contract.js";
import {
  assessStagedSymbolsManifest,
  collectStagedAuthoredSymbolsManifestEvidence,
} from "../traceability/staged-symbols-manifest.js";
import {
  type ManifestLookup,
  createManifestLookupSentinelKey,
  extractSymbolsFromStagedFile,
} from "../traceability/symbol-extract.js";
import {
  cleanupTempKb,
  consultOverlay,
  createOverlayFacts,
  createTempKb,
  projectStagedEntities,
} from "../traceability/temp-kb.js";
import {
  formatViolations as formatStagedViolations,
  validateStagedSymbols,
} from "../traceability/validate.js";
import { loadConfig } from "../utils/config.js";
import { safeCleanupProlog } from "../utils/prolog-cleanup.js";
import {
  type ChecksConfig,
  RULES,
  type Violation,
  getEffectiveRules,
} from "../utils/rule-registry.js";

export type { Violation };
import { runAggregatedChecks } from "./aggregated-checks.js";
import { getCurrentBranch } from "./init-helpers.js";

export interface CheckOptions {
  fix?: boolean;
  kbPath?: string;
  rules?: string; // comma separated allowlist
  staged?: boolean;
  minLinks?: string | number;
  dryRun?: boolean;
}

function getMatchGroup(
  match: RegExpMatchArray | null,
  index = 1,
): string | null {
  const value = match?.[index];
  return typeof value === "string" ? value : null;
}

function buildManifestLookup(stagedFiles: ReturnType<typeof getStagedFiles>): {
  manifestLookup: ManifestLookup;
  manifestResults: ExtractionResult[];
  authoredSymbolResults: ExtractionResult[];
  stagedAuthoredSymbolResults: ExtractionResult[];
} {
  const manifestLookup: ManifestLookup = new Map();
  const manifestResults: ExtractionResult[] = [];
  const authoredSymbolResults: ExtractionResult[] = [];
  const stagedAuthoredSymbolResults: ExtractionResult[] = [];

  // Pre-populate lookup from working-tree manifests so that code-only changes
  // (where symbols.yaml is not staged) still resolve to the correct symbol IDs
  // and relationships already defined on disk.
  const config = loadConfig(process.cwd());
  const symbolsRelPath = config.paths.symbols;
  if (symbolsRelPath) {
    const absSymbolsPath = path.resolve(process.cwd(), symbolsRelPath);
    if (existsSync(absSymbolsPath)) {
      try {
        const entries = extractFromManifest(absSymbolsPath);
        for (const entry of entries) {
          authoredSymbolResults.push(entry);
          const sourceFile =
            entry.sourceFile || entry.entity.source || absSymbolsPath;
          const key = `${sourceFile}:${entry.entity.title}`;
          manifestLookup.set(key, {
            id: entry.entity.id,
            relationships: entry.relationships
              .filter(
                (relationship) =>
                  relationship.type === "implements" ||
                  relationship.type === "covered_by" ||
                  relationship.type === "executable_for",
              )
              .map((relationship) => ({
                type: relationship.type,
                to: relationship.to,
              })),
          });
        }
      } catch (e) {
        // Ignore working-tree manifest parsing errors; staged-only fallback still applies
        if (isCliTraceOrDebugEnabled()) {
          const msg = e instanceof Error ? e.message : String(e);
          console.debug(
            `[kibi] skipping working-tree manifest ${absSymbolsPath}: ${msg}`,
          );
        }
      }
    }
  }

  const stagedManifestFiles = stagedFiles.filter(
    (file) =>
      file.content !== undefined &&
      (file.path.endsWith("/symbols.yaml") ||
        file.path.endsWith("/symbols.yml") ||
        file.path === "symbols.yaml" ||
        file.path === "symbols.yml"),
  );

  for (const manifestFile of stagedManifestFiles) {
    manifestLookup.set(createManifestLookupSentinelKey(manifestFile.path), {
      id: manifestFile.path,
      relationships: [],
    });

    try {
      const entries = extractFromManifestString(
        manifestFile.content ?? "",
        manifestFile.path,
      );
      for (const entry of entries) {
        manifestResults.push({
          entity: entry.entity,
          relationships: entry.relationships,
          ...(entry.sourceFile !== undefined
            ? { sourceFile: entry.sourceFile }
            : {}),
        });
        const authoredSymbolResult = {
          entity: entry.entity,
          relationships: entry.relationships,
          ...(entry.sourceFile !== undefined
            ? { sourceFile: entry.sourceFile }
            : {}),
        };
        authoredSymbolResults.push(authoredSymbolResult);
        stagedAuthoredSymbolResults.push(authoredSymbolResult);

        const sourceFile =
          entry.sourceFile || entry.entity.source || manifestFile.path;
        const key = `${sourceFile}:${entry.entity.title}`;
        manifestLookup.set(key, {
          id: entry.entity.id,
          relationships: entry.relationships
            .filter(
              (relationship) =>
                relationship.type === "implements" ||
                relationship.type === "covered_by" ||
                relationship.type === "executable_for",
            )
            .map((relationship) => ({
              type: relationship.type,
              to: relationship.to,
            })),
        });
      }
    } catch {
      // Ignore manifest parsing errors
    }
  }

  return {
    manifestLookup,
    manifestResults,
    authoredSymbolResults,
    stagedAuthoredSymbolResults,
  };
}

function hasTraceabilityRelationship(result: ExtractionResult): boolean {
  return result.relationships.some((relationship) =>
    isTraceabilityRelationshipType(relationship.type),
  );
}

function hasValidGranularityReason(result: ExtractionResult): boolean {
  return isAllowedGranularityReason(result.entity.granularity_reason);
}

function createSymbolGranularityDiagnostics(options: {
  manifestResults: ExtractionResult[];
  symbolsByFile: Map<string, ReturnType<typeof extractSymbolsFromStagedFile>>;
  sourceContentByFile: Map<string, string>;
}): KibiImpactDiagnostic[] {
  const diagnostics: KibiImpactDiagnostic[] = [];

  for (const result of options.manifestResults) {
    if (!result.sourceFile) continue;
    if (!hasTraceabilityRelationship(result)) continue;
    if (hasValidGranularityReason(result)) continue;

    const granularSymbols = getGranularSymbolsForSourceFile(
      result.sourceFile,
      options.symbolsByFile,
      options.sourceContentByFile,
    );
    if (granularSymbols.length === 0) continue;
    const granularNames = [
      ...new Set(granularSymbols.map((s) => s.name)),
    ].sort();
    if (granularNames.includes(result.entity.title)) continue;

    const behavioralNames = getBehavioralSymbolNames(granularSymbols);
    if (behavioralNames.length === 0) continue;

    const nonBehavioralNames = getNonBehavioralSymbolNames(granularSymbols);
    const ignoredSymbolsSuggestion =
      nonBehavioralNames.length > 0
        ? ` Non-behavioral symbols ignored for this decision: ${nonBehavioralNames.join(
            ", ",
          )}.`
        : "";

    diagnostics.push({
      id: "symbol_granularity_violation",
      severity: "error",
      files: [result.entity.source, result.sourceFile],
      docs: ["docs/symbol-traceability-taxonomy.md"],
      message: `Symbol ${result.entity.id} links ${result.sourceFile} coarsely while granular symbols are available (behavioral only): ${behavioralNames.join(", ")}`,
      suggestion: `Move ownership/coverage/test relationships to the narrow behavioral symbol, add a manifest behavioral anchor, or add granularity_reason with config-artifact, module-level-behavior, extractor-miss, or legacy-link when the coarse symbol is intentional.${ignoredSymbolsSuggestion}`,
    });
  }

  return diagnostics;
}

function getGranularSymbolsForSourceFile(
  sourceFile: string,
  symbolsByFile: Map<string, ReturnType<typeof extractSymbolsFromStagedFile>>,
  sourceContentByFile: Map<string, string>,
): ReturnType<typeof extractSymbolsFromStagedFile> {
  const stagedContent = sourceContentByFile.get(sourceFile);
  if (stagedContent !== undefined) {
    return extractSymbolsFromStagedFile({
      path: sourceFile,
      status: "M",
      hunkRanges: [{ start: 1, end: Number.MAX_SAFE_INTEGER }],
      content: stagedContent,
    });
  }

  const absolutePath = path.isAbsolute(sourceFile)
    ? sourceFile
    : path.resolve(process.cwd(), sourceFile);
  if (!existsSync(absolutePath)) {
    return [];
  }

  return extractSymbolsFromStagedFile({
    path: sourceFile,
    status: "M",
    hunkRanges: [{ start: 1, end: Number.MAX_SAFE_INTEGER }],
    content: readFileSync(absolutePath, "utf8"),
  });
}

const KIBI_ENTITY_TYPES = new Set<KibiEntityType>([
  "req",
  "scenario",
  "test",
  "adr",
  "flag",
  "event",
  "symbol",
  "fact",
]);

function isKibiEntityType(value: string): value is KibiEntityType {
  return KIBI_ENTITY_TYPES.has(value as KibiEntityType);
}

function isStagedManifestPath(filePath: string): boolean {
  if (
    filePath.endsWith("/symbols.yaml") ||
    filePath.endsWith("/symbols.yml") ||
    filePath.endsWith("/symbol-coordinates.yaml") ||
    filePath === "symbols.yaml" ||
    filePath === "symbols.yml" ||
    filePath === "symbol-coordinates.yaml"
  ) {
    return true;
  }
  try {
    const config = loadConfig(process.cwd());
    if (config.paths.symbols) {
      const relSymbols = config.paths.symbols;
      const configuredBase = relSymbols.split(/[\\/]/).pop();
      if (
        filePath === relSymbols ||
        (configuredBase && filePath.endsWith(`/${configuredBase}`))
      ) {
        return true;
      }
    }
  } catch {
    // ignore config read errors
  }
  return false;
}

function isTestOnlySourcePath(filePath: string): boolean {
  return (
    filePath.startsWith("tests/") ||
    filePath.includes("/tests/") ||
    filePath.endsWith(".test.ts") ||
    filePath.endsWith(".test.tsx") ||
    filePath.endsWith(".test.js") ||
    filePath.endsWith(".test.jsx") ||
    filePath.endsWith(".spec.ts") ||
    filePath.endsWith(".spec.tsx") ||
    filePath.endsWith(".spec.js") ||
    filePath.endsWith(".spec.jsx")
  );
}

function getStagedDiffText(stagedFile: StagedFile): string {
  return stagedFile.diffText ?? "";
}

function formatStagedKibiDiagnostics(
  diagnostics: KibiImpactDiagnostic[],
): string {
  return diagnostics
    .map((diagnostic) => {
      const lines = [`[${diagnostic.id}] ${diagnostic.message}`];
      if (diagnostic.files.length > 0) {
        lines.push(`  Files: ${diagnostic.files.join(", ")}`);
      }
      if (diagnostic.docs.length > 0) {
        lines.push(`  Docs: ${diagnostic.docs.join(", ")}`);
      }
      lines.push(`  Suggestion: ${diagnostic.suggestion}`);
      return lines.join("\n");
    })
    .join("\n\n");
}

function uniqueSorted(values: Iterable<string>): string[] {
  return Array.from(new Set(values)).sort();
}

function buildStagedKibiImpactEvidence(options: {
  stagedFiles: StagedFile[];
  sourceFiles: StagedFile[];
  markdownFiles: StagedFile[];
  markdownResults: ExtractionResult[];
  symbolsByFile: Map<string, ReturnType<typeof extractSymbolsFromStagedFile>>;
  symbolsManifestPath: string;
}): KibiImpactEvidence {
  const {
    stagedFiles,
    sourceFiles,
    markdownFiles,
    markdownResults,
    symbolsByFile,
    symbolsManifestPath,
  } = options;
  const sourceChanges = sourceFiles.map((file) => {
    const symbolsForFile = symbolsByFile.get(file.path) ?? [];
    const behaviorCandidate =
      !isTestOnlySourcePath(file.path) &&
      isBehaviorSourceEdit({
        path: file.path,
        diffText: getStagedDiffText(file),
        intersectsBehaviorBearingSymbol: symbolsForFile.length > 0,
        knownUserFacingSurface: false,
      });

    return {
      path: file.path,
      kind: behaviorCandidate
        ? ("behavior_source_edit" as const)
        : ("non_behavior_source_edit" as const),
    };
  });

  const behaviorSourcePaths = sourceChanges
    .filter((change) => change.kind === "behavior_source_edit")
    .map((change) => change.path);
  const allSourcePaths = sourceChanges.map((change) => change.path);
  const behaviorSourceFiles = sourceFiles.filter((file) =>
    behaviorSourcePaths.includes(file.path),
  );
  const stagedSymbolsManifest = assessStagedSymbolsManifest({
    symbolsManifestPath,
    stagedFiles,
    sourceFiles: behaviorSourceFiles,
  });
  const stagedAuthoredSymbolsEvidence =
    collectStagedAuthoredSymbolsManifestEvidence({
      stagedFiles,
      sourceFiles: behaviorSourceFiles,
    });

  const markdownResultsByPath = new Map<string, ExtractionResult>();
  for (const [index, file] of markdownFiles.entries()) {
    const result = markdownResults[index];
    if (result) {
      markdownResultsByPath.set(file.path, result);
    }
  }

  type KbArtifact = Extract<
    KibiImpactEvidence["mode"],
    { kind: "kb_changes" }
  >["kbArtifacts"][number];
  type NoImpactOverride = Extract<
    KibiImpactEvidence["mode"],
    { kind: "no_impact_override" }
  >["override"];

  const resolvedKbArtifacts: KbArtifact[] = [];
  let override: NoImpactOverride | null = null;

  for (const file of markdownFiles) {
    const parsedOverride = parseKibiImpactOverride(file.content ?? "");
    const evidenceKind = classifyKibiImpactEvidence({
      filePath: file.path,
      extractionOutputChanged: false,
      overrideDeclared: parsedOverride.declared,
      overrideRationale: parsedOverride.rationale,
    });

    if (evidenceKind === "entity_markdown") {
      const result = markdownResultsByPath.get(file.path);
      if (result && isKibiEntityType(result.entity.type)) {
        resolvedKbArtifacts.push({
          kind: "entity_markdown",
          path: file.path,
          entityTypes: [result.entity.type],
          entityIds: [result.entity.id],
          sourcePaths: [...behaviorSourcePaths],
        });
      }
      continue;
    }

    if (!parsedOverride.declared || override !== null) {
      continue;
    }

    override = {
      declaration: KIBI_NO_IMPACT_DECLARATION,
      path: file.path,
      sourcePaths: [...allSourcePaths],
      reason: "non_behavioral_source_edit",
      rationale: parsedOverride.rationale ?? "",
    };
  }

  if (stagedAuthoredSymbolsEvidence.entries.length > 0) {
    resolvedKbArtifacts.push({
      kind: "symbols_manifest",
      path: stagedAuthoredSymbolsEvidence.path,
      entityTypes: ["symbol"],
      entityIds: uniqueSorted(
        stagedAuthoredSymbolsEvidence.entries.flatMap(
          (entry) => entry.entityIds,
        ),
      ),
      sourcePaths: uniqueSorted(
        stagedAuthoredSymbolsEvidence.entries.map((entry) => entry.sourcePath),
      ),
    });
  }

  return {
    sourceChanges,
    symbolsManifest: {
      path: stagedSymbolsManifest.path,
      state: stagedSymbolsManifest.state,
      sourcePaths: stagedSymbolsManifest.sourcePaths,
    },
    mode:
      resolvedKbArtifacts.length > 0
        ? { kind: "kb_changes", kbArtifacts: resolvedKbArtifacts }
        : override
          ? { kind: "no_impact_override", override }
          : { kind: "missing" },
  };
}

// implements REQ-006
export async function checkCommand(
  options: CheckOptions,
): Promise<{ exitCode: number }> {
  let prolog: PrologProcess | null = null;
  let attached = false;
  try {
    let resolvedKbPath = "";
    if (options.kbPath) {
      resolvedKbPath = options.kbPath;
    } else {
      const envBranch = getBranchOverride();
      let branch = envBranch || undefined;
      if (!branch) {
        try {
          branch = await getCurrentBranch(process.cwd());
        } catch {
          branch = undefined;
        }
      }
      if (!branch) branch = envBranch || "develop";
      // fallback to main if develop isn't present? keep path consistent
      resolvedKbPath = path.join(
        process.cwd(),
        ".kb/branches",
        branch || "main",
      );
    }

    if (options.staged) {
      const minLinks = options.minLinks ? Number(options.minLinks) : 1;
      let tempCtx: {
        tempDir: string;
        kbPath: string;
        overlayPath: string;
        prolog: PrologProcess;
      } | null = null;
      try {
        const stagedFiles = getStagedFiles();
        if (!stagedFiles || stagedFiles.length === 0) {
          console.log("No staged files found.");
          return { exitCode: 0 };
        }

        const {
          manifestLookup,
          manifestResults,
          authoredSymbolResults,
          stagedAuthoredSymbolResults,
        } = buildManifestLookup(stagedFiles);
        const symbolsManifestPath =
          loadConfig(process.cwd()).paths.symbols ?? KIBI_SYMBOLS_MANIFEST_PATH;

        const sourceFiles = stagedFiles.filter(
          (file) =>
            !file.path.endsWith(".md") && !isStagedManifestPath(file.path),
        );
        const markdownFiles = stagedFiles.filter((f) => f.path.endsWith(".md"));

        const markdownErrors: string[] = [];
        for (const f of markdownFiles) {
          const result = validateStagedMarkdown(f.path, f.content || "");
          for (const err of result.errors) {
            markdownErrors.push(err.toString());
          }
        }

        if (markdownErrors.length > 0) {
          console.log(
            "Found embedded entity violations in staged markdown files:",
          );
          for (const err of markdownErrors) {
            console.log(err);
            console.log();
          }
          if (options.dryRun) {
            return { exitCode: 0 };
          }
          return { exitCode: 1 };
        }
        const allSymbols: ReturnType<typeof extractSymbolsFromStagedFile> = [];
        const symbolsByFile = new Map<
          string,
          ReturnType<typeof extractSymbolsFromStagedFile>
        >();
        const sourceContentByFile = new Map<string, string>();
        for (const f of sourceFiles) {
          try {
            if (f.content !== undefined) {
              sourceContentByFile.set(f.path, f.content);
            }
            const symbols = extractSymbolsFromStagedFile(f, manifestLookup);
            symbolsByFile.set(f.path, symbols);
            if (symbols?.length) {
              allSymbols.push(...symbols);
            }
          } catch (e) {
            console.error(
              `Error extracting symbols from staged file ${f.path}: ${e instanceof Error ? e.message : String(e)}`,
            );
          }
        }

        const markdownResults: ExtractionResult[] = markdownFiles.map((file) =>
          extractFromMarkdownString(file.content ?? "", file.path),
        );

        const stagedSourceFilePaths = new Set(
          sourceFiles.map((file) => file.path),
        );
        const scopedManifestResults = manifestResults.filter(
          (result) =>
            result.sourceFile !== undefined &&
            stagedSourceFilePaths.has(result.sourceFile),
        );
        const stagedEntityResults: ExtractionResult[] = [
          ...scopedManifestResults,
          ...markdownResults,
        ];

        const stagedKibiEvidence = buildStagedKibiImpactEvidence({
          stagedFiles,
          sourceFiles,
          markdownFiles,
          markdownResults,
          symbolsByFile,
          symbolsManifestPath,
        });
        const stagedKibiDiagnostics =
          collectStagedKibiDiagnostics(stagedKibiEvidence);
        const stagedAuthoredSymbolSet = new Set(stagedAuthoredSymbolResults);
        const stagedSourcePaths = new Set(sourceFiles.map((file) => file.path));
        const activeGranularityResults = authoredSymbolResults.filter(
          (result) =>
            stagedAuthoredSymbolSet.has(result) ||
            (result.sourceFile !== undefined &&
              stagedSourcePaths.has(result.sourceFile)),
        );
        stagedKibiDiagnostics.push(
          ...createSymbolGranularityDiagnostics({
            manifestResults: activeGranularityResults,
            symbolsByFile,
            sourceContentByFile,
          }),
        );

        if (allSymbols.length === 0 && stagedEntityResults.length === 0) {
          if (stagedKibiDiagnostics.length > 0) {
            console.log(formatStagedKibiDiagnostics(stagedKibiDiagnostics));
            if (options.dryRun) {
              return { exitCode: 0 };
            }
            return { exitCode: 1 };
          }

          console.log(
            "No exported symbols or staged entities found in staged files.",
          );
          return { exitCode: 0 };
        }

        if (allSymbols.length === 0) {
          if (stagedKibiDiagnostics.length > 0) {
            console.log(formatStagedKibiDiagnostics(stagedKibiDiagnostics));
            if (options.dryRun) {
              return { exitCode: 0 };
            }
            return { exitCode: 1 };
          }
          console.log("✓ No violations found in staged files.");
          return { exitCode: 0 };
        }

        // Create temp KB
        tempCtx = await createTempKb(resolvedKbPath);

        if (stagedEntityResults.length > 0) {
          await projectStagedEntities(tempCtx.prolog, stagedEntityResults);
        }

        const overlayFacts = createOverlayFacts(allSymbols);
        const fs = await import("node:fs/promises");
        await fs.writeFile(tempCtx.overlayPath, overlayFacts, "utf8");
        await fs.cp(
          tempCtx.overlayPath,
          path.join(tempCtx.kbPath, "changed_symbols.pl"),
        );
        await consultOverlay(tempCtx);

        const violationsRaw = await validateStagedSymbols({
          minLinks,
          prolog: tempCtx.prolog,
        });
        const violationsFormatted = formatStagedViolations(violationsRaw);

        if (stagedKibiDiagnostics.length > 0) {
          console.log(formatStagedKibiDiagnostics(stagedKibiDiagnostics));
          console.log();
        }

        if (violationsRaw && violationsRaw.length > 0) {
          console.log(violationsFormatted);
          await cleanupTempKb(tempCtx.tempDir);
          if (options.dryRun) {
            return { exitCode: 0 };
          }
          return { exitCode: 1 };
        }

        if (stagedKibiDiagnostics.length > 0) {
          await cleanupTempKb(tempCtx.tempDir);
          if (options.dryRun) {
            return { exitCode: 0 };
          }
          return { exitCode: 1 };
        }

        console.log("✓ No violations found in staged symbols.");
        await cleanupTempKb(tempCtx.tempDir);
        return { exitCode: 0 };
      } catch (err) {
        console.error(
          `Error running staged validation: ${err instanceof Error ? err.message : String(err)}`,
        );
        if (tempCtx) {
          try {
            await cleanupTempKb(tempCtx.tempDir);
          } catch {
            // best-effort: temp directory may already be cleaned up
          }
        }
        return { exitCode: 1 };
      }
    }

    prolog = new PrologProcess({ timeout: 120000 });
    await prolog.start();

    const kbPathEscaped = escapeAtom(resolvedKbPath);
    const attachResult = await prolog.query(`kb_attach('${kbPathEscaped}')`);

    if (!attachResult.success) {
      await prolog.terminate();
      console.error(`Error: Failed to attach KB: ${attachResult.error}`);
      return { exitCode: 1 };
    }
    attached = true;

    const violations: Violation[] = [];

    const config = loadConfig(process.cwd());
    const checksConfig: ChecksConfig = config.checks ?? {
      rules: Object.fromEntries(RULES.map((r) => [r.name, true])),
      symbolTraceability: { requireAdr: false },
    };

    const effectiveRules = getEffectiveRules(checksConfig.rules, options.rules);

    // Helper to conditionally run a check by name
    async function runCheck(
      name: string,
      fn: (p: PrologProcess, ...args: unknown[]) => Promise<Violation[]>,
      ...args: unknown[]
    ) {
      if (!effectiveRules.has(name)) return;
      if (!prolog) {
        throw new Error("Prolog process not initialized");
      }
      const res = await fn(prolog, ...args);
      if (res?.length) violations.push(...res);
    }

    if (!prolog) {
      throw new Error("Prolog process not initialized");
    }
    const activeProlog = prolog;

    // Use aggregated checks (single Prolog call) when possible for better performance
    // This is significantly faster in Bun/Docker environments where one-shot mode
    // spawns a new Prolog process for each query
    const supportedRules = [
      "must-priority-coverage",
      "symbol-coverage",
      "symbol-traceability",
      "no-dangling-refs",
      "no-cycles",
      "required-fields",
      "deprecated-adr-no-successor",
      "domain-contradictions",
      "strict-fact-shape",
      "strict-req-fact-pairing",
      "strict-readiness",
    ];

    const canUseAggregated = Array.from(effectiveRules).every((r) =>
      supportedRules.includes(r),
    );

    if (canUseAggregated) {
      // Fast path: single Prolog call returning all violations
      // Pass the requireAdr option for symbol-traceability
      const aggregatedViolations = await runAggregatedChecks(
        activeProlog,
        effectiveRules,
        checksConfig.symbolTraceability?.requireAdr ?? false,
      );
      violations.push(...aggregatedViolations);
    } else {
      // Legacy path: individual checks for backward compatibility
      await runCheck("must-priority-coverage", checkMustPriorityCoverage);
      await runCheck("symbol-coverage", checkSymbolCoverage);
      await runCheck("symbol-traceability", (p) =>
        checkSymbolTraceability(
          p,
          checksConfig.symbolTraceability?.requireAdr ?? false,
        ),
      );
      await runCheck("no-dangling-refs", checkNoDanglingRefs);
      await runCheck("no-cycles", checkNoCycles);
      const allEntityIds = await getAllEntityIds(activeProlog);
      if (effectiveRules.has("required-fields")) {
        const requiredViolations = await checkRequiredFields(
          activeProlog,
          allEntityIds,
        );
        violations.push(...requiredViolations);
      }
      await runCheck("deprecated-adr-no-successor", checkDeprecatedAdrs);
      await runCheck("domain-contradictions", checkDomainContradictions);
      await runCheck("strict-fact-shape", checkStrictFactShape);
      await runCheck("strict-req-fact-pairing", checkStrictReqFactPairing);
      await runCheck("strict-readiness", checkStrictReadiness);
    }
    if (violations.length === 0) {
      console.log("✓ No violations found. KB is valid.");
      return { exitCode: 0 };
    }

    console.log(`Found ${violations.length} violation(s):`);
    console.log();

    for (const v of violations) {
      const filename = v.source ? path.basename(v.source, ".md") : v.entityId;
      console.log(`[${v.rule}] ${filename}`);
      if (filename !== v.entityId) {
        console.log(`  Entity: ${v.entityId}`);
      }
      if (v.source) {
        console.log(`  Source: ${v.source}`);
      }
      console.log(`  ${v.description}`);
      if (options.fix && v.suggestion) {
        console.log(`  Suggestion: ${v.suggestion}`);
      }
      console.log();
    }

    return { exitCode: 1 };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    return { exitCode: 1 };
  } finally {
    await safeCleanupProlog(prolog);
  }
}

async function checkMustPriorityCoverage(
  prolog: PrologProcess,
): Promise<Violation[]> {
  const violations: Violation[] = [];

  const mustReqs = await findMustPriorityReqs(prolog);

  for (const reqId of mustReqs) {
    const entityResult = await prolog.query(
      `kb_entity('${reqId}', req, Props)`,
    );

    let source = "";
    if (entityResult.success && entityResult.bindings.Props) {
      const propsStr = entityResult.bindings.Props;
      const sourceMatch = propsStr.match(/source\s*=\s*\^\^?\("([^"]+)"/);
      const sourceValue = getMatchGroup(sourceMatch);
      if (sourceValue) {
        source = sourceValue;
      }
    }

    const scenarioResult = await prolog.query(
      `kb_relationship(specified_by, '${reqId}', ScenarioId)`,
    );

    const hasScenario = scenarioResult.success;

    const testResult = await prolog.query(
      `kb_relationship(validates, TestId, '${reqId}')`,
    );

    const hasTest = testResult.success;

    if (!hasScenario || !hasTest) {
      let desc = "Must-priority requirement lacks ";
      const missing: string[] = [];
      if (!hasScenario) missing.push("scenario");
      if (!hasTest) missing.push("test");
      desc = `${desc}${missing.join(" and ")} coverage`;

      violations.push({
        rule: "must-priority-coverage",
        entityId: reqId,
        description: desc,
        source,
        suggestion: missing
          .map((m) => `Create ${m} that covers this requirement`)
          .join("; "),
      });
    }
  }

  return violations;
}

async function findMustPriorityReqs(prolog: PrologProcess): Promise<string[]> {
  const query = `findall(Id, (kb_entity(Id, req, Props), memberchk(priority=P, Props), (P = ^^("must", _) ; P = "must" ; P = 'must' ; (atom(P), atom_string(P, PS), sub_string(PS, _, 4, 0, "must")))), Ids)`;
  const result = await prolog.query(query);

  if (!result.success || !result.bindings.Ids) {
    return [];
  }

  const idsStr = result.bindings.Ids;
  const match = idsStr.match(/\[(.*)\]/);
  const content = getMatchGroup(match)?.trim();
  if (!content) {
    return [];
  }

  return content.split(",").map((id) => id.trim().replace(/^'|'$/g, ""));
}

async function getAllEntityIds(
  prolog: PrologProcess,
  type?: string,
): Promise<string[]> {
  const typeFilter = type ? `, Type = ${type}` : "";
  const query = `findall(Id, (kb_entity(Id, Type, _)${typeFilter}), Ids)`;
  const result = await prolog.query(query);

  if (!result.success || !result.bindings.Ids) {
    return [];
  }

  const idsStr = result.bindings.Ids;
  const match = idsStr.match(/\[(.*)\]/);
  const content = getMatchGroup(match)?.trim();
  if (!content) {
    return [];
  }

  return content.split(",").map((id) => id.trim().replace(/^'|'$/g, ""));
}
async function checkNoDanglingRefs(
  prolog: PrologProcess,
): Promise<Violation[]> {
  const violations: Violation[] = [];

  const allEntityIds = new Set(await getAllEntityIds(prolog));

  const relTypes = [
    "depends_on",
    "verified_by",
    "validates",
    "specified_by",
    "constrains",
    "requires_property",
    "supersedes",
    "relates_to",
  ];

  const allRels: Array<{ from: string; to: string }> = [];

  for (const relType of relTypes) {
    const relsResult = await prolog.query(
      `findall([From,To], kb_relationship(${relType}, From, To), Rels)`,
    );

    if (relsResult.success && relsResult.bindings.Rels) {
      const relsStr = relsResult.bindings.Rels;
      const match = relsStr.match(/\[(.*)\]/);
      const content = getMatchGroup(match)?.trim();
      if (content) {
        const relMatches = content.matchAll(/\[([^,]+),([^\]]+)\]/g);
        for (const relMatch of relMatches) {
          const fromValue = getMatchGroup(relMatch);
          const toValue = getMatchGroup(relMatch, 2);
          if (!fromValue || !toValue) continue;

          const fromId = fromValue.trim().replace(/^'|'$/g, "");
          const toId = toValue.trim().replace(/^'|'$/g, "");
          allRels.push({ from: fromId, to: toId });
        }
      }
    }
  }

  // Check all collected relationships for dangling refs
  for (const rel of allRels) {
    if (!allEntityIds.has(rel.from)) {
      violations.push({
        rule: "no-dangling-refs",
        entityId: rel.from,
        description: `Relationship references non-existent entity: ${rel.from}`,
        suggestion: "Remove relationship or create missing entity",
      });
    }
    if (!allEntityIds.has(rel.to)) {
      violations.push({
        rule: "no-dangling-refs",
        entityId: rel.to,
        description: `Relationship references non-existent entity: ${rel.to}`,
        suggestion: "Remove relationship or create missing entity",
      });
    }
  }

  return violations;
}

async function checkNoCycles(prolog: PrologProcess): Promise<Violation[]> {
  const violations: Violation[] = [];

  const depsResult = await prolog.query(
    "findall([From,To], kb_relationship(depends_on, From, To), Deps)",
  );

  if (!depsResult.success || !depsResult.bindings.Deps) {
    return violations;
  }

  const depsStr = depsResult.bindings.Deps;
  const match = depsStr.match(/\[(.*)\]/);
  const content = getMatchGroup(match)?.trim();
  if (!content) {
    return violations;
  }

  const graph = new Map<string, string[]>();
  const depMatches = content.matchAll(/\[([^,]+),([^\]]+)\]/g);

  for (const depMatch of depMatches) {
    const fromValue = getMatchGroup(depMatch);
    const toValue = getMatchGroup(depMatch, 2);
    if (!fromValue || !toValue) continue;

    const from = fromValue.trim().replace(/^'|'$/g, "");
    const to = toValue.trim().replace(/^'|'$/g, "");
    if (!graph.has(from)) {
      graph.set(from, []);
    }
    const fromList = graph.get(from);
    if (fromList) {
      fromList.push(to);
    }
  }

  const visited = new Set<string>();
  const recStack = new Set<string>();

  function hasCycleDFS(node: string, path: string[]): string[] | null {
    visited.add(node);
    recStack.add(node);
    path.push(node);

    const neighbors = graph.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        const cyclePath = hasCycleDFS(neighbor, [...path]);
        if (cyclePath) return cyclePath;
      } else if (recStack.has(neighbor)) {
        // Cycle detected
        return [...path, neighbor];
      }
    }

    recStack.delete(node);
    return null;
  }

  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      const cyclePath = hasCycleDFS(node, []);
      if (cyclePath) {
        const cycleEntityId = cyclePath[0];
        if (!cycleEntityId) {
          continue;
        }

        const cycleWithSources: string[] = [];
        for (const entityId of cyclePath) {
          const entityResult = await prolog.query(
            `kb_entity('${entityId}', _, Props)`,
          );
          let sourceName = entityId;
          if (entityResult.success && entityResult.bindings.Props) {
            const propsStr = entityResult.bindings.Props;
            const sourceMatch = propsStr.match(/source\s*=\s*\^\^?\("([^"]+)"/);
            const sourceValue = getMatchGroup(sourceMatch);
            if (sourceValue) {
              sourceName = path.basename(sourceValue, ".md");
            }
          }
          cycleWithSources.push(sourceName);
        }

        violations.push({
          rule: "no-cycles",
          entityId: cycleEntityId,
          description: `Circular dependency detected: ${cycleWithSources.join(" → ")}`,
          suggestion:
            "Break cycle by removing one of the depends_on relationships",
        });
        break; // Report only first cycle found
      }
    }
  }

  return violations;
}

async function checkRequiredFields(
  prolog: PrologProcess,
  allEntityIds: string[],
): Promise<Violation[]> {
  const violations: Violation[] = [];

  const required = [
    "id",
    "title",
    "status",
    "created_at",
    "updated_at",
    "source",
  ];

  for (const entityId of allEntityIds) {
    const result = await prolog.query(`kb_entity('${entityId}', Type, Props)`);

    if (result.success && result.bindings.Props) {
      const propsStr = result.bindings.Props;
      const propKeys = new Set<string>();

      const keyMatches = propsStr.matchAll(/(\w+)\s*=/g);
      for (const match of keyMatches) {
        const key = getMatchGroup(match);
        if (key) {
          propKeys.add(key);
        }
      }

      for (const field of required) {
        if (!propKeys.has(field)) {
          violations.push({
            rule: "required-fields",
            entityId: entityId,
            description: `Missing required field: ${field}`,
            suggestion: `Add ${field} to entity definition`,
          });
        }
      }
    }
  }

  return violations;
}

async function checkDeprecatedAdrs(
  prolog: PrologProcess,
): Promise<Violation[]> {
  const violations: Violation[] = [];

  // Use Prolog predicate to find deprecated ADRs without successors
  const result = await prolog.query(
    "setof(Id, deprecated_no_successor(Id), Ids)",
  );

  if (!result.success || !result.bindings.Ids) {
    return violations;
  }

  const idsStr = result.bindings.Ids;
  const match = idsStr.match(/\[(.*)\]/);
  const content = getMatchGroup(match)?.trim();
  if (!content) {
    return violations;
  }

  const adrIds = content
    .split(",")
    .map((id) => id.trim().replace(/^'|'$/g, ""));

  for (const adrId of adrIds) {
    const entityResult = await prolog.query(
      `kb_entity('${adrId}', adr, Props)`,
    );
    let source = "";
    if (entityResult.success && entityResult.bindings.Props) {
      const propsStr = entityResult.bindings.Props;
      const sourceMatch = propsStr.match(/source\s*=\s*\^\^?\("([^"]+)"/);
      const sourceValue = getMatchGroup(sourceMatch);
      if (sourceValue) {
        source = sourceValue;
      }
    }

    violations.push({
      rule: "deprecated-adr-no-successor",
      entityId: adrId,
      description:
        "Superseded/deprecated ADR has no successor — add a supersedes link from the replacement ADR",
      suggestion: `Create a new ADR and add: links: [{type: supersedes, target: ${adrId}}]`,
      source,
    });
  }

  return violations;
}

async function checkDomainContradictions(
  prolog: PrologProcess,
): Promise<Violation[]> {
  const violations: Violation[] = [];

  const result = await prolog.query(
    "setof([A,B,Reason], contradicting_reqs(A, B, Reason), Rows)",
  );

  if (!result.success || !result.bindings.Rows) {
    return violations;
  }

  const rows = parseTriples(result.bindings.Rows);

  for (const [reqA, reqB, reason] of rows) {
    violations.push({
      rule: "domain-contradictions",
      entityId: `${reqA}/${reqB}`,
      description: `${reason} [strict-readiness: contradiction-ready]`,
      suggestion:
        "Supersede one requirement or align both to the same required property",
    });
  }

  return violations;
}

async function checkStrictFactShape(
  prolog: PrologProcess,
): Promise<Violation[]> {
  const violations: Violation[] = [];

  const result = await prolog.query(
    `findall(violation(Rule, EntityId, Desc, Sugg, Src),
      checks:strict_fact_shape_violation(violation(Rule, EntityId, Desc, Sugg, Src)),
      Violations)`,
  );

  if (!result.success || !result.bindings.Violations) {
    return violations;
  }

  const violationsStr = result.bindings.Violations as string;
  if (violationsStr && violationsStr !== "[]") {
    for (const v of parseViolationRows(violationsStr)) {
      violations.push(v);
    }
  }

  return violations;
}

async function checkStrictReqFactPairing(
  prolog: PrologProcess,
): Promise<Violation[]> {
  const violations: Violation[] = [];

  const result = await prolog.query(
    `findall(violation(Rule, EntityId, Desc, Sugg, Src),
      checks:strict_req_fact_pairing_violation(violation(Rule, EntityId, Desc, Sugg, Src)),
      Violations)`,
  );

  if (!result.success || !result.bindings.Violations) {
    return violations;
  }

  const violationsStr = result.bindings.Violations as string;
  if (violationsStr && violationsStr !== "[]") {
    for (const v of parseViolationRows(violationsStr)) {
      violations.push(v);
    }
  }

  return violations;
}

async function checkStrictReadiness(
  prolog: PrologProcess,
): Promise<Violation[]> {
  const violations: Violation[] = [];

  const result = await prolog.query(
    `findall(violation(Rule, EntityId, Desc, Sugg, Src),
      checks:strict_readiness_violation(violation(Rule, EntityId, Desc, Sugg, Src)),
      Violations)`,
  );

  if (!result.success || !result.bindings.Violations) {
    return violations;
  }

  const violationsStr = result.bindings.Violations as string;
  if (violationsStr && violationsStr !== "[]") {
    for (const v of parseViolationRows(violationsStr)) {
      violations.push(v);
    }
  }

  return violations;
}

async function checkSymbolCoverage(
  prolog: PrologProcess,
): Promise<Violation[]> {
  const violations: Violation[] = [];

  const uncoveredResult = await prolog.query(
    "setof(Symbol, symbol_no_req_coverage(Symbol, _), Symbols)",
  );

  if (uncoveredResult.success && uncoveredResult.bindings.Symbols) {
    const symbolsStr = uncoveredResult.bindings.Symbols;
    const match = symbolsStr.match(/\[(.*)\]/);

    const content = getMatchGroup(match)?.trim();
    if (content) {
      const symbolMatches = content.matchAll(/'([^']+)'/g);
      for (const symbolMatch of symbolMatches) {
        const symbolId = getMatchGroup(symbolMatch);
        if (!symbolId) continue;

        violations.push({
          rule: "symbol-coverage",
          entityId: symbolId,
          description:
            "Code symbol is not traceable to any functional requirement.",
          suggestion:
            "Update symbols.yaml to link this symbol to a related requirement.",
        });
      }
    }
  }

  return violations;
}

async function checkSymbolTraceability(
  prolog: PrologProcess,
  requireAdr: boolean,
): Promise<Violation[]> {
  const violations: Violation[] = [];

  const requireAdrStr = requireAdr ? "true" : "false";
  const result = await prolog.query(
    `findall(violation(Rule, EntityId, Desc, Sugg, Src), 
      checks:symbol_traceability_violation(${requireAdrStr}, violation(Rule, EntityId, Desc, Sugg, Src)), 
      Violations)`,
  );

  if (!result.success || !result.bindings.Violations) {
    return violations;
  }

  const violationsStr = result.bindings.Violations as string;
  if (violationsStr && violationsStr !== "[]") {
    for (const v of parseViolationRows(violationsStr)) {
      violations.push(v);
    }
  }

  return violations;
}
