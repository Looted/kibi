% Module: checks
% Aggregated validation checks that return all violations in bulk
% This module provides predicates that compute all violations for a given
% validation rule in a single Prolog call, avoiding expensive round-trips.

:- module(checks, [
    check_all/1,                    % Returns all violations as a dict
    check_all_json/1,               % Returns all violations as JSON string
    check_selected_json/2,           % Returns only selected rule violations as JSON
    check_must_priority_coverage/1, % Returns list of must-priority violations
    check_symbol_coverage/1,        % Returns list of uncovered symbols
    check_symbol_traceability/2,    % Returns list of symbols lacking requirement traceability (ReqAdr option)
    check_proof_contract_symbols/1, % Returns unresolved or unexpected required_proofs symbol issues
    check_no_dangling_refs/1,       % Returns list of dangling ref violations
    check_no_cycles/1,              % Returns list of cycle violations
    check_required_fields/1,        % Returns list of missing required field violations
    check_deprecated_adrs/1,        % Returns list of deprecated ADR violations
    check_scenario_feasibility/1,
    check_scenario_feasibility_unknown/1,
    check_rule_key_arguments_missing/1,
    infeasible_scenario/5,
    scenario_feasibility_outcome/2,
    check_domain_contradictions/1,  % Returns list of contradiction violations
    check_domain_contradictions_and_witnesses/2,
    check_domain_contradiction_witnesses/1,
    what_if_contradiction_witnesses/2,
    what_if_contradiction_witnesses_json/2,
    what_if_analysis/2,
    what_if_analysis_json/2,
    check_strict_fact_shape/1,      % Returns list of malformed strict fact violations
    check_strict_req_fact_pairing/1,% Returns list of malformed strict req/fact pairing violations
    check_strict_readiness/1,       % Returns list of strict readiness audit violations
    check_predicate_verifiability/1,% Returns list of unverifiable predicate-lane requirement links
    check_logic_coverage/1,         % Returns list of incomplete declared logical claim manifests
    check_rule_safety/1,
    check_rule_verifiability/1,
    check_semantic_completeness/1,
    check_req_status_vocabulary/1,
    check_entity_id_style/1,
    check_domain_redundancy/1,
    check_domain_implication/1,
    check_subject_key_identity/1,
    check_subject_key_shape/1,
    check_ontology_quality/1,
    run_checks_json/0,              % Entry point for JSON output
    violation_id_text/2             % Extract text from entity ID term (exported for testing)
]).

% Source contains non-ASCII text; do not depend on the host locale.
:- encoding(utf8).

:- use_module(library(http/json)).
:- use_module(library(http/json_convert)).
:- use_module('kb.pl').
:- use_module('intervals.pl', [numeric_constraints_satisfiable/2]).
:- use_module('../schema/entities.pl', [entity_type/1, required_property/2]).
:- use_module('../schema/relationships.pl', [relationship_type/1]).
:- use_module('semantic_quality.pl', [
    logical_ground_signature/2,
    check_entity_id_style/1,
    check_domain_redundancy/1,
    check_domain_implication/1,
    check_subject_key_identity/1,
    check_subject_key_shape/1,
    check_ontology_quality/1
]).
:- use_module('logic_ir.pl', [logic_rule_safety/2, logic_rule_from_props/2, logic_rule_conflict/3, logic_rule_conflict_witness/3, logic_rules_stratified/1, logic_rule_missing_keys/4, functional_predicate_declarations/1]).
% GENERATED registry facts; single source is schema/rule-registry.json.
:- use_module('rule_registry.pl', [known_rule/1]).

% Required fields for all entities
required_fields([id, title, status, created_at, updated_at, source]).

% Relationship types to check for dangling references
all_relationship_types([
    depends_on, verified_by, validates, specified_by,
    constrains, requires_property, requires_predicate, requires_rule, supersedes, restates, relates_to,
    assumes, exempts
]).

%% check_all(-ViolationsDict)
% Returns a dict with all violations grouped by rule type.
% Each value is a list of violation terms: violation(Rule, EntityId, Description, Suggestion, Source)
% For symbol-traceability, uses RequireAdr=false as default.
check_all(ViolationsDict) :-
    check_must_priority_coverage(MustPriority),
    check_symbol_coverage(SymbolCoverage),
    check_symbol_traceability(false, SymbolTraceability),
    check_no_dangling_refs(DanglingRefs),
    check_no_cycles(Cycles),
    check_required_fields(RequiredFields),
    check_deprecated_adrs(DeprecatedADRs),
    check_scenario_feasibility(ScenarioFeasibility),
    check_scenario_feasibility_unknown(ScenarioFeasibilityUnknown),
    check_domain_contradictions(Contradictions),
    check_rule_key_arguments_missing(RuleKeyArgumentsMissing),
    check_strict_fact_shape(StrictFactShape),
    check_strict_req_fact_pairing(StrictReqFactPairing),
    check_strict_readiness(StrictReadiness),
    check_predicate_verifiability(PredicateVerifiability),
    check_logic_coverage(LogicCoverage),
    check_rule_safety(RuleSafety),
    check_rule_verifiability(RuleVerifiability),
    check_semantic_completeness(SemanticCompleteness),
    check_req_status_vocabulary(ReqStatusVocabulary),
    check_proof_contract_symbols(ProofContractSymbols),
    check_entity_id_style(EntityIdStyle),
    check_domain_redundancy(DomainRedundancy),
    check_domain_implication(DomainImplication),
    check_subject_key_identity(SubjectKeyIdentity),
    check_subject_key_shape(SubjectKeyShape),
    check_ontology_quality(OntologyQuality),
    ViolationsDict = _{
        must_priority_coverage: MustPriority,
        symbol_coverage: SymbolCoverage,
        symbol_traceability: SymbolTraceability,
        no_dangling_refs: DanglingRefs,
        no_cycles: Cycles,
        required_fields: RequiredFields,
        deprecated_adr_no_successor: DeprecatedADRs,
        scenario_feasibility: ScenarioFeasibility,
        scenario_feasibility_unknown: ScenarioFeasibilityUnknown,
        domain_contradictions: Contradictions,
        rule_key_arguments_missing: RuleKeyArgumentsMissing,
        strict_fact_shape: StrictFactShape,
        strict_req_fact_pairing: StrictReqFactPairing,
        strict_readiness: StrictReadiness,
        predicate_verifiability: PredicateVerifiability,
        logic_coverage: LogicCoverage,
        rule_safety: RuleSafety,
        rule_verifiability: RuleVerifiability,
        semantic_completeness: SemanticCompleteness,
        req_status_vocabulary: ReqStatusVocabulary,
        proof_contract_symbols: ProofContractSymbols,
        entity_id_style: EntityIdStyle,
        domain_redundancy: DomainRedundancy,
        domain_implication: DomainImplication,
        subject_key_identity: SubjectKeyIdentity,
        subject_key_shape: SubjectKeyShape,
        ontology_quality: OntologyQuality
    }.

%% check_must_priority_coverage(-Violations)
% Finds all must-priority requirements lacking scenario and/or test coverage.
% Returns list of violation/5 terms.
check_must_priority_coverage(Violations) :-
    findall(
        Violation,
        coverage_gap_violation(Violation),
        Violations
    ).

coverage_gap_violation(violation(
    'must-priority-coverage',
    ReqId,
    Description,
    Suggestion,
    Source
)) :-
    coverage_gap(ReqId, Reason),
    coverage_gap_desc(Reason, Description),
    coverage_gap_suggestion(Reason, Suggestion),
    violation_source(ReqId, req, Source).

coverage_gap_desc(missing_test, "Must-priority requirement lacks test coverage").
coverage_gap_desc(missing_scenario, "Must-priority requirement lacks scenario coverage").
coverage_gap_desc(missing_scenario_and_test, "Must-priority requirement lacks scenario and test coverage").

coverage_gap_suggestion(missing_test, "Create test that validates this requirement").
coverage_gap_suggestion(missing_scenario, "Create scenario that specifies this requirement").
coverage_gap_suggestion(missing_scenario_and_test, "Create scenario that specifies and test that validates this requirement").

%% check_symbol_coverage(-Violations)
% Finds all production symbols lacking qualifying production coverage.
check_symbol_coverage(Violations) :-
    findall(SymbolId, symbol_no_req_coverage(SymbolId, _), SymbolIds0),
    sort(SymbolIds0, SymbolIds),
    maplist(symbol_coverage_violation, SymbolIds, Violations).

symbol_coverage_violation(SymbolId, violation(
    'symbol-coverage',
    SymbolId,
    "Production symbol lacks qualifying requirement coverage.",
    "Add 'covered_by: TEST-<area>-<behavior>' for production coverage. If the requirement has specified_by a scenario, use verified_by(scenario,test) or validates(test,scenario). Direct verified_by(req,test) does not count when a scenario exists.",
    Source
)) :-
    violation_source(SymbolId, symbol, Source).

%% check_symbol_traceability(+RequireAdr, -Violations)
% Finds all symbols lacking direct requirement ownership:
% - Every symbol must have at least one direct implements ownership path
% - If RequireAdr=true, the symbol must also have at least one 'constrained_by' relationship to an ADR
check_symbol_traceability(RequireAdr, Violations) :-
    findall(
        Violation,
        symbol_traceability_violation(RequireAdr, Violation),
        Violations0
    ),
    sort(Violations0, Violations).

symbol_traceability_violation(_RequireAdr, violation(
    'symbol-traceability',
    SymbolId,
    "Symbol mixes executable_for test identity with production implements or covered_by.",
    "Split the symbol: keep executable_for on the test-code symbol and use a separate production symbol for implements/covered_by.",
    Source
)) :-
    kb_entity(SymbolId, symbol, _),
    mixed_role_symbol(SymbolId),
    violation_source(SymbolId, symbol, Source).

symbol_traceability_violation(RequireAdr, violation(
    'symbol-traceability',
    SymbolId,
    Description,
    Suggestion,
    Source
)) :-
    kb_entity(SymbolId, symbol, _),
    % Check if symbol has direct requirement ownership
    (   symbol_owns_requirement(SymbolId, ReqId),
        kb_entity(ReqId, req, _)
    ->  HasReq = true
    ;   HasReq = false
    ),
    % Check if symbol has constrained_by to ADR (only if required)
    (   RequireAdr = true ->
        (   kb_relationship(constrained_by, SymbolId, AdrId),
            kb_entity(AdrId, adr, _)
        ->  HasAdr = true
        ;   HasAdr = false
        )
    ;   HasAdr = true  % Not required, so pass this check
    ),
    \+ executable_test_symbol(SymbolId),
    % Determine what is missing
    (   HasReq = false, HasAdr = false, RequireAdr = true ->
        Description = "Symbol has no direct requirement ownership and no ADR constraint.",
        Suggestion = "Add a direct 'implements: REQ-<area>-<behavior>' link for ownership, use 'covered_by' only for production coverage, use 'executable_for' only for executable test code, and add 'constrained_by: ADR-<decision>' in symbols.yaml."
    ;   HasReq = false ->
        Description = "Symbol has no direct requirement ownership.",
        Suggestion = "Add a direct 'implements: REQ-<area>-<behavior>' link for ownership. Use 'covered_by' for production coverage and 'executable_for' for executable test code identity."
    ;   HasAdr = false ->
        Description = "Symbol has no ADR constraint.",
        Suggestion = "Add 'constrained_by: ADR-<decision>' in symbols.yaml."
    ;   fail  % No violation
    ),
    violation_source(SymbolId, symbol, Source).

%% check_proof_contract_symbols(-Violations)
% Advisory integrity for proof_contract.required_proofs and optional
% proof_bindings.source_file. Kibi does not infer TEST names from filenames.
check_proof_contract_symbols(Violations) :-
    findall(Violation, proof_contract_symbol_violation(Violation), Violations0),
    sort(Violations0, Violations).

proof_contract_symbol_violation(violation(
    'proof-contract-symbols',
    TestId,
    Description,
    Suggestion,
    Source
)) :-
    kb_entity(TestId, test, Props),
    memberchk(proof_contract=RawContract, Props),
    parse_json_object(RawContract, Contract),
    required_proof_symbol_id(Contract, SymbolId),
    \+ kb_entity(SymbolId, symbol, _),
    format(string(Description), "proof_contract.required_proofs names unresolved symbol ~w", [SymbolId]),
    Suggestion = "Point required_proofs.symbol_id at an existing symbol entity; Kibi does not infer TEST names from source filenames.",
    violation_source(TestId, test, Source).

proof_contract_symbol_violation(violation(
    'proof-contract-symbols',
    TestId,
    Description,
    Suggestion,
    Source
)) :-
    kb_entity(TestId, test, Props),
    memberchk(proof_contract=RawContract, Props),
    parse_json_object(RawContract, Contract),
    required_proof_symbol_id(Contract, SymbolId),
    kb_entity(SymbolId, symbol, SymbolProps),
    memberchk(symbol_role=RawRole, SymbolProps),
    normalize_term_atom(RawRole, 'type-shape'),
    format(string(Description), "proof_contract.required_proofs names type-shape symbol ~w; required proofs must not target structural contracts", [SymbolId]),
    Suggestion = "Required proofs identify executable proof symbols. Use a production or executable-test symbol, not a type-shape contract.",
    violation_source(TestId, test, Source).

proof_contract_symbol_violation(violation(
    'proof-contract-symbols',
    TestId,
    Description,
    Suggestion,
    Source
)) :-
    kb_entity(TestId, test, Props),
    memberchk(proof_bindings=RawBindings, Props),
    parse_json_list(RawBindings, Bindings),
    member(Binding, Bindings),
    is_dict(Binding),
    (get_dict(source_file, Binding, RawBindingSource) ; get_dict(sourceFile, Binding, RawBindingSource)),
    normalize_term_atom(RawBindingSource, BindingSource),
    BindingSource \= '',
    (get_dict(symbol_id, Binding, RawSymbolId) ; get_dict(symbolId, Binding, RawSymbolId)),
    normalize_term_atom(RawSymbolId, SymbolId),
    SymbolId \= '',
    kb_entity(SymbolId, symbol, SymbolProps),
    (   memberchk(sourceFile=RawSymbolSource, SymbolProps)
    ->  normalize_term_atom(RawSymbolSource, SymbolSource)
    ;   SymbolSource = ''
    ),
    SymbolSource \= BindingSource,
    format(string(Description), "proof_bindings.source_file for ~w is ~w but the symbol sourceFile is ~w", [SymbolId, BindingSource, SymbolSource]),
    Suggestion = "Align proof_bindings.source_file with the symbol's sourceFile, or omit source_file. Kibi does not infer TEST names from filenames.",
    violation_source(TestId, test, Source).

required_proof_symbol_id(Contract, SymbolId) :-
    (   get_dict(required_proofs, Contract, Raw)
    ;   get_dict('required_proofs', Contract, Raw)
    ),
    parse_json_list(Raw, Entries),
    member(Entry, Entries),
    (   is_dict(Entry),
        (get_dict(symbol_id, Entry, RawId) ; get_dict(symbolId, Entry, RawId))
    ;   is_list(Entry),
        memberchk(symbol_id=RawId, Entry)
    ),
    normalize_term_atom(RawId, SymbolId),
    SymbolId \= ''.

parse_json_object(^^(Value, _), Dict) :-
    !,
    parse_json_object(Value, Dict).
parse_json_object(literal(type(_, Value)), Dict) :-
    !,
    parse_json_object(Value, Dict).
parse_json_object(literal(Value), Dict) :-
    !,
    parse_json_object(Value, Dict).
parse_json_object(Dict, Dict) :-
    is_dict(Dict),
    !.
parse_json_object(Raw, Dict) :-
    (atom(Raw) ; string(Raw)),
    catch(atom_json_dict(Raw, Dict, [value_string_as(string)]), _, fail),
    is_dict(Dict).

parse_json_list(Raw, Entries) :-
    is_list(Raw),
    !,
    Entries = Raw.
parse_json_list(^^(Value, _), Entries) :-
    !,
    parse_json_list(Value, Entries).
parse_json_list(Raw, Entries) :-
    (atom(Raw) ; string(Raw)),
    catch(atom_json_dict(Raw, Entries, [value_string_as(string)]), _, fail),
    is_list(Entries).

%% check_no_dangling_refs(-Violations)
% Finds all relationships referencing non-existent entities.
check_no_dangling_refs(Violations) :-
    all_relationship_types(Types),
    check_dangling_refs_for_types(Types, [], Violations).

check_dangling_refs_for_types([], Acc, Acc).
check_dangling_refs_for_types([Type|Rest], Acc, Violations) :-
    findall(
        Violation,
        dangling_ref_violation(Type, Violation),
        TypeViolations
    ),
    append(Acc, TypeViolations, NewAcc),
    check_dangling_refs_for_types(Rest, NewAcc, Violations).

dangling_ref_violation(Type, violation(
    'no-dangling-refs',
    FromId,
    Description,
    "Remove relationship or create missing entity",
    ""
)) :-
    kb_relationship(Type, FromId, _ToId),
    \+ kb_entity(FromId, _, _),  % From doesn't exist
    format(string(Description), "Relationship references non-existent entity: ~w", [FromId]).

dangling_ref_violation(Type, violation(
    'no-dangling-refs',
    ToId,
    Description,
    "Remove relationship or create missing entity",
    ""
)) :-
    kb_relationship(Type, FromId, ToId),
    kb_entity(FromId, _, _),  % From exists
    \+ kb_entity(ToId, _, _),   % To doesn't exist
    format(string(Description), "Relationship references non-existent entity: ~w", [ToId]).

%% check_no_cycles(-Violations)
% Finds circular dependencies in the depends_on graph.
check_no_cycles(Violations) :-
    % Build adjacency list from depends_on relationships
    findall(From-To, kb_relationship(depends_on, From, To), EdgePairs0),
    sort(EdgePairs0, Edges),
    cycle_start_nodes(Edges, Starts),

    % Find at most one representative cycle per start node.
    findall(
        Cycle,
        (   member(Start, Starts),
            once(find_cycle_from_start(Edges, Start, Cycle))
        ),
        Cycles
    ),

    % Convert cycles to violations (only report first occurrence of each cycle)
    cycles_to_violations(Cycles, [], Violations).

cycle_start_nodes(Edges, Starts) :-
    findall(Start, member(Start-_, Edges), Starts0),
    sort(Starts0, Starts).

find_cycle_from_start(Edges, Start, [Start, Start]) :-
    memberchk(Start-Start, Edges),
    !.
find_cycle_from_start(Edges, Start, Cycle) :-
    dfs_cycle(Edges, Start, Start, [Start], Cycle).

dfs_cycle(Edges, Start, Current, Path, Cycle) :-
    member(Current-Next, Edges),
    (   Next = Start
    ->  length(Path, Len),
        Len > 1,
        reverse([Start|Path], Cycle)
    ;   \+ memberchk(Next, Path),
        dfs_cycle(Edges, Start, Next, [Next|Path], Cycle)
    ).

cycles_to_violations([], _, []).
cycles_to_violations([Cycle|Rest], Seen, [Violation|Violations]) :-
    normalize_cycle(Cycle, Normalized),
    \+ memberchk(Normalized, Seen),
    !,
    cycle_to_violation(Cycle, Violation),
    cycles_to_violations(Rest, [Normalized|Seen], Violations).
cycles_to_violations([_|Rest], Seen, Violations) :-
    cycles_to_violations(Rest, Seen, Violations).

normalize_cycle(Cycle, Normalized) :-
    sort(Cycle, Normalized).

cycle_to_violation(Cycle, violation(
    'no-cycles',
    FirstId,
    Description,
    "Break cycle by removing one of the depends_on relationships",
    Source
)) :-
    Cycle = [FirstId|_],
    
    % Build cycle description with source names
    findall(
        Name,
        (   member(Id, Cycle),
            (   kb_entity(Id, _, Props),
                memberchk(source=SourcePath0, Props)
            ->  normalize_term_atom(SourcePath0, SourcePath),
                file_base_name(SourcePath, Name)
            ;   Name = Id
            )
        ),
        Names
    ),
    
    % Join with arrows
    atomic_list_concat(Names, ' → ', NamesStr),
    format(string(Description), "Circular dependency detected: ~w", [NamesStr]),
    
    % Get source of first entity
    (   kb_entity(FirstId, _, Props),
        memberchk(source=Source0, Props)
    ->  normalize_term_atom(Source0, Source)
    ;   Source = ""
    ).

%% check_required_fields(-Violations)
% Finds all entities missing required fields.
check_required_fields(Violations) :-
    required_fields(Required),
    findall(
        Violation,
        missing_required_field(Required, Violation),
        Violations
    ).

missing_required_field(Required, violation(
    'required-fields',
    EntityId,
    Description,
    Suggestion,
    Source
)) :-
    kb_entity(EntityId, _Type, Props),
    member(Field, Required),
    (   memberchk(source=Source, Props)
    ->  true
    ;   Source = ""
    ),
    \+ memberchk(Field=_, Props),

    format(string(Description), "Missing required field: ~w", [Field]),
    format(string(Suggestion), "Add ~w to entity definition", [Field]).

%% check_deprecated_adrs(-Violations)
% Finds all deprecated ADRs without successors.
check_deprecated_adrs(Violations) :-
    findall(
        Violation,
        deprecated_adr_violation(Violation),
        Violations
    ).

deprecated_adr_violation(violation(
    'deprecated-adr-no-successor',
    AdrId,
    Description,
    Suggestion,
    Source
)) :-
    deprecated_no_successor(AdrId),
    
    Description = "Superseded/deprecated ADR has no successor — add a supersedes link from the replacement ADR",
    
    format(string(Suggestion), "Create a new ADR and add: links: [{type: supersedes, target: ~w}]", [AdrId]),
    
    (   kb_entity(AdrId, adr, Props),
        memberchk(source=Source, Props)
    ->  true
    ;   Source = ""
    ).

%% check_scenario_feasibility(-Violations)
% implements REQ-kibi-scenario-feasibility
% A scenario that expects success and whose assumptions cannot hold together
% with what current requirements require can never pass.  Each witness names
% the scenario, the requirements, the assumed facts and the requirement facts
% of one irreducible conflict: one assumption against one requirement fact
% (pairwise), or several assumptions that are compatible on their own but
% leave no admissible value once the requirement constraints are added
% (joint, e.g. q >= 5 and q != 5 against q =< 5).  An approved exception (a
% current requirement that `exempts` the base requirement, is `specified_by`
% the scenario and carries a non-empty `approved_by`) removes the base
% requirement from the scenario's analysis without editing it.  An exception
% without approval does not exempt; the violation says so.  Scenarios that
% expect rejection or error are not checked.  A success scenario whose
% feasibility cannot be decided is reported by scenario-feasibility-unknown
% instead: absence of a witness is not proof that the scenario is feasible.
check_scenario_feasibility(Violations) :-
    findall(
        Violation,
        scenario_feasibility_violation(Violation),
        Unsorted
    ),
    sort(Unsorted, Violations).

scenario_feasibility_violation(violation(
    'scenario-feasibility',
    ScenarioId,
    Description,
    Suggestion,
    Source
)) :-
    infeasible_scenario(ScenarioId, ReqIds, AssumedFacts, ReqFacts, Reason),
    atomic_list_concat(AssumedFacts, ', ', AssumedText),
    atomic_list_concat(ReqIds, ', ', ReqText),
    atomic_list_concat(ReqFacts, ', ', ReqFactText),
    format(string(Description0),
        "Scenario expects success but assumes ~w, which current requirement ~w forbids via ~w: ~w",
        [AssumedText, ReqText, ReqFactText, Reason]),
    findall(ExceptionId,
        (   member(ReqId, ReqIds),
            unapproved_scenario_exception(ScenarioId, ReqId, ExceptionId)
        ),
        Unapproved0),
    sort(Unapproved0, Unapproved),
    (   Unapproved == []
    ->  Description = Description0,
        format(string(Suggestion),
            "Set expects: rejection on ~w, correct the assumption, or record a human-approved exception requirement (approved_by set) that exempts ~w and is specified_by ~w",
            [ScenarioId, ReqText, ScenarioId])
    ;   atomic_list_concat(Unapproved, ', ', UnapprovedText),
        format(string(Description),
            "~w. An exception exists (~w exempts ~w) but is not approved",
            [Description0, UnapprovedText, ReqText]),
        format(string(Suggestion),
            "Have a human approve ~w by setting approved_by (and optionally approval_ref), or set expects: rejection on ~w, or correct the assumption",
            [UnapprovedText, ScenarioId])
    ),
    (   kb_entity(ScenarioId, scenario, Props),
        memberchk(source=Source, Props)
    ->  true
    ;   Source = ""
    ).

%% infeasible_scenario(?ScenarioId, -ReqIds, -AssumedFacts, -ReqFacts, -Reason)
% implements REQ-kibi-scenario-feasibility
% One blocking witness for a success scenario: sorted lists of current,
% non-exempted requirements, the scenario's assumed facts and the requirement
% facts whose constraints admit no common value.  The witness is
% irreducible: dropping any listed fact leaves a satisfiable set.  The
% blocking rule, the proof ladder and what-if analysis all read this
% predicate, so pairwise and joint infeasibility block alike.
infeasible_scenario(ScenarioId, ReqIds, AssumedFacts, ReqFacts, Reason) :-
    success_scenario(ScenarioId),
    scenario_feasibility_analysis(ScenarioId, analysis(Witnesses, _, _)),
    member(infeasibility(ReqIds, AssumedFacts, ReqFacts, Reason), Witnesses).

success_scenario(ScenarioId) :-
    (   var(ScenarioId)
    ->  findall(Id, scenario_expects(Id, success), Ids0),
        sort(Ids0, Ids),
        member(ScenarioId, Ids)
    ;   scenario_expects(ScenarioId, success)
    ).

scenario_expects(ScenarioId, Outcome) :-
    kb_entity(ScenarioId, scenario, Props),
    memberchk(expects=Raw, Props),
    kb:normalize_term_atom(Raw, Outcome).

%% scenario_exempt(+ScenarioId, +ReqId)
% An approved, current exception requirement exempts ReqId and specifies the
% scenario.
scenario_exempt(ScenarioId, ReqId) :-
    scenario_exception(ScenarioId, ReqId, ExceptionId),
    exception_approved(ExceptionId),
    !.

scenario_exception(ScenarioId, ReqId, ExceptionId) :-
    kb_relationship(exempts, ExceptionId, ReqId),
    kb:current_req(ExceptionId),
    kb_relationship(specified_by, ExceptionId, ScenarioId).

unapproved_scenario_exception(ScenarioId, ReqId, ExceptionId) :-
    scenario_exception(ScenarioId, ReqId, ExceptionId),
    \+ exception_approved(ExceptionId).

%% exception_approved(+ExceptionId)
% An exception counts only once a human approved it: approved_by names them.
exception_approved(ExceptionId) :-
    kb_entity(ExceptionId, req, Props),
    memberchk(approved_by=Raw, Props),
    evidence_text(Raw, Text),
    normalize_space(string(Trimmed), Text),
    Trimmed \== "".

evidence_text(Raw, Text) :-
    kb:unwrap_rdf_value(Raw, Value),
    (   string(Value) -> Text = Value
    ;   atom(Value) -> atom_string(Value, Text)
    ;   term_string(Value, Text)
    ).

%% scenario_feasibility_outcome(?ScenarioId, -Outcome)
% implements REQ-kibi-scenario-feasibility
% The analysis result for a scenario that expects success:
%   infeasible(witness(ReqIds, AssumedFacts, ReqFacts, Reason))
%                            the assumptions cannot hold with the constraints
%                            of current, non-exempted requirements (blocking)
%   unknown(no_assumptions)  the scenario assumes nothing, so nothing can be
%                            checked
%   unknown(contradictory_assumptions(FactIds))
%                            the assumptions cannot hold together on their
%                            own, whatever the requirements say
%   unknown(unmatched_assumption(FactIds))
%                            some assumption is not a property value whose
%                            subject and property a current requirement
%                            constrains in an intersecting scope
%   unknown(incomparable_assumption(FactIds))
%                            some assumption is constrained, but its type,
%                            unit or operator cannot be compared with the
%                            other constraints on that property
%   unknown(conflicting_requirements(ReqIds))
%                            the governing requirements cannot hold together
%                            on that property, so the scenario's own
%                            feasibility cannot be judged (the requirement
%                            contradiction checks report the conflict)
%   feasible_by_exception    the assumptions conflict only with requirements
%                            an approved exception exempts
%   feasible                 every assumption was compared with every
%                            governing constraint and the conjunction of all
%                            of them is satisfiable
% Only infeasible blocks; unknown is a non-blocking quality diagnostic.
scenario_feasibility_outcome(ScenarioId, Outcome) :-
    success_scenario(ScenarioId),
    scenario_feasibility_analysis(ScenarioId, Analysis),
    % Decide the outcome before matching it, so asking for unknown(_) never
    % skips past an infeasible verdict.
    analysis_outcome(Analysis, Outcome0),
    Outcome = Outcome0.

analysis_outcome(analysis([infeasibility(ReqIds, AssumedFacts, ReqFacts, Reason)|_], _, _),
                 infeasible(witness(ReqIds, AssumedFacts, ReqFacts, Reason))) :- !.
analysis_outcome(analysis([], [Reason|_], _), unknown(Reason)) :- !.
analysis_outcome(analysis([], [], true), feasible_by_exception) :- !.
analysis_outcome(analysis([], [], false), feasible).

%% scenario_feasibility_analysis(+ScenarioId, -analysis(Witnesses, Unknowns, ByException))
% implements REQ-kibi-scenario-feasibility
% Every assumed property value and every property value a current
% requirement requires becomes a member constraint on its subject and
% property (unit-canonicalized; a forbid fact contributes the negated
% operator).  Members are grouped by subject and property, and each group is
% split into scope contexts: an unscoped member belongs to every context, a
% scoped member only to its own.  In each context:
%
%   * every comparable (assumption, requirement fact) pair whose constraints
%     admit no common value is a pairwise witness;
%   * assumptions that admit no value on their own are contradictory
%     (advisory);
%   * otherwise, when the assumptions, the governing (non-exempted)
%     requirement constraints and no pairwise witness exist and the
%     conjunction admits no value, an irreducible core of it is a joint
%     witness, unless the requirement constraints alone admit no value;
%   * a context with an incomparable member stays undecided.
%
% Numeric constraints are decided with intervals.pl, with integer semantics
% only when every member of the set is declared int; other value types
% support eq and neq only.  Witnesses are sorted; Unknowns lists the advisory
% reasons in reporting order; ByException is true when some context is
% satisfiable only because an approved exception removed a requirement.
scenario_feasibility_analysis(ScenarioId, analysis(Witnesses, Unknowns, ByException)) :-
    findall(FactId, kb_relationship(assumes, ScenarioId, FactId), Assumed0),
    sort(Assumed0, Assumed),
    (   Assumed == []
    ->  Witnesses = [],
        Unknowns = [no_assumptions],
        ByException = false
    ;   convlist(assumption_member, Assumed, Assumptions),
        requirement_members(Assumptions, Requirements),
        unmatched_assumptions(Assumed, Assumptions, Requirements, Unmatched),
        findall(Context, scenario_context(ScenarioId, Assumptions, Requirements, Context), Contexts),
        foldl(context_results, Contexts, [], Results),
        findall(Witness, member(witness(Witness), Results), Witnesses0),
        sort(Witnesses0, Witnesses),
        result_ids(contradictory, Results, Contradictory),
        result_ids(incomparable, Results, Incomparable),
        result_ids(conflicting_requirements, Results, Conflicting),
        include(nonempty_reason,
            [ contradictory_assumptions(Contradictory),
              unmatched_assumption(Unmatched),
              incomparable_assumption(Incomparable),
              conflicting_requirements(Conflicting)
            ],
            Unknowns),
        (   memberchk(by_exception, Results)
        ->  ByException = true
        ;   ByException = false
        )
    ).

% Assumed facts that are not property values, and property values no current
% requirement constrains on the same subject and property in an intersecting
% scope.
unmatched_assumptions(Assumed, Assumptions, Requirements, Unmatched) :-
    maplist(member_fact, Assumptions, PropertyValueFacts),
    subtract(Assumed, PropertyValueFacts, NotPropertyValues),
    exclude(assumption_matched_by(Requirements), Assumptions, UnmatchedMembers),
    maplist(member_fact, UnmatchedMembers, UnmatchedValues),
    append(NotPropertyValues, UnmatchedValues, Unmatched0),
    sort(Unmatched0, Unmatched).

assumption_matched_by(Requirements, Assumption) :-
    assumption_matched(Assumption, Requirements).

nonempty_reason(Reason) :-
    arg(1, Reason, Ids),
    Ids \== [].

result_ids(Kind, Results, Ids) :-
    findall(Id,
        (   member(Result, Results),
            Result =.. [Kind, ResultIds],
            member(Id, ResultIds)
        ),
        Ids0),
    sort(Ids0, Ids).

% m(Role, Owner, FactId, Subject-Property, Scope, Type, Unit, Op, Value, Text)
% Owner is the fact itself for an assumption and the requirement for a
% requirement fact.  Type, Unit and Value are canonical; Op already carries
% the fact's polarity; Text is the authored constraint for witnesses.
assumption_member(FactId, Member) :-
    property_member(assumption, FactId, FactId, Member).

requirement_members(Assumptions, Requirements) :-
    findall(Key, member(m(_, _, _, Key, _, _, _, _, _, _), Assumptions), Keys0),
    sort(Keys0, Keys),
    findall(Member,
        (   member(Subject-Property, Keys),
            kb:current_req(ReqId),
            kb:effective_req_property_fact(ReqId, Subject, FactId, Property, _, _, _, _, _, _, _, _),
            property_member(requirement, ReqId, FactId, Member)
        ),
        Requirements0),
    sort(Requirements0, Requirements).

property_member(Role, Owner, FactId,
                m(Role, Owner, FactId, Subject-Property, Scope, Type, Unit, Op, Value, Text)) :-
    kb:fact_property_tuple(FactId, Subject, Property, AuthoredOp, ValueType, AuthoredValue, AuthoredUnit, Scope, Polarity),
    !,
    kb:comparison_quantity(ValueType, AuthoredValue, AuthoredUnit, Type, Value, Unit),
    (   polarity_operator(Polarity, AuthoredOp, Op0)
    ->  Op = Op0
    ;   Op = unsupported
    ),
    (   AuthoredUnit == ''
    ->  format(atom(Constraint), '~w ~w', [AuthoredOp, AuthoredValue])
    ;   format(atom(Constraint), '~w ~w ~w', [AuthoredOp, AuthoredValue, AuthoredUnit])
    ),
    (   Polarity == forbid
    ->  format(atom(Text), 'forbid ~w', [Constraint])
    ;   Text = Constraint
    ).

polarity_operator(require, Op, Op).
polarity_operator(forbid, Op, Negated) :- negated_operator(Op, Negated).

negated_operator(eq, neq).
negated_operator(neq, eq).
negated_operator(lt, gte).
negated_operator(gte, lt).
negated_operator(gt, lte).
negated_operator(lte, gt).

member_fact(m(_, _, FactId, _, _, _, _, _, _, _), FactId).
member_owner(m(_, Owner, _, _, _, _, _, _, _, _), Owner).
member_key(Key, m(_, _, _, Key, _, _, _, _, _, _)).
member_scope(m(_, _, _, _, Scope, _, _, _, _, _), Scope).
member_role(Role, m(Role, _, _, _, _, _, _, _, _, _)).

assumption_matched(Assumption, Requirements) :-
    Assumption = m(_, _, _, Key, AssumedScope, _, _, _, _, _),
    member(m(_, _, _, Key, RequiredScope, _, _, _, _, _), Requirements),
    kb:scope_intersects(RequiredScope, AssumedScope),
    !.

% ctx(Key, Assumptions, Governing, Exempt) for one subject/property and one
% scope context.
scenario_context(ScenarioId, Assumptions, Requirements, ctx(Key, As, Governing, Exempt)) :-
    findall(Key0, member(m(_, _, _, Key0, _, _, _, _, _, _), Assumptions), Keys0),
    sort(Keys0, Keys),
    member(Key, Keys),
    include(member_key(Key), Assumptions, KeyAssumptions),
    include(member_key(Key), Requirements, KeyRequirements),
    append(KeyAssumptions, KeyRequirements, KeyMembers),
    findall(Scope,
        (   member(Member, KeyMembers),
            member_scope(Member, Scope),
            Scope \== ''
        ),
        Scopes0),
    sort(Scopes0, Scopes1),
    (   Scopes1 == []
    ->  Scopes = ['']
    ;   Scopes = Scopes1
    ),
    member(Scope, Scopes),
    include(in_scope_context(Scope), KeyAssumptions, As),
    As \== [],
    include(in_scope_context(Scope), KeyRequirements, Required),
    partition(requirement_governs(ScenarioId), Required, Governing, Exempt).

in_scope_context(Context, Member) :-
    member_scope(Member, Scope),
    (   Scope == ''
    ->  true
    ;   Scope == Context
    ).

requirement_governs(ScenarioId, Member) :-
    member_owner(Member, ReqId),
    \+ scenario_exempt(ScenarioId, ReqId).

context_results(ctx(Key, As, Governing, Exempt), Results0, Results) :-
    findall(witness(Witness), pairwise_witness(Key, As, Governing, Witness), Pairwise),
    append(As, Governing, Constrained),
    (   \+ members_comparable(As)
    ->  incomparable_facts(As, [], Ids),
        Joint = [incomparable(Ids)]
    ;   \+ members_satisfiable(As)
    ->  unsat_core(As, Core),
        maplist(member_fact, Core, Ids0),
        sort(Ids0, Ids),
        Joint = [contradictory(Ids)]
    ;   \+ members_comparable(Constrained)
    ->  incomparable_facts(As, Governing, Ids),
        Joint = [incomparable(Ids)]
    ;   members_satisfiable(Constrained)
    ->  (   Exempt \== [],
            append(Constrained, Exempt, WithExempt),
            members_comparable(WithExempt),
            \+ members_satisfiable(WithExempt)
        ->  Joint = [by_exception]
        ;   Joint = []
        )
    ;   Pairwise \== []
    ->  Joint = []
    ;   members_satisfiable(Governing)
    ->  % Drop requirement facts first, so the core names as few
        % requirements as possible.
        append(Governing, As, Ordered),
        unsat_core(Ordered, Core),
        joint_witness(Key, Core, Witness),
        Joint = [witness(Witness)]
    ;   unsat_core(Governing, Core),
        maplist(member_owner, Core, ReqIds0),
        sort(ReqIds0, ReqIds),
        Joint = [conflicting_requirements(ReqIds)]
    ),
    append([Results0, Pairwise, Joint], Results).

pairwise_witness(Key, As, Governing, infeasibility([ReqId], [AssumedFact], [ReqFact], Reason)) :-
    member(Assumption, As),
    member(Required, Governing),
    members_comparable([Assumption, Required]),
    members_satisfiable([Assumption]),
    members_satisfiable([Required]),
    \+ members_satisfiable([Assumption, Required]),
    member_fact(Assumption, AssumedFact),
    member_fact(Required, ReqFact),
    member_owner(Required, ReqId),
    witness_reason(Key, [Assumption], [Required], Reason).

joint_witness(Key, Core, infeasibility(ReqIds, AssumedFacts, ReqFacts, Reason)) :-
    include(member_role(assumption), Core, CoreAssumptions),
    include(member_role(requirement), Core, CoreRequirements),
    maplist(member_fact, CoreAssumptions, AssumedFacts0),
    sort(AssumedFacts0, AssumedFacts),
    maplist(member_fact, CoreRequirements, ReqFacts0),
    sort(ReqFacts0, ReqFacts),
    maplist(member_owner, CoreRequirements, ReqIds0),
    sort(ReqIds0, ReqIds),
    witness_reason(Key, CoreAssumptions, CoreRequirements, Reason).

witness_reason(Subject-Property, Assumptions, Requirements, Reason) :-
    maplist(member_label, Assumptions, AssumedLabels),
    maplist(member_label, Requirements, RequiredLabels),
    atomic_list_concat(AssumedLabels, ', ', AssumedText),
    atomic_list_concat(RequiredLabels, ', ', RequiredText),
    format(atom(Reason),
        'No value of ~w.~w satisfies assumed ~w together with required ~w',
        [Subject, Property, AssumedText, RequiredText]).

member_label(m(_, _, FactId, _, _, _, _, _, _, Text), Label) :-
    format(atom(Label), '~w (~w)', [FactId, Text]).

%% unsat_core(+Members, -Core)
% Members admit no common value.  Drop each member in turn while the rest
% still admits none; what remains is irreducible.
unsat_core(Members, Core) :-
    unsat_core_(Members, [], Core).

unsat_core_([], Kept, Kept).
unsat_core_([Member|Rest], Kept, Core) :-
    append(Kept, Rest, Others),
    (   \+ members_satisfiable(Others)
    ->  unsat_core_(Rest, Kept, Core)
    ;   append(Kept, [Member], Kept1),
        unsat_core_(Rest, Kept1, Core)
    ).

%% members_comparable(+Members)
% Every member can be translated, and every two members have compatible
% types (equal, or int and number) and compatible canonical units (equal,
% or one unspecified).
members_comparable(Members) :-
    forall(member(Member, Members), member_translatable(Member)),
    forall(
        (   select(Left, Members, Others),
            member(Right, Others)
        ),
        members_compatible(Left, Right)
    ).

member_translatable(m(_, _, _, _, _, Type, _, Op, Value, _)) :-
    (   kb:is_numeric_type(Type)
    ->  number(Value),
        memberchk(Op, [eq, neq, lt, lte, gt, gte])
    ;   memberchk(Op, [eq, neq])
    ).

members_compatible(m(_, _, _, _, _, TypeA, UnitA, _, _, _), m(_, _, _, _, _, TypeB, UnitB, _, _, _)) :-
    kb:compatible_types(TypeA, TypeB),
    kb:unit_compatible(UnitA, UnitB).

% Assumptions that cannot be translated or are incompatible with another
% member; when the incompatibility lies elsewhere, every assumption of the
% context is undecided.
incomparable_facts(As, Others, Ids) :-
    append(As, Others, Members),
    include(assumption_incomparable(Members), As, Incomparable),
    (   Incomparable == []
    ->  maplist(member_fact, As, Ids0)
    ;   maplist(member_fact, Incomparable, Ids0)
    ),
    sort(Ids0, Ids).

assumption_incomparable(Members, Assumption) :-
    member(Other, Members),
    Other \== Assumption,
    \+ members_compatible(Assumption, Other),
    !.
assumption_incomparable(_, Assumption) :-
    \+ member_translatable(Assumption).

%% members_satisfiable(+Members)
% Some value satisfies every member.  Members must be comparable.  Numeric
% members are decided by intervals.pl over the integers only when every
% member is declared int; other types support eq and neq.
members_satisfiable([]) :- !.
members_satisfiable(Members) :-
    Members = [m(_, _, _, _, _, Type, _, _, _, _)|_],
    (   kb:is_numeric_type(Type)
    ->  maplist(member_constraint(Variable), Members, Constraints),
        (   forall(member(m(_, _, _, _, _, MemberType, _, _, _, _), Members), MemberType == int)
        ->  Integers = [Variable]
        ;   Integers = []
        ),
        numeric_constraints_satisfiable(Constraints, Integers)
    ;   symbolic_members_satisfiable(Type, Members)
    ).

member_constraint(Variable, m(_, _, _, _, _, _, _, Op, Value, _), c(Op, Variable, Value)).

symbolic_members_satisfiable(Type, Members) :-
    findall(Value, member(m(_, _, _, _, _, _, _, eq, Value, _), Members), Equal0),
    sort(Equal0, Equal),
    findall(Value, member(m(_, _, _, _, _, _, _, neq, Value, _), Members), Different0),
    sort(Different0, Different),
    symbolic_values_satisfiable(Type, Equal, Different).

% At most one required value, not excluded; with none required, a bool
% property still needs one of true and false left.  Two different required
% values never hold together.
symbolic_values_satisfiable(_, [Value], Different) :-
    \+ value_excluded(Value, Different).
symbolic_values_satisfiable(Type, [], Different) :-
    \+ bool_domain_exhausted(Type, Different).

value_excluded(Value, Different) :-
    member(Excluded, Different),
    Excluded == Value,
    !.

bool_domain_exhausted(bool, Different) :-
    maplist(bool_atom, Different, Atoms),
    memberchk(true, Atoms),
    memberchk(false, Atoms).

bool_atom(Value, Atom) :-
    (   atom(Value) -> Atom = Value
    ;   string(Value) -> atom_string(Atom, Value)
    ;   Atom = Value
    ).

%% check_scenario_feasibility_unknown(-Violations)
% implements REQ-kibi-scenario-feasibility
% Advisory: success scenarios whose feasibility the checker cannot decide.
check_scenario_feasibility_unknown(Violations) :-
    findall(Violation, scenario_feasibility_unknown_violation(Violation), Unsorted),
    sort(Unsorted, Violations).

scenario_feasibility_unknown_violation(violation(
    'scenario-feasibility-unknown',
    ScenarioId,
    Description,
    Suggestion,
    Source
)) :-
    scenario_feasibility_outcome(ScenarioId, unknown(Reason)),
    unknown_feasibility_text(Reason, Description, Suggestion),
    (   kb_entity(ScenarioId, scenario, Props),
        memberchk(source=Source, Props)
    ->  true
    ;   Source = ""
    ).

unknown_feasibility_text(no_assumptions,
    "Scenario expects success but assumes nothing, so its feasibility against current requirements is unknown",
    "Link the property values the scenario relies on with assumes facts so feasibility can be checked").
unknown_feasibility_text(contradictory_assumptions(FactIds), Description,
    "Correct the assumed facts so they can hold together; a scenario whose assumptions contradict each other describes no situation") :-
    atomic_list_concat(FactIds, ', ', FactText),
    format(string(Description),
        "Scenario expects success but its feasibility is unknown: assumptions ~w cannot hold together",
        [FactText]).
unknown_feasibility_text(unmatched_assumption(FactIds), Description,
    "Constrain the assumed subject and property with a current requirement, or correct the assumed fact's subject_key/property_key") :-
    atomic_list_concat(FactIds, ', ', FactText),
    format(string(Description),
        "Scenario expects success but its feasibility is unknown: assumption ~w is not constrained by any current requirement",
        [FactText]).
unknown_feasibility_text(incomparable_assumption(FactIds), Description,
    "Align the value_type and unit of the assumed fact with the requirement facts on that property (int and number compare; units must match or be convertible), and use eq or neq for non-numeric values") :-
    atomic_list_concat(FactIds, ', ', FactText),
    format(string(Description),
        "Scenario expects success but its feasibility is unknown: assumption ~w cannot be compared with the requirement constraints on its property (type, unit or operator mismatch)",
        [FactText]).
unknown_feasibility_text(conflicting_requirements(ReqIds), Description,
    "Resolve the conflict between these requirements (see the contradiction checks) before judging the scenario") :-
    atomic_list_concat(ReqIds, ', ', ReqText),
    format(string(Description),
        "Scenario expects success but its feasibility is unknown: requirements ~w admit no common value for an assumed property",
        [ReqText]).

%% check_req_status_vocabulary(-Violations)
% Rejects requirement statuses outside the canonical+legacy vocabulary.
% Requirement documents carrying ADR vocabulary (e.g. `status: accepted`)
% compile and pass schema validation, then silently fall out of
% current_req/1 — the proof ladder reports them not_applicable with no
% signal. This rule surfaces the vocabulary mismatch at check time instead.
canonical_req_statuses([open, in_progress, closed]).
legacy_req_statuses([active, approved]).

check_req_status_vocabulary(Violations) :-
    findall(
        Violation,
        req_status_vocabulary_violation(Violation),
        Violations
    ).

req_status_vocabulary_violation(violation(
    'req-status-vocabulary',
    ReqId,
    Description,
    Suggestion,
    Source
)) :-
    kb_entity(ReqId, req, Props),
    memberchk(status=RawStatus, Props),
    normalize_term_atom(RawStatus, StatusAtom),
    canonical_req_statuses(Canonical),
    legacy_req_statuses(Legacy),
    \+ (memberchk(StatusAtom, Canonical) ; memberchk(StatusAtom, Legacy)),
    format(string(Description), "Requirement status '~w' is not a current requirement status; it is silently excluded from the proof ladder", [StatusAtom]),
    format(string(Suggestion), "Set status to one of open, in_progress, closed (legacy: active, approved). To park a current requirement out of E2E-proof scope, use proof_exempt: true with proof_exempt_reason instead of an ADR status", []),
    violation_source(ReqId, req, Source).

%% check_strict_fact_shape(-Violations)
% Finds all strict facts (with fact_kind) that have malformed shape.
% Only checks facts with fact_kind present; legacy facts without fact_kind are ignored.
% implements REQ-006
check_strict_fact_shape(Violations) :-
    findall(
        Violation,
        strict_fact_shape_violation(Violation),
        Violations0
    ),
    sort(Violations0, Violations).

strict_fact_shape_violation(violation(
    'strict-fact-shape',
    FactId,
    Description,
    Suggestion,
    Source
)) :-
    kb_entity(FactId, fact, Props),
    memberchk(fact_kind=RawKind, Props),  % Only check facts with fact_kind
    normalize_term_atom(RawKind, Kind),   % Handle typed literals like ^^(subject, xsd:string)
    
    % Check for malformed shape based on fact kind
    (   Kind = subject
    ->  (   memberchk(subject_key=_, Props)
        ->  fail  % Well-formed, no violation
        ;   Description = "Subject fact missing required field: subject_key",
            Suggestion = "Add subject_key to define the subject domain key"
        )
    ;   Kind = property_value
    ->  findall(Msg, property_value_shape_error(Props, Msg), Errors),
        (   Errors = []
        ->  fail  % Well-formed, no violation
        ;   Errors = [First|_],
            Description = First,
            Suggestion = "Ensure property_value facts have subject_key, property_key, operator, value_type, and exactly one value field"
        )
    ;   Kind = observation
    ->  fail  % Observation facts have no required fields beyond fact_kind
    ;   Kind = meta
    ->  fail  % Meta facts have no required fields beyond fact_kind
    ;   Kind = predicate_schema
    ->  findall(Msg, predicate_schema_shape_error(Props, Msg), Errors),
        (   Errors = []
        ->  fail
        ;   Errors = [First|_],
            Description = First,
            Suggestion = "Ensure predicate_schema facts have predicate_name, predicate_arity, argument_names, and argument_types with matching arity"
        )
    ;   Kind = predicate
    ->  findall(Msg, predicate_shape_error(Props, Msg), Errors),
        (   Errors = []
        ->  fail
        ;   Errors = [First|_],
            Description = First,
            Suggestion = "Ensure predicate facts have predicate_name, non-empty predicate_args, canonical_key, and assert/deny polarity when present"
        )
    ;   Kind = rule_schema
    ->  findall(Msg, rule_schema_shape_error(Props, Msg), Errors),
        (   Errors = []
        ->  fail
        ;   Errors = [First|_],
            Description = First,
            Suggestion = "Ensure rule_schema facts declare rule_name plus same-length argument_names and argument_types"
        )
    ;   Kind = rule
    ->  findall(Msg, rule_shape_error(Props, Msg), Errors),
        (   Errors = []
        ->  fail
        ;   Errors = [First|_],
            Description = First,
            Suggestion = "Ensure rule facts contain a safe kibi.logic.v1 rule_ir, full rule_hash, rule_schema_id, rule_name, and semantic_key"
        )
    ;   % Unknown fact_kind - report as malformed
        format(string(Description), "Unknown fact_kind: ~w", [Kind]),
        Suggestion = "Use one of: subject, property_value, observation, meta, predicate_schema, predicate, rule_schema, rule"
    ),
    
    (   memberchk(source=Source0, Props)
    ->  normalize_term_atom(Source0, Source)
    ;   Source = ""
    ).

% property_value_shape_error(+Props, -ErrorMsg)
% Returns an error message if the property_value fact has a shape error.
property_value_shape_error(Props, "Property value fact missing required field: subject_key") :-
    \+ memberchk(subject_key=_, Props).
property_value_shape_error(Props, "Property value fact missing required field: property_key") :-
    memberchk(subject_key=_, Props),
    \+ memberchk(property_key=_, Props).
property_value_shape_error(Props, "Property value fact missing required field: operator") :-
    memberchk(property_key=_, Props),
    \+ memberchk(operator=_, Props).
property_value_shape_error(Props, "Property value fact missing required field: value_type") :-
    memberchk(operator=_, Props),
    \+ memberchk(value_type=_, Props).
property_value_shape_error(Props, "Property value fact missing value field (value_string, value_int, value_number, or value_bool)") :-
    memberchk(value_type=_, Props),
    \+ has_value_field(Props).
property_value_shape_error(Props, "Property value fact has multiple value fields (should have exactly one)") :-
    findall(F, (member(F=_, Props), is_value_field(F)), Fields),
    length(Fields, Count),
    Count > 1.
property_value_shape_error(Props, "Property value fact value_type does not match value field") :-
    memberchk(value_type=RawVT, Props),
    normalize_term_atom(RawVT, VT),
    \+ value_type_matches_field(VT, Props).

% is_value_field(+Field)
is_value_field(value_string).
is_value_field(value_int).
is_value_field(value_number).
is_value_field(value_bool).

has_value_field(Props) :- memberchk(value_string=_, Props), !.
has_value_field(Props) :- memberchk(value_int=_, Props), !.
has_value_field(Props) :- memberchk(value_number=_, Props), !.
has_value_field(Props) :- memberchk(value_bool=_, Props), !.

% value_type_matches_field(+ValueType, +Props)
value_type_matches_field(string, Props) :- memberchk(value_string=_, Props), !.
value_type_matches_field(int, Props) :- memberchk(value_int=_, Props), !.
value_type_matches_field(number, Props) :- memberchk(value_number=_, Props), !.
value_type_matches_field(bool, Props) :- memberchk(value_bool=_, Props), !.

predicate_schema_shape_error(Props, "Predicate schema fact missing required field: predicate_name") :-
    \+ memberchk(predicate_name=_, Props).
predicate_schema_shape_error(Props, "Predicate schema fact missing required field: predicate_arity") :-
    memberchk(predicate_name=_, Props),
    \+ memberchk(predicate_arity=_, Props).
predicate_schema_shape_error(Props, "Predicate schema fact missing required field: argument_names") :-
    memberchk(predicate_arity=_, Props),
    \+ memberchk(argument_names=_, Props).
predicate_schema_shape_error(Props, "Predicate schema fact missing required field: argument_types") :-
    memberchk(argument_names=_, Props),
    \+ memberchk(argument_types=_, Props).
predicate_schema_shape_error(Props, "Predicate schema fact argument_names length must match predicate_arity") :-
    memberchk(predicate_arity=RawArity, Props),
    checks_normalize_integer(RawArity, Arity),
    memberchk(argument_names=RawNames, Props),
    checks_normalize_atom_list(RawNames, Names),
    length(Names, Count),
    Count =\= Arity.
predicate_schema_shape_error(Props, "Predicate schema fact argument_types length must match predicate_arity") :-
    memberchk(predicate_arity=RawArity, Props),
    checks_normalize_integer(RawArity, Arity),
    memberchk(argument_types=RawTypes, Props),
    checks_normalize_atom_list(RawTypes, Types),
    length(Types, Count),
    Count =\= Arity.

predicate_shape_error(Props, "Predicate fact missing required field: predicate_name") :-
    \+ memberchk(predicate_name=_, Props).
predicate_shape_error(Props, "Predicate fact missing required field: predicate_args") :-
    memberchk(predicate_name=_, Props),
    \+ memberchk(predicate_args=_, Props).
predicate_shape_error(Props, "Predicate fact predicate_args must be non-empty") :-
    memberchk(predicate_args=RawArgs, Props),
    checks_normalize_atom_list(RawArgs, Args),
    Args = [].
predicate_shape_error(Props, "Predicate fact missing required field: canonical_key") :-
    memberchk(predicate_args=_, Props),
    \+ memberchk(canonical_key=_, Props).
predicate_shape_error(Props, "Predicate fact polarity must be assert or deny") :-
    memberchk(polarity=RawPolarity, Props),
    normalize_term_atom(RawPolarity, Polarity),
    \+ memberchk(Polarity, [assert, deny]).

rule_schema_shape_error(Props, "Rule schema fact missing required field: rule_name") :-
    \+ memberchk(rule_name=_, Props).
rule_schema_shape_error(Props, "Rule schema fact missing required field: argument_names") :-
    memberchk(rule_name=_, Props),
    \+ memberchk(argument_names=_, Props).
rule_schema_shape_error(Props, "Rule schema fact missing required field: argument_types") :-
    memberchk(argument_names=_, Props),
    \+ memberchk(argument_types=_, Props).
rule_schema_shape_error(Props, "Rule schema fact argument_names and argument_types must have equal lengths") :-
    memberchk(argument_names=RawNames, Props),
    memberchk(argument_types=RawTypes, Props),
    checks_normalize_atom_list(RawNames, Names),
    checks_normalize_atom_list(RawTypes, Types),
    length(Names, NameCount),
    length(Types, TypeCount),
    NameCount =\= TypeCount.

rule_shape_error(Props, "Rule fact missing required field: rule_ir") :-
    \+ memberchk(rule_ir=_, Props).
rule_shape_error(Props, "Rule fact missing required field: rule_hash") :-
    memberchk(rule_ir=_, Props),
    \+ memberchk(rule_hash=_, Props).
rule_shape_error(Props, "Rule fact missing required field: rule_schema_id") :-
    memberchk(rule_hash=_, Props),
    \+ memberchk(rule_schema_id=_, Props).
rule_shape_error(Props, "Rule fact missing required field: rule_name") :-
    memberchk(rule_schema_id=_, Props),
    \+ memberchk(rule_name=_, Props).
rule_shape_error(Props, "Rule fact missing required field: semantic_key") :-
    memberchk(rule_name=_, Props),
    \+ memberchk(semantic_key=_, Props).
rule_shape_error(Props, "Rule fact rule_ir failed kibi.logic.v1 safety validation") :-
    memberchk(rule_ir=_, Props),
    logic_rule_safety(Props, Errors),
    Errors \= [].

checks_normalize_integer(Raw, Integer) :-
    (   Raw = ^^(Value, _Type)
    ->  checks_normalize_integer(Value, Integer)
    ;   integer(Raw)
    ->  Integer = Raw
    ;   atom(Raw)
    ->  atom_number(Raw, Integer)
    ;   string(Raw)
    ->  number_string(Integer, Raw)
    ).

checks_normalize_atom_list(Raw, Atoms) :-
    (   Raw = ^^(Value, _Type)
    ->  checks_normalize_atom_list(Value, Atoms)
    ;   is_list(Raw)
    ->  maplist(normalize_term_atom, Raw, Atoms)
    ;   Atoms = []
    ).

%% check_domain_contradictions(-Violations)
% Finds all pairs of requirements with contradicting required properties.
check_domain_contradictions(Violations) :-
    check_domain_contradiction_witnesses(Witnesses),
    maplist(contradiction_witness_violation, Witnesses, Violations).

%% check_domain_contradictions_and_witnesses(-Violations, -Witnesses)
% Compute the contradiction witness graph once when a caller needs both the
% report violations and their exact evidence. The existing one-result
% predicates remain unchanged; this paired form avoids duplicate work in
% proof contexts without weakening any contradiction checks.
check_domain_contradictions_and_witnesses(Violations, Witnesses) :-
    check_domain_contradiction_witnesses(Witnesses),
    maplist(contradiction_witness_violation, Witnesses, Violations).

%% check_domain_contradiction_witnesses(-Witnesses)
% Exact, JSON-safe evidence for every strict-property, ground-predicate, and
% safe-rule contradiction result.  Rule overlap that cannot be proven or
% disproven remains status=unresolved rather than becoming consistency.
check_domain_contradiction_witnesses(Witnesses) :-
    findall(Witness, req_conflict_witness(_ReqA, _ReqB, Witness), GroundWitnesses),
    findall(Witness, rule_contradiction_witness(Witness), RuleWitnesses),
    append(GroundWitnesses, RuleWitnesses, Witnesses0),
    sort(Witnesses0, Witnesses).

%% what_if_contradiction_witnesses(+Entries, -Witnesses)
% implements REQ-kibi-truthful-consistency
% Contradiction witnesses for the KB as it would be after staging Entries,
% computed inside an RDF transaction that is always rolled back.  Entries are
% upsert(Type, Props, Relationships) or relate(Relationships) terms, with
% relationships as rel(Type, From, To, Metadata).  Staging validates entities
% and relationships exactly as a commit would, so an invalid plan raises the
% same error here before anything is written.  See what_if_analysis/2 for the
% before/after comparison that also covers scenario feasibility.
what_if_contradiction_witnesses(Entries, Witnesses) :-
    what_if_analysis(Entries, Analysis),
    Witnesses = Analysis.witnesses.

what_if_contradiction_witnesses_json(Entries, JsonString) :-
    what_if_contradiction_witnesses(Entries, Witnesses),
    with_output_to_string(
        json_write_dict(current_output, Witnesses, [width(0)]),
        JsonString
    ).

%% what_if_analysis(+Entries, -Analysis)
% implements REQ-kibi-truthful-consistency
% Compare the current KB with the KB after staging Entries (rolled back).
% Both sides cover domain contradictions (property, predicate and rule
% witnesses) and scenario infeasibility witnesses (kind scenario_feasibility).
% Analysis is a dict with
%   witnesses   staged contradiction witnesses (what_if_contradiction_witnesses/2)
%   before      every witness of the current KB
%   after       every witness of the staged KB
%   introduced  after-witnesses with no matching current witness
%   removed     current witnesses the plan resolves
%   unchanged   after-witnesses that already existed
% Witnesses are matched by kind, status, requirements, facts and scenario, so
% rewording a fact's prose does not make an existing conflict look new.
% The entity index is not transactional, so every staged id is re-indexed
% from the restored store.
what_if_analysis(Entries, Analysis) :-
    findall(Id, (member(Entry, Entries), what_if_entry_id(Entry, Id)), Ids0),
    sort(Ids0, Ids),
    with_kb_mutex(
        call_cleanup(
            (   checks:what_if_witnesses(BeforeContradictions, BeforeInfeasible),
                catch(
                    rdf_transaction((
                        checks:what_if_stage(Entries),
                        checks:what_if_witnesses(StagedContradictions, StagedInfeasible),
                        throw(kibi_what_if_result(StagedContradictions, StagedInfeasible))
                    )),
                    kibi_what_if_result(AfterContradictions, AfterInfeasible),
                    true
                )
            ),
            forall(member(Id, Ids), kb:kb_refresh_entity_index(Id))
        )
    ),
    append(BeforeContradictions, BeforeInfeasible, Before),
    append(AfterContradictions, AfterInfeasible, After),
    include(what_if_witness_absent(Before), After, Introduced),
    include(what_if_witness_absent(After), Before, Removed),
    exclude(what_if_witness_absent(Before), After, Unchanged),
    Analysis = _{
        witnesses: AfterContradictions,
        before: Before,
        after: After,
        introduced: Introduced,
        removed: Removed,
        unchanged: Unchanged
    }.

what_if_analysis_json(Entries, JsonString) :-
    what_if_analysis(Entries, Analysis),
    with_output_to_string(
        json_write_dict(current_output, Analysis, [width(0)]),
        JsonString
    ).

what_if_witnesses(Contradictions, Infeasible) :-
    check_domain_contradiction_witnesses(Contradictions),
    findall(Witness, scenario_infeasibility_witness(Witness), Infeasible0),
    sort(Infeasible0, Infeasible).

% implements REQ-kibi-scenario-feasibility
scenario_infeasibility_witness(_{
    kind: scenario_feasibility,
    status: infeasible,
    requirements: ReqIds,
    scenario: ScenarioId,
    assumedFacts: AssumedFacts,
    requirementFacts: ReqFacts,
    reason: ReasonText
}) :-
    infeasible_scenario(ScenarioId, ReqIds, AssumedFacts, ReqFacts, Reason),
    atomic_list_concat(AssumedFacts, ', ', AssumedText),
    atomic_list_concat(ReqIds, ', ', ReqText),
    atomic_list_concat(ReqFacts, ', ', ReqFactText),
    format(string(ReasonText),
        "Scenario ~w expects success but assumes ~w, which ~w forbids via ~w: ~w",
        [ScenarioId, AssumedText, ReqText, ReqFactText, Reason]).

what_if_witness_absent(Witnesses, Witness) :-
    what_if_witness_key(Witness, Key),
    \+ ( member(Other, Witnesses), what_if_witness_key(Other, Key) ).

what_if_witness_key(Witness, key(Kind, Status, Requirements, Facts, Scenario)) :-
    witness_field(Witness, kind, Kind),
    witness_field(Witness, status, Status),
    witness_field(Witness, requirements, Requirements),
    witness_field(Witness, scenario, Scenario),
    findall(FactId,
        (   member(Side, [left, right]),
            get_dict(Side, Witness, SideDict),
            is_dict(SideDict),
            get_dict(factId, SideDict, FactId)
        ;   member(Field, [assumedFacts, requirementFacts]),
            get_dict(Field, Witness, FieldFacts),
            member(FactId, FieldFacts)
        ),
        Facts0),
    sort(Facts0, Facts).

witness_field(Witness, Field, Value) :-
    (   get_dict(Field, Witness, Value0) -> Value = Value0 ; Value = none ).

what_if_entry_id(upsert(_, Props, _), Id) :- memberchk(id=Id, Props).
what_if_entry_id(upsert(_, _, Rels), Id) :- what_if_relationship_id(Rels, Id).
what_if_entry_id(relate(Rels), Id) :- what_if_relationship_id(Rels, Id).

what_if_relationship_id(Rels, Id) :-
    member(rel(_, From, To, _), Rels),
    member(Id, [From, To]).

% Entities first, then every relationship, so a step may relate to an entity
% that a later step of the same plan creates.
what_if_stage(Entries) :-
    forall(member(upsert(Type, Props, _), Entries),
        kb_assert_entity_no_audit(Type, Props)),
    forall(
        (   member(Entry, Entries),
            (Entry = upsert(_, _, Rels) ; Entry = relate(Rels))
        ),
        what_if_stage_relationships(Rels)).

what_if_stage_relationships(Rels) :-
    forall(member(rel(Type, From, To, Metadata), Rels),
        kb_assert_relationship_no_audit(Type, From, To, Metadata)).

contradiction_witness_violation(Witness, violation(
    'domain-contradictions',
    EntityId,
    Description,
    Suggestion,
    ""
)) :-
    Witness.requirements = [ReqA, ReqB],
    format(string(EntityId), "~w/~w", [ReqA, ReqB]),
    (   Witness.kind == rule
    ->  Description = Witness.reason,
        Suggestion = "Align the opposing rule heads, separate their scopes, or add an explicit supersedes relationship"
    ;   format(string(Description), "~w [strict-readiness: contradiction-ready]", [Witness.reason]),
        Suggestion = "Supersede one requirement or align both to the same canonical logical term"
    ).

opposing_rule_requirements(ReqA, ReqB, RuleA, RuleB) :-
    opposing_rule_requirement_facts(ReqA, ReqB, _FactA, _FactB, RuleA, RuleB).

% Each unordered pair of (requirement, rule fact) endpoints is compared once,
% ordered by the requirement-fact pair: ordering requirements and facts
% independently would never compare REQ-A->FACT-Z with REQ-Z->FACT-A.
opposing_rule_requirement_facts(ReqA, ReqB, FactA, FactB, RuleA, RuleB) :-
    kb:current_req(ReqA),
    kb:current_req(ReqB),
    ReqA \== ReqB,
    kb_relationship(requires_rule, ReqA, FactA),
    kb_relationship(requires_rule, ReqB, FactB),
    FactA \== FactB,
    ReqA-FactA @< ReqB-FactB,
    kb_entity(FactA, fact, PropsA),
    kb_entity(FactB, fact, PropsB),
    memberchk(fact_kind=KindA, PropsA),
    memberchk(fact_kind=KindB, PropsB),
    normalize_term_atom(KindA, rule),
    normalize_term_atom(KindB, rule),
    logic_rule_from_props(PropsA, RuleA),
    logic_rule_from_props(PropsB, RuleB).

rule_contradiction_witness(Witness) :-
    opposing_rule_requirement_facts(ReqA, ReqB, FactA, FactB, RuleA, RuleB),
    logic_rule_conflict_witness(RuleA, RuleB, InternalWitness),
    InternalWitness.status \= disjoint,
    rule_conflict_side(ReqA, FactA, Left),
    rule_conflict_side(ReqB, FactB, Right),
    rule_comparison_evidence(InternalWitness, Comparison),
    format(string(Reason), "Rule conflict (~w) between ~w and ~w", [InternalWitness.status, ReqA, ReqB]),
    Witness = _{
        kind: rule,
        status: InternalWitness.status,
        requirements: [ReqA, ReqB],
        reason: Reason,
        left: Left,
        right: Right,
        comparison: Comparison
    }.

%% check_rule_key_arguments_missing(-Violations)
% implements REQ-kibi-truthful-consistency
% Advisory: an opposing rule pair that stays unresolved only because a body
% predicate declares no key_arguments.  Without the declaration the
% predicate is multivalued, so atoms of the two bodies are never read as the
% same fact; declaring the listed key positions would decide the pair.  The
% finding names the requirements, the rule facts, the predicate
% (namespace:name/arity) and the deciding key positions (with argument names
% when a predicate_schema exists).  It never claims the predicate is
% functional: a genuinely multivalued predicate should stay undeclared.
check_rule_key_arguments_missing(Violations) :-
    functional_predicate_declarations(Functional),
    findall(Violation, rule_key_arguments_missing_violation(Functional, Violation), Unsorted),
    sort(Unsorted, Violations).

rule_key_arguments_missing_violation(Functional, violation(
    'rule-key-arguments-missing',
    EntityId,
    Description,
    Suggestion,
    ""
)) :-
    opposing_rule_requirement_facts(ReqA, ReqB, FactA, FactB, RuleA, RuleB),
    logic_rule_missing_keys(RuleA, RuleB, Functional, Missing),
    member(missing_keys(Namespace, Name, Arity, KeySets), Missing),
    format(string(EntityId), "~w/~w", [ReqA, ReqB]),
    maplist(key_set_text(Namespace, Name, Arity), KeySets, KeyTexts),
    atomic_list_concat(KeyTexts, ' or ', KeyText),
    format(string(Description),
        "Opposing rules ~w (~w) and ~w (~w) stay unresolved because predicate ~w:~w/~w declares no key_arguments; declaring key_arguments ~w would decide the pair",
        [FactA, ReqA, FactB, ReqB, Namespace, Name, Arity, KeyText]),
    format(string(Suggestion),
        "If the remaining arguments of ~w:~w/~w are determined by ~w, add key_arguments to its predicate_schema fact; if the predicate is genuinely multivalued, leave it undeclared and accept the unresolved result",
        [Namespace, Name, Arity, KeyText]).

key_set_text(Namespace, Name, Arity, Keys, Text) :-
    (   kb:predicate_schema(_, Namespace, Name, Arity, ArgumentNames, _),
        length(ArgumentNames, Arity)
    ->  findall(ArgumentName, (member(Position, Keys), nth1(Position, ArgumentNames, ArgumentName)), Names),
        atomic_list_concat(Names, ', ', NameText),
        format(atom(Text), '[~w]', [NameText])
    ;   atomic_list_concat(Keys, ', ', PositionText),
        format(atom(Text), '[positions ~w]', [PositionText])
    ).

rule_conflict_side(ReqId, FactId, Side) :-
    evidence_entity_source(ReqId, req, RequirementSource),
    kb_entity(FactId, fact, Props),
    evidence_property_text(Props, source, FactSource),
    evidence_property_text(Props, claim_key, ClaimKey),
    evidence_property_text(Props, claim_text, ClaimText),
    evidence_property_text(Props, rule_hash, RuleHash),
    evidence_property_text(Props, semantic_key, SemanticKey),
    evidence_property_text(Props, rule_ir, RuleIr),
    evidence_property_integer(Props, claim_span_start, ClaimSpanStart),
    evidence_property_integer(Props, claim_span_end, ClaimSpanEnd),
    Side = _{
        requirementId: ReqId,
        requirementSource: RequirementSource,
        factId: FactId,
        factSource: FactSource,
        claimKey: ClaimKey,
        claimText: ClaimText,
        claimSpan: _{start: ClaimSpanStart, end: ClaimSpanEnd},
        ruleHash: RuleHash,
        semanticKey: SemanticKey,
        ruleIr: RuleIr
    }.

rule_comparison_evidence(Internal, Evidence) :-
    term_string(Internal.head_a, HeadA, [quoted(true), max_depth(0)]),
    term_string(Internal.head_b, HeadB, [quoted(true), max_depth(0)]),
    term_string(Internal.body_a, BodyA, [quoted(true), max_depth(0)]),
    term_string(Internal.body_b, BodyB, [quoted(true), max_depth(0)]),
    term_string(Internal.scope_a, ScopeA, [quoted(true), max_depth(0)]),
    term_string(Internal.scope_b, ScopeB, [quoted(true), max_depth(0)]),
    Evidence = _{
        modalityA: Internal.modality_a,
        modalityB: Internal.modality_b,
        headA: HeadA,
        headB: HeadB,
        bodyA: BodyA,
        bodyB: BodyB,
        scopeA: ScopeA,
        scopeB: ScopeB,
        validFromA: Internal.valid_from_a,
        validToA: Internal.valid_to_a,
        validFromB: Internal.valid_from_b,
        validToB: Internal.valid_to_b,
        ruleSchemaA: Internal.rule_schema_a,
        ruleSchemaB: Internal.rule_schema_b
    }.

evidence_entity_source(EntityId, Type, Source) :-
    kb_entity(EntityId, Type, Props),
    evidence_property_text(Props, source, Source).

evidence_property_text(Props, Key, Text) :-
    (memberchk(Key=Raw, Props) -> evidence_term_text(Raw, Text) ; Text = '').

evidence_property_integer(Props, Key, Integer) :-
    (memberchk(Key=Raw, Props), catch(checks_normalize_integer(Raw, Integer), _, fail) -> true ; Integer = -1).

evidence_term_text(Raw, Text) :-
    (   Raw = ^^(Value, _Type)
    ->  evidence_term_text(Value, Text)
    ;   Raw = literal(type(_, Value))
    ->  evidence_term_text(Value, Text)
    ;   atom(Raw)
    ->  Text = Raw
    ;   string(Raw)
    ->  atom_string(Text, Raw)
    ;   term_string(Raw, String), atom_string(Text, String)
    ).

%% check_strict_req_fact_pairing(-Violations)
% Finds current requirements attempting strict-lane modeling with incomplete
% subject/property pairing or wrong-lane fact targets.
check_strict_req_fact_pairing(Violations) :-
    findall(
        Violation,
        strict_req_fact_pairing_violation(Violation),
        Violations0
    ),
    sort(Violations0, Violations).

strict_req_fact_pairing_violation(violation(
    'strict-req-fact-pairing',
    ReqId,
    Description,
    Suggestion,
    Source
)) :-
    strict_req_fact_pairing_issue(ReqId, Description, Suggestion),
    violation_source(ReqId, req, Source).

strict_req_fact_pairing_issue(
    ReqId,
    Description,
    "Add a property_value fact via requires_property for the same subject_key"
) :-
    kb:current_req(ReqId),
    kb_relationship(constrains, ReqId, SubjectFactId),
    strict_req_fact_pairing_fact_kind(SubjectFactId, subject),
    kb:fact_subject_key(SubjectFactId, SubjectKey),
    \+ kb:effective_req_property_fact(
        ReqId,
        SubjectKey,
        _PropertyFactId,
        _PropertyKey,
        _Operator,
        _ValueType,
        _Value,
        _Unit,
        _Scope,
        _Polarity,
        _ValidFrom,
        _ValidTo
    ),
    format(
        string(Description),
        "Requirement constrains ~w (~w) but has no matching strict requires_property fact",
        [SubjectFactId, SubjectKey]
    ).

strict_req_fact_pairing_issue(
    ReqId,
    Description,
    "Add a subject fact via constrains for the same subject_key or remove the mismatched requires_property link"
) :-
    kb:current_req(ReqId),
    kb_relationship(requires_property, ReqId, PropertyFactId),
    strict_req_fact_pairing_fact_kind(PropertyFactId, property_value),
    kb:fact_property_tuple(
        PropertyFactId,
        SubjectKey,
        _PropertyKey,
        _Operator,
        _ValueType,
        _Value,
        _Unit,
        _Scope,
        _Polarity
    ),
    \+ kb:effective_req_property_fact(
        ReqId,
        SubjectKey,
        PropertyFactId,
        _MatchedPropertyKey,
        _MatchedOperator,
        _MatchedValueType,
        _MatchedValue,
        _MatchedUnit,
        _MatchedScope,
        _MatchedPolarity,
        _MatchedValidFrom,
        _MatchedValidTo
    ),
    format(
        string(Description),
        "Requirement requires_property ~w (~w) but has no matching strict subject fact via constrains",
        [PropertyFactId, SubjectKey]
    ).

strict_req_fact_pairing_issue(
    ReqId,
    Description,
    "Use a subject fact with constrains for contradiction-safe semantics; keep non-subject facts out of strict pairing"
) :-
    kb:current_req(ReqId),
    kb_relationship(constrains, ReqId, FactId),
    strict_req_fact_pairing_fact_kind(FactId, Kind),
    Kind \= subject,
    strict_req_fact_pairing_kind_label(Kind, KindLabel),
    format(
        string(Description),
        "Requirement links ~w via constrains using ~w; contradiction-safe constrains links must target subject facts",
        [FactId, KindLabel]
    ).

strict_req_fact_pairing_issue(
    ReqId,
    Description,
    "Use a property_value fact with requires_property for contradiction-safe semantics; keep non-property facts out of strict pairing"
) :-
    kb:current_req(ReqId),
    kb_relationship(requires_property, ReqId, FactId),
    strict_req_fact_pairing_fact_kind(FactId, Kind),
    Kind \= property_value,
    strict_req_fact_pairing_kind_label(Kind, KindLabel),
    format(
        string(Description),
        "Requirement links ~w via requires_property using ~w; contradiction-safe requires_property links must target property_value facts",
        [FactId, KindLabel]
    ).

strict_req_fact_pairing_fact_kind(FactId, Kind) :-
    kb_entity(FactId, fact, Props),
    (   memberchk(fact_kind=RawKind, Props)
    ->  normalize_term_atom(RawKind, Kind)
    ;   Kind = legacy
    ).

strict_req_fact_pairing_kind_label(legacy, "a legacy fact without fact_kind").
strict_req_fact_pairing_kind_label(Kind, Label) :-
    format(string(Label), "a fact_kind=~w fact", [Kind]).

%% check_strict_readiness(-Violations)
% Reports current strict-readiness levels for requirements that are still not
% contradiction-ready. Legacy and prose-only requirements remain audit-only and
% are intentionally not treated as contradictions.
check_strict_readiness(Violations) :-
    findall(
        Violation,
        strict_readiness_violation(Violation),
        Violations0
    ),
    sort(Violations0, Violations).

strict_readiness_violation(violation(
    'strict-readiness',
    ReqId,
    Description,
    Suggestion,
    Source
)) :-
    strict_readiness_issue(ReqId, Description, Suggestion),
    violation_source(ReqId, req, Source).

strict_readiness_issue(
    ReqId,
    "Strict readiness: not-ready (prose-only). Requirement has no fact links, so contradiction checks skip it.",
    "Add a subject fact via constrains and a property_value fact via requires_property to model contradiction-safe semantics"
) :-
    kb_entity(ReqId, req, _),
    strict_readiness_level(ReqId, prose_only).

strict_readiness_issue(
    ReqId,
    "Strict readiness: not-ready (traceable). Requirement is linked to facts only through legacy or non-strict links, so contradiction checks skip it.",
    "Replace prose or legacy fact links with a subject fact via constrains and a property_value fact via requires_property"
) :-
    kb_entity(ReqId, req, _),
    strict_readiness_level(ReqId, traceable).

strict_readiness_issue(
    ReqId,
    Description,
    "Add a matching property_value fact via requires_property for the same subject_key"
) :-
    kb_entity(ReqId, req, _),
    strict_readiness_level(ReqId, has_subject),
    strict_readiness_primary_subject(ReqId, SubjectFactId, SubjectKey),
    format(
        string(Description),
        "Strict readiness: not-ready (has-subject). Requirement constrains ~w (~w) but has no matching strict requires_property fact, so contradiction checks skip it.",
        [SubjectFactId, SubjectKey]
    ).

strict_readiness_issue(
    ReqId,
    "Strict readiness: not-ready (strict-ready). Requirement has strict subject and property facts but no contradiction-ready matched pair, so contradiction checks still skip it.",
    "Ensure constrains and requires_property use the same subject_key, and keep the requirement current if it should participate in contradiction checks"
) :-
    kb_entity(ReqId, req, _),
    strict_readiness_level(ReqId, strict_ready).

strict_readiness_level(ReqId, contradiction_ready) :-
    kb:current_req(ReqId),
    kb:effective_req_property_fact(
        ReqId,
        _SubjectKey,
        _FactId,
        _PropertyKey,
        _Operator,
        _ValueType,
        _Value,
        _Unit,
        _Scope,
        _Polarity,
        _ValidFrom,
        _ValidTo
    ),
    !.
strict_readiness_level(ReqId, strict_ready) :-
    strict_readiness_has_strict_subject(ReqId),
    strict_readiness_has_strict_property(ReqId),
    !.
strict_readiness_level(ReqId, has_subject) :-
    strict_readiness_has_strict_subject(ReqId),
    !.
strict_readiness_level(ReqId, traceable) :-
    strict_readiness_has_fact_link(ReqId),
    !.
strict_readiness_level(_ReqId, prose_only).

%% check_predicate_verifiability(-Violations)
% Finds requirements whose requires_predicate links do not target ground
% predicate facts. This keeps ontology-lane prose from looking modeled when the
% target is still a legacy, observation, meta, schema, or strict-property fact.
check_predicate_verifiability(Violations) :-
    findall(
        Violation,
        predicate_verifiability_violation(Violation),
        Violations0
    ),
    sort(Violations0, Violations).

predicate_verifiability_violation(violation(
    'predicate-verifiability',
    ReqId,
    Description,
    "Apply kb_suggest_predicates and link requires_predicate to a fact_kind: predicate fact, or record a review:ontology-gap observation when no predicate fits",
    Source
)) :-
    kb:current_req(ReqId),
    kb_relationship(requires_predicate, ReqId, FactId),
    kb_entity(FactId, fact, Props),
    predicate_verifiability_fact_kind(Props, Kind),
    Kind \= predicate,
    predicate_verifiability_kind_label(Kind, KindLabel),
    format(
        string(Description),
        "Requirement uses requires_predicate ~w but target is ~w, not fact_kind=predicate",
        [FactId, KindLabel]
    ),
    violation_source(ReqId, req, Source).

predicate_verifiability_fact_kind(Props, Kind) :-
    (   memberchk(fact_kind=RawKind, Props)
    ->  normalize_term_atom(RawKind, Kind)
    ;   Kind = legacy
    ).

predicate_verifiability_kind_label(legacy, "a legacy fact without fact_kind").
predicate_verifiability_kind_label(Kind, Label) :-
    format(string(Label), "fact_kind=~w", [Kind]).

%% check_logic_coverage(-Violations)
% Validates explicitly declared atomic requirement claim manifests. Legacy
% requirements without logic_claims remain eligible for gradual backfill. A
% modeled proposition must be grounded exactly once; ambiguous, ontology-gap,
% and missing propositions remain explicit unresolved inventory states and are
% not required to have a ground fact (missing is reported by semantic
% completeness).
check_logic_coverage(Violations) :-
    findall(Violation, logic_coverage_violation(Violation), Violations0),
    sort(Violations0, Violations).

logic_coverage_violation(violation(
    'logic-coverage',
    ReqId,
    Description,
    "Ground every declared claim with a property_value, predicate, or rule fact via its typed relationship, preserving the same claim_key",
    Source
)) :-
    kb:current_req(ReqId),
    requirement_logic_claims(ReqId, ClaimKeys),
    member(ClaimKey, ClaimKeys),
    claim_requires_grounding(ReqId, ClaimKey),
    \+ grounded_requirement_claim(ReqId, ClaimKey),
    format(
        string(Description),
        "Requirement declares logical claim ~w but has no matching ground fact",
        [ClaimKey]
    ),
    violation_source(ReqId, req, Source).

logic_coverage_violation(violation(
    'logic-coverage',
    ReqId,
    Description,
    "Keep ontology gaps, ambiguities, and missing interpretations unresolved; only modeled propositions may have logical ground facts",
    Source
)) :-
    kb:current_req(ReqId),
    requirement_inventory_status(ReqId, ClaimKey, Status),
    memberchk(Status, [ambiguous, ontology_gap, missing]),
    grounded_requirement_claim(ReqId, ClaimKey),
    format(
        string(Description),
        "Requirement grounds unresolved ~w proposition ~w",
        [Status, ClaimKey]
    ),
    violation_source(ReqId, req, Source).

logic_coverage_violation(violation(
    'logic-coverage',
    ReqId,
    Description,
    "Keep a one-to-one mapping between each atomic claim key and its linked ground fact; split compound clauses before grounding",
    Source
)) :-
    kb:current_req(ReqId),
    grounded_requirement_claim_fact(ReqId, ClaimKey, FactA),
    grounded_requirement_claim_fact(ReqId, ClaimKey, FactB),
    FactA @< FactB,
    format(
        string(Description),
        "Requirement grounds logical claim ~w more than once through ~w and ~w",
        [ClaimKey, FactA, FactB]
    ),
    violation_source(ReqId, req, Source).

logic_coverage_violation(violation(
    'logic-coverage',
    ReqId,
    Description,
    "Remove punctuation or wording variants from the atomic inventory and keep one claim key for each distinct logical term",
    Source
)) :-
    kb:current_req(ReqId),
    grounded_requirement_claim_fact(ReqId, ClaimA, FactA),
    grounded_requirement_claim_fact(ReqId, ClaimB, FactB),
    ClaimA \= ClaimB,
    FactA @< FactB,
    logical_ground_signature(FactA, Signature),
    logical_ground_signature(FactB, Signature),
    format(
        string(Description),
        "Requirement declares duplicate logical ground term ~w through claim keys ~w and ~w",
        [Signature, ClaimA, ClaimB]
    ),
    violation_source(ReqId, req, Source).

logic_coverage_violation(violation(
    'logic-coverage',
    ReqId,
    Description,
    "Append the linked fact claim_key to the requirement logic_claims manifest, or remove the stale logical link",
    Source
)) :-
    kb:current_req(ReqId),
    requirement_logic_claims(ReqId, ClaimKeys),
    grounded_requirement_claim(ReqId, ClaimKey),
    \+ memberchk(ClaimKey, ClaimKeys),
    format(
        string(Description),
        "Requirement links ground logical claim ~w but omits it from logic_claims",
        [ClaimKey]
    ),
    violation_source(ReqId, req, Source).

requirement_logic_claims(ReqId, ClaimKeys) :-
    kb_entity(ReqId, req, Props),
    memberchk(logic_claims=RawClaimKeys, Props),
    kb:normalize_term_atom_list(RawClaimKeys, ClaimKeys).

claim_requires_grounding(ReqId, ClaimKey) :-
    requirement_inventory_status(ReqId, ClaimKey, modeled),
    !.
claim_requires_grounding(ReqId, ClaimKey) :-
    \+ requirement_inventory_status(ReqId, ClaimKey, _).

requirement_inventory_status(ReqId, ClaimKey, Status) :-
    kb_entity(ReqId, req, Props),
    memberchk(semantic_inventory=RawInventory, Props),
    inventory_entries(RawInventory, Entries),
    member(Entry, Entries),
    checks_inventory_entry_field(Entry, claim_key, RawClaimKey),
    kb:normalize_term_atom(RawClaimKey, ClaimKey),
    inventory_entry_status(Entry, Status).

checks_inventory_entry_field(Entry, Key, Value) :-
    is_dict(Entry),
    get_dict(Key, Entry, Value).
checks_inventory_entry_field(Entry, Key, Value) :-
    is_list(Entry),
    memberchk(Key=Value, Entry).

grounded_requirement_claim(ReqId, ClaimKey) :-
    grounded_requirement_claim_fact(ReqId, ClaimKey, _FactId).

grounded_requirement_claim_fact(ReqId, ClaimKey, FactId) :-
    kb_relationship(requires_property, ReqId, FactId),
    ground_fact_claim_key(FactId, property_value, ClaimKey).
grounded_requirement_claim_fact(ReqId, ClaimKey, FactId) :-
    kb_relationship(requires_predicate, ReqId, FactId),
    ground_fact_claim_key(FactId, predicate, ClaimKey).
grounded_requirement_claim_fact(ReqId, ClaimKey, FactId) :-
    kb_relationship(requires_rule, ReqId, FactId),
    ground_fact_claim_key(FactId, rule, ClaimKey).

ground_fact_claim_key(FactId, ExpectedKind, ClaimKey) :-
    kb_entity(FactId, fact, Props),
    memberchk(fact_kind=RawKind, Props),
    normalize_term_atom(RawKind, ExpectedKind),
    memberchk(claim_key=RawClaimKey, Props),
    normalize_term_atom(RawClaimKey, ClaimKey),
    memberchk(claim_text=RawClaimText, Props),
    normalize_term_atom(RawClaimText, ClaimText),
    ClaimText \= ''.

%% check_rule_safety(-Violations)
% Every stored rule must decode through the closed Logic IR vocabulary and
% pass the independent Prolog-side safety checks.
check_rule_safety(Violations) :-
    findall(Violation, rule_safety_violation(Violation), Raw),
    sort(Raw, Violations).

rule_safety_violation(violation(
    'rule-safety',
    FactId,
    Description,
    "Use kibi.logic.v1 typed IR; remove raw Prolog, unsafe variables, or unstratified negation",
    Source
)) :-
    kb_entity(FactId, fact, Props),
    memberchk(fact_kind=RawKind, Props),
    normalize_term_atom(RawKind, rule),
    logic_rule_safety(Props, Errors),
    Errors \= [],
    format(string(Description), "Rule fact ~w failed safety validation: ~w", [FactId, Errors]),
    violation_source(FactId, fact, Source).

% Local rule checks cannot detect a negation cycle spanning multiple facts.
% Run the finite dependency-graph check over the complete stored rule set and
% report each participating negated rule as infrastructure-grade unsafe IR.
rule_safety_violation(violation(
    'rule-safety',
    FactId,
    "Stored rules contain an unstratified negation dependency cycle",
    "Separate the negated dependency into strata or replace it with an explicit closed-world fact",
    Source
)) :-
    findall(Rule, stored_rule_term(Rule), Rules),
    Rules \= [],
    \+ logic_rules_stratified(Rules),
    stored_rule_fact(FactId, _Props, Rule),
    rule_contains_negation(Rule),
    violation_source(FactId, fact, Source).

stored_rule_term(Rule) :-
    kb_entity(_FactId, fact, Props),
    memberchk(fact_kind=RawKind, Props),
    normalize_term_atom(RawKind, rule),
    logic_rule_from_props(Props, Rule).

stored_rule_fact(FactId, Props, Rule) :-
    kb_entity(FactId, fact, Props),
    memberchk(fact_kind=RawKind, Props),
    normalize_term_atom(RawKind, rule),
    logic_rule_from_props(Props, Rule).

rule_contains_negation(rule(_, _, _Head, Body, Exceptions, _Scope, _From, _To, _Schema, _Variables)) :-
    ( expression_contains_negation(Body)
    ; member(Exception, Exceptions), expression_contains_negation(Exception)
    ),
    !.

expression_contains_negation(not(_)).
expression_contains_negation(all(Items)) :- member(Item, Items), expression_contains_negation(Item).
expression_contains_negation(any(Items)) :- member(Item, Items), expression_contains_negation(Item).
expression_contains_negation(count(Atom, _Operator, _Value)) :- expression_contains_negation(Atom).

%% check_rule_verifiability(-Violations)
% A requires_rule edge is meaningful only when it reaches a rule fact whose
% schema endpoint exists and whose rule IR is safe.
check_rule_verifiability(Violations) :-
    findall(Violation, rule_verifiability_violation(Violation), Raw),
    sort(Raw, Violations).

rule_verifiability_violation(violation(
    'rule-verifiability',
    ReqId,
    Description,
    "Link requires_rule to fact_kind=rule with a valid rule_schema_id and safe kibi.logic.v1 IR",
    Source
)) :-
    kb:current_req(ReqId),
    kb_relationship(requires_rule, ReqId, FactId),
    kb_entity(FactId, fact, Props),
    rule_verifiability_description(Props, FactId, Description),
    violation_source(ReqId, req, Source).

rule_verifiability_description(Props, FactId, Description) :-
    (   memberchk(fact_kind=RawKind, Props)
    ->  normalize_term_atom(RawKind, Kind)
    ;   Kind = legacy
    ),
    Kind \= rule,
    format(string(Description), "Requirement uses requires_rule ~w but target is fact_kind=~w", [FactId, Kind]).
rule_verifiability_description(Props, FactId, Description) :-
    memberchk(fact_kind=RawKind, Props),
    normalize_term_atom(RawKind, rule),
    \+ memberchk(rule_schema_id=_, Props),
    format(string(Description), "Rule fact ~w has no rule_schema_id", [FactId]).
rule_verifiability_description(Props, FactId, Description) :-
    memberchk(fact_kind=RawKind, Props),
    normalize_term_atom(RawKind, rule),
    memberchk(rule_schema_id=RawSchemaId, Props),
    normalize_term_atom(RawSchemaId, SchemaId),
    \+ kb_entity(SchemaId, fact, _),
    format(string(Description), "Rule fact ~w references missing rule schema ~w", [FactId, SchemaId]).
rule_verifiability_description(Props, FactId, Description) :-
    memberchk(fact_kind=RawKind, Props),
    normalize_term_atom(RawKind, rule),
    memberchk(rule_schema_id=RawSchemaId, Props),
    normalize_term_atom(RawSchemaId, SchemaId),
    kb_entity(SchemaId, fact, SchemaProps),
    \+ valid_rule_schema_props(SchemaProps),
    format(string(Description), "Rule fact ~w references ~w, which is not a rule_schema fact", [FactId, SchemaId]).
rule_verifiability_description(Props, FactId, Description) :-
    memberchk(fact_kind=RawKind, Props),
    normalize_term_atom(RawKind, rule),
    logic_rule_safety(Props, Errors),
    Errors \= [],
    format(string(Description), "Rule fact ~w is not safe: ~w", [FactId, Errors]).

valid_rule_schema_props(Props) :-
    memberchk(fact_kind=RawKind, Props),
    normalize_term_atom(RawKind, rule_schema),
    memberchk(rule_name=Name, Props),
    nonempty_normalized(Name),
    memberchk(argument_names=RawNames, Props),
    memberchk(argument_types=RawTypes, Props),
    checks_normalize_atom_list(RawNames, Names),
    checks_normalize_atom_list(RawTypes, Types),
    same_length(Names, Types).

nonempty_normalized(Value) :-
    normalize_term_atom(Value, Atom),
    Atom \= ''.

%% check_semantic_completeness(-Violations)
% The proposition ledger is additive and optional during migration. When it is
% present, every assertive proposition must either be modeled or explicitly
% recorded as an unresolved review state; silently missing entries are errors.
check_semantic_completeness(Violations) :-
    findall(Violation, semantic_completeness_violation(Violation), Raw),
    sort(Raw, Violations).

semantic_completeness_violation(violation(
    'semantic-completeness',
    ReqId,
    Description,
    "Run kb_semantic_advisor again, preserve every proposition span, and model or explicitly classify each assertive proposition",
    Source
)) :-
    kb:current_req(ReqId),
    kb_entity(ReqId, req, Props),
    memberchk(semantic_inventory=RawInventory, Props),
    inventory_entries(RawInventory, Entries),
    member(Entry, Entries),
    inventory_entry_status(Entry, Status),
    memberchk(Status, [missing]),
    format(string(Description), "Requirement proposition ledger contains an unclassified assertive span (~w)", [Entry]),
    violation_source(ReqId, req, Source).

inventory_entries(Raw, Entries) :-
    (   is_list(Raw) -> Entries = Raw
    ;   Raw = ^^(Value, _) -> inventory_entries(Value, Entries)
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

inventory_entry_status(Entry, Status) :-
    is_dict(Entry), get_dict(status, Entry, Raw), normalize_term_atom(Raw, Status).
inventory_entry_status(Entry, Status) :-
    is_list(Entry), memberchk(status=Raw, Entry), normalize_term_atom(Raw, Status).

strict_readiness_has_fact_link(ReqId) :-
    kb_relationship(constrains, ReqId, FactId),
    kb_entity(FactId, fact, _),
    !.
strict_readiness_has_fact_link(ReqId) :-
    kb_relationship(requires_property, ReqId, FactId),
    kb_entity(FactId, fact, _),
    !.

strict_readiness_has_strict_subject(ReqId) :-
    strict_readiness_primary_subject(ReqId, _FactId, _SubjectKey),
    !.

strict_readiness_primary_subject(ReqId, FactId, SubjectKey) :-
    kb_relationship(constrains, ReqId, FactId),
    strict_req_fact_pairing_fact_kind(FactId, subject),
    kb:fact_subject_key(FactId, SubjectKey).

strict_readiness_has_strict_property(ReqId) :-
    kb_relationship(requires_property, ReqId, FactId),
    strict_req_fact_pairing_fact_kind(FactId, property_value),
    !.

%% run_checks_json
% Entry point for JSON output. Prints all violations as JSON to stdout.
run_checks_json :-
    catch(
        (   check_all(ViolationsDict),
            json_write_dict(current_output, ViolationsDict, [width(0)]),
            nl,
            halt(0)
        ),
        Error,
        (   format(user_error, '{"error": "~q"}~n', [Error]),
            halt(1)
        )
    ).

% Alternative: return JSON as a string binding instead of writing to stdout
check_all_json(JsonString) :-
    check_all(ViolationsDict),
    violations_dict_to_json(ViolationsDict, JsonDict),
    with_output_to_string(
        json_write_dict(current_output, JsonDict, [width(0)]),
        JsonString
    ).

%% check_selected_json(+Rules, -JsonString)
% Run only the named aggregated checks. This is intentionally separate from
% check_all/1 so focused diagnostics cannot evaluate unrelated rule queries.
check_selected_json(Rules, JsonString) :-
    check_selected(Rules, ViolationsDict),
    violations_dict_to_json(ViolationsDict, JsonDict),
    with_output_to_string(
        json_write_dict(current_output, JsonDict, [width(0)]),
        JsonString
    ).

%% check_selected(+Rules, -ViolationsDict)
% Run only the named aggregated checks. This is intentionally separate from
% check_all/1 so focused diagnostics cannot evaluate unrelated rule queries.
% Unknown rule names fail loudly: a typo must never masquerade as a clean,
% violation-free run. Rules implemented on the TypeScript side (recorded in
% rule_registry.pl with implementation typescript) are accepted here and
% simply produce no Prolog-side violations.
check_selected(Rules, ViolationsDict) :-
    require_known_rules(Rules),
    check_selected_dispatch(Rules, ViolationsDict).

check_selected_dispatch(Rules, _{
    must_priority_coverage: MustPriority,
    symbol_coverage: SymbolCoverage,
    symbol_traceability: SymbolTraceability,
    no_dangling_refs: DanglingRefs,
    no_cycles: Cycles,
    required_fields: RequiredFields,
    deprecated_adr_no_successor: DeprecatedADRs,
    scenario_feasibility: ScenarioFeasibility,
    scenario_feasibility_unknown: ScenarioFeasibilityUnknown,
    domain_contradictions: Contradictions,
    rule_key_arguments_missing: RuleKeyArgumentsMissing,
    strict_fact_shape: StrictFactShape,
    strict_req_fact_pairing: StrictReqFactPairing,
    strict_readiness: StrictReadiness,
    predicate_verifiability: PredicateVerifiability,
    logic_coverage: LogicCoverage,
    rule_safety: RuleSafety,
    rule_verifiability: RuleVerifiability,
    semantic_completeness: SemanticCompleteness,
    req_status_vocabulary: ReqStatusVocabulary,
    proof_contract_symbols: ProofContractSymbols,
    entity_id_style: EntityIdStyle,
    domain_redundancy: DomainRedundancy,
    domain_implication: DomainImplication,
    subject_key_identity: SubjectKeyIdentity,
    subject_key_shape: SubjectKeyShape,
    ontology_quality: OntologyQuality
}) :-
    selected_rule(Rules, 'must-priority-coverage', check_must_priority_coverage, MustPriority),
    selected_rule(Rules, 'symbol-coverage', check_symbol_coverage, SymbolCoverage),
    selected_rule_with_options(Rules, 'symbol-traceability', check_symbol_traceability, SymbolTraceability),
    selected_rule(Rules, 'no-dangling-refs', check_no_dangling_refs, DanglingRefs),
    selected_rule(Rules, 'no-cycles', check_no_cycles, Cycles),
    selected_rule(Rules, 'required-fields', check_required_fields, RequiredFields),
    selected_rule(Rules, 'deprecated-adr-no-successor', check_deprecated_adrs, DeprecatedADRs),
    selected_rule(Rules, 'scenario-feasibility', check_scenario_feasibility, ScenarioFeasibility),
    selected_rule(Rules, 'scenario-feasibility-unknown', check_scenario_feasibility_unknown, ScenarioFeasibilityUnknown),
    selected_rule(Rules, 'domain-contradictions', check_domain_contradictions, Contradictions),
    selected_rule(Rules, 'rule-key-arguments-missing', check_rule_key_arguments_missing, RuleKeyArgumentsMissing),
    selected_rule(Rules, 'strict-fact-shape', check_strict_fact_shape, StrictFactShape),
    selected_rule(Rules, 'strict-req-fact-pairing', check_strict_req_fact_pairing, StrictReqFactPairing),
    selected_rule(Rules, 'strict-readiness', check_strict_readiness, StrictReadiness),
    selected_rule(Rules, 'predicate-verifiability', check_predicate_verifiability, PredicateVerifiability),
    selected_rule(Rules, 'logic-coverage', check_logic_coverage, LogicCoverage),
    selected_rule(Rules, 'rule-safety', check_rule_safety, RuleSafety),
    selected_rule(Rules, 'rule-verifiability', check_rule_verifiability, RuleVerifiability),
    selected_rule(Rules, 'semantic-completeness', check_semantic_completeness, SemanticCompleteness),
    selected_rule(Rules, 'req-status-vocabulary', check_req_status_vocabulary, ReqStatusVocabulary),
    selected_rule(Rules, 'proof-contract-symbols', check_proof_contract_symbols, ProofContractSymbols),
    selected_rule(Rules, 'entity-id-style', check_entity_id_style, EntityIdStyle),
    selected_rule(Rules, 'domain-redundancy', check_domain_redundancy, DomainRedundancy),
    selected_rule(Rules, 'domain-implication', check_domain_implication, DomainImplication),
    selected_rule(Rules, 'subject-key-identity', check_subject_key_identity, SubjectKeyIdentity),
    selected_rule(Rules, 'subject-key-shape', check_subject_key_shape, SubjectKeyShape),
    selected_rule(Rules, 'ontology-quality', check_ontology_quality, OntologyQuality).

selected_rule(Rules, Name, Goal, Violations) :-
    (   memberchk(Name, Rules)
    ->  call(Goal, Violations)
    ;   Violations = []
    ).

selected_rule_with_options(Rules, Name, Goal, Violations) :-
    (   memberchk(Name, Rules)
    ->  call(Goal, false, Violations)
    ;   Violations = []
    ).

%% require_known_rules(+Rules)
% Fail closed on names outside the generated registry so a typo or a
% stale cross-version call surfaces as an error instead of an empty result.
require_known_rules(Rules) :-
    exclude(rule_registry:known_rule, Rules, Unknown),
    (   Unknown == []
    ->  true
    ;   throw(error(domain_error(check_rule, Unknown),
                context(check_selected, 'Unknown check rules requested')))
    ).

%% check_all_json_with_options(-JsonString, +RequireAdr)
% Returns all violations as JSON string with options.
% RequireAdr: if true, symbol-traceability also requires ADR constraints.
check_all_json_with_options(JsonString, RequireAdr) :-
    check_all_with_options(ViolationsDict, RequireAdr),
    violations_dict_to_json(ViolationsDict, JsonDict),
    with_output_to_string(
        json_write_dict(current_output, JsonDict, [width(0)]),
        JsonString
    ).

%% check_all_with_options(-ViolationsDict, +RequireAdr)
% Returns a dict with all violations, respecting options.
check_all_with_options(ViolationsDict, RequireAdr) :-
    check_must_priority_coverage(MustPriority),
    check_symbol_coverage(SymbolCoverage),
    check_symbol_traceability(RequireAdr, SymbolTraceability),
    check_no_dangling_refs(DanglingRefs),
    check_no_cycles(Cycles),
    check_required_fields(RequiredFields),
    check_deprecated_adrs(DeprecatedADRs),
    check_scenario_feasibility(ScenarioFeasibility),
    check_scenario_feasibility_unknown(ScenarioFeasibilityUnknown),
    check_domain_contradictions(Contradictions),
    check_rule_key_arguments_missing(RuleKeyArgumentsMissing),
    check_strict_fact_shape(StrictFactShape),
    check_strict_req_fact_pairing(StrictReqFactPairing),
    check_strict_readiness(StrictReadiness),
    check_predicate_verifiability(PredicateVerifiability),
    check_logic_coverage(LogicCoverage),
    check_rule_safety(RuleSafety),
    check_rule_verifiability(RuleVerifiability),
    check_semantic_completeness(SemanticCompleteness),
    check_req_status_vocabulary(ReqStatusVocabulary),
    check_proof_contract_symbols(ProofContractSymbols),
    check_entity_id_style(EntityIdStyle),
    check_domain_redundancy(DomainRedundancy),
    check_domain_implication(DomainImplication),
    check_subject_key_identity(SubjectKeyIdentity),
    check_subject_key_shape(SubjectKeyShape),
    check_ontology_quality(OntologyQuality),
    ViolationsDict = _{
        must_priority_coverage: MustPriority,
        symbol_coverage: SymbolCoverage,
        symbol_traceability: SymbolTraceability,
        no_dangling_refs: DanglingRefs,
        no_cycles: Cycles,
        required_fields: RequiredFields,
        deprecated_adr_no_successor: DeprecatedADRs,
        scenario_feasibility: ScenarioFeasibility,
        scenario_feasibility_unknown: ScenarioFeasibilityUnknown,
        domain_contradictions: Contradictions,
        rule_key_arguments_missing: RuleKeyArgumentsMissing,
        strict_fact_shape: StrictFactShape,
        strict_req_fact_pairing: StrictReqFactPairing,
        strict_readiness: StrictReadiness,
        predicate_verifiability: PredicateVerifiability,
        logic_coverage: LogicCoverage,
        rule_safety: RuleSafety,
        rule_verifiability: RuleVerifiability,
        semantic_completeness: SemanticCompleteness,
        req_status_vocabulary: ReqStatusVocabulary,
        proof_contract_symbols: ProofContractSymbols,
        entity_id_style: EntityIdStyle,
        domain_redundancy: DomainRedundancy,
        domain_implication: DomainImplication,
        subject_key_identity: SubjectKeyIdentity,
        subject_key_shape: SubjectKeyShape,
        ontology_quality: OntologyQuality
    }.

%% violations_dict_to_json(+ViolationsDict, -JsonDict)
% Converts a dict of violation/5 term lists to a dict of JSON-compatible dicts.
violations_dict_to_json(Dict, JsonDict) :-
    dict_pairs(Dict, Tag, Pairs),
    pairs_to_json_pairs(Pairs, JsonPairs),
    dict_pairs(JsonDict, Tag, JsonPairs).

%% pairs_to_json_pairs(+Pairs, -JsonPairs)
% Converts a list of Key-Violations pairs to Key-JsonViolations pairs.
pairs_to_json_pairs([], []).
pairs_to_json_pairs([Key-Violations|Rest], [Key-JsonViolations|JsonRest]) :-
    maplist(violation_to_json, Violations, JsonViolations),
    pairs_to_json_pairs(Rest, JsonRest).

%% violation_to_json(+Violation, -JsonDict)
% Converts a violation(Rule, EntityId, Description, Suggestion, Source) term
% to a JSON-compatible dict. violation/6 carries precomputed JSON-safe
% evidence (witnesses) as its sixth argument.
violation_to_json(violation(Rule, EntityId, Description, Suggestion, Source, Evidence), JsonDict) :-
    !,
    violation_term_to_dict(violation(Rule, EntityId, Description, Suggestion, Source), BaseDict),
    put_dict(evidence, BaseDict, Evidence, JsonDict).
violation_to_json(Violation, JsonDict) :-
    violation_term_to_dict(Violation, BaseDict),
    (   contradiction_violation_witnesses(Violation, Witnesses),
        Witnesses \= []
    ->  put_dict(evidence, BaseDict, _{witnesses: Witnesses}, JsonDict)
    ;   JsonDict = BaseDict
    ).

contradiction_violation_witnesses(
    violation('domain-contradictions', EntityId, Description, _Suggestion, _Source),
    Witnesses
) :-
    violation_id_text(EntityId, EntityIdText),
    violation_text(Description, DescriptionText),
    check_domain_contradiction_witnesses(AllWitnesses),
    include(witness_matches_violation(EntityIdText, DescriptionText), AllWitnesses, Witnesses).

witness_matches_violation(EntityIdText, DescriptionText, Witness) :-
    Witness.requirements = [ReqA, ReqB],
    format(string(ExpectedEntityId), "~w/~w", [ReqA, ReqB]),
    ExpectedEntityId == EntityIdText,
    violation_text(Witness.reason, ReasonText),
    sub_string(DescriptionText, 0, _, _, ReasonText).

violation_term_to_dict(violation(Rule, EntityId, Description, Suggestion, Source), JsonDict) :-
    violation_text(Rule, RuleText),
    violation_id_text(EntityId, EntityIdText),
    violation_text(Description, DescriptionText),
    violation_text(Suggestion, SuggestionText),
    violation_id_text(Source, SourceText),
    JsonDict = _{rule: RuleText, entityId: EntityIdText, description: DescriptionText,
                 suggestion: SuggestionText, source: SourceText}.

violation_text(Val, Text) :-
    nonvar(Val),
    Val =.. ['^^', Inner, _Type],
    !,
    violation_text(Inner, Text).
violation_text(literal(type(_, Val)), Text) :-
    !,
    violation_text(Val, Text).
violation_text(Val, Val) :-
    string(Val),
    !.
violation_text(Val, Text) :-
    atom(Val),
    !,
    atom_string(Val, Text).
violation_text(Val, Text) :-
    term_string(Val, Text).

violation_id_text(Val, Text) :-
    nonvar(Val),
    Val =.. ['^^', Inner, _Type],
    !,
    violation_id_text(Inner, Text).
violation_id_text(literal(type(_, Val)), Text) :-
    !,
    violation_id_text(Val, Text).
violation_id_text(Val, Val) :-
    string(Val),
    !.
violation_id_text(Val, Text) :-
    atom(Val),
    !,
    atom_string(Val, Text).
violation_id_text(Val, Text) :-
    term_string(Val, Text).

violation_source(EntityId, Type, Source) :-
    (   kb_entity(EntityId, Type, Props),
        memberchk(source=Source0, Props)
    ->  normalize_term_atom(Source0, Source)
    ;   Source = ""
    ).

% Helper: capture output to string
with_output_to_string(Goal, String) :-
    with_output_to(codes(Codes), Goal),
    string_codes(String, Codes).

file_base_name(Path, Base) :-
    normalize_term_atom(Path, PathAtom),
    (   sub_atom(PathAtom, _, _, _, '/')
    ->  split_string(PathAtom, '/', '', Parts),
        last(Parts, Base)
    ;   Base = PathAtom
    ).
