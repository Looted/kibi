---
title: Operation query page sizes and entity types
status: open
priority: must
firmness: firm
semantic_text: An entity query shall load at most 25 entities per chunk. A proof contract page shall hold at most 100 contracts. A search candidate page shall hold at most 500 candidates. A query shall return at most 32000 characters of an entity body. The Kibi operation protocol version shall be 1. A query entity type shall be req, scenario, test, adr, flag, event, symbol or fact.
semantic_clauses:
  - An entity query shall load at most 25 entities per chunk.
  - A proof contract page shall hold at most 100 contracts.
  - A search candidate page shall hold at most 500 candidates.
  - A query shall return at most 32000 characters of an entity body.
  - The Kibi operation protocol version shall be 1.
  - A query entity type shall be req, scenario, test, adr, flag, event, symbol or fact.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T17:22:16.035Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 86a26bd5394bfbfd69f551774b428ba0c3db4dfb6109774053753008bab33663
semantic_inventory:
  - claim_key: CLAIM-E8EE9A72FD5CF65D
    claim_text: An entity query shall load at most 25 entities per chunk
    role: normative
    status: modeled
    span:
      start: 0
      end: 56
  - claim_key: CLAIM-22447215368AF5E5
    claim_text: A proof contract page shall hold at most 100 contracts
    role: normative
    status: modeled
    span:
      start: 58
      end: 112
  - claim_key: CLAIM-3062F5AC4BD8143B
    claim_text: A search candidate page shall hold at most 500 candidates
    role: normative
    status: modeled
    span:
      start: 114
      end: 171
  - claim_key: CLAIM-15878CC317A04D96
    claim_text: A query shall return at most 32000 characters of an entity body
    role: normative
    status: modeled
    span:
      start: 173
      end: 236
  - claim_key: CLAIM-F3C71A8D77F9F412
    claim_text: The Kibi operation protocol version shall be 1
    role: normative
    status: modeled
    span:
      start: 238
      end: 284
  - claim_key: CLAIM-BF1D7EDFBC9147B1
    claim_text: A query entity type shall be req, scenario, test, adr, flag, event, symbol or fact
    role: normative
    status: modeled
    span:
      start: 286
      end: 368
logic_claims:
  - CLAIM-E8EE9A72FD5CF65D
  - CLAIM-22447215368AF5E5
  - CLAIM-3062F5AC4BD8143B
  - CLAIM-15878CC317A04D96
  - CLAIM-F3C71A8D77F9F412
  - CLAIM-BF1D7EDFBC9147B1
id: REQ-kibi-operation-page-sizes
type: req
---
An entity query shall load at most 25 entities per chunk. A proof contract page shall hold at most 100 contracts. A search candidate page shall hold at most 500 candidates. A query shall return at most 32000 characters of an entity body. The Kibi operation protocol version shall be 1. A query entity type shall be req, scenario, test, adr, flag, event, symbol or fact.

## Context

REQ-kibi-operation-interface-parity has the CLI and the MCP server run the same operations. packages/cli/src/public/operations fixes how those operations page the store, how much of an entity body a query returns, which entity types a query accepts and which protocol version a result envelope carries. They are stated here so every value is proved against its constant.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"