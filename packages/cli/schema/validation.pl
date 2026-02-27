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
    forall(member(Key=Val, Props), validate_property_type(Type, Key, Val)).

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
validate_property_type(_Type, Prop, Value) :-
    % find declared property type, default to atom
    ( entity_property(_Any, Prop, Kind) -> true ; Kind = atom ),
    check_kind(Kind, Value), !.

% check_kind(Kind, Value) succeeds if Value matches Kind
check_kind(atom, V) :- atom(V).
check_kind(string, V) :- string(V).
check_kind(datetime, V) :- string(V). % accept ISO strings for now
check_kind(list, V) :- is_list(V).
check_kind(uri, V) :- string(V).

% Fallback false
check_kind(_, _) :- fail.
