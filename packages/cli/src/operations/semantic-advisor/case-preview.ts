import type { SemanticStrictPropertyClaim } from "./types.js";

// implements REQ-kibi-case-coverage
/**
 * The edge cases the proof ladder will derive from a typed property claim
 * once it is written (packages/core/src/cases.pl), so the author sees the
 * scenario debt before committing the model: the bound and the value past
 * it, zero, one and many for an integer count, each set member and the value
 * outside the set. Each rejection case later needs a scenario that assumes
 * it, or the requirement reports uncovered_case.
 */
export interface CasePreview {
  readonly generator:
    | "boundary"
    | "cardinality"
    | "member"
    | "non_member"
    | "excluded_member";
  /** The value class, as `kibi coverage --cases` prints it. */
  readonly constraint: string;
  readonly predicted: "success" | "rejection" | "unspecified";
  /** The assumes fact a scenario states to land in the case. */
  readonly assumption: Readonly<Record<string, unknown>>;
}

/** Most cases one fact yields, as in cases.pl. */
export const CASE_LIMIT = 12;

type NumericOp = "eq" | "neq" | "lt" | "lte" | "gt" | "gte";
type Constraint = { readonly op: NumericOp; readonly value: number };

const NEGATED: Readonly<Record<NumericOp, NumericOp>> = {
  eq: "neq",
  neq: "eq",
  lt: "gte",
  gte: "lt",
  gt: "lte",
  lte: "gt",
};
const UPPER_PAST: Partial<Record<NumericOp, NumericOp>> = {
  eq: "gt",
  neq: "gt",
  lte: "gt",
  lt: "gte",
};
const LOWER_PAST: Partial<Record<NumericOp, NumericOp>> = {
  eq: "lt",
  neq: "lt",
  gte: "lt",
  gt: "lte",
};

// A value set on one variable: an interval with open or closed ends, or the
// complement of a point (neq).
type Region =
  | {
      readonly kind: "interval";
      readonly lo: number;
      readonly loOpen: boolean;
      readonly hi: number;
      readonly hiOpen: boolean;
    }
  | { readonly kind: "except"; readonly value: number };

function region({ op, value }: Constraint, integer: boolean): Region {
  // On integers a strict bound is the closed bound one step in.
  const v = value;
  switch (op) {
    case "eq":
      return { kind: "interval", lo: v, loOpen: false, hi: v, hiOpen: false };
    case "neq":
      return { kind: "except", value: v };
    case "lt":
      return integer
        ? {
            kind: "interval",
            lo: Number.NEGATIVE_INFINITY,
            loOpen: true,
            hi: v - 1,
            hiOpen: false,
          }
        : {
            kind: "interval",
            lo: Number.NEGATIVE_INFINITY,
            loOpen: true,
            hi: v,
            hiOpen: true,
          };
    case "lte":
      return {
        kind: "interval",
        lo: Number.NEGATIVE_INFINITY,
        loOpen: true,
        hi: v,
        hiOpen: false,
      };
    case "gt":
      return integer
        ? {
            kind: "interval",
            lo: v + 1,
            loOpen: false,
            hi: Number.POSITIVE_INFINITY,
            hiOpen: true,
          }
        : {
            kind: "interval",
            lo: v,
            loOpen: true,
            hi: Number.POSITIVE_INFINITY,
            hiOpen: true,
          };
    case "gte":
      return {
        kind: "interval",
        lo: v,
        loOpen: false,
        hi: Number.POSITIVE_INFINITY,
        hiOpen: true,
      };
  }
}

function contains(r: Region, value: number): boolean {
  if (r.kind === "except") return value !== r.value;
  const aboveLo = r.loOpen ? value > r.lo : value >= r.lo;
  const belowHi = r.hiOpen ? value < r.hi : value <= r.hi;
  return aboveLo && belowHi;
}

/** Whether every value constraint a admits, constraint b admits too. */
function entails(a: Constraint, b: Constraint, integer: boolean): boolean {
  const ra = region(a, integer);
  const rb = region(b, integer);
  if (ra.kind === "except")
    return rb.kind === "except" && rb.value === ra.value;
  if (rb.kind === "except") return !contains(ra, rb.value);
  const loInside =
    ra.lo > rb.lo || (ra.lo === rb.lo && (ra.loOpen || !rb.loOpen));
  const hiInside =
    ra.hi < rb.hi || (ra.hi === rb.hi && (ra.hiOpen || !rb.hiOpen));
  return loInside && hiInside;
}

type RawCase = {
  readonly generator: CasePreview["generator"];
  readonly constraint: Constraint;
};

function numericCases(integer: boolean, op: NumericOp, v: number): RawCase[] {
  const cases: RawCase[] = [];
  const add = (
    generator: RawCase["generator"],
    caseOp: NumericOp,
    value: number,
  ) => cases.push({ generator, constraint: { op: caseOp, value } });
  if (["eq", "neq", "lte", "gte"].includes(op)) add("boundary", "eq", v);
  if (integer && op === "lt") add("boundary", "eq", v - 1);
  if (integer && op === "gt") add("boundary", "eq", v + 1);
  const upper = UPPER_PAST[op];
  if (upper) add("boundary", upper, v);
  const lower = LOWER_PAST[op];
  if (
    lower &&
    !(integer && lower === "lt" && v <= 0) &&
    !(integer && lower === "lte" && v < 0)
  )
    add("boundary", lower, v);
  if (integer && v >= 1) {
    add("cardinality", "eq", 0);
    add("cardinality", "eq", 1);
    add("cardinality", "gte", 2);
  }
  return cases;
}

function predict(
  claim: Constraint,
  candidate: Constraint,
  integer: boolean,
): "success" | "rejection" | undefined {
  if (entails(candidate, claim, integer)) return "success";
  if (
    entails(candidate, { op: NEGATED[claim.op], value: claim.value }, integer)
  )
    return "rejection";
  return undefined;
}

function numericPreviews(
  claim: SemanticStrictPropertyClaim,
  op: NumericOp,
): CasePreview[] {
  const integer = claim.value_type === "int";
  const value = integer ? claim.value_int : claim.value_number;
  if (typeof value !== "number" || !Number.isFinite(value)) return [];
  const bound = { op, value };
  const kept: { raw: RawCase; predicted: "success" | "rejection" }[] = [];
  for (const raw of numericCases(integer, op, value)) {
    const predicted = predict(bound, raw.constraint, integer);
    if (predicted === undefined) continue;
    // A class already named, or inside an earlier class with the same
    // outcome, is not a case of its own.
    const subsumed = kept.some(
      (earlier) =>
        earlier.predicted === predicted &&
        entails(raw.constraint, earlier.raw.constraint, integer),
    );
    if (!subsumed) kept.push({ raw, predicted });
  }
  return kept.map(({ raw, predicted }) => ({
    generator: raw.generator,
    constraint: `${raw.constraint.op} ${raw.constraint.value}`,
    predicted,
    assumption: {
      fact_kind: "property_value",
      subject_key: claim.subject_key,
      property_key: claim.property_key,
      operator: raw.constraint.op,
      value_type: claim.value_type,
      value: raw.constraint.value,
    },
  }));
}

function setPreviews(claim: SemanticStrictPropertyClaim): CasePreview[] {
  const members = claim.value_set ?? [];
  const assumption = (value: readonly string[]) => ({
    fact_kind: "property_value",
    subject_key: claim.subject_key,
    property_key: claim.property_key,
    operator: "includes",
    value_type: "set",
    value: [...value],
  });
  const previews: CasePreview[] = [];
  if (["eq", "includes", "subset_of"].includes(claim.operator))
    for (const member of members)
      previews.push({
        generator: "member",
        constraint: `includes ${member}`,
        predicted: "success",
        assumption: assumption([member]),
      });
  const outside =
    claim.operator === "eq" || claim.operator === "subset_of"
      ? "rejection"
      : claim.operator === "includes"
        ? "unspecified"
        : undefined;
  if (outside)
    previews.push({
      generator: "non_member",
      constraint: `includes a value outside [${members.join(", ")}]`,
      predicted: outside,
      assumption: assumption(["<a value outside the set>"]),
    });
  if (claim.operator === "excludes")
    for (const member of members)
      previews.push({
        generator: "excluded_member",
        constraint: `includes ${member}`,
        predicted: "rejection",
        assumption: assumption([member]),
      });
  return previews;
}

export function previewCases(claim: SemanticStrictPropertyClaim): {
  cases: CasePreview[];
  limitReached: boolean;
} {
  const op = claim.operator;
  const all =
    claim.value_type === "set"
      ? setPreviews(claim)
      : (claim.value_type === "int" || claim.value_type === "number") &&
          op in NEGATED
        ? numericPreviews(claim, op as NumericOp)
        : [];
  return {
    cases: all.slice(0, CASE_LIMIT),
    limitReached: all.length > CASE_LIMIT,
  };
}
