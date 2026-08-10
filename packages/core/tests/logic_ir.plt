:- use_module(library(plunit)).
:- use_module('../src/logic_ir.pl').

:- begin_tests(logic_ir).

safe_rule_json('{"version":"kibi.logic.v1","kind":"rule","modality":"oblige","head":{"kind":"atom","name":"must_retain","args":[{"kind":"var","name":"X","type":"entity"}]},"body":{"kind":"atom","name":"customer","args":[{"kind":"var","name":"X","type":"entity"}]},"variables":[{"name":"X","type":"entity","quantifier":"forall"}],"ruleSchemaId":"FACT-RULE-SCHEMA-LOGIC-V1"}').

test(decodes_safe_typed_rule) :-
    safe_rule_json(Json),
    logic_rule_from_props([rule_ir=Json], Rule),
    Rule = rule(rule, oblige, _, _, _, _, _, _, 'FACT-RULE-SCHEMA-LOGIC-V1', _),
    logic_rule_safety([rule_ir=Json], []).

test(rejects_unknown_or_unsafe_fields) :-
    \+ logic_rule_from_props([rule_ir='{"version":"kibi.logic.v1","kind":"rule","modality":"assert","head":{"kind":"atom","name":"bad:module","args":[]},"body":{"kind":"atom","name":"source","args":[]}}'], _),
    logic_rule_safety([rule_ir='{"version":"kibi.logic.v1","kind":"rule","modality":"assert","head":{"kind":"atom","name":"bad:module","args":[]},"body":{"kind":"atom","name":"source","args":[]}}'], Errors),
    memberchk(malformed_rule_ir, Errors).

test(rejects_nested_unknown_fields_and_undeclared_variables) :-
    Unknown = '{"version":"kibi.logic.v1","kind":"constraint","modality":"assert","body":{"kind":"all","items":[{"kind":"atom","name":"source","args":[],"raw_goal":"consult(secret)"}]}}',
    \+ logic_rule_from_props([rule_ir=Unknown], _),
    Unsafe = '{"version":"kibi.logic.v1","kind":"rule","modality":"assert","head":{"kind":"atom","name":"derived","args":[{"kind":"var","name":"X","type":"entity"}]},"body":{"kind":"atom","name":"source","args":[{"kind":"var","name":"X","type":"entity"}]},"variables":[]}',
    logic_rule_safety([rule_ir=Unsafe], Errors),
    memberchk(undeclared_variable('X'), Errors).

test(rejects_unclosed_world_negation) :-
    Json = '{"version":"kibi.logic.v1","kind":"rule","modality":"assert","head":{"kind":"atom","name":"allowed","args":[]},"body":{"kind":"not","item":{"kind":"atom","name":"blocked","args":[]}},"variables":[]}',
    logic_rule_safety([rule_ir=Json], Errors),
    memberchk(negation_requires_closed_world, Errors).

test(conflict_witness_preserves_status_and_heads) :-
    A = rule(atom, assert, atom(default, allowed, [], positive, false), none, [], scope('', '', []), '', '', '', []),
    B = rule(atom, deny, atom(default, allowed, [], positive, false), none, [], scope('', '', []), '', '', '', []),
    logic_rule_conflict(A, B, contradiction),
    logic_rule_conflict_witness(A, B, Witness),
    Witness.status == contradiction,
    Witness.head_a = Witness.head_b.

test(conflict_reports_disjoint_ground_constraints) :-
    HeadA = atom(default, allowed, [], positive, false),
    HeadB = atom(default, allowed, [], positive, false),
    BodyA = compare(eq, number(1, none), number(2, none)),
    A = rule(rule, assert, HeadA, BodyA, [], scope('', '', []), '', '', '', []),
    B = rule(rule, deny, HeadB, none, [], scope('', '', []), '', '', '', []),
    logic_rule_conflict(A, B, disjoint).

test(interval_terms_are_safe) :-
    Json = '{"version":"kibi.logic.v1","kind":"constraint","modality":"assert","body":{"kind":"temporal","relation":"overlaps","left":{"kind":"interval","start":"2026-01-01T00:00:00Z","end":"2026-01-02T00:00:00Z"},"right":{"kind":"interval","start":"2026-01-01T12:00:00Z","end":"2026-01-03T00:00:00Z"}}}',
    logic_rule_safety([rule_ir=Json], []).

test(rejects_unstratified_negation_cycle) :-
    A = rule(rule, assert,
        atom(default, p, [const('x', string)], positive, false),
        not(atom(default, q, [const('x', string)], positive, true)),
        [], scope('', '', []), '', '', '', []),
    B = rule(rule, assert,
        atom(default, q, [const('x', string)], positive, false),
        not(atom(default, p, [const('x', string)], positive, true)),
        [], scope('', '', []), '', '', '', []),
    \+ logic_rules_stratified([A, B]).

:- end_tests(logic_ir).
