---
title: SWI-Prolog build workflow covers the five launch targets and builds natively only on clean GitHub Actions runners
status: open
priority: must
required_evidence: tested
tags:
  - prolog
  - build
  - pipeline
  - validation
  - lane:strict
semantic_text: The SWI-Prolog build pipeline configuration must accept linux-x64-gnu, linux-arm64-gnu, darwin-arm64, darwin-x64, and win32-x64. The SWI-Prolog build workflow must declare separate build and clean-consumer smoke jobs for each of the five launch targets. The SWI-Prolog build workflow must trigger on pin, build-script, patch, or workflow changes and manual dispatch. The SWI-Prolog build command must refuse native compilation outside GitHub Actions.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 96c099eafee7fa25a9c320627e7c54cfcea961064bf2fa9d77c6ede6d5564c26
semantic_inventory:
  - claim_key: CLAIM-0BA6AB0B0F426510
    claim_text: The SWI-Prolog build pipeline configuration must accept linux-x64-gnu, linux-arm64-gnu, darwin-arm64, darwin-x64, and win32-x64
    role: normative
    status: modeled
    span:
      start: 0
      end: 127
  - claim_key: CLAIM-33572329C3AA610F
    claim_text: The SWI-Prolog build workflow must declare separate build and clean-consumer smoke jobs for each of the five launch targets
    role: normative
    status: modeled
    span:
      start: 129
      end: 252
  - claim_key: CLAIM-F6911731ED97EF27
    claim_text: The SWI-Prolog build workflow must trigger on pin, build-script, patch, or workflow changes and manual dispatch
    role: normative
    status: modeled
    span:
      start: 254
      end: 365
  - claim_key: CLAIM-CA4DACEE5AABD49F
    claim_text: The SWI-Prolog build command must refuse native compilation outside GitHub Actions
    role: normative
    status: modeled
    span:
      start: 367
      end: 449
logic_claims:
  - CLAIM-0BA6AB0B0F426510
  - CLAIM-33572329C3AA610F
  - CLAIM-F6911731ED97EF27
  - CLAIM-CA4DACEE5AABD49F
origin:
  kind: agent
  recorded_at: '2026-11-20T11:27:22.677Z'
id: REQ-prolog-build-workflow-targets-v2
type: req
---
## Context
Supersedes REQ-prolog-build-workflow-targets: win32-x64 was added as a fifth launch target, repackaged from the pinned upstream installer (REQ-prolog-win32-prebuilt-provenance), so native Windows x64 needs no manual SWI-Prolog install. Reason: operator-approved plan for kibi-swipl-win32-x64 (2026-11-20). Source: scripts/swipl-windows-repack.py, scripts/swipl-version.json, .github/workflows/swipl-build.yml.

## Why this changed
The old four-target decision predated native Windows support: it assumed every consumer could compile SWI-Prolog from source or install it by hand. The new requirement adds win32-x64 as a fifth launch target whose payload is repackaged from the pinned upstream installer, because an MSVC source build with vendored dependencies would be a much larger project and upstream ships no portable Windows archive.