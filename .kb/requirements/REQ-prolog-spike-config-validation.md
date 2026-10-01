---
title: SWI-Prolog spike configuration validates pins and targets
status: open
priority: must
text_ref: scripts/swipl-spike.py
tags:
  - prolog
  - spike
  - build
  - validation
semantic_text: The SWI-Prolog spike configuration check must accept the pinned source manifest for linux-x64-gnu and darwin-arm64. The configuration check must reject malformed source metadata. The configuration check must reject unsupported targets. The configuration check must report the pinned SWI-Prolog version, dependency versions, and required library list. The configuration check must not start a native build.
semantic_clauses:
  - The SWI-Prolog spike configuration check must accept the pinned source manifest for linux-x64-gnu and darwin-arm64
  - The configuration check must reject malformed source metadata
  - The configuration check must reject unsupported targets
  - The configuration check must report the pinned SWI-Prolog version, dependency versions, and required library list
  - The configuration check must not start a native build
logic_claims:
  - CLAIM-2C6217A130B5C6B9
  - CLAIM-E9ABBEB3CB9F1EA3
  - CLAIM-4AF1C39751B8F6DE
  - CLAIM-91B226BCC0147B41
  - CLAIM-B09E2F32FAD12268
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 0b77fb32773429a6d979a86e1c347bfbea852df3353918a7426de566d1074c92
semantic_inventory:
  - claim_key: CLAIM-2C6217A130B5C6B9
    claim_text: The SWI-Prolog spike configuration check must accept the pinned source manifest for linux-x64-gnu and darwin-arm64
    role: normative
    status: modeled
    span:
      start: 0
      end: 114
  - claim_key: CLAIM-E9ABBEB3CB9F1EA3
    claim_text: The configuration check must reject malformed source metadata
    role: normative
    status: modeled
    span:
      start: 116
      end: 177
  - claim_key: CLAIM-4AF1C39751B8F6DE
    claim_text: The configuration check must reject unsupported targets
    role: normative
    status: modeled
    span:
      start: 179
      end: 234
  - claim_key: CLAIM-91B226BCC0147B41
    claim_text: The configuration check must report the pinned SWI-Prolog version, dependency versions, and required library list
    role: normative
    status: modeled
    span:
      start: 236
      end: 349
  - claim_key: CLAIM-B09E2F32FAD12268
    claim_text: The configuration check must not start a native build
    role: normative
    status: modeled
    span:
      start: 351
      end: 404
id: REQ-prolog-spike-config-validation
type: req
---
The SWI-Prolog spike configuration check must accept the pinned source manifest for linux-x64-gnu and darwin-arm64. The configuration check must reject malformed source metadata. The configuration check must reject unsupported targets. The configuration check must report the pinned SWI-Prolog version, dependency versions, and required library list. The configuration check must not start a native build.
