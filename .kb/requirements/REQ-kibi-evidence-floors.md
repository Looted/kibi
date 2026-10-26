---
title: Kibi check holds every requirement to its evidence floor
status: open
required_evidence: tested
priority: should
tags:
  - proof
  - check
  - evidence-floor
firmness: default
semantic_text: Kibi check must fail every current requirement whose evidence level is below its evidence floor. The evidence floor of a requirement must be its required_evidence, or tested for a firm requirement without one. Kibi check must pass a requirement whose only proof gaps are receipts older than the code as pending re-proof unless fresh evidence is required. Kibi check with fresh evidence must fail a pending re-proof requirement and a proof snapshot that is not clean. The schema 11 upgrade must record required_evidence asserted on every current firm requirement without a proof path.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 89d38ac210712516b7e11fc58156bf83fc5e9f0401628f328582bf2d6a126950
semantic_inventory:
  - claim_key: CLAIM-5E55F75819F9B574
    claim_text: Kibi check must fail every current requirement whose evidence level is below its evidence floor
    role: normative
    status: modeled
    span:
      start: 0
      end: 95
  - claim_key: CLAIM-23E0D385A6C3594E
    claim_text: The evidence floor of a requirement must be its required_evidence, or tested for a firm requirement without one
    role: normative
    status: modeled
    span:
      start: 97
      end: 208
  - claim_key: CLAIM-9ACBC2020046F07B
    claim_text: Kibi check must pass a requirement whose only proof gaps are receipts older than the code as pending re-proof unless fresh evidence is required
    role: exception
    status: modeled
    span:
      start: 210
      end: 353
  - claim_key: CLAIM-1051157D755BBE40
    claim_text: Kibi check with fresh evidence must fail a pending re-proof requirement and a proof snapshot that is not clean
    role: normative
    status: modeled
    span:
      start: 355
      end: 465
  - claim_key: CLAIM-B8F130D981627AB6
    claim_text: The schema 11 upgrade must record required_evidence asserted on every current firm requirement without a proof path
    role: normative
    status: modeled
    span:
      start: 467
      end: 582
logic_claims:
  - CLAIM-5E55F75819F9B574
  - CLAIM-23E0D385A6C3594E
  - CLAIM-9ACBC2020046F07B
  - CLAIM-1051157D755BBE40
  - CLAIM-B8F130D981627AB6
origin:
  kind: agent
  recorded_at: '2026-10-24T17:34:03.297Z'
id: REQ-kibi-evidence-floors
type: req
---
Kibi check must fail every current requirement whose evidence level is below its evidence floor. The evidence floor of a requirement must be its required_evidence, or tested for a firm requirement without one. Kibi check must pass a requirement whose only proof gaps are receipts older than the code as pending re-proof unless fresh evidence is required. Kibi check with fresh evidence must fail a pending re-proof requirement and a proof snapshot that is not clean. The schema 11 upgrade must record required_evidence asserted on every current firm requirement without a proof path.

## Context

Phase 1 gave every requirement an evidence level (proved, tested, asserted or unverified), but nothing said which level a requirement needed, so the repository kept a proof/baseline.json snapshot of every requirement's proof gaps and failed on any difference. That file was a shared hotspot every pull request that added a requirement had to edit, and it described what the code happened to be, not what anyone required. A requirement now states its own floor in required_evidence, next to the statement a reviewer reads, and the canonical evidence-floor rule of kibi check fails any current requirement below it. Without required_evidence a firm requirement needs tested evidence and any other requirement needs nothing, because an unapproved agent requirement is already reported by its own advisory rule. Receipts that are only older than the code count as pending re-proof, so a local check does not demand a fresh proof run; CI re-proves and then runs kibi check --fresh-evidence on the clean checkout. The schema 11 upgrade writes required_evidence: asserted on firm requirements that have no scenario verified by a test with a proof contract, so an existing repository passes after upgrading and a reviewer can raise the floor once a proof exists.

## Source

Approving the written formal-proof design: "Looks good, go ahead." Choosing the remaining phases: "I'd like to do all the remaining phases."
