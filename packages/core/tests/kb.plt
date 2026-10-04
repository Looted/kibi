% PLUnit test suite for kb.pl
:- encoding(utf8).
:- use_module('../src/kb.pl').
:- use_module('../src/checks.pl').
:- use_module('../src/semantic_quality.pl').
:- use_module('../src/units.pl').
:- use_module('../src/discovery.pl').
:- use_module('../src/derived_chr.pl').
:- use_module('../src/sparql_client.pl').
:- use_module('../src/status.pl', []).
:- use_module(library(http/json)).
:- use_module(library(date)).
:- use_module(library(plunit)).
:- use_module(library(semweb/rdf11)).
:- use_module(library(filesex)).
:- use_module(library(process)).
:- use_module(library(readutil)).

:- dynamic test_kb_root/1.
:- dynamic test_kb_store/1.
:- dynamic test_kb_store_sequence/1.
:- dynamic test_source_directory/1.
:- dynamic isolation_child_process/1.
:- dynamic isolation_child_barrier/1.
:- prolog_load_context(directory, TestDirectory),
   assertz(test_source_directory(TestDirectory)).
:- initialization(init_test_kb_root).
:- at_halt(cleanup_test_kb_root).

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

% Every PLUnit process owns one private root. Each test removes only its
% child store during cleanup; the root remains stable until process exit.
% Keeping both levels process-local prevents concurrent swipl invocations from
% attaching to or deleting the same RDF store.
init_test_kb_root :-
    tmp_file(kibi_test_kb, Root),
    make_directory_path(Root),
    assertz(test_kb_root(Root)),
    assertz(test_kb_store_sequence(0)).

test_kb_dir(Dir) :-
    (   test_kb_store(Dir)
    ->  true
    ;   test_kb_root(Root),
        retract(test_kb_store_sequence(Previous)),
        Next is Previous + 1,
        assertz(test_kb_store_sequence(Next)),
        format(atom(StoreName), 'store-~d', [Next]),
        directory_file_path(Root, StoreName, Dir),
        assertz(test_kb_store(Dir))
    ).

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

test(two_process_stores_are_isolated, [setup(cleanup_test_kb), cleanup(cleanup_test_kb)]) :-
    test_kb_root(Root),
    make_directory_path(Root),
    test_source_directory(TestDirectory),
    directory_file_path(TestDirectory, 'kb.plt', TestSource),
    directory_file_path(Root, ready_a, ReadyA),
    directory_file_path(Root, ready_b, ReadyB),
    directory_file_path(Root, done_a, DoneA),
    directory_file_path(Root, done_b, DoneB),
    directory_file_path(Root, release, Release),
    directory_file_path(Root, cleanup, Cleanup),
    assertz(isolation_child_barrier(Release)),
    assertz(isolation_child_barrier(Cleanup)),
    start_isolation_writer(TestSource, 'PROC-STORE-A', ReadyA, DoneA, Release, Cleanup, PidA),
    start_isolation_writer(TestSource, 'PROC-STORE-B', ReadyB, DoneB, Release, Cleanup, PidB),
    wait_for_isolation_files([ReadyA, ReadyB], 1000),
    write_isolation_barrier(Release),
    wait_for_isolation_files([DoneA, DoneB], 1000),
    read_isolation_store(ReadyA, StoreA),
    read_isolation_store(ReadyB, StoreB),
    assertion(StoreA \= StoreB),
    kb_attach(StoreA),
    assertion(kb_entity('PROC-STORE-A', fact, _)),
    assertion(\+ kb_entity('PROC-STORE-B', _, _)),
    kb_detach,
    kb_attach(StoreB),
    assertion(kb_entity('PROC-STORE-B', fact, _)),
    assertion(\+ kb_entity('PROC-STORE-A', _, _)),
    kb_detach,
    write_isolation_barrier(Cleanup),
    wait_isolation_child(PidA),
    wait_isolation_child(PidB).

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

test(retracts_one_relationship_without_clearing_siblings, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    forall(member(Id, ['REQ-EDGE-A', 'REQ-EDGE-B', 'REQ-EDGE-C']),
           kb_assert_entity(req, [
               id=Id,
               title="Relationship delta fixture",
               status=active,
               created_at="2026-08-12T00:00:00Z",
               updated_at="2026-08-12T00:00:00Z",
               source="test://relationship-delta"
           ])),
    kb_assert_relationship(relates_to, 'REQ-EDGE-A', 'REQ-EDGE-B', []),
    kb_assert_relationship(relates_to, 'REQ-EDGE-A', 'REQ-EDGE-C', []),
    kb_retract_relationship(relates_to, 'REQ-EDGE-A', 'REQ-EDGE-B'),
    \+ kb_relationship(relates_to, 'REQ-EDGE-A', 'REQ-EDGE-B'),
    kb_relationship(relates_to, 'REQ-EDGE-A', 'REQ-EDGE-C').

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

% A reloaded store carries expanded property URIs ('urn-kibi:Key') rather
% than the in-session 'kb:Key' atoms; the bounded proof-contract projection
% must still find every contracted test and project its source.
test(proof_contract_projection_survives_reload, [setup(cleanup_test_kb), cleanup(cleanup_test_kb)]) :-
    test_kb_dir(Dir),
    kb_attach(Dir),
    assert_fixture_entity(test, 'TEST-RELOADED', "Reloaded test", active, [
        source=".kb/tests/TEST-RELOADED.md",
        proof_contract="{\"version\":\"kibi.proof-contract.v1\"}",
        proof_bindings="[{\"symbol_id\":\"SYM-RELOADED\"}]",
        proof_receipts="[{\"history\":\"large\"}]"
    ]),
    kb_save,
    kb_detach,
    kb_attach(Dir),
    kb_query_proof_contracts(none, 10, 0, Rows),
    kb_detach,
    assertion(Rows = [['TEST-RELOADED', test, _]]),
    Rows = [[_, _, Projected]],
    assertion(memberchk(proof_contract=_, Projected)),
    assertion(memberchk(proof_bindings=_, Projected)),
    assertion((memberchk(source=Source, Projected),
               Source = ^^(".kb/tests/TEST-RELOADED.md", _))),
    assertion(\+ memberchk(proof_receipts=_, Projected)).

% SWI-Prolog's rdf_db cannot write a journal for a graph whose URI is ~230
% characters or longer, which broke every write in a deeply nested workspace.
% A journaled store at such a path must still commit and reload its data.
test(journaled_store_survives_long_workspace_path, [setup(cleanup_test_kb), cleanup(cleanup_test_kb)]) :-
    test_kb_dir(Base),
    length(Filler, 60),
    maplist(=(0'x), Filler),
    atom_codes(Segment, Filler),
    atomic_list_concat([Base, Segment, Segment, Segment, Segment], '/', Dir),
    atom_length(Dir, Length),
    assertion(Length > 250),
    make_directory_path(Dir),
    atom_concat(Dir, '/storage.json', Marker),
    setup_call_cleanup(
        open(Marker, write, Out),
        format(Out, '{"format":"kibi.rdf-journal.v1","schemaVersion":1}~n', []),
        close(Out)),
    kb_attach(Dir),
    kb_commit_upsert(req, [
        id='long-path-req',
        title="Long path entity",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ], [], true, ChangeKind),
    assertion(ChangeKind == created),
    kb_detach,
    kb_attach(Dir),
    kb_entity('long-path-req', Type, _),
    kb_detach,
    assertion(Type == req).

:- end_tests(kb_persistence).

:- begin_tests(kb_entity_memo).

% kb_entity/3 memoizes decoded property lists per RDF generation. Every
% store change must be visible on the very next read.
memo_title(Id, Title) :-
    kb_entity(Id, _, Props),
    memberchk(title=Raw, Props),
    (Raw = ^^(Title0, _) -> true ; Title0 = Raw),
    atom_string(Title0, Title).

test(memo_sees_updates_rollbacks_and_deletes, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    assert_fixture_entity(req, 'REQ-MEMO', "Before", active, []),
    memo_title('REQ-MEMO', Before),
    assertion(Before == "Before"),
    memo_title('REQ-MEMO', BeforeAgain),
    assertion(BeforeAgain == "Before"),
    assert_fixture_entity(req, 'REQ-MEMO', "After", active, []),
    memo_title('REQ-MEMO', After),
    assertion(After == "After"),
    catch(rdf_transaction((
              assert_fixture_entity(req, 'REQ-MEMO', "Rolled back", active, []),
              memo_title('REQ-MEMO', Inside),
              assertion(Inside == "Rolled back"),
              throw(rollback_probe)
          )),
          rollback_probe,
          true),
    memo_title('REQ-MEMO', AfterRollback),
    assertion(AfterRollback == "After"),
    kb_retract_entity('REQ-MEMO'),
    assertion(\+ kb_entity('REQ-MEMO', _, _)).

test(memo_does_not_leak_across_stores, [setup(cleanup_test_kb), cleanup(cleanup_test_kb)]) :-
    test_kb_root(Root),
    directory_file_path(Root, memo_a, StoreA),
    directory_file_path(Root, memo_b, StoreB),
    kb_attach(StoreA),
    assert_fixture_entity(req, 'REQ-MEMO-STORE', "Store A", active, []),
    memo_title('REQ-MEMO-STORE', InA),
    assertion(InA == "Store A"),
    kb_save,
    kb_detach,
    kb_attach(StoreB),
    assertion(\+ kb_entity('REQ-MEMO-STORE', _, _)),
    kb_detach,
    delete_directory_and_contents(StoreA),
    delete_directory_and_contents(StoreB).

% Incremental index rows are Prolog facts an RDF rollback does not undo,
% while rdf_generation reverts. The index check must still notice.
test(index_verification_survives_rollback, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    assert_fixture_entity(req, 'REQ-IDX-KEPT', "Kept", active, []),
    kb_query_entities(req, none, [], none, 10, 0, _, Before),
    assertion(Before == 1),
    catch(rdf_transaction((
              assert_fixture_entity(req, 'REQ-IDX-ROLLED', "Rolled", active, []),
              throw(rollback_probe)
          )),
          rollback_probe,
          true),
    kb_query_entities(req, 'REQ-IDX-ROLLED', [], none, 10, 0, _, Rolled),
    assertion(Rolled == 0),
    kb_query_entities(req, none, [], none, 10, 0, _, After),
    assertion(After == 1).

coverage_row_ids(Ids) :-
    discovery:coverage_report_json(req, [], true, true, 100, 0, unknown,
                                   '2026-09-27T00:00:00Z', 604800, Json),
    atom_json_dict(Json, Dict, []),
    findall(Id, (member(Row, Dict.rows), atom_string(Id, Row.id)), Ids).

test(coverage_memo_reflects_store_changes, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    assert_fixture_entity(req, 'REQ-COV-A', "Coverage A", active, []),
    coverage_row_ids(First),
    assertion(First == ['REQ-COV-A']),
    coverage_row_ids(Repeat),
    assertion(Repeat == First),
    assert_fixture_entity(req, 'REQ-COV-B', "Coverage B", active, []),
    coverage_row_ids(Second),
    assertion(Second == ['REQ-COV-A', 'REQ-COV-B']).

% Receipt-history validation is memoized by content. Both outcomes must be
% cached (a helper that fails for one outcome silently recomputes forever)
% and a cached answer must equal a fresh one.
well_formed_history(TestId, Json, WellFormed) :-
    requirement_proof:inventory_entries(Json, Receipts),
    requirement_proof:pure_memo(receipt_history_well_formed, TestId-Receipts,
                                receipt_history_well_formed, WellFormed).

memoized(TestId, Json) :-
    requirement_proof:inventory_entries(Json, Receipts),
    variant_sha1(receipt_history_well_formed-(TestId-Receipts), Key),
    requirement_proof:pure_memo(Key, receipt_history_well_formed, _).

test(receipt_history_memo_caches_both_outcomes) :-
    retractall(requirement_proof:pure_memo(_, _, _)),
    proof_receipt_json('TEST-MEMO-RECEIPT',
                       'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
                       passed, '2026-09-27T00:00:00Z', '2026-09-27T00:01:00Z', Valid),
    % Production asks "is this history ill-formed?" with the output bound.
    assertion(\+ well_formed_history('TEST-MEMO-RECEIPT', Valid, false)),
    assertion(memoized('TEST-MEMO-RECEIPT', Valid)),
    well_formed_history('TEST-MEMO-RECEIPT', Valid, First),
    assertion(First == true),
    well_formed_history('TEST-MEMO-RECEIPT', Valid, Second),
    assertion(Second == true),
    % The same receipt claims a different test: shape-invalid for this one.
    well_formed_history('TEST-OTHER', Valid, Mismatch),
    assertion(Mismatch == false),
    assertion(memoized('TEST-OTHER', Valid)),
    well_formed_history('TEST-OTHER', Valid, MismatchAgain),
    assertion(MismatchAgain == false).

:- end_tests(kb_entity_memo).

:- begin_tests(search_candidates).

% Search candidates are projected rows: ranking fields only, never receipt
% histories or other large structured properties.
test(search_candidates_are_projected, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    assert_fixture_entity(test, 'TEST-SEARCH-PROJ', "Projected search test", active, [
        source="docs/search-proj.md",
        tags=[proof],
        proof_contract="{\"version\":\"kibi.proof-contract.v1\"}",
        proof_receipts="[{\"history\":\"large\"}]"
    ]),
    kb_search_entities(test, "projected search", 10, 0, Rows, Count),
    assertion(Count == 1),
    assertion(Rows = [['TEST-SEARCH-PROJ', test, _]]),
    Rows = [[_, _, Props]],
    assertion(memberchk(title=_, Props)),
    assertion(memberchk(source=_, Props)),
    assertion(memberchk(tags=_, Props)),
    assertion(\+ memberchk(proof_receipts=_, Props)),
    assertion(\+ memberchk(proof_contract=_, Props)),
    kb_entity('TEST-SEARCH-PROJ', test, Full),
    assertion(memberchk(proof_receipts=_, Full)).

test(list_search_candidates_pages_projected_rows_by_id, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    forall(member(Id, ['REQ-LIST-C', 'REQ-LIST-A', 'REQ-LIST-B']),
           assert_fixture_entity(req, Id, "Listed", active, [])),
    assert_fixture_entity(test, 'TEST-LIST', "Listed test", active, [
        proof_receipts="[{\"history\":\"large\"}]"
    ]),
    kb_list_search_candidates(req, 2, 0, First, Count),
    kb_list_search_candidates(req, 2, 2, Second, _),
    assertion(Count == 3),
    findall(Id, member([Id, _, _], First), FirstIds),
    findall(Id, member([Id, _, _], Second), SecondIds),
    assertion(FirstIds == ['REQ-LIST-A', 'REQ-LIST-B']),
    assertion(SecondIds == ['REQ-LIST-C']),
    kb_list_search_candidates(none, 10, 0, All, AllCount),
    assertion(AllCount == 4),
    forall(member([_, _, Props], All),
           assertion(\+ memberchk(proof_receipts=_, Props))),
    kb_entity_ids(Ids),
    assertion(Ids == ['REQ-LIST-A', 'REQ-LIST-B', 'REQ-LIST-C', 'TEST-LIST']).

:- end_tests(search_candidates).

:- begin_tests(status_freshness).

% Freshness scans every knowledge-lane and documentation file. The content
% test must be deterministic and run after the cheap mtime test: repeated
% id:/title:/status: keys previously produced a combinatorial number of
% redos per unchanged file (minutes of status time on real workspaces).
test(entity_documentation_check_is_deterministic_and_mtime_first) :-
    tmp_file_stream(text, File, Stream),
    format(Stream, "---~n", []),
    forall(between(1, 200, N),
           format(Stream, "id: X~d~ntitle: T~d~nstatus: active~n", [N, N])),
    format(Stream, "---~n", []),
    close(Stream),
    time_file(File, Modified),
    call_cleanup(status:newer_entity_documentation_file(File, 0), Det = true),
    assertion(Det == true),
    Future is Modified + 3600,
    statistics(inferences, I0),
    assertion(\+ status:newer_entity_documentation_file(File, Future)),
    statistics(inferences, I1),
    assertion(I1 - I0 < 1000),
    delete_file(File).

:- end_tests(status_freshness).

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

test(indexed_search_materializes_only_matching_page, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(req, [
        id='REQ-SEARCH-UNIQUE',
        title="Quasar authentication boundary",
        status=active,
        created_at="2026-08-12T00:00:00Z",
        updated_at="2026-08-12T00:00:00Z",
        source="documentation/generated-requirements.yaml",
        tags=[security]
    ]),
    kb_assert_entity(req, [
        id='REQ-SEARCH-OTHER',
        title="Unrelated cache policy",
        status=active,
        created_at="2026-08-12T00:00:00Z",
        updated_at="2026-08-12T00:00:00Z",
        source="documentation/generated-requirements.yaml"
    ]),
    kb_search_entities(req, "quasar auth", 10, 0, Rows, Count),
    assertion(Count == 1),
    Rows = [['REQ-SEARCH-UNIQUE', req, _]].

test(proof_contract_projection_pages_without_receipt_histories, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    Contract = _{
        version: 'kibi.proof-contract.v1',
        integration: 'self-proof',
        required_proofs: [_{symbol_id: 'SYM-PROJECTION', target: default}],
        success_policy: all_required_first_attempt
    },
    atom_json_dict(ContractAtom, Contract, []),
    atom_string(ContractAtom, ContractJson),
    length(PaddingCodes, 8192),
    maplist(=('x'), PaddingCodes),
    string_chars(Padding, PaddingCodes),
    format(string(ReceiptHistory), '[{"history":"~s"}]', [Padding]),
    forall(
        between(1, 123, Number),
        ( format(atom(Id), 'TEST-PROJECTION-~d', [Number]),
          format(atom(NativeId), 'native-~d', [Number]),
          Bindings = [_{
              symbol_id: 'SYM-PROJECTION',
              target: default,
              native_id: NativeId
          }],
          atom_json_dict(BindingsAtom, Bindings, []),
          atom_string(BindingsAtom, BindingsJson),
          assert_fixture_entity(test, Id, "Projected test", active, [
              proof_contract=ContractJson,
              proof_bindings=BindingsJson,
              proof_receipts=ReceiptHistory
          ])
        )
    ),
    kb_query_proof_contracts(none, 37, 0, FirstPage),
    kb_query_proof_contracts(none, 37, 37, SecondPage),
    kb_query_proof_contracts(none, 37, 74, ThirdPage),
    kb_query_proof_contracts(none, 37, 111, FourthPage),
    kb_query_proof_contracts(some('TEST-PROJECTION-1'), 1, 0, ExactPage),
    length(FirstPage, 37),
    length(SecondPage, 37),
    length(ThirdPage, 37),
    length(FourthPage, 12),
    ExactPage = [['TEST-PROJECTION-1', test, _]],
    append([FirstPage, SecondPage, ThirdPage, FourthPage], Pages),
    findall(Id, member([Id, test, _], Pages), PageIds),
    sort(PageIds, SortedPageIds),
    PageIds == SortedPageIds,
    length(SortedPageIds, 123),
    forall(
        member([_, test, Projected], Pages),
        ( memberchk(proof_contract=_, Projected),
          memberchk(proof_bindings=_, Projected),
          memberchk(source=_, Projected),
          assertion(\+ memberchk(proof_receipts=_, Projected))
        )
    ).

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

test(logic_coverage_allows_explicit_unresolved_inventory, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    Modeled = 'CLAIM-AAAAAAAABBBBBBBB',
    OntologyGap = 'CLAIM-CCCCCCCCDDDDDDDD',
    ModeledString = "CLAIM-AAAAAAAABBBBBBBB",
    Inventory = [
        _{claim_key: Modeled, claim_text: "A modeled claim", role: normative, status: modeled, span: _{start: 0, end: 15}},
        _{claim_key: OntologyGap, claim_text: "An unsupported domain claim", role: normative, status: ontology_gap, span: _{start: 16, end: 43}}
    ],
    assert_fixture_entity(req, 'REQ-LOGIC-UNRESOLVED', "Modeled and unresolved", open, [
        logic_claims=[Modeled, OntologyGap],
        semantic_inventory=Inventory
    ]),
    assert_fixture_entity(fact, 'FACT-LOGIC-MODELED', "Ground modeled claim", active, [
        fact_kind=property_value,
        subject_key="checkout",
        property_key="modeled_claim",
        operator=eq,
        value_type=string,
        value_string="true",
        claim_key=ModeledString,
        claim_text="A modeled claim"
    ]),
    kb_assert_relationship(requires_property, 'REQ-LOGIC-UNRESOLVED', 'FACT-LOGIC-MODELED', []),
    check_logic_coverage(Violations),
    \+ member(violation('logic-coverage', 'REQ-LOGIC-UNRESOLVED', _, _, _), Violations).

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
    assertion(Row.proofVersion == 'kibi.requirement-proof.v3'),
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

test(requirement_proof_fails_closed_on_dangling_declared_scenario, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    assert_fixture_entity(req, 'REQ-PROOF-DANGLING-SCENARIO', "Dangling scenario target", active, []),
    assert_fixture_entity(req, 'REQ-PROOF-DANGLING-WRONG-TYPE', "Wrong type scenario target", active, []),
    assert_fixture_entity(scenario, 'SCEN-PROOF-DANGLING-VALID', "Valid scenario target", active, []),
    assert_fixture_entity(test, 'TEST-PROOF-DANGLING-E2E', "Valid scenario E2E", passing, [verification_scope=end_to_end]),
    kb_assert_relationship(specified_by, 'REQ-PROOF-DANGLING-SCENARIO', 'SCEN-PROOF-DANGLING-VALID', []),
    % Preserve a declared edge whose target was removed or has the wrong type.
    assert_raw_relationship(specified_by, 'REQ-PROOF-DANGLING-SCENARIO', 'SCEN-PROOF-DANGLING-MISSING'),
    assert_raw_relationship(specified_by, 'REQ-PROOF-DANGLING-SCENARIO', 'REQ-PROOF-DANGLING-WRONG-TYPE'),
    kb_assert_relationship(verified_by, 'SCEN-PROOF-DANGLING-VALID', 'TEST-PROOF-DANGLING-E2E', []),
    coverage_report_json(req, [], true, true, 100, 0, JsonString),
    json_string_dict(JsonString, Report),
    coverage_row(Report.rows, 'REQ-PROOF-DANGLING-SCENARIO', Row),
    assertion(Row.proofStages.scenarios.status == missing),
    assertion(Row.proofStages.scenarios.scenarios == ['SCEN-PROOF-DANGLING-VALID']),
    assertion(Row.proofStages.scenarios.scenarioTargets == ['REQ-PROOF-DANGLING-WRONG-TYPE', 'SCEN-PROOF-DANGLING-MISSING', 'SCEN-PROOF-DANGLING-VALID']),
    assertion(Row.proofStages.scenarios.invalidScenarioTargets == ['REQ-PROOF-DANGLING-WRONG-TYPE', 'SCEN-PROOF-DANGLING-MISSING']),
    assertion(memberchk(missing_scenario, Row.proofGaps)).

test(requirement_proof_fails_closed_on_dangling_declared_scenario_test, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    assert_fixture_entity(req, 'REQ-PROOF-DANGLING-TEST', "Dangling scenario test target", active, []),
    assert_fixture_entity(req, 'REQ-PROOF-DANGLING-TEST-WRONG-TYPE', "Wrong type scenario test target", active, []),
    assert_fixture_entity(scenario, 'SCEN-PROOF-DANGLING-TEST', "Scenario with mixed test targets", active, []),
    assert_fixture_entity(test, 'TEST-PROOF-DANGLING-TEST-VALID', "Valid scenario E2E", passing, [verification_scope=end_to_end]),
    kb_assert_relationship(specified_by, 'REQ-PROOF-DANGLING-TEST', 'SCEN-PROOF-DANGLING-TEST', []),
    kb_assert_relationship(verified_by, 'SCEN-PROOF-DANGLING-TEST', 'TEST-PROOF-DANGLING-TEST-VALID', []),
    % Keep the valid target and retain malformed declared targets for proof diagnostics.
    assert_raw_relationship(verified_by, 'SCEN-PROOF-DANGLING-TEST', 'TEST-PROOF-DANGLING-TEST-MISSING'),
    assert_raw_relationship(verified_by, 'SCEN-PROOF-DANGLING-TEST', 'REQ-PROOF-DANGLING-TEST-WRONG-TYPE'),
    coverage_report_json(req, [], true, true, 100, 0, JsonString),
    json_string_dict(JsonString, Report),
    coverage_row(Report.rows, 'REQ-PROOF-DANGLING-TEST', Row),
    assertion(Row.proofStages.scenarioTests.status == missing),
    assertion(Row.proofStages.scenarioTests.tests == ['TEST-PROOF-DANGLING-TEST-VALID']),
    assertion(Row.proofStages.scenarioTests.scenarioTestTargets == ['REQ-PROOF-DANGLING-TEST-WRONG-TYPE', 'TEST-PROOF-DANGLING-TEST-MISSING', 'TEST-PROOF-DANGLING-TEST-VALID']),
    assertion(Row.proofStages.scenarioTests.invalidScenarioTestTargets == ['REQ-PROOF-DANGLING-TEST-WRONG-TYPE', 'TEST-PROOF-DANGLING-TEST-MISSING']),
    scenario_obligation_for(Row.proofStages.passingE2e.scenarioObligations, 'SCEN-PROOF-DANGLING-TEST', Obligation),
    assertion(Obligation.tests == ['TEST-PROOF-DANGLING-TEST-VALID']),
    assertion(Obligation.invalidScenarioTestTargets == ['REQ-PROOF-DANGLING-TEST-WRONG-TYPE', 'TEST-PROOF-DANGLING-TEST-MISSING']),
    assertion(memberchk(missing_scenario_test, Obligation.gaps)),
    assertion(memberchk(missing_scenario_test, Row.proofGaps)).

test(requirement_proof_marks_noncurrent_requirements_not_applicable, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    assert_fixture_entity(req, 'REQ-PROOF-OLD', "Superseded proof requirement", superseded, [priority=must]),
    coverage_report_json(req, [], true, true, 100, 0, JsonString),
    json_string_dict(JsonString, Report),
    coverage_row(Report.rows, 'REQ-PROOF-OLD', Row),
    assertion(Row.proofStatus == not_applicable),
    assertion(Row.proofGaps == []),
    assertion(Report.summary.proofNotApplicable == 1).

test(requirement_proof_uncovered_behavioral_implementation_still_blocks, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    assert_fixture_entity(req, 'REQ-PROOF-BEHAVIORAL-GAP', "Behavioral proof gap", active, []),
    assert_fixture_entity(test, 'TEST-PROOF-BEHAVIORAL-E2E', "Behavioral proof E2E", passing, [verification_scope=end_to_end]),
    assert_fixture_entity(symbol, 'SYM-PROOF-BEHAVIORAL-GAP', "runtime_behavior", active, [
        symbol_role=behavioral,
        sourceFile="src/runtime.ts"
    ]),
    kb_assert_relationship(implements, 'SYM-PROOF-BEHAVIORAL-GAP', 'REQ-PROOF-BEHAVIORAL-GAP', []),
    requirement_proof:production_symbol_stage(
        'REQ-PROOF-BEHAVIORAL-GAP',
        ['TEST-PROOF-BEHAVIORAL-E2E'],
        Stage,
        Symbols
    ),
    assertion(Symbols == ['SYM-PROOF-BEHAVIORAL-GAP']),
    assertion(Stage.structuralSymbols == []),
    assertion(Stage.uncoveredSymbols == ['SYM-PROOF-BEHAVIORAL-GAP']),
    assertion(Stage.status == missing).

test(requirement_proof_type_shape_contract_is_not_runtime_e2e_or_coordinate_evidence, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    assert_fixture_entity(req, 'REQ-PROOF-TYPE-SHAPE', "Type-shape proof contract", active, []),
    assert_fixture_entity(test, 'TEST-PROOF-TYPE-SHAPE-E2E', "Type-shape scenario E2E", passing, [verification_scope=end_to_end]),
    assert_fixture_entity(test, 'TEST-PROOF-TYPE-SHAPE-UNIT', "Type import contract", passing, [verification_scope=unit]),
    assert_fixture_entity(symbol, 'SYM-PROOF-RUNTIME', "runtime_behavior", active, [
        symbol_role=behavioral,
        sourceFile="src/runtime.ts",
        sourceLine=1,
        sourceColumn=0,
        sourceEndLine=3,
        sourceEndColumn=1
    ]),
    assert_fixture_entity(symbol, 'SYM-PROOF-TYPE-SHAPE', "RuntimeShape", active, [
        symbol_role='type-shape',
        sourceFile="src/runtime.ts"
    ]),
    kb_assert_relationship(implements, 'SYM-PROOF-RUNTIME', 'REQ-PROOF-TYPE-SHAPE', []),
    kb_assert_relationship(implements, 'SYM-PROOF-TYPE-SHAPE', 'REQ-PROOF-TYPE-SHAPE', []),
    kb_assert_relationship(covered_by, 'SYM-PROOF-RUNTIME', 'TEST-PROOF-TYPE-SHAPE-E2E', []),
    kb_assert_relationship(covered_by, 'SYM-PROOF-TYPE-SHAPE', 'TEST-PROOF-TYPE-SHAPE-UNIT', []),
    requirement_proof:production_symbol_stage(
        'REQ-PROOF-TYPE-SHAPE',
        ['TEST-PROOF-TYPE-SHAPE-E2E'],
        Stage,
        Symbols
    ),
    assertion(Symbols == ['SYM-PROOF-RUNTIME']),
    assertion(Stage.structuralSymbols == ['SYM-PROOF-TYPE-SHAPE']),
    assertion(Stage.uncoveredSymbols == []),
    assertion(Stage.status == passed),
    requirement_proof:source_coordinate_stage(
        [source="documentation/requirements/type-shape.md"],
        [],
        Symbols,
        CoordinateStage
    ),
    assertion(CoordinateStage.status == passed),
    assertion(CoordinateStage.missingSymbols == []).

test(requirement_proof_preserves_structurally_tested_type_shape_symbols, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    assert_fixture_entity(req, 'REQ-PROOF-STRUCTURAL-TYPE', "Structural type requirement", active, []),
    assert_fixture_entity(test, 'TEST-PROOF-STRUCTURAL-E2E', "Structural scenario E2E", passing, [verification_scope=end_to_end]),
    assert_fixture_entity(test, 'TEST-PROOF-STRUCTURAL-UNIT', "Structural type unit contract", active, [verification_scope=unit]),
    assert_fixture_entity(symbol, 'SYM-PROOF-STRUCTURAL-TYPE', "StructuralType", active, [
        symbol_role='type-shape',
        sourceFile="src/structural.ts"
    ]),
    kb_assert_relationship(implements, 'SYM-PROOF-STRUCTURAL-TYPE', 'REQ-PROOF-STRUCTURAL-TYPE', []),
    kb_assert_relationship(covered_by, 'SYM-PROOF-STRUCTURAL-TYPE', 'TEST-PROOF-STRUCTURAL-UNIT', []),
    requirement_proof:production_symbol_stage(
        'REQ-PROOF-STRUCTURAL-TYPE',
        ['TEST-PROOF-STRUCTURAL-E2E'],
        Stage,
        Symbols
    ),
    assertion(Symbols == []),
    assertion(Stage.structuralSymbols == ['SYM-PROOF-STRUCTURAL-TYPE']),
    assertion(Stage.status == passed),
    assertion(kb_entity('SYM-PROOF-STRUCTURAL-TYPE', symbol, _)),
    Stages = _{productionSymbols: Stage},
    assertion(\+ requirement_proof:proof_gap_present(missing_production_symbol, Stages)),
    assertion(\+ requirement_proof:proof_gap_present(missing_production_symbol_coverage, Stages)).

test(requirement_proof_requires_the_complete_semantic_scenario_e2e_symbol_chain, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    ClaimKey = 'CLAIM-ABCDEF0123456789',
    ClaimKeyString = "CLAIM-ABCDEF0123456789",
    Snapshot = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    proof_receipt_json(
        'TEST-PROOF-COMPLETE-E2E',
        Snapshot,
        passed,
        '2026-08-10T11:55:00Z',
        '2026-08-10T12:00:00Z',
        ReceiptJson
    ),
    proof_receipt_json(
        'TEST-PROOF-COMPLETE-SECOND-E2E',
        Snapshot,
        passed,
        '2026-08-10T11:55:00Z',
        '2026-08-10T12:00:00Z',
        SecondReceiptJson
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
        proof_receipts=ReceiptJson
    ]),
    assert_fixture_entity(scenario, 'SCEN-PROOF-COMPLETE-SECOND', "Inspect a second requirement proof path", active, []),
    assert_fixture_entity(test, 'TEST-PROOF-COMPLETE-SECOND-E2E', "Second requirement proof E2E", passing, [
        verification_scope=end_to_end,
        proof_receipts=SecondReceiptJson
    ]),
    assert_fixture_entity(test, 'TEST-PROOF-COMPLETE-SECOND-UNIT', "Second requirement proof unit helper", active, [
        verification_scope=unit
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
    kb_assert_relationship(specified_by, 'REQ-PROOF-COMPLETE', 'SCEN-PROOF-COMPLETE-SECOND', []),
    kb_assert_relationship(verified_by, 'SCEN-PROOF-COMPLETE-SECOND', 'TEST-PROOF-COMPLETE-SECOND-E2E', []),
    kb_assert_relationship(verified_by, 'SCEN-PROOF-COMPLETE-SECOND', 'TEST-PROOF-COMPLETE-SECOND-UNIT', []),
    kb_assert_relationship(implements, 'SYM-PROOF-PRODUCTION', 'REQ-PROOF-COMPLETE', []),
    kb_assert_relationship(covered_by, 'SYM-PROOF-PRODUCTION', 'TEST-PROOF-COMPLETE-E2E', []),
    kb_assert_relationship(covered_by, 'SYM-PROOF-PRODUCTION', 'TEST-PROOF-COMPLETE-SECOND-E2E', []),
    kb_assert_relationship(executable_for, 'SYM-PROOF-E2E', 'TEST-PROOF-COMPLETE-E2E', []),
    kb_assert_relationship(executable_for, 'SYM-PROOF-E2E', 'TEST-PROOF-COMPLETE-SECOND-E2E', []),
    coverage_report_json(req, [], true, true, 100, 0, Snapshot, '2026-08-10T12:05:00Z', 604800, JsonString),
    json_string_dict(JsonString, Report),
    coverage_row(Report.rows, 'REQ-PROOF-COMPLETE', Row),
    assertion(Row.testCount == 3),
    assertion(Row.proofStatus == proven),
    assertion(Row.proofGaps == []),
    assertion(Row.proofAdvisories == []),
    assertion(Row.proofStages.sourceCoordinates.requirementPath == 'test://kb.plt'),
    assertion(memberchk(_{id: 'SYM-PROOF-PRODUCTION', path: 'packages/core/src/requirement_proof.pl', line: 10, column: 0, endLine: 30, endColumn: 1}, Row.proofStages.sourceCoordinates.coordinates)),
    assertion(memberchk(_{id: 'SCEN-PROOF-COMPLETE', path: 'test://kb.plt'}, Row.proofStages.scenarios.sources)),
    assertion(Row.proofStages.semanticInventory.status == passed),
    assertion(Row.proofStages.logicGrounding.status == passed),
    assertion(Row.proofStages.contradictions.outcome == no_conflict_found),
    assertion(Row.proofStages.passingE2e.tests == ['TEST-PROOF-COMPLETE-E2E', 'TEST-PROOF-COMPLETE-SECOND-E2E']),
    evidence_for_test(Row.proofStages.passingE2e.receiptEvidence, 'TEST-PROOF-COMPLETE-E2E', ReceiptEvidence),
    assertion(ReceiptEvidence.state == passed),
    assertion(ReceiptEvidence.codeSnapshot == Snapshot),
    assertion(ReceiptEvidence.receiptId == 'PR-TEST000000001'),
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
    assertion(memberchk(ambiguous_logic_grounding, MismatchRow.proofGaps)),
    proof_receipt_json(
        'TEST-PROOF-COMPLETE-FAILED',
        Snapshot,
        failed,
        '2026-08-10T11:55:00Z',
        '2026-08-10T12:00:00Z',
        FailedReceiptJson
    ),
    assert_fixture_entity(scenario, 'SCEN-PROOF-COMPLETE-NO-TEST', "Missing scenario evidence", active, []),
    assert_fixture_entity(scenario, 'SCEN-PROOF-COMPLETE-FAILED', "Failed scenario evidence", active, []),
    assert_fixture_entity(test, 'TEST-PROOF-COMPLETE-FAILED', "Failed requirement proof E2E", passing, [
        verification_scope=end_to_end,
        proof_receipts=FailedReceiptJson
    ]),
    kb_assert_relationship(specified_by, 'REQ-PROOF-COMPLETE', 'SCEN-PROOF-COMPLETE-NO-TEST', []),
    kb_assert_relationship(specified_by, 'REQ-PROOF-COMPLETE', 'SCEN-PROOF-COMPLETE-FAILED', []),
    kb_assert_relationship(verified_by, 'SCEN-PROOF-COMPLETE-FAILED', 'TEST-PROOF-COMPLETE-FAILED', []),
    coverage_report_json(req, [], true, true, 100, 0, Snapshot, '2026-08-10T12:05:00Z', 604800, IncompleteJson),
    json_string_dict(IncompleteJson, IncompleteReport),
    coverage_row(IncompleteReport.rows, 'REQ-PROOF-COMPLETE', IncompleteRow),
    assertion(IncompleteRow.proofStatus == missing),
    assertion(memberchk(missing_scenario_test, IncompleteRow.proofGaps)),
    assertion(memberchk(failed_proof_receipt, IncompleteRow.proofGaps)),
    assertion(memberchk('TEST-PROOF-COMPLETE-FAILED', IncompleteRow.proofStages.passingE2e.failedReceiptTests)),
    scenario_obligation_for(IncompleteRow.proofStages.passingE2e.scenarioObligations, 'SCEN-PROOF-COMPLETE-NO-TEST', NoTestObligation),
    assertion(memberchk(missing_scenario_test, NoTestObligation.gaps)),
    scenario_obligation_for(IncompleteRow.proofStages.passingE2e.scenarioObligations, 'SCEN-PROOF-COMPLETE-FAILED', FailedObligation),
    assertion(memberchk(failed_proof_receipt, FailedObligation.gaps)).

test(requirement_proof_extra_missing_receipts_block_when_strict_proof_exists, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    ClaimKey = 'CLAIM-ABCDEF0123456789',
    ClaimKeyString = "CLAIM-ABCDEF0123456789",
    Snapshot = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    proof_receipt_json(
        'TEST-PROOF-ADVISORY-E2E',
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
    assert_fixture_entity(req, 'REQ-PROOF-ADVISORY', "Conservative requirement proof with extra test", active, [
        priority=must,
        source=".kb/requirements/REQ-PROOF-ADVISORY.md",
        logic_claims=[ClaimKey],
        semantic_inventory=Inventory
    ]),
    assert_fixture_entity(fact, 'FACT-PROOF-ADV-SUBJECT', "Coverage report subject", active, [
        fact_kind=subject,
        subject_key="kibi.coverage.report",
        source=".kb/facts/FACT-PROOF-ADV-SUBJECT.md"
    ]),
    assert_fixture_entity(fact, 'FACT-PROOF-ADV-PROPERTY', "Proof outcome property", active, [
        fact_kind=property_value,
        subject_key="kibi.coverage.report",
        property_key="proof_outcome",
        operator=eq,
        value_type=string,
        value_string="conservative",
        claim_key=ClaimKeyString,
        claim_text="Coverage reports expose conservative proof outcomes",
        source=".kb/facts/FACT-PROOF-ADV-PROPERTY.md"
    ]),
    assert_fixture_entity(scenario, 'SCEN-PROOF-ADVISORY', "Inspect a requirement proof", active, [
        source=".kb/scenarios/SCEN-PROOF-ADVISORY.md"
    ]),
    assert_fixture_entity(scenario, 'SCEN-PROOF-ADVISORY-EXTRA', "Inspect extra evidence", active, [
        source=".kb/scenarios/SCEN-PROOF-ADVISORY-EXTRA.md"
    ]),
    assert_fixture_entity(test, 'TEST-PROOF-ADVISORY-E2E', "Requirement proof E2E", passing, [
        verification_scope=end_to_end,
        proof_receipts=ReceiptJson,
        source="documentation/tests/e2e/advisory.test.ts"
    ]),
    assert_fixture_entity(test, 'TEST-PROOF-ADVISORY-EXTRA', "Additional E2E without a receipt", passing, [
        verification_scope=end_to_end,
        source="documentation/tests/e2e/advisory-extra.test.ts"
    ]),
    assert_fixture_entity(symbol, 'SYM-PROOF-ADV-PRODUCTION', "requirement_proof", active, [
        sourceFile="packages/core/src/requirement_proof.pl",
        sourceLine=10,
        sourceColumn=0,
        sourceEndLine=30,
        sourceEndColumn=1
    ]),
    assert_fixture_entity(symbol, 'SYM-PROOF-ADV-E2E', "requirement proof E2E test", active, [
        sourceFile="packages/core/tests/kb.plt",
        sourceLine=1300,
        sourceColumn=0,
        sourceEndLine=1340,
        sourceEndColumn=1
    ]),
    kb_assert_relationship(constrains, 'REQ-PROOF-ADVISORY', 'FACT-PROOF-ADV-SUBJECT', []),
    kb_assert_relationship(requires_property, 'REQ-PROOF-ADVISORY', 'FACT-PROOF-ADV-PROPERTY', []),
    kb_assert_relationship(specified_by, 'REQ-PROOF-ADVISORY', 'SCEN-PROOF-ADVISORY', []),
    kb_assert_relationship(specified_by, 'REQ-PROOF-ADVISORY', 'SCEN-PROOF-ADVISORY-EXTRA', []),
    kb_assert_relationship(verified_by, 'SCEN-PROOF-ADVISORY', 'TEST-PROOF-ADVISORY-E2E', []),
    kb_assert_relationship(verified_by, 'SCEN-PROOF-ADVISORY-EXTRA', 'TEST-PROOF-ADVISORY-EXTRA', []),
    kb_assert_relationship(implements, 'SYM-PROOF-ADV-PRODUCTION', 'REQ-PROOF-ADVISORY', []),
    kb_assert_relationship(covered_by, 'SYM-PROOF-ADV-PRODUCTION', 'TEST-PROOF-ADVISORY-E2E', []),
    kb_assert_relationship(executable_for, 'SYM-PROOF-ADV-E2E', 'TEST-PROOF-ADVISORY-E2E', []),
    coverage_report_json(req, [], true, true, 100, 0, Snapshot, '2026-08-10T12:05:00Z', 604800, JsonString),
    json_string_dict(JsonString, Report),
    coverage_row(Report.rows, 'REQ-PROOF-ADVISORY', Row),
    assertion(Row.proofStatus == unresolved),
    assertion(memberchk(missing_proof_receipt, Row.proofGaps)),
    assertion(Row.proofAdvisories == []),
    assertion(Row.source == '.kb/requirements/REQ-PROOF-ADVISORY.md'),
    assertion(Row.proofStages.sourceCoordinates.requirementPath == '.kb/requirements/REQ-PROOF-ADVISORY.md'),
    assertion(memberchk(_{id: 'SCEN-PROOF-ADVISORY', path: '.kb/scenarios/SCEN-PROOF-ADVISORY.md'}, Row.proofStages.scenarios.sources)),
    assertion(memberchk(_{id: 'TEST-PROOF-ADVISORY-E2E', path: 'documentation/tests/e2e/advisory.test.ts'}, Row.proofStages.scenarioTests.sources)),
    assertion(memberchk(_{id: 'FACT-PROOF-ADV-PROPERTY', path: '.kb/facts/FACT-PROOF-ADV-PROPERTY.md'}, Row.proofStages.logicGrounding.sources)).

test(per_contract_receipts_preserve_snapshot_fallback_and_requirement_rows, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    Snapshot = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    OtherSnapshot = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    Binding = 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
    OtherBinding = 'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
    TestId = 'TEST-BINDING-FALLBACK',
    proof_receipt_json(TestId, Snapshot, passed, '2026-08-10T11:55:00Z', '2026-08-10T12:00:00Z', LegacyJson),
    atom_json_dict(LegacyJson, [LegacyReceipt], []),
    put_dict(binding_hash, LegacyReceipt, Binding, BoundReceipt),
    atom_json_dict(BoundAtom, [BoundReceipt], []),
    atom_string(BoundAtom, BoundJson),
    assert_fixture_entity(req, 'REQ-BINDING-FALLBACK', "Binding fallback", active, [priority=must]),
    assert_fixture_entity(scenario, 'SCEN-BINDING-FALLBACK', "Binding fallback scenario", active, []),
    assert_fixture_entity(test, TestId, "Binding fallback E2E", passing, [verification_scope=end_to_end, proof_receipts=BoundJson]),
    kb_assert_relationship(specified_by, 'REQ-BINDING-FALLBACK', 'SCEN-BINDING-FALLBACK', []),
    kb_assert_relationship(verified_by, 'SCEN-BINDING-FALLBACK', TestId, []),
    requirement_proof:requirement_proof_context(OtherSnapshot, '2026-08-10T12:05:00Z', 604800, per_contract, _{'TEST-BINDING-FALLBACK':Binding}, MatchingContext),
    requirement_proof:test_receipt_evidence(MatchingContext, TestId, MatchingEvidence),
    assertion(MatchingEvidence.state == passed),
    requirement_proof:requirement_proof_context(Snapshot, '2026-08-10T12:05:00Z', 604800, per_contract, _{'TEST-BINDING-FALLBACK':OtherBinding}, FallbackContext),
    requirement_proof:test_receipt_evidence(FallbackContext, TestId, FallbackEvidence),
    assertion(FallbackEvidence.state == passed),
    requirement_proof:requirement_proof_context(OtherSnapshot, '2026-08-10T12:05:00Z', 604800, per_contract, _{'TEST-BINDING-FALLBACK':OtherBinding}, UnrelatedContext),
    requirement_proof:test_receipt_evidence(UnrelatedContext, TestId, UnrelatedEvidence),
    assertion(UnrelatedEvidence.state == stale),
    coverage_report_json(req, [], true, per_contract, _{'TEST-BINDING-FALLBACK':OtherBinding}, true, 100, 0, Snapshot, '2026-08-10T12:05:00Z', 604800, ReportJson),
    json_string_dict(ReportJson, Report),
    assertion(Report.summary.total == 1),
    coverage_row(Report.rows, 'REQ-BINDING-FALLBACK', Row),
    assertion(Row.proofStatus \== proven),
    evidence_for_test(Row.proofStages.passingE2e.receiptEvidence, TestId, RowEvidence),
    assertion(RowEvidence.state == passed),
    assert_fixture_entity(test, TestId, "Legacy fallback E2E", passing, [verification_scope=end_to_end, proof_receipts=LegacyJson]),
    requirement_proof:test_receipt_evidence(FallbackContext, TestId, LegacyEvidence),
    assertion(LegacyEvidence.state == passed),
    requirement_proof:test_receipt_evidence(UnrelatedContext, TestId, StaleLegacyEvidence),
    assertion(StaleLegacyEvidence.state == stale).

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
    assertion(memberchk(missing_proof_receipt, MissingRow.proofGaps)),
    assertion(\+ memberchk(missing_proof_receipt, MissingRow.proofAdvisories)),

    proof_receipt_json('TEST-PROOF-RECEIPTS', OtherSnapshot, passed, '2026-08-10T11:55:00Z', '2026-08-10T12:00:00Z', StaleJson),
    assert_fixture_entity(test, 'TEST-PROOF-RECEIPTS', "Receipt-sensitive E2E", passing, [verification_scope=end_to_end, proof_receipts=StaleJson]),
    coverage_report_json(req, [], true, true, 100, 0, Snapshot, '2026-08-10T12:05:00Z', 604800, StaleReportJson),
    json_string_dict(StaleReportJson, StaleReport),
    coverage_row(StaleReport.rows, 'REQ-PROOF-RECEIPTS', StaleRow),
    assertion(StaleRow.proofStages.passingE2e.staleReceiptTests == ['TEST-PROOF-RECEIPTS']),
    assertion(memberchk(stale_proof_receipt, StaleRow.proofGaps)),

    proof_receipt_json('TEST-PROOF-RECEIPTS', Snapshot, failed, '2026-08-10T11:55:00Z', '2026-08-10T12:00:00Z', FailedJson),
    assert_fixture_entity(test, 'TEST-PROOF-RECEIPTS', "Receipt-sensitive E2E", passing, [verification_scope=end_to_end, proof_receipts=FailedJson]),
    coverage_report_json(req, [], true, true, 100, 0, Snapshot, '2026-08-10T12:05:00Z', 604800, FailedReportJson),
    json_string_dict(FailedReportJson, FailedReport),
    coverage_row(FailedReport.rows, 'REQ-PROOF-RECEIPTS', FailedRow),
    assertion(FailedRow.proofStages.passingE2e.failedReceiptTests == ['TEST-PROOF-RECEIPTS']),
    assertion(memberchk(failed_proof_receipt, FailedRow.proofGaps)),

    proof_receipt_json('TEST-PROOF-RECEIPTS', Snapshot, passed, '2026-08-10T12:15:00Z', '2026-08-10T12:20:01Z', FutureJson),
    assert_fixture_entity(test, 'TEST-PROOF-RECEIPTS', "Receipt-sensitive E2E", passing, [verification_scope=end_to_end, proof_receipts=FutureJson]),
    coverage_report_json(req, [], true, true, 100, 0, Snapshot, '2026-08-10T12:05:00Z', 604800, FutureReportJson),
    json_string_dict(FutureReportJson, FutureReport),
    coverage_row(FutureReport.rows, 'REQ-PROOF-RECEIPTS', FutureRow),
    assertion(FutureRow.proofStages.passingE2e.invalidReceiptTests == ['TEST-PROOF-RECEIPTS']),
    assertion(memberchk(invalid_proof_receipt, FutureRow.proofGaps)),

    proof_receipt_json('TEST-PROOF-RECEIPTS', Snapshot, passed, '2026-08-10', '2026-08-10', DateOnlyJson),
    assert_fixture_entity(test, 'TEST-PROOF-RECEIPTS', "Receipt-sensitive E2E", passing, [verification_scope=end_to_end, proof_receipts=DateOnlyJson]),
    coverage_report_json(req, [], true, true, 100, 0, Snapshot, '2026-08-10T12:05:00Z', 604800, DateOnlyReportJson),
    json_string_dict(DateOnlyReportJson, DateOnlyReport),
    coverage_row(DateOnlyReport.rows, 'REQ-PROOF-RECEIPTS', DateOnlyRow),
    assertion(DateOnlyRow.proofStages.passingE2e.invalidReceiptTests == ['TEST-PROOF-RECEIPTS']),

    proof_receipt_json_with_id('bad-id', 'TEST-PROOF-RECEIPTS', Snapshot, passed, '2026-08-10T11:55:00Z', '2026-08-10T12:00:00Z', BadIdJson),
    assert_fixture_entity(test, 'TEST-PROOF-RECEIPTS', "Receipt-sensitive E2E", passing, [verification_scope=end_to_end, proof_receipts=BadIdJson]),
    coverage_report_json(req, [], true, true, 100, 0, Snapshot, '2026-08-10T12:05:00Z', 604800, BadIdReportJson),
    json_string_dict(BadIdReportJson, BadIdReport),
    coverage_row(BadIdReport.rows, 'REQ-PROOF-RECEIPTS', BadIdRow),
    assertion(BadIdRow.proofStages.passingE2e.invalidReceiptTests == ['TEST-PROOF-RECEIPTS']),

    proof_receipt_json('TEST-PROOF-RECEIPTS', Snapshot, passed, '2026-08-10T11:55:00Z', '2026-08-10T12:00:00Z', PassedJson),
    assert_fixture_entity(test, 'TEST-PROOF-RECEIPTS', "Receipt-sensitive E2E", failing, [verification_scope=end_to_end, proof_receipts=PassedJson]),
    coverage_report_json(req, [], true, true, 100, 0, Snapshot, '2026-08-10T12:05:00Z', 604800, PassedReportJson),
    json_string_dict(PassedReportJson, PassedReport),
    coverage_row(PassedReport.rows, 'REQ-PROOF-RECEIPTS', PassedRow),
    assertion(PassedRow.proofStages.passingE2e.tests == ['TEST-PROOF-RECEIPTS']),
    assertion(PassedRow.proofStages.passingE2e.status == passed).

test(requirement_proof_preserves_old_contract_receipts_but_only_current_contract_proves, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    Snapshot = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    Contract = _{
        version: 'kibi.proof-contract.v1',
        integration: 'self-proof',
        required_proofs: [_{symbol_id: 'SYM-PROOF-E2E', target: default}],
        success_policy: all_required_first_attempt
    },
    atom_json_dict(ContractJsonAtom, Contract, []),
    atom_string(ContractJsonAtom, ContractJson),
    requirement_proof:proof_contract_hash(ContractJson, ContractHash),
    OldReceipt = _{
        version: 'kibi.proof-receipt.v1',
        receipt_id: 'PR-OLD-CONTRACT-0001',
        test_id: 'TEST-PROOF-CONTRACT-DRIFT',
        scope: end_to_end,
        outcome: passed,
        code_snapshot: Snapshot,
        environment_hash: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        started_at: '2026-08-10T11:50:00Z',
        finished_at: '2026-08-10T11:55:00Z',
        artifact_digest: 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
        contract_hash: 'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
        fingerprint: 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
        fingerprint_components: _{
            contract: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
            integration: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaab',
            command: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaac',
            bindings: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaad',
            producer: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaae'
        },
        integration_id: 'self-proof',
        producer: _{name: 'kibi-command-producer'},
        command_argv: ['kibi', 'prove', '--all'],
        run_outcome: passed,
        proof_results: [_{
            symbol_id: 'SYM-PROOF-E2E',
            target: default,
            outcome: passed,
            binding: aggregate_run,
            attempts: _{status: unavailable}
        }]
    },
    atom_json_dict(OldHistoryAtom, [OldReceipt], []),
    atom_string(OldHistoryAtom, OldHistory),
    assert_fixture_entity(req, 'REQ-PROOF-CONTRACT-DRIFT', "Contract-sensitive proof", active, [priority=must]),
    assert_fixture_entity(scenario, 'SCEN-PROOF-CONTRACT-DRIFT', "Run the current contract", active, []),
    assert_fixture_entity(test, 'TEST-PROOF-CONTRACT-DRIFT', "Contract-drift E2E", passing, [
        verification_scope=end_to_end,
        proof_contract=ContractJson,
        proof_receipts=OldHistory
    ]),
    kb_assert_relationship(specified_by, 'REQ-PROOF-CONTRACT-DRIFT', 'SCEN-PROOF-CONTRACT-DRIFT', []),
    kb_assert_relationship(verified_by, 'SCEN-PROOF-CONTRACT-DRIFT', 'TEST-PROOF-CONTRACT-DRIFT', []),
    coverage_report_json(req, [], true, true, 100, 0, Snapshot, '2026-08-10T12:05:00Z', 604800, MismatchJson),
    json_string_dict(MismatchJson, MismatchReport),
    coverage_row(MismatchReport.rows, 'REQ-PROOF-CONTRACT-DRIFT', MismatchRow),
    assertion(MismatchRow.proofStages.passingE2e.contractMismatchReceiptTests == ['TEST-PROOF-CONTRACT-DRIFT']),
    MismatchRow.proofStages.passingE2e.receiptEvidence = [MismatchEvidence],
    assertion(MismatchEvidence.currentContractHash == ContractHash),
    assertion(MismatchEvidence.receiptContractHashes == ['dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd']),
    assertion(MismatchEvidence.receiptCount == 1),
    assertion(MismatchEvidence.scope == end_to_end),
    assertion(MismatchEvidence.state == contract_mismatch),
    assertion(MismatchEvidence.testId == 'TEST-PROOF-CONTRACT-DRIFT'),
    assertion(memberchk(proof_contract_mismatch, MismatchRow.proofGaps)),
    CurrentReceipt = OldReceipt.put(_{
        receipt_id: 'PR-CURRENT-CONTRACT-01',
        started_at: '2026-08-10T11:56:00Z',
        finished_at: '2026-08-10T12:00:00Z',
        artifact_digest: 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
        contract_hash: ContractHash
    }),
    atom_json_dict(CurrentHistoryAtom, [OldReceipt, CurrentReceipt], []),
    atom_string(CurrentHistoryAtom, CurrentHistory),
    assert_fixture_entity(test, 'TEST-PROOF-CONTRACT-DRIFT', "Contract-drift E2E", passing, [
        verification_scope=end_to_end,
        proof_contract=ContractJson,
        proof_receipts=CurrentHistory
    ]),
    coverage_report_json(req, [], true, true, 100, 0, Snapshot, '2026-08-10T12:05:00Z', 604800, CurrentJson),
    json_string_dict(CurrentJson, CurrentReport),
    coverage_row(CurrentReport.rows, 'REQ-PROOF-CONTRACT-DRIFT', CurrentRow),
    assertion(CurrentRow.proofStages.passingE2e.tests == ['TEST-PROOF-CONTRACT-DRIFT']),
    assertion(CurrentRow.proofStages.passingE2e.status == passed),
    assertion(\+ memberchk(proof_contract_mismatch, CurrentRow.proofGaps)).

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

test(production_coverage_explanations_report_missing_unit_unrelated_and_qualifying_paths, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    Snapshot = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    proof_receipt_json('TEST-EXPLAIN-E2E', Snapshot, passed, '2026-08-10T11:55:00Z', '2026-08-10T12:00:00Z', ReceiptJson),
    assert_fixture_entity(req, 'REQ-EXPLAIN', "Explain coverage", active, [priority=must]),
    assert_fixture_entity(scenario, 'SCEN-EXPLAIN', "Explain scenario", active, []),
    assert_fixture_entity(test, 'TEST-EXPLAIN-E2E', "Explain E2E", passing, [
        verification_scope=end_to_end,
        proof_receipts=ReceiptJson
    ]),
    assert_fixture_entity(test, 'TEST-EXPLAIN-UNIT', "Explain unit", active, [verification_scope=unit]),
    assert_fixture_entity(test, 'TEST-EXPLAIN-FOREIGN-E2E', "Foreign E2E", passing, [verification_scope=end_to_end]),
    assert_fixture_entity(symbol, 'SYM-EXPLAIN-NONE', "none", active, [symbol_role=behavioral, sourceFile="src/none.ts"]),
    assert_fixture_entity(symbol, 'SYM-EXPLAIN-UNIT', "unit only", active, [symbol_role=behavioral, sourceFile="src/unit.ts"]),
    assert_fixture_entity(symbol, 'SYM-EXPLAIN-FOREIGN', "foreign e2e", active, [symbol_role=behavioral, sourceFile="src/foreign.ts"]),
    assert_fixture_entity(symbol, 'SYM-EXPLAIN-OK', "qualifying", active, [symbol_role=behavioral, sourceFile="src/ok.ts"]),
    kb_assert_relationship(specified_by, 'REQ-EXPLAIN', 'SCEN-EXPLAIN', []),
    kb_assert_relationship(verified_by, 'SCEN-EXPLAIN', 'TEST-EXPLAIN-E2E', []),
    kb_assert_relationship(verified_by, 'SCEN-EXPLAIN', 'TEST-EXPLAIN-UNIT', []),
    kb_assert_relationship(implements, 'SYM-EXPLAIN-NONE', 'REQ-EXPLAIN', []),
    kb_assert_relationship(implements, 'SYM-EXPLAIN-UNIT', 'REQ-EXPLAIN', []),
    kb_assert_relationship(implements, 'SYM-EXPLAIN-FOREIGN', 'REQ-EXPLAIN', []),
    kb_assert_relationship(implements, 'SYM-EXPLAIN-OK', 'REQ-EXPLAIN', []),
    kb_assert_relationship(covered_by, 'SYM-EXPLAIN-UNIT', 'TEST-EXPLAIN-UNIT', []),
    kb_assert_relationship(covered_by, 'SYM-EXPLAIN-FOREIGN', 'TEST-EXPLAIN-FOREIGN-E2E', []),
    kb_assert_relationship(covered_by, 'SYM-EXPLAIN-OK', 'TEST-EXPLAIN-E2E', []),
    coverage_report_json(req, [], true, true, 100, 0, Snapshot, '2026-08-10T12:05:00Z', 604800, JsonString),
    json_string_dict(JsonString, Report),
    coverage_row(Report.rows, 'REQ-EXPLAIN', Row),
    assertion(Row.proofVersion == 'kibi.requirement-proof.v3'),
    assertion(memberchk('SYM-EXPLAIN-NONE', Row.proofStages.productionSymbols.uncoveredSymbols)),
    assertion(memberchk('SYM-EXPLAIN-UNIT', Row.proofStages.productionSymbols.uncoveredSymbols)),
    assertion(memberchk('SYM-EXPLAIN-FOREIGN', Row.proofStages.productionSymbols.uncoveredSymbols)),
    assertion(\+ memberchk('SYM-EXPLAIN-OK', Row.proofStages.productionSymbols.uncoveredSymbols)),
    production_explanation(Row, 'SYM-EXPLAIN-NONE', NoneExpl),
    assertion(NoneExpl.reason == covered_by_missing),
    assertion(NoneExpl.coverageCandidates == []),
    production_explanation(Row, 'SYM-EXPLAIN-UNIT', UnitExpl),
    assertion(UnitExpl.reason == no_qualifying_e2e_coverage),
    candidate_for(UnitExpl, 'TEST-EXPLAIN-UNIT', UnitCand),
    assertion(UnitCand.qualifies == false),
    assertion(UnitCand.reason == test_scope_is_unit),
    production_explanation(Row, 'SYM-EXPLAIN-FOREIGN', ForeignExpl),
    assertion(ForeignExpl.reason == no_qualifying_e2e_coverage),
    candidate_for(ForeignExpl, 'TEST-EXPLAIN-FOREIGN-E2E', ForeignCand),
    assertion(ForeignCand.reason == test_not_in_requirement_scenario_chain),
    assertion(\+ get_dict(receiptState, ForeignCand, _)),
    production_explanation(Row, 'SYM-EXPLAIN-OK', OkExpl),
    assertion(OkExpl.reason == covered),
    assertion(OkExpl.status == covered),
    candidate_for(OkExpl, 'TEST-EXPLAIN-E2E', OkCand),
    assertion(OkCand.qualifies == true),
    assertion(OkCand.reason == covered).

test(production_coverage_out_of_chain_unit_keeps_scope_secondary_without_receipt_walk, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    assert_fixture_entity(req, 'REQ-EXPLAIN-OOC', "Out of chain", active, [priority=must]),
    assert_fixture_entity(scenario, 'SCEN-EXPLAIN-OOC', "In-chain scenario", active, []),
    assert_fixture_entity(test, 'TEST-EXPLAIN-OOC-E2E', "In-chain E2E", passing, [verification_scope=end_to_end]),
    assert_fixture_entity(test, 'TEST-EXPLAIN-OOC-UNIT', "Out-of-chain unit", active, [verification_scope=unit]),
    assert_fixture_entity(symbol, 'SYM-EXPLAIN-OOC', "ooc behavioral", active, [symbol_role=behavioral, sourceFile="src/ooc.ts"]),
    kb_assert_relationship(specified_by, 'REQ-EXPLAIN-OOC', 'SCEN-EXPLAIN-OOC', []),
    kb_assert_relationship(verified_by, 'SCEN-EXPLAIN-OOC', 'TEST-EXPLAIN-OOC-E2E', []),
    kb_assert_relationship(implements, 'SYM-EXPLAIN-OOC', 'REQ-EXPLAIN-OOC', []),
    kb_assert_relationship(covered_by, 'SYM-EXPLAIN-OOC', 'TEST-EXPLAIN-OOC-UNIT', []),
    coverage_report_json(req, [], true, true, 100, 0, unknown, '2026-08-10T12:05:00Z', 604800, JsonString),
    json_string_dict(JsonString, Report),
    coverage_row(Report.rows, 'REQ-EXPLAIN-OOC', Row),
    production_explanation(Row, 'SYM-EXPLAIN-OOC', Expl),
    assertion(Expl.reason == stage_blocked_no_passing_e2e),
    candidate_for(Expl, 'TEST-EXPLAIN-OOC-UNIT', Cand),
    assertion(Cand.reason == test_not_in_requirement_scenario_chain),
    assertion(Cand.secondaryReasons == [test_scope_is_unit]),
    assertion(\+ get_dict(receiptState, Cand, _)).

test(production_coverage_receipt_reasons_cover_missing_stale_mismatch_and_contract, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    Snapshot = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    OtherSnapshot = 'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
    assert_fixture_entity(req, 'REQ-EXPLAIN-RECEIPT', "Receipt reasons", active, [priority=must]),
    assert_fixture_entity(scenario, 'SCEN-EXPLAIN-RECEIPT', "Receipt scenario", active, []),
    assert_fixture_entity(test, 'TEST-EXPLAIN-RECEIPT', "Receipt E2E", passing, [verification_scope=end_to_end]),
    assert_fixture_entity(symbol, 'SYM-EXPLAIN-RECEIPT', "receipt behavioral", active, [symbol_role=behavioral, sourceFile="src/receipt.ts"]),
    kb_assert_relationship(specified_by, 'REQ-EXPLAIN-RECEIPT', 'SCEN-EXPLAIN-RECEIPT', []),
    kb_assert_relationship(verified_by, 'SCEN-EXPLAIN-RECEIPT', 'TEST-EXPLAIN-RECEIPT', []),
    kb_assert_relationship(implements, 'SYM-EXPLAIN-RECEIPT', 'REQ-EXPLAIN-RECEIPT', []),
    kb_assert_relationship(covered_by, 'SYM-EXPLAIN-RECEIPT', 'TEST-EXPLAIN-RECEIPT', []),
    coverage_report_json(req, [], true, true, 100, 0, Snapshot, '2026-08-10T12:05:00Z', 604800, MissingJson),
    json_string_dict(MissingJson, MissingReport),
    coverage_row(MissingReport.rows, 'REQ-EXPLAIN-RECEIPT', MissingRow),
    production_explanation(MissingRow, 'SYM-EXPLAIN-RECEIPT', MissingExpl),
    candidate_for(MissingExpl, 'TEST-EXPLAIN-RECEIPT', MissingCand),
    assertion(MissingCand.reason == missing_proof_receipt),

    proof_receipt_json('TEST-EXPLAIN-RECEIPT', OtherSnapshot, passed, '2026-08-10T11:55:00Z', '2026-08-10T12:00:00Z', StaleJson),
    assert_fixture_entity(test, 'TEST-EXPLAIN-RECEIPT', "Receipt E2E", passing, [verification_scope=end_to_end, proof_receipts=StaleJson]),
    coverage_report_json(req, [], true, true, 100, 0, Snapshot, '2026-08-10T12:05:00Z', 604800, MismatchJson),
    json_string_dict(MismatchJson, MismatchReport),
    coverage_row(MismatchReport.rows, 'REQ-EXPLAIN-RECEIPT', MismatchRow),
    production_explanation(MismatchRow, 'SYM-EXPLAIN-RECEIPT', MismatchExpl),
    candidate_for(MismatchExpl, 'TEST-EXPLAIN-RECEIPT', MismatchCand),
    assertion(MismatchCand.reason == receipt_snapshot_mismatch),

    proof_receipt_json('TEST-EXPLAIN-RECEIPT', Snapshot, passed, '2026-08-01T11:55:00Z', '2026-08-01T12:00:00Z', AgeJson),
    assert_fixture_entity(test, 'TEST-EXPLAIN-RECEIPT', "Receipt E2E", passing, [verification_scope=end_to_end, proof_receipts=AgeJson]),
    coverage_report_json(req, [], true, true, 100, 0, Snapshot, '2026-08-10T12:05:00Z', 60, AgeReportJson),
    json_string_dict(AgeReportJson, AgeReport),
    coverage_row(AgeReport.rows, 'REQ-EXPLAIN-RECEIPT', AgeRow),
    production_explanation(AgeRow, 'SYM-EXPLAIN-RECEIPT', AgeExpl),
    candidate_for(AgeExpl, 'TEST-EXPLAIN-RECEIPT', AgeCand),
    assertion(AgeCand.reason == stale_proof_receipt),

    Contract = _{
        version: 'kibi.proof-contract.v1',
        integration: 'self-proof',
        required_proofs: [_{symbol_id: 'SYM-EXPLAIN-RECEIPT', target: default}],
        success_policy: all_required_first_attempt
    },
    atom_json_dict(ContractJsonAtom, Contract, []),
    atom_string(ContractJsonAtom, ContractJson),
    proof_receipt_json('TEST-EXPLAIN-RECEIPT', Snapshot, passed, '2026-08-10T11:55:00Z', '2026-08-10T12:00:00Z', DriftJson),
    assert_fixture_entity(test, 'TEST-EXPLAIN-RECEIPT', "Receipt E2E", passing, [
        verification_scope=end_to_end,
        proof_contract=ContractJson,
        proof_receipts=DriftJson
    ]),
    coverage_report_json(req, [], true, true, 100, 0, Snapshot, '2026-08-10T12:05:00Z', 604800, DriftReportJson),
    json_string_dict(DriftReportJson, DriftReport),
    coverage_row(DriftReport.rows, 'REQ-EXPLAIN-RECEIPT', DriftRow),
    production_explanation(DriftRow, 'SYM-EXPLAIN-RECEIPT', DriftExpl),
    candidate_for(DriftExpl, 'TEST-EXPLAIN-RECEIPT', DriftCand),
    assertion(DriftCand.reason == receipt_contract_mismatch).

test(receipt_reject_fallback_uses_context_then_test_and_evidence_dict, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    Snapshot = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    OtherSnapshot = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    requirement_proof:requirement_proof_context(Snapshot, '2026-08-10T12:05:00Z', 604800, Context),
    assert_fixture_entity(test, 'TEST-FALLBACK-MISSING', "Fallback missing", passing, [verification_scope=end_to_end]),
    requirement_proof:receipt_reject_for_in_chain([], Context, 'TEST-FALLBACK-MISSING', MissingPrimary, _),
    assertion(MissingPrimary == missing_proof_receipt),

    proof_receipt_json('TEST-FALLBACK-MISMATCH', OtherSnapshot, passed, '2026-08-10T11:55:00Z', '2026-08-10T12:00:00Z', MismatchJson),
    assert_fixture_entity(test, 'TEST-FALLBACK-MISMATCH', "Fallback mismatch", passing, [
        verification_scope=end_to_end,
        proof_receipts=MismatchJson
    ]),
    requirement_proof:receipt_reject_for_in_chain([], Context, 'TEST-FALLBACK-MISMATCH', MismatchPrimary, _),
    assertion(MismatchPrimary == receipt_snapshot_mismatch),

    requirement_proof:requirement_proof_context(Snapshot, '2026-08-10T12:05:00Z', 60, AgeContext),
    proof_receipt_json('TEST-FALLBACK-AGE', Snapshot, passed, '2026-08-01T11:55:00Z', '2026-08-01T12:00:00Z', AgeJson),
    assert_fixture_entity(test, 'TEST-FALLBACK-AGE', "Fallback age", passing, [
        verification_scope=end_to_end,
        proof_receipts=AgeJson
    ]),
    requirement_proof:receipt_reject_for_in_chain([], AgeContext, 'TEST-FALLBACK-AGE', AgePrimary, _),
    assertion(AgePrimary == stale_proof_receipt),

    Contract = _{
        version: 'kibi.proof-contract.v1',
        integration: 'self-proof',
        required_proofs: [_{symbol_id: 'SYM-FALLBACK-RECEIPT', target: default}],
        success_policy: all_required_first_attempt
    },
    atom_json_dict(ContractJsonAtom, Contract, []),
    atom_string(ContractJsonAtom, ContractJson),
    proof_receipt_json('TEST-FALLBACK-CONTRACT', Snapshot, passed, '2026-08-10T11:55:00Z', '2026-08-10T12:00:00Z', DriftJson),
    assert_fixture_entity(test, 'TEST-FALLBACK-CONTRACT', "Fallback contract", passing, [
        verification_scope=end_to_end,
        proof_contract=ContractJson,
        proof_receipts=DriftJson
    ]),
    requirement_proof:receipt_reject_for_in_chain([], Context, 'TEST-FALLBACK-CONTRACT', ContractPrimary, _),
    assertion(ContractPrimary == receipt_contract_mismatch).

test(production_coverage_type_shape_unit_contract_is_not_available_to_behavioral_symbols, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    assert_fixture_entity(req, 'REQ-EXPLAIN-SHAPE', "Shape vs behavioral", active, []),
    assert_fixture_entity(test, 'TEST-EXPLAIN-SHAPE-E2E', "Shape E2E", passing, [verification_scope=end_to_end]),
    assert_fixture_entity(test, 'TEST-EXPLAIN-SHAPE-UNIT', "Shape unit", passing, [verification_scope=unit]),
    assert_fixture_entity(symbol, 'SYM-EXPLAIN-SHAPE', "Shape", active, [symbol_role='type-shape', sourceFile="src/shape.ts"]),
    assert_fixture_entity(symbol, 'SYM-EXPLAIN-BEHAVIOR', "Behavior", active, [symbol_role=behavioral, sourceFile="src/behavior.ts"]),
    kb_assert_relationship(implements, 'SYM-EXPLAIN-SHAPE', 'REQ-EXPLAIN-SHAPE', []),
    kb_assert_relationship(implements, 'SYM-EXPLAIN-BEHAVIOR', 'REQ-EXPLAIN-SHAPE', []),
    kb_assert_relationship(covered_by, 'SYM-EXPLAIN-SHAPE', 'TEST-EXPLAIN-SHAPE-UNIT', []),
    kb_assert_relationship(covered_by, 'SYM-EXPLAIN-BEHAVIOR', 'TEST-EXPLAIN-SHAPE-UNIT', []),
    requirement_proof:production_symbol_stage('REQ-EXPLAIN-SHAPE', ['TEST-EXPLAIN-SHAPE-E2E'], Stage, Symbols),
    assertion(Stage.structuralSymbols == ['SYM-EXPLAIN-SHAPE']),
    assertion(memberchk('SYM-EXPLAIN-BEHAVIOR', Symbols)),
    assertion(memberchk('SYM-EXPLAIN-BEHAVIOR', Stage.uncoveredSymbols)),
    production_explanation(Stage, 'SYM-EXPLAIN-SHAPE', ShapeExpl),
    assertion(ShapeExpl.status == covered),
    assertion(ShapeExpl.reason == structural_unit_contract),
    candidate_for(ShapeExpl, 'TEST-EXPLAIN-SHAPE-UNIT', ShapeCand),
    assertion(ShapeCand.qualifies == true),
    assertion(ShapeCand.reason == structural_unit_contract),
    production_explanation(Stage, 'SYM-EXPLAIN-BEHAVIOR', BehaviorExpl),
    assertion(BehaviorExpl.status == uncovered),
    assertion(BehaviorExpl.reason \= structural_unit_contract),
    assertion(memberchk(BehaviorExpl.reason, [no_qualifying_e2e_coverage, covered_by_missing])),
    candidate_for(BehaviorExpl, 'TEST-EXPLAIN-SHAPE-UNIT', BehaviorCand),
    assertion(BehaviorCand.qualifies == false).

test(executable_for_symbols_remain_excluded_from_production_coverage, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    assert_fixture_entity(req, 'REQ-EXPLAIN-EXEC', "Executable exclusion", active, []),
    assert_fixture_entity(test, 'TEST-EXPLAIN-EXEC', "Exec E2E", passing, [verification_scope=end_to_end]),
    assert_fixture_entity(symbol, 'SYM-EXPLAIN-EXEC', "exec symbol", active, [sourceFile="tests/exec.test.ts"]),
    kb_assert_relationship(implements, 'SYM-EXPLAIN-EXEC', 'REQ-EXPLAIN-EXEC', []),
    assert_raw_relationship(executable_for, 'SYM-EXPLAIN-EXEC', 'TEST-EXPLAIN-EXEC'),
    requirement_proof:production_symbol_stage('REQ-EXPLAIN-EXEC', ['TEST-EXPLAIN-EXEC'], Stage, Symbols),
    assertion(Symbols == []),
    assertion(Stage.uncoveredSymbols == []).

test(requirement_proof_json_preserves_v3_and_explanations, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    assert_fixture_entity(req, 'REQ-EXPLAIN-JSON', "JSON serializer", active, [priority=must]),
    assert_fixture_entity(symbol, 'SYM-EXPLAIN-JSON', "json symbol", active, [symbol_role=behavioral, sourceFile="src/json.ts"]),
    kb_assert_relationship(implements, 'SYM-EXPLAIN-JSON', 'REQ-EXPLAIN-JSON', []),
    discovery:requirement_proof_json('REQ-EXPLAIN-JSON', unknown, '2026-08-10T12:05:00Z', 604800, JsonString),
    json_string_dict(JsonString, Proof),
    assertion(Proof.proofVersion == 'kibi.requirement-proof.v3'),
    assertion(memberchk('SYM-EXPLAIN-JSON', Proof.proofStages.productionSymbols.uncoveredSymbols)),
    production_explanation(Proof, 'SYM-EXPLAIN-JSON', Expl),
    assertion(Expl.reason == stage_blocked_no_passing_e2e).

% implements REQ-generated-coordinate-persistence

test(missing_single_coordinate_blocks_proof_until_all_four_persist, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    assert_fixture_entity(req, 'REQ-COORD-STAGE', "Coordinate stage regression", active, [
        source="test://kb.plt"
    ]),
    % One missing generated field must fail closed...
    assert_fixture_entity(symbol, 'SYM-COORD-STAGE', "coordinate stage symbol", active, [
        sourceFile="src/stage.ts",
        sourceLine=3,
        sourceColumn=0,
        sourceEndLine=5
    ]),
    kb_assert_relationship(implements, 'SYM-COORD-STAGE', 'REQ-COORD-STAGE', []),
    coverage_report_json(req, [], true, true, 100, 0, BeforeJsonString),
    json_string_dict(BeforeJsonString, BeforeReport),
    coverage_row(BeforeReport.rows, 'REQ-COORD-STAGE', BeforeRow),
    assertion(BeforeRow.proofStages.sourceCoordinates.status == missing),
    requirement_proof:proof_gap_present(missing_symbol_coordinates, BeforeRow.proofStages),
    % ...and persisting all four generated fields clears the gap.
    assert_fixture_entity(symbol, 'SYM-COORD-STAGE', "coordinate stage symbol", active, [
        sourceFile="src/stage.ts",
        sourceLine=3,
        sourceColumn=0,
        sourceEndLine=5,
        sourceEndColumn=1
    ]),
    coverage_report_json(req, [], true, true, 100, 0, AfterJsonString),
    json_string_dict(AfterJsonString, AfterReport),
    coverage_row(AfterReport.rows, 'REQ-COORD-STAGE', AfterRow),
    assertion(AfterRow.proofStages.sourceCoordinates.status == passed),
    \+ requirement_proof:proof_gap_present(missing_symbol_coordinates, AfterRow.proofStages).

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

% implements REQ-kibi-truthful-consistency
:- begin_tests(kb_truthful_consistency).

test(strict_numeric_pairs_conflict_exactly_when_no_value_satisfies_both) :-
    assertion(kb:values_conflict(lte, 0, gt, 0, int)),
    assertion(kb:values_conflict(gt, 0, lte, 0, int)),
    assertion(kb:values_conflict(eq, 0, gt, 0, int)),
    assertion(kb:values_conflict(eq, 0, gte, 1, int)),
    assertion(kb:values_conflict(lt, 5, gte, 5, int)),
    assertion(kb:values_conflict(eq, 1.5, lt, 1.5, number)),
    assertion(\+ kb:values_conflict(gte, 0, gt, 0, int)),
    assertion(\+ kb:values_conflict(lte, 5, gte, 5, int)),
    assertion(\+ kb:values_conflict(neq, 0, neq, 0, int)),
    assertion(\+ kb:values_conflict(gt, 0.1, lt, 0.2, number)).

test(integer_properties_conflict_when_no_integer_satisfies_both) :-
    % Adjacent integer bounds leave no integer between them.
    assertion(kb:values_conflict(gt, 0, lt, 1, int)),
    assertion(\+ kb:values_conflict(gt, 0, lt, 1, number)),
    assertion(kb:values_conflict(gt, -1, lt, 0, int)),
    assertion(\+ kb:values_conflict(gt, -2, lt, 0, int)),
    assertion(kb:values_conflict(gte, 1, lt, 1, int)),
    assertion(kb:values_conflict(gt, 0, lte, 0, int)),
    assertion(\+ kb:values_conflict(gt, 0, lte, 1, int)),
    % Fractional bounds tighten to the nearest admissible integer.
    assertion(kb:values_conflict(gt, 0, lt, 0.5, int)),
    assertion(kb:values_conflict(gte, 0.5, lte, 0.9, int)),
    assertion(\+ kb:values_conflict(gte, 0.5, lte, 1.1, int)),
    assertion(kb:values_conflict(gt, -0.5, lt, 0, int)),
    assertion(\+ kb:values_conflict(gt, -0.5, lte, 0, int)),
    % A fractional eq has no integer solution.
    assertion(kb:values_conflict(eq, 2.5, gte, 0, int)),
    assertion(\+ kb:values_conflict(eq, 2.5, gte, 0, number)),
    % Mixed int/number pairs keep real semantics.
    assertion(kb:conflict_value_type(int, number, number)),
    assertion(kb:conflict_value_type(int, int, int)).

test(number_requirements_keep_real_semantics_after_unit_canonicalization, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    % Canonicalization turns an integral number into an int; the declared
    % number domain must survive it, so gt 0 and lt 1 do not conflict.
    numeric_requirement_pair(number, value_number, NumberWitnesses),
    assertion(NumberWitnesses == []),
    cleanup_kb, setup_kb,
    numeric_requirement_pair(int, value_int, IntWitnesses),
    assertion(IntWitnesses = [_]).

test(integer_ranges_with_exclusions) :-
    assertion(\+ intervals:numeric_constraints_satisfiable([c(gte, X, 1), c(lte, X, 1), c(neq, X, 1)], all)),
    assertion(\+ intervals:numeric_constraints_satisfiable([c(gte, X, 1), c(lte, X, 2), c(neq, X, 1), c(neq, X, 2)], all)),
    assertion(intervals:numeric_constraints_satisfiable([c(gte, X, 1), c(lte, X, 2), c(neq, X, 1), c(neq, X, 2)])),
    assertion(intervals:numeric_constraints_satisfiable([c(gte, X, 1), c(lte, X, 2), c(neq, X, 1)], all)),
    assertion(\+ intervals:numeric_constraints_satisfiable([c(gt, X, -3), c(lt, X, -1), c(neq, X, -2)], all)),
    % A fractional exclusion removes no integer.
    assertion(intervals:numeric_constraints_satisfiable([c(gte, X, 1), c(lte, X, 1), c(neq, X, 1.5)], all)),
    % Unbounded integer sets cannot be emptied by exclusions.
    assertion(intervals:numeric_constraints_satisfiable([c(gte, X, 1), c(neq, X, 1), c(neq, X, 2)], all)),
    % Only the listed variables are integral.
    assertion(intervals:numeric_constraints_satisfiable([c(gt, Y, 0), c(lt, Y, 1), c(gt, X, 0), c(lt, X, 2)], [X])),
    assertion(\+ intervals:numeric_constraints_satisfiable([c(gt, Y, 0), c(lt, Y, 1)], [Y])),
    assertion(intervals:numeric_constraint_entailed([c(gt, X, 0)], c(gte, X, 1), all)),
    assertion(\+ intervals:numeric_constraint_entailed([c(gt, X, 0)], c(gte, X, 1), [])).

test(interval_entailment_handles_strict_bounds_and_exclusions) :-
    assertion(intervals:numeric_constraint_entailed([c(eq, X, 0)], c(lte, X, 0))),
    assertion(\+ intervals:numeric_constraint_entailed([c(gte, X, 0)], c(gt, X, 0))),
    assertion(\+ intervals:numeric_constraints_satisfiable([c(gte, X, 3), c(lte, X, 3), c(neq, X, 3)])),
    assertion(intervals:numeric_constraints_satisfiable([c(gte, X, 3), c(lte, X, 4), c(neq, X, 3)])).

test(precondition_rule_conflicts_with_intended_success_rule) :-
    consistency_rule(forbid, initiate_checkout, [v('C', cart)], positive_total_precondition, Forbid),
    consistency_rule(permit, initiate_checkout, [v('C', cart)], free_order_success, Permit),
    logic_ir:logic_rule_conflict(Forbid, Permit, Status),
    assertion(Status == contradiction).

test(precondition_rule_conflicts_with_ground_instance_and_renamed_variables) :-
    consistency_rule(forbid, initiate_checkout, [v('C', cart)], positive_total_precondition, Forbid),
    consistency_rule(permit, initiate_checkout, [c(cart_s089, cart)], ground_free_order, Ground),
    consistency_rule(permit, initiate_checkout, [v('D', cart)], renamed_zero_total, Renamed),
    logic_ir:logic_rule_conflict(Forbid, Ground, GroundStatus),
    logic_ir:logic_rule_conflict(Forbid, Renamed, RenamedStatus),
    assertion(GroundStatus == contradiction),
    assertion(RenamedStatus == contradiction).

test(complementary_bodies_different_heads_and_disjoint_scopes_stay_disjoint) :-
    consistency_rule(forbid, initiate_checkout, [v('C', cart)], positive_total_precondition, Forbid),
    consistency_rule(permit, initiate_checkout, [v('C', cart)], positive_total_success, Positive),
    consistency_rule(permit, issue_refund, [v('C', cart)], free_order_success, Refund),
    % final_payable_total is declared functional in its cart argument, so
    % T =< 0 and T > 0 constrain the same value.
    Functional = [functional(default, final_payable_total, 2, [1])],
    logic_ir:logic_rule_conflict(Forbid, Positive, Functional, PositiveStatus),
    logic_ir:logic_rule_conflict(Forbid, Refund, RefundStatus),
    assertion(PositiveStatus == disjoint),
    assertion(RefundStatus == disjoint),
    consistency_rule_dict(forbid, initiate_checkout, [v('C', cart)], positive_total_precondition, ForbidDict),
    consistency_rule_dict(permit, initiate_checkout, [v('C', cart)], free_order_success, PermitDict),
    consistency_rule_from_dict(ForbidDict.put(scope, _{name:eu}), EuForbid),
    consistency_rule_from_dict(PermitDict.put(scope, _{name:us}), UsPermit),
    logic_ir:logic_rule_conflict(EuForbid, UsPermit, ScopeStatus),
    assertion(ScopeStatus == disjoint).

test(exception_entailed_by_other_body_removes_the_conflict) :-
    consistency_rule_dict(forbid, initiate_checkout, [v('C', cart)], positive_total_precondition, ForbidDict),
    Exception = _{kind:atom, name:valid_full_discount, args:[_{kind:var, name:'C', type:cart}]},
    consistency_rule_from_dict(ForbidDict.put(exceptions, [Exception]), ForbidWithException),
    consistency_rule(permit, initiate_checkout, [v('C', cart)], promoted_free_order, Promoted),
    consistency_rule(permit, initiate_checkout, [v('C', cart)], free_order_success, Unpromoted),
    logic_ir:logic_rule_conflict(ForbidWithException, Promoted, PromotedStatus),
    logic_ir:logic_rule_conflict(ForbidWithException, Unpromoted, UnpromotedStatus),
    assertion(PromotedStatus == disjoint),
    assertion(UnpromotedStatus == unresolved).

test(multivalued_predicates_are_never_identified_across_rules) :-
    % Without a key_arguments declaration a cart may have several
    % final_payable_total readings, so T =< 0 and T > 0 can both hold.
    consistency_rule(forbid, initiate_checkout, [v('C', cart)], positive_total_precondition, Forbid),
    consistency_rule(permit, initiate_checkout, [v('C', cart)], positive_total_success, Positive),
    logic_ir:logic_rule_conflict(Forbid, Positive, [], Status),
    assertion(Status == unresolved),
    ir_reading_rule(permit, gt, 'X', Permit),
    ir_reading_rule(forbid, lte, 'Y', ForbidReading),
    logic_ir:logic_rule_conflict(Permit, ForbidReading, [], ReadingStatus),
    assertion(ReadingStatus == unresolved),
    logic_ir:logic_rule_conflict(Permit, ForbidReading, [functional(default, reading, 2, [1])], KeyedStatus),
    assertion(KeyedStatus == disjoint),
    % A key that does not identify the atoms (keyed on the value) changes nothing.
    logic_ir:logic_rule_conflict(Permit, ForbidReading, [functional(default, reading, 2, [2])], WrongKeyStatus),
    assertion(WrongKeyStatus == unresolved).

test(declared_key_arguments_make_stored_rules_functional, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    ir_reading_rule(permit, gt, 'X', Permit),
    ir_reading_rule(forbid, lte, 'Y', Forbid),
    logic_ir:logic_rule_conflict(Permit, Forbid, Before),
    assertion(Before == unresolved),
    assert_fixture_entity(fact, 'FACT-SCHEMA-READING', "Predicate schema: reading/2", active, [
        fact_kind=predicate_schema,
        predicate_name="reading",
        predicate_arity=2,
        argument_names=["sensor", "value"],
        argument_types=["sensor", "number"],
        key_arguments=["sensor"]
    ]),
    assertion(kb:predicate_schema_keys(default, reading, 2, [1])),
    logic_ir:logic_rule_conflict(Permit, Forbid, After),
    assertion(After == disjoint).

test(key_arguments_must_name_declared_arguments, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    Props = [
        id='FACT-SCHEMA-BAD-KEY', title="Bad key", status=active,
        created_at="2026-05-01T00:00:00Z", updated_at="2026-05-01T00:00:00Z",
        source="test://kb.plt",
        fact_kind=predicate_schema, predicate_name="reading", predicate_arity=2,
        argument_names=["sensor", "value"], argument_types=["sensor", "number"],
        key_arguments=["meter"]
    ],
    ignore(catch(kb_assert_entity(fact, Props), _, true)),
    assertion(\+ kb_entity('FACT-SCHEMA-BAD-KEY', _, _)).

test(untranslatable_comparison_never_yields_contradiction) :-
    % X < Z relates two different variables: the fragment cannot translate
    % it, so the permit body may be empty and no contradiction is claimed.
    ir_var('C', cart, C), ir_var('X', money, X), ir_var('Y', money, Y), ir_var('Z', money, Z),
    ir_atom(act, [C], Head),
    ir_atom(reading, [C, X], ReadX), ir_atom(limit, [C, Z], LimitZ), ir_atom(reading, [C, Y], ReadY),
    ir_cmp(lt, X, Z, XltZ),
    ir_rule(permit, ['C'-cart, 'X'-money, 'Z'-money], Head, _{kind:all, items:[ReadX, LimitZ, XltZ]}, Permit),
    ir_rule(forbid, ['C'-cart, 'Y'-money], Head, ReadY, Forbid),
    logic_ir:logic_rule_conflict(Permit, Forbid, [], Status),
    assertion(Status == unresolved).

test(same_variable_comparisons_are_decided_exactly) :-
    ir_var('C', cart, C), ir_var('X', money, X), ir_var('Y', money, Y),
    ir_atom(act, [C], Head),
    ir_atom(reading, [C, X], ReadX), ir_atom(reading, [C, Y], ReadY),
    ir_rule(forbid, ['C'-cart, 'Y'-money], Head, ReadY, Forbid),
    forall(member(Op-Expected, [lt-disjoint, gt-disjoint, neq-disjoint,
                                eq-contradiction, lte-contradiction, gte-contradiction]),
        (   ir_cmp(Op, X, X, Self),
            ir_rule(permit, ['C'-cart, 'X'-money], Head, _{kind:all, items:[ReadX, Self]}, Permit),
            logic_ir:logic_rule_conflict(Permit, Forbid, [], Status),
            assertion(Op-Status == Op-Expected)
        )).

test(variant_bodies_contradict_only_when_the_body_can_hold) :-
    % Identical (and alpha-renamed) satisfiable bodies share every instance.
    ir_reading_rule(permit, gt, 'X', Permit),
    ir_reading_rule(forbid, gt, 'X', Forbid),
    ir_reading_rule(forbid, gt, 'Y', RenamedForbid),
    logic_ir:logic_rule_conflict(Permit, Forbid, [], Status),
    logic_ir:logic_rule_conflict(Permit, RenamedForbid, [], RenamedStatus),
    assertion(Status == contradiction),
    assertion(RenamedStatus == contradiction).

test(variant_bodies_with_impossible_bounds_are_disjoint) :-
    forall(member(Name, ['X', 'Y']),
        (   ir_bounded_rule(permit, 'X', money, gt-0, lt-0, Permit),
            ir_bounded_rule(forbid, Name, money, gt-0, lt-0, Forbid),
            logic_ir:logic_rule_conflict(Permit, Forbid, [], Status),
            assertion(Name-Status == Name-disjoint)
        )),
    % X < X never holds, so a body containing it has no instance.
    ir_var('C', cart, C), ir_var('X', money, X),
    ir_atom(act, [C], Head), ir_atom(reading, [C, X], ReadX), ir_cmp(lt, X, X, Self),
    Body = _{kind:all, items:[ReadX, Self]},
    ir_rule(permit, ['C'-cart, 'X'-money], Head, Body, SelfPermit),
    ir_rule(forbid, ['C'-cart, 'X'-money], Head, Body, SelfForbid),
    logic_ir:logic_rule_conflict(SelfPermit, SelfForbid, [], SelfStatus),
    assertion(SelfStatus == disjoint).

test(variant_bodies_with_contradictory_functional_values_are_disjoint) :-
    ir_var('C', cart, C), ir_num(1, One), ir_num(2, Two),
    ir_atom(act, [C], Head),
    ir_atom(reading, [C, One], ReadOne), ir_atom(reading, [C, Two], ReadTwo),
    Body = _{kind:all, items:[ReadOne, ReadTwo]},
    ir_rule(permit, ['C'-cart], Head, Body, Permit),
    ir_rule(forbid, ['C'-cart], Head, Body, Forbid),
    % A cart has one reading when reading/2 is keyed on it ...
    logic_ir:logic_rule_conflict(Permit, Forbid, [functional(default, reading, 2, [1])], KeyedStatus),
    assertion(KeyedStatus == disjoint),
    % ... and may have both readings when it is not.
    logic_ir:logic_rule_conflict(Permit, Forbid, [], MultiStatus),
    assertion(MultiStatus == contradiction).

test(variant_bodies_with_untranslatable_comparisons_stay_unresolved) :-
    % X < Z relates two variables; the fragment cannot tell whether the body
    % has an instance, so even identical rules are not a contradiction.
    ir_var('C', cart, C), ir_var('X', money, X), ir_var('Z', money, Z),
    ir_atom(act, [C], Head),
    ir_atom(reading, [C, X], ReadX), ir_atom(limit, [C, Z], LimitZ),
    ir_cmp(lt, X, Z, XltZ),
    Body = _{kind:all, items:[ReadX, LimitZ, XltZ]},
    Variables = ['C'-cart, 'X'-money, 'Z'-money],
    ir_rule(permit, Variables, Head, Body, Permit),
    ir_rule(forbid, Variables, Head, Body, Forbid),
    logic_ir:logic_rule_conflict(Permit, Forbid, [], Status),
    assertion(Status == unresolved).

test(variant_bodies_with_mixed_integer_declarations_stay_unresolved) :-
    % 0 < N < 1 is empty for an int N but not for a number N: one rule never
    % applies, the other may, so neither verdict is certain.
    ir_bounded_rule(permit, 'N', int, gt-0, lt-1, PermitInt),
    ir_bounded_rule(forbid, 'N', number, gt-0, lt-1, ForbidNumber),
    ir_bounded_rule(forbid, 'N', int, gt-0, lt-1, ForbidInt),
    logic_ir:logic_rule_conflict(PermitInt, ForbidNumber, [], MixedStatus),
    logic_ir:logic_rule_conflict(ForbidNumber, PermitInt, [], SwappedStatus),
    logic_ir:logic_rule_conflict(PermitInt, ForbidInt, [], IntStatus),
    assertion(MixedStatus == unresolved),
    assertion(SwappedStatus == unresolved),
    assertion(IntStatus == disjoint).

test(integer_typed_rule_variables_use_integer_bounds) :-
    Functional = [functional(default, reading, 2, [1])],
    ir_typed_reading_rule(permit, gt, 0, 'N', int, PermitInt),
    ir_typed_reading_rule(forbid, lt, 1, 'M', int, ForbidInt),
    logic_ir:logic_rule_conflict(PermitInt, ForbidInt, Functional, IntStatus),
    assertion(IntStatus == disjoint),
    ir_typed_reading_rule(permit, gt, 0, 'N', money, PermitReal),
    ir_typed_reading_rule(forbid, lt, 1, 'M', money, ForbidReal),
    logic_ir:logic_rule_conflict(PermitReal, ForbidReal, Functional, RealStatus),
    assertion(RealStatus == unresolved).

test(shared_variables_are_integral_only_when_every_declaration_is_int) :-
    % The functional reading identifies N (int, N > 0) with N (number, N < 1):
    % 0.5 satisfies the number declaration, so the pair is not disjoint
    % whichever rule is compared first.
    Functional = [functional(default, reading, 2, [1])],
    ir_typed_reading_rule(permit, gt, 0, 'N', int, PermitInt),
    ir_typed_reading_rule(forbid, lt, 1, 'N', number, ForbidNumber),
    ir_typed_reading_rule(permit, gt, 0, 'N', number, PermitNumber),
    ir_typed_reading_rule(forbid, lt, 1, 'N', int, ForbidInt),
    forall(member(A-B, [PermitInt-ForbidNumber, ForbidNumber-PermitInt,
                        PermitNumber-ForbidInt, ForbidInt-PermitNumber]),
        (   logic_ir:logic_rule_conflict(A, B, Functional, MixedStatus),
            assertion(MixedStatus \== disjoint)
        )),
    logic_ir:logic_rule_conflict(PermitInt, ForbidInt, Functional, IntStatus),
    logic_ir:logic_rule_conflict(ForbidInt, PermitInt, Functional, SwappedIntStatus),
    assertion(IntStatus == disjoint),
    assertion(SwappedIntStatus == disjoint).

test(missing_key_arguments_are_named_only_when_they_would_decide_the_pair) :-
    consistency_rule(forbid, initiate_checkout, [v('C', cart)], positive_total_precondition, Forbid),
    consistency_rule(permit, initiate_checkout, [v('C', cart)], positive_total_success, Positive),
    logic_ir:logic_rule_missing_keys(Forbid, Positive, [], Missing),
    assertion(Missing == [missing_keys(default, final_payable_total, 2, [[1]])]),
    % Once declared, the pair is decided and nothing is missing.
    logic_ir:logic_rule_missing_keys(Forbid, Positive, [functional(default, final_payable_total, 2, [1])], Declared),
    assertion(Declared == []),
    % X < Z keeps the pair unresolved whatever is declared.
    ir_var('C', cart, C), ir_var('X', money, X), ir_var('Y', money, Y), ir_var('Z', money, Z),
    ir_atom(act, [C], Head),
    ir_atom(reading, [C, X], ReadX), ir_atom(limit, [C, Z], LimitZ), ir_atom(reading, [C, Y], ReadY),
    ir_cmp(lt, X, Z, XltZ),
    ir_rule(permit, ['C'-cart, 'X'-money, 'Z'-money], Head, _{kind:all, items:[ReadX, LimitZ, XltZ]}, Permit),
    ir_rule(forbid, ['C'-cart, 'Y'-money], Head, ReadY, ForbidReading),
    logic_ir:logic_rule_missing_keys(Permit, ForbidReading, [], Undecidable),
    assertion(Undecidable == []).

test(rule_key_arguments_missing_is_an_advisory_check, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    consistency_rule_dict(forbid, initiate_checkout, [v('C', cart)], positive_total_precondition, ForbidDict),
    consistency_rule_dict(permit, initiate_checkout, [v('C', cart)], positive_total_success, PermitDict),
    assert_rule_requirement(ForbidDict, 'FACT-FORBID-RULE', 'REQ-FORBID-RULE', "CLAIM-AAAAAAAAAAAAAAAA"),
    assert_rule_requirement(PermitDict, 'FACT-PERMIT-RULE', 'REQ-PERMIT-RULE', "CLAIM-BBBBBBBBBBBBBBBB"),
    check_rule_key_arguments_missing([violation('rule-key-arguments-missing', EntityId, Description, Suggestion, _)]),
    assertion(EntityId == "REQ-FORBID-RULE/REQ-PERMIT-RULE"),
    assertion(sub_string(Description, _, _, _, "default:final_payable_total/2")),
    assertion(sub_string(Description, _, _, _, "[positions 1]")),
    assertion(sub_string(Suggestion, _, _, _, "key_arguments")),
    % With a schema the key is named by argument.
    assert_fixture_entity(fact, 'FACT-SCHEMA-TOTAL', "Predicate schema: final_payable_total/2", active, [
        fact_kind=predicate_schema, predicate_name="final_payable_total", predicate_arity=2,
        argument_names=["cart", "total"], argument_types=["cart", "money"]
    ]),
    check_rule_key_arguments_missing([violation(_, _, NamedDescription, _, _)]),
    assertion(sub_string(NamedDescription, _, _, _, "[cart]")),
    % Declaring the key decides the pair and clears the advisory.
    kb_retract_entity('FACT-SCHEMA-TOTAL'),
    assert_fixture_entity(fact, 'FACT-SCHEMA-TOTAL', "Predicate schema: final_payable_total/2", active, [
        fact_kind=predicate_schema, predicate_name="final_payable_total", predicate_arity=2,
        argument_names=["cart", "total"], argument_types=["cart", "money"], key_arguments=["cart"]
    ]),
    check_rule_key_arguments_missing(After),
    assertion(After == []),
    % The rule is advisory: registered, selectable and not canonical.
    assertion(rule_registry:rule_enforcement_class('rule-key-arguments-missing', advisory)),
    checks:check_selected(['rule-key-arguments-missing'], Selected),
    assertion(Selected.rule_key_arguments_missing == []).

test(opposing_rule_pairs_are_compared_across_permuted_ids, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    % REQ-A links FACT-Z and REQ-Z links FACT-A: requirement order and fact
    % order disagree, and the pair must still be compared exactly once.
    consistency_rule_dict(forbid, initiate_checkout, [v('C', cart)], positive_total_precondition, ForbidDict),
    consistency_rule_dict(permit, initiate_checkout, [v('C', cart)], free_order_success, PermitDict),
    assert_rule_requirement(ForbidDict, 'FACT-Z-RULE', 'REQ-A-RULE', "CLAIM-EEEEEEEEEEEEEEEE"),
    assert_rule_requirement(PermitDict, 'FACT-A-RULE', 'REQ-Z-RULE', "CLAIM-FFFFFFFFFFFFFFFF"),
    check_domain_contradiction_witnesses(Witnesses),
    assertion(length(Witnesses, 1)),
    Witnesses = [Witness],
    assertion(Witness.requirements == ['REQ-A-RULE', 'REQ-Z-RULE']),
    assertion(Witness.status == contradiction).

test(untranslatable_bodies_stay_unresolved) :-
    consistency_rule(forbid, initiate_checkout, [v('C', cart)], positive_total_precondition, Forbid),
    consistency_rule(permit, initiate_checkout, [v('C', cart)], disjunctive_success, Disjunctive),
    logic_ir:logic_rule_conflict(Forbid, Disjunctive, Status),
    assertion(Status == unresolved).

test(stored_requirement_rule_pair_reports_contradiction_and_blocks_proof, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    consistency_rule_dict(forbid, initiate_checkout, [v('C', cart)], positive_total_precondition, ForbidDict),
    consistency_rule_dict(permit, initiate_checkout, [v('C', cart)], free_order_success, PermitDict),
    assert_rule_requirement(ForbidDict, 'FACT-RULE-POSITIVE-TOTAL', 'REQ-CHECKOUT-POSITIVE-TOTAL', "CLAIM-EEEEEEEEEEEEEEEE"),
    assert_rule_requirement(PermitDict, 'FACT-RULE-FREE-ORDER', 'REQ-CHECKOUT-FREE-ORDER', "CLAIM-FFFFFFFFFFFFFFFF"),
    check_domain_contradiction_witnesses([Witness]),
    assertion(Witness.kind == rule),
    assertion(Witness.status == contradiction),
    Context = _{contradictionWitnesses:[Witness], contradictions:[]},
    requirement_proof:contradiction_stage('REQ-CHECKOUT-POSITIVE-TOTAL', passed, Context, Stage),
    assertion(Stage.status == blocked),
    assertion(Stage.outcome == conflict_found).

test(unresolved_propositions_make_conflict_analysis_incomplete, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    Modeled = 'CLAIM-AAAAAAAABBBBBBBB',
    OntologyGap = 'CLAIM-CCCCCCCCDDDDDDDD',
    Inventory = [
        _{claim_key: Modeled, claim_text: "A modeled claim", role: normative, status: modeled, span: _{start: 0, end: 15}},
        _{claim_key: OntologyGap, claim_text: "An unsupported domain claim", role: normative, status: ontology_gap, span: _{start: 16, end: 43}}
    ],
    assert_fixture_entity(req, 'REQ-CONSISTENCY-PARTIAL', "Modeled and unresolved", open, [
        logic_claims=[Modeled, OntologyGap],
        semantic_inventory=Inventory
    ]),
    assert_fixture_entity(fact, 'FACT-CONSISTENCY-MODELED', "Ground modeled claim", active, [
        fact_kind=property_value,
        subject_key="checkout",
        property_key="modeled_claim",
        operator=eq,
        value_type=string,
        value_string="true",
        claim_key="CLAIM-AAAAAAAABBBBBBBB",
        claim_text="A modeled claim"
    ]),
    assert_fixture_entity(fact, 'FACT-CONSISTENCY-SUBJECT', "Checkout subject", active, [
        fact_kind=subject,
        subject_key="checkout"
    ]),
    kb_assert_relationship(constrains, 'REQ-CONSISTENCY-PARTIAL', 'FACT-CONSISTENCY-SUBJECT', []),
    kb_assert_relationship(requires_property, 'REQ-CONSISTENCY-PARTIAL', 'FACT-CONSISTENCY-MODELED', []),
    coverage_report_json(req, [], true, true, 100, 0, JsonString),
    json_string_dict(JsonString, Report),
    coverage_row(Report.rows, 'REQ-CONSISTENCY-PARTIAL', Row),
    assertion(Row.proofStages.logicGrounding.status == passed),
    Stage = Row.proofStages.contradictions,
    assertion(Stage.status == unresolved),
    assertion(Stage.outcome == analysis_incomplete),
    assertion(memberchk(contradiction_check_incomplete, Row.proofGaps)),
    Context = _{contradictionWitnesses:[], contradictions:[]},
    requirement_proof:contradiction_stage('REQ-CONSISTENCY-PARTIAL', passed, passed, Context, FullyModeled),
    assertion(FullyModeled.outcome == no_conflict_found).

test(what_if_reports_staged_conflicts_and_rolls_back, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    consistency_rule_dict(forbid, initiate_checkout, [v('C', cart)], positive_total_precondition, ForbidDict),
    consistency_rule_dict(permit, initiate_checkout, [v('C', cart)], free_order_success, PermitDict),
    assert_rule_requirement(ForbidDict, 'FACT-RULE-POSITIVE-TOTAL', 'REQ-CHECKOUT-POSITIVE-TOTAL', "CLAIM-EEEEEEEEEEEEEEEE"),
    atom_json_dict(PermitAtom, PermitDict, []),
    atom_string(PermitAtom, PermitJson),
    FactProps = [
        id='FACT-RULE-FREE-ORDER', title="Checkout rule", status=active,
        created_at="2026-05-01T00:00:00Z", updated_at="2026-05-01T00:00:00Z",
        source="test://kb.plt",
        fact_kind=rule, rule_ir=PermitJson,
        rule_hash="cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        rule_schema_id="FACT-RULE-SCHEMA-TEST", rule_name="checkout_rule",
        semantic_key="FACT-RULE-FREE-ORDER", claim_key="CLAIM-FFFFFFFFFFFFFFFF",
        claim_text="Checkout rule clause", claim_span_start=0, claim_span_end=20
    ],
    ReqProps = [
        id='REQ-CHECKOUT-FREE-ORDER', title="Checkout requirement", status=open,
        created_at="2026-05-01T00:00:00Z", updated_at="2026-05-01T00:00:00Z",
        source="test://kb.plt"
    ],
    Entries = [
        upsert(fact, FactProps, []),
        upsert(req, ReqProps, [rel(requires_rule, 'REQ-CHECKOUT-FREE-ORDER', 'FACT-RULE-FREE-ORDER', [])])
    ],
    checks:what_if_contradiction_witnesses(Entries, [Witness]),
    assertion(Witness.status == contradiction),
    checks:what_if_analysis(Entries, Analysis),
    assertion(Analysis.before == []),
    assertion(length(Analysis.introduced, 1)),
    assertion(Analysis.removed == []),
    assertion(Analysis.unchanged == []),
    assertion(\+ kb_entity('REQ-CHECKOUT-FREE-ORDER', _, _)),
    assertion(\+ kb_entity('FACT-RULE-FREE-ORDER', _, _)),
    check_domain_contradiction_witnesses(After),
    assertion(After == []),
    checks:what_if_contradiction_witnesses_json([], Json),
    assertion(Json == "[]").

:- end_tests(kb_truthful_consistency).

:- begin_tests(kb_scenario_feasibility).

% implements REQ-kibi-scenario-feasibility
feasibility_fixture(Expects) :-
    assert_fixture_entity(fact, 'FACT-QUOTA-SUBJECT', "Client call quota", active,
        [fact_kind=subject, subject_key="client.call_quota"]),
    assert_fixture_entity(fact, 'FACT-QUOTA-POSITIVE', "Remaining quota above zero", active,
        [fact_kind=property_value, subject_key="client.call_quota", property_key="remaining",
         operator=gt, value_type=int, value_int=0]),
    assert_fixture_entity(fact, 'FACT-QUOTA-ZERO', "Remaining quota is zero", active,
        [fact_kind=property_value, subject_key="client.call_quota", property_key="remaining",
         operator=eq, value_type=int, value_int=0]),
    assert_fixture_entity(req, 'REQ-QUOTA-CALL', "A client may call only with remaining quota", open, []),
    kb_assert_relationship(constrains, 'REQ-QUOTA-CALL', 'FACT-QUOTA-SUBJECT', []),
    kb_assert_relationship(requires_property, 'REQ-QUOTA-CALL', 'FACT-QUOTA-POSITIVE', []),
    assert_fixture_entity(scenario, 'SCEN-ZERO-QUOTA-CALL', "A zero-quota promo call succeeds", active,
        [expects=Expects]),
    kb_assert_relationship(assumes, 'SCEN-ZERO-QUOTA-CALL', 'FACT-QUOTA-ZERO', []).

test(success_scenario_assuming_a_forbidden_value_is_infeasible, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    feasibility_fixture(success),
    check_scenario_feasibility([violation('scenario-feasibility', 'SCEN-ZERO-QUOTA-CALL', Description, _, _)]),
    assertion(sub_string(Description, _, _, _, "REQ-QUOTA-CALL")),
    assertion(sub_string(Description, _, _, _, "FACT-QUOTA-ZERO")).

test(rejection_scenario_is_not_checked, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    feasibility_fixture(rejection),
    check_scenario_feasibility([]).

test(approved_exception_makes_the_scenario_feasible_without_editing_the_rule, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    feasibility_fixture(success),
    assert_fixture_entity(req, 'REQ-QUOTA-PROMO-EXCEPTION', "Promo calls are exempt from the quota", open,
        [approved_by="Product owner", approval_ref="DEC-42"]),
    kb_assert_relationship(exempts, 'REQ-QUOTA-PROMO-EXCEPTION', 'REQ-QUOTA-CALL', []),
    kb_assert_relationship(specified_by, 'REQ-QUOTA-PROMO-EXCEPTION', 'SCEN-ZERO-QUOTA-CALL', []),
    check_scenario_feasibility([]),
    % The exception covers only the scenario it specifies.
    assert_fixture_entity(scenario, 'SCEN-OTHER-ZERO-QUOTA', "Another zero-quota call succeeds", active,
        [expects=success]),
    kb_assert_relationship(assumes, 'SCEN-OTHER-ZERO-QUOTA', 'FACT-QUOTA-ZERO', []),
    check_scenario_feasibility([violation('scenario-feasibility', 'SCEN-OTHER-ZERO-QUOTA', _, _, _)]),
    assertion(kb:current_req('REQ-QUOTA-CALL')),
    assertion(checks:scenario_feasibility_outcome('SCEN-ZERO-QUOTA-CALL', feasible_by_exception)).

test(unapproved_exception_does_not_exempt, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    feasibility_fixture(success),
    assert_fixture_entity(req, 'REQ-QUOTA-PROMO-EXCEPTION', "Promo calls are exempt from the quota", open, []),
    kb_assert_relationship(exempts, 'REQ-QUOTA-PROMO-EXCEPTION', 'REQ-QUOTA-CALL', []),
    kb_assert_relationship(specified_by, 'REQ-QUOTA-PROMO-EXCEPTION', 'SCEN-ZERO-QUOTA-CALL', []),
    check_scenario_feasibility([violation('scenario-feasibility', 'SCEN-ZERO-QUOTA-CALL', Description, Suggestion, _)]),
    assertion(sub_string(Description, _, _, _, "REQ-QUOTA-PROMO-EXCEPTION")),
    assertion(sub_string(Description, _, _, _, "not approved")),
    assertion(sub_string(Suggestion, _, _, _, "approved_by")),
    assertion(checks:scenario_feasibility_outcome('SCEN-ZERO-QUOTA-CALL', infeasible(_))).

test(blank_approval_does_not_exempt, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    feasibility_fixture(success),
    assert_fixture_entity(req, 'REQ-QUOTA-PROMO-EXCEPTION', "Promo calls are exempt from the quota", open,
        [approved_by="   "]),
    kb_assert_relationship(exempts, 'REQ-QUOTA-PROMO-EXCEPTION', 'REQ-QUOTA-CALL', []),
    kb_assert_relationship(specified_by, 'REQ-QUOTA-PROMO-EXCEPTION', 'SCEN-ZERO-QUOTA-CALL', []),
    check_scenario_feasibility([violation('scenario-feasibility', 'SCEN-ZERO-QUOTA-CALL', _, _, _)]).

test(feasibility_outcomes_distinguish_unknown_from_feasible, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    feasibility_fixture(success),
    assertion(checks:scenario_feasibility_outcome('SCEN-ZERO-QUOTA-CALL', infeasible(witness(['REQ-QUOTA-CALL'], ['FACT-QUOTA-ZERO'], ['FACT-QUOTA-POSITIVE'], _)))),
    % An infeasible scenario with an extra unmatched assumption stays infeasible.
    assert_fixture_entity(fact, 'FACT-QUOTA-TIER', "Tier is gold", active,
        [fact_kind=property_value, subject_key="client.call_quota", property_key="tier",
         operator=eq, value_type=string, value_string="gold"]),
    kb_assert_relationship(assumes, 'SCEN-ZERO-QUOTA-CALL', 'FACT-QUOTA-TIER', []),
    assertion(\+ checks:scenario_feasibility_outcome('SCEN-ZERO-QUOTA-CALL', unknown(_))),
    assert_fixture_entity(scenario, 'SCEN-NO-ASSUMPTIONS', "A call succeeds", active, [expects=success]),
    assertion(checks:scenario_feasibility_outcome('SCEN-NO-ASSUMPTIONS', unknown(no_assumptions))),
    assert_fixture_entity(fact, 'FACT-QUOTA-REGION', "Region is EU", active,
        [fact_kind=property_value, subject_key="client.call_quota", property_key="region",
         operator=eq, value_type=string, value_string="eu"]),
    assert_fixture_entity(scenario, 'SCEN-UNMATCHED', "An EU call succeeds", active, [expects=success]),
    kb_assert_relationship(assumes, 'SCEN-UNMATCHED', 'FACT-QUOTA-REGION', []),
    assertion(checks:scenario_feasibility_outcome('SCEN-UNMATCHED', unknown(unmatched_assumption(['FACT-QUOTA-REGION'])))),
    assert_fixture_entity(fact, 'FACT-QUOTA-FIVE', "Remaining quota is five", active,
        [fact_kind=property_value, subject_key="client.call_quota", property_key="remaining",
         operator=eq, value_type=int, value_int=5]),
    assert_fixture_entity(scenario, 'SCEN-FIVE', "A call with quota succeeds", active, [expects=success]),
    kb_assert_relationship(assumes, 'SCEN-FIVE', 'FACT-QUOTA-FIVE', []),
    assertion(checks:scenario_feasibility_outcome('SCEN-FIVE', feasible)),
    % Rejection scenarios have no success-feasibility outcome.
    assert_fixture_entity(scenario, 'SCEN-REJECTED', "A call is rejected", active, [expects=rejection]),
    assertion(\+ checks:scenario_feasibility_outcome('SCEN-REJECTED', _)),
    % Only unknown outcomes become advisory diagnostics; infeasible stays blocking.
    check_scenario_feasibility_unknown(Unknown),
    findall(Id, member(violation('scenario-feasibility-unknown', Id, _, _, _), Unknown), UnknownIds),
    assertion(UnknownIds == ['SCEN-NO-ASSUMPTIONS', 'SCEN-UNMATCHED']),
    check_scenario_feasibility(Blocking),
    findall(Id, member(violation(_, Id, _, _, _), Blocking), BlockingIds),
    assertion(BlockingIds == ['SCEN-ZERO-QUOTA-CALL']).

test(proof_ladder_reports_unknown_feasibility_as_a_non_blocking_advisory, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    feasibility_fixture(success),
    assert_fixture_entity(scenario, 'SCEN-NO-ASSUMPTIONS', "A call succeeds", active, [expects=success]),
    kb_assert_relationship(specified_by, 'REQ-QUOTA-CALL', 'SCEN-NO-ASSUMPTIONS', []),
    requirement_proof:scenario_stage('REQ-QUOTA-CALL', Stage, _),
    assertion(Stage.status == passed),
    Stage.unknownFeasibility = [Unknown],
    assertion(Unknown.scenario == 'SCEN-NO-ASSUMPTIONS'),
    assertion(Unknown.reason == no_assumptions),
    Stages = _{scenarios: Stage},
    assertion(requirement_proof:proof_gap_present(unknown_scenario_feasibility, Stages)),
    assertion(requirement_proof:proof_issue_advisory(unknown_scenario_feasibility, Stages)),
    assertion(\+ requirement_proof:proof_gap_present(infeasible_scenario, Stages)).

test(compatible_assumption_is_feasible, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    feasibility_fixture(success),
    assert_fixture_entity(fact, 'FACT-QUOTA-FIVE', "Remaining quota is five", active,
        [fact_kind=property_value, subject_key="client.call_quota", property_key="remaining",
         operator=eq, value_type=int, value_int=5]),
    assert_fixture_entity(scenario, 'SCEN-FIVE-QUOTA-CALL', "A call with quota succeeds", active,
        [expects=success]),
    kb_assert_relationship(assumes, 'SCEN-FIVE-QUOTA-CALL', 'FACT-QUOTA-FIVE', []),
    check_scenario_feasibility(Violations),
    assertion(\+ memberchk(violation(_, 'SCEN-FIVE-QUOTA-CALL', _, _, _), Violations)).

test(proof_ladder_blocks_a_requirement_whose_scenario_is_infeasible, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    feasibility_fixture(success),
    kb_assert_relationship(specified_by, 'REQ-QUOTA-CALL', 'SCEN-ZERO-QUOTA-CALL', []),
    requirement_proof:scenario_stage('REQ-QUOTA-CALL', Stage, _),
    assertion(Stage.status == blocked),
    assertion(Stage.infeasibleScenarios == ['SCEN-ZERO-QUOTA-CALL']),
    assertion(requirement_proof:proof_gap_present(infeasible_scenario, _{scenarios: Stage})).

test(what_if_reports_introduced_removed_and_unchanged_infeasibility, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    feasibility_fixture(success),
    % Current KB: SCEN-ZERO-QUOTA-CALL is infeasible.
    checks:what_if_analysis([], Baseline),
    assertion(Baseline.introduced == []),
    assertion(Baseline.removed == []),
    Baseline.unchanged = [Existing],
    assertion(Existing.kind == scenario_feasibility),
    assertion(Existing.scenario == 'SCEN-ZERO-QUOTA-CALL'),
    % A plan adding a second infeasible scenario introduces exactly one witness.
    ScenarioProps = [
        id='SCEN-ANOTHER-ZERO', title="Another zero-quota call", status=active,
        created_at="2026-05-01T00:00:00Z", updated_at="2026-05-01T00:00:00Z",
        source="test://kb.plt", expects=success
    ],
    Add = [upsert(scenario, ScenarioProps, [rel(assumes, 'SCEN-ANOTHER-ZERO', 'FACT-QUOTA-ZERO', [])])],
    checks:what_if_analysis(Add, Added),
    Added.introduced = [Introduced],
    assertion(Introduced.scenario == 'SCEN-ANOTHER-ZERO'),
    assertion(Introduced.status == infeasible),
    assertion(length(Added.unchanged, 1)),
    assertion(\+ kb_entity('SCEN-ANOTHER-ZERO', _, _)),
    % A plan that flips the scenario to rejection removes the witness.
    Flip = [upsert(scenario, [
        id='SCEN-ZERO-QUOTA-CALL', title="A zero-quota promo call is rejected", status=active,
        created_at="2026-05-01T00:00:00Z", updated_at="2026-05-01T00:00:00Z",
        source="test://kb.plt", expects=rejection], [])],
    checks:what_if_analysis(Flip, Flipped),
    assertion(Flipped.introduced == []),
    Flipped.removed = [Removed],
    assertion(Removed.scenario == 'SCEN-ZERO-QUOTA-CALL'),
    assertion(scenario_expects_now('SCEN-ZERO-QUOTA-CALL', success)).

% A property_value fact on client.call_quota.remaining.
quota_fact(Id, Op, Type, Value) :-
    quota_fact(Id, Op, Type, Value, []).

quota_fact(Id, Op, Type, Value, Extra) :-
    value_key(Type, ValueKey),
    append([fact_kind=property_value, subject_key="client.call_quota", property_key="remaining",
            operator=Op, value_type=Type, ValueKey=Value], Extra, Props),
    assert_fixture_entity(fact, Id, "Quota constraint", active, Props).

value_key(int, value_int).
value_key(number, value_number).
value_key(string, value_string).

% A current requirement constraining client.call_quota through FactIds.
quota_requirement(ReqId, FactIds) :-
    (   kb_entity('FACT-QUOTA-SUBJECT', fact, _)
    ->  true
    ;   assert_fixture_entity(fact, 'FACT-QUOTA-SUBJECT', "Client call quota", active,
            [fact_kind=subject, subject_key="client.call_quota"])
    ),
    assert_fixture_entity(req, ReqId, "Quota requirement", open, []),
    kb_assert_relationship(constrains, ReqId, 'FACT-QUOTA-SUBJECT', []),
    forall(member(FactId, FactIds), kb_assert_relationship(requires_property, ReqId, FactId, [])).

success_scenario_assuming(ScenarioId, FactIds) :-
    assert_fixture_entity(scenario, ScenarioId, "A quota call succeeds", active, [expects=success]),
    forall(member(FactId, FactIds), kb_assert_relationship(assumes, ScenarioId, FactId, [])).

test(assumptions_that_are_compatible_alone_can_be_jointly_infeasible, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    % q =< 5 is required; q >= 5 and q != 5 each fit it, but together they
    % leave no value.
    quota_fact('FACT-Q-AT-MOST-5', lte, int, 5),
    quota_requirement('REQ-Q-AT-MOST-5', ['FACT-Q-AT-MOST-5']),
    quota_fact('FACT-Q-AT-LEAST-5', gte, int, 5),
    quota_fact('FACT-Q-NOT-5', neq, int, 5),
    success_scenario_assuming('SCEN-Q-JOINT', ['FACT-Q-AT-LEAST-5', 'FACT-Q-NOT-5']),
    assertion(checks:scenario_feasibility_outcome('SCEN-Q-JOINT',
        infeasible(witness(['REQ-Q-AT-MOST-5'], ['FACT-Q-AT-LEAST-5', 'FACT-Q-NOT-5'], ['FACT-Q-AT-MOST-5'], _)))),
    check_scenario_feasibility([violation('scenario-feasibility', 'SCEN-Q-JOINT', Description, _, _)]),
    assertion(sub_string(Description, _, _, _, "FACT-Q-AT-LEAST-5, FACT-Q-NOT-5")),
    assertion(sub_string(Description, _, _, _, "REQ-Q-AT-MOST-5")),
    check_scenario_feasibility_unknown(Unknown),
    assertion(Unknown == []),
    % The proof ladder and what-if analysis read the same witness.
    kb_assert_relationship(specified_by, 'REQ-Q-AT-MOST-5', 'SCEN-Q-JOINT', []),
    requirement_proof:scenario_stage('REQ-Q-AT-MOST-5', Stage, _),
    assertion(Stage.status == blocked),
    assertion(Stage.infeasibleScenarios == ['SCEN-Q-JOINT']),
    checks:what_if_analysis([], Analysis),
    Analysis.unchanged = [Witness],
    assertion(Witness.assumedFacts == ['FACT-Q-AT-LEAST-5', 'FACT-Q-NOT-5']),
    assertion(Witness.requirements == ['REQ-Q-AT-MOST-5']).

test(joint_infeasibility_uses_integer_semantics_only_when_every_side_is_int, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    % Only 5 lies in (4, 5] for an int, and it is excluded; 4.5 fits a number.
    quota_fact('FACT-Q-AT-MOST-5', lte, int, 5),
    quota_requirement('REQ-Q-AT-MOST-5', ['FACT-Q-AT-MOST-5']),
    quota_fact('FACT-Q-ABOVE-4', gt, int, 4),
    quota_fact('FACT-Q-NOT-5', neq, int, 5),
    success_scenario_assuming('SCEN-Q-INT', ['FACT-Q-ABOVE-4', 'FACT-Q-NOT-5']),
    assertion(checks:scenario_feasibility_outcome('SCEN-Q-INT', infeasible(_))),
    quota_fact('FACT-Q-ABOVE-4-REAL', gt, number, 4),
    success_scenario_assuming('SCEN-Q-REAL', ['FACT-Q-ABOVE-4-REAL', 'FACT-Q-NOT-5']),
    assertion(checks:scenario_feasibility_outcome('SCEN-Q-REAL', feasible)).

test(an_approved_exception_also_lifts_a_joint_conflict, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    quota_fact('FACT-Q-AT-MOST-5', lte, int, 5),
    quota_requirement('REQ-Q-AT-MOST-5', ['FACT-Q-AT-MOST-5']),
    quota_fact('FACT-Q-AT-LEAST-5', gte, int, 5),
    quota_fact('FACT-Q-NOT-5', neq, int, 5),
    success_scenario_assuming('SCEN-Q-JOINT', ['FACT-Q-AT-LEAST-5', 'FACT-Q-NOT-5']),
    assert_fixture_entity(req, 'REQ-Q-EXCEPTION', "Bulk calls may exceed five", open,
        [approved_by="Product owner"]),
    kb_assert_relationship(exempts, 'REQ-Q-EXCEPTION', 'REQ-Q-AT-MOST-5', []),
    kb_assert_relationship(specified_by, 'REQ-Q-EXCEPTION', 'SCEN-Q-JOINT', []),
    check_scenario_feasibility([]),
    assertion(checks:scenario_feasibility_outcome('SCEN-Q-JOINT', feasible_by_exception)).

test(contradictory_assumptions_are_an_advisory_unknown, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    quota_fact('FACT-Q-POSITIVE', gt, int, 0),
    quota_requirement('REQ-Q-POSITIVE', ['FACT-Q-POSITIVE']),
    quota_fact('FACT-Q-ONE', eq, int, 1),
    quota_fact('FACT-Q-TWO', eq, int, 2),
    success_scenario_assuming('SCEN-Q-BOTH', ['FACT-Q-ONE', 'FACT-Q-TWO']),
    assertion(checks:scenario_feasibility_outcome('SCEN-Q-BOTH',
        unknown(contradictory_assumptions(['FACT-Q-ONE', 'FACT-Q-TWO'])))),
    check_scenario_feasibility([]),
    check_scenario_feasibility_unknown([violation('scenario-feasibility-unknown', 'SCEN-Q-BOTH', Description, _, _)]),
    assertion(sub_string(Description, _, _, _, "cannot hold together")),
    kb_assert_relationship(specified_by, 'REQ-Q-POSITIVE', 'SCEN-Q-BOTH', []),
    requirement_proof:scenario_stage('REQ-Q-POSITIVE', Stage, _),
    assertion(Stage.status == passed),
    Stage.unknownFeasibility = [Unknown],
    assertion(Unknown.scenario == 'SCEN-Q-BOTH'),
    assertion(Unknown.reason == contradictory_assumptions).

test(incomparable_assumptions_are_unknown_not_feasible, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    quota_fact('FACT-Q-POSITIVE', gt, int, 0),
    quota_requirement('REQ-Q-POSITIVE', ['FACT-Q-POSITIVE']),
    % A string value cannot be compared with an int constraint.
    quota_fact('FACT-Q-TEXT', eq, string, "plenty"),
    success_scenario_assuming('SCEN-Q-TEXT', ['FACT-Q-TEXT']),
    assertion(checks:scenario_feasibility_outcome('SCEN-Q-TEXT', unknown(incomparable_assumption(['FACT-Q-TEXT'])))),
    % Neither can a quantity in an unrelated unit.
    quota_fact('FACT-Q-BYTES', eq, int, 3, [unit="B"]),
    quota_fact('FACT-Q-SECONDS', gt, int, 0, [unit="s"]),
    quota_requirement('REQ-Q-SECONDS', ['FACT-Q-SECONDS']),
    success_scenario_assuming('SCEN-Q-BYTES', ['FACT-Q-BYTES']),
    assertion(checks:scenario_feasibility_outcome('SCEN-Q-BYTES', unknown(incomparable_assumption(['FACT-Q-BYTES'])))),
    check_scenario_feasibility_unknown(Unknown),
    findall(Id, member(violation(_, Id, _, _, _), Unknown), Ids),
    assertion(Ids == ['SCEN-Q-BYTES', 'SCEN-Q-TEXT']),
    member(violation(_, 'SCEN-Q-TEXT', Description, _, _), Unknown),
    assertion(sub_string(Description, _, _, _, "cannot be compared")).

test(convertible_units_are_compared_canonically, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    quota_fact('FACT-Q-WITHIN-5S', lte, int, 5, [unit="s"]),
    quota_requirement('REQ-Q-WITHIN-5S', ['FACT-Q-WITHIN-5S']),
    quota_fact('FACT-Q-6000MS', eq, int, 6000, [unit="ms"]),
    quota_fact('FACT-Q-4000MS', eq, int, 4000, [unit="ms"]),
    success_scenario_assuming('SCEN-Q-SLOW', ['FACT-Q-6000MS']),
    success_scenario_assuming('SCEN-Q-FAST', ['FACT-Q-4000MS']),
    assertion(checks:scenario_feasibility_outcome('SCEN-Q-SLOW',
        infeasible(witness(['REQ-Q-WITHIN-5S'], ['FACT-Q-6000MS'], ['FACT-Q-WITHIN-5S'], _)))),
    assertion(checks:scenario_feasibility_outcome('SCEN-Q-FAST', feasible)).

test(feasible_requires_the_whole_conjunction_to_be_satisfiable, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    quota_fact('FACT-Q-AT-MOST-5', lte, int, 5),
    quota_requirement('REQ-Q-AT-MOST-5', ['FACT-Q-AT-MOST-5']),
    quota_fact('FACT-Q-AT-LEAST-1', gte, int, 1),
    quota_fact('FACT-Q-AT-MOST-3', lte, int, 3),
    success_scenario_assuming('SCEN-Q-RANGE', ['FACT-Q-AT-LEAST-1', 'FACT-Q-AT-MOST-3']),
    assertion(checks:scenario_feasibility_outcome('SCEN-Q-RANGE', feasible)),
    % Requirements that admit no common value leave the scenario undecided
    % rather than blaming it (the contradiction checks report them).
    quota_fact('FACT-Q-ABOVE-9', gt, int, 9),
    quota_requirement('REQ-Q-ABOVE-9', ['FACT-Q-ABOVE-9']),
    quota_fact('FACT-Q-NOT-0', neq, int, 0),
    success_scenario_assuming('SCEN-Q-NOT-0', ['FACT-Q-NOT-0']),
    assertion(checks:scenario_feasibility_outcome('SCEN-Q-NOT-0',
        unknown(conflicting_requirements(['REQ-Q-ABOVE-9', 'REQ-Q-AT-MOST-5'])))).

% --- Rule lane, validity windows and clause-level exceptions ---------------

% implements REQ-kibi-scenario-feasibility
% Subject.property read: Namespace:Name(C, Var).
property_read_atom(Namespace, Name, Var, Type,
    _{kind:atom, namespace:Namespace, name:Name,
      args:[_{kind:var, name:'C', type:cart}, _{kind:var, name:Var, type:Type}]}).

number_compare(Op, Var, Type, Value,
    _{kind:compare, operator:Op, left:_{kind:var, name:Var, type:Type}, right:_{kind:number, value:Value}}).

checkout_rule_dict(Kind, Modality, Body, Exceptions, Variables, Extra, Dict) :-
    findall(_{name:Name, type:Type}, member(Name-Type, ['C'-cart|Variables]), VariableDicts),
    Dict0 = _{version:'kibi.logic.v1', kind:Kind, modality:Modality,
              head:_{kind:atom, name:checkout, args:[_{kind:var, name:'C', type:cart}]},
              body:Body, exceptions:Exceptions, variables:VariableDicts},
    put_dict(Extra, Dict0, Dict).

% "Checkout may happen only when <Namespace>.<Name> is positive", authored as
% forbid checkout unless the value is above zero.
only_when_positive_rule(Namespace, Name, Extra, Dict) :-
    property_read_atom(Namespace, Name, 'T', money, Read),
    number_compare(gt, 'T', money, 0, Positive),
    checkout_rule_dict(rule, forbid, Read, [Positive], ['T'-money], Extra, Dict).

% A current requirement grounded by typed rules, one claim per rule.
rule_requirement(ReqId, Rules) :-
    findall(ClaimKey, member(rule(_, ClaimKey, _), Rules), ClaimKeys),
    assert_fixture_entity(req, ReqId, "Checkout requirement", open, [logic_claims=ClaimKeys]),
    forall(member(rule(FactId, ClaimKey, Dict), Rules),
        (   atom_json_dict(JsonAtom, Dict, []),
            atom_string(JsonAtom, Json),
            atom_string(FactId, SemanticKey),
            assert_fixture_entity(fact, FactId, "Checkout rule", active, [
                fact_kind=rule, rule_ir=Json,
                rule_hash="dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
                rule_schema_id="FACT-RULE-SCHEMA-TEST", rule_name="checkout_rule",
                semantic_key=SemanticKey, claim_key=ClaimKey,
                claim_text="Checkout clause", claim_span_start=0, claim_span_end=20
            ]),
            kb_assert_relationship(requires_rule, ReqId, FactId, [])
        )).

% A property_value fact on Subject.Property.
property_fact(Id, Subject, Property, Op, Type, Value, Extra) :-
    value_key(Type, ValueKey),
    append([fact_kind=property_value, subject_key=Subject, property_key=Property,
            operator=Op, value_type=Type, ValueKey=Value], Extra, Props),
    assert_fixture_entity(fact, Id, "Cart value", active, Props).

% A success scenario that specifies ReqId (so it performs ReqId's action).
checkout_scenario(ScenarioId, FactIds, ReqId) :-
    success_scenario_assuming(ScenarioId, FactIds),
    kb_assert_relationship(specified_by, ReqId, ScenarioId, []).

approved_exception(ExceptionId, BaseId, ScenarioId, Extra) :-
    assert_fixture_entity(req, ExceptionId, "Free promo checkout", open,
        [approved_by="Product owner"|Extra]),
    kb_assert_relationship(exempts, ExceptionId, BaseId, []),
    kb_assert_relationship(specified_by, ExceptionId, ScenarioId, []).

outcome_name(Outcome, Name) :-
    (   compound(Outcome) -> functor(Outcome, Name, _) ; Name = Outcome ).

test(an_only_when_rule_blocks_a_success_scenario_whose_assumptions_violate_it, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    only_when_positive_rule(cart, total, _{}, Rule),
    rule_requirement('REQ-CHECKOUT-POSITIVE', [rule('FACT-RULE-CHECKOUT-POSITIVE', "CLAIM-AAAAAAAAAAAAAAAA", Rule)]),
    property_fact('FACT-CART-ZERO', "cart", "total", eq, int, 0, []),
    property_fact('FACT-CART-FIVE', "cart", "total", eq, int, 5, []),
    checkout_scenario('SCEN-CHECKOUT-ZERO', ['FACT-CART-ZERO'], 'REQ-CHECKOUT-POSITIVE'),
    checkout_scenario('SCEN-CHECKOUT-FIVE', ['FACT-CART-FIVE'], 'REQ-CHECKOUT-POSITIVE'),
    assertion(checks:scenario_feasibility_outcome('SCEN-CHECKOUT-ZERO',
        infeasible(witness(['REQ-CHECKOUT-POSITIVE'], ['FACT-CART-ZERO'], ['FACT-RULE-CHECKOUT-POSITIVE'], _)))),
    assertion(checks:scenario_feasibility_outcome('SCEN-CHECKOUT-FIVE', feasible)),
    check_scenario_feasibility([violation('scenario-feasibility', 'SCEN-CHECKOUT-ZERO', Description, _, _)]),
    assertion(sub_string(Description, _, _, _, "rule forbids checkout unless gt 0")),
    % The blocking rule, the proof ladder and what-if analysis read one verdict.
    requirement_proof:scenario_stage('REQ-CHECKOUT-POSITIVE', Stage, _),
    assertion(Stage.status == blocked),
    assertion(Stage.infeasibleScenarios == ['SCEN-CHECKOUT-ZERO']),
    checks:what_if_analysis([], Analysis),
    Analysis.unchanged = [Witness],
    assertion(Witness.scenario == 'SCEN-CHECKOUT-ZERO'),
    assertion(Witness.requirementFacts == ['FACT-RULE-CHECKOUT-POSITIVE']),
    % The rule restricts checkout: a scenario not shown to perform it is not
    % governed, so its assumption stays unmatched rather than blocked.
    success_scenario_assuming('SCEN-UNLINKED-ZERO', ['FACT-CART-ZERO']),
    assertion(checks:scenario_feasibility_outcome('SCEN-UNLINKED-ZERO', unknown(unmatched_assumption(['FACT-CART-ZERO'])))),
    % Assuming the action is enough to be governed.
    assert_fixture_entity(fact, 'FACT-CHECKOUT-CART-1', "Cart 1 checks out", active,
        [fact_kind=predicate, predicate_name="checkout", predicate_args=["cart_1"], polarity=assert,
         canonical_key="checkout.cart:cart_1.assert"]),
    success_scenario_assuming('SCEN-ACTION-ZERO', ['FACT-CART-ZERO', 'FACT-CHECKOUT-CART-1']),
    assertion(checks:scenario_feasibility_outcome('SCEN-ACTION-ZERO',
        infeasible(witness(['REQ-CHECKOUT-POSITIVE'], ['FACT-CART-ZERO'], ['FACT-RULE-CHECKOUT-POSITIVE'], _)))).

test(rule_and_property_lanes_give_the_same_feasibility_answers, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    % The same requirement three ways: forbid-unless rule (cart), permit-only-
    % when constraint rule (basket) and typed property value (order).
    only_when_positive_rule(cart, total, _{}, ForbidUnless),
    rule_requirement('REQ-CART-POSITIVE', [rule('FACT-RULE-CART-POSITIVE', "CLAIM-BBBBBBBBBBBBBBBB", ForbidUnless)]),
    property_read_atom(basket, total, 'T', money, BasketRead),
    number_compare(gt, 'T', money, 0, BasketPositive),
    checkout_rule_dict(constraint, permit, _{kind:all, items:[BasketRead, BasketPositive]}, [], ['T'-money], _{}, OnlyWhen),
    rule_requirement('REQ-BASKET-POSITIVE', [rule('FACT-RULE-BASKET-POSITIVE', "CLAIM-CCCCCCCCCCCCCCCC", OnlyWhen)]),
    assert_fixture_entity(fact, 'FACT-ORDER-SUBJECT', "Order", active, [fact_kind=subject, subject_key="order"]),
    property_fact('FACT-ORDER-POSITIVE', "order", "total", gt, number, 0, []),
    assert_fixture_entity(req, 'REQ-ORDER-POSITIVE', "Order total positive", open, []),
    kb_assert_relationship(constrains, 'REQ-ORDER-POSITIVE', 'FACT-ORDER-SUBJECT', []),
    kb_assert_relationship(requires_property, 'REQ-ORDER-POSITIVE', 'FACT-ORDER-POSITIVE', []),
    Sets = [[eq-0], [eq-5], [lte-0], [gte-0, neq-0], [eq-(-1)], [gte-0, lt-1]],
    forall(member(Subject-ReqId, ["cart"-'REQ-CART-POSITIVE', "basket"-'REQ-BASKET-POSITIVE', "order"-'REQ-ORDER-POSITIVE']),
        forall(nth1(Index, Sets, Set),
            (   findall(FactId,
                    (   nth1(Position, Set, Op-Value),
                        format(atom(FactId), 'FACT-~w-~w-~w', [Subject, Index, Position]),
                        property_fact(FactId, Subject, "total", Op, number, Value, [])
                    ),
                    FactIds),
                format(atom(ScenarioId), 'SCEN-~w-~w', [Subject, Index]),
                checkout_scenario(ScenarioId, FactIds, ReqId)
            ))),
    findall(Subject-Names,
        (   member(Subject, ["cart", "basket", "order"]),
            findall(Name,
                (   nth1(Index, Sets, _),
                    format(atom(ScenarioId), 'SCEN-~w-~w', [Subject, Index]),
                    checks:scenario_feasibility_outcome(ScenarioId, Outcome),
                    outcome_name(Outcome, Name)
                ),
                Names)
        ),
        Lanes),
    Expected = [infeasible, feasible, infeasible, feasible, infeasible, feasible],
    assertion(Lanes == ["cart"-Expected, "basket"-Expected, "order"-Expected]).

test(a_rule_with_several_conditions_is_decided_by_entailment_and_refutation, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    % forbid checkout(C) :- cart:total(C, T), cart:region(C, R), T =< 0, R = eu.
    property_read_atom(cart, total, 'T', money, TotalRead),
    property_read_atom(cart, region, 'R', region, RegionRead),
    number_compare(lte, 'T', money, 0, NonPositive),
    InEu = _{kind:compare, operator:eq, left:_{kind:var, name:'R', type:region}, right:_{kind:const, value:eu, type:string}},
    checkout_rule_dict(rule, forbid, _{kind:all, items:[TotalRead, RegionRead, NonPositive, InEu]}, [],
        ['T'-money, 'R'-region], _{}, Rule),
    rule_requirement('REQ-EU-POSITIVE', [rule('FACT-RULE-EU-POSITIVE', "CLAIM-DDDDDDDDDDDDDDDD", Rule)]),
    property_fact('FACT-CART-ZERO', "cart", "total", eq, int, 0, []),
    property_fact('FACT-CART-FIVE', "cart", "total", eq, int, 5, []),
    property_fact('FACT-CART-EU', "cart", "region", eq, string, "eu", []),
    property_fact('FACT-CART-US', "cart", "region", eq, string, "us", []),
    checkout_scenario('SCEN-EU-ZERO', ['FACT-CART-ZERO', 'FACT-CART-EU'], 'REQ-EU-POSITIVE'),
    checkout_scenario('SCEN-US-ZERO', ['FACT-CART-ZERO', 'FACT-CART-US'], 'REQ-EU-POSITIVE'),
    checkout_scenario('SCEN-ZERO-ONLY', ['FACT-CART-ZERO'], 'REQ-EU-POSITIVE'),
    checkout_scenario('SCEN-FIVE-ONLY', ['FACT-CART-FIVE'], 'REQ-EU-POSITIVE'),
    assertion(checks:scenario_feasibility_outcome('SCEN-EU-ZERO',
        infeasible(witness(['REQ-EU-POSITIVE'], ['FACT-CART-EU', 'FACT-CART-ZERO'], ['FACT-RULE-EU-POSITIVE'], _)))),
    assertion(checks:scenario_feasibility_outcome('SCEN-US-ZERO', feasible)),
    assertion(checks:scenario_feasibility_outcome('SCEN-FIVE-ONLY', feasible)),
    % The region is unspecified: neither entailed nor refuted, so unknown.
    assertion(checks:scenario_feasibility_outcome('SCEN-ZERO-ONLY', unknown(undecided_rule(['FACT-RULE-EU-POSITIVE'])))),
    check_scenario_feasibility_unknown([violation('scenario-feasibility-unknown', 'SCEN-ZERO-ONLY', Description, _, _)]),
    assertion(sub_string(Description, _, _, _, "neither satisfy nor refute")),
    requirement_proof:scenario_stage('REQ-EU-POSITIVE', Stage, _),
    assertion(Stage.status == blocked),
    Stage.unknownFeasibility = [Unknown],
    assertion(Unknown.scenario == 'SCEN-ZERO-ONLY'),
    assertion(Unknown.reason == undecided_rule).

test(an_approved_exception_waives_a_rule_only_for_its_scenario, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    only_when_positive_rule(cart, total, _{}, Rule),
    rule_requirement('REQ-CHECKOUT-POSITIVE', [rule('FACT-RULE-CHECKOUT-POSITIVE', "CLAIM-AAAAAAAAAAAAAAAA", Rule)]),
    property_fact('FACT-CART-ZERO', "cart", "total", eq, int, 0, []),
    % The promo scenario specifies only the exception; that is enough to
    % perform the exempted requirement's action.
    success_scenario_assuming('SCEN-FREE-PROMO', ['FACT-CART-ZERO']),
    approved_exception('REQ-FREE-PROMO', 'REQ-CHECKOUT-POSITIVE', 'SCEN-FREE-PROMO', []),
    checkout_scenario('SCEN-OTHER-ZERO', ['FACT-CART-ZERO'], 'REQ-CHECKOUT-POSITIVE'),
    assertion(checks:scenario_feasibility_outcome('SCEN-FREE-PROMO', feasible_by_exception)),
    assertion(checks:scenario_feasibility_outcome('SCEN-OTHER-ZERO', infeasible(_))),
    check_scenario_feasibility(Violations),
    findall(Id, member(violation(_, Id, _, _, _), Violations), Ids),
    assertion(Ids == ['SCEN-OTHER-ZERO']).

test(an_exception_to_one_clause_does_not_waive_another, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    only_when_positive_rule(cart, total, _{}, TotalRule),
    only_when_positive_rule(cart, items, _{}, ItemsRule),
    rule_requirement('REQ-CHECKOUT-PAYABLE', [
        rule('FACT-RULE-POSITIVE-TOTAL', "CLAIM-AAAAAAAAAAAAAAAA", TotalRule),
        rule('FACT-RULE-HAS-ITEMS', "CLAIM-EEEEEEEEEEEEEEEE", ItemsRule)
    ]),
    property_fact('FACT-CART-ZERO', "cart", "total", eq, int, 0, []),
    property_fact('FACT-CART-NO-ITEMS', "cart", "items", eq, int, 0, []),
    property_fact('FACT-CART-TWO-ITEMS', "cart", "items", eq, int, 2, []),
    success_scenario_assuming('SCEN-PROMO-EMPTY', ['FACT-CART-ZERO', 'FACT-CART-NO-ITEMS']),
    approved_exception('REQ-FREE-PROMO', 'REQ-CHECKOUT-PAYABLE', 'SCEN-PROMO-EMPTY',
        [exempts_claims=["CLAIM-AAAAAAAAAAAAAAAA"]]),
    success_scenario_assuming('SCEN-PROMO-TWO-ITEMS', ['FACT-CART-ZERO', 'FACT-CART-TWO-ITEMS']),
    kb_assert_relationship(specified_by, 'REQ-FREE-PROMO', 'SCEN-PROMO-TWO-ITEMS', []),
    % The waived total clause no longer blocks; the items clause still does.
    assertion(checks:scenario_feasibility_outcome('SCEN-PROMO-EMPTY',
        infeasible(witness(['REQ-CHECKOUT-PAYABLE'], ['FACT-CART-NO-ITEMS'], ['FACT-RULE-HAS-ITEMS'], _)))),
    assertion(checks:scenario_feasibility_outcome('SCEN-PROMO-TWO-ITEMS', feasible_by_exception)),
    check_scenario_feasibility([violation('scenario-feasibility', 'SCEN-PROMO-EMPTY', Description, Suggestion, _)]),
    assertion(sub_string(Description, _, _, _, "waives only the claims listed in its exempts_claims")),
    assertion(sub_string(Suggestion, _, _, _, "exempts_claims on REQ-FREE-PROMO")),
    check_exception_claim_keys(KeyViolations),
    assertion(KeyViolations == []).

test(exempts_claims_must_name_claims_of_an_exempted_requirement, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    only_when_positive_rule(cart, total, _{}, Rule),
    rule_requirement('REQ-CHECKOUT-POSITIVE', [rule('FACT-RULE-CHECKOUT-POSITIVE', "CLAIM-AAAAAAAAAAAAAAAA", Rule)]),
    success_scenario_assuming('SCEN-FREE-PROMO', []),
    approved_exception('REQ-TYPO-EXCEPTION', 'REQ-CHECKOUT-POSITIVE', 'SCEN-FREE-PROMO',
        [exempts_claims=["CLAIM-AAAAAAAAAAAAAAAA", "CLAIM-0000000000000000"]]),
    assert_fixture_entity(req, 'REQ-ORPHAN-EXCEPTION', "Exception without a base", open,
        [approved_by="Product owner", exempts_claims=["CLAIM-AAAAAAAAAAAAAAAA"]]),
    check_exception_claim_keys(Violations),
    findall(Id-Description, member(violation('exception-claim-keys', Id, Description, _, _), Violations), Found),
    assertion(length(Found, 2)),
    memberchk('REQ-TYPO-EXCEPTION'-TypoDescription, Found),
    assertion(sub_string(TypoDescription, _, _, _, "CLAIM-0000000000000000")),
    assertion(\+ sub_string(TypoDescription, _, _, _, "CLAIM-AAAAAAAAAAAAAAAA")),
    memberchk('REQ-ORPHAN-EXCEPTION'-OrphanDescription, Found),
    assertion(sub_string(OrphanDescription, _, _, _, "exempts no requirement")),
    check_all(All),
    assertion(All.exception_claim_keys == Violations).

test(validity_windows_decide_whether_a_constraint_applies, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    quota_fact('FACT-Q-POSITIVE-2026', gt, int, 0,
        [valid_from="2026-01-01T00:00:00Z", valid_to="2026-12-31T00:00:00Z"]),
    quota_requirement('REQ-Q-POSITIVE-2026', ['FACT-Q-POSITIVE-2026']),
    quota_fact('FACT-Q-ZERO', eq, int, 0),
    quota_fact('FACT-Q-FIVE', eq, int, 5),
    quota_fact('FACT-Q-ZERO-2025', eq, int, 0,
        [valid_from="2025-03-01T00:00:00Z", valid_to="2025-03-02T00:00:00Z"]),
    quota_fact('FACT-Q-ZERO-MARCH', eq, int, 0,
        [valid_from="2026-03-01T00:00:00Z", valid_to="2026-03-02T00:00:00Z"]),
    quota_fact('FACT-Q-ZERO-NEW-YEAR', eq, int, 0,
        [valid_from="2025-12-31T00:00:00Z", valid_to="2026-01-02T00:00:00Z"]),
    success_scenario_assuming('SCEN-Q-UNTIMED', ['FACT-Q-ZERO']),
    success_scenario_assuming('SCEN-Q-UNTIMED-FIVE', ['FACT-Q-FIVE']),
    success_scenario_assuming('SCEN-Q-2025', ['FACT-Q-ZERO-2025']),
    success_scenario_assuming('SCEN-Q-MARCH', ['FACT-Q-ZERO-MARCH']),
    success_scenario_assuming('SCEN-Q-NEW-YEAR', ['FACT-Q-ZERO-NEW-YEAR']),
    % No scenario time: a bounded constraint may or may not apply.
    assertion(checks:scenario_feasibility_outcome('SCEN-Q-UNTIMED', unknown(undetermined_validity(['FACT-Q-POSITIVE-2026'])))),
    assertion(checks:scenario_feasibility_outcome('SCEN-Q-UNTIMED-FIVE', feasible)),
    assertion(checks:scenario_feasibility_outcome('SCEN-Q-2025', not_applicable(outside_validity(['FACT-Q-ZERO-2025'])))),
    assertion(checks:scenario_feasibility_outcome('SCEN-Q-MARCH',
        infeasible(witness(['REQ-Q-POSITIVE-2026'], ['FACT-Q-ZERO-MARCH'], ['FACT-Q-POSITIVE-2026'], _)))),
    assertion(checks:scenario_feasibility_outcome('SCEN-Q-NEW-YEAR', unknown(undetermined_validity(['FACT-Q-POSITIVE-2026'])))),
    check_scenario_feasibility(Blocking),
    findall(Id, member(violation(_, Id, _, _, _), Blocking), BlockingIds),
    assertion(BlockingIds == ['SCEN-Q-MARCH']),
    check_scenario_feasibility_unknown(Unknown),
    findall(Id, member(violation(_, Id, _, _, _), Unknown), UnknownIds),
    assertion(UnknownIds == ['SCEN-Q-NEW-YEAR', 'SCEN-Q-UNTIMED']),
    member(violation(_, 'SCEN-Q-UNTIMED', Description, _, _), Unknown),
    assertion(sub_string(Description, _, _, _, "validity window")),
    kb_assert_relationship(specified_by, 'REQ-Q-POSITIVE-2026', 'SCEN-Q-UNTIMED', []),
    requirement_proof:scenario_stage('REQ-Q-POSITIVE-2026', Stage, _),
    Stage.unknownFeasibility = [UnknownStage],
    assertion(UnknownStage.reason == undetermined_validity),
    % A rule's own validity window is read the same way.
    only_when_positive_rule(cart, total, _{validFrom:'2026-01-01T00:00:00Z', validTo:'2026-12-31T00:00:00Z'}, Rule),
    rule_requirement('REQ-CHECKOUT-2026', [rule('FACT-RULE-CHECKOUT-2026', "CLAIM-FFFFFFFFFFFFFFFF", Rule)]),
    property_fact('FACT-CART-ZERO', "cart", "total", eq, int, 0, []),
    checkout_scenario('SCEN-CHECKOUT-UNTIMED', ['FACT-CART-ZERO'], 'REQ-CHECKOUT-2026'),
    assertion(checks:scenario_feasibility_outcome('SCEN-CHECKOUT-UNTIMED', unknown(undetermined_validity(['FACT-RULE-CHECKOUT-2026'])))).

test(a_scoped_requirement_does_not_apply_to_a_disjoint_scope, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    only_when_positive_rule(cart, total, _{scope:_{name:eu}}, Rule),
    rule_requirement('REQ-EU-CHECKOUT-POSITIVE', [rule('FACT-RULE-EU-CHECKOUT', "CLAIM-AAAAAAAAAAAAAAAA", Rule)]),
    property_fact('FACT-CART-ZERO-US', "cart", "total", eq, int, 0, [scope="us"]),
    property_fact('FACT-CART-ZERO-EU', "cart", "total", eq, int, 0, [scope="eu"]),
    property_fact('FACT-CART-ZERO', "cart", "total", eq, int, 0, []),
    checkout_scenario('SCEN-US-ZERO', ['FACT-CART-ZERO-US'], 'REQ-EU-CHECKOUT-POSITIVE'),
    checkout_scenario('SCEN-EU-ZERO', ['FACT-CART-ZERO-EU'], 'REQ-EU-CHECKOUT-POSITIVE'),
    checkout_scenario('SCEN-ANY-ZERO', ['FACT-CART-ZERO'], 'REQ-EU-CHECKOUT-POSITIVE'),
    assertion(checks:scenario_feasibility_outcome('SCEN-US-ZERO', not_applicable(disjoint_scope(['FACT-CART-ZERO-US'])))),
    assertion(checks:scenario_feasibility_outcome('SCEN-EU-ZERO', infeasible(_))),
    % An unscoped assumption holds in every scope, the EU included.
    assertion(checks:scenario_feasibility_outcome('SCEN-ANY-ZERO', infeasible(_))),
    check_scenario_feasibility_unknown(Unknown),
    assertion(Unknown == []).

test(numeric_looking_strings_in_numeric_comparisons_are_flagged_not_coerced, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    property_fact('FACT-TOTAL-TEXT-ABOVE', "cart", "total", gt, string, "5", []),
    property_fact('FACT-TOTAL-INT', "cart", "total", lte, int, 100, []),
    property_fact('FACT-TOTAL-TEXT-EQ', "cart", "total", eq, string, "2.50", []),
    property_fact('FACT-CODE-TEXT', "cart", "postal_code", eq, string, "02134", []),
    property_fact('FACT-TIER-TEXT', "cart", "tier", gt, string, "gold", []),
    property_fact('FACT-SCI-TEXT', "cart", "weight", lt, string, "1e3", []),
    check_numeric_string_values(Violations),
    findall(Id, member(violation('numeric-string-value', Id, _, _, _), Violations), Ids),
    assertion(Ids == ['FACT-TOTAL-TEXT-ABOVE', 'FACT-TOTAL-TEXT-EQ']),
    member(violation(_, 'FACT-TOTAL-TEXT-ABOVE', AboveDescription, AboveSuggestion, _), Violations),
    assertion(sub_string(AboveDescription, _, _, _, "operator gt")),
    assertion(sub_string(AboveSuggestion, _, _, _, "value_type: int and value_int: 5")),
    member(violation(_, 'FACT-TOTAL-TEXT-EQ', EqDescription, EqSuggestion, _), Violations),
    assertion(sub_string(EqDescription, _, _, _, "FACT-TOTAL-INT")),
    assertion(sub_string(EqSuggestion, _, _, _, "value_type: number and value_number: 2.5")),
    % The value is reported, never converted: the string stays incomparable.
    assertion(kb:fact_property_tuple('FACT-TOTAL-TEXT-ABOVE', _, _, _, string, "5", _, _, _)).

:- end_tests(kb_scenario_feasibility).

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

:- begin_tests(discovery_search_answer_verdicts).

search_answer_verdict_for(ReqId, Verdict, Scope) :-
    discovery:search_answer_verdicts_json([ReqId], JsonString),
    atom_json_dict(JsonString, Json, []),
    Json.requirements = [Verdict],
    Scope = Json.scope.

test(rule_contradiction_names_the_other_requirement_from_either_side, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    assert_rule_requirement_pair(customer, customer),
    search_answer_verdict_for('REQ-RULE-DENY', Deny, Scope),
    assertion(Deny.id == "REQ-RULE-DENY"),
    assertion(Deny.contradictions = [_{
        kind: "rule",
        status: "contradiction",
        with: "REQ-RULE-ALLOW",
        facts: ["FACT-RULE-DENY", "FACT-RULE-ALLOW"],
        reason: "Rule conflict (contradiction) between REQ-RULE-ALLOW and REQ-RULE-DENY"
    }]),
    assertion(is_dict(Scope)),
    search_answer_verdict_for('REQ-RULE-ALLOW', Allow, _),
    assertion(Allow.contradictions = [_{kind: "rule", status: "contradiction", with: "REQ-RULE-DENY", facts: ["FACT-RULE-ALLOW", "FACT-RULE-DENY"], reason: _}]).

test(rule_overlap_is_reported_as_unresolved, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    assert_rule_requirement_pair(customer, premium_customer),
    search_answer_verdict_for('REQ-RULE-ALLOW', Allow, _),
    assertion(Allow.contradictions = [_{kind: "rule", status: "unresolved", with: "REQ-RULE-DENY", facts: _, reason: _}]).

test(unknown_requirement_has_no_findings, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    search_answer_verdict_for('REQ-DOES-NOT-EXIST', Verdict, _),
    assertion(Verdict.contradictions == []),
    assertion(Verdict.scenarios == []),
    assertion(Verdict.forbids == []),
    assertion(Verdict.inventory.status == "unknown").

:- end_tests(discovery_search_answer_verdicts).

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

test(check_rule_verifiability_normalizes_typed_schema_reference, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    rule_fixture_json(oblige, typed_schema_reference, RuleJson),
    assert_fixture_entity(fact, 'FACT-RULE-SCHEMA-TYPED', "Typed rule schema", active, [
        fact_kind=rule_schema,
        rule_name="kibi.logic.v1",
        argument_names=["rule_ir"],
        argument_types=["logic_ir"]
    ]),
    assert_fixture_entity(fact, 'FACT-RULE-TYPED', "Rule with typed schema reference", active, [
        fact_kind=rule,
        rule_ir=RuleJson,
        rule_hash="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        rule_schema_id="FACT-RULE-SCHEMA-TYPED",
        rule_name="kibi.logic.v1",
        semantic_key="typed_schema_reference",
        claim_key="CLAIM-EEEEEEEEEEEEEEEE",
        claim_text="A typed rule schema reference remains verifiable",
        claim_span_start=0,
        claim_span_end=58
    ]),
    kb_entity('FACT-RULE-TYPED', fact, StoredProps),
    memberchk(rule_schema_id=StoredSchemaId, StoredProps),
    assertion(StoredSchemaId = ^^("FACT-RULE-SCHEMA-TYPED", _)),
    assert_fixture_entity(req, 'REQ-RULE-TYPED', "Requirement with typed rule", open, []),
    kb_assert_relationship(requires_rule, 'REQ-RULE-TYPED', 'FACT-RULE-TYPED', []),
    check_rule_verifiability(Violations),
    assertion(Violations == []).

test(check_rule_verifiability_normalizes_typed_invalid_schema_reference, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    rule_fixture_json(oblige, typed_invalid_schema_reference, RuleJson),
    assert_fixture_entity(fact, 'FACT-NOT-RULE-SCHEMA-TYPED', "Typed non-schema fact", active, [
        fact_kind=observation
    ]),
    assert_fixture_entity(fact, 'FACT-RULE-INVALID-TYPED', "Rule with typed invalid schema reference", active, [
        fact_kind=rule,
        rule_ir=RuleJson,
        rule_hash="bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        rule_schema_id="FACT-NOT-RULE-SCHEMA-TYPED",
        rule_name="kibi.logic.v1",
        semantic_key="typed_invalid_schema_reference",
        claim_key="CLAIM-FFFFFFFFFFFFFFFF",
        claim_text="A typed rule schema reference identifies the schema kind",
        claim_span_start=0,
        claim_span_end=62
    ]),
    assert_fixture_entity(req, 'REQ-RULE-INVALID-TYPED', "Requirement with typed invalid rule", open, []),
    kb_assert_relationship(requires_rule, 'REQ-RULE-INVALID-TYPED', 'FACT-RULE-INVALID-TYPED', []),
    check_rule_verifiability(Violations),
    member(violation('rule-verifiability', 'REQ-RULE-INVALID-TYPED', Description, _, _), Violations),
    assertion(sub_string(Description, _, _, _, "FACT-NOT-RULE-SCHEMA-TYPED, which is not a rule_schema fact")).

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
    check_no_cycles([violation('no-cycles', 'REQ-SELF-CYCLE', Description, _, 'REQ-SELF-CYCLE.md')]),
    assertion(sub_string(Description, _, _, _, "REQ-SELF-CYCLE.md → REQ-SELF-CYCLE.md")).

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

test(check_domain_contradictions_and_witnesses_returns_matching_evidence, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    assert_contradicting_requirement_pair('REQ-CONFLICT-A', 10, 'REQ-CONFLICT-B', 20),
    checks:check_domain_contradictions_and_witnesses(Violations, Witnesses),
    Violations = [violation('domain-contradictions', "REQ-CONFLICT-A/REQ-CONFLICT-B", _, _, "")],
    Witnesses = [Witness],
    assertion(Witness.kind == strict_property),
    assertion(Witness.status == contradiction).

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

test(symbol_traceability_reports_mixed_role_leftovers, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    assert_fixture_entity(req, 'REQ-MIXED-ROLE', "Mixed role req", active, []),
    assert_fixture_entity(test, 'TEST-MIXED-ROLE', "Mixed role test", active, []),
    assert_fixture_entity(symbol, 'SYM-MIXED-ROLE', "Mixed role symbol", active, []),
    kb_assert_relationship(implements, 'SYM-MIXED-ROLE', 'REQ-MIXED-ROLE', []),
    assert_raw_relationship(executable_for, 'SYM-MIXED-ROLE', 'TEST-MIXED-ROLE'),
    check_symbol_traceability(false, Violations),
    member(violation('symbol-traceability', 'SYM-MIXED-ROLE', Description, _, _), Violations),
    sub_string(Description, _, _, _, "mixes executable_for").

test(proof_contract_symbols_reports_unresolved_type_shape_and_source_mismatch, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    ContractUnresolved = _{
        version: 'kibi.proof-contract.v1',
        integration: 'self-proof',
        required_proofs: [_{symbol_id: 'SYM-MISSING-PROOF', target: default}],
        success_policy: all_required_first_attempt
    },
    atom_json_dict(UnresolvedAtom, ContractUnresolved, []),
    atom_string(UnresolvedAtom, UnresolvedJson),
    assert_fixture_entity(test, 'TEST-CONTRACT-UNRESOLVED', "Unresolved proofs", active, [
        verification_scope=end_to_end,
        proof_contract=UnresolvedJson
    ]),
    ContractShape = _{
        version: 'kibi.proof-contract.v1',
        integration: 'self-proof',
        required_proofs: [_{symbol_id: 'SYM-CONTRACT-SHAPE', target: default}],
        success_policy: all_required_first_attempt
    },
    atom_json_dict(ShapeAtom, ContractShape, []),
    atom_string(ShapeAtom, ShapeJson),
    assert_fixture_entity(symbol, 'SYM-CONTRACT-SHAPE', "Shape proof", active, [
        symbol_role='type-shape',
        sourceFile="src/shape.ts"
    ]),
    assert_fixture_entity(test, 'TEST-CONTRACT-SHAPE', "Shape proofs", active, [
        verification_scope=end_to_end,
        proof_contract=ShapeJson
    ]),
    ContractBind = _{
        version: 'kibi.proof-contract.v1',
        integration: 'self-proof',
        required_proofs: [_{symbol_id: 'SYM-CONTRACT-BIND', target: default}],
        success_policy: all_required_first_attempt
    },
    Bindings = [_{symbol_id: 'SYM-CONTRACT-BIND', target: default, source_file: "tests/wrong.spec.ts"}],
    atom_json_dict(BindContractAtom, ContractBind, []),
    atom_string(BindContractAtom, BindContractJson),
    atom_json_dict(BindAtom, Bindings, []),
    atom_string(BindAtom, BindJson),
    assert_fixture_entity(symbol, 'SYM-CONTRACT-BIND', "Bound proof", active, [
        sourceFile="tests/right.spec.ts"
    ]),
    assert_fixture_entity(test, 'TEST-CONTRACT-BIND', "Bound proofs", active, [
        verification_scope=end_to_end,
        proof_contract=BindContractJson,
        proof_bindings=BindJson
    ]),
    check_proof_contract_symbols(Violations),
    member(violation('proof-contract-symbols', 'TEST-CONTRACT-UNRESOLVED', UnresolvedDesc, _, _), Violations),
    sub_string(UnresolvedDesc, _, _, _, "unresolved"),
    member(violation('proof-contract-symbols', 'TEST-CONTRACT-SHAPE', ShapeDesc, _, _), Violations),
    sub_string(ShapeDesc, _, _, _, "type-shape"),
    member(violation('proof-contract-symbols', 'TEST-CONTRACT-BIND', BindDesc, _, _), Violations),
    sub_string(BindDesc, _, _, _, "source_file").

test(superseded_requirement_open_requires_closed_status, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    assert_fixture_entity(req, 'REQ-OLD-OPEN', "Old open", open, []),
    assert_fixture_entity(req, 'REQ-OLD-CLOSED', "Old closed", closed, []),
    assert_fixture_entity(req, 'REQ-NEW', "New", open, []),
    assert_fixture_entity(req, 'REQ-NEWER', "Newer", open, []),
    kb_assert_relationship(supersedes, 'REQ-NEW', 'REQ-OLD-OPEN', []),
    kb_assert_relationship(supersedes, 'REQ-NEWER', 'REQ-OLD-OPEN', []),
    kb_assert_relationship(supersedes, 'REQ-NEW', 'REQ-OLD-CLOSED', []),
    check_superseded_requirement_open(Violations),
    Violations = [violation('superseded-requirement-open', 'REQ-OLD-OPEN', Description, Suggestion, _, Evidence)],
    assertion(Evidence.supersededBy == ['REQ-NEW', 'REQ-NEWER']),
    assertion(Evidence.status == open),
    assertion(sub_string(Description, _, _, _, "superseded by REQ-NEW, REQ-NEWER but its status is open")),
    assertion(sub_string(Suggestion, _, _, _, "close_superseded_requirements")),
    % Closing the requirement clears the finding.
    kb_assert_entity(req, [id='REQ-OLD-OPEN', title="Old open", status=closed,
        created_at="2026-05-01T00:00:00Z", updated_at="2026-05-01T00:00:00Z",
        source="test://kb.plt"]),
    check_superseded_requirement_open(After),
    assertion(After == []).

test(superseded_requirement_open_reports_each_cycle_once, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    assert_fixture_entity(req, 'REQ-LOOP-A', "Loop A", open, []),
    assert_fixture_entity(req, 'REQ-LOOP-B', "Loop B", open, []),
    assert_fixture_entity(req, 'REQ-LOOP-C', "Loop C", open, []),
    assert_fixture_entity(req, 'REQ-TAIL', "Tail", open, []),
    kb_assert_relationship(supersedes, 'REQ-LOOP-A', 'REQ-LOOP-B', []),
    kb_assert_relationship(supersedes, 'REQ-LOOP-B', 'REQ-LOOP-C', []),
    kb_assert_relationship(supersedes, 'REQ-LOOP-C', 'REQ-LOOP-A', []),
    kb_assert_relationship(supersedes, 'REQ-LOOP-C', 'REQ-TAIL', []),
    check_superseded_requirement_open(Violations),
    findall(Id, member(violation(_, Id, _, _, _, _), Violations), Ids),
    % One cycle finding on its first member, plus the open requirement the
    % cycle supersedes; cycle members are not reported again as open.
    assertion(Ids == ['REQ-LOOP-A', 'REQ-TAIL']),
    member(violation(_, 'REQ-LOOP-A', Description, _, _, Evidence), Violations),
    assertion(Evidence.cycle == ['REQ-LOOP-A', 'REQ-LOOP-B', 'REQ-LOOP-C']),
    assertion(length(Evidence.edges, 3)),
    assertion(sub_string(Description, 0, _, _, "Supersession cycle: REQ-LOOP-A, REQ-LOOP-B, REQ-LOOP-C")),
    % no-cycles follows depends_on only, so the cycle is not reported twice.
    check_no_cycles(NoCycles),
    assertion(NoCycles == []).

test(superseded_requirement_open_is_selectable_and_serialized, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    assert_fixture_entity(req, 'REQ-OLD-SEL', "Old", in_progress, []),
    assert_fixture_entity(req, 'REQ-NEW-SEL', "New", open, []),
    kb_assert_relationship(supersedes, 'REQ-NEW-SEL', 'REQ-OLD-SEL', []),
    check_selected_json(['superseded-requirement-open'], Json),
    atom_json_dict(Json, Dict, []),
    Dict.superseded_requirement_open = [Row],
    assertion(Row.entityId == "REQ-OLD-SEL"),
    assertion(Row.evidence.status == "in_progress").

test(symbol_owner_superseded_lists_symbols_without_current_owner, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    assert_fixture_entity(req, 'REQ-RETIRED', "Retired", closed, []),
    assert_fixture_entity(req, 'REQ-DONE', "Done but current", closed, []),
    assert_fixture_entity(req, 'REQ-SUCCESSOR', "Successor", open, []),
    kb_assert_relationship(supersedes, 'REQ-SUCCESSOR', 'REQ-RETIRED', []),
    assert_fixture_entity(symbol, 'SYM-ORPHANED', "orphaned", active, []),
    assert_fixture_entity(symbol, 'SYM-SHARED', "shared", active, []),
    assert_fixture_entity(symbol, 'SYM-DONE', "done", active, []),
    assert_fixture_entity(symbol, 'SYM-GONE', "gone", removed, []),
    kb_assert_relationship(implements, 'SYM-ORPHANED', 'REQ-RETIRED', []),
    kb_assert_relationship(implements, 'SYM-SHARED', 'REQ-RETIRED', []),
    kb_assert_relationship(implements, 'SYM-SHARED', 'REQ-SUCCESSOR', []),
    kb_assert_relationship(implements, 'SYM-DONE', 'REQ-DONE', []),
    kb_assert_relationship(implements, 'SYM-GONE', 'REQ-RETIRED', []),
    check_symbol_owner_superseded(Violations),
    % A closed requirement is done, not retired; removed symbols are ignored.
    Violations = [violation('symbol-owner-superseded', 'SYM-ORPHANED', Description, Suggestion, _, Evidence)],
    assertion(Evidence.owners == ['REQ-RETIRED']),
    assertion(Evidence.replacements == ['REQ-SUCCESSOR']),
    assertion(sub_string(Description, _, _, _, "implements only superseded or deprecated requirements (REQ-RETIRED)")),
    assertion(sub_string(Suggestion, _, _, _, "implements REQ-SUCCESSOR")).

test(symbol_owner_superseded_caps_the_list_with_a_summary, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    assert_fixture_entity(req, 'REQ-RETIRED-CAP', "Retired", closed, []),
    assert_fixture_entity(req, 'REQ-SUCCESSOR-CAP', "Successor", open, []),
    kb_assert_relationship(supersedes, 'REQ-SUCCESSOR-CAP', 'REQ-RETIRED-CAP', []),
    forall(between(1, 27, N),
           (   format(atom(Id), 'SYM-CAP-~|~`0t~d~2+', [N]),
               assert_fixture_entity(symbol, Id, "capped", active, []),
               kb_assert_relationship(implements, Id, 'REQ-RETIRED-CAP', [])
           )),
    check_symbol_owner_superseded(Violations),
    length(Violations, 26),
    last(Violations, violation('symbol-owner-superseded', workspace, Summary, _, _, Evidence)),
    assertion(Evidence.total == 27),
    assertion(Evidence.listed == 25),
    assertion(sub_string(Summary, 0, _, _, "2 more symbol(s)")),
    Violations = [violation(_, First, _, _, _, _)|_],
    assertion(First == 'SYM-CAP-01').

test(adr_unlinked_and_adr_proposed_report_drifting_decisions, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    assert_fixture_entity(req, 'REQ-GOVERNED', "Governed", open, []),
    assert_fixture_entity(adr, 'ADR-LINKED', "Linked", accepted, []),
    assert_fixture_entity(adr, 'ADR-LINKED-FROM-REQ', "Linked from req", accepted, []),
    assert_fixture_entity(adr, 'ADR-ALONE', "Alone", accepted, []),
    assert_fixture_entity(adr, 'ADR-PENDING', "Pending", proposed, []),
    assert_fixture_entity(adr, 'ADR-PENDING-REPLACED', "Pending replaced", proposed, []),
    assert_fixture_entity(symbol, 'SYM-CONSTRAINED', "constrained", active, []),
    kb_assert_relationship(relates_to, 'ADR-LINKED', 'REQ-GOVERNED', []),
    kb_assert_relationship(relates_to, 'REQ-GOVERNED', 'ADR-LINKED-FROM-REQ', []),
    kb_assert_relationship(supersedes, 'ADR-LINKED', 'ADR-PENDING-REPLACED', []),
    % A symbol constraint says where a decision applies, not which intent it serves.
    kb_assert_relationship(constrained_by, 'SYM-CONSTRAINED', 'ADR-ALONE', []),
    check_adr_unlinked(Unlinked),
    findall(Id, member(violation('adr-unlinked', Id, _, _, _), Unlinked), UnlinkedIds),
    assertion(UnlinkedIds == ['ADR-ALONE']),
    check_adr_proposed(Proposed),
    findall(Id, member(violation('adr-proposed', Id, _, _, _), Proposed), ProposedIds),
    assertion(ProposedIds == ['ADR-PENDING']).

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

test(exact_branch_policy_requires_new_to_old_supersession,
     [setup(setup_kb), cleanup(cleanup_kb), nondet]) :-
    assert_branch_initialization_policy_pair,
    catch(
        (check_req_contradiction('REQ-BRANCH-EXACT'), Caught = false),
        error(kb_contradiction(Pairs), _),
        (assertion(Pairs \= []), Caught = true)
    ),
    assertion(Caught == true),
    kb_commit_upsert(req, [
        id='REQ-BRANCH-EXACT',
        title="Exact Git branch store policy",
        status=open,
        created_at="2026-02-01T00:00:00Z",
        updated_at="2026-02-01T00:00:00Z",
        source="test://kb.plt"
    ], [rel(supersedes, 'REQ-BRANCH-EXACT', 'REQ-BRANCH-LEGACY', [])], false, updated),
    kb_relationship(supersedes, 'REQ-BRANCH-EXACT', 'REQ-BRANCH-LEGACY'),
    \+ contradicting_reqs(_, _, _).

test(cross_identity_migration_refusal_conflicts_with_legacy_exception,
     [setup(setup_kb), cleanup(cleanup_kb), nondet]) :-
    assert_cross_identity_migration_policy_pair,
    catch(
        (check_req_contradiction('REQ-MIGRATION-EXACT'), Caught = false),
        error(kb_contradiction(Pairs), _),
        (assertion(Pairs \= []), Caught = true)
    ),
    assertion(Caught == true),
    kb_commit_upsert(req, [
        id='REQ-MIGRATION-EXACT',
        title="Same-identity migration policy",
        status=open,
        created_at="2026-02-01T00:00:00Z",
        updated_at="2026-02-01T00:00:00Z",
        source="test://kb.plt"
    ], [rel(supersedes, 'REQ-MIGRATION-EXACT', 'REQ-MIGRATION-LEGACY', [])], false, updated),
    \+ contradicting_reqs(_, _, _).

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
    test_kb_dir(KbDir),
    directory_file_path(KbDir, 'temp-artifact.tmp', TempFile),
    open(TempFile, write, Stream),
    close(Stream),
    exists_file(TempFile),
    kb:cleanup_temp_file(TempFile),
    \+ exists_file(TempFile).

:- end_tests(kb_internal_coverage_gaps).

:- begin_tests(requirement_applicability).

test(req_status_vocabulary_accepts_canonical_and_legacy_statuses, [setup(setup_kb), cleanup(cleanup_kb), nondet]) :-
    assert_fixture_entity(req, 'REQ-CANON-OPEN', "Canonical open", open, []),
    assert_fixture_entity(req, 'REQ-CANON-INPROG', "Canonical in_progress", in_progress, []),
    assert_fixture_entity(req, 'REQ-CANON-CLOSED', "Canonical closed", closed, []),
    assert_fixture_entity(req, 'REQ-LEGACY-ACTIVE', "Legacy active", active, []),
    assert_fixture_entity(req, 'REQ-LEGACY-APPROVED', "Legacy approved", approved, []),
    checks:check_req_status_vocabulary(Violations),
    Violations == [].

test(req_status_vocabulary_rejects_adr_statuses_on_requirements, [setup(setup_kb), cleanup(cleanup_kb), nondet]) :-
    assert_fixture_entity(req, 'REQ-ACCEPTED-STATUS', "Accepted status", accepted, [source="docs/requirements/REQ-ACCEPTED-STATUS.md"]),
    checks:check_req_status_vocabulary([violation('req-status-vocabulary', 'REQ-ACCEPTED-STATUS', Description, Suggestion, Source)]),
    assertion(sub_string(Description, _, _, _, "accepted")),
    assertion(sub_string(Suggestion, _, _, _, "proof_exempt")),
    Source == 'REQ-ACCEPTED-STATUS.md'.

test(req_status_vocabulary_is_wired_into_check_all, [setup(setup_kb), cleanup(cleanup_kb), nondet]) :-
    assert_fixture_entity(req, 'REQ-BAD-STATUS', "Bad status", accepted, []),
    checks:check_all(Dict),
    % The aggregated result must carry the rule and flag the bad requirement.
    assertion(member(violation('req-status-vocabulary', 'REQ-BAD-STATUS', _, _, _), Dict.req_status_vocabulary)),
    checks:check_req_status_vocabulary([_|_]).

test(requirement_proof_reports_typed_reason_for_noncurrent_status, [setup(setup_kb), cleanup(cleanup_kb), nondet]) :-
    assert_fixture_entity(req, 'REQ-ACCEPTED-NONCURRENT', "Accepted noncurrent", accepted, []),
    kb_entity('REQ-ACCEPTED-NONCURRENT', req, Props),
    requirement_proof:requirement_proof_context(unknown, "1970-01-01T00:00:00Z", 604800, Context),
    requirement_proof:requirement_proof('REQ-ACCEPTED-NONCURRENT', Props, Context, Proof),
    Proof.proofStatus == not_applicable,
    Proof.proofGaps == [],
    Applicability = Proof.proofStages.applicability,
    Applicability.status == not_applicable,
    sub_atom(Applicability.reason, _, _, _, "status 'accepted' is not a current requirement status").

test(requirement_proof_reports_superseded_reason, [setup(setup_kb), cleanup(cleanup_kb), nondet]) :-
    assert_fixture_entity(req, 'REQ-OLD-SUPERSEDED', "Old requirement", closed, []),
    assert_fixture_entity(req, 'REQ-NEW-CURRENT', "New requirement", open, [priority=must]),
    kb_assert_relationship(supersedes, 'REQ-NEW-CURRENT', 'REQ-OLD-SUPERSEDED', []),
    kb_entity('REQ-OLD-SUPERSEDED', req, Props),
    requirement_proof:requirement_proof_context(unknown, "1970-01-01T00:00:00Z", 604800, Context),
    requirement_proof:requirement_proof('REQ-OLD-SUPERSEDED', Props, Context, Proof),
    Applicability = Proof.proofStages.applicability,
    Applicability.status == not_applicable,
    sub_atom(Applicability.reason, _, _, _, "superseded").

test(requirement_proof_exempts_current_requirement_with_reason, [setup(setup_kb), cleanup(cleanup_kb), nondet]) :-
    assert_fixture_entity(req, 'REQ-EXEMPT', "Exempt requirement", open, [
        priority=must,
        proof_exempt=true,
        proof_exempt_reason="toolchain currency: verified by CI, not product E2E"
    ]),
    kb_entity('REQ-EXEMPT', req, Props),
    requirement_proof:requirement_proof_context(unknown, "1970-01-01T00:00:00Z", 604800, Context),
    requirement_proof:requirement_proof('REQ-EXEMPT', Props, Context, Proof),
    Proof.proofStatus == not_applicable,
    Proof.proofGaps == [],
    Applicability = Proof.proofStages.applicability,
    Applicability.status == not_applicable,
    sub_atom(Applicability.reason, _, _, _, "toolchain currency").

test(requirement_proof_ignores_exemption_without_reason, [setup(setup_kb), cleanup(cleanup_kb), nondet]) :-
    assert_fixture_entity(req, 'REQ-EXEMPT-NO-REASON', "Exempt without reason", open, [
        priority=must,
        proof_exempt=true
    ]),
    kb_entity('REQ-EXEMPT-NO-REASON', req, Props),
    requirement_proof:requirement_proof_context(unknown, "1970-01-01T00:00:00Z", 604800, Context),
    requirement_proof:requirement_proof('REQ-EXEMPT-NO-REASON', Props, Context, Proof),
    \+ Proof.proofStatus == not_applicable,
    \+ dict_has_key(Proof.proofStages, applicability).

test(coverage_report_status_filter_returns_only_matching_rows, [setup(setup_kb), cleanup(cleanup_kb), nondet]) :-
    seed_coverage_depth_fixture,
    coverage_report_json(req, [], false, [not_applicable], true, 100, 0, unknown, "1970-01-01T00:00:00Z", 604800, JsonString),
    json_string_dict(JsonString, Report),
    Report.rows == [].
test(coverage_report_status_filter_includes_not_applicable_with_reason, [setup(setup_kb), cleanup(cleanup_kb), nondet]) :-
    assert_fixture_entity(req, 'REQ-NA-STATUS', "N/A via status", accepted, []),
    coverage_report_json(req, [], false, [not_applicable], true, 100, 0, unknown, "1970-01-01T00:00:00Z", 604800, JsonString),
    json_string_dict(JsonString, Report),
    coverage_row(Report.rows, 'REQ-NA-STATUS', Row),
    Row.proofStatus == not_applicable,
    sub_atom(Row.proofStages.applicability.reason, _, _, _, "accepted"),
    Report.summary.total >= 1.

test(coverage_report_status_filter_can_enumerate_missing_rows, [setup(setup_kb), cleanup(cleanup_kb), nondet]) :-
    seed_coverage_depth_fixture,
    coverage_report_json(req, [], false, [missing], true, 100, 0, unknown, "1970-01-01T00:00:00Z", 604800, JsonString),
    json_string_dict(JsonString, Report),
    coverage_row(Report.rows, 'REQ-UNIT-ONLY', Row),
    Row.proofStatus == missing,
    forall(member(R, Report.rows), R.proofStatus == missing).

test(production_symbol_stage_reports_reason_with_status, [setup(setup_kb), cleanup(cleanup_kb), nondet]) :-
    assert_fixture_entity(req, 'REQ-STAGE-REASON', "Stage reason", active, [priority=must]),
    kb_entity('REQ-STAGE-REASON', req, _Props),
    requirement_proof:production_symbol_stage('REQ-STAGE-REASON', [], Stage, _),
    Stage.status == missing,
    sub_atom(Stage.reason, _, _, _, "no production symbols implement").

dict_has_key(Dict, Key) :- is_dict(Dict), get_dict(Key, Dict, _).

:- end_tests(requirement_applicability).

% ------------------------------------------------------------------
% Vocabulary convergence, redundancy, and unit canonicalization
% implements REQ-kibi-domain-redundancy, REQ-kibi-unit-canonicalization,
% REQ-kibi-subject-vocabulary, REQ-kibi-ontology-quality,
% REQ-kibi-entity-id-style, REQ-kibi-restates-relationship
% ------------------------------------------------------------------

:- begin_tests(semantic_quality_checks).

test(unit_canonicalization_equates_known_duration_and_size_units) :-
    canonical_quantity(int, 30, min, T1, V1, U1),
    canonical_quantity(int, 1800, s, T2, V2, U2),
    canonical_quantity(number, 0.5, hours, T3, V3, U3),
    assertion([T1, V1, U1] == [int, 1800, s]),
    assertion([T2, V2, U2] == [int, 1800, s]),
    assertion([T3, V3, U3] == [int, 1800, s]),
    canonical_quantity(int, 2, 'MB', _, BytesA, byte),
    canonical_quantity(int, 2000000, bytes, _, BytesB, byte),
    assertion(BytesA =:= BytesB),
    canonical_quantity(number, 0.1, h, T4, V4, _),
    assertion([T4, V4] == [int, 360]).

test(unit_canonicalization_keeps_unknown_and_ambiguous_units_distinct) :-
    canonical_quantity(int, 3, 'Mb', _, 3, 'Mb'),
    canonical_quantity(int, 3, month, _, 3, month),
    canonical_quantity(int, 7, exit_code, int, 7, exit_code),
    canonical_quantity(string, abc, '', string, abc, ''),
    canonical_quantity(int, 1, 'KB', _, 1, 'KB').

test(unit_canonicalization_keeps_large_values_exact) :-
    % Adjacent big integers must never collapse onto one canonical value.
    canonical_quantity(int, 12345678901234567891, s, int, A, s),
    canonical_quantity(int, 12345678901234567892, s, int, B, s),
    assertion(A == 12345678901234567891),
    assertion(A \== B),
    canonical_quantity(int, 12345678901234567891, min, int, Minutes, s),
    assertion(Minutes =:= 12345678901234567891 * 60),
    % A float too large to round is kept rather than raising.
    canonical_quantity(number, 1.0e305, s, number, Huge, s),
    assertion(Huge =:= 1.0e305).

test(every_listed_unit_alias_converts_to_its_family_base_unit) :-
    findall(Unit-Base-Factor, unit_base(Unit, Base, Factor), Aliases),
    assertion(Aliases \== []),
    forall(member(Unit-Base-Factor, Aliases),
           (   canonical_quantity(number, 1.0, Unit, _, Value, CanonUnit),
               assertion(CanonUnit == Base),
               assertion(abs(Value - Factor) =< 1.0e-9 * max(1, Factor))
           )),
    % Each family has exactly one base unit and the base converts to itself.
    forall(member(_-Base-_, Aliases),
           assertion(unit_base(Base, Base, 1))).

test(equivalent_units_share_a_logical_ground_signature, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    sq_property_fact('FACT-SESSION-TTL-MIN', "session.lifetime", ttl, lte, int, 30, min),
    sq_property_fact('FACT-SESSION-TTL-SEC', "session.lifetime", ttl, lte, int, 1800, seconds),
    sq_property_fact('FACT-SESSION-TTL-UNKNOWN', "session.lifetime", ttl, lte, int, 1800, ticks),
    logical_ground_signature('FACT-SESSION-TTL-MIN', SigA),
    logical_ground_signature('FACT-SESSION-TTL-SEC', SigB),
    logical_ground_signature('FACT-SESSION-TTL-UNKNOWN', SigC),
    assertion(SigA == SigB),
    assertion(SigA \== SigC).

test(contradictions_compare_canonical_units, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    sq_subject_fact('FACT-SUBJ-SESSION', "session.lifetime"),
    sq_property_fact('FACT-TTL-MAX-30M', "session.lifetime", ttl, lte, int, 30, min),
    sq_property_fact('FACT-TTL-MIN-1H', "session.lifetime", ttl, gte, int, 3600, s),
    sq_property_fact('FACT-TTL-MIN-1800S', "session.lifetime", ttl, gte, int, 1800, s),
    sq_strict_req('REQ-session-ttl-max', 'FACT-SUBJ-SESSION', 'FACT-TTL-MAX-30M'),
    sq_strict_req('REQ-session-ttl-min-hour', 'FACT-SUBJ-SESSION', 'FACT-TTL-MIN-1H'),
    sq_strict_req('REQ-session-ttl-min-half-hour', 'FACT-SUBJ-SESSION', 'FACT-TTL-MIN-1800S'),
    check_domain_contradiction_witnesses(Witnesses),
    findall(Pair, (member(W, Witnesses), Pair = W.requirements), Pairs),
    assertion(memberchk(['REQ-session-ttl-max', 'REQ-session-ttl-min-hour'], Pairs)),
    assertion(\+ memberchk(['REQ-session-ttl-max', 'REQ-session-ttl-min-half-hour'], Pairs)),
    member(Witness, Witnesses),
    Witness.requirements == ['REQ-session-ttl-max', 'REQ-session-ttl-min-hour'],
    % Evidence keeps the authored quantity, not the canonical one.
    assertion(Witness.left.term.unit == min),
    assertion(Witness.left.term.value == 30).

test(domain_redundancy_reports_same_signature_across_requirements, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    sq_subject_fact('FACT-SUBJ-SESSION', "session.lifetime"),
    sq_property_fact('FACT-TTL-30M', "session.lifetime", ttl, lte, int, 30, min),
    sq_property_fact('FACT-TTL-1800S', "session.lifetime", ttl, lte, int, 1800, s),
    sq_strict_req('REQ-billing-session-ttl', 'FACT-SUBJ-SESSION', 'FACT-TTL-30M'),
    sq_strict_req('REQ-platform-session-ttl', 'FACT-SUBJ-SESSION', 'FACT-TTL-1800S'),
    check_domain_redundancy_witnesses(Witnesses),
    assertion(length(Witnesses, 1)),
    Witnesses = [Witness],
    assertion(Witness.requirements == ['REQ-billing-session-ttl', 'REQ-platform-session-ttl']),
    assertion(Witness.facts == ['FACT-TTL-30M', 'FACT-TTL-1800S']),
    assertion(Witness.match == same_signature),
    assertion(sub_string(Witness.signature, _, _, _, "1800")),
    check_domain_redundancy(Violations),
    Violations = [violation('domain-redundancy', EntityId, _, _, _, Evidence)],
    assertion(EntityId == "REQ-billing-session-ttl/REQ-platform-session-ttl"),
    assertion(Evidence.witnesses =@= [Witness]).

test(domain_redundancy_reports_a_shared_ground_fact, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    sq_subject_fact('FACT-SUBJ-EXPORT', "report.export"),
    sq_property_fact('FACT-EXPORT-CSV', "report.export", format, eq, string, csv, ''),
    sq_strict_req('REQ-report-export-csv', 'FACT-SUBJ-EXPORT', 'FACT-EXPORT-CSV'),
    sq_strict_req('REQ-analytics-export-csv', 'FACT-SUBJ-EXPORT', 'FACT-EXPORT-CSV'),
    check_domain_redundancy_witnesses([Witness]),
    assertion(Witness.match == shared_fact),
    assertion(Witness.facts == ['FACT-EXPORT-CSV', 'FACT-EXPORT-CSV']).

test(domain_redundancy_is_suppressed_by_restates_and_supersedes, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    sq_subject_fact('FACT-SUBJ-EXPORT', "report.export"),
    sq_property_fact('FACT-EXPORT-CSV', "report.export", format, eq, string, csv, ''),
    sq_strict_req('REQ-report-export-csv', 'FACT-SUBJ-EXPORT', 'FACT-EXPORT-CSV'),
    sq_strict_req('REQ-analytics-export-csv', 'FACT-SUBJ-EXPORT', 'FACT-EXPORT-CSV'),
    sq_strict_req('REQ-legacy-export-csv', 'FACT-SUBJ-EXPORT', 'FACT-EXPORT-CSV'),
    % restates in either direction exempts the pair; supersedes retires one side.
    kb_assert_relationship(restates, 'REQ-report-export-csv', 'REQ-analytics-export-csv', []),
    kb_assert_relationship(supersedes, 'REQ-analytics-export-csv', 'REQ-legacy-export-csv', []),
    check_domain_redundancy_witnesses(Witnesses),
    assertion(Witnesses == []).

test(domain_redundancy_ignores_opposite_polarity, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    sq_predicate_fact('FACT-PRED-EXPORT-ALLOW', export_allowed, [report, csv], assert),
    sq_predicate_fact('FACT-PRED-EXPORT-DENY', export_allowed, [report, csv], deny),
    sq_predicate_fact('FACT-PRED-EXPORT-ALLOW-2', export_allowed, [report, csv], assert),
    sq_req('REQ-export-allowed'),
    sq_req('REQ-export-denied'),
    sq_req('REQ-export-allowed-again'),
    kb_assert_relationship(requires_predicate, 'REQ-export-allowed', 'FACT-PRED-EXPORT-ALLOW', []),
    kb_assert_relationship(requires_predicate, 'REQ-export-denied', 'FACT-PRED-EXPORT-DENY', []),
    kb_assert_relationship(requires_predicate, 'REQ-export-allowed-again', 'FACT-PRED-EXPORT-ALLOW-2', []),
    check_domain_redundancy_witnesses(Witnesses),
    findall(Pair, (member(W, Witnesses), Pair = W.requirements), Pairs),
    assertion(Pairs == [['REQ-export-allowed', 'REQ-export-allowed-again']]).

test(domain_redundancy_scales_by_grouping_not_pairwise_join, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    sq_synthetic_redundancy_kb(40, 0),
    sq_redundancy_inferences(Small, SmallCount),
    sq_synthetic_redundancy_kb(160, 40),
    sq_redundancy_inferences(Large, LargeCount),
    % Every fourth synthetic requirement duplicates its predecessor.
    assertion(SmallCount =:= 10),
    assertion(LargeCount =:= 40),
    % 4x the requirements must cost well under the 16x of a pairwise join.
    Ratio is Large / Small,
    assertion(Ratio < 10).

test(domain_implication_reports_stronger_numeric_bounds, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    sq_subject_fact('FACT-SUBJ-SESSION', "session.lifetime"),
    sq_property_fact('FACT-TTL-LTE-30M', "session.lifetime", ttl, lte, int, 30, min),
    sq_property_fact('FACT-TTL-LTE-1H', "session.lifetime", ttl, lte, int, 3600, s),
    sq_property_fact('FACT-TTL-LTE-2H-TICKS', "session.lifetime", ttl, lte, int, 2, ticks),
    sq_strict_req('REQ-session-ttl-strict', 'FACT-SUBJ-SESSION', 'FACT-TTL-LTE-30M'),
    sq_strict_req('REQ-session-ttl-loose', 'FACT-SUBJ-SESSION', 'FACT-TTL-LTE-1H'),
    sq_strict_req('REQ-session-ttl-ticks', 'FACT-SUBJ-SESSION', 'FACT-TTL-LTE-2H-TICKS'),
    check_domain_implication_witnesses(Witnesses),
    assertion(length(Witnesses, 1)),
    Witnesses = [Witness],
    assertion(Witness.requirements == ['REQ-session-ttl-strict', 'REQ-session-ttl-loose']),
    assertion(Witness.status == implied_by),
    check_domain_implication([violation('domain-implication', _, Description, _, _, _)]),
    assertion(sub_string(Description, 0, _, _, "Implied by")),
    % Identical bounds are redundancy, never implication.
    assertion(\+ bound_implies_for_test(lte, 30, lte, 30)).

test(subject_key_identity_flags_requirement_derived_subjects, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    sq_req('REQ-cli-gc'),
    sq_req('REQ-opencode-kibi-plugin-v1'),
    sq_subject_fact('FACT-SUBJ-REQ-CLI-GC', "req.req_cli_gc"),
    sq_subject_fact('FACT-SUBJ-PLUGIN-DOC', "req.opencode_kibi_plugin_v1.document"),
    sq_subject_fact('FACT-SUBJ-CLI-GC', "kibi.cli.gc"),
    sq_subject_fact('FACT-SUBJ-REQ-UNKNOWN', "req.no_such_requirement"),
    sq_property_fact('FACT-PROP-REQ-CLI-GC', "req.req_cli_gc", removes_stale_stores, eq, bool, true, ''),
    sq_property_fact('FACT-PROP-ORPHAN', "req.cli_gc.orphan", removes_stale_stores, eq, bool, true, ''),
    check_subject_key_identity(Violations),
    findall(Id, member(violation(_, Id, _, _, _), Violations), Ids),
    assertion(Ids == ['FACT-PROP-ORPHAN', 'FACT-SUBJ-PLUGIN-DOC', 'FACT-SUBJ-REQ-CLI-GC']).

test(subject_key_shape_accepts_only_dotted_snake_segments, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    assertion(valid_subject_key('kibi.cli.check.staged')),
    assertion(valid_subject_key('opencode.kibi_plugin.v1')),
    assertion(\+ valid_subject_key(kibi)),
    assertion(\+ valid_subject_key('Kibi.cli')),
    assertion(\+ valid_subject_key('kibi..cli')),
    assertion(\+ valid_subject_key('kibi.cli_')),
    assertion(\+ valid_subject_key('kibi.cli__gc')),
    assertion(\+ valid_subject_key('kibi.2fa')),
    sq_subject_fact('FACT-SUBJ-GOOD', "kibi.cli.gc"),
    sq_subject_fact('FACT-SUBJ-FLAT', "kibi_codex_plugin"),
    check_subject_key_shape([violation('subject-key-shape', 'FACT-SUBJ-FLAT', _, _, _)]).

test(ontology_quality_flags_prose_atoms_and_respects_thresholds, [setup(setup_kb), cleanup(cleanup_kb), cleanup(set_ontology_quality_overrides(default, default))]) :-
    set_ontology_quality_overrides(default, default),
    sq_predicate_schema('FACT-SCHEMA-CATCH-ALL', catch_all_rule, [subject, obligation, outcome]),
    sq_predicate_schema('FACT-SCHEMA-EXPORT', export_allowed, [report, format]),
    forall(between(1, 10, N),
           (   format(atom(Id), 'FACT-CATCH-ALL-~w', [N]),
               format(atom(S), 'subject_~w', [N]),
               format(atom(O), 'obligation_~w', [N]),
               sq_predicate_fact(Id, catch_all_rule, [S, O, outcome_shared], assert)
           )),
    forall(between(1, 10, N),
           (   format(atom(Id), 'FACT-EXPORT-~w', [N]),
               Report is N mod 2,
               format(atom(R), 'report_~w', [Report]),
               sq_predicate_fact(Id, export_allowed, [R, csv], assert)
           )),
    check_ontology_quality(Violations),
    assertion(length(Violations, 1)),
    Violations = [violation('ontology-quality', 'FACT-SCHEMA-CATCH-ALL', Description, _, _, Evidence)],
    % The message names the arguments that carry prose, not the shared one.
    assertion(sub_string(Description, _, _, _, "prose-like arguments: subject (10/10), obligation (10/10)")),
    assertion(\+ sub_string(Description, _, _, _, "outcome (")),
    Evidence.witnesses = [Witness],
    assertion(Witness.factCount == 10),
    assertion(Witness.singletonRatio >= 0.66),
    assertion(Witness.positions = [_{argument: subject, distinctValues: 10, singletonValues: 10}|_]),
    % Raising the minimum fact count hides small schemas entirely.
    set_ontology_quality_overrides(default, 11),
    check_ontology_quality(NoViolations),
    assertion(NoViolations == []),
    % Out-of-range overrides fall back to the defaults.
    set_ontology_quality_overrides(5, 0),
    ontology_quality_settings(Ratio, MinFacts),
    assertion(Ratio =:= 0.6),
    assertion(MinFacts =:= 8).

test(entity_id_style_flags_filename_stem_mismatches_only, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    sq_entity(req, 'REQ-cli-gc', ".kb/requirements/REQ-cli-gc.md"),
    sq_entity(req, 'REQ-003', ".kb/requirements/REQ-003.md"),
    sq_entity(scenario, 'SCEN-cli-gc', ".kb/scenarios/SCEN-gc-cleanup.md"),
    sq_entity(test, 'TEST-runtime-only', "mcp://kibi/upsert"),
    check_entity_id_style(Violations),
    findall(Id, member(violation(_, Id, _, _, _), Violations), Ids),
    % Grandfathered numbered IDs with matching stems are never flagged here.
    assertion(Ids == ['SCEN-cli-gc']).

test(restates_is_a_valid_req_to_req_relationship) :-
    kibi_relationships:relationship_type(restates),
    kibi_relationships:valid_relationship(restates, req, req),
    assertion(\+ kibi_relationships:valid_relationship(restates, req, test)).

test(check_selected_json_serializes_redundancy_witnesses, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    sq_subject_fact('FACT-SUBJ-EXPORT', "report.export"),
    sq_property_fact('FACT-EXPORT-CSV', "report.export", format, eq, string, csv, ''),
    sq_strict_req('REQ-report-export-csv', 'FACT-SUBJ-EXPORT', 'FACT-EXPORT-CSV'),
    sq_strict_req('REQ-analytics-export-csv', 'FACT-SUBJ-EXPORT', 'FACT-EXPORT-CSV'),
    check_selected_json(['domain-redundancy'], Json),
    atom_json_dict(Json, Dict, []),
    Dict.domain_redundancy = [Violation],
    assertion(Violation.rule == "domain-redundancy"),
    Violation.evidence.witnesses = [Witness],
    assertion(Witness.match == "shared_fact").

test(subject_vocabulary_json_lists_subjects_with_constraining_requirements, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    sq_subject_fact('FACT-SUBJ-EXPORT', "report.export"),
    sq_property_fact('FACT-EXPORT-CSV', "report.export", format, eq, string, csv, ''),
    sq_strict_req('REQ-report-export-csv', 'FACT-SUBJ-EXPORT', 'FACT-EXPORT-CSV'),
    subject_vocabulary_json(Json),
    atom_json_dict(Json, [Entry], []),
    assertion(Entry.subjectKey == "report.export"),
    assertion(Entry.reqDerived == false),
    assertion(Entry.requirements = [_{id: "REQ-report-export-csv", title: _}]),
    subject_claims_json(['report.export'], ClaimsJson),
    atom_json_dict(ClaimsJson, [Claim], []),
    assertion(Claim.factId == "FACT-EXPORT-CSV"),
    assertion(Claim.requirements == ["REQ-report-export-csv"]).

test(subject_key_identity_reports_one_subject_minted_as_several_facts, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    sq_subject_fact('FACT-SUBJ-PLUGIN-A', "opencode.kibi_plugin"),
    sq_subject_fact('FACT-SUBJ-PLUGIN-B', "opencode.kibi_plugin"),
    sq_subject_fact('FACT-SUBJ-SIDEBAR', "opencode.sidebar"),
    kb_assert_entity(fact, [
        id='FACT-SUBJ-PLUGIN-OLD', title="Retired subject", status=deprecated,
        created_at="2026-09-28T00:00:00Z", updated_at="2026-09-28T00:00:00Z",
        source="test://kb.plt", fact_kind=subject, subject_key="opencode.kibi_plugin"
    ]),
    check_subject_key_identity(Violations),
    Violations = [violation('subject-key-identity', 'FACT-SUBJ-PLUGIN-A', Description, _, _, Evidence)],
    % Retired facts do not count.
    assertion(Evidence.facts == ['FACT-SUBJ-PLUGIN-A', 'FACT-SUBJ-PLUGIN-B']),
    assertion(sub_string(Description, 0, _, _, "2 active subject facts share subject_key opencode.kibi_plugin")).

test(subject_key_identity_reports_one_claim_minted_as_several_facts, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    sq_subject_fact('FACT-SUBJ-CHECK', "kibi.check"),
    sq_property_fact('FACT-EXIT-A', "kibi.check", failure_exit_code, eq, int, 1, ''),
    sq_property_fact('FACT-EXIT-B', "kibi.check", failure_exit_code, eq, int, 1, ''),
    % The two bounds of a range differ in operator: not duplicates.
    sq_property_fact('FACT-TIMEOUT-MIN', "kibi.check", timeout, gte, int, 1, s),
    sq_property_fact('FACT-TIMEOUT-MAX', "kibi.check", timeout, lte, int, 60, s),
    % Two requirements bounding the same property differently state distinct
    % claims, which domain-implication compares: not duplicates either.
    sq_property_fact('FACT-TIMEOUT-MAX-AUDIT', "kibi.check", timeout, lte, int, 120, s),
    % The same number in another unit is a different stored value; when two
    % requirements ground it, domain-redundancy reports the pair.
    sq_property_fact('FACT-TIMEOUT-MAX-MIN', "kibi.check", timeout, lte, int, 1, min),
    check_subject_key_identity(Violations),
    Violations = [violation('subject-key-identity', 'FACT-EXIT-A', Description, _, _, Evidence)],
    assertion(Evidence.facts == ['FACT-EXIT-A', 'FACT-EXIT-B']),
    assertion(Evidence.propertyKey == failure_exit_code),
    assertion(Evidence.operator == eq),
    assertion(sub_string(Description, _, _, _, "so one claim is minted as several facts")).

test(subject_key_shape_reports_clause_numbered_property_keys, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    sq_subject_fact('FACT-SUBJ-ATTACH', "mcp.branch_attachment"),
    sq_property_fact('FACT-PROP-CLAUSE', "mcp.branch_attachment", clause_01_mcp_must_refresh, eq, bool, true, ''),
    sq_property_fact('FACT-PROP-CONTRACT', "mcp.branch_attachment", contract_clause_2, eq, bool, true, ''),
    sq_property_fact('FACT-PROP-NAMED', "mcp.branch_attachment", refresh_before_serving, eq, bool, true, ''),
    sq_property_fact('FACT-PROP-COUNT', "mcp.branch_attachment", clause_count, lte, int, 3, ''),
    check_subject_key_shape(Violations),
    findall(Id-Description, member(violation('subject-key-shape', Id, Description, _, _), Violations), Pairs),
    pairs_keys(Pairs, Ids),
    assertion(Ids == ['FACT-PROP-CLAUSE', 'FACT-PROP-CONTRACT']),
    memberchk('FACT-PROP-CONTRACT'-ContractDescription, Pairs),
    assertion(ContractDescription == "Property key contract_clause_2 numbers a clause instead of naming a property").

:- end_tests(semantic_quality_checks).

bound_implies_for_test(OpA, ValA, OpB, ValB) :-
    semantic_quality:bound_implies(OpA, ValA, OpB, ValB).

sq_entity(Type, Id, Source) :-
    kb_assert_entity(Type, [
        id=Id,
        title="Semantic quality fixture",
        status=open,
        created_at="2026-09-28T00:00:00Z",
        updated_at="2026-09-28T00:00:00Z",
        source=Source
    ]).

sq_req(Id) :-
    kb_assert_entity(req, [
        id=Id,
        title="Semantic quality fixture requirement",
        status=open,
        created_at="2026-09-28T00:00:00Z",
        updated_at="2026-09-28T00:00:00Z",
        source="test://kb.plt"
    ]).

sq_strict_req(Id, SubjectFactId, PropertyFactId) :-
    sq_req(Id),
    kb_assert_relationship(constrains, Id, SubjectFactId, []),
    kb_assert_relationship(requires_property, Id, PropertyFactId, []).

sq_subject_fact(Id, SubjectKey) :-
    kb_assert_entity(fact, [
        id=Id,
        title="Semantic quality subject",
        status=active,
        created_at="2026-09-28T00:00:00Z",
        updated_at="2026-09-28T00:00:00Z",
        source="test://kb.plt",
        fact_kind=subject,
        subject_key=SubjectKey
    ]).

sq_property_fact(Id, SubjectKey, PropertyKey0, Operator, ValueType, Value, Unit0) :-
    atom_string(PropertyKey0, PropertyKey),
    sq_value_field(ValueType, Value, ValueField),
    (   Unit0 == ''
    ->  UnitFields = []
    ;   atom_string(Unit0, Unit),
        UnitFields = [unit=Unit]
    ),
    append([
        id=Id,
        title="Semantic quality property",
        status=active,
        created_at="2026-09-28T00:00:00Z",
        updated_at="2026-09-28T00:00:00Z",
        source="test://kb.plt",
        fact_kind=property_value,
        subject_key=SubjectKey,
        property_key=PropertyKey,
        operator=Operator,
        value_type=ValueType,
        ValueField
    ], UnitFields, Props),
    kb_assert_entity(fact, Props).

sq_value_field(int, Value, value_int=Value).
sq_value_field(number, Value, value_number=Value).
sq_value_field(string, Value0, value_string=Value) :- atom_string(Value0, Value).
sq_value_field(bool, Value, value_bool=Value).

sq_predicate_schema(Id, Name0, ArgumentNames) :-
    atom_string(Name0, Name),
    length(ArgumentNames, Arity),
    maplist([_, atom]>>true, ArgumentNames, ArgumentTypes),
    kb_assert_entity(fact, [
        id=Id,
        title="Semantic quality predicate schema",
        status=active,
        created_at="2026-09-28T00:00:00Z",
        updated_at="2026-09-28T00:00:00Z",
        source="test://kb.plt",
        fact_kind=predicate_schema,
        predicate_name=Name,
        predicate_arity=Arity,
        argument_names=ArgumentNames,
        argument_types=ArgumentTypes
    ]).

sq_predicate_fact(Id, Name0, Args, Polarity) :-
    atom_string(Name0, Name),
    atomic_list_concat(Args, ',', ArgText),
    format(string(CanonicalKey), '~w(~w)', [Name, ArgText]),
    kb_assert_entity(fact, [
        id=Id,
        title="Semantic quality predicate",
        status=active,
        created_at="2026-09-28T00:00:00Z",
        updated_at="2026-09-28T00:00:00Z",
        source="test://kb.plt",
        fact_kind=predicate,
        predicate_name=Name,
        predicate_args=Args,
        canonical_key=CanonicalKey,
        polarity=Polarity
    ]).

% Adds requirements From+1..To, each grounding its own predicate term; every
% fourth requirement grounds the same term as its predecessor.
sq_synthetic_redundancy_kb(To, From) :-
    Start is From + 1,
    forall(between(Start, To, N),
           (   (   N mod 4 =:= 0
               ->  Term is N - 1
               ;   Term = N
               ),
               format(atom(ReqId), 'REQ-synthetic-~|~`0t~d~6+', [N]),
               format(atom(FactId), 'FACT-SYNTHETIC-~|~`0t~d~6+', [N]),
               format(atom(Arg), 'term_~w', [Term]),
               sq_predicate_fact(FactId, synthetic_rule, [Arg], assert),
               sq_req(ReqId),
               kb_assert_relationship(requires_predicate, ReqId, FactId, [])
           )).

sq_redundancy_inferences(Inferences, WitnessCount) :-
    statistics(inferences, Before),
    check_domain_redundancy_witnesses(Witnesses),
    statistics(inferences, After),
    Inferences is After - Before,
    length(Witnesses, WitnessCount).

% Test setup/cleanup helpers
assert_fixture_entity(Type, Id, Title, Status, ExtraProps) :-
    (   memberchk(source=_, ExtraProps)
    ->  SourceDefault = []
    ;   SourceDefault = [source="test://kb.plt"]
    ),
    append([
        id=Id,
        title=Title,
        status=Status,
        created_at="2026-05-01T00:00:00Z",
        updated_at="2026-05-01T00:00:00Z"
        | SourceDefault
    ], ExtraProps, Props),
    kb_assert_entity(Type, Props).

proof_receipt_json(TestId, Snapshot, Outcome, StartedAt, FinishedAt, Json) :-
    proof_receipt_json_with_id('PR-TEST000000001', TestId, Snapshot, Outcome, StartedAt, FinishedAt, Json).

proof_receipt_json_with_id(ReceiptId, TestId, Snapshot, Outcome, StartedAt, FinishedAt, Json) :-
    Receipt = _{
        version: 'kibi.proof-receipt.v1',
        receipt_id: ReceiptId,
        test_id: TestId,
        scope: end_to_end,
        outcome: Outcome,
        code_snapshot: Snapshot,
        environment_hash: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        started_at: StartedAt,
        finished_at: FinishedAt,
        artifact_digest: 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
        contract_hash: 'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
        fingerprint: 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
        fingerprint_components: _{
            contract: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
            integration: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaab',
            command: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaac',
            bindings: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaad',
            producer: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaae'
        },
        integration_id: 'self-proof',
        producer: _{name: 'kibi-command-producer'},
        command_argv: ['kibi', 'prove', '--all'],
        run_outcome: Outcome,
        proof_results: [_{
            symbol_id: 'SYM-PROOF-E2E',
            target: default,
            outcome: Outcome,
            binding: aggregate_run,
            attempts: _{status: unavailable}
        }]
    },
    atom_json_dict(JsonAtom, [Receipt], []),
    atom_string(JsonAtom, Json).

start_isolation_writer(TestSource, EntityId, Ready, Done, Release, Cleanup, Pid) :-
    format(string(Goal),
        "isolation_child_writer(~q,~q,~q,~q,~q)",
        [EntityId, Ready, Done, Release, Cleanup]),
    process_create(path(swipl), ['-q', '-s', TestSource, '-g', Goal, '-t', halt],
        [process(Pid), stdout(null), stderr(null)]),
    assertz(isolation_child_process(Pid)).

isolation_child_writer(EntityId, Ready, Done, Release, Cleanup) :-
    tmp_file(kibi_isolation_child, ChildRoot),
    make_directory_path(ChildRoot),
    directory_file_path(ChildRoot, store, Store),
    catch(
        setup_call_cleanup(
            kb_attach(Store),
            (
                write_isolation_store(Ready, ChildRoot),
                wait_for_isolation_file(Release, 1000),
                kb_assert_entity(fact, [
                    id=EntityId,
                    title="isolated process marker",
                    status=active,
                    created_at="2026-09-14T00:00:00Z",
                    updated_at="2026-09-14T00:00:00Z",
                    source="test://process-isolation"
                ]),
                kb_save,
                write_isolation_store(Done, ChildRoot),
                wait_for_isolation_file(Cleanup, 1000)
            ),
            kb_detach
        ),
        Error,
        (delete_directory_and_contents(ChildRoot), throw(Error))
    ),
    delete_directory_and_contents(ChildRoot).

write_isolation_store(Path, Store) :-
    setup_call_cleanup(
        open(Path, write, Stream, [encoding(utf8)]),
        format(Stream, '~w~n', [Store]),
        close(Stream)
    ).

read_isolation_store(Path, Store) :-
    read_file_to_string(Path, Contents, []),
    split_string(Contents, "\n", " \t\r", [StoreString|_]),
    atom_string(ChildRoot, StoreString),
    directory_file_path(ChildRoot, store, Store).

write_isolation_barrier(Path) :-
    setup_call_cleanup(open(Path, write, Stream), true, close(Stream)).

wait_for_isolation_files(Paths, Attempts) :-
    (   isolation_files_exist(Paths)
    ->  true
    ;   Attempts > 0
    ->  sleep(0.01),
        NextAttempts is Attempts - 1,
        wait_for_isolation_files(Paths, NextAttempts)
    ;   throw(error(timeout_error(isolation_barrier, Paths), wait_for_isolation_files/2))
    ).

wait_for_isolation_file(Path, Attempts) :-
    wait_for_isolation_files([Path], Attempts).

isolation_files_exist([]).
isolation_files_exist([Path|Rest]) :-
    exists_file(Path),
    isolation_files_exist(Rest).

wait_isolation_child(Pid) :-
    process_wait(Pid, Status),
    retractall(isolation_child_process(Pid)),
    assertion(Status == exit(0)).

evidence_for_test([Evidence|_], TestId, Evidence) :-
    Evidence.testId == TestId,
    !.
evidence_for_test([_|Rest], TestId, Evidence) :-
    evidence_for_test(Rest, TestId, Evidence).

scenario_obligation_for([Obligation|_], ScenarioId, Obligation) :-
    Obligation.scenarioId == ScenarioId,
    !.
scenario_obligation_for([_|Rest], ScenarioId, Obligation) :-
    scenario_obligation_for(Rest, ScenarioId, Obligation).

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

assert_branch_initialization_policy_pair :-
    assert_fixture_entity(fact, 'FACT-BRANCH-SUBJECT', "Branch store subject", active, [
        fact_kind=subject,
        subject_key="kibi.kb.branch"
    ]),
    assert_fixture_entity(fact, 'FACT-BRANCH-LEGACY-MODE', "Legacy branch initialization mode", active, [
        fact_kind=property_value,
        subject_key="kibi.kb.branch",
        property_key="initialization_mode",
        operator=eq,
        value_type=string,
        value_string="automatic",
        claim_key="CLAIM-1111111111111111",
        claim_text="A missing branch store must copy the resolved default branch"
    ]),
    assert_fixture_entity(fact, 'FACT-BRANCH-EXACT-MODE', "Exact branch initialization mode", active, [
        fact_kind=property_value,
        subject_key="kibi.kb.branch",
        property_key="initialization_mode",
        operator=eq,
        value_type=string,
        value_string="explicit_branch_ensure",
        claim_key="CLAIM-2222222222222222",
        claim_text="A missing exact branch store may only use explicit branch ensure"
    ]),
    kb_assert_entity(req, [
        id='REQ-BRANCH-LEGACY',
        title="Legacy default-branch copy policy",
        status=open,
        created_at="2026-01-01T00:00:00Z",
        updated_at="2026-01-01T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(req, [
        id='REQ-BRANCH-EXACT',
        title="Exact Git branch store policy",
        status=open,
        created_at="2026-02-01T00:00:00Z",
        updated_at="2026-02-01T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_relationship(constrains, 'REQ-BRANCH-LEGACY', 'FACT-BRANCH-SUBJECT', []),
    kb_assert_relationship(constrains, 'REQ-BRANCH-EXACT', 'FACT-BRANCH-SUBJECT', []),
    kb_assert_relationship(requires_property, 'REQ-BRANCH-LEGACY', 'FACT-BRANCH-LEGACY-MODE', []),
    kb_assert_relationship(requires_property, 'REQ-BRANCH-EXACT', 'FACT-BRANCH-EXACT-MODE', []).

assert_cross_identity_migration_policy_pair :-
    assert_fixture_entity(fact, 'FACT-MIGRATION-SUBJECT', "Branch migration subject", active, [
        fact_kind=subject,
        subject_key="kibi.kb.branch"
    ]),
    assert_fixture_entity(fact, 'FACT-MIGRATION-LEGACY-ALLOW', "Legacy cross-identity exception", active, [
        fact_kind=property_value,
        subject_key="kibi.kb.branch",
        property_key="cross_identity_migration_allowed",
        operator=eq,
        value_type=bool,
        value_bool=true,
        claim_key="CLAIM-3333333333333333",
        claim_text="The legacy main to master cross-identity move is allowed"
    ]),
    assert_fixture_entity(fact, 'FACT-MIGRATION-EXACT-REFUSE', "Exact identity migration refusal", active, [
        fact_kind=property_value,
        subject_key="kibi.kb.branch",
        property_key="cross_identity_migration_allowed",
        operator=eq,
        value_type=bool,
        value_bool=false,
        claim_key="CLAIM-4444444444444444",
        claim_text="Every cross-identity migration is refused"
    ]),
    kb_assert_entity(req, [
        id='REQ-MIGRATION-LEGACY',
        title="Legacy cross-identity migration exception",
        status=open,
        created_at="2026-01-01T00:00:00Z",
        updated_at="2026-01-01T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(req, [
        id='REQ-MIGRATION-EXACT',
        title="Same-identity migration policy",
        status=open,
        created_at="2026-02-01T00:00:00Z",
        updated_at="2026-02-01T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_relationship(constrains, 'REQ-MIGRATION-LEGACY', 'FACT-MIGRATION-SUBJECT', []),
    kb_assert_relationship(constrains, 'REQ-MIGRATION-EXACT', 'FACT-MIGRATION-SUBJECT', []),
    kb_assert_relationship(requires_property, 'REQ-MIGRATION-LEGACY', 'FACT-MIGRATION-LEGACY-ALLOW', []),
    kb_assert_relationship(requires_property, 'REQ-MIGRATION-EXACT', 'FACT-MIGRATION-EXACT-REFUSE', []).

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

production_explanation(RowOrStage, SymbolId, Explanation) :-
    (   get_dict(proofStages, RowOrStage, Stages)
    ->  Stage = Stages.productionSymbols
    ;   Stage = RowOrStage
    ),
    member(Explanation, Stage.explanations),
    Explanation.symbolId == SymbolId.

candidate_for(Explanation, TestId, Candidate) :-
    member(Candidate, Explanation.coverageCandidates),
    Candidate.testId == TestId.

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
    cleanup_isolation_children,
    kb_detach,
    (   retract(test_kb_store(Dir))
    ->  (   exists_directory(Dir)
        ->  delete_directory_and_contents(Dir)
        ;   true
        )
    ;   true
    ).

cleanup_test_kb_root :-
    cleanup_test_kb,
    test_kb_root(Root),
    (   exists_directory(Root)
    ->  delete_directory_and_contents(Root)
    ;   true
    ).

cleanup_isolation_children :-
    forall(retract(isolation_child_barrier(Path)),
           catch(write_isolation_barrier(Path), _, true)),
    forall(retract(isolation_child_process(Pid)),
           catch(process_wait(Pid, _), _, true)).

:- begin_tests(kb_timestamp_formats).

test(status_synced_at_uses_utc_in_non_utc_child) :-
    tmp_file(kibi_status_timezone, DataFile),
    setup_call_cleanup(
        create_fixed_timestamp_file(DataFile),
        ( run_timezone_child(status_synced_at_child(DataFile), ChildResult),
          assertion(ChildResult.syncedAt == "2000-01-01T00:00:00Z")
        ),
        catch(delete_file(DataFile), _, true)
    ).

test(lock_owner_started_at_is_current_utc_in_non_utc_child) :-
    tmp_file(kibi_lock_owner_timezone, LockDirectory),
    make_directory_path(LockDirectory),
    get_time(Before),
    setup_call_cleanup(
        true,
        ( run_timezone_child(lock_owner_json_child(LockDirectory), Owner),
          assertion(integer(Owner.pid)),
          assertion(Owner.pid > 0),
          assertion(string(Owner.workspaceRoot)),
          assertion(string(Owner.bootId)),
          assertion(string(Owner.startedAt)),
          atom_string(LockDirectory, Owner.workspaceRoot),
          get_time(After),
          parse_time(Owner.startedAt, iso_8601, StartedAt),
          LowerBound is Before - 1,
          UpperBound is After + 1,
          assertion(StartedAt >= LowerBound),
          assertion(StartedAt =< UpperBound)
        ),
        delete_directory_and_contents(LockDirectory)
    ).

:- end_tests(kb_timestamp_formats).

create_fixed_timestamp_file(DataFile) :-
    setup_call_cleanup(
        open(DataFile, write, Stream, [encoding(utf8)]),
        true,
        close(Stream)
    ),
    % A fixed epoch makes the status assertion independent of test runtime.
    set_time_file(DataFile, _OldTimes, [modified(946684800.0)]).

run_timezone_child(GoalTerm, ChildResult) :-
    test_source_directory(TestDirectory),
    directory_file_path(TestDirectory, 'kb.plt', TestSource),
    format(string(Goal), '~q', [GoalTerm]),
    process_create(path(swipl),
                   ['-q', '-s', TestSource, '-g', Goal, '-t', halt],
                   [process(Pid), stdout(pipe(Output)), stderr(pipe(Error)),
                    environment(['TZ'='Europe/Warsaw'])]),
    read_string(Output, _, OutputText),
    close(Output),
    read_string(Error, _, ErrorText),
    close(Error),
    process_wait(Pid, ExitStatus),
    (   ExitStatus == exit(0)
    ->  true
    ;   throw(error(child_process_failed(ExitStatus, ErrorText),
                    run_timezone_child/2))
    ),
    atom_json_dict(OutputText, ChildResult, []).

status_synced_at_child(DataFile) :-
    getenv('TZ', 'Europe/Warsaw'),
    status:synced_at(DataFile, SyncedAt),
    json_write_dict(current_output, _{syncedAt:SyncedAt}, []),
    nl.

lock_owner_json_child(LockDirectory) :-
    getenv('TZ', 'Europe/Warsaw'),
    kb:kb_write_lock_owner(LockDirectory),
    kb:kb_lock_owner_path(LockDirectory, OwnerPath),
    setup_call_cleanup(
        open(OwnerPath, read, OwnerStream, [encoding(utf8)]),
        json_read_dict(OwnerStream, Owner),
        close(OwnerStream)
    ),
    json_write_dict(current_output, Owner, []),
    nl.

% Generic kibi.logic.v1 builders for rule-comparison tests.
ir_var(Name, Type, _{kind:var, name:Name, type:Type}).
ir_num(Value, _{kind:number, value:Value}).
ir_atom(Name, Args, _{kind:atom, name:Name, args:Args}).
ir_cmp(Op, Left, Right, _{kind:compare, operator:Op, left:Left, right:Right}).
ir_rule(Modality, Variables, Head, Body, Rule) :-
    findall(_{name:Name, type:Type}, member(Name-Type, Variables), VariableDicts),
    consistency_rule_from_dict(_{version:'kibi.logic.v1', kind:rule, modality:Modality,
        head:Head, body:Body, variables:VariableDicts}, Rule).

% Modality act(C) :- reading(C, V), V Op 0.
ir_reading_rule(Modality, Op, VarName, Rule) :-
    ir_typed_reading_rule(Modality, Op, 0, VarName, money, Rule).

ir_typed_reading_rule(Modality, Op, Bound, VarName, Type, Rule) :-
    ir_var('C', cart, C), ir_var(VarName, Type, V), ir_num(Bound, N),
    ir_atom(act, [C], Head),
    ir_atom(reading, [C, V], Reading),
    ir_cmp(Op, V, N, Compare),
    ir_rule(Modality, ['C'-cart, VarName-Type], Head, _{kind:all, items:[Reading, Compare]}, Rule).

% Two current requirements on meter.reading: gt 0 and lt 1 of ValueType.
numeric_requirement_pair(ValueType, ValueKey, Witnesses) :-
    assert_fixture_entity(fact, 'FACT-METER-SUBJECT', "Meter", active,
        [fact_kind=subject, subject_key="meter"]),
    LowProps = [fact_kind=property_value, subject_key="meter", property_key="reading",
                operator=gt, value_type=ValueType, ValueKey=0],
    HighProps = [fact_kind=property_value, subject_key="meter", property_key="reading",
                 operator=lt, value_type=ValueType, ValueKey=1],
    assert_fixture_entity(fact, 'FACT-METER-LOW', "Reading above zero", active, LowProps),
    assert_fixture_entity(fact, 'FACT-METER-HIGH', "Reading below one", active, HighProps),
    assert_fixture_entity(req, 'REQ-METER-LOW', "Reading above zero", open, []),
    assert_fixture_entity(req, 'REQ-METER-HIGH', "Reading below one", open, []),
    forall(member(Req-Fact, ['REQ-METER-LOW'-'FACT-METER-LOW', 'REQ-METER-HIGH'-'FACT-METER-HIGH']),
        (   kb_assert_relationship(constrains, Req, 'FACT-METER-SUBJECT', []),
            kb_assert_relationship(requires_property, Req, Fact, [])
        )),
    findall(W, kb:req_conflict_witness(_, _, W), Witnesses).

% Modality act(C) :- reading(C, V), V Op1 B1, V Op2 B2.
ir_bounded_rule(Modality, VarName, Type, Op1-B1, Op2-B2, Rule) :-
    ir_var('C', cart, C), ir_var(VarName, Type, V), ir_num(B1, N1), ir_num(B2, N2),
    ir_atom(act, [C], Head),
    ir_atom(reading, [C, V], Reading),
    ir_cmp(Op1, V, N1, Compare1),
    ir_cmp(Op2, V, N2, Compare2),
    ir_rule(Modality, ['C'-cart, VarName-Type], Head, _{kind:all, items:[Reading, Compare1, Compare2]}, Rule).

scenario_expects_now(ScenarioId, Expected) :-
    kb_entity(ScenarioId, scenario, Props),
    memberchk(expects=Raw, Props),
    normalize_term_atom(Raw, Expected).

% kibi.logic.v1 fixtures for the truthful-consistency unit.
consistency_rule(Modality, HeadName, HeadArgs, Body, Rule) :-
    consistency_rule_dict(Modality, HeadName, HeadArgs, Body, Dict),
    consistency_rule_from_dict(Dict, Rule).

consistency_rule_from_dict(Dict, Rule) :-
    atom_json_dict(Json, Dict, []),
    logic_ir:logic_rule_from_props([rule_ir=Json], Rule).

consistency_rule_dict(Modality, HeadName, HeadArgs, BodyName, Dict) :-
    maplist(consistency_term, HeadArgs, HeadTerms),
    consistency_body(BodyName, HeadArgs, Body),
    findall(_{name:Name, type:Type},
            ( (member(v(Name, Type), HeadArgs) ; consistency_body_variable(BodyName, Name, Type)) ),
            Variables0),
    sort(Variables0, Variables),
    Dict = _{version:'kibi.logic.v1', kind:rule, modality:Modality,
             head:_{kind:atom, name:HeadName, args:HeadTerms},
             body:Body, variables:Variables}.

consistency_term(v(Name, Type), _{kind:var, name:Name, type:Type}).
consistency_term(c(Value, Type), _{kind:const, value:Value, type:Type}).
consistency_term(n(Value), _{kind:number, value:Value}).

consistency_atom(Name, Args, _{kind:atom, name:Name, args:Terms}) :- maplist(consistency_term, Args, Terms).

consistency_body_variable(positive_total_precondition, 'T', money).
consistency_body_variable(positive_total_success, 'T', money).
consistency_body_variable(renamed_zero_total, 'U', money).

consistency_body(positive_total_precondition, [Cart], _{kind:all, items:[Total, Compare]}) :-
    consistency_atom(final_payable_total, [Cart, v('T', money)], Total),
    consistency_term(v('T', money), T), consistency_term(n(0), Zero),
    Compare = _{kind:compare, operator:lte, left:T, right:Zero}.
consistency_body(positive_total_success, [Cart], _{kind:all, items:[Total, Compare]}) :-
    consistency_atom(final_payable_total, [Cart, v('T', money)], Total),
    consistency_term(v('T', money), T), consistency_term(n(0), Zero),
    Compare = _{kind:compare, operator:gt, left:T, right:Zero}.
consistency_body(free_order_success, [Cart], _{kind:all, items:[Total, Discount, Charges]}) :-
    consistency_atom(final_payable_total, [Cart, n(0)], Total),
    consistency_atom(discount_percent, [Cart, n(100)], Discount),
    consistency_atom(additional_charges, [Cart, n(0)], Charges).
consistency_body(promoted_free_order, [Cart], _{kind:all, items:[Total, Promo]}) :-
    consistency_atom(final_payable_total, [Cart, n(0)], Total),
    consistency_atom(valid_full_discount, [Cart], Promo).
consistency_body(ground_free_order, [Cart], Total) :-
    consistency_atom(final_payable_total, [Cart, n(0)], Total).
consistency_body(renamed_zero_total, [Cart], _{kind:all, items:[Total, Compare]}) :-
    consistency_atom(final_payable_total, [Cart, v('U', money)], Total),
    consistency_term(v('U', money), U), consistency_term(n(0), Zero),
    Compare = _{kind:compare, operator:lte, left:U, right:Zero}.
consistency_body(disjunctive_success, [Cart], _{kind:any, items:[Total, Gift]}) :-
    consistency_atom(final_payable_total, [Cart, n(0)], Total),
    consistency_atom(gift_card_order, [Cart], Gift).

assert_rule_requirement(Dict, FactId, ReqId, ClaimKey) :-
    atom_json_dict(JsonAtom, Dict, []),
    atom_string(JsonAtom, Json),
    atom_string(FactId, SemanticKey),
    assert_fixture_entity(fact, FactId, "Checkout rule", active, [
        fact_kind=rule,
        rule_ir=Json,
        rule_hash="cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        rule_schema_id="FACT-RULE-SCHEMA-TEST",
        rule_name="checkout_rule",
        semantic_key=SemanticKey,
        claim_key=ClaimKey,
        claim_text="Checkout rule clause",
        claim_span_start=0,
        claim_span_end=20
    ]),
    assert_fixture_entity(req, ReqId, "Checkout requirement", open, []),
    kb_assert_relationship(requires_rule, ReqId, FactId, []).
