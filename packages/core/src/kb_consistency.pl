% Module: kb_consistency
% implements REQ-kibi-kb-certificates
% The kb-consistency check rules.  Each run produces the certificate bundle
% (certificates.pl), round-trips it through JSON exactly as a saved bundle
% would be read, and re-checks it with the independent checker
% (certificate_check.pl).  Only what the checker accepts becomes a finding:
%
%   kb-consistency             a re-verified contradiction (an irreducible
%                              core of property facts, two facts that
%                              disagree on an atom or a decision, or a
%                              negation cycle among stored rules), or a
%                              certificate the checker rejects
%   kb-consistency-unresolved  a context the checker cannot compare (mixed
%                              types or units, unsupported operators or
%                              polarities, windows that never overlap)
:- module(kb_consistency, [
    check_kb_consistency/1,
    check_kb_consistency_unresolved/1
]).

:- encoding(utf8).

:- use_module(library(apply)).
:- use_module(library(lists)).
:- use_module(library(http/json)).
:- use_module('kb.pl', [kb_entity/3, kb_relationship/3]).
:- use_module('certificates.pl', [kb_certificates/1]).
:- use_module('certificate_check.pl', [verify_certificates/2]).

%% check_kb_consistency(-Violations)
check_kb_consistency(Violations) :-
    consistency_verification(Bundle, Report),
    numbered_certificates(Bundle, Numbered),
    findall(Index, (member(Failure, Report.rejected), get_dict(certificate, Failure, Index)), Rejected),
    findall(Violation,
        (   member(Index-Certificate, Numbered),
            \+ memberchk(Index, Rejected),
            contradiction_violation(Certificate, Violation)
        ),
        Contradictions),
    findall(Violation,
        (   member(Failure, Report.rejected),
            rejected_violation(Failure, Violation)
        ),
        RejectedViolations),
    append(Contradictions, RejectedViolations, Unsorted),
    sort(Unsorted, Violations).

%% check_kb_consistency_unresolved(-Violations)
check_kb_consistency_unresolved(Violations) :-
    consistency_verification(_Bundle, Report),
    findall(Violation,
        (   member(Theorem, Report.theorems),
            get_dict(unresolved, Theorem, Entries),
            member(Entry, Entries),
            unresolved_violation(Theorem.theorem, Entry, Violation)
        ),
        Unsorted),
    sort(Unsorted, Violations).

consistency_verification(Bundle, Report) :-
    kb_certificates(Produced),
    with_output_to(string(Json), json_write_dict(current_output, Produced, [width(0)])),
    open_string(Json, Stream),
    json_read_dict(Stream, Bundle, [value_string_as(string)]),
    verify_certificates(Bundle, Report).

numbered_certificates(Bundle, Numbered) :-
    findall(Index-Certificate, nth1(Index, Bundle.certificates, Certificate), Numbered).

% ------------------------------------------------------------------
% Re-verified contradictions
% ------------------------------------------------------------------

contradiction_violation(Certificate, violation('kb-consistency', EntityId, Description, Suggestion, "", _{certificate: Certificate})) :-
    get_dict(kind, Certificate, KindText),
    atom_string(Kind, KindText),
    contradiction_text(Kind, Certificate, Facts, Description),
    fact_requirements(Facts, Requirements),
    entity_label(Requirements, Facts, EntityId),
    suggestion_text(Kind, Requirements, Suggestion).

contradiction_text(property_contradiction, Certificate, Facts, Description) :-
    Facts = Certificate.core,
    context_text(Certificate, Context),
    atomic_list_concat(Facts, ', ', FactText),
    findall(Text,
        (   member(Drop, Certificate.dropModels),
            format(string(Text), "~w: ~w", [Drop.factId, Drop.value])
        ),
        DropTexts),
    atomic_list_concat(DropTexts, ', ', DropText),
    format(string(Description),
        "Facts ~w cannot all hold for ~w: no value satisfies them together, and dropping any one leaves a value (~w)",
        [FactText, Context, DropText]).
contradiction_text(predicate_contradiction, Certificate, Facts, Description) :-
    Facts = Certificate.core,
    Facts = [FactA, FactB],
    atom_text(Certificate, Atom),
    format(string(Description),
        "Facts ~w and ~w give ~w opposite truth values", [FactA, FactB, Atom]).
contradiction_text(decision_contradiction, Certificate, Facts, Description) :-
    Facts = Certificate.core,
    Facts = [FactA, FactB],
    decision_text(Certificate, Decision),
    format(string(Description),
        "Facts ~w and ~w decide ~w differently: one allows it and the other denies it", [FactA, FactB, Decision]).
contradiction_text(rule_negation_cycle, Certificate, [], Description) :-
    findall(Text,
        (   member(Edge, Certificate.cycle),
            signature_text(Edge.head, Head),
            signature_text(Edge.body, Body),
            (   atom_string(negative, Edge.sign) -> Arrow = "depends on not" ; Arrow = "depends on" ),
            format(string(Text), "~w ~w ~w", [Head, Arrow, Body])
        ),
        Texts),
    atomic_list_concat(Texts, "; ", CycleText),
    format(string(Description),
        "Stored rules are not stratified: a predicate depends on its own negation (~w)", [CycleText]).

suggestion_text(rule_negation_cycle, _Requirements,
    "Break the cycle: change one rule so no predicate depends on its own negation, or supersede the requirement that stores it") :- !.
suggestion_text(_Kind, Requirements, Suggestion) :-
    atomic_list_concat(Requirements, ', ', RequirementText),
    format(string(Suggestion),
        "Supersede or change one of ~w so the facts can hold together; kibi check --write-certificates <file> saves the certificate",
        [RequirementText]).

% ------------------------------------------------------------------
% Rejected certificates and unresolved contexts
% ------------------------------------------------------------------

rejected_violation(Failure, violation('kb-consistency', "kb-certificates", Description,
        "Kibi produced a certificate its own checker rejects. Report it with the bundle from kibi check --write-certificates <file>", "")) :-
    (   get_dict(group, Failure, Group)
    ->  group_text(Group, Where)
    ;   format(string(Where), "certificate ~w (~w)", [Failure.certificate, Failure.kind])
    ),
    format(string(Description),
        "The independent checker rejected ~w: ~w", [Where, Failure.reason]).

unresolved_violation(_Theorem, Entry, violation('kb-consistency-unresolved', EntityId, Description, Suggestion, "")) :-
    group_text(Entry, Where),
    (   get_dict(reason, Entry, Reason)
    ->  true
    ;   Reason = "the contradicting facts' validity windows never overlap"
    ),
    entry_facts(Entry, Facts),
    fact_requirements(Facts, Requirements),
    entity_label(Requirements, Facts, EntityId0),
    (   EntityId0 == "" -> EntityId = Where ; EntityId = EntityId0 ),
    format(string(Description),
        "Kibi cannot decide whether the facts for ~w hold together: ~w. It never counts as consistent", [Where, Reason]),
    Suggestion = "Align the facts' value_type, unit, operator or polarity so they can be compared, or accept that this context stays unchecked".

entry_facts(Entry, Facts) :-
    get_dict(subjectKey, Entry, Subject),
    !,
    get_dict(propertyKey, Entry, Property),
    findall(Fact,
        (   kb:current_req(Req),
            kb:effective_req_property_fact(Req, Subject, Fact, Property, _, _, _, _, _, _, _, _)
        ),
        Facts0),
    sort(Facts0, Facts).
entry_facts(_Entry, []).

% ------------------------------------------------------------------
% Text helpers
% ------------------------------------------------------------------

fact_requirements(Facts, Requirements) :-
    findall(Req,
        (   member(FactText, Facts),
            atom_string(Fact, FactText),
            member(Type, [requires_property, requires_predicate, requires_rule]),
            kb_relationship(Type, Req, Fact),
            kb:current_req(Req)
        ),
        Requirements0),
    sort(Requirements0, Requirements).

entity_label([], [], "") :- !.
entity_label([], Facts, Label) :- !, atomic_list_concat(Facts, '/', Label0), atom_string(Label0, Label).
entity_label(Requirements, _Facts, Label) :- atomic_list_concat(Requirements, '/', Label0), atom_string(Label0, Label).

context_text(Label, Text) :-
    (   get_dict(scope, Label, Scope0) -> atom_string(Scope0, Scope) ; Scope = "" ),
    (   Scope == ""
    ->  format(string(Text), "~w.~w", [Label.subjectKey, Label.propertyKey])
    ;   format(string(Text), "~w.~w (scope ~w)", [Label.subjectKey, Label.propertyKey, Scope])
    ).

group_text(Group, Text) :-
    (   get_dict(subjectKey, Group, _)
    ->  context_text(Group, Text)
    ;   get_dict(args, Group, _)
    ->  atom_text(Group, Text)
    ;   get_dict(key, Group, _)
    ->  decision_text(Group, Text)
    ;   format(string(Text), "~w", [Group])
    ).

atom_text(Label, Text) :-
    atomic_list_concat(Label.args, ', ', Args),
    format(string(Text), "~w:~w(~w)", [Label.namespace, Label.name, Args]).

decision_text(Label, Text) :-
    atomic_list_concat(Label.key, ', ', Key),
    format(string(Text), "~w:~w/~w for (~w)", [Label.namespace, Label.name, Label.arity, Key]).

signature_text(Signature, Text) :-
    format(string(Text), "~w:~w/~w", [Signature.namespace, Signature.name, Signature.arity]).
