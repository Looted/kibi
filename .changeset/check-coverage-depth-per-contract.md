---
"kibi-cli": patch
"kibi-core": patch
---

`kibi check` no longer reports `coverage_depth_review` for a requirement whose passing end-to-end receipt is still current. Check judged receipts against the whole-workspace snapshot, so any unrelated change after `kibi prove` (a migration, an edit elsewhere) made them read as stale, while `kibi coverage` and `kibi proof explain` already used the per-contract binding and showed the requirement as proved. Check now uses the same binding.
