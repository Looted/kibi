---
title: Bootstrap plans keep every declared intent claim and account for it per source
status: open
priority: must
tags:
  - bootstrap
  - intent-claims
  - knowledge-sources
  - review:ontology-gap
rationale: The Oct 6 2026 Align onboarding rerun lost all 31 tracker claims to the default 50-candidate cap and partially applied a plan whose candidates rewrote each other's entities.
semantic_text: The bootstrap planner must keep every declared intent claim regardless of maxCandidates and apply maxCandidates only to discovered candidates. The bootstrap planner must suppress a candidate that would rewrite an entity another planned candidate writes with different content. The bootstrap planner must run the claim key grounding check against planned writes before offering write actions. The bootstrap planner must report declared, planned and existing intent claims for each knowledge source. The bootstrap planner must not mark a plan ready when an authoritative knowledge source has no planned or existing claims.
origin:
  kind: agent
  ref: 'Piotr thread 2026-10-06: fix bootstrap truncation after the Align onboarding rerun'
  recorded_at: '2026-10-06T10:57:44.689Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: ec730e126dc2403eea666246b45135e432cce477a958cf9132a0861442e5ccc0
semantic_inventory:
  - claim_key: CLAIM-0D8D71DB60BC0D38
    claim_text: The bootstrap planner must keep every declared intent claim regardless of maxCandidates and apply maxCandidates only to discovered candidates
    role: normative
    status: ontology_gap
    span:
      start: 0
      end: 141
  - claim_key: CLAIM-FCC9AC671AF2C35E
    claim_text: The bootstrap planner must suppress a candidate that would rewrite an entity another planned candidate writes with different content
    role: normative
    status: ontology_gap
    span:
      start: 143
      end: 275
  - claim_key: CLAIM-298CB83398C39343
    claim_text: The bootstrap planner must run the claim key grounding check against planned writes before offering write actions
    role: normative
    status: ontology_gap
    span:
      start: 277
      end: 390
  - claim_key: CLAIM-96F8CEA7B9EF97DE
    claim_text: The bootstrap planner must report declared, planned and existing intent claims for each knowledge source
    role: normative
    status: ontology_gap
    span:
      start: 392
      end: 496
  - claim_key: CLAIM-99C795E50A85B421
    claim_text: The bootstrap planner must not mark a plan ready when an authoritative knowledge source has no planned or existing claims
    role: normative
    status: ontology_gap
    span:
      start: 498
      end: 619
logic_claims:
  - CLAIM-0D8D71DB60BC0D38
  - CLAIM-FCC9AC671AF2C35E
  - CLAIM-298CB83398C39343
  - CLAIM-96F8CEA7B9EF97DE
  - CLAIM-99C795E50A85B421
id: REQ-bootstrap-intent-claim-accounting
type: req
---
The bootstrap planner must keep every declared intent claim regardless of maxCandidates and apply maxCandidates only to discovered candidates. The bootstrap planner must suppress a candidate that would rewrite an entity another planned candidate writes with different content. The bootstrap planner must run the claim key grounding check against planned writes before offering write actions. The bootstrap planner must report declared, planned and existing intent claims for each knowledge source. The bootstrap planner must not mark a plan ready when an authoritative knowledge source has no planned or existing claims.
