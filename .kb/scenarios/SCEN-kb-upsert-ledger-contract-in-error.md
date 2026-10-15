---
title: The missing-ledger upsert error carries the contract one resend needs
status: active
priority: must
tags:
  - kb
  - upsert
origin:
  kind: agent
  recorded_at: '2026-10-14T17:11:14.721Z'
id: SCEN-kb-upsert-ledger-contract-in-error
type: scenario
---
Given a new requirement whose semantic_text holds two normative sentences and no inventory, when kb_upsert validates it, then the error carries a JSON contract with the inventory version, source field, source hash, one ledger entry per proposition and the assertive claim keys, and resending the payload with that contract merged into its properties passes the ledger check.

This exists because each ledger refusal cost an agent a separate kb_model round trip to obtain values Kibi had already computed.
