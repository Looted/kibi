import {
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test,
} from "bun:test";
import { chmodSync, writeFileSync } from "node:fs";
import path from "node:path";
import { doctorCommand } from "../../src/commands/doctor.js";
import { initCommand } from "../../src/commands/init.js";
import { EngineClient } from "../../src/engine.js";
import * as envBootstrap from "../../src/env/bootstrap.js";
import { kibiPackageVersions } from "../../src/package-versions.js";
import * as installCheck from "../../src/plugins/plugin-install-check.js";
import * as projectConfig from "../../src/plugins/project-config.js";
import * as swipl from "../../src/prolog/swipl-resolver.js";
import * as branchResolver from "../../src/utils/branch-resolver.js";
import * as branchStore from "../../src/utils/branch-store.js";
import {
  captureIo,
  createGitWorkspace,
  isolateKibiEnv,
  removeTempDir,
  withCwd,
} from "../helpers/in-process-workspace.js";

const roots: string[] = [];
const restores: Array<() => void> = [];

type Check = {
  name: string;
  passed: boolean;
  warning?: boolean;
  message: string;
  remediation?: string;
  details?: Record<string, unknown>;
};

function stubSwipl(source: "path" | "bundled" = "bundled") {
  spyOn(swipl, "resolveSwipl").mockReturnValue({
    source,
    bin: "/opt/swipl/bin/swipl",
    version: "9.2.0",
  } as never);
  spyOn(swipl, "probeRequiredLibraries").mockReturnValue({
    kind: "ok",
  } as never);
}

beforeEach(() => {
  stubSwipl();
});

afterEach(() => {
  mock.restore();
  for (const restore of restores.splice(0)) restore();
  for (const root of roots.splice(0)) removeTempDir(root);
});

async function workspace(): Promise<string> {
  restores.push(isolateKibiEnv());
  const root = createGitWorkspace("main");
  roots.push(root);
  const io = captureIo({ stdio: true });
  try {
    await withCwd(root, () => initCommand({ hooks: true }));
  } finally {
    io.restore();
  }
  return root;
}

async function doctorChecks(root: string): Promise<Record<string, Check>> {
  const io = captureIo();
  try {
    await withCwd(root, () => doctorCommand({ format: "json" }));
  } finally {
    io.restore();
  }
  const report = JSON.parse(io.logs.join("\n")) as { checks: Check[] };
  return Object.fromEntries(report.checks.map((check) => [check.name, check]));
}

function hook(root: string, name: string, content: string, mode = 0o755) {
  const file = path.join(root, ".git", "hooks", name);
  writeFileSync(file, content);
  chmodSync(file, mode);
}

describe("doctorCommand text summary", () => {
  test("says the environment is ready when every check passes cleanly", async () => {
    const root = await workspace();
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(root, () => doctorCommand({}));
    expect(result).toStrictEqual({ exitCode: 0 });
    expect(io.logs.at(-1)).toBe(
      "All checks passed! Your environment is ready.",
    );
  });
});

describe("doctorCommand SWI-Prolog from PATH", () => {
  test("notes a missing bundled package", async () => {
    const root = await workspace();
    stubSwipl("path");
    spyOn(swipl, "inspectSwiplBundle").mockReturnValue({
      state: "missing",
      packageName: "swipl-bundle",
    } as never);
    const checks = await doctorChecks(root);
    expect(checks["SWI-Prolog"]?.message).toBe(
      "Version 9.2.0 from PATH at /opt/swipl/bin/swipl; required libraries load; bundled swipl-bundle is not installed (npm install --save-dev swipl-bundle)",
    );
  });

  test("ignores a bundle inspection failure", async () => {
    const root = await workspace();
    stubSwipl("path");
    spyOn(swipl, "inspectSwiplBundle").mockImplementation(() => {
      throw new Error("unreadable package");
    });
    const checks = await doctorChecks(root);
    expect(checks["SWI-Prolog"]?.message).toBe(
      "Version 9.2.0 from PATH at /opt/swipl/bin/swipl; required libraries load",
    );
  });
});

describe("doctorCommand capability plugins", () => {
  test("fails with the configuration error", async () => {
    const root = await workspace();
    spyOn(envBootstrap, "bootstrapKibiEnvironment").mockImplementation(() => {
      throw new Error("kibi.plugins must be an array");
    });
    const checks = await doctorChecks(root);
    expect(checks["Capability plugins"]).toStrictEqual({
      name: "Capability plugins",
      passed: false,
      message: "kibi.plugins must be an array",
      remediation:
        "Fix package.json kibi.plugins, then restart long-running Kibi MCP or client processes.",
    });
  });

  for (const [raw, expected] of [
    ["soon", "jev.timeoutMs=invalid"],
    ["999999", "jev.timeoutMs=invalid"],
    ["5000", "jev.timeoutMs=5000"],
  ] as const) {
    test(`reports the Jev timeout ${raw} as ${expected}`, async () => {
      const root = await workspace();
      process.env.KIBI_JEV_TIMEOUT_MS = raw;
      process.env.KIBI_JEV_MODEL = "jev-test";
      spyOn(
        projectConfig,
        "describeConfiguredCapabilityPlugins",
      ).mockReturnValue([
        {
          package: "kibi-plugin-jev",
          capability: "semantic",
          mode: "augment",
          declared: true,
        },
      ] as never);
      spyOn(projectConfig, "readProjectKibiConfig").mockReturnValue({
        plugins: [{ package: "kibi-plugin-jev" }],
      } as never);
      spyOn(installCheck, "pluginInstallProblems").mockReturnValue([]);
      const checks = await doctorChecks(root);
      expect(checks["Capability plugins"]?.message).toContain(
        `jev.model=jev-test; ${expected}`,
      );
    });
  }
});

describe("doctorCommand engine daemon", () => {
  const expected = kibiPackageVersions();

  test("reports an unreachable daemon without failing", async () => {
    const root = await workspace();
    spyOn(EngineClient.prototype, "inspectLiveDaemon").mockRejectedValue(
      new Error("socket refused"),
    );
    const checks = await doctorChecks(root);
    expect(checks["Engine daemon"]).toStrictEqual({
      name: "Engine daemon",
      passed: true,
      message: "Not reachable: socket refused",
      details: { running: false, expectedPackageVersions: expected },
    });
  });

  test("reports a daemon running this CLI's versions", async () => {
    const root = await workspace();
    spyOn(EngineClient.prototype, "inspectLiveDaemon").mockResolvedValue({
      packageVersions: expected,
      prologIdentity: "swipl 9",
    } as never);
    const checks = await doctorChecks(root);
    expect(checks["Engine daemon"]?.message).toBe(`Running ${expected}`);
    expect(checks["Engine daemon"]?.details).toMatchObject({
      running: true,
      branch: "main",
      packageVersions: expected,
      prologIdentity: "swipl 9",
    });
  });

  test("reports a daemon with other or unknown versions", async () => {
    const root = await workspace();
    const inspect = spyOn(EngineClient.prototype, "inspectLiveDaemon");
    inspect.mockResolvedValue({ packageVersions: "kibi-cli@0.0.1" } as never);
    let checks = await doctorChecks(root);
    expect(checks["Engine daemon"]?.message).toBe(
      `Running kibi-cli@0.0.1, not this CLI's ${expected}; the next Kibi command replaces it`,
    );
    expect(checks["Engine daemon"]?.remediation).toBe("Run: kibi engine stop");
    inspect.mockResolvedValue({} as never);
    checks = await doctorChecks(root);
    expect(checks["Engine daemon"]?.message).toBe(
      `Running a daemon that reports no package versions, not this CLI's ${expected}; the next Kibi command replaces it`,
    );
  });
});

describe("doctorCommand branch store", () => {
  test("does not check when branch resolution throws", async () => {
    const root = await workspace();
    const resolve = branchResolver.resolveBranchAttachment;
    // Throw only inside the branch store check, the one caller that guards
    // a throwing resolver; the other checks expect it to return.
    spyOn(branchResolver, "resolveBranchAttachment").mockImplementation(
      (...args: Parameters<typeof resolve>) => {
        if (new Error().stack?.includes("checkBranchStore"))
          throw new Error("git exploded");
        return resolve(...args);
      },
    );
    const checks = await doctorChecks(root);
    expect(checks["Branch store"]).toStrictEqual({
      name: "Branch store",
      passed: true,
      message: "Not checked: no current Git branch (git exploded)",
    });
  });

  test("asks for recovery of an incomplete store", async () => {
    const root = await workspace();
    spyOn(branchStore, "inspectBranchStore").mockReturnValue({
      path: "/store",
      state: "incomplete",
    } as never);
    const checks = await doctorChecks(root);
    expect(checks["Branch store"]).toStrictEqual({
      name: "Branch store",
      passed: false,
      message: "Store for main is incomplete: requires recovery",
      remediation: "Run: kibi branch recover, then kibi branch recover --apply",
      details: { branch: "main", path: "/store", state: "incomplete" },
    });
  });
});

describe("doctorCommand hook content", () => {
  test("fails a custom pre-commit hook that is not executable", async () => {
    const root = await workspace();
    hook(
      root,
      "pre-commit",
      "#!/bin/sh\nnpx kibi check-generated --staged --changed-only && npx kibi check --staged\n",
      0o644,
    );
    const checks = await doctorChecks(root);
    expect(checks["pre-commit hook"]?.passed).toBe(false);
    expect(checks["pre-commit hook"]?.message).toStartWith(
      "Installed but not executable",
    );
  });

  test("fails managed hooks that do not invoke kibi", async () => {
    const root = await workspace();
    const managed =
      "#!/bin/sh\n# BEGIN kibi-managed\necho nothing\n# END kibi-managed\n";
    hook(root, "pre-commit", managed);
    hook(root, "post-rewrite", managed);
    const checks = await doctorChecks(root);
    expect(checks["pre-commit hook"]).toMatchObject({
      passed: false,
      message: "pre-commit hook installed but does not invoke kibi",
      remediation: "Run: kibi init to install recommended hooks",
    });
    expect(checks["post-rewrite hook"]).toMatchObject({
      passed: false,
      message: "post-rewrite hook installed but does not invoke kibi",
      remediation: "Run: kibi init to install recommended hooks",
    });
  });
});
