---
title: A module redefinition refusal is shown as Access denied or KB locked
status: active
fact_kind: property_value
origin:
  kind: agent
  recorded_at: '2026-11-16T09:59:28.977Z'
subject_key: kibi.prolog.permission_errors
property_key: named_refusals_shown_as_access_denied
operator: eq
value_type: int
value_int: 1
tags:
  - negative-path
id: FACT-NEG-prolog-permission-error-names-refusal-SHOWN-AS-LOCK
type: fact
---
permission_error(redefine, module, discovery) with the context "Already loaded from ..." reaches the caller as "Access denied or KB locked", so it reads as a locked knowledge base.