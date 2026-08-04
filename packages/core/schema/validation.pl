% Module: kibi_validation
% Validation rules for entities and relationships in Kibi
:- module(kibi_validation,
          [ validate_entity/2,        % +Type, +Props
            validate_relationship/3,  % +RelType, +FromEntity, +ToEntity
            validate_property_type/3  % +Type, +Prop, +Value
          ]).

:- use_module('entities.pl').
:- use_module('relationships.pl').

% validate_entity(+Type, +Props:list)
% Props is a list of Property=Value pairs (e.g. id=ID, title=Title)
validate_entity(Type, Props) :-
    % check entity type exists
    entity_type(Type),
    % required properties present
    forall(required_property(Type, P), memberchk(P=_Val, Props)),
    % all properties have correct types
    forall(member(Key=Val, Props), validate_property_type(Type, Key, Val)),
    % validate entity-specific shape constraints
    validate_entity_shape(Type, Props).

% validate_relationship(+RelType, +From, +To)
% From and To are pairs Type=Id or structures type(Type) - allow Type or Type=Id
validate_relationship(RelType, From, To) :-
    relationship_type(RelType),
    % extract types
    type_of(From, FromType),
    type_of(To, ToType),
    % valid combination
    valid_relationship(RelType, FromType, ToType).

type_of(Type, Type) :- atom(Type), entity_type(Type), !.
type_of(Type=_Id, Type) :- atom(Type), entity_type(Type), !.

% validate_property_type(+EntityType, +Prop, +Value)
validate_property_type(Type, Prop, Value) :-
    entity_property(Type, Prop, Kind),
    check_kind(Kind, Value), !.

% check_kind(Kind, Value) succeeds if Value matches Kind
check_kind(atom, V) :- atom(V).
check_kind(string, V) :- string(V).
check_kind(datetime, V) :- string(V). % accept ISO strings for now
check_kind(list, V) :- is_list(V).
check_kind(uri, V) :- string(V).
check_kind(integer, V) :- integer(V).
check_kind(number, V) :- number(V).
check_kind(boolean, true).
check_kind(boolean, false).

% Fallback false
check_kind(_, _) :- fail.

% validate_entity_shape(+Type, +Props)
% Validates entity-specific shape constraints (e.g., strict fact shapes)
validate_entity_shape(fact, Props) :-
    !,
    valid_optional_fact_enums(Props),
    valid_polarity_in_props(Props),
    valid_claim_provenance(Props),
    ( memberchk(fact_kind=RawKind, Props) -> validate_fact_shape(RawKind, Props) ; true ).
validate_entity_shape(test, Props) :-
    !,
    valid_optional_test_enums(Props),
    forall(member(Key=_, Props), \+ is_fact_only_field(Key)).
validate_entity_shape(req, Props) :-
    !,
    forall(member(Key=_, Props), \+ is_fact_only_field(Key)),
    forall(member(Key=_, Props), \+ is_test_only_field(Key)).
validate_entity_shape(Type, Props) :-
    Type \= fact,
    Type \= test,
    Type \= req,
    % Non-fact/non-test entities cannot have type-specific fields
    forall(member(Key=_, Props), \+ is_fact_only_field(Key)),
    forall(member(Key=_, Props), \+ is_test_only_field(Key)),
    forall(member(Key=_, Props), Key \= logic_claims).

% is_fact_only_field(+Key) - true if Key is a fact-specific field
is_fact_only_field(fact_kind).
is_fact_only_field(subject_key).
is_fact_only_field(property_key).
is_fact_only_field(operator).
is_fact_only_field(value_type).
is_fact_only_field(value_string).
is_fact_only_field(value_int).
is_fact_only_field(value_number).
is_fact_only_field(value_bool).
is_fact_only_field(unit).
is_fact_only_field(scope).
is_fact_only_field(polarity).
is_fact_only_field(closed_world).
is_fact_only_field(valid_from).
is_fact_only_field(valid_to).
is_fact_only_field(canonical_key).
is_fact_only_field(claim_key).
is_fact_only_field(claim_text).
is_fact_only_field(predicate_name).
is_fact_only_field(predicate_namespace).
is_fact_only_field(predicate_arity).
is_fact_only_field(argument_names).
is_fact_only_field(argument_types).
is_fact_only_field(argument_descriptions).
is_fact_only_field(aliases).
is_fact_only_field(examples).
is_fact_only_field(predicate_args).

% is_test_only_field(+Key) - true if Key is a test-specific field
is_test_only_field(verification_scope).
is_test_only_field(verification_perspective).

% validate_fact_shape(+Kind, +Props)
validate_fact_shape(subject, Props) :-
    memberchk(subject_key=_Val, Props),
    valid_optional_fact_enums(Props),
    valid_strict_polarity_in_props(Props).
validate_fact_shape(property_value, Props) :-
    memberchk(subject_key=_Subject, Props),
    memberchk(property_key=_Property, Props),
    memberchk(operator=Op, Props),
    valid_operator(Op),
    memberchk(value_type=VT, Props),
    valid_value_type(VT),
    exactly_one_value_field(Props),
    value_type_matches_field(VT, Props),
    valid_optional_fact_enums(Props),
    valid_strict_polarity_in_props(Props).
validate_fact_shape(observation, Props) :-
    valid_optional_fact_enums(Props),
    valid_polarity_in_props(Props).
validate_fact_shape(meta, Props) :-
    % Meta facts are allowed but don't require full strict property tuple yet
    valid_optional_fact_enums(Props),
    valid_polarity_in_props(Props).
validate_fact_shape(predicate_schema, Props) :-
    memberchk(predicate_name=_Name, Props),
    memberchk(predicate_arity=Arity, Props),
    Arity >= 1,
    memberchk(argument_names=ArgumentNames, Props),
    memberchk(argument_types=ArgumentTypes, Props),
    same_length(ArgumentNames, ArgumentTypes),
    length(ArgumentNames, Arity),
    valid_optional_fact_enums(Props),
    valid_polarity_in_props(Props).
validate_fact_shape(predicate, Props) :-
    memberchk(predicate_name=_Name, Props),
    memberchk(predicate_args=Args, Props),
    Args \= [],
    memberchk(canonical_key=_CanonicalKey, Props),
    valid_optional_fact_enums(Props),
    valid_predicate_polarity_in_props(Props).
validate_fact_shape(Kind, _Props) :-
    % Unknown fact_kind values fail validation
    \+ memberchk(Kind, [subject, property_value, observation, meta, predicate_schema, predicate]),
    fail.

% valid_operator(+Op)
valid_operator(eq).
valid_operator(neq).
valid_operator(lt).
valid_operator(lte).
valid_operator(gt).
valid_operator(gte).

% valid_value_type(+VT)
valid_value_type(string).
valid_value_type(int).
valid_value_type(number).
valid_value_type(bool).

% valid_polarity_in_props(+Props)
% Validates polarity if present; succeeds if no polarity in props
valid_polarity_in_props(Props) :-
    ( memberchk(polarity=P, Props) -> valid_polarity(P) ; true ).

valid_strict_polarity_in_props(Props) :-
    ( memberchk(polarity=P, Props) -> valid_strict_polarity(P) ; true ).

valid_predicate_polarity_in_props(Props) :-
    ( memberchk(polarity=P, Props) -> valid_predicate_polarity(P) ; true ).

% claim_key and claim_text form one auditable provenance pair.
valid_claim_provenance(Props) :-
    (   memberchk(claim_key=Key, Props)
    ->  memberchk(claim_text=Text, Props),
        nonempty_claim_value(Key),
        nonempty_claim_value(Text)
    ;   \+ memberchk(claim_text=_, Props)
    ).

nonempty_claim_value(Value) :- string(Value), Value \= "".
nonempty_claim_value(Value) :- atom(Value), Value \= ''.

% valid_optional_fact_enums(+Props)
% Validates enum-typed fact fields whenever they are present
valid_optional_fact_enums(Props) :-
    ( memberchk(operator=Op, Props) -> valid_operator(Op) ; true ),
    ( memberchk(value_type=VT, Props) -> valid_value_type(VT) ; true ).

% valid_optional_test_enums(+Props)
% Validates enum-typed test fields whenever they are present
valid_optional_test_enums(Props) :-
    ( memberchk(verification_scope=Scope, Props) -> valid_verification_scope(Scope) ; true ),
    ( memberchk(verification_perspective=Perspective, Props) -> valid_verification_perspective(Perspective) ; true ).

% valid_polarity(+P)
valid_polarity(require).
valid_polarity(forbid).
valid_polarity(assert).
valid_polarity(deny).

valid_strict_polarity(require).
valid_strict_polarity(forbid).

valid_predicate_polarity(assert).
valid_predicate_polarity(deny).

% valid_verification_scope(+Scope)
valid_verification_scope(unit).
valid_verification_scope(integration).
valid_verification_scope(end_to_end).

% valid_verification_perspective(+Perspective)
valid_verification_perspective(internal).
valid_verification_perspective(consumer).

% exactly_one_value_field(+Props)
exactly_one_value_field(Props) :-
    findall(F, (member(F=_, Props), is_value_field(F)), Fields),
    length(Fields, 1).

% is_value_field(+Field)
is_value_field(value_string).
is_value_field(value_int).
is_value_field(value_number).
is_value_field(value_bool).

% value_type_matches_field(+ValueType, +Props)
% Ensures that value_type matches the actual value field present
value_type_matches_field(string, Props) :- memberchk(value_string=_, Props), !.
value_type_matches_field(int, Props) :- memberchk(value_int=_, Props), !.
value_type_matches_field(number, Props) :- memberchk(value_number=_, Props), !.
value_type_matches_field(bool, Props) :- memberchk(value_bool=_, Props), !.
