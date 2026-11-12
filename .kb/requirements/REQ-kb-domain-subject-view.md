---
title: A subject lists every requirement on it and the migration anchors claims only once approved
status: open
priority: must
required_evidence: tested
tags:
  - kb
  - domain-subjects
  - migration
semantic_text: A kb_query for a subject must list every current requirement about that subject or a narrower subject. Kibi migrate must plan a suggested claim subject as a review action.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 40bbe4e012f643348ef06bcf988419d11c95153aba327aa678ad7eea40c4935d
semantic_inventory:
  - claim_key: CLAIM-5D3D2D8FC44DDF69
    claim_text: A kb_query for a subject must list every current requirement about that subject or a narrower subject
    role: normative
    status: modeled
    span:
      start: 0
      end: 101
    reason: Grounded by FACT-kb-domain-subject-layer-domain-view-complete via requires_property.
  - claim_key: CLAIM-D4704A4A6A07D7A2
    claim_text: Kibi migrate must plan a suggested claim subject as a review action
    role: normative
    status: modeled
    span:
      start: 103
      end: 170
    reason: Grounded by FACT-kb-domain-subject-layer-anchor-suggestion-is-review via requires_property.
logic_claims:
  - CLAIM-5D3D2D8FC44DDF69
  - CLAIM-D4704A4A6A07D7A2
origin:
  kind: agent
  ref: Maintainer request to restore subject facts as domain definitions, 2026-11-12
  approved_by: maintainer
  recorded_at: '2026-11-12T20:00:00.000Z'
id: REQ-kb-domain-subject-view
type: req
---
A kb_query for a subject must list every current requirement about that subject or a narrower subject. Kibi migrate must plan a suggested claim subject as a review action.

## Context
Once subjects are defined and claims name them (REQ-kb-domain-subject-layer), requirements on one subject can be read together. The maintainer asked for that view, and for a migration that helps consumer projects anchor the claims they already have. The domain view lists every current requirement on a subject or a narrower one, so the writer of a new requirement compares it with the others before relying on either; Kibi never judges whether two prose claims conflict. The migration only suggests a subject: a person approves each anchor by id, because a wrong anchor would hide a requirement from the view where it belongs.

## Source
> Long ago, when we started kibi, facts were supposed to be subjects. Facts were basic domain definitions, requirements were relationships between them.

> Yes, it should clean up kibis own subjects, also preparing a migration for the consumers.

The maintainer, 2026-11-12, in the design discussion of the domain subject layer.
