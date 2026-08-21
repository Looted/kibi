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

export function classifyBinding(
  value: string,
  text: string,
  explicit: boolean,
  canonical = false,
): BindingProvenance {
  const normalized = value.trim();
  if (canonical && !isGenericPlaceholder(normalized)) return "extracted";
  if (
    explicit &&
    (!isGenericPlaceholder(normalized) ||
      ["true", "false"].includes(normalized.toLowerCase()))
  )
    return "explicit";
  if (!normalized || isGenericPlaceholder(normalized)) return "placeholder";
  if (textContainsValue(text, normalized)) return "extracted";
  return "inferred";
}

const PROVENANCE_ORDER: readonly BindingProvenance[] = [
  "explicit",
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
  return value === "explicit" || value === "extracted";
}
