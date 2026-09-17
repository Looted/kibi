% Module: discovery
% Curated discovery, reporting, and bounded graph traversal predicates.

:- module(discovery, [
    find_gaps_json/8,
    coverage_report_json/7,
    coverage_report_json/10,
    coverage_report_json/11,
    coverage_report_json/12,
    coverage_evidence_json/5,
    requirement_proof_json/5,
    requirement_proof_json/7,
    symbol_proof_json/7,
    graph_expand_json/8
]).

:- use_module(library(http/json)).
:- use_module(library(aggregate)).
:- use_module(library(apply)).
:- use_module(library(lists)).
:- use_module(library(pairs)).
:- use_module('kb.pl').
:- use_module('requirement_proof.pl', [requirement_proof_context/1, requirement_proof_context/4, requirement_proof_context/6, requirement_proof/4]).
:- use_module('status.pl', [status_meta_dict/1]).
:- use_module('../schema/relationships.pl', [relationship_type/1]).

find_gaps_json(TypeFilter, MissingRelationships, PresentRelationships, Tags, SourceFilter, Limit, Offset, JsonString) :-
    findall(
        Row,
        matching_gap_row(TypeFilter, MissingRelationships, PresentRelationships, Tags, SourceFilter, Row),
        Rows0
    ),
    sort_dict_rows(Rows0, SortedRows),
    paginate_rows(SortedRows, Offset, Limit, Rows),
    length(SortedRows, Count),
    status_meta_dict(Meta),
    Response = _{rows: Rows, count: Count, meta: Meta},
    dict_json_string(Response, JsonString).

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
    (   By == req
    ->  coverage_rows(req, Tags, IncludePassing, IncludeTransitive, VerificationSnapshot, CheckedAt, MaxAgeSeconds, BindingMode, TestBindings, Rows0, Summary)
    ;   coverage_rows(By, Tags, IncludePassing, IncludeTransitive, VerificationSnapshot, CheckedAt, MaxAgeSeconds, Rows0, Summary)
    ),
    sort_dict_rows(Rows0, SortedRows),
    paginate_rows(SortedRows, Offset, Limit, Rows),
    status_meta_dict(Meta),
    Response = _{summary: Summary, rows: Rows, meta: Meta},
    dict_json_string(Response, JsonString).

% implements REQ-kibi-coverage-status-filter
% Proof-status filtered report. The status filter selects requirement rows by
% proofStatus (proven, missing, unresolved, not_applicable) and replaces the
% default include-passing filtering, so callers can enumerate exactly one
% slice — e.g. every not_applicable row together with its typed applicability
% reason — without diffing full exports by hand. The summary is always
% computed over all rows so filtered responses keep whole-KB counts.
coverage_report_json(By, Tags, IncludePassing, StatusFilter, IncludeTransitive, Limit, Offset, VerificationSnapshot, CheckedAt, MaxAgeSeconds, JsonString) :-
    status_filtered_coverage_rows(By, Tags, IncludePassing, StatusFilter, IncludeTransitive, VerificationSnapshot, CheckedAt, MaxAgeSeconds, MatchedRows0, Summary),
    sort_dict_rows(MatchedRows0, SortedRows),
    paginate_rows(SortedRows, Offset, Limit, Rows),
    status_meta_dict(Meta),
    Response = _{summary: Summary, rows: Rows, meta: Meta},
    dict_json_string(Response, JsonString).

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

matching_gap_row(TypeFilter, MissingRelationships, PresentRelationships, Tags, SourceFilter, Row) :-
    kb_entity(Id, Type, Props),
    matches_type(TypeFilter, Type),
    matches_tags(Tags, Props),
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

relationships_missing(_Id, []).
relationships_missing(Id, [Relationship|Rest]) :-
    relationship_count(Id, Relationship, 0),
    relationships_missing(Id, Rest).

relationships_present(_Id, []).
relationships_present(Id, [Relationship|Rest]) :-
    relationship_count(Id, Relationship, Count),
    Count > 0,
    relationships_present(Id, Rest).

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
    Summary = _{total: Total}.

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

coverage_summary(Rows, Summary) :-
    length(Rows, Total),
    include(req_row_evaluated, Rows, EvaluatedRows),
    include(req_row_fully_covered, Rows, FullyCoveredRows),
    include(req_row_uncovered, Rows, UncoveredRows),
    include(req_row_not_applicable, Rows, NotApplicableRows),
    include(req_row_missing_scenario, Rows, MissingScenarioRows),
    include(req_row_missing_test, Rows, MissingTestRows),
    include(req_row_missing_both, Rows, MissingBothRows),
    include(req_row_proof_proven, Rows, ProofProvenRows),
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
    length(ProofProvenRows, ProofProven),
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
        proofProven: ProofProven,
        proofUnresolved: ProofUnresolved,
        proofMissing: ProofMissing,
        proofNotApplicable: ProofNotApplicable
    }.

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
req_row_proof_proven(Row) :-
    Row.proofStatus == proven.
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
    memberchk(Status, [proven, not_applicable]).

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

type_entity_count(Type, Count) :-
    setof(Id, Props^kb_entity(Id, Type, Props), Ids),
    length(Ids, Count).

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
