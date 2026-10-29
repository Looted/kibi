---
title: Proof kinds, source readers and binding verdicts
status: open
priority: must
firmness: firm
semantic_text: A proof contract kind shall be e2e, example, property, exhaustive, typecheck, arithmetic, smt, rule, state_machine, regex or source. A certificate proof kind shall be exhaustive, typecheck, arithmetic, smt, rule, state_machine, regex or source. A source proof reader shall be json, yaml, glob, openapi, references, schema, routes or validator. A claim binding verdict shall be derived, attested or rejected.
semantic_clauses:
  - A proof contract kind shall be e2e, example, property, exhaustive, typecheck, arithmetic, smt, rule, state_machine, regex or source.
  - A certificate proof kind shall be exhaustive, typecheck, arithmetic, smt, rule, state_machine, regex or source.
  - A source proof reader shall be json, yaml, glob, openapi, references, schema, routes or validator.
  - A claim binding verdict shall be derived, attested or rejected.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-29T16:44:39.805Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: e1c2baf8e51338084aea3231f73a77db6960756997e74fd48b8ede119b938e2a
semantic_inventory:
  - claim_key: CLAIM-D7B715B13C00E1A9
    claim_text: A proof contract kind shall be e2e, example, property, exhaustive, typecheck, arithmetic, smt, rule, state_machine, regex or source
    role: normative
    status: modeled
    span:
      start: 0
      end: 131
  - claim_key: CLAIM-D723EBD2E0400142
    claim_text: A certificate proof kind shall be exhaustive, typecheck, arithmetic, smt, rule, state_machine, regex or source
    role: normative
    status: modeled
    span:
      start: 133
      end: 243
  - claim_key: CLAIM-FF4438926644A069
    claim_text: A source proof reader shall be json, yaml, glob, openapi, references, schema, routes or validator
    role: normative
    status: modeled
    span:
      start: 245
      end: 342
  - claim_key: CLAIM-CE2055482973A026
    claim_text: A claim binding verdict shall be derived, attested or rejected
    role: normative
    status: modeled
    span:
      start: 344
      end: 406
logic_claims:
  - CLAIM-D7B715B13C00E1A9
  - CLAIM-D723EBD2E0400142
  - CLAIM-FF4438926644A069
  - CLAIM-CE2055482973A026
id: REQ-kibi-proof-vocabulary
type: req
---
A proof contract kind shall be e2e, example, property, exhaustive, typecheck, arithmetic, smt, rule, state_machine, regex or source. A certificate proof kind shall be exhaustive, typecheck, arithmetic, smt, rule, state_machine, regex or source. A source proof reader shall be json, yaml, glob, openapi, references, schema, routes or validator. A claim binding verdict shall be derived, attested or rejected.

## Context

packages/cli/src/public defines the proof vocabulary REQ-kibi-code-proof-kinds and REQ-kibi-claim-bound-proofs rely on. Each set is stated here so it is proved against the protocol, source and receipt modules.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"