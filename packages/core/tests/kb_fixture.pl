:- module(kb_fixture, [
    with_fixture_kb/1,
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
    tmp_file(kibi_fixture_kb, Dir),
    make_directory_path(Dir),
    setup_call_cleanup(
        kb_attach(Dir),
        Goal,
        (   kb_detach,
            delete_directory_and_contents(Dir)
        )).

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
    kb_assert_entity(Type, Props).

%% fixture_rel(+Type, +From, +To)
fixture_rel(Type, From, To) :-
    kb_assert_relationship(Type, From, To, []).
