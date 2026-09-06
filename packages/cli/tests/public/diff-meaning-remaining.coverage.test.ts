// implements REQ-cli-staged-impact-enforcement
import { afterEach, describe, expect, test } from "bun:test";
import { hasMeaningfulSourceDiff } from "../../src/public/impact/diff-meaning.js";
import { isolateKibiEnv } from "../helpers/in-process-workspace.js";

const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  if (process.exitCode === 1) process.exitCode = 0;
});

describe("diff-meaning remaining trailing-comma skip before closers", () => {
  test("ignores a trailing comma immediately before a closing paren", () => {
    restores.push(isolateKibiEnv());
    const diffText = [
      "diff --git a/src/call.ts b/src/call.ts",
      "@@ -1 +1 @@",
      "-render(value)",
      "+render(value,)",
      "",
    ].join("\n");
    expect(hasMeaningfulSourceDiff(diffText)).toBe(false);
  });
});
