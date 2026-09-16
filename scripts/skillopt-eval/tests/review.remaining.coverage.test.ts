import { afterEach, describe, expect, test } from "bun:test";
import { ProposalSchema } from "../contracts/review";

afterEach(() => {
  if (process.exitCode === 1) process.exitCode = 0;
});

const HASH = "a".repeat(64);
const OTHER = "b".repeat(64);

function proposal(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: "1.0.0",
    artifactType: "proposal",
    proposalId: "00000000-0000-4000-8000-000000000102",
    runId: "00000000-0000-4000-8000-000000000101",
    runLockHash: HASH,
    skill: "kibi-usage",
    candidateBodyHash: HASH,
    baselineFrontmatterHash: HASH,
    candidateFrontmatterHash: HASH,
    baselineResourcesHash: HASH,
    candidateResourcesHash: HASH,
    reportHash: HASH,
    createdAt: "2026-07-23T12:01:00Z",
    status: "eligible",
    ...overrides,
  };
}

describe("review contract remaining frontmatter and resource hash refinements", () => {
  test("rejects a proposal whose frontmatter hash changed", () => {
    const result = ProposalSchema.safeParse(
      proposal({ candidateFrontmatterHash: OTHER }),
    );
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error)).toContain("frontmatter hash changed");
  });

  test("rejects a proposal whose resources hash changed", () => {
    const result = ProposalSchema.safeParse(
      proposal({ candidateResourcesHash: OTHER }),
    );
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error)).toContain("resources hash changed");
  });
});
