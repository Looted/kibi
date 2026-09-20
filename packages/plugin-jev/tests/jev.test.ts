import { describe, expect, test, mock } from "bun:test";
import {
  validateKibiPlugin,
  validateSemanticClassifierResult,
} from "kibi-plugin-sdk";
import {
  createJevPlugin,
  createJevSemanticClassifier,
  JevProviderError,
  kibiPlugin,
} from "../src/index.js";
import type { JevClient, JevSystemOneResult } from "../src/jev-client.js";

function mockClient(result: JevSystemOneResult | (() => Promise<JevSystemOneResult>)): JevClient {
  return {
    systemOne: mock(async () =>
      typeof result === "function" ? result() : result,
    ),
  };
}

// executable_for TEST-capability-plugin-jev-fallback-v1
describe("kibi-plugin-jev", () => {
  // executable_for TEST-capability-plugin-jev-fallback-v1
  test("named export validates as kibi.plugin.v1", () => {
    const plugin = validateKibiPlugin(kibiPlugin);
    expect(plugin.id).toBe("kibi-plugin-jev");
    expect(plugin.permissions.network).toBe(true);
    expect(plugin.permissions.metered).toBe(true);
    expect(plugin.permissions.secrets).toEqual(["TYPESAFE_API_KEY"]);
    expect(plugin.capabilities.semanticClassifier?.id).toBe(
      "jev-semantic-classifier",
    );
  });

  // executable_for TEST-capability-plugin-jev-fallback-v1
  test("importing the plugin module does not require TYPESAFE_API_KEY", () => {
    expect(kibiPlugin.apiVersion).toBe("kibi.plugin.v1");
  });

  // executable_for TEST-capability-plugin-jev-fallback-v1
  test("classifies propositions from a mocked systemOne response", async () => {
    const client = mockClient({
      answers: {
        "lane:c1": {
          choice: "predicate",
          probabilities: { predicate: 0.91, none: 0.09 },
        },
        "ambiguous:c1": { noul: 0.12 },
        "lane:c2": { choice: "strict_property", confidence: 0.77 },
        "ambiguous:c2": { noul: 0.6 },
      },
    });

    const classifier = createJevSemanticClassifier({
      clientFactory: () => client,
    });

    const result = validateSemanticClassifierResult(
      await classifier.classify({
        propositions: [
          {
            claimKey: "c1",
            statement: "Users must own their workspaces",
            signals: [{ kind: "permission" }],
          },
          {
            claimKey: "c2",
            statement: "Retention is at most 30 days",
          },
        ],
      }),
    );

    expect(result.decisions).toEqual([
      {
        claimKey: "c1",
        lane: "predicate",
        confidence: 0.91,
        ambiguity: { ambiguous: false, confidence: 0.12 },
        signals: ["permission"],
      },
      {
        claimKey: "c2",
        lane: "strict_property",
        confidence: 0.77,
        ambiguity: { ambiguous: true, confidence: 0.6 },
      },
    ]);
    expect(client.systemOne).toHaveBeenCalledTimes(1);
  });

  // executable_for TEST-capability-plugin-jev-fallback-v1
  test("maps missing API key failures", async () => {
    const classifier = createJevSemanticClassifier({
      clientFactory: () => {
        throw new JevProviderError(
          "missing_api_key",
          "TYPESAFE_API_KEY is required",
        );
      },
    });

    await expect(
      classifier.classify({
        propositions: [{ claimKey: "c1", statement: "x" }],
      }),
    ).rejects.toMatchObject({ code: "missing_api_key" });
  });

  // executable_for TEST-capability-plugin-jev-fallback-v1
  test("maps timeout and quota errors from the client", async () => {
    const timeoutClassifier = createJevSemanticClassifier({
      clientFactory: () =>
        mockClient(async () => {
          throw new Error("Request timeout after 30000ms");
        }),
    });
    await expect(
      timeoutClassifier.classify({
        propositions: [{ claimKey: "c1", statement: "x" }],
      }),
    ).rejects.toMatchObject({ code: "timeout" });

    const quotaClassifier = createJevSemanticClassifier({
      clientFactory: () =>
        mockClient(async () => {
          throw Object.assign(new Error("quota exceeded"), { status: 429 });
        }),
    });
    await expect(
      quotaClassifier.classify({
        propositions: [{ claimKey: "c1", statement: "x" }],
      }),
    ).rejects.toMatchObject({ code: "quota" });
  });

  // executable_for TEST-capability-plugin-jev-fallback-v1
  test("rejects malformed lane choices", async () => {
    const classifier = createJevSemanticClassifier({
      clientFactory: () =>
        mockClient({
          answers: {
            "lane:c1": { choice: "not-a-lane" },
            "ambiguous:c1": { noul: 0.1 },
          },
        }),
    });

    await expect(
      classifier.classify({
        propositions: [{ claimKey: "c1", statement: "x" }],
      }),
    ).rejects.toMatchObject({ code: "malformed" });
  });

  // executable_for TEST-capability-plugin-jev-fallback-v1
  test("createJevPlugin accepts an injectable client factory", async () => {
    const plugin = createJevPlugin({
      clientFactory: () =>
        mockClient({
          answers: {
            "lane:c1": { choice: "none", confidence: 0.4 },
            "ambiguous:c1": { noul: 0.1 },
          },
        }),
    });

    const result = await plugin.capabilities.semanticClassifier!.classify({
      propositions: [{ claimKey: "c1", statement: "informational note" }],
    });
    expect(result.decisions[0]?.lane).toBe("none");
  });
});
