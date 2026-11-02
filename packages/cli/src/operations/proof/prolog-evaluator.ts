/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

/**
 * The SWI-Prolog evaluator behind the code proof kinds. Kibi runs it with the
 * SWI-Prolog it resolves for its own engine (KIBI_SWIPL, the bundled runtime,
 * then swipl on PATH). It loads the file a symbol names (a module, or a plain
 * file into user) and reads a predicate named by its indicator: a domain is
 * the distinct solutions of one argument (`arg`, or the only one), a value is
 * the single number such a solution holds, a rule predicate is called once
 * per row and decides it by success or failure, and a transition table lists
 * every solution as an edge. The plan is the last command-line argument; the
 * answer is the last line of output, in the JSON the JavaScript and Python
 * evaluators print.
 */
// implements REQ-kibi-multilingual-code-proofs
export const PROLOG_EVALUATOR = String.raw`
:- module(kibi_proof_evaluator, []).
:- use_module(library(http/json)).
:- use_module(library(apply)).
:- use_module(library(lists)).
:- use_module(library(pairs)).

:- initialization(main, main).

:- dynamic loaded_module/2.

main :-
    current_prolog_flag(argv, Argv),
    last(Argv, PlanText),
    atom_json_dict(PlanText, Plan, [value_string_as(string)]),
    (   catch(run(Plan, Out), Error, (failure_text(Error, Text), failed(Plan, Text, Out)))
    ->  true
    ;   failed(Plan, "the evaluation failed", Out)
    ),
    nl,
    json_write_dict(current_output, Out, [width(0)]),
    nl.

failed(Plan, Text, _{error: Text}) :- Plan.mode == "export", !.
failed(_, Text, _{ok: false, error: Text}).

failure_text(kibi(Text), Text) :- !.
failure_text(Error, Text) :-
    catch('$messages':translate_message(Error, Lines, []), _, fail),
    !,
    with_output_to(string(Raw), print_message_lines(current_output, '', Lines)),
    split_string(Raw, "", "\n ", [Text]).
failure_text(Error, Text) :- format(string(Text), "~q", [Error]).

refuse(Format, Args) :- format(string(Text), Format, Args), throw(kibi(Text)).

% The module a file defines, loaded once; user for a plain file.
module_of(File, Module) :- loaded_module(File, Module), !.
module_of(File, Module) :-
    atom_string(Path, File),
    load_files(user:Path, [if(not_loaded), silent(true)]),
    absolute_file_name(Path, Absolute, [file_type(prolog), access(read)]),
    (   module_property(Defined, file(Absolute)) -> Module = Defined ; Module = user ),
    assertz(loaded_module(File, Module)).

% A predicate indicator: Name/Arity, Name//Arity (a DCG rule) or Module:Indicator.
indicator(Text, Default, Module, Name, Arity) :-
    catch(term_string(Term, Text), _, refuse("~s is not a predicate indicator Name/Arity", [Text])),
    indicator_term(Term, Text, Default, Module, Name, Arity).

indicator_term(Module:Term, Text, _, Found, Name, Arity) :- atom(Module), !,
    indicator_term(Term, Text, Module, Found, Name, Arity).
indicator_term(Name/Arity, _, Module, Module, Name, Arity) :- atom(Name), integer(Arity), Arity >= 0, !.
indicator_term(Name//Rule, _, Module, Module, Name, Arity) :- atom(Name), integer(Rule), Rule >= 0, !,
    Arity is Rule + 2.
indicator_term(_, Text, _, _, _, _) :- refuse("~s is not a predicate indicator Name/Arity", [Text]).

% The goal behind a reference, after checking the predicate is defined.
predicate(Ref, Module, Head, Name, Arity) :-
    module_of(Ref.file, Default),
    indicator(Ref.export, Default, Module, Name, Arity),
    functor(Head, Name, Arity),
    (   predicate_property(Module:Head, defined) -> true
    ;   refuse("~s is not defined in ~s", [Ref.export, Ref.file])
    ).

% The argument a reference projects its solutions on: arg, or the only one.
projected(Ref, Arity, Index) :-
    (   get_dict(arg, Ref, Index)
    ->  (   integer(Index), Index >= 1, Index =< Arity -> true
        ;   refuse("arg ~w is not an argument of ~s", [Index, Ref.export])
        )
    ;   Arity =:= 1
    ->  Index = 1
    ;   Arity =:= 0
    ->  refuse("~s takes no argument to list", [Ref.export])
    ;   refuse("~s has ~w arguments; set arg to the one that names each member", [Ref.export, Arity])
    ).

limit_solutions(100000).

% The distinct solutions of a reference's projected argument, in order.
values(Ref, Values) :-
    predicate(Ref, Module, Head, _, Arity),
    projected(Ref, Arity, Index),
    arg(Index, Head, Value),
    limit_solutions(Limit),
    Over is Limit + 1,
    findall(Value, limit(Over, Module:Head), All),
    length(All, Count),
    (   Count > Limit -> refuse("~s has more than ~w solutions", [Ref.export, Limit]) ; true ),
    (   member(Open, All), \+ ground(Open)
    ->  refuse("a solution of ~s leaves argument ~w unbound", [Ref.export, Index])
    ;   true
    ),
    list_to_set(All, Values).

text(Value, Text) :- string(Value), !, Text = Value.
text(Value, Text) :- atom(Value), !, atom_string(Value, Text).
text(Value, Text) :- number(Value), !, number_string(Value, Text).
text(Value, Text) :- format(string(Text), "~q", [Value]).

run(Plan, Out) :- Plan.mode == "export", !, export(Plan, Out).
run(Plan, _{ok: true, model: Model}) :- Plan.mode == "table", !, table(Plan, Model).
run(Plan, _{ok: true, model: Model}) :- Plan.mode == "machine", !, machine(Plan, Model).
run(Plan, _{ok: true, model: Model}) :- Plan.mode == "pattern", !, pattern(Plan.pattern, Model).
run(Plan, _) :- refuse("unknown plan mode ~w", [Plan.mode]).

% A domain lists its members; a value is the single number a constant holds.
export(Plan, Out) :-
    values(Plan.ref, Values),
    (   Plan.want == "scalar"
    ->  (   Values = [Number], number(Number)
        ->  Out = _{scalar: Number}
        ;   Values = [Other]
        ->  refuse("~s holds ~q, not a number", [Plan.ref.export, Other])
        ;   length(Values, Count),
            refuse("~s has ~w solutions, not the single value of a constant", [Plan.ref.export, Count])
        )
    ;   length(Values, Count),
        maplist(text, Values, Members),
        Out = _{count: Count, members: Members}
    ).

domain(Ref, Values) :- get_dict(values, Ref, Texts), !, maplist(atom_string, Values, Texts).
domain(Ref, Values) :- values(Ref, Values).

table(Plan, _{domains: Domains, predicates: Predicates}) :-
    dict_pairs(Plan.domains, _, DomainRefs),
    findall(Type-Values, (member(Type-Ref, DomainRefs), domain(Ref, Values)), Typed),
    findall(Type-Texts, (member(Type-Values, Typed), maplist(text, Values, Texts)), DomainTexts),
    dict_pairs(Domains, _, DomainTexts),
    dict_pairs(Plan.predicates, _, PredicateRefs),
    foldl(predicate_table(Typed, Plan.limit), PredicateRefs, []-0, Reversed-_),
    reverse(Reversed, Rows),
    dict_pairs(Predicates, _, Rows).

predicate_table(Typed, Limit, Name-Ref, Done-Used, [Name-Rows|Done]-Total) :-
    predicate(Ref, Module, Head, _, Arity),
    length(Ref.arg_types, Types),
    (   Types =:= Arity -> true
    ;   refuse("~s takes ~w arguments, but the predicate ~w has ~w argument types", [Ref.export, Arity, Name, Types])
    ),
    findall(Values,
            ( member(TypeText, Ref.arg_types),
              atom_string(Type, TypeText),
              (   memberchk(Type-Values, Typed) -> true
              ;   refuse("no domain for argument type ~s of ~w", [TypeText, Name])
              )
            ),
            Lists),
    foldl([List, P0, P]>>(length(List, L), P is P0 * L), Lists, 1, Count),
    Total is Used + Count,
    (   Total > Limit -> refuse("the predicate tables need more than ~w calls", [Limit]) ; true ),
    findall(Row, (maplist(member, Tuple, Lists), row(Module, Head, Tuple, Row)), Rows).

row(Module, Head, Tuple, Row) :-
    copy_term(Head, Goal),
    Goal =.. [_|Tuple],
    maplist(text, Tuple, Args),
    catch(( once(Module:Goal) -> Row = _{args: Args, value: true} ; Row = _{args: Args, value: false} ),
          Error,
          ( failure_text(Error, Text), Row = _{args: Args, error: Text} )).

% A transition table: Name/2 facts (from, to), Name/3 facts (from, event,
% to), or with state and event domains a Name/3 next-state predicate Kibi
% calls on every state and event.
machine(Plan, Model) :-
    Ref = Plan.transitions,
    predicate(Ref, Module, Head, _, Arity),
    (   get_dict(domains, Plan, Domains)
    ->  (   Arity =:= 3 -> true ; refuse("~s must take a state, an event and the next state", [Ref.export]) ),
        values(Domains.state, States0),
        values(Domains.event, Events),
        findall(From-To,
                ( member(From, States0), member(Event, Events),
                  Head =.. [_, From, Event, To],
                  catch(Module:Head, _, fail)
                ),
                Edges)
    ;   Arity =:= 2
    ->  Head =.. [_, From, To],
        findall(From-To, Module:Head, Edges),
        States0 = []
    ;   Arity =:= 3
    ->  Head =.. [_, From, _, To],
        findall(From-To, Module:Head, Edges),
        States0 = []
    ;   refuse("~s is not a transition table Name/2 or Name/3", [Ref.export])
    ),
    (   member(Edge, Edges), \+ ground(Edge) -> refuse("a transition of ~s leaves a state unbound", [Ref.export]) ; true ),
    findall(Text, (member(State, States0), text(State, Text)), Listed),
    findall([FromText, ToText], (member(F-T, Edges), text(F, FromText), text(T, ToText)), Pairs0),
    sort(Pairs0, Pairs),
    findall(S, (member([A, B], Pairs), member(S, [A, B])), Ends),
    append(Listed, Ends, AllStates),
    sort(AllStates, StateTexts),
    Base = _{states: StateTexts, transitions: Pairs},
    (   get_dict(initial, Plan, Initial), Initial \== null
    ->  values(Initial, InitialValues),
        maplist(text, InitialValues, InitialTexts0),
        sort(InitialTexts0, InitialTexts),
        Model = Base.put(initial, InitialTexts)
    ;   Model = Base
    ).

% A pattern constant: the single atom or string a Name/1 fact holds.
pattern(Ref, _{type: "string", value: Text}) :-
    values(Ref, Values),
    (   Values = [Value], (atom(Value) ; string(Value))
    ->  text(Value, Text)
    ;   Values = [Other]
    ->  refuse("~s holds ~q, not an atom or a string", [Ref.export, Other])
    ;   length(Values, Count),
        refuse("~s has ~w solutions, not the single pattern of a constant", [Ref.export, Count])
    ).
`;
