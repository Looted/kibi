% Shared reader for the differential drivers: one case per line,
%   S;<integer variables>;<constraints>
%   E;<integer variables>;<premises>;<claim>
% with constraints `var:op:num/den` or `var:op:decimal` (read as a float),
% comma-separated.  A case becomes
% case(sat, IntIndexes, Constraints) or case(entailed, IntIndexes, Premises,
% Claim), each constraint c(Op, Index, Number).
:- module(differential_cases, [read_case/2, run_cases/1]).

:- use_module(library(readutil)).
:- use_module(library(apply)).
:- use_module(library(lists)).

read_case(Stream, Case) :-
    read_line_to_string(Stream, Line0),
    (   Line0 == end_of_file
    ->  Case = end_of_file
    ;   split_string(Line0, "", " \t\r", [Line]),
        (   Line == ""
        ->  read_case(Stream, Case)
        ;   parse_case(Line, Case)
        )
    ).

parse_case(Line, Case) :-
    split_string(Line, ";", "", Parts),
    (   Parts = ["S", Ints, Cs]
    ->  parse_ints(Ints, IntIdx), parse_constraints(Cs, Constraints),
        Case = case(sat, IntIdx, Constraints)
    ;   Parts = ["E", Ints, Ps, C]
    ->  parse_ints(Ints, IntIdx), parse_constraints(Ps, Premises),
        parse_constraint(C, Claim),
        Case = case(entailed, IntIdx, Premises, Claim)
    ;   throw(error(cannot_parse_case(Line), _))
    ).

parse_ints("", []) :- !.
parse_ints(S, Ints) :-
    split_string(S, ",", "", Parts),
    maplist(number_string, Ints, Parts).

parse_constraints("", []) :- !.
parse_constraints(S, Cs) :-
    split_string(S, ",", "", Parts),
    maplist(parse_constraint, Parts, Cs).

parse_constraint(S, c(Op, Index, Value)) :-
    split_string(S, ":", "", [IndexS, OpS, ValueS]),
    number_string(Index, IndexS),
    atom_string(Op, OpS),
    (   split_string(ValueS, "/", "", [NS, DS])
    ->  number_string(N, NS), number_string(D, DS), Value is N rdiv D
    ;   number_string(Value, ValueS)
    ).



%% run_cases(:Decide) reads every case on standard input and prints true or
% false for each, as Decide(Case) succeeds or fails.
:- meta_predicate run_cases(1).
run_cases(Decide) :-
    read_case(user_input, Case),
    (   Case == end_of_file
    ->  true
    ;   (   call(Decide, Case) -> writeln(true) ; writeln(false) ),
        run_cases(Decide)
    ).
