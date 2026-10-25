---
"kibi-core": minor
"kibi-cli": minor
---

The proof report, coverage, signoff and `kibi prove` now show the whole evidence ladder, not only the evidence level.

- `kibi report` shows each requirement's evidence floor and whether it is met, below or pending re-proof (`*` marks a floor set by `required_evidence`), a `Proved` badge for proved requirements, a certificate stage naming the proof kinds and claims behind them, and any certificate or claim binding that no longer re-checks. New metrics count requirements below their floor and pending re-proof, new filters select proved, below-floor and pending re-proof requirements, and cards below their floor sort right after contradictions. The badge turns red when a requirement is below its floor.
- `kibi report --certificates <file>` publishes a `kibi check --write-certificates` bundle next to the report and links it. The proof workflow now writes that bundle, re-checks it with `kibi check --certificates`, and publishes it with the report.
- `kibi coverage` adds a Floor column, and the summary counts current requirements with a floor under `evidenceFloors` (`met`, `below`, `pendingReproof`).
- `kibi signoff` names each requirement's floor, says when `required_evidence` set it, and lists certificates that no longer re-check.
- Breaking: the `kibi prove` JSON summary reports passing receipts as `passed` (it was `proved`) and adds `certified`, the passing receipts whose certificate re-checked. Each result carries the contract's `kind`, the `evidenceLevel` the receipt supports and any `certificateRejection`, and stderr names a rejected certificate. `kb_ingest_proof` says "Passed N test(s)" instead of "Proved N test(s)".
