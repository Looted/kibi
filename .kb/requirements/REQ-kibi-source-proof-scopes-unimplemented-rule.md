---
title: A source proof of every claim stands in for an implementing symbol
status: open
priority: should
required_evidence: tested
tags:
  - proof
  - certificate
  - traceability
semantic_text: A requirement that no symbol implements must pass its production-symbol stage when a passing source proof proves every applicable claim.
origin:
  kind: human
  ref: 'Maintainer, issue 752: "A requirement whose only claims are certified by a passing source proof over a declared file set (a negative or "for all files" property) doesn''t need a production symbol." Included in this release on 2026-11-18: "Yes, please include it in this release."'
  approved_by: maintainer
  recorded_at: '2026-11-18T10:54:37.098Z'
rationale: Teams that keep architecture rules as requirements can't reach a zero-finding gate without adding a false implements link or a waiver. The behavior is that something is absent, so no function or module decides it, and an implements link to one of the files would claim that this one file implements the rule, which is false.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: af4f4a1396f2ed060cf2271b5705996efafcc0ba7ada8395d264292685366b7e
semantic_inventory:
  - claim_key: CLAIM-96AD6117E2C946A9
    claim_text: A requirement that no symbol implements must pass its production-symbol stage when a passing source proof proves every applicable claim
    role: normative
    status: modeled
    span:
      start: 0
      end: 135
logic_claims:
  - CLAIM-96AD6117E2C946A9
id: REQ-kibi-source-proof-scopes-unimplemented-rule
type: req
---
A requirement that no symbol implements must pass its production-symbol stage when a passing source proof proves every applicable claim.

## Context

Teams that keep architecture rules as requirements can't reach a zero-finding gate without adding a false implements link or a waiver. The behavior is that something is absent, so no function or module decides it, and an implements link to one of the files would claim that this one file implements the rule, which is false.

## Source

> Maintainer, issue 752: "A requirement whose only claims are certified by a passing source proof over a declared file set (a negative or "for all files" property) doesn't need a production symbol." Included in this release on 2026-11-18: "Yes, please include it in this release."
