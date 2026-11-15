:- module(prolog_mutation_guard, []).
% Loaded into every Mutalog worker before the tests (load/1 in
% mutalog.config.pl), never into a normal test run.
%
% A mutant that turns a list-building goal into `true` leaves the list
% unbound, so a later forall(member(X, List), assertz(...)) walks an
% endless list and asserts until the time limit. The clauses live outside
% the Prolog stacks, so the worker's stack limit never stops them, and a
% few such workers at once exhaust the runner's memory long before their
% time limits fire. The guard samples the worker's resident memory; past
% the budget it stops the worker process (SIGSTOP). The worker then stops
% growing and misses its deadline, so the controller kills it, counts the
% mutant as a timeout (as it would have been) and starts a fresh one.
%
% KIBI_MUTATION_WORKER_MEMORY_MB sets the budget (default 2560 MB per
% worker, so four workers and the controller fit a 16 GB runner).

:- use_module(library(readutil)).
:- use_module(library(process), [process_kill/2]).

:- initialization(start_guard).

start_guard :-
    (   exists_file('/proc/self/statm')
    ->  budget_bytes(Budget),
        thread_create(guard(Budget), _,
                      [detached(true), alias(kibi_mutation_memory_guard)])
    ;   true
    ).

budget_bytes(Bytes) :-
    (   getenv('KIBI_MUTATION_WORKER_MEMORY_MB', Text),
        atom_number(Text, MB),
        MB > 0
    ->  true
    ;   MB = 2560
    ),
    Bytes is MB * 1024 * 1024.

guard(Budget) :-
    repeat,
    sleep(0.2),
    resident_bytes(Resident),
    Resident > Budget,
    !,
    current_prolog_flag(pid, Pid),
    process_kill(Pid, stop).

% The second field of /proc/self/statm is the resident set in pages.
resident_bytes(Bytes) :-
    read_file_to_string('/proc/self/statm', Text, []),
    split_string(Text, " ", "\n", [_, Pages|_]),
    number_string(N, Pages),
    Bytes is N * 4096.
