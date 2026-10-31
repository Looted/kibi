---
title: Proof kinds, source readers and binding verdicts
status: open
priority: must
firmness: firm
semantic_text: A proof contract kind shall be e2e, example, property, exhaustive, typecheck, arithmetic, smt, rule, state_machine, regex or source. A certificate proof kind shall be exhaustive, typecheck, arithmetic, smt, rule, state_machine, regex or source. A source proof reader shall be json, yaml, glob, openapi, references, schema, routes, validator or prolog. A claim binding verdict shall be derived, attested or rejected.
semantic_clauses:
  - A proof contract kind shall be e2e, example, property, exhaustive, typecheck, arithmetic, smt, rule, state_machine, regex or source.
  - A certificate proof kind shall be exhaustive, typecheck, arithmetic, smt, rule, state_machine, regex or source.
  - A source proof reader shall be json, yaml, glob, openapi, references, schema, routes, validator or prolog.
  - A claim binding verdict shall be derived, attested or rejected.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-31, to add the SWI-Prolog source readers of the multilingual proof plan (phase 2): "Start the next phase." Earlier, 2026-10-27: "Please work towards full proof."'
  approved_by: maintainer
  recorded_at: '2026-10-31T10:22:01.421Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: d731e75e66ac6f557e29fc5546bdf48156e20118b28206452fce85fd4d16b736
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
  - claim_key: CLAIM-2337B1E3178A6C90
    claim_text: A source proof reader shall be json, yaml, glob, openapi, references, schema, routes, validator or prolog
    role: normative
    status: modeled
    span:
      start: 245
      end: 350
  - claim_key: CLAIM-CE2055482973A026
    claim_text: A claim binding verdict shall be derived, attested or rejected
    role: normative
    status: modeled
    span:
      start: 352
      end: 414
logic_claims:
  - CLAIM-D7B715B13C00E1A9
  - CLAIM-D723EBD2E0400142
  - CLAIM-2337B1E3178A6C90
  - CLAIM-CE2055482973A026
id: REQ-kibi-proof-vocabulary
type: req
---
A proof contract kind shall be e2e, example, property, exhaustive, typecheck, arithmetic, smt, rule, state_machine, regex or source. A certificate proof kind shall be exhaustive, typecheck, arithmetic, smt, rule, state_machine, regex or source. A source proof reader shall be json, yaml, glob, openapi, references, schema, routes, validator or prolog. A claim binding verdict shall be derived, attested or rejected.

## Context

packages/cli/src/public defines the proof vocabulary REQ-kibi-code-proof-kinds and REQ-kibi-claim-bound-proofs rely on. Each set is stated here so it is proved against the protocol, source and receipt modules. The prolog source reader joined the reader set with the SWI-Prolog source readers.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?" Approving the SWI-Prolog source readers, 2026-10-31: "Start the next phase."