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

chk_xsd(Text, ^^(Text, 'http://www.w3.org/2001/XMLSchema#string')).

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
        first_answer_is_last(check_symbol_coverage([])),
        chk_ent(symbol, 'SYM-B', []),
        chk_ent(symbol, 'SYM-A', []),
        chk_ent(symbol, 'SYM-EXEC', []),
        chk_ent(test, 'TEST-X', []),
        chk_rel(executable_for, 'SYM-EXEC', 'TEST-X'),
        first_answer_is_last(check_symbol_coverage(Violations))
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
        first_answer_is_last(check_symbol_coverage(Violations))
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
        findall(S, member(violation(_, _, _, S, _), Violations), Suggestions)
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
    first_answer_is_last(checks:parse_json_object(^^(Text, xsd), _)),
    first_answer_is_last(checks:parse_json_object(literal(type(xsd, Text)), _)),
    first_answer_is_last(checks:parse_json_object(literal(Text), _)),
    first_answer_is_last(checks:parse_json_object(_{a:1}, _)),
    first_answer_is_last(checks:parse_json_list([1], _)),
    first_answer_is_last(checks:parse_json_list(^^("[1]", xsd), _)).

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
    findall(S1, checks:json_text_memo_size(S1), AtLimit),
    AtLimit == [Limit],
    checks:json_text_term("[8]", _),
    findall(K, checks:json_text_memo(K, _), Keys),
    Keys == ['[8]'],
    findall(S2, checks:json_text_memo_size(S2), Reset),
    Reset == [1],
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
        first_answer_is_last(check_no_cycles(Violations))
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
        first_answer_is_last(check_superseded_requirement_open(Violations))
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
    format(string(D), "Symbol ~w (~w) implements only superseded, deprecated or retired requirements (~w), so no current requirement owns it",
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
        chk_req('REQ-RET', [status=retired, retired_reason="Gone"]),
        chk_ent(symbol, 'SYM-9', []),
        chk_rel(implements, 'SYM-9', 'REQ-RET'),
        first_answer_is_last(check_symbol_owner_superseded(Violations))
    )),
    chk_owner_violation('SYM-1', "One", ['REQ-OLD'], ['REQ-NEW', 'REQ-NEW2'], V1),
    chk_owner_violation('SYM-2', "Fixture entity", ['REQ-DEP', 'REQ-OLD'], ['REQ-NEW', 'REQ-NEW2'], V2),
    chk_owner_violation('SYM-8', 'SYM-8', ['REQ-DEP'], [], V3),
    chk_owner_violation('SYM-9', "Fixture entity", ['REQ-RET'], [], V4),
    chk_same(Violations, [V1, V2, V3, V4]).

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
                "2 more symbol(s) implement only superseded, deprecated or retired requirements; the list above stops at 25",
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
        first_answer_is_last(checks:adr_knowledge_link('ADR-TO-REQ'))
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
    first_answer_is_last(checks:analysis_outcome(analysis([infeasibility([r], [a], [f], why)], [x], true, [y]), _)),
    first_answer_is_last(checks:analysis_outcome(analysis([], [x], true, [y]), _)),
    first_answer_is_last(checks:analysis_outcome(analysis([], [], true, [y]), _)),
    first_answer_is_last(checks:analysis_outcome(analysis([], [], false, [y]), _)).

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

test(symbolic_satisfiable, [nondet]) :-
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
    checks:symbolic_value('a b', Vq), Vq == 'a b',
    \+ checks:value_excluded(a, [b, c]),
    checks:value_excluded(a, [b, a]),
    first_answer_is_last(checks:value_excluded(a, [a, a])),
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
    first_answer_is_last(checks:assumption_incomparable([A, B, B], A)).

test(unsat_core, Core == [B, C]) :-
    chk_a(a, gt, 5, A), chk_r(r1, b, lt, 3, B), chk_r(r2, c, eq, 4, C),
    checks:unsat_core([A, B, C], Core).

test(member_in) :-
    chk_a(a, gt, 5, A), chk_a(b, gt, 6, B),
    checks:member_in([B, A], A),
    \+ checks:member_in([B], A),
    first_answer_is_last(checks:member_in([A, A], A)).

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

test(duration_quantities, Quantities == [[number-120-s], [number-1209600-s], [number-7200-s], [int-7200-s]]) :-
    findall(Qs,
        (   member(D-VT, [duration(2, m)-number, duration(2, w)-number, duration(2, h)-number, duration(2, h)-int]),
            findall(T-V-U, checks:condition_quantity(D, VT, T, V, U), Qs)
        ),
        Quantities).

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

test(rule_condition_members, [nondet]) :-
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
    first_answer_is_last(checks:later_time(x, '', _)),
    first_answer_is_last(checks:earlier_time(x, '', _)).

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
    first_answer_is_last(checks:validity_applicability(unspecified, '', '', _)),
    first_answer_is_last(checks:validity_applicability(unspecified, a, '', _)).

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

% --- scenario feasibility over the KB ----------------------------------------

% The cart.total property: FACT-CART is the subject, each requirement
% constrains it and requires one property fact.
chk_cart_req(Req, Fact, Op, Value) :-
    chk_cart_req(Req, Fact, Op, Value, []).

chk_cart_req(Req, Fact, Op, Value, Extra) :-
    (   kb_entity('FACT-CART', fact, _) -> true ; chk_subject('FACT-CART', cart) ),
    (   kb_entity(Req, req, _) -> true ; chk_req(Req) ),
    chk_prop(Fact, cart, total, Op, int, Value, Extra),
    chk_strict(Req, 'FACT-CART', Fact).

chk_scenario(Id, Expects, Assumed) :-
    chk_ent(scenario, Id, [expects=Expects]),
    forall(member(F, Assumed), chk_rel(assumes, Id, F)).

chk_total(Id, Op, Value) :- chk_total(Id, Op, Value, []).
chk_total(Id, Op, Value, Extra) :- chk_prop(Id, cart, total, Op, int, Value, Extra).

chk_analysis(Scenario, Analysis) :-
    checks:compute_scenario_feasibility_analysis(Scenario, Analysis).

chk_outcome(Scenario, Outcome) :-
    findall(O, checks:scenario_feasibility_outcome(Scenario, O), [Outcome]).

:- begin_tests(checks_feasibility_kb).

chk_zero_fixture :-
    chk_cart_req('REQ-POS', 'FACT-POS', gt, 0, [claim_key="CLAIM-POS", claim_text="Total is positive"]),
    chk_total('FACT-ZERO', eq, 0),
    chk_scenario('SCEN-ZERO', success, ['FACT-ZERO']).

chk_zero_description(Tail, Description) :-
    format(string(Description),
        "Scenario expects success but assumes FACT-ZERO, which current requirement REQ-POS forbids via FACT-POS: No value of cart.total satisfies assumed FACT-ZERO (eq 0) together with required FACT-POS (gt 0)~w",
        [Tail]).

chk_exception(Id, Props) :-
    chk_req(Id, Props),
    chk_rel(exempts, Id, 'REQ-POS'),
    chk_rel(specified_by, Id, 'SCEN-ZERO').

test(pairwise_infeasible, Violations == [violation('scenario-feasibility', 'SCEN-ZERO', D,
        "Set expects: rejection on SCEN-ZERO, correct the assumption, or record a human-approved exception requirement (approved_by set) that exempts REQ-POS and is specified_by SCEN-ZERO",
        Source)]) :-
    chk_zero_description("", D),
    chk_xsd("kb/SCEN-ZERO.md", Source),
    chk_kb((chk_zero_fixture, check_scenario_feasibility(Violations))).

test(unapproved_exception, Violations == [violation('scenario-feasibility', 'SCEN-ZERO', D,
        "Have a human approve REQ-EX by setting approved_by (and optionally approval_ref), or set expects: rejection on SCEN-ZERO, or correct the assumption",
        Source)]) :-
    chk_zero_description(". An exception exists (REQ-EX exempts REQ-POS) but is not approved", D),
    chk_xsd("kb/SCEN-ZERO.md", Source),
    chk_kb((chk_zero_fixture, chk_exception('REQ-EX', [approved_by="   "]),
            check_scenario_feasibility(Violations))).

test(narrow_exception, Violations == [violation('scenario-feasibility', 'SCEN-ZERO', D,
        "Add the claim_key of FACT-POS to exempts_claims on REQ-EX if a human approves waiving that clause too, set expects: rejection on SCEN-ZERO, or correct the assumption",
        Source)]) :-
    chk_zero_description(". Approved exception REQ-EX waives only the claims listed in its exempts_claims, and FACT-POS is not grounded by one of them", D),
    chk_xsd("kb/SCEN-ZERO.md", Source),
    chk_kb((chk_zero_fixture, chk_exception('REQ-EX', [approved_by="Owner", exempts_claims=["CLAIM-OTHER"]]),
            check_scenario_feasibility(Violations))).

test(approved_exceptions, Outcomes == [feasible_by_exception, feasible_by_exception]) :-
    chk_kb((chk_zero_fixture, chk_exception('REQ-EX', [approved_by="Owner"]),
            chk_outcome('SCEN-ZERO', O1))),
    chk_kb((chk_zero_fixture, chk_exception('REQ-EX', [approved_by="Owner", exempts_claims=["CLAIM-POS"]]),
            chk_outcome('SCEN-ZERO', O2))),
    Outcomes = [O1, O2].

test(exception_must_be_current_and_specify_the_scenario, Outcomes == [infeasible, infeasible]) :-
    chk_kb((chk_zero_fixture, chk_exception('REQ-EX', [approved_by="Owner", status=deprecated]),
            chk_outcome('SCEN-ZERO', infeasible(_)))),
    chk_kb((chk_zero_fixture, chk_req('REQ-EX', [approved_by="Owner"]), chk_rel(exempts, 'REQ-EX', 'REQ-POS'),
            chk_outcome('SCEN-ZERO', infeasible(_)))),
    Outcomes = [infeasible, infeasible].

test(scenario_without_source, [Source, Outcome] == ["", infeasible]) :-
    chk_kb((
        chk_cart_req('REQ-POS', 'FACT-POS', gt, 0),
        chk_total('FACT-ZERO', eq, 0),
        chk_raw_entity(scenario, 'SCEN-RAW', [id='SCEN-RAW', title="Raw", status=active, expects=success]),
        chk_raw_rel(assumes, 'SCEN-RAW', 'FACT-ZERO'),
        check_scenario_feasibility([violation(_, 'SCEN-RAW', _, _, Source)]),
        chk_outcome('SCEN-RAW', infeasible(_)),
        Outcome = infeasible
    )).

test(infeasible_scenarios_enumerate_success_scenarios, Witnesses == [
        'SCEN-A'-['REQ-POS']-['FACT-ZERO']-['FACT-POS'],
        'SCEN-B'-['REQ-POS']-['FACT-ZERO']-['FACT-POS']
    ]) :-
    chk_kb((
        chk_cart_req('REQ-POS', 'FACT-POS', gt, 0),
        chk_total('FACT-ZERO', eq, 0),
        chk_scenario('SCEN-B', success, ['FACT-ZERO']),
        chk_scenario('SCEN-A', success, ['FACT-ZERO']),
        chk_scenario('SCEN-C', rejection, ['FACT-ZERO']),
        chk_ent(scenario, 'SCEN-D', []),
        findall(S-R-A-F, checks:infeasible_scenario(S, R, A, F, _), Witnesses),
        checks:infeasible_scenario('SCEN-A', _, _, _, _),
        \+ checks:infeasible_scenario('SCEN-C', _, _, _, _),
        \+ checks:infeasible_scenario('SCEN-D', _, _, _, _)
    )).

test(outcomes, Outcomes == [
        unknown(no_assumptions),
        unknown(unmatched_assumption(['FACT-COLOR'])),
        feasible,
        unknown(contradictory_assumptions(['FACT-ONE', 'FACT-TWO'])),
        unknown(incomparable_assumption(['FACT-TEXT'])),
        unknown(conflicting_requirements(['REQ-HI', 'REQ-LO'])),
        unknown(undetermined_validity(['FACT-WIN'])),
        not_applicable(outside_validity(['FACT-NOW'])),
        not_applicable(disjoint_scope(['FACT-US']))
    ]) :-
    chk_kb((
        chk_cart_req('REQ-POS', 'FACT-POS', gt, 0),
        chk_scenario('SCEN-NONE', success, []),
        chk_prop('FACT-COLOR', cart, color, eq, string, "red", []),
        chk_scenario('SCEN-COLOR', success, ['FACT-COLOR']),
        chk_total('FACT-FIVE', eq, 5),
        chk_scenario('SCEN-FIVE', success, ['FACT-FIVE']),
        chk_total('FACT-ONE', eq, 1),
        chk_total('FACT-TWO', eq, 2),
        chk_scenario('SCEN-BOTH', success, ['FACT-ONE', 'FACT-TWO']),
        chk_prop('FACT-TEXT', cart, total, eq, string, "lots", []),
        chk_scenario('SCEN-TEXT', success, ['FACT-TEXT']),
        Outcomes0 = [O1, O2, O3, O4, O5],
        forall(member(_, []), true),
        chk_outcome('SCEN-NONE', O1),
        chk_outcome('SCEN-COLOR', O2),
        chk_outcome('SCEN-FIVE', O3),
        chk_outcome('SCEN-BOTH', O4),
        chk_outcome('SCEN-TEXT', O5)
    )),
    chk_kb((
        chk_cart_req('REQ-HI', 'FACT-HI', gt, 5),
        chk_cart_req('REQ-LO', 'FACT-LO', lt, 3),
        chk_total('FACT-ANY', gte, 0),
        chk_scenario('SCEN-ANY', success, ['FACT-ANY']),
        chk_outcome('SCEN-ANY', O6)
    )),
    chk_kb((
        chk_cart_req('REQ-WIN', 'FACT-WIN', gt, 0, [valid_from="2026-01-01T00:00:00Z"]),
        chk_total('FACT-ZERO', eq, 0),
        chk_scenario('SCEN-WIN', success, ['FACT-ZERO']),
        chk_outcome('SCEN-WIN', O7)
    )),
    chk_kb((
        chk_cart_req('REQ-OLD', 'FACT-OLD', gt, 0, [valid_to="2020-01-01T00:00:00Z"]),
        chk_total('FACT-NOW', eq, 0, [valid_from="2026-01-01T00:00:00Z"]),
        chk_scenario('SCEN-NOW', success, ['FACT-NOW']),
        chk_outcome('SCEN-NOW', O8)
    )),
    chk_kb((
        chk_cart_req('REQ-EU', 'FACT-EU', gt, 0, [scope="eu"]),
        chk_total('FACT-US', eq, 0, [scope="us"]),
        chk_scenario('SCEN-US', success, ['FACT-US']),
        chk_outcome('SCEN-US', O9)
    )),
    append(Outcomes0, [O6, O7, O8, O9], Outcomes).

test(no_outcome_for_rejection_scenarios) :-
    chk_kb((
        chk_scenario('SCEN-R', rejection, []),
        \+ checks:scenario_feasibility_outcome('SCEN-R', _),
        findall(S, checks:scenario_feasibility_outcome(S, _), Ss),
        Ss == []
    )).

test(outcome_decided_before_matching) :-
    chk_kb((
        chk_zero_fixture,
        chk_prop('FACT-COLOR', cart, color, eq, string, "red", []),
        chk_rel(assumes, 'SCEN-ZERO', 'FACT-COLOR'),
        \+ checks:scenario_feasibility_outcome('SCEN-ZERO', unknown(_))
    )).

test(analysis_of_a_mixed_scenario, Analysis == analysis(
        [infeasibility(['REQ-POS'], ['FACT-ZERO'], ['FACT-POS'],
            'No value of cart.total satisfies assumed FACT-ZERO (eq 0) together with required FACT-POS (gt 0)')],
        [unmatched_assumption(['FACT-COLOR'])], false, [])) :-
    chk_kb((
        chk_zero_fixture,
        chk_prop('FACT-COLOR', cart, color, eq, string, "red", []),
        chk_rel(assumes, 'SCEN-ZERO', 'FACT-COLOR'),
        chk_analysis('SCEN-ZERO', Analysis)
    )).

test(analysis_reports_every_unknown_in_order, Unknowns == [
        contradictory_assumptions(['FACT-ONE', 'FACT-TWO']),
        unmatched_assumption(['FACT-COLOR']),
        incomparable_assumption(['FACT-TEXT'])
    ]) :-
    chk_kb((
        chk_cart_req('REQ-POS', 'FACT-POS', gt, 0),
        chk_prop('FACT-QTY', cart, qty, eq, int, 1, []),
        chk_prop('FACT-QTY2', cart, qty, eq, int, 2, []),
        chk_prop('FACT-REQ-QTY', cart, qty, gt, int, 0, []),
        chk_rel(requires_property, 'REQ-POS', 'FACT-REQ-QTY'),
        chk_total('FACT-ONE', eq, 1),
        chk_total('FACT-TWO', eq, 2),
        chk_prop('FACT-COLOR', cart, color, eq, string, "red", []),
        chk_prop('FACT-TEXT', cart, qty, eq, string, "x", [scope="eu"]),
        chk_scenario('SCEN-MIX', success, ['FACT-ONE', 'FACT-TWO', 'FACT-COLOR', 'FACT-TEXT']),
        chk_analysis('SCEN-MIX', analysis([], Unknowns, false, []))
    )).

test(not_applicable_lists_outside_then_disjoint, NotApplicable == [
        outside_validity(['FACT-NOW']), disjoint_scope(['FACT-US'])]) :-
    chk_kb((
        chk_cart_req('REQ-OLD', 'FACT-OLD', gt, 0, [valid_to="2020-01-01T00:00:00Z"]),
        chk_prop('FACT-EU', cart, qty, gt, int, 0, [scope="eu"]),
        chk_rel(requires_property, 'REQ-OLD', 'FACT-EU'),
        chk_total('FACT-NOW', eq, 0, [valid_from="2026-01-01T00:00:00Z"]),
        chk_prop('FACT-US', cart, qty, eq, int, 0, [scope="us"]),
        chk_scenario('SCEN-NA', success, ['FACT-NOW', 'FACT-US']),
        chk_analysis('SCEN-NA', analysis([], [], false, NotApplicable))
    )).

test(by_exception_flag, Analysis == analysis([], [], true, [])) :-
    chk_kb((chk_zero_fixture, chk_exception('REQ-EX', [approved_by="Owner"]),
            chk_analysis('SCEN-ZERO', Analysis))).

test(no_assumptions_analysis, Analysis == analysis([], [no_assumptions], false, [])) :-
    chk_kb((chk_scenario('SCEN-N', success, []), chk_analysis('SCEN-N', Analysis))).

test(analysis_memo) :-
    chk_kb((
        chk_zero_fixture,
        retractall(kb:kb_scenario_feasibility_memo(_, _, _)),
        assertz(kb:kb_scenario_feasibility_memo(stale, old_key, stale_analysis)),
        checks:scenario_feasibility_analysis('SCEN-ZERO', A1),
        findall(S-A, kb:kb_scenario_feasibility_memo(S, _, A), Memo1),
        Memo1 == ['SCEN-ZERO'-A1],
        A1 = analysis([_], [], false, []),
        kb:kb_scenario_feasibility_memo('SCEN-ZERO', Key, _),
        retractall(kb:kb_scenario_feasibility_memo(_, _, _)),
        assertz(kb:kb_scenario_feasibility_memo('SCEN-ZERO', Key, cached)),
        checks:scenario_feasibility_analysis('SCEN-ZERO', A2),
        A2 == cached,
        chk_total('FACT-SEVEN', eq, 7),
        chk_scenario('SCEN-SEVEN', success, ['FACT-SEVEN']),
        kb:index_verification_key(scenario_feasibility, Key2),
        retractall(kb:kb_scenario_feasibility_memo(_, _, _)),
        assertz(kb:kb_scenario_feasibility_memo('SCEN-ZERO', Key2, kept)),
        checks:scenario_feasibility_analysis('SCEN-SEVEN', A3),
        A3 == analysis([], [], false, []),
        findall(S, kb:kb_scenario_feasibility_memo(S, _, _), Memo3),
        Memo3 == ['SCEN-ZERO', 'SCEN-SEVEN'],
        rdf_transaction((
            checks:scenario_feasibility_analysis('SCEN-ZERO', A4),
            A4 = analysis([_], [], false, [])
        )),
        findall(S, kb:kb_scenario_feasibility_memo(S, _, _), Memo4),
        Memo4 == ['SCEN-ZERO', 'SCEN-SEVEN'],
        retractall(kb:kb_scenario_feasibility_memo(_, _, _))
    )).

test(analysis_memo_skipped_for_unbound_scenarios) :-
    chk_kb((
        chk_zero_fixture,
        retractall(kb:kb_scenario_feasibility_memo(_, _, _)),
        findall(S, checks:scenario_feasibility_analysis(S, _), _),
        \+ kb:kb_scenario_feasibility_memo(_, _, _)
    )).

test(scenario_windows, Windows == [unspecified, window('2026-02-01T00:00:00Z', '2026-03-01T00:00:00Z'),
                                   window('2026-01-01T00:00:00Z', ''), window('', '2026-03-01T00:00:00Z')]) :-
    chk_kb((
        chk_total('F-PLAIN', eq, 1),
        chk_total('F-A', eq, 1, [valid_from="2026-01-01T00:00:00Z", valid_to="2026-03-01T00:00:00Z"]),
        chk_total('F-B', eq, 1, [valid_from="2026-02-01T00:00:00Z", valid_to="2026-04-01T00:00:00Z"]),
        chk_total('F-C', eq, 1, [valid_from="2026-01-01T00:00:00Z"]),
        chk_total('F-D', eq, 1, [valid_to="2026-03-01T00:00:00Z"]),
        checks:scenario_window(['F-PLAIN'], W1),
        checks:scenario_window(['F-PLAIN', 'F-A', 'F-B'], W2),
        checks:scenario_window(['F-C'], W3),
        checks:scenario_window(['F-D', 'F-PLAIN'], W4),
        Windows = [W1, W2, W3, W4]
    )).

test(property_members, Members == [
        m(assumption, 'F-A', 'F-A', cart-total, '', int, '', eq, 1, 'eq 1'),
        m(requirement, 'REQ', 'F-B', cart-total, eu, int, s, gt, 60, 'forbid lte 1 min'),
        m(requirement, 'REQ', 'F-C', cart-total, '', int, '', unsupported, 2, 'forbid matches 2')
    ]) :-
    chk_kb((
        chk_total('F-A', eq, 1),
        chk_total('F-B', lte, 1, [polarity=forbid, unit="min", scope="eu"]),
        chk_raw_entity(fact, 'F-C', [fact_kind=property_value, subject_key="cart", property_key="total",
                                     operator=matches, value_type=int, value_int=2, polarity=forbid]),
        checks:assumption_member('F-A', M1),
        checks:property_member(requirement, 'REQ', 'F-B', M2),
        checks:property_member(requirement, 'REQ', 'F-C', M3),
        \+ checks:property_member(requirement, 'REQ', 'F-MISSING', _),
        Members = [M1, M2, M3]
    )).

test(property_constraints, Constraints == [
        rc(m(requirement, 'REQ-A', 'FACT-A', cart-total, '', int, '', gt, 0, 'gt 0'), applies, false),
        rc(m(requirement, 'REQ-B', 'FACT-B', cart-total, '', int, '', lt, 9, 'lt 9'), undetermined, true)
    ]) :-
    chk_kb((
        chk_cart_req('REQ-A', 'FACT-A', gt, 0),
        chk_cart_req('REQ-B', 'FACT-B', lt, 9, [valid_to="2027-01-01T00:00:00Z"]),
        chk_cart_req('REQ-GONE', 'FACT-GONE', lt, 1),
        chk_req('REQ-NEW'),
        chk_rel(supersedes, 'REQ-NEW', 'REQ-GONE'),
        chk_prop('FACT-QTY', cart, qty, gt, int, 0, []),
        chk_rel(requires_property, 'REQ-A', 'FACT-QTY'),
        chk_scenario('SCEN', success, []),
        chk_req('REQ-EX', [approved_by="Owner"]),
        chk_rel(exempts, 'REQ-EX', 'REQ-B'),
        chk_rel(specified_by, 'REQ-EX', 'SCEN'),
        checks:property_constraints('SCEN', [cart-total], unspecified, Constraints)
    )).

test(exception_helpers) :-
    chk_kb((
        chk_zero_fixture,
        chk_req('REQ-EX', [approved_by="Owner", exempts_claims=["CLAIM-POS", "CLAIM-X"]]),
        chk_req('REQ-EMPTY', [approved_by="", exempts_claims=[]]),
        chk_req('REQ-NUM', [approved_by="7"]),
        checks:exception_claim_keys('REQ-EX', Keys),
        Keys == ['CLAIM-POS', 'CLAIM-X'],
        \+ checks:exception_claim_keys('REQ-EMPTY', _),
        \+ checks:exception_claim_keys('REQ-POS', _),
        checks:fact_claim_key('FACT-POS', Claim),
        Claim == 'CLAIM-POS',
        \+ checks:fact_claim_key('FACT-ZERO', _),
        checks:exception_covers('REQ-EX', 'FACT-POS'),
        \+ checks:exception_covers('REQ-EX', 'FACT-ZERO'),
        checks:exception_covers('REQ-NUM', 'FACT-ZERO'),
        checks:exception_approved('REQ-EX'),
        checks:exception_approved('REQ-NUM'),
        \+ checks:exception_approved('REQ-EMPTY'),
        \+ checks:exception_approved('REQ-POS'),
        checks:evidence_text(^^("a", x), T1), T1 == "a",
        checks:evidence_text(abc, T2), T2 == "abc",
        checks:evidence_text(f(x), T3), T3 == "f(x)",
        checks:evidence_text(42, T4), T4 == "42"
    )).

test(constraint_exempt_once) :-
    chk_kb((
        chk_zero_fixture,
        chk_exception('REQ-EX', [approved_by="Owner"]),
        chk_exception('REQ-EX2', [approved_by="Owner"]),
        first_answer_is_last(checks:constraint_exempt('SCEN-ZERO', 'REQ-POS', 'FACT-POS')),
        checks:exemption_flag('SCEN-ZERO', 'REQ-POS', 'FACT-POS', E1),
        E1 == true,
        checks:exemption_flag('SCEN-ZERO', 'REQ-OTHER', 'FACT-POS', E2),
        E2 == false
    )).

test(narrow_exception_helper) :-
    chk_kb((
        chk_zero_fixture,
        chk_exception('REQ-NARROW', [approved_by="Owner", exempts_claims=["CLAIM-OTHER"]]),
        chk_exception('REQ-WIDE', [approved_by="Owner"]),
        chk_exception('REQ-COVERS', [approved_by="Owner", exempts_claims=["CLAIM-POS"]]),
        chk_exception('REQ-UNAPPROVED', [exempts_claims=["CLAIM-OTHER"]]),
        findall(E, checks:narrow_scenario_exception('SCEN-ZERO', 'REQ-POS', ['FACT-POS', 'FACT-POS'], E), Es),
        Es == ['REQ-NARROW'],
        findall(U, checks:unapproved_scenario_exception('SCEN-ZERO', 'REQ-POS', U), Us),
        Us == ['REQ-UNAPPROVED']
    )).

:- end_tests(checks_feasibility_kb).

% --- scenario feasibility: the rule lane --------------------------------------

:- begin_tests(checks_feasibility_rule_lane).

% REQ-RULE requires FACT-RULE: Modality Head :- cart.total =< 0 (or the given
% conditions), read in the rule lane.
chk_rule_req(Kind, Modality, Head, Conditions, Extra) :-
    chk_req('REQ-RULE'),
    chk_rule_fact('FACT-RULE', Kind, Modality, Head, Conditions, Extra, [], _),
    chk_rel(requires_rule, 'REQ-RULE', 'FACT-RULE').

chk_rule_scenario(Assumed) :-
    chk_total('FACT-ZERO', eq, 0),
    chk_scenario('SCEN-R', success, Assumed).

chk_rule_witness(Text, analysis([infeasibility(['REQ-RULE'], ['FACT-ZERO'], ['FACT-RULE'], Reason)], [], false, [])) :-
    format(atom(Reason), 'No value of cart.total satisfies assumed FACT-ZERO (eq 0) together with required FACT-RULE (~w)', [Text]).

test(forbid_rule_specified_by_the_requirement, Analysis == Expected) :-
    chk_rule_witness('rule forbids checkout unless gt 0', Expected),
    chk_kb((
        chk_rule_req(rule, forbid, checkout, [total-lte-0], []),
        chk_rule_scenario(['FACT-ZERO']),
        chk_rel(specified_by, 'REQ-RULE', 'SCEN-R'),
        chk_analysis('SCEN-R', Analysis)
    )).

test(deny_rule_through_an_exception_link, Analysis == Expected) :-
    chk_rule_witness('rule forbids checkout unless gt 0', Expected),
    chk_kb((
        chk_rule_req(rule, deny, checkout, [total-lte-0], []),
        chk_rule_scenario(['FACT-ZERO']),
        chk_req('REQ-EX'),
        chk_rel(exempts, 'REQ-EX', 'REQ-RULE'),
        chk_rel(specified_by, 'REQ-EX', 'SCEN-R'),
        chk_analysis('SCEN-R', Analysis)
    )).

test(headless_rule_always_restricts, Analysis == Expected) :-
    chk_rule_witness('rule forbids the scenario unless gt 0', Expected),
    chk_kb((
        chk_rule_req(rule, forbid, none, [total-lte-0], []),
        chk_rule_scenario(['FACT-ZERO']),
        chk_analysis('SCEN-R', Analysis)
    )).

test(constraint_permit_rule, Analyses == [E, E]) :-
    chk_rule_witness('rule permits checkout only when gt 0', E),
    findall(A,
        (   member(Modality, [permit, oblige]),
            chk_kb((
                chk_rule_req(constraint, Modality, checkout, [total-gt-0], []),
                chk_rule_scenario(['FACT-ZERO']),
                chk_rel(specified_by, 'REQ-RULE', 'SCEN-R'),
                chk_analysis('SCEN-R', A)
            ))
        ),
        Analyses).

test(assumed_action_performs_the_head, Analysis == analysis([infeasibility(['REQ-RULE'], ['FACT-ZERO'], ['FACT-RULE'], Reason)], [], false, [])) :-
    Reason = 'No value of cart.total satisfies assumed FACT-ZERO (eq 0) together with required FACT-RULE (rule forbids shop:checkout unless gt 0)',
    chk_kb((
        chk_req('REQ-RULE'),
        chk_rule_json(rule, forbid, checkout, [total-lte-0], [], Json0),
        atom_json_dict(Json0, D0, []),
        Head = D0.head.put(namespace, shop),
        atom_json_dict(Json, D0.put(head, Head), [width(0)]),
        chk_raw_entity(fact, 'FACT-RULE', [id='FACT-RULE', title="Rule", status=active, fact_kind=rule, rule_ir=Json]),
        chk_rel(requires_rule, 'REQ-RULE', 'FACT-RULE'),
        chk_ent(fact, 'FACT-DO', [fact_kind=predicate, predicate_namespace="shop", predicate_name="checkout",
                                  predicate_args=["cart"], canonical_key="checkout(cart)"]),
        chk_ent(fact, 'FACT-DONT', [fact_kind=predicate, predicate_namespace="shop", predicate_name="checkout",
                                    predicate_args=["cart"], polarity=deny, canonical_key="checkout(cart):deny"]),
        chk_rule_scenario(['FACT-ZERO', 'FACT-DO']),
        chk_analysis('SCEN-R', Analysis)
    )).

test(rules_that_do_not_restrict_the_scenario, Analyses == [U, U, U, D, U]) :-
    D = analysis([], [unmatched_assumption(['FACT-DONT', 'FACT-ZERO'])], false, []),
    U = analysis([], [unmatched_assumption(['FACT-ZERO'])], false, []),
    findall(A,
        (   member(Kind-Modality-Conditions-Link,
                   [ rule-forbid-[total-lte-0]-none,
                     rule-permit-[total-gt-0]-specified,
                     rule-forbid-[qty-lte-0]-specified,
                     rule-forbid-[total-lte-0]-deny_assumed,
                     rule-forbid-[total-lte-0]-superseded
                   ]),
            chk_kb((
                chk_rule_req(Kind, Modality, checkout, Conditions, []),
                chk_rule_scenario(['FACT-ZERO']),
                chk_rule_link(Link),
                chk_analysis('SCEN-R', A)
            ))
        ),
        Analyses).

chk_rule_link(none).
chk_rule_link(specified) :- chk_rel(specified_by, 'REQ-RULE', 'SCEN-R').
chk_rule_link(deny_assumed) :-
    chk_ent(fact, 'FACT-DONT', [fact_kind=predicate, predicate_name="checkout", predicate_args=["cart"],
                                polarity=deny, canonical_key="checkout(cart):deny"]),
    chk_raw_rel(assumes, 'SCEN-R', 'FACT-DONT').
chk_rule_link(superseded) :-
    chk_rel(specified_by, 'REQ-RULE', 'SCEN-R'),
    chk_req('REQ-NEXT'),
    chk_rel(supersedes, 'REQ-NEXT', 'REQ-RULE').

test(rule_validity_windows, Analyses == [
        analysis([], [undetermined_validity(['FACT-RULE'])], false, []),
        analysis([], [undetermined_validity(['FACT-RULE'])], false, []),
        analysis([], [], false, [outside_validity(['FACT-ZERO'])])
    ]) :-
    findall(A,
        (   member(Extra-FactExtra-Assumed,
                   [ ['validFrom'-'2026-01-01T00:00:00Z']-[]-[],
                     []-[valid_from="2026-01-01T00:00:00Z"]-[],
                     ['validTo'-'2020-01-01T00:00:00Z']-[valid_from="2027-01-01T00:00:00Z"]-[valid_from="2026-01-01T00:00:00Z"]
                   ]),
            chk_kb((
                chk_req('REQ-RULE'),
                chk_rule_fact('FACT-RULE', rule, forbid, checkout, [total-lte-0], Extra, FactExtra, _),
                chk_rel(requires_rule, 'REQ-RULE', 'FACT-RULE'),
                chk_total('FACT-ZERO', eq, 0, Assumed),
                chk_scenario('SCEN-R', success, ['FACT-ZERO']),
                chk_rel(specified_by, 'REQ-RULE', 'SCEN-R'),
                chk_analysis('SCEN-R', A)
            ))
        ),
        Analyses).

test(general_rule_blocks, Analysis == analysis([infeasibility(['REQ-RULE'], ['FACT-NINE', 'FACT-ZERO'], ['FACT-RULE'], Reason)], [], false, [])) :-
    chk_kb((
        chk_rule_req(rule, forbid, checkout, [total-lte-0, qty-gt-5], []),
        chk_prop('FACT-NINE', cart, qty, eq, int, 9, []),
        chk_rule_scenario(['FACT-ZERO', 'FACT-NINE']),
        chk_rel(specified_by, 'REQ-RULE', 'SCEN-R'),
        chk_analysis('SCEN-R', Analysis),
        kb_entity('FACT-RULE', fact, Props),
        checks:logic_rule_render(Props, Text),
        format(atom(Reason), 'Assumed FACT-NINE (eq 9), FACT-ZERO (eq 0) satisfy every condition of rule FACT-RULE (~w), which forbids the scenario\'s action', [Text])
    )).

test(general_rule_undecided_and_exempt, Analyses == [
        analysis([], [undecided_rule(['FACT-RULE'])], false, []),
        analysis([], [], true, [])
    ]) :-
    chk_kb((
        chk_rule_req(rule, forbid, checkout, [total-lte-0, qty-gt-5], []),
        chk_rule_scenario(['FACT-ZERO']),
        chk_rel(specified_by, 'REQ-RULE', 'SCEN-R'),
        chk_analysis('SCEN-R', A1)
    )),
    chk_kb((
        chk_rule_req(rule, forbid, checkout, [total-lte-0, qty-gt-5], []),
        chk_prop('FACT-NINE', cart, qty, eq, int, 9, []),
        chk_rule_scenario(['FACT-ZERO', 'FACT-NINE']),
        chk_req('REQ-EX', [approved_by="Owner"]),
        chk_rel(exempts, 'REQ-EX', 'REQ-RULE'),
        chk_rel(specified_by, 'REQ-EX', 'SCEN-R'),
        chk_analysis('SCEN-R', A2)
    )),
    Analyses = [A1, A2].

test(rule_constraints_split_and_actions) :-
    chk_kb((
        chk_req('REQ-A'),
        chk_rule_fact('FACT-A', rule, forbid, checkout, [total-lte-0], [], [], _),
        chk_rel(requires_rule, 'REQ-A', 'FACT-A'),
        chk_req('REQ-B'),
        chk_rule_fact('FACT-B', rule, forbid, pay, [total-lte-0, qty-gt-1], [], [], _),
        chk_rel(requires_rule, 'REQ-B', 'FACT-B'),
        chk_req('REQ-C'),
        chk_rule_fact('FACT-C', rule, forbid, none, [total-gt-9], [], [], _),
        chk_rel(requires_rule, 'REQ-C', 'FACT-C'),
        chk_scenario('SCEN', success, []),
        chk_rel(specified_by, 'REQ-A', 'SCEN'),
        chk_rel(specified_by, 'REQ-B', 'SCEN'),
        checks:rule_constraints('SCEN', [cart-total], unspecified, Constraints, General, Actions),
        Constraints == [
            rc(m(requirement, 'REQ-A', 'FACT-A', cart-total, '', number, '', gt, 0, 'rule forbids checkout unless gt 0'), applies, false),
            rc(m(requirement, 'REQ-C', 'FACT-C', cart-total, '', number, '', lte, 9, 'rule forbids the scenario unless lte 9'), applies, false)
        ],
        General = [gr('REQ-B', 'FACT-B', forbids, '', applies, false, [cart-qty, cart-total], _)],
        Actions == [default-checkout, default-pay]
    )).

test(rule_head_performed) :-
    chk_kb((
        chk_req('REQ-A'),
        chk_scenario('SCEN', success, []),
        first_answer_is_last(checks:rule_head_performed('SCEN', 'REQ-A', none)),
        \+ checks:rule_head_performed('SCEN', 'REQ-A', atom(default, checkout, [], positive, false)),
        chk_rel(specified_by, 'REQ-A', 'SCEN'),
        first_answer_is_last(checks:rule_head_performed('SCEN', 'REQ-A', atom(default, checkout, [], positive, false)))
    )),
    chk_kb((
        chk_req('REQ-A'),
        chk_req('REQ-EX'),
        chk_scenario('SCEN', success, []),
        chk_rel(exempts, 'REQ-EX', 'REQ-A'),
        chk_rel(specified_by, 'REQ-EX', 'SCEN'),
        chk_req('REQ-EX2'),
        chk_rel(exempts, 'REQ-EX2', 'REQ-A'),
        chk_rel(specified_by, 'REQ-EX2', 'SCEN'),
        first_answer_is_last(checks:rule_head_performed('SCEN', 'REQ-A', atom(default, checkout, [], positive, false)))
    )),
    chk_kb((
        chk_req('REQ-A'),
        chk_ent(fact, 'FACT-DO', [fact_kind=predicate, predicate_name="checkout", predicate_args=["cart"], canonical_key="checkout(cart)"]),
        chk_ent(fact, 'FACT-DO2', [fact_kind=predicate, predicate_name="checkout", predicate_args=["bag"], canonical_key="checkout(bag)"]),
        chk_scenario('SCEN', success, ['FACT-DO', 'FACT-DO2']),
        first_answer_is_last(checks:rule_head_performed('SCEN', 'REQ-A', atom(default, checkout, [], positive, false))),
        \+ checks:rule_head_performed('SCEN', 'REQ-A', atom(default, checkout, [], negative, false)),
        \+ checks:rule_head_performed('SCEN', 'REQ-A', atom(other, checkout, [], positive, false))
    )).

test(rule_validity) :-
    chk_kb((
        chk_total('F', eq, 0, [valid_from="2026-01-01T00:00:00Z"]),
        findall(F-T, checks:rule_validity('F', '', '', F, T), W1),
        W1 == ['2026-01-01T00:00:00Z'-''],
        findall(F-T, checks:rule_validity('F', a, '', F, T), W2),
        W2 == [a-''],
        findall(F-T, checks:rule_validity('F', '', b, F, T), W3),
        W3 == [''-b]
    )).

:- end_tests(checks_feasibility_rule_lane).

% --- negative scenarios, opposing assumptions, unknown and mismatch reports ----

:- begin_tests(checks_negative_scenarios).

test(witnesses_from_feasibility, Witnesses == ['SCEN-ERR'-'REQ-POS', 'SCEN-REJ'-'REQ-POS']) :-
    chk_kb((
        chk_cart_req('REQ-POS', 'FACT-POS', gt, 0),
        chk_total('FACT-ZERO', eq, 0),
        chk_scenario('SCEN-REJ', rejection, ['FACT-ZERO']),
        chk_scenario('SCEN-ERR', error, ['FACT-ZERO']),
        chk_scenario('SCEN-OK', success, ['FACT-ZERO']),
        findall(S-R, checks:negative_scenario_witness(S, R, infeasibility(_, _, _, _)), Witnesses),
        checks:negative_scenario_witness('SCEN-REJ', 'REQ-POS', _),
        \+ checks:negative_scenario_witness('SCEN-OK', _, _),
        \+ checks:negative_scenario_witness('SCEN-REJ', 'REQ-OTHER', infeasibility(_, _, _, _))
    )).

test(opposed_claim_facts, Witnesses == [
        'SCEN-PRED'-opposed('FACT-DENY', 'FACT-ALLOW'),
        'SCEN-RULE'-opposed('FACT-DO', 'FACT-RULE'),
        'SCEN-VALUE'-opposed('FACT-TEN', 'FACT-POS')
    ]) :-
    chk_kb((
        % a property value against the requirement's property fact
        chk_cart_req('REQ-POS', 'FACT-POS', lt, 5),
        chk_total('FACT-TEN', eq, 10),
        chk_scenario('SCEN-VALUE', rejection, ['FACT-TEN']),
        chk_rel(specified_by, 'REQ-POS', 'SCEN-VALUE'),
        % the opposite polarity of a required predicate
        chk_req('REQ-PRED'),
        chk_ent(fact, 'FACT-ALLOW', [fact_kind=predicate, predicate_name="refund", predicate_args=["order"], canonical_key="refund(order)"]),
        chk_ent(fact, 'FACT-DENY', [fact_kind=predicate, predicate_name="refund", predicate_args=["order"], polarity=deny, canonical_key="refund(order):deny"]),
        chk_rel(requires_predicate, 'REQ-PRED', 'FACT-ALLOW'),
        chk_scenario('SCEN-PRED', rejection, ['FACT-DENY']),
        chk_rel(specified_by, 'REQ-PRED', 'SCEN-PRED'),
        % a fact instantiating an atom of a required rule
        chk_req('REQ-R'),
        chk_rule_fact('FACT-RULE', forbid, checkout, [total-lte-0], [], _),
        chk_rel(requires_rule, 'REQ-R', 'FACT-RULE'),
        chk_ent(fact, 'FACT-DO', [fact_kind=predicate, predicate_name="checkout", predicate_args=["cart"], canonical_key="checkout(cart)"]),
        chk_scenario('SCEN-RULE', error, ['FACT-DO']),
        chk_rel(specified_by, 'REQ-R', 'SCEN-RULE'),
        % not current, not specified: no witness
        chk_req('REQ-OLD', [status=deprecated]),
        chk_rel(requires_predicate, 'REQ-OLD', 'FACT-ALLOW'),
        chk_rel(specified_by, 'REQ-OLD', 'SCEN-PRED'),
        findall(S-W, (checks:negative_scenario_witness(S, _, W), W = opposed(_, _)), Witnesses)
    )).

chk_oppose_fixture :-
    chk_total('A-EQ5', eq, 5),
    chk_total('A-EQ5-EU', eq, 5, [scope="eu"]),
    chk_total('R-EQ5-FORBID', eq, 5, [polarity=forbid]),
    chk_total('R-GT5', gt, 5),
    chk_total('R-GT5-US', gt, 5, [scope="us"]),
    chk_total('R-EQ5-US', eq, 5, [scope="us", polarity=forbid]),
    chk_total('R-GT1', gt, 1),
    chk_total('R-GT1-FORBID', gt, 1, [polarity=forbid]),
    chk_prop('R-OTHER', cart, qty, gt, int, 9, []),
    chk_ent(fact, 'P-ALLOW', [fact_kind=predicate, predicate_name="refund", predicate_args=["order"], canonical_key="refund(order)"]),
    chk_ent(fact, 'P-ALLOW2', [fact_kind=predicate, predicate_name="refund", predicate_args=["order"], canonical_key="refund(order)"]),
    chk_ent(fact, 'P-DENY', [fact_kind=predicate, predicate_name="refund", predicate_args=["order"], polarity=deny, canonical_key="refund(order):deny"]),
    chk_ent(fact, 'P-OTHER-ARGS', [fact_kind=predicate, predicate_name="refund", predicate_args=["gift"], polarity=deny, canonical_key="refund(gift):deny"]),
    chk_rule_fact('RULE-REFUND', forbid, refund, [total-lte-0], [], _),
    chk_rule_fact('RULE-PAY', forbid, pay, [total-lte-0], [], _).

test(facts_oppose) :-
    chk_kb((
        chk_oppose_fixture,
        findall(R, (member(R, ['R-EQ5-FORBID', 'R-GT5', 'R-GT5-US', 'R-EQ5-US', 'R-GT1', 'R-GT1-FORBID', 'R-OTHER',
                               'P-ALLOW', 'RULE-REFUND']),
                    checks:facts_oppose('A-EQ5', R)), Opposed),
        Opposed == ['R-EQ5-FORBID', 'R-GT5', 'R-GT5-US', 'R-EQ5-US'],
        \+ checks:facts_oppose('A-EQ5-EU', 'R-GT5-US'),
        findall(R, (member(R, ['P-ALLOW', 'P-ALLOW2', 'P-OTHER-ARGS', 'RULE-REFUND', 'RULE-PAY', 'R-GT1']),
                    checks:facts_oppose('P-DENY', R)), POpposed),
        POpposed == ['P-ALLOW', 'P-ALLOW2', 'RULE-REFUND'],
        \+ checks:facts_oppose('P-ALLOW', 'P-ALLOW2'),
        first_answer_is_last(checks:facts_oppose('A-EQ5', 'R-GT5')),
        first_answer_is_last(checks:facts_oppose('P-DENY', 'P-ALLOW')),
        first_answer_is_last(checks:facts_oppose('P-DENY', 'RULE-REFUND'))
    )).

chk_opposing(Id, Plain) :-
    checks:opposing_assumption(Id, A),
    dict_pairs(A, _, Plain).

test(opposing_property_assumptions, Assumptions == [
        [fact_kind-property_value, operator-eq, property_key-total, subject_key-cart, value-6, value_type-int],
        [fact_kind-property_value, operator-eq, property_key-total, scope-eu, subject_key-cart, unit-s, value-4, value_type-int],
        [fact_kind-property_value, operator-lt, property_key-total, subject_key-cart, value-5.0, value_type-number],
        [fact_kind-property_value, operator-neq, property_key-total, subject_key-cart, value-7, value_type-int],
        [fact_kind-property_value, operator-eq, property_key-flag, subject_key-cart, value-false, value_type-bool],
        [fact_kind-property_value, operator-eq, property_key-flag, subject_key-cart, value-true, value_type-bool],
        [fact_kind-property_value, operator-neq, property_key-name, subject_key-cart, value-"a", value_type-string],
        [fact_kind-property_value, operator-eq, property_key-name, subject_key-cart, value-"b", value_type-string],
        [fact_kind-property_value, operator-eq, property_key-tags, subject_key-cart, value-[a], value_type-set]
    ]) :-
    chk_kb((
        chk_total('F-LTE', lte, 5),
        chk_total('F-GTE', gte, 5, [unit="s", scope="eu"]),
        chk_prop('F-NUM', cart, total, gte, number, 5, []),
        chk_total('F-FORBID', neq, 7, [polarity=forbid]),
        chk_prop('F-TRUE', cart, flag, eq, bool, true, []),
        chk_prop('F-FALSE', cart, flag, eq, bool, false, []),
        chk_prop('F-STR', cart, name, eq, string, "a", []),
        chk_prop('F-NEQ', cart, name, neq, string, "b", []),
        chk_prop('F-SET', cart, tags, eq, set, ["a", "b"], []),
        findall(P, (member(Id, ['F-LTE', 'F-GTE', 'F-NUM', 'F-FORBID', 'F-TRUE', 'F-FALSE', 'F-STR', 'F-NEQ', 'F-SET']),
                    chk_opposing(Id, P)),
                Assumptions)
    )).

test(opposing_predicate_and_rule_assumptions, Assumptions == [
        [fact_kind-predicate, polarity-deny, predicate_args-[order], predicate_name-refund, predicate_namespace-default],
        [fact_kind-predicate, polarity-assert, predicate_args-[c], predicate_name-checkout, predicate_namespace-default],
        [fact_kind-predicate, polarity-assert, predicate_args-[c, v1], predicate_name-total, predicate_namespace-cart]
    ]) :-
    chk_kb((
        chk_ent(fact, 'P-ALLOW', [fact_kind=predicate, predicate_name="refund", predicate_args=["order"], canonical_key="refund(order)"]),
        chk_rule_fact('RULE-HEAD', forbid, checkout, [total-lte-0], [], _),
        chk_rule_fact('RULE-BODY', forbid, none, [total-lte-0], [], _),
        findall(P, (member(Id, ['P-ALLOW', 'RULE-HEAD', 'RULE-BODY', 'MISSING']), chk_opposing(Id, P)), Assumptions),
        first_answer_is_last(checks:opposing_assumption('P-ALLOW', _)),
        first_answer_is_last(checks:opposing_assumption('RULE-HEAD', _))
    )).

test(opposing_values) :-
    findall(O-V, checks:opposing_value(bool, eq, "true", O, V), B1), B1 == [eq-false],
    findall(O-V, checks:opposing_value(bool, eq, 'True', O, V), B2), B2 == [eq-false],
    findall(O-V, checks:opposing_value(bool, eq, no, O, V), B3), B3 == [eq-true],
    findall(O-V, checks:opposing_value(int, gt, 3, O, V), N1), N1 == [eq-3],
    findall(O-V, checks:opposing_value(int, lt, 3, O, V), N2), N2 == [eq-3],
    findall(O-V, checks:opposing_value(int, gte, 3, O, V), N3), N3 == [eq-2],
    findall(O-V, checks:opposing_value(number, gte, 3, O, V), N4), N4 == [lt-3],
    findall(O-V, checks:opposing_value(int, lte, 3, O, V), N5), N5 == [eq-4],
    findall(O-V, checks:opposing_value(number, lte, 3, O, V), N6), N6 == [gt-3],
    findall(O-V, checks:opposing_value(int, eq, 3, O, V), N7), N7 == [neq-3],
    findall(O-V, checks:opposing_value(int, neq, 3, O, V), N8), N8 == [eq-3],
    findall(O-V, checks:opposing_value(int, matches, 3, O, V), N9), N9 == [],
    findall(O-V, checks:opposing_value(int, eq, x, O, V), N10), N10 == [neq-x],
    findall(O-V, checks:opposing_value(set, eq, [a, b], O, V), S1), S1 == [eq-[a]],
    findall(O-V, checks:opposing_value(set, includes, [a], O, V), S2), S2 == [eq-[]],
    findall(O-V, checks:opposing_value(set, subset_of, [a], O, V), S3), S3 == [includes-[unlisted_member]],
    findall(O-V, checks:opposing_value(set, excludes, [a, b], O, V), S4), S4 == [includes-[a]],
    findall(O-V, checks:opposing_value(set, excludes, [], O, V), S5), S5 == [],
    findall(O-V, checks:opposing_value(string, neq, s, O, V), T1), T1 == [eq-s],
    findall(O-V, checks:opposing_value(string, matches, s, O, V), T2), T2 == [],
    checks:members_but_last([], F0), F0 == [].

test(term_constants, Constants == [cart, '5', 'f(x)']) :-
    maplist(checks:term_constant, [var('Cart', t), const(5, int), f(x)], Constants).

chk_unknown_violation(Scenario, Description, Suggestion, violation('scenario-feasibility-unknown', Scenario, Description, Suggestion, Source)) :-
    format(string(S), "kb/~w.md", [Scenario]),
    chk_xsd(S, Source).

test(unknown_texts, Texts == [
        "Scenario expects success but assumes nothing, so its feasibility against current requirements is unknown"-"Link the property values the scenario relies on with assumes facts so feasibility can be checked",
        "Scenario expects success but its feasibility is unknown: assumptions a, b cannot hold together"-"Correct the assumed facts so they can hold together; a scenario whose assumptions contradict each other describes no situation",
        "Scenario expects success but its feasibility is unknown: assumption a, b is not constrained by any current requirement that governs this scenario"-"Constrain the assumed subject and property with a current requirement, correct the assumed fact's subject_key/property_key, or, for a requirement whose rule restricts an action, link the scenario to that requirement with specified_by",
        "Scenario expects success but its feasibility is unknown: assumption a, b cannot be compared with the requirement constraints on its property (type, unit or operator mismatch)"-"Align the value_type and unit of the assumed fact with the requirement facts on that property (int and number compare; units must match or be convertible), and use eq or neq for non-numeric values",
        "Scenario expects success but its feasibility is unknown: requirements a, b admit no common value for an assumed property"-"Resolve the conflict between these requirements (see the contradiction checks) before judging the scenario",
        "Scenario expects success but its feasibility is unknown: the assumptions neither satisfy nor refute the conditions of rule a, b"-"Assume values for every property the rule reads so its conditions are decided, or restate the rule with one comparison per property (forbid ... unless, or a permit-only-when constraint)",
        "Scenario expects success but its feasibility is unknown: it conflicts with a, b, whose validity window may or may not cover the scenario's time"-"State when the scenario happens by setting valid_from/valid_to on its assumed facts, or bound the scenario inside or outside the requirement's validity window"
    ]) :-
    findall(D-S,
        (   member(R, [no_assumptions, contradictory_assumptions([a, b]), unmatched_assumption([a, b]),
                       incomparable_assumption([a, b]), conflicting_requirements([a, b]),
                       undecided_rule([a, b]), undetermined_validity([a, b])]),
            checks:unknown_feasibility_text(R, D, S)
        ),
        Texts).

test(unknown_violations, Violations == [V1, V2]) :-
    chk_kb((
        chk_cart_req('REQ-POS', 'FACT-POS', gt, 0),
        chk_total('FACT-ZERO', eq, 0),
        chk_scenario('SCEN-BAD', success, ['FACT-ZERO']),
        chk_scenario('SCEN-B-NONE', success, []),
        chk_prop('FACT-COLOR', cart, color, eq, string, "red", []),
        chk_scenario('SCEN-A-COLOR', success, ['FACT-COLOR']),
        chk_raw_entity(scenario, 'SCEN-C-RAW', [id='SCEN-C-RAW', expects=success]),
        check_scenario_feasibility_unknown(Violations0),
        exclude(chk_raw_violation, Violations0, Violations),
        include(chk_raw_violation, Violations0, [violation(_, 'SCEN-C-RAW', _, _, RawSource)]),
        RawSource == ""
    )),
    checks:unknown_feasibility_text(unmatched_assumption(['FACT-COLOR']), D1, S1),
    chk_unknown_violation('SCEN-A-COLOR', D1, S1, V1),
    checks:unknown_feasibility_text(no_assumptions, D2, S2),
    chk_unknown_violation('SCEN-B-NONE', D2, S2, V2).

chk_raw_violation(violation(_, 'SCEN-C-RAW', _, _, _)).

test(outcome_mismatch, Violations == [violation('scenario-outcome-mismatch', 'SCEN-ERR',
        "Scenario expects error, but current requirements permit everything it assumes (FACT-FIVE, FACT-SIX), so the knowledge base predicts success",
        "Assume a value a current requirement forbids, so the scenario exercises that requirement's failure side, or set expects: success when the scenario describes a permitted situation",
        Source1),
        violation('scenario-outcome-mismatch', 'SCEN-RAW',
        "Scenario expects rejection, but current requirements permit everything it assumes (FACT-FIVE), so the knowledge base predicts success",
        "Assume a value a current requirement forbids, so the scenario exercises that requirement's failure side, or set expects: success when the scenario describes a permitted situation",
        "")]) :-
    chk_xsd("kb/SCEN-ERR.md", Source1),
    chk_kb((
        chk_cart_req('REQ-POS', 'FACT-POS', gt, 0),
        chk_total('FACT-FIVE', eq, 5),
        chk_total('FACT-SIX', gte, 5),
        chk_total('FACT-ZERO', eq, 0),
        chk_scenario('SCEN-ERR', error, ['FACT-SIX', 'FACT-FIVE']),
        chk_raw_entity(scenario, 'SCEN-RAW', [id='SCEN-RAW', expects=rejection]),
        chk_raw_rel(assumes, 'SCEN-RAW', 'FACT-FIVE'),
        chk_scenario('SCEN-REJ', rejection, ['FACT-ZERO']),
        chk_scenario('SCEN-NONE', rejection, []),
        chk_scenario('SCEN-OK', success, ['FACT-FIVE']),
        check_scenario_outcome_mismatch(Violations)
    )).

test(negative_scenario_enumeration, Ids == ['SCEN-A', 'SCEN-B']) :-
    chk_kb((
        chk_scenario('SCEN-B', rejection, []),
        chk_scenario('SCEN-A', error, []),
        chk_scenario('SCEN-C', success, []),
        findall(S, checks:negative_scenario(S), Ids),
        checks:negative_scenario('SCEN-A'),
        \+ checks:negative_scenario('SCEN-C')
    )).

:- end_tests(checks_negative_scenarios).

% --- exception claim keys, numeric strings, status vocabulary ----------------

:- begin_tests(checks_claims_and_values).

chk_claim_key_violation(Ex, Key, Base, violation('exception-claim-keys', Ex, D, S, Source)) :-
    format(string(D), "exempts_claims names ~w, which is not a claim of exempted requirement ~w", [Key, Base]),
    format(string(S), "Use a claim key from the logic_claims or semantic_inventory of ~w, or remove ~w from exempts_claims", [Base, Key]),
    format(atom(Source), '~w.md', [Ex]).

test(exception_claim_keys, Violations == [V1, V2, V3]) :-
    chk_kb((
        chk_req('REQ-BASE', [logic_claims=["CLAIM-LOGIC"],
                             semantic_inventory="[{\"claim_key\":\"CLAIM-INV\",\"status\":\"modeled\"}]"]),
        chk_req('REQ-BASE2'),
        chk_cart_req('REQ-BASE2', 'FACT-G', gt, 0, [claim_key="CLAIM-GROUND", claim_text="Positive"]),
        chk_req('REQ-EX', [exempts_claims=["CLAIM-LOGIC", "CLAIM-INV", "CLAIM-GROUND", "CLAIM-NONE"]]),
        chk_rel(exempts, 'REQ-EX', 'REQ-BASE'),
        chk_rel(exempts, 'REQ-EX', 'REQ-BASE2'),
        chk_req('REQ-LONE', [exempts_claims=["CLAIM-X"]]),
        chk_req('REQ-ONE', [exempts_claims=["CLAIM-GROUND"]]),
        chk_rel(exempts, 'REQ-ONE', 'REQ-BASE'),
        chk_req('REQ-EMPTY', [exempts_claims=[]]),
        check_exception_claim_keys(Violations)
    )),
    chk_claim_key_violation('REQ-EX', 'CLAIM-NONE', 'REQ-BASE, REQ-BASE2', V1),
    V2 = violation('exception-claim-keys', 'REQ-LONE', "Requirement lists exempts_claims but exempts no requirement",
                   "Link the exception to the requirement whose clauses it waives with exempts, or remove exempts_claims", 'REQ-LONE.md'),
    chk_claim_key_violation('REQ-ONE', 'CLAIM-GROUND', 'REQ-BASE', V3).

test(requirement_declares_claim_once) :-
    chk_kb((
        chk_req('REQ-BASE', [logic_claims=["CLAIM-A", "CLAIM-A"],
                             semantic_inventory="[{\"claim_key\":\"CLAIM-A\",\"status\":\"modeled\"},{\"claim_key\":\"CLAIM-B\",\"status\":\"modeled\"},{\"claim_key\":\"CLAIM-B\",\"status\":\"missing\"}]"]),
        chk_cart_req('REQ-BASE', 'FACT-G', gt, 0, [claim_key="CLAIM-C", claim_text="Positive"]),
        chk_prop('FACT-G2', cart, total, gt, int, 1, [claim_key="CLAIM-C", claim_text="Positive"]),
        chk_rel(requires_property, 'REQ-BASE', 'FACT-G2'),
        first_answer_is_last(checks:requirement_declares_claim('REQ-BASE', 'CLAIM-A')),
        first_answer_is_last(checks:requirement_declares_claim('REQ-BASE', 'CLAIM-B')),
        first_answer_is_last(checks:requirement_declares_claim('REQ-BASE', 'CLAIM-C')),
        \+ checks:requirement_declares_claim('REQ-BASE', 'CLAIM-D')
    )).

chk_numeric_violation(Fact, Literal, Why, Type, Field, Number, violation('numeric-string-value', Fact, D, S, Source)) :-
    format(string(D), "Fact ~w stores cart.total value \"~w\" as value_type string, but ~w; string values compare only by equality and are not converted to numbers",
           [Fact, Literal, Why]),
    format(string(S), "Set value_type: ~w and ~w: ~w on ~w (replacing value_string) so the value takes part in numeric comparisons",
           [Type, Field, Number, Fact]),
    format(atom(Source), '~w.md', [Fact]).

test(numeric_string_values, Violations == [V1, V2, V3]) :-
    chk_kb((
        chk_prop('F-A-LT', cart, total, lt, string, " 7 ", []),
        chk_prop('F-B-NEG', cart, total, gte, string, "-3", []),
        chk_prop('F-C-DEC', cart, total, eq, string, "2.5", []),
        chk_prop('F-D-PEER', cart, total, eq, int, 1, []),
        chk_prop('F-E-WORD', cart, total, lt, string, "abc", []),
        chk_prop('F-F-DOT', cart, total, lt, string, "1.", []),
        chk_prop('F-G-EMPTY', cart, total, lt, string, "", []),
        chk_prop('F-H-QTY', cart, qty, eq, string, "4", []),
        chk_prop('F-I-QTY', cart, qty, eq, string, "5", []),
        chk_prop('F-J-MINUS', cart, total, lt, string, "-", []),
        chk_prop('F-K-LEAD', cart, total, lt, string, ".5", []),
        check_numeric_string_values(Violations)
    )),
    chk_numeric_violation('F-A-LT', '7', "its operator lt orders values numerically", int, value_int, 7, V1),
    chk_numeric_violation('F-B-NEG', '-3', "its operator gte orders values numerically", int, value_int, -3, V2),
    chk_numeric_violation('F-C-DEC', '2.5', "F-D-PEER types the same property as int", number, value_number, 2.5, V3).

test(numeric_literals) :-
    checks:numeric_literal('12', T1, N1), T1 == "12", N1 == 12,
    checks:numeric_literal("0.25", T2, N2), T2 == "0.25", N2 == 0.25,
    \+ checks:numeric_literal(12, _, _),
    \+ checks:numeric_literal("1 2", _, _),
    \+ checks:numeric_literal("12a", _, _),
    \+ checks:numeric_literal("1.2.3", _, _),
    \+ checks:numeric_literal("--1", _, _),
    first_answer_is_last(checks:numeric_literal("-12.5", _, _)).

test(numeric_string_contexts) :-
    forall(member(Op, [lt, lte, gt, gte]),
           (   checks:numeric_string_context(f, s, p, Op, Why),
               format(string(Expected), "its operator ~w orders values numerically", [Op]),
               Why == Expected
           )),
    chk_kb((
        chk_prop('F-S', cart, total, eq, string, "1", []),
        chk_prop('F-N', cart, total, eq, number, 1.5, []),
        chk_prop('F-N2', cart, total, eq, int, 1, []),
        first_answer_is_last(checks:numeric_string_context('F-S', cart, total, eq, Why)),
        Why == "F-N types the same property as number",
        \+ checks:numeric_string_context('F-N', cart, qty, eq, _),
        first_answer_is_last(checks:numeric_string_context(f, s, p, lt, _))
    )).

:- end_tests(checks_claims_and_values).

% --- requirement status vocabulary and strict fact shapes ---------------------

:- begin_tests(checks_shapes).

test(req_status_vocabulary, Sorted == [violation('req-status-vocabulary', 'REQ-ACC', D, S, 'REQ-ACC.md')]) :-
    format(string(D), "Requirement status 'accepted' is not a current requirement status; it is silently excluded from the proof ladder", []),
    S = "Set status to one of open, in_progress, closed, retired (legacy: active, approved). Use retired with retired_reason when the behavior no longer exists; to park a current requirement out of E2E-proof scope, use proof_exempt: true with proof_exempt_reason instead of an ADR status",
    chk_kb((
        forall(member(St, [open, in_progress, closed, active, approved]),
               (atom_concat('REQ-', St, Id), chk_req(Id, [status=St]))),
        chk_req('REQ-retired', [status=retired, retired_reason="Gone"]),
        chk_req('REQ-ACC', [status=accepted]),
        chk_raw_entity(req, 'REQ-NOSTATUS', [id='REQ-NOSTATUS']),
        check_req_status_vocabulary(Sorted)
    )).

test(status_vocabularies) :-
    checks:canonical_req_statuses(C), C == [open, in_progress, closed, retired],
    checks:legacy_req_statuses(L), L == [active, approved].

% A retired requirement states why; a blank or missing reason is reported.
test(retired_reason_missing, Violations == [
        violation('retired-reason-missing', 'REQ-BLANK', D1, S, 'REQ-BLANK.md'),
        violation('retired-reason-missing', 'REQ-NONE', D2, S, 'REQ-NONE.md')]) :-
    S = "Add retired_reason: why the behavior no longer exists, with the date or change that retired it. If the requirement still states current intent, set status back to closed or open",
    D1 = "Requirement REQ-BLANK is retired but states no retired_reason, so nothing records why it stopped governing",
    D2 = "Requirement REQ-NONE is retired but states no retired_reason, so nothing records why it stopped governing",
    chk_kb((
        chk_req('REQ-OK', [status=retired, retired_reason="Removed on 2026-10-30"]),
        chk_req('REQ-BLANK', [status=retired, retired_reason="   "]),
        chk_req('REQ-NONE', [status=retired]),
        chk_req('REQ-CLOSED', [status=closed]),
        check_retired_reason_missing(Violations0),
        msort(Violations0, Violations)
    )).

chk_retired_only(Type, Id, Owners, Violation) :-
    atomic_list_concat(Owners, ', ', OwnerText),
    format(string(D), "Current ~w ~w is owned only by retired requirements (~w), so it describes behavior that no longer exists",
           [Type, Id, OwnerText]),
    (   Type == test
    ->  S = "Link the test to the current requirement or scenario whose behavior it still checks, or delete it (kb_delete) if that behavior is gone"
    ;   S = "Link it to the current requirement that took over this behavior, or archive it with status: deprecated"
    ),
    format(atom(Source), '~w.md', [Id]),
    Violation = violation('retired-owner-only', Id, D, S, Source, _{entityType: Type, owners: Owners}).

% Facts, scenarios and tests whose every owner is retired are reported; a
% shared, archived or ownerless dependent is not.
test(retired_owner_only) :-
    chk_kb((
        chk_req('REQ-R1', [status=retired, retired_reason="Gone"]),
        chk_req('REQ-R2', [status=retired, retired_reason="Gone"]),
        chk_req('REQ-LIVE'),
        chk_req('REQ-DONE', [status=closed]),
        chk_ent(fact, 'FACT-ONLY', []),
        chk_rel(constrains, 'REQ-R1', 'FACT-ONLY'),
        chk_ent(fact, 'FACT-TWO', []),
        chk_rel(requires_property, 'REQ-R1', 'FACT-TWO'),
        chk_rel(requires_predicate, 'REQ-R2', 'FACT-TWO'),
        chk_ent(fact, 'FACT-SHARED', []),
        chk_rel(constrains, 'REQ-R1', 'FACT-SHARED'),
        chk_rel(constrains, 'REQ-DONE', 'FACT-SHARED'),
        chk_ent(fact, 'FACT-ARCHIVED', [status=deprecated]),
        chk_rel(constrains, 'REQ-R1', 'FACT-ARCHIVED'),
        chk_ent(fact, 'FACT-LEGACY-ARCHIVED', [status=archived]),
        chk_rel(constrains, 'REQ-R1', 'FACT-LEGACY-ARCHIVED'),
        chk_ent(fact, 'FACT-LOOSE', []),
        chk_ent(scenario, 'SCEN-OLD', []),
        chk_rel(specified_by, 'REQ-R1', 'SCEN-OLD'),
        chk_ent(scenario, 'SCEN-LIVE', []),
        chk_rel(specified_by, 'REQ-R1', 'SCEN-LIVE'),
        chk_rel(specified_by, 'REQ-LIVE', 'SCEN-LIVE'),
        chk_ent(test, 'TEST-DIRECT', [status=passing]),
        chk_rel(verified_by, 'REQ-R2', 'TEST-DIRECT'),
        chk_ent(test, 'TEST-VIA-SCEN', [status=passing]),
        chk_rel(validates, 'TEST-VIA-SCEN', 'SCEN-OLD'),
        chk_ent(test, 'TEST-LIVE-SCEN', [status=passing]),
        chk_rel(validates, 'TEST-LIVE-SCEN', 'SCEN-OLD'),
        chk_rel(verified_by, 'SCEN-LIVE', 'TEST-LIVE-SCEN'),
        check_retired_owner_only(Violations)
    )),
    chk_retired_only(fact, 'FACT-ONLY', ['REQ-R1'], V1),
    chk_retired_only(fact, 'FACT-TWO', ['REQ-R1', 'REQ-R2'], V2),
    chk_retired_only(scenario, 'SCEN-OLD', ['REQ-R1'], V3),
    chk_retired_only(test, 'TEST-DIRECT', ['REQ-R2'], V4),
    chk_retired_only(test, 'TEST-VIA-SCEN', ['REQ-R1'], V5),
    chk_same(Violations, [V1, V2, V3, V4, V5]).

% Owners that mix retired with superseded or deprecated requirements leave
% no current owner either; a current owner, or no retired one, still does.
test(retired_owner_only_mixed_owners) :-
    chk_kb((
        chk_req('REQ-R1', [status=retired, retired_reason="Gone"]),
        chk_req('REQ-OLD', [status=closed]),
        chk_req('REQ-NEW'),
        chk_rel(supersedes, 'REQ-NEW', 'REQ-OLD'),
        chk_req('REQ-DEP', [status=deprecated]),
        chk_req('REQ-LIVE'),
        chk_ent(fact, 'FACT-MIXED', []),
        chk_rel(constrains, 'REQ-R1', 'FACT-MIXED'),
        chk_rel(constrains, 'REQ-OLD', 'FACT-MIXED'),
        chk_ent(scenario, 'SCEN-MIXED', []),
        chk_rel(specified_by, 'REQ-R1', 'SCEN-MIXED'),
        chk_rel(specified_by, 'REQ-DEP', 'SCEN-MIXED'),
        chk_ent(fact, 'FACT-HELD', []),
        chk_rel(constrains, 'REQ-R1', 'FACT-HELD'),
        chk_rel(constrains, 'REQ-OLD', 'FACT-HELD'),
        chk_rel(constrains, 'REQ-LIVE', 'FACT-HELD'),
        chk_ent(fact, 'FACT-NO-RETIRED', []),
        chk_rel(constrains, 'REQ-OLD', 'FACT-NO-RETIRED'),
        chk_rel(constrains, 'REQ-DEP', 'FACT-NO-RETIRED'),
        check_retired_owner_only(Violations)
    )),
    Mixed = "retired requirements and requirements that are superseded or deprecated",
    format(string(D1), "Current fact FACT-MIXED is owned only by ~w (REQ-OLD, REQ-R1), so it describes behavior that no longer exists", [Mixed]),
    format(string(D2), "Current scenario SCEN-MIXED is owned only by ~w (REQ-DEP, REQ-R1), so it describes behavior that no longer exists", [Mixed]),
    S = "Link it to the current requirement that took over this behavior, or archive it with status: deprecated",
    chk_same(Violations, [
        violation('retired-owner-only', 'FACT-MIXED', D1, S, 'FACT-MIXED.md', _{entityType: fact, owners: ['REQ-OLD', 'REQ-R1']}),
        violation('retired-owner-only', 'SCEN-MIXED', D2, S, 'SCEN-MIXED.md', _{entityType: scenario, owners: ['REQ-DEP', 'REQ-R1']})
    ]).

test(retired_owner_only_without_retired, Violations == []) :-
    chk_kb((
        chk_req('REQ-DEP', [status=deprecated]),
        chk_ent(fact, 'FACT-X', []),
        chk_rel(constrains, 'REQ-DEP', 'FACT-X'),
        check_retired_owner_only(Violations)
    )).

chk_shape(Id, Props, Result) :-
    chk_kb((
        chk_raw_entity(fact, Id, [id=Id|Props]),
        check_strict_fact_shape(Result)
    )).

chk_shape_answer(Id, Props, D-S) :-
    chk_shape(Id, Props, [violation('strict-fact-shape', Id, D, S, _)]).

test(fact_shapes_without_violations, Results == [[], [], [], [], [], [], [], [], []]) :-
    findall(R,
        (   member(Props, [
                [title="legacy"],
                [fact_kind=subject, subject_key="s"],
                [fact_kind=property_value, subject_key="s", property_key="p", operator=eq, value_type=int, value_int=1],
                [fact_kind=observation],
                [fact_kind=meta],
                [fact_kind=predicate_schema, predicate_name="p", predicate_arity=1, argument_names=[a], argument_types=[t]],
                [fact_kind=predicate, predicate_name="p", predicate_args=[a], canonical_key="p(a)", polarity=deny],
                [fact_kind=rule_schema, rule_name="r", argument_names=[a], argument_types=[t]],
                [fact_kind=predicate, predicate_name="p", predicate_args=[a], canonical_key="p(a)"]
            ]),
            chk_shape('F', Props, R)
        ),
        Results).

test(subject_and_unknown_shapes, Answers == [
        "Subject fact missing required field: subject_key"-"Add subject_key to define the subject domain key",
        "Unknown fact_kind: widget"-"Use one of: subject, property_value, observation, meta, predicate_schema, predicate, rule_schema, rule"
    ]) :-
    chk_shape_answer('F', [fact_kind=subject], A1),
    chk_shape_answer('F', [fact_kind=widget], A2),
    Answers = [A1, A2].

test(shape_source, Sources == ['x.md', ""]) :-
    chk_shape('F', [fact_kind=widget, source="kb/x.md"], [violation(_, _, _, _, S1)]),
    chk_shape('F', [fact_kind=widget], [violation(_, _, _, _, S2)]),
    Sources = [S1, S2].

test(property_value_shapes, Answers == [
        "Property value fact missing required field: subject_key",
        "Property value fact missing required field: property_key",
        "Property value fact missing required field: operator",
        "Property value fact missing required field: value_type",
        "Property value fact missing value field (value_string, value_int, value_number, value_bool, or value_set)",
        "Property value fact has multiple value fields (should have exactly one)",
        "Property value fact value_type does not match value field",
        "Property value fact value_type does not match value field",
        "Property value fact value_type does not match value field",
        "Property value fact value_type does not match value field",
        "Property value fact value_type does not match value field",
        "Property value fact value_type does not match value field"
    ]) :-
    Base = [fact_kind=property_value, subject_key="s", property_key="p", operator=eq],
    findall(D,
        (   member(Props, [
                [fact_kind=property_value],
                [fact_kind=property_value, subject_key="s"],
                [fact_kind=property_value, subject_key="s", property_key="p"],
                [fact_kind=property_value, subject_key="s", property_key="p", operator=eq],
                [value_type=int],
                [value_type=int, value_int=1, value_string="1"],
                [value_type=int, value_string="1"],
                [value_type=string, value_int=1],
                [value_type=number, value_int=1],
                [value_type=bool, value_int=1],
                [value_type=set, value_int=1],
                [value_type=other, value_int=1]
            ]),
            (   Props = [fact_kind=_|_] -> All = Props ; append(Base, Props, All) ),
            chk_shape_answer('F', All, D-S),
            S == "Ensure property_value facts have subject_key, property_key, operator, value_type, and exactly one value field"
        ),
        Answers).

test(property_value_shape_errors, Errors == [
        "Property value fact has multiple value fields (should have exactly one)"
    ]) :-
    findall(E, checks:property_value_shape_error([subject_key=s, property_key=p, operator=eq, value_type=int,
                                                  value_number=1, value_bool=true], E), Errors).

test(value_fields) :-
    findall(T-F, checks:value_type_field(T, F), Fields),
    Fields == [string-value_string, int-value_int, number-value_number, bool-value_bool, set-value_set],
    forall(member(T-F, Fields),
           (   first_answer_is_last(checks:has_value_field([F=1, F=2])),
               first_answer_is_last(checks:value_type_matches_field(T, [F=1, F=2]))
           )),
    \+ checks:value_type_matches_field(int, [value_string=1]),
    \+ checks:has_value_field([value_other=1]).

test(predicate_schema_shapes, Answers == [
        "Predicate schema fact missing required field: predicate_name",
        "Predicate schema fact missing required field: predicate_arity",
        "Predicate schema fact missing required field: argument_names",
        "Predicate schema fact missing required field: argument_types",
        "Predicate schema fact argument_names length must match predicate_arity",
        "Predicate schema fact argument_types length must match predicate_arity"
    ]) :-
    findall(D,
        (   member(Props, [
                [],
                [predicate_name="p"],
                [predicate_name="p", predicate_arity=1],
                [predicate_name="p", predicate_arity=1, argument_names=[a]],
                [predicate_name="p", predicate_arity="2", argument_names=[a], argument_types=[t, u]],
                [predicate_name="p", predicate_arity=2, argument_names=[a, b], argument_types=[t]]
            ]),
            chk_shape_answer('F', [fact_kind=predicate_schema|Props], D-S),
            S == "Ensure predicate_schema facts have predicate_name, predicate_arity, argument_names, and argument_types with matching arity"
        ),
        Answers).

test(predicate_shapes, Answers == [
        "Predicate fact missing required field: predicate_name",
        "Predicate fact missing required field: predicate_args",
        "Predicate fact predicate_args must be non-empty",
        "Predicate fact missing required field: canonical_key",
        "Predicate fact polarity must be assert or deny"
    ]) :-
    findall(D,
        (   member(Props, [
                [],
                [predicate_name="p"],
                [predicate_name="p", predicate_args=[], canonical_key="p"],
                [predicate_name="p", predicate_args=[a]],
                [predicate_name="p", predicate_args=[a], canonical_key="p(a)", polarity=maybe]
            ]),
            chk_shape_answer('F', [fact_kind=predicate|Props], D-S),
            S == "Ensure predicate facts have predicate_name, non-empty predicate_args, canonical_key, and assert/deny polarity when present"
        ),
        Answers).

test(rule_schema_shapes, Answers == [
        "Rule schema fact missing required field: rule_name",
        "Rule schema fact missing required field: argument_names",
        "Rule schema fact missing required field: argument_types",
        "Rule schema fact argument_names and argument_types must have equal lengths"
    ]) :-
    findall(D,
        (   member(Props, [
                [],
                [rule_name="r"],
                [rule_name="r", argument_names=[a]],
                [rule_name="r", argument_names=[a], argument_types=[t, u]]
            ]),
            chk_shape_answer('F', [fact_kind=rule_schema|Props], D-S),
            S == "Ensure rule_schema facts declare rule_name plus same-length argument_names and argument_types"
        ),
        Answers).

test(rule_shapes, Answers == [
        "Rule fact missing required field: rule_ir",
        "Rule fact missing required field: rule_hash",
        "Rule fact missing required field: rule_schema_id",
        "Rule fact missing required field: rule_name",
        "Rule fact missing required field: semantic_key",
        "Rule fact rule_ir failed kibi.logic.v1 safety validation",
        none
    ]) :-
    chk_rule_json(rule, forbid, checkout, [total-lte-0], [], Json),
    Full = [rule_ir=Json, rule_hash="h", rule_schema_id="S", rule_name="r", semantic_key="k"],
    findall(D,
        (   member(Props, [
                [],
                [rule_ir=Json],
                [rule_ir=Json, rule_hash="h"],
                [rule_ir=Json, rule_hash="h", rule_schema_id="S"],
                [rule_ir=Json, rule_hash="h", rule_schema_id="S", rule_name="r"],
                [rule_ir="{}", rule_hash="h", rule_schema_id="S", rule_name="r", semantic_key="k"],
                Full
            ]),
            chk_shape('F', [fact_kind=rule|Props], Result),
            (   Result == []
            ->  D = none
            ;   Result = [violation('strict-fact-shape', 'F', D, S, _)],
                S == "Ensure rule facts contain a safe kibi.logic.v1 rule_ir, full rule_hash, rule_schema_id, rule_name, and semantic_key"
            )
        ),
        Answers).

test(shape_violations_sorted, Ids == ['F-A', 'F-B']) :-
    chk_kb((
        chk_raw_entity(fact, 'F-B', [fact_kind=widget]),
        chk_raw_entity(fact, 'F-A', [fact_kind=widget]),
        check_strict_fact_shape(Violations),
        findall(Id, member(violation(_, Id, _, _, _), Violations), Ids)
    )).

test(normalizers) :-
    checks:checks_normalize_integer(^^("3", x), I1), I1 == 3,
    checks:checks_normalize_integer(4, I2), I2 == 4,
    checks:checks_normalize_integer('5', I3), I3 == 5,
    checks:checks_normalize_integer("6", I4), I4 == 6,
    \+ checks:checks_normalize_integer(f(x), _),
    checks:checks_normalize_atom_list(^^([a, "b"], x), L1), L1 == [a, b],
    checks:checks_normalize_atom_list([c], L2), L2 == [c],
    checks:checks_normalize_atom_list(nope, L3), L3 == [].

:- end_tests(checks_shapes).

% --- domain contradictions, rule key arguments and what-if --------------------

:- begin_tests(checks_contradictions).

chk_rule_req(Req, Fact, Modality, Conditions, FactExtra) :-
    chk_req(Req),
    chk_rule_fact(Fact, rule, Modality, checkout, Conditions, [], FactExtra, _),
    chk_rel(requires_rule, Req, Fact).

chk_rule_pairs :-
    chk_rule_req('REQ-A', 'FACT-A', forbid, [total-lte-0],
                 [claim_key="CLAIM-A", claim_text="No free checkout", rule_hash="hash-a", semantic_key="sem-a",
                  claim_span_start=3, claim_span_end="9"]),
    chk_rule_req('REQ-B', 'FACT-B', permit, [total-eq-0], [claim_span_start="x"]),
    chk_rule_req('REQ-C', 'FACT-C', permit, [total-gt-5], []).

chk_side(Witness, Side, Plain) :-
    get_dict(Side, Witness, Dict),
    del_dict(ruleIr, Dict, _, Rest),
    chk_plain(Rest, Plain).

test(rule_witnesses) :-
    chk_kb((
        chk_rule_pairs,
        check_domain_contradiction_witnesses([WC, WB]),
        kb_entity('FACT-A', fact, PropsA),
        memberchk(rule_ir=RawA, PropsA),
        checks:evidence_term_text(RawA, IrA),
        checks:evidence_term_text(WB.left.ruleIr, IrA)
    )),
    WB.kind == rule, WB.status == contradiction, WB.requirements == ['REQ-A', 'REQ-B'],
    WB.reason == "Rule conflict (contradiction) between REQ-A and REQ-B",
    WC.status == unresolved, WC.requirements == ['REQ-A', 'REQ-C'],
    chk_side(WB, left, Left),
    chk_plain(_{requirementId: 'REQ-A', requirementSource: 'kb/REQ-A.md', factId: 'FACT-A', factSource: 'kb/FACT-A.md',
                claimKey: 'CLAIM-A', claimText: 'No free checkout', claimSpan: _{start: 3, end: 9},
                ruleHash: 'hash-a', semanticKey: 'sem-a'}, Left),
    chk_side(WB, right, Right),
    chk_plain(_{requirementId: 'REQ-B', requirementSource: 'kb/REQ-B.md', factId: 'FACT-B', factSource: 'kb/FACT-B.md',
                claimKey: '', claimText: '', claimSpan: _{start: -1, end: -1}, ruleHash: '', semanticKey: ''}, Right),
    chk_same(WB.comparison, _{
        modalityA: forbid, modalityB: permit,
        headA: "atom(default,checkout,[var('C',cart)],positive,false)",
        headB: "atom(default,checkout,[var('C',cart)],positive,false)",
        bodyA: "all([atom(cart,total,[var('C',cart),var('V1',money)],positive,false),compare(lte,var('V1',money),number(0,none))])",
        bodyB: "all([atom(cart,total,[var('C',cart),var('V1',money)],positive,false),compare(eq,var('V1',money),number(0,none))])",
        scopeA: "scope('','',[])", scopeB: "scope('','',[])",
        validFromA: '', validToA: '', validFromB: '', validToB: '',
        ruleSchemaA: '', ruleSchemaB: ''
    }).

test(rule_contradiction_violations, Violations == [
        violation('domain-contradictions', "REQ-A/REQ-C", "Rule conflict (unresolved) between REQ-A and REQ-C",
                  "Align the opposing rule heads, separate their scopes, or add an explicit supersedes relationship", ""),
        violation('domain-contradictions', "REQ-A/REQ-B", "Rule conflict (contradiction) between REQ-A and REQ-B",
                  "Align the opposing rule heads, separate their scopes, or add an explicit supersedes relationship", "")
    ]) :-
    chk_kb((chk_rule_pairs, check_domain_contradictions(Violations),
            check_domain_contradictions_and_witnesses(V2, W2),
            V2 == Violations,
            length(W2, 2))).

test(property_contradiction_violations, Violations == [
        violation('domain-contradictions', "REQ-HI/REQ-LO", D,
                  "Supersede one requirement or align both to the same canonical logical term", "")
    ]) :-
    chk_kb((
        chk_cart_req('REQ-HI', 'FACT-HI', gt, 5),
        chk_cart_req('REQ-LO', 'FACT-LO', lt, 3),
        check_domain_contradiction_witnesses([W]),
        format(string(D), "~w [strict-readiness: contradiction-ready]", [W.reason]),
        check_domain_contradictions(Violations)
    )).

test(disjoint_and_unpaired_rules, Witnesses == []) :-
    chk_kb((
        chk_rule_req('REQ-A', 'FACT-A', forbid, [total-lte-0], []),
        chk_rule_req('REQ-B', 'FACT-B', forbid, [total-eq-0], []),
        % rules of retired requirements and links to non-rules never pair
        chk_rule_req('REQ-OLD', 'FACT-OLD', permit, [total-eq-0], []),
        chk_req('REQ-NEW'),
        chk_rel(supersedes, 'REQ-NEW', 'REQ-OLD'),
        chk_req('REQ-P'),
        chk_total('FACT-P', eq, 0),
        chk_raw_rel(requires_rule, 'REQ-P', 'FACT-P'),
        chk_raw_entity(fact, 'FACT-BAD', [fact_kind=rule, rule_ir="{"]),
        chk_raw_rel(requires_rule, 'REQ-P', 'FACT-BAD'),
        check_domain_contradiction_witnesses(Witnesses)
    )).

test(requirement_never_pairs_with_itself, Witnesses == []) :-
    chk_kb((
        chk_rule_req('REQ-A', 'FACT-A', forbid, [total-lte-0], []),
        chk_rule_fact('FACT-A2', rule, permit, checkout, [total-eq-0], [], [], _),
        chk_rel(requires_rule, 'REQ-A', 'FACT-A2'),
        check_domain_contradiction_witnesses(Witnesses)
    )).

test(rule_pairs_once_across_permuted_ids, Pairs == ['REQ-A'-'FACT-Z'-'REQ-Z'-'FACT-A']) :-
    chk_kb((
        chk_rule_req('REQ-A', 'FACT-Z', forbid, [total-lte-0], []),
        chk_rule_req('REQ-Z', 'FACT-A', permit, [total-eq-0], []),
        findall(RA-FA-RB-FB, checks:opposing_rule_requirement_facts(RA, RB, FA, FB, _, _), Pairs)
    )).

test(rule_requirement_links, Links == ['REQ-A'-['FACT-A'-rule]]) :-
    chk_kb((
        chk_rule_req('REQ-A', 'FACT-A', forbid, [total-lte-0], []),
        chk_req('REQ-EMPTY'),
        checks:rule_requirement_links(Links0),
        findall(R-Fs, (member(R-Rs, Links0), findall(F-rule, member(F-_, Rs), Fs)), Links)
    )).

test(rule_fact_rule) :-
    chk_kb((
        chk_rule_fact('FACT-A', forbid, checkout, [total-lte-0], [], _),
        chk_total('FACT-P', eq, 0),
        checks:rule_fact_rule('FACT-A', Rule),
        Rule = rule(rule, forbid, _, _, _, _, _, _, _, _),
        \+ checks:rule_fact_rule('FACT-P', _)
    )).

test(contradiction_memo) :-
    chk_kb((
        chk_rule_pairs,
        retractall(kb:kb_contradiction_witness_memo(_, _)),
        check_domain_contradiction_witnesses(W1),
        length(W1, 2),
        kb:kb_contradiction_witness_memo(Key, Stored),
        chk_same(Stored, W1),
        retractall(kb:kb_contradiction_witness_memo(_, _)),
        assertz(kb:kb_contradiction_witness_memo(Key, [cached])),
        assertz(kb:kb_contradiction_witness_memo(other, [other])),
        check_domain_contradiction_witnesses(W2),
        W2 == [cached],
        rdf_transaction((check_domain_contradiction_witnesses(W3), length(W3, 2))),
        findall(K, kb:kb_contradiction_witness_memo(K, _), Keys),
        Keys == [Key, other],
        chk_req('REQ-D'),
        check_domain_contradiction_witnesses(W4),
        length(W4, 2),
        findall(K, kb:kb_contradiction_witness_memo(K, _), Keys2),
        Keys2 = [NewKey],
        NewKey \== Key,
        retractall(kb:kb_contradiction_witness_memo(_, _))
    )).

test(rule_key_arguments_missing, Violations == [violation('rule-key-arguments-missing', "REQ-A/REQ-C", D, S, "")]) :-
    D = "Opposing rules FACT-A (REQ-A) and FACT-C (REQ-C) stay unresolved because predicate cart:total/2 declares no key_arguments; declaring key_arguments [positions 1] would decide the pair",
    S = "If the remaining arguments of cart:total/2 are determined by [positions 1], add key_arguments to its predicate_schema fact; if the predicate is genuinely multivalued, leave it undeclared and accept the unresolved result",
    chk_kb((chk_rule_pairs, check_rule_key_arguments_missing(Violations))).

test(key_set_texts, Texts == ['[positions 1, 2]', '[cart, total]', '[positions 1]']) :-
    chk_kb((
        checks:key_set_text(cart, total, 2, [1, 2], T1),
        chk_ent(fact, 'FACT-SCHEMA', [fact_kind=predicate_schema, predicate_namespace="cart", predicate_name="total",
                                      predicate_arity=2, argument_names=["cart", "total"], argument_types=["cart", "money"]]),
        checks:key_set_text(cart, total, 2, [1, 2], T2),
        chk_raw_entity(fact, 'FACT-SHORT', [fact_kind=predicate_schema, predicate_namespace="cart", predicate_name="short",
                                            predicate_arity=2, argument_names=["cart"], argument_types=["cart"]]),
        checks:key_set_text(cart, short, 2, [1], T3),
        Texts = [T1, T2, T3]
    )).

test(evidence_texts) :-
    checks:evidence_term_text(^^("a", x), T1), T1 == a,
    checks:evidence_term_text(literal(type(x, "b")), T2), T2 == b,
    checks:evidence_term_text(c, T3), T3 == c,
    checks:evidence_term_text("d", T4), T4 == d,
    checks:evidence_term_text(f(x), T5), T5 == 'f(x)',
    checks:evidence_property_text([k= ^^("v", x)], k, P1), P1 == v,
    checks:evidence_property_text([], k, P2), P2 == '',
    checks:evidence_property_integer([k= ^^(4, x)], k, I1), I1 == 4,
    checks:evidence_property_integer([k=f(x)], k, I2), I2 == -1,
    checks:evidence_property_integer([k="z"], k, I3), I3 == -1,
    checks:evidence_property_integer([], k, I4), I4 == -1.

% --- what-if ---

chk_fact_props(Id, Op, Value, Props) :-
    Props = [id=Id, title="Total", status=active, created_at="2026-05-01T00:00:00Z", updated_at="2026-05-01T00:00:00Z",
             source="kb/what-if.md", fact_kind=property_value, subject_key="cart", property_key="total",
             operator=Op, value_type=int, value_int=Value].

chk_req_props(Id, [id=Id, title="Req", status=open, created_at="2026-05-01T00:00:00Z",
                   updated_at="2026-05-01T00:00:00Z", source="kb/what-if.md"]).

chk_kinds(Witnesses, Kinds) :-
    findall(K-R, (member(W, Witnesses), get_dict(kind, W, K), get_dict(requirements, W, R)), Kinds).

test(what_if_introduces_and_removes) :-
    chk_kb((
        chk_cart_req('REQ-HI', 'FACT-HI', gt, 5),
        chk_cart_req('REQ-LO', 'FACT-LO', lt, 3),
        chk_total('FACT-ZERO', eq, 0),
        chk_scenario('SCEN-OLD', success, ['FACT-ZERO']),
        chk_fact_props('FACT-LO', lt, 9, Relaxed),
        chk_req_props('REQ-NEW', NewReq),
        chk_fact_props('FACT-NEW', gt, 20, NewFact),
        Entries = [
            upsert(fact, Relaxed, []),
            upsert(req, NewReq, [rel(constrains, 'REQ-NEW', 'FACT-CART', [])]),
            upsert(fact, NewFact, []),
            relate([rel(requires_property, 'REQ-NEW', 'FACT-NEW', [])])
        ],
        checks:what_if_analysis(Entries, A),
        % rolled back and re-indexed
        \+ kb_entity('REQ-NEW', _, _),
        kb_entity('FACT-LO', fact, LoProps),
        memberchk(value_int=LoRaw, LoProps),
        kb:unwrap_rdf_value(LoRaw, 3),
        check_domain_contradiction_witnesses(Now),
        length(Now, 1)
    )),
    chk_kinds(A.before, Before),
    Before == [strict_property-['REQ-HI', 'REQ-LO'], scenario_feasibility-['REQ-HI']],
    chk_kinds(A.after, After),
    msort(After, AfterSorted),
    AfterSorted == [scenario_feasibility-['REQ-HI'], scenario_feasibility-['REQ-NEW'],
                    strict_property-['REQ-LO', 'REQ-NEW']],
    chk_kinds(A.introduced, Introduced),
    msort(Introduced, IntroducedSorted),
    IntroducedSorted == [scenario_feasibility-['REQ-NEW'], strict_property-['REQ-LO', 'REQ-NEW']],
    chk_kinds(A.removed, Removed),
    Removed == [strict_property-['REQ-HI', 'REQ-LO']],
    chk_kinds(A.unchanged, Unchanged),
    Unchanged == [scenario_feasibility-['REQ-HI']],
    chk_kinds(A.witnesses, Staged),
    Staged == [strict_property-['REQ-LO', 'REQ-NEW']].

test(what_if_scenario_witness_text) :-
    chk_kb((
        chk_cart_req('REQ-POS', 'FACT-POS', gt, 0),
        chk_total('FACT-ZERO', eq, 0),
        chk_scenario('SCEN-ZERO', success, ['FACT-ZERO']),
        findall(W, checks:scenario_infeasibility_witness(W), [W])
    )),
    chk_same(W, _{kind: scenario_feasibility, status: infeasible, requirements: ['REQ-POS'], scenario: 'SCEN-ZERO',
                  assumedFacts: ['FACT-ZERO'], requirementFacts: ['FACT-POS'],
                  reason: "Scenario SCEN-ZERO expects success but assumes FACT-ZERO, which REQ-POS forbids via FACT-POS: No value of cart.total satisfies assumed FACT-ZERO (eq 0) together with required FACT-POS (gt 0)"}).

test(what_if_rejects_invalid_plans_and_rolls_back, error(existence_error(entity, 'FACT-NOPE'), _)) :-
    chk_kb((
        chk_req('REQ-A'),
        chk_fact_props('FACT-T', eq, 1, Props),
        catch(checks:what_if_analysis([upsert(fact, Props, []),
                                       relate([rel(requires_property, 'REQ-A', 'FACT-NOPE', [])])], _),
              E, true),
        \+ kb_entity('FACT-T', _, _),
        throw(E)
    )).

test(what_if_json) :-
    chk_kb((
        chk_cart_req('REQ-HI', 'FACT-HI', gt, 5),
        chk_cart_req('REQ-LO', 'FACT-LO', lt, 3),
        checks:what_if_contradiction_witnesses_json([], J1),
        atom_json_dict(J1, D1, []),
        checks:what_if_analysis_json([], J2),
        atom_json_dict(J2, D2, []),
        checks:what_if_contradiction_witnesses([], W)
    )),
    D1 = [Witness],
    Witness.kind == "strict_property",
    length(W, 1),
    D2.introduced == [], D2.removed == [],
    length(D2.unchanged, 1),
    length(D2.before, 1), length(D2.after, 1), length(D2.witnesses, 1).

test(what_if_witness_keys, Keys == [
        key(rule, contradiction, [r1, r2], [fa, fb], none),
        key(scenario_feasibility, infeasible, [r], [a, f], s),
        key(none, none, none, [], none)
    ]) :-
    findall(K,
        (   member(W, [
                _{kind: rule, status: contradiction, requirements: [r1, r2], left: _{factId: fb}, right: _{factId: fa}, reason: x},
                _{kind: scenario_feasibility, status: infeasible, requirements: [r], scenario: s,
                  assumedFacts: [f], requirementFacts: [a]},
                _{left: none, right: _{other: 1}}
            ]),
            checks:what_if_witness_key(W, K)
        ),
        Keys).

test(what_if_witness_absent) :-
    W1 = _{kind: rule, status: contradiction, requirements: [r1, r2], reason: "one"},
    W2 = _{kind: rule, status: contradiction, requirements: [r1, r2], reason: "reworded"},
    W3 = _{kind: rule, status: unresolved, requirements: [r1, r2]},
    \+ checks:what_if_witness_absent([W1], W2),
    checks:what_if_witness_absent([W1], W3),
    checks:what_if_witness_absent([], W1).

test(what_if_entry_ids, Ids == [a, b, c, d, e]) :-
    findall(Id,
        (   member(E, [upsert(req, [title=t, id=a], [rel(x, b, c, [])]), relate([rel(x, d, e, [])])]),
            checks:what_if_entry_id(E, Id)
        ),
        Ids).

:- end_tests(checks_contradictions).

% --- strict pairing, readiness, predicate verifiability -----------------------

%% chk_pred(+Id, +Name, +Args, +Extra)
% A predicate fact whose canonical key is Name(Args).
chk_pred(Id, Name, Args, Extra) :-
    format(string(Key), "~w(~w)", [Name, Args]),
    append([fact_kind=predicate, predicate_name=Name, predicate_args=Args, canonical_key=Key], Extra, Props),
    chk_ent(fact, Id, Props).

:- begin_tests(checks_strict_lanes).

chk_pairing(Req, D, S, violation('strict-req-fact-pairing', Req, D, S, Source)) :-
    format(atom(Source), '~w.md', [Req]).

chk_pairing_fixture :-
    chk_subject('FACT-CART', cart),
    chk_subject('FACT-BAG', bag),
    chk_total('FACT-TOTAL', gt, 0),
    chk_prop('FACT-BAG-SIZE', bag, size, gt, int, 0, []),
    chk_raw_entity(fact, 'FACT-LEGACY', [title="Legacy"]),
    chk_ent(fact, 'FACT-OBS', [fact_kind=observation]),
    % matched pair
    chk_req('REQ-OK'),
    chk_strict('REQ-OK', 'FACT-CART', 'FACT-TOTAL'),
    % subject without a property
    chk_req('REQ-SUBJ'),
    chk_rel(constrains, 'REQ-SUBJ', 'FACT-CART'),
    % property without its subject
    chk_req('REQ-PROP'),
    chk_rel(constrains, 'REQ-PROP', 'FACT-CART'),
    chk_rel(requires_property, 'REQ-PROP', 'FACT-TOTAL'),
    chk_rel(requires_property, 'REQ-PROP', 'FACT-BAG-SIZE'),
    % wrong-lane targets
    chk_req('REQ-LANE'),
    chk_raw_rel(constrains, 'REQ-LANE', 'FACT-TOTAL'),
    chk_raw_rel(constrains, 'REQ-LANE', 'FACT-LEGACY'),
    chk_rel(requires_property, 'REQ-LANE', 'FACT-OBS'),
    chk_raw_rel(requires_property, 'REQ-LANE', 'FACT-LEGACY'),
    % subject grounded through predicates instead
    chk_pred('FACT-P-KEY', "owns", ["x"], [subject_key="cart"]),
    chk_req('REQ-PRED-KEY'),
    chk_rel(constrains, 'REQ-PRED-KEY', 'FACT-CART'),
    chk_rel(requires_predicate, 'REQ-PRED-KEY', 'FACT-P-KEY'),
    chk_pred('FACT-P-FIRST', "holds", ["cart", "x"], []),
    chk_req('REQ-PRED-FIRST'),
    chk_rel(constrains, 'REQ-PRED-FIRST', 'FACT-CART'),
    chk_rel(requires_predicate, 'REQ-PRED-FIRST', 'FACT-P-FIRST'),
    chk_ent(fact, 'FACT-SCHEMA', [fact_kind=predicate_schema, predicate_name="stores", predicate_arity=2,
                                  argument_names=["item", "subject"], argument_types=["t", "t"]]),
    chk_pred('FACT-P-SCHEMA', "stores", ["x", "cart"], []),
    chk_req('REQ-PRED-SCHEMA'),
    chk_rel(constrains, 'REQ-PRED-SCHEMA', 'FACT-CART'),
    chk_rel(requires_predicate, 'REQ-PRED-SCHEMA', 'FACT-P-SCHEMA'),
    chk_pred('FACT-P-WRONG', "stores", ["cart", "x"], []),
    chk_req('REQ-PRED-WRONG'),
    chk_rel(constrains, 'REQ-PRED-WRONG', 'FACT-CART'),
    chk_rel(requires_predicate, 'REQ-PRED-WRONG', 'FACT-P-WRONG'),
    % retired requirements are not checked
    chk_req('REQ-OLD', [status=deprecated]),
    chk_rel(constrains, 'REQ-OLD', 'FACT-BAG').

test(strict_req_fact_pairing, Violations == [V1, V2, V3, V4, V5, V6, V7]) :-
    chk_kb((chk_pairing_fixture, check_strict_req_fact_pairing(Violations))),
    S1 = "Use a subject fact with constrains for contradiction-safe semantics; keep non-subject facts out of strict pairing",
    S2 = "Use a property_value fact with requires_property for contradiction-safe semantics; keep non-property facts out of strict pairing",
    chk_pairing('REQ-LANE', "Requirement links FACT-LEGACY via constrains using a legacy fact without fact_kind; contradiction-safe constrains links must target subject facts", S1, V1),
    chk_pairing('REQ-LANE', "Requirement links FACT-LEGACY via requires_property using a legacy fact without fact_kind; contradiction-safe requires_property links must target property_value facts", S2, V2),
    chk_pairing('REQ-LANE', "Requirement links FACT-OBS via requires_property using a fact_kind=observation fact; contradiction-safe requires_property links must target property_value facts", S2, V3),
    chk_pairing('REQ-LANE', "Requirement links FACT-TOTAL via constrains using a fact_kind=property_value fact; contradiction-safe constrains links must target subject facts", S1, V4),
    chk_pairing('REQ-PRED-WRONG', "Requirement constrains FACT-CART (cart) but has no matching strict requires_property fact and no requires_predicate fact about that subject",
                "Add a property_value fact via requires_property for the same subject_key, or link requires_predicate to a fact_kind: predicate fact about that subject_key (its subject argument or its subject_key)", V5),
    chk_pairing('REQ-PROP', "Requirement requires_property FACT-BAG-SIZE (bag) but has no matching strict subject fact via constrains",
                "Add a subject fact via constrains for the same subject_key or remove the mismatched requires_property link", V6),
    chk_pairing('REQ-SUBJ', "Requirement constrains FACT-CART (cart) but has no matching strict requires_property fact and no requires_predicate fact about that subject",
                "Add a property_value fact via requires_property for the same subject_key, or link requires_predicate to a fact_kind: predicate fact about that subject_key (its subject argument or its subject_key)", V7).

test(predicate_fact_subject_keys, Keys == [[cart], [cart], [cart], [x]]) :-
    chk_kb((
        chk_pairing_fixture,
        findall(Ks,
            (   member(F, ['FACT-P-KEY', 'FACT-P-FIRST', 'FACT-P-SCHEMA', 'FACT-P-WRONG']),
                kb:predicate_fact(F, Ns, N, Args, _),
                findall(K, checks:predicate_fact_subject_key(F, Ns, N, Args, K), Ks)
            ),
            Keys),
        first_answer_is_last(checks:strict_req_predicate_grounds_subject('REQ-PRED-KEY', cart))
    )).

test(kind_labels, Labels == ["a legacy fact without fact_kind", "a fact_kind=meta fact"]) :-
    findall(L, checks:strict_req_fact_pairing_kind_label(legacy, L), [L1]),
    checks:strict_req_fact_pairing_kind_label(meta, L2),
    Labels = [L1, L2],
    findall(L, checks:predicate_verifiability_kind_label(legacy, L), [P1]),
    P1 == "a legacy fact without fact_kind",
    checks:predicate_verifiability_kind_label(meta, P2),
    P2 == "fact_kind=meta".

chk_readiness(Req, D, S, violation('strict-readiness', Req, D, S, Source)) :-
    format(atom(Source), '~w.md', [Req]).

test(strict_readiness, Violations == [V1, V2, V3, V4, V5]) :-
    chk_kb((
        chk_pairing_fixture,
        chk_req('REQ-PROSE'),
        chk_req('REQ-TRACE'),
        chk_raw_rel(constrains, 'REQ-TRACE', 'FACT-LEGACY'),
        chk_req('REQ-TRACE2'),
        chk_rel(requires_property, 'REQ-TRACE2', 'FACT-OBS'),
        chk_req('REQ-RETIRED', [status=deprecated]),
        chk_strict('REQ-RETIRED', 'FACT-CART', 'FACT-TOTAL'),
        check_strict_readiness(Violations0),
        % the fixture's other requirements, by level
        findall(V, (member(V, Violations0), V = violation(_, Id, _, _, _),
                    memberchk(Id, ['REQ-PROSE', 'REQ-TRACE', 'REQ-TRACE2', 'REQ-RETIRED', 'REQ-SUBJ'])), Violations),
        findall(Id, member(violation(_, Id, _, _, _), Violations0), Ids),
        Ids == ['REQ-LANE', 'REQ-OLD', 'REQ-PRED-WRONG', 'REQ-PROSE', 'REQ-RETIRED', 'REQ-SUBJ', 'REQ-TRACE', 'REQ-TRACE2']
    )),
    chk_readiness('REQ-PROSE', "Strict readiness: not-ready (prose-only). Requirement has no fact links, so contradiction checks skip it.",
                  "Add a subject fact via constrains and a property_value fact via requires_property to model contradiction-safe semantics", V1),
    chk_readiness('REQ-RETIRED', "Strict readiness: not-ready (strict-ready). Requirement has strict subject and property facts but no contradiction-ready matched pair, so contradiction checks still skip it.",
                  "Ensure constrains and requires_property use the same subject_key, and keep the requirement current if it should participate in contradiction checks", V2),
    chk_readiness('REQ-SUBJ', "Strict readiness: not-ready (has-subject). Requirement constrains FACT-CART (cart) but has no matching strict requires_property fact and no requires_predicate fact about that subject, so contradiction checks skip it.",
                  "Add a matching property_value fact via requires_property for the same subject_key, or link requires_predicate to a predicate fact about that subject_key (its subject argument or its subject_key)", V3),
    T = "Strict readiness: not-ready (traceable). Requirement is linked to facts only through legacy or non-strict links, so contradiction checks skip it.",
    TS = "Replace prose or legacy fact links with a subject fact via constrains and a property_value fact via requires_property",
    chk_readiness('REQ-TRACE', T, TS, V4),
    chk_readiness('REQ-TRACE2', T, TS, V5).

test(readiness_levels, Levels == [contradiction_ready, contradiction_ready, strict_ready, has_subject, traceable, prose_only]) :-
    chk_kb((
        chk_pairing_fixture,
        chk_req('REQ-PROSE'),
        chk_req('REQ-TRACE'),
        chk_raw_rel(constrains, 'REQ-TRACE', 'FACT-LEGACY'),
        chk_req('REQ-STRICT'),
        chk_rel(constrains, 'REQ-STRICT', 'FACT-BAG'),
        chk_rel(requires_property, 'REQ-STRICT', 'FACT-TOTAL'),
        chk_rel(requires_property, 'REQ-STRICT', 'FACT-OBS'),
        findall(L,
            (   member(R, ['REQ-OK', 'REQ-PRED-KEY', 'REQ-STRICT', 'REQ-SUBJ', 'REQ-TRACE', 'REQ-PROSE']),
                findall(L0, checks:strict_readiness_level(R, L0), [L])
            ),
            Levels),
        chk_rel(constrains, 'REQ-TRACE', 'FACT-OBS'),
        chk_rel(requires_property, 'REQ-TRACE', 'FACT-OBS'),
        first_answer_is_last(checks:strict_readiness_has_fact_link('REQ-TRACE'))
    )).

test(readiness_helpers_are_deterministic) :-
    chk_kb((
        chk_pairing_fixture,
        chk_rel(constrains, 'REQ-SUBJ', 'FACT-BAG'),
        first_answer_is_last(checks:strict_readiness_has_strict_subject('REQ-SUBJ')),
        chk_rel(requires_property, 'REQ-SUBJ', 'FACT-BAG-SIZE'),
        chk_rel(requires_property, 'REQ-SUBJ', 'FACT-TOTAL'),
        first_answer_is_last(checks:strict_readiness_has_strict_property('REQ-SUBJ')),
        chk_req('REQ-T'),
        chk_rel(requires_property, 'REQ-T', 'FACT-OBS'),
        chk_rel(requires_property, 'REQ-T', 'FACT-TOTAL'),
        first_answer_is_last(checks:strict_readiness_has_fact_link('REQ-T')),
        \+ checks:strict_readiness_has_fact_link('REQ-NONE')
    )).

test(predicate_verifiability, Violations == [V1, V2]) :-
    S = "Apply kb_suggest_predicates and link requires_predicate to a fact_kind: predicate fact, or record a review:ontology-gap observation when no predicate fits",
    V1 = violation('predicate-verifiability', 'REQ-A', "Requirement uses requires_predicate FACT-LEGACY but target is a legacy fact without fact_kind, not fact_kind=predicate", S, 'REQ-A.md'),
    V2 = violation('predicate-verifiability', 'REQ-A', "Requirement uses requires_predicate FACT-TOTAL but target is fact_kind=property_value, not fact_kind=predicate", S, 'REQ-A.md'),
    chk_kb((
        chk_req('REQ-A'),
        chk_total('FACT-TOTAL', gt, 0),
        chk_raw_entity(fact, 'FACT-LEGACY', [title="Legacy"]),
        chk_pred('FACT-P', "owns", ["x"], []),
        chk_rel(requires_predicate, 'REQ-A', 'FACT-TOTAL'),
        chk_raw_rel(requires_predicate, 'REQ-A', 'FACT-LEGACY'),
        chk_rel(requires_predicate, 'REQ-A', 'FACT-P'),
        chk_req('REQ-OLD', [status=deprecated]),
        chk_rel(requires_predicate, 'REQ-OLD', 'FACT-TOTAL'),
        chk_raw_rel(requires_predicate, 'REQ-A', 'REQ-OLD'),
        check_predicate_verifiability(Violations)
    )).

:- end_tests(checks_strict_lanes).

% --- logic coverage and the proposition ledger --------------------------------

%% chk_lreq(+Id, +Status, +Props)
% A requirement stored raw, so logic_claims and semantic_inventory are kept
% exactly as given.
chk_lreq(Id, Status, Props) :-
    format(string(Source), "kb/~w.md", [Id]),
    chk_raw_entity(req, Id, [id=Id, title="Logic", status=Status, source=Source|Props]).

%% chk_gfact(+Id, +Kind, +Claim, +Text, +Extra)
% A ground fact of fact_kind Kind for claim_key Claim.
chk_gfact(Id, Kind, Claim, Text, Extra) :-
    chk_raw_entity(fact, Id, [id=Id, title="Ground", status=active, fact_kind=Kind,
                              claim_key=Claim, claim_text=Text|Extra]).

%% chk_inv(+Entries, -Json)
% A semantic_inventory JSON text with one Key-Status entry per element.
chk_inv(Entries, Json) :-
    findall(_{claim_key: K, status: S}, member(K-S, Entries), Dicts),
    with_output_to(string(Json), json_write_dict(current_output, Dicts, [width(0)])).

chk_fid(Req, Suffix, Id) :-
    atomic_list_concat([Req, '-', Suffix], Id).

%% chk_logic_fixture(+Req, +Status)
% One requirement that reaches every logic-coverage clause once.
chk_logic_fixture(Req, Status) :-
    chk_inv([c1-modeled, c2-ambiguous, c4-modeled, c8-ambiguous], Inv),
    chk_lreq(Req, Status, [logic_claims=[c1, c2, c3, c4, c5, c6, c8, c9, c10], semantic_inventory=Inv]),
    forall(member(S-Kind-Rel-Claim-Text-Extra,
                  [ f1-property_value-requires_property-"c1"-"one"-[],
                    f2-predicate-requires_predicate-"c2"-"two"-[],
                    f4-rule-requires_rule-"c4"-""-[],
                    f5a-property_value-requires_property-"c5"-"five"-[],
                    f5b-property_value-requires_property-"c5"-"five again"-[],
                    f6-rule-requires_rule-"c6"-"six"-[semantic_key="same"],
                    f7-rule-requires_rule-"c7"-"seven"-[semantic_key="same"],
                    f9a-rule-requires_rule-"c9"-"nine"-[semantic_key="nine"],
                    f9b-rule-requires_rule-"c9"-"nine again"-[semantic_key="nine"],
                    f10-rule-requires_rule-"c10"-"ten"-[semantic_key="other"] ]),
           (   chk_fid(Req, S, F),
               chk_gfact(F, Kind, Claim, Text, Extra),
               chk_raw_rel(Rel, Req, F)
           )).

chk_logic(Req, D, S, violation('logic-coverage', Req, D, S, Source)) :-
    format(atom(Source), '~w.md', [Req]).

:- begin_tests(checks_logic_coverage).

test(every_clause, Violations == [V1, V2, V3, V4, V9, V5, V6]) :-
    chk_kb((
        chk_logic_fixture('REQ-L', open),
        chk_logic_fixture('REQ-OLD', deprecated),
        check_logic_coverage(Violations)
    )),
    G = "Ground every declared claim with a property_value, predicate, or rule fact via its typed relationship, preserving the same claim_key",
    chk_logic('REQ-L', "Requirement declares duplicate logical ground term rule(same) through claim keys c6 and c7",
              "Remove punctuation or wording variants from the atomic inventory and keep one claim key for each distinct logical term", V1),
    chk_logic('REQ-L', "Requirement declares logical claim c3 but has no matching ground fact", G, V2),
    chk_logic('REQ-L', "Requirement declares logical claim c4 but has no matching ground fact", G, V3),
    chk_logic('REQ-L', "Requirement grounds logical claim c5 more than once through REQ-L-f5a and REQ-L-f5b",
              "Keep a one-to-one mapping between each atomic claim key and its linked ground fact; split compound clauses before grounding", V4),
    chk_logic('REQ-L', "Requirement grounds logical claim c9 more than once through REQ-L-f9a and REQ-L-f9b",
              "Keep a one-to-one mapping between each atomic claim key and its linked ground fact; split compound clauses before grounding", V9),
    chk_logic('REQ-L', "Requirement grounds unresolved ambiguous proposition c2",
              "Keep ontology gaps, ambiguities, and missing interpretations unresolved; only modeled propositions may have logical ground facts", V5),
    chk_logic('REQ-L', "Requirement links ground logical claim c7 but omits it from logic_claims",
              "Append the linked fact claim_key to the requirement logic_claims manifest, or remove the stale logical link", V6).

test(unresolved_list_entries, Descriptions == [
        "Requirement grounds unresolved missing proposition m1",
        "Requirement grounds unresolved ontology_gap proposition m2"
    ]) :-
    chk_kb((
        chk_lreq('REQ-INV', open, [semantic_inventory="[[claim_key=m1,status=missing],[claim_key=m2,status=ontology_gap],[claim_key=m3,status=nonlogical]]"]),
        chk_gfact('FACT-M1', predicate, "m1", "m one", []),
        chk_raw_rel(requires_predicate, 'REQ-INV', 'FACT-M1'),
        chk_gfact('FACT-M2', rule, "m2", "m two", []),
        chk_raw_rel(requires_rule, 'REQ-INV', 'FACT-M2'),
        chk_gfact('FACT-M3', property_value, "m3", "m three", []),
        chk_raw_rel(requires_property, 'REQ-INV', 'FACT-M3'),
        check_logic_coverage(Violations)
    )),
    findall(D, member(violation(_, _, D, _, _), Violations), Descriptions).

test(grounding_needs_kind_and_text) :-
    chk_kb((
        chk_lreq('REQ-G', open, [logic_claims=[g1]]),
        chk_gfact('FACT-G1', predicate, "g1", "text", []),
        chk_raw_rel(requires_property, 'REQ-G', 'FACT-G1'),
        \+ checks:grounded_requirement_claim('REQ-G', g1),
        chk_raw_entity(fact, 'FACT-G2', [id='FACT-G2', fact_kind=property_value, claim_key="g1"]),
        chk_raw_rel(requires_property, 'REQ-G', 'FACT-G2'),
        \+ checks:grounded_requirement_claim('REQ-G', g1),
        chk_raw_entity(fact, 'FACT-G3', [id='FACT-G3', claim_key="g1", claim_text="t"]),
        chk_raw_rel(requires_property, 'REQ-G', 'FACT-G3'),
        \+ checks:grounded_requirement_claim('REQ-G', g1),
        chk_raw_entity(fact, 'FACT-G4', [id='FACT-G4', fact_kind=property_value, claim_text="t"]),
        chk_raw_rel(requires_property, 'REQ-G', 'FACT-G4'),
        \+ checks:grounded_requirement_claim('REQ-G', _),
        chk_gfact('FACT-G5', property_value, "g1", "t", []),
        chk_raw_rel(requires_property, 'REQ-G', 'FACT-G5'),
        findall(F, checks:grounded_requirement_claim_fact('REQ-G', _, F), Facts),
        Facts == ['FACT-G5']
    )).

test(claim_requires_grounding) :-
    chk_kb((
        chk_inv([a-modeled, b-ambiguous], Inv),
        chk_lreq('REQ-C', open, [semantic_inventory=Inv]),
        first_answer_is_last(checks:claim_requires_grounding('REQ-C', a)),
        \+ checks:claim_requires_grounding('REQ-C', b),
        first_answer_is_last(checks:claim_requires_grounding('REQ-C', z)),
        findall(K-S, checks:requirement_inventory_status('REQ-C', K, S), Statuses),
        Statuses == [a-modeled, b-ambiguous],
        \+ checks:requirement_logic_claims('REQ-C', _),
        \+ checks:requirement_inventory_status('REQ-NONE', _, _)
    )).

test(inventory_entry_fields, [nondet]) :-
    checks:checks_inventory_entry_field(_{claim_key: "k"}, claim_key, V1),
    V1 == "k",
    checks:checks_inventory_entry_field([claim_key="l"], claim_key, V2),
    V2 == "l",
    \+ checks:checks_inventory_entry_field(claim_key="m", claim_key, _),
    \+ checks:checks_inventory_entry_field(_{status: "x"}, claim_key, _),
    checks:inventory_entry_status(_{status: "missing"}, S1),
    S1 == missing,
    checks:inventory_entry_status([status=modeled], S2),
    S2 == modeled,
    \+ checks:inventory_entry_status(status=modeled, _),
    checks:inventory_entry_label(_{claim_key: "CLAIM-1"}, L1),
    L1 == 'CLAIM-1',
    checks:inventory_entry_label([status=missing], L2),
    L2 == 'entry without claim_key'.

chk_clear_json_memo :-
    retractall(checks:json_text_memo(_, _)),
    retractall(checks:json_text_memo_size(_)).

test(inventory_json_objects, [setup(chk_clear_json_memo)]) :-
    checks:inventory_entries("[{\"status\":\"missing\"}]", E1),
    chk_same(E1, [_{status: "missing"}]),
    checks:inventory_entries('[{"status":"modeled"}]', E2),
    chk_same(E2, [_{status: "modeled"}]).

test(inventory_entries, [setup(chk_clear_json_memo), Entries == [[a], [b], [1], [x=1], [y=2], [], [], [], [], []]]) :-
    findall(E,
        (   member(Raw, [[a], ^^([b], t), "[1]", 'x', "[x=1]", ^^('[y=2]', t), "{\"a\":1}", '{', "foo(", 42, foo(bar)]),
            Raw \== 'x',
            checks:inventory_entries(Raw, E)
        ),
        Entries).

:- end_tests(checks_logic_coverage).

% --- rule safety and rule verifiability ----------------------------------------

%% chk_ir(+Expression, -Dict)
% Logic IR for a propositional expression: a Name atom, not(Name),
% all(List), any(List) or count(Name).
chk_ir(not(Name), _{kind: not, item: _{kind: atom, name: Name, args: [], closedWorld: true}}) :- !.
chk_ir(all(Items), _{kind: all, items: Dicts}) :- !, maplist(chk_ir, Items, Dicts).
chk_ir(any(Items), _{kind: any, items: Dicts}) :- !, maplist(chk_ir, Items, Dicts).
chk_ir(count(Name), _{kind: count, atom: _{kind: atom, name: Name, args: []}, operator: gte, value: 1}) :- !.
chk_ir(Name, _{kind: atom, name: Name, args: []}).

%% chk_prule(+Id, +Head, +Body, +Exceptions)
% A stored propositional rule Head :- Body, unless any of Exceptions.
chk_prule(Id, Head, Body, Exceptions) :-
    chk_prule(Id, rule, Head, Body, Exceptions).

%% chk_prule(+Id, +FactKind, +Head, +Body, +Exceptions)
% As chk_prule/4 on a fact of FactKind.
chk_prule(Id, FactKind, Head, Body, Exceptions) :-
    chk_ir(Head, HeadDict),
    chk_ir(Body, BodyDict),
    maplist(chk_ir, Exceptions, ExceptionDicts),
    Dict0 = _{version: 'kibi.logic.v1', kind: rule, modality: assert, head: HeadDict, body: BodyDict, variables: []},
    (   ExceptionDicts == [] -> Dict = Dict0 ; Dict = Dict0.put(exceptions, ExceptionDicts) ),
    atom_json_dict(Json, Dict, [width(0)]),
    format(string(Source), "kb/~w.md", [Id]),
    chk_raw_entity(fact, Id, [id=Id, title="Rule", status=active, source=Source, fact_kind=FactKind, rule_ir=Json]).

chk_safety(Fact, D, S, violation('rule-safety', Fact, D, S, Source)) :-
    format(atom(Source), '~w.md', [Fact]).

chk_rule_schema(Id, Extra) :-
    chk_raw_entity(fact, Id, [id=Id, title="Schema", status=active|Extra]).

chk_verif(Req, D, violation('rule-verifiability', Req, D,
          "Link requires_rule to fact_kind=rule with a valid rule_schema_id and safe kibi.logic.v1 IR", Source)) :-
    format(atom(Source), '~w.md', [Req]).

:- begin_tests(checks_rule_safety).

test(local_errors, Violations == [V]) :-
    chk_kb((
        chk_raw_entity(fact, 'FACT-MAL', [id='FACT-MAL', source="kb/FACT-MAL.md", fact_kind=rule, rule_ir="not json"]),
        chk_raw_entity(fact, 'FACT-PRED', [id='FACT-PRED', fact_kind=predicate, rule_ir="not json"]),
        chk_raw_entity(fact, 'FACT-BARE', [id='FACT-BARE', rule_ir="not json"]),
        chk_prule('FACT-OK', p, q, []),
        check_rule_safety(Violations)
    )),
    chk_safety('FACT-MAL', "Rule fact FACT-MAL failed safety validation: [malformed_rule_ir]",
               "Use kibi.logic.v1 typed IR; remove raw Prolog, unsafe variables, or unstratified negation", V).

test(negation_cycle, Facts == ['FACT-ALL', 'FACT-ANY', 'FACT-EXC', 'FACT-NP']) :-
    chk_kb((
        chk_prule('FACT-NP', p, not(q), []),
        chk_prule('FACT-NQ', q, any([p]), []),
        chk_prule('FACT-ALL', r, all([s, not(t)]), []),
        chk_prule('FACT-ANY', u, any([s, not(t)]), []),
        chk_prule('FACT-EXC', v, s, [not(t)]),
        chk_prule('FACT-CNT', w, count(p), []),
        chk_prule('FACT-POS', x, all([s, any([t])]), [s]),
        chk_prule('FACT-PRED-NEG', predicate, y, not(z), []),
        check_rule_safety(Violations),
        Violations = [First|_]
    )),
    findall(F, member(violation(_, F, _, _, _), Violations), Facts),
    chk_safety('FACT-ALL', "Stored rules contain an unstratified negation dependency cycle",
               "Separate the negated dependency into strata or replace it with an explicit closed-world fact", First0),
    First == First0.

test(stratified_negation, Violations == []) :-
    chk_kb((
        chk_prule('FACT-NP', p, not(q), []),
        chk_prule('FACT-NQ', q, s, []),
        % only rule facts take part in the dependency graph
        chk_prule('FACT-PRED-IR', predicate, q, p, []),
        check_rule_safety(Violations)
    )).

test(rule_with_negation, [nondet]) :-
    chk_kb((
        chk_prule('FACT-A', p, all([q, not(r), not(s)]), [not(t)]),
        checks:stored_rule_fact('FACT-A', _, Rule),
        first_answer_is_last(checks:rule_contains_negation(Rule))
    )).

:- end_tests(checks_rule_safety).

:- begin_tests(checks_rule_verifiability).

test(each_description, Violations == [V1, V2, V2b, V2c, V3, V4, V5, V6]) :-
    chk_kb((
        chk_req('REQ-RV'),
        chk_rule_schema('SCHEMA-OK', [fact_kind=rule_schema, rule_name="ok", argument_names=["a"], argument_types=["t"]]),
        chk_rule_schema('SCHEMA-PRED', [fact_kind=predicate]),
        chk_raw_entity(fact, 'FACT-LEG', [id='FACT-LEG']),
        chk_raw_entity(fact, 'FACT-PRED', [id='FACT-PRED', fact_kind=predicate]),
        chk_rule_fact('FACT-NOSCHEMA', assert, checkout, [total-gt-0], [], _),
        chk_rule_fact('FACT-MISSING', rule, assert, checkout, [total-gt-0], [], [rule_schema_id="kb/SCHEMA-NONE"], _),
        chk_rule_fact('FACT-BADSCHEMA', rule, assert, checkout, [total-gt-0], [], [rule_schema_id="SCHEMA-PRED"], _),
        chk_raw_entity(fact, 'FACT-UNSAFE', [id='FACT-UNSAFE', fact_kind=rule, rule_schema_id="SCHEMA-OK", rule_ir="{"]),
        chk_raw_entity(fact, 'FACT-PRED2', [id='FACT-PRED2', fact_kind=predicate, rule_schema_id="SCHEMA-NONE"]),
        chk_raw_entity(fact, 'FACT-PRED3', [id='FACT-PRED3', fact_kind=predicate, rule_schema_id="SCHEMA-PRED"]),
        chk_rule_fact('FACT-GOOD', rule, assert, checkout, [total-gt-0], [], [rule_schema_id="SCHEMA-OK"], _),
        forall(member(F, ['FACT-LEG', 'FACT-PRED', 'FACT-PRED2', 'FACT-PRED3', 'FACT-NOSCHEMA', 'FACT-MISSING', 'FACT-BADSCHEMA', 'FACT-UNSAFE', 'FACT-GOOD']),
               chk_raw_rel(requires_rule, 'REQ-RV', F)),
        chk_raw_rel(requires_rule, 'REQ-RV', 'FACT-ABSENT'),
        chk_req('REQ-OLD', [status=deprecated]),
        chk_raw_rel(requires_rule, 'REQ-OLD', 'FACT-LEG'),
        check_rule_verifiability(Violations)
    )),
    chk_verif('REQ-RV', "Requirement uses requires_rule FACT-LEG but target is fact_kind=legacy", V1),
    chk_verif('REQ-RV', "Requirement uses requires_rule FACT-PRED but target is fact_kind=predicate", V2),
    chk_verif('REQ-RV', "Requirement uses requires_rule FACT-PRED2 but target is fact_kind=predicate", V2b),
    chk_verif('REQ-RV', "Requirement uses requires_rule FACT-PRED3 but target is fact_kind=predicate", V2c),
    chk_verif('REQ-RV', "Rule fact FACT-BADSCHEMA references SCHEMA-PRED, which is not a rule_schema fact", V3),
    chk_verif('REQ-RV', "Rule fact FACT-MISSING references missing rule schema SCHEMA-NONE", V4),
    chk_verif('REQ-RV', "Rule fact FACT-NOSCHEMA has no rule_schema_id", V5),
    chk_verif('REQ-RV', "Rule fact FACT-UNSAFE is not safe: [malformed_rule_ir]", V6).

test(rule_schema_props, Valid == [true, false, false, false, false, false, false, false]) :-
    findall(B,
        (   member(Props, [
                [fact_kind=rule_schema, rule_name="n", argument_names=[a, b], argument_types=["t", "u"]],
                [fact_kind=rule_schema, rule_name="", argument_names=[a], argument_types=[t]],
                [fact_kind=rule_schema, argument_names=[a], argument_types=[t]],
                [fact_kind=rule_schema, rule_name="n", argument_names=[a, b], argument_types=[t]],
                [fact_kind=rule_schema, rule_name="n", argument_types=[t]],
                [fact_kind=rule_schema, rule_name="n", argument_names=[a]],
                [fact_kind=predicate_schema, rule_name="n", argument_names=[a], argument_types=[t]],
                [rule_name="n", argument_names=[a], argument_types=[t]]
            ]),
            (   checks:valid_rule_schema_props(Props) -> B = true ; B = false )
        ),
        Valid).

test(nonempty_normalized) :-
    checks:nonempty_normalized("x"),
    \+ checks:nonempty_normalized(""),
    \+ checks:nonempty_normalized('').

:- end_tests(checks_rule_verifiability).

% --- semantic completeness and related unmodeled requirements -----------------

:- begin_tests(checks_semantic_ledger).

test(semantic_completeness, Violations == [V1, V2]) :-
    chk_kb((
        Inv = "[{\"claim_key\":\"CLAIM-1\",\"status\":\"missing\"},{\"claim_key\":\"CLAIM-2\",\"status\":\"modeled\"},{\"status\":\"missing\"}]",
        chk_lreq('REQ-S', open, [semantic_inventory=Inv]),
        chk_lreq('REQ-SOLD', deprecated, [semantic_inventory=Inv]),
        chk_lreq('REQ-NOINV', open, []),
        check_semantic_completeness(Violations)
    )),
    S = "Run kb_semantic_advisor again, preserve every proposition span, and model or explicitly classify each assertive proposition",
    V1 = violation('semantic-completeness', 'REQ-S', "Requirement proposition ledger contains an unclassified assertive span (CLAIM-1)", S, 'REQ-S.md'),
    V2 = violation('semantic-completeness', 'REQ-S', "Requirement proposition ledger contains an unclassified assertive span (entry without claim_key)", S, 'REQ-S.md').

chk_unmodeled_fixture :-
    chk_subject('FACT-CART', cart),
    chk_total('FACT-TOTAL', gt, 0),
    chk_pred('FACT-HOLDS', "holds", ["cart"], []),
    chk_raw_entity(fact, 'FACT-OWNS', [id='FACT-OWNS', fact_kind=predicate, predicate_name="owns", predicate_args=["x"]]),
    chk_raw_entity(fact, 'FACT-NAMELESS', [id='FACT-NAMELESS', fact_kind=predicate, predicate_args=["x"]]),
    chk_ent(fact, 'FACT-OBS', [fact_kind=observation, canonical_key="seen"]),
    chk_inv([m1-missing, m2-missing, ok-modeled], Missing2),
    chk_inv([m1-missing], Missing1),
    chk_inv([ok-modeled], NoneMissing),
    % modeled: a strict pair and a predicate with a canonical key
    chk_req('REQ-M'),
    chk_strict('REQ-M', 'FACT-CART', 'FACT-TOTAL'),
    chk_rel(requires_predicate, 'REQ-M', 'FACT-HOLDS'),
    % modeled through a predicate name only
    chk_req('REQ-M2'),
    chk_raw_rel(requires_predicate, 'REQ-M2', 'FACT-OWNS'),
    chk_raw_rel(requires_predicate, 'REQ-M2', 'FACT-NAMELESS'),
    % links that model nothing
    chk_req('REQ-PLAIN'),
    chk_raw_rel(requires_predicate, 'REQ-PLAIN', 'FACT-OBS'),
    chk_raw_rel(requires_predicate, 'REQ-PLAIN', 'FACT-GONE'),
    chk_req('REQ-OLDM', [status=deprecated]),
    chk_strict('REQ-OLDM', 'FACT-CART', 'FACT-TOTAL'),
    chk_lreq('REQ-U', open, [semantic_inventory=Missing2]),
    forall(member(O, ['REQ-M', 'REQ-PLAIN', 'REQ-OLDM']), chk_raw_rel(relates_to, 'REQ-U', O)),
    chk_lreq('REQ-N', open, [semantic_inventory=Missing1]),
    chk_raw_rel(relates_to, 'REQ-M2', 'REQ-N'),
    chk_lreq('REQ-Z', open, [semantic_inventory=NoneMissing]),
    chk_raw_rel(relates_to, 'REQ-Z', 'REQ-M'),
    chk_lreq('REQ-DEP', deprecated, [semantic_inventory=Missing1]),
    chk_raw_rel(relates_to, 'REQ-DEP', 'REQ-M'),
    chk_lreq('REQ-SELF', open, [semantic_inventory=Missing1]),
    chk_strict('REQ-SELF', 'FACT-CART', 'FACT-TOTAL'),
    chk_raw_rel(relates_to, 'REQ-SELF', 'REQ-SELF'),
    chk_lreq('REQ-NOLEDGER', open, []),
    chk_raw_rel(relates_to, 'REQ-NOLEDGER', 'REQ-M').

test(related_requirement_unmodeled, Violations == [V1, V2]) :-
    chk_kb((
        chk_unmodeled_fixture,
        check_related_requirement_unmodeled(Violations)
    )),
    V1 = violation('related-requirement-unmodeled', 'REQ-N',
        "Requirement REQ-N leaves 1 proposition(s) unmodeled (status missing) while it relates_to REQ-M2, which models owns; domain-contradictions compares grounded facts only, so these claims are never checked against REQ-M2",
        "Model the missing propositions of REQ-N against owns (a subject fact via constrains and property_value facts via requires_property on the same subject_key, or ground predicate facts via requires_predicate), or record that REQ-N supersedes REQ-M2 if it replaces that requirement",
        'REQ-N.md'),
    V2 = violation('related-requirement-unmodeled', 'REQ-U',
        "Requirement REQ-U leaves 2 proposition(s) unmodeled (status missing) while it relates_to REQ-M, which models cart.total, holds([cart]); domain-contradictions compares grounded facts only, so these claims are never checked against REQ-M",
        "Model the missing propositions of REQ-U against cart.total, holds([cart]) (a subject fact via constrains and property_value facts via requires_property on the same subject_key, or ground predicate facts via requires_predicate), or record that REQ-U supersedes REQ-M if it replaces that requirement",
        'REQ-U.md').

test(missing_counts, Counts == [2, 1, 0]) :-
    chk_kb((
        chk_unmodeled_fixture,
        findall(C, (member(R, ['REQ-U', 'REQ-N', 'REQ-Z', 'REQ-NOLEDGER']),
                    checks:requirement_missing_proposition_count(R, C)), Counts)
    )).

test(modeled_summaries, Summaries == ['cart.total, holds([cart])', owns]) :-
    chk_kb((
        chk_unmodeled_fixture,
        findall(S, (member(R, ['REQ-M', 'REQ-M2', 'REQ-PLAIN', 'REQ-U']),
                    checks:modeled_requirement_summary(R, S)), Summaries)
    )).

:- end_tests(checks_semantic_ledger).

% --- the aggregated dict and its JSON transports ------------------------------

chk_all_keys([adr_proposed, adr_unlinked, deprecated_adr_no_successor, domain_contradictions,
              domain_implication, domain_redundancy, entity_id_style, exception_claim_keys,
              kb_consistency, kb_consistency_unresolved, logic_coverage, must_priority_coverage,
              no_cycles, no_dangling_refs, numeric_string_value, ontology_quality,
              predicate_verifiability, proof_contract_symbols, related_requirement_unmodeled,
              req_status_vocabulary, required_fields, retired_owner_only, retired_reason_missing,
              rule_key_arguments_missing, rule_safety,
              rule_verifiability, scenario_feasibility, scenario_feasibility_unknown,
              scenario_outcome_mismatch, semantic_completeness, strict_fact_shape,
              strict_readiness, strict_req_fact_pairing, subject_key_identity, subject_key_shape,
              superseded_requirement_open, symbol_coverage, symbol_owner_superseded,
              symbol_traceability]).

%% chk_json(+Text, -Dict)
% Text parsed as JSON, strings kept as strings.
chk_json(Text, Dict) :-
    atom_json_dict(Text, Dict, [value_string_as(string)]).

%% chk_nonempty(+Dict, -Keys)
% The keys of Dict whose value is not the empty list.
chk_nonempty(Dict, Keys) :-
    dict_pairs(Dict, _, Pairs),
    findall(K, (member(K-V, Pairs), V \== []), Keys).

chk_must_and_dangling :-
    chk_req('REQ-M1', [priority=must]),
    chk_raw_rel(relates_to, 'REQ-M1', 'REQ-GONE').

%% chk_with_tmp(-Path, :Goal)
:- meta_predicate chk_with_tmp(-, 0).
chk_with_tmp(Path, Goal) :-
    tmp_file(checks_json, Path),
    setup_call_cleanup(true, once(Goal),
                       (exists_file(Path) -> delete_file(Path) ; true)).

chk_file_json(Path, Dict) :-
    read_file_to_string(Path, Text, [encoding(utf8)]),
    chk_json(Text, Dict).

chk_must_json(_{rule: "must-priority-coverage", entityId: "REQ-M1",
                description: "Must-priority requirement lacks scenario and test coverage",
                suggestion: "Create scenario that specifies and test that validates this requirement",
                source: "REQ-M1.md"}).

:- begin_tests(checks_aggregate_json).

test(check_all_keys, Keys == Expected) :-
    chk_all_keys(Expected),
    chk_kb((check_all(D), dict_keys(D, Keys))).

test(check_all_finds, Nonempty == [must_priority_coverage, no_dangling_refs, strict_readiness]) :-
    chk_kb((chk_must_and_dangling, check_all(D), chk_nonempty(D, Nonempty))).

test(check_selected, Nonempty == [must_priority_coverage]) :-
    chk_all_keys(Expected),
    chk_kb((
        chk_must_and_dangling,
        chk_ent(symbol, 'SYM-X', []),
        checks:check_selected(['must-priority-coverage', 'symbol-granularity'], D),
        dict_keys(D, Keys),
        Keys == Expected,
        chk_nonempty(D, Nonempty),
        checks:check_selected(['symbol-granularity'], D2),
        chk_nonempty(D2, [])
    )).

test(check_selected_traceability_without_adr) :-
    chk_kb((
        plunit_checks_symbol_traceability:chk_trace_fixture,
        checks:check_selected(['symbol-traceability'], D),
        check_symbol_traceability(false, Expected),
        D.symbol_traceability == Expected,
        checks:check_all_with_options(DA, true),
        check_symbol_traceability(true, ExpectedAdr),
        DA.symbol_traceability == ExpectedAdr,
        ExpectedAdr \== Expected,
        check_all(DF),
        DF.symbol_traceability == Expected
    )).

test(unknown_rules, Unknown == [bogus, 'no-such-rule']) :-
    catch(checks:check_selected(['must-priority-coverage', bogus, 'no-such-rule'], _), error(domain_error(check_rule, Unknown), _), true).

test(require_known_rules) :-
    first_answer_is_last(checks:require_known_rules(['must-priority-coverage'])),
    first_answer_is_last(checks:require_known_rules([])).

test(run_aggregated_check) :-
    chk_kb((
        first_answer_is_last(checks:run_aggregated_check(true, k-none, P1)),
        P1 == k-[],
        first_answer_is_last(checks:run_aggregated_check(true, symbol_traceability-check_symbol_traceability, P2)),
        P2 == symbol_traceability-[],
        checks:run_aggregated_check(true, adr_proposed-check_adr_proposed, P3),
        P3 == adr_proposed-[]
    )).

test(check_all_json) :-
    chk_kb((
        chk_must_and_dangling,
        check_all_json(J1),
        checks:check_all_json_with_options(J2, false),
        check_selected_json(['must-priority-coverage'], J3)
    )),
    string(J1), string(J2), string(J3),
    forall(member(J, [J1, J2, J3]), \+ sub_string(J, _, _, _, "\n")),
    chk_must_json(Must),
    chk_json(J1, D1),
    chk_same(D1.must_priority_coverage, [Must]),
    [Dangling] = D1.no_dangling_refs,
    Dangling.rule == "no-dangling-refs",
    chk_json(J2, D2),
    chk_same(D2, D1),
    chk_json(J3, D3),
    chk_same(D3.must_priority_coverage, [Must]),
    D3.no_dangling_refs == [].

test(json_with_adr_option) :-
    chk_kb((
        plunit_checks_symbol_traceability:chk_trace_fixture,
        checks:check_all_json_with_options(J1, true),
        checks:check_all_json_with_options(J2, false)
    )),
    chk_json(J1, D1),
    chk_json(J2, D2),
    length(D1.symbol_traceability, N1),
    length(D2.symbol_traceability, N2),
    N1 > N2.

test(json_files) :-
    chk_kb((
        chk_must_and_dangling,
        chk_with_tmp(P1, (check_all_json_file(P1, false), chk_file_json(P1, D1),
                          read_file_to_string(P1, T1, []), \+ sub_string(T1, _, _, _, "\n"))),
        chk_with_tmp(P2, (check_selected_json_file(['must-priority-coverage'], P2), chk_file_json(P2, D2)))
    )),
    chk_must_json(Must),
    chk_same(D1.must_priority_coverage, [Must]),
    length(D1.no_dangling_refs, 1),
    chk_same(D2.must_priority_coverage, [Must]),
    D2.no_dangling_refs == [].

test(json_transports) :-
    chk_kb((
        chk_must_and_dangling,
        chk_with_tmp(P1, (check_all_json_transport(P1, false, T1, J1), chk_file_json(P1, D1))),
        check_all_json_transport(none, false, T2, J2),
        check_all_json_transport('/nonexistent-dir/checks/x.json', false, T3, J3),
        chk_with_tmp(P4, (check_selected_json_transport(['no-dangling-refs'], P4, T4, J4), chk_file_json(P4, D4))),
        check_selected_json_transport(['no-dangling-refs'], none, T5, J5)
    )),
    T1 == file, J1 == '',
    T2 == answer, chk_json(J2, D2), chk_same(D2, D1),
    T3 == answer, J3 == J2,
    T4 == file, J4 == '', D4.must_priority_coverage == [], length(D4.no_dangling_refs, 1),
    T5 == answer, chk_json(J5, D5), chk_same(D5, D4).

test(transport_rethrows_other_errors) :-
    chk_kb(catch(check_all_json_transport(path(1), false, _, _), Error, true)),
    nonvar(Error),
    \+ checks:file_transport_error(Error).

test(file_transport_errors, Kinds == [true, true, true, true, false, false]) :-
    findall(B,
        (   member(E, [error(permission_error(open, source_sink, x), c), error(existence_error(source_sink, x), c),
                       error(resource_error(memory), c), error(io_error(write, s), c),
                       error(type_error(text, x), c), oops]),
            (checks:file_transport_error(E) -> B = true ; B = false)
        ),
        Kinds).

:- end_tests(checks_aggregate_json).

:- begin_tests(checks_violation_json).

test(violation_with_evidence) :-
    V = violation(r, 'E', "d", "s", "src", _{witnesses: []}),
    first_answer_is_last(checks:violation_to_json(V, J)),
    chk_same(J, _{rule: "r", entityId: "E", description: "d", suggestion: "s", source: "src", evidence: _{witnesses: []}}).

test(plain_violation) :-
    chk_kb(checks:violation_to_json(violation(r, 'E', d, s, ''), J)),
    chk_same(J, _{rule: "r", entityId: "E", description: "d", suggestion: "s", source: ""}).

test(contradiction_evidence) :-
    chk_kb((
        chk_cart_req('REQ-HI', 'FACT-HI', gt, 5),
        chk_cart_req('REQ-LO', 'FACT-LO', lt, 3),
        check_domain_contradiction_witnesses([W]),
        check_domain_contradictions([V]),
        checks:violation_to_json(V, J),
        V = violation(Rule, Id, D, S, Src),
        checks:violation_to_json(violation(Rule, "REQ-LO/REQ-HI", D, S, Src), Swapped),
        checks:violation_to_json(violation(Rule, Id, "Other text", S, Src), Reworded),
        checks:violation_to_json(violation('strict-readiness', Id, D, S, Src), OtherRule)
    )),
    chk_same(J.evidence, _{witnesses: [W]}),
    J.rule == "domain-contradictions",
    J.entityId == "REQ-HI/REQ-LO",
    \+ get_dict(evidence, Swapped, _),
    \+ get_dict(evidence, Reworded, _),
    \+ get_dict(evidence, OtherRule, _).

test(witness_matches_violation) :-
    W = _{requirements: ['A', 'B'], reason: ^^("Rule x", t)},
    checks:witness_matches_violation("A/B", "Rule x and more", W),
    \+ checks:witness_matches_violation("B/A", "Rule x and more", W),
    \+ checks:witness_matches_violation("A/B", "Other Rule x", W),
    \+ checks:witness_matches_violation("A/B/C", "Rule x", W.put(requirements, ['A', 'B', 'C'])).

test(violations_dict_to_json) :-
    checks:violations_dict_to_json(t{a: [], b: [violation(r, e, d, s, src)]}, J),
    is_dict(J, t),
    chk_same(J, _{a: [], b: [_{rule: "r", entityId: "e", description: "d", suggestion: "s", source: "src"}]}).

test(violation_text, Texts == ["plain", "atom", "inner", "typed", "5", "[]", "f(x,\"y\")"]) :-
    findall(T,
        (   member(V, ["plain", atom, ^^("inner", t), literal(type(t, typed)), 5, [], f(x, "y")]),
            checks:violation_text(V, T)
        ),
        Texts).

test(violation_text_deterministic) :-
    forall(member(V, ["plain", atom, ^^(^^(inner, t), t), literal(type(t, literal(type(t, x)))), f(x)]),
           (   first_answer_is_last(checks:violation_text(V, T)),
               string(T)
           )),
    checks:violation_text(_, VarText),
    sub_string(VarText, 0, 1, _, "_"),
    checks:violation_id_text(^^('E', t), Id),
    Id == "E".

:- end_tests(checks_violation_json).

% --- edge cases of the feasibility, opposition and strict-lane helpers --------

chk_mt(Role, Id, Key, Scope, Type, Unit, Op, Value, m(Role, Id, Id, Key, Scope, Type, Unit, Op, Value, Id)).

:- begin_tests(checks_edge_cases).

test(narrow_exception_of_another_requirement, Violations == [violation('scenario-feasibility', 'SCEN-ZERO', D,
        "Add the claim_key of FACT-POS to exempts_claims on REQ-EX if a human approves waiving that clause too, set expects: rejection on SCEN-ZERO, or correct the assumption",
        Source)]) :-
    plunit_checks_feasibility_kb:chk_zero_description(". Approved exception REQ-EX waives only the claims listed in its exempts_claims, and FACT-POS is not grounded by one of them", D),
    chk_xsd("kb/SCEN-ZERO.md", Source),
    chk_kb((
        plunit_checks_feasibility_kb:chk_zero_fixture,
        plunit_checks_feasibility_kb:chk_exception('REQ-EX', [approved_by="Owner", exempts_claims=["CLAIM-OTHER"]]),
        chk_req('REQ-B'),
        chk_req('REQ-EXB', [approved_by="Owner", exempts_claims=["CLAIM-OTHER"]]),
        chk_rel(exempts, 'REQ-EXB', 'REQ-B'),
        chk_rel(specified_by, 'REQ-EXB', 'SCEN-ZERO'),
        chk_req('REQ-EXU'),
        chk_rel(exempts, 'REQ-EXU', 'REQ-B'),
        chk_rel(specified_by, 'REQ-EXU', 'SCEN-ZERO'),
        check_scenario_feasibility(Violations)
    )).

test(narrow_exception_reads_its_own_links_and_facts) :-
    chk_kb((
        plunit_checks_feasibility_kb:chk_zero_fixture,
        plunit_checks_feasibility_kb:chk_exception('REQ-NARROW', [approved_by="Owner", exempts_claims=["CLAIM-OTHER"]]),
        chk_req('REQ-STRAY', [approved_by="Owner", exempts_claims=["CLAIM-OTHER"]]),
        chk_total('FACT-OTHER', eq, 1, [claim_key="CLAIM-OTHER", claim_text="Other"]),
        findall(E, checks:narrow_scenario_exception('SCEN-ZERO', 'REQ-POS', ['FACT-POS'], E), Es),
        Es == ['REQ-NARROW']
    )).

test(evidence_texts, Texts == ["", "a b", "x"]) :-
    findall(T, (member(R, ['', 'a b', "x"]), checks:evidence_text(R, T)), Texts).

test(analysis_outcome_infeasible_first) :-
    findall(O, checks:analysis_outcome(analysis([infeasibility(r, a, f, why)], [u], true, [n]), O), Os),
    Os == [infeasible(witness(r, a, f, why))].

% A rule that reads no assumed property is no part of the scenario, even
% when the scenario performs its action.
test(rule_reading_other_properties, Unknowns == [unmatched_assumption(['FACT-DO', 'FACT-TOT'])]) :-
    chk_kb((
        chk_subject('FACT-CART', cart),
        chk_req('REQ-R'),
        chk_rule_fact('FACT-R', forbid, checkout, [discount-gt-0], [], _),
        chk_rel(requires_rule, 'REQ-R', 'FACT-R'),
        chk_total('FACT-TOT', eq, 5),
        chk_pred('FACT-DO', "checkout", ["c1"], []),
        chk_scenario('SCEN-K', success, ['FACT-TOT', 'FACT-DO']),
        chk_analysis('SCEN-K', analysis(_, Unknowns, _, _))
    )).

% The rule's action is performed only by an assumed predicate fact.
test(unassumed_action_performs_nothing, Analysis == analysis([], [unmatched_assumption(['FACT-TOT'])], false, [])) :-
    chk_kb((
        chk_subject('FACT-CART', cart),
        chk_req('REQ-R'),
        chk_rule_fact('FACT-R', forbid, checkout, [total-gt-0], [], _),
        chk_rel(requires_rule, 'REQ-R', 'FACT-R'),
        chk_total('FACT-TOT', eq, 5),
        chk_pred('FACT-DO', "checkout", ["c1"], []),
        chk_scenario('SCEN-K', success, ['FACT-TOT']),
        chk_analysis('SCEN-K', Analysis)
    )).

test(governed_assumption_makes_the_rest_applicable, NotApplicable == []) :-
    chk_kb((
        chk_cart_req('REQ-OLD', 'FACT-OLD', gt, 0, [valid_to="2020-01-01T00:00:00Z"]),
        chk_req('REQ-Q'),
        chk_prop('FACT-QREQ', cart, qty, gte, int, 0, []),
        chk_strict('REQ-Q', 'FACT-CART', 'FACT-QREQ'),
        chk_total('FACT-NOW', eq, 0, [valid_from="2026-01-01T00:00:00Z"]),
        chk_prop('FACT-QTY', cart, qty, eq, int, 0, []),
        chk_scenario('SCEN-NA', success, ['FACT-NOW', 'FACT-QTY']),
        chk_analysis('SCEN-NA', analysis(_, _, _, NotApplicable))
    )).

% Contradictory scoped assumptions decide the scoped context; no separate
% unscoped context is checked beside it.
test(scoped_contexts_only, Analysis == analysis([], [contradictory_assumptions(['F-A2', 'F-A3'])], false, [])) :-
    chk_kb((
        chk_total('F-A1', gt, 5),
        chk_total('F-A2', eq, 1, [scope="eu"]),
        chk_total('F-A3', eq, 2, [scope="eu"]),
        chk_cart_req('REQ-R1', 'F-R1', lt, 8),
        chk_cart_req('REQ-R2', 'F-R2', neq, 6),
        chk_cart_req('REQ-R3', 'F-R3', neq, 7),
        chk_scenario('SCEN-S', success, ['F-A1', 'F-A2', 'F-A3']),
        chk_analysis('SCEN-S', Analysis)
    )).

test(property_member_is_deterministic) :-
    chk_kb((
        chk_total('FACT-TOT', eq, 5),
        first_answer_is_last(checks:assumption_member('FACT-TOT', M)),
        M = m(assumption, 'FACT-TOT', 'FACT-TOT', cart-total, '', int, '', eq, 5, _)
    )).

test(time_helpers) :-
    first_answer_is_last(checks:earlier_time(t, '', E1)), E1 == t,
    first_answer_is_last(checks:later_time(t, '', L1)), L1 == t,
    checks:validity_applicability(window('', '2026-06-01'), '', '2027-01-01', A1), A1 == applies,
    checks:validity_applicability(window('2026-06-01', ''), '2026-01-01', '', A2), A2 == applies,
    checks:time_before('2026-01-01', '2026-02-01'),
    \+ checks:time_before('2026-02-01', '2026-01-01'),
    checks:time_before('2026-01-01T10:00:00+02:00', '2026-01-01T09:00:00Z'),
    \+ checks:time_before('2026-01-01T09:00:00Z', '2026-01-01T10:00:00+02:00'),
    checks:time_before(a, b),
    \+ checks:time_before(b, a),
    \+ checks:time_before(x, x),
    \+ checks:time_before('2026-01-01', ''),
    \+ checks:time_before('', '2026-01-01'),
    % an unparsable bound falls back to the standard order of terms
    \+ checks:time_before(f(x), '2026-01-01'),
    checks:time_before('2026-01-01', f(x)).

test(outside_general_rule_is_deterministic) :-
    first_answer_is_last(checks:general_rule_verdict([], gr(r, f, forbids, '', outside, false, [s-p], []), V)),
    V == [].

test(general_rule_with_scoped_and_unscoped_assumptions) :-
    chk_mt(assumption, a1, s-p, '', int, '', eq, 5, A1),
    chk_mt(assumption, a2, s-p, eu, int, '', eq, 5, A2),
    chk_mt(requirement, c, s-p, '', int, '', gt, 0, C),
    chk_kb(checks:general_rule_verdict([A1, A2], gr(r, f, forbids, '', applies, false, [s-p], [C]), V)),
    V = [witness(infeasibility([r], Facts, [f], _))],
    Facts == [a2].

test(untranslatable_rule_stays_undecided) :-
    chk_mt(assumption, a1, s-p, '', int, '', eq, 1, A1),
    chk_mt(assumption, a2, s-p, '', int, '', eq, 2, A2),
    chk_kb(checks:general_rule_verdict([A1, A2], gr(r, f, forbids, '', applies, false, [s-p], untranslatable), V)),
    V == [undecided_rule([f])].

test(incomparable_unconditioned_assumptions) :-
    chk_mt(assumption, a1, s-p, '', int, '', eq, 5, A1),
    chk_mt(assumption, q1, s-q, '', int, kg, eq, 1, Q1),
    chk_mt(assumption, q2, s-q, '', int, s, eq, 1, Q2),
    chk_mt(requirement, c, s-p, '', int, '', gt, 0, C),
    chk_kb(checks:general_rule_verdict([A1, Q1, Q2], gr(r, f, forbids, '', applies, false, [s-p, s-q], [C]), V)),
    V == [].

test(negative_scenario_opposition) :-
    chk_kb((
        chk_total('F-A', eq, 5),
        chk_ent(scenario, 'SCEN-NEG', [expects=rejection]),
        chk_rel(assumes, 'SCEN-NEG', 'F-A'),
        chk_req('REQ-S'),
        chk_rel(specified_by, 'REQ-S', 'SCEN-NEG'),
        chk_total('F-S', eq, 7),
        chk_rel(requires_property, 'REQ-S', 'F-S'),
        chk_total('F-OK', eq, 5),
        chk_rel(requires_property, 'REQ-S', 'F-OK'),
        chk_req('REQ-O'),
        chk_total('F-O', eq, 9),
        chk_rel(requires_property, 'REQ-O', 'F-O'),
        findall(R-W, (checks:negative_scenario_witness('SCEN-NEG', R, W), W = opposed(_, _)), Opposed),
        Opposed == ['REQ-S'-opposed('F-A', 'F-S')]
    )).

test(opposition_needs_the_same_polarity) :-
    chk_kb((
        chk_total('F-A', eq, 5),
        chk_total('F-B', eq, 3, [polarity=forbid]),
        \+ checks:facts_oppose('F-A', 'F-B')
    )).

test(opposing_values) :-
    \+ checks:opposing_value(string, gt, 5, _, _),
    \+ checks:opposing_value(int, gt, "5", _, _),
    findall(O-V, checks:opposing_value(string, eq, x, O, V), [OV1]),
    OV1 == neq-x,
    findall(O-V, checks:opposing_value(string, neq, x, O, V), [OV2]),
    OV2 == eq-x,
    \+ checks:opposing_value(string, gt, x, _, _).

test(what_if_json_is_one_line, [nondet]) :-
    chk_kb((
        chk_cart_req('REQ-HI', 'FACT-HI', gt, 5),
        chk_cart_req('REQ-LO', 'FACT-LO', lt, 3),
        checks:what_if_contradiction_witnesses_json([], J1),
        checks:what_if_analysis_json([], J2)
    )),
    sub_string(J1, _, _, _, "REQ-HI"),
    sub_string(J2, _, _, _, "REQ-HI"),
    \+ sub_string(J1, _, _, _, "\n"),
    \+ sub_string(J2, _, _, _, "\n").

test(what_if_reindexes_staged_entities) :-
    chk_kb((
        chk_req('REQ-A'),
        kb:kb_ensure_indexes,
        plunit_checks_contradictions:chk_req_props('REQ-NEW', NewReq),
        checks:what_if_analysis([upsert(req, NewReq, [])], _),
        \+ kb:kb_index_entity('REQ-NEW', _),
        kb:kb_index_entity('REQ-A', _)
    )).

test(what_if_witness_key_reads_sides_only, Facts == [fa]) :-
    checks:what_if_witness_key(_{kind: rule, status: s, requirements: [], left: _{factId: fa},
                                 extra: _{factId: fx}}, key(_, _, _, Facts, _)).

test(key_set_names, Texts == ['[owner]', '[positions 1]']) :-
    chk_kb((
        chk_ent(fact, 'FACT-HS', [fact_kind=predicate_schema, predicate_name="holds", predicate_arity=2,
                                  argument_names=["owner", "item"], argument_types=["t", "t"]]),
        checks:key_set_text(default, holds, 2, [1], T1),
        checks:key_set_text(default, owns, 2, [1], T2),
        Texts = [T1, T2]
    )).

test(predicate_subject_needs_matching_arity, Keys == [x]) :-
    chk_kb((
        chk_ent(fact, 'FACT-SCHEMA', [fact_kind=predicate_schema, predicate_name="stores", predicate_arity=2,
                                      argument_names=["item", "subject"], argument_types=["t", "t"]]),
        findall(K, checks:predicate_fact_subject_key('F-NONE', default, stores, [x, y, cart], K), Keys)
    )).

test(strict_lanes_skip_retired_requirements, Ids == ['REQ-LIVE', 'REQ-LIVE']) :-
    chk_kb((
        chk_subject('FACT-CART', cart),
        chk_total('FACT-TOTAL', gt, 0),
        chk_ent(fact, 'FACT-OBS', [fact_kind=observation]),
        forall(member(R-St, ['REQ-DEP'-deprecated, 'REQ-LIVE'-open]),
               (   chk_req(R, [status=St]),
                   chk_raw_rel(constrains, R, 'FACT-TOTAL'),
                   chk_rel(requires_property, R, 'FACT-OBS')
               )),
        chk_req('REQ-DEP2', [status=deprecated]),
        chk_rel(requires_property, 'REQ-DEP2', 'FACT-TOTAL'),
        check_strict_req_fact_pairing(Violations),
        findall(Id, member(violation(_, Id, _, _, _), Violations), Ids)
    )).

test(readiness_levels_edge_cases, Levels == [has_subject, traceable, prose_only, has_subject]) :-
    chk_kb((
        chk_subject('FACT-CART', cart),
        chk_total('FACT-TOTAL', gt, 0),
        chk_ent(fact, 'FACT-OBS', [fact_kind=observation]),
        chk_pred('FACT-P-KEY', "owns", ["x"], [subject_key="cart"]),
        chk_req('REQ-DEPP', [status=deprecated]),
        chk_rel(constrains, 'REQ-DEPP', 'FACT-CART'),
        chk_rel(requires_predicate, 'REQ-DEPP', 'FACT-P-KEY'),
        chk_req('REQ-PONLY'),
        chk_rel(requires_property, 'REQ-PONLY', 'FACT-TOTAL'),
        chk_req('REQ-GONE'),
        chk_raw_rel(constrains, 'REQ-GONE', 'FACT-NOPE'),
        chk_raw_rel(requires_property, 'REQ-GONE', 'FACT-NOPE2'),
        chk_req('REQ-SOBS'),
        chk_rel(constrains, 'REQ-SOBS', 'FACT-CART'),
        chk_rel(requires_property, 'REQ-SOBS', 'FACT-OBS'),
        findall(L, (member(R, ['REQ-DEPP', 'REQ-PONLY', 'REQ-GONE', 'REQ-SOBS']),
                    once(checks:strict_readiness_level(R, L))), Levels)
    )).

test(predicate_verifiability_reads_links, Ids == ['REQ-PV']) :-
    chk_kb((
        chk_ent(fact, 'FACT-OBS', [fact_kind=observation]),
        chk_ent(fact, 'FACT-OBS2', [fact_kind=observation]),
        chk_req('REQ-PV'),
        chk_rel(requires_predicate, 'REQ-PV', 'FACT-OBS'),
        chk_req('REQ-NONE'),
        check_predicate_verifiability(Violations),
        findall(Id-F, (member(violation(_, Id, D, _, _), Violations), sub_atom(D, _, _, _, 'FACT-OBS2'), F = x), []),
        findall(Id, member(violation(_, Id, _, _, _), Violations), Ids)
    )).

:- end_tests(checks_edge_cases).
