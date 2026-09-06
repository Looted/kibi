import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createAutoUpdateRunner } from "../src/auto-update.js";

const dirs: string[] = [];

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  if (process.exitCode === 1) process.exitCode = 0;
});

describe("auto-update remaining semver prerelease comparison", () => {
  test("treats equal cores with build metadata as up to date", async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "kibi-auto-update-"));
    dirs.push(root);
    writeFileSync(
      path.join(root, "opencode.json"),
      JSON.stringify({ plugin: ["kibi-opencode"] }),
    );
    const run = createAutoUpdateRunner({
      getCurrentVersion: () => "1.2.3",
      getLatestVersion: async () => "1.2.3+build.9",
      invalidatePackage: () => true,
      runInstall: async () => true,
      notify: async () => {},
      log: () => {},
    });
    const result = await run({ directory: root, enabled: true });
    expect(result.status).toBe("up-to-date");
  });

  test("treats identical prerelease identifiers as up to date", async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "kibi-auto-update-pre-"));
    dirs.push(root);
    writeFileSync(
      path.join(root, "opencode.json"),
      JSON.stringify({ plugin: ["kibi-opencode"] }),
    );
    const run = createAutoUpdateRunner({
      getCurrentVersion: () => "1.2.3-alpha.1",
      getLatestVersion: async () => "1.2.3-alpha.1+meta",
      invalidatePackage: () => true,
      runInstall: async () => true,
      notify: async () => {},
      log: () => {},
    });
    const result = await run({ directory: root, enabled: true });
    expect(result.status).toBe("up-to-date");
  });
});
