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
    snapshot_id(SnapshotId),
    synced_at(DataFile, SyncedAt),
    freshness_state(DataFile, Dirty, SyncState),
    StatusDict = _{
        branch: Branch,
        snapshotId: SnapshotId,
        syncedAt: SyncedAt,
        dirty: Dirty,
        syncState: SyncState,
        kbPath: KbPath,
        lastSyncSource: persisted
    }.

attached_kb_info(Branch, KbPath, DataFile) :-
    kb:kb_attached(KbPath),
    branch_workspace_from_kb_path(KbPath, Branch, _WorkspaceRoot),
    directory_file_path(KbPath, 'kb.rdf', DataFile).

snapshot_id(SnapshotId) :-
    kb:kb_attached_snapshot(stamp(MTime, Size)),
    !,
    format(atom(SnapshotId), 'stamp:~16f:~w', [MTime, Size]).
snapshot_id(SnapshotId) :-
    kb:kb_attached_snapshot(missing),
    !,
    SnapshotId = missing.
snapshot_id(unknown).

synced_at(DataFile, SyncedAt) :-
    exists_file(DataFile),
    !,
    time_file(DataFile, Timestamp),
    format_time(atom(SyncedAt), '%FT%TZ', Timestamp).
synced_at(_, @(null)).

freshness_state(DataFile, true, stale) :-
    exists_file(DataFile),
    time_file(DataFile, SnapshotTime),
    workspace_state_changed(SnapshotTime),
    !.
freshness_state(DataFile, false, fresh) :-
    exists_file(DataFile),
    !.
freshness_state(_, true, unknown).

workspace_state_changed(SnapshotTime) :-
    workspace_source_changed(SnapshotTime),
    !.
workspace_state_changed(SnapshotTime) :-
    documentation_tree_changed(SnapshotTime),
    !.

workspace_source_changed(SnapshotTime) :-
    attached_workspace_root(WorkspaceRoot),
    kb_entity(_, _, Props),
    memberchk(source=SourceValue, Props),
    source_value_atom(SourceValue, SourceAtom),
    repo_relative_source(SourceAtom, RelativeSource),
    directory_file_path(WorkspaceRoot, RelativeSource, SourcePath),
    (   exists_file(SourcePath)
    ->  time_file(SourcePath, FileTime),
        FileTime > SnapshotTime
    ;   true
    ),
    !.

documentation_tree_changed(SnapshotTime) :-
    attached_workspace_root(WorkspaceRoot),
    documentation_markdown_untracked(WorkspaceRoot),
    !.
documentation_tree_changed(SnapshotTime) :-
    attached_workspace_root(WorkspaceRoot),
    directory_file_path(WorkspaceRoot, 'documentation', DocumentationRoot),
    exists_directory(DocumentationRoot),
    directory_tree_newer(DocumentationRoot, SnapshotTime),
    !.

documentation_markdown_untracked(WorkspaceRoot) :-
    directory_file_path(WorkspaceRoot, 'documentation', DocumentationRoot),
    exists_directory(DocumentationRoot),
    documentation_markdown_file(DocumentationRoot, FilePath),
    path_relative_to_workspace(WorkspaceRoot, FilePath, RelativePath),
    \+ known_source_path(RelativePath),
    !.

documentation_markdown_file(Path, Path) :-
    exists_file(Path),
    file_name_extension(_, md, Path),
    !.
documentation_markdown_file(Path, FilePath) :-
    exists_directory(Path),
    directory_files(Path, Entries),
    member(Entry, Entries),
    Entry \= '.',
    Entry \= '..',
    directory_file_path(Path, Entry, ChildPath),
    documentation_markdown_file(ChildPath, FilePath).

path_relative_to_workspace(WorkspaceRoot, FilePath, RelativePath) :-
    atom_concat(WorkspaceRoot, '/', Prefix),
    atom_concat(Prefix, RelativePath, FilePath).

known_source_path(RelativePath) :-
    kb_entity(_, _, Props),
    memberchk(source=SourceValue, Props),
    source_value_atom(SourceValue, SourceAtom),
    repo_relative_source(SourceAtom, RelativePath).

directory_tree_newer(Path, SnapshotTime) :-
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
    (   attached_workspace_root(WorkspaceRoot),
        workspace_relative_path(WorkspaceRoot, NoFragment, RelativePath)
    ->  RelativeSource = RelativePath
    ;   RelativeSource = NoFragment
    ).

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

dict_json_string(Dict, JsonString) :-
    with_output_to(string(JsonString), json_write_dict(current_output, Dict, [])).
