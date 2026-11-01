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
      // maplist/2, domain_error/2 and the lambda are autoloaded from their libraries.
      model: {
        members: [
          "helpers",
          "library(apply)",
          "library(clpfd)",
          "library(error)",
          "library(lists)",
          "library(yall)",
        ],
      },
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

  test("reads goals in module-sensitive (:) arguments, or refuses them", async () => {
    const root = workspace({
      "prolog/fmt.pl": `:- module(fmt, []).
a(V) :- format(atom(_), "~@", [getenv('A', V)]).
b(V) :- format("~@", getenv('B', V)).
c(V) :- format("~*c~a~W~@~n", [3, 0'x, y, t, [], getenv('C', V)]).
d(V) :- print_message(informational, format("~@", [getenv('D', V)])).
e(V) :- debug(topic, "~@", [getenv('E', V)]).
f(V) :- first_solution(V, [getenv('F', V)], []).
g(V) :- concurrent(1, [getenv('G', V)], []).
h(X) :- format("~w ~a~n", [X, x]), format(_, ["s", 1]).
i :- format(user_error, "~\`-t~30|~+~~~n", []).
`,
      "prolog/var.pl": "a(F) :- format(F, [x]).\n",
      "prolog/args.pl": 'a(A) :- format("~@", A).\n',
      "prolog/odd.pl": 'a :- format("~Q", [x]).\n',
      "prolog/few.pl": 'a :- format("~a~@", [x]).\n',
      "prolog/listen.pl": "a(V) :- prolog_listen(halt, getenv('A', V)).\n",
      "prolog/signal.pl": "a :- on_signal(int, _, getenv('A')).\n",
      "prolog/goals.pl": "a(G) :- first_solution(x, G, []).\n",
      "prolog/data.pl":
        "a :- assertz(p(1)), retract(p(_)), thread_create_in_pool(pool, true, _, []).\n",
    });
    expect(
      await read(root, {
        reader: "references",
        files: "prolog/fmt.pl",
        extract: "env",
      }),
    ).toEqual({
      ok: true,
      model: { members: ["A", "B", "C", "D", "E", "F", "G"] },
    });
    expect(
      await read(root, {
        reader: "references",
        files: "prolog/data.pl",
        extract: "env",
      }),
    ).toEqual({ ok: true, model: { members: [] } });
    for (const [file, place] of [
      ["var", "prolog/var.pl:1 format(F,[x])"],
      ["args", 'prolog/args.pl:1 format("~@",A)'],
      ["odd", 'prolog/odd.pl:1 format("~Q",[x])'],
      ["few", 'prolog/few.pl:1 format("~a~@",[x])'],
      ["listen", "prolog/listen.pl:1 prolog_listen(halt,getenv('A',V))"],
      ["signal", "prolog/signal.pl:1 on_signal(int,"],
      ["goals", "prolog/goals.pl:1 first_solution(x,G,[])"],
    ] as const) {
      const result = await read(root, {
        reader: "references",
        files: `prolog/${file}.pl`,
        extract: "env",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain(place);
    }
    const signal = await read(root, {
      reader: "references",
      files: "prolog/signal.pl",
      extract: "env",
    });
    // Both (:) arguments of on_signal/3 sit on one line: the place is listed once.
    if (!signal.ok) expect(signal.reason).toContain("Kibi cannot read 1 ");
  });

  test("reads goals handed to a meta-predicate a loaded project module declares", async () => {
    const root = workspace({
      "prolog/mrun.pl":
        ":- module(mrun, [run/1]).\n:- meta_predicate run(0).\nrun(G) :- call(G).\n",
      "prolog/front.pl": ":- module(front, []).\n:- reexport(mrun).\n",
      "prolog/use.pl":
        ":- module(use, [tok/1]).\n:- use_module(mrun).\ntok(V) :- run(getenv('SECRET', V)).\np(X) :- run(throw(bad_input(X))).\n",
      "prolog/far.pl":
        ":- use_module(front).\nt(V) :- run(getenv('FAR', V)).\n",
    });
    expect(
      await read(root, {
        reader: "references",
        files: "prolog/use.pl",
        extract: "env",
      }),
    ).toEqual({ ok: true, model: { members: ["SECRET"] } });
    expect(
      await read(root, {
        reader: "references",
        files: "prolog/use.pl",
        extract: "thrown",
      }),
    ).toEqual({ ok: true, model: { members: ["bad_input"] } });
    expect(
      await read(root, {
        reader: "references",
        files: "prolog/far.pl",
        extract: "env",
      }),
    ).toEqual({ ok: true, model: { members: ["FAR"] } });
  });

  test("follows consult and list loads of a file without a module header only when it is read too", async () => {
    const root = workspace({
      "prolog/list.pl": ":- module(list, []).\n:- [inc].\n",
      "prolog/many.pl":
        ":- consult(inc).\n:- load_files([inc], [if(true)]).\n:- ensure_loaded(inc).\n",
      "prolog/body.pl": "go :- consult(inc).\n",
      "prolog/mod.pl": ":- [helpers, library(lists)].\n:- consult(helpers).\n",
      "prolog/gone.pl": ":- [nosuchfile].\n",
      "prolog/inc.pl": "t(V) :- getenv('INC', V).\n",
      "prolog/helpers.pl": ":- module(helpers, [h/0]).\nh.\n",
    });
    const list = await read(root, {
      reader: "references",
      files: "prolog/list.pl",
      extract: "env",
    });
    expect(list.ok).toBe(false);
    if (!list.ok) expect(list.reason).toContain("prolog/list.pl:2 :-[inc]");
    const many = await read(root, {
      reader: "references",
      files: "prolog/many.pl",
      extract: "calls",
    });
    expect(many.ok).toBe(false);
    if (!many.ok) {
      expect(many.reason).toContain("prolog/many.pl:1 :-consult(inc)");
      expect(many.reason).toContain(
        "prolog/many.pl:2 :-load_files([inc],[if(true)])",
      );
      expect(many.reason).toContain("prolog/many.pl:3 :-ensure_loaded(inc)");
    }
    const body = await read(root, {
      reader: "references",
      files: "prolog/body.pl",
      extract: "env",
    });
    expect(body.ok).toBe(false);
    if (!body.ok)
      expect(body.reason).toContain("prolog/body.pl:1 consult(inc)");
    const gone = await read(root, {
      reader: "references",
      files: "prolog/gone.pl",
      extract: "env",
    });
    expect(gone.ok).toBe(false);
    for (const file of ["list", "many", "body"])
      expect(
        await read(root, {
          reader: "references",
          files: [`prolog/${file}.pl`, "prolog/inc.pl"],
          extract: "env",
        }),
      ).toEqual({ ok: true, model: { members: ["INC"] } });
    // A module file or a library loaded by consult brings no clauses of its own.
    expect(
      await read(root, {
        reader: "references",
        files: "prolog/mod.pl",
        extract: "imports",
      }),
    ).toEqual({ ok: true, model: { members: ["helpers", "library(lists)"] } });
  });

  test("resolves an include through a project alias to the one project file it names", async () => {
    const root = workspace({
      "src/dec.pl":
        ":- module(dec, []).\n:- include(bson(include/common)).\nd :- throw(bson_error(x)).\n",
      "src/include/common.pl":
        ":- encoding(utf8).\nc :- throw(common_error).\n",
      "src/uses.pl": ":- use_module(bson(nothere)).\n",
    });
    const alone = await read(root, {
      reader: "references",
      files: "src/dec.pl",
      extract: "thrown",
    });
    expect(alone.ok).toBe(false);
    if (!alone.ok) {
      expect(alone.reason).toContain(
        "src/dec.pl:2 :-include(bson(include/common))",
      );
      // The refusal names the file that would resolve it.
      expect(alone.reason).toContain("add src/include/common.pl to files:");
    }
    expect(
      await read(root, {
        reader: "references",
        files: ["src/dec.pl", "src/include/common.pl"],
        extract: "thrown",
      }),
    ).toEqual({ ok: true, model: { members: ["bson_error", "common_error"] } });
    const uses = await read(root, {
      reader: "references",
      files: "src/uses.pl",
      extract: "env",
    });
    expect(uses.ok).toBe(false);
    if (!uses.ok)
      expect(uses.reason).toContain(
        "src/uses.pl:1 :-use_module(bson(nothere))",
      );
  });

  test("refuses an aliased include that more than one project file could name", async () => {
    const root = workspace({
      "src/dec.pl":
        ":- module(dec, []).\n:- include(bson(include/common)).\nd.\n",
      "src/include/common.pl": "c(V) :- getenv('REAL_SECRET', V).\n",
      "vendor/include/common.pl": "c2.\n",
    });
    // A vendored copy among files is not the include: the real target reads REAL_SECRET.
    for (const files of [
      ["src/dec.pl", "vendor/include/common.pl"],
      ["src/dec.pl", "src/include/common.pl"],
      ["src/dec.pl", "src/include/common.pl", "vendor/include/common.pl"],
    ]) {
      const result = await read(root, {
        reader: "references",
        files,
        extract: "env",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toContain(
          "src/dec.pl:2 :-include(bson(include/common))",
        );
        expect(result.reason).toContain("src/include/common.pl");
        expect(result.reason).toContain("vendor/include/common.pl");
      }
    }
  });

  test("says which file to add to files: for a relative include", async () => {
    const root = workspace({
      "prolog/main.pl": ":- include(inc).\n",
      "prolog/inc.pl": "x(V) :- getenv('A', V).\n",
    });
    const result = await read(root, {
      reader: "references",
      files: "prolog/main.pl",
      extract: "env",
    });
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.reason).toContain("add prolog/inc.pl to files:");
  });

  test("reads goals in message lines and message rules, or refuses them", async () => {
    const root = workspace({
      "prolog/lines.pl": `:- module(lines, []).
:- multifile prolog:message//1.
a :- print_message_lines(user_error, '', ['~@'-[getenv('A', _)]]).
b :- print_message_lines(user_error, kind(error), [ansi(bold, "~@", [getenv('B', _)]), nl, prefix('~@'-[getenv('C', _)])]).
c :- ansi_format([bold], "~@", [getenv('D', _)]).
d(S) :- sformat(S, "~@", [getenv('E', _)]).
prolog:message(m) --> [ '~@'-[getenv('F', _)], nl, url(x, '~@'-[getenv('G', _)]) ].
prolog:message(n) --> helper.
prolog:message(ok(X)) --> [ 'ok ~w'-[X], nl, flush ].
helper --> [ '~@'-[getenv('H', _)] ].
digits([D|T]) --> [D], digits(T).
digits([]) --> [].
`,
      "prolog/throws.pl": `t :- print_message_lines(user_error, '', ['~@'-[throw(t_bad)]]).
prolog:message(x) --> [ '~@'-[throw(m_bad)] ].
`,
      "prolog/var_lines.pl":
        "a(L) :- print_message_lines(user_error, '', L).\n",
      "prolog/var_line.pl":
        "a(X) :- print_message_lines(user_error, '', [x, X]).\n",
      "prolog/var_goal.pl":
        "a(G) :- print_message_lines(user_error, '', ['~@'-[G]]).\n",
      "prolog/var_rule.pl": "prolog:message(f(F, A)) --> [F-A].\n",
    });
    expect(
      await read(root, {
        reader: "references",
        files: "prolog/lines.pl",
        extract: "env",
      }),
    ).toEqual({
      ok: true,
      model: { members: ["A", "B", "C", "D", "E", "F", "G", "H"] },
    });
    expect(
      await read(root, {
        reader: "references",
        files: "prolog/throws.pl",
        extract: "thrown",
      }),
    ).toEqual({ ok: true, model: { members: ["m_bad", "t_bad"] } });
    for (const [file, place] of [
      [
        "var_lines",
        "prolog/var_lines.pl:1 print_message_lines(user_error,'',L)",
      ],
      [
        "var_line",
        "prolog/var_line.pl:1 print_message_lines(user_error,'',[x,X])",
      ],
      ["var_goal", "prolog/var_goal.pl:1"],
      ["var_rule", "prolog/var_rule.pl:1"],
    ] as const) {
      const result = await read(root, {
        reader: "references",
        files: `prolog/${file}.pl`,
        extract: "env",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain(place);
    }
  });

  test("reads a {Goal} grammar body handed to phrase or call_dcg", async () => {
    const root = workspace({
      "prolog/dcg.pl": `a(L) :- call_dcg({getenv('A', _)}, L, _).
b(L) :- phrase(({getenv('B', _)}, "x"), L).
c(L) :- phrase({throw(c_bad)}, L).
d(L) :- phrase(lines:digits(_), L).
`,
      "prolog/open.pl": "a(B, L) :- phrase(B, L).\n",
    });
    expect(
      await read(root, {
        reader: "references",
        files: "prolog/dcg.pl",
        extract: "env",
      }),
    ).toEqual({ ok: true, model: { members: ["A", "B"] } });
    expect(
      await read(root, {
        reader: "references",
        files: "prolog/dcg.pl",
        extract: "thrown",
      }),
    ).toEqual({ ok: true, model: { members: ["c_bad"] } });
    const calls = await read(root, {
      reader: "references",
      files: "prolog/dcg.pl",
      extract: "calls",
    });
    expect(calls.ok).toBe(true);
    if (calls.ok) {
      expect(calls.model.members).toEqual(
        expect.arrayContaining(["getenv/2", "throw/1", "lines:digits/3"]),
      );
      expect(calls.model.members).not.toContain("{}/3");
    }
    const open = await read(root, {
      reader: "references",
      files: "prolog/open.pl",
      extract: "env",
    });
    expect(open.ok).toBe(false);
    if (!open.ok) expect(open.reason).toContain("prolog/open.pl:1 phrase(B,L)");
  });

  test("lists autoloaded libraries and writes library specs one way", async () => {
    const root = workspace({
      "prolog/spell.pl":
        ':- use_module(library("utf8")).\n:- use_module(library(\'http/json\')).\n:- use_module(library("http/json")).\n',
      "prolog/auto.pl": ":- autoload(library(utf8)).\n",
      "prolog/call.pl": "p(L) :- phrase(utf8_codes(C), L), atom_codes(_, C).\n",
      "prolog/own.pl": "p(L) :- utf8_codes(L, [], []).\nutf8_codes(_, _, _).\n",
      "prolog/helpers.pl":
        ":- module(helpers, [h_codes/1, utf8_codes//1]).\nh_codes(_).\nutf8_codes(_) --> [].\n",
      "prolog/via.pl":
        ":- use_module(helpers).\np(L) :- phrase(utf8_codes(_), L).\n",
    });
    for (const [file, members] of [
      ["spell", ["library(http/json)", "library(utf8)"]],
      ["auto", ["library(utf8)"]],
      ["call", ["library(utf8)"]],
      ["own", []],
      ["via", ["helpers"]],
    ] as const)
      expect(
        await read(root, {
          reader: "references",
          files: `prolog/${file}.pl`,
          extract: "imports",
        }),
      ).toEqual({ ok: true, model: { members: [...members] } });
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
