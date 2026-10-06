/*
 * E2E: a SkillOpt candidate can replace the skill description, and the target
 * sees exactly that description.
 *
 * REQ-skillopt-description-candidates — agents decide whether to load a skill
 * from its frontmatter description, so a candidate may replace it alongside
 * the body while every other frontmatter field stays frozen. This exerciser
 * drives the real CLI entry points as processes. A stub `claude` executable
 * stands in for the model, so nothing is paid and no network is used.
 *
 *   1. `campaign.ts compose --body-file --description-file` freezes a 1.2.0
 *      manifest that records the description and its hash.
 *   2. A multi-line description and a description without a body are refused.
 *   3. `host-cell-smoke.ts` runs one cell with the same body and description;
 *      the skill the target reads carries the new description, keeps its
 *      name, and has the candidate body.
 *
 * Run via `bun run documentation/tests/e2e/skillopt-description-candidates.e2e.ts`.
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

const DESCRIPTION =
  "Use for any Kibi bootstrap or onboarding task, including reviewing a bootstrap plan or diagnosing a blocked bootstrap.";
const BODY =
  "## Step 0\n\nCall kb_status first on every bootstrap task.\n\n## Procedure\n\nPreview with kb_plan_bootstrap, ask for approval, then apply the exact plan once.\n";

const root = realpathSync(mkdtempSync(join(tmpdir(), "skillopt-desc-e2e-")));
try {
  const inputs = join(root, "inputs");
  const record = join(root, "record");
  const bin = join(root, "bin");
  for (const dir of [inputs, record, bin, join(root, "home")])
    mkdirSync(dir, { recursive: true });
  writeFileSync(join(inputs, "body.md"), BODY);
  writeFileSync(join(inputs, "description.txt"), `${DESCRIPTION}\n`);
  writeFileSync(
    join(inputs, "multiline.txt"),
    "Use for bootstrap.\nAlso for repair.\n",
  );

  const stub = join(bin, "claude");
  writeFileSync(
    stub,
    `#!/bin/sh
cp .claude/skills/kibi-bootstrap/SKILL.md "$SKILLOPT_E2E_RECORD/SKILL.md" 2>"$SKILLOPT_E2E_RECORD/copy-error"
cat > /dev/null
printf '%s\\n' '{"type":"system","subtype":"init","model":"claude-sonnet-5-5"}'
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
    CLAUDE_CONFIG_DIR: join(root, "claude-config"),
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
  mkdirSync(env.CLAUDE_CONFIG_DIR as string, { recursive: true });

  const campaign = (artifactRoot: string, extra: string[]) =>
    spawnSync(
      BUN,
      [
        "scripts/skillopt-eval/campaign.ts",
        "compose",
        "--artifact-root",
        artifactRoot,
        "--skill",
        "kibi-bootstrap",
        ...extra,
      ],
      { cwd: REPO_ROOT, env, encoding: "utf8", timeout: 120_000 },
    );

  // 1. Compose freezes the description into a 1.2.0 manifest.
  const composeRoot = join(root, "compose");
  const composed = campaign(composeRoot, [
    "--body-file",
    join(inputs, "body.md"),
    "--description-file",
    join(inputs, "description.txt"),
  ]);
  assert(
    composed.status === 0,
    `compose exited ${composed.status}: ${composed.stderr.slice(-2000)}`,
  );
  const result = JSON.parse(composed.stdout.trim().split("\n").at(-1) ?? "{}");
  assert(
    typeof result.frozenDescriptionHash === "string",
    "compose did not report a description hash",
  );
  const manifest = JSON.parse(
    readFileSync(join(composeRoot, "manifest.json"), "utf8"),
  ) as {
    schemaVersion: string;
    revisionMode: string;
    frozenDescription: string;
    frozenBody: string;
  };
  assert(manifest.schemaVersion === "1.2.0", "manifest is not 1.2.0");
  assert(
    manifest.revisionMode === "body-and-description-replacement",
    `unexpected revision mode ${manifest.revisionMode}`,
  );
  assert(
    manifest.frozenDescription === DESCRIPTION,
    "manifest did not freeze the description verbatim",
  );

  // 2. Unsafe or orphaned descriptions are refused.
  const multiline = campaign(join(root, "multiline"), [
    "--body-file",
    join(inputs, "body.md"),
    "--description-file",
    join(inputs, "multiline.txt"),
  ]);
  assert(multiline.status !== 0, "multi-line description was accepted");
  const orphan = campaign(join(root, "orphan"), [
    "--description-file",
    join(inputs, "description.txt"),
  ]);
  assert(
    orphan.status === 2,
    `description without body exited ${orphan.status}`,
  );

  // 3. The target reads the candidate description and body.
  const smokeRoot = join(root, "smoke");
  const smoke = spawnSync(
    BUN,
    [
      "scripts/skillopt-eval/host-cell-smoke.ts",
      "--artifact-root",
      smokeRoot,
      "--skill",
      "kibi-bootstrap",
      "--family",
      "approval-plan-apply",
      "--body-file",
      join(inputs, "body.md"),
      "--description-file",
      join(inputs, "description.txt"),
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
  assert(
    existsSync(join(record, "SKILL.md")),
    `target saw no kibi-bootstrap skill: ${readFileSync(join(record, "copy-error"), "utf8")}`,
  );
  const skill = readFileSync(join(record, "SKILL.md"), "utf8");
  const frontmatter = skill.split(/^---$/m)[1] ?? "";
  assert(
    frontmatter.includes(`description: ${JSON.stringify(DESCRIPTION)}`),
    "target skill does not carry the candidate description",
  );
  assert(
    /^name: kibi-bootstrap$/m.test(frontmatter),
    "target skill lost its frozen name",
  );
  assert(
    skill.endsWith(BODY),
    "target skill does not carry the candidate body",
  );

  console.log("skillopt description candidates e2e: all assertions passed");
} finally {
  rmSync(root, { recursive: true, force: true });
}
