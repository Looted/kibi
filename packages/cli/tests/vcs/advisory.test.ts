import { describe, expect, test } from "bun:test";
import { NO_GIT_UNAVAILABLE_FEATURES } from "kibi-agent-core/version-control";
import type { BranchAttachment } from "../../src/utils/branch-resolver.js";
import {
  alwaysAdvisesNoGit,
  noGitRepositoryDiagnostic,
} from "../../src/vcs/advisory.js";

const gitAttachment: BranchAttachment = {
  gitBranch: "main",
  kbBranch: "main",
  storePath: "/w/.kb/branches/x",
  kind: "exact",
  migrationRequired: false,
};

describe("noGitRepositoryDiagnostic", () => {
  test("a Git attachment, or none, carries no advisory", () => {
    expect(noGitRepositoryDiagnostic(undefined)).toBeUndefined();
    expect(noGitRepositoryDiagnostic(gitAttachment)).toBeUndefined();
  });

  test("an attachment outside Git carries the advisory with what is off and the next step", () => {
    expect(
      noGitRepositoryDiagnostic({
        ...gitAttachment,
        kbBranch: "kibi-internal/no-git",
        kind: "no_git",
        noGit: {
          reason: "git_unavailable",
          explicitOverride: false,
          notice: "No Git.",
        },
      }),
    ).toStrictEqual({
      code: "no_git_repository",
      severity: "warning",
      message: "No Git.",
      detail: {
        versionControl: "none",
        reason: "git_unavailable",
        kbBranch: "kibi-internal/no-git",
        storePath: "/w/.kb/branches/x",
        unavailable: NO_GIT_UNAVAILABLE_FEATURES,
        alternative: "kibi check",
        suggestion: "git init && kibi init",
      },
    });
  });
});

describe("alwaysAdvisesNoGit", () => {
  test("status and check carry it on every result; other operations do not", () => {
    expect(alwaysAdvisesNoGit("kb_status")).toBe(true);
    expect(alwaysAdvisesNoGit("kb_check")).toBe(true);
    expect(alwaysAdvisesNoGit("kb_search")).toBe(false);
  });
});
