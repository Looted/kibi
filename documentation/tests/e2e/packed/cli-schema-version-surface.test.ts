import assert from "node:assert";
import { after, before, describe, it } from "node:test";
import {
  type Tarballs,
  type TestSandbox,
  checkPrologAvailable,
  createSandbox,
  kibi,
  packAll,
  parseKibiResult,
} from "./helpers.js";

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

interface StatusJson {
  schemaStatus?: {
    status?: string;
    currentVersion?: number;
    latestVersion?: number;
    needsMigration?: boolean;
  };
}

/**
 * E2E: the packed CLI exposes the current KB schema version.
 *
 * SCEN-cli-config-schema-v1 — status reports the installed schema contract
 * as current, with the shipped version matching the latest known version.
 */
if (RUN_NODE_TEST_SUITE) {
  describe("E2E: CLI schema version surface", { timeout: 240000 }, () => {
    let tarballs: Tarballs;
    let sandbox: TestSandbox;
    let hasProlog = false;

    before(
      async () => {
        hasProlog = checkPrologAvailable();
        if (!hasProlog) return;
        tarballs = await packAll();
        sandbox = createSandbox();
        await sandbox.install(tarballs);
        await sandbox.initGitRepo();
        await kibi(sandbox, ["init"]);
      },
      { timeout: 180000 },
    );

    after(
      async () => {
        if (sandbox) await sandbox.cleanup();
      },
      { timeout: 60000 },
    );

    it(
      "reports a current schema version through status",
      { timeout: 120000 },
      async () => {
        if (!hasProlog) return;
        const status = await kibi(sandbox, ["status", "--format", "json"]);
        assert.strictEqual(status.exitCode, 0, `${status.stdout}${status.stderr}`);
        const parsed = parseKibiResult<StatusJson>(status.stdout);
        const schema = parsed.schemaStatus;
        assert.ok(schema, "status must expose schemaStatus");
        assert.strictEqual(
          schema.status,
          "current",
          `fresh workspace must report a current schema: ${JSON.stringify(schema)}`,
        );
        assert.strictEqual(schema.needsMigration, false);
        assert.ok(
          typeof schema.currentVersion === "number" && schema.currentVersion > 0,
          "currentVersion must be a positive number",
        );
        assert.strictEqual(
          schema.currentVersion,
          schema.latestVersion,
          "the shipped schema helpers must expose the latest known version",
        );
      },
    );
  });
}
