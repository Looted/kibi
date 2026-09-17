import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import {
  loadBundledSkill,
  loadBundledSkillFrom,
  readBundledSkillResource,
  readBundledSkillResourceFrom,
} from "../src/public/skills";

describe("bundled skill parity", () => {
  test("canonical guidance avoids unsupported typed fact values", () => {
    const bundle = loadBundledSkill("kibi-usage");

    expect(bundle.body).not.toContain("value_type: list");
    expect(bundle.body).not.toContain("value_json");
  });

  test("canonical and runtime usage skills preserve scoped guidance and resources", () => {
    const runtimeRoot = resolve(import.meta.dir, "../../runtime/src/skills");
    const canonical = loadBundledSkill("kibi-usage");
    const runtime = loadBundledSkillFrom(runtimeRoot, "kibi-usage");
    const scopedGuidance = [
      "For a task that explicitly supplies a malformed concrete mutation payload",
      "For conditional relational claims, after the initial `kb_suggest_predicates`",
    ];

    expect(runtime.body).toBe(canonical.body);
    expect(runtime.manifest).toEqual(canonical.manifest);
    for (const guidance of scopedGuidance) {
      expect(canonical.body).toContain(guidance);
    }
    for (const resource of canonical.manifest.resources ?? []) {
      expect(
        readBundledSkillResourceFrom(runtimeRoot, "kibi-usage", resource),
      ).toBe(readBundledSkillResource("kibi-usage", resource));
    }
    expect(canonical.manifest.version).toBe("2.1.3");
  });
});
