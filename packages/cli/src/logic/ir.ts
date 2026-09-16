import { createHash } from "node:crypto";
import { toPrologAtom } from "../prolog/codec.js";

/** The only serialized logic language accepted by Kibi. */
export const LOGIC_IR_VERSION = "kibi.logic.v1" as const;
export const LOGIC_RULE_MAX_DEPTH = 16;
export const LOGIC_RULE_MAX_ATOMS = 64;
export const LOGIC_RULE_MAX_VARIABLES = 32;

export type LogicModality = "assert" | "deny" | "oblige" | "permit" | "forbid";
export type LogicRuleKind = "atom" | "rule" | "constraint";
export type LogicVariableQuantifier = "forall" | "exists";
export type LogicTerm =
  | { readonly kind: "var"; readonly name: string; readonly type: string }
  | { readonly kind: "const"; readonly value: string; readonly type?: string }
  | { readonly kind: "number"; readonly value: number; readonly unit?: string }
  | {
      readonly kind: "duration";
      readonly value: number;
      readonly unit: "ms" | "s" | "m" | "h" | "d" | "w";
    }
  | { readonly kind: "timestamp"; readonly value: string }
  | {
      readonly kind: "interval";
      readonly start: string;
      readonly end: string;
    };

export interface LogicAtom {
  readonly kind: "atom";
  readonly namespace?: string;
  readonly name: string;
  readonly args: readonly LogicTerm[];
  /** Explicit positive/negative information. This is not negation-as-failure. */
  readonly polarity?: "positive" | "negative";
  /** Required when the atom is used beneath `not`. */
  readonly closedWorld?: boolean;
}

export type LogicExpression =
  | LogicAtom
  | { readonly kind: "all"; readonly items: readonly LogicExpression[] }
  | { readonly kind: "any"; readonly items: readonly LogicExpression[] }
  | { readonly kind: "not"; readonly item: LogicAtom }
  | {
      readonly kind: "compare";
      readonly operator: "eq" | "neq" | "lt" | "lte" | "gt" | "gte";
      readonly left: LogicTerm;
      readonly right: LogicTerm;
    }
  | {
      readonly kind: "count";
      readonly atom: LogicAtom;
      readonly operator: "eq" | "neq" | "lt" | "lte" | "gt" | "gte";
      readonly value: number;
    }
  | {
      readonly kind: "temporal";
      readonly relation:
        | "before"
        | "after"
        | "during"
        | "overlaps"
        | "starts"
        | "finishes";
      readonly left: LogicTerm;
      readonly right: LogicTerm;
    };

export interface LogicVariable {
  readonly name: string;
  readonly type: string;
  readonly quantifier?: LogicVariableQuantifier;
}

export interface LogicScope {
  readonly authority?: string;
  readonly name?: string;
  readonly tags?: readonly string[];
}

export interface LogicRuleIR {
  readonly version: typeof LOGIC_IR_VERSION;
  readonly kind: LogicRuleKind;
  readonly modality: LogicModality;
  readonly head?: LogicAtom;
  readonly body?: LogicExpression;
  readonly variables?: readonly LogicVariable[];
  readonly exceptions?: readonly LogicExpression[];
  readonly scope?: LogicScope;
  readonly validFrom?: string;
  readonly validTo?: string;
  readonly ruleSchemaId?: string;
}

export interface LogicValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly normalized?: LogicRuleIR;
  readonly canonicalJson?: string;
  readonly ruleHash?: string;
  readonly semanticKey?: string;
  readonly renderedProlog?: string;
}

const IDENTIFIER = /^[a-z][a-z0-9_:.\/-]*$/;
const VARIABLE = /^[A-Z][A-Za-z0-9_]*$/;
const TYPE_NAME = /^[a-z][a-z0-9_:.\/-]*$/;
const SCHEMA_ID = /^[A-Za-z][A-Za-z0-9_:.\/-]*$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function invalidKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
  errors: string[],
): void {
  const allowedKeys = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      errors.push(`${path}.${key} is not supported by ${LOGIC_IR_VERSION}`);
    }
  }
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, nested]) => nested !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, nested]) => [key, stableValue(nested)]),
  );
}

/** Canonical JSON is the persistence and semantic-identity boundary. */
export function canonicalLogicJson(ir: LogicRuleIR): string {
  return JSON.stringify(stableValue(ir));
}

export function logicRuleHash(ir: LogicRuleIR): string {
  return createHash("sha256").update(canonicalLogicJson(ir)).digest("hex");
}

export function logicSemanticKey(ir: LogicRuleIR): string {
  return `SEM-${logicRuleHash(ir).slice(0, 24).toUpperCase()}`;
}

export function termVariables(term: LogicTerm): Set<string> {
  return term.kind === "var" ? new Set([term.name]) : new Set();
}

function mergeInto(target: Set<string>, source: Iterable<string>): void {
  for (const value of source) target.add(value);
}

function validateTerm(
  value: unknown,
  path: string,
  declared: Set<string>,
  errors: string[],
): value is LogicTerm {
  if (!isRecord(value) || typeof value.kind !== "string") {
    errors.push(`${path} must be a typed term object`);
    return false;
  }
  switch (value.kind) {
    case "var": {
      invalidKeys(value, ["kind", "name", "type"], path, errors);
      const name = asString(value.name);
      const type = asString(value.type);
      if (!name || !VARIABLE.test(name))
        errors.push(`${path}.name must be an uppercase variable name`);
      if (!type || !TYPE_NAME.test(type))
        errors.push(`${path}.type must be a lowercase type name`);
      if (name && !declared.has(name))
        errors.push(`${path}.name ${name} is not declared in variables`);
      return true;
    }
    case "const":
      invalidKeys(value, ["kind", "value", "type"], path, errors);
      if (typeof value.value !== "string" || !value.value.trim())
        errors.push(`${path}.value must be a non-empty string`);
      if (
        value.type !== undefined &&
        (typeof value.type !== "string" || !TYPE_NAME.test(value.type))
      )
        errors.push(`${path}.type is invalid`);
      return true;
    case "number":
      invalidKeys(value, ["kind", "value", "unit"], path, errors);
      if (typeof value.value !== "number" || !Number.isFinite(value.value))
        errors.push(`${path}.value must be finite`);
      if (
        value.unit !== undefined &&
        (typeof value.unit !== "string" || !TYPE_NAME.test(value.unit))
      )
        errors.push(`${path}.unit is invalid`);
      return true;
    case "duration":
      invalidKeys(value, ["kind", "value", "unit"], path, errors);
      if (
        typeof value.value !== "number" ||
        !Number.isFinite(value.value) ||
        value.value < 0
      )
        errors.push(`${path}.value must be a non-negative finite duration`);
      if (!["ms", "s", "m", "h", "d", "w"].includes(String(value.unit)))
        errors.push(`${path}.unit is invalid`);
      return true;
    case "timestamp":
      invalidKeys(value, ["kind", "value"], path, errors);
      if (
        typeof value.value !== "string" ||
        Number.isNaN(Date.parse(value.value))
      )
        errors.push(`${path}.value must be an ISO timestamp`);
      return true;
    case "interval":
      invalidKeys(value, ["kind", "start", "end"], path, errors);
      if (
        typeof value.start !== "string" ||
        Number.isNaN(Date.parse(value.start))
      )
        errors.push(`${path}.start must be an ISO timestamp`);
      if (typeof value.end !== "string" || Number.isNaN(Date.parse(value.end)))
        errors.push(`${path}.end must be an ISO timestamp`);
      if (
        typeof value.start === "string" &&
        typeof value.end === "string" &&
        !Number.isNaN(Date.parse(value.start)) &&
        !Number.isNaN(Date.parse(value.end)) &&
        Date.parse(value.start) > Date.parse(value.end)
      ) {
        errors.push(`${path}.start must not be after ${path}.end`);
      }
      return true;
    default:
      errors.push(`${path}.kind ${String(value.kind)} is not supported`);
      return false;
  }
}

interface ExpressionFacts {
  readonly positiveVariables: Set<string>;
  readonly allVariables: Set<string>;
  readonly atoms: number;
}

function validateAtom(
  value: unknown,
  path: string,
  declared: Set<string>,
  errors: string[],
): ExpressionFacts {
  if (!isRecord(value) || value.kind !== "atom") {
    errors.push(`${path} must be an atom`);
    return { positiveVariables: new Set(), allVariables: new Set(), atoms: 0 };
  }
  invalidKeys(
    value,
    ["kind", "namespace", "name", "args", "polarity", "closedWorld"],
    path,
    errors,
  );
  const name = asString(value.name);
  if (!name || !IDENTIFIER.test(name))
    errors.push(`${path}.name must be a lowercase predicate identifier`);
  if (
    value.namespace !== undefined &&
    (typeof value.namespace !== "string" || !IDENTIFIER.test(value.namespace))
  )
    errors.push(`${path}.namespace is invalid`);
  if (!Array.isArray(value.args) || value.args.length > 8)
    errors.push(`${path}.args must contain at most 8 terms`);
  const allVariables = new Set<string>();
  const args = Array.isArray(value.args) ? value.args : [];
  for (let index = 0; index < args.length; index += 1) {
    validateTerm(args[index], `${path}.args[${index}]`, declared, errors);
    if (
      isRecord(args[index]) &&
      args[index].kind === "var" &&
      typeof args[index].name === "string"
    )
      allVariables.add(args[index].name);
  }
  if (
    value.polarity !== undefined &&
    value.polarity !== "positive" &&
    value.polarity !== "negative"
  )
    errors.push(`${path}.polarity must be positive or negative`);
  if (value.closedWorld !== undefined && typeof value.closedWorld !== "boolean")
    errors.push(`${path}.closedWorld must be boolean`);
  const positiveVariables =
    value.polarity === "negative" ? new Set<string>() : new Set(allVariables);
  return { positiveVariables, allVariables, atoms: 1 };
}

function validateExpression(
  value: unknown,
  path: string,
  declared: Set<string>,
  errors: string[],
  depth: number,
): ExpressionFacts {
  if (depth > LOGIC_RULE_MAX_DEPTH) {
    errors.push(
      `${path} exceeds maximum expression depth ${LOGIC_RULE_MAX_DEPTH}`,
    );
    return { positiveVariables: new Set(), allVariables: new Set(), atoms: 0 };
  }
  if (!isRecord(value) || typeof value.kind !== "string") {
    errors.push(`${path} must be a typed expression object`);
    return { positiveVariables: new Set(), allVariables: new Set(), atoms: 0 };
  }
  if (value.kind === "atom") return validateAtom(value, path, declared, errors);
  if (value.kind === "all" || value.kind === "any") {
    invalidKeys(value, ["kind", "items"], path, errors);
    if (
      !Array.isArray(value.items) ||
      value.items.length === 0 ||
      value.items.length > 32
    )
      errors.push(`${path}.items must contain 1..32 expressions`);
    const positiveVariables = new Set<string>();
    const allVariables = new Set<string>();
    let atoms = 0;
    const children: ExpressionFacts[] = [];
    for (const [index, item] of (Array.isArray(value.items)
      ? value.items
      : []
    ).entries()) {
      const facts = validateExpression(
        item,
        `${path}.items[${index}]`,
        declared,
        errors,
        depth + 1,
      );
      children.push(facts);
      mergeInto(positiveVariables, facts.positiveVariables);
      mergeInto(allVariables, facts.allVariables);
      atoms += facts.atoms;
    }
    if (value.kind === "any") {
      // A variable used outside a disjunction must be bound in every branch.
      // This conservative rule keeps the finite interpreter range-restricted.
      const commonPositive =
        children.reduce<Set<string> | null>((common, child) => {
          if (common === null) return new Set(child.positiveVariables);
          const intersection = new Set<string>();
          for (const variable of common) {
            if (child.positiveVariables.has(variable))
              intersection.add(variable);
          }
          return intersection;
        }, null) ?? new Set<string>();
      const unsafeBranch = children.some((child) =>
        [...child.allVariables].some(
          (variable) => !child.positiveVariables.has(variable),
        ),
      );
      return {
        positiveVariables: unsafeBranch ? new Set<string>() : commonPositive,
        allVariables,
        atoms,
      };
    }
    return { positiveVariables, allVariables, atoms };
  }
  if (value.kind === "not") {
    invalidKeys(value, ["kind", "item"], path, errors);
    const facts = validateAtom(value.item, `${path}.item`, declared, errors);
    if (isRecord(value.item) && value.item.closedWorld !== true)
      errors.push(
        `${path}.item must explicitly set closedWorld=true for negation-as-failure`,
      );
    return {
      positiveVariables: new Set(),
      allVariables: facts.allVariables,
      atoms: facts.atoms,
    };
  }
  if (value.kind === "compare") {
    invalidKeys(value, ["kind", "operator", "left", "right"], path, errors);
    if (
      !["eq", "neq", "lt", "lte", "gt", "gte"].includes(String(value.operator))
    )
      errors.push(`${path}.operator is invalid`);
    validateTerm(value.left, `${path}.left`, declared, errors);
    validateTerm(value.right, `${path}.right`, declared, errors);
    const variables = new Set<string>();
    if (
      isRecord(value.left) &&
      value.left.kind === "var" &&
      typeof value.left.name === "string"
    )
      variables.add(value.left.name);
    if (
      isRecord(value.right) &&
      value.right.kind === "var" &&
      typeof value.right.name === "string"
    )
      variables.add(value.right.name);
    validateComparableTerms(value.left, value.right, path, errors);
    return { positiveVariables: new Set(), allVariables: variables, atoms: 0 };
  }
  if (value.kind === "count") {
    invalidKeys(value, ["kind", "atom", "operator", "value"], path, errors);
    const facts = validateAtom(value.atom, `${path}.atom`, declared, errors);
    if (
      !["eq", "neq", "lt", "lte", "gt", "gte"].includes(String(value.operator))
    )
      errors.push(`${path}.operator is invalid`);
    if (
      typeof value.value !== "number" ||
      !Number.isInteger(value.value) ||
      value.value < 0
    )
      errors.push(`${path}.value must be a non-negative integer`);
    return {
      positiveVariables: facts.positiveVariables,
      allVariables: facts.allVariables,
      atoms: facts.atoms,
    };
  }
  if (value.kind === "temporal") {
    invalidKeys(value, ["kind", "relation", "left", "right"], path, errors);
    if (
      !["before", "after", "during", "overlaps", "starts", "finishes"].includes(
        String(value.relation),
      )
    )
      errors.push(`${path}.relation is invalid`);
    validateTerm(value.left, `${path}.left`, declared, errors);
    validateTerm(value.right, `${path}.right`, declared, errors);
    const variables = new Set<string>();
    for (const term of [value.left, value.right])
      if (
        isRecord(term) &&
        term.kind === "var" &&
        typeof term.name === "string"
      )
        variables.add(term.name);
    validateTemporalTerms(
      value.relation,
      value.left,
      value.right,
      path,
      errors,
    );
    return { positiveVariables: new Set(), allVariables: variables, atoms: 0 };
  }
  errors.push(`${path}.kind ${String(value.kind)} is not supported`);
  return { positiveVariables: new Set(), allVariables: new Set(), atoms: 0 };
}

function termUnit(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined;
  if (
    (value.kind === "number" || value.kind === "duration") &&
    typeof value.unit === "string"
  ) {
    return value.unit;
  }
  return undefined;
}

function validateComparableTerms(
  left: unknown,
  right: unknown,
  path: string,
  errors: string[],
): void {
  const leftUnit = termUnit(left);
  const rightUnit = termUnit(right);
  if (leftUnit && rightUnit && leftUnit !== rightUnit) {
    errors.push(
      `${path} compares incompatible units ${leftUnit} and ${rightUnit}`,
    );
  }
}

function validateTemporalTerms(
  relation: unknown,
  left: unknown,
  right: unknown,
  path: string,
  errors: string[],
): void {
  const leftKind = isRecord(left) ? left.kind : undefined;
  const rightKind = isRecord(right) ? right.kind : undefined;
  const isTimestampOrInterval = (kind: unknown): boolean =>
    kind === "timestamp" || kind === "interval";
  if (relation === "before" || relation === "after") {
    if (!isTimestampOrInterval(leftKind) || !isTimestampOrInterval(rightKind))
      errors.push(
        `${path} ${String(relation)} requires timestamp or interval terms`,
      );
    return;
  }
  if (relation === "during") {
    if (!isTimestampOrInterval(leftKind) || rightKind !== "interval")
      errors.push(
        `${path} during requires a timestamp or interval inside an interval`,
      );
    return;
  }
  if (
    !["overlaps", "starts", "finishes"].includes(String(relation)) ||
    leftKind !== "interval" ||
    rightKind !== "interval"
  ) {
    errors.push(`${path} ${String(relation)} requires interval terms`);
  }
}

function normalizeTerm(term: LogicTerm): LogicTerm {
  if (term.kind === "var")
    return {
      ...term,
      name: term.name.trim(),
      type: term.type.trim().toLowerCase(),
    };
  if (term.kind === "const")
    return {
      ...term,
      value: term.value.trim(),
      ...(term.type ? { type: term.type.trim().toLowerCase() } : {}),
    };
  if (term.kind === "number")
    return {
      ...term,
      value: term.value,
      ...(term.unit ? { unit: term.unit.trim().toLowerCase() } : {}),
    };
  if (term.kind === "duration")
    return { ...term, value: term.value, unit: term.unit };
  if (term.kind === "timestamp")
    return { ...term, value: new Date(term.value).toISOString() };
  return {
    ...term,
    start: new Date(term.start).toISOString(),
    end: new Date(term.end).toISOString(),
  };
}

function normalizeExpression(expression: LogicExpression): LogicExpression {
  if (expression.kind === "atom")
    return {
      ...expression,
      name: expression.name.trim().toLowerCase(),
      ...(expression.namespace
        ? { namespace: expression.namespace.trim().toLowerCase() }
        : {}),
      args: expression.args.map(normalizeTerm),
    };
  if (expression.kind === "all" || expression.kind === "any") {
    const items = expression.items
      .map(normalizeExpression)
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    return { kind: expression.kind, items };
  }
  if (expression.kind === "not")
    return {
      kind: "not",
      item: normalizeExpression(expression.item) as LogicAtom,
    };
  if (expression.kind === "compare")
    return {
      ...expression,
      left: normalizeTerm(expression.left),
      right: normalizeTerm(expression.right),
    };
  if (expression.kind === "count")
    return {
      ...expression,
      atom: normalizeExpression(expression.atom) as LogicAtom,
    };
  return {
    ...expression,
    left: normalizeTerm(expression.left),
    right: normalizeTerm(expression.right),
  };
}

function normalizeAtom(atom: LogicAtom): LogicAtom {
  return normalizeExpression(atom) as LogicAtom;
}

function variableNamesInTerm(term: LogicTerm, names: string[]): void {
  if (term.kind === "var" && !names.includes(term.name)) names.push(term.name);
}

function variableNamesInExpression(
  expression: LogicExpression,
  names: string[],
): void {
  if (expression.kind === "atom") {
    for (const term of expression.args) variableNamesInTerm(term, names);
    return;
  }
  if (expression.kind === "all" || expression.kind === "any") {
    for (const item of expression.items) variableNamesInExpression(item, names);
    return;
  }
  if (expression.kind === "not") {
    variableNamesInExpression(expression.item, names);
    return;
  }
  if (expression.kind === "count") {
    variableNamesInExpression(expression.atom, names);
    return;
  }
  if (expression.kind === "compare" || expression.kind === "temporal") {
    variableNamesInTerm(expression.left, names);
    variableNamesInTerm(expression.right, names);
  }
}

function renameTerm(
  term: LogicTerm,
  names: ReadonlyMap<string, string>,
): LogicTerm {
  if (term.kind !== "var") return term;
  const renamed = names.get(term.name);
  return renamed ? { ...term, name: renamed } : term;
}

function renameExpression(
  expression: LogicExpression,
  names: ReadonlyMap<string, string>,
): LogicExpression {
  if (expression.kind === "atom")
    return {
      ...expression,
      args: expression.args.map((term) => renameTerm(term, names)),
    };
  if (expression.kind === "all" || expression.kind === "any")
    return {
      ...expression,
      items: expression.items.map((item) => renameExpression(item, names)),
    };
  if (expression.kind === "not")
    return {
      ...expression,
      item: renameExpression(expression.item, names) as LogicAtom,
    };
  if (expression.kind === "count")
    return {
      ...expression,
      atom: renameExpression(expression.atom, names) as LogicAtom,
    };
  return {
    ...expression,
    left: renameTerm(expression.left, names),
    right: renameTerm(expression.right, names),
  };
}

function alphaNormalizeVariables(ir: LogicRuleIR): LogicRuleIR {
  const names: string[] = [];
  if (ir.head) variableNamesInExpression(ir.head, names);
  if (ir.body) variableNamesInExpression(ir.body, names);
  for (const exception of ir.exceptions ?? [])
    variableNamesInExpression(exception, names);
  for (const variable of [...(ir.variables ?? [])].sort((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    if (!names.includes(variable.name)) names.push(variable.name);
  }
  const renames = new Map(
    names.map((name, index) => [name, `V${index + 1}`] as const),
  );
  const variables = (ir.variables ?? [])
    .map((variable) => ({
      ...variable,
      name: renames.get(variable.name) ?? variable.name,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
  return {
    ...ir,
    ...(ir.head
      ? { head: renameExpression(ir.head, renames) as LogicAtom }
      : {}),
    ...(ir.body ? { body: renameExpression(ir.body, renames) } : {}),
    ...(ir.exceptions
      ? {
          exceptions: ir.exceptions.map((exception) =>
            renameExpression(exception, renames),
          ),
        }
      : {}),
    ...(variables.length > 0 ? { variables } : {}),
  };
}

function normalizeIr(ir: LogicRuleIR): LogicRuleIR {
  return alphaNormalizeVariables({
    version: LOGIC_IR_VERSION,
    kind: ir.kind,
    modality: ir.modality,
    ...(ir.head ? { head: normalizeAtom(ir.head) } : {}),
    ...(ir.body ? { body: normalizeExpression(ir.body) } : {}),
    ...(ir.variables?.length
      ? {
          variables: [...ir.variables]
            .map((variable) => ({
              ...variable,
              name: variable.name.trim(),
              type: variable.type.trim().toLowerCase(),
              quantifier: variable.quantifier ?? "forall",
            }))
            .sort((a, b) => a.name.localeCompare(b.name)),
        }
      : {}),
    ...(ir.exceptions?.length
      ? {
          exceptions: ir.exceptions
            .map(normalizeExpression)
            .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
        }
      : {}),
    ...(ir.scope
      ? {
          scope: {
            ...ir.scope,
            ...(ir.scope.authority
              ? { authority: ir.scope.authority.trim() }
              : {}),
            ...(ir.scope.name ? { name: ir.scope.name.trim() } : {}),
            ...(ir.scope.tags
              ? { tags: [...ir.scope.tags].map((tag) => tag.trim()).sort() }
              : {}),
          },
        }
      : {}),
    ...(ir.validFrom
      ? { validFrom: new Date(ir.validFrom).toISOString() }
      : {}),
    ...(ir.validTo ? { validTo: new Date(ir.validTo).toISOString() } : {}),
    ...(ir.ruleSchemaId ? { ruleSchemaId: ir.ruleSchemaId.trim() } : {}),
  });
}

function prologTerm(term: LogicTerm): string {
  switch (term.kind) {
    case "var":
      return term.name;
    case "const":
      return toPrologAtom(term.value);
    case "number":
      return String(term.value);
    case "duration":
      return `duration(${term.value},${term.unit})`;
    case "timestamp":
      return toPrologAtom(term.value);
    case "interval":
      return `interval(${toPrologAtom(new Date(term.start).toISOString())},${toPrologAtom(new Date(term.end).toISOString())})`;
  }
}

function prologAtom(atom: LogicAtom): string {
  const name = atom.namespace ? `${atom.namespace}:${atom.name}` : atom.name;
  const rendered = `${toPrologAtom(name)}(${atom.args.map(prologTerm).join(",")})`;
  return atom.polarity === "negative" ? `negative(${rendered})` : rendered;
}

function prologExpression(expression: LogicExpression): string {
  if (expression.kind === "atom") return prologAtom(expression);
  if (expression.kind === "all")
    return expression.items.map(prologExpression).join(", ");
  if (expression.kind === "any")
    return `(${expression.items.map(prologExpression).join(" ; ")})`;
  if (expression.kind === "not") return `not(${prologAtom(expression.item)})`;
  if (expression.kind === "compare")
    return `${prologTerm(expression.left)} ${expression.operator} ${prologTerm(expression.right)}`;
  if (expression.kind === "count")
    return `count(${prologAtom(expression.atom)}, ${expression.operator}, ${expression.value})`;
  return `temporal(${expression.relation}, ${prologTerm(expression.left)}, ${prologTerm(expression.right)})`;
}

/** Rendered output is an audit preview only; it is never evaluated as source. */
export function renderLogicProlog(ir: LogicRuleIR): string {
  const head = ir.head ? `${ir.modality}(${prologAtom(ir.head)})` : ir.modality;
  if (!ir.body) return `${head}.`;
  return `${head} :- ${prologExpression(ir.body)}.`;
}

export function validateLogicIr(input: unknown): LogicValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isRecord(input))
    return { valid: false, errors: ["logic IR must be an object"], warnings };
  invalidKeys(
    input,
    [
      "version",
      "kind",
      "modality",
      "head",
      "body",
      "variables",
      "exceptions",
      "scope",
      "validFrom",
      "validTo",
      "ruleSchemaId",
    ],
    "logic",
    errors,
  );
  if (input.version !== LOGIC_IR_VERSION)
    errors.push(`version must be ${LOGIC_IR_VERSION}`);
  const kind = input.kind;
  if (kind !== "atom" && kind !== "rule" && kind !== "constraint")
    errors.push("kind must be atom, rule, or constraint");
  const modality = input.modality;
  if (
    !["assert", "deny", "oblige", "permit", "forbid"].includes(String(modality))
  )
    errors.push("modality is invalid");
  const variables = Array.isArray(input.variables) ? input.variables : [];
  if (variables.length > LOGIC_RULE_MAX_VARIABLES)
    errors.push(`variables exceed maximum ${LOGIC_RULE_MAX_VARIABLES}`);
  const declared = new Set<string>();
  for (const [index, variable] of variables.entries()) {
    if (!isRecord(variable)) {
      errors.push(`variables[${index}] must be an object`);
      continue;
    }
    invalidKeys(
      variable,
      ["name", "type", "quantifier"],
      `variables[${index}]`,
      errors,
    );
    const name = asString(variable.name);
    const type = asString(variable.type);
    if (!name || !VARIABLE.test(name) || declared.has(name))
      errors.push(`variables[${index}].name must be unique and uppercase`);
    if (!type || !TYPE_NAME.test(type))
      errors.push(`variables[${index}].type is invalid`);
    if (
      variable.quantifier !== undefined &&
      variable.quantifier !== "forall" &&
      variable.quantifier !== "exists"
    )
      errors.push(`variables[${index}].quantifier is invalid`);
    if (name) declared.add(name);
  }
  let headFacts: ExpressionFacts = {
    positiveVariables: new Set(),
    allVariables: new Set(),
    atoms: 0,
  };
  let bodyFacts: ExpressionFacts = {
    positiveVariables: new Set(),
    allVariables: new Set(),
    atoms: 0,
  };
  if (input.head !== undefined)
    headFacts = validateAtom(input.head, "head", declared, errors);
  if (input.body !== undefined) {
    bodyFacts = validateExpression(input.body, "body", declared, errors, 0);
  }
  const facts: ExpressionFacts = {
    positiveVariables: bodyFacts.positiveVariables,
    allVariables: new Set([
      ...headFacts.allVariables,
      ...bodyFacts.allVariables,
    ]),
    atoms: headFacts.atoms + bodyFacts.atoms,
  };
  if (facts.atoms > LOGIC_RULE_MAX_ATOMS)
    errors.push(`rule contains more than ${LOGIC_RULE_MAX_ATOMS} atoms`);
  if (kind === "atom" && (input.head === undefined || input.body !== undefined))
    errors.push("atom kind requires head and forbids body");
  if (kind === "rule" && (input.head === undefined || input.body === undefined))
    errors.push("rule kind requires head and body");
  if (
    kind === "constraint" &&
    (input.body === undefined || input.head !== undefined)
  )
    errors.push("constraint kind requires body and forbids head");
  if (isRecord(input.head)) {
    const headVars = new Set<string>();
    for (const term of Array.isArray(input.head.args) ? input.head.args : [])
      if (
        isRecord(term) &&
        term.kind === "var" &&
        typeof term.name === "string"
      )
        headVars.add(term.name);
    for (const variable of headVars) {
      if (!facts.positiveVariables.has(variable))
        errors.push(
          `head variable ${variable} is not range-restricted by a positive body atom`,
        );
      const declaration = variables.find(
        (candidate) => isRecord(candidate) && candidate.name === variable,
      );
      if (declaration?.quantifier === "exists")
        errors.push(`head variable ${variable} cannot be existential`);
    }
  }
  for (const variable of facts.allVariables)
    if (!declared.has(variable))
      errors.push(`variable ${variable} is not declared`);
  for (const variable of bodyFacts.allVariables)
    if (!bodyFacts.positiveVariables.has(variable))
      errors.push(
        `body variable ${variable} is not range-restricted by a positive atom`,
      );
  if (
    input.exceptions !== undefined &&
    (!Array.isArray(input.exceptions) || input.exceptions.length > 16)
  )
    errors.push("exceptions must contain at most 16 expressions");
  if (input.exceptions !== undefined && Array.isArray(input.exceptions)) {
    for (const [index, exception] of input.exceptions.entries()) {
      const exceptionFacts = validateExpression(
        exception,
        `exceptions[${index}]`,
        declared,
        errors,
        0,
      );
      for (const variable of exceptionFacts.allVariables)
        if (!bodyFacts.positiveVariables.has(variable))
          errors.push(
            `exception variable ${variable} is not range-restricted by a positive body atom`,
          );
    }
  }
  if (input.scope !== undefined) {
    if (!isRecord(input.scope)) errors.push("scope must be an object");
    else {
      invalidKeys(input.scope, ["authority", "name", "tags"], "scope", errors);
      for (const key of ["authority", "name"] as const) {
        if (
          input.scope[key] !== undefined &&
          typeof input.scope[key] !== "string"
        )
          errors.push(`scope.${key} must be a string`);
      }
      if (
        input.scope.tags !== undefined &&
        (!Array.isArray(input.scope.tags) ||
          input.scope.tags.some((tag) => typeof tag !== "string"))
      )
        errors.push("scope.tags must be an array of strings");
    }
  }
  if (
    input.ruleSchemaId !== undefined &&
    (typeof input.ruleSchemaId !== "string" ||
      !SCHEMA_ID.test(input.ruleSchemaId))
  )
    errors.push("ruleSchemaId is invalid");
  if (
    input.validFrom !== undefined &&
    (typeof input.validFrom !== "string" ||
      Number.isNaN(Date.parse(input.validFrom)))
  )
    errors.push("validFrom must be an ISO timestamp");
  if (
    input.validTo !== undefined &&
    (typeof input.validTo !== "string" ||
      Number.isNaN(Date.parse(input.validTo)))
  )
    errors.push("validTo must be an ISO timestamp");
  if (
    input.validFrom &&
    input.validTo &&
    Date.parse(String(input.validFrom)) > Date.parse(String(input.validTo))
  )
    errors.push("validFrom must not be after validTo");
  if (errors.length > 0) return { valid: false, errors, warnings };
  const normalized = normalizeIr(input as unknown as LogicRuleIR);
  const canonicalJson = canonicalLogicJson(normalized);
  const ruleHash = logicRuleHash(normalized);
  const semanticKey = logicSemanticKey(normalized);
  const renderedProlog = renderLogicProlog(normalized);
  if (
    normalized.body &&
    JSON.stringify(normalized.body).includes('"kind":"not"')
  )
    warnings.push(
      "negation is accepted only for explicitly closed-world predicates and requires stratification against stored schemas",
    );
  return {
    valid: true,
    errors,
    warnings,
    normalized,
    canonicalJson,
    ruleHash,
    semanticKey,
    renderedProlog,
  };
}

export function utf8Span(
  text: string,
  start: number,
  end: number,
): { readonly start: number; readonly end: number } {
  return {
    start: Buffer.byteLength(text.slice(0, Math.max(0, start)), "utf8"),
    end: Buffer.byteLength(text.slice(0, Math.max(start, end)), "utf8"),
  };
}
