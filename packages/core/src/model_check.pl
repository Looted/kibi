% Module: model_check
% implements REQ-kibi-non-numeric-proof-kinds
%
% Decides a claim's obligation against the finite model a rule or
% state_machine certificate records, by enumerating every case.  Nothing is
% sampled: a rule holds only when it holds for every assignment of its
% variables over their domains, and a failure names the assignment that
% breaks it.
%
%   rule           The model is the certificate's domains (one list of values
%                  per argument type) and its predicate tables (the value the
%                  code's function returned for every combination of its
%                  argument domains).  Kibi evaluated both from the code at
%                  ingest, so the tables are the code's own decisions.  A
%                  domain's type is also a predicate of one argument that
%                  holds for its members, so a rule can range its variables
%                  with document_status(D).
%   state_machine  The model is the machine's states and transitions.  Its
%                  predicates are transition(From, To), reachable(From, To)
%                  (one or more steps), initial(State), terminal(State) and
%                  state(State); every variable ranges over the states.
%
% Obligations (claim_obligations.pl derives them from the claim's fact):
%
%   rule_holds       kibi.logic.v1 rule: for every assignment, when the body
%                    holds and no exception applies, the head has the value
%                    the modality requires (true for assert, oblige and
%                    permit; false for deny and forbid).  An atom rule's head
%                    must have it for every assignment; a constraint's body
%                    must.
%   predicate_holds  A ground predicate fact: the code's value is the fact's
%                    polarity (assert true, deny false).
%   every_member     A set fact whose property names a predicate: the
%                    predicate is true for every member.
%   machine_set      A set fact naming a machine projection (transitions,
%                    states, initial_states, terminal_states,
%                    reachable_states, reachable_pairs): the projection is
%                    exactly the set.
%   machine_relation The projection stands in the fact operator's relation
%                    to the set (includes, subset_of, excludes, eq).
%                    reachable_pairs are "from->to" pairs joined by a path
%                    of one or more transitions; a required waypoint
%                    "from->to via mid" holds when the target is reachable
%                    from the start and every such path passes through mid.
%   source           The model is what Kibi read from a project source (the
%                    source kind): its members, and the tables, objects or
%                    routes.  set_relation compares the members with the
%                    fact's set; required_fields and nullable_fields check
%                    each selected table or object; route_middleware checks
%                    each selected route's middleware.
%
% Rules with explicit exists quantifiers, count or temporal expressions, or
% durations, timestamps and intervals are outside what Kibi enumerates and
% are refused with a reason.

:- module(model_check, [
    model_check_obligation/4,
    machine_projection/3,
    edge_text/3
]).

:- use_module(library(apply)).
:- use_module(library(lists)).
:- use_module(library(assoc)).
:- use_module(library(pairs)).
:- use_module(library(ordsets)).
:- use_module(library(yall)).
:- use_module('kb.pl', [kb_entity/3]).
:- use_module('logic_ir.pl', [logic_rule_from_props/2]).

% The most assignments one rule may need; beyond it Kibi refuses to decide.
max_assignments(100000).

%% model_check_obligation(+Kind, +Obligation, +Certificate, -Result)
% Kind is rule or state_machine, Obligation and Certificate are dicts.
% Result is ok or problem(Reason) with Reason a string.
model_check_obligation(Kind, Obligation, Certificate, Result) :-
    catch(check_obligation(Kind, Obligation, Certificate, Result0),
          model_error(Reason),
          Result0 = problem(Reason)),
    !,
    Result = Result0.
model_check_obligation(_, _, _, problem("Kibi could not check the obligation against the certificate's model")).

check_obligation(Kind, Obligation, Certificate, Result) :-
    certificate_model(Kind, Certificate, Model),
    dict_text(Obligation, kind, ObligationKind),
    obligation_result(ObligationKind, Obligation, Model, Result).

% ---------------------------------------------------------------------------
% Models

certificate_model(rule, Certificate, model(Domains, Table, none)) :-
    !,
    required(Certificate, domains, DomainDict),
    required(Certificate, predicates, PredicateDict),
    dict_pairs(DomainDict, _, DomainPairs),
    maplist(domain_entry, DomainPairs, Domains0),
    list_to_assoc(Domains0, Domains),
    dict_pairs(PredicateDict, _, PredicatePairs),
    foldl(predicate_rows, PredicatePairs, [], Rows),
    list_to_assoc(Rows, Table).
certificate_model(state_machine, Certificate, model(any(States), Table, machine(States, Edges, Initial))) :-
    !,
    required(Certificate, machine, Machine),
    required(Machine, states, RawStates),
    maplist(text_atom, RawStates, States0),
    sort(States0, States),
    required(Machine, transitions, RawEdges),
    maplist(edge_pair, RawEdges, Edges0),
    sort(Edges0, Edges),
    (   get_dict(initial, Machine, RawInitial)
    ->  maplist(text_atom, RawInitial, Initial0),
        sort(Initial0, Initial)
    ;   Initial = none
    ),
    machine_table(States, Edges, Initial, Table).
certificate_model(source, Certificate, model(none, none, source(Members, Entities, Routes))) :-
    !,
    required(Certificate, model, Model),
    required(Model, members, RawMembers),
    maplist(text_string, RawMembers, Members0),
    sort(Members0, Members),
    (   get_dict(entities, Model, Entities) -> true ; Entities = none ),
    (   get_dict(routes, Model, Routes) -> true ; Routes = none ).
certificate_model(Kind, _, _) :-
    format(string(Reason), "a ~w certificate has no finite model to check", [Kind]),
    throw(model_error(Reason)).

required(Dict, Key, Value) :-
    (   is_dict(Dict), get_dict(Key, Dict, Value)
    ->  true
    ;   format(string(Reason), "the certificate has no ~w", [Key]),
        throw(model_error(Reason))
    ).

domain_entry(Type0-Entry, Type-Members) :-
    text_atom(Type0, Type),
    required(Entry, members, Raw),
    maplist(text_atom, Raw, Members).

predicate_rows(Name0-Entry, Acc0, Acc) :-
    text_atom(Name0, Name),
    required(Entry, rows, Rows),
    foldl(predicate_row(Name), Rows, Acc0, Acc).

predicate_row(Name, Row, Acc, [(Name-Args)-Value|Acc]) :-
    required(Row, args, RawArgs),
    maplist(text_atom, RawArgs, Args),
    required(Row, value, RawValue),
    boolean_value(RawValue, Value).

boolean_value(true, true) :- !.
boolean_value(false, false) :- !.
boolean_value("true", true) :- !.
boolean_value("false", false) :- !.
boolean_value(_, _) :-
    throw(model_error("a predicate table holds a value that is not a boolean")).

edge_pair(Raw, From-To) :-
    (   is_list(Raw), Raw = [RawFrom, RawTo]
    ->  text_atom(RawFrom, From),
        text_atom(RawTo, To)
    ;   throw(model_error("a transition is not a [from, to] pair"))
    ).

% The machine's predicates as one table over its states.
machine_table(States, Edges, Initial, Table) :-
    closure_pairs(States, Edges, Reachable),
    findall((transition-[A, B])-V,
        ( member(A, States), member(B, States), truth(memberchk(A-B, Edges), V) ),
        TransitionRows),
    findall((reachable-[A, B])-V,
        ( member(A, States), member(B, States), truth(memberchk(A-B, Reachable), V) ),
        ReachableRows),
    findall((terminal-[S])-V,
        ( member(S, States), truth(\+ memberchk(S-_, Edges), V) ),
        TerminalRows),
    findall((state-[S])-true, member(S, States), StateRows),
    (   Initial == none
    ->  InitialRows = []
    ;   findall((initial-[S])-V, ( member(S, States), truth(memberchk(S, Initial), V) ), InitialRows)
    ),
    append([TransitionRows, ReachableRows, TerminalRows, StateRows, InitialRows], Rows),
    list_to_assoc(Rows, Table).

truth(Goal, Value) :- ( call(Goal) -> Value = true ; Value = false ).

% Pairs connected by a path of one or more transitions.
closure_pairs(States, Edges, Pairs) :-
    findall(A-B, ( member(A, States), reach_from(A, Edges, Reached), member(B, Reached) ), Pairs0),
    sort(Pairs0, Pairs).

reach_from(Start, Edges, Reached) :-
    findall(Next, member(Start-Next, Edges), First0),
    sort(First0, First),
    reach_frontier(First, Edges, First, Reached).

reach_frontier([], _, Seen, Seen).
reach_frontier([State|Rest], Edges, Seen0, Seen) :-
    findall(Next, ( member(State-Next, Edges), \+ memberchk(Next, Seen0) ), New0),
    sort(New0, New),
    ord_union(Seen0, New, Seen1),
    append(Rest, New, Frontier),
    reach_frontier(Frontier, Edges, Seen1, Seen).

%% machine_projection(+Projection, +Machine, -Members)
% The machine's states or transitions a set fact's property names, as
% sorted strings (a transition spelled "from->to").
machine_projection(transitions, machine(_, Edges, _), Members) :- !,
    maplist([From-To, Text]>>edge_text(From, To, Text), Edges, Members0),
    sort(Members0, Members).
machine_projection(states, machine(States, _, _), Members) :- !,
    maplist(atom_string, States, Members).
machine_projection(initial_states, machine(_, _, Initial), Members) :- !,
    (   Initial == none
    ->  throw(model_error("the certificate names no initial state; set proof_contract.initial_source"))
    ;   maplist(atom_string, Initial, Members)
    ).
machine_projection(terminal_states, machine(States, Edges, _), Members) :- !,
    findall(S, ( member(S, States), \+ memberchk(S-_, Edges) ), Terminal),
    maplist(atom_string, Terminal, Members).
machine_projection(reachable_states, machine(States, Edges, Initial), Members) :- !,
    (   Initial == none
    ->  throw(model_error("the certificate names no initial state; set proof_contract.initial_source"))
    ;   true
    ),
    findall(S, ( member(I, Initial), reach_from(I, Edges, Reached), member(S, Reached) ), Reached0),
    append(Initial, Reached0, All0),
    sort(All0, All),
    include(member_of(States), All, Kept),
    maplist(atom_string, Kept, Members).

machine_projection(reachable_pairs, machine(States, Edges, _), Members) :- !,
    closure_pairs(States, Edges, Pairs),
    maplist([From-To, Text]>>edge_text(From, To, Text), Pairs, Members0),
    sort(Members0, Members).

edge_text(From, To, Text) :-
    format(string(Text), "~w->~w", [From, To]).

% implements REQ-kibi-source-proof-kinds
% Whether "from->to via mid" holds: to is reachable from from, and not once
% mid is taken out of the machine.
waypoint_holds(Member, machine(States, Edges, _), Holds, Why) :-
    (   sub_string(Member, Before, _, After, " via "),
        sub_string(Member, 0, Before, _, EdgeText),
        sub_string(Member, _, After, 0, ViaText),
        sub_string(EdgeText, B2, _, A2, "->")
    ->  sub_string(EdgeText, 0, B2, _, FromText),
        sub_string(EdgeText, _, A2, 0, ToText),
        maplist([T, A]>>atom_string(A, T), [FromText, ToText, ViaText], [From, To, Via])
    ;   format(string(Reason), "~w is not spelled \"from->to via state\"", [Member]),
        throw(model_error(Reason))
    ),
    forall(member(S, [From, To, Via]),
           (   memberchk(S, States)
           ->  true
           ;   format(string(Reason), "~w is not a state of the machine", [S]),
               throw(model_error(Reason))
           )),
    reach_from(From, Edges, Reached),
    (   \+ memberchk(To, Reached)
    ->  Holds = false,
        format(string(Why), "~w is never reachable from ~w, so no path passes through ~w", [To, From, Via])
    ;   memberchk(Via, [From, To])
    ->  Holds = true, Why = ""
    ;   exclude(edge_touches(Via), Edges, Without),
        reach_from(From, Without, Avoiding),
        (   memberchk(To, Avoiding)
        ->  Holds = false,
            format(string(Why), "a path from ~w reaches ~w without passing through ~w", [From, To, Via])
        ;   Holds = true, Why = ""
        )
    ).

edge_touches(State, From-To) :- ( From == State ; To == State ).

% relation_problem(+Operator, +Actual, +Expected, +What, -Reason) fails when
% the relation holds; Actual and Expected are sorted lists of strings.
relation_problem("eq", Actual, Expected, What, Reason) :-
    Actual \== Expected,
    subtract(Expected, Actual, Missing),
    subtract(Actual, Expected, Extra),
    set_difference_text(Missing, Extra, Difference),
    format(string(Reason), "~w are not the fact's set (~w)", [What, Difference]).
relation_problem("includes", Actual, Expected, What, Reason) :-
    subtract(Expected, Actual, Missing),
    Missing \== [],
    atomic_list_concat(Missing, ', ', Text),
    format(string(Reason), "~w do not include ~w", [What, Text]).
relation_problem("subset_of", Actual, Expected, What, Reason) :-
    subtract(Actual, Expected, Extra),
    Extra \== [],
    atomic_list_concat(Extra, ', ', Text),
    format(string(Reason), "~w include ~w, which the fact's set does not allow", [What, Text]).
relation_problem("excludes", Actual, Expected, What, Reason) :-
    intersection(Actual, Expected, Shared),
    Shared \== [],
    atomic_list_concat(Shared, ', ', Text),
    format(string(Reason), "~w include ~w, which the fact excludes", [What, Text]).

% ---------------------------------------------------------------------------
% Obligations

obligation_result("rule_holds", Obligation, Model, Result) :- !,
    dict_text(Obligation, fact_id, FactText),
    atom_string(FactId, FactText),
    (   kb_entity(FactId, fact, Props),
        logic_rule_from_props(Props, Rule)
    ->  rule_result(Rule, Model, Result)
    ;   format(string(Reason), "the rule_ir of ~w cannot be read", [FactId]),
        Result = problem(Reason)
    ).
obligation_result("predicate_holds", Obligation, model(_, Table, _), Result) :- !,
    dict_text(Obligation, predicate, NameText),
    atom_string(Name, NameText),
    get_dict(args, Obligation, RawArgs),
    maplist(text_atom, RawArgs, Args),
    get_dict(value, Obligation, RawExpected),
    boolean_value(RawExpected, Expected),
    table_value(Table, Name, Args, Actual),
    (   Actual == Expected
    ->  Result = ok
    ;   atomic_list_concat(Args, ', ', ArgText),
        format(string(Reason), "the code decides ~w(~w) is ~w, but the fact says ~w",
               [Name, ArgText, Actual, Expected]),
        Result = problem(Reason)
    ).
obligation_result("every_member", Obligation, model(_, Table, _), Result) :- !,
    dict_text(Obligation, predicate, NameText),
    atom_string(Name, NameText),
    get_dict(members, Obligation, RawMembers),
    maplist(text_atom, RawMembers, Members),
    (   member(Member, Members),
        table_value(Table, Name, [Member], Value),
        Value \== true
    ->  format(string(Reason), "the code decides ~w(~w) is false, so not every member of the set satisfies ~w",
               [Name, Member, Name]),
        Result = problem(Reason)
    ;   Result = ok
    ).
obligation_result("machine_set", Obligation, model(_, _, Machine), Result) :- !,
    (   Machine == none
    ->  throw(model_error("a machine_set obligation needs a state_machine certificate"))
    ;   true
    ),
    dict_text(Obligation, projection, ProjectionText),
    atom_string(Projection, ProjectionText),
    get_dict(members, Obligation, RawMembers),
    maplist(text_string, RawMembers, Expected0),
    sort(Expected0, Expected),
    machine_projection(Projection, Machine, Actual0),
    sort(Actual0, Actual),
    (   Actual == Expected
    ->  Result = ok
    ;   subtract(Expected, Actual, Missing),
        subtract(Actual, Expected, Extra),
        set_difference_text(Missing, Extra, Difference),
        format(string(Reason), "the machine's ~w are not the fact's set (~w)", [Projection, Difference]),
        Result = problem(Reason)
    ).
obligation_result("machine_relation", Obligation, model(_, _, Machine), Result) :- !,
    (   Machine = machine(_, _, _)
    ->  true
    ;   throw(model_error("a machine_relation obligation needs a state_machine certificate"))
    ),
    dict_text(Obligation, projection, ProjectionText),
    atom_string(Projection, ProjectionText),
    dict_text(Obligation, operator, Operator),
    get_dict(members, Obligation, RawMembers),
    maplist(text_string, RawMembers, Expected0),
    sort(Expected0, Expected),
    (   Projection == required_waypoints
    ->  (   member(Member, Expected),
            waypoint_holds(Member, Machine, Holds, Why),
            (   Operator == "excludes"
            ->  Holds == true,
                format(string(Reason), "every path ~w, which the fact excludes", [Member])
            ;   Holds == false,
                Reason = Why
            )
        ->  Result = problem(Reason)
        ;   Result = ok
        )
    ;   machine_projection(Projection, Machine, Actual0),
        sort(Actual0, Actual),
        format(string(What), "the machine's ~w", [Projection]),
        (   relation_problem(Operator, Actual, Expected, What, Reason)
        ->  Result = problem(Reason)
        ;   Result = ok
        )
    ).
obligation_result("set_relation", Obligation, model(_, _, source(Actual, _, _)), Result) :- !,
    dict_text(Obligation, operator, Operator),
    obligation_strings(Obligation, Expected),
    (   relation_problem(Operator, Actual, Expected, "the members Kibi read from the source", Reason)
    ->  Result = problem(Reason)
    ;   Result = ok
    ).
obligation_result(FieldKind, Obligation, model(_, _, source(_, Entities, _)), Result) :-
    memberchk(FieldKind, ["required_fields", "nullable_fields"]),
    !,
    (   is_list(Entities), Entities \== []
    ->  true
    ;   throw(model_error("the source has no tables or objects; read a schema or validator for a field claim"))
    ),
    obligation_strings(Obligation, Expected),
    (   member(Member, Expected),
        field_problem(FieldKind, Member, Entities, Reason)
    ->  Result = problem(Reason)
    ;   Result = ok
    ).
obligation_result("route_middleware", Obligation, model(_, _, source(_, _, Routes)), Result) :- !,
    (   is_list(Routes), Routes \== []
    ->  true
    ;   throw(model_error("the source has no routes; read a route table for a middleware claim"))
    ),
    dict_text(Obligation, operator, Operator),
    obligation_strings(Obligation, Expected),
    (   member(Route, Routes),
        get_dict(middleware, Route, Raw),
        maplist(text_string, Raw, Actual0),
        sort(Actual0, Actual),
        get_dict(method, Route, Method),
        get_dict(path, Route, Path),
        format(string(What), "the middleware of ~w ~w", [Method, Path]),
        relation_problem(Operator, Actual, Expected, What, Reason)
    ->  Result = problem(Reason)
    ;   Result = ok
    ).
obligation_result(Kind, _, _, problem(Reason)) :-
    format(string(Reason), "a ~w obligation cannot be checked against a finite model", [Kind]).

obligation_strings(Obligation, Members) :-
    get_dict(members, Obligation, Raw),
    maplist(text_string, Raw, Members0),
    sort(Members0, Members).

% A field member "name" applies to every selected table or object, and
% "table.name" to that table only.
field_problem(FieldKind, Member, Entities, Reason) :-
    (   sub_string(Member, Before, _, After, "."),
        sub_string(Member, 0, Before, _, Table),
        sub_string(Member, _, After, 0, Field),
        \+ sub_string(Field, _, _, _, ".")
    ->  (   member(Entity, Entities), get_dict(name, Entity, Name), text_string(Name, Table)
        ->  Targets = [Entity]
        ;   format(string(Reason), "the source has no table or object ~w", [Table]),
            Targets = []
        )
    ;   Field = Member,
        Targets = Entities
    ),
    (   nonvar(Reason)
    ->  true
    ;   member(Entity, Targets),
        get_dict(name, Entity, EntityName),
        get_dict(columns, Entity, Columns),
        (   member(Column, Columns), get_dict(name, Column, ColumnName), text_string(ColumnName, Field)
        ->  get_dict(nullable, Column, Nullable),
            get_dict(optional, Column, Optional),
            (   FieldKind == "required_fields",
                ( Nullable == true ; Optional == true )
            ->  (   Nullable == true -> How = nullable ; How = optional ),
                format(string(Reason), "~w.~w is ~w, not required", [EntityName, Field, How])
            ;   FieldKind == "nullable_fields",
                Nullable \== true
            ->  format(string(Reason), "~w.~w is not nullable", [EntityName, Field])
            )
        ;   format(string(Reason), "~w has no field ~w", [EntityName, Field])
        )
    ).

set_difference_text(Missing, Extra, Text) :-
    findall(Part,
        (   Missing \== [], atomic_list_concat(Missing, ', ', M), format(string(Part), "missing ~w", [M])
        ;   Extra \== [], atomic_list_concat(Extra, ', ', E), format(string(Part), "not in the set ~w", [E])
        ),
        Parts),
    atomic_list_concat(Parts, '; ', Text).

table_value(Table, Name, Args, Value) :-
    (   get_assoc(Name-Args, Table, Value0)
    ->  Value = Value0
    ;   atomic_list_concat(Args, ', ', ArgText),
        format(string(Reason),
               "~w(~w) is not in the certificate's model: name the function behind ~w in proof_contract.predicate_source and make each argument's domain list ~w",
               [Name, ArgText, Name, ArgText]),
        throw(model_error(Reason))
    ).

% ---------------------------------------------------------------------------
% Rules

rule_result(rule(Kind, Modality, Head, Body, Exceptions, _Scope, _From, _To, _Schema, Declared), Model, Result) :-
    (   member(variable(Name, _, exists), Declared)
    ->  format(string(Reason), "the rule quantifies ~w existentially, which Kibi does not enumerate", [Name]),
        throw(model_error(Reason))
    ;   true
    ),
    expected_value(Modality, Expected),
    rule_variables(Head, Body, Exceptions, Declared, Variables),
    Model = model(Domains, _, _),
    maplist(variable_domain(Domains), Variables, Ranges),
    assignment_count(Ranges, Count),
    max_assignments(Max),
    (   Count > Max
    ->  format(string(Reason), "the rule has ~D assignments, more than the ~D Kibi enumerates", [Count, Max]),
        throw(model_error(Reason))
    ;   true
    ),
    (   assignment(Ranges, Env),
        \+ rule_case_holds(Kind, Head, Body, Exceptions, Expected, Env, Model)
    ->  counterexample_text(Kind, Head, Body, Exceptions, Expected, Env, Model, Reason),
        Result = problem(Reason)
    ;   Result = ok
    ).

expected_value(Modality, true) :- memberchk(Modality, [assert, oblige, permit]), !.
expected_value(Modality, false) :- memberchk(Modality, [deny, forbid]), !.

rule_case_holds(atom, Head, _Body, Exceptions, Expected, Env, Model) :- !,
    (   any_exception(Exceptions, Env, Model)
    ->  true
    ;   eval_atom(Head, Env, Model, Expected)
    ).
rule_case_holds(rule, Head, Body, Exceptions, Expected, Env, Model) :- !,
    (   Head == none
    ->  throw(model_error("the rule has no head"))
    ;   true
    ),
    (   applies(Body, Exceptions, Env, Model)
    ->  eval_atom(Head, Env, Model, Expected)
    ;   true
    ).
rule_case_holds(constraint, _Head, Body, Exceptions, Expected, Env, Model) :- !,
    (   Body == none
    ->  throw(model_error("the constraint has no body"))
    ;   true
    ),
    (   any_exception(Exceptions, Env, Model)
    ->  true
    ;   eval_expression(Body, Env, Model, Expected)
    ).
rule_case_holds(Kind, _, _, _, _, _, _) :-
    format(string(Reason), "a ~w rule cannot be model checked", [Kind]),
    throw(model_error(Reason)).

applies(Body, Exceptions, Env, Model) :-
    (   Body == none
    ->  true
    ;   eval_expression(Body, Env, Model, true)
    ),
    \+ any_exception(Exceptions, Env, Model).

any_exception(Exceptions, Env, Model) :-
    member(Exception, Exceptions),
    eval_expression(Exception, Env, Model, true),
    !.

counterexample_text(_Kind, Head, _Body, _Exceptions, Expected, Env, Model, Reason) :-
    assignment_text(Env, EnvText),
    (   Head \== none,
        catch(eval_atom(Head, Env, Model, Actual), model_error(_), fail),
        Actual \== Expected
    ->  atom_text(Head, Env, HeadText),
        format(string(Reason), "the rule fails for ~w: the code decides ~w is ~w, but the rule requires ~w",
               [EnvText, HeadText, Actual, Expected])
    ;   format(string(Reason), "the rule fails for ~w: the constraint does not have the value ~w the rule requires",
               [EnvText, Expected])
    ).

assignment_text([], "the only case") :- !.
assignment_text(Env, Text) :-
    findall(Part, ( member(Name-Value, Env), format(string(Part), "~w=~w", [Name, Value]) ), Parts),
    atomic_list_concat(Parts, ', ', Text).

atom_text(atom(_, Name, Args, Polarity, _), Env, Text) :-
    maplist(resolve_atom_arg(Env), Args, Values),
    atomic_list_concat(Values, ', ', ArgText),
    (   Polarity == negative
    ->  format(string(Text), "not ~w(~w)", [Name, ArgText])
    ;   format(string(Text), "~w(~w)", [Name, ArgText])
    ).

% Variables, each with its declared or first-seen type, in name order.
rule_variables(Head, Body, Exceptions, Declared, Variables) :-
    findall(Name-Type, ( member(variable(Name, Type, _), Declared) ), FromDeclared),
    findall(Name-Type, ( member(Term, [Head, Body|Exceptions]), term_var(Term, Name, Type) ), FromTerms),
    append(FromDeclared, FromTerms, All),
    first_per_name(All, [], Variables0),
    keysort(Variables0, Variables).

first_per_name([], Acc, Acc).
first_per_name([Name-Type|Rest], Acc, Out) :-
    (   memberchk(Name-_, Acc)
    ->  first_per_name(Rest, Acc, Out)
    ;   first_per_name(Rest, [Name-Type|Acc], Out)
    ).

term_var(var(Name, Type), Name, Type) :- !.
term_var(Term, Name, Type) :-
    compound(Term),
    Term =.. [_|Args],
    member(Arg, Args),
    (   is_list(Arg) -> member(Item, Arg), term_var(Item, Name, Type)
    ;   term_var(Arg, Name, Type)
    ).

variable_domain(Domains, Name-Type, Name-Members) :-
    (   Domains = any(Members0)
    ->  Members = Members0
    ;   get_assoc(Type, Domains, Members0)
    ->  Members = Members0
    ;   format(string(Reason),
               "variable ~w has type ~w, which has no finite domain: name the export listing its values in proof_contract.domains",
               [Name, Type]),
        throw(model_error(Reason))
    ).

assignment_count(Ranges, Count) :-
    foldl([_-Members, A0, A]>>(length(Members, N), A is A0 * N), Ranges, 1, Count).

assignment([], []).
assignment([Name-Members|Rest], [Name-Value|Env]) :-
    member(Value, Members),
    assignment(Rest, Env).

eval_expression(atom(NS, Name, Args, Polarity, CW), Env, Model, Value) :- !,
    eval_atom(atom(NS, Name, Args, Polarity, CW), Env, Model, Value).
eval_expression(all(Items), Env, Model, Value) :- !,
    (   member(Item, Items), eval_expression(Item, Env, Model, false)
    ->  Value = false
    ;   Value = true
    ).
eval_expression(any(Items), Env, Model, Value) :- !,
    (   member(Item, Items), eval_expression(Item, Env, Model, true)
    ->  Value = true
    ;   Value = false
    ).
eval_expression(not(Atom), Env, Model, Value) :- !,
    eval_atom(Atom, Env, Model, Inner),
    negate(Inner, Value).
eval_expression(compare(Op, Left, Right), Env, _Model, Value) :- !,
    resolve_value(Left, Env, L),
    resolve_value(Right, Env, R),
    truth(compare_values(Op, L, R), Value).
eval_expression(Expression, _, _, _) :-
    functor(Expression, Kind, _),
    format(string(Reason), "a ~w expression is outside what Kibi model checks", [Kind]),
    throw(model_error(Reason)).

eval_atom(atom(_NS, Name, Args, Polarity, _CW), Env, model(Domains, Table, _), Value) :-
    maplist(resolve_atom_arg(Env), Args, Values),
    (   Values = [Member],
        \+ get_assoc(Name-Values, Table, _),
        Domains \= any(_),
        get_assoc(Name, Domains, Members)
    ->  truth(memberchk(Member, Members), Positive)
    ;   table_value(Table, Name, Values, Positive)
    ),
    (   Polarity == negative
    ->  negate(Positive, Value0)
    ;   Value0 = Positive
    ),
    Value = Value0.

negate(true, false).
negate(false, true).

resolve_atom_arg(Env, var(Name, _), Value) :- !,
    (   memberchk(Name-Value, Env)
    ->  true
    ;   format(string(Reason), "variable ~w is unbound", [Name]),
        throw(model_error(Reason))
    ).
resolve_atom_arg(_, const(Value, _), Value) :- !.
resolve_atom_arg(_, number(Number, _), Value) :- !,
    format(atom(Value), "~w", [Number]).
resolve_atom_arg(_, Term, _) :-
    functor(Term, Kind, _),
    format(string(Reason), "a ~w argument is outside what Kibi model checks", [Kind]),
    throw(model_error(Reason)).

resolve_value(var(Name, _), Env, Value) :- !,
    resolve_atom_arg(Env, var(Name, _), Atom),
    atom_or_number(Atom, Value).
resolve_value(const(Atom, _), _, Value) :- !, atom_or_number(Atom, Value).
resolve_value(number(Number, _), _, Number) :- !.
resolve_value(Term, Env, Value) :- resolve_atom_arg(Env, Term, Value).

atom_or_number(Atom, Value) :-
    (   atom(Atom), atom_number(Atom, Number) -> Value = Number ; Value = Atom ).

compare_values(eq, L, R) :- number(L), number(R), !, L =:= R.
compare_values(eq, L, R) :- !, L == R.
compare_values(neq, L, R) :- !, \+ compare_values(eq, L, R).
compare_values(Op, L, R) :-
    (   number(L), number(R)
    ->  numeric_compare(Op, L, R)
    ;   format(string(Reason), "~w compares ~w and ~w, which are not both numbers", [Op, L, R]),
        throw(model_error(Reason))
    ).

numeric_compare(lt, L, R) :- L < R.
numeric_compare(lte, L, R) :- L =< R.
numeric_compare(gt, L, R) :- L > R.
numeric_compare(gte, L, R) :- L >= R.

% ---------------------------------------------------------------------------
% Text

dict_text(Dict, Key, String) :-
    is_dict(Dict),
    get_dict(Key, Dict, Raw),
    text_string(Raw, String).

text_string(Raw, String) :- string(Raw), !, String = Raw.
text_string(Raw, String) :- atom(Raw), !, atom_string(Raw, String).
text_string(Raw, String) :- number(Raw), !, number_string(Raw, String).

text_atom(Raw, Atom) :- atom(Raw), !, Atom = Raw.
text_atom(Raw, Atom) :- string(Raw), !, atom_string(Atom, Raw).
text_atom(Raw, Atom) :- number(Raw), !, format(atom(Atom), "~w", [Raw]).
text_atom(_, _) :- throw(model_error("a model value is not text")).

member_of(List, Element) :- memberchk(Element, List).
