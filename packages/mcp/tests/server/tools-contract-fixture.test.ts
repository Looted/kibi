import { describe, expect, test } from "bun:test";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { type OperationName, getSpec } from "kibi-runtime";
import { DIAGNOSTIC_TELEMETRY_SCHEMA } from "../../src/diagnostics.js";
import { registerAllTools } from "../../src/server/tools.js";
import { withWorkspaceRootSchema } from "../../src/server/workspace-router.js";
import {
  TOOLS,
  buildBaseTools,
  withDiagnosticTelemetrySchema,
} from "../../src/tools-config.js";

type JsonRecord = Record<string, unknown>;

type ContractSeed = {
  entities: JsonRecord[];
  status: JsonRecord;
  operations: Record<
    string,
    { input: JsonRecord; success: JsonRecord; failure: JsonRecord }
  >;
};

type CapturedTool = {
  name: string;
  description: string;
  inputSchema: { _zod?: unknown };
  outputSchema?: { _zod?: unknown };
  annotations?: JsonRecord;
};

const CONTRACT_FIXTURES_ROOT = path.resolve(
  import.meta.dir,
  "../fixtures/contracts",
);
const REPOSITORY_ROOT = path.resolve(import.meta.dir, "../../../..");
const BIOME_EXECUTABLE = path.join(
  REPOSITORY_ROOT,
  "node_modules",
  ".bin",
  "biome",
);
const SEED_PATH = path.join(CONTRACT_FIXTURES_ROOT, "seed", "seed.json");
const TOOL_LIST_BASE_PATH = path.join(
  CONTRACT_FIXTURES_ROOT,
  "tools-list.base.json",
);
const TOOL_LIST_DIAGNOSTIC_PATH = path.join(
  CONTRACT_FIXTURES_ROOT,
  "tools-list.diagnostic.json",
);

const ROUTED_NARROW_OPERATIONS = new Set([
  "kb_skills_load",
  "kb_semantic_advisor",
  "kb_validate_upsert",
  "kb_model_requirement",
  "kb_suggest_predicates",
]);

function narrowToolDefinition(name: string) {
  const spec = getSpec(name as OperationName);
  const [definition] = withWorkspaceRootSchema([
    {
      name: spec.name,
      description: spec.description,
      inputSchema: spec.businessInputSchema,
    },
  ]);
  if (!definition) throw new Error(`Missing catalog definition: ${name}`);
  return definition;
}

const OPERATION_NAMES = [
  "kb_query",
  "kb_search",
  "kb_status",
  "kb_skills",
  "kb_model",
  "kb_skills_load",
  "kb_semantic_advisor",
  "kb_find_gaps",
  "kb_coverage",
  "kb_graph",
  "kb_check",
  "kb_validate_upsert",
  "kb_upsert",
  "kb_delete",
  "kb_model_requirement",
  "kb_suggest_predicates",
  "kb_plan_bootstrap",
  "kb_sparql_remote",
  "kb_compile_intent",
  "kb_apply_plan",
  "kb_ingest_proof",
] as const;

const VOLATILE_KEYS = new Set([
  "createdAt",
  "updatedAt",
  "timestamp",
  "requestId",
  "request_id",
  "branch",
  "branchName",
  "kbPath",
  "kb_path",
  "prologPid",
  "pid",
  "lineNumber",
  "line_number",
  "uuid",
]);

function readJson<T extends JsonRecord>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => stable(entry));
  }

  if (value === null || typeof value !== "object") {
    return value;
  }

  const record = value as JsonRecord;
  const entries = Object.entries(record)
    .filter(([key]) => !VOLATILE_KEYS.has(key))
    .sort(([left], [right]) => left.localeCompare(right));

  return entries.reduce<JsonRecord>((acc, [key, entry]) => {
    acc[key] = stable(entry) as JsonRecord;
    return acc;
  }, {});
}

function stripVolatile(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => stripVolatile(entry));
  }

  if (value === null || typeof value !== "object") {
    return value;
  }

  const record = value as JsonRecord;
  const entries = Object.entries(record).filter(
    ([key]) => !VOLATILE_KEYS.has(key),
  );

  return entries.reduce<JsonRecord>((acc, [key, entry]) => {
    acc[key] = stripVolatile(entry) as JsonRecord;
    return acc;
  }, {});
}

function stableStringify(value: unknown): string {
  return JSON.stringify(stable(value), null, 2);
}

function stableSchemaStringify(value: unknown): string {
  return JSON.stringify(stableSchema(value), null, 2);
}

function stableSchema(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => stableSchema(entry));
  }
  if (value === null || typeof value !== "object") {
    return value;
  }
  const record = value as JsonRecord;
  return Object.fromEntries(
    Object.entries(record)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, stableSchema(entry)]),
  );
}

function formatUpdatedFixtures(filePaths: readonly string[]): void {
  const result = Bun.spawnSync({
    cmd: [BIOME_EXECUTABLE, "format", "--write", ...filePaths],
    cwd: REPOSITORY_ROOT,
    stdout: "pipe",
    stderr: "pipe",
  });
  if (result.exitCode !== 0) {
    throw new Error(
      `Failed to format updated MCP contract fixtures: ${result.stderr.toString()}`,
    );
  }
}

function loadSeed(): ContractSeed {
  return readJson<ContractSeed>(SEED_PATH);
}

function buildToolListSnapshot(tools: readonly CapturedTool[]) {
  return {
    tools: tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: stableSchema(
        z.toJSONSchema(tool.inputSchema as never),
      ) as JsonRecord,
      ...(tool.outputSchema
        ? {
            outputSchema: stableSchema(
              z.toJSONSchema(tool.outputSchema as never),
            ) as JsonRecord,
          }
        : {}),
      ...(tool.annotations
        ? { annotations: stableSchema(tool.annotations) as JsonRecord }
        : {}),
    })),
  };
}

function createRegisteredToolsSnapshot(
  tools: Parameters<typeof withDiagnosticTelemetrySchema>[0] = TOOLS,
): CapturedTool[] {
  const registered: CapturedTool[] = [];
  const server = {
    registerTool: (
      name: string,
      config: {
        description: string;
        inputSchema: { _zod?: unknown };
        outputSchema?: { _zod?: unknown };
        annotations?: Record<string, unknown>;
      },
    ) => {
      registered.push({
        name,
        description: config.description,
        // The registration surface receives the Zod-converted schema; the
        // tools-list fixture must reflect the wire output, so keep the Zod
        // schema and convert at snapshot time.
        inputSchema: config.inputSchema,
        ...(config.outputSchema ? { outputSchema: config.outputSchema } : {}),
        // Annotations reach the wire on tools/list (e.g. kb_job_status's
        // read-only hints), so the fixture must capture them too.
        ...(config.annotations ? { annotations: config.annotations } : {}),
      });
    },
  } as unknown as McpServer;

  const runtime = {
    tools,
    diagnosticModeEnabled: () => false,
    appendUsageLogLine: () => undefined,
    classifyDiagnosticError: () => ({}),
    deriveDiagnosticFields: () => ({}),
    extractToolCallPayload: () => ({ businessArgs: {}, telemetry: null }),
    activeBranchName: async () => "contracts-seed",
    ensureProlog: async () => ({}) as never,
    resetProlog: async () => undefined,
    inFlightRequests: async () => new Map<string, Promise<unknown>>(),
    isShuttingDown: async () => false,
    prologProcess: async () => null,
    handleKbCheck: async () => ({}),
    handleKbCoverage: async () => ({}),
    handleKbDelete: async () => ({}),
    handleKbFindGaps: async () => ({}),
    handleKbGraph: async () => ({}),
    handleSparql: async () => ({}),
    handleKbQuery: async () => ({}),
    handleKbSearch: async () => ({}),
    handleKbStatus: async () => ({}),
    handleKbSemanticAdvisor: async () => ({}),
    handleKbSkillsList: async () => ({}),
    handleKbSkillsLoad: async () => ({}),
    handleKbSkillsRead: async () => ({}),
    handleKbUpsert: async () => ({}),
    handleKbValidateUpsert: async () => ({}),
    handleKbModelRequirement: async () => ({}),
    handleKbSuggestPredicates: async () => ({}),
    handleKbPlanBootstrap: async () => ({}),
  } as unknown as Parameters<typeof registerAllTools>[1];

  registerAllTools(server, runtime);
  return registered;
}

function buildOperationFixture(
  tool: { name: string; description: string; inputSchema: JsonRecord },
  operation: { input: JsonRecord; success: JsonRecord; failure: JsonRecord },
  variant: "success" | "failure",
): JsonRecord {
  return stable({
    tool: {
      name: tool.name,
      description: tool.description,
      inputSchema: stable(tool.inputSchema) as JsonRecord,
    },
    input: stripVolatile(operation.input) as JsonRecord,
    ...(variant === "success"
      ? (stripVolatile(operation.success) as JsonRecord)
      : (stripVolatile(operation.failure) as JsonRecord)),
  }) as JsonRecord;
}

describe("mcp contract fixtures", () => {
  test("regenerates frozen tools and operation contracts", () => {
    const updateFixtures = process.env.UPDATE_MCP_CONTRACT_FIXTURES === "1";
    const updatedFixturePaths: string[] = [];
    const seed = loadSeed();
    const registered = createRegisteredToolsSnapshot();
    const diagnosticRegistered = createRegisteredToolsSnapshot(
      withDiagnosticTelemetrySchema(TOOLS),
    );
    const toolDefinitions = new Map(TOOLS.map((tool) => [tool.name, tool]));
    const registeredByName = new Map(
      registered.map((tool) => [tool.name, tool]),
    );

    // 16 agent-facing tools; kb_sparql_remote and kb_job_status register
    // only when KIBI_MCP_OPTIONAL_TOOLS names them.
    expect(registered.map((tool) => tool.name)).toHaveLength(16);
    expect(registered.map((tool) => tool.name)).not.toContain(
      "kb_briefing_generate",
    );

    // Snapshot the Zod schemas passed to the MCP SDK. This is the actual
    // tools/list wire surface, including the server-native kb_job_status poll
    // tool that registerAllTools appends after the canonical catalog.
    const baseTools = buildToolListSnapshot(registered);
    const diagnosticTools = buildToolListSnapshot(diagnosticRegistered);

    if (updateFixtures) {
      writeFileSync(
        TOOL_LIST_BASE_PATH,
        `${stableSchemaStringify(baseTools)}\n`,
      );
      writeFileSync(
        TOOL_LIST_DIAGNOSTIC_PATH,
        `${stableSchemaStringify(diagnosticTools)}\n`,
      );
      updatedFixturePaths.push(TOOL_LIST_BASE_PATH, TOOL_LIST_DIAGNOSTIC_PATH);
    } else {
      expect(stableSchemaStringify(baseTools)).toBe(
        stableSchemaStringify(readJson(TOOL_LIST_BASE_PATH)),
      );
      expect(stableSchemaStringify(diagnosticTools)).toBe(
        stableSchemaStringify(readJson(TOOL_LIST_DIAGNOSTIC_PATH)),
      );
    }

    // Narrow catalog operations that MCP reaches through kb_skills, kb_model
    // or kb_upsert dryRun keep their operation fixtures against the catalog
    // definition; every other operation must be a registered tool.
    const catalogDefinitions = new Map(
      withWorkspaceRootSchema(
        buildBaseTools(new Set(["kb_sparql_remote"])),
      ).map((tool) => [tool.name, tool]),
    );
    for (const operationName of OPERATION_NAMES) {
      const routed = ROUTED_NARROW_OPERATIONS.has(operationName);
      const tool = registeredByName.get(operationName);
      if (!tool && !routed && operationName !== "kb_sparql_remote") {
        throw new Error(`Missing registered tool: ${operationName}`);
      }

      const toolDefinition = routed
        ? narrowToolDefinition(operationName)
        : (toolDefinitions.get(operationName) ??
          catalogDefinitions.get(operationName));
      if (!toolDefinition) {
        throw new Error(`Missing tool definition: ${operationName}`);
      }

      const operation = seed.operations[operationName];
      const successFixturePath = path.join(
        CONTRACT_FIXTURES_ROOT,
        "operations",
        operationName,
        "success.json",
      );
      const failureFixturePath = path.join(
        CONTRACT_FIXTURES_ROOT,
        "operations",
        operationName,
        "failure.json",
      );

      const successFixture = buildOperationFixture(
        toolDefinition,
        operation,
        "success",
      );
      const failureFixture = buildOperationFixture(
        toolDefinition,
        operation,
        "failure",
      );
      if (updateFixtures) {
        writeFileSync(
          successFixturePath,
          `${stableStringify(successFixture)}\n`,
        );
        writeFileSync(
          failureFixturePath,
          `${stableStringify(failureFixture)}\n`,
        );
        updatedFixturePaths.push(successFixturePath, failureFixturePath);
      } else {
        expect(stableStringify(successFixture)).toBe(
          stableStringify(readJson(successFixturePath)),
        );
        expect(stableStringify(failureFixture)).toBe(
          stableStringify(readJson(failureFixturePath)),
        );
      }
    }

    if (updateFixtures) {
      formatUpdatedFixtures(updatedFixturePaths);
    }
  });
});
