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
%   * Does a must requirement state its positive behaviour?  A success
%     scenario that specifies it and assumes a fact (other than the subject
%     fact) on one of its subjects lets scenario-feasibility refuse a
%     combination that another current requirement forbids
%     (positive_scenario_gap/4).
%   * Which stored pairs hold unmodeled claims nothing compares
%     (related-requirement-unmodeled), and which pair_reviews verdicts
%     settle them.
%
% The subject facts, the subjects of the current requirements and the
% broader subjects of every key are read once per KB generation into one
% index (domain_index/1), so a query over many subjects reads the store once.
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
    subject_domain_json/2,
    subject_neighbours_json/4,
    positive_scenario/3,
    positive_scenario_gap/4,
    positive_scenario_gaps_json/1,
    open_claim/5,
    unmodeled_pair_gap/5,
    check_related_requirement_unmodeled/1
]).

:- use_module(library(http/json)).
:- use_module(library(apply)).
:- use_module(library(lists)).
:- use_module(library(pairs)).
:- use_module(library(assoc)).
:- use_module(library(ordsets)).
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

%% ------------------------------------------------------------------
%% The domain index
%% ------------------------------------------------------------------

:- dynamic domain_index_memo/2.

%% domain_index(-Index)
% index(Defined, Ancestors, Claims, BySubject): Defined maps each subject key
% to its active subject facts, Ancestors every subject key the layer knows
% (defined, or named by a current requirement) to the subjects broader than
% it, Claims each subject key to the active non-subject facts on it, and
% BySubject each subject key to the Req-Via rows of the current requirements
% about it (requirement_subject/3).  Reading a subject fact decodes its
% entity, so every lookup would otherwise read all facts; the index is built
% once and memoized per KB generation.
domain_index(Index) :-
    domain_index_key(Key),
    % mutalog-disable-next-line goal_fail: a recomputation gives the same index; the memo only saves it
    (   domain_index_memo(Key, Cached)
    ->  Index = Cached
    ;   build_domain_index(Computed),
        % mutalog-disable-next-line goal_true: a stale memo never matches a later key; dropping it only frees memory
        retractall(domain_index_memo(_, _)),
        % mutalog-disable-next-line goal_true: without the memo every call rebuilds the same index
        assertz(domain_index_memo(Key, Computed)),
        Index = Computed
    ).

% The RDF generation restarts when a store is detached, so the key also
% names the attached store and the snapshot it was attached at.
domain_index_key(key(Attached, Snapshot, IndexKey)) :-
    findall(Directory, kb:kb_attached(Directory), Attached),
    % mutalog-disable-next-line goal_true,goal_fail: each fixture store attaches in a new directory, which the key already names
    findall(Stamp, kb:kb_attached_snapshot(Stamp), Snapshot),
    kb:index_verification_key(domain_subjects, IndexKey).

build_domain_index(index(Defined, Ancestors, Claims, BySubject)) :-
    findall(Row, fact_row(Row), Rows),
    findall(Key-FactId, member(subject(Key, FactId), Rows), SubjectRows),
    rows_assoc(SubjectRows, Defined),
    findall(Key-FactId, member(claim(Key, FactId), Rows), ClaimRows),
    rows_assoc(ClaimRows, Claims),
    findall(Key-(ReqId-Via), requirement_subject(ReqId, Key, Via), ReqRows),
    rows_assoc(ReqRows, BySubject),
    assoc_to_keys(Defined, DefinedKeys),
    assoc_to_keys(BySubject, ReqKeys),
    ord_union(DefinedKeys, ReqKeys, Keys),
    findall(Key-KeyAncestors,
            (   member(Key, Keys),
                ancestors_in(Defined, Key, KeyAncestors)
            ),
            AncestorRows),
    list_to_assoc(AncestorRows, Ancestors).

rows_assoc(Rows0, Assoc) :-
    sort(Rows0, Rows),
    group_pairs_by_key(Rows, Grouped),
    list_to_assoc(Grouped, Assoc).

% An active fact with a subject key: subject(Key, FactId) for a subject fact,
% claim(Key, FactId) for any other fact kind.
fact_row(Row) :-
    kb_entity(FactId, fact, Props),
    \+ props_inactive(Props),
    memberchk(subject_key=RawKey, Props),
    kb:normalize_term_atom(RawKey, Key),
    Key \== '',
    (   memberchk(fact_kind=RawKind, Props),
        kb:normalize_term_atom(RawKind, subject)
    ->  Row = subject(Key, FactId)
    ;   Row = claim(Key, FactId)
    ).

props_inactive(Props) :-
    memberchk(status=Raw, Props),
    kb:normalize_term_atom(Raw, Status),
    inactive_fact_status(Status).

%% subject_defined(?SubjectKey, ?FactId)
% An active subject fact with this key.
subject_defined(SubjectKey, FactId) :-
    domain_index(index(Defined, _, _, _)),
    gen_assoc(SubjectKey, Defined, FactIds),
    member(FactId, FactIds).

defined_in(Defined, SubjectKey) :-
    get_assoc(SubjectKey, Defined, _).

%% subject_relation_keys(+FactId, +Field, -Keys)
% The subject keys a subject fact lists under part_of, kind_of or
% distinct_from; [] when the field is absent.
subject_relation_keys(FactId, Field, Keys) :-
    (   kb_entity(FactId, fact, Props),
        memberchk(Field=Raw, Props),
        kb:normalize_term_atom_list(Raw, Keys0)
    ->  sort(Keys0, Keys)
    ;   Keys = []
    ).

%% subject_broader(+SubjectKey, -Broader)
% A defined subject directly broader than SubjectKey: its nearest dotted
% prefix that is defined, or a key its subject fact lists under part_of or
% kind_of.
subject_broader(SubjectKey, Broader) :-
    domain_index(index(Defined, _, _, _)),
    broader_in(Defined, SubjectKey, Broader).

broader_in(Defined, SubjectKey, Broader) :-
    nearest_defined_prefix(Defined, SubjectKey, Broader).
broader_in(Defined, SubjectKey, Broader) :-
    get_assoc(SubjectKey, Defined, FactIds),
    member(FactId, FactIds),
    member(Field, [part_of, kind_of]),
    subject_relation_keys(FactId, Field, Keys),
    member(Broader, Keys),
    Broader \== SubjectKey,
    defined_in(Defined, Broader).

nearest_defined_prefix(Defined, SubjectKey, Prefix) :-
    atomic_list_concat(Segments, '.', SubjectKey),
    findall(Candidate,
            (   append(PrefixSegments, [_|_], Segments),
                % The empty prefix gives '', which no subject defines.
                atomic_list_concat(PrefixSegments, '.', Candidate)
            ),
            Candidates),
    % append/3 enumerates the shortest prefix first; take the longest
    % defined one, also when the caller asks about a given Prefix.
    reverse(Candidates, Longest),
    once(( member(Nearest, Longest),
           defined_in(Defined, Nearest) )),
    Prefix = Nearest.

%% subject_ancestor(+SubjectKey, -Ancestor)
% Every subject transitively broader than SubjectKey, each once and never
% SubjectKey itself.  A cycle of part_of or kind_of links stops at the first
% repeated key.
subject_ancestor(SubjectKey, Ancestor) :-
    domain_index(Index),
    key_ancestors(Index, SubjectKey, Ancestors),
    member(Ancestor, Ancestors).

key_ancestors(index(Defined, Ancestors, _, _), SubjectKey, KeyAncestors) :-
    % mutalog-disable-next-line goal_fail: a key the index lacks is walked instead, with the same answer
    (   get_assoc(SubjectKey, Ancestors, Found)
    ->  KeyAncestors = Found
    ;   ancestors_in(Defined, SubjectKey, KeyAncestors)
    ).

ancestors_in(Defined, SubjectKey, Ancestors) :-
    ancestor_walk(Defined, [SubjectKey], [SubjectKey], Seen),
    subtract(Seen, [SubjectKey], Ancestors0),
    sort(Ancestors0, Ancestors).

member_of(List, Element) :-
    memberchk(Element, List).

ancestor_walk(_, [], Seen, Seen).
ancestor_walk(Defined, [Key|Rest], Seen0, Seen) :-
    findall(Broader, broader_in(Defined, Key, Broader), Broaders0),
    sort(Broaders0, Broaders),
    exclude(member_of(Seen0), Broaders, New),
    append(Seen0, New, Seen1),
    append(Rest, New, Queue),
    ancestor_walk(Defined, Queue, Seen1, Seen).

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
    (   is_list(Raw)
    ->  Entries = Raw
    ;   % The store hands a ledger back as JSON text, or (as checks.pl reads
        % it) as a Prolog term written as text.
        catch(atom_json_dict(Raw, Json, [value_string_as(atom)]), _,
              % mutalog-disable-next-line goal_true: a failed parse leaves Json unbound, which is_list/1 rejects just as fail would
              fail),
        is_list(Json)
    ->  Entries = Json
    ;   catch(term_string(Term, Raw), _,
              % mutalog-disable-next-line goal_true: a failed parse leaves Term unbound, which is_list/1 rejects just as fail would
              fail),
        is_list(Term)
    ->  Entries = Term
    ;   Entries = []
    ).

entry_field(Entry, Key, Value) :-
    (   is_dict(Entry)
    ->  get_dict(Key, Entry, Value)
    ;   memberchk(Key=Value, Entry)
    ).

entry_atom(Entry, Key, Atom) :-
    entry_field(Entry, Key, Raw),
    kb:normalize_term_atom(Raw, Atom).

entry_subjects(Entry, Subjects) :-
    findall(Subject,
            (   entry_field(Entry, subjects, Raw),
                member(RawSubject, Raw),
                kb:normalize_term_atom(RawSubject, Subject),
                Subject \== ''
            ),
            Subjects0),
    sort(Subjects0, Subjects).

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
    domain_index(Index),
    requirement_subject_index(Index, Pairs),
    member(pair(ReqA, ReqB, SubjectKey), Pairs).

% Each requirement meets the requirements on each of its subjects and on
% every subject broader than one of them, looked up by subject in the index.
requirement_subject_index(Index, Pairs) :-
    Index = index(_, _, _, BySubject),
    assoc_to_list(BySubject, KeyRows),
    findall(Key-Reqs,
            (   member(Key-Rows, KeyRows),
                pairs_keys(Rows, Reqs0),
                sort(Reqs0, Reqs)
            ),
            KeyReqs),
    list_to_assoc(KeyReqs, ReqsOn),
    findall(
        pair(Low, High, Shared),
        (   member(Narrow-ReqsB, KeyReqs),
            key_ancestors(Index, Narrow, Ancestors),
            member(Shared, [Narrow|Ancestors]),
            get_assoc(Shared, ReqsOn, ReqsA),
            member(ReqB, ReqsB),
            member(ReqA, ReqsA),
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
    ->  raw_string(Raw, Text)
    ;   Text = ""
    ).

requirement_source(ReqId, Source) :-
    entity_source(ReqId, req, Source).

% The source of an entity as checks.pl reports it; "" when it records none.
entity_source(Id, Type, Source) :-
    (   kb_entity(Id, Type, Props),
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
    domain_index(index(Defined, _, _, _)),
    findall(Violation, claim_subject_undefined_violation(Defined, Violation), Raw),
    sort(Raw, Violations).

claim_subject_undefined_violation(Defined, violation(
    'claim-subject-undefined',
    ReqId,
    Description,
    Suggestion,
    Source,
    _{claimKey: ClaimKey, subjectKey: SubjectKey}
)) :-
    kb:current_req(ReqId),
    requirement_claim_anchor(ReqId, ClaimKey, SubjectKey),
    \+ defined_in(Defined, SubjectKey),
    format(string(Description),
        "Inventory claim ~w of requirement ~w names subject ~w, which no active subject fact defines",
        [ClaimKey, ReqId, SubjectKey]),
    format(string(Suggestion),
        "Define ~w as a subject fact (fact_kind subject, subject_key ~w) whose body says what it is and what it is not, or name an existing subject instead",
        [SubjectKey, SubjectKey]),
    requirement_source(ReqId, Source).
claim_subject_undefined_violation(Defined, violation(
    'claim-subject-undefined',
    FactId,
    Description,
    Suggestion,
    Source,
    _{subjectKey: SubjectKey, field: Field, target: Target}
)) :-
    gen_assoc(SubjectKey, Defined, FactIds),
    member(FactId, FactIds),
    member(Field, [part_of, kind_of, distinct_from]),
    subject_relation_keys(FactId, Field, Targets),
    member(Target, Targets),
    \+ defined_in(Defined, Target),
    relation_undefined_text(Field, SubjectKey, FactId, Target, Description),
    format(string(Suggestion),
        "Define ~w as a subject fact, or remove it from ~w of ~w",
        [Target, Field, FactId]),
    fact_source(FactId, Source).

relation_undefined_text(distinct_from, SubjectKey, FactId, Target, Description) :-
    !,
    format(string(Description),
        "Subject ~w (~w) says under distinct_from that it is not ~w, which no active subject fact defines",
        [SubjectKey, FactId, Target]).
relation_undefined_text(Field, SubjectKey, FactId, Target, Description) :-
    format(string(Description),
        "Subject ~w (~w) names ~w as a broader subject under ~w, but no active subject fact defines ~w, so ~w does not nest under it",
        [SubjectKey, FactId, Target, Field, Target, SubjectKey]).

fact_source(FactId, Source) :-
    entity_source(FactId, fact, Source).

%% ------------------------------------------------------------------
%% Domain view
%% ------------------------------------------------------------------

%% subject_domain_json(+SubjectKey, -Json)
% Everything that governs one subject: its subject facts, broader and
% narrower subjects, the current requirements about it or a narrower subject
% (and how), the grounded claims on it, the unmodeled claims that name it,
% and the scenarios that assume the grounded claims.  Definitions live in
% the subject facts' bodies, which the host reads.  A subject in a part_of
% or kind_of cycle is listed as broader, never also as narrower.
subject_domain_json(SubjectKey0, Json) :-
    kb:normalize_term_atom(SubjectKey0, SubjectKey),
    domain_index(Index),
    Index = index(Defined, _, ClaimFacts, BySubject),
    assoc_list(Defined, SubjectKey, FactIds),
    findall(Broader, broader_in(Defined, SubjectKey, Broader), Broader0),
    sort(Broader0, BroaderKeys),
    key_ancestors(Index, SubjectKey, Ancestors),
    narrower_keys(Index, SubjectKey, Ancestors, Below),
    findall(Narrow,
            (   member(Narrow, Below),
                defined_in(Defined, Narrow),
                broader_in(Defined, Narrow, SubjectKey)
            ),
            Narrower0),
    sort(Narrower0, NarrowerKeys),
    Scope = [SubjectKey|Below],
    findall(ReqId-row(Key, Via),
            (   member(Key, Scope),
                assoc_list(BySubject, Key, Rows),
                member(ReqId-Via, Rows)
            ),
            ReqRows0),
    sort(ReqRows0, ReqRows),
    group_pairs_by_key(ReqRows, ByReq),
    maplist(domain_requirement_json, ByReq, Requirements),
    findall(Claim,
            (   member(Key, Scope),
                assoc_list(ClaimFacts, Key, KeyFacts),
                member(ClaimFactId, KeyFacts),
                domain_claim_json(Key, ClaimFactId, Claim)
            ),
            Claims0),
    sort(Claims0, Claims),
    findall(Unmodeled,
            (   member(ReqId-Rows, ByReq),
                member(row(Key, anchor(ClaimKey)), Rows),
                unmodeled_claim_json(ReqId, Key, ClaimKey, Unmodeled)
            ),
            Unmodeled0),
    sort(Unmodeled0, UnmodeledClaims),
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
        defined: Defined0,
        subjectFacts: SubjectFacts,
        broader: BroaderKeys,
        ancestors: Ancestors,
        narrower: NarrowerKeys,
        distinctFrom: Distinct,
        requirements: Requirements,
        claims: Claims,
        unmodeledClaims: UnmodeledClaims,
        scenarios: Scenarios
    },
    (   FactIds == [] -> Defined0 = false ; Defined0 = true ),
    % mutalog-disable-next-line literal: the line width only changes the layout of the JSON text, not its value
    with_output_to(string(Json), json_write_dict(current_output, Response, [width(0)])).

% The values Assoc holds for Key; [] when it holds none.
assoc_list(Assoc, Key, Values) :-
    (   get_assoc(Key, Assoc, Found) -> Values = Found ; Values = [] ).

%% narrower_keys(+Index, +SubjectKey, +Ancestors, -Below)
% Every subject key the index knows that SubjectKey is broader than, except
% those also broader than SubjectKey (a part_of or kind_of cycle).
narrower_keys(Index, SubjectKey, Ancestors, Below) :-
    Index = index(_, AncestorIndex, _, _),
    findall(Key,
            (   gen_assoc(Key, AncestorIndex, KeyAncestors),
                memberchk(SubjectKey, KeyAncestors),
                \+ memberchk(Key, Ancestors)
            ),
            Below0),
    sort(Below0, Below).

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

domain_claim_json(SubjectKey, FactId, _{id: FactId, factKind: Kind, subjectKey: SubjectKey, title: Title, requirements: Reqs}) :-
    entity_string(FactId, fact, fact_kind, Kind),
    entity_string(FactId, fact, title, Title),
    findall(ReqId,
            (   member(Type, [requires_property, requires_predicate, requires_rule]),
                kb_relationship(Type, ReqId, FactId),
                kb:current_req(ReqId)
            ),
            Reqs0),
    sort(Reqs0, Reqs).

% An inventory claim that names SubjectKey and that no fact grounds yet: the
% domain view lists it apart from the grounded claims, since nothing compares
% it with them.
unmodeled_claim_json(ReqId, SubjectKey, ClaimKey, _{
    requirement: ReqId,
    claimKey: ClaimKey,
    subjectKey: SubjectKey,
    claimText: Text,
    role: Role,
    status: Status
}) :-
    requirement_inventory_entry(ReqId, Entry),
    entry_atom(Entry, claim_key, ClaimKey),
    entry_atom(Entry, status, Status),
    unmodeled_claim_status(Status),
    entry_text(Entry, claim_text, Text),
    entry_text(Entry, role, Role),
    !.

domain_scenario_json(ScenarioId, _{id: ScenarioId, title: Title}) :-
    entity_string(ScenarioId, scenario, title, Title).

entity_string(Id, Type, Key, Text) :-
    (   kb_entity(Id, Type, Props),
        memberchk(Key=Raw, Props)
    ->  raw_string(Raw, Text)
    ;   Text = ""
    ).

raw_string(^^(Value, _), Text) :- !, raw_string(Value, Text).
raw_string(Value, Text) :- atomic(Value), !, atom_string(Value, Text).
raw_string(Value, Text) :- term_string(Value, Text).

%% subject_neighbours_json(+SubjectKeys, +ReqId, +WithIds, -Json)
% What a requirement write needs to know about the subjects its claims name,
% in one store read: for each key, whether it is defined, its subject facts,
% and the other current requirements Kibi pairs with a requirement on it
% (on the key, a narrower subject or a broader one, as
% requirement_subject_pair/3 pairs them); and which of WithIds (the
% partners its pair_reviews name) are not current requirements.
subject_neighbours_json(SubjectKeys0, ReqId, WithIds0, Json) :-
    maplist(kb:normalize_term_atom, SubjectKeys0, SubjectKeys),
    domain_index(Index),
    maplist(subject_neighbour_json(Index, ReqId), SubjectKeys, Subjects),
    maplist(kb:normalize_term_atom, WithIds0, WithIds),
    findall(WithId,
            (   member(WithId, WithIds),
                \+ kb:current_req(WithId)
            ),
            NotCurrent0),
    sort(NotCurrent0, NotCurrent),
    with_output_to(string(Json),
                   json_write_dict(current_output,
                                   _{subjects: Subjects, notCurrent: NotCurrent},
                                   % mutalog-disable-next-line literal: the line width only changes the layout of the JSON text, not its value
                                   [width(0)])).

subject_neighbour_json(Index, ReqId, SubjectKey, _{
    subjectKey: SubjectKey,
    defined: Defined0,
    subjectFacts: SubjectFacts,
    requirements: Requirements
}) :-
    Index = index(Defined, _, _, BySubject),
    assoc_list(Defined, SubjectKey, FactIds),
    (   FactIds == [] -> Defined0 = false ; Defined0 = true ),
    maplist(subject_fact_json, FactIds, SubjectFacts),
    key_ancestors(Index, SubjectKey, Ancestors),
    narrower_keys(Index, SubjectKey, Ancestors, Below),
    append([SubjectKey|Below], Ancestors, Scope),
    findall(Other,
            (   member(Key, Scope),
                assoc_list(BySubject, Key, Rows),
                member(Other-_, Rows),
                Other \== ReqId
            ),
            Others0),
    sort(Others0, Others),
    maplist(neighbour_json, Others, Requirements).

neighbour_json(ReqId, _{id: ReqId, title: Title}) :-
    entity_string(ReqId, req, title, Title).

%% ------------------------------------------------------------------
%% Positive scenarios
%% ------------------------------------------------------------------

%% positive_scenario(?ReqId, ?ScenarioId, ?SubjectKey)
% ScenarioId is an active scenario that specifies the current requirement
% ReqId, expects success, and assumes an active fact other than a subject
% fact (a property value, predicate or rule) whose subject is SubjectKey or a
% narrower subject, where SubjectKey is a subject ReqId is about.  Such a
% scenario states what the requirement promises in terms scenario-feasibility
% can compare with every other current requirement on that subject; assuming
% the subject fact itself states nothing about it.
positive_scenario(ReqId, ScenarioId, SubjectKey) :-
    domain_index(Index),
    positive_scenario(Index, ReqId, ScenarioId, SubjectKey).

positive_scenario(Index, ReqId, ScenarioId, SubjectKey) :-
    Index = index(_, _, ClaimFacts, _),
    success_scenario_of(ReqId, ScenarioId),
    requirement_subject_keys(ReqId, Subjects),
    kb_relationship(assumes, ScenarioId, FactId),
    gen_assoc(AssumedKey, ClaimFacts, FactIds),
    memberchk(FactId, FactIds),
    (   memberchk(AssumedKey, Subjects),
        SubjectKey = AssumedKey
    ;   key_ancestors(Index, AssumedKey, Ancestors),
        member(SubjectKey, Ancestors),
        memberchk(SubjectKey, Subjects)
    ).

success_scenario_of(ReqId, ScenarioId) :-
    kb_relationship(specified_by, ReqId, ScenarioId),
    kb_entity(ScenarioId, scenario, Props),
    memberchk(expects=Raw, Props),
    kb:normalize_term_atom(Raw, success),
    \+ props_inactive(Props).

requirement_subject_keys(ReqId, Subjects) :-
    findall(Key, requirement_subject(ReqId, Key, _), Keys0),
    sort(Keys0, Subjects).

%% positive_scenario_gap(?ReqId, -Reason, -Subjects, -SuccessScenarios)
% A current must requirement with no positive_scenario/3.  Reason is
% no_subjects when the requirement is about no subject yet (nothing a
% scenario could assume), undefined_subjects when no active subject fact
% defines any of its subjects (define one first), no_success_scenario when
% no active success scenario specifies it, and no_subject_assumption when its
% success scenarios assume nothing on its subjects.  Subjects are the
% subjects it is about and SuccessScenarios the success scenarios that
% specify it.
positive_scenario_gap(ReqId, Reason, Subjects, SuccessScenarios) :-
    domain_index(Index),
    positive_scenario_gap(Index, ReqId, Reason, Subjects, SuccessScenarios).

positive_scenario_gap(Index, ReqId, Reason, Subjects, SuccessScenarios) :-
    Index = index(Defined, _, _, _),
    kb:current_req(ReqId),
    kb:must_requirement(ReqId),
    \+ positive_scenario(Index, ReqId, _, _),
    requirement_subject_keys(ReqId, Subjects),
    findall(ScenarioId, success_scenario_of(ReqId, ScenarioId), Scenarios0),
    sort(Scenarios0, SuccessScenarios),
    (   Subjects == []
    ->  Reason = no_subjects
    ;   \+ ( member(Subject, Subjects), defined_in(Defined, Subject) )
    ->  Reason = undefined_subjects
    ;   SuccessScenarios == []
    ->  Reason = no_success_scenario
    ;   Reason = no_subject_assumption
    ).

%% positive_scenario_gaps_json(-JsonString)
% Every positive_scenario_gap/4 as {rows, evaluated}: evaluated counts the
% current must requirements judged.  The host decides which rows block, since
% only must requirements recorded after the schema 17 upgrade owe a positive
% scenario.
positive_scenario_gaps_json(JsonString) :-
    domain_index(Index),
    findall(ReqId, (kb:current_req(ReqId), kb:must_requirement(ReqId)), Musts0),
    sort(Musts0, Musts),
    length(Musts, Evaluated),
    findall(
        _{id: ReqId, reason: Reason, subjects: Subjects, successScenarios: Scenarios},
        positive_scenario_gap(Index, ReqId, Reason, Subjects, Scenarios),
        Rows0
    ),
    sort(id, @<, Rows0, Rows),
    with_output_to(string(JsonString),
                   % mutalog-disable-next-line literal: the line width only changes the layout of the JSON text, not its value
                   json_write_dict(current_output, _{rows: Rows, evaluated: Evaluated}, [width(0)])).

%% ------------------------------------------------------------------
%% related-requirement-unmodeled: unmodeled claims in a stored pair
%% ------------------------------------------------------------------

%% open_claim(?ReqId, ?ClaimKey, ?Status, -Role, -Anchors)
% A rule-bearing claim (anchored_claim_role/1, or any claim still missing)
% of the current requirement ReqId that no fact grounds (missing,
% ontology_gap or ambiguous), with its role ('' when it has none) and the
% subjects it names.  domain-contradictions and scenario-feasibility compare
% grounded facts only, so such a claim is never compared with anything.
open_claim(ReqId, ClaimKey, Status, Role, Anchors) :-
    kb:current_req(ReqId),
    requirement_inventory_entry(ReqId, Entry),
    entry_atom(Entry, status, Status),
    unmodeled_claim_status(Status),
    (   entry_atom(Entry, role, Role0) -> Role = Role0 ; Role = '' ),
    % A descriptive, rationale or example claim carries no rule, unless it
    % was never classified at all (missing).
    (   Status == missing
    ->  true
    ;   anchored_claim_role(Role)
    ),
    entry_atom(Entry, claim_key, ClaimKey),
    entry_subjects(Entry, Anchors).

%% unmodeled_pair_gaps(-Gaps)
% Every stored pair whose unmodeled claims of one side nothing settles, as
% gap(ReqId, OtherId, Via, ClaimKeys, Problem) sorted by ReqId and OtherId
% (unmodeled_pair_gap/5).  The open claims, the subject pairs and the pair
% reviews are each read once, so a subject many requirements share costs one
% pass instead of a rescan per pair.
unmodeled_pair_gaps(Gaps) :-
    domain_index(Index),
    findall(Req-(ClaimKey-Anchors), open_claim(Req, ClaimKey, _, _, Anchors), Open0),
    keysort(Open0, Open1),
    group_pairs_by_key(Open1, OpenByReq),
    list_to_assoc(OpenByReq, OpenClaims),
    requirement_subject_index(Index, SubjectPairs),
    findall(
        (ReqId-OtherId)-(Via-ClaimKey),
        unmodeled_pair_claim(Index, SubjectPairs, OpenByReq, OpenClaims, ReqId, OtherId, Via, ClaimKey),
        Rows0
    ),
    sort(Rows0, Rows),
    group_pairs_by_key(Rows, Groups),
    review_index(Reviews),
    findall(gap(ReqId, OtherId, Via, ClaimKeys, Problem),
            (   member((ReqId-OtherId)-Entries, Groups),
                pairs_keys_values(Entries, Via1, Claims1),
                sort(Via1, Via),
                sort(Claims1, ClaimKeys),
                pair_problem(Reviews, ReqId, OtherId, ClaimKeys, Problem)
            ),
            Gaps).

unmodeled_pair_claim(_Index, _SubjectPairs, OpenByReq, _OpenClaims, ReqId, OtherId, relates_to, ClaimKey) :-
    member(ReqId-Claims, OpenByReq),
    related_current_requirement(ReqId, OtherId),
    member(ClaimKey-_, Claims).
unmodeled_pair_claim(Index, SubjectPairs, _OpenByReq, OpenClaims, ReqId, OtherId, subject(Shared), ClaimKey) :-
    member(pair(A, B, Shared), SubjectPairs),
    (   ReqId = A, OtherId = B
    ;   ReqId = B, OtherId = A
    ),
    get_assoc(ReqId, OpenClaims, Claims),
    member(ClaimKey-Anchors, Claims),
    once(( member(Anchor, Anchors),
           (   Anchor == Shared
           ->  true
           ;   key_ancestors(Index, Anchor, Ancestors),
               memberchk(Shared, Ancestors)
           ) )).

related_current_requirement(ReqId, OtherId) :-
    (   kb_relationship(relates_to, ReqId, OtherId)
    ;   kb_relationship(relates_to, OtherId, ReqId)
    ),
    OtherId \== ReqId,
    kb:current_req(OtherId).

%% review_index(-Reviews)
% reviews(ByPair, Dangling): ByPair maps Owner-With to the pair_reviews
% entries recorded on requirement Owner about With, and Dangling each current
% requirement to the `with` values of its reviews that name no current
% requirement.
review_index(reviews(ByPair, Dangling)) :-
    findall((Owner-With)-Review,
            (   requirement_pair_review(Owner, Review),
                entry_atom(Review, with, With)
            ),
            Rows),
    rows_assoc(Rows, ByPair),
    findall(Owner-With,
            (   member((Owner-With)-_, Rows),
                \+ kb:current_req(With)
            ),
            DanglingRows),
    rows_assoc(DanglingRows, Dangling).

requirement_pair_review(ReqId, Review) :-
    kb_entity(ReqId, req, Props),
    memberchk(pair_reviews=Raw, Props),
    inventory_entries(Raw, Reviews),
    member(Review, Reviews).

%% pair_review(+Reviews, ?ReqId, ?OtherId, -Owner, -Review)
% A pair_reviews entry about ReqId and OtherId, recorded on either
% requirement (Owner) with `with` naming the other one.
pair_review(reviews(ByPair, _), ReqId, OtherId, ReqId, Review) :-
    get_assoc(ReqId-OtherId, ByPair, Found),
    member(Review, Found).
pair_review(reviews(ByPair, _), ReqId, OtherId, OtherId, Review) :-
    get_assoc(OtherId-ReqId, ByPair, Found),
    member(Review, Found).

%% pair_problem(+Reviews, +ReqId, +OtherId, +ClaimKeys, -Problem)
% Why the unmodeled claims ClaimKeys of ReqId stay unsettled in its pair
% with OtherId; fails when a review settles them.  Problem is unreviewed
% when no pair_reviews entry covers the pair, conflict when a review on
% either side records a conflict, otherwise the problem of the review
% recorded on ReqId (else on OtherId).
pair_problem(Reviews, ReqId, OtherId, ClaimKeys, Problem) :-
    findall(Owner-Review, pair_review(Reviews, ReqId, OtherId, Owner, Review), Found),
    (   Found == []
    ->  Problem = unreviewed
    ;   % A conflict recorded on either side stands until a person resolves
        % it; the other side's no_conflict does not settle the pair.
        member(_-Conflict, Found),
        entry_atom(Conflict, verdict, conflict)
    ->  Problem = conflict
    ;   \+ ( member(Owner-Review, Found),
             \+ pair_review_problem(ReqId, OtherId, ClaimKeys, Owner, Review, _) )
    ->  % pair_review/5 lists the reviews recorded on ReqId first.
        Found = [ChosenOwner-ChosenReview|_],
        pair_review_problem(ReqId, OtherId, ClaimKeys, ChosenOwner, ChosenReview, Problem)
    ).

%% pair_review_problem(+ReqId, +OtherId, +ClaimKeys, +Owner, +Review, -Problem)
% Why Review, recorded on requirement Owner, does not settle the unmodeled
% claims ClaimKeys of ReqId in its pair with OtherId; fails when it does.  A
% verdict counts only while a relates_to edge links the pair, carries what
% makes it checkable (the separating condition of no_conflict, the resolving
% entity or clause of interacts), names every unmodeled claim, and, on a
% must or firm pair, names who approved it unless a person recorded it on a
% requirement no agent wrote.  A conflict verdict never settles a pair: a
% person decides which rule holds.
pair_review_problem(ReqId, OtherId, ClaimKeys, Owner, Review, Problem) :-
    (   \+ entry_atom(Review, verdict, _)
    ->  Problem = no_verdict
    ;   entry_atom(Review, verdict, Verdict),
        \+ memberchk(Verdict, [no_conflict, interacts, conflict])
    ->  Problem = unknown_verdict(Verdict)
    ;   entry_atom(Review, verdict, conflict)
    ->  Problem = conflict
    ;   \+ related_current_requirement(ReqId, OtherId)
    ->  Problem = no_edge
    ;   entry_atom(Review, verdict, no_conflict),
        \+ review_text(Review, separated_by)
    ->  Problem = missing(separated_by)
    ;   entry_atom(Review, verdict, interacts),
        \+ ( review_list(Review, resolved_by, Resolvers),
             Resolvers \== [] )
    ->  Problem = missing(resolved_by)
    ;   entry_atom(Review, verdict, interacts),
        review_list(Review, resolved_by, Resolvers),
        rejected_resolvers(ReqId, OtherId, Resolvers, Rejected),
        Rejected \== []
    ->  Problem = missing(resolved_by, Rejected)
    ;   uncovered_claims(ClaimKeys, Review, Uncovered),
        Uncovered \== []
    ->  Problem = stale(Uncovered)
    ;   review_needs_approval(ReqId, OtherId, Owner, Review)
    ->  Problem = unapproved
    ).

review_text(Review, Key) :-
    entry_field(Review, Key, Raw),
    raw_string(Raw, Text),
    split_string(Text, "", " \t\n", [Trimmed]),
    Trimmed \== "".

review_list(Review, Key, Items) :-
    entry_field(Review, Key, Raw),
    (   is_list(Raw)
    ->  maplist(kb:normalize_term_atom, Raw, Items0)
    ;   kb:normalize_term_atom(Raw, Item),
        Items0 = [Item]
    ),
    exclude(==(''), Items0, Items).

%% resolver_exists(+ReqId, +OtherId, +Resolver)
% What resolves an interaction, never either requirement of the pair itself:
% a third current requirement (an exception, or the rule that decides
% between them), an active scenario that one of them specifies (stating the
% combined behaviour), an active fact one of them links, or a condition or
% exception claim of either requirement that scopes one of them.
resolver_exists(ReqId, OtherId, Resolver) :-
    \+ memberchk(Resolver, [ReqId, OtherId]),
    resolver(ReqId, OtherId, Resolver).

%% rejected_resolvers(+ReqId, +OtherId, +Resolvers, -Rejected)
% The resolved_by entries that resolve nothing, each as Resolver-Why: pair
% when it names a requirement of the pair itself, unknown when it names
% nothing resolver_exists/3 accepts.
rejected_resolvers(ReqId, OtherId, Resolvers, Rejected) :-
    findall(Resolver-Why,
            (   member(Resolver, Resolvers),
                \+ resolver_exists(ReqId, OtherId, Resolver),
                (   memberchk(Resolver, [ReqId, OtherId]) -> Why = pair ; Why = unknown )
            ),
            Rejected).

resolver(_ReqId, _OtherId, Resolver) :-
    % mutalog-disable-next-line cut_insert: resolver_exists/3 is only asked inside forall/2
    kb:current_req(Resolver).
resolver(ReqId, OtherId, Resolver) :-
    member(Req, [ReqId, OtherId]),
    member(Link-Type, [specified_by-scenario, constrains-fact, requires_property-fact,
                       requires_predicate-fact, requires_rule-fact]),
    kb_relationship(Link, Req, Resolver),
    kb_entity(Resolver, Type, Props),
    \+ props_inactive(Props).
resolver(ReqId, OtherId, Resolver) :-
    member(Req, [ReqId, OtherId]),
    requirement_inventory_entry(Req, Entry),
    entry_atom(Entry, claim_key, Resolver),
    entry_atom(Entry, role, Role),
    memberchk(Role, [condition, exception]).

% The unmodeled claims the review does not name.  A claim_key already
% changes with the claim's text, so naming it is what ties the verdict to
% the claim; a payload_hash in the review is accepted and ignored, since it
% hashes the whole advisor receipt rather than the claim.
uncovered_claims(ClaimKeys, Review, Uncovered) :-
    findall(Key,
            (   entry_field(Review, claims, Claims),
                member(Claim, Claims),
                review_claim_key(Claim, Key)
            ),
            Named),
    exclude(member_of(Named), ClaimKeys, Uncovered).

review_claim_key(Claim, ClaimKey) :-
    (   atomic(Claim)
    ->  kb:normalize_term_atom(Claim, ClaimKey)
    ;   entry_atom(Claim, claim_key, ClaimKey)
    ).

% A verdict on a must or firm pair counts only once a person approved it
% (origin.approved_by on the review), so the agent writing a requirement
% cannot clear its own gate.  A review that does not say a person recorded
% it reads as an agent's, and so does any review on a requirement an agent
% wrote: origin.kind human there is the agent's own word.
review_needs_approval(ReqId, OtherId, Owner, Review) :-
    \+ review_origin_field(Review, approved_by, _),
    (   \+ review_origin_field(Review, kind, human)
    ;   kb_entity(Owner, req, Props),
        requirement_origin_kind(Props, agent)
    ),
    (   decisive_requirement(ReqId)
    ;   decisive_requirement(OtherId)
    ).

review_origin_field(Review, Key, Value) :-
    entry_field(Review, origin, Origin),
    entry_atom(Origin, Key, Value),
    Value \== ''.

decisive_requirement(ReqId) :-
    % mutalog-disable-next-line cut_insert: decisive_requirement/1 is only asked as a condition
    kb:must_requirement(ReqId).
decisive_requirement(ReqId) :-
    kb_entity(ReqId, req, Props),
    requirement_firm(Props).

% As the evidence floor reads it: a stated firmness wins; otherwise a
% requirement an agent wrote is default and any other is firm.
requirement_firm(Props) :-
    (   memberchk(firmness=Raw, Props),
        kb:normalize_term_atom(Raw, Explicit),
        memberchk(Explicit, [firm, default, exploratory])
    ->  Explicit == firm
    ;   \+ requirement_origin_kind(Props, agent)
    ).

requirement_origin_kind(Props, Kind) :-
    memberchk(origin=Raw, Props),
    kb:source_value_atom(Raw, Json),
    catch(atom_json_dict(Json, Origin, [value_string_as(atom)]), _,
          % mutalog-disable-next-line goal_true: a failed parse leaves Origin unbound, which entry_atom/3 rejects just as fail would
          fail),
    entry_atom(Origin, kind, Kind).

%% unmodeled_pair_gap(?ReqId, ?OtherId, -Via, -ClaimKeys, -Problem)
% A stored pair whose unmodeled claims of ReqId (ClaimKeys, sorted) nothing
% settles.  Via lists how they pair: relates_to for a relates_to edge in
% either direction (every unmodeled claim of ReqId counts), and
% subject(Key) for each subject they share (the unmodeled claims of ReqId
% that name Key or a narrower subject count).  Problem is as
% pair_problem/5 gives it.
unmodeled_pair_gap(ReqId, OtherId, Via, ClaimKeys, Problem) :-
    unmodeled_pair_gaps(Gaps),
    member(gap(ReqId, OtherId, Via, ClaimKeys, Problem), Gaps).

%% check_related_requirement_unmodeled(-Violations)
% A current requirement with unmodeled claims in a stored pair (a relates_to
% edge or a shared subject) is blocking until the claims are modeled against
% the shared subject, or a checkable verdict on the pair settles them
% (pair_review_problem/6).  One violation per requirement and problem kind,
% listing the requirements it pairs with, so the findings grow with the
% requirements rather than with the pairs.
check_related_requirement_unmodeled(Violations) :-
    unmodeled_pair_gaps(Gaps),
    review_index(reviews(_, Dangling)),
    findall((ReqId-Kind)-gap(OtherId, Via, ClaimKeys, Problem),
            (   member(gap(ReqId, OtherId, Via, ClaimKeys, Problem), Gaps),
                problem_kind(Problem, Kind)
            ),
            Rows0),
    keysort(Rows0, Rows),
    group_pairs_by_key(Rows, Groups),
    maplist(related_requirement_unmodeled_violation(Dangling), Groups, Violations0),
    sort(Violations0, Violations).

problem_kind(unknown_verdict(_), unknown_verdict) :- !.
problem_kind(stale(_), stale) :- !.
problem_kind(missing(separated_by), missing_separated_by) :- !.
problem_kind(missing(resolved_by), missing_resolved_by) :- !.
problem_kind(missing(resolved_by, _), missing_resolved_by) :- !.
problem_kind(Problem, Problem).

related_requirement_unmodeled_violation(Dangling, (ReqId-Kind)-Partners, violation(
    'related-requirement-unmodeled',
    ReqId,
    Description,
    Suggestion,
    Source,
    _{problem: Kind, claimKeys: ClaimKeys, partners: PartnerIds}
)) :-
    findall(OtherId, member(gap(OtherId, _, _, _), Partners), PartnerIds),
    findall(Key, (member(gap(_, _, Keys, _), Partners), member(Key, Keys)), Keys0),
    sort(Keys0, ClaimKeys),
    findall(Problem, member(gap(_, _, _, Problem), Partners), Problems),
    length(ClaimKeys, ClaimCount),
    listed_atoms(ClaimKeys, ClaimText),
    length(PartnerIds, PartnerCount),
    findall(Item,
            (   member(gap(OtherId, Via, _, _), Partners),
                via_text(Via, ViaText),
                format(atom(Item), '~w (through ~w)', [OtherId, ViaText])
            ),
            Items),
    listed_atoms(Items, PartnerText),
    kind_text(Kind, Problems, ProblemText),
    unclassified_note(ReqId, ClaimKeys, UnclassifiedNote),
    dangling_note(Dangling, ReqId, DanglingNote),
    format(
        string(Description),
        "Requirement ~w has ~w unmodeled claim(s) (~w) that nothing compares with ~w requirement(s) it pairs with: ~w; ~w~w~w",
        [ReqId, ClaimCount, ClaimText, PartnerCount, PartnerText, ProblemText, UnclassifiedNote, DanglingNote]
    ),
    listed_atoms(PartnerIds, PartnerList),
    PartnerIds = [FirstPartner|_],
    kind_suggestion(Kind, ReqId, PartnerList, FirstPartner, Suggestion),
    requirement_source(ReqId, Source).

via_text(Via, Text) :-
    findall(Part, (member(V, Via), via_part(V, Part)), Parts),
    atomic_list_concat(Parts, ' and ', Text).

via_part(relates_to, 'a relates_to edge').
via_part(subject(Key), Part) :-
    format(atom(Part), 'shared subject ~w', [Key]).

listed_atoms(Items, Text) :-
    length(Items, N),
    (   N > 8
    ->  length(Shown, 8),
        append(Shown, _, Items),
        Rest is N - 8,
        atomic_list_concat(Shown, ', ', Head),
        format(atom(Text), '~w (+~w more)', [Head, Rest])
    ;   atomic_list_concat(Items, ', ', Text)
    ).

% A missing claim whose role carries no rule (descriptive, rationale,
% example, subjective, or none) still blocks: nobody classified it yet.
unclassified_note(ReqId, ClaimKeys, Note) :-
    findall(ClaimKey,
            (   member(ClaimKey, ClaimKeys),
                open_claim(ReqId, ClaimKey, missing, Role, _),
                \+ anchored_claim_role(Role)
            ),
            Unclassified),
    (   Unclassified == []
    ->  Note = ""
    ;   listed_atoms(Unclassified, Text),
        (   Unclassified = [_]
        ->  Words = ["has", "its role states", "it", "it", "it"]
        ;   Words = ["have", "their roles state", "them", "each", "them"]
        ),
        format(string(Note),
            "; ~w still ~w status missing although ~w no rule: model ~w, set status ontology_gap on ~w with a reason when no predicate can state it, or review ~w (status nonlogical is accepted only for rationale, example and subjective claims)",
            [Text|Words])
    ).

dangling_note(Dangling, ReqId, Note) :-
    (   get_assoc(ReqId, Dangling, Withs)
    ->  listed_atoms(Withs, Text),
        format(string(Note),
            "; its pair_reviews name ~w, which is not a current requirement, so those reviews settle nothing (check the id)",
            [Text])
    ;   Note = ""
    ).

kind_text(unreviewed, _, "no verdict records how they combine").
kind_text(no_verdict, _, "the pair review states no verdict").
kind_text(unknown_verdict, Problems, Text) :-
    % mutalog-disable-next-line cut_insert: findall/3 is deterministic
    findall(V, member(unknown_verdict(V), Problems), Vs0),
    sort(Vs0, Vs),
    atomic_list_concat(Vs, ', ', VText),
    format(string(Text), "the pair review has verdict ~w, which is not no_conflict, interacts or conflict", [VText]).
kind_text(conflict, _, "the pair review records a conflict, which a person must resolve").
kind_text(no_edge, _, "the pair review counts only while a relates_to edge links the two").
kind_text(missing_separated_by, _, "the no_conflict verdict does not say what separates them (separated_by)").
kind_text(missing_resolved_by, Problems, Text) :-
    % mutalog-disable-next-line cut_insert: findall/3 is deterministic
    findall(Item,
            (   member(missing(resolved_by, Rejected), Problems),
                member(Resolver-Why, Rejected),
                rejected_resolver_text(Why, Resolver, Item)
            ),
            Items0),
    sort(Items0, Items),
    (   Items == []
    ->  Note = ""
    ;   atomic_list_concat(Items, '; ', ItemText),
        format(string(Note), "; its resolved_by names ~w", [ItemText])
    ),
    format(string(Text),
        "the interacts verdict does not name what resolves it (resolved_by): a third current requirement, a scenario or fact one of them links, or a condition or exception claim of either~w",
        [Note]).

kind_text(stale, Problems, Text) :-
    % mutalog-disable-next-line cut_insert: findall/3 is deterministic
    findall(K, (member(stale(Keys), Problems), member(K, Keys)), Ks0),
    sort(Ks0, Ks),
    listed_atoms(Ks, KeyText),
    format(string(Text), "the pair review does not cover ~w at their current text", [KeyText]).
rejected_resolver_text(pair, Resolver, Text) :-
    format(atom(Text), '~w, a requirement of the pair itself, which cannot resolve it', [Resolver]).
rejected_resolver_text(unknown, Resolver, Text) :-
    format(atom(Text), '~w, which is none of those (check the id, and that it is current and linked to one of the pair)', [Resolver]).

kind_text(unapproved, _, "the pair review is a verdict on a must or firm requirement that names no approved_by, and an agent recorded it or wrote the requirement it is on").

kind_suggestion(conflict, ReqId, Partners, _First, Suggestion) :-
    !,
    format(
        string(Suggestion),
        "Ask the person which rule holds: supersede ~w or the requirement it conflicts with (~w), or reword one so they no longer conflict; then model the claims or record a new verdict",
        [ReqId, Partners]
    ).
kind_suggestion(no_edge, ReqId, Partners, _First, Suggestion) :-
    !,
    format(
        string(Suggestion),
        "Add a relates_to link between ~w and ~w so the verdict lives on the pair, or model the claims instead",
        [ReqId, Partners]
    ).
kind_suggestion(unapproved, ReqId, Partners, _First, Suggestion) :-
    !,
    format(
        string(Suggestion),
        "Show the verdict on ~w and ~w to a person and set origin.approved_by on the pair review once they confirm it; never approve it yourself",
        [ReqId, Partners]
    ).
kind_suggestion(_Kind, ReqId, Partners, First, Suggestion) :-
    format(
        string(Suggestion),
        "Model the unmodeled claims of ~w on the subject keys the requirements it pairs with (~w) constrain (facts via kb_model, then requires_property, requires_predicate or requires_rule), or supersede one requirement of a pair; to settle a pair that cannot be modeled, keep or add a relates_to link and add a pair_reviews entry on ~w for it, e.g. with: ~w, verdict (no_conflict with separated_by, interacts with resolved_by, or conflict), claims (the claim_key of each unmodeled claim of both) and origin",
        [ReqId, Partners, ReqId, First]
    ).
