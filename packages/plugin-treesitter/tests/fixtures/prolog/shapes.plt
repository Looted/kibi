:- use_module(shapes).

:- begin_tests(area).

near(X, Y) :- abs(X - Y) < 1.0e-9.

test(square) :-
    area(square(2), 4).
test(circle, [true(near(A, 3.141592653589793))]) :-
    area(circle(1), A).

:- end_tests(area).

:- begin_tests(describe, [setup(true)]).

test(square) :-
    phrase(describe(square), [shape(square)]).

:- end_tests(describe).
