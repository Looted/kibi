// implements REQ-002, REQ-003
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { graphCommand } from "../../src/commands/graph.js";
import * as discovery from "../../src/commands/discovery-shared.js";
import { isolateKibiEnv } from "../helpers/in-process-workspace.js";

const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  process.exitCode = 0;
});

describe("graphCommand remaining csv and required-from branches", () => {
  test("treats omitted relationship and entity-type lists as empty csv values", async () => {
    restores.push(isolateKibiEnv());
    const execute = spyOn(discovery, "executeReportingSpec").mockResolvedValue({
      content: [{ type: "text", text: "ok" }],
      structuredContent: { nodes: [], edges: [] },
    } as never);
    const print = spyOn(discovery, "printDiscoveryResult").mockImplementation(
      () => undefined,
    );
    restores.push(() => {
      execute.mockRestore();
      print.mockRestore();
    });
    await graphCommand({ from: "REQ-1" });
    expect(execute.mock.calls[0]?.[1]).toMatchObject({
      seedIds: ["REQ-1"],
      relationships: [],
      entityTypes: [],
    });
  });
});
