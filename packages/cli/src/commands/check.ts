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

import * as path from "node:path";
import { extractFromManifest } from "../extractors/manifest.js";
import { PrologProcess } from "../prolog.js";
import {
  escapeAtom,
  parseTriples,
  parseViolationRows,
} from "../prolog/codec.js";
import { getStagedFiles } from "../traceability/git-staged.js";
import { validateStagedMarkdown } from "../traceability/markdown-validate.js";
import {
  type ManifestLookup,
  extractSymbolsFromStagedFile,
} from "../traceability/symbol-extract.js";
import {
  cleanupTempKb,
  consultOverlay,
  createOverlayFacts,
  createTempKb,
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
import { discoverSourceFiles } from "./sync/discovery.js";

export interface CheckOptions {
  fix?: boolean;
  kbPath?: string;
  rules?: string; // comma separated allowlist
  staged?: boolean;
  minLinks?: string | number;
  dryRun?: boolean;
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
      const envBranch = process.env.KIBI_BRANCH;
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
        const config = loadConfig(process.cwd());

        const manifestLookup: ManifestLookup = new Map();
        const { manifestFiles } = await discoverSourceFiles(
          process.cwd(),
          config.paths,
        );
        for (const manifestPath of manifestFiles) {
          try {
            const entries = extractFromManifest(manifestPath);
            for (const entry of entries) {
              // Prefer the per-symbol sourceFile; fall back to entity.source or manifest path
              const sourceFile =
                entry.sourceFile || entry.entity.source || manifestPath;
              const key = `${sourceFile}:${entry.entity.title}`;
              // Extract requirement links (implements relationships to REQ-*)
              const links = entry.relationships
                .filter(
                  (r) =>
                    r.type === "implements" &&
                    r.to.match(/^[A-Z][A-Z0-9\-_]*$/),
                )
                .map((r) => r.to);
              manifestLookup.set(key, { id: entry.entity.id, links });
            }
          } catch {
            // Ignore manifest parsing errors
          }
        }

        const stagedFiles = getStagedFiles();
        if (!stagedFiles || stagedFiles.length === 0) {
          console.log("No staged files found.");
          return { exitCode: 0 };
        }

        const codeFiles = stagedFiles.filter((f) => !f.path.endsWith(".md"));
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
        for (const f of codeFiles) {
          try {
            const symbols = extractSymbolsFromStagedFile(f, manifestLookup);
            if (symbols?.length) {
              allSymbols.push(...symbols);
            }
          } catch (e) {
            console.error(
              `Error extracting symbols from staged file ${f.path}: ${e instanceof Error ? e.message : String(e)}`,
            );
          }
        }

        if (allSymbols.length === 0 && markdownFiles.length === 0) {
          console.log(
            "No exported symbols or markdown entities found in staged files.",
          );
          return { exitCode: 0 };
        }

        if (allSymbols.length === 0) {
          console.log("✓ No violations found in staged files.");
          return { exitCode: 0 };
        }

        // Create temp KB
        tempCtx = await createTempKb(resolvedKbPath);

        const overlayFacts = createOverlayFacts(allSymbols);
        const fs = await import("node:fs/promises");
        await fs.writeFile(tempCtx.overlayPath, overlayFacts, "utf8");
        await consultOverlay(tempCtx);

        const violationsRaw = await validateStagedSymbols({
          minLinks,
          prolog: tempCtx.prolog,
        });
        const violationsFormatted = formatStagedViolations(violationsRaw);

        if (violationsRaw && violationsRaw.length > 0) {
          console.log(violationsFormatted);
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
      if (sourceMatch) {
        source = sourceMatch[1];
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
  if (!match) {
    return [];
  }

  const content = match[1].trim();
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
  if (!match) {
    return [];
  }

  const content = match[1].trim();
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
      if (match) {
        const content = match[1].trim();
        if (content) {
          const relMatches = content.matchAll(/\[([^,]+),([^\]]+)\]/g);
          for (const relMatch of relMatches) {
            const fromId = relMatch[1].trim().replace(/^'|'$/g, "");
            const toId = relMatch[2].trim().replace(/^'|'$/g, "");
            allRels.push({ from: fromId, to: toId });
          }
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
  if (!match) {
    return violations;
  }

  const content = match[1].trim();
  if (!content) {
    return violations;
  }

  const graph = new Map<string, string[]>();
  const depMatches = content.matchAll(/\[([^,]+),([^\]]+)\]/g);

  for (const depMatch of depMatches) {
    const from = depMatch[1].trim().replace(/^'|'$/g, "");
    const to = depMatch[2].trim().replace(/^'|'$/g, "");
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
        const cycleWithSources: string[] = [];
        for (const entityId of cyclePath) {
          const entityResult = await prolog.query(
            `kb_entity('${entityId}', _, Props)`,
          );
          let sourceName = entityId;
          if (entityResult.success && entityResult.bindings.Props) {
            const propsStr = entityResult.bindings.Props;
            const sourceMatch = propsStr.match(/source\s*=\s*\^\^?\("([^"]+)"/);
            if (sourceMatch) {
              sourceName = path.basename(sourceMatch[1], ".md");
            }
          }
          cycleWithSources.push(sourceName);
        }

        violations.push({
          rule: "no-cycles",
          entityId: cyclePath[0],
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
        propKeys.add(match[1]);
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
  if (!match) {
    return violations;
  }

  const content = match[1].trim();
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
      if (sourceMatch) {
        source = sourceMatch[1];
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
      description: reason,
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

    if (match) {
      const content = match[1].trim();
      if (content) {
        const symbolMatches = content.matchAll(/'([^']+)'/g);
        for (const symbolMatch of symbolMatches) {
          const symbolId = symbolMatch[1];
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
