% Mutalog configuration for `bun run test:mutation:prolog`
% (scripts/run-prolog-mutation.pl). See docs/mutation-testing.md.
%
% The lane covers modules with hermetic plunit files: the logic IR
% interpreter, the numeric interval procedure, unit canonicalization, the
% symbol classification tables, the CHR coverage pilot, the SPARQL client,
% KB consistency findings, certificates, requirement edge cases, the rule
% registry, status freshness, the entity and relationship schema, code
% certificates and their independent checker, model checks, claim
% obligations, semantic quality and the KB store itself.
% Like the Stryker lanes it gates at 100%: every mutant is killed or
% suppressed as an equivalent.

mutate([
    "packages/core/src/logic_ir.pl",
    "packages/core/src/intervals.pl",
    "packages/core/src/units.pl",
    "packages/core/src/symbol_classification.pl",
    "packages/core/src/derived_chr.pl",
    "packages/core/src/sparql_client.pl",
    "packages/core/src/kb_consistency.pl",
    "packages/core/src/certificates.pl",
    "packages/core/src/cases.pl",
    "packages/core/src/rule_registry.pl",
    "packages/core/src/status.pl",
    "packages/core/schema/validation.pl",
    "packages/core/schema/entities.pl",
    "packages/core/schema/relationships.pl",
    "packages/core/src/code_certificates.pl",
    "packages/core/src/certificate_check.pl",
    "packages/core/src/model_check.pl",
    "packages/core/src/claim_obligations.pl",
    "packages/core/src/semantic_quality.pl",
    "packages/core/src/kb.pl"
]).
tests([
    "packages/core/tests/logic_ir.plt",
    "packages/core/tests/intervals.plt",
    "packages/core/tests/units.plt",
    "packages/core/tests/symbol_classification.plt",
    "packages/core/tests/derived_chr.plt",
    "packages/core/tests/sparql_client.plt",
    "packages/core/tests/kb_consistency.plt",
    "packages/core/tests/certificates.plt",
    "packages/core/tests/cases.plt",
    "packages/core/tests/rule_registry.plt",
    "packages/core/tests/status.plt",
    "packages/core/tests/entities.plt",
    "packages/core/tests/relationships.plt",
    "packages/core/tests/validation.plt",
    "packages/core/tests/code_certificates.plt",
    "packages/core/tests/certificate_check.plt",
    "packages/core/tests/model_check.plt",
    "packages/core/tests/claim_obligations.plt",
    "packages/core/tests/semantic_quality.plt",
    "packages/core/tests/kb.plt"
]).

% Equivalent mutants are suppressed in the source, with a
% `% mutalog-disable-next-line <operator>: <reason>` comment above the
% line. Most are cut_insert mutants: a cut inserted after a deterministic
% first goal of a clause no later clause can also match, which can change
% neither the answers nor their number.

thresholds(high(100), low(90), break(100)).
report_dir("reports/mutation/prolog").
