---
title: Unreadable manifests and unindexed coordinate-bound files are never called unlinked
status: active
tags:
  - lane:ontology
  - hooks
  - search-lane
text_ref: .kb/requirements/REQ-kibi-hooks-flow-manifest.md
fact_kind: predicate
polarity: assert
canonical_key: logical_requirement_rule(kibi.host.edit_snippets,unreadable_manifest_or_coordinate_bound_file,never_described_as_unlinked)
claim_key: CLAIM-D6A057D3195A654A
claim_text: The Claude Code edit hook must not describe a source file as unlinked when the manifest is unreadable or when the coordinate artifact binds a symbol to that file but no manifest record of it was indexed
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.host.edit_snippets
  - unreadable_manifest_or_coordinate_bound_file
  - never_described_as_unlinked
predicate_namespace: kibi.requirements
origin:
  kind: agent
  recorded_at: '2026-10-11T16:19:20.480Z'
id: FACT-HOOKS-UNOWNED-NOTE-GUARD
type: fact
---
