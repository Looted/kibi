import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import {
  EngineClient,
  enginePidPath,
  enginePublicationLockPath,
  engineSocketPath,
  engineStartLockPath,
  runEngineDaemon,
  runtimeDirectory,
} from "../src/engine.js";

const nativeTest = test.skipIf(
  process.platform !== "linux" && process.platform !== "darwin",
);
const roots: string[] = [];
const fallbackRoots: string[] = [];
const originalRuntime = process.env.KIBI_RUNTIME_DIR;
const originalXdg = process.env.XDG_RUNTIME_DIR;
const baselineSigterm = process.listeners("SIGTERM").slice();
const baselineSigint = process.listeners("SIGINT").slice();
const maximumBytes = process.platform === "linux" ? 107 : 103;
const socketName = `kibi-${"0".repeat(32)}.sock`;

afterEach(() => {
  for (const [name, value] of [
    ["KIBI_RUNTIME_DIR", originalRuntime],
    ["XDG_RUNTIME_DIR", originalXdg],
  ] as const) {
    if (value === undefined) Reflect.deleteProperty(process.env, name);
    else process.env[name] = value;
  }
  process.removeAllListeners("SIGTERM");
  process.removeAllListeners("SIGINT");
  for (const listener of baselineSigterm) process.on("SIGTERM", listener);
  for (const listener of baselineSigint) process.on("SIGINT", listener);
  // These directories are bound to this fixture's random configuration path;
  // register them before creation and never remove an already-existing path.
  for (const root of fallbackRoots.splice(0))
    rmSync(root, { recursive: true, force: true });
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function fixtureRoot(): string {
  const root = mkdtempSync("/tmp/kr-");
  roots.push(root);
  return realpathSync.native(root);
}

function configureRuntime(configured: string): string {
  process.env.KIBI_RUNTIME_DIR = configured;
  Reflect.deleteProperty(process.env, "XDG_RUNTIME_DIR");
  return registerFallback(configured);
}

function effectiveUid(): number {
  const uid = process.geteuid?.();
  if (uid === undefined)
    throw new Error("Native runtime fixture requires an effective uid");
  return uid;
}

function registerFallback(configured: string): string {
  const configuredKey = createHash("sha256")
    .update(configured)
    .digest("hex")
    .slice(0, 32);
  const fallback = path.join(
    realpathSync.native("/tmp"),
    `kb-${effectiveUid()}-${configuredKey}`,
  );
  expect(existsSync(fallback)).toBe(false);
  fallbackRoots.push(fallback);
  return fallback;
}

describe("engine socket locations preserve private canonical identities", () => {
  nativeTest(
    "uses a legitimate private XDG directory without changing permissions",
    () => {
      const root = fixtureRoot();
      Reflect.deleteProperty(process.env, "KIBI_RUNTIME_DIR");
      process.env.XDG_RUNTIME_DIR = root;
      expect(runtimeDirectory()).toBe(root);
      expect(lstatSync(root).mode & 0o777).toBe(0o700);
    },
  );

  nativeTest.each(["ascii", "multibyte"] as const)(
    "%s runtime paths fall back using the full UTF-8 socket budget",
    (kind) => {
      const root = fixtureRoot();
      const configured = path.join(
        root,
        kind === "ascii" ? "r".repeat(120) : "界".repeat(20),
      );
      const fallback = configureRuntime(configured);
      const requestedSocket = path.join(configured, socketName);
      expect(Buffer.byteLength(requestedSocket, "utf8")).toBeGreaterThan(
        maximumBytes,
      );
      if (kind === "multibyte")
        expect(requestedSocket.length).toBeLessThan(maximumBytes);
      const socket = engineSocketPath(root, "main");
      expect(path.dirname(socket)).toBe(fallback);
      expect(Buffer.byteLength(socket, "utf8")).toBeLessThanOrEqual(
        maximumBytes,
      );
      expect(path.basename(socket)).toMatch(/^kibi-[0-9a-f]{32}\.sock$/);
      expect(enginePidPath(root, "main")).toBe(`${socket}.pid`);
      expect(engineStartLockPath(root, "main")).toBe(`${socket}.start.lock`);
      expect(enginePublicationLockPath(root, "main")).toBe(
        `${socket}.publish.lock`,
      );
      expect(lstatSync(fallback).uid).toBe(effectiveUid());
      expect(lstatSync(fallback).mode & 0o777).toBe(0o700);
    },
  );

  nativeTest.each(["xdg", "tmpdir"] as const)(
    "a long %s environment directory selects the same bounded fallback in a fresh process",
    (kind) => {
      const root = fixtureRoot();
      const requested = path.join(root, "r".repeat(120));
      mkdirSync(requested, { mode: 0o700 });
      chmodSync(requested, 0o700);
      const configured =
        kind === "tmpdir" ? path.join(requested, "kibi-runtime") : requested;
      const fallback = registerFallback(configured);
      const environment = Object.fromEntries(
        Object.entries(process.env).filter(
          (entry): entry is [string, string] => typeof entry[1] === "string",
        ),
      );
      Reflect.deleteProperty(environment, "KIBI_RUNTIME_DIR");
      Reflect.deleteProperty(environment, "XDG_RUNTIME_DIR");
      if (kind === "xdg") environment.XDG_RUNTIME_DIR = requested;
      else environment.TMPDIR = requested;
      const child = spawnSync(
        process.execPath,
        [
          "-e",
          `
        import { engineSocketPath } from ${JSON.stringify(path.resolve(import.meta.dir, "../src/engine.ts"))};
        process.stdout.write(engineSocketPath(${JSON.stringify(root)}, "main"));
      `,
        ],
        { env: environment, encoding: "utf8", timeout: 10_000 },
      );
      expect(child.error).toBeUndefined();
      expect(child.status).toBe(0);
      expect(child.stderr).toBe("");
      expect(path.dirname(child.stdout)).toBe(fallback);
      expect(Buffer.byteLength(child.stdout, "utf8")).toBeLessThanOrEqual(
        maximumBytes,
      );
      expect(lstatSync(fallback).mode & 0o777).toBe(0o700);
    },
  );

  nativeTest(
    "keeps distinct configurations, workspaces and branches isolated while aliases converge",
    () => {
      const root = fixtureRoot();
      const physical = path.join(root, "physical");
      const alias = path.join(root, "alias");
      mkdirSync(physical);
      symlinkSync(physical, alias, "dir");
      const firstConfig = path.join(root, "r".repeat(120), "one");
      configureRuntime(firstConfig);
      const first = engineSocketPath(alias, "main");
      expect(engineSocketPath(physical, "main")).toBe(first);
      expect(engineSocketPath(physical, "other")).not.toBe(first);
      expect(engineSocketPath(path.join(physical, "missing"), "main")).not.toBe(
        first,
      );
      const missingSocket = engineSocketPath(
        path.join(alias, "missing"),
        "main",
      );
      mkdirSync(path.join(physical, "missing"));
      expect(engineSocketPath(path.join(physical, "missing"), "main")).toBe(
        missingSocket,
      );
      configureRuntime(path.join(root, "r".repeat(120), "two"));
      expect(engineSocketPath(alias, "main")).not.toBe(first);
    },
  );

  nativeTest("does not use or chmod a permissive configured directory", () => {
    const root = fixtureRoot();
    const configured = path.join(root, "shared");
    mkdirSync(configured, { mode: 0o755 });
    chmodSync(configured, 0o755);
    const fallback = configureRuntime(configured);
    expect(runtimeDirectory()).toBe(fallback);
    expect(lstatSync(configured).mode & 0o777).toBe(0o755);
    expect(readdirSync(configured)).toEqual([]);
  });

  nativeTest(
    "refuses a symlinked configured directory without probing its target",
    () => {
      const root = fixtureRoot();
      const target = path.join(root, "target");
      const configured = path.join(root, "alias");
      mkdirSync(target, { mode: 0o700 });
      chmodSync(target, 0o700);
      symlinkSync(target, configured, "dir");
      writeFileSync(path.join(target, "sentinel"), "unchanged\n");
      // Identity canonicalization maps this alias to its physical target, but
      // does not authorize using the symlink as a socket directory.
      const fallback = configureRuntime(target);
      process.env.KIBI_RUNTIME_DIR = configured;
      expect(runtimeDirectory()).toBe(fallback);
      expect(readdirSync(target)).toEqual(["sentinel"]);
      expect(readFileSync(path.join(target, "sentinel"), "utf8")).toBe(
        "unchanged\n",
      );
    },
  );

  nativeTest.each(["symlink", "permissive"] as const)(
    "an unsafe %s fallback fails closed",
    (kind) => {
      const root = fixtureRoot();
      const configured = path.join(root, "runtime-as-file");
      writeFileSync(configured, "not a directory\n");
      const fallback = configureRuntime(configured);
      const target = path.join(root, "target");
      mkdirSync(target, { mode: 0o700 });
      chmodSync(target, 0o700);
      writeFileSync(path.join(target, "sentinel"), "unchanged\n");
      if (kind === "symlink") symlinkSync(target, fallback, "dir");
      else {
        mkdirSync(fallback, { mode: 0o755 });
        chmodSync(fallback, 0o755);
      }
      expect(() => runtimeDirectory()).toThrow(
        /Unable to create a writable Kibi engine runtime directory/,
      );
      if (kind === "permissive")
        expect(lstatSync(fallback).mode & 0o777).toBe(0o755);
      expect(readdirSync(target)).toEqual(["sentinel"]);
    },
  );

  nativeTest(
    "an aliased missing workspace serves real daemon RPCs through a long-runtime fallback and stops",
    async () => {
      const root = fixtureRoot();
      const physical = path.join(root, "physical");
      const alias = path.join(root, "alias");
      mkdirSync(physical);
      symlinkSync(physical, alias, "dir");
      const workspace = path.join(alias, "new-workspace");
      const canonicalWorkspace = path.join(physical, "new-workspace");
      const fallback = configureRuntime(path.join(root, "r".repeat(120)));
      const socketPath = engineSocketPath(workspace, "main");
      const client = new EngineClient({
        workspaceRoot: workspace,
        branch: "main",
        timeout: 10_000,
      });
      const sibling = new EngineClient({
        workspaceRoot: canonicalWorkspace,
        branch: "main",
        timeout: 10_000,
      });
      let daemonError: unknown;
      // An in-process daemon ends its host process shortly after it stops;
      // here the host is the shared test runner, which must keep going.
      const exitSpy = spyOn(process, "exit").mockImplementation(
        (() => undefined as never) as typeof process.exit,
      );
      const daemon = runEngineDaemon({
        workspaceRoot: workspace,
        branch: "main",
        socketPath,
      });
      void daemon.catch((error) => {
        daemonError = error;
      });
      try {
        const deadline = Date.now() + 10_000;
        while (
          !existsSync(socketPath) &&
          Date.now() < deadline &&
          daemonError === undefined
        )
          await Bun.sleep(10);
        if (daemonError !== undefined) throw daemonError;
        expect(existsSync(socketPath)).toBe(true);
        expect(path.dirname(socketPath)).toBe(fallback);
        expect(engineSocketPath(canonicalWorkspace, "main")).toBe(socketPath);
        await client.start(false);
        await sibling.start(false);
        expect(
          await client.query(
            'kb_commit_upsert(req, [id=\'REQ-ALIAS\', title="Alias lifecycle", status=open, created_at="2026-09-30T00:00:00Z", updated_at="2026-09-30T00:00:00Z", source="docs/alias.md"], [], true, ChangeKind)',
          ),
        ).toMatchObject({
          success: true,
        });
        expect(
          await sibling.queryEntities({ type: "req", limit: 5, offset: 0 }),
        ).toMatchObject({
          count: 1,
          entities: [{ id: "REQ-ALIAS" }],
        });
        await client.stop(false);
        await daemon;
        expect(existsSync(socketPath)).toBe(false);
        expect(existsSync(enginePidPath(workspace, "main"))).toBe(false);
      } finally {
        await client.stop(false).catch(() => undefined);
        await sibling.terminate();
        await client.terminate();
        await daemon;
        await Bun.sleep(150);
        exitSpy.mockRestore();
      }
    },
    20_000,
  );
});
