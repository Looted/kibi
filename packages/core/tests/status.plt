:- use_module(library(plunit)).
:- use_module(library(filesex)).
:- use_module(library(http/json)).
:- use_module(library(semweb/rdf_db)).
:- use_module('../src/kb.pl').
:- use_module('../src/status.pl').
:- use_module(test_helpers).
:- use_module(kb_fixture, [detach_leftover_kb/0]).

% Each test attaches a fresh legacy store at <Root>/.kb/branches/<Branch>
% in a temporary workspace and sets file times explicitly: the snapshot
% file (kb.rdf, or CURRENT for a journaled store) is written at T0 and the
% workspace files before, at or after it.

t0(1700000000.0).

at(Offset, Time) :-
    t0(T0),
    Time is T0 + Offset.

workspace(Branch, Root, Kb) :-
    tmp_file(kibi_status_ws, Root),
    atomic_list_concat([Root, '/.kb/branches/', Branch], Kb),
    make_directory_path(Kb),
    detach_leftover_kb,
    kb_attach(Kb).

workspace(Root, Kb) :-
    workspace(main, Root, Kb).

drop_workspace(Root) :-
    restore_legacy_mode,
    kb_detach,
    delete_directory_and_contents(Root).

restore_legacy_mode :-
    retractall(kb:kb_storage_mode(_)),
    assertz(kb:kb_storage_mode(legacy)).

journaled_mode :-
    retractall(kb:kb_storage_mode(_)),
    assertz(kb:kb_storage_mode(journaled)).

snapshot(Snapshot) :-
    retractall(kb:kb_attached_snapshot(_)),
    assertz(kb:kb_attached_snapshot(Snapshot)).

%% file_at(+Dir, +Relative, +Content, +Offset)
file_at(Dir, Relative, Content, Offset) :-
    at(Offset, Time),
    file_at_time(Dir, Relative, Content, Time).

file_at_time(Dir, Relative, Content, Time) :-
    directory_file_path(Dir, Relative, Path),
    file_directory_name(Path, Parent),
    make_directory_path(Parent),
    setup_call_cleanup(open(Path, write, Out), write(Out, Content), close(Out)),
    set_time_file(Path, _, [modified(Time)]).

dir_at(Dir, Relative) :-
    directory_file_path(Dir, Relative, Path),
    make_directory_path(Path).

entity_doc("---\nid: X\ntitle: X\nstatus: open\n---\n").

doc_at(Root, Relative, Offset) :-
    entity_doc(Doc),
    file_at(Root, Relative, Doc, Offset).

snapshot_file(Kb, Name, Offset) :-
    file_at(Kb, Name, "", Offset).

% Without kb.rdf the store is not fresh, and every file is newer than the
% snapshot, so the stale reasons are listed.
without_snapshot_file(Kb) :-
    directory_file_path(Kb, 'kb.rdf', Path),
    delete_file(Path).

source_entity(Id, Source) :-
    source_entity(Id, Source, []).

source_entity(Id, Source, Extra) :-
    append([ [ id=Id, title="Status fixture", status=active,
               created_at="2026-05-01T00:00:00Z", updated_at="2026-05-01T00:00:00Z",
               source=Source
             ], Extra ], Props),
    kb_assert_entity(req, Props).

% The status and scope dicts, each a single answer.
status_dict(Dict) :-
    first_answer_is_last(status_meta_dict(Dict)).

scope_dict(Scope) :-
    first_answer_is_last(status_scope_dict(Scope)).

meta(Key, Value) :-
    status_dict(Dict),
    get_dict(Key, Dict, Value).

reasons(Reasons) :-
    status_dict(Dict),
    Reasons0 = Dict.staleReasons,
    maplist(reason_term, Reasons0, Reasons).

% The reasons, in any order: status sorts them by the standard order of
% dicts, which follows the internal order of their keys.
expect_reasons(Expected) :-
    reasons(Actual0),
    msort(Actual0, Actual),
    (   Actual == Expected
    ->  true
    ;   format(user_error, "stale reasons: ~q~n", [Actual]),
        fail
    ).

reason_term(Dict, reason(Code, Path, Ids)) :-
    dict_pairs(Dict, _, Pairs),
    Pairs = [code-Code, entityIds-Ids, path-Path].

state(Dirty, State) :-
    status_dict(Dict),
    Dirty = Dict.dirty,
    State = Dict.syncState.

:- begin_tests(status_detached).

test(reports_unknown_when_no_kb_is_attached) :-
    \+ kb:kb_attached(_),
    status_dict(Dict),
    same(Dict, _{
        branch: unknown, snapshotId: unknown, syncedAt: null, dirty: false,
        syncState: unknown, staleReasons: [], staleReasonCount: 0,
        staleReasonsTruncated: false, kbPath: unknown, lastSyncSource: unknown
    }),
    scope_dict(Scope),
    same(Scope, _{snapshotId: unknown, syncedAt: null}).

test(status_json_is_the_meta_dict) :-
    kb_status_json(Json),
    string(Json),
    atom_json_dict(Json, Dict, []),
    Dict = _{
        branch: "unknown", snapshotId: "unknown", syncedAt: null, dirty: false,
        syncState: "unknown", staleReasons: [], staleReasonCount: 0,
        staleReasonsTruncated: false, kbPath: "unknown", lastSyncSource: "unknown"
    }.

test(a_store_outside_a_branches_directory_reports_only_its_path,
     [setup((tmp_file(kibi_status_plain, Dir), make_directory_path(Dir), detach_leftover_kb, kb_attach(Dir))),
      cleanup((kb_detach, delete_directory_and_contents(Dir)))]) :-
    snapshot_file(Dir, 'kb.rdf', 0),
    status_dict(Dict),
    same(Dict, _{
        branch: unknown, snapshotId: unknown, syncedAt: null, dirty: false,
        syncState: unknown, staleReasons: [], staleReasonCount: 0,
        staleReasonsTruncated: false, kbPath: Dir, lastSyncSource: unknown
    }),
    scope_dict(Scope),
    same(Scope, _{snapshotId: unknown, syncedAt: null}).

test(a_branches_directory_itself_is_not_a_branch_store,
     [setup((tmp_file(kibi_status_plain, Root),
             atom_concat(Root, '/.kb/branches', Dir),
             make_directory_path(Dir), detach_leftover_kb, kb_attach(Dir))),
      cleanup((kb_detach, delete_directory_and_contents(Root)))]) :-
    meta(branch, unknown),
    meta(kbPath, Dir).

:- end_tests(status_detached).

:- begin_tests(status_meta).

test(a_fresh_legacy_store, [setup(workspace(Root, Kb)), cleanup(drop_workspace(Root))]) :-
    snapshot_file(Kb, 'kb.rdf', 0),
    t0(T0),
    snapshot(stamp(T0, 42)),
    status_dict(Dict),
    same(Dict, _{
        branch: main, snapshotId: 'stamp:1700000000.0000000000000000:42',
        syncedAt: '2023-11-14T22:13:20Z', dirty: false, syncState: fresh,
        staleReasons: [], staleReasonCount: 0, staleReasonsTruncated: false,
        kbPath: Kb, lastSyncSource: persisted
    }),
    scope_dict(Scope),
    same(Scope, _{snapshotId: 'stamp:1700000000.0000000000000000:42', syncedAt: '2023-11-14T22:13:20Z'}).

test(a_legacy_store_before_its_first_save, [setup(workspace(Root, Kb)), cleanup(drop_workspace(Root))]) :-
    snapshot(missing),
    status_dict(Dict),
    same(Dict, _{
        branch: main, snapshotId: missing, syncedAt: null, dirty: true,
        syncState: unknown, staleReasons: [], staleReasonCount: 0,
        staleReasonsTruncated: false, kbPath: Kb, lastSyncSource: persisted
    }),
    scope_dict(Scope),
    same(Scope, _{snapshotId: missing, syncedAt: null}).

test(a_journaled_store_reads_current, [setup(workspace(Root, Kb)), cleanup(drop_workspace(Root))]) :-
    journaled_mode,
    snapshot(journal_snapshot(4, 7)),
    snapshot_file(Kb, 'CURRENT', 0),
    snapshot_file(Kb, 'kb.rdf', -3600),
    doc_at(Root, 'documentation/a.md', -10),
    status_dict(Dict),
    same(Dict, _{
        branch: main, snapshotId: '4:7', syncedAt: '2023-11-14T22:13:20Z',
        dirty: false, syncState: fresh, staleReasons: [], staleReasonCount: 0,
        staleReasonsTruncated: false, kbPath: Kb, lastSyncSource: persisted
    }),
    scope_dict(Scope),
    same(Scope, _{snapshotId: '4:7', syncedAt: '2023-11-14T22:13:20Z'}).

test(a_journaled_store_without_current_is_unknown, [setup(workspace(Root, Kb)), cleanup(drop_workspace(Root))]) :-
    journaled_mode,
    snapshot(journal_snapshot(4, 7)),
    snapshot_file(Kb, 'kb.rdf', 0),
    state(Dirty, State),
    Dirty-State == true-unknown,
    meta(syncedAt, null).

test(a_journaled_store_before_its_first_commit, [setup(workspace(Root, Kb)), cleanup(drop_workspace(Root))]) :-
    journaled_mode,
    snapshot(journal_snapshot(4, 0)),
    snapshot_file(Kb, 'CURRENT', 0),
    source_entity('REQ-A', "src/a.ts"),
    status_dict(Dict),
    same(Dict, _{
        branch: main, snapshotId: missing, syncedAt: null, dirty: true,
        syncState: unknown,
        staleReasons: [_{code: indexed_source_missing, path: 'src/a.ts', entityIds: ['REQ-A']}],
        staleReasonCount: 1, staleReasonsTruncated: false, kbPath: Kb,
        lastSyncSource: persisted
    }),
    scope_dict(Scope),
    same(Scope, _{snapshotId: missing, syncedAt: null}).

test(a_zero_sequence_only_counts_for_a_journaled_store, [setup(workspace(Root, Kb)), cleanup(drop_workspace(Root))]) :-
    snapshot(journal_snapshot(4, 0)),
    snapshot_file(Kb, 'kb.rdf', 0),
    status_dict(Dict),
    Dict.snapshotId == missing,
    Dict.syncedAt == '2023-11-14T22:13:20Z',
    Dict.dirty == false,
    Dict.syncState == fresh.

test(a_store_without_a_snapshot_record, [setup(workspace(Root, Kb)), cleanup(drop_workspace(Root))]) :-
    retractall(kb:kb_attached_snapshot(_)),
    snapshot_file(Kb, 'kb.rdf', 0),
    meta(snapshotId, unknown),
    scope_dict(Scope),
    same(Scope, _{snapshotId: unknown, syncedAt: '2023-11-14T22:13:20Z'}).

test(stamps_print_sixteen_decimals, [setup(workspace(Root, _Kb)), cleanup(drop_workspace(Root))]) :-
    snapshot(stamp(1.25, 9)),
    meta(snapshotId, 'stamp:1.2500000000000000:9').

test(a_nested_branch_keeps_its_slashes, [setup(workspace('feature/login', Root, Kb)), cleanup(drop_workspace(Root))]) :-
    meta(branch, 'feature/login'),
    meta(kbPath, Kb).

:- end_tests(status_meta).

:- begin_tests(status_sources).

test(a_newer_source_makes_the_store_stale, [setup(workspace(Root, Kb)), cleanup(drop_workspace(Root))]) :-
    snapshot_file(Kb, 'kb.rdf', 0),
    file_at(Root, 'src/newer.ts', "x", 10),
    file_at(Root, 'src/same.ts', "x", 0),
    file_at(Root, 'src/older.ts', "x", -10),
    dir_at(Root, 'src/dir'),
    source_entity('REQ-NEWER', "src/newer.ts"),
    source_entity('REQ-SAME', "src/same.ts"),
    source_entity('REQ-OLDER', "src/older.ts"),
    source_entity('REQ-DIR', "src/dir"),
    source_entity('REQ-GONE', "src/gone.ts"),
    status_dict(Dict),
    Dict.dirty == true,
    Dict.syncState == stale,
    Dict.staleReasonCount == 2,
    Dict.staleReasonsTruncated == false,
    expect_reasons([ reason(indexed_source_missing, 'src/gone.ts', ['REQ-GONE']),
                     reason(indexed_source_newer, 'src/newer.ts', ['REQ-NEWER']) ]).

test(sources_at_or_before_the_snapshot_are_fresh, [setup(workspace(Root, Kb)), cleanup(drop_workspace(Root))]) :-
    snapshot_file(Kb, 'kb.rdf', 0),
    file_at(Root, 'src/same.ts', "x", 0),
    file_at(Root, 'src/older.ts', "x", -10),
    dir_at(Root, 'src/dir'),
    source_entity('REQ-SAME', "src/same.ts"),
    source_entity('REQ-OLDER', "src/older.ts"),
    source_entity('REQ-DIR', "src/dir"),
    state(false, fresh).

test(a_missing_source_makes_the_store_stale, [setup(workspace(Root, Kb)), cleanup(drop_workspace(Root))]) :-
    snapshot_file(Kb, 'kb.rdf', 0),
    dir_at(Root, 'src/dir'),
    source_entity('REQ-DIR', "src/dir"),
    source_entity('REQ-GONE', "src/gone.ts"),
    state(true, stale).

test(source_paths_are_made_workspace_relative, [setup(workspace(Root, Kb)), cleanup(drop_workspace(Root))]) :-
    snapshot_file(Kb, 'kb.rdf', 0),
    atom_concat(Root, '/src/abs.ts', Absolute),
    atom_string(Absolute, AbsoluteText),
    source_entity('REQ-ABS', AbsoluteText),
    source_entity('REQ-FRAGMENT', "src/frag.ts#L10"),
    source_entity('REQ-URL', "https://example.org/spec.md"),
    source_entity('REQ-WORD', "Makefile"),
    source_entity('REQ-EXT', "notes.md"),
    source_entity('REQ-OUTSIDE', "/elsewhere/x.ts"),
    source_entity('REQ-BARE', "src/Makefile"),
    expect_reasons([ reason(indexed_source_missing, '/elsewhere/x.ts', ['REQ-OUTSIDE']),
                     reason(indexed_source_missing, 'notes.md', ['REQ-EXT']),
                     reason(indexed_source_missing, 'src/Makefile', ['REQ-BARE']),
                     reason(indexed_source_missing, 'src/abs.ts', ['REQ-ABS']),
                     reason(indexed_source_missing, 'src/frag.ts', ['REQ-FRAGMENT']) ]).

test(a_url_or_word_source_alone_keeps_the_store_fresh, [setup(workspace(Root, Kb)), cleanup(drop_workspace(Root))]) :-
    snapshot_file(Kb, 'kb.rdf', 0),
    source_entity('REQ-URL', "https://example.org/spec.md"),
    source_entity('REQ-WORD', "Makefile"),
    state(false, fresh).

test(source_file_wins_over_source, [setup(workspace(Root, Kb)), cleanup(drop_workspace(Root))]) :-
    snapshot_file(Kb, 'kb.rdf', 0),
    source_entity('REQ-C', "src/c.ts"),
    source_entity('REQ-B', "src/c.ts", [sourceFile="src/b.ts"]),
    expect_reasons([ reason(indexed_source_missing, 'src/b.ts', ['REQ-B']),
                     reason(indexed_source_missing, 'src/c.ts', ['REQ-C']) ]).

% Both sources name src/shared.ts: one reason lists both entities.
test(entities_sharing_a_source_are_listed_together, [setup(workspace(Root, Kb)), cleanup(drop_workspace(Root))]) :-
    snapshot_file(Kb, 'kb.rdf', 0),
    source_entity('REQ-Z', "src/shared.ts"),
    source_entity('REQ-A', "src/shared.ts#top"),
    expect_reasons([reason(indexed_source_missing, 'src/shared.ts', ['REQ-A', 'REQ-Z'])]).

test(without_a_snapshot_file_every_source_is_newer, [setup(workspace(Root, _Kb)), cleanup(drop_workspace(Root))]) :-
    file_at_time(Root, 'src/old.ts', "x", 1.0),
    entity_doc(Doc),
    file_at_time(Root, 'documentation/old.md', Doc, 1.0),
    source_entity('REQ-OLD', "src/old.ts"),
    expect_reasons([ reason(documentation_source_newer, 'documentation/old.md', []),
                     reason(indexed_source_newer, 'src/old.ts', ['REQ-OLD']) ]).

% A fresh store lists no reasons without looking for them, even where
% they would read the snapshot time from an older CURRENT file.
test(a_fresh_store_lists_no_reasons, [setup(workspace(Root, Kb)), cleanup(drop_workspace(Root))]) :-
    snapshot_file(Kb, 'kb.rdf', 0),
    snapshot_file(Kb, 'CURRENT', -100),
    file_at(Root, 'src/mid.ts', "x", -50),
    source_entity('REQ-MID', "src/mid.ts"),
    status_dict(Dict),
    Dict.syncState == fresh,
    Dict.staleReasons == [],
    Dict.staleReasonCount == 0,
    Dict.staleReasonsTruncated == false.

test(stale_reasons_read_current_before_kb_rdf, [setup(workspace(Root, Kb)), cleanup(drop_workspace(Root))]) :-
    snapshot_file(Kb, 'kb.rdf', 0),
    snapshot_file(Kb, 'CURRENT', 100),
    file_at(Root, 'src/mid.ts', "x", 50),
    file_at(Root, 'src/late.ts', "x", 150),
    source_entity('REQ-MID', "src/mid.ts"),
    source_entity('REQ-LATE', "src/late.ts"),
    expect_reasons([reason(indexed_source_newer, 'src/late.ts', ['REQ-LATE'])]).

test(at_most_two_hundred_reasons_are_listed, [setup(workspace(Root, Kb)), cleanup(drop_workspace(Root))]) :-
    snapshot_file(Kb, 'kb.rdf', 0),
    forall(between(1, 201, N),
           (   format(atom(Id), 'REQ-~|~`0t~d~3+', [N]),
               format(string(Source), "src/f~|~`0t~d~3+.ts", [N]),
               source_entity(Id, Source)
           )),
    status_dict(Dict),
    Dict.staleReasonCount == 201,
    Dict.staleReasonsTruncated == true,
    reasons(Reasons),
    length(Reasons, 200),
    sort(Reasons, Distinct),
    length(Distinct, 200).

test(two_hundred_reasons_are_not_truncated, [setup(workspace(Root, Kb)), cleanup(drop_workspace(Root))]) :-
    snapshot_file(Kb, 'kb.rdf', 0),
    forall(between(1, 200, N),
           (   format(atom(Id), 'REQ-~d', [N]),
               format(string(Source), "src/f~d.ts", [N]),
               source_entity(Id, Source)
           )),
    status_dict(Dict),
    Dict.staleReasonCount == 200,
    Dict.staleReasonsTruncated == false,
    length(Dict.staleReasons, 200).

:- end_tests(status_sources).

:- begin_tests(status_trees).

test(every_knowledge_lane_is_scanned, [setup(workspace(Root, Kb)), cleanup(drop_workspace(Root))]) :-
    snapshot_file(Kb, 'kb.rdf', 0),
    forall(member(Lane, [requirements, scenarios, tests, facts, adr, flags, events]),
           (   format(atom(Path), '.kb/~w/deep/~w.md', [Lane, Lane]),
               doc_at(Root, Path, 10)
           )),
    doc_at(Root, '.kb/other/x.md', 10),
    source_entity('REQ-LANE', "/ignored", [sourceFile=".kb/requirements/deep/requirements.md"]),
    status_dict(Dict),
    Dict.syncState == stale,
    expect_reasons([ reason(indexed_source_newer, '.kb/requirements/deep/requirements.md', ['REQ-LANE']),
                     reason(knowledge_source_newer, '.kb/adr/deep/adr.md', []),
                     reason(knowledge_source_newer, '.kb/events/deep/events.md', []),
                     reason(knowledge_source_newer, '.kb/facts/deep/facts.md', []),
                     reason(knowledge_source_newer, '.kb/flags/deep/flags.md', []),
                     reason(knowledge_source_newer, '.kb/requirements/deep/requirements.md', ['REQ-LANE']),
                     reason(knowledge_source_newer, '.kb/scenarios/deep/scenarios.md', []),
                     reason(knowledge_source_newer, '.kb/tests/deep/tests.md', []) ]).

test(each_lane_alone_makes_the_store_stale, [setup(workspace(Root, Kb)), cleanup(drop_workspace(Root))]) :-
    snapshot_file(Kb, 'kb.rdf', 0),
    forall(member(Lane, [requirements, scenarios, tests, facts, adr, flags, events]),
           (   format(atom(Path), '.kb/~w/x.md', [Lane]),
               directory_file_path(Root, Path, Full),
               doc_at(Root, Path, 10),
               state(true, stale),
               delete_file(Full),
               state(false, fresh)
           )).

test(lane_files_at_the_snapshot_or_not_entities_are_fresh, [setup(workspace(Root, Kb)), cleanup(drop_workspace(Root))]) :-
    snapshot_file(Kb, 'kb.rdf', 0),
    doc_at(Root, '.kb/requirements/same.md', 0),
    file_at(Root, '.kb/requirements/notes.md', "no front matter", 10),
    file_at(Root, '.kb/requirements/no-id.md', "---\ntitle: X\nstatus: open\n", 10),
    file_at(Root, '.kb/requirements/no-title.md', "---\nid: X\nstatus: open\n", 10),
    file_at(Root, '.kb/requirements/no-status.md', "---\nid: X\ntitle: X\n", 10),
    file_at(Root, '.kb/requirements/late-fence.md', "\n---\nid: X\ntitle: X\nstatus: open\n", 10),
    file_at(Root, '.kb/requirements/README.md', "---\nid: X\ntitle: X\nstatus: open\n", 10),
    state(false, fresh),
    directory_file_path(Root, '.kb/requirements/same.md', Same),
    delete_file(Same),
    without_snapshot_file(Kb),
    expect_reasons([]).

test(documentation_files_are_scanned, [setup(workspace(Root, Kb)), cleanup(drop_workspace(Root))]) :-
    snapshot_file(Kb, 'kb.rdf', 0),
    doc_at(Root, 'documentation/guide/a.md', 10),
    doc_at(Root, 'documentation/b.md', 10),
    doc_at(Root, 'documentation/same.md', 0),
    doc_at(Root, 'documentation/README.md', 10),
    doc_at(Root, 'documentation/tests/e2e/x.md', 10),
    doc_at(Root, 'documentation/tests/benchmarks/y.md', 10),
    doc_at(Root, 'documentation/tests/unit/z.md', 10),
    doc_at(Root, 'other/c.md', 10),
    source_entity('REQ-DOC', "documentation/b.md"),
    status_dict(Dict),
    Dict.syncState == stale,
    expect_reasons([ reason(documentation_source_newer, 'documentation/b.md', ['REQ-DOC']),
                     reason(documentation_source_newer, 'documentation/guide/a.md', []),
                     reason(documentation_source_newer, 'documentation/tests/unit/z.md', []),
                     reason(indexed_source_newer, 'documentation/b.md', ['REQ-DOC']) ]).

test(ignored_documentation_keeps_the_store_fresh, [setup(workspace(Root, Kb)), cleanup(drop_workspace(Root))]) :-
    snapshot_file(Kb, 'kb.rdf', 0),
    doc_at(Root, 'documentation/same.md', 0),
    doc_at(Root, 'documentation/README.md', 10),
    doc_at(Root, 'documentation/README.md.d/README.md', 10),
    doc_at(Root, 'documentation/tests/e2e/x.md', 10),
    doc_at(Root, 'documentation/tests/benchmarks/y.md', 10),
    state(false, fresh).

test(a_directory_named_readme_is_not_scanned, [setup(workspace(Root, Kb)), cleanup(drop_workspace(Root))]) :-
    snapshot_file(Kb, 'kb.rdf', 0),
    doc_at(Root, 'documentation/README.md/x.md', 10),
    doc_at(Root, '.kb/adr/README.md/y.md', 10),
    state(false, fresh),
    without_snapshot_file(Kb),
    expect_reasons([]).

test(files_named_like_ignored_trees_are_ignored, [setup(workspace(Root, Kb)), cleanup(drop_workspace(Root))]) :-
    snapshot_file(Kb, 'kb.rdf', 0),
    doc_at(Root, 'documentation/tests/e2e', 10),
    doc_at(Root, 'documentation/tests/benchmarks', 10),
    state(false, fresh),
    without_snapshot_file(Kb),
    expect_reasons([]).

test(each_documentation_file_alone_makes_the_store_stale, [setup(workspace(Root, Kb)), cleanup(drop_workspace(Root))]) :-
    snapshot_file(Kb, 'kb.rdf', 0),
    doc_at(Root, 'documentation/guide/deep/a.md', 10),
    state(true, stale).

test(a_workspace_inside_an_e2e_tree_ignores_its_documentation,
     [setup((tmp_file(kibi_status_e2e, Base),
             atom_concat(Base, '/tests/e2e/ws', Root),
             atom_concat(Root, '/.kb/branches/main', Kb),
             make_directory_path(Kb), detach_leftover_kb, kb_attach(Kb))),
      cleanup(drop_workspace(Base))]) :-
    snapshot_file(Kb, 'kb.rdf', 0),
    doc_at(Root, 'documentation/a.md', 10),
    state(false, fresh),
    scope_dict(_),
    without_snapshot_file(Kb),
    expect_reasons([]).

test(a_workspace_inside_a_benchmarks_tree_ignores_its_documentation,
     [setup((tmp_file(kibi_status_bench, Base),
             atom_concat(Base, '/tests/benchmarks/ws', Root),
             atom_concat(Root, '/.kb/branches/main', Kb),
             make_directory_path(Kb), detach_leftover_kb, kb_attach(Kb))),
      cleanup(drop_workspace(Base))]) :-
    snapshot_file(Kb, 'kb.rdf', 0),
    doc_at(Root, 'documentation/a.md', 10),
    state(false, fresh).

:- end_tests(status_trees).

:- begin_tests(status_memo).

test(the_source_index_is_kept_per_generation, [setup(workspace(Root, Kb)), cleanup(drop_workspace(Root))]) :-
    snapshot_file(Kb, 'kb.rdf', 0),
    source_entity('REQ-A', "src/a.ts"),
    kb:index_verification_key(status_source_index, Key),
    assertz(kb:kb_status_source_index_memo(other, source_index{})),
    reasons(First),
    First == [reason(indexed_source_missing, 'src/a.ts', ['REQ-A'])],
    findall(K, kb:kb_status_source_index_memo(K, _), Keys),
    Keys == [Key],
    retractall(kb:kb_status_source_index_memo(_, _)),
    assertz(kb:kb_status_source_index_memo(Key, source_index{'src/a.ts': ['MEMO']})),
    reasons(Second),
    Second == [reason(indexed_source_missing, 'src/a.ts', ['MEMO'])].

test(a_transaction_builds_the_index_afresh, [setup(workspace(Root, Kb)), cleanup(drop_workspace(Root))]) :-
    snapshot_file(Kb, 'kb.rdf', 0),
    source_entity('REQ-A', "src/a.ts"),
    kb:index_verification_key(status_source_index, Key),
    assertz(kb:kb_status_source_index_memo(Key, source_index{'src/a.ts': ['MEMO']})),
    rdf_transaction(reasons(Reasons)),
    Reasons == [reason(indexed_source_missing, 'src/a.ts', ['REQ-A'])],
    findall(K-I, kb:kb_status_source_index_memo(K, I), Memos),
    Memos == [Key-source_index{'src/a.ts': ['MEMO']}].

test(the_workspace_root_is_kept_per_store, [setup(workspace(Root, Kb)), cleanup(drop_workspace(Root))]) :-
    snapshot_file(Kb, 'kb.rdf', 0),
    atom_concat(Root, '/src/abs.ts', Absolute),
    atom_string(Absolute, AbsoluteText),
    source_entity('REQ-ABS', AbsoluteText),
    assertz(status:workspace_root_memo('/other/kb', '/other')),
    reasons(First),
    First == [reason(indexed_source_missing, 'src/abs.ts', ['REQ-ABS'])],
    findall(P-R, status:workspace_root_memo(P, R), Memos),
    Memos == [Kb-Root],
    retractall(kb:kb_status_source_index_memo(_, _)),
    retractall(status:workspace_root_memo(_, _)),
    atom_concat(Root, '/src', Src),
    assertz(status:workspace_root_memo(Kb, Src)),
    reasons(Second),
    Second == [reason(indexed_source_missing, 'abs.ts', ['REQ-ABS'])].

:- end_tests(status_memo).

:- begin_tests(status_values).

test(source_values_become_atoms) :-
    status:source_value_atom('^^'("src/a.ts", 'http://www.w3.org/2001/XMLSchema#string'), A),
    A == 'src/a.ts',
    status:source_value_atom(literal(type(t, 'src/b.ts')), B),
    B == 'src/b.ts',
    status:source_value_atom(literal(type(t, "src/c.ts")), C),
    C == 'src/c.ts',
    status:source_value_atom("src/d.ts", D),
    D == 'src/d.ts',
    status:source_value_atom('src/e.ts', E),
    E == 'src/e.ts',
    status:source_value_atom(src/f, F),
    F == 'src/f',
    status:source_value_atom(42, G),
    G == '42'.

test(source_values_are_deterministic) :-
    forall(member(Value, ['^^'("a", t), literal(type(t, a)), "a", a, f(a)]),
           first_answer_is_last(status:source_value_atom(Value, _))).

test(legacy_entities_without_an_id_are_skipped,
     [setup((workspace(Root, Kb),
             kb_detach,
             directory_file_path(Kb, 'legacy.pl', Legacy),
             setup_call_cleanup(open(Legacy, write, Out),
                                format(Out, "entity(req, '', \"t\", [source('src/blank.ts')]).~nentity(req, 'REQ-L', \"t\", [source('src/legacy.ts')]).~n", []),
                                close(Out)),
             kb_attach(Kb))),
      cleanup(drop_workspace(Root))]) :-
    snapshot_file(Kb, 'kb.rdf', 0),
    expect_reasons([ reason(indexed_source_missing, 'src/blank.ts', []),
                     reason(indexed_source_missing, 'src/legacy.ts', ['REQ-L']) ]).

:- end_tests(status_values).
