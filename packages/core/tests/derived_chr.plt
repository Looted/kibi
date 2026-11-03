:- use_module(library(plunit)).
:- use_module('../src/derived_chr.pl').
:- use_module(kb_fixture).

% Requirements: GAP owes coverage and has none; SCEN has a scenario with a
% test; SCENONLY has an untested scenario; TEST has a test only; SHOULD is
% not must-priority. Symbols: BARE has no
% coverage; COVERED is covered through a scenario of SCEN.
derived_fixture :-
    fixture_entity(req, 'REQ-GAP', [priority=must]),
    fixture_entity(req, 'REQ-SCEN', [priority=must]),
    fixture_entity(req, 'REQ-SCENONLY', [priority=must]),
    fixture_entity(req, 'REQ-TEST', [priority=must]),
    fixture_entity(req, 'REQ-SHOULD', [priority=should]),
    fixture_entity(scenario, 'SCEN-1', []),
    fixture_entity(scenario, 'SCEN-2', []),
    fixture_entity(test, 'TEST-1', []),
    fixture_entity(test, 'TEST-2', []),
    fixture_entity(symbol, 'SYM-BARE', []),
    fixture_entity(symbol, 'SYM-COVERED', []),
    fixture_rel(specified_by, 'REQ-SCEN', 'SCEN-1'),
    fixture_rel(validates, 'TEST-2', 'SCEN-1'),
    fixture_rel(specified_by, 'REQ-SCENONLY', 'SCEN-2'),
    fixture_rel(validates, 'TEST-1', 'REQ-TEST'),
    fixture_rel(covered_by, 'SYM-COVERED', 'TEST-2').

derived_state(State) :-
    findall(Req-Reason, derived_coverage_gap(Req, Reason), Gaps),
    findall(Symbol-Reason, derived_symbol_gap(Symbol, Reason), SymbolGaps),
    findall(X, derived_chr:snapshot_must_req(X), Must),
    findall(X, derived_chr:snapshot_scenario(X), Scenarios),
    findall(X, derived_chr:snapshot_test(X), Tests),
    findall(X, derived_chr:snapshot_production_symbol(X), Symbols),
    findall(X, derived_chr:snapshot_symbol_req_coverage(X), Covered),
    State = state(Gaps, SymbolGaps, Must, Scenarios, Tests, Symbols, Covered).

empty_state(state([], [], [], [], [], [], [])).

stale_facts :-
    assertz(derived_chr:derived_coverage_gap('REQ-STALE', stale)),
    assertz(derived_chr:derived_symbol_gap('SYM-STALE', stale)),
    assertz(derived_chr:snapshot_must_req('REQ-STALE')),
    assertz(derived_chr:snapshot_scenario('REQ-STALE')),
    assertz(derived_chr:snapshot_test('REQ-STALE')),
    assertz(derived_chr:snapshot_production_symbol('SYM-STALE')),
    assertz(derived_chr:snapshot_symbol_req_coverage('SYM-STALE')).

sorted_state(state(A0, B0, C0, D0, E0, F0, G0), state(A, B, C, D, E, F, G)) :-
    maplist(sort, [A0, B0, C0, D0, E0, F0, G0], [A, B, C, D, E, F, G]).

:- begin_tests(derived_chr, [cleanup(clear_chr_facts)]).

test(clear_removes_every_derived_and_snapshot_fact, [cleanup(clear_chr_facts)]) :-
    stale_facts,
    clear_chr_facts,
    derived_state(State),
    empty_state(State).

test(derives_gaps_and_snapshots_from_the_kb, [cleanup(clear_chr_facts)]) :-
    with_fixture_kb((
        derived_fixture,
        stale_facts,
        derive_chr_facts,
        derived_state(State0)
    )),
    sorted_state(State0, State),
    State == state(
        ['REQ-GAP'-missing_scenario_and_test],
        ['SYM-BARE'-no_qualifying_production_coverage],
        ['REQ-GAP', 'REQ-SCEN', 'REQ-SCENONLY', 'REQ-TEST'],
        ['REQ-SCEN', 'REQ-SCENONLY'],
        ['REQ-SCEN', 'REQ-TEST'],
        ['SYM-BARE', 'SYM-COVERED'],
        ['SYM-COVERED']
    ).

test(an_empty_kb_derives_nothing, [cleanup(clear_chr_facts)]) :-
    with_fixture_kb((
        stale_facts,
        derive_chr_facts,
        derived_state(State)
    )),
    empty_state(State).

:- end_tests(derived_chr).
