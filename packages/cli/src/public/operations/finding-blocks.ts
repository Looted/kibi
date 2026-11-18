/**
 * What a finding stops: "commit" when the staged gate refuses the commit
 * over it, "merge" when the full check (CI, check-diff) fails over it, and
 * "none" when it is advice.
 */
export type FindingBlocks = "commit" | "merge" | "none";

type Judged = Readonly<{ blocking?: unknown; severity?: unknown }>;

/** True for a finding its check counts as blocking. */
export function isBlockingFinding(finding: Judged): boolean {
  return finding.blocking === true || finding.severity === "error";
}

/**
 * The findings, each tagged with what it stops: a blocking one stops
 * `level`, any other nothing. `allBlock` tags every finding with `level`
 * (violations, which always block their check).
 */
export function tagBlocks<T extends object>(
  findings: readonly T[],
  level: Exclude<FindingBlocks, "none">,
  allBlock = false,
): Array<T & { blocks: FindingBlocks }> {
  return findings.map((finding) => ({
    ...finding,
    blocks: allBlock || isBlockingFinding(finding as Judged) ? level : "none",
  }));
}
