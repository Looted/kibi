import {
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test,
} from "bun:test";
import * as childProcess from "node:child_process";
import * as fs from "node:fs";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import * as nodeModule from "node:module";
import os from "node:os";
import path from "node:path";
import * as agentInstructions from "../src/commands/agent-instructions.js";
import {
  checkKibiRelease,
  detectExecuteApplyPlanExport,
  doctorCommand,
  doctorFailureCategory,
  nearestNamedPackageManifest,
  nextAncestorDirectory,
  packageMigrationActions,
} from "../src/commands/doctor.js";
import * as hookManagers from "../src/commands/hook-managers.js";
import * as hooksInstall from "../src/commands/hooks-install.js";
import * as initHelpers from "../src/commands/init-helpers.js";
import * as legacyStorage from "../src/commands/legacy-storage-migration.js";
import * as setupChoices from "../src/commands/setup-choices.js";
import { EngineClient } from "../src/engine.js";
import * as envBootstrap from "../src/env/bootstrap.js";
import * as kibiRelease from "../src/kibi-release.js";
import * as packageVersions from "../src/package-versions.js";
import * as installCheck from "../src/plugins/plugin-install-check.js";
import * as projectConfig from "../src/plugins/project-config.js";
import * as languageNote from "../src/plugins/reference-language-suggestion.js";
import * as swipl from "../src/prolog/swipl-resolver.js";
import * as updateCheck from "../src/update-check.js";
import * as telemetry from "../src/usage-telemetry.js";
import * as branchResolver from "../src/utils/branch-resolver.js";
import * as branchStore from "../src/utils/branch-store.js";
import * as gitContext from "../src/utils/git-repository-context.js";
import * as kbManifest from "../src/utils/kb-manifest.js";
import * as mergeDriver from "../src/utils/merge-driver-setup.js";
import { LATEST_KB_SCHEMA_VERSION } from "../src/utils/schema-version.js";

type Check = {
  name: string;
  passed: boolean;
  warning?: boolean;
  message: string;
  remediation?: string;
  details?: Record<string, unknown>;
};

type Report = {
  version: string;
  passed: boolean;
  warnings: number;
  runtime: Record<string, unknown>;
  checks: Check[];
  migrationPlan: { actions: Array<Record<string, unknown>> };
};

const ENV_KEYS = [
  "KIBI_WORKSPACE",
  "KIBI_PROJECT_ROOT",
  "KIBI_ROOT",
  "KIBI_JEV_MODEL",
  "KIBI_JEV_TIMEOUT_MS",
] as const;
const savedEnv = new Map<string, string | undefined>();
const roots: string[] = [];
let cwd = "";
let hooksDir = "";

function tempDir(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "kibi-doctor-"));
  roots.push(dir);
  return dir;
}

const CLI_ROOT = path.resolve(import.meta.dir, "..");
const CLI_PACKAGE = path.join(CLI_ROOT, "package.json");
const VERSIONS = "kibi-cli@1.0.0";

const CLEAN_RELEASE = {
  release: "2026.1",
  date: "2026-01-01",
  packages: { "kibi-cli": "1.0.0" },
  compatibility: {
    kbSchema: { current: 3 },
    operationProtocol: "p1",
    pluginApi: "api1",
  },
};

function context(overrides: Record<string, unknown> = {}) {
  return {
    worktreeRoot: cwd,
    gitDir: path.join(cwd, ".git"),
    commonGitDir: path.join(cwd, ".git"),
    effectiveHooksDir: hooksDir,
    isLinkedWorktree: false,
    hooksPathConfig: null,
    hooksPathOrigin: null,
    ...overrides,
  };
}

function choices(overrides: Record<string, unknown> = {}) {
  return {
    autoSync: true,
    prepareHooks: false,
    agentInstructions: false,
    ciGate: false,
    source: "defaults",
    recorded: {},
    ...overrides,
  };
}

function legacyPlan(overrides: Record<string, unknown> = {}) {
  return {
    moves: [],
    legacyConfig: "absent",
    schemaVersion: null,
    semanticAdvisorBackfill: null,
    removals: [],
    blockers: [],
    ...overrides,
  };
}

function stubs() {
  return {
    release: spyOn(kibiRelease, "readKibiRelease").mockReturnValue(
      CLEAN_RELEASE as never,
    ),
    cliVersion: spyOn(packageVersions, "cliVersion").mockReturnValue("1.0.0"),
    versions: spyOn(packageVersions, "kibiPackageVersions").mockReturnValue(
      VERSIONS,
    ),
    updates: spyOn(updateCheck, "checkKibiUpdates").mockResolvedValue({
      passed: true,
      message: "Up to date",
    } as never),
    resolveSwipl: spyOn(swipl, "resolveSwipl").mockReturnValue({
      source: "bundled",
      bin: "/opt/swipl",
      version: "9.2.0",
    } as never),
    probe: spyOn(swipl, "probeRequiredLibraries").mockReturnValue({
      kind: "ok",
    } as never),
    bundle: spyOn(swipl, "inspectSwiplBundle").mockReturnValue({
      state: "present",
      packageName: "swipl-pkg",
    } as never),
    manifest: spyOn(kbManifest, "readKbManifestStatus").mockReturnValue({
      state: "ok",
      manifest: { schemaVersion: LATEST_KB_SCHEMA_VERSION },
      manifestHash: null,
    } as never),
    legacy: spyOn(legacyStorage, "planLegacyStorageMigration").mockReturnValue(
      legacyPlan() as never,
    ),
    exec: spyOn(childProcess, "execSync").mockReturnValue(
      Buffer.from("") as never,
    ),
    attach: spyOn(branchResolver, "resolveBranchAttachment").mockReturnValue({
      kbBranch: "main",
    } as never),
    readAttach: spyOn(
      branchResolver,
      "resolveReadBranchAttachment",
    ).mockReturnValue({ kbBranch: "main" } as never),
    store: spyOn(branchStore, "inspectBranchStore").mockReturnValue({
      state: "ready",
      path: "/store",
    } as never),
    compilation: spyOn(branchStore, "branchStoreCompilation").mockReturnValue({
      compiled: true,
      generation: "g1",
    } as never),
    takeover: spyOn(branchStore, "storeLockTakeoverReason").mockReturnValue(
      null,
    ),
    uncompiled: spyOn(
      branchStore,
      "uncompiledBranchStoreReason",
    ).mockReturnValue(null),
    git: spyOn(gitContext, "resolveGitRepository").mockImplementation(
      () => ({ status: "ok", context: context() }) as never,
    ),
    managed: spyOn(initHelpers, "hasManagedHooks").mockReturnValue(false),
    outdated: spyOn(initHelpers, "outdatedManagedHooks").mockReturnValue([]),
    choices: spyOn(setupChoices, "readSetupChoices").mockReturnValue(
      choices() as never,
    ),
    section: spyOn(agentInstructions, "managedSectionState").mockReturnValue(
      "current" as never,
    ),
    prepare: spyOn(hooksInstall, "hasKibiPrepareScript").mockReturnValue(true),
    manager: spyOn(hookManagers, "detectHookManager").mockReturnValue(null),
    managerCommands: spyOn(hookManagers, "hookManagerCommands").mockReturnValue(
      [],
    ),
    gaps: spyOn(mergeDriver, "manifestMergeDriverGaps").mockReturnValue([]),
    mergeSetup: spyOn(mergeDriver, "mergeDriverSetup").mockReturnValue(
      "Run: setup",
    ),
    bootstrap: spyOn(envBootstrap, "bootstrapKibiEnvironment").mockReturnValue({
      workspaceRoot: "/ws",
    } as never),
    secret: spyOn(envBootstrap, "secretSourceFromBootstrap").mockReturnValue(
      "user_env" as never,
    ),
    plugins: spyOn(
      projectConfig,
      "describeConfiguredCapabilityPlugins",
    ).mockReturnValue([]),
    config: spyOn(projectConfig, "readProjectKibiConfig").mockReturnValue(
      {} as never,
    ),
    install: spyOn(installCheck, "pluginInstallProblems").mockReturnValue([]),
    language: spyOn(
      languageNote,
      "workspaceReferenceLanguageNote",
    ).mockReturnValue(null),
    inspect: spyOn(
      EngineClient.prototype,
      "inspectLiveDaemon",
    ).mockResolvedValue(null),
    terminate: spyOn(EngineClient.prototype, "terminate").mockResolvedValue(
      undefined,
    ),
    pid: spyOn(EngineClient.prototype, "getPid").mockReturnValue(4242),
    category: spyOn(telemetry, "noteCliErrorCategory").mockReturnValue(
      undefined as never,
    ),
  };
}

let s: ReturnType<typeof stubs>;
let logs: string[] = [];

beforeEach(() => {
  for (const key of ENV_KEYS) {
    savedEnv.set(key, process.env[key]);
    delete process.env[key];
  }
  cwd = tempDir();
  hooksDir = path.join(cwd, "hooks");
  mkdirSync(hooksDir);
  spyOn(process, "cwd").mockImplementation(() => cwd);
  s = stubs();
  logs = [];
  spyOn(console, "log").mockImplementation((...args: unknown[]) => {
    logs.push(args.map(String).join(" "));
  });
});

afterEach(() => {
  mock.restore();
  for (const [key, value] of savedEnv) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  savedEnv.clear();
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

async function report(): Promise<Report> {
  logs = [];
  const result = await doctorCommand({ format: "json" });
  const parsed = JSON.parse(logs.join("\n")) as Report;
  expect(result).toStrictEqual({ exitCode: parsed.passed ? 0 : 1 });
  return parsed;
}

async function check(name: string): Promise<Check | undefined> {
  return (await report()).checks.find((entry) => entry.name === name);
}

function hook(name: string, content: string, mode = 0o755): string {
  const file = path.join(hooksDir, name);
  // A previous mode may deny the owner write access when not running as root.
  rmSync(file, { force: true });
  writeFileSync(file, content);
  chmodSync(file, mode);
  return file;
}

const MANAGED_PRE =
  '# BEGIN kibi-managed\nKIBI_BIN=x\n"$KIBI_BIN" check --staged\n"$KIBI_BIN" check-generated --staged --changed-only\n# END kibi-managed\n';
const MANAGED_REWRITE =
  '# BEGIN kibi-managed\nKIBI_BIN=x\n"$KIBI_BIN" sync\n# END kibi-managed\n';

function installHooks(): void {
  hook("post-checkout", "x");
  hook("post-merge", "x");
  hook("pre-commit", MANAGED_PRE);
  hook("post-rewrite", MANAGED_REWRITE);
}

describe("doctor failure category", () => {
  test("name the failed checks in a fixed form", () => {
    expect(doctorFailureCategory([])).toBeUndefined();
    expect(
      doctorFailureCategory([
        { name: "Git hooks", passed: true },
        { name: ".kb/ directory", passed: false },
        { name: "Capability plugins!", passed: false },
      ]),
    ).toBe("doctor:kb_directory+capability_plugins");
  });
});

describe("apply plan export", () => {
  test("detect the export, its absence and a failed load", async () => {
    expect(await detectExecuteApplyPlanExport()).toBe(true);
    expect(
      await detectExecuteApplyPlanExport(async () => ({
        executeApplyPlan: () => undefined,
      })),
    ).toBe(true);
    expect(
      await detectExecuteApplyPlanExport(async () => ({
        executeApplyPlan: "nope",
      })),
    ).toBe(false);
    expect(
      await detectExecuteApplyPlanExport(async () => {
        throw new Error("missing");
      }),
    ).toBe(false);
  });
});

describe("package migration actions", () => {
  const ids = async (runtime: Record<string, unknown>) =>
    (await packageMigrationActions(runtime)).map((action) => action.id);

  test("report nothing for a coordinated install", async () => {
    expect(
      await packageMigrationActions({
        cliVersion: "1.2.3",
        coreVersion: "1.0.0",
        mcpVersion: "1.0.0",
        mcpCliRange: "^1.2.3",
        executeApplyPlanExported: true,
      }),
    ).toStrictEqual([]);
  });

  test("ask for a coordinated install when versions are unresolved", async () => {
    const [action] = await packageMigrationActions({
      cliVersion: "unknown",
      coreVersion: "unresolved",
      mcpVersion: "2.0.0",
    });
    expect(action).toMatchObject({
      id: "package-provenance-unresolved",
      code: "package_provenance_unresolved",
      category: "package",
      safety: "operator",
      invocation: {
        kind: "review",
        instruction:
          "Install one coordinated Kibi artifact set and rerun kibi doctor; Kibi never selects a package manager or rewrites dependency configuration.",
      },
      evidence: { unresolvedVersions: ["cliVersion", "coreVersion"] },
      dispositionRequired: true,
    });
    expect(await ids({ mcpVersion: "unknown" })).toStrictEqual([
      "package-provenance-unresolved",
    ]);
  });

  test("flag an MCP range that excludes the CLI", async () => {
    const [action] = await packageMigrationActions({
      cliVersion: "1.2.2",
      mcpCliRange: " ^1.2.3",
    });
    expect(action).toMatchObject({
      id: "package-mcp-cli-range-mismatch",
      code: "package_dependency_range_mismatch",
      category: "package",
      safety: "operator",
      invocation: {
        kind: "review",
        instruction:
          "Install a newly versioned coordinated Kibi package set whose MCP CLI dependency range includes the installed CLI; project-local overrides are temporary and Kibi never edits dependency configuration.",
      },
      evidence: { cliVersion: "1.2.2", mcpCliRange: " ^1.2.3" },
      dispositionRequired: true,
    });
  });

  test("compare caret ranges by major, minor and patch", async () => {
    const mismatch = async (cliVersion: unknown, mcpCliRange: unknown) =>
      (await ids({ cliVersion, mcpCliRange })).includes(
        "package-mcp-cli-range-mismatch",
      );
    expect(await mismatch("1.2.3", "^1.2.3")).toBe(false);
    expect(await mismatch("1.2.4", "^1.2.3")).toBe(false);
    expect(await mismatch("1.3.0", "^1.2.3")).toBe(false);
    expect(await mismatch("1.1.9", "^1.2.3")).toBe(true);
    expect(await mismatch("2.2.3", "^1.2.3")).toBe(true);
    expect(await mismatch("0.2.3", "^1.2.3")).toBe(true);
    expect(await mismatch("x1.2.3", "^1.2.3")).toBe(true);
    expect(await mismatch("1.2.3", "~1.2.3")).toBe(false);
    expect(await mismatch("1.2.3", "^1.2")).toBe(false);
    expect(await mismatch("1.2.3", "x^1.2.3")).toBe(false);
    expect(await mismatch("1.2.3", "^1.2.30")).toBe(true);
    expect(await mismatch("1.20.3", "^1.2.3")).toBe(false);
    expect(await mismatch("10.2.3", "^1.2.3")).toBe(true);
    expect(await mismatch("1.2.3", "x^1.2.4")).toBe(false);
    expect(await mismatch("9.2.3", "^10.2.3")).toBe(true);
    expect(await mismatch("1.3.0", "^1.20.3")).toBe(true);
    expect(await mismatch("10.2.3", "^10.2.3")).toBe(false);
    expect(await mismatch("1.2.30", "^1.2.30")).toBe(false);
    expect(await mismatch("unknown", "^9.0.0")).toBe(false);
    expect(await mismatch("1.0.0", "unknown")).toBe(false);
    expect(await mismatch(1, "^9.0.0")).toBe(false);
    expect(await mismatch("1.0.0", 9)).toBe(false);
  });

  test("flag drift in the exported operations", async () => {
    const [action] = await packageMigrationActions({
      executeApplyPlanExported: false,
    });
    expect(action).toMatchObject({
      id: "package-cli-export-surface-drift",
      code: "package_export_surface_drift",
      category: "package",
      safety: "operator",
      invocation: {
        kind: "review",
        instruction:
          "Treat same-version artifacts with different exports as a release defect: obtain a newly versioned CLI/MCP pair and do not downgrade receipts or hand-edit package metadata.",
      },
      evidence: { executeApplyPlanExported: false },
      dispositionRequired: true,
    });
    expect(await ids({ executeApplyPlanExported: undefined })).toStrictEqual(
      [],
    );
  });
});

describe("package manifests", () => {
  test("walk up to the filesystem root", () => {
    expect(nextAncestorDirectory("/a/b")).toBe("/a");
    expect(nextAncestorDirectory("/")).toBeUndefined();
  });

  test("find the nearest manifest with the package name", () => {
    const root = tempDir();
    const inner = path.join(root, "pkg", "dist", "lib");
    mkdirSync(inner, { recursive: true });
    writeFileSync(path.join(root, "package.json"), '{"name":"wanted"}');
    writeFileSync(path.join(root, "pkg", "package.json"), '{"name":"other"}');
    writeFileSync(path.join(root, "pkg", "dist", "package.json"), "{bad");
    expect(nearestNamedPackageManifest(inner, "wanted")).toBe(
      path.join(root, "package.json"),
    );
    expect(nearestNamedPackageManifest(inner, "other")).toBe(
      path.join(root, "pkg", "package.json"),
    );
    expect(nearestNamedPackageManifest(inner, "absent")).toBeUndefined();
  });
});

describe("kibi release", () => {
  test("warn without a release manifest", () => {
    expect(checkKibiRelease(null)).toStrictEqual({
      passed: true,
      warning: true,
      message:
        "No release manifest: the installed kibi-core predates Kibi release versions or is damaged",
      remediation:
        "Install the kibi-cli, kibi-mcp and kibi-core versions of one Kibi release (see the kibi@<release> GitHub releases).",
      details: { release: null },
    });
  });

  test("report a matching install", () => {
    const release = {
      ...CLEAN_RELEASE,
      packages: { "kibi-cli": "1.0.0", "kibi-mcp": "2.0.0" },
    };
    expect(
      checkKibiRelease(release as never, (name) =>
        name === "kibi-cli" ? "1.0.0" : undefined,
      ),
    ).toStrictEqual({
      passed: true,
      message: "Kibi 2026.1 (KB schema 3, protocol p1, api1)",
      details: {
        release: "2026.1",
        date: "2026-01-01",
        compatibility: CLEAN_RELEASE.compatibility,
        installed: { "kibi-cli": "1.0.0" },
        mismatches: [],
      },
    });
  });

  test("warn about a mixed install", () => {
    const release = {
      ...CLEAN_RELEASE,
      packages: { "kibi-cli": "1.0.0", "kibi-mcp": "2.0.0" },
    };
    const result = checkKibiRelease(release as never, (name) =>
      name === "kibi-cli" ? "1.1.0" : "2.1.0",
    );
    expect(result).toStrictEqual({
      passed: true,
      warning: true,
      message:
        "Mixed install for Kibi 2026.1: kibi-cli 1.1.0 (release lists 1.0.0), kibi-mcp 2.1.0 (release lists 2.0.0)",
      remediation:
        "Install the package versions Kibi 2026.1 lists, or upgrade all Kibi packages together.",
      details: {
        release: "2026.1",
        date: "2026-01-01",
        compatibility: CLEAN_RELEASE.compatibility,
        installed: { "kibi-cli": "1.1.0", "kibi-mcp": "2.1.0" },
        mismatches: [
          { name: "kibi-cli", installed: "1.1.0", listed: "1.0.0" },
          { name: "kibi-mcp", installed: "2.1.0", listed: "2.0.0" },
        ],
      },
    });
  });

  test("read installed versions by default", () => {
    const release = {
      ...CLEAN_RELEASE,
      packages: { "kibi-cli": "1.0.0", "kibi-core": "0.0.0-none" },
    };
    const result = checkKibiRelease(release as never);
    const core = JSON.parse(
      fs.readFileSync(
        path.join(CLI_ROOT, "..", "core", "package.json"),
        "utf8",
      ),
    ).version as string;
    expect(result.details?.installed).toStrictEqual({
      "kibi-cli": "1.0.0",
      "kibi-core": core,
    });
  });

  test("leave unresolved versions out of the install", () => {
    s.cliVersion.mockReturnValue("1.0.0");
    spyOn(nodeModule, "createRequire").mockReturnValue({
      resolve: () => {
        throw new Error("absent");
      },
    } as never);
    const exists = fs.existsSync;
    spyOn(fs, "existsSync").mockImplementation((file) =>
      String(file).endsWith(path.join("nowhere", "package.json"))
        ? false
        : exists(file),
    );
    const release = {
      ...CLEAN_RELEASE,
      packages: { "kibi-cli": "1.0.0", "kibi-nowhere": "1.0.0" },
    };
    expect(checkKibiRelease(release as never).details?.installed).toStrictEqual(
      { "kibi-cli": "1.0.0" },
    );
  });

  test("leave an unknown installed version out", () => {
    const root = tempDir();
    const manifest = path.join(root, "package.json");
    writeFileSync(manifest, "{}");
    spyOn(nodeModule, "createRequire").mockReturnValue({
      resolve: () => manifest,
    } as never);
    const release = {
      ...CLEAN_RELEASE,
      packages: { "kibi-cli": "1.0.0", "kibi-core": "1.0.0" },
    };
    expect(checkKibiRelease(release as never).details?.installed).toStrictEqual(
      { "kibi-cli": "1.0.0" },
    );
  });
});

describe("installed package resolution", () => {
  function fakeRequire(resolve: (id: string) => string): void {
    spyOn(nodeModule, "createRequire").mockReturnValue({ resolve } as never);
  }
  const release = {
    ...CLEAN_RELEASE,
    packages: { "kibi-cli": "1.0.0", "kibi-mcp": "1.0.0" },
  };
  const installed = () =>
    checkKibiRelease(release as never).details?.installed as Record<
      string,
      string
    >;
  const sibling = JSON.parse(
    fs.readFileSync(path.join(CLI_ROOT, "..", "mcp", "package.json"), "utf8"),
  ).version as string;

  test("walk up from the entrypoint when the manifest is hidden", () => {
    const root = tempDir();
    mkdirSync(path.join(root, "dist"));
    writeFileSync(
      path.join(root, "package.json"),
      '{"name":"kibi-mcp","version":"7.7.7"}',
    );
    const requested: string[] = [];
    fakeRequire((id) => {
      requested.push(id);
      if (id.endsWith("/package.json")) throw new Error("not exported");
      return path.join(root, "dist", "index.js");
    });
    expect(installed()).toStrictEqual({
      "kibi-cli": "1.0.0",
      "kibi-mcp": "7.7.7",
    });
    expect(requested).toStrictEqual(["kibi-mcp/package.json", "kibi-mcp"]);
  });

  test("skip an unreadable manifest and an unnamed entrypoint", () => {
    const root = tempDir();
    mkdirSync(path.join(root, "dist"));
    writeFileSync(path.join(root, "package.json"), '{"name":"other"}');
    fakeRequire((id) =>
      id.endsWith("/package.json")
        ? path.join(root, "missing.json")
        : path.join(root, "dist", "index.js"),
    );
    expect(installed()["kibi-mcp"]).toBe(sibling);
  });

  test("skip an entrypoint manifest that cannot be read", () => {
    const root = tempDir();
    mkdirSync(path.join(root, "dist"));
    writeFileSync(path.join(root, "package.json"), '{"name":"kibi-mcp"}');
    const manifest = path.join(root, "package.json");
    const read = fs.readFileSync;
    let reads = 0;
    spyOn(fs, "readFileSync").mockImplementation(((
      file: fs.PathOrFileDescriptor,
      ...rest: unknown[]
    ) => {
      if (file === manifest && ++reads === 2) throw new Error("EIO");
      return (read as (...args: unknown[]) => unknown)(file, ...rest);
    }) as never);
    fakeRequire((id) => {
      if (id.endsWith("/package.json")) throw new Error("not exported");
      return path.join(root, "dist", "index.js");
    });
    expect(installed()["kibi-mcp"]).toBe(sibling);
    expect(reads).toBe(2);
  });

  test("give up when the sibling manifest is unreadable", () => {
    const local = path.join(CLI_ROOT, "..", "mcp", "package.json");
    const read = fs.readFileSync;
    spyOn(fs, "readFileSync").mockImplementation(((
      file: fs.PathOrFileDescriptor,
      ...rest: unknown[]
    ) => {
      if (file === local) throw new Error("EIO");
      return (read as (...args: unknown[]) => unknown)(file, ...rest);
    }) as never);
    fakeRequire(() => {
      throw new Error("absent");
    });
    expect(installed()).toStrictEqual({ "kibi-cli": "1.0.0" });
  });

  test("read the version, entrypoint and dependencies of a manifest", async () => {
    const root = tempDir();
    const manifest = path.join(root, "package.json");
    fakeRequire(() => manifest);
    writeFileSync(
      manifest,
      '{"version":"3.0.0","main":"lib/index.js","dependencies":{"kibi-cli":"^1.0.0"}}',
    );
    let runtime = (await report()).runtime;
    let locations = runtime.locations as Record<string, string>;
    expect(runtime.coreVersion).toBe("3.0.0");
    expect(runtime.mcpCliRange).toBe("^1.0.0");
    expect(locations.core).toBe(manifest);
    expect(locations.coreEntrypoint).toBe(path.join(root, "lib", "index.js"));
    expect(locations.mcpEntrypoint).toBe(path.join(root, "lib", "index.js"));
    writeFileSync(manifest, '{"version":3,"main":1,"dependencies":"x"}');
    runtime = (await report()).runtime;
    locations = runtime.locations as Record<string, string>;
    expect(runtime.coreVersion).toBe("unknown");
    expect(runtime.mcpCliRange).toBe("unknown");
    expect(locations.coreEntrypoint).toBe("unknown");
    writeFileSync(manifest, '{"dependencies":{}}');
    expect((await report()).runtime.mcpCliRange).toBe("unknown");
    writeFileSync(manifest, '{"dependencies":null}');
    expect((await report()).runtime.mcpCliRange).toBe("unknown");
  });

  test("report unresolved packages", async () => {
    fakeRequire(() => {
      throw new Error("absent");
    });
    const exists = fs.existsSync;
    spyOn(fs, "existsSync").mockImplementation((file) =>
      String(file).endsWith(`${path.sep}package.json`) &&
      !String(file).startsWith(cwd)
        ? false
        : exists(file),
    );
    const result = await report();
    const locations = result.runtime.locations as Record<string, string>;
    expect(result.runtime.coreVersion).toBe("unresolved");
    expect(result.runtime.mcpVersion).toBe("unresolved");
    expect(result.runtime.mcpCliRange).toBe("unknown");
    expect(locations.core).toBe("unresolved");
    expect(locations.coreEntrypoint).toBe("unresolved");
    expect(locations.mcp).toBe("unresolved");
    expect(locations.mcpEntrypoint).toBe("unresolved");
    expect(
      result.migrationPlan.actions.map((action) => action.id),
    ).toStrictEqual(["package-provenance-unresolved"]);
  });
});

describe("doctor report", () => {
  test("list every check in order with the runtime", async () => {
    installHooks();
    mkdirSync(path.join(cwd, ".kb"));
    const result = await report();
    expect(result.checks.map((entry) => entry.name)).toStrictEqual([
      "Kibi release",
      "Kibi updates",
      "SWI-Prolog",
      ".kb/ directory",
      ".kb/ manifest",
      "Canonical storage",
      "Git repository",
      "Branch store",
      "Git hooks",
      "pre-commit hook",
      "post-rewrite hook",
      "Kibi-managed hook sections",
      "Fresh-clone setup",
      "Manifest merge driver",
      "Capability plugins",
      "Engine daemon",
    ]);
    expect(result.version).toBe("kibi.doctor.v1");
    expect(result.passed).toBe(true);
    expect(result.warnings).toBe(0);
    expect(result.checks.filter((entry) => !entry.passed)).toStrictEqual([]);
    expect(s.category).toHaveBeenCalledWith(undefined);
    expect(s.updates).toHaveBeenCalledWith({
      currentVersion: "1.0.0",
      currentKbSchema: LATEST_KB_SCHEMA_VERSION,
    });
    const cli = JSON.parse(fs.readFileSync(CLI_PACKAGE, "utf8"));
    const core = JSON.parse(
      fs.readFileSync(
        path.join(CLI_ROOT, "..", "core", "package.json"),
        "utf8",
      ),
    );
    const mcp = JSON.parse(
      fs.readFileSync(path.join(CLI_ROOT, "..", "mcp", "package.json"), "utf8"),
    );
    const runtime = result.runtime;
    expect(runtime.cliVersion).toBe(cli.version);
    expect(runtime.coreVersion).toBe(core.version);
    expect(runtime.mcpVersion).toBe(mcp.version);
    expect(runtime.coreRange).toBe(cli.dependencies["kibi-core"]);
    expect(runtime.mcpCliRange).toBe(
      mcp.dependencies?.["kibi-cli"] ?? "unknown",
    );
    expect(runtime.executeApplyPlanExported).toBe(true);
    expect(runtime.entrypoint).toBe(process.argv[1] as string);
    expect(runtime.packageVersions).toBe(VERSIONS);
    expect(runtime.release).toStrictEqual(CLEAN_RELEASE);
    const locations = runtime.locations as Record<string, string>;
    expect(locations.cli).toBe(CLI_PACKAGE);
    expect(locations.cliEntrypoint).toBe(process.argv[1] as string);
    const resolve = nodeModule.createRequire(import.meta.url).resolve;
    expect(fs.realpathSync(locations.core as string)).toBe(
      fs.realpathSync(resolve("kibi-core/package.json")),
    );
    expect(locations.coreEntrypoint).toBe(
      path.resolve(path.dirname(locations.core as string), core.main),
    );
    expect(fs.realpathSync(locations.mcp as string)).toBe(
      fs.realpathSync(resolve("kibi-mcp/package.json")),
    );
    expect(result.migrationPlan.actions).toStrictEqual([]);
    const plan = result.migrationPlan as unknown as {
      expected: unknown;
      scope: { evaluatedDomains: string[] };
    };
    expect(plan.expected).toStrictEqual({
      branch: null,
      kbBranch: null,
      kbSnapshotId: null,
      workspaceSnapshot: null,
      configHash: null,
    });
    expect(plan.scope.evaluatedDomains).toStrictEqual(["package"]);
  });

  test("record a missing release and unknown entrypoint", async () => {
    s.release.mockReturnValue(undefined as never);
    const argv = process.argv;
    process.argv = [argv[0] as string];
    try {
      const runtime = (await report()).runtime;
      expect(runtime.release).toBeNull();
      expect(runtime.entrypoint).toBe("unknown");
      expect((runtime.locations as Record<string, string>).cliEntrypoint).toBe(
        "unknown",
      );
    } finally {
      process.argv = argv;
    }
  });

  test("keep the runtime when the CLI manifest is unreadable", async () => {
    const read = fs.readFileSync;
    spyOn(fs, "readFileSync").mockImplementation(((
      file: fs.PathOrFileDescriptor,
      ...rest: unknown[]
    ) => {
      if (file === CLI_PACKAGE) throw new Error("EACCES");
      return (read as (...args: unknown[]) => unknown)(file, ...rest);
    }) as never);
    const runtime = (await report()).runtime;
    expect(runtime.cliVersion).toBe("unknown");
    expect(runtime.coreRange).toBe("unknown");
  });

  test("report a CLI manifest without versions or dependencies", async () => {
    const read = fs.readFileSync;
    let manifest = '{"version":1,"dependencies":"x"}';
    spyOn(fs, "readFileSync").mockImplementation(((
      file: fs.PathOrFileDescriptor,
      ...rest: unknown[]
    ) => {
      if (file === CLI_PACKAGE) return manifest;
      return (read as (...args: unknown[]) => unknown)(file, ...rest);
    }) as never);
    let runtime = (await report()).runtime;
    expect(runtime.cliVersion).toBe("unknown");
    expect(runtime.coreRange).toBe("unknown");
    manifest = '{"version":"1.0.0","dependencies":{}}';
    runtime = (await report()).runtime;
    expect(runtime.cliVersion).toBe("1.0.0");
    expect(runtime.coreRange).toBe("unknown");
    manifest = '{"version":"1.0.0"}';
    runtime = (await report()).runtime;
    expect(runtime.coreRange).toBe("unknown");
  });

  test("print a table with marks and remediation", async () => {
    s.updates.mockResolvedValue({
      passed: true,
      warning: true,
      message: "Update available",
      remediation: "Run: upgrade",
    } as never);
    s.inspect.mockResolvedValue({ packageVersions: "old" } as never);
    installHooks();
    mkdirSync(path.join(cwd, ".kb"));
    expect(await doctorCommand()).toStrictEqual({ exitCode: 0 });
    expect(logs).toStrictEqual([
      "Kibi Environment Diagnostics\n",
      "✓ Kibi release: Kibi 2026.1 (KB schema 3, protocol p1, api1)",
      "! Kibi updates: Update available",
      "  → Run: upgrade",
      "✓ SWI-Prolog: Version 9.2.0 from the bundled build at /opt/swipl; required libraries load",
      "✓ .kb/ directory: Found",
      `✓ .kb/ manifest: schemaVersion ${LATEST_KB_SCHEMA_VERSION}`,
      "✓ Canonical storage: Canonical .kb/ layout",
      "✓ Git repository: Found",
      "✓ Branch store: Compiled for main (g1)",
      "✓ Git hooks: Installed and executable",
      "✓ pre-commit hook: Installed and executable (resolves kibi CLI; uses 'kibi check --staged')",
      "✓ post-rewrite hook: Installed and executable",
      "✓ Kibi-managed hook sections: Not installed (optional)",
      "✓ Fresh-clone setup: Skipped: Kibi is not initialized here",
      "✓ Manifest merge driver: Configured",
      "✓ Capability plugins: None configured; builtin providers only",
      `✓ Engine daemon: Running old, not this CLI's ${VERSIONS}; the next Kibi command replaces it`,
      "",
      "All required checks passed, with 1 warning(s) above (marked !).",
    ]);
  });

  test("print a clean table", async () => {
    installHooks();
    mkdirSync(path.join(cwd, ".kb"));
    expect(await doctorCommand({ format: "table" })).toStrictEqual({
      exitCode: 0,
    });
    expect(logs.at(-1)).toBe("All checks passed! Your environment is ready.");
    expect(logs.at(-2)).toBe("");
  });

  test("print failures with and without remediation", async () => {
    s.updates.mockResolvedValue({
      passed: false,
      message: "Broken",
    } as never);
    s.exec.mockImplementation(() => {
      throw new Error("not git");
    });
    s.inspect.mockResolvedValue({ packageVersions: "old" } as never);
    expect(await doctorCommand()).toStrictEqual({ exitCode: 1 });
    expect(logs).toContain("✗ Kibi updates: Broken");
    expect(logs).toContain("✗ Git repository: Not a git repository");
    expect(logs).toContain("  → Run: git init");
    expect(logs).not.toContain("  → Run: kibi engine stop");
    expect(logs.at(-1)).toBe(
      "Some checks failed. Please address the issues above.",
    );
    expect(s.category).toHaveBeenCalledWith(
      "doctor:kibi_updates+kb_directory+git_repository",
    );
  });

  test("count warnings in the JSON report", async () => {
    s.updates.mockResolvedValue({
      passed: true,
      warning: true,
      message: "Update available",
    } as never);
    s.gaps.mockReturnValue(["no driver"]);
    const result = await report();
    expect(result.warnings).toBe(3);
    s.updates.mockResolvedValue({
      passed: false,
      warning: true,
      message: "Broken",
    } as never);
    expect((await report()).warnings).toBe(2);
  });
});

describe("SWI-Prolog check", () => {
  test("report a single-line error without a bundled package", async () => {
    const error = Object.assign(
      Object.create(swipl.SwiplResolutionError.prototype),
      { message: "No swipl", code: "c", platform: "p" },
    );
    s.resolveSwipl.mockImplementation(() => {
      throw error;
    });
    expect(await check("SWI-Prolog")).toStrictEqual({
      name: "SWI-Prolog",
      passed: false,
      message: "No swipl",
      details: { code: "c", platform: "p" },
    });
    const multi = Object.assign(
      Object.create(swipl.SwiplResolutionError.prototype),
      {
        message: "No swipl\nA\nB",
        code: "c",
        platform: "p",
        packageName: "pkg",
      },
    );
    s.resolveSwipl.mockImplementation(() => {
      throw multi;
    });
    expect(await check("SWI-Prolog")).toStrictEqual({
      name: "SWI-Prolog",
      passed: false,
      message: "No swipl",
      remediation: "A\n   B",
      details: { code: "c", platform: "p", bundledPackage: "pkg" },
    });
    const blank = Object.assign(
      Object.create(swipl.SwiplResolutionError.prototype),
      { message: "", code: "c", platform: "p" },
    );
    s.resolveSwipl.mockImplementation(() => {
      throw blank;
    });
    expect((await check("SWI-Prolog"))?.message).toBe("");
  });

  test("rethrow an unexpected resolution error", async () => {
    s.resolveSwipl.mockImplementation(() => {
      throw new Error("boom");
    });
    await expect(doctorCommand({ format: "json" })).rejects.toThrow("boom");
  });

  test("report missing libraries with the source-specific fix", async () => {
    s.probe.mockReturnValue({
      kind: "missing",
      libraries: ["semweb", "http"],
    } as never);
    expect(await check("SWI-Prolog")).toStrictEqual({
      name: "SWI-Prolog",
      passed: false,
      message:
        "Version 9.2.0 from the bundled build at /opt/swipl; cannot load required libraries: semweb, http",
      remediation:
        "Reinstall the bundled SWI-Prolog package, or set KIBI_SWIPL=system to use swipl from PATH.",
      details: {
        source: "bundled",
        path: "/opt/swipl",
        version: "9.2.0",
        missingLibraries: ["semweb", "http"],
      },
    });
  });

  test("report a library check that could not run", async () => {
    s.resolveSwipl.mockReturnValue({
      source: "env",
      bin: "/env/swipl",
      version: "9.0.0",
      home: "/env/home",
    } as never);
    s.probe.mockReturnValue({ kind: "failed", detail: "timeout" } as never);
    expect(await check("SWI-Prolog")).toStrictEqual({
      name: "SWI-Prolog",
      passed: false,
      message:
        "Version 9.0.0 from KIBI_SWIPL at /env/swipl; the required-library load check could not run (timeout)",
      remediation:
        "Install a full SWI-Prolog 9.0+ distribution that provides these libraries (for example swi-prolog rather than swi-prolog-nox or a minimal build), or point KIBI_SWIPL at one.",
      details: {
        source: "env",
        path: "/env/swipl",
        version: "9.0.0",
        home: "/env/home",
      },
    });
    expect(s.probe).toHaveBeenCalledWith({
      source: "env",
      bin: "/env/swipl",
      version: "9.0.0",
      home: "/env/home",
    });
  });

  test("note a missing bundle only for swipl from PATH", async () => {
    s.resolveSwipl.mockReturnValue({
      source: "path",
      bin: "/usr/bin/swipl",
      version: "9.1.0",
    } as never);
    expect((await check("SWI-Prolog"))?.message).toBe(
      "Version 9.1.0 from PATH at /usr/bin/swipl; required libraries load",
    );
    s.bundle.mockReturnValue({
      state: "missing",
      packageName: "swipl-pkg",
    } as never);
    expect(await check("SWI-Prolog")).toStrictEqual({
      name: "SWI-Prolog",
      passed: true,
      message:
        "Version 9.1.0 from PATH at /usr/bin/swipl; required libraries load; bundled swipl-pkg is not installed (npm install --save-dev swipl-pkg)",
      details: { source: "path", path: "/usr/bin/swipl", version: "9.1.0" },
    });
    s.bundle.mockImplementation(() => {
      throw new Error("unreadable");
    });
    expect((await check("SWI-Prolog"))?.message).toBe(
      "Version 9.1.0 from PATH at /usr/bin/swipl; required libraries load",
    );
    s.bundle.mockClear();
    s.resolveSwipl.mockReturnValue({
      source: "bundled",
      bin: "/opt/swipl",
      version: "9.2.0",
    } as never);
    await check("SWI-Prolog");
    expect(s.bundle).not.toHaveBeenCalled();
  });
});

describe("knowledge base checks", () => {
  test("find the .kb directory under the working directory", async () => {
    expect(await check(".kb/ directory")).toStrictEqual({
      name: ".kb/ directory",
      passed: false,
      message: "Not found",
      remediation: "Run: kibi init",
    });
    mkdirSync(path.join(cwd, ".kb"));
    expect(await check(".kb/ directory")).toStrictEqual({
      name: ".kb/ directory",
      passed: true,
      message: "Found",
    });
  });

  test("point a missing manifest at init or the legacy migration", async () => {
    s.manifest.mockReturnValue({ state: "missing" } as never);
    expect(await check(".kb/ manifest")).toStrictEqual({
      name: ".kb/ manifest",
      passed: false,
      message: "Not found",
      remediation: "Run: kibi init",
    });
    expect(s.manifest).toHaveBeenCalledWith(cwd);
    expect(s.legacy).toHaveBeenCalledWith(cwd);
    s.legacy.mockReturnValue(legacyPlan({ legacyConfig: "present" }) as never);
    const remediation = (await check(".kb/ manifest"))?.remediation;
    const config = await import("../src/utils/config.js");
    expect(remediation).toBe(
      `Run: ${config.LEGACY_KB_MIGRATION_COMMAND} (${config.LEGACY_KB_MIGRATION_NOTE})`,
    );
  });

  test("ask to repair an invalid or future manifest", async () => {
    s.manifest.mockReturnValue({
      state: "invalid",
      warning: "bad json",
    } as never);
    expect(await check(".kb/ manifest")).toStrictEqual({
      name: ".kb/ manifest",
      passed: false,
      message: "Invalid manifest",
      remediation: "Repair .kb/manifest.json: bad json",
    });
    s.manifest.mockReturnValue({ state: "future", warning: "v9" } as never);
    expect(await check(".kb/ manifest")).toStrictEqual({
      name: ".kb/ manifest",
      passed: false,
      message: "Future version",
      remediation: "Repair .kb/manifest.json: v9",
    });
  });

  test("fail an older schema and pass the current one", async () => {
    const old = LATEST_KB_SCHEMA_VERSION - 1;
    s.manifest.mockReturnValue({
      state: "ok",
      manifest: { schemaVersion: old },
    } as never);
    expect(await check(".kb/ manifest")).toStrictEqual({
      name: ".kb/ manifest",
      passed: false,
      message: `schemaVersion ${old} (this Kibi expects ${LATEST_KB_SCHEMA_VERSION})`,
      remediation:
        "Run: kibi migrate (previews the plan), then kibi migrate --yes to apply it, or kibi migrate --apply-safe --approved-plan-hash <planHash> --approved-action <id> for selected actions",
    });
  });

  test("report the legacy storage plan", async () => {
    s.legacy.mockReturnValue(
      legacyPlan({
        legacyConfig: "malformed",
        legacyConfigError: "bad",
      }) as never,
    );
    expect(await check("Canonical storage")).toStrictEqual({
      name: "Canonical storage",
      passed: false,
      message: "Legacy .kb/config.json is malformed",
      remediation: "bad",
    });
    s.legacy.mockReturnValue(
      legacyPlan({ legacyConfig: "malformed" }) as never,
    );
    expect((await check("Canonical storage"))?.remediation).toBe(
      "Repair or remove the legacy .kb/config.json, then run: kibi migrate --yes",
    );
    s.legacy.mockReturnValue(legacyPlan({ blockers: ["A.", "B."] }) as never);
    expect(await check("Canonical storage")).toStrictEqual({
      name: "Canonical storage",
      passed: false,
      message:
        "2 legacy knowledge file(s) outside .kb/ cannot be moved automatically",
      remediation: "A. B. Then run: kibi migrate --yes",
    });
    s.legacy.mockReturnValue(legacyPlan({ legacyConfig: "present" }) as never);
    expect(await check("Canonical storage")).toStrictEqual({
      name: "Canonical storage",
      passed: false,
      message: "Legacy .kb/config.json still present",
      remediation: "Run: kibi migrate --yes",
    });
    s.legacy.mockReturnValue(legacyPlan({ moves: [{}] }) as never);
    expect((await check("Canonical storage"))?.message).toBe(
      "1 legacy knowledge file(s) still outside .kb/",
    );
    s.legacy.mockReturnValue(
      legacyPlan({ moves: [{}], removals: [{}, {}] }) as never,
    );
    expect((await check("Canonical storage"))?.message).toBe(
      "3 legacy knowledge file(s) still outside .kb/ (2 identical to the .kb/ copy, which kibi migrate removes)",
    );
    s.legacy.mockReturnValue(legacyPlan({ removals: [{}] }) as never);
    expect((await check("Canonical storage"))?.message).toBe(
      "1 legacy knowledge file(s) still outside .kb/ (1 identical to the .kb/ copy, which kibi migrate removes)",
    );
  });

  test("run git status in the working directory", async () => {
    expect(await check("Git repository")).toStrictEqual({
      name: "Git repository",
      passed: true,
      message: "Found",
    });
    expect(s.exec).toHaveBeenCalledWith("git status", {
      stdio: "pipe",
      cwd,
    });
  });
});

describe("merge driver check", () => {
  test("report a repository without symbols, a configured and a missing driver", async () => {
    s.gaps.mockReturnValue(null);
    expect(await check("Manifest merge driver")).toStrictEqual({
      name: "Manifest merge driver",
      passed: true,
      message: "Not needed yet (no git repository or no symbols)",
    });
    expect(s.gaps).toHaveBeenCalledWith(cwd);
    s.gaps.mockReturnValue(["a", "b"]);
    expect(await check("Manifest merge driver")).toStrictEqual({
      name: "Manifest merge driver",
      passed: true,
      warning: true,
      message:
        "Not configured: a; b. Merges of .kb/symbols.yaml fall back to line conflicts.",
      remediation: "Run: setup",
    });
    expect(s.mergeSetup).toHaveBeenCalledWith(cwd, ["a", "b"]);
  });
});

describe("branch store check", () => {
  test("skip without a branch", async () => {
    s.attach.mockReturnValue({ error: "detached" } as never);
    expect(await check("Branch store")).toStrictEqual({
      name: "Branch store",
      passed: true,
      message: "Not checked: no current Git branch (detached)",
    });
    s.attach.mockImplementation(() => {
      throw "plain";
    });
    expect((await check("Branch store"))?.message).toBe(
      "Not checked: no current Git branch (plain)",
    );
    s.attach.mockImplementation(() => {
      throw new Error("git exploded");
    });
    expect((await check("Branch store"))?.message).toBe(
      "Not checked: no current Git branch (git exploded)",
    );
    expect(s.attach).toHaveBeenCalledWith(cwd);
  });

  test("ask for recovery of an unreadable or incomplete store", async () => {
    s.store.mockReturnValue({
      state: "unreadable",
      path: "/s",
      detail: "torn",
      errorCode: "E1",
    } as never);
    expect(await check("Branch store")).toStrictEqual({
      name: "Branch store",
      passed: false,
      message: "Store for main is unreadable: torn",
      remediation: "Run: kibi branch recover, then kibi branch recover --apply",
      details: { branch: "main", path: "/s", state: "unreadable" },
    });
    expect(s.store).toHaveBeenCalledWith(cwd, "main");
    s.store.mockReturnValue({
      state: "incomplete",
      path: "/s",
      errorCode: "E1",
    } as never);
    expect((await check("Branch store"))?.message).toBe(
      "Store for main is incomplete: E1",
    );
    s.store.mockReturnValue({ state: "incomplete", path: "/s" } as never);
    expect((await check("Branch store"))?.message).toBe(
      "Store for main is incomplete: requires recovery",
    );
  });

  test("report a compiled store with and without a generation", async () => {
    expect(await check("Branch store")).toStrictEqual({
      name: "Branch store",
      passed: true,
      message: "Compiled for main (g1)",
      details: {
        branch: "main",
        path: "/store",
        state: "ready",
        generation: "g1",
      },
    });
    expect(s.takeover).toHaveBeenCalledWith("/store");
    s.compilation.mockReturnValue({ compiled: true } as never);
    expect((await check("Branch store"))?.message).toBe("Compiled for main");
  });

  test("append a lock takeover to every outcome", async () => {
    s.takeover.mockReturnValue({ detail: "Lock taken over." });
    expect(await check("Branch store")).toStrictEqual({
      name: "Branch store",
      passed: true,
      message: "Compiled for main (g1). Lock taken over.",
      details: {
        branch: "main",
        path: "/store",
        state: "ready",
        generation: "g1",
        lockTakeover: { detail: "Lock taken over." },
      },
    });
    s.compilation.mockReturnValue({ compiled: false } as never);
    expect(await check("Branch store")).toStrictEqual({
      name: "Branch store",
      passed: true,
      message:
        "Not compiled yet for main; .kb/ holds no authored sources. Lock taken over.",
      details: {
        branch: "main",
        path: "/store",
        state: "ready",
        lockTakeover: { detail: "Lock taken over." },
      },
    });
    s.uncompiled.mockReturnValue({
      detail: "Store is empty.",
      authoredSources: 3,
    });
    expect(await check("Branch store")).toStrictEqual({
      name: "Branch store",
      passed: false,
      message: "Store is empty. Lock taken over.",
      remediation: "Run: kibi sync",
      details: {
        branch: "main",
        path: "/store",
        state: "ready",
        authoredSources: 3,
        lockTakeover: { detail: "Lock taken over." },
      },
    });
  });

  test("ask to sync an uncompiled store with sources", async () => {
    s.compilation.mockReturnValue({
      compiled: false,
      generation: "g0",
    } as never);
    s.uncompiled.mockReturnValue({ detail: "Empty", authoredSources: 2 });
    expect(await check("Branch store")).toStrictEqual({
      name: "Branch store",
      passed: false,
      message: "Empty",
      remediation: "Run: kibi sync",
      details: {
        branch: "main",
        path: "/store",
        state: "ready",
        generation: "g0",
        authoredSources: 2,
      },
    });
    expect(s.uncompiled).toHaveBeenCalledWith(
      cwd,
      { state: "ready", path: "/store" },
      "main",
    );
    expect(s.compilation).toHaveBeenCalledWith({
      state: "ready",
      path: "/store",
    });
  });
});

describe("fresh-clone setup check", () => {
  function initialize(root = cwd): void {
    mkdirSync(path.join(root, ".kb"), { recursive: true });
    writeFileSync(path.join(root, ".kb", "manifest.json"), "{}");
  }

  test("skip a workspace without Kibi", async () => {
    expect(await check("Fresh-clone setup")).toStrictEqual({
      name: "Fresh-clone setup",
      passed: true,
      message: "Skipped: Kibi is not initialized here",
    });
  });

  test("use the worktree root, or the working directory without git", async () => {
    const worktree = tempDir();
    initialize(worktree);
    s.git.mockImplementation(
      () =>
        ({
          status: "ok",
          context: context({ worktreeRoot: worktree }),
        }) as never,
    );
    expect((await check("Fresh-clone setup"))?.message).toBe(
      "Matches the recorded choices (defaults; none recorded)",
    );
    expect(s.choices).toHaveBeenCalledWith(worktree);
    s.git.mockImplementation(() => ({ status: "none" }) as never);
    initialize();
    s.choices.mockClear();
    await check("Fresh-clone setup");
    expect(s.choices).toHaveBeenCalledWith(cwd);
  });

  test("report matching choices with their source", async () => {
    initialize();
    s.choices.mockReturnValue(
      choices({
        source: "package.json",
        agentInstructions: true,
        prepareHooks: true,
        ciGate: true,
      }) as never,
    );
    mkdirSync(path.join(cwd, ".github", "workflows"), { recursive: true });
    const { GITHUB_CHECK_WORKFLOW_RELPATH } = await import(
      "../src/commands/github-init.js"
    );
    writeFileSync(path.join(cwd, GITHUB_CHECK_WORKFLOW_RELPATH), "x");
    writeFileSync(path.join(cwd, "package.json"), "{}");
    expect(await check("Fresh-clone setup")).toStrictEqual({
      name: "Fresh-clone setup",
      passed: true,
      message: "Matches the recorded choices (package.json)",
      details: {
        choices: {
          autoSync: true,
          prepareHooks: true,
          agentInstructions: true,
          ciGate: true,
        },
        source: "package.json",
      },
    });
    expect(s.section).toHaveBeenCalledWith(
      path.join(cwd, agentInstructions.AGENTS_FILE),
      agentInstructions.KIBI_AGENT_INSTRUCTIONS,
    );
    expect(s.prepare).toHaveBeenCalledWith(cwd);
  });

  test("warn about each gap", async () => {
    initialize();
    s.choices.mockReturnValue(
      choices({
        agentInstructions: true,
        prepareHooks: true,
        ciGate: true,
      }) as never,
    );
    s.section.mockReturnValue("missing" as never);
    s.prepare.mockReturnValue(false);
    writeFileSync(path.join(cwd, "package.json"), "{}");
    const { GITHUB_CHECK_WORKFLOW_RELPATH } = await import(
      "../src/commands/github-init.js"
    );
    expect(await check("Fresh-clone setup")).toStrictEqual({
      name: "Fresh-clone setup",
      passed: true,
      warning: true,
      message: `AGENTS.md has no Kibi section, so agents in a fresh clone are not told the KB exists; package.json has no prepare step installing Kibi's git hooks, so a fresh clone has no commit gate; ${GITHUB_CHECK_WORKFLOW_RELPATH} is missing`,
      remediation: "Run: kibi init (applies the recorded choices)",
      details: {
        choices: {
          autoSync: true,
          prepareHooks: true,
          agentInstructions: true,
          ciGate: true,
        },
        source: "defaults",
      },
    });
    s.section.mockReturnValue("outdated" as never);
    expect((await check("Fresh-clone setup"))?.message).toStartWith(
      "the Kibi section of AGENTS.md is outdated; ",
    );
  });

  test("ask for no prepare step without package.json or with a hook manager", async () => {
    initialize();
    s.choices.mockReturnValue(choices({ prepareHooks: true }) as never);
    s.prepare.mockReturnValue(false);
    expect((await check("Fresh-clone setup"))?.warning).toBeUndefined();
    writeFileSync(path.join(cwd, "package.json"), "{}");
    s.manager.mockReturnValue({ name: "husky", configPath: ".husky" } as never);
    expect((await check("Fresh-clone setup"))?.warning).toBeUndefined();
    s.manager.mockReturnValue(null);
    expect((await check("Fresh-clone setup"))?.warning).toBe(true);
  });

  test("leave unchosen setup out", async () => {
    initialize();
    s.section.mockReturnValue("missing" as never);
    s.prepare.mockReturnValue(false);
    writeFileSync(path.join(cwd, "package.json"), "{}");
    expect((await check("Fresh-clone setup"))?.warning).toBeUndefined();
    expect(s.section).not.toHaveBeenCalled();
    expect(s.prepare).not.toHaveBeenCalled();
  });
});

describe("hook directory resolution", () => {
  test("resolve the repository once per run and again on the next run", async () => {
    installHooks();
    await report();
    expect(s.git).toHaveBeenCalledTimes(1);
    expect(s.git).toHaveBeenCalledWith(cwd);
    s.git.mockImplementation(() => ({ status: "none" }) as never);
    expect((await check("Git hooks"))?.message).toStartWith("Not installed");
    expect(s.git).toHaveBeenCalledTimes(2);
  });

  test("resolve again when the working directory changes mid-run", async () => {
    const first = cwd;
    const second = tempDir();
    let calls = 0;
    s.updates.mockImplementation(async () => {
      cwd = second;
      return { passed: true, message: "Up to date" } as never;
    });
    s.choices.mockImplementation(() => {
      calls += 1;
      return choices() as never;
    });
    await report();
    expect(first).not.toBe(second);
    expect(s.git).toHaveBeenCalledWith(second);
    expect(calls).toBe(0);
  });

  test("fall back to .git/hooks without a repository", async () => {
    s.git.mockImplementation(() => ({ status: "none" }) as never);
    const fallback = path.join(cwd, ".git", "hooks");
    mkdirSync(fallback, { recursive: true });
    writeFileSync(path.join(fallback, "post-checkout"), "x");
    writeFileSync(path.join(fallback, "post-merge"), "x");
    expect(await check("Git hooks")).toStrictEqual({
      name: "Git hooks",
      passed: false,
      message: "Installed but not executable",
      remediation: `Run: chmod +x '${path.join(fallback, "post-checkout")}' '${path.join(fallback, "post-merge")}'`,
    });
  });

  test("name core.hooksPath and its origin", async () => {
    s.git.mockImplementation(
      () =>
        ({
          status: "ok",
          context: context({
            hooksPathConfig: "hooks",
            hooksPathOrigin: "file:.git/config",
          }),
        }) as never,
    );
    expect((await check("Git hooks"))?.message).toBe(
      "Not installed: a new branch is not compiled on checkout and commits skip 'kibi check --staged' (core.hooksPath=hooks from file:.git/config)",
    );
    s.git.mockImplementation(
      () =>
        ({
          status: "ok",
          context: context({ hooksPathConfig: "hooks", hooksPathOrigin: "" }),
        }) as never,
    );
    expect((await check("pre-commit hook"))?.message).toBe(
      "Not installed (optional) (core.hooksPath=hooks)",
    );
  });

  test("quote hook paths in the chmod remediation", async () => {
    hooksDir = path.join(cwd, "it's hooks");
    mkdirSync(hooksDir);
    hook("pre-commit", MANAGED_PRE, 0o644);
    hook("post-checkout", "x");
    expect((await check("pre-commit hook"))?.remediation).toBe(
      `Run: chmod +x '${path.join(cwd, "it'\\''s hooks", "pre-commit")}'`,
    );
  });
});

describe("git hooks check", () => {
  test("warn when no hook is installed", async () => {
    expect(await check("Git hooks")).toStrictEqual({
      name: "Git hooks",
      passed: true,
      warning: true,
      message:
        "Not installed: a new branch is not compiled on checkout and commits skip 'kibi check --staged'",
      remediation: "Run: kibi hooks install",
    });
  });

  test("report partial and executable installs", async () => {
    for (const present of [["pre-commit"], ["post-checkout"], ["post-merge"]]) {
      for (const name of ["pre-commit", "post-checkout", "post-merge"])
        rmSync(path.join(hooksDir, name), { force: true });
      for (const name of present) hook(name, "x");
      expect(await check("Git hooks")).toStrictEqual({
        name: "Git hooks",
        passed: false,
        message: "Partially installed",
        remediation: "Run: kibi init",
      });
    }
    hook("post-checkout", "x");
    hook("post-merge", "x");
    expect(await check("Git hooks")).toStrictEqual({
      name: "Git hooks",
      passed: true,
      message: "Installed and executable",
    });
  });

  test("require both hooks to be executable", async () => {
    for (const [checkout, merge] of [
      [0o644, 0o755],
      [0o755, 0o644],
      [0o100, 0o010],
    ] as const) {
      hook("post-checkout", "x", checkout);
      hook("post-merge", "x", merge);
      expect((await check("Git hooks"))?.passed).toBe(
        checkout !== 0o644 && merge !== 0o644,
      );
    }
    hook("post-checkout", "x", 0o001);
    hook("post-merge", "x", 0o001);
    expect((await check("Git hooks"))?.passed).toBe(true);
  });

  test("report unreadable hook permissions", async () => {
    hook("post-checkout", "x");
    hook("post-merge", "x");
    const stat = fs.statSync;
    spyOn(fs, "statSync").mockImplementation(((
      file: fs.PathLike,
      ...rest: unknown[]
    ) => {
      if (String(file).endsWith("post-merge")) throw new Error("EACCES");
      return (stat as (...args: unknown[]) => unknown)(file, ...rest);
    }) as never);
    expect(await check("Git hooks")).toStrictEqual({
      name: "Git hooks",
      passed: false,
      message: "Unable to check hook permissions",
    });
  });

  test("delegate to the hook manager", async () => {
    s.manager.mockReturnValue({
      name: "lefthook",
      configPath: "lefthook.yml",
    } as never);
    s.managerCommands.mockImplementation(((
      _name: string,
      _root: string,
      hookName: string,
    ) =>
      hookName === "post-checkout"
        ? ["kibi sync"]
        : hookName === "post-merge"
          ? ["kibi sync"]
          : undefined) as never);
    const missing = spyOn(hookManagers, "missingKibiHookCommands");
    expect(await check("Git hooks")).toStrictEqual({
      name: "Git hooks",
      passed: true,
      message: `Managed by lefthook (lefthook.yml); post-checkout runs ${hookManagers
        .missingKibiHookCommands("post-checkout", [])
        .map((label) => `'${label}'`)
        .join(" and ")}; post-merge runs ${hookManagers
        .missingKibiHookCommands("post-merge", [])
        .map((label) => `'${label}'`)
        .join(" and ")}`,
    });
    expect(s.managerCommands).toHaveBeenCalledWith(
      "lefthook",
      cwd,
      "post-checkout",
    );
    expect(missing).toHaveBeenCalledWith("post-checkout", ["kibi sync"]);
    expect(s.manager).toHaveBeenCalledWith(cwd, hooksDir, null);
  });

  test("warn about hooks the manager does not visibly run", async () => {
    s.manager.mockReturnValue({ name: "husky", configPath: ".husky" } as never);
    const missing = (hookName: string) =>
      hookManagers
        .missingKibiHookCommands(hookName as never, [])
        .map((label) => `'${label}'`)
        .join(" and ");
    expect(await check("Git hooks")).toStrictEqual({
      name: "Git hooks",
      passed: true,
      warning: true,
      message: `Managed by husky (.husky); post-checkout does not visibly run ${missing("post-checkout")}; post-merge does not visibly run ${missing("post-merge")}. Kibi reads only the husky configuration, not the task runners or scripts it calls; unless they run these commands, a new branch is not compiled on checkout or after a merge`,
      remediation:
        "Add Kibi's commands to .husky. Print them with: kibi init --print-hook all --format husky",
    });
    expect((await check("pre-commit hook"))?.remediation).toBe(
      "Add Kibi's commands to .husky. Print them with: kibi init --print-hook pre-commit --format husky",
    );
    expect((await check("post-rewrite hook"))?.message).toEndWith(
      "unless they run these commands, a rebased branch keeps a stale KB until the next 'kibi sync'",
    );
    expect((await check("pre-commit hook"))?.message).toEndWith(
      "unless they run these commands, commits skip Kibi enforcement",
    );
  });

  test("read the manager configuration from the worktree root", async () => {
    const worktree = tempDir();
    s.git.mockImplementation(
      () =>
        ({
          status: "ok",
          context: context({ worktreeRoot: worktree }),
        }) as never,
    );
    s.manager.mockReturnValue({ name: "husky", configPath: ".husky" } as never);
    s.managerCommands.mockReturnValue(undefined as never);
    const missing = spyOn(hookManagers, "missingKibiHookCommands");
    await check("Git hooks");
    expect(s.managerCommands.mock.calls[0]).toStrictEqual([
      "husky",
      worktree,
      "post-checkout",
    ]);
    expect(missing.mock.calls[0]).toStrictEqual(["post-checkout", []]);
  });

  test("ignore a context on a failed repository resolution", async () => {
    installHooks();
    s.git.mockImplementation(
      () => ({ status: "none", context: context() }) as never,
    );
    expect((await check("Git hooks"))?.message).toBe(
      "Not installed: a new branch is not compiled on checkout and commits skip 'kibi check --staged'",
    );
  });

  test("name both pre-commit commands a manager runs or misses", async () => {
    s.manager.mockReturnValue({ name: "husky", configPath: ".husky" } as never);
    expect((await check("pre-commit hook"))?.message).toStartWith(
      "Managed by husky (.husky); pre-commit does not visibly run 'kibi check-generated --staged --changed-only' and 'kibi check --staged'. ",
    );
    s.managerCommands.mockReturnValue([
      "kibi check-generated --staged --changed-only",
      "kibi check --staged",
    ]);
    expect((await check("pre-commit hook"))?.message).toBe(
      "Managed by husky (.husky); pre-commit runs 'kibi check-generated --staged --changed-only' and 'kibi check --staged'",
    );
  });
});

describe("pre-commit hook check", () => {
  test("pass a workspace without hooks", async () => {
    expect(await check("pre-commit hook")).toStrictEqual({
      name: "pre-commit hook",
      passed: true,
      message: "Not installed (optional)",
    });
  });

  test("ask for the hook when companions are installed", async () => {
    for (const name of ["post-checkout", "post-merge"]) {
      for (const other of ["post-checkout", "post-merge"])
        rmSync(path.join(hooksDir, other), { force: true });
      hook(name, "x");
      expect(await check("pre-commit hook")).toStrictEqual({
        name: "pre-commit hook",
        passed: false,
        message: "Not installed",
        remediation: "Run: kibi init",
      });
    }
  });

  test("check a custom hook's delegation", async () => {
    hook("pre-commit", "#!/bin/sh\n# pre-commit hook for kibi\necho\n");
    const missing = hookManagers
      .missingKibiHookCommands("pre-commit", ["echo"])
      .map((label) => `'${label}'`)
      .join(" or ");
    expect(await check("pre-commit hook")).toStrictEqual({
      name: "pre-commit hook",
      passed: false,
      message: `Custom pre-commit hook (no kibi-managed section) does not run ${missing}; commits skip Kibi enforcement`,
      remediation:
        "Delegate from your hook to both 'kibi check-generated --staged --changed-only' and 'kibi check --staged'. Print a copy-paste snippet that resolves a project-local kibi with: kibi init --print-hook pre-commit (kibi init never edits a custom hook). If this file is an old Kibi template, delete it and run 'kibi init' instead.",
    });
    hook("pre-commit", "#!/bin/sh\necho\n");
    expect((await check("pre-commit hook"))?.remediation).toEndWith(
      "(kibi init never edits a custom hook).",
    );
    const delegating =
      "#!/bin/sh\nkibi check-generated --staged --changed-only && kibi check --staged\n";
    hook("pre-commit", delegating);
    expect(await check("pre-commit hook")).toStrictEqual({
      name: "pre-commit hook",
      passed: true,
      message:
        "Custom hook delegates to 'kibi check-generated --staged --changed-only' and 'kibi check --staged'",
    });
    hook("pre-commit", delegating, 0o644);
    expect(await check("pre-commit hook")).toStrictEqual({
      name: "pre-commit hook",
      passed: false,
      message: "Installed but not executable",
      remediation: `Run: chmod +x '${path.join(hooksDir, "pre-commit")}'`,
    });
  });

  test("classify managed hook templates", async () => {
    const begin = initHelpers.KIBI_HOOK_BEGIN;
    const cases: Array<[string, number, Partial<Check>]> = [
      [
        `${begin}\necho\n`,
        0o755,
        {
          passed: false,
          message: "pre-commit hook installed but does not invoke kibi",
          remediation: "Run: kibi init to install recommended hooks",
        },
      ],
      [
        `${begin}\nkibi check --staged\n`,
        0o755,
        {
          passed: true,
          message:
            "Installed and executable (legacy template without kibi CLI resolution — run 'kibi init' to regenerate so hooks work with local installs)",
          remediation:
            "Run: kibi init to update git hooks to the latest template",
        },
      ],
      [
        `${begin}\nKIBI_BIN=x\n"$KIBI_BIN" check --staged\n`,
        0o755,
        {
          passed: true,
          message:
            "Installed and executable (resolves kibi CLI; uses 'kibi check --staged')",
        },
      ],
      [
        `${begin}\nkibi check\n`,
        0o755,
        {
          passed: true,
          message:
            "Installed and executable (uses legacy 'kibi check' — consider running 'kibi init' to update hooks to use '--staged' with CLI resolution)",
          remediation:
            "Run: kibi init to update git hooks to the latest template",
        },
      ],
      [
        `${begin}\nKIBI_BIN=x\n"$KIBI_BIN" check\n`,
        0o755,
        {
          passed: true,
          message:
            "Installed and executable (uses legacy 'kibi check' — consider running 'kibi init' to update hooks to use '--staged' with CLI resolution)",
          remediation:
            "Run: kibi init to update git hooks to the latest template",
        },
      ],
      [
        `${begin}\nKIBI_BIN=x\n`,
        0o644,
        {
          passed: false,
          message: "Installed but not executable",
          remediation: `Run: chmod +x '${path.join(hooksDir, "pre-commit")}'`,
        },
      ],
      [
        `${begin}\nKIBI_BIN=x\n"$KIBI_BIN" check --staged\n`,
        // Owner-readable, so the content check runs without root.
        0o410,
        {
          passed: true,
        },
      ],
    ];
    for (const [content, mode, expected] of cases) {
      hook("pre-commit", content, mode);
      const result = await check("pre-commit hook");
      expect(result).toMatchObject(expected);
      if (!("remediation" in expected))
        expect(result?.remediation).toBeUndefined();
    }
  });

  test("report an unreadable hook", async () => {
    hook("pre-commit", "x");
    const read = fs.readFileSync;
    spyOn(fs, "readFileSync").mockImplementation(((
      file: fs.PathOrFileDescriptor,
      ...rest: unknown[]
    ) => {
      if (String(file).endsWith("pre-commit")) throw new Error("EACCES");
      return (read as (...args: unknown[]) => unknown)(file, ...rest);
    }) as never);
    expect(await check("pre-commit hook")).toStrictEqual({
      name: "pre-commit hook",
      passed: false,
      message: "Unable to check hook permissions or read content",
      remediation: "Run: kibi init",
    });
  });
});

describe("post-rewrite hook check", () => {
  test("pass a workspace without hooks and ask when companions exist", async () => {
    expect(await check("post-rewrite hook")).toStrictEqual({
      name: "post-rewrite hook",
      passed: true,
      message: "Not installed (optional)",
    });
    for (const name of ["post-checkout", "post-merge"]) {
      for (const other of ["post-checkout", "post-merge"])
        rmSync(path.join(hooksDir, other), { force: true });
      hook(name, "x");
      expect(await check("post-rewrite hook")).toStrictEqual({
        name: "post-rewrite hook",
        passed: false,
        message: "Not installed",
        remediation: "Run: kibi init",
      });
    }
  });

  test("check a custom hook's delegation", async () => {
    hook("post-rewrite", "#!/bin/sh\necho\n");
    expect(await check("post-rewrite hook")).toStrictEqual({
      name: "post-rewrite hook",
      passed: false,
      message:
        "Custom post-rewrite hook (no kibi-managed section) does not run 'kibi sync'",
      remediation:
        "Delegate from your hook to 'kibi sync' after rebases. Print a copy-paste snippet that resolves a project-local kibi with: kibi init --print-hook post-rewrite (kibi init never edits a custom hook).",
    });
    hook("post-rewrite", "#!/bin/sh\nkibi sync\n");
    expect(await check("post-rewrite hook")).toStrictEqual({
      name: "post-rewrite hook",
      passed: true,
      message: "Custom hook delegates to 'kibi sync'",
    });
    hook("post-rewrite", "#!/bin/sh\nkibi sync\n", 0o644);
    expect(await check("post-rewrite hook")).toStrictEqual({
      name: "post-rewrite hook",
      passed: false,
      message: "Installed but not executable",
      remediation: `Run: chmod +x '${path.join(hooksDir, "post-rewrite")}'`,
    });
  });

  test("classify managed hook templates", async () => {
    const begin = initHelpers.KIBI_HOOK_BEGIN;
    const cases: Array<[string, number, Partial<Check>]> = [
      [
        `${begin}\necho\n`,
        0o755,
        {
          passed: false,
          message: "post-rewrite hook installed but does not invoke kibi",
          remediation: "Run: kibi init to install recommended hooks",
        },
      ],
      [
        `${begin}\nkibi sync\n`,
        0o755,
        {
          passed: true,
          message:
            "Installed and executable (legacy template without kibi CLI resolution — run 'kibi init' to regenerate so hooks work with local installs)",
          remediation:
            "Run: kibi init to update git hooks to the latest template",
        },
      ],
      [
        `${begin}\nKIBI_BIN=x\n"$KIBI_BIN" sync\n`,
        0o755,
        { passed: true, message: "Installed and executable" },
      ],
      [`${begin}\nKIBI_BIN=x\n"$KIBI_BIN" sync\n`, 0o410, { passed: true }],
      [
        `${begin}\nKIBI_BIN=x\n"$KIBI_BIN" sync\n`,
        0o644,
        {
          passed: false,
          message: "Installed but not executable",
          remediation: `Run: chmod +x '${path.join(hooksDir, "post-rewrite")}'`,
        },
      ],
    ];
    for (const [content, mode, expected] of cases) {
      hook("post-rewrite", content, mode);
      const result = await check("post-rewrite hook");
      expect(result).toMatchObject(expected);
      if (!("remediation" in expected))
        expect(result?.remediation).toBeUndefined();
    }
  });

  test("report an unreadable hook", async () => {
    hook("post-rewrite", "x");
    const read = fs.readFileSync;
    spyOn(fs, "readFileSync").mockImplementation(((
      file: fs.PathOrFileDescriptor,
      ...rest: unknown[]
    ) => {
      if (String(file).endsWith("post-rewrite")) throw new Error("EACCES");
      return (read as (...args: unknown[]) => unknown)(file, ...rest);
    }) as never);
    expect(await check("post-rewrite hook")).toStrictEqual({
      name: "post-rewrite hook",
      passed: false,
      message: "Unable to check hook permissions or read content",
      remediation: "Run: kibi init",
    });
  });
});

describe("managed hook sections check", () => {
  test("report missing, outdated, current and unreadable sections", async () => {
    expect(await check("Kibi-managed hook sections")).toStrictEqual({
      name: "Kibi-managed hook sections",
      passed: true,
      message: "Not installed (optional)",
    });
    expect(s.managed).toHaveBeenCalledWith(hooksDir);
    s.managed.mockReturnValue(true);
    expect(await check("Kibi-managed hook sections")).toStrictEqual({
      name: "Kibi-managed hook sections",
      passed: true,
      message: "Current for this Kibi CLI",
    });
    expect(s.outdated).toHaveBeenCalledWith(hooksDir);
    s.outdated.mockReturnValue(["pre-commit", "post-merge"]);
    expect(await check("Kibi-managed hook sections")).toStrictEqual({
      name: "Kibi-managed hook sections",
      passed: false,
      message:
        "Outdated for this Kibi CLI: pre-commit, post-merge (installed by a different version; newer gates may be missing)",
      remediation: "Run: kibi init to refresh the kibi-managed hook sections",
    });
    s.outdated.mockImplementation(() => {
      throw new Error("EACCES");
    });
    expect(await check("Kibi-managed hook sections")).toStrictEqual({
      name: "Kibi-managed hook sections",
      passed: false,
      message: "Unable to read hook content",
      remediation: "Run: kibi init",
    });
  });
});

describe("capability plugins check", () => {
  const row = (overrides: Record<string, unknown> = {}) => ({
    package: "kibi-plugin-x",
    capability: "semantic",
    mode: "replace",
    declared: true,
    ...overrides,
  });

  test("report builtin providers and a language note", async () => {
    expect(await check("Capability plugins")).toStrictEqual({
      name: "Capability plugins",
      passed: true,
      message: "None configured; builtin providers only",
    });
    expect(s.plugins).toHaveBeenCalledWith("/ws");
    expect(s.language).toHaveBeenCalledWith("/ws");
    s.language.mockReturnValue("Add a TS plugin");
    expect(await check("Capability plugins")).toStrictEqual({
      name: "Capability plugins",
      passed: true,
      message: "None configured; builtin providers only",
      warning: true,
      remediation: "Add a TS plugin",
    });
  });

  test("fail an undeclared plugin", async () => {
    s.plugins.mockReturnValue([
      row(),
      row({ package: "kibi-plugin-y", declared: false, mode: "augment" }),
    ] as never);
    expect(await check("Capability plugins")).toStrictEqual({
      name: "Capability plugins",
      passed: false,
      message:
        "kibi-plugin-x semantic replace declared=yes; kibi-plugin-y semantic augment declared=no",
      remediation:
        "Add the configured plugin package to dependencies, devDependencies, or optionalDependencies, or remove the kibi.plugins activation entry.",
    });
  });

  test("fail install problems", async () => {
    s.plugins.mockReturnValue([
      row(),
      row({ package: "kibi-plugin-y" }),
    ] as never);
    s.config.mockReturnValue({
      plugins: [{ package: "kibi-plugin-x" }, { package: "kibi-plugin-x" }],
    } as never);
    s.install.mockReturnValue([
      { problem: "not installed", fix: "Run: install" },
      { problem: "too old", fix: "Run: upgrade" },
    ] as never);
    expect(await check("Capability plugins")).toStrictEqual({
      name: "Capability plugins",
      passed: false,
      message:
        "kibi-plugin-x semantic replace declared=yes; kibi-plugin-y semantic replace declared=yes; not installed; too old",
      remediation: "Run: install Run: upgrade",
    });
    expect(s.install).toHaveBeenCalledWith("/ws", ["kibi-plugin-x"]);
    expect(s.config).toHaveBeenCalledWith("/ws");
  });

  test("pass configured plugins and note a language", async () => {
    s.plugins.mockReturnValue([row()] as never);
    expect(await check("Capability plugins")).toStrictEqual({
      name: "Capability plugins",
      passed: true,
      message: "kibi-plugin-x semantic replace declared=yes",
    });
    expect(s.install.mock.calls).toStrictEqual([["/ws", []]]);
    s.language.mockReturnValue("note");
    expect(await check("Capability plugins")).toStrictEqual({
      name: "Capability plugins",
      passed: true,
      message: "kibi-plugin-x semantic replace declared=yes",
      warning: true,
      remediation: "note",
    });
  });

  const jev = (mode: string) => {
    s.plugins.mockReturnValue([
      row({ package: "kibi-plugin-jev", mode }),
    ] as never);
    s.config.mockReturnValue({
      plugins: [{ package: "kibi-plugin-jev" }],
    } as never);
  };

  test("fail a missing secret for a replacing plugin", async () => {
    jev("replace");
    s.secret.mockReturnValue("missing" as never);
    expect(await check("Capability plugins")).toStrictEqual({
      name: "Capability plugins",
      passed: false,
      message:
        "kibi-plugin-jev semantic replace declared=yes; TYPESAFE_API_KEY=missing; jev.model=jev-latest; jev.timeoutMs=default",
      remediation:
        "Set `TYPESAFE_API_KEY` in `~/.config/kibi/env` (user-wide) or `<workspace>/.env.kibi` (project override), then restart long-running Kibi MCP/host processes.",
    });
    expect(s.secret).toHaveBeenCalledWith("TYPESAFE_API_KEY", {
      workspaceRoot: "/ws",
    });
  });

  test("warn about a missing secret for an augmenting plugin", async () => {
    jev("augment");
    s.plugins.mockReturnValue([
      row({ package: "kibi-plugin-jev", mode: "augment" }),
      row({ package: "kibi-plugin-other", mode: "replace" }),
    ] as never);
    s.secret.mockReturnValue("missing" as never);
    expect(await check("Capability plugins")).toStrictEqual({
      name: "Capability plugins",
      passed: true,
      warning: true,
      message:
        "kibi-plugin-jev semantic augment declared=yes; kibi-plugin-other semantic replace declared=yes; TYPESAFE_API_KEY=missing; jev.model=jev-latest; jev.timeoutMs=default",
      remediation:
        "TYPESAFE_API_KEY is not set, so the augment-mode plugin is skipped and builtin providers answer alone. Set it in ~/.config/kibi/env or <workspace>/.env.kibi to enable the plugin, then restart long-running Kibi MCP/host processes.",
    });
    s.plugins.mockReturnValue([
      row({ package: "kibi-plugin-jev", mode: "augment" }),
      row({ package: "kibi-plugin-jev", mode: "replace" }),
    ] as never);
    expect((await check("Capability plugins"))?.passed).toBe(false);
  });

  test("ask to migrate a legacy secret", async () => {
    jev("replace");
    s.secret.mockReturnValue("legacy_env" as never);
    expect(await check("Capability plugins")).toStrictEqual({
      name: "Capability plugins",
      passed: true,
      message:
        "kibi-plugin-jev semantic replace declared=yes; TYPESAFE_API_KEY=legacy_env; jev.model=jev-latest; jev.timeoutMs=default",
      remediation:
        "Migrate TYPESAFE_API_KEY from legacy `.env` to `~/.config/kibi/env` or `<workspace>/.env.kibi`, then restart long-running Kibi MCP/host processes.",
    });
  });

  test("report the Jev model and timeout", async () => {
    jev("replace");
    const cases: Array<[string | undefined, string | undefined, string]> = [
      [undefined, undefined, "jev.model=jev-latest; jev.timeoutMs=default"],
      ["  ", " ", "jev.model=jev-latest; jev.timeoutMs=default"],
      [" m1 ", " 5000 ", "jev.model=m1; jev.timeoutMs=5000"],
      [undefined, "1", "jev.model=jev-latest; jev.timeoutMs=1"],
      [undefined, "120000", "jev.model=jev-latest; jev.timeoutMs=120000"],
      [undefined, "120001", "jev.model=jev-latest; jev.timeoutMs=invalid"],
      [undefined, "0", "jev.model=jev-latest; jev.timeoutMs=invalid"],
      [undefined, "05", "jev.model=jev-latest; jev.timeoutMs=invalid"],
      [undefined, "5s", "jev.model=jev-latest; jev.timeoutMs=invalid"],
      [undefined, "x5", "jev.model=jev-latest; jev.timeoutMs=invalid"],
      [
        undefined,
        "99999999999999999999",
        "jev.model=jev-latest; jev.timeoutMs=invalid",
      ],
    ];
    for (const [model, timeout, expected] of cases) {
      if (model === undefined)
        Reflect.deleteProperty(process.env, "KIBI_JEV_MODEL");
      else process.env.KIBI_JEV_MODEL = model;
      if (timeout === undefined)
        Reflect.deleteProperty(process.env, "KIBI_JEV_TIMEOUT_MS");
      else process.env.KIBI_JEV_TIMEOUT_MS = timeout;
      expect((await check("Capability plugins"))?.message).toBe(
        `kibi-plugin-jev semantic replace declared=yes; TYPESAFE_API_KEY=user_env; ${expected}`,
      );
    }
  });

  test("name other missing secrets", async () => {
    s.plugins.mockReturnValue([row({ package: "kibi-plugin-jev" })] as never);
    s.config.mockReturnValue({
      plugins: [{ package: "kibi-plugin-jev" }, { package: "plain" }],
    } as never);
    s.secret.mockImplementation(((secret: string) =>
      secret === "TYPESAFE_API_KEY" ? "user_env" : "missing") as never);
    expect(await check("Capability plugins")).toStrictEqual({
      name: "Capability plugins",
      passed: true,
      message:
        "kibi-plugin-jev semantic replace declared=yes; TYPESAFE_API_KEY=user_env; jev.model=jev-latest; jev.timeoutMs=default",
    });
  });

  test("report a configuration error", async () => {
    s.bootstrap.mockImplementation(() => {
      throw new Error("bad plugins");
    });
    expect(await check("Capability plugins")).toStrictEqual({
      name: "Capability plugins",
      passed: false,
      message: "bad plugins",
      remediation:
        "Fix package.json kibi.plugins, then restart long-running Kibi MCP or client processes.",
    });
    s.bootstrap.mockImplementation(() => {
      throw "plain";
    });
    expect((await check("Capability plugins"))?.message).toBe("plain");
  });
});

describe("engine daemon check", () => {
  test("skip without a branch", async () => {
    s.readAttach.mockReturnValue({ error: "none" } as never);
    expect(await check("Engine daemon")).toStrictEqual({
      name: "Engine daemon",
      passed: true,
      message: "Not checked: no branch to address the engine daemon",
      details: { running: false, expectedPackageVersions: VERSIONS },
    });
    expect(s.readAttach).toHaveBeenCalledWith(cwd);
    expect(s.inspect).not.toHaveBeenCalled();
  });

  test("address the workspace from the environment in order", async () => {
    const roots = ["/w1", "/w2", "/w3"];
    process.env.KIBI_ROOT = roots[2];
    await check("Engine daemon");
    expect(s.readAttach).toHaveBeenLastCalledWith("/w3");
    process.env.KIBI_PROJECT_ROOT = roots[1];
    await check("Engine daemon");
    expect(s.readAttach).toHaveBeenLastCalledWith("/w2");
    process.env.KIBI_WORKSPACE = "rel";
    await check("Engine daemon");
    expect(s.readAttach).toHaveBeenLastCalledWith(path.resolve("rel"));
  });

  test("report a missing, unreachable or running daemon", async () => {
    expect(await check("Engine daemon")).toStrictEqual({
      name: "Engine daemon",
      passed: true,
      message: "Not running",
      details: { running: false, expectedPackageVersions: VERSIONS },
    });
    expect(s.terminate).toHaveBeenCalledTimes(1);
    s.inspect.mockRejectedValue(new Error("refused"));
    expect(await check("Engine daemon")).toStrictEqual({
      name: "Engine daemon",
      passed: true,
      message: "Not reachable: refused",
      details: { running: false, expectedPackageVersions: VERSIONS },
    });
    expect(s.terminate).toHaveBeenCalledTimes(2);
    s.inspect.mockRejectedValue("plain");
    expect((await check("Engine daemon"))?.message).toBe(
      "Not reachable: plain",
    );
    s.inspect.mockResolvedValue({
      packageVersions: VERSIONS,
      prologIdentity: "swipl 9",
    } as never);
    expect(await check("Engine daemon")).toStrictEqual({
      name: "Engine daemon",
      passed: true,
      message: `Running ${VERSIONS}`,
      details: {
        running: true,
        pid: 4242,
        branch: "main",
        packageVersions: VERSIONS,
        prologIdentity: "swipl 9",
        expectedPackageVersions: VERSIONS,
      },
    });
    s.inspect.mockResolvedValue({ prologIdentity: "swipl 9" } as never);
    expect(await check("Engine daemon")).toStrictEqual({
      name: "Engine daemon",
      passed: true,
      message: `Running a daemon that reports no package versions, not this CLI's ${VERSIONS}; the next Kibi command replaces it`,
      remediation: "Run: kibi engine stop",
      details: {
        running: true,
        pid: 4242,
        branch: "main",
        prologIdentity: "swipl 9",
        expectedPackageVersions: VERSIONS,
      },
    });
  });

  test("address the client to the workspace and branch", async () => {
    let options: unknown;
    s.inspect.mockImplementation(async function (this: EngineClient) {
      const client = this as unknown as Record<string, unknown>;
      options = { workspaceRoot: client.workspaceRoot, branch: client.branch };
      return null;
    });
    s.readAttach.mockReturnValue({ kbBranch: "dev" } as never);
    await check("Engine daemon");
    expect(options).toMatchObject({ workspaceRoot: cwd, branch: "dev" });
  });
});
