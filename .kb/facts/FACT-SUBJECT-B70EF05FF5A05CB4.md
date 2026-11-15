---
title: Kibi Tree-sitter language authoring scaffold
status: active
text_ref: docs/architecture/tree-sitter-language-authoring.md
tags:
  - multilingual
  - tree-sitter
  - language-authoring
  - lane:strict
  - fact:subject
fact_kind: subject
subject_key: kibi.treesitterlanguageauthoringscaffold
canonical_key: kibi.treesitterlanguageauthoringscaffold
claim_key: CLAIM-D79EE778B5393174
claim_text: The Tree-sitter language authoring scaffold must create an unqualified disconnected draft without modifying live language support.
id: FACT-SUBJECT-B70EF05FF5A05CB4
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

The scaffold that starts authoring a new Tree-sitter language pack from an unqualified, disconnected draft, refusing to overwrite an existing language directory. It creates a starting point, not a qualified pack.
