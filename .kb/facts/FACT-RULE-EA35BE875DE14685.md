---
title: HCL declaration records must preserve structural scope without implying executable-symbol proof
status: active
fact_kind: rule
rule_ir:
  version: kibi.logic.v1
  kind: atom
  modality: oblige
  head:
    kind: atom
    name: declaration_scope_separation
    args:
      - kind: const
        value: hcl
        type: language
      - kind: const
        value: structural_record
        type: record_scope
      - kind: const
        value: executable_symbol_proof
        type: proof_scope
  ruleSchemaId: FACT-RULE-SCHEMA-LOGIC-V1
rule_hash: e686ea195e9626d240d99b303c6b67ffd69f91e2e24d37609940c506112dfa02
semantic_key: SEM-E686EA195E9626D240D99B30
rule_schema_id: FACT-RULE-SCHEMA-LOGIC-V1
rule_name: FACT-RULE-SCHEMA-LOGIC-V1
canonical_key: SEM-E686EA195E9626D240D99B30
claim_key: CLAIM-68ABFA8E7140BC5A
claim_text: HCL declaration records must preserve structural scope without implying executable-symbol proof
claim_span_start: 384
claim_span_end: 479
tags:
  - lane:logic
  - logic-ir-v1
text_ref: docs/architecture/multilingual-language-catalog.md
id: FACT-RULE-EA35BE875DE14685
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
