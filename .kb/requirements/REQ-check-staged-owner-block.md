---
title: The staged check gives one block per unowned declaration
status: open
priority: must
required_evidence: tested
semantic_text: kibi check --staged must report each declaration that a commit adds or changes and that no requirement owns as one block that blocks the commit and stands for its manifest, impact-evidence, semantic-review and traceability findings, and the block must list the requirements the rest of its file implements without choosing one, each with a paste-ready kb_upsert input, while the JSON result keeps every underlying finding id.
tags:
  - check
origin:
  kind: agent
  ref: 'Measured on a test project, 2026-11-16: one new unowned function made kibi check --staged print four findings for one cause (3,278 characters). Maintainer decision, 2026-11-16, approving this statement as worded.'
  recorded_at: '2026-11-16T16:50:00.000Z'
  approved_by: maintainer
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 05acec2c4ff475f5a22df1e9826e94de125e4489bd8bc887cec7a71ef1d1ad5c
semantic_inventory:
  - claim_key: CLAIM-0CAF1909C54C2FB1
    claim_text: kibi check --staged must report each declaration that a commit adds or changes and that no requirement owns as one block that blocks the commit and stands for its manifest, impact-evidence, semantic-review and traceability findings, and the block must list the requirements the rest of its file implements without choosing one, each with a paste-ready kb_upsert input, while the JSON result keeps every underlying finding id
    role: normative
    status: modeled
    span:
      start: 0
      end: 424
logic_claims:
  - CLAIM-0CAF1909C54C2FB1
id: REQ-check-staged-owner-block
type: req
---
kibi check --staged must report each declaration that a commit adds or changes and that no requirement owns as one block that blocks the commit and stands for its manifest, impact-evidence, semantic-review and traceability findings, and the block must list the requirements the rest of its file implements without choosing one, each with a paste-ready kb_upsert input, while the JSON result keeps every underlying finding id.

## Why

One cause printed as four findings, with placeholders like REQ-<area>-<behavior>, cost an agent about 4,000 characters and still left it to find the owner, although the staged check had already computed the requirements that own the rest of the file. One block with those candidates and an input it can run turns the refusal into one decision: which requirement, if any, states what the code does. Kibi never picks one, because a link chosen only to pass the gate records intent nobody stated.

## Context

The block is modeled on the firm-edit gate message. A type, interface or enum gets a type-shape record payload instead, since it needs no requirement link. Findings that also name other declarations are printed as before.

## Source

> Measured on a test project, 2026-11-16: one new unowned function made kibi check --staged print four findings for one cause (3,278 characters).