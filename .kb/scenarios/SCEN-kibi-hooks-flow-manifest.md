---
title: An agent edits code in a project whose symbol manifest is still in flow layout
status: active
tags:
  - hooks
  - agent-core
  - claude
  - sync
  - search-lane
priority: must
origin:
  kind: agent
  recorded_at: '2026-10-11T16:18:57.344Z'
id: SCEN-kibi-hooks-flow-manifest
type: scenario
---
# An agent edits code in a project whose symbol manifest is still in flow layout

Given a project whose `.kb/symbols.yaml` was written by kibi-cli before 2.18.0, so every symbol sits on the one flow-sequence line that `kibi init`'s `symbols: []` grew into, and a coordinate artifact that binds those symbols to their files
When the Claude Code hook runs before an edit of a file one of those symbols implements a requirement in
Then the hook names that requirement exactly as it would for a block-layout manifest
And a file the coordinate artifact binds a symbol to, whose manifest record the scanner could not index, is never described as having no linked symbol
And a file whose manifest record was indexed but carries no requirement link still gets the unowned note
And a manifest the scanner cannot read is reported once per session as unreadable, pointing at kb_query and `kibi sync`, instead of every edited file being called unlinked
When a plain `kibi sync` runs on that project
Then `.kb/symbols.yaml` is rewritten in block layout with its comments and symbol order kept, once, and the compiled KB still holds every symbol and relationship
