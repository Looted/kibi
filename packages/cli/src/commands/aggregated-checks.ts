import type { PrologProcess } from "../prolog.js";
import type { Violation } from "./check.js";

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

  // Build the check goal based on allowlist
  const checkGoals: string[] = [];
  const supportedRules = [
    "must-priority-coverage",
    "symbol-coverage",
    "no-dangling-refs",
    "no-cycles",
    "required-fields",
    "deprecated-adr-no-successor",
    "domain-contradictions",
  ];

  for (const rule of supportedRules) {
    if (!rulesAllowlist || rulesAllowlist.has(rule)) {
      // Convert kebab-case to snake_case for Prolog
      const prologRule = rule.replace(/-/g, "_");
      checkGoals.push(
        `findall(V, checks:check_${prologRule}(V), ${prologRule}_violations)`,
      );
    }
  }

  if (checkGoals.length === 0) {
    return violations;
  }

  // Use check_all_json which returns JSON as a string binding
  const query = `use_module('src/checks.pl'), use_module(library(http/json)), checks:check_all_json(JsonString)`;

  try {
    const result = await prolog.query(query);

    if (!result.success) {
      console.warn(
        "Aggregated checks query failed, falling back to individual checks",
      );
      return [];
    }

    // Parse the JSON from the binding
    let violationsDict: Record<string, unknown[]>;
    try {
      const jsonString = result.bindings.JsonString;
      if (jsonString) {
        violationsDict = JSON.parse(jsonString) as Record<string, unknown[]>;
      } else {
        throw new Error("No JSON string in binding");
      }
    } catch (parseError) {
      console.warn("Failed to parse violations JSON:", parseError);
      return [];
    }

    // Convert Prolog violation terms to Violation objects
    for (const [ruleKey, ruleViolations] of Object.entries(violationsDict)) {
      const rule = ruleKey.replace(/_/g, "-");
      for (const v of ruleViolations) {
        if (typeof v === "string") {
          // Parse Prolog violation/5 term: violation(Rule, EntityId, Desc, Sugg, Source)
          const match = v.match(
            /violation\(([^,]+),\s*'([^']+)'\s*,\s*"([^"]*)"\s*,\s*"([^"]*)"\s*,\s*"([^"]*)"\)/,
          );
          if (match) {
            violations.push({
              rule: rule,
              entityId: match[2],
              description: match[3],
              suggestion: match[4] || undefined,
              source: match[5] || undefined,
            });
          }
        }
      }
    }

    return violations;
  } catch (error) {
    console.warn("Error running aggregated checks:", error);
    return [];
  }
}
