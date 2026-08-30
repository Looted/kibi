---
"kibi-cli": patch
---

Proof workflows no longer wedge tests that collect a lot of verification history. Running `kibi verify` many times on the same contracted test could push its receipt history past the 50-entry storage cap, leaving the test entity permanently invalid — `kibi check` flagged it, and no mutation could repair it because receipts are append-only. Verification ingest now rotates the oldest receipts at the cap, so the newest evidence is always kept and the test stays valid; the append-only rule still forbids rewriting or shrinking history, and only permits the exact cap-rotation shape ingest produces.

- Rotation only triggers when appending would exceed the cap, drops the minimum number of oldest entries, and preserves the 49 newest historical receipts verbatim.
- `appendOnlyVerificationReceiptHistoryErrors` accepts only that exact rotation shape; pruning without appending, multi-receipt replacement, and below-cap trimming remain rejected.
