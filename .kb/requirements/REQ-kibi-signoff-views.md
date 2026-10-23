---
title: kibi signoff shows the requirement summary and pending decisions as one readable view on every host
status: open
priority: should
tags:
  - cli
  - signoff
  - hosts
firmness: default
semantic_text: Kibi signoff must list each requirement a change adds, rewrites or retires and each current requirement the changed code implements, quoting its statement with its firmness and proof state. Kibi signoff with a questions file must number each decision and quote the recorded requirement it changes or conflicts with. Kibi signoff must write its latest view as JSON, Markdown and a self-contained HTML page under .kb/briefs/signoff. Kibi signoff must print the view as unfenced Markdown by default, so that it renders in any chat window or messaging tool. The Kibi Claude Code, OpenCode and VS Code integrations must show a fenced signoff view as rendered text instead of a raw code block. The Kibi Claude Code, Codex, Cursor and ZCode stop hooks must ask once for the signoff view when a session wrote a requirement after the last kibi signoff run.
semantic_clauses:
  - Kibi signoff must list each requirement a change adds, rewrites or retires and each current requirement the changed code implements, quoting its statement with its firmness and proof state
  - Kibi signoff with a questions file must number each decision and quote the recorded requirement it changes or conflicts with
  - Kibi signoff must write its latest view as JSON, Markdown and a self-contained HTML page under .kb/briefs/signoff
  - Kibi signoff must print the view as unfenced Markdown by default, so that it renders in any chat window or messaging tool
  - The Kibi Claude Code, OpenCode and VS Code integrations must show a fenced signoff view as rendered text instead of a raw code block
  - The Kibi Claude Code, Codex, Cursor and ZCode stop hooks must ask once for the signoff view when a session wrote a requirement after the last kibi signoff run
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 53ff2e67d289b882ec9ae4fdf4ebfa6aa90e4c95c4e6da928d1c908039d40092
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
  - claim_key: CLAIM-9866F122FBE889F5
    claim_text: Kibi signoff must print the view as unfenced Markdown by default, so that it renders in any chat window or messaging tool
    role: normative
    status: modeled
    span:
      start: 431
      end: 552
  - claim_key: CLAIM-1BE21B0FB39D22F2
    claim_text: The Kibi Claude Code, OpenCode and VS Code integrations must show a fenced signoff view as rendered text instead of a raw code block
    role: normative
    status: modeled
    span:
      start: 554
      end: 686
  - claim_key: CLAIM-65ED97AB98F70C91
    claim_text: The Kibi Claude Code, Codex, Cursor and ZCode stop hooks must ask once for the signoff view when a session wrote a requirement after the last kibi signoff run
    role: normative
    status: modeled
    span:
      start: 688
      end: 846
logic_claims:
  - CLAIM-AA496D7010BCE3DD
  - CLAIM-B670D0ADBB0870D2
  - CLAIM-5E9619C61E20EAAF
  - CLAIM-9866F122FBE889F5
  - CLAIM-1BE21B0FB39D22F2
  - CLAIM-65ED97AB98F70C91
origin:
  kind: agent
  recorded_at: '2026-10-22T09:25:17.980Z'
id: REQ-kibi-signoff-views
type: req
---
Kibi signoff must list each requirement a change adds, rewrites or retires and each current requirement the changed code implements, quoting its statement with its firmness and proof state. Kibi signoff with a questions file must number each decision and quote the recorded requirement it changes or conflicts with. Kibi signoff must write its latest view as JSON, Markdown and a self-contained HTML page under .kb/briefs/signoff. Kibi signoff must print the view as unfenced Markdown by default, so that it renders in any chat window or messaging tool. The Kibi Claude Code, OpenCode and VS Code integrations must show a fenced signoff view as rendered text instead of a raw code block. The Kibi Claude Code, Codex, Cursor and ZCode stop hooks must ask once for the signoff view when a session wrote a requirement after the last kibi signoff run.

## Context

Agents following the Kibi skills already ask the person to sign off on requirements before a commit, and ask firmness questions while they work, but both arrive as loose chat text: the person has to scroll back through the conversation to find which rule a question changes and what is recorded today. The project owner asked for a readable summary at signoff and a clear form for the decisions waiting on them. The view is a CLI command and skill guidance rather than a new MCP tool because the MCP tool list is already at the size the owner wants to keep, and signoff stays advisory: the command reports and never blocks. Each host shows the same data in its own way, so one JSON shape feeds the Markdown, the HTML page and the editor panels.

After the first release candidate, an agent in a test project asked for approval of a requirement in its own words: it ran in a cloud session where no Kibi host plugin was loaded and its replies went through a messaging tool, where a fenced block shows as raw code. The owner asked that cloud hosts and every supported agent host (Claude Code, Codex, Cursor, OpenCode, VS Code, ZCode) get the best signoff view each can show. So the default output is Markdown that any surface renders, the self-contained page can be attached or published next to it, the fence stays available for the OpenCode card, and the stop hooks ask for the view once requirements were written, so the person never has to reconstruct what they sign off from the chat history.

## Source

"One thing we could improve though is generating some nice summary of the requirements." "One concern I have is adding another tool. I'd rather keep the tools light (we're already at the threshold), so maybe this could be a skill? I'd do the host work as well." "The firmness questions that I currently get (where I would expect a nice visual form for me to actually read them, so I don't have to browse the chat history)."

"Also I would rather cloud host have access to the latest features and the best UI for the user. It's not optimal that what we shipped, the nicest version, is actually only available in the terminal." "Also, please take a look at all the hosts we support, including Codex, Cursor, Open Code, and such, and make sure that we deliver the best version of Signoff we can for each." "The issue I was trying to address was the agent asking me to sign off on something and I had to browse the chat history to actually understand what I'm signing off."
