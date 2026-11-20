// Verifies the distribution artifacts a ZCode marketplace install and an npm
// pack actually produce — copied/packed bytes, not development-tree layout.
import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, describe, expect, test } from "bun:test";

import { buildZcodePackageOnce } from "./build-once";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const requiredPluginFiles = [
  path.join(".zcode-plugin", "plugin.json"),
  path.join("bin", "hook-runner.mjs"),
  path.join("bin", "mcp-launcher.cjs"),
  path.join("hooks", "hooks.json"),
  path.join("commands", "kibi-bootstrap.md"),
  path.join("commands", "kibi-signoff.md"),
  path.join("skills", "kibi-usage", "SKILL.md"),
  path.join("skills", "kibi-bootstrap", "SKILL.md"),
  path.join("skills", "kibi-freshness", "SKILL.md"),
  path.join("skills", "kibi-traceability", "SKILL.md"),
  path.join("skills", "kibi-decisions", "SKILL.md"),
  path.join("skills", "kibi-commit-review", "SKILL.md"),
  path.join("skills", "kibi-provable-code", "SKILL.md"),
];

function tarPath(relative: string): string {
  return relative.split(path.sep).join("/");
}

const tempRoots: string[] = [];
afterAll(() => {
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function buildPackage(): void {
  buildZcodePackageOnce(packageRoot);
}

function copyInstalledPlugin(): string {
  // A ZCode marketplace install from a Git source copies the repository's
  // tracked files and never runs a build, so the copy model is the tracked
  // tree (plus not-yet-committed candidates), not the built package layout.
  const installRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "kibi-zcode-installed-"),
  );
  tempRoots.push(installRoot);
  const installedRoot = path.join(installRoot, "kibi-zcode");
  fs.mkdirSync(installedRoot, { recursive: true });
  const tracked = execSync("git ls-files --cached --others --exclude-standard -z", {
    cwd: packageRoot,
  })
    .toString("utf8")
    .split("\0")
    .filter((relative) => relative.length > 0);
  expect(tracked.length).toBeGreaterThan(0);
  for (const relative of tracked) {
    const target = path.join(installedRoot, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(packageRoot, relative), target);
  }
  return installedRoot;
}

describe("kibi-zcode distribution artifacts", () => {
  test("a copied marketplace install contains every declared runtime file and runs under node", () => {
    const installedRoot = copyInstalledPlugin();

    for (const relative of requiredPluginFiles) {
      expect(
        fs.existsSync(path.join(installedRoot, relative)),
        `installed plugin missing ${relative}`,
      ).toBe(true);
    }

    // Every hooks.json command target resolves inside the copied install:
    // a Git-sourced copy has no build output, so the hook runner itself
    // must be a tracked file for the lifecycle hooks to start at all.
    const config = JSON.parse(
      fs.readFileSync(path.join(installedRoot, "hooks", "hooks.json"), "utf8"),
    ) as { hooks?: Record<string, { hooks?: { command?: string }[] }[]> };
    const commands = new Set<string>();
    for (const entries of Object.values(config.hooks ?? {})) {
      for (const entry of entries) {
        for (const hook of entry.hooks ?? []) {
          commands.add(hook.command ?? "");
        }
      }
    }
    expect(commands.size).toBeGreaterThan(0);
    for (const command of commands) {
      const match = /^node "\$\{ZCODE_PLUGIN_ROOT\}\/([^"]+)"$/.exec(command);
      expect(match, `unexpected hook command: ${command}`).toBeTruthy();
      expect(
        fs.existsSync(path.join(installedRoot, match?.[1] ?? "")),
        `tracked-source install missing hook target from: ${command}`,
      ).toBe(true);
    }

    // The installed hook runner executes under node from the copied layout:
    // an unconfigured workspace must produce the silent pass-through.
    const hookRunner = path.join(installedRoot, "bin", "hook-runner.mjs");
    const child = Bun.spawn(["node", hookRunner], {
      cwd: installedRoot,
      env: { ...process.env },
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
    });
    child.stdin.write(
      `${JSON.stringify({
        hook_event_name: "Stop",
        session_id: "install-check",
        cwd: installedRoot,
      })}\n`,
    );
    child.stdin.end();

    return new Response(child.stdout).text().then(async (stdout) => {
      const exitCode = await child.exited;
      expect(exitCode).toBe(0);
      expect(JSON.parse(stdout.trim())).toEqual({ continue: true });
    });
  }, 60000);

  test("an npm pack artifact ships the plugin manifest, hooks, launcher, skills, and command", () => {
    buildPackage();
    const packDestination = fs.mkdtempSync(
      path.join(os.tmpdir(), "kibi-zcode-pack-"),
    );
    tempRoots.push(packDestination);

    execSync(`npm pack --pack-destination ${JSON.stringify(packDestination)}`, {
      cwd: packageRoot,
      stdio: "ignore",
    });
    const { name, version } = JSON.parse(
      fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"),
    ) as { name: string; version: string };
    const tarball = fs
      .readdirSync(packDestination)
      .find((filename) => filename === `${name}-${version}.tgz`);
    expect(tarball).toBeTruthy();

    const listed = new Set(
      execSync(
        `tar -tzf ${JSON.stringify(path.join(packDestination, tarball as string))}`,
      )
        .toString()
        .split("\n")
        .map((entry) =>
          entry
            .replace(/^package\//, "")
            .trim()
            .replaceAll("\\", "/"),
        )
        .filter((entry) => entry.length > 0),
    );

    for (const relative of requiredPluginFiles) {
      expect(
        listed.has(tarPath(relative)),
        `packed artifact missing ${relative}`,
      ).toBe(true);
    }
    // Generated mirrors of the remaining skills travel with the package.
    for (const skill of ["kibi-usage", "kibi-traceability"]) {
      const resourcesPrefix = `${tarPath(path.join("skills", skill, "resources"))}/`;
      expect(
        [...listed].some((entry) => entry.startsWith(resourcesPrefix)),
        `packed artifact missing resources for ${skill}`,
      ).toBe(true);
    }
  }, 120000);
});
