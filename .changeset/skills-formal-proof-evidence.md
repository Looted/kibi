---
"kibi-runtime": patch
"kibi-cli": patch
"kibi-codex": patch
"kibi-claude": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

Skills describe evidence levels and floors. kibi-decisions and kibi-bootstrap record an untested firm rule with `required_evidence: asserted` so `kibi check` passes until an end-to-end proof covers it. kibi-traceability and kibi-freshness report `evidenceLevel` and `evidenceFloor` from coverage. The kibi-commit-review staged gate reference lists `kb-consistency` and notes that `evidence-floor` runs only in a full check. The kibi-usage receipt workflow runs `kibi prove` and appends `kibi.proof-receipt.v2` receipts instead of deriving them by hand.
