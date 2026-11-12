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

%% rqp_forget_memo
% Empties requirement_proof's pure-function memo before each unit, so a unit
% never reads answers that an earlier load of the module computed.
rqp_forget_memo :-
    retractall(requirement_proof:pure_memo(_, _, _)),
    retractall(requirement_proof:pure_memo_size(_)).

%% rqp_kb(:Goal)
% Goal's first answer on a fresh, empty KB.
:- meta_predicate rqp_kb(0).
rqp_kb(Goal) :-
    with_fixture_kb(once(Goal)).

rqp_roundtrip(Term, Parsed) :-
    with_output_to(string(Json), json_write_dict(current_output, Term, [])),
    atom_json_dict(Json, Parsed, [value_string_as(atom)]).

%% rqp_hash(+Char, -Hash)
% A 64-character hash of Char.
rqp_hash(Char, Hash) :-
    length(Codes, 64), maplist(=(Char), Codes), atom_codes(Hash, Codes).

:- begin_tests(requirement_proof_normalizers, [setup(rqp_forget_memo)]).

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
    \+ requirement_proof:inventory_entry_field([a=1|tail], a, _),
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

test(memo_size_counts_each_remembered_answer) :-
    rqp_forget_memo,
    requirement_proof:pure_memo_remember(k1, kind, a),
    requirement_proof:pure_memo_remember(k2, kind, b),
    findall(Size, requirement_proof:pure_memo_size(Size), Sizes),
    Sizes == [2].

test(only_text_inventories_are_memoized) :-
    rqp_forget_memo,
    forall(member(Raw, ['[c]', "[d]", [x], f(x), 42]),
           once(requirement_proof:inventory_entries(Raw, _))),
    findall(Entries, requirement_proof:pure_memo(_, inventory_entries, Entries), Memo),
    Memo == [[c], [d]].

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

:- begin_tests(requirement_proof_gaps, [setup(rqp_forget_memo)]).

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

test(a_gap_with_several_causes_is_listed_once) :-
    rqp_gaps([logicGrounding-missingManifestClaims-[k], logicGrounding-extraManifestClaims-[k],
              logicGrounding-duplicateGroundClaims-[k], logicGrounding-invalidRuleFacts-[k]], Gaps),
    Gaps == [logic_manifest_mismatch, ambiguous_logic_grounding],
    rqp_full_stages([logicGrounding-missingManifestClaims-[k], logicGrounding-extraManifestClaims-[k],
                     scenarios-unknownFeasibility-[x]], Stages),
    findall(G-A, requirement_proof:proof_issues(Stages, G, A), Answers),
    Answers == [[logic_manifest_mismatch]-[unknown_scenario_feasibility]].

test(every_gap_has_repair_text) :-
    forall(requirement_proof:gap_definition(Gap, _, _, Repair),
           (   string(Repair), string_length(Repair, Len), Len > 20
           ->  true
           ;   format(user_error, "~q has repair ~q~n", [Gap, Repair]), fail
           )).

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

:- begin_tests(requirement_proof_intent, [setup(rqp_forget_memo)]).

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

:- begin_tests(requirement_proof_evidence_levels, [setup(rqp_forget_memo)]).

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

:- begin_tests(requirement_proof_inventory, [setup(rqp_forget_memo)]).

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

:- begin_tests(requirement_proof_helper_tables, [setup(rqp_forget_memo)]).

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
        \+ requirement_proof:valid_rule_fact('FACT-NO-SCHEMA'),
        % The same safe rule naming a schema that is missing, or a fact that
        % is not a rule schema.
        rqp_json(_{version: 'kibi.logic.v1', kind: rule, modality: oblige,
                   head: _{kind: atom, name: governed_action, args: []},
                   body: _{kind: atom, name: customer, args: []}, variables: []}, Rule),
        forall(member(Id-SchemaId, ['FACT-RULE-OK'-"FACT-RULE-SCHEMA-TEST", 'FACT-RULE-GONE'-"FACT-SCHEMA-GONE",
                                    'FACT-RULE-NOTSCHEMA'-"FACT-NOT-SCHEMA"]),
               pf_entity(fact, Id, [fact_kind=rule, rule_ir=Rule, rule_schema_id=SchemaId])),
        pf_entity(fact, 'FACT-NOT-SCHEMA', [fact_kind=subject, subject_key="x"]),
        requirement_proof:valid_rule_fact('FACT-RULE-OK'),
        \+ requirement_proof:valid_rule_fact('FACT-RULE-GONE'),
        \+ requirement_proof:valid_rule_fact('FACT-RULE-NOTSCHEMA')
    )).

test(contradiction_witnesses_for_a_requirement) :-
    once(requirement_proof:requirement_contradiction_witnesses('REQ-A',
        [_{requirements: ['REQ-A']}, _{requirements: ['REQ-B']}], Witnesses)),
    same(Witnesses, [_{requirements: ['REQ-A']}]).

test(rule_facts_named_by_safety_findings) :-
    requirement_proof:violation_for_entity([violation(c, "F-1", d, s, x)], 'F-1'),
    \+ requirement_proof:violation_for_entity([violation(c, "F-1", d, s, x)], 'F-2'),
    once(requirement_proof:invalid_rule_fact_ids(['F-1', 'F-2', 'F-3'],
        _{unsafeRules: [violation(c, 'F-3', d, s, x), violation(c, 'F-1', d, s, x), violation(c, 'F-9', d, s, x)],
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
        pf_entity(test, 'TEST-UNLINKED', []),
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
                        receipt_snapshot_mismatch-"Receipts exist but none match the current snapshot, binding or execution fingerprint",
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

:- begin_tests(requirement_proof_context_and_scenarios, [setup(rqp_forget_memo)]).

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

:- begin_tests(requirement_proof_certified_claims, [setup(rqp_forget_memo)]).

%% rqp_contract_test(+TestId, +Contract, +Snapshot)
% A unit test with Contract and one passed receipt on Snapshot that matches
% the contract.
rqp_contract_test(TestId, Contract, Snapshot) :-
    with_output_to(string(ContractJson), json_write_dict(current_output, Contract, [width(0)])),
    once(requirement_proof:proof_contract_hash(ContractJson, ContractHash)),
    pf_receipt([test_id=TestId, scope=unit, code_snapshot=Snapshot, contract_hash=ContractHash], Receipt),
    pf_receipts_json([Receipt], ReceiptsJson),
    pf_entity(test, TestId, [status=passing, verification_scope=unit, proof_contract=ContractJson,
                             proof_receipts=ReceiptsJson]).

rqp_certified_context(Context) :-
    rqp_hash(0'e, Current), rqp_hash(0'f, Old),
    rqp_contract_test('T-STALE', _{kind: "exhaustive", proves: ["K1", "K3"]}, Old),
    rqp_contract_test('T-OK', _{kind: "exhaustive", proves: ["K2"]}, Current),
    rqp_contract_test('T-NOPROVES', _{kind: "exhaustive", proves: "K1"}, Old),
    requirement_proof_context(Current, '2026-05-02T00:00:00Z', 100000000, strict_snapshot, _{}, Context).

test(pending_certified_claims_are_open_claims_of_stale_certificates) :-
    rqp_kb((
        rqp_certified_context(Context),
        once(requirement_proof:pending_certified_claim_keys(_{tests: ['T-STALE', 'T-OK', 'T-NOPROVES', 'T-NONE']},
                                                            Context, ['K1', 'K2'], Keys)),
        Keys == ['K1'],
        once(requirement_proof:pending_certified_claim_keys(_{tests: ['T-STALE', 'T-STALE']}, Context,
                                                            ['K3', 'K1'], Both)),
        Both == ['K1', 'K3'],
        once(requirement_proof:pending_certified_claim_keys(_{}, Context, ['K1'], None)),
        None == []
    )).

:- end_tests(requirement_proof_certified_claims).

rqp_ground_fixture :-
    pf_entity(fact, 'F-SUBJ', [fact_kind=subject, subject_key="api.quota"]),
    pf_entity(fact, 'F-P', [fact_kind=property_value, subject_key="api.quota", property_key="rate",
        operator=eq, value_type=int, value_int=10, claim_key="K-P", claim_text="Quota is ten."]),
    pf_entity(fact, 'F-D', [fact_kind=predicate, predicate_name="has_role", predicate_args=["alice", "admin"],
        claim_key="K-D", claim_text="Alice  is admin"]),
    with_output_to(string(Rule), json_write_dict(current_output,
        _{version: 'kibi.logic.v1', kind: rule, modality: oblige,
          head: _{kind: atom, name: act, args: []}, body: _{kind: atom, name: customer, args: []},
          variables: []}, [width(0)])),
    pf_entity(fact, 'F-R', [fact_kind=rule, rule_ir=Rule, rule_schema_id="F-SCHEMA", claim_key="K-R",
        claim_text="Customers act"]),
    pf_entity(fact, 'F-SCHEMA', [fact_kind=rule_schema, rule_name="act", argument_names=[], argument_types=[]]),
    Inventory = [_{claim_key: "K-P", claim_text: "Quota is ten", role: a, status: modeled, span: _{start: 0, end: 1}},
                 _{claim_key: "K-D", claim_text: "Alice is admin", role: a, status: modeled, span: _{start: 0, end: 1}},
                 _{claim_key: "K-R", claim_text: "Customers act", role: a, status: modeled, span: _{start: 0, end: 1}},
                 _{claim_key: "K-N", claim_text: "Nice", role: a, status: nonlogical, span: _{start: 0, end: 1}}],
    with_output_to(string(InvJson), json_write_dict(current_output, Inventory, [width(0)])),
    pf_entity(req, 'REQ-G', [status=open, logic_claims=["K-P", "K-D", "K-R"], semantic_inventory=InvJson]),
    pf_raw_rel(constrains, 'REQ-G', 'F-SUBJ'),
    pf_raw_rel(requires_property, 'REQ-G', 'F-P'),
    pf_raw_rel(requires_predicate, 'REQ-G', 'F-D'),
    pf_raw_rel(requires_rule, 'REQ-G', 'F-R').

rqp_ground_stage(Context, Stage) :-
    kb_entity('REQ-G', req, Props),
    once(requirement_proof:semantic_inventory_stage(Props, _, Inventory)),
    once(requirement_proof:logic_grounding_stage('REQ-G', Props, Inventory, Context, Stage)).

rqp_no_findings(_{unsafeRules: [], unverifiableRules: []}).

rqp_ground_fields(Stage, Keys, Pairs) :-
    findall(Key-Value, (member(Key, Keys), get_dict(Key, Stage, Value)), Pairs).

:- begin_tests(requirement_proof_logic_grounding, [setup(rqp_forget_memo)]).

test(every_lane_grounds_its_claim) :-
    rqp_kb((
        rqp_ground_fixture,
        rqp_no_findings(C),
        rqp_ground_stage(C, Stage),
        Path = 'test://proof_fixture.pl',
        same(Stage, _{
            status: passed,
            manifestClaims: ['K-D', 'K-P', 'K-R'], inventoryClaims: ['K-D', 'K-P', 'K-R'],
            modeledClaims: ['K-D', 'K-P', 'K-R'], groundedClaims: ['K-D', 'K-P', 'K-R'],
            evidence: [_{claimKey: 'K-R', claimText: 'Customers act', factId: 'F-R', lane: rule},
                       _{claimKey: 'K-D', claimText: 'Alice  is admin', factId: 'F-D', lane: predicate},
                       _{claimKey: 'K-P', claimText: 'Quota is ten.', factId: 'F-P', lane: property}],
            missingGroundClaims: [], duplicateGroundClaims: [], claimTextMismatchClaims: [],
            invalidGroundClaims: [], missingManifestClaims: [], extraManifestClaims: [],
            undeclaredGroundClaims: [], invalidRuleFacts: [],
            sources: [_{id: 'F-P', path: Path}, _{id: 'F-D', path: Path}, _{id: 'F-R', path: Path}]})
    )).

test(broken_lanes_are_reported) :-
    rqp_kb((
        rqp_ground_fixture,
        % A second fact for K-P, a predicate text that names another sentence,
        % a rule whose schema is gone, and a linked claim outside the manifest.
        pf_entity(fact, 'F-P2', [fact_kind=property_value, subject_key="api.quota", property_key="rate",
            operator=eq, value_type=int, value_int=11, claim_key="K-P", claim_text="Quota is ten"]),
        pf_raw_rel(requires_property, 'REQ-G', 'F-P2'),
        pf_entity(fact, 'F-D', [fact_kind=predicate, predicate_name="has_role", predicate_args=["bob", "admin"],
            claim_key="K-D", claim_text="Bob is admin"]),
        pf_entity(fact, 'F-R', [fact_kind=rule, rule_ir="{}", rule_schema_id="F-SCHEMA", claim_key="K-R",
            claim_text="Customers act"]),
        pf_entity(fact, 'F-X', [fact_kind=predicate, predicate_name="has_role", predicate_args=["x", "y"],
            claim_key="K-X", claim_text="Extra"]),
        pf_raw_rel(requires_predicate, 'REQ-G', 'F-X'),
        pf_entity(fact, 'F-Q', [fact_kind=property_value, subject_key="other.subject", property_key="rate",
            operator=eq, value_type=int, value_int=1, claim_key="K-Q", claim_text="Other"]),
        pf_raw_rel(requires_property, 'REQ-G', 'F-Q'),
        rqp_no_findings(C),
        rqp_ground_stage(C, Stage),
        rqp_ground_fields(Stage, [status, groundedClaims, missingGroundClaims, duplicateGroundClaims,
                                  claimTextMismatchClaims, invalidGroundClaims, undeclaredGroundClaims], Pairs),
        Pairs == [status-missing, groundedClaims-['K-D', 'K-P', 'K-X'], missingGroundClaims-['K-R'],
                  duplicateGroundClaims-['K-P'], claimTextMismatchClaims-['K-D'],
                  invalidGroundClaims-['K-Q', 'K-R'], undeclaredGroundClaims-['K-Q', 'K-X']]
    )).

test(safety_findings_mark_rule_facts_invalid) :-
    rqp_kb((
        rqp_ground_fixture,
        rqp_ground_stage(_{unsafeRules: [violation(r, 'F-R', d, s, x)], unverifiableRules: []}, S1),
        get_dict(invalidRuleFacts, S1, I1), I1 == ['F-R'],
        get_dict(status, S1, St1), St1 == unresolved,
        rqp_ground_stage(_{unsafeRules: [], unverifiableRules: [violation(r, 'F-R', d, s, x)]}, S2),
        get_dict(invalidRuleFacts, S2, I2), I2 == ['F-R']
    )).

test(manifest_and_inventory_differences) :-
    rqp_kb((
        rqp_ground_fixture,
        rqp_no_findings(C),
        Props = [logic_claims=["K-P", "K-D", "K-Z"]],
        once(requirement_proof:logic_grounding_stage('REQ-G', Props, [], C, S)),
        rqp_ground_fields(S, [status, manifestClaims, extraManifestClaims, missingManifestClaims,
                              undeclaredGroundClaims], Pairs),
        Pairs == [status-unresolved, manifestClaims-['K-D', 'K-P', 'K-Z'], extraManifestClaims-['K-D', 'K-P', 'K-Z'],
                  missingManifestClaims-[], undeclaredGroundClaims-['K-R']],
        once(requirement_proof:logic_grounding_stage('REQ-G', [], [], C, S0)),
        get_dict(status, S0, St0), St0 == missing,
        get_dict(manifestClaims, S0, M0), M0 == []
    )).

test(grounding_status_order) :-
    once(requirement_proof:logic_grounding_status(false, [k], [], [], [], [], [], [], [], A)), A == missing,
    first_answer_is_last(requirement_proof:logic_grounding_status(false, [], [], [], [], [], [], [], [], _)),
    once(requirement_proof:logic_grounding_status(true, [k], [], [k], [], [], [], [], [], B)), B == missing,
    once(requirement_proof:logic_grounding_status(true, [], [k], [], [], [], [], [], [], B2)), B2 == missing,
    first_answer_is_last(requirement_proof:logic_grounding_status(true, [k], [k], [], [], [], [], [], [], _)),
    forall(member(Args, [[[k], [], [], [], [], []], [[], [k], [], [], [], []], [[], [], [k], [], [], []],
                         [[], [], [], [k], [], []], [[], [], [], [], [k], []], [[], [], [], [], [], [k]]]),
           (   Args = [E, D, T, I, U, R],
               once(requirement_proof:logic_grounding_status(true, [], [], E, D, T, I, U, R, S)), S == unresolved,
               first_answer_is_last(requirement_proof:logic_grounding_status(true, [], [], E, D, T, I, U, R, _))
           )),
    once(requirement_proof:logic_grounding_status(true, [], [], [], [], [], [], [], [], P)), P == passed.

test(claim_key_and_text_helpers) :-
    once(requirement_proof:requirement_claim_keys([logic_claims=["b", "a", "b"]], P1, K1)), P1 == true, K1 == [a, b],
    first_answer_is_last(requirement_proof:requirement_claim_keys([logic_claims=["a"]], _, _)),
    once(requirement_proof:requirement_claim_keys([logic_claims=[]], P2, K2)), P2 == false, K2 == [],
    once(requirement_proof:requirement_claim_keys([], P3, _)), P3 == false,
    Entries = [_{claim_key: "K2", status: modeled}, _{claim_key: "K1", status: ambiguous},
               _{claim_key: "K3", status: nonlogical}, _{status: modeled}],
    once(requirement_proof:inventory_assertive_keys(Entries, A)), A == ['K1', 'K2'],
    once(requirement_proof:inventory_modeled_keys(Entries, M)), M == ['K2'],
    requirement_proof:claim_texts_equivalent('Users  sign in.', 'Users sign in'),
    requirement_proof:claim_texts_equivalent('Users sign in !? ', 'Users sign in'),
    \+ requirement_proof:claim_texts_equivalent('Users sign in', 'Users sign out'),
    once(requirement_proof:canonical_claim_text('a b;', C)), C == 'a b',
    once(requirement_proof:missing_keys([a, b, c], [b], Missing)), Missing == [a, c].

:- end_tests(requirement_proof_logic_grounding).

:- begin_tests(requirement_proof_contradiction_stage, [setup(rqp_forget_memo)]).

rqp_witness_context(Witnesses, _{contradictionWitnesses: Witnesses}).

test(contradiction_stage_outcomes) :-
    W1 = _{requirements: ['REQ-A', 'REQ-B'], status: unresolved},
    W2 = _{requirements: ['REQ-C', 'REQ-A'], status: contradiction},
    W3 = _{requirements: ['REQ-C', 'REQ-D'], status: contradiction},
    rqp_witness_context([W1, W2, W3], C1),
    once(requirement_proof:contradiction_stage('REQ-A', passed, C1, S1)),
    same(S1, _{status: blocked, outcome: conflict_found, conflicts: [W1, W2]}),
    first_answer_is_last(requirement_proof:contradiction_stage('REQ-A', passed, C1, _)),
    rqp_witness_context([W1, W3], C2),
    once(requirement_proof:contradiction_stage('REQ-A', passed, C2, S2)),
    same(S2, _{status: unresolved, outcome: analysis_incomplete, conflicts: [W1]}),
    first_answer_is_last(requirement_proof:contradiction_stage('REQ-A', passed, C2, _)),
    rqp_witness_context([W3], C3),
    once(requirement_proof:contradiction_stage('REQ-A', missing, C3, S3)),
    same(S3, _{status: unresolved, outcome: incomplete_grounding, conflicts: []}),
    first_answer_is_last(requirement_proof:contradiction_stage('REQ-A', missing, C3, _)),
    once(requirement_proof:contradiction_stage('REQ-A', passed, C3, S4)),
    same(S4, _{status: passed, outcome: no_conflict_found, conflicts: []}).

test(unmodeled_propositions_make_no_conflict_incomplete) :-
    rqp_witness_context([], C),
    once(requirement_proof:contradiction_stage('REQ-A', passed, unresolved, C, S1)),
    same(S1, _{status: unresolved, outcome: analysis_incomplete, conflicts: [], reason: "unresolved_propositions"}),
    once(requirement_proof:contradiction_stage('REQ-A', passed, passed, C, S2)),
    same(S2, _{status: passed, outcome: no_conflict_found, conflicts: []}),
    W = _{requirements: ['REQ-A'], status: contradiction},
    rqp_witness_context([W], C2),
    once(requirement_proof:contradiction_stage('REQ-A', passed, unresolved, C2, S3)),
    get_dict(outcome, S3, O3), O3 == conflict_found.

:- end_tests(requirement_proof_contradiction_stage).

:- begin_tests(requirement_proof_negative_path, [setup(rqp_forget_memo)]).

rqp_negative_stage(ScenarioStage, Stage) :-
    requirement_proof_context(abc, '2026-05-02T00:00:00Z', 100, Context),
    once(requirement_proof:negative_path_stage('REQ-G', ScenarioStage, _{}, Context, Stage)).

rqp_suggestion(Key-FactId-Assumption, _{claimKey: Key, factId: FactId, assumption: Assumption, expects: rejection}).

test(missing_failure_side_suggests_opposing_assumptions) :-
    rqp_kb((
        plunit_requirement_proof_logic_grounding:rqp_ground_fixture,
        pf_entity(fact, 'F-NOKEY', [fact_kind=predicate, predicate_name="p", predicate_args=["a"]]),
        pf_raw_rel(requires_predicate, 'REQ-G', 'F-NOKEY'),
        rqp_negative_stage(_{}, Stage),
        maplist(rqp_suggestion, [
            'F-NOKEY'-'F-NOKEY'-_{fact_kind: predicate, polarity: deny, predicate_args: [a], predicate_name: p,
                                  predicate_namespace: default},
            'K-D'-'F-D'-_{fact_kind: predicate, polarity: deny, predicate_args: [alice, admin],
                          predicate_name: has_role, predicate_namespace: default},
            'K-P'-'F-P'-_{fact_kind: property_value, operator: neq, property_key: rate, subject_key: 'api.quota',
                          value: 10, value_type: int},
            'K-R'-'F-R'-_{fact_kind: predicate, polarity: assert, predicate_args: [], predicate_name: act,
                          predicate_namespace: default}], Suggestions),
        same(Stage, _{status: missing, claims: ['F-NOKEY', 'K-D', 'K-P', 'K-R'], certifiedClaims: [],
                      negativeScenarios: [], suggestedNegatives: Suggestions, pendingReproofClaims: [],
                      waiver: _{}})
    )).

test(negative_scenarios_waivers_and_no_claims) :-
    rqp_kb((
        plunit_requirement_proof_logic_grounding:rqp_ground_fixture,
        rqp_negative_stage(_{negativeScenarios: ['SCN-N']}, Passed),
        get_dict(status, Passed, S1), S1 == passed,
        get_dict(suggestedNegatives, Passed, G1), G1 == [],
        get_dict(negativeScenarios, Passed, N1), N1 == ['SCN-N'],
        requirement_proof_context(abc, '2026-05-02T00:00:00Z', 100, Context),
        pf_entity(req, 'REQ-W1', [status=open, failure_side_waiver="No input to refuse"]),
        pf_raw_rel(requires_property, 'REQ-W1', 'F-P'),
        once(requirement_proof:negative_path_stage('REQ-W1', _{}, _{}, Context, Pending)),
        get_dict(status, Pending, S2), S2 == missing,
        get_dict(waiver, Pending, W2), same(W2, _{reason: "No input to refuse"}),
        pf_entity(req, 'REQ-W2', [status=open, failure_side_waiver="No input to refuse",
                                  failure_side_waiver_approved_by="ann"]),
        pf_raw_rel(requires_property, 'REQ-W2', 'F-P'),
        once(requirement_proof:negative_path_stage('REQ-W2', _{}, _{}, Context, Waived)),
        get_dict(status, Waived, S3), S3 == waived,
        get_dict(waiver, Waived, W3), same(W3, _{reason: "No input to refuse", approvedBy: "ann"}),
        get_dict(suggestedNegatives, Waived, G3), G3 == [],
        pf_entity(req, 'REQ-EMPTY', [status=open]),
        once(requirement_proof:negative_path_stage('REQ-EMPTY', _{negativeScenarios: []}, _{}, Context, Empty)),
        get_dict(status, Empty, S4), S4 == not_required
    )).

test(failure_side_waiver_fields) :-
    rqp_kb((
        pf_entity(req, 'R-1', [failure_side_waiver="", failure_side_waiver_approved_by="ann"]),
        pf_entity(req, 'R-2', [failure_side_waiver="why", failure_side_waiver_approved_by=""]),
        once(requirement_proof:failure_side_waiver('R-1', W1)), same(W1, _{}),
        once(requirement_proof:failure_side_waiver('R-2', W2)), same(W2, _{reason: "why"}),
        once(requirement_proof:failure_side_waiver('R-NONE', W3)), same(W3, _{})
    )).

test(negative_path_links_and_claim_keys) :-
    findall(L, requirement_proof:negative_path_link(L), Links),
    Links == [requires_property, requires_predicate, requires_rule],
    rqp_kb((
        pf_entity(fact, 'F-K', [claim_key="K-1"]),
        pf_entity(fact, 'F-E', [claim_key=""]),
        once(requirement_proof:fact_claim_key_or_id('F-K', K1)), K1 == 'K-1',
        once(requirement_proof:fact_claim_key_or_id('F-E', K2)), K2 == 'F-E',
        once(requirement_proof:fact_claim_key_or_id('F-NONE', K3)), K3 == 'F-NONE'
    )).

:- end_tests(requirement_proof_negative_path).

:- begin_tests(requirement_proof_scenario_obligations, [setup(rqp_forget_memo)]).

rqp_items(States, Items) :-
    findall(_{testId: T, state: S}, (nth1(N, States, S), format(atom(T), 'T-~w', [N])), Items).

test(obligation_gaps_per_receipt_state) :-
    once(requirement_proof:scenario_obligation_gaps(_{status: missing}, [], G1)), G1 == [missing_scenario_test],
    rqp_items([missing], OneMissing),
    once(requirement_proof:scenario_obligation_gaps(_{status: missing}, OneMissing, G1b)),
    G1b == [missing_proof_receipt, missing_scenario_test],
    once(requirement_proof:scenario_obligation_gaps(_{status: passed}, [], G2)), G2 == [missing_passing_e2e],
    once(requirement_proof:scenario_obligation_gaps(_{status: blocked}, [], G3)), G3 == [],
    rqp_items([snapshot_unavailable, contract_mismatch, invalid, failed, stale, missing, passed, stale], Items),
    once(requirement_proof:scenario_obligation_gaps(_{status: passed}, Items, G4)),
    G4 == [failed_proof_receipt, invalid_proof_receipt, missing_proof_receipt, proof_contract_mismatch,
           proof_snapshot_unavailable, stale_proof_receipt],
    rqp_items([passed], Passed),
    once(requirement_proof:scenario_obligation_gaps(_{status: passed}, Passed, G5)), G5 == [].

test(obligation_status) :-
    rqp_items([passed, passed], Passed),
    rqp_items([passed, stale], Mixed),
    once(requirement_proof:scenario_obligation_status(_{status: missing}, Passed, S1)), S1 == missing,
    first_answer_is_last(requirement_proof:scenario_obligation_status(_{status: missing}, Passed, _)),
    once(requirement_proof:scenario_obligation_status(_{status: passed}, [], S2)), S2 == missing,
    first_answer_is_last(requirement_proof:scenario_obligation_status(_{status: passed}, [], _)),
    once(requirement_proof:scenario_obligation_status(_{status: passed}, Passed, S3)), S3 == passed,
    first_answer_is_last(requirement_proof:scenario_obligation_status(_{status: passed}, Passed, _)),
    once(requirement_proof:scenario_obligation_status(_{status: passed}, Mixed, S4)), S4 == unresolved.

test(passing_e2e_status) :-
    once(requirement_proof:passing_e2e_status([], S1)), S1 == missing,
    first_answer_is_last(requirement_proof:passing_e2e_status([], _)),
    once(requirement_proof:passing_e2e_status([_{status: passed}], S2)), S2 == passed,
    first_answer_is_last(requirement_proof:passing_e2e_status([_{status: passed}], _)),
    once(requirement_proof:passing_e2e_status([_{status: passed}, _{status: missing}], S3)), S3 == missing,
    first_answer_is_last(requirement_proof:passing_e2e_status([_{status: unresolved}, _{status: missing}], _)),
    once(requirement_proof:passing_e2e_status([_{status: passed}, _{status: unresolved}], S4)), S4 == unresolved.

test(evidence_by_state_and_first_evidence) :-
    Items = [_{testId: b, state: passed}, _{testId: a, state: passed}, _{testId: c, state: stale},
             _{testId: a, state: passed}],
    once(requirement_proof:evidence_tests_with_state(Items, passed, P)), P == [a, b],
    Mixed = [_{testId: t, state: not_end_to_end, n: 1}, _{testId: t, state: passed, n: 2},
             _{testId: u, state: not_end_to_end, n: 3}],
    once(requirement_proof:first_evidence_for_test(Mixed, t, I1)), get_dict(n, I1, N1), N1 == 2,
    first_answer_is_last(requirement_proof:first_evidence_for_test(Mixed, t, _)),
    once(requirement_proof:first_evidence_for_test(Mixed, u, I2)), get_dict(n, I2, N2), N2 == 3,
    first_answer_is_last(requirement_proof:first_evidence_for_test(Mixed, u, _)),
    once(requirement_proof:unique_evidence_by_test(Mixed, U)),
    findall(N, (member(I, U), get_dict(n, I, N)), Ns), Ns == [2, 3].

test(component_scope_scenarios_accept_unit_evidence) :-
    rqp_kb((
        pf_entity(fact, 'F-UI', [fact_kind=predicate, predicate_name="ui_pattern", predicate_args=["card"]]),
        pf_entity(fact, 'F-MARK', [fact_kind=predicate, predicate_name="pattern_marker", predicate_args=["card"]]),
        pf_entity(fact, 'F-LAYOUT', [fact_kind=predicate, predicate_name="ui_container", predicate_args=["card"]]),
        pf_entity(fact, 'F-SUBJ', [fact_kind=subject, subject_key="x"]),
        pf_entity(req, 'REQ-UI', [status=open]),
        pf_raw_rel(requires_predicate, 'REQ-UI', 'F-UI'),
        pf_raw_rel(requires_predicate, 'REQ-UI', 'F-MARK'),
        pf_entity(scenario, 'SCN-UI', []),
        pf_raw_rel(specified_by, 'REQ-UI', 'SCN-UI'),
        once(requirement_proof:scenario_accepted_scopes('SCN-UI', S1)), S1 == [unit, integration, end_to_end],
        first_answer_is_last(requirement_proof:scenario_accepted_scopes('SCN-UI', _)),
        pf_entity(scenario, 'SCN-NONE', []),
        once(requirement_proof:scenario_accepted_scopes('SCN-NONE', S2)), S2 == [end_to_end],
        pf_entity(req, 'REQ-LAYOUT', [status=open]),
        pf_raw_rel(requires_predicate, 'REQ-LAYOUT', 'F-LAYOUT'),
        \+ requirement_proof:component_scope_requirement('REQ-LAYOUT'),
        pf_entity(req, 'REQ-EMPTY', [status=open]),
        \+ requirement_proof:component_scope_requirement('REQ-EMPTY'),
        pf_entity(req, 'REQ-PROP', [status=open]),
        pf_raw_rel(requires_predicate, 'REQ-PROP', 'F-UI'),
        requirement_proof:component_scope_requirement('REQ-PROP'),
        pf_raw_rel(requires_property, 'REQ-PROP', 'F-SUBJ'),
        \+ requirement_proof:component_scope_requirement('REQ-PROP'),
        pf_entity(req, 'REQ-RULE', [status=open]),
        pf_raw_rel(requires_predicate, 'REQ-RULE', 'F-UI'),
        pf_raw_rel(requires_rule, 'REQ-RULE', 'F-SUBJ'),
        \+ requirement_proof:component_scope_requirement('REQ-RULE'),
        pf_raw_rel(specified_by, 'REQ-LAYOUT', 'SCN-UI'),
        once(requirement_proof:scenario_accepted_scopes('SCN-UI', S3)), S3 == [end_to_end]
    )).

test(evidence_kinds) :-
    requirement_proof:e2e_evidence(_{state: passed}),
    \+ requirement_proof:e2e_evidence(_{state: not_end_to_end}),
    requirement_proof:non_e2e_evidence(_{state: not_end_to_end}),
    \+ requirement_proof:non_e2e_evidence(_{state: passed}).

:- end_tests(requirement_proof_scenario_obligations).

:- begin_tests(requirement_proof_symbol_stages, [setup(rqp_forget_memo)]).

test(executable_symbol_stage) :-
    rqp_kb((
        pf_entity(symbol, 'SYM-1', []),
        pf_entity(test, 'T-1', []),
        pf_entity(test, 'T-2', []),
        pf_entity(fact, 'NOT-SYM', []),
        pf_raw_rel(executable_for, 'SYM-1', 'T-1'),
        pf_raw_rel(executable_for, 'NOT-SYM', 'T-2'),
        once(requirement_proof:executable_symbol_stage(['T-1', 'T-2'], S1, Syms1)),
        Syms1 == ['SYM-1'],
        same(S1, _{status: missing, symbols: ['SYM-1'], missingTests: ['T-2'],
                   coordinates: [_{id: 'SYM-1', path: ''}]}),
        once(requirement_proof:executable_symbol_stage(['T-1'], S2, _)),
        get_dict(status, S2, St2), St2 == passed,
        once(requirement_proof:executable_symbol_stage([], S3, Syms3)), Syms3 == [],
        same(S3, _{status: blocked, symbols: [], missingTests: [], coordinates: []})
    )).

test(production_symbol_sets_split_structural_symbols) :-
    rqp_kb((
        pf_entity(req, 'REQ-P', [status=open]),
        pf_entity(symbol, 'SYM-PROD', []),
        pf_entity(symbol, 'SYM-SHAPE', [symbol_role="type-shape"]),
        pf_entity(symbol, 'SYM-SHAPE-E2E', [symbol_role="type-shape"]),
        pf_entity(symbol, 'SYM-EXEC', []),
        pf_entity(fact, 'NOT-SYM', []),
        pf_entity(test, 'T-UNIT', [verification_scope=unit, status=passing]),
        pf_entity(test, 'T-E2E', [verification_scope=end_to_end, status=passing]),
        pf_entity(test, 'T-RUN', []),
        forall(member(S, ['SYM-PROD', 'SYM-SHAPE', 'SYM-SHAPE-E2E', 'SYM-EXEC', 'NOT-SYM']),
               pf_raw_rel(implements, S, 'REQ-P')),
        pf_raw_rel(executable_for, 'SYM-EXEC', 'T-RUN'),
        pf_raw_rel(covered_by, 'SYM-SHAPE', 'T-UNIT'),
        pf_raw_rel(covered_by, 'SYM-SHAPE-E2E', 'T-E2E'),
        once(requirement_proof:production_symbol_sets('REQ-P', symbol_sets(Structural, Production, Coordinates))),
        Structural == ['SYM-SHAPE'],
        Production == ['SYM-PROD', 'SYM-SHAPE-E2E'],
        same(Coordinates, [_{id: 'SYM-PROD', path: ''}, _{id: 'SYM-SHAPE-E2E', path: ''}]),
        requirement_proof:structural_symbol_covered(['T-UNIT'], [], 'SYM-SHAPE'),
        first_answer_is_last(requirement_proof:structural_symbol_covered(['T-UNIT'], ['T-UNIT'-passed], 'SYM-SHAPE')),
        requirement_proof:structural_symbol_covered([], ['T-UNIT'-passed], 'SYM-SHAPE'),
        \+ requirement_proof:structural_symbol_covered([], ['T-UNIT'-stale], 'SYM-SHAPE'),
        \+ requirement_proof:structural_symbol_covered(['T-E2E'], [], 'SYM-SHAPE')
    )).

test(production_stage_status_reasons) :-
    once(requirement_proof:production_stage_status([], [], [], [], [], S1, R1)),
    S1 == missing, R1 == "no production symbols implement this requirement; link at least one with implements",
    once(requirement_proof:production_stage_status([p], [], [], [p], [], S2, R2)),
    S2 == blocked,
    R2 == "no passing E2E test evidence is available for the current snapshot; run kibi prove so this stage can evaluate production symbol coverage",
    once(requirement_proof:production_stage_status([], [s], [], [], [s], S2b, _)), S2b == blocked,
    once(requirement_proof:production_stage_status([p], [s], [t], [], [], S3, R3)), S3 == passed, var(R3),
    once(requirement_proof:production_stage_status([p, q], [], [t], [p, q], [], S4, R4)),
    S4 == missing, R4 == '2 production symbol(s) lack covered_by links to the passing E2E tests',
    once(requirement_proof:production_stage_status([], [s], [t], [], [s], S5, R5)),
    S5 == missing,
    R5 == '1 type-shape symbol(s) lack a covered_by unit test with a current passing receipt; run kibi prove on those unit tests',
    once(requirement_proof:production_stage_status([p], [s, r], [t], [p], [s, r], S6, R6)),
    S6 == missing,
    R6 == '1 production symbol(s) lack covered_by links to the passing E2E tests and 2 type-shape symbol(s) lack a covered_by unit test with a current passing receipt'.

:- end_tests(requirement_proof_symbol_stages).

:- begin_tests(requirement_proof_source_coordinates, [setup(rqp_forget_memo)]).

test(source_coordinate_stage_outcomes) :-
    rqp_kb((
        pf_entity(symbol, 'S-1', []),
        pf_entity(symbol, 'S-2', [sourceFile="src/a.ts", sourceLine=1, sourceColumn=0, sourceEndLine=2,
                                  sourceEndColumn=3]),
        S2Ref = _{column: 0, endColumn: 3, endLine: 2, id: 'S-2', line: 1, path: 'src/a.ts'},
        once(requirement_proof:source_coordinate_stage([], [], [], A)),
        same(A, _{coordinates: [], missingSymbols: [], requirementPath: '', requirementSource: missing,
                  status: missing, symbols: []}),
        once(requirement_proof:source_coordinate_stage([source="r.md"], ['S-1'], ['S-2'], B)),
        same(B, _{coordinates: [_{id: 'S-1', path: ''}, S2Ref], missingSymbols: ['S-1'], requirementPath: 'r.md',
                  requirementSource: present, status: missing, symbols: ['S-1', 'S-2']}),
        once(requirement_proof:source_coordinate_stage([source="r.md"], [], ['S-2'], C)),
        same(C, _{coordinates: [S2Ref], missingSymbols: [], requirementPath: 'r.md', requirementSource: present,
                  status: passed, symbols: ['S-2']}),
        once(requirement_proof:source_coordinate_stage([source="r.md"], [], [], D)),
        get_dict(status, D, DS), DS == blocked,
        once(requirement_proof:source_coordinate_stage([source=""], [], ['S-2'], E)),
        get_dict(requirementSource, E, ES), ES == missing
    )).

test(source_property_prefers_a_nonempty_source_file) :-
    once(requirement_proof:proof_source_property([sourceFile="", source="b.md"], P1)), P1 == "b.md",
    once(requirement_proof:proof_source_property([sourceFile="a.ts", source="b.md"], P2)), P2 == "a.ts",
    first_answer_is_last(requirement_proof:proof_source_property([sourceFile="a.ts", source="b.md"], _)),
    \+ requirement_proof:proof_source_property([sourceFile="", source=""], _),
    \+ requirement_proof:proof_source_property([], _),
    requirement_proof:nonempty_source([source="b.md"]),
    \+ requirement_proof:nonempty_source([source=""]).

test(ground_source_refs_skip_facts_without_a_source) :-
    rqp_kb((
        pf_entity(fact, 'F-1', [source="src/f.md"]),
        pf_entity(fact, 'F-2', [source=""]),
        once(requirement_proof:ground_source_refs([_{factId: 'F-2'}, _{factId: 'F-1'}], Refs)),
        same(Refs, [_{id: 'F-1', path: 'src/f.md'}])
    )).

:- end_tests(requirement_proof_source_coordinates).

% REQ-C claims K-SET, grounded by the set fact F-SET; T-CERT holds a fresh
% exhaustive certificate receipt over that set with the claim bindings given.
rqp_cert_fixture(Bindings) :-
    pf_entity(fact, 'F-SET', [fact_kind=property_value, subject_key="palette", property_key="colors",
        operator=eq, value_type=set, value_set=["a", "b"], claim_key="K-SET", claim_text="Colors are a and b"]),
    with_output_to(string(Inv), json_write_dict(current_output, [_{claim_key: "K-SET", claim_text: "Colors are a and b",
        role: normative, status: modeled, span: _{start: 0, end: 18}}], [width(0)])),
    pf_entity(req, 'REQ-C', [status=open, semantic_inventory=Inv]),
    pf_raw_rel(requires_property, 'REQ-C', 'F-SET'),
    Cert = _{version: "kibi.code-certificate.v1", kind: "exhaustive", test_id: "T-CERT",
             domain: _{symbol_id: "SYM-D", members: ["a", "b"]},
             results: [_{member: "a", outcome: "passed"}, _{member: "b", outcome: "passed"}]},
    code_certificates:code_certificate_digest(Cert, Digest),
    rqp_hash(0'a, Snap),
    pf_receipt([test_id='T-CERT', scope=unit, code_snapshot=Snap, version='kibi.proof-receipt.v2',
                kind=exhaustive, evidence_level=proved, certificate=Cert, certificate_digest=Digest,
                claim_bindings=Bindings], R),
    pf_receipts_json([R], RJ),
    pf_entity(test, 'T-CERT', [status=passing, verification_scope=unit, proof_receipts=RJ]).

rqp_derived_binding(_{claim_key: "K-SET", requirement_id: "REQ-C", fact_id: "F-SET", binding: "derived",
                      scope: "code", obligation: _{kind: "set_equals", members: ["a", "b"]}}).

rqp_cert_context(Context) :-
    rqp_hash(0'a, Snapshot),
    requirement_proof_context(Snapshot, '2026-05-01T00:05:00Z', 100000, Context).

:- begin_tests(requirement_proof_certified_bindings, [setup(rqp_forget_memo)]).

test(a_derived_code_binding_certifies_the_claim) :-
    rqp_kb((
        rqp_derived_binding(B), rqp_cert_fixture([B]),
        rqp_cert_context(C),
        once(requirement_proof:certified_claim_keys('REQ-C', _{tests: ['T-CERT', 'T-NONE']}, C, Keys)),
        Keys == ['K-SET'],
        once(requirement_proof:certified_claim_keys('REQ-OTHER', _{tests: ['T-CERT']}, C, Other)), Other == [],
        once(requirement_proof:certified_claim_keys('REQ-C', _{}, C, None)), None == [],
        once(requirement_proof:negative_path_stage('REQ-C', _{}, _{tests: ['T-CERT']}, C, Negative)),
        get_dict(status, Negative, NS), NS == not_required,
        get_dict(certifiedClaims, Negative, NC), NC == ['K-SET'],
        once(requirement_proof:cases_stage('REQ-C', _{scenarios: []}, _{tests: ['T-CERT']}, C, Cases)),
        get_dict(status, Cases, CS), CS == not_required
    )).

test(other_bindings_certify_nothing) :-
    rqp_derived_binding(B),
    forall(member(Change, [binding-"attested", scope-"intent", requirement_id-"REQ-OTHER"]),
           (   Change = Key-Value,
               put_dict(Key, B, Value, B1),
               rqp_kb((
                   rqp_cert_fixture([B1]),
                   rqp_cert_context(C),
                   once(requirement_proof:certified_claim_keys('REQ-C', _{tests: ['T-CERT']}, C, Keys)),
                   Keys == []
               ))
           )).

test(a_stale_certificate_certifies_nothing) :-
    rqp_kb((
        rqp_derived_binding(B), rqp_cert_fixture([B]),
        rqp_hash(0'b, Other),
        requirement_proof_context(Other, '2026-05-01T00:05:00Z', 100000, C),
        once(requirement_proof:certified_claim_keys('REQ-C', _{tests: ['T-CERT']}, C, Keys)),
        Keys == []
    )).

:- end_tests(requirement_proof_certified_bindings).

:- begin_tests(requirement_proof_gap_table, [setup(rqp_forget_memo)]).

rqp_all_gap_stages(ContradictionStatus, ScenarioStatus, Stages) :-
    rqp_full_stages([
        semanticInventory-propositionCount-0, semanticInventory-missingCount-1,
        semanticInventory-malformedCount-1, semanticInventory-unresolvedCount-1,
        logicGrounding-manifestClaims-[], logicGrounding-missingManifestClaims-[k],
        logicGrounding-extraManifestClaims-[k], logicGrounding-undeclaredGroundClaims-[k],
        logicGrounding-missingGroundClaims-[k], logicGrounding-duplicateGroundClaims-[k],
        logicGrounding-claimTextMismatchClaims-[k], logicGrounding-invalidGroundClaims-[k],
        logicGrounding-invalidRuleFacts-[k],
        contradictions-status-ContradictionStatus,
        scenarios-status-ScenarioStatus, scenarios-infeasibleScenarios-[s], scenarios-unknownFeasibility-[s],
        negativePath-status-missing, dimension-status-missing, cases-status-missing,
        scenarioTests-status-missing,
        passingE2e-status-missing, passingE2e-missingReceiptTests-[t], passingE2e-staleReceiptTests-[t],
        passingE2e-failedReceiptTests-[t], passingE2e-invalidReceiptTests-[t],
        passingE2e-contractMismatchReceiptTests-[t], passingE2e-snapshotUnavailableTests-[t],
        executableSymbols-status-missing,
        productionSymbols-symbols-[], productionSymbols-uncoveredSymbols-[s],
        sourceCoordinates-missingSymbols-[s], sourceCoordinates-requirementSource-missing
    ], Stages).

% Every clause answers in turn when the gap is left open, so no clause may
% commit to its answer.
test(every_gap_clause_answers) :-
    rqp_all_gap_stages(blocked, missing, S1),
    findall(G, requirement_proof:proof_gap_present(G, S1), L1),
    L1 == [missing_semantic_inventory, incomplete_semantic_inventory, malformed_semantic_inventory,
           unresolved_semantic_proposition, missing_logic_claims,
           logic_manifest_mismatch, logic_manifest_mismatch, logic_manifest_mismatch,
           missing_logic_grounding,
           ambiguous_logic_grounding, ambiguous_logic_grounding, ambiguous_logic_grounding, ambiguous_logic_grounding,
           blocking_contradiction, missing_scenario, infeasible_scenario, unknown_scenario_feasibility,
           happy_path_only, dimension_unrepresented, uncovered_case, missing_passing_e2e,
           missing_proof_receipt, stale_proof_receipt, failed_proof_receipt, invalid_proof_receipt,
           proof_contract_mismatch, proof_snapshot_unavailable, missing_executable_test_symbol,
           missing_production_symbol, missing_production_symbol_coverage, missing_symbol_coordinates,
           missing_requirement_source],
    rqp_all_gap_stages(unresolved, blocked, S2),
    findall(G, (requirement_proof:proof_gap_present(G, S2),
                memberchk(G, [contradiction_check_incomplete, missing_scenario_test, missing_scenario])), L2),
    L2 == [contradiction_check_incomplete, missing_scenario_test],
    rqp_all_gap_stages(unresolved, passed, S3),
    once(requirement_proof:proof_gap_present(missing_scenario_test, S3)).

test(gap_definitions_table) :-
    findall(G-P-S, requirement_proof:gap_definition(G, P, S, _), Rows),
    Rows == [missing_semantic_inventory-10-semantic_inventory, incomplete_semantic_inventory-11-semantic_inventory,
             malformed_semantic_inventory-12-semantic_inventory, unresolved_semantic_proposition-20-semantic_inventory,
             missing_logic_claims-30-logic_grounding, logic_manifest_mismatch-31-logic_grounding,
             missing_logic_grounding-32-logic_grounding, ambiguous_logic_grounding-33-logic_grounding,
             blocking_contradiction-40-contradictions, contradiction_check_incomplete-41-contradictions,
             unknown_scenario_feasibility-49-scenarios, missing_scenario-50-scenarios,
             infeasible_scenario-49-scenarios, dimension_unrepresented-47-dimension, uncovered_case-46-cases,
             happy_path_only-48-negative_path, missing_scenario_test-51-scenario_tests,
             missing_passing_e2e-52-passing_e2e, missing_proof_receipt-53-passing_e2e,
             stale_proof_receipt-54-passing_e2e, failed_proof_receipt-55-passing_e2e,
             invalid_proof_receipt-56-passing_e2e, proof_contract_mismatch-57-passing_e2e,
             proof_snapshot_unavailable-58-passing_e2e, missing_executable_test_symbol-60-executable_symbols,
             missing_production_symbol-70-production_symbols,
             missing_production_symbol_coverage-71-production_symbols,
             missing_symbol_coordinates-80-source_coordinates, missing_requirement_source-81-source_coordinates].

:- end_tests(requirement_proof_gap_table).

:- begin_tests(requirement_proof_applicability, [setup(rqp_forget_memo)]).

test(exempt_and_not_current_requirements_skip_the_ladder) :-
    rqp_kb((
        pf_entity(req, 'REQ-EX', [status=open, proof_exempt=true, proof_exempt_reason="Outside scope"]),
        pf_entity(req, 'REQ-OLD', [status=deprecated]),
        % A requirement that is not current is out of scope for that reason,
        % whatever exemption it also carries.
        pf_entity(req, 'REQ-OLD-EX', [status=deprecated, proof_exempt=true, proof_exempt_reason="Old scope"]),
        pf_entity(req, 'REQ-OPEN', [status=open]),
        requirement_proof_context(abc, '2026-05-02T00:00:00Z', 100, C),
        forall(member(Id-Reason, ['REQ-EX'-'Outside scope',
                                  'REQ-OLD'-'status \'deprecated\' is not a current requirement status',
                                  'REQ-OLD-EX'-'status \'deprecated\' is not a current requirement status']),
               (   kb_entity(Id, req, Props),
                   once(requirement_proof:compute_requirement_proof(Id, Props, C, Proof)),
                   get_dict(proofStatus, Proof, not_applicable),
                   get_dict(proofStages, Proof, Stages),
                   same(Stages, _{applicability: _{status: not_applicable, reason: Reason}}),
                   first_answer_is_last(requirement_proof:compute_requirement_proof(Id, Props, C, _))
               )),
        kb_entity('REQ-OPEN', req, OpenProps),
        once(requirement_proof:compute_requirement_proof('REQ-OPEN', OpenProps, C, Open)),
        get_dict(proofStatus, Open, OpenStatus), OpenStatus == missing
    )).

test(proof_exempt_needs_a_true_flag_and_a_reason) :-
    forall(member(F, [true, "yes", on, '1']),
           (   once(requirement_proof:proof_exempt([proof_exempt=F, proof_exempt_reason="r"], R)), R == r )),
    \+ requirement_proof:proof_exempt([proof_exempt=no, proof_exempt_reason="r"], _),
    \+ requirement_proof:proof_exempt([proof_exempt=true, proof_exempt_reason=""], _),
    \+ requirement_proof:proof_exempt([proof_exempt=true], _),
    \+ requirement_proof:proof_exempt([proof_exempt_reason="r"], _).

:- end_tests(requirement_proof_applicability).

:- begin_tests(requirement_proof_default_context, [setup(rqp_forget_memo)]).

test(default_context_parameters) :-
    rqp_kb((
        once(requirement_proof_context(C)),
        get_dict(proofSnapshot, C, S), S == unknown,
        get_dict(proofCheckedAt, C, A), A == '1970-01-01T00:00:00Z',
        get_dict(proofMaxAgeSeconds, C, M), M == 604800,
        get_dict(proofBindingMode, C, B), B == strict_snapshot,
        get_dict(proofTestBindings, C, T), same(T, _{}),
        once(requirement_proof:proof_version(V)), V == 'kibi.requirement-proof.v5'
    )).

:- end_tests(requirement_proof_default_context).

%% rqp_canon(+Term, -Canon)
% Term with every dict replaced by dict(Pairs), so whole proofs compare with ==.
rqp_canon(D, dict(Ps)) :- is_dict(D), !, dict_pairs(D, _, P0), maplist(rqp_canon_pair, P0, Ps).
rqp_canon(L, C) :- is_list(L), !, maplist(rqp_canon, L, C).
rqp_canon(X, X).
rqp_canon_pair(K-V, K-C) :- rqp_canon(V, C).

rqp_json(T, S) :- with_output_to(string(S), json_write_dict(current_output, T, [width(0)])).

% REQ-P is tested end to end through T-E2E on two scenarios, and T-CERT
% holds an exhaustive certificate over K-P's set; REQ-D and its tests,
% scenarios and symbols are unrelated entities the proof must leave out.
rqp_full_cert(Members, Results, Cert) :-
    Cert = _{version: "kibi.code-certificate.v1", kind: "exhaustive", test_id: "T-CERT",
             domain: _{symbol_id: "SYM-DOM", members: Members}, results: Results}.

rqp_full_fixture(Cert, Digest, Bindings) :-
    rqp_hash(0'a, Snap),
    rqp_json([_{claim_key: "K-P", claim_text: "Outcomes are a and b", role: normative, status: modeled,
            span: _{start: 0, end: 20}},
          _{claim_key: "K-N", claim_text: "Background", role: context, status: nonlogical,
            span: _{start: 21, end: 31}}], Inv),
    pf_entity(req, 'REQ-P', [status=active, priority=must, logic_claims=['K-P'], semantic_inventory=Inv]),
    pf_entity(fact, 'F-PS', [fact_kind=subject, subject_key="report"]),
    pf_entity(fact, 'F-PP', [fact_kind=property_value, subject_key="report", property_key="outcomes",
        operator=eq, value_type=set, value_set=["a", "b"], claim_key="K-P", claim_text="Outcomes are a and b",
        case_waiver="Closed set", case_waiver_approved_by="Owner"]),
    pf_entity(fact, 'F-PART', [fact_kind=property_value, subject_key="report", property_key="outcomes",
        operator=eq, value_type=set, value_set=["a"]]),
    pf_entity(scenario, 'S-P', []),
    pf_entity(scenario, 'S-PN', [expects=rejection]),
    pf_receipt([test_id='T-E2E', code_snapshot=Snap], E2eReceipt),
    pf_receipts_json([E2eReceipt], E2eJson),
    pf_entity(test, 'T-E2E', [status=passing, verification_scope=end_to_end, proof_receipts=E2eJson]),
    pf_receipt([test_id='T-CERT', receipt_id='PR-FIXTURE00002', scope=unit, code_snapshot=Snap,
                version='kibi.proof-receipt.v2', kind=exhaustive, evidence_level=proved, certificate=Cert,
                certificate_digest=Digest, claim_bindings=Bindings], CertReceipt),
    pf_receipts_json([CertReceipt], CertJson),
    pf_entity(test, 'T-CERT', [status=passing, verification_scope=unit, proof_receipts=CertJson]),
    pf_entity(symbol, 'SYM-PROD', [sourceFile="src/a.pl", sourceLine=10, sourceColumn=0, sourceEndLine=30, sourceEndColumn=1]),
    pf_entity(symbol, 'SYM-E2E', [sourceFile="tests/a.plt", sourceLine=5, sourceColumn=0, sourceEndLine=9, sourceEndColumn=1]),
    forall(member(R-A-B, [constrains-'REQ-P'-'F-PS', requires_property-'REQ-P'-'F-PP',
                          specified_by-'REQ-P'-'S-P', specified_by-'REQ-P'-'S-PN',
                          assumes-'S-PN'-'F-PART',
                          verified_by-'S-P'-'T-E2E', verified_by-'S-PN'-'T-E2E',
                          verified_by-'S-P'-'T-CERT', verified_by-'S-PN'-'T-CERT',
                          implements-'SYM-PROD'-'REQ-P', covered_by-'SYM-PROD'-'T-E2E',
                          executable_for-'SYM-E2E'-'T-E2E']),
           pf_raw_rel(R, A, B)),
    rqp_full_distractors.

rqp_full_distractors :-
    pf_entity(req, 'REQ-D', [status=active, priority=must]),
    pf_entity(fact, 'F-DP', [fact_kind=property_value, subject_key="report", property_key="mode",
        operator=eq, value_type=set, value_set=["x"], claim_key="K-D", claim_text="Mode is x"]),
    pf_entity(fact, 'F-DS', [fact_kind=subject, subject_key="other"]),
    pf_entity(scenario, 'S-D', []),
    pf_entity(test, 'T-D', [status=passing, verification_scope=end_to_end]),
    pf_entity(symbol, 'SYM-D', []),
    pf_entity(symbol, 'SYM-DX', []),
    forall(member(R-A-B, [requires_property-'REQ-D'-'F-DP', constrains-'REQ-D'-'F-DS',
                          specified_by-'REQ-D'-'S-D', verified_by-'S-D'-'T-D',
                          implements-'SYM-D'-'REQ-D', covered_by-'SYM-D'-'T-D',
                          executable_for-'SYM-DX'-'T-D', covered_by-'SYM-D'-'T-E2E',
                          verified_by-'S-D'-'T-CERT-D', verified_by-'S-P'-'T-CERT-F']),
           pf_raw_rel(R, A, B)),
    % T-CERT-D binds K-P with a failing certificate but verifies only S-D;
    % T-CERT-F verifies S-P with a re-checking certificate whose run failed.
    rqp_hash(0'a, Snap),
    rqp_full_binding(Binding),
    rqp_full_cert(["a", "b"], [_{member: "a", outcome: "failed"}, _{member: "b", outcome: "passed"}], Failing),
    rqp_full_cert(["a", "b"], [_{member: "a", outcome: "passed"}, _{member: "b", outcome: "passed"}], Passing),
    forall(member(TestId-Cert-Outcome-Rid, ['T-CERT-D'-Failing-passed-'PR-FIXTURE00003',
                                            'T-CERT-F'-Passing-failed-'PR-FIXTURE00004']),
           (   code_certificates:code_certificate_digest(Cert, Digest),
               pf_receipt([test_id=TestId, receipt_id=Rid, scope=unit, code_snapshot=Snap, outcome=Outcome,
                           run_outcome=Outcome, version='kibi.proof-receipt.v2', kind=exhaustive,
                           evidence_level=proved, certificate=Cert, certificate_digest=Digest,
                           claim_bindings=[Binding]], Receipt),
               pf_receipts_json([Receipt], Json),
               pf_entity(test, TestId, [status=passing, verification_scope=unit, proof_receipts=Json])
           )).

rqp_put_pair(Key-Value, Dict0, Dict) :-
    put_dict(Key, Dict0, Value, Dict).

%% rqp_full_view(+Proof, -View)
% The claim-level fields of Proof, as compared for the binding variants.
rqp_full_view(Proof, View) :-
    findall(Key-Value,
        (   member(Key, [certificateRejections, claimBindingRejections, claimEvidence, claimSummary,
                         evidenceLevel, unprovedClaims]),
            (get_dict(Key, Proof, Value) -> true ; Value = absent)
        ;   member(Stage-Key, [negativePath-certifiedClaims, negativePath-status, cases-status, dimension-status]),
            get_dict(Stage, Proof.proofStages, StageDict),
            get_dict(Key, StageDict, Value)
        ), Pairs0),
    maplist(rqp_canon_pair, Pairs0, View).

rqp_full_binding(_{claim_key: "K-P", requirement_id: "REQ-P", fact_id: "F-PP", binding: "derived",
          scope: "code", obligation: _{kind: "set_equals", members: ["a", "b"]}}).

rqp_full_proof(Cert, Bindings, Proof) :-
    code_certificates:code_certificate_digest(Cert, Digest),
    rqp_kb((
        rqp_full_fixture(Cert, Digest, Bindings),
        rqp_hash(0'a, Snap),
        requirement_proof_context(Snap, '2026-05-01T00:05:00Z', 100000, Ctx),
        kb:kb_entity('REQ-P', req, Props),
        once(requirement_proof:requirement_proof('REQ-P', Props, Ctx, Proof)),
        once(requirement_proof:requirement_proof('REQ-P', Props, Ctx, Again)),
        rqp_canon(Again, A), rqp_canon(Proof, P), A == P)).


rqp_golden(
  proved,
  dict(
    [ claimEvidence - [ dict(
          [ applicable-true,
            bindings-[ dict(
                [ binding-derived,
                  kind-exhaustive,
                  scope-code,
                  test-'T-CERT'
                ])
            ],
            claimKey-'K-P',
            level-proved,
            role-normative,
            status-modeled
          ]),
        dict(
          [ applicable-false,
            bindings-[],
            claimKey-'K-N',
            level-null,
            role-context,
            status-nonlogical
          ])
      ],
      claimSummary-dict(
        [ applicable-1,
          attested-0,
          proved-1,
          tested-0,
          unresolved-0
        ]),
      evidence - [ dict(
          [ kind-certificate,
            kinds-[ exhaustive
            ],
            level-proved,
            scope-code,
            tests-[ 'T-CERT'
            ]
          ]),
        dict(
          [ kind-e2e,
            level-tested,
            scope-code,
            tests-[ 'T-E2E'
            ]
          ]),
        dict(
          [ basis-firm,
            kind-human_intent,
            level-asserted,
            scope-intent
          ])
      ],
      evidenceFloor-dict(
        [ required-tested,
          source-firmness,
          status-met
        ]),
      evidenceLevel-proved,
      proofAdvisories-[],
      proofGaps-[],
      proofRepairs-[],
      proofStages - dict(
        [ cases - dict(
            [ cases-[],
              limitReached-false,
              pendingReproofClaims-[],
              status-not_required,
              summary-dict(
                [ covered-0,
                  generated-0,
                  uncovered-0,
                  unspecified-0,
                  waived-0
                ]),
              uncoveredCases-[],
              waivedCases-[]
            ]),
          contradictions-dict(
            [ conflicts-[],
              outcome-no_conflict_found,
              status-passed
            ]),
          dimension-dict(
            [ claims-[],
              pendingReproofClaims-[],
              status-not_required,
              waivedClaims-[]
            ]),
          executableSymbols - dict(
            [ coordinates - [ dict(
                  [ column-0,
                    endColumn-1,
                    endLine-9,
                    id-'SYM-E2E',
                    line-5,
                    path-'tests/a.plt'
                  ])
              ],
              missingTests-[],
              status-passed,
              symbols-[ 'SYM-E2E'
              ]
            ]),
          logicGrounding - dict(
            [ claimTextMismatchClaims-[],
              duplicateGroundClaims-[],
              evidence - [ dict(
                  [ claimKey-'K-P',
                    claimText-'Outcomes are a and b',
                    factId-'F-PP',
                    lane-property
                  ])
              ],
              extraManifestClaims-[],
              groundedClaims-[ 'K-P'
              ],
              invalidGroundClaims-[],
              invalidRuleFacts-[],
              inventoryClaims-[ 'K-P'
              ],
              manifestClaims-[ 'K-P'
              ],
              missingGroundClaims-[],
              missingManifestClaims-[],
              modeledClaims-[ 'K-P'
              ],
              sources-[ dict(
                  [ id-'F-PP',
                    path-'test://proof_fixture.pl'
                  ])
              ],
              status-passed,
              undeclaredGroundClaims-[]
            ]),
          negativePath - dict(
            [ certifiedClaims-[ 'K-P'
              ],
              claims-[],
              negativeScenarios-[ 'S-PN'
              ],
              pendingReproofClaims-[],
              status-not_required,
              suggestedNegatives-[],
              waiver-dict(
                [])
            ]),
          passingE2e - dict(
            [ checkedAt-'2026-05-01T00:05:00Z',
              contractMismatchReceiptTests-[],
              currentCodeSnapshot-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa,
              failedReceiptTests-[],
              invalidReceiptTests-[],
              maxAgeSeconds-100000,
              missingReceiptTests-[],
              nonEndToEndTests-[ 'T-CERT',
                'T-CERT-F'
              ],
              receiptEvidence - [ dict(
                  [ scope-unit,
                    state-not_end_to_end,
                    testId-'T-CERT'
                  ]),
                dict(
                  [ scope-unit,
                    state-not_end_to_end,
                    testId-'T-CERT-F'
                  ]),
                dict(
                  [ ageSeconds-240.0,
                    artifactDigest-cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc,
                    codeSnapshot-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa,
                    environmentHash - bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb,
                    finishedAt-'2026-05-01T00:01:00Z',
                    outcome-passed,
                    receiptId-'PR-FIXTURE00001',
                    scope-end_to_end,
                    startedAt-'2026-05-01T00:00:00Z',
                    state-passed,
                    testId-'T-E2E'
                  ])
              ],
              scenarioObligations - [ dict(
                  [ acceptedScopes-[ end_to_end
                    ],
                    contractMismatchReceiptTests-[],
                    e2eTests-[ 'T-E2E'
                    ],
                    evidence - [ dict(
                        [ scope-unit,
                          state-not_end_to_end,
                          testId-'T-CERT'
                        ]),
                      dict(
                        [ scope-unit,
                          state-not_end_to_end,
                          testId-'T-CERT-F'
                        ]),
                      dict(
                        [ ageSeconds-240.0,
                          artifactDigest - cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc,
                          codeSnapshot - aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa,
                          environmentHash - bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb,
                          finishedAt-'2026-05-01T00:01:00Z',
                          outcome-passed,
                          receiptId-'PR-FIXTURE00001',
                          scope-end_to_end,
                          startedAt-'2026-05-01T00:00:00Z',
                          state-passed,
                          testId-'T-E2E'
                        ])
                    ],
                    failedReceiptTests-[],
                    gaps-[],
                    invalidReceiptTests-[],
                    invalidScenarioTestTargets-[],
                    missingReceiptTests-[],
                    nonEndToEndTests-[ 'T-CERT',
                      'T-CERT-F'
                    ],
                    passingE2eTests-[ 'T-E2E'
                    ],
                    scenarioId-'S-P',
                    scenarioTestTargets-[ 'T-CERT',
                      'T-CERT-F',
                      'T-E2E'
                    ],
                    snapshotUnavailableTests-[],
                    staleReceiptTests-[],
                    status-passed,
                    tests-[ 'T-CERT',
                      'T-CERT-F',
                      'T-E2E'
                    ]
                  ]),
                dict(
                  [ acceptedScopes-[ end_to_end
                    ],
                    contractMismatchReceiptTests-[],
                    e2eTests-[ 'T-E2E'
                    ],
                    evidence - [ dict(
                        [ scope-unit,
                          state-not_end_to_end,
                          testId-'T-CERT'
                        ]),
                      dict(
                        [ ageSeconds-240.0,
                          artifactDigest - cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc,
                          codeSnapshot - aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa,
                          environmentHash - bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb,
                          finishedAt-'2026-05-01T00:01:00Z',
                          outcome-passed,
                          receiptId-'PR-FIXTURE00001',
                          scope-end_to_end,
                          startedAt-'2026-05-01T00:00:00Z',
                          state-passed,
                          testId-'T-E2E'
                        ])
                    ],
                    failedReceiptTests-[],
                    gaps-[],
                    invalidReceiptTests-[],
                    invalidScenarioTestTargets-[],
                    missingReceiptTests-[],
                    nonEndToEndTests-[ 'T-CERT'
                    ],
                    passingE2eTests-[ 'T-E2E'
                    ],
                    scenarioId-'S-PN',
                    scenarioTestTargets-[ 'T-CERT',
                      'T-E2E'
                    ],
                    snapshotUnavailableTests-[],
                    staleReceiptTests-[],
                    status-passed,
                    tests-[ 'T-CERT',
                      'T-E2E'
                    ]
                  ])
              ],
              snapshotUnavailableTests-[],
              staleReceiptTests-[],
              status-passed,
              tests-[ 'T-E2E'
              ]
            ]),
          productionSymbols - dict(
            [ coordinates - [ dict(
                  [ column-0,
                    endColumn-1,
                    endLine-30,
                    id-'SYM-PROD',
                    line-10,
                    path-'src/a.pl'
                  ])
              ],
              explanations - [ dict(
                  [ classification-unknown,
                    coverageCandidates - [ dict(
                        [ qualifies-true,
                          reason-covered,
                          reasonText-"Qualifying covered_by to a passing scenario-backed E2E test",
                          receiptState-passed,
                          relationship-covered_by,
                          scope-end_to_end,
                          secondaryReasons-[],
                          testId-'T-E2E'
                        ])
                    ],
                    reason-covered,
                    reasonText-"Qualifying covered_by to a passing scenario-backed E2E test",
                    requirementId-'REQ-P',
                    status-covered,
                    symbolId-'SYM-PROD'
                  ])
              ],
              status-passed,
              structuralSymbols-[],
              symbols-[ 'SYM-PROD'
              ],
              uncoveredSymbols-[]
            ]),
          scenarioTests - dict(
            [ invalidScenarioTestTargets-[],
              obligations - [ dict(
                  [ invalidScenarioTestTargets-[],
                    scenarioId-'S-P',
                    scenarioTestTargets-[ 'T-CERT',
                      'T-CERT-F',
                      'T-E2E'
                    ],
                    sources - [ dict(
                        [ id-'T-CERT',
                          path-'test://proof_fixture.pl'
                        ]),
                      dict(
                        [ id-'T-CERT-F',
                          path-'test://proof_fixture.pl'
                        ]),
                      dict(
                        [ id-'T-E2E',
                          path-'test://proof_fixture.pl'
                        ])
                    ],
                    status-passed,
                    tests-[ 'T-CERT',
                      'T-CERT-F',
                      'T-E2E'
                    ]
                  ]),
                dict(
                  [ invalidScenarioTestTargets-[],
                    scenarioId-'S-PN',
                    scenarioTestTargets-[ 'T-CERT',
                      'T-E2E'
                    ],
                    sources - [ dict(
                        [ id-'T-CERT',
                          path-'test://proof_fixture.pl'
                        ]),
                      dict(
                        [ id-'T-E2E',
                          path-'test://proof_fixture.pl'
                        ])
                    ],
                    status-passed,
                    tests-[ 'T-CERT',
                      'T-E2E'
                    ]
                  ])
              ],
              resolutions - [ dict(
                  [ executableFor-[],
                    requiredProofs-[],
                    testId-'T-CERT'
                  ]),
                dict(
                  [ executableFor-[],
                    requiredProofs-[],
                    testId-'T-CERT-F'
                  ]),
                dict(
                  [ executableFor - [ dict(
                        [ column-0,
                          endColumn-1,
                          endLine-9,
                          exists-true,
                          id-'SYM-E2E',
                          line-5,
                          path-'tests/a.plt',
                          role-unknown
                        ])
                    ],
                    requiredProofs-[],
                    testId-'T-E2E'
                  ])
              ],
              scenarioTestTargets-[ 'T-CERT',
                'T-CERT-F',
                'T-E2E'
              ],
              scenarios-[ 'S-P',
                'S-PN'
              ],
              sources - [ dict(
                  [ id-'T-CERT',
                    path-'test://proof_fixture.pl'
                  ]),
                dict(
                  [ id-'T-CERT-F',
                    path-'test://proof_fixture.pl'
                  ]),
                dict(
                  [ id-'T-E2E',
                    path-'test://proof_fixture.pl'
                  ])
              ],
              status-passed,
              tests-[ 'T-CERT',
                'T-CERT-F',
                'T-E2E'
              ]
            ]),
          scenarios - dict(
            [ infeasibleScenarios-[],
              invalidScenarioTargets-[],
              negativeScenarios-[ 'S-PN'
              ],
              scenarioTargets-[ 'S-P',
                'S-PN'
              ],
              scenarios-[ 'S-P',
                'S-PN'
              ],
              sources - [ dict(
                  [ id-'S-P',
                    path-'test://proof_fixture.pl'
                  ]),
                dict(
                  [ id-'S-PN',
                    path-'test://proof_fixture.pl'
                  ])
              ],
              status-passed,
              unknownFeasibility-[]
            ]),
          semanticInventory - dict(
            [ malformedCount-0,
              missingCount-0,
              modeledCount-1,
              nonlogicalCount-1,
              propositionCount-2,
              status-passed,
              unresolvedCount-0
            ]),
          sourceCoordinates - dict(
            [ coordinates - [ dict(
                  [ column-0,
                    endColumn-1,
                    endLine-9,
                    id-'SYM-E2E',
                    line-5,
                    path-'tests/a.plt'
                  ]),
                dict(
                  [ column-0,
                    endColumn-1,
                    endLine-30,
                    id-'SYM-PROD',
                    line-10,
                    path-'src/a.pl'
                  ])
              ],
              missingSymbols-[],
              requirementPath-'test://proof_fixture.pl',
              requirementSource-present,
              status-passed,
              symbols-[ 'SYM-E2E',
                'SYM-PROD'
              ]
            ])
        ]),
      proofStatus-tested,
      proofVersion-'kibi.requirement-proof.v5',
      testResolutions - [ dict(
          [ executableFor-[],
            requiredProofs-[],
            testId-'T-CERT'
          ]),
        dict(
          [ executableFor-[],
            requiredProofs-[],
            testId-'T-CERT-F'
          ]),
        dict(
          [ executableFor - [ dict(
                [ column-0,
                  endColumn-1,
                  endLine-9,
                  exists-true,
                  id-'SYM-E2E',
                  line-5,
                  path-'tests/a.plt',
                  role-unknown
                ])
            ],
            requiredProofs-[],
            testId-'T-E2E'
          ])
      ],
      unprovedClaims-[]
    ])).

rqp_golden(
  failing,
  dict(
    [ certificateRejections-[ dict(
          [ reason-"member b did not pass",
            test-'T-CERT'
          ])
      ],
      claimBindingRejections - [ dict(
          [ claimKey-'K-P',
            reason-'the certificate does not re-check',
            test-'T-CERT'
          ])
      ],
      claimEvidence - [ dict(
          [ applicable-true,
            bindings - [ dict(
                [ binding-rejected,
                  kind-exhaustive,
                  reason-'the certificate does not re-check',
                  scope-code,
                  test-'T-CERT'
                ])
            ],
            claimKey-'K-P',
            level-tested,
            rejections - [ dict(
                [ claimKey-'K-P',
                  reason-'the certificate does not re-check',
                  test-'T-CERT'
                ])
            ],
            role-normative,
            status-modeled
          ]),
        dict(
          [ applicable-false,
            bindings-[],
            claimKey-'K-N',
            level-null,
            role-context,
            status-nonlogical
          ])
      ],
      claimSummary-dict(
        [ applicable-1,
          attested-0,
          proved-0,
          tested-1,
          unresolved-0
        ]),
      evidence - [ dict(
          [ kind-e2e,
            level-tested,
            scope-code,
            tests-[ 'T-E2E'
            ]
          ]),
        dict(
          [ basis-firm,
            kind-human_intent,
            level-asserted,
            scope-intent
          ])
      ],
      evidenceFloor-dict(
        [ required-tested,
          source-firmness,
          status-met
        ]),
      evidenceLevel-tested,
      proofAdvisories-[],
      proofGaps-[],
      proofRepairs-[],
      proofStatus-tested,
      proofVersion-'kibi.requirement-proof.v5',
      testResolutions - [ dict(
          [ executableFor-[],
            requiredProofs-[],
            testId-'T-CERT'
          ]),
        dict(
          [ executableFor-[],
            requiredProofs-[],
            testId-'T-CERT-F'
          ]),
        dict(
          [ executableFor - [ dict(
                [ column-0,
                  endColumn-1,
                  endLine-9,
                  exists-true,
                  id-'SYM-E2E',
                  line-5,
                  path-'tests/a.plt',
                  role-unknown
                ])
            ],
            requiredProofs-[],
            testId-'T-E2E'
          ])
      ],
      unprovedClaims-[ 'K-P'
      ]
    ])).

rqp_view(
  other_requirement,
  [ certificateRejections-absent,
    claimBindingRejections-absent,
    claimEvidence - [ dict(
        [ applicable-true,
          bindings-[],
          claimKey-'K-P',
          level-tested,
          role-normative,
          status-modeled
        ]),
      dict(
        [ applicable-false,
          bindings-[],
          claimKey-'K-N',
          level-null,
          role-context,
          status-nonlogical
        ])
    ],
    claimSummary-dict(
      [ applicable-1,
        attested-0,
        proved-0,
        tested-1,
        unresolved-0
      ]),
    evidenceLevel-tested,
    unprovedClaims-[ 'K-P'
    ],
    certifiedClaims-[],
    status-passed,
    status-waived,
    status-not_required
  ]).

rqp_view(
  other_claim,
  [ certificateRejections-absent,
    claimBindingRejections-absent,
    claimEvidence - [ dict(
        [ applicable-true,
          bindings-[],
          claimKey-'K-P',
          level-tested,
          role-normative,
          status-modeled
        ]),
      dict(
        [ applicable-false,
          bindings-[],
          claimKey-'K-N',
          level-null,
          role-context,
          status-nonlogical
        ])
    ],
    claimSummary-dict(
      [ applicable-1,
        attested-0,
        proved-0,
        tested-1,
        unresolved-0
      ]),
    evidenceLevel-tested,
    unprovedClaims-[ 'K-P'
    ],
    certifiedClaims-[],
    status-passed,
    status-waived,
    status-not_required
  ]).

rqp_view(
  attested,
  [ certificateRejections-absent,
    claimBindingRejections - [ dict(
        [ claimKey-'K-P',
          reason - 'the claim now has a derivable obligation; re-prove the test so Kibi can derive it',
          test-'T-CERT'
        ])
    ],
    claimEvidence - [ dict(
        [ applicable-true,
          bindings - [ dict(
              [ binding-rejected,
                kind-exhaustive,
                reason - 'the claim now has a derivable obligation; re-prove the test so Kibi can derive it',
                scope-code,
                test-'T-CERT'
              ])
          ],
          claimKey-'K-P',
          level-tested,
          rejections - [ dict(
              [ claimKey-'K-P',
                reason - 'the claim now has a derivable obligation; re-prove the test so Kibi can derive it',
                test-'T-CERT'
              ])
          ],
          role-normative,
          status-modeled
        ]),
      dict(
        [ applicable-false,
          bindings-[],
          claimKey-'K-N',
          level-null,
          role-context,
          status-nonlogical
        ])
    ],
    claimSummary-dict(
      [ applicable-1,
        attested-0,
        proved-0,
        tested-1,
        unresolved-0
      ]),
    evidenceLevel-tested,
    unprovedClaims-[ 'K-P'
    ],
    certifiedClaims-[],
    status-passed,
    status-waived,
    status-not_required
  ]).

rqp_view(
  intent_scope,
  [ certificateRejections-absent,
    claimBindingRejections-absent,
    claimEvidence - [ dict(
        [ applicable-true,
          bindings-[ dict(
              [ binding-derived,
                kind-exhaustive,
                scope-intent,
                test-'T-CERT'
              ])
          ],
          claimKey-'K-P',
          level-tested,
          role-normative,
          status-modeled
        ]),
      dict(
        [ applicable-false,
          bindings-[],
          claimKey-'K-N',
          level-null,
          role-context,
          status-nonlogical
        ])
    ],
    claimSummary-dict(
      [ applicable-1,
        attested-0,
        proved-0,
        tested-1,
        unresolved-0
      ]),
    evidenceLevel-tested,
    unprovedClaims-[ 'K-P'
    ],
    certifiedClaims-[],
    status-passed,
    status-waived,
    status-not_required
  ]).

:- begin_tests(requirement_proof_full_ladder, [setup(rqp_forget_memo)]).

test(a_rechecked_certificate_proves_the_requirement) :-
    rqp_full_cert(["a", "b"], [_{member: "a", outcome: "passed"}, _{member: "b", outcome: "passed"}], Cert),
    rqp_full_binding(Binding),
    rqp_full_proof(Cert, [Binding], Proof),
    rqp_canon(Proof, Canon),
    rqp_golden(proved, Expected),
    Canon == Expected.

test(a_failing_certificate_is_rejected_once) :-
    rqp_full_cert(["a", "b"], [_{member: "a", outcome: "passed"}, _{member: "b", outcome: "failed"}], Cert),
    rqp_full_binding(Binding),
    rqp_full_proof(Cert, [Binding], Proof),
    del_dict(proofStages, Proof, _, Top),
    rqp_canon(Top, Canon),
    rqp_golden(failing, Expected),
    Canon == Expected.

test(binding_variants_leave_the_claim_tested) :-
    rqp_full_cert(["a", "b"], [_{member: "a", outcome: "passed"}, _{member: "b", outcome: "passed"}], Cert),
    rqp_full_binding(Binding),
    forall(member(Name-Changes, [other_requirement-[requirement_id-"REQ-D"], other_claim-[claim_key-"K-OTHER"],
                                 attested-[binding-"attested"], intent_scope-[scope-"intent"]]),
           (   foldl(rqp_put_pair, Changes, Binding, Changed),
               rqp_full_proof(Cert, [Changed], Proof),
               rqp_full_view(Proof, View),
               rqp_view(Name, Expected),
               (   View == Expected -> true
               ;   format(user_error, "~q gave ~q~n", [Name, View]), fail
               )
           )).

:- end_tests(requirement_proof_full_ladder).

:- begin_tests(requirement_proof_direct_helpers, [setup(rqp_forget_memo)]).

rqp_evidence_facts(ReqId, FactIds) :-
    findall(FactId, (requirement_proof:valid_ground_evidence(ReqId, E), get_dict(factId, E, FactId)), FactIds).

test(ground_evidence_follows_the_requirement_links) :-
    rqp_kb((
        rqp_ground_fixture,
        pf_entity(fact, 'F-D2', [fact_kind=predicate, claim_key="K-D2", claim_text="Bad predicate"]),
        pf_raw_rel(requires_predicate, 'REQ-G', 'F-D2'),
        pf_entity(fact, 'F-BADSCHEMA', [fact_kind=rule_schema]),
        pf_entity(fact, 'F-R2', [fact_kind=rule, rule_ir="{}", rule_schema_id="F-BADSCHEMA", claim_key="K-R2",
                                 claim_text="Bad rule"]),
        pf_raw_rel(requires_rule, 'REQ-G', 'F-R2'),
        pf_entity(req, 'REQ-SUBJ-ONLY', []),
        pf_raw_rel(constrains, 'REQ-SUBJ-ONLY', 'F-SUBJ'),
        pf_entity(req, 'REQ-PROP-ONLY', []),
        pf_raw_rel(requires_property, 'REQ-PROP-ONLY', 'F-P'),
        rqp_evidence_facts('REQ-G', All), All == ['F-P', 'F-D', 'F-R'],
        rqp_evidence_facts('REQ-SUBJ-ONLY', S), S == [],
        rqp_evidence_facts('REQ-PROP-ONLY', P), P == []
    )).

test(test_scope_reads_the_scope_tags_and_source) :-
    forall(member(Props-Expected, [
            [verification_scope="unit", tags=["e2e"]]-[unit],
            [tags=["unit", "E2E"]]-[end_to_end],
            [tags=["unit"]]-[unknown],
            [tags=["e2e", "e2e"]]-[end_to_end],
            [tags=["unit"], source="checkout.E2E.test.ts"]-[end_to_end],
            [source="tests/unit/flow.test.ts"]-[unknown],
            []-[unknown]
        ]),
        (   findall(S, requirement_proof:test_scope(Props, S), Scopes),
            (   Scopes == Expected -> true
            ;   format(user_error, "~q gave ~q~n", [Props, Scopes]), fail
            )
        )).

test(receipt_atoms_are_normalized_once) :-
    forall(member(Raw-Expected, ["text"-text, 'A b'-'A b', f(x)-'f(x)', 7-'7', ^^("t", type)-t]),
           (   findall(A, requirement_proof:normalize_receipt_atom(Raw, A), As),
               As == [Expected]
           )).

test(symbol_classification_reads_the_role) :-
    rqp_kb((
        pf_entity(symbol, 'SYM-R', [symbol_role="production"]),
        pf_entity(symbol, 'SYM-E', [symbol_role=""]),
        pf_entity(symbol, 'SYM-N', []),
        pf_entity(test, 'T-R', [symbol_role="production"]),
        forall(member(Id-Expected, ['SYM-R'-[production], 'SYM-E'-[unknown], 'SYM-N'-[unknown], 'T-R'-[unknown]]),
               (   findall(C, requirement_proof:symbol_classification(Id, C), Cs), Cs == Expected ))
    )).

test(test_resolution_refs_read_the_contract_and_executable_links) :-
    rqp_kb((
        pf_entity(symbol, 'SYM-A', []),
        pf_entity(symbol, 'SYM-B', []),
        pf_entity(symbol, 'SYM-C', []),
        rqp_json(_{required_proofs: [_{symbol_id: "SYM-B"}, _{symbolId: "SYM-A"}, _{symbol_id: ""},
                                     _{other: "SYM-C"}]}, Contract),
        pf_entity(test, 'T-1', [proof_contract=Contract]),
        pf_entity(test, 'T-2', [proof_contract="not json"]),
        pf_entity(test, 'T-3', [proof_contract="{\"other\": 1}"]),
        pf_raw_rel(executable_for, 'SYM-A', 'T-1'),
        pf_raw_rel(executable_for, 'T-2', 'T-1'),
        pf_raw_rel(executable_for, 'SYM-C', 'T-2'),
        findall(Ids, (requirement_proof:test_required_proof_refs('T-1', Refs),
                      findall(Id, (member(R, Refs), get_dict(id, R, Id)), Ids)), Answers),
        Answers == [['SYM-A', 'SYM-B']],
        once(requirement_proof:test_required_proof_refs('T-2', R2)), R2 == [],
        once(requirement_proof:test_required_proof_refs('T-3', R3)), R3 == [],
        once(requirement_proof:test_required_proof_refs('SYM-A', R4)), R4 == [],
        once(requirement_proof:test_executable_for_refs('T-1', E1)),
        findall(Id, (member(R, E1), get_dict(id, R, Id)), EIds), EIds == ['SYM-A']
    )).

test(proof_contract_binding_hashes_a_valid_contract) :-
    once(requirement_proof:proof_contract_binding([], None)), None == none,
    once(requirement_proof:proof_contract_binding([proof_contract="not json"], Invalid)), Invalid == invalid,
    once(requirement_proof:proof_contract_binding([proof_contract="{\"b\":1,\"a\":[true,null]}"], hash(Hash))),
    crypto_data_hash("{\"a\":[true,null],\"b\":1}", Expected, [algorithm(sha256), encoding(utf8)]),
    Hash == Expected,
    once(requirement_proof:proof_contract_dict(_{a: 1}, Dict)), get_dict(a, Dict, One), One == 1.

test(canonical_json_is_compact_and_sorted) :-
    findall(J, requirement_proof:canonical_json_value([_{b: 1, a: [2, 3]}, "s", true], J), Js),
    Js == ["[{\"a\":[2,3],\"b\":1},\"s\",true]"],
    findall(J, requirement_proof:canonical_json_value(null, J), Ns), Ns == ["null"].

test(receipt_history_must_strictly_increase) :-
    once(requirement_proof:strictly_increasing([1, 2, 3])),
    \+ requirement_proof:strictly_increasing([1, 3, 2]),
    \+ requirement_proof:strictly_increasing([2, 2]).

test(receipts_follow_the_binding_mode) :-
    Bound = _{binding_hash: h1, code_snapshot: s2},
    Plain = _{code_snapshot: s1},
    Receipts = [Bound, Plain],
    once(requirement_proof:receipt_for_current_mode('T-1',
        _{proofBindingMode: strict_snapshot, proofTestBindings: _{'T-1': h1}, proofSnapshot: s1}, Receipts, Strict)),
    Strict = [S1], same(S1, Plain), length(Strict, 1),
    once(requirement_proof:receipt_for_current_mode('T-1',
        _{proofBindingMode: per_contract, proofTestBindings: _{'T-1': h1}, proofSnapshot: s1}, Receipts, Per)),
    Per = [P1], same(P1, Bound),
    once(requirement_proof:receipt_for_current_mode('T-1',
        _{proofBindingMode: per_contract, proofTestBindings: _{'T-1': h9}, proofSnapshot: s1}, Receipts, Fallback)),
    Fallback = [F1], same(F1, Plain),
    once(requirement_proof:receipt_for_binding([h0, h1], Bound)),
    \+ requirement_proof:receipt_for_binding([h0], Bound),
    once(requirement_proof:receipt_for_binding(h1, Bound)).

test(receipts_report_fingerprint_drift) :-
    Same = _{contract: c, integration: i, command: m, bindings: b, producer: p},
    Ctx = _{proofTestBindings: _{'$fingerprint_components': _{'T-1': Same}}},
    Stored = _{fingerprint_components: _{contract: c, integration: i0, command: m0, bindings: b, producer: p}},
    requirement_proof:receipt_fingerprint_drift(Ctx, 'T-1', Stored, Drift),
    Drift == [integration, command],
    requirement_proof:receipt_fingerprint_drift(Ctx, 'T-1', _{fingerprint_components: Same}, []),
    requirement_proof:receipt_matches_current_fingerprint(Ctx, 'T-1', _{fingerprint_components: Same}),
    \+ requirement_proof:receipt_matches_current_fingerprint(Ctx, 'T-1', Stored),
    requirement_proof:receipt_fingerprint_drift(Ctx, 'T-9', Stored, []),
    requirement_proof:receipt_fingerprint_drift(_{proofTestBindings: _{'T-1': h1}}, 'T-1', Stored, []),
    requirement_proof:receipt_fingerprint_drift(Ctx, 'T-1', _{}, []),
    requirement_proof:receipt_fingerprint_drift(Ctx, 'T-1',
        _{fingerprint_components: _{contract: c}}, Partial),
    Partial == [integration, command, bindings, producer],
    requirement_proof:receipt_fingerprint_drift(Ctx, 'T-1',
        [fingerprint_components=[contract=c, integration=i, command=m, bindings=b, producer=p0]], ListDrift),
    ListDrift == [producer].

test(drift_is_attached_to_evidence_only_when_present) :-
    requirement_proof:evidence_with_drift(_{state: stale}, [], E0),
    \+ get_dict(fingerprintDrift, E0, _),
    get_dict(state, E0, stale),
    requirement_proof:evidence_with_drift(_{state: stale}, [command], E1),
    get_dict(fingerprintDrift, E1, [command]),
    get_dict(state, E1, stale),
    requirement_proof:newest_receipt_drift(_{proofTestBindings: _{}}, 'T-1', [], []).

test(attempt_status_matches_the_entries) :-
    requirement_proof:valid_attempt_status(unavailable, _{}),
    requirement_proof:valid_attempt_status(unavailable, _{entries: []}),
    \+ requirement_proof:valid_attempt_status(unavailable, _{entries: [_{outcome: passed}]}),
    requirement_proof:valid_attempt_status(complete, _{entries: [_{outcome: passed}]}),
    \+ requirement_proof:valid_attempt_status(complete, _{entries: []}).

test(arithmetic_certificates_match_the_constraint) :-
    Claim = _{operator: "<=", value: 10},
    Cert = _{claim: Claim, variable: "rate", value_type: "int"},
    Obligation = _{kind: "numeric_constraint", variable: "rate", value_type: "int", operator: "<=", value: 10},
    \+ requirement_proof:certificate_obligation_problem(arithmetic, _{certificate: Cert}, Obligation, _),
    forall(member(Changed, [_{claim: Claim.put(operator, ">=")}, _{claim: Claim.put(value, 11)},
                            _{variable: "other"}, _{value_type: "real"}]),
           (   put_dict(Changed, Cert, Cert1),
               findall(P, requirement_proof:certificate_obligation_problem(arithmetic, _{certificate: Cert1},
                                                                          Obligation, P), Ps),
               Ps == ['the certificate\'s claim is not the fact\'s constraint']
           )),
    forall(member(Key, [claim, variable, value_type]),
           (   del_dict(Key, Cert, _, Cert2),
               once(requirement_proof:certificate_obligation_problem(arithmetic, _{certificate: Cert2}, Obligation, P2)),
               P2 == 'the certificate\'s claim is not the fact\'s constraint'
           )),
    \+ requirement_proof:certificate_obligation_problem(arithmetic, _{}, Obligation, _).


test(no_scenarios_leave_the_scenario_tests_missing) :-
    rqp_kb((
        once(requirement_proof:scenario_test_stage([], Stage, Tests)),
        get_dict(status, Stage, Status), Status == missing, Tests == []
    )).

test(receipt_evidence_states_for_missing_and_malformed_receipts) :-
    rqp_kb((
        rqp_hash(0'a, Snap),
        pf_receipt([test_id='T-BADCONTRACT', code_snapshot=Snap], R),
        pf_receipts_json([R], RJ),
        pf_entity(test, 'T-NONE', [status=passing, verification_scope=end_to_end]),
        pf_entity(test, 'T-EMPTY', [status=passing, verification_scope=end_to_end, proof_receipts="[]"]),
        pf_entity(test, 'T-BADCONTRACT', [status=passing, verification_scope=end_to_end, proof_receipts=RJ,
                                          proof_contract="not json"]),
        requirement_proof_context(Snap, '2026-05-01T00:05:00Z', 100000, C),
        forall(member(T-State-Count, ['T-NONE'-missing-0, 'T-EMPTY'-invalid-0, 'T-BADCONTRACT'-invalid-1]),
               (   findall(E, test_receipt_evidence(C, [end_to_end], T, E), Es),
                   Es = [E1],
                   get_dict(state, E1, S), get_dict(receiptCount, E1, N),
                   (   S == State, N == Count -> true
                   ;   format(user_error, "~q gave ~q~n", [T, Es]), fail
                   )
               ))
    )).

:- end_tests(requirement_proof_direct_helpers).

:- begin_tests(requirement_proof_explanations, [setup(rqp_forget_memo)]).

test(reused_receipt_reasons) :-
    findall(R, requirement_proof:reused_receipt_reject_reasons([_{testId: 'T-1', state: passed}], 'T-1', R), Passed),
    Passed == [[]],
    findall(R, requirement_proof:reused_receipt_reject_reasons([_{testId: 'T-0', state: failed},
                                                                 _{testId: 'T-1', state: missing}], 'T-1', R), Missing),
    Missing == [[missing_proof_receipt]],
    findall(R, requirement_proof:reused_receipt_reject_reasons([], 'T-1', R), None), None == [[]].

test(in_chain_receipt_rejections) :-
    rqp_kb((
        pf_entity(test, 'T-NONE', [status=passing, verification_scope=end_to_end]),
        rqp_hash(0'a, Snap),
        pf_receipt([test_id='T-OK', code_snapshot=Snap], Passed), pf_receipts_json([Passed], PassedJson),
        pf_entity(test, 'T-OK', [status=passing, verification_scope=end_to_end, proof_receipts=PassedJson]),
        requirement_proof_context(Snap, '2026-05-01T00:05:00Z', 100000, C),
        % A passed receipt the passing E2E stage did not count rejects nothing.
        findall(P0-S0, requirement_proof:receipt_reject_for_in_chain([], C, 'T-OK', P0, S0), Ok),
        Ok == [no_qualifying_e2e_coverage-[]],
        forall(member(Evidence-Ctx-Expected, [
                   [_{testId: 'T-NONE', state: passed}]-C-no_qualifying_e2e_coverage,
                   [_{testId: 'T-NONE', state: failed}]-C-failed_proof_receipt,
                   []-C-missing_proof_receipt,
                   []-none-no_qualifying_e2e_coverage,
                   []-_{}-no_qualifying_e2e_coverage
               ]),
               (   findall(P-S, requirement_proof:receipt_reject_for_in_chain(Evidence, Ctx, 'T-NONE', P, S), Answers),
                   (   Answers == [Expected-[]] -> true
                   ;   format(user_error, "~q gave ~q~n", [Evidence, Answers]), fail
                   )
               ))
    )).

test(explanation_texts) :-
    once(requirement_proof:explanation_reason_text(no_qualifying_e2e_coverage, Text)),
    Text == "covered_by relationships exist but none qualify as passing scenario-backed E2E coverage",
    once(requirement_proof:explanation_reason_text(odd_reason, Odd)), Odd == odd_reason.

test(structural_unit_contracts) :-
    rqp_kb((
        pf_entity(symbol, 'SYM-T', [symbol_role="type-shape"]),
        pf_entity(symbol, 'SYM-O', [symbol_role="type-shape"]),
        pf_entity(test, 'T-U', [status=passing, verification_scope=unit]),
        pf_entity(test, 'T-U2', [status=passing, verification_scope=unit]),
        pf_entity(test, 'T-UF', [status=failing, verification_scope=unit]),
        pf_entity(test, 'T-E', [status=passing, verification_scope=end_to_end]),
        forall(member(R-A-B, [covered_by-'SYM-T'-'T-U', covered_by-'SYM-T'-'T-E', covered_by-'SYM-T'-'T-UF',
                              covered_by-'SYM-O'-'T-U2']),
               pf_raw_rel(R, A, B)),
        forall(member(T-Expected, ['T-U'-true, 'T-E'-false, 'T-UF'-false]),
               (   (requirement_proof:structural_unit_contract_test(T) -> Got = true ; Got = false),
                   Got == Expected
               )),
        requirement_proof_context(C),
        once(requirement_proof:structural_unit_receipts(['SYM-T'], C, UR)),
        findall(T, member(T-_, UR), UTests), UTests == ['T-U'],
        \+ requirement_proof:structural_symbol_covered([], ['T-U2'-passed], 'SYM-T'),
        once(requirement_proof:structural_symbol_covered([], ['T-U'-passed], 'SYM-T')),
        once(requirement_proof:coverage_candidate_qualification(structural(['T-U'-passed]), [], [], [], C, 'T-U',
                                                                Q1, P1, S1)),
        Q1-P1-S1 == true-structural_unit_contract-[],
        once(requirement_proof:coverage_candidate_qualification(structural([]), [], [], [], C, 'T-U', Q2, P2, S2)),
        Q2-P2-S2 == false-structural_unit_receipt_not_current-[],
        once(requirement_proof:coverage_candidate_qualification(structural(['T-U'-stale]), [], [], [], C, 'T-U',
                                                                _, _, S3)),
        S3 == [stale_proof_receipt]
    )).

test(stages_without_tests_or_obligations_give_no_claim_evidence) :-
    rqp_kb((
        requirement_proof_context(C),
        once(requirement_proof:certificate_rejections(_{}, C, Rejections)), Rejections == [],
        once(requirement_proof:claim_evidence('REQ-X', [], [], tested, _{}, C, Evidence, Proved, BindingRejections)),
        Evidence-Proved-BindingRejections == []-[]-[]
    )).

:- end_tests(requirement_proof_explanations).

%% rqp_stale_proves_test(+TestId, +Proves, +Snapshot)
% A unit test whose contract proves the claim keys Proves, with one passed
% receipt on Snapshot.
rqp_stale_proves_test(TestId, Proves, Snapshot) :-
    rqp_json(_{kind: "exhaustive", proves: Proves}, ContractJson),
    once(requirement_proof:proof_contract_hash(ContractJson, ContractHash)),
    pf_receipt([test_id=TestId, scope=unit, code_snapshot=Snapshot, contract_hash=ContractHash], Receipt),
    pf_receipts_json([Receipt], ReceiptsJson),
    pf_entity(test, TestId, [status=passing, verification_scope=unit, proof_contract=ContractJson,
                             proof_receipts=ReceiptsJson]).

%% rqp_stage_context(-Context)
% Checked on snapshot e; rqp_stale_proves_test/3 on snapshot f is stale.
rqp_stage_context(Context) :-
    rqp_hash(0'e, Current),
    requirement_proof_context(Current, '2026-05-02T00:00:00Z', 100000000, strict_snapshot, _{}, Context).

% REQ-U bounds an upload batch at 5 files (CLAIM-U); S-SIX, linked only
% where a test links it, expects six files to be rejected.  T-STALE is a
% stale certificate test whose contract proves CLAIM-U and CLAIM-OTHER.
rqp_upload_fixture :-
    pf_entity(req, 'REQ-U', [status=open]),
    pf_entity(fact, 'F-U', [fact_kind=property_value, subject_key="upload.batch", property_key="files",
        operator=lte, value_type=int, value_int=5, claim_key="CLAIM-U",
        claim_text="A batch holds at most 5 files"]),
    pf_raw_rel(requires_property, 'REQ-U', 'F-U'),
    pf_entity(scenario, 'S-SIX', [expects=rejection]),
    pf_entity(fact, 'F-SIX', [fact_kind=property_value, subject_key="upload.batch", property_key="files",
        operator=eq, value_type=int, value_int=6]),
    pf_raw_rel(assumes, 'S-SIX', 'F-SIX'),
    rqp_hash(0'f, Old),
    rqp_stale_proves_test('T-STALE', ["CLAIM-U", "CLAIM-OTHER"], Old).

%% rqp_case_view(+Stage, -View)
% Stage with each case as Constraint-Predicted-Coverage-Scenarios-Waiver,
% Waiver none when the row carries no waiver.
rqp_case_view(Stage, view(Status, Rows, Uncovered, Waived, Summary, Limit, Pending)) :-
    get_dict(status, Stage, Status),
    maplist(rqp_case_row, Stage.cases, Rows),
    maplist(rqp_case_row, Stage.uncoveredCases, Uncovered),
    maplist(rqp_case_row, Stage.waivedCases, Waived),
    rqp_canon(Stage.summary, Summary),
    get_dict(limitReached, Stage, Limit),
    get_dict(pendingReproofClaims, Stage, Pending).

rqp_case_row(Row, Constraint-Predicted-Coverage-Scenarios-Waiver) :-
    get_dict(constraint, Row, Constraint),
    get_dict(predicted, Row, Predicted),
    get_dict(coverage, Row, Coverage),
    get_dict(scenarios, Row, Scenarios),
    (   get_dict(waiver, Row, W) -> rqp_canon(W, Waiver) ; Waiver = none ).

:- begin_tests(requirement_proof_case_stage, [setup(rqp_forget_memo)]).

test(cases_list_each_row_and_summarize_the_coverage) :-
    rqp_kb((
        rqp_upload_fixture,
        % F-I holds csv among its formats: no rejection case, and an
        % approved waiver marks its uncovered success case waived.
        pf_entity(fact, 'F-I', [fact_kind=property_value, subject_key="upload.batch", property_key="formats",
            operator=includes, value_type=set, value_set=["csv"], claim_key="CLAIM-I",
            claim_text="Uploads accept csv", case_waiver="Formats are checked by the client",
            case_waiver_approved_by="Ann"]),
        pf_raw_rel(requires_property, 'REQ-U', 'F-I'),
        rqp_stage_context(C),
        once(requirement_proof:cases_stage('REQ-U', _{scenarios: ['S-SIX']}, _{tests: ['T-STALE']}, C, Stage)),
        rqp_case_view(Stage, View),
        Waiver = dict([approvedBy-"Ann", reason-"Formats are checked by the client"]),
        View == view(passed,
                     ["includes csv"-success-waived-[]-Waiver,
                      "includes a value outside [csv]"-unspecified-unspecified-[]-Waiver,
                      "eq 5"-success-uncovered-[]-none,
                      "gt 5"-rejection-covered-['S-SIX']-none,
                      "eq 0"-success-uncovered-[]-none,
                      "eq 1"-success-uncovered-[]-none],
                     [], [],
                     dict([covered-1, generated-6, uncovered-3, unspecified-1, waived-1]),
                     false, [])
    )).

test(uncovered_rejection_cases_wait_on_stale_certificates) :-
    rqp_kb((
        rqp_upload_fixture,
        rqp_stage_context(C),
        % Without a scenario stage no scenario covers a case, not even S-SIX.
        once(requirement_proof:cases_stage('REQ-U', _{}, _{tests: ['T-STALE']}, C, Stage)),
        rqp_case_view(Stage, View),
        View == view(missing,
                     ["eq 5"-success-uncovered-[]-none, "gt 5"-rejection-uncovered-[]-none,
                      "eq 0"-success-uncovered-[]-none, "eq 1"-success-uncovered-[]-none],
                     ["gt 5"-rejection-uncovered-[]-none], [],
                     dict([covered-0, generated-4, uncovered-4, unspecified-0, waived-0]),
                     false, ['CLAIM-U'])
    )).

test(cases_without_a_rejection_case_are_not_required) :-
    rqp_kb((
        pf_entity(req, 'REQ-I', [status=open]),
        pf_entity(fact, 'F-I', [fact_kind=property_value, subject_key="upload.batch", property_key="formats",
            operator=includes, value_type=set, value_set=["csv"], claim_key="CLAIM-I",
            claim_text="Uploads accept csv"]),
        pf_raw_rel(requires_property, 'REQ-I', 'F-I'),
        rqp_stage_context(C),
        once(requirement_proof:cases_stage('REQ-I', _{scenarios: []}, _{tests: []}, C, Stage)),
        rqp_case_view(Stage, View),
        View == view(not_required,
                     ["includes csv"-success-uncovered-[]-none,
                      "includes a value outside [csv]"-unspecified-unspecified-[]-none],
                     [], [], dict([covered-0, generated-2, uncovered-1, unspecified-1, waived-0]),
                     false, [])
    )).

test(a_certified_claim_drops_only_its_own_cases) :-
    rqp_kb((
        rqp_derived_binding(B), rqp_cert_fixture([B]),
        pf_entity(fact, 'F-U', [fact_kind=property_value, subject_key="upload.batch", property_key="files",
            operator=lte, value_type=int, value_int=5, claim_key="CLAIM-U",
            claim_text="A batch holds at most 5 files"]),
        pf_raw_rel(requires_property, 'REQ-C', 'F-U'),
        rqp_cert_context(C),
        once(requirement_proof:cases_stage('REQ-C', _{scenarios: []}, _{tests: ['T-CERT']}, C, Stage)),
        findall(K-Constraint, (member(Row, Stage.cases), get_dict(claimKey, Row, K),
                               get_dict(constraint, Row, Constraint)), Rows),
        Rows == ['CLAIM-U'-"eq 5", 'CLAIM-U'-"gt 5", 'CLAIM-U'-"eq 0", 'CLAIM-U'-"eq 1"]
    )).

:- end_tests(requirement_proof_case_stage).

% REQ-Q claims K-Q, "Every coach is staff", grounded only on the ground
% predicate F-Q; T-RULE holds a fresh rule certificate whose table decides
% staff(coach), bound to K-Q with a derived obligation.
rqp_rule_cert_fixture :-
    pf_entity(fact, 'F-Q', [fact_kind=predicate, predicate_name="staff", predicate_args=["coach"],
        claim_key="K-Q", claim_text="Every coach is staff"]),
    rqp_json([_{claim_key: "K-Q", claim_text: "Every coach is staff", role: normative, status: modeled,
                span: _{start: 0, end: 20}}], Inv),
    pf_entity(req, 'REQ-Q', [status=open, semantic_inventory=Inv]),
    pf_raw_rel(requires_predicate, 'REQ-Q', 'F-Q'),
    Cert = _{version: "kibi.code-certificate.v1", kind: "rule", test_id: "T-RULE",
             domains: _{role: _{members: ["coach"]}},
             predicates: _{staff: _{symbol_id: "SYM-STAFF", arg_types: ["role"],
                                    rows: [_{args: ["coach"], value: true}]}}},
    code_certificates:code_certificate_digest(Cert, Digest),
    rqp_hash(0'e, Snap),
    pf_receipt([test_id='T-RULE', scope=unit, code_snapshot=Snap, version='kibi.proof-receipt.v2',
                kind=rule, evidence_level=proved, certificate=Cert, certificate_digest=Digest,
                claim_bindings=[_{claim_key: "K-Q", requirement_id: "REQ-Q", fact_id: "F-Q",
                                  binding: "derived", scope: "code",
                                  obligation: _{kind: "predicate_holds", predicate: "staff",
                                                args: ["coach"], value: true}}]], R),
    pf_receipts_json([R], RJ),
    pf_entity(test, 'T-RULE', [status=passing, verification_scope=unit, proof_receipts=RJ]).

:- begin_tests(requirement_proof_dimension_stage, [setup(rqp_forget_memo)]).

test(a_quantified_ground_predicate_claim_lacks_its_dimension) :-
    rqp_kb((
        pf_entity(fact, 'F-UNLINKED', [fact_kind=predicate, claim_text="An unlinked fact"]),
        rqp_rule_cert_fixture,
        rqp_hash(0'f, Old),
        rqp_stale_proves_test('T-STALE', ["K-Q", "K-OTHER"], Old),
        rqp_stage_context(C),
        once(requirement_proof:dimension_stage('REQ-Q', _{tests: ['T-STALE']}, C, Stage)),
        rqp_canon(Stage, Canon),
        Canon == dict([claims-[dict([claimKey-'K-Q', claimText-"Every coach is staff", factIds-['F-Q'],
                                     quantifier-"every", rewrites-["rule", "count", "set"], waiver-dict([])])],
                       pendingReproofClaims-['K-Q'], status-missing, waivedClaims-[]])
    )).

test(every_grounding_fact_must_be_dimensionless) :-
    rqp_kb((
        pf_entity(fact, 'F-DIM', [fact_kind=predicate, claim_text="Every coach is staff"]),
        pf_entity(fact, 'F-NUM', [fact_kind=property_value, value_type=int,
                                  claim_text="Every refund is capped"]),
        once(requirement_proof:unrepresented_quantified_claim('K-DIM', ['F-DIM'], _)),
        \+ requirement_proof:unrepresented_quantified_claim('K-NUM', ['F-NUM'], _)
    )).

test(a_certified_claim_needs_no_dimension) :-
    rqp_kb((
        rqp_rule_cert_fixture,
        rqp_stage_context(C),
        once(requirement_proof:certified_claim_keys('REQ-Q', _{tests: ['T-RULE']}, C, Keys)),
        Keys == ['K-Q'],
        once(requirement_proof:dimension_stage('REQ-Q', _{tests: ['T-RULE']}, C, Stage)),
        rqp_canon(Stage, Canon),
        Canon == dict([claims-[], pendingReproofClaims-[], status-not_required, waivedClaims-[]])
    )).

test(only_the_requirement_s_own_facts_are_read) :-
    rqp_kb((
        rqp_rule_cert_fixture,
        pf_entity(req, 'REQ-NONE', [status=open]),
        rqp_stage_context(C),
        once(requirement_proof:dimension_stage('REQ-NONE', _{tests: []}, C, Stage)),
        rqp_canon(Stage, Canon),
        Canon == dict([claims-[], pendingReproofClaims-[], status-not_required, waivedClaims-[]])
    )).

test(dimension_waivers_need_a_reason_and_prefer_an_approved_one) :-
    rqp_kb((
        pf_entity(fact, 'F-W0', [dimension_waiver=""]),
        pf_entity(fact, 'F-W1', [dimension_waiver="r1"]),
        pf_entity(fact, 'F-W2', [dimension_waiver="r2", dimension_waiver_approved_by="Ann"]),
        pf_entity(fact, 'F-W3', [dimension_waiver="r3", dimension_waiver_approved_by=""]),
        pf_entity(fact, 'F-N', []),
        \+ requirement_proof:fact_dimension_waiver('F-W0', _),
        \+ requirement_proof:fact_dimension_waiver('F-N', _),
        forall(member(Ids-Expected, [['F-W3']-dict([reason-"r3"]),
                                     ['F-W1', 'F-W2']-dict([approvedBy-"Ann", reason-"r2"]),
                                     ['F-W1', 'F-W3']-dict([reason-"r1"]),
                                     ['F-N', 'F-W0']-dict([])]),
               (   once(requirement_proof:dimension_waiver(Ids, W)),
                   rqp_canon(W, Got),
                   (   Got == Expected -> true
                   ;   format(user_error, "~q gave ~q~n", [Ids, Got]), fail
                   )
               ))
    )).

:- end_tests(requirement_proof_dimension_stage).

rqp_claim_entries(ReqId, Status, Stage, Context, Entries, Proved) :-
    kb_entity(ReqId, req, Props),
    once(requirement_proof:semantic_inventory_stage(Props, _, Inventory)),
    once(requirement_proof:claim_evidence(ReqId, Props, Inventory, Status, Stage, Context,
                                          Entries0, Proved, _)),
    rqp_canon(Entries0, Entries).

:- begin_tests(requirement_proof_claim_evidence, [setup(rqp_forget_memo)]).

test(a_stale_certificate_binds_nothing) :-
    rqp_kb((
        rqp_derived_binding(B), rqp_cert_fixture([B]),
        % The receipt is four minutes old, past a ten second maximum age.
        rqp_hash(0'a, Snapshot),
        requirement_proof_context(Snapshot, '2026-05-01T00:05:00Z', 10, C),
        rqp_claim_entries('REQ-C', tested, _{tests: ['T-CERT']}, C, Entries, Proved),
        Entries == [dict([applicable-true, bindings-[], claimKey-'K-SET', level-tested, role-normative,
                          status-modeled])],
        Proved == []
    )).

test(without_scenario_tests_no_binding_is_read) :-
    rqp_kb((
        rqp_derived_binding(B), rqp_cert_fixture([B]),
        rqp_cert_context(C),
        rqp_claim_entries('REQ-C', tested, _{}, C, Entries, Proved),
        Entries == [dict([applicable-true, bindings-[], claimKey-'K-SET', level-tested, role-normative,
                          status-modeled])],
        Proved == []
    )).

test(an_untested_requirement_keeps_the_intent_level) :-
    rqp_kb((
        rqp_derived_binding(B), rqp_cert_fixture([B]),
        rqp_cert_context(C),
        rqp_claim_entries('REQ-C', missing, _{tests: ['T-CERT']}, C, Entries, Proved),
        Entries == [dict([applicable-true,
                          bindings-[dict([binding-derived, kind-exhaustive, scope-code, test-'T-CERT'])],
                          claimKey-'K-SET', level-asserted, notProved-requirement_not_tested,
                          role-normative, status-modeled])],
        Proved == []
    )).

test(only_derived_bindings_name_the_proving_tests) :-
    rqp_kb((
        rqp_derived_binding(B), rqp_cert_fixture([B]),
        % T-ATT holds T-CERT's receipt with the binding only attested.
        kb_entity('T-CERT', test, CertProps),
        memberchk(proof_receipts=Raw, CertProps),
        once(requirement_proof:inventory_entries(Raw, [Receipt0])),
        put_dict(binding, B, "attested", Attested),
        put_dict(_{test_id: "T-ATT", claim_bindings: [Attested]}, Receipt0, Receipt),
        pf_receipts_json([Receipt], AttJson),
        pf_entity(test, 'T-ATT', [status=passing, verification_scope=unit, proof_receipts=AttJson]),
        rqp_cert_context(C),
        rqp_claim_entries('REQ-C', tested, _{tests: ['T-ATT', 'T-CERT']}, C, Entries, Proved),
        Entries = [dict(Entry)],
        memberchk(level-Level, Entry), Level == proved,
        Proved == ['T-CERT'-exhaustive]
    )).

test(an_entry_without_a_role_has_an_empty_role) :-
    once(requirement_proof:claim_entry('REQ-X', tested, asserted, [], _{claim_key: "K", status: nonlogical}, E)),
    rqp_canon(E, Canon),
    Canon == dict([applicable-false, bindings-[], claimKey-'K', level-null, role-'', status-nonlogical]).

test(a_binding_is_judged_under_the_receipt_s_kind) :-
    rqp_kb((
        rqp_derived_binding(B), rqp_cert_fixture([B]),
        Evidence = _{kind: typecheck, evidenceLevel: tested, claimBindings: [B]},
        once(requirement_proof:test_claim_binding('REQ-C', 'K-SET', ['T-CERT'-Evidence], Binding)),
        rqp_canon(Binding, Canon),
        Canon == dict([binding-rejected, kind-typecheck, reason-'the certificate does not re-check',
                       scope-code, test-'T-CERT'])
    )).

test(an_untested_requirement_without_a_derived_binding_names_no_reason) :-
    rqp_kb((
        rqp_derived_binding(B0), put_dict(binding, B0, "attested", B), rqp_cert_fixture([B]),
        rqp_cert_context(C),
        rqp_claim_entries('REQ-C', missing, _{tests: ['T-CERT']}, C, [dict(Entry)], _),
        \+ memberchk(notProved-_, Entry),
        memberchk(level-Level, Entry), Level == asserted
    )).

:- end_tests(requirement_proof_claim_evidence).

% REQ-QC requires a call quota above zero; SCN-QZERO assumes it is zero.
rqp_quota_fixture(Expects) :-
    pf_entity(fact, 'F-QS', [fact_kind=subject, subject_key="client.call_quota"]),
    pf_entity(fact, 'F-QPOS', [fact_kind=property_value, subject_key="client.call_quota",
        property_key="remaining", operator=gt, value_type=int, value_int=0]),
    pf_entity(fact, 'F-QZERO', [fact_kind=property_value, subject_key="client.call_quota",
        property_key="remaining", operator=eq, value_type=int, value_int=0]),
    pf_entity(req, 'REQ-QC', [status=open]),
    pf_raw_rel(constrains, 'REQ-QC', 'F-QS'),
    pf_raw_rel(requires_property, 'REQ-QC', 'F-QPOS'),
    pf_entity(scenario, 'SCN-QZERO', [expects=Expects]),
    pf_raw_rel(assumes, 'SCN-QZERO', 'F-QZERO').

:- begin_tests(requirement_proof_linked_entities, [setup(rqp_forget_memo)]).

test(only_linked_scenarios_are_infeasible_or_negative) :-
    forall(member(Expects-Key, [success-infeasibleScenarios, rejection-negativeScenarios]),
           rqp_kb((
               rqp_quota_fixture(Expects),
               % SCN-FREE assumes nothing, so its feasibility is unknown.
               pf_entity(scenario, 'SCN-FREE', [expects=success]),
               once(requirement_proof:scenario_stage('REQ-QC', Unlinked, _)),
               get_dict(Key, Unlinked, None), None == [],
               get_dict(unknownFeasibility, Unlinked, NoneUnknown), NoneUnknown == [],
               pf_raw_rel(specified_by, 'REQ-QC', 'SCN-QZERO'),
               once(requirement_proof:scenario_stage('REQ-QC', Linked, _)),
               get_dict(Key, Linked, Some), Some == ['SCN-QZERO'],
               get_dict(unknownFeasibility, Linked, LinkedUnknown), LinkedUnknown == []
           ))).

test(linked_rule_fact_ids_follow_requires_rule) :-
    rqp_kb((
        pf_entity(req, 'REQ-N', []),
        pf_entity(req, 'REQ-R', []),
        pf_raw_rel(requires_rule, 'REQ-R', 'F-R2'),
        pf_raw_rel(requires_rule, 'REQ-R', 'F-R1'),
        once(requirement_proof:linked_rule_fact_ids('REQ-N', None)), None == [],
        once(requirement_proof:linked_rule_fact_ids('REQ-R', Ids)), Ids == ['F-R1', 'F-R2']
    )).

test(coverage_candidates_know_the_requirement_s_scenario_chain) :-
    rqp_kb((
        pf_entity(req, 'REQ-PS', [status=open]),
        pf_entity(req, 'REQ-PO', [status=open]),
        pf_entity(scenario, 'SCN-PS', []),
        pf_entity(scenario, 'SCN-PO', []),
        pf_entity(test, 'T-IN', [status=passing, verification_scope=end_to_end]),
        pf_entity(test, 'T-OUT', [status=passing, verification_scope=end_to_end]),
        pf_entity(symbol, 'SYM-PS', []),
        pf_raw_rel(specified_by, 'REQ-PS', 'SCN-PS'),
        pf_raw_rel(specified_by, 'REQ-PO', 'SCN-PO'),
        pf_raw_rel(validates, 'T-IN', 'SCN-PS'),
        pf_raw_rel(validates, 'T-OUT', 'SCN-PO'),
        pf_raw_rel(implements, 'SYM-PS', 'REQ-PS'),
        pf_raw_rel(covered_by, 'SYM-PS', 'T-IN'),
        pf_raw_rel(covered_by, 'SYM-PS', 'T-OUT'),
        once(requirement_proof:production_symbol_stage('REQ-PS', [], Stage, _)),
        get_dict(explanations, Stage, [Explanation]),
        findall(T-R, (member(Cand, Explanation.coverageCandidates), get_dict(testId, Cand, T),
                      get_dict(reason, Cand, R)), Reasons),
        % The default context has no snapshot to check a receipt against.
        Reasons == ['T-IN'-proof_snapshot_unavailable, 'T-OUT'-test_not_in_requirement_scenario_chain]
    )).

test(a_failing_unit_test_gives_no_structural_contract) :-
    rqp_kb((
        pf_entity(req, 'REQ-SH', [status=open]),
        pf_entity(symbol, 'SYM-SH', [symbol_role="type-shape"]),
        pf_entity(test, 'T-UF', [verification_scope=unit, status=failing]),
        pf_raw_rel(implements, 'SYM-SH', 'REQ-SH'),
        pf_raw_rel(covered_by, 'SYM-SH', 'T-UF'),
        once(requirement_proof:production_symbol_sets('REQ-SH', symbol_sets(Structural, Production, _))),
        Structural == [], Production == ['SYM-SH']
    )).

:- end_tests(requirement_proof_linked_entities).

:- begin_tests(requirement_proof_open_queries, [setup(rqp_forget_memo)]).

test(inventory_text_is_parsed_once_through_the_memo) :-
    retractall(requirement_proof:pure_memo(_, _, _)),
    retractall(requirement_proof:pure_memo_size(_)),
    once(requirement_proof:inventory_entries([x], _)),
    \+ requirement_proof:pure_memo(_, inventory_entries, _),
    once(requirement_proof:inventory_entries("[1]", _)),
    findall(V, requirement_proof:pure_memo(_, inventory_entries, V), AfterString), AfterString == [[1]],
    once(requirement_proof:inventory_entries('[2]', _)),
    findall(V, requirement_proof:pure_memo(_, inventory_entries, V), AfterAtom), AfterAtom == [[1], [2]],
    retractall(requirement_proof:pure_memo(_, _, _)),
    retractall(requirement_proof:pure_memo_size(_)).

test(every_kind_s_certificate_check_can_be_asked) :-
    Cert = _{domain: _{members: ["a", "b"]}},
    Obligation = _{kind: "set_equals", members: ["a", "b"]},
    findall(K-P, requirement_proof:certificate_obligation_problem(K, _{certificate: Cert}, Obligation, P), Problems),
    Problems == [arithmetic-'the certificate\'s claim is not the fact\'s constraint',
                 rule-'the certificate has no domains'].

test(every_present_gap_can_be_asked) :-
    rqp_full_stages([passingE2e-status-missing], Stages),
    findall(G, requirement_proof:proof_gap_present(G, Stages), Gaps),
    Gaps == [missing_passing_e2e].


%% rqp_receipt_state(+Receipts, -State)
% The receipt state of TEST-E2E, an end-to-end test holding Receipts.
rqp_receipt_state(Receipts, State) :-
    rqp_kb((
        pf_receipts_json(Receipts, Json),
        pf_entity(test, 'TEST-E2E', [status=passing, verification_scope=end_to_end, proof_receipts=Json]),
        rqp_hash(0'a, Snap),
        requirement_proof_context(Snap, '2026-05-01T00:05:00Z', 100000, C),
        once(test_receipt_evidence(C, [end_to_end], 'TEST-E2E', Evidence)),
        get_dict(state, Evidence, State)
    )).

test(receipt_shape_and_history_decide_the_state) :-
    pf_receipt([], Good),
    Good.proof_results = [Result],
    rqp_hash(0'g, NotHex),
    V2 = Good.put(_{version: 'kibi.proof-receipt.v2', kind: e2e, evidence_level: tested}),
    pf_receipt([receipt_id='PR-FIXTURE00002', started_at='2026-05-01T00:00:00Z',
                finished_at='2026-05-01T00:00:30Z'], Earlier),
    forall(member(Receipts-Expected, [
               [Good]-passed,
               [Good, Earlier]-invalid,
               [Good.put(version, 'kibi.proof-receipt.v9')]-invalid,
               [Good.put(version, 'kibi.proof-receipt.v2')]-invalid,
               [Good.put(scope, bogus)]-invalid,
               [Good.put(outcome, bogus)]-invalid,
               [Good.put(code_snapshot, abc)]-invalid,
               [Good.put(environment_hash, abc)]-invalid,
               [Good.put(environment_hash, NotHex)]-invalid,
               [Good.put(receipt_id, 'PR-short')]-invalid,
               [Good.put(test_id, 'TEST-OTHER')]-invalid,
               [Good.put(artifact_digest, abc)]-invalid,
               [Good.put(contract_hash, abc)]-invalid,
               [Good.put(fingerprint, abc)]-invalid,
               [Good.put(fingerprint_components, Good.fingerprint_components.put(producer, abc))]-invalid,
               [Good.put(integration_id, '')]-invalid,
               [Good.put(producer, _{name: ''})]-invalid,
               [Good.put(command_argv, [])]-invalid,
               [Good.put(command_argv, kibi)]-invalid,
               [Good.put(command_argv, [kibi, ''])]-invalid,
               [Good.put(binding_hash, abc)]-invalid,
               [Good.put(run_outcome, bogus)]-invalid,
               [Good.put(proof_results, none)]-invalid,
               [Good.put(proof_results, [Result.put(symbol_id, '')])]-invalid,
               [Good.put(proof_results, [Result.put(target, '')])]-invalid,
               [Good.put(proof_results, [Result.put(outcome, bogus)])]-invalid,
               [Good.put(proof_results, [Result.put(binding, bogus)])]-invalid,
               [Good.put(proof_results, [Result.put(attempts, _{status: bogus})])]-invalid,
               [Good.put(proof_results, [Result.put(attempts, _{status: complete, entries: [_{outcome: bogus}]})])]-invalid,
               [Good.put(proof_results, [Result.put(attempts, _{status: complete, entries: [_{outcome: failed}]})])]-passed,
               [Good.put(started_at, '2026-05-01T00:01:00Z')]-passed,
               [Good.put(started_at, '2026-05-01T00:02:00Z')]-invalid,
               [Good.put(started_at, 'May first')]-invalid,
               [V2]-passed,
               [V2.put(kind, bogus)]-invalid,
               [V2.put(evidence_level, bogus)]-invalid,
               [V2.put(certificate_digest, abc)]-invalid,
               [V2.put(evidence_level, proved)]-invalid,
               [Good.put(scope, unit)]-contract_mismatch
           ]),
           (   rqp_receipt_state(Receipts, State),
               (   State == Expected -> true
               ;   format(user_error, "~q gave ~q~n", [Receipts, State]), fail
               )
           )).
test(receipt_age_bounds) :-
    C = _{proofCheckedAtStamp: 1000, proofMaxAgeSeconds: 60},
    forall(member(Outcome-Finished-Expected, [passed-1300-[passed-(-300)], passed-1301-[invalid-(-301)],
                                              passed-940-[passed-60], passed-939-[stale-61],
                                              failed-1000-[failed-0]]),
           (   findall(S-A, requirement_proof:receipt_runtime_state(_{outcome: Outcome}, Finished, C, S, A), Got),
               (   Got == Expected -> true
               ;   format(user_error, "~q gave ~q~n", [Finished, Got]), fail
               )
           )).

test(claim_text_falls_back_to_the_first_titled_fact) :-
    rqp_kb((
        pf_entity(fact, 'F-T1', [title="First title"]),
        pf_entity(fact, 'F-T2', [title="Second title"]),
        pf_entity(fact, 'F-E', [title="Empty claim", claim_text=""]),
        pf_entity(fact, 'F-C', [title="Claimed", claim_text="The claim"]),
        forall(member(Ids-Expected, [['F-E', 'F-C']-["The claim"], ['F-T2']-["Second title"],
                                     ['F-T1', 'F-T2']-["First title"], ['F-GONE']-[]]),
               (   findall(T, requirement_proof:claim_text_of(Ids, T), Ts),
                   (   Ts == Expected -> true
                   ;   format(user_error, "~q gave ~q~n", [Ids, Ts]), fail
                   )
               ))
    )).

test(canonical_claim_text_has_one_answer) :-
    findall(C, requirement_proof:canonical_claim_text('a b; ', C), Cs),
    Cs == ['a b'].

test(proof_contracts_are_unwrapped_and_parsed) :-
    Json = "{\"a\":1}",
    forall(member(Raw, [Json, '{"a":1}', ^^(Json, t), literal(type(t, Json)), literal(Json), _{a: 1}]),
           (   findall(A, (requirement_proof:proof_contract_dict(Raw, C), get_dict(a, C, A)), As),
               (   As == [1] -> true
               ;   format(user_error, "~q gave ~q~n", [Raw, As]), fail
               )
           )),
    forall(member(Raw, ["not json", "[1]", 42, f(x), literal(type(t, "[1]"))]),
           \+ requirement_proof:proof_contract_dict(Raw, _)).

test(structural_coverage_has_one_answer) :-
    rqp_kb((
        pf_entity(symbol, 'SYM-T', [symbol_role="type-shape"]),
        pf_raw_rel(covered_by, 'SYM-T', 'T-U'),
        pf_raw_rel(covered_by, 'SYM-T', 'T-U2'),
        findall(x, requirement_proof:structural_symbol_covered([], ['T-U'-passed, 'T-U2'-passed], 'SYM-T'), Xs),
        Xs == [x]
    )).

test(structural_symbols_are_explained) :-
    rqp_kb((
        pf_entity(req, 'REQ-SX', [status=open]),
        pf_entity(symbol, 'SYM-SX', [symbol_role="type-shape"]),
        pf_entity(test, 'T-SX', [verification_scope=unit, status=passing]),
        pf_raw_rel(implements, 'SYM-SX', 'REQ-SX'),
        pf_raw_rel(covered_by, 'SYM-SX', 'T-SX'),
        once(requirement_proof:production_symbol_stage('REQ-SX', [], Stage, _)),
        get_dict(explanations, Stage, [Explanation]),
        del_dict(coverageCandidates, Explanation, _, Rest),
        rqp_canon(Rest, Canon),
        Canon == dict([classification-'type-shape', reason-structural_unit_receipt_not_current,
                       reasonText-"type-shape symbol needs a covered_by unit test with a current passing receipt; run kibi prove on that unit test",
                       requirementId-'REQ-SX', status-uncovered, symbolId-'SYM-SX'])
    )).

test(each_explanation_helper_has_one_answer) :-
    rqp_kb((
        pf_entity(test, 'T-E', [status=passing, verification_scope=end_to_end]),
        pf_entity(test, 'T-U', [status=passing, verification_scope=unit]),
        requirement_proof_context(C),
        findall(S-R, requirement_proof:production_symbol_rollup(['S'], ['T'], 'S', [], S, R), Rollup),
        Rollup == [uncovered-covered_by_missing],
        forall(member(Mode-T-Expected, [behavioral-'T-GONE'-[false-missing_test_entity-[]],
                                        structural([])-'T-GONE'-[false-missing_test_entity-[]],
                                        structural([])-'T-U'-[false-structural_unit_receipt_not_current-[]],
                                        structural([])-'T-E'-[false-test_not_in_requirement_scenario_chain-[]]]),
               (   findall(Q-P-Ss, requirement_proof:coverage_candidate_qualification(Mode, [], [], [], C, T, Q, P, Ss),
                           Got),
                   (   Got == Expected -> true
                   ;   format(user_error, "~q ~q gave ~q~n", [Mode, T, Got]), fail
                   )
               )),
        findall(I, requirement_proof:reused_receipt_item([_{testId: 'T-1', state: a}, _{testId: 'T-1', state: b}],
                                                         'T-1', I), Items),
        length(Items, 1),
        findall(R, requirement_proof:receipt_item_reject_reason(_{state: stale}, R), Mismatch),
        Mismatch == [receipt_snapshot_mismatch],
        findall(R, requirement_proof:receipt_item_reject_reason(_{state: stale, codeSnapshot: s}, R), Stale),
        Stale == [stale_proof_receipt],
        findall(L, requirement_proof:contract_required_symbol_ids(_{required_proofs: []}, L), Ls1), Ls1 == [[]],
        findall(L, requirement_proof:contract_required_symbol_ids(_{}, L), Ls2), Ls2 == [[]],
        findall(St, requirement_proof:coordinate_stage_status([s], [], St), Sts), Sts == [passed]
    )).

test(symbol_coordinates_must_be_a_real_range) :-
    Base = [sourceFile="src/a.ts", sourceLine=1, sourceColumn=0, sourceEndLine=1, sourceEndColumn=0],
    requirement_proof:valid_symbol_coordinates(Base),
    forall(member(Key=Value, [sourceFile="", sourceLine=0, sourceColumn= -1, sourceEndLine=0, sourceEndColumn= -1]),
           (   selectchk(Key=_, Base, Rest),
               (   \+ requirement_proof:valid_symbol_coordinates([Key=Value|Rest]) -> true
               ;   format(user_error, "~q passed~n", [Key=Value]), fail
               )
           )).

test(claim_entries_without_a_key_or_with_unproving_bindings) :-
    once(requirement_proof:claim_entry('REQ-X', tested, asserted, [], _{status: modeled}, None)), None == none,
    Attested = _{test: 'T-1', kind: e2e, binding: attested, scope: code},
    requirement_proof:claim_attested_only(_{level: tested, bindings: [Attested]}),
    findall(x, requirement_proof:claim_attested_only(_{level: tested, bindings: [Attested, Attested]}), Xs),
    Xs == [x],
    \+ requirement_proof:claim_attested_only(_{level: proved, bindings: [Attested]}),
    \+ requirement_proof:claim_attested_only(_{level: tested, bindings: []}).

test(a_certificate_rechecks_only_when_it_is_whole_and_its_own) :-
    rqp_kb((
        rqp_derived_binding(B), rqp_cert_fixture([B]),
        kb_entity('T-CERT', test, Props),
        memberchk(proof_receipts=Raw, Props),
        once(requirement_proof:inventory_entries(Raw, [R])),
        once(requirement_proof:receipt_certificate_recheck(R, Ok)), Ok == ok,
        del_dict(certificate, R, _, NoCert),
        del_dict(certificate_digest, R, _, NoDigest),
        get_dict(certificate, R, Cert),
        put_dict(results, Cert, [_{member: "a", outcome: "passed"}, _{member: "b", outcome: "failed"}], Failing),
        code_certificates:code_certificate_digest(Failing, FailingDigest),
        code_certificates:code_certificate_check(Failing, rejected(FailingReason)),
        rqp_hash(0'a, OtherDigest),
        forall(member(Receipt-Expected, [
                   NoCert-"the receipt has no certificate",
                   R.put(certificate, "text")-"the receipt has no certificate",
                   NoDigest-"the receipt has no certificate_digest",
                   R.put(test_id, 'T-OTHER')-"the certificate is for another test",
                   R.put(kind, arithmetic)-"the certificate kind is not the receipt kind",
                   R.put(certificate_digest, OtherDigest)-"the certificate no longer matches its certificate_digest",
                   R.put(_{certificate: Failing, certificate_digest: FailingDigest})-FailingReason
               ]),
               (   findall(Res, requirement_proof:receipt_certificate_recheck(Receipt, Res), Got),
                   (   Got == [rejected(Expected)] -> true
                   ;   format(user_error, "~q gave ~q~n", [Expected, Got]), fail
                   )
               ))
    )).

%% rqp_judged(+ReqId, +Key, +Kind, +Recorded, -Canon)
rqp_judged(ReqId, Key, Kind, Recorded, Canon) :-
    once(requirement_proof:test_claim_binding(ReqId, Key,
        ['T-J'-_{kind: Kind, evidenceLevel: proved, claimBindings: [Recorded]}], Binding)),
    rqp_canon(Binding, Canon).

test(recorded_bindings_are_judged_against_the_current_kb) :-
    rqp_kb((
        rqp_derived_binding(B), rqp_cert_fixture([B]),
        rqp_rule_cert_fixture,
        del_dict(scope, B, _, NoScope),
        Rejected = B.put(_{binding: "rejected", reason: "bad", scope: "intent"}),
        del_dict(reason, Rejected, _, RejectedNoReason),
        forall(member(ReqId-Key-Kind-Recorded-Expected, [
                   'REQ-C'-'K-SET'-exhaustive-Rejected-[binding-rejected, reason-bad, scope-intent],
                   'REQ-C'-'K-SET'-exhaustive-RejectedNoReason-[binding-rejected, reason-'rejected at ingest',
                                                                 scope-intent],
                   'REQ-C'-'K-OTHER'-exhaustive-B.put(_{claim_key: "K-OTHER", scope: "intent"})-
                       [binding-rejected, reason-'K-OTHER is not a claim of REQ-C', scope-intent],
                   'REQ-C'-'K-SET'-arithmetic-B.put(scope, "intent")-
                       [binding-rejected,
                        reason-'F-SET is a set fact, which an arithmetic certificate cannot express (use exhaustive, typecheck, rule or state_machine)',
                        scope-intent],
                   'REQ-C'-'K-SET'-exhaustive-B.put(fact_id, "F-OLD")-
                       [binding-rejected,
                        reason-'K-SET is now grounded by F-SET, not the fact the receipt was ingested against',
                        scope-code],
                   'REQ-C'-'K-SET'-exhaustive-NoScope.put(binding, "bogus")-
                       [binding-rejected, reason-'the claim has no derivable obligation; re-prove the test',
                        scope-code],
                   'REQ-C'-'K-SET'-exhaustive-NoScope-[binding-derived, scope-code],
                   'REQ-Q'-'K-Q'-exhaustive-_{claim_key: "K-Q", requirement_id: "REQ-Q", binding: "attested",
                                               scope: "intent"}-[binding-attested, scope-intent],
                   'REQ-Q'-'K-Q'-exhaustive-_{claim_key: "K-Q", requirement_id: "REQ-Q", binding: "derived",
                                               scope: "intent"}-
                       [binding-rejected, reason-'the claim has no derivable obligation; re-prove the test',
                        scope-intent]
               ]),
               (   rqp_judged(ReqId, Key, Kind, Recorded, Canon),
                   Canon = dict(Pairs),
                   exclude(rqp_test_or_kind, Pairs, Got),
                   (   Got == Expected -> true
                   ;   format(user_error, "~q gave ~q~n", [Recorded, Got]), fail
                   )
               ))
    )).

rqp_test_or_kind(test-_).
rqp_test_or_kind(kind-_).

:- end_tests(requirement_proof_open_queries).

%% rqp_bare_receipt(+Version, -Receipt)
% A receipt dict holding the fields receipt_evidence_dict/6 copies.
rqp_bare_receipt(Version, _{version: Version, receipt_id: "PR-00000001", outcome: "passed",
                            code_snapshot: "c", environment_hash: "e", started_at: "s",
                            finished_at: "f", artifact_digest: "d"}).

%% rqp_evidence_extras(+Receipt, +State, -Extras)
% The keys of Receipt's only evidence beyond the ones every receipt gets,
% with their values.
rqp_evidence_extras(Receipt, State, Extras) :-
    findall(E, requirement_proof:receipt_evidence_dict('T-1', unit, Receipt, State, 0, E), [Evidence]),
    dict_pairs(Evidence, _, Pairs),
    exclude(rqp_common_evidence_pair, Pairs, Extras).

rqp_common_evidence_pair(Key-_) :-
    memberchk(Key, [testId, state, scope, receiptId, outcome, codeSnapshot, environmentHash,
                    startedAt, finishedAt, artifactDigest, ageSeconds]).

:- begin_tests(requirement_proof_receipt_fields, [setup(rqp_forget_memo)]).

test(only_v2_receipts_carry_a_kind) :-
    rqp_bare_receipt("kibi.proof-receipt.v1", V1),
    rqp_evidence_extras(V1.put(kind, "typecheck"), passed, E1),
    E1 == [],
    rqp_bare_receipt("kibi.proof-receipt.v2", V2),
    rqp_evidence_extras(V2.put(kind, "typecheck"), passed, E2),
    E2 == [evidenceLevel-tested, kind-typecheck],
    rqp_evidence_extras(V2, passed, E3),
    E3 == [].

% Only a passed receipt that claims proved has its certificate rechecked;
% without a certificate the recheck rejects it.
test(only_passed_proved_receipts_are_rechecked) :-
    rqp_bare_receipt("kibi.proof-receipt.v2", V2),
    Proved = V2.put(_{kind: "typecheck", evidence_level: "proved"}),
    rqp_evidence_extras(Proved, failed, E1),
    E1 == [evidenceLevel-tested, kind-typecheck],
    rqp_evidence_extras(V2.put(_{kind: "typecheck", evidence_level: "tested"}), passed, E2),
    E2 == [evidenceLevel-tested, kind-typecheck],
    rqp_evidence_extras(Proved, passed, E3),
    E3 = [certificateRejection-Reason, evidenceLevel-tested, kind-typecheck],
    Reason == "the receipt has no certificate".

test(claim_fields_need_bindings_and_a_certificate_dict) :-
    findall(E, requirement_proof:receipt_claim_fields(_{claim_bindings: [], certificate: "c"}, _{a: 1}, E),
            [E1]),
    same(E1, _{a: 1}),
    Binding = _{claim_key: "K"},
    Cert = _{kind: "typecheck"},
    once(requirement_proof:receipt_claim_fields(_{claim_bindings: [Binding], certificate: Cert}, _{a: 1}, E2)),
    same(E2, _{a: 1, claimBindings: [Binding], certificate: Cert}).

% A property link grounds a claim only through a property fact with a
% claim text.
test(linked_ground_keys_need_the_link_kind_and_a_claim_text) :-
    rqp_kb((
        pf_entity(req, 'REQ-G', [status=open]),
        pf_entity(fact, 'F-PRED', [fact_kind=predicate, subject_key="svc", property_key="p",
            claim_key="K-PRED", claim_text="Is a predicate"]),
        pf_entity(fact, 'F-NOTEXT', [fact_kind=property_value, subject_key="svc", property_key="p",
            claim_key="K-NOTEXT"]),
        pf_entity(fact, 'F-EMPTY', [fact_kind=property_value, subject_key="svc", property_key="p",
            claim_key="K-EMPTY", claim_text=""]),
        pf_entity(fact, 'F-OK', [fact_kind=property_value, subject_key="svc", property_key="p",
            claim_key="K-OK", claim_text="Has both"]),
        forall(member(F, ['F-PRED', 'F-NOTEXT', 'F-EMPTY', 'F-OK']), pf_raw_rel(requires_property, 'REQ-G', F)),
        requirement_proof:linked_ground_keys('REQ-G', Keys),
        Keys == ['K-OK']
    )).

test(cases_report_a_fact_over_the_case_limit) :-
    rqp_kb((
        pf_entity(req, 'REQ-L', [status=open]),
        findall(M, (between(1, 12, N), format(string(M), "m~|~`0t~d~2+", [N])), Members),
        pf_entity(fact, 'F-L12', [fact_kind=property_value, subject_key="svc", property_key="modes",
            operator=eq, value_type=set, value_set=Members, claim_key="K-L", claim_text="Modes are m01 to m12"]),
        pf_raw_rel(requires_property, 'REQ-L', 'F-L12'),
        rqp_stage_context(C),
        once(requirement_proof:cases_stage('REQ-L', _{scenarios: []}, _{tests: []}, C, Stage)),
        get_dict(limitReached, Stage, Limit),
        Limit == true,
        length(Stage.cases, 12)
    )).

:- end_tests(requirement_proof_receipt_fields).

:- begin_tests(requirement_proof_fact_and_symbol_lookups, [setup(rqp_forget_memo)]).

% Only a predicate fact, or a property fact with a boolean value, has no
% dimension; another fact kind with a boolean value type still does.
test(only_predicate_and_boolean_property_facts_are_dimensionless) :-
    rqp_kb((
        pf_entity(fact, 'F-PRED', [fact_kind=predicate]),
        pf_entity(fact, 'F-BOOL', [fact_kind=property_value, value_type=bool]),
        pf_entity(fact, 'F-INT', [fact_kind=property_value, value_type=int]),
        pf_entity(fact, 'F-RULE', [fact_kind=rule, value_type=bool]),
        findall(F, (member(F, ['F-PRED', 'F-BOOL', 'F-INT', 'F-RULE']),
                    requirement_proof:dimensionless_fact(F)), Dimensionless),
        Dimensionless == ['F-PRED', 'F-BOOL']
    )).

test(a_missing_symbol_resolves_to_an_unresolved_ref) :-
    rqp_kb((
        findall(R, requirement_proof:symbol_resolution_ref('SYM-NONE', R), [Ref]),
        same(Ref, _{id: 'SYM-NONE', sourceFile: '', sourceLine: 0, sourceColumn: 0, sourceEndLine: 0,
                    sourceEndColumn: 0, role: unresolved, exists: false})
    )).

:- end_tests(requirement_proof_fact_and_symbol_lookups).
