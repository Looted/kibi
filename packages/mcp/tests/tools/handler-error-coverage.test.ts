// implements REQ-001
import { describe, expect, test } from "bun:test";

import { handleKbSkillsRead } from "../../src/tools/skills.js";
import { handleKbValidateUpsert } from "../../src/tools/validate-upsert.js";

describe("MCP handler error wrappers", () => {
  test("validate upsert requires a payload when the first argument is not upsert args", async () => {
    await expect(handleKbValidateUpsert({} as never)).rejects.toThrow(
      "kb_validate_upsert requires an upsert payload",
    );
  });

  test("skills read swallows a missing bundle while composing the resource hint", async () => {
    await expect(
      handleKbSkillsRead({
        id: "missing-skill",
        resource: "resources/x.md",
      }),
    ).rejects.toThrow("Skills read failed");
  });
});
