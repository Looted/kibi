import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { branchStorePath } from "../../src/utils/branch-store-locator.js";
import { LATEST_KB_SCHEMA_VERSION } from "../../src/utils/schema-version.js";
import { execSync, isolatedCliSandboxEnv } from "../helpers/isolated-env.js";

// executable_for TEST-KIBI-BOOTSTRAP-PLAN-APPLY
describe("kibi init", () => {
  let tmpDir: string;
  const kibiBin = path.resolve(__dirname, "../../bin/kibi");

  beforeEach(() => {
    tmpDir = mkdtempSync(path.join(os.tmpdir(), "kibi-test-init-"));
  });

  afterEach(() => {
    if (tmpDir && existsSync(tmpDir)) {
      try {
        execSync(`bun ${kibiBin} engine stop`, {
          cwd: tmpDir,
          stdio: "ignore",
        });
      } catch {
        // Most init-only cases never start the engine.
      }
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("creates .kb directory structure", () => {
    execSync("git init -b main", { cwd: tmpDir });
    // Create initial commit so branch exists (required per ADR-012)
    execSync("git config user.email 'test@test.com'", { cwd: tmpDir });
    execSync("git config user.name 'Test User'", { cwd: tmpDir });
    execSync("git commit --allow-empty -m 'init'", { cwd: tmpDir });

    execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "inherit",
    });

    expect(existsSync(path.join(tmpDir, ".kb"))).toBe(true);
    expect(existsSync(path.join(tmpDir, ".kb/manifest.json"))).toBe(true);
    expect(existsSync(path.join(tmpDir, ".kb/config.json"))).toBe(false);
    expect(existsSync(path.join(tmpDir, ".kb/schema"))).toBe(true);
    expect(existsSync(path.join(tmpDir, ".kb/requirements"))).toBe(true);
    expect(existsSync(path.join(tmpDir, ".kb/scenarios"))).toBe(true);
    expect(existsSync(path.join(tmpDir, ".kb/tests"))).toBe(true);
    expect(existsSync(path.join(tmpDir, ".kb/facts"))).toBe(true);
    expect(existsSync(path.join(tmpDir, ".kb/adr"))).toBe(true);
    expect(existsSync(path.join(tmpDir, ".kb/flags"))).toBe(true);
    expect(existsSync(path.join(tmpDir, ".kb/events"))).toBe(true);
    expect(existsSync(path.join(tmpDir, ".kb/branches"))).toBe(true);
    // The explicit test branch remains main.
    expect(existsSync(branchStorePath(tmpDir, "main"))).toBe(true);
  }, 120000);

  test("copies schema files to .kb/schema/", () => {
    execSync("git init -b main", { cwd: tmpDir });
    execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "inherit",
    });

    expect(existsSync(path.join(tmpDir, ".kb/schema/entities.pl"))).toBe(true);
    expect(existsSync(path.join(tmpDir, ".kb/schema/relationships.pl"))).toBe(
      true,
    );
    expect(existsSync(path.join(tmpDir, ".kb/schema/validation.pl"))).toBe(
      true,
    );
  }, 120000);

  test("creates a Kibi-owned lifecycle manifest without path or check policy", () => {
    execSync("git init -b main", { cwd: tmpDir });
    execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "inherit",
    });

    const manifestPath = path.join(tmpDir, ".kb/manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));

    expect(manifest.manifestVersion).toBe(1);
    expect(manifest.schemaVersion).toBe(LATEST_KB_SCHEMA_VERSION);
    expect(manifest.semanticAdvisorBackfill).toBe("not_applicable");
    expect(manifest.paths).toBeUndefined();
    expect(manifest.checks).toBeUndefined();
  });

  test("creates .kb/symbols.yaml when it is missing", () => {
    execSync("git init -b main", { cwd: tmpDir });
    execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "inherit",
    });

    const symbolsPath = path.join(tmpDir, ".kb", "symbols.yaml");
    expect(existsSync(symbolsPath)).toBe(true);
    const content = readFileSync(symbolsPath, "utf-8");
    expect(content).toContain("# symbols.yaml");
    expect(content).toContain("symbols: []");
  });

  test("leaves the manifest and symbols manifest of a legacy layout to kibi migrate", () => {
    execSync("git init -b main", { cwd: tmpDir });
    mkdirSync(path.join(tmpDir, ".kb"));
    writeFileSync(
      path.join(tmpDir, ".kb", "config.json"),
      JSON.stringify({
        schemaVersion: 4,
        paths: { requirements: "kibi-docs/requirements" },
      }),
    );
    mkdirSync(path.join(tmpDir, "kibi-docs", "requirements"), {
      recursive: true,
    });
    writeFileSync(
      path.join(tmpDir, "kibi-docs", "requirements", "REQ-1.md"),
      "---\nid: REQ-1\ntitle: Auth\nstatus: open\n---\n",
    );

    const output = execSync(`bun ${kibiBin} init --no-hooks`, {
      cwd: tmpDir,
      encoding: "utf8",
    });
    expect(output).toContain("kibi migrate --yes");
    expect(existsSync(path.join(tmpDir, ".kb", "manifest.json"))).toBe(false);
    expect(existsSync(path.join(tmpDir, ".kb", "symbols.yaml"))).toBe(false);

    const migrated = execSync(`bun ${kibiBin} migrate --yes`, {
      cwd: tmpDir,
      encoding: "utf8",
    });
    expect(migrated).toContain("(was 4)");
    expect(
      existsSync(path.join(tmpDir, ".kb", "requirements", "REQ-1.md")),
    ).toBe(true);
  });

  test("ignores derived .kb/ state while keeping knowledge tracked", () => {
    execSync("git init -b main", { cwd: tmpDir });
    execSync("git config user.email 'test@test.com'", { cwd: tmpDir });
    execSync("git config user.name 'Test User'", { cwd: tmpDir });
    execSync("git commit --allow-empty -m 'init'", { cwd: tmpDir });

    execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "inherit",
    });

    const gitignorePath = path.join(tmpDir, ".gitignore");
    const content = readFileSync(gitignorePath, "utf-8");

    expect(content).toContain(".kb/branches/");
    expect(content).toContain(".kb/recovery/");
    expect(content).toContain(".kb/proof/runs/");
    expect(content).toContain(".kb/briefs/");
    expect(content).toContain(".kb/migrations/");
    expect(content).toContain(".kb/usage.log");
    expect(content).toContain(".env.kibi");
    expect(content).not.toMatch(/^\.kb\/$/m);
  }, 120000);

  test("does not scaffold a user-editable check policy", () => {
    execSync("git init -b main", { cwd: tmpDir });
    execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "inherit",
    });

    expect(existsSync(path.join(tmpDir, ".kb/config.json"))).toBe(false);
    const manifest = JSON.parse(
      readFileSync(path.join(tmpDir, ".kb/manifest.json"), "utf-8"),
    );
    expect(manifest.checks).toBeUndefined();
  });

  test("does not fail if .kb already exists", () => {
    execSync("git init -b main", { cwd: tmpDir });
    execSync("git config user.email 'test@test.com'", { cwd: tmpDir });
    execSync("git config user.name 'Test User'", { cwd: tmpDir });
    execSync("git commit --allow-empty -m 'init'", { cwd: tmpDir });
    mkdirSync(path.join(tmpDir, ".kb"));

    const out = execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      encoding: "utf8",
      stdio: "pipe",
    });

    // Repeated init reports preservation while completing missing infrastructure.
    expect(out).toContain("Existing Kibi source knowledge was preserved.");
  });

  test("completes an empty existing root into a bootstrap-eligible installation", () => {
    execSync("git init -b main", { cwd: tmpDir });
    mkdirSync(path.join(tmpDir, ".kb"));
    const out = execSync(`bun ${kibiBin} init --no-hooks`, {
      cwd: tmpDir,
      encoding: "utf8",
      stdio: "pipe",
    });
    expect(out).toContain("Bootstrap Kibi for this repository");
    expect(out).not.toContain("repair degraded Kibi infrastructure");
    for (const lane of [
      "requirements",
      "scenarios",
      "tests",
      "facts",
      "adr",
      "flags",
      "events",
    ]) {
      expect(statSync(path.join(tmpDir, ".kb", lane)).isDirectory()).toBe(true);
    }
    expect(existsSync(path.join(tmpDir, ".kb/schema/entities.pl"))).toBe(true);
    expect(existsSync(branchStorePath(tmpDir, "main"))).toBe(true);
    expect(readFileSync(path.join(tmpDir, ".gitignore"), "utf8")).toContain(
      ".kb/branches/",
    );
  });

  test("repairs missing infrastructure and preserves existing knowledge and schema on repeated init", () => {
    execSync("git init -b main", { cwd: tmpDir });
    execSync(`bun ${kibiBin} init --no-hooks`, { cwd: tmpDir, stdio: "pipe" });
    const requirementPath = path.join(
      tmpDir,
      ".kb/requirements/REQ-example.md",
    );
    writeFileSync(
      requirementPath,
      "---\nid: REQ-example\ntitle: Example\nstatus: active\n---\nRetain authored content.\n",
    );
    const schemaPath = path.join(tmpDir, ".kb/schema/entities.pl");
    writeFileSync(schemaPath, "% preserved local schema\n");
    const preservedPaths = [
      requirementPath,
      schemaPath,
      path.join(tmpDir, ".kb/manifest.json"),
      path.join(tmpDir, ".kb/symbols.yaml"),
    ];
    const preserved = preservedPaths.map((file) => readFileSync(file, "utf8"));
    rmSync(path.join(tmpDir, ".kb/scenarios"), { recursive: true });
    rmSync(path.join(tmpDir, ".kb/schema/relationships.pl"));
    for (let attempt = 0; attempt < 2; attempt++) {
      const out = execSync(`bun ${kibiBin} init --no-hooks`, {
        cwd: tmpDir,
        encoding: "utf8",
        stdio: "pipe",
      });
      expect(out).not.toContain("repair degraded Kibi infrastructure");
      expect(statSync(path.join(tmpDir, ".kb/scenarios")).isDirectory()).toBe(
        true,
      );
      expect(existsSync(path.join(tmpDir, ".kb/schema/relationships.pl"))).toBe(
        true,
      );
      expect(preservedPaths.map((file) => readFileSync(file, "utf8"))).toEqual(
        preserved,
      );
    }
  });

  test("refuses a symlinked knowledge lane without writing through it", () => {
    execSync("git init -b main", { cwd: tmpDir });
    const outside = path.join(tmpDir, "outside");
    mkdirSync(outside);
    mkdirSync(path.join(tmpDir, ".kb"));
    symlinkSync(outside, path.join(tmpDir, ".kb/requirements"));
    expect(() =>
      execSync(`bun ${kibiBin} init --no-hooks`, {
        cwd: tmpDir,
        stdio: "pipe",
      }),
    ).toThrow();
    expect(existsSync(path.join(tmpDir, ".kb/manifest.json"))).toBe(false);
    expect(existsSync(path.join(outside, "manifest.json"))).toBe(false);
  });

  test("routes an initialized thin repository to bootstrap", () => {
    execSync("git init -b main", { cwd: tmpDir });
    const out = execSync(`bun ${kibiBin} init --no-hooks`, {
      cwd: tmpDir,
      encoding: "utf8",
      stdio: "pipe",
    });

    expect(out).toContain("Bootstrap Kibi for this repository");
    expect(out).not.toContain("already has seeded Kibi knowledge");
  }, 120000);

  test("routes an initialized seeded repository to normal Kibi work", () => {
    execSync("git init -b main", { cwd: tmpDir });
    execSync(`bun ${kibiBin} init --no-hooks`, {
      cwd: tmpDir,
      stdio: "pipe",
    });
    const source = [
      ["requirements", "REQ-INIT-SEEDED"],
      ["scenarios", "SCEN-INIT-SEEDED"],
      ["tests", "TEST-INIT-SEEDED"],
      ["facts", "FACT-INIT-SEEDED-ONE"],
      ["facts", "FACT-INIT-SEEDED-TWO"],
    ] as const;
    for (const [lane, id] of source) {
      writeFileSync(
        path.join(tmpDir, ".kb", lane, `${id}.md`),
        `---\nid: ${id}\ntitle: ${id}\nstatus: active\n---\n`,
      );
    }

    const out = execSync(`bun ${kibiBin} init --no-hooks`, {
      cwd: tmpDir,
      encoding: "utf8",
      stdio: "pipe",
    });

    expect(out).toContain("already has seeded Kibi knowledge");
    expect(out).not.toContain("Bootstrap Kibi for this repository");
  }, 120000);

  test("supports the cold-start init, plan, approved apply, and status lifecycle", () => {
    execSync("git init -b main", { cwd: tmpDir });
    execSync("git config user.email 'test@test.com'", { cwd: tmpDir });
    execSync("git config user.name 'Test User'", { cwd: tmpDir });
    writeFileSync(
      path.join(tmpDir, "package.json"),
      '{"name":"cold-start-init-e2e","scripts":{"test":"bun test"}}\n',
    );
    execSync("git add package.json && git commit -m init", { cwd: tmpDir });
    execSync(`bun ${kibiBin} init --no-hooks`, {
      cwd: tmpDir,
      stdio: "pipe",
    });

    const plan = JSON.parse(
      execSync(
        `printf '%s\\n' '{}' | bun ${kibiBin} plan-bootstrap --input -`,
        {
          cwd: tmpDir,
          encoding: "utf8",
        },
      ),
    ) as {
      data?: {
        plan?: { status?: string; planHash?: string };
      };
    };
    expect(plan.data?.plan?.status).toBe("ready");
    expect(plan.data?.plan?.planHash).toMatch(/^[a-f0-9]{64}$/);

    const approved = plan.data?.plan;
    if (approved === undefined || approved.planHash === undefined) {
      throw new Error("cold-start planner did not return an approved plan");
    }
    const approvedInput = path.join(
      os.tmpdir(),
      `kibi-approved-plan-${path.basename(tmpDir)}.json`,
    );
    writeFileSync(
      approvedInput,
      JSON.stringify({ plan: approved, approvedPlanHash: approved.planHash }),
    );
    const applied = JSON.parse(
      execSync(`bun ${kibiBin} apply-plan --input ${approvedInput}`, {
        cwd: tmpDir,
        encoding: "utf8",
      }),
    ) as { data?: { outcome?: string; version?: string } };
    expect(applied.data?.outcome).toBe("applied");
    expect(applied.data?.version).toBe("kibi.plan-apply-result.v1");

    const checked = JSON.parse(
      execSync(`printf '%s\\n' '{}' | bun ${kibiBin} check --input -`, {
        cwd: tmpDir,
        encoding: "utf8",
      }),
    ) as { status?: string };
    const status = JSON.parse(
      execSync(`printf '%s\\n' '{}' | bun ${kibiBin} status --input -`, {
        cwd: tmpDir,
        encoding: "utf8",
      }),
    ) as {
      status?: string;
      data?: { bootstrap?: { nextAction?: { operation?: string } } };
    };
    expect(checked.status).toBe("success");
    expect(status.status).toBe("success");
    expect(status.data?.bootstrap?.nextAction?.operation).toBe(
      "kb_plan_bootstrap",
    );
  }, 120000);

  test("installs git hooks by default", () => {
    execSync("git init -b main", { cwd: tmpDir });
    execSync("git config user.email 'test@test.com'", { cwd: tmpDir });
    execSync("git config user.name 'Test User'", { cwd: tmpDir });
    execSync("git commit --allow-empty -m 'init'", { cwd: tmpDir });
    execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "inherit",
    });

    const postCheckout = path.join(tmpDir, ".git/hooks/post-checkout");
    const postMerge = path.join(tmpDir, ".git/hooks/post-merge");

    expect(existsSync(postCheckout)).toBe(true);
    expect(existsSync(postMerge)).toBe(true);

    // Check executable bit
    const checkoutStats = statSync(postCheckout);
    const mergeStats = statSync(postMerge);
    expect(checkoutStats.mode & 0o111).not.toBe(0);
    expect(mergeStats.mode & 0o111).not.toBe(0);
  });

  test("does not install hooks when --no-hooks is used", () => {
    execSync("git init -b main", { cwd: tmpDir });
    execSync("git config user.email 'test@test.com'", { cwd: tmpDir });
    execSync("git config user.name 'Test User'", { cwd: tmpDir });
    execSync("git commit --allow-empty -m 'init'", { cwd: tmpDir });
    execSync(`bun ${kibiBin} init --no-hooks`, {
      cwd: tmpDir,
      stdio: "inherit",
    });

    const postCheckout = path.join(tmpDir, ".git/hooks/post-checkout");
    const postMerge = path.join(tmpDir, ".git/hooks/post-merge");
    const preCommit = path.join(tmpDir, ".git/hooks/pre-commit");

    expect(existsSync(postCheckout)).toBe(false);
    expect(existsSync(postMerge)).toBe(false);
    expect(existsSync(preCommit)).toBe(false);
  });

  test("installs pre-commit hook by default", () => {
    execSync("git init -b main", { cwd: tmpDir });
    execSync("git config user.email 'test@test.com'", { cwd: tmpDir });
    execSync("git config user.name 'Test User'", { cwd: tmpDir });
    execSync("git commit --allow-empty -m 'init'", { cwd: tmpDir });
    execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "inherit",
    });

    const preCommit = path.join(tmpDir, ".git/hooks/pre-commit");

    expect(existsSync(preCommit)).toBe(true);

    const preCommitStats = statSync(preCommit);
    expect(preCommitStats.mode & 0o111).not.toBe(0);

    const content = readFileSync(preCommit, "utf8");
    expect(content).toContain("kibi check");
    expect(content).toContain(
      '"$KIBI_BIN" check-generated --staged --changed-only',
    );
  });

  test("exits with code 0 on success", () => {
    execSync("git init -b main", { cwd: tmpDir });
    execSync("git config user.email 'test@test.com'", { cwd: tmpDir });
    execSync("git config user.name 'Test User'", { cwd: tmpDir });
    execSync("git commit --allow-empty -m 'init'", { cwd: tmpDir });

    const result = execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "pipe",
    });

    expect(result).toBeDefined();
  });

  test("allows init in a non-git directory with an explicit branch", () => {
    execSync(`bun ${kibiBin} init --no-hooks`, {
      cwd: tmpDir,
      env: isolatedCliSandboxEnv({ KIBI_BRANCH: "trunk" }),
      stdio: "pipe",
    });

    expect(existsSync(path.join(tmpDir, ".kb"))).toBe(true);
    expect(existsSync(path.join(tmpDir, ".kb/manifest.json"))).toBe(true);
    expect(existsSync(path.join(tmpDir, ".kb/schema"))).toBe(true);
    expect(existsSync(branchStorePath(tmpDir, "trunk"))).toBe(true);
  });

  test("prints helpful message if .kb/ already exists", () => {
    execSync("git init -b main", { cwd: tmpDir });
    execSync("git config user.email 'test@test.com'", { cwd: tmpDir });
    execSync("git config user.name 'Test User'", { cwd: tmpDir });
    execSync("git commit --allow-empty -m 'init'", { cwd: tmpDir });
    mkdirSync(path.join(tmpDir, ".kb"));

    const out = execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      encoding: "utf8",
      stdio: "pipe",
    });

    // Repeated init reports preservation while completing missing infrastructure.
    expect(out).toContain("Existing Kibi source knowledge was preserved.");
  });

  test("init --help documents --github and --badge-only", () => {
    const help = execSync(`bun ${kibiBin} init --help`, {
      cwd: tmpDir,
      encoding: "utf8",
    });
    expect(help).toContain("--github");
    expect(help).toContain("--badge-only");
  });

  test("rejects --badge-only without --github", () => {
    let caught: { status?: number | null; stderr?: string } | undefined;
    try {
      execSync(`bun ${kibiBin} init --badge-only`, {
        cwd: tmpDir,
        encoding: "utf8",
        stdio: "pipe",
      });
    } catch (error) {
      caught = error as { status?: number | null; stderr?: string };
    }
    expect(caught).toBeDefined();
    expect(caught?.status).toBe(1);
    expect(caught?.stderr ?? "").toContain("--badge-only requires --github");
  });

  describe("--print-hook", () => {
    function printHook(hook: string): string {
      return execSync(`bun ${kibiBin} init --print-hook ${hook}`, {
        cwd: tmpDir,
        encoding: "utf8",
        stdio: "pipe",
      });
    }

    test("is documented in init --help", () => {
      const help = execSync(`bun ${kibiBin} init --help`, {
        cwd: tmpDir,
        encoding: "utf8",
      });
      expect(help).toContain("--print-hook <hook>");
    });

    test("prints a pre-commit snippet and writes nothing", () => {
      execSync("git init -b main", { cwd: tmpDir, stdio: "ignore" });
      const snippet = printHook("pre-commit");

      expect(snippet).toContain(
        '"$KIBI_BIN" check-generated --staged --changed-only || exit $?',
      );
      expect(snippet).toContain('"$KIBI_BIN" check --staged || exit $?');
      expect(snippet).toContain('KIBI_BIN="$kibi_dir/node_modules/.bin/kibi"');
      expect(existsSync(path.join(tmpDir, ".kb"))).toBe(false);
      expect(existsSync(path.join(tmpDir, ".git/hooks/pre-commit"))).toBe(
        false,
      );
    });

    test("the pre-commit snippet runs a project-local kibi without PATH and propagates failures", () => {
      execSync("git init -b main", { cwd: tmpDir, stdio: "ignore" });
      const binDir = path.join(tmpDir, "node_modules", ".bin");
      mkdirSync(binDir, { recursive: true });
      const callLog = path.join(tmpDir, "calls.log");
      // A stand-in kibi that records its arguments and fails `check` when
      // FAIL_CHECK is set, so the hook's failure propagation is observable.
      writeFileSync(
        path.join(binDir, "kibi"),
        `#!/bin/sh\necho "$*" >> "${callLog}"\nif [ "$1" = "check" ] && [ -n "$FAIL_CHECK" ]; then exit 7; fi\nexit 0\n`,
        { mode: 0o755 },
      );
      const hookPath = path.join(tmpDir, "custom-pre-commit");
      writeFileSync(
        hookPath,
        `#!/bin/sh\necho lint\n${printHook("pre-commit")}echo after-kibi\n`,
        { mode: 0o755 },
      );
      const env = { ...process.env, PATH: "/usr/bin:/bin" };

      const ok = execSync(`sh ${hookPath}`, {
        cwd: tmpDir,
        encoding: "utf8",
        env,
      });
      expect(ok).toContain("after-kibi");
      expect(readFileSync(callLog, "utf8")).toBe(
        "check-generated --staged --changed-only\ncheck --staged\n",
      );

      let caught: { status?: number | null; stdout?: string } | undefined;
      try {
        execSync(`sh ${hookPath}`, {
          cwd: tmpDir,
          encoding: "utf8",
          env: { ...env, FAIL_CHECK: "1" },
          stdio: "pipe",
        });
      } catch (error) {
        caught = error as { status?: number | null; stdout?: string };
      }
      expect(caught?.status).toBe(7);
      expect(caught?.stdout ?? "").not.toContain("after-kibi");
    });

    test("guards post-checkout and post-rewrite snippets like the templates", () => {
      expect(printHook("post-checkout")).toContain('if [ "$3" = "1" ]; then');
      expect(printHook("post-rewrite")).toContain(
        'if [ "$1" = "rebase" ]; then',
      );
      expect(printHook("post-merge")).toContain('"$KIBI_BIN" sync');
    });

    test("rejects a hook Kibi does not manage", () => {
      let caught: { status?: number | null; stderr?: string } | undefined;
      try {
        printHook("pre-push");
      } catch (error) {
        caught = error as { status?: number | null; stderr?: string };
      }
      expect(caught?.status).toBe(1);
      expect(caught?.stderr ?? "").toContain(
        "unknown hook 'pre-push' for --print-hook. Expected one of: post-checkout, post-merge, post-rewrite, pre-commit, all.",
      );
    });
  });

  test("init --github scaffolds the documented report workflow", () => {
    execSync("git init -b main", { cwd: tmpDir });
    execSync("git config user.email 'test@test.com'", { cwd: tmpDir });
    execSync("git config user.name 'Test User'", { cwd: tmpDir });
    execSync("git commit --allow-empty -m 'init'", { cwd: tmpDir });
    execSync("git remote add origin https://github.com/Acme/Widgets.git", {
      cwd: tmpDir,
    });
    writeFileSync(path.join(tmpDir, "README.md"), "# Widgets\n");

    const out = execSync(`bun ${kibiBin} init --github --no-hooks`, {
      cwd: tmpDir,
      encoding: "utf8",
      stdio: "pipe",
    });

    expect(out).toContain("Added .github/workflows/kibi-report.yml");
    expect(out).toContain(
      "GitHub → Settings → Pages → Source → GitHub Actions",
    );
    const workflow = readFileSync(
      path.join(tmpDir, ".github/workflows/kibi-report.yml"),
      "utf8",
    );
    expect(workflow).toContain("kibi report --output kibi-report");
    expect(workflow).toContain(
      "KIBI_BRANCH: ${{ github.head_ref || github.ref_name }}",
    );
    expect(workflow).toContain("pull_request:");
    expect(workflow).not.toContain("pull_request_target");
    expect(workflow).toContain("name: kibi-pr-report");
    const readme = readFileSync(path.join(tmpDir, "README.md"), "utf8");
    expect(readme).toContain(
      "[![Kibi requirement health](https://acme.github.io/Widgets/kibi-report/badge.svg)](https://acme.github.io/Widgets/kibi-report/)",
    );
    expect(readFileSync(path.join(tmpDir, ".gitignore"), "utf8")).toContain(
      "kibi-report/",
    );
  }, 120000);
});
