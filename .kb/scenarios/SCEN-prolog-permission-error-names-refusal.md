---
title: A refused module load names the module and why
status: active
priority: must
expects: success
tags:
  - prolog
  - errors
origin:
  kind: agent
  recorded_at: '2026-11-16T09:59:29.673Z'
id: SCEN-prolog-permission-error-names-refusal
type: scenario
---
Given an engine that refuses a query with permission_error(redefine, module, discovery) and the context "Already loaded from /core/src/discovery.pl", when Kibi reports the failure, then the message says Prolog refused to redefine module discovery, quotes the context, and says it is a permission_error, not a branch-store lock.