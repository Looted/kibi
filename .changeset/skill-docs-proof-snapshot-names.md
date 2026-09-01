---
"kibi-cli": patch
"kibi-runtime": patch
"kibi-codex": patch
"kibi-cursor": patch
---

Agent-facing skill docs now use the current status field names, so agents following the freshness and E2E receipt workflows look for fields that actually exist in `kb_status` output instead of stale ones.

- Bundled `kibi-freshness` and `kibi-usage` skills (all agent mirrors) now reference `proofSnapshotChanges` and `proofSnapshot` (previously `verificationSnapshotChanges`/`verificationSnapshot` from the pre-proof-architecture status schema).
- The skillopt-eval harness reads `proofSnapshot*` status fields and its held-out eval prompts name the current fields, so "dirty editor path" evidence gathering works against live status output again.

Dry: completes the `verificationSnapshot*` → `proofSnapshot*` rename from the proof architecture change in the surfaces that earlier commit missed.
