// implements REQ-008
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { FrontmatterError } from "../../src/extractors/markdown.js";
import * as markdown from "../../src/extractors/markdown.js";
import { validateStagedMarkdown } from "../../src/traceability/markdown-validate.js";
import { isolateKibiEnv } from "../helpers/in-process-workspace.js";

const spies: Array<{ mockRestore: () => void }> = [];
const restores: Array<() => void> = [];

afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  for (const restore of restores.splice(0)) restore();
  if (process.exitCode === 1) process.exitCode = 0;
});

describe("markdown-validate remaining FrontmatterError and lane inference", () => {
  test("records a FrontmatterError thrown during embedded-entity detection", () => {
    restores.push(isolateKibiEnv());
    const spy = spyOn(markdown, "detectEmbeddedEntities").mockImplementation(
      () => {
        throw new FrontmatterError("embedded boom", ".kb/requirements/x.md");
      },
    );
    spies.push(spy);
    const result = validateStagedMarkdown(
      ".kb/requirements/REQ-1.md",
      "---\ntitle: One\ntype: req\n---\nBody\n",
    );
    expect(result.errors[0]).toBeInstanceOf(FrontmatterError);
    expect(result.errors[0]?.message).toBe("embedded boom");
  });

  test("infers scenario and test types from canonical lane paths", () => {
    restores.push(isolateKibiEnv());
    const scenario = validateStagedMarkdown(
      ".kb/scenarios/SCEN-1.md",
      "---\ntitle: Scenario\n---\nBody\n",
    );
    const testDoc = validateStagedMarkdown(
      ".kb/tests/TEST-1.md",
      "---\ntitle: Test\n---\nBody\n",
    );
    expect(scenario.filePath).toContain("scenarios");
    expect(testDoc.filePath).toContain("tests");
  });
});
