---
title: A row larger than the budget is cut and names what it left out
status: open
priority: must
required_evidence: tested
semantic_text: A single row larger than the size budget must be cut to the budget and name the parts it left out.
tags:
  - result-budget
origin:
  kind: agent
  ref: 'Measured on Kibi''s own KB, 2026-11-19: kb_coverage returned 5 MB by default and 21 MB with limit 500, past another host''s 8 MiB tool-result cap, and kb_query and kb_find_gaps calls ran past its 60-second timeout. Maintainer decision, 2026-11-19, approving this statement as worded.'
  recorded_at: '2026-11-19T16:00:00.000Z'
  approved_by: maintainer
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 90030182847392bae6aae4fd1fd77aae332dff54b08154281053f0e49879e4e4
semantic_inventory:
  - claim_key: CLAIM-1B67B009E51B6536
    claim_text: A single row larger than the size budget must be cut to the budget and name the parts it left out
    role: normative
    status: modeled
    span:
      start: 0
      end: 97
logic_claims:
  - CLAIM-1B67B009E51B6536
rationale: One oversized row, such as a requirement with every plan batch, would otherwise break the budget or be dropped whole; cutting its largest parts keeps its identity and says where the rest is.
id: REQ-result-budget-row-cut
type: req
---
A single row larger than the size budget must be cut to the budget and name the parts it left out.

## Why

One oversized row, such as a requirement with every plan batch, would otherwise break the budget or be dropped whole; cutting its largest parts keeps its identity and says where the rest is.

## Context

cutRowToBudget removes the largest parts first, keeps the row's id and type, and lists the dotted paths it removed in omittedFields.

## Source

> Measured on Kibi's own KB, 2026-11-19: kb_coverage returned 5 MB by default and 21 MB with limit 500, past another host's 8 MiB tool-result cap, and kb_query and kb_find_gaps calls ran past its 60-second timeout.
