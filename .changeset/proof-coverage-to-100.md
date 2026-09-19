---
"kibi-cli": minor
"kibi-mcp": minor
"kibi-zcode": patch
---

Proof coverage reaches every requirement that has honest end-to-end evidence: fourteen new packed end-to-end tests wire previously unproven scenarios (status freshness, conservative proof reporting, snapshot relevance, MCP model-requirement and freshness, schema version, strict modeling, plan-hash enforcement, OpenCode enforcement, briefing removal, Prolog/SPARQL adoption, check-gate enforcement, evaluator gold runs, batch diagnostics) into the proof ladder, and requirements that are historically retired can now actually opt out of E2E proof.

- `kb_check` with `async: true` returns a `kibi.job.v1` receipt whose shape is declared in the tool's output contract, so hosts no longer reject the response schema mismatch on large KBs.
- Authored `proof_exempt` / `proof_exempt_reason` frontmatter on requirement documents is now extracted and persisted; previously the exemption was silently dropped on sync.
- The MCP JSON-Schema-to-Zod bridge converts `anyOf` unions faithfully for declared output contracts (input `oneOf` guards keep their intentional lenient behavior).
- Proof-entity maintenance: stale `SYM-proof-runner` obligation removed from the journaled-engine harness contract, and `REQ-*` inline annotations repointed to the modeled verification-evidence requirement.
- New proof obligations: `TEST-e2e-*` packed scenarios, `TEST-kibi-change-to-proof-evaluation-live` gold-corpus run, and `TEST-e2e-root-batch-diagnostics`; `runBatch` is exported from the curated suite runner for diagnostic reuse.
