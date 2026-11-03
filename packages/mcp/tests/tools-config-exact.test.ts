import { describe, expect, spyOn, test } from "bun:test";
import * as kibiRuntime from "kibi-runtime";

import { DIAGNOSTIC_TELEMETRY_SCHEMA } from "../src/diagnostics.js";
import { WORKSPACE_ROOT_SCHEMA } from "../src/server/workspace-router.js";
import {
  TOOLS,
  activeTools,
  buildBaseTools,
  enabledOptionalTools,
  withDiagnosticTelemetrySchema,
} from "../src/tools-config.js";

describe("tool list, exact", () => {
  test("outside diagnostic mode the tools carry only the workspace argument", () => {
    expect(activeTools(false)).toStrictEqual(TOOLS);
    for (const tool of activeTools(false)) {
      const properties = tool.inputSchema.properties as Record<string, unknown>;
      expect(properties.workspaceRoot).toStrictEqual(WORKSPACE_ROOT_SCHEMA);
      expect(properties).not.toHaveProperty("_diagnostic_telemetry");
    }
  });

  test("in diagnostic mode every tool also takes the telemetry argument", () => {
    const tools = activeTools(true);
    expect(tools.map((tool) => tool.name)).toStrictEqual(
      TOOLS.map((tool) => tool.name),
    );
    for (const tool of tools) {
      const properties = tool.inputSchema.properties as Record<string, unknown>;
      expect(properties._diagnostic_telemetry).toBe(
        DIAGNOSTIC_TELEMETRY_SCHEMA,
      );
      expect(properties.workspaceRoot).toStrictEqual(WORKSPACE_ROOT_SCHEMA);
    }
  });

  test("a tool without usable properties gets only the telemetry argument", () => {
    for (const properties of [undefined, null, "x", 0]) {
      const [tool] = withDiagnosticTelemetrySchema([
        {
          name: "t",
          description: "d",
          inputSchema: { type: "object", properties },
        },
      ]);
      expect(tool?.inputSchema).toStrictEqual({
        type: "object",
        properties: { _diagnostic_telemetry: DIAGNOSTIC_TELEMETRY_SCHEMA },
      });
    }
  });
});

const R = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};
const W = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: false,
};
const O = { ...R, openWorldHint: true };

describe("tool annotations", () => {
  test("every exposed tool has its title and effect hints", () => {
    const expected: Array<[string, string, typeof R]> = [
      ["kb_query", "Query Kibi entities", R],
      ["kb_search", "Search Kibi knowledge base", R],
      ["kb_status", "Inspect Kibi branch status", R],
      ["kb_skills", "Read bundled Kibi skills", R],
      ["kb_find_gaps", "Find missing Kibi relationships", R],
      ["kb_coverage", "Report Kibi coverage and proofs", R],
      ["kb_graph", "Traverse Kibi graph", R],
      ["kb_model", "Model Kibi requirement prose", R],
      ["kb_upsert", "Create or update Kibi entities", W],
      ["kb_delete", "Delete a Kibi entity", W],
      ["kb_check", "Validate Kibi knowledge base", R],
      ["kb_prepare_impact_review", "Prepare an impact review", R],
      ["kb_plan_bootstrap", "Plan Kibi bootstrap", R],
      ["kb_compile_intent", "Compile Kibi change intent", R],
      ["kb_apply_plan", "Apply an approved Kibi plan", W],
      ["kb_ingest_proof", "Ingest proof-run evidence", W],
      ["kb_sparql_remote", "Run a remote SPARQL query", O],
    ];
    expect(
      buildBaseTools(new Set(["kb_sparql_remote"])).map((tool) => [
        tool.name,
        tool.annotations,
      ]),
    ).toStrictEqual(
      expected.map(([name, title, hints]) => [name, { title, ...hints }]),
    );
    expect(buildBaseTools(new Set()).map((tool) => tool.name)).toStrictEqual(
      expected.slice(0, -1).map(([name]) => name),
    );
  });

  test("optional tools are named in a trimmed, comma-separated list", () => {
    expect([...enabledOptionalTools(undefined)]).toStrictEqual([]);
    expect([...enabledOptionalTools("")]).toStrictEqual([]);
    expect([...enabledOptionalTools(" kb_job_status , other,")]).toStrictEqual([
      "kb_job_status",
    ]);
    expect([...enabledOptionalTools(" all ")]).toStrictEqual([
      "kb_sparql_remote",
      "kb_job_status",
    ]);
  });

  test("hints combine every declared effect", () => {
    const real = kibiRuntime.getSpec;
    const spy = spyOn(kibiRuntime, "getSpec").mockImplementation(((
      name: Parameters<typeof real>[0],
    ) => ({
      ...real(name),
      declaredEffects: [
        {
          mutability: "read",
          destructive: false,
          retrySafety: "safe",
          openWorld: true,
        },
        {
          mutability: "write",
          destructive: true,
          retrySafety: "unsafe",
          openWorld: false,
        },
      ],
    })) as never);
    try {
      expect(buildBaseTools(new Set())[0]?.annotations).toStrictEqual({
        title: "Query Kibi entities",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      });
    } finally {
      spy.mockRestore();
    }
  });
});
