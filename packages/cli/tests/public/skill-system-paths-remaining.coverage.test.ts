// implements REQ-kibi-bundled-skills
import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { resolveSkillFilePath } from "../../src/public/skill-system/paths.js";
import { isolateKibiEnv } from "../helpers/in-process-workspace.js";

const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  if (process.exitCode === 1) process.exitCode = 0;
});

describe("skill-system paths remaining SKILL.md join", () => {
  test("joins SKILL.md onto a missing path that is not already the skill file", () => {
    restores.push(isolateKibiEnv());
    const root = mkdtempSync(path.join(os.tmpdir(), "kibi-skill-path-"));
    mkdirSync(root, { recursive: true });
    const missing = path.join(root, "not-a-dir-yet");
    expect(resolveSkillFilePath(missing)).toBe(path.join(missing, "SKILL.md"));
    const skillFile = path.join(root, "SKILL.md");
    writeFileSync(skillFile, "---\nid: x\n---\n");
    expect(resolveSkillFilePath(skillFile)).toBe(skillFile);
  });
});
