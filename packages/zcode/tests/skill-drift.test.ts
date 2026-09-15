import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { transformZcodeSkillFrontmatter } from "../../../scripts/sync-agent-skills";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

const canonicalRoot = join(repoRoot, "packages/runtime/src/skills");
const mirrorRoot = join(repoRoot, "packages/zcode/skills");
const hashManifestPath = join(mirrorRoot, ".canon-hash.json");

const EXPECTED_SKILL_IDS = [
  "kibi-bootstrap",
  "kibi-freshness",
  "kibi-traceability",
  "kibi-usage",
] as const;

const HASH_MANIFEST_NAME = ".canon-hash.json";

function walkFiles(rootDir: string): string[] {
  const out: string[] = [];
  const stack: string[] = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) break;
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile()) {
        out.push(full);
      }
    }
  }
  return out.sort();
}

/** Expected mirror bytes: transformed SKILL.md, byte-identical everything else. */
function expectedMirrorContent(rel: string): Uint8Array {
  const canonicalFile = join(canonicalRoot, rel);
  const content = readFileSync(canonicalFile);
  if (rel.endsWith("/SKILL.md")) {
    return transformZcodeSkillFrontmatter(content);
  }
  return content;
}

describe("kibi-zcode skill mirror drift", () => {
  test("mirror directory exists with all expected skills", () => {
    expect(existsSync(mirrorRoot)).toBe(true);
    const present = readdirSync(mirrorRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    expect(present).toEqual([...EXPECTED_SKILL_IDS].sort());
  });

  test("every canonical skill file is mirrored with the zcode transform", () => {
    for (const id of EXPECTED_SKILL_IDS) {
      const canonicalSkillRoot = join(canonicalRoot, id);
      const mirrorSkillRoot = join(mirrorRoot, id);
      expect(existsSync(mirrorSkillRoot)).toBe(true);

      const canonicalFiles = walkFiles(canonicalSkillRoot);
      for (const canonicalFile of canonicalFiles) {
        const rel = relative(canonicalSkillRoot, canonicalFile).replaceAll(
          "\\",
          "/",
        );
        const mirrorFile = join(mirrorSkillRoot, rel);
        expect(existsSync(mirrorFile), `mirror missing ${id}/${rel}`).toBe(
          true,
        );
        expect(
          readFileSync(mirrorFile).equals(
            expectedMirrorContent(`${id}/${rel}`),
          ),
          `mirror drift in ${id}/${rel}`,
        ).toBe(true);
      }
    }
  });

  test("the zcode transform rewrote frontmatter keys on every SKILL.md", () => {
    for (const id of EXPECTED_SKILL_IDS) {
      const mirror = readFileSync(join(mirrorRoot, id, "SKILL.md"), "utf8");
      expect(mirror).toMatch(/^name: .+$/m);
      expect(mirror).toMatch(/^license: AGPL-3\.0-or-later$/m);
      expect(mirror).toMatch(/^metadata:\n/m);
      expect(mirror).not.toMatch(/^id: /m);
      expect(mirror).not.toMatch(/^version: /m);
      expect(mirror).not.toMatch(/^kibiCompatibility: /m);
    }
  });

  test("mirror has no orphan files outside canonical source", () => {
    const canonicalPlanned = new Set<string>();
    for (const id of EXPECTED_SKILL_IDS) {
      const canonicalSkillRoot = join(canonicalRoot, id);
      for (const file of walkFiles(canonicalSkillRoot)) {
        canonicalPlanned.add(
          `${id}/${relative(canonicalSkillRoot, file).replaceAll("\\", "/")}`,
        );
      }
    }

    const mirrorFiles = walkFiles(mirrorRoot)
      .map((abs) => relative(mirrorRoot, abs).replaceAll("\\", "/"))
      .filter((rel) => rel !== HASH_MANIFEST_NAME);

    for (const rel of mirrorFiles) {
      expect(
        canonicalPlanned.has(rel),
        `orphan file in zcode mirror: ${rel}`,
      ).toBe(true);
    }
  });

  test("hash manifest exists and matches every transformed mirror file", () => {
    expect(existsSync(hashManifestPath)).toBe(true);
    const manifest = JSON.parse(
      readFileSync(hashManifestPath, "utf8"),
    ) as Record<string, string>;

    for (const id of EXPECTED_SKILL_IDS) {
      const canonicalSkillRoot = join(canonicalRoot, id);
      for (const file of walkFiles(canonicalSkillRoot)) {
        const rel = `${id}/${relative(canonicalSkillRoot, file).replaceAll("\\", "/")}`;
        const expectedHash = createHash("sha256")
          .update(expectedMirrorContent(rel))
          .digest("hex");
        expect(manifest[rel], `hash manifest missing ${rel}`).toBe(
          expectedHash,
        );
      }
    }

    // No stale entries.
    for (const rel of Object.keys(manifest)) {
      const mirrorFile = join(mirrorRoot, rel);
      expect(existsSync(mirrorFile), `stale manifest entry: ${rel}`).toBe(true);
    }
  });
});
