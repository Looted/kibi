import { describe, expect, test } from "bun:test";
import {
  CHECK_ATTESTATION_VERSION,
  type CheckReuseInput,
  assessMemberCheckReuse,
  metaFromBody,
} from "../ci-check-reuse";

const REPO = "Looted/kibi";
const BASE = "a".repeat(40);
const MEMBER = "b".repeat(40);
const TRAIN = "c".repeat(40);
const MERGE = "d".repeat(40);
const TREE = "e".repeat(40);
const OTHER = "f".repeat(40);

function input(overrides: Partial<CheckReuseInput> = {}): CheckReuseInput {
  const run = {
    id: 99,
    run_attempt: 1,
    head_sha: MEMBER,
    head_branch: "feature",
    event: "pull_request",
    status: "completed",
    conclusion: "success",
    path: ".github/workflows/ci.yml",
    html_url: `https://github.com/${REPO}/actions/runs/99`,
    head_repository: { full_name: REPO },
  };
  return {
    repository: REPO,
    event: "pull_request",
    baseRef: "develop",
    headRepository: REPO,
    headBranch: "merge-train/1700000000000",
    trainHeadSha: TRAIN,
    trainParents: [BASE, MEMBER],
    trainTree: TREE,
    trainSubject: "Merge pull request #7 from Looted/kibi:feature",
    pullBaseSha: BASE,
    checkoutSha: MERGE,
    checkoutParents: [BASE, TRAIN],
    checkoutTree: TREE,
    meta: {
      version: "kibi.merge-train.v1",
      prs: [7],
      base: BASE,
      head: TRAIN,
    },
    memberTree: TREE,
    runs: [run],
    listingComplete: true,
    attestation: {
      version: CHECK_ATTESTATION_VERSION,
      outcome: "passed",
      tree: TREE,
      source: {
        repository: REPO,
        branch: "feature",
        sha: MEMBER,
        event: "pull_request",
      },
      run: {
        id: 99,
        attempt: 1,
        workflow: ".github/workflows/ci.yml",
        url: run.html_url,
      },
      artifact: "kibi-ci-attestation",
    },
    requiredCheck: {
      id: 5,
      name: "ci-required",
      status: "completed",
      conclusion: "success",
    },
    requiredCheckName: "ci-required",
    workflowPath: ".github/workflows/ci.yml",
    artifactName: "kibi-ci-attestation",
    attestationVersion: CHECK_ATTESTATION_VERSION,
    ...overrides,
  };
}

describe("assessMemberCheckReuse", () => {
  test("reuses when the train checkout is the member's attested tree", () => {
    const decision = assessMemberCheckReuse(input());
    expect(decision.mode).toBe("reused");
    expect(decision.tree).toBe(TREE);
    expect(decision.sourceRunId).toBe(99);
  });

  test("reuses a workflow that has no aggregate check when its run passed", () => {
    const decision = assessMemberCheckReuse(
      input({ requiredCheck: null, requiredCheckName: null }),
    );
    expect(decision.mode).toBe("reused");
  });

  test("runs the workflow whenever the tree is not the one that passed", () => {
    for (const [name, overrides] of [
      ["member moved", { memberTree: OTHER }],
      ["train merge changed the tree", { trainTree: OTHER }],
      ["develop moved under the checkout", { checkoutTree: OTHER }],
      ["attestation names another tree", {}],
    ] as const) {
      const sample =
        name === "attestation names another tree"
          ? input({
              attestation: {
                ...(input().attestation as object),
                tree: OTHER,
              },
            })
          : input(overrides);
      expect(assessMemberCheckReuse(sample).mode, name).toBe("execute");
    }
  });

  test("does not reuse a train of several pull requests or a rewritten body", () => {
    expect(
      assessMemberCheckReuse(
        input({
          meta: {
            version: "kibi.merge-train.v1",
            prs: [7, 8],
            base: BASE,
            head: TRAIN,
          },
        }),
      ).mode,
    ).toBe("execute");
    expect(assessMemberCheckReuse(input({ meta: null })).mode).toBe("execute");
    expect(
      assessMemberCheckReuse(
        input({
          meta: {
            version: "kibi.merge-train.v1",
            prs: [7],
            base: OTHER,
            head: TRAIN,
          },
        }),
      ).reason,
    ).toContain("assembled");
    expect(
      assessMemberCheckReuse(
        input({
          trainSubject: "Merge pull request #8 from Looted/kibi:feature",
        }),
      ).mode,
    ).toBe("execute");
  });

  test("does not reuse when the member's latest run or required check failed", () => {
    const older = input().runs[0];
    const failed = {
      ...older,
      id: 100,
      conclusion: "failure",
      html_url: `https://github.com/${REPO}/actions/runs/100`,
    };
    expect(assessMemberCheckReuse(input({ runs: [older, failed] })).mode).toBe(
      "execute",
    );
    expect(
      assessMemberCheckReuse(
        input({
          requiredCheck: {
            id: 6,
            name: "ci-required",
            status: "completed",
            conclusion: "failure",
          },
        }),
      ).mode,
    ).toBe("execute");
    expect(assessMemberCheckReuse(input({ listingComplete: false })).mode).toBe(
      "execute",
    );
  });

  test("does not reuse a run that itself came from a merge train", () => {
    const run = { ...input().runs[0], head_branch: "merge-train/earlier" };
    const attestation = input().attestation as { source: { branch: string } };
    expect(
      assessMemberCheckReuse(
        input({
          runs: [run],
          attestation: {
            ...attestation,
            source: { ...attestation.source, branch: run.head_branch },
          },
        }),
      ).mode,
    ).toBe("execute");
  });

  test("does not reuse a fork, a non-train, or a checkout of a different merge", () => {
    expect(
      assessMemberCheckReuse(input({ headRepository: "other/kibi" })).mode,
    ).toBe("execute");
    expect(assessMemberCheckReuse(input({ headBranch: "feature" })).mode).toBe(
      "execute",
    );
    expect(
      assessMemberCheckReuse(input({ checkoutParents: [OTHER, TRAIN] })).mode,
    ).toBe("execute");
    expect(assessMemberCheckReuse(input({ event: "push" })).mode).toBe(
      "execute",
    );
  });
});

describe("train meta comment", () => {
  const comment = (meta: Record<string, unknown>) =>
    `Merge train (new train): #7.\n\n<!-- kibi-merge-train ${JSON.stringify(meta)} -->`;

  test("reads the comment the merge-train action writes", () => {
    expect(
      metaFromBody(
        comment({
          version: "kibi.merge-train.v1",
          prs: [7],
          base: BASE,
          head: TRAIN,
          rerun: false,
        }),
      ),
    ).toEqual({
      version: "kibi.merge-train.v1",
      prs: [7],
      base: BASE,
      head: TRAIN,
    });
  });

  test("rejects a comment that is not a current single-train meta", () => {
    expect(metaFromBody(null)).toBeNull();
    expect(metaFromBody("no comment")).toBeNull();
    expect(
      metaFromBody(
        comment({
          version: "kibi.merge-train.v1",
          prs: [7],
          base: BASE,
          head: TRAIN,
        }),
      ),
    ).toBeNull();
    expect(
      metaFromBody(
        comment({
          version: "other",
          prs: [7],
          base: BASE,
          head: TRAIN,
          rerun: false,
        }),
      ),
    ).toBeNull();
    expect(
      metaFromBody(
        comment({
          version: "kibi.merge-train.v1",
          prs: [7.5],
          base: BASE,
          head: TRAIN,
          rerun: true,
        }),
      ),
    ).toBeNull();
  });
});
