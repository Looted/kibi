---
title: A search shows rows only for a few requirements its matches fall in
status: open
priority: must
firmness: default
required_evidence: tested
tags:
  - hooks
  - read-rows
origin:
  kind: agent
  ref: 'Maintainer approval of the read and search hook statements built on the Nov 25 cost analysis, statement 3 of 6: ''Approve all as worded''.'
  approved_by: maintainer
  recorded_at: '2026-11-25T14:28:06.759Z'
semantic_text: A Grep tool call or shell grep must get rows only when its matches fall inside symbols that implement requirements and at most 6 requirements qualify, showing the 3 with the most matching lines, and a file-name search (Glob) must get none.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 8ce042e9451514b19e014d8dd7b46bedd9db8fbc3942017a73f7835d93909206
semantic_inventory:
  - claim_key: CLAIM-562E9A046F1F12DF
    claim_text: A Grep tool call or shell grep must get rows only when its matches fall inside symbols that implement requirements and at most 6 requirements qualify, showing the 3 with the most matching lines, and a file-name search (Glob) must get none
    role: normative
    status: modeled
    span:
      start: 0
      end: 238
    subjects:
      - kibi.host.read_rows
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-562E9A046F1F12DF
rationale: The Nov 25 cost analysis found that a broad search touching many requirements would flood the agent with rows it did not ask about, while a narrow search that lands in a governed symbol is the moment the rule helps most; Glob only lists names.
id: REQ-hook-search-rows
type: req
---
A Grep tool call or shell grep must get rows only when its matches fall inside symbols that implement requirements and at most 6 requirements qualify, showing the 3 with the most matching lines, and a file-name search (Glob) must get none.

## Context

The Nov 25 cost analysis found that a broad search touching many requirements would flood the agent with rows it did not ask about, while a narrow search that lands in a governed symbol is the moment the rule helps most; Glob only lists names.

## Source

> Maintainer approval of the read and search hook statements built on the Nov 25 cost analysis, statement 3 of 6: 'Approve all as worded'.
