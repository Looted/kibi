---
title: kibi init asks the person for the Kibi level, test recommended, and the bootstrap skill has the agent ask
status: open
priority: must
required_evidence: tested
tags:
  - levels
semantic_text: kibi init must ask the person to choose the Kibi level, offer test as the recommended answer, and record the answer. kibi init without a terminal must take the level from --level, and must record test when none is given. The kibi-bootstrap skill must tell the agent to ask the person for the level before it runs kibi init, and to pass the answer to kibi init.
origin:
  kind: agent
  approved_by: maintainer
  ref: 'Maintainer decision, 2026-11-25, choosing Kibi levels as presets of how hard Kibi holds the agent to the requirements: "the idea of presets is how much do we force the agent"; "Remember / Test / Prove -> let''s go with this". Making them opt-out: "Can we do opt-out (ask the user during init/onboarding, make sure the agent asks if running init/onboarding via prompt)." Approving the Kibi level statements, statement 10 of 13: "Approve all as written".'
  recorded_at: '2026-11-25T09:46:30.910Z'
rationale: The maintainer asked for the level to be opt-out and asked of the person during init or onboarding, and for the agent to ask when it runs init from a prompt.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 29f359dfd01fec1da08e94947f641c6630237188a6d13d861b3961b78dab409c
semantic_inventory:
  - claim_key: CLAIM-0655835423D2B809
    claim_text: kibi init must ask the person to choose the Kibi level, offer test as the recommended answer, and record the answer
    role: normative
    status: modeled
    span:
      start: 0
      end: 115
    subjects:
      - kibi.level
    reason: Grounded by FACT-PROP-kibi-init-level-choice-c01 via requires_property.
  - claim_key: CLAIM-14BCAC64AD941A49
    claim_text: kibi init without a terminal must take the level from --level, and must record test when none is given
    role: normative
    status: modeled
    span:
      start: 117
      end: 219
    subjects:
      - kibi.level
    reason: Grounded by FACT-PROP-kibi-init-level-choice-c02 via requires_property.
  - claim_key: CLAIM-CB559C74BD6DB84C
    claim_text: The kibi-bootstrap skill must tell the agent to ask the person for the level before it runs kibi init, and to pass the answer to kibi init
    role: normative
    status: modeled
    span:
      start: 221
      end: 359
    subjects:
      - kibi.level
    reason: Grounded by FACT-PROP-kibi-init-level-choice-c03 via requires_property.
logic_claims:
  - CLAIM-0655835423D2B809
  - CLAIM-14BCAC64AD941A49
  - CLAIM-CB559C74BD6DB84C
id: REQ-kibi-init-level-choice
type: req
semantic_clauses:
  - kibi init must ask the person to choose the Kibi level, offer test as the recommended answer, and record the answer
  - kibi init without a terminal must take the level from --level, and must record test when none is given
  - The kibi-bootstrap skill must tell the agent to ask the person for the level before it runs kibi init, and to pass the answer to kibi init
---
kibi init must ask the person to choose the Kibi level, offer test as the recommended answer, and record the answer. kibi init without a terminal must take the level from --level, and must record test when none is given. The kibi-bootstrap skill must tell the agent to ask the person for the level before it runs kibi init, and to pass the answer to kibi init.

## Context

The maintainer asked for the level to be opt-out and asked of the person during init or onboarding, and for the agent to ask when it runs init from a prompt.
