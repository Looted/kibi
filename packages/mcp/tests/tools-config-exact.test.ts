import { describe, expect, test } from "bun:test";

import { DIAGNOSTIC_TELEMETRY_SCHEMA } from "../src/diagnostics.js";
import { WORKSPACE_ROOT_SCHEMA } from "../src/server/workspace-router.js";
import {
  TOOLS,
  activeTools,
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
