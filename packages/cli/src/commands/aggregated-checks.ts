import path from "node:path";
import { type PrologProcess, resolveKbPlPath } from "../prolog.js";
import { escapeAtom, toPrologAtom } from "../prolog/codec.js";
import type { Violation } from "./check.js";

interface JsonViolation {
  rule: string;
  entityId: string;
  description: string;
  suggestion: string;
  source: string;
  evidence?: Record<string, unknown>;
}

/**
 * Run all checks using the aggregated Prolog predicates.
 * This makes a single Prolog call and parses JSON output, significantly
 * faster than running individual checks with multiple round-trips.
 * @param prolog - The Prolog process
 * @param rulesAllowlist - Set of rule names to run (null = all)
 */
export async function runAggregatedChecks(
  prolog: Pick<PrologProcess, "query">,
  rulesAllowlist: Set<string> | null,
): Promise<Violation[]> {
  // implements REQ-003
  const violations: Violation[] = [];

  const checksPlPath = path.join(path.dirname(resolveKbPlPath()), "checks.pl");
  const checksPlPathEscaped = escapeAtom(checksPlPath);
  const fallbackQuery = `(   predicate_property(checks:check_all_json_with_options(_, _), _)
    ->  call(checks:check_all_json_with_options(JsonString, false))
    ;   call(checks:check_all_json(JsonString))
    )`;
  const checksQuery = rulesAllowlist
    ? `(   predicate_property(checks:check_selected_json(_, _), _)
      ->  call(checks:check_selected_json([${[...rulesAllowlist]
        .map(toPrologAtom)
        .join(",")}], JsonString))
      ;   ${fallbackQuery}
      )`
    : fallbackQuery;
  const query = `(use_module('${checksPlPathEscaped}'), ${checksQuery})`;

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
          ...(v.evidence ? { evidence: v.evidence } : {}),
        });
      }
    }
  }

  return violations;
}
