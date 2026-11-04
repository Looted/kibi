import {
  afterEach,
  describe,
  expect,
  setSystemTime,
  spyOn,
  test,
} from "bun:test";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import {
  atomicPublishGeneration,
  cleanupAbandonedStagingDirectories,
  prepareStagingEnvironment,
} from "../../../src/commands/sync/staging.js";
import {
  createTempDir,
  removeTempDir,
} from "../../helpers/in-process-workspace.js";

const roots: string[] = [];
const restores: Array<() => void> = [];

afterEach(() => {
  setSystemTime();
  for (const restore of restores.splice(0).reverse()) restore();
  for (const root of roots.splice(0)) removeTempDir(root);
});

/**
 * An in-memory tree: each path is a file or a directory, and every call is
 * recorded. `fail` names the call that throws, as "rename:<from>".
 */
function fakeFs(entries: Record<string, "file" | "dir">, fail?: string) {
  const nodes = new Map(Object.entries(entries));
  const calls: unknown[][] = [];
  const under = (root: string) =>
    [...nodes.keys()].filter((p) => p === root || p.startsWith(`${root}/`));
  const deps = {
    existsSync: (p: string) => nodes.has(p),
    mkdirSync: (p: string, options?: unknown) => {
      calls.push(["mkdir", p, options]);
      nodes.set(p, "dir");
    },
    renameSync: (from: string, to: string) => {
      calls.push(["rename", from, to]);
      if (fail === `rename:${from}`) throw new Error(`cannot move ${from}`);
      if (!nodes.has(from)) throw new Error(`ENOENT ${from}`);
      for (const p of under(from)) {
        const kind = nodes.get(p) as "file" | "dir";
        nodes.delete(p);
        nodes.set(to + p.slice(from.length), kind);
      }
    },
    rmSync: (p: string, options?: { recursive?: boolean; force?: boolean }) => {
      calls.push(["rm", p, options]);
      if (fail === `rm:${p}`) throw new Error(`cannot remove ${p}`);
      if (!nodes.has(p)) {
        if (options?.force) return;
        throw new Error(`ENOENT ${p}`);
      }
      if (nodes.get(p) === "dir" && !options?.recursive)
        throw new Error(`EISDIR ${p}`);
      for (const q of under(p)) nodes.delete(q);
    },
    writeFileSync: (p: string, data: unknown, options?: unknown) => {
      calls.push(["write", p, data, options]);
      nodes.set(p, "file");
    },
  };
  const tree = () => Object.fromEntries([...nodes].sort());
  return { deps, calls, tree };
}

describe("atomicPublishGeneration", () => {
  const stamp = 1_700_000_000_000;
  const old = `${stamp}.${process.pid}`;
  const live = {
    "/b": "dir",
    "/b/live": "dir",
    "/b/live/rdf": "dir",
    "/b/live/rdf/db": "file",
    "/b/live/CURRENT": "file",
    "/b/live/kept": "file",
  } as const;
  const staged = {
    "/s": "dir",
    "/s/rdf": "dir",
    "/s/rdf/new": "file",
    "/s/CURRENT": "file",
  } as const;

  test("swaps the database and pointer, then drops the old pair", () => {
    setSystemTime(new Date(stamp));
    const fs = fakeFs({ ...live, ...staged });
    atomicPublishGeneration("/s", "/b/live", fs.deps as never);
    expect(fs.calls).toStrictEqual([
      ["rename", "/b/live/rdf", `/b/live/rdf.old.${old}`],
      ["rename", "/s/rdf", "/b/live/rdf"],
      ["rename", "/b/live/CURRENT", `/b/live/CURRENT.old.${old}`],
      ["rename", "/s/CURRENT", "/b/live/CURRENT"],
      ["rm", `/b/live/rdf.old.${old}`, { recursive: true }],
      ["rm", `/b/live/CURRENT.old.${old}`, undefined],
    ]);
    expect(fs.tree()).toStrictEqual({
      "/b": "dir",
      "/b/live": "dir",
      "/b/live/CURRENT": "file",
      "/b/live/kept": "file",
      "/b/live/rdf": "dir",
      "/b/live/rdf/new": "file",
      "/s": "dir",
    });
  });

  test("publishes into a live store that has no database or pointer yet", () => {
    const fs = fakeFs({ "/b": "dir", "/b/live": "dir", ...staged });
    atomicPublishGeneration("/s", "/b/live", fs.deps as never);
    expect(fs.calls).toStrictEqual([
      ["rename", "/s/rdf", "/b/live/rdf"],
      ["rename", "/s/CURRENT", "/b/live/CURRENT"],
    ]);
  });

  test("moves the whole staging directory when nothing is live", () => {
    const fs = fakeFs({ ...staged });
    atomicPublishGeneration("/s", "/b/live", fs.deps as never);
    expect(fs.calls).toStrictEqual([
      ["mkdir", "/b", { recursive: true }],
      ["rename", "/s", "/b/live"],
    ]);
  });

  test("refuses a generation without its database or pointer", () => {
    for (const missing of ["/s/rdf", "/s/CURRENT"]) {
      const entries = Object.fromEntries(
        Object.entries({ ...live, ...staged }).filter(
          ([p]) => p !== missing && !p.startsWith(`${missing}/`),
        ),
      );
      const fs = fakeFs(entries);
      expect(() =>
        atomicPublishGeneration("/s", "/b/live", fs.deps as never),
      ).toThrow(
        new Error("Rebuilt journal generation is missing rdf or CURRENT"),
      );
      expect(fs.calls).toStrictEqual([]);
    }
  });

  test("leaves the live store untouched when the database cannot move", () => {
    setSystemTime(new Date(stamp));
    const fs = fakeFs({ ...live, ...staged }, "rename:/b/live/rdf");
    expect(() =>
      atomicPublishGeneration("/s", "/b/live", fs.deps as never),
    ).toThrow(new Error("cannot move /b/live/rdf"));
    expect(fs.calls).toStrictEqual([
      ["rename", "/b/live/rdf", `/b/live/rdf.old.${old}`],
    ]);
    expect(fs.tree()).toStrictEqual(
      Object.fromEntries(Object.entries({ ...live, ...staged }).sort()),
    );
  });

  test("restores the old database when the staged one cannot move", () => {
    setSystemTime(new Date(stamp));
    const fs = fakeFs({ ...live, ...staged }, "rename:/s/rdf");
    expect(() =>
      atomicPublishGeneration("/s", "/b/live", fs.deps as never),
    ).toThrow(new Error("cannot move /s/rdf"));
    expect(fs.calls).toStrictEqual([
      ["rename", "/b/live/rdf", `/b/live/rdf.old.${old}`],
      ["rename", "/s/rdf", "/b/live/rdf"],
      ["rename", `/b/live/rdf.old.${old}`, "/b/live/rdf"],
    ]);
    expect(fs.tree()).toStrictEqual(
      Object.fromEntries(Object.entries({ ...live, ...staged }).sort()),
    );
  });

  test("restores both when the old pointer cannot move", () => {
    setSystemTime(new Date(stamp));
    const fs = fakeFs({ ...live, ...staged }, "rename:/b/live/CURRENT");
    expect(() =>
      atomicPublishGeneration("/s", "/b/live", fs.deps as never),
    ).toThrow(new Error("cannot move /b/live/CURRENT"));
    expect(fs.calls.slice(3)).toStrictEqual([
      ["rm", "/b/live/rdf", { recursive: true }],
      ["rename", `/b/live/rdf.old.${old}`, "/b/live/rdf"],
    ]);
    const after = fs.tree();
    expect(after["/b/live/rdf/db"]).toBe("file");
    expect(after["/b/live/CURRENT"]).toBe("file");
    expect(after["/b/live/rdf/new"]).toBeUndefined();
  });

  test("restores both when the staged pointer cannot move", () => {
    setSystemTime(new Date(stamp));
    const fs = fakeFs({ ...live, ...staged }, "rename:/s/CURRENT");
    expect(() =>
      atomicPublishGeneration("/s", "/b/live", fs.deps as never),
    ).toThrow(new Error("cannot move /s/CURRENT"));
    expect(fs.calls.slice(4)).toStrictEqual([
      ["rename", `/b/live/CURRENT.old.${old}`, "/b/live/CURRENT"],
      ["rm", "/b/live/rdf", { recursive: true }],
      ["rename", `/b/live/rdf.old.${old}`, "/b/live/rdf"],
    ]);
    expect(fs.tree()["/b/live/rdf/db"]).toBe("file");
    expect(fs.tree()["/b/live/CURRENT"]).toBe("file");
  });

  test("drops a new database that had no predecessor", () => {
    const entries = Object.fromEntries(
      Object.entries({ ...live, ...staged }).filter(
        ([p]) => !p.startsWith("/b/live/rdf"),
      ),
    );
    const fs = fakeFs(entries, "rename:/s/CURRENT");
    expect(() =>
      atomicPublishGeneration("/s", "/b/live", fs.deps as never),
    ).toThrow("cannot move /s/CURRENT");
    expect(fs.tree()["/b/live/rdf"]).toBeUndefined();
    expect(fs.tree()["/b/live/CURRENT"]).toBe("file");
  });

  test("keeps the publication error when the rollback fails", () => {
    setSystemTime(new Date(stamp));
    const fs = fakeFs({ ...live, ...staged }, "rename:/b/live/CURRENT");
    const rm = fs.deps.rmSync;
    fs.deps.rmSync = (p, options) => {
      rm(p, options);
      throw new Error("rollback failed");
    };
    expect(() =>
      atomicPublishGeneration("/s", "/b/live", fs.deps as never),
    ).toThrow(new Error("cannot move /b/live/CURRENT"));
    expect(fs.calls.at(-1)).toStrictEqual([
      "rm",
      "/b/live/rdf",
      { recursive: true },
    ]);
  });
});

describe("prepareStagingEnvironment metadata", () => {
  function stagingDeps(fs: ReturnType<typeof fakeFs>) {
    return {
      ...fs.deps,
      fg: (async () => []) as never,
      copyCleanSnapshot: (from: string, to: string) => {
        fs.calls.push(["snapshot", from, to]);
      },
      copyFileSync: () => undefined,
      cwd: () => "/nowhere",
      moduleDir: "/nowhere/a/b",
    };
  }

  test("writes the journal marker, pointer and format stub", async () => {
    const fs = fakeFs({ "/live": "dir" });
    await prepareStagingEnvironment(
      "/b/main.staging.1.2",
      "/live",
      false,
      stagingDeps(fs) as never,
    );
    const s = "/b/main.staging.1.2";
    expect(fs.calls).toStrictEqual([
      ["mkdir", s, { recursive: true }],
      ["snapshot", "/live", s],
      ["mkdir", `${s}/rdf`, { recursive: true }],
      [
        "write",
        `${s}/storage.json`,
        '{"format":"kibi.rdf-journal.v1","schemaVersion":1}\n',
        { mode: 0o600 },
      ],
      ["write", `${s}/CURRENT`, "generation-1:0\n", { mode: 0o600 }],
      [
        "write",
        `${s}/kb.rdf`,
        "KIBI_STORAGE_FORMAT=kibi.rdf-journal.v1\n",
        { mode: 0o600 },
      ],
    ]);
  });

  test("names a rebuilt generation after the process and time", async () => {
    setSystemTime(new Date(1234));
    const fs = fakeFs({});
    await prepareStagingEnvironment(
      "/st",
      "/live",
      true,
      stagingDeps(fs) as never,
    );
    expect(fs.calls.filter(([op]) => op === "write")[1]).toStrictEqual([
      "write",
      "/st/CURRENT",
      `generation-${process.pid}-1234:0\n`,
      { mode: 0o600 },
    ]);
  });

  test("keeps an existing marker", async () => {
    const fs = fakeFs({ "/live": "dir" });
    const deps = stagingDeps(fs);
    const snapshot = deps.copyCleanSnapshot;
    deps.copyCleanSnapshot = (from, to) => {
      snapshot(from, to);
      fs.deps.writeFileSync(`${to}/storage.json`, "{}");
    };
    await prepareStagingEnvironment("/st", "/live", false, deps as never);
    expect(fs.calls.filter(([op]) => op === "write")).toHaveLength(1);
  });

  test("skips metadata when the staging directory is not there", async () => {
    const fs = fakeFs({});
    const deps = stagingDeps(fs);
    deps.mkdirSync = (p: string, options?: unknown) => {
      fs.calls.push(["mkdir", p, options]);
    };
    await prepareStagingEnvironment("/st", "/live", true, deps as never);
    expect(fs.calls.filter(([op]) => op === "write")).toStrictEqual([]);
  });

  test("leaves metadata alone when injected without a writer", async () => {
    const fs = fakeFs({});
    const { writeFileSync: _w, ...deps } = stagingDeps(fs);
    await prepareStagingEnvironment("/st", "/live", true, deps as never);
    expect(fs.calls.map(([op]) => op)).toStrictEqual(["mkdir"]);
  });

  test("builds a real staging store with the default dependencies", async () => {
    const root = createTempDir("kibi-staging-mut-");
    roots.push(root);
    const schema = path.join(root, "packages", "cli", "schema");
    mkdirSync(schema, { recursive: true });
    writeFileSync(path.join(schema, "kb.pl"), "% schema\n");
    const cwd = spyOn(process, "cwd").mockReturnValue(root);
    restores.push(() => cwd.mockRestore());
    const staging = path.join(root, "main.staging.1.2");
    await prepareStagingEnvironment(staging, path.join(root, "live"), false);
    expect(readdirSync(path.join(staging, "schema"))).toStrictEqual(["kb.pl"]);
    expect(readFileSync(path.join(staging, "CURRENT")).toString()).toBe(
      "generation-1:0\n",
    );
    expect(statSync(path.join(staging, "storage.json")).mode & 0o777).toBe(
      0o600,
    );
    expect(statSync(path.join(staging, "rdf")).isDirectory()).toBe(true);
  });
});

describe("cleanupAbandonedStagingDirectories", () => {
  function cleanup(
    current: string,
    candidates: string[],
    alive: (pid: number) => boolean = () => false,
  ) {
    const removed: string[] = [];
    const checked: number[] = [];
    const globbed: unknown[][] = [];
    return cleanupAbandonedStagingDirectories(current, {
      existsSync: () => true,
      fg: (async (...args: unknown[]) => {
        globbed.push(args);
        return candidates;
      }) as never,
      isProcessAlive: (pid) => {
        checked.push(pid);
        return alive(pid);
      },
      rmSync: ((p: string) => {
        removed.push(p);
      }) as never,
    }).then(() => ({ removed, checked, globbed }));
  }

  test("ignores a name with trailing text after the timestamp", async () => {
    const result = await cleanup("/b/main.staging.1.2x", [
      "/b/main.staging.3.4",
    ]);
    expect(result.globbed).toStrictEqual([]);
  });

  test("skips a pid too large to be a number", async () => {
    const huge = `/b/main.staging.${"9".repeat(400)}.4`;
    const result = await cleanup("/b/main.staging.1.2", [huge]);
    expect(result.checked).toStrictEqual([]);
    expect(result.removed).toStrictEqual([]);
  });

  test("checks liveness with signal 0 by default", async () => {
    const kills: unknown[][] = [];
    const answers: unknown[] = [
      undefined,
      Object.assign(new Error("gone"), { code: "ESRCH" }),
      Object.assign(new Error("denied"), { code: "EPERM" }),
      { code: "ESRCH" },
      "odd",
      new Error("no code"),
    ];
    const spy = spyOn(process, "kill").mockImplementation(((
      ...args: unknown[]
    ) => {
      kills.push(args);
      const answer = answers.shift();
      if (answer !== undefined) throw answer;
      return true;
    }) as never);
    restores.push(() => spy.mockRestore());
    const removed: string[] = [];
    const candidates = [11, 12, 13, 14, 15, 16].map(
      (pid) => `/b/main.staging.${pid}.1`,
    );
    await cleanupAbandonedStagingDirectories("/b/main.staging.1.2", {
      existsSync: () => true,
      fg: (async () => candidates) as never,
      rmSync: ((p: string) => {
        removed.push(p);
      }) as never,
    });
    expect(kills).toStrictEqual([
      [11, 0],
      [12, 0],
      [13, 0],
      [14, 0],
      [15, 0],
      [16, 0],
    ]);
    expect(removed).toStrictEqual(["/b/main.staging.12.1"]);
  });

  test("the default liveness check sees this process", async () => {
    const root = createTempDir("kibi-staging-live-");
    roots.push(root);
    const mine = path.join(root, `main.staging.${process.pid}.1`);
    mkdirSync(mine);
    await cleanupAbandonedStagingDirectories(
      path.join(root, "main.staging.1.2"),
    );
    expect(existsSync(mine)).toBe(true);
  });
});
