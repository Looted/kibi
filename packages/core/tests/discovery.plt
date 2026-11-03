:- encoding(utf8).
:- use_module(library(plunit)).
:- use_module(library(http/json)).
:- use_module('../src/kb.pl').
:- use_module('../src/discovery.pl').
:- use_module('../src/requirement_proof.pl', [requirement_proof_context/6, requirement_proof/4]).
:- use_module('../src/status.pl', [status_meta_dict/1, status_scope_dict/1]).
:- use_module(kb_fixture).
:- use_module(proof_fixture).
:- use_module(test_helpers).

% Discovery reports, typed fact queries and bounded graph traversal over
% fresh fixture KBs. JSON answers are parsed with strings as atoms and
% compared whole; the status meta is checked against status_meta_dict/1.

%% dsc_json(:Goal, -Dict)
% Call Goal with a JSON string as its last argument and parse it. A meta
% key must equal the parsed status_meta_dict/1 and is dropped.
dsc_json(Goal, Dict) :-
    once(call(Goal, Json)),
    string(Json),
    atom_json_dict(Json, Dict0, [value_string_as(atom)]),
    (   del_dict(meta, Dict0, Meta, Dict)
    ->  status_meta_dict(Expected0),
        dsc_roundtrip(Expected0, Expected),
        assertion(same(Meta, Expected))
    ;   Dict = Dict0
    ).

dsc_roundtrip(Dict, Parsed) :-
    with_output_to(string(Json), json_write_dict(current_output, Dict, [])),
    atom_json_dict(Json, Parsed, [value_string_as(atom)]).

%% dsc_kb(:Goal)
% Goal's first answer on a fresh, empty KB.
:- meta_predicate dsc_kb(0).
dsc_kb(Goal) :-
    with_fixture_kb(once(Goal)).

%% dsc_pick(+Dict, +Keys, -Pairs)
dsc_pick(Dict, Keys, Pairs) :-
    findall(Key-Value, (member(Key, Keys), get_dict(Key, Dict, Value)), Pairs).

dsc_ids(Rows, Ids) :-
    findall(Id, (member(Row, Rows), get_dict(id, Row, Id)), Ids).

dsc_rows_pick(Rows, Keys, Picked) :-
    findall(Pairs, (member(Row, Rows), dsc_pick(Row, Keys, Pairs)), Picked).

% A small project: a must requirement with a scenario, tests and symbols.
dsc_basic :-
    pf_entity(req, 'REQ-A', [priority=must, tags=[alpha], status=open]),
    pf_entity(req, 'REQ-B', [priority=should, tags=[beta], status=open]),
    pf_entity(test, 'TEST-E2E', [status=passing, verification_scope=end_to_end]),
    pf_entity(test, 'TEST-UNIT', [status=passing, verification_scope=unit]),
    pf_entity(test, 'TEST-FAIL', [status=failing]),
    pf_entity(scenario, 'SCN-A', []),
    pf_entity(symbol, 'SYM-P', []),
    pf_entity(symbol, 'SYM-T', []),
    fixture_rel(verified_by, 'REQ-A', 'TEST-E2E'),
    fixture_rel(specified_by, 'REQ-A', 'SCN-A'),
    fixture_rel(validates, 'TEST-FAIL', 'SCN-A'),
    fixture_rel(implements, 'SYM-P', 'REQ-A'),
    fixture_rel(covered_by, 'SYM-P', 'TEST-UNIT'),
    fixture_rel(executable_for, 'SYM-T', 'TEST-UNIT').

:- begin_tests(discovery_value_helpers).

test(source_value_atom_unwraps_every_shape) :-
    once(discovery:source_value_atom('^^'("typed", xsd), A1)), A1 == typed,
    once(discovery:source_value_atom(literal(type(xsd, "lit")), A2)), A2 == lit,
    once(discovery:source_value_atom("str", A3)), A3 == str,
    once(discovery:source_value_atom(atm, A4)), A4 == atm,
    once(discovery:source_value_atom(42, A5)), A5 == '42',
    once(discovery:source_value_atom(f(x), A6)), A6 == 'f(x)',
    first_answer_is_last(discovery:source_value_atom('^^'(inner, t), _)),
    first_answer_is_last(discovery:source_value_atom(literal(type(t, v)), _)),
    first_answer_is_last(discovery:source_value_atom("s", _)),
    first_answer_is_last(discovery:source_value_atom(a, _)).

test(source_value_atom_rejects_a_bound_mismatch) :-
    \+ discovery:source_value_atom("abc", abd),
    \+ discovery:source_value_atom(abc, abd).

test(source_value_atom_keeps_other_compounds) :-
    once(discovery:source_value_atom('^^'(a, b, c), Atom)),
    Atom == '^^(a,b,c)'.

test(paginate_rows_windows) :-
    once(discovery:paginate_rows([a, b, c, d], 1, 2, P1)), P1 == [b, c],
    once(discovery:paginate_rows([a, b, c, d], 3, 5, P2)), P2 == [d],
    once(discovery:paginate_rows([a, b], 5, 1, P3)), P3 == [],
    once(discovery:paginate_rows([a, b, c], 0, 0, P4)), P4 == [],
    first_answer_is_last(discovery:paginate_rows([a, b, c, d], 1, 2, _)),
    first_answer_is_last(discovery:paginate_rows([a, b, c, d], 3, 5, _)),
    first_answer_is_last(discovery:paginate_rows([a], 3, 5, _)).

test(sort_dict_rows_orders_by_type_then_id) :-
    once(discovery:sort_dict_rows([_{id: b, type: req}, _{id: a, type: test}, _{id: a, type: req}], Sorted)),
    same(Sorted, [_{id: a, type: req}, _{id: b, type: req}, _{id: a, type: test}]).

test(dict_json_string_writes_a_string) :-
    once(discovery:dict_json_string(_{a: 1}, Json)),
    string(Json),
    atom_json_dict(Json, Dict, []),
    same(Dict, _{a: 1}).

test(search_answer_text_shapes) :-
    once(discovery:search_answer_text('^^'("typed", xsd), T1)), T1 == "typed",
    once(discovery:search_answer_text("plain", T2)), T2 == "plain",
    once(discovery:search_answer_text(atom, T3)), T3 == "atom",
    once(discovery:search_answer_text(f(x), T4)), T4 == "f(x)",
    first_answer_is_last(discovery:search_answer_text('^^'(a, t), _)),
    first_answer_is_last(discovery:search_answer_text("s", _)),
    first_answer_is_last(discovery:search_answer_text(a, _)).

test(search_answer_text_rejects_a_bound_mismatch) :-
    \+ discovery:search_answer_text("abc", "abd"),
    \+ discovery:search_answer_text(abc, "abd").

test(search_answer_clip_keeps_short_text_and_marks_cuts) :-
    once(discovery:search_answer_clip("abcd", 4, C1)), C1 == "abcd",
    once(discovery:search_answer_clip("abcde", 4, C2)), C2 == "abc…",
    once(discovery:search_answer_clip("", 0, C3)), C3 == "".

test(must_priority_matches_a_must_suffix_in_any_case) :-
    once(discovery:must_priority(must)),
    once(discovery:must_priority('MUST')),
    once(discovery:must_priority('p0-must')),
    \+ discovery:must_priority('must-have'),
    \+ discovery:must_priority(should),
    \+ discovery:must_priority("must").

test(matches_type_and_tags_and_source, [nondet]) :-
    once(discovery:matches_type(none, req)),
    once(discovery:matches_type(req, req)),
    \+ discovery:matches_type(req, test),
    once(discovery:matches_tags([], [])),
    once(discovery:matches_tags([b, c], [tags=[a, c]])),
    first_answer_is_last(discovery:matches_tags([a, c], [tags=[a, c]])),
    \+ discovery:matches_tags([b], [tags=[a]]),
    \+ discovery:matches_tags([b], []),
    once(discovery:matches_source(none, [])),
    once(discovery:matches_source(lib, [source="src/lib/x.ts"])),
    \+ discovery:matches_source(app, [source="src/lib/x.ts"]),
    \+ discovery:matches_source(lib, []).

test(entity_title_status_source_defaults_the_source) :-
    once(discovery:entity_title_status_source([title="T", status=open, source="s"], T1, S1, Src1)),
    [T1, S1, Src1] == ['T', open, s],
    once(discovery:entity_title_status_source([title="T", status=open], _, _, Src2)),
    Src2 == '',
    \+ discovery:entity_title_status_source([status=open], _, _, _),
    \+ discovery:entity_title_status_source([title="T"], _, _, _).

test(entity_priority_defaults_to_empty) :-
    once(discovery:entity_priority([priority="must"], P1)), P1 == must,
    once(discovery:entity_priority([], P2)), P2 == ''.

test(gap_row_visible_lets_stubs_in_only_on_request, [nondet]) :-
    once(discovery:gap_row_visible([], false)),
    once(discovery:gap_row_visible(['bootstrap:provenance-stub'], true)),
    \+ discovery:gap_row_visible([other], true).

test(ask_small_helpers) :-
    once(discovery:ask_namespace(none, N1)), var(N1),
    once(discovery:ask_namespace(acl, N2)), N2 == acl,
    first_answer_is_last(discovery:ask_namespace(none, _)),
    once(discovery:ask_optional_atom(none, O1)), O1 == null,
    once(discovery:ask_optional_atom(x, O2)), O2 == x,
    first_answer_is_last(discovery:ask_optional_atom(none, _)),
    once(discovery:ask_pattern_json([], J1)), J1 == [],
    first_answer_is_last(discovery:ask_pattern_json([], _)),
    once(discovery:ask_pattern_json(['$any', a], J2)), J2 == [null, a],
    first_answer_is_last(discovery:ask_pattern_entry_json('$any', _)),
    once(discovery:ask_pattern_args([], [x, y])),
    first_answer_is_last(discovery:ask_pattern_args([], [x])),
    once(discovery:ask_pattern_args(['$any', "b"], [z, b])),
    \+ discovery:ask_pattern_args([a], [b]),
    first_answer_is_last(discovery:ask_pattern_arg('$any', _)),
    once(discovery:ask_polarity_match(none, deny)),
    first_answer_is_last(discovery:ask_polarity_match(none, _)),
    once(discovery:ask_polarity_match(deny, deny)),
    \+ discovery:ask_polarity_match(assert, deny),
    once(discovery:ask_scope_match(current_requirements, true)),
    first_answer_is_last(discovery:ask_scope_match(current_requirements, true)),
    \+ discovery:ask_scope_match(current_requirements, false),
    once(discovery:ask_scope_match(all, false)).

test(ask_spec_json_shapes) :-
    once(discovery:ask_spec_json(where([a=1, b=x]), ignored, J1)),
    same(J1, _{a: 1, b: x}),
    first_answer_is_last(discovery:ask_spec_json(where([]), ignored, _)),
    once(discovery:ask_spec_json([x, '$any'], [x, '$any'], J2)),
    J2 == [x, null].

test(ask_arg_pattern_positional_and_named) :-
    once(discovery:ask_arg_pattern([a, b], [x, y], P1, W1)), P1 == [a, b], W1 == [],
    once(discovery:ask_arg_pattern([], [x, y], P2, W2)), P2 == [], W2 == [],
    once(discovery:ask_arg_pattern([a], none, P3, W3)), P3 == [a], W3 == [],
    once(discovery:ask_arg_pattern([a], [x, y], _, W4)),
    W4 == ['positional args need one entry per argument (2 declared, 1 given); use null for any value or name them with where'],
    once(discovery:ask_arg_pattern(where([y=b]), [x, y], P5, W5)), P5 == ['$any', b], W5 == [],
    first_answer_is_last(discovery:ask_arg_pattern(where([y=b]), [x, y], _, _)),
    once(discovery:ask_arg_pattern(where([z=b]), [x, y], P6, W6)),
    P6 == ['$any', '$any'],
    W6 == ['\'z\' is not an argument of this predicate; declared arguments: x, y'],
    once(discovery:ask_arg_pattern(where([]), none, P7, W7)), P7 == [], W7 == [],
    once(discovery:ask_arg_pattern(where([a=b]), none, P8, W8)),
    P8 == [],
    W8 == ["named arguments need a predicate schema; none declares this predicate, so pass positional args instead"].

test(ask_json_value_parses_stored_json, [nondet]) :-
    once(discovery:ask_json_value('^^'("{\"a\":\"b\"}", xsd), V1)), same(V1, _{a: "b"}),
    once(discovery:ask_json_value(literal("{\"a\":1}"), V2)), same(V2, _{a: 1}),
    once(discovery:ask_json_value(_{k: v}, V3)), same(V3, _{k: v}),
    once(discovery:ask_json_value('{"x":[1]}', V4)), same(V4, _{x: [1]}),
    \+ discovery:ask_json_value("not json", _),
    \+ discovery:ask_json_value(42, _),
    first_answer_is_last(discovery:ask_json_value('^^'("{}", t), _)),
    first_answer_is_last(discovery:ask_json_value(literal("{}"), _)),
    first_answer_is_last(discovery:ask_json_value(_{}, _)).

test(ask_distinct_counts_values) :-
    Rows = [_{args: [a, x]}, _{args: [b, x]}, _{args: [c, y]}],
    once(discovery:ask_distinct(none, [p, q], Rows, D1, W1)), D1 == null, W1 == [],
    first_answer_is_last(discovery:ask_distinct(none, [p, q], Rows, _, _)),
    once(discovery:ask_distinct(q, [p, q], Rows, D2, W2)),
    W2 == [],
    same(D2, _{argument: q, values: [_{value: x, count: 2}, _{value: y, count: 1}]}),
    first_answer_is_last(discovery:ask_distinct(q, [p, q], Rows, _, _)),
    once(discovery:ask_distinct(r, [p, q], Rows, D3, W3)),
    D3 == null,
    W3 == ['distinct argument \'r\' is not a declared argument of this predicate; no schema names it'],
    once(discovery:ask_distinct(r, none, Rows, D4, _)), D4 == null.

test(ask_named_arguments_need_the_same_arity) :-
    once(discovery:ask_named_arguments([x, y], [a, b], N1)), same(N1, _{x: a, y: b}),
    first_answer_is_last(discovery:ask_named_arguments([x, y], [a, b], _)),
    once(discovery:ask_named_arguments([x], [a, b], N2)), N2 == null,
    once(discovery:ask_named_arguments(none, [a], N3)), N3 == null.

test(ask_property_value_json_keeps_numbers) :-
    once(discovery:ask_property_value_json(3, V1)), V1 == 3,
    first_answer_is_last(discovery:ask_property_value_json(3, _)),
    once(discovery:ask_property_value_json("txt", V2)), V2 == txt.

test(ask_typed_value_lists_and_scalars) :-
    once(discovery:ask_typed_value(["a", "b"], V1)), V1 == [a, b],
    first_answer_is_last(discovery:ask_typed_value(["a"], _)),
    once(discovery:ask_typed_value("s", V2)), V2 == s.

test(ask_schema_sort_key) :-
    once(discovery:ask_schema_sort_key(_{namespace: ns, name: n, arity: 2}, Key)),
    Key == 'ns:n/2'.

:- end_tests(discovery_value_helpers).

:- begin_tests(discovery_coverage_helpers).

test(classify_coverage_depth_order) :-
    dsc_kb((
        pf_entity(test, 'T-E2E', [verification_scope=end_to_end]),
        pf_entity(test, 'T-UNIT', [verification_scope=unit]),
        pf_entity(test, 'T-INT', [verification_scope=integration]),
        once(discovery:classify_coverage_depth(0, [], [], ['T-UNIT', 'T-E2E'], [], D1)),
        D1 == direct_passing_e2e,
        first_answer_is_last(discovery:classify_coverage_depth(0, [], [], ['T-E2E', 'T-UNIT'], [], _)),
        once(discovery:classify_coverage_depth(0, [], [], ['T-UNIT'], ['T-UNIT', 'T-E2E'], D2)),
        D2 == scenario_passing_e2e,
        first_answer_is_last(discovery:classify_coverage_depth(0, [], [], [], ['T-E2E', 'T-UNIT'], _)),
        once(discovery:classify_coverage_depth(0, [x], ['T-UNIT'], [], [], D3)),
        D3 == unit_only,
        first_answer_is_last(discovery:classify_coverage_depth(0, [x], ['T-UNIT'], [], [], _)),
        once(discovery:classify_coverage_depth(0, [x], ['T-UNIT', 'T-INT'], [], [], D4)),
        D4 == open_or_nonpassing_tests_only,
        once(discovery:classify_coverage_depth(0, [x], [], [], [], D5)),
        D5 == open_or_nonpassing_tests_only,
        first_answer_is_last(discovery:classify_coverage_depth(0, [x], [], [], [], _)),
        once(discovery:classify_coverage_depth(2, [], [], [], [], D6)),
        D6 == scenario_only_no_test,
        first_answer_is_last(discovery:classify_coverage_depth(2, [], [], [], [], _)),
        once(discovery:classify_coverage_depth(0, [], [], [], [], D7)),
        D7 == no_test_evidence
    )).

test(test_scope_reads_scope_tags_and_source) :-
    dsc_kb((
        pf_entity(test, 'T-SCOPED', [verification_scope=integration, tags=[e2e]]),
        pf_entity(test, 'T-TAG', [tags=[other, 'E2E']]),
        pf_entity(test, 'T-SRC', [source="tests/E2E/flow.ts"]),
        pf_entity(test, 'T-NONE', [tags=[unit]]),
        once(discovery:test_scope('T-SCOPED', S1)), S1 == integration,
        once(discovery:test_scope('T-TAG', S2)), S2 == end_to_end,
        once(discovery:test_scope('T-SRC', S3)), S3 == end_to_end,
        once(discovery:test_scope('T-NONE', S4)), S4 == unknown,
        first_answer_is_last(discovery:legacy_e2e_test([tags=[e2e], source="e2e"])),
        \+ discovery:legacy_e2e_test([]),
        \+ discovery:legacy_e2e_tag([]),
        \+ discovery:test_scope('T-MISSING', _)
    )).

test(passing_tests_and_statuses) :-
    dsc_kb((
        pf_entity(test, 'T-PASS', [status=passing, verification_scope=unit]),
        pf_entity(test, 'T-FAIL', [status=failing]),
        once(discovery:passing_tests(['T-PASS', 'T-FAIL', 'T-GONE'], P)), P == ['T-PASS'],
        once(discovery:test_statuses(['T-PASS', 'T-FAIL', 'T-PASS', 'T-GONE'], S)), S == [failing, passing],
        once(discovery:test_scopes(['T-PASS', 'T-FAIL', 'T-GONE'], Sc)), Sc == [unit, unknown]
    )).

test(requirement_test_listings) :-
    dsc_kb((
        dsc_basic,
        pf_entity(test, 'TEST-V', [status=passing]),
        pf_entity(test, 'TEST-COV', [status=passing]),
        pf_entity(test, 'TEST-SV', [status=passing]),
        fixture_rel(validates, 'TEST-V', 'REQ-A'),
        pf_raw_rel(covered_by, 'REQ-A', 'TEST-COV'),
        fixture_rel(verified_by, 'SCN-A', 'TEST-SV'),
        once(discovery:requirement_direct_tests('REQ-A', Direct)),
        Direct == ['TEST-COV', 'TEST-E2E', 'TEST-V'],
        once(discovery:requirement_scenario_tests('REQ-A', Scenario)),
        Scenario == ['TEST-FAIL', 'TEST-SV'],
        once(discovery:requirement_test_count('REQ-A', Count)),
        Count == 4,
        once(discovery:count_direct_symbols('REQ-A', Symbols)), Symbols == 1,
        once(discovery:count_direct_requirements('SYM-P', Reqs)), Reqs == 1,
        once(discovery:count_direct_tests('SYM-P', Tests)), Tests == 1,
        once(discovery:count_executable_tests('SYM-T', Exec)), Exec == 1,
        once(discovery:count_distinct_targets(specified_by, 'REQ-A', source, Targets)), Targets == 1,
        first_answer_is_last(discovery:count_distinct_targets(specified_by, 'REQ-A', source, _))
    )).

test(direct_and_scenario_tests_need_a_test_entity) :-
    dsc_kb((
        pf_entity(req, 'REQ-X', [status=open]),
        pf_entity(scenario, 'SCN-X', []),
        pf_entity(symbol, 'SYM-X', []),
        fixture_rel(specified_by, 'REQ-X', 'SCN-X'),
        pf_entity(test, 'TEST-REAL', [status=passing]),
        pf_raw_rel(verified_by, 'REQ-X', 'SYM-X'),
        pf_raw_rel(covered_by, 'REQ-X', 'SYM-X'),
        pf_raw_rel(validates, 'SYM-X', 'REQ-X'),
        pf_raw_rel(validates, 'SYM-X', 'SCN-X'),
        pf_raw_rel(verified_by, 'SCN-X', 'SYM-X'),
        once(discovery:requirement_direct_tests('REQ-X', Direct)), Direct == [],
        once(discovery:requirement_scenario_tests('REQ-X', Scenario)), Scenario == []
    )).

test(count_transitive_symbols_follows_the_flag) :-
    dsc_kb((
        pf_entity(req, 'REQ-TOP', [status=open]),
        pf_entity(symbol, 'SYM-SUB', []),
        fixture_rel(implements, 'SYM-SUB', 'REQ-TOP'),
        once(discovery:count_transitive_symbols('REQ-TOP', false, Direct)),
        Direct == 1,
        once(discovery:count_transitive_symbols('REQ-TOP', true, Transitive)),
        Transitive == 1,
        first_answer_is_last(discovery:count_transitive_symbols('REQ-TOP', true, _))
    )).

test(requirement_coverage_state_judges_must_requirements_only) :-
    dsc_kb((
        pf_entity(req, 'REQ-M', [priority=must, status=open]),
        pf_entity(req, 'REQ-S', [priority=should, status=open]),
        kb_entity('REQ-M', req, MustProps),
        once(discovery:requirement_coverage_state('REQ-M', MustProps, G1, E1, C1)),
        [G1, E1, C1] == [[missing_scenario_and_test], true, uncovered],
        first_answer_is_last(discovery:requirement_coverage_state('REQ-M', MustProps, _, _, _)),
        kb_entity('REQ-S', req, ShouldProps),
        once(discovery:requirement_coverage_state('REQ-S', ShouldProps, G2, E2, C2)),
        [G2, E2, C2] == [[], false, not_applicable],
        once(discovery:requirement_gap_list('REQ-M', L1)), L1 == [missing_scenario_and_test],
        first_answer_is_last(discovery:requirement_gap_list('REQ-M', _)),
        once(discovery:requirement_gap_list('REQ-S', L2)), L2 == []
    )).

test(requirement_coverage_state_fully_covered) :-
    dsc_kb((
        dsc_basic,
        kb_entity('REQ-A', req, Props),
        once(discovery:requirement_coverage_state('REQ-A', Props, Gaps, Evaluated, Status)),
        [Gaps, Evaluated, Status] == [[], true, fully_covered]
    )).

test(row_filters) :-
    Rows = [_{id: a, proofStatus: tested}, _{id: b, proofStatus: missing}, _{id: c, proofStatus: not_applicable}],
    once(discovery:filter_req_coverage_rows(true, Rows, R1)), R1 == Rows,
    once(discovery:filter_req_coverage_rows(false, Rows, R2)), same(R2, [_{id: b, proofStatus: missing}]),
    Symbols = [_{coverageStatus: uncovered}, _{coverageStatus: fully_covered}],
    once(discovery:filter_symbol_coverage_rows(true, Symbols, S1)), S1 == Symbols,
    once(discovery:filter_symbol_coverage_rows(false, Symbols, S2)), same(S2, [_{coverageStatus: uncovered}]),
    once(discovery:req_row_proof_status_in([missing, tested], _{proofStatus: tested})),
    \+ discovery:req_row_proof_status_in([missing], _{proofStatus: tested}).

test(coverage_summary_counts_each_kind) :-
    Rows = [
        _{coverageStatus: fully_covered, evaluated: true, gaps: [], proofStatus: tested,
          evidenceLevel: proved, claimSummary: _{applicable: 2, proved: 1, attested: 0, tested: 1, unresolved: 0},
          evidenceFloor: _{required: tested, status: met}},
        _{coverageStatus: uncovered, evaluated: true, gaps: [missing_scenario], proofStatus: unresolved,
          evidenceLevel: tested, claimSummary: _{applicable: 1, proved: 0, attested: 1, tested: 0, unresolved: 3},
          evidenceFloor: _{required: proved, status: below}},
        _{coverageStatus: uncovered, evaluated: true, gaps: [missing_test], proofStatus: missing,
          evidenceLevel: asserted, claimSummary: _{applicable: x},
          evidenceFloor: _{required: unverified, status: met}},
        _{coverageStatus: uncovered, evaluated: true, gaps: [missing_scenario_and_test], proofStatus: missing,
          evidenceLevel: unverified, evidenceFloor: _{required: tested, status: pending_reproof}},
        _{coverageStatus: not_applicable, evaluated: false, gaps: [], proofStatus: not_applicable,
          evidenceLevel: asserted},
        _{gaps: [missing_scenario, missing_test], proofStatus: other}
    ],
    once(discovery:coverage_summary(Rows, Summary)),
    same(Summary, _{
        total: 6, evaluated: 4, fullyCovered: 1, uncovered: 3, notApplicable: 1,
        missingScenario: 1, missingTest: 1, missingScenarioAndTest: 1,
        proofTested: 1, proofUnresolved: 1, proofMissing: 2, proofNotApplicable: 1,
        evidenceLevels: _{proved: 1, tested: 1, asserted: 2, unverified: 1},
        proofClaims: _{applicable: 3, proved: 1, attested: 1, tested: 1, unresolved: 3},
        evidenceFloors: _{met: 1, below: 1, pendingReproof: 1},
        linkCoverageScope: priority_must
    }).

test(symbol_row_predicates) :-
    once(discovery:symbol_row_fully_covered(_{coverageStatus: fully_covered})),
    \+ discovery:symbol_row_fully_covered(_{coverageStatus: uncovered}),
    \+ discovery:symbol_row_fully_covered(_{}),
    once(discovery:symbol_row_uncovered(_{coverageStatus: uncovered})),
    \+ discovery:symbol_row_uncovered(_{coverageStatus: fully_covered}),
    once(discovery:symbol_row_not_applicable(_{coverageStatus: not_applicable})),
    \+ discovery:symbol_row_not_applicable(_{coverageStatus: uncovered}),
    once(discovery:symbol_row_mixed_role(_{traceabilityRole: mixed})),
    \+ discovery:symbol_row_mixed_role(_{traceabilityRole: production}).

test(req_row_predicates_need_their_key) :-
    \+ discovery:req_row_fully_covered(_{}),
    \+ discovery:req_row_evaluated(_{}),
    \+ discovery:req_row_uncovered(_{}),
    \+ discovery:req_row_not_applicable(_{}),
    \+ discovery:req_row_evaluated(_{evaluated: false}).

test(type_entity_counts_skip_stubs) :-
    dsc_kb((
        pf_entity(fact, 'F-STUB', [fact_kind=meta, tags=['bootstrap:provenance-stub']]),
        pf_entity(fact, 'F-STUB2', [fact_kind=meta, tags=[x, "bootstrap:provenance-stub"]]),
        pf_entity(fact, 'F-REAL', [fact_kind=meta, tags=[x]]),
        pf_entity(fact, 'F-PLAIN', [fact_kind=meta]),
        pf_entity(req, 'R-1', [status=open, tags=['bootstrap:provenance-stub']]),
        findall(T-C, discovery:type_entity_count(T, C), Pairs),
        Pairs == [fact-2, req-1],
        findall(Id, discovery:provenance_stub_entity(Id), Stubs0),
        msort(Stubs0, Stubs),
        Stubs == ['F-STUB', 'F-STUB2'],
        kb_entity('F-STUB2', fact, StubProps),
        first_answer_is_last(discovery:provenance_stub_props(fact, StubProps)),
        \+ discovery:provenance_stub_props(fact, [tags=x]),
        kb_entity('F-REAL', fact, RealProps),
        \+ discovery:provenance_stub_props(fact, RealProps)
    )).

test(type_pair_row) :-
    once(discovery:type_pair_row(req-3, Row)),
    same(Row, _{id: req, type: req, count: 3}).

test(relationship_counting_follows_inverses) :-
    dsc_kb((
        pf_entity(req, 'REQ-1', [status=open]),
        pf_entity(test, 'TEST-1', [status=passing]),
        pf_entity(test, 'TEST-2', [status=passing]),
        fixture_rel(verified_by, 'REQ-1', 'TEST-1'),
        fixture_rel(validates, 'TEST-2', 'REQ-1'),
        once(discovery:relationship_count('REQ-1', verified_by, C1)), C1 == 1,
        once(discovery:relationship_count('TEST-1', verified_by, C2)), C2 == 1,
        once(discovery:linked_relationship_count('REQ-1', verified_by, L1)), L1 == 2,
        once(discovery:linked_relationship_count('REQ-1', validates, L2)), L2 == 2,
        once(discovery:linked_relationship_count('REQ-1', implements, L3)), L3 == 0,
        first_answer_is_last(discovery:linked_relationship_count('REQ-1', verified_by, _)),
        once(discovery:relationships_missing('REQ-1', [implements, depends_on])),
        \+ discovery:relationships_missing('REQ-1', [implements, verified_by]),
        once(discovery:relationships_present('REQ-1', [verified_by, validates])),
        \+ discovery:relationships_present('REQ-1', [verified_by, implements]),
        once(discovery:relationship_counts('REQ-1', Counts)),
        is_dict(Counts, relationship_counts),
        get_dict(verified_by, Counts, 1),
        get_dict(validates, Counts, 1),
        get_dict(implements, Counts, 0)
    )).

:- end_tests(discovery_coverage_helpers).

% --- graph expansion -----------------------------------------------------------

dsc_node(Id-Type-Status, _{id: Id, status: Status, title: 'Fixture entity', type: Type}).

dsc_edge(From-Type-To, _{from: From, to: To, type: Type}).

dsc_graph(Seeds, Relationships, Direction, Depth, Types, MaxNodes, MaxEdges, Nodes, Edges, Truncated) :-
    dsc_json(graph_expand_json(Seeds, Relationships, Direction, Depth, Types, MaxNodes, MaxEdges), Dict),
    maplist(dsc_node, Nodes, NodeDicts),
    maplist(dsc_edge, Edges, EdgeDicts),
    same(Dict, _{nodes: NodeDicts, edges: EdgeDicts, truncated: Truncated}).

:- begin_tests(discovery_graph).

test(both_directions_one_layer) :-
    dsc_kb((
        dsc_basic,
        dsc_graph(['REQ-A'], [], both, 1, [], 100, 100,
                  ['REQ-A'-req-open, 'SCN-A'-scenario-active, 'SYM-P'-symbol-active, 'TEST-E2E'-test-passing],
                  ['SYM-P'-implements-'REQ-A', 'REQ-A'-specified_by-'SCN-A', 'REQ-A'-verified_by-'TEST-E2E'],
                  false)
    )).

test(an_edge_between_two_seeds_is_kept_once) :-
    dsc_kb((
        dsc_basic,
        dsc_graph(['SCN-A', 'REQ-A', 'SCN-A'], [], both, 1, [], 100, 100,
                  ['REQ-A'-req-open, 'SCN-A'-scenario-active, 'SYM-P'-symbol-active,
                   'TEST-E2E'-test-passing, 'TEST-FAIL'-test-failing],
                  ['SYM-P'-implements-'REQ-A', 'REQ-A'-specified_by-'SCN-A',
                   'TEST-FAIL'-validates-'SCN-A', 'REQ-A'-verified_by-'TEST-E2E'],
                  false)
    )).

test(outgoing_with_relationship_and_type_filters) :-
    dsc_kb((
        dsc_basic,
        dsc_graph(['REQ-A'], [verified_by], outgoing, 2, [test, req], 100, 100,
                  ['REQ-A'-req-open, 'TEST-E2E'-test-passing],
                  ['REQ-A'-verified_by-'TEST-E2E'],
                  false),
        dsc_graph(['REQ-A'], [], outgoing, 2, [req], 100, 100,
                  ['REQ-A'-req-open], [], false)
    )).

test(incoming_two_layers) :-
    dsc_kb((
        dsc_basic,
        dsc_graph(['SCN-A'], [], incoming, 2, [], 100, 100,
                  ['REQ-A'-req-open, 'SCN-A'-scenario-active, 'SYM-P'-symbol-active, 'TEST-FAIL'-test-failing],
                  ['SYM-P'-implements-'REQ-A', 'REQ-A'-specified_by-'SCN-A', 'TEST-FAIL'-validates-'SCN-A'],
                  false)
    )).

test(a_long_outgoing_chain_stops_when_the_frontier_is_empty) :-
    dsc_kb((
        dsc_basic,
        dsc_graph(['SYM-P'], [implements, specified_by], outgoing, 5, [], 100, 100,
                  ['REQ-A'-req-open, 'SCN-A'-scenario-active, 'SYM-P'-symbol-active],
                  ['SYM-P'-implements-'REQ-A', 'REQ-A'-specified_by-'SCN-A'],
                  false)
    )).

test(depth_zero_returns_the_seeds) :-
    dsc_kb((
        dsc_basic,
        dsc_graph(['REQ-A'], [], both, 0, [], 100, 100, ['REQ-A'-req-open], [], false)
    )).

test(node_limit_truncates_while_collecting) :-
    dsc_kb((
        dsc_basic,
        dsc_graph(['REQ-A'], [], both, 3, [], 3, 100,
                  ['REQ-A'-req-open, 'SCN-A'-scenario-active, 'SYM-P'-symbol-active],
                  ['SYM-P'-implements-'REQ-A', 'REQ-A'-specified_by-'SCN-A'],
                  true)
    )).

test(edge_limit_truncates_while_collecting) :-
    dsc_kb((
        dsc_basic,
        dsc_graph(['REQ-A'], [], both, 3, [], 100, 2,
                  ['REQ-A'-req-open, 'SCN-A'-scenario-active, 'SYM-P'-symbol-active],
                  ['SYM-P'-implements-'REQ-A', 'REQ-A'-specified_by-'SCN-A'],
                  true)
    )).

test(edge_limit_reached_by_an_edge_to_a_seen_node) :-
    dsc_kb((
        dsc_basic,
        dsc_graph(['SCN-A', 'REQ-A'], [specified_by, verified_by], both, 3, [], 100, 1,
                  ['REQ-A'-req-open, 'SCN-A'-scenario-active],
                  ['REQ-A'-specified_by-'SCN-A'],
                  true)
    )).

test(limits_already_reached_by_the_seeds) :-
    dsc_kb((
        dsc_basic,
        dsc_graph(['REQ-A', 'TEST-E2E'], [], both, 3, [], 1, 100,
                  ['REQ-A'-req-open, 'TEST-E2E'-test-passing], [], true),
        dsc_graph(['REQ-A'], [], both, 3, [], 100, 0, ['REQ-A'-req-open], [], true)
    )).

test(a_limit_hit_in_the_last_layer_still_truncates) :-
    dsc_kb((
        dsc_basic,
        dsc_graph(['REQ-A'], [], both, 1, [], 3, 100,
                  ['REQ-A'-req-open, 'SCN-A'-scenario-active, 'SYM-P'-symbol-active],
                  ['SYM-P'-implements-'REQ-A', 'REQ-A'-specified_by-'SCN-A'],
                  true)
    )).

test(unknown_seeds_and_dangling_links_are_left_out) :-
    dsc_kb((
        dsc_basic,
        pf_raw_rel(depends_on, 'REQ-A', 'REQ-GONE'),
        dsc_graph(['NOPE'], [], both, 3, [], 100, 100, [], [], false),
        dsc_graph(['REQ-A'], [depends_on], outgoing, 1, [], 100, 100, ['REQ-A'-req-open], [], false)
    )).

test(bfs_layers_is_deterministic) :-
    dsc_kb((
        dsc_basic,
        first_answer_is_last(discovery:bfs_layers(['REQ-A'], ['REQ-A'], [], [], both, 2, 100, 100, _, _, _)),
        first_answer_is_last(discovery:bfs_layers([], [], [], [], both, 2, 100, 100, _, _, _)),
        first_answer_is_last(discovery:bfs_layers([x], [x], [], [], both, 0, 100, 100, _, _, _))
    )).

test(collect_pairs_reports_where_it_stopped) :-
    once(discovery:collect_pairs([e1-a, e2-b, e3-c], [s], [], 3, 100, F1, N1, E1, H1)),
    [F1, N1, E1, H1] == [[a, b], [s, a, b], [e1, e2], true],
    once(discovery:collect_pairs([e1-s, e2-a], [s], [e1], 100, 100, F2, N2, E2, H2)),
    [F2, N2, E2, H2] == [[a], [s, a], [e1, e2], false],
    once(discovery:collect_pairs([e1-s], [s], [], 100, 100, F3, N3, E3, H3)),
    [F3, N3, E3, H3] == [[], [s], [e1], false],
    first_answer_is_last(discovery:collect_pairs([e1-a, e2-b], [s], [], 2, 100, _, _, _, _)).

test(edge_step_and_relationship_filter) :-
    dsc_kb((
        dsc_basic,
        findall(E-N, discovery:edge_step('SCN-A', [], incoming, E, N), In),
        In == [edge(specified_by, 'REQ-A', 'SCN-A')-'REQ-A', edge(validates, 'TEST-FAIL', 'SCN-A')-'TEST-FAIL'],
        findall(E-N, discovery:edge_step('SCN-A', [validates], both, E, N), Both),
        Both == [edge(validates, 'TEST-FAIL', 'SCN-A')-'TEST-FAIL'],
        once(discovery:relationship_allowed([], implements)),
        \+ discovery:relationship_allowed([], not_a_relationship),
        \+ discovery:relationship_allowed([implements], verified_by)
    )).

test(edge_kept_needs_both_ends) :-
    once(discovery:edge_kept([a, b], edge(t, a, b))),
    \+ discovery:edge_kept([a], edge(t, a, b)),
    \+ discovery:edge_kept([b], edge(t, a, b)),
    once(discovery:edge_dict(edge(t, a, b), D)),
    same(D, _{type: t, from: a, to: b}).

:- end_tests(discovery_graph).

% --- gap rows --------------------------------------------------------------------

%% dsc_counts(+NonZero, -Counts)
% Every relationship type counted 0 except the NonZero Type-Count pairs.
dsc_counts(NonZero, Counts) :-
    findall(Type-Count,
            (   discovery:relationship_type(Type),
                (   memberchk(Type-Count0, NonZero) -> Count = Count0 ; Count = 0 )
            ),
            Pairs),
    dict_pairs(Counts, _, Pairs).

dsc_gap_row(Id-Type-Status-Source-Missing-Present-NonZero, Row) :-
    dsc_counts(NonZero, Counts),
    Row = _{id: Id, type: Type, title: 'Fixture entity', status: Status, source: Source,
            missingRelationships: Missing, presentRelationships: Present, relationshipCounts: Counts}.

dsc_gaps(Type, Missing, Present, Tags, Source, Limit, Offset, Count, Stubs, Specs) :-
    dsc_json(find_gaps_json(Type, Missing, Present, Tags, Source, Limit, Offset), Dict),
    maplist(dsc_gap_row, Specs, Rows),
    same(Dict, _{rows: Rows, count: Count, summary: _{total: Count, provenanceStubs: Stubs}}).

dsc_gap_fixture :-
    dsc_basic,
    pf_entity(fact, 'F-STUB', [fact_kind=meta, tags=['bootstrap:provenance-stub'], source="src/stub.ts"]),
    pf_entity(fact, 'F-OBS', [fact_kind=observation, tags=[alpha], source="src/obs.ts"]).

:- begin_tests(discovery_gaps).

test(missing_relationship_rows_hide_stubs_but_count_them) :-
    dsc_kb((
        dsc_gap_fixture,
        dsc_gaps(none, [verified_by], [], [], none, 10, 0, 5, 1, [
            'F-OBS'-fact-active-'src/obs.ts'-[verified_by]-[]-[],
            'REQ-B'-req-open-'test://proof_fixture.pl'-[verified_by]-[]-[],
            'SYM-P'-symbol-active-'test://proof_fixture.pl'-[verified_by]-[]-[covered_by-1, implements-1],
            'SYM-T'-symbol-active-'test://proof_fixture.pl'-[verified_by]-[]-[executable_for-1],
            'TEST-UNIT'-test-passing-'test://proof_fixture.pl'-[verified_by]-[]-[covered_by-1, executable_for-1]
        ])
    )).

test(present_relationship_rows_with_a_tag) :-
    dsc_kb((
        dsc_gap_fixture,
        dsc_gaps(req, [], [verified_by], [alpha], none, 10, 0, 1, 0, [
            'REQ-A'-req-open-'test://proof_fixture.pl'-[]-[verified_by]-[implements-1, specified_by-1, verified_by-1]
        ])
    )).

test(stub_rows_appear_when_their_tag_is_asked_for) :-
    dsc_kb((
        dsc_gap_fixture,
        dsc_gaps(fact, [], [], ['bootstrap:provenance-stub'], stub, 10, 0, 1, 1, [
            'F-STUB'-fact-active-'src/stub.ts'-[]-[]-[]
        ]),
        dsc_gaps(fact, [], [], [alpha], none, 10, 0, 1, 0, [
            'F-OBS'-fact-active-'src/obs.ts'-[]-[]-[]
        ])
    )).

test(gap_rows_are_paged_after_counting) :-
    dsc_kb((
        dsc_gap_fixture,
        dsc_gaps(symbol, [], [], [], none, 1, 1, 2, 0, [
            'SYM-T'-symbol-active-'test://proof_fixture.pl'-[]-[]-[executable_for-1]
        ])
    )).

:- end_tests(discovery_gaps).

% --- typed fact queries ---------------------------------------------------------------

dsc_ask_fixture :-
    pf_entity(fact, 'F-ADMIN-READ', [fact_kind=predicate, predicate_name="permission_rule", predicate_namespace="default",
        predicate_args=["admin", "read", "report", "allow"], polarity=assert,
        canonical_key="permission_rule(admin,read,report,allow)",
        claim_key="CLAIM-AAAA000000000001", claim_text="Admins read reports", title="Admin read"]),
    pf_entity(req, 'REQ-ADMIN', [status=open]),
    fixture_rel(requires_predicate, 'REQ-ADMIN', 'F-ADMIN-READ'),
    pf_entity(fact, 'F-VIEWER-DEL', [fact_kind=predicate, predicate_name="permission_rule",
        predicate_args=["viewer", "delete", "report", "allow"], polarity=deny]),
    pf_entity(req, 'REQ-OLD', [status=open]),
    pf_entity(req, 'REQ-NEW', [status=open]),
    fixture_rel(supersedes, 'REQ-NEW', 'REQ-OLD'),
    fixture_rel(requires_predicate, 'REQ-OLD', 'F-VIEWER-DEL'),
    pf_entity(fact, 'F-SCHEMA-ROLE', [fact_kind=predicate_schema, predicate_name="has_role", predicate_namespace="access",
        predicate_arity=2, argument_names=["user", "role"], argument_types=["user", "role"], key_arguments=["user"],
        argument_constants="{\"role\":[\"admin\",\"auditor\"]}", examples=["has_role(alice,admin)"]]),
    pf_entity(fact, 'F-ALICE-ADMIN', [fact_kind=predicate, predicate_name="has_role", predicate_namespace="access",
        predicate_args=["alice", "admin"], canonical_key="has_role(alice,admin)"]),
    pf_entity(fact, 'F-BOB-AUDITOR', [fact_kind=predicate, predicate_name="has_role", predicate_namespace="access",
        predicate_args=["bob", "auditor"]]),
    pf_entity(fact, 'F-SUBJ', [fact_kind=subject, subject_key="user.roles"]),
    pf_entity(fact, 'F-LIMIT', [fact_kind=property_value, subject_key="user.roles", property_key="max_roles",
        operator=lte, value_type=int, value_int=2, unit="count", scope="tenant", claim_text="At most two"]),
    pf_entity(fact, 'F-NAME', [fact_kind=property_value, subject_key="user.roles", property_key="label", value_string="Roles"]),
    pf_entity(req, 'REQ-LIMIT', [status=open]),
    fixture_rel(requires_property, 'REQ-LIMIT', 'F-LIMIT').

dsc_permission_schema(_{
    argumentConstants: null,
    argumentNames: [actor, action, resource, decision],
    argumentTypes: [actor, action, resource, decision],
    arity: 4, builtin: true, decisionArgument: decision, examples: [], factCount: 2,
    id: 'FACT-SCHEMA-PERMISSION-RULE', keyArguments: [actor, action, resource],
    name: permission_rule, namespace: default, stored: false
}).

dsc_role_schema(_{
    argumentConstants: _{role: [admin, auditor]},
    argumentNames: [user, role], argumentTypes: [user, role],
    arity: 2, builtin: false, decisionArgument: null, examples: ['has_role(alice,admin)'], factCount: 2,
    id: 'F-SCHEMA-ROLE', keyArguments: [user], name: has_role, namespace: access, stored: true
}).

dsc_admin_read_row(_{
    args: [admin, read, report, allow],
    arguments: _{action: read, actor: admin, decision: allow, resource: report},
    canonicalKey: 'permission_rule(admin,read,report,allow)', claimText: 'Admins read reports',
    effect: allow, id: 'F-ADMIN-READ', name: permission_rule, namespace: default, polarity: assert,
    requirements: [_{current: true, id: 'REQ-ADMIN', status: open}],
    status: active, title: 'Admin read', type: fact
}).

dsc_alice_row(_{
    args: [alice, admin], arguments: _{role: admin, user: alice},
    canonicalKey: 'has_role(alice,admin)', claimText: '', effect: null, id: 'F-ALICE-ADMIN',
    name: has_role, namespace: access, polarity: assert, requirements: [],
    status: active, title: 'Fixture entity', type: fact
}).

:- begin_tests(discovery_ask_predicate).

test(predicate_query_over_a_builtin_decision_predicate) :-
    dsc_kb((
        dsc_ask_fixture,
        dsc_json(ask_predicate_json(none, permission_rule, [admin, '$any', '$any', '$any'], none, all, none, 10, 0), Dict),
        dsc_permission_schema(Schema),
        dsc_admin_read_row(Row),
        same(Dict, _{
            count: 1, distinct: null, mode: predicate,
            predicate: _{args: [admin, null, null, null], name: permission_rule, namespace: null},
            rows: [Row], schema: Schema, suggestions: null, warnings: []
        })
    )).

test(predicate_query_reports_a_denied_allow_and_superseded_requirements) :-
    dsc_kb((
        dsc_ask_fixture,
        dsc_json(ask_predicate_json(default, permission_rule, [viewer, '$any', '$any', '$any'], deny, all, none, 10, 0), Dict),
        get_dict(rows, Dict, [Row]),
        get_dict(effect, Row, Effect), Effect == deny,
        get_dict(requirements, Row, Reqs),
        same(Reqs, [_{current: false, id: 'REQ-OLD', status: open}]),
        dsc_json(ask_predicate_json(default, permission_rule, [viewer, '$any', '$any', '$any'], assert, all, none, 10, 0), None),
        get_dict(count, None, 0),
        dsc_json(ask_predicate_json(none, permission_rule, ['$any', '$any', '$any', '$any'], none, current_requirements, none, 10, 0), Current),
        get_dict(rows, Current, CurrentRows),
        dsc_ids(CurrentRows, CurrentIds),
        CurrentIds == ['F-ADMIN-READ']
    )).

test(predicate_query_named_with_a_schema_and_distinct_values) :-
    dsc_kb((
        dsc_ask_fixture,
        dsc_json(ask_predicate_json(access, has_role, where([role=admin]), none, all, role, 10, 0), Dict),
        dsc_role_schema(Schema),
        dsc_alice_row(Row),
        same(Dict, _{
            count: 1, distinct: _{argument: role, values: [_{count: 1, value: admin}]}, mode: predicate,
            predicate: _{args: _{role: admin}, name: has_role, namespace: access},
            rows: [Row], schema: Schema, suggestions: null, warnings: []
        })
    )).

test(predicate_query_with_no_match_suggests_values) :-
    dsc_kb((
        dsc_ask_fixture,
        dsc_json(ask_predicate_json(none, has_role, where([role=nobody]), none, all, none, 10, 0), Dict),
        dsc_role_schema(Schema),
        same(Dict, _{
            count: 0, distinct: null, mode: predicate,
            predicate: _{args: _{role: nobody}, name: has_role, namespace: null},
            rows: [], schema: Schema, suggestions: _{role: [admin, auditor]}, warnings: []
        })
    )).

test(predicate_query_pages_rows_but_counts_them_all) :-
    dsc_kb((
        dsc_ask_fixture,
        dsc_json(ask_predicate_json(access, has_role, [], none, all, none, 1, 1), Dict),
        get_dict(count, Dict, 2),
        get_dict(rows, Dict, Rows),
        dsc_ids(Rows, Ids),
        Ids == ['F-BOB-AUDITOR']
    )).

test(predicate_query_warnings_drop_every_row) :-
    dsc_kb((
        dsc_ask_fixture,
        dsc_json(ask_predicate_json(access, has_role, [alice], none, all, colour, 10, 0), Dict),
        get_dict(rows, Dict, []),
        get_dict(count, Dict, 0),
        get_dict(warnings, Dict, Warnings),
        Warnings == ['positional args need one entry per argument (2 declared, 1 given); use null for any value or name them with where',
                     'distinct argument \'colour\' is not a declared argument of this predicate; no schema names it']
    )).

test(predicate_query_without_a_schema) :-
    dsc_kb((
        dsc_ask_fixture,
        dsc_json(ask_predicate_json(none, unknown_pred, [], none, all, none, 10, 0), Dict),
        same(Dict, _{
            count: 0, distinct: null, mode: predicate,
            predicate: _{args: [], name: unknown_pred, namespace: null},
            rows: [], schema: null, suggestions: null, warnings: []
        })
    )).

test(suggestions_need_a_schema_and_named_arguments) :-
    dsc_kb((
        dsc_ask_fixture,
        once(discovery:ask_suggestions(0, _, has_role, where([role=x]), [user, role], S1)),
        same(S1, _{role: [admin, auditor]}),
        once(discovery:ask_suggestions(1, _, has_role, where([role=x]), [user, role], S2)), S2 == null,
        once(discovery:ask_suggestions(0, _, has_role, where([]), [user, role], S3)), S3 == null,
        once(discovery:ask_suggestions(0, _, has_role, where([role=x]), none, S4)), S4 == null,
        once(discovery:ask_suggestions(0, _, has_role, where([colour=x]), [user, role], S5)), S5 == null,
        once(discovery:ask_suggestions(0, _, has_role, [x, y], [user, role], S6)), S6 == null,
        first_answer_is_last(discovery:ask_suggestions(0, _, has_role, where([role=x]), [user, role], _))
    )).

test(property_query_lists_typed_rows_and_subject_facts) :-
    dsc_kb((
        dsc_ask_fixture,
        dsc_json(ask_property_json('user.roles', none, all, 10, 0), Dict),
        same(Dict, _{
            count: 2, mode: property,
            property: _{propertyKey: null, subjectKey: 'user.roles'},
            rows: [
                _{canonicalKey: '', claimText: 'At most two', id: 'F-LIMIT', operator: lte, polarity: require,
                  propertyKey: max_roles, requirements: [_{current: true, id: 'REQ-LIMIT', status: open}],
                  scope: tenant, status: active, subjectKey: 'user.roles', title: 'Fixture entity', type: fact,
                  unit: count, value: 2, valueType: int},
                _{canonicalKey: '', claimText: '', id: 'F-NAME', operator: eq, polarity: require,
                  propertyKey: label, requirements: [], scope: '', status: active, subjectKey: 'user.roles',
                  title: 'Fixture entity', type: fact, unit: '', value: 'Roles', valueType: string}
            ],
            subjectFacts: ['F-SUBJ'], warnings: []
        })
    )).

test(property_query_filters_by_key_scope_and_page) :-
    dsc_kb((
        dsc_ask_fixture,
        dsc_json(ask_property_json("user.roles", label, all, 10, 0), Label),
        get_dict(rows, Label, LabelRows), dsc_ids(LabelRows, LabelIds), LabelIds == ['F-NAME'],
        get_dict(property, Label, LabelProperty),
        same(LabelProperty, _{propertyKey: label, subjectKey: 'user.roles'}),
        dsc_json(ask_property_json('user.roles', none, current_requirements, 10, 0), Current),
        get_dict(rows, Current, CurrentRows), dsc_ids(CurrentRows, CurrentIds), CurrentIds == ['F-LIMIT'],
        dsc_json(ask_property_json('user.roles', none, all, 1, 1), Paged),
        get_dict(count, Paged, 2),
        get_dict(rows, Paged, PagedRows), dsc_ids(PagedRows, PagedIds), PagedIds == ['F-NAME']
    )).

test(schema_catalog_lists_project_and_builtin_schemas) :-
    dsc_kb((
        dsc_ask_fixture,
        dsc_json(ask_schemas_json(none, none, 10, 0), Dict),
        dsc_role_schema(Role),
        dsc_permission_schema(Permission),
        same(Dict, _{count: 2, mode: schemas, rows: [Role, Permission], warnings: []}),
        dsc_json(ask_schemas_json(default, none, 10, 0), Default),
        same(Default, _{count: 1, mode: schemas, rows: [Permission], warnings: []}),
        dsc_json(ask_schemas_json(none, has_role, 10, 0), Named),
        same(Named, _{count: 1, mode: schemas, rows: [Role], warnings: []}),
        dsc_json(ask_schemas_json(none, none, 1, 1), Paged),
        same(Paged, _{count: 2, mode: schemas, rows: [Permission], warnings: []})
    )).

test(a_project_schema_replaces_the_builtin_one) :-
    dsc_kb((
        pf_entity(fact, 'F-SCHEMA-PERM', [fact_kind=predicate_schema, predicate_name="permission_rule",
            predicate_arity=4, argument_names=["who", "what", "on", "decision"],
            argument_types=["user", "verb", "resource", "decision"], key_arguments=["who", "what", "on"],
            argument_constants="not json", examples="none"]),
        dsc_json(ask_schemas_json(none, none, 10, 0), Dict),
        same(Dict, _{count: 1, mode: schemas, warnings: [], rows: [
            _{argumentConstants: null, argumentNames: [who, what, on, decision],
              argumentTypes: [user, verb, resource, decision], arity: 4, builtin: false,
              decisionArgument: decision, examples: [], factCount: 0, id: 'F-SCHEMA-PERM',
              keyArguments: [who, what, on], name: permission_rule, namespace: default, stored: true}
        ]})
    )).

test(schema_row_without_optional_fields) :-
    dsc_kb((
        pf_entity(fact, 'F-SCHEMA-BARE', [fact_kind=predicate_schema, predicate_name="tagged",
            predicate_arity=1, argument_names=["item"], argument_types=["item"]]),
        dsc_json(ask_schemas_json(none, none, 10, 0), Dict),
        get_dict(rows, Dict, [_, Row]),
        same(Row, _{argumentConstants: null, argumentNames: [item], argumentTypes: [item], arity: 1,
                    builtin: false, decisionArgument: null, examples: [], factCount: 0,
                    id: 'F-SCHEMA-BARE', keyArguments: [], name: tagged, namespace: default, stored: true})
    )).

test(fact_kind_listing_carries_typed_fields) :-
    dsc_kb((
        dsc_ask_fixture,
        dsc_json(ask_fact_kind_json(property_value, 10, 0), Dict),
        same(Dict, _{count: 2, factKind: property_value, mode: fact_kind, warnings: [], rows: [
            _{canonicalKey: '', claimText: 'At most two', factKind: property_value, id: 'F-LIMIT', operator: lte,
              property_key: max_roles, status: active, subject_key: 'user.roles', title: 'Fixture entity',
              type: fact, unit: count, value: 2, value_type: int},
            _{canonicalKey: '', claimText: '', factKind: property_value, id: 'F-NAME', property_key: label,
              status: active, subject_key: 'user.roles', title: 'Fixture entity', type: fact, value: 'Roles'}
        ]}),
        dsc_json(ask_fact_kind_json(predicate, 2, 1), Predicates),
        same(Predicates, _{count: 4, factKind: predicate, mode: fact_kind, warnings: [], rows: [
            _{canonicalKey: 'has_role(alice,admin)', claimText: '', factKind: predicate, id: 'F-ALICE-ADMIN',
              predicate_args: [alice, admin], predicate_name: has_role, predicate_namespace: access,
              status: active, title: 'Fixture entity', type: fact},
            _{canonicalKey: '', claimText: '', factKind: predicate, id: 'F-BOB-AUDITOR',
              predicate_args: [bob, auditor], predicate_name: has_role, predicate_namespace: access,
              status: active, title: 'Fixture entity', type: fact}
        ]}),
        dsc_json(ask_fact_kind_json(subject, 10, 0), Subjects),
        get_dict(rows, Subjects, [Subject]),
        same(Subject, _{canonicalKey: '', claimText: '', factKind: subject, id: 'F-SUBJ', status: active,
                        subject_key: 'user.roles', title: 'Fixture entity', type: fact})
    )).

test(fact_requirements_and_text) :-
    dsc_kb((
        dsc_ask_fixture,
        once(discovery:ask_fact_requirements('F-VIEWER-DEL', requires_predicate, Reqs, HasCurrent)),
        same(Reqs, [_{id: 'REQ-OLD', status: open, current: false}]),
        HasCurrent == false,
        once(discovery:ask_requirement_dict('REQ-NOPE', Missing)),
        same(Missing, _{id: 'REQ-NOPE', status: '', current: false}),
        pf_entity(fact, 'F-FULL', [fact_kind=meta, title="T", status=open, claim_text="C", canonical_key="K"]),
        once(discovery:ask_fact_text('F-FULL', T, S, C, K)),
        [T, S, C, K] == ['T', open, 'C', 'K'],
        pf_raw_props('F-BARE', fact, [fact_kind=meta]),
        once(discovery:ask_fact_text('F-BARE', T2, S2, C2, K2)),
        [T2, S2, C2, K2] == ['', '', '', '']
    )).

test(effect_of_decision_predicates) :-
    dsc_kb((
        once(discovery:ask_effect(default, permission_rule, [a, b, c, allow], deny, E1)), E1 == deny,
        once(discovery:ask_effect(default, permission_rule, [a, b, c, allow], assert, E2)), E2 == allow,
        first_answer_is_last(discovery:ask_effect(default, permission_rule, [a, b, c, deny], assert, _)),
        once(discovery:ask_effect(default, permission_rule, [a, b, c, maybe], assert, E3)), E3 == null,
        once(discovery:ask_effect(default, other, [a], assert, E4)), E4 == null
    )).

test(schema_dict_lookup_order) :-
    dsc_kb((
        dsc_ask_fixture,
        once(discovery:ask_schema_dict(access, has_role, D1, N1)),
        get_dict(id, D1, 'F-SCHEMA-ROLE'), N1 == [user, role],
        once(discovery:ask_schema_dict(default, permission_rule, D2, N2)),
        get_dict(id, D2, 'FACT-SCHEMA-PERMISSION-RULE'), N2 == [actor, action, resource, decision],
        first_answer_is_last(discovery:ask_schema_dict(default, permission_rule, _, _)),
        once(discovery:ask_schema_dict(default, nothing, D3, N3)), D3 == null, N3 == none
    )).

:- end_tests(discovery_ask_predicate).

% --- coverage reports ------------------------------------------------------------------

dsc_cov_fixture :-
    pf_entity(req, 'REQ-A', [priority=must, tags=[alpha], status=open]),
    pf_entity(req, 'REQ-B', [priority=should, tags=[beta], status=open]),
    pf_entity(req, 'REQ-OLD', [status=deprecated, tags=[beta]]),
    pf_entity(test, 'TEST-E2E', [status=passing, verification_scope=end_to_end, proof_contract="{}"]),
    pf_entity(test, 'TEST-UNIT', [status=passing, verification_scope=unit, proof_contract="{}"]),
    pf_entity(test, 'TEST-FAIL', [status=failing]),
    pf_entity(scenario, 'SCN-A', []),
    pf_entity(symbol, 'SYM-P', []),
    pf_entity(symbol, 'SYM-T', []),
    fixture_rel(verified_by, 'REQ-A', 'TEST-E2E'),
    fixture_rel(specified_by, 'REQ-A', 'SCN-A'),
    fixture_rel(validates, 'TEST-FAIL', 'SCN-A'),
    fixture_rel(implements, 'SYM-P', 'REQ-A'),
    fixture_rel(covered_by, 'SYM-P', 'TEST-UNIT'),
    fixture_rel(executable_for, 'SYM-T', 'TEST-UNIT').

dsc_base('REQ-A', _{coverageDepth: direct_passing_e2e, coverageStatus: fully_covered, coverage_depth: direct_passing_e2e,
    directSymbolCount: 1, directTests: ['TEST-E2E'], evaluated: true, gaps: [], id: 'REQ-A', priority: must,
    scenarioCount: 1, scenarioTests: ['TEST-FAIL'], source: 'test://proof_fixture.pl', status: open, testCount: 2,
    testStatuses: [failing, passing], title: 'Fixture entity', transitiveSymbolCount: 1, type: req,
    verificationScopes: [end_to_end, unknown]}).
dsc_base('REQ-B', _{coverageDepth: no_test_evidence, coverageStatus: not_applicable, coverage_depth: no_test_evidence,
    directSymbolCount: 0, directTests: [], evaluated: false, gaps: [], id: 'REQ-B', priority: should,
    scenarioCount: 0, scenarioTests: [], source: 'test://proof_fixture.pl', status: open, testCount: 0,
    testStatuses: [], title: 'Fixture entity', transitiveSymbolCount: 0, type: req, verificationScopes: []}).
dsc_base('REQ-OLD', _{coverageDepth: no_test_evidence, coverageStatus: not_applicable, coverage_depth: no_test_evidence,
    directSymbolCount: 0, directTests: [], evaluated: false, gaps: [], id: 'REQ-OLD', priority: '',
    scenarioCount: 0, scenarioTests: [], source: 'test://proof_fixture.pl', status: deprecated, testCount: 0,
    testStatuses: [], title: 'Fixture entity', transitiveSymbolCount: 0, type: req, verificationScopes: []}).

dsc_ctx(Snapshot-CheckedAt-MaxAge-Mode-Bindings, Context) :-
    requirement_proof_context(Snapshot, CheckedAt, MaxAge, Mode, Bindings, Context).

dsc_default_params(unknown-'1970-01-01T00:00:00Z'-604800-strict_snapshot-_{}).

dsc_proof(Id, Params, Proof) :-
    dsc_ctx(Params, Context),
    kb_entity(Id, req, Props),
    requirement_proof(Id, Props, Context, Proof).

%% dsc_req_row(+Params, +Id, -Row)
% The expected coverage row of Id: its base fields under its proof.
dsc_req_row(Params, Id, Row) :-
    dsc_base(Id, Base),
    dsc_proof(Id, Params, Proof),
    put_dict(Proof, Base, Row0),
    dsc_roundtrip(Row0, Row).

dsc_req_rows(Params, Ids, Rows) :-
    maplist(dsc_req_row(Params), Ids, Rows).

dsc_all_summary(_{evaluated: 1, evidenceFloors: _{below: 2, met: 0, pendingReproof: 0},
    evidenceLevels: _{asserted: 3, proved: 0, tested: 0, unverified: 0}, fullyCovered: 1,
    linkCoverageScope: priority_must, missingScenario: 0, missingScenarioAndTest: 0, missingTest: 0,
    notApplicable: 2, proofClaims: _{applicable: 0, attested: 0, proved: 0, tested: 0, unresolved: 0},
    proofMissing: 2, proofNotApplicable: 1, proofTested: 0, proofUnresolved: 0, total: 3, uncovered: 0}).

dsc_beta_summary(_{evaluated: 0, evidenceFloors: _{below: 1, met: 0, pendingReproof: 0},
    evidenceLevels: _{asserted: 2, proved: 0, tested: 0, unverified: 0}, fullyCovered: 0,
    linkCoverageScope: priority_must, missingScenario: 0, missingScenarioAndTest: 0, missingTest: 0,
    notApplicable: 2, proofClaims: _{applicable: 0, attested: 0, proved: 0, tested: 0, unresolved: 0},
    proofMissing: 1, proofNotApplicable: 1, proofTested: 0, proofUnresolved: 0, total: 2, uncovered: 0}).

dsc_report(Goal, Summary, Rows) :-
    dsc_json(Goal, Dict),
    same(Dict, _{summary: Summary, rows: Rows}).

:- begin_tests(discovery_coverage_reports).

test(requirement_report_with_default_proof_parameters) :-
    dsc_kb((
        dsc_cov_fixture,
        dsc_default_params(Params),
        dsc_req_rows(Params, ['REQ-A', 'REQ-B', 'REQ-OLD'], Rows),
        dsc_all_summary(Summary),
        dsc_report(coverage_report_json(req, [], true, false, 10, 0), Summary, Rows)
    )).

test(requirement_report_filters_passing_and_tags_but_summarises_all) :-
    dsc_kb((
        dsc_cov_fixture,
        dsc_default_params(Params),
        dsc_req_rows(Params, ['REQ-B'], Rows),
        dsc_beta_summary(Summary),
        dsc_report(coverage_report_json(req, [beta], false, true, 10, 0), Summary, Rows)
    )).

test(requirement_report_pages_rows) :-
    dsc_kb((
        dsc_cov_fixture,
        dsc_default_params(Params),
        dsc_req_rows(Params, ['REQ-B'], Rows),
        dsc_all_summary(Summary),
        dsc_report(coverage_report_json(req, [], true, false, 1, 1), Summary, Rows)
    )).

test(requirement_report_with_explicit_proof_parameters) :-
    dsc_kb((
        dsc_cov_fixture,
        Params = abc-'2026-05-02T00:00:00Z'-100-strict_snapshot-_{},
        dsc_req_rows(Params, ['REQ-A'], Rows),
        dsc_report(coverage_report_json(req, [alpha], true, false, 10, 0, abc, '2026-05-02T00:00:00Z', 100),
                   _{evaluated: 1, evidenceFloors: _{below: 1, met: 0, pendingReproof: 0},
                     evidenceLevels: _{asserted: 1, proved: 0, tested: 0, unverified: 0}, fullyCovered: 1,
                     linkCoverageScope: priority_must, missingScenario: 0, missingScenarioAndTest: 0, missingTest: 0,
                     notApplicable: 0, proofClaims: _{applicable: 0, attested: 0, proved: 0, tested: 0, unresolved: 0},
                     proofMissing: 1, proofNotApplicable: 0, proofTested: 0, proofUnresolved: 0, total: 1, uncovered: 0},
                   Rows),
        true
    )).

test(requirement_report_under_a_binding_mode) :-
    dsc_kb((
        dsc_cov_fixture,
        Params = abc-'2026-05-02T00:00:00Z'-100-per_contract-_{'TEST-E2E': h},
        dsc_req_rows(Params, ['REQ-A', 'REQ-B'], Rows),
        dsc_all_summary(Summary),
        dsc_report(coverage_report_json(req, [], false, per_contract, _{'TEST-E2E': h}, false, 10, 0,
                                        abc, '2026-05-02T00:00:00Z', 100), Summary, Rows)
    )).

test(status_filter_selects_rows_and_ignores_include_passing) :-
    dsc_kb((
        dsc_cov_fixture,
        dsc_default_params(Params),
        dsc_req_rows(Params, ['REQ-OLD'], Rows),
        dsc_all_summary(Summary),
        dsc_report(coverage_report_json(req, [], false, [not_applicable], false, 10, 0,
                                        unknown, '1970-01-01T00:00:00Z', 604800), Summary, Rows),
        dsc_req_rows(Params, ['REQ-A', 'REQ-B', 'REQ-OLD'], AllRows),
        dsc_report(coverage_report_json(req, [], true, [], false, 10, 0,
                                        unknown, '1970-01-01T00:00:00Z', 604800), Summary, AllRows)
    )).

test(status_filter_under_a_binding_mode) :-
    dsc_kb((
        dsc_cov_fixture,
        Params = abc-'2026-05-02T00:00:00Z'-100-per_contract-_{'TEST-E2E': h},
        dsc_req_rows(Params, ['REQ-A', 'REQ-B'], Rows),
        dsc_all_summary(Summary),
        dsc_report(coverage_report_json(req, [], false, [missing], per_contract, _{'TEST-E2E': h}, false, 10, 0,
                                        abc, '2026-05-02T00:00:00Z', 100), Summary, Rows)
    )).

dsc_symbol_fixture :-
    pf_entity(req, 'REQ-A', [priority=must, status=open]),
    pf_entity(test, 'TEST-E2E', [status=passing, verification_scope=end_to_end]),
    pf_entity(scenario, 'SCN-A', []),
    pf_raw_rel(specified_by, 'REQ-A', 'SCN-A'),
    pf_raw_rel(validates, 'TEST-E2E', 'SCN-A'),
    pf_entity(symbol, 'SYM-COV', [tags=[core]]),
    pf_raw_rel(implements, 'SYM-COV', 'REQ-A'),
    pf_raw_rel(covered_by, 'SYM-COV', 'TEST-E2E'),
    pf_entity(symbol, 'SYM-UNC', []),
    pf_entity(symbol, 'SYM-EXE', []),
    pf_raw_rel(executable_for, 'SYM-EXE', 'TEST-E2E'),
    pf_entity(symbol, 'SYM-MIX', [tags=[core]]),
    pf_raw_rel(executable_for, 'SYM-MIX', 'TEST-E2E'),
    pf_raw_rel(implements, 'SYM-MIX', 'REQ-A').

dsc_symbol_row(Id-Role-Status-Gaps-Reqs-Tests-Exec,
               _{coverageStatus: Status, directRequirementCount: Reqs, executableTestCount: Exec, gaps: Gaps,
                 id: Id, status: active, testCount: Tests, title: 'Fixture entity', traceabilityRole: Role,
                 type: symbol}).

test(symbol_report_classifies_every_role) :-
    dsc_kb((
        dsc_symbol_fixture,
        maplist(dsc_symbol_row, [
            'SYM-COV'-production-fully_covered-[]-1-1-0,
            'SYM-EXE'-executable_test-not_applicable-[]-0-0-1,
            'SYM-MIX'-mixed-uncovered-[invalid_mixed_symbol_role]-1-0-1,
            'SYM-UNC'-production-uncovered-[missing_requirement]-0-0-0
        ], Rows),
        Summary = _{applicable: 3, fullyCovered: 1, mixedRole: 1, notApplicable: 1, total: 4, uncovered: 2},
        dsc_report(coverage_report_json(symbol, [], true, false, 10, 0), Summary, Rows),
        Rows = [_, _, Mix, Unc],
        dsc_report(coverage_report_json(symbol, [], false, false, 10, 0), Summary, [Mix, Unc]),
        Rows = [Cov|_],
        dsc_report(coverage_report_json(symbol, [core], true, false, 10, 0),
                   _{applicable: 2, fullyCovered: 1, mixedRole: 1, notApplicable: 0, total: 2, uncovered: 1},
                   [Cov, Mix]),
        dsc_report(coverage_report_json(symbol, [], true, abc, _{}, false, 10, 0, abc, '2026-05-02T00:00:00Z', 1),
                   Summary, Rows),
        dsc_report(coverage_report_json(symbol, [], false, [missing], false, 10, 0, abc, '2026-05-02T00:00:00Z', 1),
                   Summary, Rows),
        dsc_report(coverage_report_json(symbol, [], false, [], false, 10, 0, abc, '2026-05-02T00:00:00Z', 1),
                   Summary, [Mix, Unc]),
        dsc_report(coverage_report_json(symbol, [], false, [missing], per_contract, _{}, false, 10, 0,
                                        abc, '2026-05-02T00:00:00Z', 1),
                   Summary, Rows)
    )).

test(type_report_counts_entities_and_stubs_apart) :-
    dsc_kb((
        dsc_cov_fixture,
        pf_entity(fact, 'F-STUB', [fact_kind=meta, tags=['bootstrap:provenance-stub']]),
        pf_entity(fact, 'F-STUB-2', [fact_kind=meta, tags=['bootstrap:provenance-stub']]),
        Rows = [_{count: 3, id: req, type: req}, _{count: 1, id: scenario, type: scenario},
                _{count: 2, id: symbol, type: symbol}, _{count: 3, id: test, type: test}],
        dsc_report(coverage_report_json(type, [], true, false, 10, 0), _{provenanceStubs: 2, total: 4}, Rows)
    )).

test(coverage_report_reuses_the_memo_until_the_store_changes) :-
    dsc_kb((
        dsc_cov_fixture,
        dsc_json(coverage_report_json(type, [], true, false, 10, 0), First),
        once(discovery:coverage_memo(Key, _, _, _)),
        Key = key(_, Graph, _),
        kb:kb_graph(Graph0), Graph == Graph0,
        retractall(discovery:coverage_memo(_, _, _, _)),
        assertz(discovery:coverage_memo(Key, [_{id: memo, type: memo}], _{total: memo}, _{memo: true})),
        coverage_report_json(type, [], true, false, 10, 0, Json),
        atom_json_dict(Json, Memo, [value_string_as(atom)]),
        same(Memo, _{summary: _{total: memo}, rows: [_{id: memo, type: memo}], meta: _{memo: true}}),
        pf_entity(req, 'REQ-NEW', [status=open]),
        dsc_json(coverage_report_json(type, [], true, false, 10, 0), After),
        get_dict(rows, After, [ReqRow|_]),
        same(ReqRow, _{count: 4, id: req, type: req}),
        First \== After,
        aggregate_all(count, discovery:coverage_memo(_, _, _, _), 1)
    )).

test(coverage_memo_without_a_graph) :-
    dsc_kb((
        dsc_cov_fixture,
        kb:kb_graph(Graph),
        Compute = binding_coverage_rows(type, [], true, strict_snapshot, _{}, false, unknown, x, 1),
        setup_call_cleanup(retract(kb:kb_graph(Graph)),
                           once(discovery:memo_sorted_coverage(probe, Compute, Rows, Summary, _)),
                           assertz(kb:kb_graph(Graph))),
        Rows == [],
        same(Summary, _{provenanceStubs: 0, total: 0}),
        once(discovery:coverage_memo(key(probe, NoGraph, _), _, _, _)),
        NoGraph == none
    )).

:- end_tests(discovery_coverage_reports).


% --- proof evidence -------------------------------------------------------------

dsc_stub(Params, Id, Proof) :-
    dsc_ctx(Params, Context),
    pf_stub_proof(Id, Context, Proof).

:- begin_tests(discovery_proof_evidence).

test(coverage_evidence_rows_project_the_proof) :-
    dsc_kb((
        pf_entity(req, 'REQ-1', [status=open, tags=[x]]),
        pf_entity(req, 'REQ-2', [status=open, tags=[x]]),
        pf_entity(req, 'REQ-3', [status=open, tags=[x]]),
        pf_entity(req, 'REQ-4', [status=open, tags=[y]]),
        Params = snap-'2026-05-02T00:00:00Z'-100-strict_snapshot-_{},
        dsc_stub(Params, 'REQ-1', _{proofStatus: tested,
            proofStages: _{passingE2e: _{status: passed, tests: ['T-1']}},
            proofGaps: [proof_receipt_stale, missing_scenario, proof_contract_mismatch, "proof_snapshot_x", other]}),
        dsc_stub(Params, 'REQ-2', _{proofStages: _{passingE2e: _{status: missing}}}),
        dsc_stub(Params, 'REQ-3', _{proofStages: _{other: _{}}}),
        dsc_stub(Params, 'REQ-4', _{proofStatus: missing}),
        dsc_json(coverage_evidence_json([x], snap, '2026-05-02T00:00:00Z', 100), Dict),
        same(Dict, _{rows: [
            _{id: 'REQ-1', proofStatus: tested, passingE2eStatus: passed, passingE2eTests: ['T-1'],
              receiptGapCodes: [proof_receipt_stale, proof_contract_mismatch, proof_snapshot_x]},
            _{id: 'REQ-2', proofStatus: unknown, passingE2eStatus: missing, passingE2eTests: [], receiptGapCodes: []},
            _{id: 'REQ-3', proofStatus: unknown, passingE2eStatus: unknown, passingE2eTests: [], receiptGapCodes: []}
        ]})
    )).

test(coverage_evidence_under_a_binding_mode) :-
    dsc_kb((
        pf_entity(req, 'REQ-1', [status=open]),
        Params = snap-'2026-05-02T00:00:00Z'-100-per_contract-_{'T': h},
        dsc_stub(Params, 'REQ-1', _{proofStatus: tested}),
        dsc_json(coverage_evidence_json([], per_contract, _{'T': h}, snap, '2026-05-02T00:00:00Z', 100), Dict),
        same(Dict, _{rows: [_{id: 'REQ-1', proofStatus: tested, passingE2eStatus: unknown,
                              passingE2eTests: [], receiptGapCodes: []}]})
    )).

test(coverage_evidence_receipt_gap_matches_every_receipt_code) :-
    once(discovery:coverage_evidence_receipt_gap(proof_receipt_missing)),
    once(discovery:coverage_evidence_receipt_gap(proof_contract_invalid)),
    once(discovery:coverage_evidence_receipt_gap(proof_snapshot_unavailable)),
    once(discovery:coverage_evidence_receipt_gap(gap(proof_receipt))),
    \+ discovery:coverage_evidence_receipt_gap(missing_scenario).

test(evidence_floor_rows_list_unmet_floors) :-
    dsc_kb((
        pf_entity(req, 'REQ-1', [status=open]),
        pf_entity(req, 'REQ-2', [status=open]),
        pf_entity(req, 'REQ-3', [status=open]),
        pf_entity(req, 'REQ-4', [status=open]),
        pf_entity(req, 'REQ-5', [status=open]),
        Params = snap-'2026-05-02T00:00:00Z'-100-per_contract-_{'T': h},
        dsc_stub(Params, 'REQ-1', _{evidenceLevel: tested, proofStatus: tested, proofGaps: [],
            evidenceFloor: _{required: tested, source: firmness, status: met}}),
        dsc_stub(Params, 'REQ-2', _{evidenceLevel: asserted, proofStatus: missing, proofGaps: [g],
            evidenceFloor: _{required: proved, source: required_evidence, status: below},
            unprovedClaims: ['CLAIM-1'], claimBindingRejections: [_{test: 'T'}],
            proofStages: _{passingE2e: _{failedReceiptTests: ['T-F'], missingReceiptTests: []},
                           productionSymbols: _{uncoveredSymbols: ['S-1']},
                           sourceCoordinates: _{missingSymbols: ['S-2']}}}),
        dsc_stub(Params, 'REQ-3', _{evidenceLevel: tested, proofStatus: tested, proofGaps: [],
            evidenceFloor: _{required: tested, source: firmness, status: pending_reproof},
            claimBindingRejections: []}),
        dsc_stub(Params, 'REQ-4', _{evidenceLevel: asserted, proofStatus: missing, proofGaps: []}),
        dsc_stub(Params, 'REQ-5', _{evidenceLevel: asserted, proofStatus: missing, proofGaps: [],
            evidenceFloor: _{required: tested, source: firmness, status: below}}),
        dsc_json(evidence_floor_json(per_contract, _{'T': h}, snap, '2026-05-02T00:00:00Z', 100), Dict),
        same(Dict, _{evaluated: 4, rows: [
            _{id: 'REQ-2', evidenceLevel: asserted, requiredEvidence: proved, requiredEvidenceSource: required_evidence,
              status: below, proofStatus: missing, proofGaps: [g],
              gapDetails: _{unprovedClaims: ['CLAIM-1'], failedReceiptTests: ['T-F'],
                            uncoveredSymbols: ['S-1'], missingCoordinateSymbols: ['S-2']},
              refutations: [_{test: 'T'}]},
            _{id: 'REQ-3', evidenceLevel: tested, requiredEvidence: tested, requiredEvidenceSource: firmness,
              status: pending_reproof, proofStatus: tested, proofGaps: [], gapDetails: _{}},
            _{id: 'REQ-5', evidenceLevel: asserted, requiredEvidence: tested, requiredEvidenceSource: firmness,
              status: below, proofStatus: missing, proofGaps: [], gapDetails: _{}}
        ]})
    )).

test(evidence_floor_gap_details_every_field) :-
    Proof = _{proofStages: _{
        passingE2e: _{failedReceiptTests: [a], missingReceiptTests: [b], staleReceiptTests: [c],
                      invalidReceiptTests: [d], contractMismatchReceiptTests: [e]},
        productionSymbols: _{uncoveredSymbols: [f]},
        sourceCoordinates: _{missingSymbols: [g]}},
        evidenceFloor: _{required: tested}, unprovedClaims: [h]},
    once(discovery:evidence_floor_gap_details(Proof, Details)),
    same(Details, _{failedReceiptTests: [a], missingReceiptTests: [b], staleReceiptTests: [c],
                    invalidReceiptTests: [d], contractMismatchReceiptTests: [e],
                    uncoveredSymbols: [f], missingCoordinateSymbols: [g]}),
    once(discovery:evidence_floor_gap_details(_{evidenceFloor: _{required: proved}, unprovedClaims: []}, Empty)),
    same(Empty, _{}),
    once(discovery:evidence_floor_gap_details(_{evidenceFloor: _{required: proved}, unprovedClaims: [x]}, Unproved)),
    same(Unproved, _{unprovedClaims: [x]}).

test(requirement_proof_json_names_the_requirement) :-
    dsc_kb((
        dsc_cov_fixture,
        dsc_default_params(Params),
        dsc_proof('REQ-A', Params, Proof0),
        put_dict(id, Proof0, 'REQ-A', Proof1),
        dsc_roundtrip(Proof1, Expected),
        dsc_json(requirement_proof_json('REQ-A', unknown, '1970-01-01T00:00:00Z', 604800), Dict),
        same(Dict, Expected),
        Params2 = s-'2026-05-02T00:00:00Z'-5-per_contract-_{'TEST-E2E': h},
        dsc_proof('REQ-A', Params2, Proof2),
        put_dict(id, Proof2, 'REQ-A', Proof3),
        dsc_roundtrip(Proof3, Expected2),
        dsc_json(requirement_proof_json('REQ-A', per_contract, _{'TEST-E2E': h}, s, '2026-05-02T00:00:00Z', 5), Dict2),
        same(Dict2, Expected2),
        \+ requirement_proof_json('TEST-E2E', unknown, '1970-01-01T00:00:00Z', 604800, _)
    )).

test(test_receipt_states_cover_proof_bearing_tests) :-
    dsc_kb((
        dsc_cov_fixture,
        pf_entity(test, 'TEST-INT', [status=passing, verification_scope=integration, proof_contract="{}"]),
        dsc_json(test_receipt_states_json(strict_snapshot, _{}, unknown, '2026-05-02T00:00:00Z', 100), Unknown),
        same(Unknown, _{states: _{'TEST-E2E': snapshot_unavailable, 'TEST-INT': snapshot_unavailable,
                                  'TEST-UNIT': snapshot_unavailable}}),
        dsc_json(test_receipt_states_json(per_contract, _{}, snap, '2026-05-02T00:00:00Z', 100), Known),
        same(Known, _{states: _{'TEST-E2E': missing, 'TEST-INT': missing, 'TEST-UNIT': missing}})
    )).

test(symbol_proof_lists_each_requirement_proof) :-
    dsc_kb((
        dsc_cov_fixture,
        pf_entity(req, 'REQ-C', [status=open]),
        fixture_rel(implements, 'SYM-P', 'REQ-C'),
        pf_raw_rel(implements, 'SYM-P', 'SCN-A'),
        Params = snap-'2026-05-02T00:00:00Z'-100-per_contract-_{'TEST-E2E': h},
        dsc_proof('REQ-A', Params, ProofA0), put_dict(id, ProofA0, 'REQ-A', ProofA),
        dsc_proof('REQ-C', Params, ProofC0), put_dict(id, ProofC0, 'REQ-C', ProofC),
        dsc_roundtrip([ProofA, ProofC], Proofs),
        dsc_json(symbol_proof_json('SYM-P', per_contract, _{'TEST-E2E': h}, snap, '2026-05-02T00:00:00Z', 100), Dict),
        same(Dict, _{id: 'SYM-P', symbolId: 'SYM-P', role: unknown, executableTest: false,
                     implementingRequirements: ['REQ-A', 'REQ-C'], executableFor: [], coveredBy: ['TEST-UNIT'],
                     proofs: Proofs}),
        dsc_json(symbol_proof_json('SYM-T', strict_snapshot, _{}, unknown, '2026-05-02T00:00:00Z', 100), Test),
        same(Test, _{id: 'SYM-T', symbolId: 'SYM-T', role: executable_test, executableTest: true,
                     implementingRequirements: [], executableFor: ['TEST-UNIT'], coveredBy: [], proofs: []}),
        \+ symbol_proof_json('REQ-A', strict_snapshot, _{}, unknown, '2026-05-02T00:00:00Z', 100, _)
    )).

test(symbol_explain_role_reads_the_symbol_role) :-
    dsc_kb((
        pf_entity(symbol, 'SYM-R', [symbol_role="Production"]),
        pf_entity(symbol, 'SYM-E', [symbol_role=""]),
        pf_entity(symbol, 'SYM-X', [symbol_role="x", tags=[a]]),
        pf_entity(test, 'T', []),
        pf_raw_rel(executable_for, 'SYM-X', 'T'),
        once(discovery:symbol_explain_role('SYM-R', R1)), R1 == 'Production',
        first_answer_is_last(discovery:symbol_explain_role('SYM-R', _)),
        once(discovery:symbol_explain_role('SYM-E', R2)), R2 == unknown,
        once(discovery:symbol_explain_role('SYM-X', R3)), R3 == executable_test,
        first_answer_is_last(discovery:symbol_explain_role('SYM-X', _)),
        once(discovery:symbol_explain_role('SYM-GONE', R4)), R4 == unknown
    )).

:- end_tests(discovery_proof_evidence).

% --- search answer verdicts --------------------------------------------------------------

dsc_verdicts(ReqIds, Verdicts) :-
    dsc_json(search_answer_verdicts_json(ReqIds), Dict),
    status_scope_dict(Scope0),
    dsc_roundtrip(Scope0, Scope),
    get_dict(scope, Dict, Scope1),
    same(Scope1, Scope),
    get_dict(requirements, Dict, Verdicts).

:- begin_tests(discovery_search_answer).

test(unknown_requirement_has_no_findings) :-
    dsc_kb((
        dsc_verdicts(['REQ-NONE'], Verdicts),
        same(Verdicts, [_{id: 'REQ-NONE', contradictions: [], scenarios: [], forbids: [],
                          inventory: _{status: unknown, propositionCount: 0, unresolved: []}}])
    )).

test(rule_contradiction_from_either_side) :-
    dsc_kb((
        pf_rule_pair(customer, customer),
        dsc_verdicts(['REQ-RULE-DENY', 'REQ-RULE-ALLOW'], [Deny, Allow]),
        get_dict(contradictions, Deny, DenyFindings),
        same(DenyFindings, [_{kind: rule, status: contradiction, with: 'REQ-RULE-ALLOW',
            facts: ['FACT-RULE-DENY', 'FACT-RULE-ALLOW'],
            reason: 'Rule conflict (contradiction) between REQ-RULE-ALLOW and REQ-RULE-DENY'}]),
        get_dict(contradictions, Allow, AllowFindings),
        same(AllowFindings, [_{kind: rule, status: contradiction, with: 'REQ-RULE-DENY',
            facts: ['FACT-RULE-ALLOW', 'FACT-RULE-DENY'],
            reason: 'Rule conflict (contradiction) between REQ-RULE-ALLOW and REQ-RULE-DENY'}])
    )).

test(rule_overlap_is_unresolved_and_disjoint_rules_are_left_out) :-
    dsc_kb((
        pf_rule_pair(customer, premium_customer),
        dsc_verdicts(['REQ-RULE-ALLOW'], [Allow]),
        get_dict(contradictions, Allow, [Finding]),
        get_dict(status, Finding, unresolved)
    )).

% Customers and premium customers overlap in one body, so the rules clash.
test(rule_comparison_reads_the_functional_declarations) :-
    dsc_kb((
        pf_rule_pair(customer,
                     _{kind: all, items: [_{kind: atom, name: customer, args: []},
                                          _{kind: atom, name: premium, args: []}]}),
        dsc_verdicts(['REQ-RULE-ALLOW'], [Allow]),
        get_dict(contradictions, Allow, [Finding]),
        get_dict(status, Finding, Status),
        Status == contradiction
    )).

test(disjoint_rules_are_left_out) :-
    dsc_kb((
        pf_rule_pair(customer, _{validTo: "2020-01-01T00:00:00Z"}, customer, _{validFrom: "2021-01-01T00:00:00Z"}),
        dsc_verdicts(['REQ-RULE-ALLOW'], [Allow]),
        get_dict(contradictions, Allow, Findings),
        Findings == []
    )).

test(property_contradiction_names_both_facts) :-
    dsc_kb((
        pf_conflict_pair('REQ-Q1', 10, 'REQ-Q2', 20),
        dsc_verdicts(['REQ-Q1', 'REQ-Q2'], [Q1, Q2]),
        get_dict(contradictions, Q1, [C1]),
        dsc_pick(C1, [kind, status, with, facts], P1),
        P1 == [kind-strict_property, status-contradiction, with-'REQ-Q2', facts-['FACT-CONFLICT-A', 'FACT-CONFLICT-B']],
        get_dict(reason, C1, Reason1), atom(Reason1), Reason1 \== '',
        get_dict(contradictions, Q2, [C2]),
        get_dict(with, C2, 'REQ-Q1')
    )).

% A stored int value that is no number makes the comparison raise.
dsc_broken_quota(Value) :-
    pf_entity(fact, 'F-SUBJ', [fact_kind=subject, subject_key="api.quota"]),
    pf_entity(fact, 'F-BAD', [fact_kind=property_value, subject_key="api.quota", property_key="rate",
                              operator=eq, value_type=int, value_int=Value]),
    pf_entity(fact, 'F-GOOD', [fact_kind=property_value, subject_key="api.quota", property_key="rate",
                               operator=eq, value_type=int, value_int=3]),
    pf_entity(req, 'REQ-BAD', [status=open]),
    pf_entity(req, 'REQ-GOOD', [status=open]),
    fixture_rel(constrains, 'REQ-BAD', 'F-SUBJ'),
    fixture_rel(constrains, 'REQ-GOOD', 'F-SUBJ'),
    pf_raw_rel(requires_property, 'REQ-BAD', 'F-BAD'),
    pf_raw_rel(requires_property, 'REQ-GOOD', 'F-GOOD').

test(verdict_errors_are_reported_per_requirement) :-
    dsc_kb((
        dsc_broken_quota("abc"),
        dsc_verdicts(['REQ-BAD', 'REQ-NONE'], [Bad, None]),
        same(Bad, _{id: 'REQ-BAD', error: 'error(type_error([],"abc"),context(system:(=:=)/2,\'"x" must hold one character\'))'}),
        get_dict(inventory, None, _)
    )).

test(verdict_error_text_is_clipped) :-
    dsc_kb((
        length(Codes, 400), maplist(=(0'a), Codes), string_codes(Long, Codes),
        dsc_broken_quota(Long),
        once(discovery:search_answer_verdict(none, none, 'REQ-BAD', Verdict)),
        get_dict(error, Verdict, Text),
        string(Text),
        string_length(Text, 300),
        sub_string(Text, 0, 16, _, "error(type_error"),
        sub_string(Text, 299, 1, 0, "…")
    )).

test(scenario_outcomes_of_every_shape) :-
    once(discovery:search_answer_outcome(s, infeasible(witness([r1, r2], [a], [f], "why")), O1)),
    same(O1, _{scenario: s, outcome: infeasible, requirement: r1, requirements: [r1, r2], assumed: [a], fact: [f], reason: "why"}),
    first_answer_is_last(discovery:search_answer_outcome(s, infeasible(witness([r1], [], [], x)), _)),
    once(discovery:search_answer_outcome(s, infeasible(witness([], [], [], x)), O2)),
    get_dict(requirement, O2, R2), R2 == '',
    once(discovery:search_answer_outcome(s, unknown(no_facts), O3)),
    same(O3, _{scenario: s, outcome: unknown, reason: no_facts, facts: []}),
    first_answer_is_last(discovery:search_answer_outcome(s, unknown(no_facts), _)),
    once(discovery:search_answer_outcome(s, unknown(missing([f1])), O4)),
    same(O4, _{scenario: s, outcome: unknown, reason: missing, facts: [f1]}),
    first_answer_is_last(discovery:search_answer_outcome(s, unknown(missing([f1])), _)),
    once(discovery:search_answer_outcome(s, unknown(odd(f1)), O5)),
    same(O5, _{scenario: s, outcome: 'unknown(odd(f1))'}),
    once(discovery:search_answer_outcome(s, unknown(two(a, b)), O5b)),
    same(O5b, _{scenario: s, outcome: 'unknown(two(a,b))'}),
    once(discovery:search_answer_outcome(s, not_applicable(no_req([r])), O6)),
    same(O6, _{scenario: s, outcome: not_applicable, reason: no_req, facts: [r]}),
    first_answer_is_last(discovery:search_answer_outcome(s, not_applicable(no_req([r])), _)),
    once(discovery:search_answer_outcome(s, not_applicable(plain), O7)),
    same(O7, _{scenario: s, outcome: 'not_applicable(plain)'}),
    once(discovery:search_answer_outcome(s, not_applicable(odd(x)), O7b)),
    same(O7b, _{scenario: s, outcome: 'not_applicable(odd(x))'}),
    once(discovery:search_answer_outcome(s, feasible, O8)),
    same(O8, _{scenario: s, outcome: feasible}),
    once(discovery:search_answer_outcome(s, 'it''s', O9)),
    same(O9, _{scenario: s, outcome: 'it''s'}),
    once(discovery:search_answer_outcome(s, "str", O10)),
    same(O10, _{scenario: s, outcome: '"str"'}).

test(forbidden_scenarios_from_a_precomputed_list) :-
    dsc_kb((
        pf_entity(req, 'REQ-1', [status=open]),
        pf_entity(scenario, 'SCN-OWN', []),
        fixture_rel(specified_by, 'REQ-1', 'SCN-OWN'),
        Infeasible = [infeasible('SCN-OWN', ['REQ-1'], [a], [f], "own"),
                      infeasible('SCN-OTHER', ['REQ-2', 'REQ-1'], [b], [g], '^^'("other", xsd)),
                      infeasible('SCN-THIRD', ['REQ-3'], [], [], "third")],
        findall(F, discovery:search_answer_forbidden_scenario(some(Infeasible), 'REQ-1', F), Forbids),
        same(Forbids, [_{scenario: 'SCN-OTHER', assumed: [b], fact: [g], reason: "other"}])
    )).

test(inventory_lists_unresolved_propositions) :-
    dsc_kb((
        length(Codes, 320), maplist(=(0'b), Codes), string_codes(LongClaim, Codes),
        Inventory = [_{claim_text: "Users sign in", status: ambiguous, span_start: 0, span_end: 13},
                     _{claim_text: LongClaim, status: ontology_gap, span_start: 0, span_end: 320},
                     _{claim_text: "Done", status: modeled, claim_key: "CLAIM-0000000000000001", span_start: 0, span_end: 4}],
        with_output_to(string(Json), json_write_dict(current_output, Inventory, [width(0)])),
        pf_entity(req, 'REQ-INV', [status=open, semantic_inventory=Json]),
        dsc_verdicts(['REQ-INV'], [Verdict]),
        get_dict(inventory, Verdict, Inv),
        get_dict(unresolved, Inv, Unresolved),
        sub_string(LongClaim, 0, 299, _, Prefix), string_concat(Prefix, "…", Clipped),
        atom_string(ClippedAtom, Clipped),
        same(Unresolved, [_{claim: 'Users sign in', status: ambiguous}, _{claim: ClippedAtom, status: ontology_gap}]),
        get_dict(propositionCount, Inv, 3),
        get_dict(status, Inv, Status), atom(Status)
    )).

test(scenario_feasibility_and_forbidden_scenarios_end_to_end) :-
    dsc_kb((
        pf_entity(req, 'REQ-S', [status=open]),
        pf_entity(scenario, 'SCN-S', [expects=success]),
        pf_entity(scenario, 'SCN-F', [expects=failure]),
        fixture_rel(specified_by, 'REQ-S', 'SCN-S'),
        fixture_rel(specified_by, 'REQ-S', 'SCN-F'),
        dsc_verdicts(['REQ-S'], [Verdict]),
        get_dict(scenarios, Verdict, Scenarios),
        same(Scenarios, [_{facts: [], outcome: unknown, reason: no_assumptions, scenario: 'SCN-S'}]),
        get_dict(forbids, Verdict, [])
    )).

test(infeasible_scenarios_are_listed_once) :-
    once(discovery:search_answer_infeasible(I)),
    I == some([]),
    first_answer_is_last(discovery:search_answer_infeasible(_)).

% A success scenario assuming zero quota against a requirement for positive
% quota. The requirement's own scenario is a scenario outcome; the others it
% makes infeasible are forbids.
dsc_quota_fixture(ZeroValue) :-
    pf_entity(fact, 'FACT-QUOTA-SUBJECT', [fact_kind=subject, subject_key="client.call_quota"]),
    pf_entity(fact, 'FACT-QUOTA-POSITIVE', [fact_kind=property_value, subject_key="client.call_quota",
        property_key="remaining", operator=gt, value_type=int, value_int=0]),
    pf_entity(fact, 'FACT-QUOTA-ZERO', [fact_kind=property_value, subject_key="client.call_quota",
        property_key="remaining", operator=eq, value_type=int, value_int=ZeroValue]),
    pf_entity(req, 'REQ-QUOTA', [status=open]),
    pf_raw_rel(constrains, 'REQ-QUOTA', 'FACT-QUOTA-SUBJECT'),
    pf_raw_rel(requires_property, 'REQ-QUOTA', 'FACT-QUOTA-POSITIVE'),
    pf_entity(scenario, 'SCN-OWN', [expects=success]),
    pf_raw_rel(specified_by, 'REQ-QUOTA', 'SCN-OWN'),
    pf_raw_rel(assumes, 'SCN-OWN', 'FACT-QUOTA-ZERO'),
    pf_entity(scenario, 'SCN-OTHER', [expects=success]),
    pf_raw_rel(assumes, 'SCN-OTHER', 'FACT-QUOTA-ZERO'),
    pf_entity(req, 'REQ-ELSE', [status=open]),
    pf_entity(scenario, 'SCN-ELSE', [expects=success]),
    pf_raw_rel(specified_by, 'REQ-ELSE', 'SCN-ELSE').

test(forbidden_scenarios_end_to_end) :-
    dsc_kb((
        dsc_quota_fixture(0),
        dsc_verdicts(['REQ-QUOTA'], [Verdict]),
        get_dict(scenarios, Verdict, [Own]),
        dsc_pick(Own, [scenario, outcome, requirement, assumed, fact], OwnPairs),
        OwnPairs == [scenario-'SCN-OWN', outcome-infeasible, requirement-'REQ-QUOTA',
                     assumed-['FACT-QUOTA-ZERO'], fact-['FACT-QUOTA-POSITIVE']],
        get_dict(forbids, Verdict, [Forbid]),
        dsc_pick(Forbid, [scenario, assumed, fact], ForbidPairs),
        ForbidPairs == [scenario-'SCN-OTHER', assumed-['FACT-QUOTA-ZERO'], fact-['FACT-QUOTA-POSITIVE']],
        get_dict(reason, Forbid, Reason), atom(Reason), Reason \== ''
    )).

test(forbidden_scenarios_read_directly_when_not_listed_up_front) :-
    dsc_kb((
        dsc_quota_fixture(0),
        findall(F, discovery:search_answer_forbidden_scenario(none, 'REQ-QUOTA', F), [Forbid]),
        dsc_pick(Forbid, [scenario, assumed, fact], Pairs),
        Pairs == [scenario-'SCN-OTHER', assumed-['FACT-QUOTA-ZERO'], fact-['FACT-QUOTA-POSITIVE']],
        get_dict(reason, Forbid, Reason), string(Reason), Reason \== "",
        once(discovery:search_answer_infeasible(some(Infeasible))),
        findall(G, discovery:search_answer_forbidden_scenario(some(Infeasible), 'REQ-QUOTA', G), Listed),
        same(Listed, [Forbid]),
        \+ discovery:search_answer_forbidden_scenario(none, 'REQ-ELSE', _)
    )).

% A legacy entity whose property is unbound makes the scenario scan raise.
dsc_with_broken_scenario(Goal) :-
    setup_call_cleanup(assertz(kb:entity(scenario, 'SCN-LEGACY', "Legacy", [_])),
                       once(Goal),
                       retractall(kb:entity(scenario, 'SCN-LEGACY', _, _))).

test(a_raising_scenario_scan_is_reported_per_requirement) :-
    dsc_kb((
        pf_entity(req, 'REQ-1', [status=open]),
        dsc_with_broken_scenario((
            once(discovery:search_answer_infeasible(Infeasible)),
            Infeasible == none,
            first_answer_is_last(discovery:search_answer_infeasible(_)),
            dsc_verdicts(['REQ-1'], [Verdict])
        )),
        dict_pairs(Verdict, _, VerdictPairs), pairs_keys(VerdictPairs, Keys), Keys == [error, id],
        get_dict(id, Verdict, 'REQ-1'),
        get_dict(error, Verdict, Text),
        sub_atom(Text, 0, _, _, 'error(instantiation_error,context(system:functor/3,')
    )).

test(inventory_answers_once) :-
    dsc_kb((
        pf_entity(req, 'REQ-INV', [status=open]),
        first_answer_is_last(discovery:search_answer_inventory('REQ-INV', _)),
        first_answer_is_last(discovery:search_answer_inventory('REQ-NONE', _))
    )).

:- end_tests(discovery_search_answer).

:- begin_tests(discovery_edge_cases).

test(namespace_bounds_the_rows_and_the_schema) :-
    dsc_kb((
        dsc_ask_fixture,
        pf_entity(fact, 'F-CAROL', [fact_kind=predicate, predicate_name="has_role", predicate_args=["carol", "admin"]]),
        dsc_json(ask_predicate_json(access, has_role, [], none, all, none, 10, 0), Access),
        get_dict(rows, Access, AccessRows), dsc_ids(AccessRows, AccessIds),
        AccessIds == ['F-ALICE-ADMIN', 'F-BOB-AUDITOR'],
        dsc_json(ask_predicate_json(none, has_role, [], none, all, none, 10, 0), Any),
        get_dict(rows, Any, AnyRows), dsc_ids(AnyRows, AnyIds),
        AnyIds == ['F-ALICE-ADMIN', 'F-BOB-AUDITOR', 'F-CAROL'],
        dsc_json(ask_predicate_json(default, has_role, [], none, all, none, 10, 0), Default),
        get_dict(schema, Default, null),
        get_dict(rows, Default, DefaultRows), dsc_ids(DefaultRows, DefaultIds),
        DefaultIds == ['F-CAROL']
    )).

test(named_arguments_with_a_warning_return_no_rows) :-
    dsc_kb((
        dsc_ask_fixture,
        dsc_json(ask_predicate_json(access, has_role, where([user=alice, colour=red]), none, all, none, 10, 0), Dict),
        get_dict(rows, Dict, []),
        get_dict(count, Dict, 0),
        get_dict(warnings, Dict, ['\'colour\' is not an argument of this predicate; declared arguments: user, role'])
    )).

test(a_current_requirement_marks_the_fact_current) :-
    dsc_kb((
        dsc_ask_fixture,
        once(discovery:ask_fact_requirements('F-ADMIN-READ', requires_predicate, Reqs, HasCurrent)),
        same(Reqs, [_{id: 'REQ-ADMIN', status: open, current: true}]),
        HasCurrent == true
    )).

test(effect_needs_the_declared_arity_and_a_decision_predicate) :-
    dsc_kb((
        once(discovery:ask_effect(default, permission_rule, [a, b, c, allow, x], assert, E1)), E1 == null,
        once(discovery:ask_effect(access, has_role, [allow, x], assert, E2)), E2 == null
    )).

test(fact_kind_value_follows_the_declared_type) :-
    dsc_kb((
        pf_entity(fact, 'F-TYPED', [fact_kind=property_value, subject_key="s", property_key="p",
                                    value_type=int, value_int=2, value_string="two"]),
        pf_entity(fact, 'F-UNTYPED', [fact_kind=property_value, subject_key="s", property_key="q", value_int=5]),
        dsc_json(ask_fact_kind_json(property_value, 10, 0), Dict),
        get_dict(rows, Dict, [Typed, Untyped]),
        get_dict(id, Typed, 'F-TYPED'),
        get_dict(value, Typed, 2),
        get_dict(id, Untyped, 'F-UNTYPED'),
        get_dict(value, Untyped, '')
    )).

test(gap_rows_by_source_and_present_links) :-
    dsc_kb((
        dsc_gap_fixture,
        dsc_json(find_gaps_json(none, [], [], [], obs, 10, 0), Source),
        get_dict(rows, Source, SourceRows), dsc_ids(SourceRows, SourceIds),
        SourceIds == ['F-OBS'],
        dsc_json(find_gaps_json(req, [], [verified_by], [], none, 10, 0), Present),
        get_dict(rows, Present, PresentRows), dsc_ids(PresentRows, PresentIds),
        PresentIds == ['REQ-A']
    )).

test(target_and_test_counts_with_none_or_many) :-
    dsc_kb((
        pf_entity(req, 'REQ-N', [status=open]),
        pf_entity(scenario, 'SCN-1', []),
        pf_entity(scenario, 'SCN-2', []),
        pf_entity(req, 'REQ-M', [status=open]),
        fixture_rel(specified_by, 'REQ-M', 'SCN-1'),
        fixture_rel(specified_by, 'REQ-M', 'SCN-2'),
        once(discovery:count_distinct_targets(specified_by, 'REQ-N', source, C0)), C0 == 0,
        once(discovery:count_distinct_targets(specified_by, 'REQ-M', source, C2)), C2 == 2,
        once(discovery:requirement_test_count('REQ-N', T0)), T0 == 0,
        once(discovery:count_direct_symbols('REQ-N', S0)), S0 == 0,
        once(discovery:count_transitive_symbols('REQ-N', true, S1)), S1 == 0,
        once(discovery:count_direct_requirements('REQ-N', R0)), R0 == 0,
        once(discovery:count_direct_tests('REQ-N', D0)), D0 == 0,
        once(discovery:count_executable_tests('REQ-N', X0)), X0 == 0,
        once(discovery:test_statuses([], St)), St == [],
        once(discovery:test_scopes([], Sc)), Sc == []
    )).

test(counts_ignore_duplicate_links) :-
    dsc_kb((
        pf_entity(req, 'REQ-D', [status=open]),
        pf_entity(test, 'TEST-D', [status=passing]),
        pf_entity(symbol, 'SYM-D', []),
        pf_entity(scenario, 'SCN-D', []),
        pf_raw_rel(verified_by, 'REQ-D', 'TEST-D'),
        pf_raw_rel(validates, 'TEST-D', 'REQ-D'),
        pf_raw_rel(specified_by, 'REQ-D', 'SCN-D'),
        pf_raw_rel(validates, 'TEST-D', 'SCN-D'),
        pf_raw_rel(implements, 'SYM-D', 'REQ-D'),
        pf_raw_rel(covered_by, 'SYM-D', 'TEST-D'),
        pf_raw_rel(executable_for, 'SYM-D', 'TEST-D'),
        once(discovery:requirement_test_count('REQ-D', Count)), Count == 1
    )).

:- end_tests(discovery_edge_cases).

% --- binding modes, determinism and traversal limits ---------------------------------------

dsc_hash(Char, Hash) :-
    length(Codes, 64), maplist(=(Char), Codes), atom_codes(Hash, Codes).

% REQ-BIND's end-to-end receipt carries a binding hash but an old snapshot:
% stale under the strict snapshot, a contract mismatch under per_contract.
dsc_binding_fixture(Bindings) :-
    dsc_hash(0'e, Snapshot), dsc_hash(0'f, Binding),
    pf_receipt([binding_hash=Binding, code_snapshot=Snapshot], Receipt),
    pf_receipts_json([Receipt], ReceiptsJson),
    pf_entity(req, 'REQ-BIND', [priority=must, status=open]),
    pf_entity(req, 'REQ-OLD', [status=deprecated]),
    pf_entity(test, 'TEST-E2E', [status=passing, verification_scope=end_to_end, proof_contract="{}",
                                 proof_receipts=ReceiptsJson]),
    pf_entity(scenario, 'SCN-BIND', []),
    fixture_rel(verified_by, 'REQ-BIND', 'TEST-E2E'),
    fixture_rel(specified_by, 'REQ-BIND', 'SCN-BIND'),
    fixture_rel(validates, 'TEST-E2E', 'SCN-BIND'),
    Bindings = _{'TEST-E2E': Binding}.

dsc_bind_stages(Mode, Bindings, Stages) :-
    dsc_proof('REQ-BIND', abc-'2026-05-02T00:00:00Z'-100000-Mode-Bindings, Proof),
    dsc_roundtrip(Proof.proofStages, Stages).

dsc_row_stages(Rows, Id, Stages) :-
    member(Row, Rows),
    get_dict(id, Row, Id),
    !,
    get_dict(proofStages, Row, Stages).

dsc_report_rows(Goal, Rows) :-
    dsc_json(Goal, Dict),
    get_dict(rows, Dict, Rows).

:- begin_tests(discovery_binding_and_limits).

test(binding_mode_changes_the_requirement_rows) :-
    dsc_kb((
        dsc_binding_fixture(Bindings),
        dsc_bind_stages(per_contract, Bindings, Contract),
        dsc_bind_stages(strict_snapshot, _{}, Strict),
        Contract \== Strict,
        dsc_report_rows(coverage_report_json(req, [], true, per_contract, Bindings, false, 10, 0,
                                             abc, '2026-05-02T00:00:00Z', 100000), Rows1),
        dsc_row_stages(Rows1, 'REQ-BIND', S1), same(S1, Contract),
        dsc_report_rows(coverage_report_json(req, [], true, [missing], per_contract, Bindings, false, 10, 0,
                                             abc, '2026-05-02T00:00:00Z', 100000), Rows2),
        dsc_ids(Rows2, Ids2), Ids2 == ['REQ-BIND'],
        dsc_row_stages(Rows2, 'REQ-BIND', S2), same(S2, Contract)
    )).

test(status_filter_under_a_binding_mode_ignores_include_passing) :-
    dsc_kb((
        dsc_binding_fixture(Bindings),
        dsc_report_rows(coverage_report_json(req, [], false, [not_applicable], per_contract, Bindings, false, 10, 0,
                                             abc, '2026-05-02T00:00:00Z', 100000), Rows),
        dsc_ids(Rows, Ids), Ids == ['REQ-OLD']
    )).

test(coverage_row_builders_answer_once) :-
    dsc_kb((
        dsc_binding_fixture(Bindings),
        first_answer_is_last(discovery:status_binding_coverage_rows(req, [], false, [missing], per_contract, Bindings,
                                 false, abc, '2026-05-02T00:00:00Z', 100000, _, _)),
        first_answer_is_last(discovery:binding_coverage_rows(req, [], false, per_contract, Bindings,
                                 false, abc, '2026-05-02T00:00:00Z', 100000, _, _)),
        first_answer_is_last(discovery:status_filtered_coverage_rows(req, [], true, [], false,
                                 abc, '2026-05-02T00:00:00Z', 100000, _, _)),
        first_answer_is_last(discovery:status_filtered_coverage_rows(req, [], true, [missing], false,
                                 abc, '2026-05-02T00:00:00Z', 100000, _, _))
    )).

test(coverage_depth_of_a_unit_only_requirement) :-
    dsc_kb((
        pf_entity(req, 'R-U', [status=open]),
        pf_entity(test, 'T-U', [status=passing, verification_scope=unit]),
        fixture_rel(verified_by, 'R-U', 'T-U'),
        once(discovery:requirement_coverage_depth('R-U', 0, Depth, _)),
        Depth == unit_only
    )).

test(coverage_depth_edges) :-
    dsc_kb((
        pf_entity(test, 'T-UNIT', [verification_scope=unit]),
        once(discovery:classify_coverage_depth(0, ['T-UNIT'], [], [], ['T-UNIT'], D1)),
        D1 == open_or_nonpassing_tests_only,
        once(discovery:classify_coverage_depth(1, [], [], [], [], D2)),
        D2 == scenario_only_no_test
    )).

test(lookups_answer_once) :-
    dsc_kb((
        dsc_ask_fixture,
        findall(x, discovery:ask_schema_dict(access, has_role, _, _), [_]),
        first_answer_is_last(discovery:provenance_stub_props(fact, [tags=['bootstrap:provenance-stub', x]]))
    )).

test(type_filter_matches) :-
    findall(x, discovery:matches_type(none, req), [_]),
    once(discovery:matches_type(req, req)),
    \+ discovery:matches_type(req, test).

test(an_edge_to_a_seen_node_is_followed_once) :-
    dsc_kb((
        dsc_basic,
        findall(x, discovery:graph_expand_json(['REQ-A', 'SCN-A'], [], outgoing, 1, [], 100, 100, _), [_]),
        dsc_graph(['REQ-A', 'SCN-A'], [specified_by], outgoing, 3, [], 100, 100,
                  ['REQ-A'-req-open, 'SCN-A'-scenario-active],
                  ['REQ-A'-specified_by-'SCN-A'], false)
    )).

test(a_negative_depth_stops_at_an_empty_frontier) :-
    dsc_kb((
        dsc_basic,
        dsc_graph(['REQ-B'], [], both, -1, [], 10, 10, ['REQ-B'-req-open], [], false)
    )).

:- end_tests(discovery_binding_and_limits).
