% Module: certificate_check
% implements REQ-kibi-kb-certificates
%
% The independent checker behind `kibi verify`.  It states each KB theorem
% over the facts current requirements name and re-checks a certificate for
% it.  It never searches: a model is checked by evaluating every constraint
% against the model's value, a contradiction core by re-running the interval
% decision procedure on the core alone (plus one model per dropped fact for
% minimality), and a stratification by checking every dependency edge
% against the stratum numbers.  It does not load checks.pl or the emitter
% (certificates.pl), so a bug in the search that finds certificates cannot
% make a wrong certificate pass.
%
% Theorems and their certificates (kibi.certificates.v1):
%
%   properties_consistent  One property_model per (subject, property, scope
%                          context): a value that satisfies every fact in the
%                          context.  Otherwise a property_contradiction (an
%                          irreducible core with one model per dropped fact),
%                          or property_unresolved when the core's validity
%                          windows never overlap.
%   predicates_consistent  One predicate_model per ground atom (true or
%                          false), or a predicate_contradiction pair.
%   decisions_consistent   One decision_model per decision key (allow or
%                          deny), or a decision_contradiction pair.
%   rules_stratified       A rule_strata assignment, or a rule_negation_cycle.
%
% A context is a set of facts on one subject and property that can be
% compared: an unscoped fact belongs to every scope context, a scoped fact
% only to its own.  A context the checker cannot compare (mixed value types,
% mixed units, an unsupported operator or polarity) is unresolved and needs
% no certificate; it never counts as consistent.

:- module(certificate_check, [
    certificate_property_contexts/1,
    certificate_predicate_groups/1,
    certificate_decision_groups/1,
    certificate_rule_edges/1,
    certificate_member_holds/3,
    certificate_members_satisfiable/2,
    set_texts/2,
    verify_certificates/2,
    kb_verify_certificates_file/2
]).

:- encoding(utf8).

:- use_module(library(http/json)).
:- use_module(library(apply)).
:- use_module(library(lists)).
:- use_module(library(pairs)).
:- use_module('kb.pl', [kb_entity/3, normalize_term_atom/2]).
:- use_module('intervals.pl', [
    numeric_constraints_satisfiable/2,
    numeric_constraint_holds/3,
    numeric_constraint_negation/2
]).
:- use_module('logic_ir.pl', [logic_rule_from_props/2]).

certificates_version('kibi.certificates.v1').
verification_version('kibi.verification.v1').

%% kb_verify_certificates_file(+Path, -JsonString)
% Read a certificate bundle from Path, verify it against the current KB and
% return the verification report as a JSON string.
kb_verify_certificates_file(Path, JsonString) :-
    setup_call_cleanup(
        open(Path, read, Stream, [encoding(utf8)]),
        json_read_dict(Stream, Bundle, [value_string_as(string)]),
        close(Stream)),
    verify_certificates(Bundle, Report),
    with_output_to(string(JsonString), json_write_dict(current_output, Report, [width(0)])).

%% verify_certificates(+Bundle, -Report)
% Bundle is a kibi.certificates.v1 dict as read from JSON.  Report has
% status (verified or rejected), one entry per theorem with its verdict
% (proved, disproved or unresolved), and the rejected certificates.
verify_certificates(Bundle, Report) :-
    verification_version(Version),
    (   bundle_certificates(Bundle, Certificates)
    ->  numbered(Certificates, Numbered),
        certificate_property_contexts(Contexts),
        certificate_predicate_groups(AtomGroups),
        certificate_decision_groups(DecisionGroups),
        certificate_rule_edges(Edges),
        property_theorem(Contexts, Numbered, PropertyTheorem, _, PropertyRejected),
        group_theorem(predicates_consistent, predicate, AtomGroups, Numbered, PredicateTheorem, _, PredicateRejected),
        group_theorem(decisions_consistent, decision, DecisionGroups, Numbered, DecisionTheorem, _, DecisionRejected),
        rules_theorem(Edges, Numbered, RulesTheorem, _, RulesRejected),
        findall(_{certificate: Index, kind: Kind, reason: "unknown certificate kind"},
            (   member(Index-Certificate, Numbered),
                certificate_kind(Certificate, Kind),
                \+ known_kind(Kind)
            ),
            Unmatched),
        append([PropertyRejected, PredicateRejected, DecisionRejected, RulesRejected, Unmatched], Rejected0),
        sort(certificate, @=<, Rejected0, Rejected),
        Theorems = [PropertyTheorem, PredicateTheorem, DecisionTheorem, RulesTheorem]
    ;   Theorems = [],
        Rejected = [_{certificate: 0, kind: bundle, reason: "not a kibi.certificates.v1 bundle"}],
        Numbered = []
    ),
    length(Numbered, Count),
    findall(Index, (member(Failure, Rejected), Index = Failure.certificate, Index > 0), FailedIndexes0),
    sort(FailedIndexes0, FailedIndexes),
    length(FailedIndexes, FailedCount),
    Verified is Count - FailedCount,
    (   Rejected == [] -> Status = verified ; Status = rejected ),
    Report = _{
        version: Version,
        status: Status,
        certificates: Count,
        verified: Verified,
        rejected: Rejected,
        theorems: Theorems,
        notCovered: [rule_conflicts, scenario_feasibility]
    }.

bundle_certificates(Bundle, Certificates) :-
    is_dict(Bundle),
    get_dict(version, Bundle, Version),
    certificates_version(Expected),
    text_equal(Version, Expected),
    get_dict(certificates, Bundle, Certificates),
    is_list(Certificates),
    forall(member(Certificate, Certificates), is_dict(Certificate)).

numbered(Items, Numbered) :-
    findall(Index-Item, nth1(Index, Items, Item), Numbered).

known_kind(Kind) :-
    memberchk(Kind, [property_model, property_contradiction, property_unresolved,
                     predicate_model, predicate_contradiction,
                     decision_model, decision_contradiction,
                     rule_strata, rule_negation_cycle]).

certificate_kind(Certificate, Kind) :-
    (   get_dict(kind, Certificate, Raw), text_atom(Raw, Kind) -> true ; Kind = unknown ).

kind_is(Certificate, Kind) :-
    certificate_kind(Certificate, Kind0),
    Kind0 == Kind.

% ------------------------------------------------------------------
% Property facts
% ------------------------------------------------------------------

%% certificate_property_contexts(-Contexts)
% Every comparable context: context(Subject, Property, Scope, Domain, Members)
% or unresolved(Subject, Property, Scope, Reason).  A member is
% m(FactId, Op, Value, ValidFrom, ValidTo) with the operator already negated
% for a forbid fact; Domain is int, number, bool, string or set.
certificate_property_contexts(Contexts) :-
    findall(Fact-tuple(Subject, Property, Op, Type, Value, Unit, Scope, Polarity, From, To),
        (   kb:current_req(Req),
            kb:effective_req_property_fact(Req, Subject, Fact, Property, Op, ValueType, Value0, Unit0, Scope, Polarity, From, To),
            kb:comparison_quantity(ValueType, Value0, Unit0, Type, Value, Unit)
        ),
        Tuples0),
    sort(1, @<, Tuples0, Tuples),
    findall(Subject-Property, member(_-tuple(Subject, Property, _, _, _, _, _, _, _, _), Tuples), Keys0),
    sort(Keys0, Keys),
    findall(Context,
        (   member(Subject-Property, Keys),
            findall(Fact-Tuple, (member(Fact-Tuple, Tuples), Tuple = tuple(Subject, Property, _, _, _, _, _, _, _, _)), Group),
            property_group_context(Subject, Property, Group, Context)
        ),
        Contexts).

property_group_context(Subject, Property, Group, Context) :-
    findall(Scope, (member(_-tuple(_, _, _, _, _, _, Scope, _, _, _), Group), Scope \== ''), Scopes0),
    sort(Scopes0, Scopes),
    (   member(_-tuple(_, _, _, _, _, _, '', _, _, _), Group)
    ->  ContextScopes = [''|Scopes]
    ;   ContextScopes = Scopes
    ),
    member(Scope, ContextScopes),
    findall(Fact-Tuple,
        (   member(Fact-Tuple, Group),
            Tuple = tuple(_, _, _, _, _, _, FactScope, _, _, _),
            ( FactScope == '' -> true ; FactScope == Scope )
        ),
        Members0),
    (   context_domain(Members0, Domain, Reason)
    ->  (   Reason == none
        ->  maplist(context_member(Domain), Members0, Members),
            Context = context(Subject, Property, Scope, Domain, Members)
        ;   Context = unresolved(Subject, Property, Scope, Reason)
        )
    ;   Context = unresolved(Subject, Property, Scope, "the facts cannot be compared")
    ).

context_domain(Members, Domain, Reason) :-
    findall(Type, member(_-tuple(_, _, _, Type, _, _, _, _, _, _), Members), Types0),
    sort(Types0, Types),
    (   member(_-tuple(_, _, _, _, _, _, _, Polarity, _, _), Members),
        \+ memberchk(Polarity, [require, forbid])
    ->  Domain = none, Reason = "a fact has a polarity other than require or forbid"
    ;   subtract(Types, [int, number], []), Types \== []
    ->  (   Types == [int] -> Domain = int ; Domain = number ),
        context_numeric_reason(Members, Reason)
    ;   Types == [bool]
    ->  Domain = bool, context_scalar_reason(Members, Reason)
    ;   Types == [string]
    ->  Domain = string, context_scalar_reason(Members, Reason)
    ;   Types == [set]
    ->  Domain = set, context_set_reason(Members, Reason)
    ;   Types = [_, _|_]
    ->  Domain = none, Reason = "the facts use different value types"
    ;   Domain = none, Reason = "the value type is not supported"
    ).

context_numeric_reason(Members, Reason) :-
    findall(Unit, (member(_-tuple(_, _, _, _, _, Unit, _, _, _, _), Members), Unit \== ''), Units0),
    sort(Units0, Units),
    (   Units = [_, _|_]
    ->  Reason = "the facts use different units"
    ;   member(_-tuple(_, _, Op, _, Value, _, _, _, _, _), Members),
        ( \+ memberchk(Op, [eq, neq, lt, lte, gt, gte]) ; \+ number(Value) )
    ->  Reason = "a fact has an unsupported operator or a non-numeric value"
    ;   Reason = none
    ).

context_scalar_reason(Members, Reason) :-
    (   member(_-tuple(_, _, Op, _, _, _, _, _, _, _), Members),
        \+ memberchk(Op, [eq, neq])
    ->  Reason = "only eq and neq compare non-numeric values"
    ;   Reason = none
    ).

% Sets also compare with includes (every member of the bound has the
% property), but only as a requirement: a forbidden includes has no single
% negation among eq, neq and includes.
context_set_reason(Members, Reason) :-
    (   member(_-tuple(_, _, Op, _, _, _, _, Polarity, _, _), Members),
        (   \+ memberchk(Op, [eq, neq, includes])
        ;   Op == includes, Polarity == forbid
        )
    ->  Reason = "only eq, neq and a required includes compare set values"
    ;   Reason = none
    ).

context_member(_Domain, Fact-tuple(_, _, Op0, _, Value, _, _, Polarity, From, To), m(Fact, Op, Value, From, To)) :-
    (   Polarity == forbid
    ->  numeric_constraint_negation(c(Op0, _, Value), c(Op, _, _))
    ;   Op = Op0
    ).

%% certificate_member_holds(+Domain, +Member, +Value)
% The member's constraint holds for Value.
certificate_member_holds(Domain, m(_, Op, Bound, _, _), Value) :-
    numeric_domain(Domain),
    !,
    number(Value),
    (   Domain == int -> integer(Value) ; true ),
    numeric_constraint_holds(Op, Value, Bound).
certificate_member_holds(Domain, m(_, Op, Bound, _, _), Value) :-
    scalar_value(Domain, Value),
    text_of(Value, ValueText),
    text_of(Bound, BoundText),
    (   Op == eq -> ValueText == BoundText
    ;   Op == neq -> ValueText \== BoundText
    ).

% A set value is the exact set of members with the property: eq holds for
% the same members in any order, neq for any other set, includes for any set
% that contains every member of the bound.
certificate_member_holds(set, m(_, Op, Bound, _, _), Value) :-
    set_texts(Value, ValueTexts),
    set_texts(Bound, BoundTexts),
    (   Op == eq -> ValueTexts == BoundTexts
    ;   Op == neq -> ValueTexts \== BoundTexts
    ;   Op == includes -> subtract(BoundTexts, ValueTexts, [])
    ).

%% set_texts(+Value, -Texts)
% The sorted, unique member texts of a set value.
set_texts(Value, Texts) :-
    is_list(Value),
    maplist(text_of, Value, Texts0),
    sort(Texts0, Texts).

numeric_domain(int).
numeric_domain(number).

scalar_value(bool, Value) :- !, text_of(Value, Text), memberchk(Text, ["true", "false"]).
scalar_value(string, Value) :- ( atom(Value) ; string(Value) ), !.

%% certificate_members_satisfiable(+Domain, +Members)
% Decision procedure used only on a contradiction core: intervals.pl for
% numbers, direct evaluation over the finite candidates for bool and string.
certificate_members_satisfiable(Domain, Members) :-
    numeric_domain(Domain),
    !,
    member_constraints(Members, _Variable, Constraints),
    (   Domain == int -> Integers = all ; Integers = [] ),
    numeric_constraints_satisfiable(Constraints, Integers).
certificate_members_satisfiable(Domain, Members) :-
    scalar_candidates(Domain, Members, Candidates),
    member(Value, Candidates),
    forall(member(Member, Members), certificate_member_holds(Domain, Member, Value)),
    !.

% One constraint per member, all on the same variable.
member_constraints([], _Variable, []).
member_constraints([m(_, Op, Bound, _, _)|Members], Variable, [c(Op, Variable, Bound)|Constraints]) :-
    member_constraints(Members, Variable, Constraints).

% Any satisfying value is either a bound some eq names or differs from every
% bound; one fresh text stands for the latter.
scalar_candidates(bool, _Members, ["true", "false"]).
scalar_candidates(string, Members, Candidates) :-
    findall(Text, (member(m(_, _, Bound, _, _), Members), text_of(Bound, Text)), Texts0),
    sort(Texts0, Texts),
    atomic_list_concat(["kibi:fresh"|Texts], '|', FreshAtom),
    atom_string(FreshAtom, Fresh),
    append(Texts, [Fresh], Candidates).
scalar_candidates(set, Members, Candidates) :-
    findall(Texts, (member(m(_, _, Bound, _, _), Members), set_texts(Bound, Texts)), Sets0),
    sort(Sets0, Sets),
    findall(Text, (member(Set, Sets), member(Text, Set)), Texts0),
    sort(Texts0, Texts),
    atomic_list_concat(["kibi:fresh"|Texts], '|', FreshAtom),
    atom_string(FreshAtom, Fresh),
    % The union of every bound satisfies any set of includes facts alone.
    append(Sets, [Texts, [Fresh]], Candidates).

property_theorem(Contexts, Numbered, Theorem, Used, Rejected) :-
    findall(Index-Certificate,
        (   member(Index-Certificate, Numbered),
            certificate_kind(Certificate, Kind),
            memberchk(Kind, [property_model, property_contradiction, property_unresolved])
        ),
        Candidates),
    foldl(property_context_result(Candidates), Contexts, [], Results),
    theorem_from_results(properties_consistent, Results, Theorem, Used, Rejected0),
    findall(_{certificate: Index, kind: Kind, reason: "certificate names no comparable property context of this KB"},
        (   member(Index-Certificate, Candidates),
            \+ memberchk(Index, Used),
            certificate_kind(Certificate, Kind)
        ),
        Orphans),
    append(Rejected0, Orphans, Rejected).

property_context_result(_Candidates, unresolved(Subject, Property, Scope, Reason), Results,
                        [result(unresolved, [], [], _{subjectKey: Subject, propertyKey: Property, scope: Scope, reason: Reason})|Results]) :- !.
property_context_result(Candidates, context(Subject, Property, Scope, Domain, Members), Results, [Result|Results]) :-
    findall(Index-Certificate,
        (   member(Index-Certificate, Candidates),
            certificate_text(Certificate, subjectKey, Subject),
            certificate_text(Certificate, propertyKey, Property),
            certificate_text(Certificate, scope, Scope)
        ),
        Matches),
    Label = _{subjectKey: Subject, propertyKey: Property, scope: Scope},
    (   Matches == []
    ->  Result = result(missing, [], [], Label)
    ;   Matches = [Index-Certificate]
    ->  property_certificate_check(Certificate, Domain, Members, Verdict, Outcome),
        (   Outcome == ok
        ->  Result = result(Verdict, [Index], [], Label)
        ;   Outcome = failed(Reason),
            certificate_kind(Certificate, Kind),
            Result = result(missing, [Index], [_{certificate: Index, kind: Kind, reason: Reason}], Label)
        )
    ;   findall(Index, member(Index-_, Matches), Indexes),
        findall(_{certificate: Index, kind: property, reason: "more than one certificate for the same context"},
            member(Index, Indexes), Failures),
        Result = result(missing, Indexes, Failures, Label)
    ).

certificate_text(Certificate, Key, Expected) :-
    get_dict(Key, Certificate, Value),
    text_equal(Value, Expected).

% property_certificate_check(+Certificate, +Domain, +Members, -Verdict, ?Outcome)
% Outcome is ok when the certificate re-verifies, else failed(Reason) names
% the first check that failed.
property_certificate_check(Certificate, Domain, Members, Verdict, Outcome) :-
    certificate_kind(Certificate, Kind),
    (   \+ certificate_text(Certificate, domain, Domain)
    ->  Outcome = failed("certificate domain differs from the facts' value domain")
    ;   Kind == property_model
    ->  Verdict = proved,
        model_check(Certificate, Domain, Members, Outcome)
    ;   Kind == property_contradiction
    ->  Verdict = disproved,
        core_check(Certificate, Domain, Members, true, Outcome)
    ;   Kind == property_unresolved
    ->  Verdict = unresolved,
        core_check(Certificate, Domain, Members, false, Outcome)
    ).

model_check(Certificate, Domain, Members, Outcome) :-
    findall(Fact, member(m(Fact, _, _, _, _), Members), Facts),
    (   \+ certificate_id_set(Certificate, facts, Facts)
    ->  Outcome = failed("model does not list exactly the facts of its context")
    ;   \+ get_dict(value, Certificate, _)
    ->  Outcome = failed("model has no value")
    ;   get_dict(value, Certificate, Value),
        member(Member, Members),
        \+ certificate_member_holds(Domain, Member, Value)
    ->  Member = m(Fact, _, _, _, _),
        format(string(Reason), "model value does not satisfy ~w", [Fact]),
        Outcome = failed(Reason)
    ;   Outcome = ok
    ).

% A contradiction core must be a subset of the context, admit no value, be
% irreducible (each dropped fact comes with a model of the rest) and, for a
% contradiction, have validity windows that all overlap.  An unresolved
% certificate is the same core whose windows do not all overlap.
core_check(Certificate, Domain, Members, WindowsOverlap, Outcome) :-
    (   \+ certificate_ids(Certificate, core, _)
    ->  Outcome = failed("core is not a list of fact ids")
    ;   certificate_ids(Certificate, core, Core),
        findall(Member, (member(Fact, Core), member(Member, Members), Member = m(Fact, _, _, _, _)), CoreMembers),
        length(Core, CoreCount),
        length(CoreMembers, CoreCount),
        sort(Core, SortedCore),
        length(SortedCore, CoreCount),
        CoreCount > 0
    ->  (   certificate_members_satisfiable(Domain, CoreMembers)
        ->  Outcome = failed("core admits a value, so it is not a contradiction")
        ;   \+ drop_models_valid(Certificate, Domain, CoreMembers)
        ->  Outcome = failed("core is not irreducible: a dropped fact has no valid model of the rest")
        ;   windows_overlap(CoreMembers, Overlap),
            Overlap \== WindowsOverlap
        ->  (   WindowsOverlap == true
            ->  Outcome = failed("core facts are never valid at the same time")
            ;   Outcome = failed("core facts are valid at the same time, so the core is a contradiction")
            )
        ;   Outcome = ok
        )
    ;   Outcome = failed("core names a fact outside its context or repeats one")
    ).

drop_models_valid(Certificate, Domain, CoreMembers) :-
    get_dict(dropModels, Certificate, DropModels),
    is_list(DropModels),
    forall(member(m(Fact, _, _, _, _), CoreMembers),
        (   member(Drop, DropModels),
            is_dict(Drop),
            certificate_text(Drop, factId, Fact),
            get_dict(value, Drop, Value),
            forall((member(Other, CoreMembers), Other \= m(Fact, _, _, _, _)),
                certificate_member_holds(Domain, Other, Value))
        ->  true
        )).

windows_overlap(Members, Overlap) :-
    (   forall((member(m(_, _, _, FromA, ToA), Members), member(m(_, _, _, FromB, ToB), Members)),
            kb:intervals_overlap(FromA, ToA, FromB, ToB))
    ->  Overlap = true
    ;   Overlap = false
    ).

certificate_ids(Certificate, Key, Ids) :-
    get_dict(Key, Certificate, Raw),
    is_list(Raw),
    maplist(text_atom, Raw, Ids).

certificate_id_set(Certificate, Key, Expected) :-
    certificate_ids(Certificate, Key, Ids),
    msort(Ids, Sorted),
    msort(Expected, Sorted).

% ------------------------------------------------------------------
% Predicate and decision facts
% ------------------------------------------------------------------

%% certificate_predicate_groups(-Groups)
% group(Label, Members): the facts that assert or deny one ground atom.  A
% member is p(FactId, Value) with Value true for assert and false for deny.
certificate_predicate_groups(Groups) :-
    findall(Fact-atom(Namespace, Name, Args, Polarity),
        (   kb:current_req(Req),
            kb:effective_req_predicate(Req, Fact, Namespace, Name, Args, Polarity)
        ),
        Facts0),
    sort(1, @<, Facts0, Facts),
    findall(Namespace-Name-Args, member(_-atom(Namespace, Name, Args, _), Facts), Keys0),
    sort(Keys0, Keys),
    findall(Group,
        (   member(Namespace-Name-Args, Keys),
            findall(Fact-Polarity, member(Fact-atom(Namespace, Name, Args, Polarity), Facts), Pairs),
            Label = _{namespace: Namespace, name: Name, args: Args},
            (   member(_-Polarity, Pairs), \+ memberchk(Polarity, [assert, deny])
            ->  Group = unresolved(Label, "a fact has a polarity other than assert or deny")
            ;   findall(p(Fact, Value), (member(Fact-Polarity, Pairs), polarity_value(Polarity, Value)), Members),
                Group = group(Label, Members)
            )
        ),
        Groups).

polarity_value(assert, true).
polarity_value(deny, false).

%% certificate_decision_groups(-Groups)
% group(Label, Members): the decision-predicate facts that agree on every key
% argument.  A member is p(FactId, Effect) with Effect allow or deny.
certificate_decision_groups(Groups) :-
    kb:decision_signatures(Signatures),
    findall(Fact-decision(Namespace, Name, Arity, Key, Effect),
        (   kb:current_req(Req),
            kb:effective_req_predicate(Req, Fact, Namespace, Name, Args, Polarity),
            length(Args, Arity),
            memberchk(decision_signature(Namespace, Name, Arity, KeyPositions, DecisionPosition), Signatures),
            findall(Value, (member(Position, KeyPositions), nth1(Position, Args, Value)), Key),
            nth1(DecisionPosition, Args, Decision),
            (   kb:effective_decision(Decision, Polarity, Effect0) -> Effect = Effect0 ; Effect = unknown )
        ),
        Facts0),
    sort(1, @<, Facts0, Facts),
    findall(Namespace-Name-Arity-Key, member(_-decision(Namespace, Name, Arity, Key, _), Facts), Keys0),
    sort(Keys0, Keys),
    findall(Group,
        (   member(Namespace-Name-Arity-Key, Keys),
            findall(p(Fact, Effect), member(Fact-decision(Namespace, Name, Arity, Key, Effect), Facts), Members),
            Label = _{namespace: Namespace, name: Name, arity: Arity, key: Key},
            (   memberchk(p(_, unknown), Members)
            ->  Group = unresolved(Label, "a decision is neither allow nor deny")
            ;   Group = group(Label, Members)
            )
        ),
        Groups).

group_theorem(Theorem, Prefix, Groups, Numbered, Result, Used, Rejected) :-
    atom_concat(Prefix, '_model', ModelKind),
    atom_concat(Prefix, '_contradiction', ContradictionKind),
    findall(Index-Certificate,
        (   member(Index-Certificate, Numbered),
            certificate_kind(Certificate, Kind),
            memberchk(Kind, [ModelKind, ContradictionKind])
        ),
        Candidates),
    foldl(group_result(ModelKind, ContradictionKind, Candidates), Groups, [], Results),
    theorem_from_results(Theorem, Results, Result, Used, Rejected0),
    findall(_{certificate: Index, kind: Kind, reason: "certificate names no group of this KB"},
        (   member(Index-Certificate, Candidates),
            \+ memberchk(Index, Used),
            certificate_kind(Certificate, Kind)
        ),
        Orphans),
    append(Rejected0, Orphans, Rejected).

group_result(_ModelKind, _ContradictionKind, _Candidates, unresolved(Label, Reason), Results,
             [result(unresolved, [], [], Label.put(reason, Reason))|Results]) :- !.
group_result(ModelKind, ContradictionKind, Candidates, group(Label, Members), Results, [Result|Results]) :-
    findall(Index-Certificate,
        (   member(Index-Certificate, Candidates),
            certificate_matches_label(Certificate, Label)
        ),
        Matches),
    (   Matches == []
    ->  Result = result(missing, [], [], Label)
    ;   Matches = [Index-Certificate]
    ->  group_certificate_check(Certificate, ModelKind, ContradictionKind, Members, Verdict, Outcome),
        (   Outcome == ok
        ->  Result = result(Verdict, [Index], [], Label)
        ;   Outcome = failed(Reason),
            certificate_kind(Certificate, Kind),
            Result = result(missing, [Index], [_{certificate: Index, kind: Kind, reason: Reason}], Label)
        )
    ;   findall(Index, member(Index-_, Matches), Indexes),
        findall(_{certificate: Index, kind: group, reason: "more than one certificate for the same group"},
            member(Index, Indexes), Failures),
        Result = result(missing, Indexes, Failures, Label)
    ).

certificate_matches_label(Certificate, Label) :-
    forall(get_dict(Key, Label, Expected),
        (   get_dict(Key, Certificate, Actual),
            label_value_equal(Actual, Expected)
        )).

label_value_equal(Actual, Expected) :-
    is_list(Expected),
    !,
    is_list(Actual),
    maplist(text_equal, Actual, Expected).
label_value_equal(Actual, Expected) :-
    integer(Expected),
    !,
    Actual == Expected.
label_value_equal(Actual, Expected) :-
    text_equal(Actual, Expected).

group_certificate_check(Certificate, ModelKind, ContradictionKind, Members, Verdict, Outcome) :-
    certificate_kind(Certificate, Kind),
    findall(Fact, member(p(Fact, _), Members), Facts),
    (   Kind == ModelKind
    ->  Verdict = proved,
        (   \+ certificate_id_set(Certificate, facts, Facts)
        ->  Outcome = failed("model does not list exactly the facts of its group")
        ;   \+ get_dict(value, Certificate, _)
        ->  Outcome = failed("model has no value")
        ;   get_dict(value, Certificate, Value),
            text_of(Value, ValueText),
            member(p(Fact, Expected), Members),
            text_of(Expected, ExpectedText),
            ValueText \== ExpectedText
        ->  format(string(Reason), "model value does not satisfy ~w", [Fact]),
            Outcome = failed(Reason)
        ;   Outcome = ok
        )
    ;   Kind == ContradictionKind
    ->  Verdict = disproved,
        (   certificate_ids(Certificate, core, [FactA, FactB]),
            memberchk(p(FactA, ValueA), Members),
            memberchk(p(FactB, ValueB), Members),
            ValueA \== ValueB
        ->  Outcome = ok
        ;   Outcome = failed("core is not two facts of the group that disagree")
        )
    ).

% ------------------------------------------------------------------
% Rule stratification
% ------------------------------------------------------------------

%% certificate_rule_edges(-Edges)
% edge(Head, Body, Sign) for every dependency of every stored rule fact, the
% same graph logic_rules_stratified/1 checks.  Head and Body are
% predicate(Namespace, Name, Arity).
certificate_rule_edges(Edges) :-
    findall(edge(Head, Body, Sign),
        (   kb_entity(_FactId, fact, Props),
            memberchk(fact_kind=RawKind, Props),
            normalize_term_atom(RawKind, rule),
            logic_rule_from_props(Props, rule(rule, _Modality, HeadAtom, BodyExpression, _, _, _, _, _, _)),
            atom_signature(HeadAtom, Head),
            body_dependency(BodyExpression, BodyAtom, Sign),
            atom_signature(BodyAtom, Body)
        ),
        Edges0),
    sort(Edges0, Edges).

atom_signature(atom(Namespace, Name, Args, _, _), predicate(Namespace, Name, Arity)) :-
    length(Args, Arity).

body_dependency(Atom, Atom, positive) :- Atom = atom(_, _, _, _, _).
body_dependency(not(Atom), Atom, negative).
body_dependency(all(Items), Atom, Sign) :- member(Item, Items), body_dependency(Item, Atom, Sign).
body_dependency(any(Items), Atom, Sign) :- member(Item, Items), body_dependency(Item, Atom, Sign).
body_dependency(count(Atom, _, _), Atom, positive).

rules_theorem(Edges, Numbered, Theorem, Used, Rejected) :-
    findall(Index-Certificate,
        (   member(Index-Certificate, Numbered),
            certificate_kind(Certificate, Kind),
            memberchk(Kind, [rule_strata, rule_negation_cycle])
        ),
        Candidates),
    findall(Signature, (member(edge(A, B, _), Edges), member(Signature, [A, B])), Signatures0),
    sort(Signatures0, Signatures),
    length(Signatures, PredicateCount),
    (   Candidates == []
    ->  (   Edges == []
        ->  Verdict = proved, Used = [], Rejected = []
        ;   Verdict = unresolved, Used = [],
            Rejected = [_{certificate: 0, kind: rule_strata, reason: "no stratification certificate for the stored rules"}]
        )
    ;   Candidates = [Index-Certificate]
    ->  Used = [Index],
        rule_certificate_check(Certificate, Edges, Signatures, Verdict0, Outcome),
        (   Outcome == ok
        ->  Verdict = Verdict0, Rejected = []
        ;   Outcome = failed(Reason),
            certificate_kind(Certificate, Kind),
            Verdict = unresolved,
            Rejected = [_{certificate: Index, kind: Kind, reason: Reason}]
        )
    ;   findall(Index, member(Index-_, Candidates), Used),
        Verdict = unresolved,
        findall(_{certificate: Index, kind: rule_strata, reason: "more than one stratification certificate"},
            member(Index, Used), Rejected)
    ),
    length(Edges, EdgeCount),
    Theorem = _{theorem: rules_stratified, verdict: Verdict, predicates: PredicateCount, edges: EdgeCount}.

rule_certificate_check(Certificate, Edges, Signatures, Verdict, Outcome) :-
    certificate_kind(Certificate, Kind),
    (   Kind == rule_strata
    ->  Verdict = proved,
        (   get_dict(strata, Certificate, Raw), is_list(Raw),
            maplist(stratum_entry, Raw, Entries)
        ->  (   member(Signature, Signatures), \+ memberchk(Signature-_, Entries)
            ->  Outcome = failed("strata omit a predicate the rules depend on")
            ;   member(edge(Head, Body, Sign), Edges),
                memberchk(Head-HeadStratum, Entries),
                memberchk(Body-BodyStratum, Entries),
                \+ stratum_edge_ok(Sign, HeadStratum, BodyStratum)
            ->  Outcome = failed("a rule dependency violates the stratum order")
            ;   Outcome = ok
            )
        ;   Outcome = failed("strata are not a list of predicates with integer strata")
        )
    ;   Kind == rule_negation_cycle
    ->  Verdict = disproved,
        (   get_dict(cycle, Certificate, Raw), is_list(Raw), Raw \== [],
            maplist(cycle_edge, Raw, Cycle),
            forall(member(Edge, Cycle), memberchk(Edge, Edges)),
            memberchk(edge(_, _, negative), Cycle),
            cycle_closed(Cycle)
        ->  Outcome = ok
        ;   Outcome = failed("cycle is not a closed path of stored rule dependencies with a negated edge")
        )
    ).

stratum_entry(Entry, predicate(Namespace, Name, Arity)-Stratum) :-
    is_dict(Entry),
    get_dict(namespace, Entry, NamespaceRaw), text_atom(NamespaceRaw, Namespace),
    get_dict(name, Entry, NameRaw), text_atom(NameRaw, Name),
    get_dict(arity, Entry, Arity), integer(Arity),
    get_dict(stratum, Entry, Stratum), integer(Stratum), Stratum >= 0.

stratum_edge_ok(positive, Head, Body) :- Head >= Body.
stratum_edge_ok(negative, Head, Body) :- Head > Body.

cycle_edge(Entry, edge(Head, Body, Sign)) :-
    is_dict(Entry),
    get_dict(head, Entry, HeadRaw), signature_from_dict(HeadRaw, Head),
    get_dict(body, Entry, BodyRaw), signature_from_dict(BodyRaw, Body),
    get_dict(sign, Entry, SignRaw), text_atom(SignRaw, Sign).

signature_from_dict(Dict, predicate(Namespace, Name, Arity)) :-
    is_dict(Dict),
    get_dict(namespace, Dict, NamespaceRaw), text_atom(NamespaceRaw, Namespace),
    get_dict(name, Dict, NameRaw), text_atom(NameRaw, Name),
    get_dict(arity, Dict, Arity), integer(Arity).

% Consecutive edges chain head to body (a head depends on its body) and the
% last edge's body is the first edge's head.
cycle_closed([edge(First, Next, _)|Rest]) :-
    cycle_chain(Rest, Next, First).

cycle_chain([], Last, First) :- Last == First.
cycle_chain([edge(Head, Body, _)|Rest], Previous, First) :-
    Head == Previous,
    cycle_chain(Rest, Body, First).

% ------------------------------------------------------------------
% Theorem summaries
% ------------------------------------------------------------------

% result(Verdict, CertificateIndexes, Rejected, Label), Verdict one of
% proved, disproved, unresolved, missing.  A theorem is disproved by any
% re-verified contradiction, unresolved while any context is unresolved or
% missing, and proved only when every context has a re-verified model.
theorem_from_results(Theorem, Results, Summary, Used, Rejected) :-
    findall(Index, (member(result(_, Indexes, _, _), Results), member(Index, Indexes)), Used),
    findall(Failure, (member(result(_, _, Failures, _), Results), member(Failure, Failures)), Rejected1),
    findall(Label, member(result(missing, [], [], Label), Results), MissingLabels),
    missing_reasons(MissingLabels, MissingRejected),
    append(Rejected1, MissingRejected, Rejected),
    count_verdict(proved, Results, Proved),
    count_verdict(disproved, Results, Disproved),
    findall(Label, member(result(unresolved, _, _, Label), Results), Unresolved),
    findall(Label, member(result(disproved, _, _, Label), Results), Contradictions),
    length(Results, Total),
    (   Disproved > 0 -> Verdict = disproved
    ;   Proved =:= Total -> Verdict = proved
    ;   Verdict = unresolved
    ),
    Summary = _{
        theorem: Theorem,
        verdict: Verdict,
        groups: Total,
        models: Proved,
        contradictions: Contradictions,
        unresolved: Unresolved
    }.

missing_reasons(Labels, Rejected) :-
    findall(_{certificate: 0, kind: missing, reason: Reason, group: Label},
        (   member(Label, Labels),
            Reason = "no certificate for this group"
        ),
        Rejected).

count_verdict(Verdict, Results, Count) :-
    aggregate_all(count, member(result(Verdict, _, _, _), Results), Count).

% ------------------------------------------------------------------
% Text helpers: JSON gives strings, the KB gives atoms.
% ------------------------------------------------------------------

text_of(Value, Text) :- string(Value), !, Text = Value.
text_of(Value, Text) :- atom(Value), !, atom_string(Value, Text).
text_of(Value, Text) :- number(Value), !, number_string(Value, Text).

text_atom(Value, Atom) :- atom(Value), !, Atom = Value.
text_atom(Value, Atom) :- string(Value), atom_string(Atom, Value).

text_equal(Left, Right) :-
    text_of(Left, Text),
    text_of(Right, Text).
