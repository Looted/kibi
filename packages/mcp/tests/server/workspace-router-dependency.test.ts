import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { KbDependencyError, type ResolvedKbDependency } from "kibi-runtime";
import {
  WORKSPACE_ROOT_ARGUMENT,
  WorkspaceRouter,
  defaultResolveChildCommand,
} from "../../src/server/workspace-router.js";

const tempDirs: string[] = [];
const routers: WorkspaceRouter[] = [];

afterEach(async () => {
  for (const router of routers.splice(0)) await router.shutdown();
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function tempDir(prefix: string): string {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));
  tempDirs.push(dir);
  return dir;
}

function kibiWorkspace(prefix: string): string {
  const root = tempDir(prefix);
  fs.mkdirSync(path.join(root, ".git"));
  fs.mkdirSync(path.join(root, ".kb"));
  fs.writeFileSync(path.join(root, ".kb", "manifest.json"), "{}\n");
  return root;
}

/** A stand-in kibi-mcp that echoes the workspace, dependency and arguments. */
const FAKE_CHILD = `
const readline = require("node:readline");
const send = (m) => process.stdout.write(JSON.stringify(m) + "\\n");
readline.createInterface({ input: process.stdin }).on("line", (line) => {
  const m = JSON.parse(line);
  if (m.id === undefined || m.id === null) return;
  if (m.method === "initialize") {
    send({ jsonrpc: "2.0", id: m.id, result: { protocolVersion: m.params.protocolVersion, capabilities: { tools: {} }, serverInfo: { name: "fake", version: "1" } } });
    return;
  }
  if (m.method === "tools/call") {
    const data = { workspace: process.env.KIBI_WORKSPACE, dependency: process.env.KIBI_KB_DEPENDENCY, branch: process.env.KIBI_BRANCH, routed: process.env.KIBI_MCP_ROUTED, tool: m.params.name, args: m.params.arguments ?? {}, pid: process.pid };
    send({ jsonrpc: "2.0", id: m.id, result: { content: [{ type: "text", text: "ok" }], structuredContent: { data } } });
    return;
  }
  send({ jsonrpc: "2.0", id: m.id, result: {} });
});
`;

function fakeChild(): { command: string; args: string[] } {
  const script = path.join(tempDir("kibi-dep-child-"), "fake.cjs");
  fs.writeFileSync(script, FAKE_CHILD);
  return { command: process.execPath, args: [script] };
}

const fakeServer = {
  server: {
    getClientCapabilities: () => undefined,
  },
} as unknown as McpServer;

function dependency(
  workspaceRoot: string,
  name = "billing",
): ResolvedKbDependency {
  return {
    name,
    git: "https://example.com/billing.git",
    commit: "a".repeat(40),
    kbSchema: 13,
    workspaceRoot,
  };
}

function data(result: CallToolResult): Record<string, unknown> {
  return (result.structuredContent as { data: Record<string, unknown> }).data;
}

describe("KB dependency routing", () => {
  test("serves a dependency from its own child, marked and without the scope", async () => {
    const attached = kibiWorkspace("kibi-dep-project-");
    const checkout = kibiWorkspace("kibi-dep-checkout-");
    const resolved: Array<[string, string]> = [];
    const commands: Array<[string, unknown]> = [];
    const child = fakeChild();
    const router = new WorkspaceRouter({
      server: fakeServer,
      workspaceRoot: attached,
      // Pinned: ordinary routing is off, dependency reads still work.
      env: {
        PATH: process.env.PATH ?? "",
        KIBI_WORKSPACE: attached,
        KIBI_BRANCH: "feature/project-branch",
      },
      resolveDependency: (root, name) => {
        resolved.push([root, name]);
        return dependency(checkout, name);
      },
      resolveChildCommand: (root, options) => {
        commands.push([root, options]);
        return child;
      },
      log: () => undefined,
      connectTimeoutMs: 20000,
    });
    routers.push(router);
    expect(router.enabled).toBe(false);

    const first = data(
      await router.routeKbDependency("kb_search", "billing", {
        query: "refund",
        kb: "billing",
      }),
    );
    expect(first.branch).toBeUndefined();
    expect(first).toMatchObject({
      workspace: checkout,
      dependency: `billing@${"a".repeat(40)}`,
      routed: "1",
      tool: "kb_search",
      args: { query: "refund" },
    });
    expect(resolved).toEqual([[attached, "billing"]]);
    expect(commands).toEqual([[checkout, { ownEntryOnly: true }]]);

    const second = data(
      await router.routeKbDependency("kb_query", "billing", {
        kb: "billing",
        [WORKSPACE_ROOT_ARGUMENT]: "  ",
      }),
    );
    expect(second.pid).toBe(first.pid);
    expect(second.args).toEqual({});
  });

  test("resolves the dependencies of the workspace the call names", async () => {
    const attached = kibiWorkspace("kibi-dep-project-");
    const worktree = kibiWorkspace("kibi-dep-worktree-");
    const checkout = kibiWorkspace("kibi-dep-checkout-");
    const bases: string[] = [];
    const router = new WorkspaceRouter({
      server: fakeServer,
      workspaceRoot: attached,
      env: { PATH: process.env.PATH ?? "" },
      isRoutable: (root) => root === worktree,
      resolveDependency: (root, name) => {
        bases.push(root);
        return dependency(checkout, name);
      },
      resolveChildCommand: () => fakeChild(),
      log: () => undefined,
      connectTimeoutMs: 20000,
    });
    routers.push(router);
    await router.routeKbDependency("kb_status", "billing", {
      kb: "billing",
      [WORKSPACE_ROOT_ARGUMENT]: path.join(worktree, ".kb"),
    });
    await router.routeKbDependency("kb_status", "billing", {
      kb: "billing",
      [WORKSPACE_ROOT_ARGUMENT]: os.tmpdir(),
    });
    await router.routeKbDependency("kb_status", "billing", {
      kb: "billing",
      [WORKSPACE_ROOT_ARGUMENT]: attached,
    });
    await router.routeKbDependency("kb_status", "billing", {
      kb: "billing",
      [WORKSPACE_ROOT_ARGUMENT]: `  ${worktree}\n`,
    });
    expect(bases).toEqual([worktree, attached, attached, worktree]);
  });

  test("refuses the dependencies of a workspace routing would not reach", async () => {
    const attached = kibiWorkspace("kibi-dep-project-");
    const other = kibiWorkspace("kibi-dep-other-");
    const checkout = kibiWorkspace("kibi-dep-checkout-");
    const bases: string[] = [];
    const resolveDependency = (root: string, name: string) => {
      bases.push(root);
      return dependency(checkout, name);
    };
    const pinned = new WorkspaceRouter({
      server: fakeServer,
      workspaceRoot: attached,
      env: { PATH: process.env.PATH ?? "", KIBI_WORKSPACE: attached },
      isRoutable: () => true,
      resolveDependency,
      resolveChildCommand: () => fakeChild(),
      log: () => undefined,
    });
    const unpinned = new WorkspaceRouter({
      server: fakeServer,
      workspaceRoot: attached,
      env: { PATH: process.env.PATH ?? "" },
      isRoutable: () => false,
      resolveDependency,
      resolveChildCommand: () => fakeChild(),
      log: () => undefined,
    });
    routers.push(pinned, unpinned);
    await expect(
      pinned.routeKbDependency("kb_search", "billing", {
        kb: "billing",
        [WORKSPACE_ROOT_ARGUMENT]: other,
      }),
    ).rejects.toThrow(
      `this server reads only the dependencies of its own workspace ${attached}`,
    );
    await expect(
      unpinned.routeKbDependency("kb_search", "billing", {
        kb: "billing",
        [WORKSPACE_ROOT_ARGUMENT]: other,
      }),
    ).rejects.toThrow(
      "that workspace is neither a worktree of this server's repository",
    );
    expect(bases).toEqual([]);
  });

  test("reports dependency errors and a child that cannot start", async () => {
    const attached = kibiWorkspace("kibi-dep-project-");
    const checkout = kibiWorkspace("kibi-dep-checkout-");
    const router = new WorkspaceRouter({
      server: fakeServer,
      workspaceRoot: attached,
      env: { PATH: process.env.PATH ?? "" },
      resolveDependency: (_root, name) => {
        if (name === "missing") {
          throw new KbDependencyError(
            "DEPENDENCY_UNKNOWN",
            "no such dependency",
          );
        }
        return dependency(checkout, name);
      },
      resolveChildCommand: () => null,
      log: () => undefined,
    });
    routers.push(router);
    await expect(
      router.routeKbDependency("kb_search", "missing", { kb: "missing" }),
    ).rejects.toThrow("no such dependency");
    await expect(
      router.routeKbDependency("kb_search", "billing", { kb: "billing" }),
    ).rejects.toThrow(
      "kibi-mcp could not be started for KB dependency 'billing'",
    );
  });

  test("by default a dependency child resolves this server's own entry", () => {
    const checkout = tempDir("kibi-dep-default-");
    fs.writeFileSync(path.join(checkout, "package.json"), "{}");
    const router = new WorkspaceRouter({
      server: fakeServer,
      workspaceRoot: kibiWorkspace("kibi-dep-project-"),
      env: { PATH: process.env.PATH ?? "" },
      log: () => undefined,
    });
    routers.push(router);
    const resolve = (
      router as unknown as {
        resolveChildCommand: (
          root: string,
          options?: { ownEntryOnly?: boolean },
        ) => { command: string; args: string[] } | null;
      }
    ).resolveChildCommand;
    const own = resolve(checkout, { ownEntryOnly: true });
    expect(own?.command).toBe(process.execPath);
    expect(own?.args).toHaveLength(1);
  });

  test("an ordinary routed child keeps the project branch and its own install", async () => {
    const attached = kibiWorkspace("kibi-dep-project-");
    const worktree = kibiWorkspace("kibi-dep-worktree-");
    const commands: Array<[string, unknown]> = [];
    const child = fakeChild();
    const router = new WorkspaceRouter({
      server: fakeServer,
      workspaceRoot: attached,
      env: { PATH: process.env.PATH ?? "", KIBI_BRANCH: "feature/routed" },
      isRoutable: () => true,
      resolveChildCommand: (root, options) => {
        commands.push([root, options]);
        return child;
      },
      log: () => undefined,
      connectTimeoutMs: 20000,
    });
    routers.push(router);
    const decision = await router.route("kb_search", {
      query: "refund",
      [WORKSPACE_ROOT_ARGUMENT]: worktree,
    });
    if (decision.kind !== "remote") throw new Error("expected a routed call");
    const answer = data(decision.result);
    expect(answer).toMatchObject({
      workspace: worktree,
      branch: "feature/routed",
      routed: "1",
      args: { query: "refund" },
    });
    expect(answer.dependency).toBeUndefined();
    expect(commands).toEqual([[worktree, undefined]]);
  });

  test("a dependency child skips a local install the checkout carries", () => {
    const checkout = tempDir("kibi-dep-installed-");
    const pkg = path.join(checkout, "node_modules", "kibi-mcp");
    fs.mkdirSync(path.join(pkg, "bin"), { recursive: true });
    fs.writeFileSync(path.join(pkg, "bin", "kibi-mcp"), "");
    fs.writeFileSync(path.join(pkg, "index.js"), "");
    fs.writeFileSync(
      path.join(pkg, "package.json"),
      JSON.stringify({
        name: "kibi-mcp",
        main: "index.js",
        bin: "bin/kibi-mcp",
      }),
    );
    fs.writeFileSync(path.join(checkout, "package.json"), "{}");
    const entry = path.join(tempDir("kibi-dep-own-"), "own-entry.js");
    fs.writeFileSync(entry, "");
    expect(defaultResolveChildCommand(checkout, [entry])?.args).toEqual([
      path.join(pkg, "bin", "kibi-mcp"),
    ]);
    expect(
      defaultResolveChildCommand(checkout, [entry], { ownEntryOnly: true }),
    ).toEqual({ command: process.execPath, args: [entry] });
  });

  test("a dependency child always runs this server's own kibi-mcp", () => {
    const checkout = tempDir("kibi-dep-own-");
    const entry = path.join(checkout, "own-entry.js");
    fs.writeFileSync(entry, "");
    // A package.json that would otherwise be searched for a local install.
    fs.writeFileSync(path.join(checkout, "package.json"), "{}");
    expect(
      defaultResolveChildCommand(checkout, [entry], { ownEntryOnly: true }),
    ).toEqual({ command: process.execPath, args: [entry] });
  });
});
