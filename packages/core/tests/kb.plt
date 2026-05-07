% PLUnit test suite for kb.pl
:- use_module('../src/kb.pl').
:- use_module('../src/checks.pl').
:- use_module(library(plunit)).
:- use_module(library(filesex)).

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
        text_ref="documentation/requirements/REQ-AUDIT.md#L10"
    ]),
    kb_retract_entity('audit-delete-test'),
    changeset(_, delete, 'audit-delete-test', req-Props),
    memberchk(id='audit-delete-test', Props),
    memberchk(title="Audit Delete Test", Props),
    memberchk(source="test://kb.plt", Props),
    memberchk(text_ref="documentation/requirements/REQ-AUDIT.md#L10", Props).

:- end_tests(kb_audit).

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

:- end_tests(kb_strict_facts).

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

% Test setup/cleanup helpers
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
