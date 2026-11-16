---
title: kibi-usage carries the core arc and keeps topic guidance in resources
status: open
priority: must
required_evidence: tested
semantic_text: 'The kibi-usage skill body must stay under 4,500 characters. The kibi-usage skill body must teach only the core arc: choose the interface, search for prior intent, edit, record the decision, check, and commit. Topic guidance must live in the kibi-usage skill''s listed resources.'
rationale: kibi-usage is the first skill every host and the MCP instructions point an agent to, and its body had grown to 55,000 characters (about 13,800 tokens) that every session loading it paid for, most of it about modeling topics a single change never needs. Keeping the body to the arc an agent follows on every change, with second-agent edits, the predicate decision tree, requirement size, domain subjec
tags:
  - skills
  - agent-guidance
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-16, approving the W4 statements as worded in the statement file (decision card, 17:53Z). Requested as: Maintainer request, 2026-11-16: shrink kibi-usage to a core arc of about 4k characters with the topic sections as resources, replace "never open any file under .kb" in kibi-commit-review with "do not edit .kb files by hand; staging .kb is expected", and drop the dry-run, write and read-back ritual as the default.'
  recorded_at: '2026-11-16T16:00:00.000Z'
  approved_by: maintainer
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 0f6ce42256a2ee07b0002c3043d9b962a95aae043b0fb79b678b00f3ca2a4f5c
semantic_inventory:
  - claim_key: CLAIM-A97B02E33FDDCE55
    claim_text: The kibi-usage skill body must stay under 4,500 characters
    role: normative
    status: modeled
    span:
      start: 0
      end: 58
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-D8A2918988223113
    claim_text: 'The kibi-usage skill body must teach only the core arc: choose the interface, search for prior intent, edit, record the decision, check, and commit'
    role: normative
    status: modeled
    span:
      start: 60
      end: 207
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-380970496FBC4BA5
    claim_text: Topic guidance must live in the kibi-usage skill's listed resources
    role: normative
    status: modeled
    span:
      start: 209
      end: 276
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-A97B02E33FDDCE55
  - CLAIM-D8A2918988223113
  - CLAIM-380970496FBC4BA5
id: REQ-kibi-usage-core-arc
type: req
---
The kibi-usage skill body must stay under 4,500 characters. The kibi-usage skill body must teach only the core arc: choose the interface, search for prior intent, edit, record the decision, check, and commit. Topic guidance must live in the kibi-usage skill's listed resources.

## Context

kibi-usage is the first skill every host and the MCP instructions point an agent to, and its body had grown to 55,000 characters (about 13,800 tokens) that every session loading it paid for, most of it about modeling topics a single change never needs. Keeping the body to the arc an agent follows on every change, with second-agent edits, the predicate decision tree, requirement size, domain subjects, hook snippets and quantified claims one kb_skills read away, keeps the cost proportional to the task. Paragraphs written for single evaluation cases were removed rather than moved.

## Source

> Maintainer request, 2026-11-16: shrink kibi-usage to a core arc of about 4k characters with the topic sections as resources, replace "never open any file under .kb" in kibi-commit-review with "do not edit .kb files by hand; staging .kb is expected", and drop the dry-run, write and read-back ritual as the default.