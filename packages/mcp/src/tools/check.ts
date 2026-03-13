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
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import * as path from "node:path";
import type { PrologProcess } from "kibi-cli/prolog";
import { parsePairList } from "./prolog-list.js";

const require = createRequire(import.meta.url);

function resolveChecksPlPath(): string {
  const overrideChecksPath = process.env.KIBI_CHECKS_PL_PATH;
  if (overrideChecksPath && existsSync(overrideChecksPath)) {
    return overrideChecksPath;
  }

  try {
    const installedChecksPl = require.resolve("kibi-core/src/checks.pl");
    if (existsSync(installedChecksPl)) {
      return installedChecksPl;
    }
  } catch {}

  const localChecksPl = path.join(process.cwd(), "packages/core/src/checks.pl");
  if (existsSync(localChecksPl)) {
    return localChecksPl;
  }

  throw new Error("Unable to resolve checks.pl path");
}

export interface CheckArgs {
  rules?: string[];
}

interface Violation {
  rule: string;
  entityId: string;
  description: string;
  suggestion?: string;
  source?: string;
}

interface Diagnostic {
  category: string;
  severity: "error" | "warning";
  message: string;
  file?: string;
  suggestion?: string;
}

function formatDiagnosticsForMcp(diagnostics: Diagnostic[]) {
  return diagnostics.map((d) => ({
    category: d.category,
    severity: d.severity,
    message: d.message,
    file: d.file,
    suggestion: d.suggestion,
  }));
}

export interface CheckResult {
  content: Array<{ type: string; text: string }>;
  structuredContent?: {
    violations: Violation[];
    count: number;
    diagnostics: Array<{
      category: string;
      severity: string;
      message: string;
      file?: string;
      suggestion?: string;
    }>;
  };
}

/**
 * Handle kb_check tool calls - run validation rules on the KB
 * Reuses validation logic from CLI check command
 */
export async function handleKbCheck(
  prolog: PrologProcess,
  args: CheckArgs,
): Promise<CheckResult> {
  const { rules } = args;

  try {
    const violations: Violation[] = [];
    let allEntityIds: string[] | null = null;

    // Run all validation rules (or specific rules if provided)
    const allRules = [
      "must-priority-coverage",
      "no-dangling-refs",
      "no-cycles",
      "required-fields",
      "symbol-coverage",
    ];
    const rulesToRun = rules && rules.length > 0 ? rules : allRules;

    const rulesAllowlist = new Set(rulesToRun);
    const aggregatedViolations = await runAggregatedChecks(
      prolog,
      rulesAllowlist,
    );
    if (aggregatedViolations) {
      const diagnostics: Diagnostic[] = aggregatedViolations.map((v) => ({
        category: "SYNC_ERROR",
        severity: "error",
        message: v.description,
        file: v.source,
        suggestion: v.suggestion,
      }));

      const summary =
        aggregatedViolations.length === 0
          ? "No violations found"
          : `${aggregatedViolations.length} violations found`;

      return {
        content: [
          {
            type: "text",
            text: summary,
          },
        ],
        structuredContent: {
          violations: aggregatedViolations,
          count: aggregatedViolations.length,
          diagnostics: formatDiagnosticsForMcp(diagnostics),
        },
      };
    }

    if (rulesToRun.includes("must-priority-coverage")) {
      violations.push(...(await checkMustPriorityCoverage(prolog)));
    }

    if (rulesToRun.includes("no-dangling-refs")) {
      violations.push(...(await checkNoDanglingRefs(prolog)));
    }

    if (rulesToRun.includes("no-cycles")) {
      violations.push(...(await checkNoCycles(prolog)));
    }

    if (rulesToRun.includes("required-fields")) {
      if (!allEntityIds) {
        allEntityIds = await getAllEntityIds(prolog);
      }
      violations.push(...(await checkRequiredFields(prolog, allEntityIds)));
    }

    if (rulesToRun.includes("symbol-coverage")) {
      violations.push(...(await checkSymbolCoverage(prolog)));
    }

    const diagnostics: Diagnostic[] = violations.map((v) => ({
      category: "SYNC_ERROR",
      severity: "error",
      message: v.description,
      file: v.source,
      suggestion: v.suggestion,
    }));

    const summary =
      violations.length === 0
        ? "No violations found"
        : `${violations.length} violations found`;

    return {
      content: [
        {
          type: "text",
          text: summary,
        },
      ],
      structuredContent: {
        violations,
        count: violations.length,
        diagnostics: formatDiagnosticsForMcp(diagnostics),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Check execution failed: ${message}`);
  }
}

async function runAggregatedChecks(
  prolog: PrologProcess,
  rulesAllowlist: Set<string>,
): Promise<Violation[] | null> {
  const checksPlPath = resolveChecksPlPath();
  const normalizedChecksPlPath = checksPlPath.replace(/\\/g, "/");
  const checksPlPathEscaped = normalizedChecksPlPath.replace(/'/g, "''");
  const violations: Violation[] = [];

  const ruleToPredicate: Record<string, string> = {
    "must-priority-coverage": "check_must_priority_coverage",
    "no-dangling-refs": "check_no_dangling_refs",
    "no-cycles": "check_no_cycles",
    "required-fields": "check_required_fields",
    "symbol-coverage": "check_symbol_coverage",
  };

  for (const rule of rulesAllowlist) {
    const predicate = ruleToPredicate[rule];
    if (!predicate) {
      continue;
    }

    const query = `(use_module('${checksPlPathEscaped}'), call(checks:${predicate}(Violations)), findall(_{rule:Rule,entityId:EntityId,description:Description,suggestion:Suggestion,source:Source}, member(violation(Rule, EntityId, Description, Suggestion, Source), Violations), Rows), call(checks:atom_json_dict(JsonString, Rows, [])))`;
    const result = await prolog.query(query);
    if (!result.success || !result.bindings.JsonString) {
      return null;
    }

    let parsedRows: unknown;
    try {
      parsedRows = JSON.parse(result.bindings.JsonString);
      if (typeof parsedRows === "string") {
        parsedRows = JSON.parse(parsedRows);
      }
    } catch {
      return null;
    }

    if (!Array.isArray(parsedRows)) {
      return null;
    }

    for (const row of parsedRows) {
      if (!row || typeof row !== "object") {
        continue;
      }
      const raw = row as Record<string, unknown>;
      const rule = typeof raw.rule === "string" ? raw.rule : "";
      if (!rulesAllowlist.has(rule)) {
        continue;
      }
      const entityId =
        typeof raw.entityId === "string"
          ? raw.entityId
          : typeof raw.entity_id === "string"
            ? raw.entity_id
            : "";
      const description =
        typeof raw.description === "string" ? raw.description : "";
      const suggestion =
        typeof raw.suggestion === "string" ? raw.suggestion : undefined;
      const source = typeof raw.source === "string" ? raw.source : undefined;
      if (!rule || !entityId || !description) {
        continue;
      }
      violations.push({
        rule,
        entityId,
        description,
        suggestion,
        source,
      });
    }
  }

  return violations;
}

async function checkMustPriorityCoverage(
  prolog: PrologProcess,
): Promise<Violation[]> {
  const violations: Violation[] = [];

  const gapsResult = await prolog.query(
    "setof([Req,Reason], coverage_gap(Req, Reason), Rows)",
  );
  if (!gapsResult.success || !gapsResult.bindings.Rows) {
    return violations;
  }

  const gaps = parsePairList(gapsResult.bindings.Rows);
  for (const [reqId, reason] of gaps) {
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

    const missing: string[] = [];
    if (reason.includes("scenario")) {
      missing.push("scenario");
    }
    if (reason.includes("test")) {
      missing.push("test");
    }

    violations.push({
      rule: "must-priority-coverage",
      entityId: reqId,
      description: `Must-priority requirement lacks ${missing.join(" and ")} coverage`,
      source,
      suggestion: missing
        .map((m) => `Create ${m} that covers this requirement`)
        .join("; "),
    });
  }

  return violations;
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
            "Break the cycle by removing one of the depends_on relationships",
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

async function checkSymbolCoverage(
  prolog: PrologProcess,
): Promise<Violation[]> {
  const violations: Violation[] = [];

  const uncoveredResult = await prolog.query(
    "setof(Symbol, (kb_entity(Symbol, symbol, _), \\+ transitively_implements(Symbol, _)), Symbols)",
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
