import { afterEach, describe, expect, spyOn, test } from "bun:test";
import * as fs from "node:fs";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  SkillOversizeError,
  SkillValidationError,
} from "../../../src/public/skill-system/errors.js";
import {
  RESOURCE_MAX_BYTES,
  assertMaxBytes,
  parseSkillBundle,
  validateSkillBundle,
} from "../../../src/public/skill-system/validation.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function tempDir(): string {
  const root = mkdtempSync(join(tmpdir(), "kibi-skill-validation-"));
  roots.push(root);
  return root;
}

const VALID = {
  id: "kibi-x",
  name: "X",
  description: "Does x",
  version: "1.2.3",
  kibiCompatibility: ">=1",
};

function frontmatter(data: Record<string, unknown>): string {
  return `---\n${Object.entries(data)
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join("\n")}\n---\n`;
}

function skill(
  data: Record<string, unknown>,
  body = "Body é\n",
  files: Record<string, string> = {},
): string {
  const root = tempDir();
  writeFileSync(join(root, "SKILL.md"), `${frontmatter(data)}${body}`);
  for (const [file, content] of Object.entries(files)) {
    mkdirSync(join(root, file, ".."), { recursive: true });
    writeFileSync(join(root, file), content);
  }
  return root;
}

function errorsOf(root: string): Array<[string, string]> {
  return validateSkillBundle(root).errors.map((error) => {
    expect(error).toBeInstanceOf(SkillValidationError);
    return [error.field, error.message];
  });
}

describe("assertMaxBytes", () => {
  test("accepts a file at the limit and rejects one byte more", () => {
    const root = tempDir();
    const file = join(root, "f");
    writeFileSync(file, "12345");
    expect(() => assertMaxBytes(file, 5)).not.toThrow();
    let caught: unknown;
    try {
      assertMaxBytes(file, 4);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(SkillOversizeError);
    expect((caught as Error).message).toBe(
      `Skill file exceeds 4 bytes: ${file} (5 bytes)`,
    );
  });

  test("bounds resources at 128 KiB", () => {
    expect(RESOURCE_MAX_BYTES).toBe(131072);
  });
});

describe("parseSkillBundle", () => {
  test("parses a valid bundle", () => {
    const root = skill({ ...VALID, tags: ["a"], resources: ["./r/x.md"] });
    expect(parseSkillBundle(root)).toStrictEqual({
      manifest: { ...VALID, tags: ["a"], resources: ["r/x.md"] },
      body: "Body é\n",
      rootDir: root,
    });
  });

  test("omits absent tags and resources", () => {
    const root = skill(VALID);
    expect(parseSkillBundle(root).manifest).toStrictEqual(VALID);
  });

  test("throws the first validation error", () => {
    const root = skill({ ...VALID, id: "" });
    expect(() => parseSkillBundle(root)).toThrow(
      new SkillValidationError("id", "Missing required skill field: id"),
    );
  });

  test("rejects an oversize SKILL.md", () => {
    const root = skill(VALID, "x".repeat(256 * 1024));
    expect(() => parseSkillBundle(root)).toThrow(SkillOversizeError);
  });

  test("accepts a SKILL.md at exactly 256 KiB", () => {
    const head = frontmatter(VALID);
    const root = skill(VALID, "x".repeat(256 * 1024 - head.length));
    expect(parseSkillBundle(root).manifest.id).toBe("kibi-x");
  });
});

describe("nested host metadata", () => {
  const nested = {
    name: "X",
    description: "Does x",
    license: "MIT",
    metadata: {
      id: "kibi-x",
      version: "1.2.3",
      kibiCompatibility: ">=1",
      tags: ["a"],
      resources: ["r.md"],
    },
  };

  test("reads the Kibi fields a host mirror nests under metadata", () => {
    const root = skill(nested, "Body\n", { "r.md": "r" });
    expect(validateSkillBundle(root)).toStrictEqual({
      valid: true,
      errors: [],
    });
    expect(parseSkillBundle(root).manifest).toStrictEqual({
      id: "kibi-x",
      name: "X",
      description: "Does x",
      version: "1.2.3",
      kibiCompatibility: ">=1",
      tags: ["a"],
      resources: ["r.md"],
    });
  });

  test("a top-level field wins over a nested one", () => {
    const root = skill({ ...nested, version: "2.0.0" }, "Body\n", {
      "r.md": "r",
    });
    expect(parseSkillBundle(root).manifest.version).toBe("2.0.0");
  });

  test("validates nested fields like top-level ones", () => {
    const root = skill({
      ...nested,
      metadata: { ...nested.metadata, version: "x", resources: undefined },
    });
    expect(
      validateSkillBundle(root).errors.map((error) => error.message),
    ).toStrictEqual(["Invalid skill version: x"]);
  });

  test.each([null, ["id"], "kibi-x"])(
    "ignores a metadata value that is not a mapping (%p)",
    (metadata) => {
      const root = skill({ ...VALID, metadata });
      expect(parseSkillBundle(root).manifest.id).toBe("kibi-x");
      expect(
        validateSkillBundle(skill({ name: "X", description: "d", metadata }))
          .valid,
      ).toBe(false);
    },
  );

  test("accepts the shipped Claude Code and ZCode mirrors", () => {
    for (const host of ["claude", "zcode"])
      expect(
        validateSkillBundle(
          join(import.meta.dir, `../../../../${host}/skills/kibi-usage`),
        ).errors,
      ).toStrictEqual([]);
  });
});

describe("validateSkillBundle", () => {
  test("reports a missing SKILL.md", () => {
    const root = tempDir();
    expect(errorsOf(root)).toStrictEqual([["SKILL.md", "Missing SKILL.md"]]);
    expect(validateSkillBundle(root).valid).toBe(false);
  });

  test("accepts a valid bundle with resources", () => {
    const root = skill({ ...VALID, resources: ["r/x.md"] }, "b", {
      "r/x.md": "x",
    });
    expect(validateSkillBundle(root)).toStrictEqual({
      valid: true,
      errors: [],
    });
    expect(validateSkillBundle(join(root, "SKILL.md")).valid).toBe(true);
  });

  test("accepts a valid bundle without resources", () => {
    expect(validateSkillBundle(skill(VALID))).toStrictEqual({
      valid: true,
      errors: [],
    });
  });

  test("reports every missing or blank required field", () => {
    expect(errorsOf(skill({ name: "  ", version: 7 }))).toStrictEqual([
      ["id", "Missing required skill field: id"],
      ["name", "Missing required skill field: name"],
      ["description", "Missing required skill field: description"],
      ["version", "Missing required skill field: version"],
      ["kibiCompatibility", "Missing required skill field: kibiCompatibility"],
    ]);
  });

  test.each(["1.2.3", "10.20.30", "1.2.3-beta.1", "1.2.3+build-7", "1.2.3-a"])(
    "accepts version %p",
    (version) => {
      expect(errorsOf(skill({ ...VALID, version }))).toStrictEqual([]);
    },
  );

  test.each([
    "v1.2.3",
    "1.2.3x",
    "1.2",
    "1.2.3-",
    "1.2.3_x",
    "1.2.3xab",
    "1.2.3-a!",
    "a.2.3",
  ])("rejects version %p", (version) => {
    expect(errorsOf(skill({ ...VALID, version }))).toStrictEqual([
      ["version", `Invalid skill version: ${version}`],
    ]);
  });

  test("reports non-string tags and resources", () => {
    expect(
      errorsOf(skill({ ...VALID, tags: ["a", 1], resources: "r.md" })),
    ).toStrictEqual([
      ["tags", "Skill tags must be strings"],
      ["resources", "Skill resources must be strings"],
    ]);
  });

  test("reports resources that escape the bundle by name", () => {
    expect(
      errorsOf(skill({ ...VALID, resources: ["../x.md", "/abs.md"] })),
    ).toStrictEqual([
      ["resources", "Invalid skill resource: ../x.md"],
      ["resources", "Invalid skill resource: /abs.md"],
    ]);
  });

  test("marks a bundle with errors invalid", () => {
    expect(validateSkillBundle(skill({ ...VALID, id: "" })).valid).toBe(false);
  });

  test("skips content checks while the manifest is invalid", () => {
    expect(
      errorsOf(skill({ ...VALID, id: "", resources: ["missing.md"] })),
    ).toStrictEqual([["id", "Missing required skill field: id"]]);
  });

  test("reports missing, escaping and oversize resources", () => {
    const outside = tempDir();
    writeFileSync(join(outside, "secret.md"), "s");
    const root = skill(
      { ...VALID, resources: ["missing.md", "link.md", "big.md", "ok.md"] },
      "b",
      { "big.md": "x".repeat(RESOURCE_MAX_BYTES + 1), "ok.md": "fine" },
    );
    symlinkSync(join(outside, "secret.md"), join(root, "link.md"));
    expect(errorsOf(root)).toStrictEqual([
      ["resources", "Missing skill resource: missing.md"],
      ["resources", "Skill resource escapes bundle root: link.md"],
      [
        "resources",
        `Skill file exceeds 131072 bytes: ${join(root, "big.md")} (131073 bytes)`,
      ],
    ]);
  });

  test("reports a bundle root that cannot be resolved", () => {
    const root = skill({ ...VALID, resources: ["r.md"] }, "b", { "r.md": "r" });
    const realpath = spyOn(fs, "realpathSync").mockImplementation((() => {
      throw new Error("broken root");
    }) as unknown as typeof fs.realpathSync);
    try {
      expect(errorsOf(root)).toStrictEqual([["SKILL.md", "broken root"]]);
    } finally {
      realpath.mockRestore();
    }
  });

  test("reports an oversize SKILL.md as a content error", () => {
    const root = skill(VALID, "x".repeat(256 * 1024));
    const path = join(root, "SKILL.md");
    const size = Buffer.byteLength(
      `${frontmatter(VALID)}${"x".repeat(256 * 1024)}`,
    );
    expect(errorsOf(root)).toStrictEqual([
      ["SKILL.md", `Skill file exceeds 262144 bytes: ${path} (${size} bytes)`],
    ]);
  });
});
