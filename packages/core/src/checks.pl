% Module: checks
% Aggregated validation checks that return all violations in bulk
% This module provides predicates that compute all violations for a given
% validation rule in a single Prolog call, avoiding expensive round-trips.

:- module(checks, [
    check_all/1,                    % Returns all violations as a dict
    check_must_priority_coverage/1, % Returns list of must-priority violations
    check_symbol_coverage/1,        % Returns list of uncovered symbols
    check_no_dangling_refs/1,       % Returns list of dangling ref violations
    check_no_cycles/1,              % Returns list of cycle violations
    check_required_fields/1,        % Returns list of missing required field violations
    check_deprecated_adrs/1,        % Returns list of deprecated ADR violations
    check_domain_contradictions/1,  % Returns list of contradiction violations
    run_checks_json/0               % Entry point for JSON output
]).

:- use_module(library(http/json)).
:- use_module(library(http/json_convert)).
:- use_module('kb.pl').
:- use_module('../schema/entities.pl', [entity_type/1, required_property/2]).
:- use_module('../schema/relationships.pl', [relationship_type/1]).

% Required fields for all entities
required_fields([id, title, status, created_at, updated_at, source]).

% Relationship types to check for dangling references
all_relationship_types([
    depends_on, verified_by, validates, specified_by,
    constrains, requires_property, supersedes, relates_to
]).

%% check_all(-ViolationsDict)
% Returns a dict with all violations grouped by rule type.
% Each value is a list of violation terms: violation(Rule, EntityId, Description, Suggestion, Source)
check_all(ViolationsDict) :-
    check_must_priority_coverage(MustPriority),
    check_symbol_coverage(SymbolCoverage),
    check_no_dangling_refs(DanglingRefs),
    check_no_cycles(Cycles),
    check_required_fields(RequiredFields),
    check_deprecated_adrs(DeprecatedADRs),
    check_domain_contradictions(Contradictions),
    ViolationsDict = _{
        must_priority_coverage: MustPriority,
        symbol_coverage: SymbolCoverage,
        no_dangling_refs: DanglingRefs,
        no_cycles: Cycles,
        required_fields: RequiredFields,
        deprecated_adr_no_successor: DeprecatedADRs,
        domain_contradictions: Contradictions
    }.

%% check_must_priority_coverage(-Violations)
% Finds all must-priority requirements lacking scenario and/or test coverage.
% Returns list of violation/5 terms.
check_must_priority_coverage(Violations) :-
    findall(
        Violation,
        must_priority_violation(Violation),
        Violations
    ).

must_priority_violation(violation(
    must_priority_coverage,
    ReqId,
    Description,
    Suggestion,
    Source
)) :-
    kb_entity(ReqId, req, Props),
    memberchk(priority=Priority, Props),
    is_must_priority(Priority),
    
    % Check for scenario coverage
    (   kb_relationship(specified_by, ReqId, _ScenarioId)
    ->  HasScenario = true
    ;   HasScenario = false
    ),
    
    % Check for test coverage
    (   kb_relationship(validates, _TestId, ReqId)
    ->  HasTest = true
    ;   HasTest = false
    ),
    
    % Report if missing either
    (   HasScenario = false ; HasTest = false ),
    
    % Build description
    build_must_priority_desc(HasScenario, HasTest, Description),
    
    % Build suggestion
    build_must_priority_suggestion(HasScenario, HasTest, Suggestion),
    
    % Get source
    (   memberchk(source=Source, Props)
    ->  true
    ;   Source = ""
    ).

is_must_priority(Priority) :-
    (   Priority = ^^("must", _)
    ;   Priority = "must"
    ;   Priority = 'must'
    ;   atom(Priority),
        atom_string(Priority, PS),
        sub_string(PS, _, 4, 0, "must")
    ), !.

build_must_priority_desc(true, false, "Must-priority requirement lacks test coverage").
build_must_priority_desc(false, true, "Must-priority requirement lacks scenario coverage").
build_must_priority_desc(false, false, "Must-priority requirement lacks scenario and test coverage").

build_must_priority_suggestion(true, false, "Create test that validates this requirement").
build_must_priority_suggestion(false, true, "Create scenario that specifies this requirement").
build_must_priority_suggestion(false, false, "Create scenario that specifies and test that validates this requirement").

%% check_symbol_coverage(-Violations)
% Finds all symbols not traceable to any functional requirement.
check_symbol_coverage(Violations) :-
    findall(
        Violation,
        (   symbol_no_req_coverage(SymbolId, _)
        ;   symbol_no_req_coverage_simple(SymbolId)
        ),
        Violations
    ).

% Fallback for when the main predicate isn't available
symbol_no_req_coverage_simple(SymbolId) :-
    kb_entity(SymbolId, symbol, _),
    \+ (kb_relationship(implements, SymbolId, ReqId),
        kb_entity(ReqId, req, _)).

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
    no_dangling_refs,
    FromId,
    Description,
    "Remove relationship or create missing entity",
    ""
)) :-
    kb_relationship(Type, FromId, ToId),
    \+ kb_entity(FromId, _, _),  % From doesn't exist
    format(string(Description), "Relationship references non-existent entity: ~w", [FromId]).

dangling_ref_violation(Type, violation(
    no_dangling_refs,
    ToId,
    Description,
    "Remove relationship or create missing entity",
    ""
)) :-
    kb_relationship(Type, FromId, ToId),
    kb_entity(FromId, _, _),  % From exists
    \+ kb_entity(ToId, _),   % To doesn't exist
    format(string(Description), "Relationship references non-existent entity: ~w", [ToId]).

%% check_no_cycles(-Violations)
% Finds circular dependencies in the depends_on graph.
check_no_cycles(Violations) :-
    % Build adjacency list from depends_on relationships
    findall(From-To, kb_relationship(depends_on, From, To), Edges),
    
    % Find all cycles using DFS
    findall(
        Cycle,
        find_cycle(Edges, Cycle),
        Cycles
    ),
    
    % Convert cycles to violations (only report first occurrence of each cycle)
    cycles_to_violations(Cycles, [], Violations).

find_cycle(Edges, Cycle) :-
    member(Start-_, Edges),
    dfs_cycle(Edges, Start, [Start], [], Cycle).

dfs_cycle(_Edges, Node, Path, _, Cycle) :-
    length(Path, Len),
    Len > 1,
    Path = [Start|_],
    Node = Start,
    reverse(Path, Cycle),
    !.

dfs_cycle(Edges, Node, Path, Visited, Cycle) :-
    \+ member(Node, Visited),
    member(Node-Next, Edges),
    \+ member(Next, Path),  % Avoid immediate backtracking
    dfs_cycle(Edges, Next, [Node|Path], [Node|Visited], Cycle).

cycles_to_violations([], _, []).
cycles_to_violations([Cycle|Rest], Seen, [Violation|Violations]) :-
    % Normalize cycle for comparison (rotate to smallest element)
    normalize_cycle(Cycle, Normalized),
    \+ member(Normalized, Seen),
    !,
    cycle_to_violation(Cycle, Violation),
    cycles_to_violations(Rest, [Normalized|Seen], Violations).
cycles_to_violations([_|Rest], Seen, Violations) :-
    cycles_to_violations(Rest, Seen, Violations).

normalize_cycle(Cycle, Normalized) :-
    Cycle = [First|_],
    find_smallest_rotation(Cycle, First, 0, 0, _, Rotated),
    sort(Rotated, Normalized).

find_smallest_rotation([X], _, _, BestIdx, BestIdx, _) :- !.
find_smallest_rotation([_|Rest], CurrentBest, CurrentIdx, BestIdx, FinalIdx, _) :-
    NextIdx is CurrentIdx + 1,
    (   Rest @< [CurrentBest|Rest]
    ->  Rest = [NewBest|_],
        find_smallest_rotation(Rest, NewBest, NextIdx, NextIdx, FinalIdx, _)
    ;   find_smallest_rotation(Rest, CurrentBest, NextIdx, BestIdx, FinalIdx, _)
    ).

cycle_to_violation(Cycle, violation(
    no_cycles,
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
                memberchk(source=SourcePath, Props)
            ->  file_base_name(SourcePath, Name)
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
        memberchk(source=Source, Props)
    ->  true
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
    required_fields,
    EntityId,
    Description,
    Suggestion,
    Source
)) :-
    kb_entity(EntityId, Type, Props),
    member(Field, Required),
    \+ memberchk(Field=_, Props),
    
    format(string(Description), "Missing required field: ~w", [Field]),
    format(string(Suggestion), "Add ~w to entity definition", [Field]),
    
    (   memberchk(source=Source, Props)
    ->  true
    ;   Source = ""
    ).

%% check_deprecated_adrs(-Violations)
% Finds all deprecated ADRs without successors.
check_deprecated_adrs(Violations) :-
    findall(
        Violation,
        deprecated_adr_violation(Violation),
        Violations
    ).

deprecated_adr_violation(violation(
    deprecated_adr_no_successor,
    AdrId,
    Description,
    Suggestion,
    Source
)) :-
    deprecated_no_successor(AdrId),
    
    Description = "Archived/deprecated ADR has no successor — add a supersedes link from the replacement ADR",
    
    format(string(Suggestion), "Create a new ADR and add: links: [{type: supersedes, target: ~w}]", [AdrId]),
    
    (   kb_entity(AdrId, adr, Props),
        memberchk(source=Source, Props)
    ->  true
    ;   Source = ""
    ).

%% check_domain_contradictions(-Violations)
% Finds all pairs of requirements with contradicting required properties.
check_domain_contradictions(Violations) :-
    findall(
        violation(
            domain_contradictions,
            EntityId,
            Description,
            "Supersede one requirement or align both to the same required property",
            ""
        ),
        (   contradicting_reqs(ReqA, ReqB, Reason),
            format(string(EntityId), "~w/~w", [ReqA, ReqB]),
            Description = Reason
        ),
        Violations
    ).

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
    with_output_to_string(
        json_write_dict(current_output, ViolationsDict, [width(0)]),
        JsonString
    ).

% Helper: capture output to string
with_output_to_string(Goal, String) :-
    with_output_to(codes(Codes), Goal),
    string_codes(String, Codes).

% Helper: file_base_name equivalent
file_base_name(Path, Base) :-
    atom_chars(Path, Chars),
    reverse(Chars, Rev),
    (   append(BaseRev, ['/'|_], Rev)
    ->  reverse(BaseRev, BaseChars),
        atom_chars(Base, BaseChars)
    ;   Base = Path
    ).
