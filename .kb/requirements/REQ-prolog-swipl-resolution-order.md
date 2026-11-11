---
title: Kibi resolves SWI-Prolog from KIBI_SWIPL, then the bundle, then PATH, and says how to install it when none works
status: open
semantic_text: Kibi must resolve SWI-Prolog from KIBI_SWIPL first, then from the verified bundled platform package, then from swipl on PATH. Kibi must skip the bundled platform package when KIBI_SWIPL is system. Kibi must reject a swipl on PATH older than version 9.0. Kibi must fail with the detected platform, the covering platform package, and the operating-system install command when no usable SWI-Prolog is found.
semantic_clauses:
  - Kibi must resolve SWI-Prolog from KIBI_SWIPL first, then from the verified bundled platform package, then from swipl on PATH
  - Kibi must skip the bundled platform package when KIBI_SWIPL is system
  - Kibi must reject a swipl on PATH older than version 9.0
  - Kibi must fail with the detected platform, the covering platform package, and the operating-system install command when no usable SWI-Prolog is found
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: a0f37ee12bf58f36fe29413d40f7bcf2955455e23d9083edc709c07f663c8ae5
semantic_inventory:
  - claim_key: CLAIM-FDC71CEE4F0FEE05
    claim_text: Kibi must resolve SWI-Prolog from KIBI_SWIPL first, then from the verified bundled platform package, then from swipl on PATH
    role: normative
    status: modeled
    span:
      start: 0
      end: 124
    reason: Grounded by FACT-prolog-bundled-resolves-env-then-bundled-then-path via requires_property.
  - claim_key: CLAIM-D6D38F79C8941288
    claim_text: Kibi must skip the bundled platform package when KIBI_SWIPL is system
    role: normative
    status: modeled
    span:
      start: 126
      end: 195
    reason: Grounded by FACT-prolog-bundled-skips-bundle-when-env-is-system via requires_property.
  - claim_key: CLAIM-7ED81CE5062FB889
    claim_text: Kibi must reject a swipl on PATH older than version 9.0
    role: normative
    status: modeled
    span:
      start: 197
      end: 252
    reason: Grounded by FACT-prolog-bundled-rejects-path-swipl-older-than-9 via requires_property.
  - claim_key: CLAIM-A51EE716AC9D093E
    claim_text: Kibi must fail with the detected platform, the covering platform package, and the operating-system install command when no usable SWI-Prolog is found
    role: normative
    status: modeled
    span:
      start: 254
      end: 403
    reason: Grounded by FACT-prolog-bundled-names-platform-package-and-install-command-when-missing via requires_property.
logic_claims:
  - CLAIM-FDC71CEE4F0FEE05
  - CLAIM-D6D38F79C8941288
  - CLAIM-7ED81CE5062FB889
  - CLAIM-A51EE716AC9D093E
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T09:17:02.278Z'
priority: must
firmness: default
required_evidence: tested
tags:
  - prolog
  - bundle
  - resolver
  - lane:strict
id: REQ-prolog-swipl-resolution-order
type: req
---
Kibi must resolve SWI-Prolog from KIBI_SWIPL first, then from the verified bundled platform package, then from swipl on PATH. Kibi must skip the bundled platform package when KIBI_SWIPL is system. Kibi must reject a swipl on PATH older than version 9.0. Kibi must fail with the detected platform, the covering platform package, and the operating-system install command when no usable SWI-Prolog is found.

## Context

An explicit KIBI_SWIPL always wins, so an operator can pin or bypass the bundle, and a missing runtime fails with the exact package and install command for the detected platform.

Every Kibi command runs on SWI-Prolog, so which install is chosen must be predictable, and a damaged or wrong bundle must never be run in place of a working one.

## Why this changed

Split from REQ-prolog-bundled-runtime, which held two behaviors: the order Kibi resolves SWI-Prolog in with its failure message, and verification of the bundled platform package it runs. Each child is one of them, and only the functions that decide each behavior keep their implements links.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
