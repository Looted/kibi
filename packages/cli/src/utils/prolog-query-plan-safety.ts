export interface PrologQueryPlanSafetyViolation {
  readonly predicate: string;
  readonly line: number;
  readonly description: string;
  readonly suggestion: string;
}

const GENERATOR_PATTERN =
  /\b(?:kb_entity|kb_relationship|member|memberchk|findall|setof|bagof)\s*\(/;
const NEGATION_PATTERN = /\\\+/;

export function analyzePrologQueryPlanSafety(
  source: string,
): PrologQueryPlanSafetyViolation[] {
  const violations: PrologQueryPlanSafetyViolation[] = [];
  let clauseStart = 0;
  let clauseLines: string[] = [];

  // A CRLF line keeps its "\r", which every check below trims away.
  source.split("\n").forEach((line, index) => {
    if (clauseLines.length === 0) {
      if (line.trim() === "") return;
      clauseStart = index + 1;
    }
    clauseLines.push(line);
    if (line.trim().endsWith(".")) {
      const predicate = predicateNameFrom(clauseLines[0] as string);
      const violation = analyzeClause(predicate, clauseStart, clauseLines);
      if (violation) violations.push(violation);
      clauseLines = [];
    }
  });

  return violations;
}

function predicateNameFrom(line: string): string {
  const match = line.match(/^\s*([a-z][a-zA-Z0-9_]*)\s*\(/);
  return match?.[1] ?? "unknown";
}

function analyzeClause(
  predicate: string,
  startLine: number,
  lines: readonly string[],
): PrologQueryPlanSafetyViolation | null {
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
