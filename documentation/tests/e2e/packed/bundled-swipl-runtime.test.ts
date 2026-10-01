import assert from "node:assert";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { after, before, describe, it } from "node:test";
import {
  type Tarballs,
  type TestSandbox,
  createSandbox,
  kibi,
  packAll,
  run,
  stageSourceFile,
} from "./helpers.js";
import { mcpToolPayload, startMcpStdioServer } from "./mcp-stdio-client.js";
import { writePackedInstallManifest } from "./packed-install-manifest.js";
import { hostSwiplPlatformPackage } from "./packed-packages.js";

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

// The bundled-runtime job sets this on runners that have no swipl anywhere.
// Other packed jobs run with a system swipl and skip this file.
const REQUIRED = process.env.KIBI_PACKED_REQUIRE_BUNDLED_SWIPL === "1";

function swiplOnPath(env: NodeJS.ProcessEnv): string | undefined {
  for (const dir of (env.PATH ?? "").split(delimiter)) {
    if (dir === "") continue;
    for (const name of ["swipl", "swipl.exe"]) {
      if (existsSync(join(dir, name))) return join(dir, name);
    }
  }
  return undefined;
}

function filesUnder(root: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const full = join(root, entry.name);
    if (entry.isDirectory()) found.push(...filesUnder(full));
    else found.push(full);
  }
  return found;
}

interface DoctorCheck {
  name: string;
  passed: boolean;
  message: string;
  details?: { source?: string; path?: string; version?: string };
}

function doctorSwiplCheck(stdout: string): DoctorCheck {
  const report = JSON.parse(stdout) as { checks: DoctorCheck[] };
  const check = report.checks.find((entry) => entry.name === "SWI-Prolog");
  assert.ok(check, `doctor must report a SWI-Prolog check: ${stdout}`);
  return check;
}

/**
 * E2E: the packed tarballs run Kibi on a machine with no SWI-Prolog at all.
 *
 * REQ-prolog-bundled-release — the published kibi-swipl-<platform> package,
 * installed from its packed tarball by npm, supplies the Prolog that init,
 * sync, check, doctor, and the MCP server use.
 */
if (RUN_NODE_TEST_SUITE && REQUIRED) {
  describe("E2E: bundled SWI-Prolog without a system install", () => {
    const platformPackage = hostSwiplPlatformPackage();
    let tarballs: Tarballs;
    let sandbox: TestSandbox;
    const extraDirs: string[] = [];

    before(
      async () => {
        tarballs = await packAll();
        assert.ok(
          tarballs.swiplPlatform,
          `the tarball set must carry ${platformPackage}`,
        );
        sandbox = createSandbox();
        await sandbox.install(tarballs);
        await sandbox.initGitRepo();
      },
      { timeout: 600000 },
    );

    after(
      async () => {
        if (sandbox) await sandbox.cleanup();
        for (const dir of extraDirs) {
          rmSync(dir, { recursive: true, force: true });
        }
      },
      { timeout: 60000 },
    );

    it("runs with no swipl on PATH and no KIBI_SWIPL override", () => {
      assert.strictEqual(sandbox.env.KIBI_SWIPL, undefined);
      assert.strictEqual(
        swiplOnPath(sandbox.env),
        undefined,
        "a system swipl would make this run prove nothing",
      );
    });

    it("installs the platform package with a complete, symlink-free runtime and no share/", () => {
      const packageRoot = join(
        sandbox.npmPrefix,
        "node_modules",
        platformPackage,
      );
      assert.ok(existsSync(join(packageRoot, "bin", "swipl")));
      assert.ok(existsSync(join(packageRoot, "build-manifest.json")));
      assert.ok(
        existsSync(join(packageRoot, "lib", "swipl", "boot.prc")),
        "the SWI home must be inside lib/swipl",
      );
      assert.strictEqual(
        existsSync(join(packageRoot, "share")),
        false,
        "share/ is not shipped; the runtime must not need it",
      );
      const links = filesUnder(packageRoot).filter((file) =>
        lstatSync(file).isSymbolicLink(),
      );
      assert.deepStrictEqual(
        links,
        [],
        "npm drops symlinks, so the payload must hold regular files",
      );
      const licenses = readdirSync(join(packageRoot, "licenses"));
      for (const needle of ["swi-prolog", "openssl", "pcre2", "zlib"]) {
        assert.ok(
          licenses.some((name) => name.toLowerCase().includes(needle)),
          `licenses/ must carry ${needle}`,
        );
      }
    });

    it("kibi doctor reports the bundled runtime and loads every required library", async () => {
      const result = await kibi(sandbox, ["doctor", "--format", "json"]);
      const check = doctorSwiplCheck(result.stdout);
      assert.strictEqual(check.passed, true, check.message);
      assert.strictEqual(check.details?.source, "bundled");
      assert.ok(
        check.details?.path?.startsWith(
          join(
            realpathSync(sandbox.npmPrefix),
            "node_modules",
            platformPackage,
          ),
        ),
        `bundled path must be inside the installed platform package: ${check.details?.path}`,
      );
      const manifest = JSON.parse(
        readFileSync(
          join(
            sandbox.npmPrefix,
            "node_modules",
            platformPackage,
            "build-manifest.json",
          ),
          "utf8",
        ),
      ) as { swiplVersion: string };
      assert.strictEqual(check.details?.version, manifest.swiplVersion);
    });

    it("kibi init, sync, and check succeed on the bundled runtime", async () => {
      const init = await kibi(sandbox, ["init"]);
      assert.strictEqual(init.exitCode, 0, `${init.stdout}${init.stderr}`);
      mkdirSync(join(sandbox.repoDir, ".kb", "requirements"), {
        recursive: true,
      });
      writeFileSync(
        join(sandbox.repoDir, ".kb", "requirements", "REQ-BUNDLED-SMOKE.md"),
        `---
id: REQ-BUNDLED-SMOKE
title: Bundled runtime smoke requirement
status: open
---

The bundled runtime compiles this requirement.
`,
      );
      stageSourceFile(sandbox, ".kb/requirements/REQ-BUNDLED-SMOKE.md");
      const sync = await kibi(sandbox, ["sync"]);
      assert.strictEqual(sync.exitCode, 0, `${sync.stdout}${sync.stderr}`);
      const check = await kibi(sandbox, ["check"]);
      assert.strictEqual(check.exitCode, 0, `${check.stdout}${check.stderr}`);
      const query = await kibi(sandbox, ["query", "req"]);
      assert.strictEqual(query.exitCode, 0, `${query.stdout}${query.stderr}`);
      assert.ok(
        query.stdout.includes("REQ-BUNDLED-SMOKE"),
        "the synced requirement must be answered by Prolog",
      );
    });

    it("kibi-mcp answers initialize, tools/list, and Prolog-backed tool calls", async () => {
      const server = await startMcpStdioServer({
        command: "node",
        args: [sandbox.kibiMcpBin],
        cwd: sandbox.repoDir,
        env: sandbox.env,
        timeoutMs: 120000,
      });
      try {
        const listed = await server.protocol("tools/list");
        const names = (listed.tools as { name: string }[]).map(
          (tool) => tool.name,
        );
        for (const expected of ["kb_query", "kb_check", "kb_status"]) {
          assert.ok(
            names.includes(expected),
            `tools/list must offer ${expected}`,
          );
        }
        const queried = await server.call("kb_query", { type: "req" });
        assert.notStrictEqual(queried.isError, true, JSON.stringify(queried));
        assert.ok(
          JSON.stringify(queried).includes("REQ-BUNDLED-SMOKE"),
          "kb_query must return the synced requirement from Prolog",
        );
        const checked = await server.call("kb_check", {});
        assert.notStrictEqual(checked.isError, true, JSON.stringify(checked));
        assert.ok(mcpToolPayload(checked));
      } finally {
        await server.close();
      }
    });

    it("an install that omits optional dependencies still installs, and Kibi explains the missing bundle", async () => {
      const prefix = mkdtempSync(join(tmpdir(), "kibi-no-optional-"));
      extraDirs.push(prefix);
      const { swiplPlatform: _omitted, ...withoutPlatform } = tarballs;
      writePackedInstallManifest(prefix, withoutPlatform as Tarballs);
      const install = await run(
        "npm",
        ["install", "--no-audit", "--omit=optional"],
        { cwd: prefix, env: sandbox.env, timeoutMs: 300000 },
      );
      assert.strictEqual(
        install.exitCode,
        0,
        `install must succeed without the platform package:\n${install.stdout}\n${install.stderr}`,
      );
      assert.strictEqual(
        existsSync(join(prefix, "node_modules", platformPackage)),
        false,
      );
      const kibiBin = join(prefix, "node_modules", ".bin", "kibi");
      const version = await run("node", [kibiBin, "--version"], {
        cwd: sandbox.repoDir,
        env: sandbox.env,
      });
      assert.strictEqual(version.exitCode, 0, version.stderr);
      const doctor = await run(
        "node",
        [kibiBin, "doctor", "--format", "json"],
        {
          cwd: sandbox.repoDir,
          env: sandbox.env,
        },
      );
      const check = doctorSwiplCheck(doctor.stdout);
      assert.strictEqual(check.passed, false);
      const explanation = `${check.message}\n${(check as { remediation?: string }).remediation ?? ""}`;
      for (const text of [
        "Detected platform",
        platformPackage,
        `npm install --save-dev ${platformPackage}`,
        "--omit=optional",
        "KIBI_SWIPL",
      ]) {
        assert.ok(
          explanation.includes(text),
          `doctor must explain the missing bundle (missing ${JSON.stringify(text)}): ${explanation}`,
        );
      }
      // The first Prolog-backed command fails with the same explanation
      // instead of a spawn error.
      const project = join(prefix, "project");
      mkdirSync(project);
      await run("git", ["init", "-b", "develop"], {
        cwd: project,
        env: sandbox.env,
      });
      const init = await run("node", [kibiBin, "init"], {
        cwd: project,
        env: sandbox.env,
      });
      assert.strictEqual(init.exitCode, 0, `${init.stdout}${init.stderr}`);
      const sync = await run("node", [kibiBin, "sync"], {
        cwd: project,
        env: sandbox.env,
      });
      assert.notStrictEqual(sync.exitCode, 0);
      const output = `${sync.stdout}${sync.stderr}`;
      assert.ok(
        output.includes(`npm install --save-dev ${platformPackage}`),
        output,
      );
      assert.ok(output.includes("Detected platform"), output);
    });
  });
}
