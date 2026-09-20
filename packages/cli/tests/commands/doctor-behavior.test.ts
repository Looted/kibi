// implements REQ-cli-doctor
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import * as childProcess from "node:child_process";
import * as fs from "node:fs";
import { mkdirSync, writeFileSync } from "node:fs";
import * as nodeModule from "node:module";
import path from "node:path";
import { doctorCommand } from "../../src/commands/doctor.js";
import { engineStopCommand } from "../../src/commands/engine.js";
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
  const cwd = createGitWorkspace();
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
 * Make the SWI-Prolog probe deterministic: return a fixed banner, or throw to
 * simulate swipl missing from PATH. Every other command (notably
 * `git status`) still runs for real.
 */
function mockSwipl(output: string | Error): void {
  const originalExec = childProcess.execSync;
  const exec = spyOn(childProcess, "execSync").mockImplementation(((
    command: string,
    options?: unknown,
  ) => {
    if (String(command).includes("swipl")) {
      if (output instanceof Error) throw output;
      return output;
    }
    return originalExec(command, options as never);
  }) as typeof childProcess.execSync);
  restores.push(() => exec.mockRestore());
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
    mockSwipl(new Error("spawn swipl ENOENT"));
    const { exitCode, text } = await runDoctorTable(cwd);
    expect(exitCode).toBe(1);
    expect(text).toContain("Kibi Environment Diagnostics");
    expect(text).toContain("✗ SWI-Prolog: Not installed or not in PATH");
    expect(text).toContain(
      "→ Install SWI-Prolog from https://www.swi-prolog.org/ and add to PATH",
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
    expect(text).toContain("All checks passed! Your environment is ready.");
    expect(text).toContain("✓ SWI-Prolog: Version version 9.2 installed");
    expect(text).toContain("✓ .kb/ directory: Found");
    expect(text).toContain("✓ .kb/ manifest: schemaVersion 5");
    expect(text).toContain("✓ Canonical storage: Canonical .kb/ layout");
    expect(text).toContain("✓ Git repository: Found");
    expect(text).toContain("✓ Git hooks: Not installed (optional)");
    expect(text).toContain("✓ pre-commit hook: Not installed (optional)");
    expect(text).toContain("✓ post-rewrite hook: Not installed (optional)");
    expect(text).not.toContain("✗");
    expect(text).not.toContain("Some checks failed");
  });
});

describe("doctorCommand SWI-Prolog check", () => {
  test("fails with upgrade guidance for an 8.x banner", async () => {
    const cwd = preparedWorkspace();
    writeOkManifest(cwd);
    mockSwipl("SWI-Prolog version 8.4 (threaded)\n");
    const { exitCode, payload } = await runDoctorJson(cwd);
    expect(exitCode).toBe(1);
    const check = namedCheck(payload, "SWI-Prolog");
    expect(check.passed).toBe(false);
    expect(check.message).toBe("Version 8.x found (requires ≥9.0)");
    expect(check.remediation).toBe(
      "Upgrade SWI-Prolog to version 9.0 or higher from https://www.swi-prolog.org/",
    );
  });

  test("fails when the banner has no parsable version", async () => {
    const cwd = preparedWorkspace();
    writeOkManifest(cwd);
    mockSwipl("SWI-Prolog (threaded, 64 bits, version unknown)\n");
    const { exitCode, payload } = await runDoctorJson(cwd);
    expect(exitCode).toBe(1);
    const check = namedCheck(payload, "SWI-Prolog");
    expect(check.passed).toBe(false);
    expect(check.message).toBe("Unable to parse version");
    expect(check.remediation).toBe(
      "Reinstall SWI-Prolog from https://www.swi-prolog.org/",
    );
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
      `---\nid: REQ-1\ntitle: Auth\nstatus: open\n---\n`,
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
      "Run: chmod +x .git/hooks/post-checkout .git/hooks/post-merge",
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
    expect(check.remediation).toBe("Run: chmod +x .git/hooks/pre-commit");
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
    expect(check.remediation).toBe("Run: chmod +x .git/hooks/post-rewrite");
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
