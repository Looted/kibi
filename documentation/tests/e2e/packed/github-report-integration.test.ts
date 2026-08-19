import assert from "node:assert";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import {
  type Tarballs,
  type TestSandbox,
  checkPrologAvailable,
  createSandbox,
  kibi,
  packAll,
  run,
} from "./helpers.js";

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

const REPORT_WORKFLOW = ".github/workflows/kibi-report.yml";

export async function verifyGitHubReportIntegration(
  sandbox: TestSandbox,
): Promise<void> {
  await run("git", ["commit", "--allow-empty", "-m", "init"], {
    cwd: sandbox.repoDir,
    env: sandbox.env,
  });
  await run(
    "git",
    ["remote", "add", "origin", "https://github.com/Acme/Widgets.git"],
    { cwd: sandbox.repoDir, env: sandbox.env },
  );
  writeFileSync(join(sandbox.repoDir, "README.md"), "# Widgets\n");

  const rejected = await kibi(sandbox, ["init", "--badge-only", "--no-hooks"]);
  assert.notStrictEqual(
    rejected.exitCode,
    0,
    "`kibi init --badge-only` without `--github` must be rejected",
  );
  assert.match(
    `${rejected.stdout}${rejected.stderr}`,
    /--badge-only requires --github/,
  );

  const first = await kibi(sandbox, ["init", "--github", "--no-hooks"], {
    timeoutMs: 120000,
  });
  assert.strictEqual(
    first.exitCode,
    0,
    `kibi init --github should succeed: ${first.stderr || first.stdout}`,
  );
  assert.match(first.stdout, /Added \.github\/workflows\/kibi-report\.yml/);
  assert.match(
    first.stdout,
    /GitHub → Settings → Pages → Source → GitHub Actions/,
  );

  const workflowPath = join(sandbox.repoDir, REPORT_WORKFLOW);
  const workflow = readFileSync(workflowPath, "utf8");
  assert.match(workflow, /kibi report --output kibi-report/);
  assert.ok(
    workflow.includes(
      "KIBI_BRANCH: ${{ github.head_ref || github.ref_name }}",
    ),
    "detached checkouts must set KIBI_BRANCH from the GitHub ref",
  );
  assert.ok(workflow.includes("pull_request:"), "workflow must use pull_request");
  assert.ok(
    !workflow.includes("pull_request_target"),
    "workflow must not use pull_request_target",
  );
  assert.ok(
    workflow.includes("contents: read"),
    "pull_request jobs must use contents: read",
  );
  assert.ok(
    workflow.includes("name: kibi-pr-report"),
    "pull requests must upload a reviewable report artifact",
  );
  assert.ok(
    workflow.includes("mkdir -p pages/kibi-report"),
    "Pages output must be namespaced under /kibi-report/",
  );
  assert.ok(
    workflow.includes("github.event_name != 'pull_request'"),
    "pull_request must never deploy GitHub Pages",
  );
  assert.ok(
    workflow.includes("permissions:") && workflow.includes("pages: write"),
    "Pages publish jobs may request pages: write",
  );

  const readme = readFileSync(join(sandbox.repoDir, "README.md"), "utf8");
  assert.ok(
    readme.includes(
      "[![Kibi requirement health](https://acme.github.io/widgets/kibi-report/badge.svg)](https://acme.github.io/widgets/kibi-report/)",
    ),
    "README must gain a badge that links to the namespaced report",
  );
  assert.ok(readme.includes("# Widgets"), "existing README title must be kept");
  assert.ok(
    readFileSync(join(sandbox.repoDir, ".gitignore"), "utf8").includes(
      "kibi-report/",
    ),
    "generated report directory must be gitignored",
  );

  const second = await kibi(sandbox, ["init", "--github", "--no-hooks"], {
    timeoutMs: 120000,
  });
  assert.strictEqual(
    second.exitCode,
    0,
    `re-running kibi init --github should succeed: ${second.stderr || second.stdout}`,
  );
  const readmeAfterRerun = readFileSync(
    join(sandbox.repoDir, "README.md"),
    "utf8",
  );
  assert.strictEqual(
    readmeAfterRerun.split("Kibi requirement health").length - 1,
    1,
    "re-running the scaffold must not duplicate the badge",
  );

  mkdirSync(join(sandbox.repoDir, ".github/workflows"), { recursive: true });
  writeFileSync(workflowPath, "name: custom\n");
  const conflicted = await kibi(sandbox, ["init", "--github", "--no-hooks"], {
    timeoutMs: 120000,
  });
  assert.strictEqual(
    readFileSync(workflowPath, "utf8"),
    "name: custom\n",
    "re-running the scaffold must not overwrite a customized workflow",
  );
  assert.match(
    `${conflicted.stdout}${conflicted.stderr}`,
    /already exists and differs/,
  );

  console.log("  ✓ GitHub report workflow, badge, and PR-vs-Pages guards");
}

if (RUN_NODE_TEST_SUITE) {
  describe("Packed E2E: GitHub report integration", { timeout: 180000 }, () => {
    let tarballs: Tarballs;
    let sandbox: TestSandbox;
    let hasProlog = false;

    before(
      async () => {
        hasProlog = checkPrologAvailable();
        if (!hasProlog) {
          console.warn(
            "⚠️  SWI-Prolog not available, skipping GitHub report integration E2E",
          );
          return;
        }
        tarballs = await packAll();
        sandbox = createSandbox();
        await sandbox.install(tarballs);
        await sandbox.initGitRepo();
      },
      { timeout: 120000 },
    );

    after(
      async () => {
        if (sandbox) {
          await sandbox.cleanup();
        }
      },
      { timeout: 60000 },
    );

    it("scaffolds the documented report workflow and README badge", async () => {
      if (!hasProlog) return;
      await verifyGitHubReportIntegration(sandbox);
    });
  });
}
