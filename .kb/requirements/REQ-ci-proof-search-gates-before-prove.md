---
title: The proof workflow runs the kb_search gold-set gates before the full proof run
status: open
priority: should
required_evidence: tested
tags:
  - proof
  - ci
  - search
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-17, approving the merge train quick-fix statements: "Ok, also approve for the requirements."'
  approved_by: maintainer
  recorded_at: '2026-11-17T10:51:23.898Z'
rationale: The gold-set gates take about two minutes and need only the synced KB, yet they ran after the 15-to-20-minute kibi prove --all step, so a search regression failed a pull request half an hour into its proof run. Running them first fails such a change within minutes; running them alone keeps their warm-latency thresholds measuring search rather than load from concurrent proof steps.
semantic_text: The proof workflow runs the kb_search gold-set gates before the full proof run, with no proof step running beside them.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: b279bcb370a07b225d69e786e9fee0afc6c4cf7e96cfc1de3acc2933a3aff2f9
semantic_inventory:
  - claim_key: CLAIM-BD18FA9908BAF624
    claim_text: The proof workflow runs the kb_search gold-set gates before the full proof run, with no proof step running beside them
    role: normative
    status: modeled
    span:
      start: 0
      end: 118
logic_claims:
  - CLAIM-BD18FA9908BAF624
id: REQ-ci-proof-search-gates-before-prove
type: req
---
The proof workflow runs the kb_search gold-set gates before the full proof run, with no proof step running beside them.

## Context

The gold-set gates take about two minutes and need only the synced KB, yet they ran after the 15-to-20-minute kibi prove --all step, so a search regression failed a pull request half an hour into its proof run. Running them first fails such a change within minutes; running them alone keeps their warm-latency thresholds measuring search rather than load from concurrent proof steps.

## Source

> Maintainer decision, 2026-11-17, approving the merge train quick-fix statements: "Ok, also approve for the requirements."
