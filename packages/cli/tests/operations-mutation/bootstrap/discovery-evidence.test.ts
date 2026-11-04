import { describe, expect, test } from "bun:test";
import { OperationError } from "../../../src/cli-errors.js";
import { scanEvidence } from "../../../src/operations/bootstrap/discovery-evidence.js";
import type { OperationContext } from "../../../src/public/operations/runtime-types.js";

const ROOT = "/ws";

type Calls = { glob: unknown[]; ignored: unknown[] };

function context(
  files: Record<string, string | null>,
  ignored: string[] = [],
  calls: Calls = { glob: [], ignored: [] },
): OperationContext {
  return {
    workspaceRoot: ROOT,
    signal: new AbortController().signal,
    clock: () => new Date("2026-08-20T00:00:00Z"),
    fs: {
      glob: async (patterns: readonly string[], options: unknown) => {
        calls.glob.push([patterns, options]);
        return Object.keys(files);
      },
      readFile: async (absolute: string) => {
        const content = files[absolute.slice(ROOT.length + 1)];
        if (content === null || content === undefined)
          throw new Error(`unreadable ${absolute}`);
        return content;
      },
    },
    git: {
      ignoredPaths: async (root: string, paths: readonly string[]) => {
        calls.ignored.push([root, [...paths]]);
        return ignored;
      },
    },
  } as unknown as OperationContext;
}

/** The provider and kind one file classifies as, or null when it yields none. */
async function classify(relativePath: string, content = "") {
  const scan = await scanEvidence(context({ [relativePath]: content }));
  const item = scan.evidence.find((e) => e.relativePath === relativePath);
  return item === undefined ? null : `${item.provider}/${item.kind}`;
}

async function data(relativePath: string, content = "") {
  const scan = await scanEvidence(context({ [relativePath]: content }));
  return scan.evidence.find((e) => e.label === relativePath)?.data;
}

const FRONT = "---\ntitle: x\n---\n";

describe("scanEvidence ports", () => {
  test("requires a globbing filesystem and an ignore-aware git", async () => {
    const base = context({});
    const message = "Bootstrap requires filesystem glob and git ignore ports.";
    for (const broken of [
      { ...base, fs: undefined },
      { ...base, fs: { readFile: async () => "" } },
      { ...base, fs: { glob: "no" } },
      { ...base, git: undefined },
      { ...base, git: {} },
      { ...base, git: { ignoredPaths: [] } },
    ]) {
      const error = await scanEvidence(
        broken as unknown as OperationContext,
      ).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(OperationError);
      expect((error as OperationError).code).toBe("OPERATION_FAILED");
      expect((error as OperationError).message).toBe(message);
    }
  });

  test("globs the scan patterns including ignored files and asks git about them", async () => {
    const calls: Calls = { glob: [], ignored: [] };
    const scan = await scanEvidence(
      context({ "b.md": "# b", "a.md": "# a" }, ["b.md"], calls),
    );
    expect(calls.glob).toStrictEqual([
      [
        [
          "**/*.md",
          "**/symbols.{yml,yaml}",
          "**/package.json",
          "**/tsconfig*.json",
          "**/pyproject.toml",
          "**/Cargo.toml",
          "**/go.mod",
          "**/opencode.json",
          "**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs,py,pyi,rb,go,rs,java,kt,swift,php,c,cc,cpp,cxx,h,hh,hpp,hxx,cs,sh,bash,tf,hcl,pl,plt}",
        ],
        { cwd: ROOT, includeIgnored: true },
      ],
    ]);
    expect(calls.ignored).toStrictEqual([[ROOT, ["a.md", "b.md"]]]);
    expect(scan).toStrictEqual({
      files: ["a.md", "b.md"],
      ignoredSources: ["b.md"],
      evidence: [
        {
          provider: "generic_repo_docs",
          kind: "generic_markdown",
          label: "a.md",
          relativePath: "a.md",
          absolutePath: "/ws/a.md",
          content: "# a",
          data: {},
        },
      ],
      warnings: [],
    });
  });

  test("sorts the ignored sources git reports", async () => {
    const scan = await scanEvidence(
      context({ "a.md": "", "b.md": "", "c.md": "" }, ["c.md", "a.md"]),
    );
    expect(scan.ignoredSources).toStrictEqual(["a.md", "c.md"]);
    expect(scan.evidence.map((e) => e.label)).toStrictEqual(["b.md"]);
  });
});

describe("file classification", () => {
  test("symbol manifests at the KB root", async () => {
    expect(await classify(".kb/symbols.yml")).toBe(
      "typed_kibi_docs/symbol_manifest",
    );
    expect(await classify(".kb/symbols.yaml")).toBe(
      "typed_kibi_docs/symbol_manifest",
    );
    expect(await classify(".KB/SYMBOLS.YML")).toBe(
      "typed_kibi_docs/symbol_manifest",
    );
    expect(await classify("x/.kb/symbols.yml")).toBe(null);
    expect(await classify(".kb/symbols.yml.bak")).toBe(null);
    expect(await classify(".kb/symbols.yaml.yml")).toBe(null);
  });

  test("code under the KB is generated, not project source", async () => {
    expect(await classify(".kb/schema/kb.pl", ":- module(kb, []).")).toBe(null);
    expect(await classify(".kb/x.ts")).toBe(null);
    expect(await classify("x/.kb/x.ts")).toBe("source_symbols/source_symbols");
    expect(await classify(".kb/notes.md")).toBe(
      "generic_repo_docs/generic_markdown",
    );
  });

  test("typed markdown needs front matter and a typed lane", async () => {
    for (const lane of [
      "requirements",
      "scenarios",
      "tests",
      "adr",
      "flags",
      "events",
      "facts",
    ]) {
      expect(await classify(`.kb/${lane}/a.md`, FRONT)).toBe(
        "typed_kibi_docs/typed_markdown",
      );
      expect(await classify(`documentation/${lane}/a.md`, FRONT)).toBe(
        "typed_kibi_docs/typed_markdown",
      );
    }
    expect(await classify("pkg/.kb/requirements/a.md", FRONT)).toBe(
      "typed_kibi_docs/typed_markdown",
    );
    expect(await classify(".kb/requirements/A.MD", "---\r\nx: 1\r\n")).toBe(
      "typed_kibi_docs/typed_markdown",
    );
    expect(await classify(".kb/requirements/a.md", "---  \nx: 1\n")).toBe(
      "typed_kibi_docs/typed_markdown",
    );
    const generic = "generic_repo_docs/generic_markdown";
    expect(await classify(".kb/requirements/a.md", "# no front matter")).toBe(
      generic,
    );
    expect(await classify(".kb/requirements/a.md", "x\n---\n")).toBe(generic);
    expect(await classify(".kb/requirements/a.md", "---x\n")).toBe(generic);
    expect(await classify(".kb/requirements/a.md", "---")).toBe(generic);
    expect(await classify(".kb/other/a.md", FRONT)).toBe(generic);
    expect(await classify("xkb/requirements/a.md", FRONT)).toBe(generic);
    expect(await classify("a.kb/requirements/a.md", FRONT)).toBe(generic);
    expect(await classify(".kb/requirements.md", FRONT)).toBe(generic);
    expect(await classify("docs/a.md", FRONT)).toBe(generic);
    expect(await classify("README.md")).toBe(generic);
    expect(await classify("README.MD")).toBe(generic);
    expect(await classify("src/a.md.ts")).toBe("source_symbols/source_symbols");
  });

  test("windows separators still name a typed lane", async () => {
    expect(await classify(".kb\\requirements\\a.md", FRONT)).toBe(
      "typed_kibi_docs/typed_markdown",
    );
  });

  test("executable test harnesses are not typed markdown", async () => {
    const generic = "generic_repo_docs/generic_markdown";
    expect(await classify(".kb/tests/e2e/a.md", FRONT)).toBe(generic);
    expect(await classify(".kb/tests/benchmarks/a.md", FRONT)).toBe(generic);
    expect(await classify("documentation/tests/e2e/a.md", FRONT)).toBe(generic);
    expect(await classify("pkg/.kb/tests/e2e/a.md", FRONT)).toBe(generic);
    expect(await classify(".kb\\tests\\e2e\\a.md", FRONT)).toBe(generic);
    expect(await classify(".kb/tests/e2e.md", FRONT)).toBe(
      "typed_kibi_docs/typed_markdown",
    );
    expect(await classify(".kb/tests/unit/a.md", FRONT)).toBe(
      "typed_kibi_docs/typed_markdown",
    );
    expect(await classify("x.kb/tests/e2e/a.md", FRONT)).toBe(generic);
  });

  test("repository metadata files", async () => {
    for (const file of [
      "package.json",
      "pkg/package.json",
      "tsconfig.json",
      "tsconfig.build.json",
      "pkg/tsconfig.json",
      "pyproject.toml",
      "Cargo.toml",
      "go.mod",
    ])
      expect(await classify(file, "{}")).toBe("repo_metadata/repo_metadata");
    expect(await classify("mypackage.json", "{}")).toBe(null);
    expect(await classify("opencode.json", "{}")).toBe(null);
    expect(await classify("tsconfig/x.json", "{}")).toBe(null);
    expect(await classify("package.json.bak", "{}")).toBe(null);
    expect(await classify("xgo.mod", "{}")).toBe(null);
  });

  test("test topology files", async () => {
    for (const file of [
      "a.test.ts",
      "a.spec.js",
      "A.TEST.TS",
      "src/__tests__/a.ts",
      "__tests__/a.ts",
      "suite.plt",
      "SUITE.PLT",
    ])
      expect(await classify(file)).toBe("test_topology/test_topology");
    expect(await classify("a.test.")).toBe(null);
    expect(await classify("a.test.ts.md")).toBe(
      "generic_repo_docs/generic_markdown",
    );
    expect(await classify("x__tests__/a.ts")).toBe(
      "source_symbols/source_symbols",
    );
    expect(await classify("testing.ts")).toBe("source_symbols/source_symbols");
    expect(await classify("x.test.ab.ts")).toBe(
      "source_symbols/source_symbols",
    );
    expect(await classify("a.plt.ts")).toBe("source_symbols/source_symbols");
  });

  test("only Prolog .pl files are source", async () => {
    expect(await classify("x.pl", ":- module(x, []).\n")).toBe(
      "source_symbols/source_symbols",
    );
    expect(await classify("x.PL", ":- module(x, []).\n")).toBe(
      "source_symbols/source_symbols",
    );
    expect(await classify("x.pl", "#!/usr/bin/perl\nuse strict;\n")).toBe(null);
  });

  test("code extensions are source symbols", async () => {
    for (const ext of [
      "ts",
      "tsx",
      "mts",
      "cts",
      "js",
      "jsx",
      "mjs",
      "cjs",
      "py",
      "pyi",
      "rb",
      "go",
      "rs",
      "java",
      "kt",
      "swift",
      "php",
      "c",
      "cc",
      "cpp",
      "cxx",
      "h",
      "hh",
      "hpp",
      "hxx",
      "cs",
      "sh",
      "bash",
      "tf",
      "hcl",
      "TS",
    ])
      expect(await classify(`src/a.${ext}`)).toBe(
        "source_symbols/source_symbols",
      );
    expect(await classify("src/a.ts.txt")).toBe(null);
    expect(await classify("src/a.json")).toBe(null);
    expect(await classify("src/ats")).toBe(null);
  });
});

describe("evidence data", () => {
  test("package.json languages come from its text", async () => {
    expect(
      await data("package.json", JSON.stringify({ bin: "cli.ts" })),
    ).toStrictEqual({
      title: "Repository metadata: package.json",
      factKind: "meta",
      confidence: 0.86,
      evidence: ["repo_metadata:package.json"],
      languages: ["typescript"],
    });
    const languages = async (file: string, content: string) =>
      (await data(file, content))?.languages;
    for (const ext of ["ts", "tsx", "mts", "cts"])
      expect(
        await languages("package.json", `{"main":"a.${ext}"}`),
      ).toStrictEqual(["typescript"]);
    for (const ext of ["js", "jsx", "mjs", "cjs"])
      expect(
        await languages("package.json", `{"main":"a.${ext}"}`),
      ).toStrictEqual(["javascript"]);
    expect(
      await languages("package.json", '{"scripts":{"start":"node x"}}'),
    ).toStrictEqual(["javascript"]);
    expect(
      await languages("package.json", '{"main":"a.ts","b":"a.js"}'),
    ).toStrictEqual(["typescript", "javascript"]);
    expect(await languages("package.json", '{"main":"a.tsv"}')).toStrictEqual(
      [],
    );
    expect(await languages("package.json", '{"main":"a.json"}')).toStrictEqual(
      [],
    );
    expect(await languages("package.json", '{"main":"nodes"}')).toStrictEqual(
      [],
    );
    expect(await languages("package.json", '{"main":"ats"}')).toStrictEqual([]);
    expect(
      await languages("pkg/package.json", '{"main":"a.ts"}'),
    ).toStrictEqual(["typescript"]);
    expect(await languages("tsconfig.json", '{"main":"a.ts"}')).toStrictEqual(
      [],
    );
  });

  test("an unparsable package.json warns and has no languages", async () => {
    const scan = await scanEvidence(context({ "package.json": "{a.ts" }));
    expect(scan.warnings).toStrictEqual([
      "repo_metadata:failed_to_parse:package.json",
    ]);
    expect(scan.evidence[0]?.data).toStrictEqual({
      title: "Repository metadata: package.json",
      factKind: "meta",
      confidence: 0.86,
      evidence: ["repo_metadata:package.json"],
      languages: [],
    });
    const nested = await scanEvidence(context({ "a/package.json": "{" }));
    expect(nested.warnings).toStrictEqual([
      "repo_metadata:failed_to_parse:a/package.json",
    ]);
    const tsconfig = await scanEvidence(context({ "tsconfig.json": "{" }));
    expect(tsconfig.warnings).toStrictEqual([]);
  });

  test("other metadata files name their language", async () => {
    expect(await data("Cargo.toml")).toStrictEqual({
      title: "Repository metadata: Cargo.toml",
      factKind: "meta",
      confidence: 0.86,
      evidence: ["repo_metadata:Cargo.toml"],
      languages: ["rust"],
    });
    expect((await data("go.mod"))?.languages).toStrictEqual(["go"]);
    expect((await data("pyproject.toml"))?.languages).toStrictEqual(["python"]);
    expect(await data("pkg/tsconfig.base.json", "{}")).toStrictEqual({
      title: "Repository metadata: tsconfig.base.json",
      factKind: "meta",
      confidence: 0.9,
      evidence: ["repo_metadata:pkg/tsconfig.base.json"],
      languages: [],
    });
  });

  test("test topology names the frameworks it recognizes", async () => {
    expect(
      await data(
        "a.test.ts",
        'import "bun:test"; import "vitest"; import "node:test";\n:- begin_tests(x).',
      ),
    ).toStrictEqual({
      title: "Test topology: bun:test, vitest, node:test, plunit",
      factKind: "observation",
      confidence: 0.92,
      evidence: [
        "test_topology:a.test.ts",
        "framework:bun:test",
        "framework:vitest",
        "framework:node:test",
        "framework:plunit",
      ],
      frameworks: ["bun:test", "vitest", "node:test", "plunit"],
      claim:
        "a.test.ts is a test file that runs under bun:test, vitest, node:test, plunit.",
    });
    expect(await data("a.test.ts", "plain")).toStrictEqual({
      title: "Test topology: a.test.ts",
      factKind: "observation",
      confidence: 0.85,
      evidence: ["test_topology:a.test.ts"],
      frameworks: [],
    });
    expect(
      (await data("s.plt", "x.\n:-  begin_tests(y)."))?.frameworks,
    ).toStrictEqual(["plunit"]);
    expect(
      (await data("s.plt", "x :- begin_tests(y)."))?.frameworks,
    ).toStrictEqual([]);
    expect(
      (await data("s.plt", ":-begin_tests (y)."))?.frameworks,
    ).toStrictEqual([]);
  });

  test("source modules count declared symbols", async () => {
    expect(
      await data(
        "src/lib/a.ts",
        "export function f() {}\nclass C {}\nconst x = 1;\nlet y;\nvar z;\ninterface I {}\ntype T = 1;\nexport   const $w = 2;\nconst _u = 3;\nconst  two = 4;\nfunctions g\nmyconst q = 1;\n",
      ),
    ).toStrictEqual({
      title: "Source module: a",
      factKind: "observation",
      confidence: 0.82,
      evidence: ["source_symbols:src/lib/a.ts"],
      analysisMode: "parser",
      symbolCount: 10,
    });
    expect((await data("a.ts", "const 1x = 1;"))?.symbolCount).toBe(0);
    expect((await data("a.ts", "const"))?.symbolCount).toBe(0);
  });
});

describe("Prolog module evidence", () => {
  test("names the module and its exports", async () => {
    expect(
      await data(
        "src/kb.pl",
        "% header\n:- module(kb, [ load/1, % loads see helper/2\n  'odd name'/2, op//3, x/a, big/ 10, b%c\n/2 ]).\n",
      ),
    ).toStrictEqual({
      title: "Source module: kb",
      factKind: "observation",
      confidence: 0.82,
      evidence: ["source_symbols:src/kb.pl"],
      analysisMode: "parser",
      symbolCount: 5,
      module: "kb",
      exports: ["load/1", "'odd name'/2", "op//3", "big/10", "b/2"],
      claim:
        "Prolog module kb (src/kb.pl) exports load/1, 'odd name'/2, op//3, big/10, b/2.",
    });
  });

  test("quoted module names lose their quotes", async () => {
    const d = await data("q.pl", ":- module( 'my mod' ,[a/0]).");
    expect(d?.module).toBe("my mod");
    expect(d?.title).toBe("Source module: my mod");
    expect(d?.exports).toStrictEqual(["a/0"]);
    expect((await data("q.pl", ":- module('it''s', [a/0])."))?.module).toBe(
      "it''s",
    );
  });

  test("a module with no exports has no claim", async () => {
    expect(await data("e.pl", ":- module(e, []).")).toStrictEqual({
      title: "Source module: e",
      factKind: "observation",
      confidence: 0.82,
      evidence: ["source_symbols:e.pl"],
      analysisMode: "parser",
      symbolCount: 0,
      module: "e",
      exports: [],
    });
  });

  test("a file without a module declaration is named by its path", async () => {
    expect(await data("lib/plain.pl", "foo(X) :- bar(X).\n")).toStrictEqual({
      title: "Source module: plain",
      factKind: "observation",
      confidence: 0.82,
      evidence: ["source_symbols:lib/plain.pl"],
      analysisMode: "parser",
      symbolCount: 0,
      exports: [],
    });
    for (const content of [
      "x :- module(m, [a/1]).",
      ":- module(M, [a/1]).",
      ":- module(m [a/1]).",
      ":- module(m, a/1).",
      ":- module(m, [a/1)",
      "  :- module(m, [a/1]).",
    ])
      expect((await data("p.pl", `x.\n${content}`))?.module).toBe(undefined);
  });

  test("the directive may omit the space after its neck", async () => {
    expect((await data("m.pl", "x(1).\n:-module(m3, [a/1]).\n"))?.module).toBe(
      "m3",
    );
  });

  test("source that only mentions a .pl name is not Prolog", async () => {
    expect(await data("src/a.pl.ts", "const a = 1;")).toStrictEqual({
      title: "Source module: a.pl",
      factKind: "observation",
      confidence: 0.82,
      evidence: ["source_symbols:src/a.pl.ts"],
      analysisMode: "parser",
      symbolCount: 1,
    });
  });

  test("the declaration may start any line", async () => {
    expect((await data("m.pl", "% x\n:- module(m2, [a/1]).\n"))?.module).toBe(
      "m2",
    );
    expect(
      (await data("m.pl", ":- module(m_X9, [a/1]).\n"))?.exports,
    ).toStrictEqual(["a/1"]);
  });
});

describe("unreadable files", () => {
  test("warn under the provider the path suggests", async () => {
    const scan = await scanEvidence(
      context({
        "a.test.ts": null,
        "b.spec.js": null,
        "c.ts": null,
        "d.md": null,
        "e.TEST.TS": null,
        "f.test.": null,
        "g.PY": null,
        "h.spec.ab.ts": null,
      }),
    );
    expect(scan.warnings).toStrictEqual([
      "test_topology:failed_to_read:a.test.ts",
      "test_topology:failed_to_read:b.spec.js",
      "source_symbols:failed_to_analyze:c.ts",
      "generic_repo_docs:failed_to_analyze:d.md",
      "test_topology:failed_to_read:e.TEST.TS",
      "generic_repo_docs:failed_to_analyze:f.test.",
      "source_symbols:failed_to_analyze:g.PY",
      "source_symbols:failed_to_analyze:h.spec.ab.ts",
    ]);
    expect(scan.evidence).toStrictEqual([]);
  });
});

describe("layout evidence", () => {
  test("names each known top-level directory once, after the files", async () => {
    const scan = await scanEvidence(
      context({
        "src/a.json": "",
        "src/b.json": "",
        "tests/x.json": "",
        "lib/c.json": "",
        "docs/x.json": "",
        "app/x.json": "",
        "apps/x.json": "",
        "packages/x.json": "",
        "test/x.json": "",
        "scripts/x.json": "",
        "x/src/a.json": "",
        "README.md": "# r",
        "srcx/a.json": "",
      }),
    );
    expect(scan.evidence.map((e) => e.label)).toStrictEqual([
      "README.md",
      "app",
      "apps",
      "docs",
      "packages",
      "scripts",
      "src",
      "test",
      "tests",
    ]);
    expect(scan.warnings).toStrictEqual([]);
    expect(scan.evidence[6]).toStrictEqual({
      provider: "repo_layout",
      kind: "repo_layout",
      label: "src",
      relativePath: "src",
      absolutePath: "/ws/src",
      data: {
        title: "Repository layout: src directory",
        factKind: "observation",
        confidence: 0.84,
        evidence: ["repo_layout:src"],
      },
    });
  });

  test("an ignored directory is not a layout root", async () => {
    const scan = await scanEvidence(
      context({ "src/a.json": "" }, ["src/a.json"]),
    );
    expect(scan.evidence).toStrictEqual([]);
  });

  test("the root is the first path segment, even for a bare file", async () => {
    const scan = await scanEvidence(context({ src: "" }));
    expect(scan.evidence.map((e) => e.label)).toStrictEqual(["src"]);
  });
});
