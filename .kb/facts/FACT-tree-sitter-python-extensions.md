---
title: A Python source file shall end in .py or .pyi
status: active
fact_kind: property_value
subject_key: kibi.tree_sitter.languages
claim_key: CLAIM-7EF27325E2CE1902
claim_text: A Python source file shall end in .py or .pyi
text_ref: REQ-tree-sitter-language-set
property_key: python_extensions
operator: eq
value_type: set
value_set:
  - .py
  - .pyi
origin:
  kind: agent
  recorded_at: '2026-10-28T22:41:33.224Z'
id: FACT-tree-sitter-python-extensions
type: fact
---
Kibi proves this claim with a certificate it re-runs against the code itself, so the claim stays proved only while the code still holds the stated value.