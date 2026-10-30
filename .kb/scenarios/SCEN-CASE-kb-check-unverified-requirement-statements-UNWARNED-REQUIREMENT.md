---
title: A current requirement implemented by changed code is never left without a statement warning
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:57:35.178Z'
id: SCEN-CASE-kb-check-unverified-requirement-statements-UNWARNED-REQUIREMENT
type: scenario
---
Given a changed source file whose function implements a firm requirement and an agent-written requirement, when kb_check runs with impact diagnostics on that file, then each requirement is reported as a requirement_statement_unverified warning quoting its statement and firmness, so a requirement left without the warning is caught.

This covers one violating item past the invariant, `gt 0` on `implemented_requirements_without_statement_warning`. packages/cli/tests/traceability/requirement-statements.test.ts "names each current requirement with its statement and firmness" exercises it by asserting the exact list of warned requirement ids.
