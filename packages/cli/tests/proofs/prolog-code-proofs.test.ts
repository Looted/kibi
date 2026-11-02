import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  evaluateDomain,
  evaluateScalar,
  importsDomain,
} from "../../src/operations/proof/code-certificates.js";
import { codeLanguage } from "../../src/operations/proof/code-languages.js";
import {
  type MachineModel,
  type PatternModel,
  type RuleModel,
  evaluateCodeModel,
} from "../../src/operations/proof/code-models.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function workspace(files: Record<string, string>): string {
  const root = mkdtempSync(path.join(tmpdir(), "kibi-prolog-proofs-"));
  roots.push(root);
  for (const [relative, content] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
    writeFileSync(path.join(root, relative), content);
  }
  return root;
}

const OPERATORS = `:- module(operators, [operator/2, hard_limit/1]).
%! operator(?Name, ?Description) is nondet.
operator(negate, "Negate a goal").
operator(swap_args, "Swap two arguments").
operator(negate, "Listed twice").
hard_limit(10).
status(killed).
status(timeout).
status(survived).
status(no_coverage).
detected(killed).
detected(timeout).
transition(pending, start, running).
transition(running, finish, done).
transition(running, crash, failed).
initial(pending).
next(pending, start, running).
next(running, finish, done).
mutant_id_pattern("^[^:]+:[0-9]+:[0-9]+:[a-z_]+:[0-9]+$").
open_ended(_).
`;

describe("the language a file is read in", () => {
  test("is decided by its extension", () => {
    expect(codeLanguage("src/a.ts")).toBe("js");
    expect(codeLanguage("app/a.py")).toBe("python");
    expect(codeLanguage("prolog/a.pl")).toBe("prolog");
    expect(codeLanguage("test/a.plt")).toBe("prolog");
  });
});

describe("a SWI-Prolog domain", () => {
  test("is the distinct solutions of the predicate's projected argument", () => {
    const root = workspace({ "prolog/operators.pl": OPERATORS });
    expect(
      evaluateDomain(root, "prolog/operators.pl", "operator/2", { arg: 1 }),
    ).toEqual({ ok: true, count: 2, members: ["negate", "swap_args"] });
    expect(evaluateDomain(root, "prolog/operators.pl", "status/1")).toEqual({
      ok: true,
      count: 4,
      members: ["killed", "timeout", "survived", "no_coverage"],
    });
  });

  test("refuses an ambiguous projection, an unbound solution and a missing predicate", () => {
    const root = workspace({ "prolog/operators.pl": OPERATORS });
    const ambiguous = evaluateDomain(root, "prolog/operators.pl", "operator/2");
    expect(ambiguous.ok).toBe(false);
    if (!ambiguous.ok) expect(ambiguous.reason).toContain("set arg");
    const open = evaluateDomain(root, "prolog/operators.pl", "open_ended/1");
    expect(open.ok).toBe(false);
    if (!open.ok) expect(open.reason).toContain("unbound");
    const missing = evaluateDomain(root, "prolog/operators.pl", "mutator/1");
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.reason).toContain("is not defined");
    const field = evaluateDomain(root, "prolog/operators.pl", "operator/2", {
      field: "name",
    });
    expect(field.ok).toBe(false);
  });

  test("arg is refused on a TypeScript export", () => {
    const root = workspace({ "src/a.ts": "export const A = ['x'];\n" });
    const read = evaluateDomain(root, "src/a.ts", "A", { arg: 1 });
    expect(read.ok).toBe(false);
    if (!read.ok) expect(read.reason).toContain("SWI-Prolog");
  });

  test("a plain file loads into user", () => {
    const root = workspace({
      "limits.pl": "main :- halt(3).\nlimit(30).\n",
    });
    expect(evaluateScalar(root, "limits.pl", "limit/1")).toEqual({
      ok: true,
      value: 30,
    });
  });
});

describe("a SWI-Prolog constant", () => {
  test("is the single number its predicate holds", () => {
    const root = workspace({ "prolog/operators.pl": OPERATORS });
    expect(evaluateScalar(root, "prolog/operators.pl", "hard_limit/1")).toEqual(
      { ok: true, value: 10 },
    );
    const many = evaluateScalar(root, "prolog/operators.pl", "status/1");
    expect(many.ok).toBe(false);
    if (!many.ok) expect(many.reason).toContain("4 solutions");
    const word = evaluateScalar(root, "prolog/operators.pl", "initial/1");
    expect(word.ok).toBe(false);
  });
});

describe("SWI-Prolog models", () => {
  test("a rule predicate is called once per row and decided by success", () => {
    const root = workspace({ "prolog/operators.pl": OPERATORS });
    const file = path.join(root, "prolog/operators.pl");
    const read = evaluateCodeModel<RuleModel>(
      root,
      [
        { file, export: "status/1" },
        { file, export: "detected/1" },
      ],
      {
        mode: "table",
        domains: { status: { file, export: "status/1" } },
        predicates: {
          detected: { file, export: "detected/1", arg_types: ["status"] },
        },
        limit: 1000,
      },
    );
    expect(read).toEqual({
      ok: true,
      model: {
        domains: { status: ["killed", "timeout", "survived", "no_coverage"] },
        predicates: {
          detected: [
            { args: ["killed"], value: true },
            { args: ["timeout"], value: true },
            { args: ["survived"], value: false },
            { args: ["no_coverage"], value: false },
          ],
        },
      },
    });
  });

  test("a predicate whose arity differs from its argument types is refused", () => {
    const root = workspace({ "prolog/operators.pl": OPERATORS });
    const file = path.join(root, "prolog/operators.pl");
    const read = evaluateCodeModel<RuleModel>(
      root,
      [{ file, export: "detected/1" }],
      {
        mode: "table",
        domains: { status: { values: ["killed"] } },
        predicates: {
          detected: {
            file,
            export: "detected/1",
            arg_types: ["status", "status"],
          },
        },
        limit: 1000,
      },
    );
    expect(read.ok).toBe(false);
  });

  test("a transition table lists every solution as an edge", () => {
    const root = workspace({ "prolog/operators.pl": OPERATORS });
    const file = path.join(root, "prolog/operators.pl");
    expect(
      evaluateCodeModel<MachineModel>(
        root,
        [{ file, export: "transition/3" }],
        {
          mode: "machine",
          transitions: { file, export: "transition/3" },
          initial: { file, export: "initial/1" },
        },
      ),
    ).toEqual({
      ok: true,
      model: {
        states: ["done", "failed", "pending", "running"],
        transitions: [
          ["pending", "running"],
          ["running", "done"],
          ["running", "failed"],
        ],
        initial: ["pending"],
      },
    });
  });

  test("a next-state predicate is driven over the state and event domains", () => {
    const root = workspace({
      "prolog/machine.pl": `${OPERATORS}state(pending).\nstate(running).\nstate(done).\nevent(start).\nevent(finish).\n`,
    });
    const file = path.join(root, "prolog/machine.pl");
    expect(
      evaluateCodeModel<MachineModel>(root, [{ file, export: "next/3" }], {
        mode: "machine",
        transitions: { file, export: "next/3" },
        domains: {
          state: { file, export: "state/1" },
          event: { file, export: "event/1" },
        },
      }),
    ).toEqual({
      ok: true,
      model: {
        states: ["done", "pending", "running"],
        transitions: [
          ["pending", "running"],
          ["running", "done"],
        ],
      },
    });
  });

  test("a pattern is the single atom or string a constant holds", () => {
    const root = workspace({ "prolog/operators.pl": OPERATORS });
    const file = path.join(root, "prolog/operators.pl");
    expect(
      evaluateCodeModel<PatternModel>(
        root,
        [{ file, export: "mutant_id_pattern/1" }],
        {
          mode: "pattern",
          pattern: { file, export: "mutant_id_pattern/1" },
        },
      ),
    ).toEqual({
      ok: true,
      model: { type: "string", value: "^[^:]+:[0-9]+:[0-9]+:[a-z_]+:[0-9]+$" },
    });
    const many = evaluateCodeModel<PatternModel>(
      root,
      [{ file, export: "status/1" }],
      {
        mode: "pattern",
        pattern: { file, export: "status/1" },
      },
    );
    expect(many.ok).toBe(false);
  });

  test("one certificate does not mix languages", () => {
    const root = workspace({
      "prolog/operators.pl": OPERATORS,
      "src/a.ts": "export const A = ['x'];\n",
    });
    const read = evaluateCodeModel(
      root,
      [
        { file: path.join(root, "prolog/operators.pl"), export: "status/1" },
        { file: path.join(root, "src/a.ts"), export: "A" },
      ],
      { mode: "pattern" },
    );
    expect(read.ok).toBe(false);
    if (!read.ok) expect(read.reason).toContain("SWI-Prolog");
  });
});

describe("a SWI-Prolog proof imports its domain", () => {
  test("when it names the predicate and loads its file", () => {
    const test = (source: string, proof = "test/operators_proof.pl") =>
      importsDomain(source, proof, "prolog/operators.pl", "operator/2");
    expect(
      test(
        ":- use_module('../prolog/operators').\nok :- forall(operator(O, _), atom(O)).\n",
      ),
    ).toBe(true);
    expect(
      test(":- use_module(library(operators)).\nok :- operator(negate, _).\n"),
    ).toBe(true);
    expect(
      test(":- ['../prolog/operators.pl'].\nok :- operator(x, _).\n"),
    ).toBe(true);
    // A plunit file beside its source is loaded into it by load_test_files/1.
    expect(test("ok :- operator(negate, _).\n", "prolog/operators.plt")).toBe(
      true,
    );
    // A hand-listed domain names no file.
    expect(
      test("ok :- member(O, [negate, swap_args]), operator(O, _).\n"),
    ).toBe(false);
    // Loading the file without reading the predicate is not reading the domain.
    expect(test(":- use_module('../prolog/operators').\nok :- true.\n")).toBe(
      false,
    );
    expect(
      importsDomain(
        ":- use_module('../prolog/operators').\nok :- operators:operator(x, _).\n",
        "test/p.pl",
        "prolog/operators.pl",
        "operators:operator/2",
      ),
    ).toBe(true);
  });
});
