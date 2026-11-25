---
title: Read and search hooks show the requirements of the code in view
status: open
priority: must
firmness: default
required_evidence: tested
tags:
  - hooks
  - read-rows
origin:
  kind: agent
  ref: 'Maintainer approval of the read and search hook statements built on the Nov 25 cost analysis, statement 1 of 6: ''Approve all as worded''.'
  approved_by: maintainer
  recorded_at: '2026-11-25T14:27:24.421Z'
semantic_text: When the agent reads or searches source code through a read, search or shell tool, every host hook with such an event must show the requirements implemented by the symbols in view, which are the lines read, the lines a search matches, or the whole file when it implements at most 5 requirements, each as one compact row of id, firmness, title and implementing symbol, with the focused symbol's requirements first.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 8e3c0fb23b2389009b8c5863f1c89639beec8f220acc2cf9015389d9c9a5f114
semantic_inventory:
  - claim_key: CLAIM-257FD9480ADB62E6
    claim_text: When the agent reads or searches source code through a read, search or shell tool, every host hook with such an event must show the requirements implemented by the symbols in view, which are the lines read, the lines a search matches, or the whole file when it implements at most 5 requirements, each as one compact row of id, firmness, title and implementing symbol, with the focused symbol's requirements first
    role: condition
    status: modeled
    span:
      start: 0
      end: 412
    subjects:
      - kibi.host.read_rows
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-257FD9480ADB62E6
rationale: An agent that grabs a function should get the closest related requirements without being flooded with unrelated ones. In the Nov 25 replay of 180 sessions, rows put the governing decision in front of the agent before any kb_* call in 44 of 81 probes instead of 31, while hook text fell from 927 to 656 characters per session.
id: REQ-hook-read-rows-in-view
type: req
---
When the agent reads or searches source code through a read, search or shell tool, every host hook with such an event must show the requirements implemented by the symbols in view, which are the lines read, the lines a search matches, or the whole file when it implements at most 5 requirements, each as one compact row of id, firmness, title and implementing symbol, with the focused symbol's requirements first.

## Context

An agent that grabs a function should get the closest related requirements without being flooded with unrelated ones. In the Nov 25 replay of 180 sessions, rows put the governing decision in front of the agent before any kb_* call in 44 of 81 probes instead of 31, while hook text fell from 927 to 656 characters per session.

## Source

> Maintainer approval of the read and search hook statements built on the Nov 25 cost analysis, statement 1 of 6: 'Approve all as worded'.
