import path from "node:path";
import { type PrologProcess, resolveKbPlPath } from "../prolog.js";
import type { Violation } from "./check.js";

interface JsonViolation {
  rule: string;
  entityId: string;
  description: string;
  suggestion: string;
  source: string;
}

/**
 * Run all checks using the aggregated Prolog predicates.
 * This makes a single Prolog call and parses JSON output, significantly
 * faster than running individual checks with multiple round-trips.
 */
export async function runAggregatedChecks(
  prolog: PrologProcess,
  rulesAllowlist: Set<string> | null,
): Promise<Violation[]> {
  const violations: Violation[] = [];

  const checksPlPath = path.join(path.dirname(resolveKbPlPath()), "checks.pl");
  const checksPlPathEscaped = checksPlPath.replace(/'/g, "''");
  const query = `(use_module('${checksPlPathEscaped}'), call(checks:check_all_json(JsonString)))`;

  try {
    const result = await prolog.query(query);

    if (!result.success) {
      console.warn(
        "Aggregated checks query failed, falling back to individual checks",
      );
      return [];
    }

    let violationsDict: Record<string, JsonViolation[]>;
    try {
      const jsonString = result.bindings.JsonString;
      if (!jsonString) {
        throw new Error("No JSON string in binding");
      }
      let parsed = JSON.parse(jsonString);
      if (typeof parsed === "string") {
        parsed = JSON.parse(parsed);
      }
      violationsDict = parsed as Record<string, JsonViolation[]>;
    } catch (parseError) {
      console.warn("Failed to parse violations JSON:", parseError);
      return [];
    }

    for (const ruleViolations of Object.values(violationsDict)) {
      for (const v of ruleViolations) {
        const isAllowed = !rulesAllowlist || rulesAllowlist.has(v.rule);
        if (isAllowed) {
          violations.push({
            rule: v.rule,
            entityId: v.entityId,
            description: v.description,
            suggestion: v.suggestion || undefined,
            source: v.source || undefined,
          });
        }
      }
    }

    return violations;
  } catch (error) {
    console.warn("Error running aggregated checks:", error);
    return [];
  }
}
