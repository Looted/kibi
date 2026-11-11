---
title: Source authoring writes into a derived .kb tree
status: active
tags:
  - negative-path
fact_kind: property_value
subject_key: kibi.kb.canonical_layout
property_key: document_path_rejects_derived_trees
operator: eq
value_type: bool
value_bool: false
origin:
  kind: agent
  recorded_at: '2026-11-10T09:00:00.000Z'
id: FACT-NEG-kibi-canonical-source-authoring-DERIVED-TREE-WRITE
type: fact
---
kb_upsert accepts a document.path inside a derived .kb tree, such as .kb/branches or .kb/migrations, and writes the entity file there.
