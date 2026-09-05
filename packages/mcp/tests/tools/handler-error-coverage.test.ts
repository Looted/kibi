// implements REQ-001
import { describe, expect, spyOn, test } from "bun:test";
import { skillsListSpec, skillsLoadSpec } from "kibi-runtime";

import {
  handleKbSkillsList,
  handleKbSkillsLoad,
  handleKbSkillsRead,
} from "../../src/tools/skills.js";
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

  test("skills list wraps executor failures", async () => {
    const spy = spyOn(skillsListSpec, "execute").mockImplementation(async () => {
      throw new Error("list down");
    });
    try {
      await expect(handleKbSkillsList({})).rejects.toThrow(
        "Skills list failed: list down",
      );
    } finally {
      spy.mockRestore();
    }
  });

  test("skills load wraps non-Error executor failures", async () => {
    const spy = spyOn(skillsLoadSpec, "execute").mockImplementation(async () => {
      throw "load down";
    });
    try {
      await expect(handleKbSkillsLoad({ id: "kibi-usage" })).rejects.toThrow(
        "Skills load failed: load down",
      );
    } finally {
      spy.mockRestore();
    }
  });
});
