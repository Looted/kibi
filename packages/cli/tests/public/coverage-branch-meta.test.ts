import { describe, expect, test } from "bun:test";
import { withBranchName } from "../../src/public/operations/specs/reporting.js";
import type { BranchAttachment } from "../../src/utils/branch-resolver.js";

const KEY = "fc613b4dfd6736a7bd268c8a0e74ed0d1c04a959f59dd74ef2874983fd443fc9";

const attachment = (kbBranch: string): BranchAttachment => ({
  gitBranch: kbBranch,
  kbBranch,
  storePath: `/repo/.kb/branches/${KEY}`,
  kind: "exact",
  migrationRequired: false,
});

describe("discovery meta names the branch", () => {
  test("meta.branch is the branch name and the store key moves to branchStoreKey", () => {
    const payload = { rows: [], meta: { branch: KEY, syncState: "fresh" } };
    expect(
      withBranchName(payload, {
        branchAttachment: attachment("main"),
      }) as unknown,
    ).toEqual({
      rows: [],
      meta: { branch: "main", branchStoreKey: KEY, syncState: "fresh" },
    });
  });

  test("leaves a payload without meta or attachment, or already named, as it is", () => {
    const named = { meta: { branch: "main" } };
    expect(
      withBranchName(named, { branchAttachment: attachment("main") }),
    ).toBe(named);
    const bare: { rows: unknown[]; meta?: Record<string, unknown> } = {
      rows: [],
    };
    expect(withBranchName(bare, { branchAttachment: attachment("main") })).toBe(
      bare,
    );
    const unattached = { meta: { branch: KEY } };
    expect(withBranchName(unattached, {})).toBe(unattached);
    expect(
      withBranchName(
        { meta: { branch: "unknown" } },
        { branchAttachment: attachment("main") },
      ),
    ).toEqual({ meta: { branch: "main" } });
  });
});
