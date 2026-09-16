---
"kibi-cli": minor
---

Per-contract receipt bindings now cover production code, not just the test's own inputs. When `KIBI_PROOF_BINDING_MODE=per-contract` is set, a receipt's binding hash additionally includes the coordinate-recorded source hashes of every symbol the test binds via `proof_bindings` — sorted for stability, so formatting-only reordering changes nothing while any real edit to a bound symbol's source file produces a new hash. Editing the production code behind one test now stales exactly that test's receipts; all other tests keep their valid evidence. No Prolog-side change: the binding hash stays an opaque value the coverage stage compares.

Technical summary: `extractors/manifest.ts` adds `resolveBoundSymbolScope` (proof-bound symbol ids to their `sourceHash` values from the coordinate overlay, canonical ordering); `proof-fingerprint.ts` extends `receiptBindingHash` with the optional code scope (typed `ReceiptCodeScopeEntry[]`); `ingest-proof.ts` and the coverage spec executor resolve the scope from `.kb/symbols.yaml` for the bound symbol ids; two new behavior tests cover scope sensitivity and order invariance.
