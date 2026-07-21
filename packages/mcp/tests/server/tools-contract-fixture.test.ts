import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "bun:test";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerAllTools } from "../../src/server/tools.js";
import {
  TOOLS,
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
};

const CONTRACT_FIXTURES_ROOT = path.resolve(
  import.meta.dir,
  "../fixtures/contracts",
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

const OPERATION_NAMES = [
  "kb_query",
  "kb_search",
  "kb_status",
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
  "kb_autopilot_generate",
  "kb_sparql_remote",
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

function loadSeed(): ContractSeed {
  return readJson<ContractSeed>(SEED_PATH);
}

function buildToolListSnapshot(
  tools: readonly {
    name: string;
    description: string;
    inputSchema: JsonRecord;
  }[],
) {
  return {
    tools: tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: stable(tool.inputSchema) as JsonRecord,
    })),
  };
}

function createRegisteredToolsSnapshot(): CapturedTool[] {
  const registered: CapturedTool[] = [];
  const server = {
    registerTool: (
      name: string,
      config: { description: string; inputSchema: JsonRecord },
    ) => {
      registered.push({ name, description: config.description });
    },
  } as unknown as McpServer;

  const runtime = {
    tools: TOOLS,
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
    handleKbAutopilotGenerate: async () => ({}),
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
    const seed = loadSeed();
    const registered = createRegisteredToolsSnapshot();
    const toolDefinitions = new Map(TOOLS.map((tool) => [tool.name, tool]));

    expect(registered.map((tool) => tool.name)).toHaveLength(18);
    expect(registered.map((tool) => tool.name)).not.toContain(
      "kb_briefing_generate",
    );

    const baseTools = buildToolListSnapshot(TOOLS);
    const diagnosticTools = buildToolListSnapshot(
      withDiagnosticTelemetrySchema(TOOLS),
    );

    expect(stableStringify(baseTools)).toBe(
      stableStringify(readJson(TOOL_LIST_BASE_PATH)),
    );
    expect(stableStringify(diagnosticTools)).toBe(
      stableStringify(readJson(TOOL_LIST_DIAGNOSTIC_PATH)),
    );

    const registeredByName = new Map(
      registered.map((tool) => [tool.name, tool]),
    );

    for (const operationName of OPERATION_NAMES) {
      const tool = registeredByName.get(operationName);
      if (!tool) {
        throw new Error(`Missing registered tool: ${operationName}`);
      }

      const toolDefinition = toolDefinitions.get(operationName);
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

      expect(
        stableStringify(
          buildOperationFixture(toolDefinition, operation, "success"),
        ),
      ).toBe(stableStringify(readJson(successFixturePath)));
      expect(
        stableStringify(
          buildOperationFixture(toolDefinition, operation, "failure"),
        ),
      ).toBe(stableStringify(readJson(failureFixturePath)));
    }
  });
});
