% Report-only Mutalog configuration for `bun run test:mutation:prolog:backlog`
% (scripts/run-prolog-mutation.pl --config mutalog.backlog.config.pl). See
% docs/mutation-testing.md.
%
% Modules whose survivors are not yet triaged. break(0) never fails the run.
% Once a module's survivors are killed or listed as equivalents, move it to
% mutalog.config.pl, which gates at 100%.

mutate(["packages/core/src/kb.pl"]).
tests([ "packages/core/tests/logic_ir.plt",
        "packages/core/tests/kb.plt"
      ]).
thresholds(high(80), low(60), break(0)).
report_dir("reports/mutation/prolog-backlog").
