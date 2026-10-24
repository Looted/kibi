---
title: Files without linked symbols get candidate requirements, not silence
status: open
required_evidence: tested
priority: must
tags:
  - hooks
  - impact
firmness: default
semantic_text: Kibi must name the current requirements whose titles share the path words of a file that no symbol links to a requirement, in the edit hook note for that file and in an impact kb_check scoped to it. Kibi must state in that note and that check result that a file without a linked symbol may still be governed by a recorded rule.
semantic_clauses:
  - Kibi must name the current requirements whose titles share the path words of a file that no symbol links to a requirement, in the edit hook note for that file and in an impact kb_check scoped to it
  - Kibi must state in that note and that check result that a file without a linked symbol may still be governed by a recorded rule
logic_claims:
  - CLAIM-E58AE914BF83ABF0
  - CLAIM-81A6C1B98D14914C
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 01f263af489ec570521dd36a2968da6f855f457b960f21160b89a02ed0c001a8
semantic_inventory:
  - claim_key: CLAIM-E58AE914BF83ABF0
    claim_text: Kibi must name the current requirements whose titles share the path words of a file that no symbol links to a requirement, in the edit hook note for that file and in an impact kb_check scoped to it
    role: normative
    status: modeled
    span:
      start: 0
      end: 197
  - claim_key: CLAIM-81A6C1B98D14914C
    claim_text: Kibi must state in that note and that check result that a file without a linked symbol may still be governed by a recorded rule
    role: normative
    status: modeled
    span:
      start: 199
      end: 326
origin:
  kind: agent
  recorded_at: '2026-10-14T09:45:42.451Z'
id: REQ-kb-unowned-file-candidates
type: req
---
Kibi must name the current requirements whose titles share the path words of a file that no symbol links to a requirement, in the edit hook note for that file and in an impact kb_check scoped to it. Kibi must state in that note and that check result that a file without a linked symbol may still be governed by a recorded rule.

## Context

An agent changed a page whose behavior a recorded requirement governs, but no symbol in the page was linked to it. The edit hook said nothing in the file was linked and a kb_check scoped to the file returned nothing, and the agent read both as "no rule applies". The vocabulary also differed: the requirement said coach inbox, the code and task said coach dashboard. Naming the requirements whose titles share the path's words turns that silence into candidates the agent can confirm with kb_query and link. The match is lexical, so the candidates are prompts to check, never owners.
