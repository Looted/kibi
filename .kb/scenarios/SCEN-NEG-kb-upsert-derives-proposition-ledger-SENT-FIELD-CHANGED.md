---
title: A requirement write that sends a ledger field is checked with that field as sent
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-15T20:24:04.204Z'
id: SCEN-NEG-kb-upsert-derives-proposition-ledger-SENT-FIELD-CHANGED
type: scenario
---
Given a requirement write that sends semantic_source_hash (or any of semantic_inventory_version, semantic_source_field and logic_claims) with a value for other prose, when kb_upsert checks it, then the inventory check judges the sent value, refuses the write and leaves the file unchanged; replacing the sent field with a derived one would hide that the writer read stale prose.

packages/cli/tests/operations/mutation.test.ts and packages/cli/tests/operations-mutation/mutation/requirement-semantics.test.ts exercise it.