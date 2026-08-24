---
"kibi-cli": patch
"kibi-codex": patch
---

Kibi now keeps long-lived Prolog discovery responses intact even when JSON is printed across multiple lines, and Codex hook state remains durable under concurrent updates. Coverage runs also produce an auditable source manifest and continue collecting all shards so one failure cannot hide the rest of the signal. This makes the initial coverage floor measurable while leaving a clear path to the 100% target.

- Patch `kibi-cli` for multiline Prolog binding parsing.
- Patch `kibi-codex` for append-only hook-state persistence and deterministic concurrency handling.
