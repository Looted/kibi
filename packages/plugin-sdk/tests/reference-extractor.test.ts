import { describe, expect, test } from "bun:test";
import {
  KIBI_PLUGIN_API_VERSION,
  PluginValidationError,
  REFERENCE_EXTRACTOR_CAPABILITY_ID,
  isCapabilityId,
  validateKibiPlugin,
  validateProjectKibiConfig,
  validateReferenceExtractionResult,
} from "../src/index.js";

const permissions = { network: false, metered: false, secrets: [] };

const referenceExtractor = {
  id: "test.references",
  supports: () => true,
  extract: () => ({
    contractVersion: "kibi.reference-extractor.v1",
    status: "ok",
    language: "go",
    members: [],
    unresolved: [],
  }),
};

function expectValidationCode(run: () => unknown, code: string): void {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(PluginValidationError);
    expect((error as PluginValidationError).code).toBe(code);
    return;
  }
  throw new Error("expected a PluginValidationError");
}

describe("kibi.reference-extractor.v1", () => {
  test("is a capability a plugin can declare", () => {
    expect(isCapabilityId(REFERENCE_EXTRACTOR_CAPABILITY_ID)).toBe(true);
    const plugin = validateKibiPlugin({
      apiVersion: KIBI_PLUGIN_API_VERSION,
      id: "test-plugin",
      version: "1.0.0",
      permissions,
      capabilities: { referenceExtractor },
    });
    expect(plugin.capabilities.referenceExtractor?.id).toBe("test.references");
    expect(
      plugin.capabilities.referenceExtractor?.supports({ path: "a.go" }),
    ).toBe(true);
  });

  test("needs supports() and extract()", () => {
    expectValidationCode(
      () =>
        validateKibiPlugin({
          apiVersion: KIBI_PLUGIN_API_VERSION,
          id: "test-plugin",
          version: "1.0.0",
          permissions,
          capabilities: {
            referenceExtractor: { id: "x", supports: () => true },
          },
        }),
      "INVALID_CAPABILITY",
    );
  });

  test("activates only in augment mode", () => {
    const activate = (mode: string) =>
      validateProjectKibiConfig({
        plugins: [
          {
            package: "kibi-plugin-treesitter",
            capabilities: { [REFERENCE_EXTRACTOR_CAPABILITY_ID]: { mode } },
          },
        ],
      });
    expect(activate("augment").plugins?.[0]?.capabilities).toEqual({
      [REFERENCE_EXTRACTOR_CAPABILITY_ID]: { mode: "augment" },
    });
    expectValidationCode(() => activate("replace"), "INVALID_MODE");
    expectValidationCode(() => activate("shadow"), "INVALID_MODE");
  });

  test("validates results: members, unresolved lines and refusals", () => {
    expect(
      validateReferenceExtractionResult({
        contractVersion: "kibi.reference-extractor.v1",
        status: "ok",
        language: "go",
        members: ["os"],
        unresolved: [{ line: 3, text: "os.Getenv(name)" }],
      }),
    ).toEqual({
      contractVersion: "kibi.reference-extractor.v1",
      status: "ok",
      language: "go",
      members: ["os"],
      unresolved: [{ line: 3, text: "os.Getenv(name)" }],
    });
    for (const bad of [
      {
        contractVersion: "x",
        status: "ok",
        language: "go",
        members: [],
        unresolved: [],
      },
      {
        contractVersion: "kibi.reference-extractor.v1",
        status: "ok",
        language: "go",
        members: [1],
        unresolved: [],
      },
      {
        contractVersion: "kibi.reference-extractor.v1",
        status: "ok",
        language: "go",
        members: [],
        unresolved: [{ line: 0, text: "x" }],
      },
      {
        contractVersion: "kibi.reference-extractor.v1",
        status: "failed",
        code: "",
        message: "x",
      },
      {
        contractVersion: "kibi.reference-extractor.v1",
        status: "maybe",
        code: "X",
        message: "x",
      },
    ])
      expectValidationCode(
        () => validateReferenceExtractionResult(bad),
        "INVALID_CAPABILITY_RESULT",
      );
    expect(
      validateReferenceExtractionResult({
        contractVersion: "kibi.reference-extractor.v1",
        status: "unsupported",
        code: "NO_READER",
        message: "no reader",
      }),
    ).toEqual({
      contractVersion: "kibi.reference-extractor.v1",
      status: "unsupported",
      code: "NO_READER",
      message: "no reader",
    });
  });
});
