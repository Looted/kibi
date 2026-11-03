:- use_module(library(plunit)).
:- use_module(library(http/json)).
:- use_module('../src/code_certificates.pl').
:- use_module(test_helpers).

% Each kind starts from a certificate that re-checks, and each test changes
% one field and names the exact rejection.

:- begin_tests(code_certificates).

accepts(Certificate) :-
    first_answer_is_last(code_certificate_check(Certificate, Result)),
    Result == ok.

rejects(Certificate, Reason) :-
    code_certificate_check(Certificate, Result),
    Result == rejected(Reason).

cert(Kind, Fields, Certificate) :-
    put_dict(Fields, _{version: "kibi.code-certificate.v1", test_id: "TEST-1", kind: Kind}, Certificate).

with(Certificate0, Key, Value, Certificate) :-
    put_dict(Key, Certificate0, Value, Certificate).

with(Certificate0, Outer, Key, Value, Certificate) :-
    get_dict(Outer, Certificate0, Inner0),
    put_dict(Key, Inner0, Value, Inner),
    put_dict(Outer, Certificate0, Inner, Certificate).

without(Certificate0, Key, Certificate) :-
    del_dict(Key, Certificate0, _, Certificate).

without(Certificate0, Outer, Key, Certificate) :-
    get_dict(Outer, Certificate0, Inner0),
    del_dict(Key, Inner0, _, Inner),
    put_dict(Outer, Certificate0, Inner, Certificate).

% --- the frame --------------------------------------------------------------

test(not_an_object) :-
    rejects([], "the certificate is not an object").

test(wrong_version) :-
    exhaustive(C0),
    with(C0, version, "kibi.code-certificate.v2", C),
    rejects(C, "the certificate version is not kibi.code-certificate.v1"),
    without(C0, version, C2),
    rejects(C2, "the certificate version is not kibi.code-certificate.v1").

test(test_id_required) :-
    exhaustive(C0),
    without(C0, test_id, C1),
    rejects(C1, "the certificate names no test_id"),
    with(C0, test_id, "", C2),
    rejects(C2, "the certificate names no test_id"),
    with(C0, test_id, 'TEST-1', C3),
    rejects(C3, "the certificate names no test_id").

test(unknown_kind) :-
    Reason = "the certificate kind is not exhaustive, typecheck, arithmetic, smt, rule, state_machine, regex or source",
    cert("proof", _{}, C1),
    rejects(C1, Reason),
    cert(exhaustive, _{}, C2),
    rejects(C2, Reason),
    cert("exhaustive", _{}, C3),
    without(C3, kind, C4),
    rejects(C4, Reason).

test(malformed_is_rejected) :-
    rule(C0),
    with(C0, predicates, _{allowed: _{symbol_id: "s", arg_types: ["role"],
                                      rows: [_{args: [_{x: 1}], error: "boom"}]}}, C),
    rejects(C, "the certificate is malformed").

% --- exhaustive -------------------------------------------------------------

exhaustive(C) :-
    cert("exhaustive", _{domain: _{symbol_id: "Role", members: ["a", "b"]},
                         results: [_{member: "b", outcome: "passed"}, _{member: "a", outcome: "passed"}]}, C).

test(exhaustive_accepts) :-
    exhaustive(C),
    accepts(C).

test(exhaustive_domain) :-
    exhaustive(C0),
    without(C0, domain, C1),
    rejects(C1, "the certificate has no domain"),
    with(C0, domain, ["a"], C2),
    rejects(C2, "the certificate has no domain"),
    without(C0, domain, symbol_id, C3),
    rejects(C3, "the domain names no symbol_id"),
    with(C0, domain, symbol_id, "", C4),
    rejects(C4, "the domain names no symbol_id").

test(exhaustive_members) :-
    exhaustive(C0),
    without(C0, domain, members, C1),
    rejects(C1, "the domain lists no members"),
    with(C0, domain, members, [], C2),
    rejects(C2, "the domain lists no members"),
    with(C0, domain, members, "a", C3),
    rejects(C3, "the domain lists no members"),
    with(C0, domain, members, ["a", ""], C4),
    rejects(C4, "every domain member must be a non-empty string"),
    with(C0, domain, members, ["a", "b", "a"], C5),
    rejects(C5, "the domain lists a member twice").

test(exhaustive_results) :-
    exhaustive(C0),
    without(C0, results, C1),
    rejects(C1, "the certificate has no results"),
    with(C0, results, [_{member: "a"}], C2),
    rejects(C2, "every result must name a member and an outcome"),
    with(C0, results, [_{outcome: "passed"}], C3),
    rejects(C3, "every result must name a member and an outcome"),
    with(C0, results, ["a"], C4),
    rejects(C4, "every result must name a member and an outcome"),
    with(C0, results, [_{member: "a", outcome: "passed"}], C5),
    rejects(C5, "the results do not name every domain member exactly once"),
    with(C0, results, [_{member: "a", outcome: "passed"}, _{member: "b", outcome: "passed"},
                       _{member: "a", outcome: "passed"}], C6),
    rejects(C6, "the results do not name every domain member exactly once").

test(exhaustive_failed_member) :-
    exhaustive(C0),
    with(C0, results, [_{member: "a", outcome: "passed"}, _{member: "b", outcome: "failed"}], C),
    rejects(C, "member b did not pass").

% --- typecheck --------------------------------------------------------------

hash("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef").

typecheck(C) :-
    hash(Hash),
    cert("typecheck", _{witness: _{path: "proof/role.ts", sha256: Hash},
                        domain: _{symbol_id: "Role"},
                        compiler: _{name: "tsc", version: "5.4"},
                        outcome: "passed"}, C).

test(typecheck_accepts) :-
    typecheck(C),
    accepts(C).

test(typecheck_witness) :-
    typecheck(C0),
    without(C0, witness, path, C1),
    rejects(C1, "the certificate names no witness path"),
    with(C0, witness, path, "", C2),
    rejects(C2, "the certificate names no witness path"),
    without(C0, witness, sha256, C3),
    rejects(C3, "the witness has no sha256"),
    with(C0, witness, sha256, "0123", C4),
    rejects(C4, "the witness has no sha256"),
    with(C0, witness, sha256, "0123456789ABCDEF0123456789abcdef0123456789abcdef0123456789abcdef", C5),
    rejects(C5, "the witness has no sha256"),
    with(C0, witness, sha256, "0123456789abcdeg0123456789abcdef0123456789abcdef0123456789abcdef", C6),
    rejects(C6, "the witness has no sha256"),
    hash(Hash),
    atom_string(HashAtom, Hash),
    with(C0, witness, sha256, HashAtom, C7),
    rejects(C7, "the witness has no sha256"),
    with(C0, witness, sha256, "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcde/", C8),
    rejects(C8, "the witness has no sha256"),
    with(C0, witness, sha256, "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcde`", C9),
    rejects(C9, "the witness has no sha256").

test(typecheck_symbol_and_compiler) :-
    typecheck(C0),
    with(C0, domain, symbol_id, "", C1),
    rejects(C1, "the certificate names no domain symbol_id"),
    with(C0, compiler, name, "", C2),
    rejects(C2, "the certificate names no compiler and version"),
    without(C0, compiler, version, C3),
    rejects(C3, "the certificate names no compiler and version"),
    with(C0, outcome, "failed", C4),
    rejects(C4, "the type checker did not accept the witness").

% --- arithmetic -------------------------------------------------------------

arithmetic(Type, Assumptions, Claim, C) :-
    cert("arithmetic", _{variable: "count", value_type: Type, assumptions: Assumptions, claim: Claim}, C).

c(Op, Value, _{operator: Op, value: Value}).

test(arithmetic_accepts) :-
    c("gte", 1, A1), c("lte", 3, A2), c("gt", 0, Claim),
    arithmetic("int", [A1, A2], Claim, C),
    accepts(C).

test(arithmetic_int_versus_real) :-
    % Over the integers x > 3 and x < 5 force 4; over the reals they do not.
    c("gt", 3, A1), c("lt", 5, A2), c("eq", 4, Claim),
    arithmetic("int", [A1, A2], Claim, Int),
    accepts(Int),
    arithmetic("real", [A1, A2], Claim, Real),
    rejects(Real, "the assumptions do not entail the claim: count = 3.5 satisfies them and breaks it").

test(arithmetic_fields) :-
    c("gte", 1, A), c("gt", 0, Claim),
    arithmetic("int", [A], Claim, C0),
    with(C0, variable, "", C1),
    rejects(C1, "the certificate names no variable"),
    with(C0, value_type, "float", C2),
    rejects(C2, "value_type must be int or real"),
    without(C0, value_type, C5),
    rejects(C5, "value_type must be int or real"),
    with(C0, assumptions, [], C3),
    rejects(C3, "the certificate states no assumptions"),
    without(C0, assumptions, C4),
    rejects(C4, "the certificate states no assumptions").

test(arithmetic_constraint_shapes) :-
    AssumptionReason = "every assumption must be {operator, value} with a comparison operator and a number",
    ClaimReason = "the claim must be {operator, value} with a comparison operator and a number",
    c("gt", 0, Claim), c("gte", 1, Good),
    forall(member(Bad, [_{operator: "approx", value: 1}, _{operator: gte, value: 1},
                        _{operator: "gte", value: "1"}, _{value: 1}, _{operator: "gte"}, "gte 1"]),
           ( arithmetic("int", [Good, Bad], Claim, C), rejects(C, AssumptionReason),
             arithmetic("int", [Good], Bad, D), rejects(D, ClaimReason) )),
    forall(member(Op, ["eq", "neq", "lt", "lte", "gt", "gte"]),
           ( c(Op, 1, Any), arithmetic("real", [Good], Any, E),
             code_certificate_check(E, Result), Result \= rejected(ClaimReason) )).

test(arithmetic_contradiction) :-
    c("gte", 5, A1), c("lte", 3, A2), c("neq", 4, A3), c("gt", 0, Claim),
    arithmetic("int", [A1, A2, A3], Claim, C),
    rejects(C, "the assumptions contradict each other (count >= 5 and count <= 3 and count != 4), so no value satisfies them and they prove nothing about the claim"),
    c("lt", 1, B1), c("gt", 0, B2), c("eq", 0, B3),
    arithmetic("int", [B1, B2, B3], Claim, D),
    rejects(D, "the assumptions contradict each other (count < 1 and count > 0 and count = 0), so no value satisfies them and they prove nothing about the claim").

test(arithmetic_counterexamples) :-
    c("gte", 0, A0),
    c("eq", 4, Exactly4), arithmetic("int", [A0], Exactly4, C1),
    rejects(C1, "the assumptions do not entail the claim: count = 0 satisfies them and breaks it"),
    c("gte", 5, A5), c("neq", 5, Not5), arithmetic("int", [A5], Not5, C2),
    rejects(C2, "the assumptions do not entail the claim: count = 5 satisfies them and breaks it"),
    c("lte", -3, Below), c("gt", -10, Claim3), arithmetic("int", [Below], Claim3, C3),
    rejects(C3, "the assumptions do not entail the claim: count = -11 satisfies them and breaks it"),
    c("gt", 2, Above), c("lt", 10, Claim4), arithmetic("int", [Above], Claim4, C4),
    rejects(C4, "the assumptions do not entail the claim: count = 10 satisfies them and breaks it"),
    c("lte", 7, Upto7), c("lte", 6, Claim5), arithmetic("int", [Upto7], Claim5, C5),
    rejects(C5, "the assumptions do not entail the claim: count = 7 satisfies them and breaks it"),
    c("lt", 2, Lt2), c("lt", 1, Claim6), arithmetic("real", [Lt2], Claim6, C6),
    rejects(C6, "the assumptions do not entail the claim: count = 1.0 satisfies them and breaks it"),
    c("gt", 2, Gt2), c("gte", 3, Claim7), arithmetic("real", [Gt2], Claim7, C7),
    rejects(C7, "the assumptions do not entail the claim: count = 2.5 satisfies them and breaks it").

test(arithmetic_counterexample_probes_around_zero) :-
    c("neq", 1, A), c("eq", 1, Claim),
    arithmetic("int", [A], Claim, C),
    rejects(C, "the assumptions do not entail the claim: count = -1 satisfies them and breaks it").

test(arithmetic_counterexample_above_a_constant) :-
    c("gt", 5, A), c("lte", 5, Claim),
    arithmetic("int", [A], Claim, C),
    rejects(C, "the assumptions do not entail the claim: count = 6 satisfies them and breaks it").

test(arithmetic_counterexample_int_skips_fractions) :-
    % 3.5 lies next to 2.5 and passes both checks, but is no integer.
    c("gte", 3.5, A), c("gt", 4, Claim),
    arithmetic("int", [A], Claim, C),
    rejects(C, "the assumptions do not entail the claim: count = 4 satisfies them and breaks it").

test(arithmetic_counterexample_checks_neq_assumptions) :-
    c("gte", 0, A1), c("neq", 0, A2), c("gt", 1, Claim),
    arithmetic("int", [A1, A2], Claim, C),
    rejects(C, "the assumptions do not entail the claim: count = 1 satisfies them and breaks it").

test(arithmetic_counterexample_unnamed) :-
    % The probe values sit half a unit from each constant, and none of them
    % lies strictly between 0 and 0.5 while breaking "= 0.25".
    c("gt", 0, A1), c("lt", 0.5, A2), c("eq", 0.25, Claim),
    arithmetic("real", [A1, A2], Claim, C),
    rejects(C, "the assumptions do not entail the claim: some value satisfies them and breaks it").

% --- smt --------------------------------------------------------------------

smt(C) :-
    cert("smt", _{solver: _{name: "z3", version: "4.13"},
                  query: "(declare-const x Int)(assert (> x x))(check-sat)", result: "unsat"}, C).

test(smt_accepts) :-
    smt(C),
    accepts(C).

test(smt_fields) :-
    smt(C0),
    with(C0, solver, name, "", C1),
    rejects(C1, "the certificate names no solver and version"),
    with(C0, solver, version, "", C2),
    rejects(C2, "the certificate names no solver and version"),
    with(C0, query, "", C3),
    rejects(C3, "the certificate has no query"),
    with(C0, query, "(assert false)", C4),
    rejects(C4, "the query never asks (check-sat)"),
    with(C0, result, "sat", C5),
    rejects(C5, "the solver did not answer unsat").

% --- rule -------------------------------------------------------------------

rule(C) :-
    cert("rule", _{domains: _{role: _{members: ["coach", "admin"]}, action: _{members: ["read"]}},
                   predicates: _{allowed: _{symbol_id: "allowed", arg_types: ["role", "action"],
                                            rows: [_{args: ["coach", "read"], value: true},
                                                   _{args: ["admin", "read"], value: false}]}}}, C).

allowed(C0, Key, Value, C) :-
    get_dict(predicates, C0, Predicates0),
    get_dict(allowed, Predicates0, Table0),
    put_dict(Key, Table0, Value, Table),
    put_dict(allowed, Predicates0, Table, Predicates),
    put_dict(predicates, C0, Predicates, C).

test(rule_accepts) :-
    rule(C),
    accepts(C).

test(rule_domains) :-
    rule(C0),
    with(C0, domains, _{}, C1),
    rejects(C1, "the certificate has no domains"),
    with(C0, domains, ["role"], C2),
    rejects(C2, "the certificate has no domains"),
    forall(member(Members, [[], ["a", "a"], ["a", b], "a"]),
           ( with(C0, domains, _{role: _{members: Members}}, C),
             rejects(C, "the domain role must list distinct values, at least one") )),
    with(C0, domains, _{role: _{}}, C3),
    rejects(C3, "the domain role must list distinct values, at least one").

test(rule_predicates) :-
    rule(C0),
    with(C0, predicates, _{}, C1),
    rejects(C1, "the certificate has no predicate tables"),
    with(C0, predicates, [], C2),
    rejects(C2, "the certificate has no predicate tables"),
    with(C0, predicates, "tables", C3),
    rejects(C3, "the certificate has no predicate tables"),
    with(C0, domains, "role", C4),
    rejects(C4, "the certificate has no domains").

test(rule_table_symbol_and_types) :-
    rule(C0),
    allowed(C0, symbol_id, "", C1),
    rejects(C1, "the table for allowed names no symbol_id"),
    TypesReason = "the table for allowed must name 1 to 8 argument types, each with a domain",
    forall(member(Types, [[], "role", [role], ["colour"], ["role", "role", "role", "role", "role", "role", "role", "role", "role"]]),
           ( allowed(C0, arg_types, Types, C), rejects(C, TypesReason) )).

test(rule_table_eight_types) :-
    rule(C0),
    length(Types, 8), maplist(=("action"), Types),
    length(Args, 8), maplist(=("read"), Args),
    allowed(C0, arg_types, Types, C1),
    allowed(C1, rows, [_{args: Args, value: true}], C),
    accepts(C).

test(rule_table_rows) :-
    rule(C0),
    allowed(C0, rows, "none", C1),
    rejects(C1, "the table for allowed has no rows"),
    allowed(C0, rows, [_{args: ["coach", "read"], error: "TypeError: x is undefined"}, _{args: ["admin", "read"], value: false}], C2),
    rejects(C2, "allowed(coach, read) failed: TypeError: x is undefined").

test(rule_error_row_without_args) :-
    rule(C0),
    allowed(C0, rows, [_{error: "boom"}, _{args: ["admin", "read"], value: false}], C),
    rejects(C, "every row of allowed must give one value per argument from its domain and a boolean").

test(rule_table_row_shapes) :-
    rule(C0),
    Reason = "every row of allowed must give one value per argument from its domain and a boolean",
    allowed(C0, rows, ["row"], NotDict),
    rejects(NotDict, "the certificate is malformed"),
    forall(member(Bad, [_{value: true}, _{args: "coach", value: true}, _{args: ["coach"], value: true},
                        _{args: ["coach", "write"], value: true}, _{args: ["read", "read"], value: true},
                        _{args: ["coach", "read"]},
                        _{args: ["coach", "read"], value: "true"}]),
           ( allowed(C0, rows, [Bad, _{args: ["admin", "read"], value: false}], C), rejects(C, Reason) )).

test(rule_table_combinations) :-
    rule(C0),
    allowed(C0, rows, [_{args: ["coach", "read"], value: true}, _{args: ["coach", "read"], value: false}], C1),
    rejects(C1, "the table for allowed lists a combination twice"),
    allowed(C0, rows, [_{args: ["coach", "read"], value: true}], C2),
    rejects(C2, "the table for allowed has 1 rows, not one per combination of its domains (2)").

% --- state_machine ----------------------------------------------------------

machine(C) :-
    cert("state_machine", _{machine: _{symbol_id: "Order", states: ["open", "paid", "closed"],
                                       transitions: [["open", "paid"], ["paid", "closed"]],
                                       initial: ["open"]}}, C).

test(machine_accepts) :-
    machine(C0),
    accepts(C0),
    without(C0, machine, initial, C1),
    accepts(C1).

test(machine_fields) :-
    machine(C0),
    without(C0, machine, C1),
    rejects(C1, "the certificate has no machine"),
    with(C0, machine, symbol_id, "", C2),
    rejects(C2, "the machine names no symbol_id"),
    forall(member(States, [[], ["open", "open"], "open"]),
           ( with(C0, machine, states, States, C), rejects(C, "the machine must list distinct states, at least one") )),
    with(C0, machine, transitions, "open->paid", C3),
    rejects(C3, "the machine has no transitions list").

test(machine_transitions) :-
    machine(C0),
    Reason = "every transition must be a [from, to] pair of the machine's states",
    forall(member(Edge, ["open", ["open"], ["open", "paid", "closed"], ["open", "lost"], ["lost", "open"]]),
           ( with(C0, machine, transitions, [["open", "paid"], Edge], C), rejects(C, Reason) )),
    with(C0, machine, transitions, [["open", "paid"], ["open", "paid"]], C1),
    rejects(C1, "the machine lists a transition twice").

test(machine_initial) :-
    machine(C0),
    Reason = "the machine's initial states must be states of the machine",
    with(C0, machine, initial, "open", C1),
    rejects(C1, Reason),
    with(C0, machine, initial, ["open", "lost"], C2),
    rejects(C2, Reason).

% --- regex ------------------------------------------------------------------

regexp(C) :-
    cert("regex", _{pattern: _{symbol_id: "EMAIL", type: "regexp", source: "^a+$", flags: "i", flavor: "js"}}, C).

test(regex_accepts) :-
    regexp(C0),
    accepts(C0),
    with(C0, pattern, flavor, "python", C1),
    accepts(C1),
    cert("regex", _{pattern: _{symbol_id: "GREETING", type: "string", value: "hello"}}, C2),
    accepts(C2).

test(regex_fields) :-
    regexp(C0),
    without(C0, pattern, C1),
    rejects(C1, "the certificate has no pattern"),
    with(C0, pattern, symbol_id, "", C2),
    rejects(C2, "the pattern names no symbol_id"),
    without(C0, pattern, source, C3),
    rejects(C3, "a regexp pattern must give its source and flags"),
    with(C0, pattern, flags, i, C4),
    rejects(C4, "a regexp pattern must give its source and flags"),
    with(C0, pattern, flavor, "pcre", C5),
    rejects(C5, "a regexp pattern's flavor must be js or python"),
    with(C0, pattern, type, "glob", C6),
    rejects(C6, "the pattern's type must be regexp or string"),
    cert("regex", _{pattern: _{symbol_id: "GREETING", type: "string", value: hello}}, C7),
    rejects(C7, "a string pattern must give its value").

% --- source -----------------------------------------------------------------

source(C) :-
    cert("source", _{source: _{reader: "zod", spec: "src/schema.ts"},
                     model: _{members: ["a", "b"]}}, C).

entity(_{name: "users", columns: [_{name: "id", nullable: false, optional: false},
                                  _{name: "email", nullable: true, optional: true}]}).

route(_{method: "GET", path: "/users", middleware: ["auth"]}).

test(source_accepts) :-
    source(C0),
    accepts(C0),
    entity(E), route(R),
    with(C0, model, _{members: ["a", "b"], entities: [E, E.put(foreign_keys, ["orgs"])],
                      routes: [R], sequence: ["b", "a", "b"]}, C1),
    accepts(C1).

test(source_reader) :-
    source(C0),
    Reason = "the certificate names no source reader",
    without(C0, source, C1),
    rejects(C1, Reason),
    with(C0, source, "zod", C2),
    rejects(C2, Reason),
    without(C0, source, reader, C3),
    rejects(C3, Reason),
    with(C0, source, reader, "", C4),
    rejects(C4, Reason).

test(source_model) :-
    source(C0),
    without(C0, model, C1),
    rejects(C1, "the certificate has no model of what Kibi read"),
    Reason = "the source model's members must be a sorted list of distinct strings",
    forall(member(Members, [["b", "a"], ["a", "a"], ["a", b], "a"]),
           ( with(C0, model, members, Members, C), rejects(C, Reason) )),
    with(C0, model, members, [], C2),
    accepts(C2).

test(source_entities) :-
    source(C0),
    Reason = "every source entity must have a name and columns of {name, nullable, optional}",
    entity(E),
    Col = _{name: "id", nullable: false, optional: false},
    forall(member(Bad, ["users", E.put(name, ""), _{columns: []}, E.put(columns, "id"), _{name: "u"},
                        E.put(columns, ["id"]), E.put(columns, [Col.put(name, "")]),
                        E.put(columns, [Col.put(nullable, "no")]), E.put(columns, [Col.put(optional, 0)]),
                        E.put(columns, [_{nullable: false, optional: false}]),
                        E.put(columns, [_{name: "id", optional: false}]),
                        E.put(columns, [_{name: "id", nullable: false}]),
                        E.put(foreign_keys, "orgs"), E.put(foreign_keys, [orgs])]),
           ( with(C0, model, entities, [E, Bad], C), rejects(C, Reason) )),
    with(C0, model, entities, "users", C1),
    rejects(C1, Reason).

test(source_routes) :-
    source(C0),
    Reason = "every source route must have a method, a path and a middleware list",
    route(R),
    forall(member(Bad, ["GET /", R.put(method, ""), R.put(path, ""), R.put(middleware, "auth"),
                        R.put(middleware, [auth]), _{path: "/", middleware: []}, _{method: "GET", middleware: []},
                        _{method: "GET", path: "/"}]),
           ( with(C0, model, routes, [R, Bad], C), rejects(C, Reason) )),
    with(C0, model, routes, "GET /", C1),
    rejects(C1, Reason).

test(source_sequence) :-
    source(C0),
    Reason = "the source model's sequence must list the members in the order read",
    forall(member(Sequence, ["ab", ["a"], ["a", b], ["a", "b", "c"]]),
           ( with(C0, model, sequence, Sequence, C), rejects(C, Reason) )).

% --- digest and JSON entry point --------------------------------------------

test(digest_is_sha256_of_canonical_json) :-
    code_certificate_digest(_{b: 1, a: "x"}, Digest),
    crypto_data_hash("{\"a\":\"x\",\"b\":1}", Expected, [algorithm(sha256), encoding(utf8)]),
    Digest == Expected.

canonical(Value, Json) :-
    code_certificates:canonical_json(Value, Json).

test(canonical_objects_and_lists) :-
    canonical(_{b: [1, true, false, null], a: _{}, 'A': [], c: 'atom'}, J1),
    J1 == "{\"A\":[],\"a\":{},\"b\":[1,true,false,null],\"c\":\"atom\"}",
    canonical(_{2: "two", 10: "ten"}, J2),
    J2 == "{\"10\":\"ten\",\"2\":\"two\"}",
    canonical(-42, J3),
    J3 == "-42".

test(canonical_json_leaves_no_choicepoint) :-
    forall(member(Value, [_{a: 1}, [1], "s", 7, true, null, atom, 1.5]),
           first_answer_is_last(code_certificate_digest(Value, _))).

test(canonical_atom_escapes_like_a_string) :-
    atom_codes(Atom, [0'a, 0xe9]),
    canonical(Atom, Json),
    Json == "\"a\\u00e9\"".

test(canonical_float_uses_json_write) :-
    canonical(1.5, Json),
    Json == "1.5".

test(canonical_string_escapes) :-
    atom_codes(Text, [0'", 0'\\, 8, 12, 10, 13, 9, 0'a, 0x1f, 0x7e, 0x7f, 0xe9, 0x1F600, 0x20]),
    atom_string(Text, String),
    canonical(String, Json),
    Json == "\"\\\"\\\\\\b\\f\\n\\r\\ta\\u001f~\\u007f\\u00e9\\ud83d\\ude00 \"",
    canonical([0x10000, 0xffff], _),
    atom_codes(Edge, [0xffff, 0x10000, 0x10ffff]),
    atom_string(Edge, EdgeString),
    canonical(EdgeString, EdgeJson),
    EdgeJson == "\"\\uffff\\ud800\\udc00\\udbff\\udfff\"".

test(check_json_accepted) :-
    exhaustive(C),
    atom_json_dict(Json, C, [width(0)]),
    code_certificate_check_json(Json, Out),
    \+ sub_string(Out, _, _, _, "\n"),
    atom_json_dict(Out, Dict, [value_string_as(string)]),
    code_certificate_digest(C, DigestAtom),
    atom_string(DigestAtom, Digest),
    same(Dict, _{accepted: true, digest: Digest}).

test(check_json_rejected) :-
    smt(C0),
    with(C0, result, "sat", C),
    atom_json_dict(Json, C, [width(0)]),
    code_certificate_check_json(Json, Out),
    atom_json_dict(Out, Dict, [value_string_as(string)]),
    code_certificate_digest(C, DigestAtom),
    atom_string(DigestAtom, Digest),
    same(Dict, _{accepted: false, digest: Digest, reason: "the solver did not answer unsat"}).

test(check_json_not_an_object) :-
    forall(member(Json, ["[1]", "not json"]),
           ( code_certificate_check_json(Json, Out),
             atom_json_dict(Out, Dict, [value_string_as(string)]),
             same(Dict, _{accepted: false, reason: "the certificate is not a JSON object"}) )).

test(check_json_strings_stay_strings) :-
    code_certificate_check_json("{\"version\":\"kibi.code-certificate.v1\",\"test_id\":\"T\",\"kind\":\"smt\",\"solver\":{\"name\":\"z3\",\"version\":\"4\"},\"query\":\"(check-sat)\",\"result\":\"unsat\"}", Out),
    atom_json_dict(Out, Dict, []),
    get_dict(accepted, Dict, true).

:- end_tests(code_certificates).
