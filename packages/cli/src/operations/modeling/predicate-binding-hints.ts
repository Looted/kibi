import {
  bindingCanBeApplied,
  clauseBindingReason,
  isGenericPlaceholder,
  isParticipantArgumentType,
  nameOrStopWordReason,
  subjectKeyParticipantReason,
} from "./predicate-bindings.js";
import type { BindingHint, PredicateSuggestion } from "./predicate-types.js";
import { escapeRegExp } from "./predicate-utils.js";

const MAX_EXAMPLES = 5;

/** Split `name(a, b(c), d)` into its top-level arguments, or [] when it is not a call. */
function exampleArguments(example: string): string[] {
  const open = example.indexOf("(");
  const close = example.lastIndexOf(")");
  if (open < 0 || close <= open) return [];
  const inner = example.slice(open + 1, close);
  const args: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of inner) {
    if (char === "(" || char === "[") depth += 1;
    if (char === ")" || char === "]") depth -= 1;
    if (char === "," && depth === 0) {
      args.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  args.push(current.trim());
  return args.filter(Boolean);
}

/**
 * What to do when the claim names no participant for an actor-like argument:
 * the requirement's subject key is not a participant, and a schema whose
 * actor the claim never names does not fit the claim.
 */
// implements REQ-model-predicates-participant-not-subject
function noParticipantGuidance(type: string): string {
  return `The claim names no ${type}. Bind the participant the claim names (a noun of at most 3 words), never the requirement's subject key; if the claim names no ${type}, this schema does not fit the claim: record_ontology_gap instead.`;
}

// implements REQ-model-predicates-participant-not-subject
function unboundReason(
  candidate: PredicateSuggestion,
  name: string,
  value: string,
  text: string,
  requirementSubjects: readonly string[],
): string {
  const schema = candidate.schema;
  const provenance = candidate.binding_provenance_by_argument[name];
  const type = schema.argument_types[schema.argument_names.indexOf(name)];
  const participant = isParticipantArgumentType(type);
  const nameReason = nameOrStopWordReason(value, {
    argumentName: name,
    argumentNames: schema.argument_names,
    constants: schema.argument_constants?.[name],
    text,
  });
  if (nameReason !== null)
    return `The value "${value}" is not a binding: ${nameReason}.`;
  const subjectReason = subjectKeyParticipantReason(value, {
    argumentType: type,
    constants: schema.argument_constants?.[name],
    constrainedSubjects: requirementSubjects,
  });
  if (subjectReason !== null)
    return `The value "${value}" is not a binding: ${subjectReason}. ${noParticipantGuidance(String(type))}`;
  const clauseReason = clauseBindingReason(value, {
    argumentType: type,
    constants: schema.argument_constants?.[name],
  });
  if (clauseReason !== null)
    return participant
      ? `The value "${value}" is not a binding: ${clauseReason}. Bind a noun of at most 3 words. ${noParticipantGuidance(String(type))}`
      : `The value "${value}" is not a binding: ${clauseReason}. Bind a noun of at most 3 words, or the requirement's subject key.`;
  if (!value.trim() || isGenericPlaceholder(value))
    return participant
      ? noParticipantGuidance(String(type))
      : "The claim text names no value for this argument.";
  if (provenance === "inferred")
    return `The value "${value}" was inferred and does not appear in the claim text; confirm it or pass the exact value.`;
  if (schema.argument_constants?.[name])
    return `The value "${value}" is not one of this argument's declared constants.`;
  return `The value "${value}" needs review.`;
}

/**
 * For each unbound argument of a candidate: its type, its declared constants
 * when the vocabulary is closed, example values from the schema, and why the
 * current value was not accepted, so the agent binds from the claim text
 * instead of guessing.
 */
// implements REQ-model-predicates-binding-placeholders, REQ-model-predicates-requirement-subject-v2, REQ-model-predicates-binding-clauses, REQ-model-predicates-participant-not-subject
export function buildBindingHints(
  candidate: PredicateSuggestion,
  text: string,
  requirementSubjects: readonly string[] = [],
): BindingHint[] {
  const schema = candidate.schema;
  const parsedExamples = schema.examples.map(exampleArguments);
  const namesSubject = schema.argument_names.includes("subject");
  return candidate.unbound_arguments.map((name) => {
    // A schema without a subject argument records the requirement's subject
    // as the predicate fact's subject_key instead.
    if (name === "subject_key" && !namesSubject)
      return {
        argument: name,
        position: -1,
        type: "subject_key",
        description:
          "The subject the predicate fact is about; recorded as its subject_key because the schema names no subject argument.",
        examples: requirementSubjects.slice(0, MAX_EXAMPLES),
        currentValue: candidate.subject_key ?? "",
        provenance: "placeholder",
        reason: `The ${schema.predicate_name} schema does not name the requirement's subject, so kb_check pairs the predicate with the subject fact only through subject_key. Pass subjectHint with one of the subjects the requirement constrains.`,
      };
    const position = schema.argument_names.indexOf(name);
    const constants = schema.argument_constants?.[name];
    const exampleValues = parsedExamples
      .map((args) => args[position])
      .filter((value): value is string => typeof value === "string");
    // The subject keys the requirement already constrains come first for
    // the subject argument, and for an entity argument of a schema without
    // one, so the predicate and the subject fact use one identifier for the
    // subject. A participant argument (actor, role, owner) never gets them:
    // the subject is what the claim is about, not who acts on it.
    const offersSubjects =
      name === "subject" ||
      (!namesSubject && schema.argument_types[position] === "entity");
    const examples = Array.from(
      new Set([
        ...(offersSubjects ? requirementSubjects : []),
        ...(constants ?? []),
        ...exampleValues,
      ]),
    ).slice(0, MAX_EXAMPLES);
    const current = candidate.predicate_args[position] ?? "";
    const description = schema.argument_descriptions?.[position];
    return {
      argument: name,
      position,
      type: schema.argument_types[position] ?? "unknown",
      ...(description ? { description } : {}),
      ...(constants ? { allowedValues: [...constants] } : {}),
      examples,
      currentValue: current,
      provenance:
        candidate.binding_provenance_by_argument[name] ?? "placeholder",
      reason:
        name === "subject" &&
        candidate.subject_pairing === "unpaired" &&
        bindingCanBeApplied(
          candidate.binding_provenance_by_argument[name] ?? "placeholder",
        )
          ? `The value "${current}" is not a subject the requirement constrains (${requirementSubjects.join(", ")}), so kb_check would not pair the predicate with the subject fact. Bind one of them.`
          : unboundReason(candidate, name, current, text, requirementSubjects),
    };
  });
}

/**
 * Whether the claim text names `value`: its words in order, any separator,
 * with a plural ending allowed on the last word (`guest` names `guests`).
 */
// implements REQ-model-predicates-participant-not-subject
function claimNamesValue(text: string, value: string): boolean {
  const words = value
    .toLowerCase()
    .split(/[\s_.-]+/)
    .filter(Boolean);
  if (words.length === 0) return false;
  // Lookarounds instead of \b: a value may start or end with a symbol
  // (`svc(ci)`, `c++`), where a word boundary never matches.
  return new RegExp(
    `(?<!\\w)${words.map(escapeRegExp).join("[\\s_-]+")}(?:e?s)?(?!\\w)`,
    "i",
  ).test(text);
}

/**
 * Whether a clause lifted from the claim describes an action rather than a
 * participant: it opens with a gerund ("Discarding a draft while …"). A
 * clause that opens with a noun ("Administrators who were granted …") may
 * still name the participant in its first words, so it is left to the agent.
 */
// implements REQ-model-predicates-participant-not-subject
function clauseIsActivity(clause: string): boolean {
  const head =
    clause
      .toLowerCase()
      .split(/[\s_-]+/)
      .find(Boolean) ?? "";
  return head.length > 4 && head.endsWith("ing");
}

/**
 * The unbound participant arguments (`actor`, `actor_scope`, `role`,
 * `owner`) of a candidate that the claim names no participant for: the
 * current value is empty or a placeholder, the requirement's subject key, or
 * a clause of the claim that opens with a gerund (an activity, not a
 * participant), and none of the argument's declared constants or schema
 * example values occurs in the claim text. The agent cannot bind such an
 * argument from the claim, so the schema does not fit the claim.
 */
// implements REQ-model-predicates-participant-not-subject
export function unnamedParticipantArguments(
  candidate: PredicateSuggestion,
  text: string,
  requirementSubjects: readonly string[] = [],
): string[] {
  const schema = candidate.schema;
  const parsedExamples = schema.examples.map(exampleArguments);
  return candidate.unbound_arguments.filter((name) => {
    const position = schema.argument_names.indexOf(name);
    if (position < 0) return false;
    const type = schema.argument_types[position];
    if (!isParticipantArgumentType(type)) return false;
    const constants = schema.argument_constants?.[name];
    const current = candidate.predicate_args[position] ?? "";
    const unnamed =
      !current.trim() ||
      isGenericPlaceholder(current) ||
      subjectKeyParticipantReason(current, {
        argumentType: type,
        constants,
        constrainedSubjects: requirementSubjects,
      }) !== null ||
      (clauseBindingReason(current, { argumentType: type, constants }) !==
        null &&
        clauseIsActivity(current));
    if (!unnamed) return false;
    const known = [
      ...(constants ?? []),
      ...parsedExamples
        .map((args) => args[position])
        .filter((value): value is string => typeof value === "string"),
    ];
    return !known.some((value) => claimNamesValue(text, value));
  });
}

/** One line per hint for the text summary: `name (type, e.g. a, b)`. */
export function describeBindingHints(hints: readonly BindingHint[]): string {
  return hints
    .map((hint) => {
      const values = hint.allowedValues
        ? `one of ${hint.allowedValues.join(", ")}`
        : hint.examples.length > 0
          ? `e.g. ${hint.examples.join(", ")}`
          : "no example in the schema";
      return `${hint.argument} (${hint.type}, ${values})`;
    })
    .join("; ");
}
