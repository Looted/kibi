---
title: Claude Code Kibi Plugin
status: active
text_ref: mcp://kibi/model-requirement
tags:
  - strict-modeling
  - confidence:0.90
  - confidence-band:high
  - provenance:mcp-kibi-model-requirement
  - lane:strict
  - fact:subject
fact_kind: subject
subject_key: claude.kibi_plugin
canonical_key: claude.kibi_plugin
claim_key: CLAIM-94B3A133D10BFB98
claim_text: The kibi-claude package must remain optional
id: FACT-SUBJECT-7D8A11CB905D46FD
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

The kibi-claude package for Claude Code: an optional plugin shipping manifest, skills, MCP launcher and lifecycle hooks that give progressive-disclosure knowledge snippets, remind once at stop about unchecked edits and may ask before a firm-code edit. Its hooks never call the CLI or deny a tool call.
