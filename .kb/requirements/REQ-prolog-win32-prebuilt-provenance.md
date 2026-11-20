---
title: The win32-x64 bundled SWI-Prolog is repackaged from the upstream installer pinned by URL and SHA-256, on a clean Windows runner only
status: open
priority: must
required_evidence: tested
tags:
  - prolog
  - build
  - win32
  - lane:strict
semantic_text: The win32-x64 bundled SWI-Prolog payload must come from the official upstream NSIS installer pinned by URL and SHA-256 under prebuilt.win32-x64 in scripts/swipl-version.json, and the build manifest must record that URL and SHA-256 in a prebuilt block. The win32-x64 repack must run only on a clean GitHub Actions windows-2025 runner and must audit every shipped .exe and .dll as PE32+ x86-64 whose imports resolve only to payload DLLs or Windows system DLLs.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 9195c46ecb7b8e0fc77b12b0eb0827cefdb8f777749bd586d5192d90813a5c3b
semantic_inventory:
  - claim_key: CLAIM-2B98F53BA22D037C
    claim_text: The win32-x64 bundled SWI-Prolog payload must come from the official upstream NSIS installer pinned by URL and SHA-256 under prebuilt.win32-x64 in scripts/swipl-version.json
    role: normative
    status: modeled
    span:
      start: 0
      end: 173
  - claim_key: CLAIM-C71EB6D36CDB2014
    claim_text: the build manifest must record that URL and SHA-256 in a prebuilt block
    role: normative
    status: modeled
    span:
      start: 179
      end: 250
  - claim_key: CLAIM-5B61A708BC19FE6A
    claim_text: The win32-x64 repack must run only on a clean GitHub Actions windows-2025 runner and must audit every shipped .exe and .dll as PE32+ x86-64 whose imports resolve only to payload DLLs or Windows system DLLs
    role: normative
    status: modeled
    span:
      start: 252
      end: 457
logic_claims:
  - CLAIM-2B98F53BA22D037C
  - CLAIM-C71EB6D36CDB2014
  - CLAIM-5B61A708BC19FE6A
origin:
  kind: agent
  ref: Operator-approved plan for the win32-x64 bundled SWI-Prolog PR, 2026-11-20
  approved_by: maintainer
  recorded_at: '2026-11-20T13:30:00.000Z'
id: REQ-prolog-win32-prebuilt-provenance
type: req
---
## Context
Native Windows x64 gets its bundle by repackaging the pinned upstream installer, not by compiling from source. Reason: operator-approved plan for kibi-swipl-win32-x64 (2026-11-20). Source: scripts/swipl-windows-repack.py, scripts/swipl-version.json, .github/workflows/swipl-build.yml (build-windows / smoke-windows).