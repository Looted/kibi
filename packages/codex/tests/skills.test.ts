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
  "init-kibi",
  "kibi-freshness",
  "kibi-traceability",
] as const;

const requiredToolNames = [
  "kb_search",
  "kb_query",
  "kb_upsert",
  "kb_delete",
  "kb_check",
  "kb_status",
  "kb_autopilot_generate",
];

function parseFrontmatter(text: string): Record<string, string> {
  const lines = text.split("\n");
  if (lines[0] !== "---") return {};
  const end = lines.findIndex((line, index) => index > 0 && line === "---");
  if (end === -1) return {};

  const frontmatterLines = lines.slice(1, end);
  const data: Record<string, string> = {};

  for (const line of frontmatterLines) {
    const parsed = line.match(/^([A-Za-z0-9_-]+):\s*(.+)$/);
    if (!parsed) continue;
    const [, key, rawValue] = parsed;
    const value = rawValue.trim().replace(/^"|"$/g, "");
    if (key) data[key] = value;
  }

  return data;
}

describe("kibi-codex skills", () => {
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

  test("SKILL.md has valid frontmatter for required skills", () => {
    for (const skillName of requiredSkills) {
      const skillFile = path.join(skillsRoot, skillName, "SKILL.md");
      const raw = fs.readFileSync(skillFile, "utf8");
      const frontmatter = parseFrontmatter(raw);

      expect(frontmatter.name).toBe(skillName);
      expect(typeof frontmatter.description).toBe("string");
      expect(frontmatter.description.length).toBeGreaterThan(10);
    }
  });

  test("skills do not instruct manual .kb file edits", () => {
    for (const skillName of requiredSkills) {
      const skillFile = path.join(skillsRoot, skillName, "SKILL.md");
      const raw = fs.readFileSync(skillFile, "utf8");

      expect(raw).not.toMatch(/manual\s+\.kb/);
      expect(raw).not.toMatch(/edit(s|ing)?\s+\.kb\//);
      expect(raw.toLowerCase()).not.toMatch(/manual\s+\.?kb/);
    }
  });

  test("required kibi MCP tools are mentioned in skill instructions", () => {
    const collected = new Set<string>();

    for (const skillName of requiredSkills) {
      const skillFile = path.join(skillsRoot, skillName, "SKILL.md");
      const raw = fs.readFileSync(skillFile, "utf8");
      for (const tool of requiredToolNames) {
        if (raw.includes(tool)) collected.add(tool);
      }
    }

    for (const tool of requiredToolNames) {
      expect(collected.has(tool)).toBe(true);
    }
  });

  test("skills include source-linked lookup, freshness, and traceability guidance", () => {
    const snippets = {
      sourceLinked: "source",
      freshness: "freshness",
      traceability: "traceability",
    } as const;

    const rawBodies = requiredSkills.map((skillName) => {
      const skillFile = path.join(skillsRoot, skillName, "SKILL.md");
      const raw = fs.readFileSync(skillFile, "utf8");
      return raw.toLowerCase();
    });

    const conceptCoverage = {
      sourceLinked: false,
      freshness: false,
      traceability: false,
    };

    for (const body of rawBodies) {
      if (body.includes(snippets.sourceLinked)) {
        conceptCoverage.sourceLinked = true;
      }
      if (body.includes(snippets.freshness)) {
        conceptCoverage.freshness = true;
      }
      if (body.includes(snippets.traceability)) {
        conceptCoverage.traceability = true;
      }

      if (body.includes("source")) {
        expect(body).toContain("kb_query");
      }
    }

    expect(conceptCoverage.sourceLinked).toBe(true);
    expect(conceptCoverage.freshness).toBe(true);
    expect(conceptCoverage.traceability).toBe(true);
  });
});
