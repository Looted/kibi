---
title: Explicit source-analysis completeness status
status: active
fact_kind: rule
rule_ir:
  version: kibi.logic.v1
  kind: atom
  modality: oblige
  head:
    kind: atom
    name: result_status_visibility
    args:
      - kind: const
        value: source_analysis.v2
        type: analyzer
      - kind: const
        value: completeness
        type: status_kind
      - kind: const
        value: explicit
        type: visibility
  ruleSchemaId: FACT-RULE-SCHEMA-LOGIC-V1
rule_hash: f65e028487f7259b06eb5ce8e43c9239c6bd2517d937487fe228344a96e19c84
semantic_key: SEM-F65E028487F7259B06EB5CE8
rule_schema_id: FACT-RULE-SCHEMA-LOGIC-V1
rule_name: FACT-RULE-SCHEMA-LOGIC-V1
canonical_key: SEM-F65E028487F7259B06EB5CE8
claim_key: CLAIM-1F9EAB867F99F3A0
claim_text: Source analysis v2 must preserve an explicit completeness status
claim_span_start: 0
claim_span_end: 64
tags:
  - lane:logic
  - logic-ir-v1
text_ref: docs/architecture/multilingual-source-analysis.md
id: FACT-RULE-5685EBEB57411C24
type: fact
---
