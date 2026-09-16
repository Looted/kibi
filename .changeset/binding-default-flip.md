---
"kibi-cli": minor
---

Per-contract receipt binding is now the default. Every prove campaign writes receipts with a binding hash (contract + receipt-stripped test document + bound-symbol source hashes), and coverage matches receipts by that binding — so editing an unrelated file, requirement, or piece of symbol metadata no longer invalidates the repository's proof evidence, and editing one test's contract, document, or its bound production code stales exactly that test. Set `KIBI_PROOF_BINDING_MODE=strict-snapshot` to opt out and restore whole-snapshot matching. Receipts written before this change keep their snapshot semantics until each contract is re-proven, so no existing evidence is invalidated by the flip itself.

Technical summary: `reporting.ts` exports `currentProofBindingMode` (default `per_contract`, `strict-snapshot` opt-out) and the coverage executor hands the Prolog stage the per-test binding dict by default; the strict equality / ratchet baseline semantics are unchanged by this slice.
