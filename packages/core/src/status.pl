% Module: status
% Curated KB status and freshness reporting for MCP and CLI surfaces.

:- module(status, [
    kb_status_json/1,
    status_meta_dict/1
]).

:- use_module(library(http/json)).
:- use_module('kb.pl').

kb_status_json(JsonString) :-
    status_meta_dict(StatusDict),
    dict_json_string(StatusDict, JsonString).

status_meta_dict(StatusDict) :-
    attached_kb_info(Branch, KbPath, DataFile),
    !,
    snapshot_id(SnapshotId),
    synced_at(DataFile, SyncedAt),
    freshness_state(DataFile, Dirty, SyncState),
    stale_reasons(StaleReasons, StaleReasonCount, StaleReasonsTruncated),
    StatusDict = _{
        branch: Branch,
        snapshotId: SnapshotId,
        syncedAt: SyncedAt,
        dirty: Dirty,
        syncState: SyncState,
        staleReasons: StaleReasons,
        staleReasonCount: StaleReasonCount,
        staleReasonsTruncated: StaleReasonsTruncated,
        kbPath: KbPath,
        lastSyncSource: persisted
    }.
status_meta_dict(StatusDict) :-
    % Fallback for non-standard KB paths (e.g. temp dirs in tests)
    ( kb:kb_attached(KbPath) -> true ; KbPath = unknown ),
    StatusDict = _{
        branch: unknown,
        snapshotId: unknown,
        syncedAt: null,
        dirty: false,
        syncState: unknown,
        staleReasons: [],
        staleReasonCount: 0,
        staleReasonsTruncated: false,
        kbPath: KbPath,
        lastSyncSource: unknown
    }.

attached_kb_info(Branch, KbPath, DataFile) :-
    kb:kb_attached(KbPath),
    branch_workspace_from_kb_path(KbPath, Branch, _WorkspaceRoot),
    kb:kb_storage_mode(journaled),
    !,
    directory_file_path(KbPath, 'CURRENT', DataFile).
attached_kb_info(Branch, KbPath, DataFile) :-
    kb:kb_attached(KbPath),
    branch_workspace_from_kb_path(KbPath, Branch, _WorkspaceRoot),
    directory_file_path(KbPath, 'kb.rdf', DataFile).

snapshot_id(SnapshotId) :-
    kb:kb_attached_snapshot(journal_snapshot(_Generation, Sequence)),
    Sequence =:= 0,
    !,
    SnapshotId = missing.
snapshot_id(SnapshotId) :-
    kb:kb_attached_snapshot(journal_snapshot(Generation, Sequence)),
    !,
    format(atom(SnapshotId), '~w:~w', [Generation, Sequence]).
snapshot_id(SnapshotId) :-
    kb:kb_attached_snapshot(stamp(MTime, Size)),
    !,
    format(atom(SnapshotId), 'stamp:~16f:~w', [MTime, Size]).
snapshot_id(SnapshotId) :-
    kb:kb_attached_snapshot(missing),
    !,
    SnapshotId = missing.
snapshot_id(unknown).

journal_before_first_commit :-
    kb:kb_storage_mode(journaled),
    kb:kb_attached_snapshot(journal_snapshot(_, 0)),
    !.

synced_at(_, null) :-
    journal_before_first_commit,
    !.
synced_at(DataFile, SyncedAt) :-
    exists_file(DataFile),
    !,
    time_file(DataFile, Timestamp),
    format_time(atom(SyncedAt), '%FT%TZ', Timestamp).
% Before the first successful sync there is no kb.rdf, so the public JSON contract must expose syncedAt: null.
synced_at(_, null).

journal_before_first_commit_state(true, unknown) :-
    journal_before_first_commit,
    !.

freshness_state(_, Dirty, State) :-
    journal_before_first_commit_state(Dirty, State),
    !.
freshness_state(DataFile, true, stale) :-
    exists_file(DataFile),
    time_file(DataFile, SnapshotTime),
    workspace_state_changed(SnapshotTime),
    !.
freshness_state(DataFile, false, fresh) :-
    exists_file(DataFile),
    !.
freshness_state(_, true, unknown).

stale_reasons(Reasons, Count, Truncated) :-
    findall(Reason, stale_indexed_source_reason(Reason), IndexedReasons),
    findall(Reason, stale_knowledge_lane_reason(Reason), KnowledgeReasons),
    findall(Reason, stale_documentation_reason(Reason), DocumentationReasons),
    append(IndexedReasons, KnowledgeReasons, IndexedAndKnowledge),
    append(IndexedAndKnowledge, DocumentationReasons, Reasons0),
    sort(Reasons0, Sorted),
    length(Sorted, Count),
    (   Count > 200
    ->  length(Reasons, 200), append(Reasons, _, Sorted), Truncated = true
    ;   Reasons = Sorted, Truncated = false
    ).

stale_indexed_source_reason(Reason) :-
    attached_workspace_root(WorkspaceRoot),
    kb:kb_indexed_sources(Sources),
    member(SourceAtom, Sources),
    repo_relative_source(SourceAtom, RelativeSource),
    directory_file_path(WorkspaceRoot, RelativeSource, SourcePath),
    (   exists_file(SourcePath)
    ->  time_file(SourcePath, FileTime),
        kb_snapshot_time(SnapshotTime),
        FileTime > SnapshotTime,
        Code = indexed_source_newer
    ;   exists_directory(SourcePath)
    ->  fail
    ;   Code = indexed_source_missing
    ),
    entity_ids_for_source(RelativeSource, EntityIds),
    Reason = _{code: Code, path: RelativeSource, entityIds: EntityIds}.

stale_knowledge_lane_reason(Reason) :-
    attached_workspace_root(WorkspaceRoot),
    knowledge_lane(Lane),
    directory_file_path(WorkspaceRoot, '.kb', KbRoot),
    directory_file_path(KbRoot, Lane, LaneRoot),
    exists_directory(LaneRoot),
    kb_snapshot_time(SnapshotTime),
    directory_tree_newer_path(LaneRoot, SnapshotTime, Path),
    workspace_relative_path(WorkspaceRoot, Path, RelativePath),
    entity_ids_for_source(RelativePath, EntityIds),
    Reason = _{code: knowledge_source_newer, path: RelativePath, entityIds: EntityIds}.

stale_documentation_reason(Reason) :-
    attached_workspace_root(WorkspaceRoot),
    directory_file_path(WorkspaceRoot, 'documentation', DocumentationRoot),
    exists_directory(DocumentationRoot),
    kb_snapshot_time(SnapshotTime),
    directory_tree_newer_path(DocumentationRoot, SnapshotTime, Path),
    workspace_relative_path(WorkspaceRoot, Path, RelativePath),
    entity_ids_for_source(RelativePath, EntityIds),
    Reason = _{code: documentation_source_newer, path: RelativePath, entityIds: EntityIds}.

kb_snapshot_time(SnapshotTime) :-
    kb:kb_attached(KbPath),
    (   directory_file_path(KbPath, 'CURRENT', DataFile), exists_file(DataFile)
    ->  time_file(DataFile, SnapshotTime)
    ;   directory_file_path(KbPath, 'kb.rdf', DataFile), exists_file(DataFile)
    ->  time_file(DataFile, SnapshotTime)
    ;   SnapshotTime = 0
    ).

entity_ids_for_source(RelativeSource, EntityIds) :-
    findall(Id,
        (kb_entity(Id, _Type, Props),
         entity_source_property(Props, RawSource),
         source_value_atom(RawSource, SourceAtom),
         repo_relative_source(SourceAtom, RelativeSource),
         Id \= '') ,
        Ids0),
    sort(Ids0, EntityIds).

entity_source_property(Props, RawSource) :-
    memberchk(sourceFile=RawSource, Props),
    !.
entity_source_property(Props, RawSource) :-
    memberchk(source=RawSource, Props).

workspace_state_changed(SnapshotTime) :-
    workspace_source_changed(SnapshotTime),
    !.
workspace_state_changed(SnapshotTime) :-
    knowledge_lane_tree_changed(SnapshotTime),
    !.
workspace_state_changed(SnapshotTime) :-
    documentation_tree_changed(SnapshotTime),
    !.

workspace_source_changed(SnapshotTime) :-
    attached_workspace_root(WorkspaceRoot),
    kb:kb_indexed_sources(Sources),
    member(SourceAtom, Sources),
    repo_relative_source(SourceAtom, RelativeSource),
    directory_file_path(WorkspaceRoot, RelativeSource, SourcePath),
    (   exists_file(SourcePath)
    ->  time_file(SourcePath, FileTime),
        FileTime > SnapshotTime
    ;   exists_directory(SourcePath)
    ->  fail
    ;   true
    ),
    !.

knowledge_lane_tree_changed(SnapshotTime) :-
    attached_workspace_root(WorkspaceRoot),
    knowledge_lane(Lane),
    directory_file_path(WorkspaceRoot, '.kb', KbRoot),
    directory_file_path(KbRoot, Lane, LaneRoot),
    exists_directory(LaneRoot),
    directory_tree_newer(LaneRoot, SnapshotTime),
    !.

documentation_tree_changed(SnapshotTime) :-
    attached_workspace_root(WorkspaceRoot),
    directory_file_path(WorkspaceRoot, 'documentation', DocumentationRoot),
    exists_directory(DocumentationRoot),
    directory_tree_newer(DocumentationRoot, SnapshotTime),
    !.

directory_tree_newer(Path, SnapshotTime) :-
    exists_file(Path),
    entity_documentation_file(Path),
    \+ ignored_documentation_file(Path),
    time_file(Path, EntryTime),
    EntryTime > SnapshotTime,
    !.

directory_tree_newer(Path, SnapshotTime) :-
    exists_directory(Path),
    directory_files(Path, Entries),
    member(Entry, Entries),
    Entry \= '.',
    Entry \= '..',
    directory_file_path(Path, Entry, ChildPath),
    directory_tree_newer(ChildPath, SnapshotTime),
    !.

directory_tree_newer_path(Path, SnapshotTime, Path) :-
    exists_file(Path),
    entity_documentation_file(Path),
    \+ ignored_documentation_file(Path),
    time_file(Path, EntryTime),
    EntryTime > SnapshotTime.
directory_tree_newer_path(Path, SnapshotTime, ChildPath) :-
    exists_directory(Path),
    directory_files(Path, Entries),
    member(Entry, Entries),
    Entry \= '.',
    Entry \= '..',
    directory_file_path(Path, Entry, Candidate),
    directory_tree_newer_path(Candidate, SnapshotTime, ChildPath).

attached_workspace_root(WorkspaceRoot) :-
    kb:kb_attached(KbPath),
    branch_workspace_from_kb_path(KbPath, _Branch, WorkspaceRoot).

branch_workspace_from_kb_path(KbPath, Branch, WorkspaceRoot) :-
    branch_path_segments(KbPath, BranchesDir, Segments),
    file_directory_name(BranchesDir, KbRoot),
    file_directory_name(KbRoot, WorkspaceRoot),
    atomic_list_concat(Segments, '/', Branch).

branch_path_segments(KbPath, BranchesDir, [Base]) :-
    file_directory_name(KbPath, BranchesDir),
    file_base_name(BranchesDir, branches),
    file_base_name(KbPath, Base).
branch_path_segments(KbPath, BranchesDir, Segments) :-
    file_directory_name(KbPath, Parent),
    Parent \= KbPath,
    branch_path_segments(Parent, BranchesDir, ParentSegments),
    file_base_name(KbPath, Base),
    append(ParentSegments, [Base], Segments).

repo_relative_source(SourceAtom, RelativeSource) :-
    strip_fragment(SourceAtom, NoFragment),
    \+ sub_atom(NoFragment, _, _, _, '://'),
    source_path_candidate(NoFragment),
    (   attached_workspace_root(WorkspaceRoot),
        workspace_relative_path(WorkspaceRoot, NoFragment, RelativePath)
    ->  RelativeSource = RelativePath
    ;   RelativeSource = NoFragment
    ).

source_path_candidate(Source) :-
    sub_atom(Source, _, _, _, '/'),
    !.
source_path_candidate(Source) :-
    file_name_extension(_, Extension, Source),
    Extension \= ''.

workspace_relative_path(WorkspaceRoot, SourcePath, RelativePath) :-
    atom_concat(WorkspaceRoot, '/', Prefix),
    atom_concat(Prefix, RelativePath, SourcePath).

strip_fragment(SourceAtom, NoFragment) :-
    (   sub_atom(SourceAtom, Before, _, _, '#')
    ->  sub_atom(SourceAtom, 0, Before, _, NoFragment)
    ;   NoFragment = SourceAtom
    ).

source_value_atom(Val, Atom) :-
    nonvar(Val),
    compound(Val),
    Val =.. ['^^', Inner, _Type],
    !,
    source_value_atom(Inner, Atom).
source_value_atom(literal(type(_, Val)), Atom) :-
    !,
    source_value_atom(Val, Atom).
source_value_atom(Val, Atom) :-
    string(Val),
    !,
    atom_string(Atom, Val).
source_value_atom(Val, Atom) :-
    atom(Val),
    !,
    Atom = Val.
source_value_atom(Val, Atom) :-
    term_string(Val, Str),
    atom_string(Atom, Str).

knowledge_lane(requirements).
knowledge_lane(scenarios).
knowledge_lane(tests).
knowledge_lane(facts).
knowledge_lane(adr).
knowledge_lane(flags).
knowledge_lane(events).

ignored_documentation_file(Path) :-
    file_base_name(Path, 'README.md').
ignored_documentation_file(Path) :-
    sub_atom(Path, _, _, _, '/tests/e2e/').
ignored_documentation_file(Path) :-
    sub_atom(Path, _, _, _, '/tests/benchmarks/').

entity_documentation_file(Path) :-
    read_file_to_string(Path, Content, []),
    sub_string(Content, 0, 3, _, "---"),
    sub_string(Content, _, _, _, "id:"),
    sub_string(Content, _, _, _, "title:"),
    sub_string(Content, _, _, _, "status:").

dict_json_string(Dict, JsonString) :-
    with_output_to(string(JsonString), json_write_dict(current_output, Dict, [])).
