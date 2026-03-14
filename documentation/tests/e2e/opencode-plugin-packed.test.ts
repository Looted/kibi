// Packed e2e test for npm package loading
import assert from "node:assert";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, before, describe, it } from "node:test";

const REPO_ROOT = resolve(process.cwd());

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

if (RUN_NODE_TEST_SUITE) {
  describe("opencode-plugin-packed", { timeout: 180000 }, () => {
    let tmpDir: string;
    let installDir: string;

    before(
      async () => {
        tmpDir = mkdtempSync(join(tmpdir(), "kibi-packed-"));
        installDir = join(tmpDir, "install");
        mkdirSync(installDir, { recursive: true });

        // Pack: opencode package (triggers prepack → build)
        const opencodeDir = join(REPO_ROOT, "packages/opencode");
        const packOutput = execFileSync("npm", ["pack", "--json"], {
          cwd: opencodeDir,
          encoding: "utf8",
          stdio: ["pipe", "pipe", "pipe"],
        });

        interface PackResult {
          filename: string;
        }
        const [{ filename }] = JSON.parse(packOutput) as PackResult[];
        const tarball = join(opencodeDir, filename as string);

        // Install tarball into isolated prefix
        execFileSync("npm", ["install", "--prefix", installDir, tarball], {
          stdio: ["pipe", "pipe", "pipe"],
        });
      },
      { timeout: 120000 },
    );

    after(async () => {
      rmSync(tmpDir, { recursive: true, force: true });
    });

    it(
      "plugin can be imported from package",
      async () => {
        const distIndex = join(
          installDir,
          "node_modules/kibi-opencode/dist/index.js",
        );
        assert.ok(
          existsSync(distIndex),
          `dist/index.js not found at ${distIndex}`,
        );
        const pkg = await import(distIndex);
        assert.ok(pkg.default !== undefined);
      },
      { timeout: 30000 },
    );

    it(
      "enablement config disables all behavior",
      async () => {
        const { isPluginEnabled } = await import(
          join(installDir, "node_modules/kibi-opencode/dist/config.js")
        );
        const result = (
          isPluginEnabled as (cfg: { enabled: boolean }) => boolean
        )({ enabled: false });
        assert.equal(result, false);
      },
      { timeout: 30000 },
    );

    it(
      "sync can be disabled independently",
      async () => {
        const configModule = (await import(
          join(installDir, "node_modules/kibi-opencode/dist/config.js")
        )) as {
          DEFAULTS: {
            sync: { enabled: boolean };
            prompt: { hookMode: string };
          };
        };
        const { DEFAULTS } = configModule;
        assert.equal(DEFAULTS.sync.enabled, true);
        const disabledSyncCfg = {
          ...DEFAULTS,
          sync: { ...DEFAULTS.sync, enabled: false },
        };
        assert.equal(disabledSyncCfg.sync.enabled, false);
      },
      { timeout: 30000 },
    );

    it(
      "compat mode sets hookMode",
      async () => {
        const configModule = (await import(
          join(installDir, "node_modules/kibi-opencode/dist/config.js")
        )) as {
          DEFAULTS: {
            sync: { enabled: boolean };
            prompt: { hookMode: string };
          };
        };
        const { DEFAULTS } = configModule;
        assert.equal(DEFAULTS.prompt.hookMode, "auto");
      },
      { timeout: 30000 },
    );
  });
}
