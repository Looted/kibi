import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { checkDiffCommand } from "../../src/commands/check-diff.js";

// implements REQ-impact-policy-stage-e-content-bound-review
const GATE_ENVIRONMENT = [
  "GITHUB_EVENT_NAME",
  "GITHUB_EVENT_PATH",
  "GITHUB_REPOSITORY",
  "KIBI_IMPACT_TRUSTED_TARGET_REF",
  "GITHUB_SHA",
] as const;

const roots: string[] = [];
const savedEnvironment = new Map<string, string | undefined>();
let logs: string[] = [];
let logSpy: ReturnType<typeof spyOn<typeof console, "log">>;

beforeEach(() => {
  for (const key of GATE_ENVIRONMENT) {
    savedEnvironment.set(key, process.env[key]);
    delete process.env[key];
  }
  logs = [];
  logSpy = spyOn(console, "log").mockImplementation((...args: unknown[]) => {
    logs.push(args.map(String).join(" "));
  });
});

afterEach(() => {
  logSpy.mockRestore();
  for (const [key, value] of savedEnvironment) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  savedEnvironment.clear();
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function fixture(headChangesSource: boolean) {
  const root = mkdtempSync(join(tmpdir(), "kibi-check-diff-"));
  roots.push(root);
  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  const write = (path: string, value: string) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), value);
  };
  git("init", "-q", "-b", "main");
  git("config", "user.name", "check-diff fixture");
  git("config", "user.email", "fixture@example.invalid");
  write("src/service.ts", "export const version = 1;\n");
  git("add", ".");
  git("commit", "-qm", "base");
  const target = git("rev-parse", "HEAD");
  let head = target;
  if (headChangesSource) {
    git("switch", "-qc", "feature");
    write("src/service.ts", "export const version = 2;\n");
    git("add", "src/service.ts");
    git("commit", "-qm", "change source");
    head = git("rev-parse", "HEAD");
    git("switch", "-q", "main");
  }
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
  process.env.GITHUB_EVENT_NAME = "pull_request_target";
  process.env.GITHUB_EVENT_PATH = eventPath;
  process.env.GITHUB_REPOSITORY = "example/project";
  process.env.KIBI_IMPACT_TRUSTED_TARGET_REF = "refs/heads/main";
  process.env.GITHUB_SHA = target;
  return { root, target, head };
}

describe("kibi check-diff aggregate gate", () => {
  test("refuses to run outside a trusted pull_request_target context", async () => {
    const f = fixture(false);
    process.env.GITHUB_EVENT_NAME = "pull_request";

    await expect(checkDiffCommand(f.root)).rejects.toThrow(
      "requires pull_request_target context",
    );
    expect(logs).toEqual([]);
  });

  test("passes a pull request with no changed files without granting reviewer authority", async () => {
    const f = fixture(false);

    const outcome = await checkDiffCommand(f.root);

    expect(outcome).toEqual({ exitCode: 0 });
    expect(logs).toHaveLength(1);
    expect(JSON.parse(logs[0] ?? "{}")).toMatchObject({
      status: "passed",
      repository: "example/project",
      targetRef: "refs/heads/main",
      targetCommit: f.target,
      headCommit: f.head,
      mergeBaseCommit: f.target,
      scopeFingerprint: null,
      reviewerAuthority: "none",
    });
  });

  test("rejects a source-changing pull request that carries no reviewed impact evidence", async () => {
    const f = fixture(true);

    await expect(checkDiffCommand(f.root)).rejects.toThrow();
    expect(logs).toEqual([]);
  });
});
