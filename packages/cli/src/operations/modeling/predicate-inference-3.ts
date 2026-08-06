import {
  inferTrigger,
  normalizePredicateToken,
  normalizeSubjectKey,
  singularize,
  slug,
} from "./predicate-utils.js";

// implements REQ-mcp-suggest-predicates
export function inferScopedAuthorizationRuleArgs(text: string): string[] {
  const scoped = text.match(
    /^(?<actor>.+?)\s+(?:must|shall|should)\s+be\s+denied\s+(?<action>.+?)\.?$/i,
  );
  return [
    slug(scoped?.groups?.actor ?? "actor"),
    slug(scoped?.groups?.action ?? "action"),
    "deny",
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferDocumentationStandardRuleArgs(text: string): string[] {
  const docs = text.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+documented\s+in\s+(?<artifact>.+?)\.?$/i,
  );
  return [
    slug(docs?.groups?.subject ?? "subject"),
    "documented_in",
    slug(docs?.groups?.artifact ?? "documentation"),
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferWarmupPolicyRuleArgs(text: string): string[] {
  const warmup = text.match(
    /^(?:the\s+)?(?<subject>.+?)\s+(?:must|shall|should)\s+warm\s+up\s+on\s+(?<trigger>.+?)\.?$/i,
  );
  return [
    slug(warmup?.groups?.subject ?? "subject"),
    slug(warmup?.groups?.trigger ?? "trigger"),
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferVisualLayoutRuleArgs(text: string): string[] {
  const layout = text.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+remain\s+visually\s+aligned\s+with\s+(?<target>.+?)\.?$/i,
  );
  return [
    slug(layout?.groups?.subject ?? "subject"),
    "aligned_with",
    slug(layout?.groups?.target ?? "target"),
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferEnforcementLocationRuleArgs(text: string): string[] {
  const enforcement = text.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+enforced\s+at\s+(?<location>.+?)\.?$/i,
  );
  return [
    slug(enforcement?.groups?.subject ?? "subject"),
    slug(enforcement?.groups?.location ?? "location"),
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferReconciliationRuleArgs(text: string): string[] {
  const reconciliation = text.match(
    /^on\s+(?<trigger>.+?),\s*(?<subject>.+?)\s+(?:must|shall|should)\s+reconcile\s+(?<target>.+?)\s+and\s+(?<action>clear\s+stale\s+.+?)\.?$/i,
  );
  return [
    slug(reconciliation?.groups?.subject ?? "subject"),
    slug(reconciliation?.groups?.trigger ?? "trigger"),
    slug(reconciliation?.groups?.target ?? "target"),
    slug(reconciliation?.groups?.action ?? "action"),
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferThrottlePolicyRuleArgs(text: string): string[] {
  const throttle = text.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+throttled\s+for\s+(?<condition>.+?)\.?$/i,
  );
  return [
    slug(throttle?.groups?.subject ?? "subject"),
    normalizePredicateToken(throttle?.groups?.condition ?? "condition"),
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferDefaultValueArgs(text: string, subject: string): string[] {
  const defaultValue = text.match(
    /^(?:the\s+)?(?<subject>[a-z][a-z\s_-]*?)\s+defaults?\s+to\s+(?<value>[a-z][a-z0-9\s_-]*?)(?:\s+(?<property>mode|state|status))?\.?$/i,
  );
  return [
    defaultValue?.groups?.subject
      ? normalizeSubjectKey(defaultValue.groups.subject)
      : subject,
    slug(defaultValue?.groups?.property ?? "value"),
    slug(defaultValue?.groups?.value ?? "value"),
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferUniquenessArgs(text: string): string[] {
  const uniqueness = text.match(
    /^(?:there\s+)?(?:must|shall|should)\s+be\s+at\s+most\s+one\s+(?<subject>[a-z][a-z\s_-]*?)\s+per\s+(?<scope>.+?)\.?$/i,
  );
  const scope = (uniqueness?.groups?.scope ?? "scope")
    .split(/\s+per\s+/i)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map(normalizePredicateToken)
    .join(",");
  return [slug(uniqueness?.groups?.subject ?? "subject"), scope];
}

// implements REQ-mcp-suggest-predicates
export function inferStateMembershipArgs(
  text: string,
  subject: string,
): string[] {
  const stateMembership = text.match(
    /^(?<subject>.+?)\s+(?:terminal\s+)?states\s+are\s+(?<states>.+?)\.?$/i,
  );
  const states = (stateMembership?.groups?.states ?? "state")
    .split(/,|\band\b|\bor\b/i)
    .map((state) => state.trim())
    .filter((state) => state.length > 0)
    .map(normalizePredicateToken)
    .join(",");
  return [
    stateMembership?.groups?.subject
      ? normalizeSubjectKey(stateMembership.groups.subject)
      : subject,
    states,
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferTemporalOrderArgs(
  text: string,
  subject: string,
): string[] {
  const initializesAfter = text.match(
    /^(?:the\s+)?(?<subject>.+?)\s+initializes\s+after\s+(?:the\s+)?(?<ready>.+?)\s+is\s+ready\.?$/i,
  );
  if (initializesAfter?.groups?.subject && initializesAfter.groups.ready) {
    return [
      slug(initializesAfter.groups.subject),
      `${slug(initializesAfter.groups.ready)}_ready`,
      "initializes",
    ];
  }

  const temporal = text.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+(?<before>[a-z][a-z\s_-]*?)\s+before\s+(?<after>.+?)\.?$/i,
  );
  return [
    temporal?.groups?.subject
      ? slug(temporal.groups.subject).replace(/_/g, ".")
      : subject,
    normalizePredicateToken(temporal?.groups?.before ?? "before_event"),
    normalizePredicateToken(temporal?.groups?.after ?? "after_event"),
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferConditionalBehaviorArgs(
  text: string,
  subject: string,
): string[] {
  const whenMust = text.match(
    /^when\s+(?<condition>.+?),\s*(?:the\s+)?(?<subject>.+?)\s+(?:must|shall|should)\s+(?<behavior>.+?)\.?$/i,
  );
  if (whenMust?.groups?.condition && whenMust.groups.subject) {
    return [
      slug(whenMust.groups.subject),
      normalizePredicateToken(whenMust.groups.condition),
      normalizePredicateToken(whenMust.groups.behavior ?? "behavior"),
    ];
  }

  const conditional = text.match(
    /^if\s+(?:(?:a|an|the)\s+)?(?<conditionSubject>[a-z][a-z_-]*)\s+(?<condition>.+?),\s*(?:it|they|the\s+[a-z][a-z\s_-]*?)\s+(?<behavior>.+?)\.?$/i,
  );
  return [
    conditional?.groups?.conditionSubject
      ? singularize(slug(conditional.groups.conditionSubject))
      : subject,
    normalizePredicateToken(conditional?.groups?.condition ?? "condition"),
    normalizePredicateToken(conditional?.groups?.behavior ?? "behavior"),
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferStateTransitionArgs(
  text: string,
  subject: string,
): string[] {
  const transition = text.match(
    /^when\s+(?<trigger>.+?),\s*(?:the\s+)?(?<subject>[a-z][a-z\s_-]*?)\s+transitions?\s+from\s+(?<from>[a-z][a-z0-9_-]*)\s+to\s+(?<to>[a-z][a-z0-9_-]*)\.?$/i,
  );
  return [
    transition?.groups?.subject
      ? normalizeSubjectKey(transition.groups.subject)
      : subject,
    normalizePredicateToken(transition?.groups?.from ?? "from_state"),
    normalizePredicateToken(transition?.groups?.to ?? "to_state"),
    normalizePredicateToken(transition?.groups?.trigger ?? inferTrigger(text)),
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferRateLimitArgs(text: string): string[] {
  const rateLimit = text.match(
    /^(?<subject>.+?)\s+must\s+be\s+rate\s+limited\s+to\s+(?<count>\d+)\s+(?<action>[a-z][a-z\s_-]*?)\s+per\s+(?<window>[a-z]+)\.?$/i,
  );
  const subject = rateLimit?.groups?.subject
    ? slug(rateLimit.groups.subject).replace(/_requests?$/, ".request")
    : "requirement.subject";
  return [
    subject,
    normalizePredicateToken(rateLimit?.groups?.action ?? "action"),
    normalizePredicateToken(rateLimit?.groups?.window ?? "window"),
    rateLimit?.groups?.count ?? "0",
  ];
}
