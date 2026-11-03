:- encoding(utf8).
:- use_module(library(plunit)).
:- use_module(library(http/json)).
:- use_module(library(readutil)).
:- use_module(library(filesex)).
:- use_module(library(semweb/rdf_db), [rdf_transaction/1]).
:- use_module('../src/kb.pl').
:- use_module('../src/checks.pl').
:- use_module(kb_fixture).
:- use_module(test_helpers).

% The aggregated checks of checks.pl over fresh fixture KBs.  Each test
% builds the few entities a rule reads and compares the rule's whole answer.
% Entities that the write path would refuse are stored with chk_raw_entity/3
% and chk_raw_rel/3.

% --- fixture helpers -------------------------------------------------------

%% chk_kb(:Goal)
% Run Goal once against a fresh, empty KB.
:- meta_predicate chk_kb(0).
chk_kb(Goal) :-
    with_fixture_kb(once(Goal)).

%% chk_ent(+Type, +Id, +Props)
% An entity with the required fields filled in where Props leaves them out.
% The default source is kb/<Id>.md, which the checks report as <Id>.md.
chk_ent(Type, Id, Props0) :-
    chk_defaults(Id, Defaults),
    chk_missing(Defaults, Props0, Missing),
    append([[id=Id], Missing, Props0], Props),
    (   kb_assert_entity(Type, Props)
    ->  true
    ;   throw(error(chk_entity_rejected(Type, Props), _))
    ).

chk_defaults(Id, [title="Fixture entity", status=active, created_at="2026-05-01T00:00:00Z",
                  updated_at="2026-05-01T00:00:00Z", source=Source]) :-
    format(string(Source), "kb/~w.md", [Id]).

chk_missing([], _, []).
chk_missing([Key=Value|Defaults], Props, Missing) :-
    (   memberchk(Key=_, Props)
    ->  Missing = Missing1
    ;   Missing = [Key=Value|Missing1]
    ),
    chk_missing(Defaults, Props, Missing1).

%% chk_raw_entity(+Type, +Id, +Props)
% Store exactly Props for the entity, past the write validation.
chk_raw_entity(Type, Id, Props) :-
    kb:kb_graph(Graph),
    atom_string(Type, TypeString),
    format(atom(EntityUri), 'kb:entity/~w', [Id]),
    kb:with_kb_mutex((
        rdf_db:rdf_retractall(EntityUri, _, _, Graph),
        rdf_db:rdf_assert(EntityUri, 'urn-kibi:type',
                          literal(type('http://www.w3.org/2001/XMLSchema#string', TypeString)), Graph),
        forall(member(Key=Value, Props), kb:store_property(EntityUri, Key, Value, Graph))
    )),
    kb:kb_refresh_entity_index(Id).

%% chk_raw_rel(+Type, +From, +To)
% Store a relationship without checking its ends.
chk_raw_rel(Type, From, To) :-
    kb:kb_graph(Graph),
    format(atom(FromUri), 'kb:entity/~w', [From]),
    format(atom(ToUri), 'kb:entity/~w', [To]),
    atom_concat('urn-kibi:', Type, RelUri),
    kb:with_kb_mutex(rdf_db:rdf_assert(FromUri, RelUri, ToUri, Graph)).

chk_req(Id) :- chk_ent(req, Id, [status=open]).
chk_req(Id, Props0) :-
    (   memberchk(status=_, Props0) -> Props = Props0 ; Props = [status=open|Props0] ),
    chk_ent(req, Id, Props).

chk_rel(Type, From, To) :- fixture_rel(Type, From, To).

%% chk_same(+Actual, +Expected)
% Actual == Expected, with every dict at any depth (inside compounds too)
% compared by its keys and values, ignoring its tag.
chk_same(Actual, Expected) :-
    chk_plain(Actual, A),
    chk_plain(Expected, E),
    A == E.

chk_plain(Var, Var) :-
    var(Var),
    !.
chk_plain(Dict, dict(Pairs)) :-
    is_dict(Dict),
    !,
    dict_pairs(Dict, _, Pairs0),
    findall(K-V, (member(K-V0, Pairs0), chk_plain(V0, V)), Pairs).
chk_plain(Term, Plain) :-
    compound(Term),
    !,
    Term =.. [F|Args],
    maplist(chk_plain, Args, PlainArgs),
    Plain =.. [F|PlainArgs].
chk_plain(Term, Term).

%% chk_subject(+Id, +Key)
chk_subject(Id, Key0) :-
    atom_string(Key0, Key),
    chk_ent(fact, Id, [fact_kind=subject, subject_key=Key]).

%% chk_prop(+Id, +Subject, +Property, +Operator, +Type, +Value, +Extra)
chk_prop(Id, Subject0, Property0, Operator, Type, Value, Extra) :-
    atom_string(Subject0, Subject),
    atom_string(Property0, Property),
    memberchk(Type-Field, [int-value_int, number-value_number, string-value_string,
                           bool-value_bool, set-value_set]),
    append([fact_kind=property_value, subject_key=Subject, property_key=Property,
            operator=Operator, value_type=Type, Field=Value], Extra, Props),
    chk_ent(fact, Id, Props).

%% chk_strict(+ReqId, +SubjectId, +FactId)
% ReqId constrains the subject fact and requires the property fact.
chk_strict(ReqId, SubjectId, FactId) :-
    chk_rel(constrains, ReqId, SubjectId),
    chk_rel(requires_property, ReqId, FactId).

% Feasibility members on s.p (int, unscoped), written m(Role, Owner, FactId,
% Key, Scope, Type, Unit, Op, Value, Text).
chk_a(Fact, Op, Value, m(assumption, Fact, Fact, s-p, '', int, '', Op, Value, Fact)).
chk_r(Req, Fact, Op, Value, m(requirement, Req, Fact, s-p, '', int, '', Op, Value, Fact)).

%% chk_rule_json(+Kind, +Modality, +Head, +Conditions, +Extra, -Json)
% A kibi.logic.v1 rule over the cart subject.  Head is none or an action
% name (checkout(C)); Conditions are Property-Op-Number terms, each a read
% of cart.Property into its own variable plus one comparison.  Extra adds
% top-level keys (scope, validFrom, validTo, ...).
chk_rule_json(Kind, Modality, Head, Conditions, Extra, Json) :-
    Cart = _{kind: var, name: 'C', type: cart},
    findall(Item,
        (   nth1(N, Conditions, Property-Op-Value),
            format(atom(Var), 'V~w', [N]),
            VarTerm = _{kind: var, name: Var, type: money},
            (   Item = _{kind: atom, namespace: cart, name: Property, args: [Cart, VarTerm]}
            ;   Op \== read,
                Item = _{kind: compare, operator: Op, left: VarTerm, right: _{kind: number, value: Value}}
            )
        ),
        Items),
    findall(_{name: Var, type: money}, (nth1(N, Conditions, _), format(atom(Var), 'V~w', [N])), Vars),
    (   Items = [Only] -> Body = Only ; Body = _{kind: all, items: Items} ),
    Base0 = _{version: 'kibi.logic.v1', kind: Kind, modality: Modality, body: Body,
              variables: [_{name: 'C', type: cart}|Vars]},
    (   Head == none
    ->  Base = Base0
    ;   Base = Base0.put(head, _{kind: atom, name: Head, args: [Cart]})
    ),
    foldl(chk_put_pair, Extra, Base, Dict),
    atom_json_dict(Json, Dict, [width(0)]).

chk_put_pair(Key-Value, Dict0, Dict) :-
    put_dict(Key, Dict0, Value, Dict).

%% chk_rule_fact(+Id, +Modality, +Head, +Conditions, +Extra, -Props)
% A stored rule fact (kind rule) built by chk_rule_json/6.
chk_rule_fact(Id, Modality, Head, Conditions, Extra, Props) :-
    chk_rule_fact(Id, rule, Modality, Head, Conditions, Extra, [], Props).

chk_rule_fact(Id, Kind, Modality, Head, Conditions, Extra, FactExtra, Props) :-
    chk_rule_json(Kind, Modality, Head, Conditions, Extra, Json),
    format(string(Source), "kb/~w.md", [Id]),
    append([[id=Id, title="Rule", status=active, source=Source, fact_kind=rule, rule_ir=Json], FactExtra], Props),
    chk_raw_entity(fact, Id, Props).

% --- must-priority coverage -----------------------------------------------

:- begin_tests(checks_must_priority).

test(each_gap_kind, Violations == [
        violation('must-priority-coverage', 'REQ-M1', "Must-priority requirement lacks scenario and test coverage",
                  "Create scenario that specifies and test that validates this requirement", 'REQ-M1.md'),
        violation('must-priority-coverage', 'REQ-M3', "Must-priority requirement lacks scenario coverage",
                  "Create scenario that specifies this requirement", 'REQ-M3.md'),
        violation('must-priority-coverage', 'REQ-M2', "Must-priority requirement lacks test coverage",
                  "Create test that validates this requirement", 'REQ-M2.md')
    ]) :-
    chk_kb((
        chk_req('REQ-M1', [priority=must]),
        chk_req('REQ-M2', [priority=must]),
        chk_ent(scenario, 'SCEN-M2', []),
        chk_rel(specified_by, 'REQ-M2', 'SCEN-M2'),
        chk_req('REQ-M3', [priority=must]),
        chk_ent(test, 'TEST-M3', []),
        chk_rel(verified_by, 'REQ-M3', 'TEST-M3'),
        chk_req('REQ-M4', [priority=must]),
        chk_ent(scenario, 'SCEN-M4', []),
        chk_ent(test, 'TEST-M4', []),
        chk_rel(specified_by, 'REQ-M4', 'SCEN-M4'),
        chk_rel(verified_by, 'SCEN-M4', 'TEST-M4'),
        chk_req('REQ-S1', [priority=should]),
        check_must_priority_coverage(Violations)
    )).

test(requirement_without_source, Violations == [
        violation('must-priority-coverage', 'REQ-RAW', "Must-priority requirement lacks scenario and test coverage",
                  "Create scenario that specifies and test that validates this requirement", "")
    ]) :-
    chk_kb((
        chk_raw_entity(req, 'REQ-RAW', [id='REQ-RAW', title="Raw", status=open, priority=must]),
        check_must_priority_coverage(Violations)
    )).

:- end_tests(checks_must_priority).

% --- symbol coverage ---------------------------------------------------------

:- begin_tests(checks_symbol_coverage).

chk_generic_coverage(Id, violation('symbol-coverage', Id,
    "Production symbol lacks qualifying requirement coverage.",
    "Add 'covered_by: TEST-<area>-<behavior>' for production coverage. If the requirement has specified_by a scenario, use verified_by(scenario,test) or validates(test,scenario). Direct verified_by(req,test) does not count when a scenario exists.",
    Source)) :-
    format(atom(Source), '~w.md', [Id]).

test(uncovered_symbols_sorted, Violations == [V1, V2]) :-
    chk_kb((
        deterministic(check_symbol_coverage([])),
        chk_ent(symbol, 'SYM-B', []),
        chk_ent(symbol, 'SYM-A', []),
        chk_ent(symbol, 'SYM-EXEC', []),
        chk_ent(test, 'TEST-X', []),
        chk_rel(executable_for, 'SYM-EXEC', 'TEST-X'),
        deterministic(check_symbol_coverage(Violations))
    )),
    chk_generic_coverage('SYM-A', V1),
    chk_generic_coverage('SYM-B', V2).

test(covered_symbol_without_requirement, Violations == [violation('symbol-coverage', 'SYM-E',
        "Production symbol lacks qualifying requirement coverage: SYM-E is covered_by TEST-E1, TEST-E2, but SYM-E implements no requirement and none of its tests verifies one.",
        "Add implements(SYM-E, REQ-...) for the requirement this symbol owns, then connect TEST-E1 to it: verified_by(SCEN-..., TEST-E1) through the requirement's scenario, or verified_by(REQ-..., TEST-E1) when the requirement has no scenario.",
        'SYM-E.md')]) :-
    chk_kb((
        chk_ent(symbol, 'SYM-E', []),
        chk_ent(test, 'TEST-E2', []),
        chk_ent(test, 'TEST-E1', []),
        chk_rel(covered_by, 'SYM-E', 'TEST-E2'),
        chk_rel(covered_by, 'SYM-E', 'TEST-E1'),
        % implements a non-requirement: not an owner
        chk_ent(adr, 'ADR-E', []),
        chk_raw_rel(implements, 'SYM-E', 'ADR-E'),
        deterministic(check_symbol_coverage(Violations))
    )).

test(requirement_without_scenario, Violations == [violation('symbol-coverage', 'SYM-B',
        "Production symbol lacks qualifying requirement coverage: SYM-B is covered_by TEST-B1, TEST-B2, but none of them verifies REQ-B1, REQ-B2, which SYM-B implements.",
        "Add verified_by(REQ-B1, TEST-B1) (REQ-B1 has no scenario, so the direct link counts), or specify it with a scenario that TEST-B1 verifies.",
        'SYM-B.md')]) :-
    chk_kb((
        chk_ent(symbol, 'SYM-B', []),
        chk_ent(test, 'TEST-B1', []),
        chk_ent(test, 'TEST-B2', []),
        chk_rel(covered_by, 'SYM-B', 'TEST-B2'),
        chk_rel(covered_by, 'SYM-B', 'TEST-B1'),
        chk_req('REQ-B2'),
        chk_req('REQ-B1'),
        chk_rel(implements, 'SYM-B', 'REQ-B2'),
        chk_rel(implements, 'SYM-B', 'REQ-B1'),
        check_symbol_coverage(Violations)
    )).

test(requirement_with_scenario_and_direct_link, Violations == [violation('symbol-coverage', 'SYM-C',
        "Production symbol lacks qualifying requirement coverage: SYM-C is covered_by TEST-C, but TEST-C does not verify REQ-C, which SYM-C implements.",
        "Add verified_by(SCEN-C1, TEST-C) (REQ-C is specified_by SCEN-C1, SCEN-C2), or validates(TEST-C, SCEN-C1). Direct verified_by(req,test) does not count while the requirement has a scenario.",
        'SYM-C.md')]) :-
    chk_kb((
        chk_ent(symbol, 'SYM-C', []),
        chk_ent(test, 'TEST-C', []),
        chk_rel(covered_by, 'SYM-C', 'TEST-C'),
        chk_req('REQ-C'),
        chk_rel(implements, 'SYM-C', 'REQ-C'),
        chk_ent(scenario, 'SCEN-C2', []),
        chk_ent(scenario, 'SCEN-C1', []),
        chk_rel(specified_by, 'REQ-C', 'SCEN-C2'),
        chk_rel(specified_by, 'REQ-C', 'SCEN-C1'),
        chk_rel(verified_by, 'REQ-C', 'TEST-C'),
        check_symbol_coverage(Violations)
    )).

test(requirement_with_scenario_and_validates_link, Suggestion ==
        "Add verified_by(SCEN-V, TEST-V) (REQ-V is specified_by SCEN-V), or validates(TEST-V, SCEN-V). Direct verified_by(req,test) does not count while the requirement has a scenario.") :-
    chk_kb((
        chk_ent(symbol, 'SYM-V', []),
        chk_ent(test, 'TEST-V', []),
        chk_rel(covered_by, 'SYM-V', 'TEST-V'),
        chk_req('REQ-V'),
        chk_rel(implements, 'SYM-V', 'REQ-V'),
        chk_ent(scenario, 'SCEN-V', []),
        chk_rel(specified_by, 'REQ-V', 'SCEN-V'),
        chk_rel(validates, 'TEST-V', 'REQ-V'),
        check_symbol_coverage([violation(_, _, _, Suggestion, _)])
    )).

test(requirement_with_scenario_only, Suggestion ==
        "Add verified_by(SCEN-D, TEST-D) (REQ-D is specified_by SCEN-D), or validates(TEST-D, SCEN-D).") :-
    chk_kb((
        chk_ent(symbol, 'SYM-D', []),
        chk_ent(test, 'TEST-D', []),
        chk_rel(covered_by, 'SYM-D', 'TEST-D'),
        chk_req('REQ-D'),
        chk_rel(implements, 'SYM-D', 'REQ-D'),
        chk_ent(scenario, 'SCEN-D', []),
        chk_rel(specified_by, 'REQ-D', 'SCEN-D'),
        check_symbol_coverage([violation(_, _, _, Suggestion, _)])
    )).

% The requirement asks for verification_scope unit; the linked test has none.
chk_semantic_req(Req) :-
    chk_req(Req),
    format(string(Subject), "requirement.~w.verification", [Req]),
    atom_concat('FACT-SUBJ-', Req, SubjectId),
    atom_concat('FACT-SCOPE-', Req, ScopeId),
    chk_subject(SubjectId, Subject),
    chk_prop(ScopeId, Subject, verification_scope, eq, string, "unit", []),
    chk_strict(Req, SubjectId, ScopeId).

chk_mismatch_suggestion(Test, Req, Suggestion) :-
    format(string(Suggestion),
           "~w is linked to ~w, but its verification_scope or verification_perspective does not match what ~w requires; set those test fields to the required values.",
           [Test, Req, Req]).

test(linked_test_with_wrong_semantics, Suggestions == [S1, S2, S3]) :-
    chk_kb((
        forall(member(N, ['F1', 'F2', 'F3']),
               (   atom_concat('SYM-', N, Sym), atom_concat('TEST-', N, Test), atom_concat('REQ-', N, Req),
                   chk_ent(symbol, Sym, []), chk_ent(test, Test, []),
                   chk_rel(covered_by, Sym, Test),
                   chk_semantic_req(Req),
                   chk_rel(implements, Sym, Req)
               )),
        chk_rel(verified_by, 'REQ-F1', 'TEST-F1'),
        chk_rel(validates, 'TEST-F2', 'REQ-F2'),
        chk_ent(scenario, 'SCEN-F3', []),
        chk_rel(specified_by, 'REQ-F3', 'SCEN-F3'),
        chk_rel(verified_by, 'SCEN-F3', 'TEST-F3'),
        check_symbol_coverage(Violations),
        findall(S, member(violation(_, _, _, S, _), Violations), Suggestions0),
        % kb.pl counts a test that verifies any scenario as qualifying
        % coverage, so the scenario path is asked for directly.
        checks:covered_symbol_link_suggestion('REQ-F3', 'TEST-F3', Got3),
        append(Suggestions0, [Got3], Suggestions)
    )),
    chk_mismatch_suggestion('TEST-F1', 'REQ-F1', S1),
    chk_mismatch_suggestion('TEST-F2', 'REQ-F2', S2),
    chk_mismatch_suggestion('TEST-F3', 'REQ-F3', S3).

test(changed_symbols_only, Violations == [V1, V2]) :-
    chk_kb((
        chk_ent(symbol, 'SYM-A', []),
        chk_ent(symbol, 'SYM-B', []),
        chk_ent(symbol, 'SYM-C', []),
        check_changed_symbol_coverage(['SYM-C', 'SYM-A', 'SYM-C'], Violations)
    )),
    chk_generic_coverage('SYM-A', V1),
    chk_generic_coverage('SYM-C', V2).

:- end_tests(checks_symbol_coverage).

% --- symbol traceability ------------------------------------------------------

:- begin_tests(checks_symbol_traceability).

chk_trace_fixture :-
    chk_req('REQ-T'),
    chk_ent(adr, 'ADR-T', [status=accepted]),
    chk_ent(test, 'TEST-T', []),
    % no owner, no ADR
    chk_ent(symbol, 'SYM-NONE', []),
    % owner, no ADR
    chk_ent(symbol, 'SYM-REQ', []),
    chk_rel(implements, 'SYM-REQ', 'REQ-T'),
    % owner and ADR
    chk_ent(symbol, 'SYM-BOTH', []),
    chk_rel(implements, 'SYM-BOTH', 'REQ-T'),
    chk_rel(constrained_by, 'SYM-BOTH', 'ADR-T'),
    % ADR only
    chk_ent(symbol, 'SYM-ADR', []),
    chk_rel(constrained_by, 'SYM-ADR', 'ADR-T'),
    % links whose targets have the wrong type
    chk_ent(symbol, 'SYM-WRONG', []),
    chk_raw_rel(implements, 'SYM-WRONG', 'TEST-T'),
    chk_raw_rel(constrained_by, 'SYM-WRONG', 'REQ-T'),
    % executable test code: no ownership needed
    chk_ent(symbol, 'SYM-EXEC', []),
    chk_rel(executable_for, 'SYM-EXEC', 'TEST-T'),
    % executable test code that also claims production links
    chk_ent(symbol, 'SYM-MIXED', []),
    chk_rel(executable_for, 'SYM-MIXED', 'TEST-T'),
    chk_raw_rel(covered_by, 'SYM-MIXED', 'TEST-T'),
    % a requirement carrying symbol links is not a symbol
    chk_raw_rel(executable_for, 'REQ-T', 'TEST-T'),
    chk_raw_rel(implements, 'REQ-T', 'REQ-T').

chk_no_owner(Id, violation('symbol-traceability', Id, "Symbol has no direct requirement ownership.",
    "Add a direct 'implements: REQ-<area>-<behavior>' link for ownership. Use 'covered_by' for production coverage and 'executable_for' for executable test code identity.",
    Source)) :- format(atom(Source), '~w.md', [Id]).
chk_no_owner_no_adr(Id, violation('symbol-traceability', Id, "Symbol has no direct requirement ownership and no ADR constraint.",
    "Add a direct 'implements: REQ-<area>-<behavior>' link for ownership, use 'covered_by' only for production coverage, use 'executable_for' only for executable test code, and add 'constrained_by: ADR-<decision>' in symbols.yaml.",
    Source)) :- format(atom(Source), '~w.md', [Id]).
chk_no_adr(Id, violation('symbol-traceability', Id, "Symbol has no ADR constraint.",
    "Add 'constrained_by: ADR-<decision>' in symbols.yaml.",
    Source)) :- format(atom(Source), '~w.md', [Id]).
chk_mixed(Id, violation('symbol-traceability', Id, "Symbol mixes executable_for test identity with production implements or covered_by.",
    "Split the symbol: keep executable_for on the test-code symbol and use a separate production symbol for implements/covered_by.",
    Source)) :- format(atom(Source), '~w.md', [Id]).

test(ownership_only, Violations == [V1, V2, V3, V4]) :-
    chk_kb((chk_trace_fixture, check_symbol_traceability(false, Violations))),
    chk_no_owner('SYM-ADR', V1),
    chk_mixed('SYM-MIXED', V2),
    chk_no_owner('SYM-NONE', V3),
    chk_no_owner('SYM-WRONG', V4).

test(ownership_and_adr, Violations == [V1, V2, V3, V4, V5]) :-
    chk_kb((chk_trace_fixture, check_symbol_traceability(true, Violations))),
    chk_no_owner('SYM-ADR', V1),
    chk_mixed('SYM-MIXED', V2),
    chk_no_owner_no_adr('SYM-NONE', V3),
    chk_no_adr('SYM-REQ', V4),
    chk_no_owner_no_adr('SYM-WRONG', V5).

:- end_tests(checks_symbol_traceability).

% --- proof contract symbols ---------------------------------------------------

:- begin_tests(checks_proof_contract_symbols).

chk_unresolved(Test, Symbol, violation('proof-contract-symbols', Test, Description,
    "Point required_proofs.symbol_id at an existing symbol entity; Kibi does not infer TEST names from source filenames.",
    Source)) :-
    format(string(Description), "proof_contract.required_proofs names unresolved symbol ~w", [Symbol]),
    format(atom(Source), '~w.md', [Test]).
chk_type_shape(Test, Symbol, violation('proof-contract-symbols', Test, Description,
    "Required proofs identify executable proof symbols. Use a production or executable-test symbol, not a type-shape contract.",
    Source)) :-
    format(string(Description), "proof_contract.required_proofs names type-shape symbol ~w; required proofs must not target structural contracts", [Symbol]),
    format(atom(Source), '~w.md', [Test]).
chk_binding(Test, Symbol, Binding, SymbolSource, violation('proof-contract-symbols', Test, Description,
    "Align proof_bindings.source_file with the symbol's sourceFile, or omit source_file. Kibi does not infer TEST names from filenames.",
    Source)) :-
    format(string(Description), "proof_bindings.source_file for ~w is ~w but the symbol sourceFile is ~w", [Symbol, Binding, SymbolSource]),
    format(atom(Source), '~w.md', [Test]).

test(required_proofs, Violations == [V1, V2, V3]) :-
    chk_kb((
        chk_ent(symbol, 'SYM-OK', [symbol_role=production]),
        chk_ent(symbol, 'SYM-SHAPE', [symbol_role='type-shape']),
        chk_ent(test, 'TEST-A', [proof_contract="{\"required_proofs\":[{\"symbol_id\":\"SYM-OK\"},{\"symbolId\":\"SYM-GONE\"},{\"symbol_id\":\"\"},{\"other\":1},{\"symbol_id\":\"SYM-SHAPE\"}]}"]),
        chk_ent(test, 'TEST-B', [proof_contract="{\"required_proofs\":\"[{\\\"symbol_id\\\":\\\"SYM-LOST\\\"}]\"}"]),
        chk_ent(test, 'TEST-C', [proof_contract="not json"]),
        chk_ent(test, 'TEST-D', [proof_contract="[1]"]),
        chk_ent(test, 'TEST-E', []),
        check_proof_contract_symbols(Violations)
    )),
    chk_type_shape('TEST-A', 'SYM-SHAPE', V1),
    chk_unresolved('TEST-A', 'SYM-GONE', V2),
    chk_unresolved('TEST-B', 'SYM-LOST', V3).

test(proof_bindings, Violations == [V1, V2]) :-
    chk_kb((
        chk_ent(symbol, 'SYM-SRC', [sourceFile="src/a.ts"]),
        chk_ent(symbol, 'SYM-NOSRC', []),
        chk_ent(test, 'TEST-P', [proof_bindings="[{\"source_file\":\"src/a.ts\",\"symbol_id\":\"SYM-SRC\"},{\"sourceFile\":\"src/b.ts\",\"symbolId\":\"SYM-SRC\"},{\"source_file\":\"src/c.ts\",\"symbol_id\":\"SYM-NOSRC\"},{\"source_file\":\"\",\"symbol_id\":\"SYM-SRC\"},{\"source_file\":\"src/d.ts\",\"symbol_id\":\"\"},{\"source_file\":\"src/e.ts\",\"symbol_id\":\"SYM-MISSING\"},{\"symbol_id\":\"SYM-SRC\"},{\"source_file\":\"src/f.ts\"},7]"]),
        chk_ent(test, 'TEST-Q', [proof_bindings="{}"]),
        check_proof_contract_symbols(Violations)
    )),
    chk_binding('TEST-P', 'SYM-NOSRC', 'c.ts', '', V1),
    chk_binding('TEST-P', 'SYM-SRC', 'b.ts', 'a.ts', V2).

test(parse_json_object_forms, Answers == [A, A, A, A, A, A]) :-
    A = _{a:1},
    Text = "{\"a\":1}",
    atom_string(Atom, Text),
    findall(D, checks:parse_json_object(^^(Text, xsd), D), [D1]),
    findall(D, checks:parse_json_object(literal(type(xsd, Text)), D), [D2]),
    findall(D, checks:parse_json_object(literal(Atom), D), [D3]),
    findall(D, checks:parse_json_object(A, D), [D4]),
    findall(D, checks:parse_json_object(Atom, D), [D5]),
    findall(D, checks:parse_json_object(Text, D), [D6]),
    Answers0 = [D1, D2, D3, D4, D5, D6],
    maplist(chk_same_dict(A), Answers0, Answers).

chk_same_dict(Expected, Actual, Expected) :-
    same(Actual, Expected).

test(parse_json_is_deterministic) :-
    Text = "{\"a\":1}",
    deterministic(checks:parse_json_object(^^(Text, xsd), _)),
    deterministic(checks:parse_json_object(literal(type(xsd, Text)), _)),
    deterministic(checks:parse_json_object(literal(Text), _)),
    deterministic(checks:parse_json_object(_{a:1}, _)),
    deterministic(checks:parse_json_list([1], _)),
    deterministic(checks:parse_json_list(^^("[1]", xsd), _)).

test(parse_json_object_rejects) :-
    \+ checks:parse_json_object("[1]", _),
    \+ checks:parse_json_object("nope", _),
    \+ checks:parse_json_object(42, _),
    \+ checks:parse_json_object([a], _).

test(parse_json_list_forms, Answers == [[1], [1], [2], [3], [4]]) :-
    findall(L, checks:parse_json_list([1], L), [L1]),
    findall(L, checks:parse_json_list(^^([1], xsd), L), [L2]),
    findall(L, checks:parse_json_list(^^("[2]", xsd), L), [L3]),
    findall(L, checks:parse_json_list("[3]", L), [L4]),
    findall(L, checks:parse_json_list('[4]', L), [L5]),
    Answers = [L1, L2, L3, L4, L5].

test(parse_json_list_rejects) :-
    \+ checks:parse_json_list("{}", _),
    \+ checks:parse_json_list(42, _),
    \+ checks:parse_json_list("[", _).

test(required_proof_symbol_ids, Ids == ['SYM-A', 'SYM-B', 'SYM-C']) :-
    findall(Id,
            checks:required_proof_symbol_id(_{required_proofs: [_{symbol_id: "SYM-A"}, _{symbolId: 'x/SYM-B'},
                                                                 [symbol_id="SYM-C"], [other=1], _{symbol_id: ""}, 5]},
                                            Id),
            Ids).

:- end_tests(checks_proof_contract_symbols).

% --- JSON text memo -----------------------------------------------------------

:- begin_tests(checks_json_memo).

test(memo_parses_once_and_remembers_invalid_text) :-
    retractall(checks:json_text_memo(_, _)),
    retractall(checks:json_text_memo_size(_)),
    checks:json_text_term("[1,2]", T1),
    T1 == [1, 2],
    checks:json_text_term('[1,2]', T2),
    T2 == [1, 2],
    \+ checks:json_text_term("{bad", _),
    \+ checks:json_text_term("{bad", _),
    findall(K-V, checks:json_text_memo(K, V), Memo),
    Memo == ['[1,2]'-parsed([1, 2]), '{bad'-invalid],
    checks:json_text_memo_size(Size),
    Size == 2,
    checks:json_text_term("{\"s\":\"x\"}", T3),
    same(T3, _{s: "x"}).

test(memo_resets_at_its_limit) :-
    retractall(checks:json_text_memo(_, _)),
    retractall(checks:json_text_memo_size(_)),
    checks:json_text_memo_limit(Limit),
    Before is Limit - 1,
    assertz(checks:json_text_memo_size(Before)),
    assertz(checks:json_text_memo(old, parsed(1))),
    checks:json_text_term("[7]", _),
    checks:json_text_memo_size(AtLimit),
    AtLimit == Limit,
    checks:json_text_term("[8]", _),
    findall(K, checks:json_text_memo(K, _), Keys),
    Keys == ['[8]'],
    checks:json_text_memo_size(Reset),
    Reset == 1,
    retractall(checks:json_text_memo(_, _)),
    retractall(checks:json_text_memo_size(_)).

:- end_tests(checks_json_memo).

% --- dangling references, cycles, required fields, deprecated ADRs -----------

:- begin_tests(checks_graph_rules).

test(dangling_refs_per_type, Violations == [
        violation('no-dangling-refs', 'REQ-GONE', "Relationship references non-existent entity: REQ-GONE", "Remove relationship or create missing entity", ""),
        violation('no-dangling-refs', 'REQ-MISSING', "Relationship references non-existent entity: REQ-MISSING", "Remove relationship or create missing entity", ""),
        violation('no-dangling-refs', 'TEST-GONE', "Relationship references non-existent entity: TEST-GONE", "Remove relationship or create missing entity", ""),
        violation('no-dangling-refs', 'REQ-NOWHERE', "Relationship references non-existent entity: REQ-NOWHERE", "Remove relationship or create missing entity", ""),
        violation('no-dangling-refs', 'FACT-GONE', "Relationship references non-existent entity: FACT-GONE", "Remove relationship or create missing entity", "")
    ]) :-
    chk_kb((
        chk_req('REQ-A'),
        chk_req('REQ-B'),
        chk_rel(depends_on, 'REQ-A', 'REQ-B'),
        chk_raw_rel(depends_on, 'REQ-GONE', 'REQ-A'),
        chk_raw_rel(depends_on, 'REQ-A', 'REQ-MISSING'),
        chk_raw_rel(verified_by, 'REQ-A', 'TEST-GONE'),
        chk_raw_rel(exempts, 'REQ-A', 'FACT-GONE'),
        chk_raw_rel(implements, 'SYM-GONE', 'REQ-A'),
        chk_raw_rel(relates_to, 'REQ-NOWHERE', 'REQ-NEVER'),
        check_no_dangling_refs(Violations)
    )).

test(dangling_ref_types, Types == [depends_on, verified_by, validates, specified_by, constrains,
        requires_property, requires_predicate, requires_rule, supersedes, restates, relates_to,
        assumes, exempts]) :-
    chk_kb((
        chk_req('REQ-A'),
        checks:all_relationship_types(Types0),
        forall(member(T, Types0), chk_raw_rel(T, 'REQ-A', T)),
        check_no_dangling_refs(Violations),
        findall(T, member(violation(_, T, _, _, _), Violations), Types)
    )).

test(cycles, Violations == [
        violation('no-cycles', 'REQ-A', "Circular dependency detected: REQ-A.md → REQ-B.md → REQ-A.md",
                  "Break cycle by removing one of the depends_on relationships", 'REQ-A.md'),
        violation('no-cycles', 'REQ-C', "Circular dependency detected: REQ-C.md → REQ-D.md → REQ-E.md → REQ-C.md",
                  "Break cycle by removing one of the depends_on relationships", 'REQ-C.md'),
        violation('no-cycles', 'REQ-SELF', "Circular dependency detected: REQ-SELF.md → REQ-SELF.md",
                  "Break cycle by removing one of the depends_on relationships", 'REQ-SELF.md')
    ]) :-
    chk_kb((
        forall(member(Id, ['REQ-A', 'REQ-B', 'REQ-C', 'REQ-D', 'REQ-E', 'REQ-F', 'REQ-SELF']), chk_req(Id)),
        chk_rel(depends_on, 'REQ-A', 'REQ-B'),
        chk_rel(depends_on, 'REQ-B', 'REQ-A'),
        chk_rel(depends_on, 'REQ-C', 'REQ-D'),
        chk_rel(depends_on, 'REQ-D', 'REQ-E'),
        chk_rel(depends_on, 'REQ-E', 'REQ-C'),
        chk_rel(depends_on, 'REQ-E', 'REQ-F'),
        chk_rel(depends_on, 'REQ-SELF', 'REQ-SELF'),
        % REQ-G reaches the REQ-C loop but lies on no cycle itself
        chk_req('REQ-G'),
        chk_rel(depends_on, 'REQ-G', 'REQ-C'),
        deterministic(check_no_cycles(Violations))
    )).

test(cycle_names_without_source, Violations == [
        violation('no-cycles', 'REQ-X', "Circular dependency detected: REQ-X → plain → REQ-X",
                  "Break cycle by removing one of the depends_on relationships", "")
    ]) :-
    chk_kb((
        chk_raw_entity(req, 'REQ-X', [id='REQ-X', title="X", status=open]),
        chk_raw_entity(req, 'REQ-Y', [id='REQ-Y', title="Y", status=open, source="plain"]),
        chk_raw_rel(depends_on, 'REQ-X', 'REQ-Y'),
        chk_raw_rel(depends_on, 'REQ-Y', 'REQ-X'),
        check_no_cycles(Violations)
    )).

test(no_cycle_without_back_edge, Violations == []) :-
    chk_kb((
        forall(member(Id, ['REQ-A', 'REQ-B', 'REQ-C']), chk_req(Id)),
        chk_rel(depends_on, 'REQ-A', 'REQ-B'),
        chk_rel(depends_on, 'REQ-B', 'REQ-C'),
        chk_rel(depends_on, 'REQ-A', 'REQ-C'),
        check_no_cycles(Violations)
    )).

test(cycle_search_helpers) :-
    findall(C, checks:find_cycle_from_start([a-a, a-b, b-a], a, C), C1),
    C1 == [[a, a]],
    findall(C, checks:find_cycle_from_start([x-y, y-z, z-y], x, C), C0),
    C0 == [],
    findall(C, checks:find_cycle_from_start([a-b, b-a], a, C), Cs),
    Cs == [[a, b, a]],
    \+ checks:dfs_cycle([a-a], a, a, [a], _),
    checks:cycles_to_violations([], [], V0),
    V0 == [].

chk_xsd(Text, ^^(Text, 'http://www.w3.org/2001/XMLSchema#string')).

test(required_fields, Violations == [
        violation('required-fields', 'REQ-BARE', "Missing required field: source", "Add source to entity definition", ""),
        violation('required-fields', 'REQ-PART', "Missing required field: title", "Add title to entity definition", X),
        violation('required-fields', 'REQ-PART', "Missing required field: status", "Add status to entity definition", X),
        violation('required-fields', 'REQ-PART', "Missing required field: created_at", "Add created_at to entity definition", X),
        violation('required-fields', 'REQ-PART', "Missing required field: updated_at", "Add updated_at to entity definition", X)
    ]) :-
    chk_xsd("x.md", X),
    chk_kb((
        chk_req('REQ-FULL'),
        chk_raw_entity(req, 'REQ-PART', [id='REQ-PART', source="x.md"]),
        chk_raw_entity(req, 'REQ-BARE', [id='REQ-BARE', title="t", status=open, created_at="c", updated_at="u"]),
        check_required_fields(Violations0),
        % entities in id order, each entity's fields in schema order
        sort(2, @=<, Violations0, Violations)
    )).

test(required_field_list, Fields == [id, title, status, created_at, updated_at, source]) :-
    checks:required_fields(Fields).

test(deprecated_adrs, Sorted == [
        violation('deprecated-adr-no-successor', 'ADR-DEP', "Superseded/deprecated ADR has no successor — add a supersedes link from the replacement ADR",
                  "Create a new ADR and add: links: [{type: supersedes, target: ADR-DEP}]", D),
        violation('deprecated-adr-no-successor', 'ADR-RAW', "Superseded/deprecated ADR has no successor — add a supersedes link from the replacement ADR",
                  "Create a new ADR and add: links: [{type: supersedes, target: ADR-RAW}]", ""),
        violation('deprecated-adr-no-successor', 'ADR-SUP', "Superseded/deprecated ADR has no successor — add a supersedes link from the replacement ADR",
                  "Create a new ADR and add: links: [{type: supersedes, target: ADR-SUP}]", S)
    ]) :-
    chk_xsd("kb/ADR-DEP.md", D),
    chk_xsd("kb/ADR-SUP.md", S),
    chk_kb((
        chk_ent(adr, 'ADR-DEP', [status=deprecated]),
        chk_ent(adr, 'ADR-SUP', [status=superseded]),
        chk_ent(adr, 'ADR-OLD', [status=deprecated]),
        chk_ent(adr, 'ADR-NEW', [status=accepted]),
        chk_rel(supersedes, 'ADR-NEW', 'ADR-OLD'),
        chk_raw_entity(adr, 'ADR-RAW', [id='ADR-RAW', status=deprecated]),
        check_deprecated_adrs(Violations),
        msort(Violations, Sorted)
    )).

:- end_tests(checks_graph_rules).

% --- lifecycle: superseded requirements, retired owners, ADR drift -----------

:- begin_tests(checks_lifecycle).

chk_open_superseded(Req, Successors, Status, Violation) :-
    format(atom(Source), '~w.md', [Req]),
    chk_open_superseded(Req, Successors, Status, Source, Violation).

chk_open_superseded(Req, Successors, Status, Source, Violation) :-
    atomic_list_concat(Successors, ', ', SuccessorText),
    format(string(D), "Requirement ~w is superseded by ~w but its status is ~w; a superseded requirement must be closed",
           [Req, SuccessorText, Status]),
    format(string(S), "Set status: closed on ~w (kibi migrate does this with its close_superseded_requirements action). If ~w still states current intent, remove the supersedes link instead",
           [Req, Req]),
    Violation = violation('superseded-requirement-open', Req, D, S, Source,
                          _{supersededBy: Successors, status: Status}).

chk_cycle(Members, Edges, Violation) :-
    Members = [First|_],
    findall(T, (member([F, To], Edges), format(atom(T), "~w supersedes ~w", [F, To])), Ts),
    atomic_list_concat(Ts, '; ', EdgeText),
    atomic_list_concat(Members, ', ', MemberText),
    format(string(D), "Supersession cycle: ~w (~w), so none of these requirements is current and none can be closed automatically",
           [MemberText, EdgeText]),
    format(atom(Source), '~w.md', [First]),
    Violation = violation('superseded-requirement-open', First, D,
        "Decide which requirement states current intent: delete the supersedes link that points at it (kb_delete the relationship), then close the requirements it replaces",
        Source, _{cycle: Members, edges: Edges}).

test(superseded_requirements) :-
    chk_kb((
        forall(member(Id, ['REQ-NEW1', 'REQ-NEW2', 'REQ-OLD', 'REQ-C1', 'REQ-C2', 'REQ-C3', 'REQ-OUT', 'REQ-IN',
                           'REQ-D1', 'REQ-D2']), chk_req(Id)),
        chk_req('REQ-DONE', [status=closed]),
        chk_req('REQ-NEXT'),
        chk_raw_entity(req, 'REQ-NOSTATUS', [id='REQ-NOSTATUS', title="No status"]),
        chk_ent(adr, 'ADR-A', [status=accepted]),
        chk_ent(adr, 'ADR-B', [status=accepted]),
        chk_rel(supersedes, 'ADR-B', 'ADR-A'),
        chk_rel(supersedes, 'REQ-NEW2', 'REQ-OLD'),
        chk_rel(supersedes, 'REQ-NEW1', 'REQ-OLD'),
        chk_rel(supersedes, 'REQ-NEXT', 'REQ-DONE'),
        chk_raw_rel(supersedes, 'REQ-NEXT', 'REQ-NOSTATUS'),
        chk_raw_rel(supersedes, 'REQ-C1', 'REQ-C2'),
        chk_raw_rel(supersedes, 'REQ-C2', 'REQ-C3'),
        chk_raw_rel(supersedes, 'REQ-C3', 'REQ-C1'),
        chk_raw_rel(supersedes, 'REQ-C3', 'REQ-OUT'),
        chk_raw_rel(supersedes, 'REQ-D2', 'REQ-D1'),
        chk_raw_rel(supersedes, 'REQ-D1', 'REQ-D2'),
        chk_raw_rel(supersedes, 'REQ-IN', 'REQ-C1'),
        chk_req('REQ-Z'),
        chk_raw_rel(supersedes, 'REQ-Z', 'ADR-Z'),
        chk_ent(adr, 'ADR-Z', [status=accepted]),
        chk_raw_rel(supersedes, 'ADR-Z', 'REQ-Z'),
        deterministic(check_superseded_requirement_open(Violations))
    )),
    chk_cycle(['REQ-C1', 'REQ-C2', 'REQ-C3'], [['REQ-C1', 'REQ-C2'], ['REQ-C2', 'REQ-C3'], ['REQ-C3', 'REQ-C1']], C1),
    chk_cycle(['REQ-D1', 'REQ-D2'], [['REQ-D1', 'REQ-D2'], ['REQ-D2', 'REQ-D1']], C2),
    chk_open_superseded('REQ-NOSTATUS', ['REQ-NEXT'], missing, "", O1),
    chk_open_superseded('REQ-OLD', ['REQ-NEW1', 'REQ-NEW2'], open, O2),
    chk_open_superseded('REQ-OUT', ['REQ-C3'], open, O3),
    chk_open_superseded('REQ-Z', ['ADR-Z'], open, O4),
    chk_same(Violations, [C1, C2, O1, O2, O3, O4]).

test(supersession_reachability) :-
    Edges = [a-b, b-c, c-a, c-d, d-d],
    checks:supersession_reachable(Edges, a, R1),
    R1 == [a, b, c, d],
    checks:supersession_reachable(Edges, d, R2),
    R2 == [d],
    checks:supersession_reachable(Edges, e, R3),
    R3 == [],
    checks:supersession_cycles(Edges, Cycles),
    Cycles == [[a, b, c], [d]],
    checks:supersession_cycles([a-b], NoCycles),
    NoCycles == [],
    !.

chk_owner_violation(Symbol, Title, Owners, Replacements, Violation) :-
    atomic_list_concat(Owners, ', ', OwnerText),
    format(string(D), "Symbol ~w (~w) implements only superseded or deprecated requirements (~w), so no current requirement owns it",
           [Title, Symbol, OwnerText]),
    (   Replacements == []
    ->  S = "Link the symbol to the current requirement that governs it (implements), or remove the symbol if its behavior is gone"
    ;   atomic_list_concat(Replacements, ', ', ReplacementText),
        format(string(S), "Link the symbol to the requirement that replaced its owner (implements ~w) if it still implements that behavior, or remove the symbol if its behavior is gone",
               [ReplacementText])
    ),
    (   Title == Symbol -> Source = "" ; format(atom(Source), '~w.md', [Symbol]) ),
    Violation = violation('symbol-owner-superseded', Symbol, D, S, Source, _{owners: Owners, replacements: Replacements}).

test(retired_owners) :-
    chk_kb((
        forall(member(Id, ['REQ-NEW', 'REQ-OLD', 'REQ-LIVE', 'REQ-NEW2']), chk_req(Id)),
        chk_req('REQ-DEP', [status=deprecated]),
        chk_req('REQ-DONE', [status=closed]),
        chk_rel(supersedes, 'REQ-NEW', 'REQ-OLD'),
        chk_rel(supersedes, 'REQ-NEW2', 'REQ-OLD'),
        chk_ent(adr, 'ADR-X', [status=accepted]),
        chk_ent(adr, 'ADR-Y', [status=accepted]),
        chk_rel(supersedes, 'ADR-Y', 'ADR-X'),
        chk_ent(symbol, 'SYM-1', [title="One"]),
        chk_rel(implements, 'SYM-1', 'REQ-OLD'),
        chk_ent(symbol, 'SYM-2', []),
        chk_rel(implements, 'SYM-2', 'REQ-DEP'),
        chk_rel(implements, 'SYM-2', 'REQ-OLD'),
        chk_ent(symbol, 'SYM-3', []),
        chk_rel(implements, 'SYM-3', 'REQ-OLD'),
        chk_rel(implements, 'SYM-3', 'REQ-LIVE'),
        chk_ent(symbol, 'SYM-4', [status=deprecated]),
        chk_rel(implements, 'SYM-4', 'REQ-OLD'),
        chk_ent(symbol, 'SYM-5', [status=removed]),
        chk_rel(implements, 'SYM-5', 'REQ-OLD'),
        chk_ent(symbol, 'SYM-6', []),
        chk_raw_rel(implements, 'SYM-6', 'ADR-X'),
        chk_ent(symbol, 'SYM-7', []),
        chk_rel(implements, 'SYM-7', 'REQ-DONE'),
        chk_raw_entity(symbol, 'SYM-8', [id='SYM-8']),
        chk_rel(implements, 'SYM-8', 'REQ-DEP'),
        chk_raw_rel(implements, 'TEST-NOT-SYMBOL', 'REQ-DEP'),
        deterministic(check_symbol_owner_superseded(Violations))
    )),
    chk_owner_violation('SYM-1', "One", ['REQ-OLD'], ['REQ-NEW', 'REQ-NEW2'], V1),
    chk_owner_violation('SYM-2', "Fixture entity", ['REQ-DEP', 'REQ-OLD'], ['REQ-NEW', 'REQ-NEW2'], V2),
    chk_owner_violation('SYM-8', 'SYM-8', ['REQ-DEP'], [], V3),
    chk_same(Violations, [V1, V2, V3]).

chk_retired_symbols(Count) :-
    chk_req('REQ-GONE', [status=deprecated]),
    forall(between(1, Count, N),
           (   format(atom(Id), 'SYM-~|~`0t~d~3+', [N]),
               chk_ent(symbol, Id, []),
               chk_rel(implements, Id, 'REQ-GONE')
           )).

test(review_limit_not_reached, [Length, Last] == [25, 'SYM-025']) :-
    chk_kb((chk_retired_symbols(25), check_symbol_owner_superseded(Violations))),
    length(Violations, Length),
    last(Violations, violation(_, Last, _, _, _, _)).

test(review_limit_exceeded, [Length, Last, Summary] == [26, 'SYM-025', Expected]) :-
    chk_kb((chk_retired_symbols(27), check_symbol_owner_superseded(Violations))),
    length(Violations, Length),
    nth1(25, Violations, violation(_, Last, _, _, _, _)),
    last(Violations, violation(Rule, Entity, Text, Suggestion, Source, Evidence)),
    Summary = [Rule, Entity, Text, Suggestion, Source, Evidence.total, Evidence.listed],
    Expected = ['symbol-owner-superseded', workspace,
                "2 more symbol(s) implement only superseded or deprecated requirements; the list above stops at 25",
                "Relink the listed symbols first; the next kb_check lists the following ones", "", 27, 25].

test(review_limit, Limit == 25) :-
    checks:symbol_owner_review_limit(Limit).

chk_unlinked(Adr, violation('adr-unlinked', Adr, D, S, Source)) :-
    format(string(D), "Accepted ADR ~w is not linked to any requirement or ADR, so nothing that governs behavior points at this decision", [Adr]),
    format(string(S), "Link ~w to the requirements it explains (relates_to), supersede it with the ADR that replaced it, or deprecate it if the decision no longer applies", [Adr]),
    format(atom(Source), '~w.md', [Adr]).

chk_proposed(Adr, violation('adr-proposed', Adr, D, S, Source)) :-
    format(string(D), "ADR ~w is still proposed: the decision was never accepted or withdrawn", [Adr]),
    format(string(S), "Ask the decision owner to accept ~w (status: accepted) or withdraw it (status: deprecated, or supersede it with the ADR that was adopted)", [Adr]),
    format(atom(Source), '~w.md', [Adr]).

chk_adr_fixture :-
    chk_req('REQ-A'),
    chk_ent(symbol, 'SYM-A', []),
    chk_ent(adr, 'ADR-LONE', [status=accepted]),
    chk_ent(adr, 'ADR-SELF', [status=accepted]),
    chk_raw_rel(relates_to, 'ADR-SELF', 'ADR-SELF'),
    chk_ent(adr, 'ADR-SYM', [status=accepted]),
    chk_rel(constrained_by, 'SYM-A', 'ADR-SYM'),
    chk_ent(adr, 'ADR-TO-REQ', [status=accepted]),
    chk_rel(relates_to, 'ADR-TO-REQ', 'REQ-A'),
    chk_ent(adr, 'ADR-FROM-REQ', [status=accepted]),
    chk_rel(relates_to, 'REQ-A', 'ADR-FROM-REQ'),
    chk_ent(adr, 'ADR-NEWER', [status=accepted]),
    chk_ent(adr, 'ADR-OLDER', [status=proposed]),
    chk_rel(supersedes, 'ADR-NEWER', 'ADR-OLDER'),
    chk_ent(adr, 'ADR-PROPOSED', [status=proposed]),
    chk_ent(adr, 'ADR-DEP', [status=deprecated]).

test(adr_unlinked, Violations == [V1, V2, V3]) :-
    chk_kb((chk_adr_fixture, check_adr_unlinked(Violations))),
    chk_unlinked('ADR-LONE', V1),
    chk_unlinked('ADR-SELF', V2),
    chk_unlinked('ADR-SYM', V3).

test(adr_knowledge_link_once) :-
    chk_kb((
        chk_adr_fixture,
        chk_rel(relates_to, 'ADR-TO-REQ', 'ADR-LONE'),
        deterministic(checks:adr_knowledge_link('ADR-TO-REQ'))
    )).

test(adr_proposed, Violations == [V1]) :-
    chk_kb((chk_adr_fixture, check_adr_proposed(Violations))),
    chk_proposed('ADR-PROPOSED', V1).

:- end_tests(checks_lifecycle).

% --- scenario feasibility: the constraint algebra -----------------------------

% m(Role, Owner, FactId, Key, Scope, Type, Unit, Op, Value, Text) members are
% written out in full so each test shows exactly what is compared.

:- begin_tests(checks_feasibility_algebra).


test(analysis_outcomes, Outcomes == [
        infeasible(witness([r], [a], [f], why)),
        unknown(no_assumptions),
        feasible_by_exception,
        not_applicable(outside_validity([a])),
        feasible
    ]) :-
    findall(O, checks:analysis_outcome(analysis([infeasibility([r], [a], [f], why), other], [x], true, [y]), O), [O1]),
    findall(O, checks:analysis_outcome(analysis([], [no_assumptions, x], true, [y]), O), [O2]),
    findall(O, checks:analysis_outcome(analysis([], [], true, [y]), O), [O3]),
    findall(O, checks:analysis_outcome(analysis([], [], false, [outside_validity([a]), z]), O), [O4]),
    findall(O, checks:analysis_outcome(analysis([], [], false, []), O), [O5]),
    Outcomes = [O1, O2, O3, O4, O5].

test(analysis_outcome_is_deterministic) :-
    deterministic(checks:analysis_outcome(analysis([infeasibility([r], [a], [f], why)], [x], true, [y]), _)),
    deterministic(checks:analysis_outcome(analysis([], [x], true, [y]), _)),
    deterministic(checks:analysis_outcome(analysis([], [], true, [y]), _)),
    deterministic(checks:analysis_outcome(analysis([], [], false, [y]), _)).

test(reason_and_status_ids) :-
    checks:nonempty_reason(unmatched_assumption([a])),
    \+ checks:nonempty_reason(unmatched_assumption([])),
    checks:result_ids(incomparable, [incomparable([b, a]), by_exception, contradictory([c]), incomparable([a, d])], Ids),
    Ids == [a, b, d],
    checks:result_ids(undecided_rule, [by_exception], None),
    None == [],
    checks:status_ids(governed, [f2-governed, f1-unmatched, f1-governed], Governed),
    Governed == [f1, f2].

test(operators) :-
    findall(O-N, checks:negated_operator(O, N), Pairs),
    Pairs == [eq-neq, neq-eq, lt-gte, gte-lt, gt-lte, lte-gt],
    checks:polarity_operator(require, lt, R),
    R == lt,
    checks:polarity_operator(forbid, lt, F),
    F == gte,
    \+ checks:polarity_operator(forbid, matches, _),
    \+ checks:polarity_operator(other, lt, _).

test(member_accessors) :-
    M = m(role, owner, fact, k1-k2, scope, int, s, lt, 3, text),
    checks:member_fact(M, Fact), Fact == fact,
    checks:member_owner(M, Owner), Owner == owner,
    checks:member_key(Key, M), Key == k1-k2,
    checks:member_scope(M, Scope), Scope == scope,
    checks:member_role(Role, M), Role == role,
    checks:negated_member(M, N),
    N == m(role, owner, fact, k1-k2, scope, int, s, gte, 3, text),
    \+ checks:negated_member(m(r, o, f, k, s, string, '', matches, x, t), _).

test(numeric_satisfiable) :-
    chk_a(a1, gt, 0, A1), chk_a(a2, eq, 0, A2), chk_a(a3, eq, 1, A3),
    checks:members_satisfiable([]),
    \+ checks:members_satisfiable([A1, A2]),
    checks:members_satisfiable([A1, A3]),
    % integers only when every member is int
    chk_a(a4, lt, 1, A4),
    \+ checks:members_satisfiable([A1, A4]),
    checks:members_satisfiable([m(assumption, b, b, s-p, '', number, '', gt, 0, t), A4]),
    checks:members_satisfiable([A4, m(assumption, b, b, s-p, '', number, '', gt, 0, t)]),
    \+ checks:members_satisfiable([m(assumption, c, c, s-p, '', int, '', eq, 1.5, t)]).

test(symbolic_satisfiable) :-
    S = m(assumption, f, f, s-p, '', string, '', _, _, t),
    chk_sym(S, eq, a, Ea), chk_sym(S, eq, "b", Eb), chk_sym(S, neq, "a", Na), chk_sym(S, neq, b, Nb),
    checks:members_satisfiable([Ea]),
    \+ checks:members_satisfiable([Ea, Eb]),
    \+ checks:members_satisfiable([Ea, Na]),
    checks:members_satisfiable([Ea, Nb]),
    checks:members_satisfiable([Na, Nb]),
    chk_sym(S, eq, a, Ea2),
    checks:members_satisfiable([Ea, Ea2]),
    B = m(assumption, f, f, s-p, '', bool, '', _, _, t),
    chk_sym(B, neq, true, NotTrue), chk_sym(B, neq, false, NotFalse),
    \+ checks:members_satisfiable([NotTrue, NotFalse]),
    checks:members_satisfiable([NotTrue]),
    checks:members_satisfiable([NotFalse]),
    chk_sym(S, neq, true, SNotTrue), chk_sym(S, neq, false, SNotFalse),
    checks:members_satisfiable([SNotTrue, SNotFalse]),
    checks:symbolic_value(5, V5), V5 == '5',
    checks:symbolic_value(f(x), Vf), Vf == 'f(x)',
    checks:symbolic_value("s", Vs), Vs == s,
    checks:symbolic_value(a, Va), Va == a,
    \+ checks:value_excluded(a, [b, c]),
    checks:value_excluded(a, [b, a]),
    deterministic(checks:value_excluded(a, [a, a])),
    \+ checks:bool_domain_exhausted(bool, [true]),
    \+ checks:bool_domain_exhausted(bool, [false]),
    \+ checks:bool_domain_exhausted(string, [true, false]).

chk_sym(m(R, O, F, K, Sc, T, U, _, _, X), Op, V, m(R, O, F, K, Sc, T, U, Op, V, X)).

test(comparable) :-
    chk_a(a1, gt, 0, A1),
    checks:members_comparable([]),
    checks:members_comparable([A1]),
    checks:members_comparable([A1, m(requirement, r, f, s-p, '', number, s, lte, 2.5, t)]),
    \+ checks:members_comparable([A1, m(requirement, r, f, s-p, '', string, '', eq, x, t)]),
    \+ checks:members_comparable([m(assumption, a, a, s-p, '', int, s, eq, 1, t),
                                  m(requirement, r, f, s-p, '', int, ms, eq, 1, t)]),
    \+ checks:members_comparable([m(assumption, a, a, s-p, '', int, '', eq, x, t)]),
    \+ checks:members_comparable([m(assumption, a, a, s-p, '', int, '', matches, 1, t)]),
    \+ checks:members_comparable([m(assumption, a, a, s-p, '', string, '', lt, x, t)]),
    checks:members_comparable([m(assumption, a, a, s-p, '', string, '', neq, x, t)]),
    forall(member(Op, [eq, neq, lt, lte, gt, gte]),
           checks:member_translatable(m(a, a, a, k, '', number, '', Op, 1, t))).

test(incomparable_facts) :-
    A = m(assumption, a, a, s-p, '', int, '', eq, 1, t),
    B = m(assumption, b, b, s-p, '', string, '', eq, x, t),
    C = m(assumption, c, c, s-p, '', int, '', matches, 1, t),
    R = m(requirement, r, f, s-p, '', int, ms, eq, 1, t),
    D = m(assumption, d, d, s-p, '', int, s, eq, 1, t),
    checks:incomparable_facts([A, B], [], I1), I1 == [a, b],
    checks:incomparable_facts([C, A], [], I2), I2 == [c],
    checks:incomparable_facts([D, A], [R], I3), I3 == [d],
    % the incompatibility lies between two requirements: every assumption
    checks:incomparable_facts([A], [R, m(requirement, r2, f2, s-p, '', int, s, eq, 1, t)], I4), I4 == [a],
    deterministic(checks:assumption_incomparable([A, B, B], A)).

test(unsat_core, Core == [B, C]) :-
    chk_a(a, gt, 5, A), chk_r(r1, b, lt, 3, B), chk_r(r2, c, eq, 4, C),
    checks:unsat_core([A, B, C], Core).

test(member_in) :-
    chk_a(a, gt, 5, A), chk_a(b, gt, 6, B),
    checks:member_in([B, A], A),
    \+ checks:member_in([B], A),
    deterministic(checks:member_in([A, A], A)).

test(witness_reason, Reason == 'No value of s.p satisfies assumed a (eq 0), b (gt 1) together with required f (lt 0)') :-
    checks:witness_reason(s-p,
        [m(assumption, a, a, s-p, '', int, '', eq, 0, 'eq 0'), m(assumption, b, b, s-p, '', int, '', gt, 1, 'gt 1')],
        [m(requirement, r, f, s-p, '', int, '', lt, 0, 'lt 0')], Reason).

test(pairwise_witnesses, Witnesses == [
        infeasibility([r1], [a1], [f1], 'No value of s.p satisfies assumed a1 (a1) together with required f1 (f1)'),
        infeasibility([r2], [a1], [f2], 'No value of s.p satisfies assumed a1 (a1) together with required f2 (f2)')
    ]) :-
    chk_a(a1, eq, 0, A1),
    chk_r(r1, f1, gt, 0, R1),
    chk_r(r2, f2, lt, 0, R2),
    chk_r(r3, f3, gte, 0, R3),
    % unsatisfiable on its own: never a pairwise witness
    R4 = m(requirement, r4, f4, s-p, '', int, '', eq, 0.5, f4),
    % incomparable
    R5 = m(requirement, r5, f5, s-p, '', string, '', eq, x, f5),
    A6 = m(assumption, a6, a6, s-p, '', int, '', eq, 0.5, a6),
    findall(W, checks:pairwise_witness(s-p, [A1, A6], [R1, R2, R3, R4, R5], W), Witnesses).

test(joint_witness, Witness == infeasibility([r1, r2], [a1, a2], [f1, f2],
        'No value of s.p satisfies assumed a2 (a2), a1 (a1) together with required f2 (f2), f1 (f1)')) :-
    checks:joint_witness(s-p, [
        m(assumption, a2, a2, s-p, '', int, '', gte, 5, a2),
        m(requirement, r2, f2, s-p, '', int, '', lte, 5, f2),
        m(assumption, a1, a1, s-p, '', int, '', neq, 5, a1),
        m(requirement, r1, f1, s-p, '', int, '', lte, 5, f1)
    ], Witness).

% --- contexts ---

test(partition_constraints) :-
    M1 = m(requirement, r, f1, k, '', int, '', eq, 1, t),
    M2 = m(requirement, r, f2, k, '', int, '', eq, 2, t),
    M3 = m(requirement, r, f3, k, '', int, '', eq, 3, t),
    M4 = m(requirement, r, f4, k, '', int, '', eq, 4, t),
    checks:partition_constraints([rc(M1, applies, false), rc(M2, undetermined, true), rc(M3, undetermined, false),
                                  rc(M4, applies, false)], G, E, U),
    G == [M1, M4], E == [M2], U == [M3].

test(scope_contexts) :-
    checks:in_scope_context(eu, m(a, a, a, k, '', int, '', eq, 1, t)),
    checks:in_scope_context(eu, m(a, a, a, k, eu, int, '', eq, 1, t)),
    \+ checks:in_scope_context(eu, m(a, a, a, k, us, int, '', eq, 1, t)),
    checks:constraint_member(rc(m1, x, y), M), M == m1,
    checks:constraint_on_key(k, rc(m(r, r, f, k, '', int, '', eq, 1, t), applies, false)),
    \+ checks:constraint_on_key(j, rc(m(r, r, f, k, '', int, '', eq, 1, t), applies, false)),
    checks:constraint_outside(rc(_, outside, _)),
    \+ checks:constraint_outside(rc(_, applies, _)),
    checks:constraint_in_scope_context(eu, rc(m(r, r, f, k, eu, int, '', eq, 1, t), applies, false)),
    \+ checks:constraint_in_scope_context(eu, rc(m(r, r, f, k, us, int, '', eq, 1, t), applies, false)).

test(scenario_contexts, Contexts == [
        ctx(k1, [A1], [], [], []),
        ctx(k2, [A2, A3], [R2], [], []),
        ctx(k3, [A4], [], [], []),
        ctx(k3, [A5], [], [], [])
    ]) :-
    A1 = m(assumption, a1, a1, k1, '', int, '', eq, 1, t),
    A2 = m(assumption, a2, a2, k2, '', int, '', eq, 1, t),
    A3 = m(assumption, a3, a3, k2, '', int, '', eq, 2, t),
    R2 = m(requirement, r2, f2, k2, '', int, '', eq, 1, t),
    R2b = m(requirement, r2, f2b, k2, '', int, '', eq, 9, t),
    A4 = m(assumption, a4, a4, k3, eu, int, '', eq, 1, t),
    A5 = m(assumption, a5, a5, k3, us, int, '', eq, 1, t),
    R3 = m(requirement, r3, f3, k3, de, int, '', eq, 1, t),
    findall(C, checks:scenario_context([A2, A1, A3, A4, A5],
                                       [rc(R2, applies, false), rc(R2b, outside, false), rc(R3, applies, false)], C),
            Contexts).

test(scenario_context_splits_constraints, Contexts == [ctx(k, [A], [G], [E], [U])]) :-
    A = m(assumption, a, a, k, '', int, '', eq, 1, t),
    G = m(requirement, r, g, k, '', int, '', eq, 1, t),
    E = m(requirement, r, e, k, '', int, '', eq, 2, t),
    U = m(requirement, r, u, k, '', int, '', eq, 3, t),
    findall(C, checks:scenario_context([A], [rc(G, applies, false), rc(E, applies, true), rc(U, undetermined, false)], C),
            Contexts).

chk_ctx_results(Ctx, Results) :-
    checks:context_results(Ctx, [prior], Results).

test(context_incomparable_assumptions, Results == [prior, incomparable([a1, a2])]) :-
    chk_ctx_results(ctx(s-p, [m(assumption, a1, a1, s-p, '', int, '', eq, 1, t),
                              m(assumption, a2, a2, s-p, '', string, '', eq, x, t)], [], [], []), Results).

test(context_contradictory_assumptions, Results == [prior, contradictory([a1, a2])]) :-
    chk_a(a1, eq, 1, A1), chk_a(a2, eq, 2, A2), chk_a(a3, gte, 0, A3),
    chk_ctx_results(ctx(s-p, [A3, A2, A1], [], [], []), Results).

test(context_incomparable_with_requirement, Results == [prior, incomparable([a1])]) :-
    chk_a(a1, eq, 1, A1),
    chk_ctx_results(ctx(s-p, [A1], [m(requirement, r, f, s-p, '', string, '', eq, x, t)], [], []), Results).

test(context_satisfiable, Results == [prior]) :-
    chk_a(a1, eq, 1, A1), chk_r(r, f, gt, 0, R),
    chk_ctx_results(ctx(s-p, [A1], [R], [], []), Results).

test(context_pairwise, Results == [prior, witness(infeasibility([r], [a1], [f], Reason))]) :-
    chk_a(a1, eq, 0, A1), chk_r(r, f, gt, 0, R),
    checks:witness_reason(s-p, [A1], [R], Reason),
    chk_ctx_results(ctx(s-p, [A1], [R], [], []), Results).

test(context_joint, Results == [prior, witness(W)]) :-
    A1 = m(assumption, a1, a1, s-p, '', int, '', gte, 5, a1),
    A2 = m(assumption, a2, a2, s-p, '', int, '', neq, 5, a2),
    R1 = m(requirement, r1, f1, s-p, '', int, '', lte, 5, f1),
    R2 = m(requirement, r2, f2, s-p, '', int, '', lte, 7, f2),
    checks:joint_witness(s-p, [R1, A1, A2], W),
    chk_ctx_results(ctx(s-p, [A1, A2], [R2, R1], [], []), Results).

test(context_conflicting_requirements, Results == [prior, conflicting_requirements([r1, r2])]) :-
    chk_a(a1, gte, 0, A1),
    chk_r(r2, f2, gt, 5, R2), chk_r(r1, f1, lt, 3, R1), chk_r(r3, f3, gte, 0, R3),
    chk_ctx_results(ctx(s-p, [A1], [R3, R2, R1], [], []), Results).

test(waived_or_undetermined) :-
    chk_a(a1, eq, 1, A1),
    chk_r(r, f, gt, 0, R),
    chk_r(e, ef, lt, 1, Ex),
    chk_r(u, uf, lt, 1, Un),
    chk_r(u2, uf2, gte, 0, Un2),
    Str = m(requirement, s, sf, s-p, '', string, '', eq, x, t),
    checks:waived_or_undetermined([A1], [A1, R], [], [], J1), J1 == [],
    checks:waived_or_undetermined([A1], [A1, R], [], [Un2], J2), J2 == [],
    checks:waived_or_undetermined([A1], [A1, R], [], [Un2, Un], J3), J3 == [undetermined_validity([uf])],
    checks:waived_or_undetermined([A1], [A1, R], [], [Str], J4), J4 == [incomparable([a1])],
    checks:waived_or_undetermined([A1], [A1, R], [Ex], [], J5), J5 == [by_exception],
    checks:waived_or_undetermined([A1], [A1, R], [Un2], [], J6), J6 == [],
    checks:waived_or_undetermined([A1], [A1, R], [Str], [], J7), J7 == [],
    checks:waived_or_undetermined([A1], [A1, R], [Ex], [Un], J8), J8 == [undetermined_validity([uf]), by_exception].

:- end_tests(checks_feasibility_algebra).

% --- scenario feasibility: rule conditions, validity, verdicts ----------------

:- begin_tests(checks_feasibility_rules).

test(condition_quantities, Quantities == [
        int-5-'', number-5-'', int-1800-s, number-1800-s, int-120-s, int-604800-s, int-10800-s,
        int-7-'', number-7-'', number-7.5-'', string-x-'', bool-true-'', string-abc-'', string-'7'-''
    ]) :-
    findall(T-V-U,
        (   member(Term-VarType, [number(5, none)-int, number(5, none)-number, number(30, min)-integer,
                                  number(30, min)-number, duration(2, m)-int, duration(1, w)-int,
                                  duration(3, h)-int, const('7', int)-x, const('7', number)-x,
                                  const('7.5', int)-x, const(x, int)-x, const(true, bool)-x,
                                  const(abc, string)-x, const('7', string)-x]),
            checks:condition_quantity(Term, VarType, T, V, U)
        ),
        Quantities).

test(condition_quantity_integer_const) :-
    checks:condition_quantity(const('7', integer), _, T, V, U),
    T-V-U == int-7-''.

test(declared_numeric_type, Types == [int, number, number, int]) :-
    findall(T, checks:declared_numeric_type(3, int, T), [T1]),
    findall(T, checks:declared_numeric_type(3, number, T), [T2]),
    findall(T, checks:declared_numeric_type(3.5, int, T), [T3]),
    findall(T, checks:declared_numeric_type(3, integer, T), [T4]),
    Types = [T1, T2, T3, T4].

test(ir_duration_units, Units == [[min], [wk], [h]]) :-
    findall(Us, (member(U0, [m, w, h]), findall(U, checks:ir_duration_unit(U0, U), Us)), Units).

test(condition_term_texts, Texts == [[5], ['5 s'], ['2 m'], [x]]) :-
    findall(Ts, (member(T0, [number(5, none), number(5, s), duration(2, m), const(x, string)]),
                 findall(T, checks:condition_term_text(T0, T), Ts)), Texts).

test(head_texts, Texts == [['the scenario'], [pay], ['ns:pay']]) :-
    findall(Ts, (member(H, [none, atom(default, pay, [], positive, x), atom(ns, pay, [], positive, x)]),
                 findall(T, checks:head_text(H, T), Ts)), Texts).

test(condition_members, Members == [
        m(requirement, r, f, s-p, eu, int, '', lte, 0, 'rule forbids pay unless lte 0'),
        m(requirement, r, f, s-p, eu, int, '', gt, 0, 'rule permits pay only when gt 0'),
        m(requirement, r, f, s-p, eu, int, '', gt, 0, 'rule condition gt 0')
    ]) :-
    Head = atom(default, pay, [], positive, x),
    findall(M, (member(R, [forbids, requires, fires]),
                checks:condition_member(r, f, R, Head, eu, cond(s-p, gt, number(0, none), int), M)),
            Members).

test(rule_restrictions, Restrictions == [forbids, forbids, requires, requires]) :-
    findall(R, (member(K-M, [x-forbid, x-deny, constraint-permit, constraint-oblige, x-permit, x-oblige]),
                checks:rule_restriction(K, M, R)),
            Restrictions).

test(rule_condition_members) :-
    C1 = cond(s-p, gt, number(0, none), int),
    C2 = cond(s-q, lt, number(9, none), int),
    checks:rule_condition_members(r, f, forbids, none, '', [s-p], [C1], M1),
    M1 == [m(requirement, r, f, s-p, '', int, '', lte, 0, 'rule forbids the scenario unless lte 0')],
    \+ checks:rule_condition_members(r, f, forbids, none, '', [s-p, s-q], [C1, C2], _),
    \+ checks:rule_condition_members(r, f, forbids, none, '', [s-p], [C2], _),
    \+ checks:rule_condition_members(r, f, forbids, none, '', [s-p], [C1, C1], _),
    checks:rule_condition_members(r, f, requires, none, '', [s-p, s-q], [C1, C2], M2),
    M2 == [m(requirement, r, f, s-p, '', int, '', gt, 0, 'rule permits the scenario only when gt 0'),
           m(requirement, r, f, s-q, '', int, '', lt, 9, 'rule permits the scenario only when lt 9')],
    \+ checks:rule_condition_members(r, f, requires, none, '', [s-p], never, _).

test(general_conditions) :-
    C1 = cond(s-p, gt, number(0, none), int),
    checks:general_conditions(r, f, none, '', [C1], G1),
    G1 == [m(requirement, r, f, s-p, '', int, '', gt, 0, 'rule condition gt 0')],
    checks:general_conditions(r, f, none, '', [C1, cond(s-p, gt, opaque(1), int)], G2),
    G2 == untranslatable,
    checks:general_conditions(r, f, none, '', never, G3),
    G3 == never.

test(rule_parts) :-
    C1 = cond(s-p, gt, number(0, none), int),
    C2 = cond(s-q, lt, number(9, none), int),
    checks:rule_parts(srule(r, f, forbids, none, '', applies, false, [s-p], [C1]), parts([old], [g0]), P1),
    P1 == parts([old, rc(m(requirement, r, f, s-p, '', int, '', lte, 0, 'rule forbids the scenario unless lte 0'), applies, false)], [g0]),
    checks:rule_parts(srule(r, f, forbids, none, eu, undetermined, true, [s-p, s-q], [C1, C2]), parts([old], [g0]), P2),
    P2 == parts([old], [gr(r, f, forbids, eu, undetermined, true, [s-p, s-q],
                           [m(requirement, r, f, s-p, eu, int, '', gt, 0, 'rule condition gt 0'),
                            m(requirement, r, f, s-q, eu, int, '', lt, 9, 'rule condition lt 9')]), g0]).

test(time_before) :-
    checks:time_before('2026-01-02', '2026-01-10'),
    \+ checks:time_before('2026-01-10', '2026-01-02'),
    \+ checks:time_before('2026-01-02', '2026-01-02'),
    \+ checks:time_before('', '2026-01-02'),
    \+ checks:time_before('2026-01-02', ''),
    checks:time_before('2026-01-01T10:00:00+02:00', '2026-01-01T09:00:00Z'),
    checks:time_before(b, c),
    \+ checks:time_before(c, b),
    checks:time_before('2026-01-01', zzz).

test(later_and_earlier_times) :-
    foldl(checks:later_time, ['2026-01-03', '2026-01-05', '2026-01-04'], '', Later),
    Later == '2026-01-05',
    foldl(checks:earlier_time, ['2026-01-05', '2026-01-03', '2026-01-04'], '', Earlier),
    Earlier == '2026-01-03',
    deterministic(checks:later_time(x, '', _)),
    deterministic(checks:earlier_time(x, '', _)).

test(validity_applicability, Answers == [applies, applies, undetermined, outside, outside, applies,
                                          undetermined, undetermined, applies, undetermined, applies,
                                          applies, undetermined]) :-
    W = window('2026-03-01', '2026-04-01'),
    findall(A,
        (   member(Win-From-To, [
                unspecified-''-'',
                W-''-'',
                unspecified-'2026-01-01'-'',
                W-'2026-05-01'-'',
                W-''-'2026-02-01',
                W-'2026-01-01'-'2026-12-31',
                window('', '2026-04-01')-'2026-01-01'-'',
                window('2026-03-01', '')-''-'2026-12-31',
                W-''-'2026-04-01',
                W-'2026-04-01'-'',
                W-'2026-03-01'-'2026-04-01',
                window('2026-03-01', '')-'2026-01-01'-'',
                W-''-'2026-03-15'
            ]),
            once(checks:validity_applicability(Win, From, To, A))
        ),
        Answers).

test(validity_applicability_is_deterministic) :-
    deterministic(checks:validity_applicability(unspecified, '', '', _)),
    deterministic(checks:validity_applicability(unspecified, a, '', _)).

% --- general rule verdicts ---

chk_cond(Key, Op, Value, m(requirement, r, rf, Key, '', int, '', Op, Value, c)).

chk_gr(Restriction, Scope, Applicability, Exempt, ReadKeys, Conditions,
       gr(r, rf, Restriction, Scope, Applicability, Exempt, ReadKeys, Conditions)).

chk_verdict(Assumptions, GR, Verdict) :-
    chk_kb(checks:general_rule_verdict(Assumptions, GR, Verdict)).

test(general_rule_outside, Verdict == []) :-
    chk_a(a, eq, 1, A),
    chk_gr(forbids, '', outside, false, [s-p], untranslatable, GR),
    chk_verdict([A], GR, Verdict).

test(general_rule_without_relevant_assumptions, Verdicts == [[], []]) :-
    chk_gr(forbids, '', applies, false, [s-q], untranslatable, GR1),
    chk_gr(forbids, us, applies, false, [s-p], untranslatable, GR2),
    chk_verdict([m(assumption, a, a, s-p, eu, int, '', eq, 1, t)], GR1, V1),
    chk_verdict([m(assumption, a, a, s-p, eu, int, '', eq, 1, t)], GR2, V2),
    Verdicts = [V1, V2].

test(general_rule_never, Verdicts == [[undetermined_validity([rf])], [conflicting_requirements([r])], [], []]) :-
    chk_a(a, eq, 1, A),
    findall(V,
        (   member(R-Ap-E, [requires-undetermined-false, requires-applies-false, forbids-applies-false,
                            requires-applies-true]),
            chk_gr(R, '', Ap, E, [s-p], never, GR),
            chk_verdict([A], GR, V)
        ),
        Verdicts).

test(general_rule_untranslatable, Verdicts == [[], [undecided_rule([rf])]]) :-
    chk_a(a, eq, 1, A),
    chk_gr(forbids, '', applies, true, [s-p], untranslatable, GR1),
    chk_gr(forbids, '', applies, false, [s-p], untranslatable, GR2),
    chk_verdict([A], GR1, V1),
    chk_verdict([A], GR2, V2),
    Verdicts = [V1, V2].

test(general_rule_spanning_scopes, Verdicts == [[undecided_rule([rf])], []]) :-
    A1 = m(assumption, a1, a1, s-p, eu, int, '', eq, 1, t),
    A2 = m(assumption, a2, a2, s-p, us, int, '', eq, 1, t),
    A3 = m(assumption, a3, a3, s-p, eu, int, '', eq, 1, t),
    chk_cond(s-p, gt, 5, C),
    chk_gr(forbids, '', applies, false, [s-p], [C], GR),
    chk_verdict([A1, A2], GR, V1),
    chk_verdict([A1, A3], GR, V2),
    Verdicts = [V1, V2].

test(condition_verdicts, Verdicts == [
        [incomparable([a1])],
        [],
        [],
        [by_exception],
        [undetermined_validity([rf])],
        [witness(infeasibility([r], [a1, a2], [rf],
            'Assumed a1 (t), a2 (t) satisfy every condition of rule rf (rf), which forbids the scenario\'s action'))],
        [],
        [undecided_rule([rf])],
        [undecided_rule([rf])]
    ]) :-
    A1 = m(assumption, a1, a1, s-p, '', int, '', gt, 5, t),
    A2 = m(assumption, a2, a2, s-q, '', int, '', eq, 1, t),
    Bad = m(assumption, a1, a1, s-p, '', string, '', eq, x, t),
    Low = m(assumption, a1, a1, s-p, '', int, '', lt, 3, t),
    Wide = m(assumption, a1, a1, s-p, '', int, '', gt, 0, t),
    Clash = m(assumption, a3, a3, s-q, '', int, '', eq, 2, t),
    chk_cond(s-p, gt, 4, C),
    findall(V,
        (   member(As-Ap-E-Keys, [
                [Bad, A2]-applies-false-[s-p, s-q],
                [A1, A2, Clash]-applies-false-[s-p, s-q],
                [Low, A2]-applies-false-[s-p, s-q],
                [A1, A2]-applies-true-[s-p, s-q],
                [A1, A2]-undetermined-false-[s-p, s-q],
                [A1, A2]-applies-false-[s-p, s-q],
                [Wide, A2]-applies-true-[s-p, s-q],
                [Wide, A2]-applies-false-[s-p, s-q],
                [A1]-applies-false-[s-p, s-q]
            ]),
            chk_gr(forbids, '', Ap, E, Keys, [C], GR),
            chk_verdict(As, GR, V)
        ),
        Verdicts).

test(conditions_entailed, Core == [A1, A3]) :-
    A1 = m(assumption, a1, a1, s-p, '', int, '', gt, 5, t),
    A2 = m(assumption, a2, a2, s-p, '', int, '', gt, 1, t),
    A3 = m(assumption, a3, a3, s-q, '', int, '', eq, 1, t),
    A4 = m(assumption, a4, a4, s-q, '', int, '', eq, 1, u),
    chk_cond(s-p, gt, 4, C),
    checks:conditions_entailed([A2, A1, A3, A4], [s-p, s-q], [C], Core).

test(conditions_not_entailed) :-
    A2 = m(assumption, a2, a2, s-p, '', int, '', gt, 1, t),
    chk_cond(s-p, gt, 4, C),
    chk_cond(s-r, gt, 4, Cr),
    \+ checks:conditions_entailed([A2], [s-p], [C], _),
    \+ checks:conditions_entailed([m(assumption, a, a, s-p, '', int, '', gt, 5, t)], [s-p], [C, Cr], _).

test(conditions_incomparable) :-
    chk_cond(s-p, gt, 4, C),
    checks:conditions_incomparable([m(assumption, b, b, s-p, '', string, '', eq, x, t),
                                    m(assumption, a, a, s-p, '', int, '', eq, 1, t),
                                    m(assumption, z, z, s-q, '', string, '', eq, x, t)], [C], Ids),
    Ids == [b],
    \+ checks:conditions_incomparable([m(assumption, a, a, s-p, '', int, '', eq, 1, t)], [C], _).

test(general_rule_reason_renders_the_stored_rule) :-
    chk_kb((
        chk_rule_fact('FACT-R', forbid, pay, [total-gt-0], [], Props),
        checks:general_rule_reason('FACT-R', [m(assumption, a, a, s-p, '', int, '', gt, 5, 'gt 5')], Reason),
        checks:logic_rule_render(Props, Text),
        format(atom(Expected), 'Assumed a (gt 5) satisfy every condition of rule FACT-R (~w), which forbids the scenario\'s action', [Text]),
        Reason == Expected
    )).

test(general_rule_results_append) :-
    chk_a(a, eq, 1, A),
    chk_gr(forbids, '', applies, false, [s-p], untranslatable, GR),
    chk_kb(checks:general_rule_results([A], GR, [prior], Results)),
    Results == [prior, undecided_rule([rf])].

% --- assumption statuses ---

test(property_assumption_statuses, Statuses == [governed, governed, outside_validity, disjoint_scope, unmatched]) :-
    A = m(assumption, a, a, s-p, eu, int, '', eq, 1, t),
    findall(S,
        (   member(Covers, [
                [cover(s-p, us, applies), cover(s-p, '', undetermined)],
                [cover(s-p, eu, outside), cover(s-p, eu, applies)],
                [cover(s-p, '', outside), cover(s-p, us, applies)],
                [cover(s-p, us, applies), cover(s-p, us, outside)],
                [cover(s-q, '', applies)]
            ]),
            checks:property_assumption_status(A, Covers, S)
        ),
        Statuses).

test(assumption_statuses, Statuses == ['F-PROP'-governed, 'F-ACT'-action, 'F-OTHER'-unmatched, 'F-NONE'-unmatched]) :-
    chk_kb((
        chk_ent(fact, 'F-ACT', [fact_kind=predicate, predicate_name="pay", predicate_args=["cart"], canonical_key="pay(cart)"]),
        chk_ent(fact, 'F-OTHER', [fact_kind=predicate, predicate_name="ship", predicate_args=["cart"], canonical_key="ship(cart)"]),
        A = m(assumption, 'F-PROP', 'F-PROP', s-p, '', int, '', eq, 1, t),
        R = m(requirement, r, f, s-q, '', int, '', eq, 1, t),
        checks:assumption_statuses(['F-PROP', 'F-ACT', 'F-OTHER', 'F-NONE'], [A],
            [rc(R, applies, false)],
            [gr(r, g, forbids, '', applies, false, [s-p], untranslatable)],
            [default-pay], Statuses)
    )).

:- end_tests(checks_feasibility_rules).
