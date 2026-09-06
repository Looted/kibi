// implements REQ-kibi-github-report-integration
import { afterEach, describe, expect, test } from "bun:test";
import { insertKibiBadge } from "../../src/commands/github-init.js";
import { isolateKibiEnv } from "../helpers/in-process-workspace.js";

const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  if (process.exitCode === 1) process.exitCode = 0;
});

const BADGE = "[![Kibi requirement health](https://example.test/badge.svg)](https://example.test)";

describe("github-init remaining badge cluster skips", () => {
  test("stops the badge cluster on a blank run that is not followed by another badge", () => {
    restores.push(isolateKibiEnv());
    const content = ["# Title", "", "![other](https://img.test/a.svg)", "", "Intro"].join(
      "\n",
    );
    const updated = insertKibiBadge(content, BADGE);
    expect(updated).toContain(BADGE);
    expect(updated.indexOf(BADGE)).toBeLessThan(updated.indexOf("Intro"));
  });

  test("stops the badge cluster on a non-badge, non-blank line", () => {
    restores.push(isolateKibiEnv());
    const content = ["# Title", "![other](https://img.test/a.svg)", "Paragraph"].join(
      "\n",
    );
    const updated = insertKibiBadge(content, BADGE);
    expect(updated).toContain("Paragraph");
    expect(updated).toContain(BADGE);
  });
});
