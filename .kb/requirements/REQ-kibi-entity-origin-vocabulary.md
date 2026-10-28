---
title: Entity origin kinds and review rules
status: open
priority: must
firmness: firm
semantic_text: An entity origin kind shall be human, agent, migration or import. The schema 6 migration origin reference shall be kibi migrate v5->v6. The origin review rules shall be exception-unapproved, exception-approval-self-attested, agent-requirement-unapproved and requirement-rationale-missing.
semantic_clauses:
  - An entity origin kind shall be human, agent, migration or import.
  - The schema 6 migration origin reference shall be kibi migrate v5->v6.
  - The origin review rules shall be exception-unapproved, exception-approval-self-attested, agent-requirement-unapproved and requirement-rationale-missing.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T11:00:38.524Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 91573115bc088ca7df6f6027f07bd2743966849f132befeb45e28b16999df685
semantic_inventory:
  - claim_key: CLAIM-A508A2A195ECC6DD
    claim_text: An entity origin kind shall be human, agent, migration or import
    role: normative
    status: modeled
    span:
      start: 0
      end: 64
  - claim_key: CLAIM-5327F315B5A837CF
    claim_text: The schema 6 migration origin reference shall be kibi migrate v5->v6
    role: normative
    status: modeled
    span:
      start: 66
      end: 134
  - claim_key: CLAIM-F224C3BF5AE9F4B9
    claim_text: The origin review rules shall be exception-unapproved, exception-approval-self-attested, agent-requirement-unapproved and requirement-rationale-missing
    role: normative
    status: modeled
    span:
      start: 136
      end: 287
logic_claims:
  - CLAIM-A508A2A195ECC6DD
  - CLAIM-5327F315B5A837CF
  - CLAIM-F224C3BF5AE9F4B9
id: REQ-kibi-entity-origin-vocabulary
type: req
---
An entity origin kind shall be human, agent, migration or import. The schema 6 migration origin reference shall be kibi migrate v5->v6. The origin review rules shall be exception-unapproved, exception-approval-self-attested, agent-requirement-unapproved and requirement-rationale-missing.

## Context

REQ-kibi-entity-origin records who wrote each entity with an origin kind from a closed list, stamps entities the schema 6 migration backfilled with a fixed reference, and reports unreviewed origins under its own check rules. Each is stated here so it is proved against the constant.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"