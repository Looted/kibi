import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, open, readdir } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import {
  missingRequiredGuidance,
  validateCompleteCandidateBody,
} from "./candidate-body";
import { CANONICAL_SKILLS, type CanonicalSkill } from "./catalog";

const MAX_BYTES = 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VERSION = /^skill_v[0-9]{4}\.md$/;
const STEP = /^step-([0-9]{4})$/;
const IGNORED = new Set([
  ".kb",
  "auth",
  "episodes",
  "held-out",
  "history",
  "private",
  "transcripts",
]);

// implements REQ-skillopt-codex-optimization
export type HistoricalCandidateValidation =
  | "complete"
  | "incomplete"
  | "unsafe";

// implements REQ-skillopt-codex-optimization
export type HistoricalCandidateOrigin = Readonly<{
  runId: string;
  path: string;
  verified: boolean;
  reason?: string;
  historicalBaselineHash?: string;
  seedHash?: string;
}>;

// implements REQ-skillopt-codex-optimization
export type HistoricalCandidate = Readonly<{
  hash: string;
  bodyBytes: number;
  skill: CanonicalSkill;
  origins: readonly HistoricalCandidateOrigin[];
  validation: HistoricalCandidateValidation;
  missingGuidance: readonly string[];
  baselineIdentical: boolean | null;
  reasons: readonly string[];
}>;

// implements REQ-skillopt-codex-optimization
export type HistoricalDiagnostic = Readonly<{
  code: string;
  path: string;
  runId?: string;
  detail?: string;
}>;

// implements REQ-skillopt-codex-optimization
export type HistoricalCandidatesReport = Readonly<{
  schemaVersion: "1.0.0";
  artifactType: "skillopt-historical-inventory";
  screening: "offline-only";
  paidModelCalls: 0;
  productionAdoption: "external-verdict-required";
  root: string;
  baselineBodyHashes: Partial<Record<CanonicalSkill, string>>;
  candidates: readonly HistoricalCandidate[];
  shortlist: readonly HistoricalCandidate[];
  diagnostics: readonly HistoricalDiagnostic[];
}>;

// implements REQ-skillopt-codex-optimization
export type InspectHistoricalCandidatesInput = Readonly<{
  artifactRoot: string;
  baselineBodies?: Partial<Record<CanonicalSkill, string>>;
}>;

type Ctx = { root: string; diagnostics: HistoricalDiagnostic[] };
type FileResult =
  | { kind: "ok"; bytes: Buffer; text: string }
  | { kind: "missing"; reason: "missing" }
  | { kind: "rejected"; reason: string };
type Review = {
  skills: readonly CanonicalSkill[];
  hashes: ReadonlyMap<CanonicalSkill, ReadonlySet<string>>;
  baselines: ReadonlyMap<CanonicalSkill, string>;
};
type Receipt =
  | { present: false; reason: "missing_receipt" }
  | { present: true; value?: Record<string, unknown>; reason?: string };
type Provenance = Readonly<{
  verified: boolean;
  reason?: string;
  historicalBaselineHash?: string;
  seedHash?: string;
}>;
type Found = Readonly<{
  runId: string;
  path: string;
  skill: CanonicalSkill;
  hash: string;
  bodyBytes: number;
  validation: HistoricalCandidateValidation;
  missingGuidance: readonly string[];
  validationReason?: string;
  provenance: Provenance;
}>;

function errorCode(error: unknown): string | undefined {
  return typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
    ? error.code
    : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSkill(value: unknown): value is CanonicalSkill {
  return (
    typeof value === "string" &&
    (CANONICAL_SKILLS as readonly string[]).includes(value)
  );
}

function isHash(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function addDiagnostic(
  ctx: Ctx,
  code: string,
  path: string,
  runId?: string,
  detail?: string,
): void {
  ctx.diagnostics.push({
    code,
    path: relative(ctx.root, path).split(sep).join("/"),
    ...(runId === undefined ? {} : { runId }),
    ...(detail === undefined ? {} : { detail }),
  });
}

async function safeAncestors(root: string, ctx: Ctx): Promise<boolean> {
  const ancestors: string[] = [];
  for (let current = root; ; current = dirname(current)) {
    ancestors.unshift(current);
    if (dirname(current) === current) break;
  }
  for (const current of ancestors) {
    const part = current.split(sep).at(-1);
    if (part !== undefined && IGNORED.has(part)) {
      addDiagnostic(ctx, "ignored_root", current);
      return false;
    }
    try {
      const stats = await lstat(current);
      if (stats.isSymbolicLink()) {
        addDiagnostic(ctx, "symlink_ancestor", current);
        return false;
      }
    } catch (error) {
      addDiagnostic(
        ctx,
        errorCode(error) === "ENOENT" ? "missing_root" : "unreadable_ancestor",
        current,
        undefined,
        errorCode(error),
      );
      return false;
    }
  }
  return true;
}

async function directory(
  path: string,
  ctx: Ctx,
  runId?: string,
): Promise<readonly string[] | undefined> {
  let stats: Awaited<ReturnType<typeof lstat>>;
  try {
    stats = await lstat(path);
  } catch (error) {
    if (errorCode(error) === "ENOENT") return undefined;
    addDiagnostic(ctx, "directory_unreadable", path, runId, errorCode(error));
    return undefined;
  }
  if (stats.isSymbolicLink()) {
    addDiagnostic(ctx, "symlink_directory", path, runId);
    return undefined;
  }
  if (!stats.isDirectory()) {
    addDiagnostic(ctx, "non_directory", path, runId);
    return undefined;
  }
  try {
    return (await readdir(path)).sort();
  } catch (error) {
    addDiagnostic(ctx, "directory_unreadable", path, runId, errorCode(error));
    return undefined;
  }
}

async function boundedFile(
  path: string,
  ctx: Ctx,
  runId?: string,
): Promise<FileResult> {
  let stats: Awaited<ReturnType<typeof lstat>>;
  try {
    stats = await lstat(path);
  } catch (error) {
    if (errorCode(error) === "ENOENT")
      return { kind: "missing", reason: "missing" };
    addDiagnostic(ctx, "file_unreadable", path, runId, errorCode(error));
    return { kind: "rejected", reason: errorCode(error) ?? "file_unreadable" };
  }
  if (stats.isSymbolicLink()) {
    addDiagnostic(ctx, "symlink_file", path, runId);
    return { kind: "rejected", reason: "symlink_file" };
  }
  if (!stats.isFile()) {
    addDiagnostic(ctx, "nonregular_file", path, runId);
    return { kind: "rejected", reason: "nonregular_file" };
  }
  if (stats.nlink !== 1) {
    addDiagnostic(ctx, "hardlinked_file", path, runId);
    return { kind: "rejected", reason: "hardlinked_file" };
  }
  if (!Number.isSafeInteger(stats.size) || stats.size > MAX_BYTES) {
    addDiagnostic(ctx, "file_too_large", path, runId);
    return { kind: "rejected", reason: "file_too_large" };
  }
  let handle: Awaited<ReturnType<typeof open>> | undefined;
  try {
    handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    const opened = await handle.stat();
    if (!opened.isFile() || opened.nlink !== 1 || opened.size > MAX_BYTES) {
      addDiagnostic(ctx, "file_changed_before_read", path, runId);
      return { kind: "rejected", reason: "file_changed_before_read" };
    }
    const bytes = Buffer.alloc(opened.size);
    let offset = 0;
    while (offset < bytes.length) {
      const result = await handle.read(
        bytes,
        offset,
        bytes.length - offset,
        offset,
      );
      if (result.bytesRead === 0) {
        addDiagnostic(ctx, "short_read", path, runId);
        return { kind: "rejected", reason: "short_read" };
      }
      offset += result.bytesRead;
    }
    const final = await handle.stat();
    if (final.size !== opened.size || final.nlink !== 1) {
      addDiagnostic(ctx, "file_changed_during_read", path, runId);
      return { kind: "rejected", reason: "file_changed_during_read" };
    }
    try {
      return {
        kind: "ok",
        bytes,
        text: new TextDecoder("utf-8", { fatal: true }).decode(bytes),
      };
    } catch {
      addDiagnostic(ctx, "invalid_utf8", path, runId);
      return { kind: "rejected", reason: "invalid_utf8" };
    }
  } catch (error) {
    addDiagnostic(ctx, "file_unreadable", path, runId, errorCode(error));
    return { kind: "rejected", reason: errorCode(error) ?? "file_unreadable" };
  } finally {
    await handle?.close().catch(() => undefined);
  }
}

function json(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

async function jsonFile(
  path: string,
  ctx: Ctx,
  runId: string,
  invalid: string,
): Promise<Record<string, unknown> | undefined> {
  const result = await boundedFile(path, ctx, runId);
  if (result.kind !== "ok") return undefined;
  const value = json(result.text);
  if (!isRecord(value)) addDiagnostic(ctx, invalid, path, runId);
  return isRecord(value) ? value : undefined;
}

async function metadata(
  runRoot: string,
  runId: string,
  ctx: Ctx,
): Promise<Review | undefined> {
  const reviewValue = await jsonFile(
    join(runRoot, "optimization-review.json"),
    ctx,
    runId,
    "invalid_review_metadata",
  );
  let review: Review | undefined;
  if (
    reviewValue?.schemaVersion === "1.0.0" &&
    reviewValue.artifactType === "skillopt-optimization-review" &&
    reviewValue.runId === runId &&
    Array.isArray(reviewValue.skills) &&
    Array.isArray(reviewValue.candidates)
  ) {
    const hashes = new Map<CanonicalSkill, Set<string>>();
    const baselines = new Map<CanonicalSkill, string>();
    for (const entry of reviewValue.candidates) {
      if (
        !isRecord(entry) ||
        !isSkill(entry.skill) ||
        !isHash(entry.candidateBodyHash)
      )
        continue;
      const values = hashes.get(entry.skill) ?? new Set<string>();
      values.add(entry.candidateBodyHash);
      hashes.set(entry.skill, values);
      if (isHash(entry.baselineBodyHash))
        baselines.set(entry.skill, entry.baselineBodyHash);
    }
    review = { skills: reviewValue.skills.filter(isSkill), hashes, baselines };
  } else if (reviewValue !== undefined) {
    addDiagnostic(
      ctx,
      "invalid_review_metadata",
      join(runRoot, "optimization-review.json"),
      runId,
    );
  }
  return review;
}

async function readReceipt(
  path: string,
  ctx: Ctx,
  runId: string,
): Promise<Receipt> {
  const result = await boundedFile(path, ctx, runId);
  if (result.kind === "missing")
    return { present: false, reason: "missing_receipt" };
  if (result.kind === "rejected")
    return { present: true, reason: result.reason };
  const value = json(result.text);
  if (isRecord(value)) return { present: true, value };
  addDiagnostic(ctx, "invalid_receipt", path, runId);
  return { present: true, reason: "invalid_receipt" };
}

function reviewProvenance(
  review: Review | undefined,
  skill: CanonicalSkill,
  hash: string,
): Provenance {
  if (review === undefined)
    return { verified: false, reason: "review_missing" };
  if (!review.skills.includes(skill))
    return { verified: false, reason: "review_skill_not_declared" };
  return review.hashes.get(skill)?.has(hash)
    ? { verified: true }
    : { verified: false, reason: "review_hash_mismatch" };
}

function receiptProvenance(
  receipt: Receipt,
  skill: CanonicalSkill,
  hash: string,
  bodyBytes: number,
  step: number,
  expectedRunId: string,
): Provenance {
  if (!receipt.present || receipt.reason !== undefined)
    return { verified: false, reason: receipt.reason };
  const value = receipt.value;
  if (
    value?.schemaVersion !== "1.0.0" ||
    value.artifactType !== "skillopt-accepted-optimizer-output"
  )
    return { verified: false, reason: "invalid_receipt_schema" };
  if (value.runId !== expectedRunId)
    return { verified: false, reason: "receipt_run_id_mismatch" };
  if (value.skill !== skill)
    return { verified: false, reason: "receipt_skill_mismatch" };
  if (value.step !== step)
    return { verified: false, reason: "receipt_step_mismatch" };
  if (value.bodyHash !== hash)
    return { verified: false, reason: "receipt_hash_mismatch" };
  return value.bodyBytes === bodyBytes
    ? { verified: true }
    : { verified: false, reason: "receipt_body_bytes_mismatch" };
}

function classify(body: string): Readonly<{
  validation: HistoricalCandidateValidation;
  missingGuidance: readonly string[];
  validationReason?: string;
}> {
  const missingGuidance = [...missingRequiredGuidance(body)];
  try {
    validateCompleteCandidateBody(body);
    return { validation: "complete", missingGuidance };
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "candidate_validation_failed";
    return {
      validation:
        reason === "optimizer_output_incomplete_body" ||
        reason === "candidate_empty" ||
        reason === "empty"
          ? "incomplete"
          : "unsafe",
      missingGuidance,
      validationReason: reason,
    };
  }
}

function addBody(
  found: Found[],
  ctx: Ctx,
  runId: string,
  path: string,
  skill: CanonicalSkill,
  body: Extract<FileResult, { kind: "ok" }>,
  provenance: Provenance,
): void {
  found.push({
    runId,
    path: relative(ctx.root, path).split(sep).join("/"),
    skill,
    hash: createHash("sha256").update(body.bytes).digest("hex"),
    bodyBytes: body.bytes.byteLength,
    ...classify(body.text),
    provenance,
  });
}

async function accepted(
  found: Found[],
  ctx: Ctx,
  runId: string,
  root: string,
  skill: CanonicalSkill,
  step: number,
  expectedRunId: string,
): Promise<void> {
  const bodyPath = join(root, "candidate-body.md");
  const body = await boundedFile(bodyPath, ctx, runId);
  if (body.kind === "missing")
    addDiagnostic(ctx, "accepted_body_missing", bodyPath, runId);
  if (body.kind !== "ok") return;
  const receipt = await readReceipt(join(root, "receipt.json"), ctx, runId);
  if (!receipt.present)
    addDiagnostic(
      ctx,
      "accepted_receipt_missing",
      join(root, "receipt.json"),
      runId,
    );
  const hash = createHash("sha256").update(body.bytes).digest("hex");
  addBody(
    found,
    ctx,
    runId,
    bodyPath,
    skill,
    body,
    receiptProvenance(
      receipt,
      skill,
      hash,
      body.bytes.byteLength,
      step,
      expectedRunId,
    ),
  );
}

async function optimizerSteps(
  found: Found[],
  ctx: Ctx,
  runId: string,
  skillRoot: string,
  skill: CanonicalSkill,
): Promise<void> {
  if (
    (await directory(join(skillRoot, "trainer-run"), ctx, runId)) === undefined
  )
    return;
  const optimizerRoot = join(skillRoot, "trainer-run", "optimizer");
  const names = await directory(optimizerRoot, ctx, runId);
  if (names === undefined) return;
  for (const name of names) {
    const match = STEP.exec(name);
    if (match === null) continue;
    const stepRoot = join(optimizerRoot, name);
    const stepNames = await directory(stepRoot, ctx, runId);
    if (stepNames === undefined || !stepNames.includes("requests")) continue;
    const requests = join(stepRoot, "requests");
    const requestNames = await directory(requests, ctx, runId);
    if (
      requestNames === undefined ||
      !requestNames.includes("optimizer-artifacts")
    )
      continue;
    const artifacts = join(requests, "optimizer-artifacts");
    if ((await directory(artifacts, ctx, runId)) === undefined) continue;
    const acceptedRoot = join(artifacts, "accepted-output");
    if ((await directory(acceptedRoot, ctx, runId)) === undefined) continue;
    await accepted(
      found,
      ctx,
      runId,
      acceptedRoot,
      skill,
      Number(match[1]),
      runId,
    );
  }
}

async function scanSkill(
  found: Found[],
  ctx: Ctx,
  runRoot: string,
  runId: string,
  skill: CanonicalSkill,
  review: Review | undefined,
): Promise<void> {
  const skillRoot = join(runRoot, "skills", skill);
  if ((await directory(skillRoot, ctx, runId)) === undefined) return;
  // Seed metadata records ancestry, never proof that the optimizer produced a body.
  const seed = await jsonFile(
    join(skillRoot, "seed-candidate.json"),
    ctx,
    runId,
    "invalid_seed_metadata",
  );
  const seedHash =
    seed?.schemaVersion === "1.0.0" &&
    seed.artifactType === "skillopt-resume-seed" &&
    isHash(seed.bodyHash)
      ? seed.bodyHash
      : undefined;
  const firstOrigin = found.length;
  const candidatePath = join(skillRoot, "candidate_skill.md");
  const candidate = await boundedFile(candidatePath, ctx, runId);
  if (candidate.kind === "ok") {
    const hash = createHash("sha256").update(candidate.bytes).digest("hex");
    addBody(
      found,
      ctx,
      runId,
      candidatePath,
      skill,
      candidate,
      reviewProvenance(review, skill, hash),
    );
  }

  const trainerRoot = join(skillRoot, "trainer-output");
  if ((await directory(trainerRoot, ctx, runId)) !== undefined) {
    const bestPath = join(trainerRoot, "best_skill.md");
    const best = await boundedFile(bestPath, ctx, runId);
    if (best.kind === "ok") {
      const hash = createHash("sha256").update(best.bytes).digest("hex");
      addBody(
        found,
        ctx,
        runId,
        bestPath,
        skill,
        best,
        reviewProvenance(review, skill, hash),
      );
    }
    const versions = await directory(join(trainerRoot, "skills"), ctx, runId);
    if (versions !== undefined) {
      for (const name of versions.filter((value) => VERSION.test(value))) {
        const path = join(trainerRoot, "skills", name);
        const body = await boundedFile(path, ctx, runId);
        if (body.kind !== "ok") continue;
        addBody(found, ctx, runId, path, skill, body, {
          verified: false,
          reason: "trainer_version_no_receipt",
        });
      }
    }
  }
  await optimizerSteps(found, ctx, runId, skillRoot, skill);

  const oneShotRoot = join(skillRoot, "one-shot");
  const oneShotNames = await directory(oneShotRoot, ctx, runId);
  if (oneShotNames?.includes("accepted-output")) {
    const acceptedRoot = join(oneShotRoot, "accepted-output");
    if ((await directory(acceptedRoot, ctx, runId)) !== undefined) {
      await accepted(
        found,
        ctx,
        runId,
        acceptedRoot,
        skill,
        1,
        `${runId}-one-shot`,
      );
    }
  }
  const historicalBaselineHash = review?.baselines.get(skill);
  for (let index = firstOrigin; index < found.length; index += 1) {
    const item = found[index];
    if (item === undefined) continue;
    found[index] = {
      ...item,
      provenance: {
        ...item.provenance,
        ...(historicalBaselineHash === undefined
          ? {}
          : { historicalBaselineHash }),
        ...(seedHash === undefined || item.path.includes("/one-shot/")
          ? {}
          : { seedHash }),
      },
    };
  }
}

type Group = {
  skill: CanonicalSkill;
  hash: string;
  bodyBytes: number;
  validation: HistoricalCandidateValidation;
  missingGuidance: readonly string[];
  validationReason?: string;
  origins: Map<string, HistoricalCandidateOrigin>;
  reasons: Set<string>;
};

function buildReport(
  ctx: Ctx,
  found: readonly Found[],
  baselines: Partial<Record<CanonicalSkill, string>> | undefined,
): HistoricalCandidatesReport {
  const baselineHashes = new Map<CanonicalSkill, string>();
  for (const skill of CANONICAL_SKILLS) {
    if (
      baselines &&
      Object.hasOwn(baselines, skill) &&
      typeof baselines[skill] === "string"
    ) {
      baselineHashes.set(
        skill,
        createHash("sha256").update(baselines[skill], "utf8").digest("hex"),
      );
    }
  }
  const groups = new Map<string, Group>();
  for (const item of found) {
    const key = `${item.skill}\0${item.hash}`;
    const group = groups.get(key) ?? {
      skill: item.skill,
      hash: item.hash,
      bodyBytes: item.bodyBytes,
      validation: item.validation,
      missingGuidance: item.missingGuidance,
      ...(item.validationReason === undefined
        ? {}
        : { validationReason: item.validationReason }),
      origins: new Map(),
      reasons: new Set<string>(),
    };
    group.origins.set(`${item.runId}\0${item.path}`, {
      runId: item.runId,
      path: item.path,
      verified: item.provenance.verified,
      ...(item.provenance.reason === undefined
        ? {}
        : { reason: item.provenance.reason }),
      ...(item.provenance.historicalBaselineHash === undefined
        ? {}
        : { historicalBaselineHash: item.provenance.historicalBaselineHash }),
      ...(item.provenance.seedHash === undefined
        ? {}
        : { seedHash: item.provenance.seedHash }),
    });
    if (item.provenance.reason !== undefined)
      group.reasons.add(item.provenance.reason);
    groups.set(key, group);
  }
  const candidates = [...groups.values()]
    .sort((a, b) =>
      a.skill === b.skill
        ? a.hash.localeCompare(b.hash)
        : a.skill.localeCompare(b.skill),
    )
    .map((group): HistoricalCandidate => {
      const baselineHash = baselineHashes.get(group.skill);
      const baselineIdentical =
        baselineHash === undefined ? null : baselineHash === group.hash;
      const origins = [...group.origins.values()].sort((a, b) =>
        `${a.runId}/${a.path}`.localeCompare(`${b.runId}/${b.path}`),
      );
      const reasons = new Set(group.reasons);
      if (group.validationReason !== undefined)
        reasons.add(group.validationReason);
      if (!origins.some((origin) => origin.verified))
        reasons.add("unverified_provenance");
      if (baselineIdentical === null) reasons.add("baseline_not_supplied");
      else if (baselineIdentical) reasons.add("baseline_identical");
      return {
        hash: group.hash,
        bodyBytes: group.bodyBytes,
        skill: group.skill,
        origins,
        validation: group.validation,
        missingGuidance: group.missingGuidance,
        baselineIdentical,
        reasons: [...reasons].sort(),
      };
    });
  const shortlist = candidates.filter(
    (candidate) =>
      candidate.validation === "complete" &&
      candidate.origins.some((origin) => origin.verified) &&
      candidate.baselineIdentical === false,
  );
  return {
    schemaVersion: "1.0.0",
    artifactType: "skillopt-historical-inventory",
    screening: "offline-only",
    paidModelCalls: 0,
    productionAdoption: "external-verdict-required",
    root: ctx.root,
    baselineBodyHashes: Object.fromEntries(baselineHashes),
    candidates,
    shortlist,
    diagnostics: ctx.diagnostics,
  };
}

// implements REQ-skillopt-codex-optimization
export async function inspectHistoricalCandidates(
  input: InspectHistoricalCandidatesInput,
): Promise<HistoricalCandidatesReport> {
  const root = resolve(input.artifactRoot);
  const ctx: Ctx = { root, diagnostics: [] };
  if (!(await safeAncestors(root, ctx)))
    return buildReport(ctx, [], input.baselineBodies);
  const names = await directory(root, ctx);
  if (names === undefined) return buildReport(ctx, [], input.baselineBodies);
  const found: Found[] = [];
  for (const runId of names.filter((name) => UUID.test(name))) {
    const runRoot = join(root, runId);
    if ((await directory(runRoot, ctx, runId)) === undefined) continue;
    const before = found.length;
    const meta = await metadata(runRoot, runId, ctx);
    if ((await directory(join(runRoot, "skills"), ctx, runId)) !== undefined) {
      for (const skill of [...CANONICAL_SKILLS].sort() as CanonicalSkill[]) {
        await scanSkill(found, ctx, runRoot, runId, skill, meta);
      }
    }
    if (found.length === before)
      addDiagnostic(ctx, "no_candidate_body", runRoot, runId);
  }
  return buildReport(ctx, found, input.baselineBodies);
}
