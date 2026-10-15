---
"kibi-cli": patch
"kibi-mcp": patch
---

Two `kb_upsert` refusals that cost agents extra round trips are gone. Updating a test that already carries proof receipts no longer fails with "proof_receipts are append-only" when the update simply leaves the receipts out; the stored history is kept. A requirement upsert that lacks its semantic inventory now gets the ready contract in the error, so one resend succeeds without a separate `kb_model` call.

- `validateAppendOnlyProofReceipts` returns the stored `proof_receipts` (and the receipt-bound `verification_scope` and `verification_perspective` the payload omits) when an update has no `proof_receipts`; the upsert validates and writes with that history. Sending a changed or shortened history is still refused.
- The `Proposition-complete ingestion failed` error now ends with the JSON contract `kb_model` mode `analyze` returns for the prose (`semantic_inventory_version`, `semantic_source_field`, `semantic_source_hash`, `semantic_inventory`, `logic_claims`), keeping statuses the payload already set for the same `claim_key`.
