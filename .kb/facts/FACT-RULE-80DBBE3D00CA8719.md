---
title: Source classification must retain C/C++ header and Perl/Prolog ambiguity until a consistent explicit language signal is present
status: active
fact_kind: rule
rule_ir:
  version: kibi.logic.v1
  kind: rule
  modality: oblige
  head:
    kind: atom
    name: retain_ambiguous_language_classification
    args:
      - kind: const
        value: source_analysis.language_catalog
        type: analyzer
      - kind: var
        name: V1
        type: language_family
  body:
    kind: all
    items:
      - kind: atom
        name: ambiguous_extension_family
        args:
          - kind: const
            value: source_analysis.language_catalog
            type: analyzer
          - kind: var
            name: V1
            type: language_family
      - kind: atom
        name: consistent_explicit_language_signal_absent
        args:
          - kind: const
            value: source_analysis.language_catalog
            type: analyzer
          - kind: var
            name: V1
            type: language_family
  variables:
    - name: V1
      type: language_family
      quantifier: forall
  ruleSchemaId: FACT-RULE-SCHEMA-LOGIC-V1
rule_hash: 0826bb1d5fa00f56bb751c1c4511b91dc5c96c385e16ef317ddde20b67c5d2c6
semantic_key: SEM-0826BB1D5FA00F56BB751C1C
rule_schema_id: FACT-RULE-SCHEMA-LOGIC-V1
rule_name: FACT-RULE-SCHEMA-LOGIC-V1
canonical_key: SEM-0826BB1D5FA00F56BB751C1C
claim_key: CLAIM-869DA7FAE6FEEEF3
claim_text: Source classification must retain C/C++ header and Perl/Prolog ambiguity until a consistent explicit language signal is present
claim_span_start: 0
claim_span_end: 127
tags:
  - lane:logic
  - logic-ir-v1
text_ref: docs/architecture/multilingual-language-catalog.md
id: FACT-RULE-80DBBE3D00CA8719
type: fact
---
