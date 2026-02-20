% PLUnit test suite for kb.pl
:- use_module('../src/kb.pl').
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
    kb_detach,
    % Second session: reattach and verify
    kb_attach(Dir),
    kb_entity('persistent-req', Type, Props),
    assertion(Type == req),
    memberchk(title=TitleVal, Props),
    assertion(TitleVal = ^^("Persistent Entity", _)),
    kb_detach.

:- end_tests(kb_persistence).

:- begin_tests(kb_audit).

test(audit_log_created, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(req, [
        id='audit-test',
        title="Audit Test",
        status=draft,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    % Verify audit log entry exists (check database, not just file)
    changeset(_, upsert, 'audit-test', _).

:- end_tests(kb_audit).

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

test(transitively_implements_via_test, [setup(setup_kb), cleanup(cleanup_kb)]) :-
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
    transitively_implements('sym-b', 'req-b').

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
        status=archived,
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

:- end_tests(kb_inference).

% Test setup/cleanup helpers
setup_kb :-
    cleanup_test_kb,
    test_kb_dir(Dir),
    kb_attach(Dir).

cleanup_kb :-
    kb_detach,
    cleanup_test_kb.

cleanup_test_kb :-
    test_kb_dir(Dir),
    (   exists_directory(Dir)
    ->  delete_directory_and_contents(Dir)
    ;   true
    ).
