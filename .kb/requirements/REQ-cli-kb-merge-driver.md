---
title: kibi merge-driver merges Kibi manifests by record id
status: open
priority: should
tags:
  - cli
  - git
  - merge
  - lane:strict
text_ref: packages/cli/src/commands/merge-driver.ts
semantic_text: Kibi merge-driver must keep every record that either side of a merge added to the symbols manifest or a relationship shard. Kibi merge-driver must apply a record edit or deletion made on a single side. Kibi merge-driver must union the relationships and links that both sides added to the same symbol. Kibi merge-driver must report each field that both sides changed differently, leave conflict markers, and exit non-zero. Kibi merge-driver must reproduce the current manifest byte for byte if the other side changed nothing
semantic_source_field: semantic_text
semantic_source_hash: 245097aee58b2387601050c4876f6d49401d14bf58b1884f7677ea59bde6cea0
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_inventory:
  - claim_key: CLAIM-131544C56C22E57F
    claim_text: Kibi merge-driver must keep every record that either side of a merge added to the symbols manifest or a relationship shard
    role: normative
    status: modeled
    span:
      start: 0
      end: 122
    payload_hash: 0d8e540dfa834b5431ca92f371b0505922e9ac7f3e77be51f7c90ac677ea292d
    reason: Grounded by FACT-cli-kb-merge-driver-keeps-added-records via requires_property.
  - claim_key: CLAIM-A69DA36C5CEF127A
    claim_text: Kibi merge-driver must apply a record edit or deletion made on a single side
    role: normative
    status: modeled
    span:
      start: 124
      end: 200
    payload_hash: 0d8e540dfa834b5431ca92f371b0505922e9ac7f3e77be51f7c90ac677ea292d
    reason: Grounded by FACT-cli-kb-merge-driver-applies-single-side-changes via requires_property.
  - claim_key: CLAIM-D485CB4AD5AA4F80
    claim_text: Kibi merge-driver must union the relationships and links that both sides added to the same symbol
    role: normative
    status: modeled
    span:
      start: 202
      end: 299
    payload_hash: 0d8e540dfa834b5431ca92f371b0505922e9ac7f3e77be51f7c90ac677ea292d
    reason: Grounded by FACT-cli-kb-merge-driver-unions-concurrent-links via requires_property.
  - claim_key: CLAIM-5726B98D50309CB5
    claim_text: Kibi merge-driver must report each field that both sides changed differently, leave conflict markers, and exit non-zero
    role: normative
    status: modeled
    span:
      start: 301
      end: 420
    payload_hash: 0d8e540dfa834b5431ca92f371b0505922e9ac7f3e77be51f7c90ac677ea292d
    reason: Grounded by FACT-cli-kb-merge-driver-reports-real-conflicts via requires_property.
  - claim_key: CLAIM-54D6B7040A561A93
    claim_text: Kibi merge-driver must reproduce the current manifest byte for byte if the other side changed nothing
    role: normative
    status: modeled
    span:
      start: 422
      end: 523
    payload_hash: 0d8e540dfa834b5431ca92f371b0505922e9ac7f3e77be51f7c90ac677ea292d
    reason: Grounded by FACT-cli-kb-merge-driver-reproduces-unchanged-bytes via requires_property.
logic_claims:
  - CLAIM-131544C56C22E57F
  - CLAIM-A69DA36C5CEF127A
  - CLAIM-D485CB4AD5AA4F80
  - CLAIM-5726B98D50309CB5
  - CLAIM-54D6B7040A561A93
id: REQ-cli-kb-merge-driver
type: req
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Kibi merge-driver must keep every record that either side of a merge added to the symbols manifest or a relationship shard. Kibi merge-driver must apply a record edit or deletion made on a single side. Kibi merge-driver must union the relationships and links that both sides added to the same symbol. Kibi merge-driver must report each field that both sides changed differently, leave conflict markers, and exit non-zero. Kibi merge-driver must reproduce the current manifest byte for byte if the other side changed nothing
