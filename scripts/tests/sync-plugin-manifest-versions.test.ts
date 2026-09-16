/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  runSyncPluginManifestVersionsCli,
  syncPluginManifestVersions,
} from "../sync-plugin-manifest-versions.ts";

const testDir = dirname(fileURLToPath(import.meta.url));

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(join(path, ".."), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function readJson(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
}

describe("syncPluginManifestVersions", () => {
  test("version-packages runs manifest sync after Changesets versioning", () => {
    const packageJson = readJson(join(testDir, "../../package.json"));

    expect(packageJson.scripts).toMatchObject({
      "version-packages":
        "changeset version && bun run scripts/sync-plugin-manifest-versions.ts",
    });
  });

  test("syncs every package plugin manifest version from its package.json", async () => {
    const workspaceRoot = mkdtempSync(
      join(tmpdir(), "kibi-plugin-manifest-sync-"),
    );
    const codexPluginPath = join(
      workspaceRoot,
      "packages/codex/.codex-plugin/plugin.json",
    );
    const cursorPluginPath = join(
      workspaceRoot,
      "packages/cursor/.cursor-plugin/plugin.json",
    );

    await writeJson(join(workspaceRoot, "packages/codex/package.json"), {
      name: "kibi-codex",
      version: "2.3.4",
    });
    await writeJson(codexPluginPath, {
      name: "kibi-codex",
      version: "0.0.1",
      skills: "./skills/",
    });
    await writeJson(join(workspaceRoot, "packages/cursor/package.json"), {
      name: "kibi-cursor",
      version: "5.6.7",
    });
    await writeJson(cursorPluginPath, {
      name: "kibi-cursor",
      version: "0.0.2",
      rules: "./rules/",
    });
    writeFileSync(
      cursorPluginPath,
      '{\n  "name": "kibi-cursor",\n  "version": "0.0.2",\n  "keywords": ["kibi", "mcp"]\n}\n',
      "utf8",
    );
    await writeJson(join(workspaceRoot, "packages/cli/package.json"), {
      name: "kibi-cli",
      version: "9.9.9",
    });
    await mkdir(join(workspaceRoot, "packages/.tmp"), { recursive: true });

    const synced = await syncPluginManifestVersions(workspaceRoot);

    expect(synced.map((entry) => entry.packageName).sort()).toEqual([
      "kibi-codex",
      "kibi-cursor",
    ]);
    expect(readJson(codexPluginPath).version).toBe("2.3.4");
    expect(readJson(cursorPluginPath).version).toBe("5.6.7");
    expect(readFileSync(cursorPluginPath, "utf8")).toContain(
      '"keywords": ["kibi", "mcp"]',
    );
  });

  test("rejects non-object manifests and missing package identity", async () => {
    const workspaceRoot = mkdtempSync(
      join(tmpdir(), "kibi-plugin-manifest-bad-"),
    );
    await writeJson(join(workspaceRoot, "packages/cli/package.json"), [
      "not-an-object",
    ]);
    await expect(syncPluginManifestVersions(workspaceRoot)).rejects.toThrow(
      /Expected a JSON object/,
    );

    await writeJson(join(workspaceRoot, "packages/cli/package.json"), {
      version: "1.0.0",
    });
    await expect(syncPluginManifestVersions(workspaceRoot)).rejects.toThrow(
      /Missing package name/,
    );

    await writeJson(join(workspaceRoot, "packages/cli/package.json"), {
      name: "kibi-cli",
    });
    await expect(syncPluginManifestVersions(workspaceRoot)).rejects.toThrow(
      /Missing package version/,
    );
  });

  test("CLI runner logs each synced plugin manifest", async () => {
    const workspaceRoot = mkdtempSync(
      join(tmpdir(), "kibi-plugin-manifest-cli-"),
    );
    await writeJson(join(workspaceRoot, "packages/codex/package.json"), {
      name: "kibi-codex",
      version: "3.0.0",
    });
    await writeJson(
      join(workspaceRoot, "packages/codex/.codex-plugin/plugin.json"),
      { name: "kibi-codex", version: "0.1.0" },
    );
    const logs: string[] = [];
    const log = console.log.bind(console);
    console.log = ((chunk: unknown) => {
      logs.push(String(chunk));
    }) as typeof console.log;
    try {
      await runSyncPluginManifestVersionsCli(workspaceRoot);
      expect(logs.join("\n")).toContain("Synced");
      expect(logs.join("\n")).toContain("0.1.0 -> 3.0.0");
    } finally {
      console.log = log;
    }
  });
});
