---
title: A test update that omits its proof receipts keeps them
status: active
priority: must
tags:
  - kb
  - upsert
origin:
  kind: agent
  recorded_at: '2026-10-14T17:11:11.847Z'
id: SCEN-kb-upsert-keeps-omitted-proof-receipts
type: scenario
---
Given a test whose stored entity carries a proof receipt and verification_scope end_to_end, when kb_upsert (dry run or write) sends only its title and status, then the write is valid, the preview keeps the receipt and the scope, and the authored file's receipts are unchanged.

Given the same test, when kb_upsert sends a receipt history that changes or drops a stored receipt, then the write is still refused as append-only.

This exists because agents renaming or relinking a test were refused with 'proof_receipts is append-only and cannot be removed', although an update keeps every property it leaves out.
