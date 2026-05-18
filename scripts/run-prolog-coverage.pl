#!/usr/bin/env swipl

:- initialization(main, main).

:- use_module(library(error)).
:- use_module(library(filesex)).
:- use_module(library(http/json)).
:- use_module(library(lists)).
:- use_module(library(option)).
:- use_module(library(pcre)).
:- use_module(library(plunit)).
:- use_module(library(prolog_coverage)).

main(Argv) :-
    catch(run(Argv, ExitCode), Error, handle_fatal_error(Error)),
    halt(ExitCode).

run(Argv, ExitCode) :-
    parse_args(Argv, Config),
    option(output_dir(OutputDir), Config),
    option(summary_json(SummaryJson), Config),
    option(summary_text(SummaryText), Config),
    option(fail_under(TargetPercent), Config),
    ensure_clean_directory(OutputDir),
    ensure_parent_directory(SummaryJson),
    ensure_parent_directory(SummaryText),
    load_tests(Config),
    coverage(run_tests_result(TestsPassed), [show(false)]),
    coverage_roots(Config, CoverageRoots),
    with_output_to(
        string(CoverageReport),
        show_coverage([
            dir(OutputDir),
            roots(CoverageRoots),
            line_numbers(true),
            color(false)
        ])
    ),
    compute_clause_coverage(Config, ClausePercent, UncoveredClauses),
    recursive_regular_files(OutputDir, OutputFiles),
    include(is_annotated_artifact, OutputFiles, AnnotatedFiles),
    (   ClausePercent >= TargetPercent
    ->  ThresholdOk = true
    ;   ThresholdOk = false
    ),
    Summary = _{
        tests: _{passed: TestsPassed},
        threshold: _{ok: ThresholdOk, targetPercent: TargetPercent},
        coverage: _{percent: ClausePercent, uncoveredClauses: UncoveredClauses},
        artifacts: _{annotatedFiles: AnnotatedFiles}
    },
    write_summary_json(SummaryJson, Summary),
    write_summary_text(SummaryText, Summary, CoverageReport),
    determine_exit_code(TestsPassed, ThresholdOk, ExitCode).

handle_fatal_error(Error) :-
    print_message(error, Error),
    halt(2).

parse_args(Argv, Config) :-
    maplist(cli_arg_string, Argv, RawArgs),
    strip_separator_args(RawArgs, Args),
    parse_args(Args, [], Config0),
    reverse(Config0, Config1),
    must_have_option(source_root, Config1),
    must_have_option(test, Config1),
    must_have_option(output_dir, Config1),
    must_have_option(summary_json, Config1),
    must_have_option(summary_text, Config1),
    (   option(fail_under(_), Config1)
    ->  Config = Config1
    ;   Config = [fail_under(100)|Config1]
    ).

parse_args([], Config, Config).
parse_args(["--source-root", Value|Rest], Acc, Config) :-
    !,
    parse_args(Rest, [source_root(Value)|Acc], Config).
parse_args(["--test", Value|Rest], Acc, Config) :-
    !,
    parse_args(Rest, [test(Value)|Acc], Config).
parse_args(["--output-dir", Value|Rest], Acc, Config) :-
    !,
    parse_args(Rest, [output_dir(Value)|Acc], Config).
parse_args(["--summary-json", Value|Rest], Acc, Config) :-
    !,
    parse_args(Rest, [summary_json(Value)|Acc], Config).
parse_args(["--summary-text", Value|Rest], Acc, Config) :-
    !,
    parse_args(Rest, [summary_text(Value)|Acc], Config).
parse_args(["--fail-under", Value|Rest], Acc, Config) :-
    !,
    number_string(Number, Value),
    parse_args(Rest, [fail_under(Number)|Acc], Config).
parse_args([Unknown|_], _, _) :-
    throw(error(domain_error(prolog_coverage_runner_argument, Unknown), _)).

cli_arg_string(Arg, String) :-
    (   string(Arg)
    ->  String = Arg
    ;   atom(Arg)
    ->  atom_string(Arg, String)
    ;   term_string(Arg, String)
    ).

strip_separator_args(["--"|Rest], Stripped) :-
    !,
    strip_separator_args(Rest, Stripped).
strip_separator_args(Args, Args).

must_have_option(Name, Options) :-
    Goal =.. [Name, _],
    (   option(Goal, Options)
    ->  true
    ;   throw(error(existence_error(option, Name), _))
    ).

ensure_clean_directory(Dir) :-
    (   exists_directory(Dir)
    ->  delete_directory_and_contents(Dir)
    ;   true
    ),
    make_directory_path(Dir).

ensure_parent_directory(Path) :-
    file_directory_name(Path, Dir),
    make_directory_path(Dir).

coverage_roots(Config, Roots) :-
    option(source_root(SourceRoot), Config),
    findall(TestDir,
        (
            option(test(TestFile), Config),
            file_directory_name(TestFile, TestDir)
        ),
        TestDirs0),
    sort([SourceRoot|TestDirs0], Roots).

load_tests(Config) :-
    findall(TestFile, option(test(TestFile), Config), TestFiles),
    maplist(load_test_file, TestFiles).

load_test_file(TestFile) :-
    load_files(TestFile, [if(changed)]).

run_tests_result(TestsPassed) :-
    (   run_tests
    ->  TestsPassed = true
    ;   TestsPassed = false
    ).

compute_clause_coverage(Config, ClausePercent, UncoveredClauses) :-
    option(source_root(SourceRoot), Config),
    normalize_path(SourceRoot, NormalizedRoot),
    findall(
        clause(Predicate, Line, Enter, Exit),
        clause_coverage_row(NormalizedRoot, Predicate, Line, Enter, Exit),
        ClauseRows0
    ),
    sort(ClauseRows0, ClauseRows),
    length(ClauseRows, TotalClauses),
    include(clause_entered, ClauseRows, CoveredClauses),
    length(CoveredClauses, CoveredCount),
    (   TotalClauses =:= 0
    ->  ClausePercent = 0.0
    ;   ClausePercent is CoveredCount * 100 / TotalClauses
    ),
    findall(
        _{predicate: Predicate, line: Line},
        member(clause(Predicate, Line, 0, _), ClauseRows),
        UncoveredClauses
    ).

clause_coverage_row(SourceRoot, Predicate, Line, Enter, Exit) :-
    current_predicate(Module:Name/Arity),
    functor(Head, Name, Arity),
    predicate_property(Module:Head, file(File)),
    predicate_property(Module:Head, defined),
    \+ predicate_property(Module:Head, imported_from(_)),
    clause(Module:Head, _, ClauseRef),
    normalize_path(File, NormalizedFile),
    sub_string(NormalizedFile, 0, _, _, SourceRoot),
    clause_property(ClauseRef, line_count(Line)),
    coverage_counts(ClauseRef, Enter, Exit),
    format(string(Predicate), '~w:~w/~d', [Module, Name, Arity]).

%% Only succeed when coverage data for the clause is available.
%% If prolog_coverage:'$cov_data'/3 fails the clause was not instrumented
%% and should be excluded from the coverage calculation rather than
%% treated as an uncovered (0,0) clause.
coverage_counts(ClauseRef, Enter, Exit) :-
    prolog_coverage:'$cov_data'(clause(ClauseRef), Enter, Exit).

clause_entered(clause(_, _, Enter, _)) :-
    Enter > 0.

is_annotated_artifact(File) :-
    file_name_extension(_, cov, File).

recursive_regular_files(Dir, Files) :-
    directory_files(Dir, Entries0),
    exclude(is_dot_entry, Entries0, Entries),
    findall(File,
        (
            member(Entry, Entries),
            directory_file_path(Dir, Entry, Path),
            (   exists_directory(Path)
            ->  recursive_regular_files(Path, Nested),
                member(File, Nested)
            ;   exists_file(Path),
                File = Path
            )
        ),
        Files0),
    sort(Files0, Files).

is_dot_entry('.').
is_dot_entry('..').

write_summary_json(Path, Summary) :-
    atom_json_dict(Json, Summary, []),
    setup_call_cleanup(
        open(Path, write, Stream, [encoding(utf8)]),
        write(Stream, Json),
        close(Stream)
    ).

write_summary_text(Path, Summary, CoverageReport) :-
    setup_call_cleanup(
        open(Path, write, Stream, [encoding(utf8)]),
        write_summary_text_stream(Stream, Summary, CoverageReport),
        close(Stream)
    ).

write_summary_text_stream(Stream, Summary, CoverageReport) :-
    TestsPassed = Summary.tests.passed,
    ThresholdOk = Summary.threshold.ok,
    TargetPercent = Summary.threshold.targetPercent,
    CoveragePercent = Summary.coverage.percent,
    UncoveredClauses = Summary.coverage.uncoveredClauses,
    (   ThresholdOk == true
    ->  StatusLine = "Coverage threshold met"
    ;   StatusLine = "Coverage threshold not met"
    ),
    format(Stream, "~w~n", [StatusLine]),
    format(Stream, "Tests passed: ~w~n", [TestsPassed]),
    format(Stream, "Clause coverage: ~2f%~n", [CoveragePercent]),
    format(Stream, "Coverage threshold: ~2f%~n", [TargetPercent]),
    format(Stream, "Uncovered clauses:~n", []),
    (   UncoveredClauses == []
    ->  format(Stream, "- none~n", [])
    ;   forall(member(Clause, UncoveredClauses),
            format(Stream, "- ~w line ~d~n", [Clause.predicate, Clause.line]))
    ),
    format(Stream, "~nRaw coverage report~n===================~n~s", [CoverageReport]).

determine_exit_code(false, _, 2) :- !.
determine_exit_code(true, true, 0) :- !.
determine_exit_code(true, false, 1).

normalize_path(Path, Normalized) :-
    absolute_file_name(Path, Absolute, [file_errors(fail), access(none)]),
    !,
    atom_string(Absolute, Normalized).
normalize_path(Path, Path).
