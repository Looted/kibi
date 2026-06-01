import { afterEach, describe, expect, mock, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  createAutoUpdateRunner,
  findKibiOpencodePluginEntry,
  invalidateKibiOpencodePackage,
} from "../src/auto-update.js";

const originalXdgCacheHome = process.env.XDG_CACHE_HOME;

afterEach(() => {
  if (originalXdgCacheHome === undefined) {
    Reflect.deleteProperty(process.env, "XDG_CACHE_HOME");
  } else {
    process.env.XDG_CACHE_HOME = originalXdgCacheHome;
  }
});

function makeProjectWithPlugins(plugins: string[]): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-auto-update-"));
  fs.writeFileSync(
    path.join(tmpDir, "opencode.json"),
    JSON.stringify({ plugin: plugins }),
  );
  return tmpDir;
}

describe("kibi-opencode auto updater", () => {
  test("detects exact semver plugin entries as pinned", () => {
    const projectDir = makeProjectWithPlugins(["kibi-opencode@0.15.0"]);
    try {
      const entry = findKibiOpencodePluginEntry(projectDir);

      expect(entry).toEqual({
        entry: "kibi-opencode@0.15.0",
        isPinned: true,
        requestedVersion: "0.15.0",
        configPath: path.join(projectDir, "opencode.json"),
      });
    } finally {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
  });

  test("does not install updates for exact semver pinned plugin entries", async () => {
    const projectDir = makeProjectWithPlugins(["kibi-opencode@0.15.0"]);
    const getCurrentVersion = mock<() => string | null>(() => "0.15.0");
    const getLatestVersion = mock<() => Promise<string | null>>(() =>
      Promise.resolve("0.16.0"),
    );
    const invalidatePackage = mock<() => boolean>(() => true);
    const runInstall = mock<() => Promise<boolean>>(() =>
      Promise.resolve(true),
    );
    const notify = mock<(message: string) => Promise<void>>(() =>
      Promise.resolve(),
    );

    try {
      const runner = createAutoUpdateRunner({
        getCurrentVersion,
        getLatestVersion,
        invalidatePackage,
        runInstall,
        notify,
        log: () => {},
      });

      const result = await runner({
        directory: projectDir,
        enabled: true,
      });

      expect(result.status).toBe("pinned");
      expect(getLatestVersion).toHaveBeenCalledTimes(1);
      expect(invalidatePackage).not.toHaveBeenCalled();
      expect(runInstall).not.toHaveBeenCalled();
      expect(notify).toHaveBeenCalledWith(
        "kibi-opencode 0.16.0 is available; current plugin entry is pinned to 0.15.0.",
      );
    } finally {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
  });

  test("invalidates cache and runs install for unpinned plugin entries", async () => {
    const projectDir = makeProjectWithPlugins(["kibi-opencode"]);
    const getCurrentVersion = mock<() => string | null>(() => "0.15.0");
    const getLatestVersion = mock<() => Promise<string | null>>(() =>
      Promise.resolve("0.16.0"),
    );
    const invalidatePackage = mock<() => boolean>(() => true);
    const runInstall = mock<() => Promise<boolean>>(() =>
      Promise.resolve(true),
    );
    const notify = mock<(message: string) => Promise<void>>(() =>
      Promise.resolve(),
    );

    try {
      const runner = createAutoUpdateRunner({
        getCurrentVersion,
        getLatestVersion,
        invalidatePackage,
        runInstall,
        notify,
        log: () => {},
      });

      const result = await runner({
        directory: projectDir,
        enabled: true,
      });

      expect(result.status).toBe("updated");
      expect(invalidatePackage).toHaveBeenCalledTimes(1);
      expect(runInstall).toHaveBeenCalledTimes(1);
      expect(notify).toHaveBeenCalledWith(
        "kibi-opencode updated from 0.15.0 to 0.16.0. Restart OpenCode to apply.",
      );
    } finally {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
  });

  test("does not downgrade when latest registry version is older than current", async () => {
    const projectDir = makeProjectWithPlugins(["kibi-opencode"]);
    const invalidatePackage = mock<() => boolean>(() => true);
    const runInstall = mock<() => Promise<boolean>>(() =>
      Promise.resolve(true),
    );

    try {
      const runner = createAutoUpdateRunner({
        getCurrentVersion: () => "0.16.0",
        getLatestVersion: () => Promise.resolve("0.15.9"),
        invalidatePackage,
        runInstall,
        notify: () => Promise.resolve(),
        log: () => {},
      });

      const result = await runner({
        directory: projectDir,
        enabled: true,
      });

      expect(result.status).toBe("up-to-date");
      expect(invalidatePackage).not.toHaveBeenCalled();
      expect(runInstall).not.toHaveBeenCalled();
    } finally {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
  });

  test("invalidates documented root cache and packages cache layouts", () => {
    const cacheHome = fs.mkdtempSync(
      path.join(os.tmpdir(), "kibi-cache-home-"),
    );
    process.env.XDG_CACHE_HOME = cacheHome;
    const openCodeCache = path.join(cacheHome, "opencode");
    const rootPackage = path.join(
      openCodeCache,
      "node_modules",
      "kibi-opencode",
    );
    const packagesPackage = path.join(
      openCodeCache,
      "packages",
      "node_modules",
      "kibi-opencode",
    );
    const rootSpecifier = path.join(openCodeCache, "kibi-opencode@latest");
    const packagesSpecifier = path.join(
      openCodeCache,
      "packages",
      "kibi-opencode@latest",
    );

    for (const dir of [
      rootPackage,
      packagesPackage,
      rootSpecifier,
      packagesSpecifier,
    ]) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.mkdirSync(path.join(openCodeCache, "packages"), { recursive: true });
    fs.writeFileSync(path.join(openCodeCache, "bun.lock"), "root lock");
    fs.writeFileSync(path.join(openCodeCache, "packages", "bun.lockb"), "lock");

    try {
      expect(invalidateKibiOpencodePackage()).toBe(true);

      expect(fs.existsSync(rootPackage)).toBe(false);
      expect(fs.existsSync(packagesPackage)).toBe(false);
      expect(fs.existsSync(rootSpecifier)).toBe(false);
      expect(fs.existsSync(packagesSpecifier)).toBe(false);
      expect(fs.existsSync(path.join(openCodeCache, "bun.lock"))).toBe(false);
      expect(
        fs.existsSync(path.join(openCodeCache, "packages", "bun.lockb")),
      ).toBe(false);
    } finally {
      fs.rmSync(cacheHome, { recursive: true, force: true });
    }
  });

  test("skips all update work when disabled in kibi config", async () => {
    const projectDir = makeProjectWithPlugins(["kibi-opencode"]);
    const getCurrentVersion = mock<() => string | null>(() => "0.15.0");
    const getLatestVersion = mock<() => Promise<string | null>>(() =>
      Promise.resolve("0.16.0"),
    );

    try {
      const runner = createAutoUpdateRunner({
        getCurrentVersion,
        getLatestVersion,
        invalidatePackage: () => true,
        runInstall: () => Promise.resolve(true),
        notify: () => Promise.resolve(),
        log: () => {},
      });

      const result = await runner({
        directory: projectDir,
        enabled: false,
      });

      expect(result.status).toBe("disabled");
      expect(getCurrentVersion).not.toHaveBeenCalled();
      expect(getLatestVersion).not.toHaveBeenCalled();
    } finally {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
  });
});
