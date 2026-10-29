% Mutalog configuration for `bun run test:mutation:prolog`
% (scripts/run-prolog-mutation.pl). See docs/mutation-testing.md.
%
% The lane covers modules with hermetic plunit files: the logic IR
% interpreter, the numeric interval procedure, unit canonicalization and the
% symbol classification tables.
% Like the Stryker lanes it gates at 100%: every mutant is killed or
% suppressed as an equivalent.

mutate([
    "packages/core/src/logic_ir.pl",
    "packages/core/src/intervals.pl",
    "packages/core/src/units.pl",
    "packages/core/src/symbol_classification.pl"
]).
tests([
    "packages/core/tests/logic_ir.plt",
    "packages/core/tests/intervals.plt",
    "packages/core/tests/units.plt",
    "packages/core/tests/symbol_classification.plt"
]).

% Equivalent mutants are suppressed in the source, with a
% `% mutalog-disable-next-line <operator>: <reason>` comment above the
% line. Most are cut_insert mutants: a cut inserted after a deterministic
% first goal of a clause no later clause can also match, which can change
% neither the answers nor their number.

thresholds(high(100), low(90), break(100)).
report_dir("reports/mutation/prolog").
