:- use_module(library(plunit)).
:- use_module(library(http/json)).
:- use_module('../src/certificates.pl').
:- use_module(kb_fixture).
:- use_module(cert_fixture).
:- use_module(test_helpers).

% The search runs on a KB holding one fact set of every kind, and its
% parts run on hand-built contexts, groups and rule edges.

certificates_fixture :-
    cert_property('FACT-MIN', 'REQ-MIN', "api.quota", "rate_limit", gte, int, 1, []),
    cert_property('FACT-MAX', 'REQ-MAX', "api.quota", "rate_limit", lte, int, 10, []),
    cert_property('FACT-J1', 'REQ-J1', "seat.count", "free", gte, int, 0, []),
    cert_property('FACT-J2', 'REQ-J2', "seat.count", "free", lte, int, 1, []),
    cert_property('FACT-J3', 'REQ-J3', "seat.count", "free", neq, int, 0, []),
    cert_property('FACT-J4', 'REQ-J4', "seat.count", "free", neq, int, 1, []),
    cert_property('FACT-OLD', 'REQ-OLD', "plan.price", "monthly", eq, int, 10, [valid_to="2025-12-31T00:00:00Z"]),
    cert_property('FACT-NEW', 'REQ-NEW', "plan.price", "monthly", eq, int, 12, [valid_from="2026-01-01T00:00:00Z"]),
    cert_property('FACT-GB', 'REQ-GB', "plan.storage", "quota", lte, int, 10, [unit="GB"]),
    cert_property('FACT-SEATS', 'REQ-SEATS', "plan.storage", "quota", gte, int, 2, [unit="seat"]),
    cert_predicate('FACT-READ-ALLOW', 'REQ-READ-ALLOW', ["coach", "read", "request", "allow"], assert),
    cert_predicate('FACT-READ-ALLOW-DENIED', 'REQ-READ-ALLOW-DENIED', ["coach", "read", "request", "allow"], deny),
    cert_predicate('FACT-READ-DENY', 'REQ-READ-DENY', ["coach", "read", "request", "deny"], assert),
    cert_predicate('FACT-WRITE', 'REQ-WRITE', ["coach", "write", "request", "allow"], assert),
    cert_rule('FACT-RULE-P', p, not(q)),
    cert_rule('FACT-RULE-Q', q, r).

expected_bundle(_{version: 'kibi.certificates.v1', certificates: [
    _{kind: property_model, subjectKey: 'api.quota', propertyKey: rate_limit, scope: '', domain: int,
      value: 1, facts: ['FACT-MAX', 'FACT-MIN']},
    _{kind: property_unresolved, subjectKey: 'plan.price', propertyKey: monthly, scope: '', domain: int,
      core: ['FACT-NEW', 'FACT-OLD'],
      dropModels: [_{factId: 'FACT-NEW', value: 10}, _{factId: 'FACT-OLD', value: 12}]},
    _{kind: property_contradiction, subjectKey: 'seat.count', propertyKey: free, scope: '', domain: int,
      core: ['FACT-J1', 'FACT-J2', 'FACT-J3', 'FACT-J4'],
      dropModels: [_{factId: 'FACT-J1', value: -1}, _{factId: 'FACT-J2', value: 2},
                   _{factId: 'FACT-J3', value: 0}, _{factId: 'FACT-J4', value: 1}]},
    _{kind: predicate_contradiction, namespace: default, name: permission_rule,
      args: [coach, read, request, allow], core: ['FACT-READ-ALLOW', 'FACT-READ-ALLOW-DENIED']},
    _{kind: predicate_model, namespace: default, name: permission_rule,
      args: [coach, read, request, deny], value: true, facts: ['FACT-READ-DENY']},
    _{kind: predicate_model, namespace: default, name: permission_rule,
      args: [coach, write, request, allow], value: true, facts: ['FACT-WRITE']},
    _{kind: decision_contradiction, namespace: default, name: permission_rule, arity: 4,
      key: [coach, read, request], core: ['FACT-READ-ALLOW', 'FACT-READ-ALLOW-DENIED']},
    _{kind: decision_model, namespace: default, name: permission_rule, arity: 4,
      key: [coach, write, request], value: allow, facts: ['FACT-WRITE']},
    _{kind: rule_strata, strata: [
        _{namespace: default, name: p, arity: 0, stratum: 1},
        _{namespace: default, name: q, arity: 0, stratum: 0},
        _{namespace: default, name: r, arity: 0, stratum: 0}]}
]}).

m(Fact, Op, Bound, m(Fact, Op, Bound, '', '')).

members(Specs, Members) :-
    maplist([Fact-Op-Bound, M]>>m(Fact, Op, Bound, M), Specs, Members).

model(Domain, Specs, Value) :-
    members(Specs, Members),
    first_answer_is_last(certificates:members_model(Domain, Members, Value)).

no_model(Domain, Specs) :-
    members(Specs, Members),
    \+ certificates:members_model(Domain, Members, _).

property(Domain, Members, Certificate) :-
    first_answer_is_last(certificates:property_certificate(context(s, p, '', Domain, Members), Certificate)).

p(Name, predicate(default, Name, 0)).

edges(Specs, Edges) :-
    maplist([Head-Body-Sign, edge(H, B, Sign)]>>(p(Head, H), p(Body, B)), Specs, Edges).

rules(Specs, Certificates) :-
    edges(Specs, Edges),
    first_answer_is_last(certificates:rule_certificates(Edges, Certificates)).

strata(Specs, Strata) :-
    rules(Specs, [Certificate]),
    get_dict(kind, Certificate, rule_strata),
    findall(Name-Stratum, (member(E, Certificate.strata), get_dict(name, E, Name), get_dict(stratum, E, Stratum)), Strata).

cycle(Specs, Cycle) :-
    rules(Specs, [Certificate]),
    get_dict(kind, Certificate, rule_negation_cycle),
    findall(Head-Body-Sign,
            ( member(E, Certificate.cycle), get_dict(name, E.head, Head), get_dict(name, E.body, Body),
              get_dict(sign, E, Sign) ),
            Cycle).

:- begin_tests(certificates_bundle).

test(an_empty_kb_has_no_certificates) :-
    with_fixture_kb(first_answer_is_last(kb_certificates(Bundle))),
    same(Bundle, _{version: 'kibi.certificates.v1', certificates: []}).

test(every_kind_in_order) :-
    with_fixture_kb((
        certificates_fixture,
        first_answer_is_last(kb_certificates(Bundle))
    )),
    expected_bundle(Expected),
    same(Bundle, Expected).

test(writes_the_bundle_and_counts_it_by_kind) :-
    tmp_file(kibi_certificates, Path),
    with_fixture_kb((
        certificates_fixture,
        first_answer_is_last(kb_write_certificates(Path, Summary))
    )),
    read_file_to_string(Path, Written, []),
    delete_file(Path),
    sub_string(Written, _, 1, 0, "\n"),
    \+ sub_string(Written, _, _, _, "\n "),
    atom_json_dict(Written, Bundle, [value_string_as(atom)]),
    atom_json_dict(Summary, SummaryDict, [value_string_as(atom)]),
    expected_bundle(Expected0),
    atom_json_dict(ExpectedText, Expected0, []),
    atom_json_dict(ExpectedText, Expected, [value_string_as(atom)]),
    same(Bundle, Expected),
    atom_string(PathAtom, Path),
    same(SummaryDict, _{path: PathAtom, certificates: 9, byKind: _{
        decision_contradiction: 1, decision_model: 1, predicate_contradiction: 1,
        predicate_model: 2, property_contradiction: 1, property_model: 1,
        property_unresolved: 1, rule_strata: 1}}),
    \+ sub_string(Summary, _, _, _, "\n").

test(an_empty_bundle_writes_an_empty_summary) :-
    tmp_file(kibi_certificates, Path),
    with_fixture_kb(kb_write_certificates(Path, Summary)),
    read_file_to_string(Path, Written, []),
    delete_file(Path),
    Written == "{\"certificates\": [], \"version\":\"kibi.certificates.v1\"}\n",
    atom_json_dict(Summary, SummaryDict, [value_string_as(atom)]),
    atom_string(PathAtom, Path),
    same(SummaryDict, _{path: PathAtom, certificates: 0, byKind: _{}}).

:- end_tests(certificates_bundle).

:- begin_tests(certificates_models).

test(integer_models) :-
    model(int, [a-gte-1, b-lte-10], One),
    One == 1,
    model(int, [a-gt-2.5], Three),
    Three == 3,
    model(int, [a-lt-(-2.5)], MinusFour),
    MinusFour == -4,
    model(int, [a-lt-(-2)], MinusThree),
    MinusThree == -3,
    model(int, [a-gt-2], Three2),
    Three2 == 3,
    model(int, [a-neq-0], MinusOne),
    MinusOne == -1,
    model(int, [], Zero),
    Zero == 0,
    no_model(int, [a-gt-1, b-lt-2]).

test(number_models) :-
    model(number, [a-gt-0, b-lt-1], Half),
    Half =:= 0.5,
    model(number, [a-gt-2.5], ThreeHalf),
    ThreeHalf =:= 3.5,
    model(number, [a-lt-(-2.5)], MinusThreeHalf),
    MinusThreeHalf =:= -3.5,
    model(number, [a-gt-10, b-lt-20], Eleven),
    Eleven =:= 11,
    model(number, [a-gt-10, b-lt-10.5], Middle),
    Middle =:= 10.25,
    no_model(number, [a-gt-1, b-lt-1]).

test(bool_models) :-
    model(bool, [a-eq-true], True),
    True == true,
    model(bool, [a-neq-true], False),
    False == false,
    no_model(bool, [a-eq-true, b-eq-false]).

test(string_models) :-
    model(string, [a-eq-"b"], B),
    B == "b",
    model(string, [a-neq-"a", b-neq-b], Fresh),
    Fresh == "kibi:model:0",
    model(string, [a-neq-"kibi:model:0"], Next),
    Next == "kibi:model:1",
    model(string, [a-neq-"kibi:model:0", b-neq-'kibi:model:1'], Fresher),
    Fresher == "kibi:model:2",
    no_model(string, [a-eq-"a", b-eq-"b"]).

test(set_models) :-
    model(set, [a-includes-["a"], b-excludes-["b"]], A),
    A == ["a"],
    model(set, [a-includes-["a"], b-includes-["b"]], Union),
    Union == ["a", "b"],
    model(set, [a-includes-["a"], c-includes-["c"], b-excludes-["b"]], Included),
    Included == ["a", "c"],
    model(set, [a-neq-["a"], b-neq-[]], Fresh),
    Fresh == ["kibi:model:0"],
    model(set, [a-neq-["kibi:model:0"], b-neq-[], c-neq-["kibi:model:0", "kibi:model:1"]], Fresher),
    Fresher == ["kibi:model:2"],
    no_model(set, [a-eq-["a"], b-eq-["b"]]).

test(text_values) :-
    certificates:text_value(abc, A),
    A == "abc",
    certificates:text_value("abc", S),
    S == "abc",
    \+ certificates:text_value(1, _),
    first_answer_is_last(certificates:text_value(abc, _)),
    first_answer_is_last(certificates:text_value("abc", _)).

:- end_tests(certificates_models).

:- begin_tests(certificates_properties).

test(a_satisfiable_context_gets_a_model) :-
    members([a-gte-1, b-lte-10], Members),
    property(int, Members, Certificate),
    same(Certificate, _{subjectKey: s, propertyKey: p, scope: '', domain: int, kind: property_model,
                        value: 1, facts: [a, b]}).

test(a_contradiction_gets_an_irreducible_core) :-
    members([j0-gte-(-5), j1-gte-0, j2-lte-1, j3-neq-0, j4-neq-1], Members),
    property(int, Members, Certificate),
    same(Certificate, _{subjectKey: s, propertyKey: p, scope: '', domain: int,
                        kind: property_contradiction, core: [j1, j2, j3, j4],
                        dropModels: [_{factId: j1, value: -1}, _{factId: j2, value: 2},
                                     _{factId: j3, value: 0}, _{factId: j4, value: 1}]}).

test(a_lone_unsatisfiable_fact_is_its_own_core) :-
    members([a-eq-1.5], Members),
    property(int, Members, Certificate),
    same(Certificate, _{subjectKey: s, propertyKey: p, scope: '', domain: int,
                        kind: property_contradiction, core: [a], dropModels: [_{factId: a, value: 0}]}).

test(disjoint_windows_leave_a_contradiction_unresolved) :-
    Members = [m(a, eq, 1, '', '2025-12-31T00:00:00Z'), m(b, eq, 2, '2026-01-01T00:00:00Z', '2026-12-31T00:00:00Z')],
    property(int, Members, Certificate),
    same(Certificate, _{subjectKey: s, propertyKey: p, scope: '', domain: int,
                        kind: property_unresolved, core: [a, b],
                        dropModels: [_{factId: a, value: 2}, _{factId: b, value: 1}]}),
    Overlapping = [m(a, eq, 1, '', '2026-12-31T00:00:00Z'), m(b, eq, 2, '2026-01-01T00:00:00Z', '2026-06-30T00:00:00Z')],
    property(int, Overlapping, Overlap),
    get_dict(kind, Overlap, property_contradiction).

test(unresolved_contexts_get_no_certificate) :-
    \+ certificates:property_certificate(unresolved(s, p, '', "reason"), _).

:- end_tests(certificates_properties).

:- begin_tests(certificates_groups).

label(_{namespace: default, name: permission_rule}).

test(agreeing_facts_get_a_model) :-
    label(Label),
    first_answer_is_last(certificates:group_certificate(predicate, group(Label, [p(a, true), p(b, true)]), Certificate)),
    same(Certificate, _{namespace: default, name: permission_rule, kind: predicate_model, value: true, facts: [a, b]}),
    first_answer_is_last(certificates:group_certificate(decision, group(Label, [p(c, deny)]), Decision)),
    same(Decision, _{namespace: default, name: permission_rule, kind: decision_model, value: deny, facts: [c]}).

test(the_first_disagreeing_pair_is_the_core) :-
    label(Label),
    first_answer_is_last(certificates:group_certificate(decision, group(Label, [p(a, allow), p(b, allow), p(c, deny), p(d, deny)]), Certificate)),
    same(Certificate, _{namespace: default, name: permission_rule, kind: decision_contradiction, core: [a, c]}),
    first_answer_is_last(certificates:group_certificate(predicate, group(Label, [p(a, false), p(b, true)]), Predicate)),
    same(Predicate, _{namespace: default, name: permission_rule, kind: predicate_contradiction, core: [a, b]}).

test(unresolved_groups_get_no_certificate) :-
    label(Label),
    \+ certificates:group_certificate(predicate, unresolved(Label, "reason"), _).

:- end_tests(certificates_groups).

:- begin_tests(certificates_rules).

test(no_rules_no_certificate) :-
    rules([], Certificates),
    Certificates == [].

test(strata_follow_negated_dependencies) :-
    strata([p-q-negative, q-r-positive], Strata),
    Strata == [p-1, q-0, r-0].

test(a_positive_cycle_is_stratified) :-
    strata([p-q-positive, q-p-positive], Strata),
    Strata == [p-0, q-0],
    strata([p-p-positive], Self),
    Self == [p-0].

% Edges sorted by head raise one stratum per round, the slowest order.
test(a_long_negated_chain_settles) :-
    strata([a-b-negative, b-c-negative, c-d-negative, d-e-negative], Strata),
    Strata == [a-4, b-3, c-2, d-1, e-0].

test(a_stronger_edge_is_not_undone_by_a_weaker_one) :-
    strata([a-b-negative, a-c-positive], Strata),
    Strata == [a-1, b-0, c-0].

test(a_stratum_is_never_lowered) :-
    strata([a-b-negative, a-c-positive, c-d-negative, d-e-negative], Strata),
    Strata == [a-2, b-0, c-2, d-1, e-0].

test(a_negation_cycle_is_shown) :-
    cycle([p-q-negative, q-r-positive, r-p-positive], Cycle),
    Cycle == [p-q-negative, q-r-positive, r-p-positive].

test(a_self_negation_is_a_cycle) :-
    cycle([p-p-negative], Cycle),
    Cycle == [p-p-negative].

test(the_cycle_search_skips_loops_and_dead_ends) :-
    cycle([a-x-negative, x-y-positive, x-z-positive, y-x-positive, z-w-positive, z-a-negative], Cycle),
    Cycle == [a-x-negative, x-z-positive, z-a-negative].

test(the_cycle_starts_at_the_first_negated_edge_on_one) :-
    cycle([a-b-negative, b-a-positive, c-d-negative, d-c-negative], Cycle),
    Cycle == [a-b-negative, b-a-positive],
    cycle([a-b-negative, c-d-negative, d-c-positive], Later),
    Later == [c-d-negative, d-c-positive].

test(cycle_entries_name_their_predicates) :-
    edges([p-p-negative], Edges),
    certificates:rule_certificates(Edges, [Certificate]),
    same(Certificate, _{kind: rule_negation_cycle, cycle: [
        _{head: _{namespace: default, name: p, arity: 0},
          body: _{namespace: default, name: p, arity: 0}, sign: negative}]}).

:- end_tests(certificates_rules).
