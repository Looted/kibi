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
  // carries only a transport marker. The string answer remains the fallback
  // for an engine whose loaded core predates the file predicate.
  const resultDir = mkdtempSync(path.join(tmpdir(), "kibi-check-"));
  const resultPath = path.join(resultDir, "violations.json");
  const resultPathEscaped = resultPath.replace(/\\/g, "/").replace(/'/g, "''");
  const query = `(load_files('${checksPlPathEscaped}', [if(changed)]),
    (   predicate_property(checks:check_all_json_file(_, _), _)
    ->  call(checks:check_all_json_file('${resultPathEscaped}', ${requireAdrStr})), Transport = file
    ;   predicate_property(checks:check_all_json_with_options(_, _), _)
    ->  call(checks:check_all_json_with_options(JsonString, ${requireAdrStr})), Transport = answer
    ;   call(checks:check_all_json(JsonString)), Transport = answer
    ))`;

  let result: Awaited<ReturnType<PrologProcess["query"]>>;
  let jsonString: unknown;
  try {
    result = await prolog.query(query);
    jsonString =
      result.success && result.bindings.Transport === "file"
        ? readFileSync(resultPath, "utf8")
        : result.bindings.JsonString;
  } finally {
    rmSync(resultDir, { recursive: true, force: true });
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
