---
"kibi-core": patch
---

Coverage reports and contradiction checks on a knowledge base with many rule facts no longer take minutes. The contradiction-witness pass re-read every `predicate_schema` fact for each opposing rule pair, so on a KB with a few hundred rule facts and a few thousand facts one `coverage_report_json` call spent over 90% of its time there and ran past the 120 s query timeout (`kibi report` failed in CI). It now reads the functional declarations once per pass; on that KB the call drops from about 150 s to about 11 s with byte-identical output.

- `kibi-core`: new `logic_rule_conflict_witness/4` takes the functional declarations; `/3` keeps its behavior and reads them itself. `check_domain_contradiction_witnesses/1` reads them once and passes them to every pair, as `search_answer_verdicts_json/2` already did.
