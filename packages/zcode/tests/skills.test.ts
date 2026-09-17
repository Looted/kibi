import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const skillsRoot = path.join(packageRoot, "skills");

const requiredSkills = [
  "kibi-usage",
  "kibi-bootstrap",
  "kibi-freshness",
  "kibi-traceability",
] as const;

const expectedSkillNames: Record<(typeof requiredSkills)[number], string> = {
  "kibi-usage": "Kibi Usage",
  "kibi-bootstrap": "kibi-bootstrap",
  "kibi-freshness": "kibi-freshness",
  "kibi-traceability": "kibi-traceability",
};

/**
 * The ZCode skill loader marks a skill `safeToAutoLoad` only when every
 * top-level frontmatter key belongs to this recognized set.
 */
const ZCODE_RECOGNIZED_FRONTMATTER_KEYS = new Set([
  "name",
  "description",
  "when_to_use",
  "license",
  "metadata",
]);

function topLevelFrontmatterKeys(text: string): string[] {
  const lines = text.split("\n");
  if (lines[0] !== "---") return [];
  const end = lines.findIndex((line, index) => index > 0 && line === "---");
  if (end === -1) return [];

  const keys: string[] = [];
  for (const line of lines.slice(1, end)) {
    if (line.trim().length === 0 || /^\s/.test(line)) continue;
    const key = line.split(":")[0]?.trim();
    if (key) keys.push(key);
  }
  return keys;
}

function skillBodyAfterFrontmatter(text: string): string {
  const lines = text.split("\n");
  const end = lines.findIndex(
    (line, index) => index > 0 && line.replace(/\r$/, "") === "---",
  );
  return lines.slice(end + 1).join("\n");
}

describe("kibi-zcode skills", () => {
  test("required skill directories and SKILL.md exist", () => {
    for (const skillName of requiredSkills) {
      const skillDir = path.join(skillsRoot, skillName);
      const skillFile = path.join(skillDir, "SKILL.md");
      expect(
        fs.existsSync(skillFile),
        `${skillName} skill file should exist`,
      ).toBe(true);
    }
  });

  test("frontmatter stays within the ZCode-recognized key set", () => {
    for (const skillName of requiredSkills) {
      const raw = fs.readFileSync(
        path.join(skillsRoot, skillName, "SKILL.md"),
        "utf8",
      );
      const keys = topLevelFrontmatterKeys(raw);

      expect(keys.length).toBeGreaterThan(0);
      for (const key of keys) {
        expect(
          ZCODE_RECOGNIZED_FRONTMATTER_KEYS.has(key),
          `${skillName}: frontmatter key ${key} is not ZCode-recognized`,
        ).toBe(true);
      }
      expect(keys).toContain("name");
      expect(keys).toContain("description");
      expect(keys).toContain("license");
      expect(keys).toContain("metadata");
    }
  });

  test("SKILL.md has valid name and description frontmatter", () => {
    for (const skillName of requiredSkills) {
      const raw = fs.readFileSync(
        path.join(skillsRoot, skillName, "SKILL.md"),
        "utf8",
      );
      const name = raw.match(/^name:\s*(.+)$/m)?.[1]?.trim();
      const description = raw.match(/^description:\s*(.+)$/m)?.[1]?.trim();

      expect(name).toBe(expectedSkillNames[skillName]);
      expect((description ?? "").length).toBeGreaterThan(10);
      // ZCode drops skills whose description exceeds 1024 characters.
      expect((description ?? "").length).toBeLessThanOrEqual(1024);
    }
  });

  test("canonical metadata keys survive under the metadata block", () => {
    for (const skillName of requiredSkills) {
      const raw = fs.readFileSync(
        path.join(skillsRoot, skillName, "SKILL.md"),
        "utf8",
      );

      expect(raw).toMatch(/^ {2}id: /m);
      expect(raw).toMatch(/^ {2}version: /m);
      expect(raw).toMatch(/^ {2}kibiCompatibility: /m);
      expect(raw).toMatch(/^ {2}resources:\n/m);
    }
  });

  test("declared resources exist next to each skill", () => {
    for (const skillName of requiredSkills) {
      const skillDir = path.join(skillsRoot, skillName);
      const raw = fs.readFileSync(path.join(skillDir, "SKILL.md"), "utf8");
      const resources = [...raw.matchAll(/^\s+- (resources\/\S+)$/gm)].map(
        (match) => match[1] as string,
      );

      expect(resources.length).toBeGreaterThan(0);
      for (const resource of resources) {
        expect(
          fs.existsSync(path.join(skillDir, resource)),
          `${skillName}: missing resource ${resource}`,
        ).toBe(true);
      }
    }
  });

  test("finds CRLF frontmatter delimiters without normalizing body bytes", () => {
    expect(skillBodyAfterFrontmatter("---\r\nname: test\r\n---\r\nbody\r\n")).toBe(
      "body\r\n",
    );
  });

  test("skill bodies are byte-identical to the canonical bundled skills", () => {
    for (const skillName of requiredSkills) {
      expect(
        skillBodyAfterFrontmatter(
          fs.readFileSync(path.join(skillsRoot, skillName, "SKILL.md"), "utf8"),
        ),
      ).toBe(
        skillBodyAfterFrontmatter(
          fs.readFileSync(
            path.join(
              packageRoot,
              "..",
              "runtime",
              "src",
              "skills",
              skillName,
              "SKILL.md",
            ),
            "utf8",
          ),
        ),
      );
    }
  });

  test("skills do not instruct manual .kb file edits", () => {
    for (const skillName of requiredSkills) {
      const raw = fs.readFileSync(
        path.join(skillsRoot, skillName, "SKILL.md"),
        "utf8",
      );

      expect(raw).not.toMatch(/manual\s+\.kb/);
      expect(raw).not.toMatch(/edit(s|ing)?\s+\.kb\//);
      expect(raw.toLowerCase()).not.toMatch(/manual\s+\.?kb/);
    }
  });
});
