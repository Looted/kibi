:- use_module(library(plunit)).
:- use_module('../src/cases.pl').
:- use_module(kb_fixture).
:- use_module(test_helpers).

% One KB holds every fixture: property facts on svc.api.limit (and one on
% another subject), the scenarios that assume them, and two requirements
% grounding claims on them.

:- dynamic cases_kb_dir/1.

% Legacy .pl entities can hold values the schema refuses: a bool that is a
% number, an int that is not one, a set that is not a list.
legacy_fact(Id, Extra, entity(fact, Id, "Legacy fixture", Props)) :-
    append([fact_kind=property_value, subject_key='svc.api', property_key=limit], Extra, Props).

legacy_facts(Entities) :-
    maplist(legacy_fact,
            ['F-L-BOOL', 'F-L-ATOM', 'F-L-SET'],
            [ [operator=eq, value_type=bool, value_bool=1],
              [operator=lt, value_type=int, value_int=abc],
              [operator=eq, value_type=set, value_set=foo] ],
            Entities).

cases_kb_open :-
    retractall(cases_kb_dir(_)),
    legacy_facts(Legacy),
    fixture_kb_open(Legacy, Dir),
    assertz(cases_kb_dir(Dir)),
    catch(cases_fixture, Error, (cases_kb_close, throw(Error))).

cases_kb_close :-
    retract(cases_kb_dir(Dir)),
    fixture_kb_close(Dir).

property_fact(Id, Extra) :-
    property_fact(Id, "svc.api", Extra).

property_fact(Id, Subject, Extra) :-
    fixture_entity(fact, Id, [fact_kind=property_value, subject_key=Subject, property_key="limit"|Extra]).

int_fact(Id, Op, Value) :-
    property_fact(Id, [operator=Op, value_type=int, value_int=Value]).

set_fact(Id, Op, Members) :-
    property_fact(Id, [operator=Op, value_type=set, value_set=Members]).

scenario(Id, Extra, Assumes) :-
    fixture_entity(scenario, Id, Extra),
    forall(member(Fact, Assumes), fixture_rel(assumes, Id, Fact)).

cases_fixture :-
    property_fact('F-LTE5', [operator=lte, value_type=int, value_int=5,
                             claim_key="CLAIM-A", claim_text="limit at most 5"]),
    int_fact('F-LT5', lt, 5),
    int_fact('F-GT0', gt, 0),
    int_fact('F-GTE1', gte, 1),
    int_fact('F-GTEM1', gte, -1),
    int_fact('F-GTM1', gt, -1),
    int_fact('F-EQ0', eq, 0),
    int_fact('F-EQ5', eq, 5),
    int_fact('F-GTE0', gte, 0),
    int_fact('F-LTE1', lte, 1),
    int_fact('F-LTE2', lte, 2),
    int_fact('F-GTE2', gte, 2),
    set_fact('F-SETEXC2', excludes, ["y", "x"]),
    property_fact('F-NUMGTE0', [operator=gte, value_type=number, value_number=0]),
    property_fact('F-FORBIDEXC', [operator=excludes, value_type=set, value_set=["x"], polarity=forbid]),
    int_fact('F-NEQ3', neq, 3),
    property_fact('F-NUM', [operator=lte, value_type=number, value_number=2.5]),
    property_fact('F-NUMGT0', [operator=gt, value_type=number, value_number=0]),
    property_fact('F-FORBID', [operator=lt, value_type=int, value_int=5, polarity=forbid]),
    property_fact('F-FORBIDSUB', [operator=subset_of, value_type=set, value_set=["a"], polarity=forbid]),
    set_fact('F-SETEQ', eq, ["b", "a"]),
    set_fact('F-SETINC', includes, ["a"]),
    set_fact('F-SETSUB', subset_of, ["a", "b"]),
    set_fact('F-SETEXC', excludes, ["x"]),
    property_fact('F-SETFORBID', [operator=includes, value_type=set, value_set=["a"], polarity=forbid]),
    property_fact('F-STR', [operator=eq, value_type=string, value_string="x"]),
    fixture_entity(fact, 'F-PLAIN', []),
    numbered_set('F-SET11', 11),
    numbered_set('F-SET12', 12),
    % Assumptions a scenario can state.
    int_fact('A-EQ5', eq, 5),
    int_fact('A-LTE5', lte, 5),
    int_fact('A-EQ7', eq, 7),
    int_fact('A-GT6', gt, 6),
    int_fact('A-GT4', gt, 4),
    property_fact('A-NUM-GT4', [operator=gt, value_type=number, value_number=4]),
    property_fact('A-FORBID-LTE5', [operator=lte, value_type=int, value_int=5, polarity=forbid]),
    property_fact('A-OTHER-EQ5', "svc.other", [operator=eq, value_type=int, value_int=5]),
    property_fact('A-NUM-EQ5', [operator=eq, value_type=number, value_number=5.0]),
    property_fact('A-STR', [operator=eq, value_type=string, value_string="5"]),
    set_fact('A-INC-AC', includes, ["a", "c"]),
    set_fact('A-EQ-A', eq, ["a"]),
    set_fact('A-EXC-A', excludes, ["a"]),
    set_fact('A-INC-C', includes, ["c"]),
    set_fact('A-INC-A', includes, ["a"]),
    set_fact('A-INC-X', includes, ["x"]),
    set_fact('A-SUB-X', subset_of, ["x"]),
    scenario('S-OK', [], ['A-EQ5']),
    scenario('S-OK-TWICE', [expects=success], ['A-EQ5', 'A-NUM-EQ5']),
    scenario('S-DRAFT', [status=draft], ['A-EQ5']),
    scenario('S-REJ-EQ5', [expects=rejection], ['A-EQ5']),
    scenario('S-OTHER', [], ['A-OTHER-EQ5']),
    scenario('S-WEAK', [], ['A-LTE5']),
    scenario('S-STR', [], ['A-STR']),
    scenario('S-ERR', [expects=error], ['A-EQ7']),
    scenario('S-REJ', [expects=rejection], ['A-GT6']),
    scenario('S-REJ-GT4', [expects=rejection], ['A-GT4']),
    scenario('S-REJ-NUM-GT4', [expects=rejection], ['A-NUM-GT4']),
    scenario('S-FORBID', [expects=rejection], ['A-FORBID-LTE5']),
    scenario('S-SUCCESS-EQ7', [], ['A-EQ7']),
    scenario('S-SET-INC-AC', [], ['A-INC-AC']),
    scenario('S-SET-INC-C-OK', [], ['A-INC-C']),
    scenario('S-SET-EQ-A', [], ['A-EQ-A']),
    scenario('S-SET-EXC-A', [], ['A-EXC-A']),
    scenario('S-SET-INC-C', [expects=rejection], ['A-INC-C']),
    scenario('S-SET-INC-A', [expects=rejection], ['A-INC-A']),
    scenario('S-SET-INC-X', [expects=rejection], ['A-INC-X']),
    scenario('S-SET-SUB-X', [expects=rejection], ['A-SUB-X']),
    fixture_entity(req, 'REQ-TWO', []),
    fixture_entity(req, 'REQ-NONE', []),
    fixture_rel(requires_property, 'REQ-TWO', 'F-SETINC'),
    fixture_rel(requires_property, 'REQ-TWO', 'F-GT0').

numbered_set(Id, Count) :-
    findall(Member, (between(1, Count, N), format(string(Member), "m~|~`0t~d~2+", [N])), Members),
    set_fact(Id, eq, Members).

% The cases of a fact as Generator-Constraint-Predicted triples.
% fact_cases/3 leaves the KB lookup's choicepoint open: commit to its one
% answer (fact_cases_answers_once checks there is no other).
case_triples(FactId, Triples, LimitReached) :-
    once(fact_cases(FactId, Cases, LimitReached)),
    findall(G-C-P, member(case(_, _, _, _, G, C, P), Cases), Triples).

case_triples(FactId, Triples) :-
    case_triples(FactId, Triples, false).

fact_case(FactId, Constraint, Case) :-
    fact_cases(FactId, Cases, _),
    member(Case, Cases),
    Case = case(_, _, _, _, _, Constraint, _),
    !.

covering(FactId, Constraint, ScenarioIds, Covering) :-
    fact_case(FactId, Constraint, Case),
    case_covering_scenarios(ScenarioIds, Case, Covering).

all_scenarios([
    'S-OK', 'S-OK-TWICE', 'S-DRAFT', 'S-REJ-EQ5', 'S-OTHER', 'S-WEAK', 'S-STR', 'S-ERR',
    'S-REJ', 'S-REJ-GT4', 'S-REJ-NUM-GT4', 'S-FORBID', 'S-SUCCESS-EQ7', 'S-SET-INC-AC', 'S-SET-INC-C-OK', 'S-SET-EQ-A', 'S-SET-EXC-A',
    'S-SET-INC-C', 'S-SET-INC-A', 'S-SET-INC-X', 'S-SET-SUB-X'
]).

:- begin_tests(cases_generation, [setup(cases_kb_open), cleanup(cases_kb_close)]).

test(case_limit_is_twelve) :-
    case_limit(Limit),
    Limit == 12.

test(an_upper_bound_yields_its_boundary_and_counts) :-
    once(fact_cases('F-LTE5', Cases, LimitReached)),
    LimitReached == false,
    Cases == [
        case('CASE-E9F2F4E52838', 'CLAIM-A', 'F-LTE5', 'svc.api'-limit, boundary, num(int, eq, 5), success),
        case('CASE-3E63A2D64A14', 'CLAIM-A', 'F-LTE5', 'svc.api'-limit, boundary, num(int, gt, 5), rejection),
        case('CASE-679C55909FE9', 'CLAIM-A', 'F-LTE5', 'svc.api'-limit, cardinality, num(int, eq, 0), success),
        case('CASE-6819973A9AAB', 'CLAIM-A', 'F-LTE5', 'svc.api'-limit, cardinality, num(int, eq, 1), success)
    ].

test(a_fact_without_a_claim_key_uses_its_id) :-
    once(fact_cases('F-LT5', Cases, false)),
    Cases == [
        case('CASE-5CE5187AE318', 'F-LT5', 'F-LT5', 'svc.api'-limit, boundary, num(int, eq, 4), success),
        case('CASE-66CBE874857C', 'F-LT5', 'F-LT5', 'svc.api'-limit, boundary, num(int, gte, 5), rejection),
        case('CASE-A491669BC1F1', 'F-LT5', 'F-LT5', 'svc.api'-limit, cardinality, num(int, eq, 0), success),
        case('CASE-C4A3FBA2174C', 'F-LT5', 'F-LT5', 'svc.api'-limit, cardinality, num(int, eq, 1), success)
    ].

test(integer_lower_bounds) :-
    case_triples('F-GT0', GT0),
    GT0 == [boundary-num(int, eq, 1)-success, boundary-num(int, lte, 0)-rejection],
    case_triples('F-GTE1', GTE1),
    GTE1 == [boundary-num(int, eq, 1)-success, boundary-num(int, lt, 1)-rejection,
             cardinality-num(int, gte, 2)-success],
    case_triples('F-GTEM1', GTEM1),
    GTEM1 == [boundary-num(int, eq, -1)-success],
    case_triples('F-GTM1', GTM1),
    GTM1 == [boundary-num(int, eq, 0)-success],
    case_triples('F-GTE0', GTE0),
    GTE0 == [boundary-num(int, eq, 0)-success].

test(counts_start_at_a_bound_of_one) :-
    case_triples('F-LTE1', LTE1),
    LTE1 == [boundary-num(int, eq, 1)-success, boundary-num(int, gt, 1)-rejection,
             cardinality-num(int, eq, 0)-success],
    case_triples('F-LTE2', LTE2),
    LTE2 == [boundary-num(int, eq, 2)-success, boundary-num(int, gt, 2)-rejection,
             cardinality-num(int, eq, 0)-success, cardinality-num(int, eq, 1)-success],
    case_triples('F-GTE2', GTE2),
    GTE2 == [boundary-num(int, eq, 2)-success, boundary-num(int, lt, 2)-rejection,
             cardinality-num(int, gte, 2)-success].

test(equality_and_inequality) :-
    case_triples('F-EQ0', EQ0),
    EQ0 == [boundary-num(int, eq, 0)-success, boundary-num(int, gt, 0)-rejection],
    case_triples('F-EQ5', EQ5),
    EQ5 == [boundary-num(int, eq, 5)-success, boundary-num(int, gt, 5)-rejection,
            boundary-num(int, lt, 5)-rejection],
    case_triples('F-NEQ3', NEQ3),
    NEQ3 == [boundary-num(int, eq, 3)-rejection, boundary-num(int, gt, 3)-success,
             boundary-num(int, lt, 3)-success].

test(number_bounds_have_no_inside_value_or_counts) :-
    case_triples('F-NUM', NUM),
    NUM == [boundary-num(number, eq, 2.5)-success, boundary-num(number, gt, 2.5)-rejection],
    case_triples('F-NUMGT0', NUMGT0),
    NUMGT0 == [boundary-num(number, lte, 0.0)-rejection],
    case_triples('F-NUMGTE0', NUMGTE0),
    NUMGTE0 == [boundary-num(number, eq, 0.0)-success, boundary-num(number, lt, 0.0)-rejection].

test(forbid_negates_the_operator) :-
    case_triples('F-FORBID', Forbid),
    Forbid == [boundary-num(int, eq, 5)-success, boundary-num(int, lt, 5)-rejection],
    case_triples('F-SETFORBID', SetForbid),
    SetForbid == [excluded_member-excluded(a)-rejection],
    case_triples('F-FORBIDEXC', ForbidExc),
    ForbidExc == [member-member(x)-success, non_member-non_member([x])-unspecified].

test(forbid_keeps_an_operator_without_a_negation) :-
    case_triples('F-FORBIDSUB', ForbidSub),
    ForbidSub == [member-member(a)-success, non_member-non_member([a])-rejection].

test(set_facts) :-
    case_triples('F-SETEQ', Eq),
    Eq == [member-member(a)-success, member-member(b)-success, non_member-non_member([a, b])-rejection],
    case_triples('F-SETINC', Inc),
    Inc == [member-member(a)-success, non_member-non_member([a])-unspecified],
    case_triples('F-SETSUB', Sub),
    Sub == [member-member(a)-success, member-member(b)-success, non_member-non_member([a, b])-rejection],
    case_triples('F-SETEXC', Exc),
    Exc == [excluded_member-excluded(x)-rejection],
    case_triples('F-SETEXC2', Exc2),
    Exc2 == [excluded_member-excluded(x)-rejection, excluded_member-excluded(y)-rejection].

test(facts_without_cases) :-
    case_triples('F-STR', Str),
    Str == [],
    \+ fact_cases('F-PLAIN', _, _),
    forall(member(Legacy, ['F-L-BOOL', 'F-L-ATOM', 'F-L-SET']),
           (   case_triples(Legacy, Triples),
               Triples == []
           )),
    \+ fact_cases('F-MISSING', _, _).

test(twelve_cases_fit_the_limit) :-
    case_triples('F-SET11', Triples, LimitReached),
    LimitReached == false,
    length(Triples, 12),
    last(Triples, Last),
    Last == non_member-non_member([m01, m02, m03, m04, m05, m06, m07, m08, m09, m10, m11])-rejection.

test(the_thirteenth_case_is_left_out) :-
    case_triples('F-SET12', Triples, LimitReached),
    LimitReached == true,
    length(Triples, 12),
    last(Triples, Last),
    Last == member-member(m12)-success.

test(fact_cases_answers_once) :-
    forall(member(Fact, ['F-LTE5', 'F-LT5', 'F-GTE1', 'F-NEQ3', 'F-FORBID', 'F-SETFORBID', 'F-SETEQ', 'F-SET12']),
           (   findall(Cases, fact_cases(Fact, Cases, _), Answers),
               length(Answers, 1)
           )).

% Integer classes nest by integer reasoning: x > 4 is x >= 5.
test(integer_classes_use_integer_reasoning) :-
    cases:subsumed_constraint(num(int, gt, 4), num(int, gte, 5)),
    \+ cases:subsumed_constraint(num(number, gt, 4), num(number, gte, 5)),
    \+ cases:subsumed_constraint(member(a), member(a)),
    cases:numeric_prediction(int, gte, 5, gt, 4, Int),
    Int == success,
    \+ cases:numeric_prediction(number, gte, 5, gt, 4, _),
    cases:numeric_prediction(int, lt, 5, gt, 4, IntRejection),
    IntRejection == rejection,
    cases:integer_variables(int, Var, IntVars),
    IntVars == [Var],
    cases:integer_variables(number, _, NumberVars),
    NumberVars == [].

test(requirement_cases_follow_fact_order) :-
    requirement_cases('REQ-TWO', Cases),
    findall(Fact-G-C-P, member(case(_, _, Fact, _, G, C, P), Cases), Triples),
    Triples == [
        'F-GT0'-boundary-num(int, eq, 1)-success,
        'F-GT0'-boundary-num(int, lte, 0)-rejection,
        'F-SETINC'-member-member(a)-success,
        'F-SETINC'-non_member-non_member([a])-unspecified
    ],
    requirement_cases('REQ-NONE', None),
    None == [].

:- end_tests(cases_generation).

:- begin_tests(cases_coverage, [setup(cases_kb_open), cleanup(cases_kb_close)]).

test(a_success_case_is_covered_by_entailing_success_scenarios) :-
    all_scenarios(All),
    covering('F-LTE5', num(int, eq, 5), All, Covering),
    Covering == ['S-OK', 'S-OK-TWICE'].

test(only_the_listed_scenarios_count) :-
    covering('F-LTE5', num(int, eq, 5), ['S-OK-TWICE', 'S-WEAK'], Covering),
    Covering == ['S-OK-TWICE'],
    covering('F-LTE5', num(int, eq, 5), [], None),
    None == [].

test(a_rejection_case_is_covered_by_rejection_and_error_scenarios) :-
    all_scenarios(All),
    covering('F-LTE5', num(int, gt, 5), All, Covering),
    Covering == ['S-ERR', 'S-FORBID', 'S-REJ'].

test(numeric_assumptions_need_a_numeric_value) :-
    fact_case('F-LTE5', num(int, eq, 5), Case),
    \+ cases:assumption_entails('F-L-ATOM', 'svc.api'-limit, num(int, eq, 5)),
    \+ cases:assumption_entails('F-L-BOOL', 'svc.api'-limit, num(int, eq, 1)),
    case_covering_scenarios(['S-OK'], Case, Covering),
    Covering == ['S-OK'].

% An integer assumption x > 4 lands in the class x >= 5; a number one
% does not.
test(integer_assumptions_use_integer_reasoning) :-
    all_scenarios(All),
    covering('F-LT5', num(int, gte, 5), All, Covering),
    Covering == ['S-ERR', 'S-FORBID', 'S-REJ', 'S-REJ-EQ5', 'S-REJ-GT4'].

test(set_member_cases) :-
    all_scenarios(All),
    covering('F-SETEQ', member(a), All, Covering),
    Covering == ['S-SET-EQ-A', 'S-SET-INC-AC'].

test(set_non_member_cases) :-
    all_scenarios(All),
    covering('F-SETEQ', non_member([a, b]), All, Covering),
    Covering == ['S-SET-INC-C', 'S-SET-INC-X'].

test(set_excluded_cases) :-
    all_scenarios(All),
    covering('F-SETEXC', excluded(x), All, Covering),
    Covering == ['S-SET-INC-X'].

test(unspecified_cases_are_never_covered) :-
    all_scenarios(All),
    covering('F-SETINC', non_member([a]), All, Covering),
    Covering == [].

:- end_tests(cases_coverage).

:- begin_tests(cases_reporting, [setup(cases_kb_open), cleanup(cases_kb_close)]).

test(numeric_case_dict) :-
    fact_case('F-LTE5', num(int, gt, 5), Case),
    case_dict(Case, Dict),
    same(Dict, _{
        caseId: 'CASE-3E63A2D64A14', claimKey: 'CLAIM-A', factId: 'F-LTE5',
        subjectKey: 'svc.api', propertyKey: limit, generator: boundary,
        constraint: "gt 5", predicted: rejection,
        assumption: _{fact_kind: property_value, subject_key: 'svc.api', property_key: limit,
                      operator: gt, value_type: int, value: 5}
    }).

test(member_case_dict) :-
    fact_case('F-SETEQ', member(b), Case),
    case_dict(Case, Dict),
    same(Dict, _{
        caseId: 'CASE-BB63C8850C34', claimKey: 'F-SETEQ', factId: 'F-SETEQ',
        subjectKey: 'svc.api', propertyKey: limit, generator: member,
        constraint: "includes b", predicted: success,
        assumption: _{fact_kind: property_value, subject_key: 'svc.api', property_key: limit,
                      operator: includes, value_type: set, value: [b]}
    }).

test(non_member_case_dict) :-
    fact_case('F-SETEQ', non_member(_), Case),
    case_dict(Case, Dict),
    same(Dict, _{
        caseId: 'CASE-58F01A7906E9', claimKey: 'F-SETEQ', factId: 'F-SETEQ',
        subjectKey: 'svc.api', propertyKey: limit, generator: non_member,
        constraint: "includes a value outside [a, b]", predicted: rejection,
        assumption: _{fact_kind: property_value, subject_key: 'svc.api', property_key: limit,
                      operator: includes, value_type: set, value: ['<a value outside the set>']}
    }).

test(excluded_case_dict) :-
    fact_case('F-SETEXC', excluded(_), Case),
    case_dict(Case, Dict),
    same(Dict, _{
        caseId: 'CASE-E344C095B0FB', claimKey: 'F-SETEXC', factId: 'F-SETEXC',
        subjectKey: 'svc.api', propertyKey: limit, generator: excluded_member,
        constraint: "includes x", predicted: rejection,
        assumption: _{fact_kind: property_value, subject_key: 'svc.api', property_key: limit,
                      operator: includes, value_type: set, value: [x]}
    }).

test(no_waiver) :-
    fact_case_waiver('F-LTE5', Waiver),
    same(Waiver, _{}),
    fact_case_waiver('F-MISSING', Missing),
    same(Missing, _{}).

:- end_tests(cases_reporting).

:- begin_tests(cases_waivers).

waiver_fact(Id, Extra) :-
    property_fact(Id, [operator=eq, value_type=int, value_int=1|Extra]).

waiver(Extra, Waiver) :-
    with_fixture_kb((
        waiver_fact('F-W', Extra),
        fact_case_waiver('F-W', Waiver)
    )).

test(an_approved_waiver) :-
    waiver([case_waiver="unit suite walks every member", case_waiver_approved_by="alice"], Waiver),
    same(Waiver, _{reason: "unit suite walks every member", approvedBy: "alice"}).

test(an_unapproved_waiver) :-
    waiver([case_waiver="cannot happen"], Waiver),
    same(Waiver, _{reason: "cannot happen"}).

test(an_empty_approver_does_not_approve) :-
    waiver([case_waiver="cannot happen", case_waiver_approved_by=""], Waiver),
    same(Waiver, _{reason: "cannot happen"}).

test(an_empty_reason_is_no_waiver) :-
    waiver([case_waiver="", case_waiver_approved_by="alice"], Waiver),
    same(Waiver, _{}).

:- end_tests(cases_waivers).
