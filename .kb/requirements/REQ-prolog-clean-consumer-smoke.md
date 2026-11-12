---
title: SWI-Prolog consumer smoke runs the extracted runtime on a clean runner with its own SWI home and fails on any check
status: open
semantic_text: The SWI-Prolog clean-runner check must reject a host with a system swipl before building or extracting an artifact. The SWI-Prolog consumer smoke must set SWI_HOME_DIR to the extracted home and remove inherited dynamic-loader overrides. The SWI-Prolog consumer smoke must check the pinned version, LibBF arithmetic, subsecond file timestamps, and all 18 required libraries. The SWI-Prolog consumer smoke must propagate a failed smoke command exit.
semantic_clauses:
  - The SWI-Prolog clean-runner check must reject a host with a system swipl before building or extracting an artifact
  - The SWI-Prolog consumer smoke must set SWI_HOME_DIR to the extracted home and remove inherited dynamic-loader overrides
  - The SWI-Prolog consumer smoke must check the pinned version, LibBF arithmetic, subsecond file timestamps, and all 18 required libraries
  - The SWI-Prolog consumer smoke must propagate a failed smoke command exit
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 1fb34297254230982ef17bf6559ecc07884cf509cda97f0713ac4574906fe89f
semantic_inventory:
  - claim_key: CLAIM-CEBD9E1081808C1F
    claim_text: The SWI-Prolog clean-runner check must reject a host with a system swipl before building or extracting an artifact
    role: normative
    status: modeled
    span:
      start: 0
      end: 114
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-51A1CA1048C911C7
    claim_text: The SWI-Prolog consumer smoke must set SWI_HOME_DIR to the extracted home and remove inherited dynamic-loader overrides
    role: normative
    status: modeled
    span:
      start: 116
      end: 235
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-58124B5D9E47F417
    claim_text: The SWI-Prolog consumer smoke must check the pinned version, LibBF arithmetic, subsecond file timestamps, and all 18 required libraries
    role: normative
    status: modeled
    span:
      start: 237
      end: 372
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-70192DBB36371592
    claim_text: The SWI-Prolog consumer smoke must propagate a failed smoke command exit
    role: normative
    status: modeled
    span:
      start: 374
      end: 446
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-CEBD9E1081808C1F
  - CLAIM-51A1CA1048C911C7
  - CLAIM-58124B5D9E47F417
  - CLAIM-70192DBB36371592
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T09:24:56.788Z'
priority: must
firmness: default
required_evidence: tested
tags:
  - prolog
  - build
  - pipeline
  - smoke
  - lane:strict
id: REQ-prolog-clean-consumer-smoke
type: req
---
The SWI-Prolog clean-runner check must reject a host with a system swipl before building or extracting an artifact. The SWI-Prolog consumer smoke must set SWI_HOME_DIR to the extracted home and remove inherited dynamic-loader overrides. The SWI-Prolog consumer smoke must check the pinned version, LibBF arithmetic, subsecond file timestamps, and all 18 required libraries. The SWI-Prolog consumer smoke must propagate a failed smoke command exit.

## Context

The smoke job must see the runtime the way a consumer would, so a system swipl or inherited loader path cannot hide a missing library, and a failed check fails the job.

Kibi ships prebuilt SWI-Prolog runtimes, so every published artifact must come from a pinned build on a clean runner, carry provenance that is checked, and pass a smoke run as a consumer would install it.

## Why this changed

Split from REQ-prolog-build-pipeline-validation, which held three behaviors: which targets the build workflow covers and where native builds may run, how a built artifact's provenance and contents are verified, and how the clean consumer smoke runs the artifact. Each child is one of them, and only the functions that decide each behavior keep their implements links.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
