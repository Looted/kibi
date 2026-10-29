import { describe, expect, test } from "bun:test";
import {
  KIBI_PLUGIN_API_VERSION,
  PluginValidationError,
  SEARCH_HINTS_CAPABILITY_ID,
  isCapabilityId,
  validateKibiPlugin,
  validateProjectKibiConfig,
  validateSearchHintsResult,
} from "../src/index.js";

const permissions = { network: false, metered: false, secrets: [] };

const searchHints = {
  id: "test.hints",
  model: "test-model",
  hint: () => ({ hints: [] }),
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

function activate(mode: string) {
  return validateProjectKibiConfig({
    plugins: [
      {
        package: "kibi-plugin-search-hints",
        capabilities: { [SEARCH_HINTS_CAPABILITY_ID]: { mode } },
      },
    ],
  });
}

// executable_for TEST-capability-search-hints-v1
describe("kibi.search-hints.v1 protocol", () => {
  test("is a known capability id activated in replace or shadow mode", () => {
    expect(isCapabilityId(SEARCH_HINTS_CAPABILITY_ID)).toBe(true);
    expect(activate("replace").plugins?.[0]?.capabilities).toEqual({
      [SEARCH_HINTS_CAPABILITY_ID]: { mode: "replace" },
    });
    expect(activate("shadow").plugins?.[0]?.capabilities).toEqual({
      [SEARCH_HINTS_CAPABILITY_ID]: { mode: "shadow" },
    });
  });

  test("augment is rejected: there is no builtin result to refine", () => {
    expectValidationCode(() => activate("augment"), "INVALID_MODE");
  });

  test("a plugin may provide only search hints, with a model", () => {
    const plugin = validateKibiPlugin({
      apiVersion: KIBI_PLUGIN_API_VERSION,
      id: "hints-only",
      version: "0.1.0",
      permissions,
      capabilities: { searchHints },
    });
    expect(plugin.capabilities.searchHints?.model).toBe("test-model");
    expectValidationCode(
      () =>
        validateKibiPlugin({
          apiVersion: KIBI_PLUGIN_API_VERSION,
          id: "hints-no-model",
          version: "0.1.0",
          permissions,
          capabilities: { searchHints: { id: "x", hint: () => ({}) } },
        }),
      "INVALID_CAPABILITY",
    );
    expectValidationCode(
      () =>
        validateKibiPlugin({
          apiVersion: KIBI_PLUGIN_API_VERSION,
          id: "hints-no-fn",
          version: "0.1.0",
          permissions,
          capabilities: { searchHints: { id: "x", model: "m" } },
        }),
      "INVALID_CAPABILITY",
    );
  });

  test("a result names supplied entities once, in score order, within the limit", () => {
    const ids = ["REQ-a", "REQ-b", "REQ-c"];
    expect(
      validateSearchHintsResult(
        {
          hints: [
            { id: "REQ-b", score: 0.9 },
            { id: "REQ-a", score: 0.5 },
            { id: "REQ-c", score: 0.5 },
          ],
        },
        ids,
        3,
      ).hints.map((hint) => hint.id),
    ).toEqual(["REQ-b", "REQ-a", "REQ-c"]);
    const bad = [
      { hints: [{ id: "REQ-x", score: 0.5 }] },
      {
        hints: [
          { id: "REQ-a", score: 0.5 },
          { id: "REQ-a", score: 0.4 },
        ],
      },
      { hints: [{ id: "REQ-a", score: 1.5 }] },
      { hints: [{ id: "REQ-a", score: Number.NaN }] },
      {
        hints: [
          { id: "REQ-a", score: 0.4 },
          { id: "REQ-b", score: 0.5 },
        ],
      },
      {
        hints: [
          { id: "REQ-b", score: 0.5 },
          { id: "REQ-a", score: 0.5 },
        ],
      },
      { hints: "nope" },
    ];
    for (const value of bad)
      expectValidationCode(
        () => validateSearchHintsResult(value, ids, 3),
        "INVALID_CAPABILITY_RESULT",
      );
    expectValidationCode(
      () =>
        validateSearchHintsResult(
          {
            hints: [
              { id: "REQ-a", score: 0.5 },
              { id: "REQ-b", score: 0.4 },
            ],
          },
          ids,
          1,
        ),
      "INVALID_CAPABILITY_RESULT",
    );
  });
});
