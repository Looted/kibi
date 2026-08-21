import {
  normalizePredicateToken,
  normalizeSubjectKey,
  singularize,
  slug,
} from "./predicate-utils.js";

// implements REQ-mcp-suggest-predicates
export function inferPermissionRuleArgs(text: string): string[] {
  const prohibition = text.match(
    /^(?<actor>[a-z][a-z\s_-]*?)\s+(?:must\s+not|cannot|can't|is\s+forbidden\s+to)\s+(?<action>[a-z][a-z_-]*)\s+(?<resource>.+?)\.?$/i,
  );
  if (prohibition?.groups) {
    return [
      singularize(slug(prohibition.groups.actor ?? "actor")),
      normalizePredicateToken(prohibition.groups.action ?? "action"),
      normalizePredicateToken(prohibition.groups.resource ?? "resource"),
      "deny",
    ];
  }

  const permission = text.match(
    /^(?:only\s+)?(?<actor>[a-z][a-z\s_-]*?)\s+(?:may|can|is\s+allowed\s+to)\s+(?<action>[a-z][a-z_-]*)\s+(?<resource>.+?)(?:\s+when\s+.+)?\.?$/i,
  );
  return [
    singularize(slug(permission?.groups?.actor ?? "actor")),
    normalizePredicateToken(permission?.groups?.action ?? "action"),
    normalizePredicateToken(permission?.groups?.resource ?? "resource"),
    "assert",
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferGuardArgs(text: string, subject: string): string[] {
  const disabledUntil = text.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)?\s*(?:stay|remain)?\s*disabled\s+until\s+(?<condition>.+?)\.?$/i,
  );
  if (disabledUntil?.groups?.subject && disabledUntil.groups.condition) {
    return [
      slug(disabledUntil.groups.subject),
      normalizePredicateToken(disabledUntil.groups.condition),
      "disabled",
    ];
  }

  const lower = text.toLowerCase();
  return [
    subject,
    lower.includes("readonly") ? "isReadOnly" : "condition",
    "true",
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferExceptionRuleArgs(
  text: string,
  subject: string,
): string[] {
  const exception = text.match(
    /^(?:the\s+)?(?<subject>[a-z][a-z\s_-]*?)\s+(?:must|shall|should)\s+(?<behavior>.+?)\s+unless\s+(?:the\s+)?(?<exception>.+?)\.?$/i,
  );
  const broadException = text.match(
    /^(?:the\s+)?(?<subject>.+?)\s+(?:is|are|remains?|constitutes?)\s+(?:the\s+)?(?:only\s+)?exception(?:\s+to\s+(?<behavior>.+?))?\.?$/i,
  );
  if (broadException?.groups?.subject) {
    return [
      normalizeSubjectKey(broadException.groups.subject),
      normalizePredicateToken(
        broadException.groups.behavior ?? "normal_behavior",
      ),
      "exception",
    ];
  }
  return [
    exception?.groups?.subject
      ? normalizeSubjectKey(exception.groups.subject)
      : subject,
    normalizePredicateToken(exception?.groups?.behavior ?? "behavior"),
    normalizePredicateToken(exception?.groups?.exception ?? "exception"),
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferMutualExclusionArgs(text: string): string[] {
  const exclusion = text.match(
    /^(?<left>.+?)\s+and\s+(?<right>.+?)\s+(?:must|shall|should)\s+be\s+mutually\s+exclusive\.?$/i,
  );
  return [
    slug(exclusion?.groups?.left ?? "left"),
    slug(exclusion?.groups?.right ?? "right"),
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferDependencyRuleArgs(text: string): string[] {
  const dependency = text.match(
    /^(?<subject>.+?)\s+requires\s+(?<prerequisite>.+?)\s+before\s+(?<dependent>.+?)\.?$/i,
  );
  return [
    slug(dependency?.groups?.subject ?? "subject"),
    normalizePredicateToken(dependency?.groups?.prerequisite ?? "prerequisite"),
    normalizePredicateToken(dependency?.groups?.dependent ?? "dependent"),
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferOwnershipRuleArgs(text: string): string[] {
  const ownership = text.match(
    /^(?<resource>.+?)\s+(?:is|are)\s+owned\s+by\s+(?:the\s+)?(?<owner>.+?)\.?$/i,
  );
  return [
    slug(ownership?.groups?.resource ?? "resource"),
    slug(ownership?.groups?.owner ?? "owner"),
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferRetryPolicyArgs(text: string): string[] {
  const retry = text.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+retry\s+up\s+to\s+(?<count>\d+)\s+(?<unit>times|attempts?)\.?$/i,
  );
  return [
    slug(retry?.groups?.subject ?? "subject"),
    retry?.groups?.count ?? "0",
    slug(retry?.groups?.unit ?? "times"),
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferEscalationRuleArgs(text: string): string[] {
  const escalation = text.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+escalate\s+to\s+(?<target>.+?)\s+after\s+(?<delay>\d+)\s+(?<unit>[a-z]+)\.?$/i,
  );
  return [
    slug(escalation?.groups?.subject ?? "subject"),
    slug(escalation?.groups?.target ?? "target"),
    escalation?.groups?.delay ?? "0",
    slug(escalation?.groups?.unit ?? "unit"),
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferAvailabilitySlaArgs(text: string): string[] {
  const availability = text.match(
    /^(?<subject>.+?)\s+availability\s+(?:must|shall|should)\s+be\s+at\s+least\s+(?<threshold>\d+(?:\.\d+)?)\s+(?<unit>percent|%)\s+(?<window>[a-z]+)\.?$/i,
  );
  return [
    slug(availability?.groups?.subject ?? "subject"),
    availability?.groups?.threshold ?? "0",
    availability?.groups?.unit === "%"
      ? "percent"
      : slug(availability?.groups?.unit ?? "percent"),
    slug(availability?.groups?.window ?? "window"),
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferNotificationRouteArgs(text: string): string[] {
  const notification = text.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+notify\s+(?<recipient>.+?)\s+by\s+(?<channel>[a-z]+)\.?$/i,
  );
  return [
    slug(notification?.groups?.subject ?? "subject"),
    slug(notification?.groups?.recipient ?? "recipient"),
    slug(notification?.groups?.channel ?? "channel"),
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferIdempotencyRuleArgs(text: string): string[] {
  const idempotency = text.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+idempotent\s+by\s+(?<key>.+?)\.?$/i,
  );
  const deduplicated = text.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+deduplicated\s+to\s+prevent\s+redundant\s+requests\s+during\s+(?<key>.+?)\.?$/i,
  );
  return [
    slug(
      idempotency?.groups?.subject ??
        deduplicated?.groups?.subject ??
        "subject",
    ),
    slug(
      idempotency?.groups?.key ??
        deduplicated?.groups?.key ??
        "idempotency_key",
    ),
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferDataResidencyRuleArgs(text: string): string[] {
  const residency = text.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+(?:stored|processed|kept)\s+in\s+(?:the\s+)?(?<region>.+?\b(?:region|jurisdiction|country|zone|area))\.?$/i,
  );
  return [
    slug(residency?.groups?.subject ?? "data"),
    slug(residency?.groups?.region ?? "region"),
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferAuditEventRuleArgs(text: string): string[] {
  const audit = text.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+(?:recorded|logged|audited)\s+in\s+(?:the\s+)?(?<log>audit\s+(?:log|trail))\.?$/i,
  );
  return [
    slug(audit?.groups?.subject ?? "subject"),
    slug(audit?.groups?.log ?? "audit_log"),
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferConsentRuleArgs(text: string): string[] {
  const consent = text.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+require\s+(?<consent>.+?consent)\s+before\s+(?<purpose>.+?)\.?$/i,
  );
  return [
    slug(consent?.groups?.subject ?? "subject"),
    slug(consent?.groups?.consent ?? "consent"),
    normalizePredicateToken(consent?.groups?.purpose ?? "purpose"),
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferLifecycleRuleArgs(text: string): string[] {
  const lifecycle = text.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+(?<action>archived|deleted|expired)\s+after\s+(?<duration>\d+)\s+(?<unit>[a-z]+)\.?$/i,
  );
  return [
    slug(lifecycle?.groups?.subject ?? "subject"),
    slug(lifecycle?.groups?.action ?? "action"),
    lifecycle?.groups?.duration ?? "0",
    slug(lifecycle?.groups?.unit ?? "unit"),
  ];
}
