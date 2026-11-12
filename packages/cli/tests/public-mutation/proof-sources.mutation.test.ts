import { afterEach, describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  REFERENCE_EXTRACTS,
  SOURCE_READERS,
  type SourceCodeEvaluator,
  type SourceSpec,
  describeSource,
  importClosure,
  matchWorkspaceFiles,
  normalizeSourceSpec,
  readSource,
  selectedEntities,
  selectedRoutes,
  sourceDependencies,
  sourceSpecErrors,
  unresolvedReason,
} from "../../src/public/proof-sources.js";
import { expectGolden } from "./helpers/golden.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function workspace(files: Record<string, string> = {}): string {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "kibi-sources-")));
  roots.push(root);
  for (const [file, contents] of Object.entries(files))
    write(root, file, contents);
  return root;
}

function write(root: string, file: string, contents: string): void {
  mkdirSync(join(root, file, ".."), { recursive: true });
  writeFileSync(join(root, file), contents);
}

const spec = (value: Record<string, unknown>) => value as SourceSpec;

describe("source vocabulary", () => {
  test("pins readers and extracts", () => {
    expect([...SOURCE_READERS]).toEqual([
      "json",
      "yaml",
      "glob",
      "openapi",
      "references",
      "schema",
      "routes",
      "validator",
      "prolog",
    ]);
    expect([...REFERENCE_EXTRACTS]).toEqual([
      "env",
      "imports",
      "calls",
      "string_args",
      "thrown",
      "property",
    ]);
  });
});

describe("sourceSpecErrors", () => {
  test("reports each malformed field", () => {
    const cases: Record<string, unknown> = {
      null: null,
      array: [{ reader: "json" }],
      noReader: {},
      badReader: { reader: "csv" },
      jsonValid: {
        reader: "json",
        file: "a.json",
        path: "a.b",
        select: "items",
        field: "id",
      },
      jsonMissingFile: { reader: "json" },
      jsonUnknownKeys: {
        reader: "json",
        file: "a.json",
        pattern: "x",
        ignore: [],
      },
      jsonAbsolute: { reader: "json", file: "/etc/a.json" },
      jsonParent: { reader: "json", file: "a/../../b.json" },
      jsonBackslashParent: { reader: "yaml", file: "a\\..\\b.yaml" },
      jsonDotted: { reader: "json", file: "a..b.json" },
      jsonBlankFile: { reader: "json", file: " " },
      jsonNumberFile: { reader: "json", file: 3 },
      jsonBadPath: { reader: "json", file: "a.json", path: 3 },
      jsonEmptyPath: { reader: "json", file: "a.json", path: "" },
      jsonBlankField: { reader: "json", file: "a.json", field: " " },
      jsonFieldOnKeys: {
        reader: "json",
        file: "a.json",
        field: "id",
        select: "keys",
      },
      jsonFieldNoSelect: { reader: "json", file: "a.json", field: "id" },
      jsonBadSelect: { reader: "json", file: "a.json", select: "rows" },
      jsonSelectValues: { reader: "yaml", file: "a.yaml", select: "values" },
      yamlItemsField: {
        reader: "yaml",
        file: "a.yaml",
        select: "items",
        field: "id",
      },
      routesSelectRoutes: {
        reader: "routes",
        file: "a.ts",
        export: "app",
        select: "routes",
      },
      prologObjectFunctor: {
        reader: "prolog",
        file: "k.pl",
        functor: { toString: () => "r/1" },
      },
      jsonFieldOnValues: {
        reader: "json",
        file: "a.json",
        field: "id",
        select: "values",
      },
      globValid: {
        reader: "glob",
        pattern: ["a/*.md", "b/**"],
        ignore: "x/**",
        capture: true,
      },
      globMissing: { reader: "glob" },
      globEmptyList: { reader: "glob", pattern: [] },
      globBlank: { reader: "glob", pattern: ["a", " "] },
      globAbsolute: { reader: "glob", pattern: "/a/*" },
      globParentInList: { reader: "glob", pattern: ["a/*", "../b"] },
      globNumber: { reader: "glob", pattern: 3 },
      globBadIgnore: { reader: "glob", pattern: "a", ignore: ["../x"] },
      globBadCapture: { reader: "glob", pattern: "a", capture: "yes" },
      globCaptureFalse: { reader: "glob", pattern: "a", capture: false },
      globSelect: { reader: "glob", pattern: "a", select: "keys" },
      openapiValid: { reader: "openapi", file: "o.yaml", select: "responses" },
      openapiMissing: { reader: "openapi" },
      openapiBadSelect: { reader: "openapi", file: "o.yaml", select: "keys" },
      referencesValid: {
        reader: "references",
        files: "src/**",
        extract: "env",
      },
      referencesMissing: { reader: "references" },
      referencesBadExtract: {
        reader: "references",
        files: "s",
        extract: "magic",
      },
      referencesStringArgs: {
        reader: "references",
        files: "s",
        extract: "string_args",
      },
      referencesStringArgsCallee: {
        reader: "references",
        files: "s",
        extract: "string_args",
        callee: "t",
      },
      referencesBlankCallee: {
        reader: "references",
        files: "s",
        extract: "calls",
        callee: " ",
      },
      referencesCallee: {
        reader: "references",
        files: "s",
        extract: "calls",
        callee: "fetch",
      },
      referencesProperty: {
        reader: "references",
        files: "s",
        extract: "property",
      },
      referencesPropertyKey: {
        reader: "references",
        files: "s",
        extract: "property",
        key: "id",
      },
      referencesKeyElsewhere: {
        reader: "references",
        files: "s",
        extract: "env",
        key: "id",
      },
      referencesBadIgnore: {
        reader: "references",
        files: "s",
        extract: "env",
        ignore: 3,
      },
      referencesSelect: {
        reader: "references",
        files: "s",
        extract: "env",
        select: "x",
      },
      schemaBadFormat: { reader: "schema", file: "s.ts" },
      schemaDrizzle: {
        reader: "schema",
        format: "drizzle",
        file: "s.ts",
        exports: ["users"],
        table: "u*",
        select: "columns",
      },
      schemaDrizzleFiles: {
        reader: "schema",
        format: "drizzle",
        file: "s.ts",
        files: "x",
      },
      schemaDrizzleNoFile: { reader: "schema", format: "drizzle" },
      schemaPrisma: { reader: "schema", format: "prisma", file: "s.prisma" },
      schemaPrismaExports: {
        reader: "schema",
        format: "prisma",
        file: "s.prisma",
        exports: ["a"],
      },
      schemaBadExports: {
        reader: "schema",
        format: "drizzle",
        file: "s.ts",
        exports: [],
      },
      schemaSql: { reader: "schema", format: "sql", files: ["m/*.sql"] },
      schemaSqlNoFiles: { reader: "schema", format: "sql" },
      schemaSqlFile: {
        reader: "schema",
        format: "sql",
        files: "m",
        file: "a.sql",
      },
      schemaBlankTable: {
        reader: "schema",
        format: "sql",
        files: "m",
        table: "",
      },
      schemaBadSelect: {
        reader: "schema",
        format: "sql",
        files: "m",
        select: "fields",
      },
      routesValid: {
        reader: "routes",
        file: "app.ts",
        export: "app",
        framework: "hono",
        path_prefix: "/api",
        names_from: ["mw.ts"],
        select: "middleware",
      },
      routesExpress: {
        reader: "routes",
        file: "app.ts",
        export: "app",
        framework: "express",
      },
      routesMissing: { reader: "routes" },
      routesBadFramework: {
        reader: "routes",
        file: "app.ts",
        export: "app",
        framework: "koa",
      },
      routesBadPrefix: {
        reader: "routes",
        file: "app.ts",
        export: "app",
        path_prefix: "api",
      },
      routesBlankPrefix: {
        reader: "routes",
        file: "app.ts",
        export: "app",
        path_prefix: " ",
      },
      routesBadNames: {
        reader: "routes",
        file: "app.ts",
        export: "app",
        names_from: "mw.ts",
      },
      routesParentNames: {
        reader: "routes",
        file: "app.ts",
        export: "app",
        names_from: ["ok.ts", "../mw.ts"],
      },
      validatorValid: {
        reader: "validator",
        file: "v.ts",
        export: "User",
        select: "optional_fields",
      },
      validatorMissing: { reader: "validator" },
      validatorBadSelect: {
        reader: "validator",
        file: "v.ts",
        export: "User",
        select: "columns",
      },
      prologValid: {
        reader: "prolog",
        file: "k.pl",
        functor: "requires/1",
        arg: 1,
      },
      prologArity: { reader: "prolog", file: "k.pl", functor: "edge_Of2/12" },
      prologZero: { reader: "prolog", file: "k.pl", functor: "fact/0" },
      prologMissing: { reader: "prolog" },
      prologUpper: { reader: "prolog", file: "k.pl", functor: "Requires/1" },
      prologLeadingZero: { reader: "prolog", file: "k.pl", functor: "r/01" },
      prologNoArity: { reader: "prolog", file: "k.pl", functor: "r" },
      prologPrefix: { reader: "prolog", file: "k.pl", functor: " r/1" },
      prologSuffix: { reader: "prolog", file: "k.pl", functor: "r/1 " },
      prologNumber: { reader: "prolog", file: "k.pl", functor: 1 },
      prologBadArg: { reader: "prolog", file: "k.pl", functor: "r/1", arg: 0 },
      prologFractionArg: {
        reader: "prolog",
        file: "k.pl",
        functor: "r/1",
        arg: 1.5,
      },
      prologSelect: {
        reader: "prolog",
        file: "k.pl",
        functor: "r/1",
        select: "keys",
      },
    };
    expectGolden(
      "proof-sources-spec-errors",
      Object.fromEntries(
        Object.entries(cases).map(([name, value]) => [
          name,
          sourceSpecErrors(value, "s"),
        ]),
      ),
    );
  });
});

describe("normalizeSourceSpec and describeSource", () => {
  test("keeps the reader's keys", () => {
    expect(normalizeSourceSpec(null)).toBeUndefined();
    expect(normalizeSourceSpec([])).toBeUndefined();
    expect(normalizeSourceSpec({ reader: "csv" })).toBeUndefined();
    expect(
      normalizeSourceSpec({
        reader: "json",
        file: "a",
        extra: 1,
        path: undefined,
      }),
    ).toStrictEqual({ reader: "json", file: "a" });
  });

  test("describes each reader", () => {
    expectGolden(
      "proof-sources-describe",
      [
        { reader: "json", file: "a.json" },
        { reader: "yaml", file: "a.yaml", path: "x.y", field: "id" },
        { reader: "openapi", file: "o.yaml" },
        { reader: "glob", pattern: ["a/*", "b/*"] },
        { reader: "glob", pattern: "a/*" },
        { reader: "references", extract: "env", files: "src/**" },
        { reader: "schema", format: "sql", files: ["m/*.sql", "n/*.sql"] },
        { reader: "schema", format: "drizzle", file: "s.ts", table: "u*" },
        { reader: "routes", export: "app", file: "a.ts" },
        { reader: "routes", export: "app", file: "a.ts", path_prefix: "/api" },
        { reader: "validator", export: "User", file: "v.ts" },
        { reader: "prolog", functor: "r/1", file: "k.pl" },
        { reader: "prolog", functor: "r/2", file: "k.pl", arg: 2 },
      ].map((value) => describeSource(spec(value))),
    );
  });

  test("names the first five unresolved references", () => {
    const row = (line: number) => ({ file: "a.ts", line, text: `x${line}` });
    expect(unresolvedReason("env reads", [row(1)])).toBe(
      "Kibi cannot read 1 env reads statically, so the set is not known exactly: a.ts:1 x1",
    );
    expect(unresolvedReason("calls", [1, 2, 3, 4, 5].map(row))).toBe(
      "Kibi cannot read 5 calls statically, so the set is not known exactly: a.ts:1 x1; a.ts:2 x2; a.ts:3 x3; a.ts:4 x4; a.ts:5 x5",
    );
    expect(unresolvedReason("calls", [1, 2, 3, 4, 5, 6].map(row))).toBe(
      "Kibi cannot read 6 calls statically, so the set is not known exactly: a.ts:1 x1; a.ts:2 x2; a.ts:3 x3; a.ts:4 x4; a.ts:5 x5; ...",
    );
  });
});

describe("selectedRoutes and selectedEntities", () => {
  test("filters routes by prefix", () => {
    const route = (path: string) => ({ method: "GET", path, middleware: [] });
    const routes = ["/api", "/api/x", "/apix", "/other"].map(route);
    const paths = (prefix: unknown) =>
      selectedRoutes(
        spec({ reader: "routes", path_prefix: prefix }),
        routes,
      ).map((row) => row.path);
    expect(paths(undefined)).toEqual(["/api", "/api/x", "/apix", "/other"]);
    expect(paths("/api")).toEqual(["/api", "/api/x"]);
    expect(paths("/api//")).toEqual(["/api", "/api/x"]);
    expect(paths("/")).toEqual(["/api", "/api/x", "/apix", "/other"]);
  });

  test("filters entities by table glob", () => {
    const entity = (name: string) => ({ name, columns: [], foreign_keys: [] });
    const model = {
      members: [],
      entities: ["users", "user_roles", "u.x", "posts", "ux"].map(entity),
    };
    const names = (table: unknown) =>
      selectedEntities(spec({ reader: "schema", table }), model).map(
        (row) => row.name,
      );
    expect(names(undefined)).toHaveLength(5);
    expect(names("*")).toHaveLength(5);
    expect(names("user*")).toEqual(["users", "user_roles"]);
    expect(names("u.x")).toEqual(["u.x"]);
    expect(names("u?x")).toEqual(["u.x"]);
    expect(names("sers")).toEqual([]);
    expect(names("user")).toEqual([]);
    expect(
      selectedEntities(spec({ reader: "schema" }), { members: [] }),
    ).toEqual([]);
  });
});

async function readAll(
  root: string,
  cases: Record<string, Record<string, unknown>>,
  evaluate?: SourceCodeEvaluator,
): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(cases))
    out[name] = await readSource(root, spec(value), evaluate);
  return out;
}

describe("readSource documents", () => {
  test("reads json and yaml members", async () => {
    const root = workspace({
      "a.json": JSON.stringify({
        obj: { b: 1, a: true, c: "x" },
        list: ["b", "a", "b", 2],
        steps: [{ name: "s1" }, { other: 1 }, { name: "s0" }, 3],
        "a/b": { "c~d": ["deep"] },
        nested: [{ x: 1 }],
        nothing: null,
        scalar: 42,
        big: { n: 1 },
      }),
      "b.yml": "k: [1, 2]\n",
      "c.yaml": "a: [\n",
      "d.json": "{oops",
      "e.json": '"text"',
      "dir/x.json": "{}",
    });
    const json = (extra: Record<string, unknown>) => ({
      reader: "json",
      file: "a.json",
      ...extra,
    });
    expectGolden(
      "proof-sources-read-documents",
      await readAll(root, {
        invalid: { reader: "json" },
        missing: { reader: "json", file: "nope.json" },
        directory: { reader: "json", file: "dir" },
        parseJson: { reader: "json", file: "d.json" },
        parseYaml: { reader: "yaml", file: "c.yaml" },
        ymlAsJson: { reader: "json", file: "b.yml", path: "k" },
        rootKeys: json({}),
        rootSlash: json({ path: "/" }),
        rootBlank: json({ path: "  " }),
        objKeys: json({ path: "obj" }),
        objValues: json({ path: "obj", select: "values" }),
        objItems: json({ path: "obj", select: "items" }),
        list: json({ path: "list" }),
        listIndex: json({ path: "list.1" }),
        listPointer: json({ path: "/list/0" }),
        listKeys: json({ path: "list", select: "keys" }),
        listBadIndex: json({ path: "list.x" }),
        listOutOfRange: json({ path: "list.9" }),
        pointerEscapes: json({ path: "/a~1b/c~0d" }),
        dottedMissing: json({ path: "obj.zz" }),
        scalarPath: json({ path: "scalar.x" }),
        steps: json({ path: "steps", field: "name" }),
        fieldOnObject: json({ path: "obj", field: "name" }),
        fieldOnRootObject: json({ field: "name" }),
        nested: json({ path: "nested" }),
        nothing: json({ path: "nothing" }),
        nothingRoot: {
          reader: "json",
          file: "a.json",
          path: "nothing",
          select: "items",
        },
        scalar: json({ path: "scalar" }),
        text: { reader: "json", file: "e.json" },
        listKeysRoot: {
          reader: "json",
          file: "a.json",
          path: "/list",
          select: "keys",
        },
        listNoPath: {
          reader: "yaml",
          file: "b.yml",
          select: "keys",
          path: "k",
        },
        objItemsNoPath: json({ select: "items" }),
        objNestedValues: json({ select: "values" }),
      }),
    );
  });

  test("reads globs", async () => {
    const root = workspace({
      "docs/a.md": "",
      "docs/sub/b.md": "",
      "docs/sub/deep/c.md": "",
      "docs/x1.txt": "",
      ".git/g.md": "",
      "docs/.hidden.md": "",
      "node_modules/p/d.md": "",
      ".kb/e.md": "",
      "skip/f.md": "",
    });
    mkdirSync(join(root, "docs/folder.md"));
    symlinkSync(join(root, "docs/a.md"), join(root, "docs/link.md"));
    symlinkSync(join(root, "missing.md"), join(root, "docs/dangling.md"));
    symlinkSync(join(root, "docs/sub"), join(root, "docs/linkdir"));
    expectGolden(
      "proof-sources-read-globs",
      await readAll(root, {
        none: { reader: "glob", pattern: ["nothing/*", "none/*"] },
        plain: { reader: "glob", pattern: "**/*.md", ignore: "skip/**" },
        list: { reader: "glob", pattern: ["docs/*.md", "docs/x?.txt"] },
        captureStar: { reader: "glob", pattern: "docs/*.md", capture: true },
        captureGlobstar: {
          reader: "glob",
          pattern: "docs/**/*.md",
          capture: true,
        },
        captureTail: { reader: "glob", pattern: "docs/sub/**", capture: true },
        captureQuestion: {
          reader: "glob",
          pattern: "docs/x?.txt",
          capture: true,
        },
        captureList: {
          reader: "glob",
          pattern: ["docs/sub/*.md", "docs/*.md"],
          capture: true,
        },
        captureBraces: {
          reader: "glob",
          pattern: "docs/{a,link}.md",
          capture: true,
        },
        captureLiteral: { reader: "glob", pattern: "docs/a.md", capture: true },
        captureEmptyParts: {
          reader: "glob",
          pattern: "docs/*x1*.txt",
          capture: true,
        },
        captureEscapes: {
          reader: "glob",
          pattern: "docs/x1.txt",
          capture: true,
        },
      }),
    );
    expect(matchWorkspaceFiles(root, ["docs/A*.md"])).toEqual([]);
    expect(matchWorkspaceFiles(root, ["docs/A*.md"], [], false)).toEqual([
      "docs/a.md",
    ]);
    expect(matchWorkspaceFiles(root, ["docs/*.md"], ["docs/l*"])).toEqual([
      "docs/.hidden.md",
      "docs/a.md",
    ]);
  });

  test("reads OpenAPI documents", async () => {
    const root = workspace({
      "v3.json": JSON.stringify({
        openapi: "3.1.0",
        security: [{ key: [] }],
        components: { securitySchemes: { key: {}, bearer: {} } },
        paths: {
          "/b": {
            get: { responses: { 200: {}, 404: {} } },
            post: { security: [] },
            put: { security: [{}, { key: [] }] },
            delete: { security: [{ key: [] }] },
            trace: {},
            options: {},
            head: {},
            patch: {},
            parameters: [{}],
            query: {},
          },
          "/a": { get: { security: "none" } },
          "/c": "x",
        },
      }),
      "v2.yaml":
        "swagger: '2.0'\nsecurityDefinitions:\n  basic: {}\npaths:\n  /x:\n    get:\n      responses:\n        '201': {}\n",
      "bare.json": JSON.stringify({ openapi: "3.0.0" }),
      "list.json": "[]",
      "other.json": JSON.stringify({ info: {} }),
      "unsecured.json": JSON.stringify({
        openapi: "3.0.0",
        security: [{}],
        paths: { "/z": { get: {}, post: { security: [{ k: [] }] } } },
      }),
    });
    const api = (file: string, select?: string) => ({
      reader: "openapi",
      file,
      ...(select === undefined ? {} : { select }),
    });
    expectGolden(
      "proof-sources-read-openapi",
      await readAll(root, {
        missing: api("nope.json"),
        list: api("list.json"),
        other: api("other.json"),
        operations: api("v3.json"),
        responses: api("v3.json", "responses"),
        unsecured: api("v3.json", "unsecured_operations"),
        schemes: api("v3.json", "security_schemes"),
        v2Operations: api("v2.yaml", "operations"),
        v2Responses: api("v2.yaml", "responses"),
        v2Schemes: api("v2.yaml", "security_schemes"),
        v2Unsecured: api("v2.yaml", "unsecured_operations"),
        bareSchemes: api("bare.json", "security_schemes"),
        bareOperations: api("bare.json"),
        rootUnsecured: api("unsecured.json", "unsecured_operations"),
      }),
    );
  });
});

describe("readSource schemas", () => {
  const SQL = `
-- users table; with a comment
CREATE TABLE IF NOT EXISTS "public"."users" (
  id serial PRIMARY KEY,
  "email" text NOT NULL,
  [nick] text,
  \`org_id\` int REFERENCES orgs (id) ON DELETE SET NULL,
  team_id int CONSTRAINT users_team_fk REFERENCES teams(id),
  note text DEFAULT 'a;b,(c)',
  CONSTRAINT users_pk PRIMARY KEY (id, email),
  UNIQUE (email)
);
/* block; comment */
CREATE TEMP TABLE orgs (id int, name text NOT NULL, PRIMARY KEY (id));
CREATE UNLOGGED TABLE teams (
  id int not null,
  org int,
  FOREIGN KEY (org) REFERENCES orgs(id) ON DELETE CASCADE,
  CONSTRAINT teams_owner_fkey FOREIGN KEY (id, org) REFERENCES users (id, org_id)
);
CREATE GLOBAL TEMPORARY TABLE scratch (x int);
DO $$ BEGIN PERFORM 1; END $$;
CREATE FUNCTION f() RETURNS void AS $fn$ SELECT ';'; $fn$ LANGUAGE sql;
--> statement-breakpoint
ALTER TABLE users ADD COLUMN IF NOT EXISTS age int NOT NULL, ADD bio text;
ALTER TABLE users ALTER COLUMN nick SET NOT NULL;
ALTER TABLE users ALTER bio DROP NOT NULL;
ALTER TABLE users ALTER COLUMN age DROP NOT NULL;
ALTER TABLE users ALTER COLUMN ghost SET NOT NULL;
ALTER TABLE users RENAME COLUMN note TO memo;
ALTER TABLE users RENAME org_id TO organisation_id;
ALTER TABLE users RENAME ghost TO spirit;
ALTER TABLE users DROP COLUMN IF EXISTS bio CASCADE;
ALTER TABLE users DROP team_id;
ALTER TABLE ONLY users ADD CONSTRAINT users_age_check CHECK (age > 0);
ALTER TABLE users ADD UNIQUE (memo);
ALTER TABLE users ADD CONSTRAINT users_memo_fk FOREIGN KEY (memo) REFERENCES orgs (name) ON DELETE NO ACTION;
ALTER TABLE users DROP CONSTRAINT users_memo_fk;
ALTER TABLE users DROP CONSTRAINT IF EXISTS never_fkey;
ALTER TABLE users DROP CONSTRAINT users_pk;
ALTER TABLE users ADD PRIMARY KEY (memo);
ALTER TABLE teams DROP CONSTRAINT teams_org_fkey;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users OWNER TO admin;
ALTER TABLE elsewhere ENABLE ROW LEVEL SECURITY;
ALTER TABLE orgs RENAME TO organisations;
DROP TABLE IF EXISTS scratch, other CASCADE;
CREATE INDEX users_email ON users (email);
INSERT INTO users VALUES (1);
`;
  const sql = (files: unknown, extra: Record<string, unknown> = {}) => ({
    reader: "schema",
    format: "sql",
    files,
    ...extra,
  });

  test("replays SQL migrations", async () => {
    const root = workspace({
      "m/001.sql": SQL,
      "bad/create.sql": "CREATE TABLE weird AS SELECT 1;",
      "bad/alter.sql":
        "CREATE TABLE t (a int);\nALTER TABLE t ATTACH PARTITION p FOR VALUES IN (1);",
      "bad/before.sql": "ALTER TABLE t ADD COLUMN a int;",
      "bad/dropfk.sql":
        "CREATE TABLE t (a int);\nALTER TABLE t DROP CONSTRAINT t_a_fk;",
      "bad/dropfkey.sql":
        "CREATE TABLE t (a int);\nALTER TABLE t DROP CONSTRAINT t_a_FKEY CASCADE;",
      "ok/dropother.sql":
        "CREATE TABLE t (a int);\nALTER TABLE t DROP CONSTRAINT t_a_key;",
      "empty/a.sql": "INSERT INTO x VALUES (1);",
      "empty/b.sql": "SELECT 1;",
      "one/a.sql": "SELECT 1;",
      "neutral/a.sql":
        "CREATE TABLE n (a int, b int);\nALTER TABLE n ALTER COLUMN a SET DEFAULT 1, ALTER b TYPE bigint, ALTER COLUMN a SET DATA TYPE int, DISABLE TRIGGER ALL, SET (fillfactor=70), RESET (fillfactor), REPLICA IDENTITY FULL, SET SCHEMA s, CLUSTER ON i, INHERIT p, NO INHERIT p, VALIDATE CONSTRAINT c, RENAME CONSTRAINT c TO d, ALTER CONSTRAINT c DEFERRABLE, FORCE ROW LEVEL SECURITY, NO FORCE ROW LEVEL SECURITY, ENABLE ALWAYS TRIGGER t, ENABLE REPLICA RULE r, SET LOGGED, SET WITHOUT OIDS, SET ACCESS METHOD heap, ALTER a SET STATISTICS 5, ALTER a SET STORAGE PLAIN, ALTER a SET COMPRESSION lz4, ALTER a ADD GENERATED ALWAYS AS IDENTITY, ALTER a SET GENERATED ALWAYS, ALTER a DROP IDENTITY, ALTER a DROP EXPRESSION, ALTER a RESET (n_distinct), ALTER a SET (n_distinct=1), ALTER a OPTIONS (x 'y'), ALTER a DROP DEFAULT, SET TABLESPACE t, SET UNLOGGED, SET WITHOUT CLUSTER;",
    });
    const selects = [
      "tables",
      "columns",
      "required_columns",
      "nullable_columns",
      "foreign_keys",
    ];
    expectGolden("proof-sources-read-sql", {
      selects: Object.fromEntries(
        await Promise.all(
          selects.map(async (select) => [
            select,
            await readSource(root, spec(sql("m/*.sql", { select }))),
          ]),
        ),
      ),
      ...(await readAll(root, {
        default: sql(["m/*.sql"]),
        table: sql("m/*.sql", { table: "user*", select: "columns" }),
        noTable: sql("m/*.sql", { table: "zzz" }),
        none: sql(["none/*.sql", "nix/*.sql"]),
        badCreate: sql("bad/create.sql"),
        badAlter: sql("bad/alter.sql"),
        before: sql("bad/before.sql"),
        dropFk: sql("bad/dropfk.sql"),
        dropFkey: sql("bad/dropfkey.sql"),
        dropOther: sql("ok/dropother.sql", { select: "columns" }),
        empty: sql("empty/*.sql"),
        one: sql("one/*.sql"),
        neutral: sql("neutral/a.sql", { select: "required_columns" }),
      })),
    });
  });

  test("reads Prisma models", async () => {
    const root = workspace({
      "s.prisma": `
// a comment model Fake {
enum Role {
  ADMIN
}
type Address {
  street String
}
model User {
  id      Int      @id
  email   String?  @map("email_address")
  role    Role
  tags    String[]
  roles   Role[]
  posts   Post[]
  address Address?
  org     Org      @relation(fields: [orgId, kind], references: [id, kind], onDelete: SetNull)
  orgId   Int      @map("org_id")
  kind    String
  @@map("users")
}
model Org {
  id   Int @id
  kind String
  @@map("orgs")
}
model Post {
  id     Int  @id
  author User @relation(fields: [authorId], references: [id], onDelete: Cascade)
  authorId Int
  editor User? @relation(fields: [editorId], references: [id])
  editorId Int?
  other  User @relation("named")
}
`,
      "empty.prisma": 'datasource db { provider = "sqlite" }\n',
    });
    const prisma = (extra: Record<string, unknown> = {}) => ({
      reader: "schema",
      format: "prisma",
      file: "s.prisma",
      ...extra,
    });
    expectGolden(
      "proof-sources-read-prisma",
      await readAll(root, {
        tables: prisma(),
        columns: prisma({ select: "columns" }),
        required: prisma({ select: "required_columns" }),
        nullable: prisma({ select: "nullable_columns" }),
        foreignKeys: prisma({ select: "foreign_keys" }),
        missing: prisma({ file: "nope.prisma" }),
        empty: prisma({ file: "empty.prisma" }),
        drizzle: { reader: "schema", format: "drizzle", file: "s.ts" },
      }),
    );
  });
});

describe("readSource evaluated readers", () => {
  test("shapes what the evaluator returns", async () => {
    const root = workspace();
    const calls: string[] = [];
    const evaluate: SourceCodeEvaluator = async (workspaceRoot, value) => {
      calls.push(`${workspaceRoot === root} ${String(value.reader)}`);
      const mode = String(
        value.export ?? value.callee ?? value.extract ?? value.functor,
      );
      if (mode === "fail" || mode === "env")
        return mode === "fail"
          ? { ok: false, reason: "boom" }
          : { ok: true, members: ["B", "A", "B"] };
      if (mode === "bare") return { ok: true };
      if (mode === "r/1")
        return {
          ok: true,
          members: ["b", "a", "b"],
          sequence: ["b", "a", "b"],
        };
      if (value.reader === "routes")
        return {
          ok: true,
          routes: [
            { method: "POST", path: "/api/b", middleware: ["auth", "log"] },
            { method: "GET", path: "/api/b", middleware: [] },
            { method: "GET", path: "/api/a", middleware: ["auth"] },
            { method: "GET", path: "/z", middleware: ["auth"] },
          ],
        };
      return {
        ok: true,
        entities: [
          {
            name: "User",
            columns: [
              { name: "id", nullable: false, optional: false },
              { name: "nick", nullable: true, optional: false },
              { name: "bio", nullable: false, optional: true },
            ],
            foreign_keys: [],
          },
          { name: "Admin", columns: [], foreign_keys: [] },
        ],
      };
    };
    const routes = (extra: Record<string, unknown> = {}) => ({
      reader: "routes",
      file: "app.ts",
      export: "app",
      ...extra,
    });
    const validator = (extra: Record<string, unknown> = {}) => ({
      reader: "validator",
      file: "v.ts",
      export: "User",
      ...extra,
    });
    expectGolden("proof-sources-read-evaluated", {
      withoutEvaluator: await readAll(root, {
        routes: routes(),
        references: { reader: "references", files: "s", extract: "env" },
        drizzle: { reader: "schema", format: "drizzle", file: "s.ts" },
      }),
      ...(await readAll(
        root,
        {
          failed: routes({ export: "fail" }),
          references: { reader: "references", files: "s", extract: "env" },
          bareReferences: {
            reader: "references",
            files: "s",
            extract: "env",
            callee: "bare",
          },
          prolog: { reader: "prolog", file: "k.pl", functor: "r/1" },
          bareProlog: { reader: "prolog", file: "k.pl", functor: "r/2" },
          routes: routes(),
          middleware: routes({ select: "middleware" }),
          prefix: routes({ path_prefix: "/api" }),
          prefixNone: routes({ path_prefix: "/none" }),
          bareRoutes: routes({ export: "bare" }),
          bareRoutesPrefix: routes({ export: "bare", path_prefix: "/x" }),
          fields: validator(),
          required: validator({ select: "required_fields" }),
          optional: validator({ select: "optional_fields" }),
          table: validator({ table: "Adm*", select: "fields" }),
          noTable: validator({ table: "Nope" }),
          bareValidator: validator({ export: "bare" }),
          bareTable: validator({ export: "bare", table: "x" }),
          drizzle: {
            reader: "schema",
            format: "drizzle",
            file: "s.ts",
            select: "tables",
          },
        },
        evaluate,
      )),
    });
    expect(calls.every((call) => call.startsWith("true "))).toBe(true);
  });
});

describe("importClosure", () => {
  test("follows relative, aliased and workspace package imports", () => {
    const root = workspace({
      "tsconfig.base.json": `{
        // paths with a comment
        "compilerOptions": { "baseUrl": "src", "paths": { "@lib/*": ["lib/*"], "exact": ["lib/exact.ts"], "none": "lib/x.ts", }, },
        /* block */
      }`,
      "tsconfig.json":
        '{ "extends": ["./missing", "pkg-config", "./tsconfig.base"] }',
      "src/app.ts": [
        'import a from "./a";',
        'import { b } from "./b.js";',
        'export * from "./c";',
        'const d = require("./d.cjs");',
        'const e = await import ( "./dir" );',
        'import "@lib/f";',
        'import g from "exact";',
        'import h from "none";',
        'import "@scope/pkg";',
        'import "@scope/pkg/sub";',
        'import "plain";',
        'import "registry";',
        'import "outside";',
        'import "@bad";',
        'import "./missing";',
        'import "./loop";',
        "const url = 'http://x.test/a'; // not an import",
      ].join("\n"),
      "src/a.ts": 'import "./app";',
      "src/b.ts": "export const b = 1;",
      "src/c.tsx": "",
      "src/d.cjs": "",
      "src/dir/index.ts": "",
      "src/lib/f.mts": "",
      "src/lib/exact.ts": "",
      "src/loop.ts": 'import "./loop";',
      "packages/pkg/package.json": JSON.stringify({
        exports: {
          ".": {
            types: "./x.d.ts",
            import: "./dist/i.mjs",
            default: { node: "./src/main.ts" },
          },
        },
        main: "./m.js",
      }),
      "packages/pkg/src/main.ts": "",
      "packages/pkg/m.js": "",
      "packages/pkg/sub.ts": "",
      "packages/plain/index.js": "",
      "packages/plain/package.json": "{bad",
      "vendor/registry/index.js": "",
      "vendor/registry/package.json": "{}",
    });
    mkdirSync(join(root, "node_modules/@scope"), { recursive: true });
    symlinkSync(
      join(root, "packages/pkg"),
      join(root, "node_modules/@scope/pkg"),
    );
    symlinkSync(join(root, "packages/plain"), join(root, "node_modules/plain"));
    mkdirSync(join(root, "node_modules/.store"), { recursive: true });
    symlinkSync(
      join(root, "vendor/registry"),
      join(root, "node_modules/.store/registry"),
    );
    symlinkSync(
      join(root, "node_modules/.store/registry"),
      join(root, "src/registry-link"),
    );
    const outside = workspace({ "index.js": "" });
    symlinkSync(outside, join(root, "node_modules/outside"));
    symlinkSync(join(root, "gone"), join(root, "node_modules/registry"));
    expect(importClosure(root, "src/app.ts")).toEqual([
      "packages/pkg/src/main.ts",
      "packages/pkg/sub.ts",
      "packages/plain/index.js",
      "src/a.ts",
      "src/b.ts",
      "src/c.tsx",
      "src/d.cjs",
      "src/dir/index.ts",
      "src/lib/exact.ts",
      "src/lib/f.mts",
      "src/loop.ts",
    ]);
    expect(importClosure(root, "src/nope.ts")).toEqual([]);
  });

  test("resolves a child baseUrl, nearest tsconfig and deep extends", () => {
    const chain: Record<string, string> = {};
    for (let index = 0; index < 13; index++)
      chain[`deep/t${index}.json`] =
        index === 12
          ? '{"compilerOptions":{"paths":{"@d/*":["d/*"]}}}'
          : `{"extends":"./t${index + 1}.json"}`;
    const root = workspace({
      ...chain,
      "base.json": '{"compilerOptions":{"paths":{"@x/*":["x/*"]}}}',
      "child/tsconfig.json":
        '{"extends":"../base","compilerOptions":{"baseUrl":"lib"}}',
      "child/lib/x/one.ts": "",
      "child/main.ts": 'import "@x/one";',
      "plain/tsconfig.json":
        '{"compilerOptions":{"paths":{"@p/*":["p/*"],"@q":[3]}}}',
      "plain/p/two.ts": "",
      "plain/a/main.ts": 'import "@p/two";',
      "near/tsconfig.json": '{"extends":"./bad.json"}',
      "near/bad.json": "nope",
      "near/main.ts": 'import "@x/one";',
      "deep/tsconfig.json": '{"extends":"./t0.json"}',
      "deep/d/three.ts": "",
      "deep/main.ts": 'import "@d/three";',
      "shallow/tsconfig.json": '{"extends":"./t.json"}',
      "shallow/t.json": '{"extends":"./u"}',
      "shallow/u.json": '{"compilerOptions":{"paths":{"@s/*":["s/*"]}}}',
      "shallow/s/four.ts": "",
      "shallow/main.ts": 'import "@s/four";',
      "top.ts": 'import "@x/one";',
    });
    expect(importClosure(root, "child/main.ts")).toEqual([
      "child/lib/x/one.ts",
    ]);
    expect(importClosure(root, "plain/a/main.ts")).toEqual(["plain/p/two.ts"]);
    expect(importClosure(root, "near/main.ts")).toEqual([]);
    expect(importClosure(root, "deep/main.ts")).toEqual([]);
    expect(importClosure(root, "shallow/main.ts")).toEqual([
      "shallow/s/four.ts",
    ]);
    expect(importClosure(root, "top.ts")).toEqual([]);
  });
});

describe("sourceDependencies", () => {
  test("hashes the files and globs each reader depends on", () => {
    const root = workspace({
      "a.json": "{}",
      "docs/x.md": "x",
      "docs/y.md": "y",
      "m/1.sql": "CREATE TABLE t (a int);",
      "app.ts": 'import "./dep";',
      "dep.ts": "",
      "mw.ts": "",
      "k.pl": "r(a).",
    });
    const deps = (value: Record<string, unknown>) =>
      sourceDependencies(root, spec(value));
    expectGolden("proof-sources-dependencies", {
      json: deps({ reader: "json", file: "a.json" }),
      yaml: deps({ reader: "yaml", file: "missing.yaml" }),
      openapi: deps({ reader: "openapi", file: "a.json" }),
      outside: deps({ reader: "json", file: "../a.json" }),
      glob: deps({
        reader: "glob",
        pattern: ["docs/*.md"],
        ignore: "docs/y.md",
      }),
      references: deps({
        reader: "references",
        files: "docs/*.md",
        ignore: ["docs/x.md"],
      }),
      sql: deps({ reader: "schema", format: "sql", files: ["m/*.sql"] }),
      drizzle: deps({ reader: "schema", format: "drizzle", file: "app.ts" }),
      prisma: deps({ reader: "schema", format: "prisma", file: "app.ts" }),
      routes: deps({ reader: "routes", file: "app.ts", names_from: ["mw.ts"] }),
      validator: deps({ reader: "validator", file: "app.ts" }),
      prolog: deps({ reader: "prolog", file: "k.pl" }),
      unknown: deps({ reader: "csv" }),
    });
  });
});

describe("tsconfig comments", () => {
  test("keep strings that look like comments", () => {
    const root = workspace({
      "a/tsconfig.json": `{
  "compilerOptions": {
    "paths": { "@u/*": ["u/*"] }, // line comment with "quotes"
    "x": "https://a.test//b", "q": "say \\"/* not a comment\\" ok",
    /* block "comment" */ "y": 1,
  }
}`,
      "a/u/one.ts": "",
      "a/main.ts": 'import "@u/one";',
      "b/tsconfig.json":
        '{"compilerOptions":{"paths":{"@v/*":["v/*"]}}} /* open',
      "b/v/two.ts": "",
      "b/main.ts": 'import "@v/two";',
      "c/tsconfig.json":
        '{"compilerOptions":{"paths":{"@w/*":["w/*"]}}} // tail',
      "c/w/three.ts": "",
      "c/main.ts": 'import "@w/three";',
      "d/tsconfig.json":
        '{"compilerOptions":{"paths":{"@z/*":["z/*"]}},"s":"open',
      "d/z/four.ts": "",
      "d/main.ts": 'import "@z/four";',
    });
    expect(importClosure(root, "a/main.ts")).toEqual(["a/u/one.ts"]);
    expect(importClosure(root, "b/main.ts")).toEqual(["b/v/two.ts"]);
    expect(importClosure(root, "c/main.ts")).toEqual(["c/w/three.ts"]);
    expect(importClosure(root, "d/main.ts")).toEqual([]);
  });
});
