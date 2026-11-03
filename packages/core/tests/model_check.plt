:- use_module(library(plunit)).
:- use_module(library(http/json)).
:- use_module('../src/model_check.pl').
:- use_module(kb_fixture).
:- use_module(test_helpers).

% Obligations decided against the finite model a certificate records. The
% certificates are written as JSON reads them (text as strings); rules are
% given as the terms logic_ir.pl reads from a rule_ir.

mc_check(Kind, Obligation, Certificate, Result) :-
    first_answer_is_last(model_check_obligation(Kind, Obligation, Certificate, Result0)),
    ground(Result0),
    Result = Result0.

mc_problem(Kind, Obligation, Certificate, Reason) :-
    mc_check(Kind, Obligation, Certificate, Result),
    (   Result == problem(Reason)
    ->  true
    ;   print_message(error, format("expected ~q, got ~q", [problem(Reason), Result])),
        fail
    ).

% --- the rule model ---------------------------------------------------------

:- begin_tests(model_check_rule_model).

roles(_{domains: _{role: _{members: ["coach", "admin"]}, action: _{members: ["read"]}},
        predicates: _{allowed: _{rows: [_{args: ["coach", "read"], value: true},
                                        _{args: ["admin", "read"], value: false}]},
                      staff: _{rows: [_{args: ["coach"], value: "true"}, _{args: ["admin"], value: "false"}]}}}).

holds(Name, Args, Value, _{kind: "predicate_holds", predicate: Name, args: Args, value: Value}).

test(predicate_holds) :-
    roles(C),
    holds("allowed", ["coach", "read"], true, O1),
    mc_check(rule, O1, C, ok),
    holds("allowed", ["admin", "read"], "false", O2),
    mc_check(rule, O2, C, ok),
    holds("staff", [coach], true, O3),
    mc_check(rule, O3, C, ok),
    holds(allowed, ["admin", "read"], true, O4),
    mc_problem(rule, O4, C, "the code decides allowed(admin, read) is false, but the fact says true").

test(predicate_not_in_the_model) :-
    roles(C),
    holds("allowed", ["guest", "read"], true, O),
    mc_problem(rule, O, C, "allowed(guest, read) is not in the certificate's model: name the function behind allowed in proof_contract.predicate_source and make each argument's domain list guest, read").

test(model_values_must_be_booleans) :-
    roles(C0),
    put_dict(predicates, C0, _{allowed: _{rows: [_{args: ["coach", "read"], value: 1}]}}, C),
    holds("allowed", ["coach", "read"], true, O),
    mc_problem(rule, O, C, "a predicate table holds a value that is not a boolean"),
    roles(C1),
    holds("allowed", ["coach", "read"], "yes", O2),
    mc_problem(rule, O2, C1, "a predicate table holds a value that is not a boolean").

test(model_values_must_be_text) :-
    roles(C0),
    put_dict(predicates, C0, _{allowed: _{rows: [_{args: [_{a: 1}], value: true}]}}, C),
    holds("allowed", ["coach"], true, O),
    mc_problem(rule, O, C, "a model value is not text"),
    put_dict(predicates, C0, _{allowed: _{rows: [_{args: [7], value: true}]}}, C2),
    holds("allowed", [7], true, O2),
    mc_check(rule, O2, C2, ok).

test(certificate_fields_required) :-
    roles(C0),
    holds("allowed", ["coach", "read"], true, O),
    del_dict(domains, C0, _, NoDomains),
    mc_problem(rule, O, NoDomains, "the certificate has no domains"),
    del_dict(predicates, C0, _, NoPredicates),
    mc_problem(rule, O, NoPredicates, "the certificate has no predicates"),
    mc_problem(rule, O, "certificate", "the certificate has no domains"),
    put_dict(domains, C0, _{role: _{}}, NoMembers),
    mc_problem(rule, O, NoMembers, "the certificate has no members"),
    put_dict(predicates, C0, _{allowed: _{}}, NoRows),
    mc_problem(rule, O, NoRows, "the certificate has no rows"),
    put_dict(predicates, C0, _{allowed: _{rows: [_{value: true}]}}, NoArgs),
    mc_problem(rule, O, NoArgs, "the certificate has no args"),
    put_dict(predicates, C0, _{allowed: _{rows: [_{args: []}]}}, NoValue),
    mc_problem(rule, O, NoValue, "the certificate has no value").

test(every_member) :-
    roles(C),
    mc_check(rule, _{kind: "every_member", predicate: "staff", members: ["coach"]}, C, ok),
    mc_problem(rule, _{kind: "every_member", predicate: "staff", members: ["coach", admin]}, C,
               "the code decides staff(admin) is false, so not every member of the set satisfies staff"),
    mc_problem(rule, _{kind: "every_member", predicate: "staff", members: ["guest"]}, C,
               "staff(guest) is not in the certificate's model: name the function behind staff in proof_contract.predicate_source and make each argument's domain list guest").

test(unknown_kinds) :-
    roles(C),
    mc_problem(smt, _{kind: "predicate_holds"}, C, "a smt certificate has no finite model to check"),
    mc_problem(rule, _{kind: "count_holds"}, C, "a count_holds obligation cannot be checked against a finite model"),
    mc_problem(rule, _{kind: count_holds}, C, "a count_holds obligation cannot be checked against a finite model").

test(failing_bodies_are_unreadable) :-
    roles(C),
    Reason = "Kibi could not check the obligation against the certificate's model",
    mc_problem(rule, _{kind: "every_member", predicate: "staff"}, C, Reason),
    mc_problem(rule, _{kind: "predicate_holds", predicate: "staff", args: [7]}, C, Reason),
    mc_problem(state_machine, _{kind: "machine_relation", projection: "states", operator: "eq"},
               _{machine: _{states: [], transitions: []}}, Reason),
    mc_problem(state_machine, _{kind: "machine_set", projection: "states"},
               _{machine: _{states: [], transitions: []}}, Reason),
    Source = _{model: _{members: [], entities: [_{name: "t", columns: []}], routes: [_{method: "GET", path: "/", middleware: []}],
                        sequence: []}},
    forall(member(Kind, ["set_relation", "required_fields", "nullable_fields", "route_middleware", "sequence_precedes"]),
           mc_problem(source, _{kind: Kind, operator: "eq"}, Source, Reason)),
    mc_problem(source, _{kind: "set_relation", members: []}, Source, Reason),
    mc_problem(source, _{kind: "set_relation", operator: "eq", members: []}, _{model: _{members: [_{a: 1}]}}, Reason).

test(unreadable_obligations) :-
    roles(C),
    Reason = "Kibi could not check the obligation against the certificate's model",
    mc_problem(rule, _{predicate: "allowed"}, C, Reason),
    mc_problem(rule, "predicate_holds", C, Reason),
    mc_problem(rule, _{kind: "predicate_holds", predicate: "allowed", value: true}, C, Reason),
    mc_problem(rule, _{kind: "predicate_holds", predicate: "allowed", args: ["coach", "read"]}, C, Reason).

:- end_tests(model_check_rule_model).

% --- the state machine model ------------------------------------------------

:- begin_tests(model_check_machine).

% open -> paid -> shipped -> closed, open -> cancelled; lost is unreachable
machine(_{machine: _{states: ["open", "paid", "shipped", "closed", "cancelled", "lost"],
                     transitions: [["open", "paid"], ["paid", "shipped"], ["shipped", "closed"],
                                   ["open", "cancelled"], ["lost", "closed"]],
                     initial: ["open"]}}).

no_initial(C) :-
    machine(C0),
    get_dict(machine, C0, M0),
    del_dict(initial, M0, _, M),
    put_dict(machine, C0, M, C).

set(Projection, Members, _{kind: "machine_set", projection: Projection, members: Members}).

relation(Projection, Operator, Members, _{kind: "machine_relation", projection: Projection, operator: Operator, members: Members}).

test(machine_set_projections) :-
    machine(C),
    forall(member(P-Ms, ["transitions"-["open->paid", "paid->shipped", "shipped->closed", "open->cancelled", "lost->closed"],
                         "states"-["open", "paid", "shipped", "closed", "cancelled", "lost"],
                         "initial_states"-["open"],
                         "terminal_states"-["closed", "cancelled"],
                         "reachable_states"-["open", "paid", "shipped", "closed", "cancelled"],
                         "reachable_pairs"-["open->paid", "open->shipped", "open->closed", "open->cancelled",
                                            "paid->shipped", "paid->closed", "shipped->closed", "lost->closed"]]),
           ( set(P, Ms, O), mc_check(state_machine, O, C, ok) )).

test(machine_set_differences) :-
    machine(C),
    set("states", ["open", "paid", "shipped", "closed", "cancelled", "lost", "void"], O1),
    mc_problem(state_machine, O1, C, "the machine's states are not the fact's set (missing void)"),
    set("terminal_states", ["closed"], O2),
    mc_problem(state_machine, O2, C, "the machine's terminal_states are not the fact's set (not in the set cancelled)"),
    set("initial_states", ["paid", "shipped"], O3),
    mc_problem(state_machine, O3, C, "the machine's initial_states are not the fact's set (missing paid, shipped; not in the set open)").

test(machine_set_needs_a_machine) :-
    roles_free(C),
    set("states", ["a"], O),
    mc_problem(rule, O, C, "a machine_set obligation needs a state_machine certificate"),
    relation("states", "includes", ["a"], R),
    mc_problem(rule, R, C, "a machine_relation obligation needs a state_machine certificate").

roles_free(_{domains: _{}, predicates: _{}}).

test(initial_states_required) :-
    no_initial(C),
    Reason = "the certificate names no initial state; set proof_contract.initial_source",
    set("initial_states", ["open"], O1),
    mc_problem(state_machine, O1, C, Reason),
    set("reachable_states", ["open"], O2),
    mc_problem(state_machine, O2, C, Reason),
    set("terminal_states", ["closed", "cancelled"], O3),
    mc_check(state_machine, O3, C, ok).

test(reachable_states_keep_only_states) :-
    machine(C0),
    get_dict(machine, C0, M0),
    put_dict(initial, M0, ["open", "ghost"], M),
    put_dict(machine, C0, M, C),
    set("reachable_states", ["open", "paid", "shipped", "closed", "cancelled"], O),
    mc_check(state_machine, O, C, ok).

test(reachable_through_a_cycle) :-
    C = _{machine: _{states: ["a", "b", "c"], transitions: [["a", "b"], ["b", "a"], ["b", "c"]], initial: ["a"]}},
    set("reachable_pairs", ["a->a", "a->b", "a->c", "b->a", "b->b", "b->c"], O),
    mc_check(state_machine, O, C, ok),
    set("reachable_states", ["a", "b", "c"], O2),
    mc_check(state_machine, O2, C, ok).

test(machine_fields_required) :-
    set("states", ["a"], O),
    mc_problem(state_machine, O, _{}, "the certificate has no machine"),
    mc_problem(state_machine, O, _{machine: _{transitions: []}}, "the certificate has no states"),
    mc_problem(state_machine, O, _{machine: _{states: ["a"]}}, "the certificate has no transitions"),
    forall(member(Edge, ["a", ["a"], ["a", "a", "a"]]),
           mc_problem(state_machine, O, _{machine: _{states: ["a"], transitions: [Edge]}},
                      "a transition is not a [from, to] pair")),
    mc_check(state_machine, O, _{machine: _{states: [a], transitions: [[a, a]]}}, ok).

test(unknown_projection) :-
    machine(C),
    set("edges", [], O),
    mc_problem(state_machine, O, C, "Kibi could not check the obligation against the certificate's model").

test(machine_relations) :-
    machine(C),
    relation("states", "includes", ["open", "paid"], I1),
    mc_check(state_machine, I1, C, ok),
    relation("states", "includes", ["open", "void", "gone"], I2),
    mc_problem(state_machine, I2, C, "the machine's states do not include gone, void"),
    relation("terminal_states", "subset_of", ["closed", "cancelled", "void"], S1),
    mc_check(state_machine, S1, C, ok),
    relation("terminal_states", "subset_of", ["void"], S2),
    mc_problem(state_machine, S2, C, "the machine's terminal_states include cancelled, closed, which the fact's set does not allow"),
    relation("initial_states", "excludes", ["paid"], E1),
    mc_check(state_machine, E1, C, ok),
    relation("reachable_states", "excludes", ["lost", "paid", "open"], E2),
    mc_problem(state_machine, E2, C, "the machine's reachable_states include open, paid, which the fact excludes"),
    relation("initial_states", "eq", ["open"], Q1),
    mc_check(state_machine, Q1, C, ok),
    relation("initial_states", "eq", ["paid"], Q2),
    mc_problem(state_machine, Q2, C, "the machine's initial_states are not the fact's set (missing paid; not in the set open)").

waypoint(Operator, Members, O) :-
    relation("required_waypoints", Operator, Members, O).

test(required_waypoints) :-
    machine(C),
    waypoint("includes", ["open->closed via shipped", "open->closed via paid", "open->closed via open",
                          "open->closed via closed"], W1),
    mc_check(state_machine, W1, C, ok),
    waypoint("includes", ["open->closed via cancelled"], W2),
    mc_problem(state_machine, W2, C, "a path from open reaches closed without passing through cancelled"),
    waypoint("includes", ["closed->open via paid"], W3),
    mc_problem(state_machine, W3, C, "open is never reachable from closed, so no path passes through paid"),
    waypoint("excludes", ["open->closed via cancelled", "closed->open via paid"], W4),
    mc_check(state_machine, W4, C, ok),
    waypoint("excludes", ["open->closed via cancelled", "open->closed via paid"], W5),
    mc_problem(state_machine, W5, C, "every path open->closed via paid, which the fact excludes").

test(waypoints_with_two_routes) :-
    C = _{machine: _{states: ["a", "b", "c", "d"], transitions: [["a", "b"], ["b", "d"], ["a", "c"], ["c", "d"]]}},
    waypoint("includes", ["a->d via b"], W),
    mc_problem(state_machine, W, C, "a path from a reaches d without passing through b"),
    waypoint("excludes", ["a->d via b"], W2),
    mc_check(state_machine, W2, C, ok).

test(waypoint_spelling) :-
    machine(C),
    forall(member(Bad, ["open->closed", "open closed via paid", "open->closed via"]),
           ( waypoint("includes", [Bad], W),
             format(string(Reason), "~w is not spelled \"from->to via state\"", [Bad]),
             mc_problem(state_machine, W, C, Reason) )),
    forall(member(Member-State, ["ghost->closed via paid"-ghost, "open->ghost via paid"-ghost, "open->closed via ghost"-ghost]),
           ( waypoint("includes", [Member], W),
             format(string(Reason), "~w is not a state of the machine", [State]),
             mc_problem(state_machine, W, C, Reason) )).

machine_holds(Name, Args, Value, Result) :-
    machine(C),
    mc_check(state_machine, _{kind: "predicate_holds", predicate: Name, args: Args, value: Value}, C, Result).

test(machine_predicates) :-
    forall(member(Name-Args-Value,
                  ["transition"-["open", "paid"]-true, "transition"-["open", "shipped"]-false,
                   "transition"-["paid", "open"]-false,
                   "reachable"-["open", "closed"]-true, "reachable"-["closed", "open"]-false,
                   "reachable"-["lost", "closed"]-true, "reachable"-["open", "open"]-false,
                   "terminal"-["closed"]-true, "terminal"-["open"]-false,
                   "state"-["lost"]-true,
                   "initial"-["open"]-true, "initial"-["paid"]-false]),
           machine_holds(Name, Args, Value, ok)),
    machine_holds("state", ["lost"], false, problem("the code decides state(lost) is true, but the fact says false")),
    no_initial(C),
    mc_problem(state_machine, _{kind: "predicate_holds", predicate: "initial", args: ["open"], value: true}, C,
               "initial(open) is not in the certificate's model: name the function behind initial in proof_contract.predicate_source and make each argument's domain list open").

test(reachable_states_start_at_the_initial_states) :-
    C = _{machine: _{states: ["a", "b", "x", "y"], transitions: [["a", "b"], ["x", "y"]], initial: ["a"]}},
    set("reachable_states", ["a", "b"], O),
    mc_check(state_machine, O, C, ok).

test(edge_text) :-
    edge_text(a, b, T),
    T == "a->b".

test(machine_projection_directly) :-
    machine_projection(states, machine([a, b], [], none), States),
    States == ["a", "b"],
    machine_projection(transitions, machine([a, b], [b-a, a-b], none), Edges),
    Edges == ["a->b", "b->a"],
    \+ machine_projection(nothing, machine([a], [], none), _).

:- end_tests(model_check_machine).

% --- the source model -------------------------------------------------------

:- begin_tests(model_check_source).

source(Reader, Members, Extra, C) :-
    put_dict(Extra, _{source: _{reader: Reader}, model: _{members: Members}}, C0),
    C = C0.

with_model(C0, Key, Value, C) :-
    get_dict(model, C0, M0),
    put_dict(Key, M0, Value, M),
    put_dict(model, C0, M, C).

rel(Operator, Members, _{kind: "set_relation", operator: Operator, members: Members}).

test(literal_set_relations) :-
    source("zod", ["b", "a"], _{}, C),
    rel("eq", ["a", "b"], O1), mc_check(source, O1, C, ok),
    rel("eq", ["a"], O2),
    mc_problem(source, O2, C, "the members Kibi read from the source are not the fact's set (not in the set b)"),
    rel("includes", ["a"], O3), mc_check(source, O3, C, ok),
    rel("subset_of", ["a", "b", "c"], O4), mc_check(source, O4, C, ok),
    rel("excludes", ["c"], O5), mc_check(source, O5, C, ok),
    rel("excludes", ["a.*"], O6), mc_check(source, O6, C, ok),
    rel("includes", [a, 1], O7),
    mc_problem(source, O7, C, "the members Kibi read from the source do not include 1"),
    rel("lt", ["a"], O8), mc_check(source, O8, C, ok),
    rel("includes", ["a.*"], O9),
    mc_problem(source, O9, C, "the members Kibi read from the source do not include a.*").

test(source_needs_text_members) :-
    mc_problem(source, _{kind: "set_relation", operator: "eq", members: ["a"]},
               _{source: _{reader: "zod"}, model: _{members: [f(x)]}},
               "Kibi could not check the obligation against the certificate's model").

test(source_fields_required) :-
    rel("eq", ["a"], O),
    mc_problem(source, O, _{source: _{reader: "zod"}}, "the certificate has no model"),
    mc_problem(source, O, _{model: _{}}, "the certificate has no members"),
    mc_check(source, O, _{model: _{members: [a]}}, ok),
    mc_check(source, O, _{source: "zod", model: _{members: [a]}}, ok).

entities([_{name: "users", columns: [_{name: "id", nullable: false, optional: false},
                                     _{name: "email", nullable: true, optional: false},
                                     _{name: "nick", nullable: false, optional: true}]},
          _{name: "orgs", columns: [_{name: "id", nullable: false, optional: false},
                                    _{name: "email", nullable: false, optional: false}]}]).

fields(Kind, Members, _{kind: Kind, members: Members}).

test(required_fields) :-
    entities(E), source("zod", [], _{}, C0), with_model(C0, entities, E, C),
    fields("required_fields", ["id", "orgs.email", "users.id"], O1), mc_check(source, O1, C, ok),
    fields("required_fields", ["email"], O2),
    mc_problem(source, O2, C, "users.email is nullable, not required"),
    fields("required_fields", ["users.nick"], O3),
    mc_problem(source, O3, C, "users.nick is optional, not required"),
    fields("required_fields", ["teams.id"], O4),
    mc_problem(source, O4, C, "the source has no table or object teams"),
    fields("required_fields", ["users.name"], O5),
    mc_problem(source, O5, C, "users has no field name"),
    fields("required_fields", ["name"], O6),
    mc_problem(source, O6, C, "users has no field name"),
    fields("required_fields", ["users.a.b"], O7),
    mc_problem(source, O7, C, "the source has no table or object users.a").

test(nullable_fields) :-
    entities(E), source("zod", [], _{}, C0), with_model(C0, entities, E, C),
    fields("nullable_fields", ["users.email"], O1), mc_check(source, O1, C, ok),
    fields("nullable_fields", ["email"], O2),
    mc_problem(source, O2, C, "orgs.email is not nullable"),
    fields("nullable_fields", ["users.nick"], O3),
    mc_problem(source, O3, C, "users.nick is not nullable").

test(field_claims_need_tables) :-
    source("zod", [], _{}, C0),
    Reason = "the source has no tables or objects; read a schema or validator for a field claim",
    fields("required_fields", ["id"], O),
    mc_problem(source, O, C0, Reason),
    with_model(C0, entities, [], C1),
    mc_problem(source, O, C1, Reason),
    fields("nullable_fields", ["id"], O2),
    with_model(C0, entities, "users", C2),
    mc_problem(source, O2, C2, Reason).

routes([_{method: "GET", path: "/users", middleware: ["auth", "log"]},
        _{method: "POST", path: "/users", middleware: ["auth"]}]).

test(route_middleware) :-
    routes(R), source("express", [], _{}, C0), with_model(C0, routes, R, C),
    mc_check(source, _{kind: "route_middleware", operator: "includes", members: ["auth"]}, C, ok),
    mc_problem(source, _{kind: "route_middleware", operator: "includes", members: ["log"]}, C,
               "the middleware of POST /users do not include log"),
    mc_problem(source, _{kind: "route_middleware", operator: "excludes", members: ["log"]}, C,
               "the middleware of GET /users include log, which the fact excludes"),
    Reason = "the source has no routes; read a route table for a middleware claim",
    mc_problem(source, _{kind: "route_middleware", operator: "includes", members: ["auth"]}, C0, Reason),
    with_model(C0, routes, [], C1),
    mc_problem(source, _{kind: "route_middleware", operator: "includes", members: ["auth"]}, C1, Reason),
    with_model(C0, routes, "routes", C2),
    mc_problem(source, _{kind: "route_middleware", operator: "includes", members: ["auth"]}, C2, Reason).

precedes(Members, _{kind: "sequence_precedes", members: Members}).

test(sequence_precedes) :-
    source("list", [], _{}, C0),
    with_model(C0, sequence, ["auth", "log", "auth", "handler"], C),
    precedes(["auth -> handler", "log  ->  handler"], O1), mc_check(source, O1, C, ok),
    precedes(["log -> auth"], O2),
    mc_problem(source, O2, C, "auth comes before log in the list Kibi read (items 1 and 2)"),
    precedes(["auth -> log"], O3),
    mc_problem(source, O3, C, "log comes before auth in the list Kibi read (items 2 and 3)"),
    precedes(["cors -> handler"], O4),
    mc_problem(source, O4, C, "cors is not in the list Kibi read"),
    precedes(["auth -> cors"], O5),
    mc_problem(source, O5, C, "cors is not in the list Kibi read"),
    forall(member(Bad, ["auth->handler", "auth -> log -> handler", " -> handler", "auth -> "]),
           ( precedes([Bad], O),
             format(string(Reason), "~w is not spelled \"A -> B\"", [Bad]),
             mc_problem(source, O, C, Reason) )),
    precedes(["handler -> handler"], O6),
    mc_check(source, O6, C, ok),
    precedes(["auth -> auth"], O7),
    mc_problem(source, O7, C, "auth comes before auth in the list Kibi read (items 1 and 3)").

test(sequence_needs_an_order) :-
    source("list", [], _{}, C0),
    precedes(["a -> b"], O),
    mc_problem(source, O, C0, "the source has no order; read a list for a precedes claim"),
    with_model(C0, sequence, [a, b], C),
    mc_check(source, O, C, ok).

test(precedes_pair) :-
    model_check:precedes_pair("a -> b", A, B),
    A-B == "a"-"b",
    first_answer_is_last(model_check:precedes_pair("a -> b", _, _)).

% --- reference members ------------------------------------------------------

refs(Members, C) :-
    refs(Members, _{files: ["src/A.java"], extract: "calls"}, C).

refs(Members, Source, C) :-
    put_dict(reader, Source, "references", S),
    C = _{source: S, model: _{members: Members}}.

ref_ok(Operator, Actual, Expected) :-
    refs(Actual, C), rel(Operator, Expected, O),
    mc_check(source, O, C, ok).

ref_problem(Operator, Actual, Expected, Reason) :-
    refs(Actual, C), rel(Operator, Expected, O),
    mc_problem(source, O, C, Reason).

test(reference_excludes) :-
    ref_problem("excludes", ["java.sql.Connection"], ["java.sql.*"],
                "the members Kibi read from the source include java.sql.Connection (within java.sql.*), which the fact excludes"),
    ref_problem("excludes", ["os.Exit"], ["os.Exit"],
                "the members Kibi read from the source include os.Exit, which the fact excludes"),
    ref_problem("excludes", ["std::env::var"], ["std::env"],
                "the members Kibi read from the source include std::env::var (within std::env), which the fact excludes"),
    ref_problem("excludes", ["os.Exit"], ["*.Exit"],
                "the members Kibi read from the source include os.Exit (within *.Exit), which the fact excludes"),
    ref_problem("excludes", ["a.b.c"], ["*"],
                "the members Kibi read from the source include a.b.c (within *), which the fact excludes"),
    ref_ok("excludes", ["echo/v4extra", "DATABASE_URL", "*.Exit"], ["echo/v4", "DATABASE", "os.Exit.now"]).

test(reference_excludes_possible) :-
    Tail = "which the fact excludes; Kibi cannot decide the claim for those members",
    format(string(R1), "the members Kibi read from the source include *.delete (a call of delete on a receiver Kibi cannot name, in src/A.java; it may be java.io.File.delete), ~w", [Tail]),
    ref_problem("excludes", ["*.delete", "get"], ["java.io.File.delete"], R1),
    format(string(R2), "the members Kibi read from the source include *.close (a call of close on a receiver Kibi cannot name, in src/A.java; it may be java.sql.*), ~w", [Tail]),
    ref_problem("excludes", ["*.close"], ["java.sql.*"], R2),
    format(string(R3), "the members Kibi read from the source include java.sql.* (a wildcard that may cover java.sql.Connection), ~w", [Tail]),
    ref_problem("excludes", ["java.sql.*"], ["java.sql.Connection"], R3),
    format(string(R4), "the members Kibi read from the source include File.delete (a shorter name that may be java.io.File.delete), ~w", [Tail]),
    ref_problem("excludes", ["File.delete"], ["java.io.File.delete"], R4),
    format(string(R5), "the members Kibi read from the source include a.Preconditions.check (it may be the check the fact excludes), ~w", [Tail]),
    ref_problem("excludes", ["a.Preconditions.check"], ["check"], R5),
    ref_ok("excludes", ["checkNotNullX", "*.closer"], ["checkNotNull", "x.close"]).

test(reference_wildcard_members) :-
    ref_problem("excludes", ["java.sql.*"], ["java.*"],
                "the members Kibi read from the source include java.sql.* (within java.*), which the fact excludes"),
    ref_problem("excludes", ["java.*"], ["java.sql.*"],
                "the members Kibi read from the source include java.* (a wildcard that may cover java.sql.*), which the fact excludes; Kibi cannot decide the claim for those members"),
    ref_ok("excludes", ["javax.*"], ["java.sql"]),
    ref_problem("excludes", ["*"], ["os"],
                "the members Kibi read from the source include * (a wildcard that may cover os), which the fact excludes; Kibi cannot decide the claim for those members").

test(reference_excludes_mixes_certain_and_possible) :-
    ref_problem("excludes", ["os.Exit", "*.Exit"], ["os.Exit"],
                "the members Kibi read from the source include *.Exit (a call of Exit on a receiver Kibi cannot name, in src/A.java; it may be os.Exit), os.Exit, which the fact excludes").

test(reference_files_named) :-
    forall(member(Files-Where, [[]-"the files read", ["a"]-"a", "a.go"-"a.go", ["a", "b", "c"]-"a, b, c",
                                ["a", "b", "c", "d"]-"a, b, c and 1 more",
                                ["a", "b", "c", "d", "e"]-"a, b, c and 2 more"]),
           ( ( Files == [] -> Source = _{extract: "calls"} ; Source = _{files: Files, extract: "calls"} ),
             refs(["*.m"], Source, C), rel("excludes", ["x.m"], O),
             format(string(Reason), "the members Kibi read from the source include *.m (a call of m on a receiver Kibi cannot name, in ~w; it may be x.m), which the fact excludes; Kibi cannot decide the claim for those members", [Where]),
             mc_problem(source, O, C, Reason) )).

test(reference_includes) :-
    ref_ok("includes", ["java.sql.Connection", "x.y.delete", "os.Exit"], ["java.sql.*", "*.delete", "os.Exit", "*"]),
    ref_ok("includes", ["java.sql.*"], ["java.*"]),
    ref_problem("includes", ["*.delete"], ["java.io.File.delete", "*.delete", "*.close"],
                "the members Kibi read from the source do not include *.close, java.io.File.delete"),
    ref_problem("includes", ["java.*"], ["java.sql.*"],
                "the members Kibi read from the source do not include java.sql.*"),
    ref_problem("includes", ["java.sql.Connection"], ["java.sql"],
                "the members Kibi read from the source do not include java.sql"),
    ref_problem("includes", ["a.*"], ["*.m"],
                "the members Kibi read from the source do not include *.m").

test(reference_subset_of) :-
    ref_ok("subset_of", ["os.path", "*.m", "java.sql.*", "x"], ["os.*", "*.m", "java.*", "x"]),
    ref_ok("subset_of", ["anything", "*.m"], ["*"]),
    ref_problem("subset_of", ["os/exec"], ["os"],
                "the members Kibi read from the source include os/exec, which the fact's set does not allow"),
    ref_problem("subset_of", ["*.m"], ["X.m"],
                "the members Kibi read from the source include *.m, which the fact's set does not allow (a call on a receiver Kibi cannot name is allowed only when the set lists it as *.m)").

test(reference_eq) :-
    ref_problem("eq", ["*.m"], ["X.m"],
                "the members Kibi read from the source are not the fact's set (missing X.m; not in the set *.m)"),
    ref_ok("eq", ["java.sql.*"], ["java.sql.*"]).

test(reference_case_folding) :-
    forall(member(Extract, ["calls", "thrown", "imports"]),
           ( refs(["App\\Mail::SEND"], _{files: ["a.php"], extract: Extract}, C),
             rel("excludes", ["App\\Mail::send"], O),
             mc_problem(source, O, C, "the members Kibi read from the source include App\\Mail::SEND (it may be App\\Mail::send: the names differ only in letter case, which some languages ignore), which the fact excludes; Kibi cannot decide the claim for those members") )),
    forall(member(Source, [_{files: ["a.php"], extract: "string_args"}, _{files: ["a.php"]}, _{extract: calls}]),
           ( refs(["Private"], Source, C2),
             rel("excludes", ["private"], O2),
             ( get_dict(extract, Source, calls) -> mc_check(source, O2, C2, problem(_)) ; mc_check(source, O2, C2, ok) ) )).

test(reference_matching_reads_the_reader) :-
    C = _{source: _{reader: references}, model: _{members: ["a.b"]}},
    rel("excludes", ["a"], O),
    mc_check(source, O, C, problem(_)),
    C2 = _{source: _{reader: "json"}, model: _{members: ["a.b"]}},
    mc_check(source, O, C2, ok).

test(reference_helpers) :-
    first_answer_is_last(model_check:extends_member("a.b", "a")),
    first_answer_is_last(model_check:extends_member("a", "a")),
    first_answer_is_last(model_check:extends_member("x", "")),
    \+ model_check:extends_member("ab", "a"),
    forall(member(Sep, [".", "/", "::", "\\"]),
           ( atomic_list_concat(["a", Sep, "b"], AB), atom_string(AB, ABS),
             model_check:extends_member(ABS, "a") )),
    model_check:pattern_stem("java.sql.*", S1), S1 == "java.sql",
    model_check:pattern_stem("java*", S2), S2 == "java",
    model_check:pattern_stem("*", S3), S3 == "",
    first_answer_is_last(model_check:pattern_stem("a::*", _)),
    \+ model_check:pattern_stem("*.m", _),
    \+ model_check:pattern_stem("a.b", _),
    model_check:unknown_receiver("*.m", M), M == "m",
    \+ model_check:unknown_receiver("*.", _),
    first_answer_is_last(model_check:ends_with_method("a.b", "b")),
    \+ model_check:ends_with_method("ab", "b"),
    first_answer_is_last(model_check:certain_match("a", "a")),
    first_answer_is_last(model_check:certain_match("b", "*")),
    first_answer_is_last(model_check:certain_match("java.sql.X", "java.*")),
    \+ model_check:certain_match("*.m", "x.*"),
    \+ model_check:certain_match("java.*", "*.m"),
    first_answer_is_last(model_check:exclude_match("a", "a", H1)), H1 == certain,
    first_answer_is_last(model_check:exclude_match("x.m", "*.m", H2)), H2 == certain,
    \+ model_check:exclude_match("*.m", "*.n", _),
    first_answer_is_last(model_check:exclude_match("*.m", "a.*", H3)), H3 == possible,
    first_answer_is_last(model_check:exclude_match("*.m", "a.m", H4)), H4 == possible,
    \+ model_check:exclude_match("x.*", "y", _),
    first_answer_is_last(model_check:exclude_match("x.y", "x.*", H5)), H5 == certain,
    \+ model_check:exclude_match("y.z", "x.*", _),
    first_answer_is_last(model_check:exclude_match("x.y", "x", H6)), H6 == certain,
    first_answer_is_last(model_check:exclude_match("y", "x.y", H7)), H7 == possible,
    first_answer_is_last(model_check:exclude_match("x.y", "y", H8)), H8 == possible,
    first_answer_is_last(model_check:exclude_match("x.y.*", "x.*", H9)), H9 == certain,
    first_answer_is_last(model_check:exclude_match("*.m", "*.m", H12)), H12 == certain,
    \+ model_check:exclude_match("*.x.m", "*.m", _),
    \+ model_check:exclude_match("x.n", "*.m", _),
    \+ model_check:exclude_match("*.m", "m", _),
    \+ model_check:pattern_stem("*.*", _),
    \+ model_check:certain_match("*.x.m", "*.m"),
    model_check:certain_match("java*", "java.*"),
    \+ model_check:certain_match("x.y", "z.*"),
    \+ model_check:certain_match("a.*", "*.*"),
    \+ model_check:certain_match("x.n", "*.m"),
    first_answer_is_last(model_check:certain_match("x.m", "*.m")),
    first_answer_is_last(model_check:exclude_match("x.*", "x.y.*", H11)), H11 == possible,
    first_answer_is_last(model_check:exclude_match("x.*", "x.y", H10)), H10 == possible.

:- end_tests(model_check_source).

% --- rules ------------------------------------------------------------------

:- begin_tests(model_check_rules).

rule_model(model(Domains, Table, none)) :-
    list_to_assoc([role-[admin, coach], action-[read, write], tier-[gold], level-['1', '2']], Domains),
    list_to_assoc([(allowed-[admin, read])-true, (allowed-[admin, write])-true,
                   (allowed-[coach, read])-true, (allowed-[coach, write])-false,
                   (staff-[admin])-true, (staff-[coach])-true,
                   (blocked-[])-false, (open-[])-true,
                   (score-[coach, '3'])-true, (tier-[gold])-false],
                  Table).

v(Name, Type, var(Name, Type)).

a(Name, Args, atom(default, Name, Args, positive, false)).
na(Name, Args, atom(default, Name, Args, negative, false)).

r(Kind, Modality, Head, Body, Exceptions, Declared,
  rule(Kind, Modality, Head, Body, Exceptions, scope('', '', []), '', '', '', Declared)).

result(Rule, Result) :-
    rule_model(Model),
    model_result(Rule, Model, Result).

model_result(Rule, Model, Result) :-
    first_answer_is_last(catch(model_check:rule_result(Rule, Model, Result0), model_error(R), Result0 = error(R))),
    ground(Result0),
    Result = Result0.

test(rule_holds_for_every_assignment) :-
    a(staff, [var('R', role)], Head), a(allowed, [var('R', role), const(read, string)], Body),
    r(rule, assert, Head, Body, [], [], Rule),
    result(Rule, ok).

test(rule_counterexample) :-
    a(allowed, [var('R', role), var('A', action)], Head), a(staff, [var('R', role)], Body),
    r(rule, assert, Head, Body, [], [], Rule),
    result(Rule, problem(Reason)),
    Reason == "the rule fails for A=write, R=coach: the code decides allowed(coach, write) is false, but the rule requires true".

test(body_limits_the_head) :-
    a(allowed, [var('R', role), const(write, string)], Head),
    r(rule, assert, Head, compare(eq, var('R', role), const(admin, string)), [], [], Rule),
    result(Rule, ok).

test(rule_exceptions) :-
    a(allowed, [var('R', role), var('A', action)], Head), a(staff, [var('R', role)], Body),
    na(allowed, [var('R', role), var('A', action)], Exception),
    r(rule, assert, Head, Body, [Exception], [], Rule),
    result(Rule, ok),
    r(rule, assert, Head, Body, [atom(default, blocked, [], positive, false)], [], NoExc),
    result(NoExc, problem(_)).

test(modalities) :-
    a(blocked, [], Head),
    forall(member(M, [deny, forbid]), ( r(rule, M, Head, none, [], [], Rule), result(Rule, ok) )),
    forall(member(M, [assert, oblige, permit]),
           ( r(rule, M, Head, none, [], [], Rule),
             result(Rule, problem("the rule fails for the only case: the code decides blocked() is false, but the rule requires true")) )),
    r(rule, wish, Head, none, [], [], Wish),
    rule_model(Model),
    \+ catch(model_check:rule_result(Wish, Model, _), _, fail).

test(atom_rules) :-
    na(blocked, [], Head),
    r(atom, assert, Head, none, [], [], Rule),
    result(Rule, ok),
    a(blocked, [], Blocked),
    r(atom, assert, Blocked, none, [], [], Fails),
    result(Fails, problem("the rule fails for the only case: the code decides blocked() is false, but the rule requires true")),
    r(atom, assert, Blocked, none, [atom(default, open, [], positive, false)], [], Excused),
    result(Excused, ok),
    a(allowed, [var('R', role), const(write, string)], Allowed),
    r(atom, assert, Allowed, none, [], [], Some),
    result(Some, problem("the rule fails for R=coach: the code decides allowed(coach, write) is false, but the rule requires true")).

test(negative_head_text) :-
    na(open, [], Head),
    r(atom, assert, Head, none, [], [], Rule),
    result(Rule, problem("the rule fails for the only case: the code decides not open() is false, but the rule requires true")).

test(constraints) :-
    a(open, [], Open),
    r(constraint, assert, none, Open, [], [], Rule),
    result(Rule, ok),
    a(blocked, [], Blocked),
    r(constraint, assert, none, Blocked, [], [], Fails),
    result(Fails, problem("the rule fails for the only case: the constraint does not have the value true the rule requires")),
    r(constraint, assert, none, Blocked, [Open], [], Excused),
    result(Excused, ok),
    r(constraint, deny, none, Blocked, [], [], Denied),
    result(Denied, ok),
    r(constraint, assert, Blocked, Blocked, [], [], WithHead),
    result(WithHead, problem("the rule fails for the only case: the code decides blocked() is false, but the rule requires true")).

test(constraint_counterexample_names_a_head_with_the_value) :-
    a(open, [], Open), a(blocked, [], Blocked), a(ghost, [], Ghost),
    r(constraint, assert, Open, Blocked, [], [], Rule),
    result(Rule, problem("the rule fails for the only case: the constraint does not have the value true the rule requires")),
    r(constraint, assert, Ghost, Blocked, [], [], Unknown),
    result(Unknown, problem("the rule fails for the only case: the constraint does not have the value true the rule requires")).

test(denied_expressions) :-
    a(open, [], Open), a(blocked, [], Blocked),
    forall(member(Body-Expected,
                  [all([Open, Blocked])-ok, all([Open])-problem, all([all([Blocked])])-ok,
                   any([Blocked])-ok, any([Open])-problem, any([any([Open])])-problem,
                   compare(gt, var('L', level), number(0, none))-problem,
                   compare(gt, const('1', string), number(0, none))-problem,
                   atom(default, score, [const(coach, string), number(3, none)], positive, false)-problem]),
           ( r(constraint, deny, none, Body, [], [], Rule),
             result(Rule, Result),
             ( Expected == ok -> Result == ok ; Result = problem(_) ) )),
    r(constraint, assert, none, all([all([Blocked])]), [], [], Nested),
    result(Nested, problem(_)).

test(numeric_atoms_compare_as_numbers) :-
    r(constraint, assert, none, compare(gt, var('L', level), number(0, none)), [], [], Rule),
    result(Rule, ok),
    r(constraint, assert, none, compare(eq, var('L', level), var('L', level)), [], [], Same),
    result(Same, ok),
    r(constraint, assert, none, compare(eq, const(5, number), number(5, none)), [], [], NumberConst),
    result(NumberConst, ok).

test(table_rows_win_over_type_membership) :-
    a(tier, [const(gold, string)], Tier),
    r(constraint, assert, none, Tier, [], [], Rule),
    result(Rule, problem(_)).

test(missing_parts) :-
    a(open, [], Open),
    r(rule, assert, none, Open, [], [], NoHead),
    result(NoHead, error("the rule has no head")),
    r(constraint, assert, none, none, [], [], NoBody),
    result(NoBody, error("the constraint has no body")),
    r(fact, assert, Open, none, [], [], Fact),
    result(Fact, error("a fact rule cannot be model checked")).

test(rule_without_body_needs_the_head_everywhere) :-
    a(staff, [var('R', role)], Head),
    r(rule, assert, Head, none, [], [], Rule),
    result(Rule, ok),
    r(rule, assert, Head, none, [atom(default, open, [], positive, false)], [], Excused),
    result(Excused, ok).

test(body_expressions) :-
    a(open, [], Open), a(blocked, [], Blocked), a(staff, [const(coach, string)], Staff),
    forall(member(Body-Expected,
                  [all([Open, Staff])-true, all([Open, Blocked])-false, all([])-true,
                   any([Blocked, Open])-true, any([Blocked])-false, any([])-false,
                   not(Blocked)-true, not(Open)-false,
                   compare(gt, number(2, none), number(1, none))-true,
                   compare(lte, number(2, none), number(1, none))-false]),
           ( r(constraint, assert, none, Body, [], [], Rule),
             ( Expected == true -> result(Rule, ok) ; result(Rule, problem(_)) ) )).

test(unsupported_expressions) :-
    r(constraint, assert, none, count(x, gte, 1), [], [], Count),
    result(Count, error("a count expression is outside what Kibi model checks")),
    a(staff, [interval(a, b)], Odd),
    r(constraint, assert, none, Odd, [], [], OddArg),
    result(OddArg, error("a interval argument is outside what Kibi model checks")),
    r(constraint, assert, none, compare(eq, duration(1), number(1, none)), [], [], Duration),
    result(Duration, error("a duration argument is outside what Kibi model checks")).

test(comparisons) :-
    forall(member(Op-L-R-Expected,
                  [eq-number(1, none)-number(1.0, none)-true, eq-const('1', string)-number(1, none)-true,
                   eq-const(a, string)-const(a, string)-true, eq-const(a, string)-const(b, string)-false,
                   eq-number(1, none)-number(2, none)-false, eq-const(a, string)-number(1, none)-false,
                   eq-number(1, none)-const(a, string)-false, neq-const(a, string)-const(a, string)-false,
                   neq-const(a, string)-const(b, string)-true, neq-number(1, none)-number(1, none)-false,
                   lt-number(1, none)-number(2, none)-true, lt-number(2, none)-number(2, none)-false,
                   lte-number(2, none)-number(2, none)-true, lte-number(3, none)-number(2, none)-false,
                   gt-number(3, none)-number(2, none)-true, gt-number(2, none)-number(2, none)-false,
                   gte-number(2, none)-number(2, none)-true, gte-number(1, none)-number(2, none)-false]),
           ( r(constraint, assert, none, compare(Op, L, R), [], [], Rule),
             ( Expected == true -> result(Rule, ok) ; result(Rule, problem(_)) ) )),
    r(constraint, assert, none, compare(lt, const(a, string), number(1, none)), [], [], NotNumbers),
    result(NotNumbers, error("lt compares a and 1, which are not both numbers")),
    r(constraint, assert, none, compare(lt, number(1, none), const(a, string)), [], [], NotNumbers2),
    result(NotNumbers2, error("lt compares 1 and a, which are not both numbers")).

machine_model(Model) :-
    model_check:certificate_model(state_machine,
        _{machine: _{states: ["a", "b"], transitions: [["a", "b"]], initial: ["a"]}}, Model).

test(machine_rules_range_over_states) :-
    machine_model(Model),
    a(state, [var('S', step)], Head),
    r(atom, assert, Head, none, [], [], Rule),
    model_result(Rule, Model, ok),
    a(initial, [var('S', step)], Initial),
    r(atom, assert, Initial, none, [], [], Fails),
    model_result(Fails, Model, problem("the rule fails for S=b: the code decides initial(b) is false, but the rule requires true")),
    a(ghost, [var('S', step)], Ghost),
    r(atom, assert, Ghost, none, [], [], Unknown),
    model_result(Unknown, Model, error("ghost(a) is not in the certificate's model: name the function behind ghost in proof_contract.predicate_source and make each argument's domain list a")).

test(rule_certificate_domains) :-
    model_check:certificate_model(rule,
        _{domains: _{role: _{members: ["coach", admin]}},
          predicates: _{staff: _{rows: [_{args: ["coach"], value: true}, _{args: ["admin"], value: true}]}}}, Model),
    a(staff, [var('R', role)], Head),
    r(atom, assert, Head, none, [], [], Rule),
    model_result(Rule, Model, ok),
    a(role, [const(admin, string)], IsRole),
    r(constraint, assert, none, IsRole, [], [], RoleRule),
    model_result(RoleRule, Model, ok).

test(compare_variables) :-
    v('R', role, R),
    r(constraint, assert, none, compare(neq, R, const(guest, string)), [], [], Rule),
    result(Rule, ok),
    r(constraint, assert, none, compare(eq, R, const(coach, string)), [], [], Fails),
    result(Fails, problem("the rule fails for R=admin: the constraint does not have the value true the rule requires")).

test(number_arguments) :-
    a(score, [const(coach, string), number(3, none)], Score),
    r(constraint, assert, none, Score, [], [], Rule),
    result(Rule, ok).

test(type_predicates) :-
    a(role, [const(coach, string)], IsRole),
    r(constraint, assert, none, IsRole, [], [], Rule),
    result(Rule, ok),
    a(role, [const(guest, string)], NotRole),
    r(constraint, assert, none, NotRole, [], [], Fails),
    result(Fails, problem(_)),
    a(staff, [const(coach, string)], Staff),
    r(constraint, assert, none, Staff, [], [], InTable),
    result(InTable, ok),
    a(role, [const(coach, string), const(read, string)], TwoArgs),
    r(constraint, assert, none, TwoArgs, [], [], Wide),
    result(Wide, error("role(coach, read) is not in the certificate's model: name the function behind role in proof_contract.predicate_source and make each argument's domain list coach, read")).

test(variables) :-
    a(allowed, [var('R', role), var('A', action)], Head),
    a(staff, [var('R', role)], Body),
    r(rule, assert, Head, Body, [], [variable('A', action, forall), variable('Z', role, forall)], Rule),
    result(Rule, problem(Reason)),
    Reason == "the rule fails for A=write, R=coach, Z=admin: the code decides allowed(coach, write) is false, but the rule requires true",
    r(rule, assert, Head, Body, [], [variable('R', role, exists)], Exists),
    result(Exists, error("the rule quantifies R existentially, which Kibi does not enumerate")),
    a(staff, [var('X', colour)], Untyped),
    r(atom, assert, Untyped, none, [], [], NoDomain),
    result(NoDomain, error("variable X has type colour, which has no finite domain: name the export listing its values in proof_contract.domains")),
    a(staff, [var('X', role)], Unbound),
    rule_model(model(D, T, M)),
    catch(model_check:eval_atom(Unbound, [], model(D, T, M), _), model_error(Why), true),
    Why == "variable X is unbound".

test(variables_in_nested_terms) :-
    a(staff, [var('R', role)], S),
    r(constraint, assert, none, all([any([S]), not(S)]), [], [], Rule),
    model_check:rule_variables(none, all([any([S]), not(S)]), [], [], Vars),
    Vars == ['R'-role],
    result(Rule, problem(_)).

big_model(Sizes, model(Domains, Table, none)) :-
    findall(Type-Values,
            ( member(Type-Size, Sizes), numlist(1, Size, Ns), maplist([N, A]>>atom_number(A, N), Ns, Values) ),
            Pairs),
    list_to_assoc(Pairs, Domains),
    list_to_assoc([], Table).

test(assignment_limit) :-
    big_model([big-100, huge-1000, more-1001], Model),
    a(big, [var('A', big)], Head),
    r(atom, assert, Head, none, [], [variable('B', huge, forall)], AtLimit),
    model_check:rule_result(AtLimit, Model, ok),
    r(atom, assert, Head, none, [], [variable('B', more, forall)], Over),
    catch(model_check:rule_result(Over, Model, _), model_error(R), true),
    R == "the rule has 100,100 assignments, more than the 100,000 Kibi enumerates".

rule_json(Head, Body, Variables, Json) :-
    atom_json_dict(Json0, _{version: 'kibi.logic.v1', kind: rule, modality: assert,
                           head: Head, body: Body, variables: Variables}, [width(0)]),
    atom_string(Json0, Json).

rule_fact(Id, Json) :-
    fixture_entity(fact, Id, [fact_kind=rule, rule_ir=Json, rule_hash="h", rule_schema_id='FACT-SCHEMA',
                              semantic_key="k"]).

test(rule_holds_reads_the_rule_fact) :-
    R = _{kind: var, name: 'R', type: role},
    rule_json(_{kind: atom, name: allowed, args: [R, _{kind: const, value: read}]},
              _{kind: atom, name: staff, args: [R]},
              [_{name: 'R', type: role, quantifier: forall}], Good),
    rule_json(_{kind: atom, name: allowed, args: [R, _{kind: const, value: write}]},
              _{kind: atom, name: staff, args: [R]},
              [_{name: 'R', type: role, quantifier: forall}], Bad),
    C = _{domains: _{role: _{members: ["coach", "admin"]}},
          predicates: _{allowed: _{rows: [_{args: ["coach", "read"], value: true}, _{args: ["admin", "read"], value: true},
                                          _{args: ["coach", "write"], value: false}, _{args: ["admin", "write"], value: true}]},
                        staff: _{rows: [_{args: ["coach"], value: true}, _{args: ["admin"], value: true}]}}},
    with_fixture_kb((
        rule_fact('FACT-GOOD', Good),
        rule_fact('FACT-BAD', Bad),
        fixture_entity(fact, 'FACT-SUBJECT', [fact_kind=subject, subject_key="s"]),
        mc_check(rule, _{kind: "rule_holds", fact_id: "FACT-GOOD"}, C, R1),
        mc_check(rule, _{kind: "rule_holds", fact_id: 'FACT-BAD'}, C, R2),
        mc_check(rule, _{kind: "rule_holds", fact_id: "FACT-SUBJECT"}, C, R3),
        mc_check(rule, _{kind: "rule_holds", fact_id: "FACT-NONE"}, C, R4),
        mc_check(rule, _{kind: "rule_holds"}, C, R5)
    )),
    R1 == ok,
    R2 == problem("the rule fails for R=coach: the code decides allowed(coach, write) is false, but the rule requires true"),
    R3 == problem("the rule_ir of FACT-SUBJECT cannot be read"),
    R4 == problem("the rule_ir of FACT-NONE cannot be read"),
    R5 == problem("Kibi could not check the obligation against the certificate's model").

:- end_tests(model_check_rules).
