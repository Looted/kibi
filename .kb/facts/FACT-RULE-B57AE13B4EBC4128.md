---
title: 'Rule: Prolog analysis must return one symbol per predicate name and arity that spans the PlDoc block above its first clause through its last clause'
status: active
fact_kind: rule
rule_ir:
  version: kibi.logic.v1
  kind: rule
  modality: oblige
  head:
    kind: atom
    name: return_predicate_span_symbol
    args:
      - kind: const
        value: source_analysis.language_catalog
        type: analyzer
      - kind: var
        name: V1
        type: predicate
  body:
    kind: all
    items:
      - kind: atom
        name: prolog_predicate_clauses_present
        args:
          - kind: const
            value: source_analysis.language_catalog
            type: analyzer
          - kind: var
            name: V1
            type: predicate
  variables:
    - name: V1
      type: predicate
      quantifier: forall
rule_hash: 69a71045b43f9c9aba7ceecfa29c82d73fd5eeffdfaa31d59712dbe27ea4c98b
semantic_key: SEM-69A71045B43F9C9ABA7CEECF
rule_schema_id: FACT-RULE-SCHEMA-LOGIC-V1
rule_name: kibi.logic.v1
canonical_key: SEM-69A71045B43F9C9ABA7CEECF
claim_key: CLAIM-CA1F42A97DACEBAD
claim_text: Prolog analysis must return one symbol per predicate name and arity that spans the PlDoc block above its first clause through its last clause
claim_span_start: 665
claim_span_end: 806
tags:
  - lane:logic
  - logic-ir-v1
text_ref: docs/architecture/multilingual-language-catalog.md
origin:
  kind: agent
  recorded_at: '2026-10-30T14:48:06.355Z'
id: FACT-RULE-B57AE13B4EBC4128
type: fact
---
