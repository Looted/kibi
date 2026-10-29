:- use_module(library(plunit)).
:- use_module('../src/intervals.pl').
:- use_module(test_helpers).

% Real-valued satisfiability of a list of Op-Value bounds on one variable.
real_sat(Bounds) :-
    constraints(Bounds, _, Constraints),
    deterministic(numeric_constraints_satisfiable(Constraints)).

% Integer-valued satisfiability of a list of Op-Value bounds on one variable.
int_sat(Bounds) :-
    constraints(Bounds, X, Constraints),
    deterministic(numeric_constraints_satisfiable(Constraints, [X])).

constraints(Bounds, X, Constraints) :-
    maplist(bound_constraint(X), Bounds, Constraints).

bound_constraint(X, Op-Value, c(Op, X, Value)).

:- begin_tests(intervals_reals).

test(empty_conjunction_is_satisfiable) :-
    real_sat([]).

test(single_bounds_are_satisfiable) :-
    forall(member(Op, [eq, neq, lt, lte, gt, gte]), real_sat([Op-1])).

test(open_interval_between_bounds) :-
    real_sat([gt-1, lt-2]),
    real_sat([lt-2, gt-1]).

test(crossed_bounds_are_unsatisfiable, [fail]) :-
    real_sat([gt-2, lt-1]).

test(crossed_bounds_in_reverse_order_are_unsatisfiable, [fail]) :-
    real_sat([lt-1, gt-2]).

test(closed_point_is_satisfiable) :-
    real_sat([gte-1, lte-1]),
    real_sat([lte-1, gte-1]),
    real_sat([eq-1, lte-1.0]),
    real_sat([eq-1, gte-1.0]),
    real_sat([eq-1, eq-1]).

test(half_open_point_is_unsatisfiable_from_the_low_side, [fail]) :-
    real_sat([gte-1, lt-1]).

test(half_open_point_is_unsatisfiable_from_the_high_side, [fail]) :-
    real_sat([gt-1, lte-1]).

test(strict_low_after_closed_low_tightens, [fail]) :-
    real_sat([gte-1, gt-1, lte-1]).

test(closed_low_after_strict_low_stays_strict, [fail]) :-
    real_sat([gt-1, gte-1, lte-1]).

test(strict_high_after_closed_high_tightens, [fail]) :-
    real_sat([lte-1, lt-1, gte-1]).

test(closed_high_after_strict_high_stays_strict, [fail]) :-
    real_sat([lt-1, lte-1, gte-1]).

test(repeated_closed_bounds_stay_closed) :-
    real_sat([gte-1, gte-1, lte-1, lte-1]).

test(looser_bound_keeps_the_closed_kind) :-
    real_sat([gte-5, gt-3, lte-5]),
    real_sat([lte-5, lt-7, gte-5]).

test(mixed_kinds_at_one_bound_make_it_open) :-
    real_sat([gte-1, gt-1, lt-2]),
    real_sat([lte-2, lt-2, gt-1]).

test(looser_low_bound_is_ignored, [fail]) :-
    real_sat([gt-5, gt-3, lt-4]).

test(tighter_low_bound_replaces_the_old_one, [fail]) :-
    real_sat([gt-3, gt-5, lt-4]).

test(looser_high_bound_is_ignored, [fail]) :-
    real_sat([lt-3, lt-5, gt-4]).

test(tighter_high_bound_replaces_the_old_one, [fail]) :-
    real_sat([lt-5, lt-3, gt-4]).

test(different_equalities_are_unsatisfiable, [fail]) :-
    real_sat([eq-1, eq-2]).

test(equality_outside_a_bound_is_unsatisfiable, [fail]) :-
    real_sat([lt-1, eq-2]).

test(equality_below_a_low_bound_is_unsatisfiable, [fail]) :-
    real_sat([gt-3, eq-2]).

test(excluded_point_empties_a_closed_point, [fail]) :-
    real_sat([eq-1, neq-1]).

test(excluded_point_matched_numerically, [fail]) :-
    real_sat([eq-1, neq-1.0]).

test(other_excluded_points_leave_a_closed_point) :-
    real_sat([eq-1, neq-2, neq-0]).

test(excluded_point_cannot_empty_an_open_interval) :-
    real_sat([gt-0, lt-2, neq-1]),
    real_sat([neq-1]),
    real_sat([gt-0, neq-1]),
    real_sat([lt-0, neq-(-1)]).

test(variables_are_independent) :-
    numeric_constraints_satisfiable([c(gt, X, 1), c(lt, Y, 0)]),
    var(X), var(Y).

test(one_unsatisfiable_variable_fails_the_conjunction, [fail]) :-
    numeric_constraints_satisfiable([c(gt, _, 1), c(gt, Y, 1), c(lt, Y, 0)]).

:- end_tests(intervals_reals).

:- begin_tests(intervals_integers).

test(no_integer_strictly_between_neighbours, [fail]) :-
    int_sat([gt-0, lt-1]).

test(reals_do_fit_between_neighbours) :-
    real_sat([gt-0, lt-1]).

test(fractional_equality_has_no_integer_solution, [fail]) :-
    int_sat([eq-0.5]).

test(fractional_equality_empties_later_bounds, [fail]) :-
    int_sat([eq-0.5, gte-0]).

test(integral_equality_is_satisfiable) :-
    int_sat([eq-2]),
    int_sat([eq-2.0]),
    int_sat([eq-2, gte-2, lte-2]).

test(integral_equalities_must_agree, [fail]) :-
    int_sat([eq-2, eq-3]).

test(equality_below_a_low_bound_is_unsatisfiable, [fail]) :-
    int_sat([gte-3, eq-2]).

test(equality_above_a_high_bound_is_unsatisfiable, [fail]) :-
    int_sat([lte-1, eq-2]).

test(fractional_exclusion_is_ignored) :-
    int_sat([eq-1, neq-0.5]).

test(integral_exclusion_empties_a_single_integer, [fail]) :-
    int_sat([gte-1, lte-1, neq-1]).

test(integral_float_exclusion_empties_a_single_integer, [fail]) :-
    int_sat([gte-1, lte-1, neq-1.0]).

test(one_exclusion_leaves_the_other_integer) :-
    int_sat([gte-1, lte-2, neq-1]),
    int_sat([gte-1, lte-2, neq-1, neq-1]).

test(two_exclusions_empty_two_integers, [fail]) :-
    int_sat([gte-1, lte-2, neq-1, neq-2]).

test(exclusions_outside_the_range_do_not_count) :-
    int_sat([gte-1, lte-1, neq-0]),
    int_sat([gte-1, lte-1, neq-2]).

test(unbounded_integer_ranges_survive_exclusions) :-
    int_sat([neq-1]),
    int_sat([gte-0, neq-0, neq-1]),
    int_sat([lte-0, neq-0, neq-(-1)]).

test(strict_low_rounds_up_past_a_fraction) :-
    int_sat([gt-1.5, lte-2]),
    \+ int_sat([gt-1.5, lt-2]).

test(strict_low_skips_an_integer_bound, [fail]) :-
    int_sat([gt-1, lte-1]).

test(closed_low_rounds_up) :-
    int_sat([gte-1.5, lte-2]),
    \+ int_sat([gte-1.5, lte-1.9]).

test(closed_low_keeps_an_integer_bound) :-
    int_sat([gte-1, lte-1]).

test(strict_high_rounds_down_past_a_fraction) :-
    int_sat([lt-2.5, gte-2]),
    \+ int_sat([lt-2.5, gt-2]).

test(strict_high_skips_an_integer_bound, [fail]) :-
    int_sat([lt-2, gte-2]).

test(closed_high_rounds_down) :-
    int_sat([lte-2.5, gte-2]),
    \+ int_sat([lte-2.5, gte-2.1]).

test(looser_integer_low_bound_is_ignored, [fail]) :-
    int_sat([gte-5, gte-3, lte-4]).

test(looser_integer_high_bound_is_ignored, [fail]) :-
    int_sat([lte-3, lte-5, gte-4]).

test(all_makes_every_variable_integral, [fail]) :-
    numeric_constraints_satisfiable([c(gt, X, 0), c(lt, X, 1)], all).

test(only_listed_variables_are_integral) :-
    numeric_constraints_satisfiable([c(gt, X, 0), c(lt, X, 1), c(gte, Y, 0)], [Y]),
    \+ numeric_constraints_satisfiable([c(gt, X, 0), c(lt, X, 1)], [Y, X]),
    var(X), var(Y).

test(non_list_integer_variables_mean_none) :-
    numeric_constraints_satisfiable([c(gt, X, 0), c(lt, X, 1)], none),
    numeric_constraints_satisfiable([c(gt, X, 0), c(lt, X, 1)], [X|_]),
    var(X).

test(non_numeric_exclusion_is_ignored_for_integers) :-
    int_sat([neq-abc]),
    int_sat([gte-1, lte-1, neq-abc]).

:- end_tests(intervals_integers).

:- begin_tests(intervals_entailment).

test(stronger_premise_entails_weaker_bound) :-
    deterministic(numeric_constraint_entailed([c(gt, X, 5)], c(gt, X, 3))).

test(weaker_premise_does_not_entail_stronger_bound, [fail]) :-
    numeric_constraint_entailed([c(gt, X, 3)], c(gt, X, 5)).

test(integer_premise_entails_the_next_integer) :-
    numeric_constraint_entailed([c(gt, X, 0)], c(gte, X, 1), [X]),
    \+ numeric_constraint_entailed([c(gt, X, 0)], c(gte, X, 1)).

test(contradictory_premises_entail_anything) :-
    numeric_constraint_entailed([c(gt, X, 1), c(lt, X, 0)], c(eq, X, 42)).

test(negates_every_operator) :-
    findall(Op-Neg, ( member(Op, [eq, neq, lt, gte, lte, gt]),
                      deterministic(numeric_constraint_negation(c(Op, x, 1), c(Neg, x, 1))) ),
            Pairs),
    Pairs == [eq-neq, neq-eq, lt-gte, gte-lt, lte-gt, gt-lte].

test(unknown_operator_has_no_negation, [fail]) :-
    numeric_constraint_negation(c(between, x, 1), _).

:- end_tests(intervals_entailment).

:- begin_tests(intervals_holds).

test(evaluates_every_operator) :-
    findall(Op-L-R, ( member(Op, [eq, neq, lt, lte, gt, gte]),
                      member(L-R, [1-2, 2-2, 3-2, 2-2.0]),
                      deterministic(numeric_constraint_holds(Op, L, R)) ),
            Holding),
    Holding == [eq-2-2, eq-2-2.0,
                neq-1-2, neq-3-2,
                lt-1-2,
                lte-1-2, lte-2-2, lte-2-2.0,
                gt-3-2,
                gte-2-2, gte-3-2, gte-2-2.0].

:- end_tests(intervals_holds).

:- begin_tests(intervals_finiteness).

test(nan_bound_is_a_domain_error, [error(domain_error(finite_number, _))]) :-
    X is nan,
    numeric_constraints_satisfiable([c(lt, _, X)]).

test(infinite_bound_is_a_domain_error, [error(domain_error(finite_number, _))]) :-
    X is inf,
    numeric_constraints_satisfiable([c(gte, Y, 0), c(lt, Y, X)]).

test(negative_infinite_bound_is_a_domain_error, [error(domain_error(finite_number, _))]) :-
    X is -inf,
    numeric_constraint_entailed([c(gt, Y, X)], c(gt, Y, 0)).

test(finite_float_bounds_are_accepted) :-
    numeric_constraints_satisfiable([c(gt, Y, 0.5), c(lt, Y, 1.5)]).

:- end_tests(intervals_finiteness).
