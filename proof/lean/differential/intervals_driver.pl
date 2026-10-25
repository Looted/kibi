% Runs intervals.pl, the code under test, on each case.
:- use_module(cases).

:- initialization(main, main).

main :-
    getenv('KIBI_INTERVALS_PL', Path),
    use_module(Path),
    run_cases(decide).

decide(case(sat, Ints, Cs)) :-
    bind(Cs, [], Terms, Lookup),
    integer_vars(Ints, Lookup, IntVars),
    intervals:numeric_constraints_satisfiable(Terms, IntVars).
decide(case(entailed, Ints, Ps, C)) :-
    bind([C|Ps], [], [Claim|Premises], Lookup),
    integer_vars(Ints, Lookup, IntVars),
    intervals:numeric_constraint_entailed(Premises, Claim, IntVars).

bind([], Lookup, [], Lookup).
bind([c(Op, I, V)|Cs], Lookup0, [c(Op, X, V)|Ts], Lookup) :-
    (   memberchk(I-X, Lookup0) -> Lookup1 = Lookup0 ; Lookup1 = [I-X|Lookup0] ),
    bind(Cs, Lookup1, Ts, Lookup).

% Not findall/3: it would copy the variables.
integer_vars([], _, []).
integer_vars([I|Is], Lookup, Vars) :-
    (   memberchk(I-X, Lookup) -> Vars = [X|Rest] ; Vars = Rest ),
    integer_vars(Is, Lookup, Rest).
