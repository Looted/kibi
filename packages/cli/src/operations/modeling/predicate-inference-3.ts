import {
  captures,
  inferTrigger,
  normalizePredicateToken,
  normalizeSubjectKey,
  singularize,
  slug,
} from "./predicate-utils.js";

// implements REQ-mcp-suggest-predicates
export function inferScopedAuthorizationRuleArgs(text: string): string[] {
  const scoped = captures(
    text,
    /^(?<actor>.+?)\s+(?:must|shall|should)\s+be\s+denied\s+(?<action>.+?)\.?$/i,
  );
  return [
    slug(scoped.actor ?? "actor"),
    slug(scoped.action ?? "action"),
    "deny",
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferDocumentationStandardRuleArgs(text: string): string[] {
  const docs = captures(
    text,
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+documented\s+in\s+(?<artifact>.+?)\.?$/i,
  );
  return [
    slug(docs.subject ?? "subject"),
    "documented_in",
    slug(docs.artifact ?? "documentation"),
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferWarmupPolicyRuleArgs(text: string): string[] {
  const warmup = captures(
    text,
    /^(?:the\s+)?(?<subject>.+?)\s+(?:must|shall|should)\s+warm\s+up\s+on\s+(?<trigger>.+?)\.?$/i,
  );
  return [slug(warmup.subject ?? "subject"), slug(warmup.trigger ?? "trigger")];
}

// implements REQ-mcp-suggest-predicates
export function inferVisualLayoutRuleArgs(text: string): string[] {
  const layout = captures(
    text,
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+remain\s+visually\s+aligned\s+with\s+(?<target>.+?)\.?$/i,
  );
  return [
    slug(layout.subject ?? "subject"),
    "aligned_with",
    slug(layout.target ?? "target"),
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferEnforcementLocationRuleArgs(text: string): string[] {
  const enforcement = captures(
    text,
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+enforced\s+at\s+(?<location>.+?)\.?$/i,
  );
  return [
    slug(enforcement.subject ?? "subject"),
    slug(enforcement.location ?? "location"),
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferReconciliationRuleArgs(text: string): string[] {
  const reconciliation = captures(
    text,
    /^on\s+(?<trigger>.+?),\s*(?<subject>.+?)\s+(?:must|shall|should)\s+reconcile\s+(?<target>.+?)\s+and\s+(?<action>clear\s+stale\s+.+?)\.?$/i,
  );
  return [
    slug(reconciliation.subject ?? "subject"),
    slug(reconciliation.trigger ?? "trigger"),
    slug(reconciliation.target ?? "target"),
    slug(reconciliation.action ?? "action"),
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferThrottlePolicyRuleArgs(text: string): string[] {
  const throttle = captures(
    text,
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+throttled\s+for\s+(?<condition>.+?)\.?$/i,
  );
  return [
    slug(throttle.subject ?? "subject"),
    normalizePredicateToken(throttle.condition ?? "condition"),
  ];
}

// A lazy word-class capture spans whitespace, and every capture is slugged
// or normalized (which trims it), so one whitespace character before the next
// keyword matches what a run would.

// implements REQ-mcp-suggest-predicates
export function inferDefaultValueArgs(text: string, subject: string): string[] {
  const defaultValue = captures(
    text,
    /^(?:the\s+)?(?<subject>[a-z][a-z\s_-]*?)\sdefaults?\s+to\s+(?<value>[a-z][a-z0-9\s_-]*?)(?:\s(?<property>mode|state|status))?\.?$/i,
  );
  return [
    defaultValue.subject ? normalizeSubjectKey(defaultValue.subject) : subject,
    slug(defaultValue.property ?? "value"),
    slug(defaultValue.value ?? "value"),
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferUniquenessArgs(text: string): string[] {
  const uniqueness = captures(
    text,
    /^(?:there\s+)?(?:must|shall|should)\s+be\s+at\s+most\s+one\s+(?<subject>[a-z][a-z\s_-]*?)\sper\s+(?<scope>.+?)\.?$/i,
  );
  const scope = (uniqueness.scope ?? "scope")
    // normalizePredicateToken drops the spaces left around each "per".
    .split(/\sper\s+/i)
    .filter((part) => part.length > 0)
    .map(normalizePredicateToken)
    .join(",");
  return [slug(uniqueness.subject ?? "subject"), scope];
}

// implements REQ-mcp-suggest-predicates
export function inferStateMembershipArgs(
  text: string,
  subject: string,
): string[] {
  const stateMembership = captures(
    text,
    /^(?<subject>.+?)\s+(?:terminal\s+)?states\s+are\s+(?<states>.+?)\.?$/i,
  );
  const states = (stateMembership.states ?? "state")
    .split(/,|\band\b|\bor\b/i)
    .map((state) => state.trim())
    .filter((state) => state.length > 0)
    .map(normalizePredicateToken)
    .join(",");
  return [
    stateMembership.subject
      ? normalizeSubjectKey(stateMembership.subject)
      : subject,
    states,
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferTemporalOrderArgs(
  text: string,
  subject: string,
): string[] {
  const initializesAfter = captures(
    text,
    /^(?:the\s+)?(?<subject>.+?)\s+initializes\s+after\s+(?:the\s+)?(?<ready>.+?)\s+is\s+ready\.?$/i,
  );
  // Both groups are mandatory and non-empty, so one of them marks a match.
  if (initializesAfter.ready !== undefined) {
    return [
      slug(initializesAfter.subject as string),
      `${slug(initializesAfter.ready)}_ready`,
      "initializes",
    ];
  }

  const temporal = captures(
    text,
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+(?<before>[a-z][a-z\s_-]*?)\sbefore\s+(?<after>.+?)\.?$/i,
  );
  return [
    temporal.subject ? slug(temporal.subject).replace(/_/g, ".") : subject,
    normalizePredicateToken(temporal.before ?? "before_event"),
    normalizePredicateToken(temporal.after ?? "after_event"),
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferConditionalBehaviorArgs(
  text: string,
  subject: string,
): string[] {
  const whenMust = captures(
    text,
    /^when\s+(?<condition>.+?),\s*(?:the\s+)?(?<subject>.+?)\s+(?:must|shall|should)\s+(?<behavior>.+?)\.?$/i,
  );
  // Every group is mandatory and non-empty, so one of them marks a match.
  if (whenMust.condition !== undefined) {
    return [
      slug(whenMust.subject as string),
      normalizePredicateToken(whenMust.condition),
      normalizePredicateToken(whenMust.behavior as string),
    ];
  }

  const conditional = captures(
    text,
    /^if\s+(?:(?:a|an|the)\s+)?(?<conditionSubject>[a-z][a-z_-]*)\s+(?<condition>.+?),\s*(?:it|they|the\s+[a-z][a-z\s_-]*?)\s+(?<behavior>.+?)\.?$/i,
  );
  return [
    conditional.conditionSubject
      ? singularize(slug(conditional.conditionSubject))
      : subject,
    normalizePredicateToken(conditional.condition ?? "condition"),
    normalizePredicateToken(conditional.behavior ?? "behavior"),
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferStateTransitionArgs(
  text: string,
  subject: string,
): string[] {
  const transition = captures(
    text,
    /^when\s+(?<trigger>.+?),\s*(?:the\s+)?(?<subject>[a-z][a-z\s_-]*?)\stransitions?\s+from\s+(?<from>[a-z][a-z0-9_-]*)\s+to\s+(?<to>[a-z][a-z0-9_-]*)\.?$/i,
  );
  return [
    transition.subject ? normalizeSubjectKey(transition.subject) : subject,
    normalizePredicateToken(transition.from ?? "from_state"),
    normalizePredicateToken(transition.to ?? "to_state"),
    normalizePredicateToken(transition.trigger ?? inferTrigger(text)),
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferRateLimitArgs(text: string): string[] {
  const rateLimit = captures(
    text,
    /^(?<subject>.+?)\s+must\s+be\s+rate\s+limited\s+to\s+(?<count>\d+)\s+(?<action>[a-z][a-z\s_-]*?)\sper\s+(?<window>[a-z]+)\.?$/i,
  );
  const subject = rateLimit.subject
    ? slug(rateLimit.subject).replace(/_requests?$/, ".request")
    : "requirement.subject";
  return [
    subject,
    normalizePredicateToken(rateLimit.action ?? "action"),
    normalizePredicateToken(rateLimit.window ?? "window"),
    rateLimit.count ?? "0",
  ];
}
