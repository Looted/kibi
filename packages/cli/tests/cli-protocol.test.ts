import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  SEMANTIC_CLASSIFIER_CAPABILITY_ID,
  defineKibiPlugin,
} from "kibi-plugin-sdk";
import { executeOperation } from "../src/cli-protocol.js";
import type { CliContext } from "../src/cli-protocol.js";
import {
  createCapabilityRegistry,
  createStubBuiltinPlugin,
} from "../src/plugins/index.js";

function createContext(overrides: Partial<CliContext> = {}): CliContext {
  return {
    workspaceRoot: process.cwd(),
    signal: new AbortController().signal,
    clock: () => new Date(0),
    prolog: {
      query: async () => ({
        success: true,
        bindings: {
          JsonString: JSON.stringify({
            branch: "develop",
            snapshotId: "stamp:test",
            syncedAt: null,
            dirty: false,
            syncState: "fresh",
          }),
        },
      }),
      nextSolution: async () => null,
      save: async () => ({ success: true, bindings: {} }),
    },
    git: {
      revParse: async () => "develop",
      showToplevel: async () => process.cwd(),
      workspaceSnapshot: async () => ({
        version: "kibi.workspace-snapshot.v2",
        hash: "a".repeat(64),
        dirty: true,
        fileCount: 12,
      }),
    },
    ...overrides,
  };
}

function createConfiguredPluginRegistry() {
  return createCapabilityRegistry({
    workspaceRoot: process.cwd(),
    builtinFactory: () => createStubBuiltinPlugin(),
    projectConfig: {
      plugins: [
        {
          package: "example-capability-plugin",
          capabilities: {
            [SEMANTIC_CLASSIFIER_CAPABILITY_ID]: { mode: "augment" },
          },
        },
      ],
    },
    loadPlugin: async (_root, packageName) => ({
      packageName,
      plugin: defineKibiPlugin({
        apiVersion: "kibi.plugin.v1",
        id: packageName,
        version: "1.2.3",
        permissions: {
          network: false,
          metered: false,
          secrets: [],
        },
        capabilities: {
          semanticClassifier: {
            id: `${packageName}.classifier`,
            model: "example-model",
            classify: (input) => ({
              decisions: input.propositions.map((proposition) => ({
                claimKey: proposition.claimKey,
                lane: "observation_review" as const,
                confidence: 0.4,
              })),
            }),
          },
        },
      }),
      resolved: {
        packageName,
        packageRoot: `/tmp/${packageName}`,
        packageJsonPath: `/tmp/${packageName}/package.json`,
        packageJson: { name: packageName, version: "1.2.3" },
        entryPath: `/tmp/${packageName}/index.js`,
        entryUrl: `file:///tmp/${packageName}/index.js`,
      },
    }),
  });
}

describe("executeOperation", () => {
  const originalBranch = process.env.KIBI_BRANCH;

  beforeEach(() => {
    process.env.KIBI_BRANCH = "develop";
  });

  afterEach(() => {
    if (originalBranch === undefined) {
      Reflect.deleteProperty(process.env, "KIBI_BRANCH");
    } else {
      process.env.KIBI_BRANCH = originalBranch;
    }
  });
  test("renders one JSON value with a trailing newline on success", async () => {
    const result = await executeOperation("kb_status", {}, createContext());

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout ?? "")).toEqual(
      expect.objectContaining({
        kibiProtocol: 1,
        operation: "kb_status",
        status: "success",
        data: expect.objectContaining({
          branch: "develop",
          snapshotId: expect.any(String),
          proofSnapshot: "a".repeat(64),
          migrationPlan: expect.objectContaining({
            version: "kibi.migration-plan.v2",
          }),
        }),
        effects: expect.any(Array),
        nextActions: [],
      }),
    );
    expect(result.stdout?.endsWith("\n")).toBe(true);
  });

  test("returns exit 2 and stderr-only diagnostics for invalid input", async () => {
    const result = await executeOperation(
      "kb_status",
      { unexpected: true },
      createContext(),
    );

    expect(result.exitCode).toBe(2);
    expect(JSON.parse(result.stdout ?? "")).toMatchObject({
      kibiProtocol: 1,
      status: "error",
      error: { code: "VALIDATION_FAILED" },
    });
    expect(result.stderr).toContain("VALIDATION_FAILED");
    expect(result.stderr).toContain("unexpected");
  });

  test("returns exit 2 for an unknown operation", async () => {
    const result = await executeOperation("unknown", {}, createContext());

    expect(result).toMatchObject({
      exitCode: 2,
      stderr: "Error [UNKNOWN_OPERATION]: Unknown operation 'unknown'.\n",
    });
    expect(JSON.parse(result.stdout ?? "")).toMatchObject({
      kibiProtocol: 1,
      operation: "unknown",
      status: "error",
    });
  });

  test("rejects MCP-internal upsert fields at the CLI boundary", async () => {
    // Given
    const input = {
      type: "req",
      id: "REQ-INTERNAL-FIELD",
      properties: { title: "Private field", status: "open" },
      _skipContradictionCheck: true,
    };

    // When
    const result = await executeOperation("kb_upsert", input, createContext());

    // Then
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("_skipContradictionCheck");
  });

  // executable_for TEST-capability-plugin-host-resolution-v1
  test("accepts plugin-bearing semantic-advisor envelopes under the output contract", async () => {
    const registry = createConfiguredPluginRegistry();
    const result = await executeOperation(
      "kb_semantic_advisor",
      {
        text: "Customer data must be retained for 7 years.",
        type: "req",
        id: "REQ-PROTOCOL-PLUGINS",
      },
      createContext({
        ensurePlugins: async () => registry,
      }),
    );

    expect(result.exitCode, result.stderr).toBe(0);
    const envelope = JSON.parse(result.stdout ?? "");
    expect(envelope).toMatchObject({
      kibiProtocol: 1,
      operation: "kb_semantic_advisor",
      status: "success",
      data: {
        receipt: expect.any(Object),
        warnings: expect.any(Array),
        capabilityPlugins: {
          stamps: expect.arrayContaining([
            expect.objectContaining({
              pluginId: "example-capability-plugin",
              capability: SEMANTIC_CLASSIFIER_CAPABILITY_ID,
              mode: "augment",
            }),
          ]),
        },
      },
    });
  });
});
