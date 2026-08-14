% Module: requirement_proof
% Conservative, inspectable proof outcomes for requirement coverage reports.

:- module(requirement_proof, [
    requirement_proof_context/1,
    requirement_proof_context/4,
    requirement_proof/4
]).

:- use_module(library(http/json)).
:- use_module(library(crypto)).
:- use_module(library(date)).
:- use_module(library(pcre)).
:- use_module('kb.pl').
:- use_module('checks.pl', [
    check_domain_contradictions/1,
    check_domain_contradiction_witnesses/1,
    check_rule_safety/1,
    check_rule_verifiability/1
]).
:- use_module('logic_ir.pl', [logic_rule_safety/2]).

proof_version('kibi.requirement-proof.v2').

requirement_proof_context(Context) :-
    requirement_proof_context(unknown, '1970-01-01T00:00:00Z', 604800, Context).

requirement_proof_context(VerificationSnapshot, CheckedAt, MaxAgeSeconds, Context) :-
    check_domain_contradictions(Contradictions),
    check_domain_contradiction_witnesses(ContradictionWitnesses),
    check_rule_safety(UnsafeRules),
    check_rule_verifiability(UnverifiableRules),
    normalize_atom(VerificationSnapshot, Snapshot),
    normalize_atom(CheckedAt, CheckedAtAtom),
    (catch(parse_time(CheckedAtAtom, CheckedAtStamp), _, fail) -> true ; CheckedAtStamp = -1),
    normalize_integer(MaxAgeSeconds, MaxAge),
    Context = _{
        contradictions: Contradictions,
        contradictionWitnesses: ContradictionWitnesses,
        unsafeRules: UnsafeRules,
        unverifiableRules: UnverifiableRules,
        verificationSnapshot: Snapshot,
        verificationCheckedAt: CheckedAtAtom,
        verificationCheckedAtStamp: CheckedAtStamp,
        verificationMaxAgeSeconds: MaxAge
    }.

requirement_proof(ReqId, _ReqProps, _Context, Proof) :-
    \+ kb:current_req(ReqId),
    !,
    proof_version(Version),
    Proof = _{
        proofVersion: Version,
        proofStatus: not_applicable,
        proofGaps: [],
        proofRepairs: [],
        proofStages: _{applicability: _{status: not_applicable}}
    }.
requirement_proof(ReqId, ReqProps, Context, Proof) :-
    semantic_inventory_stage(ReqProps, SemanticStage, Inventory),
    logic_grounding_stage(ReqId, ReqProps, Inventory, Context, LogicStage),
    contradiction_stage(ReqId, LogicStage.status, Context, ContradictionStage),
    scenario_stage(ReqId, ScenarioStage, ScenarioIds),
    scenario_test_stage(ScenarioIds, ScenarioTestStage, ScenarioTests),
    passing_e2e_stage(ScenarioTests, Context, PassingE2eStage, PassingE2eTests),
    executable_symbol_stage(PassingE2eTests, ExecutableStage, ExecutableSymbols),
    production_symbol_stage(ReqId, PassingE2eTests, ProductionStage, ProductionSymbols),
    source_coordinate_stage(ReqProps, ExecutableSymbols, ProductionSymbols, CoordinateStage),
    Stages = _{
        semanticInventory: SemanticStage,
        logicGrounding: LogicStage,
        contradictions: ContradictionStage,
        scenarios: ScenarioStage,
        scenarioTests: ScenarioTestStage,
        passingE2e: PassingE2eStage,
        executableSymbols: ExecutableStage,
        productionSymbols: ProductionStage,
        sourceCoordinates: CoordinateStage
    },
    proof_gaps(Stages, Gaps),
    proof_repairs(Gaps, Repairs),
    proof_status(Stages, Status),
    proof_version(Version),
    Proof = _{
        proofVersion: Version,
        proofStatus: Status,
        proofGaps: Gaps,
        proofRepairs: Repairs,
        proofStages: Stages
    }.

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

inventory_entries(Raw, Entries) :-
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
        invalidRuleFacts: InvalidRuleFactIds
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
         InventoryText \== Item.claimText),
        Keys0),
    sort(Keys0, Keys).

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
        (kb_relationship(specified_by, ReqId, ScenarioId), kb_entity(ScenarioId, scenario, _)),
        ScenarioIds0),
    sort(ScenarioIds0, ScenarioIds),
    (ScenarioIds = [] -> Status = missing ; Status = passed),
    Stage = _{status: Status, scenarios: ScenarioIds}.

scenario_test_stage(ScenarioIds, Stage, ScenarioTests) :-
    findall(TestId,
        (member(ScenarioId, ScenarioIds), scenario_test(ScenarioId, TestId)),
        ScenarioTests0),
    sort(ScenarioTests0, ScenarioTests),
    (ScenarioTests = [] -> Status = missing ; Status = passed),
    Stage = _{status: Status, tests: ScenarioTests}.

scenario_test(ScenarioId, TestId) :-
    kb_relationship(verified_by, ScenarioId, TestId),
    kb_entity(TestId, test, _).
scenario_test(ScenarioId, TestId) :-
    kb_relationship(validates, TestId, ScenarioId),
    kb_entity(TestId, test, _).

passing_e2e_stage(ScenarioTests, Context, Stage, PassingE2eTests) :-
    maplist(test_receipt_evidence(Context), ScenarioTests, Evidence),
    evidence_tests_with_state(Evidence, passed, PassingE2eTests),
    evidence_tests_with_state(Evidence, missing, MissingReceiptTests),
    evidence_tests_with_state(Evidence, stale, StaleReceiptTests),
    evidence_tests_with_state(Evidence, failed, FailedReceiptTests),
    evidence_tests_with_state(Evidence, invalid, InvalidReceiptTests),
    evidence_tests_with_state(Evidence, contract_mismatch, ContractMismatchReceiptTests),
    evidence_tests_with_state(Evidence, snapshot_unavailable, SnapshotUnavailableTests),
    evidence_tests_with_state(Evidence, not_end_to_end, NonEndToEndTests),
    passing_e2e_status(PassingE2eTests, InvalidReceiptTests, ContractMismatchReceiptTests, SnapshotUnavailableTests, Status),
    Stage = _{
        status: Status,
        tests: PassingE2eTests,
        receiptEvidence: Evidence,
        missingReceiptTests: MissingReceiptTests,
        staleReceiptTests: StaleReceiptTests,
        failedReceiptTests: FailedReceiptTests,
        invalidReceiptTests: InvalidReceiptTests,
        contractMismatchReceiptTests: ContractMismatchReceiptTests,
        snapshotUnavailableTests: SnapshotUnavailableTests,
        nonEndToEndTests: NonEndToEndTests,
        currentCodeSnapshot: Context.verificationSnapshot,
        checkedAt: Context.verificationCheckedAt,
        maxAgeSeconds: Context.verificationMaxAgeSeconds
    }.

passing_e2e_status(Passing, _, _, _, passed) :- Passing \= [], !.
passing_e2e_status([], Invalid, _, _, unresolved) :- Invalid \= [], !.
passing_e2e_status([], _, ContractMismatch, _, unresolved) :- ContractMismatch \= [], !.
passing_e2e_status([], _, _, SnapshotUnavailable, unresolved) :- SnapshotUnavailable \= [], !.
passing_e2e_status([], _, _, _, missing).

evidence_tests_with_state(Evidence, State, TestIds) :-
    findall(TestId,
        (member(Item, Evidence), Item.state == State, TestId = Item.testId),
        TestIds0),
    sort(TestIds0, TestIds).

test_receipt_evidence(Context, TestId, Evidence) :-
    kb_entity(TestId, test, Props),
    test_scope(Props, Scope),
    (   Scope \= end_to_end
    ->  Evidence = _{testId: TestId, state: not_end_to_end, scope: Scope}
    ;   Context.verificationSnapshot == unknown
    ->  Evidence = _{testId: TestId, state: snapshot_unavailable, scope: Scope}
    ;   verification_receipt_entries(Props, Receipts, ReceiptPropertyPresent),
        receipt_evidence_state(TestId, Scope, Props, Receipts, ReceiptPropertyPresent, Context, Evidence)
    ).

receipt_evidence_state(TestId, Scope, _Props, [], false, _Context,
        _{testId: TestId, state: missing, scope: Scope, receiptCount: 0}) :- !.
receipt_evidence_state(TestId, Scope, Props, Receipts, _Present, _Context,
        _{testId: TestId, state: invalid, scope: Scope, receiptCount: Count}) :-
    length(Receipts, Count),
    verification_contract_binding(Props, ContractBinding),
    (ContractBinding == invalid
    ; Receipts == []
    ; member(Receipt, Receipts), \+ valid_receipt_shape(TestId, Receipt)
    ; \+ chronological_receipt_history(Receipts)),
    !.
receipt_evidence_state(TestId, Scope, Props, Receipts, _Present, Context, Evidence) :-
    include(receipt_for_snapshot(Context.verificationSnapshot), Receipts, SnapshotReceipts),
    (   SnapshotReceipts == []
    ->  length(Receipts, Count),
        Evidence = _{testId: TestId, state: stale, scope: Scope, receiptCount: Count}
    ;   verification_contract_binding(Props, ContractBinding),
        include(receipt_matches_current_binding(Scope, ContractBinding), SnapshotReceipts, CurrentReceipts),
        (   CurrentReceipts == []
        ->  receipt_contract_mismatch_evidence(TestId, Scope, SnapshotReceipts, ContractBinding, Evidence)
        ;   latest_receipt(CurrentReceipts, Latest, FinishedStamp),
            receipt_runtime_state(Latest, FinishedStamp, Context, State, AgeSeconds),
            receipt_evidence_dict(TestId, Scope, Latest, State, AgeSeconds, Evidence)
        )
    ).

verification_receipt_entries(Props, Receipts, Present) :-
    (   memberchk(verification_receipts=Raw, Props)
    ->  Present = true,
        inventory_entries(Raw, Receipts)
    ;   Present = false,
        Receipts = []
    ).

valid_receipt_shape(TestId, Receipt) :-
    inventory_entry_field(Receipt, version, RawVersion),
    normalize_receipt_atom(RawVersion, Version),
    memberchk(Version, ['kibi.verification-receipt.v1', 'kibi.verification-receipt.v2']),
    inventory_entry_field(Receipt, receipt_id, RawReceiptId),
    normalize_receipt_atom(RawReceiptId, ReceiptId), valid_receipt_id(ReceiptId),
    inventory_entry_field(Receipt, test_id, RawTestId),
    normalize_receipt_atom(RawTestId, TestId),
    inventory_entry_field(Receipt, runner, RawRunner),
    normalize_receipt_atom(RawRunner, Runner), Runner \= '',
    inventory_entry_field(Receipt, command, RawCommand),
    normalize_receipt_atom(RawCommand, Command), Command \= '',
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
    receipt_timestamp(Receipt, started_at, StartedStamp),
    receipt_timestamp(Receipt, finished_at, FinishedStamp),
    FinishedStamp >= StartedStamp,
    valid_receipt_version_fields(Version, Receipt).

valid_receipt_version_fields('kibi.verification-receipt.v1', _Receipt).
valid_receipt_version_fields('kibi.verification-receipt.v2', Receipt) :-
    inventory_entry_field(Receipt, command_argv, RawCommandArgv),
    is_list(RawCommandArgv),
    RawCommandArgv \= [],
    maplist(nonempty_receipt_atom, RawCommandArgv),
    inventory_entry_field(Receipt, contract_hash, RawContractHash),
    normalize_receipt_atom(RawContractHash, ContractHash),
    valid_sha256(ContractHash),
    inventory_entry_field(Receipt, case_results, RawCases),
    is_list(RawCases),
    RawCases \= [],
    maplist(valid_receipt_case, RawCases),
    findall(Key,
        (member(Case, RawCases), receipt_case_key(Case, Key)), Keys),
    sort(Keys, UniqueKeys),
    length(Keys, KeyCount),
    length(UniqueKeys, KeyCount).

nonempty_receipt_atom(Value) :-
    normalize_receipt_atom(Value, Atom),
    Atom \= ''.

valid_receipt_case(Case) :-
    inventory_entry_field(Case, symbol_id, RawSymbolId),
    nonempty_receipt_atom(RawSymbolId),
    inventory_entry_field(Case, project, RawProject),
    nonempty_receipt_atom(RawProject),
    inventory_entry_field(Case, outcome, RawOutcome),
    normalize_receipt_atom(RawOutcome, Outcome),
    memberchk(Outcome, [passed, failed, timed_out, skipped, interrupted]),
    inventory_entry_field(Case, retries, Retries),
    normalize_integer(Retries, RetryCount),
    RetryCount >= 0,
    inventory_entry_field(Case, duration_ms, Duration),
    normalize_integer(Duration, DurationMs),
    DurationMs >= 0.

receipt_case_key(Case, Key) :-
    inventory_entry_field(Case, project, Project),
    inventory_entry_field(Case, symbol_id, SymbolId),
    normalize_receipt_atom(Project, ProjectAtom),
    normalize_receipt_atom(SymbolId, SymbolAtom),
    atomic_list_concat([ProjectAtom, SymbolAtom], '/', Key).

valid_sha256(Value) :-
    atom_length(Value, 64),
    atom_chars(Value, Chars),
    forall(member(Char, Chars), memberchk(Char, ['0','1','2','3','4','5','6','7','8','9',a,b,c,d,e,f])).

valid_receipt_id(Value) :-
    re_match('^VR-[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$', Value).

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

receipt_matches_current_binding(Scope, ContractBinding, Receipt) :-
    inventory_entry_field(Receipt, scope, RawScope),
    normalize_receipt_atom(RawScope, Scope),
    receipt_matches_current_contract(ContractBinding, Receipt).

receipt_matches_current_contract(none, _Receipt).
receipt_matches_current_contract(hash(ExpectedHash), Receipt) :-
    inventory_entry_field(Receipt, version, RawVersion),
    normalize_receipt_atom(RawVersion, 'kibi.verification-receipt.v2'),
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

verification_contract_binding(Props, Binding) :-
    (   memberchk(verification_contract=RawContract, Props)
    ->  (verification_contract_hash(RawContract, Hash) -> Binding = hash(Hash) ; Binding = invalid)
    ;   Binding = none
    ).

verification_contract_hash(RawContract, Hash) :-
    verification_contract_dict(RawContract, Contract),
    canonical_json_value(Contract, Canonical),
    crypto_data_hash(Canonical, Hash, [algorithm(sha256), encoding(utf8)]).

verification_contract_dict(^^(Value, _), Contract) :- !,
    verification_contract_dict(Value, Contract).
verification_contract_dict(literal(type(_, Value)), Contract) :- !,
    verification_contract_dict(Value, Contract).
verification_contract_dict(literal(Value), Contract) :- !,
    verification_contract_dict(Value, Contract).
verification_contract_dict(Contract, Contract) :-
    is_dict(Contract), !.
verification_contract_dict(Raw, Contract) :-
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
    AgeSeconds is Context.verificationCheckedAtStamp - FinishedStamp,
    AgeSeconds < -300,
    !.
receipt_runtime_state(_Receipt, FinishedStamp, Context, stale, AgeSeconds) :-
    AgeSeconds is Context.verificationCheckedAtStamp - FinishedStamp,
    AgeSeconds > Context.verificationMaxAgeSeconds,
    !.
receipt_runtime_state(Receipt, FinishedStamp, Context, State, AgeSeconds) :-
    AgeSeconds is Context.verificationCheckedAtStamp - FinishedStamp,
    inventory_entry_field(Receipt, outcome, RawOutcome),
    normalize_receipt_atom(RawOutcome, Outcome),
    (Outcome == passed -> State = passed ; State = failed).

receipt_evidence_dict(TestId, Scope, Receipt, State, AgeSeconds, Evidence) :-
    receipt_string_field(Receipt, receipt_id, ReceiptId),
    receipt_string_field(Receipt, runner, Runner),
    receipt_string_field(Receipt, command, Command),
    receipt_string_field(Receipt, outcome, Outcome),
    receipt_string_field(Receipt, code_snapshot, CodeSnapshot),
    receipt_string_field(Receipt, environment_hash, EnvironmentHash),
    receipt_string_field(Receipt, started_at, StartedAt),
    receipt_string_field(Receipt, finished_at, FinishedAt),
    receipt_string_field(Receipt, artifact_digest, ArtifactDigest),
    Evidence = _{
        testId: TestId,
        state: State,
        scope: Scope,
        receiptId: ReceiptId,
        runner: Runner,
        command: Command,
        outcome: Outcome,
        codeSnapshot: CodeSnapshot,
        environmentHash: EnvironmentHash,
        startedAt: StartedAt,
        finishedAt: FinishedAt,
        artifactDigest: ArtifactDigest,
        ageSeconds: AgeSeconds
    }.

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

executable_symbol_stage([], _{status: blocked, symbols: [], missingTests: []}, []).
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
    Stage = _{status: Status, symbols: Symbols, missingTests: MissingTests}.

test_missing_executable_symbol(TestId) :-
    \+ (kb_relationship(executable_for, SymbolId, TestId), kb_entity(SymbolId, symbol, _)).

production_symbol_stage(ReqId, PassingE2eTests, Stage, ProductionSymbols) :-
    findall(SymbolId,
        (kb_relationship(implements, SymbolId, ReqId),
         kb_entity(SymbolId, symbol, _),
         \+ kb:executable_test_symbol(SymbolId)),
        Production0),
    sort(Production0, ProductionSymbols),
    include(symbol_not_covered_by_tests(PassingE2eTests), ProductionSymbols, UncoveredSymbols),
    production_stage_status(ProductionSymbols, PassingE2eTests, UncoveredSymbols, Status),
    Stage = _{status: Status, symbols: ProductionSymbols, uncoveredSymbols: UncoveredSymbols}.

production_stage_status([], _, _, missing) :- !.
production_stage_status(_, [], _, blocked) :- !.
production_stage_status(_, _, [], passed) :- !.
production_stage_status(_, _, _, missing).

symbol_not_covered_by_tests(Tests, SymbolId) :-
    \+ (member(TestId, Tests), kb_relationship(covered_by, SymbolId, TestId)).

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
    Stage = _{
        status: Status,
        requirementSource: RequirementSource,
        symbols: Symbols,
        missingSymbols: MissingSymbols
    }.

coordinate_stage_status([], _, blocked) :- !.
coordinate_stage_status(_, [], passed) :- !.
coordinate_stage_status(_, _, missing).

symbol_missing_coordinates(SymbolId) :-
    kb_entity(SymbolId, symbol, Props),
    \+ valid_symbol_coordinates(Props).

valid_symbol_coordinates(Props) :-
    memberchk(sourceFile=RawSourceFile, Props),
    normalize_atom(RawSourceFile, SourceFile),
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

nonempty_source(Props) :-
    memberchk(source=RawSource, Props),
    normalize_atom(RawSource, Source),
    Source \= ''.

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
proof_status(_, proven).

stage_dict(Stages, Stage) :-
    dict_pairs(Stages, _, Pairs),
    member(_-Stage, Pairs).

proof_gaps(Stages, Gaps) :-
    findall(Gap, (gap_definition(Gap, _, _, _), proof_gap_present(Gap, Stages)), Gaps).

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
proof_gap_present(missing_scenario_test, Stages) :- Stages.scenarios.status == passed, Stages.scenarioTests.status == missing.
proof_gap_present(missing_passing_e2e, Stages) :- Stages.passingE2e.status == missing.
proof_gap_present(missing_verification_receipt, Stages) :- Stages.passingE2e.missingReceiptTests \= [].
proof_gap_present(stale_verification_receipt, Stages) :- Stages.passingE2e.staleReceiptTests \= [].
proof_gap_present(failed_verification_receipt, Stages) :- Stages.passingE2e.failedReceiptTests \= [].
proof_gap_present(invalid_verification_receipt, Stages) :- Stages.passingE2e.invalidReceiptTests \= [].
proof_gap_present(verification_contract_mismatch, Stages) :- Stages.passingE2e.contractMismatchReceiptTests \= [].
proof_gap_present(verification_snapshot_unavailable, Stages) :- Stages.passingE2e.snapshotUnavailableTests \= [].
proof_gap_present(missing_executable_test_symbol, Stages) :- Stages.executableSymbols.status == missing.
proof_gap_present(missing_production_symbol, Stages) :- Stages.productionSymbols.symbols == [].
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
gap_definition(missing_scenario, 50, scenarios, "Add a specified_by scenario for the requirement.").
gap_definition(missing_scenario_test, 51, scenario_tests, "Link the scenario to a test with verified_by or validates.").
gap_definition(missing_passing_e2e, 52, passing_e2e, "Record fresh passing end-to-end evidence on a scenario-backed test.").
gap_definition(missing_verification_receipt, 53, passing_e2e, "Run the exact current verification contract through kibi verify and append its kibi.verification-receipt.v2 result for the scenario-backed E2E test.").
gap_definition(stale_verification_receipt, 54, passing_e2e, "Re-run the E2E test against the current code snapshot and append its receipt.").
gap_definition(failed_verification_receipt, 55, passing_e2e, "Repair the failing E2E behavior and append a newer passing receipt for the same snapshot.").
gap_definition(invalid_verification_receipt, 56, passing_e2e, "Repair malformed, future-dated, mismatched, or otherwise uncheckable receipt evidence.").
gap_definition(verification_contract_mismatch, 57, passing_e2e, "Run the current verification contract and append its receipt without rewriting historical evidence.").
gap_definition(verification_snapshot_unavailable, 58, passing_e2e, "Run coverage through a CLI or MCP runtime that exposes the deterministic workspace snapshot.").
gap_definition(missing_executable_test_symbol, 60, executable_symbols, "Link executable test code to every qualifying E2E test with executable_for.").
gap_definition(missing_production_symbol, 70, production_symbols, "Link at least one production symbol to the requirement with implements.").
gap_definition(missing_production_symbol_coverage, 71, production_symbols, "Link every implementing production symbol to a qualifying E2E test with covered_by.").
gap_definition(missing_symbol_coordinates, 80, source_coordinates, "Refresh and persist exact coordinates for every proof-bearing symbol.").
gap_definition(missing_requirement_source, 81, source_coordinates, "Bind the requirement to its current source document.").

proof_repairs(Gaps, Repairs) :-
    findall(_{gap: Gap, priority: Priority, stage: Stage, action: Action},
        (member(Gap, Gaps), gap_definition(Gap, Priority, Stage, Action)),
        Repairs).

normalize_atom(Value, Atom) :-
    kb:normalize_term_atom(Value, Atom).

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
