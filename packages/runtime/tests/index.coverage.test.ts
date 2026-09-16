import { describe, expect, test } from "bun:test";

import * as engine from "../src/engine.js";
import * as runtime from "../src/index.js";
import * as skillOperations from "../src/skill-operations.js";
import * as errors from "../src/skill-system/errors.js";
import * as loader from "../src/skill-system/loader.js";
import * as paths from "../src/skill-system/paths.js";
import * as types from "../src/skill-system/types.js";
import * as validation from "../src/skill-system/validation.js";
import * as skills from "../src/skills.js";

describe("kibi-runtime public barrel", () => {
  test("re-exports operation and skill functions as callable values", () => {
    const exported = [
      runtime.executeOperation,
      runtime.executeQuery,
      runtime.executeSearch,
      runtime.executeStatus,
      runtime.executeCoverage,
      runtime.executeFindGaps,
      runtime.executeGraph,
      runtime.listBundledSkills,
      runtime.loadBundledSkill,
      runtime.readBundledSkillResource,
      runtime.validateSkillBundle,
      runtime.skillsListSpec.execute,
      runtime.skillsLoadSpec.execute,
      runtime.skillsReadSpec.execute,
    ];
    for (const value of exported) {
      expect(typeof value).toBe("function");
    }
    expect(runtime.skillsListSpec.name).toBe("kb_skills_list");
    expect(runtime.skillsLoadSpec.name).toBe("kb_skills_load");
    expect(runtime.skillsReadSpec.name).toBe("kb_skills_read");
    expect(runtime.KIBI_PROTOCOL_VERSION).toBeGreaterThan(0);
  });

  test("imports every runtime source module so LCOV records the package", () => {
    expect(engine).toBeDefined();
    expect(skillOperations.skillsListSpec.name).toBe("kb_skills_list");
    expect(errors.SkillNotFoundError.name).toBe("SkillNotFoundError");
    expect(typeof loader.listBundledSkills).toBe("function");
    expect(paths.SKILL_FILE_NAME).toBe("SKILL.md");
    expect(types).toBeDefined();
    expect(typeof validation.validateSkillBundle).toBe("function");
    expect(typeof skills.listBundledSkills).toBe("function");
  });
});
