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

test(accepts_positive_stored_style_rules_without_generating_arities) :-
    Head = atom(default, derived, [const('x', string)], positive, false),
    Body = atom(default, source, [const('x', string)], positive, false),
    Rule = rule(rule, assert, Head, Body, [], scope('', '', []), '', '', '', []),
    once(logic_rules_stratified([Rule])).

% implements REQ-kibi-truthful-consistency
checkout_head(atom(default, checkout, [var('C', cart)], positive, false)).
cart_total(Name, atom(cart, total, [var('C', cart), var(Name, money)], positive, false)).
checkout_variables(Name, [variable('C', cart, forall), variable(Name, money, forall)]).

forbid_unless_positive(rule(rule, forbid, Head, Total, [compare(gt, var('T', money), number(0, none))], scope('', '', []), '', '', '', Variables)) :-
    checkout_head(Head), cart_total('T', Total), checkout_variables('T', Variables).

permit_checkout_when(Op, Value, rule(rule, permit, Head, all([Total, compare(Op, var('U', money), number(Value, none))]), [], scope('', '', []), '', '', '', Variables)) :-
    checkout_head(Head), cart_total('U', Total), checkout_variables('U', Variables).

test(comparison_exceptions_fold_into_the_body) :-
    forbid_unless_positive(Rule),
    logic_rule_fold_exceptions(Rule, Folded),
    Folded = rule(rule, forbid, _, all([_, compare(lte, var('T', money), number(0, none))]), [], _, _, _, _, _),
    % A free-order permission collides with "checkout only when the total is
    % positive"; a permission for totals above 5 cannot, once the total is
    % declared functional.
    permit_checkout_when(eq, 0, FreeOrder),
    logic_rule_conflict(Rule, FreeOrder, contradiction),
    permit_checkout_when(gt, 5, Large),
    logic_rule_conflict(Rule, Large, [functional(cart, total, 2, [1])], disjoint).

% implements REQ-kibi-scenario-feasibility-v2
test(property_form_reads_rule_conditions_as_property_constraints) :-
    forbid_unless_positive(Rule),
    logic_rule_property_form(Rule, property_form(forbid, Head, '', '', '', [cart-total], [cond(cart-total, lte, number(0, none), money)])),
    checkout_head(Head),
    checkout_variables('T', Variables),
    cart_total('T', Total),
    % Constant-first comparisons are flipped, and the scope travels along.
    Flipped = rule(rule, forbid, Head, all([Total, compare(lt, number(0, none), var('T', money))]), [], scope('', eu, []), '', '', '', Variables),
    logic_rule_property_form(Flipped, property_form(forbid, _, eu, _, _, [cart-total], [cond(cart-total, gt, number(0, none), money)])),
    % A constant read is an equality condition.
    Blocked = rule(rule, forbid, Head, atom(cart, status, [var('C', cart), const(blocked, string)], positive, false), [], scope('', '', []), '', '', '', Variables),
    logic_rule_property_form(Blocked, property_form(_, _, _, _, _, [cart-status], [cond(cart-status, eq, const(blocked, string), value)])),
    % A false constant comparison never fires; a disjunction cannot be read
    % as one constraint per property, but its property is still reported.
    Never = rule(rule, forbid, Head, all([Total, compare(gt, number(0, none), number(1, none))]), [], scope('', '', []), '', '', '', Variables),
    logic_rule_property_form(Never, property_form(_, _, _, _, _, [cart-total], never)),
    Disjunction = rule(rule, forbid, Head, any([Total, atom(default, gift_card, [var('C', cart)], positive, false)]), [], scope('', '', []), '', '', '', Variables),
    logic_rule_property_form(Disjunction, property_form(_, _, _, _, _, [cart-total], untranslatable)).

:- end_tests(logic_ir).
