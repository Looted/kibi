---
"kibi-core": patch
---

Proof contracts with a boolean or null field (such as a glob source with `capture: true`) no longer read as changed after `kibi prove`. Kibi hashed `true`, `false` and `null` as strings when checking a receipt, so the receipt's contract hash never matched, the test counted as a contract mismatch and the claims it proves stayed tested.
