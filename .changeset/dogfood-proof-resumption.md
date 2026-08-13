---
"kibi-core": patch
"kibi-cli": patch
"kibi-mcp": patch
---

Dogfood projects can now resume proof work without losing their declared test intent. Test entities persist a typed verification contract, workspace snapshots ignore receipt-only churn consistently, and the sync guard no longer mistakes quoted requirement prose for executable escape hatches. Explicit ontology gaps remain unresolved rather than being reported as missing logical proof.

- Persist and validate `verification_contract.v1` through extraction, mutation, sync, and staged traceability KBs.
- Version the receipt-stable workspace snapshot as `kibi.workspace-snapshot.v2`.
- Make logic coverage inventory-aware and support Prolog-encoded semantic inventories.
