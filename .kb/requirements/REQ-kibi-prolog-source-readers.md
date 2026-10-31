---
title: Source proofs read SWI-Prolog references and pack facts without running the code
status: open
priority: should
required_evidence: tested
firmness: default
tags:
  - proof
  - source
  - prolog
  - multilingual
semantic_text: Kibi must read the imports, calls, environment variables, first arguments and thrown errors of SWI-Prolog files without running them. Kibi must refuse a Prolog reference read that reaches a goal, closure or clause built at run time. The prolog reader must list the chosen argument of the facts with a given functor in file order.
semantic_clauses:
  - Kibi must read the imports, calls, environment variables, first arguments and thrown errors of SWI-Prolog files without running them.
  - Kibi must refuse a Prolog reference read that reaches a goal, closure or clause built at run time.
  - The prolog reader must list the chosen argument of the facts with a given functor in file order.
origin:
  kind: agent
  ref: 'Maintainer request, 2026-10-31, to start phase 2 of the multilingual proof plan (SWI-Prolog references and a prolog source reader): "Start the next phase."'
  approved_by: maintainer
  recorded_at: '2026-10-31T10:23:46.117Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 541f644b277570872614e07295cb733ac2bf74419a7a2469d443554888283ad3
semantic_inventory:
  - claim_key: CLAIM-1B550AE634DF615E
    claim_text: Kibi must read the imports, calls, environment variables, first arguments and thrown errors of SWI-Prolog files without running them
    role: normative
    status: modeled
    span:
      start: 0
      end: 132
  - claim_key: CLAIM-91901E87A890C7F1
    claim_text: Kibi must refuse a Prolog reference read that reaches a goal, closure or clause built at run time
    role: normative
    status: modeled
    span:
      start: 134
      end: 231
  - claim_key: CLAIM-522C148B9E26C85F
    claim_text: The prolog reader must list the chosen argument of the facts with a given functor in file order
    role: normative
    status: modeled
    span:
      start: 233
      end: 328
logic_claims:
  - CLAIM-1B550AE634DF615E
  - CLAIM-91901E87A890C7F1
  - CLAIM-522C148B9E26C85F
id: REQ-kibi-prolog-source-readers
type: req
---
Kibi must read the imports, calls, environment variables, first arguments and thrown errors of SWI-Prolog files without running them. Kibi must refuse a Prolog reference read that reaches a goal, closure or clause built at run time. The prolog reader must list the chosen argument of the facts with a given functor in file order.

## Context

After code proofs learned to read SWI-Prolog predicates (REQ-kibi-multilingual-code-proofs), source proofs still read references only in TypeScript, JavaScript and Python, so a Prolog pack could not prove what its modules load or call, which environment variables they read, or what its pack.pl declares (issue #636). The references reader now reads .pl and .plt files term by term with SWI-Prolog, walking clause bodies through control constructs and meta-predicate arguments, and the prolog reader lists fact arguments such as requires/1. Neither runs the project's code. A goal, closure or clause built at run time fails the read with its place, so a set claim is never decided over references Kibi only partly saw.

## Source

Maintainer request, 2026-10-31: "Start the next phase."