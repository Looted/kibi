---
title: Host hooks recommend the changed check tests
status: active
priority: must
verification_scope: integration
tags:
  - check
  - staged
origin:
  kind: agent
  recorded_at: '2026-11-16T19:30:00.000Z'
id: TEST-hooks-recommend-changed-check
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-hooks-recommend-changed-check
      target: default
  success_policy: all_required_first_attempt
---
Checks the post-edit and Stop messages of agent-core, Claude Code, Codex, Cursor, OpenCode and ZCode name kb_check with changed:true and the edited files, say it gives the commit gate's verdict, and that a changed check counts as the impact check the reminders ask for.