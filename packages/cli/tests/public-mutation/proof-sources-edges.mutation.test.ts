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
import { basename, join } from "node:path";

import {
  type SourceCodeEvaluator,
  type SourceSpec,
  describeSource,
  importClosure,
  readSource,
  selectedRoutes,
  sourceDependencies,
} from "../../src/public/proof-sources.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function workspace(files: Record<string, string> = {}, base?: string): string {
  const root = realpathSync(
    mkdtempSync(join(base ?? tmpdir(), "kibi-source-edges-")),
  );
  if (base === undefined) roots.push(root);
  for (const [file, contents] of Object.entries(files))
    write(root, file, contents);
  return root;
}

function write(root: string, file: string, contents: string): void {
  mkdirSync(join(root, file, ".."), { recursive: true });
  writeFileSync(join(root, file), contents);
}

function link(root: string, target: string, at: string): void {
  mkdirSync(join(root, at, ".."), { recursive: true });
  symlinkSync(join(root, target), join(root, at));
}

const spec = (value: Record<string, unknown>) => value as SourceSpec;
const read = (root: string, value: Record<string, unknown>) =>
  readSource(root, spec(value));
const members = async (root: string, value: Record<string, unknown>) => {
  const result = await read(root, value);
  return result.ok ? result.model.members : result.reason;
};

describe("descriptions", () => {
  test("list only the usable patterns", () => {
    expect(
      describeSource(spec({ reader: "glob", pattern: ["a/*", 3, "b/*"] })),
    ).toBe("files matching a/*, b/*");
    expect(describeSource(spec({ reader: "glob" }))).toBe("files matching ");
    expect(
      describeSource(
        spec({ reader: "references", extract: "env", files: ["a", "b"] }),
      ),
    ).toBe("env references in a, b");
  });

  test("joins every spec error", async () => {
    expect(await read(workspace(), { reader: "routes" })).toStrictEqual({
      ok: false,
      reason:
        "source.file is required for reader routes; source.export is required for reader routes: name the app (or a function returning it)",
    });
  });

  test("keeps routes outside a path when no prefix is set", () => {
    const routes = [{ method: "GET", path: "*", middleware: [] }];
    expect(selectedRoutes(spec({ reader: "routes" }), routes)).toEqual(routes);
  });
});

describe("document edges", () => {
  test("navigates lists, strings and parsers exactly", async () => {
    const root = workspace({
      "a.json": JSON.stringify({
        obj: { c: "xyz" },
        list: ["a", "b", "c", "d"],
        big: Array.from({ length: 11 }, (_, index) => `i${index}`),
      }),
      "dup.yaml.json": '{"a":1,"a":2}',
      "list.json": "[1]",
      "null.json": "null",
      "conf.txt": "k: v\n",
      "api.json":
        '{"openapi":"3.0.0","paths":{"/a":{"get":{}}},"openapi":"3.1.0"}',
      "sec.json": JSON.stringify({
        openapi: "3.0.0",
        paths: {
          "/s": { get: { security: [[]] } },
          "/t": { get: { security: [{}] } },
        },
      }),
    });
    const at = (path: string) =>
      members(root, { reader: "json", file: "a.json", path });
    expect(await at("obj.c.0")).toBe(
      "the document has nothing at obj.c.0 (no 0)",
    );
    expect(await at("list. 1")).toBe(
      "the document has nothing at list. 1 (no  1)",
    );
    expect(await at("/list/1e0")).toBe(
      "the document has nothing at /list/1e0 (no 1e0)",
    );
    expect(await at("list.4")).toBe(
      "the document has nothing at list.4 (no 4)",
    );
    expect(await at("list.3")).toEqual(["d"]);
    expect(
      await members(root, {
        reader: "json",
        file: "list.json",
        select: "keys",
      }),
    ).toBe("the document is a list, which has no keys (use select items)");
    expect(await members(root, { reader: "json", file: "null.json" })).toBe(
      "the document is empty",
    );
    expect(await at("big.10")).toEqual(["i10"]);
    expect(
      await members(root, { reader: "json", file: "dup.yaml.json" }),
    ).toEqual(["a"]);
    expect(await members(root, { reader: "yaml", file: "conf.txt" })).toEqual([
      "k",
    ]);
    expect(
      await members(root, { reader: "openapi", file: "api.json" }),
    ).toEqual(["GET /a"]);
    expect(
      await members(root, {
        reader: "openapi",
        file: "sec.json",
        select: "unsecured_operations",
      }),
    ).toEqual(["GET /t"]);
  });
});

describe("dependency edges", () => {
  test("joins patterns and matches and refuses files outside", () => {
    const other = workspace({ "a.json": "{}" });
    const root = workspace({
      "a/1.md": "1",
      "b/2.md": "2",
      "m/1.sql": "",
      "n/2.sql": "",
      "app.ts": 'import "./dep";',
      "dep.ts": "",
    });
    const ids = (value: Record<string, unknown>) =>
      sourceDependencies(root, spec(value));
    expect(
      ids({ reader: "json", file: `../${basename(other)}/a.json` }),
    ).toEqual([
      { id: `source-file:../${basename(other)}/a.json`, hash: "missing" },
    ]);
    const glob = ids({ reader: "glob", pattern: ["a/*.md", "b/*.md"] });
    const references = ids({
      reader: "references",
      files: ["a/*.md", "b/*.md"],
    });
    const sql = ids({
      reader: "schema",
      format: "sql",
      files: ["m/*.sql", "n/*.sql"],
    });
    const hash = (text: string) =>
      new Bun.CryptoHasher("sha256").update(text).digest("hex");
    expect(glob).toEqual([
      { id: "source-glob:a/*.md,b/*.md", hash: hash("a/1.md\nb/2.md") },
    ]);
    expect(references.map((row) => row.id)).toEqual([
      "source-file:a/1.md",
      "source-file:b/2.md",
      "source-glob:a/*.md,b/*.md",
    ]);
    expect(references[2]?.hash).toBe(hash("a/1.md\nb/2.md"));
    expect(sql.at(-1)).toEqual({
      id: "source-glob:m/*.sql,n/*.sql",
      hash: hash("m/1.sql\nn/2.sql"),
    });
    expect(
      ids({ reader: "json", file: "app.ts", format: "drizzle" }).map(
        (row) => row.id,
      ),
    ).toEqual(["source-file:app.ts"]);
  });
});

describe("SQL edges", () => {
  const sql = (files: unknown, extra: Record<string, unknown> = {}) => ({
    reader: "schema",
    format: "sql",
    files,
    ...extra,
  });
  const replay = async (text: string, select = "columns") => {
    const root = workspace({ "m.sql": text });
    return members(root, sql("m.sql", { select }));
  };

  test("reads names, quotes and statement boundaries", async () => {
    expect(
      await replay(
        `CREATE  TABLE   "user list" ("full name" text NOT  NULL, \`a,b\` int, [x y] int, "primary key" int, "a\`b" int, "a]b" int,);
CREATE TABLE app.items (id int, note text DEFAULT 'a;b', tag text DEFAULT "c;d", code text DEFAULT \`e;f\`);
CREATE TABLE fn (body text);
CREATE FUNCTION f() AS $$ SELECT 1; $$;
CREATE FUNCTION g() AS $body$ SELECT 2; $body$;
COMMENT ON TABLE fn IS 'create table x (y int); drop table items'`,
      ),
    ).toEqual([
      "fn.body",
      "items.code",
      "items.id",
      "items.note",
      "items.tag",
      "user list.a,b",
      "user list.a]b",
      "user list.a`b",
      "user list.full name",
      "user list.primary key",
      "user list.x y",
    ]);
    expect(
      await replay(
        `CREATE TABLE t (+x int, a int); CREATE TABLE u (b int) -- 'open`,
        "nullable_columns",
      ),
    ).toEqual(["t.", "t.a", "u.b"]);
    expect(
      await replay(
        "CREATE TABLE t (a int); SELECT 'unterminated; DROP TABLE t;",
        "tables",
      ),
    ).toEqual(["t"]);
    expect(
      await replay(
        "CREATE TABLE a (x int)\n--> statement-breakpoint\nCREATE TABLE b (y int)\n-->statement-breakpoint\nCREATE TABLE c (z int)",
        "tables",
      ),
    ).toEqual(["a", "b", "c"]);
    expect(
      await replay("  CREATE  TEMPORARY \n TABLE t (a int);", "tables"),
    ).toEqual(["t"]);
    expect(await replay("CREATE TEMPORARY TABLE t (a int);", "tables")).toEqual(
      ["t"],
    );
    expect(
      await replay(
        'CREATE TABLE t (a int, "b" int PRIMARY  KEY);',
        "required_columns",
      ),
    ).toEqual(["t.b"]);
  });

  test("replays drops, constraints and renames", async () => {
    const tables = (count: number) =>
      Array.from(
        { length: count },
        (_, index) => `CREATE TABLE t${index} (a int);`,
      ).join("\n");
    expect(
      await replay(
        `${tables(3)}
DROP TABLE t0;
DROP TABLE t1 RESTRICT;
COMMENT ON TABLE t2 IS 'drop table t2';`,
        "tables",
      ),
    ).toEqual(["t2"]);
    expect(
      await members(
        workspace({ "m.sql": tables(11) }),
        sql("m.sql", { table: "zz" }),
      ),
    ).toBe("no table matches zz (t0, t1, t10, t2, t3, t4, t5, t6, t7, t8)");
    expect(
      await members(
        workspace({ "m.sql": "CREATE TABLE t (a int); DROP TABLE t;" }),
        sql("m.sql", { table: "zz" }),
      ),
    ).toBe("no table matches zz (none read)");
    const long = `CREATE TABLE t (a int); ALTER TABLE t ATTACH PARTITION ${"p".repeat(90)} OWNER TO x`;
    expect(await replay(long)).toBe(
      `m.sql: ALTER TABLE t cannot read this ALTER TABLE form (${long.slice(24, 104)}), so the schema after it is unknown`,
    );
    const create = `CREATE TABLE weird ${"x".repeat(90)} AS SELECT 1`;
    expect(await replay(create)).toBe(
      `m.sql: Kibi cannot read this CREATE TABLE form (${create.slice(0, 80)})`,
    );
    expect(
      await replay(
        "ALTER TABLE ghost ENABLE ROW LEVEL SECURITY, ADD COLUMN x int",
      ),
    ).toBe("m.sql: ALTER TABLE ghost before Kibi read its CREATE TABLE");
    expect(
      await replay(
        "CREATE TABLE t (a int); ALTER TABLE t DROP CONSTRAINT t_fkey_old;",
      ),
    ).toEqual(["t.a"]);
    const fks = `
CREATE TABLE p (id int, k int, PRIMARY KEY (id, missing));
CREATE TABLE c (
  a int, b int, z int CONSTRAINT c_z_fk REFERENCES p (id) ON DELETE SET DEFAULT,
  FOREIGN KEY (a, b) REFERENCES p (id, k) ON DELETE RESTRICT,
  FOREIGN KEY (b) REFERENCES p (k) ON DELETE NO ACTION,
  FOREIGN KEY (z) REFERENCES p (id) ON  DELETE  CASCADE
);
CREATE TABLE q (id int, FOREIGN KEY (id) REFERENCES p (id));
ALTER TABLE c RENAME b TO bb;
ALTER TABLE c DROP CONSTRAINT c_a_b_fkey;
ALTER TABLE p RENAME COLUMN k TO kk;
`;
    expect(await replay(fks, "foreign_keys")).toEqual([
      "c.bb->p.kk on delete no action",
      "c.z->p.id on delete cascade",
      "c.z->p.id on delete set default",
      "q.id->p.id",
    ]);
    expect(
      await replay(
        `${fks}ALTER TABLE c DROP COLUMN z; ALTER TABLE c DROP CONSTRAINT c_z_fk;`,
      ),
    ).toBe(
      "m.sql: ALTER TABLE c drops constraint c_z_fk, a foreign key Kibi did not read (ALTER TABLE c DROP CONSTRAINT c_z_fk), so the schema after it is unknown",
    );
    expect(
      await replay(
        `${fks}ALTER TABLE q DROP CONSTRAINT q_id_fkey; ALTER TABLE q DROP CONSTRAINT q_id_fkey;`,
      ),
    ).toBe(
      "m.sql: ALTER TABLE q drops constraint q_id_fkey, a foreign key Kibi did not read (ALTER TABLE q DROP CONSTRAINT q_id_fkey), so the schema after it is unknown",
    );
    expect(
      await replay(
        "CREATE TABLE a (id int); CREATE TABLE b (id int, FOREIGN KEY (id) REFERENCES a (id)); ALTER TABLE a RENAME COLUMN id TO key;",
        "foreign_keys",
      ),
    ).toEqual(["b.id->a.key"]);
  });

  test("names the files that hold no table", async () => {
    const root = workspace({
      "a/1.sql": "SELECT 'create table x (y int)';",
      "b/2.sql": "",
    });
    expect(await members(root, sql(["a/*.sql", "b/*.sql"]))).toBe(
      "a/*.sql, b/*.sql holds no CREATE TABLE statement Kibi can read (2 files)",
    );
  });
});

describe("Prisma edges", () => {
  test("reads scalars, spacing and relations", async () => {
    const root = workspace({
      "s.prisma": `
enum  was{
  A
}
enum Role {
  B
}
type  Box{
  x Int
}
model  Thing{
  id   Int
  b    Boolean
  big  BigInt
  f    Float
  d    Decimal
  at   DateTime
  j    Json
  raw  Bytes
  box  Box?
  boxes Box[]
  roles Role[]
  // Stryker was here
  @@schema("a") id2 Int
  @@map( "things" )
}
model Plain {
  id Int
  name String @map( "full_name" )
  thing  Thing  @relation(fields:[thingId, ghost], references:[id, x], onDelete:SetNull)
  thingId Int
  self   Plain? @relation(fields: [selfId], references: [id])
  selfId Int?
  lost   Gone @relation(fields: [lostId], references: [id])
  lostId Int
  half   Thing @relation(fields: [thingId])
}
`,
    });
    const prisma = (select: string) =>
      members(root, {
        reader: "schema",
        format: "prisma",
        file: "s.prisma",
        select,
      });
    expect(await prisma("columns")).toEqual([
      "Plain.full_name",
      "Plain.id",
      "Plain.lostId",
      "Plain.selfId",
      "Plain.thingId",
      "things.at",
      "things.b",
      "things.big",
      "things.box",
      "things.d",
      "things.f",
      "things.id",
      "things.j",
      "things.raw",
      "things.roles",
    ]);
    expect(await prisma("foreign_keys")).toEqual([
      "Plain.lostId->Gone.id",
      "Plain.selfId->Plain.id",
      "Plain.thingId,ghost->things.id,x on delete set null",
    ]);
  });
});

describe("evaluated edges", () => {
  test("orders duplicate names and routes stably", async () => {
    const evaluate: SourceCodeEvaluator = async (_root, value) =>
      value.reader === "routes"
        ? {
            ok: true,
            routes: [
              { method: "GET", path: "/a", middleware: ["m2"] },
              { method: "GET", path: "/a", middleware: ["m1"] },
            ],
          }
        : {
            ok: true,
            entities: [
              { name: "B", columns: [], foreign_keys: ["2"] },
              { name: "A", columns: [], foreign_keys: [] },
              { name: "B", columns: [], foreign_keys: ["1"] },
            ],
          };
    const root = workspace();
    const routes = await readSource(
      root,
      spec({ reader: "routes", file: "a.ts", export: "app" }),
      evaluate,
    );
    expect(routes.ok && routes.model.routes).toEqual([
      { method: "GET", path: "/a", middleware: ["m2"] },
      { method: "GET", path: "/a", middleware: ["m1"] },
    ]);
    const entities = await readSource(
      root,
      spec({
        reader: "schema",
        format: "drizzle",
        file: "s.ts",
        select: "foreign_keys",
      }),
      evaluate,
    );
    expect(
      entities.ok && entities.model.entities?.map((row) => row.foreign_keys),
    ).toEqual([[], ["2"], ["1"]]);
  });
});

describe("import resolution edges", () => {
  const closureOf = (root: string, specifier: string) => {
    write(root, "src/probe.ts", `import "${specifier}";`);
    return importClosure(root, "src/probe.ts");
  };

  test("reads each import form and module suffix", () => {
    const root = workspace({
      "src/forms.ts": [
        'import a from"./a1";',
        'const b = import("./a2");',
        'const c = import( "./a3" );',
        'import  "./a4";',
        'const d = require ("./a5");',
        'export * from "./a6";',
      ].join("\n"),
      ...Object.fromEntries(
        ["a1.ts", "a2.ts", "a3.ts", "a4.ts", "a5.ts", "a6.ts"].map((file) => [
          `src/${file}`,
          "",
        ]),
      ),
    });
    expect(importClosure(root, "src/forms.ts")).toEqual(
      ["a1", "a2", "a3", "a4", "a5", "a6"].map((name) => `src/${name}.ts`),
    );
    const files: Record<string, string> = {
      "src/m.cts": "",
      "src/n.jsx": "",
      "src/o.mjs": "",
      "src/p.cjs": "",
      "src/q/index.tsx": "",
      "src/r/index.js": "",
      "src/s/index.mjs": "",
      "src/noext": "",
      "src/mod.jsx.ts": "",
      "src/t.mts": "",
    };
    for (const [file, contents] of Object.entries(files))
      write(root, file, contents);
    const expected: Record<string, string[]> = {
      "./m": ["src/m.cts"],
      "./n": ["src/n.jsx"],
      "./o": ["src/o.mjs"],
      "./p": ["src/p.cjs"],
      "./q": ["src/q/index.tsx"],
      "./r": ["src/r/index.js"],
      "./s": ["src/s/index.mjs"],
      "./noext.js": ["src/noext"],
      "./mod.jsx": ["src/mod.jsx.ts"],
      "./t.mjs": ["src/t.mts"],
    };
    for (const [specifier, closure] of Object.entries(expected))
      expect([specifier, closureOf(root, specifier)]).toEqual([
        specifier,
        closure,
      ]);
  });

  test("resolves workspace packages by name, subpath and manifest", () => {
    const pkg = (name: string, files: Record<string, string>) =>
      Object.fromEntries(
        Object.entries(files).map(([file, contents]) => [
          `packages/${name}/${file}`,
          contents,
        ]),
      );
    const root = workspace({
      ...pkg("solo", { "index.ts": "" }),
      ...pkg("plain", { "index.js": "" }),
      ...pkg("scoped", { "deep/file.ts": "", "src/onlysrc.ts": "" }),
      ...pkg("p-source", {
        "package.json": '{"exports":{".":{"source":"./lib/s.ts"}}}',
        "lib/s.ts": "",
      }),
      ...pkg("p-import", {
        "package.json": '{"exports":{"import":"./lib/i.ts"}}',
        "lib/i.ts": "",
      }),
      ...pkg("p-module", {
        "package.json": '{"exports":{"module":"./lib/m.ts"}}',
        "lib/m.ts": "",
      }),
      ...pkg("p-require", {
        "package.json": '{"exports":{"require":"./lib/r.ts"}}',
        "lib/r.ts": "",
      }),
      ...pkg("p-node", {
        "package.json": '{"exports":{"default":{"node":"./lib/n.ts"}}}',
        "lib/n.ts": "",
      }),
      ...pkg("t-source", {
        "package.json": '{"source":"./lib/ts.ts"}',
        "lib/ts.ts": "",
      }),
      ...pkg("t-module", {
        "package.json": '{"module":"./lib/tm.ts"}',
        "lib/tm.ts": "",
      }),
      ...pkg("t-main", {
        "package.json": '{"main":"./lib/tn.ts"}',
        "lib/tn.ts": "",
      }),
      ...pkg("types", {
        "package.json": '{"exports":"./t.d.ts"}',
        "t.d.ts": "",
      }),
      ...pkg("srcindex", { "src/index.mts": "" }),
      ...pkg("rootindex", { "index.cts": "", "package.json": "[]" }),
      "tsconfig.json":
        '{"compilerOptions":{"paths":{"@gone/*":["gone/*"],"~*/impl":["impl/*.ts"],"zab":["impl/x.ts"]}}}',
      "node_modules/installed/index.ts": "",
      "impl/x.ts": "",
    });
    for (const name of [
      "solo",
      "plain",
      "p-source",
      "p-import",
      "p-module",
      "p-require",
      "p-node",
      "t-source",
      "t-module",
      "t-main",
      "types",
      "srcindex",
      "rootindex",
    ])
      link(root, `packages/${name}`, `node_modules/${name}`);
    link(root, "packages/solo", "node_modules/@solo");
    link(root, "packages/scoped", "node_modules/@gone/pkg");
    link(root, "packages/scoped", "node_modules/@scope/pkg");
    const expected: Record<string, string[]> = {
      "@solo": [],
      solo: ["packages/solo/index.ts"],
      "plain//index": [],
      "@scope/pkg/deep/file": ["packages/scoped/deep/file.ts"],
      "@scope/pkg/onlysrc": ["packages/scoped/src/onlysrc.ts"],
      "@gone/pkg/deep/file": [],
      "~x/impl": ["impl/x.ts"],
      "~x/other": [],
      "p-source": ["packages/p-source/lib/s.ts"],
      "p-import": ["packages/p-import/lib/i.ts"],
      "p-module": ["packages/p-module/lib/m.ts"],
      "p-require": ["packages/p-require/lib/r.ts"],
      "p-node": ["packages/p-node/lib/n.ts"],
      "t-source": ["packages/t-source/lib/ts.ts"],
      "t-module": ["packages/t-module/lib/tm.ts"],
      "t-main": ["packages/t-main/lib/tn.ts"],
      types: [],
      srcindex: ["packages/srcindex/src/index.mts"],
      rootindex: ["packages/rootindex/index.cts"],
      zab: ["impl/x.ts"],
      zazab: [],
      installed: [],
    };
    for (const [specifier, closure] of Object.entries(expected))
      expect([specifier, closureOf(root, specifier)]).toEqual([
        specifier,
        closure,
      ]);
  });

  test("stops at the workspace root and refuses outside modules", () => {
    const outer = workspace({
      "tsconfig.json": '{"compilerOptions":{"paths":{"@up/*":["up/*"]}}}',
      "up/x.ts": "",
      "node_modules/uppkg/index.ts": "",
    });
    const root = workspace(
      { "src/a.ts": 'import "@up/x"; import "uppkg"; import "../../up/x";' },
      outer,
    );
    expect(importClosure(root, "src/a.ts")).toEqual([]);
    const elsewhere = workspace({ "index.js": "" });
    const linked = workspace({ "src/b.ts": 'import "far";' });
    mkdirSync(join(linked, "node_modules"));
    symlinkSync(elsewhere, join(linked, "node_modules/far"));
    expect(importClosure(linked, "src/b.ts")).toEqual([]);
  });

  test("follows tsconfig extends the way tsc does", () => {
    const chain = (prefix: string, depth: number) => {
      const files: Record<string, string> = {
        [`${prefix}/tsconfig.json`]: `{"extends":"./c1.json"}`,
        [`${prefix}/z/hit.ts`]: "",
        [`${prefix}/main.ts`]: 'import "@z/hit";',
      };
      for (let index = 1; index <= depth; index++)
        files[`${prefix}/c${index}.json`] =
          index === depth
            ? '{"compilerOptions":{"paths":{"@z/*":["z/*"]}}}'
            : `{"extends":"./c${index + 1}.json"}`;
      return files;
    };
    const root = workspace({
      ...chain("ten", 10),
      ...chain("eleven", 11),
      "mixed/tsconfig.json":
        '{"extends":[5, "./b.json", "./a.json", "pkg-config"]}',
      "mixed/pkg-config.json": '{"compilerOptions":{"paths":{"@p/*":["p/*"]}}}',
      "mixed/a.json": '{"compilerOptions":{"paths":{"@m/*":["a/*"]}}}',
      "mixed/b.json": '{"compilerOptions":{"paths":{"@m/*":["b/*"]}}}',
      "mixed/a/x.ts": "",
      "mixed/b/x.ts": "",
      "mixed/p/x.ts": "",
      "mixed/main.ts": 'import "@m/x"; import "@p/x";',
      "fallback/tsconfig.json": '{"extends":["./good.json", "./bad.json"]}',
      "fallback/good.json": '{"compilerOptions":{"paths":{"@g/*":["g/*"]}}}',
      "fallback/bad.json": "{}",
      "fallback/g/x.ts": "",
      "fallback/main.ts": 'import "@g/x";',
      "slashed/tsconfig.json": `{
  /*/ not closed here */
  "compilerOptions": { "paths": { "@s/*": ["s/*"] } }
}`,
      "slashed/s/x.ts": "",
      "slashed/main.ts": 'import "@s/x";',
    });
    expect(importClosure(root, "ten/main.ts")).toEqual(["ten/z/hit.ts"]);
    expect(importClosure(root, "eleven/main.ts")).toEqual([]);
    expect(importClosure(root, "mixed/main.ts")).toEqual(["mixed/a/x.ts"]);
    expect(importClosure(root, "fallback/main.ts")).toEqual([
      "fallback/g/x.ts",
    ]);
    expect(importClosure(root, "slashed/main.ts")).toEqual(["slashed/s/x.ts"]);
  });

  test("caps the closure at 5000 modules", () => {
    const files: Record<string, string> = {};
    for (let index = 0; index <= 5001; index++)
      files[`c/f${index}.ts`] = `import "./f${index + 1}";`;
    const root = workspace(files);
    expect(importClosure(root, "c/f0.ts")).toHaveLength(4999);
  });
});

describe("schema replay details", () => {
  const sql = async (text: string, select = "columns") =>
    members(workspace({ "m.sql": text }), {
      reader: "schema",
      format: "sql",
      files: "m.sql",
      select,
    });

  test("keeps dollar-quoted bodies whole", async () => {
    expect(
      await sql(
        "CREATE TABLE t (a int); CREATE FUNCTION f() AS $$ ; CREATE TABLE ghost (a int); $$; CREATE FUNCTION g() AS $body$ ; CREATE TABLE ghost2 (a int); $body$;",
        "tables",
      ),
    ).toEqual(["t"]);
    expect(await sql("CREATE TABLE db.app.items (id int);", "tables")).toEqual([
      "items",
    ]);
  });

  test("reads column names apart from their constraints", async () => {
    expect(
      await sql(
        'CREATE TABLE t ("not null" int, "primary key" int, b int NOT NULL, c int, d int, PRIMARY KEY(c));',
        "nullable_columns",
      ),
    ).toEqual(["t.d", "t.not null", "t.primary key"]);
  });

  test("tracks named and default constraints", async () => {
    const base = `CREATE TABLE p (id int, k int);
CREATE TABLE c (a int Constraint c_a_fk REFERENCES p (id), b int, FOREIGN KEY (b) REFERENCES p (k));`;
    expect(
      await sql(
        `${base} ALTER TABLE c DROP CONSTRAINT c_a_fk;`,
        "foreign_keys",
      ),
    ).toEqual(["c.b->p.k"]);
    expect(
      await sql(
        `${base} ALTER TABLE c DROP COLUMN a; ALTER TABLE c DROP CONSTRAINT c_b_fkey;`,
        "foreign_keys",
      ),
    ).toEqual([]);
  });

  test("passes over schema-neutral actions without a space before the parenthesis", async () => {
    for (const action of [
      "SET(fillfactor=70)",
      "RESET(fillfactor)",
      "ALTER COLUMN ab SET(n_distinct=1)",
      "ALTER COLUMN ab RESET(n_distinct)",
      "ALTER COLUMN ab OPTIONS(x 'y')",
      "ALTER ab SET DEFAULT 1",
    ])
      expect([
        action,
        await sql(`CREATE TABLE t (ab int); ALTER TABLE t ${action};`),
      ]).toEqual([action, ["t.ab"]]);
  });

  test("names a temporary CREATE TABLE form it cannot read", async () => {
    expect(await sql("CREATE TEMP TABLE t AS SELECT 1;")).toBe(
      "m.sql: Kibi cannot read this CREATE TABLE form (CREATE TEMP TABLE t AS SELECT 1)",
    );
  });

  test("orders tables and columns by name, keeping duplicates in order", async () => {
    const result = await read(
      workspace({
        "m.sql":
          "CREATE TABLE z (b int, a int, B int); CREATE TABLE a (x int); CREATE TABLE Z (y int);",
      }),
      {
        reader: "schema",
        format: "sql",
        files: "m.sql",
      },
    );
    expect(
      result.ok &&
        result.model.entities?.map((entity) => [
          entity.name,
          entity.columns.map((column) => column.name),
        ]),
    ).toEqual([
      ["Z", ["y"]],
      ["a", ["x"]],
      ["z", ["B", "a", "b"]],
    ]);
  });

  test("reads prisma enums, relations and reference lists", async () => {
    const root = workspace({
      "s.prisma": `
enum  Role{
  A
}
model User {
  id   Int
  k    Int
  role Role
  @@id([id, k])
}
model Post {
  id     Int
  uid    Int
  uk     Int @map("u_k")
  author User  @relation(fields: [uid, uk], references: [id,  k])
  @@x  other User @relation(fields: [uid], references: [id])
}
`,
    });
    const prisma = (select: string) =>
      members(root, {
        reader: "schema",
        format: "prisma",
        file: "s.prisma",
        select,
      });
    expect(await prisma("columns")).toContain("User.role");
    expect(await prisma("foreign_keys")).toEqual(["Post.uid,u_k->User.id,k"]);
  });
});
