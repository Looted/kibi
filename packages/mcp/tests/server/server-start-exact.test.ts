import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SESSION_BRIEF } from "kibi-agent-core/session-brief";

import * as diagnostics from "../../src/diagnostics.js";
import * as env from "../../src/env.js";
import { serverInstructions, startServer } from "../../src/server.js";
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

    const profile = process.env.KIBI_MCP_TOOLS;
    process.env.KIBI_MCP_TOOLS = "core";
    try {
      await startServer();
    } finally {
      if (profile === undefined) Reflect.deleteProperty(process.env, "KIBI_MCP_TOOLS");
      else process.env.KIBI_MCP_TOOLS = profile;
    }

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
    const releaseManifest = JSON.parse(
      readFileSync(
        path.join(import.meta.dir, "..", "..", "..", "core", "release.json"),
        "utf8",
      ),
    ) as { release: string };
    expect(inner._serverInfo).toStrictEqual({
      name: "kibi-mcp",
      title: `Kibi MCP (Kibi ${releaseManifest.release})`,
      description:
        "Agent-native requirements compiler: branch-local knowledge base for requirements, scenarios, tests, facts, and code-symbol traceability.",
      websiteUrl: "https://github.com/Looted/kibi",
      version,
      icons: KIBI_ICONS,
    });
    // This repository's knowledge base is not empty: the core profile
    // lists the six core tools and the receipt tool, and the instructions
    // say where the rest is.
    const listed = new Set([
      "kb_search",
      "kb_query",
      "kb_upsert",
      "kb_check",
      "kb_status",
      "kb_skills",
      "kb_review_firm_edit",
    ]);
    expect(inner._instructions).toBe(serverInstructions(listed));
    expect(inner._instructions).toBe(
      [
        SESSION_BRIEF,
        "kb_search answers a question with the governing requirements, facts, ADRs and tests; kb_query looks up an exact id or sourceFile; kb_upsert writes; kb_check validates; kb_status reports freshness.",
        "Workflow guidance: kb_skills with action load and id kibi-usage. For first-time repository setup, use the kibi-bootstrap prompt.",
        "This server lists kb_search, kb_query, kb_upsert, kb_check, kb_status, kb_skills, kb_review_firm_edit. The other Kibi operations (kb_find_gaps, kb_coverage, kb_graph, kb_model, kb_delete, kb_prepare_impact_review, kb_plan_bootstrap, kb_compile_intent, kb_apply_plan, kb_ingest_proof) run through the project CLI with the same input: npx --no-install kibi <command> (kibi --help lists them; JSON routes read --input -).",
      ].join("\n"),
    );
    expect(
      (tools.registerAllTools as unknown as { mock: { calls: unknown[][] } })
        .mock.calls[0]?.[2],
    ).toStrictEqual(listed);
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
