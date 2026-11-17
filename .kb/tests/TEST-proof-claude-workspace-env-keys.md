---
title: A Claude plugin workspace variable shall be KIBI_WORKSPACE, KIBI_PROJECT_ROOT or KIBI_ROOT, by an exhaustive proof
status: passing
tags:
  - proof
  - certificate
  - exhaustive
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-claude-workspace-env-keys
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-agent-core-KIBI_WORKSPACE_ENV_KEYS
  proves:
    - CLAIM-CB8FD3DDEA956390
origin:
  kind: agent
  recorded_at: '2026-10-29T16:33:46.079Z'
id: TEST-proof-claude-workspace-env-keys
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-b48c597d0a3ff2f8c88e61f5
    test_id: TEST-proof-claude-workspace-env-keys
    scope: unit
    outcome: passed
    code_snapshot: df75bbeab5e07760b87357fb20f8f0e6d017a23fe2fd0ce5c62d21b2f3f3b61c
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-17T08:42:04.195Z'
    finished_at: '2026-11-17T08:42:04.311Z'
    artifact_digest: 055cd1ba64298337c06ba93df0c39d83cff78cbc08a13aee3510b8690f66de61
    contract_hash: 2d65e0d4d63704878f96505e715279c9dbc43b91d8d437a02cc113c18937a8bc
    binding_hash: ba9960ec1b611d008a0d1d0c5a4022d835eceb7fce637d5360d4e5eef96ffe53
    fingerprint: fc3ace0df79607480f12ce3198964c3d970e7e6f4cd5a7acdbd23bb9c7abab89
    fingerprint_components:
      contract: 2d65e0d4d63704878f96505e715279c9dbc43b91d8d437a02cc113c18937a8bc
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
      - symbol_id: SYM-proof-claude-workspace-env-keys
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: exhaustive
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: exhaustive
      test_id: TEST-proof-claude-workspace-env-keys
      domain:
        symbol_id: SYM-agent-core-KIBI_WORKSPACE_ENV_KEYS
        members:
          - KIBI_WORKSPACE
          - KIBI_PROJECT_ROOT
          - KIBI_ROOT
      results:
        - member: KIBI_WORKSPACE
          outcome: passed
        - member: KIBI_PROJECT_ROOT
          outcome: passed
        - member: KIBI_ROOT
          outcome: passed
    certificate_digest: 85945f865ee80572a4e5a2ae8ff87981f8f60457e7db51a9d321d24d3a84ba2a
    claim_bindings:
      - claim_key: CLAIM-CB8FD3DDEA956390
        requirement_id: REQ-agent-workspace-opt-in-keys
        fact_id: FACT-claude-workspace-env-keys
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - KIBI_PROJECT_ROOT
            - KIBI_ROOT
            - KIBI_WORKSPACE
---
Proves that a Claude plugin workspace variable shall be KIBI_WORKSPACE, KIBI_PROJECT_ROOT or KIBI_ROOT, against the code Kibi reads at ingest.