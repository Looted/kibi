---
id: TEST-VERIFICATION-001
type: test
title: Consumer login flow end-to-end verification
status: passing
created_at: 2026-04-13T00:00:00Z
updated_at: 2026-04-13T00:00:00Z
source: docs/examples/test-verification-fields.md
tags:
  - example
  - auth
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: web-e2e
  required_proofs:
    - symbol_id: SYM-PW-7C31A9D2E5B84F06
      target: chromium
    - symbol_id: SYM-PW-2E8D54A1F09C63B7
      target: firefox
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-PW-7C31A9D2E5B84F06
    target: chromium
    native_id: tests/e2e/login.spec.ts:12:7 › login › consumer can sign in
---

# Example test entity

This example shows the typed proof fields for `test` entities:

- `verification_scope` and `verification_perspective` describe what kind of
  verification the test represents. They are generic: an installed CLI, a
  consumer-fixture library test, or a database cluster workflow can all be
  `end_to_end` + `consumer`.
- `proof_contract` declares the explicit proof obligations (`symbol_id` +
  ecosystem-neutral `target`) and the configured integration that executes
  them. Each obligation is an explicit pair — there are no implicit
  combinations.
- `proof_bindings` optionally records native-runner identities for adapters.
  Bindings are provenance metadata and never replace the contract.

Evidence is produced by `kibi prove`, which runs the configured integration,
validates the `kibi.proof-run.v1` artifact, and appends `kibi.proof-receipt.v1`
receipts to `proof_receipts` (engine-derived; never hand-authored).

See [proving requirements](../proving-requirements.md) for the full workflow.
