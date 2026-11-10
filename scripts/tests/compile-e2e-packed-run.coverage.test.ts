import { afterEach, describe, expect, spyOn, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  hashPackedSources,
  main,
  packedCompileCacheArea,
  preparePackedCompilation,
  runIfInvoked,
} from "../compile-e2e-packed.mjs";

const SCRIPT = path.join(import.meta.dir, "..", "compile-e2e-packed.mjs");
const created: string[] = [];
const savedEnv = { ...process.env };
const savedCwd = process.cwd();

function tempDir(prefix: string): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), prefix));
  created.push(dir);
  return dir;
}

/** A repository whose tsc and brand-asset stage are small scripts. */
function fakeRepo(tscBody = "", stageBody = ""): string {
  const root = tempDir("kibi-compile-repo-");
  const packed = path.join(root, "documentation/tests/e2e/packed");
  mkdirSync(path.join(packed, "node_modules"), { recursive: true });
  mkdirSync(path.join(packed, "nested"), { recursive: true });
  mkdirSync(path.join(packed, ".compiled"));
  mkdirSync(path.join(packed, "dist"));
  writeFileSync(path.join(packed, "a.ts"), "export const a = 1;\n");
  writeFileSync(path.join(packed, "nested", "b.json"), "{}\n");
  writeFileSync(path.join(packed, "notes.md"), "ignored\n");
  writeFileSync(path.join(packed, "node_modules", "x.ts"), "ignored\n");
  writeFileSync(path.join(packed, "tsconfig.e2e.json"), "{}\n");
  mkdirSync(path.join(root, "node_modules/typescript/bin"), {
    recursive: true,
  });
  writeFileSync(
    path.join(root, "node_modules/typescript/bin/tsc"),
    `const fs = require("node:fs");
const path = require("node:path");
const out = process.argv[process.argv.indexOf("--outDir") + 1];
${tscBody}
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, "helpers.js"), "export {};\\n");
`,
  );
  mkdirSync(path.join(root, "scripts"));
  writeFileSync(
    path.join(root, "scripts/stage-packed-brand-assets.mjs"),
    `${stageBody}\n`,
  );
  return root;
}

afterEach(() => {
  process.chdir(savedCwd);
  for (const key of Object.keys(process.env)) delete process.env[key];
  Object.assign(process.env, savedEnv);
  process.exitCode = 0;
  for (const dir of created.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

describe("packed test compilation", () => {
  test("hashes only packed TypeScript and JSON inputs", () => {
    const root = fakeRepo();
    const before = hashPackedSources(root);
    expect(before).toMatch(/^[a-f0-9]{16}$/);
    const packed = path.join(root, "documentation/tests/e2e/packed");
    writeFileSync(path.join(packed, "notes.md"), "changed\n");
    writeFileSync(path.join(packed, "node_modules", "x.ts"), "changed\n");
    writeFileSync(path.join(packed, "dist", "y.ts"), "changed\n");
    expect(hashPackedSources(root)).toBe(before);
    writeFileSync(path.join(packed, "nested", "b.json"), "[]\n");
    expect(hashPackedSources(root)).not.toBe(before);
  });

  test("compiles into a private directory with the real runner", async () => {
    const root = fakeRepo();
    const result = await preparePackedCompilation({ repoRoot: root, env: {} });
    created.push(result.directory);
    expect(result.ownsDirectory).toBe(true);
    expect(result.reused).toBe(false);
    expect(
      readFileSync(path.join(result.directory, "helpers.js"), "utf8"),
    ).toBe("export {};\n");
    expect(
      readFileSync(
        path.join(result.directory, ".kibi-packed-compile-complete"),
        "utf8",
      ),
    ).toBe("ok\n");
  });

  test("a failing compile removes its private directory", async () => {
    const root = fakeRepo("process.exit(3);");
    const seen: string[] = [];
    await expect(
      preparePackedCompilation({
        repoRoot: root,
        env: {},
        run: async (command: string, args: string[]) => {
          seen.push(String(args.at(-1)));
          throw new Error(`${command} failed`);
        },
      }),
    ).rejects.toThrow("failed");
    expect(existsSync(String(seen[0]))).toBe(false);
    await expect(
      preparePackedCompilation({ repoRoot: root, env: {} }),
    ).rejects.toThrow(`${process.execPath} exited with code 3`);
  });

  test("a compiler killed by a signal is reported", async () => {
    const root = fakeRepo('process.kill(process.pid, "SIGTERM");');
    await expect(
      preparePackedCompilation({ repoRoot: root, env: {} }),
    ).rejects.toThrow(`${process.execPath} terminated by SIGTERM`);
  });

  test("a runner that cannot start rejects", async () => {
    const root = path.join(tempDir("kibi-compile-missing-"), "gone");
    const output = tempDir("kibi-compile-out-");
    await expect(
      preparePackedCompilation({
        repoRoot: root,
        env: { KIBI_E2E_COMPILED_DIR: output },
      }),
    ).rejects.toThrow();
  });

  test("an explicit output directory is compiled once and then reused", async () => {
    const root = fakeRepo();
    const env = { KIBI_E2E_COMPILED_DIR: " compiled " };
    const first = await preparePackedCompilation({ repoRoot: root, env });
    expect(first).toStrictEqual({
      directory: path.join(root, "compiled"),
      ownsDirectory: false,
      reused: false,
    });
    expect(
      await preparePackedCompilation({ repoRoot: root, env }),
    ).toStrictEqual({
      directory: path.join(root, "compiled"),
      ownsDirectory: false,
      reused: true,
    });
  });

  test("a cache key hashes the sources and publishes the cache area", async () => {
    const root = fakeRepo();
    const cache = tempDir("kibi-compile-cache-");
    const env = {
      KIBI_E2E_PACK_CACHE_KEY: "snap",
      KIBI_E2E_PACK_CACHE_ROOT: cache,
    };
    const area = packedCompileCacheArea(root, env, hashPackedSources(root));
    const result = await preparePackedCompilation({ repoRoot: root, env });
    expect(result).toStrictEqual({
      directory: area,
      ownsDirectory: false,
      reused: false,
    });
    expect(
      (await preparePackedCompilation({ repoRoot: root, env })).reused,
    ).toBe(true);
  });

  test("a failed cache compile leaves no scratch directory", async () => {
    const root = fakeRepo();
    const cache = tempDir("kibi-compile-cache-");
    const env = {
      KIBI_E2E_PACK_CACHE_KEY: "snap",
      KIBI_E2E_PACK_CACHE_ROOT: cache,
    };
    await expect(
      preparePackedCompilation({
        repoRoot: root,
        env,
        sourceHash: "h1",
        run: async () => {
          throw new Error("tsc broke");
        },
      }),
    ).rejects.toThrow("tsc broke");
    const area = String(packedCompileCacheArea(root, env, "h1"));
    expect(
      readdirSync(path.dirname(area)).filter((name) => name.includes(".tmp-")),
    ).toStrictEqual([]);
  });

  test("a concurrent publisher wins the cache area", async () => {
    const root = fakeRepo();
    const cache = tempDir("kibi-compile-cache-");
    const env = {
      KIBI_E2E_PACK_CACHE_KEY: "snap",
      KIBI_E2E_PACK_CACHE_ROOT: cache,
    };
    const area = String(packedCompileCacheArea(root, env, "h2"));
    const result = await preparePackedCompilation({
      repoRoot: root,
      env,
      sourceHash: "h2",
      run: async (_command: string, args: string[]) => {
        const out = String(args.at(-1));
        writeFileSync(path.join(out, "helpers.js"), "export {};\n");
        mkdirSync(area, { recursive: true });
        writeFileSync(path.join(area, "helpers.js"), "export {};\n");
        writeFileSync(path.join(area, ".kibi-packed-compile-complete"), "ok\n");
      },
    });
    expect(result).toStrictEqual({
      directory: area,
      ownsDirectory: false,
      reused: true,
    });
  });

  test("an unusable cache area falls back to the private scratch copy", async () => {
    const root = fakeRepo();
    const cache = tempDir("kibi-compile-cache-");
    const env = {
      KIBI_E2E_PACK_CACHE_KEY: "snap",
      KIBI_E2E_PACK_CACHE_ROOT: cache,
    };
    const area = String(packedCompileCacheArea(root, env, "h3"));
    mkdirSync(area, { recursive: true });
    writeFileSync(path.join(area, "partial"), "x\n");
    const result = await preparePackedCompilation({
      repoRoot: root,
      env,
      sourceHash: "h3",
      run: async (_command: string, args: string[]) => {
        writeFileSync(path.join(String(args.at(-1)), "helpers.js"), "");
      },
    });
    expect(result.ownsDirectory).toBe(true);
    expect(result.reused).toBe(false);
    expect(result.directory.startsWith(`${area}.tmp-`)).toBe(true);
  });
});

describe("compile-e2e-packed entry point", () => {
  test("main prints and exports the compiled directory", async () => {
    const root = fakeRepo();
    const githubEnv = path.join(tempDir("kibi-compile-env-"), "env");
    process.chdir(root);
    process.env.KIBI_E2E_COMPILED_DIR = "out";
    process.env.GITHUB_ENV = githubEnv;
    const log = spyOn(console, "log").mockImplementation(() => undefined);
    try {
      const prepared = await main();
      expect(prepared.directory).toBe(path.join(root, "out"));
      expect(log).toHaveBeenCalledWith(
        `KIBI_E2E_COMPILED_DIR=${path.join(root, "out")}`,
      );
    } finally {
      log.mockRestore();
    }
    expect(readFileSync(githubEnv, "utf8")).toBe(
      `KIBI_E2E_COMPILED_DIR=${path.join(root, "out")}\n`,
    );
  });

  test("runs only when invoked directly and reports failures", async () => {
    await runIfInvoked(undefined);
    await runIfInvoked(path.join(import.meta.dir, "other.mjs"));
    expect(process.exitCode).toBe(0);

    const root = fakeRepo("process.exit(5);");
    process.chdir(root);
    process.env.KIBI_E2E_COMPILED_DIR = "out";
    Reflect.deleteProperty(process.env, "GITHUB_ENV");
    const stderr: string[] = [];
    const write = spyOn(process.stderr, "write").mockImplementation((chunk) => {
      stderr.push(String(chunk));
      return true;
    });
    const log = spyOn(console, "log").mockImplementation(() => undefined);
    try {
      await runIfInvoked(SCRIPT);
      expect(process.exitCode).toBe(1);
      expect(stderr).toStrictEqual([
        `${process.execPath} exited with code 5\n`,
      ]);
      process.exitCode = 0;
      writeFileSync(
        path.join(root, "node_modules/typescript/bin/tsc"),
        `const fs = require("node:fs");\nconst out = require("node:path").join(process.cwd(), "out");\nfs.mkdirSync(out, { recursive: true });\nfs.writeFileSync(out + "/helpers.js", "");\n`,
      );
      await runIfInvoked(SCRIPT);
      expect(process.exitCode).toBe(0);
    } finally {
      write.mockRestore();
      log.mockRestore();
    }
  });
});
