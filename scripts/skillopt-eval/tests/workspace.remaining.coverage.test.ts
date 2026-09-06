// implements REQ-skillopt-codex-optimization
import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { parseTaskSpec } from "../fixtures/contracts";
import { writePublicWorkspace } from "../fixtures/workspace";
import { CANONICAL_SKILL_ROOT, temporaryRoot } from "./fixture-test-helpers";
import { buildPublicCatalog } from "../catalog";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
  if (process.exitCode === 1) process.exitCode = 0;
});

describe("workspace remaining SkillSourceError branches", () => {
  test("throws when a canonical skill is missing and when materialized files drift", () => {
    const missingRoot = mkdtempSync(path.join(tmpdir(), "skillopt-missing-skills-"));
    roots.push(missingRoot);
    const task = parseTaskSpec(buildPublicCatalog()[0]);
    const workspace = temporaryRoot();
    roots.push(workspace);
    expect(() =>
      writePublicWorkspace({
        root: workspace,
        task,
        canonicalSkillRoot: missingRoot,
      }),
    ).toThrow(/missing canonical skill/);

    const drifted = temporaryRoot();
    roots.push(drifted);
    expect(() =>
      writePublicWorkspace({
        root: drifted,
        task: {
          ...task,
          allowedPublicFiles: ["not-the-materialized-set.json"],
        },
        canonicalSkillRoot: CANONICAL_SKILL_ROOT,
      }),
    ).toThrow(/materialized files differ from allowed public files/);
    mkdirSync(path.join(missingRoot, "keep"), { recursive: true });
    writeFileSync(path.join(missingRoot, "keep", "noop.txt"), "ok\n");
  });
});
