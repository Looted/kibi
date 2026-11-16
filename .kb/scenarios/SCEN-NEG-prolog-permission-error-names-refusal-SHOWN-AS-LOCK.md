---
title: A refused module load is not reported as a locked knowledge base
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T09:59:30.356Z'
id: SCEN-NEG-prolog-permission-error-names-refusal-SHOWN-AS-LOCK
type: scenario
---
Given a permission_error(redefine, module, discovery) from the engine, when Kibi reports it, then it must not say only "Access denied or KB locked": that text sends the person to look for a lock that does not exist.

packages/cli/tests/prolog/error-terms-parse.test.ts exercises the classification, including terms whose parts are not plain atoms, which keep the old text.