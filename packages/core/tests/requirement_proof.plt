:- encoding(utf8).
:- use_module(library(plunit)).
:- use_module(library(http/json)).
:- use_module('../src/kb.pl').
:- use_module('../src/requirement_proof.pl').
:- use_module(kb_fixture).
:- use_module(proof_fixture).
:- use_module(test_helpers).

% The requirement proof ladder: each stage over fresh fixture KBs, and the
% pure helpers it is built from over plain dicts. Calls whose answer is
% compared are wrapped in once/1, so a mutant cannot pass by backtracking
% into a later answer; first_answer_is_last/1 checks the cuts.

%% rqp_kb(:Goal)
% Goal's first answer on a fresh, empty KB.
:- meta_predicate rqp_kb(0).
rqp_kb(Goal) :-
    with_fixture_kb(once(Goal)).

rqp_roundtrip(Term, Parsed) :-
    with_output_to(string(Json), json_write_dict(current_output, Term, [])),
    atom_json_dict(Json, Parsed, [value_string_as(atom)]).

:- begin_tests(requirement_proof_normalizers).

test(normalize_integer_shapes) :-
    once(requirement_proof:normalize_integer('^^'("7", xsd), I1)), I1 == 7,
    once(requirement_proof:normalize_integer(8, I2)), I2 == 8,
    once(requirement_proof:normalize_integer('9', I3)), I3 == 9,
    once(requirement_proof:normalize_integer("10", I4)), I4 == 10,
    \+ requirement_proof:normalize_integer(f(x), _),
    \+ requirement_proof:normalize_integer(1.5, _).

test(source_path_atom_needs_text) :-
    once(requirement_proof:source_path_atom("src/a.ts", A)), A == 'src/a.ts',
    \+ requirement_proof:source_path_atom("", _).

test(normalize_atom_and_list) :-
    once(requirement_proof:normalize_atom("a/b", A)), A == b,
    once(requirement_proof:normalize_atom_list(["x", y], L)), L == [x, y].

test(normalize_receipt_atom_shapes) :-
    once(requirement_proof:normalize_receipt_atom('^^'("a/b", t), A1)), A1 == 'a/b',
    once(requirement_proof:normalize_receipt_atom(literal(type(t, "c")), A2)), A2 == c,
    once(requirement_proof:normalize_receipt_atom("s", A3)), A3 == s,
    once(requirement_proof:normalize_receipt_atom(atm, A4)), A4 == atm,
    once(requirement_proof:normalize_receipt_atom(12, A5)), A5 == '12',
    first_answer_is_last(requirement_proof:normalize_receipt_atom('^^'(a, t), _)),
    first_answer_is_last(requirement_proof:normalize_receipt_atom(literal(type(t, a)), _)),
    first_answer_is_last(requirement_proof:normalize_receipt_atom("s", _)),
    first_answer_is_last(requirement_proof:normalize_receipt_atom(a, _)),
    \+ requirement_proof:normalize_receipt_atom("s", t),
    \+ requirement_proof:normalize_receipt_atom(a, b).

test(inventory_entry_field_on_dicts_and_lists) :-
    once(requirement_proof:inventory_entry_field(_{a: 1}, a, V1)), V1 == 1,
    once(requirement_proof:inventory_entry_field([a=2], a, V2)), V2 == 2,
    \+ requirement_proof:inventory_entry_field(_{a: 1}, b, _),
    \+ requirement_proof:inventory_entry_field(atom, a, _).

test(inventory_entries_parse_every_shape) :-
    once(requirement_proof:inventory_entries([x], E1)), E1 == [x],
    once(requirement_proof:inventory_entries('^^'("[1,2]", t), E2)), E2 == [1, 2],
    once(requirement_proof:inventory_entries("[{\"a\":\"b\"}]", E3)), same(E3, [_{a: "b"}]),
    once(requirement_proof:inventory_entries('[c, d]', E4)), E4 == [c, d],
    once(requirement_proof:inventory_entries("{\"a\":1}", E5)), E5 == [],
    once(requirement_proof:inventory_entries("not a term (", E6)), E6 == [],
    once(requirement_proof:inventory_entries("foo", E7)), E7 == [],
    once(requirement_proof:inventory_entries(f(x), E8)), E8 == [],
    once(requirement_proof:inventory_entries(42, E9)), E9 == [].

test(pure_memo_caches_and_bounds_its_size) :-
    retractall(requirement_proof:pure_memo(_, _, _)),
    retractall(requirement_proof:pure_memo_size(_)),
    once(requirement_proof:pure_memo(rqp_kind, "[1]", parse_inventory_entries, A)), A == [1],
    requirement_proof:pure_memo_size(1),
    variant_sha1(rqp_kind-"[1]", Key),
    once(requirement_proof:pure_memo(Key, rqp_kind, Cached)), Cached == [1],
    retract(requirement_proof:pure_memo(Key, rqp_kind, _)),
    assertz(requirement_proof:pure_memo(Key, rqp_kind, cached)),
    once(requirement_proof:pure_memo(rqp_kind, "[1]", parse_inventory_entries, B)), B == cached,
    requirement_proof:pure_memo_limit(Limit), Limit == 4096,
    retractall(requirement_proof:pure_memo_size(_)),
    assertz(requirement_proof:pure_memo_size(4096)),
    once(requirement_proof:pure_memo(rqp_kind, "[2]", parse_inventory_entries, C)), C == [2],
    requirement_proof:pure_memo_size(Size), Size == 1,
    \+ requirement_proof:pure_memo(Key, rqp_kind, _),
    retractall(requirement_proof:pure_memo_size(_)),
    assertz(requirement_proof:pure_memo_size(4095)),
    once(requirement_proof:pure_memo(rqp_kind, "[3]", parse_inventory_entries, _)),
    requirement_proof:pure_memo_size(Size2), Size2 == 4096,
    retractall(requirement_proof:pure_memo(_, _, _)),
    retractall(requirement_proof:pure_memo_size(_)).

:- end_tests(requirement_proof_normalizers).

rqp_full_stages(Overrides, Stages) :-
    Base = _{
        semanticInventory: _{status: passed, propositionCount: 1, missingCount: 0, malformedCount: 0, unresolvedCount: 0},
        logicGrounding: _{status: passed, manifestClaims: [k], missingManifestClaims: [], extraManifestClaims: [],
                          undeclaredGroundClaims: [], missingGroundClaims: [], duplicateGroundClaims: [],
                          claimTextMismatchClaims: [], invalidGroundClaims: [], invalidRuleFacts: []},
        contradictions: _{status: passed},
        scenarios: _{status: passed, infeasibleScenarios: [], unknownFeasibility: []},
        negativePath: _{status: passed},
        dimension: _{status: not_required},
        cases: _{status: passed},
        scenarioTests: _{status: passed},
        passingE2e: _{status: passed, missingReceiptTests: [], staleReceiptTests: [], failedReceiptTests: [],
                      invalidReceiptTests: [], contractMismatchReceiptTests: [], snapshotUnavailableTests: []},
        executableSymbols: _{status: passed},
        productionSymbols: _{status: passed, symbols: [s], structuralSymbols: [], uncoveredSymbols: []},
        sourceCoordinates: _{status: passed, missingSymbols: [], requirementSource: present}
    },
    foldl(rqp_override, Overrides, Base, Stages).

rqp_override(Stage-Key-Value, Stages0, Stages) :-
    get_dict(Stage, Stages0, Dict0),
    put_dict(Key, Dict0, Value, Dict),
    put_dict(Stage, Stages0, Dict, Stages).

rqp_gaps(Overrides, Gaps) :-
    rqp_full_stages(Overrides, Stages),
    once(requirement_proof:proof_issues(Stages, Gaps, _)).

:- begin_tests(requirement_proof_gaps).

test(a_clean_ladder_has_no_gaps) :-
    rqp_full_stages([], Stages),
    once(requirement_proof:proof_issues(Stages, Gaps, Advisories)),
    Gaps == [], Advisories == [],
    once(requirement_proof:proof_gaps(Stages, G)), G == [],
    once(requirement_proof:proof_advisories(Stages, A)), A == [],
    once(requirement_proof:proof_status(Stages, Status)), Status == tested.

test(each_gap_is_detected_alone) :-
    forall(member(Override-Expected, [
            [semanticInventory-propositionCount-0]-[missing_semantic_inventory],
            [semanticInventory-missingCount-1]-[incomplete_semantic_inventory],
            [semanticInventory-malformedCount-1]-[malformed_semantic_inventory],
            [semanticInventory-unresolvedCount-1]-[unresolved_semantic_proposition],
            [logicGrounding-manifestClaims-[]]-[missing_logic_claims],
            [logicGrounding-missingManifestClaims-[k]]-[logic_manifest_mismatch],
            [logicGrounding-extraManifestClaims-[k]]-[logic_manifest_mismatch],
            [logicGrounding-undeclaredGroundClaims-[k]]-[logic_manifest_mismatch],
            [logicGrounding-missingGroundClaims-[k]]-[missing_logic_grounding],
            [logicGrounding-duplicateGroundClaims-[k]]-[ambiguous_logic_grounding],
            [logicGrounding-claimTextMismatchClaims-[k]]-[ambiguous_logic_grounding],
            [logicGrounding-invalidGroundClaims-[k]]-[ambiguous_logic_grounding],
            [logicGrounding-invalidRuleFacts-[k]]-[ambiguous_logic_grounding],
            [contradictions-status-blocked]-[blocking_contradiction],
            [contradictions-status-unresolved]-[contradiction_check_incomplete],
            [scenarios-status-missing]-[missing_scenario],
            [scenarios-infeasibleScenarios-[s]]-[infeasible_scenario],
            [negativePath-status-missing]-[happy_path_only],
            [dimension-status-missing]-[dimension_unrepresented],
            [cases-status-missing]-[uncovered_case],
            [scenarioTests-status-missing]-[missing_scenario_test],
            [scenarioTests-status-missing, scenarios-status-blocked]-[missing_scenario_test],
            [scenarioTests-status-missing, scenarios-status-missing]-[missing_scenario],
            [passingE2e-status-missing]-[missing_passing_e2e],
            [passingE2e-missingReceiptTests-[t]]-[missing_proof_receipt],
            [passingE2e-staleReceiptTests-[t]]-[stale_proof_receipt],
            [passingE2e-failedReceiptTests-[t]]-[failed_proof_receipt],
            [passingE2e-invalidReceiptTests-[t]]-[invalid_proof_receipt],
            [passingE2e-contractMismatchReceiptTests-[t]]-[proof_contract_mismatch],
            [passingE2e-snapshotUnavailableTests-[t]]-[proof_snapshot_unavailable],
            [executableSymbols-status-missing]-[missing_executable_test_symbol],
            [productionSymbols-symbols-[]]-[missing_production_symbol],
            [productionSymbols-symbols-[], productionSymbols-structuralSymbols-[x]]-[],
            [productionSymbols-uncoveredSymbols-[s]]-[missing_production_symbol_coverage],
            [sourceCoordinates-missingSymbols-[s]]-[missing_symbol_coordinates],
            [sourceCoordinates-requirementSource-missing]-[missing_requirement_source]
        ]),
        (   rqp_gaps(Override, Gaps),
            (   Gaps == Expected
            ->  true
            ;   format(user_error, "~q gave ~q~n", [Override, Gaps]), fail
            )
        )).

test(unknown_feasibility_is_an_advisory) :-
    rqp_full_stages([scenarios-unknownFeasibility-[x]], Stages),
    once(requirement_proof:proof_issues(Stages, Gaps, Advisories)),
    Gaps == [],
    Advisories == [unknown_scenario_feasibility],
    rqp_full_stages([], Clean),
    del_dict(unknownFeasibility, Clean.scenarios, _, NoKey),
    put_dict(scenarios, Clean, NoKey, Stages2),
    once(requirement_proof:proof_issues(Stages2, [], [])).

test(gaps_come_in_definition_order) :-
    rqp_gaps([sourceCoordinates-requirementSource-missing, semanticInventory-propositionCount-0,
              passingE2e-status-missing], Gaps),
    Gaps == [missing_semantic_inventory, missing_passing_e2e, missing_requirement_source].

test(proof_status_precedence) :-
    rqp_full_stages([contradictions-status-blocked, scenarios-status-missing], S1),
    once(requirement_proof:proof_status(S1, P1)), P1 == unresolved,
    rqp_full_stages([scenarios-status-missing, passingE2e-status-unresolved], S2),
    once(requirement_proof:proof_status(S2, P2)), P2 == missing,
    rqp_full_stages([passingE2e-status-unresolved], S3),
    once(requirement_proof:proof_status(S3, P3)), P3 == unresolved,
    rqp_full_stages([negativePath-status-blocked], S4),
    once(requirement_proof:proof_status(S4, P4)), P4 == unresolved,
    first_answer_is_last(requirement_proof:proof_status(S1, _)),
    first_answer_is_last(requirement_proof:proof_status(S2, _)),
    first_answer_is_last(requirement_proof:proof_status(S3, _)).

test(proof_repairs_follow_the_gap_definitions) :-
    once(requirement_proof:proof_repairs([missing_scenario, stale_proof_receipt], Repairs)),
    same(Repairs, [
        _{gap: missing_scenario, priority: 50, stage: scenarios, action: "Add a specified_by scenario for the requirement."},
        _{gap: stale_proof_receipt, priority: 54, stage: passing_e2e,
          action: "Re-run kibi prove against the current code snapshot and append fresh receipts."}
    ]),
    findall(G-P-S, requirement_proof:gap_definition(G, P, S, _), Defs),
    length(Defs, 29),
    msort(Defs, Sorted), length(Sorted, 29).

test(receipt_completeness_issues) :-
    findall(I, requirement_proof:receipt_completeness_issue(I), Issues),
    Issues == [missing_proof_receipt, stale_proof_receipt, failed_proof_receipt,
               invalid_proof_receipt, proof_contract_mismatch].

test(stage_dict_enumerates_every_stage) :-
    findall(S, requirement_proof:stage_dict(_{a: 1, b: 2}, S), Stages),
    Stages == [1, 2].

:- end_tests(requirement_proof_gaps).

:- begin_tests(requirement_proof_intent).

rqp_origin(Dict, origin=Json) :-
    with_output_to(string(Json), json_write_dict(current_output, Dict, [width(0)])).

test(origin_field_reads_the_json_origin) :-
    rqp_origin(_{approved_by: "ann", kind: agent, ref: "https://x.test/a/b"}, Origin),
    once(requirement_proof:origin_field([Origin], approved_by, A)), A == ann,
    once(requirement_proof:origin_field([Origin], ref, R)), R == 'https://x.test/a/b',
    \+ requirement_proof:origin_field([Origin], missing, _),
    rqp_origin(_{approved_by: ""}, Empty),
    \+ requirement_proof:origin_field([Empty], approved_by, _),
    \+ requirement_proof:origin_field([origin="not json"], kind, _),
    \+ requirement_proof:origin_field([origin="[1]"], kind, _),
    \+ requirement_proof:origin_field([], kind, _).

test(effective_firmness_rules) :-
    once(requirement_proof:effective_firmness([firmness="exploratory"], F1)), F1 == exploratory,
    once(requirement_proof:effective_firmness([firmness=default], F2)), F2 == default,
    once(requirement_proof:effective_firmness([firmness=firm], F3)), F3 == firm,
    rqp_origin(_{kind: agent}, Agent),
    once(requirement_proof:effective_firmness([firmness=weird, Agent], F4)), F4 == default,
    rqp_origin(_{kind: human}, Human),
    once(requirement_proof:effective_firmness([Human], F5)), F5 == firm,
    once(requirement_proof:effective_firmness([], F6)), F6 == firm.

test(intent_ref_prefers_the_origin_ref) :-
    rqp_origin(_{ref: "doc#1"}, Origin),
    once(requirement_proof:intent_ref([Origin, approval_ref="other"], R1)), R1 == 'doc#1',
    once(requirement_proof:intent_ref([approval_ref="ticket-9"], R2)), R2 == 'ticket-9',
    once(requirement_proof:intent_ref([approval_ref=""], R3)), R3 == '',
    once(requirement_proof:intent_ref([], R4)), R4 == ''.

test(prop_text_needs_a_nonempty_value) :-
    once(requirement_proof:prop_text([k="v"], k, T)), T == v,
    \+ requirement_proof:prop_text([k=""], k, _),
    \+ requirement_proof:prop_text([], k, _).

test(human_intent_approved_or_firm) :-
    rqp_origin(_{approved_by: ann, kind: agent, ref: r1}, Approved),
    once(requirement_proof:human_intent([Approved], B1, R1)), [B1, R1] == [approved, r1],
    first_answer_is_last(requirement_proof:human_intent([Approved, firmness=firm], _, _)),
    once(requirement_proof:human_intent([firmness=firm, approval_ref="t"], B2, R2)), [B2, R2] == [firm, t],
    first_answer_is_last(requirement_proof:human_intent([firmness=firm], _, _)),
    rqp_origin(_{kind: agent}, Agent),
    \+ requirement_proof:human_intent([Agent], _, _),
    \+ requirement_proof:human_intent([firmness=exploratory], _, _).

test(intent_claim_level) :-
    once(requirement_proof:intent_claim_level([], L1)), L1 == asserted,
    once(requirement_proof:intent_claim_level([firmness=default], L2)), L2 == unverified.

:- end_tests(requirement_proof_intent).

:- begin_tests(requirement_proof_evidence_levels).

test(evidence_entries_and_level) :-
    once(requirement_proof:requirement_evidence([], tested, ['T'], ['T2'-smt, 'T1'-exhaustive, 'T1'-smt], L1, E1)),
    L1 == proved,
    same(E1, [
        _{kind: certificate, scope: code, level: proved, tests: ['T1', 'T2'], kinds: [exhaustive, smt]},
        _{kind: e2e, scope: code, level: tested, tests: ['T']},
        _{kind: human_intent, scope: intent, level: asserted, basis: firm}
    ]),
    once(requirement_proof:requirement_evidence([approval_ref="x"], tested, ['T'], [], L2, E2)),
    L2 == tested,
    same(E2, [_{kind: e2e, scope: code, level: tested, tests: ['T']},
              _{kind: human_intent, scope: intent, level: asserted, basis: firm, ref: x}]),
    once(requirement_proof:requirement_evidence([], missing, ['T'], ['T'-smt], L3, E3)),
    L3 == asserted,
    same(E3, [_{kind: human_intent, scope: intent, level: asserted, basis: firm}]),
    once(requirement_proof:requirement_evidence([firmness=default], missing, [], [], L4, E4)),
    L4 == unverified, E4 == [].

test(evidence_level_picks_the_strongest) :-
    once(requirement_proof:evidence_level([_{level: asserted}, _{level: tested}], L1)), L1 == tested,
    once(requirement_proof:evidence_level([_{level: proved}, _{level: asserted}], L2)), L2 == proved,
    once(requirement_proof:evidence_level([_{level: asserted}], L3)), L3 == asserted,
    once(requirement_proof:evidence_level([_{level: other}], L4)), L4 == unverified.

test(evidence_ranks) :-
    findall(L-R, requirement_proof:evidence_rank(L, R), Ranks),
    Ranks == [unverified-0, asserted-1, tested-2, proved-3].

test(required_evidence_sources) :-
    once(requirement_proof:required_evidence([required_evidence="proved"], R1, S1)), [R1, S1] == [proved, explicit],
    first_answer_is_last(requirement_proof:required_evidence([required_evidence="proved"], _, _)),
    once(requirement_proof:required_evidence([required_evidence="bogus"], R2, S2)), [R2, S2] == [tested, firmness],
    first_answer_is_last(requirement_proof:required_evidence([], _, _)),
    once(requirement_proof:required_evidence([firmness=exploratory], R3, S3)), [R3, S3] == [unverified, firmness].

test(evidence_floor_statuses) :-
    once(requirement_proof:evidence_floor([], tested, [], _{}, F1)),
    same(F1, _{required: tested, source: firmness, status: met}),
    once(requirement_proof:evidence_floor([], proved, [], _{}, F1b)),
    same(F1b, _{required: tested, source: firmness, status: met}),
    once(requirement_proof:evidence_floor([], asserted, [stale_proof_receipt], _{}, F2)),
    same(F2, _{required: tested, source: firmness, status: pending_reproof}),
    once(requirement_proof:evidence_floor([], asserted, [missing_scenario], _{}, F3)),
    same(F3, _{required: tested, source: firmness, status: below}),
    once(requirement_proof:evidence_floor([required_evidence=proved], tested, [stale_proof_receipt], _{}, F4)),
    same(F4, _{required: proved, source: explicit, status: below}).

test(freshness_gaps) :-
    findall(G, requirement_proof:freshness_gap(G), Gaps),
    Gaps == [stale_proof_receipt, proof_contract_mismatch].

rqp_fresh_stages(Overrides, Stages) :-
    Base = _{
        negativePath: _{status: passed, claims: [], pendingReproofClaims: []},
        dimension: _{status: not_required, claims: [], pendingReproofClaims: []},
        cases: _{status: passed, uncoveredCases: [], pendingReproofClaims: []},
        productionSymbols: _{uncoveredSymbols: [], explanations: []}
    },
    foldl(rqp_override, Overrides, Base, Stages).

test(freshness_only_gap_lists) :-
    rqp_fresh_stages([], S),
    requirement_proof:freshness_only_gaps([stale_proof_receipt], S),
    requirement_proof:freshness_only_gaps([proof_contract_mismatch, stale_proof_receipt], S),
    \+ requirement_proof:freshness_only_gaps([], S),
    \+ requirement_proof:freshness_only_gaps([stale_proof_receipt, missing_scenario], S),
    \+ requirement_proof:freshness_only_gaps([missing_production_symbol_coverage], S).

test(freshness_only_when_stages_wait_on_stale_certificates, [nondet]) :-
    rqp_fresh_stages([negativePath-status-missing, negativePath-claims-[k], negativePath-pendingReproofClaims-[k]], N),
    requirement_proof:freshness_only_gaps([happy_path_only], N),
    \+ requirement_proof:freshness_only_gaps([happy_path_only, missing_scenario], N),
    rqp_fresh_stages([dimension-status-missing, dimension-claims-[_{claimKey: k}], dimension-pendingReproofClaims-[k]], D),
    requirement_proof:freshness_only_gaps([dimension_unrepresented], D),
    \+ requirement_proof:freshness_only_gaps([happy_path_only], D),
    rqp_fresh_stages([cases-status-missing, cases-uncoveredCases-[_{claimKey: k}, _{claimKey: k}], cases-pendingReproofClaims-[k]], C),
    requirement_proof:freshness_only_gaps([uncovered_case], C),
    \+ requirement_proof:freshness_only_gaps([dimension_unrepresented], C).

test(negative_path_freshness_only_conditions) :-
    rqp_fresh_stages([negativePath-status-missing, negativePath-claims-[a, b], negativePath-pendingReproofClaims-[a]], S1),
    \+ requirement_proof:negative_path_freshness_only(S1),
    rqp_fresh_stages([negativePath-status-missing, negativePath-claims-[], negativePath-pendingReproofClaims-[]], S2),
    \+ requirement_proof:negative_path_freshness_only(S2),
    rqp_fresh_stages([negativePath-status-passed, negativePath-claims-[a], negativePath-pendingReproofClaims-[a]], S3),
    \+ requirement_proof:negative_path_freshness_only(S3),
    \+ requirement_proof:negative_path_freshness_only(_{}).

test(dimension_and_cases_freshness_only_conditions) :-
    rqp_fresh_stages([dimension-status-missing, dimension-claims-[], dimension-pendingReproofClaims-[]], D1),
    \+ requirement_proof:dimension_freshness_only(D1),
    rqp_fresh_stages([dimension-status-passed, dimension-claims-[_{claimKey: k}], dimension-pendingReproofClaims-[k]], D2),
    \+ requirement_proof:dimension_freshness_only(D2),
    rqp_fresh_stages([dimension-status-missing, dimension-claims-[_{claimKey: k}, _{claimKey: j}], dimension-pendingReproofClaims-[k]], D3),
    \+ requirement_proof:dimension_freshness_only(D3),
    \+ requirement_proof:dimension_freshness_only(_{}),
    rqp_fresh_stages([cases-status-missing, cases-uncoveredCases-[], cases-pendingReproofClaims-[]], C1),
    \+ requirement_proof:cases_freshness_only(C1),
    rqp_fresh_stages([cases-status-passed, cases-uncoveredCases-[_{claimKey: k}], cases-pendingReproofClaims-[k]], C2),
    \+ requirement_proof:cases_freshness_only(C2),
    rqp_fresh_stages([cases-status-missing, cases-uncoveredCases-[_{claimKey: k}, _{claimKey: j}], cases-pendingReproofClaims-[k]], C3),
    \+ requirement_proof:cases_freshness_only(C3),
    \+ requirement_proof:cases_freshness_only(_{}).

rqp_candidate(Qualifies, Scope, Reason, Secondaries,
              _{qualifies: Qualifies, scope: Scope, reason: Reason, secondaryReasons: Secondaries}).

test(production_coverage_freshness_only) :-
    rqp_candidate(false, end_to_end, stale_proof_receipt, [], Stale),
    rqp_candidate(false, end_to_end, missing_proof_receipt, [], Missing),
    rqp_fresh_stages([productionSymbols-uncoveredSymbols-[s1],
                      productionSymbols-explanations-[_{symbolId: s0, coverageCandidates: [Stale]},
                                                      _{symbolId: s1, coverageCandidates: [Missing, Stale]}]], P1),
    requirement_proof:freshness_only_gaps([stale_proof_receipt, missing_production_symbol_coverage], P1),
    requirement_proof:production_coverage_freshness_only(P1),
    rqp_fresh_stages([productionSymbols-uncoveredSymbols-[s1],
                      productionSymbols-explanations-[_{symbolId: s0, coverageCandidates: [Stale]},
                                                      _{symbolId: s1, coverageCandidates: [Missing]}]], P2),
    \+ requirement_proof:freshness_only_gaps([stale_proof_receipt, missing_production_symbol_coverage], P2),
    \+ requirement_proof:production_coverage_freshness_only(P2).

test(freshness_only_candidates) :-
    rqp_candidate(true, unit, x, [], Q),
    first_answer_is_last(requirement_proof:freshness_only_candidate(Q)),
    rqp_candidate(false, unit, structural_unit_receipt_not_current, [stale_proof_receipt, receipt_contract_mismatch], U1),
    first_answer_is_last(requirement_proof:freshness_only_candidate(U1)),
    rqp_candidate(false, unit, structural_unit_receipt_not_current, [], U2),
    \+ requirement_proof:freshness_only_candidate(U2),
    rqp_candidate(false, unit, structural_unit_receipt_not_current, [missing_proof_receipt], U3),
    \+ requirement_proof:freshness_only_candidate(U3),
    rqp_candidate(false, unit, other, [stale_proof_receipt], U4),
    \+ requirement_proof:freshness_only_candidate(U4),
    rqp_candidate(false, integration, structural_unit_receipt_not_current, [stale_proof_receipt], U5),
    \+ requirement_proof:freshness_only_candidate(U5),
    rqp_candidate(false, end_to_end, receipt_snapshot_mismatch, [receipt_contract_mismatch], E1),
    requirement_proof:freshness_only_candidate(E1),
    rqp_candidate(false, end_to_end, receipt_snapshot_mismatch, [missing_proof_receipt], E2),
    \+ requirement_proof:freshness_only_candidate(E2),
    rqp_candidate(false, end_to_end, test_scope_is_unit, [], E3),
    \+ requirement_proof:freshness_only_candidate(E3).

:- end_tests(requirement_proof_evidence_levels).

:- begin_tests(requirement_proof_inventory).

rqp_entry(Key, Status, Start, End,
          _{claim_key: Key, claim_text: "Users sign in", role: assertion, status: Status,
            span: _{start: Start, end: End}}).

test(inventory_stage_counts_each_status) :-
    rqp_entry("CLAIM-1", modeled, 0, 5, E1),
    rqp_entry("CLAIM-2", ambiguous, 0, 5, E2),
    rqp_entry("CLAIM-3", ontology_gap, 0, 5, E3),
    rqp_entry("CLAIM-4", nonlogical, 0, 5, E4),
    once(requirement_proof:semantic_inventory_stage([semantic_inventory=[E1, E2, E3, E4]], S1, Entries)),
    Entries == [E1, E2, E3, E4],
    same(S1, _{status: unresolved, propositionCount: 4, modeledCount: 1, unresolvedCount: 2,
               missingCount: 0, nonlogicalCount: 1, malformedCount: 0}),
    rqp_entry("CLAIM-5", missing, 0, 5, E5),
    once(requirement_proof:semantic_inventory_stage([semantic_inventory=[E1, E5]], S2, _)),
    same(S2, _{status: missing, propositionCount: 2, modeledCount: 1, unresolvedCount: 0,
               missingCount: 1, nonlogicalCount: 0, malformedCount: 0}),
    rqp_entry("CLAIM-6", modeled, 5, 5, E6),
    once(requirement_proof:semantic_inventory_stage([semantic_inventory=[E1, E6]], S3, _)),
    same(S3, _{status: missing, propositionCount: 2, modeledCount: 2, unresolvedCount: 0,
               missingCount: 0, nonlogicalCount: 0, malformedCount: 1}),
    once(requirement_proof:semantic_inventory_stage([semantic_inventory=[E1]], S4, _)),
    get_dict(status, S4, passed),
    once(requirement_proof:semantic_inventory_stage([semantic_inventory=[]], S5, E)),
    E == [],
    same(S5, _{status: missing, propositionCount: 0, modeledCount: 0, unresolvedCount: 0,
               missingCount: 0, nonlogicalCount: 0, malformedCount: 0}),
    once(requirement_proof:semantic_inventory_stage([], S6, _)),
    get_dict(status, S6, missing).

test(inventory_status_order) :-
    once(requirement_proof:semantic_inventory_status(1, 1, 1, A)), A == missing,
    once(requirement_proof:semantic_inventory_status(1, 0, 1, B)), B == missing,
    once(requirement_proof:semantic_inventory_status(1, 0, 0, C)), C == unresolved,
    once(requirement_proof:semantic_inventory_status(0, 0, 0, D)), D == passed,
    first_answer_is_last(requirement_proof:semantic_inventory_status(1, 1, 1, _)),
    first_answer_is_last(requirement_proof:semantic_inventory_status(1, 0, 1, _)),
    first_answer_is_last(requirement_proof:semantic_inventory_status(1, 0, 0, _)).

test(valid_inventory_entry_needs_every_field, [nondet]) :-
    rqp_entry("CLAIM-1", modeled, 0, 5, Good),
    requirement_proof:valid_inventory_entry(Good),
    forall(member(Key, [claim_key, claim_text, role, status, span]),
           (   del_dict(Key, Good, _, Without),
               \+ requirement_proof:valid_inventory_entry(Without)
           )),
    forall(member(Key-Value, [claim_key-"", claim_text-"", status-other, span-_{start: -1, end: 2},
                              span-_{start: 1}, span-_{end: 1}, span-_{start: x, end: 2}]),
           (   put_dict(Key, Good, Value, Bad),
               \+ requirement_proof:valid_inventory_entry(Bad)
           )),
    put_dict(span, Good, _{start: 0, end: 1}, Edge),
    requirement_proof:valid_inventory_entry(Edge),
    requirement_proof:valid_inventory_entry([claim_key="K", claim_text="T", role=r, status=missing,
                                             span=[start=2, end=3]]).

:- end_tests(requirement_proof_inventory).

:- begin_tests(requirement_proof_helper_tables).

test(applicability_exclusion_reasons) :-
    rqp_kb((
        pf_entity(req, 'REQ-OLD', [status=superseded]),
        pf_entity(req, 'REQ-NEW', [status=open]),
        pf_raw_rel(supersedes, 'REQ-NEW', 'REQ-OLD'),
        pf_entity(req, 'REQ-ACC', [status=accepted]),
        once(requirement_proof:applicability_exclusion_reason('REQ-OLD', R1)),
        R1 == "requirement is superseded by a newer requirement",
        first_answer_is_last(requirement_proof:applicability_exclusion_reason('REQ-OLD', _)),
        once(requirement_proof:applicability_exclusion_reason('REQ-ACC', R2)),
        R2 == 'status \'accepted\' is not a current requirement status',
        first_answer_is_last(requirement_proof:applicability_exclusion_reason('REQ-ACC', _)),
        once(requirement_proof:applicability_exclusion_reason('REQ-NONE', R3)),
        R3 == "requirement is not current"
    )).

rqp_schema_props(Extra, Props) :-
    Base = [fact_kind=rule_schema, rule_name="governed", argument_names=[a, b], argument_types=[int, string]],
    foldl(rqp_set_prop, Extra, Base, Props).

rqp_set_prop(Key=Value, Props0, [Key=Value|Props]) :-
    exclude(rqp_has_key(Key), Props0, Props).

rqp_has_key(Key, Key=_).

test(rule_schema_props_need_kind_name_and_matching_lists) :-
    rqp_schema_props([], Good),
    requirement_proof:valid_rule_schema_props(Good),
    forall(member(Extra, [[fact_kind=rule], [rule_name=""], [argument_types=[int]]]),
           (   rqp_schema_props(Extra, Bad),
               \+ requirement_proof:valid_rule_schema_props(Bad)
           )),
    forall(member(Key, [fact_kind, rule_name, argument_names, argument_types]),
           (   rqp_schema_props([], Props0),
               exclude(rqp_has_key(Key), Props0, Missing),
               \+ requirement_proof:valid_rule_schema_props(Missing)
           )).

test(valid_rule_fact_needs_a_safe_rule_and_its_schema) :-
    rqp_kb((
        pf_rule_pair(customer, customer),
        \+ requirement_proof:valid_rule_fact('FACT-RULE-ALLOW'),
        rqp_schema_props([], SchemaProps),
        pf_entity(fact, 'FACT-RULE-SCHEMA-TEST', SchemaProps),
        requirement_proof:valid_rule_fact('FACT-RULE-ALLOW'),
        \+ requirement_proof:valid_rule_fact('FACT-NONE'),
        pf_entity(fact, 'FACT-NO-SCHEMA', [fact_kind=rule, rule_ir="{}"]),
        \+ requirement_proof:valid_rule_fact('FACT-NO-SCHEMA')
    )).

test(contradiction_witnesses_for_a_requirement) :-
    once(requirement_proof:requirement_contradiction_witnesses('REQ-A',
        [_{requirements: ['REQ-A']}, _{requirements: ['REQ-B']}], Witnesses)),
    same(Witnesses, [_{requirements: ['REQ-A']}]).

test(rule_facts_named_by_safety_findings) :-
    requirement_proof:violation_for_entity([violation(c, "F-1", d, s, x)], 'F-1'),
    \+ requirement_proof:violation_for_entity([violation(c, "F-1", d, s, x)], 'F-2'),
    once(requirement_proof:invalid_rule_fact_ids(['F-1', 'F-2', 'F-3'],
        _{unsafeRules: [violation(c, 'F-3', d, s, x), violation(c, 'F-1', d, s, x)],
          unverifiableRules: [violation(c, 'F-1', d, s, x)]}, Invalid)),
    Invalid == ['F-1', 'F-3'].

test(unknown_feasibility_reason_table) :-
    findall(R-T, (member(R, [no_assumptions, contradictory_assumptions(x), unmatched_assumption(x),
                             incomparable_assumption(x), conflicting_requirements(x), undecided_rule(x),
                             undetermined_validity(x)]),
                  requirement_proof:unknown_feasibility_reason(R, T)), Pairs),
    pairs_values(Pairs, Texts),
    Texts == [no_assumptions, contradictory_assumptions, unmatched_assumption, incomparable_assumption,
              conflicting_requirements, undecided_rule, undetermined_validity],
    \+ requirement_proof:unknown_feasibility_reason(other(x), _).

test(claim_quantifiers) :-
    forall(member(Text-Expected, ["Send no more than five" - no_more_than, "keep at least two" - at_least,
                                  "keep at most two" - at_most, "Each user signs in" - each,
                                  "for every order" - every, "all of them" - all, "Exactly one." - exactly,
                                  "no more items, at least" - at_least]),
           (   once(requirement_proof:claim_quantifier(Text, Q)), Q == Expected )),
    \+ requirement_proof:claim_quantifier("one user signs in", _),
    first_answer_is_last(requirement_proof:quantifier_in(["no", "more", "than", "each"], _)),
    first_answer_is_last(requirement_proof:quantifier_in(["at", "least", "each"], _)),
    first_answer_is_last(requirement_proof:quantifier_in(["at", "most", "each"], _)),
    first_answer_is_last(requirement_proof:quantifier_in(["each", "all"], _)).

test(scenario_tests_must_exist) :-
    rqp_kb((
        pf_entity(scenario, 'SCN-1', []),
        pf_entity(test, 'TEST-1', []),
        pf_raw_rel(validates, 'TEST-1', 'SCN-1'),
        pf_raw_rel(validates, 'TEST-GONE', 'SCN-1'),
        findall(T, requirement_proof:scenario_test('SCN-1', T), Tests),
        Tests == ['TEST-1']
    )).

test(component_scope_predicates) :-
    findall(P, requirement_proof:component_scope_predicate(P), Ps),
    Ps == [ui_pattern, same_pattern, pattern_marker].

test(attempt_statuses) :-
    once(requirement_proof:valid_attempt_status(unavailable, _{status: unavailable})),
    once(requirement_proof:valid_attempt_status(unavailable, _{status: unavailable, entries: []})),
    \+ requirement_proof:valid_attempt_status(unavailable, _{entries: [_{outcome: passed}]}),
    first_answer_is_last(requirement_proof:valid_attempt_status(unavailable, _{})),
    forall(member(O, [passed, failed, timed_out, skipped, interrupted, errored]),
           once(requirement_proof:valid_attempt_status(complete, _{entries: [_{outcome: O}]}))),
    first_answer_is_last(requirement_proof:valid_attempt_status(complete, _{entries: [_{outcome: passed}]})),
    \+ requirement_proof:valid_attempt_status(complete, _{entries: [_{outcome: passed}, _{outcome: odd}]}),
    \+ requirement_proof:valid_attempt_status(complete, _{entries: [_{other: passed}]}),
    \+ requirement_proof:valid_attempt_status(complete, _{entries: []}),
    \+ requirement_proof:valid_attempt_status(complete, _{entries: x}),
    \+ requirement_proof:valid_attempt_status(complete, _{}),
    \+ requirement_proof:valid_attempt_status(other, _{entries: []}).

test(strictly_increasing_lists, [nondet]) :-
    requirement_proof:strictly_increasing([]),
    requirement_proof:strictly_increasing([1]),
    requirement_proof:strictly_increasing([1, 2, 5]),
    \+ requirement_proof:strictly_increasing([1, 1]),
    \+ requirement_proof:strictly_increasing([2, 1]).

test(contract_hash_values_and_contract_shapes) :-
    once(requirement_proof:current_contract_hash_value(none, N)), N == none,
    once(requirement_proof:current_contract_hash_value(hash(h), H)), H == h,
    Json = "{\"b\":1,\"a\":\"x\"}",
    once(requirement_proof:proof_contract_dict(Json, Plain)),
    forall(member(Wrapped, ['^^'(Json, t), literal(type(t, Json)), literal(Json)]),
           (   once(requirement_proof:proof_contract_dict(Wrapped, C)), same(C, Plain) )),
    first_answer_is_last(requirement_proof:proof_contract_dict('^^'(Json, t), _)),
    first_answer_is_last(requirement_proof:proof_contract_dict(literal(type(t, Json)), _)),
    first_answer_is_last(requirement_proof:proof_contract_dict(literal(Json), _)),
    once(requirement_proof:proof_contract_hash(literal(Json), H1)),
    once(requirement_proof:proof_contract_hash(Json, H2)),
    H1 == H2.

test(unit_receipt_secondaries) :-
    findall(S-R, (member(S, [missing, stale, contract_mismatch, failed, invalid, snapshot_unavailable, passed]),
                  once(requirement_proof:unit_receipt_secondary(S, R))), Pairs),
    Pairs == [missing-[missing_proof_receipt], stale-[stale_proof_receipt],
              contract_mismatch-[receipt_contract_mismatch], failed-[failed_proof_receipt],
              invalid-[invalid_proof_receipt], snapshot_unavailable-[proof_snapshot_unavailable], passed-[]],
    forall(member(S, [missing, stale, contract_mismatch, failed, invalid, snapshot_unavailable]),
           first_answer_is_last(requirement_proof:unit_receipt_secondary(S, _))).

test(scope_reject_reasons) :-
    rqp_kb((
        pf_entity(test, 'TEST-U', [verification_scope=unit]),
        pf_entity(test, 'TEST-E', [verification_scope=end_to_end]),
        once(requirement_proof:cheap_scope_reject_reason('TEST-U', R1)), R1 == test_scope_is_unit,
        once(requirement_proof:cheap_scope_reject_reason('TEST-E', R2)), R2 == none,
        once(requirement_proof:cheap_scope_reject_reason('TEST-NONE', R3)), R3 == test_scope_is_non_e2e,
        once(requirement_proof:cheap_candidate_scope('TEST-NONE', S)), S == unknown,
        first_answer_is_last(requirement_proof:cheap_candidate_scope('TEST-U', _)),
        first_answer_is_last(requirement_proof:scope_reject_reason(unit, _)),
        first_answer_is_last(requirement_proof:scope_reject_reason(end_to_end, _))
    )).

test(receipt_reject_without_a_context_or_evidence) :-
    once(requirement_proof:receipt_reject_for_in_chain([], _{}, 'TEST-X', P, S)),
    P == no_qualifying_e2e_coverage, S == [],
    once(requirement_proof:receipt_reject_for_in_chain([], none, 'TEST-X', P2, _)),
    P2 == no_qualifying_e2e_coverage.

test(receipt_state_reject_reasons) :-
    findall(S-R, (member(S, [missing, snapshot_unavailable, contract_mismatch, invalid, failed,
                             not_end_to_end, stale, passed, none, odd]),
                  once(requirement_proof:receipt_state_reject_reason(S, R))), Pairs),
    Pairs == [missing-missing_proof_receipt, snapshot_unavailable-proof_snapshot_unavailable,
              contract_mismatch-receipt_contract_mismatch, invalid-invalid_proof_receipt,
              failed-failed_proof_receipt, not_end_to_end-none, stale-receipt_snapshot_mismatch,
              passed-none, none-none, odd-none],
    forall(member(S, [missing, snapshot_unavailable, contract_mismatch, invalid, failed,
                      not_end_to_end, stale, passed, none]),
           first_answer_is_last(requirement_proof:receipt_state_reject_reason(S, _))),
    once(requirement_proof:receipt_item_reject_reason(_{state: stale, codeSnapshot: x}, I1)),
    I1 == stale_proof_receipt,
    once(requirement_proof:receipt_item_reject_reason(_{state: stale}, I2)),
    I2 == receipt_snapshot_mismatch,
    first_answer_is_last(requirement_proof:receipt_item_reject_reason(_{state: stale, codeSnapshot: x}, _)),
    first_answer_is_last(requirement_proof:receipt_item_reject_reason(_{state: stale}, _)),
    once(requirement_proof:receipt_item_reject_reason(_{state: failed}, I3)),
    I3 == failed_proof_receipt.

test(explanation_reason_texts) :-
    forall(member(R-T, [covered-"Qualifying covered_by to a passing scenario-backed E2E test",
                        covered_by_missing-"No covered_by relationship to any test",
                        structural_unit_contract-"type-shape symbol is satisfied by a unit structural contract",
                        structural_unit_receipt_not_current-"type-shape symbol needs a covered_by unit test with a current passing receipt; run kibi prove on that unit test",
                        executable_test-"Symbol is executable test code linked with executable_for",
                        stage_blocked_no_passing_e2e-"Production coverage cannot be evaluated because no passing E2E evidence is available for the current snapshot",
                        missing_test_entity-"covered_by target is not a test entity",
                        test_not_in_requirement_scenario_chain-"Test is not in this requirement's scenario chain",
                        test_scope_is_unit-"Test verification_scope is unit, which cannot cover behavioral production symbols",
                        test_scope_is_non_e2e-"Test verification_scope is not end_to_end",
                        proof_snapshot_unavailable-"Workspace snapshot is unavailable so receipt currency cannot be proven",
                        missing_proof_receipt-"Scenario-backed E2E test has no kibi.proof-receipt.v1",
                        receipt_snapshot_mismatch-"Receipts exist but none match the current snapshot or binding",
                        stale_proof_receipt-"Current-snapshot receipt is older than the allowed proof age",
                        receipt_contract_mismatch-"Receipt does not match the current proof contract hash or fingerprint",
                        invalid_proof_receipt-"Receipt evidence is malformed or otherwise uncheckable",
                        failed_proof_receipt-"Latest current receipt outcome is not passed"]),
           (   once(requirement_proof:explanation_reason_text(R, Text)), Text == T,
               first_answer_is_last(requirement_proof:explanation_reason_text(R, _))
           )),
    once(requirement_proof:explanation_reason_text(other_reason, O)), O == other_reason,
    \+ requirement_proof:explanation_reason_text("text", _).

test(requirement_source_path_fallback) :-
    once(requirement_proof:requirement_source_path([source="src/a.ts"], P1)), P1 == 'src/a.ts',
    once(requirement_proof:requirement_source_path([sourceFile="src/b.ts", source="src/a.ts"], P2)), P2 == 'src/b.ts',
    once(requirement_proof:requirement_source_path([], P3)), P3 == '',
    once(requirement_proof:requirement_source_path([source=""], P4)), P4 == '',
    first_answer_is_last(requirement_proof:requirement_source_path([source="src/a.ts"], _)).

:- end_tests(requirement_proof_helper_tables).

:- begin_tests(requirement_proof_context_and_scenarios).

test(context_reads_the_findings_and_the_check_time) :-
    rqp_kb((
        requirement_proof_context(abc, '2026-05-02T00:00:00Z', "60", per_contract, _{t: h}, C),
        get_dict(contradictions, C, Contradictions), Contradictions == [],
        get_dict(contradictionWitnesses, C, Witnesses), Witnesses == [],
        get_dict(unsafeRules, C, Unsafe), Unsafe == [],
        get_dict(unverifiableRules, C, Unverifiable), Unverifiable == [],
        get_dict(proofCheckedAtStamp, C, Stamp), Stamp =:= 1777680000.0,
        get_dict(proofMaxAgeSeconds, C, Age), Age == 60,
        get_dict(proofBindingMode, C, Mode), Mode == per_contract,
        requirement_proof_context(abc, 'not a time', 60, strict_snapshot, _{}, Bad),
        get_dict(proofCheckedAtStamp, Bad, BadStamp), BadStamp == -1,
        get_dict(proofCheckedAt, Bad, BadAt), BadAt == 'not a time'
    )).

test(scenario_stage_without_unknown_or_negative_scenarios) :-
    rqp_kb((
        pf_entity(req, 'REQ-S', [status=open]),
        pf_entity(scenario, 'SCN-F', [expects=failure]),
        pf_raw_rel(specified_by, 'REQ-S', 'SCN-F'),
        once(requirement_proof:scenario_stage('REQ-S', Stage, Ids)),
        Ids == ['SCN-F'],
        get_dict(unknownFeasibility, Stage, Unknown), Unknown == [],
        get_dict(negativeScenarios, Stage, Negative), Negative == [],
        get_dict(status, Stage, Status), Status == passed,
        pf_entity(scenario, 'SCN-S', [expects=success]),
        pf_raw_rel(specified_by, 'REQ-S', 'SCN-S'),
        once(requirement_proof:scenario_stage('REQ-S', Stage2, _)),
        get_dict(unknownFeasibility, Stage2, Unknown2),
        same(Unknown2, [_{scenario: 'SCN-S', reason: no_assumptions}]),
        get_dict(negativeScenarios, Stage2, Negative2), Negative2 == []
    )).

:- end_tests(requirement_proof_context_and_scenarios).
