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
 * The SWI-Prolog reader behind the `references` reader for `.pl` and `.plt`
 * files and the `prolog` source reader. It reads terms with read_term/3 and
 * runs none of the project's code: operators come from the file's own op/3
 * directives and module export lists, those of project modules it loads
 * (read from their module header) and those of the SWI-Prolog libraries it
 * loads. `references` mode walks clause bodies and directives through
 * control constructs and meta-predicate arguments (the file's own
 * meta_predicate declarations and SWI-Prolog's), and reports every place it
 * cannot read statically: a variable called as a goal or closure, a goal
 * qualified by a variable module, a clause asserted from data and
 * conditional compilation. `terms` mode lists one argument of every fact
 * with a given functor, in file order.
 */
// implements REQ-kibi-prolog-source-readers
export const PROLOG_SOURCE_READER = String.raw`
:- module(kibi_source_reader, []).
:- use_module(library(http/json)).
:- use_module(library(apply)).
:- use_module(library(lists)).

:- initialization(main, main).

:- dynamic member_found/1, unresolved_found/3, local_meta/2, local_pred/2.

main :-
    current_prolog_flag(argv, Argv),
    last(Argv, PlanText),
    atom_json_dict(PlanText, Plan, [value_string_as(string)]),
    (   catch(run(Plan, Out), Error, (failure_text(Error, Text), Out = _{ok: false, error: Text}))
    ->  true
    ;   Out = _{ok: false, error: "the read failed"}
    ),
    nl,
    json_write_dict(current_output, Out, [width(0)]),
    nl.

failure_text(kibi(Text), Text) :- !.
failure_text(Error, Text) :-
    catch('$messages':translate_message(Error, Lines, []), _, fail),
    !,
    with_output_to(string(Raw), print_message_lines(current_output, '', Lines)),
    split_string(Raw, "", "\n ", [Text]).
failure_text(Error, Text) :- format(string(Text), "~q", [Error]).

refuse(Format, Args) :- format(string(Text), Format, Args), throw(kibi(Text)).

text(Value, Text) :- string(Value), !, Text = Value.
text(Value, Text) :- atom(Value), !, atom_string(Value, Text).
text(Value, Text) :- number(Value), !, number_string(Value, Text).
text(Value, Text) :- format(string(Text), "~q", [Value]).

% ------------------------------------------------------------------------
% Reading a file's terms without running it.

% clause(Term, Line, Bindings) for every term of File, in order. Operators the
% file declares (op/3 directives and its module export list) and those of the
% system libraries it loads apply while reading; nothing in the file runs.
file_terms(File, Terms) :-
    atom_string(Path, File),
    (   exists_file(Path) -> true ; refuse("~s does not exist", [File]) ),
    gensym(kibi_read_, Module),
    setup_call_cleanup(
        open(Path, read, Stream, [encoding(utf8)]),
        read_all(Stream, File, Module, Terms),
        close(Stream)).

read_all(Stream, File, Module, Terms) :-
    catch(read_term(Stream, Term,
                    [ module(Module), term_position(Position),
                      variable_names(Bindings), syntax_errors(error) ]),
          Error,
          syntax_refusal(File, Error)),
    (   Term == end_of_file
    ->  Terms = []
    ;   stream_position_data(line_count, Position, Line),
        declare_operators(Term, File, Module),
        Terms = [term(Term, Line, Bindings)|Rest],
        read_all(Stream, File, Module, Rest)
    ).

syntax_refusal(File, error(syntax_error(What), Context)) :- !,
    (   compound(Context), arg(2, Context, Line), integer(Line) -> true ; Line = "?" ),
    refuse("~s:~w is not valid Prolog Kibi can read (~w)", [File, Line, What]).
syntax_refusal(_, Error) :- throw(Error).

declare_operators((:- Directive), File, Module) :- !,
    declare_directive(Directive, File, Module).
declare_operators(_, _, _).

declare_directive(op(P, T, N), _, Module) :- !, catch(Module:op(P, T, N), _, true).
declare_directive(module(_, Exports), _, Module) :- !, export_operators(Exports, Module).
declare_directive(Load, File, Module) :-
    load_directive(Load, Specs), !,
    forall(member(Spec, Specs), spec_operators(Spec, File, Module)).
declare_directive(_, _, _).

export_operators(Exports, Module) :-
    is_list(Exports), !,
    forall(member(op(P, T, N), Exports), catch(Module:op(P, T, N), _, true)).
export_operators(_, _).

% A system library brings its operators by loading it into the reading module
% (SWI-Prolog's own code, not the project's). A project module brings the
% operators its export list declares, read from its first term.
spec_operators(Spec, _, Module) :-
    nonvar(Spec), Spec = library(_), !,
    catch(Module:use_module(Spec), _, true).
spec_operators(Spec, File, Module) :-
    project_file(Spec, File, Path), !,
    catch(setup_call_cleanup(
              open(Path, read, Stream),
              ( read_term(Stream, First, [module(Module), syntax_errors(quiet)]),
                (   First = (:- module(_, Exports)) -> export_operators(Exports, Module) ; true )
              ),
              close(Stream)),
          _, true).
spec_operators(_, _, _).

project_file(Spec, File, Path) :-
    (   atom(Spec) ; string(Spec) ), !,
    atom_string(Atom, Spec),
    atom_string(FromAtom, File),
    file_directory_name(FromAtom, Directory),
    directory_file_path(Directory, Atom, Base),
    (   exists_file(Base) -> Path = Base
    ;   member(Extension, ['.pl', '.plt', '.prolog']),
        atom_concat(Base, Extension, Path),
        exists_file(Path)
    ), !.

% The load directives and the specs they name.
load_directive(use_module(S), [S]).
load_directive(use_module(S, _), [S]).
load_directive(ensure_loaded(S), [S]).
load_directive(consult(S), Specs) :- spec_list(S, Specs).
load_directive(reexport(S), [S]).
load_directive(reexport(S, _), [S]).
load_directive(load_files(S), Specs) :- spec_list(S, Specs).
load_directive(load_files(S, _), Specs) :- spec_list(S, Specs).
load_directive(include(S), [S]).
load_directive(use_foreign_library(S), [S]).
load_directive(use_foreign_library(S, _), [S]).
load_directive(List, List) :- is_list(List), List \== [].

spec_list(S, S) :- is_list(S), !.
spec_list(S, [S]).

conditional(if(_)).
conditional(elif(_)).
conditional(else).
conditional(endif).

% ------------------------------------------------------------------------
% The references reader.

run(Plan, _{ok: true, members: Members, unresolved: Unresolved}) :-
    Plan.mode == "references", !,
    retractall(member_found(_)), retractall(unresolved_found(_, _, _)),
    retractall(local_meta(_, _)), retractall(local_pred(_, _)),
    findall(File-Terms, (member(File, Plan.files), file_terms(File, Terms)), Files),
    forall(member(_-Terms, Files), collect_local(Terms)),
    Extract = Plan.extract,
    (   get_dict(callee, Plan, Callee) -> true ; Callee = "" ),
    forall(member(File-Terms, Files),
           forall(member(term(Term, Line, Bindings), Terms),
                  references(Extract, Callee, File, Line, Bindings, Term))),
    findall(Row, unresolved_row(Row), Unresolved),
    findall(M, member_found(M), Members).
run(Plan, _{ok: true, members: Members, sequence: Sequence}) :-
    Plan.mode == "terms", !,
    file_terms(Plan.file, Terms),
    functor_spec(Plan.functor, Name, Arity),
    (   get_dict(arg, Plan, Index) -> true ; Index = default ),
    argument_index(Index, Plan.functor, Arity, At),
    findall(Value-Line,
            ( member(term(Term, Line, _), Terms),
              Term \= (:- _), Term \= (_ :- _), Term \= (_ --> _),
              functor(Term, Name, Arity),
              term_value(At, Term, Value) ),
            Rows),
    findall(Text,
            ( member(Value-Line, Rows),
              term_members(Value, Line, Plan.file, Text) ),
            Sequence),
    sort(Sequence, Members).
run(Plan, _) :- refuse("unknown plan mode ~w", [Plan.mode]).

unresolved_row(_{file: File, line: Line, text: Text}) :- unresolved_found(File, Line, Text).

% Predicates the files define, and their meta_predicate declarations.
collect_local(Terms) :-
    forall(member(term(Term, _, _), Terms), collect_local_term(Term)).

collect_local_term((:- meta_predicate(Specs))) :- !,
    forall(comma_member(Spec, Specs),
           ( Spec = _:Head -> true ; Head = Spec ),
           ( functor(Head, N, A), assertz(local_meta(N/A, Head)) )).
collect_local_term((:- _)) :- !.
collect_local_term((Head --> _)) :- !,
    (   callable(Head) -> head_name(Head, N, A0), A is A0 + 2, assertz(local_pred(N, A)) ; true ).
collect_local_term((Head :- _)) :- !,
    (   callable(Head) -> head_name(Head, N, A), assertz(local_pred(N, A)) ; true ).
collect_local_term(Head) :-
    (   callable(Head) -> head_name(Head, N, A), assertz(local_pred(N, A)) ; true ).

head_name(_:Head, N, A) :- !, head_name(Head, N, A).
head_name((Head, _), N, A) :- !, head_name(Head, N, A).
head_name(Head, N, A) :- functor(Head, N, A).

comma_member(X, (A, B)) :- !, ( comma_member(X, A) ; comma_member(X, B) ).
comma_member(X, X).

found(Member) :- ( member_found(Member) -> true ; assertz(member_found(Member)) ).

miss(File, Line, Bindings, Goal) :-
    format(string(Text0), "~W", [Goal, [quoted(true), variable_names(Bindings), max_depth(6)]]),
    sub_string_max(Text0, 80, Text),
    assertz(unresolved_found(File, Line, Text)).

sub_string_max(Text, Max, Out) :-
    string_length(Text, Length),
    (   Length =< Max -> Out = Text ; sub_string(Text, 0, Max, _, Out) ).

% references(+Extract, +Callee, +File, +Line, +Bindings, +Term)
references(Extract, Callee, File, Line, Bindings, (:- Directive)) :- !,
    (   conditional(Directive)
    ->  miss(File, Line, Bindings, (:- Directive))
    ;   load_directive(Directive, _)
    ->  (   Extract == "imports"
        ->  directive_imports(Directive, File, Line, Bindings)
        ;   Extract == "calls", \+ is_list(Directive)
        ->  extract("calls", Callee, File, Line, Bindings, none, Directive)
        ;   true
        )
    ;   directive_goal(Directive)
    ->  true
    ;   body(Extract, Callee, File, Line, Bindings, none, Directive)
    ).
references(Extract, Callee, File, Line, Bindings, (_ --> Body)) :- !,
    dcg_body(Extract, Callee, File, Line, Bindings, Body).
references(Extract, Callee, File, Line, Bindings, (_ :- Body)) :- !,
    body(Extract, Callee, File, Line, Bindings, none, Body).
references(_, _, _, _, _, _).

% Declarations that are not goals.
directive_goal(module(_, _)).
directive_goal(meta_predicate(_)).
directive_goal(dynamic(_)).
directive_goal(discontiguous(_)).
directive_goal(multifile(_)).
directive_goal(module_transparent(_)).
directive_goal(table(_)).
directive_goal(op(_, _, _)).
directive_goal(set_prolog_flag(_, _)).
directive_goal(license(_)).
directive_goal(Load) :- load_directive(Load, _).

directive_imports(Directive, File, Line, Bindings) :-
    load_directive(Directive, Specs), !,
    forall(member(Spec, Specs), import_spec(Spec, File, Line, Bindings, Directive)).
directive_imports(_, _, _, _).

import_spec(Spec, File, Line, Bindings, Directive) :-
    (   ground(Spec)
    ->  text(Spec, Text), found(Text)
    ;   miss(File, Line, Bindings, (:- Directive))
    ).

% A grammar rule body: terminals call nothing, {Goal} is a goal, and a
% non-terminal Name//N is the call Name/(N+2).
dcg_body(_, _, F, L, B, Body) :- var(Body), !, miss(F, L, B, phrase(Body)).
dcg_body(E, C, F, L, B, (X, Y)) :- !, dcg_body(E, C, F, L, B, X), dcg_body(E, C, F, L, B, Y).
dcg_body(E, C, F, L, B, (X ; Y)) :- !, dcg_body(E, C, F, L, B, X), dcg_body(E, C, F, L, B, Y).
dcg_body(E, C, F, L, B, (X | Y)) :- !, dcg_body(E, C, F, L, B, X), dcg_body(E, C, F, L, B, Y).
dcg_body(E, C, F, L, B, (X -> Y)) :- !, dcg_body(E, C, F, L, B, X), dcg_body(E, C, F, L, B, Y).
dcg_body(E, C, F, L, B, \+ X) :- !, dcg_body(E, C, F, L, B, X).
dcg_body(E, C, F, L, B, {Goal}) :- !, body(E, C, F, L, B, none, Goal).
dcg_body(_, _, _, _, _, !) :- !.
dcg_body(_, _, _, _, _, []) :- !.
dcg_body(_, _, _, _, _, List) :- is_list(List), !.
dcg_body(_, _, _, _, _, Text) :- string(Text), !.
dcg_body(E, C, F, L, B, call(Closure)) :- !, closure(E, C, F, L, B, none, 2, call(Closure), Closure).
dcg_body(E, C, F, L, B, Call) :-
    Call =.. [call, Closure|Args], !,
    length(Args, N), Extra is N + 2,
    closure(E, C, F, L, B, none, Extra, Call, Closure).
dcg_body(E, C, F, L, B, Module:NonTerminal) :- !,
    (   atom(Module), callable(NonTerminal)
    ->  extend(NonTerminal, 2, Called), qualified(E, C, F, L, B, none, Module, Called)
    ;   miss(F, L, B, Module:NonTerminal)
    ).
dcg_body(E, C, F, L, B, NonTerminal) :-
    callable(NonTerminal), !,
    extend(NonTerminal, 2, Called),
    body(E, C, F, L, B, none, Called).
dcg_body(_, _, F, L, B, Body) :- miss(F, L, B, Body).

% body(+Extract, +Callee, +File, +Line, +Bindings, +Catcher, +Goal)
body(_, _, File, Line, Bindings, _, Goal) :- var(Goal), !, miss(File, Line, Bindings, call(Goal)).
body(E, C, F, L, B, K, (A, Z)) :- !, body(E, C, F, L, B, K, A), body(E, C, F, L, B, K, Z).
body(E, C, F, L, B, K, (A ; Z)) :- !, body(E, C, F, L, B, K, A), body(E, C, F, L, B, K, Z).
body(E, C, F, L, B, K, (A -> Z)) :- !, body(E, C, F, L, B, K, A), body(E, C, F, L, B, K, Z).
body(E, C, F, L, B, K, (A *-> Z)) :- !, body(E, C, F, L, B, K, A), body(E, C, F, L, B, K, Z).
body(E, C, F, L, B, K, \+ A) :- !, body(E, C, F, L, B, K, A).
body(E, C, F, L, B, K, Module:Goal) :- !,
    (   atom(Module), callable(Goal)
    ->  qualified(E, C, F, L, B, K, Module, Goal)
    ;   miss(F, L, B, Module:Goal)
    ).
body(E, C, F, L, B, K, catch(Goal, Catcher, Recovery)) :- !,
    record_call(E, C, F, L, B, K, catch(Goal, Catcher, Recovery)),
    body(E, C, F, L, B, K, Goal),
    body(E, C, F, L, B, Catcher, Recovery).
body(E, C, F, L, B, K, Goal) :-
    callable(Goal), !,
    record_call(E, C, F, L, B, K, Goal),
    meta_arguments(E, C, F, L, B, K, Goal).
body(_, _, F, L, B, _, Goal) :- miss(F, L, B, Goal).

qualified(E, C, F, L, B, K, Module, Goal) :-
    functor(Goal, Name, Arity),
    (   E == "calls" -> format(string(M), "~w:~w/~w", [Module, Name, Arity]), found(M)
    ;   record_call(E, C, F, L, B, K, Goal)
    ),
    meta_arguments(E, C, F, L, B, K, Goal).

% The arguments a meta-predicate calls, walked as goals (0) or closures (N).
meta_arguments(E, C, F, L, B, K, Goal) :-
    meta_spec(Goal, Spec), !,
    Goal =.. [_|Args], Spec =.. [_|Kinds],
    forall(nth1(I, Kinds, Kind), meta_argument(E, C, F, L, B, K, Kind, Goal, I, Args)).
meta_arguments(_, _, _, _, _, _, _).

meta_argument(E, C, F, L, B, K, Kind, Goal, I, Args) :-
    nth1(I, Args, Arg),
    (   Kind == 0
    ->  body(E, C, F, L, B, K, Arg)
    ;   Kind == ^
    ->  strip_carets(Arg, Inner), body(E, C, F, L, B, K, Inner)
    ;   Kind == //
    ->  closure(E, C, F, L, B, K, 2, Goal, Arg)
    ;   integer(Kind)
    ->  closure(E, C, F, L, B, K, Kind, Goal, Arg)
    ;   true
    ).

strip_carets(V, V) :- var(V), !.
strip_carets(_^G, I) :- !, strip_carets(G, I).
strip_carets(G, G).

% A closure called with Extra more arguments: a lambda's body is walked, a
% named closure is the call it makes once the arguments are added.
closure(_, _, F, L, B, _, _, Goal, Closure) :- var(Closure), !, miss(F, L, B, Goal).
closure(E, C, F, L, B, K, _, _, _Params>>Lambda) :- !, lambda_body(Lambda, Body), body(E, C, F, L, B, K, Body).
closure(E, C, F, L, B, K, Extra, Goal, Module:Closure) :- !,
    (   atom(Module), callable(Closure)
    ->  extend(Closure, Extra, Called), qualified(E, C, F, L, B, K, Module, Called)
    ;   miss(F, L, B, Goal)
    ).
closure(E, C, F, L, B, K, Extra, _, Closure) :-
    callable(Closure), !,
    extend(Closure, Extra, Called),
    body(E, C, F, L, B, K, Called).
closure(_, _, F, L, B, _, _, Goal, _) :- miss(F, L, B, Goal).

lambda_body(_/Body, Body) :- !.
lambda_body(Body, Body).

extend(Closure, Extra, Called) :-
    Closure =.. List,
    length(More, Extra),
    append(List, More, Full),
    Called =.. Full.

meta_spec(Goal, Spec) :-
    functor(Goal, Name, Arity),
    (   local_meta(Name/Arity, Spec)
    ->  true
    ;   local_pred(Name, Arity)
    ->  fail
    ;   catch(predicate_property(kibi_source_reader:Goal, meta_predicate(Spec)), _, fail)
    ).

% Goals that run a term built from data are refused: the clause asserted or
% the goal passed is not known statically.
data_goal(assert(_)). data_goal(asserta(_)). data_goal(assertz(_)).
data_goal(asserta(_, _)). data_goal(assertz(_, _)).

record_call(E, C, F, L, B, K, Goal) :-
    (   E == "calls", data_goal(Goal), arg(1, Goal, Clause), \+ static_clause(Clause)
    ->  miss(F, L, B, Goal)
    ;   true
    ),
    extract(E, C, F, L, B, K, Goal).

static_clause(Clause) :-
    nonvar(Clause),
    (   Clause = (Head :- Body) -> nonvar(Head), nonvar(Body) ; true ).

control(call/_).
control(','/2). control(';'/2). control('->'/2). control('*->'/2). control('\\+'/1).

extract("calls", _, _, _, _, _, Goal) :- !,
    functor(Goal, Name, Arity),
    (   control(Name/Arity) -> true
    ;   format(string(M), "~w/~w", [Name, Arity]), found(M)
    ).
extract("env", _, F, L, B, _, Goal) :-
    Goal = getenv(Name, _), !,
    (   atomic(Name) -> text(Name, T), found(T) ; miss(F, L, B, Goal) ).
extract("string_args", Callee, F, L, B, _, Goal) :-
    callee_matches(Callee, Goal), !,
    arg(1, Goal, First),
    (   ( atom(First) ; string(First) ) -> text(First, T), found(T) ; miss(F, L, B, Goal) ).
extract("thrown", _, F, L, B, Catcher, Goal) :-
    Goal = throw(Ball), !,
    (   Ball == Catcher, Catcher \== none
    ->  true
    ;   var(Ball)
    ->  miss(F, L, B, Goal)
    ;   thrown_name(Ball, Name)
    ->  found(Name)
    ;   miss(F, L, B, Goal)
    ).
extract("thrown", _, _, _, _, _, Goal) :-
    functor(Goal, Name, Arity),
    error_helper(Name/Arity), !,
    atom_string(Name, Text), found(Text).
extract("imports", _, F, L, B, _, Goal) :-
    load_directive(Goal, _), \+ is_list(Goal), !,
    directive_imports(Goal, F, L, B).
extract(_, _, _, _, _, _, _).

thrown_name(error(Formal, _), Name) :- !, nonvar(Formal), functor(Formal, N, _), atom_string(N, Name).
thrown_name(Ball, Name) :- functor(Ball, N, _), atom_string(N, Name).

error_helper(type_error/2). error_helper(domain_error/2). error_helper(existence_error/2).
error_helper(existence_error/3). error_helper(permission_error/3). error_helper(instantiation_error/1).
error_helper(uninstantiation_error/1). error_helper(representation_error/1).
error_helper(resource_error/1). error_helper(syntax_error/1).

callee_matches(Callee, Goal) :-
    functor(Goal, Name, Arity),
    Arity >= 1,
    (   atom_string(Name, Callee)
    ->  true
    ;   format(string(Indicator), "~w/~w", [Name, Arity]), Indicator == Callee
    ).

% ------------------------------------------------------------------------
% The terms reader.

functor_spec(Text, Name, Arity) :-
    catch(term_string(Term, Text), _, fail),
    Term = Name/Arity, atom(Name), integer(Arity), Arity >= 0, !.
functor_spec(Text, _, _) :- refuse("functor ~s is not Name/Arity", [Text]).

argument_index(default, _, 0, none) :- !.
argument_index(default, _, 1, 1) :- !.
argument_index(default, Text, Arity, _) :- !,
    refuse("~s has ~w arguments; set arg to the one that holds each member", [Text, Arity]).
argument_index(Index, Text, Arity, Index) :-
    (   integer(Index), Index >= 1, Index =< Arity -> true
    ;   refuse("arg ~w is not an argument of ~s", [Index, Text])
    ).

term_value(none, Term, Name) :- !, functor(Term, Name, _).
term_value(Index, Term, Value) :- arg(Index, Term, Value).

term_members(Value, Line, File, _) :-
    \+ ground(Value), !,
    refuse("~s:~w holds a value with a variable, which is not a member", [File, Line]).
term_members(Value, _, _, Text) :-
    is_list(Value), !, member(Item, Value), text(Item, Text).
term_members(Value, _, _, Text) :- text(Value, Text).
`;
