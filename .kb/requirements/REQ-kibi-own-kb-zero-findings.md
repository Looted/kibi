---
title: Kibi's own repository fails CI and the pre-push proof check on any kibi check finding
status: open
semantic_text: Kibi's own repository must fail CI and the pre-push proof check when the full kibi check reports any violation or quality diagnostic, info level included. The gate must fail when the check output has no violations or qualityDiagnostics array.
semantic_clauses:
  - Kibi's own repository must fail CI and the pre-push proof check when the full kibi check reports any violation or quality diagnostic, info level included
  - The gate must fail when the check output has no violations or qualityDiagnostics array
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: d442c5b7003fa8842218ae95b65ca6404d7a4c8d2da16eed8f4a410b8c316592
semantic_inventory:
  - claim_key: CLAIM-9F3DD59B4F76AF68
    claim_text: Kibi's own repository must fail CI and the pre-push proof check when the full kibi check reports any violation or quality diagnostic, info level included
    role: normative
    status: modeled
    span:
      start: 0
      end: 153
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-31A206ED36855232
    claim_text: The gate must fail when the check output has no violations or qualityDiagnostics array
    role: normative
    status: modeled
    span:
      start: 155
      end: 241
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-9F3DD59B4F76AF68
  - CLAIM-31A206ED36855232
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-11, approving the wording fixes and new requirements of the second KB gold-standard review: "Ok"'
  approved_by: maintainer
  recorded_at: '2026-11-11T17:41:30.928Z'
firmness: firm
required_evidence: tested
priority: must
tags:
  - ci
  - kb-quality
  - repository
id: REQ-kibi-own-kb-zero-findings
type: req
---
Kibi's own repository must fail CI and the pre-push proof check when the full kibi check reports any violation or quality diagnostic, info level included. The gate must fail when the check output has no violations or qualityDiagnostics array.

## Context

Kibi's own knowledge base is the reference example that other projects copy, so it is held at zero findings rather than accepting advisories. scripts/kb-zero-findings.sh runs the full check in the CI integration job and in bun run proof:prepush. It fails closed when a result group is missing, so a change to the check output cannot turn the gate into a silent pass.

## Source

> Maintainer decision, 2026-11-11, approving the wording fixes and new requirements of the second KB gold-standard review: "Ok"
