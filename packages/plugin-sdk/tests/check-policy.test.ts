import { describe, expect, test } from "bun:test";
import {
  CHECK_POLICY_CAPABILITY_ID,
  CHECK_POLICY_CONTRACT_VERSION,
  KIBI_PLUGIN_API_VERSION,
  PluginValidationError,
  isCapabilityId,
  validateCheckPolicyDocument,
  validateKibiPlugin,
  validateProjectKibiConfig,
} from "../src/index.js";

const permissions = { network: false, metered: false, secrets: [] };

const document = {
  contractVersion: CHECK_POLICY_CONTRACT_VERSION,
  id: "ui-design",
  title: "UI design coverage",
  ownership: [
    {
      id: "ui-component-ownership",
      description: "UI components implement a design requirement",
      include: ["src/**/*.tsx"],
      exclude: ["**/*.test.tsx"],
      symbolTitlePattern: "^[A-Z]",
      requirePredicates: ["ui_pattern"],
      exemptTag: "review:ui-unconstrained",
    },
  ],
  markers: [
    {
      id: "ui-pattern-markers",
      description: "Pattern markers stay in implementing files",
      patternPredicate: "ui_pattern",
      patternArgument: 1,
      markerPredicate: "pattern_marker",
      markerPatternArgument: 0,
      markerArgument: 1,
      siblingExtensions: [".html"],
    },
  ],
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

// executable_for TEST-capability-check-policy
describe("kibi.check-policy.v1 protocol", () => {
  test("is a known capability that activates only in augment mode", () => {
    expect(isCapabilityId(CHECK_POLICY_CAPABILITY_ID)).toBe(true);
    const config = validateProjectKibiConfig({
      plugins: [
        {
          package: "kibi-plugin-ui",
          capabilities: { [CHECK_POLICY_CAPABILITY_ID]: { mode: "augment" } },
        },
      ],
    });
    expect(config.plugins?.[0]?.capabilities).toEqual({
      [CHECK_POLICY_CAPABILITY_ID]: { mode: "augment" },
    });
    for (const mode of ["replace", "shadow"]) {
      expectValidationCode(
        () =>
          validateProjectKibiConfig({
            plugins: [
              {
                package: "kibi-plugin-ui",
                capabilities: { [CHECK_POLICY_CAPABILITY_ID]: { mode } },
              },
            ],
          }),
        "INVALID_MODE",
      );
    }
  });

  test("records declined plugins as bare package names", () => {
    expect(
      validateProjectKibiConfig({ declinedPlugins: ["kibi-plugin-ui"] }),
    ).toEqual({ declinedPlugins: ["kibi-plugin-ui"] });
    expectValidationCode(
      () => validateProjectKibiConfig({ declinedPlugins: "kibi-plugin-ui" }),
      "INVALID_PROJECT_CONFIG",
    );
    expectValidationCode(
      () => validateProjectKibiConfig({ declinedPlugins: ["./local"] }),
      "INVALID_PACKAGE_REFERENCE",
    );
  });

  test("a plugin may provide only a check policy", () => {
    const plugin = validateKibiPlugin({
      apiVersion: KIBI_PLUGIN_API_VERSION,
      id: "ui",
      version: "0.1.0",
      permissions,
      capabilities: { checkPolicy: { id: "ui.policy", document } },
    });
    expect(plugin.capabilities.checkPolicy?.document.ownership?.[0]?.id).toBe(
      "ui-component-ownership",
    );
  });

  test("validates the document and keeps declared fields", () => {
    expect(validateCheckPolicyDocument(document)).toEqual(document);
  });

  test("rejects malformed documents with INVALID_CHECK_POLICY", () => {
    const cases: unknown[] = [
      { ...document, contractVersion: "kibi.check-policy.v0" },
      { ...document, id: "UI Design" },
      {
        ...document,
        ownership: [{ ...document.ownership[0], include: [] }],
      },
      {
        ...document,
        ownership: [
          { ...document.ownership[0], requirePredicates: ["UiPattern"] },
        ],
      },
      {
        ...document,
        ownership: [{ ...document.ownership[0], symbolTitlePattern: "(" }],
      },
      {
        ...document,
        markers: [{ ...document.markers[0], markerArgument: -1 }],
      },
      {
        ...document,
        markers: [{ ...document.markers[0], siblingExtensions: ["html"] }],
      },
      {
        ...document,
        markers: [{ ...document.markers[0], id: "ui-component-ownership" }],
      },
    ];
    for (const value of cases) {
      expectValidationCode(
        () => validateCheckPolicyDocument(value),
        "INVALID_CHECK_POLICY",
      );
    }
  });
});
