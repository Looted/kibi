import {
  type Mock,
  afterEach,
  beforeEach,
  describe,
  expect,
  spyOn,
  test,
} from "bun:test";
import { execFileSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

import { nodeGit } from "../../packages/cli/src/public/operations/node-ports.js";
import { assessProofReuse, main } from "../ci-proof-reuse.js";

const repository = "Looted/kibi";
const snapshotHash = "d".repeat(64);
const SNAPSHOT_VERSION = "kibi.workspace-snapshot.v2";

const FAKE_GH = `#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const fixture = process.env.KIBI_GH_FIXTURE;
const args = process.argv.slice(2);
function next(name) {
  const counter = path.join(fixture, name + ".count");
  const count = fs.existsSync(counter) ? Number(fs.readFileSync(counter, "utf8")) : 0;
  fs.writeFileSync(counter, String(count + 1));
  const numbered = path.join(fixture, name + "." + count + ".json");
  return fs.existsSync(numbered) ? numbered : path.join(fixture, name + ".json");
}
if (args[0] === "api") {
  const endpoint = args[1];
  const name = endpoint.includes("/branches/develop") ? "branch" :
    endpoint.includes("status=success") ? "runs-success" :
    endpoint.includes("/workflows/proof.yml/runs?") ? "runs-wait" :
    endpoint.includes("/artifacts?") ? "artifacts" : null;
  if (!name) process.exit(2);
  process.stdout.write(fs.readFileSync(next(name), "utf8"));
} else if (args[0] === "run" && args[1] === "download") {
  const output = args[args.indexOf("--dir") + 1];
  fs.copyFileSync(path.join(fixture, "attestation.json"), path.join(output, "attestation.json"));
} else process.exit(2);
`;

type Repo = { root: string; base: string; head: string; merge: string };

const tempDirs: string[] = [];
const savedEnv = { ...process.env };
const savedCwd = process.cwd();
let snapshotSpy: Mock<NonNullable<typeof nodeGit.workspaceSnapshot>>;
let logSpy: Mock<typeof console.log>;
let snapshotValue:
  | { version: string; hash: string; dirty: boolean }
  | undefined;

function temp(prefix: string): string {
  const directory = mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(directory);
  return directory;
}

function git(root: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

function makeRepo(): Repo {
  const root = temp("kibi-proof-main-repo-");
  git(root, "init", "-q", "-b", "master");
  git(root, "config", "user.name", "Kibi CI Test");
  git(root, "config", "user.email", "ci@example.test");
  git(root, "config", "commit.gpgsign", "false");
  writeFileSync(path.join(root, "a.txt"), "a\n");
  git(root, "add", ".");
  git(root, "commit", "-qm", "base");
  const base = git(root, "rev-parse", "HEAD");
  git(root, "switch", "-q", "-c", "develop");
  writeFileSync(path.join(root, "b.txt"), "b\n");
  git(root, "add", ".");
  git(root, "commit", "-qm", "head");
  const head = git(root, "rev-parse", "HEAD");
  git(root, "switch", "-q", "master");
  git(root, "merge", "-q", "--no-ff", "develop", "-m", "merge");
  const merge = git(root, "rev-parse", "HEAD");
  return { root, base, head, merge };
}

function proofRun(sha: string, overrides: Record<string, unknown> = {}) {
  return {
    id: 123,
    run_attempt: 1,
    head_sha: sha,
    head_branch: "develop",
    event: "push",
    status: "completed",
    conclusion: "success",
    path: ".github/workflows/proof.yml",
    html_url: `https://github.com/${repository}/actions/runs/123`,
    ...overrides,
  };
}

function attestationFor(sha: string, hash = snapshotHash) {
  return {
    version: "kibi.ci-proof-attestation.v1",
    outcome: "passed",
    snapshot: { version: SNAPSHOT_VERSION, hash },
    source: { repository, branch: "develop", sha, event: "push" },
    run: {
      id: 123,
      attempt: 1,
      workflow: ".github/workflows/proof.yml",
      url: `https://github.com/${repository}/actions/runs/123`,
    },
    artifact: "kibi-proof-attestation",
  };
}

type Fixture = { dir: string; bin: string };

function makeFixture(sha: string): Fixture {
  const dir = temp("kibi-proof-main-gh-");
  const bin = path.join(dir, "bin");
  mkdirSync(bin);
  writeFileSync(path.join(bin, "gh"), FAKE_GH);
  chmodSync(path.join(bin, "gh"), 0o755);
  writeJson(dir, "branch", { commit: { sha } });
  writeJson(dir, "runs-wait", {
    total_count: 1,
    workflow_runs: [proofRun(sha)],
  });
  writeJson(dir, "runs-success", {
    total_count: 1,
    workflow_runs: [proofRun(sha)],
  });
  writeJson(dir, "artifacts", {
    total_count: 1,
    artifacts: [
      { name: "kibi-proof-attestation", expired: false, size_in_bytes: 1024 },
    ],
  });
  writeJson(dir, "attestation", attestationFor(sha));
  return { dir, bin };
}

function writeJson(dir: string, name: string, value: unknown): void {
  writeFileSync(path.join(dir, `${name}.json`), JSON.stringify(value));
}

function resetCounters(fixture: Fixture): void {
  for (const name of ["branch", "runs-wait", "runs-success", "artifacts"]) {
    rmSync(path.join(fixture.dir, `${name}.count`), { force: true });
  }
}

function decideEnv(repo: Repo, fixture: Fixture, extra = {}) {
  return {
    PATH: `${fixture.bin}:${savedEnv.PATH}`,
    KIBI_GH_FIXTURE: fixture.dir,
    GITHUB_REPOSITORY: repository,
    GITHUB_SHA: repo.merge,
    PR_HEAD_REPOSITORY: repository,
    PR_HEAD_BRANCH: "develop",
    PR_HEAD_SHA: repo.head,
    PR_BASE_SHA: repo.base,
    KIBI_PROOF_REUSE_POLL_SECONDS: "0",
    ...extra,
  };
}

function setEnv(values: Record<string, string>): void {
  for (const key of Object.keys(process.env)) {
    if (
      key.startsWith("GITHUB_") ||
      key.startsWith("PR_") ||
      key.startsWith("KIBI_PROOF_REUSE_")
    )
      delete process.env[key];
  }
  Object.assign(process.env, values);
}

async function decide(
  repo: Repo,
  fixture: Fixture,
  extra: Record<string, string> = {},
): Promise<{ mode: string; reason: string; sourceRun?: string }> {
  resetCounters(fixture);
  setEnv(decideEnv(repo, fixture, extra));
  const output = path.join(fixture.dir, "decision.json");
  await main(["decide", output]);
  return JSON.parse(readFileSync(output, "utf8"));
}

beforeEach(() => {
  snapshotValue = {
    version: SNAPSHOT_VERSION,
    hash: snapshotHash,
    dirty: false,
  };
  snapshotSpy = spyOn(nodeGit, "workspaceSnapshot").mockImplementation(
    async () => snapshotValue as never,
  ) as never;
  logSpy = spyOn(console, "log").mockImplementation(() => undefined);
});

afterEach(() => {
  snapshotSpy.mockRestore();
  logSpy.mockRestore();
  process.chdir(savedCwd);
  for (const key of Object.keys(process.env)) delete process.env[key];
  Object.assign(process.env, savedEnv);
  for (const directory of tempDirs.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

describe("ci-proof-reuse command line", () => {
  test("rejects an unknown command or a missing output path", async () => {
    const usage =
      "usage: bun scripts/ci-proof-reuse.ts attest|decide <output-path>";
    await expect(main([])).rejects.toThrow(usage);
    await expect(main(["decide"])).rejects.toThrow(usage);
    await expect(main(["publish", "out"])).rejects.toThrow(usage);
  });
});

describe("ci-proof-reuse attest", () => {
  function attestEnv(repo: Repo, extra: Record<string, string> = {}) {
    setEnv({
      GITHUB_EVENT_NAME: "push",
      GITHUB_REF: "refs/heads/develop",
      GITHUB_REPOSITORY: repository,
      GITHUB_SHA: repo.merge,
      GITHUB_RUN_ID: "77",
      GITHUB_RUN_ATTEMPT: "2",
      ...extra,
    });
  }

  test("writes an attestation for the clean develop checkout", async () => {
    const repo = makeRepo();
    process.chdir(repo.root);
    attestEnv(repo);
    const output = path.join(temp("kibi-proof-main-out-"), "nested");
    await main(["attest", output]);
    expect(
      JSON.parse(readFileSync(path.join(output, "attestation.json"), "utf8")),
    ).toStrictEqual({
      version: "kibi.ci-proof-attestation.v1",
      outcome: "passed",
      snapshot: { version: SNAPSHOT_VERSION, hash: snapshotHash },
      source: {
        repository,
        branch: "develop",
        sha: repo.merge,
        event: "push",
      },
      run: {
        id: 77,
        attempt: 2,
        workflow: ".github/workflows/proof.yml",
        url: `https://github.com/${repository}/actions/runs/77`,
      },
      artifact: "kibi-proof-attestation",
    });
    expect(logSpy).toHaveBeenCalledWith(
      `Kibi full proof attested: ${SNAPSHOT_VERSION} ${snapshotHash}; run 77/2`,
    );
  });

  test("only a develop push may attest", async () => {
    const repo = makeRepo();
    process.chdir(repo.root);
    const message =
      "only a successful develop push may emit a proof attestation";
    attestEnv(repo, { GITHUB_EVENT_NAME: "pull_request" });
    await expect(main(["attest", "out"])).rejects.toThrow(message);
    attestEnv(repo, { GITHUB_REF: "refs/heads/master" });
    await expect(main(["attest", "out"])).rejects.toThrow(message);
    attestEnv(repo, { GITHUB_EVENT_NAME: "" });
    await expect(main(["attest", "out"])).rejects.toThrow(
      "GITHUB_EVENT_NAME is required",
    );
  });

  test("the checkout must match a well-formed attested commit", async () => {
    const repo = makeRepo();
    process.chdir(repo.root);
    const message = "develop checkout does not match the attested commit";
    attestEnv(repo, { GITHUB_SHA: "not-a-sha" });
    await expect(main(["attest", "out"])).rejects.toThrow(message);
    attestEnv(repo, { GITHUB_SHA: repo.base });
    await expect(main(["attest", "out"])).rejects.toThrow(message);
  });

  test("the snapshot must be available, current and clean", async () => {
    const repo = makeRepo();
    process.chdir(repo.root);
    attestEnv(repo);
    snapshotValue = undefined;
    await expect(main(["attest", "out"])).rejects.toThrow(
      "canonical Kibi workspace snapshot is unavailable",
    );
    const message = "develop proof snapshot is incompatible or dirty";
    for (const snapshot of [
      {
        version: "kibi.workspace-snapshot.v1",
        hash: snapshotHash,
        dirty: false,
      },
      { version: SNAPSHOT_VERSION, hash: "short", dirty: false },
      { version: SNAPSHOT_VERSION, hash: snapshotHash, dirty: true },
    ]) {
      snapshotValue = snapshot;
      await expect(main(["attest", "out"])).rejects.toThrow(message);
    }
  });

  test("the GitHub run identity must be positive integers", async () => {
    const repo = makeRepo();
    process.chdir(repo.root);
    for (const [id, attempt] of [
      ["x", "1"],
      ["0", "1"],
      ["1", "1.5"],
      ["1", "0"],
    ]) {
      attestEnv(repo, { GITHUB_RUN_ID: id, GITHUB_RUN_ATTEMPT: attempt });
      await expect(main(["attest", "out"])).rejects.toThrow(
        "GitHub proof run identity is invalid",
      );
    }
  });
});

describe("ci-proof-reuse decide", () => {
  test("reuses the develop proof and reports it to GitHub outputs", async () => {
    const repo = makeRepo();
    process.chdir(repo.root);
    const fixture = makeFixture(repo.head);
    const githubOutput = path.join(fixture.dir, "github-output");
    const summary = path.join(fixture.dir, "summary.md");
    const decision = await decide(repo, fixture, {
      GITHUB_OUTPUT: githubOutput,
      GITHUB_STEP_SUMMARY: summary,
    });
    expect(decision).toStrictEqual({
      version: "kibi.ci-proof-decision.v1",
      mode: "reused",
      reason: "identical canonical Kibi workspace snapshot",
      mergeSnapshot: snapshotHash,
      developSnapshot: snapshotHash,
      sourceRun: `https://github.com/${repository}/actions/runs/123`,
    });
    expect(readFileSync(githubOutput, "utf8")).toBe("reuse=true\n");
    const detail = [
      "Kibi proof reuse:",
      `  develop proof snapshot: ${snapshotHash}`,
      `  PR merge snapshot:      ${snapshotHash}`,
      "  result: identical canonical Kibi workspace snapshot",
      `  full proof skipped; reusing successful develop proof https://github.com/${repository}/actions/runs/123`,
    ].join("\n");
    expect(logSpy).toHaveBeenCalledWith(detail);
    expect(readFileSync(summary, "utf8")).toBe(
      `\n### Kibi proof reuse\n\n\`\`\`text\n${detail}\n\`\`\`\n`,
    );
  });

  test("a develop PR proves its base commit and falls back without outputs", async () => {
    const repo = makeRepo();
    process.chdir(repo.root);
    const fixture = makeFixture(repo.base);
    writeJson(fixture.dir, "attestation", attestationFor(repo.base));
    const decision = await decide(repo, fixture, {
      PR_BASE_REF: "develop",
      PR_HEAD_BRANCH: "feature",
    });
    expect(decision.mode).toBe("reused");
    const githubOutput = path.join(fixture.dir, "github-output");
    expect(existsSync(githubOutput)).toBe(false);
  });

  test("a failed lookup runs full proof and reports unavailable snapshots", async () => {
    const repo = makeRepo();
    process.chdir(repo.root);
    const fixture = makeFixture(repo.head);
    const githubOutput = path.join(fixture.dir, "github-output");
    const decision = await decide(repo, fixture, {
      PR_HEAD_SHA: "",
      GITHUB_OUTPUT: githubOutput,
    });
    expect(decision).toStrictEqual({
      version: "kibi.ci-proof-decision.v1",
      mode: "execute",
      reason: "reuse lookup failed: PR_HEAD_SHA is required",
    });
    expect(readFileSync(githubOutput, "utf8")).toBe("reuse=false\n");
    expect(logSpy).toHaveBeenCalledWith(
      [
        "Kibi proof reuse:",
        "  develop proof snapshot: unavailable",
        "  PR merge snapshot:      unavailable",
        "  result: reuse lookup failed: PR_HEAD_SHA is required",
        "  running full proof",
      ].join("\n"),
    );
  });

  test("malformed GitHub responses fail closed with their reason", async () => {
    const repo = makeRepo();
    process.chdir(repo.root);
    const fixture = makeFixture(repo.head);
    const failed = (reason: string) => `reuse lookup failed: ${reason}`;

    writeJson(fixture.dir, "branch", { commit: { sha: 1 } });
    expect((await decide(repo, fixture)).reason).toBe(
      failed("develop branch response is malformed"),
    );
    writeJson(fixture.dir, "branch", { commit: null });
    expect((await decide(repo, fixture)).reason).toBe(
      failed("develop branch response is malformed"),
    );
    writeJson(fixture.dir, "branch", []);
    expect((await decide(repo, fixture)).reason).toBe(
      failed("develop branch response is malformed"),
    );
    writeJson(fixture.dir, "branch", { commit: { sha: repo.head } });

    for (const runs of [
      [],
      { workflow_runs: {} },
      { total_count: 2, workflow_runs: [proofRun(repo.head)] },
    ]) {
      writeJson(fixture.dir, "runs-success", runs);
      expect((await decide(repo, fixture)).reason).toBe(
        failed("develop proof run lookup is incomplete or malformed"),
      );
    }
    writeJson(fixture.dir, "runs-success", {
      total_count: 1,
      workflow_runs: [proofRun(repo.head)],
    });

    for (const artifacts of [
      [],
      { artifacts: {} },
      { total_count: 3, artifacts: [] },
    ]) {
      writeJson(fixture.dir, "artifacts", artifacts);
      expect((await decide(repo, fixture)).reason).toBe(
        failed("proof artifact lookup is incomplete or malformed"),
      );
    }
    for (const artifacts of [
      [],
      [{ name: "kibi-proof-attestation", expired: true, size_in_bytes: 1 }],
      [{ name: "other", expired: false, size_in_bytes: 1 }],
      [null],
      [
        { name: "kibi-proof-attestation", expired: false, size_in_bytes: 1 },
        { name: "kibi-proof-attestation", expired: false, size_in_bytes: 1 },
      ],
    ]) {
      writeJson(fixture.dir, "artifacts", {
        total_count: artifacts.length,
        artifacts,
      });
      expect((await decide(repo, fixture)).reason).toBe(
        failed("proof attestation artifact is missing or ambiguous"),
      );
    }
    for (const size of ["1", 1.5, 0, 65537]) {
      writeJson(fixture.dir, "artifacts", {
        total_count: 1,
        artifacts: [
          {
            name: "kibi-proof-attestation",
            expired: false,
            size_in_bytes: size,
          },
        ],
      });
      expect((await decide(repo, fixture)).reason).toBe(
        failed("proof attestation artifact size is invalid"),
      );
    }
    writeJson(fixture.dir, "artifacts", {
      total_count: 1,
      artifacts: [
        {
          name: "kibi-proof-attestation",
          expired: false,
          size_in_bytes: 65536,
        },
      ],
    });
    writeFileSync(
      path.join(fixture.dir, "attestation.json"),
      " ".repeat(65537),
    );
    expect((await decide(repo, fixture)).reason).toBe(
      failed("proof attestation artifact is too large"),
    );
  });

  test("without a unique successful run no attestation is downloaded", async () => {
    const repo = makeRepo();
    process.chdir(repo.root);
    const fixture = makeFixture(repo.head);
    writeJson(fixture.dir, "runs-success", {
      total_count: 0,
      workflow_runs: [],
    });
    writeFileSync(path.join(fixture.dir, "artifacts.json"), "not JSON");
    expect((await decide(repo, fixture)).reason).toBe(
      "no unique successful develop proof run for this exact head",
    );
  });

  test("waits for a develop proof run to appear and then to finish", async () => {
    const repo = makeRepo();
    process.chdir(repo.root);
    const fixture = makeFixture(repo.head);
    writeJson(fixture.dir, "runs-wait.0", {
      total_count: 0,
      workflow_runs: [],
    });
    writeJson(fixture.dir, "runs-wait.1", {
      total_count: 2,
      workflow_runs: [
        proofRun(repo.head, { status: "queued" }),
        proofRun(repo.head, {
          status: "in_progress",
          html_url: "https://example.test/run/2",
        }),
      ],
    });
    const decision = await decide(repo, fixture, {
      KIBI_PROOF_REUSE_WAIT_SECONDS: "",
    });
    expect(decision.mode).toBe("reused");
    expect(logSpy).toHaveBeenCalledWith(
      `Waiting for the develop proof run of ${repo.head} to appear (0s)`,
    );
    expect(logSpy).toHaveBeenCalledWith(
      `Waiting for develop proof https://github.com/${repository}/actions/runs/123, https://example.test/run/2 to finish (0s)`,
    );
  });

  test("stops waiting when no run appears within the grace period", async () => {
    const repo = makeRepo();
    process.chdir(repo.root);
    const fixture = makeFixture(repo.head);
    writeJson(fixture.dir, "runs-wait", { total_count: 0, workflow_runs: [] });
    const decision = await decide(repo, fixture, {
      KIBI_PROOF_REUSE_WAIT_SECONDS: "0",
    });
    expect(decision.mode).toBe("reused");
  });

  test("rejects a negative or non-numeric wait setting", async () => {
    const repo = makeRepo();
    process.chdir(repo.root);
    const fixture = makeFixture(repo.head);
    for (const value of ["-1", "soon"]) {
      expect(
        (await decide(repo, fixture, { KIBI_PROOF_REUSE_WAIT_SECONDS: value }))
          .reason,
      ).toBe(
        "reuse lookup failed: KIBI_PROOF_REUSE_WAIT_SECONDS must be a non-negative number of seconds",
      );
    }
  });
});

describe("ci-proof-reuse provenance details", () => {
  const head = "a".repeat(40);
  const base = "b".repeat(40);
  const merge = "c".repeat(40);
  function input(overrides: Record<string, unknown> = {}) {
    return {
      repository,
      headRepository: repository,
      headBranch: "develop",
      headSha: head,
      baseSha: base,
      mergeSha: merge,
      checkoutSha: merge,
      mergeParents: [base, head],
      developHeadBefore: head,
      developHeadAfter: head,
      snapshot: { version: SNAPSHOT_VERSION, hash: snapshotHash, dirty: false },
      runs: [proofRun(head)],
      attestation: attestationFor(head),
      ...overrides,
    };
  }

  test("an invalid SHA requires full proof", () => {
    expect(assessProofReuse(input({ mergeSha: "x" }))).toStrictEqual({
      version: "kibi.ci-proof-decision.v1",
      mode: "execute",
      reason: "PR or checkout SHA is invalid",
      mergeSnapshot: snapshotHash,
    });
  });

  test("accepts the ref-qualified workflow path and rejects other paths", () => {
    expect(
      assessProofReuse(
        input({
          runs: [
            proofRun(head, {
              path: ".github/workflows/proof.yml@refs/heads/develop",
            }),
          ],
        }),
      ).mode,
    ).toBe("reused");
    expect(
      assessProofReuse(
        input({ runs: [proofRun(head, { path: ".github/workflows/x.yml" })] }),
      ).reason,
    ).toBe("develop proof run provenance is invalid");
  });
});
