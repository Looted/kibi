% Module: certificates
% implements REQ-kibi-kb-certificates
%
% Finds a certificate for every KB theorem that certificate_check.pl states:
% a model for each consistent property context, predicate atom and decision
% key, an irreducible core (with a model per dropped fact) for each
% contradiction, and a stratum assignment (or a negation cycle) for the
% stored rules.  This module may search; certificate_check.pl re-checks
% everything it emits without trusting it.

:- module(certificates, [
    kb_certificates/1,
    kb_write_certificates/2
]).

:- encoding(utf8).

:- use_module(library(http/json)).
:- use_module(library(apply)).
:- use_module(library(lists)).
:- use_module(library(aggregate)).
:- use_module('kb.pl', []).
:- use_module('intervals.pl', [numeric_constraint_holds/3]).
:- use_module('certificate_check.pl', [
    certificate_property_contexts/1,
    certificate_predicate_groups/1,
    certificate_decision_groups/1,
    certificate_rule_edges/1,
    certificate_member_holds/3,
    certificate_members_satisfiable/2,
    set_texts/2
]).

%% kb_write_certificates(+Path, -JsonString)
% Write the certificate bundle for the current KB to Path and return a
% summary (certificate count per kind) as a JSON string.
kb_write_certificates(Path, JsonString) :-
    kb_certificates(Bundle),
    setup_call_cleanup(
        open(Path, write, Stream, [encoding(utf8)]),
        ( json_write_dict(Stream, Bundle, [width(0)]), nl(Stream) ),
        close(Stream)),
    findall(Kind, (member(Certificate, Bundle.certificates), get_dict(kind, Certificate, Kind)), Kinds0),
    msort(Kinds0, Kinds),
    clumped(Kinds, Counts),
    findall(Kind-Count, member(Kind-Count, Counts), Pairs),
    dict_pairs(ByKind, _, Pairs),
    length(Bundle.certificates, Total),
    with_output_to(string(JsonString),
        json_write_dict(current_output, _{path: Path, certificates: Total, byKind: ByKind}, [width(0)])).

%% kb_certificates(-Bundle)
kb_certificates(_{version: 'kibi.certificates.v1', certificates: Certificates}) :-
    certificate_property_contexts(Contexts),
    convlist(property_certificate, Contexts, PropertyCertificates),
    certificate_predicate_groups(AtomGroups),
    convlist(group_certificate(predicate), AtomGroups, PredicateCertificates),
    certificate_decision_groups(DecisionGroups),
    convlist(group_certificate(decision), DecisionGroups, DecisionCertificates),
    certificate_rule_edges(Edges),
    rule_certificates(Edges, RuleCertificates),
    append([PropertyCertificates, PredicateCertificates, DecisionCertificates, RuleCertificates], Certificates).

% ------------------------------------------------------------------
% Property contexts
% ------------------------------------------------------------------

property_certificate(context(Subject, Property, Scope, Domain, Members), Certificate) :-
    Base = _{subjectKey: Subject, propertyKey: Property, scope: Scope, domain: Domain},
    (   members_model(Domain, Members, Value)
    ->  findall(Fact, member(m(Fact, _, _, _, _), Members), Facts),
        Certificate = Base.put(_{kind: property_model, value: Value, facts: Facts})
    ;   irreducible_core(Domain, Members, Core),
        findall(_{factId: Fact, value: Value},
            (   member(Dropped, Core),
                Dropped = m(Fact, _, _, _, _),
                exclude(==(Dropped), Core, Rest),
                members_model(Domain, Rest, Value)
            ),
            DropModels),
        findall(Fact, member(m(Fact, _, _, _, _), Core), CoreFacts),
        (   core_windows_overlap(Core)
        ->  Kind = property_contradiction
        ;   Kind = property_unresolved
        ),
        Certificate = Base.put(_{kind: Kind, core: CoreFacts, dropModels: DropModels})
    ).

%% members_model(+Domain, +Members, -Value)
% A value satisfying every member, found among finitely many candidates that
% meet every region the members' bounds cut the line into.
members_model(Domain, Members, Value) :-
    model_candidates(Domain, Members, Candidates),
    member(Value, Candidates),
    forall(member(Member, Members), certificate_member_holds(Domain, Member, Value)),
    !.

model_candidates(Domain, Members, Candidates) :-
    memberchk(Domain, [int, number]),
    !,
    findall(Bound, member(m(_, _, Bound, _, _), Members), Bounds0),
    sort(Bounds0, Bounds),
    (   Domain == int
    ->  findall(Candidate,
            (   member(Bound, Bounds),
                member(Base, [floor(Bound), ceiling(Bound)]),
                member(Offset, [-1, 0, 1]),
                Candidate is Base + Offset
            ),
            Candidates0)
    ;   findall(Candidate,
            (   member(Bound, Bounds), member(Offset, [-1, 0, 1]), Candidate is Bound + Offset
            ;   nextto(Low, High, Bounds), Candidate is (Low + High) / 2
            ),
            Candidates0)
    ),
    sort([0|Candidates0], Candidates).
model_candidates(bool, _Members, [true, false]) :- !.
model_candidates(string, Members, Candidates) :-
    findall(Bound, member(m(_, _, Bound, _, _), Members), Bounds0),
    sort(Bounds0, Bounds),
    fresh_text(Bounds, 0, Fresh),
    append(Bounds, [Fresh], Candidates).

model_candidates(set, Members, Candidates) :-
    findall(Set, (member(m(_, _, Bound, _, _), Members), set_texts(Bound, Set)), Sets0),
    sort(Sets0, Sets),
    findall(Text, (member(Set, Sets), member(Text, Set)), Texts),
    fresh_text(Texts, 0, Fresh),
    append(Sets, [[Fresh]], Candidates).

fresh_text(Bounds, Index, Fresh) :-
    format(string(Candidate), "kibi:model:~w", [Index]),
    (   member(Bound, Bounds), text_value(Bound, Candidate)
    ->  Next is Index + 1,
        fresh_text(Bounds, Next, Fresh)
    ;   Fresh = Candidate
    ).

text_value(Value, Text) :- atom(Value), !, atom_string(Value, Text).
text_value(Value, Text) :- string(Value), !, Text = Value.

%% irreducible_core(+Domain, +Members, -Core)
% Deletion filter: drop each member whose removal keeps the set
% unsatisfiable.  What remains admits no value, and every proper subset
% does.
irreducible_core(Domain, Members, Core) :-
    foldl(core_step(Domain), Members, Members, Core).

core_step(Domain, Member, Current, Next) :-
    exclude(==(Member), Current, Without),
    (   Without \== [],
        \+ certificate_members_satisfiable(Domain, Without)
    ->  Next = Without
    ;   Next = Current
    ).

core_windows_overlap(Core) :-
    forall((member(m(_, _, _, FromA, ToA), Core), member(m(_, _, _, FromB, ToB), Core)),
        kb:intervals_overlap(FromA, ToA, FromB, ToB)).

% ------------------------------------------------------------------
% Predicate atoms and decision keys
% ------------------------------------------------------------------

group_certificate(Prefix, group(Label, Members), Certificate) :-
    atom_concat(Prefix, '_model', ModelKind),
    atom_concat(Prefix, '_contradiction', ContradictionKind),
    findall(Value, member(p(_, Value), Members), Values0),
    sort(Values0, Values),
    (   Values = [Value]
    ->  findall(Fact, member(p(Fact, _), Members), Facts),
        Certificate = Label.put(_{kind: ModelKind, value: Value, facts: Facts})
    ;   Members = [p(FactA, ValueA)|_],
        member(p(FactB, ValueB), Members),
        ValueB \== ValueA,
        !,
        Certificate = Label.put(_{kind: ContradictionKind, core: [FactA, FactB]})
    ).

% ------------------------------------------------------------------
% Rule stratification
% ------------------------------------------------------------------

rule_certificates([], []) :- !.
rule_certificates(Edges, [Certificate]) :-
    findall(Signature, (member(edge(Head, Body, _), Edges), member(Signature, [Head, Body])), Signatures0),
    sort(Signatures0, Signatures),
    findall(Signature-0, member(Signature, Signatures), Initial),
    length(Signatures, Count),
    Rounds is Count + 1,
    (   relax_strata(Rounds, Edges, Initial, Strata)
    ->  findall(_{namespace: Namespace, name: Name, arity: Arity, stratum: Stratum},
            member(predicate(Namespace, Name, Arity)-Stratum, Strata),
            Entries),
        Certificate = _{kind: rule_strata, strata: Entries}
    ;   negation_cycle(Edges, Cycle),
        findall(_{head: HeadDict, body: BodyDict, sign: Sign},
            (   member(edge(Head, Body, Sign), Cycle),
                signature_dict(Head, HeadDict),
                signature_dict(Body, BodyDict)
            ),
            Entries),
        Certificate = _{kind: rule_negation_cycle, cycle: Entries}
    ).

signature_dict(predicate(Namespace, Name, Arity), _{namespace: Namespace, name: Name, arity: Arity}).

% Raise each head to at least its body's stratum (one more across a negated
% edge) until nothing changes.  Without a negation cycle that happens within
% one round per predicate; a cycle keeps raising, and relaxation fails.
relax_strata(0, _Edges, _Strata, _Final) :- !, fail.
relax_strata(Rounds, Edges, Strata, Final) :-
    foldl(relax_edge, Edges, Strata, Next),
    (   Next == Strata
    ->  Final = Strata
    ;   Remaining is Rounds - 1,
        relax_strata(Remaining, Edges, Next, Final)
    ).

relax_edge(edge(Head, Body, Sign), Strata, Next) :-
    memberchk(Head-HeadStratum, Strata),
    memberchk(Body-BodyStratum, Strata),
    (   Sign == negative -> Required is BodyStratum + 1 ; Required = BodyStratum ),
    (   HeadStratum < Required
    ->  selectchk(Head-HeadStratum, Strata, Head-Required, Next)
    ;   Next = Strata
    ).

% A negated edge Head -> Body with a dependency path from Body back to Head.
negation_cycle(Edges, [edge(Head, Body, negative)|Path]) :-
    member(edge(Head, Body, negative), Edges),
    dependency_path(Body, Head, Edges, [Body], Path),
    !.

dependency_path(Current, Target, _Edges, _Seen, []) :-
    Current == Target,
    !.
dependency_path(Current, Target, Edges, Seen, [edge(Current, Next, Sign)|Path]) :-
    member(edge(Current, Next, Sign), Edges),
    (   Next == Target
    ->  Path = []
    ;   \+ memberchk(Next, Seen),
        dependency_path(Next, Target, Edges, [Next|Seen], Path)
    ).
