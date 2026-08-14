---
id: kibi-traceability
name: kibi-traceability
description: Maintain requirement, scenario, and test traceability through Kibi MCP tools.
version: 1.0.0
kibiCompatibility: "*"
tags:
  - kibi
  - mcp
  - traceability
  - agent-guidance
---
## Goal

Validate and strengthen requirement, scenario, test, behavioral-symbol, and source-file traceability before and after code changes.

## Interface Selection

1. If Kibi MCP tools are visible and approved, use the MCP surface as the primary authority.
2. Otherwise, in a trusted workspace, use the canonical project-local CLI fallback through `npx --no-install kibi ...`.
3. If neither approved MCP tools nor the project-local CLI are available, or if the CLI is unavailable or too old, stop and tell the operator to enable or install Kibi.
4. Never use a global fallback or an installing runner.

Use MCP routes for modeling, querying, checking, validation, and cleanup. Use the project-local CLI only as the fallback interface, passing JSON input through stdin. Example:

```bash
echo '{"sourceFiles":["src/auth/login.ts"],"includeImpactDiagnostics":true,"includeWorkingTreeDiff":true}' | npx --no-install kibi check --input -
```

## Capability Workflow

- Locate requirements through `kb_search` or `search --input`, then inspect exact records through `kb_query` or `query --input`.
- Before meaningful edits, identify linked requirements, scenarios, tests, facts, source files, and behavioral symbols relevant to the planned change.
- After meaningful source edits, run `kb_check({sourceFiles:[...], includeImpactDiagnostics:true, includeWorkingTreeDiff:true})` or the equivalent `check --input` JSON recipe before deciding whether traceability is current.
- Apply traceability updates sequentially through `kb_upsert` or `upsert --input` for requirements, scenarios, tests, facts, behavioral symbols, and source-linked relationships.
- Validate constraints and consistency through `kb_check` or `check --input` after updates.
- Run `kb_coverage` by requirement after validation. Treat `coverageStatus` as structural compatibility only; use the separate `proofStatus`, `proofStages`, `proofGaps`, and ranked `proofRepairs` to decide whether the complete intent-to-code chain is proven.
- Use `kb_delete` or `delete --input` only for explicit cleanup of obsolete records or relationships.

Passing contracted E2E receipts are evidence for the current snapshot, not a
claim that every semantic proposition is modeled. Keep ontology gaps and stale
symbol coordinates explicit. When a symbol path disappears, propose only an
evidence-backed `remap`, `delete_obsolete_symbol`, or `refresh_coordinates`
repair; never fabricate a path or coordinate and never auto-apply a candidate.

## Guidance

- Prefer source-linked relationships so requirements, scenarios, tests, symbols, and files can be traced cleanly.
- Preserve source-file traceability whenever adding or changing requirements, scenarios, tests, facts, behavioral symbols, or implementation links.
- Preserve the canonical chain `REQ-* -> SCEN-* -> TEST-*` when adding or changing requirements.
- Production symbols should implement requirements; test symbols should remain executable evidence for tests.
- A proof-bearing test must be reached through the requirement's scenario, declare `verification_scope: end_to_end`, carry a `verification_contract.v1`, and carry a fresh passed `kibi.verification-receipt.v2` bound to the live `verificationSnapshot`. Link its executable code with `executable_for`; link each production symbol with `implements` and `covered_by` to that qualifying test. Durable `status: passing` is structural metadata, not execution proof.
- Read `kb_status` immediately before a proof-bearing run, execute the exact recorded command, then append—not replace—the receipt history with test ID, scope, runner, command, snapshot, environment hash, timestamps, outcome, and artifact digest. Re-read coverage; wrong-snapshot, stale, failed, malformed, future-dated, or unavailable evidence must remain a gap.
- A green structural count is not proof. Do not report success while a proposition is absent or unresolved, grounding is incomplete or non-bijective, contradiction analysis is incomplete, the E2E path is direct-only, its execution receipt is not fresh for the live snapshot, or proof-bearing symbols lack current generated coordinates.
- Use `kb_coverage.repairPlan` to turn row-local `proofRepairs` into small dependency-ordered batches. Require `scope.complete: true` before treating it as a project-wide inventory, apply only `state: ready` work, and treat every `autoApplicable: false` batch as reviewed guidance rather than an executable mutation payload. Query current endpoints, follow its validation policy, keep upserts sequential, then rerun coverage after each batch; newly visible downstream gaps supersede the older plan. Never reinterpret `no_conflict_found` as universal consistency; it only describes the modeled ground claims Kibi could inspect.
- When `.kb/usage.log` exists, run `kibi usage-metrics --format json --require-acceptance` after the final complete coverage call. A successful graph check does not override failed or insufficient `kibi.telemetry-acceptance.v1` evidence; follow ranked telemetry diagnostics for advisor/preflight bypasses, lookup misses, stalled proof recovery, receipt freshness, or repeated mutation failures.
- Resolve impact at behavioral-symbol granularity when Kibi reports symbol-level diagnostics; avoid treating a whole file as impacted when the report identifies narrower linked behavior.
- Treat `symbol_semantic_review_needed` as a prompt to inspect linked requirements and tests; Kibi reports graph links but does not prove prose semantics.
- Do not read or edit files inside `.kb` directly; all modeling and cleanup goes through the selected Kibi interface.
- Keep approval boundaries intact: only use Kibi MCP tools that are visible and approved, and only use the project-local CLI fallback in a trusted workspace.

Public training trajectories:
[{"taskId":"kibi-traceability-requirement-discovery-train-1","family":"requirement-discovery","reflection":"Discover the requirement linked to the supplied source symbol. This is train case 1; use only the public Kibi MCP surface."},{"taskId":"kibi-traceability-requirement-discovery-train-2","family":"requirement-discovery","reflection":"Discover the requirement linked to the supplied source symbol. This is train case 2; use only the public Kibi MCP surface."},{"taskId":"kibi-traceability-symbol-impact-granularity-train-1","family":"symbol-impact-granularity","reflection":"Resolve impact at behavioral symbol granularity rather than file granularity. This is train case 1; use only the public Kibi MCP surface."},{"taskId":"kibi-traceability-symbol-impact-granularity-train-2","family":"symbol-impact-granularity","reflection":"Resolve impact at behavioral symbol granularity rather than file granularity. This is train case 2; use only the public Kibi MCP surface."},{"taskId":"kibi-traceability-relationship-chain-train-1","family":"relationship-chain","reflection":"Trace the requirement, scenario, and test relationship chain. This is train case 1; use only the public Kibi MCP surface."},{"taskId":"kibi-traceability-relationship-chain-train-2","family":"relationship-chain","reflection":"Trace the requirement, scenario, and test relationship chain. This is train case 2; use only the public Kibi MCP surface."},{"taskId":"kibi-traceability-executable-coverage-train-1","family":"executable-coverage","reflection":"Establish executable test identity and behavioral coverage links. This is train case 1; use only the public Kibi MCP surface."},{"taskId":"kibi-traceability-executable-coverage-train-2","family":"executable-coverage","reflection":"Establish executable test identity and behavioral coverage links. This is train case 2; use only the public Kibi MCP surface."}]

Previous development gate:
{"mean":0,"hardPasses":0,"worstFamilyMean":0}
