% Module: domain_subjects
% The domain definition layer: subject facts as shared, defined vocabulary.
%
% A subject fact names one thing in the product (a component, a mode, a role)
% and its body defines it.  Every other fact kind is a claim about a subject.
% This module answers four questions over the attached KB:
%
%   * Which subjects is a requirement about?  Through its `constrains` links,
%     the subject keys of the facts that ground its claims, and the `subjects`
%     each unmodeled claim of its semantic_inventory names (its anchors).
%   * Which subject is broader than another?  A dotted key prefix that is
%     itself a defined subject (kibi.cli is broader than kibi.cli.check), and
%     the subject fact's own `part_of` and `kind_of` keys.
%   * Which current requirements share a subject?  Two requirements pair when
%     one names a subject the other names, or one names a subject broader
%     than one the other names.  Siblings under one parent do not pair.  The
%     pairs are a pure function of stored links, keys and anchors: adding an
%     unrelated requirement never changes another requirement's pairs.
%   * Is every unmodeled claim anchored to a defined subject?  The two
%     canonical rules below say no when it is not.
%
% Nothing here ranks text or calls a provider.

:- module(domain_subjects, [
    subject_defined/2,
    subject_broader/2,
    subject_ancestor/2,
    requirement_subject/3,
    requirement_subject_pair/3,
    anchored_claim_role/1,
    unmodeled_claim_status/1,
    check_claim_subject_missing/1,
    check_claim_subject_undefined/1,
    subject_domain_json/2
]).

:- encoding(utf8).

:- use_module(library(http/json)).
:- use_module(library(apply)).
:- use_module(library(lists)).
:- use_module(library(pairs)).
:- use_module('kb.pl').

%% anchored_claim_role(?Role)
% Inventory roles whose unmodeled claims must name the subjects they are
% about: the claims that state or scope a rule.  Descriptive, rationale and
% example claims carry no rule of their own.
anchored_claim_role(normative).
anchored_claim_role(condition).
anchored_claim_role(exception).
anchored_claim_role(definition).

%% unmodeled_claim_status(?Status)
% Inventory statuses of a claim that no fact grounds.
unmodeled_claim_status(ambiguous).
unmodeled_claim_status(ontology_gap).
unmodeled_claim_status(missing).

inactive_fact_status(Status) :-
    memberchk(Status, [superseded, deprecated, closed, removed, retired, inactive, archived]).

%% subject_defined(?SubjectKey, ?FactId)
% An active subject fact with this key.
subject_defined(SubjectKey, FactId) :-
    kb:fact_subject_key(FactId, SubjectKey),
    \+ subject_fact_inactive(FactId).

subject_fact_inactive(FactId) :-
    kb_entity(FactId, fact, Props),
    memberchk(status=Raw, Props),
    kb:normalize_term_atom(Raw, Status),
    inactive_fact_status(Status).

subject_is_defined(SubjectKey) :-
    once(subject_defined(SubjectKey, _)).

%% subject_relation_keys(+FactId, +Field, -Keys)
% The subject keys a subject fact lists under part_of, kind_of or
% distinct_from; [] when the field is absent.
subject_relation_keys(FactId, Field, Keys) :-
    (   kb_entity(FactId, fact, Props),
        memberchk(Field=Raw, Props),
        catch(kb:normalize_term_atom_list(Raw, Keys0), _, fail)
    ->  sort(Keys0, Keys)
    ;   Keys = []
    ).

%% subject_broader(+SubjectKey, -Broader)
% A defined subject directly broader than SubjectKey: its nearest dotted
% prefix that is defined, or a key its subject fact lists under part_of or
% kind_of.
subject_broader(SubjectKey, Broader) :-
    nearest_defined_prefix(SubjectKey, Broader).
subject_broader(SubjectKey, Broader) :-
    subject_defined(SubjectKey, FactId),
    member(Field, [part_of, kind_of]),
    subject_relation_keys(FactId, Field, Keys),
    member(Broader, Keys),
    Broader \== SubjectKey,
    subject_is_defined(Broader).

nearest_defined_prefix(SubjectKey, Prefix) :-
    atomic_list_concat(Segments, '.', SubjectKey),
    findall(Candidate,
            (   append(PrefixSegments, [_|_], Segments),
                PrefixSegments \== [],
                atomic_list_concat(PrefixSegments, '.', Candidate)
            ),
            Candidates),
    % append/3 enumerates the shortest prefix first; take the longest
    % defined one.
    reverse(Candidates, Longest),
    member(Prefix, Longest),
    subject_is_defined(Prefix),
    !.

%% subject_ancestor(+SubjectKey, -Ancestor)
% Every subject transitively broader than SubjectKey, each once.  A cycle of
% part_of or kind_of links stops at the first repeated key.
subject_ancestor(SubjectKey, Ancestor) :-
    subject_ancestors(SubjectKey, Ancestors),
    member(Ancestor, Ancestors).

subject_ancestors(SubjectKey, Ancestors) :-
    ancestor_walk([SubjectKey], [SubjectKey], Seen),
    subtract(Seen, [SubjectKey], Ancestors0),
    sort(Ancestors0, Ancestors).

member_of(List, Element) :-
    memberchk(Element, List).

ancestor_walk([], Seen, Seen).
ancestor_walk([Key|Rest], Seen0, Seen) :-
    findall(Broader, subject_broader(Key, Broader), Broaders0),
    sort(Broaders0, Broaders),
    exclude(member_of(Seen0), Broaders, New),
    append(Seen0, New, Seen1),
    append(Rest, New, Queue),
    ancestor_walk(Queue, Seen1, Seen).

%% requirement_subject(?ReqId, ?SubjectKey, ?Via)
% A current requirement is about SubjectKey.  Via is constrains(FactId) for a
% constrains link to a subject fact, grounds(FactId) for a fact grounding one
% of its claims that carries the key, or anchor(ClaimKey) for a subject an
% unmodeled claim names in the requirement's semantic_inventory.
requirement_subject(ReqId, SubjectKey, constrains(FactId)) :-
    kb:current_req(ReqId),
    kb_relationship(constrains, ReqId, FactId),
    kb:fact_subject_key(FactId, SubjectKey).
requirement_subject(ReqId, SubjectKey, grounds(FactId)) :-
    kb:current_req(ReqId),
    member(Type, [requires_property, requires_predicate, requires_rule]),
    kb_relationship(Type, ReqId, FactId),
    grounding_fact_subject(FactId, SubjectKey).
requirement_subject(ReqId, SubjectKey, anchor(ClaimKey)) :-
    kb:current_req(ReqId),
    requirement_claim_anchor(ReqId, ClaimKey, SubjectKey).

grounding_fact_subject(FactId, SubjectKey) :-
    kb_entity(FactId, fact, Props),
    memberchk(subject_key=Raw, Props),
    kb:normalize_term_atom(Raw, SubjectKey),
    SubjectKey \== ''.

%% requirement_inventory_entry(+ReqId, -Entry)
requirement_inventory_entry(ReqId, Entry) :-
    kb_entity(ReqId, req, Props),
    memberchk(semantic_inventory=Raw, Props),
    inventory_entries(Raw, Entries),
    member(Entry, Entries).

inventory_entries(Raw, Entries) :-
    (   is_list(Raw) -> Entries = Raw
    ;   Raw = ^^(Value, _) -> inventory_entries(Value, Entries)
    ;   (atom(Raw) ; string(Raw)),
        catch(atom_json_dict(Raw, Json, [value_string_as(atom)]), _, fail),
        is_list(Json)
    ->  Entries = Json
    ;   Entries = []
    ).

entry_field(Entry, Key, Value) :-
    (   is_dict(Entry)
    ->  get_dict(Key, Entry, Value)
    ;   is_list(Entry),
        memberchk(Key=Value, Entry)
    ).

entry_atom(Entry, Key, Atom) :-
    entry_field(Entry, Key, Raw),
    kb:normalize_term_atom(Raw, Atom).

entry_subjects(Entry, Subjects) :-
    (   entry_field(Entry, subjects, Raw),
        is_list(Raw)
    ->  maplist(kb:normalize_term_atom, Raw, Subjects0),
        exclude(==(''), Subjects0, Subjects1),
        sort(Subjects1, Subjects)
    ;   Subjects = []
    ).

%% requirement_claim_anchor(+ReqId, -ClaimKey, -SubjectKey)
% A subject an inventory claim of ReqId names.
requirement_claim_anchor(ReqId, ClaimKey, SubjectKey) :-
    requirement_inventory_entry(ReqId, Entry),
    entry_atom(Entry, claim_key, ClaimKey),
    entry_subjects(Entry, Subjects),
    member(SubjectKey, Subjects).

%% requirement_subject_pair(?ReqA, ?ReqB, ?SubjectKey)
% Two current requirements about one subject: SubjectKey is a subject ReqA is
% about, and ReqB is about it or about a narrower subject.  Each unordered
% pair is reported once per shared subject, with ReqA @< ReqB.
requirement_subject_pair(ReqA, ReqB, SubjectKey) :-
    requirement_subject_index(Index),
    member(Pair, Index),
    Pair = pair(ReqA, ReqB, SubjectKey).

requirement_subject_index(Pairs) :-
    findall(SubjectKey-ReqId, requirement_subject(ReqId, SubjectKey, _), Direct0),
    sort(Direct0, Direct),
    transpose_pairs(Direct, ByReq0),
    keysort(ByReq0, ByReq),
    group_pairs_by_key(ByReq, ReqSubjects),
    findall(
        pair(Low, High, Shared),
        (   member(ReqB-SubjectsB, ReqSubjects),
            member(Narrow, SubjectsB),
            (   Shared = Narrow
            ;   subject_ancestor(Narrow, Shared)
            ),
            member(Shared-ReqA, Direct),
            ReqA \== ReqB,
            msort([ReqA, ReqB], [Low, High])
        ),
        Pairs0
    ),
    sort(Pairs0, Pairs).

%% ------------------------------------------------------------------
%% claim-subject-missing
%% ------------------------------------------------------------------

%% check_claim_subject_missing(-Violations)
% A current requirement's claim that states or scopes a rule
% (anchored_claim_role/1) and that no fact grounds (unmodeled_claim_status/1)
% must name the subjects it is about in its inventory entry's `subjects`.
% Without them Kibi cannot tell which other requirements the claim may
% contradict, so the claim is never compared with anything.
check_claim_subject_missing(Violations) :-
    findall(Violation, claim_subject_missing_violation(Violation), Raw),
    sort(Raw, Violations).

claim_subject_missing_violation(violation(
    'claim-subject-missing',
    ReqId,
    Description,
    Suggestion,
    Source,
    _{claimKey: ClaimKey, role: Role, status: Status}
)) :-
    kb:current_req(ReqId),
    requirement_inventory_entry(ReqId, Entry),
    entry_atom(Entry, role, Role),
    anchored_claim_role(Role),
    entry_atom(Entry, status, Status),
    unmodeled_claim_status(Status),
    entry_subjects(Entry, []),
    entry_atom(Entry, claim_key, ClaimKey),
    entry_text(Entry, claim_text, ClaimText),
    format(string(Description),
        "Requirement ~w states \"~w\" (~w, ~w) without naming the subjects it is about, so it is never compared with the other requirements on those subjects",
        [ReqId, ClaimText, Role, Status]),
    format(string(Suggestion),
        "Add `subjects: [<subject_key>, ...]` to inventory entry ~w of ~w, naming the defined subject facts the claim talks about (kb_query factKind subject lists them; define a missing one as a subject fact first), or model the claim",
        [ClaimKey, ReqId]),
    requirement_source(ReqId, Source).

entry_text(Entry, Key, Text) :-
    (   entry_field(Entry, Key, Raw)
    ->  (   string(Raw) -> Text = Raw
        ;   atom(Raw) -> atom_string(Raw, Text)
        ;   term_string(Raw, Text)
        )
    ;   Text = ""
    ).

requirement_source(ReqId, Source) :-
    (   kb_entity(ReqId, req, Props),
        memberchk(source=Raw, Props)
    ->  kb:normalize_term_atom(Raw, Source)
    ;   Source = ""
    ).

%% ------------------------------------------------------------------
%% claim-subject-undefined
%% ------------------------------------------------------------------

%% check_claim_subject_undefined(-Violations)
% Every subject key the domain layer names must be a defined (active) subject
% fact: the subjects of a current requirement's inventory claims, and the
% part_of, kind_of and distinct_from keys of an active subject fact.  An
% undefined key is a term nobody defined, which is how two requirements end
% up meaning different things by one word.
check_claim_subject_undefined(Violations) :-
    findall(Violation, claim_subject_undefined_violation(Violation), Raw),
    sort(Raw, Violations).

claim_subject_undefined_violation(violation(
    'claim-subject-undefined',
    ReqId,
    Description,
    Suggestion,
    Source,
    _{claimKey: ClaimKey, subjectKey: SubjectKey}
)) :-
    kb:current_req(ReqId),
    requirement_claim_anchor(ReqId, ClaimKey, SubjectKey),
    \+ subject_is_defined(SubjectKey),
    format(string(Description),
        "Inventory claim ~w of requirement ~w names subject ~w, which no active subject fact defines",
        [ClaimKey, ReqId, SubjectKey]),
    format(string(Suggestion),
        "Define ~w as a subject fact (fact_kind subject, subject_key ~w) whose body says what it is and what it is not, or name an existing subject instead",
        [SubjectKey, SubjectKey]),
    requirement_source(ReqId, Source).
claim_subject_undefined_violation(violation(
    'claim-subject-undefined',
    FactId,
    Description,
    Suggestion,
    Source,
    _{subjectKey: SubjectKey, field: Field, target: Target}
)) :-
    subject_defined(SubjectKey, FactId),
    member(Field, [part_of, kind_of, distinct_from]),
    subject_relation_keys(FactId, Field, Targets),
    member(Target, Targets),
    \+ subject_is_defined(Target),
    format(string(Description),
        "Subject ~w (~w) lists ~w under ~w, which no active subject fact defines",
        [SubjectKey, FactId, Target, Field]),
    format(string(Suggestion),
        "Define ~w as a subject fact, or remove it from ~w of ~w",
        [Target, Field, FactId]),
    fact_source(FactId, Source).

fact_source(FactId, Source) :-
    (   kb_entity(FactId, fact, Props),
        memberchk(source=Raw, Props)
    ->  kb:normalize_term_atom(Raw, Source)
    ;   Source = ""
    ).

%% ------------------------------------------------------------------
%% Domain view
%% ------------------------------------------------------------------

%% subject_domain_json(+SubjectKey, -Json)
% Everything that governs one subject: its subject facts, broader and
% narrower subjects, the current requirements about it or a narrower subject
% (and how), the claims on it, and the scenarios that assume those claims.
% Definitions live in the subject facts' bodies, which the host reads.
subject_domain_json(SubjectKey0, Json) :-
    kb:normalize_term_atom(SubjectKey0, SubjectKey),
    findall(FactId, subject_defined(SubjectKey, FactId), FactIds0),
    sort(FactIds0, FactIds),
    findall(Broader, subject_broader(SubjectKey, Broader), Broader0),
    sort(Broader0, BroaderKeys),
    subject_ancestors(SubjectKey, Ancestors),
    findall(Narrow,
            (   subject_defined(Narrow, _),
                Narrow \== SubjectKey,
                subject_broader(Narrow, SubjectKey)
            ),
            Narrower0),
    sort(Narrower0, NarrowerKeys),
    findall(Key,
            (   member(Key, [SubjectKey|NarrowerKeys])
            ;   subject_defined(Key, _),
                subject_ancestor(Key, SubjectKey)
            ),
            Scope0),
    sort(Scope0, Scope),
    findall(ReqId-row(Key, Via),
            (   member(Key, Scope),
                requirement_subject(ReqId, Key, Via)
            ),
            ReqRows0),
    sort(ReqRows0, ReqRows),
    group_pairs_by_key(ReqRows, ByReq),
    maplist(domain_requirement_json, ByReq, Requirements),
    findall(Claim,
            (   member(Key, Scope),
                domain_claim_json(Key, Claim)
            ),
            Claims0),
    sort(Claims0, Claims),
    findall(ScenarioId,
            (   member(Claim, Claims),
                get_dict(id, Claim, ClaimFactId),
                kb_relationship(assumes, ScenarioId, ClaimFactId)
            ),
            Scenarios0),
    sort(Scenarios0, ScenarioIds),
    maplist(domain_scenario_json, ScenarioIds, Scenarios),
    findall(DistinctKey,
            (   member(FactId, FactIds),
                subject_relation_keys(FactId, distinct_from, DistinctKeys),
                member(DistinctKey, DistinctKeys)
            ),
            Distinct0),
    sort(Distinct0, Distinct),
    maplist(subject_fact_json, FactIds, SubjectFacts),
    Response = _{
        subjectKey: SubjectKey,
        defined: Defined,
        subjectFacts: SubjectFacts,
        broader: BroaderKeys,
        ancestors: Ancestors,
        narrower: NarrowerKeys,
        distinctFrom: Distinct,
        requirements: Requirements,
        claims: Claims,
        scenarios: Scenarios
    },
    (   FactIds == [] -> Defined = false ; Defined = true ),
    with_output_to(string(Json), json_write_dict(current_output, Response, [width(0)])).

subject_fact_json(FactId, _{id: FactId, title: Title, source: Source, partOf: PartOf, kindOf: KindOf}) :-
    entity_string(FactId, fact, title, Title),
    entity_string(FactId, fact, source, Source),
    subject_relation_keys(FactId, part_of, PartOf),
    subject_relation_keys(FactId, kind_of, KindOf).

domain_requirement_json(ReqId-Rows, _{id: ReqId, title: Title, status: Status, via: Via}) :-
    entity_string(ReqId, req, title, Title),
    entity_string(ReqId, req, status, Status),
    maplist(via_json, Rows, Via0),
    sort(Via0, Via).

via_json(row(Key, constrains(FactId)), _{subjectKey: Key, link: constrains, factId: FactId}).
via_json(row(Key, grounds(FactId)), _{subjectKey: Key, link: grounds, factId: FactId}).
via_json(row(Key, anchor(ClaimKey)), _{subjectKey: Key, link: anchor, claimKey: ClaimKey}).

domain_claim_json(SubjectKey, _{id: FactId, factKind: Kind, subjectKey: SubjectKey, title: Title, requirements: Reqs}) :-
    kb_entity(FactId, fact, Props),
    memberchk(fact_kind=RawKind, Props),
    kb:normalize_term_atom(RawKind, Kind),
    Kind \== subject,
    memberchk(subject_key=RawKey, Props),
    kb:normalize_term_atom(RawKey, SubjectKey),
    \+ subject_fact_inactive(FactId),
    entity_string(FactId, fact, title, Title),
    findall(ReqId,
            (   member(Type, [requires_property, requires_predicate, requires_rule]),
                kb_relationship(Type, ReqId, FactId),
                kb:current_req(ReqId)
            ),
            Reqs0),
    sort(Reqs0, Reqs).

domain_scenario_json(ScenarioId, _{id: ScenarioId, title: Title}) :-
    entity_string(ScenarioId, scenario, title, Title).

entity_string(Id, Type, Key, Text) :-
    (   kb_entity(Id, Type, Props),
        memberchk(Key=Raw, Props)
    ->  raw_string(Raw, Text)
    ;   Text = ""
    ).

raw_string(^^(Value, _), Text) :- !, raw_string(Value, Text).
raw_string(literal(type(_, Value)), Text) :- !, raw_string(Value, Text).
raw_string(literal(Value), Text) :- !, raw_string(Value, Text).
raw_string(Value, Text) :- string(Value), !, Text = Value.
raw_string(Value, Text) :- atom(Value), !, atom_string(Value, Text).
raw_string(Value, Text) :- term_string(Value, Text).
