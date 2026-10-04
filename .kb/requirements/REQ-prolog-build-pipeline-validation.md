---
title: SWI-Prolog pipeline validates platform artifacts before clean-runner acceptance
status: open
priority: must
text_ref: scripts/swipl-spike.py
tags:
  - prolog
  - build
  - pipeline
  - validation
  - lane:strict
semantic_text: The SWI-Prolog build pipeline configuration must accept linux-x64-gnu, linux-arm64-gnu, darwin-arm64, and darwin-x64. The SWI-Prolog build workflow must declare separate build and clean-consumer smoke jobs for each of the four launch targets. The SWI-Prolog build workflow must trigger on pin, build-script, patch, or workflow changes and manual dispatch. The SWI-Prolog artifact writer must publish a SHA-256 sidecar and a build manifest containing the target, exact source and dependency and patch pins, source commit, workflow run ID, binary checksum, and relative SWI home. The SWI-Prolog clean-runner check must reject a host with a system swipl before building or extracting an artifact. The SWI-Prolog artifact verifier must reject an archive checksum mismatch. The SWI-Prolog artifact verifier must reject an executable checksum mismatch. The SWI-Prolog artifact verifier must reject mismatched target, source, dependency, source-patch, expected commit, or expected workflow-run provenance. The SWI-Prolog artifact verifier must reject absolute paths, parent traversal, duplicate entries, and escaping or dangling archive links. The SWI-Prolog artifact verifier must reject an incomplete runtime prefix. The SWI-Prolog artifact verifier must reject native audit failures for architecture, dependency references, GLIBC compatibility, minimum deployment target, or ad-hoc signatures. The SWI-Prolog consumer smoke must set SWI_HOME_DIR to the extracted home and remove inherited dynamic-loader overrides. The SWI-Prolog consumer smoke must check the pinned version, LibBF arithmetic, subsecond file timestamps, and all 18 required libraries. The SWI-Prolog consumer smoke must propagate a failed smoke command exit. The SWI-Prolog build command must refuse native compilation outside GitHub Actions.
logic_claims:
  - CLAIM-094D2249E1CEDCCA
  - CLAIM-04831D475A5D0250
  - CLAIM-F6911731ED97EF27
  - CLAIM-E03C7DA3C74038FA
  - CLAIM-CEBD9E1081808C1F
  - CLAIM-FC2C3742954B0455
  - CLAIM-2253F469D51FC992
  - CLAIM-14B9C2F815328CCD
  - CLAIM-D134A623FD591445
  - CLAIM-747F2ECADD5376FF
  - CLAIM-EBABDF8C4DDA72FE
  - CLAIM-51A1CA1048C911C7
  - CLAIM-58124B5D9E47F417
  - CLAIM-70192DBB36371592
  - CLAIM-CA4DACEE5AABD49F
semantic_clauses:
  - The SWI-Prolog build pipeline configuration must accept linux-x64-gnu, linux-arm64-gnu, darwin-arm64, and darwin-x64
  - The SWI-Prolog build workflow must declare separate build and clean-consumer smoke jobs for each of the four launch targets
  - The SWI-Prolog build workflow must trigger on pin, build-script, patch, or workflow changes and manual dispatch
  - The SWI-Prolog artifact writer must publish a SHA-256 sidecar and a build manifest containing the target, exact source and dependency and patch pins, source commit, workflow run ID, binary checksum, and relative SWI home
  - The SWI-Prolog clean-runner check must reject a host with a system swipl before building or extracting an artifact
  - The SWI-Prolog artifact verifier must reject an archive checksum mismatch
  - The SWI-Prolog artifact verifier must reject an executable checksum mismatch
  - The SWI-Prolog artifact verifier must reject mismatched target, source, dependency, source-patch, expected commit, or expected workflow-run provenance
  - The SWI-Prolog artifact verifier must reject absolute paths, parent traversal, duplicate entries, and escaping or dangling archive links
  - The SWI-Prolog artifact verifier must reject an incomplete runtime prefix
  - The SWI-Prolog artifact verifier must reject native audit failures for architecture, dependency references, GLIBC compatibility, minimum deployment target, or ad-hoc signatures
  - The SWI-Prolog consumer smoke must set SWI_HOME_DIR to the extracted home and remove inherited dynamic-loader overrides
  - The SWI-Prolog consumer smoke must check the pinned version, LibBF arithmetic, subsecond file timestamps, and all 18 required libraries
  - The SWI-Prolog consumer smoke must propagate a failed smoke command exit
  - The SWI-Prolog build command must refuse native compilation outside GitHub Actions
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 9a8412cb87058820ecf985e42a2f15c304963d3040ada9acec30ea841af4e7ee
semantic_inventory:
  - claim_key: CLAIM-094D2249E1CEDCCA
    claim_text: The SWI-Prolog build pipeline configuration must accept linux-x64-gnu, linux-arm64-gnu, darwin-arm64, and darwin-x64
    span:
      start: 0
      end: 116
    role: normative
    status: modeled
  - claim_key: CLAIM-04831D475A5D0250
    claim_text: The SWI-Prolog build workflow must declare separate build and clean-consumer smoke jobs for each of the four launch targets
    span:
      start: 118
      end: 241
    role: normative
    status: modeled
  - claim_key: CLAIM-F6911731ED97EF27
    claim_text: The SWI-Prolog build workflow must trigger on pin, build-script, patch, or workflow changes and manual dispatch
    span:
      start: 243
      end: 354
    role: normative
    status: modeled
  - claim_key: CLAIM-E03C7DA3C74038FA
    claim_text: The SWI-Prolog artifact writer must publish a SHA-256 sidecar and a build manifest containing the target, exact source and dependency and patch pins, source commit, workflow run ID, binary checksum, and relative SWI home
    span:
      start: 356
      end: 576
    role: normative
    status: modeled
  - claim_key: CLAIM-CEBD9E1081808C1F
    claim_text: The SWI-Prolog clean-runner check must reject a host with a system swipl before building or extracting an artifact
    span:
      start: 578
      end: 692
    role: normative
    status: modeled
  - claim_key: CLAIM-FC2C3742954B0455
    claim_text: The SWI-Prolog artifact verifier must reject an archive checksum mismatch
    span:
      start: 694
      end: 767
    role: normative
    status: modeled
  - claim_key: CLAIM-2253F469D51FC992
    claim_text: The SWI-Prolog artifact verifier must reject an executable checksum mismatch
    span:
      start: 769
      end: 845
    role: normative
    status: modeled
  - claim_key: CLAIM-14B9C2F815328CCD
    claim_text: The SWI-Prolog artifact verifier must reject mismatched target, source, dependency, source-patch, expected commit, or expected workflow-run provenance
    span:
      start: 847
      end: 997
    role: normative
    status: modeled
  - claim_key: CLAIM-D134A623FD591445
    claim_text: The SWI-Prolog artifact verifier must reject absolute paths, parent traversal, duplicate entries, and escaping or dangling archive links
    span:
      start: 999
      end: 1135
    role: normative
    status: modeled
  - claim_key: CLAIM-747F2ECADD5376FF
    claim_text: The SWI-Prolog artifact verifier must reject an incomplete runtime prefix
    span:
      start: 1137
      end: 1210
    role: normative
    status: modeled
  - claim_key: CLAIM-EBABDF8C4DDA72FE
    claim_text: The SWI-Prolog artifact verifier must reject native audit failures for architecture, dependency references, GLIBC compatibility, minimum deployment target, or ad-hoc signatures
    span:
      start: 1212
      end: 1388
    role: normative
    status: modeled
  - claim_key: CLAIM-51A1CA1048C911C7
    claim_text: The SWI-Prolog consumer smoke must set SWI_HOME_DIR to the extracted home and remove inherited dynamic-loader overrides
    span:
      start: 1390
      end: 1509
    role: normative
    status: modeled
  - claim_key: CLAIM-58124B5D9E47F417
    claim_text: The SWI-Prolog consumer smoke must check the pinned version, LibBF arithmetic, subsecond file timestamps, and all 18 required libraries
    span:
      start: 1511
      end: 1646
    role: normative
    status: modeled
  - claim_key: CLAIM-70192DBB36371592
    claim_text: The SWI-Prolog consumer smoke must propagate a failed smoke command exit
    span:
      start: 1648
      end: 1720
    role: normative
    status: modeled
  - claim_key: CLAIM-CA4DACEE5AABD49F
    claim_text: The SWI-Prolog build command must refuse native compilation outside GitHub Actions
    span:
      start: 1722
      end: 1804
    role: normative
    status: modeled
id: REQ-prolog-build-pipeline-validation
type: req
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
The SWI-Prolog build pipeline configuration must accept linux-x64-gnu, linux-arm64-gnu, darwin-arm64, and darwin-x64. The SWI-Prolog build workflow must declare separate build and clean-consumer smoke jobs for each of the four launch targets. The SWI-Prolog build workflow must trigger on pin, build-script, patch, or workflow changes and manual dispatch. The SWI-Prolog artifact writer must publish a SHA-256 sidecar and a build manifest containing the target, exact source and dependency and patch pins, source commit, workflow run ID, binary checksum, and relative SWI home. The SWI-Prolog clean-runner check must reject a host with a system swipl before building or extracting an artifact. The SWI-Prolog artifact verifier must reject an archive checksum mismatch. The SWI-Prolog artifact verifier must reject an executable checksum mismatch. The SWI-Prolog artifact verifier must reject mismatched target, source, dependency, source-patch, expected commit, or expected workflow-run provenance. The SWI-Prolog artifact verifier must reject absolute paths, parent traversal, duplicate entries, and escaping or dangling archive links. The SWI-Prolog artifact verifier must reject an incomplete runtime prefix. The SWI-Prolog artifact verifier must reject native audit failures for architecture, dependency references, GLIBC compatibility, minimum deployment target, or ad-hoc signatures. The SWI-Prolog consumer smoke must set SWI_HOME_DIR to the extracted home and remove inherited dynamic-loader overrides. The SWI-Prolog consumer smoke must check the pinned version, LibBF arithmetic, subsecond file timestamps, and all 18 required libraries. The SWI-Prolog consumer smoke must propagate a failed smoke command exit. The SWI-Prolog build command must refuse native compilation outside GitHub Actions.
