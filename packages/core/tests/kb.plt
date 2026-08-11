% PLUnit test suite for kb.pl
:- use_module('../src/kb.pl').
:- use_module('../src/checks.pl').
:- use_module('../src/discovery.pl').
:- use_module('../src/derived_chr.pl').
:- use_module('../src/sparql_client.pl').
:- use_module(library(http/json)).
:- use_module(library(plunit)).
:- use_module(library(semweb/rdf11)).
:- use_module(library(filesex)).

:- multifile user:term_expansion/2.

% Many KB predicates are graph queries that intentionally remain nondeterministic
% for callers that want all matching entities, relationships, or violations. These
% tests assert specific observable results and do not depend on exhausting every
% alternative, so PLUnit should not warn about the intentionally open choicepoints.
user:term_expansion((test(Name) :- Body), (test(Name, [nondet]) :- Body)).
user:term_expansion((test(Name, Options0) :- Body), (test(Name, Options) :- Body)) :-
    is_list(Options0),
    (   memberchk(nondet, Options0)
    ->  Options = Options0
    ;   Options = [nondet|Options0]
    ).

% Test KB directory
test_kb_dir('/tmp/kibi-test-kb').

:- begin_tests(kb_basic).

test(attach_detach_cycle, [setup(cleanup_test_kb), cleanup(cleanup_test_kb)]) :-
    test_kb_dir(Dir),
    kb_attach(Dir),
    kb_detach.

test(attach_creates_directory, [setup(cleanup_test_kb), cleanup(cleanup_test_kb)]) :-
    test_kb_dir(Dir),
    \+ exists_directory(Dir),
    kb_attach(Dir),
    exists_directory(Dir),
    kb_detach.

:- end_tests(kb_basic).

:- begin_tests(kb_entities).

test(assert_and_query_entity, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(req, [
        id='test-req-1',
        title="Test Requirement",
        status=draft,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_entity('test-req-1', Type, Props),
    assertion(Type == req),
    % Check title property exists with RDF literal format
    memberchk(title=TitleVal, Props),
    assertion(TitleVal = ^^("Test Requirement", _)).

test(semantic_inventory_json_round_trips_without_prolog_list_coercion, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    InventoryJson = "[{\"claim_key\":\"CLAIM-ABCDEF0123456789\",\"claim_text\":\"A stable claim\",\"role\":\"normative\",\"status\":\"modeled\",\"span\":{\"start\":0,\"end\":14}}]",
    kb_assert_entity(req, [
        id='test-req-inventory',
        title="Inventory round trip",
        status=active,
        created_at="2026-08-10T00:00:00Z",
        updated_at="2026-08-10T00:00:00Z",
        source="test://kb.plt",
        semantic_inventory=InventoryJson
    ]),
    kb_entity('test-req-inventory', req, Props),
    memberchk(semantic_inventory=StoredJson, Props),
    assertion((atom(StoredJson) ; string(StoredJson))),
    (atom(StoredJson) -> JsonAtom = StoredJson ; atom_string(JsonAtom, StoredJson)),
    atom_json_dict(JsonAtom, Entries, [value_string_as(string)]),
    Entries = [Entry],
    get_dict(claim_key, Entry, ClaimKey),
    get_dict(span, Entry, Span),
    get_dict(end, Span, End),
    assertion(ClaimKey == "CLAIM-ABCDEF0123456789"),
    assertion(End == 14).

test(requirement_semantic_text_is_typed_and_req_only, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(req, [
        id='test-req-semantic-text',
        title="Independent semantic prose",
        status=active,
        created_at="2026-08-11T00:00:00Z",
        updated_at="2026-08-11T00:00:00Z",
        source="test://kb.plt",
        text_ref="src/policy.ts:42",
        semantic_text="The policy must retain authored prose.",
        semantic_source_field="semantic_text"
    ]),
    kb_entity('test-req-semantic-text', req, Props),
    memberchk(text_ref=TextRef, Props),
    memberchk(semantic_text=SemanticText, Props),
    assertion(TextRef = ^^("src/policy.ts:42", _)),
    assertion(SemanticText = ^^("The policy must retain authored prose.", _)),
    \+ kb_assert_entity(scenario, [
        id='test-scen-semantic-text',
        title="Invalid semantic source owner",
        status=active,
        created_at="2026-08-11T00:00:00Z",
        updated_at="2026-08-11T00:00:00Z",
        source="test://kb.plt",
        semantic_text="Requirement-only prose."
    ]).

test(retract_entity, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(req, [
        id='test-req-2',
        title="To Be Deleted",
        status=draft,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_entity('test-req-2', _, _),
    kb_retract_entity('test-req-2'),
    \+ kb_entity('test-req-2', _, _).

test(entity_validation_error, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    % Missing required property 'title' - should fail
    \+ kb_assert_entity(req, [
        id='test-req-3',
        status=draft,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    % Verify entity was NOT created
    \+ kb_entity('test-req-3', _, _).

:- end_tests(kb_entities).

:- begin_tests(kb_relationships).

test(assert_and_query_relationship, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    % Create two entities
    kb_assert_entity(req, [
        id='test-req-a',
        title="Requirement A",
        status=draft,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(req, [
        id='test-req-b',
        title="Requirement B",
        status=draft,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    % Create relationship
    kb_assert_relationship(depends_on, 'test-req-a', 'test-req-b', []),
    % Query relationship
    kb_relationship(depends_on, 'test-req-a', 'test-req-b').

test(reverse_lookup_with_bound_to_id, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(req, [
        id='REQ-REV',
        title="Reverse lookup requirement",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(test, [
        id='TEST-REV',
        title="Reverse lookup test",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_relationship(verified_by, 'REQ-REV', 'TEST-REV', []),
    kb_relationship(verified_by, 'REQ-REV', 'TEST-REV'),
    kb_relationship(verified_by, Req, 'TEST-REV'),
    assertion(Req == 'REQ-REV'),
    findall(From, kb_relationship(verified_by, From, 'TEST-REV'), Sources),
    assertion(Sources == ['REQ-REV']).

:- end_tests(kb_relationships).

:- begin_tests(kb_persistence).

test(journal_persistence, [setup(cleanup_test_kb), cleanup(cleanup_test_kb)]) :-
    test_kb_dir(Dir),
    % First session: attach, add entity, detach
    kb_attach(Dir),
    kb_assert_entity(req, [
        id='persistent-req',
        title="Persistent Entity",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_save,
    kb_detach,
    % Second session: reattach and verify
    kb_attach(Dir),
    kb_entity('persistent-req', Type, Props),
    assertion(Type == req),
    memberchk(title=TitleVal, Props),
    assertion(TitleVal = ^^("Persistent Entity", _)),
    kb_detach.

:- end_tests(kb_persistence).

:- begin_tests(kb_source_queries).

test(matches_source_file_field, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(symbol, [
        id='sym-source-file',
        title="Source file symbol",
        status=active,
        created_at="2026-04-24T00:00:00Z",
        updated_at="2026-04-24T00:00:00Z",
        source="documentation/symbols.yaml#sym-source-file",
        sourceFile="packages/opencode/src/brief-intent.ts"
    ]),
    kb_entities_by_source('packages/opencode/src/brief-intent.ts', Ids),
    memberchk('sym-source-file', Ids).

test(falls_back_to_legacy_source_field, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(symbol, [
        id='sym-legacy-source',
        title="Legacy source symbol",
        status=active,
        created_at="2026-04-24T00:00:00Z",
        updated_at="2026-04-24T00:00:00Z",
        source="brief.md#4.3"
    ]),
    kb_entities_by_source('brief.md', Ids),
    memberchk('sym-legacy-source', Ids).

test(prefers_source_file_over_legacy_source, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(symbol, [
        id='sym-both-source-fields',
        title="Dual source symbol",
        status=active,
        created_at="2026-04-24T00:00:00Z",
        updated_at="2026-04-24T00:00:00Z",
        sourceFile="packages/opencode/src/brief-intent.ts",
        source="documentation/brief.md#4.3"
    ]),
    kb_entities_by_source('packages/opencode/src/brief-intent.ts', Ids),
    memberchk('sym-both-source-fields', Ids),
    kb_entities_by_source('documentation/brief.md', LegacyIds),
    \+ memberchk('sym-both-source-fields', LegacyIds).

test(accepts_symbol_metadata_fields, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(symbol, [
        id='sym-metadata-fields',
        title="Symbol metadata fields",
        status=active,
        created_at="2026-06-25T00:00:00Z",
        updated_at="2026-06-25T00:00:00Z",
        source="documentation/symbols.yaml#sym-metadata-fields",
        sourceFile="packages/cli/src/public/impact/analyzer.ts",
        symbol_role=behavioral,
        granularity_reason='module-level-behavior'
    ]),
    kb_entity('sym-metadata-fields', symbol, Props),
    memberchk(symbol_role=Role, Props),
    memberchk(granularity_reason=Reason, Props),
    assertion(Role = ^^("behavioral", _)),
    assertion(Reason = ^^("module-level-behavior", _)).

:- end_tests(kb_source_queries).

:- begin_tests(kb_audit).

test(audit_log_created_includes_change_kind, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(req, [
        id='audit-test',
        title="Audit Test",
        status=draft,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    changeset(_, upsert, 'audit-test', req-Props),
    memberchk(change_kind=created, Props),
    memberchk(title="Audit Test", Props).

test(audit_log_update_includes_change_kind, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(req, [
        id='audit-update-test',
        title="Audit Test v1",
        status=draft,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(req, [
        id='audit-update-test',
        title="Audit Test v2",
        status=draft,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-18T00:00:00Z",
        source="test://kb.plt"
    ]),
    findall(Props, changeset(_, upsert, 'audit-update-test', req-Props), PropsList),
    length(PropsList, 2),
    once((
        select(CreatedProps, PropsList, [UpdatedProps]),
        memberchk(change_kind=created, CreatedProps),
        memberchk(change_kind=updated, UpdatedProps)
    )),
    memberchk(title="Audit Test v2", UpdatedProps).

test(delete_audit_preserves_typed_metadata, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(req, [
        id='audit-delete-test',
        title="Audit Delete Test",
        status=draft,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt",
        text_ref="documentation/requirements/REQ-AUDIT.md#L10",
        semantic_text="Deletion must retain semantic audit metadata."
    ]),
    kb_retract_entity('audit-delete-test'),
    changeset(_, delete, 'audit-delete-test', req-Props),
    memberchk(id='audit-delete-test', Props),
    memberchk(title="Audit Delete Test", Props),
    memberchk(source="test://kb.plt", Props),
    memberchk(text_ref="documentation/requirements/REQ-AUDIT.md#L10", Props),
    memberchk(semantic_text="Deletion must retain semantic audit metadata.", Props).

:- end_tests(kb_audit).

:- begin_tests(kb_atomic_upsert).

test(commit_upsert_persists_entity_relationship_audits_and_snapshot,
     [setup(cleanup_test_kb), cleanup(cleanup_test_kb)]) :-
    test_kb_dir(Dir),
    kb_attach(Dir),
    kb_assert_entity(req, [
        id='commit-source',
        title="Commit source",
        status=active,
        created_at="2026-08-11T00:00:00Z",
        updated_at="2026-08-11T00:00:00Z",
        source="test://atomic-upsert"
    ]),
    kb_assert_entity(test, [
        id='commit-target',
        title="Commit target",
        status=active,
        created_at="2026-08-11T00:00:00Z",
        updated_at="2026-08-11T00:00:00Z",
        source="test://atomic-upsert"
    ]),
    kb_save,
    kb_commit_upsert(req, [
        id='commit-new',
        title="Committed requirement",
        status=active,
        created_at="2026-08-11T00:00:00Z",
        updated_at="2026-08-11T00:00:00Z",
        source="test://atomic-upsert"
    ], [rel(verified_by, 'commit-new', 'commit-target', [])], false, Kind),
    assertion(Kind == created),
    kb_entity('commit-new', req, _),
    kb_relationship(verified_by, 'commit-new', 'commit-target'),
    changeset(_, upsert, 'commit-new', req-EntityProps),
    memberchk(change_kind=created, EntityProps),
    changeset(_, upsert_rel, 'commit-new->commit-target', verified_by-RelProps),
    memberchk(from='commit-new', RelProps),
    memberchk(to='commit-target', RelProps),
    atom_concat(Dir, '/kb.rdf', DataFile),
    exists_file(DataFile),
    kb_detach,
    kb_attach(Dir),
    kb_entity('commit-new', req, _),
    kb_relationship(verified_by, 'commit-new', 'commit-target'),
    kb_detach.

test(commit_upsert_classifies_historical_entity_as_updated,
     [setup(cleanup_test_kb), cleanup(cleanup_test_kb)]) :-
    test_kb_dir(Dir),
    kb_attach(Dir),
    kb_assert_entity(req, [
        id='commit-existing',
        title="Before commit",
        status=active,
        created_at="2026-08-11T00:00:00Z",
        updated_at="2026-08-11T00:00:00Z",
        source="test://atomic-upsert"
    ]),
    kb_save,
    kb_detach,
    kb_attach(Dir),
    kb_commit_upsert(req, [
        id='commit-existing',
        title="After commit",
        status=active,
        created_at="2026-08-11T00:00:00Z",
        updated_at="2026-08-11T01:00:00Z",
        source="test://atomic-upsert"
    ], [], false, Kind),
    assertion(Kind == updated),
    changeset(_, upsert, 'commit-existing', req-Props),
    memberchk(change_kind=updated, Props),
    memberchk(title="After commit", Props),
    kb_detach,
    kb_attach(Dir),
    kb_entity('commit-existing', req, PropsAfter),
    memberchk(title=TitleAfter, PropsAfter),
    assertion(TitleAfter = ^^("After commit", _)),
    kb_detach.

:- end_tests(kb_atomic_upsert).

:- begin_tests(kb_strict_facts).

test(typed_literal_value_type_no_false_positive, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(fact, [
        id='fact-typed-vt-test',
        title="Typed VT regression",
        status=active,
        created_at="2026-04-24T00:00:00Z",
        updated_at="2026-04-24T00:00:00Z",
        source="test",
        fact_kind=property_value,
        subject_key="session",
        property_key="max_age",
        operator=eq,
        value_type='int',
        value_int=30
    ]),
    check_strict_fact_shape(Violations),
    \+ member(violation('strict-fact-shape', 'fact-typed-vt-test', _, _, _), Violations).

test(predicate_facts_have_no_strict_shape_false_positive, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    assert_fixture_entity(fact, 'FACT-SCHEMA-CAN', "Predicate schema: auth.can/3", active, [
        fact_kind=predicate_schema,
        predicate_name="can",
        predicate_namespace="auth",
        predicate_arity=3,
        argument_names=["actor", "action", "resource"],
        argument_types=["role", "action", "resource"]
    ]),
    assert_fixture_entity(fact, 'FACT-CAN-USER-DELETE-POST', "User can delete post", active, [
        fact_kind=predicate,
        predicate_name="can",
        predicate_namespace="auth",
        predicate_args=["user", "delete", "post"],
        polarity=assert,
        canonical_key="auth.can.role:user.action:delete.resource:post.assert"
    ]),
    check_strict_fact_shape(Violations),
    \+ member(violation('strict-fact-shape', 'FACT-SCHEMA-CAN', _, _, _), Violations),
    \+ member(violation('strict-fact-shape', 'FACT-CAN-USER-DELETE-POST', _, _, _), Violations).

test(malformed_predicate_fact_reports_strict_shape_violation, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    assert_raw_entity(fact, 'FACT-PREDICATE-MALFORMED', [
        id='FACT-PREDICATE-MALFORMED',
        title="Malformed predicate",
        status=active,
        created_at="2026-05-30T00:00:00Z",
        updated_at="2026-05-30T00:00:00Z",
        source="test://kb.plt",
        fact_kind=predicate,
        predicate_name="can"
    ]),
    check_strict_fact_shape(Violations),
    member(violation('strict-fact-shape', 'FACT-PREDICATE-MALFORMED', Description, _, _), Violations),
    sub_string(Description, _, _, _, "Predicate fact missing required field: predicate_args").

:- end_tests(kb_strict_facts).

:- begin_tests(kb_predicate_ontology).

test(predicate_schema_helper_reads_schema_fact, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    assert_fixture_entity(fact, 'FACT-SCHEMA-CAN', "Predicate schema: auth.can/3", active, [
        fact_kind=predicate_schema,
        predicate_name="can",
        predicate_namespace="auth",
        predicate_arity=3,
        argument_names=["actor", "action", "resource"],
        argument_types=["role", "action", "resource"],
        aliases=["may", "is allowed to"],
        examples=["auth.can(user, delete, post)"]
    ]),
    predicate_schema('FACT-SCHEMA-CAN', auth, can, 3, [actor, action, resource], [role, action, resource]).

test(predicate_fact_helper_reads_ground_predicate_fact, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    assert_fixture_entity(fact, 'FACT-CAN-USER-DELETE-POST', "User can delete post", active, [
        fact_kind=predicate,
        predicate_name="can",
        predicate_namespace="auth",
        predicate_args=["user", "delete", "post"],
        argument_types=["role", "action", "resource"],
        polarity=assert,
        canonical_key="auth.can.role:user.action:delete.resource:post.assert"
    ]),
    predicate_fact('FACT-CAN-USER-DELETE-POST', auth, can, [user, delete, post], assert).

test(opposite_ground_predicate_polarities_contradict, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    assert_fixture_entity(fact, 'FACT-PUBLISH-ASSERT', "Publishing allowed", active, [
        fact_kind=predicate,
        predicate_name="permission_rule",
        predicate_namespace="default",
        predicate_args=["suspended_user", "publish", "article"],
        polarity=assert,
        canonical_key="permission_rule(suspended_user,publish,article)",
        claim_key="CLAIM-1111111111111111",
        claim_text="Suspended users may publish articles"
    ]),
    assert_fixture_entity(fact, 'FACT-PUBLISH-DENY', "Publishing denied", active, [
        fact_kind=predicate,
        predicate_name="permission_rule",
        predicate_namespace="default",
        predicate_args=["suspended_user", "publish", "article"],
        polarity=deny,
        canonical_key="permission_rule(suspended_user,publish,article)",
        claim_key="CLAIM-2222222222222222",
        claim_text="Suspended users must not publish articles"
    ]),
    assert_fixture_entity(req, 'REQ-PUBLISH-ASSERT', "Allow publishing", open, [
        logic_claims=["CLAIM-1111111111111111"]
    ]),
    assert_fixture_entity(req, 'REQ-PUBLISH-DENY', "Deny publishing", open, [
        logic_claims=["CLAIM-2222222222222222"]
    ]),
    kb_assert_relationship(requires_predicate, 'REQ-PUBLISH-ASSERT', 'FACT-PUBLISH-ASSERT', []),
    kb_assert_relationship(requires_predicate, 'REQ-PUBLISH-DENY', 'FACT-PUBLISH-DENY', []),
    contradicting_reqs('REQ-PUBLISH-ASSERT', 'REQ-PUBLISH-DENY', Reason),
    sub_string(Reason, _, _, _, "Predicate conflict"),
    req_conflict_witness('REQ-PUBLISH-ASSERT', 'REQ-PUBLISH-DENY', Witness),
    assertion(Witness.kind == predicate),
    assertion(Witness.status == contradiction),
    assertion(Witness.left.factId == 'FACT-PUBLISH-ASSERT'),
    assertion(Witness.left.claimKey == 'CLAIM-1111111111111111'),
    assertion(Witness.left.term.polarity == assert),
    assertion(Witness.right.factId == 'FACT-PUBLISH-DENY'),
    assertion(Witness.right.claimKey == 'CLAIM-2222222222222222'),
    assertion(Witness.right.term.polarity == deny),
    assertion(Witness.predicateArgs == [suspended_user, publish, article]).

test(logic_coverage_requires_every_declared_claim_to_be_grounded, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    assert_fixture_entity(req, 'REQ-LOGIC-COVERAGE', "Compound requirement", open, [
        logic_claims=["CLAIM-3333333333333333", "CLAIM-4444444444444444"]
    ]),
    assert_fixture_entity(fact, 'FACT-LOGIC-COVERED', "Covered predicate", active, [
        fact_kind=predicate,
        predicate_name="dependency_rule",
        predicate_args=["checkout", "payment", "submission"],
        polarity=assert,
        canonical_key="dependency_rule(checkout,payment,submission)",
        claim_key="CLAIM-3333333333333333",
        claim_text="Checkout requires payment before submission"
    ]),
    kb_assert_relationship(requires_predicate, 'REQ-LOGIC-COVERAGE', 'FACT-LOGIC-COVERED', []),
    check_logic_coverage(Violations),
    member(violation('logic-coverage', 'REQ-LOGIC-COVERAGE', Description, _, _), Violations),
    sub_string(Description, _, _, _, "CLAIM-4444444444444444").

test(logic_coverage_accepts_complete_ground_manifest, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    assert_fixture_entity(req, 'REQ-LOGIC-COMPLETE', "Complete requirement", open, [
        logic_claims=["CLAIM-5555555555555555"]
    ]),
    assert_fixture_entity(fact, 'FACT-LOGIC-COMPLETE', "Ground predicate", active, [
        fact_kind=predicate,
        predicate_name="dependency_rule",
        predicate_args=["checkout", "payment", "submission"],
        polarity=assert,
        canonical_key="dependency_rule(checkout,payment,submission)",
        claim_key="CLAIM-5555555555555555",
        claim_text="Checkout requires payment before submission"
    ]),
    kb_assert_relationship(requires_predicate, 'REQ-LOGIC-COMPLETE', 'FACT-LOGIC-COMPLETE', []),
    check_logic_coverage(Violations),
    \+ member(violation('logic-coverage', 'REQ-LOGIC-COMPLETE', _, _, _), Violations).

test(logic_coverage_rejects_multiple_ground_facts_for_one_claim, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    assert_fixture_entity(req, 'REQ-LOGIC-DUPLICATE-CLAIM', "Duplicate claim", open, [
        logic_claims=["CLAIM-7777777777777777"]
    ]),
    assert_fixture_entity(fact, 'FACT-LOGIC-DUPLICATE-A', "First ground predicate", active, [
        fact_kind=predicate,
        predicate_name="dependency_rule",
        predicate_args=["checkout", "payment", "submission"],
        polarity=assert,
        canonical_key="dependency_rule(checkout,payment,submission)",
        claim_key="CLAIM-7777777777777777",
        claim_text="Checkout requires payment before submission"
    ]),
    assert_fixture_entity(fact, 'FACT-LOGIC-DUPLICATE-B', "Second ground predicate", active, [
        fact_kind=predicate,
        predicate_name="temporal_order",
        predicate_args=["checkout", "payment", "submission"],
        polarity=assert,
        canonical_key="temporal_order(checkout,payment,submission)",
        claim_key="CLAIM-7777777777777777",
        claim_text="Checkout requires payment before submission"
    ]),
    kb_assert_relationship(requires_predicate, 'REQ-LOGIC-DUPLICATE-CLAIM', 'FACT-LOGIC-DUPLICATE-A', []),
    kb_assert_relationship(requires_predicate, 'REQ-LOGIC-DUPLICATE-CLAIM', 'FACT-LOGIC-DUPLICATE-B', []),
    check_logic_coverage(Violations),
    member(violation('logic-coverage', 'REQ-LOGIC-DUPLICATE-CLAIM', Description, _, _), Violations),
    sub_string(Description, _, _, _, "more than once").

test(logic_coverage_rejects_duplicate_terms_with_distinct_claim_keys, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    assert_fixture_entity(req, 'REQ-LOGIC-DUPLICATE-TERM', "Duplicate term", open, [
        logic_claims=["CLAIM-8888888888888888", "CLAIM-9999999999999999"]
    ]),
    assert_fixture_entity(fact, 'FACT-LOGIC-TERM-A', "First wording", active, [
        fact_kind=predicate,
        predicate_name="dependency_rule",
        predicate_args=["checkout", "payment", "submission"],
        polarity=assert,
        canonical_key="dependency_rule(checkout,payment,submission)",
        claim_key="CLAIM-8888888888888888",
        claim_text="Checkout requires payment before submission"
    ]),
    assert_fixture_entity(fact, 'FACT-LOGIC-TERM-B', "Punctuation variant", active, [
        fact_kind=predicate,
        predicate_name="dependency_rule",
        predicate_args=["checkout", "payment", "submission"],
        polarity=assert,
        canonical_key="dependency_rule(checkout,payment,submission)",
        claim_key="CLAIM-9999999999999999",
        claim_text="Checkout requires payment before submission,"
    ]),
    kb_assert_relationship(requires_predicate, 'REQ-LOGIC-DUPLICATE-TERM', 'FACT-LOGIC-TERM-A', []),
    kb_assert_relationship(requires_predicate, 'REQ-LOGIC-DUPLICATE-TERM', 'FACT-LOGIC-TERM-B', []),
    check_logic_coverage(Violations),
    member(violation('logic-coverage', 'REQ-LOGIC-DUPLICATE-TERM', Description, _, _), Violations),
    sub_string(Description, _, _, _, "duplicate logical ground term").

test(logical_claim_provenance_requires_key_and_text, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    \+ assert_fixture_entity(fact, 'FACT-INCOMPLETE-CLAIM', "Incomplete logical claim", active, [
        fact_kind=predicate,
        predicate_name="dependency_rule",
        predicate_args=["checkout", "payment", "submission"],
        polarity=assert,
        canonical_key="dependency_rule(checkout,payment,submission)",
        claim_key="CLAIM-6666666666666666"
    ]),
    \+ kb_entity('FACT-INCOMPLETE-CLAIM', _, _).

:- end_tests(kb_predicate_ontology).

:- begin_tests(kb_mutex).

test(mutex_protection, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    % Spawn multiple threads asserting entities concurrently
    numlist(1, 10, Nums),
    maplist(spawn_entity_thread, Nums, Threads),
    maplist(thread_join, Threads, _),
    % Verify all 10 thread entities exist
    findall(Id, (kb_entity(Id, req, _), atom_concat('thread-req-', _, Id)), ThreadIds),
    length(ThreadIds, 10).

spawn_entity_thread(N, ThreadId) :-
    atom_concat('thread-req-', N, Id),
    atom_concat('Thread Entity ', N, TitleAtom),
    atom_string(TitleAtom, Title),
    thread_create((
        kb_assert_entity(req, [
            id=Id,
            title=Title,
            status=draft,
            created_at="2026-02-17T00:00:00Z",
            updated_at="2026-02-17T00:00:00Z",
            source="test://kb.plt"
        ])
    ), ThreadId, []).

:- end_tests(kb_mutex).

:- begin_tests(kb_inference).

% Truth-table matrix:
% - dead code = missing production ownership (`implements`) for symbol-traceability
% - untested code = missing `covered_by` evidence
% - uncovered code = `covered_by` exists but no canonical requirement/scenario path

test(transitively_implements_direct, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(req, [
        id='req-a',
        title="Req A",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt",
        priority=must
    ]),
    kb_assert_entity(symbol, [
        id='sym-a',
        title="Sym A",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_relationship(implements, 'sym-a', 'req-a', []),
    transitively_implements('sym-a', 'req-a').

test(transitively_implements_does_not_treat_coverage_as_ownership, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(req, [
        id='req-b',
        title="Req B",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt",
        priority=must
    ]),
    kb_assert_entity(test, [
        id='test-b',
        title="Test B",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(symbol, [
        id='sym-b',
        title="Sym B",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_relationship(validates, 'test-b', 'req-b', []),
    kb_assert_relationship(covered_by, 'sym-b', 'test-b', []),
    \+ transitively_implements('sym-b', 'req-b').

test(symbol_traceability_rejects_covered_by_validates_path, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(req, [
        id='req-trace-validates',
        title="Req Trace Validates",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt",
        priority=must
    ]),
    kb_assert_entity(test, [
        id='test-trace-validates',
        title="Test Trace Validates",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(symbol, [
        id='sym-trace-validates',
        title="Sym Trace Validates",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_relationship(validates, 'test-trace-validates', 'req-trace-validates', []),
    kb_assert_relationship(covered_by, 'sym-trace-validates', 'test-trace-validates', []),
    check_symbol_traceability(false, Violations),
    member(violation('symbol-traceability', 'sym-trace-validates', _, _, _), Violations).

test(symbol_traceability_rejects_covered_by_verified_by_path, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(req, [
        id='req-trace-verified',
        title="Req Trace Verified",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt",
        priority=must
    ]),
    kb_assert_entity(test, [
        id='test-trace-verified',
        title="Test Trace Verified",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(symbol, [
        id='sym-trace-verified',
        title="Sym Trace Verified",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_relationship(verified_by, 'req-trace-verified', 'test-trace-verified', []),
    kb_assert_relationship(covered_by, 'sym-trace-verified', 'test-trace-verified', []),
    check_symbol_traceability(false, Violations),
    member(violation('symbol-traceability', 'sym-trace-verified', _, _, _), Violations).

test(symbol_traceability_ignores_executable_for_path, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(test, [
        id='test-executable-only',
        title="Executable Test Only",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(symbol, [
        id='sym-executable-only',
        title="Executable Symbol Only",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_relationship(executable_for, 'sym-executable-only', 'test-executable-only', []),
    check_symbol_traceability(false, Violations),
    \+ member(violation('symbol-traceability', 'sym-executable-only', _, _, _), Violations).

test(executable_test_symbol_detects_test_code, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(test, [
        id='test-executable-helper',
        title="Executable Helper Test",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(symbol, [
        id='sym-executable-helper',
        title="Executable Helper Symbol",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_relationship(executable_for, 'sym-executable-helper', 'test-executable-helper', []),
    executable_test_symbol('sym-executable-helper').

test(production_symbol_coverage_helper_accepts_direct_req_test_fallback, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(req, [
        id='req-direct-helper',
        title="Req Direct Helper",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt",
        priority=must
    ]),
    kb_assert_entity(test, [
        id='test-direct-helper',
        title="Test Direct Helper",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(symbol, [
        id='sym-direct-helper',
        title="Sym Direct Helper",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_relationship(validates, 'test-direct-helper', 'req-direct-helper', []),
    kb_assert_relationship(covered_by, 'sym-direct-helper', 'test-direct-helper', []),
    production_symbol_covered_for_requirement('sym-direct-helper', 'req-direct-helper').

test(production_symbol_coverage_helper_accepts_verified_by_only_path, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(req, [
        id='req-verified-by',
        title="Req Verified By Only",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt",
        priority=must
    ]),
    kb_assert_entity(test, [
        id='test-verified-by',
        title="Test Verified By Only",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(symbol, [
        id='sym-verified-by',
        title="Sym Verified By Only",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_relationship(verified_by, 'req-verified-by', 'test-verified-by', []),
    kb_assert_relationship(covered_by, 'sym-verified-by', 'test-verified-by', []),
    production_symbol_covered_for_requirement('sym-verified-by', 'req-verified-by').

test(production_symbol_coverage_helper_rejects_direct_req_test_fallback_when_scenario_exists, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(req, [
        id='req-scenario-helper',
        title="Req Scenario Helper",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt",
        priority=must
    ]),
    kb_assert_entity(scenario, [
        id='scen-scenario-helper',
        title="Scenario Helper",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(test, [
        id='test-scenario-helper',
        title="Test Scenario Helper",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(symbol, [
        id='sym-scenario-helper',
        title="Sym Scenario Helper",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_relationship(specified_by, 'req-scenario-helper', 'scen-scenario-helper', []),
    kb_assert_relationship(validates, 'test-scenario-helper', 'req-scenario-helper', []),
    kb_assert_relationship(covered_by, 'sym-scenario-helper', 'test-scenario-helper', []),
    \+ production_symbol_covered_for_requirement('sym-scenario-helper', 'req-scenario-helper').

test(production_symbol_coverage_works_with_unbound_req_when_other_reqs_have_scenarios, [setup(setup_kb), cleanup(cleanup_kb), nondet]) :-
    kb_assert_entity(req, [
        id='req-with-scenario',
        title="Decoy Req With Scenario",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt",
        priority=must
    ]),
    kb_assert_entity(scenario, [
        id='scen-decoy',
        title="Decoy Scenario",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_relationship(specified_by, 'req-with-scenario', 'scen-decoy', []),
    kb_assert_entity(req, [
        id='req-fallback',
        title="Req Fallback",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt",
        priority=must
    ]),
    kb_assert_entity(test, [
        id='test-fallback',
        title="Test Fallback",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(symbol, [
        id='sym-fallback',
        title="Sym Fallback",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_relationship(verified_by, 'req-fallback', 'test-fallback', []),
    kb_assert_relationship(covered_by, 'sym-fallback', 'test-fallback', []),
    production_symbol_covered_for_requirement('sym-fallback', _),
    \+ symbol_no_req_coverage('sym-fallback', _),
    check_symbol_coverage(Violations),
    \+ member(violation('symbol-coverage', 'sym-fallback', _, _, _), Violations).

test(symbol_coverage_accepts_direct_req_test_fallback_without_scenario, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(req, [
        id='req-direct-fallback',
        title="Req Direct Fallback",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt",
        priority=must
    ]),
    kb_assert_entity(test, [
        id='test-direct-fallback',
        title="Test Direct Fallback",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(symbol, [
        id='sym-direct-fallback',
        title="Sym Direct Fallback",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_relationship(validates, 'test-direct-fallback', 'req-direct-fallback', []),
    kb_assert_relationship(covered_by, 'sym-direct-fallback', 'test-direct-fallback', []),
    check_symbol_coverage(Violations),
    \+ member(violation('symbol-coverage', 'sym-direct-fallback', _, _, _), Violations).

test(symbol_coverage_rejects_direct_req_test_fallback_when_scenario_exists, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(req, [
        id='req-scenario-fallback',
        title="Req Scenario Fallback",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt",
        priority=must
    ]),
    kb_assert_entity(scenario, [
        id='scen-scenario-fallback',
        title="Scenario Fallback",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(test, [
        id='test-scenario-fallback',
        title="Test Scenario Fallback",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(symbol, [
        id='sym-scenario-fallback',
        title="Sym Scenario Fallback",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_relationship(specified_by, 'req-scenario-fallback', 'scen-scenario-fallback', []),
    kb_assert_relationship(validates, 'test-scenario-fallback', 'req-scenario-fallback', []),
    kb_assert_relationship(covered_by, 'sym-scenario-fallback', 'test-scenario-fallback', []),
    check_symbol_coverage(Violations),
    member(violation('symbol-coverage', 'sym-scenario-fallback', _, _, _), Violations).

test(mixed_role_symbol_rejects_executable_for_and_implements, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(req, [
        id='req-mixed-role',
        title="Req Mixed Role",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(test, [
        id='test-mixed-role',
        title="Test Mixed Role",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(symbol, [
        id='sym-mixed-role',
        title="Sym Mixed Role",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_relationship(executable_for, 'sym-mixed-role', 'test-mixed-role', []),
    catch(
        kb_assert_relationship(implements, 'sym-mixed-role', 'req-mixed-role', []),
        error(validation_error(_), _),
        true
    ).

test(transitively_depends, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(req, [
        id='req-1',
        title="Req 1",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(req, [
        id='req-2',
        title="Req 2",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(req, [
        id='req-3',
        title="Req 3",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_relationship(depends_on, 'req-1', 'req-2', []),
    kb_assert_relationship(depends_on, 'req-2', 'req-3', []),
    transitively_depends('req-1', 'req-3').

test(coverage_gap_missing_both, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(req, [
        id='req-gap',
        title="Req Gap",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt",
        priority=must
    ]),
    coverage_gap('req-gap', missing_scenario_and_test).

test(untested_symbols, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(symbol, [
        id='sym-untested',
        title="Sym Untested",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    untested_symbols(Symbols),
    memberchk('sym-untested', Symbols).

test(executable_test_symbols_excluded_from_untested_symbols, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(test, [
        id='test-executable-untested',
        title="Executable Untested Test",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(symbol, [
        id='sym-executable-untested',
        title="Executable Untested Symbol",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_relationship(executable_for, 'sym-executable-untested', 'test-executable-untested', []),
    untested_symbols(Symbols),
    \+ memberchk('sym-executable-untested', Symbols),
    \+ production_symbol_untested('sym-executable-untested').

test(stale_entity, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(req, [
        id='req-old',
        title="Old Req",
        status=active,
        created_at="2020-01-01T00:00:00Z",
        updated_at="2020-01-01T00:00:00Z",
        source="test://kb.plt"
    ]),
    stale('req-old', 30).

test(orphaned_symbol, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(symbol, [
        id='sym-orphan',
        title="Sym Orphan",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    orphaned('sym-orphan').

test(executable_test_symbols_are_not_orphaned, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(test, [
        id='test-executable-orphan',
        title="Executable Orphan Test",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(symbol, [
        id='sym-executable-orphan',
        title="Executable Orphan Symbol",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_relationship(executable_for, 'sym-executable-orphan', 'test-executable-orphan', []),
    \+ orphaned('sym-executable-orphan').

test(conflicting_adrs, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(symbol, [
        id='sym-conflict',
        title="Sym Conflict",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(adr, [
        id='adr-1',
        title="ADR 1",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(adr, [
        id='adr-2',
        title="ADR 2",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_relationship(constrained_by, 'sym-conflict', 'adr-1', []),
    kb_assert_relationship(constrained_by, 'sym-conflict', 'adr-2', []),
    conflicting('adr-1', 'adr-2').

test(deprecated_still_used, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(symbol, [
        id='sym-legacy',
        title="Sym Legacy",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(adr, [
        id='adr-legacy',
        title="ADR Legacy",
        status=deprecated,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_relationship(constrained_by, 'sym-legacy', 'adr-legacy', []),
    deprecated_still_used('adr-legacy', Symbols),
    memberchk('sym-legacy', Symbols).

test(impacted_by_change, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(req, [
        id='req-main',
        title="Req Main",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(req, [
        id='req-dependent',
        title="Req Dep",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_relationship(depends_on, 'req-dependent', 'req-main', []),
    impacted_by_change('req-dependent', 'req-main').

test(affected_symbols, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(req, [
        id='req-base',
        title="Req Base",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(req, [
        id='req-child',
        title="Req Child",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(symbol, [
        id='sym-child',
        title="Sym Child",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_relationship(depends_on, 'req-child', 'req-base', []),
    kb_assert_relationship(implements, 'sym-child', 'req-child', []),
    affected_symbols('req-base', Symbols),
    memberchk('sym-child', Symbols).

test(contradicting_reqs, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(fact, [
        id='fact-user-role',
        title="User Role Assignment",
        status=active,
        created_at="2026-02-20T00:00:00Z",
        updated_at="2026-02-20T00:00:00Z",
        source="test://kb.plt",
        fact_kind=subject,
        subject_key="user.role_assignment"
    ]),
    kb_assert_entity(fact, [
        id='fact-limit-2',
        title="Maximum of Two",
        status=active,
        created_at="2026-02-20T00:00:00Z",
        updated_at="2026-02-20T00:00:00Z",
        source="test://kb.plt",
        fact_kind=property_value,
        subject_key="user.role_assignment",
        property_key="max_roles",
        operator=eq,
        value_type=int,
        value_int=2
    ]),
    kb_assert_entity(fact, [
        id='fact-limit-3',
        title="Maximum of Three",
        status=active,
        created_at="2026-02-20T00:00:00Z",
        updated_at="2026-02-20T00:00:00Z",
        source="test://kb.plt",
        fact_kind=property_value,
        subject_key="user.role_assignment",
        property_key="max_roles",
        operator=eq,
        value_type=int,
        value_int=3
    ]),
    kb_assert_entity(req, [
        id='req-role-2',
        title="Users have max 2 roles",
        status=active,
        created_at="2026-02-20T00:00:00Z",
        updated_at="2026-02-20T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(req, [
        id='req-role-3',
        title="Users have max 3 roles",
        status=active,
        created_at="2026-02-20T00:00:00Z",
        updated_at="2026-02-20T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_relationship(constrains, 'req-role-2', 'fact-user-role', []),
    kb_assert_relationship(constrains, 'req-role-3', 'fact-user-role', []),
    kb_assert_relationship(requires_property, 'req-role-2', 'fact-limit-2', []),
    kb_assert_relationship(requires_property, 'req-role-3', 'fact-limit-3', []),
    contradicting_reqs('req-role-2', 'req-role-3', _).

test(contradicting_reqs_ignores_superseded, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(fact, [
        id='fact-user-role',
        title="User Role Assignment",
        status=active,
        created_at="2026-02-20T00:00:00Z",
        updated_at="2026-02-20T00:00:00Z",
        source="test://kb.plt",
        fact_kind=subject,
        subject_key="user.role_assignment"
    ]),
    kb_assert_entity(fact, [
        id='fact-limit-2',
        title="Maximum of Two",
        status=active,
        created_at="2026-02-20T00:00:00Z",
        updated_at="2026-02-20T00:00:00Z",
        source="test://kb.plt",
        fact_kind=property_value,
        subject_key="user.role_assignment",
        property_key="max_roles",
        operator=eq,
        value_type=int,
        value_int=2
    ]),
    kb_assert_entity(fact, [
        id='fact-limit-3',
        title="Maximum of Three",
        status=active,
        created_at="2026-02-20T00:00:00Z",
        updated_at="2026-02-20T00:00:00Z",
        source="test://kb.plt",
        fact_kind=property_value,
        subject_key="user.role_assignment",
        property_key="max_roles",
        operator=eq,
        value_type=int,
        value_int=3
    ]),
    kb_assert_entity(req, [
        id='req-role-2',
        title="Users have max 2 roles",
        status=active,
        created_at="2026-02-20T00:00:00Z",
        updated_at="2026-02-20T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(req, [
        id='req-role-3',
        title="Users have max 3 roles",
        status=active,
        created_at="2026-02-20T00:00:00Z",
        updated_at="2026-02-20T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_relationship(constrains, 'req-role-2', 'fact-user-role', []),
    kb_assert_relationship(constrains, 'req-role-3', 'fact-user-role', []),
    kb_assert_relationship(requires_property, 'req-role-2', 'fact-limit-2', []),
    kb_assert_relationship(requires_property, 'req-role-3', 'fact-limit-3', []),
    kb_assert_relationship(supersedes, 'req-role-3', 'req-role-2', []),
    \+ contradicting_reqs(_, _, _).

:- end_tests(kb_inference).

:- begin_tests(kb_coverage_depth).

test(coverage_report_classifies_requirement_depths, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    seed_coverage_depth_fixture,
    coverage_report_json(req, [], true, true, 100, 0, JsonString),
    json_string_dict(JsonString, Report),
    Rows = Report.rows,
    coverage_row(Rows, 'REQ-DIRECT-E2E', DirectE2e),
    assertion(DirectE2e.coverageDepth == direct_passing_e2e),
    assertion(DirectE2e.coverage_depth == direct_passing_e2e),
    assertion(DirectE2e.coverageStatus == uncovered),
    assertion(DirectE2e.evaluated == true),
    assertion(DirectE2e.directTests == ['TEST-DIRECT-E2E']),
    assertion(DirectE2e.verificationScopes == [end_to_end]),
    coverage_row(Rows, 'REQ-SCENARIO-E2E', ScenarioE2e),
    assertion(ScenarioE2e.coverageDepth == scenario_passing_e2e),
    assertion(ScenarioE2e.scenarioTests == ['TEST-SCENARIO-E2E']),
    coverage_row(Rows, 'REQ-UNIT-ONLY', UnitOnly),
    assertion(UnitOnly.coverageDepth == unit_only),
    assertion(UnitOnly.testStatuses == [passing]),
    coverage_row(Rows, 'REQ-NONPASSING', Nonpassing),
    assertion(Nonpassing.coverageDepth == open_or_nonpassing_tests_only),
    assertion(Nonpassing.testStatuses == [failing, open]),
    coverage_row(Rows, 'REQ-SCENARIO-ONLY', ScenarioOnly),
    assertion(ScenarioOnly.coverageDepth == scenario_only_no_test),
    coverage_row(Rows, 'REQ-NO-EVIDENCE', NoEvidence),
    assertion(NoEvidence.coverageDepth == no_test_evidence),
    assertion(NoEvidence.coverageStatus == uncovered).

test(typed_verification_scope_beats_legacy_e2e_heuristics, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    assert_fixture_entity(req, 'REQ-TYPED-BEATS-LEGACY', "Typed beats legacy", active, [priority=must]),
    assert_fixture_entity(test, 'TEST-TYPED-UNIT-LEGACY-E2E', "Typed unit legacy e2e", passing, [
        verification_scope=unit,
        tags=[e2e],
        source="tests/e2e/typed-unit.test.ts"
    ]),
    kb_assert_relationship(verified_by, 'REQ-TYPED-BEATS-LEGACY', 'TEST-TYPED-UNIT-LEGACY-E2E', []),
    coverage_report_json(req, [], true, true, 100, 0, JsonString),
    json_string_dict(JsonString, Report),
    coverage_row(Report.rows, 'REQ-TYPED-BEATS-LEGACY', Row),
    assertion(Row.coverageDepth == unit_only),
    assertion(Row.verificationScopes == [unit]).

test(requirement_proof_rejects_structural_coverage_without_semantics_or_scenario_e2e, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    assert_fixture_entity(req, 'REQ-PROOF-STRUCTURAL-ONLY', "Structural coverage only", active, [priority=must]),
    assert_fixture_entity(scenario, 'SCEN-PROOF-STRUCTURAL-ONLY', "Structural scenario", active, []),
    assert_fixture_entity(test, 'TEST-PROOF-DIRECT-E2E', "Direct passing E2E", passing, [verification_scope=end_to_end]),
    kb_assert_relationship(specified_by, 'REQ-PROOF-STRUCTURAL-ONLY', 'SCEN-PROOF-STRUCTURAL-ONLY', []),
    kb_assert_relationship(verified_by, 'REQ-PROOF-STRUCTURAL-ONLY', 'TEST-PROOF-DIRECT-E2E', []),
    coverage_report_json(req, [], true, true, 100, 0, JsonString),
    json_string_dict(JsonString, Report),
    coverage_row(Report.rows, 'REQ-PROOF-STRUCTURAL-ONLY', Row),
    assertion(Row.coverageStatus == fully_covered),
    assertion(Row.proofVersion == 'kibi.requirement-proof.v2'),
    assertion(Row.proofStatus == missing),
    assertion(memberchk(missing_semantic_inventory, Row.proofGaps)),
    assertion(memberchk(missing_logic_claims, Row.proofGaps)),
    assertion(memberchk(missing_scenario_test, Row.proofGaps)),
    assertion(memberchk(missing_production_symbol, Row.proofGaps)),
    assertion(Row.proofStages.passingE2e.status == missing),
    assertion(Report.summary.proofMissing == 1),
    coverage_report_json(req, [], false, true, 100, 0, GapsJsonString),
    json_string_dict(GapsJsonString, GapsReport),
    coverage_row(GapsReport.rows, 'REQ-PROOF-STRUCTURAL-ONLY', _).

test(requirement_proof_marks_noncurrent_requirements_not_applicable, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    assert_fixture_entity(req, 'REQ-PROOF-OLD', "Superseded proof requirement", superseded, [priority=must]),
    coverage_report_json(req, [], true, true, 100, 0, JsonString),
    json_string_dict(JsonString, Report),
    coverage_row(Report.rows, 'REQ-PROOF-OLD', Row),
    assertion(Row.proofStatus == not_applicable),
    assertion(Row.proofGaps == []),
    assertion(Report.summary.proofNotApplicable == 1).

test(requirement_proof_requires_the_complete_semantic_scenario_e2e_symbol_chain, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    ClaimKey = 'CLAIM-ABCDEF0123456789',
    ClaimKeyString = "CLAIM-ABCDEF0123456789",
    Snapshot = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    verification_receipt_json(
        'TEST-PROOF-COMPLETE-E2E',
        Snapshot,
        passed,
        '2026-08-10T11:55:00Z',
        '2026-08-10T12:00:00Z',
        ReceiptJson
    ),
    Inventory = [_{
        claim_key: ClaimKey,
        claim_text: "Coverage reports expose conservative proof outcomes",
        role: normative,
        status: modeled,
        span: _{start: 0, end: 51}
    }],
    assert_fixture_entity(req, 'REQ-PROOF-COMPLETE', "Conservative requirement proof", active, [
        priority=must,
        logic_claims=[ClaimKey],
        semantic_inventory=Inventory
    ]),
    assert_fixture_entity(fact, 'FACT-PROOF-SUBJECT', "Coverage report subject", active, [
        fact_kind=subject,
        subject_key="kibi.coverage.report"
    ]),
    assert_fixture_entity(fact, 'FACT-PROOF-PROPERTY', "Proof outcome property", active, [
        fact_kind=property_value,
        subject_key="kibi.coverage.report",
        property_key="proof_outcome",
        operator=eq,
        value_type=string,
        value_string="conservative",
        claim_key=ClaimKeyString,
        claim_text="Coverage reports expose conservative proof outcomes"
    ]),
    assert_fixture_entity(scenario, 'SCEN-PROOF-COMPLETE', "Inspect a requirement proof", active, []),
    assert_fixture_entity(test, 'TEST-PROOF-COMPLETE-E2E', "Requirement proof E2E", passing, [
        verification_scope=end_to_end,
        verification_receipts=ReceiptJson
    ]),
    assert_fixture_entity(symbol, 'SYM-PROOF-PRODUCTION', "requirement_proof", active, [
        sourceFile="packages/core/src/requirement_proof.pl",
        sourceLine=10,
        sourceColumn=0,
        sourceEndLine=30,
        sourceEndColumn=1
    ]),
    assert_fixture_entity(symbol, 'SYM-PROOF-E2E', "requirement proof E2E test", active, [
        sourceFile="packages/core/tests/kb.plt",
        sourceLine=1300,
        sourceColumn=0,
        sourceEndLine=1340,
        sourceEndColumn=1
    ]),
    kb_assert_relationship(constrains, 'REQ-PROOF-COMPLETE', 'FACT-PROOF-SUBJECT', []),
    kb_assert_relationship(requires_property, 'REQ-PROOF-COMPLETE', 'FACT-PROOF-PROPERTY', []),
    kb_assert_relationship(specified_by, 'REQ-PROOF-COMPLETE', 'SCEN-PROOF-COMPLETE', []),
    kb_assert_relationship(verified_by, 'SCEN-PROOF-COMPLETE', 'TEST-PROOF-COMPLETE-E2E', []),
    kb_assert_relationship(implements, 'SYM-PROOF-PRODUCTION', 'REQ-PROOF-COMPLETE', []),
    kb_assert_relationship(covered_by, 'SYM-PROOF-PRODUCTION', 'TEST-PROOF-COMPLETE-E2E', []),
    kb_assert_relationship(executable_for, 'SYM-PROOF-E2E', 'TEST-PROOF-COMPLETE-E2E', []),
    coverage_report_json(req, [], true, true, 100, 0, Snapshot, '2026-08-10T12:05:00Z', 604800, JsonString),
    json_string_dict(JsonString, Report),
    coverage_row(Report.rows, 'REQ-PROOF-COMPLETE', Row),
    assertion(Row.testCount == 1),
    assertion(Row.proofStatus == proven),
    assertion(Row.proofGaps == []),
    assertion(Row.proofStages.semanticInventory.status == passed),
    assertion(Row.proofStages.logicGrounding.status == passed),
    assertion(Row.proofStages.contradictions.outcome == no_conflict_found),
    assertion(Row.proofStages.passingE2e.tests == ['TEST-PROOF-COMPLETE-E2E']),
    Row.proofStages.passingE2e.receiptEvidence = [ReceiptEvidence],
    assertion(ReceiptEvidence.state == passed),
    assertion(ReceiptEvidence.codeSnapshot == Snapshot),
    assertion(ReceiptEvidence.command == 'bun test packages/core/tests/kb.plt'),
    assertion(Row.proofStages.executableSymbols.symbols == ['SYM-PROOF-E2E']),
    assertion(Row.proofStages.productionSymbols.symbols == ['SYM-PROOF-PRODUCTION']),
    assertion(Row.proofStages.sourceCoordinates.status == passed),
    assertion(Report.summary.proofProven == 1),
    assert_fixture_entity(fact, 'FACT-PROOF-PROPERTY', "Proof outcome property", active, [
        fact_kind=property_value,
        subject_key="kibi.coverage.report",
        property_key="proof_outcome",
        operator=eq,
        value_type=string,
        value_string="conservative",
        claim_key=ClaimKeyString,
        claim_text="A different proposition with a reused key"
    ]),
    coverage_report_json(req, [], true, true, 100, 0, Snapshot, '2026-08-10T12:05:00Z', 604800, MismatchJsonString),
    json_string_dict(MismatchJsonString, MismatchReport),
    coverage_row(MismatchReport.rows, 'REQ-PROOF-COMPLETE', MismatchRow),
    assertion(MismatchRow.proofStatus == unresolved),
    assertion(MismatchRow.proofStages.logicGrounding.claimTextMismatchClaims == [ClaimKey]),
    assertion(memberchk(ambiguous_logic_grounding, MismatchRow.proofGaps)).

test(requirement_proof_receipts_are_snapshot_bound_fresh_and_outcome_sensitive, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    Snapshot = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    OtherSnapshot = 'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
    assert_fixture_entity(req, 'REQ-PROOF-RECEIPTS', "Receipt-sensitive proof", active, [priority=must]),
    assert_fixture_entity(scenario, 'SCEN-PROOF-RECEIPTS', "Inspect receipt evidence", active, []),
    assert_fixture_entity(test, 'TEST-PROOF-RECEIPTS', "Receipt-sensitive E2E", passing, [verification_scope=end_to_end]),
    kb_assert_relationship(specified_by, 'REQ-PROOF-RECEIPTS', 'SCEN-PROOF-RECEIPTS', []),
    kb_assert_relationship(verified_by, 'SCEN-PROOF-RECEIPTS', 'TEST-PROOF-RECEIPTS', []),
    coverage_report_json(req, [], true, true, 100, 0, Snapshot, '2026-08-10T12:05:00Z', 604800, MissingJson),
    json_string_dict(MissingJson, MissingReport),
    coverage_row(MissingReport.rows, 'REQ-PROOF-RECEIPTS', MissingRow),
    assertion(MissingRow.proofStages.passingE2e.missingReceiptTests == ['TEST-PROOF-RECEIPTS']),
    assertion(memberchk(missing_verification_receipt, MissingRow.proofGaps)),

    verification_receipt_json('TEST-PROOF-RECEIPTS', OtherSnapshot, passed, '2026-08-10T11:55:00Z', '2026-08-10T12:00:00Z', StaleJson),
    assert_fixture_entity(test, 'TEST-PROOF-RECEIPTS', "Receipt-sensitive E2E", passing, [verification_scope=end_to_end, verification_receipts=StaleJson]),
    coverage_report_json(req, [], true, true, 100, 0, Snapshot, '2026-08-10T12:05:00Z', 604800, StaleReportJson),
    json_string_dict(StaleReportJson, StaleReport),
    coverage_row(StaleReport.rows, 'REQ-PROOF-RECEIPTS', StaleRow),
    assertion(StaleRow.proofStages.passingE2e.staleReceiptTests == ['TEST-PROOF-RECEIPTS']),
    assertion(memberchk(stale_verification_receipt, StaleRow.proofGaps)),

    verification_receipt_json('TEST-PROOF-RECEIPTS', Snapshot, failed, '2026-08-10T11:55:00Z', '2026-08-10T12:00:00Z', FailedJson),
    assert_fixture_entity(test, 'TEST-PROOF-RECEIPTS', "Receipt-sensitive E2E", passing, [verification_scope=end_to_end, verification_receipts=FailedJson]),
    coverage_report_json(req, [], true, true, 100, 0, Snapshot, '2026-08-10T12:05:00Z', 604800, FailedReportJson),
    json_string_dict(FailedReportJson, FailedReport),
    coverage_row(FailedReport.rows, 'REQ-PROOF-RECEIPTS', FailedRow),
    assertion(FailedRow.proofStages.passingE2e.failedReceiptTests == ['TEST-PROOF-RECEIPTS']),
    assertion(memberchk(failed_verification_receipt, FailedRow.proofGaps)),

    verification_receipt_json('TEST-PROOF-RECEIPTS', Snapshot, passed, '2026-08-10T12:15:00Z', '2026-08-10T12:20:01Z', FutureJson),
    assert_fixture_entity(test, 'TEST-PROOF-RECEIPTS', "Receipt-sensitive E2E", passing, [verification_scope=end_to_end, verification_receipts=FutureJson]),
    coverage_report_json(req, [], true, true, 100, 0, Snapshot, '2026-08-10T12:05:00Z', 604800, FutureReportJson),
    json_string_dict(FutureReportJson, FutureReport),
    coverage_row(FutureReport.rows, 'REQ-PROOF-RECEIPTS', FutureRow),
    assertion(FutureRow.proofStages.passingE2e.invalidReceiptTests == ['TEST-PROOF-RECEIPTS']),
    assertion(memberchk(invalid_verification_receipt, FutureRow.proofGaps)),

    verification_receipt_json('TEST-PROOF-RECEIPTS', Snapshot, passed, '2026-08-10', '2026-08-10', DateOnlyJson),
    assert_fixture_entity(test, 'TEST-PROOF-RECEIPTS', "Receipt-sensitive E2E", passing, [verification_scope=end_to_end, verification_receipts=DateOnlyJson]),
    coverage_report_json(req, [], true, true, 100, 0, Snapshot, '2026-08-10T12:05:00Z', 604800, DateOnlyReportJson),
    json_string_dict(DateOnlyReportJson, DateOnlyReport),
    coverage_row(DateOnlyReport.rows, 'REQ-PROOF-RECEIPTS', DateOnlyRow),
    assertion(DateOnlyRow.proofStages.passingE2e.invalidReceiptTests == ['TEST-PROOF-RECEIPTS']),

    verification_receipt_json_with_id('bad-id', 'TEST-PROOF-RECEIPTS', Snapshot, passed, '2026-08-10T11:55:00Z', '2026-08-10T12:00:00Z', BadIdJson),
    assert_fixture_entity(test, 'TEST-PROOF-RECEIPTS', "Receipt-sensitive E2E", passing, [verification_scope=end_to_end, verification_receipts=BadIdJson]),
    coverage_report_json(req, [], true, true, 100, 0, Snapshot, '2026-08-10T12:05:00Z', 604800, BadIdReportJson),
    json_string_dict(BadIdReportJson, BadIdReport),
    coverage_row(BadIdReport.rows, 'REQ-PROOF-RECEIPTS', BadIdRow),
    assertion(BadIdRow.proofStages.passingE2e.invalidReceiptTests == ['TEST-PROOF-RECEIPTS']),

    verification_receipt_json('TEST-PROOF-RECEIPTS', Snapshot, passed, '2026-08-10T11:55:00Z', '2026-08-10T12:00:00Z', PassedJson),
    assert_fixture_entity(test, 'TEST-PROOF-RECEIPTS', "Receipt-sensitive E2E", failing, [verification_scope=end_to_end, verification_receipts=PassedJson]),
    coverage_report_json(req, [], true, true, 100, 0, Snapshot, '2026-08-10T12:05:00Z', 604800, PassedReportJson),
    json_string_dict(PassedReportJson, PassedReport),
    coverage_row(PassedReport.rows, 'REQ-PROOF-RECEIPTS', PassedRow),
    assertion(PassedRow.proofStages.passingE2e.tests == ['TEST-PROOF-RECEIPTS']),
    assertion(PassedRow.proofStages.passingE2e.status == passed).

test(symbol_coverage_does_not_count_executable_test_symbols_as_production_coverage, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    assert_fixture_entity(test, 'TEST-SYMBOL-ROLE', "Executable symbol test", passing, [verification_scope=end_to_end]),
    assert_fixture_entity(symbol, 'SYM-EXECUTABLE-ONLY', "Executable test symbol", active, []),
    kb_assert_relationship(executable_for, 'SYM-EXECUTABLE-ONLY', 'TEST-SYMBOL-ROLE', []),
    coverage_report_json(symbol, [], true, true, 100, 0, JsonString),
    json_string_dict(JsonString, Report),
    coverage_row(Report.rows, 'SYM-EXECUTABLE-ONLY', Row),
    assertion(Row.traceabilityRole == executable_test),
    assertion(Row.coverageStatus == not_applicable),
    assertion(Row.executableTestCount == 1),
    assertion(Report.summary.notApplicable == 1),
    assertion(Report.summary.fullyCovered == 0).

:- end_tests(kb_coverage_depth).

% Semantic contradiction tests using typed facts (Task 4)
:- begin_tests(kb_semantic_contradictions).

% Test 1: Exact-value conflict - same subject/property with eq pending vs eq granted
% Note: contradicting_reqs returns ReqA @< ReqB ordering, so IDs are sorted alphabetically
test(exact_value_conflict, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(fact, [
        id='FACT-USER-STATUS',
        title="User status subject",
        status=active,
        created_at="2026-03-24T00:00:00Z",
        updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt",
        fact_kind=subject,
        subject_key="user"
    ]),
    % Fact 1: user.status eq "pending"
    kb_assert_entity(fact, [
        id='FACT-STATUS-PENDING',
        title="User status pending",
        status=active,
        created_at="2026-03-24T00:00:00Z",
        updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt",
        fact_kind=property_value,
        subject_key="user",
        property_key="status",
        operator=eq,
        value_type=string,
        value_string="pending"
    ]),
    % Fact 2: user.status eq "granted"
    kb_assert_entity(fact, [
        id='FACT-STATUS-GRANTED',
        title="User status granted",
        status=active,
        created_at="2026-03-24T00:00:00Z",
        updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt",
        fact_kind=property_value,
        subject_key="user",
        property_key="status",
        operator=eq,
        value_type=string,
        value_string="granted"
    ]),
    kb_assert_entity(req, [
        id='REQ-STATUS-PENDING',
        title="User status must be pending",
        status=open,
        created_at="2026-03-24T00:00:00Z",
        updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(req, [
        id='REQ-STATUS-GRANTED',
        title="User status must be granted",
        status=open,
        created_at="2026-03-24T00:00:00Z",
        updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_relationship(constrains, 'REQ-STATUS-PENDING', 'FACT-USER-STATUS', []),
    kb_assert_relationship(constrains, 'REQ-STATUS-GRANTED', 'FACT-USER-STATUS', []),
    kb_assert_relationship(requires_property, 'REQ-STATUS-PENDING', 'FACT-STATUS-PENDING', []),
    kb_assert_relationship(requires_property, 'REQ-STATUS-GRANTED', 'FACT-STATUS-GRANTED', []),
    % 'REQ-STATUS-GRANTED' @< 'REQ-STATUS-PENDING' is false, but 'REQ-STATUS-PENDING' @< 'REQ-STATUS-GRANTED' is true
    % Actually: 'REQ-STATUS-GRANTED' > 'REQ-STATUS-PENDING' alphabetically (G > P)
    % So the order returned is ('REQ-STATUS-GRANTED', 'REQ-STATUS-PENDING')
    contradicting_reqs('REQ-STATUS-GRANTED', 'REQ-STATUS-PENDING', Reason),
    assertion(sub_string(Reason, _, _, _, "status")).

% Test 2: Numeric conflict - lte 2 vs gte 3 on same subject/property
% 'REQ-MAX-2-ROLES' @< 'REQ-MIN-3-ROLES' (M-A-X < M-I-N alphabetically)
test(numeric_gap_conflict, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(fact, [
        id='FACT-USER-ROLES',
        title="User roles subject",
        status=active,
        created_at="2026-03-24T00:00:00Z",
        updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt",
        fact_kind=subject,
        subject_key="user"
    ]),
    % Fact 1: user.roles lte 2
    kb_assert_entity(fact, [
        id='FACT-ROLES-LTE2',
        title="Max 2 roles",
        status=active,
        created_at="2026-03-24T00:00:00Z",
        updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt",
        fact_kind=property_value,
        subject_key="user",
        property_key="roles",
        operator=lte,
        value_type=int,
        value_int=2
    ]),
    % Fact 2: user.roles gte 3
    kb_assert_entity(fact, [
        id='FACT-ROLES-GTE3',
        title="Min 3 roles",
        status=active,
        created_at="2026-03-24T00:00:00Z",
        updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt",
        fact_kind=property_value,
        subject_key="user",
        property_key="roles",
        operator=gte,
        value_type=int,
        value_int=3
    ]),
    kb_assert_entity(req, [
        id='REQ-MAX-2-ROLES',
        title="User has max 2 roles",
        status=open,
        created_at="2026-03-24T00:00:00Z",
        updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(req, [
        id='REQ-MIN-3-ROLES',
        title="User has min 3 roles",
        status=open,
        created_at="2026-03-24T00:00:00Z",
        updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_relationship(constrains, 'REQ-MAX-2-ROLES', 'FACT-USER-ROLES', []),
    kb_assert_relationship(constrains, 'REQ-MIN-3-ROLES', 'FACT-USER-ROLES', []),
    kb_assert_relationship(requires_property, 'REQ-MAX-2-ROLES', 'FACT-ROLES-LTE2', []),
    kb_assert_relationship(requires_property, 'REQ-MIN-3-ROLES', 'FACT-ROLES-GTE3', []),
    contradicting_reqs('REQ-MAX-2-ROLES', 'REQ-MIN-3-ROLES', Reason),
    assertion(sub_string(Reason, _, _, _, "roles")).

% Test 3: Polarity conflict - require vs forbid on same tuple
% 'REQ-ADMIN-FORBID' @< 'REQ-ADMIN-REQUIRE' (F < R alphabetically)
test(polarity_conflict, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(fact, [
        id='FACT-USER-ADMIN-ACCESS',
        title="Admin access subject",
        status=active,
        created_at="2026-03-24T00:00:00Z",
        updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt",
        fact_kind=subject,
        subject_key="user"
    ]),
    % Fact with forbid polarity (for REQ-ADMIN-FORBID)
    kb_assert_entity(fact, [
        id='FACT-ADMIN-FORBID',
        title="Admin access forbidden",
        status=active,
        created_at="2026-03-24T00:00:00Z",
        updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt",
        fact_kind=property_value,
        subject_key="user",
        property_key="admin_access",
        operator=eq,
        value_type=bool,
        value_bool=true,
        polarity=forbid
    ]),
    % Fact with require polarity (for REQ-ADMIN-REQUIRE)
    kb_assert_entity(fact, [
        id='FACT-ADMIN-REQUIRE',
        title="Admin access required",
        status=active,
        created_at="2026-03-24T00:00:00Z",
        updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt",
        fact_kind=property_value,
        subject_key="user",
        property_key="admin_access",
        operator=eq,
        value_type=bool,
        value_bool=true,
        polarity=require
    ]),
    kb_assert_entity(req, [
        id='REQ-ADMIN-FORBID',
        title="Forbid admin access",
        status=open,
        created_at="2026-03-24T00:00:00Z",
        updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(req, [
        id='REQ-ADMIN-REQUIRE',
        title="Require admin access",
        status=open,
        created_at="2026-03-24T00:00:00Z",
        updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_relationship(constrains, 'REQ-ADMIN-FORBID', 'FACT-USER-ADMIN-ACCESS', []),
    kb_assert_relationship(constrains, 'REQ-ADMIN-REQUIRE', 'FACT-USER-ADMIN-ACCESS', []),
    kb_assert_relationship(requires_property, 'REQ-ADMIN-FORBID', 'FACT-ADMIN-FORBID', []),
    kb_assert_relationship(requires_property, 'REQ-ADMIN-REQUIRE', 'FACT-ADMIN-REQUIRE', []),
    contradicting_reqs('REQ-ADMIN-FORBID', 'REQ-ADMIN-REQUIRE', Reason),
    assertion(sub_string(Reason, _, _, _, "Polarity conflict")).

% Test 4: Observation facts do not trigger contradictions
test(observation_no_contradiction, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(fact, [
        id='FACT-SYSTEM-LOAD',
        title="System load subject",
        status=active,
        created_at="2026-03-24T00:00:00Z",
        updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt",
        fact_kind=subject,
        subject_key="system"
    ]),
    kb_assert_entity(fact, [
        id='FACT-OBS-1',
        title="Observation 1",
        status=active,
        created_at="2026-03-24T00:00:00Z",
        updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt",
        fact_kind=observation,
        subject_key="system",
        property_key="load",
        operator=eq,
        value_type=int,
        value_int=50
    ]),
    kb_assert_entity(fact, [
        id='FACT-OBS-2',
        title="Observation 2",
        status=active,
        created_at="2026-03-24T00:00:00Z",
        updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt",
        fact_kind=observation,
        subject_key="system",
        property_key="load",
        operator=eq,
        value_type=int,
        value_int=100
    ]),
    kb_assert_entity(req, [
        id='REQ-OBS-1',
        title="Requirement with obs 1",
        status=open,
        created_at="2026-03-24T00:00:00Z",
        updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(req, [
        id='REQ-OBS-2',
        title="Requirement with obs 2",
        status=open,
        created_at="2026-03-24T00:00:00Z",
        updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_relationship(constrains, 'REQ-OBS-1', 'FACT-SYSTEM-LOAD', []),
    kb_assert_relationship(constrains, 'REQ-OBS-2', 'FACT-SYSTEM-LOAD', []),
    kb_assert_relationship(requires_property, 'REQ-OBS-1', 'FACT-OBS-1', []),
    kb_assert_relationship(requires_property, 'REQ-OBS-2', 'FACT-OBS-2', []),
    % Should NOT find contradiction for observation facts
    \+ contradicting_reqs(_, _, _).

% Test 5: Meta facts do not trigger contradictions
test(meta_no_contradiction, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(fact, [
        id='FACT-KB-SCHEMA',
        title="KB schema subject",
        status=active,
        created_at="2026-03-24T00:00:00Z",
        updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt",
        fact_kind=subject,
        subject_key="kb.schema"
    ]),
    kb_assert_entity(fact, [
        id='FACT-META-1',
        title="Meta fact 1",
        status=active,
        created_at="2026-03-24T00:00:00Z",
        updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt",
        fact_kind=meta,
        subject_key="kb.schema"
    ]),
    kb_assert_entity(fact, [
        id='FACT-META-2',
        title="Meta fact 2",
        status=active,
        created_at="2026-03-24T00:00:00Z",
        updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt",
        fact_kind=meta,
        subject_key="kb.schema"
    ]),
    kb_assert_entity(req, [
        id='REQ-META-1',
        title="Requirement with meta 1",
        status=open,
        created_at="2026-03-24T00:00:00Z",
        updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(req, [
        id='REQ-META-2',
        title="Requirement with meta 2",
        status=open,
        created_at="2026-03-24T00:00:00Z",
        updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_relationship(constrains, 'REQ-META-1', 'FACT-KB-SCHEMA', []),
    kb_assert_relationship(constrains, 'REQ-META-2', 'FACT-KB-SCHEMA', []),
    kb_assert_relationship(requires_property, 'REQ-META-1', 'FACT-META-1', []),
    kb_assert_relationship(requires_property, 'REQ-META-2', 'FACT-META-2', []),
    % Should NOT find contradiction for meta facts
    \+ contradicting_reqs(_, _, _).

% Test 6: Superseded requirement is ignored via current_req/1
test(superseded_req_ignored_semantic, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(fact, [
        id='FACT-CONFIG-TIMEOUT',
        title="Config timeout subject",
        status=active,
        created_at="2026-03-24T00:00:00Z",
        updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt",
        fact_kind=subject,
        subject_key="config"
    ]),
    kb_assert_entity(fact, [
        id='FACT-VAL-100',
        title="Value 100",
        status=active,
        created_at="2026-03-24T00:00:00Z",
        updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt",
        fact_kind=property_value,
        subject_key="config",
        property_key="timeout",
        operator=eq,
        value_type=int,
        value_int=100
    ]),
    kb_assert_entity(fact, [
        id='FACT-VAL-200',
        title="Value 200",
        status=active,
        created_at="2026-03-24T00:00:00Z",
        updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt",
        fact_kind=property_value,
        subject_key="config",
        property_key="timeout",
        operator=eq,
        value_type=int,
        value_int=200
    ]),
    kb_assert_entity(req, [
        id='REQ-OLD-TIMEOUT',
        title="Old timeout requirement",
        status=deprecated,
        created_at="2026-03-24T00:00:00Z",
        updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(req, [
        id='REQ-NEW-TIMEOUT',
        title="New timeout requirement",
        status=open,
        created_at="2026-03-24T00:00:00Z",
        updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_relationship(constrains, 'REQ-OLD-TIMEOUT', 'FACT-CONFIG-TIMEOUT', []),
    kb_assert_relationship(constrains, 'REQ-NEW-TIMEOUT', 'FACT-CONFIG-TIMEOUT', []),
    kb_assert_relationship(requires_property, 'REQ-OLD-TIMEOUT', 'FACT-VAL-100', []),
    kb_assert_relationship(requires_property, 'REQ-NEW-TIMEOUT', 'FACT-VAL-200', []),
    kb_assert_relationship(supersedes, 'REQ-NEW-TIMEOUT', 'REQ-OLD-TIMEOUT', []),
    % Should NOT find contradiction because REQ-OLD-TIMEOUT is not current
    \+ contradicting_reqs(_, _, _).

% Test 7: Same subject/property but different operators - no conflict if values compatible
test(compatible_operators_no_conflict, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(fact, [
        id='FACT-USER-AGE',
        title="User age subject",
        status=active,
        created_at="2026-03-24T00:00:00Z",
        updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt",
        fact_kind=subject,
        subject_key="user"
    ]),
    % Fact 1: user.age gte 18
    kb_assert_entity(fact, [
        id='FACT-AGE-GTE18',
        title="Age >= 18",
        status=active,
        created_at="2026-03-24T00:00:00Z",
        updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt",
        fact_kind=property_value,
        subject_key="user",
        property_key="age",
        operator=gte,
        value_type=int,
        value_int=18
    ]),
    % Fact 2: user.age lte 65 - compatible (18-65 range exists)
    kb_assert_entity(fact, [
        id='FACT-AGE-LTE65',
        title="Age <= 65",
        status=active,
        created_at="2026-03-24T00:00:00Z",
        updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt",
        fact_kind=property_value,
        subject_key="user",
        property_key="age",
        operator=lte,
        value_type=int,
        value_int=65
    ]),
    kb_assert_entity(req, [
        id='REQ-ADULT',
        title="Adult requirement",
        status=open,
        created_at="2026-03-24T00:00:00Z",
        updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(req, [
        id='REQ-SENIOR',
        title="Senior requirement",
        status=open,
        created_at="2026-03-24T00:00:00Z",
        updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_relationship(constrains, 'REQ-ADULT', 'FACT-USER-AGE', []),
    kb_assert_relationship(constrains, 'REQ-SENIOR', 'FACT-USER-AGE', []),
    kb_assert_relationship(requires_property, 'REQ-ADULT', 'FACT-AGE-GTE18', []),
    kb_assert_relationship(requires_property, 'REQ-SENIOR', 'FACT-AGE-LTE65', []),
    % Should NOT find contradiction - gte 18 and lte 65 are compatible
    \+ contradicting_reqs(_, _, _).

% Test 8: Legacy facts without fact_kind still work (backward compatibility)
test(legacy_facts_backward_compat, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    % Legacy facts without fact_kind
    kb_assert_entity(fact, [
        id='FACT-LEGACY-1',
        title="Legacy fact 1",
        status=active,
        created_at="2026-03-24T00:00:00Z",
        updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(fact, [
        id='FACT-LEGACY-2',
        title="Legacy fact 2",
        status=active,
        created_at="2026-03-24T00:00:00Z",
        updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(req, [
        id='REQ-LEGACY',
        title="Legacy requirement",
        status=open,
        created_at="2026-03-24T00:00:00Z",
        updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_relationship(constrains, 'REQ-LEGACY', 'FACT-LEGACY-1', []),
    % Legacy facts should not trigger semantic contradictions
    % (they fall back to old behavior or no detection)
    \+ contradicting_reqs(_, _, _).

% Test 31: Numeric coercion - 30 and 30.0 should be treated as equal (no false positive)
test(numeric_coercion_no_false_positive, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    % Create subject fact
    kb_assert_entity(fact, [
        id='FACT-COERCE-S', title="Coerce subject", status=active,
        created_at="2026-03-24T00:00:00Z", updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt",
        fact_kind=subject, subject_key="coerce.test"
    ]),
    % Create property fact with integer value 30
    kb_assert_entity(fact, [
        id='FACT-COERCE-INT', title="Int 30", status=active,
        created_at="2026-03-24T00:00:00Z", updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt",
        fact_kind=property_value, subject_key="coerce.test",
        property_key="limit", operator=eq, value_type=int, value_int=30
    ]),
    % Create property fact with number value 30.0
    kb_assert_entity(fact, [
        id='FACT-COERCE-NUM', title="Number 30.0", status=active,
        created_at="2026-03-24T00:00:00Z", updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt",
        fact_kind=property_value, subject_key="coerce.test",
        property_key="limit", operator=eq, value_type=number, value_number=30.0
    ]),
    % Create two reqs pointing to same subject but different typed values
    kb_assert_entity(req, [
        id='REQ-COERCE-A', title="Req A", status=open,
        created_at="2026-03-24T00:00:00Z", updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_relationship(constrains, 'REQ-COERCE-A', 'FACT-COERCE-S', []),
    kb_assert_relationship(requires_property, 'REQ-COERCE-A', 'FACT-COERCE-INT', []),
    kb_assert_entity(req, [
        id='REQ-COERCE-B', title="Req B", status=open,
        created_at="2026-03-24T00:00:00Z", updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_relationship(constrains, 'REQ-COERCE-B', 'FACT-COERCE-S', []),
    kb_assert_relationship(requires_property, 'REQ-COERCE-B', 'FACT-COERCE-NUM', []),
    % Should NOT find a contradiction since 30 =:= 30.0
    \+ contradicting_reqs('REQ-COERCE-A', 'REQ-COERCE-B', _),
    \+ contradicting_reqs('REQ-COERCE-B', 'REQ-COERCE-A', _).

test(closed_requirements_are_current_for_contradictions, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(fact, [
        id='FACT-CLOSED-SUBJECT', title="Closed req subject", status=active,
        created_at="2026-03-24T00:00:00Z", updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt", fact_kind=subject, subject_key="session.closed"
    ]),
    kb_assert_entity(fact, [
        id='FACT-CLOSED-30', title="Closed req timeout 30", status=active,
        created_at="2026-03-24T00:00:00Z", updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt", fact_kind=property_value, subject_key="session.closed",
        property_key="timeout_minutes", operator=eq, value_type=int, value_int=30
    ]),
    kb_assert_entity(fact, [
        id='FACT-CLOSED-60', title="Closed req timeout 60", status=active,
        created_at="2026-03-24T00:00:00Z", updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt", fact_kind=property_value, subject_key="session.closed",
        property_key="timeout_minutes", operator=eq, value_type=int, value_int=60
    ]),
    kb_assert_entity(req, [
        id='REQ-CLOSED-CURRENT', title="Closed req still current", status=closed,
        created_at="2026-03-24T00:00:00Z", updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(req, [
        id='REQ-OPEN-CURRENT', title="Open conflicting req", status=open,
        created_at="2026-03-24T00:00:00Z", updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_relationship(constrains, 'REQ-CLOSED-CURRENT', 'FACT-CLOSED-SUBJECT', []),
    kb_assert_relationship(constrains, 'REQ-OPEN-CURRENT', 'FACT-CLOSED-SUBJECT', []),
    kb_assert_relationship(requires_property, 'REQ-CLOSED-CURRENT', 'FACT-CLOSED-30', []),
    kb_assert_relationship(requires_property, 'REQ-OPEN-CURRENT', 'FACT-CLOSED-60', []),
    contradicting_reqs('REQ-CLOSED-CURRENT', 'REQ-OPEN-CURRENT', Reason),
    assertion(sub_string(Reason, _, _, _, "timeout_minutes")).

test(equal_scopes_with_conflicting_values_still_conflict, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(fact, [
        id='FACT-SCOPE-SUBJECT', title="Scoped subject", status=active,
        created_at="2026-03-24T00:00:00Z", updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt", fact_kind=subject, subject_key="session.scope"
    ]),
    kb_assert_entity(fact, [
        id='FACT-SCOPE-30', title="Scoped timeout 30", status=active,
        created_at="2026-03-24T00:00:00Z", updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt", fact_kind=property_value, subject_key="session.scope",
        property_key="timeout_minutes", operator=eq, value_type=int, value_int=30,
        scope="global"
    ]),
    kb_assert_entity(fact, [
        id='FACT-SCOPE-60', title="Scoped timeout 60", status=active,
        created_at="2026-03-24T00:00:00Z", updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt", fact_kind=property_value, subject_key="session.scope",
        property_key="timeout_minutes", operator=eq, value_type=int, value_int=60,
        scope="global"
    ]),
    kb_assert_entity(req, [
        id='REQ-SCOPE-30', title="Scoped req 30", status=open,
        created_at="2026-03-24T00:00:00Z", updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(req, [
        id='REQ-SCOPE-60', title="Scoped req 60", status=open,
        created_at="2026-03-24T00:00:00Z", updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_relationship(constrains, 'REQ-SCOPE-30', 'FACT-SCOPE-SUBJECT', []),
    kb_assert_relationship(constrains, 'REQ-SCOPE-60', 'FACT-SCOPE-SUBJECT', []),
    kb_assert_relationship(requires_property, 'REQ-SCOPE-30', 'FACT-SCOPE-30', []),
    kb_assert_relationship(requires_property, 'REQ-SCOPE-60', 'FACT-SCOPE-60', []),
    contradicting_reqs('REQ-SCOPE-30', 'REQ-SCOPE-60', Reason),
    assertion(sub_string(Reason, _, _, _, "timeout_minutes")).

test(non_overlapping_scopes_do_not_conflict, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(fact, [
        id='FACT-SCOPE-NO-CONFLICT-SUBJECT', title="Scope no-conflict subject", status=active,
        created_at="2026-03-24T00:00:00Z", updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt", fact_kind=subject, subject_key="session.scope.none"
    ]),
    kb_assert_entity(fact, [
        id='FACT-SCOPE-NO-CONFLICT-30', title="Global timeout 30", status=active,
        created_at="2026-03-24T00:00:00Z", updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt", fact_kind=property_value,
        subject_key="session.scope.none", property_key="timeout_minutes",
        operator=eq, value_type=int, value_int=30, scope="global"
    ]),
    kb_assert_entity(fact, [
        id='FACT-SCOPE-NO-CONFLICT-60', title="Tenant timeout 60", status=active,
        created_at="2026-03-24T00:00:00Z", updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt", fact_kind=property_value,
        subject_key="session.scope.none", property_key="timeout_minutes",
        operator=eq, value_type=int, value_int=60, scope="tenant"
    ]),
    kb_assert_entity(req, [
        id='REQ-SCOPE-NO-CONFLICT-30', title="Global scope req", status=open,
        created_at="2026-03-24T00:00:00Z", updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(req, [
        id='REQ-SCOPE-NO-CONFLICT-60', title="Tenant scope req", status=open,
        created_at="2026-03-24T00:00:00Z", updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_relationship(constrains, 'REQ-SCOPE-NO-CONFLICT-30', 'FACT-SCOPE-NO-CONFLICT-SUBJECT', []),
    kb_assert_relationship(constrains, 'REQ-SCOPE-NO-CONFLICT-60', 'FACT-SCOPE-NO-CONFLICT-SUBJECT', []),
    kb_assert_relationship(requires_property, 'REQ-SCOPE-NO-CONFLICT-30', 'FACT-SCOPE-NO-CONFLICT-30', []),
    kb_assert_relationship(requires_property, 'REQ-SCOPE-NO-CONFLICT-60', 'FACT-SCOPE-NO-CONFLICT-60', []),
    \+ contradicting_reqs(_, _, _).

test(overlapping_validity_windows_conflict, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(fact, [
        id='FACT-VALIDITY-SUBJECT', title="Validity subject", status=active,
        created_at="2026-03-24T00:00:00Z", updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt", fact_kind=subject, subject_key="billing.plan"
    ]),
    kb_assert_entity(fact, [
        id='FACT-VALIDITY-7', title="Grace period 7", status=active,
        created_at="2026-03-24T00:00:00Z", updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt", fact_kind=property_value, subject_key="billing.plan",
        property_key="grace_period_days", operator=eq, value_type=int, value_int=7,
        valid_from="2026-01-01T00:00:00Z", valid_to="2026-12-31T00:00:00Z"
    ]),
    kb_assert_entity(fact, [
        id='FACT-VALIDITY-14', title="Grace period 14", status=active,
        created_at="2026-03-24T00:00:00Z", updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt", fact_kind=property_value, subject_key="billing.plan",
        property_key="grace_period_days", operator=eq, value_type=int, value_int=14,
        valid_from="2026-06-01T00:00:00Z", valid_to="2026-06-30T00:00:00Z"
    ]),
    kb_assert_entity(req, [
        id='REQ-VALIDITY-14', title="Validity req 14", status=open,
        created_at="2026-03-24T00:00:00Z", updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(req, [
        id='REQ-VALIDITY-7', title="Validity req 7", status=open,
        created_at="2026-03-24T00:00:00Z", updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_relationship(constrains, 'REQ-VALIDITY-14', 'FACT-VALIDITY-SUBJECT', []),
    kb_assert_relationship(constrains, 'REQ-VALIDITY-7', 'FACT-VALIDITY-SUBJECT', []),
    kb_assert_relationship(requires_property, 'REQ-VALIDITY-14', 'FACT-VALIDITY-14', []),
    kb_assert_relationship(requires_property, 'REQ-VALIDITY-7', 'FACT-VALIDITY-7', []),
    contradicting_reqs('REQ-VALIDITY-14', 'REQ-VALIDITY-7', Reason),
    assertion(sub_string(Reason, _, _, _, "grace_period_days")).

test(non_overlapping_validity_windows_do_not_conflict, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(fact, [
        id='FACT-VALIDITY-NO-CONFLICT-SUBJECT', title="Validity no-conflict subject", status=active,
        created_at="2026-03-24T00:00:00Z", updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt", fact_kind=subject, subject_key="billing.plan.none"
    ]),
    kb_assert_entity(fact, [
        id='FACT-VALIDITY-NO-CONFLICT-7', title="Grace period 7 first window", status=active,
        created_at="2026-03-24T00:00:00Z", updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt", fact_kind=property_value,
        subject_key="billing.plan.none", property_key="grace_period_days",
        operator=eq, value_type=int, value_int=7,
        valid_from="2026-01-01T00:00:00Z", valid_to="2026-03-01T00:00:00Z"
    ]),
    kb_assert_entity(fact, [
        id='FACT-VALIDITY-NO-CONFLICT-14', title="Grace period 14 second window", status=active,
        created_at="2026-03-24T00:00:00Z", updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt", fact_kind=property_value,
        subject_key="billing.plan.none", property_key="grace_period_days",
        operator=eq, value_type=int, value_int=14,
        valid_from="2026-04-01T00:00:00Z", valid_to="2026-06-01T00:00:00Z"
    ]),
    kb_assert_entity(req, [
        id='REQ-VALIDITY-NO-CONFLICT-14', title="Second window req", status=open,
        created_at="2026-03-24T00:00:00Z", updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(req, [
        id='REQ-VALIDITY-NO-CONFLICT-7', title="First window req", status=open,
        created_at="2026-03-24T00:00:00Z", updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_relationship(constrains, 'REQ-VALIDITY-NO-CONFLICT-14', 'FACT-VALIDITY-NO-CONFLICT-SUBJECT', []),
    kb_assert_relationship(constrains, 'REQ-VALIDITY-NO-CONFLICT-7', 'FACT-VALIDITY-NO-CONFLICT-SUBJECT', []),
    kb_assert_relationship(requires_property, 'REQ-VALIDITY-NO-CONFLICT-14', 'FACT-VALIDITY-NO-CONFLICT-14', []),
    kb_assert_relationship(requires_property, 'REQ-VALIDITY-NO-CONFLICT-7', 'FACT-VALIDITY-NO-CONFLICT-7', []),
    \+ contradicting_reqs(_, _, _).

test(different_properties_on_same_subject_do_not_conflict, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(fact, [
        id='FACT-DIFFERENT-PROPERTY-SUBJECT', title="Different property subject", status=active,
        created_at="2026-03-24T00:00:00Z", updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt", fact_kind=subject, subject_key="user.session.config"
    ]),
    kb_assert_entity(fact, [
        id='FACT-DIFFERENT-PROPERTY-TIMEOUT', title="Timeout 30", status=active,
        created_at="2026-03-24T00:00:00Z", updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt", fact_kind=property_value,
        subject_key="user.session.config", property_key="timeout_minutes",
        operator=eq, value_type=int, value_int=30
    ]),
    kb_assert_entity(fact, [
        id='FACT-DIFFERENT-PROPERTY-RETRIES', title="Retries 5", status=active,
        created_at="2026-03-24T00:00:00Z", updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt", fact_kind=property_value,
        subject_key="user.session.config", property_key="max_retries",
        operator=eq, value_type=int, value_int=5
    ]),
    kb_assert_entity(req, [
        id='REQ-DIFFERENT-PROPERTY-RETRIES', title="Retries req", status=open,
        created_at="2026-03-24T00:00:00Z", updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(req, [
        id='REQ-DIFFERENT-PROPERTY-TIMEOUT', title="Timeout req", status=open,
        created_at="2026-03-24T00:00:00Z", updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_relationship(constrains, 'REQ-DIFFERENT-PROPERTY-RETRIES', 'FACT-DIFFERENT-PROPERTY-SUBJECT', []),
    kb_assert_relationship(constrains, 'REQ-DIFFERENT-PROPERTY-TIMEOUT', 'FACT-DIFFERENT-PROPERTY-SUBJECT', []),
    kb_assert_relationship(requires_property, 'REQ-DIFFERENT-PROPERTY-RETRIES', 'FACT-DIFFERENT-PROPERTY-RETRIES', []),
    kb_assert_relationship(requires_property, 'REQ-DIFFERENT-PROPERTY-TIMEOUT', 'FACT-DIFFERENT-PROPERTY-TIMEOUT', []),
    \+ contradicting_reqs(_, _, _).

test(reserved_fields_do_not_change_conflict_detection, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(fact, [
        id='FACT-RESERVED-SUBJECT', title="Reserved field subject", status=active,
        created_at="2026-03-24T00:00:00Z", updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt", fact_kind=subject, subject_key="user.permissions"
    ]),
    kb_assert_entity(fact, [
        id='FACT-RESERVED-TRUE', title="Admin true", status=active,
        created_at="2026-03-24T00:00:00Z", updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt", fact_kind=property_value,
        subject_key="user.permissions", property_key="admin_access",
        operator=eq, value_type=bool, value_bool=true,
        closed_world=true,
        canonical_key="user.permissions.admin_access.eq.true"
    ]),
    kb_assert_entity(fact, [
        id='FACT-RESERVED-FALSE', title="Admin false", status=active,
        created_at="2026-03-24T00:00:00Z", updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt", fact_kind=property_value,
        subject_key="user.permissions", property_key="admin_access",
        operator=eq, value_type=bool, value_bool=false,
        closed_world=false,
        canonical_key="user.permissions.admin_access.eq.false"
    ]),
    kb_assert_entity(req, [
        id='REQ-RESERVED-FALSE', title="Reserved false req", status=open,
        created_at="2026-03-24T00:00:00Z", updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(req, [
        id='REQ-RESERVED-TRUE', title="Reserved true req", status=open,
        created_at="2026-03-24T00:00:00Z", updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_relationship(constrains, 'REQ-RESERVED-FALSE', 'FACT-RESERVED-SUBJECT', []),
    kb_assert_relationship(constrains, 'REQ-RESERVED-TRUE', 'FACT-RESERVED-SUBJECT', []),
    kb_assert_relationship(requires_property, 'REQ-RESERVED-FALSE', 'FACT-RESERVED-FALSE', []),
    kb_assert_relationship(requires_property, 'REQ-RESERVED-TRUE', 'FACT-RESERVED-TRUE', []),
    contradicting_reqs('REQ-RESERVED-FALSE', 'REQ-RESERVED-TRUE', Reason),
    assertion(sub_string(Reason, _, _, _, "admin_access")).

:- end_tests(kb_semantic_contradictions).

% Strict-lane pairing validation tests (REQ-011)
:- begin_tests(kb_strict_lane_pairing).

test(constrains_to_subject_fact_succeeds, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(fact, [
        id='FACT-SUBJECT-SL',
        title="Subject fact",
        status=active,
        created_at="2026-03-24T00:00:00Z",
        updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt",
        fact_kind=subject,
        subject_key="test.subject"
    ]),
    kb_assert_entity(req, [
        id='REQ-CONSTRAINS-OK',
        title="Req constrains subject",
        status=open,
        created_at="2026-03-24T00:00:00Z",
        updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_relationship(constrains, 'REQ-CONSTRAINS-OK', 'FACT-SUBJECT-SL', []),
    kb_relationship(constrains, 'REQ-CONSTRAINS-OK', 'FACT-SUBJECT-SL').

test(requires_property_to_property_value_fact_succeeds, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(fact, [
        id='FACT-PROP-SL',
        title="Property value fact",
        status=active,
        created_at="2026-03-24T00:00:00Z",
        updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt",
        fact_kind=property_value,
        subject_key="test.subject",
        property_key="value",
        operator=eq,
        value_type=string,
        value_string="test"
    ]),
    kb_assert_entity(req, [
        id='REQ-REQUIRES-OK',
        title="Req requires property",
        status=open,
        created_at="2026-03-24T00:00:00Z",
        updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_relationship(requires_property, 'REQ-REQUIRES-OK', 'FACT-PROP-SL', []),
    kb_relationship(requires_property, 'REQ-REQUIRES-OK', 'FACT-PROP-SL').

test(constrains_to_property_value_fact_fails, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(fact, [
        id='FACT-PROP-WRONG-KIND',
        title="Property value fact",
        status=active,
        created_at="2026-03-24T00:00:00Z",
        updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt",
        fact_kind=property_value,
        subject_key="test.subject",
        property_key="value",
        operator=eq,
        value_type=string,
        value_string="test"
    ]),
    kb_assert_entity(req, [
        id='REQ-CONSTRAINS-FAIL',
        title="Req constrains property_value",
        status=open,
        created_at="2026-03-24T00:00:00Z",
        updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt"
    ]),
    % This should fail - constrains target cannot be property_value
    catch(
        kb_assert_relationship(constrains, 'REQ-CONSTRAINS-FAIL', 'FACT-PROP-WRONG-KIND', []),
        error(validation_error(Msg), _),
        sub_string(Msg, _, _, _, "subject")
    ).

test(requires_property_to_subject_fact_fails, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(fact, [
        id='FACT-SUBJECT-WRONG-KIND',
        title="Subject fact",
        status=active,
        created_at="2026-03-24T00:00:00Z",
        updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt",
        fact_kind=subject,
        subject_key="test.subject"
    ]),
    kb_assert_entity(req, [
        id='REQ-REQUIRES-FAIL',
        title="Req requires property from subject",
        status=open,
        created_at="2026-03-24T00:00:00Z",
        updated_at="2026-03-24T00:00:00Z",
        source="test://kb.plt"
    ]),
    % This should fail - requires_property target cannot be subject fact
    catch(
        kb_assert_relationship(requires_property, 'REQ-REQUIRES-FAIL', 'FACT-SUBJECT-WRONG-KIND', []),
        error(validation_error(Msg), _),
        sub_string(Msg, _, _, _, "property_value")
    ).

:- end_tests(kb_strict_lane_pairing).

:- begin_tests(violation_id_text_regression).

% Regression tests for violation_id_text/2 typed-literal unwrapping (beea1b8).
% These paths are exercised when entity IDs arrive as RDF-typed literals.

test(plain_atom) :-
    violation_id_text('REQ-001', Text),
    Text == "REQ-001".

test(plain_string) :-
    violation_id_text("REQ-002", Text),
    Text == "REQ-002".

test(rdf_typed_literal_unwrap) :-
    % ^^(Value, Type) form — RDF typed literal
    violation_id_text('^^'('REQ-003', 'http://www.w3.org/2001/XMLSchema#string'), Text),
    Text == "REQ-003".

test(prolog_literal_type_unwrap) :-
    % literal(type(_, Val)) form — Prolog literal wrapper
    violation_id_text(literal(type('http://www.w3.org/2001/XMLSchema#string', 'REQ-004')), Text),
    Text == "REQ-004".

:- end_tests(violation_id_text_regression).

:- begin_tests(discovery_aggregate_counts).

test(relationship_count_counts_both_directions, [setup(setup_kb), cleanup(cleanup_kb), nondet]) :-
    assert_fixture_entity(req, 'REQ-AGG-A', "Aggregate req A", open, []),
    assert_fixture_entity(test, 'TEST-AGG-A', "Aggregate test A", passing, []),
    assert_fixture_entity(test, 'TEST-AGG-B', "Aggregate test B", passing, []),
    kb_assert_relationship(verified_by, 'REQ-AGG-A', 'TEST-AGG-A', []),
    assert_raw_relationship(verified_by, 'TEST-AGG-B', 'REQ-AGG-A'),
    discovery:find_gaps_json(req, [], [], [], none, 100, 0, JsonString),
    atom_json_dict(JsonString, Json, []),
    member(Row, Json.rows),
    assertion(Row.get(id) == "REQ-AGG-A"),
    assertion(Row.get(relationshipCounts).get(verified_by) == 2).

:- end_tests(discovery_aggregate_counts).

:- begin_tests(checks_coverage_gaps).

test(check_all_aggregates_empty_kb, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    check_all(Violations),
    assertion(Violations.must_priority_coverage == []),
    assertion(Violations.symbol_coverage == []),
    assertion(Violations.symbol_traceability == []),
    assertion(Violations.no_dangling_refs == []),
    assertion(Violations.no_cycles == []),
    assertion(Violations.required_fields == []).

test(check_all_json_with_options_serializes_dict, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    assert_fixture_entity(req, 'REQ-ADR-NEEDED', "ADR needed req", open, []),
    assert_fixture_entity(symbol, 'SYM-ADR-NEEDED', "ADR needed symbol", active, []),
    kb_assert_relationship(implements, 'SYM-ADR-NEEDED', 'REQ-ADR-NEEDED', []),
    checks:check_all_with_options(Violations, true),
    member(violation('symbol-traceability', 'SYM-ADR-NEEDED', "Symbol has no ADR constraint.", _, _), Violations.symbol_traceability),
    checks:check_all_json_with_options(Json, true),
    atom_json_dict(Json, JsonDict, []),
    ViolationsJson = JsonDict.get(symbol_traceability),
    member(Row, ViolationsJson),
    assertion(Row.get(entityId) == "SYM-ADR-NEEDED"),
    assertion(Row.get(description) == "Symbol has no ADR constraint.").

test(check_must_priority_coverage_reports_missing_scenario_semantics, [setup(setup_kb), cleanup(cleanup_kb), nondet]) :-
    assert_fixture_entity(req, 'REQ-MUST-NO-SCENARIO', "Must req without scenario", active, [priority=must]),
    assert_fixture_entity(test, 'TEST-MUST-NO-SCENARIO', "Direct validating test", active, []),
    kb_assert_relationship(validates, 'TEST-MUST-NO-SCENARIO', 'REQ-MUST-NO-SCENARIO', []),
    check_must_priority_coverage(Violations),
    member(
        violation(
            'must-priority-coverage',
            'REQ-MUST-NO-SCENARIO',
            "Must-priority requirement lacks scenario coverage",
            "Create scenario that specifies this requirement",
            'kb.plt'
        ),
        Violations
    ).

test(coverage_gap_reason_text_mappings_are_stable) :-
    checks:coverage_gap_desc(missing_test, DescTest),
    checks:coverage_gap_desc(missing_scenario_and_test, DescBoth),
    checks:coverage_gap_suggestion(missing_test, SuggestTest),
    checks:coverage_gap_suggestion(missing_scenario_and_test, SuggestBoth),
    assertion(DescTest == "Must-priority requirement lacks test coverage"),
    assertion(DescBoth == "Must-priority requirement lacks scenario and test coverage"),
    assertion(SuggestTest == "Create test that validates this requirement"),
    assertion(SuggestBoth == "Create scenario that specifies and test that validates this requirement").

test(check_no_dangling_refs_reports_missing_from_and_to_entities, [setup(setup_kb), cleanup(cleanup_kb), nondet]) :-
    assert_fixture_entity(req, 'REQ-REAL', "Existing req", active, []),
    assert_raw_relationship(verified_by, 'REQ-MISSING-FROM', 'REQ-REAL'),
    assert_raw_relationship(verified_by, 'REQ-REAL', 'REQ-MISSING-TO'),
    check_no_dangling_refs(Violations),
    member(violation('no-dangling-refs', 'REQ-MISSING-FROM', "Relationship references non-existent entity: REQ-MISSING-FROM", _, ""), Violations),
    member(violation('no-dangling-refs', 'REQ-MISSING-TO', "Relationship references non-existent entity: REQ-MISSING-TO", _, ""), Violations).

test(check_required_fields_reports_each_missing_field_and_empty_source, [setup(setup_kb), cleanup(cleanup_kb), nondet]) :-
    assert_raw_entity(req, 'REQ-RAW-MISSING', [
        id='REQ-RAW-MISSING',
        created_at="2026-05-01T00:00:00Z",
        updated_at="2026-05-01T00:00:00Z"
    ]),
    check_required_fields(Violations),
    member(violation('required-fields', 'REQ-RAW-MISSING', "Missing required field: title", "Add title to entity definition", ""), Violations),
    member(violation('required-fields', 'REQ-RAW-MISSING', "Missing required field: status", "Add status to entity definition", ""), Violations),
    member(violation('required-fields', 'REQ-RAW-MISSING', "Missing required field: source", "Add source to entity definition", ""), Violations).

test(check_no_cycles_reports_self_cycle_and_formats_source_name, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    assert_fixture_entity(req, 'REQ-SELF-CYCLE', "Self cycle req", active, [source="docs/requirements/REQ-SELF-CYCLE.md"]),
    kb_assert_relationship(depends_on, 'REQ-SELF-CYCLE', 'REQ-SELF-CYCLE', []),
    check_no_cycles([violation('no-cycles', 'REQ-SELF-CYCLE', Description, _, 'kb.plt')]),
    assertion(sub_string(Description, _, _, _, "kb.plt → kb.plt")).

test(check_no_cycles_deduplicates_equivalent_cycles, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    assert_fixture_entity(req, 'REQ-CYCLE-A', "Cycle A", active, []),
    assert_fixture_entity(req, 'REQ-CYCLE-B', "Cycle B", active, []),
    kb_assert_relationship(depends_on, 'REQ-CYCLE-A', 'REQ-CYCLE-B', []),
    kb_assert_relationship(depends_on, 'REQ-CYCLE-B', 'REQ-CYCLE-A', []),
    check_no_cycles(Violations),
    length(Violations, 1).

test(check_deprecated_adrs_reports_missing_successor, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    assert_fixture_entity(adr, 'ADR-DEPRECATED', "Deprecated ADR", deprecated, []),
    check_deprecated_adrs([violation('deprecated-adr-no-successor', 'ADR-DEPRECATED', _, Suggestion, _)]),
    assertion(sub_string(Suggestion, _, _, _, "ADR-DEPRECATED")).

test(check_domain_contradictions_wraps_conflict_reason, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    assert_contradicting_requirement_pair('REQ-CONFLICT-A', 10, 'REQ-CONFLICT-B', 20),
    check_domain_contradictions(Violations),
    member(violation('domain-contradictions', "REQ-CONFLICT-A/REQ-CONFLICT-B", Description, _, ""), Violations),
    assertion(sub_string(Description, _, _, _, "rate_limit")),
    check_domain_contradiction_witnesses([Witness]),
    assertion(Witness.kind == strict_property),
    assertion(Witness.status == contradiction),
    assertion(Witness.subjectKey == 'api.quota'),
    assertion(Witness.propertyKey == rate_limit),
    assertion(Witness.left.factId == 'FACT-CONFLICT-A'),
    assertion(Witness.left.factSource == 'test://kb.plt'),
    assertion(Witness.left.claimKey == 'CLAIM-AAAAAAAAAAAAAAAA'),
    assertion(Witness.left.term.value == 10),
    assertion(Witness.right.factId == 'FACT-CONFLICT-B'),
    assertion(Witness.right.claimKey == 'CLAIM-BBBBBBBBBBBBBBBB'),
    assertion(Witness.right.term.value == 20),
    checks:check_all_json(Json),
    atom_json_dict(Json, Dict, [value_string_as(atom)]),
    Dict.domain_contradictions = [JsonViolation],
    JsonViolation.evidence.witnesses = [JsonWitness],
    assertion(JsonWitness.left.factId == 'FACT-CONFLICT-A'),
    assertion(JsonWitness.right.factId == 'FACT-CONFLICT-B').

test(rule_contradiction_witness_is_source_bound_and_blocks_proof, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    assert_rule_requirement_pair(customer, customer),
    check_domain_contradiction_witnesses([Witness]),
    assertion(Witness.kind == rule),
    assertion(Witness.status == contradiction),
    assertion(Witness.left.requirementId == 'REQ-RULE-ALLOW'),
    assertion(Witness.left.factId == 'FACT-RULE-ALLOW'),
    assertion(Witness.left.claimKey == 'CLAIM-CCCCCCCCCCCCCCCC'),
    assertion(Witness.left.claimSpan.start == 0),
    assertion(Witness.left.claimSpan.end == 37),
    assertion(Witness.right.requirementId == 'REQ-RULE-DENY'),
    assertion(Witness.right.factId == 'FACT-RULE-DENY'),
    assertion(Witness.comparison.modalityA == oblige),
    assertion(Witness.comparison.modalityB == forbid),
    Context = _{contradictionWitnesses:[Witness], contradictions:[]},
    requirement_proof:contradiction_stage('REQ-RULE-ALLOW', passed, Context, Stage),
    assertion(Stage.status == blocked),
    assertion(Stage.outcome == conflict_found),
    assertion(Stage.conflicts == [Witness]).

test(rule_overlap_witness_remains_unresolved_in_requirement_proof, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    assert_rule_requirement_pair(customer, premium_customer),
    check_domain_contradiction_witnesses([Witness]),
    assertion(Witness.kind == rule),
    assertion(Witness.status == unresolved),
    assertion(Witness.comparison.bodyA \== Witness.comparison.bodyB),
    check_domain_contradictions(Violations),
    member(violation('domain-contradictions', "REQ-RULE-ALLOW/REQ-RULE-DENY", Description, _, ""), Violations),
    assertion(sub_string(Description, _, _, _, "unresolved")),
    Context = _{contradictionWitnesses:[Witness], contradictions:Violations},
    requirement_proof:contradiction_stage('REQ-RULE-ALLOW', passed, Context, Stage),
    assertion(Stage.status == unresolved),
    assertion(Stage.outcome == analysis_incomplete),
    assertion(Stage.conflicts == [Witness]).

test(check_strict_req_fact_pairing_reports_missing_property_counterpart, [setup(setup_kb), cleanup(cleanup_kb), nondet]) :-
    assert_fixture_entity(fact, 'FACT-SUBJECT-ONLY', "Subject only", active, [fact_kind=subject, subject_key="checkout"]),
    assert_fixture_entity(req, 'REQ-SUBJECT-ONLY', "Subject only req", open, []),
    kb_assert_relationship(constrains, 'REQ-SUBJECT-ONLY', 'FACT-SUBJECT-ONLY', []),
    check_strict_req_fact_pairing([violation('strict-req-fact-pairing', 'REQ-SUBJECT-ONLY', Description, Suggestion, 'kb.plt')]),
    assertion(sub_string(Description, _, _, _, "has no matching strict requires_property fact")),
    assertion(Suggestion == "Add a property_value fact via requires_property for the same subject_key").

test(check_strict_req_fact_pairing_reports_missing_subject_counterpart, [setup(setup_kb), cleanup(cleanup_kb), nondet]) :-
    assert_fixture_entity(fact, 'FACT-PROP-ONLY', "Property only", active, [fact_kind=property_value, subject_key="checkout", property_key="currency", operator=eq, value_type=string, value_string="usd"]),
    assert_fixture_entity(req, 'REQ-PROP-ONLY', "Property only req", open, []),
    kb_assert_relationship(requires_property, 'REQ-PROP-ONLY', 'FACT-PROP-ONLY', []),
    check_strict_req_fact_pairing([violation('strict-req-fact-pairing', 'REQ-PROP-ONLY', Description, Suggestion, 'kb.plt')]),
    assertion(sub_string(Description, _, _, _, "has no matching strict subject fact via constrains")),
    assertion(Suggestion == "Add a subject fact via constrains for the same subject_key or remove the mismatched requires_property link").

test(check_strict_req_fact_pairing_flags_wrong_fact_kinds_and_legacy_targets, [setup(setup_kb), cleanup(cleanup_kb), nondet]) :-
    assert_fixture_entity(fact, 'FACT-OBS-CONSTRAINS', "Observation fact", active, [fact_kind=observation]),
    assert_fixture_entity(fact, 'FACT-LEGACY-PROP', "Legacy fact", active, []),
    assert_fixture_entity(req, 'REQ-WRONG-KINDS', "Wrong kinds req", open, []),
    kb_assert_relationship(constrains, 'REQ-WRONG-KINDS', 'FACT-OBS-CONSTRAINS', []),
    kb_assert_relationship(requires_property, 'REQ-WRONG-KINDS', 'FACT-LEGACY-PROP', []),
    check_strict_req_fact_pairing(Violations),
    member(violation('strict-req-fact-pairing', 'REQ-WRONG-KINDS', DescObservation, _, _), Violations),
    sub_string(DescObservation, _, _, _, "fact_kind=observation"),
    member(violation('strict-req-fact-pairing', 'REQ-WRONG-KINDS', DescLegacy, _, _), Violations),
    sub_string(DescLegacy, _, _, _, "legacy fact without fact_kind").

test(adr_chain_and_current_adr_follow_supersession, [setup(setup_kb), cleanup(cleanup_kb), nondet]) :-
    assert_fixture_entity(adr, 'ADR-OLD', "Old ADR", accepted, []),
    assert_fixture_entity(adr, 'ADR-NEW', "New ADR", accepted, []),
    kb_assert_relationship(supersedes, 'ADR-NEW', 'ADR-OLD', []),
    adr_chain('ADR-OLD', ['ADR-OLD', 'ADR-NEW']),
    superseded_by('ADR-OLD', 'ADR-NEW'),
    \+ current_adr('ADR-OLD'),
    current_adr('ADR-NEW').

test(violation_term_to_dict_unwraps_typed_literals_and_atoms) :-
    checks:violation_term_to_dict(
        violation(
            'strict-fact-shape',
            '^^'('REQ-TYPED', 'http://www.w3.org/2001/XMLSchema#string'),
            '^^'("Typed description", 'http://www.w3.org/2001/XMLSchema#string'),
            literal(type('http://www.w3.org/2001/XMLSchema#string', 'Typed suggestion')),
            example_source
        ),
        JsonDict
    ),
    assertion(JsonDict.get(entityId) == "REQ-TYPED"),
    assertion(JsonDict.get(description) == "Typed description"),
    assertion(JsonDict.get(suggestion) == "Typed suggestion"),
    assertion(JsonDict.get(source) == "example_source").

test(with_output_to_string_and_file_base_name_helpers_normalize_output) :-
    checks:with_output_to_string(write(hello), String),
    checks:file_base_name("docs/specs/REQ-1.md", BaseWithPath),
    checks:file_base_name("REQ-2.md", BaseWithoutPath),
    assertion(String == "hello"),
    assertion(BaseWithPath == 'REQ-1.md'),
    assertion(BaseWithoutPath == 'REQ-2.md').

test(check_all_json_and_run_checks_json_serializes_entrypoints, [setup(setup_kb), cleanup((retractall(checks:halt(_)), cleanup_kb))]) :-
    checks:check_all_json(Json),
    atom_json_dict(Json, Dict, []),
    assertion(Dict.get(no_dangling_refs) == []),
    checks:redefine_system_predicate(halt(_)),
    assertz((checks:halt(_):-true)),
    with_output_to(string(RunJson), checks:run_checks_json),
    atom_json_dict(RunJson, RunDict, []),
    assertion(RunDict.get(no_cycles) == []).

test(value_field_helpers_cover_all_value_kinds) :-
    checks:is_value_field(value_string),
    checks:is_value_field(value_int),
    checks:is_value_field(value_number),
    checks:is_value_field(value_bool),
    checks:value_type_matches_field(string, [value_string="x"]),
    checks:value_type_matches_field(int, [value_int=1]),
    checks:value_type_matches_field(number, [value_number=1.5]),
    checks:value_type_matches_field(bool, [value_bool=true]).

test(violation_text_and_id_fallback_convert_compounds_to_strings) :-
    checks:violation_text(foo(bar), Text),
    checks:violation_id_text(foo(bar), IdText),
    assertion(Text == "foo(bar)"),
    assertion(IdText == "foo(bar)").

:- end_tests(checks_coverage_gaps).

:- begin_tests(kb_wrapper_coverage_gaps).

test(affected_symbols_falls_back_to_empty_list, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    assert_fixture_entity(req, 'REQ-NO-SYMBOLS', "No symbol req", active, []),
    affected_symbols('REQ-NO-SYMBOLS', Symbols),
    assertion(Symbols == []).

test(coverage_gap_reports_missing_scenario_when_direct_test_exists, [setup(setup_kb), cleanup(cleanup_kb), nondet]) :-
    assert_fixture_entity(req, 'REQ-MISSING-SCENARIO', "Req missing scenario", active, [priority=must]),
    assert_fixture_entity(test, 'TEST-DIRECT', "Direct test", active, []),
    kb_assert_relationship(validates, 'TEST-DIRECT', 'REQ-MISSING-SCENARIO', []),
    coverage_gap('REQ-MISSING-SCENARIO', missing_scenario).

test(coverage_gap_reports_missing_test_when_only_scenario_exists, [setup(setup_kb), cleanup(cleanup_kb), nondet]) :-
    assert_fixture_entity(req, 'REQ-MISSING-TEST', "Req missing test", active, [priority=must]),
    assert_fixture_entity(scenario, 'SCEN-ONLY', "Scenario only", active, []),
    kb_assert_relationship(specified_by, 'REQ-MISSING-TEST', 'SCEN-ONLY', []),
    coverage_gap('REQ-MISSING-TEST', missing_test).

test(symbol_has_req_coverage_wraps_production_symbol_coverage, [setup(setup_kb), cleanup(cleanup_kb), nondet]) :-
    assert_fixture_entity(req, 'REQ-COVERED', "Covered req", active, [priority=must]),
    assert_fixture_entity(test, 'TEST-COVERED', "Covered test", active, []),
    assert_fixture_entity(symbol, 'SYM-COVERED', "Covered symbol", active, []),
    kb_assert_relationship(validates, 'TEST-COVERED', 'REQ-COVERED', []),
    kb_assert_relationship(covered_by, 'SYM-COVERED', 'TEST-COVERED', []),
    kb:symbol_has_req_coverage('SYM-COVERED', 'REQ-COVERED').

test(values_conflict_covers_all_operator_pairs) :-
    kb:values_conflict(eq, 1, eq, 2, int),
    kb:values_conflict(eq, 7, neq, 7, int),
    kb:values_conflict(neq, 7, eq, 7, int),
    kb:values_conflict(lte, 2, gte, 3, int),
    kb:values_conflict(gte, 3, lte, 2, int),
    kb:values_conflict(lt, 2, gt, 2, int),
    kb:values_conflict(gt, 2, lt, 2, int),
    kb:values_conflict(lt, 2, gte, 2, int),
    kb:values_conflict(gte, 2, lt, 2, int),
    kb:values_conflict(lte, 2, gt, 3, int),
    kb:values_conflict(gt, 3, lte, 2, int).

test(check_req_contradiction_throws_actionable_error, [setup(setup_kb), cleanup(cleanup_kb), nondet]) :-
    assert_contradicting_requirement_pair('REQ-CHK-A', 5, 'REQ-CHK-B', 6),
    catch(
        check_req_contradiction('REQ-CHK-A'),
        error(kb_contradiction(Pairs), Message),
        ( assertion(Pairs \= []),
          assertion(sub_string(Message, _, _, _, "Conflicts with REQ-CHK-B")) )
    ).

test(check_req_contradiction_allows_direct_supersession, [setup(setup_kb), cleanup(cleanup_kb), nondet]) :-
    assert_contradicting_requirement_pair('REQ-SUPERSEDES-A', 5, 'REQ-SUPERSEDES-B', 6),
    kb_assert_relationship(supersedes, 'REQ-SUPERSEDES-A', 'REQ-SUPERSEDES-B', []),
    check_req_contradiction('REQ-SUPERSEDES-A').

:- end_tests(kb_wrapper_coverage_gaps).

:- begin_tests(derived_chr_pilot).

test(derived_coverage_gap_matches_existing_missing_scenario_and_test, [setup(setup_kb), cleanup((derived_chr:clear_chr_facts, cleanup_kb)), nondet]) :-
    assert_fixture_entity(req, 'REQ-CHR-GAP', "CHR gap req", active, [priority=must]),
    coverage_gap('REQ-CHR-GAP', ExistingReason),
    derived_chr:derive_chr_facts,
    derived_chr:derived_coverage_gap('REQ-CHR-GAP', DerivedReason),
    assertion(DerivedReason == ExistingReason).

test(derived_symbol_gap_matches_existing_no_qualifying_coverage, [setup(setup_kb), cleanup((derived_chr:clear_chr_facts, cleanup_kb)), nondet]) :-
    assert_fixture_entity(symbol, 'SYM-CHR-GAP', "CHR uncovered symbol", active, []),
    symbol_no_req_coverage('SYM-CHR-GAP', ExistingReason),
    derived_chr:derive_chr_facts,
    derived_chr:derived_symbol_gap('SYM-CHR-GAP', DerivedReason),
    assertion(DerivedReason == ExistingReason).

:- end_tests(derived_chr_pilot).

:- begin_tests(sparql_client_wrapper).

test(remote_sparql_rejects_empty_endpoint, [throws(error(domain_error(non_empty_atom, endpoint), _))]) :-
    kibi_sparql_client:remote_sparql_select_json('', 'SELECT * WHERE { ?s ?p ?o }', [], _Json).

test(remote_sparql_rejects_empty_query, [throws(error(domain_error(non_empty_atom, query), _))]) :-
    kibi_sparql_client:remote_sparql_select_json('https://example.org/sparql', '', [], _Json).

test(remote_sparql_rejects_non_select_query, [throws(error(domain_error(sparql_select_query, 'CONSTRUCT WHERE { ?s ?p ?o }'), _))]) :-
    kibi_sparql_client:remote_sparql_select_json('https://example.org/sparql', 'CONSTRUCT WHERE { ?s ?p ?o }', [], _Json).

test(remote_sparql_rejects_unsupported_result_format, [throws(error(domain_error(sparql_client_option, result_format(xml)), _))]) :-
    kibi_sparql_client:remote_sparql_select_json('https://example.org/sparql', 'SELECT * WHERE { ?s ?p ?o }', [result_format(xml)], _Json).

test(remote_sparql_rejects_local_file_endpoint, [throws(error(domain_error(remote_http_endpoint, 'file:///tmp/kibi.ttl'), _))]) :-
    kibi_sparql_client:remote_sparql_select_json('file:///tmp/kibi.ttl', 'SELECT * WHERE { ?s ?p ?o }', [], _Json).

test(remote_sparql_rejects_localhost_endpoint, [throws(error(domain_error(public_remote_endpoint, 'http://localhost:3030/sparql'), _))]) :-
    kibi_sparql_client:remote_sparql_select_json('http://localhost:3030/sparql', 'SELECT * WHERE { ?s ?p ?o }', [], _Json).

:- end_tests(sparql_client_wrapper).

:- begin_tests(kb_internal_coverage_gaps).

test(kb_internal_helpers_cover_remaining_predicates, [setup(setup_kb), cleanup((retractall(kb:changed_symbol(_)), retractall(kb:changed_symbol_req(_, _)), retractall(kb:changed_symbol_loc(_, _, _, _, _)), cleanup_kb))]) :-
    kb:'rdf meta specification'(kb_entity(_, _, _), kb_entity(?, ?, ?)),
    kb:'rdf meta specification'(kb_relationship(_, _, _), kb_relationship(?, ?, ?)),
    assert_fixture_entity(req, 'REQ-CONNECT-A', "Connect A", active, []),
    assert_fixture_entity(req, 'REQ-CONNECT-B', "Connect B", active, []),
    assert_fixture_entity(req, 'REQ-CONNECT-C', "Connect C", active, []),
    kb_assert_relationship(depends_on, 'REQ-CONNECT-A', 'REQ-CONNECT-B', []),
    kb_assert_relationship(depends_on, 'REQ-CONNECT-B', 'REQ-CONNECT-C', []),
    kb:connected_entity('REQ-CONNECT-A', 'REQ-CONNECT-C', ['REQ-CONNECT-A']),
    impacted_by_change('REQ-CONNECT-A', 'REQ-CONNECT-A'),
    assert_fixture_entity(adr, 'ADR-NOT-DEPRECATED', "Current ADR", accepted, []),
    deprecated_still_used('ADR-NOT-DEPRECATED', []),
    assert_fixture_entity(test, 'TEST-REQ-BY', "Req verified_by test", active, []),
    assert_fixture_entity(req, 'REQ-REQ-BY', "Req verified_by", active, []),
    kb_assert_relationship(verified_by, 'REQ-REQ-BY', 'TEST-REQ-BY', []),
    kb:requirement_verified_by_test('REQ-REQ-BY', 'TEST-REQ-BY'),
    kb:compatible_types(number, int),
    kb:unit_compatible(ms, ''),
    kb:unit_compatible(ms, ms),
    kb:scope_intersects(global, ''),
    kb:is_numeric_type(number),
    kb:unwrap_rdf_value(raw_value, raw_value),
    kb:value_from_props([], unknown, ''),
    kb:normalize_term_atom(literal(type('http://www.w3.org/2001/XMLSchema#string', 'typed-value')), TypedAtom),
    assertion(TypedAtom == 'typed-value'),
    kb:normalize_term_atom(foo(bar), CompoundAtom),
    assertion(CompoundAtom == 'foo(bar)'),
    kb:coerce_timestamp_atom(literal(type('http://www.w3.org/2001/XMLSchema#string', '2026-05-01T00:00:00Z')), TypedTs),
    assertion(TypedTs == '2026-05-01T00:00:00Z'),
    kb:coerce_timestamp_atom(foo(bar), CompoundTs),
    assertion(CompoundTs == 'foo(bar)'),
    assert_fixture_entity(symbol, 'SYM-UNCOVERED', "Uncovered symbol", active, []),
    kb:symbol_uncovered('SYM-UNCOVERED'),
    assert_fixture_entity(symbol, 'SYM-MIXED', "Mixed role symbol", active, []),
    assert_fixture_entity(test, 'TEST-MIXED-EXEC', "Mixed exec test", active, []),
    assert_fixture_entity(test, 'TEST-MIXED-COVER', "Mixed cover test", active, []),
    kb_assert_relationship(executable_for, 'SYM-MIXED', 'TEST-MIXED-EXEC', []),
    assert_raw_relationship(covered_by, 'SYM-MIXED', 'TEST-MIXED-COVER'),
    mixed_role_symbol('SYM-MIXED'),
    assert_fixture_entity(symbol, 'SYM-CHANGED', "Changed symbol", active, []),
    assert_fixture_entity(fact, 'FACT-STRICT-SUBJECT', "Strict subject", active, [fact_kind=subject, subject_key="strict.internal"]),
    assert_fixture_entity(fact, 'FACT-STRICT-PROP', "Strict property", active, [fact_kind=property_value, subject_key="strict.internal", property_key="mode", operator=eq, value_type=string, value_string="on"]),
    kb:validate_strict_lane_pairing(constrains, 'REQ-CONNECT-A', 'FACT-STRICT-SUBJECT'),
    kb:validate_strict_lane_pairing(requires_property, 'REQ-CONNECT-A', 'FACT-STRICT-PROP'),
    kb:validate_strict_lane_pairing(relates_to, 'REQ-CONNECT-A', 'FACT-STRICT-PROP'),
    kb:polarity_conflict(subject_key, property_key, eq, bool, true, '', '', require, eq, bool, true, '', '', forbid, Reason),
    assertion(sub_string(Reason, _, _, _, "Polarity conflict")),
    kb:test_matches_required_semantic([verification_scope="global"], verification_scope, global),
    assertz(kb:changed_symbol('SYM-CHANGED')),
    assertz(kb:changed_symbol_req('SYM-CHANGED', 'REQ-CONNECT-A')),
    assertz(kb:changed_symbol_loc('SYM-CHANGED', 'src/file.ts', 10, 2, 'changedSymbol')),
    kb:changed_symbol_missing_req('SYM-CHANGED', 2, 1),
    kb:changed_symbol_violation('SYM-CHANGED', 2, 1, 'src/file.ts', 10, 2, 'changedSymbol').

test(legacy_conversion_and_persistent_helpers_are_exercised, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb:convert_legacy_props([title("Legacy"), status-active, source="test://legacy", flagged], Props),
    memberchk(title="Legacy", Props),
    memberchk(status=active, Props),
    memberchk(source="test://legacy", Props),
    memberchk(flagged=true, Props),
    kb:asserta_changeset('2026-05-01T00:00:00Z', upsert, 'ENTITY-1', req-[id='ENTITY-1']),
    changeset('2026-05-01T00:00:00Z', upsert, 'ENTITY-1', req-[id='ENTITY-1']),
    kb:retract_changeset('2026-05-01T00:00:00Z', upsert, 'ENTITY-1', req-[id='ENTITY-1']),
    \+ changeset('2026-05-01T00:00:00Z', upsert, 'ENTITY-1', req-[id='ENTITY-1']),
    kb:asserta_changeset('2026-05-01T00:00:01Z', upsert, 'ENTITY-2', req-[id='ENTITY-2']),
    kb:retractall_changeset(_AnyTs, upsert, 'ENTITY-2', req-[id='ENTITY-2']),
    \+ changeset(_, upsert, 'ENTITY-2', req-[id='ENTITY-2']).

test(cleanup_temp_file_removes_existing_temp_file, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    TempFile = '/tmp/kibi-test-kb/temp-artifact.tmp',
    open(TempFile, write, Stream),
    close(Stream),
    exists_file(TempFile),
    kb:cleanup_temp_file(TempFile),
    \+ exists_file(TempFile).

:- end_tests(kb_internal_coverage_gaps).

% Test setup/cleanup helpers
assert_fixture_entity(Type, Id, Title, Status, ExtraProps) :-
    append([
        id=Id,
        title=Title,
        status=Status,
        created_at="2026-05-01T00:00:00Z",
        updated_at="2026-05-01T00:00:00Z",
        source="test://kb.plt"
    ], ExtraProps, Props),
    kb_assert_entity(Type, Props).

verification_receipt_json(TestId, Snapshot, Outcome, StartedAt, FinishedAt, Json) :-
    verification_receipt_json_with_id('VR-TEST-00000001', TestId, Snapshot, Outcome, StartedAt, FinishedAt, Json).

verification_receipt_json_with_id(ReceiptId, TestId, Snapshot, Outcome, StartedAt, FinishedAt, Json) :-
    Receipt = _{
        version: 'kibi.verification-receipt.v1',
        receipt_id: ReceiptId,
        test_id: TestId,
        runner: 'plunit',
        command: 'bun test packages/core/tests/kb.plt',
        scope: end_to_end,
        outcome: Outcome,
        code_snapshot: Snapshot,
        environment_hash: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        started_at: StartedAt,
        finished_at: FinishedAt,
        artifact_digest: 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc'
    },
    atom_json_dict(JsonAtom, [Receipt], []),
    atom_string(JsonAtom, Json).

assert_raw_entity(Type, Id, Props) :-
    kb:kb_graph(Graph),
    atom_string(Type, TypeString),
    format(atom(EntityUri), 'kb:entity/~w', [Id]),
    kb:with_kb_mutex((
        rdf_retractall(EntityUri, _, _, Graph),
        rdf_assert(EntityUri, kb:type, TypeString^^'http://www.w3.org/2001/XMLSchema#string', Graph),
        forall(member(Key=Value, Props), kb:store_property(EntityUri, Key, Value, Graph))
    )).

assert_raw_relationship(RelType, FromId, ToId) :-
    kb:kb_graph(Graph),
    kb:kb_uri(BaseUri),
    atom_concat(BaseUri, RelType, RelUri),
    format(atom(FromUri), 'kb:entity/~w', [FromId]),
    format(atom(ToUri), 'kb:entity/~w', [ToId]),
    kb:with_kb_mutex((
        rdf_retractall(FromUri, RelUri, ToUri, Graph),
        rdf_assert(FromUri, RelUri, ToUri, Graph)
    )).

assert_contradicting_requirement_pair(ReqA, ValueA, ReqB, ValueB) :-
    assert_fixture_entity(fact, 'FACT-CONFLICT-SUBJECT', "Conflict subject", active, [fact_kind=subject, subject_key="api.quota"]),
    assert_fixture_entity(fact, 'FACT-CONFLICT-A', "Conflict A", active, [fact_kind=property_value, subject_key="api.quota", property_key="rate_limit", operator=eq, value_type=int, value_int=ValueA, claim_key="CLAIM-AAAAAAAAAAAAAAAA", claim_text="API quota must equal the first value"]),
    assert_fixture_entity(fact, 'FACT-CONFLICT-B', "Conflict B", active, [fact_kind=property_value, subject_key="api.quota", property_key="rate_limit", operator=eq, value_type=int, value_int=ValueB, claim_key="CLAIM-BBBBBBBBBBBBBBBB", claim_text="API quota must equal the second value"]),
    assert_fixture_entity(req, ReqA, "Conflicting req A", open, []),
    assert_fixture_entity(req, ReqB, "Conflicting req B", open, []),
    kb_assert_relationship(constrains, ReqA, 'FACT-CONFLICT-SUBJECT', []),
    kb_assert_relationship(constrains, ReqB, 'FACT-CONFLICT-SUBJECT', []),
    kb_assert_relationship(requires_property, ReqA, 'FACT-CONFLICT-A', []),
    kb_assert_relationship(requires_property, ReqB, 'FACT-CONFLICT-B', []).

assert_rule_requirement_pair(BodyNameA, BodyNameB) :-
    rule_fixture_json(oblige, BodyNameA, RuleJsonA),
    rule_fixture_json(forbid, BodyNameB, RuleJsonB),
    assert_fixture_entity(fact, 'FACT-RULE-ALLOW', "Allow governed action", active, [
        fact_kind=rule,
        rule_ir=RuleJsonA,
        rule_hash="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        rule_schema_id="FACT-RULE-SCHEMA-TEST",
        rule_name="governed_action_rule",
        semantic_key="governed_action_rule:allow",
        claim_key="CLAIM-CCCCCCCCCCCCCCCC",
        claim_text="Customers must perform governed action",
        claim_span_start=0,
        claim_span_end=37
    ]),
    assert_fixture_entity(fact, 'FACT-RULE-DENY', "Deny governed action", active, [
        fact_kind=rule,
        rule_ir=RuleJsonB,
        rule_hash="bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        rule_schema_id="FACT-RULE-SCHEMA-TEST",
        rule_name="governed_action_rule",
        semantic_key="governed_action_rule:deny",
        claim_key="CLAIM-DDDDDDDDDDDDDDDD",
        claim_text="Customers must not perform governed action",
        claim_span_start=0,
        claim_span_end=41
    ]),
    assert_fixture_entity(req, 'REQ-RULE-ALLOW', "Allow governed action", open, []),
    assert_fixture_entity(req, 'REQ-RULE-DENY', "Deny governed action", open, []),
    kb_assert_relationship(requires_rule, 'REQ-RULE-ALLOW', 'FACT-RULE-ALLOW', []),
    kb_assert_relationship(requires_rule, 'REQ-RULE-DENY', 'FACT-RULE-DENY', []).

rule_fixture_json(Modality, BodyName, Json) :-
    Dict = _{
        version:'kibi.logic.v1',
        kind:rule,
        modality:Modality,
        head:_{kind:atom, name:governed_action, args:[]},
        body:_{kind:atom, name:BodyName, args:[]},
        variables:[]
    },
    atom_json_dict(JsonAtom, Dict, []),
    atom_string(JsonAtom, Json).

json_string_dict(JsonString, Dict) :-
    atom_string(JsonAtom, JsonString),
    atom_json_dict(JsonAtom, Dict, [value_string_as(atom)]).

coverage_row(Rows, Id, Row) :-
    member(Row, Rows),
    Row.id == Id.

seed_coverage_depth_fixture :-
    assert_fixture_entity(req, 'REQ-DIRECT-E2E', "Direct E2E", active, [priority=must]),
    assert_fixture_entity(test, 'TEST-DIRECT-E2E', "Direct E2E test", passing, [verification_scope=end_to_end, verification_perspective=consumer]),
    kb_assert_relationship(verified_by, 'REQ-DIRECT-E2E', 'TEST-DIRECT-E2E', []),

    assert_fixture_entity(req, 'REQ-SCENARIO-E2E', "Scenario E2E", active, [priority=must]),
    assert_fixture_entity(scenario, 'SCEN-SCENARIO-E2E', "Scenario E2E scenario", active, []),
    assert_fixture_entity(test, 'TEST-SCENARIO-E2E', "Scenario E2E test", passing, [verification_scope=end_to_end]),
    kb_assert_relationship(specified_by, 'REQ-SCENARIO-E2E', 'SCEN-SCENARIO-E2E', []),
    kb_assert_relationship(validates, 'TEST-SCENARIO-E2E', 'SCEN-SCENARIO-E2E', []),

    assert_fixture_entity(req, 'REQ-UNIT-ONLY', "Unit only", active, [priority=must]),
    assert_fixture_entity(test, 'TEST-UNIT-ONLY', "Unit only test", passing, [verification_scope=unit]),
    kb_assert_relationship(verified_by, 'REQ-UNIT-ONLY', 'TEST-UNIT-ONLY', []),

    assert_fixture_entity(req, 'REQ-NONPASSING', "Nonpassing only", active, [priority=must]),
    assert_fixture_entity(test, 'TEST-NONPASSING-OPEN', "Open test", open, [verification_scope=end_to_end]),
    assert_fixture_entity(test, 'TEST-NONPASSING-FAILING', "Failing test", failing, [verification_scope=unit]),
    kb_assert_relationship(verified_by, 'REQ-NONPASSING', 'TEST-NONPASSING-OPEN', []),
    kb_assert_relationship(validates, 'TEST-NONPASSING-FAILING', 'REQ-NONPASSING', []),

    assert_fixture_entity(req, 'REQ-SCENARIO-ONLY', "Scenario only", active, [priority=must]),
    assert_fixture_entity(scenario, 'SCEN-SCENARIO-ONLY', "Scenario only scenario", active, []),
    kb_assert_relationship(specified_by, 'REQ-SCENARIO-ONLY', 'SCEN-SCENARIO-ONLY', []),

    assert_fixture_entity(req, 'REQ-NO-EVIDENCE', "No evidence", active, [priority=must]).

setup_kb :-
    cleanup_test_kb,
    test_kb_dir(Dir),
    kb_attach(Dir).

cleanup_kb :-
    kb_detach,
    cleanup_test_kb.

cleanup_test_kb :-
    kb_detach,
    test_kb_dir(Dir),
    (   exists_directory(Dir)
    ->  delete_directory_and_contents(Dir)
    ;   true
    ).
