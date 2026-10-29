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
    symbol_id: SYM-claude-KIBI_WORKSPACE_ENV_KEYS
  proves:
    - CLAIM-CB8FD3DDEA956390
origin:
  kind: agent
  recorded_at: '2026-10-29T16:33:46.079Z'
id: TEST-proof-claude-workspace-env-keys
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-29fbfa9d56ab9952d9d93fdc
    test_id: TEST-proof-claude-workspace-env-keys
    scope: unit
    outcome: passed
    code_snapshot: dc322ea99b905a7f62915c1ab44e1d46704fb6d9a8bb5c5a94cfe8e2545b705f
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T16:34:57.814Z'
    finished_at: '2026-10-29T16:34:58.000Z'
    artifact_digest: 025106794ed6ea89819c4131419db1873f6e2c8408b72f74b219b31e25e79212
    contract_hash: 365a26c09f48102ae47895a26b9d50501e4cf01afcce618343ef3f1303a2c571
    binding_hash: 1ddb2923b50770eb5d70dc725eed186835689c617e998831deeea929f4e7cabb
    fingerprint: c63fe88da4ed3fab97754b855adac12b97660be576a727e63a75add36a7ddeb3
    fingerprint_components:
      contract: 365a26c09f48102ae47895a26b9d50501e4cf01afcce618343ef3f1303a2c571
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
        symbol_id: SYM-claude-KIBI_WORKSPACE_ENV_KEYS
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
    certificate_digest: b891ed3ceb20c1b59a71ba08f6639ccc1a67f5ffc64074415b14405dfa2b2e00
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