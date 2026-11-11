---
title: Kibi runs a bundled SWI-Prolog only after verifying its manifest and checksum, with SWI_HOME_DIR set
status: open
semantic_text: Kibi must refuse a bundled platform package whose manifest is malformed or whose binary checksum differs from the manifest. Kibi must set SWI_HOME_DIR for the SWI-Prolog child process when the bundled build is used.
semantic_clauses:
  - Kibi must refuse a bundled platform package whose manifest is malformed or whose binary checksum differs from the manifest
  - Kibi must set SWI_HOME_DIR for the SWI-Prolog child process when the bundled build is used
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 2bebce32ecdd730a9e0caf5a10b4697413ccd33bc13128d91543569f1bdc8a24
semantic_inventory:
  - claim_key: CLAIM-7BFD6D037E8F4195
    claim_text: Kibi must refuse a bundled platform package whose manifest is malformed or whose binary checksum differs from the manifest
    role: normative
    status: modeled
    span:
      start: 0
      end: 122
    reason: Grounded by FACT-prolog-bundled-refuses-corrupt-bundle via requires_property.
  - claim_key: CLAIM-DD0EC27D9AD705EC
    claim_text: Kibi must set SWI_HOME_DIR for the SWI-Prolog child process when the bundled build is used
    role: normative
    status: modeled
    span:
      start: 124
      end: 214
    reason: Grounded by FACT-prolog-bundled-sets-swi-home-dir-for-bundled-child via requires_property.
logic_claims:
  - CLAIM-7BFD6D037E8F4195
  - CLAIM-DD0EC27D9AD705EC
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T09:18:13.254Z'
priority: must
firmness: default
required_evidence: tested
tags:
  - prolog
  - bundle
  - resolver
  - lane:strict
id: REQ-prolog-bundle-verification
type: req
---
Kibi must refuse a bundled platform package whose manifest is malformed or whose binary checksum differs from the manifest. Kibi must set SWI_HOME_DIR for the SWI-Prolog child process when the bundled build is used.

## Context

The bundle is a binary downloaded with the package, so its manifest and checksum are checked before it runs, and its own SWI home is passed so it never loads another install's libraries.

Every Kibi command runs on SWI-Prolog, so which install is chosen must be predictable, and a damaged or wrong bundle must never be run in place of a working one.

## Why this changed

Split from REQ-prolog-bundled-runtime, which held two behaviors: the order Kibi resolves SWI-Prolog in with its failure message, and verification of the bundled platform package it runs. Each child is one of them, and only the functions that decide each behavior keep their implements links.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
