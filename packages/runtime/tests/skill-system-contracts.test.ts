// Behavioral contracts for the runtime skill subsystem and skill operations.
// Each assertion pins observable output, error contracts, or boundary
// semantics; the mutation suite (bun run test:mutation) fails if any of these
// contracts can be broken without a test noticing.
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  spyOn,
  test,
} from "bun:test";
import * as fs from "node:fs";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { OperationContext } from "kibi-cli/operations/runtime-types";

import {
  skillsListSpec,
  skillsLoadSpec,
  skillsReadSpec,
} from "../src/skill-operations.js";
import {
  SkillOversizeError,
  SkillResourceNotFoundError,
  SkillResourceOutOfBoundsError,
  SkillValidationError,
} from "../src/skill-system/errors.js";
import {
  listBundledSkills,
  loadBundledSkill,
  readBundledSkillResource,
  resetBundledSkillsDir,
  setBundledSkillsDir,
} from "../src/skill-system/loader.js";
import {
  SKILL_FILE_NAME,
  isWithinRoot,
  resolveSkillFilePath,
} from "../src/skill-system/paths.js";
import {
  RESOURCE_MAX_BYTES,
  assertMaxBytes,
  parseSkillBundle,
  validateSkillBundle,
} from "../src/skill-system/validation.js";

function testContext(): OperationContext {
  return {
    workspaceRoot: process.cwd(),
    signal: new AbortController().signal,
    clock: () => new Date(),
  };
}

let fixtureRoot: string;
let outsideRoot: string;

beforeEach(() => {
  fixtureRoot = mkdtempSync(join(tmpdir(), "kibi-runtime-contracts-"));
  outsideRoot = mkdtempSync(join(tmpdir(), "kibi-runtime-contracts-out-"));
  setBundledSkillsDir(fixtureRoot);
});

afterEach(() => {
  rmSync(fixtureRoot, { recursive: true, force: true });
  rmSync(outsideRoot, { recursive: true, force: true });
});

afterAll(() => {
  resetBundledSkillsDir();
});

function writeSkill(
  id: string,
  frontmatter: Record<string, unknown>,
  body = "Skill body",
): string {
  const rootDir = join(fixtureRoot, id);
  mkdirSync(rootDir, { recursive: true });
  const yaml = Object.entries(frontmatter)
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join("\n");
  writeFileSync(join(rootDir, SKILL_FILE_NAME), `---\n${yaml}\n---\n${body}\n`);
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

describe("skill size boundary semantics", () => {
  test("a file exactly at the limit passes and one byte over fails", () => {
    const atLimit = join(fixtureRoot, "at-limit.bin");
    const overLimit = join(fixtureRoot, "over-limit.bin");
    writeFileSync(atLimit, "x".repeat(RESOURCE_MAX_BYTES));
    writeFileSync(overLimit, "x".repeat(RESOURCE_MAX_BYTES + 1));

    expect(() => assertMaxBytes(atLimit, RESOURCE_MAX_BYTES)).not.toThrow();
    try {
      assertMaxBytes(overLimit, RESOURCE_MAX_BYTES);
      throw new Error("expected assertMaxBytes to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(SkillOversizeError);
      expect((error as SkillOversizeError).message).toBe(
        `Skill file exceeds ${RESOURCE_MAX_BYTES} bytes: ${overLimit} (${RESOURCE_MAX_BYTES + 1} bytes)`,
      );
    }
  });
});

describe("skill manifest validation contracts", () => {
  test("parseSkillBundle rejects an invalid manifest", () => {
    const rootDir = writeSkill("broken", validFrontmatter({ description: "" }));
    expect(() => parseSkillBundle(rootDir)).toThrow(
      new SkillValidationError(
        "description",
        "Missing required skill field: description",
      ),
    );
  });

  test("manifest omits absent optional keys instead of carrying undefined", () => {
    const {
      tags: _tags,
      resources: _resources,
      ...noOptional
    } = validFrontmatter();
    const bundle = parseSkillBundle(writeSkill("bare", noOptional));
    expect("tags" in bundle.manifest).toBe(false);
    expect("resources" in bundle.manifest).toBe(false);
    expect(
      "tags" in
        parseSkillBundle(writeSkill("tagged", validFrontmatter())).manifest,
    ).toBe(true);
  });

  test("whitespace-only required fields count as missing", () => {
    const rootDir = writeSkill(
      "blank",
      validFrontmatter({ description: "   " }),
    );
    const result = validateSkillBundle(rootDir);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.field).toBe("description");
    expect(result.errors[0]?.message).toBe(
      "Missing required skill field: description",
    );
  });

  test("a missing version yields exactly the required-field error", () => {
    const { version: _version, ...noVersion } = validFrontmatter();
    const rootDir = writeSkill("no-version", noVersion);
    const result = validateSkillBundle(rootDir);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.field).toBe("version");
    expect(result.errors[0]?.message).toBe(
      "Missing required skill field: version",
    );
  });

  test("a version with a non-numeric prefix is invalid", () => {
    const rootDir = writeSkill(
      "prefixed",
      validFrontmatter({ id: "prefixed", version: "x1.0.0" }),
    );
    const result = validateSkillBundle(rootDir);
    expect(result.errors.map((error) => error.message)).toContain(
      "Invalid skill version: x1.0.0",
    );
  });

  test("a version with trailing garbage is invalid", () => {
    const rootDir = writeSkill(
      "garbagey",
      validFrontmatter({ id: "garbagey", version: "1.0.0x" }),
    );
    const result = validateSkillBundle(rootDir);
    expect(result.errors.map((error) => error.message)).toContain(
      "Invalid skill version: 1.0.0x",
    );
  });

  test("multi-digit major versions are valid", () => {
    const {
      tags: _tags,
      resources: _resources,
      ...noOptional
    } = validFrontmatter({
      id: "majory",
      version: "10.0.0",
    });
    const rootDir = writeSkill("majory", noOptional);
    expect(validateSkillBundle(rootDir).valid).toBe(true);
  });

  test("multi-digit minor versions are valid", () => {
    const {
      tags: _tags,
      resources: _resources,
      ...noOptional
    } = validFrontmatter({
      id: "minory",
      version: "1.10.0",
    });
    const rootDir = writeSkill("minory", noOptional);
    expect(validateSkillBundle(rootDir).valid).toBe(true);
  });

  test("multi-digit patch versions are valid", () => {
    const {
      tags: _tags,
      resources: _resources,
      ...noOptional
    } = validFrontmatter({
      id: "patchy",
      version: "1.0.44",
    });
    const rootDir = writeSkill("patchy", noOptional);
    expect(validateSkillBundle(rootDir).valid).toBe(true);
  });

  test("a non-semver version reports the offending value", () => {
    const rootDir = writeSkill(
      "wordy",
      validFrontmatter({ id: "wordy", version: "one" }),
    );
    const result = validateSkillBundle(rootDir);
    expect(result.errors.map((error) => error.message)).toContain(
      "Invalid skill version: one",
    );
  });

  test("arrays with non-string members are rejected", () => {
    const mixedTags = writeSkill(
      "mixed-tags",
      validFrontmatter({ id: "mixed-tags", tags: ["ok", 42] }),
    );
    expect(
      validateSkillBundle(mixedTags).errors.map((error) => error.message),
    ).toContain("Skill tags must be strings");

    const mixedResources = writeSkill(
      "mixed-resources",
      validFrontmatter({ id: "mixed-resources", resources: ["ok", 42] }),
    );
    expect(
      validateSkillBundle(mixedResources).errors.map((error) => error.message),
    ).toContain("Skill resources must be strings");
  });

  test("a missing SKILL.md reports the SKILL.md field", () => {
    const empty = join(fixtureRoot, "empty");
    mkdirSync(empty, { recursive: true });
    const result = validateSkillBundle(empty);
    expect(result.errors[0]?.field).toBe("SKILL.md");
    expect(result.errors[0]?.message).toBe("Missing SKILL.md");
  });

  test("an invalid manifest skips content validation entirely", () => {
    const rootDir = writeSkill(
      "invalid-and-huge",
      validFrontmatter({ description: "" }),
      "x".repeat(256 * 1024 + 1),
    );
    const result = validateSkillBundle(rootDir);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.field).toBe("description");
  });

  test("an oversized SKILL.md is reported with the oversize contract", () => {
    const rootDir = writeSkill(
      "huge",
      validFrontmatter({ id: "huge" }),
      "x".repeat(256 * 1024 + 1),
    );
    mkdirSync(join(rootDir, "resources"), { recursive: true });
    writeFileSync(join(rootDir, "resources/example.txt"), "declared");
    const result = validateSkillBundle(rootDir);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.field).toBe("SKILL.md");
    expect(result.errors[0]?.message).toContain("exceeds");
  });

  test("a failing realpath on the bundle reports the SKILL.md field", () => {
    const rootDir = writeSkill("valid-skill", validFrontmatter());
    const realpath = spyOn(fs, "realpathSync").mockImplementation(() => {
      throw new Error("broken realpath");
    });
    try {
      const result = validateSkillBundle(rootDir);
      expect(result.errors[0]?.field).toBe("SKILL.md");
      expect(result.errors[0]?.message).toContain("broken realpath");
    } finally {
      realpath.mockRestore();
    }
  });

  test("a missing declared resource reports the exact resource", () => {
    const rootDir = writeSkill("valid-skill", validFrontmatter());
    const result = validateSkillBundle(rootDir);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.field).toBe("resources");
    expect(result.errors[0]?.message).toBe(
      "Missing skill resource: resources/example.txt",
    );
  });

  test("a bundle with an existing declared resource validates clean", () => {
    const rootDir = writeSkill("valid-skill", validFrontmatter());
    mkdirSync(join(rootDir, "resources"), { recursive: true });
    writeFileSync(join(rootDir, "resources/example.txt"), "declared");
    const result = validateSkillBundle(rootDir);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test("a declared resource escaping the bundle root is reported exactly", () => {
    const rootDir = writeSkill(
      "escape",
      validFrontmatter({ id: "escape", resources: ["resources/link.txt"] }),
    );
    mkdirSync(join(rootDir, "resources"), { recursive: true });
    writeFileSync(join(outsideRoot, "secret.txt"), "secret");
    symlinkSync(
      join(outsideRoot, "secret.txt"),
      join(rootDir, "resources/link.txt"),
    );
    const result = validateSkillBundle(rootDir);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.field).toBe("resources");
    expect(result.errors[0]?.message).toBe(
      "Skill resource escapes bundle root: resources/link.txt",
    );
  });

  test("an oversized declared resource is reported with the oversize contract", () => {
    const rootDir = writeSkill("valid-skill", validFrontmatter());
    mkdirSync(join(rootDir, "resources"), { recursive: true });
    writeFileSync(
      join(rootDir, "resources/example.txt"),
      "x".repeat(RESOURCE_MAX_BYTES + 1),
    );
    const result = validateSkillBundle(rootDir);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.field).toBe("resources");
    expect(result.errors[0]?.message).toContain("exceeds");
  });

  test("out-of-bounds declared resources are reported with their path", () => {
    const rootDir = writeSkill(
      "traversal",
      validFrontmatter({ id: "traversal", resources: ["../secret.txt"] }),
    );
    const result = validateSkillBundle(rootDir);
    expect(result.errors.map((error) => error.message)).toContain(
      "Invalid skill resource: ../secret.txt",
    );
  });

  test("readBundle rejects undeclared resources that exist on disk", () => {
    const rootDir = writeSkill("valid-skill", validFrontmatter());
    mkdirSync(join(rootDir, "resources"), { recursive: true });
    writeFileSync(join(rootDir, "resources/example.txt"), "declared");
    writeFileSync(join(rootDir, "resources/hidden.txt"), "hidden");
    try {
      readBundledSkillResource("valid-skill", "resources/hidden.txt");
      throw new Error("expected readBundledSkillResource to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(SkillResourceNotFoundError);
      expect((error as SkillResourceNotFoundError).message).toBe(
        "Skill resource not found: valid-skill/resources/hidden.txt",
      );
    }
  });

  test("readBundle enforces the resource size limit", () => {
    const rootDir = writeSkill("valid-skill", validFrontmatter());
    mkdirSync(join(rootDir, "resources"), { recursive: true });
    writeFileSync(
      join(rootDir, "resources/example.txt"),
      "x".repeat(RESOURCE_MAX_BYTES + 1),
    );
    expect(() =>
      readBundledSkillResource("valid-skill", "resources/example.txt"),
    ).toThrow(SkillOversizeError);
  });

  test("readBundle converts realpath failures into missing-resource errors", () => {
    const rootDir = writeSkill("valid-skill", validFrontmatter());
    mkdirSync(join(rootDir, "resources"), { recursive: true });
    writeFileSync(join(rootDir, "resources/example.txt"), "declared");
    const candidate = join(rootDir, "resources/example.txt");
    const original = fs.realpathSync;
    const realpath = spyOn(fs, "realpathSync").mockImplementation(((
      path: fs.PathLike,
    ) => {
      if (path === candidate) throw new Error("candidate realpath unavailable");
      return original(path);
    }) as typeof fs.realpathSync);
    try {
      try {
        readBundledSkillResource("valid-skill", "resources/example.txt");
        throw new Error("expected readBundledSkillResource to throw");
      } catch (error) {
        expect(error).toBeInstanceOf(SkillResourceNotFoundError);
        expect((error as SkillResourceNotFoundError).message).toBe(
          "Skill resource not found: valid-skill/resources/example.txt",
        );
      }
    } finally {
      realpath.mockRestore();
    }
  });
});

describe("skill directory listing and resolution contracts", () => {
  test("directories without SKILL.md are skipped when resolving an id", () => {
    writeSkill("valid-skill", validFrontmatter());
    mkdirSync(join(fixtureRoot, "half-baked"), { recursive: true });
    const bundle = loadBundledSkill("valid-skill");
    expect(bundle.manifest.id).toBe("valid-skill");
  });

  test("symlinked skill directories are not listed as bundles", () => {
    const rootDir = writeSkill("valid-skill", validFrontmatter());
    symlinkSync(rootDir, join(fixtureRoot, "aliased"));
    expect(listBundledSkills().map((skill) => skill.id)).toEqual([
      "valid-skill",
    ]);
  });

  test("resolveSkillFilePath descends into directories named SKILL.md", () => {
    const outer = join(fixtureRoot, "nested", SKILL_FILE_NAME);
    mkdirSync(outer, { recursive: true });
    writeFileSync(join(outer, SKILL_FILE_NAME), "inner");
    expect(resolveSkillFilePath(outer)).toBe(join(outer, SKILL_FILE_NAME));
  });

  test("a child directory is always within its root", () => {
    const root = resolve(fixtureRoot);
    expect(isWithinRoot(root, join(root, "Stryker was here!"))).toBe(true);
  });
});

describe("bundled skill operations", () => {
  test("list announces ids joined with commas and a text content type", async () => {
    writeSkill("zeta", validFrontmatter({ id: "zeta" }));
    writeSkill("alpha", validFrontmatter({ id: "alpha" }));
    const result = await skillsListSpec.execute({}, testContext());
    expect(result.content[0]?.type).toBe("text");
    expect(result.content[0]?.text).toBe("Found 2 bundled skills: alpha, zeta");
  });

  test("load rejects non-string ids with the field contract", async () => {
    await expect(
      skillsLoadSpec.execute({ id: 42 }, testContext()),
    ).rejects.toThrow("id must be a non-empty string");
  });

  test("load joins a two-resource roster with commas", async () => {
    const { tags: _tags, ...noOptional } = validFrontmatter({
      id: "two-resources",
      resources: ["resources/first.txt", "resources/second.txt"],
    });
    const rootDir = writeSkill("two-resources", noOptional);
    mkdirSync(join(rootDir, "resources"), { recursive: true });
    writeFileSync(join(rootDir, "resources/first.txt"), "first");
    writeFileSync(join(rootDir, "resources/second.txt"), "second");

    const result = await skillsLoadSpec.execute(
      { id: "two-resources" },
      testContext(),
    );
    expect(result.content[0]?.text).toBe(
      "Loaded bundled skill two-resources with 2 resources: resources/first.txt, resources/second.txt",
    );
  });

  test("load announces an empty resource roster as none", async () => {
    const {
      tags: _tags,
      resources: _resources,
      ...noOptional
    } = validFrontmatter({
      id: "bare",
    });
    writeSkill("bare", noOptional);
    const result = await skillsLoadSpec.execute({ id: "bare" }, testContext());
    expect(result.content[0]?.type).toBe("text");
    expect(result.content[0]?.text).toBe(
      "Loaded bundled skill bare with 0 resources: none",
    );
    expect(result.structuredContent?.resources).toEqual([]);
  });

  test("load announces multiple resources joined with commas", async () => {
    writeSkill("alpha", validFrontmatter({ id: "alpha" }));
    const result = await skillsLoadSpec.execute({ id: "alpha" }, testContext());
    expect(result.content[0]?.type).toBe("text");
    expect(result.content[0]?.text).toBe(
      "Loaded bundled skill alpha with 1 resources: resources/example.txt",
    );
  });

  test("read enforces non-empty string fields and a text content type", async () => {
    writeSkill("valid-skill", validFrontmatter());
    mkdirSync(join(fixtureRoot, "valid-skill", "resources"), {
      recursive: true,
    });
    writeFileSync(
      join(fixtureRoot, "valid-skill", "resources/example.txt"),
      "declared",
    );

    await expect(
      skillsReadSpec.execute(
        { id: 42, resource: "resources/example.txt" },
        testContext(),
      ),
    ).rejects.toThrow("id must be a non-empty string");
    await expect(
      skillsReadSpec.execute(
        { id: "", resource: "resources/example.txt" },
        testContext(),
      ),
    ).rejects.toThrow("id must be a non-empty string");
    await expect(
      skillsReadSpec.execute(
        { id: "valid-skill", resource: 42 },
        testContext(),
      ),
    ).rejects.toThrow("resource must be a non-empty string");
    await expect(
      skillsReadSpec.execute(
        { id: "valid-skill", resource: "  " },
        testContext(),
      ),
    ).rejects.toThrow("resource must be a non-empty string");

    const result = await skillsReadSpec.execute(
      { id: "valid-skill", resource: "resources/example.txt" },
      testContext(),
    );
    expect(result.content[0]?.type).toBe("text");
    expect(result.content[0]?.text).toBe(
      "Read bundled skill resource valid-skill/resources/example.txt",
    );
  });
});

describe("skill error message contracts", () => {
  test("out-of-bounds resource errors name the skill and path", () => {
    writeSkill("valid-skill", validFrontmatter());
    try {
      readBundledSkillResource("valid-skill", "../secret.txt");
      throw new Error("expected readBundledSkillResource to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(SkillResourceOutOfBoundsError);
      expect((error as SkillResourceOutOfBoundsError).message).toBe(
        "Skill resource escapes bundle root: valid-skill/../secret.txt",
      );
    }
  });
});
