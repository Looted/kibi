import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import {
  existsSync,
  mkdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import {
  SkillNotFoundError,
  SkillOversizeError,
  SkillResourceNotFoundError,
  SkillResourceOutOfBoundsError,
  SkillValidationError,
} from "../src/skill-system/errors.js";
import {
  listBundledSkills,
  loadBundledSkill,
  loadBundledSkillFrom,
  readBundledSkillResource,
  readBundledSkillResourceFrom,
  resetBundledSkillsDir,
  setBundledSkillsDir,
} from "../src/skill-system/loader.js";
import {
  SKILL_FILE_NAME,
  isPathOutOfBounds,
  isWithinRoot,
  normalizeResourcePath,
  resolveSkillFilePath,
} from "../src/skill-system/paths.js";
import {
  RESOURCE_MAX_BYTES,
  assertMaxBytes,
  parseSkillBundle,
  validateSkillBundle,
} from "../src/skill-system/validation.js";
import {
  listBundledSkills as listFromSkillsFacade,
  validateSkillBundle as validateFromSkillsFacade,
} from "../src/skills.js";

const bundledSkillsDir = resolve(import.meta.dir, ".tmp-runtime-skills");
const outsideFixturesDir = resolve(import.meta.dir, ".tmp-runtime-skills-out");

beforeAll(() => {
  setBundledSkillsDir(bundledSkillsDir);
});
afterAll(() => {
  resetBundledSkillsDir();
  rmSync(bundledSkillsDir, { recursive: true, force: true });
  rmSync(outsideFixturesDir, { recursive: true, force: true });
});

function writeSkill(
  id: string,
  frontmatter: Record<string, unknown>,
  body = "Skill body",
  root: string = bundledSkillsDir,
): string {
  const rootDir = join(root, id);
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
beforeEach(() => {
  rmSync(bundledSkillsDir, { recursive: true, force: true });
  mkdirSync(bundledSkillsDir, { recursive: true });
  rmSync(outsideFixturesDir, { recursive: true, force: true });
});

describe("skill-system paths", () => {
  test("normalizes separators and classifies traversal", () => {
    expect(normalizeResourcePath("resources\\guide.md")).toBe(
      "resources/guide.md",
    );
    expect(isPathOutOfBounds("/abs/path")).toBe(true);
    expect(isPathOutOfBounds("..")).toBe(true);
    expect(isPathOutOfBounds("../secret")).toBe(true);
    expect(isPathOutOfBounds("a/../../secret")).toBe(true);
    expect(isPathOutOfBounds("resources/guide.md")).toBe(false);
    expect(isWithinRoot("/tmp/root", "/tmp/root")).toBe(true);
    expect(isWithinRoot("/tmp/root", "/tmp/root/child")).toBe(true);
    expect(isWithinRoot("/tmp/root", "/tmp/other")).toBe(false);
  });

  test("resolveSkillFilePath accepts a directory, SKILL.md, or other path", () => {
    const rootDir = writeSkill("valid-skill", validFrontmatter());
    expect(resolveSkillFilePath(rootDir)).toBe(join(rootDir, SKILL_FILE_NAME));
    expect(resolveSkillFilePath(join(rootDir, SKILL_FILE_NAME))).toBe(
      join(rootDir, SKILL_FILE_NAME),
    );
    expect(resolveSkillFilePath(join(rootDir, "other.md"))).toBe(
      join(rootDir, "other.md", SKILL_FILE_NAME),
    );
  });
});

describe("skill-system errors", () => {
  test("constructs named error instances with fields", () => {
    const missing = new SkillNotFoundError("gone");
    expect(missing.name).toBe("SkillNotFoundError");
    expect(missing.message).toBe("Skill not found: gone");

    const resource = new SkillResourceNotFoundError("id", "res.md");
    expect(resource.name).toBe("SkillResourceNotFoundError");
    expect(resource.message).toBe("Skill resource not found: id/res.md");

    const bounds = new SkillResourceOutOfBoundsError("id", "../x");
    expect(bounds.name).toBe("SkillResourceOutOfBoundsError");

    const validation = new SkillValidationError("id", "bad");
    expect(validation.field).toBe("id");
    expect(validation.name).toBe("SkillValidationError");

    const oversize = new SkillOversizeError("SKILL.md", 10, 20);
    expect(oversize.maxBytes).toBe(10);
    expect(oversize.actualBytes).toBe(20);
    expect(oversize.name).toBe("SkillOversizeError");
  });
});

describe("skill-system loader and validation", () => {
  test("loads a valid manifest and markdown body from the configured root", () => {
    writeSkill(
      "valid-skill",
      validFrontmatter(),
      "# Valid Skill\nUse it well.",
    );

    const listed = listBundledSkills();
    const bundle = loadBundledSkill("valid-skill");

    expect(listed).toHaveLength(1);
    expect(listed[0]?.id).toBe("valid-skill");
    expect(listed[0]?.tags).toEqual(["test"]);
    expect(bundle.manifest.name).toBe("Valid Skill");
    expect(bundle.body).toContain("Use it well.");
    expect(bundle.rootDir).toBe(resolve(bundledSkillsDir, "valid-skill"));
    expect(listFromSkillsFacade()[0]?.id).toBe("valid-skill");
  });

  test("lists skills sorted by id and skips directories without SKILL.md", () => {
    writeSkill("zeta", validFrontmatter({ id: "zeta" }));
    writeSkill("alpha", validFrontmatter({ id: "alpha" }));
    mkdirSync(join(bundledSkillsDir, "empty-dir"), { recursive: true });

    expect(listBundledSkills().map((skill) => skill.id)).toEqual([
      "alpha",
      "zeta",
    ]);
  });

  test("returns an empty list when the skills directory is missing", () => {
    rmSync(bundledSkillsDir, { recursive: true, force: true });
    expect(existsSync(bundledSkillsDir)).toBe(false);
    expect(listBundledSkills()).toEqual([]);
  });

  test("reports missing required fields, invalid versions, and bad resources", () => {
    const missing = writeSkill("missing-field", {
      ...validFrontmatter({ id: "missing-field" }),
      description: "",
    });
    expect(validateSkillBundle(missing).valid).toBe(false);
    expect(validateSkillBundle(missing).errors[0]).toBeInstanceOf(
      SkillValidationError,
    );

    const version = writeSkill(
      "invalid-version",
      validFrontmatter({ id: "invalid-version", version: "one" }),
    );
    expect(
      validateSkillBundle(version).errors.map((error) => error.field),
    ).toContain("version");

    const { kibiCompatibility: _compat, ...noCompat } = validFrontmatter({
      id: "missing-compat",
    });
    const compatRoot = writeSkill("missing-compat", noCompat);
    expect(
      validateFromSkillsFacade(compatRoot).errors.map((error) => error.field),
    ).toContain("kibiCompatibility");

    const tagsRoot = writeSkill(
      "bad-tags",
      validFrontmatter({ id: "bad-tags", tags: "not-array" }),
    );
    expect(
      validateSkillBundle(tagsRoot).errors.map((error) => error.field),
    ).toContain("tags");

    const resourceRoot = writeSkill(
      "invalid-resource",
      validFrontmatter({
        id: "invalid-resource",
        resources: ["../secret.txt"],
      }),
    );
    expect(
      validateSkillBundle(resourceRoot).errors.map((error) => error.field),
    ).toContain("resources");
  });

  test("accepts prerelease versions and optional tags/resources", () => {
    const rootDir = writeSkill("prerelease", {
      id: "prerelease",
      name: "Valid Skill",
      description: "Loads a valid skill bundle",
      version: "1.0.0-alpha.1",
      kibiCompatibility: ">=0.11.0",
    });
    const bundle = parseSkillBundle(rootDir);
    expect(bundle.manifest.version).toBe("1.0.0-alpha.1");
    expect(bundle.manifest.tags).toBeUndefined();
    expect(bundle.manifest.resources).toBeUndefined();
    expect(validateSkillBundle(rootDir).valid).toBe(true);
  });

  test("reports a missing SKILL.md and missing declared resources", () => {
    const empty = join(bundledSkillsDir, "empty");
    mkdirSync(empty, { recursive: true });
    const missingFile = validateSkillBundle(empty);
    expect(missingFile.valid).toBe(false);
    expect(missingFile.errors[0]?.message).toContain("Missing SKILL.md");

    const rootDir = writeSkill("valid-skill", validFrontmatter());
    const missingResource = validateSkillBundle(rootDir);
    expect(missingResource.valid).toBe(false);
    expect(missingResource.errors.map((error) => error.field)).toContain(
      "resources",
    );
  });

  test("rejects resource traversal, undeclared files, and missing skills", () => {
    writeSkill("valid-skill", validFrontmatter());
    expect(() => loadBundledSkill("missing")).toThrow(SkillNotFoundError);
    expect(() =>
      readBundledSkillResource("valid-skill", "../secret.txt"),
    ).toThrow(SkillResourceOutOfBoundsError);
    expect(() =>
      readBundledSkillResource("valid-skill", "resources/hidden.txt"),
    ).toThrow(SkillResourceNotFoundError);
  });

  test("reads only declared resources and rejects symlink escapes", () => {
    const rootDir = writeSkill("valid-skill", validFrontmatter());
    mkdirSync(join(rootDir, "resources"), { recursive: true });
    writeFileSync(join(rootDir, "resources/example.txt"), "declared");
    writeFileSync(join(rootDir, "resources/hidden.txt"), "hidden");
    expect(readBundledSkillResource("valid-skill", "resources/example.txt")).toBe(
      "declared",
    );

    const symlinkRoot = writeSkill(
      "symlink-skill",
      validFrontmatter({
        id: "symlink-skill",
        resources: ["resources/link.txt"],
      }),
    );
    mkdirSync(join(symlinkRoot, "resources"), { recursive: true });
    mkdirSync(outsideFixturesDir, { recursive: true });
    writeFileSync(join(outsideFixturesDir, "secret.txt"), "secret");
    symlinkSync(
      join(outsideFixturesDir, "secret.txt"),
      join(symlinkRoot, "resources/link.txt"),
    );
    expect(() =>
      readBundledSkillResource("symlink-skill", "resources/link.txt"),
    ).toThrow(SkillResourceOutOfBoundsError);
    expect(validateSkillBundle(symlinkRoot).valid).toBe(false);
  });

  test("rejects oversized SKILL.md and resource files", () => {
    writeSkill(
      "big-skill",
      validFrontmatter({ id: "big-skill" }),
      "x".repeat(256 * 1024 + 1),
    );
    expect(() => loadBundledSkill("big-skill")).toThrow(SkillOversizeError);
    expect(validateSkillBundle(join(bundledSkillsDir, "big-skill")).valid).toBe(
      false,
    );

    const rootDir = writeSkill("valid-skill", validFrontmatter());
    mkdirSync(join(rootDir, "resources"), { recursive: true });
    writeFileSync(
      join(rootDir, "resources/example.txt"),
      "x".repeat(RESOURCE_MAX_BYTES + 1),
    );
    expect(() =>
      readBundledSkillResource("valid-skill", "resources/example.txt"),
    ).toThrow(SkillOversizeError);
    expect(validateSkillBundle(rootDir).valid).toBe(false);
    expect(() =>
      assertMaxBytes(join(rootDir, "resources/example.txt"), RESOURCE_MAX_BYTES),
    ).toThrow(SkillOversizeError);
  });

  test("scoped readers load from an explicit root and ignore facade state", () => {
    const root = mkdtempSync(join(tmpdir(), "kibi-runtime-scoped-"));
    try {
      const facadeRoot = join(root, "facade");
      const scopedRoot = join(root, "scoped");
      const writeFixture = (skillsDir: string, content: string) => {
        mkdirSync(join(skillsDir, "fixture", "resources"), { recursive: true });
        writeFileSync(
          join(skillsDir, "fixture", "SKILL.md"),
          '---\nid: fixture\nname: Fixture\ndescription: Explicit root fixture\nversion: 1.0.0\nkibiCompatibility: ">=0.11.0"\nresources:\n  - resources/guide.md\n---\n# Fixture\n',
        );
        writeFileSync(join(skillsDir, "fixture", "resources/guide.md"), content);
      };
      writeFixture(facadeRoot, "facade resource");
      writeFixture(scopedRoot, "scoped resource");
      setBundledSkillsDir(facadeRoot);

      const bundle = loadBundledSkillFrom(scopedRoot, "fixture");
      expect(bundle.manifest.id).toBe("fixture");
      expect(
        readBundledSkillResourceFrom(scopedRoot, "fixture", "resources/guide.md"),
      ).toBe("scoped resource");
      expect(readBundledSkillResource("fixture", "resources/guide.md")).toBe(
        "facade resource",
      );
      expect(() => loadBundledSkillFrom(scopedRoot, "missing")).toThrow(
        SkillNotFoundError,
      );
      expect(() =>
        readBundledSkillResourceFrom(
          scopedRoot,
          "fixture",
          "resources/hidden.md",
        ),
      ).toThrow(SkillResourceNotFoundError);
      expect(() =>
        readBundledSkillResourceFrom(scopedRoot, "fixture", "../escape.md"),
      ).toThrow(SkillResourceOutOfBoundsError);
      expect(() => loadBundledSkillFrom(join(root, "absent"), "fixture")).toThrow(
        SkillNotFoundError,
      );
    } finally {
      setBundledSkillsDir(bundledSkillsDir);
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("default bundled skills directory contains the canonical usage skill", () => {
    resetBundledSkillsDir();
    const listed = listBundledSkills();
    expect(listed.some((skill) => skill.id === "kibi-usage")).toBe(true);
    const bundle = loadBundledSkill("kibi-usage");
    expect(bundle.body).toContain("# Kibi Usage");
    expect(
      readBundledSkillResource("kibi-usage", "resources/workflows.md"),
    ).toContain("workflow");
    setBundledSkillsDir(bundledSkillsDir);
  });
});
