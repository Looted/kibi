:- module(test_helpers, [deterministic/1, first_answer_is_last/1, same/2]).

% Helpers shared by the plunit files. They live in a module because the
% mutation lane loads several plunit files into one process.

%% deterministic(:Goal)
% Goal succeeds without leaving a choicepoint behind.
:- meta_predicate deterministic(0).
deterministic(Goal) :-
    call_cleanup(Goal, Det = true),
    Det == true.

%% first_answer_is_last(:Goal)
% Goal's first answer leaves no choicepoint. Unlike deterministic/1 it never
% backtracks into Goal for a later answer.
:- meta_predicate first_answer_is_last(0).
first_answer_is_last(Goal) :-
    call_cleanup(Goal, Det = true),
    (   var(Det) -> Left = choicepoint ; Left = none ),
    !,
    Left == none.

%% same(+Actual, +Expected)
% Actual and Expected are equal (==), comparing dicts by their keys and
% values at any depth and ignoring their tags.
same(Actual, Expected) :-
    plain(Actual, Plain),
    plain(Expected, Plain0),
    Plain == Plain0.

plain(Dict, Plain) :-
    is_dict(Dict),
    !,
    dict_pairs(Dict, _, Pairs),
    findall(Key-PlainValue, (member(Key-Value, Pairs), plain(Value, PlainValue)), Plain0),
    Plain = dict(Plain0).
plain(List, Plain) :-
    is_list(List),
    !,
    maplist(plain, List, Plain).
plain(Term, Term).
