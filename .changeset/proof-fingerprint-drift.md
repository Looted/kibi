---
"kibi-core": minor
"kibi-cli": minor
"kibi-mcp": patch
---

A proof receipt recorded before a proof integration's command, artifact, targets, options or producer changed is now reported as `stale_proof_receipt`, as the proving guide already described, and `kibi prove`, `kibi coverage`, `kb_coverage` and `kibi proof explain` name which fingerprint components changed (`fingerprintDrift`). After upgrading, run `kibi prove --stale` if coverage reports a stale receipt for a test whose integration changed since its last proof. Behaviour change: such receipts no longer count as current evidence.

Coverage hands the engine each test's current execution fingerprint components under a reserved key of the per-contract bindings, so a Kibi CLI and engine of different versions keep working: an engine without the key ignores it and a CLI without it skips the check. `kibi prove` also appends the drifted component names to the fingerprint-mismatch error. Usage diagnostics list `fingerprintDrift` in coverage receipt gap details.
