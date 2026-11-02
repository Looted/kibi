---
title: 'Tree-sitter script references: Kibi must refuse a PHP, C, Bash, Terraform or HCL reference read that'
status: active
fact_kind: property_value
subject_key: kibi.tree_sitter_script_references
property_key: refuses_hidden_script_language_references
operator: eq
claim_key: CLAIM-679A838241E4B07D
claim_text: Kibi must refuse a PHP, C, Bash, Terraform or HCL reference read that reaches code built at run time, a macro it cannot expand, a conditional block that adds members or a name or value computed at run time
value_type: bool
value_bool: true
tags:
  - strict-modeling
  - lane:strict
  - provenance:req-kibi-tree-sitter-script-references
  - fact:property_value
origin:
  kind: agent
  recorded_at: '2026-11-02T12:20:12.883Z'
id: FACT-kibi-tree-sitter-script-references-refuse-hidden
type: fact
---
