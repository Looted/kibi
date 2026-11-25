---
title: A shell read gets rows from every file it names, focused by its line ranges
status: open
priority: must
firmness: default
required_evidence: tested
tags:
  - hooks
  - read-rows
origin:
  kind: agent
  ref: 'Maintainer approval of the read and search hook statements built on the Nov 25 cost analysis, statement 2 of 6: ''Approve all as worded''.'
  approved_by: maintainer
  recorded_at: '2026-11-25T14:27:48.618Z'
semantic_text: A shell command that reads several linked files must get rows from each of them in one block, and line ranges from sed -n, head, tail and grep -n must focus the rows as a Read tool range does.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 3f799d3b910bee8692cadcacfeae920276ede600bcf54b2f6fa69d0248dd461d
semantic_inventory:
  - claim_key: CLAIM-0AD5C90941D8EA9E
    claim_text: A shell command that reads several linked files must get rows from each of them in one block, and line ranges from sed -n, head, tail and grep -n must focus the rows as a Read tool range does
    role: normative
    status: modeled
    span:
      start: 0
      end: 191
    subjects:
      - kibi.host.read_rows
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-0AD5C90941D8EA9E
rationale: The Nov 25 hook audit found that a shell command naming several files described only the first linked one, and that sed -n, head and tail ranges were ignored, so the agent got the requirements of code it was not looking at.
id: REQ-hook-read-rows-every-named-file
type: req
---
A shell command that reads several linked files must get rows from each of them in one block, and line ranges from sed -n, head, tail and grep -n must focus the rows as a Read tool range does.

## Context

The Nov 25 hook audit found that a shell command naming several files described only the first linked one, and that sed -n, head and tail ranges were ignored, so the agent got the requirements of code it was not looking at.

## Source

> Maintainer approval of the read and search hook statements built on the Nov 25 cost analysis, statement 2 of 6: 'Approve all as worded'.
