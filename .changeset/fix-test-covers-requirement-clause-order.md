---
"kibi-core": patch
---

Symbol-coverage checks no longer false-flag production symbols when other requirements in the same knowledge base have scenarios. Previously, the direct req→test fallback path evaluated negation before binding the requirement ID, so populated graphs could report missing coverage even when `covered_by`, `verified_by`, and semantics were all correct.

- Reorder `test_covers_requirement/2` subgoals in `packages/core/src/kb.pl` so `requirement_verified_by_test/2` binds `Req` before `requirement_test_fallback_allowed/1` runs NAF.
- Add `production_symbol_coverage_works_with_unbound_req_when_other_reqs_have_scenarios` regression test in `packages/core/tests/kb.plt`.
