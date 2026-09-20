import { describe, expect, test } from "bun:test";
import {
  KIBI_PLUGIN_API_VERSION,
  SEMANTIC_CLASSIFIER_CAPABILITY_ID,
  defineKibiPlugin,
  validateKibiPlugin,
  validateOntologyMatchCandidate,
  validateProjectKibiConfig,
  validateSemanticClassifierResult,
  PluginValidationError,
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
});
