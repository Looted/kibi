import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

const canonicalRoot = join(repoRoot, "packages/cli/src/public/skills");

const EXPECTED_SKILL_IDS = [
  "kibi-bootstrap",
  "kibi-freshness",
  "kibi-traceability",
  "kibi-usage",
] as const;

interface ParsedFrontmatter {
  id: string;
  name: string;
  description: string;
  version: string;
  kibiCompatibility: string;
  tags: string[];
  resources: string[];
}

function parseFrontmatter(raw: string): ParsedFrontmatter {
  const lines = raw.split("\n");
  if (lines[0] !== "---") {
    throw new Error("missing frontmatter opening delimiter");
  }
  const end = lines.findIndex((line, index) => index > 0 && line === "---");
  if (end === -1) {
    throw new Error("missing frontmatter closing delimiter");
  }
  const body = lines.slice(1, end).join("\n");
  // Minimal hand parser to avoid pulling a YAML dependency into tests.
  const manifest: Record<string, unknown> = {};
  let currentArray: string[] | null = null;
  let currentKey: string | null = null;
  for (const line of body.split("\n")) {
    if (line.trim() === "") continue;
    const arrayItemMatch = /^(\s+)-\s+(.+)$/.exec(line);
    if (arrayItemMatch && currentArray && currentKey) {
      const value = arrayItemMatch[2]?.replace(/^"|"$/g, "") ?? "";
      currentArray.push(value);
      continue;
    }
    const match = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (!match) continue;
    const key = match[1] ?? "";
    const rawValue = (match[2] ?? "").trim();
    currentKey = key;
    if (rawValue === "") {
      currentArray = [];
      manifest[key] = currentArray;
    } else {
      currentArray = null;
      manifest[key] = rawValue.replace(/^"|"$/g, "");
    }
  }
  return {
    id: String(manifest.id ?? ""),
    name: String(manifest.name ?? ""),
    description: String(manifest.description ?? ""),
    version: String(manifest.version ?? ""),
    kibiCompatibility: String(manifest.kibiCompatibility ?? ""),
    tags: Array.isArray(manifest.tags)
      ? (manifest.tags as string[]).map(String)
      : [],
    resources: Array.isArray(manifest.resources)
      ? (manifest.resources as string[]).map(String)
      : [],
  };
}

describe("canonical skills source", () => {
  test("all expected skill IDs are present", () => {
    const present = readdirSync(canonicalRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    for (const id of EXPECTED_SKILL_IDS) {
      expect(present).toContain(id);
    }
  });

  test("exactly the expected skill set is canonical (no extras)", () => {
    const present = readdirSync(canonicalRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    expect(present).toEqual([...EXPECTED_SKILL_IDS].sort());
  });

  test("every canonical skill has a SKILL.md with a valid manifest", () => {
    for (const id of EXPECTED_SKILL_IDS) {
      const skillFile = join(canonicalRoot, id, "SKILL.md");
      expect(existsSync(skillFile), `${id}/SKILL.md should exist`).toBe(true);
      const raw = readFileSync(skillFile, "utf8");
      const manifest = parseFrontmatter(raw);

      expect(manifest.id, `${id}: id`).toBe(id);
      expect(manifest.name, `${id}: name`).not.toBe("");
      expect(manifest.description.length, `${id}: description`).toBeGreaterThan(
        10,
      );
      expect(manifest.version, `${id}: version`).toMatch(
        /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/,
      );
      expect(manifest.kibiCompatibility, `${id}: kibiCompatibility`).not.toBe(
        "",
      );
      expect(manifest.tags.length, `${id}: tags`).toBeGreaterThan(0);
    }
  });

  test("every declared resource file exists in its bundle", () => {
    for (const id of EXPECTED_SKILL_IDS) {
      const skillFile = join(canonicalRoot, id, "SKILL.md");
      const raw = readFileSync(skillFile, "utf8");
      const manifest = parseFrontmatter(raw);
      for (const resource of manifest.resources) {
        const resolved = join(canonicalRoot, id, resource);
        expect(
          existsSync(resolved),
          `${id}: declared resource should exist: ${resource}`,
        ).toBe(true);
      }
    }
  });

  test("canonical skills declare their current release versions and compatibility", () => {
    const newCanonical = {
      "kibi-bootstrap": "3.0.0",
      "kibi-freshness": "2.0.0",
      "kibi-traceability": "2.0.0",
    } as const;
    for (const [id, version] of Object.entries(newCanonical)) {
      const skillFile = join(canonicalRoot, id, "SKILL.md");
      const raw = readFileSync(skillFile, "utf8");
      const manifest = parseFrontmatter(raw);
      expect(manifest.version, `${id} version`).toBe(version);
      expect(manifest.kibiCompatibility, `${id} compat`).toBe(">=1.0.0");
    }
  });

  test("canonical skills surface is observable via listBundledSkills", async () => {
    const { listBundledSkills } = await import("../src/public/skills.js");
    const listed = listBundledSkills()
      .map((manifest) => manifest.id)
      .sort();
    expect(listed).toEqual([...EXPECTED_SKILL_IDS].sort());
  });

  test("canonical skills use the capability state machine", () => {
    for (const id of EXPECTED_SKILL_IDS) {
      const skillFile = join(canonicalRoot, id, "SKILL.md");
      const raw = readFileSync(skillFile, "utf8");
      expect(raw).toMatch(/## Interface (Selection|and preview)/);
      expect(raw).toContain("MCP");
      expect(raw).toMatch(
        /npx --no-install|bunx --no-install|kibi status --input/,
      );
      expect(raw.toLowerCase()).not.toContain("mcp only");
      expect(raw.toLowerCase()).not.toContain("exclusively through mcp");
    }
  });
});
