---
title: ZCode hooks emit no output in unowned roots
status: active
tags:
  - zcode
  - ontology
fact_kind: predicate
claim_key: CLAIM-D736785D7DF3106F
claim_text: When the resolved project root does not own .kb/manifest.json, kibi-zcode hooks must emit no output
claim_span_start: 890
claim_span_end: 989
predicate_namespace: kibi_zcode
predicate_name: conditional_behavior
predicate_args:
  - kibi_zcode_adapter
  - no_owned_kb_manifest
  - emit_hook_output
canonical_key: conditional_behavior(kibi_zcode_adapter,no_owned_kb_manifest,emit_hook_output)
polarity: deny
id: FACT-PRED-ZCODE-NO-HOOK-OUTPUT-UNOWNED
type: fact
---
When the resolved project root does not own .kb/manifest.json, kibi-zcode hooks must emit no output