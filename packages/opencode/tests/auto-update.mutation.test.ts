import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import {
  type AutoUpdateRunnerDeps,
  activeInstallWorkspace,
  createAutoUpdateRunner,
  findKibiOpencodePluginEntry,
  findPackageJsonUp,
  getCachedPluginVersion,
  getLatestPluginVersion,
  invalidateKibiOpencodePackage,
  notifyAutoUpdate,
  runKibiOpencodeAutoUpdate,
} from "../src/auto-update.js";
import * as logger from "../src/logger.js";

const roots: string[] = [];
const realPlatform = process.platform;
const savedEnv = {
  APPDATA: process.env.APPDATA,
  LOCALAPPDATA: process.env.LOCALAPPDATA,
  XDG_CACHE_HOME: process.env.XDG_CACHE_HOME,
};
let home = "";
let homedir: ReturnType<typeof spyOn>;

function tmp(): string {
  const root = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), "kibi-au-mut-")),
  );
  roots.push(root);
  return root;
}

function put(file: string, content: string): string {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  return file;
}

function setPlatform(platform: NodeJS.Platform): void {
  Object.defineProperty(process, "platform", { value: platform });
}

function restoreEnv(name: keyof typeof savedEnv): void {
  const value = savedEnv[name];
  if (value === undefined) Reflect.deleteProperty(process.env, name);
  else process.env[name] = value;
}

function captureLogs() {
  const bodies: Array<Record<string, unknown>> = [];
  logger.setClient({
    app: {
      log: async ({ body }: { body: Record<string, unknown> }) => {
        bodies.push(body);
      },
    },
  } as never);
  return bodies;
}

beforeEach(() => {
  home = tmp();
  homedir = spyOn(os, "homedir").mockImplementation(() => home);
  for (const name of Object.keys(savedEnv) as Array<keyof typeof savedEnv>) {
    Reflect.deleteProperty(process.env, name);
  }
});

afterEach(() => {
  homedir.mockRestore();
  setPlatform(realPlatform);
  for (const name of Object.keys(savedEnv) as Array<keyof typeof savedEnv>) {
    restoreEnv(name);
  }
  logger.resetClient();
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("findKibiOpencodePluginEntry", () => {
  test("non-string plugin entries are passed over", () => {
    const dir = tmp();
    put(
      path.join(dir, "opencode.json"),
      JSON.stringify({ plugin: [7, { name: "x" }, "kibi-opencode"] }),
    );
    expect(findKibiOpencodePluginEntry(dir)).toEqual({
      entry: "kibi-opencode",
      isPinned: false,
      requestedVersion: null,
      configPath: path.join(dir, "opencode.json"),
    });
  });

  test.each([
    ["opencode.json"],
    ["opencode.jsonc"],
    [".opencode/opencode.json"],
    [".opencode/opencode.jsonc"],
  ])("a project config at %s is read", (rel) => {
    const dir = tmp();
    const file = put(
      path.join(dir, rel),
      JSON.stringify({ plugin: ["kibi-opencode"] }),
    );
    expect(findKibiOpencodePluginEntry(dir)?.configPath).toBe(file);
  });

  test.each([["opencode.json"], ["opencode.jsonc"]])(
    "a home config at %s is read",
    (name) => {
      const file = put(
        path.join(home, ".config", "opencode", name),
        JSON.stringify({ plugin: ["kibi-opencode"] }),
      );
      expect(findKibiOpencodePluginEntry(tmp())?.configPath).toBe(file);
    },
  );

  test("project configs win over home ones, in order", () => {
    const dir = tmp();
    put(
      path.join(home, ".config", "opencode", "opencode.json"),
      JSON.stringify({ plugin: ["kibi-opencode"] }),
    );
    const second = put(
      path.join(dir, ".opencode", "opencode.json"),
      JSON.stringify({ plugin: ["kibi-opencode"] }),
    );
    put(path.join(dir, "opencode.json"), JSON.stringify({ plugin: "x" }));
    expect(findKibiOpencodePluginEntry(dir)?.configPath).toBe(second);
  });

  test("comments are stripped from JSONC configs", () => {
    const dir = tmp();
    put(
      path.join(dir, "opencode.jsonc"),
      [
        "/* a block comment",
        "   over lines: with } and stuff */ {",
        '  "plugin": ["kibi-opencode@1.2.3"], // the plugin',
        '  "url": "https://example.test/x"',
        "}",
      ].join("\n"),
    );
    expect(findKibiOpencodePluginEntry(dir)?.requestedVersion).toBe("1.2.3");
  });

  test("a malformed config is logged and skipped", () => {
    const bodies = captureLogs();
    const dir = tmp();
    put(path.join(dir, "opencode.json"), "{ nope");
    expect(findKibiOpencodePluginEntry(dir)).toBeNull();
    expect(bodies).toEqual([
      {
        service: "kibi-opencode",
        level: "info",
        message: "auto-update: failed to parse JSON",
        error: expect.stringContaining("JSON"),
      },
    ]);
  });

  test("a requested version is trimmed", () => {
    const dir = tmp();
    put(
      path.join(dir, "opencode.json"),
      JSON.stringify({ plugin: ["kibi-opencode@ beta "] }),
    );
    expect(findKibiOpencodePluginEntry(dir)).toMatchObject({
      requestedVersion: "beta",
      isPinned: false,
    });
  });

  test("only file:// entries naming the package are local pins", () => {
    const dir = tmp();
    put(
      path.join(dir, "opencode.json"),
      JSON.stringify({
        plugin: [
          "other-kibi-opencode-fork",
          "file:///x/other",
          "kibi-opencode",
        ],
      }),
    );
    expect(findKibiOpencodePluginEntry(dir)?.entry).toBe("kibi-opencode");
    put(
      path.join(dir, "opencode.json"),
      JSON.stringify({ plugin: ["file:///x/kibi-opencode"] }),
    );
    expect(findKibiOpencodePluginEntry(dir)).toMatchObject({
      isPinned: true,
      requestedVersion: null,
    });
  });

  test.each([
    ["1.2.3", true],
    ["10.20.30", true],
    ["1.2.3-rc.1", true],
    ["1.2.3-alpha-1.beta-2", true],
    ["1.2.3+build.5", true],
    ["1.2.3-rc.1+build-7.x9", true],
    ["1.2.3-a.b.c", true],
    ["1.2.3+a.b.c", true],
    ["1.2", false],
    ["^1.2.3", false],
    ["1.2.3x", false],
    ["v1.2.3", false],
    ["1.2.3-", false],
    ["1.2.3-a..b", false],
    ["1.2.3-a_b", false],
    ["1.2.3+", false],
    ["1.2.3+a..b", false],
    ["1.2.3+a_b", false],
    ["latest", false],
  ])("@%s pinned: %p", (version, pinned) => {
    const dir = tmp();
    put(
      path.join(dir, "opencode.json"),
      JSON.stringify({ plugin: [`kibi-opencode@${version}`] }),
    );
    expect(findKibiOpencodePluginEntry(dir)?.isPinned).toBe(pinned);
  });
});

function cachedPackage(dir: string, version: unknown): void {
  put(
    path.join(dir, "node_modules", "kibi-opencode", "package.json"),
    JSON.stringify({ version }),
  );
}

describe("OpenCode directories", () => {
  test("on Linux the config, cache root and packages cache are read in order", () => {
    setPlatform("linux");
    const config = path.join(home, ".config", "opencode");
    const cache = path.join(home, ".cache", "opencode");
    cachedPackage(path.join(cache, "packages"), "3.0.0");
    expect(getCachedPluginVersion()).toBe("3.0.0");
    cachedPackage(cache, "2.0.0");
    expect(getCachedPluginVersion()).toBe("2.0.0");
    cachedPackage(config, 7);
    expect(getCachedPluginVersion()).toBe("2.0.0");
    cachedPackage(config, "1.0.0");
    expect(getCachedPluginVersion()).toBe("1.0.0");
  });

  test("XDG_CACHE_HOME moves the cache", () => {
    setPlatform("linux");
    const xdg = tmp();
    process.env.XDG_CACHE_HOME = xdg;
    cachedPackage(path.join(xdg, "opencode"), "4.0.0");
    expect(getCachedPluginVersion()).toBe("4.0.0");
  });

  test("on macOS the cache is under Library/Caches", () => {
    setPlatform("darwin");
    cachedPackage(path.join(home, "Library", "Caches", "opencode"), "5.0.0");
    expect(getCachedPluginVersion()).toBe("5.0.0");
  });

  test("on Windows AppData is used, or the profile's AppData folders", () => {
    setPlatform("win32");
    cachedPackage(path.join(home, "AppData", "Local", "opencode"), "6.0.0");
    expect(getCachedPluginVersion()).toBe("6.0.0");
    cachedPackage(path.join(home, "AppData", "Roaming", "opencode"), "6.1.0");
    expect(getCachedPluginVersion()).toBe("6.1.0");

    const appData = tmp();
    process.env.APPDATA = appData;
    process.env.LOCALAPPDATA = appData;
    put(path.join(appData, "opencode", "packages", "x"), "");
    cachedPackage(path.join(appData, "opencode"), "6.2.0");
    expect(getCachedPluginVersion()).toBe("6.2.0");
  });

  test("without cached copies the running package's version is used", () => {
    setPlatform("linux");
    const own = JSON.parse(
      fs.readFileSync(path.join(import.meta.dir, "..", "package.json"), "utf8"),
    ).version;
    expect(getCachedPluginVersion()).toBe(own);
  });

  test("a malformed cached package.json is passed over", () => {
    setPlatform("linux");
    put(
      path.join(
        home,
        ".config",
        "opencode",
        "node_modules",
        "kibi-opencode",
        "package.json",
      ),
      "null",
    );
    cachedPackage(path.join(home, ".cache", "opencode"), "2.0.0");
    expect(getCachedPluginVersion()).toBe("2.0.0");
  });

  test("the install workspace follows the installed copy", () => {
    setPlatform("linux");
    const config = path.join(home, ".config", "opencode");
    const cache = path.join(home, ".cache", "opencode");
    expect(activeInstallWorkspace()).toBe(path.join(cache, "packages"));
    put(path.join(cache, "node_modules", "kibi-opencode", "x"), "");
    expect(activeInstallWorkspace()).toBe(path.join(cache, "packages"));
    cachedPackage(cache, "1.0.0");
    expect(activeInstallWorkspace()).toBe(cache);
    put(path.join(config, "node_modules", "kibi-opencode", "x"), "");
    expect(activeInstallWorkspace()).toBe(cache);
    cachedPackage(config, "1.0.0");
    expect(activeInstallWorkspace()).toBe(config);
  });
});

describe("findPackageJsonUp", () => {
  test("skips other and malformed package files on the way up", () => {
    const root = tmp();
    const own = put(
      path.join(root, "package.json"),
      JSON.stringify({ name: "kibi-opencode" }),
    );
    put(path.join(root, "a", "package.json"), "null");
    put(
      path.join(root, "a", "b", "package.json"),
      JSON.stringify({ name: "x" }),
    );
    const start = pathToFileURL(path.join(root, "a", "b", "c.js")).href;
    expect(findPackageJsonUp(start)).toBe(own);
    expect(
      findPackageJsonUp(pathToFileURL(path.join(tmp(), "c.js")).href),
    ).toBeNull();
  });
});

describe("invalidateKibiOpencodePackage", () => {
  function dirs() {
    setPlatform("linux");
    const config = path.join(home, ".config", "opencode");
    const cache = path.join(home, ".cache", "opencode");
    return { config, cache, packages: path.join(cache, "packages") };
  }

  test("nothing to remove reports false", () => {
    const { cache, packages } = dirs();
    put(path.join(cache, "other@1", "x"), "");
    put(path.join(packages, "kibi-opencode@1"), "a file");
    expect(invalidateKibiOpencodePackage()).toBe(false);
    expect(fs.existsSync(path.join(cache, "other@1"))).toBe(true);
    expect(fs.existsSync(path.join(packages, "kibi-opencode@1"))).toBe(true);
  });

  test.each([
    [
      "config package",
      (d: ReturnType<typeof dirs>) =>
        path.join(d.config, "node_modules", "kibi-opencode", "x"),
    ],
    [
      "cache package",
      (d: ReturnType<typeof dirs>) =>
        path.join(d.cache, "node_modules", "kibi-opencode", "x"),
    ],
    [
      "packages package",
      (d: ReturnType<typeof dirs>) =>
        path.join(d.packages, "node_modules", "kibi-opencode", "x"),
    ],
    [
      "cache specifier",
      (d: ReturnType<typeof dirs>) =>
        path.join(d.cache, "kibi-opencode@1.0.0", "x"),
    ],
    [
      "packages specifier",
      (d: ReturnType<typeof dirs>) =>
        path.join(d.packages, "kibi-opencode@latest", "x"),
    ],
    [
      "cache bun.lock",
      (d: ReturnType<typeof dirs>) => path.join(d.cache, "bun.lock"),
    ],
    [
      "cache bun.lockb",
      (d: ReturnType<typeof dirs>) => path.join(d.cache, "bun.lockb"),
    ],
    [
      "packages bun.lock",
      (d: ReturnType<typeof dirs>) => path.join(d.packages, "bun.lock"),
    ],
    [
      "packages bun.lockb",
      (d: ReturnType<typeof dirs>) => path.join(d.packages, "bun.lockb"),
    ],
  ])("a %s alone is removed", (_name, where) => {
    const d = dirs();
    const file = where(d);
    put(file, "");
    // A sibling that must stay.
    const keep = put(path.join(d.cache, "keep", "x"), "");
    expect(invalidateKibiOpencodePackage()).toBe(true);
    expect(fs.existsSync(file)).toBe(false);
    expect(fs.existsSync(keep)).toBe(true);
    expect(invalidateKibiOpencodePackage()).toBe(false);
  });

  test("everything is removed in one pass", () => {
    const d = dirs();
    const files = [
      put(path.join(d.config, "node_modules", "kibi-opencode", "x"), ""),
      put(path.join(d.cache, "kibi-opencode@1", "x"), ""),
      put(path.join(d.cache, "kibi-opencode@2", "x"), ""),
      put(path.join(d.packages, "bun.lock"), ""),
    ];
    expect(invalidateKibiOpencodePackage()).toBe(true);
    for (const file of files) expect(fs.existsSync(file)).toBe(false);
  });
});

describe("getLatestPluginVersion", () => {
  function respond(
    body: unknown,
    ok = true,
  ): { calls: Array<[unknown, RequestInit | undefined]>; restore(): void } {
    const calls: Array<[unknown, RequestInit | undefined]> = [];
    const spy = spyOn(globalThis, "fetch").mockImplementation((async (
      url: unknown,
      init?: RequestInit,
    ) => {
      calls.push([url, init]);
      return { ok, json: async () => body } as Response;
    }) as unknown as typeof fetch);
    return { calls, restore: () => spy.mockRestore() };
  }

  test("asks the registry for the dist-tags and reads a channel", async () => {
    const fetched = respond({ latest: "1.0.0", beta: "2.0.0-beta.1", "": "x" });
    try {
      expect(await getLatestPluginVersion()).toBe("1.0.0");
      expect(await getLatestPluginVersion("beta")).toBe("2.0.0-beta.1");
      expect(await getLatestPluginVersion("missing")).toBe("1.0.0");
      const [url, init] = fetched.calls[0] as [unknown, RequestInit];
      expect(url).toBe(
        "https://registry.npmjs.org/-/package/kibi-opencode/dist-tags",
      );
      expect(init.headers).toEqual({ Accept: "application/json" });
      expect(init.signal).toBeInstanceOf(AbortSignal);
    } finally {
      fetched.restore();
    }
  });

  test("a failed response or a non-string tag gives null", async () => {
    let fetched = respond({ latest: "9.9.9" }, false);
    try {
      expect(await getLatestPluginVersion()).toBeNull();
    } finally {
      fetched.restore();
    }
    fetched = respond({ latest: 5 });
    try {
      expect(await getLatestPluginVersion()).toBeNull();
    } finally {
      fetched.restore();
    }
  });

  test("a thrown fetch is logged and gives null", async () => {
    const bodies = captureLogs();
    const spy = spyOn(globalThis, "fetch").mockImplementation((async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch);
    try {
      expect(await getLatestPluginVersion()).toBeNull();
    } finally {
      spy.mockRestore();
    }
    expect(bodies).toEqual([
      {
        service: "kibi-opencode",
        level: "info",
        message: "auto-update: failed to fetch latest version",
        error: "offline",
      },
    ]);
  });

  test("the request is aborted after the timeout and the timer cleared", async () => {
    let fire: (() => void) | undefined;
    let delay: number | undefined;
    const cleared: unknown[] = [];
    const set = spyOn(globalThis, "setTimeout").mockImplementation(((
      fn: () => void,
      ms: number,
    ) => {
      fire = fn;
      delay = ms;
      return 77 as unknown as ReturnType<typeof setTimeout>;
    }) as unknown as typeof setTimeout);
    const clear = spyOn(globalThis, "clearTimeout").mockImplementation(((
      handle: unknown,
    ) => {
      cleared.push(handle);
    }) as unknown as typeof clearTimeout);
    let signal: AbortSignal | undefined;
    const spy = spyOn(globalThis, "fetch").mockImplementation((async (
      _url: unknown,
      init?: RequestInit,
    ) => {
      signal = init?.signal ?? undefined;
      fire?.();
      return { ok: true, json: async () => ({ latest: "1.0.0" }) } as Response;
    }) as unknown as typeof fetch);
    try {
      await getLatestPluginVersion();
    } finally {
      spy.mockRestore();
      set.mockRestore();
      clear.mockRestore();
    }
    expect(delay).toBe(5000);
    expect(signal?.aborted).toBe(true);
    expect(cleared).toEqual([77]);
  });
});

describe("createAutoUpdateRunner", () => {
  function project(entry: string): string {
    const dir = tmp();
    put(path.join(dir, "opencode.json"), JSON.stringify({ plugin: [entry] }));
    return dir;
  }

  function runner(overrides: Partial<AutoUpdateRunnerDeps> = {}) {
    const logs: Array<[string, unknown]> = [];
    const notes: string[] = [];
    const channels: Array<string | undefined> = [];
    let invalidated = 0;
    const run = createAutoUpdateRunner({
      getCurrentVersion: () => "1.0.0",
      getLatestVersion: async (channel) => {
        channels.push(channel);
        return "2.0.0";
      },
      invalidatePackage: () => {
        invalidated += 1;
        return true;
      },
      runInstall: async () => true,
      notify: async (message) => {
        notes.push(message);
      },
      log: (message, metadata) => logs.push([message, metadata]),
      ...overrides,
    });
    return { run, logs, notes, channels, invalidated: () => invalidated };
  }

  test("each early stop is logged", async () => {
    let r = runner();
    expect(await r.run({ directory: tmp(), enabled: false })).toEqual({
      status: "disabled",
    });
    expect(r.logs).toEqual([["auto-update: disabled", undefined]]);

    r = runner();
    expect(await r.run({ directory: tmp(), enabled: true })).toEqual({
      status: "plugin-not-found",
    });
    expect(r.logs).toEqual([
      ["auto-update: kibi-opencode plugin entry not found", undefined],
    ]);

    r = runner({ getCurrentVersion: () => null });
    expect(
      await r.run({ directory: project("kibi-opencode"), enabled: true }),
    ).toEqual({ status: "current-version-unknown" });
    expect(r.logs).toEqual([
      ["auto-update: current version unknown", undefined],
    ]);

    r = runner({ getLatestVersion: async () => null });
    expect(
      await r.run({ directory: project("kibi-opencode"), enabled: true }),
    ).toEqual({ status: "latest-version-unknown", currentVersion: "1.0.0" });
    expect(r.logs).toEqual([
      ["auto-update: latest version unknown", undefined],
    ]);
  });

  test("the channel comes from an unpinned requested version", async () => {
    for (const [entry, channel] of [
      ["kibi-opencode", "latest"],
      ["kibi-opencode@beta", "beta"],
      ["kibi-opencode@0.5.0", "latest"],
      ["file:///x/kibi-opencode", "latest"],
    ] as const) {
      const r = runner({ getCurrentVersion: () => "1.0.0" });
      await r.run({ directory: project(entry), enabled: true });
      expect(r.channels).toEqual([channel]);
    }
  });

  test("the requested version stands in for an unknown current one", async () => {
    const r = runner({ getCurrentVersion: () => null });
    expect(
      await r.run({ directory: project("kibi-opencode@0.5.0"), enabled: true }),
    ).toEqual({
      status: "pinned",
      currentVersion: "0.5.0",
      latestVersion: "2.0.0",
    });
    expect(r.notes).toEqual([
      "kibi-opencode 2.0.0 is available; current plugin entry is pinned to 0.5.0.",
    ]);
    expect(r.logs).toEqual([
      [
        "auto-update: exact semver pin detected, skipping install",
        {
          currentVersion: "0.5.0",
          latestVersion: "2.0.0",
          entry: "kibi-opencode@0.5.0",
        },
      ],
    ]);
    expect(r.invalidated()).toBe(0);
  });

  test("an update installs, or reports a failed install", async () => {
    let r = runner();
    expect(
      await r.run({ directory: project("kibi-opencode"), enabled: true }),
    ).toEqual({
      status: "updated",
      currentVersion: "1.0.0",
      latestVersion: "2.0.0",
    });
    expect(r.invalidated()).toBe(1);
    expect(r.notes).toEqual([
      "kibi-opencode updated from 1.0.0 to 2.0.0. Restart OpenCode to apply.",
    ]);

    r = runner({ runInstall: async () => false });
    expect(
      await r.run({ directory: project("kibi-opencode"), enabled: true }),
    ).toEqual({
      status: "install-failed",
      currentVersion: "1.0.0",
      latestVersion: "2.0.0",
    });
    expect(r.notes).toEqual([
      "kibi-opencode 2.0.0 is available, but automatic install failed.",
    ]);
  });

  test.each([
    ["2.0.0", "1.0.0", true],
    ["1.0.0", "1.0.0", false],
    ["1.0.0", "2.0.0", false],
    ["1.10.0", "1.9.0", true],
    ["10.0.0", "9.0.0", true],
    ["1.0.10", "1.0.9", true],
    ["1.1.0", "1.0.9", true],
    ["1.0.1", "1.1.0", false],
    ["1.0.0", "1.0.0-rc.1", true],
    ["1.0.0", "1.0.0-zzz", true],
    ["1.0.0-rc.1", "1.0.0", false],
    ["1.0.0-rc.2", "1.0.0-rc.1", true],
    ["1.0.0-rc.10", "1.0.0-rc.9", true],
    ["1.0.0-rc.9", "1.0.0-rc.10", false],
    ["1.0.0-beta", "1.0.0-alpha", true],
    ["1.0.0-alpha", "1.0.0-beta", false],
    ["1.0.0-alpha.beta", "1.0.0-alpha.1", true],
    ["1.0.0-alpha.1", "1.0.0-alpha.beta", false],
    ["1.0.0-alpha.1", "1.0.0-alpha", true],
    ["1.0.0-alpha", "1.0.0-alpha.1", false],
    ["1.0.0-01", "1.0.0-1", true],
    ["1.0.0-0a", "1.0.0-1", true],
    ["1.0.0-1a", "1.0.0-2", true],
    ["1.0.0-rc.1+b2", "1.0.0-rc.1+b1", false],
    ["1.0.0+b2", "1.0.0+b1", false],
    ["2.0.0+build.1", "1.0.0", true],
    ["2.0.0+a.b.c", "1.0.0", true],
    ["2.0.0+a.bc", "1.0.0", true],
    ["1.0.0-9", "1.0.0-10a", false],
    ["1.0.0-a.b", "1.0.0-a.a", true],
    ["1.0.0-a.a", "1.0.0-a.b", false],
    ["1.0.0-a.b", "1.0.0-b.a", false],
    ["^2.0.0", "1.0.0", false],
    ["2.0.0x", "1.0.0", false],
    ["2.0", "1.0.0", false],
    ["2.0.0", "1.0", false],
    ["2.0.0-", "1.0.0", false],
    ["2.0.0-a..b", "1.0.0", false],
    ["2.0.0+", "1.0.0", false],
    ["2.0.0-a_b", "1.0.0", false],
    ["2.0.0+a_b", "1.0.0", false],
    ["2.0.0-rc-1.x+b-2.y", "1.0.0", true],
  ])("%s over %s updates: %p", async (latest, current, updates) => {
    const r = runner({
      getCurrentVersion: () => current,
      getLatestVersion: async () => latest,
    });
    const result = await r.run({
      directory: project("kibi-opencode"),
      enabled: true,
    });
    expect(result.status).toBe(updates ? "updated" : "up-to-date");
    if (!updates) {
      expect(r.logs).toEqual([
        [
          "auto-update: plugin already up to date",
          { currentVersion: current, latestVersion: latest },
        ],
      ]);
    }
  });
});

describe("the default runner", () => {
  test("logs through the plugin logger", async () => {
    const bodies = captureLogs();
    expect(
      await runKibiOpencodeAutoUpdate({ directory: tmp(), enabled: false }),
    ).toEqual({ status: "disabled" });
    await notifyAutoUpdate("hello");
    expect(bodies).toEqual([
      {
        service: "kibi-opencode",
        level: "info",
        message: "auto-update: disabled",
      },
      {
        service: "kibi-opencode",
        level: "info",
        message: "hello",
      },
    ]);
  });
});
