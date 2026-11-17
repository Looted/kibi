---
title: Hooks recommend the commit gate's verdict after an edit
status: open
priority: must
required_evidence: tested
semantic_text: The Kibi hook messages that name the check to run after a source edit, in agent-core and in the Claude Code, Codex, Cursor, OpenCode and ZCode adapters, must name kb_check with changed:true for the edited files, and such a call must count as the impact check those hooks ask for.
tags:
  - hooks
  - check
origin:
  kind: agent
  recorded_at: '2026-11-16T18:30:00.000Z'
  ref: 'Measured on a test project, 2026-11-16: the check the hooks recommended returned no violations for a new unowned function, while kibi check --staged on the same diff refused the commit. Maintainer decision, 2026-11-16, approving this statement as worded.'
  approved_by: maintainer
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 86d46dffffc6fed3d295fb72b88e933a6ab1b51afee981e8f78147d22d82fcb6
semantic_inventory:
  - claim_key: CLAIM-19561F00B5A95992
    claim_text: The Kibi hook messages that name the check to run after a source edit, in agent-core and in the Claude Code, Codex, Cursor, OpenCode and ZCode adapters, must name kb_check with changed:true for the edited files, and such a call must count as the impact check those hooks ask for
    role: normative
    status: modeled
    span:
      start: 0
      end: 278
logic_claims:
  - CLAIM-19561F00B5A95992
id: REQ-hooks-recommend-changed-check
type: req
---
The Kibi hook messages that name the check to run after a source edit, in agent-core and in the Claude Code, Codex, Cursor, OpenCode and ZCode adapters, must name kb_check with changed:true for the edited files, and such a call must count as the impact check those hooks ask for.

## Why

The edit snippet, the post-edit note and the Stop reminder all told the agent to run the impact-only kb_check, which passed diffs the commit gate then refused. The hooks are the only guidance an agent sees at that moment, so they decide which check it trusts; naming the gate's verdict there is what lets the agent learn that a new function needs an owner right after the edit.

## Context

agent-core's edit snippet, Claude Code's Stop reminder, Codex's and ZCode's post-edit note and impact reminder, Cursor's post-edit guidance and Stop follow-up, and OpenCode's edit advisory now print kb_check({changed:true, sourceFiles:[...]}). A kb_check with changed:true for the edited files counts as the impact check, so the Stop reminder clears after it. Hooks still never deny; only the git gate stops a commit, and ZCode stays advisory.

## Source

> Measured on a test project, 2026-11-16: the check the hooks recommended returned no violations for a new unowned function, while kibi check --staged on the same diff refused the commit.