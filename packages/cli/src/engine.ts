/*
 * Kibi — single-writer workspace engine and framed RPC client.
 *
 * The engine deliberately owns one interactive SWI-Prolog process for one
 * workspace/branch.  CLI and MCP callers only exchange typed envelopes over
 * the local socket; Prolog itself never crosses the process boundary.
 */

import { type ChildProcess, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import * as net from "node:net";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { PrologProcess, resolveKbPlPath } from "./prolog.js";
import { parseEntityFromList, parseListOfLists } from "./prolog/codec.js";
import type { PrologQueryResult } from "./public/operations/runtime-types.js";
import type {
  PrologEntityQueryInput,
  PrologEntityQueryResult,
  PrologSearchQueryInput,
  PrologSearchQueryResult,
} from "./public/operations/runtime-types.js";
import { isValidBranchName } from "./utils/branch-resolver.js";

export const ENGINE_PROTOCOL_VERSION = 1;
export const ENGINE_IDLE_TIMEOUT_MS = 10 * 60 * 1000;
export const ENGINE_PACKAGE_VERSIONS =
  process.env.KIBI_PACKAGE_VERSIONS ?? "unknown";
const ENGINE_QUERY_CACHE_MAX_ENTRIES = 128;
const ENGINE_QUERY_CACHE_MAX_RESULT_BYTES = 8 * 1024 * 1024;
const ENGINE_FRESHNESS_CACHE_MS = 100;

function engineIdleTimeoutMs(): number {
  const configured = Number.parseInt(
    process.env.KIBI_ENGINE_IDLE_TIMEOUT_MS ?? "",
    10,
  );
  return Number.isFinite(configured) && configured >= 100
    ? configured
    : ENGINE_IDLE_TIMEOUT_MS;
}

type EngineRequest = {
  readonly id: number;
  readonly method:
    | "query"
    | "entities"
    | "search"
    | "kbStatus"
    | "status"
    | "checkpoint"
    | "compact"
    | "export"
    | "stop"
    | "cancel";
  readonly protocolVersion?: number;
  readonly packageVersions?: string;
  readonly workspaceRoot?: string;
  readonly branch?: string;
  readonly goal?: string;
  readonly type?: string;
  readonly entityId?: string;
  readonly searchQuery?: string;
  readonly tags?: readonly string[];
  readonly sourceFile?: string;
  readonly limit?: number;
  readonly offset?: number;
  readonly targetDirectory?: string;
  readonly cancelOf?: number;
};

type EngineResponse = {
  readonly id: number;
  readonly ok: boolean;
  readonly result?: unknown;
  readonly error?: string;
  readonly serverPackageVersions?: string;
};

type PendingRequest = {
  readonly resolve: (value: unknown) => void;
  readonly reject: (error: Error) => void;
};

function quoteProlog(value: string): string {
  return value.replaceAll("'", "''");
}

function cacheableEngineGoal(goal: string): boolean {
  const normalized = goal.trim();
  if (
    !normalized ||
    normalized.startsWith("(") ||
    normalized.includes("kb_storage_status")
  ) {
    return false;
  }
  // The daemon cache is deliberately limited to deterministic discovery and
  // graph reads.  Status/freshness reads external files and writes invalidate
  // the entire cache before they can be observed by another client.
  return (
    normalized.startsWith("findall(") ||
    normalized.startsWith("kb_entity(") ||
    normalized.startsWith("kb_entities_by_source(") ||
    normalized.startsWith("kb_relationship(")
  );
}

function mutatingEngineGoal(goal: string): boolean {
  return /(?:kb_(?:assert|retract|commit|save|delete)|rdf_transaction|rdf_assert|rdf_retract)/.test(
    goal,
  );
}

function safeEngineGoal(goal: string): boolean {
  // The socket is a local capability boundary, not a general-purpose SWI
  // console. Public clients may compose the typed Kibi predicates needed by
  // the 18 operation contracts, but process/filesystem/network escape hatches
  // are rejected before they reach Prolog.
  if (
    /\b(?:halt|abort|shell|system|process_create|consult|load_files|open|close|delete_file|rename_file|make_directory|thread_create|rdf_attach_db|rdf_load|rdf_save|assertz|asserta|retractall)\s*\(/.test(
      goal,
    )
  ) {
    return false;
  }
  return /(?:^|[(:,\s])(?:kb_|checks:|status:|discovery:|requirement_proof:|findall\(|aggregate_all\(|rdf_transaction\(|set_prolog_flag\(|use_module\(|atom_json_dict\(|member\(|once\(|true\b|fail\b)/.test(
    goal.trim(),
  );
}

function frame(value: unknown): Buffer {
  const payload = Buffer.from(JSON.stringify(value), "utf8");
  const header = Buffer.allocUnsafe(4);
  header.writeUInt32BE(payload.byteLength, 0);
  return Buffer.concat([header, payload]);
}

function writeSocketFrame(socket: net.Socket, value: unknown): void {
  if (socket.destroyed || !socket.writable) return;
  try {
    socket.write(frame(value));
  } catch {
    // A client may disconnect while a queued request is finishing. The
    // journal transaction remains authoritative; there is no response to
    // deliver to a closed peer.
  }
}

function parseFrames(
  buffer: Buffer<ArrayBufferLike>,
  onFrame: (value: unknown) => void,
): Buffer {
  let cursor = 0;
  while (buffer.byteLength - cursor >= 4) {
    const length = buffer.readUInt32BE(cursor);
    if (length > 64 * 1024 * 1024) {
      throw new Error("Kibi engine frame exceeds 64 MiB limit");
    }
    if (buffer.byteLength - cursor - 4 < length) break;
    const payload = buffer.subarray(cursor + 4, cursor + 4 + length);
    onFrame(JSON.parse(payload.toString("utf8")) as unknown);
    cursor += 4 + length;
  }
  return buffer.subarray(cursor);
}

function runtimeDirectory(): string {
  const configured =
    process.env.KIBI_RUNTIME_DIR ??
    process.env.XDG_RUNTIME_DIR ??
    path.join(os.tmpdir(), "kibi-runtime");
  const candidates = [configured, path.join(os.tmpdir(), "kibi-runtime")];
  for (const candidate of candidates) {
    try {
      mkdirSync(candidate, { recursive: true, mode: 0o700 });
      // XDG_RUNTIME_DIR can exist but be mounted read-only (for example in a
      // constrained container). Probe the directory before using it for the
      // socket, start lock, and pid files so auto-start fails over cleanly.
      const probe = path.join(candidate, `.kibi-write-${process.pid}`);
      writeFileSync(probe, "", { mode: 0o600 });
      unlinkSync(probe);
      return candidate;
    } catch {
      // Try the private system-temp fallback below.
    }
  }
  throw new Error("Unable to create a writable Kibi engine runtime directory");
}

function fsyncPath(filePath: string): void {
  if (!existsSync(filePath)) return;
  let descriptor: number | null = null;
  try {
    descriptor = openSync(filePath, "r");
    fsyncSync(descriptor);
  } finally {
    if (descriptor !== null) closeSync(descriptor);
  }
}

/**
 * Cross the kernel durability boundary before a journaled mutation is
 * acknowledged. SWI flushes completed RDF transaction records to its journal
 * stream; fsyncing the journal and atomic CURRENT pointer makes that flush
 * survive a host crash as well as a process crash.
 */
// implements REQ-core-journaled-engine-persistence
export function fsyncJournaledBranchStore(branchPath: string): void {
  const rdfRoot = path.join(branchPath, "rdf");
  const directories: string[] = [];
  const pending = existsSync(rdfRoot) ? [rdfRoot] : [];
  while (pending.length > 0) {
    const directory = pending.pop();
    if (directory === undefined) break;
    directories.push(directory);
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) pending.push(entryPath);
      else if (entry.isFile() && entry.name !== "lock") fsyncPath(entryPath);
    }
  }
  for (const metadata of ["CURRENT", "storage.json", "kb.rdf"]) {
    fsyncPath(path.join(branchPath, metadata));
  }
  // Publish directory entries from the leaves upward, ending at the branch
  // directory that owns CURRENT and the storage marker.
  if (process.platform !== "win32") {
    for (const directory of directories.reverse()) fsyncPath(directory);
    fsyncPath(branchPath);
  }
}

// implements REQ-core-journaled-engine-persistence
export function engineSocketPath(
  workspaceRoot: string,
  branch: string,
): string {
  const canonicalRoot = (() => {
    try {
      return realpathSync(workspaceRoot);
    } catch {
      return path.resolve(workspaceRoot);
    }
  })();
  const key = createHash("sha256")
    .update(`${canonicalRoot}\0${branch}`)
    // 128 bits keeps collision risk negligible while staying below the
    // roughly 108-byte sockaddr_un limit even in a nested XDG runtime path.
    .digest("hex")
    .slice(0, 32);
  if (process.platform === "win32") {
    return `\\\\.\\pipe\\kibi-${key}`;
  }
  return path.join(runtimeDirectory(), `kibi-${key}.sock`);
}

export function enginePidPath(workspaceRoot: string, branch: string): string {
  const socket = engineSocketPath(workspaceRoot, branch);
  if (process.platform === "win32") {
    return path.join(
      runtimeDirectory(),
      `kibi-${createHash("sha256")
        .update(`${path.resolve(workspaceRoot)}\0${branch}`)
        .digest("hex")}.pid`,
    );
  }
  return `${socket}.pid`;
}

export function engineStartLockPath(
  workspaceRoot: string,
  branch: string,
): string {
  if (process.platform === "win32") {
    return path.join(
      runtimeDirectory(),
      `kibi-${createHash("sha256")
        .update(`${path.resolve(workspaceRoot)}\0${branch}`)
        .digest("hex")}.start.lock`,
    );
  }
  return `${engineSocketPath(workspaceRoot, branch)}.start.lock`;
}

function tryAcquireStartLock(lockPath: string): number | null {
  try {
    const descriptor = openSync(lockPath, "wx", 0o600);
    writeFileSync(lockPath, `${process.pid}:${Date.now()}\n`, { flag: "w" });
    return descriptor;
  } catch {
    // Remove a lock left by a crashed starter, but never steal one from a
    // live process. A short age grace period avoids racing a slow Node start.
    try {
      const stamp = readFileSync(lockPath, "utf8").trim().split(":");
      const pid = Number.parseInt(stamp[0] ?? "", 10);
      const created = Number.parseInt(stamp[1] ?? "", 10);
      let age = 0;
      try {
        age = Date.now() - statSync(lockPath).mtimeMs;
      } catch {
        age = 0;
      }
      if (!Number.isFinite(created) && age <= 5_000) return null;
      let alive = false;
      if (Number.isFinite(pid) && pid > 0) {
        try {
          process.kill(pid, 0);
          alive = true;
        } catch {
          alive = false;
        }
      }
      if (
        !alive &&
        (Number.isFinite(created) ? Date.now() - created > 5_000 : age > 5_000)
      ) {
        unlinkSync(lockPath);
      }
    } catch {
      // The other starter may be publishing/removing the lock right now.
    }
    return null;
  }
}

function releaseStartLock(lockPath: string, descriptor: number | null): void {
  if (descriptor !== null) {
    try {
      closeSync(descriptor);
    } catch {
      // best effort
    }
  }
  try {
    unlinkSync(lockPath);
  } catch {
    // Another starter may already have cleaned the lock.
  }
}

function recoverStaleJournalLock(branchPath: string): void {
  const lockPath = path.join(branchPath, "rdf", "lock");
  if (!existsSync(lockPath)) return;
  let contents = "";
  try {
    contents = readFileSync(lockPath, "utf8");
  } catch {
    return;
  }
  const match = /pid\((\d+)\)/.exec(contents);
  if (!match) return;
  const pid = Number.parseInt(match[1] ?? "", 10);
  if (!Number.isFinite(pid) || pid <= 0 || pid === process.pid) return;
  try {
    process.kill(pid, 0);
    return;
  } catch {
    try {
      rmSync(lockPath, { force: true });
    } catch {
      // Let rdf_attach_db report the lock error if another process wins the
      // race between the liveness probe and removal.
    }
  }
}

function daemonEntry(): string {
  const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
  // Packed clients keep the daemon beside engine.js. Source-tree repository
  // tests resolve engine.ts from src/, while the daemon is hosted by the
  // already-built Node artifact in dist/.
  const candidates = [
    path.join(moduleDirectory, "engine-daemon.js"),
    path.join(moduleDirectory, "..", "dist", "engine-daemon.js"),
    // Sandboxed/evaluation hosts may bundle the MCP server into their own
    // dist/ directory while preserving kibi-cli as a staged dependency. Keep
    // the Node daemon external to that bundle so it can resolve its Prolog and
    // codec modules exactly as the published CLI package does.
    path.join(
      moduleDirectory,
      "..",
      "node_modules",
      "kibi-cli",
      "dist",
      "engine-daemon.js",
    ),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(
    "The Kibi engine is not built. Run `npm run build:cli` before using the CLI engine.",
  );
}

function connectSocket(
  socketPath: string,
  timeoutMs: number,
): Promise<net.Socket> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(socketPath);
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      socket.destroy();
      reject(new Error(`Timed out connecting to Kibi engine at ${socketPath}`));
    }, timeoutMs);
    socket.once("connect", () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(socket);
    });
    // Keep a permanent error listener. Some Node versions emit the
    // connection-refused error on the next tick after a timeout destroys the
    // socket; a once-listener can otherwise become an uncaught event during
    // concurrent auto-start attempts.
    socket.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
  });
}

async function connectWithRetry(
  socketPath: string,
  timeoutMs: number,
): Promise<net.Socket> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    const errorPath = `${socketPath}.error`;
    if (existsSync(errorPath)) {
      try {
        const diagnostic = readFileSync(errorPath, "utf8").trim();
        if (diagnostic) throw new Error(diagnostic);
      } catch (error) {
        throw new Error(
          `Kibi engine failed to start: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    // Avoid creating a refused/ENOENT socket handle on every poll while the
    // daemon is still starting and avoid noisy late socket errors.
    if (process.platform !== "win32" && !existsSync(socketPath)) {
      await new Promise((resolve) => setTimeout(resolve, 25));
      continue;
    }
    try {
      return await connectSocket(
        socketPath,
        Math.min(250, deadline - Date.now()),
      );
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
  throw new Error(
    `Unable to connect to Kibi engine at ${socketPath}: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
  );
}

export type EngineClientOptions = {
  readonly workspaceRoot: string;
  readonly branch: string;
  readonly timeout?: number;
};

/** PrologPort-compatible client used by CLI and MCP operation runtimes. */
// implements REQ-core-journaled-engine-persistence
export class EngineClient {
  private readonly workspaceRoot: string;
  private readonly branch: string;
  private readonly timeout: number;
  private socket: net.Socket | null = null;
  private daemon: ChildProcess | null = null;
  private inputBuffer: Buffer<ArrayBufferLike> = Buffer.alloc(0);
  private requestId = 0;
  private pending = new Map<number, PendingRequest>();
  private requestTail: Promise<void> = Promise.resolve();
  private lastResult: PrologQueryResult | null = null;

  constructor(options: EngineClientOptions) {
    if (!isValidBranchName(options.branch)) {
      throw new Error(`Invalid Kibi engine branch name: ${options.branch}`);
    }
    const resolvedWorkspaceRoot = path.resolve(options.workspaceRoot);
    try {
      this.workspaceRoot = realpathSync(resolvedWorkspaceRoot);
    } catch {
      this.workspaceRoot = resolvedWorkspaceRoot;
    }
    this.branch = options.branch;
    this.timeout = options.timeout ?? 120_000;
  }

  async start(allowSpawn = true): Promise<void> {
    if (this.socket !== null && !this.socket.destroyed) return;
    const socketPath = engineSocketPath(this.workspaceRoot, this.branch);
    try {
      if (existsSync(socketPath)) {
        this.socket = await connectWithRetry(socketPath, 150);
      } else {
        throw new Error("engine socket is absent");
      }
    } catch {
      if (!allowSpawn) return;
      const nodePath = process.env.KIBI_NODE_PATH ?? "node";
      const entry = daemonEntry();
      const lockPath = engineStartLockPath(this.workspaceRoot, this.branch);
      const startDeadline = Date.now() + this.timeout;
      let lock: number | null = null;
      while (lock === null && Date.now() < startDeadline) {
        if (existsSync(socketPath)) {
          try {
            this.socket = await connectWithRetry(socketPath, 100);
            break;
          } catch {
            // The daemon may be replacing a stale socket; retry below.
          }
        }
        if (this.socket === null) {
          lock = tryAcquireStartLock(lockPath);
          if (lock === null) {
            await new Promise((resolve) => setTimeout(resolve, 50));
          }
        }
      }
      if (this.socket === null && lock === null) {
        throw new Error(
          `Unable to connect to Kibi engine at ${socketPath} while another starter owns ${lockPath}`,
        );
      }
      if (lock !== null) {
        try {
          rmSync(`${socketPath}.error`, { force: true });
          try {
            const daemon = spawn(
              nodePath,
              [
                entry,
                "--workspace",
                this.workspaceRoot,
                "--branch",
                this.branch,
                "--socket",
                socketPath,
              ],
              {
                detached: true,
                stdio: "ignore",
                env: {
                  ...process.env,
                  KIBI_ENGINE_PROTOCOL: String(ENGINE_PROTOCOL_VERSION),
                },
              },
            );
            await new Promise<void>((resolve, reject) => {
              daemon.once("spawn", resolve);
              daemon.once("error", reject);
            });
            this.daemon = daemon;
          } catch (error) {
            throw new Error(
              `Kibi engine requires Node.js >=18 to host the daemon; failed to start '${nodePath}': ${error instanceof Error ? error.message : String(error)}`,
            );
          }
          this.daemon.unref();
          this.socket = await connectWithRetry(socketPath, this.timeout);
        } finally {
          releaseStartLock(lockPath, lock);
        }
      }
    }
    if (this.socket === null) return;
    this.attachSocket(this.socket);
  }

  private attachSocket(socket: net.Socket): void {
    socket.on("data", (chunk) => {
      try {
        const bytes = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
        this.inputBuffer = parseFrames(
          Buffer.concat([this.inputBuffer, bytes]) as Buffer<ArrayBufferLike>,
          (value) => this.handleResponse(value),
        );
      } catch (error) {
        socket.destroy(
          error instanceof Error ? error : new Error(String(error)),
        );
      }
    });
    socket.on("close", () => {
      this.socket = null;
      const error = new Error("Kibi engine connection closed");
      for (const pending of this.pending.values()) pending.reject(error);
      this.pending.clear();
    });
    socket.on("error", (error) => {
      for (const pending of this.pending.values()) pending.reject(error);
      this.pending.clear();
    });
  }

  private handleResponse(value: unknown): void {
    if (value === null || typeof value !== "object") return;
    const response = value as Partial<EngineResponse>;
    if (typeof response.id !== "number") return;
    const pending = this.pending.get(response.id);
    if (!pending) return;
    this.pending.delete(response.id);
    if (response.ok) pending.resolve(response.result);
    else
      pending.reject(new Error(response.error ?? "Kibi engine request failed"));
  }

  private async request<T>(
    request: Omit<EngineRequest, "id">,
    signal?: AbortSignal,
  ): Promise<T> {
    await this.start();
    const socket = this.socket;
    if (socket === null || socket.destroyed)
      throw new Error("Kibi engine is not connected");
    const id = ++this.requestId;
    const result = new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      try {
        socket.write(
          frame({
            ...request,
            id,
            protocolVersion: ENGINE_PROTOCOL_VERSION,
            packageVersions: ENGINE_PACKAGE_VERSIONS,
            workspaceRoot: this.workspaceRoot,
            branch: this.branch,
          } satisfies EngineRequest),
        );
      } catch (error) {
        this.pending.delete(id);
        reject(error instanceof Error ? error : new Error(String(error)));
        return;
      }
      if (signal !== undefined) {
        const abort = (): void => {
          if (!this.pending.has(id)) return;
          this.pending.delete(id);
          this.cancel(id);
          reject(new Error("Kibi engine request cancelled"));
        };
        if (signal.aborted) abort();
        else signal.addEventListener("abort", abort, { once: true });
      }
    });
    return result;
  }

  async query(goal: string, signal?: AbortSignal): Promise<PrologQueryResult> {
    let result!: PrologQueryResult;
    const previous = this.requestTail;
    let release!: () => void;
    this.requestTail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      result = await this.request<PrologQueryResult>(
        { method: "query", goal },
        signal,
      );
      this.lastResult = result;
      return result;
    } finally {
      release();
    }
  }

  async queryBatch(goals: readonly string[]): Promise<PrologQueryResult> {
    const normalized = goals.map((goal) => goal.trim().replace(/\.+\s*$/, ""));
    return this.query(`rdf_transaction((${normalized.join(", ")}))`);
  }

  async queryEntities(
    input: PrologEntityQueryInput,
  ): Promise<PrologEntityQueryResult> {
    const result = await this.request<PrologQueryResult>({
      method: "entities",
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.id !== undefined ? { entityId: input.id } : {}),
      ...(input.tags !== undefined ? { tags: input.tags } : {}),
      ...(input.sourceFile !== undefined
        ? { sourceFile: input.sourceFile }
        : {}),
      limit: input.limit,
      offset: input.offset,
    });
    if (!result.success) {
      throw new Error(result.error ?? "Indexed entity query failed");
    }
    const rows = result.bindings.Rows
      ? parseListOfLists(result.bindings.Rows).map(parseEntityFromList)
      : [];
    const count = Number.parseInt(result.bindings.Count ?? "0", 10);
    return {
      entities: rows,
      count: Number.isFinite(count) ? count : rows.length,
    };
  }

  async searchEntities(
    input: PrologSearchQueryInput,
  ): Promise<PrologSearchQueryResult> {
    const result = await this.request<PrologQueryResult>({
      method: "search",
      searchQuery: input.query,
      ...(input.type !== undefined ? { type: input.type } : {}),
      limit: input.limit,
      offset: input.offset,
    });
    if (!result.success) {
      throw new Error(result.error ?? "Indexed search candidate query failed");
    }
    const rows = result.bindings.Rows
      ? parseListOfLists(result.bindings.Rows).map(parseEntityFromList)
      : [];
    const count = Number.parseInt(result.bindings.Count ?? "0", 10);
    return {
      entities: rows,
      count: Number.isFinite(count) ? count : rows.length,
    };
  }

  /** Best-effort cancellation for a queued request. */
  cancel(requestId: number): void {
    const socket = this.socket;
    if (socket === null || socket.destroyed) return;
    const id = ++this.requestId;
    socket.write(
      frame({
        id,
        method: "cancel",
        cancelOf: requestId,
        protocolVersion: ENGINE_PROTOCOL_VERSION,
        packageVersions: ENGINE_PACKAGE_VERSIONS,
        workspaceRoot: this.workspaceRoot,
        branch: this.branch,
      } satisfies EngineRequest),
    );
  }

  async nextSolution(): Promise<PrologQueryResult | null> {
    const result = this.lastResult;
    this.lastResult = null;
    return result;
  }

  async save(): Promise<PrologQueryResult> {
    return this.query("kb_save");
  }

  async storageStatus(): Promise<PrologQueryResult> {
    return this.request<PrologQueryResult>({ method: "status" });
  }

  async checkpoint(): Promise<PrologQueryResult> {
    return this.request<PrologQueryResult>({ method: "checkpoint" });
  }

  async queryStatusJson(): Promise<PrologQueryResult> {
    return this.request<PrologQueryResult>({ method: "kbStatus" });
  }

  async compact(): Promise<PrologQueryResult> {
    return this.request<PrologQueryResult>({ method: "compact" });
  }

  async exportStorage(targetDirectory: string): Promise<PrologQueryResult> {
    return this.request<PrologQueryResult>({
      method: "export",
      targetDirectory,
    });
  }

  invalidateCache(): void {
    this.lastResult = null;
  }

  isRunning(): boolean {
    return this.socket !== null && !this.socket.destroyed;
  }

  getPid(): number {
    const pidPath = enginePidPath(this.workspaceRoot, this.branch);
    try {
      return Number.parseInt(readFileSync(pidPath, "utf8").trim(), 10) || 0;
    } catch {
      return 0;
    }
  }

  async stop(startIfMissing = true): Promise<void> {
    const socketPath = engineSocketPath(this.workspaceRoot, this.branch);
    if (!this.isRunning()) {
      try {
        await this.start(startIfMissing);
      } catch {
        if (!startIfMissing) return;
        throw new Error("Unable to start Kibi engine for stop request");
      }
    }
    if (!this.isRunning()) return;
    await this.request({ method: "stop" }).catch(() => undefined);
    this.socket?.destroy();
    this.socket = null;
    // The daemon acknowledges stop before its SWI child has flushed and the
    // listening socket has closed. Do not let a following auto-start attach to
    // that half-shutdown process.
    const deadline = Date.now() + 5_000;
    while (existsSync(socketPath) && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }

  async terminate(): Promise<void> {
    // Closing a client connection releases the engine; the daemon remains
    // available for other operations until its idle timeout expires.
    this.socket?.end();
    this.socket?.destroy();
    this.socket = null;
    this.daemon = null;
    this.lastResult = null;
  }
}

// implements REQ-core-journaled-engine-persistence
export async function ensureJournaledBranchStoreAsync(
  branchPath: string,
): Promise<void> {
  mkdirSync(branchPath, { recursive: true });
  const markerPath = path.join(branchPath, "storage.json");
  const marker = existsSync(markerPath) ? readFileSync(markerPath, "utf8") : "";
  if (marker.includes("kibi.rdf-journal.v1")) {
    const rdfDirectory = path.join(branchPath, "rdf");
    const currentPath = path.join(branchPath, "CURRENT");
    const sentinelPath = path.join(branchPath, "kb.rdf");
    if (!existsSync(rdfDirectory) || !existsSync(currentPath)) {
      recoverInterruptedGeneration(branchPath);
      if (existsSync(rdfDirectory) && existsSync(currentPath)) {
        recoverStaleJournalLock(branchPath);
        archiveLegacyFiles(branchPath);
        if (!existsSync(sentinelPath)) {
          writeFileSync(
            sentinelPath,
            "KIBI_STORAGE_FORMAT=kibi.rdf-journal.v1\n",
            { mode: 0o600 },
          );
        }
        return;
      }
      // Publication moves the validated generation before archiving the
      // legacy files. If the process dies between those moves, preserve the
      // still-live legacy store and discard only the incomplete publication.
      const legacyRdf = path.join(branchPath, "kb.rdf");
      const legacyAudit = path.join(branchPath, "audit.log");
      const legacyContents = existsSync(legacyRdf)
        ? readFileSync(legacyRdf, "utf8")
        : "";
      if (
        existsSync(legacyAudit) ||
        (existsSync(legacyRdf) &&
          !legacyContents.includes("kibi.rdf-journal.v1"))
      ) {
        rmSync(rdfDirectory, { recursive: true, force: true });
        rmSync(currentPath, { force: true });
        rmSync(markerPath, { force: true });
      } else {
        throw new Error(
          `Journaled branch store is incomplete at ${branchPath}; restore the immutable legacy/ backup or remove the interrupted generation before retrying`,
        );
      }
    } else {
      recoverStaleJournalLock(branchPath);
      // The sentinel is deliberately written last during migration. If it is
      // missing after a crash, archive any remaining legacy files and fence
      // old clients before allowing a new engine to attach.
      archiveLegacyFiles(branchPath);
      if (!existsSync(sentinelPath)) {
        writeFileSync(
          sentinelPath,
          "KIBI_STORAGE_FORMAT=kibi.rdf-journal.v1\n",
          { mode: 0o600 },
        );
      }
      return;
    }
  }

  const legacyRdf = path.join(branchPath, "kb.rdf");
  const legacyAudit = path.join(branchPath, "audit.log");
  if (!existsSync(legacyRdf) && !existsSync(legacyAudit)) {
    mkdirSync(path.join(branchPath, "rdf"), { recursive: true });
    writeFileSync(
      markerPath,
      '{"format":"kibi.rdf-journal.v1","schemaVersion":1}\n',
      { mode: 0o600 },
    );
    writeFileSync(path.join(branchPath, "CURRENT"), "generation-1:0\n", {
      mode: 0o600,
    });
    writeFileSync(
      path.join(branchPath, "kb.rdf"),
      "KIBI_STORAGE_FORMAT=kibi.rdf-journal.v1\n",
      { mode: 0o600 },
    );
    return;
  }
  if (existsSync(legacyRdf)) {
    const legacyContents = readFileSync(legacyRdf, "utf8");
    if (!/<rdf:RDF(?:\s|>)/.test(legacyContents)) {
      throw new Error(
        `Legacy Kibi store is corrupt at ${legacyRdf}: expected RDF/XML root`,
      );
    }
  }

  const parent = path.dirname(branchPath);
  const migrationKey = createHash("sha256")
    .update(path.resolve(branchPath))
    .digest("hex")
    .slice(0, 16);
  const staging = path.join(
    parent,
    `.${migrationKey}.migration.${process.pid}.${Date.now()}`,
  );
  mkdirSync(staging, { recursive: true, mode: 0o700 });
  // Production migration runs in the Node daemon. The one-shot branch exists
  // solely for repository tests that import this helper under Bun.
  const testOneShot =
    process.env.NODE_ENV === "test" &&
    typeof (globalThis as { Bun?: unknown }).Bun !== "undefined";
  const migrator = new PrologProcess({
    timeout: 120_000,
    oneShot: testOneShot,
  });
  try {
    if (!testOneShot) await migrator.start();
    const attachGoal = `kb_attach('${quoteProlog(branchPath)}')`;
    const migrateGoal = `kb_migrate_legacy('${quoteProlog(branchPath)}','${quoteProlog(staging)}')`;
    const migrated = testOneShot
      ? await migrator.query(`(${attachGoal}, ${migrateGoal})`)
      : await (async () => {
          const attach = await migrator.query(attachGoal);
          if (!attach.success)
            throw new Error(attach.error ?? "Failed to attach legacy KB");
          return migrator.query(migrateGoal);
        })();
    if (!migrated.success)
      throw new Error(migrated.error ?? "Legacy KB migration failed");
    fsyncJournaledBranchStore(staging);
  } catch (error) {
    rmSync(staging, { recursive: true, force: true });
    throw error;
  } finally {
    await migrator.terminate();
  }

  // Publish the validated generation while the originals are still present.
  // A crash before the marker is moved leaves the legacy branch readable; a
  // crash after it is moved is repaired by the marker branch above.
  for (const file of ["rdf", "storage.json", "CURRENT"]) {
    const source = path.join(staging, file);
    if (!existsSync(source)) continue;
    const target = path.join(branchPath, file);
    if (existsSync(target)) rmSync(target, { recursive: true, force: true });
    renameSync(source, target);
  }
  archiveLegacyFiles(branchPath);
  // Older clients must fail closed instead of seeing an empty branch.
  writeFileSync(
    path.join(branchPath, "kb.rdf"),
    "KIBI_STORAGE_FORMAT=kibi.rdf-journal.v1\n",
    { mode: 0o600 },
  );
  fsyncJournaledBranchStore(branchPath);
  rmSync(staging, { recursive: true, force: true });
}

function archiveLegacyFiles(branchPath: string): void {
  const legacyDir = path.join(branchPath, "legacy");
  mkdirSync(legacyDir, { recursive: true, mode: 0o700 });
  for (const file of ["kb.rdf", "audit.log"]) {
    const source = path.join(branchPath, file);
    if (!existsSync(source)) continue;
    if (file === "kb.rdf") {
      const contents = readFileSync(source, "utf8");
      if (contents.includes("kibi.rdf-journal.v1")) continue;
    }
    const destination = path.join(legacyDir, file);
    if (existsSync(destination)) {
      // Never overwrite an immutable backup from an earlier interrupted
      // attempt. Preserve the second copy with an explicit recovery suffix.
      renameSync(
        source,
        path.join(legacyDir, `${file}.recovery.${Date.now()}`),
      );
    } else {
      renameSync(source, destination);
    }
  }
}

function recoverInterruptedGeneration(branchPath: string): void {
  let entries: string[] = [];
  try {
    entries = readdirSync(branchPath);
  } catch {
    return;
  }
  const newest = (prefix: string): string | null => {
    const candidates = entries
      .filter((entry) => entry.startsWith(prefix))
      .sort()
      .reverse();
    const candidate = candidates[0];
    return candidate === undefined ? null : path.join(branchPath, candidate);
  };
  const oldRdf = newest("rdf.old.");
  const oldCurrent = newest("CURRENT.old.");
  const rdfPath = path.join(branchPath, "rdf");
  const currentPath = path.join(branchPath, "CURRENT");

  // If either half of the pointer/database pair is missing, prefer restoring
  // the matching old pair. This prevents a new RDF generation from being
  // opened with the old commit sequence after a crash between renames.
  if (
    (!existsSync(rdfPath) || !existsSync(currentPath)) &&
    oldRdf &&
    oldCurrent
  ) {
    try {
      if (existsSync(rdfPath))
        rmSync(rdfPath, { recursive: true, force: true });
      if (existsSync(currentPath)) rmSync(currentPath, { force: true });
      renameSync(oldRdf, rdfPath);
      renameSync(oldCurrent, currentPath);
      return;
    } catch {
      // Fall through to the individual best-effort restores below.
    }
  }
  if (!existsSync(rdfPath) && oldRdf) {
    try {
      renameSync(oldRdf, rdfPath);
    } catch {
      // Leave the actionable incomplete-store error for the caller.
    }
  }
  if (!existsSync(currentPath) && oldCurrent) {
    try {
      renameSync(oldCurrent, currentPath);
    } catch {
      // Leave the actionable incomplete-store error for the caller.
    }
  }
}

// implements REQ-core-journaled-engine-lifecycle
export async function runEngineDaemon(options: {
  readonly workspaceRoot: string;
  readonly branch: string;
  readonly socketPath: string;
}): Promise<void> {
  if (!isValidBranchName(options.branch)) {
    throw new Error(`Invalid Kibi engine branch name: ${options.branch}`);
  }
  await ensureJournaledBranchStoreAsync(
    path.join(options.workspaceRoot, ".kb", "branches", options.branch),
  );
  const prolog = new PrologProcess({ timeout: 120_000, oneShot: false });
  await prolog.start();
  const branchPath = path.join(
    options.workspaceRoot,
    ".kb",
    "branches",
    options.branch,
  );
  const attached = await prolog.query(
    `kb_attach('${quoteProlog(branchPath)}')`,
  );
  if (!attached.success)
    throw new Error(attached.error ?? "Failed to attach branch KB");
  const statusModulePath = path.join(
    path.dirname(resolveKbPlPath()),
    "status.pl",
  );
  const statusLoaded = await prolog.query(
    `use_module('${quoteProlog(statusModulePath.replaceAll("\\", "/"))}')`,
  );
  if (!statusLoaded.success) {
    throw new Error(statusLoaded.error ?? "Failed to load Kibi status module");
  }

  mkdirSync(path.dirname(options.socketPath), { recursive: true, mode: 0o700 });
  if (existsSync(options.socketPath)) {
    let live = false;
    try {
      const existing = await connectSocket(options.socketPath, 100);
      existing.destroy();
      live = true;
    } catch {
      // A refused connection means this is a stale filesystem socket.
    }
    if (live) {
      throw new Error(
        `A Kibi engine is already listening at ${options.socketPath}`,
      );
    }
    try {
      rmSync(options.socketPath, { force: true });
    } catch {
      // The listen call below reports permission/address-in-use failures.
    }
  }
  writeFileSync(
    enginePidPath(options.workspaceRoot, options.branch),
    `${process.pid}\n`,
    { mode: 0o600 },
  );
  const server = net.createServer();
  let activeClients = 0;
  let idleTimer: NodeJS.Timeout | null = null;
  let queue: Promise<void> = Promise.resolve();
  let idleCompactionQueued = false;
  const queryCache = new Map<string, PrologQueryResult>();
  let freshnessCache: {
    readonly capturedAt: number;
    readonly result: PrologQueryResult;
  } | null = null;
  const cancelledRequests = new Set<number>();
  const clients = new Set<net.Socket>();
  let shuttingDown = false;

  const scheduleIdleExit = (): void => {
    if (activeClients > 0) return;
    if (!idleCompactionQueued) {
      idleCompactionQueued = true;
      queue = queue
        .then(async () => {
          if (activeClients === 0) {
            await prolog.query("kb_storage_compact_if_needed");
          }
        })
        .catch(() => undefined)
        .finally(() => {
          idleCompactionQueued = false;
        });
    }
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (activeClients === 0) void shutdown();
    }, engineIdleTimeoutMs());
  };

  const handle = async (request: EngineRequest): Promise<unknown> => {
    if (request.protocolVersion !== ENGINE_PROTOCOL_VERSION) {
      throw new Error(
        `Kibi engine protocol mismatch: client=${request.protocolVersion ?? "missing"}, server=${ENGINE_PROTOCOL_VERSION}`,
      );
    }
    const expectedPackages = process.env.KIBI_PACKAGE_VERSIONS;
    if (
      expectedPackages !== undefined &&
      request.packageVersions !== expectedPackages
    ) {
      throw new Error(
        `Kibi engine package-version mismatch: client=${request.packageVersions ?? "missing"}, server=${expectedPackages}`,
      );
    }
    if (
      path.resolve(request.workspaceRoot ?? "") !==
        path.resolve(options.workspaceRoot) ||
      request.branch !== options.branch
    ) {
      throw new Error("Kibi engine workspace identity mismatch");
    }
    switch (request.method) {
      case "entities": {
        const limit = request.limit ?? 100;
        const offset = request.offset ?? 0;
        if (
          !Number.isInteger(limit) ||
          !Number.isInteger(offset) ||
          limit < 0 ||
          offset < 0 ||
          limit > 100_000
        ) {
          throw new Error("entities.limit/offset must be bounded integers");
        }
        const type =
          request.type === undefined
            ? "none"
            : `'${quoteProlog(request.type)}'`;
        const id =
          request.entityId === undefined
            ? "none"
            : `'${quoteProlog(request.entityId)}'`;
        const tags = `[${(request.tags ?? [])
          .map((tag) => `'${quoteProlog(tag)}'`)
          .join(",")}]`;
        const source =
          request.sourceFile === undefined
            ? "none"
            : `'${quoteProlog(request.sourceFile)}'`;
        const result = await prolog.query(
          `kb_query_entities(${type}, ${id}, ${tags}, ${source}, ${limit}, ${offset}, Rows, Count)`,
        );
        if (!result.success) {
          throw new Error(result.error ?? "Indexed entity query failed");
        }
        return result;
      }
      case "search": {
        const limit = request.limit ?? 10_000;
        const offset = request.offset ?? 0;
        if (
          typeof request.searchQuery !== "string" ||
          request.searchQuery.trim().length === 0
        ) {
          throw new Error("search.searchQuery must be a non-empty string");
        }
        if (
          !Number.isInteger(limit) ||
          !Number.isInteger(offset) ||
          limit < 0 ||
          offset < 0 ||
          limit > 100_000
        ) {
          throw new Error("search.limit/offset must be bounded integers");
        }
        const type =
          request.type === undefined
            ? "none"
            : `'${quoteProlog(request.type)}'`;
        const result = await prolog.query(
          `kb_search_entities(${type}, '${quoteProlog(request.searchQuery)}', ${limit}, ${offset}, Rows, Count)`,
        );
        if (!result.success) {
          throw new Error(
            result.error ?? "Indexed search candidate query failed",
          );
        }
        return result;
      }
      case "kbStatus": {
        if (
          freshnessCache !== null &&
          Date.now() - freshnessCache.capturedAt <= ENGINE_FRESHNESS_CACHE_MS
        ) {
          return freshnessCache.result;
        }
        const result = await prolog.query("status:kb_status_json(JsonString)");
        if (result.success) {
          freshnessCache = { capturedAt: Date.now(), result };
        }
        return result;
      }
      case "query": {
        if (typeof request.goal !== "string")
          throw new Error("query.goal must be a string");
        if (!safeEngineGoal(request.goal)) {
          throw new Error(
            "Kibi engine accepts only typed Kibi predicates; arbitrary Prolog goals are not exposed",
          );
        }
        if (mutatingEngineGoal(request.goal)) {
          queryCache.clear();
          freshnessCache = null;
        }
        if (cacheableEngineGoal(request.goal)) {
          const cached = queryCache.get(request.goal);
          if (cached !== undefined) return cached;
        }
        const result = await prolog.query(request.goal);
        if (result.success && mutatingEngineGoal(request.goal)) {
          fsyncJournaledBranchStore(branchPath);
        }
        if (
          result.success &&
          cacheableEngineGoal(request.goal) &&
          Buffer.byteLength(JSON.stringify(result), "utf8") <=
            ENGINE_QUERY_CACHE_MAX_RESULT_BYTES
        ) {
          if (queryCache.size >= ENGINE_QUERY_CACHE_MAX_ENTRIES) {
            const oldest = queryCache.keys().next().value;
            if (typeof oldest === "string") queryCache.delete(oldest);
          }
          queryCache.set(request.goal, result);
        }
        return result;
      }
      case "status":
        return prolog.query(
          "kb_storage_status(Status), atom_json_dict(Json, Status, [])",
        );
      case "checkpoint": {
        queryCache.clear();
        freshnessCache = null;
        const result = await prolog.query("kb_sync_checkpoint");
        if (result.success) fsyncJournaledBranchStore(branchPath);
        return result;
      }
      case "compact": {
        const result = await prolog.query("kb_storage_compact");
        if (result.success) fsyncJournaledBranchStore(branchPath);
        return result;
      }
      case "export":
        if (typeof request.targetDirectory !== "string")
          throw new Error("export.targetDirectory is required");
        return prolog.query(
          `kb_storage_export('${quoteProlog(request.targetDirectory)}')`,
        );
      case "stop":
        setImmediate(() => void shutdown());
        return { stopped: true };
      case "cancel":
        if (typeof request.cancelOf === "number") {
          cancelledRequests.add(request.cancelOf);
        }
        return { cancelled: request.cancelOf ?? null };
    }
  };

  const shutdown = async (): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    process.off("SIGTERM", requestSignalShutdown);
    process.off("SIGINT", requestSignalShutdown);
    if (idleTimer) clearTimeout(idleTimer);
    const saved = await prolog.query("kb_save").catch(() => null);
    if (saved?.success) {
      try {
        fsyncJournaledBranchStore(branchPath);
      } catch {
        // Shutdown remains best effort. Request-time writes fail closed if
        // their durability barrier cannot complete.
      }
    }
    await prolog.terminate().catch(() => undefined);
    for (const client of clients) client.destroy();
    server.close();
    // A close callback can remain pending on older Node releases when a
    // client disconnects during `server.close()`. The daemon has already
    // removed its socket/pid and has no useful work left, so do not keep the
    // hosting process alive on that bookkeeping handle.
    server.unref();
    try {
      if (existsSync(options.socketPath))
        rmSync(options.socketPath, { force: true });
      if (existsSync(enginePidPath(options.workspaceRoot, options.branch)))
        rmSync(enginePidPath(options.workspaceRoot, options.branch), {
          force: true,
        });
    } catch {
      // best effort cleanup
    }
    // The daemon is a detached host process. Once the SWI child and socket are
    // gone, force the final event-loop exit rather than retaining a stale
    // detached Node process on platform-specific server bookkeeping.
    setTimeout(() => process.exit(0), 50).unref();
  };

  // Detached engines must cross the same durability boundary when a service
  // manager or a test harness terminates them as they do for an RPC stop.
  // implements REQ-test-journaled-engine-harness
  const requestSignalShutdown = (): void => {
    void shutdown();
  };
  process.once("SIGTERM", requestSignalShutdown);
  process.once("SIGINT", requestSignalShutdown);

  server.on("connection", (socket) => {
    clients.add(socket);
    activeClients += 1;
    let buffer: Buffer<ArrayBufferLike> = Buffer.alloc(0);
    socket.on("data", (chunk) => {
      try {
        const bytes = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
        buffer = parseFrames(
          Buffer.concat([buffer, bytes]) as Buffer<ArrayBufferLike>,
          (value) => {
            const request = value as EngineRequest;
            if (
              request.method === "cancel" &&
              typeof request.cancelOf === "number"
            ) {
              cancelledRequests.add(request.cancelOf);
            }
            queue = queue
              .then(async () => {
                if (cancelledRequests.delete(request.id)) {
                  writeSocketFrame(socket, {
                    id: request.id,
                    ok: false,
                    error: "Kibi engine request cancelled",
                    serverPackageVersions: ENGINE_PACKAGE_VERSIONS,
                  } satisfies EngineResponse);
                  return;
                }
                try {
                  const result = await handle(request);
                  writeSocketFrame(socket, {
                    id: request.id,
                    ok: true,
                    result,
                    serverPackageVersions: ENGINE_PACKAGE_VERSIONS,
                  } satisfies EngineResponse);
                } catch (error) {
                  writeSocketFrame(socket, {
                    id: request.id,
                    ok: false,
                    error:
                      error instanceof Error ? error.message : String(error),
                    serverPackageVersions: ENGINE_PACKAGE_VERSIONS,
                  } satisfies EngineResponse);
                }
              })
              .catch(() => undefined);
          },
        );
      } catch (error) {
        socket.destroy(
          error instanceof Error ? error : new Error(String(error)),
        );
      }
    });
    socket.on("close", () => {
      clients.delete(socket);
      activeClients -= 1;
      scheduleIdleExit();
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.socketPath, () => resolve());
  });
  if (process.platform !== "win32") {
    try {
      chmodSync(options.socketPath, 0o600);
    } catch {
      // The runtime directory is private; retain a usable socket if a
      // platform does not expose chmod for its local socket implementation.
    }
  }
  scheduleIdleExit();
  await new Promise<void>((resolve) => {
    server.once("close", resolve);
  });
}
