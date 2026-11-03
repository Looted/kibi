import { afterAll, describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  type SourceCodeEvaluator,
  type SourceSpec,
  describeSource,
  importClosure,
  normalizeSourceSpec,
  readSource,
  sourceDependencies,
  sourceSpecErrors,
} from "../../src/public/proof-sources.js";

const root = mkdtempSync(path.join(tmpdir(), "kibi-proof-sources-cov-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

function write(relative: string, text: string): void {
  const file = path.join(root, relative);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, text);
}

const spec = (value: Record<string, unknown>) => value as SourceSpec;

async function read(value: Record<string, unknown>) {
  return readSource(root, spec(value));
}

async function reason(value: Record<string, unknown>): Promise<string> {
  const result = await read(value);
  if (result.ok) throw new Error("expected a refusal");
  return result.reason;
}

async function members(value: Record<string, unknown>): Promise<string[]> {
  const result = await read(value);
  if (!result.ok) throw new Error(result.reason);
  return result.model.members;
}

describe("sourceSpecErrors", () => {
  test("rejects glob lists that are not repository-relative", () => {
    expect(
      sourceSpecErrors({ reader: "glob", pattern: ["../a/*"] }, "s"),
    ).toStrictEqual([
      "s.pattern must be a repository-relative glob or a list of them",
    ]);
    expect(
      sourceSpecErrors({ reader: "glob", pattern: [] }, "s"),
    ).toStrictEqual([
      "s.pattern must be a repository-relative glob or a list of them",
    ]);
  });

  test("select must be one the reader takes", () => {
    expect(
      sourceSpecErrors({ reader: "json", file: "a.json", select: "nope" }, "s"),
    ).toStrictEqual(["s.select must be one of: keys, values, items"]);
    expect(
      sourceSpecErrors({ reader: "glob", pattern: "a", select: "keys" }, "s"),
    ).toStrictEqual([
      "s (reader glob) does not take select; it takes reader, pattern, capture, ignore",
      "s.select does not apply to reader glob",
    ]);
  });

  test("json field rules", () => {
    expect(
      sourceSpecErrors({ reader: "json", file: "a.json", field: " " }, "s"),
    ).toStrictEqual([
      "s.field must name the key read from each item of the list",
    ]);
    expect(
      sourceSpecErrors(
        { reader: "yaml", file: "a.yaml", field: "x", select: "keys" },
        "s",
      ),
    ).toStrictEqual(["s.field applies only to select items"]);
    expect(
      sourceSpecErrors({ reader: "json", file: "a.json", path: 3 }, "s"),
    ).toStrictEqual(["s.path must be a dotted path or a JSON pointer"]);
  });

  test("references rules", () => {
    expect(
      sourceSpecErrors({ reader: "references", files: "a", extract: "x" }, "s"),
    ).toStrictEqual([
      "s.extract must be one of: env, imports, calls, string_args, thrown, property",
    ]);
    expect(
      sourceSpecErrors(
        { reader: "references", files: "a", extract: "property" },
        "s",
      ),
    ).toStrictEqual([
      "s.key is required for extract property: name the property whose string values are read",
    ]);
    expect(
      sourceSpecErrors(
        { reader: "references", files: "a", extract: "env", key: "k" },
        "s",
      ),
    ).toStrictEqual(["s.key applies only to extract property"]);
    expect(
      sourceSpecErrors(
        { reader: "references", files: "a", extract: "string_args" },
        "s",
      ),
    ).toStrictEqual([
      "s.callee is required for extract string_args: name the function whose first argument is read",
    ]);
    expect(
      sourceSpecErrors(
        { reader: "references", files: "a", extract: "calls", callee: "" },
        "s",
      ),
    ).toStrictEqual(["s.callee must be a function name"]);
  });

  test("schema rules", () => {
    expect(
      sourceSpecErrors(
        { reader: "schema", format: "sql", files: "a.sql", file: "b" },
        "s",
      ),
    ).toStrictEqual(["s.file does not apply to format sql; use files"]);
    expect(
      sourceSpecErrors(
        { reader: "schema", format: "prisma", file: "a", files: "b" },
        "s",
      ),
    ).toStrictEqual(["s.files applies only to format sql"]);
    expect(
      sourceSpecErrors(
        { reader: "schema", format: "prisma", file: "a", exports: ["x"] },
        "s",
      ),
    ).toStrictEqual([
      "s.exports must be a list of export names, for format drizzle only",
    ]);
    expect(
      sourceSpecErrors(
        { reader: "schema", format: "drizzle", file: "a", exports: [] },
        "s",
      ),
    ).toStrictEqual([
      "s.exports must be a list of export names, for format drizzle only",
    ]);
    expect(
      sourceSpecErrors(
        { reader: "schema", format: "drizzle", file: "a", table: "" },
        "s",
      ),
    ).toStrictEqual(["s.table must be a table name or a glob of table names"]);
    expect(
      sourceSpecErrors({ reader: "schema", format: "x", file: "a" }, "s"),
    ).toStrictEqual(["s.format must be drizzle, prisma or sql"]);
  });

  test("routes rules", () => {
    expect(
      sourceSpecErrors(
        {
          reader: "routes",
          file: "a.ts",
          framework: "koa",
          path_prefix: "api",
          names_from: ["../x.ts"],
        },
        "s",
      ),
    ).toStrictEqual([
      "s.export is required for reader routes: name the app (or a function returning it)",
      "s.framework must be hono or express",
      "s.path_prefix must be a path starting with /",
      "s.names_from must list repository-relative module files whose exports name middleware",
    ]);
    expect(
      sourceSpecErrors(
        {
          reader: "routes",
          file: "a.ts",
          export: "app",
          framework: "hono",
          path_prefix: "",
          names_from: [],
        },
        "s",
      ),
    ).toStrictEqual([
      "s.path_prefix must be a path starting with /",
      "s.names_from must list repository-relative module files whose exports name middleware",
    ]);
  });

  test("validator and prolog rules", () => {
    expect(
      sourceSpecErrors({ reader: "validator", file: "a.ts" }, "s"),
    ).toStrictEqual([
      "s.export is required for reader validator: name the object schema",
    ]);
    expect(
      sourceSpecErrors(
        { reader: "prolog", file: "a.pl", functor: "Bad/1", arg: 0 },
        "s",
      ),
    ).toStrictEqual([
      "s.functor is required for reader prolog: name the facts read as Name/Arity (requires/1)",
      "s.arg must be the 1-based argument of each fact that holds the member",
    ]);
    expect(
      sourceSpecErrors(
        { reader: "prolog", file: "a.pl", functor: "req/01", arg: 1.5 },
        "s",
      ),
    ).toStrictEqual([
      "s.functor is required for reader prolog: name the facts read as Name/Arity (requires/1)",
      "s.arg must be the 1-based argument of each fact that holds the member",
    ]);
    expect(
      sourceSpecErrors(
        { reader: "prolog", file: "a.pl", functor: "requires/1", arg: 2 },
        "s",
      ),
    ).toStrictEqual([]);
  });
});

describe("normalizeSourceSpec", () => {
  test("keeps only the keys the reader takes", () => {
    expect(
      normalizeSourceSpec({
        reader: "json",
        file: "a.json",
        path: undefined,
        extra: 1,
      }),
    ).toStrictEqual({ reader: "json", file: "a.json" });
    expect(normalizeSourceSpec({ reader: "nope" })).toBeUndefined();
    expect(normalizeSourceSpec(null)).toBeUndefined();
  });
});

describe("describeSource", () => {
  test("describes every reader", () => {
    expect(describeSource(spec({ reader: "json", file: "a.json" }))).toBe(
      "json a.json",
    );
    expect(
      describeSource(
        spec({ reader: "yaml", file: "a.yaml", path: "x.y", field: "name" }),
      ),
    ).toBe("yaml a.yaml at x.y (name of each item)");
    expect(describeSource(spec({ reader: "openapi", file: "o.json" }))).toBe(
      "openapi o.json",
    );
    expect(
      describeSource(spec({ reader: "glob", pattern: ["a/*", "b"] })),
    ).toBe("files matching a/*, b");
    expect(
      describeSource(
        spec({ reader: "references", extract: "env", files: "src/**" }),
      ),
    ).toBe("env references in src/**");
    expect(
      describeSource(
        spec({ reader: "schema", format: "prisma", file: "s.prisma" }),
      ),
    ).toBe("prisma schema s.prisma");
    expect(
      describeSource(
        spec({
          reader: "schema",
          format: "sql",
          files: ["m/*.sql"],
          table: "u*",
        }),
      ),
    ).toBe("sql schema m/*.sql (tables u*)");
    expect(
      describeSource(spec({ reader: "routes", export: "app", file: "a.ts" })),
    ).toBe("routes of app in a.ts");
    expect(
      describeSource(
        spec({
          reader: "routes",
          export: "app",
          file: "a.ts",
          path_prefix: "/api",
        }),
      ),
    ).toBe("routes of app in a.ts under /api");
    expect(
      describeSource(spec({ reader: "validator", export: "S", file: "v.ts" })),
    ).toBe("validator S in v.ts");
    expect(
      describeSource(
        spec({ reader: "prolog", functor: "r/1", file: "p.pl", arg: 1 }),
      ),
    ).toBe("r/1 facts in p.pl (argument 1)");
  });
});

describe("sourceDependencies", () => {
  test("references, sql, routes and prolog dependencies", () => {
    write("deps/src/a.ts", "export const a = 1;\n");
    write("deps/src/b.ts", "import { a } from './a';\n");
    write("deps/m/001.sql", "create table t (id int);\n");
    write("deps/names.ts", "export const auth = 1;\n");
    write("deps/app.ts", "import { auth } from './names';\n");
    write("deps/p.pl", "requires(x).\n");
    const base = path.join(root, "deps");
    const refs = sourceDependencies(
      base,
      spec({
        reader: "references",
        files: "src/*.ts",
        extract: "env",
        ignore: "src/b.ts",
      }),
    );
    expect(refs.map((row) => row.id)).toStrictEqual([
      "source-file:src/a.ts",
      "source-glob:src/*.ts",
    ]);
    const sql = sourceDependencies(
      base,
      spec({ reader: "schema", format: "sql", files: ["m/*.sql"] }),
    );
    expect(sql.map((row) => row.id)).toStrictEqual([
      "source-file:m/001.sql",
      "source-glob:m/*.sql",
    ]);
    const routes = sourceDependencies(
      base,
      spec({
        reader: "routes",
        file: "app.ts",
        export: "app",
        names_from: ["names.ts"],
      }),
    );
    expect(routes.map((row) => row.id)).toStrictEqual([
      "source-file:app.ts",
      "source-file:names.ts",
    ]);
    expect(
      sourceDependencies(base, spec({ reader: "json", file: "a.json" })),
    ).toStrictEqual([{ id: "source-file:a.json", hash: "missing" }]);
    expect(
      sourceDependencies(base, spec({ reader: "yaml", file: "a.yaml" })),
    ).toStrictEqual([{ id: "source-file:a.yaml", hash: "missing" }]);
    const prolog = sourceDependencies(
      base,
      spec({ reader: "prolog", file: "missing.pl", functor: "r/1" }),
    );
    expect(prolog).toStrictEqual([
      { id: "source-file:missing.pl", hash: "missing" },
    ]);
    const validator = sourceDependencies(
      base,
      spec({ reader: "validator", file: "app.ts", export: "x" }),
    );
    expect(validator.map((row) => row.id)).toStrictEqual([
      "source-file:app.ts",
      "source-file:names.ts",
    ]);
  });
});

describe("importClosure", () => {
  test("follows tsconfig extends with a re-rooting baseUrl", () => {
    write(
      "tsx/tsconfig.base.json",
      JSON.stringify({ compilerOptions: { paths: { "@lib/*": ["lib/*"] } } }),
    );
    write(
      "tsx/pkg/tsconfig.json",
      `{
        // comment
        "extends": ["./missing-parent", "../tsconfig.base.json"],
        "compilerOptions": { "baseUrl": "..", },
      }`,
    );
    write("tsx/lib/x.ts", "export const x = 1;\n");
    write("tsx/pkg/main.ts", "import { x } from '@lib/x';\n");
    expect(importClosure(path.join(root, "tsx"), "pkg/main.ts")).toStrictEqual([
      "lib/x.ts",
    ]);
  });

  test("an unreadable tsconfig and a parent without paths give no aliases", () => {
    write("tsy/tsconfig.base.json", JSON.stringify({ compilerOptions: {} }));
    write(
      "tsy/pkg/tsconfig.json",
      JSON.stringify({ extends: "../tsconfig.base.json" }),
    );
    write("tsy/pkg/main.ts", "import { x } from '@lib/x';\n");
    expect(importClosure(path.join(root, "tsy"), "pkg/main.ts")).toStrictEqual(
      [],
    );
    write("tsz/tsconfig.json", "{ not json");
    write("tsz/main.ts", "import './a';\n");
    write("tsz/a.ts", "export {};\n");
    expect(importClosure(path.join(root, "tsz"), "main.ts")).toStrictEqual([
      "a.ts",
    ]);
  });

  test("workspace packages linked into node_modules", () => {
    const ws = path.join(root, "ws");
    write(
      "ws/packages/lib/package.json",
      JSON.stringify({
        exports: {
          ".": { types: "./x.d.ts", import: { default: "./src/main.ts" } },
        },
        main: "./dist/index.d.ts",
      }),
    );
    write("ws/packages/lib/src/main.ts", "export const m = 1;\n");
    write("ws/packages/lib/src/sub.ts", "export const s = 1;\n");
    write("ws/packages/scoped/src/index.ts", "export const z = 1;\n");
    write(
      "ws/app/main.ts",
      [
        "import { m } from 'lib';",
        "import { s } from 'lib/sub';",
        "import { z } from '@scope/pkg';",
        "import { q } from 'outside';",
        "import { d } from 'dangling';",
        "import { e } from '@scope/';",
        "import { r } from 'registry';",
      ].join("\n"),
    );
    mkdirSync(path.join(ws, "app/node_modules/@scope"), { recursive: true });
    symlinkSync(
      path.join(ws, "packages/lib"),
      path.join(ws, "app/node_modules/lib"),
    );
    symlinkSync(
      path.join(ws, "packages/scoped"),
      path.join(ws, "app/node_modules/@scope/pkg"),
    );
    const outside = mkdtempSync(path.join(tmpdir(), "kibi-outside-"));
    writeFileSync(path.join(outside, "index.ts"), "export {};\n");
    symlinkSync(outside, path.join(ws, "app/node_modules/outside"));
    symlinkSync(
      path.join(ws, "nowhere"),
      path.join(ws, "app/node_modules/dangling"),
    );
    write("ws/node_modules/registry/index.ts", "export {};\n");
    try {
      expect(importClosure(ws, "app/main.ts")).toStrictEqual([
        "packages/lib/src/main.ts",
        "packages/lib/src/sub.ts",
        "packages/scoped/src/index.ts",
      ]);
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });

  test("relative imports through dangling links and out of the workspace", () => {
    const base = path.join(root, "links");
    write(
      "links/main.ts",
      "import './gone';\nimport './up';\nimport './nm';\n",
    );
    symlinkSync(path.join(base, "nothing.ts"), path.join(base, "gone.ts"));
    const outside = mkdtempSync(path.join(tmpdir(), "kibi-outside-"));
    writeFileSync(path.join(outside, "up.ts"), "export {};\n");
    symlinkSync(path.join(outside, "up.ts"), path.join(base, "up.ts"));
    write("links/node_modules/x/nm.ts", "export {};\n");
    symlinkSync(
      path.join(base, "node_modules/x/nm.ts"),
      path.join(base, "nm.ts"),
    );
    try {
      expect(importClosure(base, "main.ts")).toStrictEqual([]);
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });
});

describe("readSource document readers", () => {
  test("unparseable, list and object refusals", async () => {
    write("doc/bad.json", "{ nope");
    expect(await reason({ reader: "json", file: "doc/bad.json" })).toStartWith(
      "Kibi could not parse doc/bad.json: ",
    );
    write("doc/list.json", JSON.stringify([1, "a", true]));
    expect(
      await reason({ reader: "json", file: "doc/list.json", select: "keys" }),
    ).toBe("the document is a list, which has no keys (use select items)");
    write("doc/obj.json", JSON.stringify({ a: { b: [{ n: 1 }] } }));
    expect(
      await reason({ reader: "json", file: "doc/obj.json", select: "items" }),
    ).toBe("the document is an object, not a list (use select keys or values)");
    expect(
      await reason({
        reader: "json",
        file: "doc/obj.json",
        path: "a",
        select: "values",
      }),
    ).toBe(
      "a holds a value that is not a string, number or boolean, so it cannot be a member (select keys, point path at the list, or name the item field to read)",
    );
    write("doc/big.json", '{"n": null, "b": 10}');
    expect(
      await members({ reader: "json", file: "doc/obj.json", path: "/a/b/0/n" }),
    ).toStrictEqual(["1"]);
    expect(
      await members({ reader: "json", file: "doc/big.json", path: "b" }),
    ).toStrictEqual(["10"]);
    expect(
      await members({ reader: "json", file: "doc/list.json" }),
    ).toStrictEqual(["1", "a", "true"]);
  });

  test("glob capture refuses braces", async () => {
    write("g/a.txt", "");
    expect(
      await reason({ reader: "glob", pattern: "g/{a,b}.txt", capture: true }),
    ).toBe(
      "capture reads only *, ** and ? in the pattern; g/a.txt matched a pattern Kibi cannot capture from (braces or classes)",
    );
    expect(
      await members({ reader: "glob", pattern: "g/**", capture: true }),
    ).toStrictEqual(["a.txt"]);
  });

  test("openapi documents", async () => {
    write("oa/not.json", JSON.stringify({ info: {} }));
    expect(await reason({ reader: "openapi", file: "oa/not.json" })).toBe(
      "oa/not.json is not an OpenAPI or Swagger document",
    );
    write(
      "oa/api.json",
      JSON.stringify({
        openapi: "3.0.0",
        security: [{ key: [] }],
        paths: {
          "/a": {
            get: { responses: { 200: {}, 404: {} } },
            post: { security: [{}] },
          },
          "/b": "nope",
        },
      }),
    );
    expect(
      await members({
        reader: "openapi",
        file: "oa/api.json",
        select: "responses",
      }),
    ).toStrictEqual(["GET /a 200", "GET /a 404"]);
    expect(
      await members({
        reader: "openapi",
        file: "oa/api.json",
        select: "unsecured_operations",
      }),
    ).toStrictEqual(["POST /a"]);
  });
});

describe("readSource sql schema", () => {
  const sql = async (text: string, extra: Record<string, unknown> = {}) => {
    const name = `sql/${Math.random().toString(36).slice(2)}`;
    write(`${name}/001.sql`, text);
    return read({
      reader: "schema",
      format: "sql",
      files: `${name}/*.sql`,
      ...extra,
    });
  };

  test("rename column, set nullability, add keys and constraints", async () => {
    const result = await sql(
      `
      create table prices (id int, amount$ int default 1, note text default '$1');
      create table users (id int, name text, org int references orgs (id));
      create table orgs (id int);
      create table posts (
        id int,
        author int,
        constraint posts_author_fk foreign key (author) references users (id) on delete cascade,
        primary key (id)
      );
      alter table users rename column name to full_name;
      alter table users rename column ghost to other;
      alter table users alter column full_name set not null;
      alter table users alter column ghost drop not null;
      alter table users add constraint users_org_fk foreign key (org) references orgs (id);
      alter table users add primary key (id, missing);
      alter table users add constraint u unique (full_name);
      alter table posts drop constraint if exists never_there_fkey;
      alter table posts drop constraint plain_name;
      drop table if exists orgs, other;
      create table orgs (id int);
      alter table posts rename to articles;
    `,
      { select: "columns" },
    );
    if (!result.ok) throw new Error(result.reason);
    expect(result.model.members).toStrictEqual([
      "articles.author",
      "articles.id",
      "orgs.id",
      "prices.amount$",
      "prices.id",
      "prices.note",
      "users.full_name",
      "users.id",
      "users.org",
    ]);
    const users = result.model.entities?.find((e) => e.name === "users");
    expect(users?.columns).toStrictEqual([
      { name: "full_name", nullable: false, optional: false },
      { name: "id", nullable: false, optional: false },
      { name: "org", nullable: true, optional: false },
    ]);
    expect(users?.foreign_keys).toStrictEqual(["users.org->orgs.id"]);
    const articles = result.model.entities?.find((e) => e.name === "articles");
    expect(articles?.foreign_keys).toStrictEqual([
      "articles.author->users.id on delete cascade",
    ]);
  });

  test("refusals", async () => {
    const one = await sql("create table t as select 1;");
    expect(one).toStrictEqual({
      ok: false,
      reason: expect.stringContaining(
        "Kibi cannot read this CREATE TABLE form",
      ),
    });
    const two = await sql("alter table ghost add column x int;");
    expect(two.ok).toBe(false);
    if (!two.ok)
      expect(two.reason).toEndWith(
        ": ALTER TABLE ghost before Kibi read its CREATE TABLE",
      );
    const three = await sql(
      "create table t (id int); alter table t drop constraint t_x_fkey;",
    );
    expect(three.ok).toBe(false);
    if (!three.ok)
      expect(three.reason).toContain(
        "ALTER TABLE t drops constraint t_x_fkey, a foreign key Kibi did not read",
      );
    const four = await sql("create table t (id int);", { table: "zz*" });
    expect(four).toStrictEqual({
      ok: false,
      reason: "no table matches zz* (t)",
    });
    const five = await sql("select 1;");
    expect(five.ok).toBe(false);
    if (!five.ok)
      expect(five.reason).toContain(
        "holds no CREATE TABLE statement Kibi can read (1 file)",
      );
  });
});

describe("readSource prisma schema", () => {
  test("relations with mapped targets and onDelete", async () => {
    write(
      "prisma/s.prisma",
      `
      model User {
        id Int @id
        posts Post[]
        @@map("users")
      }
      model Post {
        id Int @id
        authorId Int @map("author_id")
        author User @relation(fields: [authorId], references: [id], onDelete: SetNull)
        tag Tag? @relation("x")
      }
      `,
    );
    const result = await read({
      reader: "schema",
      format: "prisma",
      file: "prisma/s.prisma",
      select: "foreign_keys",
    });
    expect(result).toStrictEqual({
      ok: true,
      model: {
        members: ["Post.author_id->users.id on delete set null"],
        entities: expect.any(Array),
      },
    });
  });
});

describe("readSource code readers", () => {
  test("refuses without an evaluator", async () => {
    expect(
      await reason({ reader: "validator", file: "v.ts", export: "S" }),
    ).toBe("reader validator needs Kibi's code evaluator");
  });

  test("routes with a prefix no route is under", async () => {
    const evaluate: SourceCodeEvaluator = async () => ({
      ok: true,
      routes: [{ method: "GET", path: "/a", middleware: ["auth"] }],
    });
    const result = await readSource(
      root,
      spec({
        reader: "routes",
        file: "a.ts",
        export: "app",
        path_prefix: "/api",
      }),
      evaluate,
    );
    expect(result).toStrictEqual({
      ok: false,
      reason: "no route of app is under /api",
    });
    const mw = await readSource(
      root,
      spec({
        reader: "routes",
        file: "a.ts",
        export: "app",
        select: "middleware",
      }),
      evaluate,
    );
    expect(mw.ok && mw.model.members).toStrictEqual(["GET /a auth"]);
  });

  test("validator entities select optional fields and missing object", async () => {
    const evaluate: SourceCodeEvaluator = async () => ({
      ok: true,
      entities: [
        {
          name: "S",
          columns: [
            { name: "a", nullable: false, optional: true },
            { name: "b", nullable: false, optional: false },
          ],
          foreign_keys: [],
        },
      ],
    });
    const optional = await readSource(
      root,
      spec({
        reader: "validator",
        file: "v.ts",
        export: "S",
        select: "optional_fields",
      }),
      evaluate,
    );
    expect(optional.ok && optional.model.members).toStrictEqual(["a"]);
    const empty: SourceCodeEvaluator = async () => ({ ok: true });
    const nothing = await readSource(
      root,
      spec({ reader: "schema", format: "drizzle", file: "d.ts", table: "Q" }),
      empty,
    );
    expect(nothing).toStrictEqual({
      ok: false,
      reason: "no table matches Q (none read)",
    });
  });
});
