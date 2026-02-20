---
id: FLAG-005
title: "ci-coverage-import: import test coverage data from CI into KB"
status: active
created_at: 2026-02-18T13:12:25.000Z
updated_at: 2026-02-18T13:12:25.000Z
priority: could
tags:
  - ci
  - coverage
  - deferred
links:
  - REQ-006
---

When enabled: a CI step parses coverage reports (lcov, cobertura) and upserts
`covered_by` relationships into the KB. Enables automatic coverage traceability
without manual `links` maintenance.
