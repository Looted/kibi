---
title: An unlinked file's note uses the request's words and never reads as an all-clear
status: open
required_evidence: tested
priority: must
tags:
  - hooks
  - claude-code
  - impact
semantic_text: The kibi-claude edit hook note for a file that no symbol links to a requirement must rank candidate requirements by the words of the person's latest request as well as the file's path words. When no requirement title matches, that note must say that nothing recorded is known to cover the file and that a decision made for it is recorded with kb_upsert before the work is reported done.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 4d3c633546298bd31bae22ad19eebd52967c98bbe4b453f3b55c5a40f36d25e1
semantic_inventory:
  - claim_key: CLAIM-47266D4F9300D29C
    claim_text: The kibi-claude edit hook note for a file that no symbol links to a requirement must rank candidate requirements by the words of the person's latest request as well as the file's path words
    role: normative
    status: modeled
    span:
      start: 0
      end: 189
  - claim_key: CLAIM-A8082CB756DADF55
    claim_text: When no requirement title matches, that note must say that nothing recorded is known to cover the file and that a decision made for it is recorded with kb_upsert before the work is reported done
    role: condition
    status: modeled
    span:
      start: 191
      end: 385
logic_claims:
  - CLAIM-47266D4F9300D29C
  - CLAIM-A8082CB756DADF55
origin:
  kind: agent
  recorded_at: '2026-10-14T16:57:45.254Z'
id: REQ-claude-request-topic-candidates
type: req
---
The kibi-claude edit hook note for a file that no symbol links to a requirement must rank candidate requirements by the words of the person's latest request as well as the file's path words. When no requirement title matches, that note must say that nothing recorded is known to cover the file and that a decision made for it is recorded with kb_upsert before the work is reported done.

## Context

When a file had no linked symbol and no requirement title shared its path words, the edit note said only that nothing was linked, and agents read it as no rule applying. The request usually names the behavior in words the path does not carry.

## Source

Reason not stated beyond the observed misreading of the note.
