---
title: 'Rule: Prolog analysis must return each plunit test unit and each test in it as a distinct symbol'
status: active
fact_kind: rule
rule_ir:
  version: kibi.logic.v1
  kind: rule
  modality: oblige
  head:
    kind: atom
    name: return_plunit_symbol
    args:
      - kind: const
        value: source_analysis.language_catalog
        type: analyzer
      - kind: var
        name: V1
        type: plunit_test_block
  body:
    kind: all
    items:
      - kind: atom
        name: plunit_test_block_present
        args:
          - kind: const
            value: source_analysis.language_catalog
            type: analyzer
          - kind: var
            name: V1
            type: plunit_test_block
  variables:
    - name: V1
      type: plunit_test_block
      quantifier: forall
rule_hash: 79d7c40f19dd1b54e15a760acd1106857fa484e4f6215bf5f1845623b488c832
semantic_key: SEM-79D7C40F19DD1B54E15A760A
rule_schema_id: FACT-RULE-SCHEMA-LOGIC-V1
rule_name: kibi.logic.v1
canonical_key: SEM-79D7C40F19DD1B54E15A760A
claim_key: CLAIM-9F27A5506C6CFF7E
claim_text: Prolog analysis must return each plunit test unit and each test in it as a distinct symbol
claim_span_start: 808
claim_span_end: 898
tags:
  - lane:logic
  - logic-ir-v1
text_ref: docs/architecture/multilingual-language-catalog.md
origin:
  kind: agent
  recorded_at: '2026-10-30T14:48:07.994Z'
id: FACT-RULE-B40030FCDA5182C2
type: fact
---
