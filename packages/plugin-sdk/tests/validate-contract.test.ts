import { describe, expect, test } from "bun:test";
import {
  CHECK_POLICY_CAPABILITY_ID,
  KIBI_PLUGIN_API_VERSION,
  ONTOLOGY_PACK_CAPABILITY_ID,
  PluginValidationError,
  REFERENCE_EXTRACTOR_CAPABILITY_ID,
  SEARCH_HINTS_CAPABILITY_ID,
  SEMANTIC_CLASSIFIER_CAPABILITY_ID,
  SYMBOL_EXTRACTOR_CAPABILITY_ID,
  SYMBOL_EXTRACTOR_V2_CAPABILITY_ID,
  VOCABULARY_ALIGNMENT_CAPABILITY_ID,
  isCapabilityId,
  isPluginMode,
  validateCheckPolicyDocument,
  validateCompareClaimsResult,
  validateKibiPlugin,
  validateOntologyMatchCandidate,
  validatePermissions,
  validatePredicateSchema,
  validateProjectKibiConfig,
  validateRankSubjectsResult,
  validateSemanticClassifierResult,
  validateSourceAnalysisResult,
  validateReferenceExtractionResult,
  validateReferenceExtractor,
  validateSourceAnalysisResultForPath,
  createSymbolExtractorV2Adapter,
  toSourceAnalysisProvider,
} from "../src/index.js";

// Exact code + message assertions: every validator branch is part of the
// plugin protocol contract, so its wording and error code must not drift.
function failure(run: () => unknown): { code: string; message: string } {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(PluginValidationError);
    const failure = error as PluginValidationError;
    expect(failure.name).toBe("PluginValidationError");
    return { code: failure.code, message: failure.message };
  }
  throw new Error("expected a PluginValidationError");
}

function expectFailure(
  run: () => unknown,
  code: string,
  message: string,
): void {
  expect(failure(run)).toStrictEqual({ code, message });
}

const noop = () => undefined;
const permissions = { network: false, metered: false, secrets: [] };

function plugin(capabilities: unknown, overrides: Record<string, unknown> = {}) {
  return {
    apiVersion: KIBI_PLUGIN_API_VERSION,
    id: "example",
    version: "1.0.0",
    permissions,
    capabilities,
    ...overrides,
  };
}

const capabilityFixtures = {
  semanticClassifier: { id: "sc", classify: noop },
  ontologyPack: { id: "op", schemas: noop, match: noop },
  symbolExtractor: { id: "se", supports: noop, analyze: noop },
  symbolExtractorV2: { id: "se2", supports: noop, analyze: noop },
  vocabularyAlignment: { id: "va", rankSubjects: noop, compareClaims: noop },
  checkPolicy: {
    id: "cp",
    document: {
      contractVersion: "kibi.check-policy.v1",
      id: "policy",
      title: "Policy",
    },
  },
  searchHints: { id: "sh", model: "m", hint: noop },
  referenceExtractor: { id: "re", supports: noop, extract: noop },
};

describe("capability ids and modes", () => {
  test("every published capability id is recognized", () => {
    for (const id of [
      SEMANTIC_CLASSIFIER_CAPABILITY_ID,
      ONTOLOGY_PACK_CAPABILITY_ID,
      SYMBOL_EXTRACTOR_CAPABILITY_ID,
      SYMBOL_EXTRACTOR_V2_CAPABILITY_ID,
      VOCABULARY_ALIGNMENT_CAPABILITY_ID,
      CHECK_POLICY_CAPABILITY_ID,
      SEARCH_HINTS_CAPABILITY_ID,
      REFERENCE_EXTRACTOR_CAPABILITY_ID,
    ]) {
      expect(isCapabilityId(id)).toBe(true);
    }
    expect(isCapabilityId("kibi.unknown.v1")).toBe(false);
    expect(isCapabilityId("")).toBe(false);
  });

  test("plugin modes", () => {
    expect(isPluginMode("replace")).toBe(true);
    expect(isPluginMode("augment")).toBe(true);
    expect(isPluginMode("shadow")).toBe(true);
    expect(isPluginMode("other")).toBe(false);
  });
});

describe("validatePermissions", () => {
  test("accepts and trims secrets", () => {
    expect(
      validatePermissions({
        network: true,
        metered: false,
        secrets: [" A ", "B"],
      }),
    ).toStrictEqual({ network: true, metered: false, secrets: ["A", "B"] });
  });

  test("rejects malformed permissions", () => {
    for (const value of [null, [], "x", 1]) {
      expectFailure(
        () => validatePermissions(value),
        "INVALID_PERMISSIONS",
        "permissions must be an object",
      );
    }
    expectFailure(
      () => validatePermissions({ network: "yes", metered: false, secrets: [] }),
      "INVALID_PERMISSIONS",
      "permissions.network must be a boolean",
    );
    expectFailure(
      () => validatePermissions({ network: false, metered: 0, secrets: [] }),
      "INVALID_PERMISSIONS",
      "permissions.metered must be a boolean",
    );
    expectFailure(
      () => validatePermissions({ network: false, metered: false }),
      "INVALID_PERMISSIONS",
      "permissions.secrets must be an array of secret names",
    );
    expectFailure(
      () =>
        validatePermissions({ network: false, metered: false, secrets: ["a", " "] }),
      "INVALID_PERMISSIONS",
      "permissions.secrets[1] must be a non-empty string",
    );
    expectFailure(
      () =>
        validatePermissions({ network: false, metered: false, secrets: [7] }),
      "INVALID_PERMISSIONS",
      "permissions.secrets[0] must be a non-empty string",
    );
    expectFailure(
      () =>
        validatePermissions({
          network: false,
          metered: false,
          secrets: ["a", " a"],
        }),
      "INVALID_PERMISSIONS",
      "permissions.secrets must not contain duplicate names",
    );
  });
});

describe("validateKibiPlugin", () => {
  test("accepts every capability and returns exactly the validated shape", () => {
    const result = validateKibiPlugin(
      plugin(capabilityFixtures, { id: " example ", version: " 2.0.0 " }),
    );
    expect(result.apiVersion).toBe(KIBI_PLUGIN_API_VERSION);
    expect(result.id).toBe("example");
    expect(result.version).toBe("2.0.0");
    expect(result.permissions).toStrictEqual(permissions);
    expect(Object.keys(result.capabilities).sort()).toStrictEqual(
      Object.keys(capabilityFixtures).sort(),
    );
    expect(result.capabilities.semanticClassifier).toStrictEqual({
      id: "sc",
      classify: noop,
    });
    expect(result.capabilities.ontologyPack).toStrictEqual({
      id: "op",
      schemas: noop,
      match: noop,
    });
    expect(result.capabilities.symbolExtractor).toStrictEqual({
      id: "se",
      supports: noop,
      analyze: noop,
    });
    expect(result.capabilities.symbolExtractorV2).toStrictEqual({
      id: "se2",
      supports: noop,
      analyze: noop,
    });
    expect(result.capabilities.vocabularyAlignment).toStrictEqual({
      id: "va",
      rankSubjects: noop,
      compareClaims: noop,
    });
    expect(result.capabilities.checkPolicy).toStrictEqual({
      id: "cp",
      document: {
        contractVersion: "kibi.check-policy.v1",
        id: "policy",
        title: "Policy",
      },
    });
    expect(result.capabilities.searchHints?.id).toBe("sh");
    expect(result.capabilities.referenceExtractor?.id).toBe("re");
  });

  test("each capability alone is enough", () => {
    for (const [name, value] of Object.entries(capabilityFixtures)) {
      const result = validateKibiPlugin(plugin({ [name]: value }));
      expect(Object.keys(result.capabilities)).toStrictEqual([name]);
    }
  });

  test("optional models are trimmed or rejected", () => {
    expect(
      validateKibiPlugin(
        plugin({
          semanticClassifier: { id: "sc", classify: noop, model: " gpt " },
        }),
      ).capabilities.semanticClassifier?.model,
    ).toBe("gpt");
    expect(
      validateKibiPlugin(
        plugin({
          vocabularyAlignment: {
            id: "va",
            rankSubjects: noop,
            compareClaims: noop,
            model: " m ",
          },
        }),
      ).capabilities.vocabularyAlignment?.model,
    ).toBe("m");
    for (const model of ["", "  ", 3]) {
      expectFailure(
        () =>
          validateKibiPlugin(
            plugin({ semanticClassifier: { id: "sc", classify: noop, model } }),
          ),
        "INVALID_CAPABILITY",
        "semanticClassifier.model must be a non-empty string when provided",
      );
      expectFailure(
        () =>
          validateKibiPlugin(
            plugin({
              vocabularyAlignment: {
                id: "va",
                rankSubjects: noop,
                compareClaims: noop,
                model,
              },
            }),
          ),
        "INVALID_CAPABILITY",
        "vocabularyAlignment.model must be a non-empty string when provided",
      );
    }
  });

  test("rejects plugin envelopes", () => {
    for (const value of [null, [], "x"]) {
      expectFailure(
        () => validateKibiPlugin(value),
        "INVALID_PLUGIN",
        "Plugin export must be an object",
      );
    }
    expectFailure(
      () => validateKibiPlugin(plugin({}, { apiVersion: undefined })),
      "INVALID_PLUGIN",
      "apiVersion must be a non-empty string",
    );
    expectFailure(
      () => validateKibiPlugin(plugin({}, { apiVersion: "kibi.plugin.v0" })),
      "UNSUPPORTED_API_VERSION",
      `Unsupported plugin apiVersion 'kibi.plugin.v0'; expected '${KIBI_PLUGIN_API_VERSION}'`,
    );
    expectFailure(
      () => validateKibiPlugin(plugin({}, { id: "" })),
      "INVALID_PLUGIN",
      "id must be a non-empty string",
    );
    expectFailure(
      () => validateKibiPlugin(plugin({}, { version: " " })),
      "INVALID_PLUGIN",
      "version must be a non-empty string",
    );
    expectFailure(
      () => validateKibiPlugin(plugin({}, { permissions: null })),
      "INVALID_PERMISSIONS",
      "permissions must be an object",
    );
    expectFailure(
      () => validateKibiPlugin(plugin([])),
      "INVALID_CAPABILITY",
      "capabilities must be an object",
    );
    expectFailure(
      () => validateKibiPlugin(plugin({})),
      "INVALID_CAPABILITY",
      "Plugin must declare at least one supported capability",
    );
    expectFailure(
      () => validateKibiPlugin(plugin({ unknown: {} })),
      "INVALID_CAPABILITY",
      "Plugin must declare at least one supported capability",
    );
  });

  test("rejects malformed capabilities", () => {
    const cases: [string, unknown, string][] = [
      ["semanticClassifier", { id: "x" }, "semanticClassifier must expose classify()"],
      ["semanticClassifier", null, "semanticClassifier must expose classify()"],
      [
        "semanticClassifier",
        { id: " ", classify: noop },
        "semanticClassifier.id must be a non-empty string",
      ],
      ["ontologyPack", { id: "x", schemas: noop }, "ontologyPack must expose schemas() and match()"],
      ["ontologyPack", { id: "x", match: noop }, "ontologyPack must expose schemas() and match()"],
      ["ontologyPack", "x", "ontologyPack must expose schemas() and match()"],
      [
        "ontologyPack",
        { schemas: noop, match: noop },
        "ontologyPack.id must be a non-empty string",
      ],
      ["symbolExtractor", { id: "x", supports: noop }, "symbolExtractor must expose supports() and analyze()"],
      ["symbolExtractor", { id: "x", analyze: noop }, "symbolExtractor must expose supports() and analyze()"],
      ["symbolExtractor", 1, "symbolExtractor must expose supports() and analyze()"],
      [
        "symbolExtractor",
        { supports: noop, analyze: noop },
        "symbolExtractor.id must be a non-empty string",
      ],
      ["symbolExtractorV2", { id: "x", supports: noop }, "symbolExtractorV2 must expose supports() and analyze()"],
      ["symbolExtractorV2", { id: "x", analyze: noop }, "symbolExtractorV2 must expose supports() and analyze()"],
      ["symbolExtractorV2", [], "symbolExtractorV2 must expose supports() and analyze()"],
      [
        "symbolExtractorV2",
        { supports: noop, analyze: noop },
        "symbolExtractorV2.id must be a non-empty string",
      ],
      [
        "vocabularyAlignment",
        { id: "x", rankSubjects: noop },
        "vocabularyAlignment must expose rankSubjects() and compareClaims()",
      ],
      [
        "vocabularyAlignment",
        { id: "x", compareClaims: noop },
        "vocabularyAlignment must expose rankSubjects() and compareClaims()",
      ],
      [
        "vocabularyAlignment",
        null,
        "vocabularyAlignment must expose rankSubjects() and compareClaims()",
      ],
      [
        "vocabularyAlignment",
        { rankSubjects: noop, compareClaims: noop },
        "vocabularyAlignment.id must be a non-empty string",
      ],
      ["checkPolicy", [], "checkPolicy must be an object with id and document"],
      [
        "checkPolicy",
        { document: capabilityFixtures.checkPolicy.document },
        "checkPolicy.id must be a non-empty string",
      ],
    ];
    for (const [name, value, message] of cases) {
      expectFailure(
        () => validateKibiPlugin(plugin({ [name]: value })),
        "INVALID_CAPABILITY",
        message,
      );
    }
    expectFailure(
      () =>
        validateKibiPlugin(
          plugin({ checkPolicy: { id: "cp", document: { contractVersion: "x" } } }),
        ),
      "INVALID_CHECK_POLICY",
      "check policy contractVersion must be 'kibi.check-policy.v1'",
    );
    expectFailure(
      () => validateKibiPlugin(plugin({ searchHints: { id: "x" } })),
      "INVALID_CAPABILITY",
      "searchHints must expose hint()",
    );
    expectFailure(
      () => validateKibiPlugin(plugin({ referenceExtractor: { id: "x" } })),
      "INVALID_CAPABILITY",
      "referenceExtractor must expose supports() and extract()",
    );
  });

  test("provider ids must be unique within a plugin", () => {
    const names = Object.keys(capabilityFixtures) as (keyof typeof capabilityFixtures)[];
    for (const left of names) {
      for (const right of names) {
        if (left >= right) continue;
        expectFailure(
          () =>
            validateKibiPlugin(
              plugin({
                [left]: { ...capabilityFixtures[left], id: "same" },
                [right]: { ...capabilityFixtures[right], id: "same" },
              }),
            ),
          "INVALID_CAPABILITY",
          "capability provider ids must be unique within a plugin",
        );
      }
    }
  });
});

describe("validateProjectKibiConfig", () => {
  const entry = (pkg: string, capabilities: Record<string, unknown>) => ({
    package: pkg,
    capabilities,
  });

  test("defaults and declined lists", () => {
    expect(validateProjectKibiConfig(undefined)).toStrictEqual({});
    expect(validateProjectKibiConfig({})).toStrictEqual({});
    expect(
      validateProjectKibiConfig({
        declinedPlugins: [" kibi-plugin-a ", "@scope/b"],
        declinedLanguagePacks: [" kibi-lang-cpp", "kibi-lang-c-sharp"],
        generatedPaths: [" src/gen/** ", "!src/gen/keep.ts"],
      }),
    ).toStrictEqual({
      declinedPlugins: ["kibi-plugin-a", "@scope/b"],
      declinedLanguagePacks: ["kibi-lang-cpp", "kibi-lang-c-sharp"],
      generatedPaths: ["src/gen/**", "!src/gen/keep.ts"],
    });
    expect(
      validateProjectKibiConfig({ declinedPlugins: ["a"], plugins: [] }),
    ).toStrictEqual({ plugins: [], declinedPlugins: ["a"] });
    expect(validateProjectKibiConfig({ declinedLanguagePacks: [] })).toStrictEqual({
      declinedLanguagePacks: [],
    });
    expect(validateProjectKibiConfig({ generatedPaths: [] })).toStrictEqual({
      generatedPaths: [],
    });
  });

  test("rejects malformed top-level config", () => {
    for (const value of [null, [], "x"]) {
      expectFailure(
        () => validateProjectKibiConfig(value),
        "INVALID_PROJECT_CONFIG",
        "package.json kibi field must be an object",
      );
    }
    expectFailure(
      () => validateProjectKibiConfig({ plugins: {} }),
      "INVALID_PROJECT_CONFIG",
      "kibi.plugins must be an array",
    );
    expectFailure(
      () => validateProjectKibiConfig({ declinedPlugins: "a" }),
      "INVALID_PROJECT_CONFIG",
      "kibi.declinedPlugins must be an array of package names",
    );
    expectFailure(
      () => validateProjectKibiConfig({ declinedPlugins: ["a", ""] }),
      "INVALID_PROJECT_CONFIG",
      "kibi.declinedPlugins[1] must be a non-empty string",
    );
    for (const name of ["./a", "/a", "a:b", "a\\b"]) {
      expectFailure(
        () => validateProjectKibiConfig({ declinedPlugins: ["ok", name] }),
        "INVALID_PACKAGE_REFERENCE",
        "kibi.declinedPlugins[1] must be a bare package name",
      );
    }
    expectFailure(
      () => validateProjectKibiConfig({ generatedPaths: "src" }),
      "INVALID_PROJECT_CONFIG",
      "kibi.generatedPaths must be an array of gitignore-style globs",
    );
    expectFailure(
      () => validateProjectKibiConfig({ generatedPaths: ["a", 1] }),
      "INVALID_PROJECT_CONFIG",
      "kibi.generatedPaths[1] must be a non-empty string",
    );
    for (const pattern of ["/abs/**", "!/abs", "a\\b"]) {
      expectFailure(
        () => validateProjectKibiConfig({ generatedPaths: ["ok", pattern] }),
        "INVALID_PROJECT_CONFIG",
        'kibi.generatedPaths[1] must be a non-empty glob relative to the repository root, such as "src/gen/**" or "!src/gen/keep.ts"',
      );
    }
    expect(
      validateProjectKibiConfig({ generatedPaths: ["a/!b", "x/"] }).generatedPaths,
    ).toStrictEqual(["a/!b", "x/"]);
    expectFailure(
      () => validateProjectKibiConfig({ declinedLanguagePacks: {} }),
      "INVALID_PROJECT_CONFIG",
      "kibi.declinedLanguagePacks must be an array of kibi-lang-* package names",
    );
    expectFailure(
      () => validateProjectKibiConfig({ declinedLanguagePacks: ["kibi-lang-c", null] }),
      "INVALID_PROJECT_CONFIG",
      "kibi.declinedLanguagePacks[1] must be a non-empty string",
    );
    for (const name of [
      "kibi-lang-",
      "kibi-lang-Cpp",
      "xkibi-lang-cpp",
      "kibi-lang-cpp!",
      "kibi-lang--x",
      "lang-cpp",
    ]) {
      expectFailure(
        () =>
          validateProjectKibiConfig({
            declinedLanguagePacks: ["kibi-lang-c", name],
          }),
        "INVALID_PACKAGE_REFERENCE",
        "kibi.declinedLanguagePacks[1] must be a kibi-lang-* package name such as kibi-lang-cpp",
      );
    }
  });

  test("validates plugin entries", () => {
    expect(
      validateProjectKibiConfig({
        plugins: [
          entry(" kibi-plugin-a ", {
            [SEMANTIC_CLASSIFIER_CAPABILITY_ID]: { mode: "replace", extra: 1 },
            [CHECK_POLICY_CAPABILITY_ID]: { mode: "augment" },
            [REFERENCE_EXTRACTOR_CAPABILITY_ID]: { mode: "augment" },
            [SEARCH_HINTS_CAPABILITY_ID]: { mode: "shadow" },
          }),
          entry("kibi-plugin-b", {
            [SEMANTIC_CLASSIFIER_CAPABILITY_ID]: { mode: "shadow" },
            [SEARCH_HINTS_CAPABILITY_ID]: { mode: "replace" },
          }),
          entry("kibi-plugin-c", {}),
        ],
      }),
    ).toStrictEqual({
      plugins: [
        {
          package: "kibi-plugin-a",
          capabilities: {
            [SEMANTIC_CLASSIFIER_CAPABILITY_ID]: { mode: "replace" },
            [CHECK_POLICY_CAPABILITY_ID]: { mode: "augment" },
            [REFERENCE_EXTRACTOR_CAPABILITY_ID]: { mode: "augment" },
            [SEARCH_HINTS_CAPABILITY_ID]: { mode: "shadow" },
          },
        },
        {
          package: "kibi-plugin-b",
          capabilities: {
            [SEMANTIC_CLASSIFIER_CAPABILITY_ID]: { mode: "shadow" },
            [SEARCH_HINTS_CAPABILITY_ID]: { mode: "replace" },
          },
        },
        { package: "kibi-plugin-c", capabilities: {} },
      ],
    });
  });

  test("rejects plugin entries", () => {
    const run = (plugins: unknown[]) => () =>
      validateProjectKibiConfig({ plugins });
    const ok = entry("ok", {});
    expectFailure(
      run([ok, "x"]),
      "INVALID_PROJECT_CONFIG",
      "kibi.plugins[1] must be an object",
    );
    expectFailure(
      run([ok, { capabilities: {} }]),
      "INVALID_PROJECT_CONFIG",
      "kibi.plugins[1].package must be a non-empty string",
    );
    for (const name of ["./a", "/a", "a:b", "a\\b", ".hidden"]) {
      expectFailure(
        run([ok, entry(name, {})]),
        "INVALID_PACKAGE_REFERENCE",
        "kibi.plugins[1].package must be a bare package name; paths and URLs are rejected in v1",
      );
    }
    expectFailure(
      run([ok, { package: "b" }]),
      "INVALID_PROJECT_CONFIG",
      "kibi.plugins[1].capabilities must be an object",
    );
    expectFailure(
      run([ok, entry("b", { "kibi.nope.v1": { mode: "replace" } })]),
      "INVALID_CAPABILITY",
      "Unknown capability 'kibi.nope.v1' in kibi.plugins[1]",
    );
    for (const config of [null, "replace", { mode: 1 }, {}]) {
      expectFailure(
        run([ok, entry("b", { [ONTOLOGY_PACK_CAPABILITY_ID]: config })]),
        "INVALID_PROJECT_CONFIG",
        `kibi.plugins[1].capabilities.${ONTOLOGY_PACK_CAPABILITY_ID}.mode is required`,
      );
    }
    expectFailure(
      run([ok, entry("b", { [ONTOLOGY_PACK_CAPABILITY_ID]: { mode: "merge" } })]),
      "INVALID_MODE",
      `Unsupported mode 'merge' for ${ONTOLOGY_PACK_CAPABILITY_ID}`,
    );
    for (const mode of ["replace", "shadow"]) {
      expectFailure(
        run([entry("b", { [CHECK_POLICY_CAPABILITY_ID]: { mode } })]),
        "INVALID_MODE",
        `${CHECK_POLICY_CAPABILITY_ID} supports only mode 'augment'`,
      );
      expectFailure(
        run([entry("b", { [REFERENCE_EXTRACTOR_CAPABILITY_ID]: { mode } })]),
        "INVALID_MODE",
        `${REFERENCE_EXTRACTOR_CAPABILITY_ID} supports only mode 'augment'`,
      );
    }
    expectFailure(
      run([entry("b", { [SEARCH_HINTS_CAPABILITY_ID]: { mode: "augment" } })]),
      "INVALID_MODE",
      `${SEARCH_HINTS_CAPABILITY_ID} supports only modes 'replace' and 'shadow'`,
    );
    expectFailure(
      run([entry("b", {}), entry(" b", {})]),
      "INVALID_PROJECT_CONFIG",
      "kibi.plugins activates 'b' more than once",
    );
    expectFailure(
      run([
        entry("a", { [ONTOLOGY_PACK_CAPABILITY_ID]: { mode: "replace" } }),
        entry("b", { [ONTOLOGY_PACK_CAPABILITY_ID]: { mode: "shadow" } }),
        entry("c", { [ONTOLOGY_PACK_CAPABILITY_ID]: { mode: "replace" } }),
      ]),
      "INVALID_PROJECT_CONFIG",
      `At most one replace provider is allowed for ${ONTOLOGY_PACK_CAPABILITY_ID}; both 'a' and 'c' requested replace`,
    );
    // Different capabilities may each have their own replace owner.
    expect(
      validateProjectKibiConfig({
        plugins: [
          entry("a", { [ONTOLOGY_PACK_CAPABILITY_ID]: { mode: "replace" } }),
          entry("b", {
            [SYMBOL_EXTRACTOR_CAPABILITY_ID]: { mode: "replace" },
            [ONTOLOGY_PACK_CAPABILITY_ID]: { mode: "augment" },
          }),
        ],
      }).plugins,
    ).toHaveLength(2);
  });
});

describe("validateSemanticClassifierResult", () => {
  const decision = (overrides: Record<string, unknown> = {}) => ({
    claimKey: "c1",
    lane: "rule",
    confidence: 0.5,
    ...overrides,
  });
  const run = (decisions: unknown[], expectedClaimKeys?: string[]) => () =>
    validateSemanticClassifierResult(
      { decisions },
      expectedClaimKeys ? { expectedClaimKeys } : undefined,
    );

  test("accepts decisions with boundaries, ambiguity and signals", () => {
    expect(
      validateSemanticClassifierResult(
        {
          decisions: [
            decision({ claimKey: " c1 ", lane: " none ", confidence: 0 }),
            decision({
              claimKey: "c2",
              lane: "strict_property",
              confidence: 1,
              ambiguity: { ambiguous: true, confidence: 0 },
              signals: [" permission ", "conditional"],
            }),
            decision({
              claimKey: "c3",
              ambiguity: { ambiguous: false, confidence: 1 },
              signals: "ignored",
            }),
          ],
        },
        { expectedClaimKeys: ["c1", "c2", "c3"] },
      ),
    ).toStrictEqual({
      decisions: [
        { claimKey: "c1", lane: "none", confidence: 0 },
        {
          claimKey: "c2",
          lane: "strict_property",
          confidence: 1,
          ambiguity: { ambiguous: true, confidence: 0 },
          signals: ["permission", "conditional"],
        },
        {
          claimKey: "c3",
          lane: "rule",
          confidence: 0.5,
          ambiguity: { ambiguous: false, confidence: 1 },
        },
      ],
    });
    expect(validateSemanticClassifierResult({ decisions: [] })).toStrictEqual({
      decisions: [],
    });
  });

  test("rejects malformed decisions", () => {
    const code = "INVALID_CAPABILITY_RESULT";
    for (const value of [null, {}, { decisions: {} }, []]) {
      expectFailure(
        () => validateSemanticClassifierResult(value),
        code,
        "semantic classifier result must include decisions[]",
      );
    }
    expectFailure(run([decision(), 1]), code, "decisions[1] must be an object");
    expectFailure(
      run([decision({ lane: "" })]),
      code,
      "decisions[0].lane must be a non-empty string",
    );
    expectFailure(
      run([decision({ lane: "fact" })]),
      code,
      "decisions[0].lane 'fact' is not a supported lane",
    );
    for (const confidence of ["0.5", Number.NaN, Number.POSITIVE_INFINITY]) {
      expectFailure(
        run([decision({ confidence })]),
        code,
        "decisions[0].confidence must be a finite number",
      );
    }
    for (const confidence of [-0.01, 1.01]) {
      expectFailure(
        run([decision({ confidence })]),
        code,
        "decisions[0].confidence must be between 0 and 1",
      );
    }
    expectFailure(
      run([decision({ claimKey: 1 })]),
      code,
      "decisions[0].claimKey must be a non-empty string",
    );
    expectFailure(
      run([decision(), decision({ claimKey: " c1" })]),
      code,
      "duplicate decision for claimKey 'c1'",
    );
    expectFailure(
      run([decision({ claimKey: "c9" })], ["c1"]),
      code,
      "foreign claimKey 'c9' is not in the supplied classifier input",
    );
    expectFailure(
      run([decision({ ambiguity: [] })]),
      code,
      "decisions[0].ambiguity must be an object",
    );
    expectFailure(
      run([decision({ ambiguity: { ambiguous: true } })]),
      code,
      "decisions[0].ambiguity.confidence must be a finite number",
    );
    for (const confidence of [-0.01, 1.01]) {
      expectFailure(
        run([decision({ ambiguity: { ambiguous: true, confidence } })]),
        code,
        "decisions[0].ambiguity.confidence must be between 0 and 1",
      );
    }
    expect(
      failure(run([decision({ ambiguity: { ambiguous: "yes", confidence: 0.5 } })])),
    ).toStrictEqual({
      code: "INVALID_PERMISSIONS",
      message: "decisions[0].ambiguity.ambiguous must be a boolean",
    });
    expectFailure(
      run([decision({ signals: ["permission", ""] })]),
      code,
      "decisions[0].signals[1] must be a non-empty string",
    );
    expectFailure(
      run([decision({ signals: ["vibe"] })]),
      code,
      "decisions[0].signals[0] 'vibe' is not a supported signal",
    );
  });
});

describe("validatePredicateSchema", () => {
  const schema = (overrides: Record<string, unknown> = {}) => ({
    schemaId: "s",
    predicateName: "p",
    argumentNames: ["a"],
    argumentTypes: ["t"],
    ...overrides,
  });

  test("accepts and trims, keeping optional strings", () => {
    expect(
      validatePredicateSchema(
        schema({
          schemaId: " s ",
          predicateName: " p ",
          argumentNames: [" a "],
          argumentTypes: [" t "],
          title: " T ",
          description: "D",
          aliases: [" x "],
        }),
      ),
    ).toStrictEqual({
      schemaId: "s",
      predicateName: "p",
      argumentNames: ["a"],
      argumentTypes: ["t"],
      title: " T ",
      description: "D",
      aliases: ["x"],
    });
    expect(
      validatePredicateSchema(schema({ title: 1, description: 2, aliases: "a" })),
    ).toStrictEqual({
      schemaId: "s",
      predicateName: "p",
      argumentNames: ["a"],
      argumentTypes: ["t"],
    });
  });

  test("rejects malformed schemas", () => {
    const code = "INVALID_ONTOLOGY_SCHEMA";
    for (const value of [null, [], 1]) {
      expectFailure(
        () => validatePredicateSchema(value),
        code,
        "predicate schema must be an object",
      );
    }
    expectFailure(
      () => validatePredicateSchema(schema({ argumentNames: ["a", ""] })),
      code,
      "argumentNames[1] must be a non-empty string",
    );
    expectFailure(
      () => validatePredicateSchema(schema({ argumentTypes: ["t", 1] })),
      code,
      "argumentTypes[1] must be a non-empty string",
    );
    for (const overrides of [
      { argumentNames: "a" },
      { argumentTypes: undefined },
    ]) {
      expectFailure(
        () => validatePredicateSchema(schema(overrides)),
        code,
        "argumentNames and argumentTypes must be string arrays",
      );
    }
    expectFailure(
      () => validatePredicateSchema(schema({ argumentTypes: ["t", "u"] })),
      code,
      "argumentNames and argumentTypes must have the same length",
    );
    expectFailure(
      () => validatePredicateSchema(schema({ schemaId: "" })),
      code,
      "schemaId must be a non-empty string",
    );
    expectFailure(
      () => validatePredicateSchema(schema({ predicateName: " " })),
      code,
      "predicateName must be a non-empty string",
    );
    expectFailure(
      () => validatePredicateSchema(schema({ aliases: ["a", ""] })),
      code,
      "aliases[1] must be a non-empty string",
    );
  });
});

describe("validateOntologyMatchCandidate", () => {
  const schemas = [
    {
      schemaId: "other",
      predicateName: "q",
      argumentNames: [],
      argumentTypes: [],
    },
    {
      schemaId: "s",
      predicateName: "p",
      argumentNames: ["a", "b"],
      argumentTypes: ["t", "t"],
    },
  ];
  const candidate = (overrides: Record<string, unknown> = {}) => ({
    schemaId: "s",
    predicateName: "p",
    arguments: ["x", "y"],
    polarity: "assert",
    confidence: 0.5,
    evidence: "because",
    ...overrides,
  });
  const run = (overrides: Record<string, unknown>) => () =>
    validateOntologyMatchCandidate(candidate(overrides), schemas);

  test("accepts candidates", () => {
    expect(
      validateOntologyMatchCandidate(
        candidate({
          schemaId: " s ",
          predicateName: " p",
          arguments: [" x ", "y"],
          polarity: " deny ",
          confidence: 0,
          evidence: " e ",
          rationale: " r ",
        }),
        schemas,
      ),
    ).toStrictEqual({
      schemaId: "s",
      predicateName: "p",
      arguments: ["x", "y"],
      polarity: "deny",
      confidence: 0,
      evidence: "e",
      rationale: " r ",
    });
    expect(
      validateOntologyMatchCandidate(
        candidate({ confidence: 1, rationale: 5 }),
        schemas,
      ),
    ).toStrictEqual({
      schemaId: "s",
      predicateName: "p",
      arguments: ["x", "y"],
      polarity: "assert",
      confidence: 1,
      evidence: "because",
    });
  });

  test("rejects candidates", () => {
    const code = "INVALID_ONTOLOGY_CANDIDATE";
    for (const value of [null, []]) {
      expectFailure(
        () => validateOntologyMatchCandidate(value, schemas),
        code,
        "ontology match candidate must be an object",
      );
    }
    expectFailure(run({ schemaId: "" }), code, "schemaId must be a non-empty string");
    expectFailure(
      run({ schemaId: "missing" }),
      code,
      "Candidate schemaId 'missing' is not declared by an active ontology pack",
    );
    expectFailure(
      run({ predicateName: 1 }),
      code,
      "predicateName must be a non-empty string",
    );
    expectFailure(
      run({ predicateName: "q" }),
      code,
      "Candidate predicateName 'q' does not match schema 'p'",
    );
    expectFailure(run({ arguments: "x" }), code, "arguments must be a string array");
    expectFailure(
      run({ arguments: ["x"] }),
      code,
      "Candidate arity 1 does not match schema arity 2",
    );
    expectFailure(run({ polarity: "" }), code, "polarity must be a non-empty string");
    expectFailure(run({ polarity: "maybe" }), code, "Unsupported polarity 'maybe'");
    expect(failure(run({ confidence: "1" }))).toStrictEqual({
      code: "INVALID_CAPABILITY_RESULT",
      message: "confidence must be a finite number",
    });
    for (const confidence of [-0.01, 1.01]) {
      expectFailure(run({ confidence }), code, "confidence must be between 0 and 1");
    }
    expectFailure(
      run({ arguments: ["x", ""] }),
      code,
      "arguments[1] must be a non-empty string",
    );
    expectFailure(run({ evidence: "" }), code, "evidence must be a non-empty string");
  });
});

describe("validateSourceAnalysisResult", () => {
  const symbol = (overrides: Record<string, unknown> = {}) => ({
    name: "f",
    kind: "function",
    startLine: 1,
    startColumn: 0,
    endLine: 1,
    endColumn: 0,
    ...overrides,
  });
  const result = (overrides: Record<string, unknown> = {}) => ({
    sourceFile: "a.ts",
    language: "ts",
    module: { title: "a", language: "ts", analysisMode: "parser" },
    symbols: [symbol()],
    ...overrides,
  });
  const runSymbol = (overrides: Record<string, unknown>) => () =>
    validateSourceAnalysisResult(result({ symbols: [symbol(), symbol(overrides)] }));

  test("accepts results", () => {
    expect(
      validateSourceAnalysisResult(
        result({
          sourceFile: " a.ts ",
          language: " ts ",
          module: {
            title: " a ",
            language: " ts",
            analysisMode: " fallback ",
            fallbackReason: "parse error",
          },
          symbols: [
            symbol({
              name: " f ",
              kind: " class ",
              startLine: 2,
              startColumn: 3,
              endLine: 2,
              endColumn: 3,
              directiveText: "use strict",
            }),
            symbol({ startLine: 1, startColumn: 9, endLine: 2, endColumn: 0 }),
          ],
        }),
      ),
    ).toStrictEqual({
      sourceFile: "a.ts",
      language: "ts",
      module: {
        title: "a",
        language: "ts",
        analysisMode: "fallback",
        fallbackReason: "parse error",
      },
      symbols: [
        {
          name: "f",
          kind: "class",
          startLine: 2,
          startColumn: 3,
          endLine: 2,
          endColumn: 3,
          directiveText: "use strict",
        },
        {
          name: "f",
          kind: "function",
          startLine: 1,
          startColumn: 9,
          endLine: 2,
          endColumn: 0,
        },
      ],
    });
    expect(
      validateSourceAnalysisResult(
        result({
          module: {
            title: "a",
            language: "ts",
            analysisMode: "parser",
            fallbackReason: 1,
          },
          symbols: [symbol({ directiveText: 2 })],
        }),
      ),
    ).toStrictEqual({
      sourceFile: "a.ts",
      language: "ts",
      module: { title: "a", language: "ts", analysisMode: "parser" },
      symbols: [
        {
          name: "f",
          kind: "function",
          startLine: 1,
          startColumn: 0,
          endLine: 1,
          endColumn: 0,
        },
      ],
    });
  });

  test("rejects results", () => {
    const code = "INVALID_CAPABILITY_RESULT";
    for (const value of [
      null,
      [],
      result({ module: [] }),
      result({ module: null }),
      result({ symbols: {} }),
    ]) {
      expectFailure(
        () => validateSourceAnalysisResult(value),
        code,
        "symbol analysis result must include module and symbols[]",
      );
    }
    expectFailure(
      () =>
        validateSourceAnalysisResult(
          result({ module: { title: "a", language: "ts" } }),
        ),
      code,
      "module.analysisMode must be a non-empty string",
    );
    expectFailure(
      () =>
        validateSourceAnalysisResult(
          result({ module: { title: "a", language: "ts", analysisMode: "ai" } }),
        ),
      code,
      "Unsupported analysisMode 'ai'",
    );
    expectFailure(
      () => validateSourceAnalysisResult(result({ sourceFile: "" })),
      code,
      "sourceFile must be a non-empty string",
    );
    expectFailure(
      () => validateSourceAnalysisResult(result({ language: 1 })),
      code,
      "language must be a non-empty string",
    );
    expectFailure(
      () =>
        validateSourceAnalysisResult(
          result({ module: { language: "ts", analysisMode: "parser" } }),
        ),
      code,
      "module.title must be a non-empty string",
    );
    expectFailure(
      () =>
        validateSourceAnalysisResult(
          result({ module: { title: "a", analysisMode: "parser" } }),
        ),
      code,
      "module.language must be a non-empty string",
    );
    expectFailure(
      () => validateSourceAnalysisResult(result({ symbols: [symbol(), null] })),
      code,
      "symbols[1] must be an object",
    );
    expectFailure(runSymbol({ kind: "" }), code, "symbols[1].kind must be a non-empty string");
    expectFailure(
      runSymbol({ kind: "macro" }),
      code,
      "symbols[1].kind 'macro' is not a supported SourceSymbolKind",
    );
    for (const field of ["startLine", "startColumn", "endLine", "endColumn"]) {
      expectFailure(
        runSymbol({ [field]: "1" }),
        code,
        `symbols[1].${field} must be a finite number`,
      );
    }
    for (const startLine of [0, 1.5]) {
      expectFailure(
        runSymbol({ startLine }),
        code,
        "symbols[1].startLine must be an integer >= 1",
      );
    }
    for (const endLine of [0, 1.5]) {
      expectFailure(
        runSymbol({ endLine }),
        code,
        "symbols[1].endLine must be an integer >= 1",
      );
    }
    for (const startColumn of [-1, 0.5]) {
      expectFailure(
        runSymbol({ startColumn }),
        code,
        "symbols[1].startColumn must be an integer >= 0",
      );
    }
    for (const endColumn of [-1, 0.5]) {
      expectFailure(
        runSymbol({ endColumn }),
        code,
        "symbols[1].endColumn must be an integer >= 0",
      );
    }
    for (const overrides of [
      { startLine: 2, endLine: 1 },
      { startColumn: 2, endColumn: 1 },
    ]) {
      expectFailure(
        runSymbol(overrides),
        code,
        "symbols[1] end position must not precede start position",
      );
    }
    expectFailure(runSymbol({ name: "" }), code, "symbols[1].name must be a non-empty string");
  });

  test("ForPath checks the path and language", () => {
    expect(
      validateSourceAnalysisResultForPath(result(), "a.ts").sourceFile,
    ).toBe("a.ts");
    expectFailure(
      () => validateSourceAnalysisResultForPath(result(), "b.ts"),
      "INVALID_CAPABILITY_RESULT",
      "result sourceFile 'a.ts' does not match requested path 'b.ts'",
    );
    expectFailure(
      () =>
        validateSourceAnalysisResultForPath(
          result({
            module: { title: "a", language: "js", analysisMode: "parser" },
          }),
          "a.ts",
        ),
      "INVALID_CAPABILITY_RESULT",
      "module.language must match result.language",
    );
  });
});

describe("vocabulary alignment results", () => {
  const clauses = [
    { claimKey: "c0", candidates: [] },
    { claimKey: "c1", candidates: [{ subjectKey: "s1" }, { subjectKey: "s2" }] },
  ];
  const code = "INVALID_CAPABILITY_RESULT";

  test("rankSubjects accepts candidates and new_subject", () => {
    expect(
      validateRankSubjectsResult(
        {
          decisions: [
            { claimKey: " c1 ", choice: " s2 ", confidence: 1 },
            { claimKey: "c0", choice: "new_subject", confidence: 0 },
          ],
        },
        clauses,
      ),
    ).toStrictEqual({
      decisions: [
        { claimKey: "c1", choice: "s2", confidence: 1 },
        { claimKey: "c0", choice: "new_subject", confidence: 0 },
      ],
    });
  });

  test("rankSubjects rejects", () => {
    const run = (decisions: unknown[]) => () =>
      validateRankSubjectsResult({ decisions }, clauses);
    const ok = { claimKey: "c0", choice: "new_subject", confidence: 0.5 };
    for (const value of [null, {}, { decisions: "x" }]) {
      expectFailure(
        () => validateRankSubjectsResult(value, clauses),
        code,
        "rankSubjects result must include decisions[]",
      );
    }
    expectFailure(run([ok, []]), code, "decisions[1] must be an object");
    expectFailure(
      run([ok, { choice: "s1", confidence: 1 }]),
      code,
      "decisions[1].claimKey must be a non-empty string",
    );
    expectFailure(
      run([ok, { claimKey: "c9", choice: "s1", confidence: 1 }]),
      code,
      "foreign claimKey 'c9' is not in the supplied rankSubjects input",
    );
    expectFailure(
      run([ok, ok]),
      code,
      "duplicate decision for claimKey 'c0'",
    );
    expectFailure(
      run([ok, { claimKey: "c1", confidence: 1 }]),
      code,
      "decisions[1].choice must be a non-empty string",
    );
    expectFailure(
      run([ok, { claimKey: "c1", choice: "s3", confidence: 1 }]),
      code,
      "decisions[1].choice 's3' is neither a supplied candidate nor new_subject",
    );
    expectFailure(
      run([ok, { claimKey: "c1", choice: "s1" }]),
      code,
      "decisions[1].confidence must be a finite number",
    );
    for (const confidence of [-0.01, 1.01]) {
      expectFailure(
        run([ok, { claimKey: "c1", choice: "s1", confidence }]),
        code,
        "decisions[1].confidence must be between 0 and 1",
      );
    }
  });

  test("compareClaims accepts and rejects", () => {
    expect(
      validateCompareClaimsResult(
        {
          judgments: [
            { pairKey: " p1 ", sameObligation: true, confidence: 0 },
            { pairKey: "p2", sameObligation: false, confidence: 1 },
          ],
        },
        ["p1", "p2"],
      ),
    ).toStrictEqual({
      judgments: [
        { pairKey: "p1", sameObligation: true, confidence: 0 },
        { pairKey: "p2", sameObligation: false, confidence: 1 },
      ],
    });
    const run = (judgments: unknown[]) => () =>
      validateCompareClaimsResult({ judgments }, ["p1", "p2"]);
    const ok = { pairKey: "p1", sameObligation: true, confidence: 0.5 };
    for (const value of [null, [], { judgments: {} }]) {
      expectFailure(
        () => validateCompareClaimsResult(value, ["p1"]),
        code,
        "compareClaims result must include judgments[]",
      );
    }
    expectFailure(run([ok, 1]), code, "judgments[1] must be an object");
    expectFailure(
      run([ok, { sameObligation: true, confidence: 1 }]),
      code,
      "judgments[1].pairKey must be a non-empty string",
    );
    expectFailure(
      run([ok, { pairKey: "p3", sameObligation: true, confidence: 1 }]),
      code,
      "foreign pairKey 'p3' is not in the supplied compareClaims input",
    );
    expectFailure(run([ok, ok]), code, "duplicate judgment for pairKey 'p1'");
    expectFailure(
      run([ok, { pairKey: "p2", sameObligation: "no", confidence: 1 }]),
      code,
      "judgments[1].sameObligation must be a boolean",
    );
    for (const confidence of [-0.01, 1.01]) {
      expectFailure(
        run([ok, { pairKey: "p2", sameObligation: false, confidence }]),
        code,
        "judgments[1].confidence must be between 0 and 1",
      );
    }
  });
});

describe("validateCheckPolicyDocument", () => {
  const code = "INVALID_CHECK_POLICY";
  const doc = (overrides: Record<string, unknown> = {}) => ({
    contractVersion: "kibi.check-policy.v1",
    id: "policy",
    title: "Policy",
    ...overrides,
  });
  const ownership = (overrides: Record<string, unknown> = {}) => ({
    id: "own",
    description: "d",
    include: ["src/**"],
    requirePredicates: ["owned_by"],
    ...overrides,
  });
  const marker = (overrides: Record<string, unknown> = {}) => ({
    id: "mark",
    description: "d",
    patternPredicate: "pattern",
    patternArgument: 0,
    markerPredicate: "marker",
    markerPatternArgument: 1,
    markerArgument: 2,
    ...overrides,
  });

  test("accepts documents", () => {
    expect(validateCheckPolicyDocument(doc({ id: " a-b1-c ", title: " T " }))).toStrictEqual(
      { contractVersion: "kibi.check-policy.v1", id: "a-b1-c", title: "T" },
    );
    expect(
      validateCheckPolicyDocument(
        doc({
          ownership: [
            ownership({
              include: [" src/** "],
              exclude: [],
              symbolTitlePattern: "^foo$",
              requirePredicates: ["owned_by", "a1_b"],
              exemptTag: " exempt ",
            }),
            ownership({ id: "own2" }),
          ],
          markers: [
            marker({ siblingExtensions: [".html", ".x9"] }),
            marker({ id: "mark2", siblingExtensions: [] }),
            marker({ id: "mark3" }),
          ],
        }),
      ),
    ).toStrictEqual({
      contractVersion: "kibi.check-policy.v1",
      id: "policy",
      title: "Policy",
      ownership: [
        {
          id: "own",
          description: "d",
          include: ["src/**"],
          exclude: [],
          symbolTitlePattern: "^foo$",
          requirePredicates: ["owned_by", "a1_b"],
          exemptTag: "exempt",
        },
        {
          id: "own2",
          description: "d",
          include: ["src/**"],
          requirePredicates: ["owned_by"],
        },
      ],
      markers: [
        {
          id: "mark",
          description: "d",
          patternPredicate: "pattern",
          patternArgument: 0,
          markerPredicate: "marker",
          markerPatternArgument: 1,
          markerArgument: 2,
          siblingExtensions: [".html", ".x9"],
        },
        {
          id: "mark2",
          description: "d",
          patternPredicate: "pattern",
          patternArgument: 0,
          markerPredicate: "marker",
          markerPatternArgument: 1,
          markerArgument: 2,
          siblingExtensions: [],
        },
        {
          id: "mark3",
          description: "d",
          patternPredicate: "pattern",
          patternArgument: 0,
          markerPredicate: "marker",
          markerPatternArgument: 1,
          markerArgument: 2,
        },
      ],
    });
    expect(
      validateCheckPolicyDocument(doc({ ownership: [], markers: [] })),
    ).toStrictEqual({
      contractVersion: "kibi.check-policy.v1",
      id: "policy",
      title: "Policy",
      ownership: [],
      markers: [],
    });
  });

  test("rejects documents", () => {
    for (const value of [null, []]) {
      expectFailure(
        () => validateCheckPolicyDocument(value),
        code,
        "check policy document must be an object",
      );
    }
    expectFailure(
      () => validateCheckPolicyDocument(doc({ contractVersion: "v0" })),
      code,
      "check policy contractVersion must be 'kibi.check-policy.v1'",
    );
    expectFailure(
      () => validateCheckPolicyDocument(doc({ ownership: {} })),
      code,
      "ownership must be an array",
    );
    expectFailure(
      () => validateCheckPolicyDocument(doc({ markers: "m" })),
      code,
      "markers must be an array",
    );
    for (const id of ["Policy", "a_b", "a--b", "-a", "a-", "1a"]) {
      expectFailure(
        () => validateCheckPolicyDocument(doc({ id })),
        code,
        "id must be kebab-case",
      );
    }
    expectFailure(
      () => validateCheckPolicyDocument(doc({ id: "" })),
      code,
      "id must be a non-empty string",
    );
    expectFailure(
      () => validateCheckPolicyDocument(doc({ title: 1 })),
      code,
      "title must be a non-empty string",
    );
    expectFailure(
      () =>
        validateCheckPolicyDocument(
          doc({ ownership: [ownership({ id: "dup" })], markers: [marker({ id: "dup" })] }),
        ),
      code,
      "check policy repeats rule id 'dup'",
    );
  });

  test("rejects ownership rules", () => {
    const run = (rule: unknown) => () =>
      validateCheckPolicyDocument(doc({ ownership: [ownership(), rule] }));
    expectFailure(run("x"), code, "ownership[1] must be an object");
    expectFailure(
      run(ownership({ id: "Bad" })),
      code,
      "ownership[1].id must be kebab-case",
    );
    expectFailure(
      run(ownership({ id: "own2", description: "" })),
      code,
      "ownership[1].description must be a non-empty string",
    );
    expectFailure(
      run(ownership({ id: "own2", include: [] })),
      code,
      "ownership[1].include must be a non-empty array of strings",
    );
    expectFailure(
      run(ownership({ id: "own2", include: "src" })),
      code,
      "ownership[1].include must be a non-empty array of strings",
    );
    expectFailure(
      run(ownership({ id: "own2", include: ["a", ""] })),
      code,
      "ownership[1].include[1] must be a non-empty string",
    );
    expectFailure(
      run(ownership({ id: "own2", exclude: "x" })),
      code,
      "ownership[1].exclude must be an array of strings",
    );
    expectFailure(
      run(ownership({ id: "own2", symbolTitlePattern: "(" })),
      code,
      "ownership[1].symbolTitlePattern must be a valid regular expression",
    );
    expectFailure(
      run(ownership({ id: "own2", symbolTitlePattern: "" })),
      code,
      "ownership[1].symbolTitlePattern must be a non-empty string",
    );
    expectFailure(
      run(ownership({ id: "own2", requirePredicates: [] })),
      code,
      "ownership[1].requirePredicates must be a non-empty array of strings",
    );
    for (const name of ["Owned", "1a", "a-b", "a b", " "]) {
      const message =
        name.trim() === ""
          ? "ownership[1].requirePredicates[1] must be a non-empty string"
          : "ownership[1].requirePredicates[1] must be a snake_case name";
      expectFailure(
        run(ownership({ id: "own2", requirePredicates: ["ok", name] })),
        code,
        message,
      );
    }
    expectFailure(
      run(ownership({ id: "own2", exemptTag: "" })),
      code,
      "ownership[1].exemptTag must be a non-empty string",
    );
  });

  test("rejects marker rules", () => {
    const run = (rule: unknown) => () =>
      validateCheckPolicyDocument(doc({ markers: [marker(), rule] }));
    expectFailure(run(null), code, "markers[1] must be an object");
    expectFailure(
      run(marker({ id: "m2", siblingExtensions: "x" })),
      code,
      "markers[1].siblingExtensions must be an array of strings",
    );
    for (const extension of ["html", ".HTML", ".", ".a.b", "x.html"]) {
      expectFailure(
        run(marker({ id: "m2", siblingExtensions: [".ok", extension] })),
        code,
        "markers[1].siblingExtensions[1] must look like '.html'",
      );
    }
    expectFailure(run(marker({ id: "M" })), code, "markers[1].id must be kebab-case");
    expectFailure(
      run(marker({ id: "m2", description: null })),
      code,
      "markers[1].description must be a non-empty string",
    );
    expectFailure(
      run(marker({ id: "m2", patternPredicate: "Bad" })),
      code,
      "markers[1].patternPredicate[0] must be a snake_case name",
    );
    expectFailure(
      run(marker({ id: "m2", markerPredicate: "" })),
      code,
      "markers[1].markerPredicate[0] must be a non-empty string",
    );
    for (const field of ["patternArgument", "markerPatternArgument", "markerArgument"]) {
      for (const value of [-1, 1.5, "1"]) {
        expectFailure(
          run(marker({ id: "m2", [field]: value })),
          code,
          `markers[1].${field} must be a non-negative integer`,
        );
      }
    }
  });
});

describe("reference extractor contract", () => {
  const code = "INVALID_CAPABILITY_RESULT";
  const ok = (overrides: Record<string, unknown> = {}) => ({
    contractVersion: "kibi.reference-extractor.v1",
    status: "ok",
    language: "php",
    members: ["a"],
    unresolved: [],
    ...overrides,
  });

  test("capability wrapper keeps the provider as this", () => {
    const provider = {
      id: " refs ",
      calls: [] as unknown[],
      supports(input: unknown) {
        this.calls.push(["supports", input]);
        return true;
      },
      extract(input: unknown) {
        this.calls.push(["extract", input]);
        return "result";
      },
    };
    const extractor = validateReferenceExtractor(provider);
    expect(extractor.id).toBe("refs");
    expect(extractor.supports({ path: "a.php" } as never)).toBe(true);
    expect(extractor.extract({ path: "a.php", content: "" } as never)).toBe(
      "result" as never,
    );
    expect(provider.calls).toStrictEqual([
      ["supports", { path: "a.php" }],
      ["extract", { path: "a.php", content: "" }],
    ]);
  });

  test("capability wrapper rejects", () => {
    for (const value of [
      null,
      [],
      { id: "x", extract: noop },
      { id: "x", supports: noop },
    ]) {
      expectFailure(
        () => validateReferenceExtractor(value),
        "INVALID_CAPABILITY",
        "referenceExtractor must expose supports() and extract()",
      );
    }
    for (const id of [undefined, 1, " "]) {
      expectFailure(
        () => validateReferenceExtractor({ id, supports: noop, extract: noop }),
        "INVALID_CAPABILITY",
        "referenceExtractor.id must be a non-empty string",
      );
    }
  });

  test("ok results", () => {
    const longText = "x".repeat(250);
    expect(
      validateReferenceExtractionResult(
        ok({
          members: ["a", "b"],
          unresolved: [
            { line: 1, text: longText },
            { line: 7, text: "t" },
          ],
        }),
      ),
    ).toStrictEqual({
      contractVersion: "kibi.reference-extractor.v1",
      status: "ok",
      language: "php",
      members: ["a", "b"],
      unresolved: [
        { line: 1, text: "x".repeat(200) },
        { line: 7, text: "t" },
      ],
    });
    expect(
      validateReferenceExtractionResult(
        ok({ members: Array.from({ length: 100_000 }, () => "m") }),
      ).members,
    ).toHaveLength(100_000);
  });

  test("refusals", () => {
    expect(
      validateReferenceExtractionResult({
        contractVersion: "kibi.reference-extractor.v1",
        status: "unsupported",
        code: "c",
        message: "m",
      }),
    ).toStrictEqual({
      contractVersion: "kibi.reference-extractor.v1",
      status: "unsupported",
      code: "c",
      message: "m",
    });
    expect(
      validateReferenceExtractionResult({
        contractVersion: "kibi.reference-extractor.v1",
        status: "failed",
        language: "c",
        code: "c",
        message: "m",
        members: ["ignored"],
      }),
    ).toStrictEqual({
      contractVersion: "kibi.reference-extractor.v1",
      status: "failed",
      language: "c",
      code: "c",
      message: "m",
    });
  });

  test("rejects results", () => {
    const refusal = (overrides: Record<string, unknown>) => ({
      contractVersion: "kibi.reference-extractor.v1",
      status: "failed",
      code: "c",
      message: "m",
      ...overrides,
    });
    const cases: [unknown, string][] = [
      [null, "reference extraction must be an object"],
      [[], "reference extraction must be an object"],
      ["x", "reference extraction must be an object"],
      [ok({ contractVersion: "v0" }), "contractVersion must be kibi.reference-extractor.v1"],
      [ok({ language: 1 }), "language must be a non-empty string"],
      [ok({ language: "" }), "language must be a non-empty string"],
      [ok({ members: "a" }), "members must be an array of at most 100000 strings"],
      [
        ok({ members: Array.from({ length: 100_001 }, () => "m") }),
        "members must be an array of at most 100000 strings",
      ],
      [ok({ members: ["a", 1] }), "members must be strings"],
      [ok({ unresolved: {} }), "unresolved must be an array"],
      [ok({ unresolved: [null] }), "unresolved rows must carry a positive line and its text"],
      [ok({ unresolved: [[]] }), "unresolved rows must carry a positive line and its text"],
      [ok({ unresolved: [{ line: "1", text: "t" }] }), "unresolved rows must carry a positive line and its text"],
      [ok({ unresolved: [{ line: 1.5, text: "t" }] }), "unresolved rows must carry a positive line and its text"],
      [ok({ unresolved: [{ line: 0, text: "t" }] }), "unresolved rows must carry a positive line and its text"],
      [ok({ unresolved: [{ line: 1 }] }), "unresolved rows must carry a positive line and its text"],
      [refusal({ status: "skipped" }), "status must be ok, unsupported or failed"],
      [refusal({ status: undefined }), "status must be ok, unsupported or failed"],
      [refusal({ code: 1 }), "a refused extraction must name a code"],
      [refusal({ code: "" }), "a refused extraction must name a code"],
      [refusal({ message: null }), "a refused extraction must carry a message"],
      [refusal({ message: "" }), "a refused extraction must carry a message"],
    ];
    for (const [value, message] of cases) {
      expectFailure(() => validateReferenceExtractionResult(value), code, message);
    }
  });
});

describe("symbol extractor adapters", () => {
  const legacy = {
    sourceFile: "a.ts",
    language: "ts",
    module: { title: "a", language: "ts", analysisMode: "parser" as const },
    symbols: [],
  };
  test("toSourceAnalysisProvider forwards path and content", () => {
    const calls: unknown[] = [];
    const provider = toSourceAnalysisProvider({
      id: "legacy",
      supports: (input) => {
        calls.push(input);
        return input.path.endsWith(".ts");
      },
      analyze: (input) => {
        calls.push(input);
        return legacy;
      },
    });
    expect(provider.id).toBe("legacy");
    expect(provider.supportsFile("a.ts")).toBe(true);
    expect(provider.supportsFile("a.js")).toBe(false);
    expect(provider.analyzeText("a.ts", "code")).toBe(legacy);
    expect(calls).toStrictEqual([
      { path: "a.ts" },
      { path: "a.js" },
      { path: "a.ts", content: "code" },
    ]);
  });

  test("createSymbolExtractorV2Adapter forwards exactly path and content", async () => {
    const calls: unknown[] = [];
    const adapter = createSymbolExtractorV2Adapter({
      id: "legacy",
      supports: (input) => {
        calls.push(input);
        return true;
      },
      analyze: (input) => {
        calls.push(input);
        return legacy;
      },
    });
    expect(adapter.id).toBe("legacy.v2");
    expect(adapter.supports({ path: "a.ts", content: "x" } as never)).toBe(true);
    await adapter.analyze({ path: "a.ts", content: "code", language: "ts" });
    expect(calls).toStrictEqual([{ path: "a.ts" }, { path: "a.ts", content: "code" }]);
  });
});
