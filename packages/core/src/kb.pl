% Module: kb
% Core Knowledge Base module with RDF persistence and audit logging
:- module(kb, [
    kb_attach/1,
    kb_detach/0,
    kb_save/0,
    kb_sync_checkpoint/0,
    kb_storage_status/1,
    kb_storage_compact/0,
    kb_storage_compact_if_needed/0,
    kb_storage_export/1,
    kb_migrate_legacy/2,
    with_kb_mutex/1,
    kb_assert_entity/2,
    kb_assert_entity_no_audit/2,
    kb_commit_upsert/5,
    kb_log_entity_upsert/3,
    kb_retract_entity/1,
    kb_retract_entity/3,
    kb_retract_entity_relationships/1,
    kb_retract_relationship/3,
    kb_retract_all_relationships/0,
    kb_entities_by_tag/2,
    kb_indexed_sources/1,
    kb_query_entities/8,
    kb_search_entities/6,
    kb_rebuild_indexes/0,
    kb_entity/3,
    kb_entities_by_source/2,
    kb_assert_relationship/4,
    kb_assert_relationship_no_audit/4,
    kb_log_relationship_upsert/4,
    kb_relationship/3,
    symbol_owns_requirement/2,
    scenario_verified_by_test/2,
    requirement_test_fallback_allowed/1,
    test_satisfies_requirement_semantics/2,
    production_symbol_covered_for_requirement/2,
    production_symbol_untested/1,
    executable_test_symbol/1,
    mixed_role_symbol/1,
    transitively_implements/2,
    transitively_depends/2,
    impacted_by_change/2,
    affected_symbols/2,
    coverage_gap/2,
    untested_symbols/1,
    stale/2,
    orphaned/1,
    conflicting/2,
    deprecated_still_used/2,
    current_adr/1,
    superseded_by/2,
    adr_chain/2,
    deprecated_no_successor/1,
    symbol_no_req_coverage/2,
    predicate_schema/6,
    predicate_fact/5,
    contradicting_reqs/3,
    req_conflict_witness/3,
    check_req_contradiction/1,
    normalize_term_atom/2,
    normalize_term_atom_list/2,
    changeset/4, % Export for testing
    kb_uri/1
]).

:- use_module(library(semweb/rdf11)).
:- use_module(library(semweb/rdf_persistency)).
:- use_module(library(persistency)).
:- use_module(library(thread)).
:- use_module(library(filesex)).
:- use_module(library(readutil)).
:- use_module(library(aggregate), [aggregate_all/3]).
:- use_module(library(lists), [sum_list/2]).
:- use_module(library(ordsets)).
:- use_module('../schema/entities.pl', [entity_type/1, entity_property/3, required_property/2]).
:- use_module('../schema/relationships.pl', [relationship_type/1, valid_relationship/3]).
:- use_module('../schema/validation.pl', [validate_entity/2, validate_relationship/3]).

% Constants
kb_uri('urn-kibi:').

% RDF namespace for KB entities and relationships
:- kb_uri(URI), rdf_register_prefix(kb, URI).
:- rdf_register_prefix(xsd, 'http://www.w3.org/2001/XMLSchema#').
:- rdf_meta
    kb_entity(?, ?, ?),
    kb_relationship(?, ?, ?).

% Persistent audit log declaration
:- persistent
    changeset(timestamp:atom, operation:atom, entity_id:atom, data:any).

% Dynamic facts to track KB state
:- dynamic kb_attached/1.
:- dynamic kb_audit_db/1.
:- dynamic kb_graph/1.
:- dynamic kb_attached_snapshot/1.
:- dynamic kb_storage_mode/1.           % legacy | journaled
:- dynamic kb_persistency_directory/1.
:- dynamic kb_commit_sequence/1.
:- dynamic kb_generation/1.
:- dynamic kb_legacy_sentinel_stamp/1.
:- dynamic kb_audit_sequence/1.
:- dynamic kb_dirty/0.
% Rebuildable read indexes. RDF remains authoritative; a dirty marker causes
% the next unbound discovery query to rebuild these daemon-lifetime indexes.
:- dynamic kb_index_ready/0.
:- dynamic kb_index_dirty/0.
:- dynamic kb_index_entity/2.
:- dynamic kb_index_type/2.
:- dynamic kb_index_tag/2.
:- dynamic kb_index_source/2.
:- dynamic kb_index_token/2.
:- dynamic kb_index_symbol_coordinate/5.
:- dynamic kb_index_entity_count/1.
:- dynamic kb_index_triple_count/1.
:- dynamic entity/4.  % Support legacy .pl file format (Type, Id, Title, Props)

%% kb_attach(+Directory)
% Attach to a KB directory.  New stores use SWI's journaled RDF persistence;
% unmarked directories retain the legacy RDF/XML path for migration and
% backwards-compatible temporary KBs.
% Creates directory if it doesn't exist.
kb_attach(Directory) :-
    (   kb_attached(_)
    ->  throw(error(permission_error(attach, kb, Directory), kb_attach/1))
    ;   true
    ),
    % Ensure directory exists
    (   exists_directory(Directory)
    ->  true
    ;   make_directory_path(Directory)
    ),
    (   journaled_store(Directory)
    ->  kb_attach_journaled(Directory)
    ;   kb_attach_legacy(Directory)
    ).

journaled_store(Directory) :-
    atom_concat(Directory, '/storage.json', Marker),
    exists_file(Marker),
    catch(
        read_file_to_string(Marker, Contents, []),
        _,
        fail
    ),
    sub_string(Contents, _, _, _, "kibi.rdf-journal.v1").

% implements REQ-core-journaled-engine-persistence
kb_attach_journaled(Directory) :-
    atom_concat(Directory, '/rdf', PersistencyDirectory),
    (   exists_directory(PersistencyDirectory)
    ->  true
    ;   make_directory_path(PersistencyDirectory)
    ),
    % rdf_persistency owns the database lock for the lifetime of the engine.
    rdf_attach_db(PersistencyDirectory,
                  [access(read_write), silent(true), concurrency(4)]),
    % Create RDF graph name from directory.  Do not unload a graph here:
    % rdf_attach_db has already restored it from its snapshot/journal.  A
    % staged migration can have been atomically moved after the graph was
    % first persisted, so accept the single restored graph URI as well.
    journal_graph_uri(Directory, GraphURI),
    read_journal_metadata(Directory, Generation, Sequence),
    assert(kb_attached(Directory)),
    assert(kb_graph(GraphURI)),
    assert(kb_storage_mode(journaled)),
    assert(kb_persistency_directory(PersistencyDirectory)),
    assert(kb_generation(Generation)),
    assert(kb_commit_sequence(Sequence)),
    assert(kb_attached_snapshot(journal_snapshot(Generation, Sequence))),
    retractall(kb_dirty),
    initialize_journal_audit_sequence(GraphURI),
    atom_concat(Directory, '/kb.rdf', SentinelFile),
    current_data_stamp(SentinelFile, SentinelStamp),
    assert(kb_legacy_sentinel_stamp(SentinelStamp)),

    load_kb_pl_files(Directory),
    kb_rebuild_indexes.

journal_graph_uri(Directory, GraphURI) :-
    atom_concat('file://', Directory, Expected),
    (   rdf_graph(Expected)
    ->  GraphURI = Expected
    ;   findall(G,
                (rdf_graph(G), rdf(_, _, _, G)),
                Graphs),
        (   Graphs = [GraphURI|_]
        ->  true
        ;   GraphURI = Expected
        )
    ).

kb_attach_legacy(Directory) :-
    % Create RDF graph name from directory
    atom_concat('file://', Directory, GraphURI),
    % If a graph with this URI is already present, unload it to avoid duplicates.
    (   rdf_graph(GraphURI)
    ->  rdf_unload_graph(GraphURI)
    ;   true
    ),
    % Load existing RDF data if present
    atom_concat(Directory, '/kb.rdf', DataFile),
    (   exists_file(DataFile)
    ->  rdf_load(DataFile, [graph(GraphURI), silent(true)])
    ;   true
    ),
    current_data_stamp(DataFile, SnapshotStamp),
    % Set up audit log - only attach if not already attached
    atom_concat(Directory, '/audit.log', AuditLog),
    (   db_attached(AuditLog)
    ->  true  % Already attached
    ;   % Close the journal stream after each write.  The default `flush`
        % mode retains an exclusive write lock for the lifetime of a
        % long-running MCP process and blocks writers in other runtimes.
        db_attach(AuditLog, [sync(close)])
    ),
    % Track attachment state
    assert(kb_attached(Directory)),
    assert(kb_audit_db(AuditLog)),
    assert(kb_graph(GraphURI)),
    assert(kb_storage_mode(legacy)),
    assert(kb_attached_snapshot(SnapshotStamp)),

    % Load legacy .pl entity files if present
    load_kb_pl_files(Directory),
    kb_rebuild_indexes.


%% kb_detach
% Safely detach from KB without persisting pending changes.
% Call kb_save/0 explicitly before kb_detach/0 when durability is required.
% implements REQ-009
kb_detach :-
    (   kb_attached(_Directory)
    ->  (
            (   kb_storage_mode(journaled)
            ->  catch(rdf_flush_journals([min_size(16384)]), _, true),
                catch(rdf_detach_db, _, true)
            ;   true
            ),
            % Unload RDF graph from memory to prevent duplication on reattach
            (   kb_graph(GraphURI)
            ->  rdf_unload_graph(GraphURI)
            ;   true
            ),
            (   db_attached(_)
            ->  catch(db_detach, _, true)
            ;   true
            ),
            % Clear state
            retractall(kb_attached(_)),
            retractall(kb_audit_db(_)),
            retractall(kb_graph(_)),
            retractall(kb_attached_snapshot(_)),
            retractall(kb_storage_mode(_)),
            retractall(kb_persistency_directory(_)),
            retractall(kb_commit_sequence(_)),
            retractall(kb_generation(_)),
            retractall(kb_legacy_sentinel_stamp(_)),
            retractall(kb_audit_sequence(_)),
            retractall(kb_dirty),
            retractall(kb_index_ready),
            retractall(kb_index_dirty),
            retractall(kb_index_entity(_, _)),
            retractall(kb_index_type(_, _)),
            retractall(kb_index_tag(_, _)),
            retractall(kb_index_source(_, _)),
            retractall(kb_index_token(_, _)),
            retractall(kb_index_symbol_coordinate(_, _, _, _, _)),
            retractall(kb_index_entity_count(_)),
            retractall(kb_index_triple_count(_))
        )
    ;   true
    ).

%% kb_save
% Save RDF graph and sync audit log to disk
% implements REQ-009
kb_save :-
    (   kb_storage_mode(journaled)
    ->  kb_save_journaled
    ;   kb_attached(Directory)
    ->  with_kb_mutex(with_kb_file_lock(Directory, kb_save_locked(Directory)))
    ;   true
    ).

with_kb_file_lock(Directory, Goal) :-
    atom_concat(Directory, '/kb.lock', LockFile),
    setup_call_cleanup(
        open(LockFile, append, LockStream, [lock(write)]),
        call(Goal),
        close(LockStream)
    ).

kb_save_locked(Directory) :-
    (   kb_storage_mode(journaled)
    ->  kb_save_journaled_locked(Directory)
    ;   kb_save_legacy_locked(Directory)
    ).

kb_save_legacy_locked(Directory) :-
    atom_concat(Directory, '/kb.rdf', DataFile),
    temp_rdf_file(Directory, TempFile),
    catch(
        (
            ensure_snapshot_current(DataFile),
            kb_stage(snapshot_save),
            save_rdf_snapshot(TempFile),
            kb_stage(audit_sync),
            sync_audit_log,
            % Keep the durable RDF rename after audit synchronization.  The
            % temporary snapshot can be discarded if an audit-stage failure
            % occurs, so a failed commit cannot publish new RDF state.
            kb_stage(snapshot_save),
            rename_file(TempFile, DataFile),
            current_data_stamp(DataFile, UpdatedStamp),
            retractall(kb_attached_snapshot(_)),
            assert(kb_attached_snapshot(UpdatedStamp))
        ),
        Error,
        (
            cleanup_temp_file(TempFile),
            throw(Error)
        )
    ).

% Journaled stores never rewrite kb.rdf on the hot path.  SWI's monitor
% appends RDF edits to a per-source journal; flushing with min_size(16384)
% makes a compact binary snapshot only after a journal reaches 16 MiB.
kb_save_journaled :-
    (   kb_attached(Directory)
    ->  with_kb_mutex(kb_save_journaled_locked(Directory))
    ;   true
    ).

%% kb_sync_checkpoint
% Publish compiler freshness even when a successful sync has no RDF delta.
% The commit sequence remains the durable ordering boundary used by status;
% shutdown still uses kb_save/0 and therefore does not mint phantom commits.
kb_sync_checkpoint :-
    kb_mark_dirty,
    kb_save_journaled.

% implements REQ-core-journaled-engine-persistence
kb_save_journaled_locked(Directory) :-
    ensure_journal_sentinel_current(Directory),
    (   kb_dirty
    ->  kb_stage(journal_flush),
        rdf_flush_journals([min_size(16384)]),
        next_journal_commit(Generation, Sequence),
        write_journal_head(Directory, Generation, Sequence),
        retractall(kb_attached_snapshot(_)),
        assert(kb_attached_snapshot(journal_snapshot(Generation, Sequence))),
        retractall(kb_dirty)
    ;   true
    ).

kb_mark_dirty :-
    (kb_dirty -> true ; assertz(kb_dirty)).

kb_mark_index_dirty :-
    (kb_index_dirty -> true ; assertz(kb_index_dirty)).

drop_entity_index_rows(Id) :-
    retractall(kb_index_entity(Id, _)),
    retractall(kb_index_type(_, Id)),
    retractall(kb_index_tag(_, Id)),
    retractall(kb_index_source(_, Id)),
    retractall(kb_index_token(_, Id)),
    retractall(kb_index_symbol_coordinate(Id, _, _, _, _)).

kb_refresh_entity_index(Id) :-
    (   kb_index_ready,
        \+ kb_index_dirty,
        kb_index_entity_count(Count)
    ->  (kb_index_entity(Id, _) -> WasIndexed = true ; WasIndexed = false),
        drop_entity_index_rows(Id),
        (   once(kb_entity_raw(Id, Type, Props))
        ->  index_entity_row(Id, Type, Props),
            (WasIndexed == true -> NextCount = Count ; NextCount is Count + 1)
        ;   (WasIndexed == true -> NextCount is max(0, Count - 1) ; NextCount = Count)
        ),
        retractall(kb_index_entity_count(_)),
        assertz(kb_index_entity_count(NextCount))
    ;   kb_mark_index_dirty
    ).

kb_remove_entity_index(Id) :-
    (   kb_index_ready,
        \+ kb_index_dirty,
        kb_index_entity_count(Count)
    ->  (kb_index_entity(Id, _) -> WasIndexed = true ; WasIndexed = false),
        drop_entity_index_rows(Id),
        (WasIndexed == true -> NextCount is max(0, Count - 1) ; NextCount = Count),
        retractall(kb_index_entity_count(_)),
        assertz(kb_index_entity_count(NextCount))
    ;   kb_mark_index_dirty
    ).

ensure_journal_sentinel_current(Directory) :-
    atom_concat(Directory, '/kb.rdf', SentinelFile),
    current_data_stamp(SentinelFile, CurrentStamp),
    (   kb_legacy_sentinel_stamp(ExpectedStamp)
    ->  (   CurrentStamp == ExpectedStamp
        ->  true
        ;   throw(error(permission_error(save, kb, stale_snapshot), kb_save/0))
        )
    ;   true
    ).

next_journal_commit(Generation, Sequence) :-
    (   kb_generation(CurrentGeneration)
    ->  Generation = CurrentGeneration
    ;   Generation = 'generation-1'
    ),
    (   kb_commit_sequence(CurrentSequence)
    ->  Sequence is CurrentSequence + 1
    ;   Sequence = 1
    ),
    retractall(kb_generation(_)),
    assert(kb_generation(Generation)),
    retractall(kb_commit_sequence(_)),
    assert(kb_commit_sequence(Sequence)).

read_journal_metadata(Directory, Generation, Sequence) :-
    atom_concat(Directory, '/CURRENT', HeadFile),
    (   exists_file(HeadFile),
        catch(read_file_to_string(HeadFile, Contents, []), _, fail),
        split_string(Contents, ':\n\r', ' \t', Parts),
        Parts = [GenerationString, SequenceString|_],
        atom_string(Generation, GenerationString),
        catch(number_string(Sequence, SequenceString), _, fail)
    ->  true
    ;   Generation = 'generation-1',
        Sequence = 0
    ).

write_journal_head(Directory, Generation, Sequence) :-
    atom_concat(Directory, '/CURRENT.tmp', TempFile),
    atom_concat(Directory, '/CURRENT', HeadFile),
    setup_call_cleanup(
        open(TempFile, write, Stream, [encoding(utf8)]),
        format(Stream, '~w:~w~n', [Generation, Sequence]),
        close(Stream)
    ),
    rename_file(TempFile, HeadFile).

%% kb_storage_status(-Status)
% Return a compact operational view without scanning the RDF graph.
kb_storage_status(Status) :-
    kb_storage_mode(Mode),
    kb_attached(Directory),
    (kb_generation(Generation) -> true ; Generation = unknown),
    (kb_commit_sequence(Sequence) -> true ; Sequence = 0),
    journal_bytes(Directory, JournalBytes),
    Status = _{
        mode: Mode,
        directory: Directory,
        generation: Generation,
        sequence: Sequence,
        journalBytes: JournalBytes
    }.

journal_bytes(Directory, Bytes) :-
    (   kb_persistency_directory(_PersistencyDirectory)
    ->  (   findall(Size,
                    ( rdf_journal_file(_Graph, JournalFile),
                      size_file(JournalFile, Size) ),
                Sizes),
            sum_list(Sizes, Bytes)
        )
    ;   atom_concat(Directory, '/audit.log', AuditLog),
        (exists_file(AuditLog) -> size_file(AuditLog, Bytes) ; Bytes = 0)
    ).

directory_size(Directory, Bytes) :-
    (   exists_directory(Directory)
    ->  directory_files(Directory, Files),
        directory_size_files(Directory, Files, 0, Bytes)
    ;   Bytes = 0
    ).

directory_size_files(_, [], Total, Total).
directory_size_files(Directory, [File|Rest], Acc, Total) :-
    (   memberchk(File, ['.', '..'])
    ->  Next = Acc
    ;   atom_concat(Directory, '/', Prefix),
        atom_concat(Prefix, File, FullPath),
        (   exists_directory(FullPath)
        ->  directory_size(FullPath, ChildSize), Next is Acc + ChildSize
        ;   exists_file(FullPath), size_file(FullPath, Size)
        ->  Next is Acc + Size
        ;   Next = Acc
        )
    ),
    directory_size_files(Directory, Rest, Next, Total).

%% kb_storage_compact
kb_storage_compact :-
    kb_storage_mode(journaled),
    kb_attached(Directory),
    with_kb_mutex(kb_storage_compact_locked(Directory)).

%% kb_storage_compact_if_needed
% Compact only when the live journal has crossed the 16 MiB idle-compaction
% threshold.  The engine invokes this predicate after the client queue drains;
% ordinary writes only append durable journal records and never rewrite a
% snapshot on the hot path.
kb_storage_compact_if_needed :-
    kb_storage_mode(journaled),
    kb_attached(Directory),
    with_kb_mutex((
        journal_bytes(Directory, JournalBytes),
        (   JournalBytes >= 16777216
        ->  kb_storage_compact_locked(Directory)
        ;   true
        )
    )).

kb_storage_compact_locked(Directory) :-
    % A caller may explicitly compact immediately after a low-level mutation
    % that has not gone through kb_save/0. Publish that dirty transaction
    % first so CURRENT never points at an older commit sequence.
    kb_save_journaled_locked(Directory),
    rdf_flush_journals([min_size(0)]),
    (   kb_generation(Generation) -> true ; Generation = 'generation-1' ),
    (   kb_commit_sequence(Sequence) -> true ; Sequence = 0 ),
    write_journal_head(Directory, Generation, Sequence).

%% kb_storage_export(+TargetDirectory)
% Export a journaled branch to the legacy RDF/XML shape without changing the
% active store.  The human-readable audit export is intentionally derived.
kb_storage_export(TargetDirectory) :-
    kb_graph(GraphURI),
    (   exists_directory(TargetDirectory)
    ->  true
    ;   make_directory_path(TargetDirectory)
    ),
    atom_concat(TargetDirectory, '/kb.rdf', TargetFile),
    rdf_save(TargetFile,
             [graph(GraphURI), base_uri('urn-kibi:'), namespaces([kb, xsd])]),
    atom_concat(TargetDirectory, '/audit.log', AuditFile),
    setup_call_cleanup(
        open(AuditFile, write, Stream, [encoding(utf8)]),
        export_audit_events(Stream, GraphURI),
        close(Stream)
    ).

%% kb_migrate_legacy(+SourceDirectory, +TargetDirectory)
% Copy a legacy RDF/audit graph into a fresh journaled directory.  The caller
% publishes the staged directory atomically; this predicate deliberately
% leaves the source untouched on failure.
% implements REQ-core-journaled-engine-persistence
kb_migrate_legacy(SourceDirectory, TargetDirectory) :-
    kb_attached(SourceDirectory),
    kb_storage_mode(legacy),
    % Hold the legacy branch lock for the complete import and audit copy so a
    % pre-cutover writer cannot change the source between validation and
    % publication.
    with_kb_file_lock_nowait(
        SourceDirectory,
        kb_migrate_legacy_locked(SourceDirectory, TargetDirectory)
    ).

% Migration is a cutover operation, not a background writer.  Never leave a
% CLI/engine request blocked indefinitely behind an old MCP process that still
% owns the legacy lock; surface the lock owner to the caller so it can stop the
% old client and retry.  Ordinary legacy saves retain their blocking lock
% semantics for compatibility.
with_kb_file_lock_nowait(Directory, Goal) :-
    atom_concat(Directory, '/kb.lock', LockFile),
    setup_call_cleanup(
        open(LockFile, append, LockStream, [lock(write), wait(false)]),
        call(Goal),
        close(LockStream)
    ).

kb_migrate_legacy_locked(_SourceDirectory, TargetDirectory) :-
    kb_graph(SourceGraph),
    findall(
        t(S, P, O),
        (   rdf(S, P, O, SourceGraph),
            \+ audit_resource(S)
        ),
        Triples
    ),
    findall(c(TS, Op, Entity, Data),
            changeset(TS, Op, Entity, Data),
            Audits),
    canonical_triple_digest(Triples, SourceDigest),
    length(Triples, TripleCount),
    length(Audits, AuditCount),
    kb_detach,
    (   exists_directory(TargetDirectory)
    ->  true
    ;   make_directory_path(TargetDirectory)
    ),
    write_journal_marker(TargetDirectory),
    kb_attach(TargetDirectory),
    kb_graph(TargetGraph),
    forall(member(t(S, P, O), Triples), rdf_assert(S, P, O, TargetGraph)),
    assert_migration_audits(Audits, 1),
    kb_mark_dirty,
    kb_mark_index_dirty,
    validate_migrated_graph(
        TargetGraph,
        SourceDigest,
        TripleCount,
        AuditCount
    ),
    kb_save_journaled,
    kb_detach.

canonical_triple_digest(Triples, Digest) :-
    sort(Triples, Canonical),
    term_hash(Canonical, Digest).

validate_migrated_graph(Graph, ExpectedDigest, ExpectedTriples, ExpectedAudits) :-
    findall(
        t(S, P, O),
        (   rdf(S, P, O, Graph),
            \+ audit_resource(S)
        ),
        Triples
    ),
    length(Triples, ActualTriples),
    (   ActualTriples =:= ExpectedTriples
    ->  true
    ;   throw(error(migration_validation(triple_count, ExpectedTriples, ActualTriples),
                    kb_migrate_legacy/2))
    ),
    canonical_triple_digest(Triples, ActualDigest),
    (   ActualDigest == ExpectedDigest
    ->  true
    ;   throw(error(migration_validation(triple_digest, ExpectedDigest, ActualDigest),
                    kb_migrate_legacy/2))
    ),
    findall(Audit,
            rdf(Audit, 'urn:kibi:audit/operation', _, Graph),
            AuditResources),
    length(AuditResources, ActualAudits),
    (   ActualAudits =:= ExpectedAudits
    ->  true
    ;   throw(error(migration_validation(audit_count, ExpectedAudits, ActualAudits),
                    kb_migrate_legacy/2))
    ),
    % Re-run the schema and relationship invariants before publication. This
    % catches missing required fields and dangling edges while the staged
    % generation is still disposable.
    findall(
        problem(Id, Type),
        (   kb_entity(Id, Type, Props),
            normalize_migration_props(Type, Props, ValidationProps),
            \+ catch(validate_entity(Type, ValidationProps), _, fail)
        ),
        EntityProblems
    ),
    (   EntityProblems == []
    ->  true
    ;   throw(error(migration_validation(entity_schema, EntityProblems),
                    kb_migrate_legacy/2))
    ),
    findall(
        problem(RelType, FromId, ToId),
        (   relationship_type(RelType),
            kb_relationship(RelType, FromId, ToId),
            (   \+ once(kb_entity(FromId, _, _))
            ;   \+ once(kb_entity(ToId, _, _))
            ;   once(kb_entity(FromId, FromType, _)),
                once(kb_entity(ToId, ToType, _)),
                \+ catch(validate_relationship(RelType, FromType, ToType), _, fail)
            )
        ),
        RelationshipProblems
    ),
    (   RelationshipProblems == []
    ->  true
    ;   throw(error(migration_validation(relationships, RelationshipProblems),
                    kb_migrate_legacy/2))
    ).

assert_migration_audits([], _).
assert_migration_audits([c(TS, Op, Entity, Data)|Rest], Index) :-
    kb_assert_audit_event_with_timestamp(TS, Op, Entity, Data, Index),
    NextIndex is Index + 1,
    assert_migration_audits(Rest, NextIndex).

normalize_migration_props(_, [], []).
normalize_migration_props(Type, [Key=Value|Rest], NormalizedProps) :-
    normalize_migration_props(Type, Rest, RestProps),
    (   entity_property(Type, Key, _)
    ->  normalize_migration_value(Type, Key, Value, Normalized),
        NormalizedProps = [Key=Normalized|RestProps]
    ;   % Preserve unknown legacy RDF fields in the copied graph, but do not
        % reject an otherwise valid entity merely because an older schema
        % version stored an extension that the current validator no longer
        % models. Required/currently typed fields are still validated below.
        NormalizedProps = RestProps
    ).

% Legacy RDF reads intentionally preserve typed literal wrappers for the
% public query API.  Validation, however, needs the schema-level value (atom,
% string, number, boolean, or list) that an upsert would have received.  Use
% the entity schema as the decoder instead of maintaining another list of
% fields that can drift as the schema evolves.
normalize_migration_value(Type, Key, Raw, Normalized) :-
    migration_unwrap_literal(Raw, Value),
    (   entity_property(Type, Key, Kind)
    ->  normalize_migration_kind(Kind, Value, Normalized)
    ;   Normalized = Value
    ).

migration_unwrap_literal(^^(Value, _Type), Value) :- !.
migration_unwrap_literal(literal(type(_, Value)), Value) :- !.
migration_unwrap_literal(literal(lang(_, Value)), Value) :- !.
migration_unwrap_literal(literal(Value), Value) :- !.
migration_unwrap_literal(Value, Value).

normalize_migration_kind(atom, Value, Normalized) :-
    !,
    normalize_term_atom(Value, Normalized).
normalize_migration_kind(atom_or_string, Value, Normalized) :-
    !,
    (atom(Value) ; string(Value)),
    Normalized = Value.
normalize_migration_kind(string, Value, Normalized) :-
    !,
    migration_string(Value, Normalized).
normalize_migration_kind(uri, Value, Normalized) :-
    !,
    migration_string(Value, Normalized).
normalize_migration_kind(datetime, Value, Normalized) :-
    !,
    migration_string(Value, Normalized).
normalize_migration_kind(list, Value, Normalized) :-
    !,
    (   is_list(Value)
    ->  maplist(normalize_migration_list_value, Value, Normalized)
    ;   Normalized = Value
    ).
normalize_migration_kind(list_or_json, Value, Value) :- !.
normalize_migration_kind(integer, Value, Normalized) :-
    !,
    (integer(Value) -> Normalized = Value ; atom_number(Value, Normalized)).
normalize_migration_kind(number, Value, Normalized) :-
    !,
    (number(Value) -> Normalized = Value ; atom_number(Value, Normalized)).
normalize_migration_kind(boolean, Value, Value) :- !.
normalize_migration_kind(_, Value, Value).

migration_string(Value, Value) :- string(Value), !.
migration_string(Value, String) :- atom(Value), !, atom_string(Value, String).
migration_string(Value, String) :- number(Value), !, number_string(Value, String).
migration_string(Value, String) :- term_string(Value, String).

normalize_migration_list_value(Value, Normalized) :-
    (atom(Value) -> Normalized = Value ; string(Value) -> Normalized = Value ; Normalized = Value).

migration_atom_key(id).
migration_atom_key(status).
migration_atom_key(owner).
migration_atom_key(priority).
migration_atom_key(severity).
migration_atom_key(symbol_role).
migration_atom_key(granularity_reason).
migration_atom_key(fact_kind).
migration_atom_key(operator).
migration_atom_key(value_type).
migration_atom_key(polarity).

audit_resource(Resource) :-
    atom(Resource),
    sub_atom(Resource, 0, _, _, 'urn:kibi:audit/').

write_journal_marker(Directory) :-
    atom_concat(Directory, '/storage.json', Marker),
    setup_call_cleanup(
        open(Marker, write, Stream, [encoding(utf8)]),
        format(Stream,
               '{"format":"kibi.rdf-journal.v1","schemaVersion":1}~n',
               []),
        close(Stream)
    ),
    get_time(Now),
    Millis is floor(Now * 1000),
    (current_prolog_flag(pid, Pid) -> true ; Pid = 0),
    format(atom(Generation), 'generation-~w-~w', [Pid, Millis]),
    atom_concat(Directory, '/CURRENT', HeadFile),
    setup_call_cleanup(
        open(HeadFile, write, HeadStream, [encoding(utf8)]),
        format(HeadStream, '~w:0~n', [Generation]),
        close(HeadStream)
    ).

export_audit_events(Stream, GraphURI) :-
    forall(
        rdf(Audit, 'urn:kibi:audit/operation', Operation, GraphURI),
        (
            rdf(Audit, 'urn:kibi:audit/timestamp', Timestamp, GraphURI),
            rdf(Audit, 'urn:kibi:audit/entity', Entity, GraphURI),
            rdf(Audit, 'urn:kibi:audit/data', Data, GraphURI),
            format(Stream, 'changeset(~q, ~q, ~q, ~q).~n',
                   [Timestamp, Operation, Entity, Data])
        )
    ).

temp_rdf_file(Directory, TempFile) :-
    get_time(Timestamp),
    Millis is floor(Timestamp * 1000),
    (   current_prolog_flag(pid, Pid)
    ->  true
    ;   Pid = 0
    ),
    format(atom(TempFile), '~w/kb.rdf.tmp.~w.~w', [Directory, Pid, Millis]).

save_rdf_snapshot(TargetFile) :-
    (   kb_graph(GraphURI)
    ->  rdf_save(TargetFile, [graph(GraphURI), base_uri('urn-kibi:'), namespaces([kb, xsd])])
    ;   rdf_save(TargetFile, [base_uri('urn-kibi:'), namespaces([kb, xsd])])
    ).

sync_audit_log :-
    (   kb_audit_db(AuditLog)
    ->  db_sync(AuditLog)
    ;   true
    ).

cleanup_temp_file(TempFile) :-
    (   exists_file(TempFile)
    ->  catch(delete_file(TempFile), _, true)
    ;   true
    ).

current_data_stamp(DataFile, missing) :-
    \+ exists_file(DataFile),
    !.
current_data_stamp(DataFile, stamp(MTime, Size)) :-
    time_file(DataFile, MTime),
    size_file(DataFile, Size).

ensure_snapshot_current(DataFile) :-
    (   kb_attached_snapshot(ExpectedStamp)
    ->  current_data_stamp(DataFile, CurrentStamp),
        (   ExpectedStamp == CurrentStamp
        ->  true
        ;   throw(error(permission_error(save, kb, stale_snapshot), kb_save/0))
        )
    ;   true
    ).

%% with_kb_mutex(+Goal)
% Execute Goal with KB mutex protection for thread safety.
with_kb_mutex(Goal) :-
    with_mutex(kb_lock, Goal).

% Run a journaled RDF mutation atomically and only mark the branch dirty after
% the transaction commits.  A failed validation/contradiction check therefore
% cannot make a later shutdown publish a phantom commit sequence.  Preserve a
% pre-existing dirty bit for callers that intentionally batch several writes
% before an explicit kb_save/0.
kb_run_journaled_mutation(Goal) :-
    (   kb_dirty -> WasDirty = true ; WasDirty = false ),
    catch(
        rdf_transaction(Goal),
        Error,
        (   (WasDirty == false -> retractall(kb_dirty) ; true),
            throw(Error)
        )
    ),
    kb_mark_dirty.

%% load_kb_pl_files(+Directory)
% Load legacy .pl entity files from the KB directory.
% These files use entity/4 format: entity(Type, Id, Title, Props).
load_kb_pl_files(Directory) :-
    catch(abolish(entity/4), _, true),
    dynamic(entity/4),
    retractall(entity(_, _, _, _)),
    directory_files(Directory, Files),
    forall(
        (
            member(File, Files),
            sub_atom(File, _, 3, 0, '.pl'),
            \+ memberchk(File, ['entities.pl', 'relationships.pl', 'validation.pl'])
        ),
        (
            atom_concat(Directory, '/', Prefix),
            atom_concat(Prefix, File, FullPath),
            catch(consult(FullPath), Error, (print_message(warning, Error), fail))
        )
    ).

%% kb_assert_entity(+Type, +Properties)
% Assert an entity into the KB with audit logging.
% Properties is a list of Key=Value pairs.
kb_assert_entity(Type, Props) :-
    memberchk(id=Id, Props),
    (   once(kb_entity(Id, _, _))
    ->  ChangeKind = updated
    ;   ChangeKind = created
    ),
    (   kb_storage_mode(journaled)
    ->  kb_run_journaled_mutation((
            kb_assert_entity_no_audit(Type, Props),
            kb_log_entity_upsert(ChangeKind, Type, Props)
        ))
    ;   kb_mark_dirty,
        kb_assert_entity_no_audit(Type, Props),
        kb_log_entity_upsert(ChangeKind, Type, Props)
    ).

%% kb_assert_entity_no_audit(+Type, +Properties)
% Assert an entity RDF payload without recording audit side effects.
% Used by write-gated MCP transactions so failed contradiction checks do not
% leave partial audit residue.
kb_assert_entity_no_audit(Type, Props) :-
    % Validate entity
    validate_entity(Type, Props),
    % Extract ID
    memberchk(id=Id, Props),
    % Get current graph
    kb_graph(Graph),
    % Execute RDF operations with mutex protection
    with_kb_mutex((
        % Create entity URI using prefix notation for namespace expansion
        entity_id_to_uri(Id, EntityURI),
        % Upsert semantics: remove only property triples, preserving relationships.
        % Relationship triples have entity URI objects (kb:entity/...);
        % property triples have typed literal objects (_^^xsd:...).
        forall(
            (   rdf(EntityURI, Prop, Obj, Graph),
                (   atom(Obj)
                ->  \+ entity_uri_to_id(Obj, _)
                ;   true
                )
            ),
            rdf_retractall(EntityURI, Prop, Obj, Graph)
        ),
        % Store type as string literal to prevent URI interpretation
        atom_string(Type, TypeStr),
        rdf_assert(EntityURI, kb:type, TypeStr^^'http://www.w3.org/2001/XMLSchema#string', Graph),
        % Store all properties
        forall(
            member(Key=Value, Props),
            store_property(EntityURI, Key, Value, Graph)
        )
    )),
    kb_refresh_entity_index(Id).

%% kb_commit_upsert(+Type, +Properties, +Relationships, +SkipContradiction, -ChangeKind)
% Commit an entity upsert, its relationships, audit entries, and RDF snapshot
% as one bounded operation.  The branch lock is held before any RDF mutation,
% so concurrent runtimes cannot observe or publish an intermediate upsert.
% Relationships use rel(Type, FromId, ToId, Metadata) terms.  Metadata is
% retained for the caller's serialization contract; the audit schema records
% only the relationship endpoints and type, as before.
kb_commit_upsert(Type, Props, Relationships, SkipContradiction, ChangeKind) :-
    kb_storage_mode(journaled),
    !,
    memberchk(id=Id, Props),
    memberchk(SkipContradiction, [true, false]),
    upsert_change_kind(Id, ChangeKind),
    with_kb_mutex((
        (   kb_dirty -> WasDirty = true ; WasDirty = false ),
        catch(
            rdf_transaction((
                kb_stage(rdf_mutation),
                kb_assert_entity_no_audit(Type, Props),
                kb_commit_relationships_no_audit(Relationships),
                kb_maybe_check_req_contradiction(Type, Id, SkipContradiction),
                kb_stage(entity_audit),
                kb_log_entity_upsert(ChangeKind, Type, Props),
                kb_stage(relationship_audit),
                kb_commit_relationship_audits(Relationships)
            )),
            Error,
            (   (WasDirty == false -> retractall(kb_dirty) ; true),
                throw(Error)
            )
        ),
        kb_mark_dirty,
        kb_save_journaled
    )).
kb_commit_upsert(Type, Props, Relationships, SkipContradiction, ChangeKind) :-
    memberchk(id=Id, Props),
    memberchk(SkipContradiction, [true, false]),
    kb_attached(Directory),
    atom_concat(Directory, '/kb.rdf', DataFile),
    kb_stage(runtime),
    kb_runtime_diagnostic,
    % Emit the lock marker before waiting so a timeout identifies a branch
    % lock held by another runtime instead of reporting only the prior stage.
    kb_stage(lock),
    with_kb_file_lock(Directory, (
        audit_store_writable,
        ensure_snapshot_current(DataFile),
        upsert_change_kind(Id, ChangeKind),
        rdf_transaction((
            kb_stage(rdf_mutation),
            kb_assert_entity_no_audit(Type, Props),
            kb_commit_relationships_no_audit(Relationships),
            kb_maybe_check_req_contradiction(Type, Id, SkipContradiction),
            kb_stage(entity_audit),
            kb_log_entity_upsert(ChangeKind, Type, Props),
            kb_stage(relationship_audit),
            kb_commit_relationship_audits(Relationships),
            kb_save_locked(Directory)
        ))
    )).

upsert_change_kind(Id, updated) :-
    once(kb_entity(Id, _, _)),
    !.
upsert_change_kind(_, created).

kb_commit_relationships_no_audit([]).
kb_commit_relationships_no_audit([
    rel(RelType, FromId, ToId, Metadata)|Rest
]) :-
    kb_assert_relationship_no_audit(RelType, FromId, ToId, Metadata),
    kb_commit_relationships_no_audit(Rest).

kb_maybe_check_req_contradiction(req, Id, false) :-
    !,
    kb_stage(contradiction_check),
    check_req_contradiction(Id).
kb_maybe_check_req_contradiction(_, _, _).

kb_commit_relationship_audits([]).
kb_commit_relationship_audits([
    rel(RelType, FromId, ToId, _Metadata)|Rest
]) :-
    kb_log_relationship_upsert(RelType, FromId, ToId, []),
    kb_commit_relationship_audits(Rest).

% Probe the existing journal without waiting.  A process running code from
% before the sync(close) fix may still retain the journal's write lock; fail
% before touching RDF so callers receive a safe, retryable diagnostic.
audit_store_writable :-
    kb_audit_db(AuditLog),
    (   exists_file(AuditLog)
    ->  catch(
        setup_call_cleanup(
                open(AuditLog, append, Stream,
                     [lock(write), wait(false), encoding(utf8)]),
                true,
                close(Stream)
            ),
            Error,
            throw(error(permission_error(lock, audit_log, AuditLog),
                        context(kb_commit_upsert/5, Error)))
        )
    ;   true
    ).

% Reserved stderr markers are consumed by PrologProcess diagnostics and never
% form part of the JSON result.  They make timeout errors stage-specific even
% when the child is blocked inside a filesystem primitive.
kb_stage(Stage) :-
    format(user_error, '__KIBI_STAGE__:~w~n', [Stage]),
    flush_output(user_error).

kb_runtime_diagnostic :-
    (   current_prolog_flag(pid, Pid) -> true ; Pid = unknown ),
    (   kb_audit_db(AuditLog) -> true ; AuditLog = unknown ),
    kb_environment_value('KIBI_RUNTIME_NAME', RuntimeName),
    kb_environment_value('KIBI_RUNTIME_VERSION', RuntimeVersion),
    kb_environment_value('KIBI_PACKAGE_VERSIONS', PackageVersions),
    format(user_error,
           '__KIBI_RUNTIME__:pid=~w;audit=~w;runtime=~w@~w;packages=~w~n',
           [Pid, AuditLog, RuntimeName, RuntimeVersion, PackageVersions]),
    flush_output(user_error).

kb_environment_value(Name, Value) :-
    (   getenv(Name, Value)
    ->  true
    ;   Value = unknown
    ).

%% kb_retract_entity_relationships(+Id)
% Remove all relationship triples for an entity, preserving property triples.
% Used by projectStagedEntities to clear stale relationships before re-asserting.
kb_retract_entity_relationships(Id) :-
    kb_graph(Graph),
    (   kb_storage_mode(journaled)
    ->  kb_run_journaled_mutation(with_kb_mutex((
            entity_id_to_uri(Id, EntityURI),
            forall(
                (   rdf(EntityURI, RelURI, TargetURI, Graph),
                    atom(TargetURI),
                    entity_uri_to_id(TargetURI, _)
                ),
                rdf_retractall(EntityURI, RelURI, TargetURI, Graph)
            )
        )))
    ;   kb_mark_dirty,
        with_kb_mutex((
            entity_id_to_uri(Id, EntityURI),
            forall(
                (   rdf(EntityURI, RelURI, TargetURI, Graph),
                    atom(TargetURI),
                    entity_uri_to_id(TargetURI, _)
                ),
                rdf_retractall(EntityURI, RelURI, TargetURI, Graph)
            )
        ))
    ).

%% kb_retract_relationship(+Type, +From, +To)
% Retract one compiled edge and its audit record atomically. This is used by
% relationship-shard deltas so a small shard edit never requires clearing and
% rebuilding every edge in the graph.
kb_retract_relationship(RelType, FromId, ToId) :-
    kb_graph(Graph),
    entity_id_to_uri(FromId, FromURI),
    entity_id_to_uri(ToId, ToURI),
    kb_uri(BaseURI),
    atom_concat(BaseURI, RelType, RelURI),
    (   kb_storage_mode(journaled)
    ->  kb_run_journaled_mutation(with_kb_mutex((
            rdf_retractall(FromURI, RelURI, ToURI, Graph),
            format(atom(RelId), '~w->~w', [FromId, ToId]),
            kb_assert_audit_event(delete_rel, RelId,
                                  RelType-[from=FromId, to=ToId])
        )))
    ;   kb_mark_dirty,
        with_kb_mutex(rdf_retractall(FromURI, RelURI, ToURI, Graph))
    ).

%% kb_retract_all_relationships/0
% Remove only entity-to-entity edges. This is used when a relationship shard
% changes: RDF property literals and audit resources remain untouched, while
% the current shard contents can be asserted again in one transaction.
% implements REQ-core-journaled-engine-persistence
kb_retract_all_relationships :-
    kb_graph(Graph),
    (   kb_storage_mode(journaled)
    ->  kb_run_journaled_mutation(with_kb_mutex(
            forall(
                (   rdf(SubjectURI, RelURI, ObjectURI, Graph),
                    atom(SubjectURI),
                    atom(ObjectURI),
                    entity_uri_to_id(SubjectURI, _),
                    entity_uri_to_id(ObjectURI, _)
                ),
                rdf_retractall(SubjectURI, RelURI, ObjectURI, Graph)
            )
        ))
    ;   kb_mark_dirty,
        with_kb_mutex(
            forall(
                (   rdf(SubjectURI, RelURI, ObjectURI, Graph),
                    atom(SubjectURI),
                    atom(ObjectURI),
                    entity_uri_to_id(SubjectURI, _),
                    entity_uri_to_id(ObjectURI, _)
                ),
                rdf_retractall(SubjectURI, RelURI, ObjectURI, Graph)
            )
        )
    ).

%% kb_log_entity_upsert(+ChangeKind, +Type, +Properties)
% Append the audit entry for a successfully committed entity upsert.
kb_log_entity_upsert(ChangeKind, Type, Props) :-
    kb_storage_mode(journaled),
    !,
    memberchk(id=Id, Props),
    kb_assert_audit_event(upsert, Id, Type-[change_kind=ChangeKind|Props]).
kb_log_entity_upsert(ChangeKind, Type, Props) :-
    memberchk(id=Id, Props),
    memberchk(ChangeKind, [created, updated]),
    with_kb_mutex((
        get_time(Timestamp),
        format_time(atom(TS), '%FT%T%:z', Timestamp),
        assert_changeset(TS, upsert, Id, Type-[change_kind=ChangeKind|Props])
    )).

%% kb_retract_entity(+Id)
% Remove an entity from the KB with audit logging.
kb_retract_entity(Id) :-
    (   once(kb_entity(Id, Type, Props))
    ->  entity_delete_audit_props(Id, Props, AuditProps)
    ;   Type = unknown,
        AuditProps = [id=Id]
    ),
    kb_retract_entity(Id, Type, AuditProps).

%% kb_retract_entity(+Id, +Type, +AuditProps)
% Remove an entity from the KB and log the provided delete payload.
kb_retract_entity(Id, Type, AuditProps) :-
    kb_storage_mode(journaled),
    !,
    kb_graph(Graph),
    kb_run_journaled_mutation(with_kb_mutex((
        entity_id_to_uri(Id, EntityURI),
        % A source delta may replace an entity that is still referenced by
        % another source. Remove both directions so the transaction cannot
        % leave a dangling relationship behind. The compiler re-adds valid
        % edges from the current source shards in the same sync.
        forall(
            (   rdf(SubjectURI, RelURI, EntityURI, Graph),
                entity_uri_to_id(SubjectURI, _)
            ),
            rdf_retractall(SubjectURI, RelURI, EntityURI, Graph)
        ),
        rdf_retractall(EntityURI, _, _, Graph),
        kb_assert_audit_event(delete, Id, Type-AuditProps),
        kb_remove_entity_index(Id)
    ))).
kb_retract_entity(Id, Type, AuditProps) :-
    kb_graph(Graph),
    with_kb_mutex((
        % Create entity URI
        entity_id_to_uri(Id, EntityURI),
        % Remove all triples for this entity
        rdf_retractall(EntityURI, _, _, Graph),
        % Log to audit
        get_time(Timestamp),
        format_time(atom(TS), '%FT%T%:z', Timestamp),
        assert_changeset(TS, delete, Id, Type-AuditProps),
        kb_remove_entity_index(Id)
    )).

entity_delete_audit_props(Id, Props, AuditProps) :-
    findall(Key=Value,
        (   member(Key, [title, source, text_ref, semantic_text]),
            memberchk(Key=RawValue, Props),
            audit_property_value(RawValue, Value)
        ),
        OptionalProps),
    AuditProps = [id=Id|OptionalProps].

audit_property_value(RawValue, Value) :-
    (   RawValue = ^^(Inner, _)
    ->  Value = Inner
    ;   RawValue = literal(type(_, Inner))
    ->  Value = Inner
    ;   RawValue = literal(lang(_, Inner))
    ->  Value = Inner
    ;   RawValue = literal(Inner)
    ->  Value = Inner
    ;   Value = RawValue
    ).

%% kb_entity(?Id, ?Type, ?Properties)
% Query entities from the KB.
% Properties is unified with a list of Key=Value pairs.
kb_entity(Id, Type, Props) :-
    (   nonvar(Id)
    ->  kb_entity_raw(Id, Type, Props)
    ;   kb_ensure_indexes,
        (   nonvar(Type)
        ->  kb_index_type(Type, IndexedId),
            kb_entity_raw(IndexedId, Type, Props),
            Id = IndexedId
        ;   kb_entity_raw(Id, Type, Props)
        )
    ).

% Raw RDF/entity facts are kept separate from the index wrapper.  Rebuilding
% an index must never recurse through the indexed query path.
kb_entity_raw(Id, Type, Props) :-
    kb_graph(Graph),
    % Find entity by pattern - use unquoted namespace term kb:type
    (   var(Id)
    ->  rdf(EntityURI, kb:type, TypeLiteral, Graph),
        entity_uri_to_id(EntityURI, Id)
    ;   entity_id_to_uri(Id, EntityURI),
        rdf(EntityURI, kb:type, TypeLiteral, Graph)
    ),
    % Extract type - convert string literal to atom
    literal_to_atom(TypeLiteral, Type),
    % Collect all properties (exclude kb:type which expands to full URI)
    findall(Key=Value, (
        rdf(EntityURI, PropURI, ValueLiteral, Graph),
        kb_uri(BaseURI),
        atom_concat(BaseURI, type, TypeURI),
        PropURI \= TypeURI,
        uri_to_key(PropURI, Key),
        literal_to_value(Key, ValueLiteral, Value)
), Props).

% Fallback: read from legacy entity/4 facts loaded from .pl files
kb_entity_raw(Id, Type, Props) :-
    entity(Type, Id, _Title, PropList),
    convert_legacy_props(PropList, Props).

kb_ensure_indexes :-
    (   kb_index_ready,
        \+ kb_index_dirty,
        kb_index_entity_count(Expected),
        current_entity_index_count(Expected)
    ->  true
    ;   kb_rebuild_indexes
    ).

% Rebuild all acceleration structures from RDF/entity facts.  This is
% intentionally disposable: no query result is written back to RDF when an
% index is stale or externally invalidated.
kb_rebuild_indexes :-
    kb_attached(_),
    with_kb_mutex((
        retractall(kb_index_entity(_, _)),
        retractall(kb_index_type(_, _)),
        retractall(kb_index_tag(_, _)),
        retractall(kb_index_source(_, _)),
        retractall(kb_index_token(_, _)),
        retractall(kb_index_symbol_coordinate(_, _, _, _, _)),
        findall(Id-Type-Props, kb_entity_raw(Id, Type, Props), Rows),
        forall(member(Id-Type-Props, Rows), index_entity_row(Id, Type, Props)),
        length(Rows, EntityCount),
        retractall(kb_index_entity_count(_)),
        assertz(kb_index_entity_count(EntityCount)),
        rdf_statistics(triples(TripleCount)),
        retractall(kb_index_triple_count(_)),
        assertz(kb_index_triple_count(TripleCount)),
        retractall(kb_index_dirty),
        retractall(kb_index_ready),
        assertz(kb_index_ready)
    )).

current_entity_index_count(Count) :-
    aggregate_all(count,
                  rdf(_, kb:type, _, _),
                  RdfCount),
    aggregate_all(count,
                  entity(_, _, _, _),
                  LegacyCount),
    Count is RdfCount + LegacyCount.

index_entity_row(Id, Type, Props) :-
    assertz(kb_index_entity(Id, Type)),
    assertz(kb_index_type(Type, Id)),
    (   entity_source_atom(Props, Source)
    ->  assertz(kb_index_source(Source, Id)),
        index_text_tokens(Source, SourceTokens),
        forall(member(Token, SourceTokens), assertz(kb_index_token(Token, Id)))
    ;   true
    ),
    (   memberchk(title=TitleValue, Props)
    ->  normalize_term_atom(TitleValue, Title),
        index_text_tokens(Title, TitleTokens),
        forall(member(Token, TitleTokens), assertz(kb_index_token(Token, Id)))
    ;   true
    ),
    index_text_tokens(Id, IdTokens),
    forall(member(Token, IdTokens), assertz(kb_index_token(Token, Id))),
    index_text_tokens(Type, TypeTokens),
    forall(member(Token, TypeTokens), assertz(kb_index_token(Token, Id))),
    forall(
        ( member(SearchKey, [owner, priority, severity, text_ref, semantic_text]),
          memberchk(SearchKey=SearchValue, Props) ),
        ( index_text_tokens(SearchValue, SearchTokens),
          forall(member(Token, SearchTokens), assertz(kb_index_token(Token, Id))) )
    ),
    (   memberchk(tags=RawTags, Props), is_list(RawTags)
    ->  forall(member(RawTag, RawTags),
               ( normalize_term_atom(RawTag, Tag),
                 assertz(kb_index_tag(Tag, Id)),
                 index_text_tokens(Tag, TagTokens),
                 forall(member(Token, TagTokens), assertz(kb_index_token(Token, Id)))
               ))
    ;   true
    ),
    (   Type == symbol,
        memberchk(sourceLine=Line, Props),
        memberchk(sourceColumn=Column, Props),
        memberchk(sourceEndLine=EndLine, Props),
        memberchk(sourceEndColumn=EndColumn, Props)
    ->  assertz(kb_index_symbol_coordinate(Id, Line, Column, EndLine, EndColumn))
    ;   true
    ).

index_text_tokens(Value, Tokens) :-
    normalize_term_atom(Value, Atom),
    downcase_atom(Atom, Lower),
    atomic_list_concat(Parts, ' ', Lower),
    findall(Token,
            ( member(Part, Parts),
              atom_string(Part, PartString),
              split_string(PartString, "-_./:#", "-_./:#", Strings),
              member(String, Strings),
              String \= '',
              atom_string(Token, String)
            ),
            RawTokens),
    sort(RawTokens, Tokens).

% Convert legacy property list format to Key=Value pairs
convert_legacy_props([], []).
convert_legacy_props([Prop|Rest], [Key=Value|OutRest]) :-
    convert_legacy_prop(Prop, Key, Value),
    convert_legacy_props(Rest, OutRest).

convert_legacy_prop(Prop, Key, Value) :-
    functor(Prop, Key, 1), !,
    arg(1, Prop, Value).
convert_legacy_prop(Key-Value, Key, Value) :- !.
convert_legacy_prop(Key=Value, Key, Value) :- !.
convert_legacy_prop(Prop, Prop, true).

%% kb_entities_by_source(+SourcePath, -Ids)
% Returns all entity IDs whose source property matches SourcePath (substring match).
kb_entities_by_source(SourcePath, Ids) :-
    kb_ensure_indexes,
    source_value_atom(SourcePath, SourceQuery),
    findall(Id,
            ( kb_index_source(SourceAtom, Id),
              sub_atom(SourceAtom, _, _, _, SourceQuery) ),
            RawIds),
    sort(RawIds, Ids).

%% kb_entities_by_tag(+Tag, -Ids)
% Index-backed tag lookup used by exact/paginated discovery queries.
kb_entities_by_tag(Tag, Ids) :-
    kb_ensure_indexes,
    normalize_term_atom(Tag, NormalizedTag),
    findall(Id, kb_index_tag(NormalizedTag, Id), RawIds),
    sort(RawIds, Ids).

%% kb_indexed_sources(-Sources)
% Return unique normalized source paths for freshness checks without
% materializing every entity property list.
kb_indexed_sources(Sources) :-
    kb_ensure_indexes,
    (   setof(Source, Id^kb_index_source(Source, Id), Sources)
    ->  true
    ;   Sources = []
    ).

%% kb_query_entities(+Type, +Id, +Tags, +Source, +Limit, +Offset, -Rows, -Count)
% Index-backed exact/paginated discovery.  Only the requested page is
% materialized into full property lists; RDF remains authoritative for the
% final rows and the index only supplies candidate IDs.
kb_query_entities(TypeFilter, IdFilter, Tags, SourceFilter, Limit, Offset, Rows, Count) :-
    integer(Limit),
    integer(Offset),
    Limit >= 0,
    Offset >= 0,
    is_list(Tags),
    kb_ensure_indexes,
    findall(Id,
            indexed_entity_match(TypeFilter, IdFilter, Tags, SourceFilter, Id),
            RawIds),
    sort(RawIds, Ids),
    length(Ids, Count),
    drop_index_ids(Offset, Ids, Remaining),
    take_index_ids(Limit, Remaining, PageIds),
    findall([Id, Type, Props],
            ( member(Id, PageIds),
              kb_entity(Id, Type, Props) ),
            Rows).

indexed_entity_match(TypeFilter, IdFilter, Tags, SourceFilter, Id) :-
    (   IdFilter == none
    ->  kb_index_entity(Id, _)
    ;   Id = IdFilter,
        kb_index_entity(Id, _)
    ),
    (   TypeFilter == none
    ->  true
    ;   kb_index_type(TypeFilter, Id)
    ),
    (   Tags == []
    ->  true
    ;   member(Tag, Tags),
        kb_index_tag(Tag, Id)
    ),
    (   SourceFilter == none
    ->  true
    ;   source_value_atom(SourceFilter, SourceQuery),
        kb_index_source(Source, Id),
        sub_atom(Source, _, _, _, SourceQuery)
    ).

drop_index_ids(0, Ids, Ids) :- !.
drop_index_ids(_, [], []) :- !.
drop_index_ids(Offset, [_|Rest], Remaining) :-
    Next is Offset - 1,
    drop_index_ids(Next, Rest, Remaining).

take_index_ids(0, _, []) :- !.
take_index_ids(_, [], []) :- !.
take_index_ids(Limit, [Id|Rest], [Id|Page]) :-
    Next is Limit - 1,
    take_index_ids(Next, Rest, Page).

%% kb_search_entities(+Type, +Query, +Limit, +Offset, -Rows, -Count)
% Return an index-filtered page for the higher-level deterministic ranking
% contract. Every normalized query token must match at least one indexed token
% for the entity. The TypeScript ranker remains responsible for scores,
% reasons, snippets, and final ordering.
kb_search_entities(TypeFilter, Query, Limit, Offset, Rows, Count) :-
    integer(Limit),
    integer(Offset),
    Limit >= 0,
    Offset >= 0,
    kb_ensure_indexes,
    index_text_tokens(Query, QueryTokens),
    QueryTokens \= [],
    findall(Id,
            ( kb_index_entity(Id, _),
              (TypeFilter == none -> true ; kb_index_type(TypeFilter, Id)),
              ( indexed_markdown_source(Id)
              ; forall(member(QueryToken, QueryTokens),
                       indexed_token_match(QueryToken, Id)) ) ),
            RawIds),
    sort(RawIds, Ids),
    length(Ids, Count),
    drop_index_ids(Offset, Ids, Remaining),
    take_index_ids(Limit, Remaining, PageIds),
    findall([Id, Type, Props],
            ( member(Id, PageIds), kb_entity(Id, Type, Props) ),
            Rows).

indexed_token_match(QueryToken, Id) :-
    kb_index_token(IndexedToken, Id),
    sub_atom(IndexedToken, _, _, _, QueryToken),
    !.

% Markdown bodies remain outside RDF and are ranked by the Node discovery
% layer. Keep those usually-small document entities in the candidate set so
% indexed search does not change the public body-search contract. Large symbol
% manifests still take the fast token-index path.
indexed_markdown_source(Id) :-
    kb_index_source(Source, Id),
    sub_atom(Source, _, _, _, '.md').

entity_source_atom(Props, SourceAtom) :-
    (   memberchk(sourceFile=RawSourceFile, Props)
    ->  source_value_atom(RawSourceFile, SourceAtom)
    ;   memberchk(source=RawSource, Props),
        source_value_atom(RawSource, SourceAtom)
    ).

source_value_atom(Value, Atom) :-
    (   atom(Value)
    ->  Atom = Value
    ;   string(Value)
    ->  atom_string(Atom, Value)
    ;   Value = ^^(Inner, _)
    ->  source_value_atom(Inner, Atom)
    ;   term_string(Value, Atom)
    ).

%% kb_assert_relationship(+Type, +From, +To, +Metadata)
% Assert a relationship between two entities with validation.
kb_assert_relationship(RelType, FromId, ToId, Metadata) :-
    (   kb_storage_mode(journaled)
    ->  kb_run_journaled_mutation((
            kb_assert_relationship_no_audit(RelType, FromId, ToId, Metadata),
            kb_log_relationship_upsert(RelType, FromId, ToId, Metadata)
        ))
    ;   kb_mark_dirty,
        kb_assert_relationship_no_audit(RelType, FromId, ToId, Metadata),
        kb_log_relationship_upsert(RelType, FromId, ToId, Metadata)
    ).

%% kb_assert_relationship_no_audit(+Type, +From, +To, +Metadata)
% Assert a relationship RDF payload without recording audit side effects.
% Used by write-gated MCP transactions so failed contradiction checks do not
% leave partial audit residue.
kb_assert_relationship_no_audit(RelType, FromId, ToId, _Metadata) :-
    kb_graph(Graph),
    % Validate source entity exists
    (   once(kb_entity(FromId, FromType, _))
    ->  true
    ;   throw(error(existence_error(entity, FromId),
                context(kb_assert_relationship, 'Source entity does not exist')))
    ),
    % Validate target entity exists
    (   once(kb_entity(ToId, ToType, _))
    ->  true
    ;   throw(error(existence_error(entity, ToId),
                context(kb_assert_relationship, 'Target entity does not exist')))
    ),
    % Validate relationship type and direction
    (   validate_relationship(RelType, FromType, ToType)
    ->  true
    ;   throw(error(type_error(relationship, RelType),
                context(kb_assert_relationship, 'Invalid relationship: ~w from ~w to ~w'-[RelType, FromType, ToType])))
    ),
    validate_symbol_role_compatibility(RelType, FromId, ToId),
    % NOTE: Strict-lane fact_kind pairing is validated at the MCP layer
    % via validateStrictLanePairing() before the transaction begins.
    % Prolog-level validation is deferred to avoid potential issues with
    % rdf_transaction visibility and nondeterminism inside transactions.
    % Execute RDF operations with mutex protection
    with_kb_mutex((
        % Create entity URIs
        entity_id_to_uri(FromId, FromURI),
        entity_id_to_uri(ToId, ToURI),
        % Create relationship property URI (full URI to match saved/loaded RDF)
        kb_uri(BaseURI),
        atom_concat(BaseURI, RelType, RelURI),
        % Upsert semantics: ensure the exact triple isn't duplicated.
        rdf_retractall(FromURI, RelURI, ToURI, Graph),
        % Assert relationship triple
        rdf_assert(FromURI, RelURI, ToURI, Graph)
    )).

validate_symbol_role_compatibility(RelType, FromId, _ToId) :-
    memberchk(RelType, [implements, covered_by, executable_for]),
    !,
    (   mixed_symbol_role(RelType, FromId)
    ->  format(atom(Msg), 'symbol ~w cannot mix executable_for with production ownership/coverage relationships', [FromId]),
        throw(error(validation_error(Msg), Msg))
    ;   true
    ).
validate_symbol_role_compatibility(_, _, _).

mixed_symbol_role(executable_for, SymbolId) :-
    (   kb_relationship(implements, SymbolId, _)
    ;   kb_relationship(covered_by, SymbolId, _)
    ).
mixed_symbol_role(implements, SymbolId) :-
    kb_relationship(executable_for, SymbolId, _).
mixed_symbol_role(covered_by, SymbolId) :-
    kb_relationship(executable_for, SymbolId, _).

%% kb_log_relationship_upsert(+Type, +From, +To, +Metadata)
% Append the audit entry for a successfully committed relationship upsert.
kb_log_relationship_upsert(RelType, FromId, ToId, _Metadata) :-
    kb_storage_mode(journaled),
    !,
    format(atom(RelId), '~w->~w', [FromId, ToId]),
    kb_assert_audit_event(upsert_rel, RelId,
                          RelType-[from=FromId, to=ToId]).
kb_log_relationship_upsert(RelType, FromId, ToId, _Metadata) :-
    with_kb_mutex((
        get_time(Timestamp),
        format_time(atom(TS), '%FT%T%:z', Timestamp),
        format(atom(RelId), '~w->~w', [FromId, ToId]),
        assert_changeset(TS, upsert_rel, RelId, RelType-[from=FromId, to=ToId])
    )).

% Journaled audit records live in the same RDF graph and transaction as the
% domain mutation.  This keeps audit durability atomic without a second
% persistency lock or a second authoritative database.
kb_assert_audit_event(Operation, EntityId, Data) :-
    kb_graph(Graph),
    get_time(Timestamp),
    format_time(atom(TS), '%FT%T%:z', Timestamp),
    term_to_atom(Data, DataAtom),
    term_to_atom(EntityId, EntityAtom),
    term_to_atom(Operation, OperationAtom),
    next_audit_sequence(Sequence),
    format(atom(AuditURI), 'urn:kibi:audit/~16f-~w-~w-~w',
           [Timestamp, EntityId, Operation, Sequence]),
    with_kb_mutex((
        rdf_assert(AuditURI, 'urn:kibi:audit/operation',
                   OperationAtom^^'http://www.w3.org/2001/XMLSchema#string', Graph),
        rdf_assert(AuditURI, 'urn:kibi:audit/timestamp',
                   TS^^'http://www.w3.org/2001/XMLSchema#string', Graph),
        rdf_assert(AuditURI, 'urn:kibi:audit/entity',
                   EntityAtom^^'http://www.w3.org/2001/XMLSchema#string', Graph),
        rdf_assert(AuditURI, 'urn:kibi:audit/data',
                   DataAtom^^'http://www.w3.org/2001/XMLSchema#string', Graph)
    )).

initialize_journal_audit_sequence(GraphURI) :-
    aggregate_all(count,
                  rdf(_, 'urn:kibi:audit/operation', _, GraphURI),
                  Count),
    retractall(kb_audit_sequence(_)),
    assert(kb_audit_sequence(Count)).

next_audit_sequence(Sequence) :-
    (   retract(kb_audit_sequence(Previous))
    ->  Sequence is Previous + 1
    ;   Sequence = 1
    ),
    assertz(kb_audit_sequence(Sequence)).

kb_assert_audit_event_with_timestamp(TS, Operation, EntityId, Data) :-
    kb_assert_audit_event_with_timestamp(TS, Operation, EntityId, Data, 0).

kb_assert_audit_event_with_timestamp(TS, Operation, EntityId, Data, Index) :-
    kb_graph(Graph),
    term_to_atom(Data, DataAtom),
    term_to_atom(EntityId, EntityAtom),
    term_to_atom(Operation, OperationAtom),
    format(atom(AuditURI), 'urn:kibi:audit/~w-~w-~w-~w',
           [TS, EntityId, Operation, Index]),
    with_kb_mutex((
        rdf_assert(AuditURI, 'urn:kibi:audit/operation',
                   OperationAtom^^'http://www.w3.org/2001/XMLSchema#string', Graph),
        rdf_assert(AuditURI, 'urn:kibi:audit/timestamp',
                   TS^^'http://www.w3.org/2001/XMLSchema#string', Graph),
        rdf_assert(AuditURI, 'urn:kibi:audit/entity',
                   EntityAtom^^'http://www.w3.org/2001/XMLSchema#string', Graph),
        rdf_assert(AuditURI, 'urn:kibi:audit/data',
                   DataAtom^^'http://www.w3.org/2001/XMLSchema#string', Graph)
    )).

%% validate_strict_lane_pairing(+RelType, +FromId, +ToId)
% Validate that constrains/requires_property relationships target facts
% with the correct fact_kind for strict-lane semantics.
% constrains targets must be subject facts (or legacy facts without fact_kind);
% requires_property targets must be property_value, observation, or meta facts
% (or legacy facts without fact_kind).
% implements REQ-011
validate_strict_lane_pairing(constrains, _FromId, ToId) :-
    !,
    (   % Allow: no fact_kind (legacy), subject, observation, or meta
        kb_entity(ToId, fact, Props),
        (   \+ memberchk(fact_kind=_, Props)
        ->  true  % Legacy fact without fact_kind - allowed
        ;   memberchk(fact_kind=KindRaw, Props),
            normalize_term_atom(KindRaw, Kind),
            memberchk(Kind, [subject, observation, meta])
        )
    ->  true
    ;   format(atom(Msg), 'constrains target ~w must be a subject, observation, or meta fact', [ToId]),
        throw(error(validation_error(Msg), Msg))
    ).
validate_strict_lane_pairing(requires_property, _FromId, ToId) :-
    !,
    (   % Allow: no fact_kind (legacy), property_value, observation, or meta
        kb_entity(ToId, fact, Props),
        (   \+ memberchk(fact_kind=_, Props)
        ->  true  % Legacy fact without fact_kind - allowed
        ;   memberchk(fact_kind=KindRaw, Props),
            normalize_term_atom(KindRaw, Kind),
            memberchk(Kind, [property_value, observation, meta])
        )
    ->  true
    ;   format(atom(Msg), 'requires_property target ~w must be a property_value, observation, or meta fact', [ToId]),
        throw(error(validation_error(Msg), Msg))
    ).
validate_strict_lane_pairing(_, _, _).

%% kb_relationship(?Type, ?From, ?To)
% Query relationships from the KB.
kb_relationship(RelType, FromId, ToId) :-
    kb_graph(Graph),
    % Create relationship property URI (full URI to match loaded RDF)
    kb_uri(BaseURI),
    atom_concat(BaseURI, RelType, RelURI),
    kb_relationship_with_reluri(RelURI, Graph, FromId, ToId).

kb_relationship_with_reluri(RelURI, Graph, FromId, ToId) :-
    nonvar(FromId), nonvar(ToId), !,
    entity_id_to_uri(FromId, FromURI),
    entity_id_to_uri(ToId, ToURI),
    rdf(FromURI, RelURI, ToURI, Graph).
kb_relationship_with_reluri(RelURI, Graph, FromId, ToId) :-
    nonvar(FromId), var(ToId), !,
    entity_id_to_uri(FromId, FromURI),
    rdf(FromURI, RelURI, ToURI, Graph),
    entity_uri_to_id(ToURI, ToId).
kb_relationship_with_reluri(RelURI, Graph, FromId, ToId) :-
    var(FromId), nonvar(ToId), !,
    entity_id_to_uri(ToId, ToURI),
    rdf(FromURI, RelURI, ToURI, Graph),
    entity_uri_to_id(FromURI, FromId).
kb_relationship_with_reluri(RelURI, Graph, FromId, ToId) :-
    rdf(FromURI, RelURI, ToURI, Graph),
    entity_uri_to_id(FromURI, FromId),
    entity_uri_to_id(ToURI, ToId).

% Helper predicates

%% entity_id_to_uri(+Id, -URI)
% Build the canonical entity URI used for RDF read/write.
entity_id_to_uri(Id, URI) :-
    format(atom(URI), 'kb:entity/~w', [Id]).

%% entity_uri_to_id(+URI, -Id)
% Extract entity ID from canonical or legacy entity URIs.
entity_uri_to_id(URI, Id) :-
    atom(URI),
    (   kb_uri(BaseURI),
        atom_concat(BaseURI, 'entity/', Prefix),
        atom_concat(Prefix, Id, URI)
    ->  true
    ;   atom_concat('kb:entity/', Id, URI)
    ).

%% store_property(+EntityURI, +Key, +Value, +Graph)
% Store a property as an RDF triple with appropriate datatype.
% All values are stored as typed string literals to avoid URI interpretation issues.
% Uses prefix notation (kb:Key) to enable proper namespace expansion.
% Typed fact fields (value_int, value_number, value_bool, closed_world) are stored
% with their appropriate XSD datatypes for round-trip preservation.
store_property(EntityURI, Key, Value, Graph) :-
    % Build property URI using prefix notation for namespace expansion
    format(atom(PropURI), 'kb:~w', [Key]),
    % Convert to literal with key-aware typing for typed fact fields
    value_to_literal(Key, Value, Literal),
    rdf_assert(EntityURI, PropURI, Literal, Graph).

%% value_to_literal(+Key, +Value, -Literal)
% Convert Prolog value to RDF literal with appropriate datatype.
% Key-aware: typed fact fields get specific XSD datatypes.
value_to_literal(Key, Value, Literal) :-
    % Typed fact fields with specific XSD datatypes
    (   integer_property_key(Key), integer(Value)
    ->  Literal = Value^^'http://www.w3.org/2001/XMLSchema#integer'
    ;   Key == value_number, number(Value)
    ->  Literal = Value^^'http://www.w3.org/2001/XMLSchema#decimal'
    ;   Key == value_bool, (Value == true ; Value == false)
    ->  Literal = Value^^'http://www.w3.org/2001/XMLSchema#boolean'
    ;   Key == closed_world, (Value == true ; Value == false)
    ->  Literal = Value^^'http://www.w3.org/2001/XMLSchema#boolean'
    % Default: string or atom values as XSD string
    ;   string(Value)
    ->  Literal = Value^^'http://www.w3.org/2001/XMLSchema#string'
    ;   is_list(Value)
    ->  with_output_to(atom(ListStr), write_term(Value, [quoted(true)])),
        Literal = ListStr^^'http://www.w3.org/2001/XMLSchema#string'
    ;   format(atom(Str), '~w', [Value]),
        Literal = Str^^'http://www.w3.org/2001/XMLSchema#string'
    ).

integer_property_key(Key) :-
    memberchk(Key, [
        value_int,
        predicate_arity,
        claim_span_start,
        claim_span_end,
        sourceLine,
        sourceColumn,
        sourceEndLine,
        sourceEndColumn
    ]).

%% literal_to_value(+Key, +Literal, -Value)
% Extract a property value from an RDF literal. JSON-backed fields must remain
% intact: JSON arrays are also valid Prolog list syntax, but parsing them as
% Prolog terms corrupts their object entries before the JSON decoder sees them.
literal_to_value(semantic_inventory, Literal, Value) :-
    !,
    structured_literal_value(Literal, Value).
literal_to_value(proof_receipts, Literal, Value) :-
    !,
    structured_literal_value(Literal, Value).
literal_to_value(proof_contract, Literal, Value) :-
    !,
    structured_literal_value(Literal, Value).
literal_to_value(proof_bindings, Literal, Value) :-
    !,
    structured_literal_value(Literal, Value).
literal_to_value(_Key, Literal, Value) :-
    (   % Handle ^^/2 functor (RDF typed literal shorthand)
        Literal = ^^(StrVal, 'http://www.w3.org/2001/XMLSchema#string')
    ->  (   % Preserve RDF typed literal functor for string values so callers
            % can inspect datatype if needed; but also attempt to parse lists
            % encoded as string into Prolog lists when appropriate.
            (atom(StrVal) ; string(StrVal)),
            (atom_concat('[', _, StrVal) ; string_concat("[", _, StrVal)),
            catch(atom_to_term(StrVal, ParsedValue, []), _, fail),
            is_list(ParsedValue)
        ->  Value = ParsedValue
        ;   Value = ^^(StrVal, 'http://www.w3.org/2001/XMLSchema#string')
        )
    ;   Literal = ^^(Val, Type)
    ->  Value = ^^(Val, Type)  % Preserve other typed literals as their functor
    ;   Literal = literal(type('http://www.w3.org/2001/XMLSchema#string', StrVal))
    ->  (   % Try to parse as Prolog list term (handles both atoms and strings)
            (atom(StrVal) ; string(StrVal)),
            (atom_concat('[', _, StrVal) ; string_concat("[", _, StrVal)),
            catch(atom_to_term(StrVal, ParsedValue, []), _, fail),
            is_list(ParsedValue)
        ->  Value = ParsedValue
        ;   Value = StrVal
        )
    ;   Literal = literal(type(_, _))
    ->  Value = Literal  % Keep other typed literals as-is
    ;   Literal = literal(lang(_, Val))
    ->  Value = Val
    ;   Literal = literal(Value)
    ->  true
    ;   Value = Literal
    ).

structured_literal_value(^^(Value, _), Value) :- !.
structured_literal_value(literal(type(_, Value)), Value) :- !.
structured_literal_value(literal(lang(_, Value)), Value) :- !.
structured_literal_value(literal(Value), Value) :- !.
structured_literal_value(Value, Value).

%% literal_to_atom(+Literal, -Atom)
% Convert RDF literal to atom (for type field).
literal_to_atom(Literal, Atom) :-
    (   % Handle RDF typed literal shorthand functor ^^(Value, Type)
        Literal = ^^(Val, _Type)
    ->  (   % Val may be atom or string
            atom(Val)
        ->  Atom = Val
        ;   atom_string(Atom, Val)
        )
    ;   Literal = literal(type(_, StringVal))
    ->  atom_string(Atom, StringVal)
    ;   Literal = literal(Value)
    ->  (atom(Value) -> Atom = Value ; atom_string(Atom, Value))
    ;   atom(Literal)
    ->  Atom = Literal
    ;   atom_string(Atom, Literal)
    ).

%% uri_to_key(+URI, -Key)
% Convert URI to property key (strip kb: namespace prefix).
uri_to_key(URI, Key) :-
    (   kb_uri(BaseURI),
        atom_concat(BaseURI, Key, URI)
    ->  true
    ;   atom_concat('kb:', Key, URI)
    ->  true
    ;   URI = Key
    ).

%% ------------------------------------------------------------------
%% Inference predicates (Phase 1)
%% ------------------------------------------------------------------

%% symbol_owns_requirement(+Symbol, +Req)
% Direct requirement ownership for production code.
symbol_owns_requirement(Symbol, Req) :-
    kb_relationship(implements, Symbol, Req).

%% transitively_implements(+Symbol, +Req)
% Ownership is direct only; coverage/test traceability is handled separately.
transitively_implements(Symbol, Req) :-
    symbol_owns_requirement(Symbol, Req).

%% scenario_verified_by_test(+Scenario, +Test)
% Canonical scenario-to-test verification path.
scenario_verified_by_test(Scenario, Test) :-
    kb_relationship(validates, Test, Scenario).
scenario_verified_by_test(Scenario, Test) :-
    kb_relationship(verified_by, Scenario, Test).

%% requirement_test_fallback_allowed(+Req)
% Direct requirement-to-test fallback is only allowed when no scenario exists.
requirement_test_fallback_allowed(Req) :-
    \+ has_scenario(Req).

%% executable_test_symbol(+Symbol)
% Symbol represents executable test code rather than production code.
executable_test_symbol(Symbol) :-
    kb_relationship(executable_for, Symbol, _).

%% mixed_role_symbol(+Symbol)
% Invalid symbol carrying both executable test identity and production semantics.
mixed_role_symbol(Symbol) :-
    executable_test_symbol(Symbol),
    (   kb_relationship(implements, Symbol, _)
    ;   kb_relationship(covered_by, Symbol, _)
    ).

%% production_symbol(+Symbol)
% Internal helper for production-only symbol checks.
production_symbol(Symbol) :-
    kb_entity(Symbol, symbol, _),
    \+ executable_test_symbol(Symbol).

%% requirement_verified_by_test(+Req, +Test)
% Direct req<->test compatibility path.
requirement_verified_by_test(Req, Test) :-
    kb_relationship(validates, Test, Req).
requirement_verified_by_test(Req, Test) :-
    kb_relationship(verified_by, Req, Test).

%% test_satisfies_requirement_semantics(+Test, +Req)
% Matches requirement verification facts against typed test fields when present.
% If the requirement declares no verification semantics, compatibility passes.
test_satisfies_requirement_semantics(Test, Req) :-
    findall(Key-Expected,
            required_test_semantic(Req, Key, Expected),
            RequiredPairs0),
    sort(RequiredPairs0, RequiredPairs),
    (   RequiredPairs = []
    ->  true
    ;   kb_entity(Test, test, TestProps),
        forall(member(Key-Expected, RequiredPairs),
               test_matches_required_semantic(TestProps, Key, Expected))
    ).

required_test_semantic(Req, Key, Expected) :-
    memberchk(Key, [verification_scope, verification_perspective]),
    verification_subject_key(Req, SubjectKey),
    effective_req_property(Req, SubjectKey, Key, Operator, _ValueType, Value, _Unit, _Scope, Polarity),
    Operator == eq,
    Polarity == require,
    normalize_term_atom(Value, Expected).

verification_subject_key(Req, SubjectKey) :-
    format(atom(SubjectKey), 'requirement.~w.verification', [Req]).

test_matches_required_semantic(TestProps, Key, Expected) :-
    memberchk(Key=ActualRaw, TestProps),
    normalize_term_atom(ActualRaw, Actual),
    Actual == Expected.

%% transitively_depends(+Req1, +Req2)
% Req1 transitively depends on Req2 through depends_on chains.
transitively_depends(Req1, Req2) :-
    transitively_depends_(Req1, Req2, []).

transitively_depends_(Req1, Req2, _) :-
    kb_relationship(depends_on, Req1, Req2).
transitively_depends_(Req1, Req2, Visited) :-
    kb_relationship(depends_on, Req1, Mid),
    Req1 \= Mid,
    \+ memberchk(Mid, Visited),
    transitively_depends_(Mid, Req2, [Req1|Visited]).

%% impacted_by_change(?Entity, +Changed)
% Entity is impacted if it is connected to Changed by any relationship
% direction via bounded, cycle-safe traversal.
impacted_by_change(Changed, Changed).
impacted_by_change(Entity, Changed) :-
    dif(Entity, Changed),
    connected_entity(Changed, Entity, [Changed]).

connected_entity(Current, Target, _Visited) :-
    linked_entity(Current, Target).
connected_entity(Current, Target, Visited) :-
    linked_entity(Current, Next),
    \+ memberchk(Next, Visited),
    connected_entity(Next, Target, [Next|Visited]).

linked_entity(A, B) :-
    relationship_type(RelType),
    kb_relationship(RelType, A, B).
linked_entity(A, B) :-
    relationship_type(RelType),
    kb_relationship(RelType, B, A).

%% affected_symbols(+Req, -Symbols)
% Symbols affected by a requirement change include symbols implementing Req,
% and symbols implementing requirements that depend on Req.
affected_symbols(Req, Symbols) :-
    setof(Symbol,
          RelatedReq^(requirement_in_scope(RelatedReq, Req),
                     transitively_implements(Symbol, RelatedReq)),
          Symbols),
    !.
affected_symbols(_, []).

requirement_in_scope(Req, Req).
requirement_in_scope(RelatedReq, Req) :-
    transitively_depends(RelatedReq, Req).

%% coverage_gap(+Req, -Reason)
% Detects missing scenario/test coverage for MUST requirements.
coverage_gap(Req, missing_scenario_and_test) :-
    must_requirement(Req),
    \+ has_scenario(Req),
    \+ has_test(Req).
coverage_gap(Req, missing_scenario) :-
    must_requirement(Req),
    \+ has_scenario(Req),
    has_test(Req).
coverage_gap(Req, missing_test) :-
    must_requirement(Req),
    has_scenario(Req),
    \+ has_test(Req).

must_requirement(Req) :-
    kb_entity(Req, req, Props),
    memberchk(priority=Priority, Props),
    normalize_term_atom(Priority, PriorityAtom),
    atom_string(PriorityAtom, PriorityStr),
    sub_string(PriorityStr, _, 4, 0, "must").

has_scenario(Req) :-
    once(kb_relationship(specified_by, Req, _)).

has_test(Req) :-
    once(kb_relationship(validates, _, Req)).
has_test(Req) :-
    once(kb_relationship(verified_by, Req, _)).
has_test(Req) :-
    kb_relationship(specified_by, Req, Scenario),
    once(kb_relationship(validates, _, Scenario)).
has_test(Req) :-
    kb_relationship(specified_by, Req, Scenario),
    once(kb_relationship(verified_by, Scenario, _)).

%% untested_symbols(-Symbols)
% Returns production symbols with no test coverage relationship.
untested_symbols(Symbols) :-
    setof(Symbol, production_symbol_untested(Symbol), Symbols),
    !.
untested_symbols([]).

%% stale(+Entity, +MaxAgeDays)
% Entity is stale if updated_at is older than MaxAgeDays.
stale(Entity, MaxAgeDays) :-
    number(MaxAgeDays),
    MaxAgeDays >= 0,
    kb_entity(Entity, _, Props),
    memberchk(updated_at=UpdatedAt, Props),
    coerce_timestamp_atom(UpdatedAt, UpdatedAtAtom),
    parse_time(UpdatedAtAtom, iso_8601, UpdatedTs),
    get_time(NowTs),
    AgeDays is (NowTs - UpdatedTs) / 86400,
    AgeDays > MaxAgeDays.

%% orphaned(+Symbol)
% Production symbol is orphaned if it has no core traceability links.
orphaned(Symbol) :-
    production_symbol(Symbol),
    \+ kb_relationship(implements, Symbol, _),
    \+ kb_relationship(covered_by, Symbol, _),
    \+ kb_relationship(constrained_by, Symbol, _).

%% conflicting(?Adr1, ?Adr2)
% ADRs conflict if they both constrain the same symbol and are distinct.
conflicting(Adr1, Adr2) :-
    kb_relationship(constrained_by, Symbol, Adr1),
    kb_relationship(constrained_by, Symbol, Adr2),
    Adr1 \= Adr2,
    Adr1 @< Adr2.

%% deprecated_still_used(+Adr, -Symbols)
% Deprecated/superseded ADRs that still constrain symbols.
deprecated_still_used(Adr, Symbols) :-
    kb_entity(Adr, adr, Props),
    memberchk(status=Status, Props),
    normalize_term_atom(Status, StatusAtom),
    memberchk(StatusAtom, [deprecated, superseded]),
    setof(Symbol, kb_relationship(constrained_by, Symbol, Adr), Symbols),
    !.
deprecated_still_used(_, []).

%% ------------------------------------------------------------------
%% ADR Supersession Predicates
%% ------------------------------------------------------------------

%% current_adr(+Id)
% True when Id is an accepted ADR not superseded by any other ADR.
current_adr(Id) :-
    kb_entity(Id, adr, Props),
    memberchk(status=Status, Props),
    normalize_term_atom(Status, accepted),
    \+ kb_relationship(supersedes, _, Id).

%% superseded_by(+OldId, -NewId)
% Direct supersession.
superseded_by(OldId, NewId) :-
    kb_relationship(supersedes, NewId, OldId).

%% adr_chain(+AnyId, -Chain)
% Full ordered chain from AnyId to the current ADR (newest last).
% Cycle-safe via visited accumulator.
adr_chain(Id, Chain) :-
    adr_chain_acc(Id, [], Chain).
adr_chain_acc(Id, Visited, [Id]) :-
    \+ member(Id, Visited),
    \+ kb_relationship(supersedes, _, Id).
adr_chain_acc(Id, Visited, [Id|Rest]) :-
    \+ member(Id, Visited),
    kb_relationship(supersedes, Newer, Id),
    adr_chain_acc(Newer, [Id|Visited], Rest).

%% deprecated_no_successor(+OldId)
% Lint rule: ADR is superseded/deprecated but has no supersedes relationship pointing to it.
deprecated_no_successor(Id) :-
    kb_entity(Id, adr, Props),
    memberchk(status=Status, Props),
    normalize_term_atom(Status, StatusAtom),
    memberchk(StatusAtom, [superseded, deprecated]),
    \+ kb_relationship(supersedes, _, Id).

%% current_req(+Id)
% Requirement is current when not deprecated and not superseded by another requirement.
% Canonical statuses: open, in_progress, closed.
% Legacy statuses accepted for backwards compatibility: active, approved.
current_req(Id) :-
    kb_entity(Id, req, Props),
    memberchk(status=Status, Props),
    normalize_term_atom(Status, StatusAtom),
    memberchk(StatusAtom, [open, in_progress, closed, active, approved]),
    \+ kb_relationship(supersedes, _, Id).

%% contradicting_reqs(-ReqA, -ReqB, -Reason)
% Two current requirements contradict if they constrain facts that have
% semantic conflicts (same subject/property but incompatible values or polarities).
% Checks in order of specificity: polarity conflicts, then value conflicts.
contradicting_reqs(ReqA, ReqB, Reason) :-
    req_conflict_witness(ReqA, ReqB, Witness),
    Reason = Witness.reason.

%% ------------------------------------------------------------------
%% Semantic Contradiction Helpers (Task 4)
%% ------------------------------------------------------------------

%% req_conflict_witness(+ReqA, +ReqB, -Witness)
% Return exact, source-bound evidence for one proven strict or predicate
% contradiction.  This remains deliberately syntactic: differently shaped
% terms are never treated as equivalent merely because their prose is similar.
req_conflict_witness(ReqA, ReqB, Witness) :-
    current_req(ReqA),
    current_req(ReqB),
    ReqA @< ReqB,
    kb_relationship(constrains, ReqA, SubjectFactA),
    kb_relationship(constrains, ReqB, SubjectFactB),
    fact_subject_key(SubjectFactA, SubjectKey),
    fact_subject_key(SubjectFactB, SubjectKey),
    effective_req_property_fact(ReqA, SubjectKey, FactA, PropertyKey, OpA, ValTypeA, ValA, UnitA, ScopeA, PolarityA, ValidFromA, ValidToA),
    effective_req_property_fact(ReqB, SubjectKey, FactB, PropertyKey, OpB, ValTypeB, ValB, UnitB, ScopeB, PolarityB, ValidFromB, ValidToB),
    FactA \= FactB,
    scope_intersects(ScopeA, ScopeB),
    intervals_overlap(ValidFromA, ValidToA, ValidFromB, ValidToB),
    (   polarity_conflict(SubjectKey, PropertyKey, OpA, ValTypeA, ValA, UnitA, ScopeA, PolarityA,
                          OpB, ValTypeB, ValB, UnitB, ScopeB, PolarityB, Reason)
    ;   property_conflict(SubjectKey, PropertyKey, OpA, ValTypeA, ValA, UnitA, PolarityA,
                          OpB, ValTypeB, ValB, UnitB, PolarityB, Reason)
    ),
    property_conflict_side(ReqA, FactA, SubjectKey, PropertyKey, OpA, ValTypeA, ValA, UnitA, ScopeA, PolarityA, ValidFromA, ValidToA, Left),
    property_conflict_side(ReqB, FactB, SubjectKey, PropertyKey, OpB, ValTypeB, ValB, UnitB, ScopeB, PolarityB, ValidFromB, ValidToB, Right),
    Witness = _{
        kind: strict_property,
        status: contradiction,
        requirements: [ReqA, ReqB],
        reason: Reason,
        subjectKey: SubjectKey,
        propertyKey: PropertyKey,
        left: Left,
        right: Right
    }.
req_conflict_witness(ReqA, ReqB, Witness) :-
    current_req(ReqA),
    current_req(ReqB),
    ReqA @< ReqB,
    effective_req_predicate(ReqA, FactA, Namespace, Name, Args, PolarityA),
    effective_req_predicate(ReqB, FactB, Namespace, Name, Args, PolarityB),
    FactA \= FactB,
    opposite_predicate_polarity(PolarityA, PolarityB),
    atomic_list_concat(Args, ',', ArgsText),
    format(
        string(Reason),
        "Predicate conflict on ~w:~w(~w): ~w asserts ~w while ~w asserts ~w",
        [Namespace, Name, ArgsText, ReqA, PolarityA, ReqB, PolarityB]
    ),
    predicate_conflict_side(ReqA, FactA, Namespace, Name, Args, PolarityA, Left),
    predicate_conflict_side(ReqB, FactB, Namespace, Name, Args, PolarityB, Right),
    length(Args, Arity),
    findall(SchemaId, predicate_schema(SchemaId, Namespace, Name, Arity, _ArgumentNames, _ArgumentTypes), SchemaIds0),
    sort(SchemaIds0, SchemaIds),
    Witness = _{
        kind: predicate,
        status: contradiction,
        requirements: [ReqA, ReqB],
        reason: Reason,
        predicateNamespace: Namespace,
        predicateName: Name,
        predicateArgs: Args,
        schemaIds: SchemaIds,
        left: Left,
        right: Right
    }.

property_conflict_side(ReqId, FactId, SubjectKey, PropertyKey, Operator, ValueType, Value, Unit, Scope, Polarity, ValidFrom, ValidTo, Side) :-
    entity_evidence_source(ReqId, req, RequirementSource),
    fact_evidence_fields(FactId, FactSource, ClaimKey, ClaimText, _CanonicalKey),
    Side = _{
        requirementId: ReqId,
        requirementSource: RequirementSource,
        factId: FactId,
        factSource: FactSource,
        claimKey: ClaimKey,
        claimText: ClaimText,
        term: _{
            subjectKey: SubjectKey,
            propertyKey: PropertyKey,
            operator: Operator,
            valueType: ValueType,
            value: Value,
            unit: Unit,
            scope: Scope,
            polarity: Polarity,
            validFrom: ValidFrom,
            validTo: ValidTo
        }
    }.

predicate_conflict_side(ReqId, FactId, Namespace, Name, Args, Polarity, Side) :-
    entity_evidence_source(ReqId, req, RequirementSource),
    fact_evidence_fields(FactId, FactSource, ClaimKey, ClaimText, CanonicalKey),
    Side = _{
        requirementId: ReqId,
        requirementSource: RequirementSource,
        factId: FactId,
        factSource: FactSource,
        claimKey: ClaimKey,
        claimText: ClaimText,
        term: _{
            namespace: Namespace,
            name: Name,
            args: Args,
            polarity: Polarity,
            canonicalKey: CanonicalKey
        }
    }.

entity_evidence_source(EntityId, Type, Source) :-
    kb_entity(EntityId, Type, Props),
    (memberchk(source=RawSource, Props) -> evidence_term_atom(RawSource, Source) ; Source = '').

fact_evidence_fields(FactId, Source, ClaimKey, ClaimText, CanonicalKey) :-
    kb_entity(FactId, fact, Props),
    (memberchk(source=RawSource, Props) -> evidence_term_atom(RawSource, Source) ; Source = ''),
    (memberchk(claim_key=RawClaimKey, Props) -> evidence_term_atom(RawClaimKey, ClaimKey) ; ClaimKey = ''),
    (memberchk(claim_text=RawClaimText, Props) -> evidence_term_atom(RawClaimText, ClaimText) ; ClaimText = ''),
    (memberchk(canonical_key=RawCanonicalKey, Props) -> evidence_term_atom(RawCanonicalKey, CanonicalKey) ; CanonicalKey = '').

evidence_term_atom(Raw, Atom) :-
    unwrap_rdf_value(Raw, Value),
    (   atom(Value)
    ->  Atom = Value
    ;   string(Value)
    ->  atom_string(Atom, Value)
    ;   term_string(Value, String), atom_string(Atom, String)
    ).

%% effective_req_predicate(+ReqId, -FactId, -Namespace, -Name, -Args, -Polarity)
% Ground predicate claim required by a requirement.
effective_req_predicate(ReqId, FactId, Namespace, Name, Args, Polarity) :-
    kb_relationship(requires_predicate, ReqId, FactId),
    predicate_fact(FactId, Namespace, Name, Args, Polarity).

opposite_predicate_polarity(assert, deny).
opposite_predicate_polarity(deny, assert).

%% fact_subject_key(+FactId, -SubjectKey)
% Extract the normalized subject key for strict subject facts.
fact_subject_key(FactId, SubjectKey) :-
    kb_entity(FactId, fact, Props),
    memberchk(fact_kind=KindRaw, Props),
    normalize_term_atom(KindRaw, Kind),
    Kind = subject,
    memberchk(subject_key=SubjectRaw, Props),
    normalize_term_atom(SubjectRaw, SubjectKey).

%% fact_property_tuple(+FactId, -Subject, -Property, -Op, -ValType, -Value, -Unit, -Scope, -Polarity)
% Extract typed property_value fact properties with defaults.
fact_property_tuple(FactId, Subject, Property, Op, ValType, Value, Unit, Scope, Polarity) :-
    kb_entity(FactId, fact, Props),
    memberchk(fact_kind=KindRaw, Props),
    normalize_term_atom(KindRaw, Kind),
    Kind = property_value,
    memberchk(subject_key=SubjectRaw, Props),
    normalize_term_atom(SubjectRaw, Subject),
    memberchk(property_key=PropertyRaw, Props),
    normalize_term_atom(PropertyRaw, Property),
    ( memberchk(operator=OpRaw, Props) -> normalize_term_atom(OpRaw, Op) ; Op = eq ),
    ( memberchk(value_type=ValTypeRaw, Props) -> normalize_term_atom(ValTypeRaw, ValType) ; ValType = string ),
    value_from_props(Props, ValType, Value),
    ( memberchk(unit=UnitRaw, Props) -> normalize_term_atom(UnitRaw, Unit) ; Unit = '' ),
    ( memberchk(scope=ScopeRaw, Props) -> normalize_term_atom(ScopeRaw, Scope) ; Scope = '' ),
    ( memberchk(polarity=PolarityRaw, Props) -> normalize_term_atom(PolarityRaw, Polarity) ; Polarity = require ).

%% predicate_schema(+FactId, -Namespace, -Name, -Arity, -ArgumentNames, -ArgumentTypes)
% Read one project-local ontology predicate schema fact.
predicate_schema(FactId, Namespace, Name, Arity, ArgumentNames, ArgumentTypes) :-
    kb_entity(FactId, fact, Props),
    memberchk(fact_kind=KindRaw, Props),
    normalize_term_atom(KindRaw, predicate_schema),
    memberchk(predicate_name=NameRaw, Props),
    normalize_term_atom(NameRaw, Name),
    ( memberchk(predicate_namespace=NamespaceRaw, Props) -> normalize_term_atom(NamespaceRaw, Namespace) ; Namespace = default ),
    memberchk(predicate_arity=ArityRaw, Props),
    normalize_term_integer(ArityRaw, Arity),
    memberchk(argument_names=ArgumentNamesRaw, Props),
    normalize_term_atom_list(ArgumentNamesRaw, ArgumentNames),
    memberchk(argument_types=ArgumentTypesRaw, Props),
    normalize_term_atom_list(ArgumentTypesRaw, ArgumentTypes).

%% predicate_fact(+FactId, -Namespace, -Name, -Args, -Polarity)
% Read one ground ontology predicate fact.
predicate_fact(FactId, Namespace, Name, Args, Polarity) :-
    kb_entity(FactId, fact, Props),
    memberchk(fact_kind=KindRaw, Props),
    normalize_term_atom(KindRaw, predicate),
    memberchk(predicate_name=NameRaw, Props),
    normalize_term_atom(NameRaw, Name),
    ( memberchk(predicate_namespace=NamespaceRaw, Props) -> normalize_term_atom(NamespaceRaw, Namespace) ; Namespace = default ),
    memberchk(predicate_args=ArgsRaw, Props),
    normalize_term_atom_list(ArgsRaw, Args),
    ( memberchk(polarity=PolarityRaw, Props) -> normalize_term_atom(PolarityRaw, Polarity) ; Polarity = assert ).

normalize_term_atom_list(List, Atoms) :-
    is_list(List),
    !,
    maplist(normalize_term_atom, List, Atoms).
normalize_term_atom_list(Raw, Atoms) :-
    unwrap_rdf_value(Raw, Value),
    is_list(Value),
    !,
    maplist(normalize_term_atom, Value, Atoms).

normalize_term_integer(Raw, Integer) :-
    unwrap_rdf_value(Raw, Value),
    (   integer(Value)
    ->  Integer = Value
    ;   atom(Value)
    ->  atom_number(Value, Integer)
    ;   string(Value)
    ->  number_string(Integer, Value)
    ;   Value = ^^(Nested, _Type)
    ->  normalize_term_integer(Nested, Integer)
    ).

%% fact_valid_interval(+FactId, -ValidFrom, -ValidTo)
% Extract optional validity bounds for property_value facts.
fact_valid_interval(FactId, ValidFrom, ValidTo) :-
    kb_entity(FactId, fact, Props),
    ( memberchk(valid_from=FromRaw, Props) -> normalize_term_atom(FromRaw, ValidFrom) ; ValidFrom = '' ),
    ( memberchk(valid_to=ToRaw, Props) -> normalize_term_atom(ToRaw, ValidTo) ; ValidTo = '' ).

%% effective_req_property(+ReqId, -SubjectKey, -PropertyKey, -Operator, -ValueType, -Value, -Unit, -Scope, -Polarity)
% Effective strict property constraint for a current requirement.
effective_req_property(ReqId, SubjectKey, PropertyKey, Operator, ValueType, Value, Unit, Scope, Polarity) :-
    effective_req_property_fact(ReqId, SubjectKey, _FactId, PropertyKey, Operator, ValueType, Value, Unit, Scope, Polarity, _ValidFrom, _ValidTo).

%% effective_req_property_fact(+ReqId, -SubjectKey, -FactId, -PropertyKey, -Operator, -ValueType, -Value, -Unit, -Scope, -Polarity, -ValidFrom, -ValidTo)
% Internal helper retaining the source property fact and validity window.
effective_req_property_fact(ReqId, SubjectKey, FactId, PropertyKey, Operator, ValueType, Value, Unit, Scope, Polarity, ValidFrom, ValidTo) :-
    kb_relationship(constrains, ReqId, SubjectFactId),
    fact_subject_key(SubjectFactId, SubjectKey),
    kb_relationship(requires_property, ReqId, FactId),
    fact_property_tuple(FactId, PropertySubjectKey, PropertyKey, Operator, ValueType, Value, Unit, Scope, Polarity),
    PropertySubjectKey = SubjectKey,
    fact_valid_interval(FactId, ValidFrom, ValidTo).

%% value_from_props(+Props, +ValType, -Value)
% Extract the appropriate value field based on value_type.
% Handles RDF literal values (^^(Value, Type)) by unwrapping them.
value_from_props(Props, string, Value) :- memberchk(value_string=ValueRaw, Props), !, unwrap_rdf_value(ValueRaw, Value).
value_from_props(Props, int, Value) :- memberchk(value_int=ValueRaw, Props), !, unwrap_rdf_value(ValueRaw, Value).
value_from_props(Props, number, Value) :- memberchk(value_number=ValueRaw, Props), !, unwrap_rdf_value(ValueRaw, Value).
value_from_props(Props, bool, Value) :- memberchk(value_bool=ValueRaw, Props), !, unwrap_rdf_value(ValueRaw, Value).
value_from_props(_, _, '').

%% unwrap_rdf_value(+Raw, -Value)
% Unwrap RDF literal ^^(Value, Type) to raw value.
unwrap_rdf_value(^^(Value, _Type), Value) :- !.
unwrap_rdf_value(Value, Value).

%% polarity_conflict(..., -Reason)
% Detect require vs forbid only when the rest of the normalized tuple matches.
polarity_conflict(Subject, Property, OpA, TypeA, ValA, UnitA, ScopeA, require,
                  OpB, TypeB, ValB, UnitB, ScopeB, forbid, Reason) :-
    compatible_types(TypeA, TypeB),
    unit_compatible(UnitA, UnitB),
    scope_intersects(ScopeA, ScopeB),
    OpA == OpB,
    same_value(TypeA, ValA, TypeB, ValB),
    !,
    format(atom(Reason), 'Polarity conflict on ~w.~w: ~w ~w vs forbid', [Subject, Property, OpA, ValA]).
polarity_conflict(Subject, Property, OpA, TypeA, ValA, UnitA, ScopeA, forbid,
                  OpB, TypeB, ValB, UnitB, ScopeB, require, Reason) :-
    compatible_types(TypeA, TypeB),
    unit_compatible(UnitA, UnitB),
    scope_intersects(ScopeA, ScopeB),
    OpA == OpB,
    same_value(TypeA, ValA, TypeB, ValB),
    !,
    format(atom(Reason), 'Polarity conflict on ~w.~w: forbid vs ~w ~w', [Subject, Property, OpB, ValB]).

%% property_conflict(..., -Reason)
% Detect value conflicts between two property constraints on the same subject/property.
property_conflict(Subject, Property, OpA, TypeA, ValA, UnitA, Polarity,
                  OpB, TypeB, ValB, UnitB, Polarity, Reason) :-
    unit_compatible(UnitA, UnitB),
    compatible_types(TypeA, TypeB),
    values_conflict(OpA, ValA, OpB, ValB, TypeA),
    format(atom(Reason), 'Value conflict on ~w.~w: ~w ~w vs ~w ~w', [Subject, Property, OpA, ValA, OpB, ValB]).

%% compatible_types(+TypeA, +TypeB)
% Types are compatible if they are the same or both numeric.
compatible_types(T, T) :- !.
compatible_types(int, number) :- !.
compatible_types(number, int) :- !.

%% unit_compatible(+UnitA, +UnitB)
% Units are compatible when equal or when one side is unspecified.
unit_compatible('', _) :- !.
unit_compatible(_, '') :- !.
unit_compatible(Unit, Unit).

%% scope_intersects(+ScopeA, +ScopeB)
% Scopes intersect when equal or when one side is unspecified.
scope_intersects('', _) :- !.
scope_intersects(_, '') :- !.
scope_intersects(Scope, Scope).

%% intervals_overlap(+FromA, +ToA, +FromB, +ToB)
% Validity windows overlap unless one ends strictly before the other begins.
intervals_overlap(FromA, ToA, FromB, ToB) :-
    \+ interval_ends_before(ToA, FromB),
    \+ interval_ends_before(ToB, FromA).

interval_ends_before('', _) :-
    fail.
interval_ends_before(_, '') :-
    fail.
interval_ends_before(To, From) :-
    To @< From.

%% same_value(+TypeA, +ValA, +TypeB, +ValB)
% Compare scalar values with numeric coercion for int/number pairs.
same_value(TypeA, ValA, TypeB, ValB) :-
    (   is_numeric_type(TypeA),
        is_numeric_type(TypeB)
    ->  ValA =:= ValB
    ;   ValA == ValB
    ).

%% values_conflict(+OpA, +ValA, +OpB, +ValB, +Type)
% Detect specific value conflicts based on operators and types.

% Exact value conflict: eq X vs eq Y where X \= Y
values_conflict(eq, ValA, eq, ValB, Type) :-
    \+ same_value(Type, ValA, Type, ValB).

% Eq/neq conflict on the same scalar value.
values_conflict(eq, ValA, neq, ValB, Type) :-
    same_value(Type, ValA, Type, ValB).
values_conflict(neq, ValA, eq, ValB, Type) :-
    same_value(Type, ValA, Type, ValB).

% Numeric gap conflict: lte X vs gte Y where X < Y
values_conflict(lte, ValA, gte, ValB, Type) :-
    is_numeric_type(Type),
    ValA < ValB.
values_conflict(gte, ValB, lte, ValA, Type) :-
    is_numeric_type(Type),
    ValA < ValB.

% Also catch lt/gt variants
values_conflict(lt, ValA, gt, ValB, Type) :-
    is_numeric_type(Type),
    ValA =< ValB.
values_conflict(gt, ValB, lt, ValA, Type) :-
    is_numeric_type(Type),
    ValA =< ValB.
values_conflict(lt, ValA, gte, ValB, Type) :-
    is_numeric_type(Type),
    ValA =< ValB.
values_conflict(gte, ValB, lt, ValA, Type) :-
    is_numeric_type(Type),
    ValA =< ValB.
values_conflict(lte, ValA, gt, ValB, Type) :-
    is_numeric_type(Type),
    ValA < ValB.
values_conflict(gt, ValB, lte, ValA, Type) :-
    is_numeric_type(Type),
    ValA < ValB.

%% is_numeric_type(+Type)
% True for numeric value types.
is_numeric_type(int).
is_numeric_type(number).

normalize_term_atom(Val^^_Type, Atom) :-
    !,
    normalize_term_atom(Val, Atom).
normalize_term_atom(literal(type(_, Val)), Atom) :-
    !,
    normalize_term_atom(Val, Atom).
normalize_term_atom(Val, Atom) :-
    string(Val),
    !,
    atom_string(ValAtom, Val),
    normalize_uri_atom(ValAtom, Atom).
normalize_term_atom(Val, Atom) :-
    atom(Val),
    !,
    normalize_uri_atom(Val, Atom).
normalize_term_atom(Val, Atom) :-
    term_string(Val, ValStr),
    atom_string(ValAtom, ValStr),
    normalize_uri_atom(ValAtom, Atom).

normalize_uri_atom(Value, Atom) :-
    (   sub_atom(Value, _, _, _, '/')
    ->  atomic_list_concat(Parts, '/', Value),
        last(Parts, Last),
        Atom = Last
    ;   Atom = Value
    ).

%% symbol_no_req_coverage(+Symbol, -Reason)
% Find symbols that lack canonical production requirement coverage.
symbol_no_req_coverage(Symbol, no_qualifying_production_coverage) :-
    production_symbol(Symbol),
    \+ production_symbol_covered_for_requirement(Symbol, _).

%% production_symbol_covered_for_requirement(+Symbol, +Req)
% Production coverage requires a covered_by edge and a canonical requirement/test path.
production_symbol_covered_for_requirement(Symbol, Req) :-
    production_symbol(Symbol),
    kb_relationship(covered_by, Symbol, Test),
    test_covers_requirement(Test, Req).

symbol_has_req_coverage(Symbol, Req) :-
    production_symbol_covered_for_requirement(Symbol, Req).

test_covers_requirement(Test, Req) :-
    requirement_verified_by_test(Req, Test),
    requirement_test_fallback_allowed(Req),
    test_satisfies_requirement_semantics(Test, Req).
test_covers_requirement(Test, Req) :-
    kb_relationship(specified_by, Req, Scenario),
    scenario_verified_by_test(Scenario, Test),
    test_satisfies_requirement_semantics(Test, Req).

%% production_symbol_untested(+Symbol)
% Production symbol with no covered_by test evidence at all.
production_symbol_untested(Symbol) :-
    production_symbol(Symbol),
    \+ kb_relationship(covered_by, Symbol, _).

% Helper predicate for readability - symbols with no traceability
symbol_uncovered(Symbol) :-
    production_symbol(Symbol),
    \+ production_symbol_covered_for_requirement(Symbol, _).


coerce_timestamp_atom(Val^^_Type, Atom) :-
    !,
    coerce_timestamp_atom(Val, Atom).
coerce_timestamp_atom(literal(type(_, Val)), Atom) :-
    !,
    coerce_timestamp_atom(Val, Atom).
coerce_timestamp_atom(Val, Atom) :-
    atom(Val),
    !,
    Atom = Val.
coerce_timestamp_atom(Val, Atom) :-
    string(Val),
    !,
    atom_string(Atom, Val).
coerce_timestamp_atom(Val, Atom) :-
    term_string(Val, Str),
    atom_string(Atom, Str).


%% Staged symbol traceability predicates
%% These support the pre-commit traceability gate feature

%% Dynamic declarations for overlay facts
:- dynamic changed_symbol/1.
:- dynamic changed_symbol_loc/5.
:- dynamic changed_symbol_req/2.

%% changed_symbol_missing_req(+Symbol, +MinLinks, -Count)
% True if Symbol has fewer than MinLinks requirement connections.
% changed_symbol_req/2 overlay facts (from code-comment directives) are also
% counted so that `// implements: REQ-001` can satisfy the gate.
changed_symbol_missing_req(Symbol, MinLinks, Count) :-
    changed_symbol(Symbol),
    \+ executable_test_symbol(Symbol),
    (   setof(Req, symbol_owns_requirement(Symbol, Req), KbReqs)
    ->  true
    ;   KbReqs = []
    ),
    (   setof(Req, changed_symbol_req(Symbol, Req), OverlayReqs)
    ->  true
    ;   OverlayReqs = []
    ),
    append(KbReqs, OverlayReqs, AllReqs),
    sort(AllReqs, UniqueReqs),
    length(UniqueReqs, Count),
    Count < MinLinks.

%% changed_symbol_violation(+Symbol, +MinLinks, -Count, -File, -Line, -Col, -Name)
% Full violation record for a changed symbol missing requirements.
changed_symbol_violation(Symbol, MinLinks, Count, File, Line, Col, Name) :-
    changed_symbol_missing_req(Symbol, MinLinks, Count),
    (   changed_symbol_loc(Symbol, FileRaw, Line, Col, NameRaw)
    ->  File = FileRaw, Name = NameRaw
    ;   File = '', Line = 0, Col = 0, Name = ''
    ).

%% check_req_contradiction(+ReqId)
% Validates that a requirement has no contradictions with current requirements.
% Called within a transaction after asserting entity and relationships.
% Throws error(kb_contradiction(Details)) if contradictions are found.
% implements REQ-011
% This predicate first checks if the new requirement supersedes the specific
% conflicting requirement(s). Only direct supersedes edges from the new req
% to the conflicting req allow the write - unrelated supersedes edges do not
% mask conflicts.
check_req_contradiction(ReqId) :-
    % Collect all contradictions involving this requirement
    findall(Reason-OtherReq, (
        contradicting_reqs(ReqId, OtherReq, Reason)
    ;   contradicting_reqs(OtherReq, ReqId, Reason)
    ), AllPairs),
    AllPairs \= [],
    !,
    % Filter out contradictions where ReqId directly supersedes the conflicting requirement
    % Only the specific supersedes edge from new req -> conflicting req allows the write
    exclude(superseded_by_contradiction(ReqId), AllPairs, ValidPairs),
    ValidPairs \= [],
    !,
    % Build actionable error message
    build_contradiction_message(ReqId, ValidPairs, Message),
    throw(error(kb_contradiction(ValidPairs), Message)).
check_req_contradiction(_) :-
    % No contradictions found
    true.

%% supersedes_mask(+ReqId, +Reason-OtherReq)
% True when ReqId supersedes OtherReq, meaning this specific contradiction is allowed.
% Only direct supersedes edges from the new requirement to the conflicting
% requirement mask the conflict - unrelated supersedes edges do not.
% implements REQ-011
superseded_by_contradiction(ReqId, _-OtherReq) :-
    kb_relationship(supersedes, ReqId, OtherReq).

%% build_contradiction_message(+ReqId, +Pairs, -Message)
% Build an actionable error message for contradictions.
% Message includes conflicting req IDs, subject/property details, and remediation hints.
% implements REQ-011
build_contradiction_message(ReqId, Pairs, Message) :-
    format(atom(Header), 'Contradiction detected for requirement ~w:', [ReqId]),
    build_contradiction_details(Pairs, Details),
    Remedy = '\n\nTo resolve:\n  1. Add a supersedes relationship from the new requirement to the conflicting one, OR\n  2. Deprecate the conflicting requirement before creating the new one.',
    atom_concat(Header, Details, Temp),
    atom_concat(Temp, Remedy, Message).

build_contradiction_details([], '').
build_contradiction_details([Reason-OtherReq|Rest], Details) :-
    format(atom(Line), '\n  - Conflicts with ~w: ~w', [OtherReq, Reason]),
    build_contradiction_details(Rest, RestDetails),
    atom_concat(Line, RestDetails, Details).
