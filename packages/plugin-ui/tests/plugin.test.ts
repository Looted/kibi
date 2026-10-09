import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CHECK_POLICY_CONTRACT_VERSION,
  validateCheckPolicyDocument,
  validateKibiPlugin,
} from "kibi-plugin-sdk";

import { UI_CHECK_POLICY, kibiPlugin } from "../src/index";

const packageRoot = join(import.meta.dir, "..");
const packageJson = JSON.parse(
  readFileSync(join(packageRoot, "package.json"), "utf8"),
) as { version: string; files: string[]; kibi: { checkPolicy: string } };

// executable_for TEST-ui-plugin-design-policy
describe("kibi-plugin-ui", () => {
  test("ships its policy where the host reads it, inside the packed files", () => {
    expect(packageJson.kibi.checkPolicy).toBe("check-policy.json");
    expect(packageJson.files).toContain("check-policy.json");
    const onDisk = JSON.parse(
      readFileSync(join(packageRoot, packageJson.kibi.checkPolicy), "utf8"),
    );
    expect(validateCheckPolicyDocument(onDisk)).toEqual(UI_CHECK_POLICY);
  });

  test("is a valid permission-free plugin contributing only a check policy", () => {
    const plugin = validateKibiPlugin(kibiPlugin);
    expect(plugin.id).toBe("kibi-plugin-ui");
    expect(plugin.version).toBe(packageJson.version);
    expect(plugin.permissions).toEqual({
      network: false,
      metered: false,
      secrets: [],
    });
    expect(Object.keys(plugin.capabilities)).toEqual(["checkPolicy"]);
    expect(plugin.capabilities.checkPolicy?.document.contractVersion).toBe(
      CHECK_POLICY_CONTRACT_VERSION,
    );
  });

  test("covers React and Angular components and the pattern markers", () => {
    expect(UI_CHECK_POLICY.ownership?.flatMap((rule) => rule.include)).toEqual([
      "**/*.tsx",
      "**/*.jsx",
      "**/*.component.ts",
    ]);
    for (const rule of UI_CHECK_POLICY.ownership ?? []) {
      expect(rule.requirePredicates).toContain("ui_pattern");
      expect(rule.exemptTag).toBe("review:ui-unconstrained");
    }
    expect(UI_CHECK_POLICY.markers?.[0]).toMatchObject({
      patternPredicate: "ui_pattern",
      markerPredicate: "pattern_marker",
      siblingExtensions: [".html"],
    });
  });
});
