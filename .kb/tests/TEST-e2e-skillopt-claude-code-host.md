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
    receipt_id: PR-fdc7ced7cc011ac368dae46a
    test_id: TEST-e2e-skillopt-claude-code-host
    scope: end_to_end
    outcome: passed
    code_snapshot: 69e9e1730f3d0d8ec61da714725eb4396f298386aec2729d3bc44e36c2336b10
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-05T22:07:27.235Z'
    finished_at: '2026-10-05T22:07:35.892Z'
    artifact_digest: 2c214b6c7a8607c8d494a746090ced2d976c26fdd6320afd096dd68049356508
    contract_hash: 02cdbc61eab27f0b1203de8a66cbc91c48c20ebdba40e826e70b19d8fb2e5133
    binding_hash: 824bb8d4c48a76dc7d586f2710e8d2fe40449a57e243f2e3f2c4fe4341355a60
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
