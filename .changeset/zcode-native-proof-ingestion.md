---
"kibi-cli": patch
---

Native ZCode proof runs now preserve the exact test case, integration, and command provenance needed to explain verification results. This makes each ZCode behavior receipt independently traceable instead of treating the adapter suite as one aggregate pass. The CLI also rejects incomplete or mismatched native evidence rather than accepting an ambiguous result.

- Enforce native result and binding validation for self-emitting proof integrations.
- Record the configured `zcode-native` command and producer fingerprint in proof artifacts.
