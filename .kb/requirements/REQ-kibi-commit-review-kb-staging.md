---
title: kibi-commit-review forbids hand edits of .kb and expects staging it
status: open
priority: must
required_evidence: tested
semantic_text: The kibi-commit-review skill must tell the agent not to edit .kb files by hand and that staging .kb files with the change is expected.
rationale: The skill told agents never to open any file under .kb while its own steps asked them to git add .kb, so an agent following one instruction broke the other. Hand edits are what bypass validation; staging the files Kibi wrote is how the change reaches the commit gate.
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
semantic_source_hash: 90e9332e070ba8ddcc6b585375e9896e2ecf7746faf8d81bbc80ffcdda27b634
semantic_inventory:
  - claim_key: CLAIM-45317A79BC469FF4
    claim_text: The kibi-commit-review skill must tell the agent not to edit .kb files by hand and that staging .kb files with the change is expected
    role: normative
    status: modeled
    span:
      start: 0
      end: 133
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-45317A79BC469FF4
id: REQ-kibi-commit-review-kb-staging
type: req
---
The kibi-commit-review skill must tell the agent not to edit .kb files by hand and that staging .kb files with the change is expected.

## Context

The skill told agents never to open any file under .kb while its own steps asked them to git add .kb, so an agent following one instruction broke the other. Hand edits are what bypass validation; staging the files Kibi wrote is how the change reaches the commit gate.

## Source

> Maintainer request, 2026-11-16: shrink kibi-usage to a core arc of about 4k characters with the topic sections as resources, replace "never open any file under .kb" in kibi-commit-review with "do not edit .kb files by hand; staging .kb is expected", and drop the dry-run, write and read-back ritual as the default.