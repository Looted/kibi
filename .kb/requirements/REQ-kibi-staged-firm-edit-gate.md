---
title: kibi check --staged blocks an edit of firm code until the agent records that it keeps the rule
status: open
priority: must
required_evidence: tested
tags:
  - firmness
  - check
semantic_text: kibi check --staged must block a staged change inside a symbol that implements a current firm requirement unless a matching keeps receipt exists for that requirement and symbol. A changes verdict must keep the change blocked until the requirement is superseded with the person's words in origin.ref. Of the firm-edit review states missing, kept, changes, statement-changed and code-changed, only kept shall let a staged change through.
semantic_clauses:
  - kibi check --staged must block a staged change inside a symbol that implements a current firm requirement unless a matching keeps receipt exists for that requirement and symbol.
  - A changes verdict must keep the change blocked until the requirement is superseded with the person's words in origin.ref.
  - Of the firm-edit review states missing, kept, changes, statement-changed and code-changed, only kept shall let a staged change through.
origin:
  kind: agent
  approved_by: maintainer
  ref: 'Maintainer-approved statement (2026-11-16): "kibi check --staged must block a staged change inside a symbol that implements a current firm requirement unless a matching keeps receipt exists for that requirement and symbol. A changes verdict must keep the change blocked until the requirement is superseded with the person''s words in origin.ref." Maintainer-approved addition (2026-11-16): "Of the firm-edit review states missing, kept, changes, statement-changed and code-changed, only kept shall let a staged change through."'
  recorded_at: '2026-11-16T06:59:52.480Z'
rationale: A firm rule was guarded only by a hook notice, so an agent on any host could commit an edit that broke it; the commit gate is the one check every host runs.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 8ac59411128c7bac2d4815e738f6e11b9a448c772d0d1552b0d9ef8074946bec
semantic_inventory:
  - claim_key: CLAIM-CD592690DA98AA39
    claim_text: kibi check --staged must block a staged change inside a symbol that implements a current firm requirement unless a matching keeps receipt exists for that requirement and symbol
    role: exception
    status: modeled
    span:
      start: 0
      end: 176
  - claim_key: CLAIM-A597B3BE1538802A
    claim_text: A changes verdict must keep the change blocked until the requirement is superseded with the person's words in origin.ref
    role: normative
    status: modeled
    span:
      start: 178
      end: 298
  - claim_key: CLAIM-48F403C837AE3C32
    claim_text: Of the firm-edit review states missing, kept, changes, statement-changed and code-changed, only kept shall let a staged change through
    role: normative
    status: modeled
    span:
      start: 300
      end: 434
logic_claims:
  - CLAIM-CD592690DA98AA39
  - CLAIM-A597B3BE1538802A
  - CLAIM-48F403C837AE3C32
id: REQ-kibi-staged-firm-edit-gate
type: req
---
kibi check --staged must block a staged change inside a symbol that implements a current firm requirement unless a matching keeps receipt exists for that requirement and symbol. A changes verdict must keep the change blocked until the requirement is superseded with the person's words in origin.ref. Of the firm-edit review states missing, kept, changes, statement-changed and code-changed, only kept shall let a staged change through.

## Context

Hooks differ by host and some can only advise, so the commit gate is where a firm rule is enforced the same way everywhere. It judges only behavioral symbols the change touches, so untouched firm code does not block. A keeps receipt clears the edit; a changes receipt keeps it blocked, because changing a firm rule is the person's call and takes a supersede with their words. A requirement whose own document changes in the same commit is left to the firmness and supersede checks.

## Source

Maintainer-approved statement (2026-11-16): "kibi check --staged must block a staged change inside a symbol that implements a current firm requirement unless a matching keeps receipt exists for that requirement and symbol. A changes verdict must keep the change blocked until the requirement is superseded with the person's words in origin.ref."

Maintainer-approved addition (2026-11-16), stating which review states pass as its own sentence so a certificate can prove it: "Of the firm-edit review states missing, kept, changes, statement-changed and code-changed, only kept shall let a staged change through."
