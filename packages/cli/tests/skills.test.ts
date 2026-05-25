import { afterEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";

import {
  SkillOversizeError,
  SkillResourceNotFoundError,
  SkillResourceOutOfBoundsError,
  SkillValidationError,
  listBundledSkills,
  loadBundledSkill,
  readBundledSkillResource,
  validateSkillBundle,
} from "../src/public/skills";

const bundledSkillsDir = resolve(import.meta.dir, "../src/public/skills");
const outsideFixturesDir = resolve(import.meta.dir, ".tmp-skills-outside");

function writeSkill(
  id: string,
  frontmatter: Record<string, unknown>,
  body = "Skill body",
): string {
  const rootDir = join(bundledSkillsDir, id);
  mkdirSync(rootDir, { recursive: true });
  const yaml = Object.entries(frontmatter)
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join("\n");
  writeFileSync(join(rootDir, "SKILL.md"), `---\n${yaml}\n---\n${body}\n`);
  return rootDir;
}

function validFrontmatter(overrides: Record<string, unknown> = {}) {
  return {
    id: "valid-skill",
    name: "Valid Skill",
    description: "Loads a valid skill bundle",
    version: "1.0.0",
    kibiCompatibility: ">=0.11.0",
    tags: ["test"],
    resources: ["resources/example.txt"],
    ...overrides,
  };
}

afterEach(() => {
  rmSync(bundledSkillsDir, { recursive: true, force: true });
  mkdirSync(bundledSkillsDir, { recursive: true });
  rmSync(outsideFixturesDir, { recursive: true, force: true });
});

describe("skills public API", () => {
  test("loads a valid manifest and markdown body", () => {
    writeSkill("valid-skill", validFrontmatter(), "# Valid Skill\nUse it well.");

    const listed = listBundledSkills();
    const bundle = loadBundledSkill("valid-skill");

    expect(listed).toHaveLength(1);
    expect(listed[0]?.id).toBe("valid-skill");
    expect(bundle.manifest.name).toBe("Valid Skill");
    expect(bundle.body).toContain("Use it well.");
    expect(bundle.rootDir).toBe(resolve(bundledSkillsDir, "valid-skill"));
  });

  test("reports missing required manifest fields", () => {
    const rootDir = writeSkill("missing-field", {
      ...validFrontmatter({ id: "missing-field" }),
      description: "",
    });

    const result = validateSkillBundle(rootDir);

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toBeInstanceOf(SkillValidationError);
    expect(result.errors.map((error) => error.field)).toContain("description");
  });

  test("reports invalid semantic versions", () => {
    const rootDir = writeSkill(
      "invalid-version",
      validFrontmatter({ id: "invalid-version", version: "one" }),
    );

    const result = validateSkillBundle(rootDir);

    expect(result.valid).toBe(false);
    expect(result.errors.map((error) => error.field)).toContain("version");
  });

  test("reports missing kibiCompatibility", () => {
    const { kibiCompatibility: _compatibility, ...manifest } = validFrontmatter({
      id: "missing-compat",
    });
    const rootDir = writeSkill("missing-compat", manifest);

    const result = validateSkillBundle(rootDir);

    expect(result.valid).toBe(false);
    expect(result.errors.map((error) => error.field)).toContain(
      "kibiCompatibility",
    );
  });

  test("reports invalid resource declarations", () => {
    const rootDir = writeSkill(
      "invalid-resource",
      validFrontmatter({ id: "invalid-resource", resources: ["../secret.txt"] }),
    );

    const result = validateSkillBundle(rootDir);

    expect(result.valid).toBe(false);
    expect(result.errors.map((error) => error.field)).toContain("resources");
  });

  test("rejects resource path traversal", () => {
    writeSkill("valid-skill", validFrontmatter());

    expect(() => readBundledSkillResource("valid-skill", "../secret.txt")).toThrow(
      SkillResourceOutOfBoundsError,
    );
  });

  test("rejects symlink resource escapes", () => {
    const rootDir = writeSkill(
      "symlink-skill",
      validFrontmatter({ id: "symlink-skill", resources: ["resources/link.txt"] }),
    );
    mkdirSync(join(rootDir, "resources"), { recursive: true });
    mkdirSync(outsideFixturesDir, { recursive: true });
    writeFileSync(join(outsideFixturesDir, "secret.txt"), "secret");
    symlinkSync(join(outsideFixturesDir, "secret.txt"), join(rootDir, "resources/link.txt"));

    expect(() => readBundledSkillResource("symlink-skill", "resources/link.txt")).toThrow(
      SkillResourceOutOfBoundsError,
    );
  });

  test("rejects oversized SKILL.md files", () => {
    writeSkill("big-skill", validFrontmatter({ id: "big-skill" }), "x".repeat(256 * 1024 + 1));

    expect(() => loadBundledSkill("big-skill")).toThrow(SkillOversizeError);
  });

  test("rejects oversized resources", () => {
    const rootDir = writeSkill("valid-skill", validFrontmatter());
    mkdirSync(join(rootDir, "resources"), { recursive: true });
    writeFileSync(join(rootDir, "resources/example.txt"), "x".repeat(128 * 1024 + 1));

    expect(() => readBundledSkillResource("valid-skill", "resources/example.txt")).toThrow(
      SkillOversizeError,
    );
  });

  test("reads only declared resources", () => {
    const rootDir = writeSkill("valid-skill", validFrontmatter());
    mkdirSync(join(rootDir, "resources"), { recursive: true });
    writeFileSync(join(rootDir, "resources/example.txt"), "declared");
    writeFileSync(join(rootDir, "resources/hidden.txt"), "hidden");

    expect(readBundledSkillResource("valid-skill", "resources/example.txt")).toBe(
      "declared",
    );
    expect(() => readBundledSkillResource("valid-skill", "resources/hidden.txt")).toThrow(
      SkillResourceNotFoundError,
    );
  });

  test("returns an empty list when bundled skills directory is empty", () => {
    mkdirSync(bundledSkillsDir, { recursive: true });

    expect(existsSync(bundledSkillsDir)).toBe(true);
    expect(listBundledSkills()).toEqual([]);
  });
});
