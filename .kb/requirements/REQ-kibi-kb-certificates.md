---
title: Kibi certifies knowledge-base theorems and re-checks every certificate
status: open
priority: should
tags:
  - proof
  - verify
  - certificates
firmness: default
semantic_text: Kibi verify must produce a certificate for every knowledge-base theorem it states and re-check each certificate with a checker that never searches and never loads the code that found it. Kibi verify must certify consistent property, predicate and decision facts with a model and a contradiction with an irreducible core. Kibi verify must certify stored rules as stratified with a stratum assignment or show a negation cycle. Kibi verify must reject a certificate that does not re-check and must exit with failure when a certificate is rejected or a theorem is disproved. Kibi verify must report facts it cannot compare as unresolved and never as consistent.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 734f949ccf68d3704be2f3cf12e55a06bcf5be474d90e1a2fbecccb64cfc8c49
semantic_inventory:
  - claim_key: CLAIM-0975C249C3D9C183
    claim_text: Kibi verify must produce a certificate for every knowledge-base theorem it states and re-check each certificate with a checker that never searches and never loads the code that found it
    role: normative
    status: modeled
    span:
      start: 0
      end: 185
  - claim_key: CLAIM-0BCAD7D428A0A488
    claim_text: Kibi verify must certify consistent property, predicate and decision facts with a model and a contradiction with an irreducible core
    role: normative
    status: modeled
    span:
      start: 187
      end: 319
  - claim_key: CLAIM-42E6DFC176784D37
    claim_text: Kibi verify must certify stored rules as stratified with a stratum assignment or show a negation cycle
    role: normative
    status: modeled
    span:
      start: 321
      end: 423
  - claim_key: CLAIM-BBA5FB3F6CCA40DE
    claim_text: Kibi verify must reject a certificate that does not re-check and must exit with failure when a certificate is rejected or a theorem is disproved
    role: normative
    status: modeled
    span:
      start: 425
      end: 569
  - claim_key: CLAIM-1461981348D3C420
    claim_text: Kibi verify must report facts it cannot compare as unresolved and never as consistent
    role: normative
    status: modeled
    span:
      start: 571
      end: 656
logic_claims:
  - CLAIM-0975C249C3D9C183
  - CLAIM-0BCAD7D428A0A488
  - CLAIM-42E6DFC176784D37
  - CLAIM-BBA5FB3F6CCA40DE
  - CLAIM-1461981348D3C420
origin:
  kind: agent
  recorded_at: '2026-10-23T14:07:21.019Z'
id: REQ-kibi-kb-certificates
type: req
---
Kibi verify must produce a certificate for every knowledge-base theorem it states and re-check each certificate with a checker that never searches and never loads the code that found it. Kibi verify must certify consistent property, predicate and decision facts with a model and a contradiction with an irreducible core. Kibi verify must certify stored rules as stratified with a stratum assignment or show a negation cycle. Kibi verify must reject a certificate that does not re-check and must exit with failure when a certificate is rejected or a theorem is disproved. Kibi verify must report facts it cannot compare as unresolved and never as consistent.

## Context

Kibi already decides several properties of its knowledge base exactly: whether the facts current requirements name contradict, and whether the stored rules are stratified. Until now those verdicts were trusted outright, and a clean result was silence. Following the approved formal-proof design, each verdict now comes with a certificate that a small separate checker re-checks: a value that satisfies every fact of a property context, an irreducible set of facts that admits no value with one model per dropped fact, an agreed truth value per ground atom and per decision key, and a stratum number per rule predicate. The checker reads only the facts the theorem is about and evaluates; it never runs the search that found the certificate, so a bug in that search cannot make a wrong verdict pass. The checker also states joint consistency, so facts that only contradict together (every pair admits a value) are caught where the pairwise check is silent. Contexts the checker cannot compare stay unresolved and are never reported as consistent. Opposing rule pairs and scenario feasibility are not certified yet and are listed as such.

## Source

"A loose idea, but can we ensure a formal proof for anything we do in Kibi? I just want to brainstorm it here." Approving the written design: "Looks good, go ahead." Choosing the next step: "Start phase 2 now."
