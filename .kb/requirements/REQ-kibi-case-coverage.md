---
title: A rejection case of a typed claim is not tested without a covering scenario
status: open
priority: must
firmness: firm
tags:
  - proof
  - modeling
semantic_text: A current requirement must not reach tested while a rejection case derived from one of its typed property claims has no covering scenario. A grounding fact may record a case waiver, which must count only once a person approves it. The semantic advisor must preview the edge cases of a strict-property suggestion.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 1664443e585b621b59cc97b9163ba3a93f7cacb92592aac40824991d8c7e8f8f
semantic_inventory:
  - claim_key: CLAIM-93B168F145C0BC67
    claim_text: A current requirement must not reach tested while a rejection case derived from one of its typed property claims has no covering scenario
    role: normative
    span:
      start: 0
      end: 137
    status: modeled
  - claim_key: CLAIM-E05F9448AE64EE09
    claim_text: A grounding fact may record a case waiver, which must count only once a person approves it
    role: normative
    span:
      start: 139
      end: 229
    status: modeled
  - claim_key: CLAIM-2F7747EE752B02FE
    claim_text: The semantic advisor must preview the edge cases of a strict-property suggestion
    role: normative
    span:
      start: 231
      end: 311
    status: modeled
logic_claims:
  - CLAIM-93B168F145C0BC67
  - CLAIM-E05F9448AE64EE09
  - CLAIM-2F7747EE752B02FE
origin:
  kind: agent
  ref: 'Maintainer request, 2026-10-29: KB-driven edge-case coverage that blocks tested'
  approved_by: maintainer
  recorded_at: '2026-10-30T15:00:00.000Z'
id: REQ-kibi-case-coverage
type: req
---
A current requirement must not reach tested while a rejection case derived from one of its typed property claims has no covering scenario. A grounding fact may record a case waiver, which must count only once a person approves it. The semantic advisor must preview the edge cases of a strict-property suggestion.

## Context

A requirement can be tested and still break at its edges: a claim that bounds a count or closes a set is often exercised by one happy path and one failure path that never reach the value past the bound or a value outside the set. Once a claim is typed, those value classes follow from it mechanically, so Kibi can derive them, predict which ones the claim refuses, and ask for a scenario that assumes a value in each refused class. Success cases are reported without blocking, since the requirement's success scenarios already reach them. When the cases are covered another way, a grounding fact can carry a waiver a person approves.

## Source

Maintainer request, 2026-10-29, for KB-driven edge-case coverage that blocks tested; this is the case generator step of the agreed plan.
