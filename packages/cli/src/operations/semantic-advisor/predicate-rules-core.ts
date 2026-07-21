import {
  type PredicateRule,
  commaList,
  normalizeKey,
  normalizePredicateToken,
  normalizeSubjectKey,
  singularize,
} from "./predicate-rule.js";

export const CORE_PREDICATE_RULES = [
  {
    pattern:
      /^(?<subject>.+?)\s+(?:must|shall|should)?\s*(?:stay|remain)?\s*disabled\s+until\s+(?<condition>.+?)\.?$/i,
    name: "guard",
    args: (g) => [
      normalizeKey(g.subject ?? ""),
      normalizePredicateToken(g.condition ?? ""),
      "disabled",
    ],
    rationale:
      "Disabled-until prose defines a condition that guards behavior availability and should be queryable as a predicate.",
  },
  {
    pattern:
      /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+(?<before>[a-z][a-z\s_-]*?)\s+before\s+(?<after>.+?)\.?$/i,
    name: "temporal_order",
    args: (g) => [
      normalizeKey(g.subject ?? "").replace(/_/g, "."),
      normalizePredicateToken(g.before ?? ""),
      normalizePredicateToken(g.after ?? ""),
    ],
    rationale:
      "Before/after ordering is relational temporal logic and should be modeled as a predicate.",
  },
  {
    pattern:
      /^if\s+(?:(?:a|an|the)\s+)?(?<conditionSubject>[a-z][a-z_-]*)\s+(?<condition>.+?),\s*(?:it|they|the\s+[a-z][a-z\s_-]*?)\s+(?<behavior>.+?)\.?$/i,
    name: "conditional_behavior",
    args: (g) => [
      singularize(normalizeKey(g.conditionSubject ?? "")),
      normalizePredicateToken(g.condition ?? ""),
      normalizePredicateToken(g.behavior ?? ""),
    ],
    rationale:
      "If/then requirement prose is conditional behavior and should be queryable as a predicate.",
  },
  {
    pattern:
      /^when\s+(?<condition>.+?),\s*(?:the\s+)?(?<subject>.+?)\s+(?:must|shall|should)\s+(?<behavior>.+?)\.?$/i,
    name: "conditional_behavior",
    args: (g) => [
      normalizeKey(g.subject ?? ""),
      normalizePredicateToken(g.condition ?? ""),
      normalizePredicateToken(g.behavior ?? "behavior"),
    ],
    rationale:
      "When/must prose is conditional behavior and should be queryable as a predicate.",
  },
  {
    pattern:
      /^(?:the\s+)?(?<subject>[a-z][a-z\s_-]*?)\s+(?:must|shall|should)\s+(?<behavior>.+?)\s+unless\s+(?:the\s+)?(?<exception>.+?)\.?$/i,
    name: "exception_rule",
    args: (g) => [
      normalizeSubjectKey(g.subject ?? ""),
      normalizePredicateToken(g.behavior ?? ""),
      normalizePredicateToken(g.exception ?? ""),
    ],
    rationale:
      "Unless/except prose defines an explicit exception to required behavior and should be queryable as a predicate.",
  },
  {
    pattern:
      /^(?<left>.+?)\s+and\s+(?<right>.+?)\s+(?:must|shall|should)\s+be\s+mutually\s+exclusive\.?$/i,
    name: "mutual_exclusion",
    args: (g) => [normalizeKey(g.left ?? ""), normalizeKey(g.right ?? "")],
    rationale:
      "Mutual-exclusion prose is a relational constraint and should be queryable as a predicate.",
  },
  {
    pattern:
      /^(?<subject>.+?)\s+requires\s+(?<prerequisite>.+?)\s+before\s+(?<dependent>.+?)\.?$/i,
    name: "dependency_rule",
    args: (g) => [
      normalizeKey(g.subject ?? ""),
      normalizePredicateToken(g.prerequisite ?? ""),
      normalizePredicateToken(g.dependent ?? ""),
    ],
    rationale:
      "Requires-before prose defines a prerequisite relationship and should be queryable as a predicate.",
  },
  {
    pattern:
      /^(?<resource>.+?)\s+(?:is|are)\s+owned\s+by\s+(?:the\s+)?(?<owner>.+?)\.?$/i,
    name: "ownership_rule",
    args: (g) => [normalizeKey(g.resource ?? ""), normalizeKey(g.owner ?? "")],
    rationale:
      "Ownership prose assigns responsibility for a resource or behavior and should be queryable as a predicate.",
  },
  {
    pattern:
      /^(?<inputs>.+?)\s+saved\s+in\s+the\s+same\s+(?<slot>.+?)\s+must\s+merge\s+into\s+(?<target>.+?)\s+instead\s+of\s+creating\s+.+?\.?$/i,
    name: "merge_policy",
    args: (g) => [
      normalizePredicateToken(g.inputs ?? ""),
      normalizePredicateToken(g.slot ?? ""),
      normalizePredicateToken(g.target ?? ""),
    ],
    rationale:
      "Same-slot merge prose defines ontology-lite merge behavior and should be queryable as a predicate.",
  },
  {
    pattern:
      /^(?<subject>.+?)\s+(?:must|shall|should)\s+retry\s+up\s+to\s+(?<count>\d+)\s+(?<unit>times|attempts?)\.?$/i,
    name: "retry_policy",
    args: (g) => [
      normalizeKey(g.subject ?? ""),
      g.count ?? "",
      normalizeKey(g.unit ?? ""),
    ],
    rationale:
      "Retry prose defines bounded recovery behavior and should be queryable as a predicate.",
  },
  {
    pattern:
      /^(?<subject>.+?)\s+(?:must|shall|should)\s+escalate\s+to\s+(?<target>.+?)\s+after\s+(?<delay>\d+)\s+(?<unit>[a-z]+)\.?$/i,
    name: "escalation_rule",
    args: (g) => [
      normalizeKey(g.subject ?? ""),
      normalizeKey(g.target ?? ""),
      g.delay ?? "",
      normalizeKey(g.unit ?? ""),
    ],
    rationale:
      "Escalation prose defines delayed handoff behavior and should be queryable as a predicate.",
  },
  {
    pattern:
      /^(?<subject>.+?)\s+availability\s+(?:must|shall|should)\s+be\s+at\s+least\s+(?<threshold>\d+(?:\.\d+)?)\s+(?<unit>percent|%)\s+(?<window>[a-z]+)\.?$/i,
    name: "availability_sla",
    args: (g) => [
      normalizeKey(g.subject ?? ""),
      g.threshold ?? "",
      g.unit === "%" ? "percent" : normalizeKey(g.unit ?? ""),
      normalizeKey(g.window ?? ""),
    ],
    rationale:
      "Availability SLA prose defines a service target over a window and should be queryable as a predicate.",
  },
  {
    pattern:
      /^(?<subject>.+?)\s+(?:must|shall|should)\s+notify\s+(?<recipient>.+?)\s+by\s+(?<channel>[a-z]+)\.?$/i,
    name: "notification_route",
    args: (g) => [
      normalizeKey(g.subject ?? ""),
      normalizeKey(g.recipient ?? ""),
      normalizeKey(g.channel ?? ""),
    ],
    rationale:
      "Notification routing prose defines a recipient and channel and should be queryable as a predicate.",
  },
  {
    pattern:
      /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+idempotent\s+by\s+(?<key>.+?)\.?$/i,
    name: "idempotency_rule",
    args: (g) => [normalizeKey(g.subject ?? ""), normalizeKey(g.key ?? "")],
    rationale:
      "Idempotency prose defines deduplication behavior and should be queryable as a predicate.",
  },
  {
    pattern:
      /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+deduplicated\s+to\s+prevent\s+redundant\s+requests\s+during\s+(?<key>.+?)\.?$/i,
    name: "idempotency_rule",
    args: (g) => [normalizeKey(g.subject ?? ""), normalizeKey(g.key ?? "")],
    rationale:
      "Deduplication prose defines idempotent handling of repeated or concurrent operations and should be queryable as a predicate.",
  },
] as const satisfies readonly PredicateRule[];

export { commaList };
