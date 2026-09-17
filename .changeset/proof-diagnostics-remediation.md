---
"kibi-core": patch
"kibi-cli": patch
"kibi-runtime": patch
"kibi-codex": patch
"kibi-cursor": patch
---

Proof diagnostics now agree with the Prolog decision: a structural type-shape unit contract is shown as qualifying, `kibi proof impact` compares against the Git HEAD baseline and exits 0 after a successful report, and mixed-role symbols fail the strict proof integrity gate.

- Mode-aware candidate evaluation in Prolog; receipt fallback uses `test_receipt_evidence(Context, TestId, Evidence)`.
- `proof impact` reads `HEAD:proof/baseline.json` with no worktree fallback; diagnostic exit 0.
- Strict proof workflow and baseline checker include canonical `symbol-traceability`.
