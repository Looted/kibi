import { createHash } from "node:crypto";
import { z } from "zod";
import type { CanonicalSkill } from "./catalog";
import { contractHash } from "./contracts/common";

export const MAX_CANDIDATE_BODY_BYTES = 100_000;

export const VariantSchema = z.enum(["baseline", "one-shot", "skillopt"]);
export type Variant = z.infer<typeof VariantSchema>;

export type VariantSurface = Readonly<{
  frontmatterHash: string;
  resourcesHash: string;
}>;

export type FrozenVariant = VariantSurface &
  Readonly<{
    schemaVersion: "1.0.0";
    artifactType: "skillopt-variant";
    skill: CanonicalSkill;
    variant: Variant;
    status: "frozen";
    body: string;
    bodyHash: string;
    provenance: "canonical" | "codex-one-shot" | "skillopt";
    sourceRequestHash?: string;
  }>;

export type OneShotRequest = Readonly<{
  model: "gpt-5.6-sol";
  baselineBody: string;
  objectives: readonly string[];
  familyNames: readonly string[];
  immutableConstraints: readonly string[];
}>;

export type OneShotOptimizer = Readonly<{
  generate: (request: OneShotRequest) => Promise<string>;
}>;

export type OneShotResult =
  | Readonly<{
      status: "frozen";
      variant: FrozenVariant;
      requestHash: string;
      attempts: 1;
    }>
  | Readonly<{
      status: "invalid";
      score: 0;
      failureCategory: "invalid_variant";
      requestHash: string;
      attempts: 1;
      error: string;
    }>;

// implements REQ-skillopt-codex-optimization
export class CandidateValidationError extends Error {
  readonly name = "CandidateValidationError";

  constructor(readonly code: CandidateValidationErrorCode) {
    super(`candidate_${code}`);
  }
}

export type CandidateValidationErrorCode =
  | "empty"
  | "too_large"
  | "invalid_utf8"
  | "frontmatter_changed"
  | "resources_changed"
  | "direct_kb_guidance"
  | "prohibited_host_or_provider_claim";

function sha256Text(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function assertBodyEncoding(body: string): void {
  if (body.includes("\u0000")) {
    throw new CandidateValidationError("invalid_utf8");
  }
  if (Buffer.byteLength(body, "utf8") > MAX_CANDIDATE_BODY_BYTES) {
    throw new CandidateValidationError("too_large");
  }
}

function hasDirectKbGuidance(line: string): boolean {
  if (!/\.kb\b/i.test(line)) return false;
  if (!/(?:read|write|edit|modify|access|inspect|open|use)/i.test(line)) {
    return false;
  }
  return !/(?:do not|don't|never|avoid|instead of|without)/i.test(line);
}

// implements REQ-skillopt-codex-optimization
export function validateCandidateBody(body: string): void {
  if (typeof body !== "string" || body.trim().length === 0) {
    throw new CandidateValidationError("empty");
  }
  assertBodyEncoding(body);
  if (/^---\r?\n/.test(body)) {
    throw new CandidateValidationError("frontmatter_changed");
  }
  if (
    /\b(?:OpenCode|Cursor)\b|(?:OPENAI|CODEX)_API_KEY|provider\s+(?:SDK|API)/i.test(
      body,
    )
  ) {
    throw new CandidateValidationError("prohibited_host_or_provider_claim");
  }
  if (body.split(/\r?\n/).some(hasDirectKbGuidance)) {
    throw new CandidateValidationError("direct_kb_guidance");
  }
}

function freezeVariant(
  input: Readonly<{
    skill: CanonicalSkill;
    variant: Variant;
    body: string;
    surface: VariantSurface;
    provenance: FrozenVariant["provenance"];
    sourceRequestHash?: string;
  }>,
): FrozenVariant {
  return {
    schemaVersion: "1.0.0",
    artifactType: "skillopt-variant",
    skill: input.skill,
    variant: input.variant,
    status: "frozen",
    body: input.body,
    bodyHash: sha256Text(input.body),
    frontmatterHash: input.surface.frontmatterHash,
    resourcesHash: input.surface.resourcesHash,
    provenance: input.provenance,
    ...(input.sourceRequestHash === undefined
      ? {}
      : { sourceRequestHash: input.sourceRequestHash }),
  };
}

// implements REQ-skillopt-codex-optimization
export function createBaselineVariant(
  input: Readonly<{
    skill: CanonicalSkill;
    body: string;
  }> &
    VariantSurface,
): FrozenVariant {
  if (input.body.trim().length === 0) {
    throw new CandidateValidationError("empty");
  }
  assertBodyEncoding(input.body);
  return freezeVariant({
    skill: input.skill,
    variant: "baseline",
    body: input.body,
    surface: input,
    provenance: "canonical",
  });
}

// implements REQ-skillopt-codex-optimization
export function freezeCandidateVariant(
  input: Readonly<{
    skill: CanonicalSkill;
    variant: "one-shot" | "skillopt";
    body: string;
    frontmatterHash: string;
    resourcesHash: string;
    provenance: "codex-one-shot" | "skillopt";
    sourceRequestHash?: string;
  }>,
): FrozenVariant {
  validateCandidateBody(input.body);
  return freezeVariant({
    ...input,
    surface: input,
  });
}

// implements REQ-skillopt-codex-optimization
export async function generateOneShotVariant(
  input: Readonly<{
    skill: CanonicalSkill;
    baselineBody: string;
    objectives: readonly string[];
    familyNames: readonly string[];
    immutableConstraints: readonly string[];
  }> &
    VariantSurface,
  optimizer: OneShotOptimizer,
): Promise<OneShotResult> {
  const request: OneShotRequest = {
    model: "gpt-5.6-sol",
    baselineBody: input.baselineBody,
    objectives: [...input.objectives],
    familyNames: [...input.familyNames],
    immutableConstraints: [...input.immutableConstraints],
  };
  const requestHash = contractHash({
    model: request.model,
    baselineBody: request.baselineBody,
    objectives: [...request.objectives],
    familyNames: [...request.familyNames],
    immutableConstraints: [...request.immutableConstraints],
  });

  try {
    const body = await optimizer.generate(request);
    const variant = freezeCandidateVariant({
      skill: input.skill,
      variant: "one-shot",
      body,
      frontmatterHash: input.frontmatterHash,
      resourcesHash: input.resourcesHash,
      provenance: "codex-one-shot",
      sourceRequestHash: requestHash,
    });
    return { status: "frozen", variant, requestHash, attempts: 1 };
  } catch (error) {
    return {
      status: "invalid",
      score: 0,
      failureCategory: "invalid_variant",
      requestHash,
      attempts: 1,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
