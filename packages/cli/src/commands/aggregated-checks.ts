import path from "node:path";
import { type PrologProcess, resolveKbPlPath } from "../prolog.js";
import { escapeAtom } from "../prolog/codec.js";
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
 * @param prolog - The Prolog process
 * @param rulesAllowlist - Set of rule names to run (null = all)
 * @param requireAdr - Whether to require ADR constraints for symbol-traceability
 */
export async function runAggregatedChecks(
  prolog: Pick<PrologProcess, "query">,
  rulesAllowlist: Set<string> | null,
  requireAdr = false,
): Promise<Violation[]> {
  // implements REQ-003
  const violations: Violation[] = [];

  const checksPlPath = path.join(path.dirname(resolveKbPlPath()), "checks.pl");
  const checksPlPathEscaped = escapeAtom(checksPlPath);
  // Use check_all_json_with_options if available, otherwise fall back to check_all_json
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
    throw new Error(
      `Failed to parse violations JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
    );
  }

  for (const ruleViolations of Object.values(violationsDict)) {
    for (const v of ruleViolations) {
      const isAllowed = !rulesAllowlist || rulesAllowlist.has(v.rule);
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
