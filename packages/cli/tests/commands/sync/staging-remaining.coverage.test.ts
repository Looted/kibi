// implements REQ-003
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import {
  atomicPublishGeneration,
  cleanupAbandonedStagingDirectories,
  abandonedStagingBranch,
  prepareStagingEnvironment,
} from "../../../src/commands/sync/staging.js";
import {
  createTempDir,
  isolateKibiEnv,
  removeTempDir,
} from "../../helpers/in-process-workspace.js";

const roots: string[] = [];
const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  for (const root of roots.splice(0)) removeTempDir(root);
});

function tempRoot(): string {
  const restoreEnv = isolateKibiEnv();
  restores.push(restoreEnv);
  const root = createTempDir("kibi-staging-rem-");
  roots.push(root);
  return root;
}

describe("atomicPublishGeneration leftover publish and rollback branches", () => {
  test("renames staging onto a missing live path after creating the parent", () => {
    const root = tempRoot();
    const staging = path.join(root, "staging");
    const live = path.join(root, "missing-parent", "live");
    mkdirSync(staging, { recursive: true });
    writeFileSync(path.join(staging, "CURRENT"), "generation-1:0\n");
    atomicPublishGeneration(staging, live);
    expect(existsSync(live)).toBe(true);
    expect(existsSync(path.join(live, "CURRENT"))).toBe(true);
  });

  test("publishes rdf and CURRENT over an existing live store and removes rollback siblings", () => {
    const root = tempRoot();
    const live = path.join(root, "live");
    const staging = path.join(root, "staging");
    mkdirSync(path.join(live, "rdf"), { recursive: true });
    writeFileSync(path.join(live, "CURRENT"), "old:0\n");
    writeFileSync(path.join(live, "rdf", "old.bin"), "old");
    mkdirSync(path.join(staging, "rdf"), { recursive: true });
    writeFileSync(path.join(staging, "CURRENT"), "new:0\n");
    writeFileSync(path.join(staging, "rdf", "new.bin"), "new");
    atomicPublishGeneration(staging, live);
    expect(readFileSync(path.join(live, "CURRENT"), "utf8")).toBe("new:0\n");
    expect(existsSync(path.join(live, "rdf", "new.bin"))).toBe(true);
    expect(
      existsSync(path.join(root, "live")) &&
        !existsSync(path.join(live, "rdf.old")),
    ).toBe(true);
  });

  test("throws when a rebuilt generation is missing rdf or CURRENT", () => {
    const root = tempRoot();
    const live = path.join(root, "live");
    const staging = path.join(root, "staging");
    mkdirSync(live, { recursive: true });
    mkdirSync(staging, { recursive: true });
    expect(() => atomicPublishGeneration(staging, live)).toThrow(
      /missing rdf or CURRENT/,
    );
  });

  test("rolls back a failed CURRENT publish and rethrows the original error", () => {
    const root = tempRoot();
    const live = path.join(root, "live");
    const staging = path.join(root, "staging");
    mkdirSync(path.join(live, "rdf"), { recursive: true });
    writeFileSync(path.join(live, "CURRENT"), "old:0\n");
    mkdirSync(path.join(staging, "rdf"), { recursive: true });
    writeFileSync(path.join(staging, "CURRENT"), "new:0\n");
    const { renameSync, rmSync, existsSync, mkdirSync: mkdir } =
      require("node:fs") as typeof import("node:fs");
    let currentPublishAttempts = 0;
    expect(() =>
      atomicPublishGeneration(staging, live, {
        existsSync,
        mkdirSync: mkdir,
        rmSync,
        renameSync: (from, to) => {
          const toStr = String(to);
          if (toStr.endsWith(`${path.sep}CURRENT`) && !toStr.includes(".old.")) {
            currentPublishAttempts += 1;
            if (currentPublishAttempts === 1) {
              throw new Error("CURRENT publish failed");
            }
          }
          return renameSync(from, to);
        },
      }),
    ).toThrow(/CURRENT publish failed/);
    expect(readFileSync(path.join(live, "CURRENT"), "utf8")).toBe("old:0\n");
  });

  test("swallows a rollback failure and still throws the publication error", () => {
    const root = tempRoot();
    const live = path.join(root, "live");
    const staging = path.join(root, "staging");
    mkdirSync(path.join(live, "rdf"), { recursive: true });
    writeFileSync(path.join(live, "CURRENT"), "old:0\n");
    mkdirSync(path.join(staging, "rdf"), { recursive: true });
    writeFileSync(path.join(staging, "CURRENT"), "new:0\n");
    const { renameSync, existsSync, mkdirSync: mkdir } =
      require("node:fs") as typeof import("node:fs");
    expect(() =>
      atomicPublishGeneration(staging, live, {
        existsSync,
        mkdirSync: mkdir,
        renameSync: (from, to) => {
          if (
            String(from).includes(`${path.sep}rdf`) &&
            String(to).endsWith(`${path.sep}rdf`)
          ) {
            throw new Error("rdf publish failed");
          }
          return renameSync(from, to);
        },
        rmSync: () => {
          throw new Error("rollback rm failed");
        },
      }),
    ).toThrow(/rdf publish failed/);
  });
});

describe("prepareStagingEnvironment leftover metadata branches", () => {
  test("skips journal metadata when writeFileSync is not supplied", async () => {
    const root = tempRoot();
    const staging = path.join(root, "staging");
    const live = path.join(root, "live");
    mkdirSync(live, { recursive: true });
    await prepareStagingEnvironment(staging, live, true, {
      existsSync: () => false,
      mkdirSync: () => undefined,
      rmSync: () => undefined,
      writeFileSync: undefined,
      fg: (async () => []) as never,
    });
    expect(existsSync(path.join(staging, "storage.json"))).toBe(false);
  });

  test("does not rewrite metadata when storage.json already exists", async () => {
    const root = tempRoot();
    const staging = path.join(root, "staging");
    const live = path.join(root, "live");
    mkdirSync(staging, { recursive: true });
    writeFileSync(path.join(staging, "storage.json"), '{"format":"existing"}\n');
    await prepareStagingEnvironment(staging, live, false, {
      existsSync: (target) =>
        String(target) === staging ||
        String(target) === path.join(staging, "storage.json"),
      mkdirSync: () => undefined,
      rmSync: () => undefined,
      copyCleanSnapshot: () => undefined,
      writeFileSync: () => {
        throw new Error("should not rewrite");
      },
      fg: (async () => []) as never,
    });
    expect(readFileSync(path.join(staging, "storage.json"), "utf8")).toContain(
      "existing",
    );
  });
});

describe("cleanupAbandonedStagingDirectories leftover candidate filters", () => {
  test("skips the current path, unmatched names, and live or non-finite pids", async () => {
    const current = "/repo/.kb/branches/main.staging.222.2000";
    const seen: string[] = [];
    await cleanupAbandonedStagingDirectories(current, {
      fg: (async () => [
        current,
        "/repo/.kb/branches/main.staging.notanumber.1",
        "/repo/.kb/branches/main.staging.333.3000",
        "/repo/.kb/branches/main.staging..4000",
      ]) as never,
      isProcessAlive: (pid) => {
        seen.push(String(pid));
        return pid === 333;
      },
      existsSync: () => true,
      rmSync: () => {
        throw new Error("should not remove live or current");
      },
    });
    expect(seen).toContain("333");
  });

  test("default liveness treats ESRCH as dead and other kill errors as live", async () => {
    const kill = spyOn(process, "kill").mockImplementation(((
      pid: number,
    ) => {
      if (pid === 111) {
        throw Object.assign(new Error("gone"), { code: "ESRCH" });
      }
      if (pid === 222) {
        throw Object.assign(new Error("denied"), { code: "EPERM" });
      }
      return true;
    }) as typeof process.kill);
    restores.push(() => kill.mockRestore());
    const removed: string[] = [];
    await cleanupAbandonedStagingDirectories(
      "/repo/.kb/branches/main.staging.999.1",
      {
        fg: (async () => [
          "/repo/.kb/branches/main.staging.111.1",
          "/repo/.kb/branches/main.staging.222.1",
        ]) as never,
        existsSync: () => true,
        rmSync: (target) => {
          removed.push(String(target));
        },
      },
    );
    expect(removed).toEqual(["/repo/.kb/branches/main.staging.111.1"]);
  });

  test("abandonedStagingBranch treats empty names as absent", () => {
    expect(abandonedStagingBranch(undefined)).toBeUndefined();
    expect(abandonedStagingBranch("")).toBeUndefined();
    expect(abandonedStagingBranch("main")).toBe("main");
  });

  test("skips abandoned staging directories whose branch group is empty", async () => {
    let globbed = false;
    await cleanupAbandonedStagingDirectories("/repo/.kb/branches/.staging.1.2", {
      fg: (async () => {
        globbed = true;
        return [];
      }) as never,
    });
    expect(globbed).toBe(false);
  });
});
