import {
  type PredicateRule,
  commaList,
  normalizeKey,
  normalizePredicateToken,
} from "./predicate-rule.js";

export const PRODUCT_PREDICATE_RULES = [
  {
    pattern:
      /^(?<subject>.+?)\s+(?:must|shall|should)\s+pass\s+(?<gate>.+?)\s+before\s+(?<target>.+?)\.?$/i,
    name: "release_gate_rule",
    args: (g) => [
      normalizeKey(g.subject ?? ""),
      normalizePredicateToken(g.gate ?? "gate"),
      normalizeKey(g.target ?? ""),
    ],
    rationale:
      "Release-gate prose defines required gates before distribution or deployment and should be queryable as a predicate.",
    accepts: (statement) =>
      /\b(?:app store|build|deployment|distribution|release|testflight)\b/i.test(
        statement,
      ),
  },
  {
    pattern:
      /^(?<subject>.+?)\s+(?:must|shall|should)\s+synchronize\s+across\s+(?<platforms>.+?)\.?$/i,
    name: "platform_consistency_rule",
    args: (g) => [normalizeKey(g.subject ?? ""), commaList(g.platforms ?? "")],
    rationale:
      "Platform consistency prose defines synchronization across platforms and should be queryable as a predicate.",
  },
  {
    pattern:
      /^(?<subject>.+?)\s+(?:must|shall|should)\s+preserve\s+(?<preserved>.+?)\s+when\s+(?:the\s+)?(?<condition>.+?)\.?$/i,
    name: "preservation_rule",
    args: (g) => [
      normalizeKey(g.subject ?? ""),
      normalizeKey(g.preserved ?? "preserved"),
      normalizePredicateToken(g.condition ?? ""),
    ],
    rationale:
      "Preservation prose defines data preserved across deletion/removal boundaries and should be queryable as a predicate.",
  },
  {
    pattern:
      /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+persisted\s+as\s+(?<contract>.+?)\.?$/i,
    name: "abstraction_boundary_rule",
    args: (g) => [
      normalizeKey(g.subject ?? ""),
      "persisted_as",
      normalizePredicateToken(g.contract ?? ""),
    ],
    rationale:
      "Abstraction-boundary prose defines renderer/vendor-neutral persistence or contract constraints and should be queryable as a predicate.",
    accepts: (statement) =>
      /\b(?:neutral|contract|renderer|runtime|vendor)\b/i.test(statement),
  },
  {
    pattern:
      /^(?<subject>.+?)\s+(?:must|shall|should)\s+have\s+explicit\s+(?<setting>[A-Za-z0-9_.-]+)\s+(?<value>[A-Za-z0-9_.-]+)\.?$/i,
    name: "security_configuration_rule",
    args: (g) => [
      normalizeKey(g.subject ?? ""),
      normalizeKey(g.setting ?? ""),
      normalizeKey(g.value ?? ""),
    ],
    rationale:
      "Security-configuration prose defines explicit infrastructure or database settings and should be queryable as a predicate.",
    accepts: (statement) =>
      /\b(?:database|deployment|function|rpc|search_path|security|trigger)\b/i.test(
        statement,
      ),
  },
  {
    pattern:
      /^(?<subject>.+?)\s+(?:must|shall|should)\s+use\s+(?<kind>.+?)\s+in\s+priority\s+order\s+(?<values>.+?)\.?$/i,
    name: "ordered_strategy_rule",
    args: (g) => [
      normalizeKey(g.subject ?? ""),
      normalizeKey(g.kind ?? "strategy"),
      (g.values ?? "")
        .split(/,|>/)
        .map(normalizePredicateToken)
        .filter(Boolean)
        .join(","),
    ],
    rationale:
      "Ordered-strategy prose defines a required priority order and should be queryable as a predicate.",
  },
  {
    pattern:
      /^(?<subject>.+?)\s+(?:must|shall|should)\s+automatically\s+refresh\s+(?<target>.+?)\s+without\s+requiring\s+manual\s+page\s+reload\.?$/i,
    name: "refresh_policy_rule",
    args: (g) => [
      normalizeKey(g.subject ?? ""),
      normalizeKey(g.target ?? ""),
      "automatic",
    ],
    rationale:
      "Refresh-policy prose defines automatic refresh behavior and should be queryable as a predicate.",
  },
  {
    pattern:
      /^(?<actor>.+?)\s+(?:must|shall|should)\s+be\s+denied\s+(?<action>.+?)\.?$/i,
    name: "scoped_authorization_rule",
    args: (g) => [
      normalizeKey(g.actor ?? ""),
      normalizeKey(g.action ?? ""),
      "deny",
    ],
    rationale:
      "Scoped-authorization prose defines assignment/ownership-qualified authorization and should be queryable as a predicate.",
    accepts: (statement) =>
      /\b(?:assigned|unassigned|owner|member|scoped)\b/i.test(statement),
  },
  {
    pattern:
      /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+documented\s+in\s+(?<artifact>.+?)\.?$/i,
    name: "documentation_standard_rule",
    args: (g) => [
      normalizeKey(g.subject ?? ""),
      "documented_in",
      normalizeKey(g.artifact ?? ""),
    ],
    rationale:
      "Documentation-standard prose defines required documentation artifacts and should be queryable as a predicate.",
  },
  {
    pattern:
      /^(?:the\s+)?(?<subject>.+?)\s+(?:must|shall|should)\s+warm\s+up\s+on\s+(?<trigger>.+?)\.?$/i,
    name: "warmup_policy_rule",
    args: (g) => [normalizeKey(g.subject ?? ""), normalizeKey(g.trigger ?? "")],
    rationale:
      "Warmup-policy prose defines a required warmup trigger and should be queryable as a predicate.",
  },
  {
    pattern:
      /^(?<subject>.+?)\s+(?:must|shall|should)\s+remain\s+visually\s+aligned\s+with\s+(?<target>.+?)\.?$/i,
    name: "visual_layout_rule",
    args: (g) => [
      normalizeKey(g.subject ?? ""),
      "aligned_with",
      normalizeKey(g.target ?? ""),
    ],
    rationale:
      "Visual-layout prose defines UI alignment requirements and should be queryable as a predicate.",
  },
  {
    pattern:
      /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+enforced\s+at\s+(?<location>.+?)\.?$/i,
    name: "enforcement_location_rule",
    args: (g) => [
      normalizeKey(g.subject ?? ""),
      normalizeKey(g.location ?? ""),
    ],
    rationale:
      "Enforcement-location prose defines the layer where a constraint is enforced and should be queryable as a predicate.",
  },
  {
    pattern:
      /^on\s+(?<trigger>.+?),\s*(?<subject>.+?)\s+(?:must|shall|should)\s+reconcile\s+(?<target>.+?)\s+and\s+(?<action>clear\s+stale\s+.+?)\.?$/i,
    name: "reconciliation_rule",
    args: (g) => [
      normalizeKey(g.subject ?? ""),
      normalizeKey(g.trigger ?? "trigger"),
      normalizeKey(g.target ?? ""),
      normalizeKey(g.action ?? "action"),
    ],
    rationale:
      "Reconciliation prose defines trigger-based cleanup of stale records and should be queryable as a predicate.",
  },
] as const satisfies readonly PredicateRule[];
