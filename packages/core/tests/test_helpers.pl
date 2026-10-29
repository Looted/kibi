:- module(test_helpers, [deterministic/1]).

% Helpers shared by the plunit files. They live in a module because the
% mutation lane loads several plunit files into one process.

%% deterministic(:Goal)
% Goal succeeds without leaving a choicepoint behind.
:- meta_predicate deterministic(0).
deterministic(Goal) :-
    call_cleanup(Goal, Det = true),
    Det == true.
