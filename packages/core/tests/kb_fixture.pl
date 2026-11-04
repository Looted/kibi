:- module(kb_fixture, [
    with_fixture_kb/1,
    fixture_kb_open/1,
    fixture_kb_open/2,
    detach_leftover_kb/0,
    fixture_kb_close/1,
    fixture_entity/3,
    fixture_rel/3
]).

% A throwaway KB store for plunit files that need KB facts. Each call gets
% its own temporary directory, removed afterwards with the store detached.

:- use_module(library(filesex)).
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
    forget_proof_memo,
    tmp_file(kibi_fixture_kb, Dir),
    make_directory_path(Dir),
    (   LegacyEntities == []
    ->  true
    ;   directory_file_path(Dir, 'legacy.pl', Legacy),
        setup_call_cleanup(open(Legacy, write, Out),
                           forall(member(Entity, LegacyEntities), portray_clause(Out, Entity)),
                           close(Out))
    ),
    kb_attach(Dir).

%% forget_proof_memo
% Empty requirement_proof's pure-function memo, when that module is loaded.
% The memo is keyed by its inputs, and fixtures in different files build the
% same receipts, so a cached answer from an earlier test (or an earlier
% load of the module under mutation testing) would otherwise stand in for a
% fresh computation.
forget_proof_memo :-
    (   current_predicate(requirement_proof:pure_memo/3)
    ->  retractall(requirement_proof:pure_memo(_, _, _)),
        retractall(requirement_proof:pure_memo_size(_))
    ;   true
    ).

%% detach_leftover_kb
% Detach a KB that a test cut short (a time limit, say) left attached, so
% the next setup can attach its own.
detach_leftover_kb :-
    (   kb:kb_attached(_)
    ->  kb_detach
    ;   true
    ).

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
