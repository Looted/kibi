% Module: semantic_quality
% Deterministic vocabulary-convergence and redundancy diagnostics.
%
% Kibi turns requirement prose into normalized logical terms so Prolog can
% compare requirements. These checks measure whether that normalization
% converges:
%
%   entity-id-style      filename stem must equal the frontmatter id
%   domain-redundancy    two current requirements ground the same term
%   domain-implication   one numeric bound implies another (informational)
%   subject-key-identity subject keys derived from requirement IDs
%   subject-key-shape    subject keys outside component.aspect[.sub]
%   ontology-quality     predicate schemas whose arguments are mostly
%                        one-off atoms (prose smuggled into atoms)
%
% Every check is advisory: findings become non-blocking quality diagnostics.
% Nothing here calls a provider or reads the network; all results are a pure
% function of the attached KB (plus two optional threshold env variables for
% ontology-quality).

:- module(semantic_quality, [
    logical_ground_signature/2,
    check_entity_id_style/1,
    check_domain_redundancy/1,
    check_domain_redundancy_witnesses/1,
    check_domain_implication/1,
    check_domain_implication_witnesses/1,
    check_subject_key_identity/1,
    check_subject_key_shape/1,
    check_ontology_quality/1,
    ontology_quality_settings/2,
    set_ontology_quality_overrides/2,
    requirement_subject_segment/2,
    valid_subject_key/1,
    subject_vocabulary_json/1,
    subject_claims_json/2
]).

:- use_module(library(http/json)).
:- use_module(library(pairs)).
:- use_module(library(apply)).
:- use_module(library(lists)).
:- use_module('kb.pl').
:- use_module('units.pl', [canonical_quantity/6]).

% Entity types whose identity is authored in a Markdown file under .kb/.
markdown_entity_type(req).
markdown_entity_type(scenario).
markdown_entity_type(test).
markdown_entity_type(adr).
markdown_entity_type(flag).
markdown_entity_type(event).
markdown_entity_type(fact).

%% ------------------------------------------------------------------
%% Logical ground signature (shared with logic-coverage)
%% ------------------------------------------------------------------

%% logical_ground_signature(+FactId, -Signature)
% Canonical, comparable term for one ground fact. Property values are compared
% after unit canonicalization (30 min and 1800 s share a signature); unknown
% units stay distinct.
% implements REQ-kibi-unit-canonicalization, REQ-kibi-domain-redundancy
logical_ground_signature(FactId, predicate(Namespace, Name, Args, Polarity)) :-
    kb:predicate_fact(FactId, Namespace, Name, Args, Polarity).
logical_ground_signature(
    FactId,
    property(Subject, Property, Operator, ValueType, Value, Unit, Scope, Polarity)
) :-
    kb:canonical_property_tuple(
        FactId,
        Subject,
        Property,
        Operator,
        ValueType,
        Value,
        Unit,
        Scope,
        Polarity
    ).
logical_ground_signature(FactId, rule(SemanticKey)) :-
    kb_entity(FactId, fact, Props),
    memberchk(fact_kind=RawKind, Props),
    normalize_term_atom(RawKind, rule),
    (   memberchk(semantic_key=RawKey, Props)
    ->  normalize_term_atom(RawKey, SemanticKey)
    ;   memberchk(rule_hash=RawKey, Props), normalize_term_atom(RawKey, SemanticKey)
    ).

%% ------------------------------------------------------------------
%% entity-id-style
%% ------------------------------------------------------------------

%% check_entity_id_style(-Violations)
% Reports Markdown-authored entities whose filename stem differs from their
% frontmatter id. Purely numeric IDs are reported by the host at creation
% boundaries (kb_upsert, staged new files) because the compiled KB cannot
% distinguish a grandfathered legacy entity from a new one.
% implements REQ-kibi-entity-id-style
check_entity_id_style(Violations) :-
    findall(Violation, entity_id_style_violation(Violation), Violations0),
    sort(Violations0, Violations).

entity_id_style_violation(violation(
    'entity-id-style',
    EntityId,
    Description,
    Suggestion,
    SourceText
)) :-
    markdown_entity_type(Type),
    kb_entity(EntityId, Type, Props),
    property_text(Props, source, SourceText),
    markdown_source_stem(SourceText, Stem),
    atom_string(EntityId, EntityIdText),
    Stem \== EntityIdText,
    format(string(Description), "Entity ID ~w does not match its filename stem ~w", [EntityId, Stem]),
    format(string(Suggestion), "Rename the file to ~w.md or set frontmatter id: ~w so file names and identities stay aligned", [EntityId, Stem]).

markdown_source_stem(SourceText, Stem) :-
    string_concat(Base, ".md", SourceText),
    \+ sub_string(SourceText, _, _, _, "://"),
    split_string(Base, "/\\", "", Parts),
    last(Parts, Stem),
    Stem \== "".

%% ------------------------------------------------------------------
%% domain-redundancy
%% ------------------------------------------------------------------

%% check_domain_redundancy(-Violations)
% Two distinct current requirements that ground the identical logical term
% (same signature, therefore same polarity/modality) or link the very same
% ground fact. Pairs related by supersedes or restates (either direction) are
% intentional and exempt.
% implements REQ-kibi-domain-redundancy
check_domain_redundancy(Violations) :-
    check_domain_redundancy_witnesses(Witnesses),
    maplist(redundancy_witness_violation, Witnesses, Violations).

%% check_domain_redundancy_witnesses(-Witnesses)
% Groups every current requirement ground link once by signature and once by
% fact ID (keysort + group_pairs_by_key), then pairs requirements only inside
% a group. Cost is O(L log L) in the number of ground links plus the size of
% the reported output, never a self-join over all requirement pairs.
check_domain_redundancy_witnesses(Witnesses) :-
    findall(Key-ground(ReqId, FactId), redundancy_ground_key(ReqId, FactId, Key), Keyed0),
    keysort(Keyed0, Keyed),
    group_pairs_by_key(Keyed, Groups),
    findall(
        dup(ReqA, ReqB, FactA, FactB),
        (   member(_Key-Members0, Groups),
            sort(Members0, Members),
            group_duplicate_pair(Members, ReqA, FactA, ReqB, FactB)
        ),
        Duplicates0
    ),
    sort(Duplicates0, Duplicates),
    maplist(redundancy_witness, Duplicates, Witnesses).

redundancy_ground_key(ReqId, FactId, Key) :-
    ground_link(ReqId, FactId),
    kb:current_req(ReqId),
    (   logical_ground_signature(FactId, Signature),
        Key = signature(Signature)
    ;   Key = fact(FactId)
    ).

ground_link(ReqId, FactId) :-
    member(LinkType, [requires_property, requires_predicate, requires_rule]),
    kb_relationship(LinkType, ReqId, FactId).

% Members are sorted by requirement ID, so every emitted pair has
% ReqA @< ReqB and each unordered pair is produced once per group.
group_duplicate_pair(Members, ReqA, FactA, ReqB, FactB) :-
    append(_, [ground(ReqA, FactA)|Rest], Members),
    member(ground(ReqB, FactB), Rest),
    ReqA @< ReqB,
    requirements_unrelated(ReqA, ReqB).

%% requirements_unrelated(+ReqA, +ReqB)
% True unless the pair is linked by supersedes or restates in either
% direction, which marks the overlap as intentional.
requirements_unrelated(ReqA, ReqB) :-
    \+ requirements_linked(ReqA, ReqB).

requirements_linked(ReqA, ReqB) :-
    member(LinkType, [supersedes, restates]),
    (   kb_relationship(LinkType, ReqA, ReqB)
    ;   kb_relationship(LinkType, ReqB, ReqA)
    ),
    !.

redundancy_witness(dup(ReqA, ReqB, FactA, FactB), Witness) :-
    (   FactA == FactB
    ->  Match = shared_fact
    ;   Match = same_signature
    ),
    (   logical_ground_signature(FactA, Signature)
    ->  term_string(Signature, SignatureText, [quoted(true), max_depth(0)])
    ;   SignatureText = ""
    ),
    redundancy_side(ReqA, FactA, Left),
    redundancy_side(ReqB, FactB, Right),
    (   Match == shared_fact
    ->  format(string(Reason), "Requirements ~w and ~w both link ground fact ~w", [ReqA, ReqB, FactA])
    ;   format(string(Reason), "Requirements ~w and ~w ground the same logical term through ~w and ~w", [ReqA, ReqB, FactA, FactB])
    ),
    Witness = _{
        kind: redundancy,
        status: duplicate,
        match: Match,
        requirements: [ReqA, ReqB],
        facts: [FactA, FactB],
        signature: SignatureText,
        reason: Reason,
        left: Left,
        right: Right
    }.

redundancy_side(ReqId, FactId, Side) :-
    entity_text(ReqId, req, source, RequirementSource),
    entity_text(FactId, fact, source, FactSource),
    entity_text(FactId, fact, claim_key, ClaimKey),
    entity_text(FactId, fact, claim_text, ClaimText),
    Side = _{
        requirementId: ReqId,
        requirementSource: RequirementSource,
        factId: FactId,
        factSource: FactSource,
        claimKey: ClaimKey,
        claimText: ClaimText
    }.

redundancy_witness_violation(Witness, violation(
    'domain-redundancy',
    EntityId,
    Description,
    "Merge the duplicated requirements, supersede one with the other, or add an explicit restates relationship when the restatement is intentional",
    Source,
    _{witnesses: [Witness]}
)) :-
    Witness.requirements = [ReqA, ReqB],
    format(string(EntityId), "~w/~w", [ReqA, ReqB]),
    (   Witness.signature == ""
    ->  Description = Witness.reason
    ;   format(string(Description), "~w: ~w", [Witness.reason, Witness.signature])
    ),
    entity_text(ReqA, req, source, Source).

%% ------------------------------------------------------------------
%% domain-implication (informational)
%% ------------------------------------------------------------------

%% check_domain_implication(-Violations)
% Same subject and property, comparable numeric operators, one bound strictly
% implies the other (lte 30 implies lte 60). Reported as "implied by", never as
% a duplicate: both requirements may be intentional.
% implements REQ-kibi-domain-redundancy
check_domain_implication(Violations) :-
    check_domain_implication_witnesses(Witnesses),
    maplist(implication_witness_violation, Witnesses, Violations).

check_domain_implication_witnesses(Witnesses) :-
    findall(Key-bound(ReqId, FactId, Operator, Value), implication_bound(ReqId, FactId, Key, Operator, Value), Keyed0),
    keysort(Keyed0, Keyed),
    group_pairs_by_key(Keyed, Groups),
    findall(
        Witness,
        (   member(Key-Members0, Groups),
            sort(Members0, Members),
            member(bound(ReqA, FactA, OpA, ValA), Members),
            member(bound(ReqB, FactB, OpB, ValB), Members),
            ReqA \== ReqB,
            bound_implies(OpA, ValA, OpB, ValB),
            requirements_unrelated(ReqA, ReqB),
            implication_witness(Key, ReqA, FactA, OpA, ValA, ReqB, FactB, OpB, ValB, Witness)
        ),
        Witnesses0
    ),
    sort(Witnesses0, Witnesses).

implication_bound(ReqId, FactId, key(Subject, Property, Scope, Unit), Operator, Value) :-
    kb:current_req(ReqId),
    kb_relationship(requires_property, ReqId, FactId),
    kb:canonical_property_tuple(FactId, Subject, Property, Operator, ValueType, Value, Unit, Scope, require),
    memberchk(ValueType, [int, number]),
    memberchk(Operator, [eq, lt, lte, gt, gte]),
    kb_relationship(constrains, ReqId, SubjectFactId),
    kb:fact_subject_key(SubjectFactId, Subject).

%% bound_implies(+OpA, +ValA, +OpB, +ValB)
% Every value allowed by (OpA ValA) is allowed by (OpB ValB), and the two
% bounds are not identical.
bound_implies(OpA, ValA, OpB, ValB) :-
    \+ (OpA == OpB, ValA =:= ValB),
    implies_bound(OpA, ValA, OpB, ValB).

implies_bound(lte, A, lte, B) :- A < B.
implies_bound(lte, A, lt, B) :- A < B.
implies_bound(lt, A, lt, B) :- A < B.
implies_bound(lt, A, lte, B) :- A =< B.
implies_bound(gte, A, gte, B) :- A > B.
implies_bound(gte, A, gt, B) :- A > B.
implies_bound(gt, A, gt, B) :- A > B.
implies_bound(gt, A, gte, B) :- A >= B.
implies_bound(eq, A, lte, B) :- A =< B.
implies_bound(eq, A, lt, B) :- A < B.
implies_bound(eq, A, gte, B) :- A >= B.
implies_bound(eq, A, gt, B) :- A > B.

implication_witness(key(Subject, Property, Scope, Unit), ReqA, FactA, OpA, ValA, ReqB, FactB, OpB, ValB, Witness) :-
    redundancy_side(ReqA, FactA, Left),
    redundancy_side(ReqB, FactB, Right),
    format(string(Reason), "~w (~w.~w ~w ~w~w) implies ~w (~w ~w~w)", [ReqA, Subject, Property, OpA, ValA, Unit, ReqB, OpB, ValB, Unit]),
    Witness = _{
        kind: implication,
        status: implied_by,
        requirements: [ReqA, ReqB],
        facts: [FactA, FactB],
        subjectKey: Subject,
        propertyKey: Property,
        scope: Scope,
        unit: Unit,
        reason: Reason,
        stronger: Left,
        weaker: Right
    }.

implication_witness_violation(Witness, violation(
    'domain-implication',
    EntityId,
    Description,
    "Informational: keep both bounds if they serve different audiences, or drop the weaker requirement when the stronger one already guarantees it",
    Source,
    _{witnesses: [Witness]}
)) :-
    Witness.requirements = [ReqA, ReqB],
    format(string(EntityId), "~w/~w", [ReqA, ReqB]),
    format(string(Description), "Implied by: ~w", [Witness.reason]),
    entity_text(ReqB, req, source, Source).

%% ------------------------------------------------------------------
%% subject-key-identity
%% ------------------------------------------------------------------

%% check_subject_key_identity(-Violations)
% A subject key is req-derived when it has the exact shape
% `req.<segment>[.<rest>]` and <segment> is the normalized ID of an existing
% requirement, either whole (`req.req_cli_gc` for REQ-cli-gc) or without its
% `req_` prefix (`req.opencode_kibi_plugin_v1.document` for
% REQ-opencode-kibi-plugin-v1). Normalization matches strict modeling:
% lowercase, and every run of non [a-z0-9] characters becomes `_`. Such keys
% make every requirement its own subject, so cross-requirement contradiction
% and redundancy checks can never fire.
%
% Subject facts are reported; property_value facts are reported only when no
% subject fact carries the same key (otherwise fixing the subject fixes them).
% implements REQ-kibi-subject-vocabulary
check_subject_key_identity(Violations) :-
    findall(Segment-ReqId, requirement_subject_segment(ReqId, Segment), SegmentPairs0),
    keysort(SegmentPairs0, SegmentPairs),
    group_segment_requirements(SegmentPairs, Segments),
    findall(Key, fact_subject_key_of_kind(_, subject, Key), SubjectKeys0),
    sort(SubjectKeys0, SubjectKeys),
    findall(
        Violation,
        subject_key_identity_violation(Segments, SubjectKeys, Violation),
        Violations0
    ),
    sort(Violations0, Violations).

subject_key_identity_violation(Segments, SubjectKeys, violation(
    'subject-key-identity',
    FactId,
    Description,
    "Use a shared dotted component.aspect subject key (for example kibi.cli.check.staged) that other requirements about the same component can reuse; update the subject fact and its property_value facts together",
    Source
)) :-
    member(Kind, [subject, property_value]),
    fact_subject_key_of_kind(FactId, Kind, SubjectKey),
    (   Kind == property_value
    ->  \+ ord_memberchk(SubjectKey, SubjectKeys)
    ;   true
    ),
    req_derived_subject(SubjectKey, Segments, ReqId),
    format(string(Description), "Subject key ~w is derived from requirement ID ~w, so no other requirement can share this subject", [SubjectKey, ReqId]),
    entity_text(FactId, fact, source, Source).

req_derived_subject(SubjectKey, Segments, ReqId) :-
    atomic_list_concat([req, Segment|_], '.', SubjectKey),
    memberchk(Segment-ReqIds, Segments),
    ReqIds = [ReqId|_].

%% requirement_subject_segment(?ReqId, -Segment)
% Normalized requirement ID segments that identify a req-derived subject key.
requirement_subject_segment(ReqId, Segment) :-
    kb_entity(ReqId, req, _),
    normalized_identifier(ReqId, Normalized),
    (   Segment = Normalized
    ;   atom_concat(req_, Stripped, Normalized),
        Stripped \== '',
        Segment = Stripped
    ).

normalized_identifier(Raw, Normalized) :-
    normalize_term_atom(Raw, Atom),
    downcase_atom(Atom, Lower),
    atom_codes(Lower, Codes),
    normalize_identifier_codes(Codes, NormalizedCodes0),
    trim_underscores(NormalizedCodes0, NormalizedCodes),
    atom_codes(Normalized, NormalizedCodes).

normalize_identifier_codes([], []).
normalize_identifier_codes([Code|Rest], Normalized) :-
    (   identifier_code(Code)
    ->  Normalized = [Code|Tail],
        normalize_identifier_codes(Rest, Tail)
    ;   skip_separator_run(Rest, AfterRun),
        Normalized = [0'_|Tail],
        normalize_identifier_codes(AfterRun, Tail)
    ).

skip_separator_run([Code|Rest], AfterRun) :-
    \+ identifier_code(Code),
    !,
    skip_separator_run(Rest, AfterRun).
skip_separator_run(Codes, Codes).

identifier_code(Code) :- code_type(Code, digit), !.
identifier_code(Code) :- Code >= 0'a, Code =< 0'z.

trim_underscores(Codes0, Codes) :-
    exclude_leading_underscores(Codes0, Codes1),
    reverse(Codes1, Reversed0),
    exclude_leading_underscores(Reversed0, Reversed),
    reverse(Reversed, Codes).

exclude_leading_underscores([0'_|Rest], Codes) :- !, exclude_leading_underscores(Rest, Codes).
exclude_leading_underscores(Codes, Codes).

% Group Segment-ReqId pairs (already keysorted) into Segment-[ReqIds].
group_segment_requirements(SegmentPairs, Grouped) :-
    group_pairs_by_key(SegmentPairs, Grouped0),
    maplist(sort_group_values, Grouped0, Grouped).

sort_group_values(Key-Values0, Key-Values) :-
    sort(Values0, Values).

%% ------------------------------------------------------------------
%% subject-key-shape
%% ------------------------------------------------------------------

%% check_subject_key_shape(-Violations)
% Subject keys follow one convention: dotted `component.aspect[.sub]` with at
% least two segments, each a lowercase snake identifier ([a-z][a-z0-9]* joined
% by single underscores).
% implements REQ-kibi-subject-vocabulary
check_subject_key_shape(Violations) :-
    findall(Violation, subject_key_shape_violation(Violation), Violations0),
    sort(Violations0, Violations).

subject_key_shape_violation(violation(
    'subject-key-shape',
    FactId,
    Description,
    "Rename the subject key to dotted component.aspect[.sub] with lowercase snake segments (for example kibi.cli.check.staged or opencode.kibi_plugin.guidance)",
    Source
)) :-
    fact_subject_key_of_kind(FactId, subject, SubjectKey),
    \+ valid_subject_key(SubjectKey),
    format(string(Description), "Subject key ~w does not follow the component.aspect[.sub] convention", [SubjectKey]),
    entity_text(FactId, fact, source, Source).

%% valid_subject_key(+SubjectKey)
valid_subject_key(SubjectKey) :-
    atom(SubjectKey),
    atomic_list_concat(Segments, '.', SubjectKey),
    Segments = [_, _|_],
    maplist(valid_subject_segment, Segments).

valid_subject_segment(Segment) :-
    atomic_list_concat(Words, '_', Segment),
    Words = [First|_],
    atom_codes(First, [Initial|_]),
    Initial >= 0'a, Initial =< 0'z,
    maplist(valid_subject_word, Words).

valid_subject_word(Word) :-
    atom_codes(Word, Codes),
    Codes \== [],
    maplist(identifier_code, Codes).

%% ------------------------------------------------------------------
%% ontology-quality (informational)
%% ------------------------------------------------------------------

%% check_ontology_quality(-Violations)
% Reports predicate schemas whose ground facts mostly use argument values that
% occur in exactly one fact. A high singleton ratio means compressed prose is
% being written into atoms, so paraphrases produce different terms and no
% cross-requirement comparison can fire. Schemas with fewer facts than the
% configured minimum are skipped so small vocabularies are not noise.
% implements REQ-kibi-ontology-quality
check_ontology_quality(Violations) :-
    ontology_quality_settings(Threshold, MinFacts),
    findall(key(Namespace, Name, Arity)-Args, ontology_predicate_args(Namespace, Name, Arity, Args), Keyed0),
    keysort(Keyed0, Keyed),
    group_pairs_by_key(Keyed, Groups),
    findall(
        Violation,
        (   member(Key-ArgLists, Groups),
            ontology_quality_violation(Key, ArgLists, Threshold, MinFacts, Violation)
        ),
        Violations0
    ),
    sort(Violations0, Violations).

%% ontology_quality_settings(-MaxSingletonRatio, -MinFacts)
% Defaults: ratio 0.6, minimum 8 facts. KIBI_ONTOLOGY_QUALITY_MAX_SINGLETON_RATIO
% (0..1) and KIBI_ONTOLOGY_QUALITY_MIN_FACTS (positive integer) override them.
% The host forwards its own environment per check call through
% set_ontology_quality_overrides/2 because the engine daemon outlives the
% invoking process; otherwise the engine's environment applies. Invalid values
% fall back to the defaults.
ontology_quality_settings(Threshold, MinFacts) :-
    setting_value(ratio, 'KIBI_ONTOLOGY_QUALITY_MAX_SINGLETON_RATIO', valid_ratio, 0.6, Threshold),
    setting_value(min_facts, 'KIBI_ONTOLOGY_QUALITY_MIN_FACTS', valid_min_facts, 8, MinFacts).

:- dynamic ontology_quality_override/2.

%% set_ontology_quality_overrides(+Ratio, +MinFacts)
% Replace the per-call overrides. Pass the atom default to clear one.
set_ontology_quality_overrides(Ratio, MinFacts) :-
    retractall(ontology_quality_override(_, _)),
    (Ratio == default -> true ; assertz(ontology_quality_override(ratio, Ratio))),
    (MinFacts == default -> true ; assertz(ontology_quality_override(min_facts, MinFacts))).

setting_value(Key, EnvName, Validator, Default, Value) :-
    (   ontology_quality_override(Key, Override),
        call(Validator, Override)
    ->  Value = Override
    ;   getenv(EnvName, Raw),
        catch(atom_number(Raw, Parsed), _, fail),
        call(Validator, Parsed)
    ->  Value = Parsed
    ;   Value = Default
    ).

valid_ratio(Value) :- number(Value), Value >= 0, Value =< 1.
valid_min_facts(Value) :- integer(Value), Value >= 1.

ontology_predicate_args(Namespace, Name, Arity, Args) :-
    kb:predicate_fact(_FactId, Namespace, Name, Args, _Polarity),
    length(Args, Arity),
    Arity > 0.

ontology_quality_violation(key(Namespace, Name, Arity), ArgLists, Threshold, MinFacts, violation(
    'ontology-quality',
    EntityId,
    Description,
    Suggestion,
    Source,
    _{witnesses: [Witness]}
)) :-
    length(ArgLists, FactCount),
    FactCount >= MinFacts,
    numlist(1, Arity, Positions),
    maplist(position_singletons(ArgLists), Positions, PositionStats),
    foldl(sum_singletons, PositionStats, 0, Singletons),
    Slots is FactCount * Arity,
    Ratio is Singletons / Slots,
    Ratio >= Threshold,
    findall(SchemaId, kb:predicate_schema(SchemaId, Namespace, Name, Arity, _, _), SchemaIds0),
    sort(SchemaIds0, SchemaIds),
    (   SchemaIds = [EntityId|_]
    ->  entity_text(EntityId, fact, source, Source)
    ;   format(string(EntityId), "~w:~w/~w", [Namespace, Name, Arity]),
        Source = ""
    ),
    schema_argument_names(SchemaIds, Arity, ArgumentNames),
    maplist(position_evidence(ArgumentNames), PositionStats, PositionEvidence),
    RatioPercent is round(Ratio * 100),
    format(string(Description), "Predicate ~w/~w: ~w% of argument values across ~w facts occur in only one fact; arguments look like prose, so paraphrases will not converge", [Name, Arity, RatioPercent, FactCount]),
    format(string(Suggestion), "Split ~w into narrower predicate schemas whose arguments come from a small shared vocabulary, and reuse existing argument constants instead of compressing each clause into new atoms", [Name]),
    Witness = _{
        kind: ontology_quality,
        predicateNamespace: Namespace,
        predicateName: Name,
        arity: Arity,
        schemaIds: SchemaIds,
        factCount: FactCount,
        singletonRatio: Ratio,
        threshold: Threshold,
        minFacts: MinFacts,
        positions: PositionEvidence
    }.

position_singletons(ArgLists, Position, stats(Position, Distinct, Singletons)) :-
    findall(Value, (member(Args, ArgLists), nth1(Position, Args, Value)), Values0),
    msort(Values0, Values),
    clumped(Values, Counts),
    length(Counts, Distinct),
    include(singleton_count, Counts, SingletonCounts),
    length(SingletonCounts, Singletons).

singleton_count(_-1).

sum_singletons(stats(_, _, Singletons), Acc0, Acc) :-
    Acc is Acc0 + Singletons.

schema_argument_names([SchemaId|_], Arity, Names) :-
    kb:predicate_schema(SchemaId, _, _, Arity, Names, _),
    !.
schema_argument_names(_, Arity, Names) :-
    numlist(1, Arity, Positions),
    maplist([Position, Name]>>format(atom(Name), "arg~w", [Position]), Positions, Names).

position_evidence(ArgumentNames, stats(Position, Distinct, Singletons), _{
    argument: Argument,
    distinctValues: Distinct,
    singletonValues: Singletons
}) :-
    nth1(Position, ArgumentNames, Argument).

%% ------------------------------------------------------------------
%% Vocabulary reads for modeling-time subject ranking
%% ------------------------------------------------------------------

%% subject_vocabulary_json(-Json)
% Existing subject facts with the titles of the current requirements that
% constrain them. The host ranks these deterministically (and optionally via a
% vocabulary-alignment plugin) so new clauses reuse an existing subject.
% implements REQ-kibi-subject-vocabulary
subject_vocabulary_json(Json) :-
    findall(Segment-ReqId, requirement_subject_segment(ReqId, Segment), SegmentPairs0),
    keysort(SegmentPairs0, SegmentPairs),
    group_segment_requirements(SegmentPairs, Segments),
    findall(Entry, subject_vocabulary_entry(Segments, Entry), Entries0),
    sort(subjectKey, @=<, Entries0, Entries),
    with_output_to(string(Json), json_write_dict(current_output, Entries, [width(0)])).

% reqDerived marks keys that subject-key-identity rejects, so the host never
% proposes them for reuse.
subject_vocabulary_entry(Segments, _{
    factId: FactId,
    subjectKey: SubjectKey,
    title: Title,
    reqDerived: ReqDerived,
    requirements: Requirements
}) :-
    fact_subject_key_of_kind(FactId, subject, SubjectKey),
    (   req_derived_subject(SubjectKey, Segments, _)
    ->  ReqDerived = true
    ;   ReqDerived = false
    ),
    entity_text(FactId, fact, title, Title),
    findall(
        _{id: ReqId, title: ReqTitle},
        (   kb_relationship(constrains, ReqId, FactId),
            kb:current_req(ReqId),
            entity_text(ReqId, req, title, ReqTitle)
        ),
        Requirements0
    ),
    sort(id, @<, Requirements0, Requirements).

%% subject_claims_json(+SubjectKeys, -Json)
% Existing property_value claims on the given subjects, with their canonical
% signature text and the current requirements that ground them. Used by the
% host to surface possible paraphrase duplicates (different signatures, same
% subject) for review; it never decides equivalence.
% implements REQ-kibi-subject-vocabulary
subject_claims_json(SubjectKeys0, Json) :-
    maplist(normalize_term_atom, SubjectKeys0, SubjectKeys1),
    sort(SubjectKeys1, SubjectKeys),
    findall(Claim, subject_claim_entry(SubjectKeys, Claim), Claims0),
    sort(factId, @<, Claims0, Claims),
    with_output_to(string(Json), json_write_dict(current_output, Claims, [width(0)])).

subject_claim_entry(SubjectKeys, _{
    factId: FactId,
    subjectKey: SubjectKey,
    propertyKey: PropertyKey,
    signature: SignatureText,
    claimText: ClaimText,
    title: Title,
    requirements: Requirements
}) :-
    member(SubjectKey, SubjectKeys),
    fact_subject_key_of_kind(FactId, property_value, SubjectKey),
    kb:fact_property_tuple(FactId, SubjectKey, PropertyKey, _, _, _, _, _, _),
    logical_ground_signature(FactId, Signature),
    term_string(Signature, SignatureText, [quoted(true), max_depth(0)]),
    entity_text(FactId, fact, claim_text, ClaimText),
    entity_text(FactId, fact, title, Title),
    findall(ReqId, (kb_relationship(requires_property, ReqId, FactId), kb:current_req(ReqId)), Requirements0),
    sort(Requirements0, Requirements).

%% ------------------------------------------------------------------
%% Shared helpers
%% ------------------------------------------------------------------

fact_subject_key_of_kind(FactId, Kind, SubjectKey) :-
    kb_entity(FactId, fact, Props),
    memberchk(fact_kind=RawKind, Props),
    normalize_term_atom(RawKind, Kind),
    memberchk(subject_key=RawKey, Props),
    normalize_term_atom(RawKey, SubjectKey).

entity_text(EntityId, Type, Key, Text) :-
    (   kb_entity(EntityId, Type, Props)
    ->  property_text(Props, Key, Text)
    ;   Text = ""
    ).

%% property_text(+Props, +Key, -Text)
% Raw property value as a string. Unlike normalize_term_atom/2 this keeps
% path separators, so source paths are returned whole.
property_text(Props, Key, Text) :-
    (   memberchk(Key=Raw, Props)
    ->  raw_text(Raw, Text)
    ;   Text = ""
    ).

raw_text(^^(Value, _Type), Text) :- !, raw_text(Value, Text).
raw_text(literal(type(_, Value)), Text) :- !, raw_text(Value, Text).
raw_text(literal(Value), Text) :- !, raw_text(Value, Text).
raw_text(Value, Text) :- string(Value), !, Text = Value.
raw_text(Value, Text) :- atom(Value), !, atom_string(Value, Text).
raw_text(Value, Text) :- term_string(Value, Text).
