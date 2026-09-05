// implements REQ-kibi-bundled-skills
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import * as fs from "node:fs";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { validateSkillBundle } from "../../src/public/skill-system/validation.js";
import { isolateKibiEnv } from "../helpers/in-process-workspace.js";

const spies: Array<{ mockRestore: () => void }> = [];
const restores: Array<() => void> = [];

afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  for (const restore of restores.splice(0)) restore();
  if (process.exitCode === 1) process.exitCode = 0;
});

function writeSkill(rootDir: string, frontmatter: string): void {
  mkdirSync(rootDir, { recursive: true });
  writeFileSync(path.join(rootDir, "SKILL.md"), `---\n${frontmatter}\n---\nBody\n`);
}

describe("skill-system validation remaining missing, realpath, and type branches", () => {
  test("reports a missing SKILL.md", () => {
    restores.push(isolateKibiEnv());
    const missing = path.join(os.tmpdir(), `kibi-missing-skill-${Date.now()}`);
    const result = validateSkillBundle(missing);
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.message).toMatch(/Missing SKILL.md/);
  });

  test("records a realpath failure against the skill file", () => {
    restores.push(isolateKibiEnv());
    const rootDir = mkdtempSync(path.join(os.tmpdir(), "kibi-skill-realpath-"));
    writeSkill(
      rootDir,
      [
        'id: "realpath-skill"',
        'name: "Realpath Skill"',
        'description: "Valid enough to reach bundle contents"',
        'version: "1.0.0"',
        'kibiCompatibility: ">=0.11.0"',
      ].join("\n"),
    );
    const realpath = spyOn(fs, "realpathSync").mockImplementation(() => {
      throw new Error("broken skill root");
    });
    spies.push(realpath);
    const result = validateSkillBundle(rootDir);
    expect(result.valid).toBe(false);
    expect(result.errors.map((error) => error.message).join(" ")).toContain(
      "broken skill root",
    );
  });

  test("rejects non-string tags and resources arrays", () => {
    restores.push(isolateKibiEnv());
    const rootDir = mkdtempSync(path.join(os.tmpdir(), "kibi-skill-types-"));
    writeSkill(
      rootDir,
      [
        'id: "typed-skill"',
        'name: "Typed Skill"',
        'description: "Has invalid collection types"',
        'version: "1.0.0"',
        'kibiCompatibility: ">=0.11.0"',
        "tags: 12",
        "resources: false",
      ].join("\n"),
    );
    const result = validateSkillBundle(rootDir);
    expect(result.valid).toBe(false);
    expect(result.errors.map((error) => error.field)).toEqual(
      expect.arrayContaining(["tags", "resources"]),
    );
  });
});
