---
title: Doctor attributes secrets to their real bootstrap source without importing plugins
status: open
semantic_text: Doctor secret attribution must use the actual bootstrap sources with remembered pre-bootstrap process keys. Doctor must report capability plugin package, capability, mode, and declared dependency without importing plugin packages; first-party Jev secret and model diagnostics may be static.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 238d62b587384f513840f2b4a174cf3705be8c0848b321bfdcd5abc56dbd4456
semantic_inventory:
  - claim_key: CLAIM-987CF003A78B4146
    claim_text: Doctor secret attribution must use the actual bootstrap sources with remembered pre-bootstrap process keys
    role: normative
    status: modeled
    span:
      start: 0
      end: 106
    reason: Grounded via FACT-PROP-ENV-BOOTSTRAP-SECRET-ATTR
  - claim_key: CLAIM-DFCDB5277B07B761
    claim_text: Doctor must report capability plugin package, capability, mode, and declared dependency without importing plugin packages
    role: normative
    status: modeled
    span:
      start: 108
      end: 229
    reason: Grounded via FACT-PROP-ENV-BOOTSTRAP-DOCTOR-REPORT
  - claim_key: CLAIM-046E0B392D44C46E
    claim_text: first-party Jev secret and model diagnostics may be static
    role: descriptive
    status: modeled
    span:
      start: 231
      end: 289
    reason: Grounded via FACT-PROP-ENV-BOOTSTRAP-JEV-STATIC
logic_claims:
  - CLAIM-987CF003A78B4146
  - CLAIM-DFCDB5277B07B761
  - CLAIM-046E0B392D44C46E
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 1): "Agree to all."'
  approved_by: maintainer
  recorded_at: '2026-11-04T15:05:11.596Z'
firmness: default
required_evidence: tested
tags:
  - env
  - bootstrap
  - doctor
  - cli
  - mcp
  - review:context-missing
id: REQ-kibi-env-bootstrap-doctor-attribution
type: req
---
Doctor secret attribution must use the actual bootstrap sources with remembered pre-bootstrap process keys. Doctor must report capability plugin package, capability, mode, and declared dependency without importing plugin packages; first-party Jev secret and model diagnostics may be static.

## Context

inspectSecretSource and secretSourceFromBootstrap in packages/cli/src/env/bootstrap.ts tell doctor where each secret came from.



## Why this changed

Split from REQ-kibi-env-bootstrap by behavior: the shared bootstrap and its source order, workspace root resolution, and doctor attribution. Each child is owned by the functions that decide it, and keeps the parent's wording.

## Source

> Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 1): "Agree to all."
