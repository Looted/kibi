:- module(kb_fixture, [
    with_fixture_kb/1,
    fixture_kb_open/1,
    fixture_kb_open/2,
    detach_leftover_kb/0,
    fixture_setups_fail_tests/0,
    fixture_kb_close/1,
    fixture_entity/3,
    fixture_rel/3
]).

% A throwaway KB store for plunit files that need KB facts. Each call gets
% its own temporary directory, removed afterwards with the store detached.

:- use_module(library(filesex)).
:- use_module(library(semweb/rdf_db), [rdf_reset_db/0, rdf_graph/1, rdf_unload_graph/1]).
:- use_module(library(semweb/rdf_persistency), [rdf_detach_db/0]).
:- use_module('../src/kb.pl').

%% with_fixture_kb(:Goal)
% Run Goal with a fresh, empty KB attached.
:- meta_predicate with_fixture_kb(0).
with_fixture_kb(Goal) :-
    setup_call_cleanup(fixture_kb_open(Dir), Goal, fixture_kb_close(Dir)).

%% fixture_kb_open(-Dir)
% Attach a fresh, empty KB in a new temporary directory.
fixture_kb_open(Dir) :-
    fixture_kb_open([], Dir).

%% fixture_kb_open(+LegacyEntities, -Dir)
% As fixture_kb_open/1, with LegacyEntities (entity/4 terms) in a legacy
% .pl file the store loads when it attaches.
fixture_kb_open(LegacyEntities, Dir) :-
    detach_leftover_kb,
    tmp_file(kibi_fixture_kb, Dir),
    make_directory_path(Dir),
    (   LegacyEntities == []
    ->  true
    ;   directory_file_path(Dir, 'legacy.pl', Legacy),
        setup_call_cleanup(open(Legacy, write, Out),
                           forall(member(Entity, LegacyEntities), portray_clause(Out, Entity)),
                           close(Out))
    ),
    (   kb_attach(Dir)
    ->  true
    ;   throw(error(fixture_attach_failed(Dir), _))
    ).

%% detach_leftover_kb
% Put the KB back to its unattached state, whatever a test that was cut
% short (a time limit, say) left behind, so the next setup can attach its own
% store and see only its own facts. kb_detach/0 alone does not cover a store
% caught halfway through kb_attach/1: the RDF journal or the audit database
% can be attached before the facts that tell kb_detach/0 to release them are
% recorded, and a graph can be loaded before it is recorded as the KB's. So
% this also releases both databases unconditionally, drops every RDF graph,
% and clears every fact of the kb module (attachment state, read indexes and
% memos). A release step that fails or raises (kb_detach/0 fails on a
% journaled store whose RDF journal was never attached) does not stop the
% steps after it.
detach_leftover_kb :-
    release(kb_detach),
    release(rdf_detach_db),
    (   kb:db_attached(_)
    ->  release(kb:db_detach)
    ;   true
    ),
    % rdf_reset_db/0 refuses while the RDF store is busy (an open snapshot,
    % say); unloading the graphs one by one still drops their triples.
    catch(rdf_reset_db, _, forall(rdf_graph(Graph), rdf_unload_graph(Graph))),
    forall(kb_state(Head), retractall(Head)).

release(Goal) :-
    ignore(catch(Goal, _, true)).

kb_state(kb:Head) :-
    predicate_property(kb:Head, dynamic),
    \+ predicate_property(kb:Head, imported_from(_)).

%% fixture_setups_fail_tests
% Directive for a plunit file whose setups attach a KB. PLUnit 9 reports a
% setup option that fails or throws but does not count its test as failed
% (PLUnit 10 does), so a store that cannot be attached would let the test pass
% without running it. In a file that runs this directive, the setup option of
% each test, and of its unit, runs instead as the first goal of the test
% body, where a failure throws and fails the test on both. A unit's setup and
% cleanup then run around each of its tests rather than once for the unit.
:- dynamic setups_in_body/1, unit_fixture/3.

fixture_setups_fail_tests :-
    prolog_load_context(source, File),
    retractall(setups_in_body(File)),
    assertz(setups_in_body(File)).

setups_in_body_source(File) :-
    prolog_load_context(source, File),
    setups_in_body(File).

:- multifile user:term_expansion/2.
user:term_expansion((:- begin_tests(Unit, Options0)), (:- begin_tests(Unit, Options))) :-
    setups_in_body_source(File),
    take_option(setup, Options0, Options1, Setup),
    take_option(cleanup, Options1, Options, Cleanup),
    retractall(unit_fixture(File, _, _)),
    assertz(unit_fixture(File, Setup, Cleanup)).
user:term_expansion((:- end_tests(_)), _) :-
    setups_in_body_source(File),
    retractall(unit_fixture(File, _, _)),
    fail.
user:term_expansion((test(Name) :- Body), Clause) :-
    setups_in_body_source(File),
    setup_in_body(File, Name, [], Body, Clause).
user:term_expansion((test(Name, Options) :- Body), Clause) :-
    setups_in_body_source(File),
    (   is_list(Options)
    ->  setup_in_body(File, Name, Options, Body, Clause)
    ;   setup_in_body(File, Name, [Options], Body, Clause)
    ).

setup_in_body(File, Name, Options0, Body0, (test(Name, Options) :- Body)) :-
    (   unit_fixture(File, UnitSetup, UnitCleanup)
    ->  true
    ;   UnitSetup = true,
        UnitCleanup = true
    ),
    take_option(setup, Options0, Options1, Setup),
    take_option(cleanup, Options1, Options2, Cleanup),
    % The goals run in the unit's module, where plunit would run them.
    prolog_load_context(module, Unit),
    Body = (kb_fixture:fixture_setup(Unit:(UnitSetup, Setup)), Body0),
    Options = [cleanup(kb_fixture:fixture_cleanup(Unit:Cleanup, Unit:UnitCleanup))|Options2].

take_option(Name, Options0, Options, Goal) :-
    Option =.. [Name, Goal],
    (   selectchk(Option, Options0, Options)
    ->  true
    ;   Options = Options0,
        Goal = true
    ).

:- meta_predicate fixture_setup(0), fixture_cleanup(0, 0).
fixture_setup(Setup) :-
    (   call(Setup)
    ->  true
    ;   throw(error(goal_failed(setup(Setup)), _))
    ).

% The test's own cleanup, then its unit's, which runs even when the first
% fails or throws.
fixture_cleanup(Cleanup, UnitCleanup) :-
    setup_call_cleanup(true, ignore(Cleanup), UnitCleanup).

%% fixture_kb_close(+Dir)
fixture_kb_close(Dir) :-
    kb_detach,
    delete_directory_and_contents(Dir).

%% fixture_entity(+Type, +Id, +ExtraProps)
% Assert an entity with the required fields filled in.
fixture_entity(Type, Id, ExtraProps) :-
    (   memberchk(status=_, ExtraProps) -> StatusDefault = [] ; StatusDefault = [status=active] ),
    append([ [ id=Id,
               title="Fixture entity",
               created_at="2026-05-01T00:00:00Z",
               updated_at="2026-05-01T00:00:00Z",
               source="test://kb_fixture.pl"
             ],
             StatusDefault,
             ExtraProps
           ], Props),
    (   kb_assert_entity(Type, Props)
    ->  true
    ;   throw(error(fixture_entity_rejected(Type, Props), _))
    ).

%% fixture_rel(+Type, +From, +To)
fixture_rel(Type, From, To) :-
    (   kb_assert_relationship(Type, From, To, [])
    ->  true
    ;   throw(error(fixture_relationship_rejected(Type, From, To), _))
    ).
