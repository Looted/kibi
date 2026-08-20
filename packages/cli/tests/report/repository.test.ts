import { describe, expect, test } from "bun:test";

import {
  commitWebUrl,
  formatSourceCoordinate,
  parseGitRemote,
  resolveReportRepository,
  sourceWebUrl,
} from "../../src/report/repository.js";

describe("report repository metadata", () => {
  test("parses GitHub and GitLab remotes without hardcoding a project", () => {
    expect(parseGitRemote("https://github.com/Acme/Widgets.git")).toEqual({
      identity: "Acme/Widgets",
      webUrl: "https://github.com/Acme/Widgets",
      provider: "github",
    });
    expect(parseGitRemote("git@gitlab.com:group/sub/repo.git")).toEqual({
      identity: "group/sub/repo",
      webUrl: "https://gitlab.com/group/sub/repo",
      provider: "gitlab",
    });
    expect(parseGitRemote("")).toBeUndefined();
  });

  test("builds commit and source URLs only from structured coordinates", () => {
    const repository = resolveReportRepository({
      remotes: [{ name: "origin", url: "https://github.com/Acme/Widgets.git" }],
      commitSha: "782c5d97abc",
      branch: "develop",
    });
    expect(commitWebUrl(repository)).toBe(
      "https://github.com/Acme/Widgets/commit/782c5d97abc",
    );
    expect(
      sourceWebUrl(repository, {
        path: "packages/cli/src/report/html-report.ts",
        line: 12,
        endLine: 40,
      }),
    ).toBe(
      "https://github.com/Acme/Widgets/blob/782c5d97abc/packages/cli/src/report/html-report.ts#L12-L40",
    );
    expect(sourceWebUrl(repository, { path: "" })).toBeUndefined();
    expect(
      sourceWebUrl(undefined, {
        path: "packages/cli/src/report/html-report.ts",
      }),
    ).toBeUndefined();
  });

  test("keeps local coordinates when web metadata is unavailable", () => {
    const repository = resolveReportRepository({
      remotes: [],
      branch: "develop",
    });
    expect(repository.webUrl).toBeUndefined();
    expect(repository.identity).toBeUndefined();
    expect(
      formatSourceCoordinate({
        path: "packages/cli/src/report/html-report.ts",
        line: 12,
        endLine: 40,
      }),
    ).toBe("packages/cli/src/report/html-report.ts:12-40");
    expect(
      sourceWebUrl(repository, {
        path: "packages/cli/src/report/html-report.ts",
        line: 12,
      }),
    ).toBeUndefined();
  });
});
