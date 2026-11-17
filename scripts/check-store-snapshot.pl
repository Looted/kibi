#!/usr/bin/env swipl
% Loads every branch store under a .kb/branches directory the way a new
% engine does (snapshot plus journal, read-only) and fails when a store holds
% a triple more than once, or when an engine has repaired one.  A snapshot
% written while rdf_db held reindexed triples its garbage collector had not
% reclaimed holds each of them twice; rdf/3 answers such a triple once while
% every graph counts both copies, so the two counts differ.
%
%   swipl scripts/check-store-snapshot.pl [BranchesDirectory]

:- initialization(main, main).

:- use_module(library(aggregate)).
:- use_module(library(apply)).
:- use_module(library(filesex)).
:- use_module(library(lists)).
:- use_module(library(semweb/rdf_db)).
:- use_module(library(semweb/rdf_persistency)).

main(Argv) :-
    (   Argv = [Branches|_]
    ->  true
    ;   Branches = '.kb/branches'
    ),
    findall(Store, branch_store(Branches, Store), Stores),
    (   Stores == []
    ->  format(user_error, 'check-store-snapshot: no branch store under ~w~n', [Branches]),
        halt(1)
    ;   true
    ),
    maplist(check_store, Stores, Results),
    (   memberchk(bad, Results)
    ->  halt(1)
    ;   halt(0)
    ).

branch_store(Branches, Store) :-
    exists_directory(Branches),
    directory_files(Branches, Entries),
    member(Entry, Entries),
    \+ sub_atom(Entry, 0, _, _, '.'),
    directory_file_path(Branches, Entry, Store),
    directory_file_path(Store, rdf, Rdf),
    exists_directory(Rdf).

check_store(Store, Result) :-
    directory_file_path(Store, '.kibi-store-repair.json', Repair),
    (   exists_file(Repair)
    ->  read_file_to_string(Repair, Record, []),
        format('::error::~w: an engine repaired duplicate triples in this store: ~s~n',
               [Store, Record]),
        Result = bad
    ;   count_store(Store)
    ->  Result = ok
    ;   Result = bad
    ).

count_store(Store) :-
    directory_file_path(Store, rdf, Rdf),
    rdf_attach_db(Rdf, [access(read_only), silent(true)]),
    rdf_statistics(triples(Held)),
    aggregate_all(count, rdf(_, _, _), Distinct),
    rdf_detach_db,
    rdf_reset_db,
    (   Held =:= Distinct
    ->  format('~w: ~D triples, none held twice~n', [Store, Distinct])
    ;   Extra is Held - Distinct,
        format('::error::~w: a fresh load holds ~D triples but only ~D distinct ones (~D duplicate copies)~n',
               [Store, Held, Distinct, Extra]),
        fail
    ).
