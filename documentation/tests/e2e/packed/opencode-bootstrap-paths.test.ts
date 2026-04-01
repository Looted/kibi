// E2E test: kibi-opencode bootstrap path behavior with relocated kibi-docs/*
//
// This test verifies the bootstrap warning behavior for workspaces with:
// - Healthy relocated paths (kibi-docs/requirements, etc. all present)
// - Missing targets (some configured paths are missing)
//
// Uses the installed package (not repo imports) to validate actual npm tarball behavior.

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

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

if (RUN_NODE_TEST_SUITE) {
  describe(
    "E2E: kibi-opencode bootstrap paths (relocated kibi-docs/*)",
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
        "does not emit bootstrap warning for healthy relocated paths",
        { timeout: 60000 },
        async () => {
          const workspaceDir = join(tmpDir, "healthy-relocated");
          mkdirSync(workspaceDir, { recursive: true });
          mkdirSync(join(workspaceDir, "kibi-docs/requirements"), {
            recursive: true,
          });
          mkdirSync(join(workspaceDir, "kibi-docs/scenarios"), {
            recursive: true,
          });
          mkdirSync(join(workspaceDir, "kibi-docs/tests"), { recursive: true });
          mkdirSync(join(workspaceDir, "kibi-docs/adr"), { recursive: true });
          mkdirSync(join(workspaceDir, "kibi-docs/flags"), { recursive: true });
          mkdirSync(join(workspaceDir, "kibi-docs/events"), {
            recursive: true,
          });
          mkdirSync(join(workspaceDir, "kibi-docs/facts"), { recursive: true });
          writeFileSync(
            join(workspaceDir, "kibi-docs/symbols.yaml"),
            "",
            "utf8",
          );

          // Create .kb directory first
          mkdirSync(join(workspaceDir, ".kb"), { recursive: true });

          // Write .kb/config.json with relocated paths
          writeFileSync(
            join(workspaceDir, ".kb/config.json"),
            JSON.stringify(
              {
                paths: {
                  requirements: "kibi-docs/requirements",
                  scenarios: "kibi-docs/scenarios",
                  tests: "kibi-docs/tests",
                  adr: "kibi-docs/adr",
                  flags: "kibi-docs/flags",
                  events: "kibi-docs/events",
                  facts: "kibi-docs/facts",
                  symbols: "kibi-docs/symbols.yaml",
                },
              },
              null,
              2,
            ),
            "utf8",
          );

          // Capture console.error output
          const originalError = console.error;
          const errorLines: string[] = [];
          console.error = (...args: unknown[]) => {
            errorLines.push(args.map(String).join(" "));
          };

          try {
            // Import and invoke the plugin
            const distIndex = join(
              installDir,
              "node_modules/kibi-opencode/dist/index.js",
            );
            const pkg = await import(distIndex);

            const mockInput = {
              worktree: workspaceDir,
              directory: workspaceDir,
            };

            await pkg.default(mockInput);

            // Restore console.error
            console.error = originalError;

            // Check that no bootstrap warning was emitted
            const bootstrapLines = errorLines.filter(
              (line) =>
                line.includes("workspace needs Kibi bootstrap") ||
                line.includes("bootstrap-needed"),
            );

            assert.strictEqual(
              bootstrapLines.length,
              0,
              `Expected 0 bootstrap warnings for healthy relocated paths, got: ${bootstrapLines.join(", ")}`,
            );

            if (process.env.KIBI_E2E_VERBOSE) {
              console.log("  ✓ Healthy relocated paths: 0 bootstrap warnings");
            }
          } finally {
            console.error = originalError;
          }
        },
      );

      it(
        "emits exactly one bootstrap warning when configured target is missing",
        { timeout: 60000 },
        async () => {
          const workspaceDir = join(tmpDir, "missing-target");
          mkdirSync(workspaceDir, { recursive: true });
          mkdirSync(join(workspaceDir, "kibi-docs/requirements"), {
            recursive: true,
          });
          // Note: Only create requirements - other directories are missing

          // Create .kb directory first
          mkdirSync(join(workspaceDir, ".kb"), { recursive: true });

          // Write .kb/config.json with relocated paths
          // (all except requirements are missing)
          writeFileSync(
            join(workspaceDir, ".kb/config.json"),
            JSON.stringify(
              {
                paths: {
                  requirements: "kibi-docs/requirements",
                  scenarios: "kibi-docs/scenarios",
                  tests: "kibi-docs/tests",
                  adr: "kibi-docs/adr",
                  flags: "kibi-docs/flags",
                  events: "kibi-docs/events",
                  facts: "kibi-docs/facts",
                  symbols: "kibi-docs/symbols.yaml",
                },
              },
              null,
              2,
            ),
            "utf8",
          );

          // Capture console.error output
          const originalError = console.error;
          const errorLines: string[] = [];
          console.error = (...args: unknown[]) => {
            errorLines.push(args.map(String).join(" "));
          };

          try {
            // Import and invoke the plugin
            const distIndex = join(
              installDir,
              "node_modules/kibi-opencode/dist/index.js",
            );
            const pkg = await import(distIndex);

            const mockInput = {
              worktree: workspaceDir,
              directory: workspaceDir,
            };

            await pkg.default(mockInput);

            // Restore console.error
            console.error = originalError;

            // Check that exactly one bootstrap warning was emitted
            const bootstrapLines = errorLines.filter(
              (line) =>
                line.includes("[kibi-opencode]") &&
                line.includes("workspace needs Kibi bootstrap"),
            );

            assert.strictEqual(
              bootstrapLines.length,
              1,
              `Expected exactly 1 bootstrap warning for missing targets, got: ${bootstrapLines.length}. Lines: ${errorLines.join(" | ")}`,
            );

            if (process.env.KIBI_E2E_VERBOSE) {
              console.log("  ✓ Missing targets: exactly 1 bootstrap warning");
            }
          } finally {
            console.error = originalError;
          }
        },
      );
    },
  );
}
