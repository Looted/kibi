---
title: An agent host shall pass the workspace to Kibi tools as workspaceRoot, by a regex proof
status: passing
tags:
  - proof
  - certificate
  - regex
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-agent-workspace-argument
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-agent-core-KIBI_WORKSPACE_ARGUMENT
  proves:
    - CLAIM-23571A7EFB6D98E2
origin:
  kind: agent
  recorded_at: '2026-10-29T16:34:18.205Z'
id: TEST-proof-agent-workspace-argument
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-b9ac767a88ee56a5a48ec9f9
    test_id: TEST-proof-agent-workspace-argument
    scope: unit
    outcome: passed
    code_snapshot: dc322ea99b905a7f62915c1ab44e1d46704fb6d9a8bb5c5a94cfe8e2545b705f
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T16:35:08.833Z'
    finished_at: '2026-10-29T16:35:09.007Z'
    artifact_digest: bfab6c70129195ba1593e1113f71b3029f5d1d3df73c06627726802d2922a2f5
    contract_hash: 6d1c226fd23ea294a28d48e476243e8b612f8f270e55bc208459cc36102d0194
    binding_hash: b0df0db5a0d7b656bf4fb74f3a6d401f3f6c88797dcbb301cfbe84c157319864
    fingerprint: fd5b12a43b41aaf48184a269aedcd176fbe383b516d70608397de3a61130de14
    fingerprint_components:
      contract: 6d1c226fd23ea294a28d48e476243e8b612f8f270e55bc208459cc36102d0194
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-proof-agent-workspace-argument
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: regex
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: regex
      test_id: TEST-proof-agent-workspace-argument
      pattern:
        symbol_id: SYM-agent-core-KIBI_WORKSPACE_ARGUMENT
        type: string
        value: workspaceRoot
    certificate_digest: 82d850dd58347568b2b1c3945f75b583a1769c846858c34f3ab776b482a574e2
    claim_bindings:
      - claim_key: CLAIM-23571A7EFB6D98E2
        requirement_id: REQ-agent-workspace-opt-in-keys
        fact_id: FACT-agent-workspace-argument
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: workspaceRoot
---
Proves that an agent host shall pass the workspace to Kibi tools as workspaceRoot, against the code Kibi reads at ingest.