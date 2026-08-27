import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadBundledSkill } from "../src/public/skills";

describe("generated skill mirror parity", () => {
  test("canonical guidance avoids unsupported typed fact values", () => {
    const bundle = loadBundledSkill("kibi-usage");

    expect(bundle.body).not.toContain("value_type: list");
    expect(bundle.body).not.toContain("value_json");
  });

  test("canonical guidance bytes and hashes match generated mirrors", () => {
    const canonicalRoot = resolve(
      import.meta.dir,
      "../src/public/skills/kibi-usage",
    );
    const files = [
      "SKILL.md",
      "resources/fact-lanes.md",
      "resources/workflows.md",
      "resources/kb-improvement.md",
    ] as const;

    for (const target of ["codex", "cursor"] as const) {
      const mirrorRoot = resolve(import.meta.dir, `../../${target}/skills`);
      const manifest = JSON.parse(
        readFileSync(resolve(mirrorRoot, ".canon-hash.json"), "utf8"),
      ) as Record<string, string>;
      for (const file of files) {
        const canonical = readFileSync(resolve(canonicalRoot, file));
        const mirrored = readFileSync(resolve(mirrorRoot, "kibi-usage", file));
        expect(mirrored.equals(canonical)).toBe(true);
        expect(manifest[`kibi-usage/${file}`]).toBe(
          createHash("sha256").update(canonical).digest("hex"),
        );
      }
    }
  });
});
