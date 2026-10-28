---
title: Proof receipt versions and fingerprint parts
status: open
priority: must
firmness: firm
semantic_text: The first proof receipt version shall be kibi.proof-receipt.v1. A readable proof receipt version shall be kibi.proof-receipt.v1 or kibi.proof-receipt.v2. An execution fingerprint part shall be contract, integration, command, bindings or producer. The prove progress file shall be prove-progress.json. The proof integration setup step shall be proof_integration_configure.
semantic_clauses:
  - The first proof receipt version shall be kibi.proof-receipt.v1.
  - A readable proof receipt version shall be kibi.proof-receipt.v1 or kibi.proof-receipt.v2.
  - An execution fingerprint part shall be contract, integration, command, bindings or producer.
  - The prove progress file shall be prove-progress.json.
  - The proof integration setup step shall be proof_integration_configure.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T21:18:59.847Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: f0a1d88d8d15e54ae1cc8b6914c284bc088c8b87b6328669bda123db8bb83794
semantic_inventory:
  - claim_key: CLAIM-661EF1D4E168CEBE
    claim_text: The first proof receipt version shall be kibi.proof-receipt.v1
    role: normative
    status: modeled
    span:
      start: 0
      end: 62
  - claim_key: CLAIM-9B1355E63FA003A4
    claim_text: A readable proof receipt version shall be kibi.proof-receipt.v1 or kibi.proof-receipt.v2
    role: normative
    status: modeled
    span:
      start: 64
      end: 152
  - claim_key: CLAIM-33F263FA86E31124
    claim_text: An execution fingerprint part shall be contract, integration, command, bindings or producer
    role: normative
    status: modeled
    span:
      start: 154
      end: 245
  - claim_key: CLAIM-AE741E93C98A613D
    claim_text: The prove progress file shall be prove-progress.json
    role: normative
    status: modeled
    span:
      start: 247
      end: 299
  - claim_key: CLAIM-69759DA98345DD8E
    claim_text: The proof integration setup step shall be proof_integration_configure
    role: normative
    status: modeled
    span:
      start: 301
      end: 370
logic_claims:
  - CLAIM-661EF1D4E168CEBE
  - CLAIM-9B1355E63FA003A4
  - CLAIM-33F263FA86E31124
  - CLAIM-AE741E93C98A613D
  - CLAIM-69759DA98345DD8E
id: REQ-kibi-proof-receipt-format
type: req
---
The first proof receipt version shall be kibi.proof-receipt.v1. A readable proof receipt version shall be kibi.proof-receipt.v1 or kibi.proof-receipt.v2. An execution fingerprint part shall be contract, integration, command, bindings or producer. The prove progress file shall be prove-progress.json. The proof integration setup step shall be proof_integration_configure.

## Context

REQ-kibi-fresh-verification-receipts keeps receipts readable across versions and binds each receipt to an execution fingerprint built from named parts. kibi prove records its progress in a fixed file, and a missing integration is set up by a named plan step. They are stated here so every value is proved against its constant.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"