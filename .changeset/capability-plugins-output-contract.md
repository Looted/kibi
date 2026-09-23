---
"kibi-cli": patch
"kibi-mcp": patch
---

Semantic advisor and compile-intent responses that include capability-plugin provenance no longer fail host output validation. Agents and CLI clients can read `capabilityPlugins` stamps on successful envelopes instead of hitting `PROTOCOL_VALIDATION_FAILED`.

- fix(cli): declare optional `capabilityPlugins` on kb_semantic_advisor and kb_compile_intent output contracts
- test(cli): protocol regression for plugin-bearing semantic-advisor envelopes
