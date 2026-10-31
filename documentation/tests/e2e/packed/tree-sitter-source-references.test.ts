import assert from "node:assert";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import {
  type Tarballs,
  type TestSandbox,
  createSandbox,
  kibi,
  packAll,
  run,
  stageSourceFile,
} from "./helpers.js";

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

/**
 * E2E: source proofs read Go, Java, C# and Rust references through
 * kibi-plugin-treesitter, without compiling or running the code.
 *
 * SCEN-kibi-tree-sitter-references — a service with a Go server, a Java
 * client, a C# gateway and a Rust worker states which environment variables
 * the Go server and the Rust worker read, that the Java client never calls
 * System.exit, and which namespaces the C# gateway imports. Source tests read
 * them with the references reader, which hands the files to the qualified
 * plugin; each claim gets a derived binding at evidence level proved. Before
 * the plugin is active for proofs the read is refused with what to install. A
 * Go file that reads a variable named at run time is refused with its place,
 * and once the Rust worker reads another variable its claim is rejected with
 * that name.
 */

type Step = Readonly<{
  type: string;
  id: string;
  properties: Record<string, unknown>;
  relationships?: readonly Record<string, string>[];
}>;

const STATEMENTS = {
  goEnv:
    "Every environment variable the Go server reads must be one of PORT or APP_DEBUG.",
  javaExit: "The Java client must never call System.exit.",
  csharpImports:
    "Every library the C# gateway imports must be one of System or System.Net.Http.",
  rustEnv:
    "Every environment variable the Rust worker reads must be one of PORT or RUST_LOG.",
} as const;

const EXPECTED_FACTS: Record<keyof typeof STATEMENTS, [string, string]> = {
  goEnv: ["allowed_values", "subset_of"],
  javaExit: ["calls", "excludes"],
  csharpImports: ["allowed_values", "subset_of"],
  rustEnv: ["allowed_values", "subset_of"],
};

const GO_SERVER = `package server

import (
	"fmt"
	"net/http"
	"os"
)

func Start() {
	port := os.Getenv("PORT")
	_, debug := os.LookupEnv("APP_DEBUG")
	fmt.Println(debug)
	http.ListenAndServe(":"+port, nil)
}
`;

const GO_LOOKUP = `package server

import "os"

func Lookup(name string) string {
	return os.Getenv(name)
}
`;

const JAVA_CLIENT = `package client;

import java.net.http.HttpClient;

class Client {
  void run() {
    HttpClient client = HttpClient.newHttpClient();
    if (client == null) {
      throw new IllegalStateException("no client");
    }
    System.out.println("ready");
  }
}
`;

const CSHARP_GATEWAY = `using System;
using System.Net.Http;

namespace Gateway
{
    class Gateway
    {
        void Start()
        {
            var client = new HttpClient();
            Console.WriteLine(Environment.GetEnvironmentVariable("PORT"));
        }
    }
}
`;

const RUST_WORKER = `use std::env;

fn start() {
    let port = env::var("PORT").unwrap_or_default();
    let level = env::var("RUST_LOG").ok();
    run(port, level);
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

function testDocument(id: string, contract: string, claim: string): string {
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
${contract}  proves:
    - ${claim}
type: test
---

Proves a claim about the service sources with a source proof for kibi prove.
`;
}

const TESTS = [
  ["TEST-GO-ENV", "go/server.go", "env", "goEnv"],
  ["TEST-JAVA-EXIT", "java/Client.java", "calls", "javaExit"],
  ["TEST-CSHARP-IMPORTS", "csharp/Gateway.cs", "imports", "csharpImports"],
  ["TEST-RUST-ENV", "rust/worker.rs", "env", "rustEnv"],
  ["TEST-GO-ENV-ALL", "go/*.go", "env", "goEnv"],
] as const;

async function writePackageJson(
  sandbox: TestSandbox,
  version: string,
  capabilities: Record<string, { mode: string }>,
): Promise<void> {
  writeFileSync(
    join(sandbox.repoDir, "package.json"),
    `${JSON.stringify(
      {
        name: "service-references",
        private: true,
        dependencies: { "kibi-plugin-treesitter": version },
        kibi: {
          plugins: [{ package: "kibi-plugin-treesitter", capabilities }],
        },
      },
      null,
      2,
    )}\n`,
  );
}

async function installTreeSitter(
  sandbox: TestSandbox,
  tarballs: Tarballs,
): Promise<string> {
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
  // Symbols only at first: source proofs must refuse until the operator
  // activates the reference extractor.
  await writePackageJson(sandbox, version, {
    "kibi.symbol-extractor.v2": { mode: "augment" },
  });
  return version;
}

async function provision(
  sandbox: TestSandbox,
  tarballs: Tarballs,
): Promise<string> {
  const version = await installTreeSitter(sandbox, tarballs);
  const files: Record<string, string> = {
    "go/server.go": GO_SERVER,
    "go/lookup.go": GO_LOOKUP,
    "java/Client.java": JAVA_CLIENT,
    "csharp/Gateway.cs": CSHARP_GATEWAY,
    "rust/worker.rs": RUST_WORKER,
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
    properties: { title: "Run a polyglot service", status: "active" },
  });
  const claims: Record<string, string> = {};
  for (const key of Object.keys(STATEMENTS) as (keyof typeof STATEMENTS)[]) {
    const plan = await advisorPlan(
      sandbox,
      `REQ-${key.toUpperCase()}`,
      STATEMENTS[key],
    );
    const setFact = plan.find(
      (step) => step.type === "fact" && step.properties.value_type === "set",
    );
    assert.deepStrictEqual(
      [setFact?.properties.property_key, setFact?.properties.operator],
      EXPECTED_FACTS[key],
      JSON.stringify(plan),
    );
    claims[key] = await applyPlan(sandbox, plan);
  }
  for (const [id, files, extract, claim] of TESTS) {
    const relative = `.kb/tests/${id}.md`;
    writeFileSync(
      join(sandbox.repoDir, relative),
      testDocument(
        id,
        `  source:\n    reader: references\n    files: ${files}\n    extract: ${extract}\n`,
        claims[claim] ?? "",
      ),
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
  return version;
}

function latestReceipt(sandbox: TestSandbox, testId: string): string {
  const document = readFileSync(
    join(sandbox.repoDir, ".kb", "tests", `${testId}.md`),
    "utf8",
  );
  const frontmatter = document.split(/^---$/m)[1] ?? "";
  return frontmatter.split(/^ {2}- version: /m).at(-1) ?? "";
}

/**
 * Provisions the service, proves its claims before and after activating the
 * reference extractor, and checks how each source proof binds.
 */
export async function checkTreeSitterSourceReferences(
  sandbox: TestSandbox,
  tarballs: Tarballs,
): Promise<void> {
  const version = await provision(sandbox, tarballs);

  // Not active for proofs yet: the read is refused with what to install.
  const before = await kibi(sandbox, ["prove", "--test", "TEST-GO-ENV"], {
    timeoutMs: 240000,
  });
  assert.strictEqual(before.exitCode, 0, before.stdout + before.stderr);
  const refused = latestReceipt(sandbox, "TEST-GO-ENV");
  assert.doesNotMatch(refused, /evidence_level: proved/, refused);
  assert.match(refused, /kibi\.reference-extractor\.v1/, refused);

  await writePackageJson(sandbox, version, {
    "kibi.symbol-extractor.v2": { mode: "augment" },
    "kibi.reference-extractor.v1": { mode: "augment" },
  });
  const prove = await kibi(sandbox, ["prove", "--all"], { timeoutMs: 240000 });
  assert.strictEqual(prove.exitCode, 0, prove.stdout + prove.stderr);
  for (const testId of [
    "TEST-GO-ENV",
    "TEST-JAVA-EXIT",
    "TEST-CSHARP-IMPORTS",
    "TEST-RUST-ENV",
  ]) {
    const receipt = latestReceipt(sandbox, testId);
    assert.match(
      receipt,
      /evidence_level: proved/,
      `${testId}\n${receipt}\n${prove.stderr}`,
    );
    assert.match(receipt, /binding: derived/, receipt);
  }
  // Kibi stores the plugin's read as the certificate.
  assert.match(
    latestReceipt(sandbox, "TEST-CSHARP-IMPORTS"),
    /- System\.Net\.Http/,
  );

  // lookup.go reads a variable named at run time: the set is not known.
  const all = latestReceipt(sandbox, "TEST-GO-ENV-ALL");
  assert.match(all, /binding: rejected/, all);
  assert.match(all, /go\/lookup\.go:6 os\.Getenv\(name\)/, all);
  assert.doesNotMatch(all, /evidence_level: proved/, all);

  // The worker now reads a variable its requirement does not allow.
  writeFileSync(
    join(sandbox.repoDir, "rust/worker.rs"),
    RUST_WORKER.replace(
      "run(port, level);",
      'run(port, level, env::var("API_TOKEN"));',
    ),
  );
  stageSourceFile(sandbox, "rust/worker.rs");
  const reprove = await kibi(sandbox, ["prove", "--test", "TEST-RUST-ENV"], {
    timeoutMs: 240000,
  });
  assert.strictEqual(reprove.exitCode, 0, reprove.stdout + reprove.stderr);
  const rust = latestReceipt(sandbox, "TEST-RUST-ENV");
  assert.match(rust, /binding: rejected/, rust);
  assert.match(rust, /API_TOKEN/, rust);
}

if (RUN_NODE_TEST_SUITE) {
  describe("E2E: Go, Java, C# and Rust source references", () => {
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
      "proves environment, call and import claims from what kibi-plugin-treesitter reads",
      { timeout: 420000 },
      async () => {
        await checkTreeSitterSourceReferences(sandbox, tarballs);
      },
    );
  });
}
