import { describe, expect, test } from "bun:test";
import {
  SkillNotFoundError,
  SkillOversizeError,
  SkillResourceNotFoundError,
  SkillResourceOutOfBoundsError,
  SkillValidationError,
} from "../../../src/public/skill-system/errors.js";

describe("skill-system errors", () => {
  test("SkillNotFoundError names the skill", () => {
    const error = new SkillNotFoundError("kibi-x");
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe("Skill not found: kibi-x");
    expect(error.name).toBe("SkillNotFoundError");
  });

  test("SkillResourceNotFoundError names the skill and resource", () => {
    const error = new SkillResourceNotFoundError("kibi-x", "refs/a.md");
    expect(error.message).toBe("Skill resource not found: kibi-x/refs/a.md");
    expect(error.name).toBe("SkillResourceNotFoundError");
  });

  test("SkillResourceOutOfBoundsError names the escaping resource", () => {
    const error = new SkillResourceOutOfBoundsError("kibi-x", "../a.md");
    expect(error.message).toBe(
      "Skill resource escapes bundle root: kibi-x/../a.md",
    );
    expect(error.name).toBe("SkillResourceOutOfBoundsError");
  });

  test("SkillValidationError keeps the field", () => {
    const error = new SkillValidationError("name", "name is required");
    expect(error.message).toBe("name is required");
    expect(error.name).toBe("SkillValidationError");
    expect(error.field).toBe("name");
  });

  test("SkillOversizeError reports both sizes", () => {
    const error = new SkillOversizeError("/x/SKILL.md", 10, 12);
    expect(error.message).toBe(
      "Skill file exceeds 10 bytes: /x/SKILL.md (12 bytes)",
    );
    expect(error.name).toBe("SkillOversizeError");
    expect(error.maxBytes).toBe(10);
    expect(error.actualBytes).toBe(12);
  });
});
