import assert from "node:assert";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import { pathToFileURL } from "node:url";
import {
  type Tarballs,
  type TestSandbox,
  checkPrologAvailable,
  createSandbox,
  kibi,
  packAll,
  stageSourceFile,
} from "./helpers.js";

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

/**
 * E2E: source proofs decide set, field and route claims against what Kibi
 * reads from the project itself, and state_machine proofs decide temporal
 * claims (a state never reached, a state every path passes through).
 *
 * SCEN-kibi-source-proof-kinds — the semantic advisor models "Every route
 * under /api must use requireAuth" as a middleware set fact, "Every
 * environment variable the app reads must be one of DATABASE_URL, PORT or
 * SECRET" as a subset_of set fact, "Every table must have id and
 * created_at" as a required_fields set fact, "A cancelled invoice can never
 * become paid" as a reachable_pairs excludes fact and "Every path from draft
 * to paid must pass through approved" as a required_waypoints fact. Source
 * tests read the app's route table, the environment variables the code
 * reads and the SQL migrations; Kibi reads each source itself, and each claim
 * gets a derived binding at evidence level proved. A source over every
 * route (the health check has no auth) is rejected with the route that
 * breaks the claim, and once the code reads another environment variable the
 * environment claim is rejected with the variable. "The web app must never
 * import rxjs/operators" is rejected because the app imports it: a member
 * with a slash is compared whole.
 */

type Step = Readonly<{
  type: string;
  id: string;
  properties: Record<string, unknown>;
  relationships?: readonly Record<string, string>[];
}>;

const STATEMENTS = {
  auth: "Every route under /api must use requireAuth.",
  env: "Every environment variable the app reads must be one of DATABASE_URL, PORT or SECRET.",
  tables: "Every table must have id and created_at.",
  never: "A cancelled invoice can never become paid.",
  waypoint: "Every path from draft to paid must pass through approved.",
  imports: "The web app must never import rxjs/operators.",
} as const;

const EXPECTED_FACTS: Record<keyof typeof STATEMENTS, [string, string]> = {
  auth: ["middleware", "includes"],
  env: ["allowed_values", "subset_of"],
  tables: ["required_fields", "includes"],
  never: ["reachable_pairs", "excludes"],
  waypoint: ["required_waypoints", "includes"],
  imports: ["imports", "excludes"],
};

function sources(certificatesModule: string): Record<string, string> {
  return {
    "app.mjs": `export async function requireAuth(c, next) { return next(); }
function health() { return "ok"; }
function listInvoices() { return []; }
function createInvoice() { return {}; }
// The route table a Hono app keeps: middleware first, then each route.
export const app = {
  fetch() {},
  routes: [
    { method: "GET", path: "/health", handler: health },
    { method: "ALL", path: "/api/*", handler: requireAuth },
    { method: "GET", path: "/api/invoices", handler: listInvoices },
    { method: "POST", path: "/api/invoices", handler: createInvoice },
  ],
};
`,
    "config.mjs": `export const config = {
  database: process.env.DATABASE_URL,
  port: Number(process.env.PORT ?? 3000),
};
`,
    "migrations/0001_init.sql": `CREATE TABLE customers (
  id text PRIMARY KEY NOT NULL,
  email text,
  created_at integer NOT NULL
);
CREATE TABLE invoices (
  id text PRIMARY KEY NOT NULL,
  customer_id text NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  created_at integer NOT NULL
);
`,
    "web.mjs": `import { map } from "rxjs/operators";
export const pipeline = [map];
`,
    "invoices.mjs": `export const TRANSITIONS = {
  draft: ["approved", "cancelled"],
  approved: ["paid", "cancelled"],
  paid: [],
  cancelled: [],
};
`,
    "proofs.mjs": `import { TRANSITIONS } from "./invoices.mjs";
import { stateMachineCertificate, writeCodeCertificate } from ${JSON.stringify(certificatesModule)};
const selected = new Set(JSON.parse(process.env.KIBI_PROOF_TEST_IDS ?? "[]"));
export async function runProofs() {
  for (const testId of ["TEST-INVOICE-NEVER", "TEST-INVOICE-PATH"])
    if (selected.has(testId))
      writeCodeCertificate(await stateMachineCertificate({ testId, symbolId: "SYM-TRANSITIONS", transitions: TRANSITIONS }));
}
await runProofs();
`,
  };
}

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
  scenario: string,
): Promise<string> {
  for (const step of plan)
    await upsert(sandbox, {
      type: step.type,
      id: step.id,
      properties: step.properties,
      relationships: [
        ...(step.relationships ?? []),
        ...(step.type === "req"
          ? [{ type: "specified_by", from: step.id, to: scenario }]
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

type TestSpec = Readonly<{
  id: string;
  requirement: string;
  kind: string;
  claim: string;
  contract: string;
}>;

function testDocument(spec: TestSpec): string {
  return `---
id: ${spec.id}
title: ${spec.kind} proof ${spec.id}
status: passing
verification_scope: end_to_end
proof_contract:
  version: kibi.proof-contract.v1
  integration: command
  required_proofs:
    - symbol_id: SYM-PROOFS
      target: default
  success_policy: all_required_first_attempt
  kind: ${spec.kind}
${spec.contract}  proves:
    - ${spec.claim}
type: test
---

Proves ${spec.requirement} with a ${spec.kind} proof for kibi prove.
`;
}

async function provision(
  sandbox: TestSandbox,
): Promise<Record<string, string>> {
  const certificatesModule = pathToFileURL(
    join(
      sandbox.npmPrefix,
      "node_modules",
      "kibi-cli",
      "dist",
      "public",
      "proof-certificates.js",
    ),
  ).href;
  mkdirSync(join(sandbox.repoDir, "migrations"), { recursive: true });
  for (const [file, content] of Object.entries(sources(certificatesModule))) {
    writeFileSync(join(sandbox.repoDir, file), content);
    stageSourceFile(sandbox, file);
  }
  const synced = await kibi(sandbox, ["sync"]);
  assert.strictEqual(synced.exitCode, 0, synced.stdout + synced.stderr);
  await upsert(sandbox, {
    type: "scenario",
    id: "SCEN-BILLING",
    properties: { title: "Run the billing API", status: "active" },
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
    claims[key] = await applyPlan(sandbox, plan, "SCEN-BILLING");
  }

  const routes = (prefix: string) => `  source:
    reader: routes
    file: app.mjs
    export: app
    select: middleware
${prefix}`;
  const tests: TestSpec[] = [
    {
      id: "TEST-API-AUTH",
      requirement: "REQ-AUTH",
      kind: "source",
      claim: claims.auth ?? "",
      contract: routes("    path_prefix: /api\n"),
    },
    {
      id: "TEST-ALL-ROUTES-AUTH",
      requirement: "REQ-AUTH",
      kind: "source",
      claim: claims.auth ?? "",
      contract: routes(""),
    },
    {
      id: "TEST-ENV",
      requirement: "REQ-ENV",
      kind: "source",
      claim: claims.env ?? "",
      contract:
        "  source:\n    reader: references\n    files: config.mjs\n    extract: env\n",
    },
    {
      id: "TEST-TABLES",
      requirement: "REQ-TABLES",
      kind: "source",
      claim: claims.tables ?? "",
      contract:
        "  source:\n    reader: schema\n    format: sql\n    files: migrations/*.sql\n",
    },
    {
      id: "TEST-WEB-IMPORTS",
      requirement: "REQ-IMPORTS",
      kind: "source",
      claim: claims.imports ?? "",
      contract:
        "  source:\n    reader: references\n    files: web.mjs\n    extract: imports\n",
    },
    {
      id: "TEST-INVOICE-NEVER",
      requirement: "REQ-NEVER",
      kind: "state_machine",
      claim: claims.never ?? "",
      contract: "  domain_source:\n    symbol_id: SYM-TRANSITIONS\n",
    },
    {
      id: "TEST-INVOICE-PATH",
      requirement: "REQ-WAYPOINT",
      kind: "state_machine",
      claim: claims.waypoint ?? "",
      contract: "  domain_source:\n    symbol_id: SYM-TRANSITIONS\n",
    },
  ];
  for (const spec of tests) {
    const relative = `.kb/tests/${spec.id}.md`;
    writeFileSync(join(sandbox.repoDir, relative), testDocument(spec));
    stageSourceFile(sandbox, relative);
  }
  const testsSynced = await kibi(sandbox, ["sync"]);
  assert.strictEqual(
    testsSynced.exitCode,
    0,
    testsSynced.stdout + testsSynced.stderr,
  );
  for (const spec of tests)
    await upsert(sandbox, {
      type: "test",
      id: spec.id,
      properties: { title: `${spec.kind} proof ${spec.id}`, status: "passing" },
      relationships: [{ type: "validates", from: spec.id, to: "SCEN-BILLING" }],
    });
  const machineTests = ["TEST-INVOICE-NEVER", "TEST-INVOICE-PATH"];
  for (const [id, title, sourceFile, requirements, coveredBy, executable] of [
    [
      "SYM-TRANSITIONS",
      "TRANSITIONS",
      "invoices.mjs",
      ["REQ-NEVER", "REQ-WAYPOINT"],
      machineTests,
      [],
    ],
    [
      "SYM-PROOFS",
      "runProofs",
      "proofs.mjs",
      [],
      [],
      tests.map((spec) => spec.id),
    ],
  ] as [string, string, string, string[], string[], string[]][])
    await upsert(sandbox, {
      type: "symbol",
      id,
      properties: {
        title,
        status: "active",
        sourceFile,
        symbol_role: "behavioral",
      },
      relationships: [
        ...requirements.map((requirement) => ({
          type: "implements",
          from: id,
          to: requirement,
        })),
        ...coveredBy.map((test) => ({
          type: "covered_by",
          from: id,
          to: test,
        })),
        ...executable.map((test) => ({
          type: "executable_for",
          from: id,
          to: test,
        })),
      ],
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
          description:
            "Runs the billing proofs; source proofs need no certificate.",
        },
      ],
    }),
  );
  const sync = await kibi(sandbox, ["sync", "--refresh-symbol-coordinates"]);
  assert.strictEqual(sync.exitCode, 0, sync.stdout + sync.stderr);
  return claims;
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
 * Provisions the billing fixture, runs kibi prove --all, and checks how each
 * source and state machine proof binds to the claim it names.
 */
export async function checkSourceProofKinds(
  sandbox: TestSandbox,
): Promise<void> {
  await provision(sandbox);
  const prove = await kibi(sandbox, ["prove", "--all"], { timeoutMs: 240000 });
  assert.strictEqual(prove.exitCode, 0, prove.stdout + prove.stderr);

  for (const [testId, obligation] of [
    ["TEST-API-AUTH", "route_middleware"],
    ["TEST-ENV", "set_relation"],
    ["TEST-TABLES", "required_fields"],
    ["TEST-INVOICE-NEVER", "machine_relation"],
    ["TEST-INVOICE-PATH", "machine_relation"],
  ] as const) {
    const receipt = latestReceipt(sandbox, testId);
    assert.match(
      receipt,
      /evidence_level: proved/,
      `${testId}\n${receipt}\n${prove.stderr}`,
    );
    assert.match(receipt, /binding: derived/, receipt);
    assert.match(receipt, new RegExp(`kind: ${obligation}`), receipt);
  }
  // Kibi stores its own read of the route table as the certificate, and the
  // claim rests on that read: scope source.
  assert.match(
    latestReceipt(sandbox, "TEST-API-AUTH"),
    /- GET \/api\/invoices requireAuth/,
  );
  assert.match(latestReceipt(sandbox, "TEST-API-AUTH"), /scope: source/);

  // A member with a slash stays whole: the web app imports rxjs/operators,
  // so "never import rxjs/operators" is rejected, not decided over
  // "operators".
  const imports = latestReceipt(sandbox, "TEST-WEB-IMPORTS");
  assert.match(imports, /binding: rejected/, imports);
  assert.match(
    imports,
    /include rxjs\/operators, which the fact excludes/,
    imports,
  );

  const all = latestReceipt(sandbox, "TEST-ALL-ROUTES-AUTH");
  assert.match(all, /binding: rejected/, all);
  assert.match(
    all,
    /the middleware of GET \/health do not include requireAuth/,
    all,
  );
  assert.match(all, /evidence_level: tested/, all);

  // The code now reads a variable the requirement does not allow.
  writeFileSync(
    join(sandbox.repoDir, "config.mjs"),
    "export const config = { database: process.env.DATABASE_URL, key: process.env.API_KEY };\n",
  );
  stageSourceFile(sandbox, "config.mjs");
  const reprove = await kibi(sandbox, ["prove", "--test", "TEST-ENV"], {
    timeoutMs: 240000,
  });
  assert.strictEqual(reprove.exitCode, 0, reprove.stdout + reprove.stderr);
  const env = latestReceipt(sandbox, "TEST-ENV");
  assert.match(env, /binding: rejected/, env);
  assert.match(
    env,
    /include API_KEY, which the fact'{1,2}s set does not allow/,
    env,
  );
}

if (RUN_NODE_TEST_SUITE) {
  describe("E2E: source proof kinds", () => {
    let tarballs: Tarballs;
    let sandbox: TestSandbox;
    let hasProlog = false;

    before(
      async () => {
        hasProlog = checkPrologAvailable();
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
      "proves route, environment, table and temporal claims against what Kibi reads",
      { timeout: 300000 },
      async (testContext) => {
        if (!hasProlog) {
          testContext.skip("SWI-Prolog is unavailable");
          return;
        }
        await checkSourceProofKinds(sandbox);
      },
    );
  });
}
