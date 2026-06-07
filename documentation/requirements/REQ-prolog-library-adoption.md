---
id: REQ-prolog-library-adoption
title: Adopt maintained Prolog libraries for bounded graph capabilities
status: open
created_at: 2026-06-02T00:00:00Z
updated_at: 2026-06-02T00:00:00Z
source: docs/mcp-reference.md
priority: should
owner: core-team
tags:
  - prolog
  - mcp
  - sparql
  - traceability
links:
  - type: specified_by
    target: SCEN-prolog-library-adoption
  - type: verified_by
    target: TEST-prolog-library-adoption-core
  - type: verified_by
    target: TEST-prolog-library-adoption-mcp
---

Kibi should adopt maintained SWI-Prolog libraries where they clarify bounded graph behavior without replacing the local branch KB model.

The implementation must keep CHR-derived facts isolated from the existing validation path, keep SPARQL support remote-only and opt-in, and expose the remote SPARQL capability through the curated MCP surface with validation for endpoint safety and SELECT-only queries.
