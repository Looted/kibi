import { validateRepositoryPolicyLeaks } from "./candidate-body";
import { JsonValueSchema, contractHash } from "./contracts/common";
import { sha256Text, validateCandidateBody } from "./variants";

export const MAX_BASELINE_INSERTION_PARAGRAPH_BYTES = 1_600;

export type BaselineInsertionPlan = Readonly<{
  currentBaselineBodyHash: string;
  frontmatterHash: string;
  resourcesHash: string;
  headingAnchor: string;
  objective: string;
}>;

export type BaselineInsertionReceipt = Readonly<{
  schemaVersion: "1.0.0";
  artifactType: "skillopt-baseline-insertion-composition";
  mode: "baseline-insertion";
  currentBaselineBodyHash: string;
  baselineBodyHash: string;
  frontmatterHash: string;
  resourcesHash: string;
  headingAnchor: string;
  objectiveHash: string;
  planHash: string;
  baselineBodyBytes: number;
  paragraphHash: string;
  paragraphBytes: number;
  insertionHash: string;
  insertionBytes: number;
  composedBodyHash: string;
  composedBodyBytes: number;
}>;

export type BaselineInsertionComposition = Readonly<{
  paragraph: string;
  composedBody: string;
  insertion: string;
  insertionOffset: number;
  receipt: BaselineInsertionReceipt;
}>;

export type BaselineInsertionValidationCode =
  | "plan_invalid"
  | "paragraph_too_large"
  | "multiple_paragraphs"
  | "non_paragraph"
  | "fence"
  | "header"
  | "metadata_leak"
  | "baseline_hash_mismatch"
  | "anchor_missing"
  | "anchor_not_unique";

export class BaselineInsertionValidationError extends Error {
  readonly name = "BaselineInsertionValidationError";

  constructor(readonly code: BaselineInsertionValidationCode) {
    super(`baseline_insertion_${code}`);
  }
}

function isSha256(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function isSafePlanText(value: unknown, maxBytes: number): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    !value.includes(String.fromCharCode(0)) &&
    !value.includes("\r") &&
    !value.includes("\n") &&
    Buffer.byteLength(value, "utf8") <= maxBytes
  );
}

// implements REQ-skillopt-codex-optimization
export function validateBaselineInsertionPlan(
  plan: BaselineInsertionPlan,
): void {
  if (
    !isSha256(plan.currentBaselineBodyHash) ||
    !isSha256(plan.frontmatterHash) ||
    !isSha256(plan.resourcesHash) ||
    !isSafePlanText(plan.objective, 1_000) ||
    typeof plan.headingAnchor !== "string" ||
    plan.headingAnchor.trim() !== plan.headingAnchor ||
    !/^ {0,3}#{1,6}[ \t]+\S.*$/.test(plan.headingAnchor)
  ) {
    throw new BaselineInsertionValidationError("plan_invalid");
  }
}

function assertParagraphShape(paragraph: string): void {
  if (
    Buffer.byteLength(paragraph, "utf8") >
    MAX_BASELINE_INSERTION_PARAGRAPH_BYTES
  ) {
    throw new BaselineInsertionValidationError("paragraph_too_large");
  }
  if (/\r?\n[ \t]*\r?\n/.test(paragraph)) {
    throw new BaselineInsertionValidationError("multiple_paragraphs");
  }
  if (/^ {0,3}(?:`{3,}|~{3,})/m.test(paragraph)) {
    throw new BaselineInsertionValidationError("fence");
  }
  const lines = paragraph.split(/\r?\n/);
  if (
    lines.some((line) => /^(?:[ \t]{4,}|\t)\S/.test(line)) ||
    lines.some((line) => /^ {0,3}(?:[-+*]|\d+[.)])(?:[ \t]+|$)/.test(line))
  ) {
    throw new BaselineInsertionValidationError("non_paragraph");
  }
  if (
    lines.some((line) => /^ {0,3}#{1,6}(?:[ \t]+|$)/.test(line)) ||
    lines.some(
      (line, index) => index > 0 && /^ {0,3}(?:=+|-+)[ \t]*$/.test(line),
    )
  ) {
    throw new BaselineInsertionValidationError("header");
  }
}

function assertNoOptimizationMetadata(paragraph: string): void {
  const metadataPatterns = [
    /\b(?:REQ|SCEN|TEST|SYM|FACT|ADR|FLAG|EVENT)-[a-z0-9][a-z0-9_.:-]*\b/i,
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i,
    /\b(?:fixture|task|run|episode|attempt|step|round)[-_][a-z0-9_-]*\d[a-z0-9_-]*\b/i,
    /\b(?:taskId|runId|episodeId|fixtureId|score|mean|hardPasses|worstFamilyMean|failureCategories)\s*[:=]/i,
    /\b(?:task|run|episode|attempt|step|round)\s+(?:id\s*)?(?:[a-z]+[-_])?[a-z]*\d[a-z0-9_-]*\b/i,
    /\b(?:optimization|evaluator|fixture|trajectory)\s+(?:note|log|metadata|evidence)\b/i,
  ];
  if (metadataPatterns.some((pattern) => pattern.test(paragraph))) {
    throw new BaselineInsertionValidationError("metadata_leak");
  }
}

// implements REQ-skillopt-codex-optimization
export function validateBaselineInsertionParagraph(
  paragraph: string,
  _plan: Pick<BaselineInsertionPlan, "objective">,
): void {
  validateCandidateBody(paragraph);
  validateRepositoryPolicyLeaks(paragraph);
  assertParagraphShape(paragraph);
  assertNoOptimizationMetadata(paragraph);
}

function headingStarts(body: string, anchor: string): number[] {
  const starts: number[] = [];
  let cursor = 0;
  while (cursor <= body.length) {
    const newline = body.indexOf("\n", cursor);
    const lineEnd =
      newline === -1
        ? body.length
        : newline > cursor && body[newline - 1] === "\r"
          ? newline - 1
          : newline;
    if (body.slice(cursor, lineEnd) === anchor) starts.push(cursor);
    if (newline === -1) break;
    cursor = newline + 1;
  }
  return starts;
}

// implements REQ-skillopt-codex-optimization
export function validateBaselineInsertionAnchor(
  body: string,
  headingAnchor: string,
): void {
  const matches = headingStarts(body, headingAnchor);
  if (matches.length === 0) {
    throw new BaselineInsertionValidationError("anchor_missing");
  }
  if (matches.length !== 1) {
    throw new BaselineInsertionValidationError("anchor_not_unique");
  }
}

function planHash(plan: BaselineInsertionPlan): string {
  return contractHash(JsonValueSchema.parse(plan));
}

function receiptFor(
  input: Readonly<{
    baselineBody: string;
    paragraph: string;
    insertion: string;
    composedBody: string;
    plan: BaselineInsertionPlan;
  }>,
): BaselineInsertionReceipt {
  const baselineBodyHash = sha256Text(input.baselineBody);
  const paragraphHash = sha256Text(input.paragraph);
  return {
    schemaVersion: "1.0.0",
    artifactType: "skillopt-baseline-insertion-composition",
    mode: "baseline-insertion",
    currentBaselineBodyHash: input.plan.currentBaselineBodyHash,
    baselineBodyHash,
    frontmatterHash: input.plan.frontmatterHash,
    resourcesHash: input.plan.resourcesHash,
    headingAnchor: input.plan.headingAnchor,
    objectiveHash: sha256Text(input.plan.objective),
    planHash: planHash(input.plan),
    baselineBodyBytes: Buffer.byteLength(input.baselineBody, "utf8"),
    paragraphHash,
    paragraphBytes: Buffer.byteLength(input.paragraph, "utf8"),
    insertionHash: sha256Text(input.insertion),
    insertionBytes: Buffer.byteLength(input.insertion, "utf8"),
    composedBodyHash: sha256Text(input.composedBody),
    composedBodyBytes: Buffer.byteLength(input.composedBody, "utf8"),
  };
}

// implements REQ-skillopt-codex-optimization
export function composeBaselineInsertion(
  input: Readonly<{
    baselineBody: string;
    paragraph: string;
    plan: BaselineInsertionPlan;
  }>,
): BaselineInsertionComposition {
  validateBaselineInsertionPlan(input.plan);
  if (sha256Text(input.baselineBody) !== input.plan.currentBaselineBodyHash) {
    throw new BaselineInsertionValidationError("baseline_hash_mismatch");
  }
  validateBaselineInsertionParagraph(input.paragraph, input.plan);

  validateBaselineInsertionAnchor(input.baselineBody, input.plan.headingAnchor);
  const matches = headingStarts(input.baselineBody, input.plan.headingAnchor);

  const insertionOffset = matches[0] ?? 0;
  const before = input.baselineBody.slice(0, insertionOffset);
  const after = input.baselineBody.slice(insertionOffset);
  const newline = input.baselineBody.includes("\r\n") ? "\r\n" : "\n";
  const beforePadding =
    before.length > 0 && !before.endsWith("\n") ? newline : "";
  const paragraphPadding = input.paragraph.endsWith("\n")
    ? newline
    : `${newline}${newline}`;
  const insertion = `${beforePadding}${input.paragraph}${paragraphPadding}`;
  const composedBody = `${before}${insertion}${after}`;

  // This is intentionally shallow: the legacy completeness policy does not
  // apply to a baseline-preserving patch.
  validateCandidateBody(composedBody);
  validateRepositoryPolicyLeaks(composedBody);

  return {
    paragraph: input.paragraph,
    composedBody,
    insertion,
    insertionOffset,
    receipt: receiptFor({
      baselineBody: input.baselineBody,
      paragraph: input.paragraph,
      insertion,
      composedBody,
      plan: input.plan,
    }),
  };
}
