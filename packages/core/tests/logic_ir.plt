:- use_module(library(plunit)).
:- use_module(library(http/json)).
:- use_module(library(semweb/rdf11)).
:- use_module(library(filesex)).
:- use_module('../src/kb.pl', [kb_attach/1, kb_detach/0]).
:- use_module('../src/logic_ir.pl').

% Shared helpers for the decoding and evaluation units below.

% Goal succeeds without leaving a choicepoint behind.
:- meta_predicate deterministic(0), decode_cases(2, +), decode_case(2, +, +).
deterministic(Goal) :-
    call_cleanup(Goal, Det = true),
    Det == true.

% Each case is Input-Expected; Expected is the decoded term, or fail when
% Pred must reject Input.  Every accepted input must decode deterministically.
decode_cases(Pred, Cases) :-
    forall(member(Input-Expected, Cases), decode_case(Pred, Input, Expected)).

decode_case(Pred, Input, fail) :- !,
    (   call(Pred, Input, Actual)
    ->  format(user_error, "~w accepted ~q as ~q~n", [Pred, Input, Actual]), fail
    ;   true
    ).
decode_case(Pred, Input, Expected) :-
    (   deterministic(call(Pred, Input, Actual))
    ->  (   Actual =@= Expected
        ->  true
        ;   format(user_error, "~w decoded ~q as ~q, expected ~q~n", [Pred, Input, Actual, Expected]), fail
        )
    ;   format(user_error, "~w rejected ~q or left a choicepoint~n", [Pred, Input]), fail
    ).

:- begin_tests(logic_ir).

safe_rule_json('{"version":"kibi.logic.v1","kind":"rule","modality":"oblige","head":{"kind":"atom","name":"must_retain","args":[{"kind":"var","name":"X","type":"entity"}]},"body":{"kind":"atom","name":"customer","args":[{"kind":"var","name":"X","type":"entity"}]},"variables":[{"name":"X","type":"entity","quantifier":"forall"}],"ruleSchemaId":"FACT-RULE-SCHEMA-LOGIC-V1"}').

test(decodes_safe_typed_rule) :-
    safe_rule_json(Json),
    logic_rule_from_props([rule_ir=Json], Rule),
    Rule = rule(rule, oblige, _, _, _, _, _, _, 'FACT-RULE-SCHEMA-LOGIC-V1', _),
    logic_rule_safety([rule_ir=Json], Errors),
    Errors == [].

test(rejects_unknown_or_unsafe_fields) :-
    \+ logic_rule_from_props([rule_ir='{"version":"kibi.logic.v1","kind":"rule","modality":"assert","head":{"kind":"atom","name":"bad:module","args":[]},"body":{"kind":"atom","name":"source","args":[]}}'], _),
    logic_rule_safety([rule_ir='{"version":"kibi.logic.v1","kind":"rule","modality":"assert","head":{"kind":"atom","name":"bad:module","args":[]},"body":{"kind":"atom","name":"source","args":[]}}'], Errors),
    Errors == [malformed_rule_ir].

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

% Callers walking every opposing pair read the declarations once and pass
% them in; the witness judges the pair under exactly those declarations.
test(conflict_witness_uses_the_given_functional_declarations) :-
    forbid_unless_positive(Rule),
    permit_checkout_when(gt, 5, Large),
    logic_rule_conflict(Rule, Large, [], Undeclared),
    logic_rule_conflict_witness(Rule, Large, [], UndeclaredWitness),
    UndeclaredWitness.status == Undeclared,
    Undeclared \== disjoint,
    logic_rule_conflict_witness(Rule, Large, [functional(cart, total, 2, [1])], Witness),
    Witness.status == disjoint.

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

:- begin_tests(logic_ir_terms).


test(var_terms) :-
    decode_cases(logic_ir:json_term, [
        _{kind:var, name:'X', type:entity}-var('X', entity),
        _{kind:"var", name:"Total_2", type:"money"}-var('Total_2', money),
        _{kind:var, name:'X', type:entity, value:a}-fail,
        _{kind:other, name:'X', type:entity}-fail,
        _{kind:var, name:x, type:entity}-fail,
        _{kind:var, name:'X-1', type:entity}-fail,
        _{kind:var, name:'X', type:'Entity'}-fail,
        _{kind:var, name:1, type:entity}-fail,
        _{kind:var, name:'X', type:1}-fail,
        _{kind:var, name:'X'}-fail,
        _{kind:var, type:entity}-fail,
        _{name:'X', type:entity}-fail
    ]).

test(const_terms) :-
    decode_cases(logic_ir:json_term, [
        _{kind:const, value:blocked}-const(blocked, string),
        _{kind:const, value:"blocked", type:"status"}-const(blocked, status),
        _{kind:const, value:blocked, unit:x}-fail,
        _{kind:other, value:blocked}-fail,
        _{kind:const}-fail,
        _{kind:const, value:3}-fail,
        _{kind:const, value:blocked, type:3}-fail
    ]).

test(number_terms) :-
    Nan is nan,
    decode_cases(logic_ir:json_term, [
        _{kind:number, value:5}-number(5, none),
        _{kind:number, value:2.5, unit:usd}-number(2.5, usd),
        _{kind:number, value:5, unit:'USD'}-fail,
        _{kind:number, value:5, unit:3}-fail,
        _{kind:number, value:'5'}-fail,
        _{kind:number, value:Nan}-fail,
        _{kind:number, value:5, type:money}-fail,
        _{kind:other, value:5}-fail,
        _{kind:number}-fail
    ]).

test(duration_terms) :-
    Nan is nan,
    decode_cases(logic_ir:json_term, [
        _{kind:duration, value:3, unit:h}-duration(3, h),
        _{kind:duration, value:0, unit:ms}-duration(0, ms),
        _{kind:duration, value:0.5, unit:"w"}-duration(0.5, w),
        _{kind:duration, value: -1, unit:s}-fail,
        _{kind:duration, value:Nan, unit:s}-fail,
        _{kind:duration, value:3, unit:y}-fail,
        _{kind:duration, value:3, unit:3}-fail,
        _{kind:duration, value:3}-fail,
        _{kind:duration, value:'3', unit:s}-fail,
        _{kind:duration, unit:s}-fail,
        _{kind:duration, value:3, unit:h, type:x}-fail,
        _{kind:other, value:3, unit:h}-fail
    ]).

test(timestamp_terms) :-
    decode_cases(logic_ir:json_term, [
        _{kind:timestamp, value:'2026-01-01T00:00:00Z'}-timestamp('2026-01-01T00:00:00Z'),
        _{kind:timestamp, value:"2026-01-01"}-timestamp('2026-01-01'),
        _{kind:timestamp, value:soon}-fail,
        _{kind:timestamp, value:3}-fail,
        _{kind:timestamp}-fail,
        _{kind:timestamp, value:'2026-01-01', unit:s}-fail,
        _{kind:other, value:'2026-01-01'}-fail
    ]).

test(interval_terms) :-
    decode_cases(logic_ir:json_term, [
        _{kind:interval, start:'2026-01-01', end:'2026-02-01'}-interval('2026-01-01', '2026-02-01'),
        _{kind:interval, start:'2026-01-01', end:'2026-01-01'}-interval('2026-01-01', '2026-01-01'),
        _{kind:interval, start:'2026-02-01', end:'2026-01-01'}-fail,
        _{kind:interval, start:soon, end:'2026-01-01'}-fail,
        _{kind:interval, start:'2026-01-01', end:later}-fail,
        _{kind:interval, start:'2026-01-01'}-fail,
        _{kind:interval, end:'2026-01-01'}-fail,
        _{kind:interval, start:'2026-01-01', end:'2026-02-01', value:x}-fail,
        _{kind:other, start:'2026-01-01', end:'2026-02-01'}-fail
    ]).

test(non_dict_terms_are_rejected) :-
    decode_cases(logic_ir:json_term, [5-fail, x-fail, [a]-fail]).

:- end_tests(logic_ir_terms).

:- begin_tests(logic_ir_expressions).


p_json(_{kind:atom, name:p, args:[]}).
p_atom(atom(default, p, [], positive, false)).
x_json(_{kind:var, name:'X', type:entity}).
one_json(_{kind:number, value:1}).

test(atom_expressions) :-
    x_json(X),
    decode_cases(logic_ir:json_expression, [
        _{kind:atom, name:p, args:[]}-atom(default, p, [], positive, false),
        _{kind:"atom", name:"a_b-c/d.e1", namespace:"cart", args:[X], polarity:"negative", closedWorld:true}-atom(cart, 'a_b-c/d.e1', [var('X', entity)], negative, true),
        _{kind:atom, name:p, args:[], polarity:positive, closedWorld:false}-atom(default, p, [], positive, false),
        _{kind:atom, name:p, args:[X,X,X,X,X,X,X,X]}-atom(default, p, [var('X', entity),var('X', entity),var('X', entity),var('X', entity),var('X', entity),var('X', entity),var('X', entity),var('X', entity)], positive, false),
        _{kind:atom, name:p, args:[X,X,X,X,X,X,X,X,X]}-fail,
        _{kind:atom, name:p, args:[5]}-fail,
        _{kind:atom, name:p, args:x}-fail,
        _{kind:atom, name:p}-fail,
        _{kind:atom, args:[]}-fail,
        _{kind:atom, name:'P', args:[]}-fail,
        _{kind:atom, name:'bad:module', args:[]}-fail,
        _{kind:atom, name:'a b', args:[]}-fail,
        _{kind:atom, name:p, namespace:'Cart', args:[]}-fail,
        _{kind:atom, name:p, namespace:3, args:[]}-fail,
        _{kind:atom, name:3, args:[]}-fail,
        _{kind:atom, name:p, args:[], polarity:maybe}-fail,
        _{kind:atom, name:p, args:[], closedWorld:yes}-fail,
        _{kind:atom, name:p, args:[], raw_goal:x}-fail,
        _{kind:other, name:p, args:[]}-fail
    ]).

test(conjunction_and_disjunction_expressions) :-
    p_json(P), p_atom(A),
    length(Max, 32), maplist(=(P), Max), length(MaxAtoms, 32), maplist(=(A), MaxAtoms),
    length(Over, 33), maplist(=(P), Over),
    decode_cases(logic_ir:json_expression, [
        _{kind:all, items:[P]}-all([A]),
        _{kind:"any", items:[P, P]}-any([A, A]),
        _{kind:all, items:Max}-all(MaxAtoms),
        _{kind:any, items:Max}-any(MaxAtoms),
        _{kind:all, items:Over}-fail,
        _{kind:any, items:Over}-fail,
        _{kind:all, items:[]}-fail,
        _{kind:any, items:[]}-fail,
        _{kind:all, items:P}-fail,
        _{kind:any, items:P}-fail,
        _{kind:all}-fail,
        _{kind:any}-fail,
        _{kind:all, items:[_{kind:atom, name:'P', args:[]}]}-fail,
        _{kind:any, items:[_{kind:atom, name:'P', args:[]}]}-fail,
        _{kind:all, items:[P], item:P}-fail,
        _{kind:any, items:[P], item:P}-fail,
        _{kind:other, items:[P]}-fail
    ]).

test(negation_expressions) :-
    p_json(P), p_atom(A), one_json(One),
    decode_cases(logic_ir:json_expression, [
        _{kind:not, item:P}-not(A),
        _{kind:not, item:_{kind:compare, operator:eq, left:One, right:One}}-fail,
        _{kind:not}-fail,
        _{kind:not, item:5}-fail,
        _{kind:not, item:_{kind:other, name:p, args:[]}}-fail,
        _{kind:not, item:_{kind:atom, name:p, args:[], items:[]}}-fail,
        _{kind:not, item:P, items:[P]}-fail,
        _{kind:other, item:P}-fail
    ]).

test(comparison_expressions) :-
    one_json(One), x_json(X),
    forall(member(Op, [eq, neq, lt, lte, gt, gte]),
           decode_cases(logic_ir:json_expression, [_{kind:compare, operator:Op, left:X, right:One}-compare(Op, var('X', entity), number(1, none))])),
    decode_cases(logic_ir:json_expression, [
        _{kind:compare, operator:"lt", left:One, right:X}-compare(lt, number(1, none), var('X', entity)),
        _{kind:compare, operator:approx, left:One, right:One}-fail,
        _{kind:compare, operator:3, left:One, right:One}-fail,
        _{kind:compare, operator:eq, left:One, right:_{kind:var}}-fail,
        _{kind:compare, operator:eq, left:_{kind:var}, right:One}-fail,
        _{kind:compare, operator:eq, left:One}-fail,
        _{kind:compare, operator:eq, right:One}-fail,
        _{kind:compare, left:One, right:One}-fail,
        _{kind:compare, operator:eq, left:One, right:One, relation:before}-fail,
        _{kind:other, operator:eq, left:One, right:One}-fail
    ]).

test(count_expressions) :-
    p_json(P), p_atom(A),
    decode_cases(logic_ir:json_expression, [
        _{kind:count, atom:P, operator:gte, value:2}-count(A, gte, 2),
        _{kind:count, atom:P, operator:"eq", value:0}-count(A, eq, 0),
        _{kind:count, atom:P, operator:gte, value: -1}-fail,
        _{kind:count, atom:P, operator:gte, value:1.5}-fail,
        _{kind:count, atom:P, operator:near, value:1}-fail,
        _{kind:count, atom:P, operator:3, value:1}-fail,
        _{kind:count, atom:_{kind:atom, name:'P', args:[]}, operator:gte, value:1}-fail,
        _{kind:count, atom:P, operator:gte}-fail,
        _{kind:count, atom:P, value:1}-fail,
        _{kind:count, operator:gte, value:1}-fail,
        _{kind:count, atom:5, operator:gte, value:1}-fail,
        _{kind:count, atom:_{kind:other, name:p, args:[]}, operator:gte, value:1}-fail,
        _{kind:count, atom:P, operator:gte, value:1, item:P}-fail,
        _{kind:other, atom:P, operator:gte, value:1}-fail
    ]).

test(temporal_expressions) :-
    T = _{kind:timestamp, value:'2026-01-01'},
    forall(member(Relation, [before, after, during, overlaps, starts, finishes]),
           decode_cases(logic_ir:json_expression, [_{kind:temporal, relation:Relation, left:T, right:T}-temporal(Relation, timestamp('2026-01-01'), timestamp('2026-01-01'))])),
    decode_cases(logic_ir:json_expression, [
        _{kind:temporal, relation:near, left:T, right:T}-fail,
        _{kind:temporal, relation:3, left:T, right:T}-fail,
        _{kind:temporal, relation:before, left:T, right:_{kind:timestamp}}-fail,
        _{kind:temporal, relation:before, left:_{kind:timestamp}, right:T}-fail,
        _{kind:temporal, relation:before, left:T}-fail,
        _{kind:temporal, relation:before, right:T}-fail,
        _{kind:temporal, left:T, right:T}-fail,
        _{kind:temporal, relation:before, left:T, right:T, operator:eq}-fail,
        _{kind:other, relation:before, left:T, right:T}-fail
    ]).

test(non_dict_expressions_are_rejected) :-
    decode_cases(logic_ir:json_expression, [5-fail, p-fail]).

:- end_tests(logic_ir_expressions).

:- begin_tests(logic_ir_rules).

% Fields override a minimal atom rule; head:none drops the head.
rule_json(Fields, Json) :-
    put_dict(Fields, _{version:'kibi.logic.v1', kind:atom, modality:assert, head:_{kind:atom, name:p, args:[]}}, Dict0),
    (   get_dict(head, Dict0, none)
    ->  del_dict(head, Dict0, _, Dict)
    ;   Dict = Dict0
    ),
    atom_json_dict(Json, Dict, []).

decoded(Fields, Rule) :-
    rule_json(Fields, Json),
    logic_rule_from_props([rule_ir=Json], Rule).

p_atom(atom(default, p, [], positive, false)).

test(decodes_defaults) :-
    p_atom(P),
    rule_json(_{}, Json),
    deterministic(logic_rule_from_props([title=x, rule_ir=Json], Rule)),
    Rule == rule(atom, assert, P, none, [], scope('', '', []), '', '', '', []).

test(decodes_every_optional_field) :-
    p_atom(P),
    deterministic(decoded(_{
        kind:rule,
        modality:forbid,
        body:_{kind:atom, name:p, args:[]},
        exceptions:[_{kind:atom, name:p, args:[]}],
        scope:_{authority:legal, name:eu, tags:[gdpr, retention]},
        validFrom:'2026-01-01',
        validTo:'2026-12-31',
        ruleSchemaId:'FACT-RULE_SCHEMA:v1/a.b',
        variables:[_{name:'X', type:'entity_type-a:b/c.d'}, _{name:'Y', type:money, quantifier:exists}]
    }, Rule)),
    Rule == rule(rule, forbid, P, P, [P], scope(legal, eu, [gdpr, retention]), '2026-01-01', '2026-12-31',
                 'FACT-RULE_SCHEMA:v1/a.b', [variable('X', 'entity_type-a:b/c.d', forall), variable('Y', money, exists)]).

test(decodes_a_rule_without_a_head) :-
    deterministic(decoded(_{kind:constraint, head:none}, Rule)),
    Rule = rule(constraint, assert, none, none, [], _, _, _, _, _).

test(decodes_every_modality) :-
    forall(member(Modality, [assert, deny, oblige, permit, forbid]),
           ( decoded(_{modality:Modality}, Rule), arg(2, Rule, Modality) )),
    \+ decoded(_{modality:maybe}, _).

test(scope_fields_are_optional) :-
    forall(member(Scope-Expected, [_{}-scope('', '', []), _{name:eu}-scope('', eu, []), _{authority:legal}-scope(legal, '', [])]),
           ( decoded(_{scope:Scope}, Rule), arg(6, Rule, Actual), Actual == Expected )).

test(rejects_malformed_rules) :-
    forall(member(Fields, [
        _{version:'kibi.logic.v2'},
        _{source:'p :- q'},
        _{head:_{kind:atom, name:'P', args:[]}},
        _{body:_{kind:atom, name:'P', args:[]}},
        _{exceptions:[_{kind:atom, name:'P', args:[]}]},
        _{scope:_{name:eu, region:x}},
        _{validFrom:soon},
        _{validTo:later},
        _{ruleSchemaId:'-schema'},
        _{ruleSchemaId:'schema id'},
        _{ruleSchemaId:3},
        _{variables:[_{name:x, type:entity}]},
        _{variables:[_{name:'X', type:'Entity'}]},
        _{variables:[_{name:'X', type:'entity type'}]},
        _{variables:[_{name:'X', type:entity, quantifier:some}]},
        _{variables:[_{name:'X', type:entity, kind:var}]},
        _{variables:[_{name:'X'}]},
        _{variables:[_{type:entity}]},
        _{variables:['X']}
    ]),
    (   decoded(Fields, Rule)
    ->  format(user_error, "accepted ~q as ~q~n", [Fields, Rule]), fail
    ;   true
    )).

test(reads_rule_ir_from_typed_literals_and_strings) :-
    rule_json(_{}, Json),
    atom_string(Json, String),
    logic_rule_from_props([rule_ir=String], Rule),
    deterministic(logic_rule_from_props([rule_ir='^^'(Json, xsd)], Rule)),
    deterministic(logic_rule_from_props([rule_ir=literal(type(xsd, String))], Rule)),
    \+ logic_rule_from_props([rule_ir='{not json'], _),
    \+ logic_rule_from_props([rule_ir=42], _),
    \+ logic_rule_from_props([title=x], _).

test(decodes_quantifiers_and_modalities_given_as_strings) :-
    logic_ir:json_quantifier("exists", exists),
    logic_ir:json_quantifier(forall, forall),
    \+ logic_ir:json_quantifier("some", _),
    \+ logic_ir:json_quantifier(3, _),
    logic_ir:json_modality("deny", deny),
    \+ logic_ir:json_modality("maybe", _),
    \+ logic_ir:json_modality(3, _),
    logic_ir:json_polarity("negative", negative),
    \+ logic_ir:json_polarity("maybe", _),
    \+ logic_ir:json_polarity(3, _),
    logic_ir:json_text("atom", atom),
    \+ logic_ir:json_text("all", atom),
    \+ logic_ir:json_text(3, atom),
    \+ logic_ir:json_text(3, _),
    logic_ir:json_variable(_{name:"X", type:"entity", quantifier:"exists"}, variable('X', entity, exists)),
    \+ logic_ir:json_variable(x, _),
    logic_ir:json_scope(_{authority:"legal", name:"eu", tags:["a"]}, scope(legal, eu, [a])),
    \+ logic_ir:json_scope(_{tags:[3]}, _).

test(name_rules) :-
    logic_ir:valid_variable_name('X_1a'),
    \+ logic_ir:valid_variable_name('X.1'),
    \+ logic_ir:valid_variable_name(''),
    \+ logic_ir:valid_variable_name("X"),
    logic_ir:valid_type_name('a1_-:/.'),
    \+ logic_ir:valid_type_name('a b'),
    \+ logic_ir:valid_type_name('1a'),
    \+ logic_ir:valid_type_name(''),
    \+ logic_ir:valid_type_name("a"),
    logic_ir:valid_schema_id('1A_-:/.'),
    \+ logic_ir:valid_schema_id('A B'),
    \+ logic_ir:valid_schema_id('_a'),
    \+ logic_ir:valid_schema_id(''),
    \+ logic_ir:valid_schema_id("a"),
    logic_ir:valid_predicate_name('a1_-/.'),
    \+ logic_ir:valid_predicate_name('a:b'),
    \+ logic_ir:valid_predicate_name('A'),
    \+ logic_ir:valid_predicate_name(''),
    \+ logic_ir:valid_predicate_name("a"),
    logic_ir:json_atom_name("a", a),
    logic_ir:json_atom_name(a, a),
    \+ logic_ir:json_atom_name(1, _),
    logic_ir:json_timestamp("2026-01-01T00:00:00Z", '2026-01-01T00:00:00Z'),
    \+ logic_ir:json_timestamp("soon", _),
    forall(member(Char, [a, '1', '_', '-', '/', '.']), deterministic(logic_ir:allowed_predicate_char(Char))),
    forall(member(Char, [':', ' ', '+']), \+ logic_ir:allowed_predicate_char(Char)).

:- end_tests(logic_ir_rules).

:- begin_tests(logic_ir_safety).

r(Kind, Head, Body, Exceptions, Variables, rule(Kind, assert, Head, Body, Exceptions, scope('', '', []), '', '', '', Variables)).

a(Name, Args, atom(default, Name, Args, positive, true)).
x(var('X', entity)).
y(var('Y', entity)).
declared(Names, Variables) :- findall(variable(N, entity, forall), member(N, Names), Variables).

safety_cases(Cases) :-
    forall(member(Rule-Expected, Cases),
           (   logic_ir:rule_safety_errors(Rule, Actual), Actual == Expected
           ->  true
           ;   logic_ir:rule_safety_errors(Rule, Actual),
               format(user_error, "~q gave ~q, expected ~q~n", [Rule, Actual, Expected]), fail
           )).

test(shape_errors) :-
    a(p, [], P), a(q, [], Q),
    r(atom, none, none, [], [], AtomNoHead), r(atom, P, Q, [], [], AtomBody), r(atom, P, none, [], [], AtomOk),
    r(rule, none, none, [], [], RuleEmpty), r(rule, P, Q, [], [], RuleOk), r(rule, P, none, [], [], RuleNoBody),
    r(constraint, P, none, [], [], ConstraintHead), r(constraint, none, Q, [], [], ConstraintOk),
    safety_cases([
        AtomNoHead-[missing_head], AtomBody-[body_for_atom], AtomOk-[],
        RuleEmpty-[missing_body, missing_head], RuleOk-[], RuleNoBody-[missing_body],
        ConstraintHead-[head_for_constraint, missing_body], ConstraintOk-[]
    ]).

test(expression_errors) :-
    a(q, [], Q),
    Open = atom(default, q, [], positive, false),
    One = number(1, none),
    findall(Body-Errors, member(Body-Errors, [
        not(Open)-[negation_requires_closed_world],
        not(Q)-[],
        all([Q, not(Open)])-[negation_requires_closed_world],
        any([Q, not(Open)])-[negation_requires_closed_world],
        not(compare(approx, One, One))-[invalid_compare_operator],
        compare(approx, One, One)-[invalid_compare_operator],
        compare(lte, One, One)-[],
        count(Q, approx, 1)-[invalid_compare_operator],
        count(Q, gte, -1)-[invalid_count_value],
        count(Q, gte, 1.5)-[invalid_count_value],
        count(Q, gte, 0)-[],
        count(Q, gte, 1)-[],
        temporal(near, timestamp(a), timestamp(b))-[invalid_temporal_relation],
        temporal(before, timestamp(a), timestamp(b))-[]
    ]), Pairs),
    findall(Rule-Errors, (member(Body-Errors, Pairs), r(constraint, none, Body, [], [], Rule)), BodyCases),
    findall(Rule-Errors, (member(Body-Errors, Pairs), r(constraint, none, Q, [Body], [], Rule)), ExceptionCases),
    safety_cases(BodyCases),
    safety_cases(ExceptionCases).

test(variable_errors) :-
    x(X), y(Y), a(p, [X], PX), a(p, [X, Y], PXY), a(q, [X], QX), a(q, [], Q), a(q, [Y], QY),
    NegQX = atom(default, q, [X], negative, true),
    declared(['X', 'Y'], XY),
    r(rule, PX, QX, [], XY, Safe),
    r(rule, PXY, Q, [], XY, HeadUnbound),
    r(rule, PX, all([QX, compare(gt, Y, number(1, none))]), [], XY, CompareOnly),
    r(rule, PX, all([QX, not(QY)]), [], XY, NegatedOnly),
    r(rule, PX, any([QX]), [], XY, Disjunction),
    r(rule, PX, count(QX, gte, 1), [], XY, Count),
    r(rule, PX, NegQX, [], XY, NegativePolarity),
    r(rule, PX, QX, [], [variable('X', entity, exists), variable('Y', entity, forall)], ExistentialHead),
    r(rule, PX, QX, [], [variable('X', entity, forall), variable('Y', entity, exists)], ExistentialUnused),
    r(rule, PX, all([QX, QY]), [], [variable('X', entity, forall), variable('Y', entity, exists)], ExistentialLocal),
    r(rule, PX, QX, [compare(gt, Y, number(1, none))], XY, ExceptionUnbound),
    r(rule, PX, QX, [QX], XY, ExceptionBound),
    r(rule, PXY, all([QX, QY]), [], [], Undeclared),
    r(rule, PX, QX, [QY], [variable('X', entity, forall)], UndeclaredException),
    safety_cases([
        Safe-[],
        HeadUnbound-[head_variable_not_range_restricted('X'), head_variable_not_range_restricted('Y')],
        CompareOnly-[body_variable_not_range_restricted('Y')],
        NegatedOnly-[body_variable_not_range_restricted('Y')],
        Disjunction-[],
        Count-[],
        NegativePolarity-[body_variable_not_range_restricted('X'), head_variable_not_range_restricted('X')],
        ExistentialHead-[existential_head_variable('X'), existential_variable_not_body_local('X')],
        ExistentialUnused-[existential_variable_not_body_local('Y')],
        ExistentialLocal-[],
        ExceptionUnbound-[exception_variable_not_range_restricted('Y')],
        ExceptionBound-[],
        Undeclared-[undeclared_variable('X'), undeclared_variable('Y')],
        UndeclaredException-[exception_variable_not_range_restricted('Y'), undeclared_variable('Y')]
    ]).

test(interval_errors) :-
    Bad = interval('2026-02-01', '2026-01-01'),
    Good = interval('2026-01-01', '2026-01-01'),
    a(q, [], Q),
    findall(Rule-Errors, member(Rule-Errors, [
        rule(atom, assert, atom(default, p, [Bad], positive, false), none, [], scope('', '', []), '', '', '', [])-[invalid_interval],
        rule(atom, assert, atom(default, p, [Good], positive, false), none, [], scope('', '', []), '', '', '', [])-[],
        rule(constraint, assert, none, temporal(during, Good, Bad), [], scope('', '', []), '', '', '', [])-[invalid_interval],
        rule(constraint, assert, none, Q, [compare(eq, Bad, Good)], scope('', '', []), '', '', '', [])-[invalid_interval]
    ]), Cases),
    safety_cases(Cases).

nested_all(1, Leaf, Leaf) :- !.
nested_all(Depth, Leaf, all([Inner])) :- Next is Depth - 1, nested_all(Next, Leaf, Inner).

test(limit_errors) :-
    a(q, [], Q), a(p, [], P),
    length(Atoms63, 63), maplist(=(Q), Atoms63),
    length(Atoms64, 64), maplist(=(Q), Atoms64),
    r(rule, P, all(Atoms63), [], [], Atoms64Total),
    r(rule, P, all(Atoms64), [], [], Atoms65Total),
    r(constraint, none, all(Atoms63), [Q], [], Atoms64WithException),
    r(constraint, none, all(Atoms63), [Q, Q], [], Atoms65WithExceptions),
    nested_all(16, Q, Depth16), nested_all(17, Q, Depth17),
    r(constraint, none, Depth16, [], [], Deep16), r(constraint, none, Depth17, [], [], Deep17),
    r(constraint, none, Q, [Depth17], [], DeepException),
    safety_cases([
        Atoms64Total-[], Atoms65Total-[too_many_atoms],
        Atoms64WithException-[], Atoms65WithExceptions-[too_many_atoms],
        Deep16-[], Deep17-[expression_depth_exceeded], DeepException-[expression_depth_exceeded]
    ]).

test(expression_measures) :-
    a(q, [], Q),
    C = compare(eq, number(1, none), number(1, none)),
    T = temporal(before, timestamp(a), timestamp(b)),
    forall(member(E-Count-Depth, [
        none-0-0, Q-1-1, all([Q, Q, C])-2-2, any([Q, all([Q])])-2-3, not(Q)-1-2,
        C-0-1, count(Q, gte, 1)-1-2, count(all([Q, Q]), gte, 1)-2-3, T-0-1, all([])-0-1, any([])-0-1
    ]),
    (   logic_ir:expression_atom_count(E, Count), logic_ir:expression_depth(E, Depth)
    ->  true
    ;   format(user_error, "measures of ~q~n", [E]), fail
    )).

test(expression_terms_and_variables) :-
    x(X), y(Y),
    A = atom(default, q, [X, const(a, string), Y], positive, false),
    findall(E-Terms-Names, member(E-Terms-Names, [
        A-[X, const(a, string), Y]-['X', 'Y'],
        all([A, compare(eq, Y, number(1, none))])-[X, const(a, string), Y, Y, number(1, none)]-['X', 'Y', 'Y'],
        any([A, A])-[X, const(a, string), Y, X, const(a, string), Y]-['X', 'Y', 'X', 'Y'],
        not(A)-[X, const(a, string), Y]-['X', 'Y'],
        compare(eq, number(1, none), Y)-[number(1, none), Y]-['Y'],
        count(A, gte, 1)-[X, const(a, string), Y]-['X', 'Y'],
        temporal(during, X, Y)-[X, Y]-['X', 'Y']
    ]), Cases),
    forall(member(E-Terms-Names, Cases),
           (   findall(T, logic_ir:expression_term(E, T), Terms0), Terms0 == Terms,
               findall(N, logic_ir:expression_variable(E, N), Names0), Names0 == Names
           ->  true
           ;   format(user_error, "terms of ~q~n", [E]), fail
           )),
    \+ logic_ir:expression_term(none, _),
    \+ logic_ir:expression_variable(none, _).

test(positive_variables) :-
    x(X), y(Y),
    Pos = atom(default, q, [X, Y], positive, false),
    Neg = atom(default, q, [Y], negative, false),
    forall(member(E-Names, [
        Pos-['X', 'Y'], Neg-[], all([Pos, Neg])-['X', 'Y'], any([Neg, Pos])-['X', 'Y'], count(Pos, gte, 1)-['X', 'Y'],
        not(Pos)-[], compare(eq, X, Y)-[], temporal(before, X, Y)-[], none-[]
    ]),
    (   findall(N, logic_ir:positive_variable(N, E), Names0), Names0 == Names
    ->  true
    ;   format(user_error, "positive variables of ~q~n", [E]), fail
    )).

:- end_tests(logic_ir_safety).

:- begin_tests(logic_ir_rendering).

render(Rule, Text) :- deterministic(logic_ir:render_rule(Rule, Text)).

test(renders_rules_and_heads) :-
    P = atom(default, p, [], positive, false),
    render(rule(atom, assert, P, none, [], scope('', '', []), '', '', '', []), "assert(p()).") ,
    render(rule(constraint, oblige, none, none, [], scope('', '', []), '', '', '', []), "oblige."),
    render(rule(constraint, forbid, none, P, [], scope('', '', []), '', '', '', []), "forbid :- p()."),
    render(rule(rule, permit, atom(cart, total, [var('C', cart), number(5, none)], negative, false), P, [], scope('', '', []), '', '', '', []),
           "permit(negative(cart:total(C,5))) :- p().").

test(renders_every_term) :-
    Terms = [var('X', t), const(blocked, status), number(5, none), number(2.5, usd), duration(3, h), timestamp('2026-01-01'), interval(a, b)],
    render(rule(atom, assert, atom(default, p, Terms, positive, false), none, [], scope('', '', []), '', '', '', []), Text),
    Text == "assert(p(X,blocked,5,2.5usd,duration(3,h),2026-01-01,interval(a,b))).".

test(renders_every_expression) :-
    P = atom(default, p, [], positive, false),
    Q = atom(default, q, [var('X', t)], positive, true),
    One = number(1, none),
    forall(member(Body-Expected, [
        all([P, Q])-"assert(p()) :- p(), q(X).",
        any([P, Q])-"assert(p()) :- (p() ; q(X)).",
        not(Q)-"assert(p()) :- not(q(X)).",
        compare(lte, var('X', t), One)-"assert(p()) :- X lte 1.",
        count(Q, gte, 2)-"assert(p()) :- count(q(X),gte,2).",
        temporal(before, timestamp(a), interval(b, c))-"assert(p()) :- temporal(before,a,interval(b,c)).",
        all([any([P]), not(Q)])-"assert(p()) :- (p()), not(q(X))."
    ]),
    (   render(rule(rule, assert, P, Body, [], scope('', '', []), '', '', '', []), Text), Text == Expected
    ->  true
    ;   format(user_error, "rendered ~q~n", [Body]), fail
    )).

test(renders_from_rule_properties) :-
    Json = '{"version":"kibi.logic.v1","kind":"atom","modality":"deny","head":{"kind":"atom","name":"p","args":[]}}',
    logic_rule_render([rule_ir=Json], Text),
    Text == "deny(p()).",
    \+ logic_rule_render([rule_ir='{}'], _).

test(semantic_key_prefers_the_stored_key) :-
    findall(K, logic_rule_semantic_key([rule_hash=h, semantic_key=k], K), Keys1), Keys1 == [k],
    findall(K, logic_rule_semantic_key([title=x, rule_hash=h], K), Keys2), Keys2 == [h],
    \+ logic_rule_semantic_key([title=x], _).

test(atom_signature) :-
    logic_atom_signature(atom(ns, p, [a], negative, true), signature(ns, p, [a], negative)).

:- end_tests(logic_ir_rendering).

:- begin_tests(logic_ir_evaluation).

test(compare_terms) :-
    forall(member(Op-L-R-Holds, [
        eq-number(1, none)-number(1, none)-true, eq-number(1, none)-number(2, none)-false,
        neq-number(1, none)-number(2, none)-true, neq-number(1, none)-number(1, none)-false,
        lt-number(1, none)-number(2, none)-true, lt-number(2, none)-number(2, none)-false,
        lte-number(2, none)-number(2, none)-true, lte-number(3, none)-number(2, none)-false,
        gt-number(3, none)-number(2, none)-true, gt-number(2, none)-number(2, none)-false,
        gte-number(2, none)-number(2, none)-true, gte-number(1, none)-number(2, none)-false,
        eq-number(1, h)-duration(60, m)-true,
        lt-duration(59, s)-number(1, m)-true,
        eq-const('5', string)-number(5, none)-true,
        eq-const(a, string)-const(a, status)-true,
        neq-const(a, string)-const(b, string)-true,
        eq-5-number(5, none)-true
    ]),
    (   ( logic_ir:compare_terms(Op, L, R) -> Actual = true ; Actual = false ), Actual == Holds
    ->  true
    ;   format(user_error, "compare_terms(~q, ~q, ~q)~n", [Op, L, R]), fail
    )),
    \+ logic_ir:compare_terms(eq, timestamp(a), timestamp(a)),
    \+ logic_ir:compare_terms(approx, number(1, none), number(1, none)).

test(term_values) :-
    forall(member(Term-Values, [
        number(2, none)-[2], number(2, usd)-[2], duration(2, s)-[2000],
        const('7', string)-[7], const(seven, string)-[seven], 4-[4], timestamp(a)-[]
    ]),
    (   findall(V, logic_ir:term_value(Term, V), Values0), Values0 == Values
    ->  true
    ;   format(user_error, "term_value(~q)~n", [Term]), fail
    )).

test(duration_units) :-
    forall(member(Unit-Ms, [ms-3, s-3000, m-180000, h-10800000, d-259200000, w-1814400000, usd-3]),
    (   findall(V, logic_ir:duration_milliseconds(3, Unit, V), Values), Values == [Ms]
    ->  true
    ;   format(user_error, "duration_milliseconds(3, ~q)~n", [Unit]), fail
    )),
    findall(V, logic_ir:term_value(number(3, none), V), [3]),
    findall(V, logic_ir:term_value(number(3, s), V), [3000]).

test(materializes_declared_variables, [nondet]) :-
    Rule = rule(rule, assert, atom(default, p, [var('X', t), const(a, s)], positive, false),
                all([compare(gt, var('X', t), number(1, none)), not(atom(default, q, [var('X', t), duration(1, h)], positive, true)),
                     count(atom(default, q, [var('X', t)], positive, false), gte, 1),
                     any([temporal(during, timestamp(a), interval(a, b))])]),
                [compare(eq, var('X', t), number(9, none))], scope('', '', []), '', '', '', [variable('X', t, forall)]),
    deterministic(logic_ir:materialize_rule_environment(Rule, Material, Environment)),
    is_list(Environment),
    Environment = ['X'-X],
    var(X),
    Material == rule(rule, assert, atom(default, p, [X, const(a, s)], positive, false),
                all([compare(gt, X, number(1, none)), not(atom(default, q, [X, duration(1, h)], positive, true)),
                     count(atom(default, q, [X], positive, false), gte, 1),
                     any([temporal(during, timestamp(a), interval(a, b))])]),
                [compare(eq, X, number(9, none))], scope('', '', []), '', '', '', [variable('X', t, forall)]),
    deterministic(logic_ir:materialize_rule_environment(rule(constraint, assert, none, none, [], s, '', '', '', []), Constraint, [])),
    Constraint == rule(constraint, assert, none, none, [], s, '', '', '', []),
    findall(M, logic_ir:materialize_expression(atom(default, q, [], positive, false), [], M), [atom(default, q, [], positive, false)]),
    \+ logic_ir:materialize_term(var('Y', t), ['X'-_], _).

:- end_tests(logic_ir_evaluation).

:- begin_tests(logic_ir_conflicts).

rr(Modality, Head, Body, Exceptions, Variables, rule(rule, Modality, Head, Body, Exceptions, scope('', '', []), '', '', '', Variables)).

v(Name, var(Name, n)).
n(Value, number(Value, none)).
at(Name, Args, atom(default, Name, Args, positive, false)).
vars(Names, Variables) :- findall(variable(N, n, forall), member(N, Names), Variables).
typed(Name, Type, variable(Name, Type, forall)).

status_cases(Cases) :-
    forall(member(case(A, B, Functional, Expected), Cases),
           (   logic_rule_conflict(A, B, Functional, Actual), Actual == Expected
           ->  true
           ;   logic_rule_conflict(A, B, Functional, Actual),
               format(user_error, "~q~nvs ~q~ngave ~q, expected ~q~n", [A, B, Actual, Expected]), fail
           )).

test(opposing_modalities) :-
    forall(member(A-B, [assert-deny, deny-assert, oblige-forbid, forbid-oblige, permit-forbid, forbid-permit]),
           logic_ir:conflicting_modality(A, B)),
    findall(A-B, logic_ir:conflicting_modality(A, B), Pairs), length(Pairs, 6),
    at(p, [], P),
    rr(assert, P, none, [], [], A1), rr(assert, P, none, [], [], A2), rr(deny, P, none, [], [], D),
    rr(permit, P, none, [], [], Permit), rr(oblige, P, none, [], [], Oblige),
    status_cases([case(A1, A2, [], disjoint), case(A1, D, [], contradiction), case(Permit, Oblige, [], disjoint)]).

test(contexts) :-
    forall(member(Args-Holds, [
        [scope('', '', []), '', '', scope(x, y, []), '', '']-true,
        [scope(x, y, []), '', '', scope('', '', []), '', '']-true,
        [scope(x, y, []), '', '', scope(x, y, []), '', '']-true,
        [scope(x, '', []), '', '', scope(z, '', []), '', '']-false,
        [scope('', y, []), '', '', scope('', z, []), '', '']-false,
        [scope('', '', []), b, '', scope('', '', []), '', a]-false,
        [scope('', '', []), a, '', scope('', '', []), '', a]-true,
        [scope('', '', []), a, '', scope('', '', []), '', b]-true,
        [scope('', '', []), '', a, scope('', '', []), b, '']-false,
        [scope('', '', []), '', b, scope('', '', []), b, '']-true,
        [scope('', '', []), a, '', scope('', '', []), b, '']-true,
        [scope('', '', []), '', a, scope('', '', []), '', b]-true
    ]),
    (   Goal =.. [rule_context_compatible|Args],
        ( logic_ir:Goal -> Actual = true ; Actual = false ),
        Actual == Holds
    ->  true
    ;   format(user_error, "rule_context_compatible ~q~n", [Args]), fail
    )),
    at(p, [], P),
    A = rule(atom, assert, P, none, [], scope(legal, eu, []), '', '', '', []),
    B = rule(atom, deny, P, none, [], scope(legal, us, []), '', '', '', []),
    C = rule(atom, deny, P, none, [], scope(legal, eu, []), '', '', '', []),
    status_cases([case(A, B, [], disjoint), case(A, C, [], contradiction)]).

test(variant_bodies) :-
    v('X', X), v('C', C), n(0, Zero), n(1, One), n(2, Two),
    at(p, [C], Head), at(total, [C, X], Total), at(total, [C, One], TotalOne), at(total, [C, Two], TotalTwo),
    vars(['C', 'X'], Vars),
    Inf is inf,
    forall(member(Body-Functional-Expected, [
        Total-[]-contradiction,
        all([Total, compare(gt, X, Zero)])-[]-contradiction,
        all([Total, compare(gt, X, Zero), compare(lt, X, Zero)])-[]-disjoint,
        all([Total, compare(lt, Two, One)])-[]-disjoint,
        all([Total, compare(lt, X, X)])-[]-disjoint,
        all([Total, compare(lt, X, C)])-[]-unresolved,
        all([Total, not(atom(default, q, [C], positive, true))])-[]-unresolved,
        all([Total, compare(gt, X, number(Inf, none))])-[]-unresolved,
        all([TotalOne, TotalTwo])-[]-contradiction,
        all([TotalOne, TotalTwo])-[functional(default, total, 2, [1])]-disjoint
    ]),
    (   rr(forbid, Head, Body, [], Vars, A), rr(permit, Head, Body, [], Vars, B),
        status_cases([case(A, B, Functional, Expected)])
    )).

test(integer_declarations) :-
    v('X', X), v('C', C), n(0, Zero), n(1, One),
    at(p, [C], Head), at(total, [C, X], Total),
    Body = all([Total, compare(gt, X, Zero), compare(lt, X, One)]),
    forall(member(TypeA-TypeB-Expected, [n-n-contradiction, int-int-disjoint, integer-integer-disjoint, int-n-unresolved, n-integer-unresolved]),
    (   rr(forbid, Head, Body, [], [variable('C', cart, forall), variable('X', TypeA, forall)], A),
        rr(permit, Head, Body, [], [variable('C', cart, forall), variable('X', TypeB, forall)], B),
        status_cases([case(A, B, [], Expected)])
    )).

test(integer_variables) :-
    logic_ir:integer_variables([X-int, Y-n, X-n, Z-integer, a-int, Z-int], Loose, Strict),
    Loose == [Z], Strict == [Z, X],
    logic_ir:integer_variables([], [], []),
    var(Y).

test(overlapping_bodies) :-
    v('C', C), v('T', T), v('U', U), n(0, Zero), n(5, Five),
    at(p, [C], Head), at(total, [C, T], TotalT), at(total, [C, U], TotalU), at(gift, [C], Gift),
    vars(['C', 'T', 'U'], Vars),
    Functional = [functional(default, total, 2, [1])],
    rr(forbid, Head, all([TotalT, compare(gt, T, Zero)]), [], Vars, Positive),
    rr(permit, Head, all([TotalU, compare(gt, U, Five)]), [], Vars, Large),
    rr(permit, Head, all([TotalU, compare(lt, U, Zero)]), [], Vars, Negative),
    rr(permit, Head, all([TotalU, compare(gt, U, Zero), Gift]), [], Vars, LargeGift),
    rr(permit, Head, all([TotalU, any([Gift])]), [], Vars, Disjunctive),
    rr(permit, Head, all([TotalU, compare(lt, U, C)]), [], Vars, Untranslated),
    rr(permit, Head, all([TotalU, compare(gt, U, Zero), compare(lt, U, Zero)]), [], Vars, Empty),
    status_cases([
        case(Positive, Large, Functional, contradiction),
        case(Large, Positive, Functional, contradiction),
        case(Positive, Large, [], contradiction),
        case(Positive, Negative, Functional, disjoint),
        case(Positive, Negative, [], unresolved),
        case(Positive, LargeGift, Functional, contradiction),
        case(LargeGift, Positive, Functional, contradiction),
        case(Positive, Disjunctive, Functional, unresolved),
        case(Positive, Untranslated, Functional, unresolved),
        case(Positive, Empty, Functional, disjoint)
    ]).

test(atom_exceptions) :-
    v('C', C), at(p, [C], Head), at(q, [C], Q), at(r, [C], R), at(s, [C], S),
    vars(['C'], Vars),
    rr(forbid, Head, Q, [R], Vars, Unless),
    rr(permit, Head, all([Q, R]), [], Vars, WithR),
    rr(permit, Head, all([Q, S]), [], Vars, WithS),
    rr(permit, Head, Q, [], Vars, Plain),
    rr(forbid, Head, Q, [all([R, not(S)])], Vars, UnlessComplex),
    status_cases([
        case(Unless, WithR, [], disjoint),
        case(WithR, Unless, [], disjoint),
        case(Unless, WithS, [], unresolved),
        case(WithS, Unless, [], unresolved),
        case(UnlessComplex, WithR, [], unresolved),
        case(Unless, Plain, [], unresolved),
        case(Plain, Unless, [], unresolved)
    ]),
    logic_ir:exception_entailed([S, R], parts([Q, R], [], []), []),
    \+ logic_ir:exception_entailed([], parts([Q, R], [], []), []),
    findall(x, logic_ir:exception_entailed([R, R], parts([Q, R], [], []), []), [x]).

test(heads_must_unify) :-
    at(p, [], P), at(q, [], Q),
    rr(forbid, P, none, [], [], A), rr(permit, Q, none, [], [], B),
    status_cases([case(A, B, [], disjoint)]).

test(functional_closure) :-
    F = [functional(default, total, 2, [1])],
    at(total, [c, X], A), at(total, [c, Y], B),
    logic_ir:functional_closure([A, B], F), X == Y,
    at(total, [c, number(1, none)], One), at(total, [c, number(2, none)], Two),
    \+ logic_ir:functional_closure([One, Two], F),
    at(total, [d, number(2, none)], OtherKey),
    logic_ir:functional_closure([One, OtherKey], F),
    \+ logic_ir:functional_closure([One, Two], [functional(default, total, 2, [1]), functional(default, other, 2, [1])]),
    logic_ir:functional_closure([One, Two], [functional(default, total, 2, [2])]),
    logic_ir:functional_closure([One, atom(ns, total, [c, number(2, none)], positive, false)], F),
    logic_ir:functional_closure([One, atom(default, total, [c, number(2, none), x], positive, false)], F),
    at(total, [c, P], C1), at(total, [c, Q], C2), at(total, [c, number(3, none)], C3),
    logic_ir:functional_closure([C1, C2, C3], F), P == number(3, none), Q == number(3, none),
    % g's keys become identical only once f identifies V1 and V2.
    at(g, [V1, number(1, none)], G1), at(g, [V2, number(2, none)], G2), at(f, [a, V1], F1), at(f, [a, V2], F2),
    \+ logic_ir:functional_closure([G1, G2, F1, F2], [functional(default, f, 2, [1]), functional(default, g, 2, [1])]),
    logic_ir:functional_closure([G1, G2, F1, F2], [functional(default, f, 2, [1])]),
    V1 == V2.

test(identify_values) :-
    logic_ir:identify_value(a, a, false, false),
    logic_ir:identify_value(X, a, false, Changed1), X == a, Changed1 == true,
    logic_ir:identify_value(b, Y, false, Changed2), Y == b, Changed2 == true,
    \+ logic_ir:identify_value(number(1, none), number(2, none), false, _),
    logic_ir:identify_value(number(1000, ms), number(1, s), false, false),
    logic_ir:identify_value(timestamp(a), timestamp(b), true, true),
    logic_ir:identify_values([k, A1, B1], [k, a, b], [1], 1, false, true), A1 == a, B1 == b,
    logic_ir:identify_values([x, y], [z, y], [1], 1, false, false),
    logic_ir:identify_values([C1, x], [c, x], [2], 1, false, true), C1 == c,
    logic_ir:identify_values([k, C2], [k, c], [2], 1, false, false), var(C2).

test(distinct_values) :-
    forall(member(L-R-Distinct, [
        number(1, none)-number(2, none)-true, number(1000, ms)-number(1, s)-false,
        const(a, s)-const(b, s)-true, const(a, s)-const(a, t)-false,
        const('5', s)-number(5, none)-false, const(a, s)-number(5, none)-true,
        timestamp(a)-timestamp(b)-false, var('X', n)-number(1, none)-false,
        number(1, none)-var('X', n)-false, _-number(1, none)-false, number(1, none)-_-false,
        number(1, none)-timestamp(a)-false
    ]),
    (   ( logic_ir:values_distinct(L, R) -> Actual = true ; Actual = false ), Actual == Distinct
    ->  true
    ;   format(user_error, "values_distinct(~q, ~q)~n", [L, R]), fail
    )).

test(comparison_translation) :-
    forall(member(Compare-Expected, [
        compare(lt, number(1, none), number(2, none))-true,
        compare(gt, number(1, none), number(2, none))-false,
        compare(lt, X, number(2, none))-constraint(c(lt, X, 2)),
        compare(lt, number(2, none), X)-constraint(c(gt, X, 2)),
        compare(lte, number(2, s), X)-constraint(c(gte, X, 2000)),
        compare(eq, X, X)-true, compare(lte, X, X)-true, compare(gte, X, X)-true,
        compare(lt, X, X)-false, compare(gt, X, X)-false, compare(neq, X, X)-false,
        compare(lt, X, Y)-unknown,
        compare(eq, const(a, s), const(a, t))-true,
        compare(eq, const(a, s), const(b, s))-false,
        compare(lt, const(a, s), number(1, none))-unknown,
        compare(lt, number(1, none), const(a, s))-unknown,
        compare(lt, const(a, s), const(b, s))-false,
        compare(eq, timestamp(a), timestamp(a))-false,
        compare(eq, var('X', n), number(1, none))-unknown,
        compare(eq, X, const(a, s))-unknown
    ]),
    (   findall(R, logic_ir:translate_comparison(Compare, R), [Actual]), Actual =@= Expected
    ->  true
    ;   format(user_error, "translate_comparison(~q)~n", [Compare]), fail
    )),
    var(Y),
    forall(member(Op-Flipped, [eq-eq, neq-neq, lt-gt, gt-lt, lte-gte, gte-lte]), logic_ir:flipped_operator(Op, Flipped)),
    findall(Op, logic_ir:reflexive_operator(Op), [eq, lte, gte]).

test(comparison_lists) :-
    True = compare(lt, number(1, none), number(2, none)),
    False = compare(gt, number(1, none), number(2, none)),
    Unknown = compare(lt, A, B),
    logic_ir:translate_comparisons([], [], complete),
    logic_ir:translate_comparisons([True, compare(lt, X, number(1, none)), compare(gt, X, number(0, none))], [c(lt, X, 1), c(gt, X, 0)], complete),
    logic_ir:translate_comparisons([Unknown, compare(lt, X, number(1, none))], [c(lt, X, 1)], unknown),
    logic_ir:translate_comparisons([compare(lt, X, number(1, none)), False, compare(gt, X, number(0, none))], [c(lt, X, 1)], false),
    logic_ir:translate_comparisons([Unknown, False, Unknown], [], false),
    var(A), var(B).

test(body_parts) :-
    at(p, [], P), N = atom(default, q, [], negative, false),
    C = compare(eq, number(1, none), number(1, none)),
    logic_ir:expression_parts(none, parts([], [], [])),
    findall(Parts, logic_ir:expression_parts(all([P, all([C, N]), any([P]), not(P)]), Parts), [parts([P], [C], [N, any([P]), not(P)])]),
    logic_ir:expression_parts(P, parts([P], [], [])),
    logic_ir:expression_parts(count(P, gte, 1), parts([], [], [count(P, gte, 1)])).

test(subsumption) :-
    at(p, [X], PX), at(p, [a], Pa), at(q, [a], Qa),
    logic_ir:match_atoms([PX], [Qa, Pa]), X == a,
    at(p, [Fresh], PFresh), \+ logic_ir:match_atoms([Pa], [PFresh]), var(Fresh),
    logic_ir:match_atoms([], [Pa]),
    v('Y', _),
    logic_ir:comparison_entailed([c(gt, Y, 5)], [], compare(gt, Y, number(0, none))),
    \+ logic_ir:comparison_entailed([c(gt, Y, 0)], [], compare(gt, Y, number(5, none))),
    logic_ir:comparison_entailed([], [], compare(lt, number(1, none), number(2, none))),
    \+ logic_ir:comparison_entailed([], [], compare(gt, number(1, none), number(2, none))),
    \+ logic_ir:comparison_entailed([], [], compare(lt, Y, _)),
    logic_ir:comparison_entailed([c(gt, Y, 0)], [Y], compare(gte, Y, number(1, none))),
    \+ logic_ir:comparison_entailed([c(gt, Y, 0)], [], compare(gte, Y, number(1, none))),
    logic_ir:parts_subsume(parts([], [compare(gte, Z, number(1, none))], []), parts([], [compare(gt, Z, number(0, none)), compare(lt, Z, _)], []), [Z-int]),
    \+ logic_ir:parts_subsume(parts([], [compare(gte, Z, number(1, none))], []), parts([], [compare(gt, Z, number(0, none))], []), [Z-n]),
    \+ logic_ir:parts_subsume(parts([], [], [x]), parts([], [], []), []),
    \+ logic_ir:certain_subsumption(parts([], [], []), parts([], [compare(lt, W, _)], []), [], []),
    \+ logic_ir:certain_subsumption(parts([], [], [x]), parts([], [], []), [], []),
    \+ logic_ir:certain_subsumption(parts([], [], []), parts([], [], [x]), [], []),
    \+ logic_ir:certain_subsumption(parts([], [], []), parts([], [compare(gt, W, number(0, none)), compare(lt, W, number(1, none))], []), [], [W-int]),
    logic_ir:certain_subsumption(parts([], [], []), parts([], [compare(gt, W, number(0, none)), compare(lt, W, number(1, none))], []), [], [W-n]),
    \+ logic_ir:certain_subsumption(parts([], [compare(gt, W, number(1, none))], []), parts([], [compare(gt, W, number(0, none))], []), [], []),
    at(total, [c, number(1, none)], T1), at(total, [c, number(2, none)], T2),
    \+ logic_ir:certain_subsumption(parts([], [], []), parts([T1, T2], [], []), [functional(default, total, 2, [1])], []),
    \+ logic_ir:certain_subsumption(parts([Qa], [], []), parts([Pa], [], []), [], []),
    var(W).

test(missing_key_declarations) :-
    v('C', C), v('T', T), v('U', U), n(0, Zero),
    at(p, [C], Head), at(total, [C, T], TotalT), at(total, [C, U], TotalU),
    vars(['C', 'T', 'U'], Vars),
    rr(forbid, Head, all([TotalT, compare(gt, T, Zero)]), [], Vars, Positive),
    rr(permit, Head, all([TotalU, compare(lt, U, Zero)]), [], Vars, Negative),
    missing(Positive, Negative, [], [missing_keys(default, total, 2, [[1]])]),
    missing(Positive, Negative, [functional(default, total, 2, [1])], []),
    missing(Positive, Negative, [functional(default, total, 2, [2])], []),
    % Every single key set that decides the pair is listed, smallest first.
    at(line, [C, const(k, s), T], LineT), at(line, [C, const(k, s), U], LineU),
    rr(forbid, Head, all([LineT, compare(gt, T, Zero)]), [], Vars, LinePositive),
    rr(permit, Head, all([LineU, compare(lt, U, Zero)]), [], Vars, LineNegative),
    missing(LinePositive, LineNegative, [], [missing_keys(default, line, 3, [[1], [2], [1, 2]])]),
    Six = [C, const(a, s), const(b, s), const(c, s), const(d, s)],
    append(Six, [T], SixT), append(Six, [U], SixU),
    at(six, SixT, SixAtomT), at(six, SixU, SixAtomU),
    rr(forbid, Head, all([SixAtomT, compare(gt, T, Zero)]), [], Vars, SixPositive),
    rr(permit, Head, all([SixAtomU, compare(lt, U, Zero)]), [], Vars, SixNegative),
    logic_rule_missing_keys(SixPositive, SixNegative, [], [missing_keys(default, six, 6, SixKeySets)]),
    length(SixKeySets, 31),
    Wide = [C, const(a, s), const(b, s), const(c, s), const(d, s), const(e, s)],
    append(Wide, [T], WideT), append(Wide, [U], WideU),
    at(wide, WideT, WideAtomT), at(wide, WideU, WideAtomU),
    rr(forbid, Head, all([WideAtomT, compare(gt, T, Zero)]), [], Vars, WidePositive),
    rr(permit, Head, all([WideAtomU, compare(lt, U, Zero)]), [], Vars, WideNegative),
    missing(WidePositive, WideNegative, [], [missing_keys(default, wide, 7, [[1, 2, 3, 4, 5, 6]])]),
    rr(permit, Head, all([TotalU, not(atom(default, gift, [C], positive, true))]), [], Vars, Negated),
    missing(Positive, Negated, [], []),
    rr(permit, Head, all([atom(default, flag, [C], positive, false), compare(lt, U, C)]), [], Vars, Unary),
    missing(Positive, Unary, [], []),
    % A declaration can decide a pair through one rule's body alone.
    rr(forbid, Head, all([TotalT, TotalU, compare(gt, T, Zero), compare(lt, U, Zero)]), [], Vars, SelfClash),
    rr(permit, Head, atom(default, flag, [C], positive, false), [], Vars, Flagged),
    missing(SelfClash, Flagged, [], [missing_keys(default, total, 2, [[1]])]),
    missing(Flagged, SelfClash, [], [missing_keys(default, total, 2, [[1]])]),
    % A pair that is already decided needs no declaration.
    rr(permit, Head, all([TotalT, compare(gt, T, Zero)]), [], Vars, SamePositive),
    missing(Positive, SamePositive, [], []).

missing(A, B, Functional, Expected) :-
    logic_rule_missing_keys(A, B, Functional, Actual),
    Actual == Expected.

test(key_set_candidates) :-
    findall(K, logic_ir:candidate_key_set(3, K), [[1], [2], [3], [1, 2], [1, 3], [2, 3]]),
    findall(K, logic_ir:candidate_key_set(1, K), []),
    findall(S, logic_ir:ordered_subset(S, [a, b]), Subsets),
    msort(Subsets, [[], [a], [a, b], [b]]),
    logic_ir:value_last_declarations([predicate(ns, p, 3), predicate(default, q, 2)],
        [functional(ns, p, 3, [1, 2]), functional(default, q, 2, [1])]),
    logic_ir:rule_body_predicates(rule(rule, assert, none, all([atom(default, unary, [a], positive, false), atom(ns, pair, [a, b], positive, false), not(atom(default, hidden, [a, b], positive, true))]), [], s, '', '', '', []),
        [predicate(ns, pair, 2)]),
    logic_ir:declared_functional([functional(ns, p, 2, [1])], predicate(ns, p, 2)),
    \+ logic_ir:declared_functional([functional(ns, p, 2, [1])], predicate(ns, p, 3)).

test(conflict_witness_fields) :-
    at(p, [], P),
    A = rule(atom, assert, P, none, [x], scope(a, b, []), f1, t1, s1, []),
    B = rule(atom, deny, P, P, [y], scope(c, d, []), f2, t2, s2, []),
    logic_rule_conflict_witness(A, B, [], W),
    W == witness{status:disjoint, modality_a:assert, modality_b:deny, head_a:P, head_b:P, body_a:none, body_b:P,
                 exceptions_a:[x], exceptions_b:[y], scope_a:scope(a, b, []), scope_b:scope(c, d, []),
                 valid_from_a:f1, valid_to_a:t1, valid_from_b:f2, valid_to_b:t2, rule_schema_a:s1, rule_schema_b:s2},
    logic_rule_conflict_witness(A, B, W3), W3.status == disjoint.

:- end_tests(logic_ir_conflicts).

:- begin_tests(logic_ir_property_form).

base_rule(Head, Body, Exceptions, rule(rule, forbid, Head, Body, Exceptions, scope(a, s, []), f, t, '', [])).

fold(Body, Exceptions, FoldedBody, Remaining) :-
    base_rule(h, Body, Exceptions, Rule),
    deterministic(logic_rule_fold_exceptions(Rule, Folded)),
    Folded == rule(rule, forbid, h, FoldedBody, Remaining, scope(a, s, []), f, t, '', []).

test(folds_comparison_exceptions) :-
    X = var('X', n), One = number(1, none),
    fold(none, [], none, []),
    fold(p, [], p, []),
    fold(none, [compare(lt, X, One)], compare(gte, X, One), []),
    fold(none, [compare(lt, X, One), compare(eq, X, One)], all([compare(gte, X, One), compare(neq, X, One)]), []),
    fold(all([p, q]), [compare(gt, X, One)], all([p, q, compare(lte, X, One)]), []),
    fold(p, [compare(neq, X, One)], all([p, compare(eq, X, One)]), []),
    fold(p, [compare(gte, X, One)], all([p, compare(lt, X, One)]), []),
    fold(p, [compare(lte, X, One)], all([p, compare(gt, X, One)]), []),
    fold(p, [compare(lt, X, One), q], p, [compare(lt, X, One), q]),
    findall(Op-Neg, logic_ir:comparison_negation(Op, Neg), [eq-neq, neq-eq, lt-gte, gte-lt, gt-lte, lte-gt]).

head(atom(default, checkout, [var('C', cart)], positive, false)).
total(Value, atom(cart, total, [var('C', cart), Value], positive, false)).

form(Body, Exceptions, Keys, Conditions) :-
    head(Head),
    form(Head, Body, Exceptions, Keys, Conditions).

form(Head, Body, Exceptions, Keys, Conditions) :-
    base_rule(Head, Body, Exceptions, Rule),
    deterministic(logic_rule_property_form(Rule, Form)),
    (   Form == property_form(forbid, Head, s, f, t, Keys, Conditions)
    ->  true
    ;   format(user_error, "property form of ~q is ~q~n", [Body, Form]), fail
    ).

test(property_conditions) :-
    T = var('T', money), U = var('U', money), Zero = number(0, none), Five = number(5, none),
    total(T, Total), total(U, TotalU),
    Status = atom(cart, status, [var('C', cart), const(open, s)], positive, false),
    Gift = atom(default, gift, [var('C', cart)], positive, false),
    form(Total, [], [cart-total], []),
    form(all([Total, compare(gt, T, Zero), compare(lt, Zero, Five)]), [], [cart-total], [cond(cart-total, gt, Zero, money)]),
    form(all([Total, compare(gt, T, var('V', n))]), [], [cart-total], untranslatable),
    form(all([Total, compare(gt, var('V', n), T)]), [], [cart-total], untranslatable),
    form(all([Total, compare(lt, Zero, var('V', n))]), [], [cart-total], untranslatable),
    form(all([Total, Total, compare(gt, var('V', n), Zero)]), [], [cart-total], untranslatable),
    form(atom(default, flagged, [T], positive, false), Total, [], [cart-total], untranslatable),
    form(all([Total, compare(gt, T, Zero), compare(lte, Five, T)]), [], [cart-total], [cond(cart-total, gt, Zero, money), cond(cart-total, gte, Five, money)]),
    form(all([Total, Status]), [], [cart-status, cart-total], [cond(cart-status, eq, const(open, s), value)]),
    total(number(3, none), TotalThree), form(TotalThree, [], [cart-total], [cond(cart-total, eq, number(3, none), value)]),
    form(all([TotalThree, compare(gt, var('V', n), Zero)]), [], [cart-total], untranslatable),
    total(duration(3, h), TotalDuration), form(TotalDuration, [], [cart-total], [cond(cart-total, eq, duration(3, h), value)]),
    total(timestamp(a), TotalTime), form(TotalTime, [], [cart-total], untranslatable),
    form(all([Total, compare(lt, Zero, Five)]), [], [cart-total], []),
    form(all([Total, compare(gt, Zero, Five), compare(gt, T, Zero)]), [], [cart-total], never),
    form(all([Total, compare(lt, const(a, s), Zero)]), [], [cart-total], untranslatable),
    form(all([Total, compare(lt, const(a, s), Zero), compare(gt, Zero, Five)]), [], [cart-total], untranslatable),
    form(all([Total, compare(gt, Zero, Five), compare(lt, const(a, s), Zero)]), [], [cart-total], never),
    form(all([Total, TotalU, compare(gt, T, U)]), [], [cart-total], untranslatable),
    form(all([Total, compare(gt, var('V', n), Zero)]), [], [cart-total], untranslatable),
    form(all([Total, Gift]), [], [cart-total], untranslatable),
    form(all([Total, not(Status)]), [], [cart-status, cart-total], untranslatable),
    form(all([Total, count(Status, gt, 1)]), [], [cart-status, cart-total], untranslatable),
    form(Total, [Status], [cart-status, cart-total], untranslatable),
    form(any([Total, any([Status])]), [], [cart-status, cart-total], untranslatable),
    form(none, [], [], []).

test(property_reads_must_agree) :-
    T = var('T', money), U = var('U', money),
    total(T, Total), total(U, TotalU), total(number(1, none), TotalOne),
    form(all([Total, Total]), [], [cart-total], []),
    form(all([Total, TotalU]), [], [cart-total], untranslatable),
    form(all([Total, TotalOne]), [], [cart-total], untranslatable),
    % A value variable cannot also name an instance or the head subject.
    form(atom(cart, total, [T, T], positive, false), [], [cart-total], untranslatable),
    form(atom(cart, total, [var('C', cart), var('C', cart)], positive, false), [], [cart-total], untranslatable),
    % One variable cannot read two different properties.
    form(all([Total, atom(cart, tax, [var('C', cart), T], positive, false)]), [], [cart-tax, cart-total], untranslatable),
    form(atom(cart, total, [], positive, false), [], [], untranslatable),
    form(atom(default, total, [var('C', cart), T], positive, false), [], [], untranslatable),
    form(atom(cart, total, [var('C', cart), T], negative, false), [], [cart-total], untranslatable).

test(headless_rules_read_properties) :-
    T = var('T', money), total(T, Total),
    Rule = rule(constraint, forbid, none, all([Total, compare(gt, T, number(0, none))]), [], scope('', '', []), '', '', '', []),
    logic_rule_property_form(Rule, property_form(forbid, none, '', '', '', [cart-total], [cond(cart-total, gt, number(0, none), money)])).

test(condition_operands) :-
    findall(O, logic_ir:condition_operand(['T'-(c-p)-money], var('T', money), O), [property(c-p, money)]),
    findall(O, logic_ir:condition_operand([], number(1, none), O), [constant(number(1, none))]),
    findall(O, logic_ir:condition_operand([], var('T', money), O), [other(var('T', money))]),
    logic_ir:comparison_condition(_, compare(eq, x, y), never, never),
    logic_ir:comparison_condition(_, compare(eq, x, y), untranslatable, untranslatable).

:- end_tests(logic_ir_property_form).

:- begin_tests(logic_ir_stratification).

p(Name, atom(default, Name, [], positive, true)).
r(Head, Body, rule(rule, assert, Head, Body, [], scope('', '', []), '', '', '', [])).

test(negation_cycles) :-
    p(p, P), p(q, Q), p(s, S),
    r(P, not(P), SelfNegation),
    r(P, Q, PQ), r(Q, P, QP), r(Q, not(P), QNotP), r(S, not(P), SNotP),
    r(P, all([S, not(Q)]), PAllNotQ), r(P, any([S, not(Q)]), PAnyNotQ), r(P, count(Q, gt, 1), PCountQ),
    \+ logic_rules_stratified([SelfNegation]),
    logic_rules_stratified([PQ, QP]),
    \+ logic_rules_stratified([PQ, QNotP]),
    logic_rules_stratified([PQ, SNotP]),
    \+ logic_rules_stratified([PAllNotQ, QP]),
    \+ logic_rules_stratified([PAnyNotQ, QP]),
    logic_rules_stratified([PCountQ, QP]),
    logic_rules_stratified([]),
    \+ logic_rules_stratified(not_a_list),
    % Only rules contribute edges.
    logic_rules_stratified([rule(constraint, assert, P, not(P), [], scope('', '', []), '', '', '', [])]),
    % Predicates differ by arity.
    r(atom(default, p, [const(a, s)], positive, true), not(P), Arity),
    logic_rules_stratified([Arity]).

test(dependency_edges, [nondet]) :-
    p(p, P), p(q, Q), p(s, S),
    findall(B-Sign, logic_ir:expression_dependency(all([Q, not(S), any([P]), count(Q, gt, 1), compare(eq, a, b)]), B, Sign),
            [Q-positive, S-negative, P-positive, Q-positive]),
    findall(Path, logic_ir:dependency_path(a, a, [edge(a, a, positive)], []), [_]),
    \+ logic_ir:dependency_path(a, a, [], [a]),
    logic_ir:dependency_path(a, c, [edge(a, b, positive), edge(b, c, negative)], []),
    \+ logic_ir:dependency_path(a, c, [edge(a, b, positive), edge(b, a, positive)], []),
    \+ logic_ir:dependency_path(a, c, [edge(a, b, positive)], []).

:- end_tests(logic_ir_stratification).

:- begin_tests(logic_ir_conflict_internals).

at(Name, Args, atom(default, Name, Args, positive, false)).
n(Value, number(Value, none)).

variant(Parts, Functional, Declared, Expected) :-
    logic_ir:variant_body_status(Parts, Functional, Declared, Actual),
    Actual == Expected.

test(variant_body_status) :-
    n(0, Zero), n(1, One), n(2, Two),
    at(total, [c, One], T1), at(total, [c, Two], T2),
    variant(parts([T1, T2], [], []), [functional(default, total, 2, [1])], [], disjoint),
    variant(parts([T1, T2], [], []), [], [], contradiction),
    variant(parts([], [compare(lt, Two, One)], []), [], [], disjoint),
    variant(parts([], [compare(gt, X, Zero), compare(lt, X, One)], []), [], [X-int], disjoint),
    variant(parts([], [compare(gt, X, Zero), compare(lt, X, One)], []), [], [X-n], contradiction),
    variant(parts([], [compare(gt, X, Zero), compare(lt, X, One)], []), [], [X-int, X-n], unresolved),
    variant(parts([], [compare(lt, X, Y)], []), [], [], unresolved),
    variant(parts([], [], [x]), [], [], unresolved),
    var(Y).

pair(PartsA, PartsB, ExceptionsA, ExceptionsB, Functional, Expected) :-
    logic_ir:body_pair_status(PartsA, PartsB, ExceptionsA, ExceptionsB, Functional, [], Actual),
    Actual == Expected.

test(body_pair_status) :-
    n(0, Zero), n(1, One), n(2, Two),
    at(q, [c], Q), at(r, [c], R),
    at(total, [c, One], T1), at(total, [c, Two], T2),
    pair(parts([T1], [], []), parts([T2], [], []), [], [], [functional(default, total, 2, [1])], disjoint),
    pair(parts([], [compare(gt, X, Zero)], []), parts([], [compare(lt, X, Zero)], []), [], [], [], disjoint),
    pair(parts([Q], [], []), parts([Q, R], [], []), [R], [], [], disjoint),
    pair(parts([Q, R], [], []), parts([Q], [], []), [], [R], [], disjoint),
    pair(parts([Q], [], []), parts([Q, R], [], []), [], [], [], contradiction),
    pair(parts([Q, R], [], []), parts([Q], [], []), [], [], [], contradiction),
    pair(parts([Q], [], []), parts([Q], [], []), [Q], [], [], disjoint),
    pair(parts([Q], [], []), parts([R], [], []), [], [], [], unresolved),
    pair(parts([Q], [], []), parts([Q], [], []), [R], [], [], unresolved).

test(joint_satisfiability) :-
    n(0, Zero), n(1, One), n(2, Two),
    % Real-valued variables fit strictly between 0 and 1.
    \+ logic_ir:parts_jointly_unsatisfiable(parts([], [compare(gt, X, Zero)], []), parts([], [compare(lt, X, One)], []), [], [X-n]),
    logic_ir:parts_jointly_unsatisfiable(parts([], [compare(gt, X, Zero)], []), parts([], [compare(lt, X, One)], []), [], [X-int]),
    at(total, [c, One], T1), at(total, [c, Two], T2),
    logic_ir:parts_jointly_unsatisfiable(parts([T1], [], []), parts([T2], [], []), [functional(default, total, 2, [1])], []),
    \+ logic_ir:parts_jointly_unsatisfiable(parts([T1], [], []), parts([T2], [], []), [], []),
    logic_ir:parts_jointly_unsatisfiable(parts([], [compare(lt, Two, One)], []), parts([], [], []), [], []),
    var(X).

test(atom_pairs) :-
    logic_ir:atom_pairs([a, b, c], Pairs), Pairs == [a-b, a-c, b-c],
    logic_ir:atom_pairs([], Empty), Empty == [].

test(closure_repeats_after_any_change) :-
    F = [functional(default, f, 2, [1]), functional(default, g, 2, [1])],
    at(g, [V1, number(1, none)], G1), at(g, [V2, number(2, none)], G2),
    at(f, [a, V1], F1), at(f, [a, V2], F2), at(f, [b, _], F3), at(k, [x], K),
    % The f pair changes in the first pass; later pairs of other predicates or
    % keys must not reset that, so the second pass finds the g clash.
    \+ logic_ir:functional_closure([G1, G2, F1, F2, F3, K], F),
    \+ logic_ir:functional_closure([G1, G2, F1, F2, K], F),
    var(V1), var(V2).

test(closure_pairs_atoms_of_one_predicate) :-
    F = [functional(default, f, 2, [1])],
    at(f, [a, X], FX), at(g, [a, Y], GY),
    logic_ir:functional_closure([FX, GY], F), X \== Y,
    at(f, [a, P, Q], FPQ), at(f, [a, R], FR),
    logic_ir:functional_closure([FPQ, FR], F), P \== R, var(Q).

test(closure_compares_only_key_positions) :-
    at(f, [a, x, V1], A), at(f, [a, y, V2], B),
    logic_ir:functional_closure([A, B], [functional(default, f, 3, [2])]),
    V1 \== V2,
    at(f, [W1, k], C), at(f, [W2, k], D),
    logic_ir:functional_closure([C, D], [functional(default, f, 2, [2])]),
    W1 == W2.

test(identify_value_changes) :-
    logic_ir:identify_values([X, k], [Y, k], [2], 1, false, Changed), Changed == true, X == Y,
    logic_ir:identify_value(number(1000, ms), number(1, s), true, Same), Same == true,
    logic_ir:identify_value(a, a, true, Equal), Equal == true.

test(distinct_value_edges, [nondet]) :-
    \+ logic_ir:values_distinct(number(x, h), number(1, none)),
    \+ logic_ir:values_distinct(number(1, none), number(x, h)),
    \+ logic_ir:values_distinct(number(1, none), number(1.0, none)),
    logic_ir:values_distinct(number(5, none), const(a, s)),
    \+ logic_ir:values_distinct(number(_, none), number(1, none)),
    \+ logic_ir:values_distinct(number(1, none), number(_, none)).

test(match_atoms_needs_every_atom) :-
    at(p, [a], Pa), at(q, [b], Qb),
    \+ logic_ir:match_atoms([Pa, Qb], [Pa]).

test(comparison_lists_keep_constraints) :-
    True = compare(lt, number(1, none), number(2, none)),
    False = compare(gt, number(1, none), number(2, none)),
    Unknown = compare(lt, A, B),
    deterministic(logic_ir:translate_comparisons([Unknown, False, Unknown, True], C0, S0)), C0 == [], S0 == false,
    logic_ir:translate_comparisons([compare(lt, X, number(1, none)), True], C1, S1), C1 == [c(lt, X, 1)], S1 == complete,
    logic_ir:translate_comparisons([compare(lt, X, number(1, none)), False], C2, S2), C2 == [c(lt, X, 1)], S2 == false,
    var(A), var(B).

test(comparison_operands) :-
    logic_ir:comparison_operand(X, O1), O1 = var(V), V == X,
    findall(O, logic_ir:comparison_operand(number(2, s), O), [num(2000)]),
    findall(O, logic_ir:comparison_operand(const(a, s), O), [ground(const(a, s))]),
    findall(O, logic_ir:comparison_operand(number(x, h), O), [ground(number(x, h))]),
    findall(O, logic_ir:comparison_operand(var('X', n), O), [other(var('X', n))]),
    findall(O, logic_ir:comparison_operand(number(1, _), O), O2), O2 = [other(number(1, U2))], var(U2),
    logic_ir:ir_ground(number(1, none)),
    \+ logic_ir:ir_ground(number(_, none)),
    \+ logic_ir:ir_ground(var('X', n)),
    \+ logic_ir:ir_ground(f(g(var('X', n)))).

test(witness_reads_declarations) :-
    at(total, [const(c, s), number(1, none)], T1),
    A = rule(rule, forbid, atom(default, p, [], positive, false), all([T1, T1]), [], scope('', '', []), '', '', '', []),
    B = rule(rule, permit, atom(default, p, [], positive, false), all([T1, T1]), [], scope('', '', []), '', '', '', []),
    logic_rule_conflict_witness(A, B, W), W.status == contradiction,
    logic_rule_conflict(A, B, S), S == contradiction.

:- end_tests(logic_ir_conflict_internals).

:- begin_tests(logic_ir_declarations, [setup(attach_kb), cleanup(detach_kb)]).

:- dynamic kb_dir/1.

attach_kb :-
    tmp_file(logic_ir_kb, Dir),
    make_directory_path(Dir),
    assertz(kb_dir(Dir)),
    kb_attach(Dir).

detach_kb :-
    kb_detach,
    retract(kb_dir(Dir)),
    delete_directory_and_contents(Dir).

% Stores a fact entity directly, without the entity validation of kb_assert_entity/2.
fact(Id, Props) :-
    kb:kb_graph(Graph),
    format(atom(Uri), 'kb:entity/~w', [Id]),
    kb:with_kb_mutex((
        rdf_assert(Uri, kb:type, "fact"^^'http://www.w3.org/2001/XMLSchema#string', Graph),
        forall(member(Key=Value, [id=Id, title="Logic fixture", status=active|Props]), kb:store_property(Uri, Key, Value, Graph))
    )),
    kb:kb_refresh_entity_index(Id).

schema(Id, Name, Arity, Names, Keys) :-
    findall("t", member(_, Names), Types),
    fact(Id, [fact_kind=predicate_schema, predicate_name=Name, predicate_arity=Arity,
              argument_names=Names, argument_types=Types, key_arguments=Keys]).

test(reads_key_argument_declarations) :-
    functional_predicate_declarations(None), None == [],
    schema('FACT-SCHEMA-READING', "reading", 2, ["sensor", "value"], ["sensor"]),
    schema('FACT-SCHEMA-LINE', "line", 3, ["cart", "sku", "qty"], ["sku", "cart"]),
    schema('FACT-SCHEMA-PLAIN', "plain", 2, ["a", "b"], []),
    functional_predicate_declarations(Functional),
    Functional == [functional(default, line, 3, [1, 2]), functional(default, reading, 2, [1])],
    % A schema that cannot be read leaves every predicate multivalued.
    schema('FACT-SCHEMA-BROKEN', "broken", "2.5", ["a"], ["a"]),
    functional_predicate_declarations(Broken), Broken == [].

:- end_tests(logic_ir_declarations).
