import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { evaluateSourceCode } from "../../src/operations/proof/source-code-readers.js";
import { proofContractErrors } from "../../src/public/proof-protocol.js";
import {
  type SourceSpec,
  readSource,
  sourceDependencies,
  sourceSpecErrors,
} from "../../src/public/proof-sources.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function workspace(files: Record<string, string>): string {
  const root = mkdtempSync(path.join(tmpdir(), "kibi-prolog-sources-"));
  roots.push(root);
  for (const [relative, content] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
    writeFileSync(path.join(root, relative), content);
  }
  return root;
}

const read = (root: string, spec: Record<string, unknown>) =>
  readSource(root, spec as SourceSpec, evaluateSourceCode);

const LIBRARY = `:- module(ops, [run/1, op(700, xfx, ===>)]).
:- use_module(library(lists)).
:- use_module(library(clpfd)).
:- use_module(helpers).

X ===> Y :- Y #= X + 1.

run(Goal) :-
    getenv('KIBI_MODE', _),
    maplist([X]>>(format("~w~n", [X])), [a, b]),
    catch(helper(Goal), E, (print_message(error, E), throw(E))),
    findall(Y, member(Y, [1, 2]), _),
    (   Goal == x -> throw(error(type_error(atom, Goal), _)) ; true ),
    domain_error(kind, Goal),
    ops:helper(a).

helper(G) :- format("~w", [G]).
greeting --> "hi", name.
name --> "x".
`;

const HELPERS = `:- module(helpers, [h/1]).
h(X) :- format("~w", [X]).
`;

const PACK = `name(ops).
version('1.0.0').
title('Operator library').
requires(clpfd_extra).
requires(lists_more).
author('A Person', 'person@example.org').
`;

describe("the references reader on SWI-Prolog", () => {
  test("lists what a library loads, as written", async () => {
    const root = workspace({
      "prolog/ops.pl": LIBRARY,
      "prolog/helpers.pl": HELPERS,
    });
    expect(
      await read(root, {
        reader: "references",
        files: "prolog/*.pl",
        extract: "imports",
      }),
    ).toEqual({
      ok: true,
      model: { members: ["helpers", "library(clpfd)", "library(lists)"] },
    });
  });

  test("lists every predicate a body calls, through control constructs, meta-predicates, lambdas and grammar rules", async () => {
    const root = workspace({ "prolog/ops.pl": LIBRARY });
    const calls = await read(root, {
      reader: "references",
      files: "prolog/ops.pl",
      extract: "calls",
    });
    expect(calls.ok).toBe(true);
    if (!calls.ok) return;
    expect(calls.model.members).toEqual(
      expect.arrayContaining([
        "#=/2",
        "getenv/2",
        "maplist/2",
        "format/2",
        "helper/1",
        "print_message/2",
        "findall/3",
        "member/2",
        "domain_error/2",
        "ops:helper/1",
        "name/2",
        "use_module/1",
      ]),
    );
    // Control constructs are walked, not listed, and grammar terminals call nothing.
    expect(calls.model.members).not.toContain(",/2");
    expect(calls.model.members).not.toContain("=/2");
  });

  test("reads environment variables, first arguments and thrown errors", async () => {
    const root = workspace({ "prolog/ops.pl": LIBRARY });
    expect(
      await read(root, {
        reader: "references",
        files: "prolog/ops.pl",
        extract: "env",
      }),
    ).toEqual({
      ok: true,
      model: { members: ["KIBI_MODE"] },
    });
    expect(
      await read(root, {
        reader: "references",
        files: "prolog/ops.pl",
        extract: "string_args",
        callee: "format",
      }),
    ).toEqual({ ok: true, model: { members: ["~w", "~w~n"] } });
    // A rethrow of the caught ball is not a new error.
    expect(
      await read(root, {
        reader: "references",
        files: "prolog/ops.pl",
        extract: "thrown",
      }),
    ).toEqual({
      ok: true,
      model: { members: ["domain_error", "type_error"] },
    });
  });

  test("refuses a goal, closure or clause it cannot read statically, with its place", async () => {
    const root = workspace({
      "prolog/dynamic.pl": `run(Goal) :- call(Goal).
each(G, L) :- maplist(G, L).
store(Fact) :- assertz(Fact).
fixed :- assertz(seen(yes)).
in(M) :- M:helper.
`,
    });
    const calls = await read(root, {
      reader: "references",
      files: "prolog/dynamic.pl",
      extract: "calls",
    });
    expect(calls.ok).toBe(false);
    if (calls.ok) return;
    expect(calls.reason).toContain("Kibi cannot read 4 calls statically");
    expect(calls.reason).toContain("prolog/dynamic.pl:1 call(Goal)");
    expect(calls.reason).toContain("prolog/dynamic.pl:2 maplist(G,L)");
    expect(calls.reason).toContain("prolog/dynamic.pl:3 assertz(Fact)");
    expect(calls.reason).toContain("prolog/dynamic.pl:5 M:helper");
  });

  test("reads a file's own meta_predicate declarations", async () => {
    const root = workspace({
      "prolog/meta.pl": `:- module(meta, [run/1]).
:- meta_predicate run(0), meta:twice(0, 0), 7.
run(G) :- once(G).
twice(A, B) :- once(A), once(B).
go(V) :- run(getenv('A', V)), twice(getenv('B', V), true).
`,
    });
    const env = await read(root, {
      reader: "references",
      files: "prolog/meta.pl",
      extract: "env",
    });
    expect(env.ok).toBe(false);
    if (env.ok) return;
    // once(G) on a variable is refused, while the walked arguments are read.
    expect(env.reason).toContain("prolog/meta.pl:3 call(G)");
    const root2 = workspace({
      "prolog/meta.pl": `:- module(meta, [go/1]).
:- meta_predicate run(0).
run(once(true)).
go(V) :- run(getenv('A', V)).
`,
    });
    expect(
      await read(root2, {
        reader: "references",
        files: "prolog/meta.pl",
        extract: "env",
      }),
    ).toEqual({ ok: true, model: { members: ["A"] } });
  });

  test("refuses term_expansion and goal_expansion in the files or in a project file they load", async () => {
    const root = workspace({
      "prolog/config.pl": `:- module(config, [token/1]).
term_expansion(settings, (token(T) :- getenv('SECRET', T))).
settings.
`,
      "prolog/goals.pl": `goal_expansion(myread(V), getenv('SECRET', V)).
a(V) :- myread(V).
`,
      "prolog/user.pl": `user:term_expansion(a, b) :- true.
`,
      "prolog/loads.pl": `:- use_module(sub/macros).
:- use_module(helpers).
:- ensure_loaded(helpers).
:- use_module(missing).
a.
`,
      "prolog/sub/macros.pl": `:- module(macros, []).
:- use_module('../deep').
`,
      "prolog/deep.pl": `:- module(deep, []).
:- use_module(sub/macros).
system:goal_expansion(a, b).
`,
      "prolog/helpers.pl": `:- module(helpers, []).
:- use_module(helpers).
h.
`,
      "prolog/broken.pl": `:- use_module(bad).
`,
      "prolog/bad.pl": `p :- foo bar.
`,
    });
    for (const [file, place] of [
      ["config.pl", "prolog/config.pl:2 term_expansion(settings"],
      ["goals.pl", "prolog/goals.pl:1 goal_expansion(myread(V)"],
      ["user.pl", "prolog/user.pl:1 user:term_expansion(a,b)"],
      ["loads.pl", "prolog/loads.pl:1 :-use_module(sub/macros)"],
      ["broken.pl", "prolog/broken.pl:1 :-use_module(bad)"],
    ]) {
      for (const extract of ["env", "calls"]) {
        const result = await read(root, {
          reader: "references",
          files: `prolog/${file}`,
          extract,
        });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.reason).toContain(place);
      }
    }
    const loads = await read(root, {
      reader: "references",
      files: "prolog/loads.pl",
      extract: "env",
    });
    if (!loads.ok) expect(loads.reason).toContain("1 environment variable");
  });

  test("reads the body of a clause asserted from a literal term", async () => {
    const root = workspace({
      "prolog/assert.pl": `:- initialization(assertz((s(V) :- getenv('SECRET', V)))).
:- asserta(user:(t(V) :- getenv('OTHER', V)), _).
fixed :- assertz(seen(yes)), compile_aux_clauses([(u(V) :- getenv('AUX', V))]).
`,
      "prolog/data.pl": `store(Fact) :- assertz(Fact).
store2(B) :- assertz((h :- B)).
store3(M) :- assertz(M:h).
add :- assertz(term_expansion(a, b)).
aux(L) :- compile_aux_clauses(L).
`,
    });
    expect(
      await read(root, {
        reader: "references",
        files: "prolog/assert.pl",
        extract: "env",
      }),
    ).toEqual({ ok: true, model: { members: ["AUX", "OTHER", "SECRET"] } });
    const env = await read(root, {
      reader: "references",
      files: "prolog/data.pl",
      extract: "env",
    });
    expect(env.ok).toBe(false);
    if (env.ok) return;
    expect(env.reason).toContain("Kibi cannot read 5 environment variable");
    expect(env.reason).toContain(
      "prolog/data.pl:4 assertz(term_expansion(a,b))",
    );
  });

  test("reads an include only when the included file is read too", async () => {
    const root = workspace({
      "prolog/main.pl": ":- include(inc).\n",
      "prolog/inc.pl": "x(V) :- getenv('A', V).\n",
      "prolog/lib.pl": ":- include(library(x)).\n",
    });
    const alone = await read(root, {
      reader: "references",
      files: "prolog/main.pl",
      extract: "env",
    });
    expect(alone.ok).toBe(false);
    if (!alone.ok)
      expect(alone.reason).toContain("prolog/main.pl:1 :-include(inc)");
    expect(
      await read(root, {
        reader: "references",
        files: ["prolog/main.pl", "prolog/inc.pl"],
        extract: "env",
      }),
    ).toEqual({ ok: true, model: { members: ["A"] } });
    const library = await read(root, {
      reader: "references",
      files: "prolog/lib.pl",
      extract: "imports",
    });
    expect(library.ok).toBe(false);
  });

  test("reads apply/2 as the goal it calls", async () => {
    const root = workspace({
      "prolog/apply.pl": `a(V) :- apply(getenv, ['SECRET', V]).
b(V) :- apply(system:getenv, ['OTHER', V]).
`,
      "prolog/open.pl": `c(G) :- apply(G, [x]).
d(L) :- apply(getenv, L).
e(M) :- apply(M:getenv, ['X', _]).
`,
    });
    expect(
      await read(root, {
        reader: "references",
        files: "prolog/apply.pl",
        extract: "env",
      }),
    ).toEqual({ ok: true, model: { members: ["OTHER", "SECRET"] } });
    expect(
      await read(root, {
        reader: "references",
        files: "prolog/apply.pl",
        extract: "calls",
      }),
    ).toEqual({
      ok: true,
      model: { members: ["apply/2", "getenv/2", "system:getenv/2"] },
    });
    const open = await read(root, {
      reader: "references",
      files: "prolog/open.pl",
      extract: "calls",
    });
    expect(open.ok).toBe(false);
    if (!open.ok)
      expect(open.reason).toContain("Kibi cannot read 3 calls statically");
  });

  test("refuses conditional compilation, a computed load and a file it cannot parse", async () => {
    const root = workspace({
      "prolog/cond.pl":
        ":- if(current_prolog_flag(bounded, false)).\nbig.\n:- endif.\n",
      "prolog/load.pl":
        "load(Name) :- use_module(library(Name)).\nfixed :- use_module(library(apply)).\n",
      "prolog/bad.pl": "p :- foo bar.\n",
    });
    const cond = await read(root, {
      reader: "references",
      files: "prolog/cond.pl",
      extract: "imports",
    });
    expect(cond.ok).toBe(false);
    if (!cond.ok) expect(cond.reason).toContain("prolog/cond.pl:1");
    const load = await read(root, {
      reader: "references",
      files: "prolog/load.pl",
      extract: "imports",
    });
    expect(load.ok).toBe(false);
    if (!load.ok)
      expect(load.reason).toContain(
        "prolog/load.pl:1 :-use_module(library(Name))",
      );
    const bad = await read(root, {
      reader: "references",
      files: "prolog/bad.pl",
      extract: "calls",
    });
    expect(bad.ok).toBe(false);
    if (!bad.ok)
      expect(bad.reason).toContain("prolog/bad.pl:1 is not valid Prolog");
  });

  test("never runs the project's code", async () => {
    const root = workspace({
      "prolog/side.pl":
        ":- initialization(halt(3)).\n:- open('touched', write, S), close(S).\nrun :- true.\n",
    });
    expect(
      await read(root, {
        reader: "references",
        files: "prolog/side.pl",
        extract: "calls",
      }),
    ).toEqual({
      ok: true,
      model: {
        members: ["close/1", "halt/1", "initialization/1", "open/3", "true/0"],
      },
    });
    expect(Bun.file(path.join(root, "touched")).size).toBe(0);
  });

  test("has no property values to extract", async () => {
    const root = workspace({ "prolog/ops.pl": LIBRARY });
    const property = await read(root, {
      reader: "references",
      files: "prolog/ops.pl",
      extract: "property",
      key: "x",
    });
    expect(property.ok).toBe(false);
    if (!property.ok) expect(property.reason).toContain("prolog reader");
  });
});

describe("the prolog reader", () => {
  test("lists one argument of every fact with a functor, in file order", async () => {
    const root = workspace({ "pack.pl": PACK });
    expect(
      await read(root, {
        reader: "prolog",
        file: "pack.pl",
        functor: "requires/1",
      }),
    ).toEqual({
      ok: true,
      model: {
        members: ["clpfd_extra", "lists_more"],
        sequence: ["clpfd_extra", "lists_more"],
      },
    });
    expect(
      await read(root, {
        reader: "prolog",
        file: "pack.pl",
        functor: "author/2",
        arg: 2,
      }),
    ).toEqual({
      ok: true,
      model: {
        members: ["person@example.org"],
        sequence: ["person@example.org"],
      },
    });
    expect(
      await read(root, {
        reader: "prolog",
        file: "pack.pl",
        functor: "dependency/1",
      }),
    ).toEqual({
      ok: true,
      model: { members: [], sequence: [] },
    });
  });

  test("refuses an ambiguous argument and a fact holding a variable", async () => {
    const root = workspace({ "pack.pl": PACK, "open.pl": "requires(_).\n" });
    const ambiguous = await read(root, {
      reader: "prolog",
      file: "pack.pl",
      functor: "author/2",
    });
    expect(ambiguous.ok).toBe(false);
    if (!ambiguous.ok) expect(ambiguous.reason).toContain("set arg");
    const open = await read(root, {
      reader: "prolog",
      file: "open.pl",
      functor: "requires/1",
    });
    expect(open.ok).toBe(false);
    if (!open.ok) expect(open.reason).toContain("open.pl:1");
  });

  test("validates its spec and binds the receipt to the file", () => {
    expect(
      sourceSpecErrors(
        { reader: "prolog", file: "pack.pl", functor: "requires/1", arg: 1 },
        "source",
      ),
    ).toEqual([]);
    expect(
      sourceSpecErrors({ reader: "prolog", file: "pack.pl" }, "source").join(
        " ",
      ),
    ).toContain("functor is required");
    expect(
      sourceSpecErrors(
        { reader: "prolog", file: "pack.pl", functor: "requires" },
        "source",
      ),
    ).toHaveLength(1);
    expect(
      sourceSpecErrors(
        { reader: "prolog", file: "pack.pl", functor: "requires/1", arg: 0 },
        "source",
      ),
    ).toHaveLength(1);
    const root = workspace({ "pack.pl": PACK });
    expect(
      sourceDependencies(root, {
        reader: "prolog",
        file: "pack.pl",
        functor: "requires/1",
      } as SourceSpec).map((dependency) => dependency.id),
    ).toEqual(["source-file:pack.pl"]);
    expect(
      proofContractErrors({
        version: "kibi.proof-contract.v1",
        integration: "self-proof",
        required_proofs: [{ symbol_id: "SYM-pack", target: "default" }],
        success_policy: "all_required_first_attempt",
        kind: "source",
        source: { reader: "prolog", file: "pack.pl", functor: "requires/1" },
        proves: ["CLAIM-0000000000000001"],
      }),
    ).toEqual([]);
  });
});
