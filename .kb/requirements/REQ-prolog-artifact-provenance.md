---
title: SWI-Prolog artifact writer publishes a pinned manifest and the verifier rejects any mismatched or unsafe archive
status: open
semantic_text: The SWI-Prolog artifact writer must publish a SHA-256 sidecar and a build manifest containing the target, exact source and dependency and patch pins, source commit, workflow run ID, binary checksum, and relative SWI home. The SWI-Prolog artifact verifier must reject an archive checksum mismatch. The SWI-Prolog artifact verifier must reject an executable checksum mismatch. The SWI-Prolog artifact verifier must reject mismatched target, source, dependency, source-patch, expected commit, or expected workflow-run provenance. The SWI-Prolog artifact verifier must reject absolute paths, parent traversal, duplicate entries, and escaping or dangling archive links. The SWI-Prolog artifact verifier must reject an incomplete runtime prefix. The SWI-Prolog artifact verifier must reject native audit failures for architecture, dependency references, GLIBC compatibility, minimum deployment target, or ad-hoc signatures.
semantic_clauses:
  - The SWI-Prolog artifact writer must publish a SHA-256 sidecar and a build manifest containing the target, exact source and dependency and patch pins, source commit, workflow run ID, binary checksum, and relative SWI home
  - The SWI-Prolog artifact verifier must reject an archive checksum mismatch
  - The SWI-Prolog artifact verifier must reject an executable checksum mismatch
  - The SWI-Prolog artifact verifier must reject mismatched target, source, dependency, source-patch, expected commit, or expected workflow-run provenance
  - The SWI-Prolog artifact verifier must reject absolute paths, parent traversal, duplicate entries, and escaping or dangling archive links
  - The SWI-Prolog artifact verifier must reject an incomplete runtime prefix
  - The SWI-Prolog artifact verifier must reject native audit failures for architecture, dependency references, GLIBC compatibility, minimum deployment target, or ad-hoc signatures
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 24b5b33ad85033dfd95f3443a408e488c45233294c10ef74edc8b137b5554b21
semantic_inventory:
  - claim_key: CLAIM-E03C7DA3C74038FA
    claim_text: The SWI-Prolog artifact writer must publish a SHA-256 sidecar and a build manifest containing the target, exact source and dependency and patch pins, source commit, workflow run ID, binary checksum, and relative SWI home
    role: normative
    status: modeled
    span:
      start: 0
      end: 220
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-FC2C3742954B0455
    claim_text: The SWI-Prolog artifact verifier must reject an archive checksum mismatch
    role: normative
    status: modeled
    span:
      start: 222
      end: 295
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-2253F469D51FC992
    claim_text: The SWI-Prolog artifact verifier must reject an executable checksum mismatch
    role: normative
    status: modeled
    span:
      start: 297
      end: 373
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-14B9C2F815328CCD
    claim_text: The SWI-Prolog artifact verifier must reject mismatched target, source, dependency, source-patch, expected commit, or expected workflow-run provenance
    role: normative
    status: modeled
    span:
      start: 375
      end: 525
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-D134A623FD591445
    claim_text: The SWI-Prolog artifact verifier must reject absolute paths, parent traversal, duplicate entries, and escaping or dangling archive links
    role: normative
    status: modeled
    span:
      start: 527
      end: 663
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-747F2ECADD5376FF
    claim_text: The SWI-Prolog artifact verifier must reject an incomplete runtime prefix
    role: normative
    status: modeled
    span:
      start: 665
      end: 738
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-EBABDF8C4DDA72FE
    claim_text: The SWI-Prolog artifact verifier must reject native audit failures for architecture, dependency references, GLIBC compatibility, minimum deployment target, or ad-hoc signatures
    role: normative
    status: modeled
    span:
      start: 740
      end: 916
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-E03C7DA3C74038FA
  - CLAIM-FC2C3742954B0455
  - CLAIM-2253F469D51FC992
  - CLAIM-14B9C2F815328CCD
  - CLAIM-D134A623FD591445
  - CLAIM-747F2ECADD5376FF
  - CLAIM-EBABDF8C4DDA72FE
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T09:23:44.059Z'
priority: must
firmness: default
required_evidence: tested
tags:
  - prolog
  - build
  - pipeline
  - provenance
  - lane:strict
id: REQ-prolog-artifact-provenance
type: req
---
The SWI-Prolog artifact writer must publish a SHA-256 sidecar and a build manifest containing the target, exact source and dependency and patch pins, source commit, workflow run ID, binary checksum, and relative SWI home. The SWI-Prolog artifact verifier must reject an archive checksum mismatch. The SWI-Prolog artifact verifier must reject an executable checksum mismatch. The SWI-Prolog artifact verifier must reject mismatched target, source, dependency, source-patch, expected commit, or expected workflow-run provenance. The SWI-Prolog artifact verifier must reject absolute paths, parent traversal, duplicate entries, and escaping or dangling archive links. The SWI-Prolog artifact verifier must reject an incomplete runtime prefix. The SWI-Prolog artifact verifier must reject native audit failures for architecture, dependency references, GLIBC compatibility, minimum deployment target, or ad-hoc signatures.

## Context

A consumer installs the runtime as a downloaded binary, so the archive must say exactly what it was built from, and a tampered, mismatched or path-escaping archive is rejected before anything in it runs.

Kibi ships prebuilt SWI-Prolog runtimes, so every published artifact must come from a pinned build on a clean runner, carry provenance that is checked, and pass a smoke run as a consumer would install it.

## Why this changed

Split from REQ-prolog-build-pipeline-validation, which held three behaviors: which targets the build workflow covers and where native builds may run, how a built artifact's provenance and contents are verified, and how the clean consumer smoke runs the artifact. Each child is one of them, and only the functions that decide each behavior keep their implements links.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
