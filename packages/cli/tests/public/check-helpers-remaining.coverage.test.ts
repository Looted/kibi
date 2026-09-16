// implements REQ-cli-check, REQ-mcp-tool-check
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  collectQueryPlanSafetyViolations,
  readLegacyChecksHint,
} from "../../src/public/operations/check-helpers.js";
import * as queryPlanSafety from "../../src/utils/prolog-query-plan-safety.js";
import { isolateKibiEnv } from "../helpers/in-process-workspace.js";

const spies: Array<{ mockRestore: () => void }> = [];
const restores: Array<() => void> = [];

afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  for (const restore of restores.splice(0)) restore();
  if (process.exitCode === 1) process.exitCode = 0;
});

describe("check-helpers remaining query-plan and legacy-config branches", () => {
  test("collectQueryPlanSafetyViolations maps analyzer findings", () => {
    restores.push(isolateKibiEnv());
    const analyze = spyOn(
      queryPlanSafety,
      "analyzePrologQueryPlanSafety",
    ).mockReturnValue([
      {
        predicate: "unsafe_check",
        line: 12,
        description: "Negation appears before later generator calls.",
        suggestion: "Bind generators first.",
      },
    ]);
    spies.push(analyze);
    const violations = collectQueryPlanSafetyViolations();
    expect(violations).toEqual([
      expect.objectContaining({
        rule: "query-plan-safety",
        entityId: "unsafe_check",
        description: "Negation appears before later generator calls.",
        suggestion: "Bind generators first.",
      }),
    ]);
    expect(violations[0]?.source).toMatch(/checks\.pl:12$/);
  });

  test("readLegacyChecksHint reports a present config.json and returns null when absent", async () => {
    restores.push(isolateKibiEnv());
    const root = mkdtempSync(path.join(os.tmpdir(), "kibi-legacy-hint-"));
    mkdirSync(path.join(root, ".kb"), { recursive: true });
    writeFileSync(path.join(root, ".kb", "config.json"), "{}\n");
    await expect(readLegacyChecksHint(root)).resolves.toMatch(
      /Legacy .*config\.json is present/,
    );
    await expect(
      readLegacyChecksHint(path.join(root, "missing-workspace")),
    ).resolves.toBeNull();
  });
});
