---
title: Skills teach a kb_upsert write as one call, without a default dry run or read-back
status: open
priority: must
required_evidence: tested
semantic_text: Kibi skills must present a kb_upsert write as one call whose result reports what was written; a dry run is an optional preview, and an exact read-back is not a default step.
rationale: The skills taught every write as a dry run, the write and an exact read-back, three calls where the write result already returns what was written, its warnings and its typed nextActions. The dry run stays available as a preview for a payload the agent is unsure of.
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
semantic_source_hash: 3a9fb49ec1d8956697a8c7223811be2b8f89ac20bcf1ebafcbe3584938c7acf4
semantic_inventory:
  - claim_key: CLAIM-01ECC094D1B7225F
    claim_text: Kibi skills must present a kb_upsert write as one call whose result reports what was written
    role: normative
    status: modeled
    span:
      start: 0
      end: 92
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-C91CFA53E5E58B9E
    claim_text: a dry run is an optional preview, and an exact read-back is not a default step
    role: descriptive
    status: modeled
    span:
      start: 94
      end: 172
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-01ECC094D1B7225F
  - CLAIM-C91CFA53E5E58B9E
id: REQ-kibi-skills-write-without-ritual
type: req
---
Kibi skills must present a kb_upsert write as one call whose result reports what was written; a dry run is an optional preview, and an exact read-back is not a default step.

## Context

The skills taught every write as a dry run, the write and an exact read-back, three calls where the write result already returns what was written, its warnings and its typed nextActions. The dry run stays available as a preview for a payload the agent is unsure of.

## Source

> Maintainer request, 2026-11-16: shrink kibi-usage to a core arc of about 4k characters with the topic sections as resources, replace "never open any file under .kb" in kibi-commit-review with "do not edit .kb files by hand; staging .kb is expected", and drop the dry-run, write and read-back ritual as the default.