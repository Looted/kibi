// implements REQ-zcode-kibi-plugin-v1
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
  path.join("dist", "hook-runner.js"),
  path.join("bin", "mcp-launcher.cjs"),
  path.join("hooks", "hooks.json"),
  path.join("commands", "kibi-bootstrap.md"),
  path.join("skills", "kibi-usage", "SKILL.md"),
  path.join("skills", "kibi-bootstrap", "SKILL.md"),
  path.join("skills", "kibi-freshness", "SKILL.md"),
  path.join("skills", "kibi-traceability", "SKILL.md"),
];

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
  const installRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "kibi-zcode-installed-"),
  );
  tempRoots.push(installRoot);
  const installedRoot = path.join(installRoot, "kibi-zcode");
  fs.mkdirSync(installedRoot, { recursive: true });
  for (const dir of [
    ".zcode-plugin",
    "dist",
    "bin",
    "hooks",
    "skills",
    "commands",
  ]) {
    const source = path.join(packageRoot, dir);
    if (fs.existsSync(source)) {
      fs.cpSync(source, path.join(installedRoot, dir), { recursive: true });
    }
  }
  return installedRoot;
}

describe("kibi-zcode distribution artifacts", () => {
  test("a copied marketplace install contains every declared runtime file and runs under node", () => {
    buildPackage();
    const installedRoot = copyInstalledPlugin();

    for (const relative of requiredPluginFiles) {
      expect(
        fs.existsSync(path.join(installedRoot, relative)),
        `installed plugin missing ${relative}`,
      ).toBe(true);
    }

    // The installed hook runner executes under node from the copied layout:
    // an unconfigured workspace must produce the silent pass-through.
    const hookRunner = path.join(installedRoot, "dist", "hook-runner.js");
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
    const packDestination = fs.mkdtempSync(
      path.join(os.tmpdir(), "kibi-zcode-pack-"),
    );
    tempRoots.push(packDestination);

    execSync(`npm pack --pack-destination ${JSON.stringify(packDestination)}`, {
      cwd: packageRoot,
      stdio: "ignore",
    });
    const tarball = fs
      .readdirSync(packDestination)
      .find((name) => name === "kibi-zcode-0.1.0.tgz");
    expect(tarball).toBeTruthy();

    const listed = new Set(
      execSync(
        `tar -tzf ${JSON.stringify(path.join(packDestination, tarball as string))}`,
      )
        .toString()
        .split("\n")
        .map((entry) => entry.replace(/^package\//, "").trim())
        .filter((entry) => entry.length > 0),
    );

    for (const relative of requiredPluginFiles) {
      expect(listed.has(relative), `packed artifact missing ${relative}`).toBe(
        true,
      );
    }
    // Generated mirrors of the remaining skills travel with the package.
    for (const skill of ["kibi-usage", "kibi-traceability"]) {
      expect(
        [...listed].some((entry) =>
          entry.startsWith(path.join("skills", skill, "resources") + path.sep),
        ),
        `packed artifact missing resources for ${skill}`,
      ).toBe(true);
    }
  }, 120000);
});
