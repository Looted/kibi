---
title: Deleting dead implements comments is not a firm-requirement edit
status: open
priority: must
tags:
  - hooks
  - traceability
  - implements-comments
semantic_text: An agent host hook must not treat an edit that only deletes inline implements comments as an edit of a firm requirement's code.
origin:
  kind: agent
  ref: Post-release review of Kibi 2026.11.2, 2026-11-12
  approved_by: maintainer
  recorded_at: '2026-11-12T14:15:24.583Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: bdcee676ea598ae46881479bff12ff07cc020ecbd18bcac9a83e11ee6dbfd565
semantic_inventory:
  - claim_key: CLAIM-3C5CD74267F9A999
    claim_text: An agent host hook must not treat an edit that only deletes inline implements comments as an edit of a firm requirement's code
    role: normative
    status: modeled
    span:
      start: 0
      end: 126
    reason: Grounded by FACT-dead-implements-comment-deletion-not-firm-edit via requires_property.
logic_claims:
  - CLAIM-3C5CD74267F9A999
id: REQ-dead-implements-comment-deletion
type: req
required_evidence: tested
---
An agent host hook must not treat an edit that only deletes inline implements comments as an edit of a firm requirement's code.

## Context

Kibi stopped reading inline `implements` comments in 2.43, and `kibi migrate` asks for them to be deleted. Every edit that removed such a comment from a file with firm requirements was put to a person for confirmation, so the cleanup `kibi migrate` asks for could not finish unattended. A comment Kibi does not read changes no behaviour, so it is not the change the confirmation exists for. This holds for a replacement edit, a whole-file write and an `apply_patch` edit alike. Any other change in the same edit keeps the confirmation. A shell command that rewrites the file is not exempt, because the hook cannot see what it changes.

## Source

Post-release review of Kibi 2026.11.2 (2026-11-12).
