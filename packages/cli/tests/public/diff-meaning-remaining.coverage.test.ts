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

  test("ignores trailing commas immediately before array and object closers", () => {
    restores.push(isolateKibiEnv());
    const arrayDiff = [
      "diff --git a/src/list.ts b/src/list.ts",
      "@@ -1 +1 @@",
      "-const xs = [value]",
      "+const xs = [value,]",
      "",
    ].join("\n");
    const objectDiff = [
      "diff --git a/src/obj.ts b/src/obj.ts",
      "@@ -1 +1 @@",
      "-const o = {value}",
      "+const o = {value,}",
      "",
    ].join("\n");
    expect(hasMeaningfulSourceDiff(arrayDiff)).toBe(false);
    expect(hasMeaningfulSourceDiff(objectDiff)).toBe(false);
  });
});
