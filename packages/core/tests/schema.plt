:- begin_tests(schema).

:- use_module(library(plunit)).
:- prolog_load_context(directory, TestDirectory),
   directory_file_path(TestDirectory, '../schema/entities.pl', EntitiesPath),
   directory_file_path(TestDirectory, '../schema/relationships.pl', RelationshipsPath),
   directory_file_path(TestDirectory, '../schema/validation.pl', ValidationPath),
   use_module(EntitiesPath),
   use_module(RelationshipsPath),
   use_module(ValidationPath).

test(entity_types_count) :-
    findall(T, entity_type(T), Ts),
    sort(Ts, Sorted),
    Sorted == [adr,event,fact,flag,req,scenario,symbol,test].

test(relationship_types_count) :-
    findall(R, relationship_type(R), Rs),
    sort(Rs, Sorted),
    % relationship_type/1 includes 17 items; ensure length and membership
    length(Sorted, 17),
    memberchk(depends_on, Sorted),
    memberchk(executable_for, Sorted),
    memberchk(specified_by, Sorted),
    memberchk(verified_by, Sorted),
    memberchk(constrains, Sorted),
    memberchk(requires_property, Sorted),
    memberchk(requires_predicate, Sorted),
    memberchk(requires_rule, Sorted).

test(valid_relationship_ok) :-
    validate_relationship(depends_on, req, req).

test(invalid_relationship_bad_types) :-
    \+ validate_relationship(depends_on, invalid, req).

test(traceability_schema_valid_relationships) :-
    validate_relationship(executable_for, symbol, test),
    validate_relationship(verified_by, scenario, test),
    validate_relationship(validates, test, scenario).

test(ontology_schema_valid_relationships) :-
    validate_relationship(requires_predicate, req, fact).

test(traceability_schema_invalid_relationships) :-
    \+ validate_relationship(implements, symbol, test),
    \+ validate_relationship(implements, symbol, scenario),
    \+ validate_relationship(covered_by, scenario, test),
    \+ validate_relationship(executable_for, req, test).

test(missing_required_property) :-
    % missing title
    Props = [id=foo, status=active, created_at="2020-01-01", updated_at="2020-01-01", source="http://x"],
    \+ validate_entity(req, Props).

test(invalid_property_type) :-
    Props = [id=foo, title=Title, status=active, created_at=123, updated_at="2020-01-01", source="http://x"],
    Title = "A title",
    \+ validate_entity(req, Props).

test(valid_entity) :-
    Props = [id=foo, title="T", status=active, created_at="2020-01-01", updated_at="2020-01-01", source="http://x"],
    validate_entity(req, Props).

test(test_entity_without_verification_fields_valid) :-
    Props = [id='TEST-LEGACY', title="Legacy test", status=pending, created_at="2024-01-01", updated_at="2024-01-01", source="tests/TEST-LEGACY.md"],
    validate_entity(test, Props).

test(test_entity_with_verification_fields_valid) :-
    Props = [id='TEST-TYPED', title="Typed test", status=passing, created_at="2024-01-01", updated_at="2024-01-01", source="tests/TEST-TYPED.md", verification_scope=integration, verification_perspective=consumer],
    validate_entity(test, Props).

test(test_entity_with_invalid_verification_scope_invalid) :-
    Props = [id='TEST-BAD-SCOPE', title="Bad scope", status=passing, created_at="2024-01-01", updated_at="2024-01-01", source="tests/TEST-BAD-SCOPE.md", verification_scope=e2e],
    \+ validate_entity(test, Props).

test(test_entity_with_invalid_verification_perspective_invalid) :-
    Props = [id='TEST-BAD-PERSPECTIVE', title="Bad perspective", status=passing, created_at="2024-01-01", updated_at="2024-01-01", source="tests/TEST-BAD-PERSPECTIVE.md", verification_perspective=external],
    \+ validate_entity(test, Props).

test(req_with_verification_scope_invalid) :-
    Props = [id='REQ-BAD-SCOPE', title="Req with scope", status=open, created_at="2024-01-01", updated_at="2024-01-01", source="reqs/REQ-BAD-SCOPE.md", verification_scope=unit],
    \+ validate_entity(req, Props).

test(symbol_with_verification_perspective_invalid) :-
    Props = [id='SYM-BAD-PERSPECTIVE', title="Symbol with perspective", status=active, created_at="2024-01-01", updated_at="2024-01-01", source="symbols/SYM-BAD-PERSPECTIVE.md", verification_perspective=internal],
    \+ validate_entity(symbol, Props).

% Typed fact validation tests

test(legacy_prose_fact_valid) :-
    % Legacy prose fact with no fact_kind remains valid
    Props = [id='FACT-LEGACY', title="Legacy prose fact", status=active, created_at="2024-01-01", updated_at="2024-01-01", source="facts/FACT-LEGACY.md"],
    validate_entity(fact, Props).

test(subject_fact_valid) :-
    % Subject fact with subject_key is valid
    Props = [id='FACT-SUBJECT', title="User session subject", status=active, created_at="2024-01-01", updated_at="2024-01-01", source="facts/FACT-SUBJECT.md", fact_kind=subject, subject_key="user.session"],
    validate_entity(fact, Props).

test(property_value_fact_with_int_valid) :-
    % Property_value fact with value_type="int" and value_int=30 is valid
    Props = [id='FACT-TIMEOUT', title="Session timeout", status=active, created_at="2024-01-01", updated_at="2024-01-01", source="facts/FACT-TIMEOUT.md", fact_kind=property_value, subject_key="user.session", property_key="timeout_minutes", operator=eq, value_type=int, value_int=30],
    validate_entity(fact, Props).

test(property_value_fact_with_string_valid) :-
    % Property_value fact with value_type="string" and value_string is valid
    Props = [id='FACT-ADMIN', title="User type admin", status=active, created_at="2024-01-01", updated_at="2024-01-01", source="facts/FACT-ADMIN.md", fact_kind=property_value, subject_key="user.type", property_key="allowed_value", operator=eq, value_type=string, value_string="admin"],
    validate_entity(fact, Props).

test(property_value_fact_with_number_valid) :-
    % Property_value fact with value_type="number" and value_number is valid
    Props = [id='FACT-RATE', title="Rate limit", status=active, created_at="2024-01-01", updated_at="2024-01-01", source="facts/FACT-RATE.md", fact_kind=property_value, subject_key="api.client", property_key="rate_limit_rps", operator=eq, value_type=number, value_number=1.5],
    validate_entity(fact, Props).

test(property_value_fact_with_bool_valid) :-
    % Property_value fact with value_type="bool" and value_bool is valid
    Props = [id='FACT-FEATURE', title="Feature enabled", status=active, created_at="2024-01-01", updated_at="2024-01-01", source="facts/FACT-FEATURE.md", fact_kind=property_value, subject_key="feature.new-ui", property_key="enabled", operator=eq, value_type=bool, value_bool=true],
    validate_entity(fact, Props).

test(predicate_schema_fact_valid) :-
    Props = [id='FACT-SCHEMA-CAN', title="Predicate schema: auth.can/3", status=active, created_at="2026-05-30", updated_at="2026-05-30", source="docs/ontology/auth.md", fact_kind=predicate_schema, predicate_name="can", predicate_namespace="auth", predicate_arity=3, argument_names=["actor", "action", "resource"], argument_types=["role", "action", "resource"], aliases=["may", "is allowed to"], examples=["auth.can(user, delete, post)"]],
    validate_entity(fact, Props).

test(predicate_schema_missing_argument_types_invalid) :-
    Props = [id='FACT-SCHEMA-CAN-BAD', title="Predicate schema missing argument types", status=active, created_at="2026-05-30", updated_at="2026-05-30", source="docs/ontology/auth.md", fact_kind=predicate_schema, predicate_name="can", predicate_arity=3, argument_names=["actor", "action", "resource"]],
    \+ validate_entity(fact, Props).

test(predicate_fact_valid) :-
    Props = [id='FACT-CAN-USER-DELETE-POST', title="User can delete post", status=active, created_at="2026-05-30", updated_at="2026-05-30", source="docs/requirements/posts.md", fact_kind=predicate, predicate_name="can", predicate_namespace="auth", predicate_args=["user", "delete", "post"], argument_types=["role", "action", "resource"], polarity=assert, canonical_key="auth.can.role:user.action:delete.resource:post.assert"],
    validate_entity(fact, Props).

test(predicate_fact_missing_canonical_key_invalid) :-
    Props = [id='FACT-CAN-USER-DELETE-POST-BAD', title="User can delete post missing key", status=active, created_at="2026-05-30", updated_at="2026-05-30", source="docs/requirements/posts.md", fact_kind=predicate, predicate_name="can", predicate_args=["user", "delete", "post"], polarity=assert],
    \+ validate_entity(fact, Props).

test(rule_schema_fact_valid) :-
    Props = [id='FACT-RULE-SCHEMA-LOGIC-V1', title="Logic rule schema", status=active, created_at="2026-05-30", updated_at="2026-05-30", source="docs/logic.md", fact_kind=rule_schema, rule_name="kibi.logic.v1", argument_names=["rule_ir"], argument_types=["logic_ir"]],
    validate_entity(fact, Props).

test(rule_schema_fact_mismatched_arguments_invalid) :-
    Props = [id='FACT-RULE-SCHEMA-BAD', title="Bad logic rule schema", status=active, created_at="2026-05-30", updated_at="2026-05-30", source="docs/logic.md", fact_kind=rule_schema, rule_name="kibi.logic.v1", argument_names=["rule_ir"], argument_types=[]],
    \+ validate_entity(fact, Props).

test(rule_fact_shape_requires_logic_fields) :-
    Props = [id='FACT-RULE-BAD', title="Bad logic rule", status=active, created_at="2026-05-30", updated_at="2026-05-30", source="docs/logic.md", fact_kind=rule, rule_ir="{}", rule_hash="bad", rule_schema_id='FACT-RULE-SCHEMA-LOGIC-V1', rule_name="kibi.logic.v1", semantic_key="SEM-BAD"],
    validate_entity(fact, Props).

test(rule_fact_missing_ir_invalid) :-
    Props = [id='FACT-RULE-MISSING', title="Missing logic rule", status=active, created_at="2026-05-30", updated_at="2026-05-30", source="docs/logic.md", fact_kind=rule, rule_hash="bad", rule_schema_id='FACT-RULE-SCHEMA-LOGIC-V1', rule_name="kibi.logic.v1", semantic_key="SEM-BAD"],
    \+ validate_entity(fact, Props).

test(property_value_fact_missing_value_field_invalid) :-
    % Property_value fact missing the matching value field is invalid
    Props = [id='FACT-INVALID', title="Missing value", status=active, created_at="2024-01-01", updated_at="2024-01-01", source="facts/FACT-INVALID.md", fact_kind=property_value, subject_key="user", property_key="name", operator=eq, value_type=int],
    % No value_int despite value_type=int
    \+ validate_entity(fact, Props).

test(property_value_fact_mismatched_value_type_invalid) :-
    % Property_value fact with value_type="string" but value_int present is invalid
    Props = [id='FACT-MISMATCH', title="Mismatched types", status=active, created_at="2024-01-01", updated_at="2024-01-01", source="facts/FACT-MISMATCH.md", fact_kind=property_value, subject_key="user", property_key="name", operator=eq, value_type=string, value_int=30],
    \+ validate_entity(fact, Props).

test(property_value_fact_missing_subject_key_invalid) :-
    % Property_value fact missing subject_key is invalid
    Props = [id='FACT-NO-SUBJECT', title="No subject", status=active, created_at="2024-01-01", updated_at="2024-01-01", source="facts/FACT-NO-SUBJECT.md", fact_kind=property_value, property_key="name", operator=eq, value_type=int, value_int=30],
    \+ validate_entity(fact, Props).

test(closed_world_boolean_valid) :-
    % closed_world=true (boolean atom) is valid
    Props = [id='FACT-CLOSED', title="Closed world fact", status=active, created_at="2024-01-01", updated_at="2024-01-01", source="facts/FACT-CLOSED.md", fact_kind=property_value, subject_key="user", property_key="name", operator=eq, value_type=string, value_string="test", closed_world=true],
    validate_entity(fact, Props).

test(observation_fact_valid) :-
    % Observation facts are allowed and valid
    Props = [id='FACT-OBS', title="Observation", status=active, created_at="2024-01-01", updated_at="2024-01-01", source="facts/FACT-OBS.md", fact_kind=observation, subject_key="system.sessions", property_key="active_count", operator=eq, value_type=int, value_int=150],
    validate_entity(fact, Props).

test(meta_fact_valid) :-
    % Meta facts are allowed and valid
    Props = [id='FACT-META', title="Meta fact", status=active, created_at="2024-01-01", updated_at="2024-01-01", source="facts/FACT-META.md", fact_kind=meta, subject_key="fact.schema"],
    validate_entity(fact, Props).

test(req_with_fact_kind_invalid) :-
    % Req entities with fact_kind are invalid
    Props = [id='REQ-001', title="Invalid req", status=open, created_at="2024-01-01", updated_at="2024-01-01", source="reqs/REQ-001.md", fact_kind=property_value],
    \+ validate_entity(req, Props).

test(req_with_value_int_invalid) :-
    % Req entities with value_int are invalid
    Props = [id='REQ-002', title="Invalid req", status=open, created_at="2024-01-01", updated_at="2024-01-01", source="reqs/REQ-002.md", value_int=42],
    \+ validate_entity(req, Props).

test(unknown_property_invalid) :-
    % Undeclared properties must fail validation instead of defaulting to atom
    Props = [id='FACT-UNKNOWN', title="Unknown property", status=active, created_at="2024-01-01", updated_at="2024-01-01", source="facts/FACT-UNKNOWN.md", mystery=foo],
    \+ validate_entity(fact, Props).

test(legacy_fact_invalid_optional_enum_invalid) :-
    % Legacy facts without fact_kind still reject invalid enum fields when present
    Props = [id='FACT-LEGACY-INVALID', title="Legacy invalid enum", status=active, created_at="2024-01-01", updated_at="2024-01-01", source="facts/FACT-LEGACY-INVALID.md", operator=contains],
    \+ validate_entity(fact, Props).

test(invalid_fact_kind_enum_invalid) :-
    % Invalid fact_kind enum value fails
    Props = [id='FACT-INVALID', title="Invalid kind", status=active, created_at="2024-01-01", updated_at="2024-01-01", source="facts/FACT-INVALID.md", fact_kind=invalid_kind],
    \+ validate_entity(fact, Props).

test(invalid_operator_enum_invalid) :-
    % Invalid operator enum value fails
    Props = [id='FACT-INVALID', title="Invalid operator", status=active, created_at="2024-01-01", updated_at="2024-01-01", source="facts/FACT-INVALID.md", fact_kind=property_value, subject_key="user", property_key="name", operator=contains, value_type=string, value_string="test"],
    \+ validate_entity(fact, Props).

test(invalid_value_type_enum_invalid) :-
    % Invalid value_type enum value fails
    Props = [id='FACT-INVALID', title="Invalid value type", status=active, created_at="2024-01-01", updated_at="2024-01-01", source="facts/FACT-INVALID.md", fact_kind=property_value, subject_key="user", property_key="name", operator=eq, value_type=date],
    \+ validate_entity(fact, Props).

test(invalid_polarity_enum_invalid) :-
    % Invalid polarity enum value fails for fact entities
    Props = [id='FACT-INVALID', title="Invalid polarity", status=active, created_at="2024-01-01", updated_at="2024-01-01", source="facts/FACT-INVALID.md", fact_kind=property_value, subject_key="user", property_key="name", operator=eq, value_type=string, value_string="test", polarity=maybe],
    \+ validate_entity(fact, Props).

test(observation_fact_invalid_optional_enum_invalid) :-
    % Observation facts may omit strict fields, but any provided enums must still be valid
    Props = [id='FACT-OBS-INVALID', title="Observation invalid enum", status=active, created_at="2024-01-01", updated_at="2024-01-01", source="facts/FACT-OBS-INVALID.md", fact_kind=observation, subject_key="system.sessions", operator=contains],
    \+ validate_entity(fact, Props).

test(valid_polarity_require) :-
    % Valid polarity=require is accepted
    Props = [id='FACT-REQ', title="Required polarity", status=active, created_at="2024-01-01", updated_at="2024-01-01", source="facts/FACT-REQ.md", fact_kind=property_value, subject_key="user", property_key="name", operator=eq, value_type=string, value_string="test", polarity=require],
    validate_entity(fact, Props).

test(valid_polarity_forbid) :-
    % Valid polarity=forbid is accepted
    Props = [id='FACT-FORBID', title="Forbidden polarity", status=active, created_at="2024-01-01", updated_at="2024-01-01", source="facts/FACT-FORBID.md", fact_kind=property_value, subject_key="user", property_key="name", operator=eq, value_type=string, value_string="test", polarity=forbid],
    validate_entity(fact, Props).

test(property_value_with_assert_polarity_invalid) :-
    Props = [id='FACT-ASSERT-PROP', title="Invalid assert polarity", status=active, created_at="2024-01-01", updated_at="2024-01-01", source="facts/FACT-ASSERT-PROP.md", fact_kind=property_value, subject_key="user", property_key="name", operator=eq, value_type=string, value_string="test", polarity=assert],
    \+ validate_entity(fact, Props).

% Strict-lane pairing validation tests for constrains/requires_property

:- dynamic test_subject_fact/1.
:- dynamic test_property_fact/1.

setup_strict_lane_tests :-
    retractall(test_subject_fact(_)),
    retractall(test_property_fact(_)),
    assert(test_subject_fact([id='FACT-SUBJECT-SL', title="Test subject", status=active, created_at="2024-01-01", updated_at="2024-01-01", source="test", fact_kind=subject, subject_key="test.subject"])),
    assert(test_property_fact([id='FACT-PROP-SL', title="Test property", status=active, created_at="2024-01-01", updated_at="2024-01-01", source="test", fact_kind=property_value, subject_key="test.subject", property_key="value", operator=eq, value_type=string, value_string="test"])).

test(constrains_to_subject_fact_valid, [setup(setup_strict_lane_tests)]) :-
    test_subject_fact(Props),
    validate_entity(fact, Props).

test(requires_property_to_property_value_fact_valid, [setup(setup_strict_lane_tests)]) :-
    test_property_fact(Props),
    validate_entity(fact, Props).

:- end_tests(schema).
