---
title: A real SkillOpt cell runs on the Claude Code host through the CLIs with a stub model
status: active
priority: should
tags:
  - skillopt
  - claude-code
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-skillopt-claude-code-host
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-e2e-skillopt-claude-code-host
    target: default
    native_id: documentation/tests/e2e/skillopt-claude-code-host.e2e.ts::skillopt Claude Code host e2e
origin:
  kind: agent
  ref: 'Piotr thread 2026-10-05: continue PR 331 with Claude Code CLI after Codex usage ran out'
  recorded_at: '2026-10-05T22:05:47.109Z'
id: TEST-e2e-skillopt-claude-code-host
type: test
---
