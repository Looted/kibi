% Module: requirement_proof
% Conservative, inspectable proof outcomes for requirement coverage reports.

:- module(requirement_proof, [
    requirement_proof_context/1,
    requirement_proof_context/4,
    requirement_proof_context/6,
    requirement_proof/4,
    test_receipt_evidence/4
]).

% Source contains non-ASCII text; do not depend on the host locale.
:- encoding(utf8).

:- use_module(library(http/json)).
:- use_module(library(crypto)).
:- use_module(library(date)).
:- use_module(library(pcre)).
:- use_module('kb.pl').
:- use_module('checks.pl', [
    check_domain_contradictions_and_witnesses/2,
    infeasible_scenario/5,
    negative_scenario_witness/3,
    opposing_assumption/2,
    scenario_feasibility_outcome/2,
    check_rule_safety/1,
    check_rule_verifiability/1
]).
:- use_module('logic_ir.pl', [logic_rule_safety/2]).
:- use_module('code_certificates.pl', [code_certificate_check/2, code_certificate_digest/2]).
:- use_module('claim_obligations.pl', [claim_obligation/3, obligation_equal/2]).
:- use_module('model_check.pl', [model_check_obligation/4]).

proof_version('kibi.requirement-proof.v5').

requirement_proof_context(Context) :-
    requirement_proof_context(unknown, '1970-01-01T00:00:00Z', 604800, Context).

requirement_proof_context(VerificationSnapshot, CheckedAt, MaxAgeSeconds, Context) :-
    requirement_proof_context(VerificationSnapshot, CheckedAt, MaxAgeSeconds,
                              strict_snapshot, _{}, Context).

% Per-contract receipt binding (W2): BindingMode is strict_snapshot (the
% default: a receipt is current only against the whole-workspace snapshot it
% was proven on) or per_contract (a receipt carrying a binding_hash is current
% while its contract + receipt-stripped test document are unchanged, via the
% TestBindings dict TestId -> BindingHash; receipts without a binding_hash
% still fall back to the snapshot match).
requirement_proof_context(VerificationSnapshot, CheckedAt, MaxAgeSeconds,
                          BindingMode, TestBindings, Context) :-
    check_domain_contradictions_and_witnesses(Contradictions, ContradictionWitnesses),
    check_rule_safety(UnsafeRules),
    check_rule_verifiability(UnverifiableRules),
    normalize_atom(VerificationSnapshot, Snapshot),
    normalize_atom(CheckedAt, CheckedAtAtom),
    (catch(parse_time(CheckedAtAtom, CheckedAtStamp), _, fail) -> true ; CheckedAtStamp = -1),
    normalize_integer(MaxAgeSeconds, MaxAge),
    normalize_atom(BindingMode, BindingModeAtom),
    % Everything else in the context follows from the KB, so the proof memo
    % key needs only the caller's parameters.
    variant_sha1(params(Snapshot, CheckedAtAtom, MaxAge, BindingModeAtom, TestBindings), ParamsKey),
    variant_sha1(findings(Contradictions, ContradictionWitnesses, UnsafeRules, UnverifiableRules), FindingsKey),
    Context = _{
        proofMemoKey: ParamsKey,
        ladderMemoKey: FindingsKey,
        contradictions: Contradictions,
        contradictionWitnesses: ContradictionWitnesses,
        unsafeRules: UnsafeRules,
        unverifiableRules: UnverifiableRules,
        proofSnapshot: Snapshot,
        proofCheckedAt: CheckedAtAtom,
        proofCheckedAtStamp: CheckedAtStamp,
        proofMaxAgeSeconds: MaxAge,
        proofBindingMode: BindingModeAtom,
        proofTestBindings: TestBindings
    }.

% implements REQ-kibi-conservative-requirement-proof
% A requirement's proof is kept per KB generation and proof parameters, so
% the evidence-floor rule, the coverage evidence and a coverage report in one
% check read each ladder once.  Inside a transaction (what-if staging) the
% KB is not the generation's, so the proof is computed afresh.
requirement_proof(ReqId, ReqProps, Context, Proof) :-
    (   \+ rdf_db:rdf_active_transaction(_),
        get_dict(proofMemoKey, Context, ParamsKey),
        kb:index_verification_key(requirement_proof, IndexKey)
    ->  Key = key(IndexKey, ParamsKey),
        (   kb:kb_requirement_proof_memo(ReqId, Key, Proof0)
        ->  Proof = Proof0
        ;   compute_requirement_proof(ReqId, ReqProps, Context, Proof),
            (   once(kb:kb_requirement_proof_memo(_, Stored, _)),
                Stored \== Key
            ->  retractall(kb:kb_requirement_proof_memo(_, _, _))
            ;   true
            ),
            assertz(kb:kb_requirement_proof_memo(ReqId, Key, Proof))
        )
    ;   compute_requirement_proof(ReqId, ReqProps, Context, Proof)
    ).

% The stages before passing_e2e read the KB and the context's KB-derived
% findings (contradictions, unsafe and unverifiable rules) only, never the
% caller's snapshot, receipt bindings or checkedAt.  A check passes a new
% checkedAt every run, so these stages are kept per KB generation and those
% findings apart from the full proof; inside a transaction they are computed
% afresh.
receipt_independent_stages(ReqId, ReqProps, Context, Ladder) :-
    (   \+ rdf_db:rdf_active_transaction(_),
        get_dict(ladderMemoKey, Context, FindingsKey),
        kb:index_verification_key(requirement_ladder, IndexKey)
    ->  variant_sha1(ReqProps, PropsKey),
        Key = key(IndexKey, FindingsKey, PropsKey),
        (   kb:kb_requirement_ladder_memo(ReqId, Key, Ladder0)
        ->  Ladder = Ladder0
        ;   compute_receipt_independent_stages(ReqId, ReqProps, Context, Ladder),
            (   once(kb:kb_requirement_ladder_memo(_, key(Stored, _, _), _)),
                Stored \== IndexKey
            ->  retractall(kb:kb_requirement_ladder_memo(_, _, _))
            ;   true
            ),
            retractall(kb:kb_requirement_ladder_memo(ReqId, _, _)),
            assertz(kb:kb_requirement_ladder_memo(ReqId, Key, Ladder))
        )
    ;   compute_receipt_independent_stages(ReqId, ReqProps, Context, Ladder)
    ).

compute_receipt_independent_stages(ReqId, ReqProps, Context,
        ladder(SemanticStage, Inventory, LogicStage, ContradictionStage,
               ScenarioStage, ScenarioTestStage, ScenarioTests, SymbolSets)) :-
    semantic_inventory_stage(ReqProps, SemanticStage, Inventory),
    logic_grounding_stage(ReqId, ReqProps, Inventory, Context, LogicStage),
    contradiction_stage(ReqId, LogicStage.status, SemanticStage.status, Context, ContradictionStage),
    scenario_stage(ReqId, ScenarioStage, ScenarioIds),
    scenario_test_stage(ScenarioIds, ScenarioTestStage, ScenarioTests),
    production_symbol_sets(ReqId, SymbolSets).

% Exemption first: a current requirement explicitly marked proof_exempt with a
% reason is intentionally outside E2E-proof scope and must never fall through
% to the ladder (which would report misleading receipt gaps).
compute_requirement_proof(ReqId, ReqProps, _Context, Proof) :-
    kb:current_req(ReqId),
    proof_exempt(ReqProps, Reason),
    !,
    exempt_requirement_proof(Reason, ReqProps, Proof).
compute_requirement_proof(ReqId, ReqProps, _Context, Proof) :-
    \+ kb:current_req(ReqId),
    !,
    applicability_exclusion_reason(ReqId, Reason),
    exempt_requirement_proof(Reason, ReqProps, Proof).
compute_requirement_proof(ReqId, ReqProps, Context, Proof) :-
    receipt_independent_stages(ReqId, ReqProps, Context,
        ladder(SemanticStage, Inventory, LogicStage, ContradictionStage,
               ScenarioStage, ScenarioTestStage, ScenarioTests, SymbolSets)),
    passing_e2e_stage(ScenarioTestStage, Context, PassingE2eStage, PassingE2eTests),
    executable_symbol_stage(PassingE2eTests, ExecutableStage, ExecutableSymbols),
    production_symbol_stage_from_sets(ReqId, SymbolSets, PassingE2eTests, ScenarioTests,
                                      PassingE2eStage.receiptEvidence, Context,
                                      ProductionStage, ProductionSymbols),
    source_coordinate_stage(ReqProps, ExecutableSymbols, ProductionSymbols, CoordinateStage),
    negative_path_stage(ReqId, ScenarioStage, ScenarioTestStage, Context, NegativePathStage),
    dimension_stage(ReqId, ScenarioTestStage, Context, DimensionStage),
    Stages = _{
        semanticInventory: SemanticStage,
        logicGrounding: LogicStage,
        contradictions: ContradictionStage,
        scenarios: ScenarioStage,
        scenarioTests: ScenarioTestStage,
        negativePath: NegativePathStage,
        dimension: DimensionStage,
        passingE2e: PassingE2eStage,
        executableSymbols: ExecutableStage,
        productionSymbols: ProductionStage,
        sourceCoordinates: CoordinateStage
    },
    proof_issues(Stages, Gaps, Advisories),
    proof_repairs(Gaps, Repairs),
    proof_status(Stages, Status),
    certificate_rejections(ScenarioTestStage, Context, Rejections),
    claim_evidence(ReqId, ReqProps, Inventory, Status, ScenarioTestStage, Context,
                   ClaimEvidence, ProvedTests, BindingRejections),
    requirement_evidence(ReqProps, Status, PassingE2eTests, ProvedTests, EvidenceLevel, Evidence),
    evidence_floor(ReqProps, EvidenceLevel, Gaps, Stages, EvidenceFloor),
    claim_summary(ClaimEvidence, ClaimSummary, UnprovedClaims),
    proof_version(Version),
    Proof0 = _{
        proofVersion: Version,
        proofStatus: Status,
        evidenceLevel: EvidenceLevel,
        evidence: Evidence,
        evidenceFloor: EvidenceFloor,
        claimEvidence: ClaimEvidence,
        claimSummary: ClaimSummary,
        unprovedClaims: UnprovedClaims,
        proofGaps: Gaps,
        proofAdvisories: Advisories,
        proofRepairs: Repairs,
        proofStages: Stages,
        testResolutions: ScenarioTestStage.resolutions
    },
    (   Rejections == []
    ->  Proof1 = Proof0
    ;   Proof1 = Proof0.put(certificateRejections, Rejections)
    ),
    (   BindingRejections == []
    ->  Proof = Proof1
    ;   Proof = Proof1.put(claimBindingRejections, BindingRejections)
    ).

exempt_requirement_proof(Reason, ReqProps, Proof) :-
    requirement_evidence(ReqProps, not_applicable, [], [], EvidenceLevel, Evidence),
    proof_version(Version),
    Proof = _{
        proofVersion: Version,
        proofStatus: not_applicable,
        evidenceLevel: EvidenceLevel,
        evidence: Evidence,
        claimEvidence: [],
        claimSummary: _{applicable: 0, proved: 0, attested: 0, tested: 0, unresolved: 0},
        unprovedClaims: [],
        proofGaps: [],
        proofAdvisories: [],
        proofRepairs: [],
        proofStages: _{applicability: _{status: not_applicable, reason: Reason}}
    }.

%% proof_exempt(+Props, -Reason)
% A current requirement is exempt from E2E-proof scope when its author set
% proof_exempt to a truthy value AND supplied a non-empty proof_exempt_reason.
% Without the reason the exemption does not apply, so an author cannot park a
% requirement silently; upsert validation enforces the same pairing.
proof_exempt(Props, Reason) :-
    memberchk(proof_exempt=RawFlag, Props),
    normalize_atom(RawFlag, Flag),
    memberchk(Flag, [true, yes, on, '1']),
    memberchk(proof_exempt_reason=RawReason, Props),
    normalize_atom(RawReason, Reason),
    Reason \= ''.

%% applicability_exclusion_reason(+ReqId, -Reason)
% Typed reason a requirement fails current_req/1: superseded lifecycle, or a
% status outside the canonical+legacy requirement vocabulary (e.g. the ADR
% vocabulary 'accepted').
applicability_exclusion_reason(ReqId, "requirement is superseded by a newer requirement") :-
    kb_relationship(supersedes, _, ReqId),
    !.
applicability_exclusion_reason(ReqId, Reason) :-
    kb_entity(ReqId, req, Props),
    memberchk(status=Status, Props),
    normalize_term_atom(Status, StatusAtom),
    format(atom(Reason), "status '~w' is not a current requirement status", [StatusAtom]),
    !.
applicability_exclusion_reason(_ReqId, "requirement is not current").

semantic_inventory_stage(Props, Stage, Entries) :-
    (   memberchk(semantic_inventory=RawInventory, Props),
        inventory_entries(RawInventory, Entries0),
        Entries0 \= []
    ->  Entries = Entries0,
        inventory_counts(Entries, Modeled, Unresolved, Missing, Nonlogical, Malformed),
        semantic_inventory_status(Unresolved, Missing, Malformed, Status),
        length(Entries, Count),
        Stage = _{
            status: Status,
            propositionCount: Count,
            modeledCount: Modeled,
            unresolvedCount: Unresolved,
            missingCount: Missing,
            nonlogicalCount: Nonlogical,
            malformedCount: Malformed
        }
    ;   Entries = [],
        Stage = _{
            status: missing,
            propositionCount: 0,
            modeledCount: 0,
            unresolvedCount: 0,
            missingCount: 0,
            nonlogicalCount: 0,
            malformedCount: 0
        }
    ).

inventory_counts(Entries, Modeled, Unresolved, Missing, Nonlogical, Malformed) :-
    include(inventory_entry_status_is(modeled), Entries, ModeledEntries),
    include(inventory_entry_unresolved, Entries, UnresolvedEntries),
    include(inventory_entry_status_is(missing), Entries, MissingEntries),
    include(inventory_entry_status_is(nonlogical), Entries, NonlogicalEntries),
    exclude(valid_inventory_entry, Entries, MalformedEntries),
    length(ModeledEntries, Modeled),
    length(UnresolvedEntries, Unresolved),
    length(MissingEntries, Missing),
    length(NonlogicalEntries, Nonlogical),
    length(MalformedEntries, Malformed).

semantic_inventory_status(_Unresolved, Missing, _Malformed, missing) :-
    Missing > 0,
    !.
semantic_inventory_status(_Unresolved, _Missing, Malformed, missing) :-
    Malformed > 0,
    !.
semantic_inventory_status(Unresolved, _Missing, _Malformed, unresolved) :-
    Unresolved > 0,
    !.
semantic_inventory_status(_, _, _, passed).

valid_inventory_entry(Entry) :-
    inventory_entry_field(Entry, claim_key, ClaimKey),
    normalize_atom(ClaimKey, ClaimKeyAtom),
    ClaimKeyAtom \= '',
    inventory_entry_field(Entry, claim_text, ClaimText),
    normalize_atom(ClaimText, ClaimTextAtom),
    ClaimTextAtom \= '',
    inventory_entry_field(Entry, role, _),
    inventory_entry_status(Entry, Status),
    memberchk(Status, [modeled, ambiguous, ontology_gap, nonlogical, missing]),
    inventory_entry_field(Entry, span, Span),
    valid_inventory_span(Span).

valid_inventory_span(Span) :-
    inventory_entry_field(Span, start, StartRaw),
    inventory_entry_field(Span, end, EndRaw),
    normalize_integer(StartRaw, Start),
    normalize_integer(EndRaw, End),
    Start >= 0,
    End > Start.

inventory_entry_status_is(Expected, Entry) :-
    inventory_entry_status(Entry, Expected).

inventory_entry_unresolved(Entry) :-
    inventory_entry_status(Entry, Status),
    memberchk(Status, [ambiguous, ontology_gap]).

inventory_entry_status(Entry, Status) :-
    inventory_entry_field(Entry, status, RawStatus),
    normalize_atom(RawStatus, Status).

inventory_entry_field(Dict, Key, Value) :-
    is_dict(Dict),
    get_dict(Key, Dict, Value).
inventory_entry_field(List, Key, Value) :-
    is_list(List),
    memberchk(Key=Value, List).

% Pure-function memos, content-addressed by variant_sha1/2, so they need no
% invalidation: equal inputs always produce equal outputs. Proof evaluation
% re-parses the same receipt histories and re-validates the same receipts on
% every coverage run; both are bounded so a long-lived engine cannot grow them
% without limit.
:- dynamic pure_memo/3.
:- dynamic pure_memo_size/1.

pure_memo_limit(4096).

pure_memo(Kind, Input, Goal, Output) :-
    variant_sha1(Kind-Input, Key),
    (   pure_memo(Key, Kind, Cached)
    ->  Output = Cached
    ;   call(Goal, Input, Result),
        pure_memo_remember(Key, Kind, Result),
        Output = Result
    ).

pure_memo_remember(Key, Kind, Output) :-
    (   pure_memo_size(Size)
    ->  true
    ;   Size = 0
    ),
    pure_memo_limit(Limit),
    (   Size >= Limit
    ->  retractall(pure_memo(_, _, _)),
        NextSize = 1
    ;   NextSize is Size + 1
    ),
    retractall(pure_memo_size(_)),
    assertz(pure_memo_size(NextSize)),
    assertz(pure_memo(Key, Kind, Output)).

inventory_entries(Raw, Entries) :-
    (   (atom(Raw) ; string(Raw))
    ->  pure_memo(inventory_entries, Raw, parse_inventory_entries, Entries)
    ;   parse_inventory_entries(Raw, Entries)
    ).

parse_inventory_entries(Raw, Entries) :-
    (   is_list(Raw)
    ->  Entries = Raw
    ;   Raw = ^^(Value, _)
    ->  inventory_entries(Value, Entries)
    ;   (atom(Raw) ; string(Raw)),
        catch(atom_json_dict(Raw, JsonEntries, [value_string_as(string)]), _, fail),
        is_list(JsonEntries)
    ->  Entries = JsonEntries
    ;   (atom(Raw) ; string(Raw)),
        catch(term_string(PrologEntries, Raw), _, fail),
        is_list(PrologEntries)
    ->  Entries = PrologEntries
    ;   Entries = []
    ).

logic_grounding_stage(ReqId, Props, Inventory, Context, Stage) :-
    requirement_claim_keys(Props, ManifestPresent, ManifestKeys),
    inventory_assertive_keys(Inventory, InventoryKeys),
    inventory_modeled_keys(Inventory, ModeledKeys),
    findall(Evidence, valid_ground_evidence(ReqId, Evidence), Evidence0),
    sort(Evidence0, Evidence),
    grounded_claim_keys(Evidence, GroundedKeys),
    missing_keys(ModeledKeys, GroundedKeys, MissingGroundKeys),
    duplicate_ground_keys(Evidence, DuplicateGroundKeys),
    inventory_ground_text_mismatches(Inventory, Evidence, ClaimTextMismatchKeys),
    invalid_linked_claim_keys(ReqId, InvalidGroundKeys),
    missing_keys(InventoryKeys, ManifestKeys, MissingManifestKeys),
    missing_keys(ManifestKeys, InventoryKeys, ExtraManifestKeys),
    linked_ground_keys(ReqId, LinkedGroundKeys),
    missing_keys(LinkedGroundKeys, ManifestKeys, UndeclaredGroundKeys),
    linked_rule_fact_ids(ReqId, RuleFactIds),
    invalid_rule_fact_ids(RuleFactIds, Context, InvalidRuleFactIds),
    logic_grounding_status(
        ManifestPresent,
        MissingGroundKeys,
        MissingManifestKeys,
        ExtraManifestKeys,
        DuplicateGroundKeys,
        ClaimTextMismatchKeys,
        InvalidGroundKeys,
        UndeclaredGroundKeys,
        InvalidRuleFactIds,
        Status
    ),
    ground_source_refs(Evidence, GroundSources),
    Stage = _{
        status: Status,
        manifestClaims: ManifestKeys,
        inventoryClaims: InventoryKeys,
        modeledClaims: ModeledKeys,
        groundedClaims: GroundedKeys,
        evidence: Evidence,
        missingGroundClaims: MissingGroundKeys,
        duplicateGroundClaims: DuplicateGroundKeys,
        claimTextMismatchClaims: ClaimTextMismatchKeys,
        invalidGroundClaims: InvalidGroundKeys,
        missingManifestClaims: MissingManifestKeys,
        extraManifestClaims: ExtraManifestKeys,
        undeclaredGroundClaims: UndeclaredGroundKeys,
        invalidRuleFacts: InvalidRuleFactIds,
        sources: GroundSources
    }.

requirement_claim_keys(Props, true, Keys) :-
    memberchk(logic_claims=RawKeys, Props),
    kb:normalize_term_atom_list(RawKeys, Keys0),
    sort(Keys0, Keys),
    Keys \= [],
    !.
requirement_claim_keys(_, false, []).

inventory_assertive_keys(Entries, Keys) :-
    findall(Key,
        (member(Entry, Entries),
         inventory_entry_status(Entry, Status),
         Status \= nonlogical,
         inventory_entry_field(Entry, claim_key, RawKey),
         normalize_atom(RawKey, Key)),
        Keys0),
    sort(Keys0, Keys).

inventory_modeled_keys(Entries, Keys) :-
    findall(Key,
        (member(Entry, Entries),
         inventory_entry_status(Entry, modeled),
         inventory_entry_field(Entry, claim_key, RawKey),
         normalize_atom(RawKey, Key)),
        Keys0),
    sort(Keys0, Keys).

valid_ground_evidence(ReqId, _{claimKey: ClaimKey, claimText: ClaimText, factId: FactId, lane: property}) :-
    kb_relationship(requires_property, ReqId, FactId),
    ground_claim_provenance(FactId, property_value, ClaimKey, ClaimText),
    kb:fact_property_tuple(FactId, SubjectKey, _, _, _, _, _, _, _),
    kb_relationship(constrains, ReqId, SubjectFactId),
    kb:fact_subject_key(SubjectFactId, SubjectKey).
valid_ground_evidence(ReqId, _{claimKey: ClaimKey, claimText: ClaimText, factId: FactId, lane: predicate}) :-
    kb_relationship(requires_predicate, ReqId, FactId),
    ground_claim_provenance(FactId, predicate, ClaimKey, ClaimText),
    kb:predicate_fact(FactId, _, _, _, _).
valid_ground_evidence(ReqId, _{claimKey: ClaimKey, claimText: ClaimText, factId: FactId, lane: rule}) :-
    kb_relationship(requires_rule, ReqId, FactId),
    ground_claim_provenance(FactId, rule, ClaimKey, ClaimText),
    valid_rule_fact(FactId).

ground_claim_provenance(FactId, ExpectedKind, ClaimKey, ClaimText) :-
    kb_entity(FactId, fact, Props),
    memberchk(fact_kind=RawKind, Props),
    normalize_atom(RawKind, ExpectedKind),
    memberchk(claim_key=RawClaimKey, Props),
    normalize_atom(RawClaimKey, ClaimKey),
    memberchk(claim_text=RawClaimText, Props),
    normalize_atom(RawClaimText, ClaimText),
    ClaimText \= ''.

valid_rule_fact(FactId) :-
    kb_entity(FactId, fact, Props),
    logic_rule_safety(Props, []),
    memberchk(rule_schema_id=RawSchemaId, Props),
    normalize_atom(RawSchemaId, SchemaId),
    kb_entity(SchemaId, fact, SchemaProps),
    valid_rule_schema_props(SchemaProps).

valid_rule_schema_props(Props) :-
    memberchk(fact_kind=RawKind, Props),
    normalize_atom(RawKind, rule_schema),
    memberchk(rule_name=RawName, Props),
    normalize_atom(RawName, Name),
    Name \= '',
    memberchk(argument_names=RawNames, Props),
    memberchk(argument_types=RawTypes, Props),
    normalize_atom_list(RawNames, Names),
    normalize_atom_list(RawTypes, Types),
    same_length(Names, Types).

grounded_claim_keys(Evidence, Keys) :-
    findall(Key, (member(Item, Evidence), Key = Item.claimKey), Keys0),
    sort(Keys0, Keys).

duplicate_ground_keys(Evidence, Keys) :-
    grounded_claim_keys(Evidence, UniqueKeys),
    include(has_duplicate_ground(Evidence), UniqueKeys, Keys).

has_duplicate_ground(Evidence, Key) :-
    include(evidence_for_key(Key), Evidence, Matches),
    length(Matches, Count),
    Count > 1.

evidence_for_key(Key, Evidence) :-
    Evidence.claimKey == Key.

inventory_ground_text_mismatches(Inventory, Evidence, Keys) :-
    findall(Key,
        (member(Item, Evidence),
         Key = Item.claimKey,
         member(Entry, Inventory),
         inventory_entry_field(Entry, claim_key, RawKey),
         normalize_atom(RawKey, Key),
         inventory_entry_field(Entry, claim_text, RawInventoryText),
         normalize_atom(RawInventoryText, InventoryText),
         \+ claim_texts_equivalent(InventoryText, Item.claimText)),
        Keys0),
    sort(Keys0, Keys).

% implements REQ-kibi-conservative-requirement-proof
% Inventory and fact claim texts name the same sentence when they differ only
% in whitespace or trailing punctuation ("…outcomes." vs "…outcomes").
claim_texts_equivalent(Left, Right) :-
    canonical_claim_text(Left, Canonical),
    canonical_claim_text(Right, Canonical).

canonical_claim_text(Text, Canonical) :-
    normalize_space(codes(Codes0), Text),
    reverse(Codes0, Reversed0),
    drop_trailing_claim_punctuation(Reversed0, Reversed),
    reverse(Reversed, Codes),
    atom_codes(Canonical, Codes).

drop_trailing_claim_punctuation([Code|Rest], Trimmed) :-
    (code_type(Code, space) ; memberchk(Code, `.,;:!?`)),
    !,
    drop_trailing_claim_punctuation(Rest, Trimmed).
drop_trailing_claim_punctuation(Codes, Codes).

linked_ground_keys(ReqId, Keys) :-
    findall(Key, linked_ground_claim_key(ReqId, Key), Keys0),
    sort(Keys0, Keys).

linked_ground_claim_key(ReqId, ClaimKey) :-
    member(Relationship-Kind, [requires_property-property_value, requires_predicate-predicate, requires_rule-rule]),
    kb_relationship(Relationship, ReqId, FactId),
    ground_claim_provenance(FactId, Kind, ClaimKey, _).

invalid_linked_claim_keys(ReqId, Keys) :-
    findall(ClaimKey,
        (linked_ground_claim_key(ReqId, ClaimKey),
         \+ valid_ground_evidence_for_key(ReqId, ClaimKey)),
        Keys0),
    sort(Keys0, Keys).

valid_ground_evidence_for_key(ReqId, ClaimKey) :-
    valid_ground_evidence(ReqId, Evidence),
    Evidence.claimKey == ClaimKey.

linked_rule_fact_ids(ReqId, FactIds) :-
    findall(FactId, kb_relationship(requires_rule, ReqId, FactId), FactIds0),
    sort(FactIds0, FactIds).

invalid_rule_fact_ids(RuleFactIds, Context, InvalidFactIds) :-
    findall(FactId,
        (member(FactId, RuleFactIds),
         (violation_for_entity(Context.unsafeRules, FactId)
         ; violation_for_entity(Context.unverifiableRules, FactId))),
        Invalid0),
    sort(Invalid0, InvalidFactIds).

logic_grounding_status(false, _, _, _, _, _, _, _, _, missing) :- !.
logic_grounding_status(true, MissingGround, MissingManifest, _, _, _, _, _, _, missing) :-
    (MissingGround \= [] ; MissingManifest \= []),
    !.
logic_grounding_status(true, _, _, ExtraManifest, Duplicate, ClaimTextMismatch, Invalid, Undeclared, InvalidRules, unresolved) :-
    (ExtraManifest \= [] ; Duplicate \= [] ; ClaimTextMismatch \= [] ; Invalid \= [] ; Undeclared \= [] ; InvalidRules \= []),
    !.
logic_grounding_status(true, _, _, _, _, _, _, _, _, passed).

missing_keys(Expected, Actual, Missing) :-
    findall(Key, (member(Key, Expected), \+ memberchk(Key, Actual)), Missing).

contradiction_stage(ReqId, _LogicStatus, Context, Stage) :-
    requirement_contradiction_witnesses(ReqId, Context.contradictionWitnesses, Conflicts),
    member(Witness, Conflicts),
    Witness.status == contradiction,
    Conflicts \= [],
    !,
    Stage = _{status: blocked, outcome: conflict_found, conflicts: Conflicts}.
contradiction_stage(ReqId, _LogicStatus, Context, Stage) :-
    requirement_contradiction_witnesses(ReqId, Context.contradictionWitnesses, Conflicts),
    Conflicts \= [],
    !,
    Stage = _{status: unresolved, outcome: analysis_incomplete, conflicts: Conflicts}.
contradiction_stage(ReqId, _LogicStatus, Context, Stage) :-
    requirement_contradictions(ReqId, Context.contradictions, Conflicts),
    Conflicts \= [],
    !,
    Stage = _{status: blocked, outcome: conflict_found, conflicts: Conflicts}.
contradiction_stage(_ReqId, LogicStatus, _Context, Stage) :-
    LogicStatus \= passed,
    !,
    Stage = _{status: unresolved, outcome: incomplete_grounding, conflicts: []}.
contradiction_stage(_ReqId, passed, _Context, _{status: passed, outcome: no_conflict_found, conflicts: []}).

%% contradiction_stage(+ReqId, +LogicStatus, +InventoryStatus, +Context, -Stage)
% implements REQ-kibi-truthful-consistency
% Absence of a conflict is evidence only when every normative proposition was
% modeled.  Propositions still marked ambiguous or ontology_gap were never
% encoded, so the checker cannot have looked at them: report the analysis as
% incomplete instead of no_conflict_found.  Found conflicts still win.
contradiction_stage(ReqId, LogicStatus, InventoryStatus, Context, Stage) :-
    contradiction_stage(ReqId, LogicStatus, Context, Stage0),
    (   Stage0.outcome == no_conflict_found,
        InventoryStatus == unresolved
    ->  Stage = _{status: unresolved, outcome: analysis_incomplete, conflicts: [],
                  reason: "unresolved_propositions"}
    ;   Stage = Stage0
    ).

requirement_contradictions(ReqId, Violations, Conflicts) :-
    include(violation_mentions_requirement(ReqId), Violations, Conflicts0),
    maplist(violation_description, Conflicts0, Conflicts).

requirement_contradiction_witnesses(ReqId, Witnesses, Conflicts) :-
    include(witness_mentions_requirement(ReqId), Witnesses, Conflicts).

witness_mentions_requirement(ReqId, Witness) :-
    memberchk(ReqId, Witness.requirements).

violation_mentions_requirement(ReqId, violation(_, EntityId, _, _, _)) :-
    normalize_atom(EntityId, Pair),
    atomic_list_concat(Ids, '/', Pair),
    memberchk(ReqId, Ids).

violation_description(violation(_, EntityId, Description, _, _), _{requirements: EntityId, reason: Description}).

violation_for_entity(Violations, EntityId) :-
    member(violation(_, RawId, _, _, _), Violations),
    normalize_atom(RawId, EntityId).

scenario_stage(ReqId, Stage, ScenarioIds) :-
    findall(ScenarioId,
        kb_relationship(specified_by, ReqId, ScenarioId),
        ScenarioTargets0),
    sort(ScenarioTargets0, ScenarioTargets),
    include(existing_scenario, ScenarioTargets, ScenarioIds),
    findall(ScenarioId,
        (member(ScenarioId, ScenarioTargets), \+ existing_scenario(ScenarioId)),
        InvalidScenarioTargets),
    % implements REQ-kibi-scenario-feasibility-v2
    % A scenario that expects success but whose assumptions cannot hold with
    % what current requirements require (pairwise or jointly) can never pass,
    % so the requirement cannot be proven through it.
    findall(ScenarioId,
        (member(ScenarioId, ScenarioIds), once(infeasible_scenario(ScenarioId, _, _, _, _))),
        InfeasibleScenarios),
    % A success scenario whose feasibility cannot be decided is reported as a
    % distinct, non-blocking note instead of being counted as feasible.
    findall(_{scenario: ScenarioId, reason: ReasonText},
        (   member(ScenarioId, ScenarioIds),
            once(scenario_feasibility_outcome(ScenarioId, unknown(Reason))),
            unknown_feasibility_reason(Reason, ReasonText)
        ),
        UnknownFeasibility),
    % implements REQ-kibi-happy-path-gap
    % The linked scenarios that exercise this requirement's failure side: they
    % expect rejection or error and assume a value it forbids.
    findall(ScenarioId,
        (member(ScenarioId, ScenarioIds), once(negative_scenario_witness(ScenarioId, ReqId, _))),
        NegativeScenarios),
    (   (ScenarioIds = [] ; InvalidScenarioTargets \= [])
    ->  Status = missing
    ;   InfeasibleScenarios \= []
    ->  Status = blocked
    ;   Status = passed
    ),
    maplist(entity_source_ref, ScenarioIds, Sources),
    Stage = _{
        status: Status,
        scenarios: ScenarioIds,
        scenarioTargets: ScenarioTargets,
        invalidScenarioTargets: InvalidScenarioTargets,
        infeasibleScenarios: InfeasibleScenarios,
        unknownFeasibility: UnknownFeasibility,
        negativeScenarios: NegativeScenarios,
        sources: Sources
    }.

unknown_feasibility_reason(no_assumptions, no_assumptions).
unknown_feasibility_reason(contradictory_assumptions(_), contradictory_assumptions).
unknown_feasibility_reason(unmatched_assumption(_), unmatched_assumption).
unknown_feasibility_reason(incomparable_assumption(_), incomparable_assumption).
unknown_feasibility_reason(conflicting_requirements(_), conflicting_requirements).
unknown_feasibility_reason(undecided_rule(_), undecided_rule).
unknown_feasibility_reason(undetermined_validity(_), undetermined_validity).

existing_scenario(ScenarioId) :-
    kb_entity(ScenarioId, scenario, _).

%% negative_path_stage(+ReqId, +ScenarioStage, +ScenarioTestStage, +Context, -Stage)
% implements REQ-kibi-happy-path-gap
% A requirement is not tested while only its happy path is: when it grounds
% a claim (a property value, predicate or rule), at least one linked
% scenario must expect rejection or error and assume a value or situation
% the requirement forbids.  Claims a fresh certificate proves at code scope
% decide their failure side already and need none.  Status is not_required
% (no such claim, or all certified), passed, waived (an approved
% failure_side_waiver) or missing.
negative_path_stage(ReqId, ScenarioStage, ScenarioTestStage, Context, Stage) :-
    findall(Key-FactId,
        (   negative_path_link(Link),
            kb_relationship(Link, ReqId, FactId),
            fact_claim_key_or_id(FactId, Key)
        ),
        ClaimFacts0),
    sort(ClaimFacts0, ClaimFacts),
    certified_claim_keys(ReqId, ScenarioTestStage, Context, Certified),
    exclude(certified_claim(Certified), ClaimFacts, OpenFacts),
    pairs_keys(OpenFacts, Open0),
    sort(Open0, Open),
    pending_certified_claim_keys(ScenarioTestStage, Context, Open, Pending),
    (   get_dict(negativeScenarios, ScenarioStage, Negatives) -> true ; Negatives = [] ),
    failure_side_waiver(ReqId, Waiver),
    (   Open == []
    ->  Status = not_required
    ;   Negatives \== []
    ->  Status = passed
    ;   get_dict(approvedBy, Waiver, _)
    ->  Status = waived
    ;   Status = missing
    ),
    (   Status == missing
    ->  findall(_{claimKey: Key, factId: FactId, assumption: Assumption, expects: rejection},
            (member(Key-FactId, OpenFacts), once(opposing_assumption(FactId, Assumption))),
            Suggestions)
    ;   Suggestions = []
    ),
    Stage = _{
        status: Status,
        claims: Open,
        certifiedClaims: Certified,
        negativeScenarios: Negatives,
        suggestedNegatives: Suggestions,
        pendingReproofClaims: Pending,
        waiver: Waiver
    }.

% Open claims a certificate test proves (its contract lists them in proves)
% whose receipt is only older than the code: re-running kibi prove certifies
% them, so the evidence floor treats them like any other stale receipt.
pending_certified_claim_keys(ScenarioTestStage, Context, Open, Keys) :-
    (   get_dict(tests, ScenarioTestStage, Tests) -> true ; Tests = [] ),
    findall(Key,
        (   member(TestId, Tests),
            test_receipt_evidence(Context, [unit, integration, end_to_end], TestId, Evidence),
            get_dict(state, Evidence, stale),
            kb_entity(TestId, test, Props),
            memberchk(proof_contract=RawContract, Props),
            proof_contract_dict(RawContract, Contract),
            get_dict(proves, Contract, Proves),
            is_list(Proves),
            member(RawKey, Proves),
            normalize_atom(RawKey, Key),
            memberchk(Key, Open)
        ),
        Keys0),
    sort(Keys0, Keys).

%% failure_side_waiver(+ReqId, -Waiver)
% A requirement whose claims state a capability or an output shape has no
% input to refuse, so its failure side can be waived: failure_side_waiver
% gives the reason and failure_side_waiver_approved_by names the human who
% accepted it.  Only an approved waiver satisfies the stage; a reason alone
% is reported as pending approval.  Waiver is _{} when none is recorded.
failure_side_waiver(ReqId, Waiver) :-
    (   kb_entity(ReqId, req, Props),
        memberchk(failure_side_waiver=RawReason, Props),
        normalize_atom(RawReason, Reason),
        Reason \== ''
    ->  atom_string(Reason, ReasonText),
        (   memberchk(failure_side_waiver_approved_by=RawBy, Props),
            normalize_atom(RawBy, By),
            By \== ''
        ->  atom_string(By, ByText),
            Waiver = _{reason: ReasonText, approvedBy: ByText}
        ;   Waiver = _{reason: ReasonText}
        )
    ;   Waiver = _{}
    ).

certified_claim(Certified, Key-_) :- memberchk(Key, Certified).

%% dimension_stage(+ReqId, +ScenarioTestStage, +Context, -Stage)
% implements REQ-kibi-dimension-gap
% A claim that quantifies over a collection (each, every, all) or bounds a
% cardinality (at least, at most, exactly, no more than) must be grounded on what
% varies: a count or bound, a set, a rule over a variable or a state
% machine.  A claim whose grounding facts are all booleans or ground
% predicates states the verdict, not the dimension, so a scenario with one
% file can pass where many files break.  Claims a fresh certificate proves
% at code scope are decided already.  A grounding fact can carry a
% dimension_waiver reason and a dimension_waiver_approved_by human for a
% quantifier word that does not range over anything ("without any network
% access").  Only, any and some are left out: they mostly scope a
% condition ("only when", "before any write") rather than range over one.  Status is not_required (no such claim), waived (each one has an
% approved waiver) or missing.
dimension_stage(ReqId, ScenarioTestStage, Context, Stage) :-
    findall(Key-FactId,
        (   negative_path_link(Link),
            kb_relationship(Link, ReqId, FactId),
            fact_claim_key_or_id(FactId, Key)
        ),
        ClaimFacts0),
    sort(ClaimFacts0, ClaimFacts),
    pairs_keys(ClaimFacts, Keys0),
    sort(Keys0, Keys),
    certified_claim_keys(ReqId, ScenarioTestStage, Context, Certified),
    findall(Claim,
        (   member(Key, Keys),
            \+ memberchk(Key, Certified),
            findall(FactId, member(Key-FactId, ClaimFacts), FactIds),
            unrepresented_quantified_claim(Key, FactIds, Claim)
        ),
        Claims),
    partition(approved_dimension_waiver, Claims, Waived, Open),
    findall(Key, (member(Claim, Open), get_dict(claimKey, Claim, Key)), OpenKeys),
    pending_certified_claim_keys(ScenarioTestStage, Context, OpenKeys, Pending),
    (   Claims == []
    ->  Status = not_required
    ;   Open == []
    ->  Status = waived
    ;   Status = missing
    ),
    Stage = _{
        status: Status,
        claims: Open,
        waivedClaims: Waived,
        pendingReproofClaims: Pending
    }.

% A claim whose text quantifies and whose every grounding fact is a boolean
% property value or a ground predicate.
unrepresented_quantified_claim(Key, FactIds, Claim) :-
    FactIds = [_|_],
    forall(member(FactId, FactIds), dimensionless_fact(FactId)),
    claim_text_of(FactIds, Text),
    claim_quantifier(Text, Quantifier),
    !,
    quantifier_rewrites(Quantifier, Rewrites),
    dimension_waiver(FactIds, Waiver),
    atom_string(Quantifier, QuantifierText),
    Claim = _{
        claimKey: Key,
        claimText: Text,
        quantifier: QuantifierText,
        factIds: FactIds,
        rewrites: Rewrites,
        waiver: Waiver
    }.

dimensionless_fact(FactId) :-
    kb_entity(FactId, fact, Props),
    memberchk(fact_kind=RawKind, Props),
    normalize_atom(RawKind, Kind),
    (   Kind == predicate
    ->  true
    ;   Kind == property_value,
        memberchk(value_type=RawType, Props),
        normalize_atom(RawType, bool)
    ).

claim_text_of(FactIds, Text) :-
    member(FactId, FactIds),
    kb_entity(FactId, fact, Props),
    memberchk(claim_text=Raw, Props),
    normalize_atom(Raw, Atom),
    Atom \== '',
    !,
    atom_string(Atom, Text).
claim_text_of(FactIds, Text) :-
    member(FactId, FactIds),
    kb_entity(FactId, fact, Props),
    memberchk(title=Raw, Props),
    !,
    normalize_atom(Raw, Atom),
    atom_string(Atom, Text).

%% claim_quantifier(+Text, -Quantifier)
% The first quantifier over a collection (each, every, all) or cardinality
% bound (exactly, at least, at most, no more than) in Text.
claim_quantifier(Text, Quantifier) :-
    string_lower(Text, Lower),
    split_string(Lower, " \t\n\r.,;:()[]\"'`/!?-", " \t\n\r.,;:()[]\"'`/!?-", Words0),
    exclude(==(""), Words0, Words),
    quantifier_in(Words, Quantifier).

quantifier_in(["no", "more", "than"|_], no_more_than) :- !.
quantifier_in(["at", "least"|_], at_least) :- !.
quantifier_in(["at", "most"|_], at_most) :- !.
quantifier_in([Word|_], Quantifier) :-
    memberchk(Word, ["each", "every", "all", "exactly"]),
    !,
    atom_string(Quantifier, Word).
quantifier_in([_|Rest], Quantifier) :-
    quantifier_in(Rest, Quantifier).

% The typed groundings that represent what a quantifier ranges over, most
% likely first.
quantifier_rewrites(Quantifier, ["bound"]) :-
    memberchk(Quantifier, [at_least, at_most, exactly, no_more_than]),
    !.
quantifier_rewrites(_, ["rule", "count", "set"]).

%% dimension_waiver(+FactIds, -Waiver)
% A grounding fact's dimension_waiver reason and the human who approved it
% in dimension_waiver_approved_by.  An approved waiver on any grounding fact
% wins; otherwise a reason alone is reported as pending approval.  Waiver is
% _{} when none is recorded.
dimension_waiver(FactIds, Waiver) :-
    findall(W, (member(FactId, FactIds), fact_dimension_waiver(FactId, W)), Waivers),
    (   member(W, Waivers), get_dict(approvedBy, W, _)
    ->  Waiver = W
    ;   Waivers = [W|_]
    ->  Waiver = W
    ;   Waiver = _{}
    ).

fact_dimension_waiver(FactId, Waiver) :-
    kb_entity(FactId, fact, Props),
    memberchk(dimension_waiver=RawReason, Props),
    normalize_atom(RawReason, Reason),
    Reason \== '',
    atom_string(Reason, ReasonText),
    (   memberchk(dimension_waiver_approved_by=RawBy, Props),
        normalize_atom(RawBy, By),
        By \== ''
    ->  atom_string(By, ByText),
        Waiver = _{reason: ReasonText, approvedBy: ByText}
    ;   Waiver = _{reason: ReasonText}
    ).

approved_dimension_waiver(Claim) :-
    get_dict(approvedBy, Claim.waiver, _).

negative_path_link(requires_property).
negative_path_link(requires_predicate).
negative_path_link(requires_rule).

fact_claim_key_or_id(FactId, Key) :-
    (   kb_entity(FactId, fact, Props),
        memberchk(claim_key=Raw, Props),
        normalize_atom(Raw, Key0),
        Key0 \== ''
    ->  Key = Key0
    ;   Key = FactId
    ).

% Claims of ReqId a passed receipt binds with a derived obligation outside
% intent scope: a certificate decides them, both sides.
certified_claim_keys(ReqId, ScenarioTestStage, Context, Keys) :-
    (   get_dict(tests, ScenarioTestStage, Tests) -> true ; Tests = [] ),
    findall(Key,
        (   member(TestId, Tests),
            test_receipt_evidence(Context, [unit, integration, end_to_end], TestId, Evidence),
            get_dict(state, Evidence, passed),
            get_dict(claimBindings, Evidence, Recorded),
            member(Entry, Recorded),
            inventory_entry_field(Entry, requirement_id, RawReq),
            normalize_atom(RawReq, ReqId),
            inventory_entry_field(Entry, claim_key, RawKey),
            normalize_atom(RawKey, Key),
            test_claim_binding(ReqId, Key, [TestId-Evidence], Binding),
            get_dict(binding, Binding, derived),
            \+ get_dict(scope, Binding, intent)
        ),
        Keys0),
    sort(Keys0, Keys).

scenario_test_stage(ScenarioIds, Stage, ScenarioTests) :-
    maplist(scenario_test_obligation, ScenarioIds, Obligations),
    findall(TestId,
        (member(Obligation, Obligations), member(TestId, Obligation.tests)),
        ScenarioTests0),
    sort(ScenarioTests0, ScenarioTests),
    findall(TestId,
        (member(Obligation, Obligations), member(TestId, Obligation.scenarioTestTargets)),
        ScenarioTestTargets0),
    sort(ScenarioTestTargets0, ScenarioTestTargets),
    findall(TestId,
        (member(Obligation, Obligations), member(TestId, Obligation.invalidScenarioTestTargets)),
        InvalidScenarioTestTargets0),
    sort(InvalidScenarioTestTargets0, InvalidScenarioTestTargets),
    (   ScenarioIds == []
    ->  Status = missing
    ;   member(Obligation, Obligations), Obligation.status == missing
    ->  Status = missing
    ;   Status = passed
    ),
    maplist(entity_source_ref, ScenarioTests, Sources),
    maplist(test_resolution_record, ScenarioTests, Resolutions),
    Stage = _{
        status: Status,
        scenarios: ScenarioIds,
        tests: ScenarioTests,
        scenarioTestTargets: ScenarioTestTargets,
        invalidScenarioTestTargets: InvalidScenarioTestTargets,
        sources: Sources,
        obligations: Obligations,
        resolutions: Resolutions
    }.

scenario_test_obligation(ScenarioId, Obligation) :-
    findall(TestId, declared_scenario_test_target(ScenarioId, TestId), TestTargets0),
    sort(TestTargets0, TestTargets),
    include(existing_test, TestTargets, TestIds),
    findall(TestId,
        (member(TestId, TestTargets), \+ existing_test(TestId)),
        InvalidScenarioTestTargets),
    maplist(entity_source_ref, TestIds, Sources),
    (   (TestIds == [] ; InvalidScenarioTestTargets \= [])
    ->  Status = missing
    ;   Status = passed
    ),
    Obligation = _{
        scenarioId: ScenarioId,
        status: Status,
        scenarioTestTargets: TestTargets,
        invalidScenarioTestTargets: InvalidScenarioTestTargets,
        tests: TestIds,
        sources: Sources
    }.

declared_scenario_test_target(ScenarioId, TestId) :-
    kb_relationship(verified_by, ScenarioId, TestId).
declared_scenario_test_target(ScenarioId, TestId) :-
    kb_relationship(validates, TestId, ScenarioId).

existing_test(TestId) :-
    kb_entity(TestId, test, _).

scenario_test(ScenarioId, TestId) :-
    declared_scenario_test_target(ScenarioId, TestId),
    existing_test(TestId).

passing_e2e_stage(ScenarioTestStage, Context, Stage, PassingE2eTests) :-
    maplist(scenario_passing_e2e_obligation(Context), ScenarioTestStage.obligations, ScenarioObligations),
    findall(Item, (member(Obligation, ScenarioObligations), member(Item, Obligation.evidence)), Evidence0),
    unique_evidence_by_test(Evidence0, Evidence),
    evidence_tests_with_state(Evidence, passed, PassingE2eTests),
    evidence_tests_with_state(Evidence, missing, MissingReceiptTests),
    evidence_tests_with_state(Evidence, stale, StaleReceiptTests),
    evidence_tests_with_state(Evidence, failed, FailedReceiptTests),
    evidence_tests_with_state(Evidence, invalid, InvalidReceiptTests),
    evidence_tests_with_state(Evidence, contract_mismatch, ContractMismatchReceiptTests),
    evidence_tests_with_state(Evidence, snapshot_unavailable, SnapshotUnavailableTests),
    evidence_tests_with_state(Evidence, not_end_to_end, NonEndToEndTests),
    passing_e2e_status(ScenarioObligations, Status),
    Stage = _{
        status: Status,
        tests: PassingE2eTests,
        scenarioObligations: ScenarioObligations,
        receiptEvidence: Evidence,
        missingReceiptTests: MissingReceiptTests,
        staleReceiptTests: StaleReceiptTests,
        failedReceiptTests: FailedReceiptTests,
        invalidReceiptTests: InvalidReceiptTests,
        contractMismatchReceiptTests: ContractMismatchReceiptTests,
        snapshotUnavailableTests: SnapshotUnavailableTests,
        nonEndToEndTests: NonEndToEndTests,
        currentCodeSnapshot: Context.proofSnapshot,
        checkedAt: Context.proofCheckedAt,
        maxAgeSeconds: Context.proofMaxAgeSeconds
    }.

unique_evidence_by_test(Evidence0, Evidence) :-
    findall(TestId,
        (member(Item, Evidence0), TestId = Item.testId),
        TestIds0),
    sort(TestIds0, TestIds),
    maplist(first_evidence_for_test(Evidence0), TestIds, Evidence).

% A test shared by scenarios with different accepted scopes keeps its receipt
% state from any scenario that accepts its scope, independent of scenario order.
% implements REQ-ui-pattern-component-proof
first_evidence_for_test(Evidence, TestId, Item) :-
    member(Item, Evidence),
    Item.testId == TestId,
    Item.state \== not_end_to_end,
    !.
first_evidence_for_test(Evidence, TestId, Item) :-
    member(Item, Evidence),
    Item.testId == TestId,
    !.

scenario_passing_e2e_obligation(Context, TestObligation, Obligation) :-
    scenario_accepted_scopes(TestObligation.scenarioId, AcceptedScopes),
    maplist(test_receipt_evidence(Context, AcceptedScopes), TestObligation.tests, Evidence),
    include(e2e_evidence, Evidence, E2eEvidence),
    include(non_e2e_evidence, Evidence, NonEndToEndEvidence),
    evidence_tests_with_state(E2eEvidence, passed, PassingE2eTests),
    evidence_tests_with_state(E2eEvidence, missing, MissingReceiptTests),
    evidence_tests_with_state(E2eEvidence, stale, StaleReceiptTests),
    evidence_tests_with_state(E2eEvidence, failed, FailedReceiptTests),
    evidence_tests_with_state(E2eEvidence, invalid, InvalidReceiptTests),
    evidence_tests_with_state(E2eEvidence, contract_mismatch, ContractMismatchReceiptTests),
    evidence_tests_with_state(E2eEvidence, snapshot_unavailable, SnapshotUnavailableTests),
    evidence_tests_with_state(NonEndToEndEvidence, not_end_to_end, NonEndToEndTests),
    scenario_obligation_gaps(TestObligation, E2eEvidence, Gaps),
    scenario_obligation_status(TestObligation, E2eEvidence, Status),
    findall(TestId,
        (member(Item, E2eEvidence), TestId = Item.testId),
        E2eTests0),
    sort(E2eTests0, E2eTests),
    Obligation = _{
        scenarioId: TestObligation.scenarioId,
        status: Status,
        scenarioTestTargets: TestObligation.scenarioTestTargets,
        invalidScenarioTestTargets: TestObligation.invalidScenarioTestTargets,
        tests: TestObligation.tests,
        acceptedScopes: AcceptedScopes,
        e2eTests: E2eTests,
        nonEndToEndTests: NonEndToEndTests,
        evidence: Evidence,
        gaps: Gaps,
        passingE2eTests: PassingE2eTests,
        missingReceiptTests: MissingReceiptTests,
        staleReceiptTests: StaleReceiptTests,
        failedReceiptTests: FailedReceiptTests,
        invalidReceiptTests: InvalidReceiptTests,
        contractMismatchReceiptTests: ContractMismatchReceiptTests,
        snapshotUnavailableTests: SnapshotUnavailableTests
    }.

%% scenario_accepted_scopes(+ScenarioId, -Scopes)
% End-to-end evidence proves every scenario. A scenario whose specifying
% requirements are all grounded only in component-scope UI pattern predicates
% may also be proven by a unit or integration test that renders the component
% in isolation, with the same receipt rules (valid, fresh, passing).
% implements REQ-ui-pattern-component-proof
scenario_accepted_scopes(ScenarioId, [unit, integration, end_to_end]) :-
    component_scope_scenario(ScenarioId),
    !.
scenario_accepted_scopes(_ScenarioId, [end_to_end]).

%% component_scope_predicate(?Name)
% Built-in UI pattern predicates a component rendered in isolation can prove:
% the pattern, its markers and variant parity are visible in the rendered
% markup. Layout claims (ui_container, visual_layout_rule) depend on real
% rendering and keep the end-to-end requirement.
component_scope_predicate(ui_pattern).
component_scope_predicate(same_pattern).
component_scope_predicate(pattern_marker).

component_scope_scenario(ScenarioId) :-
    findall(ReqId, kb_relationship(specified_by, ReqId, ScenarioId), ReqIds0),
    sort(ReqIds0, ReqIds),
    ReqIds \= [],
    forall(member(ReqId, ReqIds), component_scope_requirement(ReqId)).

component_scope_requirement(ReqId) :-
    findall(FactId, kb_relationship(requires_predicate, ReqId, FactId), FactIds),
    FactIds \= [],
    forall(member(FactId, FactIds),
        (   predicate_fact(FactId, _Namespace, Name, _Args, _Polarity),
            component_scope_predicate(Name)
        )),
    \+ kb_relationship(requires_property, ReqId, _),
    \+ kb_relationship(requires_rule, ReqId, _).

e2e_evidence(Item) :- Item.state \= not_end_to_end.
non_e2e_evidence(Item) :- Item.state == not_end_to_end.

scenario_obligation_gaps(TestObligation, E2eEvidence, Gaps) :-
    findall(Gap, scenario_obligation_gap(TestObligation, E2eEvidence, Gap), Gaps0),
    sort(Gaps0, Gaps).

scenario_obligation_gap(TestObligation, _E2eEvidence, missing_scenario_test) :-
    TestObligation.status == missing.
scenario_obligation_gap(TestObligation, E2eEvidence, missing_passing_e2e) :-
    TestObligation.status == passed,
    E2eEvidence == [].
scenario_obligation_gap(_TestObligation, Evidence, missing_proof_receipt) :-
    member(Item, Evidence), Item.state == missing.
scenario_obligation_gap(_TestObligation, Evidence, stale_proof_receipt) :-
    member(Item, Evidence), Item.state == stale.
scenario_obligation_gap(_TestObligation, Evidence, failed_proof_receipt) :-
    member(Item, Evidence), Item.state == failed.
scenario_obligation_gap(_TestObligation, Evidence, invalid_proof_receipt) :-
    member(Item, Evidence), Item.state == invalid.
scenario_obligation_gap(_TestObligation, Evidence, proof_contract_mismatch) :-
    member(Item, Evidence), Item.state == contract_mismatch.
scenario_obligation_gap(_TestObligation, Evidence, proof_snapshot_unavailable) :-
    member(Item, Evidence), Item.state == snapshot_unavailable.

scenario_obligation_status(TestObligation, _E2eEvidence, missing) :-
    TestObligation.status == missing,
    !.
scenario_obligation_status(_TestObligation, [], missing) :-
    !.
scenario_obligation_status(_TestObligation, Evidence, passed) :-
    Evidence \= [],
    forall(member(Item, Evidence), Item.state == passed),
    !.
scenario_obligation_status(_TestObligation, _Evidence, unresolved).

passing_e2e_status([], missing) :- !.
passing_e2e_status(Obligations, passed) :-
    forall(member(Obligation, Obligations), Obligation.status == passed),
    !.
passing_e2e_status(Obligations, missing) :-
    member(Obligation, Obligations), Obligation.status == missing,
    !.
passing_e2e_status(_Obligations, unresolved).

evidence_tests_with_state(Evidence, State, TestIds) :-
    findall(TestId,
        (member(Item, Evidence), Item.state == State, TestId = Item.testId),
        TestIds0),
    sort(TestIds0, TestIds).

test_receipt_evidence(Context, TestId, Evidence) :-
    test_receipt_evidence(Context, [end_to_end], TestId, Evidence).

% implements REQ-ui-pattern-component-proof
% AcceptedScopes lists the verification scopes whose receipts count for the
% scenario. Tests outside them keep the nonblocking not_end_to_end state.
test_receipt_evidence(Context, AcceptedScopes, TestId, Evidence) :-
    kb_entity(TestId, test, Props),
    test_scope(Props, Scope),
    (   \+ memberchk(Scope, AcceptedScopes)
    ->  Evidence = _{testId: TestId, state: not_end_to_end, scope: Scope}
    ;   Context.proofSnapshot == unknown
    ->  Evidence = _{testId: TestId, state: snapshot_unavailable, scope: Scope}
    ;   proof_receipt_entries(Props, Receipts, ReceiptPropertyPresent),
        receipt_evidence_state(TestId, Scope, Props, Receipts, ReceiptPropertyPresent, Context, Evidence)
    ).

receipt_evidence_state(TestId, Scope, _Props, [], false, _Context,
        _{testId: TestId, state: missing, scope: Scope, receiptCount: 0}) :- !.
receipt_evidence_state(TestId, Scope, Props, Receipts, _Present, _Context,
        _{testId: TestId, state: invalid, scope: Scope, receiptCount: Count}) :-
    length(Receipts, Count),
    proof_contract_binding(Props, ContractBinding),
    (ContractBinding == invalid
    ; Receipts == []
    ; pure_memo(receipt_history_well_formed, TestId-Receipts,
                receipt_history_well_formed, false)),
    !.
receipt_evidence_state(TestId, Scope, Props, Receipts, _Present, Context, Evidence) :-
    receipt_for_current_mode(TestId, Context, Receipts, SnapshotReceipts),
    (   SnapshotReceipts == []
    ->  length(Receipts, Count),
        Evidence = _{testId: TestId, state: stale, scope: Scope, receiptCount: Count}
    ;   proof_contract_binding(Props, ContractBinding),
        include(receipt_matches_current_binding(Scope, ContractBinding), SnapshotReceipts, CurrentReceipts),
        (   CurrentReceipts == []
        ->  receipt_contract_mismatch_evidence(TestId, Scope, SnapshotReceipts, ContractBinding, Evidence)
        ;   latest_receipt(CurrentReceipts, Latest, FinishedStamp),
            receipt_runtime_state(Latest, FinishedStamp, Context, State, AgeSeconds),
            receipt_evidence_dict(TestId, Scope, Latest, State, AgeSeconds, Evidence)
        )
    ).

receipt_history_well_formed(TestId-Receipts, WellFormed) :-
    (   forall(member(Receipt, Receipts), valid_receipt_shape(TestId, Receipt)),
        chronological_receipt_history(Receipts)
    ->  WellFormed = true
    ;   WellFormed = false
    ).

proof_receipt_entries(Props, Receipts, Present) :-
    (   memberchk(proof_receipts=Raw, Props)
    ->  Present = true,
        inventory_entries(Raw, Receipts)
    ;   Present = false,
        Receipts = []
    ).

valid_receipt_shape(TestId, Receipt) :-
    inventory_entry_field(Receipt, version, RawVersion),
    normalize_receipt_atom(RawVersion, Version),
    receipt_version(Version),
    valid_receipt_version_fields(Version, Receipt),
    inventory_entry_field(Receipt, receipt_id, RawReceiptId),
    normalize_receipt_atom(RawReceiptId, ReceiptId), valid_receipt_id(ReceiptId),
    inventory_entry_field(Receipt, test_id, RawTestId),
    normalize_receipt_atom(RawTestId, TestId),
    inventory_entry_field(Receipt, scope, RawScope),
    normalize_receipt_atom(RawScope, ReceiptScope),
    memberchk(ReceiptScope, [unit, integration, end_to_end]),
    inventory_entry_field(Receipt, outcome, RawOutcome),
    normalize_receipt_atom(RawOutcome, Outcome),
    memberchk(Outcome, [passed, failed, errored, cancelled, skipped, timed_out, interrupted]),
    inventory_entry_field(Receipt, code_snapshot, RawSnapshot),
    normalize_receipt_atom(RawSnapshot, Snapshot), valid_sha256(Snapshot),
    inventory_entry_field(Receipt, environment_hash, RawEnvironmentHash),
    normalize_receipt_atom(RawEnvironmentHash, EnvironmentHash), valid_sha256(EnvironmentHash),
    inventory_entry_field(Receipt, artifact_digest, RawArtifactDigest),
    normalize_receipt_atom(RawArtifactDigest, ArtifactDigest), valid_sha256(ArtifactDigest),
    inventory_entry_field(Receipt, contract_hash, RawContractHash),
    normalize_receipt_atom(RawContractHash, ContractHash), valid_sha256(ContractHash),
    inventory_entry_field(Receipt, fingerprint, RawFingerprint),
    normalize_receipt_atom(RawFingerprint, Fingerprint), valid_sha256(Fingerprint),
    valid_fingerprint_components(Receipt),
    inventory_entry_field(Receipt, integration_id, RawIntegrationId),
    normalize_receipt_atom(RawIntegrationId, IntegrationId), IntegrationId \= '',
    inventory_entry_field(Receipt, producer, RawProducer),
    receipt_producer_name(RawProducer, ProducerName), ProducerName \= '',
    inventory_entry_field(Receipt, command_argv, RawCommandArgv),
    is_list(RawCommandArgv),
    RawCommandArgv \= [],
    maplist(nonempty_receipt_atom, RawCommandArgv),
    (   inventory_entry_field(Receipt, binding_hash, RawBindingHash)
    ->  normalize_receipt_atom(RawBindingHash, BindingHash),
        valid_sha256(BindingHash)
    ;   true
    ),
    inventory_entry_field(Receipt, run_outcome, RawRunOutcome),
    normalize_receipt_atom(RawRunOutcome, RunOutcome),
    memberchk(RunOutcome, [passed, failed, errored, cancelled, timed_out, interrupted, no_results]),
    inventory_entry_field(Receipt, proof_results, RawResults),
    is_list(RawResults),
    maplist(valid_receipt_proof_result, RawResults),
    receipt_timestamp(Receipt, started_at, StartedStamp),
    receipt_timestamp(Receipt, finished_at, FinishedStamp),
    FinishedStamp >= StartedStamp.

% kibi.proof-receipt.v2 adds the contract kind and the evidence level the
% receipt supports; v1 receipts are still read, as e2e evidence at tested.
receipt_version('kibi.proof-receipt.v1').
receipt_version('kibi.proof-receipt.v2').

valid_receipt_version_fields('kibi.proof-receipt.v1', _Receipt).
valid_receipt_version_fields('kibi.proof-receipt.v2', Receipt) :-
    inventory_entry_field(Receipt, kind, RawKind),
    normalize_receipt_atom(RawKind, Kind),
    memberchk(Kind, [e2e, example, property, exhaustive, typecheck, arithmetic, smt, rule, state_machine, regex, source]),
    inventory_entry_field(Receipt, evidence_level, RawLevel),
    normalize_receipt_atom(RawLevel, Level),
    memberchk(Level, [proved, tested]),
    (   inventory_entry_field(Receipt, certificate_digest, RawDigest)
    ->  normalize_receipt_atom(RawDigest, Digest),
        valid_sha256(Digest)
    ;   true
    ),
    (   Level == proved
    ->  memberchk(Kind, [exhaustive, typecheck, arithmetic, smt, rule, state_machine, regex, source]),
        inventory_entry_field(Receipt, outcome, RawOutcome),
        normalize_receipt_atom(RawOutcome, passed),
        inventory_entry_field(Receipt, certificate, _),
        inventory_entry_field(Receipt, certificate_digest, _),
        \+ inventory_entry_field(Receipt, certificate_rejection, _)
    ;   true
    ).

receipt_producer_name(Producer, Name) :-
    inventory_entry_field(Producer, name, RawName),
    normalize_receipt_atom(RawName, Name).

valid_fingerprint_components(Receipt) :-
    inventory_entry_field(Receipt, fingerprint_components, Components),
    forall(member(Key, [contract, integration, command, bindings, producer]),
           (inventory_entry_field(Components, Key, Raw),
            normalize_receipt_atom(Raw, Value),
            valid_sha256(Value))),
    !.

nonempty_receipt_atom(Value) :-
    normalize_receipt_atom(Value, Atom),
    Atom \= ''.

valid_receipt_proof_result(Result) :-
    inventory_entry_field(Result, symbol_id, RawSymbolId),
    nonempty_receipt_atom(RawSymbolId),
    inventory_entry_field(Result, target, RawTarget),
    nonempty_receipt_atom(RawTarget),
    inventory_entry_field(Result, outcome, RawOutcome),
    normalize_receipt_atom(RawOutcome, ResultOutcome),
    memberchk(ResultOutcome, [passed, failed, timed_out, skipped, interrupted, errored]),
    inventory_entry_field(Result, binding, RawBinding),
    normalize_receipt_atom(RawBinding, Binding),
    memberchk(Binding, [native_case, aggregate_run]),
    valid_receipt_attempts(Result).

valid_receipt_attempts(Result) :-
    inventory_entry_field(Result, attempts, Attempts),
    inventory_entry_field(Attempts, status, RawStatus),
    normalize_receipt_atom(RawStatus, Status),
    valid_attempt_status(Status, Attempts).

valid_attempt_status(unavailable, Attempts) :-
    \+ inventory_entry_field(Attempts, entries, _Present), !.
valid_attempt_status(unavailable, Attempts) :-
    inventory_entry_field(Attempts, entries, Entries),
    Entries == [], !.
valid_attempt_status(complete, Attempts) :-
    inventory_entry_field(Attempts, entries, Entries),
    is_list(Entries),
    Entries \= [],
    forall(member(Entry, Entries),
           (inventory_entry_field(Entry, outcome, RawEntryOutcome),
            normalize_receipt_atom(RawEntryOutcome, EntryOutcome),
            memberchk(EntryOutcome, [passed, failed, timed_out, skipped, interrupted, errored]))),
    !.

valid_sha256(Value) :-
    atom_length(Value, 64),
    atom_chars(Value, Chars),
    forall(member(Char, Chars), memberchk(Char, ['0','1','2','3','4','5','6','7','8','9',a,b,c,d,e,f])).

valid_receipt_id(Value) :-
    re_match('^PR-[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$', Value).

receipt_timestamp(Receipt, Field, Stamp) :-
    inventory_entry_field(Receipt, Field, RawValue),
    normalize_receipt_atom(RawValue, Value),
    re_match('^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:[.][0-9]+)?(?:Z|[+-][0-9]{2}:[0-9]{2})$', Value),
    catch(parse_time(Value, Stamp), _, fail).

chronological_receipt_history(Receipts) :-
    maplist(receipt_finished_stamp, Receipts, FinishedStamps),
    strictly_increasing(FinishedStamps).

receipt_finished_stamp(Receipt, Stamp) :-
    receipt_timestamp(Receipt, finished_at, Stamp).

strictly_increasing([]).
strictly_increasing([_]).
strictly_increasing([Left, Right|Rest]) :-
    Right > Left,
    strictly_increasing([Right|Rest]).

receipt_for_snapshot(Snapshot, Receipt) :-
    inventory_entry_field(Receipt, code_snapshot, RawSnapshot),
    normalize_receipt_atom(RawSnapshot, Snapshot).

% Per-contract binding selector (W2). In per_contract mode a receipt carrying
% a binding_hash is current when it matches the test's current binding hash;
% receipts without one keep the strict snapshot semantics so older evidence
% stays valid until each contract is re-proven.
receipt_for_current_mode(TestId, Context, Receipts, SnapshotReceipts) :-
    (   Context.proofBindingMode == per_contract,
        get_dict(TestId, Context.proofTestBindings, CurrentBinding)
    ->  include(receipt_with_binding_hash, Receipts, BoundReceipts),
        include(receipt_for_binding(CurrentBinding), BoundReceipts, BindingReceipts),
        (   BindingReceipts == []
        ->  include(receipt_for_snapshot(Context.proofSnapshot), Receipts, SnapshotReceipts)
        ;   SnapshotReceipts = BindingReceipts
        )
    ;   include(receipt_for_snapshot(Context.proofSnapshot), Receipts, SnapshotReceipts)
    ).

receipt_with_binding_hash(Receipt) :-
    inventory_entry_field(Receipt, binding_hash, _).

% The current binding is one hash, or a list of the hashes a current receipt
% may carry (the current binding and the one written before relationship
% links left it).
receipt_for_binding(Bindings, Receipt) :-
    is_list(Bindings),
    !,
    inventory_entry_field(Receipt, binding_hash, RawBinding),
    normalize_receipt_atom(RawBinding, Binding),
    memberchk(Binding, Bindings).
receipt_for_binding(Binding, Receipt) :-
    inventory_entry_field(Receipt, binding_hash, RawBinding),
    normalize_receipt_atom(RawBinding, Binding).

receipt_matches_current_binding(Scope, ContractBinding, Receipt) :-
    inventory_entry_field(Receipt, scope, RawScope),
    normalize_receipt_atom(RawScope, Scope),
    receipt_matches_current_contract(ContractBinding, Receipt).

receipt_matches_current_contract(none, _Receipt).
receipt_matches_current_contract(hash(ExpectedHash), Receipt) :-
    inventory_entry_field(Receipt, version, RawVersion),
    normalize_receipt_atom(RawVersion, Version),
    receipt_version(Version),
    inventory_entry_field(Receipt, contract_hash, RawContractHash),
    normalize_receipt_atom(RawContractHash, ExpectedHash).

receipt_contract_mismatch_evidence(TestId, Scope, Receipts, ContractBinding, Evidence) :-
    length(Receipts, Count),
    findall(Hash,
        (member(Receipt, Receipts),
         inventory_entry_field(Receipt, contract_hash, RawHash),
         normalize_receipt_atom(RawHash, Hash)),
        Hashes0),
    sort(Hashes0, Hashes),
    current_contract_hash_value(ContractBinding, CurrentContractHash),
    Evidence = _{
        testId: TestId,
        state: contract_mismatch,
        scope: Scope,
        receiptCount: Count,
        currentContractHash: CurrentContractHash,
        receiptContractHashes: Hashes
    }.

current_contract_hash_value(hash(Hash), Hash).
current_contract_hash_value(none, none).

proof_contract_binding(Props, Binding) :-
    (   memberchk(proof_contract=RawContract, Props)
    ->  (proof_contract_hash(RawContract, Hash) -> Binding = hash(Hash) ; Binding = invalid)
    ;   Binding = none
    ).

proof_contract_hash(RawContract, Hash) :-
    proof_contract_dict(RawContract, Contract),
    canonical_json_value(Contract, Canonical),
    crypto_data_hash(Canonical, Hash, [algorithm(sha256), encoding(utf8)]).

proof_contract_dict(^^(Value, _), Contract) :- !,
    proof_contract_dict(Value, Contract).
proof_contract_dict(literal(type(_, Value)), Contract) :- !,
    proof_contract_dict(Value, Contract).
proof_contract_dict(literal(Value), Contract) :- !,
    proof_contract_dict(Value, Contract).
proof_contract_dict(Contract, Contract) :-
    is_dict(Contract), !.
proof_contract_dict(Raw, Contract) :-
    (atom(Raw) ; string(Raw)),
    catch(atom_json_dict(Raw, Contract, [value_string_as(string)]), _, fail),
    is_dict(Contract).

canonical_json_value(Value, Json) :-
    is_dict(Value), !,
    dict_pairs(Value, _, Pairs),
    maplist(canonical_json_pair, Pairs, Parts),
    atomics_to_string(Parts, ",", Body),
    format(string(Json), "{~s}", [Body]).
canonical_json_value(Value, Json) :-
    is_list(Value), !,
    maplist(canonical_json_value, Value, Parts),
    atomics_to_string(Parts, ",", Body),
    format(string(Json), "[~s]", [Body]).
% JSON true, false and null read back as atoms; json_write would quote them,
% so the hash would differ from the one the CLI recorded at ingest.
canonical_json_value(Value, Json) :-
    memberchk(Value, [true, false, null]), !,
    atom_string(Value, Json).
canonical_json_value(Value, Json) :-
    with_output_to(string(Json), json_write(current_output, Value, [width(0)])).

canonical_json_pair(Key-Value, Json) :-
    with_output_to(string(KeyJson), json_write(current_output, Key, [width(0)])),
    canonical_json_value(Value, ValueJson),
    format(string(Json), "~s:~s", [KeyJson, ValueJson]).

latest_receipt(Receipts, Latest, FinishedStamp) :-
    findall(Stamp-Receipt,
        (member(Receipt, Receipts), receipt_timestamp(Receipt, finished_at, Stamp)),
        Pairs),
    keysort(Pairs, Sorted),
    last(Sorted, FinishedStamp-Latest).

receipt_runtime_state(_Receipt, FinishedStamp, Context, invalid, AgeSeconds) :-
    AgeSeconds is Context.proofCheckedAtStamp - FinishedStamp,
    AgeSeconds < -300,
    !.
receipt_runtime_state(_Receipt, FinishedStamp, Context, stale, AgeSeconds) :-
    AgeSeconds is Context.proofCheckedAtStamp - FinishedStamp,
    AgeSeconds > Context.proofMaxAgeSeconds,
    !.
receipt_runtime_state(Receipt, FinishedStamp, Context, State, AgeSeconds) :-
    AgeSeconds is Context.proofCheckedAtStamp - FinishedStamp,
    inventory_entry_field(Receipt, outcome, RawOutcome),
    normalize_receipt_atom(RawOutcome, Outcome),
    (Outcome == passed -> State = passed ; State = failed).

receipt_evidence_dict(TestId, Scope, Receipt, State, AgeSeconds, Evidence) :-
    receipt_string_field(Receipt, receipt_id, ReceiptId),
    receipt_string_field(Receipt, outcome, Outcome),
    receipt_string_field(Receipt, code_snapshot, CodeSnapshot),
    receipt_string_field(Receipt, environment_hash, EnvironmentHash),
    receipt_string_field(Receipt, started_at, StartedAt),
    receipt_string_field(Receipt, finished_at, FinishedAt),
    receipt_string_field(Receipt, artifact_digest, ArtifactDigest),
    Evidence0 = _{
        testId: TestId,
        state: State,
        scope: Scope,
        receiptId: ReceiptId,
        outcome: Outcome,
        codeSnapshot: CodeSnapshot,
        environmentHash: EnvironmentHash,
        startedAt: StartedAt,
        finishedAt: FinishedAt,
        artifactDigest: ArtifactDigest,
        ageSeconds: AgeSeconds
    },
    receipt_kind_evidence(Receipt, State, Evidence0, Evidence).

% implements REQ-kibi-code-proof-kinds
% A v2 receipt adds its contract kind and the evidence level it supports.
% proved needs the certificate to re-check now, not only when it was
% ingested: its digest must still match and code_certificates.pl must accept
% it. The digest is an unsigned hash, so this catches edits and corruption,
% not deliberate forgery. When a receipt that claimed proved no longer
% re-checks, the evidence says why (certificateRejection).
receipt_kind_evidence(Receipt, State, Evidence0, Evidence) :-
    receipt_string_field(Receipt, version, 'kibi.proof-receipt.v2'),
    receipt_string_field(Receipt, kind, Kind),
    !,
    (   State == passed,
        receipt_string_field(Receipt, evidence_level, proved)
    ->  receipt_certificate_recheck(Receipt, Recheck),
        (   Recheck == ok
        ->  Evidence1 = Evidence0.put(_{kind: Kind, evidenceLevel: proved})
        ;   Recheck = rejected(Reason),
            Evidence1 = Evidence0.put(_{kind: Kind, evidenceLevel: tested,
                                        certificateRejection: Reason})
        )
    ;   Evidence1 = Evidence0.put(_{kind: Kind, evidenceLevel: tested})
    ),
    receipt_claim_fields(Receipt, Evidence1, Evidence).
receipt_kind_evidence(_Receipt, _State, Evidence, Evidence).

% receipt_certificate_recheck(+Receipt, -Result): ok or rejected(Reason).
receipt_certificate_recheck(Receipt, Result) :-
    (   inventory_entry_field(Receipt, certificate, Certificate),
        is_dict(Certificate)
    ->  true
    ;   Certificate = none
    ),
    (   Certificate == none
    ->  Result = rejected("the receipt has no certificate")
    ;   \+ receipt_string_field(Receipt, certificate_digest, _)
    ->  Result = rejected("the receipt has no certificate_digest")
    ;   \+ ( receipt_string_field(Receipt, test_id, TestId),
              get_dict(test_id, Certificate, CertificateTestId),
              atom_string(TestId, CertificateTestId) )
    ->  Result = rejected("the certificate is for another test")
    ;   \+ ( receipt_string_field(Receipt, kind, Kind),
              get_dict(kind, Certificate, CertificateKind),
              atom_string(Kind, CertificateKind) )
    ->  Result = rejected("the certificate kind is not the receipt kind")
    ;   receipt_string_field(Receipt, certificate_digest, Digest),
        code_certificate_digest(Certificate, Recomputed),
        \+ atom_string(Digest, Recomputed)
    ->  Result = rejected("the certificate no longer matches its certificate_digest")
    ;   code_certificate_check(Certificate, Check),
        Check = rejected(Reason)
    ->  Result = rejected(Reason)
    ;   Result = ok
    ).

receipt_string_field(Receipt, Field, Value) :-
    inventory_entry_field(Receipt, Field, RawValue),
    normalize_receipt_atom(RawValue, Value).

normalize_receipt_atom(^^(Value, _Type), Atom) :-
    !,
    normalize_receipt_atom(Value, Atom).
normalize_receipt_atom(literal(type(_, Value)), Atom) :-
    !,
    normalize_receipt_atom(Value, Atom).
normalize_receipt_atom(Value, Atom) :-
    string(Value),
    !,
    atom_string(Atom, Value).
normalize_receipt_atom(Value, Value) :-
    atom(Value),
    !.
normalize_receipt_atom(Value, Atom) :-
    term_string(Value, String),
    atom_string(Atom, String).

test_scope(Props, Scope) :-
    memberchk(verification_scope=RawScope, Props),
    !,
    normalize_atom(RawScope, Scope).
test_scope(Props, end_to_end) :-
    (memberchk(tags=Tags, Props), member(RawTag, Tags), normalize_atom(RawTag, Tag), downcase_atom(Tag, e2e)
    ; memberchk(source=RawSource, Props), normalize_atom(RawSource, Source), downcase_atom(Source, Lower), sub_atom(Lower, _, _, _, e2e)),
    !.
test_scope(_, unknown).

executable_symbol_stage([], _{status: blocked, symbols: [], missingTests: [], coordinates: []}, []).
executable_symbol_stage(PassingE2eTests, Stage, Symbols) :-
    PassingE2eTests \= [],
    findall(SymbolId,
        (member(TestId, PassingE2eTests),
         kb_relationship(executable_for, SymbolId, TestId),
         kb_entity(SymbolId, symbol, _)),
        Symbols0),
    sort(Symbols0, Symbols),
    include(test_missing_executable_symbol, PassingE2eTests, MissingTests),
    (MissingTests = [] -> Status = passed ; Status = missing),
    maplist(symbol_coordinate_ref, Symbols, Coordinates),
    Stage = _{status: Status, symbols: Symbols, missingTests: MissingTests, coordinates: Coordinates}.

test_missing_executable_symbol(TestId) :-
    \+ (kb_relationship(executable_for, SymbolId, TestId), kb_entity(SymbolId, symbol, _)).

production_symbol_stage(ReqId, PassingE2eTests, Stage, ProductionSymbols) :-
    findall(TestId,
        (kb_relationship(specified_by, ReqId, ScenarioId),
         scenario_test(ScenarioId, TestId)),
        ScenarioTests0),
    sort(ScenarioTests0, ScenarioTests),
    requirement_proof_context(Context),
    production_symbol_stage(ReqId, PassingE2eTests, ScenarioTests, [], Context, Stage, ProductionSymbols).

production_symbol_stage(ReqId, PassingE2eTests, ScenarioTests, ReceiptEvidence, Context, Stage, ProductionSymbols) :-
    production_symbol_sets(ReqId, Sets),
    production_symbol_stage_from_sets(ReqId, Sets, PassingE2eTests, ScenarioTests,
                                      ReceiptEvidence, Context, Stage, ProductionSymbols).

% The implementing symbols of a requirement, split into structural
% (type-shape with a unit-test contract) and production ones, with the
% production symbols' coordinates: all read from the KB alone.
production_symbol_sets(ReqId, symbol_sets(StructuralSymbols, ProductionSymbols, Coordinates)) :-
    findall(SymbolId,
        (kb_relationship(implements, SymbolId, ReqId),
         kb_entity(SymbolId, symbol, _),
         \+ kb:executable_test_symbol(SymbolId)),
        Implementing0),
    sort(Implementing0, ImplementingSymbols),
    include(type_shape_symbol_with_structural_contract, ImplementingSymbols, StructuralSymbols),
    exclude(type_shape_symbol_with_structural_contract, ImplementingSymbols, ProductionSymbols),
    maplist(symbol_coordinate_ref, ProductionSymbols, Coordinates).

production_symbol_stage_from_sets(ReqId, symbol_sets(StructuralSymbols, ProductionSymbols, Coordinates),
                                  PassingE2eTests, ScenarioTests, ReceiptEvidence, Context,
                                  Stage, ProductionSymbols) :-
    include(symbol_not_covered_by_tests(PassingE2eTests), ProductionSymbols, UncoveredProduction),
    structural_unit_receipts(StructuralSymbols, Context, UnitReceipts),
    exclude(structural_symbol_covered(PassingE2eTests, UnitReceipts), StructuralSymbols, UncoveredStructural),
    append(UncoveredProduction, UncoveredStructural, UncoveredSymbols),
    production_stage_status(ProductionSymbols, StructuralSymbols, PassingE2eTests,
                            UncoveredProduction, UncoveredStructural, Status, StatusReason),
    production_coverage_explanations(
        ReqId, ProductionSymbols, StructuralSymbols, UncoveredSymbols,
        PassingE2eTests, ScenarioTests, ReceiptEvidence, UnitReceipts-Context, Explanations),
    StageBase = _{
        status: Status,
        symbols: ProductionSymbols,
        structuralSymbols: StructuralSymbols,
        uncoveredSymbols: UncoveredSymbols,
        coordinates: Coordinates,
        explanations: Explanations
    },
    (   Status == passed
    ->  Stage = StageBase
    ;   put_dict(reason, StageBase, StatusReason, Stage)
    ).

type_shape_symbol_with_structural_contract(SymbolId) :-
    kb_entity(SymbolId, symbol, SymbolProps),
    memberchk(symbol_role=RawRole, SymbolProps),
    normalize_atom(RawRole, 'type-shape'),
    kb_relationship(covered_by, SymbolId, TestId),
    kb_entity(TestId, test, TestProps),
    test_scope(TestProps, unit),
    memberchk(status=RawStatus, TestProps),
    normalize_atom(RawStatus, Status),
    memberchk(Status, [active, passing]).

% implements REQ-kibi-conservative-requirement-proof
% A type-shape symbol is structurally covered by a unit test only while that
% test holds a current passing receipt: an authored status alone is a claim,
% not evidence. Receipt states are computed once per distinct unit test.
structural_unit_receipts(StructuralSymbols, Context, UnitReceipts) :-
    findall(TestId,
        (member(SymbolId, StructuralSymbols),
         kb_relationship(covered_by, SymbolId, TestId),
         structural_unit_contract_test(TestId)),
        TestIds0),
    sort(TestIds0, TestIds),
    findall(TestId-State,
        (member(TestId, TestIds),
         test_receipt_evidence(Context, [unit], TestId, Evidence),
         State = Evidence.state),
        UnitReceipts).

structural_symbol_covered(PassingE2eTests, _UnitReceipts, SymbolId) :-
    member(TestId, PassingE2eTests),
    kb_relationship(covered_by, SymbolId, TestId),
    !.
structural_symbol_covered(_PassingE2eTests, UnitReceipts, SymbolId) :-
    kb_relationship(covered_by, SymbolId, TestId),
    memberchk(TestId-passed, UnitReceipts),
    !.

% Stage status plus a typed reason, from a single total clause so status and
% reason can never disagree (a test project's stale-receipts case reported `blocked`
% with no indication that fresh receipts were the unblock). Clause order keeps
% the historical precedence: no production symbols at all is `missing` even
% when E2E evidence is also absent; only then does absent E2E evidence read
% as `blocked`.
production_stage_status(ProductionSymbols, StructuralSymbols, PassingE2eTests,
                        UncoveredProduction, UncoveredStructural, Status, Reason) :-
    (   ProductionSymbols == [],
        StructuralSymbols == []
    ->  Status = missing,
        Reason = "no production symbols implement this requirement; link at least one with implements"
    ;   PassingE2eTests == []
    ->  Status = blocked,
        Reason = "no passing E2E test evidence is available for the current snapshot; run kibi prove so this stage can evaluate production symbol coverage"
    ;   UncoveredProduction == [],
        UncoveredStructural == []
    ->  Status = passed
    ;   UncoveredStructural == []
    ->  Status = missing,
        length(UncoveredProduction, Count),
        format(atom(Reason), "~w production symbol(s) lack covered_by links to the passing E2E tests", [Count])
    ;   UncoveredProduction == []
    ->  Status = missing,
        length(UncoveredStructural, Count),
        format(atom(Reason), "~w type-shape symbol(s) lack a covered_by unit test with a current passing receipt; run kibi prove on those unit tests", [Count])
    ;   Status = missing,
        length(UncoveredProduction, ProductionCount),
        length(UncoveredStructural, StructuralCount),
        format(atom(Reason), "~w production symbol(s) lack covered_by links to the passing E2E tests and ~w type-shape symbol(s) lack a covered_by unit test with a current passing receipt", [ProductionCount, StructuralCount])
    ).

symbol_not_covered_by_tests(Tests, SymbolId) :-
    \+ (member(TestId, Tests), kb_relationship(covered_by, SymbolId, TestId)).

production_coverage_explanations(ReqId, ProductionSymbols, StructuralSymbols, UncoveredSymbols,
        PassingE2eTests, ScenarioTests, ReceiptEvidence, UnitReceipts-Context, Explanations) :-
    maplist(production_symbol_explanation(ReqId, UncoveredSymbols, PassingE2eTests, ScenarioTests, ReceiptEvidence, Context),
            ProductionSymbols, ProductionExplanations),
    maplist(structural_symbol_explanation(ReqId, UncoveredSymbols, PassingE2eTests, ScenarioTests, ReceiptEvidence, UnitReceipts-Context),
            StructuralSymbols, StructuralExplanations),
    append(ProductionExplanations, StructuralExplanations, Explanations).

structural_symbol_explanation(ReqId, UncoveredSymbols, PassingE2eTests, ScenarioTests, ReceiptEvidence, UnitReceipts-Context, SymbolId, Explanation) :-
    symbol_classification(SymbolId, Classification),
    symbol_coverage_candidates(structural(UnitReceipts), PassingE2eTests, ScenarioTests, ReceiptEvidence, Context, SymbolId, Candidates),
    (   memberchk(SymbolId, UncoveredSymbols)
    ->  Status = uncovered,
        Reason = structural_unit_receipt_not_current
    ;   Status = covered,
        Reason = structural_unit_contract
    ),
    explanation_reason_text(Reason, ReasonText),
    Explanation = _{
        symbolId: SymbolId,
        requirementId: ReqId,
        classification: Classification,
        status: Status,
        reason: Reason,
        reasonText: ReasonText,
        coverageCandidates: Candidates
    }.

production_symbol_explanation(ReqId, UncoveredSymbols, PassingE2eTests, ScenarioTests, ReceiptEvidence, Context, SymbolId, Explanation) :-
    symbol_classification(SymbolId, Classification),
    symbol_coverage_candidates(behavioral, PassingE2eTests, ScenarioTests, ReceiptEvidence, Context, SymbolId, Candidates),
    production_symbol_rollup(UncoveredSymbols, PassingE2eTests, SymbolId, Candidates, Status, Reason),
    explanation_reason_text(Reason, ReasonText),
    Explanation = _{
        symbolId: SymbolId,
        requirementId: ReqId,
        classification: Classification,
        status: Status,
        reason: Reason,
        reasonText: ReasonText,
        coverageCandidates: Candidates
    }.

production_symbol_rollup(_Uncovered, [], _SymbolId, _Candidates, uncovered, stage_blocked_no_passing_e2e) :-
    !.
production_symbol_rollup(UncoveredSymbols, _Passing, SymbolId, Candidates, uncovered, Reason) :-
    memberchk(SymbolId, UncoveredSymbols),
    !,
    (Candidates == [] -> Reason = covered_by_missing ; Reason = no_qualifying_e2e_coverage).
production_symbol_rollup(_Uncovered, _Passing, _SymbolId, _Candidates, covered, covered).

symbol_classification(SymbolId, Classification) :-
    kb_entity(SymbolId, symbol, Props),
    memberchk(symbol_role=RawRole, Props),
    normalize_atom(RawRole, Role),
    Role \= '',
    !,
    Classification = Role.
symbol_classification(_SymbolId, unknown).

symbol_coverage_candidates(Mode, PassingE2eTests, ScenarioTests, ReceiptEvidence, Context, SymbolId, Candidates) :-
    findall(TestId, kb_relationship(covered_by, SymbolId, TestId), TestIds0),
    sort(TestIds0, TestIds),
    maplist(coverage_candidate_dict(Mode, PassingE2eTests, ScenarioTests, ReceiptEvidence, Context), TestIds, Candidates).

coverage_candidate_dict(Mode, PassingE2eTests, ScenarioTests, ReceiptEvidence, Context, TestId, Candidate) :-
    coverage_candidate_qualification(Mode, PassingE2eTests, ScenarioTests, ReceiptEvidence, Context, TestId, Qualifies, Primary, Secondaries),
    explanation_reason_text(Primary, ReasonText),
    cheap_candidate_scope(TestId, Scope),
    reused_receipt_state(ReceiptEvidence, TestId, ReceiptState),
    CandidateBase = _{
        testId: TestId,
        relationship: covered_by,
        qualifies: Qualifies,
        reason: Primary,
        reasonText: ReasonText,
        secondaryReasons: Secondaries,
        scope: Scope
    },
    (   ReceiptState == none
    ->  Candidate = CandidateBase
    ;   put_dict(receiptState, CandidateBase, ReceiptState, Candidate)
    ).

% Shared candidate evaluator. Mode selects the coverage contract:
%   behavioral  — production symbols require passing scenario-backed E2E
%   structural  — type-shape symbols may also qualify via a unit contract
coverage_candidate_qualification(_Mode, PassingE2eTests, _ScenarioTests, _ReceiptEvidence, _Context, TestId, true, covered, []) :-
    memberchk(TestId, PassingE2eTests),
    !.
coverage_candidate_qualification(_Mode, _Passing, _Scenario, _Evidence, _Context, TestId, false, missing_test_entity, []) :-
    \+ kb_entity(TestId, test, _),
    !.
coverage_candidate_qualification(structural(UnitReceipts), _Passing, _Scenario, _Evidence, _Context, TestId, Qualifies, Primary, Secondaries) :-
    structural_unit_contract_test(TestId),
    !,
    (   memberchk(TestId-passed, UnitReceipts)
    ->  Qualifies = true,
        Primary = structural_unit_contract,
        Secondaries = []
    ;   Qualifies = false,
        Primary = structural_unit_receipt_not_current,
        (   memberchk(TestId-State, UnitReceipts)
        ->  unit_receipt_secondary(State, Secondaries)
        ;   Secondaries = []
        )
    ).
coverage_candidate_qualification(_Mode, _Passing, ScenarioTests, ReceiptEvidence, Context, TestId, false, Primary, Secondaries) :-
    cheap_scope_reject_reason(TestId, ScopeReason),
    (   \+ memberchk(TestId, ScenarioTests)
    ->  Primary = test_not_in_requirement_scenario_chain,
        maybe_singleton(ScopeReason, ScopeSecondaries),
        reused_receipt_reject_reasons(ReceiptEvidence, TestId, ReceiptSecondaries),
        append(ScopeSecondaries, ReceiptSecondaries, Secondaries)
    ;   ScopeReason \= none
    ->  Primary = ScopeReason,
        reused_receipt_reject_reasons(ReceiptEvidence, TestId, Secondaries)
    ;   receipt_reject_for_in_chain(ReceiptEvidence, Context, TestId, Primary, Secondaries)
    ).

unit_receipt_secondary(missing, [missing_proof_receipt]) :- !.
unit_receipt_secondary(stale, [stale_proof_receipt]) :- !.
unit_receipt_secondary(contract_mismatch, [receipt_contract_mismatch]) :- !.
unit_receipt_secondary(failed, [failed_proof_receipt]) :- !.
unit_receipt_secondary(invalid, [invalid_proof_receipt]) :- !.
unit_receipt_secondary(snapshot_unavailable, [proof_snapshot_unavailable]) :- !.
unit_receipt_secondary(_, []).

structural_unit_contract_test(TestId) :-
    kb_entity(TestId, test, TestProps),
    test_scope(TestProps, unit),
    memberchk(status=RawStatus, TestProps),
    normalize_atom(RawStatus, Status),
    memberchk(Status, [active, passing]).

cheap_candidate_scope(TestId, Scope) :-
    kb_entity(TestId, test, Props),
    !,
    test_scope(Props, Scope).
cheap_candidate_scope(_TestId, unknown).

cheap_scope_reject_reason(TestId, Reason) :-
    cheap_candidate_scope(TestId, Scope),
    scope_reject_reason(Scope, Reason).

scope_reject_reason(unit, test_scope_is_unit) :- !.
scope_reject_reason(end_to_end, none) :- !.
scope_reject_reason(_Scope, test_scope_is_non_e2e).

maybe_singleton(none, []) :- !.
maybe_singleton(Reason, [Reason]).

reused_receipt_state(Evidence, TestId, State) :-
    member(Item, Evidence),
    Item.testId == TestId,
    !,
    State = Item.state.
reused_receipt_state(_Evidence, _TestId, none).

reused_receipt_item(Evidence, TestId, Item) :-
    member(Item, Evidence),
    Item.testId == TestId,
    !.

reused_receipt_reject_reasons(Evidence, TestId, Reasons) :-
    reused_receipt_item(Evidence, TestId, Item),
    !,
    receipt_item_reject_reason(Item, Reason),
    maybe_singleton(Reason, Reasons).
reused_receipt_reject_reasons(_Evidence, _TestId, []).

receipt_reject_for_in_chain(Evidence, _Context, TestId, Primary, []) :-
    reused_receipt_item(Evidence, TestId, Item),
    !,
    receipt_item_reject_reason(Item, Reason),
    (Reason == none -> Primary = no_qualifying_e2e_coverage ; Primary = Reason).
receipt_reject_for_in_chain(_Evidence, Context, TestId, Primary, []) :-
    is_dict(Context),
    Context \= _{},
    test_receipt_evidence(Context, TestId, Evidence),
    !,
    receipt_item_reject_reason(Evidence, Reason),
    (Reason == none -> Primary = no_qualifying_e2e_coverage ; Primary = Reason).
receipt_reject_for_in_chain(_Evidence, _Context, _TestId, no_qualifying_e2e_coverage, []).

receipt_item_reject_reason(Item, stale_proof_receipt) :-
    Item.state == stale,
    get_dict(codeSnapshot, Item, _),
    !.
receipt_item_reject_reason(Item, receipt_snapshot_mismatch) :-
    Item.state == stale,
    !.
receipt_item_reject_reason(Item, Reason) :-
    receipt_state_reject_reason(Item.state, Reason).

receipt_state_reject_reason(missing, missing_proof_receipt) :- !.
receipt_state_reject_reason(snapshot_unavailable, proof_snapshot_unavailable) :- !.
receipt_state_reject_reason(contract_mismatch, receipt_contract_mismatch) :- !.
receipt_state_reject_reason(invalid, invalid_proof_receipt) :- !.
receipt_state_reject_reason(failed, failed_proof_receipt) :- !.
receipt_state_reject_reason(not_end_to_end, none) :- !.
receipt_state_reject_reason(stale, receipt_snapshot_mismatch) :- !.
receipt_state_reject_reason(passed, none) :- !.
receipt_state_reject_reason(none, none) :- !.
receipt_state_reject_reason(_, none).

explanation_reason_text(Reason, Text) :-
    explanation_reason_text_def(Reason, Text),
    !.
explanation_reason_text(Reason, Reason) :-
    atom(Reason).

explanation_reason_text_def(covered, "Qualifying covered_by to a passing scenario-backed E2E test").
explanation_reason_text_def(covered_by_missing, "No covered_by relationship to any test").
explanation_reason_text_def(no_qualifying_e2e_coverage, "covered_by relationships exist but none qualify as passing scenario-backed E2E coverage").
explanation_reason_text_def(structural_unit_contract, "type-shape symbol is satisfied by a unit structural contract").
explanation_reason_text_def(structural_unit_receipt_not_current, "type-shape symbol needs a covered_by unit test with a current passing receipt; run kibi prove on that unit test").
explanation_reason_text_def(executable_test, "Symbol is executable test code linked with executable_for").
explanation_reason_text_def(stage_blocked_no_passing_e2e, "Production coverage cannot be evaluated because no passing E2E evidence is available for the current snapshot").
explanation_reason_text_def(missing_test_entity, "covered_by target is not a test entity").
explanation_reason_text_def(test_not_in_requirement_scenario_chain, "Test is not in this requirement's scenario chain").
explanation_reason_text_def(test_scope_is_unit, "Test verification_scope is unit, which cannot cover behavioral production symbols").
explanation_reason_text_def(test_scope_is_non_e2e, "Test verification_scope is not end_to_end").
explanation_reason_text_def(proof_snapshot_unavailable, "Workspace snapshot is unavailable so receipt currency cannot be proven").
explanation_reason_text_def(missing_proof_receipt, "Scenario-backed E2E test has no kibi.proof-receipt.v1").
explanation_reason_text_def(receipt_snapshot_mismatch, "Receipts exist but none match the current snapshot or binding").
explanation_reason_text_def(stale_proof_receipt, "Current-snapshot receipt is older than the allowed proof age").
explanation_reason_text_def(receipt_contract_mismatch, "Receipt does not match the current proof contract hash or fingerprint").
explanation_reason_text_def(invalid_proof_receipt, "Receipt evidence is malformed or otherwise uncheckable").
explanation_reason_text_def(failed_proof_receipt, "Latest current receipt outcome is not passed").

test_resolution_record(TestId, _{
    testId: TestId,
    requiredProofs: RequiredProofs,
    executableFor: ExecutableFor
}) :-
    test_required_proof_refs(TestId, RequiredProofs),
    test_executable_for_refs(TestId, ExecutableFor).

test_required_proof_refs(TestId, Refs) :-
    kb_entity(TestId, test, Props),
    memberchk(proof_contract=RawContract, Props),
    proof_contract_dict(RawContract, Contract),
    contract_required_symbol_ids(Contract, SymbolIds),
    !,
    maplist(symbol_resolution_ref, SymbolIds, Refs).
test_required_proof_refs(_TestId, []).

contract_required_symbol_ids(Contract, SymbolIds) :-
    (   get_dict(required_proofs, Contract, Raw)
    ;   get_dict('required_proofs', Contract, Raw)
    ),
    !,
    inventory_entries(Raw, Entries),
    findall(SymbolId,
        (member(Entry, Entries), required_proof_entry_symbol(Entry, SymbolId)),
        SymbolIds0),
    sort(SymbolIds0, SymbolIds).
contract_required_symbol_ids(_, []).

required_proof_entry_symbol(Entry, SymbolId) :-
    (   inventory_entry_field(Entry, symbol_id, Raw)
    ;   inventory_entry_field(Entry, symbolId, Raw)
    ),
    normalize_atom(Raw, SymbolId),
    SymbolId \= ''.

test_executable_for_refs(TestId, Refs) :-
    findall(SymbolId,
        (kb_relationship(executable_for, SymbolId, TestId), kb_entity(SymbolId, symbol, _)),
        SymbolIds0),
    sort(SymbolIds0, SymbolIds),
    maplist(symbol_resolution_ref, SymbolIds, Refs).

symbol_resolution_ref(SymbolId, Ref) :-
    kb_entity(SymbolId, symbol, _),
    !,
    symbol_coordinate_ref(SymbolId, Coord),
    symbol_classification(SymbolId, Role),
    put_dict(_{role: Role, exists: true}, Coord, Ref).
symbol_resolution_ref(SymbolId, _{
    id: SymbolId,
    sourceFile: '',
    sourceLine: 0,
    sourceColumn: 0,
    sourceEndLine: 0,
    sourceEndColumn: 0,
    role: unresolved,
    exists: false
}).

source_coordinate_stage(ReqProps, ExecutableSymbols, ProductionSymbols, Stage) :-
    append(ExecutableSymbols, ProductionSymbols, Symbols0),
    sort(Symbols0, Symbols),
    include(symbol_missing_coordinates, Symbols, MissingSymbols),
    (   \+ nonempty_source(ReqProps)
    ->  Status = missing,
        RequirementSource = missing
    ;   RequirementSource = present,
        coordinate_stage_status(Symbols, MissingSymbols, Status)
    ),
    requirement_source_path(ReqProps, RequirementPath),
    maplist(symbol_coordinate_ref, Symbols, Coordinates),
    Stage = _{
        status: Status,
        requirementSource: RequirementSource,
        requirementPath: RequirementPath,
        symbols: Symbols,
        missingSymbols: MissingSymbols,
        coordinates: Coordinates
    }.

coordinate_stage_status([], _, blocked) :- !.
coordinate_stage_status(_, [], passed) :- !.
coordinate_stage_status(_, _, missing).

symbol_missing_coordinates(SymbolId) :-
    kb_entity(SymbolId, symbol, Props),
    \+ valid_symbol_coordinates(Props).

valid_symbol_coordinates(Props) :-
    memberchk(sourceFile=RawSourceFile, Props),
    source_path_atom(RawSourceFile, SourceFile),
    SourceFile \= '',
    memberchk(sourceLine=RawLine, Props),
    memberchk(sourceColumn=RawColumn, Props),
    memberchk(sourceEndLine=RawEndLine, Props),
    memberchk(sourceEndColumn=RawEndColumn, Props),
    normalize_integer(RawLine, Line),
    normalize_integer(RawColumn, Column),
    normalize_integer(RawEndLine, EndLine),
    normalize_integer(RawEndColumn, EndColumn),
    Line >= 1,
    Column >= 0,
    EndLine >= Line,
    EndColumn >= 0.

% Prefer sourceFile, then source, without URI-basename stripping. Paths must
% remain inspectable coordinates for report linking.
proof_source_property(Props, RawSource) :-
    memberchk(sourceFile=RawSource, Props),
    source_path_atom(RawSource, _),
    !.
proof_source_property(Props, RawSource) :-
    memberchk(source=RawSource, Props),
    source_path_atom(RawSource, _).

nonempty_source(Props) :-
    proof_source_property(Props, _).

requirement_source_path(Props, Path) :-
    proof_source_property(Props, RawSource),
    source_path_atom(RawSource, Path),
    !.
requirement_source_path(_, '').

entity_source_path(Id, Path) :-
    kb_entity(Id, _, Props),
    requirement_source_path(Props, Path).

entity_source_ref(Id, _{id: Id, path: Path}) :-
    entity_source_path(Id, Path).

ground_source_refs(Evidence, Refs) :-
    findall(Ref,
        (member(Item, Evidence),
         entity_source_ref(Item.factId, Ref),
         Ref.path \= ''),
        Refs0),
    sort(Refs0, Refs).

symbol_coordinate_ref(SymbolId, Ref) :-
    kb_entity(SymbolId, symbol, Props),
    memberchk(sourceFile=RawFile, Props),
    source_path_atom(RawFile, File),
    File \= '',
    !,
    (   valid_symbol_coordinates(Props)
    ->  memberchk(sourceLine=RawLine, Props),
        memberchk(sourceColumn=RawColumn, Props),
        memberchk(sourceEndLine=RawEndLine, Props),
        memberchk(sourceEndColumn=RawEndColumn, Props),
        normalize_integer(RawLine, Line),
        normalize_integer(RawColumn, Column),
        normalize_integer(RawEndLine, EndLine),
        normalize_integer(RawEndColumn, EndColumn),
        Ref = _{
            id: SymbolId,
            path: File,
            line: Line,
            column: Column,
            endLine: EndLine,
            endColumn: EndColumn
        }
    ;   Ref = _{id: SymbolId, path: File}
    ).
symbol_coordinate_ref(SymbolId, _{id: SymbolId, path: ''}).

proof_status(Stages, unresolved) :-
    Stages.contradictions.status == blocked,
    !.
proof_status(Stages, missing) :-
    stage_dict(Stages, Stage),
    Stage.status == missing,
    !.
proof_status(Stages, unresolved) :-
    stage_dict(Stages, Stage),
    memberchk(Stage.status, [unresolved, blocked]),
    !.
proof_status(_, tested).

% implements REQ-kibi-code-proof-kinds
% Scenario tests whose receipt claimed proved but whose certificate no
% longer re-checks, with the reason, so a drop to tested is never silent.
certificate_rejections(ScenarioTestStage, Context, Rejections) :-
    (   get_dict(obligations, ScenarioTestStage, Obligations)
    ->  true
    ;   Obligations = []
    ),
    findall(_{test: TestId, reason: Reason},
        (member(Obligation, Obligations),
         member(TestId, Obligation.tests),
         test_receipt_evidence(Context, [unit, integration, end_to_end], TestId, Evidence),
         get_dict(certificateRejection, Evidence, Reason)),
        Rejections0),
    sort(Rejections0, Rejections).

% implements REQ-kibi-claim-bound-proofs
%% receipt_claim_fields(+Receipt, +Evidence0, -Evidence)
% A certificate receipt keeps the certificate and the claim bindings Kibi
% recorded at ingest, so each claim can be judged against the current KB.
receipt_claim_fields(Receipt, Evidence0, Evidence) :-
    (   inventory_entry_field(Receipt, claim_bindings, RawBindings),
        inventory_entries(RawBindings, Bindings),
        Bindings \== []
    ->  Evidence1 = Evidence0.put(claimBindings, Bindings)
    ;   Evidence1 = Evidence0
    ),
    (   inventory_entry_field(Receipt, certificate, Certificate),
        is_dict(Certificate)
    ->  Evidence = Evidence1.put(certificate, Certificate)
    ;   Evidence = Evidence1
    ).

% implements REQ-kibi-claim-bound-proofs
%% claim_evidence(+ReqId, +Props, +Inventory, +ProofStatus, +ScenarioTestStage,
%%                +Context, -ClaimEvidence, -ProvedTests, -Rejections)
% One entry per semantic-inventory claim with the evidence level that claim
% has on its own.  A claim is proved only when the requirement is tested end
% to end and a fresh certificate whose obligation Kibi derived from the
% claim's grounding fact (binding derived, scope code) re-checks.  A
% certificate the author only attests to the claim leaves it tested.
% ProvedTests is non-empty, as TestId-Kind pairs, only when every applicable
% claim is proved; the requirement is proved exactly then.
claim_evidence(ReqId, Props, Inventory, ProofStatus, ScenarioTestStage, Context,
               ClaimEvidence, ProvedTests, Rejections) :-
    (   get_dict(tests, ScenarioTestStage, Tests) -> true ; Tests = [] ),
    (   ProofStatus == tested
    ->  findall(TestId-Evidence,
            (member(TestId, Tests),
             test_receipt_evidence(Context, [unit, integration, end_to_end], TestId, Evidence),
             get_dict(state, Evidence, passed),
             get_dict(claimBindings, Evidence, _)),
            BoundTests)
    ;   BoundTests = []
    ),
    intent_claim_level(Props, IntentLevel),
    maplist(claim_entry(ReqId, ProofStatus, IntentLevel, BoundTests), Inventory, Entries0),
    exclude(==(none), Entries0, ClaimEvidence),
    findall(R, (member(E, ClaimEvidence), get_dict(rejections, E, Rs), member(R, Rs)), Rejections0),
    sort(Rejections0, Rejections),
    include(applicable_claim, ClaimEvidence, Applicable),
    (   ProofStatus == tested,
        Applicable \== [],
        forall(member(E, Applicable), claim_level_is(proved, E))
    ->  findall(T-K,
            (member(E, Applicable), get_dict(bindings, E, Bs), member(B, Bs),
             get_dict(binding, B, derived), get_dict(test, B, T), get_dict(kind, B, K)),
            Pairs0),
        sort(Pairs0, ProvedTests)
    ;   ProvedTests = []
    ).

intent_claim_level(Props, Level) :-
    (   human_intent(Props, _, _) -> Level = asserted ; Level = unverified ).

applicable_claim(Entry) :- get_dict(applicable, Entry, true).

claim_level_is(Level, Entry) :- get_dict(level, Entry, Level).

claim_attested_only(Entry) :-
    \+ claim_level_is(proved, Entry),
    get_dict(bindings, Entry, Bindings),
    member(B, Bindings),
    get_dict(binding, B, attested),
    !.

claim_unresolved(Entry) :- get_dict(blocker, Entry, _).

claim_entry(ReqId, ProofStatus, IntentLevel, BoundTests, InventoryEntry, Entry) :-
    (   inventory_entry_field(InventoryEntry, claim_key, RawKey),
        normalize_atom(RawKey, Key)
    ->  inventory_entry_status(InventoryEntry, Status),
        (   inventory_entry_field(InventoryEntry, role, RawRole)
        ->  normalize_atom(RawRole, Role)
        ;   Role = ''
        ),
        Base = _{claimKey: Key, status: Status, role: Role},
        (   Status == nonlogical
        ->  Entry = Base.put(_{applicable: false, level: null, bindings: []})
        ;   Status \== modeled
        ->  Entry = Base.put(_{applicable: true, level: IntentLevel, bindings: [],
                               blocker: unresolved_semantic_proposition})
        ;   ProofStatus \== tested
        ->  Entry = Base.put(_{applicable: true, level: IntentLevel, bindings: []})
        ;   findall(Binding, test_claim_binding(ReqId, Key, BoundTests, Binding), Bindings0),
            sort(Bindings0, Bindings),
            include(binding_is(rejected), Bindings, RejectedBindings),
            maplist(binding_rejection(Key), RejectedBindings, Rejections),
            (   member(B, Bindings), get_dict(binding, B, derived), \+ get_dict(scope, B, intent)
            ->  Level = proved
            ;   Level = tested
            ),
            Entry0 = Base.put(_{applicable: true, level: Level, bindings: Bindings}),
            (   Rejections == []
            ->  Entry = Entry0
            ;   Entry = Entry0.put(rejections, Rejections)
            )
        )
    ;   Entry = none
    ).

binding_is(Expected, Binding) :- get_dict(binding, Binding, Expected).

binding_rejection(Key, Binding, _{test: Test, claimKey: Key, reason: Reason}) :-
    get_dict(test, Binding, Test),
    get_dict(reason, Binding, Reason).

% The binding one passed receipt records for this claim of this requirement,
% re-judged against the current KB.
test_claim_binding(ReqId, Key, BoundTests, Binding) :-
    member(TestId-Evidence, BoundTests),
    get_dict(claimBindings, Evidence, Recorded0),
    member(Recorded, Recorded0),
    inventory_entry_field(Recorded, claim_key, RawKey),
    normalize_atom(RawKey, Key),
    inventory_entry_field(Recorded, requirement_id, RawReq),
    normalize_atom(RawReq, ReqId),
    (   get_dict(kind, Evidence, Kind) -> true ; Kind = e2e ),
    judge_claim_binding(ReqId, Key, Kind, Evidence, Recorded, Verdict, Scope, Reason),
    Binding0 = _{test: TestId, kind: Kind, binding: Verdict, scope: Scope},
    (   Reason == ''
    ->  Binding = Binding0
    ;   Binding = Binding0.put(reason, Reason)
    ).

% judge_claim_binding(+ReqId, +Key, +Kind, +Evidence, +Recorded, -Verdict, -Scope, -Reason)
judge_claim_binding(ReqId, Key, Kind, Evidence, Recorded, Verdict, Scope, Reason) :-
    receipt_string_field(Recorded, binding, RecordedVerdict),
    (   receipt_string_field(Recorded, scope, Scope0) -> true ; Scope0 = code ),
    claim_obligation(ReqId-Key, Kind, Current),
    (   RecordedVerdict == rejected
    ->  Verdict = rejected, Scope = Scope0,
        (   receipt_string_field(Recorded, reason, Reason) -> true ; Reason = 'rejected at ingest' )
    ;   Current = unresolved(Reason0)
    ->  Verdict = rejected, Scope = Scope0, atom_string(Reason, Reason0)
    ;   Current = incompatible(_, Reason0)
    ->  Verdict = rejected, Scope = Scope0, atom_string(Reason, Reason0)
    ;   RecordedVerdict == attested
    ->  (   Current = attested(_)
        ->  Verdict = attested, Scope = Scope0, Reason = ''
        ;   Verdict = rejected, Scope = Scope0,
            Reason = 'the claim now has a derivable obligation; re-prove the test so Kibi can derive it'
        )
    ;   RecordedVerdict == derived,
        Current = obligation(FactId, Obligation)
    ->  Scope = Scope0,
        (   \+ ( receipt_string_field(Recorded, fact_id, RecordedFact), RecordedFact == FactId )
        ->  Verdict = rejected,
            format(atom(Reason), "~w is now grounded by ~w, not the fact the receipt was ingested against", [Key, FactId])
        ;   \+ ( inventory_entry_field(Recorded, obligation, RecordedObligation),
                 obligation_equal(RecordedObligation, Obligation) )
        ->  Verdict = rejected,
            format(atom(Reason), "~w changed since the receipt was ingested", [FactId])
        ;   \+ get_dict(evidenceLevel, Evidence, proved)
        ->  Verdict = rejected,
            Reason = 'the certificate does not re-check'
        ;   certificate_obligation_problem(Kind, Evidence, Obligation, Problem)
        ->  Verdict = rejected, Reason = Problem
        ;   Verdict = derived, Reason = ''
        )
    ;   Verdict = rejected, Scope = Scope0,
        Reason = 'the claim has no derivable obligation; re-prove the test'
    ).

% The part of a derived binding Kibi can re-check from the stored
% certificate alone (code-dependent parts were checked at ingest and stale
% with the receipt).
certificate_obligation_problem(exhaustive, Evidence, Obligation, Problem) :-
    get_dict(certificate, Evidence, Certificate),
    get_dict(domain, Certificate, Domain),
    get_dict(members, Domain, Raw),
    maplist([M, S]>>(atom(M) -> atom_string(M, S) ; S = M), Raw, Strings),
    sort(Strings, Members),
    \+ obligation_equal(Obligation, _{kind: "set_equals", members: Members}),
    Problem = 'the certificate domain is not the fact\'s set'.
certificate_obligation_problem(arithmetic, Evidence, Obligation, Problem) :-
    get_dict(certificate, Evidence, Certificate),
    (   get_dict(claim, Certificate, Claim),
        get_dict(operator, Claim, Op),
        get_dict(value, Claim, Value),
        get_dict(variable, Certificate, Variable),
        get_dict(value_type, Certificate, Type),
        obligation_equal(Obligation,
            _{kind: "numeric_constraint", variable: Variable, value_type: Type,
              operator: Op, value: Value})
    ->  fail
    ;   Problem = 'the certificate\'s claim is not the fact\'s constraint'
    ).

certificate_obligation_problem(Kind, Evidence, Obligation, Problem) :-
    memberchk(Kind, [rule, state_machine, source]),
    get_dict(certificate, Evidence, Certificate),
    model_check_obligation(Kind, Obligation, Certificate, problem(Problem0)),
    atom_string(Problem, Problem0).

%% claim_summary(+ClaimEvidence, -Summary, -UnprovedClaims)
claim_summary(ClaimEvidence, Summary, Unproved) :-
    include(applicable_claim, ClaimEvidence, Applicable),
    length(Applicable, ApplicableCount),
    count_claims(Applicable, claim_level_is(proved), Proved),
    count_claims(Applicable, claim_attested_only, Attested),
    count_claims(Applicable, claim_level_is(tested), Tested),
    count_claims(Applicable, claim_unresolved, Unresolved),
    Summary = _{applicable: ApplicableCount, proved: Proved, attested: Attested,
                tested: Tested, unresolved: Unresolved},
    findall(Key, (member(E, Applicable), \+ claim_level_is(proved, E), get_dict(claimKey, E, Key)), Unproved).

count_claims(Entries, Goal, Count) :-
    include(Goal, Entries, Matching),
    length(Matching, Count).

% implements REQ-kibi-evidence-levels, REQ-kibi-code-proof-kinds
%% requirement_evidence(+Props, +ProofStatus, +PassingE2eTests, +ProvedTests, -Level, -Evidence)
% How strong the evidence behind a requirement is, never stronger than what
% backs it.  Levels, strongest first: proved (the requirement is tested and
% every applicable claim is proved by a fresh certificate bound to it with a
% derived obligation: ProvedTests is non-empty), tested (passing E2E
% receipts cover every linked scenario: proofStatus tested), asserted (a
% person stands behind the statement but nothing current checks it),
% unverified (an agent wrote it and no person approved it).  Evidence lists
% what earned the level and anything weaker that also holds, each entry
% naming its kind and scope.
requirement_evidence(Props, ProofStatus, PassingE2eTests, ProvedTests, Level, Evidence) :-
    findall(Entry, evidence_entry(Props, ProofStatus, PassingE2eTests, ProvedTests, Entry), Evidence),
    evidence_level(Evidence, Level).

evidence_entry(_Props, tested, _PassingE2eTests, ProvedTests, _{kind: certificate, scope: code, level: proved, tests: Tests, kinds: Kinds}) :-
    ProvedTests \= [],
    pairs_keys_values(ProvedTests, Tests0, Kinds0),
    sort(Tests0, Tests),
    sort(Kinds0, Kinds).
evidence_entry(_Props, tested, PassingE2eTests, _ProvedTests, _{kind: e2e, scope: code, level: tested, tests: PassingE2eTests}).
evidence_entry(Props, _ProofStatus, _PassingE2eTests, _ProvedTests, Entry) :-
    human_intent(Props, Basis, Ref),
    (   Ref == ''
    ->  Entry = _{kind: human_intent, scope: intent, level: asserted, basis: Basis}
    ;   Entry = _{kind: human_intent, scope: intent, level: asserted, basis: Basis, ref: Ref}
    ).

evidence_level(Evidence, Level) :-
    (   member(Level0, [proved, tested, asserted]),
        member(Entry, Evidence),
        get_dict(level, Entry, Level0)
    ->  Level = Level0
    ;   Level = unverified
    ).

% implements REQ-kibi-evidence-floors
%% evidence_floor(+Props, +Level, +Gaps, +Stages, -Floor)
% The weakest evidence level the requirement accepts and whether its computed
% level reaches it.  The floor is the requirement's required_evidence, or,
% when absent, tested for a firm requirement and unverified (no floor)
% otherwise.  Status is met, below, or pending_reproof: the floor is tested
% and every gap only says recorded receipts are older than the code, so
% re-running kibi prove reaches it without any KB change.
evidence_floor(Props, Level, Gaps, Stages, _{required: Required, source: Source, status: Status}) :-
    required_evidence(Props, Required, Source),
    evidence_rank(Level, Have),
    evidence_rank(Required, Need),
    (   Have >= Need
    ->  Status = met
    ;   Required == tested,
        freshness_only_gaps(Gaps, Stages)
    ->  Status = pending_reproof
    ;   Status = below
    ).

required_evidence(Props, Required, explicit) :-
    memberchk(required_evidence=Raw, Props),
    normalize_atom(Raw, Required),
    evidence_rank(Required, _),
    !.
required_evidence(Props, tested, firmness) :-
    effective_firmness(Props, firm),
    !.
required_evidence(_Props, unverified, firmness).

evidence_rank(unverified, 0).
evidence_rank(asserted, 1).
evidence_rank(tested, 2).
evidence_rank(proved, 3).

% Gaps that only say the evidence is stale: kibi prove clears them.  Stale
% receipts also leave every production symbol uncovered; that gap is
% freshness-only when each uncovered symbol has a coverage candidate that
% qualifies or is rejected only for stale evidence.
freshness_gap(stale_proof_receipt).
freshness_gap(proof_contract_mismatch).

freshness_only_gaps(Gaps, Stages) :-
    include(freshness_gap, Gaps, [_|_]),
    exclude(freshness_gap, Gaps, Rest0),
    (   negative_path_freshness_only(Stages)
    ->  exclude(==(happy_path_only), Rest0, Rest1)
    ;   Rest1 = Rest0
    ),
    (   dimension_freshness_only(Stages)
    ->  exclude(==(dimension_unrepresented), Rest1, Rest)
    ;   Rest = Rest1
    ),
    (   Rest == []
    ->  true
    ;   Rest == [missing_production_symbol_coverage],
        production_coverage_freshness_only(Stages)
    ).

% The failure side is open only because certificate receipts that prove
% every open claim are stale.
negative_path_freshness_only(Stages) :-
    get_dict(negativePath, Stages, Stage),
    Stage.status == missing,
    Stage.claims \== [],
    subtract(Stage.claims, Stage.pendingReproofClaims, []).

% Every open quantified claim waits only on a stale certificate receipt.
dimension_freshness_only(Stages) :-
    get_dict(dimension, Stages, Stage),
    Stage.status == missing,
    findall(Key, (member(Claim, Stage.claims), get_dict(claimKey, Claim, Key)), Keys),
    Keys \== [],
    subtract(Keys, Stage.pendingReproofClaims, []).

production_coverage_freshness_only(Stages) :-
    Stage = Stages.productionSymbols,
    forall(member(SymbolId, Stage.uncoveredSymbols),
           (   member(Explanation, Stage.explanations),
               Explanation.symbolId == SymbolId,
               member(Candidate, Explanation.coverageCandidates),
               freshness_only_candidate(Candidate)
           )).

freshness_only_candidate(Candidate) :-
    Candidate.qualifies == true,
    !.
freshness_only_candidate(Candidate) :-
    Candidate.scope == unit,
    Candidate.reason == structural_unit_receipt_not_current,
    Candidate.secondaryReasons = [_|_],
    forall(member(Reason, Candidate.secondaryReasons),
           memberchk(Reason, [stale_proof_receipt, receipt_snapshot_mismatch, receipt_contract_mismatch])),
    !.
freshness_only_candidate(Candidate) :-
    Candidate.scope == end_to_end,
    forall(member(Reason, [Candidate.reason|Candidate.secondaryReasons]),
           memberchk(Reason, [stale_proof_receipt, receipt_snapshot_mismatch, receipt_contract_mismatch])).

%% human_intent(+Props, -Basis, -Ref)
% A person stands behind the requirement: someone approved it
% (origin.approved_by, the field agent-requirement-unapproved reads), or it
% reads as firm (firmness: firm, or no firmness and an origin other than
% agent, as for decision firmness).  The top-level approved_by approves an
% exception; an agent can write it, so on its own it approves nothing here.
human_intent(Props, approved, Ref) :-
    origin_field(Props, approved_by, _),
    !,
    intent_ref(Props, Ref).
human_intent(Props, firm, Ref) :-
    effective_firmness(Props, firm),
    !,
    intent_ref(Props, Ref).

effective_firmness(Props, Firmness) :-
    (   memberchk(firmness=Raw, Props),
        normalize_atom(Raw, Explicit),
        memberchk(Explicit, [firm, default, exploratory])
    ->  Firmness = Explicit
    ;   origin_field(Props, kind, agent)
    ->  Firmness = default
    ;   Firmness = firm
    ).

intent_ref(Props, Ref) :-
    (   origin_field(Props, ref, Ref0)
    ->  Ref = Ref0
    ;   prop_text(Props, approval_ref, Ref0)
    ->  Ref = Ref0
    ;   Ref = ''
    ).

prop_text(Props, Key, Text) :-
    Prop =.. [=, Key, Raw],
    memberchk(Prop, Props),
    normalize_atom(Raw, Text),
    Text \== ''.

origin_field(Props, Key, Value) :-
    memberchk(origin=Raw, Props),
    normalize_atom(Raw, Json),
    catch(atom_json_dict(Json, Origin, [value_string_as(atom)]), _, fail),
    get_dict(Key, Origin, Value0),
    normalize_atom(Value0, Value),
    Value \== ''.

stage_dict(Stages, Stage) :-
    dict_pairs(Stages, _, Pairs),
    member(_-Stage, Pairs).

proof_gaps(Stages, Gaps) :-
    proof_issues(Stages, Gaps, _).

proof_advisories(Stages, Advisories) :-
    proof_issues(Stages, _, Advisories).

% implements REQ-kibi-conservative-requirement-proof
% Every linked scenario is a mandatory proof obligation. Receipt-completeness
% failures therefore remain blocking even when another scenario has a passing
% receipt; unit/integration-only evidence stays nonblocking in the E2E lane.
% Invariant: proofStatus == tested implies proofGaps == [].
proof_issues(Stages, Gaps, Advisories) :-
    findall(Gap,
        (gap_definition(Gap, _, _, _),
         proof_gap_present(Gap, Stages),
         \+ proof_issue_advisory(Gap, Stages)),
        Gaps),
    findall(Gap,
        (gap_definition(Gap, _, _, _),
         proof_gap_present(Gap, Stages),
         proof_issue_advisory(Gap, Stages)),
        Advisories).

receipt_completeness_issue(missing_proof_receipt).
receipt_completeness_issue(stale_proof_receipt).
receipt_completeness_issue(failed_proof_receipt).
receipt_completeness_issue(invalid_proof_receipt).
receipt_completeness_issue(proof_contract_mismatch).

% Unknown scenario feasibility never blocks proof: it is surfaced as an
% advisory so it is not mistaken for a passed feasibility check.
proof_issue_advisory(unknown_scenario_feasibility, _Stages).

proof_gap_present(missing_semantic_inventory, Stages) :- Stages.semanticInventory.propositionCount =:= 0.
proof_gap_present(incomplete_semantic_inventory, Stages) :- Stages.semanticInventory.missingCount > 0.
proof_gap_present(malformed_semantic_inventory, Stages) :- Stages.semanticInventory.malformedCount > 0.
proof_gap_present(unresolved_semantic_proposition, Stages) :- Stages.semanticInventory.unresolvedCount > 0.
proof_gap_present(missing_logic_claims, Stages) :- Stages.logicGrounding.manifestClaims == [].
proof_gap_present(logic_manifest_mismatch, Stages) :-
    (Stages.logicGrounding.missingManifestClaims \= [] ; Stages.logicGrounding.extraManifestClaims \= [] ; Stages.logicGrounding.undeclaredGroundClaims \= []).
proof_gap_present(missing_logic_grounding, Stages) :- Stages.logicGrounding.missingGroundClaims \= [].
proof_gap_present(ambiguous_logic_grounding, Stages) :-
    (Stages.logicGrounding.duplicateGroundClaims \= [] ; Stages.logicGrounding.claimTextMismatchClaims \= [] ; Stages.logicGrounding.invalidGroundClaims \= [] ; Stages.logicGrounding.invalidRuleFacts \= []).
proof_gap_present(blocking_contradiction, Stages) :- Stages.contradictions.status == blocked.
proof_gap_present(contradiction_check_incomplete, Stages) :- Stages.contradictions.status == unresolved.
proof_gap_present(missing_scenario, Stages) :- Stages.scenarios.status == missing.
proof_gap_present(infeasible_scenario, Stages) :- Stages.scenarios.infeasibleScenarios \= [].
proof_gap_present(unknown_scenario_feasibility, Stages) :-
    get_dict(unknownFeasibility, Stages.scenarios, Unknown),
    Unknown \= [].
proof_gap_present(happy_path_only, Stages) :- Stages.negativePath.status == missing.
proof_gap_present(dimension_unrepresented, Stages) :- Stages.dimension.status == missing.
proof_gap_present(missing_scenario_test, Stages) :- memberchk(Stages.scenarios.status, [passed, blocked]), Stages.scenarioTests.status == missing.
proof_gap_present(missing_passing_e2e, Stages) :- Stages.passingE2e.status == missing.
proof_gap_present(missing_proof_receipt, Stages) :- Stages.passingE2e.missingReceiptTests \= [].
proof_gap_present(stale_proof_receipt, Stages) :- Stages.passingE2e.staleReceiptTests \= [].
proof_gap_present(failed_proof_receipt, Stages) :- Stages.passingE2e.failedReceiptTests \= [].
proof_gap_present(invalid_proof_receipt, Stages) :- Stages.passingE2e.invalidReceiptTests \= [].
proof_gap_present(proof_contract_mismatch, Stages) :- Stages.passingE2e.contractMismatchReceiptTests \= [].
proof_gap_present(proof_snapshot_unavailable, Stages) :- Stages.passingE2e.snapshotUnavailableTests \= [].
proof_gap_present(missing_executable_test_symbol, Stages) :- Stages.executableSymbols.status == missing.
proof_gap_present(missing_production_symbol, Stages) :-
    Stages.productionSymbols.symbols == [],
    Stages.productionSymbols.structuralSymbols == [].
proof_gap_present(missing_production_symbol_coverage, Stages) :- Stages.productionSymbols.uncoveredSymbols \= [].
proof_gap_present(missing_symbol_coordinates, Stages) :- Stages.sourceCoordinates.missingSymbols \= [].
proof_gap_present(missing_requirement_source, Stages) :- Stages.sourceCoordinates.requirementSource == missing.

gap_definition(missing_semantic_inventory, 10, semantic_inventory, "Run kb_semantic_advisor and persist its complete proposition ledger.").
gap_definition(incomplete_semantic_inventory, 11, semantic_inventory, "Classify every missing assertive span as modeled or explicitly unresolved.").
gap_definition(malformed_semantic_inventory, 12, semantic_inventory, "Restore claim provenance and valid UTF-8 spans for every proposition.").
gap_definition(unresolved_semantic_proposition, 20, semantic_inventory, "Resolve each ambiguity or ontology gap before claiming proof.").
gap_definition(missing_logic_claims, 30, logic_grounding, "Persist the stable claim-key manifest returned by semantic analysis.").
gap_definition(logic_manifest_mismatch, 31, logic_grounding, "Align the proposition ledger, logic_claims, and linked ground facts one-to-one.").
gap_definition(missing_logic_grounding, 32, logic_grounding, "Ground every modeled claim with one strict property, predicate, or safe rule fact.").
gap_definition(ambiguous_logic_grounding, 33, logic_grounding, "Remove duplicate or invalid ground representations and validate linked rules.").
gap_definition(blocking_contradiction, 40, contradictions, "Supersede or reconcile the conflicting normative requirement.").
gap_definition(contradiction_check_incomplete, 41, contradictions, "Complete logical grounding before interpreting absence of a conflict as evidence.").
gap_definition(unknown_scenario_feasibility, 49, scenarios, "Link the property values the success scenario relies on with assumes facts that a current requirement constrains, so its feasibility can be decided.").
gap_definition(missing_scenario, 50, scenarios, "Add a specified_by scenario for the requirement.").
gap_definition(infeasible_scenario, 49, scenarios, "Set expects: rejection on the scenario, correct its assumes fact, or record a human-approved exception requirement that exempts the forbidding requirement.").
gap_definition(dimension_unrepresented, 47, dimension, "Ground the quantified claim on what varies: an integer count or bound, a set of members, a rule over a variable, or a state machine. If the quantifier word ranges over nothing, record a dimension_waiver on the grounding fact for a person to approve.").
gap_definition(happy_path_only, 48, negative_path, "Add a scenario that expects rejection or error and assumes a value this requirement forbids, link it with specified_by, and verify it with a passing end-to-end test.").
gap_definition(missing_scenario_test, 51, scenario_tests, "Link the scenario to a test with verified_by or validates.").
gap_definition(missing_passing_e2e, 52, passing_e2e, "Record fresh passing end-to-end evidence on a scenario-backed test.").
gap_definition(missing_proof_receipt, 53, passing_e2e, "Run the configured proof integration through kibi prove and append its kibi.proof-receipt.v1 result for the scenario-backed proof-bearing test.").
gap_definition(stale_proof_receipt, 54, passing_e2e, "Re-run kibi prove against the current code snapshot and append fresh receipts.").
gap_definition(failed_proof_receipt, 55, passing_e2e, "Repair the failing proof obligation and append a newer passing receipt for the same snapshot.").
gap_definition(invalid_proof_receipt, 56, passing_e2e, "Repair malformed, future-dated, mismatched, or otherwise uncheckable receipt evidence.").
gap_definition(proof_contract_mismatch, 57, passing_e2e, "Run kibi prove so the receipt carries the current proof contract hash and execution fingerprint without rewriting historical evidence.").
gap_definition(proof_snapshot_unavailable, 58, passing_e2e, "Run coverage through a CLI or MCP runtime that exposes the deterministic workspace snapshot.").
gap_definition(missing_executable_test_symbol, 60, executable_symbols, "Link executable test code to every qualifying E2E test with executable_for.").
gap_definition(missing_production_symbol, 70, production_symbols, "Link at least one production symbol to the requirement with implements.").
gap_definition(missing_production_symbol_coverage, 71, production_symbols, "Link every runtime implementing production symbol to a qualifying E2E test with covered_by; type-shape symbols instead need a covered_by unit test with a current passing receipt.").
gap_definition(missing_symbol_coordinates, 80, source_coordinates, "Refresh and persist exact coordinates for every proof-bearing symbol.").
gap_definition(missing_requirement_source, 81, source_coordinates, "Bind the requirement to its current source document.").

proof_repairs(Gaps, Repairs) :-
    findall(_{gap: Gap, priority: Priority, stage: Stage, action: Action},
        (member(Gap, Gaps), gap_definition(Gap, Priority, Stage, Action)),
        Repairs).

normalize_atom(Value, Atom) :-
    kb:normalize_term_atom(Value, Atom).

source_path_atom(Value, Atom) :-
    kb:source_value_atom(Value, Atom),
    Atom \= ''.

normalize_atom_list(Value, Atoms) :-
    kb:normalize_term_atom_list(Value, Atoms).

normalize_integer(Value, Integer) :-
    (   Value = ^^(Inner, _)
    ->  normalize_integer(Inner, Integer)
    ;   integer(Value)
    ->  Integer = Value
    ;   atom(Value)
    ->  atom_number(Value, Integer)
    ;   string(Value)
    ->  number_string(Integer, Value)
    ).
