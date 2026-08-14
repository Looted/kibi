---
"kibi-cli": patch
"kibi-core": patch
"kibi-codex": patch
"kibi-cursor": patch
---

Verification contracts can now evolve without forcing projects to erase valid historical test evidence. Kibi preserves every earlier receipt, accepts a newly appended receipt for the current contract, and only treats evidence matching both the current contract and live code snapshot as proof.

- Separate immutable receipt-history validation from current-contract binding during verification ingest.
- Report `verification_contract_mismatch` as an explicit proof gap until current-contract evidence is appended.
- Teach the usage skill and SkillOpt evaluator to preserve older-contract receipts and forbid history rewrites.
