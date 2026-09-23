import { describe, expect, test } from "bun:test";
import {
  KIBI_PLUGIN_API_VERSION,
  PluginValidationError,
  SEMANTIC_CLASSIFIER_CAPABILITY_ID,
  defineKibiPlugin,
  validateKibiPlugin,
  validateOntologyMatchCandidate,
  validateProjectKibiConfig,
  validateSemanticClassifierResult,
} from "../src/index.js";

// executable_for TEST-capability-plugin-protocol-v1
describe("kibi-plugin-sdk", () => {
  // executable_for TEST-capability-plugin-protocol-v1
  test("defineKibiPlugin preserves a valid semantic classifier plugin", () => {
    const plugin = defineKibiPlugin({
      apiVersion: KIBI_PLUGIN_API_VERSION,
      id: "example",
      version: "1.0.0",
      permissions: { network: false, metered: false, secrets: [] },
      capabilities: {
        semanticClassifier: {
          id: "example-classifier",
          classify: () => ({ decisions: [] }),
        },
      },
    });
    expect(validateKibiPlugin(plugin).id).toBe("example");
  });

  // executable_for TEST-capability-plugin-protocol-v1
  test("rejects unsupported api versions", () => {
    expect(() =>
      validateKibiPlugin({
        apiVersion: "kibi.plugin.v0",
        id: "x",
        version: "1",
        permissions: { network: false, metered: false, secrets: [] },
        capabilities: {
          semanticClassifier: {
            id: "c",
            classify: () => ({ decisions: [] }),
          },
        },
      }),
    ).toThrow(PluginValidationError);
  });

  // executable_for TEST-capability-plugin-protocol-v1
  test("rejects path package references in project config", () => {
    expect(() =>
      validateProjectKibiConfig({
        plugins: [
          {
            package: "../evil",
            capabilities: {
              [SEMANTIC_CLASSIFIER_CAPABILITY_ID]: { mode: "augment" },
            },
          },
        ],
      }),
    ).toThrow(/bare package name/);
  });

  // executable_for TEST-capability-plugin-protocol-v1
  test("rejects ontology candidates with wrong arity", () => {
    expect(() =>
      validateOntologyMatchCandidate(
        {
          schemaId: "schema.guard",
          predicateName: "guard",
          arguments: ["a"],
          polarity: "assert",
          confidence: 0.5,
          evidence: "x",
        },
        [
          {
            schemaId: "schema.guard",
            predicateName: "guard",
            argumentNames: ["subject", "condition", "state"],
            argumentTypes: ["entity", "entity", "string"],
          },
        ],
      ),
    ).toThrow(/arity/);
  });

  // executable_for TEST-capability-plugin-protocol-v1
  test("accepts a valid semantic classifier result", () => {
    const result = validateSemanticClassifierResult({
      decisions: [
        {
          claimKey: "ck",
          lane: "predicate",
          confidence: 0.8,
        },
      ],
    });
    expect(result.decisions[0]?.lane).toBe("predicate");
  });

  // executable_for TEST-capability-plugin-protocol-v1
  test("rejects foreign and duplicate semantic claimKeys", () => {
    expect(() =>
      validateSemanticClassifierResult(
        {
          decisions: [{ claimKey: "foreign", lane: "none", confidence: 0 }],
        },
        { expectedClaimKeys: ["local"] },
      ),
    ).toThrow(/foreign claimKey/);

    expect(() =>
      validateSemanticClassifierResult({
        decisions: [
          { claimKey: "ck", lane: "none", confidence: 0 },
          { claimKey: "ck", lane: "predicate", confidence: 0.5 },
        ],
      }),
    ).toThrow(/duplicate decision/);
  });

  test("rejects duplicate package activation and duplicate replace providers", () => {
    expect(() =>
      validateProjectKibiConfig({
        plugins: [
          {
            package: "dup",
            capabilities: {
              [SEMANTIC_CLASSIFIER_CAPABILITY_ID]: { mode: "augment" },
            },
          },
          {
            package: "dup",
            capabilities: {
              [SEMANTIC_CLASSIFIER_CAPABILITY_ID]: { mode: "shadow" },
            },
          },
        ],
      }),
    ).toThrow(/more than once/);

    expect(() =>
      validateProjectKibiConfig({
        plugins: [
          {
            package: "r1",
            capabilities: {
              [SEMANTIC_CLASSIFIER_CAPABILITY_ID]: { mode: "replace" },
            },
          },
          {
            package: "r2",
            capabilities: {
              [SEMANTIC_CLASSIFIER_CAPABILITY_ID]: { mode: "replace" },
            },
          },
        ],
      }),
    ).toThrow(/At most one replace provider/);
  });

  test("preserves a disclosed classifier model and rejects a blank one", () => {
    const plugin = validateKibiPlugin({
      apiVersion: KIBI_PLUGIN_API_VERSION,
      id: "x",
      version: "1",
      permissions: { network: false, metered: false, secrets: [] },
      capabilities: {
        semanticClassifier: {
          id: "c",
          model: " example-model ",
          classify: () => ({ decisions: [] }),
        },
      },
    });
    expect(plugin.capabilities.semanticClassifier?.model).toBe("example-model");
    expect(() =>
      validateKibiPlugin({
        apiVersion: KIBI_PLUGIN_API_VERSION,
        id: "x",
        version: "1",
        permissions: { network: false, metered: false, secrets: [] },
        capabilities: {
          semanticClassifier: {
            id: "c",
            model: " ",
            classify: () => ({ decisions: [] }),
          },
        },
      }),
    ).toThrow(/model must be a non-empty string/);
  });

  test("rejects duplicate secret names", () => {
    expect(() =>
      validateKibiPlugin({
        apiVersion: KIBI_PLUGIN_API_VERSION,
        id: "x",
        version: "1",
        permissions: {
          network: true,
          metered: true,
          secrets: ["TYPESAFE_API_KEY", "TYPESAFE_API_KEY"],
        },
        capabilities: {
          semanticClassifier: {
            id: "c",
            classify: () => ({ decisions: [] }),
          },
        },
      }),
    ).toThrow(/duplicate names/);
  });
});
