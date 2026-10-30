---
title: kb_check review action ids and codes
status: open
priority: must
firmness: firm
semantic_text: The unapproved agent requirements review action id shall be review-agent-requirements-unapproved. The unapproved agent requirements review code shall be review_agent_requirements_unapproved. The close superseded requirements action id shall be close-superseded-requirements. The close superseded requirements code shall be close_superseded_requirements. The self-attested exception review code shall be review_exception_approval_self_attested. The predicate key arguments review code shall be review_predicate_key_arguments. The missing rationale review action id shall be review-requirement-rationale-missing. The unknown scenario feasibility review code shall be review_scenario_feasibility_unknown.
semantic_clauses:
  - The unapproved agent requirements review action id shall be review-agent-requirements-unapproved.
  - The unapproved agent requirements review code shall be review_agent_requirements_unapproved.
  - The close superseded requirements action id shall be close-superseded-requirements.
  - The close superseded requirements code shall be close_superseded_requirements.
  - The self-attested exception review code shall be review_exception_approval_self_attested.
  - The predicate key arguments review code shall be review_predicate_key_arguments.
  - The missing rationale review action id shall be review-requirement-rationale-missing.
  - The unknown scenario feasibility review code shall be review_scenario_feasibility_unknown.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T20:25:29.913Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 69e360827e934e66f8c0c214beff9ac67a90221055f21c8050ef5d226ba413e5
semantic_inventory:
  - claim_key: CLAIM-466F2FF82989BF7A
    claim_text: The unapproved agent requirements review action id shall be review-agent-requirements-unapproved
    role: normative
    status: modeled
    span:
      start: 0
      end: 96
  - claim_key: CLAIM-B4CE9027C7636ABC
    claim_text: The unapproved agent requirements review code shall be review_agent_requirements_unapproved
    role: normative
    status: modeled
    span:
      start: 98
      end: 189
  - claim_key: CLAIM-A828DCDEB8EF98C8
    claim_text: The close superseded requirements action id shall be close-superseded-requirements
    role: normative
    status: modeled
    span:
      start: 191
      end: 273
  - claim_key: CLAIM-EB01F6CC06727E39
    claim_text: The close superseded requirements code shall be close_superseded_requirements
    role: normative
    status: modeled
    span:
      start: 275
      end: 352
  - claim_key: CLAIM-F1D38D76B1677DCF
    claim_text: The self-attested exception review code shall be review_exception_approval_self_attested
    role: normative
    status: modeled
    span:
      start: 354
      end: 442
  - claim_key: CLAIM-99283E7F3C085DEB
    claim_text: The predicate key arguments review code shall be review_predicate_key_arguments
    role: normative
    status: modeled
    span:
      start: 444
      end: 523
  - claim_key: CLAIM-D64C8177148774A7
    claim_text: The missing rationale review action id shall be review-requirement-rationale-missing
    role: normative
    status: modeled
    span:
      start: 525
      end: 609
  - claim_key: CLAIM-32019240AFC60906
    claim_text: The unknown scenario feasibility review code shall be review_scenario_feasibility_unknown
    role: normative
    status: modeled
    span:
      start: 611
      end: 700
logic_claims:
  - CLAIM-466F2FF82989BF7A
  - CLAIM-B4CE9027C7636ABC
  - CLAIM-A828DCDEB8EF98C8
  - CLAIM-EB01F6CC06727E39
  - CLAIM-F1D38D76B1677DCF
  - CLAIM-99283E7F3C085DEB
  - CLAIM-D64C8177148774A7
  - CLAIM-32019240AFC60906
id: REQ-kibi-lifecycle-review-actions
type: req
---
The unapproved agent requirements review action id shall be review-agent-requirements-unapproved. The unapproved agent requirements review code shall be review_agent_requirements_unapproved. The close superseded requirements action id shall be close-superseded-requirements. The close superseded requirements code shall be close_superseded_requirements. The self-attested exception review code shall be review_exception_approval_self_attested. The predicate key arguments review code shall be review_predicate_key_arguments. The missing rationale review action id shall be review-requirement-rationale-missing. The unknown scenario feasibility review code shall be review_scenario_feasibility_unknown.

## Context

REQ-kibi-kb-lifecycle-integrity has kb_check propose next actions with stable ids and codes: reviews for unapproved agent requirements, self-attested exceptions, predicate key arguments, missing rationale and scenarios of unknown feasibility, and the repair that closes superseded requirements. They are stated here so every value is proved against its constant.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"