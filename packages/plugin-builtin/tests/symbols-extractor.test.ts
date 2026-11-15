import { afterEach, describe, expect, spyOn, test } from "bun:test";
import {
  ClassDeclaration,
  MethodDeclaration,
  Project,
  VariableDeclaration,
} from "ts-morph";
import {
  createBuiltinTsMorphSourceAnalysisProvider,
  createBuiltinTsMorphSymbolExtractor,
  createBuiltinTsMorphSymbolExtractorV2,
} from "../src/symbols/ts-morph-extractor.js";
import {
  ANON,
  ANON_V2_SYMBOLS,
  MALFORMED,
  MALFORMED_V2,
  PAIRS,
  PAIRS_V2_SYMBOLS,
  RICH,
  RICH_V1_SYMBOLS,
  RICH_V2_SYMBOLS,
  TYPED_JS,
  TYPED_JS_V2,
} from "./symbols-fixtures.js";

const spies: { mockRestore(): void }[] = [];
afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
});

const SUPPORTED = [
  "a.ts",
  "a.tsx",
  "a.js",
  "a.jsx",
  "a.mts",
  "a.cts",
  "a.mjs",
  "a.cjs",
];

function captureProjects(): Project[] {
  const projects: Project[] = [];
  const createSourceFile = Project.prototype.createSourceFile;
  spies.push(
    spyOn(Project.prototype, "createSourceFile").mockImplementation(function (
      this: Project,
      ...args: Parameters<Project["createSourceFile"]>
    ) {
      projects.push(this);
      return createSourceFile.apply(this, args);
    }),
  );
  return projects;
}

function failingMethod<T extends object>(
  prototype: T,
  method: keyof T & string,
  message: string,
): void {
  spies.push(
    // biome-ignore lint/suspicious/noExplicitAny: prototype patching in tests
    spyOn(prototype as any, method).mockImplementation(() => {
      throw new Error(message);
    }),
  );
}

describe("v1 symbol extractor", () => {
  test("has a stable id and supports exactly the JS/TS extensions", () => {
    const extractor = createBuiltinTsMorphSymbolExtractor();
    expect(extractor.id).toBe("kibi-plugin-builtin.ts-morph");
    for (const file of SUPPORTED) {
      expect([file, extractor.supports({ path: `src/${file}` })]).toEqual([
        file,
        true,
      ]);
      expect(extractor.supports({ path: `src/${file.toUpperCase()}` })).toBe(
        true,
      );
    }
    for (const file of ["a.md", "Makefile", "a.ts.bak", "src/.ts"]) {
      expect([file, extractor.supports({ path: file })]).toEqual([file, false]);
    }
  });

  test("extracts every exported declaration kind", () => {
    const result = createBuiltinTsMorphSymbolExtractor().analyze({
      path: "src/mod.ts",
      content: RICH,
    });
    expect(result).toStrictEqual({
      sourceFile: "src/mod.ts",
      language: "typescript",
      module: { title: "mod", language: "typescript", analysisMode: "parser" },
      symbols: RICH_V1_SYMBOLS,
    });
  });

  test("infers the language and module title from the file name", () => {
    const extractor = createBuiltinTsMorphSymbolExtractor();
    const cases: Array<[string, string, string]> = [
      ["src/a.ts", "typescript", "a"],
      ["src/a.TSX", "typescript", "a"],
      ["src/a.mts", "typescript", "a"],
      ["src/a.cts", "typescript", "a"],
      ["src/a.js", "javascript", "a"],
      ["src/a.jsx", "javascript", "a"],
      ["src/a.mjs", "javascript", "a"],
      ["src/a.cjs", "javascript", "a"],
      ["src/.ts", "javascript", ".ts"],
      ["src/a.b.ts", "typescript", "a.b"],
    ];
    for (const [file, language, title] of cases) {
      const result = extractor.analyze({ path: file, content: "" });
      expect([file, result.language, result.module]).toStrictEqual([
        file,
        language,
        { title, language, analysisMode: "parser" },
      ]);
    }
  });

  test("analyzes given content even when a file exists at that path", () => {
    const result = createBuiltinTsMorphSymbolExtractor().analyze({
      path: import.meta.path,
      content: "export const only = 1;",
    });
    expect(result.symbols.map((symbol) => symbol.name)).toStrictEqual(["only"]);
  });

  test("reuses one project across analyses and drops each analyzed file", () => {
    const projects = captureProjects();
    const extractor = createBuiltinTsMorphSymbolExtractor();
    extractor.analyze({ path: "src/a.ts", content: "export const a = 1;" });
    extractor.analyze({ path: "src/b.ts", content: "export const b = 1;" });
    expect(projects).toHaveLength(2);
    expect(projects[0]).toBe(projects[1] as Project);
    expect(projects[0]?.getSourceFiles()).toStrictEqual([]);
    expect(projects[0]?.getCompilerOptions()).toStrictEqual({});
  });

  test("keeps the class symbol when its member walk fails", () => {
    failingMethod(ClassDeclaration.prototype, "getMethods", "walk failed");
    const result = createBuiltinTsMorphSymbolExtractor().analyze({
      path: "src/box.ts",
      content: "export class Box { run() {} }\nexport const after = 1;",
    });
    expect(result.symbols.map((symbol) => symbol.name)).toStrictEqual([
      "Box",
      "after",
    ]);
  });

  test("keeps the variable symbol when its class expression walk fails", () => {
    failingMethod(
      VariableDeclaration.prototype,
      "getInitializerIfKind",
      "initializer failed",
    );
    const result = createBuiltinTsMorphSymbolExtractor().analyze({
      path: "src/box.ts",
      content: "export const Box = class { run() {} }, other = 1;",
    });
    expect(result.symbols.map((symbol) => symbol.name)).toStrictEqual([
      "Box",
      "other",
    ]);
  });

  test("skips only the member whose extraction fails", () => {
    // getEnd is shared by every node and read only while a symbol is built,
    // so fail it for methods alone.
    const original = MethodDeclaration.prototype.getEnd;
    spies.push(
      spyOn(MethodDeclaration.prototype, "getEnd").mockImplementation(function (
        this: unknown,
      ) {
        if (this instanceof MethodDeclaration) throw new Error("method failed");
        return original.call(this as MethodDeclaration);
      }),
    );
    const result = createBuiltinTsMorphSymbolExtractor().analyze({
      path: "src/box.ts",
      content: "export class Box { run() {} size = 1; }",
    });
    expect(result.symbols.map((symbol) => symbol.name)).toStrictEqual([
      "Box",
      "Box.size",
    ]);
  });

  test("tolerates declaration doubles that omit AST accessors", () => {
    const at = (offset: number) => ({
      getStart: () => offset,
      getEnd: () => offset + 1,
    });
    const sourceFile = {
      getFullText: () => "0123456789",
      getLineAndColumnAtPos: (pos: number) => ({ line: pos, column: pos + 1 }),
      getFunctions: () => [
        {
          isExported: () => true,
          getName: () => "bare",
          getNameNode: () => at(1),
          getEnd: () => 2,
        },
      ],
      getClasses: () => [
        {
          isExported: () => true,
          getName: () => "Shell",
          getNameNode: () => at(3),
          getStart: () => 3,
          getEnd: () => 4,
        },
        {
          isExported: () => true,
          getName: () => "NoStart",
          getNameNode: () => at(5),
          getFullStart: () => 0,
          getEnd: () => 6,
        },
      ],
      getInterfaces: () => [],
      getTypeAliases: () => [],
      getEnums: () => [
        {
          isExported: () => true,
          getName: () => "Flag",
          getNameNode: () => at(6),
          getEnd: () => 7,
          getText: () => "enum Flag {}",
        },
      ],
      getVariableStatements: () => [
        {
          isExported: () => true,
          getDeclarations: () => [
            {
              getName: () => "value",
              getNameNode: () => at(8),
              getEnd: () => 9,
              getText: () => "value = 1",
            },
          ],
        },
      ],
    };
    spies.push(
      spyOn(Project.prototype, "createSourceFile").mockImplementation(
        () => sourceFile as never,
      ),
      spyOn(Project.prototype, "removeSourceFile").mockImplementation(
        () => true,
      ),
    );
    const span = (start: number, end: number) => ({
      startLine: start,
      startColumn: start,
      endLine: end,
      endColumn: end,
    });
    expect(
      createBuiltinTsMorphSymbolExtractor().analyze({
        path: "src/doubles.ts",
        content: "",
      }).symbols,
    ).toStrictEqual([
      { name: "bare", kind: "function", ...span(1, 2) },
      { name: "Shell", kind: "class", ...span(3, 4) },
      { name: "NoStart", kind: "class", ...span(5, 6) },
      {
        name: "Flag",
        kind: "enum",
        ...span(6, 7),
      },
      {
        name: "value",
        kind: "variable",
        ...span(8, 9),
      },
    ]);
  });

  test("the source analysis provider adapts the v1 extractor", () => {
    const provider = createBuiltinTsMorphSourceAnalysisProvider();
    expect(provider.supportsFile("src/a.ts")).toBe(true);
    expect(provider.supportsFile("src/a.md")).toBe(false);
    expect(
      provider.analyzeText("src/a.ts", "export const a = 1;").symbols,
    ).toStrictEqual([
      {
        name: "a",
        kind: "variable",
        startLine: 1,
        startColumn: 13,
        endLine: 1,
        endColumn: 18,
      },
    ]);
  });
});

describe("v2 symbol extractor", () => {
  test("has a stable id and supports by extension and language hint", () => {
    const extractor = createBuiltinTsMorphSymbolExtractorV2();
    expect(extractor.id).toBe("kibi-plugin-builtin.ts-morph.v2");
    const cases: Array<[string, string | undefined, boolean]> = [
      ...SUPPORTED.map((file): [string, undefined, boolean] => [
        `src/${file}`,
        undefined,
        true,
      ]),
      ["src/A.TS", undefined, true],
      ["src/a.ts", "typescript", true],
      ["src/a.ts", " TS ", true],
      ["src/a.ts", "javascript", false],
      ["src/a.ts", "python", false],
      ["src/a.ts", "", false],
      ["src/a.js", "js", true],
      ["src/a.mjs", "node", true],
      ["src/a.cjs", "NodeJS", true],
      ["src/a.jsx", "JavaScript", true],
      ["src/a.js", "typescript", false],
      ["bin/run", "ts", true],
      ["bin/run", "typescript", true],
      ["bin/run", "js", true],
      ["bin/run", "javascript", true],
      ["bin/run", "node", true],
      ["bin/run", "nodejs", true],
      ["bin/run", "python", false],
      ["bin/run", undefined, false],
      ["src/a.md", undefined, false],
      ["src/a.md", "typescript", false],
    ];
    for (const [file, language, supported] of cases) {
      expect([
        file,
        language,
        extractor.supports({
          path: file,
          ...(language === undefined ? {} : { language }),
        }),
      ]).toStrictEqual([file, language, supported]);
    }
  });

  test("reports unsupported sources with the extension in the message", async () => {
    const extractor = createBuiltinTsMorphSymbolExtractorV2();
    expect(
      await extractor.analyze({ path: "docs/readme.md", content: "# Notes" }),
    ).toStrictEqual({
      contractVersion: "kibi.symbol-extractor.v2",
      status: "unsupported",
      sourceFile: "docs/readme.md",
      language: "unknown",
      module: {
        title: "readme",
        language: "unknown",
        analysisMode: "parser",
      },
      symbols: [],
      diagnostics: [
        {
          code: "UNSUPPORTED_SOURCE_TYPE",
          message:
            "The built-in ts-morph extractor does not support '.md' files",
        },
      ],
      uncoveredRanges: [],
    });
    const extensionless = await extractor.analyze({
      path: "bin/run",
      content: "print(1)",
      language: " Python ",
    });
    expect(extensionless.status).toBe("unsupported");
    expect(extensionless.language).toBe("Python");
    expect(extensionless.module.language).toBe("Python");
    expect(extensionless.diagnostics).toStrictEqual([
      {
        code: "UNSUPPORTED_SOURCE_TYPE",
        message:
          "The built-in ts-morph extractor does not support 'extensionless' files",
      },
    ]);
  });

  test("reports the normalized, hinted, or inferred language", async () => {
    const extractor = createBuiltinTsMorphSymbolExtractorV2();
    const cases: Array<[string, string | undefined, string]> = [
      ["src/a.ts", undefined, "typescript"],
      ["src/a.mjs", undefined, "javascript"],
      ["src/a.ts", " TS ", "typescript"],
      ["src/a.js", "node", "javascript"],
      ["src/a.ts", "   ", "typescript"],
      ["src/a.js", "", "javascript"],
      ["src/a.ts", " Ruby ", "Ruby"],
      ["bin/run", "   ", "unknown"],
      ["bin/run", undefined, "unknown"],
      ["src/a.md", undefined, "unknown"],
    ];
    for (const [file, language, expected] of cases) {
      const result = await extractor.analyze({
        path: file,
        content: "",
        ...(language === undefined ? {} : { language }),
      });
      expect([file, language, result.language, result.module]).toStrictEqual([
        file,
        language,
        expected,
        {
          title: file.split("/")[1]?.split(".")[0],
          language: expected,
          analysisMode: "parser",
        },
      ]);
    }
  });

  test("parses extensionless sources with the hinted language", async () => {
    const extractor = createBuiltinTsMorphSymbolExtractorV2();
    const content = "export const a: number = 1;";
    const asTs = await extractor.analyze({
      path: "bin/run",
      content,
      language: "ts",
    });
    expect(asTs.status).toBe("ok");
    expect(asTs.language).toBe("typescript");
    expect(asTs.symbols.map((symbol) => symbol.name)).toStrictEqual(["a"]);
    const asJs = await extractor.analyze({
      path: "bin/run",
      content,
      language: "js",
    });
    expect(asJs.status).toBe("partial");
    expect(asJs.language).toBe("javascript");
    expect(asJs.diagnostics.map((diagnostic) => diagnostic.code)).toStrictEqual(
      ["TS8010"],
    );
  });

  test("parses each extension with its script kind", async () => {
    const extractor = createBuiltinTsMorphSymbolExtractorV2();
    // A generic arrow is TypeScript in .ts/.mts/.cts and JSX elsewhere.
    const content =
      "export const el = <T>(x) => x;\nexport function after() {}\n";
    for (const file of ["src/a.ts", "src/a.mts", "src/a.cts"]) {
      const result = await extractor.analyze({ path: file, content });
      expect([file, result.status]).toStrictEqual([file, "ok"]);
    }
    for (const file of ["src/a.tsx", "src/a.jsx", "src/a.js"]) {
      const result = await extractor.analyze({ path: file, content });
      expect([file, result.status]).toStrictEqual([file, "partial"]);
    }
  });

  test("reports syntax diagnostics with exact ranges", async () => {
    const extractor = createBuiltinTsMorphSymbolExtractorV2();
    expect(
      await extractor.analyze({ path: "src/malformed.ts", content: MALFORMED }),
    ).toStrictEqual(MALFORMED_V2);
    expect(
      await extractor.analyze({ path: "src/typed.js", content: TYPED_JS }),
    ).toStrictEqual(TYPED_JS_V2);
  });

  test("adds qualified names, native kinds and name ranges", async () => {
    const extractor = createBuiltinTsMorphSymbolExtractorV2();
    const rich = await extractor.analyze({ path: "src/mod.ts", content: RICH });
    expect(rich.status).toBe("ok");
    expect(rich.symbols).toStrictEqual(RICH_V2_SYMBOLS);
  });

  test("merges complementary accessor pairs in source order", async () => {
    const result = await createBuiltinTsMorphSymbolExtractorV2().analyze({
      path: "src/pairs.ts",
      content: PAIRS,
    });
    expect(result.symbols).toStrictEqual(PAIRS_V2_SYMBOLS);
  });

  test("leaves members of anonymous classes unqualified", async () => {
    const result = await createBuiltinTsMorphSymbolExtractorV2().analyze({
      path: "src/anon.ts",
      content: ANON,
    });
    expect(result.symbols).toStrictEqual(ANON_V2_SYMBOLS);
  });

  test("builds one syntax-only project and drops each analyzed file", async () => {
    const projects = captureProjects();
    const extractor = createBuiltinTsMorphSymbolExtractorV2();
    await extractor.analyze({ path: "src/a.ts", content: "export {};" });
    const onDisk = await extractor.analyze({
      path: import.meta.path,
      content: "export const only = 1;",
    });
    expect(onDisk.status).toBe("ok");
    expect(onDisk.symbols.map((symbol) => symbol.name)).toStrictEqual(["only"]);
    expect(projects).toHaveLength(2);
    expect(projects[0]).toBe(projects[1] as Project);
    expect(projects[0]?.getSourceFiles()).toStrictEqual([]);
    expect(projects[0]?.getCompilerOptions()).toStrictEqual({
      noLib: true,
      noResolve: true,
      types: [],
    });
  });

  test("tolerates declaration doubles that omit class and initializer accessors", async () => {
    const node = (kind: string, start: number) => ({
      getKindName: () => kind,
      getStart: () => start,
      getEnd: () => start + 1,
    });
    const sourceFile = {
      getFullText: () => "",
      getLineAndColumnAtPos: (pos: number) => ({ line: pos, column: pos + 1 }),
      getProject: () => ({
        getProgram: () => ({ getSyntacticDiagnostics: () => [] }),
      }),
      getFunctions: () => [],
      getClasses: () => [
        {
          isExported: () => true,
          getName: () => "Shell",
          getNameNode: () => node("Identifier", 1),
          getKindName: () => "ClassDeclaration",
          getEnd: () => 3,
        },
      ],
      getInterfaces: () => [],
      getTypeAliases: () => [],
      getEnums: () => [],
      getVariableStatements: () => [
        {
          isExported: () => true,
          getDeclarations: () => [
            {
              getName: () => "value",
              getNameNode: () => node("Identifier", 4),
              getKindName: () => "VariableDeclaration",
              getEnd: () => 6,
              getText: () => "value = 1",
            },
          ],
        },
      ],
    };
    spies.push(
      spyOn(Project.prototype, "createSourceFile").mockImplementation(
        () => sourceFile as never,
      ),
      spyOn(Project.prototype, "removeSourceFile").mockImplementation(
        () => true,
      ),
    );
    const result = await createBuiltinTsMorphSymbolExtractorV2().analyze({
      path: "src/doubles.ts",
      content: "",
    });
    expect(result.status).toBe("ok");
    expect(
      result.symbols.map(({ name, nativeKind }) => [name, nativeKind]),
    ).toStrictEqual([
      ["Shell", "ClassDeclaration"],
      ["value", "VariableDeclaration"],
    ]);
  });

  test("fails on a class member walk error", async () => {
    failingMethod(ClassDeclaration.prototype, "getMethods", "walk failed");
    const result = await createBuiltinTsMorphSymbolExtractorV2().analyze({
      path: "src/box.ts",
      content: "export class Box { run() {} }",
    });
    expect(result).toStrictEqual({
      contractVersion: "kibi.symbol-extractor.v2",
      status: "failed",
      sourceFile: "src/box.ts",
      language: "typescript",
      module: { title: "box", language: "typescript", analysisMode: "parser" },
      symbols: [],
      diagnostics: [{ code: "SOURCE_ANALYSIS_FAILED", message: "walk failed" }],
      uncoveredRanges: [],
    });
  });

  test("fails on a class expression walk error", async () => {
    failingMethod(
      VariableDeclaration.prototype,
      "getInitializerIfKind",
      "initializer failed",
    );
    const result = await createBuiltinTsMorphSymbolExtractorV2().analyze({
      path: "src/box.ts",
      content: "export const Box = class {};",
    });
    expect(result.status).toBe("failed");
    expect(result.diagnostics).toStrictEqual([
      { code: "SOURCE_ANALYSIS_FAILED", message: "initializer failed" },
    ]);
  });

  test("fails on a member extraction error", async () => {
    failingMethod(MethodDeclaration.prototype, "getEnd", "method failed");
    const result = await createBuiltinTsMorphSymbolExtractorV2().analyze({
      path: "src/box.ts",
      content: "export class Box { run() {} }",
    });
    expect(result.diagnostics).toStrictEqual([
      { code: "SOURCE_ANALYSIS_FAILED", message: "method failed" },
    ]);
  });

  test("reports a generic failure for a non-Error throw", async () => {
    spies.push(
      spyOn(Project.prototype, "createSourceFile").mockImplementation(() => {
        throw "not an error";
      }),
    );
    const result = await createBuiltinTsMorphSymbolExtractorV2().analyze({
      path: "src/a.ts",
      content: "export {};",
    });
    expect(result.status).toBe("failed");
    expect(result.symbols).toStrictEqual([]);
    expect(result.uncoveredRanges).toStrictEqual([]);
    expect(result.diagnostics).toStrictEqual([
      {
        code: "SOURCE_ANALYSIS_FAILED",
        message: "The built-in ts-morph extractor failed",
      },
    ]);
  });
});
