import {
  type PredicateRule,
  normalizeKey,
  normalizePredicateToken,
} from "./predicate-rule.js";

/**
 * Launcher contracts are deliberately matched as complete, domain-specific
 * propositions. Generic words such as "error" or "workspace" are not enough
 * to route a requirement into this family.
 */
export const LAUNCHER_PREDICATE_RULES = [
  {
    pattern:
      /^(?<subject>.+?)\s+must\s+resolve\s+and\s+execute\s+the\s+(?<dependency>.+?)\s+without\s+downloading\s+packages\s+or\s+using\s+a\s+global\s+or\s+plugin-local\s+runtime\.?$/i,
    name: "dependency_resolution_policy",
    args: (groups) => [
      normalizeKey(groups.subject ?? ""),
      normalizePredicateToken(groups.dependency ?? "dependency"),
      "consumer_local",
      "no_download",
    ],
    rationale:
      "Consumer-local dependency resolution and acquisition restrictions are a reusable launcher policy predicate.",
  },
  {
    pattern:
      /^it\s+must\s+resolve\s+the\s+consumer\s+workspace\s+in\s+deterministic\s+order:\s*(?<sources>.+?)\s+then\s+cwd\s+only\s+when\s+(?<condition>.+?)\.?$/i,
    name: "ordered_resolution_strategy",
    args: (groups) => [
      "launcher",
      normalizePredicateToken(groups.sources ?? "ordered_sources"),
      normalizePredicateToken(groups.condition ?? "cwd_requires_validation"),
    ],
    rationale:
      "An ordered workspace candidate list with a validated cwd fallback is a deterministic resolution strategy.",
  },
  {
    pattern: /^(?<condition>unresolved\s+placeholders?)\s+are\s+invalid\.?$/i,
    name: "resolution_failure_policy",
    args: (groups) => [
      "launcher",
      normalizePredicateToken(groups.condition ?? "invalid_placeholder"),
      "reject_input",
    ],
    rationale:
      "Invalid unresolved placeholders are an explicit resolution failure condition.",
  },
  {
    pattern:
      /^(?<condition>ambiguous\s+(?:multiple\s+)?usable\s+roots?)\s+fail\s+clearly\.?$/i,
    name: "resolution_failure_policy",
    args: (groups) => [
      "launcher",
      normalizePredicateToken(groups.condition ?? "ambiguous_root"),
      "clear_error",
    ],
    rationale:
      "Ambiguous usable roots require a deterministic, clearly reported resolution failure.",
  },
  {
    pattern:
      /^(?<subject>the\s+launcher)\s+must\s+resolve\s+kibi-mcp\s+through\s+consumer-scoped\s+node\s+package\s+semantics\s+including\s+exports-restricted\s+and\s+pnpm-style\s+layouts,\s+and\s+reject\s+packages\s+outside\s+consumer\s+scope\s+unless\s+active\s+package-manager\s+semantics\s+authorize\s+it\.?$/i,
    name: "exception_rule",
    args: () => [
      "launcher",
      "consumer_scoped_node_package_semantics",
      "active_package_manager_semantics",
    ],
    rationale:
      "Consumer-scoped package resolution with an explicitly authorized package-manager exception is an exception policy.",
  },
  {
    pattern:
      /^(?<subject>it)\s+must\s+spawn\s+the\s+declared\s+kibi-mcp\s+bin\s+with\s+cwd\s+and\s+kibi_workspace\s+set\s+to\s+the\s+consumer\s+workspace,\s+preserve\s+stdio,\s+and\s+propagate\s+child\s+exit\s+codes\s+and\s+termination\s+signals\.?$/i,
    name: "process_delegation_contract",
    args: () => [
      "launcher",
      "resolved_executable",
      "consumer_cwd",
      "consumer_workspace_environment",
      "inherited_stdio",
      "propagate_exit_and_termination",
    ],
    rationale:
      "Executable, cwd, environment, stdio, and termination propagation form a reusable process delegation contract.",
  },
  {
    pattern:
      /^(?<subject>missing)\s+project-local\s+kibi-mcp\s+must\s+produce\s+a\s+concise\s+actionable\s+error\.?$/i,
    name: "failure_behavior",
    args: () => ["launcher", "missing_dependency", "actionable_error"],
    rationale:
      "A missing project-local dependency with an actionable error is a reusable launcher failure behavior.",
  },
] as const satisfies readonly PredicateRule[];

/**
 * Return the reviewed argument tuple for an exact launcher proposition.
 *
 * The modeling route uses this same rule table as the semantic advisor so an
 * inferred apply plan cannot silently drift from the canonical ontology
 * interpretation. Non-exact prose deliberately returns null and must remain
 * reviewable through explicit argument bindings.
 */
export function exactLauncherPredicateArgs(
  predicateName: string,
  text: string,
): readonly string[] | null {
  for (const rule of LAUNCHER_PREDICATE_RULES) {
    if (rule.name !== predicateName) continue;
    const match = text.match(rule.pattern);
    if (match) return [...rule.args(match.groups ?? {})];
  }
  return null;
}
