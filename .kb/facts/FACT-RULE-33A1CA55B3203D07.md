---
title: 'Rule: Source classification must resolve a .pl file to Perl or Prolog only from a consistent explicit language signal, its shebang, or bounded leading content that is unambiguous between the two languages'
status: active
fact_kind: rule
rule_ir:
  version: kibi.logic.v1
  kind: rule
  modality: forbid
  head:
    kind: atom
    name: resolve_pl_source_language
    args:
      - kind: const
        value: source_analysis.language_catalog
        type: analyzer
      - kind: var
        name: V1
        type: source_file
  body:
    kind: all
    items:
      - kind: atom
        name: pl_extension_source_file
        args:
          - kind: const
            value: source_analysis.language_catalog
            type: analyzer
          - kind: var
            name: V1
            type: source_file
      - kind: atom
        name: unambiguous_perl_prolog_signal_absent
        args:
          - kind: const
            value: source_analysis.language_catalog
            type: analyzer
          - kind: var
            name: V1
            type: source_file
  variables:
    - name: V1
      type: source_file
      quantifier: forall
rule_hash: 7b433eee08bdf06317b724dff9d1225990717219187e39796654d3e8c1f1cf27
semantic_key: SEM-7B433EEE08BDF06317B724DF
rule_schema_id: FACT-RULE-SCHEMA-LOGIC-V1
rule_name: kibi.logic.v1
canonical_key: SEM-7B433EEE08BDF06317B724DF
claim_key: CLAIM-74CCA0B4217E88FE
claim_text: Source classification must resolve a .pl file to Perl or Prolog only from a consistent explicit language signal, its shebang, or bounded leading content that is unambiguous between the two languages
claim_span_start: 113
claim_span_end: 311
tags:
  - lane:logic
  - logic-ir-v1
text_ref: docs/architecture/multilingual-language-catalog.md
origin:
  kind: agent
  recorded_at: '2026-10-30T14:45:05.638Z'
id: FACT-RULE-33A1CA55B3203D07
type: fact
---
