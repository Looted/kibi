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
%     scenario that specifies it and assumes a fact on one of its subjects
%     lets scenario-feasibility refuse a combination that another current
%     requirement forbids (positive_scenario_gap/4).
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
    subject_domain_json/2,
    positive_scenario/3,
    positive_scenario_gap/4,
    positive_scenario_gaps_json/1,
    open_claim/5,
    unmodeled_pair_gap/5,
    check_related_requirement_unmodeled/1
]).

:- encoding(utf8).

:- use_module(library(http/json)).
:- use_module(library(apply)).
:- use_module(library(lists)).
:- use_module(library(pairs)).
:- use_module(library(assoc)).
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
    ;   % A ledger written as a Prolog term (as checks.pl reads it).
        (atom(Raw) ; string(Raw)),
        catch(term_string(Term, Raw), _, fail),
        is_list(Term)
    ->  Entries = Term
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

%% ------------------------------------------------------------------
%% Positive scenarios
%% ------------------------------------------------------------------

%% positive_scenario(?ReqId, ?ScenarioId, ?SubjectKey)
% ScenarioId is an active scenario that specifies the current requirement
% ReqId, expects success, and assumes a fact whose subject is SubjectKey or a
% narrower subject, where SubjectKey is a subject ReqId is about.  Such a
% scenario states what the requirement promises in terms scenario-feasibility
% can compare with every other current requirement on that subject.
positive_scenario(ReqId, ScenarioId, SubjectKey) :-
    success_scenario_of(ReqId, ScenarioId),
    requirement_subject_keys(ReqId, Subjects),
    kb_relationship(assumes, ScenarioId, FactId),
    grounding_fact_subject(FactId, AssumedKey),
    \+ subject_fact_inactive(FactId),
    (   memberchk(AssumedKey, Subjects),
        SubjectKey = AssumedKey
    ;   subject_ancestor(AssumedKey, SubjectKey),
        memberchk(SubjectKey, Subjects)
    ).

success_scenario_of(ReqId, ScenarioId) :-
    kb_relationship(specified_by, ReqId, ScenarioId),
    kb_entity(ScenarioId, scenario, Props),
    memberchk(expects=Raw, Props),
    kb:normalize_term_atom(Raw, success),
    \+ scenario_inactive(Props).

scenario_inactive(Props) :-
    memberchk(status=Raw, Props),
    kb:normalize_term_atom(Raw, Status),
    inactive_fact_status(Status).

requirement_subject_keys(ReqId, Subjects) :-
    findall(Key, requirement_subject(ReqId, Key, _), Keys0),
    sort(Keys0, Subjects).

%% positive_scenario_gap(?ReqId, -Reason, -Subjects, -SuccessScenarios)
% A current must requirement with no positive_scenario/3.  Reason is
% no_subjects when the requirement is about no subject yet (nothing a
% scenario could assume), no_success_scenario when no active success
% scenario specifies it, and no_subject_assumption when its success
% scenarios assume nothing on its subjects.  Subjects are the subjects it is
% about and SuccessScenarios the success scenarios that specify it.
positive_scenario_gap(ReqId, Reason, Subjects, SuccessScenarios) :-
    kb:current_req(ReqId),
    kb:must_requirement(ReqId),
    \+ positive_scenario(ReqId, _, _),
    requirement_subject_keys(ReqId, Subjects),
    findall(ScenarioId, success_scenario_of(ReqId, ScenarioId), Scenarios0),
    sort(Scenarios0, SuccessScenarios),
    (   Subjects == []
    ->  Reason = no_subjects
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
    findall(ReqId, (kb:current_req(ReqId), kb:must_requirement(ReqId)), Musts0),
    sort(Musts0, Musts),
    length(Musts, Evaluated),
    findall(
        _{id: ReqId, reason: Reason, subjects: Subjects, successScenarios: Scenarios},
        (   member(ReqId, Musts),
            positive_scenario_gap(ReqId, Reason, Subjects, Scenarios)
        ),
        Rows
    ),
    with_output_to(string(JsonString),
                   json_write_dict(current_output, _{rows: Rows, evaluated: Evaluated}, [width(0)])).

%% ------------------------------------------------------------------
%% related-requirement-unmodeled: unmodeled claims in a stored pair
%% ------------------------------------------------------------------

%% open_claim(?ReqId, ?ClaimKey, ?Status, -Anchors, -PayloadHash)
% A rule-bearing claim (anchored_claim_role/1, or any claim still missing)
% of the current requirement ReqId that no fact grounds (missing,
% ontology_gap or ambiguous), with the subjects it names and its
% payload_hash ('' when the entry has none).  domain-contradictions and
% scenario-feasibility compare grounded facts only, so such a claim is never
% compared with anything.
open_claim(ReqId, ClaimKey, Status, Anchors, PayloadHash) :-
    kb:current_req(ReqId),
    requirement_inventory_entry(ReqId, Entry),
    entry_atom(Entry, status, Status),
    unmodeled_claim_status(Status),
    % A descriptive, rationale or example claim carries no rule, unless it
    % was never classified at all (missing).
    (   Status == missing
    ->  true
    ;   entry_atom(Entry, role, Role),
        anchored_claim_role(Role)
    ),
    entry_atom(Entry, claim_key, ClaimKey),
    entry_subjects(Entry, Anchors),
    (   entry_atom(Entry, payload_hash, PayloadHash0)
    ->  PayloadHash = PayloadHash0
    ;   PayloadHash = ''
    ).

%% unmodeled_pair(+SubjectPairs, ?ReqId, ?OtherId, -Via, -ClaimKeys)
% ReqId has unmodeled claims (ClaimKeys, sorted) that nothing compares with
% the current requirement OtherId although the two are a stored pair.  Via
% lists how they pair: relates_to for a relates_to edge in either direction
% (every unmodeled claim of ReqId counts), and subject(Key) for each subject
% they share (the unmodeled claims of ReqId that name Key or a narrower
% subject count).  SubjectPairs is requirement_subject_index/1.
unmodeled_pair(SubjectPairs, ReqId, OtherId, Via, ClaimKeys) :-
    % Read the open claims once and group the rows by pair, so a subject many
    % requirements share costs one pass instead of a rescan per pair.
    findall(Req-(ClaimKey-Anchors), open_claim(Req, ClaimKey, _, Anchors, _), Open0),
    keysort(Open0, Open1),
    group_pairs_by_key(Open1, OpenByReq),
    list_to_assoc(OpenByReq, OpenClaims),
    findall(
        (ReqId0-OtherId0)-(Via0-ClaimKey),
        unmodeled_pair_claim(SubjectPairs, OpenClaims, ReqId0, OtherId0, Via0, ClaimKey),
        Rows0
    ),
    sort(Rows0, Rows),
    group_pairs_by_key(Rows, Groups),
    member((ReqId-OtherId)-Entries, Groups),
    pairs_keys_values(Entries, Via1, Claims1),
    sort(Via1, Via),
    sort(Claims1, ClaimKeys).

unmodeled_pair_claim(_SubjectPairs, OpenClaims, ReqId, OtherId, relates_to, ClaimKey) :-
    gen_assoc(ReqId, OpenClaims, Claims),
    related_current_requirement(ReqId, OtherId),
    member(ClaimKey-_, Claims).
unmodeled_pair_claim(SubjectPairs, OpenClaims, ReqId, OtherId, subject(Shared), ClaimKey) :-
    member(pair(A, B, Shared), SubjectPairs),
    (   ReqId = A, OtherId = B
    ;   ReqId = B, OtherId = A
    ),
    get_assoc(ReqId, OpenClaims, Claims),
    member(ClaimKey-Anchors, Claims),
    once(( member(Anchor, Anchors),
           (   Anchor == Shared
           ->  true
           ;   subject_ancestor(Anchor, Shared)
           ) )).

related_current_requirement(ReqId, OtherId) :-
    (   kb_relationship(relates_to, ReqId, OtherId)
    ;   kb_relationship(relates_to, OtherId, ReqId)
    ),
    OtherId \== ReqId,
    kb:current_req(OtherId).

%% pair_review(?ReqId, ?OtherId, -Owner, -Review)
% A pair_reviews entry about ReqId and OtherId, recorded on either
% requirement (Owner) with `with` naming the other one.
pair_review(ReqId, OtherId, ReqId, Review) :-
    requirement_pair_review(ReqId, Review),
    entry_atom(Review, with, OtherId).
pair_review(ReqId, OtherId, OtherId, Review) :-
    requirement_pair_review(OtherId, Review),
    entry_atom(Review, with, ReqId).

requirement_pair_review(ReqId, Review) :-
    kb_entity(ReqId, req, Props),
    memberchk(pair_reviews=Raw, Props),
    inventory_entries(Raw, Reviews),
    member(Review, Reviews).

%% pair_review_problem(+ReqId, +OtherId, +ClaimKeys, +Review, -Problem)
% Why Review does not settle the unmodeled claims ClaimKeys of ReqId in its
% pair with OtherId; fails when it does.  A verdict counts only while a
% relates_to edge links the pair, carries what makes it checkable (the
% separating condition of no_conflict, the resolving entity or clause of
% interacts), covers every unmodeled claim at its current payload, and, when
% an agent recorded it on a must or firm requirement, names who approved it.
% A conflict verdict never settles a pair: a person decides which rule holds.
pair_review_problem(ReqId, OtherId, ClaimKeys, Review, Problem) :-
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
             Resolvers \== [],
             forall(member(Resolver, Resolvers),
                    resolver_exists(ReqId, OtherId, Resolver)) )
    ->  Problem = missing(resolved_by)
    ;   uncovered_claims(ReqId, ClaimKeys, Review, Uncovered),
        Uncovered \== []
    ->  Problem = stale(Uncovered)
    ;   review_needs_approval(ReqId, OtherId, Review)
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

% What resolves an interaction: a current entity (a scenario that states the
% combined behaviour, an exempting fact or requirement) or a claim of either
% requirement that scopes one of them.
resolver_exists(_ReqId, _OtherId, Resolver) :-
    kb_entity(Resolver, _Type, Props),
    \+ (  memberchk(status=Raw, Props),
          kb:normalize_term_atom(Raw, Status),
          inactive_fact_status(Status) ),
    !.
resolver_exists(ReqId, OtherId, Resolver) :-
    member(Req, [ReqId, OtherId]),
    requirement_inventory_entry(Req, Entry),
    entry_atom(Entry, claim_key, Resolver),
    !.

% The unmodeled claims of ReqId the review does not name at their current
% payload_hash.  A review claim without a payload_hash matches on its
% claim_key alone; the claim_key already changes with the claim's text.
uncovered_claims(ReqId, ClaimKeys, Review, Uncovered) :-
    (   entry_field(Review, claims, RawClaims),
        is_list(RawClaims)
    ->  Claims = RawClaims
    ;   Claims = []
    ),
    exclude(review_covers(ReqId, Claims), ClaimKeys, Uncovered).

review_covers(ReqId, Claims, ClaimKey) :-
    member(Claim, Claims),
    review_claim(Claim, ClaimKey, ReviewHash),
    !,
    (   ReviewHash == ''
    ->  true
    ;   open_claim(ReqId, ClaimKey, _, _, CurrentHash),
        (   CurrentHash == ''
        ;   CurrentHash == ReviewHash
        )
    ->  true
    ).

review_claim(Claim, ClaimKey, Hash) :-
    (   (atom(Claim) ; string(Claim))
    ->  kb:normalize_term_atom(Claim, ClaimKey),
        Hash = ''
    ;   entry_atom(Claim, claim_key, ClaimKey),
        (   entry_atom(Claim, payload_hash, Hash0)
        ->  Hash = Hash0
        ;   Hash = ''
        )
    ).

% An agent's verdict on a must or firm requirement counts only once a person
% approved it, so the agent writing a requirement cannot clear its own gate.
% A review that does not say who recorded it reads as an agent's.
review_needs_approval(ReqId, OtherId, Review) :-
    \+ review_origin_field(Review, kind, human),
    \+ review_origin_field(Review, approved_by, _),
    (   decisive_requirement(ReqId)
    ;   decisive_requirement(OtherId)
    ),
    !.

review_origin_field(Review, Key, Value) :-
    entry_field(Review, origin, Origin),
    entry_atom(Origin, Key, Value),
    Value \== ''.

decisive_requirement(ReqId) :-
    kb:must_requirement(ReqId),
    !.
decisive_requirement(ReqId) :-
    kb_entity(ReqId, req, Props),
    requirement_firmness(Props, firm).

% As the evidence floor reads it: a stated firmness wins; otherwise a
% requirement an agent wrote is default and any other is firm.
requirement_firmness(Props, Firmness) :-
    (   memberchk(firmness=Raw, Props),
        kb:normalize_term_atom(Raw, Explicit),
        memberchk(Explicit, [firm, default, exploratory])
    ->  Firmness = Explicit
    ;   requirement_origin_kind(Props, agent)
    ->  Firmness = default
    ;   Firmness = firm
    ).

requirement_origin_kind(Props, Kind) :-
    memberchk(origin=Raw, Props),
    (   is_dict(Raw)
    ->  Origin = Raw
    ;   kb:source_value_atom(Raw, Json),
        catch(atom_json_dict(Json, Origin, [value_string_as(atom)]), _, fail)
    ),
    entry_atom(Origin, kind, Kind).

%% unmodeled_pair_gap(?ReqId, ?OtherId, -Via, -ClaimKeys, -Problem)
% A stored pair whose unmodeled claims of ReqId nothing settles.  Problem is
% unreviewed when no pair_reviews entry covers the pair, conflict when a
% review on either side records a conflict, otherwise the problem of the
% review recorded on ReqId (else on OtherId).
unmodeled_pair_gap(ReqId, OtherId, Via, ClaimKeys, Problem) :-
    requirement_subject_index(SubjectPairs),
    unmodeled_pair(SubjectPairs, ReqId, OtherId, Via, ClaimKeys),
    findall(Owner-Review, pair_review(ReqId, OtherId, Owner, Review), Reviews),
    (   Reviews == []
    ->  Problem = unreviewed
    ;   % A conflict recorded on either side stands until a person resolves
        % it; the other side's no_conflict does not settle the pair.
        member(_-Conflict, Reviews),
        entry_atom(Conflict, verdict, conflict)
    ->  Problem = conflict
    ;   \+ ( member(_-Review, Reviews),
             \+ pair_review_problem(ReqId, OtherId, ClaimKeys, Review, _) )
    ->  (   member(ReqId-Review, Reviews)
        ->  true
        ;   Reviews = [_-Review|_]
        ),
        pair_review_problem(ReqId, OtherId, ClaimKeys, Review, Problem)
    ).

%% check_related_requirement_unmodeled(-Violations)
% A current requirement with unmodeled claims in a stored pair (a relates_to
% edge or a shared subject) is blocking until the claims are modeled against
% the shared subject, or a checkable verdict on the pair settles them
% (pair_review_problem/5).  One violation per requirement and partner.
check_related_requirement_unmodeled(Violations) :-
    findall(Violation, related_requirement_unmodeled_violation(Violation), Raw),
    sort(Raw, Violations).

related_requirement_unmodeled_violation(violation(
    'related-requirement-unmodeled',
    ReqId,
    Description,
    Suggestion,
    Source
)) :-
    unmodeled_pair_gap(ReqId, OtherId, Via, ClaimKeys, Problem),
    via_text(Via, ViaText),
    listed_atoms(ClaimKeys, ClaimText),
    length(ClaimKeys, Count),
    problem_text(Problem, ProblemText),
    format(
        string(Description),
        "Requirement ~w has ~w unmodeled claim(s) (~w) that nothing compares with ~w, which it pairs with through ~w; ~w",
        [ReqId, Count, ClaimText, OtherId, ViaText, ProblemText]
    ),
    problem_suggestion(Problem, ReqId, OtherId, ViaText, Suggestion),
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

problem_text(unreviewed, "no verdict records how they combine").
problem_text(no_verdict, "its pair review states no verdict").
problem_text(unknown_verdict(V), Text) :-
    format(string(Text), "its pair review has verdict ~w, which is not no_conflict, interacts or conflict", [V]).
problem_text(conflict, "its pair review records a conflict, which a person must resolve").
problem_text(no_edge, "its pair review counts only while a relates_to edge links the two").
problem_text(missing(separated_by), "its no_conflict verdict does not say what separates them (separated_by)").
problem_text(missing(resolved_by), "its interacts verdict does not name a current scenario, fact, requirement or claim that resolves it (resolved_by)").
problem_text(stale(Keys), Text) :-
    listed_atoms(Keys, KeyText),
    format(string(Text), "its pair review does not cover ~w at their current text", [KeyText]).
problem_text(unapproved, "its pair review was recorded by an agent on a must or firm requirement and names no approved_by").

problem_suggestion(conflict, ReqId, OtherId, _ViaText, Suggestion) :-
    !,
    format(
        string(Suggestion),
        "Ask the person which rule holds: supersede ~w or ~w, or reword one so they no longer conflict; then model the claims or record a new verdict",
        [ReqId, OtherId]
    ).
problem_suggestion(no_edge, ReqId, OtherId, _ViaText, Suggestion) :-
    !,
    format(
        string(Suggestion),
        "Add a relates_to link between ~w and ~w so the verdict lives on the pair, or model the claims instead",
        [ReqId, OtherId]
    ).
problem_suggestion(unapproved, ReqId, OtherId, _ViaText, Suggestion) :-
    !,
    format(
        string(Suggestion),
        "Show the verdict on ~w and ~w to a person and set origin.approved_by on the pair review once they confirm it; never approve it yourself",
        [ReqId, OtherId]
    ).
problem_suggestion(_Problem, ReqId, OtherId, ViaText, Suggestion) :-
    format(
        string(Suggestion),
        "Model the unmodeled claims of ~w on the subject keys ~w constrains (facts via kb_model, then requires_property, requires_predicate or requires_rule), or supersede one of them; if they cannot be modeled, keep or add a relates_to link (they pair through ~w) and add a pair_reviews entry on ~w with: ~w, verdict (no_conflict with separated_by, interacts with resolved_by, or conflict), claims (claim_key and payload_hash of each unmodeled claim of both) and origin",
        [ReqId, OtherId, ViaText, ReqId, OtherId]
    ).
