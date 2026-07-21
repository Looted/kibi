import {
  type PredicateRule,
  normalizeKey,
  normalizePredicateToken,
  normalizeSubjectKey,
  singularize,
} from "./predicate-rule.js";

export const PRODUCT_TAIL_PREDICATE_RULES = [
  {
    pattern:
      /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+throttled\s+for\s+(?<condition>.+?)\.?$/i,
    name: "throttle_policy_rule",
    args: (g) => [
      normalizeKey(g.subject ?? ""),
      normalizePredicateToken(g.condition ?? ""),
    ],
    rationale:
      "Throttle-policy prose defines throttling behavior under high-frequency conditions and should be queryable as a predicate.",
  },
  {
    pattern:
      /^(?:the\s+)?(?<subject>.+?)\s+initializes\s+after\s+(?:the\s+)?(?<ready>.+?)\s+is\s+ready\.?$/i,
    name: "temporal_order",
    args: (g) => [
      normalizeKey(g.subject ?? ""),
      `${normalizeKey(g.ready ?? "")}_ready`,
      "initializes",
    ],
    rationale:
      "Initializes-after prose defines temporal readiness ordering and should be queryable as a predicate.",
  },
  {
    pattern:
      /^when\s+(?<trigger>.+?),\s*(?:the\s+)?(?<subject>[a-z][a-z\s_-]*?)\s+transitions?\s+from\s+(?<from>[a-z][a-z0-9_-]*)\s+to\s+(?<to>[a-z][a-z0-9_-]*)\.?$/i,
    name: "state_transition",
    args: (g) => [
      normalizeSubjectKey(g.subject ?? ""),
      normalizePredicateToken(g.from ?? ""),
      normalizePredicateToken(g.to ?? ""),
      normalizePredicateToken(g.trigger ?? ""),
    ],
    rationale:
      "State transitions have source state, target state, and trigger; model them as predicate facts.",
  },
  {
    pattern:
      /^(?<actor>[a-z][a-z\s_-]*?)\s+(?:must\s+not|cannot|can't|is\s+forbidden\s+to)\s+(?<action>[a-z][a-z_-]*)\s+(?<resource>.+?)\.?$/i,
    name: "permission_rule",
    args: (g) => [
      singularize(normalizeKey(g.actor ?? "")),
      normalizePredicateToken(g.action ?? ""),
      normalizePredicateToken(g.resource ?? ""),
      "deny",
    ],
    rationale:
      "Prohibitions are negative permission rules and should preserve deny polarity.",
    polarity: "deny",
  },
  {
    pattern:
      /^(?:there\s+)?(?:must|shall|should)\s+be\s+at\s+most\s+one\s+(?<subject>[a-z][a-z\s_-]*?)\s+per\s+(?<scope>.+?)\.?$/i,
    name: "uniqueness_constraint",
    args: (g) => [
      normalizeKey(g.subject ?? ""),
      (g.scope ?? "")
        .split(/\s+per\s+/i)
        .map(normalizePredicateToken)
        .join(","),
    ],
    rationale:
      "Per-scope uniqueness is relational and should be modeled as a predicate rather than a generic count.",
  },
  {
    pattern:
      /^(?:the\s+)?(?<subject>[a-z][a-z\s_-]*?)\s+defaults?\s+to\s+(?<value>[a-z][a-z0-9\s_-]*?)(?:\s+(?<property>mode|state|status))?\.?$/i,
    name: "default_value",
    args: (g) => [
      normalizeSubjectKey(g.subject ?? ""),
      normalizeKey(g.property ?? "value"),
      normalizeKey(g.value ?? ""),
    ],
    rationale:
      "Defaults are relational product behavior and should be explicit ontology predicates.",
  },
  {
    pattern:
      /^(?<subject>.+?)\s+(?:terminal\s+)?states\s+are\s+(?<states>.+?)\.?$/i,
    name: "state_membership",
    args: (g) => [
      normalizeSubjectKey(g.subject ?? ""),
      (g.states ?? "")
        .split(/,|\band\b|\bor\b/i)
        .map((value) => normalizePredicateToken(value.trim()))
        .filter(Boolean)
        .join(","),
    ],
    rationale:
      "State sets are relational workflow constraints and should be queryable as predicate facts.",
  },
  {
    pattern:
      /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+rate\s+limited\s+to\s+(?<count>\d+)\s+(?<action>[a-z][a-z\s_-]*?)\s+per\s+(?<window>[a-z]+)\.?$/i,
    name: "rate_limit",
    args: (g) => [
      `${normalizeKey(g.subject ?? "").replace(/_requests?$/, "")}.request`,
      normalizePredicateToken(g.action ?? ""),
      normalizePredicateToken(g.window ?? ""),
      g.count ?? "",
    ],
    rationale:
      "Rate limits are bounded action-window constraints and now map to the production rate_limit predicate.",
  },
  {
    pattern:
      /^only\s+(?<actor>[a-z][a-z\s_-]*?)\s+can\s+(?<action>[a-z][a-z_-]*)\s+(?<resource>.+?)(?:\s+when\s+.+)?\.?$/i,
    name: "permission_rule",
    args: (g) => [
      singularize(normalizeKey(g.actor ?? "")),
      normalizeKey(g.action ?? ""),
      normalizeKey(g.resource ?? ""),
      "assert",
    ],
    rationale:
      "Actor/action/resource permission prose is better represented as an ontology predicate than a scalar property.",
  },
] as const satisfies readonly PredicateRule[];
