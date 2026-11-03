import { describe, expect, test } from "bun:test";
import { validateProjectKibiConfig } from "../src/index.js";

/** The code and message validateProjectKibiConfig refuses `kibi` with. */
function refusal(kibi: unknown): { code: string; message: string } {
  try {
    validateProjectKibiConfig(kibi);
  } catch (error) {
    const { code, message } = error as { code: string; message: string };
    return { code, message };
  }
  throw new Error("accepted");
}

describe("project kibi config: declined and generated lists", () => {
  test("lists only the fields that are set", () => {
    expect(validateProjectKibiConfig({})).toStrictEqual({});
    expect(
      validateProjectKibiConfig({
        declinedPlugins: ["kibi-plugin-x"],
        declinedLanguagePacks: ["kibi-lang-go"],
        generatedPaths: ["src/gen/**", "!src/gen/keep.ts"],
      }),
    ).toStrictEqual({
      declinedPlugins: ["kibi-plugin-x"],
      declinedLanguagePacks: ["kibi-lang-go"],
      generatedPaths: ["src/gen/**", "!src/gen/keep.ts"],
    });
  });

  test("refuses generated paths that are not a list of relative globs", () => {
    expect(refusal({ generatedPaths: "src/gen/**" })).toEqual({
      code: "INVALID_PROJECT_CONFIG",
      message: "kibi.generatedPaths must be an array of gitignore-style globs",
    });
    expect(refusal({ generatedPaths: ["src/**", 5] })).toEqual({
      code: "INVALID_PROJECT_CONFIG",
      message: "kibi.generatedPaths[1] must be a non-empty string",
    });
    for (const pattern of ["/src/gen/**", "!/src/gen/keep.ts", "src\\gen"])
      expect([
        pattern,
        refusal({ generatedPaths: ["src/**", pattern] }),
      ]).toEqual([
        pattern,
        {
          code: "INVALID_PROJECT_CONFIG",
          message:
            'kibi.generatedPaths[1] must be a non-empty glob relative to the repository root, such as "src/gen/**" or "!src/gen/keep.ts"',
        },
      ]);
  });

  test("refuses declined language packs that are not kibi-lang package names", () => {
    expect(refusal({ declinedLanguagePacks: "kibi-lang-go" })).toEqual({
      code: "INVALID_PROJECT_CONFIG",
      message:
        "kibi.declinedLanguagePacks must be an array of kibi-lang-* package names",
    });
    expect(refusal({ declinedLanguagePacks: ["kibi-lang-go", 5] })).toEqual({
      code: "INVALID_PROJECT_CONFIG",
      message: "kibi.declinedLanguagePacks[1] must be a non-empty string",
    });
    for (const name of ["@scope/kibi-lang-go", "kibi-lang-go@1.0.0"])
      expect([
        name,
        refusal({ declinedLanguagePacks: ["kibi-lang-c", name] }),
      ]).toEqual([
        name,
        {
          code: "INVALID_PACKAGE_REFERENCE",
          message:
            "kibi.declinedLanguagePacks[1] must be a kibi-lang-* package name such as kibi-lang-cpp",
        },
      ]);
  });
});
