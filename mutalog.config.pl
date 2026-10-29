% Mutalog configuration for `bun run test:mutation:prolog`
% (scripts/run-prolog-mutation.pl). See docs/mutation-testing.md.
%
% The lane covers the logic IR interpreter, whose plunit file is hermetic.
% Like the Stryker lanes it gates at 100%: every mutant is killed or
% suppressed as an equivalent.

mutate(["packages/core/src/logic_ir.pl"]).
tests(["packages/core/tests/logic_ir.plt"]).

% Equivalent mutants are suppressed in logic_ir.pl itself, with a
% `% mutalog-disable-next-line <operator>: <reason>` comment above the
% line. Today they are all cut_insert mutants: a cut inserted after a
% deterministic first goal of a clause no later clause can also match,
% which can change neither the answers nor their number.

thresholds(high(100), low(90), break(100)).
report_dir("reports/mutation/prolog").
