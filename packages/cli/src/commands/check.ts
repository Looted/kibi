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

/*
 How to apply this header to source files (examples)

 1) Prepend header to a single file (POSIX shells):

    cat LICENSE_HEADER.txt "$FILE" > "$FILE".with-header && mv "$FILE".with-header "$FILE"

 2) Apply to multiple files (example: the project's main entry files):

    for f in packages/cli/bin/kibi packages/mcp/bin/kibi-mcp packages/cli/src/*.ts packages/mcp/src/*.ts; do
      if [ -f "$f" ]; then
        cp "$f" "$f".bak
        (cat LICENSE_HEADER.txt; echo; cat "$f" ) > "$f".new && mv "$f".new "$f"
      fi
    done

 3) Avoid duplicating the header: run a quick guard to only add if missing

    for f in packages/cli/bin/kibi packages/mcp/bin/kibi-mcp; do
      if [ -f "$f" ]; then
        if ! head -n 5 "$f" | grep -q "Copyright (C) 2026 Piotr Franczyk"; then
          cp "$f" "$f".bak
          (cat LICENSE_HEADER.txt; echo; cat "$f" ) > "$f".new && mv "$f".new "$f"
        fi
      fi
    done
*/
import * as path from "node:path";
import { PrologProcess } from "../prolog.js";
import { getStagedFiles } from "../traceability/git-staged.js";
import { extractSymbolsFromStagedFile } from "../traceability/symbol-extract.js";
import { cleanupTempKb, createOverlayFacts, createTempKb } from "../traceability/temp-kb.js";
import { formatViolations as formatStagedViolations, validateStagedSymbols } from "../traceability/validate.js";
import { getCurrentBranch } from "./init-helpers.js";

export interface CheckOptions {
  fix?: boolean;
  kbPath?: string;
  rules?: string; // comma separated allowlist
  staged?: boolean;
  minLinks?: string | number;
  dryRun?: boolean;
}

export interface Violation {
  rule: string;
  entityId: string;
  description: string;
  suggestion?: string;
  source?: string;
}

export async function checkCommand(options: CheckOptions): Promise<void> {
  try {
    const prolog = new PrologProcess();
    await prolog.start();

    // Resolve KB path with priority:
    // --kb-path > git branch --show-current > KIBI_BRANCH env > develop > main
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

    const kbPath = resolvedKbPath;
    const attachResult = await prolog.query(`kb_attach('${kbPath}')`);

    if (!attachResult.success) {
      await prolog.terminate();
      console.error(`Error: Failed to attach KB: ${attachResult.error}`);
      process.exit(1);
    }

    const violations: Violation[] = [];

    // Parse rules allowlist if provided
    let rulesAllowlist: Set<string> | null = null;
    if (options.rules) {
      const parts = (options.rules as string)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean) as string[];
      rulesAllowlist = new Set(parts);
    }

    // Helper to conditionally run a check by name
    async function runCheck(
      name: string,
      fn: (p: PrologProcess, ...args: unknown[]) => Promise<Violation[]>,
      ...args: unknown[]
    ) {
      if (rulesAllowlist?.has(name) === false) return;
      const res = await fn(prolog, ...args);
      if (res && res.length) violations.push(...res);
    }

    // If --staged mode requested, run staged-symbol traceability gate
    if (options.staged) {
      const minLinks = options.minLinks ? Number(options.minLinks) : 1;
      let tempCtx: { tempDir: string; kbPath: string; overlayPath: string } | null = null;
      try {
        // Get staged files
        const stagedFiles = getStagedFiles();
        if (!stagedFiles || stagedFiles.length === 0) {
          console.log("No staged files found.");
          process.exit(0);
        }

        // Extract symbols from staged files
        const allSymbols: any[] = [];
        for (const f of stagedFiles) {
          try {
            const symbols = extractSymbolsFromStagedFile(f);
            if (symbols && symbols.length) {
              allSymbols.push(...symbols);
            }
          } catch (e) {
            console.error(
              `Error extracting symbols from staged file ${f.path}: ${e instanceof Error ? e.message : String(e)}`,
            );
          }
        }

        if (allSymbols.length === 0) {
          console.log("No exported symbols found in staged files.");
          process.exit(0);
        }

        // Create temp KB and overlay
        tempCtx = await createTempKb(resolvedKbPath);
        const overlayFacts = createOverlayFacts(allSymbols);
        
        // Write overlay facts to file
        const fs = await import("node:fs/promises");
        await fs.writeFile(tempCtx.overlayPath, overlayFacts, "utf8");
        
        // Get prolog instance from temp-kb (we need to query via prolog)
        const { prologByTempDir } = await import("../traceability/temp-kb.js") as any;
        const prolog = prologByTempDir.get(tempCtx.tempDir);
        
        if (!prolog) {
          throw new Error("Failed to get Prolog instance for temp KB");
        }

        // Validate staged symbols
        const violationsRaw = await validateStagedSymbols({ minLinks, prolog });
        const violationsFormatted = formatStagedViolations(violationsRaw);

        if (violationsRaw && violationsRaw.length > 0) {
          console.log(violationsFormatted);
          await cleanupTempKb(tempCtx.tempDir);
          process.exit(1);
        }

        console.log("✓ No violations found in staged symbols.");
        await cleanupTempKb(tempCtx.tempDir);
        process.exit(0);
      } catch (err) {
        console.error(
          `Error running staged validation: ${err instanceof Error ? err.message : String(err)}`,
        );
        if (tempCtx) {
          try {
            await cleanupTempKb(tempCtx.tempDir);
          } catch {}
        }
        process.exit(1);
      }
    }

    await runCheck("must-priority-coverage", checkMustPriorityCoverage);
    await runCheck("symbol-coverage", checkSymbolCoverage);
    await runCheck("no-dangling-refs", checkNoDanglingRefs);
    await runCheck("no-cycles", checkNoCycles);
    const allEntityIds = await getAllEntityIds(prolog);
    await runCheck("required-fields", checkRequiredFields as any, allEntityIds);
    await runCheck("deprecated-adr-no-successor", checkDeprecatedAdrs);
    await runCheck("domain-contradictions", checkDomainContradictions);
    await prolog.query("kb_detach");
    await prolog.terminate();

    if (violations.length === 0) {
      console.log("✓ No violations found. KB is valid.");
      process.exit(0);
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

    process.exit(1);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    process.exit(1);
  }
}

async function checkMustPriorityCoverage(
  prolog: PrologProcess,
): Promise<Violation[]> {
  const violations: Violation[] = [];

  // Find all must-priority requirements
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

  // Get all entity IDs once
  const allEntityIds = new Set(await getAllEntityIds(prolog));

  // Get all relationships by querying all known relationship types
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

  // Get all depends_on relationships
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

  // Build adjacency map
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

  // DFS to detect cycles
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

  // Check each node for cycles
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
      // Parse properties list: [key1=value1, key2=value2, ...]
      const propsStr = result.bindings.Props;
      const propKeys = new Set<string>();

      // Extract keys from Props
      const keyMatches = propsStr.matchAll(/(\w+)\s*=/g);
      for (const match of keyMatches) {
        propKeys.add(match[1]);
      }

      // Check for missing required fields
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
    // Get source for better error message
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
        "Archived/deprecated ADR has no successor — add a supersedes link from the replacement ADR",
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

  const rows = parseTripleRows(result.bindings.Rows);

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

function parseTripleRows(raw: string): Array<[string, string, string]> {
  const cleaned = raw.trim();
  if (cleaned === "[]" || cleaned.length === 0) {
    return [];
  }

  const rows: Array<[string, string, string]> = [];
  const rowRegex = /\[([^,]+),([^,]+),([^\]]+)\]/g;
  let match: RegExpExecArray | null;
  do {
    match = rowRegex.exec(cleaned);
    if (match) {
      rows.push([
        match[1].trim().replace(/^'|'$/g, ""),
        match[2].trim().replace(/^'|'$/g, ""),
        match[3].trim().replace(/^'|'$/g, ""),
      ]);
    }
  } while (match);
  return rows;
}
