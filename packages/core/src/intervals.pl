% implements REQ-kibi-truthful-consistency
%
% Exact satisfiability for one-variable numeric comparisons.
%
% A constraint is c(Op, Variable, Value) where Op is one of eq, neq, lt, lte,
% gt, gte and Value is a number.  Variables are ordinary Prolog variables and
% are compared by identity, never bound.  Each variable ranges over the reals
% unless the caller names it as integer-valued; the conjunction is
% satisfiable exactly when every variable's set is non-empty.  Strict bounds,
% non-integer bounds on integer variables and excluded points are handled
% without scaling or labelling, so the answer is exact and terminates in
% linear time.
:- module(intervals, [
    numeric_constraints_satisfiable/1,
    numeric_constraints_satisfiable/2,
    numeric_constraint_entailed/2,
    numeric_constraint_entailed/3,
    numeric_constraint_negation/2,
    numeric_constraint_holds/3
]).

%% numeric_constraints_satisfiable(+Constraints)
% True when some assignment of reals satisfies every constraint.
numeric_constraints_satisfiable(Constraints) :-
    numeric_constraints_satisfiable(Constraints, []).

%% numeric_constraints_satisfiable(+Constraints, +IntegerVariables)
% As numeric_constraints_satisfiable/1, but every variable in
% IntegerVariables (compared by identity) ranges over the integers: no
% integer lies strictly between 0 and 1, and eq 0.5 has no integer solution.
% IntegerVariables may also be the atom `all`, making every variable integral.
numeric_constraints_satisfiable(Constraints, IntegerVariables) :-
    term_variables(Constraints, Variables),
    forall(
        member(Variable, Variables),
        (   integer_variable(Variable, IntegerVariables)
        ->  integer_variable_feasible(Variable, Constraints)
        ;   variable_feasible(Variable, Constraints)
        )
    ).

%% numeric_constraint_entailed(+Premises, +Constraint)
% True when every assignment that satisfies Premises satisfies Constraint.
numeric_constraint_entailed(Premises, Constraint) :-
    numeric_constraint_entailed(Premises, Constraint, []).

%% numeric_constraint_entailed(+Premises, +Constraint, +IntegerVariables)
numeric_constraint_entailed(Premises, Constraint, IntegerVariables) :-
    numeric_constraint_negation(Constraint, Negated),
    \+ numeric_constraints_satisfiable([Negated|Premises], IntegerVariables).

integer_variable(_, all) :- !.
integer_variable(Variable, IntegerVariables) :-
    is_list(IntegerVariables),
    member(Candidate, IntegerVariables),
    Candidate == Variable,
    !.

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

% Integer variables: every strict or fractional bound is tightened to the
% nearest admissible integer, so the set is an integer range [Lo, Hi] minus
% finitely many excluded integers.  An eq bound with a fractional value admits
% no integer at all.
integer_variable_feasible(Variable, Constraints) :-
    findall(Op-Value, (member(c(Op, Other, Value), Constraints), Other == Variable), Bounds),
    foldl(apply_integer_bound, Bounds, ibox(ninf, pinf, []), Box),
    integer_box_non_empty(Box).

apply_integer_bound(_, empty, empty) :- !.
apply_integer_bound(eq-Value, ibox(Lo, Hi, Ex), Box) :- !,
    (   integral_value(Value, Integer)
    ->  integer_raise_low(Lo, Integer, Lo1),
        integer_lower_high(Hi, Integer, Hi1),
        Box = ibox(Lo1, Hi1, Ex)
    ;   Box = empty
    ).
apply_integer_bound(neq-Value, ibox(Lo, Hi, Ex), ibox(Lo, Hi, Ex1)) :- !,
    (   integral_value(Value, Integer)
    ->  Ex1 = [Integer|Ex]
    ;   Ex1 = Ex
    ).
apply_integer_bound(gt-Value, ibox(Lo, Hi, Ex), ibox(Lo1, Hi, Ex)) :- !,
    Bound is floor(Value) + 1,
    integer_raise_low(Lo, Bound, Lo1).
apply_integer_bound(gte-Value, ibox(Lo, Hi, Ex), ibox(Lo1, Hi, Ex)) :- !,
    Bound is ceiling(Value),
    integer_raise_low(Lo, Bound, Lo1).
apply_integer_bound(lt-Value, ibox(Lo, Hi, Ex), ibox(Lo, Hi1, Ex)) :- !,
    Bound is ceiling(Value) - 1,
    integer_lower_high(Hi, Bound, Hi1).
apply_integer_bound(lte-Value, ibox(Lo, Hi, Ex), ibox(Lo, Hi1, Ex)) :- !,
    Bound is floor(Value),
    integer_lower_high(Hi, Bound, Hi1).

integral_value(Value, Integer) :-
    number(Value),
    Integer is round(Value),
    Integer =:= Value.

integer_raise_low(ninf, Bound, Bound) :- !.
integer_raise_low(Lo, Bound, Lo1) :- Lo1 is max(Lo, Bound).

integer_lower_high(pinf, Bound, Bound) :- !.
integer_lower_high(Hi, Bound, Hi1) :- Hi1 is min(Hi, Bound).

% An unbounded integer range cannot be emptied by finitely many exclusions.
integer_box_non_empty(empty) :- !, fail.
integer_box_non_empty(ibox(ninf, _, _)) :- !.
integer_box_non_empty(ibox(_, pinf, _)) :- !.
integer_box_non_empty(ibox(Lo, Hi, Excluded)) :-
    Lo =< Hi,
    findall(Value, (member(Value, Excluded), Value >= Lo, Value =< Hi), Inside0),
    sort(Inside0, Inside),
    length(Inside, ExcludedCount),
    Hi - Lo + 1 > ExcludedCount.
