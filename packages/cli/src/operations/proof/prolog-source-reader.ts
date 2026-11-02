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
 * meta_predicate declarations and SWI-Prolog's), the goals ~@ calls in
 * format strings and message lines, and the bodies of clauses
 * asserted from literal terms, and reports every place it cannot read
 * statically: a variable called as a goal or closure, a goal qualified by a
 * variable module, a clause asserted from data, conditional compilation, a
 * term_expansion or goal_expansion clause in the files or in a project file
 * they load (expansion can produce any clause), and an include of a file
 * outside the files read. `terms` mode lists one argument of every fact with
 * a given functor, in file order.
 */
// implements REQ-kibi-prolog-source-readers
export const PROLOG_SOURCE_READER = String.raw`
:- module(kibi_source_reader, []).
:- use_module(library(http/json)).
:- use_module(library(apply)).
:- use_module(library(lists)).

:- initialization(main, main).

:- dynamic member_found/1, unresolved_found/3, local_meta/2, local_pred/2, plan_file/1, expands_checked/2,
            file_module/2, loaded_meta/2, loaded_export/1, loaded_read/1, search_dir/2, search_via/3, search_unread/3,
            in_message_rule/0.

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
file_terms(File, Terms) :- file_terms(File, Terms, _).

file_terms(File, Terms, Module) :-
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
        search_declaration(File, Line, Term),
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
              (   read_term(Stream, First, [module(Module), syntax_errors(quiet)]),
                  First = (:- module(_, Exports))
              ->  export_operators(Exports, Module)
              ;   true
              ),
              close(Stream)),
          _, true).
spec_operators(_, _, _).

project_file(Spec, _, Path) :-
    alias_spec(Spec, _), !,
    alias_target(Spec, Path).
project_file(Spec, File, Path) :-
    path_spec(Spec, Atom), !,
    atom_string(FromAtom, File),
    file_directory_name(FromAtom, Directory),
    directory_file_path(Directory, Atom, Base),
    (   exists_file(Base) -> Path = Base
    ;   member(Extension, ['.pl', '.plt', '.prolog']),
        atom_concat(Base, Extension, Path),
        exists_file(Path)
    ), !.

% Alias(Path) with an alias SWI-Prolog does not define itself (library,
% foreign, swi, pack and the rest), such as bson(include/common) after a
% file_search_path/2 the project sets up. Kibi runs none of that setup: the
% alias resolves only through the file_search_path declarations of the files
% read that it can evaluate (see search_declaration/3), and only when they
% name exactly one existing file. A file that merely ends with Path (a
% vendored copy, or one next to a target under node_modules or outside the
% project) is never taken for the file the alias names.
alias_spec(Spec, Rel) :- alias_spec(Spec, _, Rel).

alias_spec(Spec, Alias, Rel) :-
    compound(Spec), Spec =.. [Alias, Rel], atom(Alias),
    \+ memberchk(Alias, [/, :, -]),
    \+ system_alias(Alias),
    path_spec(Rel, _).

system_alias(Alias) :- user:file_search_path(Alias, _), !.

alias_target(Spec, Path) :-
    alias_spec(Spec, Alias, Rel),
    alias_resolution(Alias, Rel, found([Path])).

% found(Files): the existing files the declared directories hold for Rel.
% undeclared(Alias), unread(File, Line), through(Alias): why there are none.
alias_resolution(Alias, Rel, Result) :-
    catch(( alias_dirs(Alias, [Alias], Dirs),
            path_spec(Rel, Atom),
            findall(Abs,
                    ( member(Dir, Dirs),
                      directory_file_path(Dir, Atom, Base),
                      member(Extension, ['', '.pl', '.plt', '.prolog']),
                      atom_concat(Base, Extension, Path),
                      exists_file(Path),
                      absolute_file_name(Path, Abs) ),
                    Found0),
            sort(Found0, Found),
            Result = found(Found) ),
          alias_problem(Problem), Result = Problem).

alias_dirs(Alias, Seen, Dirs) :-
    (   ( search_unread(Alias, File, Line) ; search_unread('$any', File, Line) )
    ->  throw(alias_problem(unread(File, Line)))
    ;   true
    ),
    findall(Dir, search_dir(Alias, Dir), Own),
    findall(Via-Sub, search_via(Alias, Via, Sub), Vias),
    (   Own == [], Vias == [] -> throw(alias_problem(undeclared(Alias))) ; true ),
    findall(Dir, ( member(Via-Sub, Vias), via_dir(Via, Sub, Seen, Dir) ), Through),
    append(Own, Through, Dirs).

% file_search_path(bson, base(sub)): through another alias the files declare.
% One SWI-Prolog defines (library, pack, app) lies outside the project.
via_dir(Via, Sub, Seen, Dir) :-
    (   ( memberchk(Via, Seen) ; system_alias(Via) ) -> throw(alias_problem(through(Via))) ; true ),
    alias_dirs(Via, [Via|Seen], Dirs),
    member(Base, Dirs),
    directory_file_path(Base, Sub, Dir).

% The file_search_path/2 declarations of a file read: a fact or clause for
% file_search_path/2 (user: or not), or a directive that asserts one. Kibi
% evaluates prolog_load_context(directory, D) (the declaring file's
% directory), directory_file_path/3 and atom_concat/3 on known atoms; the
% directory must then be absolute, or Alias(Sub) of another alias. Any other
% declaration (a relative directory, which depends on the working directory
% at run time, or one computed otherwise) leaves its alias unresolved.
search_declaration(File, Line, Term) :-
    atom_string(Atom, File), absolute_file_name(Atom, Abs), plan_file(Abs), !,
    findall(Alias,
            ( sub_term(Sub, Term), compound(Sub), Sub = file_search_path(A, _),
              ( atom(A) -> Alias = A ; Alias = '$any' ) ),
            Aliases0),
    sort(Aliases0, Aliases),
    file_directory_name(Abs, Here),
    forall(member(Alias, Aliases),
           (   Alias \== '$any', search_values(Term, Alias, Here, Values)
           ->  forall(member(Value, Values), assertz(Value))
           ;   assertz(search_unread(Alias, File, Line))
           )).
search_declaration(_, _, _).

search_values((:- Body), Alias, Here, Values) :- !,
    copy_term(Body, Goals0),
    conjunction_goals(Goals0, Goals),
    search_goals(Goals, Here, Alias, Values),
    Values \== [].
search_values((Head :- Body), Alias, Here, [Value]) :- !,
    copy_term(Head-Body, H-B),
    search_head(H, Alias, Dir),
    conjunction_goals(B, Goals),
    search_goals(Goals, Here, Alias, []),
    search_value(Alias, Dir, Value).
search_values(Head, Alias, _, [Value]) :-
    copy_term(Head, H),
    search_head(H, Alias, Dir),
    search_value(Alias, Dir, Value).

search_head(user:file_search_path(Alias, Dir), Alias, Dir) :- !.
search_head(file_search_path(Alias, Dir), Alias, Dir).

conjunction_goals(Body, Goals) :-
    nonvar(Body), Body = (A, B), !,
    conjunction_goals(A, GA), conjunction_goals(B, GB), append(GA, GB, Goals).
conjunction_goals(Body, [Body]) :- nonvar(Body).

% Evaluate the goals in order; the declarations they assert for Alias.
search_goals([], _, _, []).
search_goals([Goal|Goals], Here, Alias, Values) :-
    search_goal(Goal, Here, Alias, Own),
    search_goals(Goals, Here, Alias, Rest),
    append(Own, Rest, Values).

search_goal(prolog_load_context(directory, Dir), Here, _, []) :- !, var(Dir), Dir = Here.
search_goal(directory_file_path(D, F, P), _, _, []) :- !,
    atomic(D), atomic(F), var(P), directory_file_path(D, F, P).
search_goal(atom_concat(A, B, C), _, _, []) :- !,
    atomic(A), atomic(B), var(C), atom_concat(A, B, C).
search_goal(Assert, _, Alias, Values) :-
    nonvar(Assert), memberchk(Assert, [assert(H), asserta(H), assertz(H)]), !,
    nonvar(H), search_head(H, Name, Dir), atom(Name),
    (   Name == Alias -> search_value(Alias, Dir, Value), Values = [Value] ; Values = [] ).

search_value(Alias, Dir, search_dir(Alias, Abs)) :-
    ( atom(Dir) ; string(Dir) ), !,
    atom_string(Abs0, Dir), is_absolute_file_name(Abs0),
    absolute_file_name(Abs0, Abs).
search_value(Alias, Spec, search_via(Alias, Via, Sub)) :-
    compound(Spec), Spec =.. [Via, Rel], atom(Via), Via \== Alias,
    \+ memberchk(Via, [/, :, -]),
    path_spec(Rel, Sub).

% A workspace file as the files: list names it.
shown_path(Abs, Shown) :-
    working_directory(Dir, Dir),
    (   atom_concat(Dir, Relative, Abs) -> Shown = Relative ; Shown = Abs ).

% A file no files: pattern can name: outside the workspace, or under a
% directory proofs never read.
unreadable_place(Abs, Shown) :-
    (   Abs == Shown
    ->  true
    ;   atomic_list_concat(Parts, /, Shown),
        member(Part, Parts), memberchk(Part, [node_modules, '.git', '.kb'])
    ), !.

% Why an aliased load does not resolve, and what would resolve it. A file is
% named to add to files: only when it is the one the declarations resolve to.
alias_note(Spec, Note) :-
    alias_spec(Spec, Alias, Rel),
    path_spec(Rel, Atom),
    alias_resolution(Alias, Rel, Result),
    alias_result_note(Result, Alias, Atom, Note).

alias_result_note(undeclared(Name), Alias, Atom, Note) :-
    format(string(Note), "no file Kibi reads declares file_search_path(~w, Dir), so Kibi cannot tell which file ~w(~w) names (a file that ends with ~w is not taken for it); add the file that declares it to files:", [Name, Alias, Atom, Atom]).
alias_result_note(unread(File, Line), Alias, Atom, Note) :-
    format(string(Note), "Kibi cannot evaluate the file_search_path declaration at ~s:~w (a relative directory or one computed at run time), so it cannot tell which file ~w(~w) names", [File, Line, Alias, Atom]).
alias_result_note(through(Via), Alias, Atom, Note) :-
    format(string(Note), "file_search_path(~w, ...) goes through ~w, which Kibi does not resolve to a project directory, so it cannot tell which file ~w(~w) names", [Alias, Via, Alias, Atom]).
alias_result_note(found([]), Alias, Atom, Note) :-
    format(string(Note), "no directory file_search_path(~w, Dir) declares holds ~w", [Alias, Atom]).
alias_result_note(found([One]), Alias, Atom, Note) :-
    shown_path(One, Shown),
    (   unreadable_place(One, Shown)
    ->  format(string(Note), "~w(~w) names ~w, which lies outside the files Kibi reads (node_modules, .git, .kb or outside the project)", [Alias, Atom, Shown])
    ;   format(string(Note), "add ~w to files: so Kibi reads it", [Shown])
    ).
alias_result_note(found(Found), _, Atom, Note) :-
    Found = [_, _|_],
    maplist(shown_path, Found, Shown), atomic_list_concat(Shown, ', ', List),
    format(string(Note), "~w could be any of ~w, so Kibi cannot tell which file the alias names", [Atom, List]).

% What would let Kibi read a load it refuses, said after its place.
load_note(include(Spec), File, Note) :- !,
    (   nonvar(Spec), alias_spec(Spec, _)
    ->  alias_note(Spec, Note0), format(string(Note), "the included file: ~s", [Note0])
    ;   nonvar(Spec), project_file(Spec, File, Path)
    ->  absolute_file_name(Path, Abs), shown_path(Abs, Shown),
        format(string(Note), "add ~w to files: so Kibi reads the included file", [Shown])
    ;   Note = "add the included file to files: so Kibi reads it"
    ).
load_note(Directive, File, Note) :-
    load_directive(Directive, Specs),
    member(Spec, Specs), nonvar(Spec),
    (   alias_spec(Spec, _), \+ alias_target(Spec, _)
    ->  alias_note(Spec, Note)
    ;   consult_directive(Directive), project_file(Spec, File, Path), \+ module_file(Path),
        absolute_file_name(Path, Abs), \+ plan_file(Abs)
    ->  shown_path(Abs, Shown),
        format(string(Note), "add ~w to files: so Kibi reads the file it loads", [Shown])
    ),
    !.

load_refusal(File, Line, Bindings, Goal) :-
    (   ( Goal = (:- Directive) -> true ; Directive = Goal ),
        load_note(Directive, File, Note)
    ->  miss_note(File, Line, Bindings, Goal, Note)
    ;   miss(File, Line, Bindings, Goal)
    ).

% A load of Alias(Path) that names a project file Kibi cannot find.
unresolved_alias(Spec, File) :-
    alias_spec(Spec, _), \+ project_file(Spec, File, _).

% A file whose first term is a module header.
module_file(Path) :-
    catch(setup_call_cleanup(
              open(Path, read, Stream),
              read_term(Stream, First, [syntax_errors(quiet)]),
              close(Stream)),
          _, fail),
    nonvar(First), First = (:- module(_, _)).

% A relative file spec as written: helpers, 'helpers.pl' or sub/helpers.
path_spec(Spec, Atom) :- ( atom(Spec) ; string(Spec) ), !, atom_string(Atom, Spec).
path_spec(Dir/Name, Atom) :-
    path_spec(Dir, D), path_spec(Name, N),
    atomic_list_concat([D, N], /, Atom).

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
load_directive(autoload(S), [S]).
load_directive(autoload(S, _), [S]).
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
    retractall(plan_file(_)), retractall(expands_checked(_, _)),
    retractall(file_module(_, _)), retractall(loaded_meta(_, _)),
    retractall(loaded_export(_)), retractall(loaded_read(_)),
    retractall(search_dir(_, _)), retractall(search_via(_, _, _)), retractall(search_unread(_, _, _)),
    retractall(in_message_rule),
    forall(member(File, Plan.files), ( absolute_file_name(File, Abs), assertz(plan_file(Abs)) )),
    maplist(plan_terms, Plan.files, Files),
    forall(member(_-Terms, Files), collect_local(Terms)),
    forall(member(File-Terms, Files), collect_loaded(File, Terms)),
    forall(member(File-Terms, Files), expansion_misses(File, Terms)),
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

% Every file is read or the read fails: none is left out.
plan_terms(File, File-Terms) :-
    file_terms(File, Terms, Module),
    assertz(file_module(File, Module)).

% The meta_predicate declarations and exports of the project modules the
% files load (and those they reexport), so a goal handed to a project
% meta-predicate is read as one.
collect_loaded(File, Terms) :-
    forall(( member(term((:- Directive), _, _), Terms),
             load_directive(Directive, Specs), member(Spec, Specs),
             project_file(Spec, File, Path) ),
           read_loaded(Path)).

read_loaded(Path) :-
    absolute_file_name(Path, Abs),
    (   ( plan_file(Abs) ; loaded_read(Abs) )
    ->  true
    ;   assertz(loaded_read(Abs)),
        atom_string(Abs, File),
        (   catch(file_terms(File, Terms), _, fail)
        ->  forall(member(term(Term, _, _), Terms), loaded_term(Term)),
            forall(( member(term((:- Directive), _, _), Terms),
                     reexport_directive(Directive, Specs), member(Spec, Specs),
                     project_file(Spec, File, Next) ),
                   read_loaded(Next))
        ;   true
        )
    ).

reexport_directive(reexport(S), [S]).
reexport_directive(reexport(S, _), [S]).

loaded_term((:- meta_predicate(Specs))) :- !,
    forall(comma_member(Spec, Specs),
           (   ( Spec = _:Head -> true ; Head = Spec ),
               (   callable(Head) -> functor(Head, N, A), assertz(loaded_meta(N/A, Head)) ; true )
           )).
loaded_term((:- module(_, Exports))) :- is_list(Exports), !,
    forall(( member(E, Exports), nonvar(E), ( E = N/A ; E = N//A0, A is A0 + 2 ) ),
           assertz(loaded_export(N/A))).
loaded_term(_).

% Predicates the files define, and their meta_predicate declarations.
collect_local(Terms) :-
    forall(member(term(Term, _, _), Terms), collect_local_term(Term)).

collect_local_term((:- meta_predicate(Specs))) :- !,
    forall(comma_member(Spec, Specs),
           (   ( Spec = _:Head -> true ; Head = Spec ),
               (   callable(Head) -> functor(Head, N, A), assertz(local_meta(N/A, Head)) ; true )
           )).
collect_local_term((:- _)) :- !.
collect_local_term((Head --> _)) :- !,
    (   callable(Head) -> head_name(Head, N, A0), A is A0 + 2, assertz(local_pred(N, A)) ; true ).
collect_local_term((Head :- _)) :- !,
    (   callable(Head) -> head_name(Head, N, A), assertz(local_pred(N, A)) ; true ).
collect_local_term(Head) :-
    (   callable(Head) -> head_name(Head, N, A), assertz(local_pred(N, A)) ; true ).

% term_expansion/2,4 and goal_expansion/2,4 rewrite what the file defines
% into clauses Kibi never sees, so a file that defines them, or that loads a
% project file defining them, cannot be read statically.
expansion_misses(File, Terms) :-
    forall(( member(term(Term, Line, Bindings), Terms), expansion_clause(Term) ),
           miss(File, Line, Bindings, Term)),
    forall(( member(term((:- Directive), Line, Bindings), Terms),
             load_directive(Directive, Specs), member(Spec, Specs),
             project_file(Spec, File, Path), expands(Path, []) ),
           miss(File, Line, Bindings, (:- Directive))).

expansion_clause(Term) :-
    nonvar(Term), Term \= (:- _), Term \= (_ --> _),
    ( Term = (Head :- _) -> true ; Head = Term ),
    expansion_head(Head).

expansion_head(Head) :- nonvar(Head), Head = _:Inner, !, expansion_head(Inner).
expansion_head(Head) :-
    callable(Head), functor(Head, Name, Arity),
    memberchk(Name/Arity, [term_expansion/2, term_expansion/4, goal_expansion/2, goal_expansion/4]).

% A project file defines an expansion, or loads one that does; a file Kibi
% cannot read counts as one that does.
expands(Path, Seen) :-
    absolute_file_name(Path, Abs),
    (   memberchk(Abs, Seen) -> fail
    ;   expands_checked(Abs, Answer) -> Answer == true
    ;   atom_string(Path, File),
        (   catch(file_terms(File, Terms), _, fail)
        ->  (   member(term(Term, _, _), Terms), expansion_clause(Term) -> Answer = true
            ;   member(term((:- Directive), _, _), Terms), load_directive(Directive, Specs),
                member(Spec, Specs), project_file(Spec, File, Next), expands(Next, [Abs|Seen])
            ->  Answer = true
            ;   Answer = false
            )
        ;   Answer = true
        ),
        assertz(expands_checked(Abs, Answer)),
        Answer == true
    ).

% An included file is part of the including module: it is read only when it
% is one of the files read. So is a file without a module header that
% consult/1, :- [File], ensure_loaded/1 or load_files/1,2 loads: its clauses
% join the loading module. A load through an alias Kibi cannot resolve could
% bring any meta-predicate or expansion, so it fails the read too.
load_miss(include(Spec), File) :- !,
    \+ (   project_file(Spec, File, Path), absolute_file_name(Path, Abs), plan_file(Abs) ).
load_miss(Directive, File) :-
    load_directive(Directive, Specs),
    member(Spec, Specs),
    (   consult_directive(Directive) -> consult_miss(Spec, File) ; unresolved_alias(Spec, File) ),
    !.

consult_directive(consult(_)).
consult_directive(ensure_loaded(_)).
consult_directive(load_files(_)).
consult_directive(load_files(_, _)).
consult_directive(List) :- is_list(List).

consult_miss(Spec, _) :- var(Spec), !.
consult_miss(Spec, _) :- compound(Spec), functor(Spec, Alias, 1), system_alias(Alias), !, fail.
consult_miss(Spec, File) :-
    (   project_file(Spec, File, Path)
    ->  \+ module_file(Path),
        absolute_file_name(Path, Abs), \+ plan_file(Abs)
    ;   true
    ).

head_name(_:Head, N, A) :- !, head_name(Head, N, A).
head_name((Head, _), N, A) :- !, head_name(Head, N, A).
head_name(Head, N, A) :- functor(Head, N, A).

comma_member(X, (A, B)) :- !, ( comma_member(X, A) ; comma_member(X, B) ).
comma_member(X, X).

found(Member) :- ( member_found(Member) -> true ; assertz(member_found(Member)) ).

miss(File, Line, Bindings, Goal) :-
    goal_text(Goal, Bindings, Text),
    record_miss(File, Line, Text).

miss_note(File, Line, Bindings, Goal, Note) :-
    goal_text(Goal, Bindings, Text0),
    format(string(Text), "~s (~s)", [Text0, Note]),
    record_miss(File, Line, Text).

goal_text(Goal, Bindings, Text) :-
    format(string(Text0), "~W", [Goal, [quoted(true), variable_names(Bindings), max_depth(6)]]),
    sub_string_max(Text0, 80, Text).

record_miss(File, Line, Text) :-
    (   unresolved_found(File, Line, Text) -> true ; assertz(unresolved_found(File, Line, Text)) ).

sub_string_max(Text, Max, Out) :-
    string_length(Text, Length),
    (   Length =< Max -> Out = Text ; sub_string(Text, 0, Max, _, Out) ).

% references(+Extract, +Callee, +File, +Line, +Bindings, +Term)
references(Extract, Callee, File, Line, Bindings, (:- Directive)) :- !,
    (   conditional(Directive)
    ->  miss(File, Line, Bindings, (:- Directive))
    ;   load_miss(Directive, File)
    ->  load_refusal(File, Line, Bindings, (:- Directive))
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
references(Extract, Callee, File, Line, Bindings, (Head --> Body)) :- !,
    (   message_rule(Head)
    ->  setup_call_cleanup(assertz(in_message_rule),
                           dcg_body(Extract, Callee, File, Line, Bindings, none, Body),
                           retractall(in_message_rule))
    ;   dcg_body(Extract, Callee, File, Line, Bindings, none, Body)
    ).
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
    ->  normal_spec(Spec, Normal), text(Normal, Text), found(Text)
    ;   miss(File, Line, Bindings, (:- Directive))
    ).

% library("utf8") and library('http/json') are written as library(utf8) and
% library(http/json).
normal_spec(Spec, Normal) :-
    compound(Spec), Spec =.. [Alias, Arg], atom(Alias), \+ memberchk(Alias, [/, :, -]), !,
    normal_path(Arg, Path), Normal =.. [Alias, Path].
normal_spec(Spec, Spec).

normal_path(Text, Path) :-
    ( string(Text) ; atom(Text) ), !,
    atom_string(Atom, Text),
    atomic_list_concat(Parts, /, Atom),
    (   Parts = [First|Rest], First \== '', \+ memberchk('', Rest)
    ->  foldl([P, A0, A1]>>(A1 = A0/P), Rest, First, Path)
    ;   Path = Atom
    ).
normal_path(Dir/Name, D/N) :- !, normal_path(Dir, D), normal_path(Name, N).
normal_path(Path, Path).

% A grammar rule body: {Goal} is a goal, a non-terminal Name//N is the call
% Name/(N+2), and terminals call nothing, except a list element that is a
% message line whose format has ~@ (a message rule's lines are printed, and
% ~@ calls its argument). In the rules of the message hooks
% (prolog:message//1 and the rest) every element is read as a message line.
dcg_body(_, _, F, L, B, _, Body) :- var(Body), !, miss(F, L, B, phrase(Body)).
dcg_body(E, C, F, L, B, K, (X, Y)) :- !, dcg_body(E, C, F, L, B, K, X), dcg_body(E, C, F, L, B, K, Y).
dcg_body(E, C, F, L, B, K, (X ; Y)) :- !, dcg_body(E, C, F, L, B, K, X), dcg_body(E, C, F, L, B, K, Y).
dcg_body(E, C, F, L, B, K, (X | Y)) :- !, dcg_body(E, C, F, L, B, K, X), dcg_body(E, C, F, L, B, K, Y).
dcg_body(E, C, F, L, B, K, (X -> Y)) :- !, dcg_body(E, C, F, L, B, K, X), dcg_body(E, C, F, L, B, K, Y).
dcg_body(E, C, F, L, B, K, \+ X) :- !, dcg_body(E, C, F, L, B, K, X).
dcg_body(E, C, F, L, B, K, {Goal}) :- !, body(E, C, F, L, B, K, Goal).
dcg_body(_, _, _, _, _, _, !) :- !.
dcg_body(E, C, F, L, B, K, List) :- is_list(List), !,
    forall(member(Item, List), dcg_terminal(E, C, F, L, B, K, List, Item)).
dcg_body(_, _, _, _, _, _, Text) :- string(Text), !.
dcg_body(E, C, F, L, B, K, call(Closure)) :- !, closure(E, C, F, L, B, K, 2, call(Closure), Closure).
dcg_body(E, C, F, L, B, K, Call) :-
    Call =.. [call, Closure|Args], !,
    length(Args, N), Extra is N + 2,
    closure(E, C, F, L, B, K, Extra, Call, Closure).
dcg_body(E, C, F, L, B, K, Module:NonTerminal) :- !,
    (   atom(Module), callable(NonTerminal)
    ->  extend(NonTerminal, 2, Called), qualified(E, C, F, L, B, K, Module, Called)
    ;   miss(F, L, B, Module:NonTerminal)
    ).
dcg_body(E, C, F, L, B, K, NonTerminal) :-
    callable(NonTerminal), !,
    extend(NonTerminal, 2, Called),
    body(E, C, F, L, B, K, Called).
dcg_body(_, _, F, L, B, _, Body) :- miss(F, L, B, Body).

dcg_terminal(E, C, F, L, B, K, List, Item) :-
    (   in_message_rule
    ->  message_line(E, C, F, L, B, K, List, Item)
    ;   nonvar(Item), line_format(Item, Format), format_codes(Format, Codes),
        phrase(format_directives(Uses), Codes), memberchk(goal, Uses)
    ->  message_line(E, C, F, L, B, K, List, Item)
    ;   true
    ).

message_rule(Head) :-
    nonvar(Head), Head = prolog:Inner, callable(Inner),
    functor(Inner, Name, Arity),
    memberchk(Name, [message, error_message, message_context, message_location, deprecated]),
    memberchk(Arity, [1, 2]).

% The format of a message line element that is formatted with arguments.
line_format(Format-_, Format).
line_format(ansi(_, Format, _), Format).
line_format(ansi(_, Format, _, _), Format).
line_format(prefix(Inner), Format) :- nonvar(Inner), line_format(Inner, Format).
line_format(url(_, Label), Format) :- nonvar(Label), line_format(Label, Format).

% The message lines print_message_lines/3 prints: each element is read as a
% format call; a list Kibi cannot see to its end fails the read.
message_lines(_, _, F, L, B, _, Goal, Lines) :- var(Lines), !, miss(F, L, B, Goal).
message_lines(_, _, _, _, _, _, _, []) :- !.
message_lines(E, C, F, L, B, K, Goal, [Line|Lines]) :- !,
    message_line(E, C, F, L, B, K, Goal, Line),
    message_lines(E, C, F, L, B, K, Goal, Lines).
message_lines(_, _, F, L, B, _, Goal, _) :- miss(F, L, B, Goal).

% One message line element, as SWI-Prolog prints it: Format-Args,
% ansi(_, Format, Args), prefix(...) and url(_, Label) are formatted, nl,
% flush, url(Location), begin/2 and end/1 print no text of the program's, and
% any other element is a format without arguments.
message_line(_, _, F, L, B, _, Goal, Line) :- var(Line), !, miss(F, L, B, Goal).
message_line(E, C, F, L, B, K, Goal, Format-Args) :- !,
    format_goals(E, C, F, L, B, K, Goal, Format, Args).
message_line(E, C, F, L, B, K, Goal, ansi(_, Format, Args)) :- !,
    format_goals(E, C, F, L, B, K, Goal, Format, Args).
message_line(E, C, F, L, B, K, Goal, ansi(_, Format, Args, _)) :- !,
    format_goals(E, C, F, L, B, K, Goal, Format, Args).
message_line(E, C, F, L, B, K, Goal, prefix(Inner)) :- !,
    message_line(E, C, F, L, B, K, Goal, Inner).
message_line(E, C, F, L, B, K, Goal, url(_, Label)) :- !,
    message_line(E, C, F, L, B, K, Goal, Label).
message_line(_, _, _, _, _, _, _, Line) :- message_data(Line), !.
message_line(E, C, F, L, B, K, Goal, Format) :-
    format_goals(E, C, F, L, B, K, Goal, Format, []).

message_data(url(_)). message_data(begin(_, _)). message_data(end(_)).
message_data(nl). message_data(flush). message_data(full_stop). message_data(at_same_line).

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
body(E, C, F, L, B, K, apply(Closure, Args)) :- !,
    record_call(E, C, F, L, B, K, apply(Closure, Args)),
    (   is_list(Args), apply_goal(Closure, Args, Goal)
    ->  body(E, C, F, L, B, K, Goal)
    ;   miss(F, L, B, apply(Closure, Args))
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
    Goal = print_message(_, Message), nonvar(Message), Message = format(Format, Args), !,
    format_goals(E, C, F, L, B, K, Goal, Format, Args).
meta_arguments(E, C, F, L, B, K, Goal) :-
    Goal = print_message_lines(_, _, Lines), \+ local_pred(print_message_lines, 3), !,
    message_lines(E, C, F, L, B, K, Goal, Lines).
meta_arguments(E, C, F, L, B, K, Goal) :-
    format_call(Goal, Format, Args), !,
    format_goals(E, C, F, L, B, K, Goal, Format, Args).
meta_arguments(E, C, F, L, B, K, Goal) :-
    meta_spec(F, Goal, Spec), !,
    Goal =.. [_|Args], Spec =.. [_|Kinds],
    forall(nth1(I, Kinds, Kind), meta_argument(E, C, F, L, B, K, Kind, Goal, I, Args)).
meta_arguments(_, _, _, _, _, _, _).

% Library predicates that format without declaring a meta argument.
format_call(ansi_format(_, Format, Args), Format, Args) :- \+ local_pred(ansi_format, 3).
format_call(sformat(_, Format, Args), Format, Args) :- \+ local_pred(sformat, 3).
format_call(sformat(_, Format), Format, []) :- \+ local_pred(sformat, 2).

meta_argument(E, C, F, L, B, K, Kind, Goal, I, Args) :-
    nth1(I, Args, Arg),
    (   Kind == 0
    ->  body(E, C, F, L, B, K, Arg)
    ;   Kind == ^
    ->  strip_carets(Arg, Inner), body(E, C, F, L, B, K, Inner)
    ;   Kind == //
    ->  grammar_argument(E, C, F, L, B, K, Goal, Arg)
    ;   integer(Kind)
    ->  closure(E, C, F, L, B, K, Kind, Goal, Arg)
    ;   Kind == (:)
    ->  colon_argument(E, C, F, L, B, K, Goal, I, Args, Arg)
    ;   true
    ).

% A module-sensitive (:) argument: the format arguments of format/2,3 and
% debug/3 (a ~@ directive calls its argument), the goal lists of
% first_solution/3 and concurrent/3, and a lambda's body are read as goals;
% the clause, predicate, file and operator specs of the declarations and
% database predicates are data. Any other (:) argument that is not [] can
% hold a goal Kibi does not know how to find, and fails the read.
colon_argument(E, C, F, L, B, K, Goal, I, Args, Arg) :-
    functor(Goal, Name, Arity),
    (   format_argument(Name/Arity, I, At)
    ->  nth1(At, Args, Format), format_goals(E, C, F, L, B, K, Goal, Format, Arg)
    ;   goal_list_argument(Name/Arity, I)
    ->  (   is_list(Arg) -> forall(member(G, Arg), body(E, C, F, L, B, K, G)) ; miss(F, L, B, Goal) )
    ;   Name == (>>), I =:= 2
    ->  lambda_body(Arg, Body), body(E, C, F, L, B, K, Body)
    ;   colon_data(Name)
    ->  true
    ;   Arg == []
    ->  true
    ;   miss(F, L, B, Goal)
    ).

format_argument(format/2, 2, 1).
format_argument(format/3, 3, 2).
format_argument(debug/3, 3, 2).
format_argument(pengine_format/2, 2, 1).

goal_list_argument(first_solution/3, 2).
goal_list_argument(concurrent/3, 2).

colon_data(Name) :-
    memberchk(Name, [ assert, asserta, assertz, retract, retractall, clause, abolish,
                      incr_assert, incr_asserta, incr_assertz, incr_retract, incr_retractall,
                      compile_predicates, current_predicate, predicate_property, det,
                      discontiguous, dynamic, multifile, module_transparent, non_terminal,
                      public, table, untable, thread_local, volatile, noprofile, listing,
                      spy, nospy, trace, tracing, lock_predicate, unlock_predicate,
                      abolish_table_subgoals, abolish_table_call, abolish_table_pred,
                      current_table, rule, source_file, consult, ensure_loaded, load_files,
                      use_module, reexport, autoload, require, use_foreign_library,
                      load_foreign_library, qcompile, compile, reconsult, open_resource,
                      current_resource, op, current_op, push_op, push_operators ]).

% The goals a format string's ~@ directives call: each directive takes its
% arguments in order (~W two, ~* one more, ~n, ~t, ~|, ~+ and ~~ none). A
% format string Kibi cannot read fails the read; without ~@ no argument is a
% goal. Arguments that are not a list are one argument, as format/2 takes them.
format_goals(E, C, F, L, B, K, Goal, Format, Args0) :-
    (   format_codes(Format, Codes), phrase(format_directives(Uses), Codes)
    ->  (   \+ memberchk(goal, Uses)
        ->  true
        ;   strip_args(Args0, Args), format_arguments(Args, List)
        ->  format_walk(E, C, F, L, B, K, Goal, Uses, List)
        ;   miss(F, L, B, Goal)
        )
    ;   strip_args(Args0, Args), format_arguments(Args, List), maplist(plain_value, List)
    ->  true
    ;   miss(F, L, B, Goal)
    ).

% A format argument that cannot be a goal, whatever the format string is.
plain_value(V) :- nonvar(V), ( number(V) ; string(V) ), !.

format_codes(Format, Codes) :-
    nonvar(Format),
    (   is_list(Format) -> catch(text_to_string(Format, S), _, fail) ; ( atom(Format) ; string(Format) ), S = Format ),
    string_codes(S, Codes).

strip_args(Args, Args) :- var(Args), !.
strip_args(M:Args, Inner) :- atom(M), !, strip_args(Args, Inner).
strip_args(Args, Args).

format_arguments(Args, _) :- var(Args), !, fail.
format_arguments(Args, Args) :- is_list(Args), !.
format_arguments(Args, _) :- Args = [_|_], !, fail.
format_arguments(Args, [Args]).

format_walk(_, _, _, _, _, _, _, [], _) :- !.
format_walk(E, C, F, L, B, K, Goal, [Use|Uses], [Arg|Args]) :- !,
    (   Use == goal -> body(E, C, F, L, B, K, Arg) ; true ),
    format_walk(E, C, F, L, B, K, Goal, Uses, Args).
format_walk(_, _, F, L, B, _, Goal, _, _) :- miss(F, L, B, Goal).

format_directives(Uses) --> [0'~], !, format_column(Star), format_colon, [D],
    { format_directive(D, Own), append(Star, Own, These) },
    format_directives(Rest), { append(These, Rest, Uses) }.
format_directives(Uses) --> [_], !, format_directives(Uses).
format_directives([]) --> [].

format_column([arg]) --> [0'*], !.
format_column([]) --> [96], !, [_].
format_column([]) --> [D], { code_type(D, digit) }, !, format_digits.
format_column([]) --> [].
format_digits --> [D], { code_type(D, digit) }, !, format_digits.
format_digits --> [].
format_colon --> [0':], !.
format_colon --> [].

format_directive(0'@, [goal]) :- !.
format_directive(0'W, [arg, arg]) :- !.
format_directive(D, []) :- memberchk(D, [0'~, 0'n, 0't, 0'|, 0'+]), !.
format_directive(D, [arg]) :- memberchk(D, [0'a, 0'c, 0'd, 0'D, 0'e, 0'f, 0'g, 0'h, 0'i, 0'I, 0'k, 0'p, 0'q, 0'r, 0'R, 0's, 0'w]).

% A grammar body handed to phrase/2,3 or call_dcg/3: read as a rule body,
% so {Goal} is the goal it calls.
grammar_argument(_, _, F, L, B, _, Goal, Arg) :- var(Arg), !, miss(F, L, B, Goal).
grammar_argument(E, C, F, L, B, K, Goal, Arg) :- Arg = _>>_, !, closure(E, C, F, L, B, K, 2, Goal, Arg).
grammar_argument(E, C, F, L, B, K, _, Arg) :- dcg_body(E, C, F, L, B, K, Arg).

strip_carets(V, V) :- var(V), !.
strip_carets(_^G, I) :- !, strip_carets(G, I).
strip_carets(G, G).

% A closure called with Extra more arguments: a lambda's body is walked, a
% named closure is the call it makes once the arguments are added.
closure(_, _, F, L, B, _, _, Goal, Closure) :- var(Closure), !, miss(F, L, B, Goal).
closure(E, C, F, L, B, K, _, _, Params>>Lambda) :- !,
    (   E == "imports", autoloaded(F, Params>>Lambda, Spec) -> text(Spec, Text), found(Text) ; true ),
    lambda_body(Lambda, Body), body(E, C, F, L, B, K, Body).
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

% apply(Closure, Args) calls Closure with Args added.
apply_goal(Closure, Args, Module:Goal) :-
    nonvar(Closure), Closure = Module:Inner, !,
    apply_goal(Inner, Args, Goal).
apply_goal(Closure, Args, Goal) :-
    callable(Closure),
    Closure =.. List, append(List, Args, Full), Goal =.. Full.

lambda_body(_/Body, Body) :- !.
lambda_body(Body, Body).

extend(Closure, Extra, Called) :-
    Closure =.. List,
    length(More, Extra),
    append(List, More, Full),
    Called =.. Full.

% A predicate's meta_predicate declaration: the files' own, then those of
% the project modules they load, then SWI-Prolog's (autoloadable ones too)
% and those of the libraries the file loads.
meta_spec(File, Goal, Spec) :-
    functor(Goal, Name, Arity),
    (   local_meta(Name/Arity, Spec)
    ->  true
    ;   local_pred(Name, Arity)
    ->  fail
    ;   loaded_meta(Name/Arity, Spec)
    ->  true
    ;   catch(predicate_property(kibi_source_reader:Goal, meta_predicate(Spec)), _, fail)
    ->  true
    ;   file_module(File, Module), current_predicate(Module:Name/Arity),
        catch(predicate_property(Module:Goal, meta_predicate(Spec)), _, fail)
    ).

% A clause asserted from a literal term is read like one in the file: its
% body is walked. One asserted from data, or one that defines an expansion,
% is not known statically and is refused.
data_goal(assert(_)). data_goal(asserta(_)). data_goal(assertz(_)).
data_goal(assert(_, _)). data_goal(asserta(_, _)). data_goal(assertz(_, _)).
data_goal(compile_aux_clauses(_)).

record_call(E, C, F, L, B, K, Goal) :-
    (   load_directive(Goal, _), load_miss(Goal, F)
    ->  load_refusal(F, L, B, Goal)
    ;   true
    ),
    (   data_goal(Goal)
    ->  arg(1, Goal, Arg),
        (   Goal = compile_aux_clauses(_), is_list(Arg) -> Clauses = Arg ; Clauses = [Arg] ),
        forall(member(Clause, Clauses), asserted(E, C, F, L, B, Goal, Clause))
    ;   true
    ),
    extract(E, C, F, L, B, K, Goal).

asserted(E, C, F, L, B, Goal, Clause) :-
    (   static_clause(Clause, Head, Body), \+ expansion_head(Head)
    ->  ( Body == true -> true ; body(E, C, F, L, B, none, Body) )
    ;   miss(F, L, B, Goal)
    ).

static_clause(Clause, _, _) :- var(Clause), !, fail.
static_clause(Module:Clause, Head, Body) :- !, atom(Module), static_clause(Clause, Head, Body).
static_clause((Head :- Body), Head, Body) :- !, callable(Head), nonvar(Body).
static_clause(Head, Head, true) :- callable(Head).

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
    Goal = must_be(_, _), !,
    % library(error)'s must_be/2 throws these when the value is not of the type.
    forall(member(Error, ["type_error", "domain_error", "instantiation_error", "existence_error"]), found(Error)).
extract("thrown", _, _, _, _, _, Goal) :-
    functor(Goal, Name, Arity),
    error_helper(Name/Arity), !,
    atom_string(Name, Text), found(Text).
extract("imports", _, F, L, B, _, Goal) :-
    load_directive(Goal, _), \+ is_list(Goal), !,
    directive_imports(Goal, F, L, B).
extract("imports", _, F, _, _, _, Goal) :-
    autoloaded(F, Goal, Spec), !,
    text(Spec, Text), found(Text).
extract(_, _, _, _, _, _, _).

% The library SWI-Prolog autoloads for a call the file makes: one it does
% not define, that no library or project module it loads gives it, and that
% is not built in.
autoloaded(File, Goal, Spec) :-
    callable(Goal), functor(Goal, Name, Arity),
    \+ control(Name/Arity),
    \+ local_pred(Name, Arity),
    \+ loaded_export(Name/Arity),
    file_module(File, Module),
    \+ current_predicate(Module:Name/Arity),
    catch('$find_library'(_, Name, Arity, _, Library), _, fail),
    file_name_on_path(Library, Spec).

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
