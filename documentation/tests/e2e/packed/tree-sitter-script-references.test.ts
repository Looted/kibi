import assert from "node:assert";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import {
  type Tarballs,
  type TestSandbox,
  createSandbox,
  kibi,
  languagePackSpecs,
  packAll,
  run,
  stageSourceFile,
} from "./helpers.js";

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

/**
 * E2E: source proofs read PHP, C, Bash and Terraform references through
 * kibi-plugin-treesitter, without running the code.
 *
 * SCEN-kibi-tree-sitter-script-references — a service with a PHP app, a C
 * daemon, a Bash deploy script and a Terraform bucket states which
 * environment variables the PHP app and the deploy script read, that the C
 * daemon never calls system, and which ACL the bucket may have. Source tests
 * read them with the references reader through the qualified plugin and each
 * claim is derived at evidence level proved. A second script that runs eval
 * and one that reads a variable it sets only in a branch are refused with
 * their place, the C daemon's claim is rejected once it calls system, and the
 * bucket's claim is refused once an override file may replace its ACL.
 */

type Step = Readonly<{
  type: string;
  id: string;
  properties: Record<string, unknown>;
  relationships?: readonly Record<string, string>[];
}>;

const STATEMENTS = {
  phpEnv:
    "Every environment variable the PHP app reads must be one of DB_HOST or APP_KEY.",
  cSystem: "The C daemon must never call system.",
  bashEnv:
    "Every environment variable the deploy script reads must be one of DEPLOY_HOST or DEPLOY_USER.",
  terraformAcl:
    "Every acl the Terraform bucket sets must be one of private or log-delivery-write.",
} as const;

const PHP_APP = `<?php
namespace App;

use App\\Mail\\Mailer;

function boot(): void
{
    $host = getenv('DB_HOST');
    $key = $_ENV['APP_KEY'] ?? null;
    (new Mailer())->send($host, $key);
}
`;

const C_DAEMON = `#include <stdio.h>
#include <stdlib.h>

int main(void) {
  const char *port = getenv("PORT");
  printf("listening on %s\\n", port);
  return 0;
}
`;

const DEPLOY = `#!/usr/bin/env bash
set -eu
tar -czf build.tar.gz dist
scp build.tar.gz "$DEPLOY_USER@$DEPLOY_HOST:/srv/app"
`;

const RELEASE = `#!/usr/bin/env bash
set -eu
eval "$RELEASE_STEPS"
`;

const ROLLBACK = `#!/usr/bin/env bash
if [ -f .previous ]; then
  TARGET=$(cat .previous)
fi
ssh "$DEPLOY_HOST" "ln -sfn $TARGET /srv/app"
`;

const TERRAFORM = `resource "aws_s3_bucket" "logs" {
  bucket = "service-logs"
  acl    = "log-delivery-write"
}

resource "aws_s3_bucket" "assets" {
  bucket = "service-assets"
  acl    = "private"
}
`;

async function upsert(sandbox: TestSandbox, payload: unknown): Promise<void> {
  const request = join(sandbox.repoDir, "upsert-request.json");
  writeFileSync(request, JSON.stringify(payload));
  const result = await kibi(sandbox, ["upsert", "--input", request]);
  assert.strictEqual(result.exitCode, 0, result.stdout + result.stderr);
}

async function advisorPlan(
  sandbox: TestSandbox,
  id: string,
  text: string,
): Promise<Step[]> {
  const request = join(sandbox.repoDir, "model-request.json");
  writeFileSync(
    request,
    JSON.stringify({ mode: "analyze", type: "req", id, text }),
  );
  const model = await kibi(sandbox, ["model", "--input", request]);
  assert.strictEqual(model.exitCode, 0, model.stdout + model.stderr);
  const suggestion = JSON.parse(model.stdout).data.receipt.suggestions[0];
  assert.ok(suggestion?.applyPlan, `no suggestion:\n${model.stdout}`);
  return suggestion.applyPlan as Step[];
}

async function applyPlan(
  sandbox: TestSandbox,
  plan: readonly Step[],
): Promise<string> {
  for (const step of plan)
    await upsert(sandbox, {
      type: step.type,
      id: step.id,
      properties: step.properties,
      relationships: [
        ...(step.relationships ?? []),
        ...(step.type === "req"
          ? [{ type: "specified_by", from: step.id, to: "SCEN-SERVICE" }]
          : []),
      ],
    });
  const requirement = plan.find((step) => step.type === "req");
  const claimKey = (
    requirement?.properties.semantic_inventory as { claim_key: string }[]
  )[0]?.claim_key;
  assert.match(claimKey ?? "", /^CLAIM-/);
  return claimKey ?? "";
}

function testDocument(id: string, source: string, claim: string): string {
  return `---
id: ${id}
title: Source reference proof ${id}
status: passing
verification_scope: end_to_end
proof_contract:
  version: kibi.proof-contract.v1
  integration: command
  required_proofs:
    - symbol_id: SYM-PROOFS
      target: default
  success_policy: all_required_first_attempt
  kind: source
  source:
    reader: references
${source}  proves:
    - ${claim}
type: test
---

Proves a claim about the service sources with a source proof for kibi prove.
`;
}

const TESTS = [
  ["TEST-PHP-ENV", "    files: php/app.php\n    extract: env\n", "phpEnv"],
  ["TEST-C-SYSTEM", "    files: c/daemon.c\n    extract: calls\n", "cSystem"],
  ["TEST-BASH-ENV", "    files: bash/deploy.sh\n    extract: env\n", "bashEnv"],
  ["TEST-BASH-ENV-ALL", "    files: bash/*.sh\n    extract: env\n", "bashEnv"],
  [
    "TEST-TERRAFORM-ACL",
    "    files: terraform/main.tf\n    extract: property\n    key: acl\n",
    "terraformAcl",
  ],
] as const;

async function provision(
  sandbox: TestSandbox,
  tarballs: Tarballs,
): Promise<void> {
  const install = await run(
    "npm",
    [
      "install",
      "--prefix",
      sandbox.repoDir,
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--no-save",
      "--package-lock=false",
      `file:${tarballs["plugin-sdk"]}`,
      `file:${tarballs["plugin-treesitter"]}`,
      ...languagePackSpecs(tarballs, [
        "lang-php",
        "lang-c",
        "lang-bash",
        "lang-hcl",
      ]),
    ],
    { cwd: sandbox.repoDir, env: sandbox.env, timeoutMs: 240000 },
  );
  assert.strictEqual(install.exitCode, 0, install.stdout + install.stderr);
  const { version } = JSON.parse(
    readFileSync(
      join(
        sandbox.repoDir,
        "node_modules",
        "kibi-plugin-treesitter",
        "package.json",
      ),
      "utf8",
    ),
  ) as { version: string };
  writeFileSync(
    join(sandbox.repoDir, "package.json"),
    `${JSON.stringify(
      {
        name: "service-script-references",
        private: true,
        dependencies: { "kibi-plugin-treesitter": version },
        kibi: {
          plugins: [
            {
              package: "kibi-plugin-treesitter",
              capabilities: {
                "kibi.symbol-extractor.v2": { mode: "augment" },
                "kibi.reference-extractor.v1": { mode: "augment" },
              },
            },
          ],
        },
      },
      null,
      2,
    )}\n`,
  );
  const files: Record<string, string> = {
    "php/app.php": PHP_APP,
    "c/daemon.c": C_DAEMON,
    "bash/deploy.sh": DEPLOY,
    "bash/release.sh": RELEASE,
    "bash/rollback.sh": ROLLBACK,
    "terraform/main.tf": TERRAFORM,
    "proofs.mjs":
      "// Source proofs need no certificate: Kibi reads the sources itself.\n",
  };
  for (const [file, content] of Object.entries(files)) {
    mkdirSync(join(sandbox.repoDir, file, ".."), { recursive: true });
    writeFileSync(join(sandbox.repoDir, file), content);
    stageSourceFile(sandbox, file);
  }
  await upsert(sandbox, {
    type: "scenario",
    id: "SCEN-SERVICE",
    properties: { title: "Run a service with scripts", status: "active" },
  });
  const claims: Record<string, string> = {};
  for (const key of Object.keys(STATEMENTS) as (keyof typeof STATEMENTS)[]) {
    const plan = await advisorPlan(
      sandbox,
      `REQ-${key.toUpperCase()}`,
      STATEMENTS[key],
    );
    assert.ok(
      plan.some(
        (step) => step.type === "fact" && step.properties.value_type === "set",
      ),
      JSON.stringify(plan),
    );
    claims[key] = await applyPlan(sandbox, plan);
  }
  for (const [id, source, claim] of TESTS) {
    const relative = `.kb/tests/${id}.md`;
    writeFileSync(
      join(sandbox.repoDir, relative),
      testDocument(id, source, claims[claim] ?? ""),
    );
    stageSourceFile(sandbox, relative);
  }
  const synced = await kibi(sandbox, ["sync"]);
  assert.strictEqual(synced.exitCode, 0, synced.stdout + synced.stderr);
  for (const [id] of TESTS)
    await upsert(sandbox, {
      type: "test",
      id,
      properties: { title: `Source reference proof ${id}`, status: "passing" },
      relationships: [{ type: "validates", from: id, to: "SCEN-SERVICE" }],
    });
  await upsert(sandbox, {
    type: "symbol",
    id: "SYM-PROOFS",
    properties: {
      title: "proofs",
      status: "active",
      sourceFile: "proofs.mjs",
      symbol_role: "behavioral",
    },
    relationships: TESTS.map(([id]) => ({
      type: "executable_for",
      from: "SYM-PROOFS",
      to: id,
    })),
  });
  mkdirSync(join(sandbox.repoDir, ".kb", "proof"), { recursive: true });
  writeFileSync(
    join(sandbox.repoDir, ".kb", "proof", "integrations.json"),
    JSON.stringify({
      version: "kibi.proof-integration.v1",
      integrations: [
        {
          id: "command",
          producer: "command",
          command: ["node", "proofs.mjs"],
          artifact: ".kb/proof/runs/command.json",
          targets: ["default"],
          description: "Source proofs need no certificate.",
        },
      ],
    }),
  );
  const sync = await kibi(sandbox, ["sync", "--refresh-symbol-coordinates"]);
  assert.strictEqual(sync.exitCode, 0, sync.stdout + sync.stderr);
}

function latestReceipt(sandbox: TestSandbox, testId: string): string {
  const document = readFileSync(
    join(sandbox.repoDir, ".kb", "tests", `${testId}.md`),
    "utf8",
  );
  const frontmatter = document.split(/^---$/m)[1] ?? "";
  return frontmatter.split(/^ {2}- version: /m).at(-1) ?? "";
}

async function prove(sandbox: TestSandbox, args: string[]): Promise<void> {
  const result = await kibi(sandbox, ["prove", ...args], { timeoutMs: 240000 });
  assert.strictEqual(result.exitCode, 0, result.stdout + result.stderr);
}

function assertRefused(receipt: string, place: RegExp): void {
  assert.match(receipt, /binding: rejected/, receipt);
  assert.match(receipt, place, receipt);
  assert.doesNotMatch(receipt, /evidence_level: proved/, receipt);
}

/**
 * Provisions the service, proves its claims, and checks the refusals and the
 * rejection that follow edits to the sources.
 */
export async function checkTreeSitterScriptReferences(
  sandbox: TestSandbox,
  tarballs: Tarballs,
): Promise<void> {
  await provision(sandbox, tarballs);
  await prove(sandbox, ["--all"]);
  for (const testId of [
    "TEST-PHP-ENV",
    "TEST-C-SYSTEM",
    "TEST-BASH-ENV",
    "TEST-TERRAFORM-ACL",
  ]) {
    const receipt = latestReceipt(sandbox, testId);
    assert.match(receipt, /evidence_level: proved/, `${testId}\n${receipt}`);
    assert.match(receipt, /binding: derived/, receipt);
  }
  // Kibi stores the plugin's read as the certificate.
  assert.match(latestReceipt(sandbox, "TEST-PHP-ENV"), /- APP_KEY/);
  assert.match(latestReceipt(sandbox, "TEST-TERRAFORM-ACL"), /- private/);

  // eval runs code built at run time, and the rollback script reads TARGET
  // from the environment when .previous is missing.
  const all = latestReceipt(sandbox, "TEST-BASH-ENV-ALL");
  assertRefused(all, /bash\/release\.sh:3/);
  assert.match(all, /bash\/rollback\.sh:5/, all);

  // The daemon now runs a shell command.
  writeFileSync(
    join(sandbox.repoDir, "c/daemon.c"),
    C_DAEMON.replace("return 0;", 'return system("reload");'),
  );
  stageSourceFile(sandbox, "c/daemon.c");
  await prove(sandbox, ["--test", "TEST-C-SYSTEM"]);
  const daemon = latestReceipt(sandbox, "TEST-C-SYSTEM");
  assert.match(daemon, /binding: rejected/, daemon);
  assert.match(daemon, /system/, daemon);
  assert.doesNotMatch(daemon, /evidence_level: proved/, daemon);

  // An override file the read leaves out may replace the bucket's ACL.
  writeFileSync(
    join(sandbox.repoDir, "terraform/override.tf"),
    'resource "aws_s3_bucket" "assets" {\n  acl = "public-read"\n}\n',
  );
  stageSourceFile(sandbox, "terraform/override.tf");
  await prove(sandbox, ["--test", "TEST-TERRAFORM-ACL"]);
  assertRefused(
    latestReceipt(sandbox, "TEST-TERRAFORM-ACL"),
    /override\.tf may override values/,
  );
}

if (RUN_NODE_TEST_SUITE) {
  describe("E2E: PHP, C, Bash and Terraform source references", () => {
    let tarballs: Tarballs;
    let sandbox: TestSandbox;

    before(
      async () => {
        tarballs = await packAll();
        sandbox = createSandbox();
        await sandbox.install(tarballs);
        await sandbox.initGitRepo();
        await kibi(sandbox, ["init", "--no-hooks"]);
      },
      { timeout: 240000 },
    );

    after(
      async () => {
        if (sandbox) await sandbox.cleanup();
      },
      { timeout: 120000 },
    );

    it(
      "proves environment, call and property claims from what kibi-plugin-treesitter reads",
      { timeout: 420000 },
      async () => {
        await checkTreeSitterScriptReferences(sandbox, tarballs);
      },
    );
  });
}
