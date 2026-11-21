---
title: SWI-Prolog build workflow covers the four launch targets and builds natively only on clean GitHub Actions runners
status: closed
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
## Context
Superseded by REQ-prolog-build-workflow-targets-v2: win32-x64 was added as a fifth launch target (repackaged from the pinned upstream installer). Reason: operator-approved plan for kibi-swipl-win32-x64 (2026-11-20).