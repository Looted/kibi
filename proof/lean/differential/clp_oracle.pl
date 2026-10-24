% An independent oracle for the same cases: real variables go to CLP(Q),
% integer variables to CLP(FD), and every constraint of a case is posted at
% once.  A disequality on a real variable is the disjunction of the two strict
% inequalities, searched by backtracking.  Entailment is unsatisfiability of
% the premises with the negated claim.
:- use_module(cases).
:- use_module(library(clpq)).
:- use_module(library(clpfd)).

:- initialization(main, main).

main :- run_cases(decide).

decide(case(sat, Ints, Cs)) :-
    satisfiable(Ints, Cs).
decide(case(entailed, Ints, Ps, c(Op, I, V))) :-
    negated(Op, Neg),
    \+ satisfiable(Ints, [c(Neg, I, V)|Ps]).

negated(eq, neq).
negated(neq, eq).
negated(lt, gte).
negated(gte, lt).
negated(lte, gt).
negated(gt, lte).

satisfiable(Ints, Cs) :-
    \+ \+ ( post(Cs, Ints, [], Lookup), label_integers(Lookup, Ints) ).

post([], _, Lookup, Lookup).
post([c(Op, I, V0)|Cs], Ints, Lookup0, Lookup) :-
    V is rational(V0),
    (   memberchk(I-X, Lookup0) -> Lookup1 = Lookup0 ; Lookup1 = [I-X|Lookup0] ),
    (   memberchk(I, Ints) -> post_int(Op, X, V) ; post_real(Op, X, V) ),
    post(Cs, Ints, Lookup1, Lookup).

post_real(eq, X, V) :- {X =:= V}.
post_real(neq, X, V) :- ( {X < V} ; {X > V} ).
post_real(lt, X, V) :- {X < V}.
post_real(lte, X, V) :- {X =< V}.
post_real(gt, X, V) :- {X > V}.
post_real(gte, X, V) :- {X >= V}.

% X op N/D with D > 0 is D*X op N.
post_int(Op, X, V) :-
    N is numerator(V), D is denominator(V),
    post_fd(Op, D*X, N).

post_fd(eq, L, R) :- L #= R.
post_fd(neq, L, R) :- L #\= R.
post_fd(lt, L, R) :- L #< R.
post_fd(lte, L, R) :- L #=< R.
post_fd(gt, L, R) :- L #> R.
post_fd(gte, L, R) :- L #>= R.

% A bounded integer variable is labelled to one value; an unbounded one
% keeps infinitely many values after unary constraints.
label_integers(Lookup, Ints) :-
    forall(( member(I, Ints), memberchk(I-X, Lookup) ),
           (   fd_size(X, sup) -> true ; once(label([X])) )).
