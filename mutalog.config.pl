% Mutalog configuration for `bun run test:mutation:prolog`
% (scripts/run-prolog-mutation.pl). See docs/mutation-testing.md.
%
% The lane covers the logic IR interpreter and the KB core. It reports
% only: break(0) never fails the run. kb.pl's report is mostly survivors
% until kb.plt gains tests for them.

mutate([ "packages/core/src/logic_ir.pl",
         "packages/core/src/kb.pl"
       ]).
tests([ "packages/core/tests/logic_ir.plt",
        "packages/core/tests/kb.plt"
      ]).
thresholds(high(80), low(60), break(0)).
report_dir("reports/mutation/prolog").
