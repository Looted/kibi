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
    logic_rule_conflict_witness/3,
    logic_atom_signature/2,
    logic_rules_stratified/1
]).

:- use_module(library(http/json)).
:- use_module(library(aggregate)).
:- use_module(library(clpfd)).
:- use_module('kb.pl', [kb_entity/3, predicate_fact/5]).

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
materialize_rule(
    rule(Kind, Modality, Head, Body, Exceptions, Scope, From, To, Schema, Variables),
    rule(Kind, Modality, MaterialHead, MaterialBody, MaterialExceptions, Scope, From, To, Schema, Variables)
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
% Conservative symbolic conflict result.  Identical opposing heads are a
% proven conflict; different bodies remain unresolved unless their explicit
% numeric/temporal constraints are disjoint.
logic_rule_conflict(RuleA, RuleB, contradiction) :-
    opposing_rule_heads(RuleA, RuleB),
    compatible_rule_context(RuleA, RuleB),
    same_rule_body(RuleA, RuleB), !.
logic_rule_conflict(RuleA, RuleB, unresolved) :-
    opposing_rule_heads(RuleA, RuleB),
    compatible_rule_context(RuleA, RuleB), !.
logic_rule_conflict(_, _, disjoint).

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

opposing_rule_heads(rule(_, ModalityA, HeadA, _, _, _, _, _, _, _), rule(_, ModalityB, HeadB, _, _, _, _, _, _, _)) :-
    conflicting_modality(ModalityA, ModalityB),
    copy_term((HeadA, HeadB), (CopyA, CopyB)),
    CopyA = CopyB.

conflicting_modality(assert, deny).
conflicting_modality(deny, assert).
conflicting_modality(oblige, forbid).
conflicting_modality(forbid, oblige).
conflicting_modality(permit, forbid).
conflicting_modality(forbid, permit).

compatible_rule_context(rule(_, _, _, BodyA, _, scope(AuthA, ScopeA, _), FromA, ToA, _, _), rule(_, _, _, BodyB, _, scope(AuthB, ScopeB, _), FromB, ToB, _, _)) :-
    (AuthA == '' ; AuthB == '' ; AuthA == AuthB),
    (ScopeA == '' ; ScopeB == '' ; ScopeA == ScopeB),
    (FromA == '' ; ToB == '' ; FromA @=< ToB),
    (FromB == '' ; ToA == '' ; FromB @=< ToA),
    bodies_may_overlap(BodyA, BodyB).

bodies_may_overlap(none, _).
bodies_may_overlap(_, none).
bodies_may_overlap(BodyA, BodyB) :-
    BodyA \= none,
    BodyB \= none,
    \+ bodies_definitely_disjoint(BodyA, BodyB).

bodies_definitely_disjoint(BodyA, _BodyB) :- expression_definitely_false(BodyA), !.
bodies_definitely_disjoint(_BodyA, BodyB) :- expression_definitely_false(BodyB), !.

% Only classify a body as impossible when its finite, ground comparison or
% temporal constraint can be evaluated to false.  Unknown atoms, variables,
% and unsupported combinations remain unresolved rather than being treated as
% disjoint by guesswork.
expression_definitely_false(compare(Op, Left, Right)) :-
    ground(compare(Op, Left, Right)),
    \+ catch(compare_terms(Op, Left, Right), _, fail).
expression_definitely_false(temporal(Relation, Left, Right)) :-
    ground(temporal(Relation, Left, Right)),
    \+ catch(temporal_holds(Relation, Left, Right), _, fail).
expression_definitely_false(all(Items)) :-
    member(Item, Items),
    expression_definitely_false(Item), !.
expression_definitely_false(any(Items)) :-
    Items \= [],
    maplist(expression_definitely_false, Items).

same_rule_body(RuleA, RuleB) :-
    RuleA = rule(_, _, _, BodyA, ExceptionsA, ScopeA, FromA, ToA, _, _),
    RuleB = rule(_, _, _, BodyB, ExceptionsB, ScopeB, FromB, ToB, _, _),
    BodyA == BodyB, ExceptionsA == ExceptionsB, ScopeA == ScopeB, FromA == FromB, ToA == ToB.

normalize_atom(Value, Atom) :- atom(Value), !, Atom = Value.
normalize_atom(Value, Atom) :- string(Value), atom_string(Atom, Value).
