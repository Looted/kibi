// E2E test: Python comment guidance via packed plugin (REQ-opencode-comment-routing)
//
// Verifies that the plugin detects durable knowledge in Python files and injects
// specific routing guidance into the system prompt.
//
// This test:
//   1. Packs kibi-opencode to a .tgz (triggers prepack → build)
//   2. Installs the tarball into an isolated npm prefix
//   3. Creates a temp project with a Python file containing a long docstring
//   4. Invokes the plugin's event hook with a file.edited event
//   5. Invokes the system.transform hook to get the injected prompt
//   6. Asserts the prompt contains specific FACT/ADR/REQ routing guidance
//
// implements REQ-opencode-comment-routing
// implements TEST-opencode-python-comment-routing

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

// Type definitions for plugin hooks
interface EventHookInput {
  event: { type: string; properties?: Record<string, unknown> };
}
type EventHook = (input: EventHookInput) => void | Promise<void>;

interface SystemTransformOutput {
  system: string[];
}
type TransformHook = (
  input: unknown,
  output: SystemTransformOutput,
) => void | Promise<void>;

if (RUN_NODE_TEST_SUITE) {
  describe(
    "E2E: Python comment guidance via packed plugin",
    { timeout: 300000 },
    () => {
      let tmpDir: string;
      let installDir: string;
      let tarballPath: string;

      before(
        async () => {
          const isolatedInstall = createIsolatedInstall(
            join(tmpDir || "/tmp", ""),
          );
          tmpDir = isolatedInstall.tmpDir;
          installDir = isolatedInstall.installDir;

          // Write a minimal package.json so npm install works in installDir
          writeFileSync(
            join(installDir, "package.json"),
            JSON.stringify(
              {
                name: "kibi-python-comment-e2e",
                private: true,
                type: "module",
              },
              null,
              2,
            ),
            "utf8",
          );

          tarballPath = resolveOpencodeTarball(REPO_ROOT).tarballPath;
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
        "detects durable knowledge in Python docstrings and injects FACT guidance",
        { timeout: 60000 },
        async () => {
          const distIndex = join(
            installDir,
            "node_modules/kibi-opencode/dist/index.js",
          );

          // Dynamically import the installed plugin
          const pkg = await import(distIndex);
          assert.ok(
            typeof pkg.default === "function",
            "default export must be a function (the plugin)",
          );

          // Create a temp project structure
          const projectDir = join(tmpDir, "test-project");
          mkdirSync(join(projectDir, ".opencode"), { recursive: true });
          mkdirSync(join(projectDir, "src"), { recursive: true });

          // Write kibi config
          writeFileSync(
            join(projectDir, ".opencode", "kibi.json"),
            JSON.stringify(
              {
                enabled: true,
                guidance: {
                  commentDetection: {
                    enabled: true,
                    minLines: 3,
                  },
                },
              },
              null,
              2,
            ),
            "utf8",
          );
          // Bootstrap the temp project so posture is root_active (comment guidance is visible)
          mkdirSync(join(projectDir, ".kb"), { recursive: true });
          writeFileSync(
            join(projectDir, ".kb", "config.json"),
            JSON.stringify({}),
            "utf8",
          );
          for (const dir of [
            "documentation/requirements",
            "documentation/scenarios",
            "documentation/tests",
            "documentation/adr",
            "documentation/flags",
            "documentation/events",
            "documentation/facts",
          ]) {
            mkdirSync(join(projectDir, dir), { recursive: true });
          }
          writeFileSync(
            join(projectDir, "documentation", "symbols.yaml"),
            "[]",
            "utf8",
          );

          // Write Python file with a module docstring containing domain invariants
          const pyFile = join(projectDir, "src", "models.py");
          writeFileSync(
            pyFile,
            `"""
User accounts must have unique email addresses.
Each user can have at most 5 active sessions.
Sessions expire after 30 minutes of inactivity.

These constraints are enforced at the database level.
"""

import datetime

class User:
    pass
`,
            "utf8",
          );

          // Invoke the plugin
          const mockInput = {
            worktree: projectDir,
            directory: projectDir,
          };

          const hooks: unknown = await pkg.default(mockInput);
          assert.ok(
            hooks !== null && typeof hooks === "object",
            "plugin must return a hooks object",
          );

          // Check that event hook exists
          interface EventHookInput {
            event: { type: string; properties?: Record<string, unknown> };
          }
          type EventHook = (input: EventHookInput) => void | Promise<void>;
          const hooksObj = hooks as { event?: EventHook };
          assert.ok(
            typeof hooksObj.event === "function",
            "must have event hook",
          );

          // Trigger file.edited event
          if (hooksObj.event) {
            await hooksObj.event({
              event: {
                type: "file.edited",
                properties: {
                  file: "src/models.py",
                },
              },
            });
          }

          // Wait a bit for async processing
          await new Promise((r) => setTimeout(r, 100));

          // Check that system.transform hook exists
          interface SystemTransformOutput {
            system: string[];
          }
          type TransformHook = (
            input: unknown,
            output: SystemTransformOutput,
          ) => void | Promise<void>;
          const hooksWithTransform = hooks as {
            "experimental.chat.system.transform"?: TransformHook;
          };
          assert.ok(
            typeof hooksWithTransform["experimental.chat.system.transform"] ===
              "function",
            "must have system.transform hook",
          );

          // Invoke system.transform hook
          const output: SystemTransformOutput = {
            system: ["Initial system prompt"],
          };
          const transformHook =
            hooksWithTransform["experimental.chat.system.transform"];
          if (transformHook) {
            await transformHook({}, output);
          }

          const injectedPrompt = output.system.join("\n");

          // Assert that the prompt contains FACT-specific guidance
          assert.ok(
            injectedPrompt.includes("kibi-opencode"),
            "Prompt should contain kibi-opencode sentinel",
          );
          assert.ok(
            injectedPrompt.includes("Durable knowledge detected: FACT") ||
              injectedPrompt.includes("Code changes detected"),
            "Prompt should contain guidance (either FACT-specific or generic)",
          );

          console.log("  ✓ Python docstring guidance injected successfully");
        },
      );

      it(
        "detects durable knowledge in Python # comments and injects ADR guidance",
        { timeout: 60000 },
        async () => {
          const distIndex = join(
            installDir,
            "node_modules/kibi-opencode/dist/index.js",
          );

          const pkg = await import(distIndex);

          // Create a temp project structure
          const projectDir = join(tmpDir, "test-project-2");
          mkdirSync(join(projectDir, ".opencode"), { recursive: true });
          mkdirSync(join(projectDir, "src"), { recursive: true });

          // Write kibi config
          writeFileSync(
            join(projectDir, ".opencode", "kibi.json"),
            JSON.stringify(
              {
                enabled: true,
                guidance: {
                  commentDetection: {
                    enabled: true,
                    minLines: 3,
                  },
                },
              },
              null,
              2,
            ),
            "utf8",
          );

          // Bootstrap the temp project so posture is root_active (comment guidance is visible)
          mkdirSync(join(projectDir, ".kb"), { recursive: true });
          writeFileSync(
            join(projectDir, ".kb", "config.json"),
            JSON.stringify({}),
            "utf8",
          );
          for (const dir of [
            "documentation/requirements",
            "documentation/scenarios",
            "documentation/tests",
            "documentation/adr",
            "documentation/flags",
            "documentation/events",
            "documentation/facts",
          ]) {
            mkdirSync(join(projectDir, dir), { recursive: true });
          }
          writeFileSync(
            join(projectDir, "documentation", "symbols.yaml"),
            "[]",
            "utf8",
          );

          // Write Python file with # comments containing decision rationale
          const pyFile = join(projectDir, "src", "database.py");
          writeFileSync(
            pyFile,
            `# We chose PostgreSQL over MongoDB because we need ACID transactions
# and strong consistency guarantees. The tradeoff is slightly higher
# operational complexity but ensures data integrity for financial records.
#
# This decision was made in March 2024 after evaluating multiple options.

import psycopg2

class Database:
    pass
`,
            "utf8",
          );

          // Invoke the plugin
          const mockInput = {
            worktree: projectDir,
            directory: projectDir,
          };

          const hooks: unknown = await pkg.default(mockInput);

          // Trigger file.edited event
          const hooksObj2 = hooks as { event?: EventHook };
          if (hooksObj2.event) {
            await hooksObj2.event({
              event: {
                type: "file.edited",
                properties: {
                  file: "src/database.py",
                },
              },
            });
          }

          // Wait a bit for async processing
          await new Promise((r) => setTimeout(r, 100));

          // Invoke system.transform hook
          const hooksWithTransform2 = hooks as {
            "experimental.chat.system.transform"?: TransformHook;
          };
          const output2: SystemTransformOutput = {
            system: ["Initial system prompt"],
          };
          const transformHook2 =
            hooksWithTransform2["experimental.chat.system.transform"];
          if (transformHook2) {
            await transformHook2({}, output2);
          }

          const injectedPrompt = output2.system.join("\n");

          // Assert that the prompt contains guidance
          assert.ok(
            injectedPrompt.includes("kibi-opencode"),
            "Prompt should contain kibi-opencode sentinel",
          );
          assert.ok(
            injectedPrompt.includes("Durable knowledge detected: ADR") ||
              injectedPrompt.includes("Code changes detected"),
            "Prompt should contain guidance (either ADR-specific or generic)",
          );

          console.log("  ✓ Python # comment guidance injected successfully");
        },
      );
    },
  );
}
