// implements REQ-cli-doctor
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import * as childProcess from "node:child_process";
import * as fs from "node:fs";
import { mkdirSync, writeFileSync } from "node:fs";
import * as nodeModule from "node:module";
import path from "node:path";
import { doctorCommand } from "../../src/commands/doctor.js";
import { engineStopCommand } from "../../src/commands/engine.js";
import { installGitHooks } from "../../src/commands/init-helpers.js";
import { resetKibiEnvironmentBootstrapStateForTests } from "../../src/env/bootstrap.js";
import { ensureBranchStoreManifest } from "../../src/utils/branch-store-locator.js";
import { type FakeSwiplSpec, installFakeSwipl } from "../helpers/fake-swipl.js";
import {
  captureIo,
  createGitWorkspace,
  createTempDir,
  isolateKibiEnv,
  makeExecutable,
  removeTempDir,
  restoreWorkspaceCwd,
  withCwd,
  writeHook,
} from "../helpers/in-process-workspace.js";

interface DoctorCheckResult {
  name: string;
  passed: boolean;
  message: string;
  remediation?: string;
  details?: Record<string, unknown>;
}

interface DoctorPayload {
  version: string;
  passed: boolean;
  checks: DoctorCheckResult[];
  runtime: Record<string, unknown>;
  migrationPlan: {
    actions: Array<{ id: string; evidence?: Record<string, unknown> }>;
  };
}

const roots: string[] = [];
const restores: Array<() => void> = [];

afterEach(async () => {
  for (const restore of restores.splice(0)) restore();
  restoreWorkspaceCwd();
  resetKibiEnvironmentBootstrapStateForTests();
  for (const root of roots.splice(0)) {
    try {
      await withCwd(root, () => engineStopCommand());
    } catch {
      // Doctor fixtures do not always start an engine.
    }
    removeTempDir(root);
  }
  process.exitCode = 0;
});

function preparedWorkspace(): string {
  restores.push(isolateKibiEnv());
  mockSwipl("SWI-Prolog version 9.2 (threaded, 64 bits)\n");
  const cwd = fs.realpathSync.native(createGitWorkspace());
  roots.push(cwd);
  return cwd;
}

function writeOkManifest(cwd: string): void {
  mkdirSync(path.join(cwd, ".kb"), { recursive: true });
  writeFileSync(
    path.join(cwd, ".kb", "manifest.json"),
    JSON.stringify({
      manifestVersion: 1,
      schemaVersion: 5,
      semanticAdvisorBackfill: "not_applicable",
    }),
  );
}

/**
 * Make the SWI-Prolog probe deterministic through KIBI_SWIPL: a fixed banner,
 * or an Error for "SWI-Prolog is nowhere to be found". The real resolver runs.
 */
function mockSwipl(spec: FakeSwiplSpec): void {
  restores.push(installFakeSwipl(spec));
}

function currentPreCommitBody(): string {
  return '#!/bin/sh\nKIBI_BIN="$(command -v kibi)"\n"$KIBI_BIN" check --staged\n';
}

function currentPostRewriteBody(): string {
  return '#!/bin/sh\nKIBI_BIN="$(command -v kibi)"\n"$KIBI_BIN" sync\n';
}

async function runDoctorTable(
  cwd: string,
): Promise<{ exitCode: number; text: string }> {
  const io = captureIo();
  restores.push(io.restore);
  const result = await withCwd(cwd, () => doctorCommand({ format: "table" }));
  return { exitCode: result.exitCode, text: io.logText() };
}

async function runDoctorJson(
  cwd: string,
): Promise<{ exitCode: number; payload: DoctorPayload }> {
  const io = captureIo();
  restores.push(io.restore);
  const result = await withCwd(cwd, () => doctorCommand({ format: "json" }));
  const payload = JSON.parse(io.logs[0] ?? io.logText()) as DoctorPayload;
  return { exitCode: result.exitCode, payload };
}

function namedCheck(payload: DoctorPayload, name: string): DoctorCheckResult {
  const check = payload.checks.find((entry) => entry.name === name);
  if (!check) throw new Error(`doctor check not reported: ${name}`);
  return check;
}

function unresolvedVersionsOf(
  payload: DoctorPayload,
  actionId: string,
): string[] {
  const action = payload.migrationPlan.actions.find(
    (entry) => entry.id === actionId,
  );
  const evidence = action?.evidence as
    | { unresolvedVersions?: string[] }
    | undefined;
  return evidence?.unresolvedVersions ?? [];
}

describe("doctorCommand rendered report", () => {
  test("renders failing table rows with remediation hints and exits 1 in an uninitialized workspace", async () => {
    const cwd = preparedWorkspace();
    mockSwipl(new Error("swipl is absent"));
    const { exitCode, text } = await runDoctorTable(cwd);
    expect(exitCode).toBe(1);
    expect(text).toContain("Kibi Environment Diagnostics");
    expect(text).toContain(
      "✗ SWI-Prolog: Kibi could not find a usable SWI-Prolog (9.0 or newer is required).",
    );
    expect(text).toContain(
      "Bundled SWI-Prolog: skipped because KIBI_SWIPL=system.",
    );
    expect(text).toContain("swipl was not found on PATH.");
    expect(text).toContain("Install it with:");
    expect(text).toContain(
      "Or set KIBI_SWIPL to the absolute path of a SWI-Prolog 9.0+ executable.",
    );
    expect(text).toContain("✗ .kb/ directory: Not found");
    expect(text).toContain("→ Run: kibi init");
    expect(text).toContain("✗ .kb/ manifest: Not found");
    expect(text).toContain(
      "Some checks failed. Please address the issues above.",
    );
    expect(text).not.toContain("All checks passed");
  });

  test("renders the passing table with per-check detail in a healthy workspace", async () => {
    const cwd = preparedWorkspace();
    writeOkManifest(cwd);
    mockSwipl("SWI-Prolog version 9.2 (threaded, 64 bits)\n");
    const { exitCode, text } = await runDoctorTable(cwd);
    expect(exitCode).toBe(0);
    expect(text).toContain(
      "All required checks passed, with 1 warning(s) above (marked !).",
    );
    expect(text).not.toContain("All checks passed! Your environment is ready.");
    expect(text).toContain("✓ SWI-Prolog: Version 9.2 from KIBI_SWIPL at ");
    expect(text).toContain("required libraries load");
    expect(text).toContain("✓ .kb/ directory: Found");
    expect(text).toContain("✓ .kb/ manifest: schemaVersion 5");
    expect(text).toContain("✓ Canonical storage: Canonical .kb/ layout");
    expect(text).toContain("✓ Git repository: Found");
    expect(text).toContain(
      "✓ Branch store: Not compiled yet for main; .kb/ holds no authored sources",
    );
    expect(text).toContain(
      "! Git hooks: Not installed: a new branch is not compiled on checkout and commits skip 'kibi check --staged'",
    );
    expect(text).toContain("  → Run: kibi init (installs the git hooks)");
    expect(text).toContain("✓ pre-commit hook: Not installed (optional)");
    expect(text).toContain("✓ post-rewrite hook: Not installed (optional)");
    expect(text).not.toContain("✗");
    expect(text).not.toContain("Some checks failed");
  });
});

describe("doctorCommand manifest check", () => {
  test("reports an invalid manifest with repair guidance", async () => {
    const cwd = preparedWorkspace();
    mkdirSync(path.join(cwd, ".kb"), { recursive: true });
    writeFileSync(path.join(cwd, ".kb", "manifest.json"), "{not json");
    const { exitCode, payload } = await runDoctorJson(cwd);
    expect(exitCode).toBe(1);
    const check = namedCheck(payload, ".kb/ manifest");
    expect(check.passed).toBe(false);
    expect(check.message).toBe("Invalid manifest");
    expect(check.remediation).toMatch(/^Repair \.kb\/manifest\.json:/);
  });

  test("reports a manifest from a future Kibi version", async () => {
    const cwd = preparedWorkspace();
    mkdirSync(path.join(cwd, ".kb"), { recursive: true });
    writeFileSync(
      path.join(cwd, ".kb", "manifest.json"),
      JSON.stringify({
        manifestVersion: 99,
        schemaVersion: 5,
        semanticAdvisorBackfill: "not_applicable",
      }),
    );
    const { exitCode, payload } = await runDoctorJson(cwd);
    expect(exitCode).toBe(1);
    const check = namedCheck(payload, ".kb/ manifest");
    expect(check.passed).toBe(false);
    expect(check.message).toBe("Future version");
    expect(check.remediation).toMatch(/^Repair \.kb\/manifest\.json:/);
  });
});

describe("doctorCommand legacy storage check", () => {
  test("flags a leftover legacy .kb/config.json", async () => {
    const cwd = preparedWorkspace();
    writeOkManifest(cwd);
    writeFileSync(path.join(cwd, ".kb", "config.json"), "{}\n");
    const { exitCode, payload } = await runDoctorJson(cwd);
    expect(exitCode).toBe(1);
    const check = namedCheck(payload, "Canonical storage");
    expect(check.passed).toBe(false);
    expect(check.message).toBe("Legacy .kb/config.json still present");
    expect(check.remediation).toBe("Run: kibi migrate --yes");
  });

  test("flags legacy knowledge files outside the canonical .kb layout", async () => {
    const cwd = preparedWorkspace();
    writeOkManifest(cwd);
    mkdirSync(path.join(cwd, "documentation", "requirements"), {
      recursive: true,
    });
    writeFileSync(
      path.join(cwd, "documentation", "requirements", "REQ-1.md"),
      "---\nid: REQ-1\ntitle: Auth\nstatus: open\n---\n",
    );
    const { exitCode, payload } = await runDoctorJson(cwd);
    expect(exitCode).toBe(1);
    const check = namedCheck(payload, "Canonical storage");
    expect(check.passed).toBe(false);
    expect(check.message).toBe("1 legacy knowledge file(s) still outside .kb/");
    expect(check.remediation).toBe("Run: kibi migrate --yes");
  });
});

describe("doctorCommand git repository check", () => {
  test("fails outside a git repository and suggests git init", async () => {
    restores.push(isolateKibiEnv());
    const cwd = createTempDir("kibi-doctor-nogit-");
    roots.push(cwd);
    writeOkManifest(cwd);
    mockSwipl("SWI-Prolog version 9.2 (threaded, 64 bits)\n");
    const { exitCode, text } = await runDoctorTable(cwd);
    expect(exitCode).toBe(1);
    expect(text).toContain("✗ Git repository: Not a git repository");
    expect(text).toContain("→ Run: git init");
  });
});

describe("doctorCommand companion git hooks check", () => {
  test("reports a partially installed companion pair", async () => {
    const cwd = preparedWorkspace();
    writeOkManifest(cwd);
    writeHook(cwd, "post-checkout", "#!/bin/sh\nkibi sync\n");
    const { exitCode, payload } = await runDoctorJson(cwd);
    expect(exitCode).toBe(1);
    const check = namedCheck(payload, "Git hooks");
    expect(check.passed).toBe(false);
    expect(check.message).toBe("Partially installed");
    expect(check.remediation).toBe("Run: kibi init");
  });

  test("fails non-executable companion hooks with chmod guidance", async () => {
    const cwd = preparedWorkspace();
    writeOkManifest(cwd);
    writeHook(cwd, "post-checkout", "#!/bin/sh\nkibi sync\n");
    writeHook(cwd, "post-merge", "#!/bin/sh\nkibi sync\n");
    const { exitCode, payload } = await runDoctorJson(cwd);
    expect(exitCode).toBe(1);
    const check = namedCheck(payload, "Git hooks");
    expect(check.passed).toBe(false);
    expect(check.message).toBe("Installed but not executable");
    expect(check.remediation).toBe(
      `Run: chmod +x '${cwd}/.git/hooks/post-checkout' '${cwd}/.git/hooks/post-merge'`,
    );
  });

  test("passes executable companion hooks", async () => {
    const cwd = preparedWorkspace();
    writeOkManifest(cwd);
    writeHook(cwd, "post-checkout", "#!/bin/sh\nkibi sync\n");
    writeHook(cwd, "post-merge", "#!/bin/sh\nkibi sync\n");
    makeExecutable(path.join(cwd, ".git", "hooks", "post-checkout"));
    makeExecutable(path.join(cwd, ".git", "hooks", "post-merge"));
    const { payload } = await runDoctorJson(cwd);
    const check = namedCheck(payload, "Git hooks");
    expect(check.passed).toBe(true);
    expect(check.message).toBe("Installed and executable");
    expect(check.remediation).toBeUndefined();
  });

  test("reports permission failures when hook stats cannot be read", async () => {
    const cwd = preparedWorkspace();
    writeOkManifest(cwd);
    writeHook(cwd, "post-checkout", "#!/bin/sh\nkibi sync\n");
    writeHook(cwd, "post-merge", "#!/bin/sh\nkibi sync\n");
    writeHook(cwd, "pre-commit", currentPreCommitBody());
    writeHook(cwd, "post-rewrite", currentPostRewriteBody());
    makeExecutable(path.join(cwd, ".git", "hooks", "post-checkout"));
    makeExecutable(path.join(cwd, ".git", "hooks", "post-merge"));
    makeExecutable(path.join(cwd, ".git", "hooks", "pre-commit"));
    makeExecutable(path.join(cwd, ".git", "hooks", "post-rewrite"));
    const originalStat = fs.statSync;
    const stat = spyOn(fs, "statSync").mockImplementation(((
      target: import("node:fs").PathLike,
      options?: unknown,
    ) => {
      if (
        String(target).includes(`${path.sep}.git${path.sep}hooks${path.sep}`)
      ) {
        throw new Error("EACCES");
      }
      return originalStat(target, options as never);
    }) as typeof fs.statSync);
    restores.push(() => stat.mockRestore());
    const { exitCode, payload } = await runDoctorJson(cwd);
    expect(exitCode).toBe(1);
    expect(namedCheck(payload, "Git hooks").message).toBe(
      "Unable to check hook permissions",
    );
    expect(namedCheck(payload, "Git hooks").remediation).toBeUndefined();
    expect(namedCheck(payload, "pre-commit hook").message).toBe(
      "Unable to check hook permissions or read content",
    );
    expect(namedCheck(payload, "post-rewrite hook").message).toBe(
      "Unable to check hook permissions or read content",
    );
  });
});

describe("doctorCommand pre-commit hook check", () => {
  test("fails when companions are installed but pre-commit is missing", async () => {
    const cwd = preparedWorkspace();
    writeOkManifest(cwd);
    writeHook(cwd, "post-checkout", "#!/bin/sh\nkibi sync\n");
    writeHook(cwd, "post-merge", "#!/bin/sh\nkibi sync\n");
    makeExecutable(path.join(cwd, ".git", "hooks", "post-checkout"));
    makeExecutable(path.join(cwd, ".git", "hooks", "post-merge"));
    const { exitCode, payload } = await runDoctorJson(cwd);
    expect(exitCode).toBe(1);
    const check = namedCheck(payload, "pre-commit hook");
    expect(check.passed).toBe(false);
    expect(check.message).toBe("Not installed");
    expect(check.remediation).toBe("Run: kibi init");
  });

  test("fails a non-executable pre-commit hook with chmod guidance", async () => {
    const cwd = preparedWorkspace();
    writeOkManifest(cwd);
    writeHook(cwd, "post-checkout", "#!/bin/sh\nkibi sync\n");
    writeHook(cwd, "post-merge", "#!/bin/sh\nkibi sync\n");
    writeHook(cwd, "pre-commit", currentPreCommitBody());
    makeExecutable(path.join(cwd, ".git", "hooks", "post-checkout"));
    makeExecutable(path.join(cwd, ".git", "hooks", "post-merge"));
    const { exitCode, payload } = await runDoctorJson(cwd);
    expect(exitCode).toBe(1);
    const check = namedCheck(payload, "pre-commit hook");
    expect(check.passed).toBe(false);
    expect(check.message).toBe("Installed but not executable");
    expect(check.remediation).toBe(
      `Run: chmod +x '${cwd}/.git/hooks/pre-commit'`,
    );
  });

  test("fails a pre-commit hook that never invokes kibi", async () => {
    const cwd = preparedWorkspace();
    writeOkManifest(cwd);
    writeHook(cwd, "post-checkout", "#!/bin/sh\nkibi sync\n");
    writeHook(cwd, "post-merge", "#!/bin/sh\nkibi sync\n");
    writeHook(cwd, "pre-commit", '#!/bin/sh\necho "running project lint"\n');
    makeExecutable(path.join(cwd, ".git", "hooks", "post-checkout"));
    makeExecutable(path.join(cwd, ".git", "hooks", "post-merge"));
    makeExecutable(path.join(cwd, ".git", "hooks", "pre-commit"));
    const { exitCode, payload } = await runDoctorJson(cwd);
    expect(exitCode).toBe(1);
    const check = namedCheck(payload, "pre-commit hook");
    expect(check.passed).toBe(false);
    expect(check.message).toBe(
      "pre-commit hook installed but does not invoke kibi",
    );
    expect(check.remediation).toBe(
      "Run: kibi init to install recommended hooks",
    );
  });

  test("passes the current template that resolves the kibi CLI and uses --staged", async () => {
    const cwd = preparedWorkspace();
    writeOkManifest(cwd);
    writeHook(cwd, "post-checkout", "#!/bin/sh\nkibi sync\n");
    writeHook(cwd, "post-merge", "#!/bin/sh\nkibi sync\n");
    writeHook(cwd, "pre-commit", currentPreCommitBody());
    makeExecutable(path.join(cwd, ".git", "hooks", "post-checkout"));
    makeExecutable(path.join(cwd, ".git", "hooks", "post-merge"));
    makeExecutable(path.join(cwd, ".git", "hooks", "pre-commit"));
    const { payload } = await runDoctorJson(cwd);
    const check = namedCheck(payload, "pre-commit hook");
    expect(check.passed).toBe(true);
    expect(check.message).toBe(
      "Installed and executable (resolves kibi CLI; uses 'kibi check --staged')",
    );
  });

  test("passes a legacy --staged template but asks for regeneration", async () => {
    const cwd = preparedWorkspace();
    writeOkManifest(cwd);
    writeHook(cwd, "post-checkout", "#!/bin/sh\nkibi sync\n");
    writeHook(cwd, "post-merge", "#!/bin/sh\nkibi sync\n");
    writeHook(cwd, "pre-commit", "#!/bin/sh\nkibi check --staged\n");
    makeExecutable(path.join(cwd, ".git", "hooks", "post-checkout"));
    makeExecutable(path.join(cwd, ".git", "hooks", "post-merge"));
    makeExecutable(path.join(cwd, ".git", "hooks", "pre-commit"));
    const { payload } = await runDoctorJson(cwd);
    const check = namedCheck(payload, "pre-commit hook");
    expect(check.passed).toBe(true);
    expect(check.message).toContain(
      "legacy template without kibi CLI resolution",
    );
    expect(check.message).not.toContain("uses legacy 'kibi check'");
    expect(check.remediation).toBe(
      "Run: kibi init to update git hooks to the latest template",
    );
  });

  test("passes a legacy template that runs plain kibi check", async () => {
    const cwd = preparedWorkspace();
    writeOkManifest(cwd);
    writeHook(cwd, "post-checkout", "#!/bin/sh\nkibi sync\n");
    writeHook(cwd, "post-merge", "#!/bin/sh\nkibi sync\n");
    writeHook(cwd, "pre-commit", "#!/bin/sh\nkibi check\n");
    makeExecutable(path.join(cwd, ".git", "hooks", "post-checkout"));
    makeExecutable(path.join(cwd, ".git", "hooks", "post-merge"));
    makeExecutable(path.join(cwd, ".git", "hooks", "pre-commit"));
    const { payload } = await runDoctorJson(cwd);
    const check = namedCheck(payload, "pre-commit hook");
    expect(check.passed).toBe(true);
    expect(check.message).toContain("legacy 'kibi check'");
    expect(check.remediation).toBe(
      "Run: kibi init to update git hooks to the latest template",
    );
  });
});

describe("doctorCommand post-rewrite hook check", () => {
  test("fails when companions are installed but post-rewrite is missing", async () => {
    const cwd = preparedWorkspace();
    writeOkManifest(cwd);
    writeHook(cwd, "post-checkout", "#!/bin/sh\nkibi sync\n");
    writeHook(cwd, "post-merge", "#!/bin/sh\nkibi sync\n");
    writeHook(cwd, "pre-commit", currentPreCommitBody());
    makeExecutable(path.join(cwd, ".git", "hooks", "post-checkout"));
    makeExecutable(path.join(cwd, ".git", "hooks", "post-merge"));
    makeExecutable(path.join(cwd, ".git", "hooks", "pre-commit"));
    const { exitCode, payload } = await runDoctorJson(cwd);
    expect(exitCode).toBe(1);
    const check = namedCheck(payload, "post-rewrite hook");
    expect(check.passed).toBe(false);
    expect(check.message).toBe("Not installed");
    expect(check.remediation).toBe("Run: kibi init");
  });

  test("fails a non-executable post-rewrite hook with chmod guidance", async () => {
    const cwd = preparedWorkspace();
    writeOkManifest(cwd);
    writeHook(cwd, "post-checkout", "#!/bin/sh\nkibi sync\n");
    writeHook(cwd, "post-merge", "#!/bin/sh\nkibi sync\n");
    writeHook(cwd, "pre-commit", currentPreCommitBody());
    writeHook(cwd, "post-rewrite", currentPostRewriteBody());
    makeExecutable(path.join(cwd, ".git", "hooks", "post-checkout"));
    makeExecutable(path.join(cwd, ".git", "hooks", "post-merge"));
    makeExecutable(path.join(cwd, ".git", "hooks", "pre-commit"));
    const { exitCode, payload } = await runDoctorJson(cwd);
    expect(exitCode).toBe(1);
    const check = namedCheck(payload, "post-rewrite hook");
    expect(check.passed).toBe(false);
    expect(check.message).toBe("Installed but not executable");
    expect(check.remediation).toBe(
      `Run: chmod +x '${cwd}/.git/hooks/post-rewrite'`,
    );
  });

  test("fails a post-rewrite hook that never invokes kibi", async () => {
    const cwd = preparedWorkspace();
    writeOkManifest(cwd);
    writeHook(cwd, "post-checkout", "#!/bin/sh\nkibi sync\n");
    writeHook(cwd, "post-merge", "#!/bin/sh\nkibi sync\n");
    writeHook(cwd, "pre-commit", currentPreCommitBody());
    writeHook(cwd, "post-rewrite", "#!/bin/sh\necho rewrite\n");
    makeExecutable(path.join(cwd, ".git", "hooks", "post-checkout"));
    makeExecutable(path.join(cwd, ".git", "hooks", "post-merge"));
    makeExecutable(path.join(cwd, ".git", "hooks", "pre-commit"));
    makeExecutable(path.join(cwd, ".git", "hooks", "post-rewrite"));
    const { exitCode, payload } = await runDoctorJson(cwd);
    expect(exitCode).toBe(1);
    const check = namedCheck(payload, "post-rewrite hook");
    expect(check.passed).toBe(false);
    expect(check.message).toBe(
      "post-rewrite hook installed but does not invoke kibi",
    );
    expect(check.remediation).toBe(
      "Run: kibi init to install recommended hooks",
    );
  });

  test("passes the current template and the whole environment with it", async () => {
    const cwd = preparedWorkspace();
    writeOkManifest(cwd);
    writeHook(cwd, "post-checkout", "#!/bin/sh\nkibi sync\n");
    writeHook(cwd, "post-merge", "#!/bin/sh\nkibi sync\n");
    writeHook(cwd, "pre-commit", currentPreCommitBody());
    writeHook(cwd, "post-rewrite", currentPostRewriteBody());
    makeExecutable(path.join(cwd, ".git", "hooks", "post-checkout"));
    makeExecutable(path.join(cwd, ".git", "hooks", "post-merge"));
    makeExecutable(path.join(cwd, ".git", "hooks", "pre-commit"));
    makeExecutable(path.join(cwd, ".git", "hooks", "post-rewrite"));
    mockSwipl("SWI-Prolog version 9.2 (threaded, 64 bits)\n");
    const { exitCode, payload } = await runDoctorJson(cwd);
    expect(exitCode).toBe(0);
    expect(payload.passed).toBe(true);
    const check = namedCheck(payload, "post-rewrite hook");
    expect(check.passed).toBe(true);
    expect(check.message).toBe("Installed and executable");
    expect(check.remediation).toBeUndefined();
  });

  test("passes a legacy post-rewrite template invoking bare kibi sync", async () => {
    const cwd = preparedWorkspace();
    writeOkManifest(cwd);
    writeHook(cwd, "post-checkout", "#!/bin/sh\nkibi sync\n");
    writeHook(cwd, "post-merge", "#!/bin/sh\nkibi sync\n");
    writeHook(cwd, "pre-commit", currentPreCommitBody());
    writeHook(cwd, "post-rewrite", "#!/bin/sh\nkibi sync\n");
    makeExecutable(path.join(cwd, ".git", "hooks", "post-checkout"));
    makeExecutable(path.join(cwd, ".git", "hooks", "post-merge"));
    makeExecutable(path.join(cwd, ".git", "hooks", "pre-commit"));
    makeExecutable(path.join(cwd, ".git", "hooks", "post-rewrite"));
    const { payload } = await runDoctorJson(cwd);
    const check = namedCheck(payload, "post-rewrite hook");
    expect(check.passed).toBe(true);
    expect(check.message).toContain(
      "legacy template without kibi CLI resolution",
    );
    expect(check.remediation).toBe(
      "Run: kibi init to update git hooks to the latest template",
    );
  });
});

describe("doctorCommand runtime provenance", () => {
  test("reports unknown CLI metadata and a provenance review action when the CLI manifest is unreadable", async () => {
    const cwd = preparedWorkspace();
    writeOkManifest(cwd);
    mockSwipl("SWI-Prolog version 9.2 (threaded, 64 bits)\n");
    const cliManifest = path.resolve(__dirname, "../../package.json");
    const originalRead = fs.readFileSync;
    const read = spyOn(fs, "readFileSync").mockImplementation(((
      target: import("node:fs").PathOrFileDescriptor,
      options?: unknown,
    ) => {
      if (String(target) === cliManifest) {
        throw new Error("packed entrypoint");
      }
      return originalRead(target, options as never);
    }) as typeof fs.readFileSync);
    restores.push(() => read.mockRestore());
    const { exitCode, payload } = await runDoctorJson(cwd);
    expect(exitCode).toBe(0);
    expect(payload.runtime.cliVersion).toBe("unknown");
    expect(payload.runtime.coreRange).toBe("unknown");
    expect(
      unresolvedVersionsOf(payload, "package-provenance-unresolved"),
    ).toContain("cliVersion");
  });

  test("resolves provenance by walking from the entrypoint when package.json exports are hidden", async () => {
    const cwd = preparedWorkspace();
    writeOkManifest(cwd);
    const coreRoot = path.join(cwd, "hidden-core");
    mkdirSync(path.join(coreRoot, "dist"), { recursive: true });
    writeFileSync(
      path.join(coreRoot, "package.json"),
      JSON.stringify({
        name: "kibi-core",
        version: "9.9.9",
        main: "dist/index.js",
        dependencies: {},
      }),
    );
    writeFileSync(path.join(coreRoot, "dist", "index.js"), "export {}\n");
    // An unparseable manifest next to the entrypoint exercises the walk's
    // skip-over-unrelated-manifest behavior before the named match is found.
    writeFileSync(path.join(coreRoot, "dist", "package.json"), "{not json");
    const fakeRequire = Object.assign(
      (id: string) => {
        if (id === "kibi-core") return {};
        throw new Error(`cannot load ${id}`);
      },
      {
        resolve: (id: string) => {
          if (id === "kibi-core/package.json") {
            throw new Error("hidden exports");
          }
          if (id === "kibi-core") {
            return path.join(coreRoot, "dist", "index.js");
          }
          throw new Error(`missing ${id}`);
        },
      },
    );
    const create = spyOn(nodeModule, "createRequire").mockReturnValue(
      fakeRequire as never,
    );
    restores.push(() => create.mockRestore());
    const { exitCode, payload } = await runDoctorJson(cwd);
    expect(exitCode).toBe(0);
    expect(payload.runtime.coreVersion).toBe("9.9.9");
    expect(payload.runtime.locations).toMatchObject({
      core: path.join(coreRoot, "package.json"),
      coreEntrypoint: path.join(coreRoot, "dist", "index.js"),
    });
  });

  test("treats a corrupt resolved manifest as unusable and falls back to the workspace sibling", async () => {
    const cwd = preparedWorkspace();
    writeOkManifest(cwd);
    const corruptManifest = path.join(cwd, "corrupt-core.json");
    writeFileSync(corruptManifest, "{not json");
    const repoCoreVersion = (
      JSON.parse(
        fs.readFileSync(
          path.resolve(__dirname, "../../../core/package.json"),
          "utf8",
        ),
      ) as { version?: string }
    ).version;
    const fakeRequire = Object.assign(
      () => {
        throw new Error("absent");
      },
      {
        resolve: (id: string) => {
          if (id === "kibi-core/package.json") return corruptManifest;
          throw new Error(`missing ${id}`);
        },
      },
    );
    const create = spyOn(nodeModule, "createRequire").mockReturnValue(
      fakeRequire as never,
    );
    restores.push(() => create.mockRestore());
    const { exitCode, payload } = await runDoctorJson(cwd);
    expect(exitCode).toBe(0);
    expect(payload.runtime.coreVersion).toBe(repoCoreVersion);
  });

  test("reports unresolved provenance when no installed package graph exists", async () => {
    const cwd = preparedWorkspace();
    writeOkManifest(cwd);
    const fakeRequire = Object.assign(
      () => {
        throw new Error("absent");
      },
      {
        resolve: () => {
          throw new Error("absent");
        },
      },
    );
    const create = spyOn(nodeModule, "createRequire").mockReturnValue(
      fakeRequire as never,
    );
    restores.push(() => create.mockRestore());
    const originalExists = fs.existsSync;
    const exists = spyOn(fs, "existsSync").mockImplementation(((
      target: import("node:fs").PathLike,
    ) => {
      const file = String(target);
      if (
        file.endsWith(`${path.sep}core${path.sep}package.json`) ||
        file.endsWith(`${path.sep}mcp${path.sep}package.json`)
      ) {
        return false;
      }
      return originalExists(target);
    }) as typeof fs.existsSync);
    restores.push(() => exists.mockRestore());
    const { exitCode, payload } = await runDoctorJson(cwd);
    expect(exitCode).toBe(0);
    expect(payload.runtime.coreVersion).toBe("unresolved");
    expect(payload.runtime.mcpVersion).toBe("unresolved");
    expect(payload.runtime.locations).toMatchObject({ core: "unresolved" });
    const unresolved = unresolvedVersionsOf(
      payload,
      "package-provenance-unresolved",
    );
    expect(unresolved).toContain("coreVersion");
    expect(unresolved).toContain("mcpVersion");
  });
});

describe("doctorCommand capability plugins", () => {
  function writeJevActivation(cwd: string, declared: boolean): void {
    writeFileSync(
      path.join(cwd, "package.json"),
      JSON.stringify({
        name: "consumer",
        ...(declared
          ? { devDependencies: { "kibi-plugin-jev": "0.1.0" } }
          : {}),
        kibi: {
          plugins: [
            {
              package: "kibi-plugin-jev",
              capabilities: {
                "kibi.semantic-classifier.v1": { mode: "augment" },
              },
            },
          ],
        },
      }),
    );
  }

  function writeSideEffectPlugin(cwd: string): void {
    const pkgDir = path.join(cwd, "node_modules", "evil-plugin");
    mkdirSync(pkgDir, { recursive: true });
    writeFileSync(
      path.join(pkgDir, "package.json"),
      JSON.stringify({
        name: "evil-plugin",
        type: "module",
        main: "index.js",
        kibiPlugin: { id: "evil", capabilities: {} },
      }),
    );
    writeFileSync(
      path.join(pkgDir, "index.js"),
      'throw new Error("doctor must not import plugins");\n',
    );
    writeFileSync(
      path.join(cwd, "package.json"),
      JSON.stringify({
        name: "consumer",
        dependencies: { "evil-plugin": "0.0.0" },
        kibi: {
          plugins: [
            {
              package: "evil-plugin",
              capabilities: {
                "kibi.semantic-classifier.v1": { mode: "replace" },
              },
            },
          ],
        },
      }),
    );
  }

  function clearTypesafeKey(): () => void {
    const previous = process.env.TYPESAFE_API_KEY;
    Reflect.deleteProperty(process.env, "TYPESAFE_API_KEY");
    return () => {
      if (previous === undefined)
        Reflect.deleteProperty(process.env, "TYPESAFE_API_KEY");
      else process.env.TYPESAFE_API_KEY = previous;
    };
  }

  test("reports activation, secret source, and Jev config when key is in process", async () => {
    const cwd = preparedWorkspace();
    writeOkManifest(cwd);
    writeJevActivation(cwd, true);
    const restoreKey = clearTypesafeKey();
    restores.push(restoreKey);
    process.env.TYPESAFE_API_KEY = "test-key-not-for-leak-check";
    mockSwipl("SWI-Prolog version 9.2 (threaded, 64 bits)\n");
    const { payload } = await runDoctorJson(cwd);
    const check = namedCheck(payload, "Capability plugins");
    expect(check.passed).toBe(true);
    expect(check.message).toContain(
      "kibi-plugin-jev kibi.semantic-classifier.v1 augment declared=yes",
    );
    expect(check.message).toContain("TYPESAFE_API_KEY=process");
    expect(check.message).toMatch(/jev\.model=/);
    expect(check.message).toMatch(/jev\.timeoutMs=/);
    expect(JSON.stringify(payload)).not.toContain(
      "test-key-not-for-leak-check",
    );
  });

  // Redirects the user-level env lane (~/.config/kibi/env, resolved through
  // XDG_CONFIG_HOME) to an empty temp directory so these checks observe the
  // env matrix they author instead of the host's real user config.
  function isolateUserEnvConfig(): void {
    const previousXdg = process.env.XDG_CONFIG_HOME;
    const xdg = createTempDir();
    roots.push(xdg);
    mkdirSync(path.join(xdg, "kibi"), { recursive: true });
    process.env.XDG_CONFIG_HOME = xdg;
    restores.push(() => {
      if (previousXdg === undefined)
        Reflect.deleteProperty(process.env, "XDG_CONFIG_HOME");
      else process.env.XDG_CONFIG_HOME = previousXdg;
    });
  }

  test("fails when activated Jev secret is missing, with remediation", async () => {
    const cwd = preparedWorkspace();
    writeOkManifest(cwd);
    writeJevActivation(cwd, true);
    restores.push(clearTypesafeKey());
    isolateUserEnvConfig();
    mockSwipl("SWI-Prolog version 9.2 (threaded, 64 bits)\n");
    const { payload, exitCode } = await runDoctorJson(cwd);
    expect(exitCode).toBe(1);
    expect(namedCheck(payload, "Capability plugins")).toMatchObject({
      passed: false,
      remediation:
        "Set `TYPESAFE_API_KEY` in `~/.config/kibi/env` (user-wide) or `<workspace>/.env.kibi` (project override), then restart long-running Kibi MCP/host processes.",
    });
    expect(namedCheck(payload, "Capability plugins").message).toContain(
      "TYPESAFE_API_KEY=missing",
    );
  });

  test("passes with project_env source from .env.kibi", async () => {
    const cwd = preparedWorkspace();
    writeOkManifest(cwd);
    writeJevActivation(cwd, true);
    restores.push(clearTypesafeKey());
    writeFileSync(
      path.join(cwd, ".env.kibi"),
      "TYPESAFE_API_KEY=from-project-file\n",
    );
    mockSwipl("SWI-Prolog version 9.2 (threaded, 64 bits)\n");
    const { payload } = await runDoctorJson(cwd);
    const check = namedCheck(payload, "Capability plugins");
    expect(check.passed).toBe(true);
    expect(check.message).toContain("TYPESAFE_API_KEY=project_env");
    expect(JSON.stringify(payload)).not.toContain("from-project-file");
  });

  test("process wins over project file for doctor attribution", async () => {
    const cwd = preparedWorkspace();
    writeOkManifest(cwd);
    writeJevActivation(cwd, true);
    const restoreKey = clearTypesafeKey();
    restores.push(restoreKey);
    process.env.TYPESAFE_API_KEY = "process-wins";
    writeFileSync(
      path.join(cwd, ".env.kibi"),
      "TYPESAFE_API_KEY=from-project-file\n",
    );
    mockSwipl("SWI-Prolog version 9.2 (threaded, 64 bits)\n");
    const { payload } = await runDoctorJson(cwd);
    const check = namedCheck(payload, "Capability plugins");
    expect(check.passed).toBe(true);
    expect(check.message).toContain("TYPESAFE_API_KEY=process");
    expect(JSON.stringify(payload)).not.toContain("process-wins");
    expect(JSON.stringify(payload)).not.toContain("from-project-file");
  });

  test("passes with user_env source from XDG config", async () => {
    const cwd = preparedWorkspace();
    writeOkManifest(cwd);
    writeJevActivation(cwd, true);
    restores.push(clearTypesafeKey());
    const xdg = createTempDir();
    roots.push(xdg);
    mkdirSync(path.join(xdg, "kibi"), { recursive: true });
    writeFileSync(
      path.join(xdg, "kibi", "env"),
      "TYPESAFE_API_KEY=from-user-file\n",
    );
    const previousXdg = process.env.XDG_CONFIG_HOME;
    process.env.XDG_CONFIG_HOME = xdg;
    restores.push(() => {
      if (previousXdg === undefined)
        Reflect.deleteProperty(process.env, "XDG_CONFIG_HOME");
      else process.env.XDG_CONFIG_HOME = previousXdg;
    });
    mockSwipl("SWI-Prolog version 9.2 (threaded, 64 bits)\n");
    const { payload } = await runDoctorJson(cwd);
    const check = namedCheck(payload, "Capability plugins");
    expect(check.passed).toBe(true);
    expect(check.message).toContain("TYPESAFE_API_KEY=user_env");
    expect(JSON.stringify(payload)).not.toContain("from-user-file");
  });

  test("reports legacy_env with migration remediation", async () => {
    const cwd = preparedWorkspace();
    writeOkManifest(cwd);
    writeJevActivation(cwd, true);
    restores.push(clearTypesafeKey());
    isolateUserEnvConfig();
    writeFileSync(path.join(cwd, ".env"), "TYPESAFE_API_KEY=from-legacy\n");
    mockSwipl("SWI-Prolog version 9.2 (threaded, 64 bits)\n");
    const { payload } = await runDoctorJson(cwd);
    const check = namedCheck(payload, "Capability plugins");
    expect(check.passed).toBe(true);
    expect(check.message).toContain("TYPESAFE_API_KEY=legacy_env");
    expect(check.remediation).toMatch(/Migrate TYPESAFE_API_KEY from legacy/);
    expect(JSON.stringify(payload)).not.toContain("from-legacy");
  });

  test("uses KIBI_WORKSPACE package.json, not harness cwd", async () => {
    const workspace = preparedWorkspace();
    writeOkManifest(workspace);
    writeJevActivation(workspace, true);
    restores.push(clearTypesafeKey());
    writeFileSync(
      path.join(workspace, ".env.kibi"),
      "TYPESAFE_API_KEY=from-workspace\n",
    );
    const harness = createTempDir();
    roots.push(harness);
    writeFileSync(
      path.join(harness, "package.json"),
      JSON.stringify({ name: "harness-only" }),
    );
    const previousWs = process.env.KIBI_WORKSPACE;
    process.env.KIBI_WORKSPACE = workspace;
    restores.push(() => {
      if (previousWs === undefined)
        Reflect.deleteProperty(process.env, "KIBI_WORKSPACE");
      else process.env.KIBI_WORKSPACE = previousWs;
    });
    mockSwipl("SWI-Prolog version 9.2 (threaded, 64 bits)\n");
    const { payload } = await runDoctorJson(harness);
    const check = namedCheck(payload, "Capability plugins");
    expect(check.passed).toBe(true);
    expect(check.message).toContain("kibi-plugin-jev");
    expect(check.message).toContain("TYPESAFE_API_KEY=project_env");
  });

  test("does not import third-party plugin packages", async () => {
    const cwd = preparedWorkspace();
    writeOkManifest(cwd);
    writeSideEffectPlugin(cwd);
    mockSwipl("SWI-Prolog version 9.2 (threaded, 64 bits)\n");
    const { payload, exitCode } = await runDoctorJson(cwd);
    expect(exitCode).toBe(0);
    expect(namedCheck(payload, "Capability plugins")).toMatchObject({
      passed: true,
      message: "evil-plugin kibi.semantic-classifier.v1 replace declared=yes",
    });
  });

  test("fails when a configured plugin is not a declared dependency", async () => {
    const cwd = preparedWorkspace();
    writeOkManifest(cwd);
    writeJevActivation(cwd, false);
    mockSwipl("SWI-Prolog version 9.2 (threaded, 64 bits)\n");
    const { payload } = await runDoctorJson(cwd);
    expect(namedCheck(payload, "Capability plugins")).toMatchObject({
      passed: false,
      message:
        "kibi-plugin-jev kibi.semantic-classifier.v1 augment declared=no",
      remediation:
        "Add the configured plugin package to dependencies, devDependencies, or optionalDependencies, or remove the kibi.plugins activation entry.",
    });
  });
});

describe("doctorCommand kibi-managed hook sections", () => {
  test("passes hooks installed by this CLI and fails an outdated pre-commit gate", async () => {
    const cwd = preparedWorkspace();
    writeOkManifest(cwd);
    installGitHooks(path.join(cwd, ".git", "hooks"));
    const current = namedCheck(
      (await runDoctorJson(cwd)).payload,
      "Kibi-managed hook sections",
    );
    expect(current.passed).toBe(true);
    expect(current.message).toBe("Current for this Kibi CLI");

    const preCommit = path.join(cwd, ".git", "hooks", "pre-commit");
    writeFileSync(
      preCommit,
      fs
        .readFileSync(preCommit, "utf8")
        .replace('"$KIBI_BIN" check-generated --staged --changed-only\n', ""),
    );
    const { exitCode, payload } = await runDoctorJson(cwd);
    expect(exitCode).toBe(1);
    const outdated = namedCheck(payload, "Kibi-managed hook sections");
    expect(outdated.passed).toBe(false);
    expect(outdated.message).toContain("pre-commit");
    expect(outdated.remediation).toBe(
      "Run: kibi init to refresh the kibi-managed hook sections",
    );
  });
});

/** A journaled branch store for main whose CURRENT pointer is `current`. */
function writeBranchStore(cwd: string, current: string): string {
  const storePath = ensureBranchStoreManifest(cwd, "main");
  mkdirSync(path.join(storePath, "rdf"), { recursive: true });
  writeFileSync(
    path.join(storePath, "storage.json"),
    '{"format":"kibi.rdf-journal.v1","schemaVersion":1}\n',
  );
  writeFileSync(path.join(storePath, "CURRENT"), `${current}\n`);
  return storePath;
}

function writeAuthoredRequirement(cwd: string): void {
  mkdirSync(path.join(cwd, ".kb", "requirements"), { recursive: true });
  writeFileSync(
    path.join(cwd, ".kb", "requirements", "REQ-demo-login.md"),
    "---\nid: REQ-demo-login\ntitle: Login\nstatus: open\n---\nUsers must log in.\n",
  );
}

// implements REQ-cli-doctor
describe("doctorCommand branch store", () => {
  test("fails with kibi sync when authored sources exist and the branch has no store", async () => {
    const cwd = preparedWorkspace();
    writeOkManifest(cwd);
    writeAuthoredRequirement(cwd);
    const { exitCode, payload } = await runDoctorJson(cwd);
    expect(exitCode).toBe(1);
    const check = namedCheck(payload, "Branch store");
    expect(check.passed).toBe(false);
    expect(check.message).toContain(
      "The KB store for branch main does not exist yet, while .kb/ holds 1 authored source file(s).",
    );
    expect(check.remediation).toBe("Run: kibi sync");
  });

  test("fails on an empty store (generation 0) beside authored sources", async () => {
    const cwd = preparedWorkspace();
    writeOkManifest(cwd);
    writeAuthoredRequirement(cwd);
    writeBranchStore(cwd, "generation-1:0");
    const { exitCode, text } = await runDoctorTable(cwd);
    expect(exitCode).toBe(1);
    expect(text).toContain(
      "✗ Branch store: The KB store for branch main is empty (generation-1:0: nothing compiled)",
    );
    expect(text).toContain("  → Run: kibi sync");
    expect(text).not.toContain("All checks passed");
  });

  test("passes a compiled store and reports its generation", async () => {
    const cwd = preparedWorkspace();
    writeOkManifest(cwd);
    writeAuthoredRequirement(cwd);
    writeBranchStore(cwd, "generation-1:4");
    const { payload } = await runDoctorJson(cwd);
    const check = namedCheck(payload, "Branch store");
    expect(check.passed).toBe(true);
    expect(check.message).toBe("Compiled for main (generation-1:4)");
  });

  test("warns, without failing, when the git hooks kibi init installs are missing", async () => {
    const cwd = preparedWorkspace();
    writeOkManifest(cwd);
    const { exitCode, payload } = await runDoctorJson(cwd);
    expect(exitCode).toBe(0);
    expect(payload.passed).toBe(true);
    expect((payload as unknown as { warnings: number }).warnings).toBe(1);
    const hooks = namedCheck(payload, "Git hooks") as DoctorCheckResult & {
      warning?: boolean;
    };
    expect(hooks.passed).toBe(true);
    expect(hooks.warning).toBe(true);
    expect(hooks.remediation).toBe("Run: kibi init (installs the git hooks)");
  });
});
