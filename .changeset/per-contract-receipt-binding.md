---
"kibi-cli": minor
"kibi-core": minor
---

Proof receipts learn what they actually depend on. Opting in with `KIBI_PROOF_BINDING_MODE=per-contract`, each receipt now records a `binding_hash` — a digest of the test's proof contract plus its receipt-stripped authored document — and stays valid while that pair is unchanged, even as unrelated files, requirements, or symbol metadata change around it. A KB-only edit (a new covered_by link, a coordinate refresh) no longer invalidates every receipt in the repository, ending the re-prove-everything treadmill: only the tests whose own contract or document changed go stale, and a scoped `kibi prove --requirement …` refreshes exactly those. The default remains today's strict whole-snapshot binding; per-contract mode is strictly opt-in until it bakes in, and receipts written by older builds keep their snapshot semantics.

Technical summary: `proof-fingerprint.ts` adds `receiptBindingHash` (contract hash + sha256 over the receipt-stripped document, versioned domain tag); `ingest-proof.ts` writes the optional `binding_hash` field at ingest; `proof-receipt.ts` accepts it as optional in schema and shape validation; `requirement_proof.pl` gains `requirement_proof_context/6` (binding mode + TestBindings dict) with `receipt_for_current_mode/4` selecting receipts by binding hash and falling back to snapshot matching for receipts without a binding hash; `discovery.pl` exposes `coverage_report_json/12` threading the mode and dict through; the coverage spec executor computes the bindings dict only when the opt-in env is set.
