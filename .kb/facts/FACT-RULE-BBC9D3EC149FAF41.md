---
title: Source ranges validated against supplied snapshot in UTF-16 units
status: active
tags:
  - lane:logic
  - logic-ir-v1
text_ref: docs/architecture/multilingual-source-analysis.md
canonical_key: SEM-B2582E6223DC8CBCCE150D52
claim_key: CLAIM-282709B342C91C3A
claim_text: Source analysis v2 must validate UTF-16 source ranges against the supplied snapshot content
rule_hash: b2582e6223dc8cbcce150d5252d44faa521fe88084c0a6099c96fb73295faae0
rule_schema_id: FACT-RULE-SCHEMA-LOGIC-V1
rule_name: FACT-RULE-SCHEMA-LOGIC-V1
semantic_key: SEM-B2582E6223DC8CBCCE150D52
rule_ir:
  version: kibi.logic.v1
  kind: atom
  modality: oblige
  head:
    kind: atom
    name: source_range_validation
    args:
      - kind: const
        value: source_analysis.v2
        type: analyzer
      - kind: const
        value: utf16_code_units
        type: coordinate_unit
      - kind: const
        value: supplied_snapshot_content
        type: validation_basis
  ruleSchemaId: FACT-RULE-SCHEMA-LOGIC-V1
fact_kind: rule
claim_span_start: 66
claim_span_end: 157
id: FACT-RULE-BBC9D3EC149FAF41
type: fact
---
