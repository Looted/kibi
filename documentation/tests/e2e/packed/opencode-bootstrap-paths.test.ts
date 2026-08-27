// E2E test: kibi-opencode bootstrap path behavior for the canonical .kb/ layout.
//
// This test verifies the bootstrap warning behavior for workspaces with:
// - Healthy canonical .kb/ knowledge lanes
// - A lifecycle manifest whose canonical targets are missing
//
// Uses the installed package (not repo imports) to validate actual npm tarball behavior.
// implements REQ-opencode-kibi-plugin-v1

import assert from "node:assert";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { after, before, describe, it } from "node:test";

import {
  createIsolatedInstall,
  installOpencodeTarball,
  resolveOpencodeTarball,
} from "./opencode-packed-utils.js";

const REPO_ROOT = resolve(process.cwd());

const CANONICAL_LANES = [
  ".kb/requirements",
  ".kb/scenarios",
  ".kb/tests",
  ".kb/adr",
  ".kb/flags",
  ".kb/events",
  ".kb/facts",
] as const;

function writeCanonicalManifest(workspaceDir: string): void {
  mkdirSync(join(workspaceDir, ".kb"), { recursive: true });
  writeFileSync(
    join(workspaceDir, ".kb", "manifest.json"),
    JSON.stringify({
      manifestVersion: 1,
      schemaVersion: 5,
      semanticAdvisorBackfill: "not_applicable",
    }),
    "utf8",
  );
}

function writeHealthyCanonicalLayout(workspaceDir: string): void {
  writeCanonicalManifest(workspaceDir);
  for (const dir of CANONICAL_LANES) {
    mkdirSync(join(workspaceDir, dir), { recursive: true });
  }
  writeFileSync(
    join(workspaceDir, ".kb", "symbols.yaml"),
    "symbols: []\n",
    "utf8",
  );
}

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

if (RUN_NODE_TEST_SUITE) {
  describe(
    "E2E: kibi-opencode bootstrap paths (canonical .kb/)",
    { timeout: 300000 },
    () => {
      let tmpDir: string;
      let installDir: string;
      let tarballPath: string;

      before(
        async () => {
          // Resolve tarball (either from KIBI_TEST_TARBALLS or fresh pack)
          const { tarballPath: tb, version } =
            resolveOpencodeTarball(REPO_ROOT);
          tarballPath = tb;
          if (process.env.KIBI_E2E_VERBOSE) {
            console.log(`  📦 Using tarball version: ${version}`);
          }

          // Create isolated install
          const isolated = createIsolatedInstall();
          tmpDir = isolated.tmpDir;
          installDir = isolated.installDir;

          // Install the tarball
          installOpencodeTarball(installDir, tarballPath);
        },
        { timeout: 240000 },
      );

      after(async () => {
        if (tmpDir) {
          rmSync(tmpDir, { recursive: true, force: true });
        }
      });

      it(
        "does not emit bootstrap warning for a healthy canonical .kb/ layout",
        { timeout: 60000 },
        async () => {
          const workspaceDir = join(tmpDir, "healthy-canonical");
          mkdirSync(workspaceDir, { recursive: true });
          writeHealthyCanonicalLayout(workspaceDir);

          const originalError = console.error;
          const errorLines: string[] = [];
          console.error = (...args: unknown[]) => {
            errorLines.push(args.map(String).join(" "));
          };

          try {
            const distIndex = join(
              installDir,
              "node_modules/kibi-opencode/dist/index.js",
            );
            const pkg = await import(distIndex);

            await pkg.default({
              worktree: workspaceDir,
              directory: workspaceDir,
            });

            console.error = originalError;

            const bootstrapLines = errorLines.filter(
              (line) =>
                line.includes("workspace needs Kibi bootstrap") ||
                line.includes("bootstrap-needed"),
            );

            assert.strictEqual(
              bootstrapLines.length,
              0,
              `Expected 0 bootstrap warnings for a healthy canonical .kb/ layout, got: ${bootstrapLines.join(", ")}`,
            );

            if (process.env.KIBI_E2E_VERBOSE) {
              console.log("  ✓ Healthy canonical layout: 0 bootstrap warnings");
            }
          } finally {
            console.error = originalError;
          }
        },
      );

      it(
        "emits exactly one bootstrap warning when canonical targets are missing",
        { timeout: 60000 },
        async () => {
          const workspaceDir = join(tmpDir, "missing-target");
          mkdirSync(workspaceDir, { recursive: true });
          writeCanonicalManifest(workspaceDir);
          mkdirSync(join(workspaceDir, ".kb/requirements"), {
            recursive: true,
          });

          const originalError = console.error;
          const errorLines: string[] = [];
          console.error = (...args: unknown[]) => {
            errorLines.push(args.map(String).join(" "));
          };

          try {
            const distIndex = join(
              installDir,
              "node_modules/kibi-opencode/dist/index.js",
            );
            const pkg = await import(distIndex);

            await pkg.default({
              worktree: workspaceDir,
              directory: workspaceDir,
            });

            console.error = originalError;

            const bootstrapLines = errorLines.filter(
              (line) =>
                line.includes("[kibi-opencode]") &&
                line.includes("workspace needs Kibi bootstrap"),
            );

            assert.strictEqual(
              bootstrapLines.length,
              1,
              `Expected exactly 1 bootstrap warning for missing canonical targets, got: ${bootstrapLines.length}. Lines: ${errorLines.join(" | ")}`,
            );

            if (process.env.KIBI_E2E_VERBOSE) {
              console.log(
                "  ✓ Missing canonical targets: exactly 1 bootstrap warning",
              );
            }
          } finally {
            console.error = originalError;
          }
        },
      );
    },
  );
}
