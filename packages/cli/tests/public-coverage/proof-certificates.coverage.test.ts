import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  PROOF_CERTIFICATES_ENV,
  arithmeticCertificate,
  canonicalCertificateJson,
  exhaustiveCertificate,
  failedCalls,
  failedMembers,
  readProjectSource,
  regexCertificate,
  ruleCertificate,
  smtCertificate,
  sourceCertificate,
  stateMachineCertificate,
  typecheckCertificate,
  writeCodeCertificate,
} from "../../src/public/proof-certificates.js";
import type { SourceSpec } from "../../src/public/proof-sources.js";

const root = mkdtempSync(path.join(tmpdir(), "kibi-proof-certs-cov-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

describe("canonicalCertificateJson", () => {
  test("orders keys by code point, a shorter prefix first", () => {
    expect(canonicalCertificateJson({ ab: 1, a: 2, b: [null, "é"] })).toBe(
      '{"a":2,"ab":1,"b":[null,"\\u00e9"]}',
    );
  });
});

describe("exhaustiveCertificate", () => {
  test("records passes and failures with their messages", async () => {
    const certificate = await exhaustiveCertificate({
      testId: "t1",
      domain: { symbolId: "SYM", members: [1, 2, 3] },
      check: (member) => {
        if (member === 2) throw new Error("two");
        if (member === 3) throw "three";
      },
    });
    expect(certificate.results).toStrictEqual([
      { member: "1", outcome: "passed" },
      { member: "2", outcome: "failed", message: "two" },
      { member: "3", outcome: "failed", message: "three" },
    ]);
    expect(failedMembers(certificate)).toStrictEqual(["2: two", "3: three"]);
    expect(
      failedMembers({
        ...certificate,
        results: [{ member: "x", outcome: "failed" }],
      }),
    ).toStrictEqual(["x"]);
    expect(failedMembers({ ...certificate, results: undefined })).toStrictEqual(
      [],
    );
  });
});

describe("simple certificates", () => {
  test("typecheck hashes the witness", () => {
    writeFileSync(path.join(root, "w.ts"), "x");
    const certificate = typecheckCertificate({
      testId: "t",
      domainSymbolId: "D",
      witnessPath: "w.ts",
      workspaceRoot: root,
      compiler: { name: "tsc", version: "5" },
      accepted: false,
    });
    expect(certificate.outcome).toBe("failed");
    expect(certificate.witness).toStrictEqual({
      path: "w.ts",
      sha256:
        "2d711642b726b04401627ca9fbac32f5c8530fb1903cc4db02258717921a4881",
    });
    expect(
      typecheckCertificate({
        testId: "t",
        domainSymbolId: "D",
        witnessPath: path.join(root, "w.ts"),
        compiler: { name: "tsc", version: "5" },
        accepted: true,
      }).outcome,
    ).toBe("passed");
  });

  test("arithmetic, smt, regex and source", () => {
    expect(
      arithmeticCertificate({
        testId: "a",
        variable: "x",
        valueType: "int",
        assumptions: [{ operator: "gt", value: 0 }],
        claim: { operator: "gte", value: 1 },
      }),
    ).toStrictEqual({
      version: "kibi.code-certificate.v1",
      kind: "arithmetic",
      test_id: "a",
      variable: "x",
      value_type: "int",
      assumptions: [{ operator: "gt", value: 0 }],
      claim: { operator: "gte", value: 1 },
    });
    expect(
      smtCertificate({
        testId: "s",
        solver: { name: "z3", version: "4" },
        query: "(check-sat)",
        result: "unsat",
      }),
    ).toMatchObject({
      kind: "smt",
      solver: { name: "z3", version: "4" },
      query: "(check-sat)",
      result: "unsat",
    });
    expect(
      regexCertificate({ testId: "r", symbolId: "R", value: "lit" }).pattern,
    ).toStrictEqual({ symbol_id: "R", type: "string", value: "lit" });
    expect(
      regexCertificate({ testId: "r", symbolId: "R", value: /a+/gi }).pattern,
    ).toStrictEqual({
      symbol_id: "R",
      type: "regexp",
      source: "a+",
      flags: "gi",
      flavor: "js",
    });
    expect(sourceCertificate({ testId: "x" })).toMatchObject({
      kind: "source",
      test_id: "x",
    });
    expect(
      sourceCertificate({
        testId: "x",
        source: { reader: "glob", pattern: "*" } as SourceSpec,
      }).source,
    ).toStrictEqual({ reader: "glob", pattern: "*" });
  });
});

describe("ruleCertificate", () => {
  test("tabulates every combination and records errors", async () => {
    const certificate = await ruleCertificate({
      testId: "rule",
      domains: {
        n: { symbolId: "N", members: [1, 2] },
        s: { members: new Set(["a"]) },
      },
      predicates: {
        ok: {
          symbolId: "P",
          argTypes: ["n", "s"],
          decide: ((n: number) => n === 1) as never,
        },
        bad: {
          symbolId: "Q",
          argTypes: ["n"],
          decide: ((n: number) => {
            if (n === 1) throw new Error("boom");
            if (n === 2) throw "raw";
            return true;
          }) as never,
        },
        odd: {
          symbolId: "O",
          argTypes: ["s"],
          decide: (() => "yes") as never,
        },
      },
    });
    expect(certificate.domains).toStrictEqual({
      n: { symbol_id: "N", members: ["1", "2"] },
      s: { members: ["a"] },
    });
    expect(certificate.predicates).toStrictEqual({
      ok: {
        symbol_id: "P",
        arg_types: ["n", "s"],
        rows: [
          { args: ["1", "a"], value: true },
          { args: ["2", "a"], value: false },
        ],
      },
      bad: {
        symbol_id: "Q",
        arg_types: ["n"],
        rows: [
          { args: ["1"], error: "boom" },
          { args: ["2"], error: "raw" },
        ],
      },
      odd: {
        symbol_id: "O",
        arg_types: ["s"],
        rows: [{ args: ["a"], error: "returned string, not a boolean" }],
      },
    });
    expect(failedCalls(certificate)).toStrictEqual([
      "bad(1): boom",
      "bad(2): raw",
      "odd(a): returned string, not a boolean",
    ]);
    expect(
      failedCalls({ ...certificate, predicates: { x: {} } }),
    ).toStrictEqual([]);
    expect(
      failedCalls({ ...certificate, predicates: undefined }),
    ).toStrictEqual([]);
  });

  test("a predicate over an unknown type throws", async () => {
    await expect(
      ruleCertificate({
        testId: "rule",
        domains: {},
        predicates: {
          p: { symbolId: "P", argTypes: ["z"], decide: () => true },
        },
      }),
    ).rejects.toThrow("no domain for argument type z of p");
  });
});

describe("stateMachineCertificate", () => {
  test("a next-state function over states and events", async () => {
    const certificate = await stateMachineCertificate({
      testId: "sm",
      symbolId: "M",
      transitions: ((state: string, event: string) => {
        if (event === "boom") throw new Error("no");
        if (state === "a" && event === "go") return new Set(["b"]);
        if (state === "b" && event === "go") return new Map([["k", "c"]]);
        if (state === "c" && event === "go") return { x: "a" };
        if (state === "a" && event === "back") return ["c"];
        if (state === "b" && event === "back") return "a";
        return event === "stay" ? false : null;
      }) as never,
      states: ["a", "b", "c"],
      events: ["go", "back", "boom", "stay"],
      initial: "a",
    });
    expect(certificate.machine).toStrictEqual({
      symbol_id: "M",
      states: ["a", "b", "c"],
      transitions: [
        ["a", "b"],
        ["a", "c"],
        ["b", "a"],
        ["b", "c"],
        ["c", "a"],
      ],
      initial: ["a"],
    });
  });

  test("a function with no states or events", async () => {
    const certificate = await stateMachineCertificate({
      testId: "sm",
      symbolId: "M",
      transitions: (() => "x") as never,
    });
    expect(certificate.machine).toStrictEqual({
      symbol_id: "M",
      states: [],
      transitions: [],
    });
  });

  test("a list of pairs and edge objects", async () => {
    const certificate = await stateMachineCertificate({
      testId: "sm",
      symbolId: "M",
      transitions: [["a", "b"], { from: "b", to: "c" }, null, 3],
      initial: ["b", "a"],
    });
    expect(certificate.machine).toStrictEqual({
      symbol_id: "M",
      states: ["a", "b", "c"],
      transitions: [
        ["a", "b"],
        ["b", "c"],
      ],
      initial: ["a", "b"],
    });
  });

  test("a Map table", async () => {
    const certificate = await stateMachineCertificate({
      testId: "sm",
      symbolId: "M",
      transitions: new Map<unknown, unknown>([
        ["a", "b"],
        ["b", undefined],
      ]),
    });
    expect(certificate.machine).toStrictEqual({
      symbol_id: "M",
      states: ["a", "b"],
      transitions: [["a", "b"]],
    });
  });
});

describe("readProjectSource", () => {
  test("returns the model, or throws naming the source", async () => {
    writeFileSync(path.join(root, "doc.json"), JSON.stringify({ a: 1 }));
    expect(
      await readProjectSource(
        { reader: "json", file: "doc.json" } as SourceSpec,
        root,
      ),
    ).toStrictEqual({ members: ["a"] });
    await expect(
      readProjectSource(
        { reader: "json", file: "none.json" } as SourceSpec,
        root,
      ),
    ).rejects.toThrow(
      "Kibi could not read json none.json: none.json does not exist in the workspace",
    );
  });
});

describe("writeCodeCertificate", () => {
  test("writes into the certificate directory, or not at all", () => {
    const certificate = sourceCertificate({ testId: "a b/c" });
    expect(writeCodeCertificate(certificate, {})).toBeNull();
    expect(
      writeCodeCertificate(certificate, { [PROOF_CERTIFICATES_ENV]: " " }),
    ).toBeNull();
    const directory = path.join(root, "certs", "nested");
    const file = writeCodeCertificate(certificate, {
      [PROOF_CERTIFICATES_ENV]: directory,
    });
    expect(file).toBe(path.join(directory, "a_b_c.json"));
    expect(readFileSync(file as string, "utf8")).toBe(
      `${JSON.stringify(certificate, null, 2)}\n`,
    );
  });
});
