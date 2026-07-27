import { normalizePredicateToken, slug } from "./predicate-utils.js";

// implements REQ-mcp-suggest-predicates
export function inferConflictResolutionRuleArgs(text: string): string[] {
  const conflict = text.match(
    /^when\s+(?<subject>.+?)\s+conflicts?,\s+(?:the\s+)?(?<strategy>.+?)\.?$/i,
  );
  return [
    slug(conflict?.groups?.subject ?? "subject"),
    normalizePredicateToken(conflict?.groups?.strategy ?? "strategy"),
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferFallbackRuleArgs(text: string): string[] {
  const fallback = text.match(
    /^if\s+(?<condition>.+?),\s+(?<subject>.+?)\s+(?:must|shall|should)\s+fall\s+back\s+to\s+(?<target>.+?)\.?$/i,
  );
  return [
    normalizePredicateToken(fallback?.groups?.condition ?? "condition"),
    slug(fallback?.groups?.subject ?? "subject"),
    normalizePredicateToken(fallback?.groups?.target ?? "fallback"),
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferBatchOperationRuleArgs(text: string): string[] {
  const batch = text.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+process\s+(?<resource>.+?)\s+in\s+batches\s+of\s+(?<size>\d+)\.?$/i,
  );
  return [
    slug(batch?.groups?.subject ?? "subject"),
    slug(batch?.groups?.resource ?? "resource"),
    batch?.groups?.size ?? "0",
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferConsistencyRuleArgs(text: string): string[] {
  const consistency = text.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+reference\s+(?<target>an?\s+existing\s+.+?)\.?$/i,
  );
  return [
    slug(consistency?.groups?.subject ?? "subject"),
    normalizePredicateToken(consistency?.groups?.target ?? "target"),
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferBuildConstraintArgs(text: string): string[] {
  const build = text.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+(?<property>deterministic)\s+at\s+(?<scope>build\s+time)\.?$/i,
  );
  return [
    slug(build?.groups?.subject ?? "subject"),
    normalizePredicateToken(build?.groups?.property ?? "property"),
    normalizePredicateToken(build?.groups?.scope ?? "build_time"),
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferEnvironmentSafetyRuleArgs(text: string): string[] {
  const safety = text.match(
    /^(?<action>.+?)\s+(?:must|shall|should)\s+be\s+(?<decision>forbidden|read-only|allowed)\s+in\s+(?<environment>production|staging|development)\.?$/i,
  );
  return [
    slug(safety?.groups?.action ?? "action"),
    normalizePredicateToken(safety?.groups?.decision ?? "decision"),
    slug(safety?.groups?.environment ?? "environment"),
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferSchemaInvariantRuleArgs(text: string): string[] {
  const invariant = text.match(
    /^(?<field>.+?)\s+(?:must|shall|should)\s+be\s+(?<kind>immutable)\s+after\s+(?<scope>.+?)\.?$/i,
  );
  return [
    slug(invariant?.groups?.field ?? "field"),
    normalizePredicateToken(invariant?.groups?.kind ?? "invariant"),
    normalizePredicateToken(
      invariant?.groups?.scope ? `after ${invariant.groups.scope}` : "scope",
    ),
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferCodingStandardRuleArgs(text: string): string[] {
  const standard = text.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+(?<action>use|avoid)\s+(?<target>.+?)\.?$/i,
  );
  return [
    slug(standard?.groups?.subject ?? "subject"),
    normalizePredicateToken(standard?.groups?.action ?? "action"),
    normalizePredicateToken(standard?.groups?.target ?? "target"),
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferMigrationBoundaryRuleArgs(text: string): string[] {
  const migration = text.match(
    /^(?<subject>.+?)\s+may\s+only\s+be\s+(?<action>read)\s+as\s+(?<scope>migration\s+input)(?:\s+by\s+.+?)?\.?$/i,
  );
  return [
    slug(migration?.groups?.subject ?? "legacy_input"),
    normalizePredicateToken(migration?.groups?.action ?? "action"),
    normalizePredicateToken(migration?.groups?.scope ?? "migration_input"),
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferAbsenceRequirementArgs(text: string): string[] {
  const absence = text.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+(?<state>absent|removed)\.?$/i,
  );
  const declarativeAbsence = text.match(/^no\s+(?<subject>.+?)\.?$/i);
  return [
    normalizePredicateToken(
      absence?.groups?.subject ??
        declarativeAbsence?.groups?.subject ??
        "subject",
    ),
    normalizePredicateToken(absence?.groups?.state ?? "absent"),
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferOfflineBehaviorRuleArgs(text: string): string[] {
  const offline = text.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+(?<behavior>non-blocking|resilient)\s+during\s+(?<condition>offline\s+conditions)\.?$/i,
  );
  return [
    slug(offline?.groups?.subject ?? "subject"),
    normalizePredicateToken(offline?.groups?.behavior ?? "behavior"),
    normalizePredicateToken(offline?.groups?.condition ?? "offline_conditions"),
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferReleaseGateRuleArgs(text: string): string[] {
  const release = text.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+pass\s+(?<gate>.+?)\s+before\s+(?<target>.+?)\.?$/i,
  );
  return [
    slug(release?.groups?.subject ?? "builds"),
    normalizePredicateToken(release?.groups?.gate ?? "gate"),
    slug(release?.groups?.target ?? "target"),
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferPlatformConsistencyRuleArgs(text: string): string[] {
  const platform = text.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+synchronize\s+across\s+(?<platforms>.+?)\.?$/i,
  );
  const platforms = (platform?.groups?.platforms ?? "platform")
    .split(/,|\band\b/i)
    .map((part) => slug(part.trim()))
    .filter((part) => part.length > 0)
    .join(",");
  return [slug(platform?.groups?.subject ?? "subject"), platforms];
}

// implements REQ-mcp-suggest-predicates
export function inferPreservationRuleArgs(text: string): string[] {
  const preservation = text.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+preserve\s+(?<preserved>.+?)\s+when\s+(?:the\s+)?(?<condition>.+?)\.?$/i,
  );
  return [
    slug(preservation?.groups?.subject ?? "subject"),
    slug(preservation?.groups?.preserved ?? "preserved"),
    normalizePredicateToken(preservation?.groups?.condition ?? "condition"),
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferAbstractionBoundaryRuleArgs(text: string): string[] {
  const boundary = text.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+persisted\s+as\s+(?<contract>.+?)\.?$/i,
  );
  return [
    slug(boundary?.groups?.subject ?? "subject"),
    "persisted_as",
    normalizePredicateToken(boundary?.groups?.contract ?? "contract"),
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferSecurityConfigurationRuleArgs(text: string): string[] {
  const config = text.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+have\s+explicit\s+(?<setting>[A-Za-z0-9_.-]+)\s+(?<value>[A-Za-z0-9_.-]+)\.?$/i,
  );
  return [
    slug(config?.groups?.subject ?? "subject"),
    slug(config?.groups?.setting ?? "setting"),
    slug(config?.groups?.value ?? "value"),
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferOrderedStrategyRuleArgs(text: string): string[] {
  const ordered = text.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+use\s+(?<kind>.+?)\s+in\s+priority\s+order\s+(?<values>.+?)\.?$/i,
  );
  const values = (ordered?.groups?.values ?? "")
    .split(/,|>/)
    .map((value) => normalizePredicateToken(value))
    .filter((value) => value.length > 0)
    .join(",");
  return [
    slug(ordered?.groups?.subject ?? "subject"),
    slug(ordered?.groups?.kind ?? "strategy"),
    values || "ordered_values",
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferRefreshPolicyRuleArgs(text: string): string[] {
  const refresh = text.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+automatically\s+refresh\s+(?<target>.+?)\s+without\s+requiring\s+manual\s+page\s+reload\.?$/i,
  );
  return [
    slug(refresh?.groups?.subject ?? "subject"),
    slug(refresh?.groups?.target ?? "target"),
    "automatic",
  ];
}
