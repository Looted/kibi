:- use_module(library(plunit)).
:- use_module(library(http/json)).
:- use_module('../src/claim_obligations.pl').
:- use_module(kb_fixture).
:- use_module(cert_fixture, []).
:- use_module(test_helpers).

% What a certificate of each kind must establish for the fact grounding a
% claim, and the JSON rows `kibi prove`, the proof-contract-claims rule and
% the schema 12 migration read.  Every KB is a fresh fixture store; facts the
% validator would refuse are written with cert_fixture:raw_entity/3.

%% co_obligation(+FactId, +Kind, +Expected)
% The fact derives Expected for Kind (an obligation dict compared by keys
% and values, attested, or incompatible(Reason)), as its only answer.
co_obligation(FactId, Kind, Expected) :-
    first_answer_is_last(claim_obligations:fact_obligation(FactId, Kind, Result)),
    (   Result = obligation(Dict), Expected = obligation(ExpectedDict)
    ->  same(Dict, ExpectedDict)
    ;   Result == Expected
    ->  true
    ;   print_message(error, format("~w under ~w: expected ~q, got ~q", [FactId, Kind, Expected, Result])),
        fail
    ).

% --- set facts ----------------------------------------------------------------

:- begin_tests(claim_obligations_sets).

set_fact(Id, Property, Operator, Members) :-
    fixture_entity(fact, Id, [fact_kind=property_value, subject_key="s", property_key=Property,
                              operator=Operator, value_type=set, value_set=Members]).

test(eq_set_under_each_kind) :-
    with_fixture_kb((
        set_fact('F-SET', "colors", eq, ["red", "blue", "red"]),
        co_obligation('F-SET', exhaustive, obligation(_{kind: "set_equals", members: ["blue", "red"]})),
        co_obligation('F-SET', typecheck, obligation(_{kind: "set_equals", members: ["blue", "red"]})),
        co_obligation('F-SET', rule, obligation(_{kind: "every_member", predicate: "colors", members: ["blue", "red"]})),
        co_obligation('F-SET', source, obligation(_{kind: "set_relation", operator: "eq", members: ["blue", "red"]})),
        co_obligation('F-SET', regex,
            incompatible("F-SET is a set fact, which a regex certificate cannot express (use exhaustive, typecheck, rule or state_machine)")),
        co_obligation('F-SET', arithmetic,
            incompatible("F-SET is a set fact, which an arithmetic certificate cannot express (use exhaustive, typecheck, rule or state_machine)")),
        co_obligation('F-SET', smt,
            incompatible("F-SET is a set fact, which an smt certificate cannot express (use exhaustive, typecheck, rule or state_machine)")),
        co_obligation('F-SET', state_machine,
            incompatible("F-SET is a set fact whose property is not a machine projection (transitions, states, initial_states, terminal_states, reachable_states, reachable_pairs or required_waypoints)"))
    )).

test(required_and_nullable_fields) :-
    with_fixture_kb((
        set_fact('F-REQ', "required_fields", eq, ["id", "name"]),
        set_fact('F-NULL', "nullable_fields", eq, ["note"]),
        set_fact('F-REQ-IN', "required_fields", includes, ["id"]),
        set_fact('F-NULL-IN', "nullable_fields", includes, ["note"]),
        set_fact('F-REQ-SUB', "required_fields", subset_of, ["id"]),
        set_fact('F-NULL-EX', "nullable_fields", excludes, ["id"]),
        co_obligation('F-REQ', typecheck, obligation(_{kind: "required_fields", members: ["id", "name"]})),
        co_obligation('F-REQ', exhaustive, obligation(_{kind: "set_equals", members: ["id", "name"]})),
        co_obligation('F-REQ', source, obligation(_{kind: "required_fields", members: ["id", "name"]})),
        co_obligation('F-NULL', source, obligation(_{kind: "nullable_fields", members: ["note"]})),
        co_obligation('F-NULL', typecheck, obligation(_{kind: "set_equals", members: ["note"]})),
        co_obligation('F-REQ-IN', source, obligation(_{kind: "required_fields", members: ["id"]})),
        co_obligation('F-NULL-IN', source, obligation(_{kind: "nullable_fields", members: ["note"]})),
        co_obligation('F-REQ-IN', typecheck, obligation(_{kind: "required_fields", members: ["id"]})),
        co_obligation('F-REQ-SUB', source,
            incompatible("F-REQ-SUB is a required_fields fact with operator subset_of; a source proof decides required_fields only with eq or includes (to bound the fields, use a columns or fields fact)")),
        co_obligation('F-NULL-EX', source,
            incompatible("F-NULL-EX is a nullable_fields fact with operator excludes; a source proof decides nullable_fields only with eq or includes (to bound the fields, use a columns or fields fact)"))
    )).

test(includes_sets_state_containment) :-
    with_fixture_kb((
        set_fact('F-IN', "renders", includes, ["red"]),
        set_fact('F-IN-REQ', "required_fields", includes, ["id"]),
        co_obligation('F-IN', rule, obligation(_{kind: "every_member", predicate: "renders", members: ["red"]})),
        co_obligation('F-IN-REQ', rule, obligation(_{kind: "every_member", predicate: "required_fields", members: ["id"]})),
        co_obligation('F-IN', typecheck,
            incompatible("F-IN is an includes set fact (every member has the property), which a typecheck certificate cannot derive: it compares the whole set (use rule, or an eq set fact for exactly these members)")),
        co_obligation('F-IN', exhaustive,
            incompatible("F-IN is an includes set fact (every member has the property), which a exhaustive certificate cannot derive: it compares the whole set (use rule, or an eq set fact for exactly these members)")),
        co_obligation('F-IN-REQ', exhaustive,
            incompatible("F-IN-REQ is an includes set fact (every member has the property), which a exhaustive certificate cannot derive: it compares the whole set (use rule, or an eq set fact for exactly these members)")),
        co_obligation('F-IN', source, obligation(_{kind: "set_relation", operator: "includes", members: ["red"]}))
    )).

test(subset_and_excludes_sets_need_source_or_state_machine) :-
    with_fixture_kb((
        set_fact('F-SUB', "imports", subset_of, ["a"]),
        set_fact('F-EX', "imports", excludes, ["b"]),
        co_obligation('F-SUB', exhaustive,
            incompatible("F-SUB is a subset_of set fact, which only source and state_machine certificates can derive (a exhaustive certificate compares the whole set)")),
        co_obligation('F-EX', rule,
            incompatible("F-EX is a excludes set fact, which only source and state_machine certificates can derive (a rule certificate compares the whole set)")),
        co_obligation('F-SUB', source, obligation(_{kind: "set_relation", operator: "subset_of", members: ["a"]})),
        co_obligation('F-EX', source, obligation(_{kind: "set_relation", operator: "excludes", members: ["b"]}))
    )).

test(middleware_and_precedes_under_source) :-
    with_fixture_kb((
        set_fact('F-MW', "middleware", excludes, ["auth"]),
        set_fact('F-PRE', "precedes", includes, ["a -> b"]),
        set_fact('F-PRE-EQ', "precedes", eq, ["a -> b"]),
        co_obligation('F-MW', source, obligation(_{kind: "route_middleware", operator: "excludes", members: ["auth"]})),
        co_obligation('F-PRE', source, obligation(_{kind: "sequence_precedes", members: ["a -> b"]})),
        co_obligation('F-PRE-EQ', source,
            incompatible("F-PRE-EQ is a precedes fact with operator eq; a source proof decides precedes only with includes (each member \"A -> B\" holds)"))
    )).

test(set_fact_without_a_property) :-
    with_fixture_kb((
        cert_fixture:raw_entity(fact, 'F-BARE', [fact_kind=property_value, value_type=set, value_set=["x"]]),
        co_obligation('F-BARE', rule,
            incompatible("F-BARE is a set fact with no property to read as the predicate every member satisfies")),
        co_obligation('F-BARE', exhaustive, obligation(_{kind: "set_equals", members: ["x"]})),
        co_obligation('F-BARE', source, obligation(_{kind: "set_relation", operator: "eq", members: ["x"]})),
        co_obligation('F-BARE', state_machine,
            incompatible("F-BARE is a set fact whose property is not a machine projection (transitions, states, initial_states, terminal_states, reachable_states, reachable_pairs or required_waypoints)"))
    )).

test(facts_that_are_not_sets) :-
    with_fixture_kb((
        fixture_entity(fact, 'F-FORBID', [fact_kind=property_value, subject_key="s", property_key="colors",
                                          operator=eq, value_type=set, value_set=["x"], polarity=forbid]),
        set_fact('F-EMPTY', "colors", eq, []),
        set_fact('F-NEQ', "colors", neq, ["x"]),
        fixture_entity(fact, 'F-SUBJECT', [fact_kind=subject, subject_key="s"]),
        cert_fixture:raw_entity(fact, 'F-OBS', [fact_kind=observation, value_type=set, value_set=["x"]]),
        co_obligation('F-FORBID', exhaustive, attested),
        co_obligation('F-EMPTY', exhaustive, attested),
        co_obligation('F-NEQ', exhaustive, attested),
        co_obligation('F-SUBJECT', exhaustive, attested),
        co_obligation('F-OBS', exhaustive, attested),
        co_obligation('F-NONE', rule, attested)
    )).

test(legacy_allowed_values) :-
    with_fixture_kb((
        fixture_entity(fact, 'F-LEGACY', [fact_kind=property_value, subject_key="s", property_key="allowed_values",
                                          operator=eq, value_type=string, value_string="open| closed ||"]),
        cert_fixture:raw_entity(fact, 'F-UNTYPED', [fact_kind=property_value, property_key="allowed_values",
                                                    operator="includes", value_string="a|b"]),
        cert_fixture:raw_entity(fact, 'F-INT', [fact_kind=property_value, property_key="allowed_values",
                                                value_type="int", value_string="a|b"]),
        cert_fixture:raw_entity(fact, 'F-NOVALUE', [fact_kind=property_value, property_key="allowed_values",
                                                    value_type="string"]),
        fixture_entity(fact, 'F-BLANK', [fact_kind=property_value, subject_key="s", property_key="allowed_values",
                                         operator=eq, value_type=string, value_string="|"]),
        co_obligation('F-LEGACY', exhaustive, obligation(_{kind: "set_equals", members: ["closed", "open"]})),
        co_obligation('F-UNTYPED', rule, obligation(_{kind: "every_member", predicate: "allowed_values", members: ["a", "b"]})),
        co_obligation('F-INT', exhaustive, attested),
        co_obligation('F-NOVALUE', exhaustive, attested),
        % An empty legacy set is no set, and allowed_values is never a string constraint.
        co_obligation('F-BLANK', exhaustive, attested),
        co_obligation('F-BLANK', regex, attested)
    )).

:- end_tests(claim_obligations_sets).

% --- state machine sets -------------------------------------------------------

:- begin_tests(claim_obligations_machines).

machine_fact(Id, Property, Operator, Members) :-
    fixture_entity(fact, Id, [fact_kind=property_value, subject_key="m", property_key=Property,
                              operator=Operator, value_type=set, value_set=Members]).

test(projections_eq_and_relations) :-
    with_fixture_kb((
        machine_fact('F-TR', "transitions", eq, ["b -> a", "a\x2192\ c", "a->b", "solo"]),
        machine_fact('F-ST', "states", eq, ["b", "a", "x via y"]),
        machine_fact('F-INIT', "initial_states", subset_of, ["a"]),
        machine_fact('F-TERM', "terminal_states", excludes, ["z"]),
        machine_fact('F-REACH', "reachable_states", includes, ["c"]),
        machine_fact('F-PAIRS', "reachable_pairs", eq, ["b->c", " a -> b "]),
        co_obligation('F-TR', state_machine,
            obligation(_{kind: "machine_set", projection: "transitions", members: ["a->b", "a->c", "b->a", "solo->"]})),
        co_obligation('F-ST', state_machine, obligation(_{kind: "machine_set", projection: "states", members: ["a", "b", "x via y"]})),
        co_obligation('F-ST', exhaustive, obligation(_{kind: "set_equals", members: ["a", "b", "x via y"]})),
        co_obligation('F-INIT', state_machine,
            obligation(_{kind: "machine_relation", projection: "initial_states", operator: "subset_of", members: ["a"]})),
        co_obligation('F-TERM', state_machine,
            obligation(_{kind: "machine_relation", projection: "terminal_states", operator: "excludes", members: ["z"]})),
        co_obligation('F-REACH', state_machine,
            obligation(_{kind: "machine_relation", projection: "reachable_states", operator: "includes", members: ["c"]})),
        co_obligation('F-PAIRS', state_machine,
            obligation(_{kind: "machine_set", projection: "reachable_pairs", members: ["a->b", "b->c"]}))
    )).

test(required_waypoints) :-
    with_fixture_kb((
        machine_fact('F-WAY', "required_waypoints", includes, ["b -> a  via  x ", "a\x2192\c via b", "a->c via b", "plain"]),
        machine_fact('F-WAY-EQ', "required_waypoints", eq, ["a -> c via b"]),
        machine_fact('F-WAY-SUB', "required_waypoints", subset_of, ["a -> c via b"]),
        machine_fact('F-WAY-BAD', "required_waypoints", excludes, ["a -> c", "a via"]),
        co_obligation('F-WAY', state_machine,
            obligation(_{kind: "machine_relation", projection: "required_waypoints", operator: "includes",
                         members: ["a->c via b", "b->a via x", "plain"]})),
        co_obligation('F-WAY-EQ', state_machine,
            obligation(_{kind: "machine_relation", projection: "required_waypoints", operator: "eq",
                         members: ["a->c via b"]})),
        co_obligation('F-WAY-SUB', state_machine,
            incompatible("F-WAY-SUB names required waypoints with subset_of; state each waypoint with includes (they hold) or excludes (they do not)")),
        co_obligation('F-WAY-BAD', state_machine,
            incompatible("F-WAY-BAD names required waypoints that are not spelled \"from->to via state\""))
    )).

:- end_tests(claim_obligations_machines).

% --- numeric, rule, predicate and string facts --------------------------------

:- begin_tests(claim_obligations_other_facts).

numeric_fact(Id, Operator, Type, Value, Extra) :-
    (   Type == int -> Field = value_int ; Field = value_number ),
    append([fact_kind=property_value, subject_key="client", property_key="retries",
            operator=Operator, value_type=Type, Field=Value], Extra, Props),
    fixture_entity(fact, Id, Props).

numeric(Variable, Type, Operator, Value,
        obligation(_{kind: "numeric_constraint", variable: Variable, value_type: Type,
                     operator: Operator, value: Value})).

test(numeric_constraints) :-
    with_fixture_kb((
        numeric_fact('F-MIN', gte, int, 0, []),
        numeric_fact('F-REAL', lt, number, 2.5, []),
        numeric_fact('F-WHOLE', eq, number, 3, []),
        numeric("retries", "int", "gte", 0, Min), co_obligation('F-MIN', arithmetic, Min),
        co_obligation('F-MIN', smt, Min),
        numeric("retries", "real", "lt", 2.5, Real), co_obligation('F-REAL', smt, Real),
        claim_obligations:fact_obligation('F-MIN', arithmetic, obligation(MinDict)),
        MinDict.value == 0,
        claim_obligations:fact_obligation('F-WHOLE', arithmetic, obligation(WholeDict)),
        WholeDict.value == 3.0,
        co_obligation('F-MIN', exhaustive,
            incompatible("F-MIN is a numeric fact, which an exhaustive certificate cannot express (use arithmetic or smt)")),
        co_obligation('F-MIN', typecheck,
            incompatible("F-MIN is a numeric fact, which a typecheck certificate cannot express (use arithmetic or smt)")),
        co_obligation('F-MIN', source,
            incompatible("F-MIN is a numeric fact, which a source certificate cannot express (use arithmetic or smt)")),
        co_obligation('F-MIN', rule,
            incompatible("F-MIN is a numeric fact, which a rule certificate cannot express (use arithmetic or smt)")),
        co_obligation('F-MIN', state_machine,
            incompatible("F-MIN is a numeric fact, which a state_machine certificate cannot express (use arithmetic or smt)")),
        co_obligation('F-MIN', regex,
            incompatible("F-MIN is a numeric fact, which a regex certificate cannot express (use arithmetic or smt)"))
    )).

test(forbid_negates_each_operator) :-
    with_fixture_kb((
        forall(member(Op-Negated, [eq-"neq", neq-"eq", lt-"gte", lte-"gt", gt-"lte", gte-"lt"]),
               (   atom_concat('F-FORBID-', Op, Id),
                   numeric_fact(Id, Op, int, 5, [polarity=forbid]),
                   numeric("retries", "int", Negated, 5, Obligation),
                   co_obligation(Id, smt, Obligation)
               )),
        numeric_fact('F-REQUIRE', gt, int, 5, [polarity=require]),
        numeric("retries", "int", "gt", 5, Require), co_obligation('F-REQUIRE', smt, Require)
    )).

test(numeric_values_as_stored) :-
    with_fixture_kb((
        cert_fixture:raw_entity(fact, 'F-TEXT', [fact_kind=property_value, subject_key="c", property_key="n",
                                                 operator="lte", value_type="int", value_int="7"]),
        cert_fixture:raw_entity(fact, 'F-FRACTION', [fact_kind=property_value, subject_key="c", property_key="n",
                                                     operator="gt", value_type="int", value_int=2.5]),
        cert_fixture:raw_entity(fact, 'F-MATCHES', [fact_kind=property_value, subject_key="c", property_key="n",
                                                    operator="matches", value_type="int", value_int=1]),
        cert_fixture:raw_entity(fact, 'F-BOOL', [fact_kind=property_value, subject_key="c", property_key="n",
                                                 operator="eq", value_type="bool", value_bool=true]),
        numeric("n", "int", "lte", 7, Text), co_obligation('F-TEXT', smt, Text),
        claim_obligations:fact_obligation('F-TEXT', smt, obligation(TextDict)),
        TextDict.value == 7,
        claim_obligations:fact_obligation('F-FRACTION', smt, obligation(FractionDict)),
        FractionDict.value == 2.5,
        co_obligation('F-MATCHES', smt, attested),
        co_obligation('F-BOOL', smt, attested)
    )).

rule_fact(Id, Extra) :-
    append([fact_kind=rule, rule_ir="{\"kind\":\"rule\"}", rule_schema_id='FACT-SCHEMA', semantic_key="k"], Extra, Props),
    fixture_entity(fact, Id, Props).

test(rule_facts) :-
    with_fixture_kb((
        rule_fact('F-RULE', [rule_hash="abc"]),
        cert_fixture:raw_entity(fact, 'F-NOHASH', [fact_kind=rule, rule_ir="{}"]),
        cert_fixture:raw_entity(fact, 'F-NOIR', [fact_kind=rule, rule_hash="abc"]),
        co_obligation('F-RULE', rule, obligation(_{kind: "rule_holds", fact_id: "F-RULE", rule_hash: "abc"})),
        co_obligation('F-RULE', state_machine, obligation(_{kind: "rule_holds", fact_id: "F-RULE", rule_hash: "abc"})),
        co_obligation('F-NOHASH', rule, obligation(_{kind: "rule_holds", fact_id: "F-NOHASH", rule_hash: ""})),
        co_obligation('F-RULE', exhaustive, attested),
        co_obligation('F-RULE', regex, attested),
        co_obligation('F-NOIR', rule, attested)
    )).

predicate_fact(Id, Name, Args, Extra) :-
    append([fact_kind=predicate, predicate_name=Name, predicate_args=Args, canonical_key=Key], Extra, Props),
    atom_string(Id, Key),
    fixture_entity(fact, Id, Props).

holds(Name, Args, Value, obligation(_{kind: "predicate_holds", predicate: Name, args: Args, value: Value})).

test(predicate_facts) :-
    with_fixture_kb((
        predicate_fact('F-STAFF', "staff", ["coach"], []),
        predicate_fact('F-NOT-STAFF', "staff", ["guest", "x"], [polarity=deny]),
        predicate_fact('F-ALLOW', "permission_rule", ["coach", "read", "doc", "allow"], []),
        predicate_fact('F-DENIED', "permission_rule", ["coach", "write", "doc", "allow"], [polarity=deny]),
        predicate_fact('F-DENY', "permission_rule", ["guest", "read", "doc", "deny"], []),
        predicate_fact('F-SHORT', "permission_rule", ["coach", "read", "allow"], []),
        predicate_fact('F-OTHER-NS', "permission_rule", ["coach", "read", "doc", "allow"], [predicate_namespace="acme"]),
        holds("staff", ["coach"], true, Staff), co_obligation('F-STAFF', rule, Staff),
        holds("staff", ["guest", "x"], false, NotStaff), co_obligation('F-NOT-STAFF', state_machine, NotStaff),
        holds("permission_rule", ["coach", "read", "doc"], true, Allow), co_obligation('F-ALLOW', rule, Allow),
        holds("permission_rule", ["coach", "write", "doc"], false, Denied), co_obligation('F-DENIED', rule, Denied),
        holds("permission_rule", ["guest", "read", "doc"], false, Deny), co_obligation('F-DENY', rule, Deny),
        holds("permission_rule", ["coach", "read", "allow"], true, Short), co_obligation('F-SHORT', rule, Short),
        holds("permission_rule", ["coach", "read", "doc", "allow"], true, Other), co_obligation('F-OTHER-NS', rule, Other),
        cert_fixture:raw_entity(fact, 'F-PRED-IR', [fact_kind=predicate, predicate_name="staff",
                                                    predicate_args=["coach"], rule_ir="{}", rule_hash="h"]),
        holds("staff", ["coach"], true, WithIr), co_obligation('F-PRED-IR', rule, WithIr),
        co_obligation('F-STAFF', exhaustive, attested),
        co_obligation('F-STAFF', source, attested)
    )).

string_fact(Id, Operator, Value, Extra) :-
    append([fact_kind=property_value, subject_key="s", property_key="name",
            operator=Operator, value_type=string, value_string=Value], Extra, Props),
    fixture_entity(fact, Id, Props).

test(string_facts) :-
    with_fixture_kb((
        string_fact('F-EQ', eq, "admin", []),
        string_fact('F-NEQ', neq, "root", [polarity=forbid]),
        string_fact('F-MATCH', matches, "^a.*$", []),
        string_fact('F-LT', lt, "b", []),
        co_obligation('F-EQ', regex, obligation(_{kind: "string_constraint", operator: "eq", value: "admin", polarity: "require"})),
        co_obligation('F-NEQ', regex, obligation(_{kind: "string_constraint", operator: "neq", value: "root", polarity: "forbid"})),
        co_obligation('F-MATCH', regex, obligation(_{kind: "string_constraint", operator: "matches", value: "^a.*$", polarity: "require"})),
        forall(member(Kind, [exhaustive, typecheck, arithmetic, smt]), co_obligation('F-EQ', Kind, attested)),
        co_obligation('F-EQ', source, incompatible("F-EQ is a string fact, which a source certificate cannot express (use regex)")),
        co_obligation('F-EQ', rule, incompatible("F-EQ is a string fact, which a rule certificate cannot express (use regex)")),
        co_obligation('F-EQ', state_machine, incompatible("F-EQ is a string fact, which a state_machine certificate cannot express (use regex)")),
        co_obligation('F-LT', regex, attested)
    )).

:- end_tests(claim_obligations_other_facts).

% --- comparing obligations ----------------------------------------------------

:- begin_tests(claim_obligations_equal).

eq(Left, Right) :- first_answer_is_last(claim_obligations:obligation_equal(Left, Right)).

test(sets_compare_unordered_whatever_the_text) :-
    eq(_{kind: "set_equals", members: ["b", "a", "a"]}, _{kind: set_equals, members: [a, b]}),
    eq(_{kind: "set_equals", members: [1, '^^'("x", xsd)]}, _{kind: "set_equals", members: ["1", x]}),
    \+ eq(_{kind: "set_equals", members: ["a"]}, _{kind: "set_equals", members: ["a", "b"]}),
    \+ eq(_{kind: "set_equals", members: [1]}, _{kind: "set_equals", members: [2]}),
    \+ eq(_{kind: "set_equals", members: "a"}, _{kind: "set_equals", members: "a"}),
    \+ eq(_{kind: "set_equals"}, _{kind: "set_equals"}).

member_kind(required_fields).
member_kind(nullable_fields).
member_kind(sequence_precedes).

test(member_lists) :-
    forall(member_kind(Kind),
           (   eq(_{kind: Kind, members: ["b", "a"]}, _{kind: Kind, members: [a, b, b]}),
               \+ eq(_{kind: Kind, members: ["a"]}, _{kind: Kind, members: ["b"]}),
               \+ eq(_{kind: Kind, members: ["a"]}, _{kind: set_equals, members: ["a"]}),
               \+ eq(_{kind: Kind, members: "a"}, _{kind: Kind, members: "a"})
           )).

test(members_with_a_predicate_or_operator) :-
    eq(_{kind: "every_member", predicate: "p", members: ["a"]}, _{kind: every_member, predicate: p, members: [a]}),
    \+ eq(_{kind: "every_member", predicate: "p", members: ["a"]}, _{kind: "every_member", predicate: "q", members: ["a"]}),
    \+ eq(_{kind: "every_member", predicate: "p", members: ["a"]}, _{kind: "every_member", predicate: "p", members: ["b"]}),
    forall(member(Kind, [set_relation, route_middleware]),
           (   eq(_{kind: Kind, operator: "eq", members: ["a"]}, _{kind: Kind, operator: eq, members: [a]}),
               \+ eq(_{kind: Kind, operator: "eq", members: ["a"]}, _{kind: Kind, operator: "excludes", members: ["a"]}),
               \+ eq(_{kind: Kind, operator: "eq", members: ["a"]}, _{kind: Kind, operator: "eq", members: ["b"]})
           )),
    \+ eq(_{kind: "set_relation", operator: "eq", members: ["a"]}, _{kind: "route_middleware", operator: "eq", members: ["a"]}).

test(machine_obligations) :-
    eq(_{kind: "machine_relation", projection: "states", operator: "includes", members: ["a"]},
       _{kind: machine_relation, projection: states, operator: includes, members: [a]}),
    \+ eq(_{kind: "machine_relation", projection: "states", operator: "includes", members: ["a"]},
          _{kind: "machine_relation", projection: "initial_states", operator: "includes", members: ["a"]}),
    \+ eq(_{kind: "machine_relation", projection: "states", operator: "includes", members: ["a"]},
          _{kind: "machine_relation", projection: "states", operator: "excludes", members: ["a"]}),
    \+ eq(_{kind: "machine_relation", projection: "states", operator: "includes", members: ["a"]},
          _{kind: "machine_relation", projection: "states", operator: "includes", members: ["b"]}),
    eq(_{kind: "machine_set", projection: "states", members: ["b", "a"]}, _{kind: machine_set, projection: states, members: [a, b]}),
    \+ eq(_{kind: "machine_set", projection: "states", members: ["a"]}, _{kind: "machine_set", projection: "transitions", members: ["a"]}),
    \+ eq(_{kind: "machine_set", projection: "states", members: ["a"]}, _{kind: "machine_set", projection: "states", members: ["b"]}),
    \+ eq(_{kind: "machine_set", projection: "states", members: ["a"]},
          _{kind: "machine_relation", projection: "states", operator: "eq", members: ["a"]}).

test(rules_and_predicates) :-
    eq(_{kind: "rule_holds", fact_id: "F", rule_hash: "h"}, _{kind: rule_holds, fact_id: 'F', rule_hash: h}),
    \+ eq(_{kind: "rule_holds", fact_id: "F", rule_hash: "h"}, _{kind: "rule_holds", fact_id: "G", rule_hash: "h"}),
    \+ eq(_{kind: "rule_holds", fact_id: "F", rule_hash: "h"}, _{kind: "rule_holds", fact_id: "F", rule_hash: "i"}),
    \+ eq(_{kind: "rule_holds", fact_id: "F"}, _{kind: "rule_holds", fact_id: "F"}),
    eq(_{kind: "predicate_holds", predicate: "p", args: ["a", 1], value: true},
       _{kind: predicate_holds, predicate: p, args: [a, "1"], value: "true"}),
    \+ eq(_{kind: "predicate_holds", predicate: "p", args: ["a"], value: true},
          _{kind: "predicate_holds", predicate: "q", args: ["a"], value: true}),
    \+ eq(_{kind: "predicate_holds", predicate: "p", args: ["a", "b"], value: true},
          _{kind: "predicate_holds", predicate: "p", args: ["b", "a"], value: true}),
    \+ eq(_{kind: "predicate_holds", predicate: "p", args: ["a"], value: true},
          _{kind: "predicate_holds", predicate: "p", args: ["a"], value: false}),
    \+ eq(_{kind: "predicate_holds", predicate: "p", args: "a", value: true},
          _{kind: "predicate_holds", predicate: "p", args: "a", value: true}).

test(strings_and_numbers) :-
    eq(_{kind: "string_constraint", operator: "eq", value: "a", polarity: "require"},
       _{kind: string_constraint, operator: eq, value: a, polarity: require}),
    \+ eq(_{kind: "string_constraint", operator: "eq", value: "a", polarity: "require"},
          _{kind: "string_constraint", operator: "neq", value: "a", polarity: "require"}),
    \+ eq(_{kind: "string_constraint", operator: "eq", value: "a", polarity: "require"},
          _{kind: "string_constraint", operator: "eq", value: "b", polarity: "require"}),
    \+ eq(_{kind: "string_constraint", operator: "eq", value: "a", polarity: "require"},
          _{kind: "string_constraint", operator: "eq", value: "a", polarity: "forbid"}),
    eq(_{kind: "numeric_constraint", variable: "x", value_type: "int", operator: "gte", value: 0},
       _{kind: numeric_constraint, variable: x, value_type: int, operator: gte, value: "0"}),
    eq(_{kind: "numeric_constraint", variable: "x", value_type: "real", operator: "lt", value: 2.5},
       _{kind: "numeric_constraint", variable: "x", value_type: "real", operator: "lt", value: '2.5'}),
    \+ eq(_{kind: "numeric_constraint", variable: "x", value_type: "int", operator: "gte", value: 0},
          _{kind: "numeric_constraint", variable: "y", value_type: "int", operator: "gte", value: 0}),
    \+ eq(_{kind: "numeric_constraint", variable: "x", value_type: "int", operator: "gte", value: 0},
          _{kind: "numeric_constraint", variable: "x", value_type: "real", operator: "gte", value: 0}),
    \+ eq(_{kind: "numeric_constraint", variable: "x", value_type: "int", operator: "gte", value: 0},
          _{kind: "numeric_constraint", variable: "x", value_type: "int", operator: "gt", value: 0}),
    \+ eq(_{kind: "numeric_constraint", variable: "x", value_type: "int", operator: "gte", value: 0},
          _{kind: "numeric_constraint", variable: "x", value_type: "int", operator: "gte", value: 1}),
    \+ eq(_{kind: "numeric_constraint", variable: "x", value_type: "int", operator: "gte", value: "zero"},
          _{kind: "numeric_constraint", variable: "x", value_type: "int", operator: "gte", value: "zero"}).

% An obligation of another kind never matches one with the same fields.
test(the_kind_decides) :-
    forall(member(Fields, [_{predicate: "p", members: ["a"]},
                           _{projection: "states", operator: "eq", members: ["a"]},
                           _{fact_id: "F", rule_hash: "h"},
                           _{predicate: "p", args: ["a"], value: true},
                           _{operator: "eq", value: "a", polarity: "require"},
                           _{variable: "x", value_type: "int", operator: "eq", value: 1}]),
           forall(member(Kind, ["every_member", "machine_relation", "rule_holds", "predicate_holds",
                                "string_constraint", "numeric_constraint"]),
                  (   put_dict(kind, Fields, Kind, Real),
                      put_dict(kind, Fields, "other", Other),
                      \+ eq(Other, Real),
                      \+ eq(Real, Other)
                  ))).

test(anything_else_is_never_equal) :-
    \+ eq(_{kind: "unknown", members: ["a"]}, _{kind: "unknown", members: ["a"]}),
    \+ eq(_{members: ["a"]}, _{members: ["a"]}),
    \+ eq(_{kind: f(x)}, _{kind: f(x)}),
    \+ eq(not_a_dict, not_a_dict).

:- end_tests(claim_obligations_equal).

% --- claims and their grounding facts -----------------------------------------

:- begin_tests(claim_obligations_claims).

inventory(Entries, Json) :-
    atom_json_dict(Json0, Entries, [width(0)]),
    atom_string(Json0, Json).

claim(Key, Status, _{claim_key: Key, claim_text: "text", role: "normative", status: Status}).

claim_fact(Id, Key, Members) :-
    fixture_entity(fact, Id, [fact_kind=property_value, subject_key="s", property_key="colors",
                              operator=eq, value_type=set, value_set=Members,
                              claim_key=Key, claim_text="text"]).

claims_fixture :-
    maplist([K-S, E]>>claim(K, S, E),
            ["C-SET"-"modeled", "C-STRING"-"modeled", "C-STR-REGEX"-"modeled", "C-AMBIG"-"ambiguous",
             "C-CONTEXT"-"nonlogical", "C-LOOSE"-"modeled", "C-SET"-"ambiguous", "C-RULE"-"modeled",
             "C-PRED"-"modeled"],
            Entries),
    inventory(Entries, Json),
    fixture_entity(req, 'REQ', [status=open, semantic_inventory=Json]),
    claim_fact('F-SET', "C-SET", ["b", "a"]),
    fixture_entity(fact, 'F-STRING', [fact_kind=property_value, subject_key="s", property_key="name",
                                      operator=eq, value_type=string, value_string="x",
                                      claim_key="C-STRING", claim_text="text"]),
    fixture_entity(fact, 'F-RULE', [fact_kind=rule, rule_ir="{}", rule_hash="h", rule_schema_id='S',
                                    semantic_key="k", claim_key="C-RULE", claim_text="text"]),
    fixture_entity(fact, 'F-PRED', [fact_kind=predicate, predicate_name="staff", predicate_args=["coach"],
                                    canonical_key="k", claim_key="C-PRED", claim_text="text"]),
    % A fact the requirement links for another claim does not ground this one.
    claim_fact('F-OTHER', "C-ELSEWHERE", ["z"]),
    fixture_rel(requires_property, 'REQ', 'F-OTHER'),
    fixture_rel(requires_property, 'REQ', 'F-SET'),
    fixture_rel(requires_property, 'REQ', 'F-STRING'),
    fixture_rel(requires_rule, 'REQ', 'F-RULE'),
    fixture_rel(requires_predicate, 'REQ', 'F-PRED').

co_claim(Claim, Kind, Expected) :-
    first_answer_is_last(claim_obligations:claim_obligation(Claim, Kind, Result)),
    (   Result = obligation(FactId, Dict), Expected = obligation(FactId0, ExpectedDict)
    ->  FactId == FactId0,
        same(Dict, ExpectedDict)
    ;   Result == Expected
    ).

test(claims_resolve_to_their_fact) :-
    with_fixture_kb((
        claims_fixture,
        co_claim('REQ'-'C-SET', exhaustive, obligation('F-SET', _{kind: "set_equals", members: ["a", "b"]})),
        co_claim('REQ'-'C-STRING', exhaustive, attested('F-STRING')),
        co_claim('REQ'-'C-STRING', source,
                 incompatible('F-STRING', "F-STRING is a string fact, which a source certificate cannot express (use regex)")),
        co_claim('REQ'-'C-RULE', rule, obligation('F-RULE', _{kind: "rule_holds", fact_id: "F-RULE", rule_hash: "h"})),
        co_claim('REQ'-'C-PRED', rule,
                 obligation('F-PRED', _{kind: "predicate_holds", predicate: "staff", args: ["coach"], value: true})),
        co_claim('REQ'-'C-AMBIG', exhaustive, unresolved("claim C-AMBIG of REQ is ambiguous; resolve it before proving it")),
        co_claim('REQ'-'C-CONTEXT', exhaustive,
                 unresolved("claim C-CONTEXT of REQ is nonlogical: a nonlogical span is context, not a claim to prove")),
        co_claim('REQ'-'C-LOOSE', exhaustive, unresolved("claim C-LOOSE of REQ has no grounding fact")),
        co_claim('REQ'-'C-STR-REGEX', exhaustive, unresolved("claim C-STR-REGEX of REQ has no grounding fact")),
        co_claim('REQ'-'C-MISSING', exhaustive, unresolved("C-MISSING is not a claim of REQ")),
        co_claim('REQ-NONE'-'C-SET', exhaustive, unresolved("C-SET is not a claim of REQ-NONE"))
    )).

test(the_first_relation_grounds_a_claim) :-
    with_fixture_kb((
        claim(  "C-TWO", "modeled", Entry),
        inventory([Entry], Json),
        fixture_entity(req, 'REQ', [status=open, semantic_inventory=Json]),
        claim_fact('F-PROP', "C-TWO", ["p"]),
        fixture_entity(fact, 'F-PRED', [fact_kind=predicate, predicate_name="staff", predicate_args=["coach"],
                                        canonical_key="k", claim_key="C-TWO", claim_text="text"]),
        fixture_rel(requires_predicate, 'REQ', 'F-PRED'),
        fixture_rel(requires_property, 'REQ', 'F-PROP'),
        co_claim('REQ'-'C-TWO', exhaustive, obligation('F-PROP', _{kind: "set_equals", members: ["p"]}))
    )).

test(claim_status_first_entry_per_key_wins) :-
    with_fixture_kb((
        claims_fixture,
        first_answer_is_last(claim_obligations:requirement_claim_status('REQ', 'C-SET', Status)),
        Status == modeled,
        \+ claim_obligations:requirement_claim_status('REQ', 'C-SET', ambiguous),
        findall(Key-S, claim_obligations:requirement_claim_status('REQ', Key, S), Pairs),
        Pairs == ['C-SET'-modeled, 'C-STRING'-modeled, 'C-STR-REGEX'-modeled, 'C-AMBIG'-ambiguous,
                  'C-CONTEXT'-nonlogical, 'C-LOOSE'-modeled, 'C-RULE'-modeled, 'C-PRED'-modeled]
    )).

test(inventory_forms) :-
    with_fixture_kb((
        fixture_entity(req, 'REQ-TERMS', [status=open,
            semantic_inventory="[[claim_key='C-A', status=modeled], _, x, [status=ambiguous], [claim_key='C-B', status=draft]]"]),
        fixture_entity(req, 'REQ-OBJECT', [status=open, semantic_inventory="{\"claim_key\": \"C-A\"}"]),
        fixture_entity(req, 'REQ-BROKEN', [status=open, semantic_inventory="[unclosed"]),
        fixture_entity(req, 'REQ-NUMBER', [status=open, semantic_inventory="42"]),
        fixture_entity(req, 'REQ-EMPTY', [status=open]),
        cert_fixture:raw_entity(req, 'REQ-LIST', [semantic_inventory=[[claim_key="C-L", status="modeled"]]]),
        findall(K-S, claim_obligations:requirement_claim_status('REQ-TERMS', K, S), Terms),
        Terms == ['C-A'-modeled, 'C-B'-draft],
        findall(K-S, claim_obligations:requirement_claim_status('REQ-LIST', K, S), Listed),
        Listed == ['C-L'-modeled],
        \+ claim_obligations:requirement_claim_status('REQ-OBJECT', _, _),
        \+ claim_obligations:requirement_claim_status('REQ-BROKEN', _, _),
        \+ claim_obligations:requirement_claim_status('REQ-NUMBER', _, _),
        \+ claim_obligations:requirement_claim_status('REQ-EMPTY', _, _)
    )).

inventory_entries(Raw, Entries) :-
    first_answer_is_last(claim_obligations:inventory_list(Raw, Entries0)),
    Entries = Entries0.

test(inventory_list_reads_text) :-
    inventory_entries('[{"claim_key": "C"}]', [Entry]),
    get_dict(claim_key, Entry, Key), Key == "C",
    inventory_entries('[a]', Atoms), Atoms == [a],
    inventory_entries('^^'("[b]", xsd), Wrapped), Wrapped == [b],
    inventory_entries([x], Plain), Plain == [x],
    inventory_entries('{"claim_key": "C"}', Object), Object == [],
    inventory_entries(42, None), None == [],
    inventory_entries("x(", Broken), Broken == [].

:- end_tests(claim_obligations_claims).

% --- the JSON rows --------------------------------------------------------------

:- begin_tests(claim_obligations_json).

json_rows(Json, Rows) :-
    string(Json),
    \+ sub_string(Json, _, _, _, "\n"),
    atom_json_dict(Json, Rows, [value_string_as(string)]).

claim(Key, Status, _{claim_key: Key, claim_text: "text", role: "normative", status: Status}).

set_claim_fact(Id, Key, Operator) :-
    fixture_entity(fact, Id, [fact_kind=property_value, subject_key="s", property_key="colors",
                              operator=Operator, value_type=set, value_set=["red", "blue"],
                              claim_key=Key, claim_text="text"]).

requirement(ReqId, Status, Claims) :-
    maplist([K-S, E]>>claim(K, S, E), Claims, Entries),
    atom_json_dict(Json0, Entries, [width(0)]),
    atom_string(Json0, Json),
    fixture_entity(req, ReqId, [status=Status, semantic_inventory=Json]).

% REQ-A and REQ-B are reached through scenarios; REQ-OLD is deprecated and
% REQ-AWAY is reached by no scenario of the test.
json_fixture :-
    requirement('REQ-A', open, ["C-SET"-"modeled", "C-SHARED"-"modeled", "C-AMBIG"-"ambiguous", "C-NOFACT"-"modeled"]),
    requirement('REQ-B', in_progress, ["C-SHARED"-"modeled", "C-STRING"-"modeled"]),
    requirement('REQ-OLD', deprecated, ["C-OLD"-"modeled"]),
    requirement('REQ-AWAY', open, ["C-AWAY"-"modeled"]),
    set_claim_fact('F-SET', "C-SET", eq),
    set_claim_fact('F-SHARED-A', "C-SHARED", eq),
    set_claim_fact('F-SHARED-B', "C-SHARED", includes),
    set_claim_fact('F-OLD', "C-OLD", eq),
    set_claim_fact('F-AWAY', "C-AWAY", eq),
    fixture_entity(fact, 'F-STRING', [fact_kind=property_value, subject_key="s", property_key="name",
                                      operator=eq, value_type=string, value_string="x",
                                      claim_key="C-STRING", claim_text="text"]),
    fixture_rel(requires_property, 'REQ-A', 'F-SET'),
    fixture_rel(requires_property, 'REQ-A', 'F-SHARED-A'),
    fixture_rel(requires_property, 'REQ-B', 'F-SHARED-B'),
    fixture_rel(requires_property, 'REQ-B', 'F-STRING'),
    fixture_rel(requires_property, 'REQ-OLD', 'F-OLD'),
    fixture_rel(requires_property, 'REQ-AWAY', 'F-AWAY'),
    forall(member(S, ['SCEN-A', 'SCEN-B', 'SCEN-OLD', 'SCEN-AWAY']), fixture_entity(scenario, S, [])),
    fixture_rel(specified_by, 'REQ-A', 'SCEN-A'),
    fixture_rel(specified_by, 'REQ-B', 'SCEN-B'),
    fixture_rel(specified_by, 'REQ-OLD', 'SCEN-OLD'),
    fixture_rel(specified_by, 'REQ-AWAY', 'SCEN-AWAY').

contract_test(TestId, Contract) :-
    atom_json_dict(Json0, Contract, [width(0)]),
    atom_string(Json0, Json),
    fixture_entity(test, TestId, [proof_contract=Json]),
    reach(TestId).

reach(TestId) :-
    fixture_rel(validates, TestId, 'SCEN-A'),
    fixture_rel(verified_by, 'SCEN-B', TestId),
    fixture_rel(validates, TestId, 'SCEN-OLD').

test(test_claim_obligations_rows) :-
    with_fixture_kb((
        json_fixture,
        fixture_entity(test, 'TEST', []),
        reach('TEST'),
        fixture_entity(test, 'TEST-AWAY', []),
        fixture_rel(validates, 'TEST-AWAY', 'SCEN-AWAY'),
        first_answer_is_last(claim_obligations:test_claim_obligations_json(
            "TEST", '["C-SHARED", "C-SET", "C-AMBIG", "C-NOFACT", "C-STRING", "C-OLD", "C-AWAY", "C-SET"]',
            "exhaustive", Json)),
        json_rows(Json, Rows),
        maplist([R]>>(del_dict(reason, R, _, _) -> true ; true), Rows),
        Rows = [SharedA, SharedB, Set, Ambig, NoFact, String, Old, Away, SetAgain],
        same(SharedA, _{claim_key: "C-SHARED", requirement_id: "REQ-A", result: "obligation", fact_id: "F-SHARED-A",
                        obligation: _{kind: "set_equals", members: ["blue", "red"]}}),
        same(SharedB, _{claim_key: "C-SHARED", requirement_id: "REQ-B", result: "incompatible", fact_id: "F-SHARED-B",
                        reason: "F-SHARED-B is an includes set fact (every member has the property), which a exhaustive certificate cannot derive: it compares the whole set (use rule, or an eq set fact for exactly these members)"}),
        same(Set, _{claim_key: "C-SET", requirement_id: "REQ-A", result: "obligation", fact_id: "F-SET",
                    obligation: _{kind: "set_equals", members: ["blue", "red"]}}),
        same(SetAgain, Set),
        same(Ambig, _{claim_key: "C-AMBIG", requirement_id: "REQ-A", result: "unresolved",
                      reason: "claim C-AMBIG of REQ-A is ambiguous; resolve it before proving it"}),
        same(NoFact, _{claim_key: "C-NOFACT", requirement_id: "REQ-A", result: "unresolved",
                       reason: "claim C-NOFACT of REQ-A has no grounding fact"}),
        same(String, _{claim_key: "C-STRING", requirement_id: "REQ-B", result: "attested", fact_id: "F-STRING"}),
        Unreached = "claim ~w is not a claim of any current requirement this test reaches through its scenarios",
        format(string(OldReason), Unreached, ['C-OLD']),
        format(string(AwayReason), Unreached, ['C-AWAY']),
        same(Old, _{claim_key: "C-OLD", result: "unresolved", reason: OldReason}),
        same(Away, _{claim_key: "C-AWAY", result: "unresolved", reason: AwayReason})
    )).

test(test_claim_obligations_without_keys) :-
    with_fixture_kb((
        json_fixture,
        fixture_entity(test, 'TEST', []),
        claim_obligations:test_claim_obligations_json('TEST', '[]', exhaustive, Json),
        Json == "[]",
        reach('TEST'),
        claim_obligations:test_claim_obligations_json('TEST', '["C-SHARED"]', "rule", RuleJson),
        json_rows(RuleJson, [_, Row]),
        get_dict(obligation, Row, Obligation),
        same(Obligation, _{kind: "every_member", predicate: "colors", members: ["blue", "red"]})
    )).

test(claim_issues_rows) :-
    with_fixture_kb((
        json_fixture,
        contract_test('TEST-NONE', _{kind: "exhaustive"}),
        contract_test('TEST-EMPTY', _{kind: "typecheck", proves: []}),
        contract_test('TEST-TEXT', _{kind: "rule", proves: "C-SET"}),
        contract_test('TEST-GOOD', _{kind: "exhaustive", proves: ["C-SET", "C-STRING"]}),
        contract_test('TEST-BAD', _{kind: "smt", proves: ["C-SET", "C-AMBIG", "C-STRING", "C-SET"]}),
        contract_test('TEST-E2E', _{kind: "e2e"}),
        contract_test('TEST-NOKIND', _{proves: ["C-SET"]}),
        forall(member(Kind, ["arithmetic", "state_machine", "regex", "source"]),
               (   atom_concat('TEST-KIND-', Kind, TestId),
                   contract_test(TestId, _{kind: Kind})
               )),
        fixture_entity(test, 'TEST-BROKEN', [proof_contract="{not json"]),
        fixture_entity(test, 'TEST-ARRAY', [proof_contract="[1]"]),
        fixture_entity(test, 'TEST-PLAIN', []),
        cert_fixture:raw_entity(test, 'TEST-NUMBER', [proof_contract=7]),
        first_answer_is_last(claim_obligations:proof_contract_claim_issues_json(Json)),
        json_rows(Json, Rows),
        maplist([Row, T-K-R]>>(dict_pairs(Row, _, Pairs),
                               (selectchk(claim_key-K, Pairs, Rest) -> true ; K = none, Rest = Pairs),
                               Rest = [reason-R, test_id-T]), Rows, Issues),
        % Sorted by test and claim, a contract's own issue first, repeats dropped.
        Issues == [
            "TEST-BAD"-"C-AMBIG"-"claim C-AMBIG of REQ-A is ambiguous; resolve it before proving it",
            "TEST-BAD"-"C-SET"-"F-SET is a set fact, which an smt certificate cannot express (use exhaustive, typecheck, rule or state_machine)",
            "TEST-EMPTY"-none-"the typecheck proof contract names no claims in proves, so its certificate proves nothing about a requirement",
            "TEST-KIND-arithmetic"-none-"the arithmetic proof contract names no claims in proves, so its certificate proves nothing about a requirement",
            "TEST-KIND-regex"-none-"the regex proof contract names no claims in proves, so its certificate proves nothing about a requirement",
            "TEST-KIND-source"-none-"the source proof contract names no claims in proves, so its certificate proves nothing about a requirement",
            "TEST-KIND-state_machine"-none-"the state_machine proof contract names no claims in proves, so its certificate proves nothing about a requirement",
            "TEST-NONE"-none-"the exhaustive proof contract names no claims in proves, so its certificate proves nothing about a requirement",
            "TEST-TEXT"-none-"the rule proof contract names no claims in proves, so its certificate proves nothing about a requirement"
        ]
    )).

test(claim_issues_with_none) :-
    with_fixture_kb((
        claim_obligations:proof_contract_claim_issues_json(Json),
        Json == "[]"
    )).

test(contract_dict_reads_each_form) :-
    first_answer_is_last(claim_obligations:contract_dict('^^'('{"kind": "rule"}', xsd), D1)),
    D1.kind == "rule",
    first_answer_is_last(claim_obligations:contract_dict(_{kind: smt}, D2)),
    D2.kind == smt,
    first_answer_is_last(claim_obligations:contract_dict("{\"kind\": \"regex\"}", D3)),
    D3.kind == "regex",
    \+ claim_obligations:contract_dict("[1]", _),
    \+ claim_obligations:contract_dict("{", _),
    \+ claim_obligations:contract_dict(7, _).

% A row's candidates, in order, as Key-Requirement-Fact-Binding-Reason.
candidate_row(Row, TestId, Kind, Expected) :-
    dict_pairs(Row, _, [candidates-Candidates, kind-Kind0, test_id-TestId0]),
    TestId0 == TestId,
    Kind0 == Kind,
    maplist([C, K-R-F-B-Why]>>(dict_pairs(C, _, Pairs),
                               (selectchk(reason-Why, Pairs, Rest) -> true ; Why = none, Rest = Pairs),
                               Rest = [binding-B, claim_key-K, fact_id-F, requirement_id-R]),
            Candidates, Found),
    Found == Expected.

test(claim_candidates_rows) :-
    with_fixture_kb((
        json_fixture,
        contract_test('TEST-SMT', _{kind: "smt"}),
        contract_test('TEST-EX', _{kind: "exhaustive", proves: []}),
        contract_test('TEST-BOUND', _{kind: "exhaustive", proves: ["C-SET"]}),
        contract_test('TEST-E2E', _{kind: "e2e"}),
        contract_test('TEST-TEXT', _{kind: "exhaustive", proves: "C-SET"}),
        fixture_rel(validates, 'TEST-EX', 'SCEN-B'),
        first_answer_is_last(claim_obligations:proof_contract_claim_candidates_json(Json)),
        json_rows(Json, [Ex, Smt, Text]),
        % Rows by test, candidates by claim and requirement: TEST-EX reaches
        % REQ-B twice and lists its claims once.
        candidate_row(Ex, "TEST-EX", "exhaustive", [
            "C-SET"-"REQ-A"-"F-SET"-"derived"-none,
            "C-SHARED"-"REQ-A"-"F-SHARED-A"-"derived"-none,
            "C-SHARED"-"REQ-B"-"F-SHARED-B"-"incompatible"-"F-SHARED-B is an includes set fact (every member has the property), which a exhaustive certificate cannot derive: it compares the whole set (use rule, or an eq set fact for exactly these members)",
            "C-STRING"-"REQ-B"-"F-STRING"-"attested"-none]),
        get_dict(test_id, Text, TextId), TextId == "TEST-TEXT",
        candidate_row(Smt, "TEST-SMT", "smt", [
            "C-SET"-"REQ-A"-"F-SET"-"incompatible"-"F-SET is a set fact, which an smt certificate cannot express (use exhaustive, typecheck, rule or state_machine)",
            "C-SHARED"-"REQ-A"-"F-SHARED-A"-"incompatible"-"F-SHARED-A is a set fact, which an smt certificate cannot express (use exhaustive, typecheck, rule or state_machine)",
            "C-SHARED"-"REQ-B"-"F-SHARED-B"-"incompatible"-"F-SHARED-B is an includes set fact (every member has the property), which a smt certificate cannot derive: it compares the whole set (use rule, or an eq set fact for exactly these members)",
            "C-STRING"-"REQ-B"-"F-STRING"-"attested"-none])
    )).

test(claim_candidates_with_none) :-
    with_fixture_kb((
        claim_obligations:proof_contract_claim_candidates_json(Json),
        Json == "[]"
    )).

test(claim_model_check_rows) :-
    Obligation = '{"kind": "predicate_holds", "predicate": "staff", "args": ["coach"], "value": true}',
    Yes = '{"domains": {}, "predicates": {"staff": {"rows": [{"args": ["coach"], "value": true}]}}}',
    No = '{"domains": {}, "predicates": {"staff": {"rows": [{"args": ["coach"], "value": false}]}}}',
    first_answer_is_last(claim_obligations:claim_model_check_json("rule", Obligation, Yes, Ok)),
    json_rows(Ok, OkDict),
    same(OkDict, _{ok: true}),
    first_answer_is_last(claim_obligations:claim_model_check_json(rule, Obligation, No, Bad)),
    json_rows(Bad, BadDict),
    get_dict(ok, BadDict, false),
    get_dict(reason, BadDict, Reason),
    once(sub_string(Reason, _, _, _, "staff(coach)")),
    Machine = '{"machine": {"states": ["a", "b"], "transitions": [["a", "b"]], "initial": ["a"]}}',
    States = '{"kind": "machine_set", "projection": "states", "members": ["a", "b"]}',
    claim_obligations:claim_model_check_json("state_machine", States, Machine, MachineOk),
    json_rows(MachineOk, MachineDict),
    same(MachineDict, _{ok: true}).

:- end_tests(claim_obligations_json).
