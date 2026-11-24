---
title: The kibi-zcode hooks must invoke a hook runner that ships as a repository-tracked file, so a ZCode…
status: open
firmness: firm
origin:
  kind: human
  ref: Ok, can you prepare a PR with a fix, and describe the issue in it as well for a third-party review?
  recorded_at: '2026-11-20T15:17:22.095Z'
rationale: A ZCode marketplace install copies the plugin directory as-is and never runs a build; with the runner generated only into dist/, the copied install's hooks.json pointed at a missing file and every lifecycle hook silently failed to start, which is how the installed 0.1.0 and a fresh 0.16.0 update were both found broken.
semantic_text: The kibi-zcode hooks must invoke a hook runner that ships as a repository-tracked file, so a ZCode marketplace install that copies the repository without building starts every declared hook.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 31f1666c85438febbff1b19c790d778d29c56bac8b5c71b81ae80714a9b93913
semantic_inventory:
  - claim_key: CLAIM-0FFDED12A302E870
    claim_text: The kibi-zcode hooks must invoke a hook runner that ships as a repository-tracked file, so a ZCode marketplace install that copies the repository without building starts every declared hook
    role: normative
    span:
      end: 189
      start: 0
    status: modeled
logic_claims:
  - CLAIM-0FFDED12A302E870
id: REQ-kibi-zcode-hooks-invoke-hook-runner
type: req
semantic_clauses:
  - The kibi-zcode hooks must invoke a hook runner that ships as a repository-tracked file, so a ZCode marketplace install that copies the repository without building starts every declared hook.
tags:
  - strict-modeling
  - confidence:0.90
  - confidence-band:high
  - provenance:mcp-kibi-model-requirement
  - lane:strict
text_ref: mcp://kibi/model-requirement
---
The kibi-zcode hooks must invoke a hook runner that ships as a repository-tracked file, so a ZCode marketplace install that copies the repository without building starts every declared hook.

## Context

A ZCode marketplace install copies the plugin directory as-is and never runs a build; with the runner generated only into dist/, the copied install's hooks.json pointed at a missing file and every lifecycle hook silently failed to start, which is how the installed 0.1.0 and a fresh 0.16.0 update were both found broken.

## Source

> Ok, can you prepare a PR with a fix, and describe the issue in it as well for a third-party review?
