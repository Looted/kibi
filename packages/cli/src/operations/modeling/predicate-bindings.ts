import type { BindingProvenance } from "./predicate-types.js";

const PLACEHOLDER_VALUES = new Set([
  "unknown",
  "requirement.subject",
  "domain_event",
  "true",
  "false",
  "subject",
  "component",
  "condition",
  "behavior",
  "action",
  "target",
  "resource",
  "scope",
  "property",
  "value",
  "owner",
  "actor",
  "trigger",
  "unspecified_trigger",
  "unit",
  "policy",
  "outcome",
  "failure_condition",
  "required_outcome",
  "ordered_sources",
  "executable_policy",
  "cwd_policy",
  "environment_policy",
  "stdio_policy",
  "termination_policy",
  "normal_behavior",
]);

const DERIVED_CUE_ALIASES: Readonly<Record<string, readonly string[]>> = {
  navigation: ["navigate", "navigates", "navigation"],
  draft: ["draft", "drafts"],
  active_annotation: ["annotation", "active"],
  editor: ["editor"],
  editor_annotation: ["editor", "annotation"],
  consumer_local: ["consumer-local", "consumer local", "project-local"],
  no_download: ["no download", "without downloading", "not download"],
  no_global_fallback: ["no global fallback", "without global fallback"],
  package_manager_exception: ["package-manager", "package manager"],
  missing_candidate: ["missing", "unusable", "candidate"],
  cwd_unusable: ["cwd", "working directory", "current directory"],
  invalid_input: ["invalid", "unresolved", "placeholder"],
  invalid_placeholder: ["invalid placeholder", "unresolved placeholder"],
  ambiguous_root: ["ambiguous", "usable root", "roots"],
  clear_error: ["clear error", "fail clearly", "actionable error"],
  resolved_executable: ["executable", "command", "binary", "bin"],
  consumer_cwd: ["cwd", "working directory", "consumer"],
  inherited_environment: ["environment", "env"],
  consumer_workspace_environment: [
    "environment",
    "env",
    "kibi_workspace",
    "workspace",
  ],
  inherited_stdio: ["stdio", "stdin", "stdout", "stderr", "pipe"],
  propagate_termination: ["terminate", "termination", "exit", "signal"],
  missing_dependency: [
    "missing dependency",
    "missing kibi-mcp",
    "missing project-local",
    "project-local kibi-mcp",
    "missing module",
  ],
  actionable_error: ["actionable", "clear error", "report", "error"],
  exception: ["exception", "except", "package-manager", "package manager"],
  // Wording that names a closed-vocabulary constant without spelling it.
  deny: [
    "denied",
    "must not",
    "must never",
    "forbidden",
    "prohibited",
    "not allowed",
    "not be allowed",
  ],
  allow: ["is allowed", "are allowed", "permitted"],
  on_demand: ["on demand", "on request"],
  timeout: ["times out", "timed out", "time out"],
  submit: ["submission", "submits", "submitted"],
};

function textContainsValue(text: string, value: string): boolean {
  const lower = text.toLowerCase();
  if (value.includes("|")) {
    const parts = value.split("|").filter(Boolean);
    return (
      parts.length > 0 && parts.every((part) => textContainsValue(text, part))
    );
  }
  const normalized = value.toLowerCase().replace(/[_.-]+/g, " ");
  const normalizedText = lower.replace(/[_.-]+/g, " ");
  if (normalized.length > 2 && normalizedText.includes(normalized)) return true;
  if (
    value.toLowerCase() === "missing_dependency" &&
    /missing(?:\s+\S+){0,4}\s+dependenc/i.test(normalizedText)
  )
    return true;
  const aliases = DERIVED_CUE_ALIASES[value.toLowerCase().replace(/\./g, "_")];
  return (
    aliases?.some((alias) =>
      normalizedText.includes(alias.toLowerCase().replace(/[_.-]+/g, " ")),
    ) ?? false
  );
}

export function isGenericPlaceholder(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return (
    PLACEHOLDER_VALUES.has(normalized) ||
    normalized === "unknown" ||
    normalized.startsWith("requirement.") ||
    (normalized.endsWith("_policy") &&
      ["executable", "cwd", "environment", "stdio", "termination"].some(
        (kind) => normalized.startsWith(kind),
      ))
  );
}

/**
 * Words that carry no domain meaning on their own: auxiliary and trivial
 * verbs, articles, pronouns and filler. A binding made of one of them names
 * no reviewed value, so it stays unbound.
 */
const STOP_WORD_BINDINGS = new Set([
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
  "am",
  "do",
  "does",
  "did",
  "done",
  "have",
  "has",
  "had",
  "it",
  "its",
  "this",
  "that",
  "these",
  "those",
  "they",
  "them",
  "there",
  "thing",
  "something",
  "anything",
  "some",
  "any",
  "of",
  "to",
  "in",
  "at",
  "by",
  "for",
  "with",
  "and",
  "or",
  "not",
  "null",
  "nil",
  "n_a",
  "na",
  "tbd",
  "todo",
  "x",
  "xxx",
  "foo",
  "bar",
  "example",
  "placeholder",
]);

/** A binding value in the snake_case form argument names use. */
export function bindingToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** The schema context a binding is judged against. */
export type BindingContext = Readonly<{
  /** The argument this value binds. */
  argumentName?: string;
  /** Every argument name of the schema. */
  argumentNames?: readonly string[];
  /** Declared constants of this argument: always valid when matched. */
  constants?: readonly string[] | undefined;
  /** The argument's declared type (`entity`, `actor`, `resource`, ...). */
  argumentType?: string | undefined;
  /**
   * The claim text. A value that repeats an argument name is still a real
   * binding when the claim itself names it (a `launcher` argument bound to
   * "launcher" in "The launcher must ...").
   */
  text?: string | undefined;
  /**
   * The subject keys the requirement constrains. A participant argument
   * (`actor`, `actor_scope`, `role`, `owner`) bound to one of them names no
   * participant: the predicate fact already carries that key as its
   * subject_key, so the binding would be vacuous.
   */
  constrainedSubjects?: readonly string[] | undefined;
}>;

function claimNames(text: string | undefined, token: string): boolean {
  if (!text || !token) return false;
  const words = token.split("_").filter(Boolean);
  if (words.length === 0) return false;
  return new RegExp(`\\b${words.join("[\\s_-]+")}\\b`, "i").test(text);
}

function matchesConstant(value: string, context: BindingContext): boolean {
  const token = bindingToken(value);
  return (
    context.constants?.some((constant) => bindingToken(constant) === token) ??
    false
  );
}

/**
 * Why a value only stands in for a binding, or null when it can be a reviewed
 * value: it repeats its own or another argument's name, or it is a bare stop
 * word. Declared constants and the booleans `true`/`false` always pass.
 */
// implements REQ-model-predicates-binding-placeholders
export function nameOrStopWordReason(
  value: string,
  context: BindingContext = {},
): string | null {
  const token = bindingToken(value);
  if (token === "true" || token === "false") return null;
  if (matchesConstant(value, context)) return null;
  if (STOP_WORD_BINDINGS.has(token)) return `"${token}" is a stop word`;
  const own = context.argumentName ? bindingToken(context.argumentName) : "";
  const repeatsName =
    (own !== "" && token === own) ||
    (context.argumentNames ?? []).some((name) => bindingToken(name) === token);
  if (repeatsName && !claimNames(context.text, token))
    return `it repeats the argument name ${token} and the claim does not name it`;
  return null;
}

/**
 * Argument types that name a participant (who or what), so a value is a
 * short noun or a subject key, never a clause of the claim.
 */
const NAMING_ARGUMENT_TYPES = new Set([
  "entity",
  "actor",
  "actor_scope",
  "resource",
  "owner",
  "role",
  "component",
]);

/**
 * Argument types that name who acts or owns. The requirement's subject key
 * is what the claim is about, not a participant, so it never binds them.
 */
const PARTICIPANT_ARGUMENT_TYPES = new Set([
  "actor",
  "actor_scope",
  "role",
  "owner",
]);

/** Whether an argument type names a participant (who acts or owns). */
// implements REQ-model-predicates-participant-not-subject
export function isParticipantArgumentType(type: string | undefined): boolean {
  return PARTICIPANT_ARGUMENT_TYPES.has(type ? bindingToken(type) : "");
}

/**
 * Why a value bound to a participant argument is the requirement's subject
 * key rather than a participant, or null. Explicit bindings are judged too:
 * `actor = <subject key>` would complete a predicate whose actor says
 * nothing the fact's subject_key does not already say.
 */
// implements REQ-model-predicates-participant-not-subject
export function subjectKeyParticipantReason(
  value: string,
  context: BindingContext = {},
): string | null {
  if (!isParticipantArgumentType(context.argumentType)) return null;
  if (matchesConstant(value, context)) return null;
  const token = bindingToken(value);
  if (token === "") return null;
  const subject = (context.constrainedSubjects ?? []).find(
    (key) => bindingToken(key) === token,
  );
  if (subject === undefined) return null;
  return `"${value}" is the requirement's subject key ${subject}, which the predicate fact already carries as its subject_key, so it names no ${bindingToken(context.argumentType ?? "")}`;
}

/** The most words a value of a naming argument may have. */
export const MAX_NAMING_BINDING_WORDS = 3;

/**
 * Why a value taken from the claim text cannot name a participant, or null
 * when it can: a value of an entity-, actor- or resource-like argument with
 * more than MAX_NAMING_BINDING_WORDS words is a clause of the claim (for
 * example everything before the modal verb), not the participant's name.
 * Explicit bindings, requirement subjects and declared constants are not
 * judged here.
 */
// implements REQ-model-predicates-binding-clauses
export function clauseBindingReason(
  value: string,
  context: BindingContext = {},
): string | null {
  const type = context.argumentType ? bindingToken(context.argumentType) : "";
  if (!NAMING_ARGUMENT_TYPES.has(type)) return null;
  if (matchesConstant(value, context)) return null;
  const words = bindingToken(value).split("_").filter(Boolean);
  if (words.length <= MAX_NAMING_BINDING_WORDS) return null;
  return `it is a ${words.length}-word clause of the claim, not a short name for this ${type}`;
}

// implements REQ-mcp-suggest-predicates, REQ-model-predicates-binding-placeholders, REQ-model-predicates-binding-clauses, REQ-model-predicates-participant-not-subject
export function classifyBinding(
  value: string,
  text: string,
  explicit: boolean,
  canonical = false,
  context: BindingContext = {},
): BindingProvenance {
  const normalized = value.trim();
  // A value that only repeats an argument name or a stop word is unbound
  // however it was supplied or extracted.
  if (nameOrStopWordReason(normalized, { ...context, text }) !== null)
    return "placeholder";
  // The subject key is what the claim is about; as an actor, role or owner
  // it is a vacuous binding, explicit or not.
  if (subjectKeyParticipantReason(normalized, context) !== null)
    return "placeholder";
  const constant = matchesConstant(normalized, context);
  if (canonical && (constant || !isGenericPlaceholder(normalized)))
    return "extracted";
  if (
    explicit &&
    (constant ||
      !isGenericPlaceholder(normalized) ||
      ["true", "false"].includes(normalized.toLowerCase()))
  )
    return "explicit";
  if (!normalized || isGenericPlaceholder(normalized)) return "placeholder";
  // A clause lifted from the claim names no participant: it stays unbound
  // like a placeholder so the agent binds a short noun or the subject key.
  if (clauseBindingReason(normalized, context) !== null) return "placeholder";
  if (textContainsValue(text, normalized)) return "extracted";
  return "inferred";
}

const PROVENANCE_ORDER: readonly BindingProvenance[] = [
  "explicit",
  "requirement",
  "extracted",
  "inferred",
  "placeholder",
];

export function aggregateBindingProvenance(
  values: readonly BindingProvenance[],
): BindingProvenance {
  return values.reduce<BindingProvenance>(
    (worst, value) =>
      PROVENANCE_ORDER.indexOf(value) > PROVENANCE_ORDER.indexOf(worst)
        ? value
        : worst,
    "explicit",
  );
}

export function bindingCanBeApplied(value: BindingProvenance): boolean {
  return (
    value === "explicit" || value === "requirement" || value === "extracted"
  );
}
