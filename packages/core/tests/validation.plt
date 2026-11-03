:- use_module(library(plunit)).
:- use_module('../schema/validation.pl').
:- use_module(test_helpers).

% Entity and relationship validation. Each test starts from the required
% fields of an entity and adds the fields it is about.

:- begin_tests(validation).

base(Extra, Props) :-
    append([id='X-1', title="T", status=active, created_at="2026-01-01T00:00:00Z",
            updated_at="2026-01-01T00:00:00Z", source="test://validation"],
           Extra, Props).

valid(Type, Extra) :-
    base(Extra, Props),
    first_answer_is_last(validate_entity(Type, Props)).

invalid(Type, Extra) :-
    base(Extra, Props),
    \+ validate_entity(Type, Props).

property_value(Op, Type, ValueField, Props) :-
    append([fact_kind=property_value, subject_key="order", property_key="total", operator=Op,
            value_type=Type], ValueField, Props).

% --- validate_entity/2: the frame -------------------------------------------

test(entity_types_validate) :-
    forall(member(Type, [req, scenario, test, adr, flag, event, symbol, fact]), valid(Type, [])).

test(unknown_entity_type_invalid) :-
    invalid(nonsense, []).

test(each_required_field_needed) :-
    base([], Props),
    forall(select(_=_, Props, Rest), \+ validate_entity(req, Rest)).

test(unknown_field_invalid) :-
    invalid(req, [colour="blue"]).

test(field_of_another_type_invalid) :-
    invalid(req, [fact_kind=subject]),
    invalid(scenario, [logic_claims=[]]),
    invalid(symbol, [verification_scope=unit]),
    invalid(fact, [proof_bindings="{}"]).

% --- validate_property_type/3 and the value kinds ---------------------------

test(property_type_leaves_no_choicepoint) :-
    first_answer_is_last(validate_property_type(req, id, foo)),
    first_answer_is_last(validate_property_type(fact, rule_schema_id, foo)),
    first_answer_is_last(validate_property_type(req, origin, [])).

test(kind_atom) :-
    validate_property_type(req, id, foo),
    \+ validate_property_type(req, id, "foo").

test(kind_string) :-
    validate_property_type(req, title, "T"),
    \+ validate_property_type(req, title, t).

test(kind_atom_or_string) :-
    validate_property_type(fact, rule_schema_id, foo),
    validate_property_type(fact, rule_schema_id, "foo"),
    \+ validate_property_type(fact, rule_schema_id, 1).

test(kind_datetime) :-
    validate_property_type(req, created_at, "2026"),
    \+ validate_property_type(req, created_at, 2026).

test(kind_list) :-
    validate_property_type(req, tags, []),
    \+ validate_property_type(req, tags, "a").

test(kind_list_or_json) :-
    validate_property_type(test, proof_contract, [a]),
    validate_property_type(test, proof_contract, "{}"),
    validate_property_type(test, proof_contract, x),
    \+ validate_property_type(test, proof_contract, 42).

test(kind_uri) :-
    validate_property_type(req, source, "x"),
    \+ validate_property_type(req, source, x).

test(kind_integer) :-
    validate_property_type(fact, value_int, 3),
    \+ validate_property_type(fact, value_int, 3.5).

test(kind_number) :-
    validate_property_type(fact, value_number, 3.5),
    \+ validate_property_type(fact, value_number, '3').

test(kind_boolean) :-
    validate_property_type(fact, closed_world, true),
    validate_property_type(fact, closed_world, false),
    \+ validate_property_type(fact, closed_world, yes).

test(kind_workspace_relpath_accepts) :-
    forall(member(Path, ["src/a.ts", "a", "a\\b.ts", "a..b/c", ":x", "x/..m/y", "m../y"]),
           validate_property_type(symbol, sourceFile, Path)).

test(kind_workspace_relpath_rejects) :-
    forall(member(Path, ["", "/src/a.ts", "C:/a", "a:", "\\\\server\\a", "a/../b", "a\\..\\b", "..", 'src/a.ts']),
           \+ validate_property_type(symbol, sourceFile, Path)).

% --- entity-type shapes -----------------------------------------------------

test(test_entity_enums) :-
    forall(member(Scope, [unit, integration, end_to_end]), valid(test, [verification_scope=Scope])),
    forall(member(Perspective, [internal, consumer]), valid(test, [verification_perspective=Perspective])),
    invalid(test, [verification_scope=system]),
    invalid(test, [verification_perspective=external]).

test(fact_without_kind_valid) :-
    valid(fact, []).

test(unknown_fact_kind_invalid) :-
    invalid(fact, [fact_kind=gossip]),
    invalid(fact, [fact_kind="subject", subject_key="s"]).

test(fact_operator_enum) :-
    forall(member(Op, [eq, neq, lt, lte, gt, gte, matches, includes, subset_of, excludes]),
           valid(fact, [operator=Op])),
    invalid(fact, [operator=about]).

test(fact_value_type_enum) :-
    forall(member(Type, [string, int, number, bool, set]), valid(fact, [value_type=Type])),
    invalid(fact, [value_type=date]).

test(fact_polarity_enum) :-
    forall(member(Polarity, [require, forbid, assert, deny]), valid(fact, [polarity=Polarity])),
    invalid(fact, [polarity=maybe]).

% --- claim provenance -------------------------------------------------------

test(claim_pair_valid) :-
    valid(fact, [claim_key="CLAIM-1", claim_text="The claim"]).

test(claim_key_needs_text) :-
    invalid(fact, [claim_key="CLAIM-1"]).

test(claim_values_nonempty) :-
    invalid(fact, [claim_key="", claim_text="The claim"]),
    invalid(fact, [claim_key="CLAIM-1", claim_text=""]).

test(claim_text_alone_only_on_review_notes) :-
    valid(fact, [fact_kind=observation, claim_text="Quoted claim"]),
    valid(fact, [fact_kind=meta, claim_text="Quoted claim"]),
    invalid(fact, [fact_kind=observation, claim_text=""]),
    invalid(fact, [claim_text="Quoted claim"]),
    invalid(fact, [fact_kind=subject, subject_key="s", claim_text="Quoted claim"]).

% --- fact shapes ------------------------------------------------------------

test(subject_fact) :-
    valid(fact, [fact_kind=subject, subject_key="order"]),
    valid(fact, [fact_kind=subject, subject_key="order", polarity=forbid]),
    invalid(fact, [fact_kind=subject]),
    invalid(fact, [fact_kind=subject, subject_key="order", polarity=assert]).

test(property_value_fact_each_type) :-
    forall(member(Type-Field, [string-(value_string="x"), int-(value_int=1), number-(value_number=1.5),
                               bool-(value_bool=true), set-(value_set=["a"])]),
           ( property_value(eq, Type, [Field], Extra), valid(fact, Extra) )).

test(property_value_fact_required_fields) :-
    property_value(eq, int, [value_int=1], Props),
    forall(( member(Key, [subject_key, property_key, operator, value_type]),
             selectchk(Key=_, Props, Rest) ),
           invalid(fact, Rest)).

test(property_value_value_field_matches_type) :-
    forall(member(Type-Field, [string-(value_int=1), int-(value_string="x"), number-(value_int=1),
                               bool-(value_int=1), set-(value_int=1)]),
           ( property_value(eq, Type, [Field], Extra), invalid(fact, Extra) )).

test(property_value_exactly_one_value) :-
    property_value(eq, int, [], None),
    invalid(fact, None),
    property_value(eq, int, [value_int=1, value_string="x"], Two),
    invalid(fact, Two),
    property_value(eq, int, [value_int=1, value_int=2], Repeated),
    invalid(fact, Repeated).

test(property_value_matches_needs_string) :-
    property_value(matches, string, [value_string="^a"], Ok),
    valid(fact, Ok),
    property_value(matches, int, [value_int=1], Bad),
    invalid(fact, Bad).

test(property_value_set_operators_need_set) :-
    forall(member(Op, [includes, subset_of, excludes]),
           ( property_value(Op, set, [value_set=["a"]], Ok), valid(fact, Ok),
             property_value(Op, string, [value_string="a"], Bad), invalid(fact, Bad) )),
    property_value(neq, string, [value_string="a"], Other),
    valid(fact, Other).

test(property_value_strict_polarity) :-
    property_value(eq, int, [value_int=1, polarity=require], Require),
    valid(fact, Require),
    property_value(eq, int, [value_int=1, polarity=deny], Deny),
    invalid(fact, Deny).

test(observation_and_meta_facts) :-
    valid(fact, [fact_kind=observation]),
    valid(fact, [fact_kind=meta, polarity=deny]),
    invalid(fact, [fact_kind=observation, polarity=maybe]).

schema_props(Extra, Props) :-
    append([fact_kind=predicate_schema, predicate_name="permission", predicate_arity=2,
            argument_names=[role, action], argument_types=[string, string]], Extra, Props).

test(predicate_schema_fact) :-
    schema_props([], Props),
    valid(fact, Props),
    forall(( member(Key, [predicate_name, predicate_arity, argument_names, argument_types]),
             selectchk(Key=_, Props, Rest) ),
           invalid(fact, Rest)).

test(predicate_schema_arity) :-
    valid(fact, [fact_kind=predicate_schema, predicate_name="p", predicate_arity=1,
                 argument_names=[a], argument_types=[string]]),
    invalid(fact, [fact_kind=predicate_schema, predicate_name="p", predicate_arity=0,
                   argument_names=[], argument_types=[]]),
    invalid(fact, [fact_kind=predicate_schema, predicate_name="p", predicate_arity=3,
                   argument_names=[a, b], argument_types=[string, string]]),
    invalid(fact, [fact_kind=predicate_schema, predicate_name="p", predicate_arity=2,
                   argument_names=[a, b], argument_types=[string]]).

test(predicate_schema_key_arguments) :-
    schema_props([key_arguments=[role]], One),
    valid(fact, One),
    schema_props([key_arguments=["role", "action"]], Strings),
    valid(fact, Strings),
    schema_props([key_arguments=[]], Empty),
    invalid(fact, Empty),
    schema_props([key_arguments=[role, role]], Repeated),
    invalid(fact, Repeated),
    schema_props([key_arguments=[subject]], Undeclared),
    invalid(fact, Undeclared),
    schema_props([key_arguments=[1]], NotText),
    invalid(fact, NotText).

test(predicate_schema_string_argument_names) :-
    valid(fact, [fact_kind=predicate_schema, predicate_name="p", predicate_arity=1,
                 argument_names=["role"], argument_types=[string], key_arguments=[role]]),
    invalid(fact, [fact_kind=predicate_schema, predicate_name="p", predicate_arity=1,
                   argument_names=["role"], argument_types=[string], key_arguments=["subject"]]),
    invalid(fact, [fact_kind=predicate_schema, predicate_name="p", predicate_arity=1,
                   argument_names=[1], argument_types=[int], key_arguments=[1]]).

test(predicate_fact) :-
    Props = [fact_kind=predicate, predicate_name="permission", predicate_args=[coach, read],
             canonical_key="permission(coach,read)"],
    valid(fact, Props),
    forall(( member(Key, [predicate_name, predicate_args, canonical_key]),
             selectchk(Key=_, Props, Rest) ),
           invalid(fact, Rest)),
    invalid(fact, [fact_kind=predicate, predicate_name="p", predicate_args=[], canonical_key="p"]),
    valid(fact, [polarity=deny|Props]),
    invalid(fact, [polarity=forbid|Props]).

test(rule_schema_fact) :-
    Props = [fact_kind=rule_schema, rule_name="r", argument_names=[a], argument_types=[string]],
    valid(fact, Props),
    forall(( member(Key, [rule_name, argument_names, argument_types]),
             selectchk(Key=_, Props, Rest) ),
           invalid(fact, Rest)),
    invalid(fact, [fact_kind=rule_schema, rule_name="r", argument_names=[a], argument_types=[]]).

test(rule_fact) :-
    Props = [fact_kind=rule, rule_ir="{}", rule_hash="h", rule_schema_id='FACT-S', semantic_key="k"],
    valid(fact, Props),
    forall(( member(Key, [rule_ir, rule_hash, rule_schema_id, semantic_key]),
             selectchk(Key=_, Props, Rest) ),
           invalid(fact, Rest)),
    invalid(fact, [fact_kind=rule, rule_ir="", rule_hash="h", rule_schema_id='FACT-S', semantic_key="k"]).

% --- origin -----------------------------------------------------------------

test(origin_kinds) :-
    forall(member(Kind, ["human", "agent", "migration", "import"]),
           ( format(string(Json), "{\"kind\":\"~w\"}", [Kind]),
             valid(scenario, [origin=Json]) )),
    valid(scenario, [origin='{"kind":"human"}']).

test(origin_rejects_without_error) :-
    forall(member(Origin, ["{\"kind\":\"robot\"}", "{\"ref\":\"s\"}", "not json", "42", "[]",
                           "{\"kind\":{\"a\":1}}", "{\"kind\":5}", "{\"kind\":true}", "{\"kind\":[]}", "{}", `{"kind":"human"}`]),
           ( base([origin=Origin], Props),
             catch(\+ validate_entity(scenario, Props), Error, (print_message(error, Error), fail)) )).

% --- validate_relationship/3 ------------------------------------------------

test(relationship_endpoints_as_types_or_pairs) :-
    first_answer_is_last(validate_relationship(depends_on, req, req)),
    first_answer_is_last(validate_relationship(depends_on, req='REQ-1', req='REQ-2')),
    \+ validate_relationship(depends_on, req, scenario).

test(relationship_unknown_endpoint_type) :-
    \+ validate_relationship(relates_to, invalid, req),
    \+ validate_relationship(relates_to, req, invalid='X'),
    \+ validate_relationship(relates_to, "req", req),
    \+ validate_relationship(relates_to, "req"='X', req).

test(relationship_unbound_endpoint) :-
    \+ validate_relationship(depends_on, _, req),
    \+ validate_relationship(depends_on, req, _='X').

test(relationship_unknown_type) :-
    \+ validate_relationship(owns, req, req).

:- end_tests(validation).
