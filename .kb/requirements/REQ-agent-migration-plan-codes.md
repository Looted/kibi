---
title: Guided migration plan version and step codes
status: open
priority: must
firmness: firm
semantic_text: The guided migration plan version shall be kibi.migration-plan.v2. The predicate schema alignment step code shall be predicate_schema_alignment. The untracked knowledge sources step code shall be untracked_knowledge_sources. The freshness resync step code shall be freshness_resync.
semantic_clauses:
  - The guided migration plan version shall be kibi.migration-plan.v2.
  - The predicate schema alignment step code shall be predicate_schema_alignment.
  - The untracked knowledge sources step code shall be untracked_knowledge_sources.
  - The freshness resync step code shall be freshness_resync.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T18:53:28.662Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 5ed0c587b700c0d109f8aa2c5b0a0ca9ed3e25d665dd4bc8d6c68244228de07a
semantic_inventory:
  - claim_key: CLAIM-00012BE9F8DC0BFA
    claim_text: The guided migration plan version shall be kibi.migration-plan.v2
    role: normative
    status: modeled
    span:
      start: 0
      end: 65
  - claim_key: CLAIM-6EA0FEBFF172026F
    claim_text: The predicate schema alignment step code shall be predicate_schema_alignment
    role: normative
    status: modeled
    span:
      start: 67
      end: 143
  - claim_key: CLAIM-6E45B28D0A8D8DFE
    claim_text: The untracked knowledge sources step code shall be untracked_knowledge_sources
    role: normative
    status: modeled
    span:
      start: 145
      end: 223
  - claim_key: CLAIM-C5952505804918D0
    claim_text: The freshness resync step code shall be freshness_resync
    role: normative
    status: modeled
    span:
      start: 225
      end: 281
logic_claims:
  - CLAIM-00012BE9F8DC0BFA
  - CLAIM-6EA0FEBFF172026F
  - CLAIM-6E45B28D0A8D8DFE
  - CLAIM-C5952505804918D0
id: REQ-agent-migration-plan-codes
type: req
---
The guided migration plan version shall be kibi.migration-plan.v2. The predicate schema alignment step code shall be predicate_schema_alignment. The untracked knowledge sources step code shall be untracked_knowledge_sources. The freshness resync step code shall be freshness_resync.

## Context

packages/cli/src/public/operations/migration-plan.ts versions the plan REQ-agent-guided-migration-orchestration hands an agent and names the steps it can hold beside the schema migration. They are stated here so every value is proved against its constant.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"