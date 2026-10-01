import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, before, beforeEach, describe, it } from "node:test";
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
const CHECK_TIMEOUT_MS = 30_000;
const SETUP_TIMEOUT_MS = 120_000;
const FIXTURE_TIME = "2026-09-26T00:00:00Z";

type CommandResult = Readonly<{
  stdout: string;
  stderr: string;
  exitCode: number;
}>;

type OwnershipViolation = Readonly<{
  symbolId: string;
  name: string;
  file: string;
  line: number;
  column: number;
  currentLinks: number;
  requiredLinks: number;
}>;

type SourceSide = Readonly<{
  status: string;
  language: string;
  symbolCount: number;
  providerId: string | null;
  inputFingerprint: string;
  providerFingerprint: string | null;
}>;

type StagedFile = Readonly<{
  path: string;
  status: string;
  analysisDepth: string;
  disposition: string;
  requirementIds: string[];
  evidencePaths: string[];
  providerId: string | null;
  sourceAnalysis?: Readonly<{
    before: SourceSide | null;
    after: SourceSide | null;
  }>;
}>;

type StagedCheck = Readonly<{
  structuredContent: Readonly<{
    violations: OwnershipViolation[];
    count: number;
    diagnostics: Array<{
      id: string;
      severity: string;
      blocking: boolean;
      path: string;
      message: string;
      suggestion: string;
      requirementIds: string[];
      evidencePaths: string[];
    }>;
    staged: Readonly<{
      files: StagedFile[];
      diagnostics: Array<{
        id: string;
        severity: string;
        blocking: boolean;
        path: string;
        requirementIds: string[];
        evidencePaths: string[];
      }>;
    }> | null;
    messages: string[];
  }>;
}>;

type SymbolFixture = Readonly<{
  id: string;
  title: string;
  sourceFile: string;
  relation?: Readonly<{ type: string; target: string }>;
}>;

function commandText(result: CommandResult): string {
  return result.stdout + result.stderr;
}

function assertCommandExit(
  result: CommandResult,
  expected: number,
  label: string,
): void {
  assert.equal(
    result.exitCode,
    expected,
    `${label} exited ${result.exitCode}; expected ${expected}.\n${commandText(result)}`,
  );
}

function runHostGit(args: string[], cwd = process.cwd()): Buffer {
  return execFileSync("git", args, {
    cwd,
    env: process.env,
    encoding: "buffer",
    maxBuffer: 32 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function hostGitSnapshot(): string {
  const cwd = process.cwd();
  const stableCommands = [
    ["rev-parse", "--verify", "HEAD"],
    ["rev-parse", "--abbrev-ref", "HEAD"],
    ["status", "--porcelain=v2", "--untracked-files=all", "-z"],
    ["ls-files", "--stage", "-z"],
    ["diff", "--raw", "HEAD"],
    ["diff", "--cached", "--raw"],
  ];
  const state = stableCommands.map((args) => [
    args.join(" "),
    runHostGit(args, cwd).toString("hex"),
  ]);
  return JSON.stringify(state);
}

function assertHostGitUnchanged(before: string): void {
  assert.equal(
    hostGitSnapshot(),
    before,
    "Packed fixture changed host Git names, index, or worktree",
  );
}

function gitOptions(sandbox: TestSandbox) {
  return {
    cwd: sandbox.repoDir,
    env: sandbox.env,
    timeoutMs: SETUP_TIMEOUT_MS,
  };
}

function parseNulPaths(output: string): string[] {
  return output.split("\0").filter(Boolean);
}

function parsePorcelainPaths(output: string): string[] {
  const records = parseNulPaths(output);
  const paths: string[] = [];
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    assert.ok(
      record && record.length >= 4,
      "invalid NUL-delimited Git status record",
    );
    const status = record.slice(0, 2);
    paths.push(record.slice(3));
    if (status.includes("R") || status.includes("C")) {
      const originalPath = records[index + 1];
      assert.ok(
        originalPath,
        "renamed Git status record omitted its source path",
      );
      paths.push(originalPath);
      index += 1;
    }
  }
  return [...new Set(paths)].sort();
}

async function stageWorkingChanges(sandbox: TestSandbox): Promise<string[]> {
  const status = await run(
    "git",
    ["status", "--porcelain=v1", "-z", "--untracked-files=all"],
    gitOptions(sandbox),
  );
  assertCommandExit(status, 0, "Git worktree inventory before staging");
  const changedPaths = parsePorcelainPaths(status.stdout);
  assert.ok(changedPaths.length > 0, "expected fixture changes to stage");
  const add = await run(
    "git",
    ["add", "--", ...changedPaths],
    gitOptions(sandbox),
  );
  assertCommandExit(add, 0, "staging exact fixture and generated paths");
  const staged = await run(
    "git",
    ["diff", "--cached", "--name-only", "-z"],
    gitOptions(sandbox),
  );
  assertCommandExit(staged, 0, "reading exact staged path inventory");
  const stagedPaths = parseNulPaths(staged.stdout).sort();
  assert.deepEqual(
    stagedPaths,
    changedPaths,
    "staged paths differ from the reviewed worktree inventory",
  );
  const unstaged = await run(
    "git",
    ["diff", "--name-only", "-z"],
    gitOptions(sandbox),
  );
  assertCommandExit(unstaged, 0, "checking for unstaged tracked changes");
  assert.deepEqual(
    parseNulPaths(unstaged.stdout),
    [],
    "fixture still has unstaged tracked changes after exact staging",
  );
  const untracked = await run(
    "git",
    ["ls-files", "--others", "--exclude-standard", "-z"],
    gitOptions(sandbox),
  );
  assertCommandExit(untracked, 0, "checking for untracked fixture changes");
  assert.deepEqual(
    parseNulPaths(untracked.stdout),
    [],
    "fixture still has untracked files after exact staging",
  );
  return stagedPaths;
}

function parseStagedCheck(result: CommandResult): StagedCheck {
  let parsed: unknown;
  try {
    parsed = JSON.parse(result.stdout);
  } catch (error) {
    assert.fail(
      `staged check did not return JSON: ${String(error)}\n${commandText(result)}`,
    );
  }
  assert.ok(
    parsed && typeof parsed === "object",
    "staged check returned no JSON object",
  );
  const structuredContent = (parsed as { structuredContent?: unknown })
    .structuredContent;
  assert.ok(
    structuredContent && typeof structuredContent === "object",
    "staged check returned no structured content",
  );
  return {
    structuredContent: structuredContent as StagedCheck["structuredContent"],
  };
}

function assertIndexMatchesCheck(
  stagedPaths: string[],
  check: StagedCheck,
): StagedFile[] {
  const files = check.structuredContent.staged?.files;
  assert.ok(
    Array.isArray(files),
    "staged JSON omitted the coverage file inventory",
  );
  assert.deepEqual(
    files.map((file) => file.path).sort(),
    stagedPaths,
    "staged JSON paths differ from exact Git index paths",
  );
  assert.equal(
    check.structuredContent.count,
    check.structuredContent.violations.length,
  );
  return files;
}

function assertOwnershipViolation(
  check: StagedCheck,
  expected: Readonly<{ symbolId: string; name: string; file: string }>,
): void {
  const violations = check.structuredContent.violations;
  assert.equal(
    violations.length,
    1,
    "expected exactly one ownership violation",
  );
  assert.deepEqual(
    {
      symbolId: violations[0]?.symbolId,
      name: violations[0]?.name,
      file: violations[0]?.file,
      currentLinks: violations[0]?.currentLinks,
      requiredLinks: violations[0]?.requiredLinks,
    },
    {
      ...expected,
      currentLinks: 0,
      requiredLinks: 1,
    },
    "staged check failed for something other than the intended unowned declaration",
  );
}

function symbolsManifest(entries: readonly SymbolFixture[]): string {
  const lines = ["symbols:"];
  for (const entry of entries) {
    lines.push(
      `  - id: ${entry.id}`,
      `    title: ${entry.title}`,
      `    sourceFile: ${entry.sourceFile}`,
    );
    if (entry.relation) {
      lines.push(
        "    links:",
        `      - type: ${entry.relation.type}`,
        `        target: ${entry.relation.target}`,
      );
    }
    lines.push("    status: active");
  }
  return `${lines.join("\n")}\n`;
}

function requirementMarkdown(): string {
  return [
    "---",
    "id: REQ-001",
    "title: Traceability baseline requirement",
    "status: active",
    `created_at: ${FIXTURE_TIME}`,
    `updated_at: ${FIXTURE_TIME}`,
    "source: .kb/requirements/REQ-001.md",
    "---",
    "",
    "Staged source declarations have explicit requirement ownership.",
    "",
  ].join("\n");
}

function testMarkdown(id: string, title: string): string {
  return [
    "---",
    `id: ${id}`,
    `title: ${title}`,
    "status: passing",
    `created_at: ${FIXTURE_TIME}`,
    `updated_at: ${FIXTURE_TIME}`,
    `source: .kb/tests/${id}.md`,
    "links:",
    "  - type: validates",
    "    target: REQ-001",
    "---",
    "",
    "Test fixture for staged symbol relationships.",
    "",
  ].join("\n");
}

function writeSandboxFile(
  sandbox: TestSandbox,
  path: string,
  contents: string,
): void {
  const fullPath = join(sandbox.repoDir, path);
  mkdirSync(join(fullPath, ".."), { recursive: true });
  writeFileSync(fullPath, contents, "utf8");
}

async function assertGeneratedCurrent(
  sandbox: TestSandbox,
  label: string,
): Promise<void> {
  const result = await kibi(sandbox, ["check-generated", "--staged"], {
    timeoutMs: CHECK_TIMEOUT_MS,
  });
  assertCommandExit(result, 0, label);
  assert.match(commandText(result), /staged generated manifests are current/i);
}

async function checkStaged(
  sandbox: TestSandbox,
  expectedExit: number,
  label: string,
): Promise<StagedCheck> {
  const result = await kibi(
    sandbox,
    ["check", "--staged", "--format", "json"],
    {
      timeoutMs: CHECK_TIMEOUT_MS,
    },
  );
  assertCommandExit(result, expectedExit, label);
  return parseStagedCheck(result);
}

async function commitThroughHook(
  sandbox: TestSandbox,
  message: string,
): Promise<void> {
  const result = await run(
    "git",
    ["commit", "-m", message],
    gitOptions(sandbox),
  );
  assertCommandExit(result, 0, `normal hook-enabled Git commit: ${message}`);
  const status = await run(
    "git",
    ["status", "--porcelain=v1", "-z", "--untracked-files=all"],
    gitOptions(sandbox),
  );
  assertCommandExit(status, 0, "post-commit worktree status");
  assert.equal(
    status.stdout,
    "",
    "normal hook-enabled commit left fixture changes behind",
  );
}

if (RUN_NODE_TEST_SUITE) {
  describe("E2E: staged symbol traceability gate", () => {
    let tarballs: Tarballs;
    let sandbox: TestSandbox;
    let hasProlog = false;
    let hostStateBeforeTest = "";
    let baselinePaths: string[] = [];
    let baselineCheck: StagedCheck | null = null;

    before(
      async () => {
        hasProlog = checkPrologAvailable();
        if (!hasProlog) {
          console.warn(
            "SWI-Prolog is unavailable; traceability tests will be skipped.",
          );
          return;
        }
        tarballs = await packAll();
      },
      { timeout: SETUP_TIMEOUT_MS },
    );

    beforeEach(
      async () => {
        if (!hasProlog) return;
        hostStateBeforeTest = hostGitSnapshot();
        sandbox = createSandbox();
        await sandbox.install(tarballs);

        for (const [args, label] of [
          [["init", "-b", "develop"], "Git repository initialization"],
          [
            ["config", "user.email", "test@example.com"],
            "Git fixture author email",
          ],
          [["config", "user.name", "Test User"], "Git fixture author name"],
        ] as const) {
          assertCommandExit(
            await run("git", [...args], gitOptions(sandbox)),
            0,
            label,
          );
        }
        assertCommandExit(
          await run(
            "git",
            ["commit", "--allow-empty", "-m", "initial"],
            gitOptions(sandbox),
          ),
          0,
          "empty initial Git commit before Kibi installs hooks",
        );
        assertCommandExit(await kibi(sandbox, ["init"]), 0, "kibi init");
        const initializedPaths = await stageWorkingChanges(sandbox);
        for (const required of [
          ".gitignore",
          ".kb/manifest.json",
          ".kb/schema/entities.pl",
          ".kb/schema/relationships.pl",
          ".kb/schema/validation.pl",
        ]) {
          assert.ok(
            initializedPaths.includes(required),
            `Kibi initialization omitted staged path ${required}`,
          );
        }
        const initializedCheck = await checkStaged(
          sandbox,
          0,
          "initialized KB staged check",
        );
        assertIndexMatchesCheck(initializedPaths, initializedCheck);
        assert.equal(initializedCheck.structuredContent.count, 0);
        assert.deepEqual(
          initializedCheck.structuredContent.violations,
          [],
          "Kibi initialization must have no blocking ownership violations",
        );
        assert.deepEqual(
          initializedCheck.structuredContent.staged?.diagnostics
            .map(({ id, path, severity, blocking }) => ({
              id,
              path,
              severity,
              blocking,
            }))
            .sort((left, right) => left.path.localeCompare(right.path)),
          [
            {
              id: "staged_file_ownership_missing",
              path: ".gitignore",
              severity: "warning",
              blocking: false,
            },
            {
              id: "staged_file_ownership_missing",
              path: ".kb/schema/entities.pl",
              severity: "warning",
              blocking: false,
            },
            {
              id: "staged_file_ownership_missing",
              path: ".kb/schema/relationships.pl",
              severity: "warning",
              blocking: false,
            },
            {
              id: "staged_file_ownership_missing",
              path: ".kb/schema/validation.pl",
              severity: "warning",
              blocking: false,
            },
          ],
          "initialization may have only its known nonblocking file-level advisories",
        );
        await commitThroughHook(
          sandbox,
          "chore: initialize disposable Kibi fixture",
        );

        writeSandboxFile(
          sandbox,
          ".kb/requirements/REQ-001.md",
          requirementMarkdown(),
        );
        writeSandboxFile(
          sandbox,
          "src/sample.js",
          "export function hello() { return 'ok'; }\n",
        );
        writeSandboxFile(
          sandbox,
          ".kb/symbols.yaml",
          symbolsManifest([
            {
              id: "SYM-HELLO-001",
              title: "hello",
              sourceFile: "src/sample.js",
              relation: { type: "implements", target: "REQ-001" },
            },
          ]),
        );
        const authoredAdd = await run(
          "git",
          [
            "add",
            "--",
            ".kb/requirements/REQ-001.md",
            ".kb/symbols.yaml",
            "src/sample.js",
          ],
          gitOptions(sandbox),
        );
        assertCommandExit(
          authoredAdd,
          0,
          "staging requirement endpoint and authored baseline source",
        );
        assertCommandExit(
          await kibi(sandbox, ["sync", "--refresh-symbol-coordinates"], {
            timeoutMs: CHECK_TIMEOUT_MS,
          }),
          0,
          "baseline source sync and symbol-coordinate refresh",
        );
        baselinePaths = await stageWorkingChanges(sandbox);
        for (const required of [
          ".kb/requirements/REQ-001.md",
          ".kb/symbols.yaml",
          ".kb/symbol-coordinates.yaml",
          "src/sample.js",
        ]) {
          assert.ok(
            baselinePaths.includes(required),
            `baseline omitted staged path ${required}`,
          );
        }
        await assertGeneratedCurrent(
          sandbox,
          "baseline staged generated-manifest check",
        );
        baselineCheck = await checkStaged(
          sandbox,
          0,
          "owned baseline staged check",
        );
        const baselineFiles = assertIndexMatchesCheck(
          baselinePaths,
          baselineCheck,
        );
        assert.equal(baselineCheck.structuredContent.violations.length, 0);
        assert.deepEqual(
          baselineCheck.structuredContent.staged?.diagnostics,
          [],
        );
        const sourceRecord = baselineFiles.find(
          (file) => file.path === "src/sample.js",
        );
        assert.ok(
          sourceRecord,
          "baseline JSON omitted its changed source file",
        );
        assert.equal(sourceRecord.analysisDepth, "symbol");
        assert.equal(sourceRecord.disposition, "checked");
        assert.equal(sourceRecord.sourceAnalysis?.after?.status, "ok");
        assert.equal(sourceRecord.sourceAnalysis?.after?.symbolCount, 1);
        assert.match(
          sourceRecord.sourceAnalysis?.after?.inputFingerprint ?? "",
          /^[a-f0-9]{64}$/,
        );
        await commitThroughHook(sandbox, "baseline: add owned staged symbol");
      },
      { timeout: SETUP_TIMEOUT_MS },
    );

    afterEach(
      async () => {
        if (sandbox) await sandbox.cleanup();
        if (hostStateBeforeTest) assertHostGitUnchanged(hostStateBeforeTest);
        baselineCheck = null;
        baselinePaths = [];
      },
      { timeout: 120_000 },
    );

    it("passes the authored baseline with its exact staged inventory", (testContext) => {
      if (!hasProlog) {
        testContext.skip("SWI-Prolog is unavailable");
        return;
      }
      assert.ok(baselineCheck, "baseline staged check was not captured");
      assert.equal(baselineCheck.structuredContent.count, 0);
      assert.equal(
        baselineCheck.structuredContent.staged?.files.length,
        baselinePaths.length,
      );
      assert.deepEqual(
        baselineCheck.structuredContent.staged?.files
          .map((file) => file.path)
          .sort(),
        baselinePaths,
      );
    });

    it("rejects one unowned declaration and accepts the same source after authored ownership", async (testContext) => {
      if (!hasProlog) {
        testContext.skip("SWI-Prolog is unavailable");
        return;
      }
      writeSandboxFile(
        sandbox,
        "src/sample.js",
        "export function hello() { return 'ok'; }\nexport function missingLink() { return 1; }\n",
      );
      writeSandboxFile(
        sandbox,
        ".kb/symbols.yaml",
        symbolsManifest([
          {
            id: "SYM-HELLO-001",
            title: "hello",
            sourceFile: "src/sample.js",
            relation: { type: "implements", target: "REQ-001" },
          },
          {
            id: "SYM-MISSING-LINK-001",
            title: "missingLink",
            sourceFile: "src/sample.js",
          },
        ]),
      );
      const authoredAdd = await run(
        "git",
        ["add", "--", "src/sample.js", ".kb/symbols.yaml"],
        gitOptions(sandbox),
      );
      assertCommandExit(
        authoredAdd,
        0,
        "staging deliberately unowned source and declaration",
      );
      assertCommandExit(
        await kibi(sandbox, ["sync", "--refresh-symbol-coordinates"], {
          timeoutMs: CHECK_TIMEOUT_MS,
        }),
        0,
        "syncing unowned declaration and refreshing coordinates",
      );
      const negativePaths = await stageWorkingChanges(sandbox);
      assert.ok(negativePaths.includes("src/sample.js"));
      assert.ok(negativePaths.includes(".kb/symbols.yaml"));
      assert.ok(negativePaths.includes(".kb/symbol-coordinates.yaml"));
      await assertGeneratedCurrent(
        sandbox,
        "unowned declaration generated-manifest check",
      );
      const negative = await checkStaged(
        sandbox,
        1,
        "staged check for unowned declaration",
      );
      const negativeFiles = assertIndexMatchesCheck(negativePaths, negative);
      assertOwnershipViolation(negative, {
        symbolId: "SYM-MISSING-LINK-001",
        name: "missingLink",
        file: "src/sample.js",
      });
      const unownedSource = negativeFiles.find(
        (file) => file.path === "src/sample.js",
      );
      assert.equal(unownedSource?.sourceAnalysis?.after?.status, "ok");
      assert.equal(unownedSource?.sourceAnalysis?.after?.symbolCount, 2);
      const unownedInputFingerprint =
        unownedSource?.sourceAnalysis?.after?.inputFingerprint;
      assert.match(unownedInputFingerprint ?? "", /^[a-f0-9]{64}$/);

      writeSandboxFile(
        sandbox,
        ".kb/symbols.yaml",
        symbolsManifest([
          {
            id: "SYM-HELLO-001",
            title: "hello",
            sourceFile: "src/sample.js",
            relation: { type: "implements", target: "REQ-001" },
          },
          {
            id: "SYM-MISSING-LINK-001",
            title: "missingLink",
            sourceFile: "src/sample.js",
            relation: { type: "implements", target: "REQ-001" },
          },
        ]),
      );
      const repairAdd = await run(
        "git",
        ["add", "--", ".kb/symbols.yaml"],
        gitOptions(sandbox),
      );
      assertCommandExit(repairAdd, 0, "staging authored ownership repair");
      assertCommandExit(
        await kibi(sandbox, ["sync", "--refresh-symbol-coordinates"], {
          timeoutMs: CHECK_TIMEOUT_MS,
        }),
        0,
        "syncing repaired ownership and refreshing coordinates",
      );
      const repairedPaths = await stageWorkingChanges(sandbox);
      await assertGeneratedCurrent(
        sandbox,
        "repaired generated-manifest check",
      );
      const repaired = await checkStaged(sandbox, 0, "repaired staged check");
      const repairedFiles = assertIndexMatchesCheck(repairedPaths, repaired);
      assert.deepEqual(repaired.structuredContent.violations, []);
      const repairedSource = repairedFiles.find(
        (file) => file.path === "src/sample.js",
      );
      assert.equal(repairedSource?.sourceAnalysis?.after?.status, "ok");
      assert.equal(repairedSource?.sourceAnalysis?.after?.symbolCount, 2);
      assert.equal(
        repairedSource?.sourceAnalysis?.after?.inputFingerprint,
        unownedInputFingerprint,
        "changing only authored ownership must preserve the source input fingerprint",
      );
      await commitThroughHook(
        sandbox,
        "fix: author requirement ownership for new declaration",
      );
    });

    it("reports an exact empty staged snapshot", async (testContext) => {
      if (!hasProlog) {
        testContext.skip("SWI-Prolog is unavailable");
        return;
      }
      const empty = await checkStaged(sandbox, 0, "empty staged check");
      assert.deepEqual(empty.structuredContent.violations, []);
      assert.equal(empty.structuredContent.count, 0);
      assert.deepEqual(empty.structuredContent.staged?.files, []);
      assert.deepEqual(empty.structuredContent.staged?.diagnostics, []);
      assert.deepEqual(empty.structuredContent.messages, [
        "No staged files found.",
      ]);
    });

    it("reports file-level YAML ownership as advisory coverage with source analysis", async (testContext) => {
      if (!hasProlog) {
        testContext.skip("SWI-Prolog is unavailable");
        return;
      }
      writeSandboxFile(
        sandbox,
        "deploy/compose.yaml",
        "services:\n  web:\n    image: example/web:latest\n",
      );
      const add = await run(
        "git",
        ["add", "--", "deploy/compose.yaml"],
        gitOptions(sandbox),
      );
      assertCommandExit(add, 0, "staging YAML advisory fixture");
      const stagedPaths = await run(
        "git",
        ["diff", "--cached", "--name-only", "-z"],
        gitOptions(sandbox),
      );
      assertCommandExit(stagedPaths, 0, "reading YAML staged path inventory");
      const exactPaths = parseNulPaths(stagedPaths.stdout).sort();
      assert.deepEqual(exactPaths, ["deploy/compose.yaml"]);
      const check = await checkStaged(sandbox, 0, "staged YAML advisory check");
      const files = assertIndexMatchesCheck(exactPaths, check);
      assert.deepEqual(check.structuredContent.violations, []);
      assert.equal(files.length, 1);
      const yaml = files[0];
      assert.ok(yaml);
      assert.equal(yaml.path, "deploy/compose.yaml");
      assert.equal(yaml.analysisDepth, "file");
      assert.equal(yaml.disposition, "advisory");
      assert.deepEqual(yaml.requirementIds, []);
      assert.deepEqual(yaml.evidencePaths, []);
      assert.equal(yaml.providerId, null);
      assert.deepEqual(yaml.sourceAnalysis?.before, null);
      assert.equal(yaml.sourceAnalysis?.after?.status, "unsupported");
      assert.equal(yaml.sourceAnalysis?.after?.language, "yaml");
      assert.equal(yaml.sourceAnalysis?.after?.symbolCount, 0);
      assert.equal(yaml.sourceAnalysis?.after?.providerId, null);
      assert.match(
        yaml.sourceAnalysis?.after?.inputFingerprint ?? "",
        /^[a-f0-9]{64}$/,
      );
      assert.equal(yaml.sourceAnalysis?.after?.providerFingerprint, null);
      assert.deepEqual(check.structuredContent.diagnostics, [
        {
          id: "staged_file_ownership_missing",
          severity: "warning",
          blocking: false,
          path: "deploy/compose.yaml",
          message: check.structuredContent.diagnostics[0]?.message,
          suggestion: check.structuredContent.diagnostics[0]?.suggestion,
          requirementIds: [],
          evidencePaths: [],
        },
      ]);
      assert.ok(check.structuredContent.diagnostics[0]?.message);
      assert.ok(check.structuredContent.diagnostics[0]?.suggestion);
      assert.deepEqual(
        check.structuredContent.staged?.diagnostics,
        check.structuredContent.diagnostics,
      );
      assert.deepEqual(check.structuredContent.messages, [
        "No exported symbols or staged entities found in staged files.",
      ]);
    });

    it("accepts an executable_for test symbol with a generated and staged baseline", async (testContext) => {
      if (!hasProlog) {
        testContext.skip("SWI-Prolog is unavailable");
        return;
      }
      writeSandboxFile(
        sandbox,
        ".kb/tests/TEST-EXE-001.md",
        testMarkdown("TEST-EXE-001", "Executable test"),
      );
      writeSandboxFile(
        sandbox,
        "tests/helper.js",
        "export function testHelper() { return 'ok'; }\n",
      );
      writeSandboxFile(
        sandbox,
        ".kb/symbols.yaml",
        symbolsManifest([
          {
            id: "SYM-HELLO-001",
            title: "hello",
            sourceFile: "src/sample.js",
            relation: { type: "implements", target: "REQ-001" },
          },
          {
            id: "SYM-EXE-001",
            title: "testHelper",
            sourceFile: "tests/helper.js",
            relation: { type: "executable_for", target: "TEST-EXE-001" },
          },
        ]),
      );
      const authoredAdd = await run(
        "git",
        [
          "add",
          "--",
          ".kb/tests/TEST-EXE-001.md",
          ".kb/symbols.yaml",
          "tests/helper.js",
        ],
        gitOptions(sandbox),
      );
      assertCommandExit(
        authoredAdd,
        0,
        "staging executable test and authored source metadata",
      );
      assertCommandExit(
        await kibi(sandbox, ["sync", "--refresh-symbol-coordinates"], {
          timeoutMs: CHECK_TIMEOUT_MS,
        }),
        0,
        "syncing executable_for relationship and refreshing coordinates",
      );
      const stagedPaths = await stageWorkingChanges(sandbox);
      for (const required of [
        ".kb/tests/TEST-EXE-001.md",
        ".kb/symbols.yaml",
        ".kb/symbol-coordinates.yaml",
        "tests/helper.js",
      ]) {
        assert.ok(
          stagedPaths.includes(required),
          `executable_for fixture omitted staged path ${required}`,
        );
      }
      await assertGeneratedCurrent(
        sandbox,
        "executable_for generated-manifest check",
      );
      const check = await checkStaged(
        sandbox,
        0,
        "executable_for staged check",
      );
      const files = assertIndexMatchesCheck(stagedPaths, check);
      assert.deepEqual(check.structuredContent.violations, []);
      const helper = files.find((file) => file.path === "tests/helper.js");
      assert.equal(helper?.sourceAnalysis?.after?.status, "ok");
      assert.equal(helper?.sourceAnalysis?.after?.symbolCount, 1);
      await commitThroughHook(
        sandbox,
        "test: cover executable_for staged symbol ownership",
      );
    });

    it("rejects a symbol with covered_by but no implements ownership", async (testContext) => {
      if (!hasProlog) {
        testContext.skip("SWI-Prolog is unavailable");
        return;
      }
      writeSandboxFile(
        sandbox,
        ".kb/tests/TEST-COV-001.md",
        testMarkdown("TEST-COV-001", "Coverage test"),
      );
      writeSandboxFile(
        sandbox,
        "src/cov.js",
        "export function covFunc() { return 'cov'; }\n",
      );
      writeSandboxFile(
        sandbox,
        ".kb/symbols.yaml",
        symbolsManifest([
          {
            id: "SYM-HELLO-001",
            title: "hello",
            sourceFile: "src/sample.js",
            relation: { type: "implements", target: "REQ-001" },
          },
          {
            id: "SYM-COV-001",
            title: "covFunc",
            sourceFile: "src/cov.js",
            relation: { type: "covered_by", target: "TEST-COV-001" },
          },
        ]),
      );
      const authoredAdd = await run(
        "git",
        [
          "add",
          "--",
          ".kb/tests/TEST-COV-001.md",
          ".kb/symbols.yaml",
          "src/cov.js",
        ],
        gitOptions(sandbox),
      );
      assertCommandExit(authoredAdd, 0, "staging covered_by-only test fixture");
      assertCommandExit(
        await kibi(sandbox, ["sync", "--refresh-symbol-coordinates"], {
          timeoutMs: CHECK_TIMEOUT_MS,
        }),
        0,
        "syncing covered_by-only source and refreshing coordinates",
      );
      const stagedPaths = await stageWorkingChanges(sandbox);
      await assertGeneratedCurrent(
        sandbox,
        "covered_by-only generated-manifest check",
      );
      const check = await checkStaged(
        sandbox,
        1,
        "covered_by-only staged ownership check",
      );
      const files = assertIndexMatchesCheck(stagedPaths, check);
      assertOwnershipViolation(check, {
        symbolId: "SYM-COV-001",
        name: "covFunc",
        file: "src/cov.js",
      });
      const source = files.find((file) => file.path === "src/cov.js");
      assert.equal(source?.sourceAnalysis?.after?.status, "ok");
      assert.equal(source?.sourceAnalysis?.after?.symbolCount, 1);
    });
  });
}
