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

:- use_module(library(process)).

mutalog_version('0.1.2').

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
        format(atom(URL),
               'https://github.com/Looted/mutalog/archive/v~w.zip', [Version]),
        download_archive(URL, Dir, Version, Archive),
        pack_install(Archive, [ package_directory(Dir),
                                interactive(false),
                                upgrade(true)
                              ]),
        attach_packs(Dir, [duplicate(replace)])
    ),
    use_module(library(mutalog), []).

% Downloads go through curl, which uses the system's certificate store: the
% relocated SWI-Prolog bundle has no CA path of its own, so its HTTPS client
% fails to verify github.com. The archive keeps the name SWI-Prolog derives
% the pack name and version from.
download_archive(URL, Dir, Version, Archive) :-
    format(atom(Archive), '~w/mutalog-~w.zip', [Dir, Version]),
    process_create(path(curl), ['-fsSL', '-o', Archive, URL],
                   [process(Pid)]),
    process_wait(Pid, Status),
    (   Status == exit(0)
    ->  true
    ;   throw(error(mutalog_download_failed(URL, Status), _))
    ).
