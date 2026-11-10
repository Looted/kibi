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

// One end of the values a constraint admits; undefined is unbounded. On
// integers a strict bound is the closed bound one step in.
type Bound = { readonly at: number; readonly open: boolean } | undefined;

function lowerBound({ op, value }: Constraint, integer: boolean): Bound {
  if (op === "eq" || op === "gte") return { at: value, open: false };
  if (op !== "gt") return undefined;
  return { at: integer ? value + 1 : value, open: !integer };
}

function upperBound({ op, value }: Constraint, integer: boolean): Bound {
  if (op === "eq" || op === "lte") return { at: value, open: false };
  if (op !== "lt") return undefined;
  return { at: integer ? value - 1 : value, open: !integer };
}

/** Whether bound a sits on or inside bound b, both lower or both upper. */
function inside(a: Bound, b: Bound, lower: boolean): boolean {
  if (b === undefined) return true;
  if (a === undefined) return false;
  return (
    (lower ? a.at > b.at : a.at < b.at) ||
    (a.at === b.at && (a.open || !b.open))
  );
}

/**
 * Whether every value case constraint a admits, constraint b admits too.
 * A case is never a neq class, so only b can be the complement of a point:
 * a lies inside it when a admits no value equal to the point.
 */
function entails(a: Constraint, b: Constraint, integer: boolean): boolean {
  if (b.op === "neq")
    return !(
      inside({ at: b.value, open: false }, lowerBound(a, integer), true) &&
      inside({ at: b.value, open: false }, upperBound(a, integer), false)
    );
  return (
    inside(lowerBound(a, integer), lowerBound(b, integer), true) &&
    inside(upperBound(a, integer), upperBound(b, integer), false)
  );
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
  // rationale: a class with no bound straddles every claim, so predict drops
  // it and skipping the missing upper side changes no case.
  // Stryker disable next-line ConditionalExpression
  if (upper) add("boundary", upper, v);
  const lower = LOWER_PAST[op];
  // An integer counts something: no count lies below zero, so x < V for
  // V <= 0 and x <= V for V < 0 name no class.
  if (lower && !(integer && (lower === "lt" ? v <= 0 : v < 0)))
    add("boundary", lower, v);
  // At a bound of one the boundary rows already hold the value one, so the
  // one class starts at a bound of two (as in cases.pl).
  if (integer && v >= 1) add("cardinality", "eq", 0);
  if (integer && v >= 2) add("cardinality", "eq", 1);
  if (integer && v >= 1) add("cardinality", "gte", 2);
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
  if (!Number.isFinite(value)) return [];
  const bound = { op, value: value as number };
  const kept: { raw: RawCase; predicted: "success" | "rejection" }[] = [];
  for (const raw of numericCases(integer, op, bound.value)) {
    const predicted = predict(bound, raw.constraint, integer);
    if (predicted === undefined) continue;
    // A class already named, or inside an earlier class, is not a case of
    // its own. Only a class with the same outcome can hold it: a nonempty
    // class cannot both satisfy and break the claim.
    const subsumed = kept.some((earlier) =>
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
  // A set fact whose value is not a list has no cases, as in cases.pl.
  const members = claim.value_set;
  if (members === undefined) return [];
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
