% Module: checks
% Aggregated validation checks that return all violations in bulk
% This module provides predicates that compute all violations for a given
% validation rule in a single Prolog call, avoiding expensive round-trips.

:- module(checks, [
    check_all/1,                    % Returns all violations as a dict
    check_all_json/1,               % Returns all violations as JSON string
    check_must_priority_coverage/1, % Returns list of must-priority violations
    check_symbol_coverage/1,        % Returns list of uncovered symbols
    check_symbol_traceability/2,    % Returns list of symbols lacking requirement traceability (ReqAdr option)
    check_no_dangling_refs/1,       % Returns list of dangling ref violations
    check_no_cycles/1,              % Returns list of cycle violations
    check_required_fields/1,        % Returns list of missing required field violations
    check_deprecated_adrs/1,        % Returns list of deprecated ADR violations
    check_domain_contradictions/1,  % Returns list of contradiction violations
    check_strict_fact_shape/1,      % Returns list of malformed strict fact violations
    check_strict_req_fact_pairing/1,% Returns list of malformed strict req/fact pairing violations
    check_strict_readiness/1,       % Returns list of strict readiness audit violations
    check_predicate_verifiability/1,% Returns list of unverifiable predicate-lane requirement links
    check_logic_coverage/1,         % Returns list of incomplete declared logical claim manifests
    check_rule_safety/1,
    check_rule_verifiability/1,
    check_semantic_completeness/1,
    run_checks_json/0,              % Entry point for JSON output
    violation_id_text/2             % Extract text from entity ID term (exported for testing)
]).

:- use_module(library(http/json)).
:- use_module(library(http/json_convert)).
:- use_module('kb.pl').
:- use_module('../schema/entities.pl', [entity_type/1, required_property/2]).
:- use_module('../schema/relationships.pl', [relationship_type/1]).
:- use_module('logic_ir.pl', [logic_rule_safety/2, logic_rule_from_props/2, logic_rule_conflict/3, logic_rules_stratified/1]).

% Required fields for all entities
required_fields([id, title, status, created_at, updated_at, source]).

% Relationship types to check for dangling references
all_relationship_types([
    depends_on, verified_by, validates, specified_by,
    constrains, requires_property, requires_predicate, requires_rule, supersedes, relates_to
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
    check_domain_contradictions(Contradictions),
    check_strict_fact_shape(StrictFactShape),
    check_strict_req_fact_pairing(StrictReqFactPairing),
    check_strict_readiness(StrictReadiness),
    check_predicate_verifiability(PredicateVerifiability),
    check_logic_coverage(LogicCoverage),
    check_rule_safety(RuleSafety),
    check_rule_verifiability(RuleVerifiability),
    check_semantic_completeness(SemanticCompleteness),
    ViolationsDict = _{
        must_priority_coverage: MustPriority,
        symbol_coverage: SymbolCoverage,
        symbol_traceability: SymbolTraceability,
        no_dangling_refs: DanglingRefs,
        no_cycles: Cycles,
        required_fields: RequiredFields,
        deprecated_adr_no_successor: DeprecatedADRs,
        domain_contradictions: Contradictions,
        strict_fact_shape: StrictFactShape,
        strict_req_fact_pairing: StrictReqFactPairing,
        strict_readiness: StrictReadiness,
        predicate_verifiability: PredicateVerifiability,
        logic_coverage: LogicCoverage,
        rule_safety: RuleSafety,
        rule_verifiability: RuleVerifiability,
        semantic_completeness: SemanticCompleteness
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
    "Add 'covered_by: TEST-xxx' for production coverage. If the requirement has specified_by a scenario, use verified_by(scenario,test) or validates(test,scenario). Direct verified_by(req,test) does not count when a scenario exists.",
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
        Suggestion = "Add a direct 'implements: REQ-xxx' link for ownership, use 'covered_by' only for production coverage, use 'executable_for' only for executable test code, and add 'constrained_by: ADR-xxx' in symbols.yaml."
    ;   HasReq = false ->
        Description = "Symbol has no direct requirement ownership.",
        Suggestion = "Add a direct 'implements: REQ-xxx' link for ownership. Use 'covered_by' for production coverage and 'executable_for' for executable test code identity."
    ;   HasAdr = false ->
        Description = "Symbol has no ADR constraint.",
        Suggestion = "Add 'constrained_by: ADR-xxx' in symbols.yaml."
    ;   fail  % No violation
    ),
    violation_source(SymbolId, symbol, Source).

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
    findall(
        violation(
            'domain-contradictions',
            EntityId,
            Description,
            "Supersede one requirement or align both to the same required property",
            ""
        ),
        (   contradicting_reqs(ReqA, ReqB, Reason),
            format(string(EntityId), "~w/~w", [ReqA, ReqB]),
            format(string(Description), "~w [strict-readiness: contradiction-ready]", [Reason])
        ),
        StrictViolations
    ),
    findall(
        violation(
            'domain-contradictions',
            EntityId,
            Description,
            "Align the opposing rule heads, separate their scopes, or add an explicit supersedes relationship",
            ""
        ),
        (   opposing_rule_requirements(ReqA, ReqB, RuleA, RuleB),
            logic_rule_conflict(RuleA, RuleB, Conflict),
            Conflict \= disjoint,
            format(string(EntityId), "~w/~w", [ReqA, ReqB]),
            format(string(Description), "Rule conflict (~w) between ~w and ~w", [Conflict, ReqA, ReqB])
        ),
        RuleViolations
    ),
    append(StrictViolations, RuleViolations, Violations).

opposing_rule_requirements(ReqA, ReqB, RuleA, RuleB) :-
    kb:current_req(ReqA),
    kb:current_req(ReqB),
    ReqA @< ReqB,
    kb_relationship(requires_rule, ReqA, FactA),
    kb_relationship(requires_rule, ReqB, FactB),
    FactA @< FactB,
    kb_entity(FactA, fact, PropsA),
    kb_entity(FactB, fact, PropsB),
    memberchk(fact_kind=KindA, PropsA),
    memberchk(fact_kind=KindB, PropsB),
    normalize_term_atom(KindA, rule),
    normalize_term_atom(KindB, rule),
    logic_rule_from_props(PropsA, RuleA),
    logic_rule_from_props(PropsB, RuleB).

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
% requirements without logic_claims remain eligible for gradual backfill; once
% a manifest exists, every key must be grounded by a linked strict-property or
% predicate fact carrying the same claim_key.
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

logical_ground_signature(FactId, predicate(Namespace, Name, Args, Polarity)) :-
    kb:predicate_fact(FactId, Namespace, Name, Args, Polarity).
logical_ground_signature(
    FactId,
    property(Subject, Property, Operator, ValueType, Value, Unit, Scope, Polarity)
) :-
    kb:fact_property_tuple(
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
    memberchk(rule_schema_id=SchemaId, Props),
    \+ kb_entity(SchemaId, fact, _),
    format(string(Description), "Rule fact ~w references missing rule schema ~w", [FactId, SchemaId]).
rule_verifiability_description(Props, FactId, Description) :-
    memberchk(fact_kind=RawKind, Props),
    normalize_term_atom(RawKind, rule),
    memberchk(rule_schema_id=SchemaId, Props),
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
        catch(atom_json_term(Raw, JsonEntries, [value_string_as(string)]), _, fail),
        is_list(JsonEntries)
    ->  Entries = JsonEntries
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
    check_domain_contradictions(Contradictions),
    check_strict_fact_shape(StrictFactShape),
    check_strict_req_fact_pairing(StrictReqFactPairing),
    check_strict_readiness(StrictReadiness),
    check_predicate_verifiability(PredicateVerifiability),
    check_logic_coverage(LogicCoverage),
    check_rule_safety(RuleSafety),
    check_rule_verifiability(RuleVerifiability),
    check_semantic_completeness(SemanticCompleteness),
    ViolationsDict = _{
        must_priority_coverage: MustPriority,
        symbol_coverage: SymbolCoverage,
        symbol_traceability: SymbolTraceability,
        no_dangling_refs: DanglingRefs,
        no_cycles: Cycles,
        required_fields: RequiredFields,
        deprecated_adr_no_successor: DeprecatedADRs,
        domain_contradictions: Contradictions,
        strict_fact_shape: StrictFactShape,
        strict_req_fact_pairing: StrictReqFactPairing,
        strict_readiness: StrictReadiness,
        predicate_verifiability: PredicateVerifiability,
        logic_coverage: LogicCoverage,
        rule_safety: RuleSafety,
        rule_verifiability: RuleVerifiability,
        semantic_completeness: SemanticCompleteness
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
% to a JSON-compatible dict.
violation_to_json(Violation, JsonDict) :-
    violation_term_to_dict(Violation, JsonDict).

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
