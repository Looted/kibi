import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { load as parseYAML } from "js-yaml";
import { EngineClient } from "../../src/engine.js";
import { buildUpsertCommitGoal } from "../../src/operations/mutation/contradictions.js";
import { PrologProcess } from "../../src/prolog.js";
import { escapeAtom } from "../../src/prolog/codec.js";
import { branchStorePath } from "../../src/utils/branch-store-locator.js";
import { execSync, isolatedCliSandboxEnv } from "../helpers/isolated-env.js";

/**
 * End-to-end regression for generated-only symbol coordinates:
 *
 * 1. A source-first symbol upsert must never remove persisted RDF
 *    coordinates nor leak them into the authored manifest.
 * 2. When RDF coordinates are missing while source, artifact, and cache all
 *    still agree (the historical warm-cache divergence), a plain sync stays a
 *    true no-op and only the explicit approved refresh repairs the KB.
 */
describe("generated symbol coordinate persistence", () => {
  const TEST_TIMEOUT_MS = 60_000;
  let tmpDir: string;
  let originalKibiBranch: string | undefined;
  const kibiBin = path.resolve(__dirname, "../../bin/kibi");

  function runCli(
    args: readonly string[],
    input?: string,
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    return runCliAsync(args, input);
  }

  async function runCliAsync(
    args: readonly string[],
    input?: string,
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    const child = Bun.spawn(["bun", "run", kibiBin, ...args], {
      cwd: tmpDir,
      env: isolatedCliSandboxEnv({ KIBI_WORKSPACE: tmpDir }),
      ...(input === undefined ? {} : { stdin: new Blob([input]) }),
      stdout: "pipe",
      stderr: "pipe",
    });
    const [exitCode, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ]);
    return { exitCode, stdout, stderr };
  }

  beforeEach(async () => {
    originalKibiBranch = process.env.KIBI_BRANCH;
    process.env.KIBI_BRANCH = "main";
    tmpDir = mkdtempSync(path.join(os.tmpdir(), "kibi-coordinates-"));
    execSync("git init -b main", { cwd: tmpDir, stdio: "pipe" });
    execSync("git config user.email 'test@test.com'", { cwd: tmpDir });
    execSync("git config user.name 'Test User'", { cwd: tmpDir });
    execSync("git commit --allow-empty -m 'init'", { cwd: tmpDir });
    execSync(`bun ${kibiBin} init`, { cwd: tmpDir, stdio: "pipe" });

    mkdirSync(path.join(tmpDir, "src"), { recursive: true });
    writeFileSync(
      path.join(tmpDir, "src", "auth.ts"),
      "export function authenticate() {\n  return true;\n}\n",
    );
    writeFileSync(
      path.join(tmpDir, ".kb", "symbols.yaml"),
      `symbols:
  - id: SYM-AUTH
    title: authenticate
    sourceFile: src/auth.ts
    status: active
`,
    );
    execSync("git add -A", { cwd: tmpDir, stdio: "pipe" });

    const refreshed = await runCliAsync([
      "sync",
      "--refresh-symbol-coordinates",
    ]);
    expect(refreshed.exitCode, refreshed.stderr).toBe(0);
    expect(
      existsSync(path.join(tmpDir, ".kb", "symbol-coordinates.yaml")),
    ).toBe(true);

    const imported = await runCliAsync(["sync"]);
    expect(imported.exitCode, imported.stderr).toBe(0);
  }, TEST_TIMEOUT_MS);

  afterEach(() => {
    if (tmpDir && existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
    if (originalKibiBranch === undefined) {
      Reflect.deleteProperty(process.env, "KIBI_BRANCH");
    } else {
      process.env.KIBI_BRANCH = originalKibiBranch;
    }
  });

  async function querySymbolEntity(): Promise<Record<string, unknown>> {
    const output = await runCliAsync(["query", "symbol", "--format", "json"]);
    expect(output.exitCode, output.stderr).toBe(0);
    const parsed: unknown = JSON.parse(output.stdout);
    const entities = Array.isArray(parsed)
      ? (parsed as Array<Record<string, unknown>>)
      : ((parsed as { entities?: Array<Record<string, unknown>> }).entities ??
        []);
    const symbol = entities.find((entity) => entity.id === "SYM-AUTH");
    expect(symbol).toBeDefined();
    return symbol as Record<string, unknown>;
  }

  function expectCoordinates(entity: Record<string, unknown>): void {
    for (const key of [
      "sourceLine",
      "sourceColumn",
      "sourceEndLine",
      "sourceEndColumn",
    ]) {
      expect(typeof entity[key]).toBe("number");
    }
  }

  function expectNoCoordinates(entity: Record<string, unknown>): void {
    for (const key of [
      "sourceLine",
      "sourceColumn",
      "sourceEndLine",
      "sourceEndColumn",
    ]) {
      expect(entity[key] === undefined || entity[key] === null).toBe(true);
    }
  }

  /** Strip exactly the four generated coordinate literals through the
   *  production commit path, emulating the historical partial upsert defect
   *  without touching authored files, the artifact, or the cache. */
  async function stripRdfCoordinates(): Promise<void> {
    const entity = await querySymbolEntity();
    const stripped: Record<string, unknown> = { ...entity };
    for (const key of [
      "sourceLine",
      "sourceColumn",
      "sourceEndLine",
      "sourceEndColumn",
    ]) {
      delete stripped[key];
    }
    const store = branchStorePath(tmpDir, "main");
    const goal = buildUpsertCommitGoal({
      entity: stripped,
      relationships: [],
      skipContradictionCheck: true,
    });
    // Stop the long-lived single-writer daemon left behind by the CLI syncs
    // so this in-process commit can take the branch RDF lock.
    const daemon = new EngineClient({
      workspaceRoot: tmpDir,
      branch: "main",
      timeout: 5_000,
    });
    try {
      await daemon.stop(false);
    } catch {
      // No daemon was running; the branch lock is already free.
    }
    await daemon.terminate();
    const prolog = new PrologProcess({ timeout: 120_000 });
    try {
      await prolog.start();
      // The CLI syncs stop their daemons asynchronously; tolerate a short
      // window where the branch RDF lock is still being released.
      let attached: Awaited<ReturnType<typeof prolog.query>> = {
        success: false,
        bindings: {},
        error: "not attempted",
      };
      for (let attempt = 0; attempt < 8; attempt += 1) {
        attached = await prolog.query(`kb_attach('${escapeAtom(store)}')`);
        if (attached.success) break;
        await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
      }
      expect(attached.success, attached.error).toBe(true);
      const written = await prolog.query(goal);
      expect(written.success, written.error).toBe(true);
      const detached = await prolog.query("kb_detach");
      expect(detached.success, detached.error).toBe(true);
    } finally {
      await prolog.terminate();
    }
  }

  test(
    "explicit approved refresh repairs warm-cache RDF divergence",
    async () => {
      // Sanity: initial state has coordinates.
      expectCoordinates(await querySymbolEntity());

      // Simulate the historical partial-commit defect.
      await stripRdfCoordinates();
      expectNoCoordinates(await querySymbolEntity());

      // Plain sync is a no-op: source/artifact/cache still agree, so it must
      // not silently claim to fix anything.
      const plain = await runCliAsync(["sync"]);
      expect(plain.exitCode, plain.stderr).toBe(0);
      expect(plain.stdout).toContain("Imported 0");
      expectNoCoordinates(await querySymbolEntity());

      // The explicit approved refresh forces reassertion even though
      // normalized entity hashes match the cache.
      const repaired = await runCliAsync([
        "sync",
        "--refresh-symbol-coordinates",
      ]);
      expect(repaired.exitCode, repaired.stderr).toBe(0);
      expectCoordinates(await querySymbolEntity());

      // And the next plain sync is again a true no-op.
      const settled = await runCliAsync(["sync"]);
      expect(settled.stdout).toContain("Imported 0");
      expectCoordinates(await querySymbolEntity());
    },
    TEST_TIMEOUT_MS * 2,
  );

  test(
    "same-value source-first symbol upsert preserves generated coordinates",
    async () => {
      expectCoordinates(await querySymbolEntity());

      const upserted = await runCliAsync(
        ["upsert", "--input", "-"],
        JSON.stringify({
          type: "symbol",
          id: "SYM-AUTH",
          properties: {
            title: "authenticate",
            status: "active",
            sourceFile: "src/auth.ts",
          },
        }),
      );
      expect(upserted.exitCode, upserted.stderr).toBe(0);

      // Coordinates survive the partial payload in compiled state...
      expectCoordinates(await querySymbolEntity());

      // ...and never enter the authored manifest.
      const manifest = readFileSync(
        path.join(tmpDir, ".kb", "symbols.yaml"),
        "utf8",
      );
      expect(manifest).not.toContain("sourceLine");
      expect(manifest).not.toContain("coordinatesGeneratedAt");

      // A following plain sync remains a no-op (nothing diverged).
      const settled = await runCliAsync(["sync"]);
      expect(settled.stdout).toContain("Imported 0");
    },
    TEST_TIMEOUT_MS * 2,
  );

  test(
    "full refresh omits stale coordinates after a symbol rename",
    async () => {
      const manifestPath = path.join(tmpDir, ".kb", "symbols.yaml");
      writeFileSync(
        path.join(tmpDir, "src", "auth.ts"),
        "export function renamedAuthenticate() {\n  return true;\n}\n",
      );
      writeFileSync(
        manifestPath,
        `symbols:
  - id: SYM-AUTH
    title: authenticate
    sourceFile: src/auth.ts
    status: active
    sourceLine: 1
    sourceColumn: 16
    sourceEndLine: 1
    sourceEndColumn: 28
    coordinatesGeneratedAt: '2026-01-01T00:00:00.000Z'
`,
      );

      const refreshed = await runCliAsync([
        "sync",
        "--refresh-symbol-coordinates",
      ]);
      expect(refreshed.exitCode, refreshed.stderr).toBe(0);

      const artifact = parseYAML(
        readFileSync(
          path.join(tmpDir, ".kb", "symbol-coordinates.yaml"),
          "utf8",
        ),
      ) as { coordinates?: Record<string, unknown> };
      expect(artifact.coordinates?.["SYM-AUTH"]).toBeUndefined();
    },
    TEST_TIMEOUT_MS * 2,
  );

  test(
    "warm-cache sync delegates malformed manifest errors to extraction",
    async () => {
      writeFileSync(path.join(tmpDir, ".kb", "symbols.yaml"), "symbols: [\n");

      const result = await runCliAsync(["sync"]);
      const output = `${result.stdout}\n${result.stderr}`;
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain("Failed to extract");
      expect(output).toMatch(/yaml|manifest|unexpected end/i);
    },
    TEST_TIMEOUT_MS * 2,
  );
});
