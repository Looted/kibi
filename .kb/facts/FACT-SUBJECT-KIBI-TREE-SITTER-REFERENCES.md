---
title: Tree-sitter source references subject
status: active
fact_kind: subject
subject_key: kibi.tree_sitter_references
canonical_key: kibi.tree_sitter_references
tags:
  - strict-modeling
  - lane:strict
  - provenance:req-kibi-tree-sitter-references
  - fact:subject
text_ref: REQ-kibi-tree-sitter-references
origin:
  kind: agent
  recorded_at: '2026-10-31T16:49:09.399Z'
id: FACT-SUBJECT-KIBI-TREE-SITTER-REFERENCES
type: fact
---

Static reference reads in Go, Java, C# and Rust source through the tree-sitter plugin for source proofs, refusing reads that reach reflection or dynamic dispatch or lack a released grammar. Script languages are a separate subject.
