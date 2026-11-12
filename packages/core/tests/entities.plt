:- use_module(library(plunit)).
:- use_module('../schema/entities.pl').

% Pins the entity schema tables. A clause of entity_property/3 whose type
% is a variable applies to every entity type, written here as `any`.

:- begin_tests(entities).

any_type(Type, Shown) :-
    (   var(Type) -> Shown = any ; Shown = Type ).

test(entity_types) :-
    findall(Type, entity_type(Type), Types),
    Types == [req, scenario, test, adr, flag, event, symbol, fact].

test(entity_properties) :-
    findall(Shown-Property-Kind, (entity_property(Type, Property, Kind), any_type(Type, Shown)), Rows),
    expected_entity_properties(Expected),
    Rows == Expected.

test(required_properties) :-
    findall(Type-Property, required_property(Type, Property), Rows),
    findall(Type-Property,
            ( member(Property, [id, title, status, created_at, updated_at, source]),
              member(Type, [req, scenario, test, adr, flag, event, symbol, fact])
            ),
            Expected),
    Rows == Expected.

test(required_property_rejects_unknown_type, [fail]) :-
    required_property(nonsense, _).

test(optional_properties) :-
    findall(Type-Property, optional_property(Type, Property), Rows),
    findall(Type-Property,
            ( member(Property, [tags, owner, priority, severity, links, text_ref, origin]),
              member(Type, [req, scenario, test, adr, flag, event, symbol, fact])
            ),
            Shared),
    expected_specific_optional(Specific),
    append(Shared, Specific, Expected),
    Rows == Expected.

test(optional_property_rejects_unknown_type, [fail]) :-
    optional_property(nonsense, tags).

:- end_tests(entities).

expected_entity_properties([
    any-id-atom,
    any-title-string,
    any-status-atom,
    any-created_at-datetime,
    any-updated_at-datetime,
    any-source-uri,
    any-tags-list,
    any-owner-atom,
    any-priority-atom,
    any-severity-atom,
    any-links-list,
    any-text_ref-uri,
    any-sourceFile-workspace_relpath,
    any-origin-list_or_json,
    req-semantic_text-string,
    req-logic_claims-list,
    req-semantic_clauses-list,
    req-semantic_inventory_version-string,
    req-semantic_source_field-string,
    req-semantic_source_hash-string,
    req-semantic_inventory-list_or_json,
    req-proof_exempt-boolean,
    req-proof_exempt_reason-string,
    req-retired_reason-string,
    req-approved_by-string,
    req-approval_ref-string,
    req-failure_side_waiver-string,
    req-failure_side_waiver_approved_by-string,
    req-rationale-string,
    req-exempts_claims-list,
    req-firmness-atom,
    adr-firmness-atom,
    req-required_evidence-atom,
    scenario-expects-atom,
    fact-fact_kind-atom,
    fact-subject_key-string,
    fact-property_key-string,
    fact-operator-atom,
    fact-value_type-atom,
    fact-value_string-string,
    fact-value_int-integer,
    fact-value_number-number,
    fact-value_bool-boolean,
    fact-value_set-list,
    fact-unit-string,
    fact-scope-string,
    fact-polarity-atom,
    fact-closed_world-boolean,
    fact-valid_from-datetime,
    fact-valid_to-datetime,
    fact-canonical_key-string,
    fact-claim_key-string,
    fact-claim_text-string,
    fact-dimension_waiver-string,
    fact-dimension_waiver_approved_by-string,
    fact-case_waiver-string,
    fact-case_waiver_approved_by-string,
    fact-predicate_name-string,
    fact-predicate_namespace-string,
    fact-predicate_arity-integer,
    fact-argument_names-list,
    fact-argument_types-list,
    fact-argument_descriptions-list,
    fact-key_arguments-list,
    fact-argument_constants-string,
    fact-argument_aliases-string,
    fact-aliases-list,
    fact-examples-list,
    fact-predicate_args-list,
    fact-rule_ir-string,
    fact-rule_hash-string,
    fact-rule_schema_id-atom_or_string,
    fact-rule_name-string,
    fact-semantic_key-string,
    fact-claim_span_start-integer,
    fact-claim_span_end-integer,
    symbol-symbol_role-atom,
    symbol-granularity_reason-atom,
    symbol-sourceLine-integer,
    symbol-sourceColumn-integer,
    symbol-sourceEndLine-integer,
    symbol-sourceEndColumn-integer,
    test-verification_scope-atom,
    test-verification_perspective-atom,
    test-proof_contract-list_or_json,
    test-proof_bindings-string,
    test-proof_receipts-string
]).

expected_specific_optional([
    req-semantic_text,
    req-logic_claims,
    req-semantic_clauses,
    req-semantic_inventory_version,
    req-semantic_source_field,
    req-semantic_source_hash,
    req-semantic_inventory,
    req-proof_exempt,
    req-proof_exempt_reason,
    req-retired_reason,
    req-failure_side_waiver,
    req-failure_side_waiver_approved_by,
    req-approved_by,
    req-approval_ref,
    req-rationale,
    req-exempts_claims,
    req-firmness,
    adr-firmness,
    req-required_evidence,
    test-verification_scope,
    test-verification_perspective,
    test-proof_contract,
    test-proof_bindings,
    test-proof_receipts
]).
