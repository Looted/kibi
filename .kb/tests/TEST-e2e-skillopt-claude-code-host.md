---
title: A real SkillOpt cell runs on the Claude Code host through the CLIs with a stub model
status: passing
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
  ref: 'Maintainer request, 2026-10-05: continue PR 331 on another agent host Maintainer decision, 2026-11-11, approving the entity context recovered from history in the KB gold-standard review (context batch 6): "Ok"'
  recorded_at: '2026-10-05T22:05:47.109Z'
id: TEST-e2e-skillopt-claude-code-host
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-dd5af5d2be445af3bb5a2a45
    test_id: TEST-e2e-skillopt-claude-code-host
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 02cdbc61eab27f0b1203de8a66cbc91c48c20ebdba40e826e70b19d8fb2e5133
    binding_hash: c903baa0a82f00d7afbe3a666eefe7e6a9f2159f5c82a40ebcb8386ec8768cd4
    fingerprint: edc50f34845b35fae0302426ae504ffff6e362237aabdce36718803cd4b1017d
    fingerprint_components:
      contract: 02cdbc61eab27f0b1203de8a66cbc91c48c20ebdba40e826e70b19d8fb2e5133
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 026e6d9cbb631b49256a4174b1cd66b151d0ba30dcd63719b5792e5a33baaa2f
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-skillopt-claude-code-host
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---

## Context
This runs one real cell through the CLIs with a stub model, so no paid launch is needed. It checks the pinned model, the strict MCP config, file rules, denied private roots and the filtered environment.
