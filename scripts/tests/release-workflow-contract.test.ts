import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const WORKFLOW_PATH = join(
  import.meta.dir,
  "..",
  "..",
  ".github",
  "workflows",
  "publish.yml",
);

describe("publish.yml CI workflow contract", () => {
  const workflowContent = readFileSync(WORKFLOW_PATH, "utf8");

  test("invokes bun run scripts/run-release-state.ts", () => {
    expect(workflowContent).toContain("bun run scripts/run-release-state.ts");
  });

  test("does not set KIBI_RELEASE_MOCK_NPM", () => {
    expect(workflowContent).not.toContain("KIBI_RELEASE_MOCK_NPM");
  });
});
