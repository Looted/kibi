import { runAggregatedChecks } from "../commands/aggregated-checks.js";
import type { ExtractionResult } from "../extractors/markdown.js";
import type { Violation } from "../public/check-types.js";
import { isEntityLanePath } from "../utils/kb-paths.js";
import { readSnapshotKnowledge } from "./snapshot-knowledge.js";
import {
  cleanupTempKb,
  createTempKb,
  projectStagedEntities,
} from "./temp-kb.js";

/**
 * Canonical rules that decide whether the staged knowledge is consistent:
 * requirement contradictions, success scenarios a current requirement
 * forbids, and exceptions that name claims they cannot waive. They read only
 * authored knowledge, so the staged tree alone decides them.
 */
// implements REQ-cli-staged-consistency
const STAGED_CONSISTENCY_RULES: readonly string[] = [
  "domain-contradictions",
  "scenario-feasibility",
  "exception-claim-keys",
];

type SnapshotReader = Readonly<{
  baseTree: string;
  headTree: string;
  readGit(args: readonly string[]): Buffer;
  readBlobs(oids: readonly string[]): ReadonlyMap<string, Buffer>;
}>;

/**
 * True when the staged change set touches entity documents or relationship
 * shards, the only knowledge these rules read. A symbols manifest change
 * alone cannot change their outcome.
 */
// implements REQ-cli-staged-consistency
export function stagesKnowledge(paths: readonly string[]): boolean {
  return paths.some(
    (file) =>
      (isEntityLanePath(file) && file.endsWith(".md")) ||
      (file.startsWith(".kb/relationships/") && /\.ya?ml$/.test(file)),
  );
}

// implements REQ-cli-staged-consistency
function violationKey(violation: Violation): string {
  return JSON.stringify([
    violation.rule,
    violation.entityId,
    violation.description,
  ]);
}

/**
 * The knowledge these rules read: every entity except code symbols, and the
 * relationships between them. Symbols and their edges are most of a large
 * KB and would dominate the projection time of a pre-commit hook.
 */
// implements REQ-cli-staged-consistency
function withoutSymbols(knowledge: ExtractionResult[]): ExtractionResult[] {
  const ids = new Set(
    knowledge
      .filter(({ entity }) => entity.type !== "symbol")
      .map(({ entity }) => entity.id),
  );
  return knowledge
    .filter(({ entity }) => ids.has(entity.id))
    .map((result) => ({
      ...result,
      relationships: result.relationships.filter(
        (relationship) =>
          ids.has(relationship.from) && ids.has(relationship.to),
      ),
    }));
}

// implements REQ-cli-staged-consistency
async function consistencyViolations(
  knowledge: ExtractionResult[],
): Promise<Violation[]> {
  const ctx = await createTempKb();
  try {
    await projectStagedEntities(ctx.prolog, withoutSymbols(knowledge));
    return await runAggregatedChecks(
      ctx.prolog,
      new Set(STAGED_CONSISTENCY_RULES),
    );
  } finally {
    await cleanupTempKb(ctx.tempDir);
  }
}

/**
 * Consistency violations the staged tree has and the base tree does not.
 * A violation already present at the base commit does not block an
 * unrelated commit; full `kibi check` still reports it. The base tree is
 * only analyzed when the staged tree has violations.
 */
// implements REQ-cli-staged-consistency
export async function collectIntroducedConsistencyViolations(
  snapshot: SnapshotReader,
  headKnowledge: ExtractionResult[],
): Promise<Violation[]> {
  const head = await consistencyViolations(headKnowledge);
  if (head.length === 0) return [];
  const base = await consistencyViolations(
    readSnapshotKnowledge(
      snapshot.readGit,
      snapshot.baseTree,
      snapshot.readBlobs,
    ),
  );
  const existing = new Set(base.map(violationKey));
  return head.filter((violation) => !existing.has(violationKey(violation)));
}

/** Text lines for introduced consistency violations, in `kibi check` form. */
// implements REQ-cli-staged-consistency
export function formatConsistencyViolations(
  violations: readonly Violation[],
): string[] {
  const lines = [
    `Found ${violations.length} consistency violation(s) introduced by the staged changes:`,
    "",
  ];
  for (const violation of violations) {
    lines.push(`[${violation.rule}] ${violation.entityId}`);
    if (violation.source) lines.push(`  Source: ${violation.source}`);
    lines.push(`  ${violation.description}`, "");
  }
  return lines;
}
