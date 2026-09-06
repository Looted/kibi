// implements REQ-014
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { engineStopCommand } from "../../src/commands/engine.js";
import {
  formatSchemaVersion,
  migrateCommand,
  warnMigrationRequiredWithoutYes,
} from "../../src/commands/migrate.js";
import {
  buildMigrationPlan,
  migrationAction,
} from "../../src/public/operations/migration-plan.js";
import * as runtimeTypes from "../../src/public/operations/runtime-types.js";
import * as branchResolver from "../../src/utils/branch-resolver.js";
import {
  captureIo,
  createGitWorkspace,
  isolateKibiEnv,
  removeTempDir,
  restoreWorkspaceCwd,
  withCwd,
} from "../helpers/in-process-workspace.js";

const roots: string[] = [];
const restores: Array<() => void> = [];

afterEach(async () => {
  for (const restore of restores.splice(0)) restore();
  restoreWorkspaceCwd();
  for (const root of roots.splice(0)) {
    try {
      await withCwd(root, () => engineStopCommand());
    } catch {
      // Plan-only fixtures never start an engine.
    }
    removeTempDir(root);
  }
});

function preparedWorkspace(): string {
  const restoreEnv = isolateKibiEnv();
  restores.push(restoreEnv);
  const cwd = createGitWorkspace();
  roots.push(cwd);
  return cwd;
}

function writeManifest(
  cwd: string,
  schemaVersion: number | string | undefined,
  extra: Record<string, unknown> = {},
): void {
  mkdirSync(path.join(cwd, ".kb"), { recursive: true });
  const body: Record<string, unknown> = {
    manifestVersion: 1,
    semanticAdvisorBackfill: "not_applicable",
    ...extra,
  };
  if (schemaVersion !== undefined) body.schemaVersion = schemaVersion;
  writeFileSync(path.join(cwd, ".kb", "manifest.json"), JSON.stringify(body));
}

function writeLegacyKnowledge(cwd: string): void {
  mkdirSync(path.join(cwd, "documentation", "requirements"), {
    recursive: true,
  });
  writeFileSync(
    path.join(cwd, "documentation", "requirements", "REQ-1.md"),
    `---
id: REQ-1
title: Auth
status: open
---
`,
  );
  writeFileSync(
    path.join(cwd, "documentation", "symbols.yaml"),
    `symbols:
  - id: SYM-auth
    title: auth
    sourceFile: src/auth.ts
    status: active
    relationships:
      - type: implements
        to: REQ-1
  - id: SYM-end
    title: missing
    sourceFile: src/auth.ts
    relationships:
      - type: implements
        to: REQ-1
`,
  );
  mkdirSync(path.join(cwd, "src"), { recursive: true });
  writeFileSync(
    path.join(cwd, "src", "auth.ts"),
    "export function login() { return true; }\nexport function logout() { return false; }\n",
  );
}

function readyPlan() {
  const action = migrationAction({
    id: "schema-ready",
    code: "schema_upgrade",
    category: "schema",
    state: "ready",
    safety: "automatic",
    autoApplicable: true,
    invocation: {
      kind: "cli",
      command_argv: ["kibi", "migrate", "--yes"],
    },
  });
  return buildMigrationPlan({
    evaluatedDomains: ["schema"],
    actions: [action],
  });
}

describe("migrateCommand remaining runtime branches", () => {
  test("fails when git is unavailable rather than merely missing", async () => {
    const cwd = preparedWorkspace();
    writeManifest(cwd, 4);
    const resolve = spyOn(
      branchResolver,
      "resolveBranchAttachment",
    ).mockReturnValue({
      error: "git missing",
      code: "GIT_NOT_AVAILABLE",
    } as never);
    restores.push(() => resolve.mockRestore());
    const io = captureIo();
    restores.push(io.restore);
    const result = await migrateCommand({ yes: true, workspaceRoot: cwd });
    expect(result.exitCode).toBe(1);
    expect(io.errorText()).toContain("Not in a git repository");
  });

  test("fails on an unknown branch-attachment error", async () => {
    const cwd = preparedWorkspace();
    writeManifest(cwd, 4);
    const resolve = spyOn(
      branchResolver,
      "resolveBranchAttachment",
    ).mockReturnValue({
      error: "detached",
      code: "DETACHED_HEAD",
    } as never);
    restores.push(() => resolve.mockRestore());
    const io = captureIo();
    restores.push(io.restore);
    const result = await migrateCommand({ yes: true, workspaceRoot: cwd });
    expect(result.exitCode).toBe(1);
    expect(io.errorText()).toContain("Failed to resolve active branch");
  });

  test("dry-runs and applies a storage cutover from documentation/ plus coarse symbol links", async () => {
    const cwd = preparedWorkspace();
    writeManifest(cwd, 1);
    writeFileSync(
      path.join(cwd, ".kb", "config.json"),
      JSON.stringify({ schemaVersion: 1 }),
    );
    writeLegacyKnowledge(cwd);
    const io = captureIo();
    restores.push(io.restore);
    const preview = await migrateCommand({
      dryRun: true,
      yes: true,
      workspaceRoot: cwd,
    });
    expect(preview.exitCode).toBe(0);
    expect(io.logText()).toContain("would move");
    expect(io.logText()).toContain("documentation/requirements/REQ-1.md");
    expect(io.logText()).toContain("would retire legacy .kb/config.json");
    expect(io.logText()).toMatch(/legacy-link|would mark/);

    const applied = await migrateCommand({ yes: true, workspaceRoot: cwd });
    expect(applied.exitCode).toBe(0);
    expect(existsSync(path.join(cwd, ".kb", "requirements", "REQ-1.md"))).toBe(
      true,
    );
    expect(io.logText()).toContain("Moved");
    expect(io.logText()).toContain("Retired legacy .kb/config.json");
    expect(io.logText()).toMatch(/legacy-link|Migrated the KB/);
    const symbols = readFileSync(path.join(cwd, ".kb", "symbols.yaml"), "utf8");
    expect(symbols).toContain("granularity_reason: legacy-link");
  });

  test("initializeMissingConfig writes a baseline then continues when legacy files exist", async () => {
    const cwd = preparedWorkspace();
    mkdirSync(path.join(cwd, ".kb"), { recursive: true });
    writeFileSync(
      path.join(cwd, ".kb", "config.json"),
      JSON.stringify({ schemaVersion: 4 }),
    );
    writeLegacyKnowledge(cwd);
    const io = captureIo();
    restores.push(io.restore);
    const result = await migrateCommand({
      yes: true,
      initializeMissingConfig: true,
      workspaceRoot: cwd,
    });
    expect(result.exitCode).toBe(0);
    expect(existsSync(path.join(cwd, ".kb", "manifest.json"))).toBe(true);
    expect(io.logText()).toContain("Migrated the KB");
  });

  test("treats a missing schemaVersion as missing and upgrades it", async () => {
    const cwd = preparedWorkspace();
    writeManifest(cwd, undefined);
    const io = captureIo();
    restores.push(io.restore);
    const preview = await migrateCommand({
      dryRun: true,
      yes: true,
      workspaceRoot: cwd,
    });
    expect(preview.exitCode).toBe(0);
    expect(io.logText()).toMatch(/invalid \(null\)|missing/);
  });

  test("marks semantic advisor backfill as pending when upgrading through v4", async () => {
    const cwd = preparedWorkspace();
    writeManifest(cwd, 3, { semanticAdvisorBackfill: "stale" });
    const io = captureIo();
    restores.push(io.restore);
    const result = await migrateCommand({ yes: true, workspaceRoot: cwd });
    expect(result.exitCode).toBe(0);
    expect(io.logText()).toContain("semantic advisor backfill as pending");
  });

  test("skips invalid YAML and non-object symbol documents during granularity migration", async () => {
    const cwd = preparedWorkspace();
    writeManifest(cwd, 1);
    writeFileSync(path.join(cwd, ".kb", "symbols.yaml"), "[]");
    const io = captureIo();
    restores.push(io.restore);
    const preview = await migrateCommand({
      dryRun: true,
      yes: true,
      workspaceRoot: cwd,
    });
    expect(preview.exitCode).toBe(0);
    writeFileSync(
      path.join(cwd, ".kb", "symbols.yaml"),
      "symbols: not-a-list\n",
    );
    const applied = await migrateCommand({ yes: true, workspaceRoot: cwd });
    expect(applied.exitCode).toBe(0);
    expect(io.logText()).toContain("Migrated the KB");
  });

  test("marks coarse links for an absolute sourceFile that exports other names", async () => {
    const cwd = preparedWorkspace();
    writeManifest(cwd, 1);
    mkdirSync(path.join(cwd, "src"), { recursive: true });
    const abs = path.join(cwd, "src", "auth.ts");
    writeFileSync(
      abs,
      "export function login() { return true; }\nexport function logout() { return false; }\n",
    );
    writeFileSync(
      path.join(cwd, ".kb", "symbols.yaml"),
      `symbols:
  - id: SYM-auth
    title: auth
    sourceFile: ${abs}
    links: [REQ-1]
`,
    );
    const io = captureIo();
    restores.push(io.restore);
    const result = await migrateCommand({ yes: true, workspaceRoot: cwd });
    expect(result.exitCode).toBe(0);
    expect(io.logText()).toContain("legacy-link");
  });

  test("apply-safe applies ready automatic actions and prints json or text", async () => {
    const cwd = preparedWorkspace();
    writeManifest(cwd, 5);
    const plan = readyPlan();
    const exec = spyOn(runtimeTypes, "executeOperation").mockImplementation(
      (async (_runtime, spec: { name?: string }, _input?: unknown) => {
        if (spec.name === "kb_status") {
          return {
            content: [],
            structuredContent: {
              migrationPlan: plan,
              branchStore: { state: "healthy" },
              schemaStatus: { needsMigration: false },
              branchAttachment: { kind: "exact" },
            },
          };
        }
        if (spec.name === "kb_check" || spec.name === "kb_coverage") {
          return {
            content: [],
            structuredContent: { migrationPlan: plan },
          };
        }
        if (spec.name === "kb_apply_plan") {
          return {
            content: [{ type: "text", text: "Migration applied." }],
            structuredContent: { outcome: "applied" },
          };
        }
        return { content: [], structuredContent: {} };
      }) as never,
    );
    restores.push(() => exec.mockRestore());
    const io = captureIo();
    restores.push(io.restore);
    const json = await migrateCommand({
      applySafe: true,
      approvedPlanHash: plan.planHash,
      format: "json",
      workspaceRoot: cwd,
    });
    expect(json.exitCode).toBe(0);
    expect(io.logText()).toContain("applied");

    exec.mockImplementation(async (_runtime, spec: { name?: string }) => {
      if (spec.name === "kb_status") {
        return {
          content: [],
          structuredContent: {
            migrationPlan: plan,
            branchStore: { state: "healthy" },
            schemaStatus: { needsMigration: false },
            branchAttachment: { kind: "exact" },
          },
        };
      }
      if (spec.name === "kb_check" || spec.name === "kb_coverage") {
        return { content: [], structuredContent: { migrationPlan: plan } };
      }
      if (spec.name === "kb_apply_plan") {
        return { content: [], structuredContent: { outcome: "blocked" } };
      }
      return { content: [], structuredContent: {} };
    });
    const blocked = await migrateCommand({
      applySafe: true,
      approvedPlanHash: plan.planHash,
      approvedActionIds: ["schema-ready"],
      workspaceRoot: cwd,
    });
    expect(blocked.exitCode).toBe(1);
    expect(io.logText()).toContain("Migration applied.");
  });

  test("assembles a fallback plan when status cannot provide downstream domains", async () => {
    const cwd = preparedWorkspace();
    writeManifest(cwd, 5);
    const exec = spyOn(runtimeTypes, "executeOperation").mockResolvedValue({
      content: [],
      structuredContent: {
        branchStore: { state: "missing" },
        schemaStatus: { needsMigration: true },
        branchAttachment: { kind: "missing" },
      },
    } as never);
    restores.push(() => exec.mockRestore());
    const io = captureIo();
    restores.push(io.restore);
    const result = await migrateCommand({
      format: "json",
      workspaceRoot: cwd,
    });
    expect(result.exitCode).toBe(0);
    expect(io.logText()).toContain("Unable to assemble downstream");
  });

  test("uses process.cwd when workspaceRoot is omitted", async () => {
    const cwd = preparedWorkspace();
    writeManifest(cwd, 4);
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(cwd, () =>
      migrateCommand({ dryRun: true, yes: true }),
    );
    expect(result.exitCode).toBe(0);
    expect(io.logText()).toContain("dry run");
  });

  test("labels an unparseable schemaVersion as invalid JSON", () => {
    expect(formatSchemaVersion("not-a-number", null)).toBe(
      'invalid ("not-a-number")',
    );
    expect(formatSchemaVersion(undefined, null)).toBe("missing");
    expect(formatSchemaVersion(4, 4)).toBe("4");
  });

  test("apply-safe reports when no automatic actions are ready", async () => {
    const cwd = preparedWorkspace();
    writeManifest(cwd, 5);
    const action = migrationAction({
      id: "schema-blocked",
      code: "schema_upgrade",
      category: "schema",
      state: "blocked",
      safety: "operator",
      autoApplicable: false,
      invocation: {
        kind: "review",
        instruction: "wait",
      },
    });
    const plan = buildMigrationPlan({
      evaluatedDomains: ["schema"],
      actions: [action],
    });
    const exec = spyOn(runtimeTypes, "executeOperation").mockResolvedValue({
      content: [],
      structuredContent: {
        migrationPlan: plan,
        branchStore: { state: "healthy" },
        schemaStatus: { needsMigration: false },
        branchAttachment: { kind: "exact" },
      },
    } as never);
    restores.push(() => exec.mockRestore());
    const io = captureIo();
    restores.push(io.restore);
    const result = await migrateCommand({
      applySafe: true,
      approvedPlanHash: plan.planHash,
      workspaceRoot: cwd,
    });
    expect(result.exitCode).toBe(0);
    expect(io.logText()).toContain(
      "No approved automatic migration actions are ready.",
    );
  });

  test("warns and applies nothing when migration is required without --yes", () => {
    const io = captureIo();
    restores.push(io.restore);
    const result = warnMigrationRequiredWithoutYes();
    expect(result.exitCode).toBe(0);
    expect(io.logText()).toContain("No changes applied.");
    expect(io.logText()).toContain("Use --dry-run to preview or --yes");
  });
});
