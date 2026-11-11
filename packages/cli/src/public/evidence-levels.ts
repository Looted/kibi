/**
 * How strong the evidence behind a requirement is, strongest first. proved: a
 * re-checkable certificate covers every case. tested: fresh passing E2E
 * receipts cover every linked scenario. asserted: a person stands behind it.
 * unverified: an agent wrote it and no person approved it. The same list is
 * the vocabulary of required_evidence, a requirement's evidence floor.
 */
export const EVIDENCE_LEVELS = [
  "proved",
  "tested",
  "asserted",
  "unverified",
] as const;

export type EvidenceLevel = (typeof EVIDENCE_LEVELS)[number];

/** Higher is stronger: unverified 0 through proved 3. */
export function evidenceRank(level: EvidenceLevel): number {
  return EVIDENCE_LEVELS.length - 1 - EVIDENCE_LEVELS.indexOf(level);
}
