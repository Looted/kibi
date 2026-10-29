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
    use_module(library(mutalog)).
use_mutalog :-
    mutalog_version(Version),
    pack_dir(Dir),
    make_directory_path(Dir),
    attach_packs(Dir, [duplicate(replace)]),
    (   pack_property(mutalog, version(Version))
    ->  true
    ;   format(user_error, "Installing Mutalog ~w into ~w~n", [Version, Dir]),
        use_system_ca_bundle,
        format(atom(URL),
               'https://github.com/Looted/mutalog/archive/v~w.zip', [Version]),
        pack_install(URL, [ package_directory(Dir),
                            interactive(false),
                            upgrade(true)
                          ]),
        attach_packs(Dir, [duplicate(replace)])
    ),
    use_module(library(mutalog)).

% The relocated SWI-Prolog bundle has no compiled-in certificate path, so
% HTTPS downloads fail verification unless OpenSSL is pointed at the
% system's CA bundle. An SSL_CERT_FILE set by the caller wins.
use_system_ca_bundle :-
    getenv('SSL_CERT_FILE', _),
    !.
use_system_ca_bundle :-
    member(File, [ '/etc/ssl/certs/ca-certificates.crt',
                   '/etc/pki/tls/certs/ca-bundle.crt',
                   '/etc/ssl/cert.pem'
                 ]),
    exists_file(File),
    !,
    setenv('SSL_CERT_FILE', File).
use_system_ca_bundle.
