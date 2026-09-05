import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { coverageCommand } from "../../src/commands/coverage.js";
import { gapsCommand } from "../../src/commands/gaps.js";
import { graphCommand } from "../../src/commands/graph.js";
import { queryCommand } from "../../src/commands/query.js";
import { searchCommand } from "../../src/commands/search.js";
import { statusCommand } from "../../src/commands/status.js";
import * as discovery from "../../src/commands/discovery-shared.js";
import * as runtimeTypes from "../../src/public/operations/runtime-types.js";
import type { PrologProcess } from "../../src/prolog.js";
import {
  captureIo,
  isolateKibiEnv,
} from "../helpers/in-process-workspace.js";

const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
});

function reportingResult(text?: string, structured: unknown = { ok: true }) {
  return {
    content:
      text === undefined
        ? []
        : [{ type: "text" as const, text }],
    structuredContent: structured,
  };
}

describe("discovery command wrappers", () => {
  test("coverageCommand maps flags and prints json or fallback text", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const calls: unknown[] = [];
    const specSpy = spyOn(discovery, "executeReportingSpec").mockImplementation(
      async (_spec, input) => {
        calls.push(input);
        if (calls.length === 1) {
          return reportingResult("ignored", { rows: [] });
        }
        return reportingResult(undefined, { ok: true });
      },
    );
    restores.push(() => specSpy.mockRestore());
    const io = captureIo();
    restores.push(io.restore);

    await coverageCommand({
      tag: " auth, session, ",
      includePassing: true,
      includeTransitive: false,
      limit: "5",
      offset: "2",
      includeMigrationPreview: true,
      format: "json",
    });
    await coverageCommand({});

    expect(calls[0]).toMatchObject({
      by: "req",
      tags: ["auth", "session"],
      includePassing: true,
      includeTransitive: false,
      limit: 5,
      offset: 2,
      includeMigrationPreview: true,
    });
    expect(io.logText()).toContain('"rows"');
    expect(io.logText()).toContain("Coverage summary unavailable.");
  });

  test("gapsCommand splits CSV filters and omits unused type/source", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const calls: unknown[] = [];
    const specSpy = spyOn(discovery, "executeReportingSpec").mockImplementation(
      async (_spec, input) => {
        calls.push(input);
        return reportingResult("gap table", { gaps: [] });
      },
    );
    restores.push(() => specSpy.mockRestore());
    const io = captureIo();
    restores.push(io.restore);

    await gapsCommand(undefined, {
      missingRel: "  ",
      presentRel: "specified_by, verified_by",
      tag: "",
      format: "table",
    });
    await gapsCommand("req", {
      source: "src/app.ts",
      missingRel: "implements",
      limit: "3",
    });

    expect(calls[0]).toMatchObject({
      missingRelationships: [],
      presentRelationships: ["specified_by", "verified_by"],
      tags: [],
    });
    expect((calls[0] as { type?: string }).type).toBeUndefined();
    expect(calls[1]).toMatchObject({
      type: "req",
      sourceFile: "src/app.ts",
      missingRelationships: ["implements"],
      limit: 3,
    });
    expect(io.logText()).toContain("gap table");
  });

  test("graphCommand requires --from and otherwise traverses", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const specSpy = spyOn(discovery, "executeReportingSpec").mockResolvedValue(
      reportingResult(undefined, { nodes: [] }),
    );
    restores.push(() => specSpy.mockRestore());
    const io = captureIo();
    restores.push(io.restore);

    await graphCommand({ from: "  " });
    expect(process.exitCode).toBe(1);
    expect(io.errorText()).toContain("--from is required");

    process.exitCode = 0;
    await graphCommand({
      from: "REQ-1, REQ-2",
      relationships: "specified_by",
      direction: "both",
      entityTypes: "req,scenario",
      format: "json",
    });
    expect(specSpy.mock.calls[0]?.[1]).toMatchObject({
      seedIds: ["REQ-1", "REQ-2"],
      relationships: ["specified_by"],
      direction: "both",
      entityTypes: ["req", "scenario"],
    });
    expect(io.logText()).toContain('"nodes"');
  });

  test("searchCommand validates query and type before executing", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const io = captureIo();
    restores.push(io.restore);

    await searchCommand("  ", {});
    expect(process.exitCode).toBe(1);
    expect(io.errorText()).toContain("search query is required");

    process.exitCode = 0;
    await searchCommand("auth", { type: "not-a-type" });
    expect(process.exitCode).toBe(1);
    expect(io.errorText()).toContain("invalid type");

    process.exitCode = 0;
    const opSpy = spyOn(runtimeTypes, "executeOperation").mockResolvedValue({
      content: [],
      structuredContent: undefined,
    });
    restores.push(() => opSpy.mockRestore());
    await searchCommand("auth", { type: "req", format: "json", limit: "4" });
    expect(opSpy.mock.calls[0]?.[2]).toMatchObject({
      query: "auth",
      type: "req",
      limit: 4,
    });
    expect(io.logText()).toContain("results");
  });

  test("statusCommand prints structured status or fallback text", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const opSpy = spyOn(runtimeTypes, "executeOperation").mockResolvedValue({
      content: [{ type: "text", text: "status ok" }],
      structuredContent: { branch: "main" },
    });
    restores.push(() => opSpy.mockRestore());
    const io = captureIo();
    restores.push(io.restore);

    await statusCommand({ format: "json" });
    await statusCommand({});
    expect(io.logText()).toContain('"branch"');
    expect(io.logText()).toContain("status ok");
  });

  test("queryCommand validates inputs, prints entities, and maps relationship rows", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const io = captureIo();
    restores.push(io.restore);

    expect(await queryCommand(undefined, {})).toEqual({ exitCode: 1 });
    expect(io.errorText()).toContain("Must specify entity type");
    expect(await queryCommand("nope", {})).toEqual({ exitCode: 1 });
    expect(io.errorText()).toContain("Invalid type");

    const opSpy = spyOn(runtimeTypes, "executeOperation").mockResolvedValueOnce({
      content: [],
      structuredContent: { entities: [] },
    });
    expect(await queryCommand("req", { format: "json" })).toEqual({
      exitCode: 0,
    });
    expect(io.logText()).toContain("[]");

    opSpy.mockResolvedValueOnce({
      content: [],
      structuredContent: {
        entities: [
          {
            id: "REQ-LONG-IDENTIFIER",
            type: "req",
            title: "A sufficiently long title for truncation in the table view",
            status: "open",
            tags: ["auth", 1, "session"],
          },
        ],
      },
    });
    expect(await queryCommand("req", { format: "table", tag: "auth" })).toEqual({
      exitCode: 0,
    });
    expect(io.logText()).toContain("REQ-LONG-IDENTIF");

    opSpy.mockRejectedValueOnce(new Error("prolog down"));
    expect(await queryCommand("req", {})).toEqual({ exitCode: 1 });
    expect(io.errorText()).toContain("prolog down");
    restores.push(() => opSpy.mockRestore());

    const relSpy = spyOn(discovery, "withAttachedBranchProlog").mockImplementation(
      async (callback) =>
        callback({
          query: async () => ({
            success: true,
            bindings: {
              Results:
                "[[specified_by,REQ-1,SCEN-1],[broken],[specified_by,REQ-1,SCEN-2]]",
            },
          }),
        } as unknown as PrologProcess),
    );
    restores.push(() => relSpy.mockRestore());
    expect(
      await queryCommand(undefined, {
        relationships: "REQ-1",
        format: "json",
        offset: "0",
        limit: "10",
      }),
    ).toEqual({ exitCode: 0 });
    expect(io.logText()).toContain("specified_by");

    relSpy.mockImplementation(async (callback) =>
      callback({
        query: async () => ({ success: false, bindings: {} }),
      } as unknown as PrologProcess),
    );
    expect(
      await queryCommand(undefined, {
        relationships: "REQ-1",
        format: "table",
      }),
    ).toEqual({ exitCode: 0 });
    expect(io.logText()).toContain("No entities found");
  });
});
