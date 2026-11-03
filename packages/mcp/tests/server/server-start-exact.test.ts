import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import * as diagnostics from "../../src/diagnostics.js";
import * as env from "../../src/env.js";
import { startServer } from "../../src/server.js";
import * as docs from "../../src/server/docs.js";
import { KIBI_ICONS } from "../../src/server/icons.js";
import * as tools from "../../src/server/tools.js";
import * as transport from "../../src/server/transport.js";
import * as router from "../../src/server/workspace-router.js";
import * as telemetry from "../../src/usage-telemetry.js";
import { resolveWorkspaceRoot } from "../../src/workspace.js";

const spies: { mockRestore: () => void }[] = [];
afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  router.setWorkspaceRouter(undefined);
});

describe("startServer", () => {
  test("names the server, gives its instructions and wires every part once", async () => {
    const order: string[] = [];
    const track = <T extends object, K extends keyof T>(target: T, key: K) =>
      spies.push(
        spyOn(target, key as never).mockImplementation((() => {
          order.push(String(key));
          return undefined;
        }) as never),
      );
    track(transport, "keepStdoutForProtocol");
    track(env, "loadDefaultEnvFile");
    track(diagnostics, "initializeDiagnosticMode");
    track(telemetry, "startMcpTelemetry");
    track(docs, "setupDocsAndPrompts");
    track(tools, "registerAllTools");
    track(transport, "setupTransportHandlers");
    const connect = spyOn(transport, "connectTransport").mockImplementation(
      async () => {
        order.push("connectTransport");
      },
    );
    spies.push(connect);
    const setRouter = spyOn(router, "setWorkspaceRouter");
    spies.push(setRouter);

    await startServer();

    expect(order).toStrictEqual([
      "keepStdoutForProtocol",
      "loadDefaultEnvFile",
      "initializeDiagnosticMode",
      "startMcpTelemetry",
      "setupDocsAndPrompts",
      "registerAllTools",
      "setupTransportHandlers",
      "connectTransport",
    ]);
    const server = connect.mock.calls[0]?.[0] as McpServer;
    const inner = server.server as unknown as {
      _serverInfo: unknown;
      _instructions: unknown;
    };
    const version = JSON.parse(
      readFileSync(
        path.join(import.meta.dir, "..", "..", "package.json"),
        "utf8",
      ),
    ).version;
    expect(inner._serverInfo).toStrictEqual({
      name: "kibi-mcp",
      title: "Kibi MCP",
      description:
        "Agent-native requirements compiler: branch-local knowledge base for requirements, scenarios, tests, facts, and code-symbol traceability.",
      websiteUrl: "https://github.com/Looted/kibi",
      version,
      icons: KIBI_ICONS,
    });
    expect(inner._instructions).toBe(
      [
        "Kibi is a branch-local requirements knowledge base for software traceability.",
        "Start with kb_search (ask it a question; its answer layer names the governing requirements, facts, ADRs and tests), then kb_query for exact lookups before any mutation.",
        "Model requirements as linked facts via kb_model (mode requirement) or kb_upsert (create endpoints before linking them); preflight writes with kb_upsert dryRun:true.",
        "Mutate sequentially with kb_upsert and kb_delete; validate with kb_check during iteration and run an unfiltered kb_check before completion.",
        "Confirm branch freshness with kb_status. For first-time repository setup, use the kibi-bootstrap prompt.",
      ].join(" "),
    );
    expect(setRouter).toHaveBeenCalledTimes(1);
    const installed = setRouter.mock.calls[0]?.[0];
    expect(installed).toBeInstanceOf(router.WorkspaceRouter);
    expect(
      (installed as unknown as { attachedRoot: string }).attachedRoot,
    ).toBe(realpathSync(resolveWorkspaceRoot()));
    for (const spy of [
      tools.registerAllTools,
      docs.setupDocsAndPrompts,
      transport.setupTransportHandlers,
    ] as unknown as { mock: { calls: unknown[][] } }[]) {
      expect(spy.mock.calls[0]?.[0]).toBe(server);
    }
    const transportArg = (
      transport.setupTransportHandlers as unknown as {
        mock: { calls: unknown[][] };
      }
    ).mock.calls[0]?.[1];
    expect(connect.mock.calls[0]?.[1] as unknown).toBe(transportArg);
    expect(transportArg).toBeDefined();
  });
});
