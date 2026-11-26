# From a recorded rule to `tested`

Read this when a requirement must reach `tested` (project level `test`, or
a `required_evidence: tested` floor) and `kb_check` reports
`evidence-floor`. At level `remember` none of it applies. Reference
material is in `proof.md`.

The `kb_record` or `kb_upsert` result already lists every step below as
`nextActions`, with an `input` to send. Fill only its `<placeholders>`, send
the steps in order, and do not rebuild them from this page.

1. **Success scenario.** A `scenario` with `expects: success` that the
   requirement links with `specified_by`, its body a given/when/then.
2. **Rejection scenario.** A `scenario` with `expects: rejection` that
   `assumes` a `property_value` fact holding a value the requirement
   forbids: a new fact (same `subject_key` and `property_key` as the
   requirement's grounding, the forbidden value), linked only from the
   scenario, never from the requirement. The property is `assumes`; there
   is no `assumption`, `given` or `outcome` field. When the requirement has
   nothing to refuse (it states a capability or an output shape), the
   person may approve a `failure_side_waiver` instead; it is listed in
   `approvalsNeeded`.
3. **Test.** A `test` entity that `validates` both scenarios, with
   `verification_scope: end_to_end` and a `proof_contract`:

   ```yaml
   proof_contract:
     version: kibi.proof-contract.v1
     integration: <id from .kb/proof/integrations.json>
     required_proofs:
       - symbol_id: <SYM- of the test code, executable_for this test>
         target: default
     success_policy: all_required_first_attempt
   ```

   Create the test-code `symbol` first (`kb_upsert`, `executable_for` the
   test). A workspace with no `.kb/proof/integrations.json` needs one: run
   `kibi proof inspect --command "kibi proof run-steps" --json` and apply
   the plan it returns with `kb_apply_plan`. The new file is listed in
   `approvalsNeeded`.
4. **Steps.** With the `run-steps` integration, write
   `proof/steps/<TEST-id>.json`:
   `{"test_id": "<TEST-id>", "steps": [["<runner>", "<arg>", "<test file>"]]}`,
   one argv array per command that runs the test.
5. **Prove and check.** `kibi prove --test <TEST-id>`, then `kb_check` with
   `changed: true`. `kibi proof explain <REQ-id>` lists what is still
   missing.

Never hand-write proof receipts, never lower `required_evidence` to pass
the check, and never set `approved_by` on a waiver the person did not give.
