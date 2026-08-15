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

const expectedSkillNames: Record<(typeof requiredSkills)[number], string> = {
  "kibi-usage": "Kibi Usage",
  "init-kibi": "init-kibi",
  "kibi-freshness": "kibi-freshness",
  "kibi-traceability": "kibi-traceability",
};

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
    if (!rawValue) continue;
    const value = rawValue.trim().replace(/^"|"$/g, "");
    if (key) data[key] = value;
  }

  return data;
}

describe("kibi-cursor skills", () => {
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

      expect(frontmatter.name).toBe(expectedSkillNames[skillName]);
      const description = frontmatter.description;
      expect(typeof description).toBe("string");
      expect(description?.length ?? 0).toBeGreaterThan(10);
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

  test("generated skills expose peer-surface capability guidance", () => {
    for (const skillName of requiredSkills) {
      const raw = fs.readFileSync(
        path.join(skillsRoot, skillName, "SKILL.md"),
        "utf8",
      );

      expect(raw).toMatch(/## Interface (Selection|and preview)/);
      expect(raw).toContain("MCP");
      expect(raw).toMatch(/visible approved|trusted project-local CLI|peer interfaces/i);
      expect(raw.toLowerCase()).not.toContain("mcp only");
      expect(raw.toLowerCase()).not.toContain("exclusively through mcp");
    }

    const usage = fs.readFileSync(
      path.join(skillsRoot, "kibi-usage", "SKILL.md"),
      "utf8",
    );
    expect(usage).toContain("resources/operation-access.md");
    expect(usage).toContain("npx --no-install kibi search --input -");
  });

  test("kibi-usage includes status and source-mismatch guardrails", () => {
    const raw = fs.readFileSync(
      path.join(skillsRoot, "kibi-usage", "SKILL.md"),
      "utf8",
    );

    expect(raw).toContain("kibiProtocol");
    expect(raw).toContain("committed_with_repairs");
    expect(raw).toContain("typed `nextActions`");
    expect(raw).toContain("status: implemented");
    expect(raw).toContain("source-first");
    expect(raw).toContain("do not keep");
  });
});
