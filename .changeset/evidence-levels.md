---
"kibi-core": minor
"kibi-cli": minor
"kibi-runtime": minor
"kibi-mcp": minor
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

Every requirement now reports how strong the evidence behind it is, and passing end-to-end tests are no longer called proof.

- `kb_coverage` / `kibi coverage` rows carry `evidenceLevel`: `proved` (a re-checkable certificate covers every case; no proof kind issues one yet, so nothing reaches it today), `tested` (fresh end-to-end receipts cover every linked scenario), `asserted` (a person stands behind the requirement: it was approved, or it is firm by `firmness` or a non-agent origin, but nothing current checks it) or `unverified` (an agent wrote it and no person approved it). Each row lists the `evidence[]` entries that earned the level, with `kind`, `scope` and `level`, and the summary counts rows per level under `evidenceLevels`.
- The HTML report shows each requirement's level next to its id and counts the asserted and unverified requirements; its headline is now "Tested end to end" and the badge reads `% tested`. `kibi signoff` adds the level to each requirement's proof line when it is weaker than tested. The `kibi coverage` table gains an `Evidence` column and prints the per-level counts as `asserted=… proved=… tested=… unverified=…`. `kibi signoff` now counts a top-level `approved_by` as approval, as the evidence level does, so an approved agent requirement no longer shows as awaiting approval.
- The `kibi-usage` skill (2.23.0) explains the levels and tells agents never to report an asserted or unverified requirement as tested or proven.

**Migration (breaking).**

- The requirement proof contract is now `kibi.requirement-proof.v4`. `proofStatus: proven` is renamed `tested`; filter with `--status tested` (`statuses: ["tested"]`), since `proven` is rejected.
- Coverage summaries rename `proofProven` to `proofTested`. `kibi proof impact` results rename `proofProven` / `currentUnproven` to `proofTested` / `currentUntested`, `kb_apply_plan` closeout `proofState: proven` is now `tested`, and the diagnostic usage field `coverage_proven_count` is `coverage_tested_count`.
- `proof/baseline.json` files move to `kibi.proof-baseline.v3` with `proofTested`, `currentUntested` and `proofStatus: tested`. `kibi proof impact` still reads a committed v2 baseline, treating its `proven` rows as `tested`, so rewrite the file in the same commit you upgrade in or the next one.
- No knowledge-base migration is needed: nothing stored in `.kb/` changes.
