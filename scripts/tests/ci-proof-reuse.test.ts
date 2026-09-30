import { afterEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

import { nodeGit } from "../../packages/cli/src/public/operations/node-ports.js";
import { assessProofReuse } from "../ci-proof-reuse.js";

const repository = "Looted/kibi";
const headSha = "a".repeat(40);
const baseSha = "b".repeat(40);
const mergeSha = "c".repeat(40);
const snapshotHash = "d".repeat(64);
const run = {
  id: 123,
  run_attempt: 1,
  head_sha: headSha,
  head_branch: "develop",
  event: "push",
  status: "completed",
  conclusion: "success",
  path: ".github/workflows/proof.yml",
  html_url: `https://github.com/${repository}/actions/runs/123`,
};
const attestation = {
  version: "kibi.ci-proof-attestation.v1",
  outcome: "passed",
  snapshot: { version: "kibi.workspace-snapshot.v2", hash: snapshotHash },
  source: { repository, branch: "develop", sha: headSha, event: "push" },
  run: {
    id: run.id,
    attempt: run.run_attempt,
    workflow: ".github/workflows/proof.yml",
    url: run.html_url,
  },
  artifact: "kibi-proof-attestation",
};

function candidate(overrides: Record<string, unknown> = {}) {
  return {
    repository,
    headRepository: repository,
    headBranch: "develop",
    headSha,
    baseSha,
    mergeSha,
    checkoutSha: mergeSha,
    mergeParents: [baseSha, headSha],
    developHeadBefore: headSha,
    developHeadAfter: headSha,
    snapshot: {
      version: "kibi.workspace-snapshot.v2",
      hash: snapshotHash,
      dirty: false,
    },
    runs: [run],
    attestation,
    ...overrides,
  };
}

describe("CI proof attestation reuse", () => {
  test("reuses a successful proof for the same canonical snapshot across different Git SHAs", () => {
    const result = assessProofReuse(candidate());
    expect(headSha).not.toBe(mergeSha);
    expect(result).toMatchObject({
      mode: "reused",
      mergeSnapshot: snapshotHash,
      sourceRun: run.html_url,
    });
  });

  test("a changed canonical snapshot requires full proof", () => {
    expect(
      assessProofReuse(
        candidate({
          snapshot: {
            version: "kibi.workspace-snapshot.v2",
            hash: "e".repeat(64),
            dirty: false,
          },
        }),
      ).mode,
    ).toBe("execute");
  });

  test("missing, malformed, or unsuccessful proof evidence requires full proof", () => {
    for (const overrides of [
      { runs: [] },
      { runs: [run, { ...run, id: 124 }] },
      { attestation: null },
      {
        attestation: {
          ...attestation,
          source: { ...attestation.source, repository: 42 },
        },
      },
      { attestation: { ...attestation, outcome: "failed" } },
      { runs: [{ ...run, conclusion: "failure" }] },
      { runs: [{ ...run, event: "workflow_dispatch" }] },
      { runs: [{ ...run, run_attempt: 2 }] },
    ]) {
      expect(assessProofReuse(candidate(overrides)).mode).toBe("execute");
    }
  });

  test("stale source, wrong checkout, or snapshot version requires full proof", () => {
    for (const overrides of [
      { developHeadBefore: "f".repeat(40) },
      { developHeadAfter: "f".repeat(40) },
      { headBranch: "feature" },
      { headRepository: "someone/fork" },
      { mergeParents: [headSha, baseSha] },
      { checkoutSha: "f".repeat(40) },
      {
        snapshot: {
          version: "kibi.workspace-snapshot.v1",
          hash: snapshotHash,
          dirty: false,
        },
      },
      {
        snapshot: {
          version: "kibi.workspace-snapshot.v2",
          hash: snapshotHash,
          dirty: true,
        },
      },
      {
        attestation: {
          ...attestation,
          snapshot: {
            version: "kibi.workspace-snapshot.v1",
            hash: snapshotHash,
          },
        },
      },
    ]) {
      expect(assessProofReuse(candidate(overrides)).mode).toBe("execute");
    }
  });
});

describe("canonical snapshot on release merge commits", () => {
  const tempDirs: string[] = [];
  afterEach(() => {
    for (const directory of tempDirs.splice(0))
      rmSync(directory, { recursive: true, force: true });
  });

  function git(root: string, ...args: string[]): string {
    return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  }

  test("excluded release notes preserve proof through a new merge SHA; source changes deny reuse", async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "kibi-proof-reuse-"));
    tempDirs.push(root);
    git(root, "init", "-q", "-b", "master");
    git(root, "config", "user.name", "Kibi CI Test");
    git(root, "config", "user.email", "ci@example.test");
    mkdirSync(path.join(root, "src"));
    writeFileSync(
      path.join(root, "src", "feature.ts"),
      "export const feature = 1;\n",
    );
    git(root, "add", ".");
    git(root, "commit", "-qm", "base");
    const masterBase = git(root, "rev-parse", "HEAD");

    git(root, "switch", "-q", "-c", "develop");
    mkdirSync(path.join(root, ".changeset"));
    writeFileSync(
      path.join(root, ".changeset", "release.md"),
      "Release note only.\n",
    );
    git(root, "add", ".");
    git(root, "commit", "-qm", "release note");
    const developSha = git(root, "rev-parse", "HEAD");
    const developSnapshot = await nodeGit.workspaceSnapshot?.(root);
    expect(developSnapshot?.dirty).toBe(false);
    const attestationDirectory = mkdtempSync(
      path.join(os.tmpdir(), "kibi-proof-output-"),
    );
    tempDirs.push(attestationDirectory);
    const attestationOutput = path.join(attestationDirectory, "artifact");
    execFileSync(
      "bun",
      [
        path.join(import.meta.dir, "..", "ci-proof-reuse.ts"),
        "attest",
        attestationOutput,
      ],
      {
        cwd: root,
        env: {
          ...process.env,
          GITHUB_OUTPUT: "",
          GITHUB_STEP_SUMMARY: "",
          GITHUB_EVENT_NAME: "push",
          GITHUB_REF: "refs/heads/develop",
          GITHUB_REPOSITORY: repository,
          GITHUB_SHA: developSha,
          GITHUB_RUN_ID: String(run.id),
          GITHUB_RUN_ATTEMPT: String(run.run_attempt),
        },
      },
    );
    const emitted = JSON.parse(
      readFileSync(path.join(attestationOutput, "attestation.json"), "utf8"),
    ) as typeof attestation;
    expect(emitted.snapshot).toMatchObject({
      version: "kibi.workspace-snapshot.v2",
      hash: developSnapshot?.hash,
    });

    git(root, "switch", "-q", "master");
    git(root, "merge", "-q", "--no-ff", "develop", "-m", "release merge");
    const mergedSha = git(root, "rev-parse", "HEAD");
    const mergedSnapshot = await nodeGit.workspaceSnapshot?.(root);
    expect(mergedSha).not.toBe(developSha);
    expect(mergedSnapshot?.hash).toBe(developSnapshot?.hash);
    const accepted = assessProofReuse(
      candidate({
        headSha: developSha,
        baseSha: masterBase,
        mergeSha: mergedSha,
        checkoutSha: mergedSha,
        mergeParents: [masterBase, developSha],
        developHeadBefore: developSha,
        developHeadAfter: developSha,
        runs: [{ ...run, head_sha: developSha }],
        attestation: emitted,
        snapshot: mergedSnapshot,
      }),
    );
    expect(accepted.mode).toBe("reused");

    const fixture = mkdtempSync(path.join(os.tmpdir(), "kibi-proof-gh-"));
    tempDirs.push(fixture);
    const fakeBin = path.join(fixture, "bin");
    mkdirSync(fakeBin);
    const fakeGh = path.join(fakeBin, "gh");
    writeFileSync(
      fakeGh,
      `#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const fixture = process.env.KIBI_GH_FIXTURE;
const args = process.argv.slice(2);
if (args[0] === "api") {
  const endpoint = args[1];
  const name = endpoint.includes("/branches/develop") ? "branch" :
    endpoint.includes("/workflows/proof.yml/runs?") ? "runs" :
    endpoint.includes("/artifacts?") ? "artifacts" : null;
  if (!name) process.exit(2);
  process.stdout.write(fs.readFileSync(path.join(fixture, name + ".json"), "utf8"));
} else if (args[0] === "run" && args[1] === "download") {
  const output = args[args.indexOf("--dir") + 1];
  fs.copyFileSync(path.join(fixture, "attestation.json"), path.join(output, "attestation.json"));
} else process.exit(2);
`,
    );
    chmodSync(fakeGh, 0o755);
    writeFileSync(
      path.join(fixture, "branch.json"),
      JSON.stringify({ commit: { sha: developSha } }),
    );
    writeFileSync(
      path.join(fixture, "runs.json"),
      JSON.stringify({
        total_count: 1,
        workflow_runs: [{ ...run, head_sha: developSha }],
      }),
    );
    writeFileSync(
      path.join(fixture, "artifacts.json"),
      JSON.stringify({
        total_count: 1,
        artifacts: [
          {
            name: "kibi-proof-attestation",
            expired: false,
            size_in_bytes: 1024,
          },
        ],
      }),
    );
    writeFileSync(
      path.join(fixture, "attestation.json"),
      JSON.stringify(emitted),
    );
    const decisionPath = path.join(fixture, "decision.json");
    const runGate = (base: string, merge: string) => {
      execFileSync(
        "bun",
        [
          path.join(import.meta.dir, "..", "ci-proof-reuse.ts"),
          "decide",
          decisionPath,
        ],
        {
          cwd: root,
          env: {
            ...process.env,
            GITHUB_OUTPUT: "",
            GITHUB_STEP_SUMMARY: "",
            PATH: `${fakeBin}:${process.env.PATH}`,
            KIBI_GH_FIXTURE: fixture,
            GITHUB_REPOSITORY: repository,
            GITHUB_SHA: merge,
            PR_HEAD_REPOSITORY: repository,
            PR_HEAD_BRANCH: "develop",
            PR_HEAD_SHA: developSha,
            PR_BASE_SHA: base,
          },
        },
      );
      return JSON.parse(readFileSync(decisionPath, "utf8")) as {
        mode: string;
        reason: string;
      };
    };
    expect(runGate(masterBase, mergedSha).mode).toBe("reused");

    git(root, "reset", "--hard", masterBase);
    writeFileSync(
      path.join(root, "src", "master-only.ts"),
      "export const masterOnly = true;\n",
    );
    git(root, "add", ".");
    git(root, "commit", "-qm", "master-only change");
    const changedBase = git(root, "rev-parse", "HEAD");
    git(
      root,
      "merge",
      "-q",
      "--no-ff",
      "develop",
      "-m",
      "release with master change",
    );
    const changedMerge = git(root, "rev-parse", "HEAD");
    const changedSnapshot = await nodeGit.workspaceSnapshot?.(root);
    expect(changedSnapshot?.hash).not.toBe(developSnapshot?.hash);
    expect(
      assessProofReuse(
        candidate({
          snapshot: changedSnapshot,
          attestation: {
            ...attestation,
            snapshot: { ...attestation.snapshot, hash: developSnapshot?.hash },
          },
        }),
      ).mode,
    ).toBe("execute");
    expect(runGate(changedBase, changedMerge)).toMatchObject({
      mode: "execute",
      reason: "canonical Kibi snapshots differ",
    });
    writeFileSync(path.join(fixture, "runs.json"), "not JSON");
    const failedLookup = runGate(changedBase, changedMerge);
    expect(failedLookup.mode).toBe("execute");
    expect(failedLookup.reason).toContain("reuse lookup failed");
  });
});
