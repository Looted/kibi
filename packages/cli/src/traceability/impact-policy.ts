import type { GitChangeSnapshot } from "./git-change-snapshot.js";
import { blobBytes, treeEntry } from "./impact-git-tree.js";
import {
  type Fingerprint,
  IMPACT_POLICY_PATH,
  type ImpactPolicy,
  type SideEvidence,
  fingerprint,
  parseImpactPolicy,
} from "./impact-review.js";

/** Trusted base impact policy loading and partial-analysis allowances. */
// implements REQ-impact-policy-stage-e-content-bound-review
export function approvedPartialClass(
  policy: ImpactPolicy,
  analysis: NonNullable<SideEvidence["analysis"]>,
): string | null {
  if (
    analysis.status !== "partial" ||
    !analysis.providerId ||
    !analysis.providerFingerprint ||
    analysis.diagnosticCodes.length === 0
  )
    return null;
  const classes = new Set<string>();
  for (const code of analysis.diagnosticCodes) {
    const entry = policy.allowedPartial.find(
      (candidate) =>
        candidate.providerId === analysis.providerId &&
        candidate.providerFingerprint === analysis.providerFingerprint &&
        candidate.diagnosticCode === code,
    );
    if (!entry) return null;
    classes.add(entry.limitationClass);
  }
  return classes.size === 1 ? ([...classes][0] ?? null) : null;
}

export function loadBaseImpactPolicy(
  snapshot: GitChangeSnapshot,
): ImpactPolicy {
  const entry = treeEntry(snapshot, snapshot.baseTree, IMPACT_POLICY_PATH);
  if (
    !entry ||
    entry.type !== "blob" ||
    (entry.mode !== "100644" && entry.mode !== "100755")
  )
    throw new Error(
      `Trusted base policy missing or not a regular file: ${IMPACT_POLICY_PATH}`,
    );
  const bytes = blobBytes(snapshot, entry);
  if (!bytes) throw new Error("Trusted impact policy blob is missing");
  return parseImpactPolicy(
    JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)),
  );
}

/**
 * A staged review is enabled only after a valid policy exists in the captured
 * base tree. A staged policy addition cannot authorize its own review, and a
 * candidate deletion cannot disable a policy already trusted by the base.
 * Any present but invalid entry fails closed through loadBaseImpactPolicy.
 */
export function hasValidBaseImpactPolicy(snapshot: GitChangeSnapshot): boolean {
  if (!treeEntry(snapshot, snapshot.baseTree, IMPACT_POLICY_PATH)) return false;
  loadBaseImpactPolicy(snapshot);
  return true;
}

/** Policy digest helper for tooling that prints a reviewable base policy. */
export function impactPolicyFingerprint(policy: ImpactPolicy): Fingerprint {
  return fingerprint(parseImpactPolicy(policy));
}
