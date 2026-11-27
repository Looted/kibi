---
title: A busy file's snippet names the requirements it cannot show
status: open
priority: must
firmness: default
required_evidence: tested
tags:
  - hooks
  - edit-snippets
origin:
  kind: agent
  ref: 'Maintainer approval of the benchmark-driven capture, lookup and hook fixes, statement 6 of 8: ''Approve all''.'
  approved_by: maintainer
  recorded_at: '2026-11-24T20:00:18.684Z'
rationale: In the crowded-store benchmark the snippet of a busy file hid most of its requirements behind a count such as +4 more, so the agent edited without knowing which rules applied.
semantic_text: When a file's edit snippet cannot show every linked requirement in full, it must name the ids of the requirements it leaves out, unless its character budget is too small for the names.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 8cce31bf5e7fee6292da07f36628c20d180bfd8f231a4fcb0ea353355d0c2f2c
semantic_inventory:
  - claim_key: CLAIM-121D278459F76825
    claim_text: When a file's edit snippet cannot show every linked requirement in full, it must name the ids of the requirements it leaves out, unless its character budget is too small for the names
    role: condition
    status: modeled
    span:
      start: 0
      end: 183
    subjects:
      - kibi.host.edit_snippets
logic_claims:
  - CLAIM-121D278459F76825
id: REQ-edit-snippet-names-hidden-requirements
type: req
---
When a file's edit snippet cannot show every linked requirement in full, it must name the ids of the requirements it leaves out, unless its character budget is too small for the names.

## Context

In the crowded-store benchmark the snippet of a busy file hid most of its requirements behind a count such as +4 more, so the agent edited without knowing which rules applied.

## Source

> Maintainer approval of the benchmark-driven capture, lookup and hook fixes, statement 6 of 8: 'Approve all'.
