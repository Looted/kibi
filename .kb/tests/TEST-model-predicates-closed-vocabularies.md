---
title: Predicate closed vocabulary tests
status: active
priority: must
tags:
  - modeling
  - predicates
  - vocabulary
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-model-predicates-closed-vocabularies
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-10-08T15:34:51.439Z'
id: TEST-model-predicates-closed-vocabularies
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-4e61c36420b3aad776db6358
    test_id: TEST-model-predicates-closed-vocabularies
    scope: end_to_end
    outcome: passed
    code_snapshot: 6cca97613441c1fbaabc1ae371ee3f303736b4d4b1a0c6d7c908439c9eabb06d
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-08T16:07:20.310Z'
    finished_at: '2026-10-08T16:07:20.441Z'
    artifact_digest: 1705fee3c40f9c59be68f7935f3da182d731cbd60b3ad6910487e362fe286ae4
    contract_hash: e3b53f982a857a54bf71e2f9b427973e83d9a51f31dcf4b0b905cd102550acde
    binding_hash: 4617ca86a11524ce2c3d7cc83302bc226b8edfe6c0b5e480b694291ab144a460
    fingerprint: b625b31e12eead182713b23eeed20aa8628abe4d42fe53b69d25623526103004
    fingerprint_components:
      contract: e3b53f982a857a54bf71e2f9b427973e83d9a51f31dcf4b0b905cd102550acde
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
      - symbol_id: SYM-test-model-predicates-closed-vocabularies
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
Runs `packages/cli/tests/operations/predicate-binding-placeholders.test.ts`, which validates every built-in schema vocabulary against `predicateVocabularyErrors` and the schema examples, checks the `allowedValues` and summary text of an unbound trigger, and binds constants named in other words or through an alias.