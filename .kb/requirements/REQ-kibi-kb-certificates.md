---
title: Kibi certifies knowledge-base theorems and re-checks every certificate
status: open
priority: should
tags:
  - proof
  - check
  - certificates
firmness: default
semantic_text: Kibi check must produce a certificate for every knowledge-base theorem it states and re-check each certificate with a checker that never searches and never loads the code that found it. Kibi check must certify consistent property, predicate and decision facts with a model and a contradiction with an irreducible core. Kibi check must certify stored rules as stratified with a stratum assignment or show a negation cycle. Kibi check must block on a re-verified contradiction or a certificate that does not re-check, at commit time as well as in a full check. Kibi check must report facts it cannot compare as unresolved and never as consistent.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: cc04efb1598bb92827efdf0e8c6efe571297764bc7d32f74b75b6b5aca9e35de
semantic_inventory:
  - claim_key: CLAIM-B77CF9BD73793C6E
    claim_text: Kibi check must produce a certificate for every knowledge-base theorem it states and re-check each certificate with a checker that never searches and never loads the code that found it
    role: normative
    status: modeled
    span:
      start: 0
      end: 184
  - claim_key: CLAIM-17D9BC0ACA71F1F3
    claim_text: Kibi check must certify consistent property, predicate and decision facts with a model and a contradiction with an irreducible core
    role: normative
    status: modeled
    span:
      start: 186
      end: 317
  - claim_key: CLAIM-5559E82E5D924724
    claim_text: Kibi check must certify stored rules as stratified with a stratum assignment or show a negation cycle
    role: normative
    status: modeled
    span:
      start: 319
      end: 420
  - claim_key: CLAIM-CB7A2508512A4E27
    claim_text: Kibi check must block on a re-verified contradiction or a certificate that does not re-check, at commit time as well as in a full check
    role: normative
    status: modeled
    span:
      start: 422
      end: 557
  - claim_key: CLAIM-4FF040470292D49E
    claim_text: Kibi check must report facts it cannot compare as unresolved and never as consistent
    role: normative
    status: modeled
    span:
      start: 559
      end: 643
logic_claims:
  - CLAIM-B77CF9BD73793C6E
  - CLAIM-17D9BC0ACA71F1F3
  - CLAIM-5559E82E5D924724
  - CLAIM-CB7A2508512A4E27
  - CLAIM-4FF040470292D49E
origin:
  kind: agent
  recorded_at: '2026-10-23T14:07:21.019Z'
id: REQ-kibi-kb-certificates
type: req
---
Kibi check must produce a certificate for every knowledge-base theorem it states and re-check each certificate with a checker that never searches and never loads the code that found it. Kibi check must certify consistent property, predicate and decision facts with a model and a contradiction with an irreducible core. Kibi check must certify stored rules as stratified with a stratum assignment or show a negation cycle. Kibi check must block on a re-verified contradiction or a certificate that does not re-check, at commit time as well as in a full check. Kibi check must report facts it cannot compare as unresolved and never as consistent.

## Context

Kibi already decides several properties of its knowledge base exactly: whether the facts current requirements name contradict, and whether the stored rules are stratified. Until now those verdicts were trusted outright, and a clean result was silence. Following the approved formal-proof design, each verdict now comes with a certificate that a small separate checker re-checks: a value that satisfies every fact of a property context, an irreducible set of facts that admits no value with one model per dropped fact, an agreed truth value per ground atom and per decision key, and a stratum number per rule predicate. The checker reads only the facts the theorem is about and evaluates; it never runs the search that found the certificate, so a bug in that search cannot make a wrong verdict pass. The checker also states joint consistency, so facts that only contradict together (every pair admits a value) are caught where the pairwise check is silent. The certificates are checked by the kb-consistency rule of kibi check and kb_check rather than a separate command, so agents, the pre-commit hook and CI all run it without a new tool. Contexts the checker cannot compare stay unresolved, reported by the advisory kb-consistency-unresolved rule, and are never reported as consistent. Opposing rule pairs and scenario feasibility are not certified yet.

## Source

"A loose idea, but can we ensure a formal proof for anything we do in Kibi? I just want to brainstorm it here." Approving the written design: "Looks good, go ahead." Choosing the next step: "Start phase 2 now." Choosing where it lives: "Fold it into kibi check."
