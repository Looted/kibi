---
title: SWI-Prolog build workflow covers the four launch targets and builds natively only on clean GitHub Actions runners
status: open
semantic_text: The SWI-Prolog build pipeline configuration must accept linux-x64-gnu, linux-arm64-gnu, darwin-arm64, and darwin-x64. The SWI-Prolog build workflow must declare separate build and clean-consumer smoke jobs for each of the four launch targets. The SWI-Prolog build workflow must trigger on pin, build-script, patch, or workflow changes and manual dispatch. The SWI-Prolog build command must refuse native compilation outside GitHub Actions.
semantic_clauses:
  - The SWI-Prolog build pipeline configuration must accept linux-x64-gnu, linux-arm64-gnu, darwin-arm64, and darwin-x64
  - The SWI-Prolog build workflow must declare separate build and clean-consumer smoke jobs for each of the four launch targets
  - The SWI-Prolog build workflow must trigger on pin, build-script, patch, or workflow changes and manual dispatch
  - The SWI-Prolog build command must refuse native compilation outside GitHub Actions
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 6304b77c36433eda73c4a8f6f82d859534b9f10bbd18dfb43232c140a53c4717
semantic_inventory:
  - claim_key: CLAIM-094D2249E1CEDCCA
    claim_text: The SWI-Prolog build pipeline configuration must accept linux-x64-gnu, linux-arm64-gnu, darwin-arm64, and darwin-x64
    role: normative
    status: modeled
    span:
      start: 0
      end: 116
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-04831D475A5D0250
    claim_text: The SWI-Prolog build workflow must declare separate build and clean-consumer smoke jobs for each of the four launch targets
    role: normative
    status: modeled
    span:
      start: 118
      end: 241
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-F6911731ED97EF27
    claim_text: The SWI-Prolog build workflow must trigger on pin, build-script, patch, or workflow changes and manual dispatch
    role: normative
    status: modeled
    span:
      start: 243
      end: 354
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-CA4DACEE5AABD49F
    claim_text: The SWI-Prolog build command must refuse native compilation outside GitHub Actions
    role: normative
    status: modeled
    span:
      start: 356
      end: 438
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-094D2249E1CEDCCA
  - CLAIM-04831D475A5D0250
  - CLAIM-F6911731ED97EF27
  - CLAIM-CA4DACEE5AABD49F
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T09:23:06.408Z'
priority: must
firmness: default
required_evidence: tested
tags:
  - prolog
  - build
  - pipeline
  - validation
  - lane:strict
id: REQ-prolog-build-workflow-targets
type: req
---
The SWI-Prolog build pipeline configuration must accept linux-x64-gnu, linux-arm64-gnu, darwin-arm64, and darwin-x64. The SWI-Prolog build workflow must declare separate build and clean-consumer smoke jobs for each of the four launch targets. The SWI-Prolog build workflow must trigger on pin, build-script, patch, or workflow changes and manual dispatch. The SWI-Prolog build command must refuse native compilation outside GitHub Actions.

## Context

Each launch target gets its own build and smoke job, and native compilation is refused on a developer machine so a published runtime always comes from the pinned, reproducible workflow.

Kibi ships prebuilt SWI-Prolog runtimes, so every published artifact must come from a pinned build on a clean runner, carry provenance that is checked, and pass a smoke run as a consumer would install it.

## Why this changed

Split from REQ-prolog-build-pipeline-validation, which held three behaviors: which targets the build workflow covers and where native builds may run, how a built artifact's provenance and contents are verified, and how the clean consumer smoke runs the artifact. Each child is one of them, and only the functions that decide each behavior keep their implements links.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
