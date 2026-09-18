---
title: MCP model_requirement returns strict and observation write plans
status: passing
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-mcp-model-requirement
      target: default
  success_policy: all_required_first_attempt
id: TEST-e2e-mcp-model-requirement
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-e13bb2bf9a75416c934b439e
    test_id: TEST-e2e-mcp-model-requirement
    scope: end_to_end
    outcome: passed
    code_snapshot: 108fe624639c2c7c00ac5f051d948270f8c18926753c35581e701c3ae1bfc1aa
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T10:04:24.719Z'
    finished_at: '2026-09-18T10:37:16.478Z'
    artifact_digest: b15a7bc4b29c307248e8600846fa2a23b322db1a4047fbb1600a7cbceae82595
    contract_hash: f104c1a0a83e68dd71fdc013616d15ed3e4f15cd3b967c1e6f239c6660363f5d
    binding_hash: 732485d8952b4ab7ea801eebc133d5900e4b35170edc8caaacb6bb1e1300e63e
    fingerprint: dd27d2e2284808bcf128f1c684d30bb8e65027730203e606007b7aa0d6d164d7
    fingerprint_components:
      contract: f104c1a0a83e68dd71fdc013616d15ed3e4f15cd3b967c1e6f239c6660363f5d
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
      - symbol_id: SYM-e2e-test-mcp-model-requirement
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-7578b8e878aa9b58556e36b1
    test_id: TEST-e2e-mcp-model-requirement
    scope: end_to_end
    outcome: passed
    code_snapshot: 8465c8db1c316b64cda7e0e5e8183795129f74cfda3fa1592a16e0e62df2d15b
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T12:54:02.548Z'
    finished_at: '2026-09-18T13:26:16.375Z'
    artifact_digest: c856fd3f8a3a374f12bc697a485639499db3fe7263e1bc824f3939e0d3be4d40
    contract_hash: f104c1a0a83e68dd71fdc013616d15ed3e4f15cd3b967c1e6f239c6660363f5d
    binding_hash: fd78249480f5ee43b7bc625830581eb2e57640713f5a8ea716d4f9414dec4006
    fingerprint: dd27d2e2284808bcf128f1c684d30bb8e65027730203e606007b7aa0d6d164d7
    fingerprint_components:
      contract: f104c1a0a83e68dd71fdc013616d15ed3e4f15cd3b967c1e6f239c6660363f5d
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
      - symbol_id: SYM-e2e-test-mcp-model-requirement
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---

Packed end-to-end regression for mcp model_requirement returns strict and observation write plans.
