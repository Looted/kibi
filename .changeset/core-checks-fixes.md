---
"kibi-core": patch
---

Fix several aggregated checks in `checks.pl`:

- A full `kibi check` now runs `related-requirement-unmodeled`. Before, only a check that selected the rule by name reported it.
- `strict-req-fact-pairing` and `predicate-verifiability` now report a link to a legacy fact (one with no `fact_kind`) once. Before, the same link was also reported as "a fact_kind=legacy fact".
- `semantic-completeness` now names an unclassified ledger entry by its `claim_key`. Before, the message printed the whole entry, and its text changed from run to run.
- The unused `run_checks_json/0` entry point is removed. It could not encode any violation.
