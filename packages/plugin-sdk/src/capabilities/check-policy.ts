/**
 * kibi.check-policy.v1 — declarative check policy a plugin hands to Kibi.
 *
 * A check policy is data, never code. Kibi reads the policy document from the
 * plugin package's files (the `kibi.checkPolicy` path in its package.json) and
 * evaluates it with its own deterministic rules, so `kb_check` never imports
 * plugin code. The `checkPolicy` capability on the exported plugin carries the
 * same document for SDK validation and tooling.
 */

// implements REQ-capability-check-policy
export const CHECK_POLICY_CONTRACT_VERSION = "kibi.check-policy.v1" as const;

/**
 * Symbols in matching files must implement a current requirement that is
 * grounded (via `requires_predicate`) in one of `requirePredicates`.
 */
// implements REQ-capability-check-policy
export interface CheckPolicyOwnershipRule {
  readonly id: string;
  readonly description: string;
  /** Workspace-relative glob patterns a symbol's sourceFile must match. */
  readonly include: readonly string[];
  /** Glob patterns that take a matching file back out of scope. */
  readonly exclude?: readonly string[];
  /**
   * Optional regular expression a symbol title must match, so only the
   * declarations the rule is about (components, not their helpers) count.
   */
  readonly symbolTitlePattern?: string;
  /** Predicate names that qualify an owning requirement. */
  readonly requirePredicates: readonly string[];
  /** A symbol carrying this tag is intentionally outside the rule. */
  readonly exemptTag?: string;
}

/**
 * Files implementing a requirement grounded in `patternPredicate` must still
 * contain the markers that `markerPredicate` facts declare for that pattern.
 */
// implements REQ-capability-check-policy
export interface CheckPolicyMarkerRule {
  readonly id: string;
  readonly description: string;
  readonly patternPredicate: string;
  /** Zero-based argument of the pattern predicate naming the pattern. */
  readonly patternArgument: number;
  readonly markerPredicate: string;
  /** Zero-based argument of the marker predicate naming the pattern. */
  readonly markerPatternArgument: number;
  /** Zero-based argument of the marker predicate naming the marker text. */
  readonly markerArgument: number;
  /**
   * Extensions of sibling files searched with the symbol's own file, sharing
   * its stem (`list.component.ts` -> `list.component.html`).
   */
  readonly siblingExtensions?: readonly string[];
}

// implements REQ-capability-check-policy
export interface CheckPolicyDocument {
  readonly contractVersion: typeof CHECK_POLICY_CONTRACT_VERSION;
  readonly id: string;
  readonly title: string;
  readonly ownership?: readonly CheckPolicyOwnershipRule[];
  readonly markers?: readonly CheckPolicyMarkerRule[];
}

// implements REQ-capability-check-policy
export interface CheckPolicyV1 {
  readonly id: string;
  readonly document: CheckPolicyDocument;
}
