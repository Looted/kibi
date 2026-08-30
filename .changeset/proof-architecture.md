---
"kibi-cli": major
"kibi-mcp": major
"kibi-runtime": major
"kibi-opencode": major
"kibi-codex": major
"kibi-cursor": major
---

Kibi's proof layer is now runner-neutral: any test runner, script, or harness can prove requirements, and Playwright is no longer built into the proof model.

- `kibi prove` replaces `kibi verify` as the single command to run configured proof producers and record evidence. Proof contracts (`kibi.proof-contract.v1`) declare explicit obligations (`symbol_id` + `target`) executed by a configured integration in `.kb/proof/integrations.json`; `kibi proof inspect` discovers test infrastructure deterministically; one producer run can satisfy many test contracts, and re-ingestion is idempotent.
- Evidence moves to the `kibi.proof-run.v1` artifact (typed environment, run-level outcome, factual attempt history with `native_case`/`aggregate_run` provenance) evaluated into `kibi.proof-receipt.v1` receipts bound to the live snapshot, contract hash, and effective execution fingerprint. Command proof is the universal fallback, so every project can prove requirements without a first-party framework adapter; strict first-attempt policy never upgrades unknown attempt history into passing evidence.
- Breaking removals: `kibi verify`, `kb_ingest_verification`, `kibi.playwright-run.v1`, `verification_contract`/`verification_receipts` entity fields (replaced by `proof_contract`/`proof_bindings`/`proof_receipts`), the `required_case_symbols`×`required_projects` Cartesian contract, and `retries` fields. Migrate by re-running `kibi prove` after bootstrap configures proof for your repository.

DRY: hard cutover to the proof-evidence protocol across CLI, MCP, runtime skills, Prolog proof evaluation, coverage/repair/report surfaces, agent skills, and repository self-proof (packed e2e steps now execute through `kibi prove --all`).
