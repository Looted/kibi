---
title: Relationship-only requirement upserts keep the stored proposition ledger
status: open
priority: must
tags:
  - upsert
  - semantic-inventory
  - scenarios
rationale: Test project onboarding failed to link 96 scenarios to existing requirements because each specified_by upsert had to resend the full semantic inventory.
semantic_text: A requirement upsert without semantic ledger fields and with unchanged prose must keep the stored proposition ledger. A requirement upsert that supplies semantic ledger fields or changes the prose must be checked exactly as sent.
semantic_clauses:
  - A requirement upsert without semantic ledger fields and with unchanged prose must keep the stored proposition ledger.
  - A requirement upsert that supplies semantic ledger fields or changes the prose must be checked exactly as sent.
logic_claims:
  - CLAIM-602AFB15929288C8
  - CLAIM-D364342C4FE42BC0
origin:
  kind: agent
  ref: 'Piotr thread 2026-10-06: test project onboarding round 3 (advisor roles, relationship upserts, review observations)'
  recorded_at: '2026-10-06T20:44:05.993Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: c132efe3f77bdb76837f528610507f724c8cc088a9b6aee0bfb48b44a1d345ce
semantic_inventory:
  - claim_key: CLAIM-602AFB15929288C8
    claim_text: A requirement upsert without semantic ledger fields and with unchanged prose must keep the stored proposition ledger
    role: normative
    span:
      start: 0
      end: 116
    status: modeled
  - claim_key: CLAIM-D364342C4FE42BC0
    claim_text: A requirement upsert that supplies semantic ledger fields or changes the prose must be checked exactly as sent
    role: normative
    span:
      start: 118
      end: 228
    status: modeled
id: REQ-kibi-upsert-preserves-requirement-semantics
type: req
---
A requirement upsert without semantic ledger fields and with unchanged prose must keep the stored proposition ledger. A requirement upsert that supplies semantic ledger fields or changes the prose must be checked exactly as sent.
