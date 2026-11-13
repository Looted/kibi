---
title: Subjects are defined once and every unmodeled claim names a defined subject
status: open
priority: must
required_evidence: tested
tags:
  - kb
  - domain-subjects
  - migration
semantic_text: Kibi must report an active subject fact whose body does not define its subject as a subject-definition-missing violation. Kibi must report two active subject facts whose key and title words read as one subject as a subject-duplicate violation. Kibi must report an unmodeled normative claim of a current requirement that names no subject as a claim-subject-missing violation. Kibi must report a requirement claim that names a subject no active subject fact defines as a claim-subject-undefined violation.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 6ad82f631998797bbe6fe062190ba571ade0367496b87c2882a4ae4ffec6daeb
semantic_inventory:
  - claim_key: CLAIM-1F16A063191406EC
    claim_text: Kibi must report an active subject fact whose body does not define its subject as a subject-definition-missing violation
    role: normative
    status: modeled
    span:
      start: 0
      end: 120
    reason: Grounded by FACT-kb-domain-subject-layer-definition-reported via requires_property.
  - claim_key: CLAIM-20FAD4E308E7BA5A
    claim_text: Kibi must report two active subject facts whose key and title words read as one subject as a subject-duplicate violation
    role: normative
    status: modeled
    span:
      start: 122
      end: 242
    reason: Grounded by FACT-kb-domain-subject-layer-duplicate-reported via requires_property.
  - claim_key: CLAIM-B8678659D19490A7
    claim_text: Kibi must report an unmodeled normative claim of a current requirement that names no subject as a claim-subject-missing violation
    role: normative
    status: modeled
    span:
      start: 244
      end: 373
    reason: Grounded by FACT-kb-domain-subject-layer-unanchored-claim-reported via requires_property.
  - claim_key: CLAIM-0FCDA139975E9544
    claim_text: Kibi must report a requirement claim that names a subject no active subject fact defines as a claim-subject-undefined violation
    role: normative
    status: modeled
    span:
      start: 375
      end: 502
    reason: Grounded by FACT-kb-domain-subject-layer-undefined-subject-reported via requires_property.
logic_claims:
  - CLAIM-1F16A063191406EC
  - CLAIM-20FAD4E308E7BA5A
  - CLAIM-B8678659D19490A7
  - CLAIM-0FCDA139975E9544
origin:
  kind: agent
  ref: Maintainer request to restore subject facts as domain definitions, 2026-11-12
  approved_by: maintainer
  recorded_at: '2026-11-12T20:00:00.000Z'
id: REQ-kb-domain-subject-layer
type: req
---
Kibi must report an active subject fact whose body does not define its subject as a subject-definition-missing violation. Kibi must report two active subject facts whose key and title words read as one subject as a subject-duplicate violation. Kibi must report an unmodeled normative claim of a current requirement that names no subject as a claim-subject-missing violation. Kibi must report a requirement claim that names a subject no active subject fact defines as a claim-subject-undefined violation.

## Context
Kibi could not compare two prose requirements that nobody had modeled. In a test project, one requirement said the read-only view locks the drawing and another said the review editor opens in that view; they conflict, yet neither kibi check nor kb_compile_intent noticed, because the conflict lies in what "read-only view" means and the claims were never modeled. Subject facts were meant to define the things a product is about, but most had become labels without a definition. The maintainer asked to restore them as a domain definition layer. This requirement holds the blocking rules: every subject defined in its body, no subject defined twice, and every unmodeled claim naming defined subjects it is about. REQ-kb-domain-subject-view holds what reads the layer: the domain view and the migration that anchors claims. Kibi still never decides whether two prose claims conflict; it puts them side by side for the person or agent writing them. The same blocking family also keeps the hierarchy readable: a subject that names itself under part_of, kind_of or distinct_from, or a chain of broader subjects that leads back to where it started, is reported as subject-hierarchy-invalid. The TypeScript subject rules apply from KB schema 16, so a project still on an older schema is not blocked by them before kibi migrate.

## Source
> Long ago, when we started kibi, facts were supposed to be subjects. Facts were basic domain definitions, requirements were relationships between them.

> Yes, it should clean up kibis own subjects, also preparing a migration for the consumers.

The maintainer, 2026-11-12, in the design discussion of the domain subject layer.
