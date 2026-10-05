/*
 * E2E: the Claude Code SkillOpt host runs a real target cell end to end.
 *
 * REQ-skillopt-claude-code-host — target cells can run on the Claude Code CLI
 * without weakening the evaluation boundary. This exerciser drives the real
 * CLI entry points as processes (no injected dependencies). A stub `claude`
 * executable stands in for the model, so nothing is paid and no network is
 * used, while everything around it is real: fixture materialization, skill
 * assembly, the trusted MCP broker, transcript normalization and scoring.
 *
 *   1. One development cell runs through `host-cell-smoke.ts`. The stub sees
 *      the pinned model, a strict MCP config, workspace-scoped file rules,
 *      denied private roots, a private config dir, no parent session
 *      variables, mirrored skills and a clean git tree.
 *   2. The stub's stream becomes Codex-shaped evidence with a completed turn.
 *   3. `campaign.ts revise` is refused on this host and an unknown host value
 *      is a CLI error, both before any paid preparation.
 *
 * Run via `bun run documentation/tests/e2e/skillopt-claude-code-host.e2e.ts`.
 */
import "../../../scripts/skillopt-eval/offline-test-preload";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const REPO_ROOT = process.cwd();
const BUN = process.execPath;

function assert(condition: unknown, message: string): void {
  if (!condition) {
    console.error(`E2E FAILURE: ${message}`);
    process.exit(1);
  }
}

const root = realpathSync(mkdtempSync(join(tmpdir(), "skillopt-claude-e2e-")));
try {
  const record = join(root, "record");
  const bin = join(root, "bin");
  const realConfig = join(root, "real-claude-config");
  mkdirSync(record, { recursive: true });
  mkdirSync(bin, { recursive: true });
  mkdirSync(realConfig, { recursive: true });

  // The stub records what the harness gave it, then answers like
  // `claude -p --output-format stream-json` would.
  const stub = join(bin, "claude");
  writeFileSync(
    stub,
    `#!/bin/sh
out="$SKILLOPT_E2E_RECORD"
for arg in "$@"; do printf '%s\\n' "$arg"; done > "$out/argv"
env | cut -d= -f1 | sort > "$out/env-names"
printf '%s' "$CLAUDE_CONFIG_DIR" > "$out/config-dir"
pwd > "$out/cwd"
git status --porcelain > "$out/git-status" 2>&1
ls .claude/skills > "$out/skills" 2>&1
cat > /dev/null
printf '%s\\n' '{"type":"system","subtype":"init","model":"claude-sonnet-5-5"}'
printf '%s\\n' '{"type":"assistant","message":{"content":[{"type":"text","text":"Stopping before any write."}]}}'
printf '%s\\n' '{"type":"result","subtype":"success","is_error":false,"num_turns":1,"total_cost_usd":0,"structured_output":{"completed":false,"answer":"stub"},"usage":{"input_tokens":1,"cache_creation_input_tokens":0,"cache_read_input_tokens":0,"output_tokens":1}}'
`,
  );
  chmodSync(stub, 0o755);

  const env: NodeJS.ProcessEnv = {
    PATH: `${bin}:${process.env.PATH ?? "/usr/bin:/bin"}`,
    HOME: join(root, "home"),
    ...(process.env.KIBI_SWIPL === undefined
      ? {}
      : { KIBI_SWIPL: process.env.KIBI_SWIPL }),
    KIBI_SKILLOPT_HOST: "claude-code",
    KIBI_SKILLOPT_CLAUDE_EXECUTABLE: stub,
    KIBI_SKILLOPT_CLAUDE_ENV_PASSTHROUGH: "SKILLOPT_E2E_RECORD",
    SKILLOPT_E2E_RECORD: record,
    CLAUDE_CONFIG_DIR: realConfig,
    // A parent agent session must never leak into the target.
    CLAUDE_CODE_SESSION_ID: "parent-session",
    KIBI_SKILLOPT_TARGET_MODEL: "claude-sonnet-5-5",
    KIBI_SKILLOPT_TARGET_EFFORT: "low",
    KIBI_SKILLOPT_OPTIMIZER_MODEL: "claude-opus-5-5",
    KIBI_SKILLOPT_OPTIMIZER_EFFORT: "medium",
    KIBI_SKILLOPT_MODEL_PRICING: JSON.stringify({
      "claude-sonnet-5-5": {
        inputPerMillionTokens: 2,
        cachedInputPerMillionTokens: 0.2,
        outputPerMillionTokens: 10,
      },
      "claude-opus-5-5": {
        inputPerMillionTokens: 4,
        cachedInputPerMillionTokens: 0.2,
        outputPerMillionTokens: 20,
      },
    }),
  };
  mkdirSync(env.HOME as string, { recursive: true });

  // 1. One real cell on the Claude host.
  const artifactRoot = join(root, "artifacts");
  const smoke = spawnSync(
    BUN,
    [
      "scripts/skillopt-eval/host-cell-smoke.ts",
      "--artifact-root",
      artifactRoot,
      "--skill",
      "kibi-bootstrap",
      "--family",
      "approval-plan-apply",
      "--timeout-ms",
      "180000",
      "--allow-paid",
    ],
    { cwd: REPO_ROOT, env, encoding: "utf8", timeout: 600_000 },
  );
  assert(
    smoke.status === 0,
    `host-cell-smoke exited ${smoke.status}: ${smoke.stderr.slice(-2000)}`,
  );
  const summary = JSON.parse(
    readFileSync(join(artifactRoot, "smoke-summary.json"), "utf8"),
  ) as {
    host: string;
    status: string;
    artifactDirectory: string;
  };
  assert(summary.host === "claude-code", "cell did not run on Claude Code");

  const argv = readFileSync(join(record, "argv"), "utf8").split("\n");
  const flag = (name: string) => argv[argv.indexOf(name) + 1];
  assert(flag("--model") === "claude-sonnet-5-5", "target model not pinned");
  assert(flag("--effort") === "low", "target effort not pinned");
  assert(argv.includes("--strict-mcp-config"), "MCP config is not strict");
  assert(flag("--permission-mode") === "dontAsk", "permissions can prompt");
  assert(!flag("--tools").split(",").includes("Bash"), "shell tool exposed");
  const settings = JSON.parse(flag("--settings")) as {
    permissions: { allow: string[]; deny: string[] };
  };
  const { allow, deny } = settings.permissions;
  assert(
    allow.includes("Read(./**)") && allow.includes("Edit(./**)"),
    "file tools are not scoped to the workspace",
  );
  assert(
    !allow.some((rule) => ["Read", "Edit", "Write"].includes(rule)),
    `unscoped file rule allowed: ${allow.join(",")}`,
  );
  for (const required of [
    "Read(./.kb/**)",
    "Bash",
    `Read(/${REPO_ROOT}/**)`,
    `Read(/${artifactRoot}/**)`,
    `Read(/${realConfig}/**)`,
  ]) {
    assert(deny.includes(required), `deny rule missing: ${required}`);
  }

  const envNames = readFileSync(join(record, "env-names"), "utf8");
  assert(
    !envNames.split("\n").includes("CLAUDE_CODE_SESSION_ID"),
    "parent session variable leaked into the target",
  );
  const configDir = readFileSync(join(record, "config-dir"), "utf8");
  assert(
    configDir !== "" && configDir !== realConfig,
    "target did not get a private config dir",
  );
  assert(
    readFileSync(join(record, "skills"), "utf8").includes("kibi-bootstrap"),
    "skills were not mirrored for Claude",
  );
  assert(
    readFileSync(join(record, "git-status"), "utf8").trim() === "",
    "skill mirror or host plumbing dirtied the fixture git tree",
  );

  // 2. The stub stream became Codex-shaped evidence.
  const transcript = readFileSync(
    join(summary.artifactDirectory, "raw-host.jsonl"),
    "utf8",
  );
  assert(
    transcript.includes('"type":"turn.completed"'),
    "normalized transcript has no completed turn",
  );
  assert(
    existsSync(join(summary.artifactDirectory, "raw-claude-code-stream.jsonl")),
    "raw Claude stream was not kept",
  );

  // 3. Unsupported commands and hosts fail before paid preparation.
  const revise = spawnSync(
    BUN,
    [
      "scripts/skillopt-eval/campaign.ts",
      "revise",
      "--artifact-root",
      join(root, "revise"),
      "--skill",
      "kibi-bootstrap",
      "--allow-paid",
    ],
    { cwd: REPO_ROOT, env, encoding: "utf8", timeout: 120_000 },
  );
  assert(revise.status === 2, `revise exited ${revise.status}`);
  assert(revise.stderr.includes("revise"), "revise refusal not explained");
  assert(!existsSync(join(root, "revise")), "revise created artifacts");

  const unknown = spawnSync(
    BUN,
    [
      "scripts/skillopt-eval/campaign.ts",
      "evaluate",
      "--artifact-root",
      join(root, "unknown"),
      "--skill",
      "kibi-bootstrap",
    ],
    {
      cwd: REPO_ROOT,
      env: { ...env, KIBI_SKILLOPT_HOST: "other" },
      encoding: "utf8",
      timeout: 120_000,
    },
  );
  assert(unknown.status === 2, `unknown host exited ${unknown.status}`);

  console.log("skillopt Claude Code host e2e: all assertions passed");
} finally {
  rmSync(root, { recursive: true, force: true });
}
