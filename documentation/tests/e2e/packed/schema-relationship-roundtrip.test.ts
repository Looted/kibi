import assert from "node:assert";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import {
  type Tarballs,
  type TestSandbox,
  checkPrologAvailable,
  createMarkdownFile,
  createSandbox,
  kibi,
  packAll,
  stageSourceFile,
} from "./helpers.js";
import { runStdinRoute } from "./mcp-cli-operation-parity-support.js";

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

const ENTITY_TYPES = [
  "req",
  "scenario",
  "test",
  "adr",
  "flag",
  "event",
  "symbol",
  "fact",
] as const;

type JsonRecord = Record<string, unknown>;

type ExpectedRelationship = Readonly<{
  type: string;
  from: string;
  to: string;
}>;

const EXPECTED_RELATIONSHIPS: readonly ExpectedRelationship[] = [
  {
    type: "depends_on",
    from: "REQ-SCHEMA-ROUNDTRIP",
    to: "REQ-SCHEMA-DEPENDENCY",
  },
  {
    type: "specified_by",
    from: "REQ-SCHEMA-ROUNDTRIP",
    to: "SCEN-SCHEMA-ROUNDTRIP",
  },
  {
    type: "relates_to",
    from: "REQ-SCHEMA-ROUNDTRIP",
    to: "EVT-SCHEMA-ROUNDTRIP",
  },
  {
    type: "validates",
    from: "TEST-SCHEMA-ROUNDTRIP",
    to: "SCEN-SCHEMA-ROUNDTRIP",
  },
  {
    type: "implements",
    from: "SYM-SCHEMA-ROUNDTRIP",
    to: "REQ-SCHEMA-ROUNDTRIP",
  },
  {
    type: "covered_by",
    from: "SYM-SCHEMA-ROUNDTRIP",
    to: "TEST-SCHEMA-ROUNDTRIP",
  },
  {
    type: "constrained_by",
    from: "SYM-SCHEMA-ROUNDTRIP",
    to: "ADR-SCHEMA-ROUNDTRIP",
  },
];

function parseEnvelope(stdout: string): JsonRecord {
  return JSON.parse(stdout) as JsonRecord;
}

async function validatedUpsert(
  sandbox: TestSandbox,
  input: JsonRecord,
): Promise<void> {
  const preflight = await runStdinRoute(sandbox, "validate-upsert", input);
  assert.strictEqual(
    preflight.exitCode,
    0,
    `validate-upsert failed: ${preflight.stderr || preflight.stdout}`,
  );
  const preflightEnvelope = parseEnvelope(preflight.stdout);
  assert.strictEqual(preflightEnvelope.status, "success");
  assert.strictEqual(
    (preflightEnvelope.data as JsonRecord | undefined)?.valid,
    true,
  );

  const mutation = await runStdinRoute(sandbox, "upsert", input);
  assert.strictEqual(
    mutation.exitCode,
    0,
    `upsert failed: ${mutation.stderr || mutation.stdout}`,
  );
  const mutationEnvelope = parseEnvelope(mutation.stdout);
  assert.strictEqual(mutationEnvelope.status, "success");
  assert.ok(
    Number(
      (mutationEnvelope.data as JsonRecord | undefined)?.relationships_created,
    ) > 0,
    "upsert should create at least one typed relationship",
  );
}

function assertIsoTimestamp(value: unknown, label: string): void {
  if (typeof value !== "string") {
    assert.fail(`${label} should be a string`);
  }

  assert.ok(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value),
    `${label} should be an ISO-8601 UTC timestamp: ${String(value)}`,
  );
  assert.ok(Number.isFinite(Date.parse(value)), `${label} should be parseable`);
}

function relationshipKey(relationship: ExpectedRelationship): string {
  return `${relationship.type}:${relationship.from}->${relationship.to}`;
}

function shardField(block: string, name: string): string | undefined {
  return block.match(
    new RegExp(`^\\s+${name}:\\s+"?([^"\\n]+?)"?\\s*$`, "m"),
  )?.[1];
}

function canonicalRelationshipRecords(repoDir: string): JsonRecord[] {
  const directory = join(repoDir, ".kb", "relationships");
  return readdirSync(directory)
    .filter((file) => file.endsWith(".yaml"))
    .flatMap((file) =>
      readFileSync(join(directory, file), "utf8")
        .split(/\n(?=\s{2}- )/)
        .filter((block) => /(?:^|\n)\s{2}- /.test(block))
        .map((block) => ({
          type: shardField(block, "- type") ?? shardField(block, "type"),
          from: shardField(block, "from"),
          to: shardField(block, "to"),
          created_at: shardField(block, "created_at"),
          created_by: shardField(block, "created_by"),
          source: shardField(block, "source"),
        })),
    );
}

function writeSchemaFixtures(sandbox: TestSandbox): void {
  createMarkdownFile(
    sandbox,
    ".kb/requirements/REQ-SCHEMA-ROUNDTRIP.md",
    {
      id: "REQ-SCHEMA-ROUNDTRIP",
      type: "req",
      title: "Schema round-trip fixture",
      status: "open",
      priority: "must",
      tags: ["schema", "roundtrip"],
      owner: "schema-team",
      links: [],
    },
    "Test fixture only; no product behavior is declared here.",
  );
  createMarkdownFile(
    sandbox,
    ".kb/requirements/REQ-SCHEMA-DEPENDENCY.md",
    {
      id: "REQ-SCHEMA-DEPENDENCY",
      type: "req",
      title: "Schema dependency fixture",
      status: "open",
    },
    "Test fixture only; no product behavior is declared here.",
  );
  createMarkdownFile(
    sandbox,
    ".kb/scenarios/SCEN-SCHEMA-ROUNDTRIP.md",
    {
      id: "SCEN-SCHEMA-ROUNDTRIP",
      type: "scenario",
      title: "Schema round-trip scenario",
      status: "active",
    },
    "Given typed entities, when they are compiled, then their schema survives.",
  );
  createMarkdownFile(
    sandbox,
    ".kb/tests/TEST-SCHEMA-ROUNDTRIP.md",
    {
      id: "TEST-SCHEMA-ROUNDTRIP",
      type: "test",
      title: "Schema round-trip test",
      status: "active",
      verification_scope: "integration",
      verification_perspective: "consumer",
    },
    "Exercise entity and relationship persistence.",
  );
  createMarkdownFile(
    sandbox,
    ".kb/adr/ADR-SCHEMA-ROUNDTRIP.md",
    {
      id: "ADR-SCHEMA-ROUNDTRIP",
      type: "adr",
      title: "Schema round-trip decision",
      status: "accepted",
    },
    "Use the typed schema fixture.",
  );
  createMarkdownFile(
    sandbox,
    ".kb/flags/FLAG-SCHEMA-ROUNDTRIP.md",
    {
      id: "FLAG-SCHEMA-ROUNDTRIP",
      type: "flag",
      title: "Schema round-trip flag",
      status: "active",
    },
    "Runtime flag fixture.",
  );
  createMarkdownFile(
    sandbox,
    ".kb/events/EVT-SCHEMA-ROUNDTRIP.md",
    {
      id: "EVT-SCHEMA-ROUNDTRIP",
      type: "event",
      title: "Schema round-trip event",
      status: "active",
    },
    "Event fixture.",
  );
  createMarkdownFile(
    sandbox,
    ".kb/facts/FACT-SCHEMA-ROUNDTRIP.md",
    {
      id: "FACT-SCHEMA-ROUNDTRIP",
      type: "fact",
      title: "Schema round-trip observation",
      status: "active",
      fact_kind: "observation",
    },
    "Observation fixture.",
  );

  mkdirSync(join(sandbox.repoDir, "src"), { recursive: true });
  writeFileSync(
    join(sandbox.repoDir, "src", "schema-roundtrip.ts"),
    "export function schemaRoundTripFixture(): boolean { return true; }\n",
    "utf8",
  );
  stageSourceFile(sandbox, "src/schema-roundtrip.ts");
  mkdirSync(join(sandbox.repoDir, ".kb"), { recursive: true });
  writeFileSync(
    join(sandbox.repoDir, ".kb", "symbols.yaml"),
    `symbols:
  - id: SYM-SCHEMA-ROUNDTRIP
    title: schemaRoundTripFixture
    status: active
    sourceFile: src/schema-roundtrip.ts
    symbol_role: behavioral
`,
    "utf8",
  );
  stageSourceFile(sandbox, ".kb/symbols.yaml");
}

// implements REQ-004
export async function packedEightEntitySchemaRoundTrip(
  sandbox: TestSandbox,
): Promise<void> {
  writeSchemaFixtures(sandbox);
  const sync = await kibi(sandbox, ["sync"]);
  assert.strictEqual(sync.exitCode, 0, sync.stderr || sync.stdout);

  const observedTypes = new Set<string>();
  const entities: JsonRecord[] = [];
  for (const type of ENTITY_TYPES) {
    const query = await kibi(sandbox, ["query", type, "--format", "json"]);
    assert.strictEqual(query.exitCode, 0, query.stderr || query.stdout);
    const rows = JSON.parse(query.stdout) as JsonRecord[];
    assert.ok(rows.length > 0, `${type} should be accepted and queryable`);
    for (const row of rows) {
      observedTypes.add(String(row.type));
      entities.push(row);
    }
  }
  assert.deepStrictEqual([...observedTypes].sort(), [...ENTITY_TYPES].sort());

  const rejected = await kibi(sandbox, ["query", "widget", "--format", "json"]);
  assert.notStrictEqual(rejected.exitCode, 0);
  assert.match(rejected.stderr + rejected.stdout, /Invalid type 'widget'/);
  for (const type of ENTITY_TYPES) {
    assert.match(
      rejected.stderr + rejected.stdout,
      new RegExp(`\\b${type}\\b`),
    );
  }

  for (const entity of entities) {
    for (const field of ["id", "type", "title", "status", "source"] as const) {
      assert.strictEqual(
        typeof entity[field],
        "string",
        `${String(entity.id)} should persist required ${field}`,
      );
      assert.ok(String(entity[field]).length > 0);
    }
    assertIsoTimestamp(entity.created_at, `${String(entity.id)}.created_at`);
    assertIsoTimestamp(entity.updated_at, `${String(entity.id)}.updated_at`);
  }

  const primary = entities.find(
    (entity) => entity.id === "REQ-SCHEMA-ROUNDTRIP",
  );
  assert.ok(primary);
  assert.deepStrictEqual(primary.tags, ["schema", "roundtrip"]);
  assert.strictEqual(primary.owner, "schema-team");
  assert.strictEqual(primary.priority, "must");
  assert.strictEqual(
    primary.source,
    ".kb/requirements/REQ-SCHEMA-ROUNDTRIP.md",
    "source provenance should be generated from the authored document path",
  );

  const sparse = entities.find(
    (entity) => entity.id === "EVT-SCHEMA-ROUNDTRIP",
  );
  assert.ok(sparse);
  assert.strictEqual(sparse.owner, undefined);
  assert.strictEqual(sparse.priority, undefined);
  assert.strictEqual(sparse.tags, undefined);
}

// implements REQ-005
export async function packedTypedRelationshipRoundTrip(
  sandbox: TestSandbox,
): Promise<void> {
  await validatedUpsert(sandbox, {
    type: "req",
    id: "REQ-SCHEMA-ROUNDTRIP",
    properties: {
      title: "Schema round-trip fixture",
      status: "open",
      priority: "must",
      tags: ["schema", "roundtrip"],
      owner: "schema-team",
    },
    relationships: EXPECTED_RELATIONSHIPS.filter(
      (relationship) => relationship.from === "REQ-SCHEMA-ROUNDTRIP",
    ),
  });
  await validatedUpsert(sandbox, {
    type: "test",
    id: "TEST-SCHEMA-ROUNDTRIP",
    properties: {
      title: "Schema round-trip test",
      status: "active",
      verification_scope: "integration",
      verification_perspective: "consumer",
    },
    relationships: EXPECTED_RELATIONSHIPS.filter(
      (relationship) => relationship.from === "TEST-SCHEMA-ROUNDTRIP",
    ),
  });
  await validatedUpsert(sandbox, {
    type: "symbol",
    id: "SYM-SCHEMA-ROUNDTRIP",
    properties: {
      title: "schemaRoundTripFixture",
      status: "active",
      sourceFile: "src/schema-roundtrip.ts",
      symbol_role: "behavioral",
    },
    relationships: EXPECTED_RELATIONSHIPS.filter(
      (relationship) => relationship.from === "SYM-SCHEMA-ROUNDTRIP",
    ),
  });

  const compiledSync = await kibi(sandbox, ["sync"]);
  assert.strictEqual(
    compiledSync.exitCode,
    0,
    compiledSync.stderr || compiledSync.stdout,
  );

  const canonicalRecords = canonicalRelationshipRecords(sandbox.repoDir);
  for (const expected of EXPECTED_RELATIONSHIPS) {
    const record = canonicalRecords.find(
      (candidate) =>
        candidate.type === expected.type &&
        candidate.from === expected.from &&
        candidate.to === expected.to,
    );
    assert.ok(record, `canonical shard omitted ${relationshipKey(expected)}`);
    assertIsoTimestamp(
      record.created_at,
      `${relationshipKey(expected)}.created_at`,
    );
    assert.strictEqual(typeof record.created_by, "string");
    assert.ok(String(record.created_by).length > 0);
    assert.strictEqual(typeof record.source, "string");
    assert.ok(String(record.source).length > 0);
  }

  const stop = await kibi(sandbox, ["engine", "stop"]);
  assert.strictEqual(stop.exitCode, 0, stop.stderr || stop.stdout);

  const reloaded: ExpectedRelationship[] = [];
  for (const from of [
    ...new Set(EXPECTED_RELATIONSHIPS.map((item) => item.from)),
  ]) {
    const query = await kibi(sandbox, [
      "query",
      "--relationships",
      from,
      "--format",
      "json",
    ]);
    assert.strictEqual(query.exitCode, 0, query.stderr || query.stdout);
    reloaded.push(...(JSON.parse(query.stdout) as ExpectedRelationship[]));
  }
  assert.deepStrictEqual(
    reloaded.map(relationshipKey).sort(),
    EXPECTED_RELATIONSHIPS.map(relationshipKey).sort(),
    "a fresh CLI process should reload the exact typed triples from RDF",
  );
}

if (RUN_NODE_TEST_SUITE) {
  describe("E2E: entity and relationship schema round-trip", () => {
    let tarballs: Tarballs;
    let sandbox: TestSandbox;
    let hasProlog = false;

    before(
      async () => {
        hasProlog = checkPrologAvailable();
        if (!hasProlog) return;
        tarballs = await packAll();
        sandbox = createSandbox();
        await sandbox.install(tarballs);
        await sandbox.initGitRepo();
        const init = await kibi(sandbox, ["init", "--no-hooks"]);
        assert.strictEqual(init.exitCode, 0, init.stderr || init.stdout);
      },
      { timeout: 120_000 },
    );

    after(
      async () => {
        if (sandbox) await sandbox.cleanup();
      },
      { timeout: 120_000 },
    );

    it(
      "round-trips the exact entity schema and timestamped typed relationships",
      { timeout: 120_000 },
      async () => {
        if (!hasProlog) return;
        await packedEightEntitySchemaRoundTrip(sandbox);
        await packedTypedRelationshipRoundTrip(sandbox);
      },
    );
  });
}
