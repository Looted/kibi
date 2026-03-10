% Module: checks
% Aggregated validation checks that return all violations in bulk
% This module provides predicates that compute all violations for a given
% validation rule in a single Prolog call, avoiding expensive round-trips.

:- module(checks, [
    check_all/1,                    % Returns all violations as a dict
    check_all_json/1,               % Returns all violations as JSON string
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
% Finds all symbols not traceable to any functional requirement.
check_symbol_coverage(Violations) :-
    findall(SymbolId, symbol_no_req_coverage(SymbolId, _), SymbolIds0),
    sort(SymbolIds0, SymbolIds),
    maplist(symbol_coverage_violation, SymbolIds, Violations).

symbol_coverage_violation(SymbolId, violation(
    'symbol-coverage',
    SymbolId,
    "Code symbol is not traceable to any functional requirement.",
    "Update symbols.yaml to link this symbol to a related requirement.",
    Source
)) :-
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
    kb_relationship(Type, FromId, ToId),
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
    'deprecated-adr-no-successor',
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
            'domain-contradictions',
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
    violations_dict_to_json(ViolationsDict, JsonDict),
    with_output_to_string(
        json_write_dict(current_output, JsonDict, [width(0)]),
        JsonString
    ).

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
    normalize_term_atom(Val, Atom),
    atom_string(Atom, Text).

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
