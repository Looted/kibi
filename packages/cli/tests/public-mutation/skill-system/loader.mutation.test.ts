import { afterEach, describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  SkillNotFoundError,
  SkillOversizeError,
  SkillResourceNotFoundError,
  SkillResourceOutOfBoundsError,
} from "../../../src/public/skill-system/errors.js";
import {
  listBundledSkills,
  loadBundledSkill,
  loadBundledSkillFrom,
  readBundledSkillResource,
  readBundledSkillResourceFrom,
  resetBundledSkillsDir,
  setBundledSkillsDir,
} from "../../../src/public/skill-system/loader.js";

const BUNDLED_DIR = resolve(import.meta.dir, "../../../src/public/skills");
const roots: string[] = [];

afterEach(() => {
  resetBundledSkillsDir();
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function tempDir(): string {
  const root = mkdtempSync(join(tmpdir(), "kibi-skill-loader-"));
  roots.push(root);
  return root;
}

function writeSkill(
  dir: string,
  folder: string,
  id: string,
  resources: readonly string[] = [],
  files: Record<string, string> = {},
): string {
  const root = join(dir, folder);
  mkdirSync(root, { recursive: true });
  const listed =
    resources.length === 0
      ? ""
      : `resources:\n${resources.map((r) => `  - ${r}`).join("\n")}\n`;
  writeFileSync(
    join(root, "SKILL.md"),
    `---\nid: ${id}\nname: ${id} name\ndescription: d\nversion: 1.0.0\nkibiCompatibility: ">=1"\n${listed}---\nbody of ${id}\n`,
  );
  for (const [file, content] of Object.entries(files)) {
    mkdirSync(join(root, file, ".."), { recursive: true });
    writeFileSync(join(root, file), content);
  }
  return root;
}

function skillsDir(): string {
  const dir = tempDir();
  writeSkill(
    dir,
    "b-folder",
    "skill-b",
    ["refs/note.md", "big.md", "gone.md", "link.md"],
    {
      "refs/note.md": "note é",
      "big.md": "x".repeat(128 * 1024 + 1),
      "undeclared.md": "u",
    },
  );
  writeSkill(dir, "a-folder", "skill-c");
  writeSkill(dir, "z-folder", "skill-a");
  mkdirSync(join(dir, "no-skill-file"));
  writeFileSync(join(dir, "loose-file.md"), "not a skill");
  return dir;
}

describe("bundled skills directory", () => {
  test("defaults to the packaged skills", () => {
    const expected = readdirSync(BUNDLED_DIR).sort();
    expect(listBundledSkills().map((skill) => skill.id)).toStrictEqual(
      expected,
    );
    const first = expected[0] as string;
    expect(loadBundledSkill(first).rootDir).toBe(join(BUNDLED_DIR, first));
  });

  test("can be redirected and reset", () => {
    const dir = skillsDir();
    setBundledSkillsDir(dir);
    expect(listBundledSkills().map((skill) => skill.id)).toStrictEqual([
      "skill-a",
      "skill-b",
      "skill-c",
    ]);
    expect(loadBundledSkill("skill-b").body).toBe("body of skill-b\n");
    expect(readBundledSkillResource("skill-b", "refs/note.md")).toBe("note é");
    resetBundledSkillsDir();
    expect(listBundledSkills().map((skill) => skill.id)).toStrictEqual(
      readdirSync(BUNDLED_DIR).sort(),
    );
  });

  test("lists nothing for a missing directory", () => {
    setBundledSkillsDir(join(tempDir(), "missing"));
    expect(listBundledSkills()).toStrictEqual([]);
    expect(() => loadBundledSkill("skill-a")).toThrow(
      new SkillNotFoundError("skill-a"),
    );
  });
});

describe("loadBundledSkillFrom", () => {
  test("finds a skill by manifest id, not folder name", () => {
    const dir = skillsDir();
    const bundle = loadBundledSkillFrom(dir, "skill-a");
    expect(bundle.rootDir).toBe(join(dir, "z-folder"));
    expect(bundle.manifest.name).toBe("skill-a name");
  });

  test("resolves a relative skills directory", () => {
    const dir = skillsDir();
    const relative = join(
      ...Array(process.cwd().split("/").length).fill(".."),
      dir,
    );
    expect(loadBundledSkillFrom(relative, "skill-a").rootDir).toBe(
      join(dir, "z-folder"),
    );
  });

  test("ignores symlinked skill folders", () => {
    const dir = skillsDir();
    const elsewhere = tempDir();
    writeSkill(elsewhere, "linked", "skill-linked");
    symlinkSync(join(elsewhere, "linked"), join(dir, "linked"));
    expect(() => loadBundledSkillFrom(dir, "skill-linked")).toThrow(
      new SkillNotFoundError("skill-linked"),
    );
    setBundledSkillsDir(dir);
    expect(listBundledSkills().map((skill) => skill.id)).toStrictEqual([
      "skill-a",
      "skill-b",
      "skill-c",
    ]);
  });

  test("throws for an unknown id", () => {
    expect(() => loadBundledSkillFrom(skillsDir(), "nope")).toThrow(
      new SkillNotFoundError("nope"),
    );
  });
});

describe("readBundledSkillResourceFrom", () => {
  test("reads a declared resource as UTF-8 text", () => {
    const dir = skillsDir();
    expect(readBundledSkillResourceFrom(dir, "skill-b", "refs/note.md")).toBe(
      "note é",
    );
    expect(
      readBundledSkillResourceFrom(dir, "skill-b", "./refs/../refs/note.md"),
    ).toBe("note é");
  });

  test("rejects paths that escape the bundle", () => {
    const dir = skillsDir();
    for (const path of ["../a-folder/SKILL.md", "/etc/hosts"]) {
      expect(() => readBundledSkillResourceFrom(dir, "skill-b", path)).toThrow(
        new SkillResourceOutOfBoundsError("skill-b", path),
      );
    }
  });

  test("rejects undeclared resources and skills without resources", () => {
    const dir = skillsDir();
    let caught: unknown;
    try {
      readBundledSkillResourceFrom(dir, "skill-b", "undeclared.md");
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(SkillResourceNotFoundError);
    expect((caught as Error).message).toBe(
      "Skill resource not found: skill-b/undeclared.md",
    );
    expect(() => readBundledSkillResourceFrom(dir, "skill-a", "x.md")).toThrow(
      SkillResourceNotFoundError,
    );
  });

  test("reports a declared resource that does not exist as not found", () => {
    const dir = skillsDir();
    let caught: unknown;
    try {
      readBundledSkillResourceFrom(dir, "skill-b", "gone.md");
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(SkillResourceNotFoundError);
    expect((caught as Error).message).toBe(
      "Skill resource not found: skill-b/gone.md",
    );
  });

  test("rejects a declared resource that links outside the bundle", () => {
    const dir = skillsDir();
    const outside = tempDir();
    writeFileSync(join(outside, "secret.md"), "secret");
    symlinkSync(join(outside, "secret.md"), join(dir, "b-folder", "link.md"));
    let caught: unknown;
    try {
      readBundledSkillResourceFrom(dir, "skill-b", "link.md");
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(SkillResourceOutOfBoundsError);
    expect((caught as Error).message).toBe(
      "Skill resource escapes bundle root: skill-b/link.md",
    );
  });

  test("rejects an oversize resource", () => {
    const dir = skillsDir();
    expect(() =>
      readBundledSkillResourceFrom(dir, "skill-b", "big.md"),
    ).toThrow(SkillOversizeError);
    expect(readFileSync(join(dir, "b-folder", "big.md")).length).toBe(
      128 * 1024 + 1,
    );
  });
});
