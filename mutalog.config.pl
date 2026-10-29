% Mutalog configuration for `bun run test:mutation:prolog`
% (scripts/run-prolog-mutation.pl). See docs/mutation-testing.md.
%
% The lane starts with the logic IR interpreter, whose plunit file is
% small and hermetic. It reports only: break(0) never fails the run.

mutate(["packages/core/src/logic_ir.pl"]).
tests(["packages/core/tests/logic_ir.plt"]).
thresholds(high(80), low(60), break(0)).
report_dir("reports/mutation/prolog").
