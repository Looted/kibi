import fs from "node:fs";

import type { Violation } from "kibi-runtime";

const GENERATOR_PATTERN =
  /\b(?:kb_entity|kb_relationship|member|memberchk|findall|setof|bagof)\s*\(/;
const NEGATION_PATTERN = /\\\+\s*/;

export function collectQueryPlanSafetyViolations(
  checksPlPath: string,
): Violation[] {
  const source = fs.readFileSync(checksPlPath, "utf8");
  return analyzeSource(source).map((violation) => ({
    rule: "query-plan-safety",
    entityId: violation.predicate,
    description: violation.description,
    suggestion: violation.suggestion,
    source: `${checksPlPath}:${violation.line}`,
  }));
}

interface QueryPlanSafetyViolation {
  readonly predicate: string;
  readonly line: number;
  readonly description: string;
  readonly suggestion: string;
}

function analyzeSource(source: string): QueryPlanSafetyViolation[] {
  const lines = source.split(/\r?\n/);
  const violations: QueryPlanSafetyViolation[] = [];
  let clause:
    | { readonly start: number; readonly predicate: string; lines: string[] }
    | undefined;

  for (const [index, line] of lines.entries()) {
    if (clause === undefined) {
      if (line.trim().length === 0) continue;
      clause = {
        start: index + 1,
        predicate: predicateNameFrom(line) ?? "unknown",
        lines: [],
      };
    }
    clause.lines.push(line);
    if (line.trim().endsWith(".")) {
      const violation = analyzeClause(
        clause.predicate,
        clause.start,
        clause.lines,
      );
      if (violation) violations.push(violation);
      clause = undefined;
    }
  }

  return violations;
}

function predicateNameFrom(line: string): string | null {
  const match = line.match(/^\s*([a-z][a-zA-Z0-9_]*)\s*\(/);
  return match?.[1] ?? null;
}

function analyzeClause(
  predicate: string,
  startLine: number,
  lines: readonly string[],
): QueryPlanSafetyViolation | null {
  const negationIndex = lines.findIndex((line) => NEGATION_PATTERN.test(line));
  if (negationIndex < 0) return null;
  const hasLaterGenerator = lines
    .slice(negationIndex + 1)
    .some((line) => GENERATOR_PATTERN.test(line));
  if (!hasLaterGenerator) return null;
  return {
    predicate,
    line: startLine + negationIndex,
    description:
      "Negation appears before later generator calls in the same clause.",
    suggestion:
      "Move kb_entity/kb_relationship/member/findall generators before \\+/1 so variables are bound before negation.",
  };
}
