/*
 * E2E: externally observable capability-plugin behavior.
 *
 * REQ-capability-plugin-observable-behavior-v1 — activation is explicit,
 * undeclared/path/global packages are rejected, inactive plugins are not
 * imported, builtin-only is the default, replace/augment/shadow follow the
 * documented contract, maintenance operations do not import third-party
 * plugins, Jev is absent from the default dependency graph, and Jev
 * configuration or provider failure stays local to the provider.
 *
 * Run via `bun run documentation/tests/e2e/capability-plugins.e2e.ts`.
 */
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { doctorCommand } from "../../../packages/cli/src/commands/doctor.ts";
import { analyzeSemanticAdvisorInputWithPlugins } from "../../../packages/cli/src/operations/semantic-advisor/plugin-orchestration.ts";
import {
  CapabilityRegistry,
  allowsExternalSemanticClassifier,
  assertBarePackageName,
  composeSemanticClassification,
  describeConfiguredCapabilityPlugins,
  hasDeclaredProjectDependency,
  isProjectScopedPackage,
  loadPluginPackage,
  publicCapabilityStamp,
  readProjectKibiConfig,
} from "../../../packages/cli/src/plugins/index.ts";
import { createStubBuiltinPlugin } from "../../../packages/cli/src/plugins/registry.ts";
import {
  JEV_DEFAULT_MODEL,
  JEV_MAX_TIMEOUT_MS,
  JevProviderError,
  createJevSemanticClassifier,
  kibiPlugin,
  resolveJevModel,
  resolveJevTimeoutMs,
} from "../../../packages/plugin-jev/src/index.ts";
const SEMANTIC_CLASSIFIER_CAPABILITY_ID = "kibi.semantic-classifier.v1";

function assert(condition: unknown, message: string): void {
  if (!condition) {
    console.error(`E2E FAILURE: ${message}`);
    process.exit(1);
  }
}

const REPO_ROOT = join(import.meta.dir, "../../..");
const root = mkdtempSync(join(tmpdir(), "kibi-capability-plugins-"));
const originalCwd = process.cwd();
const originalModel = process.env.KIBI_JEV_MODEL;
const originalTimeout = process.env.KIBI_JEV_TIMEOUT_MS;
const WORKSPACE_ENV_KEYS = [
  "KIBI_WORKSPACE",
  "KIBI_PROJECT_ROOT",
  "KIBI_ROOT",
] as const;

function pinKibiWorkspace(workspaceRoot: string): () => void {
  const previous = WORKSPACE_ENV_KEYS.map(
    (key) => [key, process.env[key]] as const,
  );
  for (const key of WORKSPACE_ENV_KEYS) process.env[key] = workspaceRoot;
  return () => {
    for (const [key, value] of previous) {
      if (value === undefined) Reflect.deleteProperty(process.env, key);
      else process.env[key] = value;
    }
  };
}

function restoreEnv(): void {
  if (originalModel === undefined) {
    // biome-ignore lint/performance/noDelete: unset must remove the key; assigning undefined stringifies it.
    delete process.env.KIBI_JEV_MODEL;
  } else process.env.KIBI_JEV_MODEL = originalModel;
  if (originalTimeout === undefined) {
    // biome-ignore lint/performance/noDelete: unset must remove the key; assigning undefined stringifies it.
    delete process.env.KIBI_JEV_TIMEOUT_MS;
  } else process.env.KIBI_JEV_TIMEOUT_MS = originalTimeout;
}

try {
  const dependencyNames = (relativePath: string): string[] => {
    const manifest = JSON.parse(
      readFileSync(join(REPO_ROOT, relativePath), "utf8"),
    ) as {
      dependencies?: Record<string, string>;
      optionalDependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    return [
      ...Object.keys(manifest.dependencies ?? {}),
      ...Object.keys(manifest.optionalDependencies ?? {}),
      ...Object.keys(manifest.peerDependencies ?? {}),
      ...Object.keys(manifest.devDependencies ?? {}),
    ];
  };
  for (const relativePath of [
    "packages/cli/package.json",
    "packages/mcp/package.json",
    "packages/runtime/package.json",
  ]) {
    const names = dependencyNames(relativePath);
    assert(
      !names.includes("kibi-plugin-jev") && !names.includes("@typesafe-ai/sdk"),
      `${relativePath} must not depend on optional Jev`,
    );
  }
  assert(
    dependencyNames("packages/cli/package.json").includes(
      "kibi-plugin-builtin",
    ),
    "kibi-cli keeps the builtin plugin",
  );

  assert(
    readProjectKibiConfig(root).plugins === undefined,
    "missing package.json is builtin-only",
  );
  assert(
    describeConfiguredCapabilityPlugins(root).length === 0,
    "missing package.json describes no plugins",
  );

  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({
      name: "consumer",
      dependencies: { "example-capability-plugin": "1.2.3" },
      kibi: {
        plugins: [
          {
            package: "../evil",
            capabilities: {
              [SEMANTIC_CLASSIFIER_CAPABILITY_ID]: { mode: "augment" },
            },
          },
        ],
      },
    }),
  );
  let pathRejected = false;
  try {
    readProjectKibiConfig(root);
  } catch (error) {
    pathRejected =
      error instanceof Error && /bare package name/.test(error.message);
  }
  assert(pathRejected, "path packages are rejected at config validation");
  let bareRejected = false;
  try {
    assertBarePackageName("./relative");
  } catch {
    bareRejected = true;
  }
  assert(bareRejected, "assertBarePackageName rejects relative paths");
  assert(
    isProjectScopedPackage(
      root,
      "left-pad",
      "/usr/lib/node_modules/left-pad",
    ) === false,
    "global packages are outside the project scope",
  );

  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({
      name: "consumer",
      kibi: {
        plugins: [
          {
            package: "example-capability-plugin",
            capabilities: {
              [SEMANTIC_CLASSIFIER_CAPABILITY_ID]: { mode: "augment" },
            },
          },
        ],
      },
    }),
  );
  assert(
    hasDeclaredProjectDependency(root, "example-capability-plugin") === false,
    "activation without a declared dependency is not declared",
  );
  assert(
    describeConfiguredCapabilityPlugins(root)[0]?.declared === false,
    "doctor rows report undeclared packages",
  );
  process.chdir(root);
  const undeclaredDoctorLogs: string[] = [];
  const undeclaredOriginalLog = console.log;
  console.log = (...args: unknown[]) => {
    undeclaredDoctorLogs.push(args.map(String).join(" "));
  };
  const restoreUndeclaredWorkspace = pinKibiWorkspace(root);
  try {
    await doctorCommand({ format: "json" });
  } finally {
    restoreUndeclaredWorkspace();
    console.log = undeclaredOriginalLog;
    process.chdir(originalCwd);
  }
  const undeclaredDoctor = JSON.parse(undeclaredDoctorLogs[0] ?? "{}") as {
    checks?: Array<{
      name: string;
      passed?: boolean;
      message: string;
      remediation?: string;
    }>;
  };
  const undeclaredPluginCheck = undeclaredDoctor.checks?.find(
    (check) => check.name === "Capability plugins",
  );
  assert(
    undeclaredPluginCheck?.passed === false &&
      undeclaredPluginCheck.message ===
        "example-capability-plugin kibi.semantic-classifier.v1 augment declared=no" &&
      undeclaredPluginCheck.remediation ===
        "Add the configured plugin package to dependencies, devDependencies, or optionalDependencies, or remove the kibi.plugins activation entry.",
    "kibi doctor fails configured plugins that are not declared dependencies",
  );
  let undeclared = false;
  try {
    await loadPluginPackage(root, "example-capability-plugin");
  } catch (error) {
    undeclared =
      error instanceof Error &&
      /UNDECLARED_DEPENDENCY|must be listed/.test(error.message);
  }
  assert(undeclared, "undeclared packages are not loaded");

  let inactiveLoads = 0;
  const inactive = new CapabilityRegistry({
    workspaceRoot: root,
    projectConfig: {},
    builtinFactory: () => createStubBuiltinPlugin(),
    loadPlugin: async () => {
      inactiveLoads += 1;
      throw new Error("inactive plugin was imported");
    },
  });
  await inactive.resolveSemanticClassifiers();
  assert(
    inactiveLoads === 0,
    "installed-but-inactive plugins are not imported",
  );

  const pluginRoot = join(root, "node_modules", "example-capability-plugin");
  mkdirSync(pluginRoot, { recursive: true });
  writeFileSync(
    join(pluginRoot, "package.json"),
    JSON.stringify({
      name: "example-capability-plugin",
      version: "1.2.3",
      type: "module",
      main: "index.js",
    }),
  );
  writeFileSync(
    join(pluginRoot, "index.js"),
    `export const kibiPlugin = {
      apiVersion: "kibi.plugin.v1",
      id: "example-capability-plugin",
      version: "1.2.3",
      permissions: { network: false, metered: false, secrets: [] },
      capabilities: {
        semanticClassifier: {
          id: "example.classifier",
          model: "example-model",
          async classify(input) {
            return {
              decisions: input.propositions.map((proposition) => ({
                claimKey: proposition.claimKey,
                lane: "predicate",
                confidence: 0.8,
                ambiguity: { ambiguous: false, confidence: 0.1 },
              })),
            };
          },
        },
      },
    };
`,
  );
  const shadowRoot = join(root, "node_modules", "example-shadow-plugin");
  mkdirSync(shadowRoot, { recursive: true });
  writeFileSync(
    join(shadowRoot, "package.json"),
    JSON.stringify({
      name: "example-shadow-plugin",
      version: "9.9.9",
      type: "module",
      main: "index.js",
    }),
  );
  writeFileSync(
    join(shadowRoot, "index.js"),
    `export const kibiPlugin = {
      apiVersion: "kibi.plugin.v1",
      id: "example-shadow-plugin",
      version: "9.9.9",
      permissions: { network: true, metered: true, secrets: [] },
      capabilities: {
        semanticClassifier: {
          id: "example.shadow",
          model: "shadow-model",
          async classify(input) {
            return {
              decisions: input.propositions.map((proposition) => ({
                claimKey: proposition.claimKey,
                lane: "rule",
                confidence: 0.2,
              })),
            };
          },
        },
      },
    };
`,
  );
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({
      name: "consumer",
      dependencies: {
        "example-capability-plugin": "1.2.3",
        "example-shadow-plugin": "9.9.9",
      },
      kibi: {
        plugins: [
          {
            package: "example-capability-plugin",
            capabilities: {
              [SEMANTIC_CLASSIFIER_CAPABILITY_ID]: { mode: "augment" },
            },
          },
          {
            package: "example-shadow-plugin",
            capabilities: {
              [SEMANTIC_CLASSIFIER_CAPABILITY_ID]: { mode: "shadow" },
            },
          },
        ],
      },
    }),
  );
  const described = describeConfiguredCapabilityPlugins(root);
  assert(
    described.length === 2 &&
      described[0]?.package === "example-capability-plugin" &&
      described[0]?.mode === "augment" &&
      described[0]?.declared === true &&
      described[1]?.mode === "shadow",
    "configured plugins are described from package.json",
  );

  const active = new CapabilityRegistry({
    workspaceRoot: root,
    builtinFactory: () => createStubBuiltinPlugin(),
  });
  const resolution = await active.resolveSemanticClassifiers();
  const composed = await composeSemanticClassification(
    resolution,
    {
      propositions: [
        { claimKey: "c1", statement: "Users must own their records" },
      ],
    },
    { operationName: "kb_compile_intent" },
  );
  assert(
    composed.decisions[0]?.lane === "predicate",
    "augment supplies a lane when builtin abstains",
  );
  assert(
    composed.shadowComparisons[0]?.decisions[0]?.lane === "rule",
    "shadow comparison is recorded",
  );
  assert(
    composed.decisions.every((decision) => decision.lane !== "rule"),
    "shadow cannot change the canonical lane",
  );
  const rawStamp = composed.stamps.find(
    (entry) => entry.pluginId === "example-capability-plugin",
  );
  assert(rawStamp !== undefined, "augment stamp is present");
  const stamp = publicCapabilityStamp(rawStamp);
  assert(stamp.pluginVersion === "1.2.3", "stamp includes the package version");
  assert(stamp.model === "example-model", "stamp includes the effective model");
  assert(
    stamp.external === true && stamp.network === false,
    "stamp includes trust flags",
  );

  const blocked = await composeSemanticClassification(
    resolution,
    {
      propositions: [
        { claimKey: "c1", statement: "Users must own their records" },
      ],
    },
    { operationName: "kb_check" },
  );
  assert(
    blocked.decisions[0]?.lane !== "predicate" &&
      blocked.shadowComparisons.length === 0,
    "maintenance composition does not invoke external classifiers",
  );

  let ensureCalls = 0;
  await analyzeSemanticAdvisorInputWithPlugins(
    {
      payload: {
        type: "req",
        id: "REQ-E2E-PLUGIN",
        properties: {
          title: "Preview",
          status: "open",
          source: "e2e",
          semantic_text: "Users must own their records.",
        },
      },
    },
    {
      operationName: "kb_check",
      ensurePlugins: async () => {
        ensureCalls += 1;
        return active;
      },
    },
  );
  assert(ensureCalls === 0, "maintenance operations do not import plugins");
  for (const operationName of [
    "kb_sync",
    "kb_status",
    "kb_upsert",
    "kb_suggest_predicates",
    "kb_model_requirement",
  ]) {
    assert(
      allowsExternalSemanticClassifier(operationName) === false,
      `${operationName} is not an external classifier operation`,
    );
  }
  assert(
    allowsExternalSemanticClassifier("kb_semantic_advisor") &&
      allowsExternalSemanticClassifier("kb_compile_intent"),
    "advisor and compile-intent remain the classifier allowlist",
  );

  const replaceRoot = join(root, "node_modules", "example-replace-plugin");
  mkdirSync(replaceRoot, { recursive: true });
  writeFileSync(
    join(replaceRoot, "package.json"),
    JSON.stringify({
      name: "example-replace-plugin",
      version: "2.0.0",
      type: "module",
      main: "index.js",
    }),
  );
  writeFileSync(
    join(replaceRoot, "index.js"),
    `export const kibiPlugin = {
      apiVersion: "kibi.plugin.v1",
      id: "example-replace-plugin",
      version: "2.0.0",
      permissions: { network: true, metered: true, secrets: [] },
      capabilities: {
        semanticClassifier: {
          id: "example.replace",
          model: "replace-model",
          async classify() {
            const error = new Error("provider down");
            error.code = "network";
            error.model = "replace-model";
            throw error;
          },
        },
      },
    };
`,
  );
  const replaceRegistry = new CapabilityRegistry({
    workspaceRoot: root,
    builtinFactory: () => createStubBuiltinPlugin(),
    projectConfig: {
      plugins: [
        {
          package: "example-replace-plugin",
          capabilities: {
            [SEMANTIC_CLASSIFIER_CAPABILITY_ID]: { mode: "replace" },
          },
        },
      ],
    },
    loadPlugin: async () => loadPluginPackage(root, "example-replace-plugin"),
  });
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({
      name: "consumer",
      dependencies: { "example-replace-plugin": "2.0.0" },
    }),
  );
  const replaced = await composeSemanticClassification(
    await replaceRegistry.resolveSemanticClassifiers(),
    {
      propositions: [
        { claimKey: "c1", statement: "Users must own their records" },
      ],
    },
    { operationName: "kb_semantic_advisor" },
  );
  assert(
    replaced.fallbackUsed === true,
    "replace failure falls back to builtin",
  );
  assert(
    replaced.diagnostics.some(
      (diagnostic) =>
        diagnostic.model === "replace-model" &&
        diagnostic.code === "network" &&
        !diagnostic.message.includes("TYPESAFE_API_KEY"),
    ),
    "fallback diagnostics include the model and not credentials",
  );

  // biome-ignore lint/performance/noDelete: unset must remove the key; assigning undefined stringifies it.
  delete process.env.KIBI_JEV_MODEL;
  // biome-ignore lint/performance/noDelete: unset must remove the key; assigning undefined stringifies it.
  delete process.env.KIBI_JEV_TIMEOUT_MS;
  assert(
    kibiPlugin.apiVersion === "kibi.plugin.v1",
    "Jev named export loads offline",
  );
  assert(
    resolveJevModel(undefined) === JEV_DEFAULT_MODEL,
    "default model is jev-latest",
  );
  assert(JEV_MAX_TIMEOUT_MS === 120_000, "timeout bound stays 120000ms");
  let factoryCalls = 0;
  const lazy = createJevSemanticClassifier({
    clientFactory: () => {
      factoryCalls += 1;
      throw new Error("client constructed");
    },
  });
  assert(
    factoryCalls === 0 && lazy.model === JEV_DEFAULT_MODEL,
    "construction does not call the client",
  );
  process.env.KIBI_JEV_MODEL = "env-model";
  process.env.KIBI_JEV_TIMEOUT_MS = "nope";
  let malformed = false;
  try {
    createJevSemanticClassifier({ model: "explicit-model" });
  } catch (error) {
    malformed =
      error instanceof JevProviderError &&
      error.code === "malformed" &&
      error.model === "explicit-model" &&
      error.message.includes(String(JEV_MAX_TIMEOUT_MS));
  }
  assert(
    malformed,
    "malformed KIBI_JEV_TIMEOUT_MS fails with the effective model",
  );
  process.env.KIBI_JEV_TIMEOUT_MS = "1500";
  assert(resolveJevTimeoutMs(4000) === 4000, "programmatic timeout wins");
  assert(
    resolveJevModel("") === "env-model",
    "blank programmatic model is unset",
  );

  process.chdir(root);
  const doctorLogs: string[] = [];
  const originalLog = console.log;
  console.log = (...args: unknown[]) => {
    doctorLogs.push(args.map(String).join(" "));
  };
  const restoreDeclaredWorkspace = pinKibiWorkspace(root);
  try {
    writeFileSync(
      join(root, "package.json"),
      JSON.stringify({
        name: "consumer",
        devDependencies: { "example-capability-plugin": "1.2.3" },
        kibi: {
          plugins: [
            {
              package: "example-capability-plugin",
              capabilities: {
                [SEMANTIC_CLASSIFIER_CAPABILITY_ID]: { mode: "augment" },
              },
            },
          ],
        },
      }),
    );
    await doctorCommand({ format: "json" });
  } finally {
    restoreDeclaredWorkspace();
    console.log = originalLog;
    process.chdir(originalCwd);
  }
  const doctor = JSON.parse(doctorLogs[0] ?? "{}") as {
    checks?: Array<{ name: string; message: string }>;
  };
  const pluginCheck = doctor.checks?.find(
    (check) => check.name === "Capability plugins",
  );
  assert(
    pluginCheck?.message ===
      "example-capability-plugin kibi.semantic-classifier.v1 augment declared=yes",
    "kibi doctor reports configured plugins",
  );

  console.log("capability plugin e2e passed");
} finally {
  restoreEnv();
  try {
    process.chdir(originalCwd);
  } catch {
    // The original directory is still available for cleanup.
  }
  rmSync(root, { recursive: true, force: true });
}
