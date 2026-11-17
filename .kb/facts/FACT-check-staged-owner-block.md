---
title: The staged check reports each unowned declaration as one blocking block
status: active
fact_kind: property_value
subject_key: kibi.check
property_key: staged_blocks_per_unowned_declaration
operator: eq
value_type: int
value_int: 1
tags:
  - lane:strict
  - fact:property_value
  - check
origin:
  kind: agent
  recorded_at: '2026-11-16T16:50:00.000Z'
claim_key: CLAIM-0CAF1909C54C2FB1
claim_text: kibi check --staged must report each declaration that a commit adds or changes and that no requirement owns as one block that blocks the commit and stands for its manifest, impact-evidence, semantic-review and traceability findings, and the block must list the requirements the rest of its file implements without choosing one, each with a paste-ready kb_upsert input, while the JSON result keeps every underlying finding id
text_ref: REQ-check-staged-owner-block
id: FACT-check-staged-owner-block
type: fact
---
Each declaration a commit adds or changes that no requirement owns is printed as exactly one [BLOCKS COMMIT] block with its candidate owners and their kb_upsert inputs. Grounds the clause of REQ-check-staged-owner-block.