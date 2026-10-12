import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  UNIT_RESULTS_ARTIFACT,
  fetchRefusal,
  latestCiRun,
  main,
  resultsArtifact,
} from "../ci-unit-results";

const SHA = "e".repeat(40);
const roots: string[] = [];
const savedEnv = { ...process.env };

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
  for (const key of ["GITHUB_REPOSITORY", "PR_HEAD_REPOSITORY", "CI_HEAD_SHA"])
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
});

describe("ci-unit-results", () => {
  test("never fetches results produced by another repository's code", () => {
    const input = { repository: "o/r", headRepository: "o/r", sha: SHA };
    expect(fetchRefusal(input)).toBeNull();
    expect(fetchRefusal({ ...input, headRepository: "O/R" })).toBeNull();
    expect(fetchRefusal({ ...input, headRepository: "fork/r" })).toBe(
      "the change comes from another repository",
    );
    expect(fetchRefusal({ ...input, repository: "" })).toBe(
      "repository is unknown",
    );
    expect(fetchRefusal({ ...input, sha: "${{ github.sha }}" })).toBe(
      "commit SHA is invalid",
    );
  });

  test("picks the newest push or pull request run for the commit", () => {
    const runs = {
      workflow_runs: [
        { id: 5, head_sha: SHA, event: "push", status: "completed" },
        { id: 9, head_sha: SHA, event: "pull_request", status: "in_progress" },
        { id: 12, head_sha: SHA, event: "workflow_dispatch", status: "queued" },
        { id: 20, head_sha: "f".repeat(40), event: "push", status: "queued" },
      ],
    };
    expect(latestCiRun(runs, SHA)?.id).toBe(9);
    expect(latestCiRun({ workflow_runs: [] }, SHA)).toBeNull();
    expect(() => latestCiRun({}, SHA)).toThrow("malformed");
  });

  test("accepts exactly one unexpired results artifact of sane size", () => {
    const artifact = {
      id: 1,
      name: UNIT_RESULTS_ARTIFACT,
      expired: false,
      size_in_bytes: 100,
    };
    expect(resultsArtifact({ artifacts: [artifact] })?.id).toBe(1);
    expect(
      resultsArtifact({ artifacts: [{ ...artifact, expired: true }] }),
    ).toBeNull();
    expect(resultsArtifact({ artifacts: [] })).toBeNull();
    expect(() => resultsArtifact({ artifacts: [artifact, artifact] })).toThrow(
      "ambiguous",
    );
    expect(() =>
      resultsArtifact({ artifacts: [{ ...artifact, size_in_bytes: 0 }] }),
    ).toThrow("size");
    expect(() => resultsArtifact(null)).toThrow("malformed");
  });

  test("writes why results are unavailable so the proof stops waiting", async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "kibi-unit-results-"));
    roots.push(root);
    const out = path.join(root, "results.json");
    process.env.GITHUB_REPOSITORY = "o/r";
    process.env.PR_HEAD_REPOSITORY = "fork/r";
    process.env.CI_HEAD_SHA = SHA;
    const log = spyOn(console, "log").mockImplementation(() => undefined);
    const error = spyOn(console, "error").mockImplementation(() => undefined);
    try {
      expect(await main(["fetch", out])).toBe(0);
      expect(JSON.parse(readFileSync(out, "utf8"))).toEqual({
        unavailable: "the change comes from another repository",
      });
      expect(await main(["download"])).toBe(2);
    } finally {
      log.mockRestore();
      error.mockRestore();
    }
  });
});
