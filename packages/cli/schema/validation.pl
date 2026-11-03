% Module: kibi_validation
% Validation rules for entities and relationships in Kibi
:- module(kibi_validation,
          [ validate_entity/2,        % +Type, +Props
            validate_relationship/3,  % +RelType, +FromEntity, +ToEntity
            validate_property_type/3  % +Type, +Prop, +Value
          ]).

:- use_module('entities.pl').
:- use_module('relationships.pl').
:- use_module(library(http/json)).

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
    validate_entity_shape(Type, Props),
    % provenance, when present, names a known origin kind
    valid_origin_in_props(Props).

% validate_relationship(+RelType, +From, +To)
% From and To are pairs Type=Id or structures type(Type) - allow Type or Type=Id
% No relationship_type/1 check: valid_relationship/3 names only known types.
validate_relationship(RelType, From, To) :-
    % extract types
    type_of(From, FromType),
    type_of(To, ToType),
    % valid combination
    valid_relationship(RelType, FromType, ToType).

% mutalog-disable-next-line cut_insert: the other clause needs a Type=Id pair, never an atom
type_of(Type, Type) :- atom(Type), entity_type(Type).
type_of(Type=_Id, Type) :- atom(Type), entity_type(Type).

% validate_property_type(+EntityType, +Prop, +Value)
validate_property_type(Type, Prop, Value) :-
    entity_property(Type, Prop, Kind),
    check_kind(Kind, Value), !.

% check_kind(Kind, Value) succeeds if Value matches Kind
% mutalog-disable-next-line cut_insert: the kinds are distinct and each clause is called with a bound kind
check_kind(atom, V) :- atom(V).
% mutalog-disable-next-line cut_insert: the kinds are distinct and each clause is called with a bound kind
check_kind(string, V) :- string(V).
check_kind(atom_or_string, V) :- atom(V) ; string(V).
% mutalog-disable-next-line cut_insert: the kinds are distinct and each clause is called with a bound kind
check_kind(datetime, V) :- string(V). % accept ISO strings for now
% mutalog-disable-next-line cut_insert: the kinds are distinct and each clause is called with a bound kind
check_kind(list, V) :- is_list(V).
check_kind(list_or_json, V) :- is_list(V) ; string(V) ; atom(V).
% mutalog-disable-next-line cut_insert: the kinds are distinct and each clause is called with a bound kind
check_kind(uri, V) :- string(V).
% Non-empty workspace-relative path: reject absolute forms and `..` segments.
check_kind(workspace_relpath, V) :-
    % mutalog-disable-next-line cut_insert: the kinds are distinct and each clause is called with a bound kind
    string(V),
    V \== "",
    \+ workspace_relpath_absolute(V),
    split_string(V, "/\\", "", Parts),
    \+ member("..", Parts).
% mutalog-disable-next-line cut_insert: the kinds are distinct and each clause is called with a bound kind
check_kind(integer, V) :- integer(V).
% mutalog-disable-next-line cut_insert: the kinds are distinct and each clause is called with a bound kind
check_kind(number, V) :- number(V).
check_kind(boolean, true).
check_kind(boolean, false).

% mutalog-disable-next-line cut_insert: only ever called under \+
workspace_relpath_absolute(V) :- sub_string(V, 0, 1, _, "/").
% mutalog-disable-next-line cut_insert: only ever called under \+
workspace_relpath_absolute(V) :- sub_string(V, 1, 1, _, ":").
workspace_relpath_absolute(V) :- sub_string(V, 0, 2, _, "\\\\").

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
    valid_optional_test_enums(Props).
% Fields of another entity type need no check here: entity_property/3 types
% them for that type only, so validate_property_type/3 already rejected them.
validate_entity_shape(_, _).

% validate_fact_shape(+Kind, +Props)
% validate_entity_shape/2 has already checked the operator and value_type
% enums and the general polarity, so each kind adds only its own fields and
% any stricter polarity. An unknown kind matches no clause and fails.
validate_fact_shape(subject, Props) :-
    % mutalog-disable-next-line cut_insert: the fact kinds are distinct and the kind is bound
    memberchk(subject_key=_Val, Props),
    valid_strict_polarity_in_props(Props).
validate_fact_shape(property_value, Props) :-
    % mutalog-disable-next-line cut_insert: the fact kinds are distinct and the kind is bound
    memberchk(subject_key=_Subject, Props),
    memberchk(property_key=_Property, Props),
    memberchk(operator=Op, Props),
    memberchk(value_type=VT, Props),
    ( Op == matches -> VT == string ; true ),
    ( memberchk(Op, [includes, subset_of, excludes]) -> VT == set ; true ),
    exactly_one_value_field(Props),
    value_type_matches_field(VT, Props),
    valid_strict_polarity_in_props(Props).
validate_fact_shape(observation, _Props).
% Meta facts are allowed but don't require full strict property tuple yet
validate_fact_shape(meta, _Props).
validate_fact_shape(predicate_schema, Props) :-
    % mutalog-disable-next-line cut_insert: the fact kinds are distinct and the kind is bound
    memberchk(predicate_name=_Name, Props),
    memberchk(predicate_arity=Arity, Props),
    Arity >= 1,
    memberchk(argument_names=ArgumentNames, Props),
    memberchk(argument_types=ArgumentTypes, Props),
    same_length(ArgumentNames, ArgumentTypes),
    length(ArgumentNames, Arity),
    valid_key_arguments(Props, ArgumentNames).
validate_fact_shape(predicate, Props) :-
    % mutalog-disable-next-line cut_insert: the fact kinds are distinct and the kind is bound
    memberchk(predicate_name=_Name, Props),
    memberchk(predicate_args=Args, Props),
    Args \== [],
    memberchk(canonical_key=_CanonicalKey, Props),
    valid_predicate_polarity_in_props(Props).
validate_fact_shape(rule_schema, Props) :-
    % mutalog-disable-next-line cut_insert: the fact kinds are distinct and the kind is bound
    memberchk(rule_name=_Name, Props),
    memberchk(argument_names=ArgumentNames, Props),
    memberchk(argument_types=ArgumentTypes, Props),
    same_length(ArgumentNames, ArgumentTypes).
validate_fact_shape(rule, Props) :-
    memberchk(rule_ir=RuleIr, Props),
    nonempty_claim_value(RuleIr),
    memberchk(rule_hash=_Hash, Props),
    memberchk(rule_schema_id=_SchemaId, Props),
    memberchk(semantic_key=_SemanticKey, Props).

% valid_key_arguments(+Props, +ArgumentNames)
% Optional key_arguments must be a non-empty list of distinct declared
% argument names.
valid_key_arguments(Props, ArgumentNames) :-
    (   memberchk(key_arguments=Keys, Props)
    ->  Keys \== [],
        maplist(text_atom, ArgumentNames, NameAtoms),
        maplist(text_atom, Keys, KeyAtoms),
        sort(KeyAtoms, UniqueKeys),
        same_length(KeyAtoms, UniqueKeys),
        forall(member(Key, KeyAtoms), memberchk(Key, NameAtoms))
    ;   true
    ).

text_atom(Value, Atom) :- atom(Value), !, Atom = Value.
text_atom(Value, Atom) :- string(Value), atom_string(Atom, Value).

valid_operator(Op) :- memberchk(Op, [eq, neq, lt, lte, gt, gte, matches, includes, subset_of, excludes]).

valid_value_type(ValueType) :- memberchk(ValueType, [string, int, number, bool, set]).

% valid_polarity_in_props(+Props)
% Validates polarity if present; succeeds if no polarity in props
valid_polarity_in_props(Props) :-
    ( memberchk(polarity=P, Props) -> valid_polarity(P) ; true ).

valid_strict_polarity_in_props(Props) :-
    ( memberchk(polarity=P, Props) -> valid_strict_polarity(P) ; true ).

valid_predicate_polarity_in_props(Props) :-
    ( memberchk(polarity=P, Props) -> valid_predicate_polarity(P) ; true ).

% claim_key and claim_text form one auditable provenance pair. An observation
% or meta fact is a non-grounding review note: it may quote the claim it is
% about in claim_text without claiming that claim's key.
valid_claim_provenance(Props) :-
    (   memberchk(claim_key=Key, Props)
    ->  memberchk(claim_text=Text, Props),
        nonempty_claim_value(Key),
        nonempty_claim_value(Text)
    ;   memberchk(claim_text=Text, Props)
    ->  review_note_fact(Props),
        nonempty_claim_value(Text)
    ;   true
    ).

% fact_kind is typed atom, so a string kind never reaches this check.
review_note_fact(Props) :-
    memberchk(fact_kind=Kind, Props),
    memberchk(Kind, [observation, meta]).

% Its callers' fields (claim_key, claim_text, rule_ir) are all typed string.
nonempty_claim_value(Value) :- Value \== "".

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

valid_polarity(Polarity) :- memberchk(Polarity, [require, forbid, assert, deny]).

valid_strict_polarity(Polarity) :- memberchk(Polarity, [require, forbid]).

valid_predicate_polarity(Polarity) :- memberchk(Polarity, [assert, deny]).

valid_verification_scope(Scope) :- memberchk(Scope, [unit, integration, end_to_end]).

valid_verification_perspective(Perspective) :- memberchk(Perspective, [internal, consumer]).

% exactly_one_value_field(+Props)
exactly_one_value_field(Props) :-
    findall(F, (member(F=_, Props), is_value_field(F)), Fields),
    length(Fields, 1).

% is_value_field(+Field)
is_value_field(value_string).
is_value_field(value_int).
is_value_field(value_number).
is_value_field(value_bool).
is_value_field(value_set).

% value_type_matches_field(+ValueType, +Props)
% Ensures that value_type matches the actual value field present
% mutalog-disable-next-line cut_insert: the value types are distinct and the type is bound
value_type_matches_field(string, Props) :- memberchk(value_string=_, Props).
% mutalog-disable-next-line cut_insert: the value types are distinct and the type is bound
value_type_matches_field(int, Props) :- memberchk(value_int=_, Props).
% mutalog-disable-next-line cut_insert: the value types are distinct and the type is bound
value_type_matches_field(number, Props) :- memberchk(value_number=_, Props).
% mutalog-disable-next-line cut_insert: the value types are distinct and the type is bound
value_type_matches_field(bool, Props) :- memberchk(value_bool=_, Props).
value_type_matches_field(set, Props) :- memberchk(value_set=_, Props).

% valid_origin_in_props(+Props)
% Entity provenance travels as a JSON object string. When present its kind
% must be human, agent, migration or import.
valid_origin_in_props(Props) :-
    (   memberchk(origin=Raw, Props)
    ->  origin_kind(Raw, Kind),
        memberchk(Kind, [human, agent, migration, import])
    ;   true
    ).

% origin is typed list_or_json, so Raw is a list, a string or an atom; JSON
% text arrives as one of the last two. A JSON kind is a string or a value
% that names no origin kind.
origin_kind(Raw, Kind) :-
    \+ is_list(Raw),
    catch((atom_json_dict(Raw, Dict, []), is_dict(Dict)), _, fail),
    get_dict(kind, Dict, RawKind),
    string(RawKind),
    atom_string(Kind, RawKind).
