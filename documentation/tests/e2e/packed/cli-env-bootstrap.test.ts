import assert from "node:assert";
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import {
  type Tarballs,
  type TestSandbox,
  createSandbox,
  packAll,
} from "./helpers.js";

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

/**
 * E2E: harness-independent Kibi env bootstrap.
 *
 * REQ-kibi-env-bootstrap-shared, -workspace-root and -doctor-attribution /
 * SCEN-kibi-env-bootstrap — process env wins over
 * project `.env.kibi`, blank values are unset, and workspace resolution honors
 * KIBI_WORKSPACE without importing third-party plugin packages from doctor.
 */
if (RUN_NODE_TEST_SUITE) {
  describe("E2E: Kibi env bootstrap", { timeout: 180000 }, () => {
    let tarballs: Tarballs;
    let sandbox: TestSandbox;

    before(
      async () => {
        tarballs = await packAll();
        sandbox = createSandbox();
        await sandbox.install(tarballs);
        await sandbox.initGitRepo();
        mkdirSync(join(sandbox.repoDir, ".kb"), { recursive: true });
      },
      { timeout: 180000 },
    );

    after(
      async () => {
        if (sandbox) await sandbox.cleanup();
      },
      { timeout: 60000 },
    );

    function loadRuntime() {
      const require = createRequire(join(sandbox.npmPrefix, "package.json"));
      return require("kibi-runtime") as {
        bootstrapKibiEnvironment: (options?: {
          env?: NodeJS.ProcessEnv;
          startDir?: string;
          xdgConfigHome?: string;
        }) => {
          sources: Record<string, string>;
          workspaceRoot: string;
        };
        resolveKibiWorkspaceRoot: (
          startDir?: string,
          env?: NodeJS.ProcessEnv,
        ) => string;
        resetKibiEnvironmentBootstrapStateForTests: () => void;
        secretSourceFromBootstrap: (
          key: string,
          bootstrap: { sources: Record<string, string> },
          env?: NodeJS.ProcessEnv,
        ) => string;
      };
    }

    it(
      "process wins over project .env.kibi and blank values stay unset",
      { timeout: 30000 },
      () => {
        const {
          bootstrapKibiEnvironment,
          resetKibiEnvironmentBootstrapStateForTests,
        } = loadRuntime();

        const env: NodeJS.ProcessEnv = {
          PATH: process.env.PATH,
          HOME: sandbox.homeDir,
          BOOT_PROCESS: "from-process",
        };
        writeFileSync(
          join(sandbox.repoDir, ".env.kibi"),
          [
            "BOOT_PROCESS=from-project",
            "BOOT_PROJECT=project-only",
            "BOOT_BLANK=",
          ].join("\n"),
        );
        const userRoot = join(sandbox.homeDir, ".config");
        mkdirSync(join(userRoot, "kibi"), { recursive: true });
        writeFileSync(
          join(userRoot, "kibi", "env"),
          "BOOT_USER=user-only\nBOOT_BLANK=user-value\n",
        );

        resetKibiEnvironmentBootstrapStateForTests();
        const result = bootstrapKibiEnvironment({
          env,
          startDir: sandbox.repoDir,
          xdgConfigHome: userRoot,
        });

        assert.strictEqual(env.BOOT_PROCESS, "from-process");
        assert.strictEqual(env.BOOT_PROJECT, "project-only");
        assert.strictEqual(env.BOOT_USER, "user-only");
        assert.strictEqual(env.BOOT_BLANK, "user-value");
        assert.strictEqual(result.sources.BOOT_PROCESS, "process");
        assert.strictEqual(result.sources.BOOT_PROJECT, "project_env");
        assert.strictEqual(result.sources.BOOT_USER, "user_env");
        assert.strictEqual(result.sources.BOOT_BLANK, "user_env");
        assert.ok(
          result.workspaceRoot.includes(sandbox.repoDir) ||
            result.workspaceRoot === sandbox.repoDir,
          `workspaceRoot should resolve to sandbox: ${result.workspaceRoot}`,
        );
      },
    );

    it(
      "KIBI_WORKSPACE overrides cwd for env and package discovery root",
      { timeout: 30000 },
      () => {
        const {
          resolveKibiWorkspaceRoot,
          resetKibiEnvironmentBootstrapStateForTests,
        } = loadRuntime();

        const other = join(sandbox.repoDir, "canonical-ws");
        mkdirSync(join(other, ".kb"), { recursive: true });
        const harness = join(sandbox.repoDir, "harness-cwd");
        mkdirSync(harness, { recursive: true });

        resetKibiEnvironmentBootstrapStateForTests();
        const resolved = resolveKibiWorkspaceRoot(harness, {
          KIBI_WORKSPACE: other,
        });
        assert.strictEqual(resolved, other);
      },
    );

    it(
      "a nested harness directory resolves to the enclosing workspace, never to itself",
      { timeout: 30000 },
      () => {
        const {
          bootstrapKibiEnvironment,
          resolveKibiWorkspaceRoot,
          resetKibiEnvironmentBootstrapStateForTests,
        } = loadRuntime();

        const harness = join(sandbox.repoDir, "tools", "harness");
        mkdirSync(harness, { recursive: true });
        writeFileSync(
          join(sandbox.repoDir, ".env.kibi"),
          "BOOT_NESTED=from-workspace\n",
        );
        const env: NodeJS.ProcessEnv = {
          PATH: process.env.PATH,
          HOME: sandbox.homeDir,
        };

        resetKibiEnvironmentBootstrapStateForTests();
        assert.strictEqual(
          resolveKibiWorkspaceRoot(harness, env),
          sandbox.repoDir,
        );
        const result = bootstrapKibiEnvironment({
          env,
          startDir: harness,
          xdgConfigHome: join(sandbox.homeDir, ".config"),
        });
        assert.strictEqual(result.workspaceRoot, sandbox.repoDir);
        assert.strictEqual(env.BOOT_NESTED, "from-workspace");
        assert.strictEqual(result.sources.BOOT_NESTED, "project_env");
      },
    );

    it(
      "doctor attributes a file-loaded secret to its file, not to the process",
      { timeout: 30000 },
      () => {
        const {
          bootstrapKibiEnvironment,
          resetKibiEnvironmentBootstrapStateForTests,
          secretSourceFromBootstrap,
        } = loadRuntime();

        writeFileSync(
          join(sandbox.repoDir, ".env.kibi"),
          "BOOT_FILE_SECRET=s3cret-from-file\n",
        );
        const env: NodeJS.ProcessEnv = {
          PATH: process.env.PATH,
          HOME: sandbox.homeDir,
          BOOT_SHELL_SECRET: "s3cret-from-shell",
        };

        resetKibiEnvironmentBootstrapStateForTests();
        const result = bootstrapKibiEnvironment({
          env,
          startDir: sandbox.repoDir,
          xdgConfigHome: join(sandbox.homeDir, ".config"),
        });
        // After the bootstrap both keys sit in the process env; attribution
        // still names where each one came from.
        assert.strictEqual(env.BOOT_FILE_SECRET, "s3cret-from-file");
        const fileSource = secretSourceFromBootstrap(
          "BOOT_FILE_SECRET",
          result,
          env,
        );
        assert.strictEqual(fileSource, "project_env");
        assert.strictEqual(
          secretSourceFromBootstrap("BOOT_SHELL_SECRET", result, env),
          "process",
        );
        assert.strictEqual(
          secretSourceFromBootstrap("BOOT_ABSENT_SECRET", result, env),
          "missing",
        );
        assert.ok(!fileSource.includes("s3cret"));
      },
    );
  });
}
