% implements REQ-kibi-truthful-consistency
%
% Exact satisfiability for one-variable numeric comparisons.
%
% A constraint is c(Op, Variable, Value) where Op is one of eq, neq, lt, lte,
% gt, gte and Value is a number.  Variables are ordinary Prolog variables and
% are compared by identity, never bound.  Each variable's constraints describe
% a set of reals; the conjunction is satisfiable exactly when every set is
% non-empty.  Integers, floats and strict bounds are handled without scaling
% or labelling, so the answer is exact and terminates in linear time.
:- module(intervals, [
    numeric_constraints_satisfiable/1,
    numeric_constraint_entailed/2,
    numeric_constraint_negation/2,
    numeric_constraint_holds/3
]).

%% numeric_constraints_satisfiable(+Constraints)
% True when some assignment of reals satisfies every constraint.
numeric_constraints_satisfiable(Constraints) :-
    term_variables(Constraints, Variables),
    forall(member(Variable, Variables), variable_feasible(Variable, Constraints)).

%% numeric_constraint_entailed(+Premises, +Constraint)
% True when every assignment that satisfies Premises satisfies Constraint.
numeric_constraint_entailed(Premises, Constraint) :-
    numeric_constraint_negation(Constraint, Negated),
    \+ numeric_constraints_satisfiable([Negated|Premises]).

%% numeric_constraint_negation(+Constraint, -Negated)
numeric_constraint_negation(c(Op, Variable, Value), c(Negated, Variable, Value)) :-
    negated_operator(Op, Negated).

negated_operator(eq, neq).
negated_operator(neq, eq).
negated_operator(lt, gte).
negated_operator(gte, lt).
negated_operator(lte, gt).
negated_operator(gt, lte).

%% numeric_constraint_holds(+Op, +Left, +Right)
% Evaluate a comparison between two numbers.
numeric_constraint_holds(eq, Left, Right) :- Left =:= Right.
numeric_constraint_holds(neq, Left, Right) :- Left =\= Right.
numeric_constraint_holds(lt, Left, Right) :- Left < Right.
numeric_constraint_holds(lte, Left, Right) :- Left =< Right.
numeric_constraint_holds(gt, Left, Right) :- Left > Right.
numeric_constraint_holds(gte, Left, Right) :- Left >= Right.

variable_feasible(Variable, Constraints) :-
    findall(Op-Value, (member(c(Op, Other, Value), Constraints), Other == Variable), Bounds),
    foldl(apply_bound, Bounds, interval(ninf, open, pinf, open, []), Interval),
    interval_non_empty(Interval).

% interval(Low, LowKind, High, HighKind, Excluded)
apply_bound(eq-Value, interval(Lo, LoK, Hi, HiK, Ex), interval(Lo1, LoK1, Hi1, HiK1, Ex)) :-
    raise_low(Lo, LoK, Value, closed, Lo1, LoK1),
    lower_high(Hi, HiK, Value, closed, Hi1, HiK1).
apply_bound(neq-Value, interval(Lo, LoK, Hi, HiK, Ex), interval(Lo, LoK, Hi, HiK, [Value|Ex])).
apply_bound(lt-Value, interval(Lo, LoK, Hi, HiK, Ex), interval(Lo, LoK, Hi1, HiK1, Ex)) :-
    lower_high(Hi, HiK, Value, open, Hi1, HiK1).
apply_bound(lte-Value, interval(Lo, LoK, Hi, HiK, Ex), interval(Lo, LoK, Hi1, HiK1, Ex)) :-
    lower_high(Hi, HiK, Value, closed, Hi1, HiK1).
apply_bound(gt-Value, interval(Lo, LoK, Hi, HiK, Ex), interval(Lo1, LoK1, Hi, HiK, Ex)) :-
    raise_low(Lo, LoK, Value, open, Lo1, LoK1).
apply_bound(gte-Value, interval(Lo, LoK, Hi, HiK, Ex), interval(Lo1, LoK1, Hi, HiK, Ex)) :-
    raise_low(Lo, LoK, Value, closed, Lo1, LoK1).

raise_low(ninf, _, Value, Kind, Value, Kind) :- !.
raise_low(Lo, _, Value, Kind, Value, Kind) :- Value > Lo, !.
raise_low(Lo, LoK, Value, Kind, Lo, Kind1) :- Value =:= Lo, !, tighter_kind(LoK, Kind, Kind1).
raise_low(Lo, LoK, _, _, Lo, LoK).

lower_high(pinf, _, Value, Kind, Value, Kind) :- !.
lower_high(Hi, _, Value, Kind, Value, Kind) :- Value < Hi, !.
lower_high(Hi, HiK, Value, Kind, Hi, Kind1) :- Value =:= Hi, !, tighter_kind(HiK, Kind, Kind1).
lower_high(Hi, HiK, _, _, Hi, HiK).

tighter_kind(closed, closed, closed) :- !.
tighter_kind(_, _, open).

% An unbounded or non-degenerate real interval cannot be emptied by finitely
% many excluded points.  A degenerate interval is a single closed point.
interval_non_empty(interval(ninf, _, _, _, _)) :- !.
interval_non_empty(interval(_, _, pinf, _, _)) :- !.
interval_non_empty(interval(Lo, _, Hi, _, _)) :- Lo < Hi, !.
interval_non_empty(interval(Lo, closed, Hi, closed, Excluded)) :-
    Lo =:= Hi,
    \+ ( member(Value, Excluded), Value =:= Lo ).
