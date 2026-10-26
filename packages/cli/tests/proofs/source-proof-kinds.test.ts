import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { evaluateSourceCode } from "../../src/operations/proof/source-code-readers.js";
import { detectStrictSuggestion } from "../../src/operations/semantic-advisor/strict-rules.js";
import { proofContractErrors } from "../../src/public/proof-protocol.js";
import {
  type SourceSpec,
  readSource,
  sourceDependencies,
  sourceSpecErrors,
} from "../../src/public/proof-sources.js";
import { prologCases } from "./prolog-cases.js";

// implements REQ-kibi-source-proof-kinds

const root = mkdtempSync(path.join(import.meta.dir, ".source-proof-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

function write(relative: string, text: string): void {
  const file = path.join(root, relative);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, text);
}

async function read(spec: Record<string, unknown>) {
  return readSource(root, spec as SourceSpec, evaluateSourceCode);
}

async function members(spec: Record<string, unknown>): Promise<string[]> {
  const result = await read(spec);
  if (!result.ok) throw new Error(result.reason);
  return result.model.members;
}

describe("source specs", () => {
  test("each reader takes its own keys and repository-relative paths", () => {
    expect(
      sourceSpecErrors(
        { reader: "json", file: "package.json", select: "keys" },
        "s",
      ),
    ).toEqual([]);
    expect(sourceSpecErrors({ reader: "json" }, "s").join("\n")).toContain(
      "s.file is required",
    );
    expect(
      sourceSpecErrors({ reader: "json", file: "../x.json" }, "s").join("\n"),
    ).toContain("repository-relative");
    expect(
      sourceSpecErrors(
        { reader: "glob", pattern: "a/*", select: "keys" },
        "s",
      ).join("\n"),
    ).toContain("select does not apply");
    expect(
      sourceSpecErrors(
        { reader: "references", files: "src/**", extract: "string_args" },
        "s",
      ).join("\n"),
    ).toContain("callee is required");
    expect(
      sourceSpecErrors(
        { reader: "schema", format: "sql", file: "x.sql" },
        "s",
      ).join("\n"),
    ).toContain("use files");
    expect(sourceSpecErrors({ reader: "nope" }, "s")[0]).toContain(
      "reader is one of",
    );
  });

  test("a source contract names its source, and source domains and counts are checked", () => {
    const base = {
      version: "kibi.proof-contract.v1",
      integration: "self-proof",
      required_proofs: [{ symbol_id: "SYM-T", target: "default" }],
      success_policy: "all_required_first_attempt",
    };
    expect(
      proofContractErrors({
        ...base,
        kind: "source",
        source: { reader: "glob", pattern: "src/*.ts" },
      }),
    ).toEqual([]);
    expect(
      proofContractErrors({ ...base, kind: "source" }).join("\n"),
    ).toContain("proof_contract.source is required");
    expect(
      proofContractErrors({
        ...base,
        kind: "rule",
        source: { reader: "glob", pattern: "x" },
      }).join("\n"),
    ).toContain("applies only to kind source");
    expect(
      proofContractErrors({
        ...base,
        kind: "arithmetic",
        value_source: [
          { source: { reader: "glob", pattern: "src/*.ts" }, measure: "count" },
        ],
      }),
    ).toEqual([]);
    expect(
      proofContractErrors({
        ...base,
        kind: "arithmetic",
        value_source: [
          { source: { reader: "glob", pattern: "src/*.ts" }, measure: "value" },
        ],
      }).join("\n"),
    ).toContain("must be count for a source");
    expect(
      proofContractErrors({
        ...base,
        kind: "rule",
        predicate_source: {
          guarded: { symbol_id: "SYM-H", harness_for: ["SYM-APP"] },
        },
        domains: {
          route: {
            source: { reader: "routes", file: "src/app.ts", export: "app" },
          },
        },
      }),
    ).toEqual([]);
  });
});

describe("file readers", () => {
  test("json and yaml read keys, values and items at a path", async () => {
    write(
      "package.json",
      JSON.stringify({
        dependencies: { hono: "4", zod: "3" },
        scripts: { test: "bun test" },
      }),
    );
    write(
      "config.yaml",
      "features:\n  - billing\n  - sso\nlimits:\n  seats: 5\n",
    );
    expect(
      await members({
        reader: "json",
        file: "package.json",
        path: "dependencies",
      }),
    ).toEqual(["hono", "zod"]);
    expect(
      await members({
        reader: "json",
        file: "package.json",
        path: "/scripts",
        select: "values",
      }),
    ).toEqual(["bun test"]);
    expect(
      await members({ reader: "yaml", file: "config.yaml", path: "features" }),
    ).toEqual(["billing", "sso"]);
    const missing = await read({
      reader: "yaml",
      file: "config.yaml",
      path: "nope",
    });
    expect(missing.ok).toBe(false);
  });

  test("glob lists files, or what each * matched", async () => {
    write(
      "migrations/0001_init.sql",
      "CREATE TABLE users (id text PRIMARY KEY, email text NOT NULL, deleted_at integer);\n",
    );
    write(
      "migrations/0002_orgs.sql",
      [
        "CREATE TABLE organizations (id text PRIMARY KEY NOT NULL, name text NOT NULL);",
        "--> statement-breakpoint",
        "ALTER TABLE users ADD COLUMN organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE;",
        "ALTER TABLE users DROP COLUMN email;",
      ].join("\n"),
    );
    expect(
      await members({ reader: "glob", pattern: "migrations/*.sql" }),
    ).toEqual(["migrations/0001_init.sql", "migrations/0002_orgs.sql"]);
    expect(
      await members({
        reader: "glob",
        pattern: "migrations/*_*.sql",
        capture: true,
      }),
    ).toEqual(["0001/init", "0002/orgs"]);
  });

  test("SQL migrations are replayed in order", async () => {
    const result = await read({
      reader: "schema",
      format: "sql",
      files: "migrations/*.sql",
      select: "foreign_keys",
    });
    if (!result.ok) throw new Error(result.reason);
    expect(result.model.members).toEqual([
      "users.organization_id->organizations.id on delete cascade",
    ]);
    expect(
      await members({
        reader: "schema",
        format: "sql",
        files: "migrations/*.sql",
        select: "columns",
        table: "users",
      }),
    ).toEqual(["users.deleted_at", "users.id", "users.organization_id"]);
    expect(
      await members({
        reader: "schema",
        format: "sql",
        files: "migrations/*.sql",
        select: "nullable_columns",
      }),
    ).toEqual(["users.deleted_at"]);
    write(
      "bad/0001.sql",
      "CREATE TABLE a (id int);\nALTER TABLE a SET SCHEMA other;\n",
    );
    const refused = await read({
      reader: "schema",
      format: "sql",
      files: "bad/*.sql",
    });
    expect(refused.ok).toBe(false);
  });

  test("Prisma models, mapped names and relations", async () => {
    write(
      "prisma/schema.prisma",
      [
        "model User {",
        "  id    String @id",
        "  email String?",
        '  orgId String @map("org_id")',
        "  org   Org    @relation(fields: [orgId], references: [id], onDelete: Cascade)",
        '  @@map("users")',
        "}",
        "model Org {",
        "  id    String @id",
        "  users User[]",
        "}",
      ].join("\n"),
    );
    const result = await read({
      reader: "schema",
      format: "prisma",
      file: "prisma/schema.prisma",
      select: "nullable_columns",
    });
    if (!result.ok) throw new Error(result.reason);
    expect(result.model.members).toEqual(["users.email"]);
    expect(
      await members({
        reader: "schema",
        format: "prisma",
        file: "prisma/schema.prisma",
        select: "foreign_keys",
      }),
    ).toEqual(["users.org_id->Org.id on delete cascade"]);
  });

  test("OpenAPI operations and the ones with no security", async () => {
    write(
      "openapi.yaml",
      [
        "openapi: 3.0.0",
        "security: [{ bearer: [] }]",
        "paths:",
        "  /invoices:",
        "    get: { operationId: listInvoices, responses: { '200': {} } }",
        "    post: { operationId: createInvoice, security: [], responses: { '201': {} } }",
        "components: { securitySchemes: { bearer: { type: http } } }",
      ].join("\n"),
    );
    expect(await members({ reader: "openapi", file: "openapi.yaml" })).toEqual([
      "GET /invoices",
      "POST /invoices",
    ]);
    expect(
      await members({
        reader: "openapi",
        file: "openapi.yaml",
        select: "unsecured_operations",
      }),
    ).toEqual(["POST /invoices"]);
    expect(
      await members({
        reader: "openapi",
        file: "openapi.yaml",
        select: "security_schemes",
      }),
    ).toEqual(["bearer"]);
  });
});

describe("references the code makes", () => {
  test("TypeScript env, imports, thrown errors, string arguments and properties", async () => {
    write(
      "src/config.ts",
      [
        'import { z } from "zod";',
        "const url = process.env.DATABASE_URL;",
        "const { PORT, HOST: host } = process.env;",
        'const key = import.meta.env["VITE_KEY"];',
        'if (!url) throw new ConfigError("missing");',
        'track("signup"); analytics.track("login");',
        'export const errors = { code: "E_LIMIT" };',
        "try { url } catch (error) { throw error; }",
      ].join("\n"),
    );
    expect(
      await members({
        reader: "references",
        files: "src/config.ts",
        extract: "env",
      }),
    ).toEqual(["DATABASE_URL", "HOST", "PORT", "VITE_KEY"]);
    expect(
      await members({
        reader: "references",
        files: "src/config.ts",
        extract: "imports",
      }),
    ).toEqual(["zod"]);
    expect(
      await members({
        reader: "references",
        files: "src/config.ts",
        extract: "thrown",
      }),
    ).toEqual(["ConfigError"]);
    expect(
      await members({
        reader: "references",
        files: "src/config.ts",
        extract: "string_args",
        callee: "track",
      }),
    ).toEqual(["login", "signup"]);
    expect(
      await members({
        reader: "references",
        files: "src/config.ts",
        extract: "property",
        key: "code",
      }),
    ).toEqual(["E_LIMIT"]);
  });

  test("a reference Kibi cannot read statically refuses the read with its place", async () => {
    write(
      "src/dynamic.ts",
      "const name = 'X';\nexport const value = process.env[name];\n",
    );
    const result = await read({
      reader: "references",
      files: "src/dynamic.ts",
      extract: "env",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("src/dynamic.ts:2");
  });

  test("Python env and imports", async () => {
    write(
      "app/settings.py",
      'import os\nfrom .db import engine\nSECRET = os.getenv("SECRET_KEY")\nTOKEN = os.environ["API_TOKEN"]\n',
    );
    expect(
      await members({
        reader: "references",
        files: "app/*.py",
        extract: "env",
      }),
    ).toEqual(["API_TOKEN", "SECRET_KEY"]);
    expect(
      await members({
        reader: "references",
        files: "app/*.py",
        extract: "imports",
      }),
    ).toEqual([".db", "os"]);
  });
});

describe("readers that load a module", () => {
  test("a drizzle schema's tables, nullable columns and foreign keys", async () => {
    // A minimal drizzle-orm stand-in with the runtime shape Kibi reads.
    write(
      "node_modules/drizzle-orm/package.json",
      JSON.stringify({
        name: "drizzle-orm",
        type: "module",
        exports: { "./sqlite-core": "./sqlite-core.js" },
      }),
    );
    write(
      "node_modules/drizzle-orm/sqlite-core.js",
      [
        'const S = (name) => Symbol.for("drizzle:" + name);',
        "export function table(name, columns, fks = []) {",
        "  const t = { [S('IsDrizzleTable')]: true, [S('Name')]: name, [S('Columns')]: columns, [S('SQLiteInlineForeignKeys')]: fks };",
        "  return t;",
        "}",
        "export function getTableConfig(t) {",
        "  return { name: t[S('Name')], columns: Object.values(t[S('Columns')]), foreignKeys: t[S('SQLiteInlineForeignKeys')] };",
        "}",
      ].join("\n"),
    );
    write(
      "db/schema.mjs",
      [
        'import { table } from "drizzle-orm/sqlite-core";',
        'export const orgs = table("organizations", { id: { name: "id", notNull: true }, deletedAt: { name: "deleted_at", notNull: false } });',
        'export const members = table("members", { id: { name: "id", notNull: true }, orgId: { name: "organization_id", notNull: true } },',
        '  [{ onDelete: "cascade", reference: () => ({ columns: [{ name: "organization_id" }], foreignTable: orgs, foreignColumns: [{ name: "id" }] }) }]);',
        "export const notATable = 1;",
      ].join("\n"),
    );
    expect(
      await members({
        reader: "schema",
        format: "drizzle",
        file: "db/schema.mjs",
      }),
    ).toEqual(["members", "organizations"]);
    expect(
      await members({
        reader: "schema",
        format: "drizzle",
        file: "db/schema.mjs",
        select: "nullable_columns",
      }),
    ).toEqual(["organizations.deleted_at"]);
    expect(
      await members({
        reader: "schema",
        format: "drizzle",
        file: "db/schema.mjs",
        select: "foreign_keys",
      }),
    ).toEqual(["members.organization_id->organizations.id on delete cascade"]);
  });

  test("a Hono route table and the middleware before each route", async () => {
    write(
      "web/hono.mjs",
      [
        "export async function requireAuth(c, next) { return next(); }",
        "export const requireMembership = async (c, next) => next();",
        "const handler = () => null;",
        "export const app = { fetch() {}, routes: [",
        '  { method: "GET", path: "/health", handler },',
        '  { method: "ALL", path: "/api/*", handler: requireAuth },',
        '  { method: "ALL", path: "/api/orgs/*", handler: requireMembership },',
        '  { method: "GET", path: "/api/orgs/:id/members", handler },',
        '  { method: "POST", path: "/api/orgs/:id/invites", handler: requireAuth },',
        '  { method: "POST", path: "/api/orgs/:id/invites", handler },',
        '  { method: "GET", path: "/api/me", handler },',
        "] };",
      ].join("\n"),
    );
    const result = await read({
      reader: "routes",
      file: "web/hono.mjs",
      export: "app",
      names_from: ["web/hono.mjs"],
      path_prefix: "/api/orgs",
    });
    if (!result.ok) throw new Error(result.reason);
    expect(result.model.members).toEqual([
      "GET /api/orgs/:id/members",
      "POST /api/orgs/:id/invites",
    ]);
    expect(
      result.model.routes?.find((route) => route.method === "GET")?.middleware,
    ).toEqual(["requireAuth", "requireMembership"]);
    const health = await read({
      reader: "routes",
      file: "web/hono.mjs",
      export: "app",
      select: "middleware",
    });
    if (!health.ok) throw new Error(health.reason);
    expect(health.model.members).not.toContain("GET /health requireAuth");
  });

  test("an Express app with a mounted router", async () => {
    write(
      "web/express.cjs",
      [
        "function layer(name, handle, path, extra = {}) {",
        "  return { name, handle, ...extra, match: (p) => p === path || p.startsWith(path === '/' ? '/' : path + '/') };",
        "}",
        "function requireAuth(req, res, next) { next(); }",
        "const members = function members(req, res) {};",
        "const router = { stack: [ { route: { path: '/:id/members', methods: { get: true }, stack: [ { name: 'members', handle: members } ] }, match: () => false } ] };",
        "const routerLayer = layer('router', router, '/api/orgs', { regexp: /^\\/api\\/orgs\\/?(?=\\/|$)/i });",
        "const app = function app() {};",
        "app.use = () => app; app.handle = () => {};",
        "app._router = { stack: [ layer('query', () => {}, '/'), layer('requireAuth', requireAuth, '/api'), routerLayer ] };",
        "module.exports = { app };",
      ].join("\n"),
    );
    const result = await read({
      reader: "routes",
      file: "web/express.cjs",
      export: "app",
      select: "middleware",
    });
    if (!result.ok) throw new Error(result.reason);
    expect(result.model.members).toEqual([
      "GET /api/orgs/:id/members requireAuth",
    ]);
  });

  test("a zod object's required, optional and nullable fields", async () => {
    write(
      "web/schema.mjs",
      [
        'import { z } from "zod";',
        "export const Invoice = z.object({ id: z.string(), note: z.string().optional(), paidAt: z.string().nullable() }).refine(() => true);",
      ].join("\n"),
    );
    expect(
      await members({
        reader: "validator",
        file: "web/schema.mjs",
        export: "Invoice",
        select: "required_fields",
      }),
    ).toEqual(["id"]);
    const result = await read({
      reader: "validator",
      file: "web/schema.mjs",
      export: "Invoice",
    });
    if (!result.ok) throw new Error(result.reason);
    expect(
      result.model.entities?.[0]?.columns.find(
        (column) => column.name === "paidAt",
      ),
    ).toEqual({
      name: "paidAt",
      optional: false,
      nullable: true,
    });
  });
});

describe("source dependencies stale a receipt", () => {
  test("a file's contents and a glob's matches enter the binding", () => {
    const spec = { reader: "glob", pattern: "migrations/*.sql" } as SourceSpec;
    const before = sourceDependencies(root, spec);
    write("migrations/0003_more.sql", "CREATE TABLE extra (id int);\n");
    expect(sourceDependencies(root, spec)).not.toEqual(before);
    const schema = {
      reader: "schema",
      format: "drizzle",
      file: "db/schema.mjs",
    } as SourceSpec;
    const ids = sourceDependencies(root, schema).map((row) => row.id);
    expect(ids).toContain("source-file:db/schema.mjs");
  });
});

type ModelAnswer = { ok?: boolean; reason?: string };

describe("model_check.pl decides source and temporal obligations", () => {
  const certificate = {
    version: "kibi.code-certificate.v1",
    kind: "source",
    test_id: "TEST-S",
    source: { reader: "schema" },
    model: {
      members: ["DATABASE_URL", "PORT"],
      entities: [
        {
          name: "users",
          columns: [
            { name: "id", nullable: false, optional: false },
            { name: "deleted_at", nullable: true, optional: false },
          ],
          foreign_keys: [],
        },
      ],
      routes: [
        { method: "GET", path: "/a", middleware: ["requireAuth"] },
        { method: "GET", path: "/b", middleware: [] },
      ],
    },
  };
  const machine = {
    machine: {
      symbol_id: "SYM-M",
      states: ["draft", "approved", "paid", "cancelled"],
      transitions: [
        ["draft", "approved"],
        ["approved", "paid"],
        ["draft", "cancelled"],
      ],
    },
  };

  test("set relations, fields, middleware, reachable pairs and waypoints", () => {
    const cases = [
      {
        kind: "source",
        obligation: {
          kind: "set_relation",
          operator: "subset_of",
          members: ["DATABASE_URL", "PORT", "SECRET"],
        },
      },
      {
        kind: "source",
        obligation: {
          kind: "set_relation",
          operator: "excludes",
          members: ["PORT"],
        },
      },
      {
        kind: "source",
        obligation: {
          kind: "set_relation",
          operator: "includes",
          members: ["SECRET"],
        },
      },
      {
        kind: "source",
        obligation: { kind: "required_fields", members: ["id"] },
      },
      {
        kind: "source",
        obligation: { kind: "required_fields", members: ["deleted_at"] },
      },
      {
        kind: "source",
        obligation: { kind: "nullable_fields", members: ["users.deleted_at"] },
      },
      {
        kind: "source",
        obligation: {
          kind: "route_middleware",
          operator: "includes",
          members: ["requireAuth"],
        },
      },
      {
        kind: "state_machine",
        obligation: {
          kind: "machine_relation",
          projection: "reachable_pairs",
          operator: "excludes",
          members: ["cancelled->paid"],
        },
      },
      {
        kind: "state_machine",
        obligation: {
          kind: "machine_relation",
          projection: "reachable_pairs",
          operator: "excludes",
          members: ["draft->paid"],
        },
      },
      {
        kind: "state_machine",
        obligation: {
          kind: "machine_relation",
          projection: "required_waypoints",
          operator: "includes",
          members: ["draft->paid via approved"],
        },
      },
      {
        kind: "state_machine",
        obligation: {
          kind: "machine_relation",
          projection: "required_waypoints",
          operator: "includes",
          members: ["draft->cancelled via approved"],
        },
      },
    ].map((row) => ({
      ...row,
      certificate: row.kind === "source" ? certificate : machine,
    }));
    const answers = prologCases<ModelAnswer>(
      "model_check.pl",
      "atom_string(K, Case.kind), model_check:model_check_obligation(K, Case.obligation, Case.certificate, Result), (Result == ok -> Out = _{ok: true} ; Result = problem(Reason), Out = _{ok: false, reason: Reason})",
      cases,
    );
    expect(answers.map((answer) => answer.ok ?? false)).toEqual([
      true,
      false,
      false,
      true,
      false,
      true,
      false,
      true,
      false,
      true,
      false,
    ]);
    expect(answers[1]?.reason).toContain(
      "include PORT, which the fact excludes",
    );
    expect(answers[4]?.reason).toBe(
      "users.deleted_at is nullable, not required",
    );
    expect(answers[6]?.reason).toBe(
      "the middleware of GET /b do not include requireAuth",
    );
    expect(answers[10]?.reason).toContain("without passing through approved");
  });

  test("subset_of and excludes set facts conflict with eq and includes only when they disagree", () => {
    const answers = prologCases<{ conflict: boolean }>(
      "kb.pl",
      `atom_string(A, Case.a_op), atom_string(B, Case.b_op),
       ( kb:values_conflict(A, Case.a, B, Case.b, set)
       -> Out = _{conflict: true} ; Out = _{conflict: false} )`,
      [
        { a_op: "subset_of", a: ["a", "b"], b_op: "eq", b: ["a"] },
        { a_op: "subset_of", a: ["a", "b"], b_op: "includes", b: ["c"] },
        { a_op: "excludes", a: ["x"], b_op: "includes", b: ["a"] },
        { a_op: "excludes", a: ["x"], b_op: "eq", b: ["a", "x"] },
      ],
    );
    expect(answers.map((answer) => answer.conflict)).toEqual([
      false,
      true,
      false,
      true,
    ]);
  });
});

describe("the advisor names set claims a source or state_machine proof decides", () => {
  const claim = (text: string) => {
    const suggestion = detectStrictSuggestion({ semantic_text: text }, text);
    return suggestion?.kind === "strict_property" ? suggestion.claim : null;
  };
  test("middleware, fields, reachability, waypoints, subsets and exclusions", () => {
    expect(
      claim(
        "Every route under /api/orgs must use requireAuth and requireMembership.",
      ),
    ).toMatchObject({
      property_key: "middleware",
      operator: "includes",
      value_set: ["requireAuth", "requireMembership"],
    });
    expect(
      claim("Every table must have id, created_at and updated_at."),
    ).toMatchObject({
      property_key: "required_fields",
      value_set: ["created_at", "id", "updated_at"],
    });
    expect(claim("A cancelled invoice can never become paid.")).toMatchObject({
      property_key: "reachable_pairs",
      operator: "excludes",
      value_set: ["cancelled->paid"],
    });
    expect(
      claim("Every path from draft to paid must pass through approved."),
    ).toMatchObject({
      property_key: "required_waypoints",
      value_set: ["draft->paid via approved"],
    });
    expect(
      claim(
        "Every environment variable the app reads must be one of DATABASE_URL, PORT or SECRET.",
      ),
    ).toMatchObject({
      operator: "subset_of",
    });
    expect(claim("The web app must never import node:fs.")).toMatchObject({
      property_key: "imports",
      operator: "excludes",
      value_set: ["node:fs"],
    });
    expect(
      claim("The deleted_at column of organizations must be nullable."),
    ).toMatchObject({
      property_key: "nullable_fields",
      value_set: ["deleted_at"],
    });
  });
});
