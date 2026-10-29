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

  test("plugin validation names the field it rejects and trims ids", () => {
    const plugin = (capability: unknown) =>
      validateKibiPlugin({
        apiVersion: KIBI_PLUGIN_API_VERSION,
        id: "hints",
        version: "0.1.0",
        permissions,
        capabilities: { searchHints: capability },
      });
    expect(
      plugin({ id: " x ", model: " m ", hint: () => ({ hints: [] }) })
        .capabilities.searchHints,
    ).toMatchObject({ id: "x", model: "m" });
    const cases: [unknown, string][] = [
      [null, "searchHints must expose hint()"],
      [{ id: "x", model: "m", hint: "no" }, "searchHints must expose hint()"],
      [
        { id: "  ", model: "m", hint: () => ({}) },
        "searchHints.id must be a non-empty string",
      ],
      [
        { id: 1, model: "m", hint: () => ({}) },
        "searchHints.id must be a non-empty string",
      ],
      [
        { id: "x", model: "", hint: () => ({}) },
        "searchHints.model must be a non-empty string",
      ],
    ];
    for (const [capability, message] of cases) {
      expectValidationCode(() => plugin(capability), "INVALID_CAPABILITY");
      expect(() => plugin(capability)).toThrow(message);
    }
  });

  test("each rejected result says what is wrong with it", () => {
    const ids = ["REQ-a", "REQ-b"];
    const order =
      "is out of order: hints run from highest score to lowest, ties by id";
    const cases: [unknown, number, string][] = [
      [null, 3, "searchHints result must include hints[]"],
      ["hints", 3, "searchHints result must include hints[]"],
      [[], 3, "searchHints result must include hints[]"],
      [{}, 3, "searchHints result must include hints[]"],
      [{ hints: {} }, 3, "searchHints result must include hints[]"],
      [
        {
          hints: [
            { id: "REQ-a", score: 0.5 },
            { id: "REQ-b", score: 0.4 },
          ],
        },
        1,
        "searchHints returned 2 hints; at most 1 were requested",
      ],
      [{ hints: [null] }, 3, "hints[0] must be an object"],
      [{ hints: [[]] }, 3, "hints[0] must be an object"],
      [{ hints: ["REQ-a"] }, 3, "hints[0] must be an object"],
      [
        { hints: [{ score: 0.5 }] },
        3,
        "hints[0].id must be a non-empty string",
      ],
      [
        { hints: [{ id: " ", score: 0.5 }] },
        3,
        "hints[0].id must be a non-empty string",
      ],
      [
        { hints: [{ id: "REQ-x", score: 0.5 }] },
        3,
        "hints[0].id 'REQ-x' is not a supplied entity",
      ],
      [
        {
          hints: [
            { id: "REQ-a", score: 0.5 },
            { id: "REQ-a", score: 0.4 },
          ],
        },
        3,
        "duplicate hint for 'REQ-a'",
      ],
      [
        { hints: [{ id: "REQ-a", score: "0.5" }] },
        3,
        "hints[0].score must be a number between 0 and 1",
      ],
      [
        { hints: [{ id: "REQ-a", score: -0.01 }] },
        3,
        "hints[0].score must be a number between 0 and 1",
      ],
      [
        { hints: [{ id: "REQ-a", score: 1.01 }] },
        3,
        "hints[0].score must be a number between 0 and 1",
      ],
      [
        { hints: [{ id: "REQ-a", score: Number.NaN }] },
        3,
        "hints[0].score must be a number between 0 and 1",
      ],
      [
        {
          hints: [
            { id: "REQ-a", score: 0.4 },
            { id: "REQ-b", score: 0.5 },
          ],
        },
        3,
        `hints[1] ${order}`,
      ],
      [
        {
          hints: [
            { id: "REQ-b", score: 0.5 },
            { id: "REQ-a", score: 0.5 },
          ],
        },
        3,
        `hints[1] ${order}`,
      ],
    ];
    for (const [value, limit, message] of cases) {
      expectValidationCode(
        () => validateSearchHintsResult(value, ids, limit),
        "INVALID_CAPABILITY_RESULT",
      );
      expect(() => validateSearchHintsResult(value, ids, limit)).toThrow(
        message,
      );
    }
  });

  test("scores 0 and 1 are valid, ids are trimmed, and the cap is 20", () => {
    expect(
      validateSearchHintsResult(
        {
          hints: [
            { id: " REQ-a ", score: 1 },
            { id: "REQ-b", score: 0 },
          ],
        },
        ["REQ-a", "REQ-b"],
        2,
      ).hints,
    ).toEqual([
      { id: "REQ-a", score: 1 },
      { id: "REQ-b", score: 0 },
    ]);
    const many = Array.from({ length: 21 }, (_, index) => ({
      id: `REQ-${String(index).padStart(2, "0")}`,
      score: 0.5,
    }));
    const ids = many.map((hint) => hint.id);
    expect(
      validateSearchHintsResult({ hints: many.slice(0, 20) }, ids, 50).hints,
    ).toHaveLength(20);
    expect(() => validateSearchHintsResult({ hints: many }, ids, 50)).toThrow(
      "searchHints returned 21 hints; at most 20 were requested",
    );
  });
});
