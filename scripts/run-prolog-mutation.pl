#!/usr/bin/env swipl
% Runs Mutalog, a mutation testing tool for SWI-Prolog, on the Prolog core.
%
%   swipl scripts/run-prolog-mutation.pl run [MUTALOG OPTIONS]
%   swipl scripts/run-prolog-mutation.pl list
%
% What is mutated and which tests run are set in mutalog.config.pl at the
% repository root. Mutalog is pinned below and installed on first use into
% .cache/prolog-packs, so nothing is installed into the user's own packs.
% Set MUTALOG_HOME to a Mutalog checkout to run that instead.

:- initialization(main, main).

:- use_module(library(filesex)).
:- use_module(library(process)).

mutalog_version('0.2.0').

pack_dir('.cache/prolog-packs').

main(Argv) :-
    use_mutalog,
    set_prolog_flag(argv, Argv),
    mutalog:main.

use_mutalog :-
    getenv('MUTALOG_HOME', Home),
    Home \== '',
    !,
    directory_file_path(Home, prolog, Lib),
    asserta(user:file_search_path(library, Lib)),
    use_module(library(mutalog), []).
use_mutalog :-
    mutalog_version(Version),
    pack_dir(Dir),
    make_directory_path(Dir),
    attach_packs(Dir, [duplicate(replace)]),
    (   pack_property(mutalog, version(Version))
    ->  true
    ;   format(user_error, "Installing Mutalog ~w into ~w~n", [Version, Dir]),
        install_mutalog(Version, Dir),
        attach_packs(Dir, [duplicate(replace)])
    ),
    use_module(library(mutalog), []).

% Mutalog is plain Prolog, so installing it is unpacking its release archive
% into Dir/mutalog. curl and tar do the work rather than pack_install/2: the
% relocated SWI-Prolog bundle has neither a CA path for its HTTPS client nor
% library(archive).
install_mutalog(Version, Dir) :-
    format(atom(URL),
           'https://github.com/Looted/mutalog/archive/v~w.tar.gz', [Version]),
    format(atom(Archive), '~w/mutalog-~w.tar.gz', [Dir, Version]),
    directory_file_path(Dir, mutalog, PackDir),
    (   exists_directory(PackDir)
    ->  delete_directory_and_contents(PackDir)
    ;   true
    ),
    make_directory(PackDir),
    run_program(curl, ['-fsSL', '-o', Archive, URL]),
    run_program(tar, ['-xzf', Archive, '--strip-components=1', '-C', PackDir]),
    delete_file(Archive).

run_program(Program, Args) :-
    process_create(path(Program), Args, [process(Pid)]),
    process_wait(Pid, Status),
    (   Status == exit(0)
    ->  true
    ;   throw(error(process_error(Program, Status), _))
    ).
