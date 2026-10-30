---
title: Proof protocol versions and run outcomes
status: open
priority: must
firmness: firm
semantic_text: The proof contract version shall be kibi.proof-contract.v1. The proof receipt version shall be kibi.proof-receipt.v2. The proof run version shall be kibi.proof-run.v1. The proof integration version shall be kibi.proof-integration.v1. A proof run outcome shall be passed, failed, errored, cancelled, timed_out, interrupted or no_results.
semantic_clauses:
  - The proof contract version shall be kibi.proof-contract.v1.
  - The proof receipt version shall be kibi.proof-receipt.v2.
  - The proof run version shall be kibi.proof-run.v1.
  - The proof integration version shall be kibi.proof-integration.v1.
  - A proof run outcome shall be passed, failed, errored, cancelled, timed_out, interrupted or no_results.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T12:02:42.988Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 5d4efc1c285cb36061db498170fa3cb0a84e443a433b137b7fdf33d4fd3f18fa
semantic_inventory:
  - claim_key: CLAIM-C6F779A76BBB4581
    claim_text: The proof contract version shall be kibi.proof-contract.v1
    role: normative
    status: modeled
    span:
      start: 0
      end: 58
  - claim_key: CLAIM-3F7C7D6130772E14
    claim_text: The proof receipt version shall be kibi.proof-receipt.v2
    role: normative
    status: modeled
    span:
      start: 60
      end: 116
  - claim_key: CLAIM-BC55CA4697B8540B
    claim_text: The proof run version shall be kibi.proof-run.v1
    role: normative
    status: modeled
    span:
      start: 118
      end: 166
  - claim_key: CLAIM-4CAA4B4BC92F633B
    claim_text: The proof integration version shall be kibi.proof-integration.v1
    role: normative
    status: modeled
    span:
      start: 168
      end: 232
  - claim_key: CLAIM-85C47F78B8ECB253
    claim_text: A proof run outcome shall be passed, failed, errored, cancelled, timed_out, interrupted or no_results
    role: normative
    status: modeled
    span:
      start: 234
      end: 335
logic_claims:
  - CLAIM-C6F779A76BBB4581
  - CLAIM-3F7C7D6130772E14
  - CLAIM-BC55CA4697B8540B
  - CLAIM-4CAA4B4BC92F633B
  - CLAIM-85C47F78B8ECB253
id: REQ-kibi-proof-protocol-versions
type: req
---
The proof contract version shall be kibi.proof-contract.v1. The proof receipt version shall be kibi.proof-receipt.v2. The proof run version shall be kibi.proof-run.v1. The proof integration version shall be kibi.proof-integration.v1. A proof run outcome shall be passed, failed, errored, cancelled, timed_out, interrupted or no_results.

## Context

packages/cli/src/public/proof-protocol.ts versions every proof document REQ-kibi-verification-evidence-contract defines (contracts, receipts, runs and integrations) and closes the list of outcomes a proof run can report. They are stated here so each is proved against the constant.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"