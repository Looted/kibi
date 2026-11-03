import { describe, expect, test } from "bun:test";
import {
  PluginValidationError,
  SOURCE_ANALYSIS_V2_MAX_INPUT_CODE_UNITS,
  validateSourceAnalysisResultV2,
} from "../src/index.js";

const CODE = "INVALID_CAPABILITY_RESULT";

function expectFailure(run: () => unknown, message: string): void {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(PluginValidationError);
    expect({
      code: (error as PluginValidationError).code,
      message: (error as PluginValidationError).message,
    }).toStrictEqual({ code: CODE, message });
    return;
  }
  throw new Error(`expected failure: ${message}`);
}

// Line lengths: 1 -> 10, 2 -> 0, 3 -> 4 (CRLF, LF and CR all split lines).
const content = "0123456789\r\n\rabcd";
const input = { path: "src/a.ts", content, language: "ts" };

const symbol = (overrides: Record<string, unknown> = {}) => ({
  name: "f",
  kind: "function",
  startLine: 1,
  startColumn: 0,
  endLine: 3,
  endColumn: 4,
  ...overrides,
});

const result = (overrides: Record<string, unknown> = {}) => ({
  contractVersion: "kibi.symbol-extractor.v2",
  status: "ok",
  sourceFile: "src/a.ts",
  language: "ts",
  module: { title: "a", language: "ts", analysisMode: "parser" },
  symbols: [symbol()],
  diagnostics: [],
  uncoveredRanges: [],
  ...overrides,
});

const validate = (
  value: unknown,
  inputOverride: unknown = input,
  options?: { maxSymbols?: number; maxInputSize?: number },
) =>
  validateSourceAnalysisResultV2(
    value,
    inputOverride as typeof input,
    options as never,
  );

describe("validateSourceAnalysisResultV2 accepts", () => {
  test("an ok result with optional symbol fields and a name range", () => {
    expect(
      validate(
        result({
          symbols: [
            symbol({
              qualifiedName: " A.f ",
              containerName: "A",
              nativeKind: "method_definition",
              signature: "f()",
              directiveText: "d",
              nameRange: { startLine: 1, startColumn: 0, endLine: 3, endColumn: 4 },
            }),
            symbol({
              startLine: 3,
              startColumn: 4,
              endLine: 3,
              endColumn: 4,
              nameRange: { startLine: 3, startColumn: 4, endLine: 3, endColumn: 4 },
            }),
            symbol({ startLine: 2, startColumn: 0, endLine: 2, endColumn: 0 }),
          ],
          diagnostics: [{ code: " c ", message: " m " }],
        }),
      ),
    ).toStrictEqual({
      contractVersion: "kibi.symbol-extractor.v2",
      status: "ok",
      sourceFile: "src/a.ts",
      language: "ts",
      module: { title: "a", language: "ts", analysisMode: "parser" },
      symbols: [
        {
          name: "f",
          kind: "function",
          startLine: 1,
          startColumn: 0,
          endLine: 3,
          endColumn: 4,
          directiveText: "d",
          qualifiedName: "A.f",
          containerName: "A",
          nativeKind: "method_definition",
          signature: "f()",
          nameRange: { startLine: 1, startColumn: 0, endLine: 3, endColumn: 4 },
        },
        {
          name: "f",
          kind: "function",
          startLine: 3,
          startColumn: 4,
          endLine: 3,
          endColumn: 4,
          nameRange: { startLine: 3, startColumn: 4, endLine: 3, endColumn: 4 },
        },
        {
          name: "f",
          kind: "function",
          startLine: 2,
          startColumn: 0,
          endLine: 2,
          endColumn: 0,
        },
      ],
      diagnostics: [{ code: "c", message: "m" }],
      uncoveredRanges: [],
    });
  });

  test("partial, unsupported and failed results", () => {
    const range = { startLine: 1, startColumn: 10, endLine: 2, endColumn: 0 };
    expect(
      validate(
        result({
          status: "partial",
          diagnostics: [{ code: "c", message: "m", range }],
          uncoveredRanges: [{ ...range, reason: " r " }],
        }),
      ),
    ).toMatchObject({
      status: "partial",
      diagnostics: [{ code: "c", message: "m", range }],
      uncoveredRanges: [{ ...range, reason: "r" }],
    });
    for (const status of ["unsupported", "failed"]) {
      expect(
        validate(
          result({
            status,
            symbols: [],
            diagnostics: [{ code: "c", message: "m" }],
          }),
        ).status,
      ).toBe(status);
    }
    // The host path wins over a padded sourceFile? No: the sourceFile must
    // match exactly, and the returned sourceFile is the requested path.
    expect(validate(result(), { path: "src/a.ts", content }).sourceFile).toBe(
      "src/a.ts",
    );
  });

  test("limits at their boundaries", () => {
    expect(
      validate(result({ symbols: [symbol()] }), input, { maxSymbols: 1 })
        .symbols,
    ).toHaveLength(1);
    expect(
      validate(result(), input, { maxInputSize: content.length }).status,
    ).toBe("ok");
    expect(
      validate(result({ symbols: [] }), input, { maxSymbols: 0 }).symbols,
    ).toStrictEqual([]);
  });

  test("an oversized input with a range-free failure", () => {
    expect(
      validate(
        result({
          status: "failed",
          symbols: [],
          diagnostics: [{ code: "too_large", message: "skip" }, "x"].slice(0, 1),
        }),
        input,
        { maxInputSize: content.length - 1 },
      ),
    ).toMatchObject({ status: "failed", symbols: [], uncoveredRanges: [] });
  });

  test("the default input limit", () => {
    const big = "x".repeat(SOURCE_ANALYSIS_V2_MAX_INPUT_CODE_UNITS + 1);
    expectFailure(
      () => validate(result({ symbols: [] }), { path: "src/a.ts", content: big }),
      `input.content exceeds the ${SOURCE_ANALYSIS_V2_MAX_INPUT_CODE_UNITS} UTF-16 code unit limit; oversized input requires a failed result`,
    );
    const exact = "x".repeat(SOURCE_ANALYSIS_V2_MAX_INPUT_CODE_UNITS);
    expect(
      validate(
        result({
          symbols: [symbol({ startLine: 1, endLine: 1, endColumn: 1 })],
        }),
        { path: "src/a.ts", content: exact },
      ).status,
    ).toBe("ok");
  });
});

describe("validateSourceAnalysisResultV2 rejects", () => {
  test("envelopes and inputs", () => {
    for (const value of [null, [], "x"]) {
      expectFailure(
        () => validate(value),
        "symbol analysis v2 result must be an object",
      );
    }
    for (const field of [
      "provenance",
      "provider",
      "providerStamp",
      "pluginId",
      "pluginVersion",
      "capability",
      "mode",
      "external",
      "network",
      "metered",
      "fallbackUsed",
      "model",
    ]) {
      expectFailure(
        () => validate(result({ [field]: undefined })),
        `symbol analysis v2 result must not provide host provenance field '${field}'`,
      );
    }
    for (const bad of [null, [], "x"]) {
      expectFailure(
        () => validate(result(), bad),
        "symbol analysis v2 input must include path and content",
      );
    }
    for (const path of [1, "", "  "]) {
      expectFailure(
        () => validate(result(), { path, content }),
        "input.path must be a non-empty string",
      );
    }
    expectFailure(
      () => validate(result(), { path: "src/a.ts", content: 1 }),
      "input.content must be a string",
    );
    expectFailure(
      () => validate(result(), { path: "src/a.ts", content, language: 1 }),
      "input.language must be a string when provided",
    );
    for (const [name, value] of [
      ["maxSymbols", -1],
      ["maxSymbols", 1.5],
      ["maxSymbols", Number.MAX_SAFE_INTEGER + 1],
      ["maxInputSize", -1],
      ["maxInputSize", 0.5],
    ] as const) {
      expectFailure(
        () => validate(result(), input, { [name]: value }),
        `${name} must be a non-negative safe integer`,
      );
    }
  });

  test("result headers", () => {
    expectFailure(
      () => validate(result({ contractVersion: "kibi.symbol-extractor.v1" })),
      "contractVersion must be 'kibi.symbol-extractor.v2'",
    );
    expectFailure(
      () => validate(result({ status: "" })),
      "status must be a non-empty string",
    );
    expectFailure(
      () => validate(result({ status: "done" })),
      "Unsupported symbol analysis status 'done'",
    );
    expectFailure(
      () => validate(result({ symbols: {} })),
      "symbol analysis v2 result must include symbols[]",
    );
    expectFailure(
      () =>
        validate(result({ symbols: [symbol(), symbol()] }), input, {
          maxSymbols: 1,
        }),
      "symbols[] exceeds the 1 symbol limit",
    );
    expectFailure(
      () => validate(result({ diagnostics: undefined })),
      "symbol analysis v2 result must include diagnostics[]",
    );
    expectFailure(
      () => validate(result({ uncoveredRanges: "none" })),
      "symbol analysis v2 result must include uncoveredRanges[]",
    );
    expectFailure(
      () => validate(result({ sourceFile: "src/b.ts" })),
      "result sourceFile 'src/b.ts' does not match requested path 'src/a.ts'",
    );
    expectFailure(
      () => validate(result({ sourceFile: undefined })),
      "result sourceFile 'undefined' does not match requested path 'src/a.ts'",
    );
    expectFailure(
      () =>
        validate(
          result({ module: { title: "a", language: "js", analysisMode: "parser" } }),
        ),
      "module.language must match result.language",
    );
    expectFailure(
      () => validate(result({ module: [] })),
      "symbol analysis result must include module and symbols[]",
    );
  });

  test("oversized inputs", () => {
    const small = { maxInputSize: content.length - 1 };
    const failed = (overrides: Record<string, unknown>) =>
      result({
        status: "failed",
        symbols: [],
        diagnostics: [{ code: "c", message: "m" }],
        ...overrides,
      });
    expectFailure(
      () => validate(failed({ status: "partial" }), input, small),
      `input.content exceeds the ${content.length - 1} UTF-16 code unit limit; oversized input requires a failed result`,
    );
    expectFailure(
      () => validate(failed({ symbols: [symbol()] }), input, small),
      "oversized failed input must not include symbols",
    );
    expectFailure(
      () =>
        validate(
          failed({
            uncoveredRanges: [
              { startLine: 1, startColumn: 0, endLine: 1, endColumn: 0, reason: "r" },
            ],
          }),
          input,
          small,
        ),
      "oversized failed input must not include uncovered source ranges",
    );
    expectFailure(
      () =>
        validate(
          failed({
            diagnostics: [
              { code: "c", message: "m" },
              {
                code: "c",
                message: "m",
                range: { startLine: 1, startColumn: 0, endLine: 1, endColumn: 0 },
              },
            ],
          }),
          input,
          small,
        ),
      "oversized failed input diagnostics must not include source ranges",
    );
    // Non-record diagnostics are not treated as ranged here; they fail later.
    expectFailure(
      () =>
        validate(failed({ diagnostics: ["x"] }), input, small),
      "diagnostics[0] must be an object",
    );
  });

  test("symbol ranges", () => {
    const run = (overrides: Record<string, unknown>) => () =>
      validate(result({ symbols: [symbol(), symbol(overrides)] }));
    for (const startLine of [0, 1.5]) {
      expectFailure(
        run({ startLine }),
        "symbols[1].startLine must be an integer >= 1",
      );
    }
    expectFailure(
      run({ startLine: Number.MAX_SAFE_INTEGER + 1, endLine: Number.MAX_SAFE_INTEGER + 1 }),
      "symbols[1].startLine must be a positive safe integer",
    );
    expectFailure(
      run({ endLine: Number.MAX_SAFE_INTEGER + 1 }),
      "symbols[1].endLine must be a positive safe integer",
    );
    expectFailure(
      run({ startColumn: Number.MAX_SAFE_INTEGER + 1, endLine: 3 }),
      "symbols[1].startColumn must be a non-negative safe integer",
    );
    expectFailure(
      run({ endColumn: Number.MAX_SAFE_INTEGER + 1 }),
      "symbols[1].endColumn must be a non-negative safe integer",
    );
    expectFailure(
      run({ startLine: 4, endLine: 4 }),
      "symbols[1] line is outside the supplied source content",
    );
    expectFailure(
      run({ endLine: 4 }),
      "symbols[1] line is outside the supplied source content",
    );
    expectFailure(
      run({ startColumn: 11, endLine: 3 }),
      "symbols[1] column is outside the supplied source line",
    );
    expectFailure(
      run({ endColumn: 5 }),
      "symbols[1] column is outside the supplied source line",
    );
    expectFailure(
      run({ startLine: 2, startColumn: 1, endLine: 3 }),
      "symbols[1] column is outside the supplied source line",
    );
    // Legacy ordering check runs first for the same symbol.
    expectFailure(
      run({ startLine: 3, endLine: 1, endColumn: 0 }),
      "symbols[1] end position must not precede start position",
    );
  });

  test("symbol fields and name ranges", () => {
    const run = (overrides: Record<string, unknown>) => () =>
      validate(result({ symbols: [symbol(), symbol(overrides)] }));
    for (const key of ["qualifiedName", "containerName", "nativeKind", "signature"]) {
      expectFailure(
        run({ [key]: " " }),
        `symbols[1].${key} must be a non-empty string`,
      );
    }
    expectFailure(
      run({ directiveText: 1 }),
      "symbols[1].directiveText must be a string when provided",
    );
    expectFailure(
      run({ nameRange: "x" }),
      "symbols[1].nameRange must be a source range object",
    );
    expectFailure(
      run({ nameRange: { startLine: 1, startColumn: 0, endLine: 1 } }),
      "symbols[1].nameRange.endColumn must be a finite number",
    );
    expectFailure(
      run({ nameRange: { startLine: "1", startColumn: 0, endLine: 1, endColumn: 0 } }),
      "symbols[1].nameRange.startLine must be a finite number",
    );
    expectFailure(
      run({ nameRange: { startLine: 1, startColumn: null, endLine: 1, endColumn: 0 } }),
      "symbols[1].nameRange.startColumn must be a finite number",
    );
    expectFailure(
      run({ nameRange: { startLine: 1, startColumn: 0, endLine: Number.NaN, endColumn: 0 } }),
      "symbols[1].nameRange.endLine must be a finite number",
    );
    expectFailure(
      run({ nameRange: { startLine: 0, startColumn: 0, endLine: 1, endColumn: 0 } }),
      "symbols[1].nameRange.startLine must be a positive safe integer",
    );
    expectFailure(
      run({ nameRange: { startLine: 1, startColumn: 0, endLine: 0, endColumn: 0 } }),
      "symbols[1].nameRange.endLine must be a positive safe integer",
    );
    expectFailure(
      run({ nameRange: { startLine: 1, startColumn: -1, endLine: 1, endColumn: 0 } }),
      "symbols[1].nameRange.startColumn must be a non-negative safe integer",
    );
    expectFailure(
      run({ nameRange: { startLine: 1, startColumn: 0, endLine: 1, endColumn: 0.5 } }),
      "symbols[1].nameRange.endColumn must be a non-negative safe integer",
    );
    expectFailure(
      run({ nameRange: { startLine: 9, startColumn: 0, endLine: 1, endColumn: 0 } }),
      "symbols[1].nameRange line is outside the supplied source content",
    );
    expectFailure(
      run({ nameRange: { startLine: 2, startColumn: 0, endLine: 1, endColumn: 0 } }),
      "symbols[1].nameRange end position must not precede start position",
    );
    expectFailure(
      run({ nameRange: { startLine: 1, startColumn: 5, endLine: 1, endColumn: 4 } }),
      "symbols[1].nameRange end position must not precede start position",
    );
    // Name ranges must sit inside the symbol range on both ends.
    const inner = { startLine: 1, startColumn: 5, endLine: 3, endColumn: 2 };
    const symbolRange = { startLine: 1, startColumn: 5, endLine: 3, endColumn: 2 };
    expect(
      validate(
        result({ symbols: [symbol({ ...symbolRange, nameRange: inner })] }),
      ).symbols[0]?.nameRange,
    ).toStrictEqual(inner);
    for (const nameRange of [
      { ...inner, startColumn: 4 },
      { ...inner, startLine: 1, startColumn: 4, endLine: 1, endColumn: 6 },
      { ...inner, endColumn: 3 },
      { ...inner, startLine: 2, startColumn: 0, endLine: 3, endColumn: 3 },
    ]) {
      expectFailure(
        () =>
          validate(
            result({ symbols: [symbol({ ...symbolRange, nameRange })] }),
          ),
        "symbols[0].nameRange must be inside its symbol range",
      );
    }
  });

  test("diagnostics and uncovered ranges", () => {
    const range = { startLine: 1, startColumn: 0, endLine: 1, endColumn: 0 };
    expectFailure(
      () => validate(result({ diagnostics: [{ code: "c", message: "m" }, 1] })),
      "diagnostics[1] must be an object",
    );
    expectFailure(
      () => validate(result({ diagnostics: [{ code: "c", message: "m", range: "r" }] })),
      "diagnostics[0].range must be a source range object",
    );
    expectFailure(
      () => validate(result({ diagnostics: [{ message: "m" }] })),
      "diagnostics[0].code must be a non-empty string",
    );
    expectFailure(
      () => validate(result({ diagnostics: [{ code: "c", message: "" }] })),
      "diagnostics[0].message must be a non-empty string",
    );
    expectFailure(
      () =>
        validate(
          result({
            status: "partial",
            diagnostics: [{ code: "c", message: "m" }],
            uncoveredRanges: [{ ...range, reason: "r" }, null],
          }),
        ),
      "uncoveredRanges[1] must be an object",
    );
    expectFailure(
      () =>
        validate(
          result({
            status: "partial",
            diagnostics: [{ code: "c", message: "m" }],
            uncoveredRanges: [{ ...range, startLine: 9, endLine: 9, reason: "r" }],
          }),
        ),
      "uncoveredRanges[0] line is outside the supplied source content",
    );
    expectFailure(
      () =>
        validate(
          result({
            status: "partial",
            diagnostics: [{ code: "c", message: "m" }],
            uncoveredRanges: [range],
          }),
        ),
      "uncoveredRanges[0].reason must be a non-empty string",
    );
  });

  test("status invariants", () => {
    const diagnostic = { code: "c", message: "m" };
    const uncovered = {
      startLine: 1,
      startColumn: 0,
      endLine: 1,
      endColumn: 0,
      reason: "r",
    };
    for (const status of ["partial", "unsupported", "failed"]) {
      expectFailure(
        () => validate(result({ status, symbols: [], uncoveredRanges: [uncovered] })),
        `status '${status}' requires at least one diagnostic`,
      );
    }
    expectFailure(
      () => validate(result({ status: "partial", diagnostics: [diagnostic] })),
      "status 'partial' requires at least one uncovered range",
    );
    expectFailure(
      () => validate(result({ uncoveredRanges: [uncovered] })),
      "status 'ok' cannot include uncovered ranges; use 'partial'",
    );
    for (const status of ["unsupported", "failed"]) {
      expectFailure(
        () => validate(result({ status, diagnostics: [diagnostic] })),
        `status '${status}' must not include symbols`,
      );
    }
    expect(
      validate(
        result({
          status: "unsupported",
          symbols: [],
          diagnostics: [diagnostic],
          uncoveredRanges: [uncovered],
        }),
      ).uncoveredRanges,
    ).toHaveLength(1);
  });
});
