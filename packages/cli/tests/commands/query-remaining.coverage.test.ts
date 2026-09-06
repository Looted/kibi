// implements REQ-014
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { queryCommand } from "../../src/commands/query.js";
import * as discovery from "../../src/commands/discovery-shared.js";
import type { PrologProcess } from "../../src/prolog.js";
import * as runtimeTypes from "../../src/public/operations/runtime-types.js";
import {
  captureIo,
  isolateKibiEnv,
} from "../helpers/in-process-workspace.js";

const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  process.exitCode = 0;
});

describe("queryCommand remaining print and filter branches", () => {
  test("prints non-empty entity JSON and skips malformed relationship rows", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const io = captureIo();
    restores.push(io.restore);

    const opSpy = spyOn(runtimeTypes, "executeOperation").mockResolvedValue({
      content: [],
      structuredContent: {
        entities: [
          {
            id: "REQ-JSON-ROW",
            type: "req",
            title: "Printed as JSON rather than a table",
            status: "open",
            tags: ["auth"],
          },
        ],
      },
    });
    restores.push(() => opSpy.mockRestore());

    expect(await queryCommand("req", { format: "json" })).toEqual({
      exitCode: 0,
    });
    expect(io.logText()).toContain("REQ-JSON-ROW");
    expect(io.logText()).toContain("Printed as JSON");

    const relSpy = spyOn(
      discovery,
      "withAttachedBranchProlog",
    ).mockImplementation(async (callback) =>
      callback({
        query: async () => ({
          success: true,
          bindings: {
            Results:
              "[[specified_by,REQ-1,SCEN-1],[not_a_rel,REQ-1,SCEN-SKIP],[specified_by,REQ-OTHER,SCEN-2],[specified_by,REQ-1,'']]",
          },
        }),
      } as unknown as PrologProcess),
    );
    restores.push(() => relSpy.mockRestore());

    expect(
      await queryCommand(undefined, {
        relationships: "REQ-1",
        format: "table",
        offset: "0",
        limit: "10",
      }),
    ).toEqual({ exitCode: 0 });
    expect(io.logText()).toContain("specified_by");
    expect(io.logText()).toContain("REQ-1");
    expect(io.logText()).not.toContain("not_a_rel");
    expect(io.logText()).not.toContain("REQ-OTHER");
  });
});
