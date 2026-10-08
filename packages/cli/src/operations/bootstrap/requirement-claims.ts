import { createHash } from "node:crypto";
import {
  type SemanticClaim,
  isConventionalSubjectKey,
  normalizeSourceKey,
  normalizeSubjectKey,
} from "../../utils/strict-modeling.js";
import type { Candidate } from "./types.js";

// implements REQ-KIBI-BOOTSTRAP-PLAN
export function normalizeClaimStatement(statement: string): string {
  return statement
    .replace(/^\s*(?:[-*+]|\d+[.)])\s+/, "")
    .replace(/^\s*\[(?: |x)\]\s*/i, "")
    .trim();
}

export function claimFor(
  statement: string,
  source: string,
  confidence: number,
  provenance: string,
): SemanticClaim | null {
  const cleaned = normalizeClaimStatement(statement);
  if (cleaned.endsWith("?")) return null;
  const normalized = /^(?:must|shall|should)\s+/i.test(cleaned)
    ? `System ${cleaned}`
    : cleaned;
  const retention = normalized.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+retained\s+for\s+(?<value>\d+)\s+(?<unit>day|days|month|months|year|years)\.?$/i,
  );
  if (
    retention?.groups?.subject &&
    retention.groups.value &&
    retention.groups.unit
  ) {
    const unit = retention.groups.unit.toLowerCase().startsWith("day")
      ? "Days"
      : retention.groups.unit.toLowerCase().startsWith("month")
        ? "Months"
        : "Years";
    return {
      source,
      subjectKey: retention.groups.subject
        .replace(/^(the|a|an)\s+/i, "")
        .trim(),
      propertyKey: `Retention ${unit}`,
      operator: "eq",
      value: Number(retention.groups.value),
      confidence,
      provenance,
    };
  }
  const state = normalized.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+(?<value>enabled|disabled)\.?$/i,
  );
  if (state?.groups?.subject && state.groups.value) {
    return {
      source,
      subjectKey: state.groups.subject.trim(),
      propertyKey: "enabled",
      operator: "bool",
      value: state.groups.value.toLowerCase() === "enabled",
      confidence,
      provenance,
    };
  }
  const polarity = normalized.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+(?<negative>not\s+)?(?<predicate>.+?)\.?$/i,
  );
  if (!polarity?.groups?.subject || !polarity.groups.predicate) return null;
  return {
    source,
    subjectKey: polarity.groups.subject.trim(),
    propertyKey: polarity.groups.predicate.trim(),
    operator: "polarity",
    value: polarity.groups.negative ? "forbid" : "require",
    confidence,
    provenance,
  };
}

export type SubjectKeyResolution =
  | {
      readonly ok: true;
      readonly subjectKey: string;
      /** The key before its aspect was shortened, when it was. */
      readonly shortenedFrom?: string;
    }
  | { readonly ok: false; readonly reason: string };

/** One lowercase snake segment, or "" when the value has no usable word. */
function snakeSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** The longest aspect a bootstrap key keeps as derived. */
export const MAX_ASPECT_WORDS = 4;
export const MAX_ASPECT_CHARS = 40;

/** Words that start a dependent clause or a second item: the aspect ends before them. */
const ASPECT_BOUNDARY_WORDS = new Set([
  "when",
  "whenever",
  "while",
  "if",
  "unless",
  "without",
  "after",
  "before",
  "until",
  "because",
  "once",
  "as",
  "by",
  "via",
  "during",
  "except",
  "so",
  "that",
  "which",
  "who",
  "where",
  "since",
  "for",
  "and",
  "or",
]);

/** Words that carry no meaning in a key on their own. */
const ASPECT_STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "be",
  "is",
  "are",
  "was",
  "were",
  "been",
  "being",
  "to",
  "of",
  "in",
  "on",
  "at",
  "with",
  "from",
  "into",
  "its",
  "it",
  "their",
  "they",
  "them",
  "this",
  "these",
  "those",
  "can",
  "could",
  "will",
  "would",
  "may",
  "might",
  "must",
  "shall",
  "should",
  "do",
  "does",
  "has",
  "have",
  "had",
  "any",
  "all",
  "each",
  "every",
  "some",
  "only",
  "also",
  "then",
  "than",
  "not",
  "no",
]);

function fitsAspect(words: readonly string[]): boolean {
  return (
    words.length > 0 &&
    words.length <= MAX_ASPECT_WORDS &&
    words.join("_").length <= MAX_ASPECT_CHARS
  );
}

function trimStopWords(words: readonly string[]): string[] {
  let start = 0;
  let end = words.length;
  while (start < end && ASPECT_STOP_WORDS.has(words[start] ?? "")) start += 1;
  while (end > start && ASPECT_STOP_WORDS.has(words[end - 1] ?? "")) end -= 1;
  return words.slice(start, end);
}

/**
 * A short noun-phrase aspect for a long one, deterministically: the words
 * before the first clause boundary (when, while, for, and, ...), without
 * leading or trailing stop words; if that is still longer than four words or
 * forty characters, its content words (no stop words or -ly adverbs); if
 * those are still too long, the first content word and the last two, where a
 * noun phrase keeps its head noun. An aspect that already fits is returned
 * unchanged.
 */
// implements REQ-bootstrap-claim-name-length
export function shortenSubjectAspect(aspect: string): string {
  const words = aspect.split("_").filter(Boolean);
  if (fitsAspect(words)) return aspect;
  const boundary = words.findIndex(
    (word, index) =>
      index > 0 &&
      ASPECT_BOUNDARY_WORDS.has(word) &&
      trimStopWords(words.slice(0, index)).length > 0,
  );
  const head = trimStopWords(boundary < 0 ? words : words.slice(0, boundary));
  if (fitsAspect(head)) return head.join("_");
  // Content words only: no stop words, no -ly adverbs.
  const content = head.filter(
    (word) =>
      !ASPECT_STOP_WORDS.has(word) && !(word.length > 4 && word.endsWith("ly")),
  );
  if (fitsAspect(content)) return content.join("_");
  // The leading word (the action or state) and the closing words, where an
  // English noun phrase keeps its head noun.
  const picked = Array.from(
    new Set([content[0], ...content.slice(-(MAX_ASPECT_WORDS - 2))]),
  ).filter((word): word is string => typeof word === "string");
  while (picked.length > 1 && picked.join("_").length > MAX_ASPECT_CHARS)
    picked.splice(1, 1);
  const short = picked.join("_");
  return short.length > 0
    ? short.slice(0, MAX_ASPECT_CHARS).replace(/_+$/, "")
    : (words[0] ?? aspect).slice(0, MAX_ASPECT_CHARS);
}

function withShortAspect(
  component: string,
  aspect: string,
): SubjectKeyResolution {
  const full = `${component}.${aspect}`;
  const short = shortenSubjectAspect(aspect);
  const candidate = `${component}.${short}`;
  if (!isConventionalSubjectKey(candidate))
    return {
      ok: false,
      reason: `subject key "${candidate}" does not follow component.aspect[.sub]`,
    };
  return short === aspect
    ? { ok: true, subjectKey: candidate }
    : { ok: true, subjectKey: candidate, shortenedFrom: full };
}

/**
 * The bootstrap subject key in the component.aspect[.sub] shape that
 * subject-key-shape checks. A subject that already has that shape is kept.
 * Otherwise the component comes from the declared `component` (claim or
 * knowledge source) and the aspect from the claim's subject; a one-word
 * subject is itself the component and the constrained property becomes the
 * aspect. An aspect longer than four words or forty characters is shortened
 * to a noun phrase and the original key is returned in `shortenedFrom`. When
 * no component can be named the claim is not resolved, so the caller reports
 * it instead of writing a malformed key.
 */
// implements REQ-bootstrap-subject-key-shape, REQ-bootstrap-claim-name-length
export function resolveBootstrapSubjectKey(
  subject: string,
  propertyKey: string,
  component?: string,
): SubjectKeyResolution {
  const stripped = subject.trim().replace(/^(?:the|a|an)\s+/i, "");
  let key: string;
  try {
    key = normalizeSubjectKey(stripped);
  } catch {
    return { ok: false, reason: `subject "${subject}" has no usable words` };
  }
  if (isConventionalSubjectKey(key)) return { ok: true, subjectKey: key };
  const flat = key.replace(/\./g, "_");
  const comp = component === undefined ? "" : snakeSegment(component);
  const property = snakeSegment(propertyKey);
  if (comp) {
    const aspect =
      flat === comp
        ? property
        : flat.startsWith(`${comp}_`)
          ? flat.slice(comp.length + 1)
          : flat;
    return withShortAspect(comp, aspect);
  }
  if (/^[a-z][a-z0-9]*$/.test(flat) && property)
    return withShortAspect(flat, property);
  return {
    ok: false,
    reason: `subject key "${flat}" names no component, so it would violate component.aspect[.sub]`,
  };
}

/**
 * Keeps the subject keys of one bootstrap plan distinct. Claims about the
 * same subject (the same full key) share a key; when shortening collapses two
 * different subjects onto one key, the later one gets a third segment from
 * its own wording (or a short digest) instead of colliding.
 */
// implements REQ-bootstrap-claim-name-length
export class SubjectKeyRegistry {
  private readonly owners = new Map<string, string>();
  private readonly assigned = new Map<string, string>();

  /** The plan-wide key for a resolution, and the key it collided with, if any. */
  assign(resolution: {
    readonly subjectKey: string;
    readonly shortenedFrom?: string;
  }): { readonly subjectKey: string; readonly collidedWith?: string } {
    const identity = resolution.shortenedFrom ?? resolution.subjectKey;
    const known = this.assigned.get(identity);
    if (known !== undefined) return { subjectKey: known };
    const owner = this.owners.get(resolution.subjectKey);
    if (owner === undefined || owner === identity) {
      this.owners.set(resolution.subjectKey, identity);
      this.assigned.set(identity, resolution.subjectKey);
      return { subjectKey: resolution.subjectKey };
    }
    const used = new Set(resolution.subjectKey.split(/[._]/));
    const fullWords = identity.split(".").slice(1).join("_").split("_");
    const qualifier = fullWords.find(
      (word) =>
        /^[a-z][a-z0-9]*$/.test(word) &&
        !used.has(word) &&
        !ASPECT_STOP_WORDS.has(word) &&
        !ASPECT_BOUNDARY_WORDS.has(word) &&
        !this.owners.has(`${resolution.subjectKey}.${word}`),
    );
    const subjectKey = `${resolution.subjectKey}.${qualifier ?? `k${digest(identity)}`}`;
    this.owners.set(subjectKey, identity);
    this.assigned.set(identity, subjectKey);
    return { subjectKey, collidedWith: resolution.subjectKey };
  }
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 6);
}

/**
 * Resolve a claim's subject key for a plan and describe any renaming as a
 * plan diagnostic, so the operator can pick a better name before applying.
 */
// implements REQ-bootstrap-claim-name-length
export function planSubjectKey(
  subject: string,
  propertyKey: string,
  component: string | undefined,
  registry: SubjectKeyRegistry | undefined,
  location: string,
): {
  readonly resolution: SubjectKeyResolution;
  readonly diagnostics: string[];
} {
  const resolved = resolveBootstrapSubjectKey(subject, propertyKey, component);
  if (!resolved.ok) return { resolution: resolved, diagnostics: [] };
  const diagnostics: string[] = [];
  const assigned = registry?.assign(resolved) ?? {
    subjectKey: resolved.subjectKey,
  };
  if (resolved.shortenedFrom)
    diagnostics.push(
      `subject-key-shortened: claim at ${location} would have the subject key ${resolved.shortenedFrom}; its aspect is longer than ${MAX_ASPECT_WORDS} words or ${MAX_ASPECT_CHARS} characters, so the plan uses ${assigned.subjectKey}. Rename the subject after apply if another noun phrase fits better.`,
    );
  if (assigned.collidedWith)
    diagnostics.push(
      `subject-key-disambiguated: claim at ${location} names a different subject than an earlier claim keyed ${assigned.collidedWith}, so the plan uses ${assigned.subjectKey} instead of reusing that key.`,
    );
  return {
    resolution: {
      ok: true,
      subjectKey: assigned.subjectKey,
      ...(resolved.shortenedFrom
        ? { shortenedFrom: resolved.shortenedFrom }
        : {}),
    },
    diagnostics,
  };
}

type PlanStep = Readonly<Record<string, unknown>>;

function stepProperties(step: PlanStep): Readonly<Record<string, unknown>> {
  return step.properties !== null && typeof step.properties === "object"
    ? (step.properties as Record<string, unknown>)
    : {};
}

function subjectStepKey(step: PlanStep): string | null {
  const properties = stepProperties(step);
  return step.type === "fact" &&
    properties.fact_kind === "subject" &&
    typeof properties.subject_key === "string" &&
    typeof step.id === "string"
    ? properties.subject_key
    : null;
}

function retarget<T extends { readonly to: string }>(
  relationships: readonly T[],
  renamed: ReadonlyMap<string, string>,
): T[] {
  return relationships.map((relationship) => {
    const to = renamed.get(relationship.to);
    return to === undefined ? relationship : { ...relationship, to };
  });
}

function retargetStep(
  step: PlanStep,
  renamed: ReadonlyMap<string, string>,
): PlanStep {
  if (!Array.isArray(step.relationships)) return step;
  const relationships = step.relationships as { readonly to: string }[];
  return { ...step, relationships: retarget(relationships, renamed) };
}

/**
 * One subject fact per subject_key in a bootstrap plan. The registry keeps
 * different subjects on different keys, so claims that share a key name the
 * same subject: the first selected claim's subject fact is kept, every later
 * requirement links to it through constrains instead of minting another
 * subject fact (which subject-key-identity would report), and the later
 * sources' provenance is added to the kept fact's tags and body. Each shared
 * key is reported as a subject-key-shared diagnostic. The result depends only
 * on the candidate order, so the plan hash stays deterministic.
 */
// implements REQ-bootstrap-subject-fact-shared
export function shareSubjectFacts(candidates: readonly Candidate[]): {
  readonly candidates: Candidate[];
  readonly diagnostics: string[];
} {
  const owners = new Map<
    string,
    { factId: string; candidateIndex: number; sources: string[] }
  >();
  const renamed = new Map<string, string>();
  candidates.forEach((candidate, candidateIndex) => {
    for (const step of candidate.applyPlan) {
      const key = subjectStepKey(step);
      if (key === null) continue;
      const factId = String(step.id);
      const source = String(
        stepProperties(step).text_ref ?? candidate.sourcePath,
      );
      const owner = owners.get(key);
      if (owner === undefined) {
        owners.set(key, { factId, candidateIndex, sources: [source] });
        continue;
      }
      if (owner.factId === factId) continue;
      renamed.set(factId, owner.factId);
      if (!owner.sources.includes(source)) owner.sources.push(source);
    }
  });
  if (renamed.size === 0)
    return { candidates: [...candidates], diagnostics: [] };
  const shared = [...owners.entries()].filter(
    ([, owner]) => owner.sources.length > 1,
  );
  const sharedFacts = new Map(
    shared.map(([key, owner]) => [owner.factId, { key, owner }]),
  );
  const result = candidates.map((candidate) => ({
    ...candidate,
    relationships: retarget(candidate.relationships, renamed),
    applyPlan: candidate.applyPlan
      .filter((step) => !renamed.has(String(step.id)))
      .map((step) => {
        const sharing = sharedFacts.get(String(step.id));
        const retargeted = retargetStep(step, renamed);
        if (sharing === undefined || subjectStepKey(step) === null)
          return retargeted;
        const properties = stepProperties(step);
        const tags = Array.isArray(properties.tags)
          ? properties.tags.map(String)
          : [];
        return {
          ...retargeted,
          properties: {
            ...properties,
            tags: [
              ...new Set([
                ...tags,
                ...sharing.owner.sources.map(
                  (source) => `provenance:${normalizeSourceKey(source)}`,
                ),
              ]),
            ],
          },
          document: {
            body: `Subject ${sharing.key}, shared by the requirements bootstrap planned from ${sharing.owner.sources.join(", ")}. Each of them links to this fact through constrains.\n`,
          },
        };
      }),
  }));
  return {
    candidates: result,
    diagnostics: shared.map(
      ([key, owner]) =>
        `subject-key-shared: claims at ${owner.sources.join(", ")} name the same subject ${key}, so the plan writes one subject fact ${owner.factId} and links every requirement to it through constrains.`,
    ),
  };
}
