---
"kibi-cli": minor
"kibi-mcp": minor
---

Kibi can now compile a complete change intent into a reviewable, snapshot-bound plan before anything is written, then apply an explicitly approved plan only after rechecking its hash and live snapshots. The new operations reuse intent-aware discovery and semantic modeling, account for every proposition, surface current contradiction witnesses, and keep traceability proposals separate from executable steps until explicitly accepted.

- Add the shared `kb_compile_intent` / `compile-intent` operation and deterministic `kibi.compile-plan.v1` result.
- Add the guarded `kb_apply_plan` / `apply-plan` mutation boundary and `kibi.plan-apply-result.v1` result.
- Add contracted verification ingestion through `kb_ingest_verification`, including snapshot-bound `kibi.verification-receipt.v2` case results.
- Register the operation through the CLI and MCP parity surfaces with contract tests and documentation.
