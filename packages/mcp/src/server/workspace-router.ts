/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/
// implements REQ-mcp-workspace-routing
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  type CallToolResult,
  CallToolResultSchema,
  RootsListChangedNotificationSchema,
} from "@modelcontextprotocol/sdk/types.js";

/**
 * Workspace routing: answer every tool call from the workspace the caller is
 * working in, not the one this server happened to start in.
 *
 * Hosts start an MCP server once per project and then let the agent work
 * elsewhere, most often in a git worktree. A server attached at startup would
 * answer from the original checkout's branch, and nothing in the result would
 * say so. This router decides, per call, which workspace should answer:
 *
 * 1. an explicit `workspaceRoot` argument (every tool accepts it; host hooks
 *    fill it in from the agent's current directory where hooks exist, and any
 *    agent can pass its working directory);
 * 2. otherwise the client's MCP roots, when the client declares them;
 * 3. otherwise the workspace this server is attached to.
 *
 * Another workspace is served by a child kibi-mcp started there (the
 * workspace's own project-local install when present, else this server's
 * entry), connected as an MCP client, pooled, and retired when idle. Routing
 * is limited to worktrees of the same repository, directories under the
 * client's roots, and `KIBI_MCP_ROUTABLE_ROOTS`; anything else, and any
 * failure to start the child, falls back to the attached workspace with a
 * `workspace_mismatch` diagnostic in the result, so a wrong-branch answer is
 * never silent. `KIBI_WORKSPACE` (or an alias) pins the server and disables
 * routing; a routed child is itself pinned and never routes further.
 */

export const WORKSPACE_ROOT_ARGUMENT = "workspaceRoot";

export const WORKSPACE_ROOT_SCHEMA = {
  type: "string",
  description:
    "Optional absolute path of the workspace this call is about when it differs from the one the server started in, for example the git worktree you are working in. The server answers from that workspace's knowledge base when it is a worktree of the same repository or lies under the client's MCP roots; otherwise it answers from its own workspace and adds a workspace_mismatch diagnostic. Host hooks fill this in automatically where available.",
} as const;

/** Mirror of the runtime's workspace env keys; any of them pins the server. */
const WORKSPACE_PIN_KEYS = [
  "KIBI_WORKSPACE",
  "KIBI_PROJECT_ROOT",
  "KIBI_ROOT",
] as const;
const ROUTED_CHILD_ENV = "KIBI_MCP_ROUTED";
const ROUTING_SWITCH_ENV = "KIBI_MCP_ROUTING";
const ROUTABLE_ROOTS_ENV = "KIBI_MCP_ROUTABLE_ROOTS";
const KIBI_MCP_PACKAGE = "kibi-mcp";
const DEFAULT_MAX_CHILDREN = 4;
const DEFAULT_IDLE_RETIRE_MS = 10 * 60 * 1000;
const DEFAULT_ROOTS_TIMEOUT_MS = 2000;
const DEFAULT_CONNECT_TIMEOUT_MS = 30000;

export type WorkspaceMismatchDiagnostic = {
  readonly code: "workspace_mismatch";
  readonly severity: "warning";
  readonly message: string;
  readonly detail: {
    readonly requested: string;
    readonly resolved: string | null;
    readonly answeredFrom: string;
    readonly reason:
      | "pinned"
      | "not_a_kibi_workspace"
      | "not_routable"
      | "unavailable";
    readonly error?: string;
  };
};

export type RoutingDecision =
  | {
      readonly kind: "local";
      readonly args: Record<string, unknown>;
      readonly notice?: WorkspaceMismatchDiagnostic;
    }
  | {
      readonly kind: "remote";
      readonly workspaceRoot: string;
      readonly result: CallToolResult;
    };

export type ChildCommand = {
  readonly command: string;
  readonly args: readonly string[];
};

export interface WorkspaceRouterOptions {
  readonly server: McpServer;
  /** The workspace this server is attached to. */
  readonly workspaceRoot: string;
  readonly env?: NodeJS.ProcessEnv;
  /** Map a directory to the Kibi workspace that owns it, or null. */
  readonly resolveWorkspace?: (directory: string) => string | null;
  /** Whether a resolved workspace may be served; see the module doc. */
  readonly isRoutable?: (
    workspaceRoot: string,
    roots: readonly string[],
  ) => boolean;
  /** How to start kibi-mcp for a workspace, or null when it cannot be. */
  readonly resolveChildCommand?: (workspaceRoot: string) => ChildCommand | null;
  readonly maxChildren?: number;
  readonly idleRetireMs?: number;
  readonly rootsTimeoutMs?: number;
  readonly connectTimeoutMs?: number;
  readonly log?: (text: string) => void;
  readonly now?: () => number;
}

type Child = {
  readonly root: string;
  readonly client: Client;
  readonly transport: StdioClientTransport;
  lastUsed: number;
  inFlight: number;
  idleTimer: ReturnType<typeof setTimeout> | null;
  closed: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * The Kibi workspace that owns `directory`: the nearest ancestor holding
 * `.kb/manifest.json`, without crossing a `.git` boundary so an unrelated
 * enclosing repository never claims the directory.
 */
export function kibiWorkspaceFor(directory: string): string | null {
  let current = path.resolve(directory);
  for (;;) {
    if (fs.existsSync(path.join(current, ".kb", "manifest.json"))) {
      return current;
    }
    if (fs.existsSync(path.join(current, ".git"))) return null;
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

/** The workspace named by MCP roots: the first file root in a Kibi workspace. */
export function workspaceFromRoots(
  roots: readonly string[],
  resolveWorkspace: (directory: string) => string | null = kibiWorkspaceFor,
): string | null {
  for (const root of roots) {
    const workspace = resolveWorkspace(root);
    if (workspace) return workspace;
  }
  return null;
}

function realpathOrSelf(target: string): string {
  try {
    return fs.realpathSync.native(target);
  } catch {
    return path.resolve(target);
  }
}

function isWithin(parent: string, candidate: string): boolean {
  const relative = path.relative(
    realpathOrSelf(parent),
    realpathOrSelf(candidate),
  );
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

/** The repository's shared git directory, so worktrees compare equal. */
export function gitCommonDirectory(directory: string): string | null {
  const result = spawnSync("git", ["rev-parse", "--git-common-dir"], {
    cwd: directory,
    encoding: "utf8",
    timeout: 5000,
  });
  if (result.status !== 0) return null;
  const common = result.stdout.trim();
  if (!common) return null;
  return realpathOrSelf(path.resolve(directory, common));
}

/**
 * Default routing boundary: worktrees of the attached repository, anything
 * under the client's roots, and operator-listed roots.
 */
export function defaultIsRoutable(
  attachedRoot: string,
  env: NodeJS.ProcessEnv,
): (workspaceRoot: string, roots: readonly string[]) => boolean {
  let attachedCommon: string | null | undefined;
  const allowlist = (env[ROUTABLE_ROOTS_ENV] ?? "")
    .split(path.delimiter)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  return (workspaceRoot, roots) => {
    if (roots.some((root) => isWithin(root, workspaceRoot))) return true;
    if (allowlist.some((root) => isWithin(root, workspaceRoot))) return true;
    if (attachedCommon === undefined) {
      attachedCommon = gitCommonDirectory(attachedRoot);
    }
    if (!attachedCommon) return false;
    return gitCommonDirectory(workspaceRoot) === attachedCommon;
  };
}

function readDeclaredBin(packageJsonPath: string): string | null {
  try {
    const manifest = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as {
      name?: unknown;
      bin?: unknown;
    };
    if (manifest.name !== KIBI_MCP_PACKAGE) return null;
    const bin =
      typeof manifest.bin === "string"
        ? manifest.bin
        : isRecord(manifest.bin) &&
            typeof manifest.bin[KIBI_MCP_PACKAGE] === "string"
          ? (manifest.bin[KIBI_MCP_PACKAGE] as string)
          : null;
    if (!bin) return null;
    const entry = path.resolve(path.dirname(packageJsonPath), bin);
    return fs.existsSync(entry) ? entry : null;
  } catch {
    return null;
  }
}

/**
 * The kibi-mcp to run for a workspace: its own project-local install when it
 * has one (so the child matches that branch's code), else this server's
 * entry. Resolution goes through the package's public entry, since its
 * exports map usually blocks `kibi-mcp/package.json`.
 */
export function defaultResolveChildCommand(
  workspaceRoot: string,
): ChildCommand | null {
  const marker = path.join(workspaceRoot, "package.json");
  if (fs.existsSync(marker)) {
    try {
      const entry = createRequire(marker).resolve(KIBI_MCP_PACKAGE);
      let current = path.dirname(entry);
      for (;;) {
        const bin = readDeclaredBin(path.join(current, "package.json"));
        if (bin) return { command: process.execPath, args: [bin] };
        const parent = path.dirname(current);
        if (parent === current) break;
        current = parent;
      }
    } catch {
      // No project-local install; fall through to this server's own entry.
    }
  }
  const self = process.argv[1];
  if (self && fs.existsSync(self)) {
    return { command: process.execPath, args: [path.resolve(self)] };
  }
  try {
    const entry = fileURLToPath(new URL("../../bin/kibi-mcp", import.meta.url));
    if (fs.existsSync(entry))
      return { command: process.execPath, args: [entry] };
  } catch {
    // Not resolvable from this module location.
  }
  return null;
}

function isPinned(env: NodeJS.ProcessEnv): boolean {
  return WORKSPACE_PIN_KEYS.some((key) => (env[key] ?? "").trim().length > 0);
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  what: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${what} timed out after ${timeoutMs}ms`)),
      timeoutMs,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export class WorkspaceRouter {
  private readonly options: WorkspaceRouterOptions;
  private readonly env: NodeJS.ProcessEnv;
  private readonly attachedRoot: string;
  private readonly resolveWorkspace: (directory: string) => string | null;
  private readonly isRoutable: (
    workspaceRoot: string,
    roots: readonly string[],
  ) => boolean;
  private readonly resolveChildCommand: (
    workspaceRoot: string,
  ) => ChildCommand | null;
  private readonly log: (text: string) => void;
  private readonly now: () => number;
  private readonly children = new Map<string, Child>();
  private readonly starting = new Map<string, Promise<Child | null>>();
  /** Background jobs started in a child, so polls reach the same process. */
  private readonly jobOwners = new Map<string, string>();
  private rootsCache: readonly string[] | null = null;
  private rootsHandlerInstalled = false;
  private shutDown = false;

  constructor(options: WorkspaceRouterOptions) {
    this.options = options;
    this.env = options.env ?? process.env;
    this.attachedRoot = realpathOrSelf(options.workspaceRoot);
    this.resolveWorkspace = options.resolveWorkspace ?? kibiWorkspaceFor;
    this.isRoutable =
      options.isRoutable ?? defaultIsRoutable(this.attachedRoot, this.env);
    this.resolveChildCommand =
      options.resolveChildCommand ?? defaultResolveChildCommand;
    this.log =
      options.log ?? ((text) => process.stderr.write(`[kibi-mcp] ${text}\n`));
    this.now = options.now ?? Date.now;
  }

  /** Routing is off for pinned servers, routed children, and by switch. */
  get enabled(): boolean {
    if (this.shutDown) return false;
    if ((this.env[ROUTING_SWITCH_ENV] ?? "").trim() === "0") return false;
    if ((this.env[ROUTED_CHILD_ENV] ?? "").trim() === "1") return false;
    return !isPinned(this.env);
  }

  /** Decide where `toolName(args)` is answered; strips `workspaceRoot`. */
  async route(
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<RoutingDecision> {
    // Callers that never mention a workspace get their argument object back
    // untouched, so handlers see exactly what the client sent.
    if (!(WORKSPACE_ROOT_ARGUMENT in args)) {
      if (!this.enabled) return { kind: "local", args };
      if (toolName === "kb_job_status") return this.routeJobPoll(args);
      const roots = await this.clientRoots();
      const desired = workspaceFromRoots(roots, this.resolveWorkspace);
      if (!desired) return { kind: "local", args };
      return this.routeTo(desired, roots[0] ?? desired, toolName, args);
    }

    const { [WORKSPACE_ROOT_ARGUMENT]: requestedRaw, ...rest } = args;
    const requested =
      typeof requestedRaw === "string" && requestedRaw.trim().length > 0
        ? requestedRaw.trim()
        : undefined;

    if (!this.enabled) {
      if (requested === undefined) return { kind: "local", args: rest };
      if (toolName === "kb_check") return { kind: "local", args };
      const resolved = this.resolveWorkspace(requested);
      if (resolved && realpathOrSelf(resolved) === this.attachedRoot) {
        return { kind: "local", args: rest };
      }
      return {
        kind: "local",
        args: rest,
        notice: this.notice(requested, resolved, "pinned"),
      };
    }

    if (toolName === "kb_job_status") return this.routeJobPoll(rest);

    if (requested !== undefined) {
      const resolved = this.resolveWorkspace(requested);
      if (!resolved) {
        // kb_check keeps its older meaning for a plain directory: impact
        // diagnostics for that tree, answered by the attached knowledge base.
        if (toolName === "kb_check") return { kind: "local", args };
        return {
          kind: "local",
          args: rest,
          notice: this.notice(requested, null, "not_a_kibi_workspace"),
        };
      }
      return this.routeTo(resolved, requested, toolName, rest);
    }

    // An empty workspaceRoot means "no preference": fall back to roots.
    const roots = await this.clientRoots();
    const desired = workspaceFromRoots(roots, this.resolveWorkspace);
    if (!desired) return { kind: "local", args: rest };
    return this.routeTo(desired, roots[0] ?? desired, toolName, rest);
  }

  /** Polls for a job started in a child go to that child. */
  private async routeJobPoll(
    args: Record<string, unknown>,
  ): Promise<RoutingDecision> {
    const owner =
      typeof args.jobId === "string"
        ? this.jobOwners.get(args.jobId)
        : undefined;
    const child = owner ? this.children.get(owner) : undefined;
    if (child && !child.closed) {
      return this.callChild(child, "kb_job_status", args);
    }
    return { kind: "local", args };
  }

  async shutdown(): Promise<void> {
    this.shutDown = true;
    await Promise.all(
      [...this.children.values()].map((child) => this.retire(child)),
    );
  }

  private notice(
    requested: string,
    resolved: string | null,
    reason: WorkspaceMismatchDiagnostic["detail"]["reason"],
    error?: string,
  ): WorkspaceMismatchDiagnostic {
    const why = {
      pinned:
        "this server is pinned to its workspace by KIBI_WORKSPACE (or an alias) and does not route calls",
      not_a_kibi_workspace:
        "no Kibi workspace (.kb/manifest.json) owns that directory",
      not_routable:
        "that workspace is neither a worktree of this server's repository nor under the client's MCP roots or KIBI_MCP_ROUTABLE_ROOTS",
      unavailable: `kibi-mcp could not be started there${error ? `: ${error}` : ""}`,
    }[reason];
    return {
      code: "workspace_mismatch",
      severity: "warning",
      message: `Answered from ${this.attachedRoot}, not from the requested workspace ${requested}: ${why}. Run the Kibi CLI from that directory if you need its knowledge base.`,
      detail: {
        requested,
        resolved,
        answeredFrom: this.attachedRoot,
        reason,
        ...(error ? { error } : {}),
      },
    };
  }

  private async routeTo(
    resolved: string,
    requested: string,
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<RoutingDecision> {
    const target = realpathOrSelf(resolved);
    if (target === this.attachedRoot) return { kind: "local", args };
    const roots = this.rootsCache ?? [];
    if (!this.isRoutable(target, roots)) {
      return {
        kind: "local",
        args,
        notice: this.notice(requested, resolved, "not_routable"),
      };
    }
    let child: Child | null;
    try {
      child = await this.childFor(target);
    } catch (error) {
      child = null;
      const message = error instanceof Error ? error.message : String(error);
      return {
        kind: "local",
        args,
        notice: this.notice(requested, resolved, "unavailable", message),
      };
    }
    if (!child) {
      return {
        kind: "local",
        args,
        notice: this.notice(
          requested,
          resolved,
          "unavailable",
          "no kibi-mcp entry resolves for that workspace",
        ),
      };
    }
    return this.callChild(child, toolName, args);
  }

  private async callChild(
    child: Child,
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<RoutingDecision> {
    child.inFlight += 1;
    this.touch(child);
    try {
      const result = (await child.client.callTool(
        { name: toolName, arguments: args },
        CallToolResultSchema,
      )) as CallToolResult;
      this.rememberJob(child, result);
      return { kind: "remote", workspaceRoot: child.root, result };
    } finally {
      child.inFlight -= 1;
      this.touch(child);
    }
  }

  private rememberJob(child: Child, result: CallToolResult): void {
    const structured = (result as { structuredContent?: unknown })
      .structuredContent;
    const data = isRecord(structured) ? structured.data : undefined;
    const jobId = isRecord(data) ? data.jobId : undefined;
    if (typeof jobId === "string") this.jobOwners.set(jobId, child.root);
  }

  /** The client's current roots, cached while the client reports changes. */
  private async clientRoots(): Promise<readonly string[]> {
    const capabilities = this.options.server.server.getClientCapabilities();
    if (!capabilities?.roots) return [];
    const listChanged = capabilities.roots.listChanged === true;
    if (listChanged && !this.rootsHandlerInstalled) {
      this.rootsHandlerInstalled = true;
      this.options.server.server.setNotificationHandler(
        RootsListChangedNotificationSchema,
        async () => {
          this.rootsCache = null;
        },
      );
    }
    if (listChanged && this.rootsCache) return this.rootsCache;
    try {
      const listed = await withTimeout(
        this.options.server.server.listRoots(),
        this.options.rootsTimeoutMs ?? DEFAULT_ROOTS_TIMEOUT_MS,
        "roots/list",
      );
      const roots = listed.roots.flatMap((root) => {
        try {
          return [fileURLToPath(root.uri)];
        } catch {
          return [];
        }
      });
      this.rootsCache = roots;
      return roots;
    } catch (error) {
      this.log(
        `roots/list failed; answering from ${this.attachedRoot}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return this.rootsCache ?? [];
    }
  }

  private async childFor(root: string): Promise<Child | null> {
    const existing = this.children.get(root);
    if (existing && !existing.closed) return existing;
    const pending = this.starting.get(root);
    if (pending) return pending;
    const start = this.startChild(root).finally(() => {
      this.starting.delete(root);
    });
    this.starting.set(root, start);
    return start;
  }

  private async startChild(root: string): Promise<Child | null> {
    const command = this.resolveChildCommand(root);
    if (!command) return null;
    this.evictIfFull();
    const env: Record<string, string> = {};
    for (const [key, value] of Object.entries(this.env)) {
      if (typeof value === "string") env[key] = value;
    }
    env.KIBI_WORKSPACE = root;
    env[ROUTED_CHILD_ENV] = "1";
    const transport = new StdioClientTransport({
      command: command.command,
      args: [...command.args],
      cwd: root,
      env,
      stderr: "pipe",
    });
    const client = new Client({
      name: "kibi-mcp-workspace-router",
      version: "1",
    });
    const child: Child = {
      root,
      client,
      transport,
      lastUsed: this.now(),
      inFlight: 0,
      idleTimer: null,
      closed: false,
    };
    transport.onclose = () => {
      child.closed = true;
      if (this.children.get(root) === child) this.children.delete(root);
      if (child.idleTimer) clearTimeout(child.idleTimer);
    };
    await withTimeout(
      client.connect(transport),
      this.options.connectTimeoutMs ?? DEFAULT_CONNECT_TIMEOUT_MS,
      `kibi-mcp for ${root} initialize`,
    );
    const label = `[kibi-mcp ${path.basename(root)}]`;
    transport.stderr?.on("data", (chunk: Buffer | string) => {
      for (const line of chunk.toString("utf8").split("\n")) {
        if (line.trim().length > 0) process.stderr.write(`${label} ${line}\n`);
      }
    });
    this.children.set(root, child);
    this.touch(child);
    this.log(`Serving ${root} through its own kibi-mcp`);
    return child;
  }

  private touch(child: Child): void {
    child.lastUsed = this.now();
    if (child.idleTimer) clearTimeout(child.idleTimer);
    const idleMs = this.options.idleRetireMs ?? DEFAULT_IDLE_RETIRE_MS;
    child.idleTimer = setTimeout(() => {
      if (child.inFlight === 0) void this.retire(child);
    }, idleMs);
    child.idleTimer.unref?.();
  }

  private evictIfFull(): void {
    const max = this.options.maxChildren ?? DEFAULT_MAX_CHILDREN;
    while (this.children.size >= max) {
      let oldest: Child | null = null;
      for (const child of this.children.values()) {
        if (child.inFlight > 0) continue;
        if (!oldest || child.lastUsed < oldest.lastUsed) oldest = child;
      }
      if (!oldest) return;
      void this.retire(oldest);
      this.children.delete(oldest.root);
    }
  }

  private async retire(child: Child): Promise<void> {
    if (child.closed) return;
    child.closed = true;
    if (child.idleTimer) clearTimeout(child.idleTimer);
    if (this.children.get(child.root) === child)
      this.children.delete(child.root);
    for (const [jobId, owner] of this.jobOwners) {
      if (owner === child.root) this.jobOwners.delete(jobId);
    }
    try {
      await child.client.close();
    } catch {
      // The child is gone either way.
    }
  }
}

let activeRouter: WorkspaceRouter | undefined;

/** Install the router the shared tool handler consults; undefined disables it. */
export function setWorkspaceRouter(router: WorkspaceRouter | undefined): void {
  activeRouter = router;
}

export function getWorkspaceRouter(): WorkspaceRouter | undefined {
  return activeRouter;
}

/** Add `workspaceRoot` to a tool input schema, keeping any existing entry's type. */
export function withWorkspaceRootSchema<
  T extends { inputSchema: Readonly<Record<string, unknown>> },
>(tools: readonly T[]): T[] {
  return tools.map((tool) => {
    const schema = tool.inputSchema;
    const properties = isRecord(schema.properties) ? schema.properties : {};
    return {
      ...tool,
      inputSchema: {
        ...schema,
        properties: {
          ...properties,
          [WORKSPACE_ROOT_ARGUMENT]: WORKSPACE_ROOT_SCHEMA,
        },
      },
    };
  });
}
