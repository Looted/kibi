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
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-81e5de2e45cf7d89527646ed
    test_id: TEST-e2e-skillopt-claude-code-host
    scope: end_to_end
    outcome: passed
    code_snapshot: baae7f6c1a25b642600fea853ea02a65b9b7cda206dca9c223fb3a81b6f52c2c
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-05T23:50:25.356Z'
    finished_at: '2026-10-05T23:50:33.004Z'
    artifact_digest: e702cc63035ca842121bca4efbfb68ab0688420359ac4ddd7aab30892b81965e
    contract_hash: 02cdbc61eab27f0b1203de8a66cbc91c48c20ebdba40e826e70b19d8fb2e5133
    binding_hash: ea9a8c478a3b5185f7347e79473861c26bea782679568b648379f70fd598a04b
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
---
