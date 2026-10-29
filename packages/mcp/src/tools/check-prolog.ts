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
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { PrologProcess } from "kibi-runtime";
import type { Violation } from "kibi-runtime";
import { resolveCorePlPath } from "./core-module.js";
import { collectQueryPlanSafetyViolations } from "./query-plan-safety.js";

// implements REQ-002
export async function runAggregatedChecks(
  prolog: PrologProcess,
  rulesAllowlist: ReadonlySet<string>,
  requireAdr: boolean,
): Promise<Violation[]> {
  const violations: Violation[] = [];

  const checksPlPath = resolveCorePlPath("checks.pl");
  if (rulesAllowlist.has("query-plan-safety")) {
    violations.push(...collectQueryPlanSafetyViolations(checksPlPath));
  }
  const normalizedChecksPlPath = checksPlPath.replace(/\\/g, "/");
  const checksPlPathEscaped = normalizedChecksPlPath.replace(/'/g, "''");

  const requireAdrStr = requireAdr ? "true" : "false";
  // A large KB's violations JSON can exceed the engine's bounded output
  // capacity, so the engine writes it to a private file and the answer
  // carries only a transport marker. The transport predicate answers the
  // JSON instead when it cannot write the file; the string answer also
  // remains the fallback for an engine whose loaded core predates the file
  // predicates.
  const query = (resultPath: string | undefined): string => {
    let target = "none";
    if (resultPath !== undefined) {
      // rationale: separators are normalized for Windows paths; a POSIX temp
      // path has no backslash, so no test on a POSIX runner can tell.
      // Stryker disable next-line StringLiteral
      target = `'${resultPath.replace(/\\/g, "/").replace(/'/g, "''")}'`;
    }
    const fileOnly =
      resultPath === undefined
        ? ""
        : `predicate_property(checks:check_all_json_file(_, _), _)
    ->  call(checks:check_all_json_file(${target}, ${requireAdrStr})), Transport = file
    ;   `;
    return `(load_files('${checksPlPathEscaped}', [if(changed)]),
    (   predicate_property(checks:check_all_json_transport(_, _, _, _), _)
    ->  call(checks:check_all_json_transport(${target}, ${requireAdrStr}, Transport, JsonString))
    ;   ${fileOnly}predicate_property(checks:check_all_json_with_options(_, _), _)
    ->  call(checks:check_all_json_with_options(JsonString, ${requireAdrStr})), Transport = answer
    ;   call(checks:check_all_json(JsonString)), Transport = answer
    ))`;
  };

  // A temp folder that cannot be written gives no result file; the engine
  // then answers the JSON.
  let resultDir: string | undefined;
  try {
    resultDir = mkdtempSync(path.join(tmpdir(), "kibi-check-"));
  } catch {
    // Left undefined: the query asks for an answer.
  }
  const resultPath =
    resultDir === undefined
      ? undefined
      : path.join(resultDir, "violations.json");

  let result: Awaited<ReturnType<PrologProcess["query"]>>;
  let jsonString: unknown;
  try {
    result = await prolog.query(query(resultPath));
    jsonString = result.bindings.JsonString;
    // rationale: the engine answers Transport "file" only after a successful
    // query that was given a path, so neither guard changes which answers
    // are read; they only narrow the path for the read.
    // Stryker disable next-line ConditionalExpression,LogicalOperator
    const mayRead = result.success && resultPath !== undefined;
    if (mayRead && result.bindings.Transport === "file") {
      try {
        jsonString = readFileSync(resultPath as string, "utf8");
      } catch {
        // The engine wrote a file this process cannot read (an engine with
        // another view of the temp folder): ask for the JSON as an answer.
        result = await prolog.query(query(undefined));
        jsonString = result.bindings.JsonString;
      }
    }
  } finally {
    if (resultDir !== undefined) {
      // rationale: the directory always exists here, so `force` (which only
      // ignores a missing path) never changes the outcome.
      // Stryker disable next-line BooleanLiteral
      rmSync(resultDir, { recursive: true, force: true });
    }
  }

  if (!result.success) {
    throw new Error(
      `Aggregated checks query failed: ${result.error || "Unknown error"}`,
    );
  }

  const violationsDict = parseViolations(jsonString);

  for (const ruleViolations of Object.values(violationsDict)) {
    for (const v of ruleViolations) {
      const isAllowed = rulesAllowlist.has(v.rule);
      if (isAllowed) {
        violations.push({
          rule: v.rule,
          entityId: v.entityId,
          description: v.description,
          ...(v.suggestion ? { suggestion: v.suggestion } : {}),
          ...(v.source ? { source: v.source } : {}),
          ...(v.evidence ? { evidence: v.evidence } : {}),
        });
      }
    }
  }

  return violations;
}

function parseViolations(jsonString: unknown): Record<string, JsonViolation[]> {
  try {
    if (!jsonString || typeof jsonString !== "string") {
      throw new Error("No JSON string in binding");
    }

    const parsed: unknown = JSON.parse(jsonString);
    const violations = typeof parsed === "string" ? JSON.parse(parsed) : parsed;
    return violations as Record<string, JsonViolation[]>;
  } catch (parseError) {
    throw new Error(
      `Failed to parse violations JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
    );
  }
}

interface JsonViolation {
  rule: string;
  entityId: string;
  description: string;
  suggestion: string;
  source: string;
  evidence?: Record<string, unknown>;
}
