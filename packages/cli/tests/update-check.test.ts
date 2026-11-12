import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Command } from "commander";
import {
  DEFAULT_NPM_REGISTRY,
  UPDATE_CACHE_FILE,
  UPDATE_REFRESH_ARGUMENT,
  type UpdateCache,
  type UpdateCommandContext,
  checkKibiUpdates,
  finishUpdateCheck,
  formatUpdateNotice,
  hasMachineOutput,
  isNewerRelease,
  parseLatestManifest,
  readUpdateCache,
  refreshUpdateCache,
  registryUrl,
  runUpdateRefreshEntrypoint,
  spawnUpdateRefresh,
  trackUpdateCommand,
  updateCachePath,
  updateCheckDue,
  updateCheckOffReason,
  updateInstallCommand,
  writeUpdateCache,
} from "../src/update-check.js";
import { LATEST_KB_SCHEMA_VERSION } from "../src/utils/schema-version.js";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse("2026-11-04T12:00:00.000Z");
/** An installed (not source-checkout) module path. */
const INSTALLED = "/opt/prefix/lib/node_modules/kibi-cli/dist/update-check.js";
const HUMAN: UpdateCommandContext = {
  commandPath: "search",
  machineOutput: false,
};

let stateDir: string;
let env: NodeJS.ProcessEnv;

beforeEach(() => {
  stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-update-check-"));
  env = { KIBI_TELEMETRY_DIR: stateDir };
});

afterEach(() => {
  fs.rmSync(stateDir, { recursive: true, force: true });
});

function manifestResponse(body: unknown, status = 200): typeof fetch {
  return (async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    })) as unknown as typeof fetch;
}

function finish(
  overrides: Partial<Parameters<typeof finishUpdateCheck>[0]> = {},
): { notice: string | null; written: string[]; refreshes: number } {
  const written: string[] = [];
  let refreshes = 0;
  const notice = finishUpdateCheck({
    context: HUMAN,
    currentVersion: "2.41.0",
    currentKbSchema: 13,
    env,
    stderrIsTTY: true,
    now: NOW,
    moduleFile: INSTALLED,
    write: (line) => written.push(line),
    startRefresh: () => {
      refreshes += 1;
    },
    installCommand: () => "npm install -g kibi-cli@latest",
    ...overrides,
  });
  return { notice, written, refreshes };
}

describe("kibi-cli package metadata", () => {
  test("declares the KB schema it writes for the update notice", () => {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(import.meta.dir, "..", "package.json"), "utf8"),
    ) as { kibi?: { kbSchema?: unknown } };
    expect(manifest.kibi?.kbSchema).toBe(LATEST_KB_SCHEMA_VERSION);
  });
});

describe("updateCheckOffReason", () => {
  test("is on for an installed CLI in a plain environment", () => {
    expect(updateCheckOffReason(env, INSTALLED)).toBeUndefined();
    expect(updateCheckOffReason({}, null)).toBeUndefined();
    // The default module is this source checkout.
    expect(updateCheckOffReason(env)).toBe("Kibi source checkout");
  });

  test.each([
    [{ KIBI_UPDATE_CHECK: "0" }, "KIBI_UPDATE_CHECK=0"],
    [{ KIBI_UPDATE_CHECK: "off" }, "KIBI_UPDATE_CHECK=0"],
    [{ NO_UPDATE_NOTIFIER: "1" }, "NO_UPDATE_NOTIFIER is set"],
    [{ CI: "true" }, "CI environment (CI)"],
    [{ GITHUB_ACTIONS: "true" }, "CI environment (GITHUB_ACTIONS)"],
    [{ NODE_ENV: "test" }, "test environment (NODE_ENV=test)"],
  ])("is off for %o", (extra, reason) => {
    expect(updateCheckOffReason({ ...env, ...extra }, INSTALLED)).toBe(reason);
  });

  test("stays on for explicit false-like CI values and other NODE_ENV values", () => {
    expect(
      updateCheckOffReason(
        {
          CI: "false",
          NODE_ENV: "production",
          KIBI_UPDATE_CHECK: "1",
          NO_UPDATE_NOTIFIER: " ",
        },
        INSTALLED,
      ),
    ).toBeUndefined();
  });

  test("is off when running from the Kibi source checkout", () => {
    expect(
      updateCheckOffReason(
        env,
        path.join(import.meta.dir, "..", "src", "update-check.ts"),
      ),
    ).toBe("Kibi source checkout");
  });
});

describe("isNewerRelease", () => {
  test.each([
    ["2.42.0", "2.41.0", true],
    ["3.0.0", "2.41.9", true],
    ["2.41.1", "2.41.0", true],
    ["2.41.0", "2.41.0", false],
    ["2.40.9", "2.41.0", false],
    ["1.99.99", "2.0.0", false],
    ["2.42.0-beta.1", "2.41.0", false],
    ["2.42.0", "2.41.0-dev.abc", false],
    ["latest", "2.41.0", false],
  ])("%s newer than %s is %s", (latest, current, expected) => {
    expect(isNewerRelease(latest, current)).toBe(expected);
  });
});

describe("updateCheckDue", () => {
  test("is due without a check, after a day, or with a bad timestamp", () => {
    expect(updateCheckDue({}, NOW)).toBe(true);
    expect(updateCheckDue({ checkedAt: "garbage" }, NOW)).toBe(true);
    expect(
      updateCheckDue({ checkedAt: new Date(NOW - DAY).toISOString() }, NOW),
    ).toBe(true);
    expect(
      updateCheckDue({ checkedAt: new Date(NOW + 60_000).toISOString() }, NOW),
    ).toBe(true);
    expect(
      updateCheckDue({ checkedAt: new Date(NOW - DAY + 1).toISOString() }, NOW),
    ).toBe(false);
    expect(
      updateCheckDue({ checkedAt: new Date(NOW).toISOString() }, NOW),
    ).toBe(false);
  });
});

describe("updateInstallCommand", () => {
  const exists = (files: string[]) => (file: string) =>
    files.includes(file.replaceAll("\\", "/"));

  test("uses npx for an npx cache and bun for a bun global", () => {
    expect(
      updateInstallCommand(
        "/home/u/.npm/_npx/abc/node_modules/kibi-cli/dist/x.js",
        "/w",
      ),
    ).toBe("npx kibi-cli@latest");
    expect(
      updateInstallCommand(
        "/home/u/.bun/install/global/node_modules/kibi-cli/dist/x.js",
        "/w",
      ),
    ).toBe("bun add -g kibi-cli@latest");
  });

  test.each([
    ["bun.lock", "bun add -d kibi-cli@latest"],
    ["bun.lockb", "bun add -d kibi-cli@latest"],
    ["pnpm-lock.yaml", "pnpm add -D kibi-cli@latest"],
    ["yarn.lock", "yarn add -D kibi-cli@latest"],
    ["package-lock.json", "npm install -D kibi-cli@latest"],
  ])("uses the project's package manager for %s", (lockfile, command) => {
    expect(
      updateInstallCommand(
        "/repo/node_modules/kibi-cli/dist/update-check.js",
        "/repo/packages/app",
        exists([`/repo/${lockfile}`]),
      ),
    ).toBe(command);
  });

  test("falls back to a global npm install", () => {
    expect(updateInstallCommand(INSTALLED, "/repo", exists([]))).toBe(
      "npm install -g kibi-cli@latest",
    );
    // A project install used from outside that project.
    expect(
      updateInstallCommand(
        "/repo/node_modules/kibi-cli/dist/x.js",
        "/elsewhere",
        exists(["/repo/bun.lock"]),
      ),
    ).toBe("npm install -g kibi-cli@latest");
    expect(
      updateInstallCommand(
        "/repo/node_modules/kibi-cli/dist/x.js",
        "/repository",
        exists(["/repo/bun.lock"]),
      ),
    ).toBe("npm install -g kibi-cli@latest");
    expect(updateInstallCommand(undefined, "/repo", exists([]))).toBe(
      "npm install -g kibi-cli@latest",
    );
  });

  test("reads lockfiles from disk by default", () => {
    const project = path.join(stateDir, "project");
    const moduleFile = path.join(
      project,
      "node_modules",
      "kibi-cli",
      "dist",
      "x.js",
    );
    fs.mkdirSync(path.dirname(moduleFile), { recursive: true });
    fs.mkdirSync(path.join(project, "bun.lock"));
    fs.writeFileSync(path.join(project, "yarn.lock"), "");
    // A directory named like a lockfile is not a lockfile.
    expect(updateInstallCommand(moduleFile, project)).toBe(
      "yarn add -D kibi-cli@latest",
    );
  });

  test("handles Windows paths and the project root as cwd", () => {
    expect(
      updateInstallCommand(
        "C:\\repo\\node_modules\\kibi-cli\\dist\\x.js",
        "C:\\repo",
        exists(["C:/repo/pnpm-lock.yaml"]),
      ),
    ).toBe("pnpm add -D kibi-cli@latest");
  });
});

describe("formatUpdateNotice", () => {
  const base = {
    currentVersion: "2.41.0",
    currentKbSchema: 13,
    installCommand: "npm install -g kibi-cli@latest",
  };

  test("is one line naming both versions and the update command", () => {
    const notice = formatUpdateNotice({
      ...base,
      cache: { latest: "2.42.0", latestKbSchema: 13 },
    });
    expect(notice).toBe(
      "Kibi update available: kibi-cli 2.41.0 -> 2.42.0. Update with 'npm install -g kibi-cli@latest'. (KIBI_UPDATE_CHECK=0 turns this off)",
    );
    expect(notice).not.toContain("\n");
  });

  test("calls out a newer KB schema with the migrate step", () => {
    expect(
      formatUpdateNotice({
        ...base,
        cache: { latest: "3.0.0", latestKbSchema: 14 },
      }),
    ).toContain(
      "It moves the KB from schema 13 to 14; run 'kibi migrate' after updating.",
    );
  });

  test("is null when nothing newer is cached", () => {
    expect(formatUpdateNotice({ ...base, cache: {} })).toBeNull();
    expect(
      formatUpdateNotice({ ...base, cache: { latest: "2.41.0" } }),
    ).toBeNull();
  });
});

describe("registryUrl", () => {
  test("defaults to the public npm registry", () => {
    expect(registryUrl({})).toBe(`${DEFAULT_NPM_REGISTRY}/kibi-cli/latest`);
  });

  test("honours KIBI_UPDATE_REGISTRY, then the npm registry config", () => {
    expect(
      registryUrl({
        KIBI_UPDATE_REGISTRY: "https://mirror.example/npm/",
        npm_config_registry: "https://other.example",
      }),
    ).toBe("https://mirror.example/npm/kibi-cli/latest");
    expect(registryUrl({ npm_config_registry: "https://a.example//" })).toBe(
      "https://a.example/kibi-cli/latest",
    );
    expect(registryUrl({ NPM_CONFIG_REGISTRY: "https://b.example" })).toBe(
      "https://b.example/kibi-cli/latest",
    );
  });
});

describe("parseLatestManifest", () => {
  test("reads the version and the declared KB schema", () => {
    expect(
      parseLatestManifest({ version: "2.42.0", kibi: { kbSchema: 14 } }),
    ).toEqual({
      latest: "2.42.0",
      latestKbSchema: 14,
    });
  });

  test("omits a missing or malformed KB schema", () => {
    expect(parseLatestManifest({ version: "2.42.0" })).toEqual({
      latest: "2.42.0",
      latestKbSchema: undefined,
    });
    expect(parseLatestManifest({ version: "2.42.0", kibi: null })).toEqual({
      latest: "2.42.0",
      latestKbSchema: undefined,
    });
    expect(
      parseLatestManifest({ version: "2.42.0", kibi: { kbSchema: "14" } }),
    ).toEqual({
      latest: "2.42.0",
      latestKbSchema: undefined,
    });
    expect(
      parseLatestManifest({ version: "2.42.0", kibi: { kbSchema: 1.5 } }),
    ).toEqual({
      latest: "2.42.0",
      latestKbSchema: undefined,
    });
  });

  test("rejects manifests without a release version", () => {
    expect(parseLatestManifest(null)).toBeUndefined();
    expect(parseLatestManifest("2.42.0")).toBeUndefined();
    expect(parseLatestManifest({})).toBeUndefined();
    expect(parseLatestManifest({ version: "2.42.0-rc.1" })).toBeUndefined();
  });
});

describe("update cache", () => {
  test("round-trips through the per-user state directory", () => {
    expect(updateCachePath(env)).toBe(path.join(stateDir, UPDATE_CACHE_FILE));
    expect(readUpdateCache(env)).toEqual({});
    writeUpdateCache({ latest: "2.42.0" }, env);
    expect(readUpdateCache(env)).toEqual({ latest: "2.42.0" });
    expect(fs.readdirSync(stateDir)).toEqual([UPDATE_CACHE_FILE]);
  });

  test("reads a damaged or non-object cache as empty", () => {
    fs.writeFileSync(updateCachePath(env), "{torn");
    expect(readUpdateCache(env)).toEqual({});
    fs.writeFileSync(updateCachePath(env), "[1]");
    expect(readUpdateCache(env)).toEqual({});
    fs.writeFileSync(updateCachePath(env), "null");
    expect(readUpdateCache(env)).toEqual({});
  });
});

describe("refreshUpdateCache", () => {
  test("stores the registry answer and keeps notice bookkeeping", async () => {
    writeUpdateCache(
      { notifiedAt: "2026-11-01T00:00:00.000Z", notifiedVersion: "2.41.5" },
      env,
    );
    const requested: string[] = [];
    const headers: unknown[] = [];
    const fetchImpl = (async (url: string, init: RequestInit) => {
      requested.push(url);
      headers.push(init.headers);
      return new Response(
        JSON.stringify({ version: "2.42.0", kibi: { kbSchema: 14 } }),
      );
    }) as unknown as typeof fetch;
    const cache = await refreshUpdateCache(env, { fetchImpl, now: NOW });
    expect(requested).toEqual(["https://registry.npmjs.org/kibi-cli/latest"]);
    expect(headers).toEqual([{ accept: "application/json" }]);
    const expected: UpdateCache = {
      notifiedAt: "2026-11-01T00:00:00.000Z",
      notifiedVersion: "2.41.5",
      checkedAt: new Date(NOW).toISOString(),
      latest: "2.42.0",
      latestKbSchema: 14,
    };
    expect(cache).toEqual(expected);
    expect(readUpdateCache(env)).toEqual(expected);
  });

  test("drops a stale KB schema when the new latest declares none", async () => {
    writeUpdateCache({ latest: "2.42.0", latestKbSchema: 14 }, env);
    const cache = await refreshUpdateCache(env, {
      fetchImpl: manifestResponse({ version: "2.43.0" }),
      now: NOW,
    });
    expect(cache.latest).toBe("2.43.0");
    expect(cache.latestKbSchema).toBeUndefined();
    expect(readUpdateCache(env)).not.toHaveProperty("latestKbSchema");
  });

  test("keeps the previous answer when the registry fails", async () => {
    writeUpdateCache({ latest: "2.42.0" }, env);
    for (const fetchImpl of [
      manifestResponse({ version: "9.9.9" }, 500),
      manifestResponse({ nope: true }),
      (async () => {
        throw new Error("offline");
      }) as unknown as typeof fetch,
    ]) {
      const cache = await refreshUpdateCache(env, { fetchImpl, now: NOW });
      expect(cache).toEqual({
        latest: "2.42.0",
        checkedAt: new Date(NOW).toISOString(),
      });
    }
  });

  test("gives up after the timeout", async () => {
    const fetchImpl = ((_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () =>
          reject(new Error("aborted")),
        );
      })) as unknown as typeof fetch;
    const started = Date.now();
    const cache = await refreshUpdateCache(env, {
      fetchImpl,
      timeoutMs: 10,
      now: NOW,
    });
    expect(Date.now() - started).toBeLessThan(1000);
    expect(cache).toEqual({ checkedAt: new Date(NOW).toISOString() });
  });

  test("never throws when the state directory is unwritable", async () => {
    const file = path.join(stateDir, "not-a-directory");
    fs.writeFileSync(file, "");
    const cache = await refreshUpdateCache(
      { KIBI_TELEMETRY_DIR: file },
      { fetchImpl: manifestResponse({ version: "2.42.0" }), now: NOW },
    );
    expect(cache.latest).toBe("2.42.0");
  });
});

describe("finishUpdateCheck", () => {
  test("prints the cached newer version once, then waits a day", () => {
    writeUpdateCache(
      { checkedAt: new Date(NOW).toISOString(), latest: "2.42.0" },
      env,
    );
    const first = finish();
    expect(first.written).toEqual([first.notice as string]);
    expect(first.notice).toContain("kibi-cli 2.41.0 -> 2.42.0");
    expect(first.refreshes).toBe(0);
    expect(readUpdateCache(env)).toMatchObject({
      notifiedAt: new Date(NOW).toISOString(),
      notifiedVersion: "2.42.0",
    });

    expect(finish({ now: NOW + DAY - 1 }).written).toEqual([]);
    expect(finish({ now: NOW + DAY }).written).toHaveLength(1);
  });

  test("prints again at once when an even newer version appears", () => {
    writeUpdateCache(
      {
        checkedAt: new Date(NOW).toISOString(),
        latest: "2.43.0",
        notifiedAt: new Date(NOW).toISOString(),
        notifiedVersion: "2.42.0",
      },
      env,
    );
    expect(finish().notice).toContain("-> 2.43.0");
  });

  test("starts one background refresh when the check is due", () => {
    const first = finish();
    expect(first.refreshes).toBe(1);
    expect(first.notice).toBeNull();
    expect(readUpdateCache(env).checkedAt).toBe(new Date(NOW).toISOString());
    // The recorded attempt stops the next commands from starting another.
    expect(finish({ now: NOW + 1000 }).refreshes).toBe(0);
    expect(finish({ now: NOW + DAY }).refreshes).toBe(1);
  });

  test("stays quiet when up to date", () => {
    writeUpdateCache(
      { checkedAt: new Date(NOW).toISOString(), latest: "2.41.0" },
      env,
    );
    const result = finish();
    expect(result.notice).toBeNull();
    expect(result.written).toEqual([]);
    expect(readUpdateCache(env)).not.toHaveProperty("notifiedAt");
  });

  test.each<[string, Partial<Parameters<typeof finishUpdateCheck>[0]>]>([
    [
      "no command ran (--help, --version)",
      { context: { commandPath: undefined, machineOutput: false } },
    ],
    [
      "the engine daemon",
      { context: { commandPath: "engine status", machineOutput: false } },
    ],
    [
      "the git merge driver",
      { context: { commandPath: "merge-driver", machineOutput: false } },
    ],
    [
      "JSON output",
      { context: { commandPath: "search", machineOutput: true } },
    ],
    ["stderr is not a terminal (agents, hooks, pipes)", { stderrIsTTY: false }],
    [
      "the opt-out variable",
      { env: { KIBI_TELEMETRY_DIR: "", KIBI_UPDATE_CHECK: "0" } },
    ],
    ["a dev build", { currentVersion: "2.41.0-dev.abc" }],
  ])("does nothing for %s", (_label, overrides) => {
    writeUpdateCache({ latest: "2.42.0" }, env);
    const result = finish({
      ...overrides,
      ...(overrides.env
        ? { env: { ...overrides.env, KIBI_TELEMETRY_DIR: stateDir } }
        : {}),
    });
    expect(result).toEqual({ notice: null, written: [], refreshes: 0 });
    expect(readUpdateCache(env)).toEqual({ latest: "2.42.0" });
  });

  test("stays quiet when the notice cannot be recorded", () => {
    writeUpdateCache(
      { checkedAt: new Date(NOW).toISOString(), latest: "2.42.0" },
      env,
    );
    // A directory where the atomic write's temp file goes makes writes fail.
    fs.mkdirSync(`${updateCachePath(env)}.${process.pid}.tmp`);
    expect(finish()).toEqual({ notice: null, written: [], refreshes: 0 });
  });

  test("stays quiet without a writable state directory", () => {
    const file = path.join(stateDir, "not-a-directory");
    fs.writeFileSync(file, "");
    const result = finish({ env: { KIBI_TELEMETRY_DIR: file } });
    expect(result).toEqual({ notice: null, written: [], refreshes: 0 });
  });

  test("reads the TTY, writer and install command from the process by default", () => {
    writeUpdateCache(
      { checkedAt: new Date(NOW).toISOString(), latest: "2.42.0" },
      env,
    );
    const original = process.stderr.write;
    const lines: string[] = [];
    const tty = process.stderr.isTTY;
    process.stderr.isTTY = true;
    process.stderr.write = ((chunk: string) => {
      lines.push(chunk);
      return true;
    }) as typeof process.stderr.write;
    try {
      const notice = finishUpdateCheck({
        context: HUMAN,
        currentVersion: "2.41.0",
        currentKbSchema: 13,
        env,
        now: NOW,
        moduleFile: INSTALLED,
      });
      expect(notice).toContain("npm install -g kibi-cli@latest");
      expect(lines).toEqual([`${notice}\n`]);
    } finally {
      process.stderr.write = original;
      process.stderr.isTTY = tty;
    }
  });
});

describe("trackUpdateCommand", () => {
  async function run(argv: string[]): Promise<UpdateCommandContext> {
    const program = new Command().exitOverride();
    program
      .command("search [query]")
      .option("--format <format>")
      .action(() => {});
    program
      .command("prove")
      .option("--json")
      .action(() => {});
    program
      .command("storage")
      .command("compact")
      .option("--input <file>")
      .action(() => {});
    const context = trackUpdateCommand(program);
    expect(context()).toEqual({ commandPath: undefined, machineOutput: false });
    await program.parseAsync(argv, { from: "user" });
    return context();
  }

  test("names the command and whether it prints JSON", async () => {
    expect(await run(["search", "x"])).toEqual({
      commandPath: "search",
      machineOutput: false,
    });
    expect(await run(["search", "x", "--format", "json"])).toEqual({
      commandPath: "search",
      machineOutput: true,
    });
    expect(await run(["prove", "--json"])).toEqual({
      commandPath: "prove",
      machineOutput: true,
    });
    expect(await run(["storage", "compact", "--input", "-"])).toEqual({
      commandPath: "storage compact",
      machineOutput: true,
    });
  });

  test("hasMachineOutput", () => {
    expect(hasMachineOutput({})).toBe(false);
    expect(hasMachineOutput({ json: false, format: "table" })).toBe(false);
    expect(hasMachineOutput({ json: true })).toBe(true);
    expect(hasMachineOutput({ format: "json" })).toBe(true);
    expect(hasMachineOutput({ input: "-" })).toBe(true);
  });
});

describe("checkKibiUpdates (kibi doctor)", () => {
  const doctor = (
    overrides: Partial<Parameters<typeof checkKibiUpdates>[0]> = {},
  ) =>
    checkKibiUpdates({
      currentVersion: "2.41.0",
      currentKbSchema: 13,
      env,
      now: NOW,
      moduleFile: INSTALLED,
      installCommand: () => "npm install -g kibi-cli@latest",
      ...overrides,
    });

  test("reports why the check is off without touching the network", async () => {
    let called = false;
    const result = await doctor({
      env: { ...env, CI: "1" },
      fetchImpl: (async () => {
        called = true;
        throw new Error();
      }) as unknown as typeof fetch,
    });
    expect(called).toBe(false);
    expect(result).toEqual({
      passed: true,
      message: "Update check off: CI environment (CI)",
      details: {
        enabled: false,
        reason: "CI environment (CI)",
        current: "2.41.0",
      },
    });
  });

  test("warns about a newer version with the update command", async () => {
    const result = await doctor({
      fetchImpl: manifestResponse({ version: "2.42.0" }),
    });
    expect(result).toEqual({
      passed: true,
      warning: true,
      message: "kibi-cli 2.42.0 is available; 2.41.0 is installed",
      remediation:
        "Run 'npm install -g kibi-cli@latest', and update kibi-mcp and the other Kibi packages to the same release.",
      details: {
        enabled: true,
        current: "2.41.0",
        latest: "2.42.0",
        latestKbSchema: null,
        checkedAt: new Date(NOW).toISOString(),
      },
    });
  });

  test("adds the migrate step for a newer KB schema", async () => {
    const result = await doctor({
      fetchImpl: manifestResponse({ version: "3.0.0", kibi: { kbSchema: 14 } }),
    });
    expect(result.message).toBe(
      "kibi-cli 3.0.0 is available; 2.41.0 is installed (KB schema 13 -> 14)",
    );
    expect(result.remediation).toContain("then run 'kibi migrate'");
  });

  test("uses a fresh cache instead of the network", async () => {
    writeUpdateCache(
      { checkedAt: new Date(NOW - 1000).toISOString(), latest: "2.41.0" },
      env,
    );
    let fetched = 0;
    const result = await doctor({
      fetchImpl: (async () => {
        fetched += 1;
        throw new Error("must not fetch");
      }) as unknown as typeof fetch,
    });
    expect(fetched).toBe(0);
    expect(result).toEqual({
      passed: true,
      message: "kibi-cli 2.41.0 is up to date (latest 2.41.0)",
      details: {
        enabled: true,
        current: "2.41.0",
        latest: "2.41.0",
        latestKbSchema: null,
        checkedAt: new Date(NOW - 1000).toISOString(),
      },
    });
    expect(result.message).toBe(
      "kibi-cli 2.41.0 is up to date (latest 2.41.0)",
    );
  });

  test("asks the registry when a fresh cache has no answer yet", async () => {
    writeUpdateCache({ checkedAt: new Date(NOW - 1000).toISOString() }, env);
    const result = await doctor({
      fetchImpl: manifestResponse({ version: "2.41.0" }),
    });
    expect(result.details.latest).toBe("2.41.0");
  });

  test("names the update command for this install by default", async () => {
    const result = await checkKibiUpdates({
      currentVersion: "2.41.0",
      currentKbSchema: 13,
      env,
      now: NOW,
      moduleFile: INSTALLED,
      fetchImpl: manifestResponse({ version: "2.42.0" }),
    });
    expect(result.remediation).toContain("'npm install -g kibi-cli@latest'");
  });

  test("is off for the source checkout by default", async () => {
    const result = await checkKibiUpdates({
      currentVersion: "2.41.0",
      currentKbSchema: 13,
      env,
    });
    expect(result.message).toBe("Update check off: Kibi source checkout");
  });

  test("is neither a failure nor a warning offline", async () => {
    const result = await doctor({
      fetchImpl: (async () => {
        throw new Error("offline");
      }) as unknown as typeof fetch,
    });
    expect(result).toEqual({
      passed: true,
      message: "Could not reach the npm registry to check for a newer kibi-cli",
      details: {
        enabled: true,
        current: "2.41.0",
        latest: null,
        latestKbSchema: null,
        checkedAt: new Date(NOW).toISOString(),
      },
    });
  });

  test("names no schema move when the latest writes the same KB schema", async () => {
    const result = await doctor({
      fetchImpl: manifestResponse({
        version: "2.42.0",
        kibi: { kbSchema: 13 },
      }),
    });
    expect(result.message).toBe(
      "kibi-cli 2.42.0 is available; 2.41.0 is installed",
    );
    expect(result.remediation).not.toContain("kibi migrate");
  });
});

describe("edge cases", () => {
  test.each([" OFF ", "No", "FALSE", "0"])(
    "KIBI_UPDATE_CHECK=%p turns the check off",
    (value) => {
      expect(
        updateCheckOffReason({ KIBI_UPDATE_CHECK: value }, INSTALLED),
      ).toBe("KIBI_UPDATE_CHECK=0");
    },
  );

  test.each(["0", "false", "no", "off", " Off ", "   "])(
    "CI=%p does not mark a CI run",
    (value) => {
      expect(updateCheckOffReason({ CI: value }, INSTALLED)).toBeUndefined();
    },
  );

  test("CI with any other value marks a CI run", () => {
    expect(updateCheckOffReason({ CI: "yes" }, INSTALLED)).toBe(
      "CI environment (CI)",
    );
  });

  test("compares every version part numerically and ignores padding", () => {
    expect(isNewerRelease("12.0.0", "2.0.0")).toBe(true);
    expect(isNewerRelease("2.0.10", "2.0.9")).toBe(true);
    expect(isNewerRelease("2.10.0", "2.9.9")).toBe(true);
    expect(isNewerRelease(" 2.42.0 ", "2.41.0")).toBe(true);
    expect(isNewerRelease("x2.42.0", "2.41.0")).toBe(false);
    expect(isNewerRelease("2.42.0", "2.41.0x")).toBe(false);
  });

  test("skips blank registry settings", () => {
    expect(
      registryUrl({
        KIBI_UPDATE_REGISTRY: " ",
        npm_config_registry: " ",
        NPM_CONFIG_REGISTRY: " https://c.example ",
      }),
    ).toBe("https://c.example/kibi-cli/latest");
  });

  test("reads a cache that holds a JSON scalar as empty", () => {
    fs.writeFileSync(updateCachePath(env), "5");
    expect(readUpdateCache(env)).toEqual({});
  });

  test("a module outside any node_modules updates globally", () => {
    expect(
      updateInstallCommand("/usr/local/bin/x.js", "/usr/local", () => true),
    ).toBe("npm install -g kibi-cli@latest");
  });

  test("the telemetry command never shows the notice", () => {
    writeUpdateCache(
      { checkedAt: new Date(NOW).toISOString(), latest: "2.42.0" },
      env,
    );
    const written: string[] = [];
    const notice = finishUpdateCheck({
      context: { commandPath: "telemetry status", machineOutput: false },
      currentVersion: "2.41.0",
      currentKbSchema: 13,
      env,
      stderrIsTTY: true,
      now: NOW,
      moduleFile: INSTALLED,
      write: (line) => written.push(line),
    });
    expect(notice).toBeNull();
    expect(written).toEqual([]);
  });

  test("stays quiet by default when stderr is not a terminal", () => {
    writeUpdateCache(
      { checkedAt: new Date(NOW).toISOString(), latest: "2.42.0" },
      env,
    );
    const tty = process.stderr.isTTY;
    process.stderr.isTTY = false;
    try {
      expect(
        finishUpdateCheck({
          context: { commandPath: "search", machineOutput: false },
          currentVersion: "2.41.0",
          currentKbSchema: 13,
          env,
          now: NOW,
          moduleFile: INSTALLED,
          write: () => {
            throw new Error("must not write");
          },
        }),
      ).toBeNull();
    } finally {
      process.stderr.isTTY = tty;
    }
  });
});

describe("background refresh process", () => {
  test("fetches the latest version from the registry and caches it", async () => {
    const server = Bun.serve({
      port: 0,
      fetch(request) {
        expect(new URL(request.url).pathname).toBe("/kibi-cli/latest");
        return Response.json({ version: "2.50.0", kibi: { kbSchema: 15 } });
      },
    });
    try {
      const childEnv = {
        ...process.env,
        KIBI_TELEMETRY_DIR: stateDir,
        KIBI_UPDATE_REGISTRY: `http://127.0.0.1:${server.port}`,
      };
      spawnUpdateRefresh(childEnv);
      const deadline = Date.now() + 10_000;
      while (
        readUpdateCache(env).latest === undefined &&
        Date.now() < deadline
      ) {
        await Bun.sleep(50);
      }
      expect(readUpdateCache(env)).toMatchObject({
        latest: "2.50.0",
        latestKbSchema: 15,
      });
    } finally {
      server.stop(true);
    }
  });
});

describe("runUpdateRefreshEntrypoint", () => {
  const moduleFile = path.join(import.meta.dir, "..", "src", "update-check.ts");

  test("does nothing unless this module runs with the refresh argument", async () => {
    let fetched = 0;
    const original = globalThis.fetch;
    globalThis.fetch = (async () => {
      fetched += 1;
      return new Response("{}");
    }) as unknown as typeof fetch;
    try {
      expect(await runUpdateRefreshEntrypoint(["node", moduleFile], env)).toBe(
        false,
      );
      expect(
        await runUpdateRefreshEntrypoint(
          ["node", "/other.js", UPDATE_REFRESH_ARGUMENT],
          env,
        ),
      ).toBe(false);
      expect(await runUpdateRefreshEntrypoint(undefined, env)).toBe(false);
    } finally {
      globalThis.fetch = original;
    }
    expect(fetched).toBe(0);
    expect(fs.readdirSync(stateDir)).toEqual([]);
  });

  test("the refresh argument cannot be mistaken for a Kibi command", () => {
    expect(UPDATE_REFRESH_ARGUMENT).toBe("--kibi-update-refresh");
  });

  test("refreshes the cache when it is the refresh process", async () => {
    const server = Bun.serve({
      port: 0,
      fetch: () => Response.json({ version: "2.60.0" }),
    });
    try {
      const refreshed = await runUpdateRefreshEntrypoint(
        ["node", moduleFile, UPDATE_REFRESH_ARGUMENT],
        { ...env, KIBI_UPDATE_REGISTRY: `http://127.0.0.1:${server.port}` },
      );
      expect(refreshed).toBe(true);
      expect(readUpdateCache(env).latest).toBe("2.60.0");
    } finally {
      server.stop(true);
    }
  });
});
