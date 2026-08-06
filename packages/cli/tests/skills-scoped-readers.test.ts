import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  SkillNotFoundError,
  SkillResourceNotFoundError,
  SkillResourceOutOfBoundsError,
  loadBundledSkillFrom,
  readBundledSkillResource,
  readBundledSkillResourceFrom,
  resetBundledSkillsDir,
  setBundledSkillsDir,
} from "../src/public/skills";

let root = "";

function writeFixture(
  skillsDir: string,
  resourceContent = "fixture resource",
): void {
  const skillRoot = join(skillsDir, "fixture");
  mkdirSync(join(skillRoot, "resources"), { recursive: true });
  writeFileSync(
    join(skillRoot, "SKILL.md"),
    '---\nid: fixture\nname: Fixture\ndescription: Explicit root fixture\nversion: 1.0.0\nkibiCompatibility: ">=0.11.0"\nresources:\n  - resources/guide.md\n---\n# Fixture\n',
  );
  writeFileSync(join(skillRoot, "resources/guide.md"), resourceContent);
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "kibi-scoped-skill-readers-"));
});

afterEach(() => {
  resetBundledSkillsDir();
  rmSync(root, { recursive: true, force: true });
});

describe("scoped skill readers", () => {
  test("loads a skill from its explicit root", () => {
    // Given: a standalone skill directory outside the facade configuration.
    writeFixture(root);

    // When: the scoped loader resolves the fixture.
    const bundle = loadBundledSkillFrom(root, "fixture");

    // Then: the requested manifest is returned.
    expect(bundle.manifest.id).toBe("fixture");
  });

  test("reads a declared resource from its explicit root", () => {
    // Given: a standalone skill directory with one declared resource.
    writeFixture(root);

    // When: the scoped reader loads that resource.
    const content = readBundledSkillResourceFrom(
      root,
      "fixture",
      "resources/guide.md",
    );

    // Then: it returns the declared content.
    expect(content).toBe("fixture resource");
  });

  test("does not use the facade configured root", () => {
    // Given: same-id fixtures with different resources in scoped and facade roots.
    const facadeRoot = join(root, "facade");
    const scopedRoot = join(root, "scoped");
    writeFixture(facadeRoot, "facade resource");
    writeFixture(scopedRoot, "scoped resource");
    setBundledSkillsDir(facadeRoot);

    // When: the scoped reader receives its own root.
    const content = readBundledSkillResourceFrom(
      scopedRoot,
      "fixture",
      "resources/guide.md",
    );

    // Then: it reads only that root, not mutable facade state.
    expect(content).toBe("scoped resource");
    expect(readBundledSkillResource("fixture", "resources/guide.md")).toBe(
      "facade resource",
    );
  });

  test("rejects unknown skills from its explicit root", () => {
    // Given: an explicit root without the requested skill.
    writeFixture(root);

    // When / Then: the scoped loader keeps the public missing-skill error.
    expect(() => loadBundledSkillFrom(root, "missing")).toThrow(
      SkillNotFoundError,
    );
  });

  test("rejects undeclared resources from its explicit root", () => {
    // Given: an explicit root whose manifest declares only one resource.
    writeFixture(root);
    writeFileSync(join(root, "fixture/resources/hidden.md"), "hidden");

    // When / Then: the scoped reader preserves declaration enforcement.
    expect(() =>
      readBundledSkillResourceFrom(root, "fixture", "resources/hidden.md"),
    ).toThrow(SkillResourceNotFoundError);
  });

  test("rejects traversal from its explicit root", () => {
    // Given: an explicit root with a valid skill.
    writeFixture(root);

    // When / Then: traversal cannot escape the scoped bundle.
    expect(() =>
      readBundledSkillResourceFrom(root, "fixture", "../escape.md"),
    ).toThrow(SkillResourceOutOfBoundsError);
  });
});
