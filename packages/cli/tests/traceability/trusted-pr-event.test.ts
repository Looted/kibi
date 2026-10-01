import { afterEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { patchReceiptsIntoDocument } from "../../src/operations/proof/receipt-document.js";
import { captureDiffSnapshot } from "../../src/traceability/git-change-snapshot.js";
import { assertTrustedPullRequestBaseline } from "../../src/traceability/impact-pr-diff.js";
import { resolveTrustedPullRequestSnapshot } from "../../src/traceability/trusted-pr-event.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "kibi-pr-impact-event-"));
  roots.push(root);
  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  const write = (path: string, value: string) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), value);
  };
  git("init", "-q", "-b", "main");
  git("config", "user.name", "PR event fixture");
  git("config", "user.email", "fixture@example.invalid");
  write(
    ".kibi/impact-policy.json",
    '{"contractVersion":"kibi.impact-policy.v1"}\n',
  );
  write(".kb/requirements/REQ-one.md", "initial\n");
  write(
    ".kb/tests/TEST-one.md",
    "---\nid: TEST-one\ntitle: Existing proof record\nverification_scope: unit\nproof_receipts: []\n---\n",
  );
  write("src/service.ts", "export const version = 1;\n");
  git("add", ".");
  git("commit", "-qm", "base");
  const target = git("rev-parse", "HEAD");
  git("switch", "-qc", "feature");
  write("src/service.ts", "export const version = 2;\n");
  git("add", "src/service.ts");
  git("commit", "-qm", "change source");
  const head = git("rev-parse", "HEAD");
  git("switch", "-q", "main");
  const eventPath = join(root, "event.json");
  writeFileSync(
    eventPath,
    JSON.stringify({
      repository: { full_name: "example/project" },
      pull_request: {
        base: {
          ref: "main",
          sha: target,
          repo: { full_name: "example/project" },
        },
        head: { sha: head },
      },
    }),
  );
  const environment = {
    GITHUB_EVENT_NAME: "pull_request_target",
    GITHUB_EVENT_PATH: eventPath,
    GITHUB_REPOSITORY: "example/project",
    KIBI_IMPACT_TRUSTED_TARGET_REF: "refs/heads/main",
    GITHUB_SHA: target,
  } as NodeJS.ProcessEnv;
  return { root, git, write, target, head, environment };
}

describe("trusted pull request impact event", () => {
  test("binds the GitHub event, protected checkout, full history and unique merge base", () => {
    const f = fixture();
    const event = resolveTrustedPullRequestSnapshot(f.root, f.environment);
    expect(event).toMatchObject({
      targetCommit: f.target,
      headCommit: f.head,
      mergeBaseCommit: f.target,
      targetRef: "refs/heads/main",
    });
    const snapshot = captureDiffSnapshot(
      f.root,
      event.mergeBaseCommit,
      event.headCommit,
    );
    assertTrustedPullRequestBaseline(snapshot, event);
  });

  test("rejects a PR targeting a branch outside the protected policy", () => {
    const f = fixture();
    f.environment.KIBI_IMPACT_TRUSTED_TARGET_REF = "refs/heads/release";
    expect(() =>
      resolveTrustedPullRequestSnapshot(f.root, f.environment),
    ).toThrow("configured protected branch");
  });

  test("rejects an evaluator checkout that does not equal the event target SHA", () => {
    const f = fixture();
    f.git("switch", "-q", "feature");
    expect(() =>
      resolveTrustedPullRequestSnapshot(f.root, f.environment),
    ).toThrow("not the PR target commit");
  });

  test("requires GITHUB_SHA to bind the event's target commit", () => {
    const f = fixture();
    f.environment.GITHUB_SHA = undefined;
    expect(() =>
      resolveTrustedPullRequestSnapshot(f.root, f.environment),
    ).toThrow("GitHub event SHA are required");
  });

  test("rejects protected knowledge that advanced after the merge base", () => {
    const f = fixture();
    f.git("switch", "-qc", "advance-target", f.target);
    f.write(".kb/requirements/REQ-one.md", "target changed\n");
    f.git("add", ".kb/requirements/REQ-one.md");
    f.git("commit", "-qm", "advance target knowledge");
    const advancedTarget = f.git("rev-parse", "HEAD");
    f.git("branch", "-f", "main", advancedTarget);
    f.git("switch", "-q", "main");
    f.environment.GITHUB_SHA = advancedTarget;
    const eventPath = f.environment.GITHUB_EVENT_PATH;
    if (!eventPath) throw new Error("Fixture event path is missing");
    const value = JSON.parse(readFileSync(eventPath, "utf8")) as Record<
      string,
      unknown
    >;
    const pullRequest = value.pull_request as {
      base: { sha: string };
    };
    pullRequest.base.sha = advancedTarget;
    writeFileSync(eventPath, JSON.stringify(value));
    const event = resolveTrustedPullRequestSnapshot(f.root, f.environment);
    const snapshot = captureDiffSnapshot(
      f.root,
      event.mergeBaseCommit,
      event.headCommit,
    );
    expect(() => assertTrustedPullRequestBaseline(snapshot, event)).toThrow(
      "Protected target knowledge",
    );
  });

  test("receipt-only target advancement preserves the trusted knowledge baseline", () => {
    const f = fixture();
    f.git("switch", "-qc", "receipt-target", f.target);
    const testPath = ".kb/tests/TEST-one.md";
    const prior = readFileSync(join(f.root, testPath), "utf8");
    const digest = "a".repeat(64);
    const patched = patchReceiptsIntoDocument(prior, [
      {
        version: "kibi.proof-receipt.v1",
        receipt_id: "PR-target1234",
        test_id: "TEST-one",
        scope: "unit",
        outcome: "passed",
        code_snapshot: digest,
        environment_hash: digest,
        started_at: "2026-09-26T10:00:00.000Z",
        finished_at: "2026-09-26T10:00:01.000Z",
        artifact_digest: digest,
        contract_hash: digest,
        fingerprint: digest,
        fingerprint_components: {
          contract: digest,
          integration: digest,
          command: digest,
          bindings: digest,
          producer: digest,
        },
        integration_id: "target-fixture",
        producer: { name: "fixture", version: "1" },
        command_argv: ["bun", "test"],
        run_outcome: "passed",
        proof_results: [],
      },
    ]);
    if (patched === null) throw new Error("Receipt patcher rejected fixture");
    f.write(testPath, patched);
    f.git("add", testPath);
    f.git("commit", "-qm", "append proof receipt on target");
    const advancedTarget = f.git("rev-parse", "HEAD");
    f.git("branch", "-f", "main", advancedTarget);
    f.git("switch", "-q", "main");
    f.environment.GITHUB_SHA = advancedTarget;
    const eventPath = f.environment.GITHUB_EVENT_PATH;
    if (!eventPath) throw new Error("Fixture event path is missing");
    const value = JSON.parse(readFileSync(eventPath, "utf8")) as Record<
      string,
      unknown
    >;
    const pullRequest = value.pull_request as { base: { sha: string } };
    pullRequest.base.sha = advancedTarget;
    writeFileSync(eventPath, JSON.stringify(value));

    const event = resolveTrustedPullRequestSnapshot(f.root, f.environment);
    expect(event.mergeBaseCommit).toBe(f.target);
    const snapshot = captureDiffSnapshot(
      f.root,
      event.mergeBaseCommit,
      event.headCommit,
    );
    expect(() =>
      assertTrustedPullRequestBaseline(snapshot, event),
    ).not.toThrow();
  });
});
