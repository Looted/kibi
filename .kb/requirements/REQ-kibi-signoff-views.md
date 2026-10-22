---
title: kibi signoff shows the requirement summary and pending decisions as one readable view
status: open
priority: should
tags:
  - cli
  - signoff
  - hosts
firmness: default
semantic_text: Kibi signoff must list each requirement a change adds, rewrites or retires and each current requirement the changed code implements, quoting its statement with its firmness and proof state. Kibi signoff with a questions file must number each decision and quote the recorded requirement it changes or conflicts with. Kibi signoff must write its latest view as JSON, Markdown and a self-contained HTML page under .kb/briefs/signoff. The Kibi Claude Code, OpenCode and VS Code integrations must show a fenced signoff view as rendered text instead of a raw code block.
semantic_clauses:
  - Kibi signoff must list each requirement a change adds, rewrites or retires and each current requirement the changed code implements, quoting its statement with its firmness and proof state
  - Kibi signoff with a questions file must number each decision and quote the recorded requirement it changes or conflicts with
  - Kibi signoff must write its latest view as JSON, Markdown and a self-contained HTML page under .kb/briefs/signoff
  - The Kibi Claude Code, OpenCode and VS Code integrations must show a fenced signoff view as rendered text instead of a raw code block
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 5ef314e7305a8dc87ddaea9db23d7d34fa9e412d7176447dc54ad056477fe3d1
semantic_inventory:
  - claim_key: CLAIM-AA496D7010BCE3DD
    claim_text: Kibi signoff must list each requirement a change adds, rewrites or retires and each current requirement the changed code implements, quoting its statement with its firmness and proof state
    role: normative
    status: modeled
    span:
      start: 0
      end: 188
  - claim_key: CLAIM-B670D0ADBB0870D2
    claim_text: Kibi signoff with a questions file must number each decision and quote the recorded requirement it changes or conflicts with
    role: normative
    status: modeled
    span:
      start: 190
      end: 314
  - claim_key: CLAIM-5E9619C61E20EAAF
    claim_text: Kibi signoff must write its latest view as JSON, Markdown and a self-contained HTML page under .kb/briefs/signoff
    role: normative
    status: modeled
    span:
      start: 316
      end: 429
  - claim_key: CLAIM-1BE21B0FB39D22F2
    claim_text: The Kibi Claude Code, OpenCode and VS Code integrations must show a fenced signoff view as rendered text instead of a raw code block
    role: normative
    status: modeled
    span:
      start: 431
      end: 563
logic_claims:
  - CLAIM-AA496D7010BCE3DD
  - CLAIM-B670D0ADBB0870D2
  - CLAIM-5E9619C61E20EAAF
  - CLAIM-1BE21B0FB39D22F2
origin:
  kind: agent
  recorded_at: '2026-10-22T09:25:17.980Z'
id: REQ-kibi-signoff-views
type: req
---
Kibi signoff must list each requirement a change adds, rewrites or retires and each current requirement the changed code implements, quoting its statement with its firmness and proof state. Kibi signoff with a questions file must number each decision and quote the recorded requirement it changes or conflicts with. Kibi signoff must write its latest view as JSON, Markdown and a self-contained HTML page under .kb/briefs/signoff. The Kibi Claude Code, OpenCode and VS Code integrations must show a fenced signoff view as rendered text instead of a raw code block.

## Context

Agents following the Kibi skills already ask the person to sign off on requirements before a commit, and ask firmness questions while they work, but both arrive as loose chat text: the person has to scroll back through the conversation to find which rule a question changes and what is recorded today. The project owner asked for a readable summary at signoff and a clear form for the decisions waiting on them. The view is a CLI command and skill guidance rather than a new MCP tool because the MCP tool list is already at the size the owner wants to keep, and signoff stays advisory: the command reports and never blocks. Each host shows the same data in its own way, so one JSON shape feeds the Markdown block, the HTML page and the editor panels.

## Source

"One thing we could improve though is generating some nice summary of the requirements." "One concern I have is adding another tool. I'd rather keep the tools light (we're already at the threshold), so maybe this could be a skill? I'd do the host work as well." "The firmness questions that I currently get (where I would expect a nice visual form for me to actually read them, so I don't have to browse the chat history)."