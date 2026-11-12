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
  ref: 'Maintainer request, 2026-11-12, after the review of release 2026.11.2 reported the findings: "Well, can you make a PR with a hotfix then?" and "Yes, do all post review work in the hotfix."; wording approved by the maintainer, 2026-11-12: "Approve"'
  approved_by: maintainer
  recorded_at: '2026-11-12T14:23:49.572Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: bdcee676ea598ae46881479bff12ff07cc020ecbd18bcac9a83e11ee6dbfd565
semantic_inventory:
  - claim_key: CLAIM-3C5CD74267F9A999
    claim_text: An agent host hook must not treat an edit that only deletes inline implements comments as an edit of a firm requirement's code
    role: normative
    status: missing
    span:
      start: 0
      end: 126
logic_claims:
  - CLAIM-3C5CD74267F9A999
id: REQ-dead-implements-comment-deletion
type: req
required_evidence: tested
---
An agent host hook must not treat an edit that only deletes inline implements comments as an edit of a firm requirement's code.

## Context

Kibi stopped reading inline `implements` comments in 2.43, and `kibi migrate` asks for them to be deleted. In the sandbox runs of the 2026.11.2 review, a headless agent removing those comments from a file with firm requirements was stopped by the confirmation at every edit, so the cleanup the migration asks for could not finish. A comment Kibi does not read changes no behaviour, so it is not the change the confirmation exists for. Any other change in the same edit keeps the confirmation. A shell command that rewrites the file is not exempt, because the hook cannot see what it changes.

## Source

> Well, can you make a PR with a hotfix then?

> Yes, do all post review work in the hotfix.

Maintainer, 2026-11-12, in reply to the review of release 2026.11.2.
