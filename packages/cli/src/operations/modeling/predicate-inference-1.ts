import {
  captures,
  normalizePredicateToken,
  normalizeSubjectKey,
  singularize,
  slug,
} from "./predicate-utils.js";

// Determiners that open an actor or resource phrase ("an admin", "any
// analysis request", "their own reports") name no participant themselves.
const LEADING_DETERMINER =
  /^(?:(?:a|an|the|any|all|every|each|only|its|own|their|his|her)\s+)+/i;

function permissionActor(value: string): string {
  return singularize(slug(value.replace(LEADING_DETERMINER, "")) || "actor");
}

// A resource is one noun phrase in its singular form so "analysis requests"
// and "any analysis request" bind the same permission_rule argument.
function permissionResource(value: string): string {
  // The resource capture never spans a line, and normalization trims the
  // edges, so one whitespace character on each side of the cue is enough.
  const token = normalizePredicateToken(
    value
      .replace(LEADING_DETERMINER, "")
      .replace(/\s(?:when|if|unless)\s.+/i, ""),
  );
  if (token.length === 0) return "resource";
  const parts = token.split("_");
  const last = parts.length - 1;
  parts[last] = singularize(parts[last] as string);
  return parts.join("_");
}

export function inferPermissionRuleArgs(text: string): string[] {
  const prohibition = captures(
    text,
    /^(?<actor>[a-z][a-z\s_-]*?)\s(?:(?:must|shall|should)\s+not\s+be\s+able\s+to|must\s+not|must\s+never|never|cannot|can't|is\s+forbidden\s+to|(?:is|are)\s+not\s+(?:allowed|permitted|entitled|able)\s+to|ha(?:s|ve)\s+no\s+permission\s+to)\s+(?<action>[a-z][a-z_-]*)\s+(?<resource>.+?)\.?$/i,
  );
  // Every group of the prohibition pattern is mandatory, so a match binds all three.
  if (prohibition.action !== undefined) {
    return [
      permissionActor(prohibition.actor as string),
      normalizePredicateToken(prohibition.action),
      permissionResource(prohibition.resource as string),
      "deny",
    ];
  }

  // Grants: "may", "can", "is allowed/permitted/entitled/able to", "must be
  // able to" and "has permission to" all bind the same allow rule. A leading
  // "only" is a determiner that permissionActor drops, and a whitespace run
  // before the modal falls inside the actor class and is trimmed by slug.
  const permission = captures(
    text,
    /^(?<actor>[a-z][a-z\s_-]*?)\s(?:may|can|(?:is|are)\s+(?:allowed|permitted|entitled|able)\s+to|(?:must|shall|should)\s+be\s+able\s+to|ha(?:s|ve)\s+permission\s+to)\s+(?<action>[a-z][a-z_-]*)\s+(?<resource>.+?)(?:\s+when\s+.+)?\.?$/i,
  );
  return [
    permission.actor ? permissionActor(permission.actor) : "actor",
    normalizePredicateToken(permission.action ?? "action"),
    permission.resource ? permissionResource(permission.resource) : "resource",
    "assert",
  ];
}

export function inferGuardArgs(text: string, subject: string): string[] {
  const disabledUntil = captures(
    text,
    /^(?<subject>.+?)\s+(?:must|shall|should)?\s*(?:stay|remain)?\s*disabled\s+until\s+(?<condition>.+?)\.?$/i,
  );
  // Both groups are mandatory and non-empty, so one of them marks a match.
  if (disabledUntil.condition !== undefined) {
    return [
      slug(disabledUntil.subject as string),
      normalizePredicateToken(disabledUntil.condition),
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

export function inferExceptionRuleArgs(
  text: string,
  subject: string,
): string[] {
  const exception = captures(
    text,
    /^(?:the\s+)?(?<subject>[a-z][a-z\s_-]*?)\s(?:must|shall|should)\s+(?<behavior>.+?)\s+unless\s+(?:the\s+)?(?<exception>.+?)\.?$/i,
  );
  const broadException = captures(
    text,
    /^(?:the\s+)?(?<subject>.+?)\s+(?:is|are|remains?|constitutes?)\s+(?:the\s+)?(?:only\s+)?exception(?:\s+to\s+(?<behavior>.+?))?\.?$/i,
  );
  if (broadException.subject) {
    return [
      normalizeSubjectKey(broadException.subject),
      normalizePredicateToken(broadException.behavior ?? "normal_behavior"),
      "exception",
    ];
  }
  return [
    exception.subject ? normalizeSubjectKey(exception.subject) : subject,
    normalizePredicateToken(exception.behavior ?? "behavior"),
    normalizePredicateToken(exception.exception ?? "exception"),
  ];
}

export function inferMutualExclusionArgs(text: string): string[] {
  const exclusion = captures(
    text,
    /^(?<left>.+?)\s+and\s+(?<right>.+?)\s+(?:must|shall|should)\s+be\s+mutually\s+exclusive\.?$/i,
  );
  return [slug(exclusion.left ?? "left"), slug(exclusion.right ?? "right")];
}

export function inferDependencyRuleArgs(text: string): string[] {
  const dependency = captures(
    text,
    /^(?<subject>.+?)\s+requires\s+(?<prerequisite>.+?)\s+before\s+(?<dependent>.+?)\.?$/i,
  );
  return [
    slug(dependency.subject ?? "subject"),
    normalizePredicateToken(dependency.prerequisite ?? "prerequisite"),
    normalizePredicateToken(dependency.dependent ?? "dependent"),
  ];
}

export function inferOwnershipRuleArgs(text: string): string[] {
  const ownership = captures(
    text,
    /^(?<resource>.+?)\s+(?:is|are)\s+owned\s+by\s+(?:the\s+)?(?<owner>.+?)\.?$/i,
  );
  return [
    slug(ownership.resource ?? "resource"),
    slug(ownership.owner ?? "owner"),
  ];
}

export function inferRetryPolicyArgs(text: string): string[] {
  const retry = captures(
    text,
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+retry\s+up\s+to\s+(?<count>\d+)\s+(?<unit>times|attempts?)\.?$/i,
  );
  return [
    slug(retry.subject ?? "subject"),
    retry.count ?? "0",
    slug(retry.unit ?? "times"),
  ];
}

export function inferEscalationRuleArgs(text: string): string[] {
  const escalation = captures(
    text,
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+escalate\s+to\s+(?<target>.+?)\s+after\s+(?<delay>\d+)\s+(?<unit>[a-z]+)\.?$/i,
  );
  return [
    slug(escalation.subject ?? "subject"),
    slug(escalation.target ?? "target"),
    escalation.delay ?? "0",
    slug(escalation.unit ?? "unit"),
  ];
}

export function inferAvailabilitySlaArgs(text: string): string[] {
  const availability = captures(
    text,
    /^(?<subject>.+?)\s+availability\s+(?:must|shall|should)\s+be\s+at\s+least\s+(?<threshold>\d+(?:\.\d+)?)\s+(?<unit>percent|%)\s+(?<window>[a-z]+)\.?$/i,
  );
  return [
    slug(availability.subject ?? "subject"),
    availability.threshold ?? "0",
    // The unit group admits only "percent" (any case) and "%".
    "percent",
    slug(availability.window ?? "window"),
  ];
}

export function inferNotificationRouteArgs(text: string): string[] {
  const notification = captures(
    text,
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+notify\s+(?<recipient>.+?)\s+by\s+(?<channel>[a-z]+)\.?$/i,
  );
  return [
    slug(notification.subject ?? "subject"),
    slug(notification.recipient ?? "recipient"),
    slug(notification.channel ?? "channel"),
  ];
}

export function inferIdempotencyRuleArgs(text: string): string[] {
  const idempotency = captures(
    text,
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+idempotent\s+by\s+(?<key>.+?)\.?$/i,
  );
  const deduplicated = captures(
    text,
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+deduplicated\s+to\s+prevent\s+redundant\s+requests\s+during\s+(?<key>.+?)\.?$/i,
  );
  return [
    slug(idempotency.subject ?? deduplicated.subject ?? "subject"),
    slug(idempotency.key ?? deduplicated.key ?? "idempotency_key"),
  ];
}

export function inferDataResidencyRuleArgs(text: string): string[] {
  const residency = captures(
    text,
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+(?:stored|processed|kept)\s+in\s+(?:the\s+)?(?<region>.+?\b(?:region|jurisdiction|country|zone|area))\.?$/i,
  );
  return [
    slug(residency.subject ?? "data"),
    slug(residency.region ?? "region"),
  ];
}

export function inferAuditEventRuleArgs(text: string): string[] {
  const audit = captures(
    text,
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+(?:recorded|logged|audited)\s+in\s+(?:the\s+)?(?<log>audit\s+(?:log|trail))\.?$/i,
  );
  return [slug(audit.subject ?? "subject"), slug(audit.log ?? "audit_log")];
}

export function inferConsentRuleArgs(text: string): string[] {
  const consent = captures(
    text,
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+require\s+(?<consent>.+?consent)\s+before\s+(?<purpose>.+?)\.?$/i,
  );
  return [
    slug(consent.subject ?? "subject"),
    slug(consent.consent ?? "consent"),
    normalizePredicateToken(consent.purpose ?? "purpose"),
  ];
}

export function inferLifecycleRuleArgs(text: string): string[] {
  const lifecycle = captures(
    text,
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+(?<action>archived|deleted|expired)\s+after\s+(?<duration>\d+)\s+(?<unit>[a-z]+)\.?$/i,
  );
  return [
    slug(lifecycle.subject ?? "subject"),
    slug(lifecycle.action ?? "action"),
    lifecycle.duration ?? "0",
    slug(lifecycle.unit ?? "unit"),
  ];
}
