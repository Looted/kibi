---
title: Qualified Java, C# and C++ callable locators must remain stable when another supported overload is added
status: active
fact_kind: rule
rule_ir:
  version: kibi.logic.v1
  kind: rule
  modality: oblige
  head:
    kind: atom
    name: preserve_callable_locator
    args:
      - kind: const
        value: source_analysis.language_catalog
        type: analyzer
      - kind: var
        name: V1
        type: callable
  body:
    kind: all
    items:
      - kind: atom
        name: another_supported_overload_added
        args:
          - kind: const
            value: source_analysis.language_catalog
            type: analyzer
          - kind: var
            name: V1
            type: callable
      - kind: atom
        name: java_csharp_cpp_supported_callable
        args:
          - kind: const
            value: source_analysis.language_catalog
            type: analyzer
          - kind: var
            name: V1
            type: callable
  variables:
    - name: V1
      type: callable
      quantifier: forall
  ruleSchemaId: FACT-RULE-SCHEMA-LOGIC-V1
rule_hash: 7fb5c54c48af33b3a02f93143721222d57ac44dbafd633b3284bfb684572e2e1
semantic_key: SEM-7FB5C54C48AF33B3A02F9314
rule_schema_id: FACT-RULE-SCHEMA-LOGIC-V1
rule_name: FACT-RULE-SCHEMA-LOGIC-V1
canonical_key: SEM-7FB5C54C48AF33B3A02F9314
claim_key: CLAIM-1B48A4FB9D21C6C4
claim_text: Qualified Java, C# and C++ callable locators must remain stable when another supported overload is added
claim_span_start: 278
claim_span_end: 382
tags:
  - lane:logic
  - logic-ir-v1
text_ref: docs/architecture/multilingual-language-catalog.md
id: FACT-RULE-09E18DDD6312EFC5
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
