:- module(kb_isolation_child, [
    isolation_child_writer/5,
    write_isolation_store/2,
    wait_for_isolation_files/2
]).

% The child side of the two-process store isolation test in kb.plt. A child
% loads only this file and the KB module, not kb.plt, so it is ready in well
% under the barrier wait even on a busy machine.

:- use_module('../src/kb.pl').
:- use_module(library(filesex)).

%% isolation_child_writer(+EntityId, +Ready, +Done, +Release, +Cleanup)
% Attach a store of its own, report its directory in Ready, wait for
% Release, write EntityId, report Done and hold the store until Cleanup.
isolation_child_writer(EntityId, Ready, Done, Release, Cleanup) :-
    tmp_file(kibi_isolation_child, ChildRoot),
    make_directory_path(ChildRoot),
    directory_file_path(ChildRoot, store, Store),
    catch(
        setup_call_cleanup(
            kb_attach(Store),
            (
                write_isolation_store(Ready, ChildRoot),
                wait_for_isolation_files([Release], 1000),
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
                wait_for_isolation_files([Cleanup], 1000)
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

%% wait_for_isolation_files(+Paths, +Attempts)
% Poll every 10 ms until every file in Paths exists, at most Attempts times.
wait_for_isolation_files(Paths, Attempts) :-
    (   forall(member(Path, Paths), exists_file(Path))
    ->  true
    ;   Attempts > 0
    ->  sleep(0.01),
        NextAttempts is Attempts - 1,
        wait_for_isolation_files(Paths, NextAttempts)
    ;   throw(error(timeout_error(isolation_barrier, Paths), wait_for_isolation_files/2))
    ).
