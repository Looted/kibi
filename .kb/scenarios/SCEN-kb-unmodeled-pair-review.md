---
title: An unmodeled requirement on a constrained subject is blocked until a person-approved verdict settles the pair
status: active
priority: must
expects: success
tags:
  - checks
  - contradictions
origin:
  kind: agent
  recorded_at: '2026-11-13T09:00:00.000Z'
id: SCEN-kb-unmodeled-pair-review
type: scenario
---
**Scenario: a new requirement on a subject a modeled requirement already constrains**

**GIVEN** a must requirement modeled on the client call quota, and a new must requirement whose normative claims are left unmodeled, either as missing propositions with a relates_to link to it or as ontology_gap claims that name the call quota subject
**WHEN** an agent runs `kibi check`
**THEN** related-requirement-unmodeled reports the new requirement, naming the other one and how they pair, until the claims are modeled or a pair_reviews entry carries a verdict
**AND** the verdict counts only while a relates_to edge links the two, when it says what separates them (no_conflict) or names what resolves them (interacts), names every unmodeled claim by its claim key, and, because both requirements are must, names who approved it; a conflict verdict never settles the pair.
