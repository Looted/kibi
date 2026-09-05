// implements REQ-kibi-html-health-report
import { afterEach, describe, expect, test } from "bun:test";
import {
  commitWebUrl,
  formatSourceCoordinate,
  parseGitRemote,
  resolveReportRepository,
  shortCommitSha,
  sourceWebUrl,
} from "../../src/report/repository.js";
import { isolateKibiEnv } from "../helpers/in-process-workspace.js";

const restores: Array<() => void> = [];
const previousExitCode = process.exitCode;

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  if (typeof previousExitCode === "number") process.exitCode = previousExitCode;
  else if (typeof process.exitCode === "number") process.exitCode = 0;
});

describe("report repository leftover remote and URL branches", () => {
  test("rejects malformed GitHub or GitLab identities and parses generic remotes", () => {
    restores.push(isolateKibiEnv());
    expect(parseGitRemote("https://github.com/bad:owner/repo.git")).toBeUndefined();
    expect(parseGitRemote("https://github.com/Acme/has space.git")).toBeUndefined();
    expect(parseGitRemote("https://gitlab.com/group has/space.git")).toBeUndefined();
    expect(parseGitRemote("https://git.example.com/org/app.git")).toEqual({
      identity: "org/app",
      webUrl: "https://git.example.com/org/app",
      provider: "unknown",
    });
    expect(parseGitRemote("git@git.example.com:org/app.git")).toEqual({
      identity: "org/app",
      webUrl: "https://git.example.com/org/app",
      provider: "unknown",
    });
    expect(parseGitRemote("https://git.example.com/has space/app.git")).toBeUndefined();
    expect(parseGitRemote("git@git.example.com:has space/app.git")).toBeUndefined();
    expect(parseGitRemote("not-a-remote")).toBeUndefined();
  });

  test("prefers origin, builds GitLab URLs, and formats local coordinates", () => {
    restores.push(isolateKibiEnv());
    const repository = resolveReportRepository({
      remotes: [
        { name: "upstream", url: "https://gitlab.com/group/app.git" },
        { name: "origin", url: "https://gitlab.com/origin/app.git" },
        { name: "broken", url: "" },
      ],
      commitSha: "  abcdef1234567890  ",
      branch: "  feature/report  ",
    });
    expect(repository.identity).toBe("origin/app");
    expect(commitWebUrl(repository)).toBe(
      "https://gitlab.com/origin/app/-/commit/abcdef1234567890",
    );
    expect(
      sourceWebUrl(repository, {
        path: "/packages/cli/src/a.ts",
        line: 4,
        endLine: 9,
      }),
    ).toBe(
      "https://gitlab.com/origin/app/-/blob/abcdef1234567890/packages/cli/src/a.ts#L4-L9",
    );
    expect(sourceWebUrl(repository, { path: "https://evil.example/x.ts" })).toBeUndefined();
    expect(commitWebUrl({ ...repository, provider: "unknown" })).toBeUndefined();
    expect(
      sourceWebUrl(
        { ...repository, provider: "unknown" },
        { path: "src/a.ts", line: 1 },
      ),
    ).toBeUndefined();
    expect(shortCommitSha(undefined)).toBeUndefined();
    expect(shortCommitSha("   ")).toBeUndefined();
    expect(shortCommitSha("abc")).toBe("abc");
    expect(formatSourceCoordinate(undefined)).toBeUndefined();
    expect(formatSourceCoordinate({ path: "  " })).toBeUndefined();
    expect(formatSourceCoordinate({ path: "src/a.ts", line: 0 })).toBe("src/a.ts");
    expect(formatSourceCoordinate({ path: "src/a.ts", line: 3 })).toBe("src/a.ts:3");
    expect(
      sourceWebUrl(
        { webUrl: "https://github.com/Acme/Widgets/", provider: "github" },
        { path: "src/a.ts", line: 0 },
      ),
    ).toBeUndefined();
    expect(resolveReportRepository({ remotes: undefined }).identity).toBeUndefined();
  });
});
