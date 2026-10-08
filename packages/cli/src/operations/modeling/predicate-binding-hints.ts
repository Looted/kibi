import {
  isGenericPlaceholder,
  nameOrStopWordReason,
} from "./predicate-bindings.js";
import type { BindingHint, PredicateSuggestion } from "./predicate-types.js";

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

function unboundReason(
  candidate: PredicateSuggestion,
  name: string,
  value: string,
  text: string,
): string {
  const schema = candidate.schema;
  const provenance = candidate.binding_provenance_by_argument[name];
  const nameReason = nameOrStopWordReason(value, {
    argumentName: name,
    argumentNames: schema.argument_names,
    constants: schema.argument_constants?.[name],
    text,
  });
  if (nameReason !== null)
    return `The value "${value}" is not a binding: ${nameReason}.`;
  if (!value.trim() || isGenericPlaceholder(value))
    return "The claim text names no value for this argument.";
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
// implements REQ-model-predicates-binding-placeholders, REQ-model-predicates-requirement-subject
export function buildBindingHints(
  candidate: PredicateSuggestion,
  text: string,
  requirementSubjects: readonly string[] = [],
): BindingHint[] {
  const schema = candidate.schema;
  const parsedExamples = schema.examples.map(exampleArguments);
  return candidate.unbound_arguments.map((name) => {
    const position = schema.argument_names.indexOf(name);
    const constants = schema.argument_constants?.[name];
    const exampleValues = parsedExamples
      .map((args) => args[position])
      .filter((value): value is string => typeof value === "string");
    // The subject keys the requirement already constrains come first, so
    // the predicate and the subject fact use one identifier for the subject.
    const examples = Array.from(
      new Set([
        ...(name === "subject" ? requirementSubjects : []),
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
      reason: unboundReason(candidate, name, current, text),
    };
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
