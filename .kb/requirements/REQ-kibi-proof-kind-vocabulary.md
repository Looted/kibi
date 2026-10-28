---
title: Proof contract kind vocabulary
status: open
priority: should
firmness: firm
semantic_text: A proof contract kind must be one of e2e, example, property, exhaustive, typecheck, arithmetic, smt, rule, state_machine, regex or source.
semantic_clauses:
  - A proof contract kind must be one of e2e, example, property, exhaustive, typecheck, arithmetic, smt, rule, state_machine, regex or source.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T13:38:27.175Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 4de9456d851a71800d31daf30b9e0936538e2fad2d9948e84bf0d7fd88c6bcf0
semantic_inventory:
  - claim_key: CLAIM-AEDC5DE05A243DB4
    claim_text: A proof contract kind must be one of e2e, example, property, exhaustive, typecheck, arithmetic, smt, rule, state_machine, regex or source
    role: normative
    status: modeled
    span:
      start: 0
      end: 137
logic_claims:
  - CLAIM-AEDC5DE05A243DB4
id: REQ-kibi-proof-kind-vocabulary
type: req
---
A proof contract kind must be one of e2e, example, property, exhaustive, typecheck, arithmetic, smt, rule, state_machine, regex or source.

## Context

REQ-kibi-code-proof-kinds closes the list of proof contract kinds Kibi accepts. PROOF_KINDS in packages/cli/src/public/proof-protocol.ts holds that list, and an exhaustive certificate proves the closed set against it.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"