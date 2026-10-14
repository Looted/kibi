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
import { discoverSourceFiles } from "../../src/commands/sync/discovery.js";
import {
  buildMigrationPlan,
  digestMigrationPlan,
  migrationAction,
} from "../../src/public/operations/migration-plan.js";
import * as runtimeTypes from "../../src/public/operations/runtime-types.js";
import * as branchResolver from "../../src/utils/branch-resolver.js";
import { LATEST_KB_SCHEMA_VERSION } from "../../src/utils/schema-version.js";
import {
  captureIo,
  createGitWorkspace,
  git,
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

  test("initializeMissingConfig keeps the legacy schema generation so every legacy step runs", async () => {
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
    expect(io.logText()).toContain("(was 4)");
    const audit = JSON.parse(
      readFileSync(path.join(cwd, ".kb", "migrations", "main.json"), "utf8"),
    ) as { fromVersion: number; steps: string[] };
    expect(audit.fromVersion).toBe(4);
    expect(audit.steps).toContain("entity-body-context-v8");
  });

  test("a manifest written beside a legacy config does not skip the legacy steps", async () => {
    const cwd = preparedWorkspace();
    // An older 'kibi init' seeded a latest-schema manifest and an empty
    // symbols manifest next to the legacy layout.
    writeManifest(cwd, 8);
    writeFileSync(
      path.join(cwd, ".kb", "config.json"),
      JSON.stringify({ schemaVersion: 4 }),
    );
    writeFileSync(
      path.join(cwd, ".kb", "symbols.yaml"),
      "# symbols.yaml\n# seeded by kibi init\nsymbols: []\n",
    );
    writeLegacyKnowledge(cwd);
    const io = captureIo();
    restores.push(io.restore);
    const result = await migrateCommand({ yes: true, workspaceRoot: cwd });
    expect(result.exitCode).toBe(0);
    expect(io.logText()).toContain("(was 4)");
    expect(
      readFileSync(path.join(cwd, ".kb", "symbols.yaml"), "utf8"),
    ).toContain("SYM-auth");
    // The moved files are untracked; pending-source receipts let sync compile
    // them before they are staged, and the schema steps that rewrote them
    // afterwards (context tags, legacy-link) rebound those receipts.
    expect(io.logText()).toContain("not tracked by Git yet");
    expect(io.logText()).toContain("pending-source receipt");
    const discovered = await discoverSourceFiles(cwd, { trackedOnly: true });
    expect(
      [...discovered.markdownFiles, ...discovered.manifestFiles].map((file) =>
        path.relative(cwd, file).replaceAll(path.sep, "/"),
      ),
    ).toEqual(
      expect.arrayContaining([".kb/requirements/REQ-1.md", ".kb/symbols.yaml"]),
    );
    expect(git(cwd, "ls-files -- .kb").trim()).toBe("");
  });

  test("removes legacy copies identical to .kb/ and blocks a stale symbols subset", async () => {
    const cwd = preparedWorkspace();
    writeManifest(cwd, LATEST_KB_SCHEMA_VERSION);
    const req = "---\nid: REQ-1\ntitle: Auth\nstatus: open\n---\n";
    for (const dir of [".kb/requirements", "documentation/requirements"]) {
      mkdirSync(path.join(cwd, dir), { recursive: true });
      writeFileSync(path.join(cwd, dir, "REQ-1.md"), req);
    }
    const io = captureIo();
    restores.push(io.restore);
    const preview = await migrateCommand({ dryRun: true, workspaceRoot: cwd });
    expect(preview.exitCode).toBe(0);
    expect(io.logText()).toContain(
      "would remove 1 legacy cop(ies) identical to their .kb/ file",
    );
    expect(io.logText()).toContain(
      "documentation/requirements/REQ-1.md (same as .kb/requirements/REQ-1.md)",
    );
    const applied = await migrateCommand({ yes: true, workspaceRoot: cwd });
    expect(applied.exitCode).toBe(0);
    expect(io.logText()).toContain(
      "Removed 1 legacy cop(ies) identical to their .kb/ file: documentation/requirements/REQ-1.md.",
    );
    expect(existsSync(path.join(cwd, "documentation"))).toBe(false);
    expect(
      readFileSync(path.join(cwd, ".kb", "requirements", "REQ-1.md"), "utf8"),
    ).toBe(req);

    writeFileSync(
      path.join(cwd, ".kb", "symbols.yaml"),
      "symbols:\n  - id: SYM-auth\n  - id: SYM-login\n",
    );
    mkdirSync(path.join(cwd, "documentation"), { recursive: true });
    writeFileSync(
      path.join(cwd, "documentation", "symbols.yaml"),
      "symbols:\n  - id: SYM-auth\n",
    );
    const blocked = await migrateCommand({ yes: true, workspaceRoot: cwd });
    expect(blocked.exitCode).toBe(1);
    expect(io.errorText()).toContain(
      "Blocked: The legacy copy documentation/symbols.yaml is a stale subset of .kb/symbols.yaml",
    );
    expect(existsSync(path.join(cwd, "documentation", "symbols.yaml"))).toBe(
      true,
    );
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
      (async (_runtime: unknown, spec: { name?: string }, _input?: unknown) => {
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

    exec.mockImplementation((async (
      _runtime: unknown,
      spec: { name?: string },
    ) => {
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
        return {
          content: [],
          structuredContent: {
            outcome: "reconciliation_required",
            actionResults: [
              {
                actionId: "schema-ready",
                outcome: "failed",
                detail: "kibi sync failed",
              },
            ],
            remainingPlan: digestMigrationPlan(plan),
          },
        };
      }
      return { content: [], structuredContent: {} };
    }) as never);
    const blocked = await migrateCommand({
      applySafe: true,
      approvedPlanHash: plan.planHash,
      approvedActionIds: ["schema-ready"],
      workspaceRoot: cwd,
    });
    expect(blocked.exitCode).toBe(1);
    expect(io.logText()).toContain("Migration applied.");
    // Table output summarizes the result instead of dumping its JSON.
    expect(io.logText()).toContain("- failed schema-ready: kibi sync failed");
    expect(io.logText()).toContain(`Remaining plan ${plan.planHash}`);
    expect(io.logText()).not.toContain('"remainingPlan"');
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

  test("apply-safe limits the apply to --approved-action ids as the CLI spells them", async () => {
    const cwd = preparedWorkspace();
    writeManifest(cwd, 5);
    const plan = buildMigrationPlan({
      evaluatedDomains: ["schema"],
      actions: [
        migrationAction({
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
        }),
        migrationAction({
          id: "source-path-rewrite",
          code: "source_path_rewrite",
          category: "quality",
          state: "ready",
          safety: "automatic",
          autoApplicable: true,
          invocation: {
            kind: "cli",
            command_argv: ["kibi", "migrate", "--yes"],
          },
        }),
      ],
    });
    const applyInputs: Array<Record<string, unknown>> = [];
    const exec = spyOn(runtimeTypes, "executeOperation").mockImplementation(
      (async (_runtime: unknown, spec: { name?: string }, input?: unknown) => {
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
          applyInputs.push(input as Record<string, unknown>);
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

    const limited = await migrateCommand({
      applySafe: true,
      approvedPlanHash: plan.planHash,
      approvedAction: ["schema-ready"],
      format: "json",
      workspaceRoot: cwd,
    });
    expect(limited.exitCode).toBe(0);
    expect(applyInputs).toHaveLength(1);
    expect(applyInputs[0]?.approvedActionIds).toEqual(["schema-ready"]);

    // --yes with JSON output applies the whole plan it would otherwise print.
    const whole = await migrateCommand({
      yes: true,
      format: "json",
      workspaceRoot: cwd,
    });
    expect(whole.exitCode).toBe(0);
    expect(applyInputs).toHaveLength(2);
    expect(applyInputs[1]?.approvedPlanHash).toBe(plan.planHash);
    expect([...(applyInputs[1]?.approvedActionIds as string[])].sort()).toEqual(
      ["schema-ready", "source-path-rewrite"],
    );

    // --dry-run keeps the JSON plan read-only.
    const dry = await migrateCommand({
      yes: true,
      dryRun: true,
      format: "json",
      workspaceRoot: cwd,
    });
    expect(dry.exitCode).toBe(0);
    expect(applyInputs).toHaveLength(2);
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
