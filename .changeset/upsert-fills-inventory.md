---
"kibi-cli": minor
"kibi-mcp": minor
"kibi-runtime": minor
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

Writing a requirement no longer takes a second round trip to supply its proposition ledger. The ledger's mechanical parts (claim keys, spans, source hash, logic claims) follow from the prose, so Kibi now derives them, and the writer supplies only its judgment: the status and subjects of the claims it classifies. A claim is recorded `modeled` only when the write links a fact for it, and `missing` when nobody classified it, so the KB still says which claims no one has looked at and the checks that flag unmodeled claims still apply. A ledger sent with its contract fields is still checked exactly as sent. Committed writes also return a much smaller reply.

- `kb_upsert`, `kb_validate_upsert` and `dryRun` derive `semantic_inventory_version`, `semantic_source_field`, `semantic_source_hash`, `logic_claims` and every `semantic_inventory` entry when the proposition-complete boundary would otherwise refuse the write and none of the four scalar fields is sent. A claim keeps the `status` and `subjects` of the write's own `semantic_inventory` entry for its `claim_key`, else the stored ledger's, else `missing`; an entry for a claim key the prose does not state is refused. The new `inventoryApplied` result field lists each claim (`claim_key`, `role`, `status`, `claim_text`, and `advisor_status` when the advisor reads a `missing` claim as `ambiguous` or `ontology_gap`).
- Refusals now tell the writer to leave the scalar fields out instead of resending the whole contract.
- A committed `kb_upsert` reports the advisor's verdict (readiness, lane, coverage, next tools, summary) instead of the full per-clause receipt; `kb_validate_upsert`, `dryRun` and `kb_model` mode `analyze` still return it in full.
- The `claim-subject-missing` warning now says the requirement is recorded and names the next step, instead of reading as a failed write.
- kibi-usage 2.49.0: the second-agent requirement recipe sends only the claims it classifies.
