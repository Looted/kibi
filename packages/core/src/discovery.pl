% Module: discovery
% Curated discovery, reporting, and bounded graph traversal predicates.

:- module(discovery, [
    find_gaps_json/8,
    coverage_report_json/7,
    coverage_report_json/10,
    coverage_report_json/11,
    coverage_report_json/12,
    coverage_report_json/13,
    coverage_evidence_json/5,
    evidence_floor_json/6,
    requirement_proof_json/5,
    requirement_proof_json/7,
    symbol_proof_json/7,
    test_receipt_states_json/6,
    graph_expand_json/8,
    search_answer_verdicts_json/2,
    ask_predicate_json/9,
    ask_property_json/6,
    ask_schemas_json/5,
    ask_fact_kind_json/4
]).

% Source contains non-ASCII text; do not depend on the host locale.
:- encoding(utf8).

:- use_module(library(http/json)).
:- use_module(library(aggregate)).
:- use_module(library(apply)).
:- use_module(library(lists)).
:- use_module(library(pairs)).
:- use_module('kb.pl').
:- use_module(library(semweb/rdf_db), [rdf_generation/1]).
:- use_module('requirement_proof.pl', [requirement_proof_context/1, requirement_proof_context/4, requirement_proof_context/6, requirement_proof/4, test_receipt_evidence/4]).
:- use_module('checks.pl', [scenario_feasibility_outcome/2, infeasible_scenario/5]).
:- use_module('logic_ir.pl', [logic_rule_conflict/3, logic_rule_conflict/4]).
:- use_module('status.pl', [status_meta_dict/1, status_scope_dict/1]).
:- use_module('../schema/relationships.pl', [relationship_type/1]).

find_gaps_json(TypeFilter, MissingRelationships, PresentRelationships, Tags, SourceFilter, Limit, Offset, JsonString) :-
    % One pass over the entities: every candidate carries whether it is a
    % provenance stub, so the rows and the stub count share the enumeration.
    findall(
        Row-Stub,
        matching_gap_candidate(TypeFilter, MissingRelationships, PresentRelationships, Tags, SourceFilter, Row, Stub),
        Candidates
    ),
    findall(Row, (member(Row-Stub, Candidates), gap_row_visible(Tags, Stub)), Rows0),
    sort_dict_rows(Rows0, SortedRows),
    paginate_rows(SortedRows, Offset, Limit, Rows),
    length(SortedRows, Count),
    % Provenance stubs that match the same filters are counted apart
    % (summary.provenanceStubs) whether or not the requested tags let them
    % into the rows, so a caller can tell "no gaps" from "only stubs".
    % implements REQ-bootstrap-provenance-stubs
    aggregate_all(count, member(_-true, Candidates), StubCount),
    Summary = _{total: Count, provenanceStubs: StubCount},
    status_meta_dict(Meta),
    Response = _{rows: Rows, count: Count, summary: Summary, meta: Meta},
    dict_json_string(Response, JsonString).

% A stub enters the rows only when the caller asked for its tag.
gap_row_visible(_Tags, false).
gap_row_visible(Tags, true) :-
    memberchk('bootstrap:provenance-stub', Tags).

coverage_report_json(By, Tags, IncludePassing, IncludeTransitive, Limit, Offset, JsonString) :-
    coverage_report_json(By, Tags, IncludePassing, IncludeTransitive, Limit, Offset, unknown, '1970-01-01T00:00:00Z', 604800, JsonString).

coverage_report_json(By, Tags, IncludePassing, IncludeTransitive, Limit, Offset, VerificationSnapshot, CheckedAt, MaxAgeSeconds, JsonString) :-
    coverage_report_json(By, Tags, IncludePassing, strict_snapshot, _{}, IncludeTransitive, Limit, Offset, VerificationSnapshot, CheckedAt, MaxAgeSeconds, JsonString).

requirement_proof_json(ReqId, VerificationSnapshot, CheckedAt, MaxAgeSeconds, JsonString) :-
    requirement_proof_json(ReqId, strict_snapshot, _{}, VerificationSnapshot, CheckedAt, MaxAgeSeconds, JsonString).

requirement_proof_json(ReqId, BindingMode, TestBindings, VerificationSnapshot, CheckedAt, MaxAgeSeconds, JsonString) :-
    requirement_proof_context(VerificationSnapshot, CheckedAt, MaxAgeSeconds, BindingMode, TestBindings, Context),
    kb_entity(ReqId, req, Props),
    requirement_proof(ReqId, Props, Context, Proof),
    put_dict(id, Proof, ReqId, ProofWithId),
    dict_json_string(ProofWithId, JsonString).

% implements REQ-kibi-verification-evidence-contract
% The receipt state of every proof-bearing test under the given binding, as
% `kibi prove --stale` selects them: passed means a current passing receipt.
test_receipt_states_json(BindingMode, TestBindings, VerificationSnapshot, CheckedAt, MaxAgeSeconds, JsonString) :-
    requirement_proof_context(VerificationSnapshot, CheckedAt, MaxAgeSeconds, BindingMode, TestBindings, Context),
    findall(TestId-State,
        (kb_entity(TestId, test, Props),
         memberchk(proof_contract=_, Props),
         test_receipt_evidence(Context, [unit, integration, end_to_end], TestId, Evidence),
         State = Evidence.state),
        Pairs0),
    sort(Pairs0, Pairs),
    dict_pairs(States, _, Pairs),
    dict_json_string(_{states: States}, JsonString).

symbol_proof_json(SymbolId, BindingMode, TestBindings, VerificationSnapshot, CheckedAt, MaxAgeSeconds, JsonString) :-
    requirement_proof_context(VerificationSnapshot, CheckedAt, MaxAgeSeconds, BindingMode, TestBindings, Context),
    kb_entity(SymbolId, symbol, _),
    findall(ReqId,
        (kb_relationship(implements, SymbolId, ReqId), kb_entity(ReqId, req, _)),
        ReqIds0),
    sort(ReqIds0, ReqIds),
    maplist(requirement_proof_with_id(Context), ReqIds, Proofs),
    symbol_explain_role(SymbolId, Role),
    (kb:executable_test_symbol(SymbolId) -> ExecutableTest = true ; ExecutableTest = false),
    findall(TestId, kb_relationship(executable_for, SymbolId, TestId), ExecutableFor0),
    sort(ExecutableFor0, ExecutableFor),
    findall(TestId, kb_relationship(covered_by, SymbolId, TestId), CoveredBy0),
    sort(CoveredBy0, CoveredBy),
    Response = _{
        id: SymbolId,
        symbolId: SymbolId,
        role: Role,
        executableTest: ExecutableTest,
        implementingRequirements: ReqIds,
        executableFor: ExecutableFor,
        coveredBy: CoveredBy,
        proofs: Proofs
    },
    dict_json_string(Response, JsonString).

requirement_proof_with_id(Context, ReqId, ProofWithId) :-
    kb_entity(ReqId, req, Props),
    requirement_proof(ReqId, Props, Context, Proof),
    put_dict(id, Proof, ReqId, ProofWithId).

symbol_explain_role(SymbolId, executable_test) :-
    kb:executable_test_symbol(SymbolId),
    !.
symbol_explain_role(SymbolId, Role) :-
    kb_entity(SymbolId, symbol, Props),
    memberchk(symbol_role=RawRole, Props),
    kb:normalize_term_atom(RawRole, Role),
    Role \= '',
    !.
symbol_explain_role(_SymbolId, unknown).

%% search_answer_verdicts_json(+ReqIds, -JsonString)
% implements REQ-kibi-search-answer-layer-v2
% What the existing checks report about the requirements a kb_search answer
% names, in one engine round trip and bounded to those requirements:
%   contradictions  strict-property and predicate witnesses from
%                   kb:req_conflict_witness/3, and rule witnesses from the
%                   pair generator and rule comparison the
%                   domain-contradictions check uses (disjoint pairs omitted)
%   scenarios       scenario_feasibility_outcome/2 of each scenario the
%                   requirement specifies
%   forbids         other scenarios infeasible_scenario/5 says it forbids
%   inventory       the semantic-inventory stage of the proof ladder, with
%                   the propositions still ambiguous or ontology gaps
% Whole-KB scans (check_domain_contradiction_witnesses/1) are deliberately
% not used: they take seconds on a large KB. The functional-predicate
% declarations a rule comparison reads are collected once per call rather
% than once per compared pair, which dominated the cost for requirements with
% many rules. A requirement whose checks raise an error reports that error
% instead of failing the answer. Scope names the snapshot the verdicts were
% computed from.
search_answer_verdicts_json(ReqIds, JsonString) :-
    search_answer_functional(Functional),
    maplist(search_answer_verdict(Functional), ReqIds, Verdicts),
    status_scope_dict(Scope),
    dict_json_string(_{requirements: Verdicts, scope: Scope}, JsonString).

% The declarations logic_rule_conflict/3 would read for every pair; when they
% cannot be read here, each comparison reads them itself.
search_answer_functional(some(Functional)) :-
    catch(logic_ir:functional_predicate_declarations(Functional), _, fail),
    !.
search_answer_functional(none).

search_answer_rule_status(some(Functional), RuleA, RuleB, Status) :-
    !,
    logic_rule_conflict(RuleA, RuleB, Functional, Status).
search_answer_rule_status(none, RuleA, RuleB, Status) :-
    logic_rule_conflict(RuleA, RuleB, Status).

search_answer_verdict(Functional, ReqId, Verdict) :-
    catch(search_answer_verdict_(Functional, ReqId, Verdict0), Error, true),
    (   var(Error)
    ->  Verdict = Verdict0
    ;   format(string(Text0), "~q", [Error]),
        search_answer_clip(Text0, 300, Text),
        Verdict = _{id: ReqId, error: Text}
    ).

search_answer_verdict_(Functional, ReqId, _{
    id: ReqId,
    contradictions: Contradictions,
    scenarios: Scenarios,
    forbids: Forbids,
    inventory: Inventory
}) :-
    findall(C, search_answer_contradiction(Functional, ReqId, C), Contradictions0),
    sort(Contradictions0, Contradictions),
    findall(S, search_answer_scenario_outcome(ReqId, S), Scenarios0),
    sort(Scenarios0, Scenarios),
    findall(F, search_answer_forbidden_scenario(ReqId, F), Forbids0),
    sort(Forbids0, Forbids),
    search_answer_inventory(ReqId, Inventory).

search_answer_contradiction(_Functional, ReqId, _{
    kind: Kind,
    status: Status,
    with: Other,
    facts: Facts,
    reason: Reason
}) :-
    (   req_conflict_witness(ReqId, Other, Witness)
    ;   req_conflict_witness(Other, ReqId, Witness)
    ),
    get_dict(kind, Witness, Kind),
    get_dict(status, Witness, Status),
    get_dict(reason, Witness, RawReason),
    search_answer_text(RawReason, Reason),
    findall(FactId,
        (   member(SideKey, [left, right]),
            get_dict(SideKey, Witness, Side),
            get_dict(factId, Side, FactId)
        ),
        Facts).
search_answer_contradiction(Functional, ReqId, _{
    kind: rule,
    status: Status,
    with: Other,
    facts: [FactA, FactB],
    reason: Reason
}) :-
    % The check orders each pair; compare it in that order and only then
    % orient the result towards ReqId.
    (   checks:opposing_rule_requirement_facts(ReqId, Other, FactA, FactB, RuleLeft, RuleRight),
        LeftReq = ReqId, RightReq = Other
    ;   checks:opposing_rule_requirement_facts(Other, ReqId, FactB, FactA, RuleLeft, RuleRight),
        LeftReq = Other, RightReq = ReqId
    ),
    search_answer_rule_status(Functional, RuleLeft, RuleRight, Status),
    Status \== disjoint,
    format(string(Reason), "Rule conflict (~w) between ~w and ~w", [Status, LeftReq, RightReq]).

search_answer_scenario_outcome(ReqId, Outcome) :-
    kb_relationship(specified_by, ReqId, ScenarioId),
    scenario_feasibility_outcome(ScenarioId, Result),
    search_answer_outcome(ScenarioId, Result, Outcome).

search_answer_outcome(ScenarioId, infeasible(witness(ReqIds, AssumedFacts, ReqFacts, RawReason)), _{
    scenario: ScenarioId,
    outcome: infeasible,
    requirement: ReqId,
    requirements: ReqIds,
    assumed: AssumedFacts,
    fact: ReqFacts,
    reason: Reason
}) :-
    !,
    ( ReqIds = [ReqId|_] -> true ; ReqId = '' ),
    search_answer_text(RawReason, Reason).
search_answer_outcome(ScenarioId, unknown(Reason), _{
    scenario: ScenarioId,
    outcome: unknown,
    reason: Reason,
    facts: []
}) :-
    atom(Reason),
    !.
search_answer_outcome(ScenarioId, unknown(Compound), _{
    scenario: ScenarioId,
    outcome: unknown,
    reason: Reason,
    facts: Ids
}) :-
    compound(Compound),
    Compound =.. [Reason, Ids0],
    is_list(Ids0),
    !,
    Ids = Ids0.
search_answer_outcome(ScenarioId, not_applicable(Compound), _{
    scenario: ScenarioId,
    outcome: not_applicable,
    reason: Reason,
    facts: Ids
}) :-
    compound(Compound),
    Compound =.. [Reason, Ids],
    is_list(Ids),
    !.
search_answer_outcome(ScenarioId, Result, _{scenario: ScenarioId, outcome: Outcome}) :-
    (   atom(Result)
    ->  Outcome = Result
    ;   format(atom(Outcome), "~q", [Result])
    ).

search_answer_forbidden_scenario(ReqId, _{
    scenario: ScenarioId,
    assumed: AssumedFacts,
    fact: ReqFacts,
    reason: Reason
}) :-
    infeasible_scenario(ScenarioId, ReqIds, AssumedFacts, ReqFacts, RawReason),
    memberchk(ReqId, ReqIds),
    \+ kb_relationship(specified_by, ReqId, ScenarioId),
    search_answer_text(RawReason, Reason).

search_answer_inventory(ReqId, _{
    status: Status,
    propositionCount: Count,
    unresolved: Unresolved
}) :-
    kb_entity(ReqId, req, Props),
    !,
    requirement_proof:semantic_inventory_stage(Props, Stage, Entries),
    get_dict(status, Stage, Status),
    get_dict(propositionCount, Stage, Count),
    findall(_{claim: Claim, status: EntryStatus},
        (   member(Entry, Entries),
            requirement_proof:inventory_entry_unresolved(Entry),
            requirement_proof:inventory_entry_status(Entry, EntryStatus),
            requirement_proof:inventory_entry_field(Entry, claim_text, RawClaim),
            search_answer_text(RawClaim, Claim0),
            search_answer_clip(Claim0, 300, Claim)
        ),
        Unresolved).
search_answer_inventory(_ReqId, _{status: unknown, propositionCount: 0, unresolved: []}).

search_answer_text(^^(Value, _Type), Text) :-
    !,
    search_answer_text(Value, Text).
search_answer_text(Value, Text) :-
    string(Value),
    !,
    Text = Value.
search_answer_text(Value, Text) :-
    atom(Value),
    !,
    atom_string(Value, Text).
search_answer_text(Value, Text) :-
    format(string(Text), "~w", [Value]).

search_answer_clip(Text, Max, Clipped) :-
    string_length(Text, Length),
    (   Length =< Max
    ->  Clipped = Text
    ;   Keep is Max - 1,
        sub_string(Text, 0, Keep, _, Prefix),
        string_concat(Prefix, "…", Clipped)
    ).

% Slim per-requirement proof evidence for quality diagnostics (W1 push-down).
% Projects only the fields the quality diagnostics consume - proof status,
% the passing-e2e stage summary, and receipt-related gap codes - instead of
% the full coverage row set, keeping the response small on large KBs.
coverage_evidence_json(Tags, VerificationSnapshot, CheckedAt, MaxAgeSeconds, JsonString) :-
    requirement_proof_context(VerificationSnapshot, CheckedAt, MaxAgeSeconds, ProofContext),
    findall(Evidence,
        (   kb_entity(Id, req, Props),
            matches_tags(Tags, Props),
            requirement_proof(Id, Props, ProofContext, Proof),
            coverage_evidence_row(Id, Proof, Evidence)
        ),
        Evidences),
    Response = _{rows: Evidences},
    dict_json_string(Response, JsonString).

% implements REQ-kibi-evidence-floors
% Every current requirement whose evidence level is below its floor, for the
% evidence-floor check rule: the rows that fail (status below) or that only
% need kibi prove re-run (status pending_reproof), plus how many current
% requirements were evaluated.  Requirements outside proof scope carry no
% floor.
evidence_floor_json(BindingMode, TestBindings, VerificationSnapshot, CheckedAt, MaxAgeSeconds, JsonString) :-
    requirement_proof_context(VerificationSnapshot, CheckedAt, MaxAgeSeconds, BindingMode, TestBindings, Context),
    findall(Id-Proof,
        (   kb_entity(Id, req, Props),
            requirement_proof(Id, Props, Context, Proof),
            get_dict(evidenceFloor, Proof, _)
        ),
        Evaluated),
    findall(Row,
        (   member(Id-Proof, Evaluated),
            Floor = Proof.evidenceFloor,
            Floor.status \== met,
            Row = _{
                id: Id,
                evidenceLevel: Proof.evidenceLevel,
                requiredEvidence: Floor.required,
                requiredEvidenceSource: Floor.source,
                status: Floor.status,
                proofStatus: Proof.proofStatus,
                proofGaps: Proof.proofGaps,
                gapDetails: Details
            },
            evidence_floor_gap_details(Proof, Details)
        ),
        Rows0),
    sort(id, @<, Rows0, Rows),
    length(Evaluated, Count),
    dict_json_string(_{evaluated: Count, rows: Rows}, JsonString).

% The entities behind an evidence-floor row's gaps, so a person sees what to
% fix without one kibi proof explain per requirement: the tests whose
% receipts are missing, stale, failed or invalid, the production symbols no
% qualifying test covers and the symbols without source coordinates.  Empty
% lists are left out.
evidence_floor_gap_details(Proof, Details) :-
    (   get_dict(proofStages, Proof, Stages)
    ->  true
    ;   Stages = _{}
    ),
    findall(Key-Ids,
        (   evidence_floor_gap_field(Key, StageKey, Field),
            get_dict(StageKey, Stages, Stage),
            get_dict(Field, Stage, Ids),
            Ids \== []
        ),
        Pairs),
    dict_pairs(Details, _, Pairs).

evidence_floor_gap_field(failedReceiptTests, passingE2e, failedReceiptTests).
evidence_floor_gap_field(missingReceiptTests, passingE2e, missingReceiptTests).
evidence_floor_gap_field(staleReceiptTests, passingE2e, staleReceiptTests).
evidence_floor_gap_field(invalidReceiptTests, passingE2e, invalidReceiptTests).
evidence_floor_gap_field(contractMismatchReceiptTests, passingE2e, contractMismatchReceiptTests).
evidence_floor_gap_field(uncoveredSymbols, productionSymbols, uncoveredSymbols).
evidence_floor_gap_field(missingCoordinateSymbols, sourceCoordinates, missingSymbols).

coverage_evidence_row(Id, Proof, Evidence) :-
    (   get_dict(proofStatus, Proof, ProofStatus)
    ->  true
    ;   ProofStatus = unknown
    ),
    (   get_dict(proofStages, Proof, Stages),
        get_dict(passingE2e, Stages, PassingE2e),
        get_dict(status, PassingE2e, PassingE2eStatus)
    ->  (   get_dict(tests, PassingE2e, PassingE2eTests)
        ->  true
        ;   PassingE2eTests = []
        )
    ;   PassingE2eStatus = unknown,
        PassingE2eTests = []
    ),
    (   get_dict(proofGaps, Proof, Gaps)
    ->  include(coverage_evidence_receipt_gap, Gaps, ReceiptGapCodes)
    ;   ReceiptGapCodes = []
    ),
    Evidence = _{
        id: Id,
        proofStatus: ProofStatus,
        passingE2eStatus: PassingE2eStatus,
        passingE2eTests: PassingE2eTests,
        receiptGapCodes: ReceiptGapCodes
    }.

coverage_evidence_receipt_gap(Gap) :-
    (   atom(Gap)
    ->  Atom = Gap
    ;   format(atom(Atom), "~w", [Gap])
    ),
    (   sub_atom(Atom, _, _, _, 'proof_receipt')
    ;   sub_atom(Atom, _, _, _, 'proof_contract')
    ;   sub_atom(Atom, _, _, _, 'proof_snapshot')
    ).

% Per-contract receipt binding (W2): BindingMode strict_snapshot | per_contract
% with TestBindings mapping TestId -> current binding hash.
coverage_report_json(By, Tags, IncludePassing, BindingMode, TestBindings, IncludeTransitive, Limit, Offset, VerificationSnapshot, CheckedAt, MaxAgeSeconds, JsonString) :-
    % Binding mode applies to requirement rows only; other By values keep
    % their snapshot-era arity so type/symbol reports are unchanged.
    memo_sorted_coverage(
        binding(By, Tags, IncludePassing, BindingMode, TestBindings, IncludeTransitive, VerificationSnapshot, CheckedAt, MaxAgeSeconds),
        binding_coverage_rows(By, Tags, IncludePassing, BindingMode, TestBindings, IncludeTransitive, VerificationSnapshot, CheckedAt, MaxAgeSeconds),
        SortedRows,
        Summary),
    paginate_rows(SortedRows, Offset, Limit, Rows),
    status_meta_dict(Meta),
    Response = _{summary: Summary, rows: Rows, meta: Meta},
    dict_json_string(Response, JsonString).

% implements REQ-kibi-conservative-requirement-proof
% Proof-status filtered report. The status filter selects requirement rows by
% proofStatus (tested, missing, unresolved, not_applicable) and replaces the
% default include-passing filtering, so callers can enumerate exactly one
% slice — e.g. every not_applicable row together with its typed applicability
% reason — without diffing full exports by hand. The summary is always
% computed over all rows so filtered responses keep whole-KB counts.
coverage_report_json(By, Tags, IncludePassing, StatusFilter, IncludeTransitive, Limit, Offset, VerificationSnapshot, CheckedAt, MaxAgeSeconds, JsonString) :-
    memo_sorted_coverage(
        status(By, Tags, IncludePassing, StatusFilter, IncludeTransitive, VerificationSnapshot, CheckedAt, MaxAgeSeconds),
        status_filtered_coverage_rows(By, Tags, IncludePassing, StatusFilter, IncludeTransitive, VerificationSnapshot, CheckedAt, MaxAgeSeconds),
        SortedRows,
        Summary),
    paginate_rows(SortedRows, Offset, Limit, Rows),
    status_meta_dict(Meta),
    Response = _{summary: Summary, rows: Rows, meta: Meta},
    dict_json_string(Response, JsonString).

% Proof-status filtered report with per-contract receipt binding: the same
% rows and whole-KB summary as the unfiltered report under that binding mode,
% so a status filter never judges receipts more strictly than kb_coverage,
% kibi proof explain or the evidence-floor rule do.
coverage_report_json(By, Tags, IncludePassing, StatusFilter, BindingMode, TestBindings, IncludeTransitive, Limit, Offset, VerificationSnapshot, CheckedAt, MaxAgeSeconds, JsonString) :-
    memo_sorted_coverage(
        status_binding(By, Tags, IncludePassing, StatusFilter, BindingMode, TestBindings, IncludeTransitive, VerificationSnapshot, CheckedAt, MaxAgeSeconds),
        status_binding_coverage_rows(By, Tags, IncludePassing, StatusFilter, BindingMode, TestBindings, IncludeTransitive, VerificationSnapshot, CheckedAt, MaxAgeSeconds),
        SortedRows,
        Summary),
    paginate_rows(SortedRows, Offset, Limit, Rows),
    status_meta_dict(Meta),
    Response = _{summary: Summary, rows: Rows, meta: Meta},
    dict_json_string(Response, JsonString).

status_binding_coverage_rows(req, Tags, _IncludePassing, StatusFilter, BindingMode, TestBindings, IncludeTransitive, VerificationSnapshot, CheckedAt, MaxAgeSeconds, MatchedRows, Summary) :-
    !,
    coverage_rows(req, Tags, true, IncludeTransitive, VerificationSnapshot, CheckedAt, MaxAgeSeconds, BindingMode, TestBindings, Rows0, Summary),
    include(req_row_proof_status_in(StatusFilter), Rows0, MatchedRows).
status_binding_coverage_rows(By, Tags, IncludePassing, StatusFilter, _BindingMode, _TestBindings, IncludeTransitive, VerificationSnapshot, CheckedAt, MaxAgeSeconds, Rows, Summary) :-
    status_filtered_coverage_rows(By, Tags, IncludePassing, StatusFilter, IncludeTransitive, VerificationSnapshot, CheckedAt, MaxAgeSeconds, Rows, Summary).

binding_coverage_rows(req, Tags, IncludePassing, BindingMode, TestBindings, IncludeTransitive, VerificationSnapshot, CheckedAt, MaxAgeSeconds, Rows, Summary) :-
    !,
    coverage_rows(req, Tags, IncludePassing, IncludeTransitive, VerificationSnapshot, CheckedAt, MaxAgeSeconds, BindingMode, TestBindings, Rows, Summary).
binding_coverage_rows(By, Tags, IncludePassing, _BindingMode, _TestBindings, IncludeTransitive, VerificationSnapshot, CheckedAt, MaxAgeSeconds, Rows, Summary) :-
    coverage_rows(By, Tags, IncludePassing, IncludeTransitive, VerificationSnapshot, CheckedAt, MaxAgeSeconds, Rows, Summary).

:- dynamic coverage_memo/3.

%% memo_sorted_coverage(+Args, :Compute, -SortedRows, -Summary)
% Large coverage reports are fetched in bounded pages so no single answer
% approaches the engine's output cap. Every page would otherwise recompute
% the whole report; keep the most recent sorted result for the exact
% arguments, graph, and RDF generation. Coverage reads only the store and its
% arguments, so the memo is invalidated by any store change.
memo_sorted_coverage(Args, Compute, SortedRows, Summary) :-
    (kb:kb_graph(Graph) -> true ; Graph = none),
    rdf_generation(Generation),
    Key = key(Args, Graph, Generation),
    (   coverage_memo(Stored, StoredRows, StoredSummary),
        Stored =@= Key
    ->  SortedRows = StoredRows,
        Summary = StoredSummary
    ;   call(Compute, Rows0, Summary),
        sort_dict_rows(Rows0, SortedRows),
        retractall(coverage_memo(_, _, _)),
        assertz(coverage_memo(Key, SortedRows, Summary))
    ).

status_filtered_coverage_rows(By, Tags, IncludePassing, [], IncludeTransitive, VerificationSnapshot, CheckedAt, MaxAgeSeconds, Rows, Summary) :-
    !,
    coverage_rows(By, Tags, IncludePassing, IncludeTransitive, VerificationSnapshot, CheckedAt, MaxAgeSeconds, Rows, Summary).
status_filtered_coverage_rows(req, Tags, _IncludePassing, StatusFilter, IncludeTransitive, VerificationSnapshot, CheckedAt, MaxAgeSeconds, MatchedRows, Summary) :-
    !,
    coverage_rows(req, Tags, true, IncludeTransitive, VerificationSnapshot, CheckedAt, MaxAgeSeconds, Rows0, Summary),
    include(req_row_proof_status_in(StatusFilter), Rows0, MatchedRows).
status_filtered_coverage_rows(By, Tags, _IncludePassing, _StatusFilter, IncludeTransitive, VerificationSnapshot, CheckedAt, MaxAgeSeconds, Rows, Summary) :-
    coverage_rows(By, Tags, true, IncludeTransitive, VerificationSnapshot, CheckedAt, MaxAgeSeconds, Rows, Summary).

req_row_proof_status_in(StatusFilter, Row) :-
    Status = Row.proofStatus,
    memberchk(Status, StatusFilter).

graph_expand_json(SeedIds, Relationships, Direction, Depth, EntityTypes, MaxNodes, MaxEdges, JsonString) :-
    sort(SeedIds, SeedSet),
    bfs_layers(SeedSet, SeedSet, [], Relationships, Direction, Depth, MaxNodes, MaxEdges, SeenNodes0, SeenEdges0, Truncated0),
    append(SeedSet, SeenNodes0, SeededNodes0),
    sort(SeededNodes0, SeenNodes),
    include(keep_entity_type(EntityTypes), SeenNodes, FilteredNodes0),
    sort(FilteredNodes0, FilteredNodes),
    include(edge_kept(FilteredNodes), SeenEdges0, FilteredEdges0),
    sort(FilteredEdges0, FilteredEdges),
    maplist(node_dict, FilteredNodes, Nodes),
    maplist(edge_dict, FilteredEdges, Edges),
    (   Truncated0
    ->  Truncated = true
    ;   Truncated = false
    ),
    status_meta_dict(Meta),
    Response = _{nodes: Nodes, edges: Edges, truncated: Truncated, meta: Meta},
    dict_json_string(Response, JsonString).

%% ask_predicate_json(+Namespace, +Name, +ArgSpec, +PolarityFilter, +Scope, +DistinctArg, +Limit, +Offset, -JsonString)
% Typed query over ontology predicate facts (fact_kind: predicate). Namespace
% `none` matches any namespace. ArgSpec is either a positional list of
% constants where the atom '$any' is a wildcard ([] matches any arguments),
% or where(Pairs) with Name=Value entries resolved through the predicate's
% declared argument names (schema or built-in signature). PolarityFilter is
% `none`, assert or deny; Scope `current_requirements` keeps only facts that a
% current requirement requires; DistinctArg names a declared argument whose
% distinct values are counted. Rows carry the effective allow/deny decision
% when the predicate is a decision predicate. An empty answer lists, per
% bound argument, the values that do exist (suggestions). Read-only.
% implements REQ-kibi-query-fact-filters
ask_predicate_json(Namespace, Name, ArgSpec, PolarityFilter, Scope, DistinctArg, Limit, Offset, JsonString) :-
    ask_namespace(Namespace, NamespaceMatch),
    % The schema lookup may bind a namespace; an unnamed namespace must keep
    % matching facts in every namespace, so the schema sees a copy.
    copy_term(NamespaceMatch, SchemaNamespace),
    ask_schema_dict(SchemaNamespace, Name, SchemaDict, ArgumentNames),
    ask_arg_pattern(ArgSpec, ArgumentNames, ArgPattern, PatternWarnings),
    (   PatternWarnings == []
    ->  findall(Row,
                ask_predicate_row(NamespaceMatch, Name, ArgPattern, PolarityFilter, Scope, ArgumentNames, Row),
                Rows0)
    ;   Rows0 = []
    ),
    sort_dict_rows(Rows0, SortedRows),
    length(SortedRows, Count),
    paginate_rows(SortedRows, Offset, Limit, Rows),
    ask_distinct(DistinctArg, ArgumentNames, SortedRows, Distinct, DistinctWarnings),
    append(PatternWarnings, DistinctWarnings, Warnings),
    ask_suggestions(Count, NamespaceMatch, Name, ArgSpec, ArgumentNames, Suggestions),
    ask_spec_json(ArgSpec, ArgPattern, SpecJson),
    ask_optional_atom(Namespace, NamespaceJson),
    status_meta_dict(Meta),
    Response = _{
        mode: predicate,
        predicate: _{namespace: NamespaceJson, name: Name, args: SpecJson},
        schema: SchemaDict,
        count: Count,
        rows: Rows,
        distinct: Distinct,
        suggestions: Suggestions,
        warnings: Warnings,
        meta: Meta
    },
    dict_json_string(Response, JsonString).

%% ask_arg_pattern(+ArgSpec, +ArgumentNames, -ArgPattern, -Warnings)
% A positional spec is used as is. A where(Pairs) spec becomes a positional
% pattern over the declared argument names; an undeclared name yields a
% warning that lists the declared names and no rows.
ask_arg_pattern(where(Pairs), ArgumentNames, ArgPattern, Warnings) :-
    !,
    (   is_list(ArgumentNames)
    ->  findall(Warning,
                (   member(Key=_, Pairs),
                    \+ memberchk(Key, ArgumentNames),
                    atomic_list_concat(ArgumentNames, ', ', Declared),
                    format(atom(Warning), "'~w' is not an argument of this predicate; declared arguments: ~w", [Key, Declared])
                ),
                Warnings),
        findall(Entry,
                (   member(ArgName, ArgumentNames),
                    (   memberchk(ArgName=Value, Pairs)
                    ->  Entry = Value
                    ;   Entry = '$any'
                    )
                ),
                ArgPattern)
    ;   Pairs == []
    ->  ArgPattern = [],
        Warnings = []
    ;   ArgPattern = [],
        Warnings = ["named arguments need a predicate schema; none declares this predicate, so pass positional args instead"]
    ).
ask_arg_pattern(ArgPattern, ArgumentNames, ArgPattern, Warnings) :-
    (   is_list(ArgumentNames),
        ArgPattern \== [],
        length(ArgPattern, Given),
        length(ArgumentNames, Arity),
        Given =\= Arity
    ->  format(atom(Warning), "positional args need one entry per argument (~w declared, ~w given); use null for any value or name them with where", [Arity, Given]),
        Warnings = [Warning]
    ;   Warnings = []
    ).

ask_spec_json(where(Pairs), _ArgPattern, Json) :-
    !,
    findall(Key-Value, member(Key=Value, Pairs), KeyValues),
    dict_pairs(Json, _, KeyValues).
ask_spec_json(_ArgSpec, ArgPattern, Json) :-
    ask_pattern_json(ArgPattern, Json).

%% ask_suggestions(+Count, +Namespace, +Name, +ArgSpec, +ArgumentNames, -Suggestions)
% When nothing matched a where(...) spec, list for each bound argument the
% values that do exist for this predicate so the caller can correct the
% question instead of reading "no results".
ask_suggestions(0, Namespace, Name, where(Pairs), ArgumentNames, Suggestions) :-
    is_list(ArgumentNames),
    Pairs \== [],
    findall(Key-Values,
            (   member(Key=_, Pairs),
                nth1(Position, ArgumentNames, Key),
                findall(Value,
                        (   kb:predicate_fact(_, Namespace, Name, Args, _),
                            nth1(Position, Args, Value)
                        ),
                        Values0),
                sort(Values0, Values)
            ),
            Entries),
    Entries \== [],
    !,
    dict_pairs(Suggestions, _, Entries).
ask_suggestions(_Count, _Namespace, _Name, _ArgSpec, _ArgumentNames, null).

ask_namespace(none, _) :- !.
ask_namespace(Namespace, Namespace).

ask_optional_atom(none, null) :- !.
ask_optional_atom(Atom, Atom).

ask_pattern_json([], []) :- !.
ask_pattern_json(Pattern, Json) :-
    maplist(ask_pattern_entry_json, Pattern, Json).

ask_pattern_entry_json('$any', null) :- !.
ask_pattern_entry_json(Value, Value).

% Arguments of a stored fact unify with the requested pattern; '$any' entries
% become fresh variables and an empty pattern accepts any arity.
ask_pattern_args([], _Args) :- !.
ask_pattern_args(Pattern, Args) :-
    maplist(ask_pattern_arg, Pattern, Args).

ask_pattern_arg('$any', _) :- !.
ask_pattern_arg(Value, Arg) :-
    kb:normalize_term_atom(Value, Arg).

ask_polarity_match(none, _) :- !.
ask_polarity_match(Polarity, Polarity).

% implements REQ-kibi-query-fact-filters
ask_predicate_row(Namespace, Name, ArgPattern, PolarityFilter, Scope, ArgumentNames, Row) :-
    kb:predicate_fact(FactId, Namespace, Name, Args, Polarity),
    ask_pattern_args(ArgPattern, Args),
    ask_polarity_match(PolarityFilter, Polarity),
    ask_fact_requirements(FactId, requires_predicate, Requirements, HasCurrent),
    ask_scope_match(Scope, HasCurrent),
    ask_fact_text(FactId, Title, Status, ClaimText, CanonicalKey),
    ask_named_arguments(ArgumentNames, Args, NamedArguments),
    ask_effect(Namespace, Name, Args, Polarity, Effect),
    Row = _{
        id: FactId,
        type: fact,
        title: Title,
        status: Status,
        namespace: Namespace,
        name: Name,
        args: Args,
        arguments: NamedArguments,
        polarity: Polarity,
        effect: Effect,
        canonicalKey: CanonicalKey,
        claimText: ClaimText,
        requirements: Requirements
    }.

ask_scope_match(current_requirements, true) :- !.
ask_scope_match(current_requirements, _) :- !, fail.
ask_scope_match(_Scope, _HasCurrent).

%% ask_fact_requirements(+FactId, +Relationship, -Requirements, -HasCurrent)
% Requirements linked to the fact through Relationship, each with whether it
% is current (kb:current_req/1); HasCurrent is true when at least one is.
ask_fact_requirements(FactId, Relationship, Requirements, HasCurrent) :-
    findall(ReqId, kb_relationship(Relationship, ReqId, FactId), ReqIds0),
    sort(ReqIds0, ReqIds),
    maplist(ask_requirement_dict, ReqIds, Requirements),
    (   member(Dict, Requirements), Dict.current == true
    ->  HasCurrent = true
    ;   HasCurrent = false
    ).

ask_requirement_dict(ReqId, _{id: ReqId, status: Status, current: Current}) :-
    (   kb_entity(ReqId, req, Props), memberchk(status=StatusRaw, Props)
    ->  source_value_atom(StatusRaw, Status)
    ;   Status = ''
    ),
    (   kb:current_req(ReqId) -> Current = true ; Current = false ).

ask_fact_text(FactId, Title, Status, ClaimText, CanonicalKey) :-
    kb_entity(FactId, fact, Props),
    (   memberchk(title=TitleRaw, Props) -> source_value_atom(TitleRaw, Title) ; Title = '' ),
    (   memberchk(status=StatusRaw, Props) -> source_value_atom(StatusRaw, Status) ; Status = '' ),
    (   memberchk(claim_text=ClaimRaw, Props) -> source_value_atom(ClaimRaw, ClaimText) ; ClaimText = '' ),
    (   memberchk(canonical_key=KeyRaw, Props) -> source_value_atom(KeyRaw, CanonicalKey) ; CanonicalKey = '' ).

% Named arguments follow the schema when it exists and has the same arity;
% otherwise the row carries only the positional list.
ask_named_arguments(ArgumentNames, Args, Named) :-
    is_list(ArgumentNames),
    same_length(ArgumentNames, Args),
    !,
    pairs_keys_values(Pairs, ArgumentNames, Args),
    dict_pairs(Named, _, Pairs).
ask_named_arguments(_ArgumentNames, _Args, null).

% The effective allow/deny decision of a decision predicate (a schema with
% key_arguments and a decision argument, or the built-in permission_rule).
ask_effect(Namespace, Name, Args, Polarity, Effect) :-
    length(Args, Arity),
    kb:decision_predicate(Namespace, Name, Arity, _KeyPositions, DecisionPosition),
    nth1(DecisionPosition, Args, Decision),
    kb:effective_decision(Decision, Polarity, Effect0),
    !,
    Effect = Effect0.
ask_effect(_Namespace, _Name, _Args, _Polarity, null).

%% ask_schema_dict(?Namespace, +Name, -SchemaDict, -ArgumentNames)
% The project predicate_schema for the predicate, the built-in decision
% signature, or null when neither exists.
ask_schema_dict(Namespace, Name, SchemaDict, ArgumentNames) :-
    kb:predicate_schema(SchemaId, Namespace, Name, Arity, ArgumentNames, ArgumentTypes),
    !,
    ask_schema_row(SchemaId, Namespace, Name, Arity, ArgumentNames, ArgumentTypes, SchemaDict).
ask_schema_dict(Namespace, Name, SchemaDict, ArgumentNames) :-
    kb:builtin_decision_predicate(Namespace, Name, Arity, KeyPositions, DecisionPosition),
    !,
    ask_builtin_schema_row(Namespace, Name, Arity, KeyPositions, DecisionPosition, SchemaDict),
    ArgumentNames = SchemaDict.argumentNames.
ask_schema_dict(_Namespace, _Name, null, none).

% A built-in row carries the catalog id that kb_model accepts as schemaId;
% `stored: false` says no entity with that id exists, so it is not a
% kb_query id.
ask_builtin_schema_row(Namespace, Name, Arity, KeyPositions, DecisionPosition, Row) :-
    kb:builtin_predicate_signature(Name, SchemaId, Names),
    findall(Key, (member(P, KeyPositions), nth1(P, Names, Key)), KeyArguments),
    nth1(DecisionPosition, Names, DecisionArgument),
    aggregate_all(count, kb:predicate_fact(_, Namespace, Name, _, _), FactCount),
    Row = _{
        id: SchemaId,
        builtin: true,
        stored: false,
        namespace: Namespace,
        name: Name,
        arity: Arity,
        argumentNames: Names,
        argumentTypes: Names,
        keyArguments: KeyArguments,
        decisionArgument: DecisionArgument,
        argumentConstants: null,
        examples: [],
        factCount: FactCount
    }.

ask_schema_row(SchemaId, Namespace, Name, Arity, ArgumentNames, ArgumentTypes, Row) :-
    kb_entity(SchemaId, fact, Props),
    (   memberchk(key_arguments=KeysRaw, Props)
    ->  kb:normalize_term_atom_list(KeysRaw, KeyArguments)
    ;   KeyArguments = []
    ),
    (   kb:decision_predicate(Namespace, Name, Arity, _, DecisionPosition),
        nth1(DecisionPosition, ArgumentNames, DecisionArgument0)
    ->  DecisionArgument = DecisionArgument0
    ;   DecisionArgument = null
    ),
    (   memberchk(argument_constants=ConstantsRaw, Props),
        ask_json_value(ConstantsRaw, Constants0)
    ->  Constants = Constants0
    ;   Constants = null
    ),
    (   memberchk(examples=ExamplesRaw, Props), is_list(ExamplesRaw)
    ->  maplist(source_value_atom, ExamplesRaw, Examples)
    ;   Examples = []
    ),
    aggregate_all(count, kb:predicate_fact(_, Namespace, Name, _, _), FactCount),
    Row = _{
        id: SchemaId,
        builtin: false,
        stored: true,
        namespace: Namespace,
        name: Name,
        arity: Arity,
        argumentNames: ArgumentNames,
        argumentTypes: ArgumentTypes,
        keyArguments: KeyArguments,
        decisionArgument: DecisionArgument,
        argumentConstants: Constants,
        examples: Examples,
        factCount: FactCount
    }.

ask_json_value(^^(Value, _Type), Parsed) :- !, ask_json_value(Value, Parsed).
ask_json_value(literal(Value), Parsed) :- !, ask_json_value(Value, Parsed).
ask_json_value(Dict, Dict) :- is_dict(Dict), !.
ask_json_value(Raw, Parsed) :-
    (atom(Raw) ; string(Raw)),
    catch(atom_json_dict(Raw, Parsed, [value_string_as(string)]), _, fail).

%% ask_distinct(+DistinctArg, +ArgumentNames, +Rows, -Distinct, -Warnings)
ask_distinct(none, _ArgumentNames, _Rows, null, []) :- !.
ask_distinct(DistinctArg, ArgumentNames, Rows, Distinct, []) :-
    is_list(ArgumentNames),
    nth1(Position, ArgumentNames, DistinctArg),
    !,
    findall(Value, (member(Row, Rows), nth1(Position, Row.args, Value)), Values0),
    msort(Values0, Values),
    clumped(Values, Clumps),
    findall(_{value: Value, count: Count}, member(Value-Count, Clumps), Entries),
    Distinct = _{argument: DistinctArg, values: Entries}.
ask_distinct(DistinctArg, _ArgumentNames, _Rows, null, [Warning]) :-
    format(atom(Warning), "distinct argument '~w' is not a declared argument of this predicate; no schema names it", [DistinctArg]).

%% ask_property_json(+SubjectKey, +PropertyKey, +Scope, +Limit, +Offset, -JsonString)
% Typed query over strict property_value facts of one subject key.
% PropertyKey `none` matches every property of the subject.
% implements REQ-kibi-query-fact-filters
ask_property_json(SubjectKey, PropertyKey, Scope, Limit, Offset, JsonString) :-
    kb:normalize_term_atom(SubjectKey, Subject),
    ask_namespace(PropertyKey, PropertyMatch),
    findall(Row, ask_property_row(Subject, PropertyMatch, Scope, Row), Rows0),
    sort_dict_rows(Rows0, SortedRows),
    length(SortedRows, Count),
    paginate_rows(SortedRows, Offset, Limit, Rows),
    findall(SubjectId, kb:fact_subject_key(SubjectId, Subject), SubjectIds0),
    sort(SubjectIds0, SubjectIds),
    ask_optional_atom(PropertyKey, PropertyJson),
    status_meta_dict(Meta),
    Response = _{
        mode: property,
        property: _{subjectKey: Subject, propertyKey: PropertyJson},
        subjectFacts: SubjectIds,
        count: Count,
        rows: Rows,
        warnings: [],
        meta: Meta
    },
    dict_json_string(Response, JsonString).

ask_property_row(Subject, PropertyMatch, Scope, Row) :-
    kb:fact_property_tuple(FactId, Subject, Property, Op, ValType, Value, Unit, PropScope, Polarity),
    (   PropertyMatch == Property -> true ; var(PropertyMatch) ),
    ask_fact_requirements(FactId, requires_property, Requirements, HasCurrent),
    ask_scope_match(Scope, HasCurrent),
    ask_fact_text(FactId, Title, Status, ClaimText, CanonicalKey),
    ask_property_value_json(Value, ValueJson),
    Row = _{
        id: FactId,
        type: fact,
        title: Title,
        status: Status,
        subjectKey: Subject,
        propertyKey: Property,
        operator: Op,
        valueType: ValType,
        value: ValueJson,
        unit: Unit,
        scope: PropScope,
        polarity: Polarity,
        canonicalKey: CanonicalKey,
        claimText: ClaimText,
        requirements: Requirements
    }.

ask_property_value_json(Value, Value) :- number(Value), !.
ask_property_value_json(Value, Json) :- source_value_atom(Value, Json).

%% ask_schemas_json(+Namespace, +Name, +Limit, +Offset, -JsonString)
% Catalog of the predicates an agent can ask about: every project
% predicate_schema fact plus built-in decision predicates without a project
% schema, with argument names, constants, key arguments and fact counts.
% implements REQ-kibi-query-fact-filters
ask_schemas_json(Namespace, Name, Limit, Offset, JsonString) :-
    ask_namespace(Namespace, NamespaceMatch),
    ask_namespace(Name, NameMatch),
    findall(Row,
            (   kb:predicate_schema(SchemaId, NamespaceMatch, NameMatch, Arity, ArgumentNames, ArgumentTypes),
                ask_schema_row(SchemaId, NamespaceMatch, NameMatch, Arity, ArgumentNames, ArgumentTypes, Row)
            ),
            SchemaRows),
    findall(Row,
            (   kb:builtin_decision_predicate(NamespaceMatch, NameMatch, Arity, KeyPositions, DecisionPosition),
                \+ kb:predicate_schema(_, NamespaceMatch, NameMatch, Arity, _, _),
                ask_builtin_schema_row(NamespaceMatch, NameMatch, Arity, KeyPositions, DecisionPosition, Row)
            ),
            BuiltinRows),
    append(SchemaRows, BuiltinRows, Rows0),
    map_list_to_pairs(ask_schema_sort_key, Rows0, Pairs),
    keysort(Pairs, SortedPairs),
    pairs_values(SortedPairs, SortedRows),
    length(SortedRows, Count),
    paginate_rows(SortedRows, Offset, Limit, Rows),
    status_meta_dict(Meta),
    Response = _{mode: schemas, count: Count, rows: Rows, warnings: [], meta: Meta},
    dict_json_string(Response, JsonString).

ask_schema_sort_key(Row, Key) :-
    format(atom(Key), '~w:~w/~w', [Row.namespace, Row.name, Row.arity]).

%% ask_fact_kind_json(+Kind, +Limit, +Offset, -JsonString)
% Facts of one fact_kind (subject, property_value, predicate, observation,
% meta, rule, rule_schema) with their identifying typed fields only, so a
% caller can see what is modeled without paging full entities.
% implements REQ-kibi-query-fact-filters
ask_fact_kind_json(Kind, Limit, Offset, JsonString) :-
    findall(Row, ask_fact_kind_row(Kind, Row), Rows0),
    sort_dict_rows(Rows0, SortedRows),
    length(SortedRows, Count),
    paginate_rows(SortedRows, Offset, Limit, Rows),
    status_meta_dict(Meta),
    Response = _{mode: fact_kind, factKind: Kind, count: Count, rows: Rows, warnings: [], meta: Meta},
    dict_json_string(Response, JsonString).

ask_fact_kind_row(Kind, Row) :-
    kb_entity(FactId, fact, Props),
    memberchk(fact_kind=KindRaw, Props),
    kb:normalize_term_atom(KindRaw, Kind),
    ask_fact_text(FactId, Title, Status, ClaimText, CanonicalKey),
    findall(Key-Value,
            (   member(Key, [subject_key, property_key, operator, value_type, unit, predicate_namespace, predicate_name, predicate_args, polarity]),
                memberchk(Key=Raw, Props),
                ask_typed_value(Raw, Value)
            ),
            Typed),
    (   Kind == property_value
    ->  (   memberchk(value_type=ValTypeRaw, Props)
        ->  kb:normalize_term_atom(ValTypeRaw, ValType)
        ;   ValType = string
        ),
        kb:value_from_props(Props, ValType, Value0),
        ask_property_value_json(Value0, PropertyValue),
        ValuePairs = [value-PropertyValue]
    ;   ValuePairs = []
    ),
    append(Typed, ValuePairs, Fields),
    dict_pairs(Row, _, [id-FactId, type-fact, title-Title, status-Status, factKind-Kind, canonicalKey-CanonicalKey, claimText-ClaimText | Fields]).

ask_typed_value(Raw, Value) :-
    is_list(Raw),
    !,
    kb:normalize_term_atom_list(Raw, Value).
ask_typed_value(Raw, Value) :-
    source_value_atom(Raw, Value).

matching_gap_row(TypeFilter, MissingRelationships, PresentRelationships, Tags, SourceFilter, Row) :-
    matching_gap_candidate(TypeFilter, MissingRelationships, PresentRelationships, Tags, SourceFilter, Row, Stub),
    gap_row_visible(Tags, Stub).

% implements REQ-bootstrap-provenance-stubs
matching_gap_candidate(TypeFilter, MissingRelationships, PresentRelationships, Tags, SourceFilter, Row, Stub) :-
    kb_entity(Id, Type, Props),
    matches_type(TypeFilter, Type),
    matches_tags(Tags, Props),
    (provenance_stub_props(Type, Props) -> Stub = true ; Stub = false),
    matches_source(SourceFilter, Props),
    relationships_missing(Id, MissingRelationships),
    relationships_present(Id, PresentRelationships),
    entity_title_status_source(Props, Title, Status, Source),
    relationship_counts(Id, Counts),
    Row = _{
        id: Id,
        type: Type,
        title: Title,
        status: Status,
        missingRelationships: MissingRelationships,
        presentRelationships: PresentRelationships,
        relationshipCounts: Counts,
        source: Source
    }.

%% provenance_stub_props(+Type, +Props)
% A bootstrap provider fact that records only where an entry came from
% (tagged bootstrap:provenance-stub). It is not knowledge: gap rows and
% type coverage counts leave it out unless the caller asks for the tag.
% implements REQ-bootstrap-provenance-stubs
provenance_stub_props(fact, Props) :-
    memberchk(tags=Tags, Props),
    is_list(Tags),
    member(Tag, Tags),
    kb:normalize_term_atom(Tag, 'bootstrap:provenance-stub'),
    !.

hidden_provenance_stub(RequestedTags, Type, Props) :-
    \+ memberchk('bootstrap:provenance-stub', RequestedTags),
    provenance_stub_props(Type, Props).

% A requested missing/present relationship is satisfied by its documented
% inverse as well (docs/entity-schema.md: `validates` is the inverse edge of
% `verified_by` for req/scenario <-> test links), so a requirement whose test
% `validates` it is not a `verified_by` gap. relationshipCounts stay per name.
% implements REQ-mcp-search-discovery
relationships_missing(_Id, []).
relationships_missing(Id, [Relationship|Rest]) :-
    linked_relationship_count(Id, Relationship, 0),
    relationships_missing(Id, Rest).

% implements REQ-mcp-search-discovery
relationships_present(_Id, []).
relationships_present(Id, [Relationship|Rest]) :-
    linked_relationship_count(Id, Relationship, Count),
    Count > 0,
    relationships_present(Id, Rest).

inverse_relationship(verified_by, validates).
inverse_relationship(validates, verified_by).

linked_relationship_count(Id, Relationship, Count) :-
    relationship_count(Id, Relationship, Direct),
    (   inverse_relationship(Relationship, Inverse)
    ->  relationship_count(Id, Inverse, Reverse)
    ;   Reverse = 0
    ),
    Count is Direct + Reverse.

relationship_counts(Id, CountsDict) :-
    findall(Relationship-Count,
        (relationship_type(Relationship), relationship_count(Id, Relationship, Count)),
        Pairs),
    dict_pairs(CountsDict, relationship_counts, Pairs).

relationship_count(Id, Relationship, Count) :-
    aggregate_all(count,
        (kb_relationship(Relationship, Id, _); kb_relationship(Relationship, _, Id)),
        Count).

coverage_rows(req, Tags, IncludePassing, IncludeTransitive, VerificationSnapshot, CheckedAt, MaxAgeSeconds, BindingMode, TestBindings, Rows, Summary) :-
    !,
    requirement_proof_context(VerificationSnapshot, CheckedAt, MaxAgeSeconds, BindingMode, TestBindings, ProofContext),
    findall(Row,
        requirement_coverage_row(Tags, IncludeTransitive, ProofContext, Row),
        AllRows),
    filter_req_coverage_rows(IncludePassing, AllRows, Rows),
    coverage_summary(AllRows, Summary).
coverage_rows(symbol, Tags, IncludePassing, _IncludeTransitive, _VerificationSnapshot, _CheckedAt, _MaxAgeSeconds, Rows, Summary) :-
    !,
    findall(Row,
        symbol_coverage_row(Tags, Row),
        AllRows),
    filter_symbol_coverage_rows(IncludePassing, AllRows, Rows),
    length(AllRows, Total),
    include(symbol_row_fully_covered, AllRows, CoveredRows),
    include(symbol_row_uncovered, AllRows, UncoveredRows),
    include(symbol_row_not_applicable, AllRows, NotApplicableRows),
    include(symbol_row_mixed_role, AllRows, MixedRoleRows),
    length(CoveredRows, Covered),
    length(UncoveredRows, Uncovered),
    length(NotApplicableRows, NotApplicable),
    length(MixedRoleRows, MixedRole),
    Applicable is Total - NotApplicable,
    Summary = _{
        total: Total,
        applicable: Applicable,
        fullyCovered: Covered,
        uncovered: Uncovered,
        notApplicable: NotApplicable,
        mixedRole: MixedRole
    }.
coverage_rows(type, _Tags, _IncludePassing, _IncludeTransitive, _VerificationSnapshot, _CheckedAt, _MaxAgeSeconds, Rows, Summary) :-
    findall(Type-Count,
        type_entity_count(Type, Count),
        Pairs),
    maplist(type_pair_row, Pairs, Rows),
    length(Rows, Total),
    aggregate_all(count, provenance_stub_entity(_), StubCount),
    Summary = _{total: Total, provenanceStubs: StubCount}.

coverage_rows(req, Tags, IncludePassing, IncludeTransitive, VerificationSnapshot, CheckedAt, MaxAgeSeconds, Rows, Summary) :-
    !,
    coverage_rows(req, Tags, IncludePassing, IncludeTransitive, VerificationSnapshot, CheckedAt, MaxAgeSeconds, strict_snapshot, _{}, Rows, Summary).

requirement_coverage_row(Tags, IncludeTransitive, ProofContext, Row) :-
    kb_entity(Id, req, Props),
    matches_tags(Tags, Props),
    entity_title_status_source(Props, Title, Status, Source),
    entity_priority(Props, Priority),
    count_distinct_targets(specified_by, Id, source, ScenarioCount),
    requirement_test_count(Id, TestCount),
    count_direct_symbols(Id, DirectSymbolCount),
    count_transitive_symbols(Id, IncludeTransitive, TransitiveSymbolCount),
    requirement_coverage_state(Id, Props, Gaps, Evaluated, CoverageStatus),
    requirement_coverage_depth(Id, ScenarioCount, CoverageDepth, CoverageEvidence),
    BaseRow = _{
        id: Id,
        type: req,
        title: Title,
        status: Status,
        source: Source,
        priority: Priority,
        scenarioCount: ScenarioCount,
        testCount: TestCount,
        directSymbolCount: DirectSymbolCount,
        transitiveSymbolCount: TransitiveSymbolCount,
        gaps: Gaps,
        evaluated: Evaluated,
        coverageStatus: CoverageStatus,
        coverageDepth: CoverageDepth,
        coverage_depth: CoverageDepth,
        directTests: CoverageEvidence.directTests,
        scenarioTests: CoverageEvidence.scenarioTests,
        testStatuses: CoverageEvidence.testStatuses,
        verificationScopes: CoverageEvidence.verificationScopes
    },
    requirement_proof(Id, Props, ProofContext, Proof),
    put_dict(Proof, BaseRow, Row).

symbol_coverage_row(Tags, Row) :-
    kb_entity(Id, symbol, Props),
    matches_tags(Tags, Props),
    entity_title_status_source(Props, Title, Status, _Source),
    count_direct_requirements(Id, DirectRequirementCount),
    count_direct_tests(Id, TestCount),
    count_executable_tests(Id, ExecutableTestCount),
    (   mixed_role_symbol(Id)
    ->  TraceabilityRole = mixed,
        Gaps = [invalid_mixed_symbol_role],
        CoverageStatus = uncovered
    ;   executable_test_symbol(Id)
    ->  TraceabilityRole = executable_test,
        Gaps = [],
        CoverageStatus = not_applicable
    ;   TraceabilityRole = production,
        (   symbol_no_req_coverage(Id, _)
        ->  Gaps = [missing_requirement],
            CoverageStatus = uncovered
        ;   Gaps = [],
            CoverageStatus = fully_covered
        )
    ),
    Row = _{
        id: Id,
        type: symbol,
        title: Title,
        status: Status,
        traceabilityRole: TraceabilityRole,
        directRequirementCount: DirectRequirementCount,
        testCount: TestCount,
        executableTestCount: ExecutableTestCount,
        gaps: Gaps,
        coverageStatus: CoverageStatus
    }.

% Link coverage (evaluated, fullyCovered, uncovered, notApplicable and the
% missing* counts) judges only priority: must requirements; linkCoverageScope
% says so, so a project without must requirements does not read as having
% evaluated nothing next to its proof counts.
coverage_summary(Rows, Summary) :-
    length(Rows, Total),
    include(req_row_evaluated, Rows, EvaluatedRows),
    include(req_row_fully_covered, Rows, FullyCoveredRows),
    include(req_row_uncovered, Rows, UncoveredRows),
    include(req_row_not_applicable, Rows, NotApplicableRows),
    include(req_row_missing_scenario, Rows, MissingScenarioRows),
    include(req_row_missing_test, Rows, MissingTestRows),
    include(req_row_missing_both, Rows, MissingBothRows),
    include(req_row_proof_tested, Rows, ProofTestedRows),
    include(req_row_proof_unresolved, Rows, ProofUnresolvedRows),
    include(req_row_proof_missing, Rows, ProofMissingRows),
    include(req_row_proof_not_applicable, Rows, ProofNotApplicableRows),
    length(EvaluatedRows, Evaluated),
    length(FullyCoveredRows, FullyCovered),
    length(UncoveredRows, Uncovered),
    length(NotApplicableRows, NotApplicable),
    length(MissingScenarioRows, MissingScenario),
    length(MissingTestRows, MissingTest),
    length(MissingBothRows, MissingScenarioAndTest),
    length(ProofTestedRows, ProofTested),
    evidence_level_counts(Rows, EvidenceLevels),
    length(ProofUnresolvedRows, ProofUnresolved),
    length(ProofMissingRows, ProofMissing),
    length(ProofNotApplicableRows, ProofNotApplicable),
    Summary = _{
        total: Total,
        evaluated: Evaluated,
        fullyCovered: FullyCovered,
        uncovered: Uncovered,
        notApplicable: NotApplicable,
        missingScenario: MissingScenario,
        missingTest: MissingTest,
        missingScenarioAndTest: MissingScenarioAndTest,
        proofTested: ProofTested,
        proofUnresolved: ProofUnresolved,
        proofMissing: ProofMissing,
        proofNotApplicable: ProofNotApplicable,
        evidenceLevels: EvidenceLevels,
        linkCoverageScope: priority_must
    }.

% implements REQ-kibi-evidence-levels
evidence_level_counts(Rows, _{proved: Proved, tested: Tested, asserted: Asserted, unverified: Unverified}) :-
    aggregate_all(count, (member(Row, Rows), Row.get(evidenceLevel) == proved), Proved),
    aggregate_all(count, (member(Row, Rows), Row.get(evidenceLevel) == tested), Tested),
    aggregate_all(count, (member(Row, Rows), Row.get(evidenceLevel) == asserted), Asserted),
    aggregate_all(count, (member(Row, Rows), Row.get(evidenceLevel) == unverified), Unverified).

req_row_fully_covered(Row) :-
    CoverageStatus = Row.get(coverageStatus),
    CoverageStatus = fully_covered.
req_row_evaluated(Row) :-
    Evaluated = Row.get(evaluated),
    Evaluated = true.
req_row_uncovered(Row) :-
    CoverageStatus = Row.get(coverageStatus),
    CoverageStatus = uncovered.
req_row_not_applicable(Row) :-
    CoverageStatus = Row.get(coverageStatus),
    CoverageStatus = not_applicable.
req_row_missing_scenario(Row) :-
    Row.gaps = [missing_scenario].
req_row_missing_test(Row) :-
    Row.gaps = [missing_test].
req_row_missing_both(Row) :-
    Row.gaps = [missing_scenario_and_test].
req_row_proof_tested(Row) :-
    Row.proofStatus == tested.
req_row_proof_unresolved(Row) :-
    Row.proofStatus == unresolved.
req_row_proof_missing(Row) :-
    Row.proofStatus == missing.
req_row_proof_not_applicable(Row) :-
    Row.proofStatus == not_applicable.

symbol_row_fully_covered(Row) :-
    CoverageStatus = Row.get(coverageStatus),
    CoverageStatus = fully_covered.
symbol_row_uncovered(Row) :-
    Row.coverageStatus == uncovered.
symbol_row_not_applicable(Row) :-
    Row.coverageStatus == not_applicable.
symbol_row_mixed_role(Row) :-
    Row.traceabilityRole == mixed.

count_distinct_targets(Relationship, Id, source, Count) :-
    !,
    findall(Target, kb_relationship(Relationship, Id, Target), Targets0),
    sort(Targets0, Targets),
    length(Targets, Count).

requirement_test_count(Id, Count) :-
    findall(TestId, kb_relationship(verified_by, Id, TestId), Verified0),
    findall(TestId, kb_relationship(validates, TestId, Id), Validates0),
    findall(TestId, scenario_requirement_test(Id, TestId), ScenarioTests0),
    append([Verified0, Validates0, ScenarioTests0], Combined0),
    sort(Combined0, Combined),
    length(Combined, Count).

requirement_coverage_depth(Id, ScenarioCount, CoverageDepth, Evidence) :-
    requirement_direct_tests(Id, DirectTests),
    requirement_scenario_tests(Id, ScenarioTests),
    append(DirectTests, ScenarioTests, AllTests0),
    sort(AllTests0, AllTests),
    passing_tests(DirectTests, PassingDirectTests),
    passing_tests(ScenarioTests, PassingScenarioTests),
    passing_tests(AllTests, PassingTests),
    test_statuses(AllTests, TestStatuses),
    test_scopes(AllTests, VerificationScopes),
    Evidence = _{
        directTests: DirectTests,
        scenarioTests: ScenarioTests,
        testStatuses: TestStatuses,
        verificationScopes: VerificationScopes
    },
    classify_coverage_depth(
        ScenarioCount,
        AllTests,
        PassingTests,
        PassingDirectTests,
        PassingScenarioTests,
        CoverageDepth
    ).

requirement_direct_tests(Id, Tests) :-
    findall(TestId, direct_requirement_test(Id, TestId), Tests0),
    sort(Tests0, Tests).

direct_requirement_test(Id, TestId) :-
    kb_relationship(verified_by, Id, TestId),
    kb_entity(TestId, test, _).
direct_requirement_test(Id, TestId) :-
    kb_relationship(validates, TestId, Id),
    kb_entity(TestId, test, _).
direct_requirement_test(Id, TestId) :-
    kb_relationship(covered_by, Id, TestId),
    kb_entity(TestId, test, _).

requirement_scenario_tests(Id, Tests) :-
    findall(TestId, scenario_requirement_test(Id, TestId), Tests0),
    sort(Tests0, Tests).

scenario_requirement_test(Id, TestId) :-
    kb_relationship(specified_by, Id, ScenarioId),
    scenario_test(ScenarioId, TestId).

scenario_test(ScenarioId, TestId) :-
    kb_relationship(validates, TestId, ScenarioId),
    kb_entity(TestId, test, _).
scenario_test(ScenarioId, TestId) :-
    kb_relationship(verified_by, ScenarioId, TestId),
    kb_entity(TestId, test, _).

passing_tests(Tests, PassingTests) :-
    include(passing_test, Tests, PassingTests).

passing_test(TestId) :-
    kb_entity(TestId, test, Props),
    memberchk(status=StatusRaw, Props),
    source_value_atom(StatusRaw, passing).

test_statuses(Tests, Statuses) :-
    findall(Status, (member(TestId, Tests), test_status(TestId, Status)), Statuses0),
    sort(Statuses0, Statuses).

test_status(TestId, Status) :-
    kb_entity(TestId, test, Props),
    memberchk(status=StatusRaw, Props),
    source_value_atom(StatusRaw, Status).

test_scopes(Tests, Scopes) :-
    findall(Scope, (member(TestId, Tests), test_scope(TestId, Scope)), Scopes0),
    sort(Scopes0, Scopes).

test_scope(TestId, Scope) :-
    kb_entity(TestId, test, Props),
    (   memberchk(verification_scope=ScopeRaw, Props)
    ->  source_value_atom(ScopeRaw, Scope)
    ;   legacy_e2e_test(Props)
    ->  Scope = end_to_end
    ;   Scope = unknown
    ).

legacy_e2e_test(Props) :-
    legacy_e2e_tag(Props),
    !.
legacy_e2e_test(Props) :-
    memberchk(source=SourceRaw, Props),
    source_value_atom(SourceRaw, Source),
    downcase_atom(Source, LowercaseSource),
    sub_atom(LowercaseSource, _, _, _, 'e2e').

legacy_e2e_tag(Props) :-
    memberchk(tags=Tags, Props),
    member(TagRaw, Tags),
    source_value_atom(TagRaw, Tag),
    downcase_atom(Tag, e2e).

classify_coverage_depth(_ScenarioCount, _AllTests, _PassingTests, PassingDirectTests, _PassingScenarioTests, direct_passing_e2e) :-
    member(TestId, PassingDirectTests),
    test_scope(TestId, end_to_end),
    !.
classify_coverage_depth(_ScenarioCount, _AllTests, _PassingTests, _PassingDirectTests, PassingScenarioTests, scenario_passing_e2e) :-
    member(TestId, PassingScenarioTests),
    test_scope(TestId, end_to_end),
    !.
classify_coverage_depth(_ScenarioCount, _AllTests, PassingTests, _PassingDirectTests, _PassingScenarioTests, unit_only) :-
    PassingTests \= [],
    forall(member(TestId, PassingTests), test_scope(TestId, unit)),
    !.
classify_coverage_depth(_ScenarioCount, AllTests, _PassingTests, _PassingDirectTests, _PassingScenarioTests, open_or_nonpassing_tests_only) :-
    AllTests \= [],
    !.
classify_coverage_depth(ScenarioCount, _AllTests, _PassingTests, _PassingDirectTests, _PassingScenarioTests, scenario_only_no_test) :-
    ScenarioCount > 0,
    !.
classify_coverage_depth(_ScenarioCount, _AllTests, _PassingTests, _PassingDirectTests, _PassingScenarioTests, no_test_evidence).

count_direct_symbols(Id, Count) :-
    findall(SymbolId, kb_relationship(implements, SymbolId, Id), Symbols0),
    sort(Symbols0, Symbols),
    length(Symbols, Count).

count_transitive_symbols(Id, true, Count) :-
    !,
    findall(SymbolId, transitively_implements(SymbolId, Id), Symbols0),
    sort(Symbols0, Symbols),
    length(Symbols, Count).
count_transitive_symbols(Id, false, Count) :-
    count_direct_symbols(Id, Count).

count_direct_requirements(Id, Count) :-
    findall(ReqId, kb_relationship(implements, Id, ReqId), ReqIds0),
    sort(ReqIds0, ReqIds),
    length(ReqIds, Count).

count_direct_tests(Id, Count) :-
    findall(TestId, kb_relationship(covered_by, Id, TestId), TestIds0),
    sort(TestIds0, TestIds),
    length(TestIds, Count).

count_executable_tests(Id, Count) :-
    findall(TestId, kb_relationship(executable_for, Id, TestId), TestIds0),
    sort(TestIds0, TestIds),
    length(TestIds, Count).

requirement_gap_list(Id, [Reason]) :-
    coverage_gap(Id, Reason),
    !.
requirement_gap_list(_, []).

requirement_coverage_state(Id, Props, Gaps, true, CoverageStatus) :-
    entity_priority(Props, Priority),
    must_priority(Priority),
    !,
    requirement_gap_list(Id, Gaps),
    (   Gaps = []
    ->  CoverageStatus = fully_covered
    ;   CoverageStatus = uncovered
    ).
requirement_coverage_state(_Id, _Props, [], false, not_applicable).

filter_req_coverage_rows(true, Rows, Rows).
filter_req_coverage_rows(false, Rows, Filtered) :-
    exclude(req_row_proof_passing, Rows, Filtered).

req_row_proof_passing(Row) :-
    Status = Row.proofStatus,
    memberchk(Status, [tested, not_applicable]).

filter_symbol_coverage_rows(true, Rows, Rows).
filter_symbol_coverage_rows(false, Rows, Filtered) :-
    include(symbol_row_uncovered, Rows, Filtered).

entity_priority(Props, Priority) :-
    (   memberchk(priority=PriorityValue, Props)
    ->  source_value_atom(PriorityValue, Priority)
    ;   Priority = ''
    ).

must_priority(Priority) :-
    atom(Priority),
    downcase_atom(Priority, Lowercase),
    sub_atom(Lowercase, _, 4, 0, must).

% Provenance stubs are counted apart (summary.provenanceStubs), never as facts.
% implements REQ-bootstrap-provenance-stubs
type_entity_count(Type, Count) :-
    setof(Id, Props^(kb_entity(Id, Type, Props), \+ provenance_stub_props(Type, Props)), Ids),
    length(Ids, Count).

provenance_stub_entity(Id) :-
    kb_entity(Id, fact, Props),
    provenance_stub_props(fact, Props).

type_pair_row(Type-Count, _{id: Type, type: Type, count: Count}).

bfs_layers(_Frontier, SeenNodes, SeenEdges, _Relationships, _Direction, 0, _MaxNodes, _MaxEdges, SeenNodes, SeenEdges, false) :- !.
bfs_layers([], SeenNodes, SeenEdges, _Relationships, _Direction, _Depth, _MaxNodes, _MaxEdges, SeenNodes, SeenEdges, false) :- !.
bfs_layers(Frontier, SeenNodes, SeenEdges, Relationships, Direction, Depth, MaxNodes, MaxEdges, FinalNodes, FinalEdges, Truncated) :-
    (   length(SeenNodes, NodeCount), NodeCount >= MaxNodes
    ->  FinalNodes = SeenNodes,
        FinalEdges = SeenEdges,
        Truncated = true
    ;   length(SeenEdges, EdgeCount), EdgeCount >= MaxEdges
    ->  FinalNodes = SeenNodes,
        FinalEdges = SeenEdges,
        Truncated = true
    ;   findall(Edge-Next,
            (member(Current, Frontier), edge_step(Current, Relationships, Direction, Edge, Next)),
            Pairs0),
        sort(Pairs0, Pairs),
        collect_pairs(Pairs, SeenNodes, SeenEdges, MaxNodes, MaxEdges, NextFrontier, NextNodes, NextEdges, HitLimit),
        Depth1 is Depth - 1,
        bfs_layers(NextFrontier, NextNodes, NextEdges, Relationships, Direction, Depth1, MaxNodes, MaxEdges, FinalNodes, FinalEdges, Truncated1),
        (   HitLimit
        ->  Truncated = true
        ;   Truncated = Truncated1
        )
    ).

collect_pairs([], SeenNodes, SeenEdges, _MaxNodes, _MaxEdges, [], SeenNodes, SeenEdges, false).
collect_pairs([Edge-Next|Rest], SeenNodes, SeenEdges, MaxNodes, MaxEdges, Frontier, FinalNodes, FinalEdges, HitLimit) :-
    (   memberchk(Edge, SeenEdges)
    ->  true,
        collect_pairs(Rest, SeenNodes, SeenEdges, MaxNodes, MaxEdges, Frontier, FinalNodes, FinalEdges, HitLimit)
    ;   collect_new_pair(Edge, Next, Rest, SeenNodes, SeenEdges, MaxNodes, MaxEdges, Frontier, FinalNodes, FinalEdges, HitLimit)
    ).

collect_new_pair(Edge, Next, _Rest, SeenNodes, SeenEdges, MaxNodes, MaxEdges, Frontier, FinalNodes, FinalEdges, HitLimit) :-
    prepare_new_pair(Edge, Next, SeenNodes, SeenEdges, SeenNodes1, SeenEdges1, NewFrontier),
    length(SeenNodes1, NodeCount),
    length(SeenEdges1, EdgeCount),
    (   NodeCount >= MaxNodes
    ;   EdgeCount >= MaxEdges
    ),
    !,
    Frontier = NewFrontier,
    FinalNodes = SeenNodes1,
    FinalEdges = SeenEdges1,
    HitLimit = true.
collect_new_pair(Edge, Next, Rest, SeenNodes, SeenEdges, MaxNodes, MaxEdges, Frontier, FinalNodes, FinalEdges, HitLimit) :-
    prepare_new_pair(Edge, Next, SeenNodes, SeenEdges, SeenNodes1, SeenEdges1, NewFrontier),
    collect_pairs(Rest, SeenNodes1, SeenEdges1, MaxNodes, MaxEdges, FrontierRest, FinalNodes, FinalEdges, HitLimitRest),
    append(NewFrontier, FrontierRest, Frontier),
    HitLimit = HitLimitRest.

prepare_new_pair(Edge, Next, SeenNodes, SeenEdges, SeenNodes1, SeenEdges1, NewFrontier) :-
    append(SeenEdges, [Edge], SeenEdges1),
    (   memberchk(Next, SeenNodes)
    ->  SeenNodes1 = SeenNodes,
        NewFrontier = []
    ;   append(SeenNodes, [Next], SeenNodes1),
        NewFrontier = [Next]
    ).

edge_step(Current, Relationships, outgoing, edge(Type, Current, Next), Next) :-
    relationship_allowed(Relationships, Type),
    kb_relationship(Type, Current, Next).
edge_step(Current, Relationships, incoming, edge(Type, Prev, Current), Prev) :-
    relationship_allowed(Relationships, Type),
    kb_relationship(Type, Prev, Current).
edge_step(Current, Relationships, both, Edge, Next) :-
    edge_step(Current, Relationships, outgoing, Edge, Next).
edge_step(Current, Relationships, both, Edge, Next) :-
    edge_step(Current, Relationships, incoming, Edge, Next).

relationship_allowed([], Type) :-
    relationship_type(Type).
relationship_allowed(Relationships, Type) :-
    member(Type, Relationships).

keep_entity_type([], _Id).
keep_entity_type(EntityTypes, Id) :-
    kb_entity(Id, Type, _),
    memberchk(Type, EntityTypes).

edge_kept(KeptNodes, edge(_Type, From, To)) :-
    memberchk(From, KeptNodes),
    memberchk(To, KeptNodes).

node_dict(Id, _{id: Id, type: Type, title: Title, status: Status}) :-
    kb_entity(Id, Type, Props),
    entity_title_status_source(Props, Title, Status, _Source).

edge_dict(edge(Type, From, To), _{type: Type, from: From, to: To}).

matches_type(none, _Type).
matches_type(TypeFilter, Type) :-
    TypeFilter \= none,
    Type = TypeFilter.

matches_tags([], _Props).
matches_tags(Tags, Props) :-
    memberchk(tags=EntityTags, Props),
    member(Tag, Tags),
    member(Tag, EntityTags),
    !.

matches_source(none, _Props).
matches_source(SourceFilter, Props) :-
    memberchk(source=SourceValue, Props),
    source_value_atom(SourceValue, SourceAtom),
    sub_atom(SourceAtom, _, _, _, SourceFilter).

entity_title_status_source(Props, Title, Status, Source) :-
    memberchk(title=TitleValue, Props),
    memberchk(status=StatusValue, Props),
    (   memberchk(source=SourceValue, Props)
    ->  source_value_atom(SourceValue, Source)
    ;   Source = ''
    ),
    source_value_atom(TitleValue, Title),
    source_value_atom(StatusValue, Status).

source_value_atom(Val, Atom) :-
    nonvar(Val),
    compound(Val),
    Val =.. ['^^', Inner, _Type],
    !,
    source_value_atom(Inner, Atom).
source_value_atom(literal(type(_, Val)), Atom) :-
    !,
    source_value_atom(Val, Atom).
source_value_atom(Val, Atom) :-
    string(Val),
    !,
    atom_string(Atom, Val).
source_value_atom(Val, Atom) :-
    atom(Val),
    !,
    Atom = Val.
source_value_atom(Val, Atom) :-
    term_string(Val, Str),
    atom_string(Atom, Str).

sort_dict_rows(Rows, SortedRows) :-
    map_list_to_pairs(dict_row_sort_key, Rows, Pairs),
    keysort(Pairs, SortedPairs),
    pairs_values(SortedPairs, SortedRows).

dict_row_sort_key(Row, Key) :-
    Id = Row.get(id),
    Type = Row.get(type),
    format(atom(Key), '~w::~w', [Type, Id]).

paginate_rows(Rows, Offset, Limit, PaginatedRows) :-
    length(Prefix, Offset),
    append(Prefix, Rest, Rows),
    length(PaginatedRows, Limit),
    append(PaginatedRows, _Tail, Rest),
    !.
paginate_rows(Rows, Offset, _Limit, PaginatedRows) :-
    length(Prefix, Offset),
    append(Prefix, PaginatedRows, Rows),
    !.
paginate_rows(_, _, _, []).

dict_json_string(Dict, JsonString) :-
    with_output_to(string(JsonString), json_write_dict(current_output, Dict, [])).
