---
title: Bootstrap keeps observations, open questions and declared conflicts as cited review facts
status: open
priority: must
tags:
  - bootstrap
  - intent-claims
  - knowledge-sources
  - review
  - review:context-missing
rationale: Test project onboarding runs held conflicts and open questions in an external ledger because bootstrapContext had no place for them, so the most contested part of the interview never reached the KB.
semantic_text: The bootstrap planner must not turn intent claims declared as observations or open questions into requirement candidates. The bootstrap planner must plan each observation or open question claim as a cited observation fact and tag open questions review:open-question. The bootstrap planner must plan each declared conflict between declared claims as a cited observation fact tagged review:conflict. The bootstrap planner must bind claim kinds and declared conflicts into the plan hash.
semantic_clauses:
  - The bootstrap planner must not turn intent claims declared as observations or open questions into requirement candidates.
  - The bootstrap planner must plan each observation or open question claim as a cited observation fact and tag open questions review:open-question.
  - The bootstrap planner must plan each declared conflict between declared claims as a cited observation fact tagged review:conflict.
  - The bootstrap planner must bind claim kinds and declared conflicts into the plan hash.
logic_claims:
  - CLAIM-B3D6DE39DC719341
  - CLAIM-4AF117BA4320367A
  - CLAIM-DB9DBDAC9B9E3D41
  - CLAIM-BBB188D381772F40
origin:
  kind: agent
  ref: 'Piotr thread 2026-10-06: claim kinds and conflicts in bootstrapContext after a test project rerun'
  recorded_at: '2026-10-06T15:48:20.706Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 4aab56130316c097e8639949394567788345afe0ce1068f82ad6fa0c95cac3c1
semantic_inventory:
  - claim_key: CLAIM-B3D6DE39DC719341
    claim_text: The bootstrap planner must not turn intent claims declared as observations or open questions into requirement candidates
    role: normative
    status: modeled
    span:
      start: 0
      end: 120
  - claim_key: CLAIM-4AF117BA4320367A
    claim_text: The bootstrap planner must plan each observation or open question claim as a cited observation fact and tag open questions review:open-question
    role: normative
    status: modeled
    span:
      start: 122
      end: 265
  - claim_key: CLAIM-DB9DBDAC9B9E3D41
    claim_text: The bootstrap planner must plan each declared conflict between declared claims as a cited observation fact tagged review:conflict
    role: normative
    status: modeled
    span:
      start: 267
      end: 396
  - claim_key: CLAIM-BBB188D381772F40
    claim_text: The bootstrap planner must bind claim kinds and declared conflicts into the plan hash
    role: normative
    status: modeled
    span:
      start: 398
      end: 483
id: REQ-bootstrap-claim-kinds-and-conflicts
type: req
---
The bootstrap planner must not turn intent claims declared as observations or open questions into requirement candidates. The bootstrap planner must plan each observation or open question claim as a cited observation fact and tag open questions review:open-question. The bootstrap planner must plan each declared conflict between declared claims as a cited observation fact tagged review:conflict. The bootstrap planner must bind claim kinds and declared conflicts into the plan hash.
