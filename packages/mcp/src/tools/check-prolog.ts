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
import type { PrologProcess } from "kibi-cli/prolog";
import type { Violation } from "kibi-cli/public/check-types";
import { resolveCorePlPath } from "./core-module.js";

// implements REQ-002
export async function runAggregatedChecks(
  prolog: PrologProcess,
  rulesAllowlist: ReadonlySet<string>,
  requireAdr: boolean,
): Promise<Violation[]> {
  const violations: Violation[] = [];

  const checksPlPath = resolveCorePlPath("checks.pl");
  const normalizedChecksPlPath = checksPlPath.replace(/\\/g, "/");
  const checksPlPathEscaped = normalizedChecksPlPath.replace(/'/g, "''");

  const requireAdrStr = requireAdr ? "true" : "false";
  const query = `(use_module('${checksPlPathEscaped}'),
    (   predicate_property(checks:check_all_json_with_options(_, _), _)
    ->  call(checks:check_all_json_with_options(JsonString, ${requireAdrStr}))
    ;   call(checks:check_all_json(JsonString))
    ))`;

  const result = await prolog.query(query);

  if (!result.success) {
    throw new Error(
      `Aggregated checks query failed: ${result.error || "Unknown error"}`,
    );
  }

  const violationsDict = parseViolations(result.bindings.JsonString);

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
}
