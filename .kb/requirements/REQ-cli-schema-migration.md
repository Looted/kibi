---
id: REQ-cli-schema-migration
title: CLI migrates branch KB schema versions
status: open
created_at: 2026-05-30T00:00:00.000Z
updated_at: 2026-06-08T00:00:00.000Z
source: docs/entity-schema.md#schema-migration
priority: must
tags:
  - cli
  - migration
  - schema
  - review:context-missing
links:
  - type: specified_by
    target: SCEN-cli-migrate
  - type: verified_by
    target: TEST-cli-migrate
semantic_text: The CLI must provide an idempotent migration path for branch KB schema changes, including dry-run preview, explicit application, audit metadata, compatibility remediation for legacy ontology data, and a non-mutating semantic-advisor backfill marker for existing requirement prose.
logic_claims:
  - CLAIM-E34E624D48A4327B
semantic_clauses:
  - The CLI must provide an idempotent migration path for branch KB schema changes, including dry-run preview, explicit application, audit metadata, compatibility remediation for legacy ontology data, and a non-mutating semantic-advisor backfill marker for existing requirement prose
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 7642093713579456b0192eb3db1c4b1058efea606c2fac82847237af5446e897
semantic_inventory:
  - claim_key: CLAIM-E34E624D48A4327B
    claim_text: The CLI must provide an idempotent migration path for branch KB schema changes, including dry-run preview, explicit application, audit metadata, compatibility remediation for legacy ontology data, and a non-mutating semantic-advisor backfill marker for existing requirement prose
    role: normative
    status: modeled
    span:
      start: 0
      end: 279
type: req
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Firmness relabelled to default until reviewed. Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested."'
  recorded_at: '2026-10-04T01:17:15.284Z'
firmness: default
required_evidence: tested
---

The CLI must provide an idempotent migration path for branch KB schema changes, including dry-run preview, explicit application, audit metadata, compatibility remediation for legacy ontology data, and a non-mutating semantic-advisor backfill marker for existing requirement prose.
