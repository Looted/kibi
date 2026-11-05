import { captures, normalizePredicateToken, slug } from "./predicate-utils.js";

// implements REQ-mcp-suggest-predicates
export function inferConflictResolutionRuleArgs(text: string): string[] {
  const conflict = captures(
    text,
    /^when\s+(?<subject>.+?)\s+conflicts?,\s+(?:the\s+)?(?<strategy>.+?)\.?$/i,
  );
  return [
    slug(conflict.subject ?? "subject"),
    normalizePredicateToken(conflict.strategy ?? "strategy"),
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferFallbackRuleArgs(text: string): string[] {
  const fallback = captures(
    text,
    /^if\s+(?<condition>.+?),\s+(?<subject>.+?)\s+(?:must|shall|should)\s+fall\s+back\s+to\s+(?<target>.+?)\.?$/i,
  );
  return [
    normalizePredicateToken(fallback.condition ?? "condition"),
    slug(fallback.subject ?? "subject"),
    normalizePredicateToken(fallback.target ?? "fallback"),
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferBatchOperationRuleArgs(text: string): string[] {
  const batch = captures(
    text,
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+process\s+(?<resource>.+?)\s+in\s+batches\s+of\s+(?<size>\d+)\.?$/i,
  );
  return [
    slug(batch.subject ?? "subject"),
    slug(batch.resource ?? "resource"),
    batch.size ?? "0",
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferConsistencyRuleArgs(text: string): string[] {
  const consistency = captures(
    text,
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+reference\s+(?<target>an?\s+existing\s+.+?)\.?$/i,
  );
  return [
    slug(consistency.subject ?? "subject"),
    normalizePredicateToken(consistency.target ?? "target"),
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferBuildConstraintArgs(text: string): string[] {
  const build = captures(
    text,
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+(?<property>deterministic)\s+at\s+(?<scope>build\s+time)\.?$/i,
  );
  return [
    slug(build.subject ?? "subject"),
    normalizePredicateToken(build.property ?? "property"),
    normalizePredicateToken(build.scope ?? "build_time"),
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferEnvironmentSafetyRuleArgs(text: string): string[] {
  const safety = captures(
    text,
    /^(?<action>.+?)\s+(?:must|shall|should)\s+be\s+(?<decision>forbidden|read-only|allowed)\s+in\s+(?<environment>production|staging|development)\.?$/i,
  );
  return [
    slug(safety.action ?? "action"),
    normalizePredicateToken(safety.decision ?? "decision"),
    slug(safety.environment ?? "environment"),
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferSchemaInvariantRuleArgs(text: string): string[] {
  const invariant = captures(
    text,
    /^(?<field>.+?)\s+(?:must|shall|should)\s+be\s+(?<kind>immutable)\s+after\s+(?<scope>.+?)\.?$/i,
  );
  return [
    slug(invariant.field ?? "field"),
    normalizePredicateToken(invariant.kind ?? "invariant"),
    normalizePredicateToken(
      invariant.scope ? `after ${invariant.scope}` : "scope",
    ),
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferCodingStandardRuleArgs(text: string): string[] {
  const standard = captures(
    text,
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+(?<action>use|avoid)\s+(?<target>.+?)\.?$/i,
  );
  return [
    slug(standard.subject ?? "subject"),
    normalizePredicateToken(standard.action ?? "action"),
    normalizePredicateToken(standard.target ?? "target"),
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferMigrationBoundaryRuleArgs(text: string): string[] {
  const migration = captures(
    text,
    /^(?<subject>.+?)\s+may\s+only\s+be\s+(?<action>read)\s+as\s+(?<scope>migration\s+input)(?:\s+by\s+.+?)?\.?$/i,
  );
  return [
    slug(migration.subject ?? "legacy_input"),
    normalizePredicateToken(migration.action ?? "action"),
    normalizePredicateToken(migration.scope ?? "migration_input"),
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferAbsenceRequirementArgs(text: string): string[] {
  const absence = captures(
    text,
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+(?<state>absent|removed)\.?$/i,
  );
  const declarativeAbsence = captures(text, /^no\s+(?<subject>.+?)\.?$/i);
  return [
    normalizePredicateToken(
      absence.subject ?? declarativeAbsence.subject ?? "subject",
    ),
    normalizePredicateToken(absence.state ?? "absent"),
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferOfflineBehaviorRuleArgs(text: string): string[] {
  const offline = captures(
    text,
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+(?<behavior>non-blocking|resilient)\s+during\s+(?<condition>offline\s+conditions)\.?$/i,
  );
  return [
    slug(offline.subject ?? "subject"),
    normalizePredicateToken(offline.behavior ?? "behavior"),
    normalizePredicateToken(offline.condition ?? "offline_conditions"),
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferReleaseGateRuleArgs(text: string): string[] {
  const release = captures(
    text,
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+pass\s+(?<gate>.+?)\s+before\s+(?<target>.+?)\.?$/i,
  );
  return [
    slug(release.subject ?? "builds"),
    normalizePredicateToken(release.gate ?? "gate"),
    slug(release.target ?? "target"),
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferPlatformConsistencyRuleArgs(text: string): string[] {
  const platform = captures(
    text,
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+synchronize\s+across\s+(?<platforms>.+?)\.?$/i,
  );
  const platforms = (platform.platforms ?? "platform")
    // slug drops the spaces around each comma or "and".
    .split(/,|\band\b/i)
    .map((part) => slug(part))
    .filter((part) => part.length > 0)
    .join(",");
  return [slug(platform.subject ?? "subject"), platforms];
}

// implements REQ-mcp-suggest-predicates
export function inferPreservationRuleArgs(text: string): string[] {
  const preservation = captures(
    text,
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+preserve\s+(?<preserved>.+?)\s+when\s+(?:the\s+)?(?<condition>.+?)\.?$/i,
  );
  return [
    slug(preservation.subject ?? "subject"),
    slug(preservation.preserved ?? "preserved"),
    normalizePredicateToken(preservation.condition ?? "condition"),
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferAbstractionBoundaryRuleArgs(text: string): string[] {
  const boundary = captures(
    text,
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+persisted\s+as\s+(?<contract>.+?)\.?$/i,
  );
  return [
    slug(boundary.subject ?? "subject"),
    "persisted_as",
    normalizePredicateToken(boundary.contract ?? "contract"),
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferSecurityConfigurationRuleArgs(text: string): string[] {
  const config = captures(
    text,
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+have\s+explicit\s+(?<setting>[A-Za-z0-9_.-]+)\s+(?<value>[A-Za-z0-9_.-]+)\.?$/i,
  );
  return [
    slug(config.subject ?? "subject"),
    slug(config.setting ?? "setting"),
    slug(config.value ?? "value"),
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferOrderedStrategyRuleArgs(text: string): string[] {
  const ordered = captures(
    text,
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+use\s+(?<kind>.+?)\s+in\s+priority\s+order\s+(?<values>.+?)\.?$/i,
  );
  const values = (ordered.values ?? "")
    .split(/,|>/)
    .map((value) => normalizePredicateToken(value))
    .filter((value) => value.length > 0)
    .join(",");
  return [
    slug(ordered.subject ?? "subject"),
    slug(ordered.kind ?? "strategy"),
    values || "ordered_values",
  ];
}

// implements REQ-mcp-suggest-predicates
export function inferRefreshPolicyRuleArgs(text: string): string[] {
  const refresh = captures(
    text,
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+automatically\s+refresh\s+(?<target>.+?)\s+without\s+requiring\s+manual\s+page\s+reload\.?$/i,
  );
  return [
    slug(refresh.subject ?? "subject"),
    slug(refresh.target ?? "target"),
    "automatic",
  ];
}
