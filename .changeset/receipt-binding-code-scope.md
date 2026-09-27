---
"kibi-cli": minor
---

Proof receipts now go stale when the code they vouch for changes. In the default per-contract binding mode, a receipt was meant to stay fresh only until its test's code or the production code behind it changed. In practice the code scope was always empty, so editing production code never marked any receipt stale. Receipts now bind to the current source of the test's own contracted code and of every production symbol linked `covered_by` the test. Edits to unrelated files still leave them fresh.

**Upgrade note:** this changes every receipt's binding hash, so all existing receipts become stale once after upgrading. Run `kibi prove` (for example `kibi prove --all`) to record fresh evidence. Keep `covered_by` links accurate, since they now decide which production code each receipt covers.

- The code scope is the contract's `required_proofs` symbols, any `proof_bindings` symbols, and all symbols linked `covered_by` the test. Receipt ingest and coverage derive it through one shared function (`operations/proof/code-scope.ts`), so they always agree.
- Scope hashes use each symbol's current source-file content, not the coordinate artifact. The coordinate overlay discarded `sourceHash`, which is why the scope was empty, and it also dropped entries after any edit. A deleted source file hashes as `missing`.
- Ingest loads `covered_by` links outside its per-test binding `try`/`catch`, so an engine failure fails the ingest instead of writing receipts without a binding hash.
- File hashes and the manifest's symbol-to-source mapping are cached by modification time and size.
