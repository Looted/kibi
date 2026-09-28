import { createHash } from "node:crypto";
import type { HunkRange, Status } from "./git-staged.js";

export const IMPACT_POLICY_PATH = ".kibi/impact-policy.json";
export const IMPACT_REVIEW_PATH = ".kibi/impact-review.json";
export const IMPACT_POLICY_VERSION = "kibi.impact-policy.v1" as const;
export const IMPACT_REVIEW_VERSION = "kibi.impact-review.v1" as const;
export const IMPACT_EVALUATOR_VERSION = "kibi.impact-evaluator.v1" as const;

export type Fingerprint = `sha256:${string}`;
export type ImpactPolicy = Readonly<{
  contractVersion: typeof IMPACT_POLICY_VERSION;
  id: string;
  version: string;
  allowUnsupportedReview: boolean;
  /** Exact trusted diagnostic/provider pairs; no globs or prefix matching. */
  allowedPartial: readonly Readonly<{
    providerId: string;
    providerFingerprint: Fingerprint;
    diagnosticCode: string;
    limitationClass: string;
  }>[];
  /** Exact paths only. These paths still need a record and rationale. */
  notApplicablePaths: readonly string[];
}>;

export type SideEvidence = Readonly<{
  mode: string;
  objectId: string | null;
  byteFingerprint: Fingerprint;
  kind: "regular" | "symlink" | "gitlink";
  contentProjection?: "proof_receipts_stripped";
  analysis: null | Readonly<{
    contractVersion: string;
    status: "ok" | "partial" | "unsupported" | "failed";
    language: string;
    sourceFile: string;
    providerId: string | null;
    providerStamp: unknown;
    providerFingerprint: Fingerprint | null;
    inputFingerprint: Fingerprint;
    resultFingerprint: Fingerprint;
    diagnosticCodes: readonly string[];
    uncoveredRanges: readonly Readonly<{
      startLine: number;
      startColumn: number;
      endLine: number;
      endColumn: number;
      reason: string;
    }>[];
  }>;
}>;

export type AnalysisReview =
  | Readonly<{
      kind: "unsupported_review";
      side: "before" | "after";
      wholeFile: true;
      rationale: string;
    }>
  | Readonly<{
      kind: "partial_review";
      side: "before" | "after";
      limitationClass: string;
      ranges: SideEvidence["analysis"] extends infer _T
        ? readonly Readonly<{
            startLine: number;
            startColumn: number;
            endLine: number;
            endColumn: number;
            reason: string;
          }>[]
        : never;
      rationale: string;
    }>;

export type ImpactDecision =
  | Readonly<{
      kind: "impact";
      requirementIds: readonly string[];
      knowledge:
        | Readonly<{ state: "still_current"; rationale: string }>
        | Readonly<{
            state: "updated";
            stillCurrent?: readonly Readonly<{
              requirementId: string;
              rationale: string;
            }>[];
            entities: readonly Readonly<{
              entityId: string;
              artifactPath: string;
              beforeFingerprint: Fingerprint | null;
              afterFingerprint: Fingerprint;
            }>[];
          }>;
    }>
  | Readonly<{ kind: "no_impact"; reason: string; rationale: string }>
  | Readonly<{
      kind: "not_applicable";
      policyReason: string;
      rationale: string;
    }>;

export type ImpactFileRecord = Readonly<{
  path: string;
  status: Status;
  oldPath?: string;
  copyFromPath?: string;
  analysisDepth: "symbol" | "metadata" | "file" | "none";
  disposition: "checked" | "advisory" | "skipped";
  skipReason?: "binary" | "unsupported_encoding" | "symlink" | "submodule";
  gitMode?: string;
  previousMode?: string;
  oldHunkRanges: readonly HunkRange[];
  newHunkRanges: readonly HunkRange[];
  before: SideEvidence | null;
  after: SideEvidence | null;
  analysisReviews: readonly AnalysisReview[];
  decision: ImpactDecision;
}>;

export type ImpactReviewRecord = Readonly<{
  contractVersion: typeof IMPACT_REVIEW_VERSION;
  policy: Readonly<{ id: string; version: string; fingerprint: Fingerprint }>;
  evaluator: Readonly<{
    contractVersion: typeof IMPACT_EVALUATOR_VERSION;
    fingerprint: Fingerprint;
  }>;
  scope: Readonly<{
    fingerprint: Fingerprint;
    knowledgeFingerprint: Fingerprint;
    providerSetFingerprint: Fingerprint;
  }>;
  /** Self-claimed local provenance; this field is explicitly not authorization. */
  reviewer: Readonly<{ id: string; source: "self-claimed-local" }>;
  reviewedAt: string;
  files: readonly ImpactFileRecord[];
}>;

export type ImpactReviewDiagnostic = Readonly<{
  code: string;
  message: string;
  path?: string;
}>;

const SHA256_RE = /^sha256:[0-9a-f]{64}$/;
const GIT_OID_RE = /^[0-9a-f]{40,64}$/;

export function canonicalJson(value: unknown): string {
  const active = new Set<object>();
  const encode = (item: unknown): string => {
    if (item === null || typeof item === "string" || typeof item === "boolean")
      return JSON.stringify(item);
    if (typeof item === "number") {
      if (!Number.isFinite(item))
        throw new Error("Impact evidence contains a non-finite number");
      return JSON.stringify(item);
    }
    if (Array.isArray(item)) {
      if (active.has(item)) throw new Error("Impact evidence contains a cycle");
      active.add(item);
      const result = `[${item.map(encode).join(",")}]`;
      active.delete(item);
      return result;
    }
    if (typeof item === "object" && item !== null) {
      if (active.has(item)) throw new Error("Impact evidence contains a cycle");
      active.add(item);
      const record = item as Record<string, unknown>;
      const keys = Object.keys(record).sort();
      const result = `{${keys.map((key) => `${JSON.stringify(key)}:${encode(record[key])}`).join(",")}}`;
      active.delete(item);
      return result;
    }
    throw new Error("Impact evidence is not JSON-safe");
  };
  return encode(value);
}

export function fingerprint(value: unknown): Fingerprint {
  return `sha256:${createHash("sha256").update(canonicalJson(value), "utf8").digest("hex")}`;
}

export function fingerprintBytes(value: Uint8Array): Fingerprint {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
  label: string,
): void {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (canonicalJson(actual) !== canonicalJson(expected))
    throw new Error(`${label} has unknown or missing fields`);
}

function exactKeysWithOptional(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[],
  label: string,
): void {
  const actual = Object.keys(value);
  if (
    required.some((key) => !Object.hasOwn(value, key)) ||
    actual.some((key) => !required.includes(key) && !optional.includes(key))
  )
    throw new Error(`${label} has unknown or missing fields`);
}

export function parseImpactPolicy(value: unknown): ImpactPolicy {
  if (!isObject(value)) throw new Error("Impact policy must be an object");
  exactKeys(
    value,
    [
      "contractVersion",
      "id",
      "version",
      "allowUnsupportedReview",
      "allowedPartial",
      "notApplicablePaths",
    ],
    "Impact policy",
  );
  if (value.contractVersion !== IMPACT_POLICY_VERSION)
    throw new Error("Unknown impact policy version");
  if (
    typeof value.id !== "string" ||
    !value.id.trim() ||
    typeof value.version !== "string" ||
    !value.version.trim()
  )
    throw new Error("Impact policy id and version are required");
  if (typeof value.allowUnsupportedReview !== "boolean")
    throw new Error("Impact policy allowUnsupportedReview must be boolean");
  if (
    !Array.isArray(value.allowedPartial) ||
    !Array.isArray(value.notApplicablePaths)
  )
    throw new Error("Impact policy lists are required");
  const partial: ImpactPolicy["allowedPartial"][number][] = [];
  const partialKeys = new Set<string>();
  for (const [index, row] of value.allowedPartial.entries()) {
    if (!isObject(row))
      throw new Error(`allowedPartial[${index}] must be an object`);
    exactKeys(
      row,
      [
        "providerId",
        "providerFingerprint",
        "diagnosticCode",
        "limitationClass",
      ],
      `allowedPartial[${index}]`,
    );
    if (
      [row.providerId, row.diagnosticCode, row.limitationClass].some(
        (part) => typeof part !== "string" || !part.trim(),
      ) ||
      typeof row.providerFingerprint !== "string" ||
      !SHA256_RE.test(row.providerFingerprint)
    )
      throw new Error(`allowedPartial[${index}] is invalid`);
    const entry = row as unknown as ImpactPolicy["allowedPartial"][number];
    const key = canonicalJson({
      providerId: entry.providerId,
      providerFingerprint: entry.providerFingerprint,
      diagnosticCode: entry.diagnosticCode,
    });
    if (partialKeys.has(key))
      throw new Error(
        "Impact policy contains conflicting or duplicate partial allowance selectors",
      );
    partialKeys.add(key);
    partial.push(entry);
  }
  const paths: string[] = [];
  const seenPaths = new Set<string>();
  for (const path of value.notApplicablePaths) {
    if (
      typeof path !== "string" ||
      !path.trim() ||
      path.startsWith("/") ||
      path.includes("\\") ||
      path
        .split("/")
        .some((segment) => !segment || segment === "." || segment === "..")
    )
      throw new Error("Impact policy has an invalid notApplicablePaths entry");
    if (seenPaths.has(path))
      throw new Error(`Impact policy duplicates not-applicable path: ${path}`);
    seenPaths.add(path);
    paths.push(path);
  }
  return {
    contractVersion: IMPACT_POLICY_VERSION,
    id: value.id,
    version: value.version,
    allowUnsupportedReview: value.allowUnsupportedReview,
    allowedPartial: partial,
    notApplicablePaths: paths,
  };
}

export function parseImpactReviewRecord(value: unknown): ImpactReviewRecord {
  if (!isObject(value))
    throw new Error("Impact review record must be an object");
  if (value.contractVersion !== IMPACT_REVIEW_VERSION)
    throw new Error("Unknown impact review version");
  const top = [
    "contractVersion",
    "policy",
    "evaluator",
    "scope",
    "reviewer",
    "reviewedAt",
    "files",
  ];
  exactKeys(value, top, "Impact review record");
  if (
    !isObject(value.policy) ||
    !isObject(value.evaluator) ||
    !isObject(value.scope) ||
    !isObject(value.reviewer) ||
    !Array.isArray(value.files)
  )
    throw new Error("Impact review record has invalid fields");
  exactKeys(value.policy, ["id", "version", "fingerprint"], "Record policy");
  exactKeys(
    value.evaluator,
    ["contractVersion", "fingerprint"],
    "Record evaluator",
  );
  exactKeys(
    value.scope,
    ["fingerprint", "knowledgeFingerprint", "providerSetFingerprint"],
    "Record scope",
  );
  exactKeys(value.reviewer, ["id", "source"], "Record reviewer");
  const hashes = [
    value.policy.fingerprint,
    value.evaluator.fingerprint,
    value.scope.fingerprint,
    value.scope.knowledgeFingerprint,
    value.scope.providerSetFingerprint,
  ];
  if (hashes.some((hash) => typeof hash !== "string" || !SHA256_RE.test(hash)))
    throw new Error("Impact review record has an invalid fingerprint");
  if (
    typeof value.policy.id !== "string" ||
    typeof value.policy.version !== "string" ||
    value.evaluator.contractVersion !== IMPACT_EVALUATOR_VERSION ||
    typeof value.reviewer.id !== "string" ||
    !value.reviewer.id.trim() ||
    value.reviewer.source !== "self-claimed-local"
  )
    throw new Error("Impact review identity is invalid");
  if (
    typeof value.reviewedAt !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value.reviewedAt,
    ) ||
    !Number.isFinite(Date.parse(value.reviewedAt))
  )
    throw new Error("Impact review timestamp is invalid");
  const paths = new Set<string>();
  for (const [index, row] of value.files.entries()) {
    if (!isObject(row)) throw new Error(`files[${index}] must be an object`);
    const required = [
      "path",
      "status",
      "analysisDepth",
      "disposition",
      "oldHunkRanges",
      "newHunkRanges",
      "before",
      "after",
      "analysisReviews",
      "decision",
    ];
    for (const key of [
      "oldPath",
      "copyFromPath",
      "skipReason",
      "gitMode",
      "previousMode",
    ])
      if (key in row) required.push(key);
    exactKeys(row, required, `files[${index}]`);
    if (
      typeof row.path !== "string" ||
      !row.path ||
      row.path === IMPACT_REVIEW_PATH ||
      row.path.startsWith("/") ||
      row.path.includes("\\") ||
      row.path
        .split("/")
        .some((segment) => !segment || segment === "." || segment === "..")
    )
      throw new Error(`files[${index}] has an invalid path`);
    if (paths.has(row.path))
      throw new Error(`Duplicate impact review path: ${row.path}`);
    paths.add(row.path);
    const validStatuses: readonly string[] = ["A", "M", "R", "C", "T", "D"];
    if (typeof row.status !== "string" || !validStatuses.includes(row.status))
      throw new Error(`files[${index}] has an invalid status`);
    if (
      row.oldPath !== undefined &&
      (typeof row.oldPath !== "string" || !row.oldPath)
    )
      throw new Error(`files[${index}] has an invalid oldPath`);
    if (
      row.copyFromPath !== undefined &&
      (typeof row.copyFromPath !== "string" || !row.copyFromPath)
    )
      throw new Error(`files[${index}] has an invalid copyFromPath`);
    if (
      !["symbol", "metadata", "file", "none"].includes(
        String(row.analysisDepth),
      ) ||
      !["checked", "advisory", "skipped"].includes(String(row.disposition))
    )
      throw new Error(`files[${index}] has invalid analysis disposition`);
    if (
      row.skipReason !== undefined &&
      !["binary", "unsupported_encoding", "symlink", "submodule"].includes(
        String(row.skipReason),
      )
    )
      throw new Error(`files[${index}] has invalid skipReason`);
    if (
      (row.gitMode !== undefined && typeof row.gitMode !== "string") ||
      (row.previousMode !== undefined && typeof row.previousMode !== "string")
    )
      throw new Error(`files[${index}] has invalid mode metadata`);
    if (
      !Array.isArray(row.oldHunkRanges) ||
      !Array.isArray(row.newHunkRanges) ||
      !Array.isArray(row.analysisReviews) ||
      !isObject(row.decision)
    )
      throw new Error(`files[${index}] is malformed`);
    for (const hunk of [...row.oldHunkRanges, ...row.newHunkRanges])
      if (
        !isObject(hunk) ||
        Object.keys(hunk).sort().join(",") !== "end,start" ||
        !Number.isSafeInteger(hunk.start) ||
        !Number.isSafeInteger(hunk.end) ||
        (hunk.start as number) < 0 ||
        (hunk.end as number) < (hunk.start as number)
      )
        throw new Error(`files[${index}] has an invalid hunk range`);
    if (row.before !== null)
      validateSideEvidence(row.before, `files[${index}].before`);
    if (row.after !== null)
      validateSideEvidence(row.after, `files[${index}].after`);
    for (const side of [row.before, row.after])
      if (
        isObject(side) &&
        Object.hasOwn(side, "contentProjection") &&
        (!row.path.startsWith(".kb/") || !row.path.endsWith(".md"))
      )
        throw new Error(
          `files[${index}] uses a KB markdown projection outside a KB markdown path`,
        );
    if (row.before === null && row.after === null)
      throw new Error(`files[${index}] has no Git side`);
    validateDecision(row.decision);
    for (const review of row.analysisReviews) validateAnalysisReview(review);
  }
  return value as unknown as ImpactReviewRecord;
}

function validateDecision(value: Record<string, unknown>): void {
  switch (value.kind) {
    case "impact": {
      exactKeys(
        value,
        ["kind", "requirementIds", "knowledge"],
        "Impact decision",
      );
      if (
        !Array.isArray(value.requirementIds) ||
        value.requirementIds.length === 0 ||
        value.requirementIds.some(
          (id) => typeof id !== "string" || !id.trim(),
        ) ||
        !isObject(value.knowledge)
      )
        throw new Error(
          "Impact decision requires requirement IDs and knowledge evidence",
        );
      if (value.knowledge.state === "still_current") {
        exactKeys(
          value.knowledge,
          ["state", "rationale"],
          "still_current evidence",
        );
        if (
          typeof value.knowledge.rationale !== "string" ||
          !value.knowledge.rationale.trim()
        )
          throw new Error("still_current requires rationale");
      } else if (value.knowledge.state === "updated") {
        exactKeysWithOptional(
          value.knowledge,
          ["state", "entities"],
          ["stillCurrent"],
          "updated evidence",
        );
        if (
          !Array.isArray(value.knowledge.entities) ||
          value.knowledge.entities.length === 0
        )
          throw new Error("updated evidence requires entity fingerprints");
        if (value.knowledge.stillCurrent !== undefined) {
          if (!Array.isArray(value.knowledge.stillCurrent))
            throw new Error("stillCurrent must be an array");
          const acknowledgments = new Set<string>();
          for (const item of value.knowledge.stillCurrent) {
            if (!isObject(item))
              throw new Error(
                "stillCurrent requirement acknowledgment is invalid",
              );
            exactKeys(
              item,
              ["requirementId", "rationale"],
              "stillCurrent requirement acknowledgment",
            );
            if (
              typeof item.requirementId !== "string" ||
              !item.requirementId.trim() ||
              typeof item.rationale !== "string" ||
              !item.rationale.trim()
            )
              throw new Error(
                "stillCurrent requirement acknowledgment requires an ID and rationale",
              );
            const canonicalItem = canonicalJson(item);
            if (acknowledgments.has(canonicalItem))
              throw new Error(
                `stillCurrent duplicates acknowledgment ${item.requirementId}`,
              );
            acknowledgments.add(canonicalItem);
          }
        }
        const entityIds = new Set<string>();
        for (const entity of value.knowledge.entities) {
          if (!isObject(entity))
            throw new Error("updated entity evidence is invalid");
          exactKeys(
            entity,
            [
              "entityId",
              "artifactPath",
              "beforeFingerprint",
              "afterFingerprint",
            ],
            "updated entity evidence",
          );
          if (
            typeof entity.entityId !== "string" ||
            typeof entity.artifactPath !== "string" ||
            entity.artifactPath.startsWith("/") ||
            entity.artifactPath.includes("\\") ||
            entity.artifactPath
              .split("/")
              .some(
                (segment) => !segment || segment === "." || segment === "..",
              ) ||
            (entity.beforeFingerprint !== null &&
              (typeof entity.beforeFingerprint !== "string" ||
                !SHA256_RE.test(entity.beforeFingerprint))) ||
            typeof entity.afterFingerprint !== "string" ||
            !SHA256_RE.test(entity.afterFingerprint)
          )
            throw new Error("updated entity fingerprint is invalid");
          if (entityIds.has(entity.entityId))
            throw new Error(
              `updated evidence duplicates entity ${entity.entityId}`,
            );
          entityIds.add(entity.entityId);
        }
      } else throw new Error("Unknown impact knowledge state");
      return;
    }
    case "no_impact":
      exactKeys(value, ["kind", "reason", "rationale"], "no_impact decision");
      if (
        typeof value.reason !== "string" ||
        !value.reason.trim() ||
        typeof value.rationale !== "string" ||
        !value.rationale.trim()
      )
        throw new Error("no_impact requires a reason and rationale");
      return;
    case "not_applicable":
      exactKeys(
        value,
        ["kind", "policyReason", "rationale"],
        "not_applicable decision",
      );
      if (
        typeof value.policyReason !== "string" ||
        !value.policyReason.trim() ||
        typeof value.rationale !== "string" ||
        !value.rationale.trim()
      )
        throw new Error("not_applicable requires policy reason and rationale");
      return;
    default:
      throw new Error("Unknown impact decision kind");
  }
}

function validateAnalysisReview(value: unknown): void {
  if (!isObject(value)) throw new Error("Analysis review must be an object");
  if (value.kind === "unsupported_review") {
    exactKeys(
      value,
      ["kind", "side", "wholeFile", "rationale"],
      "unsupported review",
    );
    if (
      (value.side !== "before" && value.side !== "after") ||
      value.wholeFile !== true ||
      typeof value.rationale !== "string" ||
      !value.rationale.trim()
    )
      throw new Error("Unsupported review is invalid");
  } else if (value.kind === "partial_review") {
    exactKeys(
      value,
      ["kind", "side", "limitationClass", "ranges", "rationale"],
      "partial review",
    );
    if (
      (value.side !== "before" && value.side !== "after") ||
      typeof value.limitationClass !== "string" ||
      !value.limitationClass.trim() ||
      !Array.isArray(value.ranges) ||
      value.ranges.length === 0 ||
      typeof value.rationale !== "string" ||
      !value.rationale.trim()
    )
      throw new Error("Partial review is invalid");
    for (const range of value.ranges) {
      if (!isObject(range)) throw new Error("Partial review range is invalid");
      exactKeys(
        range,
        ["startLine", "startColumn", "endLine", "endColumn", "reason"],
        "partial review range",
      );
      if (
        !isObject(range) ||
        !Number.isSafeInteger(range.startLine) ||
        (range.startLine as number) < 1 ||
        !Number.isSafeInteger(range.startColumn) ||
        (range.startColumn as number) < 0 ||
        !Number.isSafeInteger(range.endLine) ||
        (range.endLine as number) < 1 ||
        !Number.isSafeInteger(range.endColumn) ||
        (range.endColumn as number) < 0 ||
        typeof range.reason !== "string" ||
        !range.reason.trim()
      )
        throw new Error("Partial review range is invalid");
    }
  } else throw new Error("Unknown analysis review kind");
}

function validateSideEvidence(value: unknown, label: string): void {
  if (!isObject(value)) throw new Error(`${label} must be an object`);
  exactKeysWithOptional(
    value,
    ["mode", "objectId", "byteFingerprint", "kind", "analysis"],
    ["contentProjection"],
    label,
  );
  const hasProjection = Object.hasOwn(value, "contentProjection");
  const projected =
    hasProjection && value.contentProjection === "proof_receipts_stripped";
  const modeKinds: Readonly<Record<string, SideEvidence["kind"]>> = {
    "100644": "regular",
    "100755": "regular",
    "120000": "symlink",
    "160000": "gitlink",
  };
  if (
    typeof value.mode !== "string" ||
    modeKinds[value.mode] !== value.kind ||
    (projected
      ? value.objectId !== null
      : hasProjection ||
        typeof value.objectId !== "string" ||
        !GIT_OID_RE.test(value.objectId)) ||
    typeof value.byteFingerprint !== "string" ||
    !SHA256_RE.test(value.byteFingerprint) ||
    (value.analysis !== null && !isObject(value.analysis))
  )
    throw new Error(`${label} has invalid Git-side evidence`);
  if (value.analysis === null) return;
  const analysis = value.analysis;
  exactKeys(
    analysis,
    [
      "contractVersion",
      "status",
      "language",
      "sourceFile",
      "providerId",
      "providerStamp",
      "providerFingerprint",
      "inputFingerprint",
      "resultFingerprint",
      "diagnosticCodes",
      "uncoveredRanges",
    ],
    `${label}.analysis`,
  );
  if (
    analysis.contractVersion !== "kibi.symbol-extractor.v2" ||
    !["ok", "partial", "unsupported", "failed"].includes(
      String(analysis.status),
    ) ||
    typeof analysis.language !== "string" ||
    !analysis.language.trim() ||
    typeof analysis.sourceFile !== "string" ||
    !analysis.sourceFile.trim() ||
    (analysis.providerId !== null &&
      (typeof analysis.providerId !== "string" ||
        !analysis.providerId.trim())) ||
    !Array.isArray(analysis.diagnosticCodes) ||
    analysis.diagnosticCodes.some(
      (code) => typeof code !== "string" || !code.trim(),
    ) ||
    !Array.isArray(analysis.uncoveredRanges)
  )
    throw new Error(`${label}.analysis has invalid source analysis fields`);
  try {
    canonicalJson(analysis.providerStamp);
  } catch {
    throw new Error(`${label}.analysis.providerStamp is not JSON-safe`);
  }
  if (
    (analysis.providerFingerprint !== null &&
      (typeof analysis.providerFingerprint !== "string" ||
        !SHA256_RE.test(analysis.providerFingerprint))) ||
    typeof analysis.inputFingerprint !== "string" ||
    !SHA256_RE.test(analysis.inputFingerprint) ||
    typeof analysis.resultFingerprint !== "string" ||
    !SHA256_RE.test(analysis.resultFingerprint)
  )
    throw new Error(`${label}.analysis has invalid fingerprints`);
  for (const [index, range] of analysis.uncoveredRanges.entries()) {
    if (!isObject(range))
      throw new Error(`${label}.analysis.uncoveredRanges[${index}] is invalid`);
    exactKeys(
      range,
      ["startLine", "startColumn", "endLine", "endColumn", "reason"],
      `${label}.analysis.uncoveredRanges[${index}]`,
    );
    if (
      !Number.isSafeInteger(range.startLine) ||
      (range.startLine as number) < 1 ||
      !Number.isSafeInteger(range.startColumn) ||
      (range.startColumn as number) < 0 ||
      !Number.isSafeInteger(range.endLine) ||
      (range.endLine as number) < (range.startLine as number) ||
      !Number.isSafeInteger(range.endColumn) ||
      (range.endColumn as number) < 0 ||
      typeof range.reason !== "string" ||
      !range.reason.trim() ||
      (range.endLine === range.startLine &&
        (range.endColumn as number) < (range.startColumn as number))
    )
      throw new Error(`${label}.analysis.uncoveredRanges[${index}] is invalid`);
  }
  if (
    (analysis.status === "partial" && analysis.uncoveredRanges.length === 0) ||
    (analysis.status === "ok" && analysis.uncoveredRanges.length > 0)
  )
    throw new Error(`${label}.analysis status/range mismatch`);
}

export function assertSha256(
  value: string,
  name: string,
): asserts value is Fingerprint {
  if (!SHA256_RE.test(value))
    throw new Error(`${name} must be a sha256 fingerprint`);
}

export function isGitObjectId(value: string): boolean {
  return GIT_OID_RE.test(value);
}
