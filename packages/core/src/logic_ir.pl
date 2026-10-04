% Safe, data-driven interpreter for kibi.logic.v1.
%
% This module deliberately parses a small JSON IR into ordinary Prolog terms.
% It never consults or asserts caller-provided source.  The terms are evaluated
% by a bounded interpreter and are suitable for proof witnesses.
:- module(logic_ir, [
    logic_rule_from_props/2,
    logic_rule_safety/2,
    logic_rule_render/2,
    logic_rule_semantic_key/2,
    logic_derive/2,
    logic_rule_conflict/3,
    logic_rule_conflict/4,
    logic_rule_conflict_witness/3,
    logic_rule_missing_keys/4,
    functional_predicate_declarations/1,
    logic_atom_signature/2,
    logic_rules_stratified/1,
    logic_rule_fold_exceptions/2,
    logic_rule_property_form/2
]).

:- use_module(library(http/json)).
:- use_module(library(aggregate)).
:- use_module(library(clpfd)).
:- use_module('intervals.pl', [numeric_constraints_satisfiable/2, numeric_constraint_entailed/3, numeric_constraint_holds/3]).
:- use_module('kb.pl', [kb_entity/3, predicate_fact/5, predicate_schema_keys/4]).

%% logic_rule_from_props(+Props, -Rule)
% Props is an entity property list from a fact_kind=rule fact.
logic_rule_from_props(Props, Rule) :-
    memberchk(rule_ir=Raw, Props),
    raw_json_atom(Raw, Json),
    catch(atom_json_dict(Json, Dict, [value_string_as(atom)]), _, fail),
    json_rule(Dict, Rule).

raw_json_atom(^^(Value, _), Atom) :- !, raw_json_atom(Value, Atom).
raw_json_atom(literal(type(_, Value)), Atom) :- !, raw_json_atom(Value, Atom).
raw_json_atom(Value, Atom) :- atom(Value), !, Atom = Value.
raw_json_atom(Value, Atom) :- string(Value), !, atom_string(Atom, Value).

json_rule(Dict, rule(Kind, Modality, Head, Body, Exceptions, Scope, From, To, SchemaId, Variables)) :-
    json_rule_keys(Dict),
    get_dict(version, Dict, Version),
    json_text(Version, 'kibi.logic.v1'),
    json_text(Dict.kind, Kind),
    json_modality(Dict.modality, Modality),
    ( get_dict(head, Dict, HeadDict) -> json_atom(HeadDict, Head) ; Head = none ),
    ( get_dict(body, Dict, BodyDict) -> json_expression(BodyDict, Body) ; Body = none ),
    ( get_dict(exceptions, Dict, ExceptionDicts) -> maplist(json_expression, ExceptionDicts, Exceptions) ; Exceptions = [] ),
    ( get_dict(scope, Dict, ScopeDict) -> json_scope(ScopeDict, Scope) ; Scope = scope('', '', []) ),
    ( get_dict(validFrom, Dict, RawFrom) -> json_timestamp(RawFrom, From) ; From = '' ),
    ( get_dict(validTo, Dict, RawTo) -> json_timestamp(RawTo, To) ; To = '' ),
    ( get_dict(ruleSchemaId, Dict, RawSchemaId) -> json_atom_name(RawSchemaId, SchemaId), valid_schema_id(SchemaId) ; SchemaId = '' ),
    ( get_dict(variables, Dict, RawVariables) -> maplist(json_variable, RawVariables, Variables) ; Variables = [] ).

json_rule_keys(Dict) :-
    dict_pairs(Dict, _Tag, Pairs),
    forall(member(Key-_, Pairs), memberchk(Key, [version, kind, modality, head, body, variables, exceptions, scope, validFrom, validTo, ruleSchemaId])).

json_variable(Dict, variable(Name, Type, Quantifier)) :-
    is_dict(Dict),
    dict_keys_allowed(Dict, [name, type, quantifier]),
    get_dict(name, Dict, RawName), json_atom_name(RawName, Name),
    valid_variable_name(Name),
    get_dict(type, Dict, RawType), json_atom_name(RawType, Type), valid_type_name(Type),
    ( get_dict(quantifier, Dict, RawQuantifier) -> json_quantifier(RawQuantifier, Quantifier) ; Quantifier = forall ).

json_quantifier(Value, Value) :- memberchk(Value, [forall, exists]), !.
json_quantifier(Value, Quantifier) :- string(Value), atom_string(Atom, Value), json_quantifier(Atom, Quantifier).

json_modality(Value, Value) :- memberchk(Value, [assert, deny, oblige, permit, forbid]), !.
json_modality(Value, Value) :- string(Value), atom_string(Atom, Value), json_modality(Atom, Value).

json_atom(Dict, atom(Namespace, Name, Args, Polarity, ClosedWorld)) :-
    is_dict(Dict),
    dict_keys_allowed(Dict, [kind, namespace, name, args, polarity, closedWorld]),
    get_dict(kind, Dict, Kind),
    json_text(Kind, atom),
    get_dict(name, Dict, RawName),
    json_atom_name(RawName, Name), valid_predicate_name(Name),
    ( get_dict(namespace, Dict, RawNamespace) -> json_atom_name(RawNamespace, Namespace), valid_predicate_name(Namespace) ; Namespace = default ),
    get_dict(args, Dict, RawArgs),
    is_list(RawArgs),
    length(RawArgs, Arity), Arity =< 8,
    maplist(json_term, RawArgs, Args),
    ( get_dict(polarity, Dict, RawPolarity) -> json_polarity(RawPolarity, Polarity) ; Polarity = positive ),
    ( get_dict(closedWorld, Dict, RawClosedWorld) -> memberchk(RawClosedWorld, [true, false]), ClosedWorld = RawClosedWorld ; ClosedWorld = false ).

json_atom_name(Value, Atom) :- atom(Value), !, Atom = Value.
json_atom_name(Value, Atom) :- string(Value), !, atom_string(Atom, Value).

valid_variable_name(Name) :-
    atom(Name),
    atom_chars(Name, [First|Rest]),
    char_type(First, upper),
    forall(member(Char, Rest), (char_type(Char, alnum) ; Char == '_')).

valid_type_name(Name) :-
    atom(Name),
    atom_chars(Name, [First|Rest]),
    char_type(First, lower),
    forall(member(Char, Rest), (char_type(Char, alnum) ; memberchk(Char, ['_', '-', ':', '/', '.']))).

valid_schema_id(Name) :-
    atom(Name),
    atom_chars(Name, [First|Rest]),
    char_type(First, alnum),
    forall(member(Char, Rest), (char_type(Char, alnum) ; memberchk(Char, ['_', '-', ':', '/', '.']))).

json_timestamp(Value, Timestamp) :-
    json_atom_name(Value, Timestamp),
    parse_time(Timestamp, iso_8601, _).

valid_predicate_name(Name) :-
    atom(Name),
    atom_chars(Name, [First|Rest]),
    char_type(First, lower),
    forall(member(Char, Rest), allowed_predicate_char(Char)).

allowed_predicate_char(Char) :- char_type(Char, alnum), !.
allowed_predicate_char('_').
allowed_predicate_char('-').
allowed_predicate_char('/').
allowed_predicate_char('.').

json_text(Value, Expected) :- atom(Value), !, Value = Expected.
json_text(Value, Expected) :- string(Value), atom_string(Expected, Value).

json_polarity(Value, Value) :- memberchk(Value, [positive, negative]), !.
json_polarity(Value, Polarity) :- string(Value), atom_string(Atom, Value), json_polarity(Atom, Polarity).

json_term(Dict, var(Name, Type)) :-
    is_dict(Dict), dict_keys_allowed(Dict, [kind, name, type]), get_dict(kind, Dict, Kind), json_text(Kind, var),
    get_dict(name, Dict, RawName), json_atom_name(RawName, Name), valid_variable_name(Name),
    get_dict(type, Dict, RawType), json_atom_name(RawType, Type), valid_type_name(Type), !.
json_term(Dict, const(Value, Type)) :-
    is_dict(Dict), dict_keys_allowed(Dict, [kind, value, type]), get_dict(kind, Dict, Kind), json_text(Kind, const),
    get_dict(value, Dict, RawValue), json_atom_name(RawValue, Value),
    ( get_dict(type, Dict, RawType) -> json_atom_name(RawType, Type) ; Type = string ), !.
json_term(Dict, number(Value, Unit)) :-
    is_dict(Dict), dict_keys_allowed(Dict, [kind, value, unit]), get_dict(kind, Dict, Kind), json_text(Kind, number),
    get_dict(value, Dict, Value), number(Value), Value =:= Value,
    ( get_dict(unit, Dict, RawUnit) -> json_atom_name(RawUnit, Unit), valid_type_name(Unit) ; Unit = none ), !.
json_term(Dict, duration(Value, Unit)) :-
    is_dict(Dict), dict_keys_allowed(Dict, [kind, value, unit]), get_dict(kind, Dict, Kind), json_text(Kind, duration),
    get_dict(value, Dict, Value), number(Value), Value =:= Value, Value >= 0,
    get_dict(unit, Dict, RawUnit), json_atom_name(RawUnit, Unit), memberchk(Unit, [ms, s, m, h, d, w]), !.
json_term(Dict, timestamp(Value)) :-
    is_dict(Dict), dict_keys_allowed(Dict, [kind, value]), get_dict(kind, Dict, Kind), json_text(Kind, timestamp),
    get_dict(value, Dict, RawValue), json_timestamp(RawValue, Value), !.
json_term(Dict, interval(Start, End)) :-
    is_dict(Dict), dict_keys_allowed(Dict, [kind, start, end]), get_dict(kind, Dict, Kind), json_text(Kind, interval),
    get_dict(start, Dict, RawStart), json_timestamp(RawStart, Start),
    get_dict(end, Dict, RawEnd), json_timestamp(RawEnd, End), Start @=< End, !.

json_expression(Dict, Atom) :- is_dict(Dict), dict_keys_allowed(Dict, [kind, namespace, name, args, polarity, closedWorld]), get_dict(kind, Dict, Kind), json_text(Kind, atom), !, json_atom(Dict, Atom).
json_expression(Dict, all(Items)) :- is_dict(Dict), dict_keys_allowed(Dict, [kind, items]), get_dict(kind, Dict, Kind), json_text(Kind, all), !, get_dict(items, Dict, Raw), is_list(Raw), Raw \= [], length(Raw, Count), Count =< 32, maplist(json_expression, Raw, Items).
json_expression(Dict, any(Items)) :- is_dict(Dict), dict_keys_allowed(Dict, [kind, items]), get_dict(kind, Dict, Kind), json_text(Kind, any), !, get_dict(items, Dict, Raw), is_list(Raw), Raw \= [], length(Raw, Count), Count =< 32, maplist(json_expression, Raw, Items).
json_expression(Dict, not(Atom)) :- is_dict(Dict), dict_keys_allowed(Dict, [kind, item]), get_dict(kind, Dict, Kind), json_text(Kind, not), !, get_dict(item, Dict, Raw), json_atom(Raw, Atom).
json_expression(Dict, compare(Op, Left, Right)) :- is_dict(Dict), dict_keys_allowed(Dict, [kind, operator, left, right]), get_dict(kind, Dict, Kind), json_text(Kind, compare), !, get_dict(operator, Dict, OpRaw), json_atom_name(OpRaw, Op), valid_compare_operator(Op), get_dict(left, Dict, LeftRaw), get_dict(right, Dict, RightRaw), json_term(LeftRaw, Left), json_term(RightRaw, Right).
json_expression(Dict, count(Atom, Op, Value)) :- is_dict(Dict), dict_keys_allowed(Dict, [kind, atom, operator, value]), get_dict(kind, Dict, Kind), json_text(Kind, count), !, get_dict(atom, Dict, AtomRaw), json_atom(AtomRaw, Atom), get_dict(operator, Dict, OpRaw), json_atom_name(OpRaw, Op), valid_compare_operator(Op), get_dict(value, Dict, Value), integer(Value), Value >= 0.
json_expression(Dict, temporal(Relation, Left, Right)) :- is_dict(Dict), dict_keys_allowed(Dict, [kind, relation, left, right]), get_dict(kind, Dict, Kind), json_text(Kind, temporal), !, get_dict(relation, Dict, RelationRaw), json_atom_name(RelationRaw, Relation), valid_temporal_relation(Relation), get_dict(left, Dict, LeftRaw), get_dict(right, Dict, RightRaw), json_term(LeftRaw, Left), json_term(RightRaw, Right).

valid_compare_operator(Op) :- memberchk(Op, [eq, neq, lt, lte, gt, gte]).
valid_temporal_relation(Relation) :- memberchk(Relation, [before, after, during, overlaps, starts, finishes]).

json_scope(Dict, scope(Authority, Name, Tags)) :-
    dict_keys_allowed(Dict, [authority, name, tags]),
    ( get_dict(authority, Dict, Authority0) -> json_atom_name(Authority0, Authority) ; Authority = '' ),
    ( get_dict(name, Dict, Name0) -> json_atom_name(Name0, Name) ; Name = '' ),
    ( get_dict(tags, Dict, Tags0) -> maplist(json_atom_name, Tags0, Tags) ; Tags = [] ).

dict_keys_allowed(Dict, Allowed) :-
    dict_pairs(Dict, _Tag, Pairs),
    forall(member(Key-_, Pairs), memberchk(Key, Allowed)).

%% logic_rule_safety(+Props, -Errors)
% Independent Prolog-side safety check.  It intentionally rejects anything
% that the JSON decoder cannot map into the closed IR vocabulary.
logic_rule_safety(Props, Errors) :-
    (   logic_rule_from_props(Props, Rule)
    ->  rule_safety_errors(Rule, Errors)
    ;   Errors = [malformed_rule_ir]
    ).

rule_safety_errors(rule(Kind, _Modality, Head, Body, Exceptions, _Scope, _From, _To, _Schema, Variables), Errors) :-
    findall(Error, rule_shape_error(Kind, Head, Body, Error), ShapeErrors),
    findall(Error, expression_safety_error(Body, Error), BodyErrors),
    findall(Error, (member(Exception, Exceptions), expression_safety_error(Exception, Error)), ExceptionErrors),
    findall(Error, variable_safety_error(Head, Body, Variables, Error), VariableErrors),
    findall(Error, undeclared_variable_error(Head, Body, Exceptions, Variables, Error), DeclarationErrors),
    findall(Error, (member(Exception, Exceptions), exception_variable_safety_error(Exception, Body, Error)), ExceptionVariableErrors),
    findall(Error, rule_term_safety_error(Head, Body, Exceptions, Error), TermErrors),
    findall(Error, rule_limit_error(Head, Body, Exceptions, Error), LimitErrors),
    append([ShapeErrors, BodyErrors, ExceptionErrors, VariableErrors, DeclarationErrors, ExceptionVariableErrors, TermErrors, LimitErrors], Errors0),
    sort(Errors0, Errors).

rule_term_safety_error(Head, Body, Exceptions, invalid_interval) :-
    member(Term, [Head, Body|Exceptions]),
    expression_term(Term, interval(Start, End)),
    Start @> End.

rule_limit_error(Head, Body, Exceptions, too_many_atoms) :-
    expression_atom_count(Head, HeadCount),
    expression_atom_count(Body, BodyCount),
    maplist(expression_atom_count, Exceptions, ExceptionCounts),
    sum_list([HeadCount, BodyCount|ExceptionCounts], Count),
    Count > 64.
rule_limit_error(Head, Body, Exceptions, expression_depth_exceeded) :-
    member(Term, [Head, Body|Exceptions]),
    expression_depth(Term, Depth),
    Depth > 16.

expression_atom_count(none, 0).
expression_atom_count(atom(_, _, _, _, _), 1).
expression_atom_count(all(Items), Count) :- maplist(expression_atom_count, Items, Counts), sum_list(Counts, ChildCount), Count is ChildCount.
expression_atom_count(any(Items), Count) :- maplist(expression_atom_count, Items, Counts), sum_list(Counts, ChildCount), Count is ChildCount.
expression_atom_count(not(Atom), Count) :- expression_atom_count(Atom, ChildCount), Count is ChildCount.
expression_atom_count(compare(_, _, _), 0).
expression_atom_count(count(Atom, _, _), Count) :- expression_atom_count(Atom, Count).
expression_atom_count(temporal(_, _, _), 0).

expression_depth(none, 0).
expression_depth(atom(_, _, _, _, _), 1).
expression_depth(all(Items), Depth) :- maplist(expression_depth, Items, Depths), max_list([0|Depths], ChildDepth), Depth is ChildDepth + 1.
expression_depth(any(Items), Depth) :- maplist(expression_depth, Items, Depths), max_list([0|Depths], ChildDepth), Depth is ChildDepth + 1.
expression_depth(not(Atom), Depth) :- expression_depth(Atom, ChildDepth), Depth is ChildDepth + 1.
expression_depth(compare(_, _, _), 1).
expression_depth(count(Atom, _, _), Depth) :- expression_depth(Atom, ChildDepth), Depth is ChildDepth + 1.
expression_depth(temporal(_, _, _), 1).

expression_term(atom(_, _, Args, _, _), Term) :- member(Term, Args).
expression_term(all(Items), Term) :- member(Item, Items), expression_term(Item, Term).
expression_term(any(Items), Term) :- member(Item, Items), expression_term(Item, Term).
expression_term(not(Atom), Term) :- expression_term(Atom, Term).
expression_term(compare(_, Left, Right), Term) :- member(Term, [Left, Right]).
expression_term(count(Atom, _, _), Term) :- expression_term(Atom, Term).
expression_term(temporal(_, Left, Right), Term) :- member(Term, [Left, Right]).
expression_term(Term, Term) :- Term = interval(_, _).

variable_safety_error(Head, Body, _Variables, head_variable_not_range_restricted(Name)) :-
    head_variable(Name, Head),
    \+ positive_variable(Name, Body).
variable_safety_error(Head, _Body, Variables, existential_head_variable(Name)) :-
    head_variable(Name, Head),
    memberchk(variable(Name, _Type, exists), Variables).
variable_safety_error(_Head, Body, _Variables, body_variable_not_range_restricted(Name)) :-
    body_variable(Name, Body),
    \+ positive_variable(Name, Body).

variable_safety_error(Head, Body, Variables, existential_variable_not_body_local(Name)) :-
    memberchk(variable(Name, _Type, exists), Variables),
    ( head_variable(Name, Head) ; \+ expression_variable(Body, Name) ).

undeclared_variable_error(Head, Body, Exceptions, Variables, undeclared_variable(Name)) :-
    member(Expression, [Head, Body|Exceptions]),
    expression_variable(Expression, Name),
    \+ memberchk(variable(Name, _Type, _Quantifier), Variables).

exception_variable_safety_error(Exception, Body, exception_variable_not_range_restricted(Name)) :-
    expression_variable(Exception, Name),
    \+ positive_variable(Name, Body).

head_variable(Name, atom(_, _, Args, _, _)) :- member(Arg, Args), term_variable(Arg, Name).
body_variable(Name, Expression) :- expression_variable(Expression, Name).
positive_variable(Name, atom(_, _, Args, positive, _)) :- member(Arg, Args), term_variable(Arg, Name).
positive_variable(Name, all(Items)) :- member(Item, Items), positive_variable(Name, Item).
positive_variable(Name, any(Items)) :- member(Item, Items), positive_variable(Name, Item).
positive_variable(Name, count(Atom, _, _)) :- positive_variable(Name, Atom).
positive_variable(_, _) :- fail.

term_variable(var(Name, _), Name).
expression_variable(atom(_, _, Args, _, _), Name) :- member(Arg, Args), term_variable(Arg, Name).
expression_variable(all(Items), Name) :- member(Item, Items), expression_variable(Item, Name).
expression_variable(any(Items), Name) :- member(Item, Items), expression_variable(Item, Name).
expression_variable(not(Atom), Name) :- expression_variable(Atom, Name).
expression_variable(compare(_, Left, Right), Name) :- (term_variable(Left, Name) ; term_variable(Right, Name)).
expression_variable(count(Atom, _, _), Name) :- expression_variable(Atom, Name).
expression_variable(temporal(_, Left, Right), Name) :- (term_variable(Left, Name) ; term_variable(Right, Name)).

rule_shape_error(atom, none, _Body, missing_head).
rule_shape_error(atom, _Head, Body, body_for_atom) :- Body \= none.
rule_shape_error(rule, none, _Body, missing_head).
rule_shape_error(rule, _Head, none, missing_body).
rule_shape_error(constraint, _Head, none, missing_body).
rule_shape_error(constraint, Head, _Body, head_for_constraint) :- Head \= none.
rule_shape_error(_, _, _, _) :- fail.

expression_safety_error(none, _) :- fail.
expression_safety_error(not(atom(_, _, _, _, false)), negation_requires_closed_world).
expression_safety_error(compare(Op, _Left, _Right), invalid_compare_operator) :- \+ valid_compare_operator(Op).
expression_safety_error(count(_Atom, Op, _Value), invalid_compare_operator) :- \+ valid_compare_operator(Op).
expression_safety_error(count(_Atom, _Op, Value), invalid_count_value) :- \+ integer(Value) ; Value < 0.
expression_safety_error(temporal(Relation, _Left, _Right), invalid_temporal_relation) :- \+ valid_temporal_relation(Relation).
expression_safety_error(all(Items), Error) :- member(Item, Items), expression_safety_error(Item, Error).
expression_safety_error(any(Items), Error) :- member(Item, Items), expression_safety_error(Item, Error).
expression_safety_error(not(Atom), Error) :- expression_safety_error(Atom, Error).
expression_safety_error(_, _) :- fail.

%% logic_rule_render(+Props, -Text)
logic_rule_render(Props, Text) :-
    logic_rule_from_props(Props, Rule),
    render_rule(Rule, Text).

render_rule(rule(_Kind, Modality, Head, none, _Exceptions, _Scope, _From, _To, _Schema, _Variables), Text) :-
    render_head(Modality, Head, HeadText), format(string(Text), '~w.', [HeadText]).
render_rule(rule(_Kind, Modality, Head, Body, _Exceptions, _Scope, _From, _To, _Schema, _Variables), Text) :-
    render_head(Modality, Head, HeadText), render_expression(Body, BodyText), format(string(Text), '~w :- ~w.', [HeadText, BodyText]).

render_head(Modality, none, Text) :- format(string(Text), '~w', [Modality]).
render_head(Modality, Atom, Text) :- render_atom(Atom, AtomText), format(string(Text), '~w(~w)', [Modality, AtomText]).
render_atom(atom(Namespace, Name, Args, Polarity, _), Text) :-
    ( Namespace == default -> Full = Name ; format(atom(Full), '~w:~w', [Namespace, Name]) ),
    maplist(render_term, Args, Rendered), atomic_list_concat(Rendered, ',', ArgsText),
    ( Polarity == negative -> format(string(Text), 'negative(~w(~w))', [Full, ArgsText]) ; format(string(Text), '~w(~w)', [Full, ArgsText]) ).
render_term(var(Name, _), Name).
render_term(const(Value, _), Value).
render_term(number(Value, none), Text) :- format(string(Text), '~w', [Value]).
render_term(number(Value, Unit), Text) :- format(string(Text), '~w~w', [Value, Unit]).
render_term(duration(Value, Unit), Text) :- format(string(Text), 'duration(~w,~w)', [Value, Unit]).
render_term(timestamp(Value), Value).
render_term(interval(Start, End), Text) :- format(string(Text), 'interval(~w,~w)', [Start, End]).
render_expression(Atom, Text) :- Atom = atom(_, _, _, _, _), !, render_atom(Atom, Text).
render_expression(all(Items), Text) :- maplist(render_expression, Items, Parts), atomic_list_concat(Parts, ', ', Text).
render_expression(any(Items), Text) :- maplist(render_expression, Items, Parts), atomic_list_concat(Parts, ' ; ', Inner), format(string(Text), '(~w)', [Inner]).
render_expression(not(Atom), Text) :- render_atom(Atom, AtomText), format(string(Text), 'not(~w)', [AtomText]).
render_expression(compare(Op, Left, Right), Text) :- render_term(Left, L), render_term(Right, R), format(string(Text), '~w ~w ~w', [L, Op, R]).
render_expression(count(Atom, Op, Value), Text) :- render_atom(Atom, AtomText), format(string(Text), 'count(~w,~w,~w)', [AtomText, Op, Value]).
render_expression(temporal(Relation, Left, Right), Text) :- render_term(Left, L), render_term(Right, R), format(string(Text), 'temporal(~w,~w,~w)', [Relation, L, R]).

logic_rule_semantic_key(Props, Key) :-
    memberchk(semantic_key=Key, Props), !.
logic_rule_semantic_key(Props, Key) :-
    memberchk(rule_hash=Hash, Props), !, Key = Hash.

logic_atom_signature(atom(Namespace, Name, Args, Polarity, _), signature(Namespace, Name, Args, Polarity)).

%% logic_derive(+Goal, -Proof)
% Goal is atom(Namespace, Name, Args, Polarity), with ground arguments.  Rules
% are interpreted by a finite, data-driven evaluator; no stored source is
% consulted and recursive rule chains are bounded.
logic_derive(Goal, Proof) :-
    ground(Goal),
    derive_goal(Goal, [], 0, Proof).

logic_max_depth(16).

derive_goal(Goal, _Seen, _Depth, direct(FactId)) :-
    Goal = atom(Namespace, Name, Args, Polarity, _),
    predicate_fact(FactId, Namespace, Name, Args, Polarity), !.
derive_goal(Goal, Seen, Depth, rule(FactId, BodyProof)) :-
    logic_max_depth(MaxDepth),
    Depth < MaxDepth,
    logic_rule_fact(FactId, StoredRule),
    materialize_rule(StoredRule, Rule),
    Rule = rule(rule, _Modality, Head, Body, Exceptions, _Scope, _From, _To, _Schema, _Variables),
    Goal = Head,
    atom_signature_for_seen(Head, Signature),
    \+ memberchk(Signature, Seen),
    NextDepth is Depth + 1,
    prove_expression(Body, [Signature|Seen], NextDepth, BodyProof),
    exceptions_do_not_hold(Exceptions, [Signature|Seen], NextDepth).

logic_rule_fact(FactId, Rule) :-
    kb_entity(FactId, fact, Props),
    memberchk(fact_kind=Kind, Props), normalize_atom(Kind, rule),
    logic_rule_from_props(Props, Rule).

% The JSON decoder keeps variable names as data terms for validation and
% rendering.  Evaluation reifies those names into fresh Prolog variables so
% ordinary unification can be used without ever evaluating caller source.
materialize_rule(Rule, Materialized) :-
    materialize_rule_environment(Rule, Materialized, _Environment).

% Environment maps each declared variable name to its fresh Prolog variable.
materialize_rule_environment(
    rule(Kind, Modality, Head, Body, Exceptions, Scope, From, To, Schema, Variables),
    rule(Kind, Modality, MaterialHead, MaterialBody, MaterialExceptions, Scope, From, To, Schema, Variables),
    Environment
) :-
    variable_environment(Variables, Environment),
    materialize_head(Head, Environment, MaterialHead),
    materialize_expression(Body, Environment, MaterialBody),
    maplist(materialize_expression_with(Environment), Exceptions, MaterialExceptions).

variable_environment([], []).
variable_environment([variable(Name, _Type, _Quantifier)|Rest], [Name-_Variable|Environment]) :-
    variable_environment(Rest, Environment).

materialize_head(none, _Variables, none).
materialize_head(Head, Variables, MaterialHead) :- materialize_atom(Head, Variables, MaterialHead).

materialize_expression(none, _Variables, none).
materialize_expression(Expression, Variables, Materialized) :-
    Expression = atom(_, _, _, _, _), !,
    materialize_atom(Expression, Variables, Materialized).
materialize_expression(all(Items), Variables, all(MaterialItems)) :- maplist(materialize_expression_with(Variables), Items, MaterialItems).
materialize_expression(any(Items), Variables, any(MaterialItems)) :- maplist(materialize_expression_with(Variables), Items, MaterialItems).
materialize_expression(not(Atom), Variables, not(MaterialAtom)) :- materialize_atom(Atom, Variables, MaterialAtom).
materialize_expression(compare(Op, Left, Right), Variables, compare(Op, MaterialLeft, MaterialRight)) :-
    materialize_term(Left, Variables, MaterialLeft), materialize_term(Right, Variables, MaterialRight).
materialize_expression(count(Atom, Op, Value), Variables, count(MaterialAtom, Op, Value)) :- materialize_atom(Atom, Variables, MaterialAtom).
materialize_expression(temporal(Relation, Left, Right), Variables, temporal(Relation, MaterialLeft, MaterialRight)) :-
    materialize_term(Left, Variables, MaterialLeft), materialize_term(Right, Variables, MaterialRight).
materialize_expression_with(Variables, Expression, Materialized) :- materialize_expression(Expression, Variables, Materialized).

materialize_atom(atom(Namespace, Name, Args, Polarity, ClosedWorld), Variables, atom(Namespace, Name, MaterialArgs, Polarity, ClosedWorld)) :-
    maplist(materialize_term_with(Variables), Args, MaterialArgs).
materialize_term(var(Name, _Type), Variables, Variable) :- memberchk(Name-Variable, Variables), !.
materialize_term(const(Value, Type), _Variables, const(Value, Type)).
materialize_term(number(Value, Unit), _Variables, number(Value, Unit)).
materialize_term(duration(Value, Unit), _Variables, duration(Value, Unit)).
materialize_term(timestamp(Value), _Variables, timestamp(Value)).
materialize_term(interval(Start, End), _Variables, interval(Start, End)).
materialize_term_with(Variables, Term, Materialized) :- materialize_term(Term, Variables, Materialized).

prove_expression(Atom, Seen, Depth, Proof) :-
    Atom = atom(_, _, _, _, _),
    derive_goal(Atom, Seen, Depth, Proof).
prove_expression(all(Items), Seen, Depth, all(Proofs)) :- maplist(prove_expression_seen(Seen, Depth), Items, Proofs).
prove_expression(any(Items), Seen, Depth, Proof) :- member(Item, Items), prove_expression(Item, Seen, Depth, Proof), !.
prove_expression(not(Atom), Seen, Depth, negated(Atom)) :-
    Atom = atom(Namespace, Name, Args, Polarity, _),
    \+ derive_goal(atom(Namespace, Name, Args, Polarity, _), Seen, Depth, _).
prove_expression(compare(Op, Left, Right), _Seen, _Depth, comparison(Op, Left, Right)) :- compare_terms(Op, Left, Right).
prove_expression(count(Atom, Op, Value), _Seen, _Depth, count(Atom, Op, Value)) :-
    Atom = atom(Namespace, Name, Args, Polarity, _),
    aggregate_all(count, predicate_fact(_, Namespace, Name, Args, Polarity), Count),
    compare_numbers(Op, Count, Value).
prove_expression(temporal(Relation, Left, Right), _Seen, _Depth, temporal(Relation, Left, Right)) :- temporal_holds(Relation, Left, Right).
prove_expression_seen(Seen, Depth, Item, Proof) :- prove_expression(Item, Seen, Depth, Proof).

exceptions_do_not_hold([], _Seen, _Depth).
exceptions_do_not_hold([Exception|Rest], Seen, Depth) :-
    \+ prove_expression(Exception, Seen, Depth, _),
    exceptions_do_not_hold(Rest, Seen, Depth).

atom_signature_for_seen(atom(Namespace, Name, Args, Polarity, _), signature(Namespace, Name, Args, Polarity)).

compare_terms(eq, Left, Right) :- term_value(Left, L), term_value(Right, R), L = R.
compare_terms(neq, Left, Right) :- term_value(Left, L), term_value(Right, R), L \= R.
compare_terms(lt, Left, Right) :- term_value(Left, L), term_value(Right, R), L < R.
compare_terms(lte, Left, Right) :- term_value(Left, L), term_value(Right, R), L =< R.
compare_terms(gt, Left, Right) :- term_value(Left, L), term_value(Right, R), L > R.
compare_terms(gte, Left, Right) :- term_value(Left, L), term_value(Right, R), L >= R.

term_value(number(Value, Unit), Normalized) :- normalize_numeric_unit(Value, Unit, Normalized).
term_value(duration(Value, Unit), Normalized) :- duration_milliseconds(Value, Unit, Normalized).
term_value(const(Value, _), Number) :- atom_number(Value, Number), !.
term_value(const(Value, _), Value).
term_value(Value, Value) :- number(Value).

normalize_numeric_unit(Value, none, Value) :- !.
normalize_numeric_unit(Value, Unit, Normalized) :-
    duration_milliseconds(Value, Unit, Normalized).

duration_milliseconds(Value, ms, Value) :- !.
duration_milliseconds(Value, s, Normalized) :- Normalized is Value * 1000, !.
duration_milliseconds(Value, m, Normalized) :- Normalized is Value * 60000, !.
duration_milliseconds(Value, h, Normalized) :- Normalized is Value * 3600000, !.
duration_milliseconds(Value, d, Normalized) :- Normalized is Value * 86400000, !.
duration_milliseconds(Value, w, Normalized) :- Normalized is Value * 604800000, !.
duration_milliseconds(Value, _Unit, Value).

compare_numbers(eq, L, R) :- L =:= R.
compare_numbers(neq, L, R) :- L =\= R.
compare_numbers(lt, L, R) :- L < R.
compare_numbers(lte, L, R) :- L =< R.
compare_numbers(gt, L, R) :- L > R.
compare_numbers(gte, L, R) :- L >= R.

temporal_holds(before, Left, Right) :-
    temporal_end(Left, LeftEnd),
    temporal_start(Right, RightStart),
    LeftEnd @< RightStart.
temporal_holds(after, Left, Right) :-
    temporal_start(Left, LeftStart),
    temporal_end(Right, RightEnd),
    LeftStart @> RightEnd.
temporal_holds(during, timestamp(Point), interval(Start, End)) :-
    Point @>= Start,
    Point @=< End.
temporal_holds(during, interval(InnerStart, InnerEnd), interval(Start, End)) :-
    InnerStart @>= Start,
    InnerEnd @=< End.
temporal_holds(overlaps, interval(LeftStart, LeftEnd), interval(RightStart, RightEnd)) :-
    LeftStart @< RightEnd,
    RightStart @< LeftEnd.
temporal_holds(starts, interval(LeftStart, _), interval(RightStart, _)) :-
    LeftStart == RightStart.
temporal_holds(finishes, interval(_, LeftEnd), interval(_, RightEnd)) :-
    LeftEnd == RightEnd.

temporal_start(timestamp(Value), Value).
temporal_start(interval(Start, _), Start).
temporal_end(timestamp(Value), Value).
temporal_end(interval(_, End), End).

%% logic_rule_conflict(+RuleA, +RuleB, -Status)
% implements REQ-kibi-truthful-consistency
% Three-valued comparison of two opposing rules.
%
%   contradiction  neither rule carries an exception, and either the rules
%                  are variants of each other or every instance of one rule's
%                  body is an instance of the other's; in both cases the
%                  shared body must provably have an instance (every
%                  comparison translated exactly, the functional closure
%                  consistent, no negation, disjunction, count or temporal
%                  relation, and the constraints satisfiable with integer
%                  bounds for every variable any declaration types as int),
%                  so the opposing modalities are certain to collide.
%                  Variant bodies that cannot hold are disjoint; variant
%                  bodies the fragment cannot decide stay unresolved.
%   disjoint       the heads cannot denote the same action, the scopes or
%                  validity windows do not intersect, the bodies provably
%                  cannot hold together, or an exception of one rule is
%                  entailed by the other rule's body.
%   unresolved     the rules may overlap but the fragment cannot decide it.
%
% Rules are materialized before comparison: IR variables are data terms such
% as var('T', money) and must never be treated as ground values.  Body atoms
% of the two rules are identified only through a declared functional
% dependency (a predicate_schema with key_arguments): two atoms of such a
% predicate whose key arguments are identical must agree on every other
% argument.  Without a declaration a predicate is multivalued, so
% final_total(C, X), X > 0 and final_total(C, Y), Y =< 0 may both hold and the
% pair stays unresolved.  A variable shared by both rules counts as integral
% for a disjoint verdict only when every declaration of it is int or integer.
% These assumptions are documented in docs/inference-rules.md.
logic_rule_conflict(RuleA, RuleB, Status) :-
    functional_predicate_declarations(Functional),
    logic_rule_conflict(RuleA, RuleB, Functional, Status).

%% logic_rule_conflict(+RuleA, +RuleB, +Functional, -Status)
% Functional is a list of functional(Namespace, Name, Arity, KeyPositions)
% declarations; logic_rule_conflict/3 reads them from predicate_schema facts.
logic_rule_conflict(RuleA, RuleB, Functional, Status) :-
    (   catch(rule_pair_status(RuleA, RuleB, Functional, Status0), _, Status0 = unresolved)
    ->  Status = Status0
    ;   Status = disjoint
    ).

functional_predicate_declarations(Functional) :-
    catch(
        findall(functional(Namespace, Name, Arity, Keys),
                predicate_schema_keys(Namespace, Name, Arity, Keys),
                Functional0),
        _,
        Functional0 = []
    ),
    sort(Functional0, Functional).

%% logic_rule_missing_keys(+RuleA, +RuleB, +Functional, -Missing)
% implements REQ-kibi-truthful-consistency
% For an opposing pair that is unresolved under the Functional declarations,
% the plain-conjunction body predicates without a key_arguments declaration
% whose declaration would decide the pair.  Missing is a sorted list of
% missing_keys(Namespace, Name, Arity, KeySets): KeySets are the candidate
% key-position sets (non-empty proper subsets of the argument positions)
% that turn the pair into contradiction or disjoint when that one predicate
% is declared.  When no single declaration decides the pair, declaring every
% such predicate keyed on all but its last argument (the value-last shape) is
% tried as well.  Missing is empty when the pair is already decided or stays
% unresolved for another reason (an untranslatable comparison, negation,
% disjunction, counts, or genuinely overlapping bodies).
logic_rule_missing_keys(RuleA, RuleB, Functional, Missing) :-
    logic_rule_conflict(RuleA, RuleB, Functional, Status),
    (   Status == unresolved
    ->  rule_body_predicates(RuleA, PredicatesA),
        rule_body_predicates(RuleB, PredicatesB),
        append(PredicatesA, PredicatesB, Predicates0),
        sort(Predicates0, Predicates),
        exclude(declared_functional(Functional), Predicates, Undeclared),
        convlist(deciding_key_sets(RuleA, RuleB, Functional), Undeclared, Single),
        (   Single \== []
        ->  Missing = Single
        ;   value_last_declarations(Undeclared, Declarations),
            Declarations \== [],
            append(Declarations, Functional, Assumed),
            logic_rule_conflict(RuleA, RuleB, Assumed, AssumedStatus),
            AssumedStatus \== unresolved
        ->  findall(missing_keys(Namespace, Name, Arity, [Keys]),
                    member(functional(Namespace, Name, Arity, Keys), Declarations),
                    Missing)
        ;   Missing = []
        )
    ;   Missing = []
    ).

rule_body_predicates(rule(_, _, _, Body, _, _, _, _, _, _), Predicates) :-
    expression_parts(Body, parts(Atoms, _, _)),
    findall(predicate(Namespace, Name, Arity),
            ( member(atom(Namespace, Name, Args, _, _), Atoms), length(Args, Arity), Arity >= 2 ),
            Predicates).

declared_functional(Functional, predicate(Namespace, Name, Arity)) :-
    memberchk(functional(Namespace, Name, Arity, _), Functional).

deciding_key_sets(RuleA, RuleB, Functional, predicate(Namespace, Name, Arity),
                  missing_keys(Namespace, Name, Arity, KeySets)) :-
    Arity =< 6,
    findall(Keys,
        (   candidate_key_set(Arity, Keys),
            logic_rule_conflict(RuleA, RuleB, [functional(Namespace, Name, Arity, Keys)|Functional], Status),
            Status \== unresolved
        ),
        KeySets),
    KeySets \== [].

% Non-empty proper subsets of 1..Arity, smallest first.
candidate_key_set(Arity, Keys) :-
    numlist(1, Arity, Positions),
    Max is Arity - 1,
    between(1, Max, Size),
    length(Keys, Size),
    ordered_subset(Keys, Positions).

ordered_subset([], _).
ordered_subset([Position|Rest], [Position|Positions]) :-
    ordered_subset(Rest, Positions).
ordered_subset(Subset, [_|Positions]) :-
    Subset = [_|_],
    ordered_subset(Subset, Positions).

value_last_declarations(Predicates, Declarations) :-
    findall(functional(Namespace, Name, Arity, Keys),
            (   member(predicate(Namespace, Name, Arity), Predicates),
                Last is Arity - 1,
                numlist(1, Last, Keys)
            ),
            Declarations).

% Fails only when the rules are certainly disjoint: the modalities do not
% oppose, the contexts do not intersect, or the heads do not unify.
rule_pair_status(RuleA00, RuleB00, Functional, Status) :-
    logic_rule_fold_exceptions(RuleA00, RuleA0),
    logic_rule_fold_exceptions(RuleB00, RuleB0),
    RuleA0 = rule(_, ModalityA, _, _, _, ScopeA, FromA, ToA, _, VariablesA),
    RuleB0 = rule(_, ModalityB, _, _, _, ScopeB, FromB, ToB, _, VariablesB),
    conflicting_modality(ModalityA, ModalityB),
    rule_context_compatible(ScopeA, FromA, ToA, ScopeB, FromB, ToB),
    materialize_rule_environment(RuleA0, RuleA, EnvironmentA),
    materialize_rule_environment(RuleB0, RuleB, EnvironmentB),
    RuleA = rule(_, _, HeadA, BodyA, ExceptionsA, _, _, _, _, _),
    RuleB = rule(_, _, HeadB, BodyB, ExceptionsB, _, _, _, _, _),
    declared_types(VariablesA, EnvironmentA, DeclaredA),
    declared_types(VariablesB, EnvironmentB, DeclaredB),
    append(DeclaredA, DeclaredB, Declared),
    (   ExceptionsA == [], ExceptionsB == [],
        HeadA-BodyA =@= HeadB-BodyB
    ->  % Variant rules share every instance: identify them and decide
        % whether that one body can hold at all.
        HeadA-BodyA = HeadB-BodyB,
        expression_parts(BodyA, Parts),
        variant_body_status(Parts, Functional, Declared, Status)
    ;   HeadA = HeadB,
        expression_parts(BodyA, PartsA),
        expression_parts(BodyB, PartsB),
        body_pair_status(PartsA, PartsB, ExceptionsA, ExceptionsB, Functional, Declared, Status)
    ).

%% variant_body_status(+Parts, +Functional, +Declared, -Status)
% implements REQ-kibi-truthful-consistency
% The two rules apply to exactly the same instances, so they collide exactly
% when the shared body has an instance.  contradiction needs that instance to
% be proven: the functional closure holds, every comparison was translated,
% nothing is left in Other (negation, disjunction, counts, temporal
% relations), and the translated constraints are satisfiable under the
% strict integer reading.  disjoint needs the body to be provably empty under
% the loose integer reading.  Anything in between stays unresolved.
variant_body_status(parts(Atoms, Comparisons, Other), Functional, Declared, Status) :-
    (   functional_closure(Atoms, Functional)
    ->  translate_comparisons(Comparisons, Constraints, Translation),
        integer_variables(Declared, Loose, Strict),
        (   Translation == false
        ->  Status = disjoint
        ;   \+ numeric_constraints_satisfiable(Constraints, Loose)
        ->  Status = disjoint
        ;   Translation == complete,
            Other == [],
            numeric_constraints_satisfiable(Constraints, Strict)
        ->  Status = contradiction
        ;   Status = unresolved
        )
    ;   Status = disjoint
    ).

body_pair_status(PartsA, PartsB, ExceptionsA, ExceptionsB, Functional, Declared, Status) :-
    (   parts_jointly_unsatisfiable(PartsA, PartsB, Functional, Declared)
    ->  Status = disjoint
    ;   exception_entailed(ExceptionsA, PartsB, Declared)
    ->  Status = disjoint
    ;   exception_entailed(ExceptionsB, PartsA, Declared)
    ->  Status = disjoint
    ;   ExceptionsA == [], ExceptionsB == [],
        (   certain_subsumption(PartsA, PartsB, Functional, Declared)
        ;   certain_subsumption(PartsB, PartsA, Functional, Declared)
        )
    ->  Status = contradiction
    ;   Status = unresolved
    ).

rule_context_compatible(scope(AuthA, ScopeA, _), FromA, ToA, scope(AuthB, ScopeB, _), FromB, ToB) :-
    (AuthA == '' ; AuthB == '' ; AuthA == AuthB),
    (ScopeA == '' ; ScopeB == '' ; ScopeA == ScopeB),
    (FromA == '' ; ToB == '' ; FromA @=< ToB),
    (FromB == '' ; ToA == '' ; FromB @=< ToA).

conflicting_modality(assert, deny).
conflicting_modality(deny, assert).
conflicting_modality(oblige, forbid).
conflicting_modality(forbid, oblige).
conflicting_modality(permit, forbid).
conflicting_modality(forbid, permit).

%% declared_types(+Variables, +Environment, -Declared)
% Declared pairs each materialized rule variable with its declared type.  The
% two rules' lists are appended, so after the heads, bodies or functional
% values are unified a single Prolog variable can carry several declarations.
declared_types(Variables, Environment, Declared) :-
    convlist(declared_type(Environment), Variables, Declared).

declared_type(Environment, variable(Name, Type, _), Variable-Type) :-
    memberchk(Name-Variable, Environment).

%% integer_variables(+Declared, -Loose, -Strict)
% implements REQ-kibi-truthful-consistency
% Variables declared int or integer range over the integers, so x > 0 and
% x < 1 cannot both hold for them.  A variable shared by both rules may be
% declared int by one and number by the other; the fragment does not decide
% which declaration wins, so it reads both ways:
%
%   Loose   variables (compared by identity, after unification) whose every
%           declaration is int or integer.  Proofs of emptiness (disjoint)
%           use it: fewer integral variables only make constraints easier to
%           satisfy, so an empty Loose reading is empty under any reading.
%   Strict  variables with at least one int or integer declaration.  Proofs
%           of an instance (contradiction) use it: an integral witness
%           satisfies every declaration at once.
%
% Called after functional closure and atom matching, so identifications made
% there are seen.  convlist/3 and include/3 keep the variables; findall/3
% would copy them.
integer_variables(Declared, Loose, Strict) :-
    foldl(collect_declared_variable, Declared, [], Variables),
    include(every_declaration_integer(Declared), Variables, Loose),
    include(some_declaration_integer(Declared), Variables, Strict).

collect_declared_variable(Variable-_, Seen, Seen1) :-
    (   var(Variable),
        \+ ( member(Known, Seen), Known == Variable )
    ->  Seen1 = [Variable|Seen]
    ;   Seen1 = Seen
    ).

every_declaration_integer(Declared, Variable) :-
    forall(( member(Other-Type, Declared), Other == Variable ), integer_type(Type)).

some_declaration_integer(Declared, Variable) :-
    member(Other-Type, Declared),
    Other == Variable,
    integer_type(Type),
    !.

integer_type(int).
integer_type(integer).

%% expression_parts(+Expression, -parts(Atoms, Comparisons, Other))
% Flatten a conjunctive body.  Disjunctions, negations, counts and temporal
% relations are kept in Other: they can only make an analysis unresolved.
expression_parts(none, parts([], [], [])) :- !.
expression_parts(Expression, parts(Atoms, Comparisons, Other)) :-
    flatten_conjunction(Expression, Items),
    partition_items(Items, Atoms, Comparisons, Other).

flatten_conjunction(all(Items), Flat) :- !,
    maplist(flatten_conjunction, Items, Nested),
    append(Nested, Flat).
flatten_conjunction(Item, [Item]).

partition_items([], [], [], []).
partition_items([Item|Rest], [Item|Atoms], Comparisons, Other) :-
    Item = atom(_, _, _, positive, _), !,
    partition_items(Rest, Atoms, Comparisons, Other).
partition_items([Item|Rest], Atoms, [Item|Comparisons], Other) :-
    Item = compare(_, _, _), !,
    partition_items(Rest, Atoms, Comparisons, Other).
partition_items([Item|Rest], Atoms, Comparisons, [Item|Other]) :-
    partition_items(Rest, Atoms, Comparisons, Other).

%% parts_jointly_unsatisfiable(+PartsA, +PartsB, +Functional, +Declared)
% True only when the two bodies provably cannot hold for the same instance:
% a declared functional dependency forces two provably different values, a
% comparison is false, or the translated comparisons admit no value under the
% loose integer reading.  Comparisons that cannot be translated are left
% out, which can only make the remaining set easier to satisfy, so they never
% make the pair disjoint.
parts_jointly_unsatisfiable(parts(AtomsA, ComparisonsA, _), parts(AtomsB, ComparisonsB, _), Functional, Declared) :-
    \+ \+ (
        append(AtomsA, AtomsB, Atoms),
        (   functional_closure(Atoms, Functional)
        ->  append(ComparisonsA, ComparisonsB, Comparisons),
            translate_comparisons(Comparisons, Constraints, Status),
            (   Status == false
            ->  true
            ;   integer_variables(Declared, Loose, _Strict),
                \+ numeric_constraints_satisfiable(Constraints, Loose)
            )
        ;   true
        )
    ).

%% functional_closure(+Atoms, +Functional)
% Unify the value arguments of every pair of atoms whose predicate declares
% key arguments and whose key arguments are identical, until nothing changes.
% Fails when two such atoms carry provably different ground values.  Atoms of
% undeclared predicates are never identified.
functional_closure(Atoms, Functional) :-
    atom_pairs(Atoms, Pairs),
    foldl(identify_functional_pair(Functional), Pairs, false, Changed),
    (   Changed == true
    ->  functional_closure(Atoms, Functional)
    ;   true
    ).

atom_pairs([], []).
atom_pairs([Atom|Rest], Pairs) :-
    maplist(atom_pair(Atom), Rest, Head),
    atom_pairs(Rest, Tail),
    append(Head, Tail, Pairs).

atom_pair(Left, Right, Left-Right).

identify_functional_pair(Functional, Left-Right, Changed0, Changed) :-
    Left = atom(Namespace, Name, ArgsLeft, _, _),
    Right = atom(NamespaceRight, NameRight, ArgsRight, _, _),
    (   Namespace == NamespaceRight,
        Name == NameRight,
        length(ArgsLeft, Arity),
        length(ArgsRight, Arity)
    ->  findall(Keys, member(functional(Namespace, Name, Arity, Keys), Functional), KeySets),
        foldl(identify_by_keys(ArgsLeft, ArgsRight), KeySets, Changed0, Changed)
    ;   Changed = Changed0
    ).

identify_by_keys(ArgsLeft, ArgsRight, Keys, Changed0, Changed) :-
    (   forall(member(Position, Keys),
               ( nth1(Position, ArgsLeft, KeyLeft),
                 nth1(Position, ArgsRight, KeyRight),
                 KeyLeft == KeyRight ))
    ->  identify_values(ArgsLeft, ArgsRight, Keys, 1, Changed0, Changed)
    ;   Changed = Changed0
    ).

identify_values([], [], _, _, Changed, Changed).
identify_values([Left|LeftRest], [Right|RightRest], Keys, Position, Changed0, Changed) :-
    (   memberchk(Position, Keys)
    ->  Changed1 = Changed0
    ;   identify_value(Left, Right, Changed0, Changed1)
    ),
    Next is Position + 1,
    identify_values(LeftRest, RightRest, Keys, Next, Changed1, Changed).

identify_value(Left, Right, Changed0, Changed) :-
    (   Left == Right
    ->  Changed = Changed0
    ;   ( var(Left) ; var(Right) )
    ->  Left = Right,
        Changed = true
    ;   values_distinct(Left, Right)
    ->  fail
    ;   % Equal values in different spellings (1000 ms and 1 s), or values
        % this fragment cannot compare: identify nothing.
        Changed = Changed0
    ).

values_distinct(Left, Right) :-
    ir_ground(Left),
    ir_ground(Right),
    catch(term_value(Left, LeftValue), _, fail),
    catch(term_value(Right, RightValue), _, fail),
    (   number(LeftValue), number(RightValue)
    ->  LeftValue =\= RightValue
    ;   LeftValue \== RightValue
    ).

%% certain_subsumption(+General, +Specific, +Functional, +Declared)
% Every instance of Specific's body is an instance of General's body, and
% Specific's body provably has an instance: both bodies are plain
% conjunctions, every Specific comparison was translated (none is unknown),
% and the translated comparisons are satisfiable under the strict integer
% reading.  An untranslatable comparison such as X < Y can make Specific's
% body empty, so it blocks a contradiction verdict.  The integer readings are
% taken after atom matching, which can identify a General variable with a
% Specific one.
certain_subsumption(General, Specific, Functional, Declared) :-
    General = parts(GeneralAtoms, GeneralComparisons, []),
    Specific = parts(SpecificAtoms, SpecificComparisons, []),
    \+ \+ (
        functional_closure(SpecificAtoms, Functional),
        translate_comparisons(SpecificComparisons, Premises, complete),
        match_atoms(GeneralAtoms, SpecificAtoms),
        integer_variables(Declared, _Loose, Strict),
        numeric_constraints_satisfiable(Premises, Strict),
        forall(member(Comparison, GeneralComparisons),
               comparison_entailed(Premises, Strict, Comparison))
    ).

%% parts_subsume(+General, +Specific, +Declared)
% Every instance of Specific's body is an instance of General's body: each
% General atom matches a Specific atom without binding Specific's variables,
% and each General comparison is entailed by Specific's translated
% comparisons under the loose integer reading.  Untranslated premises are
% dropped, which only weakens what is entailed.
parts_subsume(parts(GeneralAtoms, GeneralComparisons, []), parts(SpecificAtoms, SpecificComparisons, _), Declared) :-
    match_atoms(GeneralAtoms, SpecificAtoms),
    translate_comparisons(SpecificComparisons, Premises, _PremiseStatus),
    integer_variables(Declared, Loose, _Strict),
    forall(member(Comparison, GeneralComparisons), comparison_entailed(Premises, Loose, Comparison)).

match_atoms([], _).
match_atoms([Atom|Rest], Specific) :-
    member(Candidate, Specific),
    subsumes_term(Atom, Candidate),
    Atom = Candidate,
    match_atoms(Rest, Specific).

comparison_entailed(Premises, Integers, compare(Op, Left, Right)) :-
    translate_comparison(compare(Op, Left, Right), Result),
    (   Result == true
    ->  true
    ;   Result = constraint(Constraint)
    ->  numeric_constraint_entailed(Premises, Constraint, Integers)
    ;   fail
    ).

%% exception_entailed(+Exceptions, +OtherParts, +Declared)
% An exception that holds whenever the other rule's body holds removes every
% shared instance, so the rules cannot collide.
exception_entailed(Exceptions, OtherParts, Declared) :-
    member(Exception, Exceptions),
    expression_parts(Exception, ExceptionParts),
    ExceptionParts = parts(_, _, []),
    \+ \+ parts_subsume(ExceptionParts, OtherParts, Declared), !.

%% translate_comparisons(+Comparisons, -Constraints, -Status)
% Status is false when a comparison is certainly false, unknown when some
% comparison could not be translated, and complete otherwise.
translate_comparisons(Comparisons, Constraints, Status) :-
    foldl(translate_into, Comparisons, acc([], complete), acc(Reversed, Status)),
    reverse(Reversed, Constraints).

translate_into(_, acc(Constraints, false), acc(Constraints, false)) :- !.
translate_into(Comparison, acc(Constraints, Status), acc(Constraints1, Status1)) :-
    translate_comparison(Comparison, Result),
    (   Result == true -> Constraints1 = Constraints, Status1 = Status
    ;   Result == false -> Constraints1 = Constraints, Status1 = false
    ;   Result = constraint(Constraint) -> Constraints1 = [Constraint|Constraints], Status1 = Status
    ;   Constraints1 = Constraints, Status1 = unknown
    ).

translate_comparison(compare(Op, Left, Right), Result) :-
    comparison_operand(Left, L),
    comparison_operand(Right, R),
    translate_operands(Op, L, R, Result).

translate_operands(Op, num(L), num(R), Result) :- !,
    ( numeric_constraint_holds(Op, L, R) -> Result = true ; Result = false ).
translate_operands(Op, var(V), num(N), constraint(c(Op, V, N))) :- !.
translate_operands(Op, num(N), var(V), constraint(c(Flipped, V, N))) :- !,
    flipped_operator(Op, Flipped).
% The same variable on both sides is decided exactly: X < X never holds and
% X =< X always does, whatever X denotes.
translate_operands(Op, var(L), var(R), Result) :-
    L == R, !,
    ( reflexive_operator(Op) -> Result = true ; Result = false ).
translate_operands(Op, ground(L), ground(R), Result) :- !,
    ( catch(compare_terms(Op, L, R), _, fail) -> Result = true ; Result = false ).
translate_operands(_, _, _, unknown).

reflexive_operator(eq).
reflexive_operator(lte).
reflexive_operator(gte).

comparison_operand(Term, var(Term)) :- var(Term), !.
comparison_operand(Term, num(Value)) :-
    ir_ground(Term),
    catch(term_value(Term, Value), _, fail),
    number(Value), !.
comparison_operand(Term, ground(Term)) :- ir_ground(Term), !.
comparison_operand(Term, other(Term)).

% IR terms keep variables as var(Name, Type) data until materialized.
ir_ground(Term) :- ground(Term), \+ sub_term(var(_, _), Term).

flipped_operator(eq, eq).
flipped_operator(neq, neq).
flipped_operator(lt, gt).
flipped_operator(gt, lt).
flipped_operator(lte, gte).
flipped_operator(gte, lte).


%% logic_rule_fold_exceptions(+Rule, -Folded)
% implements REQ-kibi-truthful-consistency
% "forbid H :- B unless E1, ..., En" fires exactly when B holds and no Ei
% does.  When every exception is a single comparison, its negation is again
% a comparison (lt and gte, eq and neq, ...), so the rule is equivalent to
% "forbid H :- B, not E1, ..., not En" without exceptions.  This is how an
% "only when C" requirement (forbid unless C) is compared: the conflict and
% scenario checks then reason about one body.  Rules with any other kind of
% exception are returned unchanged.
logic_rule_fold_exceptions(
    rule(Kind, Modality, Head, Body, Exceptions, Scope, From, To, Schema, Variables),
    rule(Kind, Modality, Head, FoldedBody, Remaining, Scope, From, To, Schema, Variables)
) :-
    (   Exceptions \== [],
        maplist(negated_comparison, Exceptions, Negated)
    ->  fold_body(Body, Negated, FoldedBody),
        Remaining = []
    ;   FoldedBody = Body,
        Remaining = Exceptions
    ).

negated_comparison(compare(Op, Left, Right), compare(Negated, Left, Right)) :-
    comparison_negation(Op, Negated).

comparison_negation(eq, neq).
comparison_negation(neq, eq).
comparison_negation(lt, gte).
comparison_negation(gte, lt).
comparison_negation(gt, lte).
comparison_negation(lte, gt).

fold_body(none, [Single], Single) :- !.
fold_body(none, Items, all(Items)) :- !.
fold_body(all(Items0), Extra, all(Items)) :- !, append(Items0, Extra, Items).
fold_body(Body, Extra, all([Body|Extra])).

%% logic_rule_property_form(+Rule, -Form)
% implements REQ-kibi-scenario-feasibility
% Read a rule as a restriction over subject properties: the form scenario
% feasibility shares with the property lane.  A body atom reads a property
% when its namespace is the property's subject_key and its name the
% property_key; its last argument is the property's value and any earlier
% arguments name the instance.  After folding comparison exceptions
% (logic_rule_fold_exceptions/2) Form is
%
%   property_form(Modality, Head, ScopeName, From, To, Keys, Conditions)
%
% Keys are the Subject-Property pairs of every property atom in the body and
% remaining exceptions, however nested.  Conditions is
%   * a list of cond(Subject-Property, Op, Term, ValueType): the rule fires
%     exactly when every condition holds (an empty list fires whenever the
%     read properties have values);
%   * never: a comparison between two constants is false, so the rule never
%     fires;
%   * untranslatable: the body uses something this reading cannot decide (a
%     negation, disjunction, count or temporal relation, an atom that is not
%     a property read, two reads of one property with different values, a
%     property value reused as an instance, a comparison between two
%     properties, or an exception that is not a single comparison).
logic_rule_property_form(Rule0, property_form(Modality, Head, ScopeName, From, To, Keys, Conditions)) :-
    logic_rule_fold_exceptions(Rule0, Rule),
    Rule = rule(_Kind, Modality, Head, Body, Exceptions, scope(_, ScopeName, _), From, To, _Schema, _Variables),
    findall(Key,
        (   member(Expression, [Body|Exceptions]),
            expression_property_key(Expression, Key)
        ),
        Keys0),
    sort(Keys0, Keys),
    expression_parts(Body, parts(Atoms, Comparisons, Other)),
    (   Exceptions == [],
        Other == [],
        maplist(property_read, Atoms, Reads),
        property_value_bindings(Reads, Head, Bindings, ConstantConditions)
    ->  foldl(comparison_condition(Bindings), Comparisons, ConstantConditions, Conditions0),
        (   Conditions0 == untranslatable
        ->  Conditions = untranslatable
        ;   Conditions0 == never
        ->  Conditions = never
        ;   reverse(Conditions0, Conditions)
        )
    ;   Conditions = untranslatable
    ).

expression_property_key(atom(Namespace, Name, Args, _, _), Namespace-Name) :-
    Namespace \== default,
    Args \== [].
expression_property_key(all(Items), Key) :-
    member(Item, Items),
    expression_property_key(Item, Key).
expression_property_key(any(Items), Key) :-
    member(Item, Items),
    expression_property_key(Item, Key).
expression_property_key(not(Atom), Key) :-
    expression_property_key(Atom, Key).
expression_property_key(count(Atom, _, _), Key) :-
    expression_property_key(Atom, Key).

property_read(atom(Namespace, Name, Args, positive, _), read(Namespace-Name, Value, Instance)) :-
    Namespace \== default,
    Args \== [],
    append(Instance, [Value], Args).

% Bindings maps each value variable name to its property and declared type.
% A read with a constant value is a condition on that property.
property_value_bindings(Reads, Head, Bindings, ConstantConditions) :-
    findall(Name, (member(read(_, _, Instance), Reads), member(var(Name, _), Instance)), InstanceNames),
    (   Head = atom(_, _, HeadArgs, _, _)
    ->  findall(Name, member(var(Name, _), HeadArgs), HeadNames)
    ;   HeadNames = []
    ),
    append(InstanceNames, HeadNames, IdentityNames),
    foldl(read_binding(IdentityNames), Reads, acc([], []), acc(Bindings, ConstantConditions)),
    % One property, one value: two reads of the same property must agree.
    forall(
        (   member(read(Key, ValueA, _), Reads),
            member(read(Key, ValueB, _), Reads)
        ),
        ValueA == ValueB
    ).

read_binding(IdentityNames, read(Key, var(Name, Type), _), acc(Bindings0, Conditions), acc(Bindings, Conditions)) :-
    !,
    \+ memberchk(Name, IdentityNames),
    (   memberchk(Name-OtherKey-_, Bindings0)
    ->  OtherKey == Key,
        Bindings = Bindings0
    ;   Bindings = [Name-Key-Type|Bindings0]
    ).
read_binding(_, read(Key, Value, _), acc(Bindings, Conditions), acc(Bindings, [cond(Key, eq, Value, value)|Conditions])) :-
    constant_term(Value).

constant_term(number(_, _)).
constant_term(duration(_, _)).
constant_term(const(_, _)).

comparison_condition(_, _, untranslatable, untranslatable) :- !.
comparison_condition(_, _, never, never) :- !.
comparison_condition(Bindings, compare(Op, Left, Right), Conditions, Next) :-
    condition_operand(Bindings, Left, LeftOperand),
    condition_operand(Bindings, Right, RightOperand),
    (   LeftOperand = property(Key, Type), RightOperand = constant(Term)
    ->  Next = [cond(Key, Op, Term, Type)|Conditions]
    ;   LeftOperand = constant(Term), RightOperand = property(Key, Type)
    ->  flipped_operator(Op, Flipped),
        Next = [cond(Key, Flipped, Term, Type)|Conditions]
    ;   LeftOperand = constant(_), RightOperand = constant(_)
    ->  (   catch(compare_terms(Op, Left, Right), _, fail)
        ->  Next = Conditions
        ;   catch(compare_terms(Op, Left, Right), _, true)
        ->  Next = untranslatable
        ;   Next = never
        )
    ;   Next = untranslatable
    ).

condition_operand(Bindings, var(Name, _), property(Key, Type)) :-
    memberchk(Name-Key-Type, Bindings), !.
condition_operand(_, Term, constant(Term)) :-
    constant_term(Term), !.
condition_operand(_, Term, other(Term)).

%% logic_rules_stratified(+Rules)
% Check the finite dependency graph for a negated edge on a cycle.  A single
% rule can be locally safe while a collection of rules still forms an
% unstratified negation cycle (p(X) :- not q(X), q(X) :- not p(X)).  The
% interpreter therefore exposes this collection-level check to the KB
% validation layer instead of relying on Prolog's negation-as-failure.
logic_rules_stratified(Rules) :-
    is_list(Rules),
    findall(
        edge(HeadPredicate, BodyPredicate, Sign),
        ( member(Rule, Rules), rule_dependency_edge(Rule, HeadPredicate, BodyPredicate, Sign) ),
        Edges
    ),
    \+ (
        member(edge(From, To, negative), Edges),
        dependency_path(To, From, Edges, [])
    ).

rule_dependency_edge(
    rule(rule, _Modality, Head, Body, _Exceptions, _Scope, _From, _To, _Schema, _Variables),
    HeadPredicate,
    BodyPredicate,
    Sign
) :-
    logic_predicate_signature(Head, HeadPredicate),
    expression_dependency(Body, BodyAtom, Sign),
    logic_predicate_signature(BodyAtom, BodyPredicate).

logic_predicate_signature(atom(Namespace, Name, Args, _Polarity, _ClosedWorld), predicate(Namespace, Name, Arity)) :-
    length(Args, Arity).

expression_dependency(Atom, Atom, positive) :-
    Atom = atom(_, _, _, _, _).
expression_dependency(not(Atom), Atom, negative).
expression_dependency(all(Items), Atom, Sign) :- member(Item, Items), expression_dependency(Item, Atom, Sign).
expression_dependency(any(Items), Atom, Sign) :- member(Item, Items), expression_dependency(Item, Atom, Sign).
expression_dependency(count(Atom, _Operator, _Value), Atom, positive).

dependency_path(Current, Target, _Edges, Seen) :-
    Current == Target,
    \+ memberchk(Current, Seen),
    !.
dependency_path(Current, Target, Edges, Seen) :-
    \+ memberchk(Current, Seen),
    member(edge(Current, Next, _Sign), Edges),
    dependency_path(Next, Target, Edges, [Current|Seen]).

%% logic_rule_conflict_witness(+RuleA, +RuleB, -Witness)
% Return a structured, non-executable witness for an opposing rule result.
% Consumers can attach requirement IDs and source spans without ever treating
% the rendered Prolog preview as executable source.
logic_rule_conflict_witness(RuleA, RuleB, Witness) :-
    logic_rule_conflict(RuleA, RuleB, Status),
    RuleA = rule(_KindA, ModalityA, HeadA, BodyA, ExceptionsA, ScopeA, FromA, ToA, SchemaA, _VariablesA),
    RuleB = rule(_KindB, ModalityB, HeadB, BodyB, ExceptionsB, ScopeB, FromB, ToB, SchemaB, _VariablesB),
    Witness = witness{
        status: Status,
        modality_a: ModalityA,
        modality_b: ModalityB,
        head_a: HeadA,
        head_b: HeadB,
        body_a: BodyA,
        body_b: BodyB,
        exceptions_a: ExceptionsA,
        exceptions_b: ExceptionsB,
        scope_a: ScopeA,
        scope_b: ScopeB,
        valid_from_a: FromA,
        valid_to_a: ToA,
        valid_from_b: FromB,
        valid_to_b: ToB,
        rule_schema_a: SchemaA,
        rule_schema_b: SchemaB
    }.


normalize_atom(Value, Atom) :- atom(Value), !, Atom = Value.
normalize_atom(Value, Atom) :- string(Value), atom_string(Atom, Value).
