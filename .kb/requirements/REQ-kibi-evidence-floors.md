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
semantic_text: Kibi check must fail every current requirement whose evidence level is below its evidence floor. The evidence floor of a requirement must be its required_evidence, or tested for a firm requirement without one. The evidence floor of a requirement a person approved must be tested when it states neither required_evidence nor firmness. Kibi check must pass a requirement whose only proof gaps are receipts older than the code as pending re-proof unless fresh evidence is required. Kibi check with fresh evidence must fail a pending re-proof requirement and a proof snapshot that is not clean. The schema 11 upgrade must record required_evidence asserted on every current firm requirement without a proof path. The schema 15 upgrade must record required_evidence asserted on every current approved requirement without a proof path.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 1b19a8d5e8c9c8eb7153366b91fd30c6d18741786f88d67b651c56a1ea57a8e1
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
  - claim_key: CLAIM-45292A2F6D331ECB
    claim_text: The evidence floor of a requirement a person approved must be tested when it states neither required_evidence nor firmness
    role: normative
    status: modeled
    span:
      start: 210
      end: 332
  - claim_key: CLAIM-9ACBC2020046F07B
    claim_text: Kibi check must pass a requirement whose only proof gaps are receipts older than the code as pending re-proof unless fresh evidence is required
    role: exception
    status: modeled
    span:
      start: 334
      end: 477
  - claim_key: CLAIM-1051157D755BBE40
    claim_text: Kibi check with fresh evidence must fail a pending re-proof requirement and a proof snapshot that is not clean
    role: normative
    status: modeled
    span:
      start: 479
      end: 589
  - claim_key: CLAIM-B8F130D981627AB6
    claim_text: The schema 11 upgrade must record required_evidence asserted on every current firm requirement without a proof path
    role: normative
    status: modeled
    span:
      start: 591
      end: 706
  - claim_key: CLAIM-4309FAACF120925B
    claim_text: The schema 15 upgrade must record required_evidence asserted on every current approved requirement without a proof path
    role: normative
    status: modeled
    span:
      start: 708
      end: 827
logic_claims:
  - CLAIM-5E55F75819F9B574
  - CLAIM-23E0D385A6C3594E
  - CLAIM-45292A2F6D331ECB
  - CLAIM-9ACBC2020046F07B
  - CLAIM-1051157D755BBE40
  - CLAIM-B8F130D981627AB6
  - CLAIM-4309FAACF120925B
origin:
  kind: agent
  approved_by: maintainer
  recorded_at: '2026-10-24T17:34:03.297Z'
id: REQ-kibi-evidence-floors
type: req
---
Kibi check must fail every current requirement whose evidence level is below its evidence floor. The evidence floor of a requirement must be its required_evidence, or tested for a firm requirement without one. The evidence floor of a requirement a person approved must be tested when it states neither required_evidence nor firmness. Kibi check must pass a requirement whose only proof gaps are receipts older than the code as pending re-proof unless fresh evidence is required. Kibi check with fresh evidence must fail a pending re-proof requirement and a proof snapshot that is not clean. The schema 11 upgrade must record required_evidence asserted on every current firm requirement without a proof path. The schema 15 upgrade must record required_evidence asserted on every current approved requirement without a proof path.

## Context

Phase 1 gave every requirement an evidence level (proved, tested, asserted or unverified), but nothing said which level a requirement needed, so the repository kept a proof/baseline.json snapshot of every requirement's proof gaps and failed on any difference. That file was a shared hotspot every pull request that added a requirement had to edit, and it described what the code happened to be, not what anyone required. A requirement now states its own floor in required_evidence, next to the statement a reviewer reads, and the canonical evidence-floor rule of kibi check fails any current requirement below it. Without required_evidence a firm requirement needs tested evidence and any other requirement needs nothing, because an unapproved agent requirement is already reported by its own advisory rule. Receipts that are only older than the code count as pending re-proof, so a local check does not demand a fresh proof run; CI re-proves and then runs kibi check --fresh-evidence on the clean checkout. The schema 11 upgrade writes required_evidence: asserted on firm requirements that have no scenario verified by a test with a proof contract, so an existing repository passes after upgrading and a reviewer can raise the floor once a proof exists. The approval floor came later. A requirement an agent wrote and a person approved (origin.approved_by) read as default, so it had no floor even though the person had committed to it and the evidence-floor suggestion told agents that approval is what makes a requirement need evidence; in a test project most approved requirements sat at asserted while kibi check passed. From KB schema 15 the approval gives the tested floor unless the requirement sets required_evidence or states its firmness, and the schema 15 upgrade pins approved requirements without a passing proof path to asserted, as schema 11 did for firm ones.

## Source

Approving the written formal-proof design: "Looks good, go ahead." Choosing the remaining phases: "I'd like to do all the remaining phases." Reporting the approval gap found in a test project: "an approved requirement (`origin.approved_by` present, as `human_intent(_, approved, _)` reads it) gets floor `tested` unless `required_evidence` or an explicit `firmness` says otherwise." Choosing how the schema 15 upgrade treats approved requirements without a passing proof: "Pin required_evidence: asserted".
