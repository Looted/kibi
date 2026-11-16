---
title: A Prolog permission error that is not a store lock says what Prolog refused
status: open
priority: must
required_evidence: tested
firmness: default
tags:
  - prolog
  - errors
semantic_text: Kibi must report a Prolog permission error that is not a branch-store lock with its operation, resource and context, instead of "Access denied or KB locked".
rationale: Every Prolog permission error other than a branch-store or audit lock was shown as "Access denied or KB locked", so a module that SWI-Prolog refused to load looked like a locked knowledge base and pointed the person at the wrong cause.
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-16, approving the permission-error message statement: "Approve all"'
  approved_by: maintainer
  recorded_at: '2026-11-16T09:59:43.975Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 3c32316addcdc9719b6fa76a9f6fedbc66bf0f48ffc9b08e220fbb90d133915a
semantic_inventory:
  - claim_key: CLAIM-4B9E5C0184D9B32E
    claim_text: Kibi must report a Prolog permission error that is not a branch-store lock with its operation, resource and context, instead of "Access denied or KB locked"
    role: normative
    status: modeled
    span:
      start: 0
      end: 156
logic_claims:
  - CLAIM-4B9E5C0184D9B32E
id: REQ-prolog-permission-error-names-refusal
type: req
---
Kibi must report a Prolog permission error that is not a branch-store lock with its operation, resource and context, instead of "Access denied or KB locked".

## Context

Kibi mapped every permission_error term that was not a branch-store attach failure, an audit-journal lock or a stale snapshot to the fixed text "Access denied or KB locked". When an engine refused to load a second copy of a core module, the check failed with that text and nothing named the module or the refusal. The message now names the operation and the kind of resource, the resource when it is a plain atom, and the context message SWI-Prolog gave (one line, at most 240 characters), and says it is not a branch-store lock. A term whose operation or resource kind is not a plain atom keeps the old text.

## Source

> Maintainer decision, 2026-11-16, approving the permission-error message statement: "Approve all"