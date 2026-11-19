---
title: A kb_check rule selection lists its findings in pages
status: open
priority: must
required_evidence: tested
semantic_text: A kb_check with a rule selection must list its findings in pages that keep to the size budget.
tags:
  - result-budget
origin:
  kind: agent
  ref: 'Measured on Kibi''s own KB, 2026-11-19: kb_coverage returned 5 MB by default and 21 MB with limit 500, past another host''s 8 MiB tool-result cap, and kb_query and kb_find_gaps calls ran past its 60-second timeout. Maintainer decision, 2026-11-19, approving this statement as worded.'
  recorded_at: '2026-11-19T16:00:00.000Z'
  approved_by: maintainer
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: adf50b4dc1fb93be082a14449b4a35959333465dd2b6b3ce8f82da264277c814
semantic_inventory:
  - claim_key: CLAIM-39953DCBB67B4A87
    claim_text: A kb_check with a rule selection must list its findings in pages that keep to the size budget
    role: normative
    status: modeled
    span:
      start: 0
      end: 93
logic_claims:
  - CLAIM-39953DCBB67B4A87
rationale: A rule selection with thousands of findings listed in full broke the result budget; pages keep every finding reachable through offset, and kibi check --format json still lists every finding at once.
id: REQ-check-rule-selection-pages
type: req
---
A kb_check with a rule selection must list its findings in pages that keep to the size budget.

## Why

A rule selection with thousands of findings listed in full broke the result budget; pages keep every finding reachable through offset, and kibi check --format json still lists every finding at once.

## Context

pageCheckFindings lists findings from offset while they fit and names the next offset. This supersedes the part of REQ-check-unscoped-budget's context that said a rule selection lists every finding.

## Source

> Measured on Kibi's own KB, 2026-11-19: kb_coverage returned 5 MB by default and 21 MB with limit 500, past another host's 8 MiB tool-result cap, and kb_query and kb_find_gaps calls ran past its 60-second timeout.
