:- use_module(library(plunit)).
:- use_module('../src/symbol_classification.pl').

:- begin_tests(symbol_classification).

test(allowed_granularity_reasons) :-
    findall(R, allowed_granularity_reason(R), Rs),
    Rs == ['config-artifact', 'module-level-behavior', 'extractor-miss',
           'legacy-link', 'test-suite'].

test(coarse_granularity_reasons) :-
    findall(R, coarse_granularity_reason(R), Rs),
    Rs == ['config-artifact', 'module-level-behavior', 'extractor-miss',
           'test-suite'].

test(symbol_roles) :-
    findall(R, symbol_role(R), Rs),
    Rs == [behavioral, structural, 'type-shape', config, module, unknown].

test(inferred_roles) :-
    findall(K-R, inferred_role(K, R), Pairs),
    Pairs == [function-behavioral, class-behavioral, method-behavioral,
              property-behavioral, accessor-behavioral,
              interface-'type-shape', type-'type-shape', enum-'type-shape',
              variable-unknown, unknown-unknown].

test(traceability_relationship_types) :-
    findall(T, traceability_relationship_type(T), Ts),
    Ts == [implements, covered_by, executable_for].

:- end_tests(symbol_classification).
