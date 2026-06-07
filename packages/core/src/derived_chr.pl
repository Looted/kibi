% Module: derived_chr
% Internal CHR pilot for bounded derived validation facts.

:- module(derived_chr, [
    derive_chr_facts/0,
    clear_chr_facts/0,
    derived_coverage_gap/2,
    derived_symbol_gap/2
]).

:- use_module(library(chr)).
:- use_module('kb.pl').

:- chr_constraint seen_must_req/1, seen_scenario/1, seen_test/1,
    seen_production_symbol/1, seen_symbol_req_coverage/1.

:- dynamic derived_coverage_gap/2.
:- dynamic derived_symbol_gap/2.
:- dynamic snapshot_must_req/1.
:- dynamic snapshot_scenario/1.
:- dynamic snapshot_test/1.
:- dynamic snapshot_production_symbol/1.
:- dynamic snapshot_symbol_req_coverage/1.

seen_must_req(Req) <=> assertz(snapshot_must_req(Req)).
seen_scenario(Req) <=> assertz(snapshot_scenario(Req)).
seen_test(Req) <=> assertz(snapshot_test(Req)).
seen_production_symbol(Symbol) <=> assertz(snapshot_production_symbol(Symbol)).
seen_symbol_req_coverage(Symbol) <=> assertz(snapshot_symbol_req_coverage(Symbol)).

clear_chr_facts :-
    retractall(derived_coverage_gap(_, _)),
    retractall(derived_symbol_gap(_, _)),
    retractall(snapshot_must_req(_)),
    retractall(snapshot_scenario(_)),
    retractall(snapshot_test(_)),
    retractall(snapshot_production_symbol(_)),
    retractall(snapshot_symbol_req_coverage(_)).

derive_chr_facts :-
    clear_chr_facts,
    forall(kb:must_requirement(Req), seen_must_req(Req)),
    forall(kb:has_scenario(Req), seen_scenario(Req)),
    forall(kb:has_test(Req), seen_test(Req)),
    forall(kb:production_symbol(Symbol), seen_production_symbol(Symbol)),
    forall(kb:production_symbol_covered_for_requirement(Symbol, _), seen_symbol_req_coverage(Symbol)),
    derive_coverage_gaps,
    derive_symbol_gaps.

derive_coverage_gaps :-
    forall(
        (   snapshot_must_req(Req),
            \+ snapshot_scenario(Req),
            \+ snapshot_test(Req)
        ),
        assertz(derived_coverage_gap(Req, missing_scenario_and_test))
    ).

derive_symbol_gaps :-
    forall(
        (   snapshot_production_symbol(Symbol),
            \+ snapshot_symbol_req_coverage(Symbol)
        ),
        assertz(derived_symbol_gap(Symbol, no_qualifying_production_coverage))
    ).
