---
id: FACT-KIBI-PRODUCT-MISSION
title: Kibi is an agent-native requirements compiler and enforcement layer
status: active
created_at: 2026-08-11T00:00:00Z
updated_at: 2026-08-11T00:00:00Z
source: documentation/facts/FACT-KIBI-PRODUCT-MISSION.md
tags:
  - product-strategy
  - mission
  - agents
  - enforcement
  - prolog
  - traceability
  - e2e
links:
  - REQ-opencode-smart-enforcement-v1
  - REQ-kibi-conservative-requirement-proof
  - REQ-kibi-logical-requirement-coverage
  - REQ-kibi-ontology-convergence-witnesses
  - REQ-skillopt-predicate-first-requirements
fact_kind: meta
---

Kibi is an agent-native requirements compiler and enforcement layer, not a human-maintained requirements database or a passive retrieval-memory system.

Humans state product intent in natural language and resolve genuine ambiguity. AI agents own the ongoing translation into branch-local, semantically structured requirements, scenarios, tests, facts, safe rules, and code-symbol links. The prompt is the primary authoring interface; maintaining a parallel ticket-and-requirements bureaucracy is not the intended workflow.

Kibi places this knowledge in the agent's execution path. Symbols require requirement ownership; requirements require clause-complete semantic grounding and scenarios; scenarios require tests; proof-bearing tests require executable identity and fresh end-to-end evidence tied to the current code snapshot. This makes the mapping navigable in both directions, including from a production symbol to its product intent and from an E2E test to the scenario and requirement it actually verifies.

The product deliberately combines complementary strengths. LLMs interpret natural-language intent, navigate code, and make semantic authoring economically practical. Kibi's typed facts, predicates, and safe logic representations constrain that probabilistic interpretation. Prolog then provides deterministic coherence, contradiction, traceability, and proof checks.

This combination targets LLM weaknesses: memory loss, hallucination, context drift, and loss of the product-to-code mapping previously spread across product owners, ticket systems, requirements documents, and planning boards. Prolog proves only what has been encoded, so ambiguity, ontology gaps, incomplete grounding, and stale evidence must remain explicit rather than being treated as consistency or proof.

Public shorthand: **Prompt the intent. Kibi makes the agent remember it—and prove the implementation.**
