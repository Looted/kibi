import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { KbRejection } from "../../cli-errors.js";
import {
  type PreparedImpactReview,
  createImpactReviewRecord,
} from "../../traceability/impact-evaluator.js";
import { validateDecisionAgainstSnapshot } from "../../traceability/impact-record-validation.js";
import {
  type AnalysisReview,
  IMPACT_REVIEW_PATH,
  type ImpactDecision,
  canonicalJson,
} from "../../traceability/impact-review.js";
import {
  captureImpactReview,
  withoutAnalysisReviews,
} from "./impact-review-preparation.js";
import type { OperationContext } from "./runtime-types.js";
import type { OperationResult } from "./types.js";

export type AuthoredImpactFile = Readonly<{
  path: string;
  decision: ImpactDecision;
  analysisReviews?: readonly AnalysisReview[];
}>;

export type AuthorImpactReviewInput = Readonly<{
  scope: Readonly<{ kind: "staged" }>;
  /** recordHeaders.scope.fingerprint from kb_prepare_impact_review. */
  scopeFingerprint: string;
  reviewer: Readonly<{ id: string }>;
  reviewedAt?: string;
  files: readonly AuthoredImpactFile[];
}>;

type Authored = Readonly<{
  decision: ImpactDecision;
  analysisReviews?: readonly AnalysisReview[];
}>;

function refuse(message: string, field: string): never {
  throw new KbRejection("VALIDATION_FAILED", message, [
    { rule: "impact_review_authoring_invalid", field },
  ]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** The record in the working tree, read as plain JSON; absent or unreadable is none. */
function workingRecord(workspaceRoot: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(
      readFileSync(path.join(workspaceRoot, IMPACT_REVIEW_PATH), "utf8"),
    );
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Decisions an earlier record authored that still hold: the file's evidence
 * is the evidence captured now and, when it names requirements, the captured
 * knowledge is the knowledge it was decided against.
 */
export function carriedDecisions(
  previous: Record<string, unknown> | null,
  prepared: PreparedImpactReview,
): Readonly<{ carried: Map<string, Authored>; dropped: string[] }> {
  const carried = new Map<string, Authored>();
  const dropped: string[] = [];
  if (previous === null || !Array.isArray(previous.files))
    return { carried, dropped };
  const scope = isRecord(previous.scope) ? previous.scope : {};
  const sameKnowledge =
    scope.knowledgeFingerprint === prepared.knowledgeFingerprint;
  const captured = new Map(
    prepared.files.map((file) => [
      file.path,
      canonicalJson(withoutAnalysisReviews(file)),
    ]),
  );
  for (const file of previous.files) {
    if (!isRecord(file) || typeof file.path !== "string") continue;
    if (!isRecord(file.decision)) continue;
    const { decision, analysisReviews, ...evidence } = file;
    const requirementIds =
      prepared.scopedRequirementIdsByPath.get(file.path) ?? [];
    const holds =
      captured.get(file.path) === canonicalJson(evidence) &&
      (sameKnowledge || requirementIds.length === 0);
    if (holds)
      carried.set(file.path, {
        decision: decision as ImpactDecision,
        ...(Array.isArray(analysisReviews)
          ? { analysisReviews: analysisReviews as AnalysisReview[] }
          : {}),
      });
    else dropped.push(file.path);
  }
  return { carried, dropped: dropped.sort() };
}

export function writeRecord(workspaceRoot: string, record: unknown): void {
  const absolute = path.join(workspaceRoot, IMPACT_REVIEW_PATH);
  mkdirSync(path.dirname(absolute), { recursive: true });
  const temporary = `${absolute}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(record, null, 2)}\n`);
  renameSync(temporary, absolute);
}

/** Refuses decisions made against a scope other than the captured one. */
export function assertScopeFingerprint(
  sent: string,
  prepared: PreparedImpactReview,
): void {
  if (sent !== prepared.scopeFingerprint)
    refuse(
      `The staged scope changed since it was prepared (sent ${sent}; captured ${prepared.scopeFingerprint}). Call kb_prepare_impact_review again and decide the files it lists.`,
      "scopeFingerprint",
    );
}

/** The decisions sent now, by path, each for a captured file and only once. */
export function sentDecisions(
  files: readonly AuthoredImpactFile[],
  expected: ReadonlySet<string>,
): Map<string, Authored> {
  const sent = new Map<string, Authored>();
  for (const file of files) {
    if (!expected.has(file.path))
      refuse(
        `Not in the captured review inventory: ${file.path}`,
        "files.path",
      );
    if (sent.has(file.path))
      refuse(`Decided twice: ${file.path}`, "files.path");
    sent.set(file.path, {
      decision: file.decision,
      ...(file.analysisReviews
        ? { analysisReviews: file.analysisReviews }
        : {}),
    });
  }
  return sent;
}

/**
 * Every captured file's decision: the one sent now, else one the earlier
 * record holds that still applies. Refuses an undecided file and names an
 * earlier decision dropped for it.
 */
export function decisionsForScope(
  expected: ReadonlySet<string>,
  sent: ReadonlyMap<string, Authored>,
  previous: ReturnType<typeof carriedDecisions>,
): Map<string, Authored> {
  const decisions = new Map<string, Authored>();
  for (const filePath of [...expected].sort()) {
    const authored = sent.get(filePath) ?? previous.carried.get(filePath);
    if (authored) decisions.set(filePath, authored);
  }
  const undecided = [...expected].filter(
    (filePath) => !decisions.has(filePath),
  );
  if (undecided.length > 0) {
    const stale = previous.dropped.filter((filePath) =>
      undecided.includes(filePath),
    );
    refuse(
      `Every captured file needs a decision; undecided: ${undecided.sort().join(", ")}${stale.length > 0 ? `. The earlier record's decision was dropped because the file or its requirements changed: ${stale.join(", ")}` : ""}`,
      "files",
    );
  }
  return decisions;
}

/**
 * The record the decisions make with the captured evidence, after the same
 * strict validation the gate applies; any failure is a refusal.
 */
export function validatedRecord(
  captured: Readonly<{
    prepared: PreparedImpactReview;
    changedPaths: ReadonlySet<string>;
  }>,
  decisions: ReadonlyMap<string, Authored>,
  reviewerId: string,
  reviewedAt: string,
): ReturnType<typeof createImpactReviewRecord> {
  try {
    for (const [filePath, authored] of decisions)
      validateDecisionAgainstSnapshot(
        filePath,
        authored.decision,
        captured.prepared,
        captured.changedPaths,
      );
    return createImpactReviewRecord(
      captured.prepared,
      decisions,
      reviewerId,
      reviewedAt,
    );
  } catch (error) {
    // The record validators throw plain errors that name the field.
    return refuse((error as Error).message, "files");
  }
}

/**
 * `kb_author_impact_review` (CLI `kibi author-impact-review`): write the
 * staged scope's impact-review record from the reviewer's decisions. Kibi
 * captures the evidence itself, keeps an earlier decision only for a file
 * whose evidence and knowledge are unchanged, validates the whole record and
 * writes it atomically. It never stages the record or authors a decision.
 */
export async function executeAuthorImpactReview(
  input: AuthorImpactReviewInput,
  context: OperationContext,
): Promise<OperationResult<Record<string, unknown>>> {
  const workspaceRoot = context.workspaceRoot;
  const { snapshot, prepared, assertUnchanged } = await captureImpactReview(
    input.scope,
    workspaceRoot,
  );
  assertScopeFingerprint(input.scopeFingerprint, prepared);
  const expected = new Set(prepared.files.map((file) => file.path));
  const sent = sentDecisions(input.files, expected);
  const previous = carriedDecisions(workingRecord(workspaceRoot), prepared);
  const decisions = decisionsForScope(expected, sent, previous);
  const record = validatedRecord(
    {
      prepared,
      changedPaths: new Set(snapshot.inventory.map((file) => file.path)),
    },
    decisions,
    input.reviewer.id,
    input.reviewedAt ?? context.clock().toISOString(),
  );
  assertUnchanged();
  writeRecord(workspaceRoot, record);
  const dropped = previous.dropped.filter((filePath) => !sent.has(filePath));
  const carried = [...previous.carried.keys()]
    .filter((filePath) => !sent.has(filePath))
    .sort();
  return {
    content: [
      {
        type: "text",
        text: `Wrote ${IMPACT_REVIEW_PATH} for ${record.files.length} file(s): ${sent.size} decided now, ${carried.length} kept from the earlier record${dropped.length > 0 ? `, ${dropped.length} earlier decision(s) dropped because the file or its requirements changed (${dropped.join(", ")})` : ""}. Stage it with git add -f ${IMPACT_REVIEW_PATH}; the record is the reviewer's self-claimed review, not an approval or proof.`,
      },
    ],
    structuredContent: {
      recordPath: IMPACT_REVIEW_PATH,
      written: true,
      scopeFingerprint: prepared.scopeFingerprint,
      fileCount: record.files.length,
      decided: [...sent.keys()].sort(),
      carried,
      dropped,
      staged: false,
    },
  };
}
