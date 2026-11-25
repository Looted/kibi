// executable_for TEST-cla-workflow-contract
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..", "..");
const SIGN_SENTENCE =
  "I have read the Kibi CLA Document and I hereby sign the CLA";
const CLA_ACTION =
  /^contributor-assistant\/github-action@[0-9a-f]{40}(?![0-9a-f])/;

type Step = {
  name?: string;
  uses?: string;
  run?: string;
  with?: Record<string, string | boolean>;
};
type Workflow = {
  on: Record<string, { types?: string[] }>;
  permissions: Record<string, string>;
  jobs: Record<string, { if?: string; steps: Step[] }>;
};

function read(...parts: string[]): string {
  return readFileSync(join(ROOT, ...parts), "utf8");
}

function workflow(): Workflow {
  return Bun.YAML.parse(read(".github", "workflows", "cla.yml")) as Workflow;
}

function claJob() {
  const jobs = Object.values(workflow().jobs);
  expect(jobs).toHaveLength(1);
  return jobs[0];
}

function claStep(): Step {
  const steps = claJob().steps.filter((step) =>
    CLA_ACTION.test(step.uses ?? ""),
  );
  expect(steps).toHaveLength(1);
  return steps[0];
}

describe("CLA workflow contract", () => {
  test("runs on every pull request and on pull request comments", () => {
    const on = workflow().on;
    expect(Object.keys(on).sort()).toEqual([
      "issue_comment",
      "pull_request_target",
    ]);
    expect(on.pull_request_target.types?.sort()).toEqual([
      "closed",
      "opened",
      "synchronize",
    ]);
    expect(on.issue_comment.types).toEqual(["created"]);
  });

  test("handles only the sign sentence and recheck comments on pull requests", () => {
    const condition = claJob().if ?? "";
    expect(condition).toContain("github.event_name == 'pull_request_target'");
    expect(condition).toContain("github.event.issue.pull_request");
    expect(condition).toContain(
      `github.event.comment.body == '${SIGN_SENTENCE}'`,
    );
    expect(condition).toContain("github.event.comment.body == 'recheck'");
  });

  test("never checks out or runs pull request code", () => {
    for (const step of claJob().steps) {
      expect(step.uses ?? "").not.toMatch(/^actions\/checkout@/);
      expect(step.run ?? "").not.toMatch(/\bgit (clone|checkout|fetch)\b/);
      expect(step.run ?? "").not.toContain("github.event.pull_request.head");
    }
  });

  test("pins the CLA action to a full commit SHA", () => {
    expect(claStep().uses).toMatch(CLA_ACTION);
  });

  test("exempts only the maintainer account and bot accounts", () => {
    expect(claStep().with?.allowlist).toBe("Looted,*[bot]");
  });

  test("stores signatures on the cla-signatures branch", () => {
    const inputs = claStep().with ?? {};
    expect(inputs.branch).toBe("cla-signatures");
    expect(inputs["path-to-signatures"]).toBe("signatures/cla.json");
    const create = claJob().steps.find((step) =>
      (step.run ?? "").includes("refs/heads/cla-signatures"),
    );
    expect(create?.run).toContain("git/ref/heads/cla-signatures");
    expect(create?.run).not.toMatch(/parents/);
  });

  test("links the CLA document on develop", () => {
    expect(claStep().with?.["path-to-document"]).toBe(
      "https://github.com/${{ github.repository }}/blob/develop/CLA.md",
    );
  });

  test("uses the same sign sentence in the workflow, CONTRIBUTING.md and CLA.md", () => {
    expect(claStep().with?.["custom-pr-sign-comment"]).toBe(SIGN_SENTENCE);
    expect(read("CONTRIBUTING.md")).toContain(SIGN_SENTENCE);
    expect(read("CLA.md")).toContain(SIGN_SENTENCE);
  });

  test("grants only the permissions the CLA action needs", () => {
    expect(workflow().permissions).toEqual({
      actions: "write",
      contents: "write",
      "pull-requests": "write",
      statuses: "write",
    });
  });
});
