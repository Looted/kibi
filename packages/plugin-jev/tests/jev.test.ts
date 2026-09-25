import { afterEach, describe, expect, mock, test } from "bun:test";
import {
  validateKibiPlugin,
  validateSemanticClassifierResult,
} from "kibi-plugin-sdk";
import {
  JEV_DEFAULT_MODEL,
  JEV_MAX_TIMEOUT_MS,
  JevProviderError,
  createJevPlugin,
  createJevSemanticClassifier,
  kibiPlugin,
  resolveJevModel,
  resolveJevTimeoutMs,
} from "../src/index.js";
import type { JevClient, JevSystemOneResult } from "../src/jev-client.js";

function mockClient(
  result: JevSystemOneResult | (() => Promise<JevSystemOneResult>),
): JevClient {
  return {
    systemOne: mock(async () =>
      typeof result === "function" ? result() : result,
    ),
  };
}

const originalJevModel = process.env.KIBI_JEV_MODEL;
const originalJevTimeout = process.env.KIBI_JEV_TIMEOUT_MS;

function restoreJevEnv(): void {
  if (originalJevModel === undefined) {
    // biome-ignore lint/performance/noDelete: unset must remove the key; assigning undefined stringifies it.
    delete process.env.KIBI_JEV_MODEL;
  } else {
    process.env.KIBI_JEV_MODEL = originalJevModel;
  }
  if (originalJevTimeout === undefined) {
    // biome-ignore lint/performance/noDelete: unset must remove the key; assigning undefined stringifies it.
    delete process.env.KIBI_JEV_TIMEOUT_MS;
  } else {
    process.env.KIBI_JEV_TIMEOUT_MS = originalJevTimeout;
  }
}

function clearJevEnv(): void {
  // biome-ignore lint/performance/noDelete: unset must remove the key; assigning undefined stringifies it.
  delete process.env.KIBI_JEV_MODEL;
  // biome-ignore lint/performance/noDelete: unset must remove the key; assigning undefined stringifies it.
  delete process.env.KIBI_JEV_TIMEOUT_MS;
}

// executable_for TEST-capability-plugin-jev-fallback-v1
describe("kibi-plugin-jev", () => {
  afterEach(() => {
    restoreJevEnv();
  });
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

    clearJevEnv();
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
    expect(client.systemOne).toHaveBeenCalledWith(
      expect.objectContaining({ model: "jev-latest" }),
    );
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
  test("maps HTTP 401 invalid credentials as auth, not missing_api_key", async () => {
    const { mapJevError } = await import("../src/jev-client.js");
    const mapped = mapJevError(
      Object.assign(new Error("Unauthorized"), { status: 401 }),
    );
    expect(mapped.code).toBe("auth");
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

    const classifier = plugin.capabilities.semanticClassifier;
    expect(classifier).toBeDefined();
    const result = await classifier.classify({
      propositions: [{ claimKey: "c1", statement: "informational note" }],
    });
    expect(result.decisions[0]?.lane).toBe("none");
  });

  // executable_for TEST-capability-plugin-jev-fallback-v1
  test("environment model and timeout yield to explicit options", async () => {
    clearJevEnv();
    process.env.KIBI_JEV_MODEL = "env-model";
    process.env.KIBI_JEV_TIMEOUT_MS = " 2500 ";
    expect(resolveJevModel(undefined)).toBe("env-model");
    expect(resolveJevModel("")).toBe("env-model");
    expect(resolveJevModel("  ")).toBe("env-model");
    expect(resolveJevModel("explicit-model")).toBe("explicit-model");
    expect(resolveJevTimeoutMs(undefined)).toBe(2500);
    expect(resolveJevTimeoutMs(4000)).toBe(4000);

    const seen: Array<{ model?: string; timeoutMs?: number }> = [];
    const classifier = createJevSemanticClassifier({
      model: "explicit-model",
      timeoutMs: 4000,
      clientFactory: (options) => {
        seen.push({ ...options });
        return mockClient({
          answers: {
            "lane:c1": { choice: "none", confidence: 0.2 },
            "ambiguous:c1": { noul: 0.1 },
          },
        });
      },
    });
    expect(classifier.model).toBe("explicit-model");
    await classifier.classify({
      propositions: [{ claimKey: "c1", statement: "x" }],
    });
    expect(seen).toEqual([{ timeoutMs: 4000 }]);
  });

  // executable_for TEST-capability-plugin-jev-fallback-v1
  test("blank model env is unset and blank timeout env omits the client timeout", async () => {
    process.env.KIBI_JEV_MODEL = "   ";
    process.env.KIBI_JEV_TIMEOUT_MS = "  ";
    expect(resolveJevModel(undefined)).toBe(JEV_DEFAULT_MODEL);
    expect(resolveJevTimeoutMs(undefined)).toBeUndefined();

    const seen: unknown[] = [];
    const classifier = createJevSemanticClassifier({
      clientFactory: (options) => {
        seen.push(options);
        return mockClient({
          answers: {
            "lane:c1": { choice: "none", confidence: 0.2 },
            "ambiguous:c1": { noul: 0 },
          },
        });
      },
    });
    expect(classifier.model).toBe(JEV_DEFAULT_MODEL);
    await classifier.classify({
      propositions: [{ claimKey: "c1", statement: "x" }],
    });
    expect(seen).toEqual([{}]);
  });

  // executable_for TEST-capability-plugin-jev-fallback-v1
  test("malformed timeout configuration fails before any client call", () => {
    const factory = mock(() => mockClient({ answers: {} }));
    for (const value of ["nope", "0", "-5", "1.5", "1e3", "120001", "01"]) {
      process.env.KIBI_JEV_MODEL = "pinned-model";
      process.env.KIBI_JEV_TIMEOUT_MS = value;
      expect(() =>
        createJevSemanticClassifier({ clientFactory: factory }),
      ).toThrow(JevProviderError);
      try {
        createJevSemanticClassifier({ clientFactory: factory });
      } catch (error) {
        expect(error).toMatchObject({
          code: "malformed",
          model: "pinned-model",
        });
        expect((error as Error).message).toContain("KIBI_JEV_TIMEOUT_MS");
        expect((error as Error).message).toContain(String(JEV_MAX_TIMEOUT_MS));
        expect((error as Error).message).not.toContain("TYPESAFE_API_KEY");
      }
    }
    expect(factory).not.toHaveBeenCalled();

    clearJevEnv();
    expect(() =>
      createJevSemanticClassifier({
        timeoutMs: Number.NaN,
        clientFactory: factory,
      }),
    ).toThrow(/JevSemanticClassifierOptions\.timeoutMs/);
    expect(factory).not.toHaveBeenCalled();
  });
});
